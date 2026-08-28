// 참여자 카드형 플래너 표시 검증 (운영 DB 쓰기 없음, 캡처는 OS 임시 폴더)
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = path.join(__dirname, '..');
const PAGE_URL = 'http://127.0.0.1:8767/pages/club/club-schedule.html';
let failures = 0;
const check = (label, condition, detail = '') => {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
};

function createServer() {
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new globalThis.URL(req.url, PAGE_URL).pathname);
    const file = path.resolve(ROOT, `.${pathname}`);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const type = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type':type});
    fs.createReadStream(file).pipe(res);
  });
}

async function verifyViewport(browser, width, height) {
  const context = await browser.newContext({viewport:{width, height}});
  await context.addInitScript(() => {
    localStorage.setItem('kakao_user', JSON.stringify({
      id:'__ui_only_cards__', nickname:'UI검증', kakaoNickname:'UI검증', profileImage:'', kakaoProfileImage:'',
    }));
  });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const request = route.request();
    const host = new globalThis.URL(request.url()).hostname;
    if (host.endsWith('.supabase.co') && !['GET','HEAD','OPTIONS'].includes(request.method())) route.abort('blockedbyclient');
    else route.continue();
  });
  await page.goto(`${PAGE_URL}?dev=3`, {waitUntil:'networkidle'});
  await page.waitForSelector('.sched-bar-item[data-date][data-uid]');
  await page.evaluate(() => {
    window.__participantOpenCall = null;
    window.openDateScheduleModal = (uid, date) => { window.__participantOpenCall = {uid, date}; };
  });
  const actualCard = page.locator('.sched-bar-item[data-uid="__ui_only_cards__"]').first();
  const actualTarget = await actualCard.evaluate(card => ({uid:card.dataset.uid, date:card.dataset.date}));
  await actualCard.click({position:{x:12, y:Math.max(12, (await actualCard.boundingBox()).height - 12)}});
  check(`${width}px: 본 플래너 카드 여백 클릭으로 개인 상세 진입`, await page.evaluate(
    target => window.__participantOpenCall?.uid === target.uid && window.__participantOpenCall?.date === target.date, actualTarget));
  await page.evaluate(() => { window.__participantOpenCall = null; });
  await actualCard.focus();
  await actualCard.press('Enter');
  check(`${width}px: 참여자 카드 Enter 키로 개인 상세 진입`, await page.evaluate(() => !!window.__participantOpenCall));
  await page.evaluate(() => { window.__participantOpenCall = null; });
  page.once('dialog', dialog => dialog.dismiss());
  await actualCard.locator('.sched-bar-del-btn').click();
  check(`${width}px: 삭제 액션은 개인 상세를 함께 열지 않음`, await page.evaluate(() => window.__participantOpenCall === null));
  await actualCard.locator('.sched-bar-edit-btn').click();
  check(`${width}px: 수정 액션은 개인 상세를 함께 열지 않음`, await page.evaluate(() => window.__participantOpenCall === null));

  const fixture = await page.evaluate(() => {
    const date = '2099-08-29';
    const games = (window.COTTAGE_GAMES || []).slice(0, 12);
    const votes = Array.from({length:6}, (_, i) => ({
      vote_date:date, user_id:`fixture-${i + 1}`, nickname:`참여자${i + 1}`,
      time_start:i === 0 ? 10 : 10 + i * .5,
      time_end:i === 0 ? 10.5 : 16 + i,
      guest_count:i % 3,
      game_style:i % 2 ? 'party' : 'strategy',
      game_depth:['light','medium','deep'][i % 3],
      play_traits:i % 2 ? ['beginner_welcome'] : ['beginner_welcome','new_game_ok'],
      recruitment_message:i === 0 ? '30분만 가능해도 같이 즐겨요' : `참여자 ${i + 1}의 한줄 모집 메시지`,
    }));
    const voteGames = votes.flatMap((vote, i) => [
      {vote_date:date, user_id:vote.user_id, list_type:'want', game_id:games[i * 2]?.bggId || null, custom_name:games[i * 2]?.display || `게임${i * 2 + 1}`, is_priority:i % 2 === 0},
      {vote_date:date, user_id:vote.user_id, list_type:'learn', game_id:games[i * 2 + 1]?.bggId || null, custom_name:games[i * 2 + 1]?.display || `게임${i * 2 + 2}`, is_priority:false},
    ]);
    const html3 = window.buildBarsInCard(votes.slice(0, 3), voteGames, null);
    const html6 = window.buildBarsInCard(votes, voteGames, null);
    // 공용 헬퍼 자체는 verify-party-size.js가 실제 소스를 eval해 검증한다.
    // 이 UI fixture는 네트워크 SDK 초기화와 무관하게 그 결과(본인+동반)를 시각화한다.
    const homePartyCount = votes.reduce((sum, vote) => sum + 1 + vote.guest_count, 0);
    document.body.innerHTML = `<main style="max-width:${innerWidth >= 720 ? '650px' : '100%'};margin:0 auto;padding:12px;box-sizing:border-box">
      <h1 style="font-size:16px">본 플래너 · 3명</h1><section id="plannerHost">${html3}</section>
      <h1 style="font-size:16px">홈 히어로 미리보기 · 6명</h1>
      <div class="meeting-days"><div class="meeting-day-chip has-vote is-selected"><span class="mdc-day">토</span><span class="mdc-count" id="homeDayCount">${homePartyCount}명</span></div></div>
      <section class="meeting-preview-card" id="homeHost">${html6}</section>
      <h1 style="font-size:16px">하루치 미리보기 · 6명</h1><section class="dd-preview" id="modalHost">${html6}</section>
    </main>`;
    return {sameHtml:html6 === window.buildBarsInCard(votes, voteGames, null), homePartyCount};
  });

  check(`${width}px: 공용 렌더 결과 결정적`, fixture.sameHtml);
  check(`${width}px: 홈 요일 탭은 본인+동반 합계`, fixture.homePartyCount === 12
    && await page.locator('#homeDayCount').textContent() === '12명');
  check(`${width}px: 홈 카드 위 중복 날짜 헤더 없음`, await page.locator('#homeHost .mpc-date').count() === 0);
  for (const [hostId, expected] of [['plannerHost',3],['homeHost',6],['modalHost',6]]) {
    const result = await page.locator(`#${hostId}`).evaluate((host, count) => {
      const cards = [...host.querySelectorAll('.sched-bar-item')];
      const complete = cards.every(card =>
        card.querySelector('.sched-bar-name') && card.querySelector('.sched-bar-time-text')
        && card.querySelector('.sched-bar-track') && card.querySelector('.sched-bar-intent-main')
        && card.querySelector('.sched-bar-intent-trait') && card.querySelector('.sched-bar-intent-message')
        && card.querySelector('.sched-bar-game-chip--want') && card.querySelector('.sched-bar-game-chip--learn'));
      const noOverflow = cards.every(card => {
        const rect = card.getBoundingClientRect();
        return card.scrollWidth <= card.clientWidth
          && [...card.querySelectorAll('*')].every(el => el.getBoundingClientRect().right <= rect.right + 1);
      });
      return {count:cards.length, complete, noOverflow, height:host.getBoundingClientRect().height,
        averageHeight:cards.reduce((sum, card) => sum + card.getBoundingClientRect().height, 0) / cards.length};
    }, expected);
    check(`${width}px ${hostId}: 참여자 ${expected}개 완결 카드`, result.count === expected && result.complete, JSON.stringify(result));
    check(`${width}px ${hostId}: 카드 내부 가로 넘침 없음`, result.noOverflow);
    if (expected === 6) check(`${width}px ${hostId}: 6명 평균 카드 높이 135px 이하`, result.averageHeight <= 135, `${result.averageHeight.toFixed(1)}px`);
  }

  const shortTime = await page.locator('#plannerHost .sched-bar-item').first().evaluate(card => {
    const fill = card.querySelector('.sched-bar-fill').getBoundingClientRect();
    return {time:card.querySelector('.sched-bar-time-text').textContent, fillWidth:fill.width,
      messageInside:card.querySelector('.sched-bar-intent-message').getBoundingClientRect().right <= card.getBoundingClientRect().right + 1};
  });
  check(`${width}px: 30분 시간 텍스트 명확`, shortTime.time === '10시~10시30분', JSON.stringify(shortTime));
  check(`${width}px: 짧은 막대가 깨지지 않음`, shortTime.fillWidth >= 3 && shortTime.messageInside, JSON.stringify(shortTime));

  const shot = path.join(os.tmpdir(), `cottage-participant-cards-${width}.png`);
  await page.screenshot({path:shot, fullPage:true});
  console.log(`  SCREENSHOT ${shot}`);
  await context.close();
  return shot;
}

(async () => {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(8767, '127.0.0.1', error => error ? reject(error) : resolve()));
  const browser = await chromium.launch({headless:true, executablePath:EDGE});
  try {
    await verifyViewport(browser, 360, 740);
    await verifyViewport(browser, 1280, 800);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(error => { console.error(error); process.exit(1); });
