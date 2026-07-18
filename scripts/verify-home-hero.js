// 메인 히어로 회귀 확인 — 읽기 전용 (DB 무변경)
//
//   node scripts/verify-home-hero.js             (기본 http://127.0.0.1:5500)
//
// 지키려는 것 두 가지:
//   ① 히어로 통계 문구("오늘 N개의 플레이기록이…")가 노출되지 않는다.
//      2026-07-18 결정 — 메인은 깔끔하게. index.html에서 <p> 2개를 뺐고,
//      되살리는 법은 그 자리 주석에 있다.
//   ② index.html#recommend 딥링크로 추천 섹션이 자동으로 열린다.
//      ⚠️ 이 로직은 index-page.js `initHeroStats`의 **finally**에 얹혀 있다.
//      ①의 요소가 없으면 그 함수는 조기 return 하지만 return이어도 finally는
//      실행되므로 딥링크가 살아남는다 — 이 결합이 비직관적이라 회귀 위험이 크다.
//      그 블록을 정리·이동할 때 반드시 이 스크립트를 다시 돌릴 것.
const { chromium } = require('../node_modules/playwright');

const BASE = (process.argv[2] || 'http://127.0.0.1:5500').replace(/\/$/, '') + '/index.html';

let fail = 0;
const ok = (n, c, e = '') => { console.log((c ? '  PASS ' : '  FAIL ') + n + (e ? ' — ' + e : '')); if (!c) fail++; };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  console.log('① 히어로 통계 미노출');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const r1 = await page.evaluate(() => ({
    recEl: !!document.getElementById('heroRecommendCount'),
    playEl: !!document.getElementById('heroPlayCount'),
    bar: !!document.querySelector('.hero-visitor-bar'),
    hasText: /플레이기록이 작성됐어요|추천게임이 완료됐어요/.test(document.body.innerText),
    heroText: (document.querySelector('.hero')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 140),
  }));
  ok('heroRecommendCount 없음', !r1.recEl);
  ok('heroPlayCount 없음', !r1.playEl);
  ok('빈 .hero-visitor-bar 껍데기도 없음', !r1.bar);
  ok('통계 문구가 화면에 없음', !r1.hasText);
  console.log('    히어로:', r1.heroText);

  console.log('② #recommend 딥링크 (initHeroStats의 finally에 의존)');
  await page.goto(BASE + '#recommend', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const r2 = await page.evaluate(() => {
    const sec = document.getElementById('recommend');
    if (!sec) return { exists: false };
    const res = document.getElementById('recResults') || sec.querySelector('.rec-results, [id*="ecResult"]');
    const vis = el => { if (!el) return false; const s = getComputedStyle(el), b = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && b.height > 0; };
    return { exists: true, resultsVisible: vis(res), scrollY: Math.round(window.scrollY) };
  });
  ok('#recommend 섹션 존재', r2.exists);
  ok('추천 섹션이 자동으로 열림', r2.resultsVisible || r2.scrollY > 100,
     `resultsVisible=${r2.resultsVisible} scrollY=${r2.scrollY}`);

  console.log('③ 콘솔 에러');
  const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
  ok('관련 에러 0건', rel.length === 0, rel.slice(0, 3).join(' | '));

  await browser.close();
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
