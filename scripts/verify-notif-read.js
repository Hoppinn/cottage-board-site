// 개별 알림 읽음 — 실브라우저 + 실DB 엔드투엔드 스모크
//
//   node scripts/verify-notif-read.js            (기본 http://127.0.0.1:5500)
//   node scripts/verify-notif-read.js http://localhost:3000
//
// ⚠️ 운영 DB의 관리자 profiles 행(notif_seen_at / notif_read_keys)을 잠시 바꾼다.
//    미읽음 알림이 0건이면 읽음 버튼이 렌더되지 않아 테스트 자체가 불가능하므로
//    지평선을 되돌려야 한다. 원본은 시작 시 저장하고 finally에서 반드시 복원한다
//    (2026-07-18 1차 실행이 중간 크래시로 복원을 건너뛴 적이 있어 구조를 이렇게 잡음).
//    건드리는 건 알림 읽음 상태뿐 — 사용자 자산 데이터가 아니다.
const { chromium } = require('../node_modules/playwright');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:5500';
const UID = '4916417947'; // OWNER_KAKAO_ID

// supabase-config.js를 SSOT로 읽는다 (키를 여기 복사해두면 회전 시 조용히 어긋남)
let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? ` — ${extra}` : ''));
  if (!cond) fail++;
};
const readRow = async () => {
  const { data, error } = await db.from('profiles')
    .select('notif_seen_at, notif_read_keys').eq('user_id', UID).maybeSingle();
  if (error) { console.error('DB read error', error); process.exit(1); }
  return data;
};
const openNotif = async (page) => {
  await page.evaluate(() => {
    document.getElementById('profileSubSheet')?.remove();
    document.querySelector('.profile-panel')?.remove();
  });
  await page.evaluate(() => window.openProfilePanel('notif'));
  await page.waitForSelector('#profileSubSheet .profile-notif-list', { timeout: 15000 });
  await page.waitForTimeout(400);
};
// 더보기 목록(9번째부터)까지 함께 세야 한다 — 8건 초과 버그가 났던 자리
const snapshot = (page) => page.evaluate(() => {
  const lis = [...document.querySelectorAll(
    '#profileSubSheet .profile-notif-list > li, #profileSubSheet .profile-notif-more-list > li')];
  return {
    total: lis.length,
    isNew: lis.filter(li => li.classList.contains('is-new')).length,
    readBtns: document.querySelectorAll('#profileSubSheet .notif-read-one-btn').length,
    confirmAll: !!document.querySelector('#profileSubSheet .profile-notif-confirm-all'),
  };
});

(async () => {
  const original = await readRow();
  console.log('원본 저장:', JSON.stringify(original), '\n');
  let browser;
  try {
    const { error: resetErr } = await db.from('profiles')
      .update({ notif_seen_at: null, notif_read_keys: [] }).eq('user_id', UID);
    if (resetErr) { console.error('reset 실패', resetErr); process.exit(1); }

    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate((uid) => {
      localStorage.setItem('kakao_user', JSON.stringify({ id: uid, nickname: '호핀' }));
      localStorage.setItem(`cottage_sess_${uid}`, JSON.stringify({ visitCount: 5, timeSec: 0 }));
    }, UID);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    console.log('① 초기 상태');
    await openNotif(page);
    const s0 = await snapshot(page);
    ok('알림 항목 있음', s0.total > 0, `${s0.total}건`);
    ok('미읽음 2건 이상 (개별/전체 구분에 필요)', s0.isNew >= 2, `${s0.isNew}건`);
    ok('읽음 버튼이 미읽음 수만큼', s0.readBtns === s0.isNew, `btn ${s0.readBtns} / new ${s0.isNew}`);
    if (s0.isNew < 2) { console.log('\n⚠️ 미읽음 부족 — 검증 불가, 복원 후 종료'); return; }

    console.log('② 개별 읽음 — 카드 하나만 (원래 버그 지점)');
    const targetKey = await page.evaluate(() => {
      const btn = document.querySelector('#profileSubSheet .notif-read-one-btn');
      const k = btn.dataset.notifKeys; btn.click(); return k;
    });
    await page.waitForTimeout(2000);
    const s1 = await snapshot(page);
    ok('미읽음이 정확히 1건만 감소 (전부 읽음 아님)', s1.isNew === s0.isNew - 1, `${s0.isNew} → ${s1.isNew}`);
    const afterOne = await readRow();
    ok('notif_read_keys에 클릭한 키 저장', targetKey.split(',').every(k => afterOne.notif_read_keys.includes(k)));
    ok('notif_seen_at(지평선) 미변경', afterOne.notif_seen_at === null);

    console.log('③ 뒤로가기 → 재진입 (onLeave 스냅샷)');
    await page.click('#profileSubSheet .profile-subsheet-back');
    await page.waitForTimeout(500);
    await page.click('[data-subsheet="notif"]'); // .profile-panel-notif-btn
    await page.waitForSelector('#profileSubSheet .profile-notif-list', { timeout: 10000 });
    await page.waitForTimeout(500);
    ok('읽음 상태 유지', (await snapshot(page)).isNew === s1.isNew);

    console.log('④ 새로고침 후 (DB 왕복)');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await openNotif(page);
    ok('미읽음 수 동일', (await snapshot(page)).isNew === s1.isNew);

    console.log('⑤ 모두 읽기 → notif_read_keys 비움 (무한증가 상한선)');
    await page.click('#profileSubSheet .profile-notif-confirm-all');
    await page.waitForTimeout(2500);
    ok('미읽음 0건', (await snapshot(page)).isNew === 0);
    const afterAll = await readRow();
    ok('notif_read_keys가 []로 비워짐', afterAll.notif_read_keys.length === 0, JSON.stringify(afterAll.notif_read_keys));
    ok('notif_seen_at은 새 지평선으로 갱신', !!afterAll.notif_seen_at);

    console.log('⑥ 콘솔 에러');
    // `Failed to fetch`는 ③④의 reload/이탈이 진행 중이던 요청을 취소해서 나는 경우가 많다
    // (간헐적). 제품 결함과 구분해야 하므로 통째로 필터링하지 않고 경고로 분리한다 —
    // 뭉개면 진짜 화재를 가리고(늑대소년), 실패로 세면 매번 빨간불이 뜬다.
    const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
    const aborted = rel.filter(e => /Failed to fetch|AbortError|NetworkError/i.test(e));
    const real = rel.filter(e => !aborted.includes(e));
    ok('제품 콘솔 에러 0건', real.length === 0, real.slice(0, 3).join(' | '));
    if (aborted.length) {
      console.log(`  WARN  네트워크 취소 ${aborted.length}건 (reload 중 요청 중단 추정 — 반복되면 실제 조사)`);
      console.log('        ' + aborted.slice(0, 2).join(' | '));
    }
  } finally {
    // 성공·실패·예외 무관하게 항상 복원
    await db.from('profiles').update(original).eq('user_id', UID);
    console.log('\n복원 완료:', JSON.stringify(await readRow()));
    if (browser) await browser.close();
  }
  console.log(fail === 0 ? '\n=== ALL PASS ===' : `\n=== ${fail} FAILED ===`);
  process.exit(fail === 0 ? 0 : 1);
})();
