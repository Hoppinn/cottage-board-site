// 모임 플래너 Step 4 브라우저 검증 (운영 DB 쓰기 없음, 캡처는 OS 임시 폴더)
const { chromium } = require('playwright');
const os = require('os');
const path = require('path');
const fs = require('fs');
const http = require('http');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:8765/pages/club/club-schedule.html';
const ROOT = path.join(__dirname, '..');
let failures = 0;
const check = (label, condition, detail = '') => {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
};

async function openStep4(browser, width, height, label) {
  const context = await browser.newContext({viewport: {width, height}});
  await context.addInitScript(() => {
    localStorage.setItem('kakao_user', JSON.stringify({
      id:'__ui_only_024__', nickname:'UI검증', kakaoNickname:'UI검증',
      profileImage:'', kakaoProfileImage:'',
    }));
  });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const request = route.request();
    const host = new globalThis.URL(request.url()).hostname;
    const isSupabase = host.endsWith('.supabase.co');
    if (isSupabase && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      route.abort('blockedbyclient');
    } else {
      route.continue();
    }
  });
  await page.goto(URL, {waitUntil: 'networkidle'});
  await page.locator('#btnScheduleRegister').waitFor({state:'visible'});
  await page.locator('#btnScheduleRegister').click();
  await page.locator('.sm-day-chip:not([disabled])').first().click();
  await page.locator('#smNext1').click();
  await page.locator('#smNext2').click();
  await page.locator('#smNext3').click();
  await page.locator('#smRecruitmentMessage').waitFor({state:'visible'});

  const metrics = await page.evaluate(() => {
    const sheet = document.querySelector('.sched-multi-sheet');
    const body = document.querySelector('.sm-body');
    const save = document.querySelector('#smSave');
    const rect = sheet.getBoundingClientRect();
    const saveRect = save.getBoundingClientRect();
    return {
      title: document.querySelector('#smTitle')?.textContent,
      sheet: {left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, width:rect.width, height:rect.height},
      save: {top:saveRect.top, bottom:saveRect.bottom},
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      styleCount: document.querySelectorAll('input[name="smGameStyle"]').length,
      depthCount: document.querySelectorAll('input[name="smGameDepth"]').length,
      traitCount: document.querySelectorAll('input[name="smPlayTrait"]').length,
    };
  });
  check(`${label}: Step 4 제목`, metrics.title === '오늘 원하는 판');
  check(`${label}: 유형 3·깊이 4·성향 2`, metrics.styleCount === 3 && metrics.depthCount === 4 && metrics.traitCount === 2, JSON.stringify(metrics));
  check(`${label}: 가로 넘침 없음`, metrics.bodyScrollWidth <= metrics.bodyClientWidth, `${metrics.bodyScrollWidth}/${metrics.bodyClientWidth}`);
  check(`${label}: 저장 버튼이 뷰포트 안`, metrics.save.top >= 0 && metrics.save.bottom <= height, JSON.stringify(metrics.save));
  if (width === 360) check(`${label}: 시트가 화면 너비 사용`, metrics.sheet.left === 0 && metrics.sheet.right === 360, JSON.stringify(metrics.sheet));
  else check(`${label}: 시트 최대폭 650px`, metrics.sheet.width <= 650, JSON.stringify(metrics.sheet));

  await page.locator('label.sm-intent-option:has(input[name="smGameStyle"][value="strategy"])').click();
  await page.locator('label.sm-intent-option:has(input[name="smGameDepth"][value="medium"])').click();
  await page.locator('label.sm-intent-option:has(input[name="smPlayTrait"][value="beginner_welcome"])').click();
  await page.locator('#smRecruitmentMessage').fill('가'.repeat(31));
  check(`${label}: 브라우저 입력도 30자로 제한`, (await page.locator('#smRecruitmentMessage').inputValue()).length === 30);
  check(`${label}: 글자수 30/30 표시`, (await page.locator('#smRecruitmentCount').textContent()) === '30/30');

  await page.locator('#smBack').click();
  await page.locator('#smNext3').click();
  check(`${label}: 이전→다음 후 답변 유지`, await page.locator('input[name="smGameStyle"][value="strategy"]').isChecked()
    && await page.locator('input[name="smGameDepth"][value="medium"]').isChecked()
    && await page.locator('input[name="smPlayTrait"][value="beginner_welcome"]').isChecked());

  const summary = await page.evaluate(() => {
    const vote = {vote_date:'2099-08-29', user_id:'u1', nickname:'검증', time_start:10, time_end:18,
      guest_count:0, game_style:'strategy', game_depth:'medium', play_traits:['beginner_welcome'], recruitment_message:'전략 한 판 같이 해요'};
    const shown = window.buildBarsInCard([vote], [], null);
    const legacy = window.buildBarsInCard([{...vote, game_style:null, game_depth:null, play_traits:[], recruitment_message:null}], [], null);
    return {shown, legacy};
  });
  check(`${label}: 주간 요약에 유형·깊이·성향·문구`, ['전략', '적당히', '초보 환영', '전략 한 판 같이 해요'].every(text => summary.shown.includes(text)));
  check(`${label}: 레거시 NULL 행은 빈 요약 미생성`, !summary.legacy.includes('sched-bar-intent'));

  const shot = path.join(os.tmpdir(), `cottage-play-intent-${width}.png`);
  await page.screenshot({path:shot, fullPage:false});
  console.log(`  SCREENSHOT ${shot}`);
  await context.close();
  return shot;
}

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new globalThis.URL(req.url, URL).pathname);
    const file = path.resolve(ROOT, `.${pathname}`);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const type = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type':type});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => server.listen(8765, '127.0.0.1', error => error ? reject(error) : resolve()));
  const browser = await chromium.launch({headless:true, executablePath:EDGE});
  try {
    await openStep4(browser, 360, 740, '모바일 360px');
    await openStep4(browser, 1280, 800, 'PC 1280px');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
