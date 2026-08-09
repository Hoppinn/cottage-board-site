/**
 * build-shelf-photos.js
 *
 * assets/images/shelf-locations/raw/ 의 원본 책장 사진(배경제거 컷아웃 PNG, 수 MB)을
 * game-system/config/shelf-locations.js SHELF_GROUPS의 id 기준으로
 * assets/images/shelf-locations/{sectionId}.webp 로 크롭+리사이즈+압축.
 *
 * - webp: 알파(투명 배경) 유지 — jpeg로 뽑으면 투명 영역이 검게 칠해져 라이트박스에서
 *   사진이 사각 박스로 보인다.
 * - bbox 크롭(computeContentBBox): 컷아웃 원본에 남은 투명 여백 + 배경 지우다 만 자잘한
 *   얼룩을 실제 내용물(가장 큰 덩어리) 기준으로 잘라낸다. 자세한 이유는 함수 주석 참조.
 *
 * raw 파일명은 섹션 코드(A, A-1, B, C-1 ...)로 매칭 — 새 사진을 교체할 땐
 * raw/에 같은 코드 파일명으로 넣고 이 스크립트를 다시 돌리면 됨.
 *
 * 실행: node scripts/build-shelf-photos.js
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const RAW_DIR = path.join(ROOT, "assets", "images", "shelf-locations", "raw");
const OUT_DIR = path.join(ROOT, "assets", "images", "shelf-locations");

const MAX_PX = 1000; // 긴 쪽 기준
const QUALITY = 78;

// raw 파일명(코드) -> shelf-locations.js SHELF_GROUPS의 id
const CODE_TO_ID = {
  "A": "party",
  "A-1": "dexterity",
  "A-2": "popular",
  "A-3": "poker_mahjong",
  "A-4": "display",
  "A-5": "toy",
  "A-6": "puzzle_1000",
  "A-7": "lost_found",
  "B": "light_family",
  "B-1": "easy_coop",
  "C": "heavy_strategy",
  "C-1": "hard_coop",
  "D": "mini_box",
  "E": "two_player_best",
  "F": "murder_mystery",
  "F-1": "escape_room",
};

const DS_WIDTH = 400; // bbox 계산용 축소 폭
const BLUR_SIGMA = 8; // 선반 칸 사이 틈(구멍난 알파)을 이어붙이는 정도
const ALPHA_THRESH = 12; // 이 값보다 크면 "내용물"
const PAD = 20; // 원본 해상도 기준 여유 패딩(px) — 컷아웃 가장자리 안티에일리어싱 보존

/**
 * 컷아웃 원본에서 "가장 큰 덩어리(=실제 선반)"의 bbox만 찾는다.
 * 단순 trim()은 귀퉁이에 지우다 만 배경 조각이 하나만 있어도 거기까지 bbox를 넓혀버린다.
 * 처음엔 median으로 자잘한 얼룩을 눌러보려 했으나, 선반 사진은 상자 사이사이 틈이 많아
 * (알파가 성긴 구조라) median이 오히려 진짜 내용물까지 같이 지워버렸다(전량 재작업).
 * → 알파를 축소해 blur로 상자 사이 틈을 이어붙인 뒤, 연결요소(flood fill)로 나누고
 *   "픽셀 수가 가장 많은 덩어리"의 bbox만 취한다 — 작은 얼룩은 몇 픽셀짜리라 절대 안 뽑힘.
 *   bbox는 축소 좌표계에서 구하고, 실제 크롭은 원본(블러 안 먹은) 이미지에 적용한다.
 */
async function computeContentBBox(buf, meta) {
  const scale = meta.width / DS_WIDTH;
  const dsHeight = Math.max(1, Math.round(meta.height / scale));

  const { data, info } = await sharp(buf)
    .resize({ width: DS_WIDTH, height: dsHeight, fit: "fill" })
    .extractChannel(3)
    .blur(BLUR_SIGMA)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const visited = new Uint8Array(w * h);
  const stackX = new Int32Array(w * h);
  const stackY = new Int32Array(w * h);
  let best = null;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] || data[idx] <= ALPHA_THRESH) continue;

      let sp = 0;
      stackX[sp] = x;
      stackY[sp] = y;
      sp++;
      visited[idx] = 1;
      let count = 0,
        minX = x,
        maxX = x,
        minY = y,
        maxY = y;

      while (sp > 0) {
        sp--;
        const cx = stackX[sp];
        const cy = stackY[sp];
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nidx = ny * w + nx;
          if (visited[nidx] || data[nidx] <= ALPHA_THRESH) continue;
          visited[nidx] = 1;
          stackX[sp] = nx;
          stackY[sp] = ny;
          sp++;
        }
      }

      if (!best || count > best.count) best = { count, minX, maxX, minY, maxY };
    }
  }

  if (!best) return null;

  const left = Math.max(0, Math.round(best.minX * scale) - PAD);
  const top = Math.max(0, Math.round(best.minY * scale) - PAD);
  const right = Math.min(meta.width, Math.round((best.maxX + 1) * scale) + PAD);
  const bottom = Math.min(meta.height, Math.round((best.maxY + 1) * scale) + PAD);

  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

function findRawFileForCode(code) {
  if (!fs.existsSync(RAW_DIR)) return null;
  const files = fs.readdirSync(RAW_DIR);
  // "A.png", "A(수정).png", "A (1).png" 등 접두 코드 일치 + 뒤에 코드 문자가 안 이어지는 것만
  const re = new RegExp(`^${code.replace("-", "\\-")}(\\s|\\(|\\.)`, "i");
  return files.find((f) => re.test(f)) || null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];

  for (const [code, sectionId] of Object.entries(CODE_TO_ID)) {
    const rawName = findRawFileForCode(code);
    if (!rawName) {
      results.push({ code, sectionId, error: "원본 없음(raw/에 파일 없음)" });
      continue;
    }
    const src = path.join(RAW_DIR, rawName);
    const rawSize = fs.statSync(src).size;
    // rotate()로 EXIF 방향부터 정리 — 이후 bbox 계산이 이 좌표계 기준이어야 한다
    const rotatedBuf = await sharp(fs.readFileSync(src)).rotate().toBuffer();
    const meta = await sharp(rotatedBuf).metadata();

    // 원본이 배경제거된 컷아웃(투명 PNG) — jpeg로 뽑으면 투명 영역이 검게 칠해져
    // 라이트박스(반투명 검정 오버레이) 위에서 사진이 사각형 박스로 보인다.
    // webp는 알파를 유지하므로 flatten 없이 그대로 압축 — 배경에 자연스럽게 붙는다.
    // bbox 크롭: 컷아웃 주변 투명 여백(+ 지우다 만 자잘한 얼룩)을 실제 픽셀 단위로
    // 잘라냄 — 안 하면 사진과 게임목록 사이에 CSS로는 못 줄이는 빈 공간이 남는다.
    const bbox = await computeContentBBox(rotatedBuf, meta);
    const cropBuf = bbox ? await sharp(rotatedBuf).extract(bbox).toBuffer() : rotatedBuf;

    const outBuf = await sharp(cropBuf)
      .resize({ width: MAX_PX, height: MAX_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY, alphaQuality: 90 })
      .toBuffer();

    const outPath = path.join(OUT_DIR, `${sectionId}.webp`);
    fs.writeFileSync(outPath, outBuf);

    results.push({
      code,
      sectionId,
      rawName,
      srcSize: rawSize,
      outSize: outBuf.length,
      origDim: `${meta.width}x${meta.height}`,
    });
  }

  console.log("코드".padEnd(6), "섹션id".padEnd(16), "원본파일".padEnd(20), "원본해상도".padEnd(11), "압축크기");
  for (const r of results) {
    if (r.error) {
      console.log(r.code.padEnd(6), r.sectionId.padEnd(16), r.error);
      continue;
    }
    const srcKB = (r.srcSize / 1024).toFixed(0) + "KB";
    const outKB = (r.outSize / 1024).toFixed(0) + "KB";
    console.log(
      r.code.padEnd(6),
      r.sectionId.padEnd(16),
      r.rawName.padEnd(20),
      r.origDim.padEnd(11),
      outKB + " (원본 " + srcKB + ")"
    );
  }
  const totalOut = results.reduce((s, r) => s + (r.outSize || 0), 0);
  const missing = results.filter((r) => r.error).length;
  console.log("\n합계(압축본):", (totalOut / 1024 / 1024).toFixed(2) + "MB", "/ 누락:", missing + "건");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
