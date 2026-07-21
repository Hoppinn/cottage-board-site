// 모임 인원 계산 — getPartySize / sumPartySize 검증 (DB 무변경, 순수 로직)
//
//   node scripts/verify-party-size.js            정상 검증
//   node scripts/verify-party-size.js --negctl   음성 대조군 (기대값을 일부러 1 비틈)
//
// 🚨 --negctl을 먼저 돌려 그 줄에서만 🔴이 뜨는 걸 본 뒤에 「전부 통과」를 믿을 것.
//
// 무엇을 검증하나: `supabase-client.js`를 **실제로 eval해** 공용 헬퍼를 꺼내 쓴다(사본 금지 —
// 사본을 만들면 사본이 거짓말한다). 핵심은 두 가지다.
//   ① 회귀 불변식 — guest_count가 없거나 0이면 결과가 옛 계산(.length / Set(user_id).size)과 같다
//   ② 인원 계산 — 등록 1건 + 지인 2명 = 3명
//
// DB에 붙지 않는다(쿼리 0건). 013 마이그레이션 실행 전에도 돌릴 수 있다.
const fs = require('fs');
const path = require('path');
const NEG = process.argv.includes('--negctl');

// ── 브라우저 전역 스텁 ──────────────────────────────────────
const store = new Map();
global.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const noopEl = () => ({ style: {}, classList: { add() {}, remove() {}, contains: () => false }, appendChild() {}, setAttribute() {}, addEventListener() {}, remove() {} });
global.document = {
  readyState: 'complete',
  addEventListener() {}, removeEventListener() {},
  createElement: noopEl, getElementById: () => null,
  querySelector: () => null, querySelectorAll: () => [],
  body: noopEl(), documentElement: noopEl(),
  referrer: '',
};
global.navigator = { userAgent: 'node-verify', sendBeacon: () => false };
global.window = global;
global.location = window.location = { hostname: 'localhost', href: 'http://localhost/', pathname: '/', search: '', origin: 'http://localhost' };
global.addEventListener = () => {};
global.removeEventListener = () => {};
// ⚠️ setInterval을 스텁하지 말 것 — undici(fetch)가 setInterval(...).unref()를 호출한다.
global.supabase = require('../node_modules/@supabase/supabase-js');

const src = f => fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8');
eval(src('supabase-config.js'));
eval(src('supabase-client.js'));

let fail = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? '🟢' : '🔴'} ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) fail++;
};

const db = window.CottageDB;
const { getPartySize, sumPartySize } = db;

// 옛 계산 재현 — 회귀 대조군
const oldCount = votes => new Set(votes.map(v => String(v.user_id))).size;

const v = (uid, guest) => {
  const row = { vote_date: '2026-07-22', user_id: uid, nickname: uid, time_start: 14, time_end: 20 };
  if (guest !== undefined) row.guest_count = guest;
  return row;
};

console.log('=== ① 회귀: guest_count가 없거나 0이면 옛 계산과 같아야 한다 ===');
const legacySets = [
  ['빈 배열',        []],
  ['컬럼 없음 1건',  [v('u1')]],
  ['컬럼 없음 3건',  [v('u1'), v('u2'), v('u3')]],
  ['0 명시 3건',     [v('u1', 0), v('u2', 0), v('u3', 0)]],
  ['같은 유저 중복', [v('u1'), v('u1')]],
];
for (const [label, votes] of legacySets) {
  const expect = oldCount(votes) + (NEG && label === '컬럼 없음 3건' ? 1 : 0);
  check(`${label}: sumPartySize = 옛 Set(user_id).size`, sumPartySize(votes) === expect,
        `sum=${sumPartySize(votes)} / 기대=${expect}`);
}

console.log('=== ② 인원: 등록 1건 + 지인 2명 = 3명 ===');
check('getPartySize(지인 0) = 1', getPartySize(v('u1', 0)) === 1);
check('getPartySize(지인 2) = 3', getPartySize(v('u1', 2)) === 3);
check('getPartySize(지인 20) = 21', getPartySize(v('u1', 20)) === 21);
check('등록 1건·지인 2명 → 3명', sumPartySize([v('u1', 2)]) === (NEG ? 4 : 3),
      `sum=${sumPartySize([v('u1', 2)])}`);
check('2명 등록(지인 2,0) → 4명', sumPartySize([v('u1', 2), v('u2', 0)]) === 4);

console.log('=== ③ 엣지: null·문자열·음수·소수 ===');
check('vote가 null이면 1명 아님(0 취급 안 함 — 방어)', getPartySize(null) === 1);
check('guest_count = null → 1', getPartySize({ guest_count: null }) === 1);
check('guest_count = "2"(문자열) → 3', getPartySize({ guest_count: '2' }) === 3);
check('guest_count = -5(음수) → 1', getPartySize({ guest_count: -5 }) === 1);
check('guest_count = 2.7(소수) → 3', getPartySize({ guest_count: 2.7 }) === 3);
check('guest_count = NaN → 1', getPartySize({ guest_count: NaN }) === 1);
check('sumPartySize(null) → 0', sumPartySize(null) === 0);
check('sumPartySize(배열 아님) → 0', sumPartySize('x') === 0);

console.log('=== ④ 중복 행: 같은 유저가 두 번 들어와도 한 번만 센다 ===');
check('같은 user_id 2행(지인 2) → 3명', sumPartySize([v('u1', 2), v('u1', 2)]) === 3);

console.log(fail === 0
  ? (NEG ? '\n⚠️ --negctl인데 전부 통과 — 검사기가 고장 났다. 결과를 믿지 말 것.' : '\n✅ 전부 통과')
  : (NEG ? `\n✅ 음성 대조군 정상: 비튼 ${fail}줄에서만 🔴` : `\n❌ ${fail}건 실패`));
process.exit(NEG ? (fail > 0 ? 0 : 1) : (fail > 0 ? 1 : 0));
