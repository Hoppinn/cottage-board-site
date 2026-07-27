// 간식·음료 요청 "처리완료" — 마이그레이션 015 이후 실DB 엔드투엔드 검증
//
//   node scripts/verify-snack-done.js
//
// ⚠️ 운영 DB의 실제 snack_requests 행 하나를 잠시 is_done=true로 바꿨다가 되돌린다.
//    (verify-notif-read.js와 동일 구조 — 원본 저장 → mutate → 검증 → finally 복원)
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

(async () => {
  console.log('=== ① 컬럼 존재 확인 ===');
  const { data: rows, error: colErr, count } = await db.from('snack_requests')
    .select('id, item_name, user_id, is_done, done_at', { count: 'exact' });
  if (colErr) { console.error('🔴 컬럼 조회 실패', colErr); process.exit(1); }
  ok('is_done/done_at 컬럼 조회 가능', true, `${count}행`);

  const target = (rows || []).find(r => r.user_id);
  if (!target) {
    console.log('\n⚠️ user_id가 있는 snack_requests 행이 없음 — 알림 왕복은 검증 불가, 컬럼 존재만 확인하고 종료');
    process.exit(fail === 0 ? 0 : 1);
  }
  console.log(`대상 행: ${target.item_name} (id=${target.id}, user_id=${target.user_id})`);
  const original = { is_done: target.is_done, done_at: target.done_at };

  try {
    console.log('\n=== ② 관리자 토글 ON — 처리완료 표시 ===');
    const doneAt = new Date().toISOString();
    const { error: updErr } = await db.from('snack_requests')
      .update({ is_done: true, done_at: doneAt }).eq('id', target.id);
    if (updErr) { console.error('🔴 update 실패', updErr); process.exit(1); }
    const { data: after1 } = await db.from('snack_requests').select('is_done, done_at').eq('id', target.id).maybeSingle();
    ok('DB에 is_done=true 반영', after1.is_done === true);
    ok('DB에 done_at 반영', !!after1.done_at);

    console.log('\n=== ③ getMyNotifications — snack_done 알림 생성 확인 ===');
    const notifs = await window.CottageDB.getMyNotifications(target.user_id, null, null, null);
    const snackNotif = notifs.find(n => n.type === 'snack_done' && n.key === `snack_done:${target.id}`);
    ok('snack_done 알림 존재', !!snackNotif, JSON.stringify(notifs.filter(n => n.type === 'snack_done')));
    if (snackNotif) {
      ok('itemName 일치', snackNotif.itemName === target.item_name, snackNotif.itemName);
      ok('isNew=true (지평선 없음)', snackNotif.isNew === true);
    }

    console.log('\n=== ④ 관리자 토글 OFF — 해제 ===');
    const { error: revErr } = await db.from('snack_requests')
      .update({ is_done: false, done_at: null }).eq('id', target.id);
    if (revErr) { console.error('🔴 해제 실패', revErr); process.exit(1); }
    const notifsAfterOff = await window.CottageDB.getMyNotifications(target.user_id, null, null, null);
    ok('해제 후 snack_done 알림 사라짐', !notifsAfterOff.some(n => n.type === 'snack_done' && n.key === `snack_done:${target.id}`));
  } finally {
    await db.from('snack_requests').update(original).eq('id', target.id);
    const { data: restored } = await db.from('snack_requests').select('is_done, done_at').eq('id', target.id).maybeSingle();
    console.log('\n원본 복원 완료:', JSON.stringify(restored));
  }

  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
