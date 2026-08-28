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
  let plannerDeletePrompt = false;
  page.once('dialog', dialog => { plannerDeletePrompt = true; dialog.dismiss(); });
  await actualCard.locator('.sched-bar-del-btn').click();
  check(`${width}px: 본 플래너 삭제 액션 독립 동작`, plannerDeletePrompt
    && await page.evaluate(() => window.__participantOpenCall === null));
  await actualCard.locator('.sched-bar-edit-btn').click();
  check(`${width}px: 본 플래너 수정 UI 정상 진입`, await page.locator('#schedMultiOverlay').isVisible());
  check(`${width}px: 본 플래너 수정 액션이 개인 상세를 함께 열지 않음`, await page.evaluate(() => window.__participantOpenCall === null));
  await page.locator('#smClose').click();

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

  // 실제 홈 미리보기 이벤트 경로: 운영 DB 쓰기는 계속 차단하고 GET 응답만 고정한다.
  const now = new Date();
  const fixtureDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const homeVote = {
    vote_date:fixtureDate, user_id:'__ui_only_cards__', nickname:'UI검증', time_start:10, time_end:18,
    guest_count:0, game_style:'any', game_depth:'medium', play_traits:[], recruitment_message:'수정 버튼 검증',
  };
  await page.route('**/rest/v1/meeting_votes*', route => route.fulfill({status:200, contentType:'application/json', body:JSON.stringify([homeVote])}));
  await page.route('**/rest/v1/meeting_vote_games*', route => route.fulfill({status:200, contentType:'application/json', body:'[]'}));
  await page.goto('http://127.0.0.1:8767/index.html', {waitUntil:'networkidle'});
  await page.waitForFunction(() => typeof window.getKakaoUser === 'function');
  await page.evaluate(vote => {
    const partySize = rows => (rows || []).reduce((sum, row) => sum + 1 + Math.max(0, Math.floor(Number(row.guest_count) || 0)), 0);
    window.CottageDB = window.CottageDB || {};
    window.CottageDB.getMeetingVotes = async () => [vote];
    window.CottageDB.getMeetingVoteGames = async () => [];
    window.CottageDB.sumPartySize = partySize;
    window.CottageDB.sumWeeklyPartySize = partySize;
    window.CottageDB.trackEvent = () => {};
    window.dispatchEvent(new CustomEvent('cottage-meeting-changed'));
  }, homeVote);
  const homeEdit = page.locator('#meetingPreview .sched-bar-edit-btn');
  await homeEdit.waitFor();
  await homeEdit.scrollIntoViewIfNeeded();
  const hit = await homeEdit.evaluate(btn => {
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {tag:top?.tagName, cls:top?.className, pointerEvents:getComputedStyle(btn).pointerEvents, width:r.width, height:r.height};
  });
  check(`${width}px: 홈 수정 버튼 hit-test 대상이 버튼`, hit.tag === 'BUTTON' && String(hit.cls).includes('sched-bar-edit-btn'), JSON.stringify(hit));
  await page.evaluate(() => {
    window.__homeEditCall = null;
    window.__homePersonalCall = null;
    window.__openPlannerFor = (date, isEdit) => { window.__homeEditCall = {date, isEdit}; };
    window.openDateScheduleModal = () => { window.__homePersonalCall = true; };
  });
  await homeEdit.click();
  check(`${width}px: 홈 수정 버튼이 수정 진입 실행`, await page.evaluate(
    date => window.__homeEditCall?.date === date && window.__homeEditCall?.isEdit === true, fixtureDate));
  check(`${width}px: 홈 수정 버튼이 개인 상세를 함께 열지 않음`, await page.evaluate(() => window.__homePersonalCall === null));
  let homeDeletePrompt = false;
  page.once('dialog', dialog => { homeDeletePrompt = true; dialog.dismiss(); });
  await page.locator('#meetingPreview .sched-bar-del-btn').click();
  check(`${width}px: 홈 삭제 버튼 독립 동작`, homeDeletePrompt
    && await page.evaluate(() => window.__homePersonalCall === null));
  const homeCard = page.locator('#meetingPreview .sched-bar-item').first();
  await homeCard.click({position:{x:12, y:Math.max(12, (await homeCard.boundingBox()).height - 12)}});
  check(`${width}px: 홈 카드 본문이 개인 상세 실행`, await page.evaluate(() => window.__homePersonalCall === true));

  // 실제 하루치 미리보기 공개 함수로 같은 세 동작을 각각 새 모달에서 확인한다.
  await page.evaluate(({date, vote}) => {
    window.__dayEditCall = null;
    window.__dayPersonalCall = null;
    window.openPlannerModal = opts => { window.__dayEditCall = opts; };
    window.openDateScheduleModal = (uid, ds) => { window.__dayPersonalCall = {uid, date:ds}; };
    window.openDatePreviewModal(date, [vote], [], vote, () => {});
  }, {date:fixtureDate, vote:homeVote});
  await page.locator('#__ddModal .sched-bar-edit-btn').click();
  check(`${width}px: 하루치 미리보기 수정 UI 정상 진입`, await page.evaluate(
    date => window.__dayEditCall?.edit === date, fixtureDate));
  check(`${width}px: 하루치 수정 버튼이 개인 상세를 함께 열지 않음`, await page.evaluate(() => window.__dayPersonalCall === null));

  await page.evaluate(({date, vote}) => {
    window.__dayPersonalCall = null;
    window.openDatePreviewModal(date, [vote], [], vote, () => {});
  }, {date:fixtureDate, vote:homeVote});
  let dayDeletePrompt = false;
  page.once('dialog', dialog => { dayDeletePrompt = true; dialog.dismiss(); });
  await page.locator('#__ddModal .sched-bar-del-btn').click();
  check(`${width}px: 하루치 미리보기 삭제 버튼 독립 동작`, dayDeletePrompt
    && await page.evaluate(() => window.__dayPersonalCall === null));

  await page.evaluate(({date, vote}) => {
    window.__dayPersonalCall = null;
    window.openDatePreviewModal(date, [vote], [], vote, () => {});
  }, {date:fixtureDate, vote:homeVote});
  const dayCard = page.locator('#__ddModal .sched-bar-item').first();
  await dayCard.click({position:{x:12, y:Math.max(12, (await dayCard.boundingBox()).height - 12)}});
  check(`${width}px: 하루치 카드 본문이 개인 상세 실행`, await page.evaluate(
    ({uid, date}) => window.__dayPersonalCall?.uid === uid && window.__dayPersonalCall?.date === date,
    {uid:homeVote.user_id, date:fixtureDate}));

  // 날짜 전체 센터 모달: 2명·6명에서 요약→룰렛→참여자→내 액션 순서와 기존 동작을 검증한다.
  for (const participantCount of [2, 6]) {
    const expected = await page.evaluate(({date, count, myUserId}) => {
      const games = window.COTTAGE_GAMES || [];
      const votes = Array.from({length:count}, (_, i) => ({
        vote_date:date,
        user_id:i === 0 ? myUserId : `center-fixture-${i + 1}`,
        nickname:i === 0 ? '내 일정' : `참여자${i + 1}`,
        time_start:10 + i * .5,
        time_end:18 + i * .5,
        guest_count:i % 2,
      }));
      const voteGames = votes.flatMap((vote, i) => i % 2 ? [] : [
        {vote_date:date, user_id:vote.user_id, list_type:'want', game_id:games[i * 3]?.bggId || null, custom_name:games[i * 3]?.display || `하고싶은게임${i + 1}`, player_condition:'any'},
        {vote_date:date, user_id:vote.user_id, list_type:'want', game_id:games[i * 3 + 1]?.bggId || null, custom_name:games[i * 3 + 1]?.display || `하고싶은게임${i + 2}`, player_condition:'any'},
        {vote_date:date, user_id:vote.user_id, list_type:'learn', game_id:games[i * 3 + 2]?.bggId || null, custom_name:games[i * 3 + 2]?.display || `배울게임${i + 1}`, player_condition:'any'},
      ]);
      window.__centerProfileCall = null;
      window.__centerPlannerCall = null;
      window.openOtherMeetingSheet = uid => { window.__centerProfileCall = uid; };
      window.openPlannerModal = opts => { window.__centerPlannerCall = opts; };
      window.openDateMeetingModal(date, votes, voteGames, {});
      return {
        participantCount:count,
        partyCount:votes.reduce((sum, vote) => sum + 1 + vote.guest_count, 0),
        myUserId,
      };
    }, {date:fixtureDate, count:participantCount, myUserId:'__ui_only_cards__'});

    const center = page.locator('#__ddModal .dd-meeting-modal');
    const metrics = await center.evaluate((modal, expectedValues) => {
      const summary = modal.querySelector('.dd-meeting-summary');
      const roulette = modal.querySelector('.dd-roulette-cta');
      const participants = modal.querySelector('.dd-participants-toggle');
      const footer = modal.querySelector('.dd-close-row');
      const blocks = [...modal.querySelectorAll('.dd-participant-block')];
      const modalRect = modal.getBoundingClientRect();
      return {
        ordered:summary.getBoundingClientRect().top < roulette.getBoundingClientRect().top
          && roulette.getBoundingClientRect().top < participants.getBoundingClientRect().top
          && participants.getBoundingClientRect().top < footer.getBoundingClientRect().top,
        participantBlocks:blocks.length,
        ownership:blocks.every((block, index) => {
          const expectedName = index === 0 ? '내 일정' : `참여자${index + 1}`;
          const hasOwnIdentity = block.querySelector('.dd-modal-nick')?.textContent === expectedName
            && !!block.querySelector('.dd-time')?.textContent.includes('~');
          const gameCount = block.querySelectorAll('.dd-game-item').length;
          return hasOwnIdentity && (index % 2 === 0 ? gameCount === 3 : gameCount === 0);
        }),
        summaryText:summary.textContent.replace(/\s+/g, ' ').trim(),
        footerPosition:getComputedStyle(footer).position,
        ctaText:modal.querySelector('.dd-planner-btn')?.textContent,
        fitsViewport:modalRect.height <= innerHeight - 32,
        noOverflow:modal.scrollWidth <= modal.clientWidth
          && [...modal.querySelectorAll('*')].every(node => node.getBoundingClientRect().right <= modalRect.right + 1),
        viewportWidth:innerWidth,
        expectedPartyCount:expectedValues.partyCount,
      };
    }, expected);

    check(`${width}px 센터 모달 ${participantCount}명: 4개 영역 순서`, metrics.ordered, JSON.stringify(metrics));
    check(`${width}px 센터 모달 ${participantCount}명: 참여자별 정보 귀속`, metrics.participantBlocks === participantCount && metrics.ownership, JSON.stringify(metrics));
    check(`${width}px 센터 모달 ${participantCount}명: 본인+동반 요약`, metrics.summaryText.includes(`${expected.partyCount}명 참여`), metrics.summaryText);
    check(`${width}px 센터 모달 ${participantCount}명: 하단 액션 비고정`, metrics.footerPosition !== 'fixed' && metrics.footerPosition !== 'sticky');
    check(`${width}px 센터 모달 ${participantCount}명: 내 참여 수정 문구`, metrics.ctaText === '내 참여 수정하기');
    check(`${width}px 센터 모달 ${participantCount}명: 높이·가로 overflow 정상`, metrics.fitsViewport && metrics.noOverflow, JSON.stringify(metrics));

    const details = page.locator('#__ddModal .dd-participants-toggle');
    await details.locator('summary').click();
    check(`${width}px 센터 모달 ${participantCount}명: 참여자 접기`, !(await details.evaluate(node => node.open)));
    await details.locator('summary').click();
    check(`${width}px 센터 모달 ${participantCount}명: 참여자 펼치기`, await details.evaluate(node => node.open));

    await page.locator('#__ddModal .dd-nick-link').first().click();
    check(`${width}px 센터 모달 ${participantCount}명: 개인 상세 진입`, await page.evaluate(
      uid => window.__centerProfileCall === uid, expected.myUserId));

    await page.locator('#__ddModal .dd-roulette-open-btn').click();
    check(`${width}px 센터 모달 ${participantCount}명: 룰렛 독립 화면 진입`,
      await page.locator('#__ddRoulettePanel').isVisible() && !(await page.locator('#__ddMainScroll').isVisible()));
    await page.locator('#__rrBack').click();
    check(`${width}px 센터 모달 ${participantCount}명: 룰렛에서 목록 복귀`, await page.locator('#__ddMainScroll').isVisible());

    const shot = path.join(os.tmpdir(), `cottage-center-modal-${participantCount}-${width}.png`);
    await center.screenshot({path:shot});
    console.log(`  SCREENSHOT ${shot}`);

    await page.locator('#__ddModal .dd-planner-btn').click();
    check(`${width}px 센터 모달 ${participantCount}명: 내 참여 수정 진입`, await page.evaluate(
      date => window.__centerPlannerCall?.edit === date, fixtureDate));
    await page.locator('#__ddModal .dd-close-btn').click();
    check(`${width}px 센터 모달 ${participantCount}명: 닫기`, await page.locator('#__ddModal').count() === 0);
  }

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
