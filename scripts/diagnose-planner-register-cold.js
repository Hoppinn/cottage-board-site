// 홈 빈 날짜의 플래너 빠른진입을 초기 로드/iframe 지연/인증 조건별로 단계 추적한다.
// Supabase 쓰기는 전부 차단하고, 빈 날짜를 만들기 위한 meeting GET만 고정한다.
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 8769;
const BASE = `http://127.0.0.1:${PORT}`;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function server() {
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, BASE).pathname);
    const file = path.resolve(ROOT, `.${pathname}`);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
}

async function runCase(browser, {name, loggedIn, frameDelay, stripEmbedQuery = false}) {
  const context = await browser.newContext({viewport:{width:360, height:720}});
  if (loggedIn) {
    await context.addInitScript(() => localStorage.setItem('kakao_user', JSON.stringify({
      id:'9999999999', nickname:'로컬재현', kakaoNickname:'로컬재현', profileImage:'', kakaoProfileImage:'',
    })));
  }
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(`page:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`console:${message.text()}`); });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname.endsWith('.supabase.co') && !['GET','HEAD','OPTIONS'].includes(req.method())) {
      await route.abort('blockedbyclient'); return;
    }
    if (url.hostname.endsWith('.supabase.co') && /\/rest\/v1\/(meeting_votes|meeting_vote_games)/.test(url.pathname)) {
      await route.fulfill({status:200, contentType:'application/json', headers:{'content-range':'0-0/0'}, body:'[]'}); return;
    }
    if (frameDelay && url.pathname.endsWith('/pages/club/club-schedule.html') && url.searchParams.get('embed') === 'true') {
      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
    await route.continue();
  });

  await page.goto(`${BASE}/index.html`, {waitUntil:'domcontentloaded'});
  const button = page.locator('#mpeGoPlanner');
  await button.waitFor({state:'visible', timeout:15000});
  if (stripEmbedQuery) {
    await page.evaluate(() => {
      const frame = document.getElementById('plannerSheetFrame');
      frame.classList.remove('is-ready');
      frame.src = './pages/club/club-schedule.html';
    });
    await page.locator('#plannerSheetFrame').evaluate(frame => new Promise(resolve => {
      if (frame.contentDocument?.readyState === 'complete') resolve();
      else frame.addEventListener('load', resolve, { once:true });
    }));
  }
  await page.evaluate(() => {
    window.__coldTrace = [];
    const original = window.__openPlannerFor;
    window.__openPlannerFor = (...args) => {
      window.__coldTrace.push({stage:'open-call', args});
      return original?.(...args);
    };
    document.getElementById('mpeGoPlanner')?.addEventListener('click', () => window.__coldTrace.push({stage:'button-click'}), {capture:true});
    window.addEventListener('message', event => {
      if (event.source === document.getElementById('plannerSheetFrame')?.contentWindow && event.data?.type) {
        window.__coldTrace.push({stage:event.data.type});
      }
    });
  });
  await button.click();
  await page.waitForTimeout(100);
  const immediate = await page.evaluate(() => ({
    parentOpen:document.getElementById('plannerSheetModal')?.classList.contains('is-open'),
    loaderDisplay:getComputedStyle(document.getElementById('plannerSheetLoader')).display,
    trace:window.__coldTrace.slice(),
  }));
  await page.waitForTimeout(8000);
  const state = await page.evaluate(() => ({
    trace:window.__coldTrace,
    parentClass:document.getElementById('plannerSheetModal')?.className,
    parentHidden:document.getElementById('plannerSheetModal')?.getAttribute('aria-hidden'),
    frameClass:document.getElementById('plannerSheetFrame')?.className,
    frameSrc:document.getElementById('plannerSheetFrame')?.getAttribute('src'),
  }));
  const inner = await page.frameLocator('#plannerSheetFrame').locator('body').evaluate(body => ({
    bodyClass:body.className,
    overlayDisplay:getComputedStyle(document.getElementById('schedMultiOverlay')).display,
    overlayVisible:document.getElementById('schedMultiOverlay').getBoundingClientRect().height > 0,
    loggedIn:!!window.getKakaoUser?.(),
  })).catch(error => ({error:error.message}));
  const passed = immediate.parentOpen && state.parentClass?.includes('is-open') && inner.overlayVisible;
  console.log(JSON.stringify({name, passed, immediate, state, inner, consoleErrors}, null, 2));
  await context.close();
  return passed;
}

(async () => {
  const httpServer = server();
  await new Promise(resolve => httpServer.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:EDGE});
  let failed = false;
  try {
    for (const testCase of [
      {name:'로그인·일반 초기 로드', loggedIn:true, frameDelay:0},
      {name:'로그인·iframe 1.5초 지연', loggedIn:true, frameDelay:1500},
      {name:'로그인·embed 쿼리 소실', loggedIn:true, frameDelay:0, stripEmbedQuery:true},
      {name:'미로그인 초기 로드', loggedIn:false, frameDelay:0},
    ]) {
      if (!await runCase(browser, testCase)) failed = true;
    }
  } finally {
    await browser.close();
    await new Promise(resolve => httpServer.close(resolve));
  }
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
