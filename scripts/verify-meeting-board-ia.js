// 모임 보드가 평소 프로필을 복제하지 않고 가까운 미래 SSOT를 쓰는지 검증한다. DB 쓰기 없음.
// 사용: node scripts/verify-meeting-board-ia.js [--negctl]
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/kakao-auth.js'), 'utf8');
const daySrc = fs.readFileSync(path.join(__dirname, '..', 'assets/js/day-detail.js'), 'utf8');
let failures = 0;
function check(label, condition, detail = '') {
  const ok = NEG && label === '가까운 미래 범위만 사용' ? !condition : condition;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

new Function(src);
const buildStart = src.indexOf('function _buildMeetingInnerHtml(d)');
const buildEnd = src.indexOf('\n  body.innerHTML = `', buildStart);
const build = src.slice(buildStart, buildEnd);
const loadStart = src.indexOf('const _loadMeetingWeek = async () =>');
const loadEnd = src.indexOf('// 다른 화면(게임시트', loadStart);
const load = src.slice(loadStart, loadEnd);

console.log('=== 모임 보드 IA ===');
check('가까운 미래 범위만 사용', !src.includes('function _thisWeekRange()')
  && !load.includes('_thisWeekRange') && load.includes('const [uStart, uEnd] = _upcomingRange()'));
check('일정과 게임을 같은 범위에서 각 1회 조회', (load.match(/getMeetingVotes/g) || []).length === 1
  && (load.match(/getMeetingVoteGames/g) || []).length === 1);
check('다음 주 게임도 가까운 미래 목록에 포함', load.includes('_weekData.myVoteGames = upcomingAllVG.filter')
  && load.includes('_weekData.myVotes = _weekData.upcomingVotes'));
check('날짜 선택은 실제 가까운 참여 일정에서 생성', src.includes('new Set(_weekData.myVotes.map(v => v.vote_date))')
  && !src.includes('const _mbWeek ='));
check('모임 보드는 세 가지 주요 섹션으로 단순화', ['다가오는 모임', '참여 페이스', '최근 참여']
  .every(label => build.includes(label))
  && build.includes('meeting-upcoming-section')
  && build.includes('meeting-plan-section')
  && build.includes('meeting-recent-section'));
check('날짜별 카드가 당일 정보와 게임을 함께 렌더', src.includes('_buildMeetingDateCardsHtml')
  && src.includes('data-date="${escH(vote.vote_date)}"')
  && src.includes('vote.game_style') && src.includes('vote.game_depth')
  && src.includes('vote.recruitment_message')
  && src.includes("renderGames('want'") && src.includes("renderGames('learn'"));
check('평소 참고 요약과 기존 분리 목록 제거', !build.includes('_profileSummaryItems(_meeting)')
  && !build.includes('평소 참고') && !build.includes('요즘 하고 싶은 게임')
  && !build.includes('요즘 배우고 싶은 게임') && !build.includes('현재 참여 상태'));
check('평소 프로필 전체·가입 소개를 모임 보드에 재출력하지 않음', !build.includes('활동 지역')
  && !build.includes('이동 가능 범위') && !build.includes('바라는 점 및 각오')
  && !build.includes('시계탑 선호도'));
check('기존 날짜별 게임 편집 SSOT 유지', src.includes('addMeetingVoteGame')
  && src.includes('removeMeetingVoteGame') && src.includes('setMeetingVoteGameCondition'));
check('플래너 진입 날짜 컨텍스트를 전달하고 날짜 카드를 강조', src.includes('focusDate')
  && src.includes('.mb-date-card[data-date=') && src.includes('is-focused'));
check('타인 readOnly 편집 가드 유지', src.includes("${_ro('<button class=\"taste-add-btn")
  && src.includes("const cond = readOnly") && src.includes("const action = _ro("));
check('모임 등록은 등록 시트로 열고 게임 추가 버튼은 노출하지 않음', src.includes('register: true')
  && daySrc.includes('cottage-register-open') && src.includes('＋ 참여 등록')
  && !src.includes('id="meetinglikedAddBtn"') && !src.includes('id="meetingcuriousAddBtn"'));
check('날짜 카드별 수정·삭제 액션과 기존 삭제 API 유지', src.includes('mb-date-edit')
  && src.includes('mb-date-delete') && src.includes('deleteMeetingVote')
  && src.includes('edit: btn.dataset.date'));
const cardStart = src.indexOf('const _myUpcomingVotes = (_upcomingCardVotes || [])');
const cardEnd = src.indexOf('// 그룹 요약용 카운트 추출', cardStart);
const card = src.slice(cardStart, cardEnd);
check('메인 모임 카드도 같은 가까운 미래 범위 사용', src.includes('const [_upcomingStart, _upcomingEnd] = _upcomingRange()')
  && src.includes('getMeetingVotes?.(_upcomingStart, _upcomingEnd)')
  && src.includes('getMeetingVoteGames?.(_upcomingStart, _upcomingEnd)')
  && !src.includes('_monthStart'));
check('메인 카드는 예정 날짜와 당일 참여 정보를 압축해 요약', card.includes('_meetingDateLabels')
  && card.includes('_dateLimit') && card.includes('${_extraDates}회')
  && card.includes('다가오는 모임') && card.includes('_meetingStyles')
  && card.includes('_meetingGamesByType') && card.includes('recruitment_message')
  && !card.includes('가까운 일정 준비하기') && !card.includes('다가오는 일정 ${_myVoteDates.length}건')
  && !card.includes('_profileSummaryItems'));

console.log(failures ? `\nFAIL ${failures}` : (NEG ? '\nNEGATIVE CONTROL PASS' : '\nALL PASS'));
process.exit(failures ? 1 : 0);
