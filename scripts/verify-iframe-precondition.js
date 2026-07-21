// verify-iframe-rows.js의 "0건"이 **판정인지 무증상인지**를 가르는 전제 측정. 읽기 전용.
//
//   node scripts/verify-iframe-precondition.js
//
// 왜 필요한가: iframe 3배 계상은 **로그인한 사람이 홈에 들어왔을 때만** 발동한다
// (index.html이 game-reviews·club-schedule을 미리 로드하는 게 kakao-auth-ready 이후라서).
// 그래서 판정 구간에 "로그인 상태의 index 방문"이 0건이면, withFrame 0건은 수정의 증거가
// 아니라 **표본이 없다**는 뜻이다. 여기서 재는 것은 딱 둘:
//   ① 수정 이전 구간에서 「로그인 index 방문」 중 몇 %가 실제로 🔴 묶음이었나 (=발동률)
//   ② 수정 이후 구간에 「로그인 index 방문」이 몇 건 있나 (=표본 수)
// ①이 높고 ②가 0이면 판정 불가. ①이 높고 ②가 충분한데 🔴가 0이면 그때 수정 확인이다.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = { location: { hostname: 'cottageboard.co.kr' } };
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const FIX_AT = new Date('2026-07-21T19:00:18+09:00');
const FRAME_PAGES = ['game-reviews', 'club-schedule'];

(async () => {
  const { data, error } = await db
    .from('page_sessions')
    .select('session_key, user_id, page, entered_at')
    .limit(50000);
  const { count } = await db.from('page_sessions').select('*', { count: 'exact', head: true });
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  if (count === null) { console.error('🔴 page_sessions 테이블이 없다'); process.exit(1); }
  console.log(`전수 ${data.length}행 (count=${count}) ${data.length === count ? '✅' : '🔴 절단 의심 — 판정 중단'}`);
  if (data.length !== count) process.exit(1);

  const rows = data.filter(r => r.entered_at);

  // ⚠️ 「같은 초」로만 묶으면 놓친다 — iframe은 부모보다 1~2초 늦게 로드될 수 있고,
  //    그러면 같은 방문인데 초가 갈려 판정기가 무증상으로 읽는다. 창을 ±TOL초로 넓힌다.
  const TOL = Number(process.env.TOL || 5);
  function measure(target, label) {
    const idx = target.filter(r => r.page === 'index');
    const idxLoggedIn = idx.filter(r => r.user_id);
    // session_key별 프레임 행 시각 목록
    const frameAt = new Map();
    for (const r of target) {
      if (!FRAME_PAGES.includes(r.page)) continue;
      if (!frameAt.has(r.session_key)) frameAt.set(r.session_key, []);
      frameAt.get(r.session_key).push(new Date(r.entered_at).getTime());
    }
    let firedIn = 0, firedAll = 0;
    for (const r of idx) {
      const t = new Date(r.entered_at).getTime();
      const near = (frameAt.get(r.session_key) || []).some(ft => Math.abs(ft - t) <= TOL * 1000);
      if (near) { firedAll++; if (r.user_id) firedIn++; }
    }
    console.log(`\n=== ${label} — ${target.length}행 ===`);
    console.log(`  index 방문 행         : ${idx.length}`);
    console.log(`  그중 로그인 상태      : ${idxLoggedIn.length}  ← 이게 표본 수다`);
    console.log(`  프레임 동반 묶음(전체): ${firedAll}`);
    console.log(`  프레임 동반 묶음(로그인): ${firedIn}`);
    if (idxLoggedIn.length) {
      const rate = (firedIn / idxLoggedIn.length * 100).toFixed(1);
      console.log(`  → 로그인 index 방문의 발동률: ${rate}%`);
      return { n: idxLoggedIn.length, rate: +rate };
    }
    console.log('  → 로그인 index 방문이 0건 = 발동률 계산 불가');
    return { n: 0, rate: null };
  }

  const before = measure(rows.filter(r => new Date(r.entered_at) < FIX_AT), '수정 이전');
  const after  = measure(rows.filter(r => new Date(r.entered_at) >= FIX_AT), '수정 이후');

  console.log('\n── 판정 ──');
  if (!before.rate) {
    console.log('🔴 이전 구간에서 발동을 아예 못 잡는다 — 판정기가 고장 났거나 증상 정의가 틀렸다. 여기서 멈출 것.');
    process.exit(0);
  }
  const p = before.rate / 100;
  // 발동률 p인데 표본 n건에서 우연히 0건일 확률 = (1-p)^n. 5% 아래로 떨어져야 "확인"이다.
  const needN = Math.ceil(Math.log(0.05) / Math.log(1 - p));
  const pMiss = Math.pow(1 - p, after.n);
  console.log(`이전 발동률 ${before.rate}% (로그인 index 방문 ${before.n}건 중)`);
  console.log(`판정에 필요한 표본: ${needN}건 / 현재 ${after.n}건`);
  console.log(`고쳐지지 않았는데 우연히 0건일 확률 ≈ ${(pMiss * 100).toFixed(1)}%`);
  console.log(after.n >= needN
    ? '✅ 수정 확인 — 표본이 충분하고 발동이 0건이다.'
    : `⚪ 판정 불가 — 표본 부족. 「로그인 상태의 홈 방문」이 ${needN}건 쌓인 뒤 다시 잴 것.`);
  console.log('   ※ 발동률이 100%가 아닌 이유: iframe 미리로드는 세션당 1회뿐이라(preloaded 플래그)');
  console.log('     같은 세션의 재방문 홈 조회는 애초에 프레임 행을 안 만든다. 낮은 게 정상이다.');
  process.exit(0);
})();
