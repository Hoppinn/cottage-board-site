// 날짜별 모임 현황의 겹치는 게임 범위 회귀 검사 (DB 무접속)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/day-detail.js'), 'utf8');
const start = src.indexOf('  function _buildGameCoordinationSummaryHtml');
const end = src.indexOf('\n\n  window.openDateMeetingModal', start);
if (start < 0 || end < 0) throw new Error('모임 현황 계산 함수를 찾지 못했습니다.');

const context = {
  esc: value => String(value),
  resolveGameName: game => game.custom_name || game.game_id || '',
};
vm.createContext(context);
vm.runInContext(`${src.slice(start, end)}\nthis.buildSummary = _buildGameCoordinationSummaryHtml;`, context);

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

const dateA = '2099-09-05';
const dateB = '2099-09-12';
const votesFor = date => [
  { user_id: 'a', vote_date: date, game_style: 'strategy' },
  { user_id: 'b', vote_date: date, game_style: 'party' },
];
const allGames = [
  { user_id: 'a', vote_date: dateA, custom_name: '아크노바' },
  { user_id: 'b', vote_date: dateA, custom_name: '아크노바' },
  { user_id: 'a', vote_date: dateB, custom_name: '봉기' },
  { user_id: 'b', vote_date: dateB, custom_name: '봉기' },
];

const summaryA = context.buildSummary(votesFor(dateA), allGames);
const summaryB = context.buildSummary(votesFor(dateB), allGames);
check('첫 날짜는 자신의 공통 게임만 표시', summaryA.includes('아크노바 2명') && !summaryA.includes('봉기 2명'));
check('둘째 날짜는 자신의 공통 게임만 표시', summaryB.includes('봉기 2명') && !summaryB.includes('아크노바 2명'));
check('계산 함수가 참여자와 날짜를 모두 필터링', src.slice(start, end).includes('participantIds.has(String(game.user_id))')
  && src.slice(start, end).includes("voteDates.has(String(game.vote_date || ''))"));

console.log(failures ? `FAIL ${failures}` : 'ALL PASS');
process.exitCode = failures ? 1 : 0;
