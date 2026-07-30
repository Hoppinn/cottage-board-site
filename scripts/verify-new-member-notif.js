// 신규 회원가입 알림 — 실데이터 read-only 검증 (쓰기 전면 차단, DB 오염 0)
// /browser-verify 스킬 지침: 읽기만 필요하면 route 차단으로 애초에 쓰기를 막는다.
//
//   node scripts/verify-new-member-notif.js
const { chromium } = require('../node_modules/playwright');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:5500';
const UID = '4916417947'; // OWNER_KAKAO_ID — 읽기만 하므로 실데이터 그대로 사용해도 안전

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};

(async () => {
  // 사전 확인 — 실측한 최신 signup_complete가 admin의 notif_seen_at보다 최신인지
  const { data: prof } = await db.from('profiles').select('notif_seen_at').eq('user_id', UID).maybeSingle();
  const { data: recentSignups } = await db.from('page_events')
    .select('id, user_id, created_at').eq('event_type', 'signup_complete')
    .order('created_at', { ascending: false }).limit(3);
  console.log('admin notif_seen_at:', prof?.notif_seen_at);
  console.log('최근 signup_complete 3건:', JSON.stringify(recentSignups));
  const hasNewSignup = (recentSignups || []).some(r => !prof?.notif_seen_at || r.created_at > prof.notif_seen_at);
  if (!hasNewSignup) {
    console.log('\n⚠️ admin 지평선보다 최신인 가입이 없음 — isNew=false로 "최신 1건 기록용" 카드만 뜰 것으로 예상하고 계속 진행');
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const blockedWrites = [];
  // GET/HEAD(count 조회용, 읽기전용)만 통과, 그 외(POST/PATCH/DELETE 등)는 차단 — 무엇을 막았는지 기록
  await ctx.route('**://*.supabase.co/**', route => {
    if (['GET', 'HEAD'].includes(route.request().method())) route.continue();
    else { blockedWrites.push(`${route.request().method()} ${route.request().url().split('?')[0]}`); route.abort(); }
  });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((uid) => {
    localStorage.setItem('kakao_user', JSON.stringify({ id: uid, nickname: '호핀' }));
  }, UID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    document.getElementById('profileSubSheet')?.remove();
    document.querySelector('.profile-panel')?.remove();
  });
  await page.evaluate(() => window.openProfilePanel('notif'));
  await page.waitForSelector('#profileSubSheet .profile-notif-list', { timeout: 15000 });
  await page.waitForTimeout(600);

  const snapshot = await page.evaluate(() => {
    const lis = [...document.querySelectorAll('#profileSubSheet .profile-notif-list > li, #profileSubSheet .profile-notif-more-list > li')];
    const memberLi = lis.find(li => li.textContent.includes('신규 회원'));
    return {
      totalNotifs: lis.length,
      hasMemberCard: !!memberLi,
      memberCardText: memberLi?.textContent?.trim() || null,
      memberCardIsNew: !!memberLi?.classList.contains('is-new'),
    };
  });
  console.log('\n알림판 스냅샷:', JSON.stringify(snapshot, null, 2));
  ok('알림 목록 렌더됨(0건 아님)', snapshot.totalNotifs > 0, `${snapshot.totalNotifs}건`);
  ok('🎯 "신규 회원" 카드가 실제로 렌더됨', snapshot.hasMemberCard, snapshot.memberCardText || '(없음)');

  console.log('\n쓰기 시도 차단 로그:', blockedWrites.length ? blockedWrites.join('\n  ') : '(0건 — 이 조회 경로는 원래 쓰기가 없음)');
  const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
  ok('제품 콘솔 에러 0건', rel.length === 0, rel.slice(0, 3).join(' | '));

  await browser.close();
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
