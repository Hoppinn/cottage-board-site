// 전체공지·교환권공지 "확인했어요"가 DB로 동기화되는지 — 실브라우저 컨텍스트 2개로 검증
// (2026-07-30 커밋 f8f92b05/54d652ae의 회귀 없음 확인)
//
//   node scripts/verify-notice-ack-sync.js            (기본 http://127.0.0.1:5500)
//
// ⚠️ 운영 DB의 관리자 profiles 행(notif_seen_at / notif_read_keys)을 잠시 바꾼다.
//    원본은 시작 시 저장하고 finally에서 반드시 복원한다.
const { chromium } = require('../node_modules/playwright');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:5500';
const UID = '4916417947'; // OWNER_KAKAO_ID

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};
const readRow = async () => {
  const { data, error } = await db.from('profiles')
    .select('notif_seen_at, notif_read_keys').eq('user_id', UID).maybeSingle();
  if (error) { console.error('DB read error', error); process.exit(1); }
  return data;
};
// 새 컨텍스트 = "다른 기기·다른 브라우저" 시뮬레이션(localStorage 공유 없음). kakao_user만
// 심어 로그인 상태를 재현 — 가짜 회원을 만드는 게 아니라 실존 관리자 계정의 세션을 흉내낼 뿐.
const newDeviceContext = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((uid) => {
    localStorage.setItem('kakao_user', JSON.stringify({ id: uid, nickname: '호핀' }));
  }, UID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
};
const openNotif = async (page) => {
  await page.evaluate(() => {
    document.getElementById('profileSubSheet')?.remove();
    document.querySelector('.profile-panel')?.remove();
  });
  await page.evaluate(() => window.openProfilePanel('notif'));
  await page.waitForSelector('#profileSubSheet .profile-notif-list', { timeout: 15000 });
  await page.waitForTimeout(400);
};
const noticeState = (page) => page.evaluate(() => {
  const notice = document.querySelector('.notif-reward-card--notice');
  const voucher = document.querySelector('.notif-reward-card--voucher');
  return {
    noticeExists: !!notice,
    noticeIsNew: !!notice?.classList.contains('is-new'),
    noticeHasConfirmBtn: !!document.querySelector('.profile-notice-confirm'),
    voucherExists: !!voucher,
    voucherIsNew: !!voucher?.classList.contains('is-new'),
  };
});

(async () => {
  const original = await readRow();
  console.log('원본 저장:', JSON.stringify(original), '\n');
  let browser;
  try {
    // 지평선·읽음키 전부 초기화 — 공지가 "처음 보는 상태"에서 시작하게
    const { error: resetErr } = await db.from('profiles')
      .update({ notif_seen_at: null, notif_read_keys: [] }).eq('user_id', UID);
    if (resetErr) { console.error('reset 실패', resetErr); process.exit(1); }

    browser = await chromium.launch({ headless: true });

    console.log('① 기기 A — 최초 진입, 공지 미확인 상태 확인');
    const A = await newDeviceContext(browser);
    await openNotif(A.page);
    const sA0 = await noticeState(A.page);
    ok('전체공지 카드 존재(현재 8/31까지 노출 기간)', sA0.noticeExists);
    ok('전체공지 NEW 상태(미확인)', sA0.noticeIsNew, JSON.stringify(sA0));
    ok('확인 버튼 존재', sA0.noticeHasConfirmBtn);

    console.log('\n② 기기 A — "확인했어요" 클릭');
    await A.page.click('.profile-notice-confirm');
    await A.page.waitForTimeout(2000);
    const sA1 = await noticeState(A.page);
    ok('기기 A 내에서 즉시 is-seen으로 전환', !sA1.noticeIsNew);
    const afterAck = await readRow();
    ok('DB notif_read_keys에 notice:fee 저장됨', (afterAck.notif_read_keys || []).includes('notice:fee'), JSON.stringify(afterAck.notif_read_keys));
    await A.ctx.close();

    console.log('\n③ 기기 B — 완전히 새 컨텍스트(localStorage 공유 없음)에서 재진입');
    const B = await newDeviceContext(browser);
    await openNotif(B.page);
    const sB0 = await noticeState(B.page);
    ok('🎯 기기 B에서도 이미 확인된 상태로 뜸(재노출 안 됨 — 이번 수정의 핵심)', sB0.noticeExists && !sB0.noticeIsNew, JSON.stringify(sB0));

    console.log('\n④ "모두 읽기" — notice:* 키가 보존되는지(지평선 리셋에도 재노출 안 되는지)');
    await B.page.click('.profile-notif-confirm-all');
    await B.page.waitForTimeout(2000);
    const afterAll = await readRow();
    ok('notice:fee가 "모두 읽기" 이후에도 보존됨', (afterAll.notif_read_keys || []).includes('notice:fee'), JSON.stringify(afterAll.notif_read_keys));
    await B.ctx.close();

    console.log('\n⑤ 기기 C — 세 번째 컨텍스트에서 최종 재확인');
    const C = await newDeviceContext(browser);
    await openNotif(C.page);
    const sC0 = await noticeState(C.page);
    ok('기기 C에서도 여전히 안 뜸(모두 읽기 이후에도 안정적)', sC0.noticeExists && !sC0.noticeIsNew);

    console.log('\n⑥ 콘솔 에러 확인 (기기 C)');
    const rel = C.errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
    ok('제품 콘솔 에러 0건', rel.length === 0, rel.slice(0, 3).join(' | '));
    await C.ctx.close();
  } finally {
    await db.from('profiles').update(original).eq('user_id', UID);
    console.log('\n복원 완료:', JSON.stringify(await readRow()));
    if (browser) await browser.close();
  }
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
