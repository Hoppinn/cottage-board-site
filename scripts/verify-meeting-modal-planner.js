/**
 * 「이날 모임 상세」 모달의 플래너 진입 버튼 검증 (DB 불필요)
 *
 * 두 자리를 본다.
 *  ① day-detail.js openDateMeetingModal — 버튼이 언제 렌더되고 누르면 무엇이 일어나는가
 *     → 실제로 eval해 모달 innerHTML을 받고, 클릭 핸들러도 꺼내 호출한다.
 *  ② index-page.js 호출부 — 죽어 있던 onPlannerClick이 살아났고 트래킹이 2배가 아닌가
 *     → 원문을 잘라 검사. ⚠️ 주석을 먼저 지운다 — 이 자리의 주석에 'trackEvent'라는
 *        낱말이 실제로 들어 있어, 안 지우면 「주석 안의 이름을 코드 참조로 세는」 오답이 난다.
 *
 * 🚨 --negctl 을 먼저 돌릴 것. 기대값을 수정 전 동작(버튼 없음·주간뷰 진입)으로 뒤집어
 *    그 줄에서만 🔴이 뜨는 걸 본 뒤에야 「전부 통과」를 믿는다.
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
  else { fail++; console.log(`  🔴 ${label} — 기대 ${JSON.stringify(expected)}, 실제 ${JSON.stringify(actual)}`); }
}

// ── 가짜 DOM ─────────────────────────────────────────────────
// openDateMeetingModal은 el.querySelector('.dd-close-btn').addEventListener를 **널체크 없이**
// 부른다 → querySelector가 null을 주면 하니스가 죽는다. 셀렉터별 가짜 노드를 만들어 돌려준다.
function makeNode() {
  const handlers = {};
  return {
    id: '', className: '', innerHTML: '', textContent: '',
    _handlers: handlers, _removed: false,
    addEventListener(ev, fn) { (handlers[ev] ||= []).push(fn); },
    remove() { this._removed = true; },
    appendChild() {}, querySelectorAll() { return []; },
    querySelector() { return null; },
  };
}

function loadModal() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/day-detail.js'), 'utf8');
  const doc = {
    createElement: () => makeNode(),
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
  if (typeof win.openDateMeetingModal !== 'function') {
    console.log('🔴 openDateMeetingModal이 노출되지 않았다 — eval 하니스가 깨진 것이므로 결과 신뢰 금지');
    process.exit(1);
  }
  return { win, doc };
}

const vote = (date, uid) => ({
  vote_date: date, user_id: uid, nickname: '테스터', time_start: 14, time_end: 18, guest_count: 0,
});

console.log(`\n=== ① 모달의 플래너 버튼 (day-detail.js) ===${NEG ? '  ⚠️ 음성 대조군 — 기대값 뒤집음' : ''}`);
const { win, doc } = loadModal();

// 모달을 열고 결과 노드를 회수한다. createElement가 매번 새 노드를 주므로 body.appendChild에서 잡는다.
function openModal(date, opts) {
  let captured = null;
  const plannerNode = makeNode();
  doc.body.appendChild = el => { captured = el; };
  doc.createElement = () => {
    const n = makeNode();
    // 모달 루트만 planner 버튼을 갖는다 — 셀렉터로 가짜 노드를 배분
    n.querySelector = sel => (sel === '.dd-planner-btn' ? (n.innerHTML.includes('dd-planner-btn') ? plannerNode : null) : makeNode());
    return n;
  };
  win.openDateMeetingModal(date, [vote(date, 'u1')], [], opts);
  return { el: captured, plannerNode };
}

const cb = () => { cb.calls++; };
cb.calls = 0;

// 미래 + 콜백 있음 → 버튼이 뜬다
let r = openModal(TOMORROW, { onPlannerClick: cb, plannerLabel: '+ 이날 참여 등록' });
check('미래 — 플래너 버튼 렌더됨', /dd-planner-btn/.test(r.el.innerHTML), true);
check('미래 — 라벨이 호출부 지정대로', /\+ 이날 참여 등록/.test(r.el.innerHTML), true);

// 라벨 기본값
r = openModal(TOMORROW, { onPlannerClick: cb });
check('라벨 미지정 시 기본 문구', /플래너에서 등록하기/.test(r.el.innerHTML), true);

// 오늘도 등록 가능
r = openModal(TODAY, { onPlannerClick: cb });
check('오늘 — 플래너 버튼 렌더됨', /dd-planner-btn/.test(r.el.innerHTML), true);

// 지난 날짜 → A-10에 따라 렌더 안 함 (콜백을 줘도)
r = openModal(YESTERDAY, { onPlannerClick: cb, plannerLabel: '+ 이날 참여 등록' });
check('지난 날짜 — 콜백을 줘도 버튼 없음(A-10)', /dd-planner-btn/.test(r.el.innerHTML), NEG ? true : false);
check('지난 날짜 — 보기(참여자/닫기)는 그대로', /dd-close-btn/.test(r.el.innerHTML), true);

// 콜백 없으면 렌더 안 함 (club-schedule 등 다른 호출부 보호)
r = openModal(TOMORROW, {});
check('콜백 미제공 — 버튼 없음(기존 호출부 무영향)', /dd-planner-btn/.test(r.el.innerHTML), false);

// 클릭 동작: 모달이 닫히고 콜백이 불린다
r = openModal(TOMORROW, { onPlannerClick: cb });
const clickHandlers = r.plannerNode._handlers.click || [];
check('버튼에 클릭 핸들러가 붙는다', clickHandlers.length, 1);
const before = cb.calls;
clickHandlers[0]?.();
check('클릭 시 콜백 1회 호출', cb.calls - before, 1);
check('클릭 시 모달이 닫힌다(전환)', r.el._removed, true);

// ── ② 호출부 (index-page.js) ────────────────────────────────
console.log(`\n=== ② 홈 호출부 (index-page.js) ===`);
const idxSrc = fs.readFileSync(path.join(ROOT, 'assets/js/index-page.js'), 'utf8');
const mCall = idxSrc.match(/window\.openDateMeetingModal\?\.\([\s\S]*?\n      \}\);/);
if (!mCall) {
  console.log('🔴 index-page.js에서 openDateMeetingModal 호출부를 못 찾았다 — 코드가 바뀌었거나 검사기가 낡았다. 결과 신뢰 금지');
  process.exit(1);
}
// 🚨 주석 제거가 먼저다 — 이 블록 주석에 'trackEvent'·'openPlannerBtn'이 실제로 들어 있다.
// ⚠️ `\r`를 먼저 지운다: 이 리포는 CRLF라 `//.*$`가 줄 끝 \r 앞에서 멈춰 **아무것도 안 지운다**
//    (\r는 줄 종결자라 `.`가 안 먹고, m 플래그 없는 `$`는 문자열 끝만 뜻한다).
//    2026-07-22 음성 대조군이 이걸 잡았다 — 안 잡았으면 주석 속 낱말을 코드로 세고 통과했다.
const callCode = mCall[0].replace(/\r/g, '').split('\n').map(l => l.replace(/\/\/.*/, '')).join('\n');

check('onPlannerClick이 살아 있다(소비처 0건이던 죽은 인자)', /onPlannerClick:/.test(callCode), true);
check('그 날짜로 바로 진입한다(__openPlannerFor)', /__openPlannerFor\?\.\(dateStr/.test(callCode), NEG ? false : true);
check('날짜 없는 주간뷰 진입(openPlannerBtn.click)을 쓰지 않는다', /openPlannerBtn/.test(callCode), false);
check('트래킹을 중복 발사하지 않는다(__openPlannerFor가 자체 발사)', /trackEvent/.test(callCode), NEG ? true : false);
check('내 등록 여부로 라벨이 갈린다', /plannerLabel:\s*myVote\s*\?/.test(callCode), true);
check('수정 진입 플래그를 넘긴다', /__openPlannerFor\?\.\(dateStr,\s*!!myVote\)/.test(callCode), true);

// 회귀: __openPlannerFor는 여전히 자체적으로 트래킹한다(위 「중복 아님」 판정의 전제)
const mDef = idxSrc.match(/window\.__openPlannerFor = function[\s\S]*?\n  \};/);
check('전제 확인 — __openPlannerFor가 home_meeting_planner_click을 자체 발사',
  !!mDef && /trackEvent\('home_meeting_planner_click'\)/.test(mDef[0]), true);

console.log(`\n── 판정 ──`);
if (NEG) {
  console.log(fail >= 3
    ? `🟢 음성 대조군 성립 — 뒤집은 기대 ${fail}건에서만 🔴이 떴다. 본 검사의 「전부 통과」를 믿어도 된다.`
    : `⚠️ 음성 대조군 실패(🔴 ${fail}건) — 검사기가 실제 출력을 안 읽고 있을 수 있다. 통과를 믿지 말 것.`);
} else {
  console.log(fail === 0
    ? `✅ 전부 통과 (${pass}건) — 모달에서 그 날짜의 플래너로 갈 수 있고, 지난 날짜엔 안 뜨며, 트래킹은 1회다.`
    : `🔴 실패 ${fail}건 / 통과 ${pass}건`);
}
process.exit(0);
