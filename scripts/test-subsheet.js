const { chromium } = require('../node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SS_DIR = path.join(__dirname, '..', 'scripts', 'ss_subsheet');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
const ss = (name) => path.join(SS_DIR, name);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // 로그인 상태 주입 (테스트용 가짜 유저)
  await page.evaluate(() => {
    const fakeUser = { id: '4916417947', nickname: '호핀', profile_image: '' };
    localStorage.setItem('kakao_user', JSON.stringify(fakeUser));
    // cottage_sess 주입
    const sessMap = { '4916417947': { timeSec: 180, visitCount: 5, prevSeenDt: new Date(Date.now() - 86400000).toISOString() } };
    localStorage.setItem('cottage_sess', JSON.stringify(Object.fromEntries(Object.entries(sessMap))));
  });
  await page.reload();
  await page.waitForTimeout(2000);

  // 내 보드 버튼 클릭 (숨겨진 드롭다운이므로 JS로 직접 호출)
  await page.evaluate(() => {
    const btn = document.getElementById('kakaoProfileBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2500);

  // [1] 메인 패널: 카드 3개
  const cardCount = await page.evaluate(() => document.querySelectorAll('.profile-card').length);
  const panelVisible = await page.evaluate(() => !!document.getElementById('profilePanel'));
  console.log(`[1] 패널 열림: ${panelVisible}, 카드 수: ${cardCount}`);
  await page.screenshot({ path: ss('1_main_cards.png') });
  console.log('→ 1_main_cards.png 저장');

  // [2] 알림 서브시트
  await page.evaluate(() => {
    const card = document.querySelector('.profile-card[data-subsheet="notif"]');
    if (card) card.click();
  });
  await page.waitForTimeout(800);
  const notifSubOpen = await page.evaluate(() => !!document.getElementById('profileSubSheet'));
  const notifTitle = await page.evaluate(() => document.querySelector('.profile-subsheet-title')?.textContent);
  const notifList = await page.evaluate(() => !!document.querySelector('.profile-notif-list'));
  console.log(`[2] 알림 서브시트: 열림=${notifSubOpen}, 제목="${notifTitle}", 알림목록=${notifList}`);
  await page.screenshot({ path: ss('2_notif_subsheet.png') });
  console.log('→ 2_notif_subsheet.png 저장');

  // [3] 뒤로 → 메인 패널 복귀
  await page.evaluate(() => document.querySelector('.profile-subsheet-back')?.click());
  await page.waitForTimeout(500);
  const backToMain = await page.evaluate(() => !document.getElementById('profileSubSheet') && !!document.getElementById('profilePanel'));
  const mainCardsStill = await page.evaluate(() => document.querySelectorAll('.profile-card').length);
  console.log(`[3] 뒤로 클릭 후 — 서브시트 닫힘, 메인패널 유지: ${backToMain}, 카드수: ${mainCardsStill}`);

  // [4] 성장 보드 서브시트
  await page.evaluate(() => {
    const card = document.querySelector('.profile-card[data-subsheet="growth"]');
    if (card) card.click();
  });
  await page.waitForTimeout(1200);
  const growthTitle = await page.evaluate(() => document.querySelector('.profile-subsheet-title')?.textContent);
  const growthBody = await page.evaluate(() => document.querySelector('.profile-subsheet-body')?.innerHTML?.length || 0);
  console.log(`[4] 성장 보드 서브시트: 제목="${growthTitle}", bodyLen=${growthBody}`);
  await page.screenshot({ path: ss('3_growth_subsheet.png') });
  console.log('→ 3_growth_subsheet.png 저장');

  // 뒤로
  await page.evaluate(() => document.querySelector('.profile-subsheet-back')?.click());
  await page.waitForTimeout(500);

  // [5] 이용·혜택 서브시트
  await page.evaluate(() => {
    const card = document.querySelector('.profile-card[data-subsheet="activity"]');
    if (card) card.click();
  });
  await page.waitForTimeout(1200);
  const actTitle = await page.evaluate(() => document.querySelector('.profile-subsheet-title')?.textContent);
  const voucherSection = await page.evaluate(() => !!document.querySelector('.profile-voucher-section'));
  console.log(`[5] 이용·혜택 서브시트: 제목="${actTitle}", 교환권섹션=${voucherSection}`);
  await page.screenshot({ path: ss('4_activity_subsheet.png') });
  console.log('→ 4_activity_subsheet.png 저장');

  // [6] 서브시트 ✕ → 패널+서브시트 모두 닫힘
  await page.evaluate(() => document.querySelector('.profile-subsheet-close')?.click());
  await page.waitForTimeout(500);
  const allClosed = await page.evaluate(() => !document.getElementById('profileSubSheet') && !document.getElementById('profilePanel'));
  console.log(`[6] ✕ 클릭 후 패널+서브시트 모두 닫힘: ${allClosed}`);

  // [7] 다시 패널 열고 메인 dim 클릭 → 모두 닫힘
  await page.evaluate(() => {
    const btn = document.getElementById('kakaoProfileBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const card = document.querySelector('.profile-card[data-subsheet="growth"]');
    if (card) card.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const panel = document.getElementById('profilePanel');
    if (panel) panel.click(); // dim 클릭 시뮬레이션 (target=panel)
  });
  await page.waitForTimeout(500);
  const dimClosed = await page.evaluate(() => !document.getElementById('profileSubSheet') && !document.getElementById('profilePanel'));
  console.log(`[7] 메인패널 dim 클릭 후 모두 닫힘: ${dimClosed}`);

  await browser.close();
  console.log('\n✅ 검증 완료');
})();
