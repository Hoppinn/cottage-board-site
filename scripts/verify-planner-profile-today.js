// 개인 날짜 상세의 평소/오늘 분리와 기존 편집 기능 보존 검증. DB 쓰기 없음.
// 사용: node scripts/verify-planner-profile-today.js [--negctl]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NEG = process.argv.includes('--negctl');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/day-detail.js'), 'utf8');
let failures = 0;
function check(label, condition, detail = '') {
  const ok = NEG && label === '평소 다음 오늘 순서' ? !condition : condition;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

new Function(src);
const resolveStart = src.indexOf('function resolveGameName(g)');
const resolveEnd = src.indexOf('\n  function timeOverlap', resolveStart);
const helperStart = src.indexOf('const PROFILE_TYPE_LABELS');
const helperEnd = src.indexOf('\n  /** 내 일정 모달 통계', helperStart);
const escapeHtml = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const context = {
  esc:escapeHtml,
  window:{
    escH:escapeHtml,
    COTTAGE_GAMES:[{bggId:'1', display:'아크 노바'}],
  },
};
vm.createContext(context);
vm.runInContext(`${src.slice(resolveStart, resolveEnd)}\n${src.slice(helperStart, helperEnd)}\nthis.usual=_buildUsualContextHtml;this.today=_buildTodayContextHtml;`, context);

const usualHtml = context.usual({
  preferredGameTypes:['strategy','party'], preferredGameDepths:['light','deep'],
  hardestGames:[{game_id:'1', sort_order:1}],
});
const todayHtml = context.today({
  game_style:'party', game_depth:'light',
  play_traits:['new_game_ok','hard_game_learning_ok'], recruitment_message:'라스베가스 같이 해요',
}, '<div data-games>게임 목록</div>', '<p class="dd-star-notice"></p>');

console.log('=== 플래너 평소/오늘 IA ===');
check('평소 프로필 요약 렌더', usualHtml.includes('평소') && usualHtml.includes('전략·유로 · 파티·친목')
  && usualHtml.includes('깊이 가볍게 · 깊게') && usualHtml.includes('경험 아크 노바'));
check('오늘 날짜별 상태 렌더', todayHtml.includes('오늘') && todayHtml.includes('파티')
  && todayHtml.includes('가볍게') && todayHtml.includes('새 게임 가능')
  && todayHtml.includes('어려운 게임 학습 가능') && todayHtml.includes('라스베가스 같이 해요'));
check('오늘 게임과 기존 편집 알림 자리 유지', todayHtml.includes('data-games') && todayHtml.includes('dd-star-notice'));

const modalStart = src.indexOf('window.openDateScheduleModal = async function');
const modalEnd = src.indexOf('\n  /**\n   * 막대 클릭 시 센터 모달 열기', modalStart);
const modal = src.slice(modalStart, modalEnd);
const usualAt = modal.indexOf('_buildUsualContextHtml(usualProfile)');
const todayAt = modal.indexOf('_buildTodayContextHtml(myVote');
const statsAt = modal.indexOf('${statsHtml}');
check('평소 다음 오늘 순서', usualAt >= 0 && todayAt > usualAt && statsAt > todayAt);
check('프로필은 배치 API로 읽고 실패 시 날짜 상세 유지', modal.includes('getProfileBoardData?.(String(userId))')
  && modal.includes('.catch(() => null)'));
check('오늘 SSOT는 해당 날짜 vote/vote_games', modal.includes('getMeetingVotes(voteDate, voteDate)')
  && modal.includes('getMeetingVoteGames(voteDate, voteDate)'));
check('대표 게임·인원 조건 편집 보존', modal.includes('_bindSchedEditors')
  && src.includes('setMeetingVoteGamePriority') && src.includes('setMeetingVoteGameCondition'));
check('타인은 게임 편집 컨트롤을 받지 않음', modal.includes("_buildSchedGameSection(wantGameObjs, '🎲', '하고 싶은 게임', isMine)")
  && modal.includes('if (isMine) _bindSchedEditors'));
check('공용 참여자 카드도 학습 의지 표시', src.includes("hard_game_learning_ok:'어려운 게임 학습 가능'"));

console.log(failures ? `\nFAIL ${failures}` : (NEG ? '\nNEGATIVE CONTROL PASS' : '\nALL PASS'));
process.exit(failures ? 1 : 0);
