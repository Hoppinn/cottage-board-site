// P3b 드릴다운 검증 — 화면의 「👥 N명」을 눌러 나온 명단이 DB 집계와 일치하는가 (읽기 전용)
//
//   node scripts/verify-drilldown.js [baseUrl]
//   node scripts/verify-drilldown.js [baseUrl] --negctl   ← 음성 대조군(일부러 틀린 기대값)
//
// 왜 두 경로인가: 화면은 브라우저 안 집계, 이 스크립트는 supabase 직접 집계다.
// **서로 다른 경로가 같은 답을 내야** 교차 검증이 된다(P1 도달률에서 쓴 방식).
//
// 🚨 --negctl은 필수 절차다 — "전부 통과"는 검사기가 고장 난 것과 구별되지 않는다.
//    기대값을 일부러 1 틀리게 만들어 이 스크립트가 실제로 빨간불을 내는지 먼저 본다.
//
// 🚨 읽기 전용 보장: 가짜 kakao_user를 심으면 사이트 코드가 upsertProfile 등 진짜 쓰기를
//    시도한다(2026-07-19에 운영 DB가 실제로 오염됐다). GET 외 전부 abort한다.
const { chromium } = require('../node_modules/playwright');
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://127.0.0.1:5500').replace(/\/$/, '');
const NEGCTL = process.argv.includes('--negctl');
const UID = '4916417947';

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const iso = d => new Date(Date.now() - d * 86400000).toISOString();
// 화면이 대조군으로 쓰는 이벤트 — 계열이 다르고 회원/비회원이 섞인 것으로 고른다.
const CHECK_EVENTS = {
  '히어로 모임 클릭': 'home_meeting_main_click',
  '이번 주 모임 플래너 보기 클릭': 'home_meeting_planner_click',
  '히어로 기록남기기 클릭': 'home_record_main_click',
  '최근 플레이 기록 남기기 클릭': 'home_record_write_click',
  '히어로 추천게임찾기 클릭': 'home_recommend_main_click',
};

let fail = 0;
const ck = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

(async () => {
  // ── ① DB 직접 집계 (기대값) ────────────────────────────────────
  const ev = await db.from('page_events')
    .select('event_type, user_id, session_key')
    .in('event_type', Object.values(CHECK_EVENTS)).gte('created_at', iso(3650));
  if (ev.error) { console.log('🔴 page_events 조회 실패:', ev.error.message); process.exit(1); }
  const expect = {};
  for (const e of (ev.data || [])) {
    if (String(e.user_id || '') === UID) continue; // 관리자는 트래킹 제외 = 화면에도 없다
    const pid = e.user_id || e.session_key;
    (expect[e.event_type] ||= { n: 0, people: new Set(), noId: 0 });
    expect[e.event_type].n++;
    if (pid) expect[e.event_type].people.add(String(pid)); else expect[e.event_type].noId++;
  }
  if (NEGCTL) {
    // 음성 대조군: 기대값을 한 칸 비튼다. 여기서 🔴가 안 뜨면 비교문이 죽은 것이다.
    const k = Object.values(CHECK_EVENTS).find(t => expect[t]?.people.size);
    if (k) { expect[k].people.add('__negctl_ghost__'); console.log(`(음성 대조군) ${k}의 기대 명수를 +1로 비틀었다 — 아래에 🔴가 떠야 정상\n`); }
  }

  // ── ② 화면 층 ──────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
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

  const clickTab = async t => {
    const sel = '#tabPanel' + t[0].toUpperCase() + t.slice(1);
    for (let i = 0; i < 2; i++) {
      await page.evaluate(tab => document.querySelector(`.admin-analysis-tab[data-tab="${tab}"]`)?.click(), t);
      try { await page.waitForSelector(sel, { state: 'visible', timeout: 5000 }); await page.waitForTimeout(900); return sel; } catch {}
    }
    return null;
  };
  // 전 기간으로 맞춘다 — DB 집계도 전 기간이라 같은 모집단이어야 비교가 성립한다.
  const setAll = async () => {
    await page.evaluate(() => document.querySelector('.admin-chart-period-btn[data-days="0"]')?.click());
    await page.waitForTimeout(1200);
  };

  // ── 이벤트 탭 ──────────────────────────────────────────────────
  await clickTab('event');
  await setAll();
  // 모든 드릴다운 버튼을 펼친다(위임 핸들러가 실제로 도는지도 여기서 확인된다)
  const evtRows = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('#eventFunnelBody .admin-dd-host')];
    return hosts.map(h => {
      const btn = h.querySelector('.admin-dd-btn');
      btn?.click();
      const panel = h.querySelector('.admin-dd-panel');
      const label = h.querySelector('span:nth-child(2)')?.textContent.trim() || '';
      const nText = h.querySelector('div[style*="font-weight:900"]')?.textContent.trim() || '';
      const rows = panel ? [...panel.querySelectorAll('.admin-dd-row')].map(r => ({
        name: r.querySelector('.admin-dd-name')?.textContent.trim() || '',
        meta: r.querySelector('.admin-dd-meta')?.textContent.trim() || '',
        anon: r.classList.contains('is-anon'),
      })) : [];
      return {
        label, nText,
        btnText: btn?.textContent.trim() || '',
        opened: panel ? !panel.hasAttribute('hidden') : false,
        notes: panel ? [...panel.querySelectorAll('.admin-dd-note')].map(n => n.textContent.trim()) : [],
        rows,
      };
    });
  });

  console.log('=== ① 이벤트 드릴다운 — 화면 vs DB ===');
  ck(evtRows.length > 0, `드릴다운 호스트 ${evtRows.length}개 렌더됨`);
  ck(evtRows.every(r => r.opened), '버튼 클릭으로 전부 펼쳐짐(위임 핸들러 동작)');
  for (const r of evtRows) {
    const type = CHECK_EVENTS[r.label];
    const shownU = parseInt((r.btnText.match(/(\d+)명/) || [])[1] ?? '-1', 10);
    const shownN = parseInt(r.nText.replace(/[^\d]/g, '') || '0', 10);
    if (!type) { console.log(`  ·  ${r.label} — 대조 대상 아님 (화면 ${shownN}회/${shownU}명)`); continue; }
    const e = expect[type] || { n: 0, people: new Set(), noId: 0 };
    ck(shownN === e.n, `${r.label}: 회 화면 ${shownN} = DB ${e.n}`);
    ck(shownU === e.people.size, `${r.label}: 명 화면 ${shownU} = DB ${e.people.size}`);
    // 명단 자체가 그 숫자를 지지하는가 — "외 N명" 접힘분까지 합쳐 센다
    const listed = r.rows.filter(x => !/^외 \d+명$/.test(x.name)).length;
    const restM = r.rows.map(x => (x.name.match(/^외 (\d+)명$/) || [])[1]).find(Boolean);
    ck(listed + Number(restM || 0) === shownU, `${r.label}: 명단 ${listed}${restM ? `+외 ${restM}` : ''} = 버튼 ${shownU}명`);
    // 명단의 회 합 + 식별불가 = 총 회 (접힘이 없을 때만 셀 수 있다)
    if (!restM) {
      const sum = r.rows.reduce((s, x) => s + (parseInt(x.meta, 10) || 0), 0);
      ck(sum + e.noId === e.n, `${r.label}: 명단 회 합 ${sum} + 식별불가 ${e.noId} = 총 ${e.n}회`);
    }
  }

  // ── 페이지 탭 ──────────────────────────────────────────────────
  await clickTab('page');
  await setAll();
  const pageRows = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('#pagesBody .admin-dd-host')];
    return hosts.map(h => {
      const btn = h.querySelector('.admin-dd-btn');
      btn?.click();
      const panel = h.querySelector('.admin-dd-panel');
      return {
        page: h.querySelector('.anat-page')?.textContent.trim() || '',
        visits: parseInt((h.textContent.match(/방문 (\d+)/) || [])[1] || '0', 10),
        btnU: parseInt((btn?.textContent.match(/(\d+)명/) || [])[1] || '0', 10),
        opened: panel ? !panel.hasAttribute('hidden') : false,
        note: panel?.querySelector('.admin-dd-note')?.textContent.trim() || '',
        rows: panel ? [...panel.querySelectorAll('.admin-dd-row')].map(r => ({
          name: r.querySelector('.admin-dd-name')?.textContent.trim() || '',
          meta: r.querySelector('.admin-dd-meta')?.textContent.trim() || '',
          anon: r.classList.contains('is-anon'),
        })) : [],
      };
    });
  });
  // 차트 막대와 목록이 같은 값을 말하는가 — 서로 다른 코드 경로로 그려진다
  const chartVals = await page.evaluate(() => {
    const c = window.Chart?.getChart ? window.Chart.getChart('chartPages') : null;
    return c ? { labels: c.data.labels, data: c.data.datasets[0].data } : null;
  });

  console.log('\n=== ② 페이지 드릴다운 ===');
  ck(pageRows.length > 0, `페이지 목록 ${pageRows.length}줄 렌더됨`);
  ck(pageRows.every(r => r.opened), '버튼 클릭으로 전부 펼쳐짐');
  ck(!!chartVals, '페이지 차트 존재');
  if (chartVals) {
    ck(chartVals.labels.length === pageRows.length, `막대 ${chartVals.labels.length}개 = 목록 ${pageRows.length}줄`);
    const mismatch = pageRows.filter((r, i) => chartVals.labels[i] !== r.page || chartVals.data[i] !== r.visits);
    ck(mismatch.length === 0, `막대(라벨·값)와 목록이 줄마다 일치${mismatch.length ? ` — 어긋남 ${mismatch.map(m => m.page).join(',')}` : ''}`);
  }
  for (const r of pageRows) {
    const listed = r.rows.filter(x => !/^외 \d+명$/.test(x.name)).length;
    const restM = r.rows.map(x => (x.name.match(/^외 (\d+)명$/) || [])[1]).find(Boolean);
    ck(listed + Number(restM || 0) === r.btnU, `${r.page}: 명단 ${listed}${restM ? `+외 ${restM}` : ''} = 버튼 ${r.btnU}명`);
    // 사람 수는 방문 수(사람·날짜 유니크)를 넘을 수 없다 — 원리상 불변식
    ck(r.btnU <= r.visits, `${r.page}: 명 ${r.btnU} ≤ 방문 ${r.visits}`);
    // 회원/비회원 표기와 실제 행 클래스가 맞는가
    const memRows = r.rows.filter(x => !x.anon && !/^외 /.test(x.name)).length;
    const noteMem = parseInt((r.note.match(/회원 (\d+)명/) || [])[1] || '-1', 10);
    if (!restM) ck(memRows === noteMem, `${r.page}: 회원 행 ${memRows} = 설명 ${noteMem}명`);
  }
  console.log('\n  샘플 —', pageRows[0]?.page, ':', pageRows[0]?.rows.slice(0, 5).map(x => `${x.name}(${x.meta})`).join(', '));

  console.log('\n=== ③ 환경 ===');
  ck(errors.length === 0, `콘솔 에러 ${errors.length}건${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`);
  ck(reads > 0, `읽기 가드 부착 확인 (GET ${reads}건 통과)`);
  ck(blocked.length === 0, `차단된 쓰기 ${blocked.length}건 (0이어야 정상)`);

  await browser.close();
  console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 전부 통과');
  process.exit(0);
})();
