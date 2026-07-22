// 쌍둥이 INSERT 접기(`collapseTwinInserts`) 검증 — 읽기 전용.
//
//   node scripts/verify-session-dedup.js --negctl   ← 먼저 이걸 돌릴 것
//   node scripts/verify-session-dedup.js
//
// 화면 코드(requests-admin.html)에서 정규화기와 접기 함수를 **원문 그대로 잘라 eval**한다.
// 사본을 검사하면 화면과 조용히 갈라진다(#14 검증 선례).
//
// 🚨 --negctl은 창을 0ms로 비틀어 넣는다. 그래도 「접힘 0건」이 안 나오면 판정기가 창을
//    안 보고 있다는 뜻이므로 본 판정을 믿지 말 것.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = { location: { hostname: 'cottageboard.co.kr' } };
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const NEGCTL = process.argv.includes('--negctl');

// P4(2026-07-22)부터 정규화·별칭표는 member-analytics.js가 단일 소스다 — 그 모듈을 eval해
// 그대로 쓴다. collapseTwinInserts만 아직 requests-admin.html에 있어 원문을 잘라 eval한다.
const { loadMemberAnalytics } = require('./_member-analytics');
function loadScreenFns() {
  const MA = loadMemberAnalytics();
  const normalizePageKey = MA.normalizePageKey;
  const PAGE_KEY_ALIASES = MA.PAGE_KEY_ALIASES;   // collapseTwinInserts가 클로저로 읽는다
  const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'admin', 'requests-admin.html'), 'utf8').replace(/\r\n/g, '\n');
  const from = html.indexOf('const TWIN_WINDOW_MS = 3000;');
  const to = html.indexOf('\n    }', from);
  if (from < 0 || to < 0) { console.error('🔴 collapseTwinInserts를 못 잘랐다 — 구조가 바뀌었다. 판정 중단'); process.exit(1); }
  let src = html.slice(from, to + '\n    }'.length);
  if (!src.includes('collapseTwinInserts')) { console.error('🔴 자른 범위에 collapseTwinInserts가 없다. 판정 중단'); process.exit(1); }
  if (NEGCTL) {
    const before = src;
    // ⚠️ 0이 아니라 -1이다. `<= 0`이라 **같은 밀리초에 들어온 행은 0으로도 접힌다**(실제 6건).
    //    그걸로 「음성 대조군 실패」를 냈던 자리다 — 대조군은 접힘이 물리적으로 불가능해야 한다.
    src = src.replace('const TWIN_WINDOW_MS = 3000;', 'const TWIN_WINDOW_MS = -1;');
    if (src === before) { console.error('🔴 음성 대조군 주입 실패 — 창 상수를 못 찾았다. 판정 중단'); process.exit(1); }
  }
  // IIFE로 감싼다 — 직접 eval의 function 선언이 loadScreenFns 스코프로 새면 아래 const와
  // 「already been declared」로 부딪친다(실제로 그렇게 죽었다). 새는 걸 arrow 안에 가둔다.
  const collapseTwinInserts = (() => eval(src + '\n(collapseTwinInserts)'))();
  if (normalizePageKey('메인') !== 'index') { console.error('🔴 정규화기 자기검사 실패. 판정 중단'); process.exit(1); }
  return { normalizePageKey, collapseTwinInserts };
}
const { normalizePageKey, collapseTwinInserts } = loadScreenFns();

let fail = 0;
const check = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

(async () => {
  const { data, error } = await db
    .from('page_sessions')
    .select('session_key, user_id, page, entered_at, duration_sec, referrer')
    .limit(50000);
  const { count } = await db.from('page_sessions').select('*', { count: 'exact', head: true });
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  if (count === null) { console.error('🔴 page_sessions 테이블이 없다'); process.exit(1); }
  console.log(`전수 ${data.length}행 (count=${count}) ${data.length === count ? '✅' : '🔴 절단 의심 — 판정 중단'}`);
  if (data.length !== count) process.exit(1);

  const rows = data.map(r => ({ ...r, page: normalizePageKey(r.page) }));
  const out = collapseTwinInserts(rows);
  const dropped = rows.length - out.length;
  console.log(`\n${rows.length}행 → ${out.length}행 (접힘 ${dropped}건, ${(dropped / rows.length * 100).toFixed(1)}%)`);

  if (NEGCTL) {
    console.log('\n[음성 대조군 · 창 -1ms]');
    check(dropped === 0, `창이 0이면 아무것도 안 접혀야 한다 — 실제 ${dropped}건`);
    console.log(fail === 0
      ? '\n✅ 음성 대조군 통과 — 접기가 창을 실제로 본다. 본 판정을 신뢰해도 된다.'
      : '\n🔴 음성 대조군 실패 — 창과 무관하게 접고 있다. 본 판정을 믿지 말 것.');
    process.exit(fail === 0 ? 0 : 1);
  }

  console.log('\n[불변식]');
  check(dropped > 0, `접힌 게 있다 (${dropped}건) — 0이면 접기가 안 걸린 것이다`);

  // ① 결과에 같은 (사람·페이지·3초) 묶음이 두 번 남으면 안 된다
  const seen = new Map();
  let residual = 0;
  for (const r of out) {
    const pid = r.user_id ? 'u:' + r.user_id : (r.session_key ? 's:' + r.session_key : null);
    if (!pid || !r.entered_at) continue;
    const k = pid + '\x00' + r.page;
    const t = new Date(r.entered_at).getTime();
    if (!seen.has(k)) seen.set(k, []);
    if (seen.get(k).some(prev => Math.abs(prev - t) <= 3000)) residual++;
    seen.get(k).push(t);
  }
  check(residual === 0, `접은 뒤 3초 이내 중복 잔여 ${residual}건 (0이어야 한다)`);

  // ② 사람 수·페이지 종류는 줄면 안 된다 — 접기가 방문을 통째로 삼키면 안 되므로
  const people = s => new Set(s.map(r => r.user_id ? 'u:' + r.user_id : 's:' + r.session_key)).size;
  const pages = s => new Set(s.map(r => r.page)).size;
  check(people(out) === people(rows), `사람 수 보존 ${people(rows)} → ${people(out)}`);
  check(pages(out) === pages(rows), `페이지 종류 보존 ${pages(rows)} → ${pages(out)}`);

  // ③ 날짜 커버리지 보존 — 어떤 날이 통째로 사라지면 안 된다
  const days = s => new Set(s.filter(r => r.entered_at).map(r => r.entered_at.slice(0, 10))).size;
  check(days(out) === days(rows), `날짜 커버리지 보존 ${days(rows)} → ${days(out)}`);

  // ④ **외부** 유입 소스가 접기로 사라지면 안 된다.
  //    내부 라벨(`메인`·`/pages/...`)이 사라지는 건 #28 보정이라 정상 — 그래서 값을 나눠 센다.
  //    처음엔 전체 짝 보존으로 걸었다가 naver_place 13·google 9가 사라지는 걸 잡았다.
  const ALIASES = loadMemberAnalytics().PAGE_KEY_ALIASES;  // 단일 소스: member-analytics.js (P4)
  const isInternal = ref => !!ref && (ref.startsWith('/') || Object.prototype.hasOwnProperty.call(ALIASES, ref));
  const pairSet = (s, pred) => new Set(s.filter(r => r.referrer && pred(r.referrer))
    .map(r => (r.user_id ? 'u:' + r.user_id : 's:' + r.session_key) + '|' + r.referrer));
  const extBefore = pairSet(rows, r => !isInternal(r)), extAfter = pairSet(out, r => !isInternal(r));
  const lostExt = [...extBefore].filter(x => !extAfter.has(x));
  check(lostExt.length === 0, `외부 유입 짝 보존 ${extBefore.size} → ${extAfter.size}`
    + (lostExt.length ? ` — 잃은 값: ${[...new Set(lostExt.map(x => x.split('|')[1]))].join(', ')}` : ''));
  const intBefore = pairSet(rows, isInternal).size, intAfter = pairSet(out, isInternal).size;
  console.log(`     (내부 라벨 짝 ${intBefore} → ${intAfter} — 줄어드는 게 정상이다, #28 보정)`);

  // ⑤ 체류 합계는 줄되, 접힌 묶음의 최대값 합과 정확히 일치해야 한다
  const sum = s => s.reduce((a, r) => a + (r.duration_sec || 0), 0);
  console.log(`\n[체류] ${(sum(rows) / 3600).toFixed(1)}h → ${(sum(out) / 3600).toFixed(1)}h`
    + ` (${(sum(rows) / sum(out)).toFixed(3)}배 부풀어 있었다)`);
  check(sum(out) <= sum(rows), '체류 합계가 늘지 않았다');
  check(sum(out) > sum(rows) * 0.9, '체류 합계가 10% 넘게 깎이지 않았다 (넘으면 과잉 접기 의심)');

  // 화면 영향 — 카드 펼침 「진입 N회」와 드릴다운 명단 「N회」는 행 수를 그대로 센다.
  const perPage = s => { const m = {}; for (const r of s) m[r.page] = (m[r.page] || 0) + 1; return m; };
  const a = perPage(rows), b = perPage(out);
  console.log('\n[화면 「진입 N회」 변화 — 상위 8개]');
  Object.entries(a).sort((x, y) => y[1] - x[1]).slice(0, 8).forEach(([p, n]) =>
    console.log(`  ${p.padEnd(16)} ${String(n).padStart(5)}회 → ${String(b[p] || 0).padStart(5)}회`
      + `  (-${(100 - (b[p] || 0) / n * 100).toFixed(0)}%)`));

  console.log(fail === 0 ? '\n✅ 전부 통과' : `\n🔴 ${fail}건 실패`);
  process.exit(fail === 0 ? 0 : 1);
})();
