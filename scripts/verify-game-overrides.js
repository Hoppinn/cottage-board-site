// 게임정리(사진)+룰설명+에러로그 관리자 입력(마이그레이션 019+020, game_overrides) — 실DB 왕복 검증
//
//   node scripts/verify-game-overrides.js
//
// 019 실행 전에는 테이블이 없어 ①에서 바로 실패 보고 후 종료한다(기대된 동작).
// 020(error_note 컬럼) 미실행 시엔 ②에서 컬럼 오류로 실패한다 — 그 경우 020을 먼저 실행할 것.
// 실행 후에는 임의 game_key로 upsert → 되읽기 → 정리 순으로 왕복 확인한다.
// 실제 파일 업로드(uploadOrganizerPhoto)는 File API가 필요해 여기선 제외 —
// Playwright 실클릭 검증(요청관리 → 게임 관리)에서 커버한다.
const fs = require('fs');
const path = require('path');

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
global.supabase = require('../node_modules/@supabase/supabase-js');

const src = f => fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8');
eval(src('supabase-config.js'));
eval(src('supabase-client.js'));

const { createClient } = global.supabase;
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

const TEST_KEY = '__verify_game_overrides_test__';

(async () => {
  console.log('=== ① 테이블 존재 확인 ===');
  // head:true는 PGRST205(테이블 없음)를 error 없이 통과시킬 때가 있다 — 실제 행을 요청해 확인.
  const { data: probeRows, error: colErr, count } = await db.from('game_overrides')
    .select('game_key', { count: 'exact' }).limit(1);
  if (colErr) {
    console.error('🔴 game_overrides 조회 실패 — 019 마이그레이션 미실행', colErr);
    process.exit(1);
  }
  ok('game_overrides 조회 가능', true, `${count}행, probe=${JSON.stringify(probeRows)}`);

  try {
    console.log('\n=== ② upsertGameOverride 왕복 ===');
    const testUrls = ['https://example.com/organizer-photos/test/1.jpg', 'https://example.com/organizer-photos/test/2.jpg'];
    const testNote = '테스트 룰 설명\n두 번째 줄';
    const testErrorNote = '자주 하는 실수\n두 번째 줄';
    const upsertOk = await window.CottageDB.upsertGameOverride(TEST_KEY, {
      organizerPhotoUrls: testUrls,
      ruleNote: testNote,
      errorNote: testErrorNote,
    });
    ok('upsertGameOverride 성공', upsertOk === true);

    const readBack = await window.CottageDB.getGameOverride(TEST_KEY);
    ok('되읽기 — 행 존재', !!readBack);
    ok('organizer_photo_urls 일치', JSON.stringify(readBack?.organizer_photo_urls) === JSON.stringify(testUrls), JSON.stringify(readBack?.organizer_photo_urls));
    ok('rule_note 일치(줄바꿈 포함)', readBack?.rule_note === testNote, readBack?.rule_note);
    ok('error_note 일치(줄바꿈 포함)', readBack?.error_note === testErrorNote, readBack?.error_note);

    console.log('\n=== ③ 존재하지 않는 game_key — null 반환 확인 ===');
    const missing = await window.CottageDB.getGameOverride('__no_such_game_key__');
    ok('없는 게임은 null', missing === null);

    console.log('\n=== ④ 빈 값으로 upsert — rule_note/error_note NULL 저장 확인 ===');
    await window.CottageDB.upsertGameOverride(TEST_KEY, { organizerPhotoUrls: [], ruleNote: '', errorNote: '' });
    const cleared = await window.CottageDB.getGameOverride(TEST_KEY);
    ok('organizer_photo_urls 빈 배열', Array.isArray(cleared?.organizer_photo_urls) && cleared.organizer_photo_urls.length === 0);
    ok('rule_note NULL', cleared?.rule_note === null);
    ok('error_note NULL', cleared?.error_note === null);
  } finally {
    console.log('\n=== 정리: 테스트 행 삭제 ===');
    const { error: delErr } = await db.from('game_overrides').delete().eq('game_key', TEST_KEY);
    if (delErr) console.error('🔴 테스트 행 삭제 실패 — 수동 정리 필요', delErr);
    else console.log('  테스트 행 삭제 완료');
  }

  console.log(fail === 0 ? '\n✅ 전부 통과' : `\n🔴 ${fail}건 실패`);
  process.exit(fail === 0 ? 0 : 1);
})();
