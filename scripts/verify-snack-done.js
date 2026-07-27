// 간식·음료 요청 상태 피커(구매예정/구매완료) — 마이그레이션 015·016 이후 실DB 엔드투엔드 검증
//
//   node scripts/verify-snack-done.js
//
// pages/admin/requests.html의 loadSnackRequests() [data-action] 핸들러(실사용 페이지) 및
// pages/admin/requests-admin.html의 .req-status-option 핸들러(snack_requests 분기, 별도
// 관리자 전용 뷰)가 보내는 것과 동일한 update 페이로드를 그대로 재현한다.
// ⚠️ 두 파일 모두 같은 snack_requests 테이블을 쓰지만 독립 구현이다(중복 — 리팩토링 후보,
// PROJECT_STATE 참조). 이 스크립트는 DB 계약(is_done/done_at/purchase_status/status_date)만
// 검증하므로 어느 화면에서 호출되든 동일하게 유효하다.
// ⚠️ 운영 DB의 실제 snack_requests 행 하나를 잠시 바꿨다가 되돌린다.
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
const today = new Date().toISOString().slice(0, 10);

(async () => {
  console.log('=== ① 컬럼 존재 확인 ===');
  const { data: rows, error: colErr, count } = await db.from('snack_requests')
    .select('id, item_name, user_id, is_done, done_at, purchase_status, status_date', { count: 'exact' });
  if (colErr) { console.error('🔴 컬럼 조회 실패', colErr); process.exit(1); }
  ok('is_done/done_at/purchase_status/status_date 컬럼 조회 가능', true, `${count}행`);

  const target = (rows || []).find(r => r.user_id);
  if (!target) {
    console.log('\n⚠️ user_id가 있는 snack_requests 행이 없음 — 알림 왕복은 검증 불가, 컬럼 존재만 확인하고 종료');
    process.exit(fail === 0 ? 0 : 1);
  }
  console.log(`대상 행: ${target.item_name} (id=${target.id}, user_id=${target.user_id})`);
  const original = { is_done: target.is_done, done_at: target.done_at, purchase_status: target.purchase_status, status_date: target.status_date };

  try {
    console.log('\n=== ② 관리자가 "구매 예정" 선택 ===');
    await db.from('snack_requests')
      .update({ purchase_status: '구매예정', status_date: today, is_done: false, done_at: null }).eq('id', target.id);
    const { data: after1 } = await db.from('snack_requests').select('purchase_status, status_date, is_done, done_at').eq('id', target.id).maybeSingle();
    ok('purchase_status=구매예정 반영', after1.purchase_status === '구매예정');
    ok('is_done은 아직 false (알림 미생성 조건)', after1.is_done === false);
    const notifsPlanned = await window.CottageDB.getMyNotifications(target.user_id, null, null, null);
    ok('구매예정 단계에서는 snack_done 알림 없음', !notifsPlanned.some(n => n.type === 'snack_done' && n.key === `snack_done:${target.id}`));

    console.log('\n=== ③ 관리자가 "구매 완료" 선택 ===');
    await db.from('snack_requests')
      .update({ purchase_status: '구매완료', status_date: today, is_done: true, done_at: new Date().toISOString() }).eq('id', target.id);
    const { data: after2 } = await db.from('snack_requests').select('purchase_status, is_done, done_at').eq('id', target.id).maybeSingle();
    ok('purchase_status=구매완료 반영', after2.purchase_status === '구매완료');
    ok('is_done=true 반영', after2.is_done === true);
    ok('done_at 반영', !!after2.done_at);

    console.log('\n=== ④ getMyNotifications — snack_done 알림 생성 확인 ===');
    const notifsDone = await window.CottageDB.getMyNotifications(target.user_id, null, null, null);
    const snackNotif = notifsDone.find(n => n.type === 'snack_done' && n.key === `snack_done:${target.id}`);
    ok('snack_done 알림 존재', !!snackNotif, JSON.stringify(notifsDone.filter(n => n.type === 'snack_done')));
    if (snackNotif) {
      ok('itemName 일치', snackNotif.itemName === target.item_name, snackNotif.itemName);
      ok('isNew=true (지평선 없음)', snackNotif.isNew === true);
    }

    console.log('\n=== ⑤ 관리자가 "해제" 선택 ===');
    await db.from('snack_requests')
      .update({ purchase_status: null, status_date: null, is_done: false, done_at: null }).eq('id', target.id);
    const { data: after3 } = await db.from('snack_requests').select('purchase_status, status_date, is_done, done_at').eq('id', target.id).maybeSingle();
    ok('해제 후 전부 null/false', !after3.purchase_status && !after3.status_date && after3.is_done === false && !after3.done_at);
    const notifsAfterOff = await window.CottageDB.getMyNotifications(target.user_id, null, null, null);
    ok('해제 후 snack_done 알림 사라짐', !notifsAfterOff.some(n => n.type === 'snack_done' && n.key === `snack_done:${target.id}`));
  } finally {
    await db.from('snack_requests').update(original).eq('id', target.id);
    const { data: restored } = await db.from('snack_requests').select('purchase_status, status_date, is_done, done_at').eq('id', target.id).maybeSingle();
    console.log('\n원본 복원 완료:', JSON.stringify(restored));
  }

  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
