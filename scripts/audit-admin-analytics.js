// 관리자 분석 페이지 감사 — 읽기 전용 (DB 무변경)
//
//   node scripts/audit-admin-analytics.js        (기본 http://127.0.0.1:5500)
//
// 두 가지를 한 번에 본다:
//   ① DB 층 — 조회가 절단되고 있는가 (PostgREST max-rows). 요청 행수와 count:'exact'를
//      대조한다. 행수가 정확히 1000이면 절단, 0이면 RLS 의심 — 둘 다 error가 null이라
//      감지기(console.error)로는 안 잡힌다. CLAUDE.md 「행 수 자체가 거짓말한다」 참조.
//   ② 화면 층 — 실제로 렌더된 값. 퍼널이 0으로만 차 있으면 데이터가 아니라 권한 문제일 수 있다.
const { chromium } = require('../node_modules/playwright');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:5500';
const UID = '4916417947';

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const iso = daysAgo => new Date(Date.now() - daysAgo * 86400000).toISOString();

(async () => {
  console.log('=== ① DB 층 — 절단/RLS 점검 ===');
  const checks = [
    ['getPageAnalytics (page_sessions 90일)',
      () => db.from('page_sessions').select('page, referrer, user_id, session_key, duration_sec, entered_at')
        .gte('entered_at', iso(90)).order('entered_at', { ascending: false }).limit(20000),
      () => db.from('page_sessions').select('*', { count: 'exact', head: true }).gte('entered_at', iso(90))],
    ['fetchPageViewsForAnalytics (page_views)',
      () => db.from('page_views').select('page, created_at, referrer, is_bot, user_id, session_key')
        .order('created_at', { ascending: false }).limit(10000),
      () => db.from('page_views').select('*', { count: 'exact', head: true })],
    ['page_events (퍼널 소스)',
      () => db.from('page_events').select('event_type, created_at').gte('created_at', iso(30)),
      () => db.from('page_events').select('*', { count: 'exact', head: true }).gte('created_at', iso(30))],
  ];
  let warn = 0;
  for (const [name, q, c] of checks) {
    const { data, error } = await q();
    const { count } = await c();
    const got = data ? data.length : 0;
    let flag = '';
    if (error) flag = '🔴 ERROR ' + error.message;
    else if (count === null) flag = '🔴 테이블 없음/접근불가 (count=null)';
    else if (count === 0) flag = '🟠 0행 — RLS 의심 (정책 to 역할이 anon인지 확인)';
    else if (got < count) flag = `🔴 절단 ${count - got}행 누락(${Math.round((1 - got / count) * 100)}%) — max-rows 확인`;
    else flag = '✅';
    if (flag[0] !== '✅') warn++;
    console.log(`  ${name}\n    받음 ${got} / 실존 ${count}  ${flag}`);
  }

  console.log('\n=== ② 화면 층 — 실제 렌더 ===');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  const URL = BASE.replace(/\/$/, '') + '/pages/admin/requests-admin.html';
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((uid) => {
    localStorage.setItem('kakao_user', JSON.stringify({ id: uid, nickname: '호핀' }));
    localStorage.setItem(`cottage_sess_${uid}`, JSON.stringify({ visitCount: 5, timeSec: 0 }));
  }, UID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000); // load() → loadAnalytics() → loadEventStats() 체인

  const r = await page.evaluate(() => {
    const txt = el => (el?.innerText || '').replace(/\s+/g, ' ').trim();
    const funnel = document.getElementById('eventFunnelBody');
    return {
      gated: document.body.innerText.includes('관리자만 볼 수 있는'),
      funnelEmpty: funnel ? /데이터 없음|이벤트 데이터 없음/.test(funnel.innerText) : null,
      funnelAllZero: funnel ? !/[1-9]/.test(funnel.innerText) : null,
      funnelText: txt(funnel).slice(0, 600),
      sumEventCount: txt(document.getElementById('sumEventCount')),
      visitorCards: document.querySelectorAll('#visitorList .admin-member-card, #visitorExtras .admin-member-card').length,
      memberCards: document.querySelectorAll('[data-visitor-type="member"]').length,
      anonCards: document.querySelectorAll('[data-visitor-type="anon"]').length,
      todaySpans: [...document.querySelectorAll('.admin-member-metas span')].filter(s => s.innerText.includes('오늘')).length,
    };
  });
  console.log('  오너 게이트 걸림 :', r.gated, r.gated ? '🔴 (isOwner 확인 필요)' : '');
  console.log('  퍼널 "데이터 없음":', r.funnelEmpty);
  console.log('  퍼널 전부 0      :', r.funnelAllZero, r.funnelAllZero ? '🟠 (RLS/절단 의심 — ① 참조)' : '');
  console.log('  요약 이벤트 카드 :', r.sumEventCount);
  console.log('  방문자 카드      :', r.visitorCards, `(회원 ${r.memberCards} / 비회원 ${r.anonCards})`);
  console.log('  "오늘 N" 표시    :', r.todaySpans, '개');
  console.log('\n  --- 퍼널 본문 ---\n ', r.funnelText);

  const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
  console.log('\n  콘솔 에러:', rel.length ? rel.slice(0, 8).join('\n    ') : '없음');

  await browser.close();
  console.log(warn === 0 ? '\n=== DB 층 이상 없음 ===' : `\n=== DB 층 경고 ${warn}건 (위 🔴/🟠 참조) ===`);
})();
