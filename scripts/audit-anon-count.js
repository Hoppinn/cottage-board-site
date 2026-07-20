// #27 「비회원 N명」 집계 기준 불일치 — 실측 (읽기 전용, DB 무변경)
//
//   node scripts/audit-anon-count.js
//
// 🚨 착수 첫 동작은 가설이 아니라 「지금 숫자를 다시 재는 것」이다(admin-analytics §4 원리 4).
//    대장의 「오늘 마커 14개 중 11개가 고아」는 2026-07-20 값이고, 낡았을 수 있다.
//
// 재는 것:
//   ① 두 화면이 실제로 무엇을 세는가 — 요약/방문 탭(page_views.__visitor__)  vs  회원 탭(anon_sessions)
//   ② 고아 마커(마커는 있는데 anon_sessions·page_sessions 어디에도 없는 session_key) 비율
//   ③ 고아의 정체 — 「그 session_key가 평생 한 번만 등장하는가」(= 매번 새 localStorage = 크롤러 서명)
//   ④ 날짜별 추이 — 급변이 사실인지. ⚠️ 추이는 원인의 증거가 아니다(대장 #27 주석)
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const kstDay = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

// 절단/RLS 판정 — 행 수 자체가 거짓말한다(CLAUDE.md). count:'exact'와 대조하기 전엔 결론 금지.
async function fetchAll(table, cols, tweak = q => q) {
  const { data, error } = await tweak(db.from(table).select(cols).limit(50000));
  const { count, error: cErr } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) { console.error(`🔴 [${table}] SELECT`, error); return null; }
  if (cErr) console.error(`🔴 [${table}] count`, cErr);
  const got = data.length;
  let flag = '';
  if (got === 1000) flag = ' 🔴 정확히 1000 = max-rows 절단 의심';
  else if (got === 0) flag = count === null ? ' 🔴 테이블 없음' : ' 🔴 0행 = RLS 의심';
  console.log(`  ${table}: 조회 ${got}행 / 전체 count ${count}${flag}`);
  return data;
}

(async () => {
  console.log('=== 0. 소스 적재 (절단/RLS 대조) ===');
  const pv = await fetchAll('page_views', 'page, created_at, referrer, is_bot, user_id, session_key');
  const anon = await fetchAll('anon_sessions', 'session_key, first_seen_at, last_seen_at, visit_count, today_date, today_seconds');
  const ps = await fetchAll('page_sessions', 'page, user_id, session_key, duration_sec, entered_at');
  if (!pv || !anon || !ps) { console.error('적재 실패 — 중단'); process.exit(1); }

  // ── ① 두 화면이 세는 것 ─────────────────────────────────────
  // 요약/방문 탭: __visitor__ 마커, 봇 제외, user_id 없는 것 = 비회원. visitorKey = anon:{session_key}
  const markers = pv.filter(r => r.page === '__visitor__');
  const anonMarkers = markers.filter(r => !r.is_bot && !r.user_id);
  const todayAnonMarkers = anonMarkers.filter(r => kstDay(r.created_at) === todayKst);

  const keyOf = (r, i) => r.session_key ? `anon:${r.session_key}` : `legacy:${i}`;
  const todayScreenA = new Set(todayAnonMarkers.map(keyOf)).size;
  const allScreenA = new Set(anonMarkers.map(keyOf)).size;

  // 회원 탭: anon_sessions 행 수 (전 기간, 브라우저당 1행 — 날짜 개념 없음)
  const screenB = anon.length;

  console.log('\n=== ① 두 화면이 각각 무엇을 세는가 ===');
  console.log(`  요약/방문 탭 「비회원」= page_views.__visitor__ 중 봇·회원 제외, session_key 고유`);
  console.log(`      오늘(${todayKst}): ${todayScreenA}명   전 기간: ${allScreenA}명   (오늘 마커 행 ${todayAnonMarkers.length}회)`);
  console.log(`  회원 탭 「비회원」= anon_sessions 행 수 (브라우저당 1행, 전 기간 고정)`);
  console.log(`      ${screenB}명`);

  // ── ② 고아 마커 ──────────────────────────────────────────
  const anonKeys = new Set(anon.map(a => a.session_key));
  const psKeys = new Set(ps.filter(r => r.session_key).map(r => r.session_key));
  const classify = rows => {
    const o = { total: 0, noKey: 0, inAnon: 0, inPsOnly: 0, orphan: 0, orphanKeys: new Set() };
    for (const r of rows) {
      o.total++;
      if (!r.session_key) { o.noKey++; continue; }
      if (anonKeys.has(r.session_key)) o.inAnon++;
      else if (psKeys.has(r.session_key)) o.inPsOnly++;
      else { o.orphan++; o.orphanKeys.add(r.session_key); }
    }
    return o;
  };
  const cToday = classify(todayAnonMarkers);
  const cAll = classify(anonMarkers);
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
  console.log('\n=== ② 마커가 세션 표에 존재하는가 ===');
  for (const [label, c] of [[`오늘 ${todayKst}`, cToday], ['전 기간', cAll]]) {
    console.log(`  [${label}] 마커 ${c.total}행 · key없음(legacy) ${c.noKey}`);
    console.log(`      anon_sessions에 있음   ${c.inAnon} (${pct(c.inAnon, c.total)})`);
    console.log(`      page_sessions에만 있음 ${c.inPsOnly} (${pct(c.inPsOnly, c.total)})`);
    console.log(`      🚨 고아(어디에도 없음)  ${c.orphan} (${pct(c.orphan, c.total)}) · 고유키 ${c.orphanKeys.size}`);
  }

  // ── ③ 고아의 정체 — 방문한 날 수 + 유입 ──────────────────────
  // ⚠️ 이 자리에 처음 넣었던 「page_views 전체에서 1행만 남긴 키」 지표는 **틀렸다**.
  //    trackPageView가 마커든 일반 페이지든 **모든 행에 session_key를 넣으므로**
  //    (supabase-client.js:234) 한 번 들른 사람도 항상 2행 이상이 되어 고아·대조군이
  //    똑같이 0%로 나왔다. 지표가 아니라 상수였다.
  //    → 재등장 여부는 **마커 행만** 세야 한다(마커는 브라우저·일 단위로 1개다).
  const markerDays = new Map(); // session_key → 마커를 남긴 서로 다른 날 수
  for (const r of anonMarkers) {
    if (!r.session_key) continue;
    if (!markerDays.has(r.session_key)) markerDays.set(r.session_key, new Set());
    markerDays.get(r.session_key).add(kstDay(r.created_at));
  }
  const orphanAll = [...cAll.orphanKeys];
  const onceOnly = orphanAll.filter(k => (markerDays.get(k)?.size || 0) === 1).length;
  console.log('\n=== ③ 고아 session_key가 다시 오는가 (마커 행 기준) ===');
  console.log(`  고아 고유키 ${orphanAll.length}개 중 단 하루만 등장: ${onceOnly} (${pct(onceOnly, orphanAll.length)})`);
  console.log(`    → 100%면 「매 접속마다 새 localStorage」 = 크롤러/프리뷰봇 서명`);
  console.log(`    → 사람이 500ms 안에 이탈한 것이라면 재방문 시 같은 key로 다시 나타나야 한다`);

  // 대조군: 고아가 아닌 비회원 키는 며칠에 걸쳐 나타나나
  const nonOrphanKeys = [...new Set(anonMarkers.filter(r => r.session_key && !cAll.orphanKeys.has(r.session_key)).map(r => r.session_key))];
  const nonOnce = nonOrphanKeys.filter(k => (markerDays.get(k)?.size || 0) === 1).length;
  console.log(`  [대조군] 고아 아닌 비회원 키 ${nonOrphanKeys.length}개 중 하루만: ${nonOnce} (${pct(nonOnce, nonOrphanKeys.length)})`);

  const refCount = rows => {
    const m = new Map();
    for (const r of rows) m.set(r.referrer || '(direct)', (m.get(r.referrer || '(direct)') || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const orphanRows = anonMarkers.filter(r => r.session_key && cAll.orphanKeys.has(r.session_key));
  const realRows = anonMarkers.filter(r => r.session_key && !cAll.orphanKeys.has(r.session_key));
  console.log(`  고아 유입:   ${JSON.stringify(refCount(orphanRows))}`);
  console.log(`  비고아 유입: ${JSON.stringify(refCount(realRows))}`);

  // ── ④ 날짜별 추이 ────────────────────────────────────────
  console.log('\n=== ④ 날짜별 (최근 14일) — 마커 vs 고아 ===');
  const byDay = new Map();
  for (const r of anonMarkers) {
    const d = kstDay(r.created_at);
    if (!byDay.has(d)) byDay.set(d, { total: 0, orphan: 0 });
    const o = byDay.get(d); o.total++;
    if (r.session_key && cAll.orphanKeys.has(r.session_key)) o.orphan++;
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  for (const [d, o] of days) {
    console.log(`  ${d}  마커 ${String(o.total).padStart(3)}  고아 ${String(o.orphan).padStart(3)} (${pct(o.orphan, o.total)})  ${'█'.repeat(Math.round(o.orphan / Math.max(1, o.total) * 20))}`);
  }

  // ── ⑤ anon_sessions 쪽 반대 방향 ─────────────────────────
  const markerKeys = new Set(anonMarkers.filter(r => r.session_key).map(r => r.session_key));
  const anonNoMarker = anon.filter(a => !markerKeys.has(a.session_key));
  console.log('\n=== ⑤ 반대 방향 — anon_sessions에 있는데 마커가 없는 키 ===');
  console.log(`  ${anonNoMarker.length} / ${anon.length} (${pct(anonNoMarker.length, anon.length)})`);
  console.log(`    (마커는 localStorage로 하루 1회 제한이라, 이튿날 이후 재방문 브라우저는 여기 쌓인다)`);

  process.exit(0);
})();
