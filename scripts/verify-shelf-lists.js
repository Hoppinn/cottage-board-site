// 선반 목록 두 벌(config/shelf-locations.js · pages/game/game-location.html SECTIONS)이 같은지,
// 「따로」·「별도」가 따로 보관 선반으로 해석되는지 검증한다. DB 쓰기 없음.
// 사용: node scripts/verify-shelf-lists.js [--negctl]
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const root = path.join(__dirname, '..');
const { SHELF_GROUPS, getShelfGroupBySourceValue } = require(path.join(root, 'game-system/config/shelf-locations.js'));
const html = fs.readFileSync(path.join(root, 'pages/game/game-location.html'), 'utf8');

let failures = 0;
function check(label, condition, detail = '') {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
}

console.log('=== 선반 목록 ===');
const probe = NEG ? '없는값' : '따로';
check(`「${probe}」 → separate`, getShelfGroupBySourceValue(probe)?.id === 'separate');
check('「별도」 → separate', getShelfGroupBySourceValue('별도')?.id === 'separate');

const sectionRe = /\{\s*id:\s*'([^']+)',\s*code:\s*'([^']+)',\s*label:\s*'([^']+)'/g;
const htmlKeys = [...html.matchAll(sectionRe)].map(m => `${m[1]}:${m[2]}`).sort();
const configKeys = SHELF_GROUPS.map(g => `${g.id}:${g.code}`).sort();
const missing = configKeys.filter(k => !htmlKeys.includes(k));
const extra = htmlKeys.filter(k => !configKeys.includes(k));
check('game-location.html SECTIONS == SHELF_GROUPS (id·code)', !missing.length && !extra.length,
  `html에 없음 [${missing.join(', ')}] / config에 없음 [${extra.join(', ')}]`);

console.log(failures ? `\n❌ ${failures}건 실패` : '\n✅ 전부 통과');
process.exit(failures ? 1 : 0);
