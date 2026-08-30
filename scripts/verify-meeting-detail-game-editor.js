// 이날 모임 상세의 본인 게임 조율 이전 계약 검증. DB/브라우저 쓰기 없음.
// 사용: node scripts/verify-meeting-detail-game-editor.js [--negctl]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NEG = process.argv.includes('--negctl');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/day-detail.js'), 'utf8');
let failures = 0;
function check(label, condition) {
  const ok = NEG && label === '본인에게만 편집 영역 생성' ? !condition : condition;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

new Function(src);
const helperStart = src.indexOf('function _buildMyMeetingGameEditorHtml');
const helperEnd = src.indexOf('\n  /**', helperStart);
const context = {
  _todayStr: () => '2099-01-01',
  _buildSchedGameSection: (games, icon, label, isMine) =>
    games.length ? `<section data-label="${label}" data-editable="${isMine}">${games.length}</section>` : '',
};
vm.createContext(context);
vm.runInContext(`${src.slice(helperStart, helperEnd)}\nthis.buildEditor=_buildMyMeetingGameEditorHtml;`, context);

const myVote = {user_id:'me'};
const myGames = [
  {list_type:'want'}, {list_type:'want'}, {list_type:'learn'},
];
const editor = context.buildEditor(myVote, myGames, '2099-08-31');

console.log('=== 이날 모임 상세 게임 조율 ===');
check('본인에게만 편집 영역 생성', editor.includes('내 게임 조율')
  && context.buildEditor(null, myGames, '2099-08-31') === ''
  && context.buildEditor(myVote, [], '2099-08-31').includes('선택한 게임이 없어요'));
check('접힌 상태로 시작', editor.startsWith('<details') && !editor.slice(0, editor.indexOf('>')).includes(' open'));
check('하고 싶은/배우고 싶은 게임 모두 편집형 재사용', editor.includes('data-label="하고 싶은 게임" data-editable="true">2')
  && editor.includes('data-label="배우고 싶은 게임" data-editable="true">1'));
check('대표 게임·희망 인원 안내와 플래너 전체 편집 유지', editor.includes('대표 게임(최대 2개)')
  && editor.includes('희망 플레이 인원') && editor.includes('내 참여 수정하기'));

const modalStart = src.indexOf('window.openDateMeetingModal = function');
const modalEnd = src.indexOf('\n  /**\n   * 주간 카드', modalStart);
const modal = src.slice(modalStart, modalEnd);
const editorAt = modal.indexOf('${myGameEditorHtml}');
const participantsAt = modal.indexOf('${participantsBody');
check('전원 목록 앞에 편집 영역 1회 배치', editorAt >= 0 && participantsAt > editorAt
  && modal.indexOf('${myGameEditorHtml}', editorAt + 1) < 0);
check('편집 대상은 로그인 본인의 날짜별 게임만', modal.includes("String(g.user_id) === String(myVote.user_id)")
  && modal.includes('if (myVote && myGames.length)') && modal.includes('_bindSchedEditors(el'));
check('기존 저장 함수와 성공 갱신 신호 재사용', src.includes('setMeetingVoteGamePriority')
  && src.includes('setMeetingVoteGameCondition') && modal.includes("reason: 'game-coordination'"));
check('전원 참여자 목록은 계속 읽기전용', src.includes("_buildParticipantsHtml(uniqueVotes, voteGames)")
  && !src.slice(src.indexOf('function _buildParticipantsHtml'), helperStart).includes('_bindSchedEditors'));
check('기존 플래너 전체 편집·재조회 유지', modal.includes('class="dd-planner-btn"')
  && modal.includes('getMeetingVotes(voteDate, voteDate)')
  && modal.includes('getMeetingVoteGames(voteDate, voteDate)'));

console.log(failures ? `\nFAIL ${failures}` : (NEG ? '\nNEGATIVE CONTROL PASS' : '\nALL PASS'));
process.exit(failures ? 1 : 0);
