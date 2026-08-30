// 홈 히어로 「최근 플레이」 — 실코드 검증 (읽기 전용, DB 무변경)
//
//   node scripts/verify-home-hero-recent.js            정상 검증
//   node scripts/verify-home-hero-recent.js --negctl   음성 대조군 (기대값을 일부러 비틈)
//
// 🚨 --negctl을 먼저 돌려 그 줄에서만 🔴이 뜨는 걸 본 뒤에 「전부 통과」를 믿을 것.
//
// 무엇을 검증하나: `supabase-client.js`를 **실제로 eval해** getAllPlayRecordsForHub(50)을
// 부르고, 연결 게임평도 배치 조회해 index-page.js의 선택식을 그대로 적용한다.
//   ① 기록 본문 또는 사후 연결 게임평과 사진을 둘 다 가졌고
//   ② 그 조건을 만족하는 기록 중 가장 최근(played_at ?? created_at 날짜)인가
//   ③ 사진 기록에 게임평을 나중에 연결해도 후보가 되는가
// 를 본다. 정렬 폴백이 없으면 played_at NULL 기록이 선두를 점유해 ②가 깨진다.
//
// ⚠️ 쓰기 차단: window.location.hostname='localhost' → 사이트 코드의 추적성 write가 자체 차단됨.
//    호출하는 것도 읽기 함수 하나뿐이다.
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
// ⚠️ setInterval을 스텁하지 말 것 — undici(fetch)가 `setInterval(...).unref()`를 호출하므로
//    가짜로 덮으면 모든 쿼리가 "fetch failed"로 죽고 검사기가 0행을 정상처럼 보고한다.
global.supabase = require('../node_modules/@supabase/supabase-js');

const src = f => fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8');
eval(src('supabase-config.js'));
eval(src('supabase-client.js'));

// ── 검증 ────────────────────────────────────────────────────
let fail = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? '🟢' : '🔴'} ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) fail++;
};

(async () => {
  const db = window.CottageDB;
  const sortDate = db.playRecordSortDate;
  const records = await db.getAllPlayRecordsForHub(50);
  console.log(`=== getAllPlayRecordsForHub(50) → ${records.length}행 ===`);
  check('행이 비어 있지 않다', records.length > 0, `${records.length}행`);
  if (!records.length) {
    console.log('\n❌ 실제 데이터가 없어 판정할 수 없다');
    process.exit(1);
  }

  const linkedComments = await db.getRecordComments(records.map(r => r.id));
  const linkedByRecord = new Map();
  for (const comment of linkedComments) {
    if (!comment.record_id || !comment.comment_text?.trim()) continue;
    const key = String(comment.record_id);
    if (!linkedByRecord.has(key)) linkedByRecord.set(key, []);
    linkedByRecord.get(key).push(comment);
  }
  const hasReview = r => !!r.review_text?.trim() || linkedByRecord.has(String(r.id));

  // 정렬 불변식: 폴백 날짜가 단조 비증가
  let mono = true;
  for (let i = 1; i < records.length; i++) {
    if (sortDate(records[i]) > sortDate(records[i - 1])) { mono = false; break; }
  }
  check('폴백 날짜(played_at ?? created_at) 기준 내림차순', mono);

  // index-page.js와 동일한 선택식
  const picked = records.find(r => hasReview(r) && r.photo_url?.trim()) || records[0];
  const qualified = records.filter(r => hasReview(r) && r.photo_url?.trim());
  const newestQualified = qualified.reduce((a, b) => (sortDate(b) > sortDate(a) ? b : a), qualified[0]);

  console.log(`\n  화면이 고르는 행: id=${picked.id} game=${picked.game_id} 날짜=${sortDate(picked)} (created ${String(picked.created_at).slice(0, 19)})`);
  console.log(`  조건(평+사진) 충족 행: ${qualified.length}건 / 그중 최신 id=${newestQualified?.id} 날짜=${sortDate(newestQualified)}`);

  check('고른 행에 본문 또는 연결 게임평이 있다', hasReview(picked));
  check('고른 행에 사진이 있다', !!picked.photo_url?.trim());
  check('고른 행이 조건 충족 행 중 가장 최근이다',
    NEG ? sortDate(picked) !== sortDate(newestQualified)   // ← 음성 대조군: 여기만 🔴이어야 정상
        : sortDate(picked) === sortDate(newestQualified),
    NEG ? '⚠️ negctl — 이 줄만 🔴이면 검사기가 살아 있다' : `${sortDate(picked)} vs ${sortDate(newestQualified)}`);

  // 실DB 표본 유무와 무관하게 "사진 먼저 → 게임평 나중" 순서를 고정하는 회귀 대조군.
  const syntheticRecords = [
    { id: 'later-linked', played_at: '2099-01-02', review_text: null, photo_url: 'later.jpg' },
    { id: 'older-inline', played_at: '2099-01-01', review_text: '기존 후기', photo_url: 'older.jpg' },
  ];
  const syntheticLinked = new Map([['later-linked', [{ comment_text: '나중에 붙인 후기' }]]]);
  const syntheticHasReview = r => !!r.review_text?.trim() || syntheticLinked.has(String(r.id));
  const syntheticPicked = syntheticRecords.find(r => syntheticHasReview(r) && r.photo_url?.trim());
  check('사진 기록에 게임평을 나중에 연결해도 최신 후보가 된다', syntheticPicked?.id === 'later-linked');

  // played_at NULL 기록이 선두를 점유하지 않는다 (이번 버그의 직접 증상)
  const nullLead = records.slice(0, 3).filter(r => !r.played_at).length;
  check('상위 3행이 played_at NULL로만 채워져 있지 않다', nullLead < 3, `NULL ${nullLead}/3`);

  console.log(`\n${fail === 0 ? '✅ 전부 통과' : `❌ 실패 ${fail}건`}`);
  process.exit(0);
})();
