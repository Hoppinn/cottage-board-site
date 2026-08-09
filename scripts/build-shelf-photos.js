/**
 * build-shelf-photos.js
 *
 * assets/images/shelf-locations/raw/ 의 원본 책장 사진(PNG, 수 MB)을
 * game-system/config/shelf-locations.js SHELF_GROUPS의 id 기준으로
 * assets/images/shelf-locations/{sectionId}.jpg 로 리사이즈+압축.
 * (resize-existing-photos.js와 동일 패턴: sharp, 긴 쪽 기준 리사이즈 + mozjpeg)
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
    const srcBuf = fs.readFileSync(src);
    const meta = await sharp(srcBuf).metadata();

    const outBuf = await sharp(srcBuf)
      .rotate()
      .resize({ width: MAX_PX, height: MAX_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    const outPath = path.join(OUT_DIR, `${sectionId}.jpg`);
    fs.writeFileSync(outPath, outBuf);

    results.push({
      code,
      sectionId,
      rawName,
      srcSize: srcBuf.length,
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
