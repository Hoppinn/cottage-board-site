// 관리자 분석 페이지 6개 탭 육안 점검 하니스 — 읽기 전용 (DB 무변경)
//
//   node scripts/shot-admin-tabs.js [baseUrl] [outDir]
//   기본값: http://127.0.0.1:5500 , {OS 임시폴더}/cottage-admin-shots/
//
// audit-admin-analytics.js가 "DB 층이 건강한가"(절단/RLS)를 보는 반면,
// 이 스크립트는 **표시 층**을 본다 — 탭별 스크린샷 + 세션 ⑪ 발견 #5~#9의 런타임 값.
// 절단이 풀린 뒤 남은 문제는 전부 "있는 데이터를 잘못 보여주는" 쪽이라 눈으로 봐야 잡힌다.
//
// ⚠️ 이 스크립트가 찍는 숫자는 **실행 시점 데이터에 따라 달라진다** — 값 자체가 아니라
//    같은 화면 안에서 서로 어긋나는지(칩 vs 목록, 축 vs 막대)를 볼 것.
//
// 🚨 **출력 폴더를 리포지토리 안으로 지정하지 말 것** (2026-07-19 실측으로 규명):
//    개발 서버(Live Server 5500)가 리포지토리를 감시하므로 **PNG를 리포 안에 쓰는 순간
//    라이브 리로드가 걸려** 페이지가 첫 탭으로 초기화된다. 그러면 두 번째 탭부터
//    `boundingBox = null` → `elementHandle.screenshot` 30초 타임아웃으로 죽는다.
//    증상이 "탭이 안 열림"처럼 보여 스크립트를 고치게 되지만 **원인은 출력 경로**다.
//    그래서 기본 출력은 리포 밖(OS 임시폴더)이다. 스크린샷은 일회성 산출물이라
//    커밋 대상도 아니다(보존해야 하는 건 이 스크립트 자체).
const { chromium } = require('../node_modules/playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = (process.argv[2] || 'http://127.0.0.1:5500').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(os.tmpdir(), 'cottage-admin-shots');
const UID = '4916417947';
const TABS = ['summary', 'visit', 'referrer', 'page', 'event', 'member'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(BASE + '/pages/admin/requests-admin.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(u => {
    localStorage.setItem('kakao_user', JSON.stringify({ id: u, nickname: '호핀' }));
    localStorage.setItem(`cottage_sess_${u}`, JSON.stringify({ visitCount: 5, timeSec: 0 }));
  }, UID);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000); // load() → loadAnalytics() → loadEventStats() 체인

  // 탭 전환은 간헐적으로 한 번에 안 먹는다(핸들러 바인딩 타이밍) → visible 확인 후 1회 재클릭.
  const clickTab = async t => {
    const sel = '#tabPanel' + t[0].toUpperCase() + t.slice(1);
    for (let i = 0; i < 2; i++) {
      await page.evaluate(tab => document.querySelector(`.admin-analysis-tab[data-tab="${tab}"]`)?.click(), t);
      try {
        await page.waitForSelector(sel, { state: 'visible', timeout: 5000 });
        await page.waitForTimeout(1000); // 차트 그리기
        return sel;
      } catch { /* 재시도 */ }
    }
    return null;
  };

  let shot = 0;
  for (const t of TABS) {
    const sel = await clickTab(t);
    if (!sel) { console.log(`  ⚠️ [${t}] 패널이 안 열림 — 건너뜀`); continue; }
    await (await page.$(sel)).screenshot({ path: path.join(OUT, `tab-${t}.png`) });
    shot++;
  }
  console.log(`스크린샷 ${shot}/${TABS.length}장 → ${OUT}`);

  // ── 발견 #5·#6·#7 런타임 값 ────────────────────────────────────
  await clickTab('member');
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#visitorList .admin-member-card, #visitorExtras .admin-member-card')];
    const dateVisible = cards.filter(c => c.dataset.dateHidden !== '1');
    const ch = window.Chart?.getChart ? window.Chart.getChart('chartMemberTime') : null;
    const funnel = document.getElementById('eventFunnelBody');
    const rates = funnel ? [...funnel.innerText.matchAll(/↓\s*(\S+)/g)].map(m => m[1]) : [];
    return {
      chips: [...document.querySelectorAll('#visitorFilterBar .admin-visitor-filter-btn')].map(b => b.textContent.trim()),
      cardsInDom: cards.length,
      dateVisible: dateVisible.length,
      moreBtn: document.getElementById('visitorMoreBtn')?.textContent.trim() || '(없음)',
      funnelRates: rates,
      memberChart: ch ? { labels: ch.data.labels, dataSec: ch.data.datasets[0].data, xTicks: ch.scales.x.ticks.map(t => t.label) } : null,
    };
  });

  const chipTotal = parseInt((r.chips[0] || '').replace(/\D/g, ''), 10);
  console.log('\n=== 발견 #5 — 필터 칩 vs 실제 목록 (모집단 일치?) ===');
  console.log('  칩:', r.chips.join(' / '));
  console.log(`  DOM 카드 ${r.cardsInDom} / 날짜필터 통과 ${r.dateVisible} / 더보기 "${r.moreBtn}"`);
  console.log('  판정:', chipTotal === r.dateVisible ? '✅ 일치' : `🔴 불일치 — 칩 ${chipTotal} vs 목록 ${r.dateVisible}`);

  console.log('\n=== 발견 #6 — 퍼널 전환율 (오늘 표본이라 대부분 "-") ===');
  const dash = r.funnelRates.filter(x => x === '-').length;
  console.log('  전환율 칸:', r.funnelRates.join(' , ') || '(없음)');
  console.log('  판정:', r.funnelRates.length && dash === r.funnelRates.length
    ? `🔴 ${dash}/${r.funnelRates.length}칸 전부 "-" — 7일 값 미사용 확인` : `🟡 ${dash}/${r.funnelRates.length}칸 공백`);

  console.log('\n=== 발견 #7 — 이용시간 차트 x축 눈금 (초 데이터 + 분 라벨) ===');
  if (r.memberChart) {
    console.log('  값(초):', JSON.stringify(r.memberChart.dataSec));
    console.log('  x눈금 :', r.memberChart.xTicks.join(' '));
    const nums = r.memberChart.xTicks.map(t => parseInt(t, 10)).filter(n => !isNaN(n));
    const gaps = nums.slice(1).map((n, i) => n - nums[i]);
    console.log('  판정:', new Set(gaps).size <= 1 ? '✅ 등간격' : `🟡 간격 불균일 ${JSON.stringify(gaps)} — 분 반올림 탓`);
  } else console.log('  (차트 인스턴스 없음)');

  const rel = errors.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e));
  console.log('\n콘솔 에러:', rel.length ? rel.slice(0, 8).join('\n  ') : '없음');
  await browser.close();
  process.exit(0);
})();
