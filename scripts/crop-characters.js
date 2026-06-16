const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'C:\\Users\\HOPPYNESS\\OneDrive\\Documents\\카카오톡 받은 파일\\KakaoTalk_20260615_193537067.png';
const OUT = path.join(__dirname, '..', 'assets', 'images', 'characters');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 출력 크기 (px): 모든 캐릭터 통일
const SIZE = 100;

// 진단으로 확정된 스프라이트 좌표 (v3 — 2026-06-16 헤더 텍스트 제거 확인)
// 검증 방법: top을 35/40/45/50 비교 → top=45가 토끼 텍스트 제거 + 귀 온전
//           다람쥐: top=305/315/320 비교 → top=305 클린, top=320 하단 텍스트 침범
//
// 토끼    : cells=209px, left+40, top=45, h=130
// 다람쥐  : cells=130px, left+60, top=305, h=115
// 고슴도치: cells=120px, left+45, top=755, h=90  (top=755 이미 클린 확인)
// 햄스터  : cells=131px, left+600, top=755, h=90 (동일)

const CHARS = [
  { file: 'rabbit_first.png', left: 40,       top: 45,  width: 130, height: 130 },
  { file: 'rabbit_5.png',     left: 40+209,   top: 45,  width: 130, height: 130 },
  { file: 'rabbit_20.png',    left: 40+418,   top: 45,  width: 130, height: 130 },
  { file: 'rabbit_50.png',    left: 40+627,   top: 45,  width: 130, height: 130 },
  { file: 'rabbit_100.png',   left: 40+836,   top: 45,  width: 85,  height: 130 }, // width=85: 우측 장식 프레임 제외

  { file: 'squirrel_10.png',  left: 60,       top: 305, width: 90,  height: 115 },
  { file: 'squirrel_50.png',  left: 60+130,   top: 305, width: 90,  height: 115 },
  { file: 'squirrel_100.png', left: 60+260,   top: 305, width: 90,  height: 115 },
  { file: 'squirrel_200.png', left: 60+390,   top: 305, width: 90,  height: 115 },

  { file: 'hedgehog_1.png',   left: 45,       top: 755, width: 90,  height: 90 },
  { file: 'hedgehog_10.png',  left: 45+120,   top: 755, width: 90,  height: 90 },
  { file: 'hedgehog_50.png',  left: 45+240,   top: 755, width: 90,  height: 90 },
  { file: 'hedgehog_100.png', left: 45+360,   top: 755, width: 90,  height: 90 },

  { file: 'hamster_1.png',    left: 600,      top: 755, width: 90,  height: 90 },
  { file: 'hamster_10.png',   left: 600+131,  top: 755, width: 90,  height: 90 },
  { file: 'hamster_50.png',   left: 600+262,  top: 755, width: 90,  height: 90 },
  { file: 'hamster_100.png',  left: 600+393,  top: 755, width: 90,  height: 90 },
];

// 배경색 제거: 좌상단(헤더 밴드색) + 우하단(크림색) 두 색을 동시에 제거
async function removeBg(inputBuffer, tolerance = 40) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  // bg1: 좌상단 픽셀 (헤더 밴드 색 — 초록, 갈색 등 계열별 상이)
  const bg1 = [pixels[0], pixels[1], pixels[2]];
  // bg2: 우하단 픽셀 (크림 배경색)
  const lastIdx = (info.width * info.height - 1) * 4;
  const bg2 = [pixels[lastIdx], pixels[lastIdx+1], pixels[lastIdx+2]];

  function dist(r, g, b, bg) {
    const dr = r - bg[0], dg = g - bg[1], db = b - bg[2];
    return Math.sqrt(dr*dr + dg*dg + db*db);
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    if (dist(r, g, b, bg1) < tolerance || dist(r, g, b, bg2) < tolerance) {
      pixels[i+3] = 0;
    }
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
