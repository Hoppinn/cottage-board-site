/**
 * A-10 「지난 일정 수정불가」 검증 — 지난 날짜에서 무반응 버튼이 사라졌는가 (DB 불필요)
 *
 * 두 자리를 본다.
 *  ① 공용 막대 window.buildBarsInCard (day-detail.js) — 내 막대의 ✎/✕
 *     → day-detail.js를 **실제로 eval**해 HTML 문자열을 받아 센다.
 *  ② 홈 미리보기 renderPreview (index-page.js) — 「+ 이날 참여 등록」/「+ 플래너에서 등록하기」
 *     → 화면 코드에서 **원문 그대로 잘라** eval한다(문자열 검사가 아니라 실제 분기 실행).
 *
 * 🚨 --negctl 을 먼저 돌릴 것. 기대값을 「지난 날짜에도 버튼이 있다」(수정 전 동작)로
 *    뒤집어, 그 줄에서만 🔴이 뜨는 걸 본 뒤에야 「전부 통과」를 믿는다.
 *
 * 날짜 경계: vote_date는 로컬 YYYY-MM-DD라 UTC 변환을 쓰지 않는다(toISOString 금지).
 */
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const ROOT = path.join(__dirname, '..');

function dstr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const YESTERDAY = dstr(-1), TODAY = dstr(0), TOMORROW = dstr(1);

let fail = 0, pass = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  🔴 ${label} — 기대 ${expected}, 실제 ${actual}`); }
}

// ── ① day-detail.js buildBarsInCard 실제 실행 ────────────────────
function loadBuildBars() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/day-detail.js'), 'utf8');
  const styleEl = { textContent: '' };
  const doc = {
    createElement: () => styleEl,
    head: { appendChild() {} },
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const win = {
    escH: s => String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    addEventListener() {},
    document: doc,
  };
  global.window = win; global.document = doc;
  (0, eval)(src);
  if (typeof win.buildBarsInCard !== 'function') {
    console.log('🔴 buildBarsInCard가 노출되지 않았다 — eval 하니스가 깨진 것이므로 결과 신뢰 금지');
    process.exit(1);
  }
  return win.buildBarsInCard;
}

const vote = (date, uid) => ({
  vote_date: date, user_id: uid, nickname: '테스터', time_start: 14, time_end: 18, guest_count: 0,
});

console.log(`\n=== ① 공용 막대 ✎/✕ (day-detail.js) ===${NEG ? '  ⚠️ 음성 대조군 — 기대값 뒤집음' : ''}`);
const buildBars = loadBuildBars();

function hasActions(date) {
  const html = buildBars([vote(date, 'u1')], [], vote(date, 'u1'));
  return /sched-bar-edit-btn|sched-bar-del-btn/.test(html);
}

check(`지난 날짜(${YESTERDAY}) 내 막대에 ✎/✕ 없음`, hasActions(YESTERDAY), NEG ? true : false);
check(`오늘(${TODAY}) 내 막대엔 ✎/✕ 있음`,           hasActions(TODAY),     true);
check(`미래(${TOMORROW}) 내 막대엔 ✎/✕ 있음`,        hasActions(TOMORROW),  true);

// 회귀: 남의 막대엔 원래 없다 / 막대 자체(보기)는 과거에도 그려진다
const othersPast = buildBars([vote(YESTERDAY, 'u2')], [], vote(YESTERDAY, 'u1'));
check('남의 막대엔 ✎/✕ 없음(기존 동작 유지)', /sched-bar-edit-btn/.test(othersPast), false);
check('지난 날짜도 막대 자체는 그려진다(보기 허용)', /sched-bar-track/.test(othersPast), true);

// ── ② 홈 미리보기 등록 진입 (index-page.js) ─────────────────────
console.log(`\n=== ② 홈 미리보기 등록 버튼 (index-page.js) ===`);
const idxSrc = fs.readFileSync(path.join(ROOT, 'assets/js/index-page.js'), 'utf8');

// 화면 코드에서 원문 그대로 잘라온다 — 다른 표현으로 베껴 쓰면 코드가 바뀌어도 검사기가 통과한다
const mPast = idxSrc.match(/const isPastDate = ([^\n;]+);/);
const mEmpty = idxSrc.match(/\$\{isPastDate \? '' : `(<button class="mpe-link"[^`]*)`\}/);
const mActions = idxSrc.match(/const actionsHtml = \(([^)]+)\)\s*\n?\s*\?/);
if (!mPast || !mEmpty || !mActions) {
  console.log('🔴 index-page.js에서 판정 대상 코드를 못 찾았다 — 코드가 바뀌었거나 검사기가 낡았다. 결과 신뢰 금지');
  process.exit(1);
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function previewShowsRegister(dateStr, myVote) {
  const isPastDate = eval(mPast[1]);          // 원문 그대로의 판정식
  const emptyHasBtn = !isPastDate;            // 빈 상태: isPastDate면 버튼 문자열이 통째로 빠진다
  const splitShown  = !eval(mActions[1]);     // 등록+상세 2버튼 분기로 가는가
  return { emptyHasBtn, splitShown };
}

let r = previewShowsRegister(YESTERDAY, null);
check(`지난 날짜 — 빈 상태에 「+ 플래너에서 등록하기」 없음`, r.emptyHasBtn, NEG ? true : false);
check(`지난 날짜 — 「+ 이날 참여 등록」 없음`,                r.splitShown,  NEG ? true : false);

r = previewShowsRegister(TODAY, null);
check(`오늘 — 빈 상태에 「+ 플래너에서 등록하기」 있음`, r.emptyHasBtn, true);
check(`오늘 — 「+ 이날 참여 등록」 있음`,                r.splitShown,  true);

r = previewShowsRegister(TOMORROW, null);
check(`미래 — 「+ 이날 참여 등록」 있음`, r.splitShown, true);

r = previewShowsRegister(TOMORROW, { user_id: 'u1' });
check('미래 + 내가 이미 등록 — 상세 버튼만(기존 동작 유지)', r.splitShown, false);

console.log(`\n── 판정 ──`);
if (NEG) {
  console.log(fail >= 3
    ? `🟢 음성 대조군 성립 — 뒤집은 기대 ${fail}건에서만 🔴이 떴다. 본 검사의 「전부 통과」를 믿어도 된다.`
    : `⚠️ 음성 대조군 실패(🔴 ${fail}건) — 검사기가 실제 출력을 안 읽고 있을 수 있다. 통과를 믿지 말 것.`);
} else {
  console.log(fail === 0
    ? `✅ 전부 통과 (${pass}건) — 지난 날짜의 무반응 버튼 0건, 보기·미래 경로는 그대로.`
    : `🔴 실패 ${fail}건 / 통과 ${pass}건`);
}
process.exit(0);
