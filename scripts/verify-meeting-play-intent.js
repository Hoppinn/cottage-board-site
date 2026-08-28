// 모임 플래너 Phase 1 「오늘 원하는 판」 계약 검증 (운영 DB 쓰기 없음)
//
//   node scripts/verify-meeting-play-intent.js --negctl
//   node scripts/verify-meeting-play-intent.js
//
// --negctl은 필수 UI 계약 하나의 기대값만 일부러 틀려 검사기가 실패를 잡는지 확인한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NEG = process.argv.includes('--negctl');
const LIVE = process.argv.includes('--live');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sql = read('docs/migrations/024_meeting_vote_play_intent.sql');
const clientSrc = read('assets/js/supabase-client.js');
const detailSrc = read('assets/js/day-detail.js');
const indexSrc = read('assets/js/index-page.js');
const plannerHtml = read('pages/club/club-schedule.html');

let failures = 0;
function check(label, condition, detail = '') {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
}

console.log('=== 1. migration 계약 ===');
check('game_style 안정 코드', sql.includes("game_style IN ('party', 'strategy', 'any')"));
check('game_depth 안정 코드', sql.includes("game_depth IN ('light', 'medium', 'deep', 'any')"));
check('play_traits 허용 코드만 저장', sql.includes("ARRAY['beginner_welcome', 'new_game_ok']::TEXT[]"));
check('한줄 모집 DB 30자 제한', sql.includes('char_length(recruitment_message) <= 30'));
check('레거시 play_traits 빈 배열 보정', sql.includes('WHERE play_traits IS NULL'));

console.log('\n=== 2. 소스 문법과 API 하위 호환 ===');
new vm.Script(clientSrc, { filename: 'assets/js/supabase-client.js' });
new vm.Script(detailSrc, { filename: 'assets/js/day-detail.js' });
new vm.Script(indexSrc, { filename: 'assets/js/index-page.js' });
const inlineScripts = [...plannerHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(source => source.trim());
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `club-schedule:inline-${index + 1}.js` }));
check('플래너 inline script 파싱', inlineScripts.length > 0, `${inlineScripts.length}개`);
check('조회 API가 신규 4필드 반환', ['game_style', 'game_depth', 'play_traits', 'recruitment_message']
  .every(field => clientSrc.includes(field)));
check('기존 호출은 intent 필드 미전송', clientSrc.includes("if (playIntent && typeof playIntent === 'object')"));

console.log('\n=== 3. Step 4 UI·저장 계약 ===');
check('게임 성격·깊이 필수 검증', plannerHtml.includes('!_intentMap[ds]?.gameStyle || !_intentMap[ds]?.gameDepth'));
check('특정 게임은 기존 want 저장 재사용', plannerHtml.includes("addMeetingVoteGame(String(user.id), ds, 'want'"));
check('한줄 모집 maxlength=30', plannerHtml.includes(NEG ? 'maxlength="31"' : 'maxlength="30"'));
check('API 저장에 intent 전달', plannerHtml.includes('clampGuest(_guestMap[ds]), intent'));
check('단일 시간 수정은 기존 intent 로컬 보존', plannerHtml.includes('allVotes.push({ ...previousVote'));
check('자동 매칭 구현 없음', !/matchScore|candidateScore|autoMatch|matchingCandidates/.test(plannerHtml + clientSrc));

console.log('\n=== 4. 참여자 카드 표시 계약 ===');
check('본 플래너도 공용 3인자 렌더러 사용', plannerHtml.includes('buildBarsInCard(dayVotes, allVoteGames, myVote)'));
check('한 참여자당 완결 카드', detailSrc.includes('class="sched-bar-item"') && detailSrc.includes('class="sched-bar-time-text"'));
check('성격·깊이·성향·모집 문구 소비', ['v.game_style', 'v.game_depth', 'v.play_traits', 'v.recruitment_message']
  .every(token => detailSrc.includes(token)));
check('want/learn 게임이 참여자 카드에 귀속', detailSrc.includes("groupHtml('want', '하고 싶음')")
  && detailSrc.includes("groupHtml('learn', '배우고 싶음')"));
check('시간 막대 안에 텍스트 없음', !detailSrc.includes('class="sched-bar-time"'));
check('공용 카드에 개인 상세 진입 데이터·키보드 역할', detailSrc.includes('class="sched-bar-item" data-date=')
  && detailSrc.includes('role="button" tabindex="0"'));
check('세 화면 모두 카드 전체를 상세 진입점으로 사용', [plannerHtml, indexSrc, detailSrc]
  .every(source => source.includes("querySelectorAll('.sched-bar-item[data-date][data-uid]')")));
check('시간 막대 전용 클릭 바인딩 제거', !plannerHtml.includes("querySelectorAll('.sched-bar-track[data-date]')")
  && !indexSrc.includes("querySelectorAll('.sched-bar-track')"));
check('내부 수정·삭제·게임 액션 전파 차단', [plannerHtml, indexSrc, detailSrc]
  .every(source => source.includes("querySelectorAll('.sched-bar-edit-btn')")
    && source.includes("querySelectorAll('.sched-bar-del-btn')"))
  && detailSrc.includes("hit.addEventListener('click', e => {")
  && detailSrc.includes('e.stopPropagation();'));
check('게임 유형 표시 문구', plannerHtml.includes('게임 유형 <span class="sm-intent-required">필수</span>')
  && plannerHtml.includes("any:'게임 유형 무관'") && detailSrc.includes("any:'게임 유형 무관'"));

check('home selected-day preview has no duplicate date header', !indexSrc.includes('class="mpc-date"'));
check('home day tabs reuse party-size helper', indexSrc.includes('const cnt = partyCount(byDate[ds]);'));
check('day-only preview keeps date header with party-size helper', detailSrc.includes('const count = partyCount(dayVotes || []);')
  && detailSrc.includes('class="dd-preview-head"'));

async function runLiveContract() {
  console.log('\n=== 5. 운영 DB/API 왕복 (격리 테스트 행) ===');
  const store = new Map();
  global.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    key: index => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
  const noopEl = () => ({
    style: {}, classList: {add() {}, remove() {}, contains: () => false},
    appendChild() {}, setAttribute() {}, addEventListener() {}, remove() {},
  });
  global.document = {
    readyState: 'complete', referrer: '',
    addEventListener() {}, removeEventListener() {}, createElement: noopEl,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: noopEl(), documentElement: noopEl(), head: noopEl(),
  };
  global.navigator = {userAgent: 'node-verify', sendBeacon: () => false};
  global.window = global;
  global.location = window.location = {hostname:'localhost', href:'http://localhost/', pathname:'/', search:'', origin:'http://localhost'};
  global.addEventListener = () => {};
  global.removeEventListener = () => {};
  global.supabase = require('../node_modules/@supabase/supabase-js');
  eval(read('assets/js/supabase-config.js'));
  eval(clientSrc);

  const directDb = global.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  const testDate = '2099-08-29';
  const testUid = '__test_play_intent_024__';
  await directDb.from('meeting_votes').delete().eq('vote_date', testDate).eq('user_id', testUid);
  try {
    const saved = await window.CottageDB.upsertMeetingVote(
      testUid, '024검증', testDate, 10, 22, 2,
      {gameStyle:'strategy', gameDepth:'medium', playTraits:['beginner_welcome','new_game_ok'], recruitmentMessage:'전략게임 같이 해요'}
    );
    check('신규 4필드 저장 성공', saved?.success === true, saved?.error?.message || '');
    let rows = await window.CottageDB.getMeetingVotes(testDate, testDate);
    let row = rows.find(item => item.user_id === testUid);
    check('신규 4필드 되읽기', row?.game_style === 'strategy' && row?.game_depth === 'medium'
      && row?.play_traits?.length === 2 && row?.recruitment_message === '전략게임 같이 해요', JSON.stringify(row));

    const oldCall = await window.CottageDB.upsertMeetingVote(testUid, '024검증', testDate, 11, 23, 1);
    rows = await window.CottageDB.getMeetingVotes(testDate, testDate);
    row = rows.find(item => item.user_id === testUid);
    check('기존 호출이 intent를 덮지 않음', oldCall?.success === true && row?.game_style === 'strategy'
      && row?.game_depth === 'medium' && row?.play_traits?.length === 2 && row?.recruitment_message === '전략게임 같이 해요');

    const invalidStyle = await directDb.from('meeting_votes').update({game_style:'invalid'}).eq('vote_date', testDate).eq('user_id', testUid);
    const invalidDepth = await directDb.from('meeting_votes').update({game_depth:'invalid'}).eq('vote_date', testDate).eq('user_id', testUid);
    const invalidTraits = await directDb.from('meeting_votes').update({play_traits:['not_allowed']}).eq('vote_date', testDate).eq('user_id', testUid);
    const invalidMessage = await directDb.from('meeting_votes').update({recruitment_message:'가'.repeat(31)}).eq('vote_date', testDate).eq('user_id', testUid);
    check('DB CHECK가 잘못된 성격 거부', !!invalidStyle.error);
    check('DB CHECK가 잘못된 깊이 거부', !!invalidDepth.error);
    check('DB CHECK가 잘못된 성향 거부', !!invalidTraits.error);
    check('DB CHECK가 31자 모집 문구 거부', !!invalidMessage.error);
  } finally {
    const cleanup = await directDb.from('meeting_votes').delete().eq('vote_date', testDate).eq('user_id', testUid);
    const confirm = await directDb.from('meeting_votes').select('user_id').eq('vote_date', testDate).eq('user_id', testUid);
    check('격리 테스트 행 삭제·재확인', !cleanup.error && !confirm.error && confirm.data.length === 0);
  }
}

(async () => {
  if (LIVE) await runLiveContract();
  console.log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
