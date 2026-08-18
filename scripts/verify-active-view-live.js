// pushActiveView/popActiveView의 실브라우저 동작 확인 — /browser-verify 원칙대로 GET 이외
// Supabase 요청을 전부 차단해 **운영 DB에 실제 쓰기가 0**인 채로, 차단된 POST의 바디를
// 가로채 "진짜로 보내려던 payload"를 검사한다. 로그인 없이(익명) 실행 — openProfilePanel의
// UI 클릭 대신 window.pushActiveView/popActiveView를 직접 호출해 메커니즘만 겨눈다(로그인
// 게이트가 있는 실제 UI 클릭 시나리오는 별도로 실사용자 확인 필요, PLAN 참조).
//
//   node scripts/verify-active-view-live.js [--url http://127.0.0.1:5500/]
//
const { chromium } = require('playwright');

// 🚨 127.0.0.1/localhost로 직접 열면 _isLocalhost()가 트래킹 자체를 조기 return시켜
// (관리자/로컬 카운팅 제외 정책, 의도된 것) pushActiveView가 아예 안 만들어진다.
// 그렇다고 실운영 도메인(cottageboard.com)으로 테스트하면 **아직 push 안 된 예전 코드**를
// 검증하게 된다. 절충: 크로미움 host-resolver-rules로 가짜 호스트명을 127.0.0.1에 매핑해
// "로컬 서버 콘텐츠 + 로컬 아닌 hostname"을 동시에 만족시킨다.
const FAKE_HOST = 'verify-active-view.local';
const PORT = (process.argv.find(a => a.startsWith('--port=')) || '--port=5500').slice(7);
const BASE = (process.argv.find(a => a.startsWith('--url=')) || `--url=http://${FAKE_HOST}:${PORT}/`).slice(6);

let fail = 0;
const check = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

(async () => {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${FAKE_HOST} 127.0.0.1`] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const blockedPageSessionsPosts = [];
  const consoleErrors = [];
  // "Failed to load resource"는 내가 의도적으로 route.abort()한 요청의 정상적인 부작용이라
  // 진짜 에러가 아니다 — 그걸 빼고도 남는 콘솔 에러가 있는지가 진짜 검사 대상.
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    if (/Failed to load resource/.test(msg.text())) return;
    consoleErrors.push(msg.text());
  });

  // GET만 통과, 그 외(POST/PATCH/...)는 전부 abort — 쓰기 0을 보장. page_sessions로 가는
  // POST는 body를 기록해두고 abort(막힌 요청도 무엇을 보내려 했는지는 알 수 있다).
  await ctx.route('**://*.supabase.co/**', route => {
    const req = route.request();
    if (req.method() === 'GET') return route.continue();
    if (req.url().includes('/rest/v1/page_sessions')) {
      try { blockedPageSessionsPosts.push(JSON.parse(req.postData() || '{}')); } catch (_) {}
    }
    return route.abort();
  });

  console.log(`\n=== 실브라우저 로드: ${BASE} ===`);
  const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  check(resp && resp.ok(), `페이지 로드 성공 — status ${resp?.status()}`);

  const hasApi = await page.evaluate(() => ({
    push: typeof window.pushActiveView === 'function',
    pop: typeof window.popActiveView === 'function',
  }));
  check(hasApi.push && hasApi.pop, `window.pushActiveView/popActiveView 실제 로드됨 — ${JSON.stringify(hasApi)}`);

  if (hasApi.push && hasApi.pop) {
    console.log(`\n=== 실제 fetch(keepalive) 경로로 세그먼트 전환 유발(차단된 POST 바디 검사) ===`);
    // push 시점에 "이전 세그먼트(index, 페이지 로드~지금)"가 먼저 flush된다. sleep은
    // 브라우저 컨텍스트에서 실제 시계가 흐르게 page.waitForTimeout으로.
    await page.waitForTimeout(3200); // index 세그먼트를 3초 넘겨 문턱을 통과시킴
    const token = await page.evaluate(() => window.pushActiveView('verify-live-test-view'));
    check(typeof token === 'number' && token > 0, `pushActiveView가 유효한 토큰 반환 — ${token}`);
    await page.waitForTimeout(3200); // 신규 세그먼트도 3초 넘김
    await page.evaluate(t => window.popActiveView(t), token);
    await page.waitForTimeout(200); // fetch 호출이 실제로 나가기까지 잠깐 대기

    check(blockedPageSessionsPosts.length >= 2,
      `page_sessions POST 시도 2회 이상 가로챔(push 시 이전 세그먼트 flush + pop 시 신규 세그먼트 flush) — 실제 ${blockedPageSessionsPosts.length}건`);
    if (blockedPageSessionsPosts.length >= 2) {
      const testSeg = blockedPageSessionsPosts.find(p => p.page === 'verify-live-test-view');
      check(!!testSeg, `그중 하나가 page='verify-live-test-view' — 실제 라벨들: ${JSON.stringify(blockedPageSessionsPosts.map(p=>p.page))}`);
      if (testSeg) check(testSeg.duration_sec >= 3, `duration_sec ≥ 3초(3.2초 대기 반영) — 실제 ${testSeg.duration_sec}`);
      const keepaliveOk = blockedPageSessionsPosts.every(p => p.session_key); // keepalive 자체는 브라우저 내부 플래그라 payload로는 직접 확인 불가, session_key 존재로 정상 payload 형태만 확인
      check(keepaliveOk, `payload에 session_key 포함(정상 형태) — ${JSON.stringify(blockedPageSessionsPosts.map(p=>({page:p.page,dur:p.duration_sec,sk:!!p.session_key})))}`);
    }
  }

  // _startAnonHeartbeat(비로그인 방문자 추적, 이번 변경과 무관)이 내가 막은 POST에 대해
  // "Failed to fetch"를 정직하게 console.error로 남기는 건 **의도된 정상 동작**이다(DB 함수
  // 에러 처리 규칙 — 실패를 조용히 삼키지 않는 것). 내 차단이 만든 부작용이지 앱 버그가
  // 아니므로 실패로 세지 않는다. 진짜로 봐야 하는 건 **이번에 건드린 pushActiveView/
  // popActiveView/script-nav 쪽에서** 예상 밖 에러가 나는지다.
  const unexpectedErrors = consoleErrors.filter(e => !/_startAnonHeartbeat/.test(e));
  console.log(`  ℹ️  차단으로 인한 기대된 에러(무관, _startAnonHeartbeat) ${consoleErrors.length - unexpectedErrors.length}건 별도 집계`);
  check(unexpectedErrors.length === 0, `이번 변경 관련 콘솔 에러 0건 — 실제 ${unexpectedErrors.length}건: ${JSON.stringify(unexpectedErrors.slice(0,3))}`);

  await browser.close();
  console.log(`\n${fail === 0 ? '✅ 전부 통과 — 운영 DB 쓰기 0건(전부 GET 이외 차단)' : `🔴 ${fail}건 실패`}`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error('🔴 스크립트 실행 중 예외', err); process.exit(1); });
