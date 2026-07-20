// #14 검증 — 「page 값이 슬러그 한 형태로 접히는가」 (읽기 전용, DB 무변경)
//
//   node scripts/verify-page-buckets.js            정상 실행
//   node scripts/verify-page-buckets.js --negctl   음성 대조군 (별칭 1개를 일부러 뺀다)
//
// 🚨 사본을 검사하지 않는다 — requests-admin.html에서 PAGE_KEY_ALIASES와 normalizePageKey를
//    **원문 그대로 잘라 eval**한다. 손으로 옮겨 적으면 화면과 검사기가 조용히 갈라진다.
// 음성 대조군: '메인'→index 별칭을 제거하면 index 버킷이 다시 2줄로 갈려야 한다. 안 갈리면
//    이 검사기는 무엇도 검사하고 있지 않은 것이다(CLAUDE.md 「검사기를 먼저 의심한다」).
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'page-labels.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

// ── 화면 코드에서 정규화기를 그대로 떼어온다 ────────────────────────
// ⚠️ 리포가 CRLF라 개행을 정규화하고 자른다 — 안 하면 마커가 안 잡혀 "못 찾음"이 난다
const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'admin', 'requests-admin.html'), 'utf8').replace(/\r\n/g, '\n');
const s = html.indexOf('const PAGE_KEY_ALIASES = {');
const e = html.indexOf('return PAGE_KEY_ALIASES[key] || key;\n    }', s);
if (s < 0 || e < 0) { console.error('🔴 requests-admin.html에서 정규화기를 못 찾음 — 검사기가 낡았다'); process.exit(1); }
let src = html.slice(s, e) + 'return PAGE_KEY_ALIASES[key] || key;\n    }';
if (NEG) src = src.replace("'메인': 'index',", '');
const PAGE_LABEL = window.COTTAGE_PAGE_LABELS || {};
const { PAGE_KEY_ALIASES, normalizePageKey } =
  new Function(src + '\nreturn { PAGE_KEY_ALIASES, normalizePageKey };')();

// script-nav.js / supabase-client.js가 앞으로 저장할 값 (슬러그) — 두 경로가 같은지도 본다
const SLUG = window.COTTAGE_PAGE_SLUG;

(async () => {
  let fail = 0;
  const say = (ok, msg) => { console.log(`${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

  // ── ① 두 저장 경로가 같은 값을 만드는가 (정적) ──────────────────
  console.log('=== ① 저장 경로 일치 ===');
  const inlineRule = p => (String(p || '/').split('/').filter(Boolean).pop() || 'index').replace(/\.html$/, '');
  const paths = ['/', '/index.html', '/pages/game/owned-games.html', '/pages/info/price-rules.html',
                 '/pages/club/club-schedule.html', '/pages/admin/requests-admin.html'];
  for (const p of paths) {
    say(SLUG(p) === inlineRule(p), `${p} → 트래커 "${SLUG(p)}" / heartbeat fallback "${inlineRule(p)}"`);
  }
  // 저장될 슬러그가 화면 정규화기를 통과해도 그대로여야 한다(멱등)
  for (const p of paths) {
    const slug = SLUG(p);
    say(normalizePageKey(slug) === slug, `멱등: normalizePageKey("${slug}") = "${normalizePageKey(slug)}"`);
  }

  // ── ② 실데이터 전수 — 접은 뒤 중복 버킷이 남는가 ────────────────
  console.log('\n=== ② 실데이터 (page_sessions 전수) ===');
  const { data, error } = await db.from('page_sessions').select('page').limit(50000);
  const { count } = await db.from('page_sessions').select('*', { count: 'exact', head: true });
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  say(data.length === count, `전수 확보 ${data.length}행 (count=${count})`);

  const raw = new Map();   // 원본값 → 행수
  const norm = new Map();  // 슬러그 → Set(원본값)
  for (const r of data) {
    const v = r.page == null ? '(null)' : r.page;
    raw.set(v, (raw.get(v) || 0) + 1);
    const k = normalizePageKey(v);
    (norm.get(k) || norm.set(k, new Set()).get(k)).add(v);
  }
  console.log(`   원본 ${raw.size}종 → 정규화 후 ${norm.size}종`);

  const rowsOf = k => [...norm.get(k)].reduce((a, v) => a + raw.get(v), 0);
  for (const [k, set] of [...norm].sort((a, b) => rowsOf(b[0]) - rowsOf(a[0]))) {
    console.log(`   ${String(rowsOf(k)).padStart(5)}행  ${k.padEnd(16)} ← ${[...set].map(v => `"${v}"(${raw.get(v)})`).join(' / ')}`);
  }

  // 🚨 판정은 "몇 개로 접혔나"가 아니라 **접힌 키가 전부 진짜 슬러그인가**다.
  //    별칭이 빠진 값은 자기 이름 그대로 키가 되므로 여기서 걸린다 — 그게 곧 쪼개진 버킷이다.
  //    (rls_test는 페이지가 아니라 2026-06-10 RLS 점검이 남긴 1행. 알고 흘려보낸다.)
  const KNOWN_NON_PAGE = new Set(['rls_test']);
  const stray = [...norm.keys()].filter(k => !PAGE_LABEL[k] && !KNOWN_NON_PAGE.has(k));
  console.log('\n=== ③ 슬러그로 접히지 않은 키 (= 쪼개진 버킷) ===');
  for (const k of stray) console.log(`   🔴 "${k}" — ${rowsOf(k)}행. PAGE_KEY_ALIASES에 없다`);
  say(stray.length === 0, `쪼개진 버킷 ${stray.length}종`);

  console.log(NEG
    ? `\n[음성 대조군] 실패 ${fail}건 — 0이면 검사기가 고장난 것이다.`
    : `\n${fail ? `🔴 실패 ${fail}건` : '✅ 전부 통과'}`);
  process.exit(0);
})();
