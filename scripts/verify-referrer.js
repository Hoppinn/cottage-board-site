// #28 검증 — 「유입 소스가 「직접 방문」 한 칸에서 갈라지는가」 (읽기 전용, DB 무변경)
//
//   node scripts/verify-referrer.js            정상 실행
//   node scripts/verify-referrer.js --negctl   음성 대조군 (옛 `|| '직접 방문'` 폴백을 되살린다)
//
// 🚨 --negctl을 먼저 돌릴 것. 폴백을 되살렸을 때 ②③이 🔴로 뒤집히는 걸 본 뒤에야
//    「전부 통과」를 믿는다(CLAUDE.md 「검사기를 먼저 의심한다」).
// 🚨 사본을 검사하지 않는다 — categorizeRef와 refSecMap 루프를 화면 코드에서 **원문 그대로
//    잘라 eval**한다. 손으로 옮겨 적으면 화면과 검사기가 조용히 갈라진다.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');

let window = { location: { hostname: 'cottageboard.co.kr' } };
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');
const html = R('pages/admin/requests-admin.html');
const navSrc = R('assets/js/script-nav.js');
const sbSrc = R('assets/js/supabase-client.js');

// ── 화면에서 categorizeRef를 그대로 떼어온다 ──────────────────────
{
  var s = html.indexOf('function _punycodeLabel(');
  var mk = '} catch (_) { return null; }\n        }';
  var e = html.indexOf(mk, html.indexOf('function categorizeRef(ref)'));
  if (s < 0 || e < 0) { console.error('🔴 categorizeRef를 못 찾음 — 검사기가 낡았다'); process.exit(1); }
}
const categorizeRef = new Function('window', html.slice(s, e) + mk + '\nreturn categorizeRef;')(window);

// ── 화면에서 refSecMap 집계 루프를 그대로 떼어온다 ────────────────
const LS = 'const refSecMap = {};';
const LE = "refSecMap[cat] = (refSecMap[cat] || 0) + (r.duration_sec || 0);\n        }";
const ls = html.indexOf(LS), le = html.indexOf(LE, ls);
if (ls < 0 || le < 0) { console.error('🔴 refSecMap 루프를 못 찾음 — 검사기가 낡았다'); process.exit(1); }
let loopSrc = html.slice(ls, le) + LE;
// 음성 대조군: 고친 한 줄을 옛 형태로 되돌린다
if (NEG) loopSrc = loopSrc
  .replace("const cat = r.referrer ? categorizeRef(r.referrer) : '직접 방문';", "const cat = categorizeRef(r.referrer) || '직접 방문';")
  .replace('if (!cat) { refUnattribSec += (r.duration_sec || 0); refUnattribRows++; continue; }', '');
// ⚠️ 잘라온 구간에 `let refUnattribSec = 0, refUnattribRows = 0;`가 이미 들어 있다 — 앞에
//    다시 선언하면 SyntaxError. 화면 코드를 원문으로 쓰는 검사기라 이런 결합이 생긴다.
const runLoop = new Function('categorizeRef', 'filtered',
  loopSrc + '\nreturn { refSecMap, refUnattribSec, refUnattribRows };');

(async () => {
  let fail = 0;
  const say = (ok, msg) => { console.log(`${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };
  if (NEG) console.log('⚠️  음성 대조군 모드 — ②③이 🔴로 뒤집혀야 정상\n');

  // ── ① 쓰는 경로가 규칙 하나를 공유하는가 (정적) ──────────────
  console.log('=== ① 저장 규칙 단일화 ===');
  say(/window\.COTTAGE_SESSION_REF\s*=\s*_sessionReferrer/.test(sbSrc),
      'supabase-client.js가 COTTAGE_SESSION_REF를 노출한다');
  const tracker = navSrc.slice(navSrc.indexOf('# PAGE SESSION TRACKER'));
  say(/const _ref = window\.COTTAGE_SESSION_REF/.test(tracker),
      'script-nav.js 트래커가 그 값을 그대로 쓴다');
  say(!/new URL\(document\.referrer\)/.test(tracker),
      'script-nav.js 트래커에 자체 referrer 파싱이 남아 있지 않다');
  // 로드 순서 — 14개 페이지 전수
  const pages = fs.readdirSync(path.join(__dirname, '..'), { recursive: true })
    .filter(f => String(f).endsWith('.html')).map(String)
    .filter(f => R(f).includes('script-nav.js'));
  let bad = pages.filter(f => {
    const t = R(f);
    return t.indexOf('supabase-client.js') > t.indexOf('script-nav.js');
  });
  say(pages.length >= 14 && bad.length === 0,
      `script-nav.js를 쓰는 ${pages.length}개 페이지 전부에서 supabase-client.js가 먼저 로드${bad.length ? ' — 위반: ' + bad : ''}`);

  // ── 실데이터 ─────────────────────────────────────────────
  const { data, error } = await db.from('page_sessions').select('referrer, duration_sec').limit(50000);
  const { count } = await db.from('page_sessions').select('*', { count: 'exact', head: true });
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  console.log(`\n전수 ${data.length}행 (count=${count})`);
  say(data.length === count, '절단 없음');

  const { refSecMap, refUnattribSec, refUnattribRows } = runLoop(categorizeRef, data);

  // ── ② 「직접 방문」에 진짜 직접 방문만 들어가는가 ─────────────
  console.log('\n=== ② 「직접 방문」 버킷의 순도 ===');
  const trueDirect = data.filter(r => !r.referrer);
  const trueDirectSec = trueDirect.reduce((s, r) => s + (r.duration_sec || 0), 0);
  say((refSecMap['직접 방문'] || 0) === trueDirectSec,
      `직접 방문 체류 = referrer 없는 ${trueDirect.length}행의 합 ${(trueDirectSec / 3600).toFixed(1)}h ` +
      `(집계값 ${((refSecMap['직접 방문'] || 0) / 3600).toFixed(1)}h)`);

  // ── ③ 귀속 불가 행이 어느 버킷에도 안 섞이는가 ────────────────
  console.log('\n=== ③ 귀속 불가(옛 저장 방식) 분리 ===');
  const unattrib = data.filter(r => r.referrer && !categorizeRef(r.referrer));
  const unattribSec = unattrib.reduce((s, r) => s + (r.duration_sec || 0), 0);
  say(refUnattribRows === unattrib.length && refUnattribSec === unattribSec,
      `귀속 불가 ${unattrib.length}행 / ${(unattribSec / 3600).toFixed(1)}h 가 별도 계상됨`);
  const total = Object.values(refSecMap).reduce((a, b) => a + b, 0);
  const grand = data.reduce((s, r) => s + (r.duration_sec || 0), 0);
  say(total + refUnattribSec === grand,
      `막대 합 + 제외분 = 전체 (${(total / 3600).toFixed(1)}h + ${(refUnattribSec / 3600).toFixed(1)}h = ${(grand / 3600).toFixed(1)}h)`);

  console.log('\n=== 버킷별 체류 ===');
  Object.entries(refSecMap).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${(v / 3600).toFixed(1)}h`));
  console.log(`  ${'(제외)'.padEnd(14)} ${(refUnattribSec / 3600).toFixed(1)}h  ${refUnattribRows}행`);

  console.log(NEG
    ? (fail ? `\n✅ 음성 대조군 정상 — ${fail}건이 뒤집혔다(검사기가 실제로 검사 중)`
            : '\n🔴 음성 대조군인데 전부 통과 — 이 검사기는 아무것도 검사하지 않는다')
    : (fail ? `\n🔴 ${fail}건 실패` : '\n✅ 전부 통과'));
  process.exit(0);
})();
