// §0 시작점 1번 — iframe 3배 계상 수정(46619f62, 2026-07-21 19:00)의 사후 확인. 읽기 전용.
//
//   node scripts/verify-iframe-rows.js [--negctl] [--since 2026-07-21T19:00:00+09:00]
//
// 묻는 것 하나: **홈 방문 1회가 page_sessions 1행인가?**
// 증상(수정 전)은 "같은 session_key에서 **같은 초에** index·game-reviews·club-schedule 3행".
// 수정 후 구간에서 그 동시묶음이 0이어야 한다.
//
// 🚨 --negctl을 먼저 돌릴 것 — 수정 **이전** 구간을 같은 판정기로 재서 🔴가 뜨는지 본다.
//    이전 구간에서도 0이 나오면 판정기가 고장 난 것이고, "통과"는 아무 의미가 없다.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = { location: { hostname: 'cottageboard.co.kr' } };
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const argv = process.argv.slice(2);
const NEGCTL = argv.includes('--negctl');
const sinceArg = argv.includes('--since') ? argv[argv.indexOf('--since') + 1] : null;
const FIX_AT = new Date(sinceArg || '2026-07-21T19:00:18+09:00');

// index.html이 iframe으로 미리 로드하는 페이지들 (PROJECT_STRUCTURE §2-A ⑦)
const FRAME_PAGES = ['game-reviews', 'club-schedule'];

(async () => {
  const { data, error } = await db
    .from('page_sessions')
    .select('session_key, user_id, page, entered_at, duration_sec')
    .limit(50000);
  const { count } = await db.from('page_sessions').select('*', { count: 'exact', head: true });
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  if (count === null) { console.error('🔴 page_sessions 테이블이 없다'); process.exit(1); }
  console.log(`전수 ${data.length}행 (count=${count}) ${data.length === count ? '✅' : '🔴 절단 의심 — 판정 중단'}`);
  if (data.length !== count) process.exit(1);

  const rows = data.filter(r => r.entered_at);
  const after = rows.filter(r => new Date(r.entered_at) >= FIX_AT);
  const before = rows.filter(r => new Date(r.entered_at) < FIX_AT);
  const target = NEGCTL ? before : after;
  const label = NEGCTL ? `수정 이전(음성 대조군, ~${FIX_AT.toISOString()})` : `수정 이후(${FIX_AT.toISOString()}~)`;

  console.log(`\n=== 판정 구간: ${label} — ${target.length}행 ===`);
  if (!NEGCTL && after.length === 0) {
    console.log('⚪ 수정 이후로 들어온 행이 0건이다. 데이터가 아직 없어 판정 불가 — 시간이 더 지나야 한다.');
    console.log(`   (참고: 가장 최근 행 = ${rows.map(r => r.entered_at).sort().slice(-1)[0]})`);
    process.exit(0);
  }

  // ── 같은 session_key + 같은 초에 들어온 묶음 ────────────────────
  const bucket = new Map();
  for (const r of target) {
    const sec = new Date(r.entered_at).toISOString().slice(0, 19); // 초 단위
    const k = `${r.session_key}|${sec}`;
    if (!bucket.has(k)) bucket.set(k, []);
    bucket.get(k).push(r);
  }
  const multi = [...bucket.entries()].filter(([, v]) => v.length > 1);
  const withFrame = multi.filter(([, v]) => {
    const pages = new Set(v.map(r => r.page));
    return pages.has('index') && FRAME_PAGES.some(p => pages.has(p));
  });

  console.log(`동시(같은 초) 묶음: ${multi.length}건 / 전체 묶음 ${bucket.size}건`);
  console.log(`그중 index + 프레임 페이지가 함께 들어온 것: ${withFrame.length}건`);
  withFrame.slice(0, 10).forEach(([k, v]) =>
    console.log(`  🔴 ${k}  →  ${v.map(r => r.page).join(', ')}`));

  // ── 페이지별 행 수 (유령이 걷혔는지 눈으로) ──────────────────────
  const byPage = {};
  for (const r of target) byPage[r.page] = (byPage[r.page] || 0) + 1;
  console.log('\n페이지별 행 수:');
  Object.entries(byPage).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([p, n]) => console.log(`  ${String(n).padStart(5)}  ${p}`));

  console.log();
  if (NEGCTL) {
    console.log(withFrame.length > 0
      ? `✅ 음성 대조군 통과 — 판정기가 수정 이전 구간에서 ${withFrame.length}건을 실제로 잡는다. 본 판정을 신뢰해도 된다.`
      : '🔴 음성 대조군 실패 — 알려진 증상 구간에서도 0건이다. 판정기가 고장 났으므로 "통과"를 믿지 말 것.');
  } else {
    console.log(withFrame.length === 0
      ? '✅ 수정 이후 구간에 iframe 동시 3행 묶음 0건 — 홈 방문 1회 = 1행.'
      : `🔴 아직 ${withFrame.length}건 남아 있다 — 수정이 안 먹었거나 배포가 그 시각 이후다.`);
  }
  process.exit(0);
})();
