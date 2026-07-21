/**
 * 육안 확인용 스크린샷 — ①동호회 기록 참여자 닉네임(커서/클릭) ②복귀 링크 (읽기전용)
 *
 * 사용: node scripts/shot-cross-nav.js [baseUrl] [outDir]
 * ⚠️ 출력 폴더를 리포 안에 주지 말 것 — Live Server가 리로드해 페이지가 초기화된다.
 * supabase 쓰기는 라우트로 차단(GET만 통과).
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const { chromium } = require('../node_modules/playwright');

const BASE = (process.argv[2] || 'http://127.0.0.1:5500').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(os.tmpdir(), 'cottage-cross-nav');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });

  // 운영 DB 쓰기 차단 — GET만 통과시킨다
  await ctx.route('**://*.supabase.co/**', r => {
    if (r.request().method() === 'GET') return r.continue();
    console.log(`  [차단] ${r.request().method()} ${r.request().url().slice(0, 90)}`);
    return r.fulfill({ status: 200, body: '[]', contentType: 'application/json' });
  });

  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('  [콘솔에러]', m.text().slice(0, 160)); });

  // ── ① 동호회 기록&사진: 참여자 닉네임 ──
  await page.goto(`${BASE}/pages/club/club-history.html?from=game-reviews`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pr-sub-hd', { timeout: 15000 });
  await page.locator('.pr-sub-hd').first().click();
  await page.waitForTimeout(600);

  const tags = await page.$$eval('.pr-tag-who[data-nick]', els => els.map(e => ({
    nick: e.dataset.nick, clickable: getComputedStyle(e).cursor === 'pointer',
  })));
  console.log(`\n참여자 태그 ${tags.length}개 — 클릭 가능 ${tags.filter(t => t.clickable).length}개`);
  const byNick = new Map();
  tags.forEach(t => { if (!byNick.has(t.nick)) byNick.set(t.nick, t.clickable); });
  [...byNick].forEach(([n, c]) => console.log(`  ${c ? '👆' : '  '} ${n}`));

  const backText = await page.$eval('.cross-back-link', e => e.textContent).catch(() => null);
  console.log(`\n복귀 링크(club-history): ${backText ? `"${backText}"` : '❌ 없음'}`);
  await page.screenshot({ path: path.join(OUT, '1-club-history.png'), fullPage: false });

  // 실제로 눌러 보드가 뜨는가
  const target = await page.$('.pr-tag-who[data-nick]');
  if (target) {
    await target.click();
    await page.waitForTimeout(1500);
    const panel = await page.$('.profile-panel, #profilePanel, .pp-panel');
    console.log(`닉네임 클릭 → 보드 패널 ${panel ? '✅ 열림' : '🔴 안 열림'}`);
    await page.screenshot({ path: path.join(OUT, '2-board-opened.png') });
  }

  // ── ①-b ⋯ 메뉴: 캡션 복사 항목 + 스크롤 추종 ──
  // 보드 패널이 떠 있으면 클릭이 가로막힌다 — 닫으려 애쓰지 말고 새로 연다
  await page.goto(`${BASE}/pages/club/club-history.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pr-sub-hd', { timeout: 15000 });
  await page.locator('.pr-sub-hd').first().click();
  await page.waitForTimeout(600);

  const moreBtn = await page.$('.pr-rec-more-btn');
  if (moreBtn) {
    await moreBtn.click();
    await page.waitForTimeout(400);
    const items = await page.$$eval('.pr-rec-more.is-open .pr-rec-more-menu button', els => els.map(e => e.textContent.trim()));
    console.log(`\n⋯ 메뉴 항목: ${JSON.stringify(items)}`);
    const cap = await page.$eval('.pr-rec-more.is-open .pr-rec-caption-action', e => e.dataset.caption).catch(() => null);
    console.log(`캡션 데이터: ${cap ? `${cap.split('\n').length}줄 / 첫 줄 "${cap.split('\n')[0]}"` : '❌ 없음'}`);
    await page.screenshot({ path: path.join(OUT, '4-more-menu.png') });

    // 메뉴는 페이지에 붙어야 한다 — fixed면 스크롤을 쫓아다니고 헤더 위로 떠오른다
    const posMode = await page.$eval('.pr-rec-more.is-open .pr-rec-more-menu',
      e => getComputedStyle(e).position);
    console.log(`메뉴 배치: ${posMode} ${posMode === 'absolute' ? '✅ 페이지에 붙음' : '🔴 화면에 고정(fixed)'}`);

    // 스크롤해도 버튼과의 상대 위치가 그대로여야 한다
    const before = await page.evaluate(() => {
      const b = document.querySelector('.pr-rec-more.is-open .pr-rec-more-btn').getBoundingClientRect();
      const m = document.querySelector('.pr-rec-more.is-open .pr-rec-more-menu').getBoundingClientRect();
      return { btn: b.top, menu: m.top };
    });
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const mo = document.querySelector('.pr-rec-more.is-open');
      if (!mo) return null;
      const b = mo.querySelector('.pr-rec-more-btn').getBoundingClientRect();
      const m = mo.querySelector('.pr-rec-more-menu').getBoundingClientRect();
      return { btn: b.top, menu: m.top };
    });
    if (!after) console.log('스크롤 후 메뉴가 닫혔다 (버튼이 화면 밖으로 나갔을 때의 정상 동작)');
    else {
      const dBtn = Math.round(after.btn - before.btn), dMenu = Math.round(after.menu - before.menu);
      console.log(`스크롤 150px → 버튼 ${dBtn}px 이동 / 메뉴 ${dMenu}px 이동 ` +
        `${Math.abs(dBtn - dMenu) <= 1 ? '✅ 함께 움직인다' : '🔴 따로 논다(메뉴가 화면에 고정)'}`);
    }
    await page.screenshot({ path: path.join(OUT, '5-after-scroll.png') });

    // 🚨 핵심 경계: 카드 **마지막 행**의 메뉴. 아래로 펴면 카드의 overflow:hidden에 잘린다
    await page.evaluate(() => document.body.click());
    // 잘림이 실제로 일어나는 자리는 **카드의 맨 마지막 행**뿐이다(그 위는 카드 안에 여유가 있다).
    // 그래서 마지막 날짜 블록을 펼치고 그 마지막 행을 고른다 — 아무 행이나 잡으면
    // 「안 잘림」이 나와도 경계를 통과한 게 아니다(1차 시도가 그랬다: 카드 밖으로 -754px).
    await page.evaluate(() => {
      const subs = [...document.querySelectorAll('.pr-sub-session')];
      subs.forEach(s => s.classList.remove('is-open'));
      subs[subs.length - 1]?.classList.add('is-open');
    });
    await page.waitForTimeout(300);
    const last = (await page.$$('.pr-sub-session.is-open .pr-rec-more-btn')).slice(-1)[0];
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await page.waitForTimeout(400);
    // 🚨 판정은 「카드를 넘었는가」가 아니라 **「실제로 보이는가」**다.
    //    카드를 넘어도 안 잘리는 게 지금 설계이므로, 넘은 부분이 화면에 그려지는지를 본다
    //    (elementFromPoint로 메뉴 맨 아랫줄을 찍어 그 지점의 주인이 메뉴인지 확인).
    const clip = await page.evaluate(() => {
      const mo = document.querySelector('.pr-rec-more.is-open');
      const menu = mo.querySelector('.pr-rec-more-menu');
      const card = mo.closest('.pr-session');
      const m = menu.getBoundingClientRect(), c = card.getBoundingClientRect();
      const probeY = m.bottom - 6, probeX = m.left + m.width / 2;
      const hit = document.elementFromPoint(probeX, probeY);
      return {
        pastCardPx: Math.round(m.bottom - c.bottom),
        lastRowVisible: !!(hit && menu.contains(hit)),
        menuH: Math.round(m.height),
      };
    });
    console.log(`마지막 행 메뉴: 높이 ${clip.menuH}px / 카드 경계 대비 ${clip.pastCardPx}px / ` +
      `맨 아랫줄 ${clip.lastRowVisible ? '✅ 보인다' : '🔴 안 보인다(잘림)'}`);
    await page.screenshot({ path: path.join(OUT, '6-last-row-menu.png') });

    // 🚨 사용자가 실제로 잡은 장면 재현: 로그인 상태에선 메뉴가 6줄(좋아요·궁금해요·게임평·사진·
    //    수정·삭제·캡션)이라 훨씬 길다. 헤드리스는 비로그인이라 1줄뿐이므로 **일부러 늘려** 잰다.
    //    이걸 안 하면 「짧아서 안 잘린 것」을 「안 잘린다」로 오독한다(1차 판정이 그랬다).
    await page.evaluate(() => {
      const menu = document.querySelector('.pr-rec-more.is-open .pr-rec-more-menu');
      for (let i = 0; i < 6; i++) {
        const b = document.createElement('button');
        b.className = 'pr-rec-add-action';
        b.textContent = `테스트 항목 ${i + 1}`;
        menu.appendChild(b);
      }
      // 🚨 elementFromPoint는 **뷰포트 밖이면 null**이다 — 그걸 「잘림」으로 읽어 한 번 오진했다.
      //    찍기 전에 메뉴 바닥을 화면 안으로 들여놓는다
      const m = menu.getBoundingClientRect();
      if (m.bottom > innerHeight - 10) window.scrollBy(0, m.bottom - innerHeight + 30);
    });
    await page.waitForTimeout(300);
    const stress = await page.evaluate(() => {
      const mo = document.querySelector('.pr-rec-more.is-open');
      const menu = mo.querySelector('.pr-rec-more-menu');
      const m = menu.getBoundingClientRect();
      const card = mo.closest('.pr-session').getBoundingClientRect();
      // 자르는 조상이 있는지도 함께 본다(잘림의 진짜 원인은 조상의 overflow다)
      const clippers = [];
      for (let el = menu.parentElement; el && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') clippers.push(el.className);
      }
      const hit = document.elementFromPoint(m.left + m.width / 2, m.bottom - 6);
      return { menuH: Math.round(m.height), pastCardPx: Math.round(m.bottom - card.bottom),
               inViewport: m.bottom <= innerHeight, clippers,
               lastRowVisible: !!(hit && menu.contains(hit)) };
    });
    console.log(`  ↳ 7줄로 늘렸을 때: 높이 ${stress.menuH}px / 카드 경계를 ${stress.pastCardPx}px 넘음 / ` +
      `자르는 조상 ${stress.clippers.length ? '🔴 ' + JSON.stringify(stress.clippers) : '✅ 없음'} / ` +
      `맨 아랫줄 ${stress.lastRowVisible ? '✅ 보인다' : (stress.inViewport ? '🔴 가려졌다' : '⚠️ 화면 밖이라 판정 불가')}`);
    await page.screenshot({ path: path.join(OUT, '7-tall-menu.png') });
  } else {
    console.log('\n🔴 ⋯ 메뉴 버튼을 못 찾았다 — 캡션 항목 판정 불가');
  }

  // ── ② 플레이기록: 복귀 링크 ──
  const page2 = await ctx.newPage();
  await page2.goto(`${BASE}/pages/game/game-reviews.html?from=club-history`, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(3500);
  const back2 = await page2.$eval('.cross-back-link', e => ({ t: e.textContent, href: e.getAttribute('href') })).catch(() => null);
  console.log(`복귀 링크(game-reviews): ${back2 ? `"${back2.t}" → ${back2.href}` : '❌ 없음'}`);
  await page2.screenshot({ path: path.join(OUT, '3-game-reviews.png') });

  // 복귀 링크 없는 정상 진입(파라미터 없음)에는 안 떠야 한다
  const page3 = await ctx.newPage();
  await page3.goto(`${BASE}/pages/game/game-reviews.html`, { waitUntil: 'domcontentloaded' });
  await page3.waitForTimeout(3000);
  console.log(`파라미터 없이 진입 → 복귀 링크 ${await page3.$('.cross-back-link') ? '🔴 떴다(오작동)' : '✅ 없음'}`);

  await browser.close();
  console.log(`\n스크린샷 → ${OUT}`);
  process.exit(0);
})();
