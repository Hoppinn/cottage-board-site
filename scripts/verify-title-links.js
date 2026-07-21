// TITLE_DEFS ↔ ACH_DEFS.rewards.title 정합성 검사
// 사용: node check-titles.js [--negctl]
const fs = require('fs');
const path = require('path');
let src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'achievements.js'), 'utf8');

if (process.argv.includes('--negctl')) {
  // 음성 대조군: 정상인 title_record_10 연결을 일부러 끊는다 → 고아 1건이 잡혀야 한다.
  // 여기서 🔴이 뜨는 걸 본 뒤에야 본 검사의 "전부 통과"를 믿는다.
  src = src.replace("rewards: { title: 'title_record_10' }", "rewards: {}");
  console.log('[negctl] title_record_10 연결을 끊었다. 고아 1건이 나와야 정상.');
}

const window = {};
const document = { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
// 내부 상수를 꺼내기 위해 IIFE 끝에 export 한 줄을 주입
src = src.replace(
  /\r?\n\s*window\.checkAchievements = checkAchievements;\r?\n\}\)\(\);\s*$/,
  '\n  window.__DEFS = { ACH_DEFS, TITLE_DEFS };\n})();\n'
);
if (!/__DEFS/.test(src)) { console.error('🔴 주입 실패 — 파일 끝 형태가 바뀌었다. 검사 중단.'); process.exit(1); }

eval(src);
const { ACH_DEFS, TITLE_DEFS } = window.__DEFS;

const granted = new Map(); // titleId -> [achId...]
ACH_DEFS.forEach(d => {
  if (d.rewards && d.rewards.title) {
    if (!granted.has(d.rewards.title)) granted.set(d.rewards.title, []);
    granted.get(d.rewards.title).push(d.id);
  }
});

const orphans = TITLE_DEFS.filter(t => !granted.has(t.id));
const dangling = [...granted.keys()].filter(id => !TITLE_DEFS.some(t => t.id === id));
const dupes = [...granted.entries()].filter(([, v]) => v.length > 1);

console.log(`TITLE_DEFS ${TITLE_DEFS.length}종 / ACH_DEFS가 지급하는 칭호 ${granted.size}종`);
console.log(`고아(획득 불가) ${orphans.length}건:`, orphans.map(t => `${t.id}(${t.name})`));
console.log(`허수(정의 없는 칭호 지급) ${dangling.length}건:`, dangling);
console.log(`중복 지급 ${dupes.length}건:`, dupes);

// 임계값 일치 확인 — title_X_N 의 N 이 지급 업적의 threshold 와 같은가
const mismatched = [];
granted.forEach((achIds, titleId) => {
  const m = titleId.match(/_(\d+)$/);
  if (!m) return;
  achIds.forEach(aid => {
    const ach = ACH_DEFS.find(a => a.id === aid);
    if (ach && String(ach.threshold) !== m[1]) mismatched.push(`${titleId} ← ${aid}(threshold ${ach.threshold})`);
  });
});
console.log(`임계값 불일치 ${mismatched.length}건:`, mismatched);

const ok = orphans.length === 0 && dangling.length === 0 && dupes.length === 0 && mismatched.length === 0;
console.log(ok ? '\n✅ 전부 통과' : '\n🔴 문제 있음');
