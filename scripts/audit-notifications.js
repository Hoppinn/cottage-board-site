// 「관심 기반 묶음 알림」 착수 첫 동작 — 재측정 (읽기 전용, DB 무변경)
//
//   node scripts/audit-notifications.js [--negctl]
//
// §0이 "이 항목의 절반은 이미 구현돼 있다"고 경고한 항목이다. 그래서 코드를 읽는 대신
// **getMyNotifications를 실제 회원들에게 그대로 돌려** 화면에 무엇이 몇 줄 뜨는지 센다.
// 묻는 것: ①한 사람이 보는 알림이 몇 줄인가 ②그중 한 유형이 몇 %를 차지하나
//          ③묶음이 이미 적용된 유형과 안 된 유형이 각각 얼마인가
//
// 🚨 --negctl: 묶음 로직을 통과한 결과(count>1인 묶음)가 실제로 있는지 먼저 본다.
//    묶음이 하나도 안 잡히면 "묶을 게 없다"와 "측정이 고장났다"가 구별되지 않는다.
const fs = require('fs');
const path = require('path');
const NEG = process.argv.includes('--negctl');

// ── 브라우저 전역 스텁 (verify-home-hero-recent.js와 동일 패턴) ──
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
global.navigator = { userAgent: 'node-audit', sendBeacon: () => false };
global.window = global;
// ⚠️ localhost → 사이트 코드의 추적성 write가 자체 차단된다. 부르는 것도 읽기 함수뿐이다.
global.location = window.location = { hostname: 'localhost', href: 'http://localhost/', pathname: '/', search: '', origin: 'http://localhost' };
global.addEventListener = () => {};
global.removeEventListener = () => {};
// ⚠️ setInterval을 스텁하지 말 것 — undici가 .unref()를 부른다.
global.supabase = require('../node_modules/@supabase/supabase-js');

const src = f => fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8');
eval(src('supabase-config.js'));
eval(src('supabase-client.js'));

const { createClient } = global.supabase;
const raw = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
const ADMIN_ID = '4916417947';

(async () => {
  const { data: profiles, error, count } = await raw
    .from('profiles').select('user_id, nickname, last_seen_at', { count: 'exact' })
    .order('last_seen_at', { ascending: false }).limit(50000);
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  if (count === null) { console.error('🔴 profiles 테이블이 없다'); process.exit(1); }
  console.log(`profiles ${profiles.length}행 (count=${count}) ${profiles.length === count ? '✅' : '🔴 절단 의심'}\n`);
  if (profiles.length !== count) process.exit(1);

  // 테스트 잔여 계정 제외 (#22 __racetest_*, test_meeting_999 — admin-analytics.md §3)
  const real = profiles.filter(p => !/^__racetest_|^test_meeting_/.test(String(p.user_id)));

  const typeTotals = {}, groupedRows = {}, groupedNotifs = {};
  const perUser = [];
  for (const p of real) {
    // notifSeenAt=null → 「한 번도 안 읽은 사람이 처음 여는 화면」. 최악이 아니라 실제
    // 신규 회원이 보는 화면이고, 도배 여부는 이 상태에서 판정해야 한다.
    const notifs = await window.CottageDB.getMyNotifications(p.user_id, p.nickname, null, null);
    const byType = {};
    for (const n of notifs) {
      byType[n.type] = (byType[n.type] || 0) + 1;
      typeTotals[n.type] = (typeTotals[n.type] || 0) + 1;
      const members = n.count || 1;
      groupedNotifs[n.type] = (groupedNotifs[n.type] || 0) + 1;
      groupedRows[n.type] = (groupedRows[n.type] || 0) + members;
    }
    perUser.push({ id: p.user_id, nick: p.nickname, total: notifs.length, byType, isAdmin: String(p.user_id) === ADMIN_ID });
  }

  perUser.sort((a, b) => b.total - a.total);
  console.log('=== ① 사람별 알림 줄 수 (많은 순 15명) ===');
  perUser.slice(0, 15).forEach(u => {
    const top = Object.entries(u.byType).sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}×${n}`).join(' ');
    console.log(`  ${String(u.total).padStart(3)}줄  ${(u.nick || u.id).padEnd(12)}${u.isAdmin ? '(관리자)' : '        '} ${top}`);
  });
  const totals = perUser.map(u => u.total);
  const nonAdmin = perUser.filter(u => !u.isAdmin).map(u => u.total);
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  console.log(`\n  회원 ${perUser.length}명 · 최대 ${Math.max(...totals)}줄 · 중앙값 ${med(totals)}줄`);
  console.log(`  비관리자만: 최대 ${Math.max(...nonAdmin)}줄 · 중앙값 ${med(nonAdmin)}줄`);

  console.log('\n=== ② 유형별 — 화면 줄 수 vs 원본 행 수 (묶음이 이미 접은 양) ===');
  console.log('  유형                 줄     원본행   묶임');
  Object.keys(typeTotals).sort((a, b) => typeTotals[b] - typeTotals[a]).forEach(t => {
    const lines = groupedNotifs[t], rows = groupedRows[t];
    console.log(`  ${t.padEnd(18)} ${String(lines).padStart(5)} ${String(rows).padStart(8)}   ${rows > lines ? `✅ ${rows - lines}행 접힘` : '— 1:1(미묶음)'}`);
  });

  const anyGrouped = Object.keys(typeTotals).some(t => groupedRows[t] > groupedNotifs[t]);
  console.log();
  if (NEG) {
    console.log(anyGrouped
      ? '✅ 음성 대조군 통과 — 묶음(count>1)이 실제로 검출된다. ②의 「미묶음」 판정을 신뢰해도 된다.'
      : '🔴 음성 대조군 실패 — 어떤 유형에서도 묶음이 안 잡힌다. 측정이 count 필드를 못 읽고 있을 수 있으니 「전부 미묶음」을 믿지 말 것.');
  } else {
    console.log('※ 「미묶음」 유형이 실제로 사람 화면을 차지하는지는 ①의 줄 수와 함께 볼 것 —');
    console.log('   원본행이 적은 유형은 묶어도 줄 수가 안 줄어든다(= 고칠 게 없다).');
  }
  process.exit(0);
})();
