#!/usr/bin/env node
/**
 * GS5 — escH 사본 통합 검증 (DB 불필요, 읽기전용)
 *
 * 두 가지를 따로 답한다:
 *   ① 정본(window.escH)의 동작이 사본들의 상위집합인가       — eval로 실제 실행
 *   ② assets/js에 escape 체인 사본이 남아 있는가             — 소스 스캔
 *
 * 🚨 --negctl 을 먼저 돌릴 것. 가짜 사본을 주입해 스캐너가 실제로 잡는지 본 뒤에야
 *    「✅ 0건」을 믿는다. (CLAUDE.md 「검사기를 먼저 의심한다」)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'assets', 'js');
const NEG = process.argv.includes('--negctl');

let fail = 0;
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => { fail++; console.log('  🔴 ' + m); };

// ── ① 정본 동작 ──────────────────────────────────────────────
console.log('\n=== ① 정본 window.escH 동작 ===');
const src = fs.readFileSync(path.join(JS, 'supabase-client.js'), 'utf8');
const m = src.match(/window\.escH\s*=\s*function[\s\S]*?\n\};/);
if (!m) { bad('supabase-client.js에서 window.escH 정의를 못 찾음 — 이 검사기가 낡았다'); }
else {
  const sandbox = { escH: null };
  new Function('window', m[0])(sandbox);
  const escH = sandbox.escH;
  const cases = [
    ['&<>"', '&amp;&lt;&gt;&quot;', '4자 전부 이스케이프'],
    [0, '0', 'esc(0) → "0" (사본의 ||는 ""였다)'],
    [null, '', 'null → 빈 문자열'],
    [undefined, '', 'undefined → 빈 문자열 (사본 2개는 "undefined"를 출력했다)'],
    ['평범한 닉네임', '평범한 닉네임', '일반 문자열 무변경'],
  ];
  for (const [input, want, label] of cases) {
    const got = escH(input);
    got === want ? ok(`${label} — ${JSON.stringify(got)}`)
                 : bad(`${label} — 기대 ${JSON.stringify(want)} / 실제 ${JSON.stringify(got)}`);
  }
  // 사본이 하던 3자 이스케이프를 정본이 전부 포함하는가(상위집합 증명)
  const legacy = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const samples = ['a&b', '<script>', '따옴표 "x"', '', 'A<B>C&D'];
  const superset = samples.every(s => escH(s) === legacy(s) || escH(s) === legacy(s).replace(/"/g, '&quot;'));
  superset ? ok('사본(3자)이 만들던 출력의 상위집합 — 차이는 " → &quot; 뿐')
           : bad('상위집합이 아님 — 통합이 출력을 바꾼다');
}

// ── ② 남은 사본 스캔 ─────────────────────────────────────────
console.log('\n=== ② assets/js에 남은 escape 체인 ===');

// 통합 대상이 아님이 확인된 자리 (이유를 함께 적는다)
const ALLOW = [
  { file: 'supabase-client.js', why: '정본 자신' },
  { file: 'play-records-utils.js', needle: "replace(/\"/g, '&quot;')", why: '속성 전용 이스케이퍼(&와 "만) — <>를 건드리지 않는 것이 의도' },
  { file: 'game-sheet.js', needle: 'JSON.stringify(allPhotos)', why: 'data-urls 속성에 넣는 JSON — & " 만 처리하는 별도 규칙' },
  { file: 'kakao-auth.js', needle: '_escC', why: '&와 <만 처리하는 축약 이스케이퍼(별건)' },
  { file: 'game-sheet.js', needle: "String(u.nickname || '(알 수 없음)')", why: '&와 <만 처리하는 부분 이스케이프(별건)' },
];

// 스캔 본체 — 음성 대조군도 반드시 이 함수를 통과시킨다(다른 경로를 쓰면 대조군이 거짓말한다)
function scan(fileName, content) {
  const out = [];
  content.split('\n').forEach((line, i) => {
    if (!/replace\(\s*\/&\/g/.test(line)) return;
    if (ALLOW.some(a => a.file === fileName && (!a.needle || line.includes(a.needle)))) return;
    out.push({ f: fileName, n: i + 1, line: line.trim() });
  });
  return out;
}

if (NEG) {
  // 음성 대조군 — 실제 파일 내용에 가짜 사본 한 줄을 끼워 같은 scan()에 먹인다.
  // ⚠️ 파일명을 game-sheet.js로 주는 이유: ALLOW의 파일 예외가 대조군을 삼키지 않는지까지 본다.
  const real = fs.readFileSync(path.join(JS, 'game-sheet.js'), 'utf8');
  const fakeLine = "  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');";
  const base = scan('game-sheet.js', real).length;
  const withFake = scan('game-sheet.js', real + '\n' + fakeLine);
  (withFake.length === base + 1)
    ? ok(`음성 대조군: 주입한 가짜 사본 1건을 scan()이 잡았다 (${base} → ${withFake.length}) — 판정기 작동`)
    : bad(`음성 대조군 실패 (${base} → ${withFake.length}) — 아래 「0건」을 믿지 말 것`);
}

const files = fs.readdirSync(JS).filter(f => f.endsWith('.js'));
const hits = files.flatMap(f => scan(f, fs.readFileSync(path.join(JS, f), 'utf8')));

if (hits.length === 0) ok('남은 사본 0건');
else hits.forEach(h => bad(`${h.f}:${h.n}  ${h.line}`));

console.log('\n── 판정 ──');
console.log(fail === 0 ? '✅ 전부 통과' : `🔴 ${fail}건 실패`);
process.exit(fail === 0 ? 0 : 1);
