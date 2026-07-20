// #27 후속 — 「고아 마커」 11건의 정체 확인 (읽기 전용)
//
//   node scripts/probe-orphan-markers.js
//
// 고아 = page_views.__visitor__ 마커는 있는데 anon_sessions·page_sessions 어디에도
//        같은 session_key가 없는 접속.
//
// 🚨 앞선 스크립트의 ③ 지표는 **틀렸다** — trackPageView가 모든 행에 session_key를 넣으므로
//    (supabase-client.js:234) 「1행만 남긴 키」가 마커가 아닌 일반 페이지 행까지 세고 있었다.
//    여기서는 마커 행과 일반 행을 분리해서 센다.
//
// 가르려는 두 가설:
//   (가) 크롤러/프리뷰봇 — DOMContentLoaded 마커는 남기지만 500ms 뒤 _startAnonHeartbeat 전에
//        페이지가 죽는다. 서명: 행이 2개 이하(마커+첫 페이지), 전부 같은 밀리초대, referrer 없음,
//        같은 키가 다시는 안 나타남, 시각이 몰려 있음.
//   (나) 사람인데 즉시 이탈 — 서명: 여러 페이지를 훑었거나, 시각이 흩어져 있거나, 나중에 재등장.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const kstDay = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
const kstTime = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(11, 23);

(async () => {
  const { data: pv, error: e1 } = await db.from('page_views')
    .select('page, created_at, referrer, is_bot, user_id, session_key').limit(50000);
  const { data: anon, error: e2 } = await db.from('anon_sessions').select('session_key').limit(50000);
  const { data: ps, error: e3 } = await db.from('page_sessions').select('session_key, user_id, page, entered_at').limit(50000);
  const { data: ev, error: e4 } = await db.from('page_events').select('session_key, event_type, created_at').limit(50000);
  for (const [n, e] of [['page_views', e1], ['anon_sessions', e2], ['page_sessions', e3], ['page_events', e4]]) {
    if (e) { console.error(`🔴 [${n}]`, e); process.exit(1); }
  }
  console.log(`적재: page_views ${pv.length} · anon_sessions ${anon.length} · page_sessions ${ps.length} · page_events ${ev.length}`);

  const anonKeys = new Set(anon.map(a => a.session_key));
  const psKeys = new Set(ps.filter(r => r.session_key).map(r => r.session_key));
  const evKeys = new Set(ev.filter(r => r.session_key).map(r => r.session_key));

  const markers = pv.filter(r => r.page === '__visitor__' && !r.is_bot && !r.user_id && r.session_key);
  const orphanMarkers = markers.filter(r => !anonKeys.has(r.session_key) && !psKeys.has(r.session_key));

  // 키별 page_views 행을 마커/일반으로 분리
  const rowsByKey = new Map();
  for (const r of pv) {
    if (!r.session_key) continue;
    if (!rowsByKey.has(r.session_key)) rowsByKey.set(r.session_key, []);
    rowsByKey.get(r.session_key).push(r);
  }

  console.log(`\n=== 고아 마커 ${orphanMarkers.length}건 상세 ===`);
  const sorted = orphanMarkers.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const m of sorted) {
    const all = (rowsByKey.get(m.session_key) || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const pages = all.filter(r => r.page !== '__visitor__');
    const spanMs = all.length > 1
      ? new Date(all[all.length - 1].created_at) - new Date(all[0].created_at) : 0;
    console.log(
      `  ${kstDay(m.created_at)} ${kstTime(m.created_at)} KST` +
      ` | key ${m.session_key.slice(0, 12)}…` +
      ` | page_views ${all.length}행(마커 ${all.length - pages.length} + 페이지 ${pages.length})` +
      ` | 전체 시간폭 ${(spanMs / 1000).toFixed(1)}s` +
      ` | ref ${m.referrer || '(없음)'}` +
      ` | 이벤트 ${evKeys.has(m.session_key) ? '있음' : '없음'}`
    );
    if (pages.length) console.log(`        본 페이지: ${pages.map(p => `${p.page}@${kstTime(p.created_at)}`).join(', ')}`);
  }

  // 대조군 — 같은 날 고아가 아닌 비회원 마커는 어떻게 생겼나
  const days = [...new Set(sorted.map(m => kstDay(m.created_at)))];
  console.log(`\n=== 대조군 — 같은 날(${days.join(',')}) 고아가 아닌 비회원 마커 ===`);
  const control = markers.filter(m =>
    days.includes(kstDay(m.created_at)) && (anonKeys.has(m.session_key) || psKeys.has(m.session_key)));
  for (const m of control.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const all = (rowsByKey.get(m.session_key) || []);
    const pages = all.filter(r => r.page !== '__visitor__');
    const spanMs = all.length > 1
      ? Math.max(...all.map(r => +new Date(r.created_at))) - Math.min(...all.map(r => +new Date(r.created_at))) : 0;
    console.log(
      `  ${kstTime(m.created_at)} | key ${m.session_key.slice(0, 12)}…` +
      ` | page_views ${all.length}행(페이지 ${pages.length}) | 시간폭 ${(spanMs / 1000).toFixed(1)}s` +
      ` | ref ${m.referrer || '(없음)'} | anon_sessions ${anonKeys.has(m.session_key) ? '○' : '✗'}` +
      ` | 이벤트 ${evKeys.has(m.session_key) ? '있음' : '없음'}`
    );
  }

  // 마커 간 간격 — 몰려 있으면 자동화 서명
  console.log('\n=== 고아 마커 발생 간격 (자동화면 규칙적/집중) ===');
  for (let i = 1; i < sorted.length; i++) {
    const gap = (new Date(sorted[i].created_at) - new Date(sorted[i - 1].created_at)) / 1000;
    console.log(`  ${kstTime(sorted[i].created_at)}  직전 대비 +${gap.toFixed(1)}s`);
  }

  process.exit(0);
})();
