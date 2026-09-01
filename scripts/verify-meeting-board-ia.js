// 모임 보드가 평소 프로필을 복제하지 않고 가까운 미래 SSOT를 쓰는지 검증한다. DB 쓰기 없음.
// 사용: node scripts/verify-meeting-board-ia.js [--negctl]
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/kakao-auth.js'), 'utf8');
const daySrc = fs.readFileSync(path.join(__dirname, '..', 'assets/js/day-detail.js'), 'utf8');
const scheduleSrc = fs.readFileSync(path.join(__dirname, '..', 'pages/club/club-schedule.html'), 'utf8');
const homeSrc = fs.readFileSync(path.join(__dirname, '..', 'assets/js/index-page.js'), 'utf8');
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
check('모임 보드는 다가오는 모임과 최근 참여만 표시', ['다가오는 모임', '최근 참여']
  .every(label => build.includes(label))
  && build.includes('meeting-upcoming-section')
  && build.includes('meeting-recent-section') && !build.includes('meeting-plan-section')
  && !build.includes('모임 참여 페이스'));
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
check('미리보기는 저장 직후 재조회하고 모든 일정의 고유 참여 정보를 합친다', daySrc.includes("reason: 'planner-save'")
  && src.includes("window.addEventListener('cottage-meeting-changed', panel._meetingPreviewRefresh)")
  && src.includes('const _renderMeetingPreview = (allVotes, allGames) =>')
  && !src.includes('])).slice(0, 4)')
  && src.includes("meetingMessages.map(escH).join(' · ')") && src.includes("meetingGamesByType(listType).map(_meetingGameName)"));
check('첫 참여 등록도 플래너 초기화 전 요청을 보존', scheduleSrc.includes('let _pendingRegisterOpen = false')
  && scheduleSrc.includes('if (_pendingRegisterOpen)')
  && scheduleSrc.includes('_pendingRegisterOpen = true'));
check('날짜 카드별 수정·삭제 액션과 기존 삭제 API 유지', src.includes('mb-date-edit')
  && src.includes('mb-date-delete') && src.includes('deleteMeetingVote')
  && src.includes('edit: btn.dataset.date'));
check('다가오는 모임은 참여 등록 하나와 날짜 옆 아이콘 액션을 사용', src.includes('＋ 참여 등록')
  && !src.includes('id="meetinglikedAddBtn"') && !src.includes('id="meetingcuriousAddBtn"')
  && src.includes('class="mb-date-card-main"')
  && src.includes('title="참여 수정"') && src.includes('title="참여 삭제"'));
check('모임 보드는 프로필성 참여 페이스를 반복하지 않음', !build.includes("'참여 가능 빈도'")
  && !build.includes("'원하는 참여 빈도'") && !build.includes("'참여 가능한 요일'") && !build.includes("'참여 가능한 시간대'"));
check('참여자 카드가 중복 개인 상세 모달을 열지 않음', src.includes('<article class="mb-date-card')
  && !src.includes('entry.addEventListener(\'click\', openDate)')
  && !src.includes('entry.addEventListener(\'keydown\', openDate)'));
const cardStart = src.indexOf('const _renderMeetingPreview = (allVotes, allGames) =>');
const cardEnd = src.indexOf('// 그룹 요약용 카운트 추출', cardStart);
const card = src.slice(cardStart, cardEnd);
check('메인 모임 카드도 같은 가까운 미래 범위 사용', src.includes('const [_upcomingStart, _upcomingEnd] = _upcomingRange()')
  && src.includes('getMeetingVotes?.(_upcomingStart, _upcomingEnd)')
  && src.includes('getMeetingVoteGames?.(_upcomingStart, _upcomingEnd)')
  && !src.includes('_monthStart'));
check('메인 카드는 예정 날짜와 당일 참여 정보를 압축해 요약', card.includes('meetingDateLabels')
  && card.includes('_dateLimit') && card.includes('${_extraDates}회')
  && card.includes('다가오는 모임') && card.includes('meetingStyles')
  && card.includes('meetingGamesByType') && card.includes('recruitment_message')
  && !card.includes('가까운 일정 준비하기') && !card.includes('다가오는 일정 ${_myVoteDates.length}건')
  && !card.includes('_profileSummaryItems'));
check('날짜 상세 진입 시 최신 게임 목록을 재조회', scheduleSrc.includes('getMeetingVoteGames(ds, ds)')
  && scheduleSrc.includes('getMeetingVotes(ds, ds)'));
check('홈 날짜 상세도 최신 게임 목록을 재조회', homeSrc.includes('getMeetingVoteGames(dateStr, dateStr)')
  && homeSrc.includes('getMeetingVotes(dateStr, dateStr)'));
check('룰렛은 want·learn 후보와 빈 상태 레이아웃을 지원', daySrc.includes("g.list_type !== 'want' && g.list_type !== 'learn'")
  && daySrc.includes('const rouletteBtnHtml') && daySrc.includes('dd-roulette-open-btn')
  && daySrc.includes('dd-roulette-empty') && daySrc.includes('active.length < 2'));
check('플래너와 모임 조율의 최신 용어·정보 계층을 사용', scheduleSrc.includes('모임 조율 ›')
  && homeSrc.includes('모임 조율 ›')
  && daySrc.includes('<h2 class="dd-meeting-section-title">모임 현황</h2>')
  && daySrc.includes('<h2 class="dd-meeting-section-title" id="dd-coordination-title">인원 조율</h2>')
  && daySrc.includes('<h2 class="dd-meeting-section-title" id="dd-participants-title">참여자별 상세</h2>')
  && daySrc.includes('_buildGameCoordinationSummaryHtml(votes, voteGames, false, meetingSummary, false)'));
check('인원 조율은 기존 룰렛만 사용하고 게임 투표 UI를 만들지 않음', daySrc.includes('dd-roulette-open-btn')
  && !daySrc.includes('dd-game-vote') && !daySrc.includes('dd-vote-option'));

console.log(failures ? `\nFAIL ${failures}` : (NEG ? '\nNEGATIVE CONTROL PASS' : '\nALL PASS'));
process.exit(failures ? 1 : 0);
