// 모임 가능 시간 30분 단위 지원 — 마이그레이션 017 이후 실DB 왕복 검증
//
//   node scripts/verify-half-hour-vote.js
//
// 미래 날짜 + 가짜 user_id로 격리된 테스트 행을 만들고 검증 후 삭제한다
// (verify-notif-read.js·verify-snack-done.js와 동일 안전장치 — 원본 없음, 순수 신규 삽입이라
//  finally에서 delete만 하면 됨).
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
  body: noopEl(), documentElement: noopEl(), head: noopEl(),
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

const TEST_DATE = '2099-06-15';
const TEST_UID = '__test_half_hour_017__';

(async () => {
  try {
    console.log('=== ① 30분 단위(half-hour) 왕복 ===');
    await window.CottageDB.upsertMeetingVote(TEST_UID, '테스트', TEST_DATE, 9.5, 14.5, 0);
    const rows1 = await window.CottageDB.getMeetingVotes(TEST_DATE, TEST_DATE);
    const row1 = rows1.find(r => r.user_id === TEST_UID);
    ok('행 존재', !!row1);
    if (row1) {
      ok('time_start=9.5 그대로 반환', row1.time_start === 9.5, String(row1.time_start));
      ok('time_end=14.5 그대로 반환', row1.time_end === 14.5, String(row1.time_end));
    }

    console.log('\n=== ② 정시(whole-hour) 회귀 — 기존처럼 동작하는지 ===');
    await window.CottageDB.upsertMeetingVote(TEST_UID, '테스트', TEST_DATE, 10, 20, 0);
    const rows2 = await window.CottageDB.getMeetingVotes(TEST_DATE, TEST_DATE);
    const row2 = rows2.find(r => r.user_id === TEST_UID);
    ok('정시 값도 그대로', row2 && row2.time_start === 10 && row2.time_end === 20, JSON.stringify(row2 && { s: row2.time_start, e: row2.time_end }));

    console.log('\n=== ③ formatVoteHour 표시 포맷 ===');
    eval(src('day-detail.js'));
    ok('9.5 → "9시30분"', window.formatVoteHour(9.5) === '9시30분', window.formatVoteHour(9.5));
    ok('10 → "10시"', window.formatVoteHour(10) === '10시', window.formatVoteHour(10));
    ok('9.5 compact → "9:30"', window.formatVoteHour(9.5, { compact: true }) === '9:30');
    ok('10 compact → "10"', window.formatVoteHour(10, { compact: true }) === '10');
  } finally {
    const { error: delErr } = await db.from('meeting_votes').delete().eq('user_id', TEST_UID).eq('vote_date', TEST_DATE);
    if (delErr) console.error('🔴 테스트 행 삭제 실패 — 수동 확인 필요', delErr);
    else console.log('\n테스트 행 정리 완료');
  }

  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
