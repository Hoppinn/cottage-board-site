// 대표 캐릭터 변경 — 실DB 왕복 + 실브라우저 재확인 (2026-07-28 종결분, 그때는 DB 쓰기를 가짜
// 성공으로 처리한 채 node 미니 DOM으로만 확인했었다). 원본 저장 → 변경 → 왕복확인 → 복원.
//
//   node scripts/verify-rep-character-live.js
const { chromium } = require('../node_modules/playwright');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:5500';
const UID = '4916417947'; // OWNER_KAKAO_ID

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};
const readRep = async () => {
  const { data, error } = await db.from('profiles').select('rep_achievement_id').eq('user_id', UID).maybeSingle();
  if (error) { console.error('DB read error', error); process.exit(1); }
  return data?.rep_achievement_id || null;
};

(async () => {
  const original = await readRep();
  console.log('원본 rep_achievement_id:', original);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((uid) => {
      localStorage.setItem('kakao_user', JSON.stringify({ id: uid, nickname: '호핀' }));
    }, UID);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    console.log('① 성장 보드 열기 (autoSubsheet엔 growth가 없어 패널 → 아바타 클릭 경로로)');
    await page.evaluate(() => window.openProfilePanel());
    await page.waitForSelector('.profile-panel-avatar-wrap', { timeout: 15000 });
    await page.click('.profile-panel-avatar-wrap');
    // .profile-char-card는 접힌 미리보기(profile-char-preview)에도 중복 존재 — 실제 조작 대상은 .profile-char-body 안쪽
    await page.waitForSelector('#profileSubSheet .profile-char-body .profile-char-card', { timeout: 15000 });
    await page.waitForTimeout(600);

    const before = await page.evaluate(() => ({
      repName: document.querySelector('.profile-panel-rep-name')?.textContent?.trim() || '',
    }));
    console.log('변경 전 헤더 이름:', before.repName);

    console.log('\n② 현재 대표가 아닌 보유 캐릭터 하나 골라 클릭');
    const picked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#profileSubSheet .profile-char-body .profile-char-card:not(.is-locked):not(.is-rep)')];
      if (!cards.length) return null;
      const c = cards[0];
      c.click();
      return { achId: c.dataset.achId, name: c.querySelector('.profile-char-card-name')?.textContent?.trim() };
    });
    if (!picked) { console.log('⚠️ 변경 가능한 보유 캐릭터가 없음 — 검증 불가, 복원 후 종료'); return; }
    console.log('선택:', JSON.stringify(picked));
    await page.waitForTimeout(300);

    console.log('\n③ "변경" 버튼 클릭 — 실DB 저장');
    await page.click('#profileSubSheet .profile-rep-change-btn');
    await page.waitForTimeout(1500);

    const after = await page.evaluate(() => ({
      repName: document.querySelector('.profile-panel-rep-name')?.textContent?.trim() || '',
      isRep: !!document.querySelector(`.profile-char-card[data-ach-id].is-rep`)?.dataset?.achId,
    }));
    console.log('변경 직후 헤더 이름:', JSON.stringify(after));
    ok('헤더 이름 텍스트가 새로고침 없이 즉시 바뀜(2026-07-28 수정분)', after.repName === picked.name, `기대 "${picked.name}", 실제 "${after.repName}"`);

    const dbAfter = await readRep();
    ok('DB에 실제로 저장됨', dbAfter === picked.achId, `DB=${dbAfter}, 기대=${picked.achId}`);

    console.log('\n④ 패널 닫고 재진입 — 되감김 없는지 확인(실사용에서 먼저 잡혔던 경로)');
    await page.evaluate(() => {
      document.getElementById('profileSubSheet')?.remove();
      document.querySelector('.profile-panel')?.remove();
    });
    await page.evaluate(() => window.openProfilePanel());
    await page.waitForSelector('.profile-panel-avatar-wrap', { timeout: 15000 });
    await page.click('.profile-panel-avatar-wrap');
    // .profile-char-card는 접힌 미리보기(profile-char-preview)에도 중복 존재 — 실제 조작 대상은 .profile-char-body 안쪽
    await page.waitForSelector('#profileSubSheet .profile-char-body .profile-char-card', { timeout: 15000 });
    await page.waitForTimeout(600);
    const reopened = await page.evaluate(() => document.querySelector('.profile-panel-rep-name')?.textContent?.trim() || '');
    ok('재진입 후에도 유지됨(되감김 없음)', reopened === picked.name, `기대 "${picked.name}", 실제 "${reopened}"`);

    console.log('\n⑤ 콘솔 에러 확인');
    const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
    ok('제품 콘솔 에러 0건', rel.length === 0, rel.slice(0, 3).join(' | '));
  } finally {
    await db.from('profiles').update({ rep_achievement_id: original }).eq('user_id', UID);
    console.log('\n복원 완료:', JSON.stringify(await readRep()));
    if (browser) await browser.close();
  }
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
