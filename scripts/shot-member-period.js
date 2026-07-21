// 회원 탭 펼침 기간 선택 — 화면 층 확인 + 스크린샷 (읽기 전용)
//
//   node scripts/shot-member-period.js [baseUrl]
//   node scripts/shot-member-period.js [baseUrl] --negctl
//
// verify-member-period.js가 **계산**을 봤다면 이건 **화면**을 본다 — 표·토글 버튼 숫자·기준
// 표기 셋이 같은 기간을 말하는지, 정렬/필터/더보기 뒤에도 살아남는지. assert가 전부 PASS인
// 뒤에 스크린샷에서 잡힌 사고가 이 리포에만 셋이라(#8·#21·#24) 이미지도 함께 남긴다.
//
// 🚨 출력은 **리포 밖**(OS 임시폴더)이다 — 리포 안에 쓰면 Live Server가 리로드를 걸어
//    페이지가 초기화되고, 증상이 "탭이 안 열림"으로 나타나 스크립트를 고치게 된다.
// 🚨 읽기 전용 보장: 가짜 kakao_user를 심으면 사이트 코드가 진짜 쓰기를 시도한다
//    (2026-07-19에 운영 DB가 실제로 오염됐다). GET 외 전부 abort한다.
const { chromium } = require('../node_modules/playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:5500').replace(/\/$/, '');
const NEGCTL = process.argv.includes('--negctl');
const UID = '4916417947';
const OUT = path.join(os.tmpdir(), 'cottage-shot-member-period');

let fail = 0;
const ck = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const blocked = [];
  let reads = 0;
  await ctx.route('**://*.supabase.co/**', r => {
    if (r.request().method() === 'GET') { reads++; return r.continue(); }
    blocked.push(r.request().method()); return r.abort();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(BASE + '/pages/admin/requests-admin.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(u => {
    localStorage.setItem('kakao_user', JSON.stringify({ id: u, nickname: '호핀' }));
    localStorage.setItem(`cottage_sess_${u}`, JSON.stringify({ visitCount: 5, timeSec: 0 }));
  }, UID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);

  // 회원 탭으로. 🚨 탭 키는 **member**(단수)다 — 'members'로 쓰면 클릭이 아무 일도 안 하는데
  //    querySelector는 숨은 요소도 찾아주므로 "카드 있음 = 탭 열림"으로 오판한다.
  //    실제로 그렇게 **숨겨진 패널을 재면서 전부 통과**로 보고한 적이 있다(폭 0px).
  //    그래서 존재가 아니라 **보이는가**로 확인한다.
  await page.evaluate(() => document.querySelector('.admin-analysis-tab[data-tab="member"]')?.click());
  await page.waitForTimeout(1200);
  const tabOk = await page.evaluate(() => {
    const c = document.querySelector('#membersBody .admin-member-card');
    return !!c && !!c.offsetParent && c.getBoundingClientRect().width > 0;
  });
  if (!tabOk) {
    // 추측으로 계속하지 않는다 — 실제 탭 키와 패널 상태를 보고 중단한다.
    const info = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll('.admin-analysis-tab')].map(t => t.dataset.tab),
      panels: [...document.querySelectorAll('.admin-tab-panel')].map(p => `${p.id}:${p.classList.contains('is-active') ? 'active' : 'hidden'}`),
      cards: document.querySelectorAll('#membersBody .admin-member-card').length,
    }));
    console.log('🔴 회원 탭이 안 열렸다 (카드는 DOM에', info.cards, '개 있으나 안 보임)');
    console.log('   탭 키:', info.tabs.join(', '));
    console.log('   패널:', info.panels.join(', '));
    await page.screenshot({ path: path.join(OUT, 'fail-no-cards.png'), fullPage: true });
    await browser.close(); process.exit(1);
  }
  ck(true, '회원 탭이 실제로 열렸다(카드가 보인다)');

  // 펼침 버튼이 있는 첫 카드를 연다(더보기로 전부 보이게 한 뒤)
  await page.evaluate(() => window.expandVisitorMore?.());
  await page.waitForTimeout(400);
  // 🚨 아무 카드나 고르지 않는다 — 첫 카드가 「페이지 1개」짜리면 표가 한 줄이라
  //    단조성도 접힘도 아무것도 검증되지 않는다(첫 작성판이 그래서 통과만 했다).
  //    **페이지 수가 가장 많은 카드**를 고른다.
  const opened = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#membersBody .admin-member-card')]
      .map(c => ({ c, n: parseInt((c.querySelector('.admin-visitor-pages-btn')?.textContent.match(/(\d+)개/) || [])[1] || '0', 10) }))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    if (!cards.length) return null;
    const card = cards[0].c;
    card.querySelector('.admin-visitor-pages-btn').click();
    card.dataset.shotTarget = '1';
    return { type: card.dataset.visitorType, pages: cards[0].n, name: card.querySelector('.admin-member-name')?.textContent.trim().slice(0, 20) };
  });
  ck(!!opened, `펼침 버튼이 있는 카드를 열었다 — ${opened ? `${opened.type} / ${opened.name} / 페이지 ${opened.pages}개` : '없음'}`);
  if (!opened) { await browser.close(); process.exit(1); }
  // 표본이 빈약하면 "통과"가 아무 뜻이 없다고 스스로 말한다(0건 검사의 교훈).
  ck(opened.pages >= 3, `표본 충분 — 이 카드의 전 기간 페이지 ${opened.pages}종 (3 미만이면 기간별 차이가 안 드러난다)`);

  const readPanel = () => page.evaluate(() => {
    const card = document.querySelector('.admin-member-card[data-shot-target="1"]');
    const panel = card.querySelector('.admin-visitor-pages');
    const btn = card.querySelector('.admin-visitor-pages-btn');
    const bodyRows = [...panel.querySelectorAll('tbody tr')];
    const restM = bodyRows.map(r => (r.children[0]?.textContent.match(/^외 (\d+)개 페이지$/) || [])[1]).find(Boolean);
    return {
      hidden: panel.hasAttribute('hidden'),
      btnText: btn?.textContent.trim() || '',
      btnN: parseInt((btn?.textContent.match(/(\d+)개/) || [])[1] ?? '-1', 10),
      active: panel.querySelector('.admin-vp-period-btn.is-active')?.textContent.trim() || '',
      periodBtns: [...panel.querySelectorAll('.admin-vp-period-btn')].map(b => b.textContent.trim()),
      note: panel.querySelector('div[title]')?.textContent.trim() || '',
      rowCount: bodyRows.filter(r => !/^외 \d+개 페이지$/.test(r.children[0]?.textContent || '')).length,
      rest: Number(restM || 0),
      empty: !!panel.querySelector('.admin-vp-empty'),
      emptyText: panel.querySelector('.admin-vp-empty')?.textContent.trim() || '',
    };
  });

  console.log('\n=== ① 기간 4종 — 표·버튼·기준 표기가 같은 기간을 말하는가 ===');
  const seen = {};
  for (const [key, label] of [['all', '전 기간'], ['today', '오늘'], ['yesterday', '어제'], ['7d', '7일']]) {
    await page.evaluate(k => document.querySelector(`.admin-member-card[data-shot-target="1"] .admin-vp-period-btn[data-vp-period="${k}"]`)?.click(), key);
    await page.waitForTimeout(250);
    const s = await readPanel();
    seen[key] = s;
    ck(s.active === label, `${label}: 고른 버튼이 활성 (활성=${s.active || '없음'})`);
    ck(s.note.includes(label), `${label}: 기준 표기가 그 기간을 말한다 — "${s.note.slice(0, 40)}"`);
    const shown = s.empty ? 0 : s.rowCount + s.rest;
    const expectN = NEGCTL && key === 'today' ? s.btnN + 1 : s.btnN;
    ck(shown === expectN, `${label}: 표 ${shown}줄 = 버튼 「${s.btnText}」의 ${expectN}개`);
    ck(!s.hidden, `${label}: 패널이 열린 채 유지된다`);
    if (s.empty) ck(/없습니다/.test(s.emptyText), `${label}: 0건이 빈 표가 아니라 문구로 — "${s.emptyText}"`);
    await page.evaluate(() => document.querySelector('.admin-member-card[data-shot-target="1"]')?.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: path.join(OUT, `1280-${key}.png`), fullPage: false });
  }
  ck(seen.all.periodBtns.join(',') === '전 기간,오늘,어제,7일', `기간 버튼 4개가 순서대로 — ${seen.all.periodBtns.join(' / ')}`);

  console.log('\n=== ② 단조성 (화면 숫자 기준) ===');
  ck(seen.today.btnN <= seen['7d'].btnN && seen['7d'].btnN <= seen.all.btnN,
    `페이지 수 단조 감소 — 오늘 ${seen.today.btnN} ≤ 7일 ${seen['7d'].btnN} ≤ 전 기간 ${seen.all.btnN}`);

  console.log('\n=== ③ 회귀 — 정렬·필터·더보기 뒤에도 살아남는가 ===');
  await page.evaluate(() => document.querySelector('.admin-member-card[data-shot-target="1"] .admin-vp-period-btn[data-vp-period="7d"]')?.click());
  await page.waitForTimeout(200);
  for (const [fn, arg, label] of [
    ['applyVisitorSort', 'total', '정렬(누적 시간순)'],
    ['applyVisitorFilter', 'all', '필터(전체)'],
    ['expandVisitorMore', null, '더보기'],
  ]) {
    await page.evaluate(([f, a]) => { const g = window[f]; if (g) a === null ? g() : g(a, null); }, [fn, arg]);
    await page.waitForTimeout(300);
    const s = await readPanel();
    ck(!s.hidden && s.active === '7일', `${label} 후에도 펼침 유지 + 기간 「7일」 유지 (열림=${!s.hidden}, 기간=${s.active})`);
  }

  console.log('\n=== ④ 좁은 화면(390px) ===');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(400);
  // ⚠️ expandVisitorMore를 여기서 또 부르지 않는다 — ③에서 이미 폈고, 두 번 부르면
  //    「닫기 ▲」가 두 개 생긴다(그 함수가 기존 #visitorCloseBtn을 안 지운다).
  //    실사용에선 더보기 버튼이 스스로 숨어 두 번 못 누르므로 화면 버그는 아니다.
  const narrow = await page.evaluate(() => {
    const card = document.querySelector('.admin-member-card[data-shot-target="1"]');
    card.scrollIntoView({ block: 'center' });
    const bar = card.querySelector('.admin-vp-periods');
    const btns = [...bar.querySelectorAll('.admin-vp-period-btn')];
    return {
      barW: Math.round(bar.getBoundingClientRect().width),
      cardW: Math.round(card.getBoundingClientRect().width),
      visible: !!card.offsetParent && card.getBoundingClientRect().width > 0,
      overflow: btns.some(b => b.getBoundingClientRect().right > card.getBoundingClientRect().right + 1),
      docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  // 🚨 먼저 「보이는가」를 묻는다 — 안 보이는 요소는 폭이 0이라 넘침 검사가 **무조건 통과**한다.
  //    첫 작성판이 정확히 그렇게 0px을 통과로 보고했다.
  ck(narrow.visible, `대상 카드가 실제로 보인다 (카드 폭 ${narrow.cardW}px — 0이면 아래 검사는 무의미)`);
  ck(narrow.visible && !narrow.overflow, `기간 버튼이 카드 밖으로 안 넘침 (바 ${narrow.barW}px ≤ 카드 ${narrow.cardW}px)`);
  ck(!narrow.docOverflow, '페이지 가로 스크롤 없음');
  // 스크롤이 자리잡은 뒤에 찍는다 — 안 그러면 대상 카드가 안 담긴 이미지를 「육안 확인」이라 부르게 된다.
  await page.evaluate(() => document.querySelector('.admin-member-card[data-shot-target="1"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const inFrame = await page.evaluate(() => {
    const r = document.querySelector('.admin-member-card[data-shot-target="1"]').getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  ck(inFrame, '대상 카드가 스크린샷 화면 안에 들어왔다');
  await page.screenshot({ path: path.join(OUT, '390-7d.png'), fullPage: false });

  console.log('\n=== ⑤ 환경 ===');
  ck(errors.length === 0, `콘솔 에러 ${errors.length}건${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`);
  ck(reads > 0, `읽기 가드 부착 확인 (GET ${reads}건 통과)`);
  ck(blocked.length === 0, `차단된 쓰기 ${blocked.length}건 (0이어야 정상)`);

  await browser.close();
  console.log(`\n📸 ${OUT}`);
  console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 전부 통과');
  process.exit(0);
})();
