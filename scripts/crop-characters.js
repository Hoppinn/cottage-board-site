const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'C:\\Users\\HOPPYNESS\\OneDrive\\Documents\\카카오톡 받은 파일\\KakaoTalk_20260615_193537067.png';
const OUT = path.join(__dirname, '..', 'assets', 'images', 'characters');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 출력 크기 (px): 모든 캐릭터 통일
const SIZE = 100;

// 진단으로 확정된 스프라이트 좌표 (v2 — 2026-06-16 재검증)
// 검증 방법: 계열별 행 전체 슬라이스(height=180~230) + 캐릭터별 개별 추출로 본체 완전성 확인
//
// 토끼    : cells=209px, left+40, top=25, h=130  (헤더 아래 귀 끝~발끝 포함)
// 다람쥐  : cells=130px, left+60, top=295, h=120
// 고슴도치: cells=120px, left+45, top=755, h=90
// 햄스터  : cells=131px, left+600, top=755, h=90

const CHARS = [
  { file: 'rabbit_first.png', left: 40,       top: 25,  width: 130, height: 130 },
  { file: 'rabbit_5.png',     left: 40+209,   top: 25,  width: 130, height: 130 },
  { file: 'rabbit_20.png',    left: 40+418,   top: 25,  width: 130, height: 130 },
  { file: 'rabbit_50.png',    left: 40+627,   top: 25,  width: 130, height: 130 },
  { file: 'rabbit_100.png',   left: 40+836,   top: 25,  width: 85,  height: 130 }, // width=85: 우측 장식 프레임 제외

  { file: 'squirrel_10.png',  left: 60,       top: 295, width: 90,  height: 120 },
  { file: 'squirrel_50.png',  left: 60+130,   top: 295, width: 90,  height: 120 },
  { file: 'squirrel_100.png', left: 60+260,   top: 295, width: 90,  height: 120 },
  { file: 'squirrel_200.png', left: 60+390,   top: 295, width: 90,  height: 120 },

  { file: 'hedgehog_1.png',   left: 45,       top: 755, width: 90,  height: 90 },
  { file: 'hedgehog_10.png',  left: 45+120,   top: 755, width: 90,  height: 90 },
  { file: 'hedgehog_50.png',  left: 45+240,   top: 755, width: 90,  height: 90 },
  { file: 'hedgehog_100.png', left: 45+360,   top: 755, width: 90,  height: 90 },

  { file: 'hamster_1.png',    left: 600,      top: 755, width: 90,  height: 90 },
  { file: 'hamster_10.png',   left: 600+131,  top: 755, width: 90,  height: 90 },
  { file: 'hamster_50.png',   left: 600+262,  top: 755, width: 90,  height: 90 },
  { file: 'hamster_100.png',  left: 600+393,  top: 755, width: 90,  height: 90 },
];

// 배경색 제거: 첫 번째 픽셀 색상을 배경으로 간주, 유사색 → 투명
async function removeBg(inputBuffer, tolerance = 40) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  // 첫 번째 픽셀을 배경색으로 사용
  const bgR = pixels[0], bgG = pixels[1], bgB = pixels[2];

  for (let i = 0; i < pixels.length; i += 4) {
    const dr = pixels[i]   - bgR;
    const dg = pixels[i+1] - bgG;
    const db = pixels[i+2] - bgB;
    const dist = Math.sqrt(dr*dr + dg*dg + db*db);
    if (dist < tolerance) pixels[i+3] = 0; // 투명
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer();
}

async function cropAll() {
  for (const c of CHARS) {
    // 1. 크롭
    const cropped = await sharp(SRC)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .png()
      .toBuffer();

    // 2. 배경 제거
    const noBg = await removeBg(cropped);

    // 3. 100×100 정사각형으로 리사이즈 (투명 패딩, 비율 유지)
    await sharp(noBg)
      .resize(SIZE, SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(OUT, c.file));

    console.log(`✓ ${c.file}`);
  }
  console.log('\n완료! 모두 100×100 투명 PNG');
}

cropAll().catch(console.error);
