/**
 * 새 게임 추가 + BGG 매칭 + 빌드 자동화
 * 사용법: node game-system/tools/0-input/add-game.js 에이다의꿈
 */

const { execSync } = require('child_process');
const path = require('path');

const gameName = process.argv[2];

if (!gameName) {
  console.error('❌ 게임명을 입력해주세요.');
  console.error('   예: npm run add-game 에이다의꿈');
  process.exit(1);
}

const root = path.resolve(__dirname, '../../..');

function run(label, cmd) {
  console.log(`\n▶ ${label}...`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' });
    console.log(`✅ ${label} 완료`);
  } catch (e) {
    console.error(`❌ ${label} 실패`);
    process.exit(1);
  }
}

console.log(`\n🎲 새 게임 추가: "${gameName}"\n${'─'.repeat(40)}`);

run('1. 게임 목록 추가', `node game-system/tools/0-input/from-name/add-owned-game.js "${gameName}"`);
run('2. BGG 로컬 매칭',  `node game-system/tools/1-matcher/b_run-local-match.js`);
run('3. BGG 데이터 fetch', `node game-system/tools/2-fetcher/a_fetch-bgg-game-data-by-id.js`);
run('4. 마스터 빌드',   `node game-system/tools/3-build-master/build-master.js`);
run('5. 출력 빌드',     `node game-system/tools/5-build-output/build-output.js`);

console.log(`\n🎉 완료! "${gameName}" 추가됨\n`);
console.log('💡 BGG 자동매칭이 안 됐다면 forced-bgg-overrides.json에 수동 추가 후 다시 빌드하세요.');
