// #27 검증 — 「비회원 = 세션이 형성된 접속」 규칙의 효과와 안전성 (읽기 전용)
//
//   node scripts/verify-anon-definition.js
//
// requests-admin.html renderCharts의 판정을 **그대로 복제**해 옛 규칙과 대조한다.
// 🚨 "통과"를 믿기 전에 음성 대조군을 먼저 본다 — 규칙을 무력화했을 때 차이가 0이 되지
//    않으면 이 스크립트가 복제에 실패한 것이다(CLAUDE.md 「검사기를 먼저 의심한다」).
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const ADMIN_UID = '4916417947';
const iso = d => new Date(Date.now() - d * 86400000).toISOString();
const kstDay = s => new Date(new Date(s).getTime() + 9 * 3600000).toISOString().slice(0, 10);
const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

let fail = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? '✅' : '🔴 FAIL'} ${msg}`); if (!cond) fail++; };

(async () => {
  // 화면과 같은 조회를 재현한다 (getPageAnalytics = page_sessions 90일)
  const [psR, pvR, anR] = await Promise.all([
    db.from('page_sessions').select('page, user_id, session_key, duration_sec, entered_at')
      .gte('entered_at', iso(90)).order('entered_at', { ascending: false }).limit(20000),
    db.from('page_views').select('page, created_at, referrer, is_bot, user_id, session_key')
      .order('created_at', { ascending: false }).limit(10000),
    db.from('anon_sessions').select('session_key, last_seen_at')
      .order('last_seen_at', { ascending: false }).limit(500),
  ]);
  for (const [n, r] of [['page_sessions', psR], ['page_views', pvR], ['anon_sessions', anR]]) {
    if (r.error) { console.error(`🔴 [${n}]`, r.error); process.exit(1); }
    if (r.data.length === 1000) console.warn(`⚠️ [${n}] 정확히 1000행 = 절단 의심`);
  }
  const rows = psR.data.filter(r => String(r.user_id || '') !== ADMIN_UID);
  const pageViews = pvR.data.filter(r => String(r.user_id || '') !== ADMIN_UID);
  const anonSessions = anR.data;
  console.log(`적재: page_sessions ${rows.length} · page_views ${pageViews.length} · anon_sessions ${anonSessions.length}\n`);

  // ── 화면 로직 복제 ────────────────────────────────────────
  const visitorRowsAll = pageViews.filter(r => r.page === '__visitor__');
  const _sessionKeys = new Set();
  for (const r of rows) if (r.session_key) _sessionKeys.add(r.session_key);
  for (const a of anonSessions) if (a.session_key) _sessionKeys.add(a.session_key);
  const _sessionWindowStart = rows.reduce((m, r) => (r.entered_at && r.entered_at < m ? r.entered_at : m), '9999');

  // enabled=false 가 음성 대조군 — 규칙을 끄면 옛 동작과 같아져야 한다
  const makeHasSession = enabled => r =>
    !enabled || !!r.user_id || !r.session_key || r.created_at < _sessionWindowStart || _sessionKeys.has(r.session_key);

  const visitorKey = (r, i) => r.user_id ? `user:${r.user_id}` : (r.session_key ? `anon:${r.session_key}` : `bd:legacy:${i}`);
  function screen(enabled, filterFn = () => true) {
    const has = makeHasSession(enabled);
    const vis = visitorRowsAll.filter(r => !r.is_bot && has(r)).filter(filterFn);
    const bots = visitorRowsAll.filter(r => r.is_bot || !has(r)).filter(filterFn);
    const m = new Set(), g = new Set();
    vis.forEach((r, i) => (r.user_id ? m : g).add(visitorKey(r, i)));
    return { total: vis.length, member: m.size, guest: g.size, bot: bots.length };
  }
  const today = r => kstDay(r.created_at) === todayKst;
  const d7 = (() => { const c = iso(7); return r => r.created_at >= c; })();

  console.log('=== ① 화면 값 — 옛 규칙 vs 새 규칙 ===');
  for (const [label, f] of [['오늘', today], ['최근 7일', d7], ['전 기간', () => true]]) {
    const o = screen(false, f), n = screen(true, f);
    console.log(`  [${label}]`);
    console.log(`     옛: 총 ${o.total}회 · 회원 ${o.member}명 · 비회원 ${o.guest}명 · 봇 ${o.bot}회`);
    console.log(`     새: 총 ${n.total}회 · 회원 ${n.member}명 · 비회원 ${n.guest}명 · 봇·자동 ${n.bot}회`);
  }

  console.log('\n=== ② 음성 대조군 — 규칙을 끄면 옛 값과 같아지는가 ===');
  const offA = screen(false), offB = screen(false);
  ok(JSON.stringify(offA) === JSON.stringify(offB), '규칙 off는 결정적(동일 입력 동일 출력)');
  const on = screen(true);
  ok(JSON.stringify(on) !== JSON.stringify(offA),
    `규칙 on/off가 실제로 다른 값을 낸다 (안 다르면 이 검사기가 규칙을 복제 못 한 것) — 비회원 ${offA.guest}→${on.guest}`);

  console.log('\n=== ③ 불변식 ===');
  for (const [label, f] of [['오늘', today], ['최근 7일', d7], ['전 기간', () => true]]) {
    const o = screen(false, f), n = screen(true, f);
    ok(n.guest <= o.guest, `[${label}] 비회원은 늘지 않는다 (필터는 빼기만 한다): ${o.guest} → ${n.guest}`);
    ok(n.member === o.member, `[${label}] 회원 수는 안 바뀐다 (회원 마커는 판정 면제): ${o.member} → ${n.member}`);
    ok(n.bot >= o.bot, `[${label}] 봇·자동은 줄지 않는다: ${o.bot} → ${n.bot}`);
    ok(n.total + n.bot === o.total + o.bot, `[${label}] 마커 총 행 수 보존 (사라진 행 없음): ${n.total}+${n.bot} = ${o.total}+${o.bot}`);
  }

  console.log('\n=== ④ legacy 보존 — 판정 근거 없는 과거 데이터가 봇으로 밀리지 않는가 ===');
  const legacy = visitorRowsAll.filter(r => !r.session_key && !r.is_bot);
  const has = makeHasSession(true);
  ok(legacy.every(has), `session_key 없는 legacy 마커 ${legacy.length}건 전부 사람으로 유지`);
  const oldWin = visitorRowsAll.filter(r => r.session_key && !r.is_bot && r.created_at < _sessionWindowStart);
  ok(oldWin.every(has), `세션 표(90일) 창 밖 마커 ${oldWin.length}건 전부 사람으로 유지 (창 시작 ${_sessionWindowStart.slice(0, 10)})`);

  console.log('\n=== ⑤ 걸러진 것이 실제로 자동 접속인가 (표본) ===');
  const dropped = visitorRowsAll.filter(r => !r.is_bot && !has(r));
  console.log(`  걸러진 ${dropped.length}건 · 유입 있는 것 ${dropped.filter(r => r.referrer).length}건 · 회원 마커 ${dropped.filter(r => r.user_id).length}건`);
  ok(dropped.every(r => !r.user_id), '걸러진 것 중 회원 마커 0건');

  console.log(`\n${fail === 0 ? '✅ 전부 통과' : `🔴 ${fail}건 실패`}`);
  process.exit(0);
})();
