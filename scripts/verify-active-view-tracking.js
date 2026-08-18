// 활성 뷰 세그먼트 추적(pushActiveView/popActiveView) 로직 검증 — 읽기 전용, DB 안 건드림.
//
//   node scripts/verify-active-view-tracking.js --negctl   ← 먼저 이걸 돌릴 것
//   node scripts/verify-active-view-tracking.js
//
// script-nav.js의 "# PAGE SESSION TRACKER" IIFE를 원문 그대로 잘라 eval한다(사본 검사 금지 —
// #14 검증 선례와 동일 원칙). fetch는 목으로 갈아끼워 실제 네트워크/DB 쓰기가 전혀 없다 —
// 여기서 확인하는 건 "무엇을 몇 번, 어떤 라벨·길이로 보내려 했는가"라는 로직 자체다.
// 실제 DB 값 대조는 별도로 실브라우저 시나리오 1회 확인이 필요(PLAN_active_view_tracking.md 1차 검증계획).
//
// 🚨 --negctl: 3초 미만 컷 문턱을 0으로 낮춰 넣는다. 그래도 "0.x초짜리도 전송됨"이 안 잡히면
//    판정기가 문턱 자체를 안 보고 있다는 뜻이므로 본 판정을 믿지 말 것.
const fs = require('fs');
const path = require('path');

const NEGCTL = process.argv.includes('--negctl');

// negctl은 "3초 미만 컷 문턱"이 실제로 걸려 있는지만 좁게 겨눈다(verify-session-dedup.js와
// 같은 관례 — 대조군을 스위트 전체가 아니라 그 문턱을 직접 쓰는 테스트 하나에만 적용).
// forceNegctl을 안 주면 항상 정상(3초 문턱 켜진) 트래커를 로드한다 — 그래야 나머지
// 테스트들의 고정 인덱스 기댓값이 --negctl 유무와 무관하게 안정적으로 유지된다.
function loadTracker({ fakeNow, admin = false, embedded = false, forceNegctl = false } = {}) {
  const srcPath = path.join(__dirname, '..', 'assets', 'js', 'script-nav.js');
  const full = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');
  const from = full.indexOf('/* =========================\n   # PAGE SESSION TRACKER');
  if (from < 0) { console.error('🔴 PAGE SESSION TRACKER 블록을 못 찾았다 — 구조가 바뀌었다. 판정 중단'); process.exit(1); }
  const closeMarker = '})();';
  const to = full.indexOf(closeMarker, from);
  if (to < 0) { console.error('🔴 IIFE 종료를 못 찾았다. 판정 중단'); process.exit(1); }
  let src = full.slice(from, to + closeMarker.length);
  if (!src.includes('window.pushActiveView') || !src.includes('window.popActiveView')) {
    console.error('🔴 잘라온 범위에 pushActiveView/popActiveView가 없다. 판정 중단'); process.exit(1);
  }
  if (forceNegctl) {
    const before = src;
    src = src.replace('if (dur >= 3) _sendRow', 'if (dur >= 0) _sendRow');
    if (src === before) { console.error('🔴 음성 대조군 주입 실패 — 3초 문턱 표현을 못 찾았다. 판정 중단'); process.exit(1); }
  }

  const sent = []; // { page, duration_sec, entered_at }
  let now = fakeNow || Date.now();

  const localStorageStore = { cottage_session_id: 'test-session-key' };
  if (admin) localStorageStore.cottage_is_admin = '1';

  const listeners = { visibilitychange: [], pagehide: [] };
  const fakeDocument = {
    visibilityState: 'visible',
    addEventListener: (ev, fn) => { if (listeners[ev]) listeners[ev].push(fn); },
  };
  // top === self여야 "임베드 아님"이다 — 서로 다른 리터럴 {}는 항상 !==라 이 둘을
  // 같은 참조로 둬야 한다(처음에 {}, {}로 각각 만들었다가 _isEmbeddedFrame()이 항상
  // true가 되는 바람에 모든 테스트가 조용히 0건으로 나온 실패를 여기서 직접 겪었다).
  const _selfRef = {};
  const fakeWindow = {
    location: { hostname: 'cottageboard.co.kr', pathname: '/index.html' },
    top: _selfRef, self: _selfRef,
    SUPABASE_CONFIG: { url: 'https://example.invalid', anonKey: 'anon-key' },
    COTTAGE_PAGE_SLUG: p => (String(p || '/').split('/').filter(Boolean).pop() || 'index').replace(/\.html$/, ''),
    COTTAGE_SESSION_REF: null,
    addEventListener: (ev, fn) => { if (listeners[ev]) listeners[ev].push(fn); },
    localStorage: {
      getItem: k => (k in localStorageStore ? localStorageStore[k] : null),
      setItem: (k, v) => { localStorageStore[k] = v; },
    },
  };
  if (embedded) fakeWindow.top = { different: true }; // top !== self → _isEmbeddedFrame() true

  const sandbox = {
    window: fakeWindow,
    document: fakeDocument,
    location: fakeWindow.location,
    localStorage: fakeWindow.localStorage,
    fetch: (url, opts) => {
      const body = JSON.parse(opts.body);
      sent.push({ page: body.page, duration_sec: body.duration_sec, entered_at: body.entered_at });
      return Promise.resolve({ ok: true });
    },
    console,
  };
  const fn = new Function(...Object.keys(sandbox), src + '\nreturn { pushActiveView: window.pushActiveView, popActiveView: window.popActiveView };');
  const api = fn(...Object.values(sandbox));

  return {
    sent,
    push: key => api.pushActiveView ? api.pushActiveView(key) : null,
    pop: token => api.popActiveView ? api.popActiveView(token) : undefined,
    advance: sec => { now += sec * 1000; realNowStub.value = now; },
    fireHidden: () => { fakeDocument.visibilityState = 'hidden'; listeners.visibilitychange.forEach(fn => fn()); },
    fireVisible: () => { fakeDocument.visibilityState = 'visible'; listeners.visibilitychange.forEach(fn => fn()); },
    firePagehide: () => { listeners.pagehide.forEach(fn => fn()); },
    api,
  };
}

// Date.now()를 가짜 시계로 통일 — advance()가 실제로 시간을 흐르게 한다.
const realNowStub = { value: Date.now() };
const _realDateNow = Date.now;
Date.now = () => realNowStub.value;

let fail = 0;
const check = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

console.log(`\n=== 1) 단일 push→pop ===`);
{
  realNowStub.value = 1_000_000_000_000;
  const t = loadTracker();
  t.advance(10); // 메인에서 10초 머묾
  const tok = t.push('my-board');
  t.advance(10); // 내 보드에서 10초
  t.pop(tok);
  t.advance(10); // 다시 메인에서 10초
  t.firePagehide(); // 마지막 세그먼트 flush

  check(t.sent.length === 3, `행 3개(메인10·my-board10·메인10) — 실제 ${t.sent.length}개: ${JSON.stringify(t.sent.map(s=>[s.page,s.duration_sec]))}`);
  if (t.sent.length === 3) {
    check(t.sent[0].page === 'index' && t.sent[0].duration_sec === 10, `1행 index/10초 — ${t.sent[0].page}/${t.sent[0].duration_sec}`);
    check(t.sent[1].page === 'my-board' && t.sent[1].duration_sec === 10, `2행 my-board/10초 — ${t.sent[1].page}/${t.sent[1].duration_sec}`);
    check(t.sent[2].page === 'index' && t.sent[2].duration_sec === 10, `3행 index/10초(복귀) — ${t.sent[2].page}/${t.sent[2].duration_sec}`);
  }
  const totalDur = t.sent.reduce((a, s) => a + s.duration_sec, 0);
  check(totalDur === 30, `합계 30초 — 실제 ${totalDur}초`);
}

console.log(`\n=== 2) 중첩 2단: 메인→A→B→B닫기(A로 복귀)→A닫기(메인 복귀) ===`);
{
  realNowStub.value = 1_000_000_000_000;
  const t = loadTracker();
  t.advance(5);
  const tokA = t.push('game-sheet');
  t.advance(5);
  const tokB = t.push('other-board');
  t.advance(5);
  t.pop(tokB); // B 닫기 — A로 복귀해야 함
  t.advance(5);
  t.pop(tokA); // A 닫기 — 메인(index)으로 복귀해야 함
  t.advance(5);
  t.firePagehide();

  const pages = t.sent.map(s => s.page);
  check(JSON.stringify(pages) === JSON.stringify(['index','game-sheet','other-board','game-sheet','index']),
    `순서 [index, game-sheet, other-board, game-sheet, index] — 실제 ${JSON.stringify(pages)}`);
}

console.log(`\n=== 3) 중복 pop(같은 토큰으로 두 번) — 스택 안 무너짐 ===`);
{
  realNowStub.value = 1_000_000_000_000;
  const t = loadTracker();
  t.advance(5);
  const tok = t.push('my-board');
  t.advance(5);
  t.pop(tok); // 정상 pop
  const afterFirstPopCount = t.sent.length;
  t.advance(5);
  t.pop(tok); // 중복 pop — no-op이어야 함(경고만, 스택/전송 영향 없음)
  t.advance(5);
  t.firePagehide();

  check(afterFirstPopCount === 2, `첫 pop 시점까지 2행(메인5·my-board5) — 실제 ${afterFirstPopCount}`);
  // 중복 pop이 무시됐다면 그 뒤 advance(5)+advance(5)=10초가 전부 "index" 라벨로 이어져
  // pagehide에서 하나의 10초 행으로 나가야 한다(중복 pop이 또 라벨을 바꿨다면 쪼개졌을 것).
  check(t.sent.length === 3 && t.sent[2].page === 'index' && t.sent[2].duration_sec === 10,
    `중복 pop 이후 index/10초 단일 행 — 실제 ${JSON.stringify(t.sent.slice(2))}`);
}

console.log(`\n=== 4) stale 토큰(이미 다른 뷰로 넘어간 뒤 옛 토큰으로 pop) ===`);
{
  realNowStub.value = 1_000_000_000_000;
  const t = loadTracker();
  const tokA = t.push('my-board');
  t.advance(5);
  const tokB = t.push('other-board'); // A 위에 B를 새로 push(A를 안 닫고)
  t.advance(5);
  t.pop(tokA); // A의 토큰으로 pop 시도 — 지금 top은 B라 mismatch, no-op이어야 함
  t.advance(5);
  t.pop(tokB); // 진짜 top(B) pop — my-board로 복귀해야 함(A가 여전히 스택에 있으므로)
  t.advance(5);
  t.firePagehide();

  // 진짜 검증 포인트는 sent[1] 쪽이다: stale pop(A)이 조금이라도 라벨을 바꾸거나 타이머를
  // 리셋했다면 other-board 구간이 5+5로 쪼개져 두 행이 됐을 것이다. **하나의 10초 행으로만**
  // 나가야 stale pop이 완전한 no-op(타이밍에도 영향 없음)이었다고 확정할 수 있다.
  check(t.sent[0].page === 'my-board' && t.sent[0].duration_sec === 5,
    `B push 시 A(my-board) 구간 5초 flush — 실제 ${JSON.stringify(t.sent[0])}`);
  check(t.sent[1].page === 'other-board' && t.sent[1].duration_sec === 10,
    `other-board가 5+5=10초 단일 행(stale pop이 안 쪼갬) — 실제 ${JSON.stringify(t.sent[1])}`);
  check(t.sent[2].page === 'my-board' && t.sent[2].duration_sec === 5,
    `pop(B) 이후 my-board로 정상 복귀, 마지막 5초 — 실제 ${JSON.stringify(t.sent[2])}`);
}

console.log(`\n=== 5) visibility hidden→visible — pop 없이 flush만, 숨은 시간은 안 셈 ===`);
{
  realNowStub.value = 1_000_000_000_000;
  const t = loadTracker();
  const tok = t.push('my-board');
  t.advance(10);
  t.fireHidden(); // 여기서 10초 flush, 스택은 유지(pop 아님)
  t.advance(999); // 탭이 숨겨진 999초 — 세지 않아야 함
  t.fireVisible(); // 시계 재시작
  t.advance(5);
  t.pop(tok); // my-board 5초만 나가야 하고, 스택이 안 깨졌으니 index로 정상 복귀
  t.advance(3);
  t.firePagehide();

  check(t.sent[0].page === 'my-board' && t.sent[0].duration_sec === 10, `hidden 시 my-board/10초 flush — ${JSON.stringify(t.sent[0])}`);
  check(t.sent[1].page === 'my-board' && t.sent[1].duration_sec === 5, `visible 복귀 후 5초만(999초 숨은 시간 미포함) — ${JSON.stringify(t.sent[1])}`);
  check(t.sent[2].page === 'index' && t.sent[2].duration_sec === 3, `pop 후 index로 정상 복귀, 마지막 3초 — ${JSON.stringify(t.sent[2])}`);
}

console.log(`\n=== 6) 3초 미만 세그먼트는 무시(기존 문턱 유지) ===${NEGCTL ? ' [--negctl 적용]' : ''}`);
{
  realNowStub.value = 1_000_000_000_000;
  const t = loadTracker({ forceNegctl: NEGCTL });
  const tok = t.push('my-board');
  t.advance(2); // 2초짜리 짧은 방문
  t.pop(tok);
  t.advance(5);
  t.firePagehide();
  if (NEGCTL) {
    check(t.sent.some(s => s.duration_sec < 3), `--negctl: 3초 미만도 전송됨(문턱 무력화 확인) — ${JSON.stringify(t.sent)}`);
  } else {
    check(!t.sent.some(s => s.page === 'my-board'), `my-board 2초 행은 전송 안 됨(3초 미만 컷) — ${JSON.stringify(t.sent)}`);
  }
}

console.log(`\n=== 7) 트래킹 스킵 조건(관리자/embedded) — push/pop이 안전하게 no-op ===`);
{
  realNowStub.value = 1_000_000_000_000;
  const tAdmin = loadTracker({ admin: true });
  check(tAdmin.api.pushActiveView === undefined, `관리자: window.pushActiveView 자체가 정의 안 됨(조기 return) — ${typeof tAdmin.api.pushActiveView}`);
  const tEmbed = loadTracker({ embedded: true });
  check(tEmbed.api.pushActiveView === undefined, `embedded(iframe): window.pushActiveView 자체가 정의 안 됨 — ${typeof tEmbed.api.pushActiveView}`);
}

console.log(`\n=== 8) 단일 writer — page_sessions INSERT를 시도하는 곳이 코드베이스에 한 곳뿐인가 ===`);
{
  const grepTargets = [
    ['assets/js/supabase-client.js', false],  // page_sessions insert가 없어야 함(단, _startAnonHeartbeat의 dur=0 마커는 예외)
    ['assets/js/script-nav.js', true],        // 유일한 duration>0 writer
  ];
  for (const [rel, shouldHave] of grepTargets) {
    const content = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    const matches = content.match(/page_sessions['"]\)?\s*\)?\.insert\(|rest\/v1\/page_sessions/g) || [];
    if (rel.endsWith('supabase-client.js')) {
      // supabase-client.js엔 _startAnonHeartbeat의 dur=0 "입장 마커" INSERT 1건만 남아있어야 한다(의도된 것, 발견 ⑧ 문서화됨).
      check(matches.length === 1, `supabase-client.js에 page_sessions insert가 정확히 1개(비로그인 dur=0 마커, 지속시간 writer 아님) — 실제 ${matches.length}개`);
    } else {
      check(matches.length >= 1 === shouldHave, `script-nav.js에 page_sessions insert 존재 — ${matches.length}개`);
    }
  }
}

console.log(`\n=== 9) profiles.today_seconds 로직 무변경 회귀 확인 (increment_profile_counters RPC 유지) ===`);
{
  const scContent = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-client.js'), 'utf8');
  check(scContent.includes("db.rpc('increment_profile_counters'"), 'increment_profile_counters RPC 호출 여전히 존재(profiles 총합 로직 무변경)');
  check(!scContent.includes('insertPageSession'), 'insertPageSession 파라미터 완전히 제거됨(죽은 코드 정리 확인)');
  check(!scContent.includes('_sessionEnterAt'), '_sessionEnterAt 상태도 완전히 제거됨(page_sessions insert에만 쓰이던 값)');
}

Date.now = _realDateNow;

console.log(`\n${fail === 0 ? '✅ 전부 통과' : `🔴 ${fail}건 실패`}`);
process.exit(fail === 0 ? 0 : 1);
