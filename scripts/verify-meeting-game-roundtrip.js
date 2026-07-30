// 플래너 "좋아요·지난 모임"으로 담은 게임이 저장 후에도 남는지 — DB 계층 실왕복
// (addMeetingVoteGame → getMeetingVoteGames → removeMeetingVoteGame, 열린 스모크 항목)
//
//   node scripts/verify-meeting-game-roundtrip.js
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
const noopEl = () => ({ style: {}, classList: { add(){}, remove(){}, contains: () => false }, appendChild(){}, setAttribute(){}, addEventListener(){}, remove(){} });
global.document = { readyState: 'complete', addEventListener(){}, removeEventListener(){}, createElement: noopEl, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: noopEl(), documentElement: noopEl(), referrer: '' };
global.navigator = { userAgent: 'node-verify', sendBeacon: () => false };
global.window = global;
global.location = window.location = { hostname: 'localhost', href: 'http://localhost/', pathname: '/', search: '', origin: 'http://localhost' };
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.supabase = require('../node_modules/@supabase/supabase-js');

const src = f => fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8');
eval(src('supabase-config.js'));
eval(src('supabase-client.js'));
const db = window.CottageDB;

const UID = '4916417947';
const TEST_DATE = '2099-06-16'; // guest-count 테스트와 겹치지 않는 별도 먼 미래 날짜
const CUSTOM = '__검증용_지난모임테스트__';

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

(async () => {
  try {
    console.log('① 사전 정리');
    await db.removeMeetingVoteGame(UID, TEST_DATE, 'want', null, CUSTOM);

    console.log('\n② "하고싶은 게임"으로 담기 (피커 → addGameStep2 경로가 최종적으로 부르는 함수)');
    const add1 = await db.addMeetingVoteGame(UID, TEST_DATE, 'want', null, CUSTOM);
    ok('추가 성공', !!add1.success, JSON.stringify(add1));

    console.log('\n③ 저장 후 재조회 — 담은 게임이 실제로 남아있는지(원래 신고된 우려)');
    const rows1 = await db.getMeetingVoteGames(TEST_DATE, TEST_DATE);
    const mine1 = rows1.find(r => r.user_id === UID && r.custom_name === CUSTOM);
    ok('🎯 저장 후에도 담은 게임이 남아있음(사라지지 않음)', !!mine1, JSON.stringify(mine1));
    ok('list_type=want로 저장됨', mine1?.list_type === 'want');

    console.log('\n④ 중복 추가 시도 — 이미 담긴 걸 다시 담아도 에러 없이 성공 처리되는지(UNIQUE 23505 흡수)');
    const add2 = await db.addMeetingVoteGame(UID, TEST_DATE, 'want', null, CUSTOM);
    ok('중복 추가도 성공으로 처리(에러 아님)', !!add2.success, JSON.stringify(add2));
    const rows2 = await db.getMeetingVoteGames(TEST_DATE, TEST_DATE);
    const mineDup = rows2.filter(r => r.user_id === UID && r.custom_name === CUSTOM);
    ok('행이 중복 생성되지 않음(여전히 1건)', mineDup.length === 1, `${mineDup.length}건`);

    console.log('\n⑤ 정리 — 제거 + 제거 확인');
    const rm = await db.removeMeetingVoteGame(UID, TEST_DATE, 'want', null, CUSTOM);
    ok('제거 성공', !!rm.success, JSON.stringify(rm));
    const rows3 = await db.getMeetingVoteGames(TEST_DATE, TEST_DATE);
    ok('제거 후 재조회 시 0건', !rows3.some(r => r.user_id === UID && r.custom_name === CUSTOM), `남은 ${rows3.length}건`);
  } catch (e) {
    console.error('예외', e);
    fail++;
    await db.removeMeetingVoteGame(UID, TEST_DATE, 'want', null, CUSTOM).catch(() => {});
  }
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
