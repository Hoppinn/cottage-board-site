// "남의 세션에 참여(남기기)" 저장 시 game_id NOT NULL 위반으로 실패하던 버그 — 실DB 왕복 검증
// (getGamePlayRecords의 SELECT 컬럼 목록에 game_id가 빠져 있어, 그 결과로 세션 객체를
// 만드는 _getOthersSessions가 매번 game_id: undefined를 담았고, recordGamePlay(undefined, ...)가
// game_id를 NULL로 보내 DB 제약 위반 — "저장에 실패했어요" 재현, 2026-07-31)
//
//   node scripts/verify-join-session-gameid.js
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

const OWNER_UID = '4916417947';
const FAKE_OTHER_UID = '__검증용_다른유저__';
const TEST_GAME_ID = '13'; // 카탄
const TEST_GROUP = '__검증용_join세션__';
let otherRecId = null, myJoinedId = null;

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

// game-sheet.js의 _getOthersSessions와 동일한 로직(모듈 비공개라 여기서 재현) — 세션 객체가
// game_id를 실제로 담는지가 검증 대상.
function buildOthersSessions(records, myId) {
  const byKey = new Map();
  for (const r of records) {
    if (myId && String(r.user_id) === myId) continue;
    if (!r.group_name && !r.played_at) continue;
    const key = `${r.group_name || ''}|${r.played_at || ''}|${r.player_count || ''}|${r.player_names || ''}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        game_id: r.game_id,
        group_name: r.group_name || null,
        played_at: r.played_at || null,
        player_count: r.player_count || null,
        player_names: r.player_names || null,
        nickname: r.nickname || null,
        rec_ids: [],
      });
    }
    byKey.get(key).rec_ids.push(String(r.id));
  }
  return [...byKey.values()];
}

(async () => {
  try {
    console.log('① 사전 정리');
    const before = await db.getGamePlayRecords(TEST_GAME_ID, 50);
    for (const r of (before || [])) {
      if (r.group_name === TEST_GROUP) await db.deleteGamePlay(r.id);
    }

    console.log('\n② "다른 사람"의 세션 1건 준비 (남기기로 참여할 대상)');
    const created = await db.recordGamePlay(TEST_GAME_ID, 3, '검증용,친구1,친구2', null, null, '검증용유저', FAKE_OTHER_UID, TEST_GROUP, '2099-02-02', null, null);
    ok('다른 유저 세션 생성', !!created?.id, JSON.stringify(created));
    otherRecId = created?.id;

    console.log('\n③ getGamePlayRecords가 game_id를 실제로 반환하는지 (수정 전엔 undefined였음)');
    const records = await db.getGamePlayRecords(TEST_GAME_ID, 50);
    const otherRow = (records || []).find(r => r.id === otherRecId);
    ok('🎯 조회 결과에 game_id 포함', otherRow?.game_id === TEST_GAME_ID, `game_id=${otherRow?.game_id}`);

    console.log('\n④ _getOthersSessions와 동일한 로직으로 세션 목록 구성 (내 계정 기준)');
    const sessions = buildOthersSessions(records, OWNER_UID);
    const mySession = sessions.find(s => s.group_name === TEST_GROUP);
    ok('세션 목록에 포함됨', !!mySession, JSON.stringify(mySession));
    ok('🎯 세션 객체에 game_id 있음(이게 없으면 recordGamePlay가 NULL을 보내 NOT NULL 위반)', mySession?.game_id === TEST_GAME_ID, `game_id=${mySession?.game_id}`);

    console.log('\n⑤ [남기기] 클릭 재현 — 세션 필드 복사해 내 새 기록으로 참여');
    const joinRes = await db.recordGamePlay(
      mySession.game_id, mySession.player_count, mySession.player_names, null, null,
      '호핀', OWNER_UID, mySession.group_name, mySession.played_at, null, '__검증용_참여후기__'
    );
    ok('🎯 저장 성공(예전엔 game_id NULL로 23502 위반 발생)', !!joinRes?.success, JSON.stringify(joinRes));
    myJoinedId = joinRes?.id;

  } finally {
    console.log('\n🧹 정리');
    if (otherRecId) { const d = await db.deleteGamePlay(otherRecId); console.log('  다른 유저 세션 삭제:', !d?.error); }
    if (myJoinedId) { const d = await db.deleteGamePlay(myJoinedId); console.log('  내 참여 기록 삭제:', !d?.error); }
    const remain = (await db.getGamePlayRecords(TEST_GAME_ID, 50) || []).filter(r => r.group_name === TEST_GROUP);
    console.log('  정리 후 잔여 테스트 기록:', remain.length, '건(0이어야 함)');
  }

  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
