/**
 * 모임 기록 「캡션복사」 양식 검증 (DB 불필요, --live로 실DB 대조)
 *
 * club-history.html에서 formatPlayTime·formatScore·buildCaption을 **원문 그대로 잘라** eval한다
 * (다른 표현으로 베껴 쓰면 화면 코드가 바뀌어도 검사기가 통과한다).
 *
 * 보는 것 셋:
 *  ① 시간 변환 — DB는 분 정수만 갖는다(실측 5~360분). 「2시간30분」·「2시간」·「30분」
 *  ② 점수 「점」 — score_note는 자유 텍스트다. 숫자+구분자일 때만 붙인다.
 *     🚨 무조건 붙이면 「실패점」·「1패 1승점」이 된다. 실측에 그런 값이 실재한다.
 *  ③ 블록 조립 — 빈 필드의 줄이 통째로 빠지는가, 게임 사이가 빈 줄 하나인가
 *
 * 🚨 --negctl 을 먼저 돌릴 것. 기대값을 옛 양식(「N명」·해시태그·무조건 「점」)으로 뒤집어
 *    그 줄에서만 🔴이 뜨는 걸 본 뒤에야 「전부 통과」를 믿는다.
 */
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const LIVE = process.argv.includes('--live');
const ROOT = path.join(__dirname, '..');

let fail = 0, pass = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  🔴 ${label}\n       기대 ${JSON.stringify(expected)}\n       실제 ${JSON.stringify(actual)}`); }
}

// ── 화면 코드에서 원문 그대로 잘라온다 ────────────────────────
const src = fs.readFileSync(path.join(ROOT, 'pages/club/club-history.html'), 'utf8');
function cut(name, re) {
  const m = src.match(re);
  if (!m) {
    console.log(`🔴 club-history.html에서 ${name}을 못 찾았다 — 코드가 바뀌었거나 검사기가 낡았다. 결과 신뢰 금지`);
    process.exit(1);
  }
  return m[0];
}
const srcTime  = cut('formatPlayTime', /function formatPlayTime\(min\)[\s\S]*?\n    \}/);
const srcScore = cut('formatScore',    /function formatScore\(note\)[\s\S]*?\n    \}/);
const srcCap   = cut('buildCaption',   /function buildCaption\(records\)[\s\S]*?\n    \}/);

// getGameName은 게임 데이터에 의존 → 검사기에선 이름을 그대로 돌려주는 스텁으로 고정한다
// (검증 대상은 「이름 해석」이 아니라 「조립 양식」이다).
let getGameName = id => String(id);
eval(srcTime); eval(srcScore); eval(srcCap);

// ── ① 시간 변환 ──────────────────────────────────────────────
console.log(`\n=== ① 분 → 시간 표기 ===${NEG ? '  ⚠️ 음성 대조군 — 기대값을 옛 양식으로 뒤집음' : ''}`);
check('150분 → 2시간30분', formatPlayTime(150), NEG ? '150분' : '2시간30분');
check('120분 → 2시간(분 안 붙음)', formatPlayTime(120), NEG ? '120분' : '2시간');
check('30분 → 30분',       formatPlayTime(30),  '30분');
check('5분 → 5분(최소 실측값)', formatPlayTime(5), '5분');
check('360분 → 6시간(최대 실측값)', formatPlayTime(360), '6시간');
check('205분 → 3시간25분',  formatPlayTime(205), '3시간25분');
check('null → 빈 문자열(줄이 빠져야 함)', formatPlayTime(null), '');
check('0 → 빈 문자열',      formatPlayTime(0),   '');

// ── ② 점수 「점」 ────────────────────────────────────────────
console.log(`\n=== ② score_note → 점수 줄 ===`);
check('"154 / 143 / 141" → 점 붙음', formatScore('154 / 143 / 141'), '154 / 143 / 141점');
check('"76 / 56" → 점 붙음',         formatScore('76 / 56'),         '76 / 56점');
// 🚨 아래 넷은 실측값이다. 무조건 「점」을 붙이면 전부 깨진다
check('"실패" → 그대로',              formatScore('실패'),            NEG ? '실패점' : '실패');
check('"1패 1승" → 그대로',           formatScore('1패 1승'),         NEG ? '1패 1승점' : '1패 1승');
check('"볼테어 이지모드 클리어" → 그대로', formatScore('볼테어 이지모드 클리어'), '볼테어 이지모드 클리어');
check('"탐험가120 / 인간94" → 그대로', formatScore('탐험가120 / 인간94'), '탐험가120 / 인간94');
check('빈 값 → 빈 문자열(줄이 빠져야 함)', formatScore(null), '');
check('공백만 → 빈 문자열',            formatScore('   '),  '');

// ── ③ 블록 조립 ─────────────────────────────────────────────
console.log(`\n=== ③ 캡션 조립 ===`);
const recs = [
  { game_id: '듄임페리움봉기', player_count: 4, play_time_min: 120, score_note: '' },
  { game_id: '윈드밀밸리',     player_count: 3, play_time_min: 120, score_note: '154 / 143 / 141' },
  { game_id: '펄서2849',       player_count: 3, play_time_min: 150, score_note: '180 / 174 / 161' },
];
const out = buildCaption(recs);
check('점수 없는 게임은 그 줄이 빠진다', out.split('\n\n')[0], '듄임페리움봉기 (4인)\n2시간');
check('게임 사이는 빈 줄 하나', out.includes('2시간\n\n윈드밀밸리 (3인)'), true);
check('인원은 「N인」(옛 양식은 「N명」)', /\(4인\)/.test(out), NEG ? false : true);
check('참여자 이름을 넣지 않는다', /호핀|뽁|설애/.test(out), false);
check('해시태그를 넣지 않는다', /#/.test(out), NEG ? true : false);
check('🎲 헤더를 넣지 않는다', /🎲/.test(out), NEG ? true : false);
check('앞뒤 군더더기 없음(첫 글자가 게임명)', out.startsWith('듄임페리움봉기'), true);

console.log('\n── 실제 출력 ──');
console.log(out.split('\n').map(l => '  | ' + l).join('\n'));

// 엣지: 전부 빈 필드 / 빈 배열
check('필드가 전부 비면 게임명만', buildCaption([{ game_id: '셀레스티아' }]), '셀레스티아');
check('빈 배열 → 빈 문자열', buildCaption([]), '');
check('null → 빈 문자열', buildCaption(null), '');

// ── ④ 실DB 대조 (선택) ──────────────────────────────────────
async function live() {
  console.log(`\n=== ④ 실DB 값으로 렌더 (--live) ===`);
  const { createClient } = require(path.join(ROOT, 'node_modules/@supabase/supabase-js'));
  const win = {}; global.window = win;
  eval(fs.readFileSync(path.join(ROOT, 'assets/js/supabase-config.js'), 'utf8'));
  const db = createClient(win.SUPABASE_CONFIG.url, win.SUPABASE_CONFIG.anonKey);
  const { data, error, count } = await db.from('game_play_records')
    .select('game_id, player_count, play_time_min, score_note, group_name, played_at, created_at', { count: 'exact' })
    .eq('group_name', '코티지보드 동호회');
  if (error) { console.error('[game_play_records]', error); return; }
  console.log(`  동호회 기록 ${data.length}행 (count=${count})`);
  // 「점」이 안 붙는 값이 실제로 몇 건인지 = 이 규칙이 지키는 대상 수
  const free = data.filter(r => r.score_note && !/^[0-9\s/]+$/.test(String(r.score_note).trim()));
  console.log(`  숫자만이 아니라 「점」을 안 붙이는 score_note: ${free.length}건`);
  free.slice(0, 8).forEach(r => console.log(`    "${r.score_note}" → "${formatScore(r.score_note)}"`));
  const byDate = {};
  data.forEach(r => { const d = r.played_at || String(r.created_at).slice(0, 10); (byDate[d] ||= []).push(r); });
  const latest = Object.keys(byDate).sort().pop();
  console.log(`\n  ── ${latest} 캡션 ──`);
  console.log(buildCaption(byDate[latest]).split('\n').map(l => '  | ' + l).join('\n'));
}

(async () => {
  if (LIVE) await live();
  console.log(`\n── 판정 ──`);
  if (NEG) {
    console.log(fail >= 5
      ? `🟢 음성 대조군 성립 — 뒤집은 기대 ${fail}건에서만 🔴이 떴다. 본 검사의 「전부 통과」를 믿어도 된다.`
      : `⚠️ 음성 대조군 실패(🔴 ${fail}건) — 검사기가 실제 출력을 안 읽고 있을 수 있다. 통과를 믿지 말 것.`);
  } else {
    console.log(fail === 0
      ? `✅ 전부 통과 (${pass}건) — 캡션이 실제 쓰던 양식과 같고, 「실패」 같은 자유 텍스트에 「점」이 안 붙는다.`
      : `🔴 실패 ${fail}건 / 통과 ${pass}건`);
  }
  process.exit(0);
})();
