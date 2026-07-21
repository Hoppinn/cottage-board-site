/**
 * 동호회 기록&사진 ↔ 플레이기록 — ①참여자 닉네임 클릭 ②크로스 페이지 복귀 링크 검증 (DB 불필요)
 *
 * 원문을 잘라 eval한다(사본을 만들면 한쪽만 고쳐진다):
 *   - play-records-utils.js  renderCrossBackLink
 *   - club-history.html      참여자 태그 생성줄 + 핸들러의 맵 조회식
 *
 * 사용: node scripts/verify-cross-nav.js [--negctl]
 *   --negctl: 기대값을 비틀어 그 줄에서만 🔴이 뜨는지 본다. 안 뜨면 검사기가 고장난 것이다.
 */
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  🔴 ${name}\n       기대: ${JSON.stringify(want)}\n       실제: ${JSON.stringify(got)}`); }
}

const utils = R('assets/js/play-records-utils.js');
const history = R('pages/club/club-history.html');
const reviews = R('assets/js/game-reviews.js');

// ── ① 크로스 링크에 ?from= 이 붙어 있는가 ────────────────────────────────
console.log('\n=== ① 크로스 링크의 ?from= ===');
const histLinks = [...history.matchAll(/game-reviews\.html(\?from=club-history)?/g)].map(m => !!m[1]);
check('club-history → 플레이기록 링크 전부에 ?from=club-history',
  histLinks.length > 0 && histLinks.every(Boolean), NEG ? false : true);
check('club-history의 그 링크 개수(팁 + 하단 크로스링크)', histLinks.length, 2);
check('game-reviews → 동호회 링크에 ?from=game-reviews',
  /club-history\.html\?from=game-reviews/.test(reviews), true);

// ── ② renderCrossBackLink 동작 ───────────────────────────────────────────
console.log('\n=== ② 복귀 링크 렌더 ===');
const srcTargets = utils.match(/const _BACK_TARGETS = \{[\s\S]*?\};/);
const srcRender  = utils.match(/function renderCrossBackLink\(\)[\s\S]*?\n  \}/);
if (!srcTargets || !srcRender) { console.log('🔴 원문을 못 잘랐다 — 함수 형태가 바뀌었는지 확인할 것'); process.exit(1); }

function run(fromParam, referrer, opts = {}) {
  const created = [];
  const inserted = [];
  const el = tag => ({
    tag, className: '', href: '', textContent: '', _listeners: {},
    addEventListener(t, fn) { this._listeners[t] = fn; },
    parentNode: { insertBefore(node, before) { inserted.push({ node, before }); } },
  });
  const anchor = el('nav');
  const doc = {
    referrer,
    querySelector(sel) {
      if (sel === '.inner-page > .breadcrumb') return opts.noAnchor ? null : anchor;
      if (sel === '.cross-back-link') return opts.already ? el('a') : null;
      return null;
    },
    createElement(t) { const e = el(t); created.push(e); return e; },
  };
  const sandbox = {
    location: { search: fromParam ? `?from=${fromParam}` : '' },
    document: doc,
    history: { length: opts.histLen ?? 2, back() { sandbox._backCalled = true; } },
    URLSearchParams,
    _backCalled: false,
  };
  const fn = new Function('location', 'document', 'history', 'URLSearchParams', '_ctx',
    `${srcTargets[0]}\n${srcRender[0]}\nreturn renderCrossBackLink();`);
  fn(sandbox.location, doc, { length: opts.histLen ?? 2, back() { sandbox._backCalled = true; } },
     URLSearchParams, sandbox);
  return { created, inserted, sandbox };
}

const fromHist = run('club-history', 'https://x/pages/club/club-history.html');
check('?from=club-history → 링크 1개 삽입', fromHist.inserted.length, NEG ? 0 : 1);
check('라벨 — 받침 있는 「사진」 뒤엔 「으로」', fromHist.created[0]?.textContent, '← 모임 기록 & 사진으로 돌아가기');
check('href', fromHist.created[0]?.href, '../club/club-history.html');
check('클래스', fromHist.created[0]?.className, 'cross-back-link');

const fromRev = run('game-reviews', '');
check('?from=game-reviews → 플레이 기록으로', fromRev.created[0]?.textContent, '← 플레이 기록으로 돌아가기');
check('href', fromRev.created[0]?.href, '../game/game-reviews.html');

check('from 파라미터 없음 → 아무것도 안 만든다', run('', '').inserted.length, 0);
check('모르는 from 키 → 무시', run('nonexistent', '').inserted.length, 0);
check('이미 링크가 있으면 두 번 안 만든다',
  run('club-history', '', { already: true }).inserted.length, 0);
check('브레드크럼이 없는 페이지 → 조용히 통과(크래시 없음)',
  run('club-history', '', { noAnchor: true }).inserted.length, 0);

// ── ②-b ⋯ 메뉴가 잘리지 않는 조건 ────────────────────────────────────────
// 이 메뉴는 하루에 두 번 틀린 자리다(fixed 추적 → 위로 펼치기 → 지금). 회귀를 CSS에서 막는다.
console.log('\n=== ②-b ⋯ 메뉴 잘림 방지 ===');
const css = R('assets/css/style.css');
const prSessionRule = css.match(/^\.pr-session \{[^}]*\}/m)?.[0] || '';
check('.pr-session에 overflow:hidden이 없다 (있으면 메뉴가 카드 경계에서 잘린다)',
  /overflow:\s*hidden/.test(prSessionRule), NEG ? true : false);
check('대신 헤더가 자기 모서리를 갖는다 (각진 배경이 카드 반경 밖으로 나오는 걸 막는다)',
  /\.pr-session > \.pr-session-hd \{[^}]*border-radius/.test(css), true);
check('접힌 카드는 헤더가 네 모서리를 갖는다',
  /\.pr-session:not\(\.is-open\) > \.pr-session-hd \{[^}]*border-radius/.test(css), true);
check('JS가 메뉴 좌표를 계산하지 않는다 (fixed·top·bottom 지정 금지)',
  /function trackMoreMenu[\s\S]{0,300}?(style\.(top|bottom|position)|getBoundingClientRect)/.test(utils), false);

// ── ③ club-history 참여자 태그 ──────────────────────────────────────────
console.log('\n=== ③ 동호회 기록 참여자 닉네임 ===');
check('참여자 태그에 data-nick이 붙는다', /pr-tag-who[^`]*data-nick="\$\{escAttr\(t\)\}"/.test(history), NEG ? false : true);
check('클릭 핸들러가 openOtherProfileSheet를 부른다',
  /pr-tag-who\[data-nick\][\s\S]{0,400}openOtherProfileSheet/.test(history), true);
check('맵을 profiles로 채운다', /getAllProfiles/.test(history), true);
check('맵을 기록 작성자로도 보강한다',
  /for \(const r of records\)[\s\S]{0,160}nickUserMap\.set/.test(history), true);
check('연결 안 되는 이름은 핸들러를 안 단다(조용한 무반응 대신 커서도 안 바뀜)',
  /const uid = nickUserMap\.get[\s\S]{0,80}if \(!uid\) return;/.test(history), true);

// ── ④ 인라인 스크립트 문법 ───────────────────────────────────────────────
console.log('\n=== ④ club-history 인라인 스크립트 문법 ===');
const inline = history.match(/<script>\s*\(function \(\)[\s\S]*?\n  <\/script>/);
try {
  new Function(inline[0].replace(/^<script>/, '').replace(/<\/script>$/, ''));
  check('파싱 통과', true, true);
} catch (e) { check(`파싱 실패: ${e.message}`, false, true); }

console.log(`\n${fail === 0
  ? (NEG ? '🔴 음성 대조군인데 전부 통과했다 — 검사기가 기대값을 안 본다. 아래 결과 믿지 말 것.'
         : `✅ 전부 통과 (${pass}건)`)
  : (NEG ? `✅ 음성 대조군 정상 — 비튼 줄에서만 실패 ${fail}건`
         : `🔴 실패 ${fail}건 / 통과 ${pass}건`)}`);
process.exit(0);
