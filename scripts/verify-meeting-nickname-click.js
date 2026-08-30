// 플래너 참여자 카드 클릭 분리 검증: 닉네임→내보드, 본문→모임 보드, 수정/삭제 독립.
// 운영 DB 쓰기는 전부 차단하고 meeting GET 응답만 고정한다.
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'http://127.0.0.1:8768';
const DATE = '2026-08-29';
const UID = '__nickname_click_ui__';
let failures = 0;

function check(label, ok) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

function server() {
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
    const file = path.resolve(ROOT, `.${pathname}`);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const type = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type':type});
    fs.createReadStream(file).pipe(res);
  });
}

function vote() {
  return {
    vote_date:DATE, user_id:UID, nickname:'닉네임검증', time_start:10, time_end:18,
    guest_count:0, game_style:'strategy', game_depth:'deep',
    play_traits:['new_game_ok'], recruitment_message:'클릭 분리 검증',
  };
}

async function setSpies(page) {
  await page.evaluate(() => {
    window.__profileCall = null;
    window.__personalCall = null;
    window.__editCall = null;
    window.openOtherProfileSheet = uid => { window.__profileCall = uid; };
    window.openOtherMeetingSheet = (uid, opts) => { window.__meetingCall = {uid, ...opts}; };
    window.openDateScheduleModal = (uid, date) => { window.__personalCall = {uid, date}; };
  });
}

async function assertNickname(page, root, label) {
  await page.locator(`${root} .sched-bar-name[data-uid="${UID}"]`).first().click();
  const state = await page.evaluate(() => ({profile:window.__profileCall, personal:window.__personalCall}));
  check(`${label}: 닉네임은 내보드만 연다`, state.profile === (NEG ? '__negative__' : UID) && state.personal === null, JSON.stringify(state));
}

async function assertCard(page, root, label) {
  await page.evaluate(() => { window.__profileCall = null; window.__personalCall = null; });
  const card = page.locator(`${root} .sched-bar-item[data-uid="${UID}"]`).first();
  const expectedDate = await card.getAttribute('data-date');
  const box = await card.boundingBox();
  await card.click({position:{x:12, y:Math.max(12, box.height - 12)}});
  const state = await page.evaluate(() => ({profile:window.__profileCall, personal:window.__personalCall, meeting:window.__meetingCall}));
  check(`${label}: 카드 본문은 모임 보드만 연다`, state.profile === null && state.personal === null && state.meeting?.uid === UID && state.meeting?.focusDate === expectedDate);
}

async function verify(width, height, browser) {
  const context = await browser.newContext({viewport:{width, height}});
  await context.addInitScript(({uid}) => {
    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args) { super(...(args.length ? args : ['2026-08-29T12:00:00+09:00'])); }
      static now() { return new RealDate('2026-08-29T12:00:00+09:00').getTime(); }
    }
    window.Date = FixedDate;
    localStorage.setItem('kakao_user', JSON.stringify({id:uid, nickname:'닉네임검증', kakaoNickname:'닉네임검증'}));
  }, {uid:UID});
  const page = await context.newPage();
  await page.route('**/*', route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname.endsWith('.supabase.co') && !['GET','HEAD','OPTIONS'].includes(req.method())) {
      route.abort('blockedbyclient'); return;
    }
    if (url.pathname.includes('/rest/v1/meeting_votes')) {
      route.fulfill({status:200, contentType:'application/json', body:JSON.stringify([vote()])}); return;
    }
    if (url.pathname.includes('/rest/v1/meeting_vote_games')) {
      route.fulfill({status:200, contentType:'application/json', body:'[]'}); return;
    }
    route.continue();
  });

  await page.goto(`${ORIGIN}/pages/club/club-schedule.html?dev=3`, {waitUntil:'networkidle'});
  await page.locator(`.sched-bar-item[data-uid="${UID}"]`).first().waitFor();
  await setSpies(page);
  await assertNickname(page, 'body', `${width}px 본 플래너`);
  await assertCard(page, 'body', `${width}px 본 플래너`);
  await page.evaluate(() => { window.__personalCall = null; });
  await page.locator(`.sched-bar-item[data-uid="${UID}"] .sched-bar-edit-btn`).first().click();
  check(`${width}px 본 플래너: 수정은 카드 상세를 열지 않는다`, await page.locator('#schedMultiOverlay').isVisible() && await page.evaluate(() => window.__personalCall === null));
  await page.locator('#smClose').click();
  let plannerDelete = false;
  page.once('dialog', async dialog => { plannerDelete = true; await dialog.dismiss(); });
  await page.locator(`.sched-bar-item[data-uid="${UID}"] .sched-bar-del-btn`).first().click();
  check(`${width}px 본 플래너: 삭제는 카드 상세를 열지 않는다`, plannerDelete && await page.evaluate(() => window.__personalCall === null));

  await page.goto(`${ORIGIN}/index.html`, {waitUntil:'networkidle'});
  await page.waitForFunction(() => typeof window.buildBarsInCard === 'function');
  await setSpies(page);
  await page.evaluate(v => {
    window.CottageDB = window.CottageDB || {};
    window.CottageDB.getMeetingVotes = async () => [v];
    window.CottageDB.getMeetingVoteGames = async () => [];
    window.CottageDB.sumPartySize = rows => rows.length;
    window.CottageDB.sumWeeklyPartySize = rows => rows.length;
    window.CottageDB.trackEvent = () => {};
    window.dispatchEvent(new CustomEvent('cottage-meeting-changed'));
  }, vote());
  await page.locator(`#meetingPreview .sched-bar-item[data-uid="${UID}"]`).waitFor();
  await assertNickname(page, '#meetingPreview', `${width}px 홈 미리보기`);
  await assertCard(page, '#meetingPreview', `${width}px 홈 미리보기`);
  await page.evaluate(() => {
    window.__personalCall = null;
    window.__openPlannerFor = (date, edit) => { window.__editCall = {date, edit}; };
  });
  await page.locator(`#meetingPreview .sched-bar-edit-btn`).click();
  check(`${width}px 홈 미리보기: 수정은 카드 상세를 열지 않는다`, await page.evaluate(() => window.__editCall?.edit === true && window.__personalCall === null));
  let homeDelete = false;
  page.once('dialog', async dialog => { homeDelete = true; await dialog.dismiss(); });
  await page.locator(`#meetingPreview .sched-bar-del-btn`).click();
  check(`${width}px 홈 미리보기: 삭제는 카드 상세를 열지 않는다`, homeDelete && await page.evaluate(() => window.__personalCall === null));

  await page.evaluate(v => {
    window.__profileCall = null;
    window.__personalCall = null;
    window.openDatePreviewModal(v.vote_date, [v], [], v, () => {});
  }, vote());
  await assertNickname(page, '#__ddModal', `${width}px 하루치 미리보기`);
  await assertCard(page, '#__ddModal', `${width}px 하루치 미리보기`);
  await page.evaluate(() => {
    window.__personalCall = null;
    window.openPlannerModal = opts => { window.__editCall = opts; };
  });
  await page.locator('#__ddModal .sched-bar-edit-btn').click();
  check(`${width}px 하루치 미리보기: 수정은 카드 상세를 열지 않는다`, await page.evaluate(date => window.__editCall?.edit === date && window.__personalCall === null, DATE));

  await context.close();
}

(async () => {
  const app = server();
  await new Promise((resolve, reject) => app.listen(8768, '127.0.0.1', error => error ? reject(error) : resolve()));
  const browser = await chromium.launch({headless:true, executablePath:EDGE});
  try {
    await verify(360, 740, browser);
    await verify(1280, 800, browser);
  } finally {
    await browser.close();
    await new Promise(resolve => app.close(resolve));
  }
  if (NEG) console.log(failures ? '\nPASS negative control detected failures' : '\nFAIL negative control did not fail');
  else console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
  process.exit(NEG ? (failures ? 0 : 1) : (failures ? 1 : 0));
})().catch(error => { console.error(error); process.exit(1); });
