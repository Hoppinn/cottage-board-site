// 모임 보드가 평소 프로필을 복제하지 않고 가까운 미래 SSOT를 쓰는지 검증한다. DB 쓰기 없음.
// 사용: node scripts/verify-meeting-board-ia.js [--negctl]
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/kakao-auth.js'), 'utf8');
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
check('모임 보드 중심 정보가 먼저 렌더', build.indexOf('다가오는 일정') < build.indexOf('요즘 하고 싶은 게임')
  && build.indexOf('요즘 하고 싶은 게임') < build.indexOf('현재 참여 상태'));
check('평소 정보는 프로필 요약 참조만 사용', build.includes('_profileSummaryItems(_meeting)')
  && build.includes('평소 참고') && build.includes('프로필 보드 보기'));
check('평소 프로필 전체·가입 소개를 모임 보드에 재출력하지 않음', !build.includes('활동 지역')
  && !build.includes('이동 가능 범위') && !build.includes('바라는 점 및 각오')
  && !build.includes('시계탑 선호도'));
check('기존 날짜별 게임 편집 SSOT 유지', src.includes('addMeetingVoteGame')
  && src.includes('removeMeetingVoteGame') && src.includes('setMeetingVoteGameCondition'));
check('타인 readOnly 편집 가드 유지', build.includes("${_ro('<button class=\"taste-add-btn")
  && src.includes("const condTag = readOnly"));

console.log(failures ? `\nFAIL ${failures}` : (NEG ? '\nNEGATIVE CONTROL PASS' : '\nALL PASS'));
process.exit(failures ? 1 : 0);
