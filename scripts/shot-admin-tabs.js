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
  // 🚨 지난 실행의 PNG를 먼저 지운다. 안 지우면 이번에 못 찍은 파일이 **낡은 채로 남아**
  //    다음 사람이 그걸 이번 결과로 읽는다 — 2026-07-20에 실제로 하루 지난 chk-summary.png를
  //    읽고 "라벨이 반영 안 됐다"는 틀린 결론을 낼 뻔했다(파일 시각을 보고서야 알았다).
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  // 🚨 이 하니스는 **읽기 전용**인데, 아래에서 가짜 kakao_user를 심으므로 사이트 코드가
  //    upsertProfile 등 **진짜 쓰기**를 시도한다(2026-07-19에 실제로 운영 DB가 오염됐다).
  //    청소하는 대신 애초에 막는다 — GET만 통과시키면 실데이터로 화면을 그대로 보면서
  //    쓰기는 0이 된다. 차단된 요청을 찍어두면 "무엇이 쓰려 했는지"도 함께 보인다.
  const blockedWrites = [];
  let allowedReads = 0; // 가드가 실제로 붙었는지 판정용 — 0이면 "쓰기가 없었다"가 아니라 "패턴 불일치"다
  await ctx.route('**://*.supabase.co/**', r => {
    if (r.request().method() === 'GET') { allowedReads++; return r.continue(); }
    blockedWrites.push(`${r.request().method()} ${r.request().url().split('/rest/v1/')[1] || r.request().url()}`);
    return r.abort();
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

  // 퍼널은 날짜 네비를 따르므로 기간을 바꿔가며 본다.
  // "오늘"이 "-"인 건 정상(그날 클릭이 0일 뿐) — 기간을 넓혔을 때 살아나는지가 판정 기준이다.
  console.log('\n=== 발견 #6 — 퍼널 전환율 (기간별) ===');
  await clickTab('event');
  let anyLive = false, over100 = 0, checked = 0;
  for (const [days, nm] of [['1', '오늘'], ['7', '이번주'], ['30', '이번달'], ['0', '전체']]) {
    await page.evaluate(d => document.querySelector(`.admin-chart-period-btn[data-days="${d}"]`)?.click(), days);
    await page.waitForTimeout(900);
    const f = await page.evaluate(() => {
      const t = document.getElementById('eventFunnelBody')?.innerText || '';
      return { period: (t.match(/기간:\s*(.+)/) || [])[1] || '(없음)', rates: [...t.matchAll(/↓\s*(\S+)/g)].map(x => x[1]) };
    });
    const live = f.rates.filter(x => x !== '-').length;
    if (live > 0) anyLive = true;
    f.rates.filter(x => x.endsWith('%')).forEach(x => { checked++; if (parseInt(x, 10) > 100) over100++; });
    console.log(`  [${nm}] "${f.period}" → ${f.rates.join(',') || '(없음)'}  (살아있는 칸 ${live}/${f.rates.length})`);
  }
  console.log('  판정:', anyLive ? '✅ 기간을 넓히면 전환율이 계산됨' : '🔴 어느 기간에서도 전부 "-" — 배선 확인');
  // 전환율은 사람 집합의 교집합/앞단계라 100%를 넘을 수 없다(교집합 ⊆ 앞단계).
  // 넘으면 건수 기준으로 되돌아갔다는 뜻 — 발견 #10의 재발 신호다.
  console.log('  100% 초과:', over100 === 0
    ? `✅ 0건 / 검사 ${checked}건 (사람 기준이라 원리상 불가)`
    : `🔴 ${over100}건 — 건수 기준으로 회귀했는지 확인`);

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
  // 차단된 쓰기 — 0이 아니어도 정상이다(사이트가 시도했고 우리가 막았다는 뜻).
  // 여기가 비면 "쓰기가 없었다"가 아니라 "가드가 안 걸렸을 수도" 있으니 함께 본다.
  console.log('쓰기 가드:', allowedReads === 0
    ? '🔴 통과한 GET이 0건 = 라우트가 안 걸렸다. 아래 "차단 0건"을 안전의 근거로 쓰지 말 것'
    : `✅ 부착됨 (GET ${allowedReads}건 통과)`);
  console.log('차단된 쓰기:', blockedWrites.length
    ? `${blockedWrites.length}건 — ${[...new Set(blockedWrites)].slice(0, 8).join(', ')}`
    : '0건');
  await browser.close();
  process.exit(0);
})();
