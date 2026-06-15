const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = 'C:\\Users\\HOPPYNESS\\OneDrive\\Documents\\카카오톡 받은 파일\\KakaoTalk_20260615_193537067.png';
const OUT = path.join(__dirname, '..', 'assets', 'images', 'characters');
const DIAG = path.join(OUT, '_diag');
if (!fs.existsSync(DIAG)) fs.mkdirSync(DIAG, { recursive: true });
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 1254×1254 이미지 레이아웃:
//   y=0~155  : 토끼 행 (전체 너비, 5캐릭터 + 최종목표 칸)
//   y=325~480: 다람쥐 행 (x=0~650, 5칸) — 진단 확인
//   y=775~930: 고슴도치(x=0~600) + 햄스터(x=600~1254) — 동일 y 좌우 분할

const CHARS = [
  // 토끼: 헤더 y=10~50, 스프라이트 y=52~182
  // 6칸(토끼5+최종목표1)이 1254px에 균등 배치: 각 209px, 크롭은 가운데 130px
  { file: 'rabbit_first.png', left: 40,   top: 52, width: 130, height: 130 },
  { file: 'rabbit_5.png',     left: 249,  top: 52, width: 130, height: 130 },
  { file: 'rabbit_20.png',    left: 458,  top: 52, width: 130, height: 130 },
  { file: 'rabbit_50.png',    left: 667,  top: 52, width: 130, height: 130 },
  { file: 'rabbit_100.png',   left: 876,  top: 52, width: 130, height: 130 },

  // 다람쥐: 5칸 × 130px = 650, 스프라이트가 셀 우측 치우침
  // → 각 셀 시작에서 30px 안쪽부터 100px 크롭으로 이전 캐릭터 블리드 방지
  { file: 'squirrel_10.png',  left: 20,  top: 325, width: 100, height: 130 },
  { file: 'squirrel_50.png',  left: 160, top: 325, width: 100, height: 130 },
  { file: 'squirrel_100.png', left: 290, top: 325, width: 100, height: 130 },
  { file: 'squirrel_200.png', left: 420, top: 325, width: 100, height: 130 },

  // 고슴도치: 4칸 × 150px = 600 (진단 확인)
  { file: 'hedgehog_1.png',   left: 10,  top: 775, width: 130, height: 130 },
  { file: 'hedgehog_10.png',  left: 160, top: 775, width: 130, height: 130 },
  { file: 'hedgehog_50.png',  left: 310, top: 775, width: 130, height: 130 },
  { file: 'hedgehog_100.png', left: 460, top: 775, width: 130, height: 130 },

  // 햄스터: 5칸 × 131px, x=600~1254, 스프라이트가 셀 좌측 치우침
  // → 셀 중심 기준 ±50px (100px 크롭)
  { file: 'hamster_1.png',    left: 615, top: 775, width: 100, height: 130 },
  { file: 'hamster_10.png',   left: 746, top: 775, width: 100, height: 130 },
  { file: 'hamster_50.png',   left: 877, top: 775, width: 100, height: 130 },
  { file: 'hamster_100.png',  left: 1008, top: 775, width: 100, height: 130 },
];

async function cropAll() {
  for (const c of CHARS) {
    await sharp(SRC)
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .png()
      .toFile(path.join(OUT, c.file));
    console.log(`✓ ${c.file}`);
  }
  console.log('\n완료!');
}

// 햄스터 셀 경계 정밀 측정 진단
async function diagHamsterSlots() {
  // 131px씩 5개 슬롯 — 어느 슬롯에 단일 캐릭터가 나오는지 확인
  for (let i = 0; i < 5; i++) {
    const left = 600 + i * 131;
    await sharp(SRC)
      .extract({ left, top: 775, width: 131, height: 130 })
      .png()
      .toFile(`${DIAG}/hamster_slot${i}.png`);
    console.log(`hamster_slot${i}.png (left=${left})`);
  }

  // 토끼 섹션 헤더 얼마나 높은지 확인 (y=0~50 슬라이스)
  await sharp(SRC)
    .extract({ left: 0, top: 0, width: 1254, height: 50 })
    .png()
    .toFile(`${DIAG}/rabbit_header.png`);
  console.log('rabbit_header.png (y=0~50)');

  // 고슴도치 행 전체 (x=0~600, y=775~905)
  await sharp(SRC)
    .extract({ left: 0, top: 775, width: 600, height: 130 })
    .png()
    .toFile(`${DIAG}/hedgehog_full.png`);
  console.log('hedgehog_full.png');

  console.log('진단 완료');
}

const mode = process.argv[2];
if (mode === '--diag') {
  diagHamsterSlots().catch(console.error);
} else {
  cropAll().catch(console.error);
}
