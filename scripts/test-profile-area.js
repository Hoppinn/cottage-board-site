const { chromium } = require('../node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SS_DIR = path.join(__dirname, '..', 'scripts', 'ss_profile');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
const ss = (name) => path.join(SS_DIR, name);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const fakeUser = { id: '4916417947', nickname: '호핀', profile_image: '' };
    localStorage.setItem('kakao_user', JSON.stringify(fakeUser));
    const sessMap = { '4916417947': { timeSec: 180, visitCount: 5, prevSeenDt: new Date(Date.now() - 86400000).toISOString() } };
    localStorage.setItem('cottage_sess', JSON.stringify(Object.fromEntries(Object.entries(sessMap))));
  });
  await page.reload();
  await page.waitForTimeout(2000);

  // [1] 드롭다운 개인 영역 확인
  await page.evaluate(() => {
    const btn = document.getElementById('menuToggle');
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const loginBtn = document.getElementById('kakaoLoginBtn');
    if (loginBtn) loginBtn.click();
  });
  await page.waitForTimeout(600);

  const dropdownItems = await page.evaluate(() => {
    const ua = document.getElementById('kakaoUserActions');
    if (!ua) return [];
    return [...ua.children].map(el => el.textContent?.trim() || el.tagName);
  });
  console.log(`[1] 드롭다운 사용자 영역 항목: ${JSON.stringify(dropdownItems)}`);
  await page.screenshot({ path: ss('1_dropdown.png') });
  console.log('→ 1_dropdown.png 저장');

  // [2] 내 보드 열기 → 프로필 영역 확인
  await page.evaluate(() => {
    const btn = document.getElementById('kakaoProfileBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(6000);

  const profileAreaExists = await page.evaluate(() => !!document.querySelector('.profile-panel-profile'));
  const avatarType = await page.evaluate(() => {
    const el = document.querySelector('.profile-panel-avatar');
    if (!el) return 'none';
    return el.tagName.toLowerCase() + (el.classList.contains('profile-panel-avatar--empty') ? ' (empty)' : '');
  });
  const repName = await page.evaluate(() => document.querySelector('.profile-panel-rep-name')?.textContent);
  const nickText = await page.evaluate(() => document.querySelector('.profile-panel-nick')?.textContent);
  console.log(`[2] 프로필 영역: 존재=${profileAreaExists}, 아바타=${avatarType}, 닉네임="${nickText}", 칭호="${repName}"`);
  await page.screenshot({ path: ss('2_panel_profile.png') });
  console.log('→ 2_panel_profile.png 저장');

  // [3] 대표 캐릭터 변경 버튼 → 성장 보드 서브시트 진입
  await page.evaluate(() => {
    document.querySelector('.profile-panel-rep-btn')?.click();
  });
  await page.waitForTimeout(1200);
  const subsheetTitle = await page.evaluate(() => document.querySelector('.profile-subsheet-title')?.textContent);
  console.log(`[3] rep btn 클릭 → 서브시트 제목: "${subsheetTitle}"`);
  await page.screenshot({ path: ss('3_growth_subsheet.png') });
  console.log('→ 3_growth_subsheet.png 저장');

  // 서브시트 닫기
  await page.evaluate(() => document.querySelector('.profile-subsheet-back')?.click());
  await page.waitForTimeout(500);

  // [4] 아바타 클릭 → 성장 보드 서브시트 진입
  await page.evaluate(() => {
    document.querySelector('.profile-panel-avatar')?.click();
  });
  await page.waitForTimeout(1200);
  const subsheetTitle2 = await page.evaluate(() => document.querySelector('.profile-subsheet-title')?.textContent);
  console.log(`[4] 아바타 클릭 → 서브시트 제목: "${subsheetTitle2}"`);
  await page.screenshot({ path: ss('4_avatar_click.png') });
  console.log('→ 4_avatar_click.png 저장');

  await browser.close();
  console.log('\n✅ 검증 완료');
})();
