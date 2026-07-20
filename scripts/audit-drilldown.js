// P3b 드릴다운 — 「이걸 한 사람들」 명단을 DB에서 직접 집계 (읽기 전용, DB 무변경)
//
//   node scripts/audit-drilldown.js
//
// 왜 필요한가: 드릴다운은 "화면의 숫자 N명"을 눌렀을 때 **정확히 N명**이 나와야 한다.
// 화면 코드와 이 스크립트는 **서로 다른 경로**로 같은 값을 내므로 교차 검증이 된다
// (P1 도달률에서 쓴 것과 같은 방식). 착수 첫 동작으로 숫자부터 다시 잰다(원리 4).
//
// 식별 규칙은 화면과 **반드시 같아야** 한다 — 다르면 명단과 집계가 조용히 갈린다(#15).
//   · 이벤트: user_id || session_key           (eventPersonId)
//   · 페이지: user_id || 'anon:'+session_key   (pageUniq 키의 사람 부분)
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const ADMIN_UID = '4916417947';
const iso = d => new Date(Date.now() - d * 86400000).toISOString();

// 화면의 EVENT_FAMILIES와 같은 목록 (여기 없으면 화면도 조회하지 않는다 — #13)
const EVENT_ALL_TYPES = [
  'home_meeting_main_click', 'home_meeting_planner_click', 'home_meeting_date_preview_click',
  'home_meeting_preview_card_click', 'home_meeting_week_nav', 'meeting_planner_bar_click',
  'meeting_profile_click',
  'home_record_main_click', 'home_record_more_click', 'home_record_write_click',
  'record_start', 'record_complete',
  'home_recommend_main_click', 'home_recommend_game_detail_click', 'home_recommend_all_click',
  'recommend_start', 'recommend_complete', 'recommend_game_click', 'hero_recommend_click',
  'signup_complete',
];

(async () => {
  // ── 절단/RLS 먼저 — 행 수 자체가 거짓말한다 ──────────────────────
  const evQ = await db.from('page_events').select('event_type, created_at, user_id, session_key')
    .in('event_type', EVENT_ALL_TYPES).gte('created_at', iso(3650));
  const evC = await db.from('page_events').select('*', { count: 'exact', head: true })
    .in('event_type', EVENT_ALL_TYPES).gte('created_at', iso(3650));
  const psQ = await db.from('page_sessions').select('page, user_id, session_key, duration_sec, entered_at')
    .gte('entered_at', iso(90)).limit(20000);
  const psC = await db.from('page_sessions').select('*', { count: 'exact', head: true }).gte('entered_at', iso(90));
  const prQ = await db.from('profiles').select('user_id, nickname, real_name');

  for (const [name, q, c] of [['page_events', evQ, evC], ['page_sessions', psQ, psC]]) {
    const got = (q.data || []).length, tot = c.count;
    const flag = q.error ? '🔴 ' + q.error.message
      : tot === null ? '🔴 count=null'
      : got < tot ? `🔴 절단 ${tot - got}행 누락`
      : got === 1000 ? '🟠 정확히 1000행 — 절단 의심'
      : '✅';
    console.log(`${name}: 받음 ${got} / 실존 ${tot}  ${flag}`);
  }
  if (evQ.error || psQ.error) process.exit(1);

  const events = (evQ.data || []).filter(e => String(e.user_id || '') !== ADMIN_UID);
  const sessions = (psQ.data || []).filter(r => String(r.user_id || '') !== ADMIN_UID);
  const nameOf = new Map((prQ.data || []).map(p => [String(p.user_id), p.nickname || p.real_name || String(p.user_id).slice(0, 8)]));

  // ── ① 이벤트별 「이걸 한 사람들」 ────────────────────────────────
  console.log('\n=== ① 이벤트 드릴다운 (전 기간) ===');
  const byType = new Map();
  for (const e of events) {
    const pid = e.user_id || e.session_key;
    if (!byType.has(e.event_type)) byType.set(e.event_type, { n: 0, people: new Map(), noId: 0 });
    const t = byType.get(e.event_type);
    t.n++;
    if (!pid) { t.noId++; continue; }
    const k = String(pid);
    if (!t.people.has(k)) t.people.set(k, { n: 0, isMember: !!e.user_id });
    t.people.get(k).n++;
    if (e.user_id) t.people.get(k).isMember = true;
  }
  const typeRows = [...byType.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [t, d] of typeRows) {
    const mem = [...d.people.values()].filter(p => p.isMember).length;
    console.log(`  ${t}: ${d.n}회 / ${d.people.size}명 (회원 ${mem} · 비회원 ${d.people.size - mem})${d.noId ? ` · 식별불가 ${d.noId}행` : ''}`);
  }
  // 명단 샘플 — 최다 이벤트 하나만 펼쳐 본다(화면 육안 대조용)
  if (typeRows.length) {
    const [t0, d0] = typeRows[0];
    const list = [...d0.people.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
    console.log(`  ↳ ${t0} 명단(상위 12):`);
    for (const [pid, p] of list) {
      console.log(`      ${p.isMember ? nameOf.get(pid) || '회원?' + pid : '비회원 ' + pid.slice(0, 8) + '…'} — ${p.n}회`);
    }
  }

  // ── ② 페이지별 「이걸 본 사람들」 ────────────────────────────────
  // 막대와 같은 규칙: (사람·페이지·날짜) 유니크가 막대값, 사람 수는 그 사람 집합의 크기.
  console.log('\n=== ② 페이지 드릴다운 (최근 90일) ===');
  const byPage = new Map();
  const seen = new Set();
  for (const r of sessions) {
    if (!r.page) continue;
    const pid = r.user_id ? String(r.user_id) : (r.session_key ? 'anon:' + r.session_key : null);
    if (!byPage.has(r.page)) byPage.set(r.page, { uniq: 0, sec: 0, people: new Map() });
    const p = byPage.get(r.page);
    p.sec += r.duration_sec || 0;
    if (pid) {
      if (!p.people.has(pid)) p.people.set(pid, { visits: 0, sec: 0 });
      p.people.get(pid).visits++;
      p.people.get(pid).sec += r.duration_sec || 0;
    }
    const day = (r.entered_at || '').slice(0, 10);
    const k = (pid || 'anon') + '|' + r.page + '|' + day;
    if (seen.has(k)) continue;
    seen.add(k);
    p.uniq++;
  }
  const pageRows = [...byPage.entries()].sort((a, b) => b[1].uniq - a[1].uniq).slice(0, 10);
  for (const [pg, d] of pageRows) {
    const mem = [...d.people.keys()].filter(k => !k.startsWith('anon:')).length;
    console.log(`  ${pg}: 막대 ${d.uniq} · ${d.people.size}명 (회원 ${mem} · 비회원 ${d.people.size - mem})`);
  }
  if (pageRows.length) {
    const [pg0, d0] = pageRows[0];
    const list = [...d0.people.entries()].sort((a, b) => b[1].sec - a[1].sec).slice(0, 10);
    console.log(`  ↳ ${pg0} 명단(상위 10):`);
    for (const [pid, p] of list) {
      const label = pid.startsWith('anon:') ? '비회원 ' + pid.slice(5, 13) + '…' : nameOf.get(pid) || '회원?' + pid;
      console.log(`      ${label} — ${p.visits}회 · ${p.sec}초`);
    }
  }

  // ── ③ 불변식 ────────────────────────────────────────────────────
  console.log('\n=== ③ 불변식 ===');
  let fail = 0;
  const ck = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };
  // 명단 인원 합 ≤ 건수 (한 사람이 여러 번 누르므로)
  ck(typeRows.every(([, d]) => d.people.size <= d.n), '이벤트: 명 ≤ 회');
  // 명단의 회 합 + 식별불가 = 총 건수 (아무도 안 새어야 한다)
  ck(typeRows.every(([, d]) => [...d.people.values()].reduce((s, p) => s + p.n, 0) + d.noId === d.n),
    '이벤트: 명단의 회 합 + 식별불가 = 총 건수');
  // 페이지: 사람별 방문 합 = 그 페이지 원본 행 수(식별불가 제외)
  ck(pageRows.every(([pg, d]) => {
    const raw = sessions.filter(r => r.page === pg && (r.user_id || r.session_key)).length;
    return [...d.people.values()].reduce((s, p) => s + p.visits, 0) === raw;
  }), '페이지: 명단의 방문 합 = 원본 행 수');
  // 사람 수 ≤ 막대값 * 은 성립 안 함(막대는 사람×날짜) → 사람 수 ≤ 막대값 확인
  ck(pageRows.every(([, d]) => d.people.size <= d.uniq), '페이지: 명 ≤ 막대값(사람·날짜 유니크)');

  console.log(fail ? `\n🔴 불변식 ${fail}건 실패` : '\n✅ 전부 통과');
  process.exit(0);
})();
