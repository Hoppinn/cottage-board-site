/**
 * split-seasons.js
 * 시즌캐릭터 PNG (배경제거본)에서 캐릭터별 개별 PNG 분리
 *
 * 사용법: node scripts/split-seasons.js
 * 출력: assets/images/characters/character_seasons/season_spring.png ...
 *       assets/images/characters/character_seasons/_contact_sheet.png
 *
 * ⚠️ NAME_MAP 순서는 contact sheet 확인 후 조정 필요할 수 있음
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'D:\\Documents\\코티지보드\\리뉴얼\\홈페이지\\업적아이콘\\시즌캐릭터 photopea 배경제거.png';
const OUT = path.join(__dirname, '..', 'assets', 'images', 'characters', 'character_seasons');
const SIZE = 100;
const PADDING = 8;
const MIN_AREA = 3000;
const BG_TOLERANCE = 35;

// 좌→우, 위→아래 시각적 순서로 정의
// 원본 이미지: 행마다 좌측 테마 5종 + 우측 테마 5종 (총 10종/행 × 5행 = 50종)
const NAME_MAP = [
  // 봄 시즌 (행1 좌)
  'spring_rabbit',        // 벚꽃 토끼
  'spring_canola_rabbit', // 유채꽃 토끼
  'spring_squirrel',      // 새싹 다람쥐
  'spring_owl',           // 봄날 부엉이
  'spring_hedgehog',      // 봄의 고슴도치

  // 여름 시즌 (행1 우)
  'summer_rabbit',        // 수박 토끼
  'summer_squirrel',      // 바캉스 다람쥐
  'summer_owl',           // 선글라스 부엉이
  'summer_fox',           // 서핑 여우
  'summer_bear',          // 빙수 곰

  // 가을 시즌 (행2 좌)
  'fall_rabbit',          // 단풍 토끼
  'fall_squirrel',        // 도토리 다람쥐
  'fall_owl',             // 독서 부엉이
  'fall_fox',             // 낙엽 여우
  'fall_hedgehog',        // 가을 고슴도치

  // 겨울 시즌 (행2 우)
  'winter_rabbit',        // 눈사람 토끼
  'winter_squirrel',      // 핫초코 다람쥐
  'winter_owl',           // 겨울 부엉이
  'winter_fox',           // 스키 여우
  'winter_bear',          // 눈오는 곰

  // 설날 (행3 좌)
  'seollal_rabbit',       // 한복 토끼
  'seollal_squirrel',     // 한복 다람쥐
  'seollal_owl',          // 한복 부엉이
  'seollal_fox',          // 복주머니 여우
  'seollal_bear',         // 세배 곰

  // 어린이날 (행3 우)
  'childrens_rabbit',     // 풍선 토끼
  'childrens_squirrel',   // 바람개비 다람쥐
  'childrens_owl',        // 선물 부엉이
  'childrens_fox',        // 용사 여우
  'childrens_bear',       // 장난감 곰

  // 현충일 (행4 좌)
  'memorial_rabbit',      // 태극기 토끼
  'memorial_squirrel',    // 무궁화 다람쥐
  'memorial_owl',         // 헌충 부엉이
  'memorial_fox',         // 호국 여우
  'memorial_bear',        // 나라사랑 곰

  // 추석 (행4 우)
  'chuseok_rabbit',       // 송편 토끼
  'chuseok_squirrel',     // 한가위 다람쥐
  'chuseok_owl',          // 보름달 부엉이
  'chuseok_fox',          // 윷놀이 여우
  'chuseok_bear',         // 한복 곰

  // 할로윈 (행5 좌)
  'halloween_rabbit',     // 마녀 토끼
  'halloween_squirrel',   // 호박 다람쥐
  'halloween_owl',        // 유령 부엉이
  'halloween_fox',        // 드라큘라 여우
  'halloween_bear',       // 미이라 곰

  // 크리스마스 (행5 우)
  'christmas_rabbit',     // 산타 토끼
  'christmas_squirrel',   // 트리 다람쥐
  'christmas_owl',        // 선물 부엉이
  'christmas_fox',        // 루돌프 여우
  'christmas_bear',       // 산타 곰
];

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function trimTopLabel(cpx, cropW, cropH) {
  const density = [];
  for (let y = 0; y < cropH; y++) {
    let cnt = 0;
    for (let x = 0; x < cropW; x++) {
      if (cpx[(y * cropW + x) * 4 + 3] > 0) cnt++;
    }
    density.push(cnt);
  }

  const H_LABEL = 25;
  const H_GAP   = 18;
  const H_CHAR  = 17;
  let labelStart = -1, gapStart = -1, charStart = -1;

  for (let y = 0; y < Math.floor(cropH * 0.35); y++) {
    if (density[y] >= H_LABEL) { labelStart = y; break; }
  }
  if (labelStart < 0) return;

  for (let y = labelStart + 4; y < Math.floor(cropH * 0.65); y++) {
    if (density[y] < H_GAP) { gapStart = y; break; }
  }
  if (gapStart < 0) return;

  for (let y = gapStart; y < Math.floor(cropH * 0.85); y++) {
    if (density[y] >= H_CHAR) { charStart = y; break; }
  }
  if (charStart < 0) return;

  for (let y = 0; y < charStart; y++) {
    for (let x = 0; x < cropW; x++) {
      cpx[(y * cropW + x) * 4 + 3] = 0;
    }
  }
}

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
  if (maxX < 0) return { data: cpx, width: cropW, height: cropH };
  if (minX === 0 && minY === 0 && maxX === cropW - 1 && maxY === cropH - 1) {
    return { data: cpx, width: cropW, height: cropH };
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

  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    if (pixels[pi+3] < 30) continue;
    if (transparentBg) {
      mask[i] = 1;
    } else if (colorDist(pixels[pi], pixels[pi+1], pixels[pi+2], bgR, bgG, bgB) >= BG_TOLERANCE) {
      mask[i] = 1;
    }
  }

  console.log('Connected component 탐지 중...');
  const { components: all, labels } = findComponents(mask, width, height);
  console.log(`전체 component: ${all.length}개`);

  const comps = all.filter(c => {
    if (c.count < MIN_AREA) return false;
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    const ratio = Math.max(w, h) / Math.min(w, h);
    return ratio < 2.5;
  });
  console.log(`필터 후: ${comps.length}개`);

  const ROW_BAND = Math.round(height / Math.max(1, Math.ceil(comps.length / 4)));
  comps.sort((a, b) => {
    const cya = (a.minY + a.maxY) / 2;
    const cyb = (b.minY + b.maxY) / 2;
    const rowA = Math.floor(cya / ROW_BAND);
    const rowB = Math.floor(cyb / ROW_BAND);
    if (rowA !== rowB) return rowA - rowB;
    return a.minX - b.minX;
  });

  const useNames = comps.length === NAME_MAP.length;
  if (!useNames) {
    console.warn(`\n⚠️  component 수(${comps.length})와 NAME_MAP 수(${NAME_MAP.length})가 다릅니다.`);
    console.warn('   contact sheet 확인 후 MIN_AREA, BG_TOLERANCE 또는 NAME_MAP을 조정하세요.');
    console.warn('   일단 season_001 방식으로 저장합니다.\n');
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
      : `season_${String(i + 1).padStart(3, '0')}.png`;
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
    for (let ly = 0; ly < cropH; ly++) {
      for (let lx = 0; lx < cropW; lx++) {
        const globalIdx = (padTop + ly) * width + (padLeft + lx);
        if (labels[globalIdx] !== c.label) {
          cpx[(ly * cropW + lx) * 4 + 3] = 0;
        }
      }
    }

    trimTopLabel(cpx, ci.width, ci.height);

    const tight = tightAlphaCrop(cpx, ci.width, ci.height);

    await sharp(tight.data, { raw: { width: tight.width, height: tight.height, channels: 4 } })
      .png()
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outPath);

    console.log(`✓ ${filename.padEnd(30)} bbox=(${padLeft},${padTop}) ${cropW}x${cropH}  px=${c.count}`);
    outputFiles.push({ filename, outPath });
  }

  // Contact sheet
  console.log('\nContact sheet 생성 중...');
  const COLS = Math.min(outputFiles.length, 4);
  const ROWS = Math.ceil(outputFiles.length / COLS);
  const CELL = SIZE + 6;
  const sheetW = COLS * CELL;
  const sheetH = ROWS * CELL;

  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4);
  sheetBuf.fill(255);

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
