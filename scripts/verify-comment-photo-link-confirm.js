// "체크 안 하고 등록 → 연동하기" 확인창이 실제로 하는 DB 작업(연동 시 review_text/photo_url
// 갱신 + 원본 게임평 삭제)을 실DB로 왕복 검증한다. 모달 클릭 자체는 game-sheet.js의 기존
// _openJoinConfirm과 동일한 패턴(순수 DOM 이벤트 바인딩)이라 여기선 그 결과로 이어지는
// CottageDB 호출 시퀀스만 재현·확인한다(2026-07-31 신규 회원 확인창과 같은 검증 범위).
//
//   node scripts/verify-comment-photo-link-confirm.js
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
const NICK = '검증용';
const TEST_GAME_ID = '13'; // 카탄(BGG 13) — 실존 게임, 표시용일 뿐 FK 제약 없음
const TEST_GROUP = '__검증용_연동확인__';
let recId = null, commentId = null;

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

(async () => {
  try {
    console.log('① 사전 정리(이전 실패로 남은 테스트 행 제거)');
    const before = await db.getGamePlayRecords(TEST_GAME_ID, 50);
    for (const r of (before || [])) {
      if (r.group_name === TEST_GROUP) await db.deleteGamePlay(r.id);
    }

    console.log('\n② 기존 플레이 기록 1건 준비 (체크 안 하고 등록했다고 가정할 대상)');
    const created = await db.recordGamePlay(TEST_GAME_ID, 2, '검증용,친구', null, null, NICK, UID, TEST_GROUP, '2099-01-01', null, null);
    ok('기록 생성', !!created?.id, JSON.stringify(created));
    recId = created?.id;
    if (!recId) throw new Error('기록 생성 실패 — 이후 단계 중단');

    console.log('\n③ 게임평 흐름 — "체크 안 하고 등록" 후 확인창에서 "연동하기" 선택 시퀀스 재현');
    const NEW_REVIEW = '__검증용_연동된_게임평__';
    const cIns = await db.insertComment(TEST_GAME_ID, NEW_REVIEW, NICK, UID, null);
    ok('1차: 미연동 게임평 생성(체크 안 한 상태)', !!cIns?.id, JSON.stringify(cIns));
    commentId = cIns?.id;
    const cUpd = await db.updateGamePlay(recId, { review_text: NEW_REVIEW });
    ok('2차: [연동하기] 클릭 → 기록에 review_text 반영', !cUpd?.error, JSON.stringify(cUpd));
    const cDel = await db.deleteComment(commentId);
    ok('3차: 연동 성공 후 원본(미연동) 게임평 삭제', !cDel?.error, JSON.stringify(cDel));
    commentId = null; // 이미 삭제됨 — finally에서 재삭제 방지

    const afterComment = await db.getGamePlayRecords(TEST_GAME_ID, 50);
    const recAfterComment = (afterComment || []).find(r => r.id === recId);
    ok('🎯 기록에 review_text가 실제로 반영됨(재조회)', recAfterComment?.review_text === NEW_REVIEW, recAfterComment?.review_text);

    console.log('\n④ 사진 흐름 — "체크 안 하고 등록" 후 확인창에서 "연동하기" 선택 시퀀스 재현');
    const FAKE_PHOTO_URL = 'https://example.invalid/test-photo.jpg';
    const pUpd = await db.updateGamePlay(recId, { photo_url: FAKE_PHOTO_URL });
    ok('[연동하기] 클릭 → 기록에 photo_url 병합 반영', !pUpd?.error, JSON.stringify(pUpd));
    const afterPhoto = await db.getGamePlayRecords(TEST_GAME_ID, 50);
    const recAfterPhoto = (afterPhoto || []).find(r => r.id === recId);
    ok('🎯 기록에 photo_url이 실제로 반영됨(재조회, 유령 기록 생성 없이 기존 기록 갱신)', recAfterPhoto?.photo_url === FAKE_PHOTO_URL, recAfterPhoto?.photo_url);

    console.log('\n⑤ 유령 기록(별도 새 play_records)이 생기지 않았는지 — 이 그룹명으로 여전히 1건뿐이어야 함');
    const finalRows = (await db.getGamePlayRecords(TEST_GAME_ID, 50) || []).filter(r => r.group_name === TEST_GROUP);
    ok('🎯 기록이 여전히 1건뿐(중복/유령 기록 없음)', finalRows.length === 1, `${finalRows.length}건`);

  } finally {
    console.log('\n🧹 정리');
    if (commentId) { const d = await db.deleteComment(commentId); console.log('  댓글 삭제:', !d?.error); }
    if (recId) { const d = await db.deleteGamePlay(recId); console.log('  기록 삭제:', !d?.error); }
    const remain = (await db.getGamePlayRecords(TEST_GAME_ID, 50) || []).filter(r => r.group_name === TEST_GROUP);
    console.log('  정리 후 잔여 테스트 기록:', remain.length, '건(0이어야 함)');
  }

  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
