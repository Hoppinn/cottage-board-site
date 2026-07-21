// 홈 히어로 「최근 플레이」 미갱신 — 원인 실측 (읽기 전용, DB 무변경)
//
//   node scripts/probe-home-hero-recent.js
//
// 재는 것 (가설 검증이 아니라 숫자부터):
//   ① getAllPlayRecordsForHub(50)이 실제로 무엇을 어떤 순서로 돌려주는가
//      — index-page.js:1056 `records.find(r => r.review_text && r.photo_url) || records[0]`
//        이 뽑는 행이 정말 "가장 최신"인가
//   ② played_at NULL 행이 DESC 정렬 맨 앞을 점유하는가 (Postgres는 DESC에서 NULL FIRST)
//   ③ limit(50) 밖으로 밀렸는가 — count:'exact'와 대조
//   ④ 최근 기록의 review_text/photo_url 채움 상태 (게임평을 game_reviews에 썼을 가능성)
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const COLS = 'id, game_id, user_id, nickname, played_at, photo_url, review_text, created_at';
const cut = s => (s == null ? 'NULL' : String(s).slice(0, 19));
const has = s => (s && String(s).trim() ? '✓' : '·');

(async () => {
  // ── ③ 전체 행수 대조 (절단/RLS 판정) ──
  const { count, error: cErr } = await db.from('game_play_records')
    .select('*', { count: 'exact', head: true });
  console.log(`=== game_play_records 전체: ${cErr ? '🔴 ' + cErr.message : count + '행'} ===\n`);

  // ── ① 앱과 동일한 쿼리 ──
  const { data: hub, error } = await db.from('game_play_records').select(COLS)
    .order('played_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('🔴 getAllPlayRecordsForHub 재현 실패', error); process.exit(1); }
  console.log(`=== ① 앱 쿼리(played_at DESC, created_at DESC, limit 50) → ${hub.length}행 ===`);
  console.log('   #  played_at   created_at           평 사진  게임');
  hub.slice(0, 15).forEach((r, i) => {
    console.log(`  ${String(i).padStart(2)}  ${String(cut(r.played_at)).padEnd(11)} ${cut(r.created_at).padEnd(20)} ${has(r.review_text)}  ${has(r.photo_url)}   ${r.game_id}`);
  });

  const picked = hub.find(r => r.review_text?.trim() && r.photo_url?.trim()) || hub[0];
  console.log(`\n  → 화면이 고르는 행: id=${picked?.id} played_at=${cut(picked?.played_at)} created_at=${cut(picked?.created_at)} game=${picked?.game_id}`);

  // ── ② created_at 기준 진짜 최신 (정렬 무관) ──
  const { data: newest } = await db.from('game_play_records').select(COLS)
    .order('created_at', { ascending: false }).limit(10);
  console.log(`\n=== ② created_at DESC 기준 진짜 최신 10건 ===`);
  console.log('   #  played_at   created_at           평 사진  게임');
  (newest || []).forEach((r, i) => {
    console.log(`  ${String(i).padStart(2)}  ${String(cut(r.played_at)).padEnd(11)} ${cut(r.created_at).padEnd(20)} ${has(r.review_text)}  ${has(r.photo_url)}   ${r.game_id}`);
  });
  const inHub = new Set(hub.map(r => r.id));
  const missing = (newest || []).filter(r => !inHub.has(r.id));
  console.log(`  → 최신 10건 중 앱 쿼리 50행에 없는 것: ${missing.length}건` +
    (missing.length ? ` (id ${missing.map(r => r.id).join(', ')}) ← limit 밖으로 밀림` : ''));

  // ── played_at NULL 행수 ──
  const { count: nullCnt } = await db.from('game_play_records')
    .select('*', { count: 'exact', head: true }).is('played_at', null);
  console.log(`\n=== played_at NULL 행: ${nullCnt}건 ===` +
    (nullCnt ? ' ← DESC 정렬에서 맨 앞을 점유(Postgres NULLS FIRST)' : ''));

  // ── ④ game_reviews 최신 (게임평을 별 테이블에 썼는지) ──
  const { data: gr } = await db.from('game_reviews')
    .select('id, game_id, nickname, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(`\n=== ④ game_reviews 최신 5건 (별도 테이블) ===`);
  (gr || []).forEach(r => console.log(`  ${cut(r.created_at)}  ${r.nickname}  ${r.game_id}`));

  process.exit(0);
})();
