// 모임원 프로필 30분 시간 막대/기존 데이터/커스텀 유형 UI 검증. 운영 DB 쓰기 없음.
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 8770;
const BASE = `http://127.0.0.1:${PORT}`;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

function createServer() {
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

const baseIntro = {
  id:'088cad93-89a7-49ac-a3ff-8fcd158cb3c9', user_id:'9999999999', nickname:'UI검증',
  join_sources:['store_visit'], companion_types:['friends'], average_play_frequency:3,
  possible_frequency_min:1, possible_frequency_max:3, desired_frequency_min:2, desired_frequency_max:4,
  available_days:['sat','flexible'], available_times:['morning','flexible'],
  preferred_game_types:['strategy','경제게임'], clocktower_preference:'interested',
  expectation:'서로 배려하면서 즐겁게 게임하겠습니다.', questionnaire_completed_at:'2026-08-29T00:00:00Z',
  created_at:'2026-08-29T00:00:00Z', card_color:'sage',
};
const otherIntro = {...baseIntro, id:'188cad93-89a7-49ac-a3ff-8fcd158cb3c9', user_id:'8888888888', nickname:'다른회원', preferred_game_types:['협력추리']};

async function verify(browser, width, height) {
  let submitted = null;
  let submitCount = 0;
  const context = await browser.newContext({viewport:{width,height}});
  await context.addInitScript(() => localStorage.setItem('kakao_user', JSON.stringify({
    id:'9999999999', nickname:'UI검증', kakaoNickname:'UI검증', profileImage:'', kakaoProfileImage:'',
  })));
  const page = await context.newPage();
  await page.exposeFunction('__captureIntroSubmit', answers => { submitted = answers; submitCount++; });
  await page.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@supabase/supabase-js@')) {
      await route.fulfill({status:200, contentType:'text/javascript', body:fs.readFileSync(path.join(ROOT, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'))}); return;
    }
    if (url.hostname.endsWith('.supabase.co') && !['GET','HEAD','OPTIONS'].includes(req.method())) {
      await route.abort('blockedbyclient'); return;
    }
    if (url.hostname.endsWith('.supabase.co') && url.pathname.endsWith('/rest/v1/member_intros')) {
      const mine = submitted ? {
        ...baseIntro,
        available_days:submitted.availableDays,
        available_times:submitted.availableTimes,
        preferred_game_types:submitted.preferredGameTypes,
        expectation:submitted.expectation,
      } : baseIntro;
      await route.fulfill({status:200, contentType:'application/json', body:JSON.stringify([mine, otherIntro])}); return;
    }
    if (url.hostname.endsWith('.supabase.co') && url.pathname.endsWith('/rest/v1/profiles')) {
      const avoid = submitted ? submitted.avoidGameTypes.filter(value => value !== 'none') : ['직접공격'];
      await route.fulfill({status:200, contentType:'application/json', body:JSON.stringify([
        {user_id:'9999999999', bio:'', avoid_tags:avoid},
        {user_id:'8888888888', bio:'', avoid_tags:['계산압박']},
      ])}); return;
    }
    await route.continue();
  });

  await page.goto(`${BASE}/pages/club/club-intro.html`, {waitUntil:'networkidle'});
  await page.waitForFunction(() => window.CottageDB?.formatMemberIntroTimes);
  await page.evaluate(() => {
    window.CottageDB.submitMemberIntro = async (_userId, answers) => {
      await window.__captureIntroSubmit(answers);
      const voucherGranted = window.__submittedOnce === 0;
      window.__submittedOnce += 1;
      return {success:true, id:'088cad93-89a7-49ac-a3ff-8fcd158cb3c9', voucherGranted};
    };
    window.__submittedOnce = 0;
  });
  await page.locator('#introWizardOpenBtn').click();
  await page.locator('#introWizardNextBtn').click();
  await page.locator('#introWizardNextBtn').click();

  check(`${width}px: 기존 오전 데이터 12개 슬롯 호환`, await page.locator('.intro-time-slot.is-selected').count() === 12);
  check(`${width}px: 요일 유동적 복수 선택`, await page.locator('[data-group="availableDays"] input[value="sat"]').isChecked()
    && await page.locator('[data-group="availableDays"] input[value="flexible"]').isChecked());
  check(`${width}px: 시간대 유동적+막대 동시 표시`, await page.locator('#introTimeFlexible').isChecked()
    && (await page.locator('#introTimeResult').textContent()) === '06시~12시 · 시간대 유동적');

  await page.locator('.intro-time-slot.is-selected').evaluateAll(nodes => nodes.forEach(node => node.click()));
  if (width >= 720) {
    const start = await page.locator('.intro-time-slot[data-time="09:00"]').boundingBox();
    const end = await page.locator('.intro-time-slot[data-time="11:30"]').boundingBox();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {steps:12});
    await page.mouse.up();
  } else {
    for (const time of ['09:00','09:30','10:00','10:30','11:00','11:30']) await page.locator(`.intro-time-slot[data-time="${time}"]`).click();
  }
  check(`${width}px: 단일 구간 출력`, (await page.locator('#introTimeResult').textContent()) === '09시~12시 · 시간대 유동적');

  await page.locator('.intro-time-slot.is-selected').evaluateAll(nodes => nodes.forEach(node => node.click()));
  for (const time of ['09:30','10:00','10:30','11:00','11:30','15:00','15:30','16:00','16:30','17:00','17:30','22:30','23:00','23:30','00:00','00:30']) {
    await page.locator(`.intro-time-slot[data-time="${time}"]`).click();
  }
  const expected = '09시30분~12시 · 15시~18시 · 22시30분~01시 · 시간대 유동적';
  check(`${width}px: 복수·30분·자정 넘김 출력`, (await page.locator('#introTimeResult').textContent()) === expected,
    await page.locator('#introTimeResult').textContent());
  const timeOverflow = await page.locator('#introTimePicker').evaluate(node => node.scrollWidth <= node.clientWidth);
  check(`${width}px: 시간 막대 가로 overflow 없음`, timeOverflow);
  await page.screenshot({path:path.join(os.tmpdir(), `cottage-member-intro-time-${width}.png`), fullPage:true});

  await page.locator('#introWizardNextBtn').click();
  check(`${width}px: 타 회원 커스텀 유형 공유`, await page.locator('[data-group="preferredGameTypes"] input[value="협력추리"]').count() === 1
    && await page.locator('[data-group="avoidGameTypes"] input[value="계산압박"]').count() === 1);
  await page.locator('#introPreferredCustom').fill('워게임');
  await page.locator('[data-add-custom="preferredGameTypes"]').click();
  await page.locator('#introAvoidCustom').fill('복잡한 계산');
  await page.locator('[data-add-custom="avoidGameTypes"]').click();
  await page.locator('#introWizardNextBtn').click();
  await page.locator('#introWizardNextBtn').click();
  await page.locator('#introSubmitBtn').click();
  check(`${width}px: 최종 저장 payload 시간 손실 없음`, submitted?.availableTimes?.length === 17
    && submitted.availableTimes.includes('22:30') && submitted.availableTimes.includes('00:30') && submitted.availableTimes.includes('flexible'));
  check(`${width}px: 커스텀 유형 저장 payload 포함`, submitted?.preferredGameTypes?.includes('워게임') && submitted?.avoidGameTypes?.includes('복잡한 계산'));
  const firstReward = await page.locator('#introWizardReward').evaluate(node => ({hidden:node.hidden, visible:!!(node.offsetWidth || node.offsetHeight || node.getClientRects().length)}));
  check(`${width}px: 최초 지급 완료 문구`, !firstReward.hidden && firstReward.visible, JSON.stringify(firstReward));
  await page.locator('#introWizardDoneBtn').click();
  const cardText = await page.locator('.intro-card-news[data-user-id="9999999999"] .intro-card-news-body').textContent();
  check(`${width}px: 저장 후 프로필 시간 텍스트 출력`, cardText.includes(expected), cardText.replace(/\s+/g,' ').trim());

  // 같은 프로필 재수정 시 저장은 가능하되 쿠폰 완료 문구는 다시 나타나지 않는다.
  await page.locator('.intro-card-news[data-user-id="9999999999"] .intro-card-edit').click();
  for (let i = 0; i < 5; i++) await page.locator('#introWizardNextBtn').click();
  await page.locator('#introSubmitBtn').click();
  check(`${width}px: 재수정 저장 호출`, submitCount === 2);
  check(`${width}px: 재수정 쿠폰 문구 미노출`, !(await page.locator('#introWizardReward').isVisible()));

  await context.close();
}

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:EDGE});
  try {
    await verify(browser, 360, 720);
    await verify(browser, 1280, 800);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (failures) { console.error(`\n${failures} failure(s)`); process.exitCode = 1; }
  else console.log('\n=== ALL PASS ===');
})().catch(error => { console.error(error); process.exitCode = 1; });
