/**
 * split-characters.js
 * connected component 방식으로 캐릭터를 개별 PNG로 분리 + 파일명 자동 부여
 *
 * 사용법: node scripts/split-characters.js
 * 출력: assets/images/characters/split/rabbit_first.png ...
 *       assets/images/characters/split/_contact_sheet.png
 *
 * ⚠️ NAME_MAP 순서는 contact sheet 확인 후 조정 필요할 수 있음
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'D:\\Documents\\코티지보드\\리뉴얼\\홈페이지\\업적아이콘\\업적아이콘 (1).png';
const OUT = path.join(__dirname, '..', 'assets', 'images', 'characters', 'split');
const SIZE = 100;
const PADDING = 8;
const MIN_AREA = 3000;   // 노이즈/범례 아이콘 제거 (px²)
const BG_TOLERANCE = 35;

// ──────────────────────────────────────────────
// 이미지 기준 좌→우, 위→아래 시각적 순서로 정의
// contact sheet(_contact_sheet.png)로 순서 확인 후 필요시 조정
// ──────────────────────────────────────────────
const NAME_MAP = [
  // 탐험가 계열 (토끼) — 상단 가로 1열
  'rabbit_first',       // 새싹 토끼 (회원가입)
  'rabbit_5',           // 호기심 토끼 (새 게임 5종)
  'rabbit_20',          // 탐험 토끼 (새 게임 20종)
  'rabbit_50',          // 여행 토끼 (새 게임 50종)
  'rabbit_100',         // 유랑 토끼 (새 게임 100종)
  'rabbit_200',         // 전설의 토끼 (새 게임 200종)
  'cottage_master',     // 코티지 마스터 — 우상단 박스 (최종 목표)

  // 기록가 계열 (다람쥐) — 2행 좌측
  'squirrel_10',        // 도토리 다람쥐 (기록 10개)
  'squirrel_50',        // 창고 다람쥐 (기록 50개)
  'squirrel_100',       // 겨울준비 다람쥐 (기록 100개)
  'squirrel_200',       // 사서 다람쥐 (기록 200개)

  // 전략가 계열 (부엉이) — 2행 우측
  'owl_10',             // 새내기 부엉이 (10회)
  'owl_30',             // 지혜로운 부엉이 (30회)
  'owl_100',            // 현자 부엉이 (100회)
  'owl_300',            // 대현자 부엉이 (300회)

  // 추리 계열 (여우) — 3행 좌측
  'fox_10',             // 수습 여우 (10회)
  'fox_30',             // 탐정 여우 (30회)
  'fox_100',            // 명탐정 여우 (100회)
  'fox_300',            // 전설의 탐정 여우 (300회)

  // 단골 계열 (곰) — 3행 우측
  'bear_10',            // 손님 곰 (10회)
  'bear_30',            // 주민 곰 (30회)
  'bear_50',            // 단골 곰 (50회)
  'bear_100',           // 터줏대감 곰 (100회)
  'bear_300',           // 숲의 전설 곰 (300회)

  // 사진가 계열 (고슴도치) — 4행 좌측
  'hedgehog_1',         // 초보 고슴도치 (1장)
  'hedgehog_10',        // 기록가 고슴도치 (10장)
  'hedgehog_50',        // 포토마스터 고슴도치 (50장)
  'hedgehog_100',       // 작가 고슴도치 (100장)

  // 평론가 계열 (햄스터) — 4행 우측
  'hamster_1',          // 리뷰어 햄스터 (첫 평가)
  'hamster_10',         // 서평가 햄스터 (10개)
  'hamster_50',         // 평론가 햄스터 (50개)
  'hamster_100',        // 비평가 햄스터 (100개)
  'hamster_300',        // 전설의 평론가 햄스터 (300개)

  // 공감 계열 (참새) — 5행 좌측
  'sparrow_10',         // 공감받는 참새 (10개)
  'sparrow_50',         // 인기 참새 (50개)
  'sparrow_200',        // 스타 참새 (200개)
  'sparrow_1000',       // 전설의 참새 (1000개)

  // 희귀 캐릭터 — 5행 우측
  'rare_new_game',      // 신작 사냥꾼 (최초 플레이)
  'rare_first_record',  // 첫 번째 개척자 (최초 기록)
  'rare_night',         // 밤의 순찰자 (마감 직전 퇴장)
  'rare_lightning',     // 번개 토끼 (1점 차 승리)
  'rare_storyteller',   // 이야기꾼 여우 (머더미스터리 20회)
  'rare_friend',        // 친구부자 곰 (친구 초대 10명)

  // 시즌 캐릭터 — 6행
  'season_spring',      // 벚꽃 토끼 (봄)
  'season_summer',      // 해바라기 토끼 (여름)
  'season_halloween',   // 호박 여우 (가을/할로윈)
  'season_christmas',   // 산타 다람쥐 (겨울/크리스마스)
];

// ──────────────────────────────────────────────

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

/**
 * 상단 레이블 배지 제거
 * 원본 이미지에서 "시즌 캐릭터" 같은 레이블이 캐릭터에 붙어 있을 때
 * 레이블(고밀도 가로 블록) → 갭(저밀도) → 캐릭터(재상승) 패턴을 찾아 레이블 구간을 투명화.
 * 갭이 없으면(일반 캐릭터) 아무것도 건드리지 않음.
 */
function trimTopLabel(cpx, cropW, cropH) {
  const density = [];
  for (let y = 0; y < cropH; y++) {
    let cnt = 0;
    for (let x = 0; x < cropW; x++) {
      if (cpx[(y * cropW + x) * 4 + 3] > 0) cnt++;
    }
    density.push(cnt);
  }

  const H_LABEL = 25; // 레이블 행: ≥25px
  const H_GAP   = 18; // 갭 행:    <18px
  const H_CHAR  = 17; // 캐릭터 재시작: ≥17px
  let labelStart = -1, gapStart = -1, charStart = -1;

  // 1. 상위 35% 안에서 레이블 시작 찾기
  for (let y = 0; y < Math.floor(cropH * 0.35); y++) {
    if (density[y] >= H_LABEL) { labelStart = y; break; }
  }
  if (labelStart < 0) return;

  // 2. 레이블 이후 갭 찾기
  for (let y = labelStart + 4; y < Math.floor(cropH * 0.65); y++) {
    if (density[y] < H_GAP) { gapStart = y; break; }
  }
  if (gapStart < 0) return; // 갭 없음 → 일반 캐릭터, 자르지 않음

  // 3. 갭 이후 캐릭터 본체 시작 찾기
  for (let y = gapStart; y < Math.floor(cropH * 0.85); y++) {
    if (density[y] >= H_CHAR) { charStart = y; break; }
  }
  if (charStart < 0) return;

  // 4. 레이블+갭 구간 투명화
  for (let y = 0; y < charStart; y++) {
    for (let x = 0; x < cropW; x++) {
      cpx[(y * cropW + x) * 4 + 3] = 0;
    }
  }
}

/**
 * 실제 불투명 픽셀의 bbox로 버퍼를 tight crop.
 * trimTopLabel 이후 빈 행이 생겨 버퍼가 캐릭터보다 클 때
 * fit:contain resize 비율이 틀어지는 문제를 방지.
 * 반환: { data: Buffer, width, height } — 새 raw RGBA 버퍼
 */
function tightAlphaCrop(cpx, cropW, cropH) {
  let minX = cropW, maxX = -1, minY = cropH, maxY = -1;
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      if (cpx[(y * cropW + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { data: cpx, width: cropW, height: cropH }; // 전부 투명
  if (minX === 0 && minY === 0 && maxX === cropW - 1 && maxY === cropH - 1) {
    return { data: cpx, width: cropW, height: cropH }; // 이미 tight
  }
  const newW = maxX - minX + 1;
  const newH = maxY - minY + 1;
  const out = Buffer.alloc(newW * newH * 4);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const si = ((minY + y) * cropW + (minX + x)) * 4;
      const di = (y * newW + x) * 4;
      out[di]   = cpx[si];
      out[di+1] = cpx[si+1];
      out[di+2] = cpx[si+2];
      out[di+3] = cpx[si+3];
    }
  }
  return { data: out, width: newW, height: newH };
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

function findComponents(mask, width, height) {
  const labels = new Int32Array(width * height).fill(-1);
  let nextLabel = 0;
  const components = [];
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx] || labels[idx] !== -1) continue;

      const label = nextLabel++;
      const queue = [idx];
      labels[idx] = label;
      const comp = { label, count: 0, minX: x, maxX: x, minY: y, maxY: y };

      let qi = 0;
      while (qi < queue.length) {
        const cur = queue[qi++];
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        comp.count++;
        if (cx < comp.minX) comp.minX = cx;
        if (cx > comp.maxX) comp.maxX = cx;
        if (cy < comp.minY) comp.minY = cy;
        if (cy > comp.maxY) comp.maxY = cy;

        for (let d = 0; d < 8; d++) {
          const nx = cx + dx[d];
          const ny = cy + dy[d];
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nidx = ny * width + nx;
          if (!mask[nidx] || labels[nidx] !== -1) continue;
          labels[nidx] = label;
          queue.push(nidx);
        }
      }
      components.push(comp);
    }
  }
  // labels 배열도 반환 — 추출 시 마스킹에 사용
  return { components, labels };
}

async function run() {
  console.log('이미지 읽는 중...');
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = Buffer.from(data);
  console.log(`이미지 크기: ${width}x${height}`);

  // 배경 감지: 가장자리 픽셀이 투명이면 → 투명배경 모드
  // 가장자리가 불투명이면 → 색상기반 제거 모드
  let bgR = -1, bgG = -1, bgB = -1, transparentBg = false;
  {
    const edgeSamples = [];
    const step = Math.max(1, Math.floor(Math.min(width, height) / 20));
    for (let x = 0; x < width; x += step) {
      [[x,0],[x,height-1]].forEach(([sx,sy]) => {
        const i = (sy * width + sx) * 4;
        if (pixels[i+3] > 200) edgeSamples.push([pixels[i],pixels[i+1],pixels[i+2]]);
      });
    }
    for (let y = 0; y < height; y += step) {
      [[0,y],[width-1,y]].forEach(([sx,sy]) => {
        const i = (sy * width + sx) * 4;
        if (pixels[i+3] > 200) edgeSamples.push([pixels[i],pixels[i+1],pixels[i+2]]);
      });
    }
    if (edgeSamples.length === 0) {
      transparentBg = true;
      console.log('배경: 투명 PNG (alpha 기반으로만 마스킹)');
    } else {
      bgR = Math.round(edgeSamples.reduce((s,c)=>s+c[0],0)/edgeSamples.length);
      bgG = Math.round(edgeSamples.reduce((s,c)=>s+c[1],0)/edgeSamples.length);
      bgB = Math.round(edgeSamples.reduce((s,c)=>s+c[2],0)/edgeSamples.length);
      console.log(`배경색: rgb(${bgR}, ${bgG}, ${bgB}) (샘플 ${edgeSamples.length}개)`);
    }
  }

  // 전경 마스크 생성
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    if (pixels[pi+3] < 30) continue; // 투명은 배경
    if (transparentBg) {
      mask[i] = 1; // 투명배경 모드: 불투명한 모든 픽셀이 전경
    } else if (colorDist(pixels[pi], pixels[pi+1], pixels[pi+2], bgR, bgG, bgB) >= BG_TOLERANCE) {
      mask[i] = 1;
    }
  }

  console.log('Connected component 탐지 중...');
  const { components: all, labels } = findComponents(mask, width, height);
  console.log(`전체 component: ${all.length}개`);

  // 필터: 최소 면적, 최대 종횡비 (텍스트/점선 제거)
  const comps = all.filter(c => {
    if (c.count < MIN_AREA) return false;
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    const ratio = Math.max(w, h) / Math.min(w, h);
    return ratio < 2.5; // 텍스트 레이블(ratio 2.5~4.3) 제거, 캐릭터는 최대 ratio ~1.5
  });
  console.log(`필터 후: ${comps.length}개`);

  // 정렬: 위→아래 행 기준, 같은 행은 좌→우
  // centerY 기준으로 묶음 — minY 기준보다 키가 다른 캐릭터에 강건함
  const ROW_BAND = Math.round(height / 8);
  comps.sort((a, b) => {
    const cya = (a.minY + a.maxY) / 2;
    const cyb = (b.minY + b.maxY) / 2;
    const rowA = Math.floor(cya / ROW_BAND);
    const rowB = Math.floor(cyb / ROW_BAND);
    if (rowA !== rowB) return rowA - rowB;
    return a.minX - b.minX;
  });

  // NAME_MAP 일치 여부 확인
  const useNames = comps.length === NAME_MAP.length;
  if (!useNames) {
    console.warn(`\n⚠️  component 수(${comps.length})와 NAME_MAP 수(${NAME_MAP.length})가 다릅니다.`);
    console.warn('   contact sheet 확인 후 MIN_AREA, BG_TOLERANCE 또는 NAME_MAP을 조정하세요.');
    console.warn('   일단 char_001 방식으로 저장합니다.\n');
  } else {
    console.log(`\n✓ ${comps.length}개 일치 → NAME_MAP으로 파일명 지정\n`);
  }

  const outputFiles = [];
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    const padLeft   = Math.max(0, c.minX - PADDING);
    const padTop    = Math.max(0, c.minY - PADDING);
    const padRight  = Math.min(width - 1, c.maxX + PADDING);
    const padBottom = Math.min(height - 1, c.maxY + PADDING);
    const cropW = padRight - padLeft + 1;
    const cropH = padBottom - padTop + 1;

    const filename = useNames
      ? `${NAME_MAP[i]}.png`
      : `char_${String(i + 1).padStart(3, '0')}.png`;
    const outPath = path.join(OUT, filename);

    const { data: cd, info: ci } = await sharp(SRC)
      .extract({ left: padLeft, top: padTop, width: cropW, height: cropH })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cpx = Buffer.from(cd);
    if (!transparentBg) {
      for (let j = 0; j < ci.width * ci.height; j++) {
        const ji = j * 4;
        if (colorDist(cpx[ji], cpx[ji+1], cpx[ji+2], bgR, bgG, bgB) < BG_TOLERANCE) {
          cpx[ji+3] = 0;
        }
      }
    }
    // 이 컴포넌트 레이블에 속하지 않는 픽셀의 알파를 0으로
    // → 인접 캐릭터 픽셀·레이블 텍스트 등 PADDING 영역에 포함된 이물질 제거
    for (let ly = 0; ly < cropH; ly++) {
      for (let lx = 0; lx < cropW; lx++) {
        const globalIdx = (padTop + ly) * width + (padLeft + lx);
        if (labels[globalIdx] !== c.label) {
          cpx[(ly * cropW + lx) * 4 + 3] = 0;
        }
      }
    }

    trimTopLabel(cpx, ci.width, ci.height);

    // trimTopLabel로 비워진 행이 남아 fit:contain 비율이 틀어지는 문제 방지
    const tight = tightAlphaCrop(cpx, ci.width, ci.height);

    await sharp(tight.data, { raw: { width: tight.width, height: tight.height, channels: 4 } })
      .png()
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outPath);

    const label = useNames ? NAME_MAP[i] : `#${i+1}`;
    console.log(`✓ ${filename.padEnd(30)} bbox=(${padLeft},${padTop}) ${cropW}x${cropH}  px=${c.count}`);
    outputFiles.push({ filename, outPath });
  }

  // Contact sheet
  console.log('\nContact sheet 생성 중...');
  const COLS = 8;
  const ROWS = Math.ceil(outputFiles.length / COLS);
  const CELL = SIZE + 6;
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;

  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);
  sheetBuf.fill(255); // 흰 배경

  for (let i = 0; i < outputFiles.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const ox = col * CELL + 3;
    const oy = row * CELL + 3;

    const { data: fd } = await sharp(outputFiles[i].outPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const si = ((py + oy) * sheetW + (px + ox)) * 4;
        const ci = (py * SIZE + px) * 4;
        if (fd[ci + 3] > 0) {
          sheetBuf[si]   = fd[ci];
          sheetBuf[si+1] = fd[ci+1];
          sheetBuf[si+2] = fd[ci+2];
          sheetBuf[si+3] = fd[ci+3];
        }
      }
    }
  }

  const sheetPath = path.join(OUT, '_contact_sheet.png');
  await sharp(sheetBuf, { raw: { width: sheetW, height: sheetH, channels: 4 } })
    .png()
    .toFile(sheetPath);

  console.log(`\n완료! ${outputFiles.length}개 저장`);
  console.log(`출력 위치: ${OUT}`);
  console.log(`Contact sheet: ${sheetPath}`);
  if (!useNames) {
    console.log('\n→ contact sheet 보고 NAME_MAP 순서 확인 후 재실행하세요.');
  }
}

run().catch(console.error);
