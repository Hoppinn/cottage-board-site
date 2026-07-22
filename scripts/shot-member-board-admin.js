// P4 오너 전용 「회원 분석」 섹션 — 브라우저 육안/렌더 검증 (읽기 전용, DB 무변경)
//
//   node scripts/shot-member-board-admin.js [baseUrl] [outDir]
//   기본값: http://127.0.0.1:5500 , {OS 임시폴더}/cottage-member-board-admin/
//
// verify-member-board-admin.js가 "집계가 맞나"(node)를 보는 반면, 이건 **실제 렌더**를 본다 —
// ①오너로 남의 보드를 열면 「회원 분석」 카드가 뜨고 눌러서 amb 섹션이 그려지는가
// ②비오너로 같은 보드를 열면 카드가 **안 뜨는가**(오너 가드).
// 모듈이 동적 로드(kakao-auth가 member-analytics.js를 붙임)로 제때 오는지도 이걸로 잡힌다.
//
// 🚨 출력 폴더를 리포 안으로 주지 말 것 — Live Server 리로드로 죽는다(shot-admin-tabs 주석 참조).
const { chromium } = require('../node_modules/playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = (process.argv[2] || 'http://127.0.0.1:5500').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(os.tmpdir(), 'cottage-member-board-admin');
const OWNER = '4916417947';

let fail = 0;
const ck = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 1000 } });
  // 읽기 전용 강제 — 가짜 kakao_user를 심으면 사이트가 진짜 write를 시도한다(운영 DB 오염 방지).
  const blockedWrites = [];
  let allowedReads = 0;
  // 뮤테이션만 막는다. HEAD(count)·GET·OPTIONS는 읽기라 통과 — HEAD를 막으면 getMyStats의
  // count 쿼리가 실패해 패널 로드 자체가 깨진다(그래서 카드가 0으로 보였다).
  await ctx.route('**://*.supabase.co/**', r => {
    const m = r.request().method();
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(m)) {
      blockedWrites.push(`${m} ${r.request().url().split('/rest/v1/')[1] || ''}`);
      return r.abort();
    }
    allowedReads++; return r.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // 회원 자기소개 페이지 — 회원 명부가 있어 대상 회원을 고르기 쉽다.
  await page.goto(BASE + '/pages/club/club-intro.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 대상 회원 고르기 — 오너가 아닌 회원 하나(getAllProfiles).
  const target = await page.evaluate(async (owner) => {
    const ps = await window.CottageDB.getAllProfiles();
    const m = (ps || []).find(p => String(p.user_id) !== String(owner));
    return m ? { id: String(m.user_id), nick: m.nickname } : null;
  }, OWNER);
  if (!target) { console.log('🔴 비오너 회원을 못 찾음 — 판정 중단'); await browser.close(); process.exit(1); }
  console.log(`대상 회원: ${target.nick || '(닉없음)'} ${target.id.slice(0, 8)}…\n`);

  async function openBoard(selfId) {
    await page.evaluate(u => localStorage.setItem('kakao_user', JSON.stringify({ id: u, nickname: '뷰어' })), selfId);
    // 보드 그리드를 바로 연다(autoSubsheet 없이) — 실제 동선은 openOtherProfileSheet가 taste
    // 서브시트를 자동으로 열지만, 오너는 거기서 뒤로가면 이 그리드가 나오고 카드를 누른다.
    // 카드 존재·클릭·렌더를 서브시트 간섭 없이 보려고 그리드 뷰로 연다.
    await page.evaluate(id => {
      document.getElementById('profileSubSheet')?.remove();
      document.getElementById('profilePanel')?.remove();
      window.openProfilePanel(null, { userId: id, readOnly: true });
    }, target.id);
    await page.waitForTimeout(2500);
  }

  // ── ① 오너로 열기 → 카드 존재 + 클릭 시 amb 렌더 ──────────────────
  console.log('=== ① 오너 뷰 ===');
  await openBoard(OWNER);
  const hasCard = await page.locator('.profile-card--admin').count();
  ck(hasCard === 1, `「회원 분석」 카드가 뜬다 (${hasCard}개)`);
  await page.screenshot({ path: path.join(OUT, '1-owner-board.png') });
  if (hasCard) {
    await page.locator('.profile-card--admin').click();
    await page.waitForTimeout(2000);
    const amb = await page.locator('.amb').count();
    const rows = await page.locator('.amb-row').count();
    const stats = await page.locator('.amb-stat').count();
    const periods = await page.locator('.amb-period-btn').count();
    ck(amb === 1, `amb 섹션이 렌더됨`);
    ck(stats === 4, `이용 요약 4칸 (${stats})`);
    ck(periods === 4, `기간 버튼 4개 (${periods})`);
    console.log(`     페이지 표 ${rows}줄 · 활동 계열 ${await page.locator('.amb-ev-fam').count()}개`);
    await page.screenshot({ path: path.join(OUT, '2-amb-section.png') });
    // 기간 버튼 동작 — '오늘'을 눌러도 죽지 않고 표가 다시 그려진다
    await page.locator('.amb-period-btn[data-period="today"]').click();
    await page.waitForTimeout(600);
    ck(await page.locator('.amb-period-btn.is-active[data-period="today"]').count() === 1, `기간 버튼 전환 동작(오늘)`);
    // 날짜 네비 — ◀ 화살표로 특정 날짜 모드 진입(달력 라벨 활성)
    await page.locator('.amb-date-arrow[data-amb-arrow="-1"]').click();
    await page.waitForTimeout(600);
    ck(await page.locator('.amb-date-label.is-active').count() === 1, `날짜 화살표 → 특정 날짜 모드`);
    await page.screenshot({ path: path.join(OUT, '3-amb-datenav.png') });
    // 활동 라벨 한글화 — raw 타입명(_click/_start/_complete)이 안 보인다
    const evText = await page.locator('.amb-ev-types').first().innerText().catch(() => '');
    ck(evText.length === 0 || !/_click|_start|_complete/.test(evText), `활동 라벨이 한글(raw 타입명 없음): "${evText.split('\n')[0].slice(0, 30)}"`);
  }

  // ── ② 비오너로 열기 → 카드 없음 ──────────────────────────────────
  console.log('\n=== ② 비오너 뷰 (오너 가드) ===');
  await openBoard('30001'); // 오너가 아닌 임의 id
  const nonOwnerCard = await page.locator('.profile-card--admin').count();
  ck(nonOwnerCard === 0, `비오너에겐 「회원 분석」 카드가 안 뜬다 (${nonOwnerCard}개)`);
  await page.screenshot({ path: path.join(OUT, '4-nonowner-board.png') });

  console.log('\n=== 환경 ===');
  ck(errors.length === 0, `콘솔 에러 ${errors.length}건`);
  if (errors.length) errors.slice(0, 5).forEach(e => console.log('     ⚠️', e.slice(0, 120)));
  ck(blockedWrites.length === 0, `차단된 쓰기 ${blockedWrites.length}건 (읽기 ${allowedReads}건 통과)`);
  if (blockedWrites.length) blockedWrites.slice(0, 5).forEach(w => console.log('     ✏️', w));

  console.log(`\n스크린샷 → ${OUT}`);
  console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 전부 통과');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
