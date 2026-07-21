// ACH_DEFS.rewards.character ↔ 실제 이미지 파일 대조 (DB 불필요)
// 사용: node scripts/verify-character-assets.js [--negctl]
//
// 왜 필요한가: 캐릭터 이미지는 <img onerror>가 이모지로 가려주기 때문에
// 파일이 없어도 화면상 티가 안 난다. 달성자가 나오기 전엔 아무도 모른다.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let src = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'achievements.js'), 'utf8');

const negctl = process.argv.includes('--negctl');
if (negctl) {
  // 음성 대조군: 실재하는 bear_lv5를 없는 이름으로 바꾼다 → 누락 1건이 더 잡혀야 한다.
  src = src.replace("character: 'bear_lv5'", "character: '__no_such_char__'");
  console.log("[negctl] bear_lv5 → __no_such_char__ 로 바꿨다. 누락이 1건 늘어야 정상.\n");
}

const window = {};
const document = { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
src = src.replace(
  /\r?\n\s*window\.checkAchievements = checkAchievements;\r?\n\}\)\(\);\s*$/,
  '\n  window.__DEFS = { ACH_DEFS, _charImgPath };\n})();\n'
);
if (!/__DEFS/.test(src)) { console.error('🔴 주입 실패 — 파일 끝 형태가 바뀌었다. 검사 중단.'); process.exit(1); }
eval(src);
const { ACH_DEFS, _charImgPath } = window.__DEFS;
if (typeof _charImgPath !== 'function') { console.error('🔴 _charImgPath를 못 꺼냈다. 검사 중단.'); process.exit(1); }

const rows = ACH_DEFS.filter(d => d.rewards && d.rewards.character).map(d => {
  const rel = String(_charImgPath(d.rewards.character)).replace(/^\.*\//, '');
  return { achId: d.id, char: d.rewards.character, rel, exists: fs.existsSync(path.join(ROOT, rel)) };
});

// 경로 규칙이 통째로 어긋나면 전건 누락으로 나온다 — 그건 파일 문제가 아니라 검사기 문제다
const missing = rows.filter(r => !r.exists);
if (!negctl && missing.length === rows.length && rows.length > 0) {
  console.error(`🔴 ${rows.length}건 전건 누락 — 경로 규칙이 어긋났을 가능성이 크다. 예: ${rows[0].rel}`);
  process.exit(1);
}

console.log(`캐릭터 보상 ${rows.length}종 / 파일 있음 ${rows.length - missing.length}종`);
console.log(`파일 누락 ${missing.length}건:`);
missing.forEach(r => console.log(`  - ${r.char.padEnd(18)} ← ${r.achId.padEnd(14)} (${r.rel})`));

// 고아 파일: 디스크에 있는데 어떤 업적도 지급하지 않는 이미지
const used = new Set(rows.map(r => path.normalize(r.rel)));
const dirs = ['assets/images/characters/characters_basic', 'assets/images/characters/characters_basic/rare'];
const orphanFiles = [];
dirs.forEach(d => {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return;
  fs.readdirSync(abs).filter(f => /\.png$/i.test(f)).forEach(f => {
    const rel = path.normalize(path.join(d, f));
    if (!used.has(rel)) orphanFiles.push(rel);
  });
});
console.log(`\n어떤 업적도 안 쓰는 이미지 ${orphanFiles.length}건:`);
orphanFiles.forEach(f => console.log(`  - ${f}`));

console.log(missing.length === 0 ? '\n✅ 누락 없음' : '\n🔴 누락 있음');
