// 동반 인원 등록 → 실DB 저장 → 인원수 계산 → 삭제까지 실왕복 (열린 스모크 항목)
// 근접 실일정과 충돌 없게 먼 미래 날짜(테스트 전용)를 쓰고 끝나면 완전히 지운다.
//
//   node scripts/verify-guest-count-roundtrip.js
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

const UID = '4916417947'; // OWNER_KAKAO_ID
const TEST_DATE = '2099-06-15'; // 실일정과 절대 안 겹치는 먼 미래 — 어떤 UI도 이 범위를 쿼리하지 않음

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

(async () => {
  try {
    console.log('① 사전 정리 — 혹시 남은 테스트 행이 있으면 먼저 지운다');
    await db.deleteMeetingVote(UID, TEST_DATE);

    console.log('\n② 동반 인원 2명으로 등록 (guestCount=2)');
    const up1 = await db.upsertMeetingVote(UID, '호핀', TEST_DATE, 14, 20, 2);
    ok('upsert 성공', !!up1.success, JSON.stringify(up1));

    console.log('\n③ 실DB에서 다시 읽어 guest_count·인원수 확인');
    const rows1 = await db.getMeetingVotes(TEST_DATE, TEST_DATE);
    const mine1 = rows1.find(r => String(r.user_id) === UID);
    ok('등록한 행이 실제로 읽힘', !!mine1, JSON.stringify(mine1));
    ok('guest_count=2로 저장됨', mine1?.guest_count === 2, `실제=${mine1?.guest_count}`);
    ok('getPartySize → 3명(본인+동반2)', db.getPartySize(mine1) === 3, `실제=${db.getPartySize(mine1)}`);

    console.log('\n④ 수정 진입 시나리오 — 동반 인원을 0으로 "덮어쓰지 않고" 그대로 재조회했을 때 여전히 2인지');
    // 실제 버그 우려: 수정 폼이 스테퍼를 0으로 초기화한 채로 저장하면 2가 사라진다.
    // 여기서는 DB 계층만 검증 — "재조회 시 여전히 2"까지만 확인(폼 렌더 자체는 UI 레이어라 별도).
    const rows2 = await db.getMeetingVotes(TEST_DATE, TEST_DATE);
    const mine2 = rows2.find(r => String(r.user_id) === UID);
    ok('재조회해도 guest_count가 여전히 2 (임의로 안 사라짐)', mine2?.guest_count === 2, `실제=${mine2?.guest_count}`);

    console.log('\n⑤ 동반 인원을 0으로 수정 (등록 화면에서 다시 저장하는 경로)');
    const up2 = await db.upsertMeetingVote(UID, '호핀', TEST_DATE, 14, 20, 0);
    ok('0으로 재upsert 성공', !!up2.success);
    const rows3 = await db.getMeetingVotes(TEST_DATE, TEST_DATE);
    const mine3 = rows3.find(r => String(r.user_id) === UID);
    ok('guest_count가 0으로 정상 반영(1명)', mine3?.guest_count === 0 && db.getPartySize(mine3) === 1, `guest=${mine3?.guest_count}`);

    console.log('\n⑥ 정리 — 테스트 행 삭제 + 삭제 확인');
    const del = await db.deleteMeetingVote(UID, TEST_DATE);
    ok('삭제 성공', !!del.success, JSON.stringify(del));
    const rows4 = await db.getMeetingVotes(TEST_DATE, TEST_DATE);
    ok('삭제 후 재조회 시 0건(실제로 지워짐 확인)', !rows4.some(r => String(r.user_id) === UID), `남은 행 ${rows4.length}`);
  } catch (e) {
    console.error('예외', e);
    fail++;
    // 예외가 나도 테스트 행은 반드시 지운다
    await db.deleteMeetingVote(UID, TEST_DATE).catch(() => {});
  }
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
