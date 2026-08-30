// 타인 보드(설애님) 닉네임·게임도감 표시 — read-only 실브라우저 확인 (쓰기 전면 차단)
// 2026-07-28 종결 처리된 버그(닉네임 미전달 → "회원의 보드"+게임도감 0)의 실브라우저 재확인.
//
//   node scripts/verify-other-board-display.js
const { chromium } = require('../node_modules/playwright');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:5500';
const VIEWER_UID = '4916417947'; // 보는 사람 (OWNER_KAKAO_ID, 로그인만 필요)
const TARGET_UID = '4922707569'; // 설애님 — 태그만 되고 본인 기록은 안 쓴 회원 (2026-07-28 버그의 실제 사례)

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const blockedWrites = [];
  await ctx.route('**://*.supabase.co/**', route => {
    if (['GET', 'HEAD'].includes(route.request().method())) route.continue();
    else { blockedWrites.push(`${route.request().method()} ${route.request().url().split('?')[0]}`); route.abort(); }
  });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((uid) => {
    localStorage.setItem('kakao_user', JSON.stringify({ id: uid, nickname: '호핀' }));
  }, VIEWER_UID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate((uid) => window.openOtherProfileSheet?.(uid), TARGET_UID);
  await page.waitForSelector('.profile-panel-body', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const snap = await page.evaluate(() => {
    const header = document.querySelector('.profile-panel-header')?.textContent?.trim() || '';
    const compactHeader = document.querySelector('.profile-panel-compact-header');
    const largeIdentity = document.querySelector('.profile-panel-profile-top');
    const mainClose = document.querySelector('.profile-panel-main-close');
    const body = document.querySelector('.profile-panel-body')?.textContent || '';
    const codexMatch = body.match(/도감\s*(\d+)\s*\/\s*(\d+)/);
    return {
      header,
      compactHeader: compactHeader?.textContent?.trim() || '',
      compactHeaderPrepared: !!compactHeader,
      compactHeaderVisible: compactHeader?.classList.contains('is-visible') || false,
      largeIdentityPresent: !!largeIdentity,
      mainClosePresent: !!mainClose,
      codexMatch: codexMatch ? { played: +codexMatch[1], total: +codexMatch[2] } : null,
    };
  });
  console.log('패널 헤더:', JSON.stringify(snap.header));
  console.log('compact 헤더:', JSON.stringify(snap.compactHeader));
  console.log('도감 매치:', JSON.stringify(snap.codexMatch));

  ok('기본 내 보드 진입 시 별도 헤더를 만들지 않음', snap.header.length === 0, snap.header);
  ok('큰 identity 영역이 표시됨', snap.largeIdentityPresent);
  ok('초기 닫기 X가 유지됨', snap.mainClosePresent);
  ok('초기에는 compact header가 숨겨짐', !snap.compactHeaderVisible);
  ok('스크롤용 내 보드 compact header가 준비됨', snap.compactHeaderPrepared && snap.compactHeader.includes('내 보드'), snap.compactHeader);
  ok('게임도감 played > 0 (0으로 안 뜸)', !!snap.codexMatch && snap.codexMatch.played > 0, JSON.stringify(snap.codexMatch));

  console.log('\n쓰기 시도 차단:', blockedWrites.length ? blockedWrites.join('\n  ') : '(0건)');
  const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
  ok('제품 콘솔 에러 0건', rel.length === 0, rel.slice(0, 3).join(' | '));

  await browser.close();
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
