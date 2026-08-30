// 내보드 IA 028·029/API 계약 검증 (기본 DB 무접속, --live만 격리 행 쓰기 후 삭제)
//   node scripts/verify-profile-board-ia.js --negctl
//   node scripts/verify-profile-board-ia.js
//   node scripts/verify-profile-board-ia.js --live  # 격리 행 왕복 후 삭제
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NEG = process.argv.includes('--negctl');
const LIVE = process.argv.includes('--live');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sql = read('docs/migrations/028_profile_board_ia.sql');
const weightSql = read('docs/migrations/029_profile_weight_codes.sql');
const clientSrc = read('assets/js/supabase-client.js');
const boardSrc = read('assets/js/kakao-auth.js');
const styleSrc = read('assets/css/style.css');
const introHtml = read('pages/club/club-intro.html');
const pageLabels = read('assets/js/page-labels.js');
let failures = 0;
function check(label, condition, detail = '') {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
}

console.log('=== 1. 028·029 migration 계약 ===');
check('평소 깊이는 TEXT[] 복수값', sql.includes('preferred_game_depths TEXT[]'));
check('평소 깊이 허용값에 any 없음', weightSql.includes("'weight_intro'")
  && weightSql.includes("'weight_light'") && weightSql.includes("'weight_heavy'")
  && weightSql.includes("'weight_hardcore'") && !/preferred_game_depths[^;]*'any'/s.test(weightSql));
check('평소 깊이 중복값 DB 차단', ['light', 'medium', 'deep']
  .every(code => weightSql.includes(`cardinality(array_positions(preferred_game_depths, '${code}')) <= 1`))
  && ['weight_intro', 'weight_light', 'weight_heavy', 'weight_hardcore']
    .every(code => weightSql.includes(`cardinality(array_positions(preferred_game_depths, '${code}')) <= 1`)));
check('어려웠던 게임은 순서 1~2와 사용자별 순서 UNIQUE', sql.includes('sort_order BETWEEN 1 AND 2')
  && sql.includes('UNIQUE (user_id, sort_order)'));
check('카탈로그/직접입력 중 정확히 하나', sql.includes('num_nonnulls(') && sql.includes('= 1'));
check('신규 테이블 RLS 상태 명시', sql.includes('profile_hardest_games DISABLE ROW LEVEL SECURITY'));
check('최대 2개 원자 교체 RPC', sql.includes('replace_profile_hardest_games')
  && sql.includes('jsonb_array_length') && sql.includes('> 2'));
check('날짜별 어려운 게임 학습 의지 허용', sql.includes("'hard_game_learning_ok'"));

console.log('\n=== 2. CottageDB API 실행 계약 ===');
console.log('\n=== Profile board UI/entry contract ===');
new vm.Script(boardSrc, {filename:'assets/js/kakao-auth.js'});
new vm.Script(pageLabels, {filename:'assets/js/page-labels.js'});
const cardStart = boardSrc.indexOf('<div class="profile-card-grid">');
const cardOrder = ['taste', 'meeting', 'records', 'usage']
  .map(key => boardSrc.indexOf(`data-subsheet="${key}"`, cardStart));
check('main card order: profile > meeting > records > together', cardOrder.every(index => index >= 0)
  && cardOrder.every((index, i) => i === 0 || cardOrder[i - 1] < index));
check('profile label with legacy taste analytics key', boardSrc.includes('<span class="profile-card-label">프로필 보드</span>')
  && boardSrc.includes("_openSubSheet('프로필 보드'") && boardSrc.includes("_trackPvOnce('my-board-taste')"));
const tasteStart = boardSrc.indexOf('function _buildTasteInnerHtml(d) {');
const tasteEnd = boardSrc.indexOf('  // 기록 보드', tasteStart);
const tasteBuilder = tasteStart >= 0 && tasteEnd > tasteStart
  ? [boardSrc.slice(tasteStart, tasteEnd)] : null;
check('profile information flow has four sections', ['함께 게임할 때', '평소 플레이', '선호 웨이트', '게임 취향']
  .every(label => tasteBuilder?.[0].includes(label)));
check('legacy split sections are removed', !!tasteBuilder
  && !tasteBuilder[0].includes('이런 플레이어예요')
  && !tasteBuilder[0].includes('플레이 환경')
  && !tasteBuilder[0].includes('게임 경험'));
check('profile board hides legacy bio and summary duplication', !!tasteBuilder
  && !tasteBuilder[0].includes('한줄 소개')
  && !tasteBuilder[0].includes('taste-bio-')
  && !tasteBuilder[0].includes('profile-summary')
  && !tasteBuilder[0].includes('_profileSummaryItems')
  && !tasteBuilder[0].includes('_bioTagsOf'));
check('expectation is conditional and owner-only empty CTA', !!tasteBuilder
  && tasteBuilder[0].includes('d.expectation')
  && tasteBuilder[0].includes("readOnly ? ''")
  && tasteBuilder[0].includes('아직 작성하지 않았어요'));
check('structured player fields appear once in their sections', !!tasteBuilder
  && (tasteBuilder[0].match(/선호 유형/g) || []).length === 1
  && (tasteBuilder[0].match(/선호 웨이트/g) || []).length === 1
  && (tasteBuilder[0].match(/평균 플레이 빈도/g) || []).length === 1
  && (tasteBuilder[0].match(/주로 함께하는 사람/g) || []).length === 1
  && (tasteBuilder[0].match(/가능한 요일·시간/g) || []).length === 1
  && (tasteBuilder[0].match(/활동 지역/g) || []).length === 1
  && !tasteBuilder[0].includes('이동 가능 범위'));
check('location remains and travel range is hidden', !!tasteBuilder
  && tasteBuilder[0].includes('활동 지역')
  && !tasteBuilder[0].includes('이동 가능 범위')
  && !tasteBuilder[0].includes('travelRange'));
const tasteSection = tasteBuilder?.[0].match(/<section class="profile-info-section profile-taste-section">[\s\S]*?<\/section>/)?.[0] || '';
check('avoid types and preferred types stay in game taste', !!tasteBuilder
  && tasteSection.includes('선호 유형')
  && tasteSection.includes('taste-avoid-section'));
check('rule explain remains an item action, not experience section', !!tasteBuilder
  && !tasteBuilder[0].includes('profile-rule-summary')
  && boardSrc.includes('mb-rule-btn'));
check('expectation uses normal body typography', styleSrc.includes('.profile-expectation-text{')
  && styleSrc.includes('font-size:13px') && styleSrc.includes('line-height:1.7'));
check('weight options and hardest-games editors are wired', boardSrc.includes('Object.entries(_PROFILE_WEIGHT_OPTIONS)')
  && ['weight_intro', 'weight_light', 'weight_heavy', 'weight_hardcore'].every(code => boardSrc.includes(code))
  && boardSrc.includes('replaceProfileHardestGames') && boardSrc.includes('hardestGames.length >= 2'));
check('single profile edit entry uses owner-only wrapper', boardSrc.includes("${_ro('<a class=\"profile-board-edit-link\"")
  && !boardSrc.includes('평소 생활 수정 →')
  && boardSrc.includes("${_ro(`<button class=\"profile-hardest-add\""));
check('legacy depth labels remain separate from new ranges', boardSrc.includes('_PROFILE_LEGACY_DEPTH_LABELS')
  && boardSrc.includes("light:'가볍게'") && boardSrc.includes("medium:'적당히'") && boardSrc.includes("deep:'깊게'")
  && boardSrc.includes('기존 선택:'));
check('intro has no travel range UI residue', !introHtml.includes('이동 가능 범위') && !introHtml.includes('travel_range'));
check('failed game save cannot paint a false added state', (boardSrc.match(/if \(saved === false\) return;/g) || []).length === 2);
check('member intro card opens Profile Board', introHtml.includes('프로필 보드 보기 ›')
  && introHtml.includes('window.openOtherProfileSheet?.(uid)') && !introHtml.includes('window.openOtherMeetingSheet?.(uid)'));
check('member intro identity/profile areas have separate destinations', introHtml.includes('intro-card-news-avatar')
  && introHtml.includes('intro-card-news-name')
  && introHtml.includes("window.openProfilePanel?.('taste'")
  && introHtml.includes('e.stopPropagation()'));
check('subboards share compact identity back header, including collection board', boardSrc.includes("'수집 보드'].includes(title)")
  && boardSrc.includes('profile-subsheet-back-identity')
  && boardSrc.includes('profile-subsheet-back-avatar')
  && boardSrc.includes('profile-subsheet-back-name')
  && boardSrc.includes('_repIdentityHtml')
  && !boardSrc.includes('profile-subsheet-identity-avatar'));
check('main board starts with large identity and scroll compact header', boardSrc.includes('const _panelHeaderHtml = backTo ?')
  && boardSrc.includes('profile-panel-compact-header')
  && boardSrc.includes('profile-panel-main-close')
  && boardSrc.includes('new IntersectionObserver')
  && boardSrc.includes('mainClose?.classList.toggle')
  && boardSrc.includes('profile-panel-compact-title">내 보드</span>'));
check('collection board is not added to main IA', !/<button class="profile-card"[^>]*data-subsheet="growth"/.test(boardSrc));
check('main header micro spacing keeps alert left of close action', styleSrc.includes('.profile-panel--main .profile-panel-profile{padding-top:24px;}')
  && styleSrc.includes('.profile-panel--main .profile-panel-nick-row{justify-content:flex-start;gap:12px;padding-right:44px;min-width:0;}')
  && styleSrc.includes('.profile-panel-main-close{position:absolute;top:8px;right:14px;'));
check('main identity and collection progress card gain separation without changing board grid gap', styleSrc.includes('.profile-panel--main .profile-growth-link{margin-top:12px;}')
  && !styleSrc.includes('.profile-panel--main .profile-card-grid{margin-top:12px;}')
  && styleSrc.includes('.profile-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}'));
check('subboard character keeps glow room at 32px', styleSrc.includes('.profile-subsheet-back{justify-self:start;min-width:0;max-width:100%;overflow:visible;')
  && styleSrc.includes('.profile-subsheet-back-avatar{display:flex;align-items:center;justify-content:center;width:32px;height:32px;')
  && styleSrc.includes('.profile-subsheet-back-avatar .profile-panel-avatar{width:32px;height:32px;}'));
check('stable analytics key displays Profile Board label', pageLabels.includes("'my-board-taste': '내 보드 > 프로필 보드'"));

new vm.Script(clientSrc, {filename:'assets/js/supabase-client.js'});

const writes = [];
const rpcCalls = [];
function resultFor(query, single = false) {
  if (query.action === 'update' || query.action === 'upsert' || query.action === 'insert' || query.action === 'delete') {
    writes.push({table:query.table, action:query.action, payload:query.payload});
    return {data:[], error:null};
  }
  if (query.table === 'profiles' && query.columns === 'preferred_game_depths') {
    return {data:{preferred_game_depths:['light', 'deep']}, error:null};
  }
  if (query.table === 'profiles' && query.columns?.includes('bio')) {
    return {data:{bio:'한줄 소개', avoid_tags:['협상']}, error:null};
  }
  if (query.table === 'member_intros') {
    return {data:{nickname:'테스터', preferred_game_types:['strategy']}, error:null};
  }
  if (query.table === 'profile_hardest_games') {
    return {data:[{id:1, game_id:'ark-nova', custom_name:null, sort_order:1}], error:null};
  }
  return {data:single ? null : [], error:null};
}
function makeQuery(table) {
  const query = {
    table, action:'select', columns:'*', payload:null,
    select(columns) { this.columns = columns; return this; },
    update(payload) { this.action = 'update'; this.payload = payload; return this; },
    upsert(payload) { this.action = 'upsert'; this.payload = payload; return this; },
    insert(payload) { this.action = 'insert'; this.payload = payload; return this; },
    delete() { this.action = 'delete'; return this; },
    eq() { return this; }, neq() { return this; }, in() { return this; },
    not() { return this; }, is() { return this; }, gte() { return this; }, lte() { return this; },
    order() { return this; }, limit() { return this; },
    maybeSingle() { return Promise.resolve(resultFor(this, true)); },
    then(resolve, reject) { return Promise.resolve(resultFor(this)).then(resolve, reject); },
  };
  return query;
}
const fakeDb = {
  from: table => makeQuery(table),
  rpc: async (name, args) => {
    rpcCalls.push({name, args});
    return {data:(args.p_games || []).map((game, index) => ({...game, sort_order:index + 1})), error:null};
  },
};
const store = new Map();
global.localStorage = {
  getItem:key => store.get(key) ?? null, setItem:(key,value) => store.set(key,String(value)),
  removeItem:key => store.delete(key), key:index => [...store.keys()][index] ?? null,
  get length() { return store.size; },
};
global.window = global;
global.document = {readyState:'complete', referrer:'', addEventListener(){}, removeEventListener(){}, querySelectorAll:()=>[]};
global.navigator = {userAgent:'node-verify', sendBeacon:()=>false};
global.location = window.location = {hostname:'localhost', href:'http://localhost/', pathname:'/', search:'', origin:'http://localhost'};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.supabase = {createClient:() => fakeDb};
window.SUPABASE_CONFIG = {url:'https://verify.invalid', anonKey:'verify'};
vm.runInThisContext(clientSrc, {filename:'assets/js/supabase-client.js'});

async function runLiveContract() {
  console.log('\n=== 3. 운영 DB/API 왕복 (격리 테스트 행) ===');
  const liveStore = new Map();
  const live = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams,
    navigator:{userAgent:'node-verify', sendBeacon:()=>false},
    location:{hostname:'localhost', href:'http://localhost/', pathname:'/', search:'', origin:'http://localhost'},
    document:{readyState:'complete', referrer:'', addEventListener(){}, removeEventListener(){}, querySelectorAll:()=>[]},
    localStorage:{
      getItem:key => liveStore.get(key) ?? null, setItem:(key,value) => liveStore.set(key,String(value)),
      removeItem:key => liveStore.delete(key), key:index => [...liveStore.keys()][index] ?? null,
      get length() { return liveStore.size; },
    },
    addEventListener(){}, removeEventListener(){},
    supabase:require('../node_modules/@supabase/supabase-js'),
  };
  live.window = live;
  live.globalThis = live;
  const context = vm.createContext(live);
  vm.runInContext(read('assets/js/supabase-config.js'), context, {filename:'assets/js/supabase-config.js'});
  vm.runInContext(clientSrc, context, {filename:'assets/js/supabase-client.js'});
  const db = context._cottageSupabaseDb;
  const api = context.CottageDB;
  const testUid = '__test_profile_ia_028__';
  const testDate = '2099-08-31';

  await db.from('profile_hardest_games').delete().eq('user_id', testUid);
  await db.from('meeting_votes').delete().eq('vote_date', testDate).eq('user_id', testUid);
  await db.from('profiles').delete().eq('user_id', testUid);
  try {
    const seeded = await db.from('profiles').insert({user_id:testUid, nickname:'028검증'}).select('user_id').maybeSingle();
    check('격리 프로필 생성', !seeded.error && seeded.data?.user_id === testUid, seeded.error?.message || '');

    const depthSaved = await api.updatePreferredGameDepths(testUid, ['weight_light', 'weight_heavy', 'weight_light']);
    const depthRead = await db.from('profiles').select('preferred_game_depths').eq('user_id', testUid).maybeSingle();
    check('평소 깊이 복수값 저장·되읽기', depthSaved.success === true
      && JSON.stringify(depthRead.data?.preferred_game_depths) === JSON.stringify(['weight_light', 'weight_heavy']), depthRead.error?.message || '');
    const invalidDepth = await db.from('profiles').update({preferred_game_depths:['any']}).eq('user_id', testUid);
    check('DB CHECK가 any 거부', !!invalidDepth.error);

    const hardestSaved = await api.replaceProfileHardestGames(testUid, [
      {gameId:'ark-nova'}, {customName:'혁신의 시대'},
    ]);
    const hardestRead = await api.getProfileHardestGames(testUid);
    check('어려웠던 게임 2개 순서 왕복', hardestSaved.success === true && hardestRead.length === 2
      && hardestRead[0].game_id === 'ark-nova' && hardestRead[1].custom_name === '혁신의 시대');
    const tooManyRpc = await db.rpc('replace_profile_hardest_games', {
      p_user_id:testUid,
      p_games:[{game_id:'a'}, {game_id:'b'}, {game_id:'c'}],
    });
    const afterRejected = await api.getProfileHardestGames(testUid);
    check('RPC가 3개를 거부하고 기존 2개 보존', !!tooManyRpc.error && afterRejected.length === 2);

    const intentSaved = await api.upsertMeetingVote(testUid, '028검증', testDate, 10, 20, 0, {
      playTraits:['hard_game_learning_ok'],
    });
    const intentRows = await api.getMeetingVotes(testDate, testDate);
    const intentRow = intentRows.find(row => row.user_id === testUid);
    check('날짜별 어려운 게임 학습 의지 왕복', intentSaved.success === true
      && intentRow?.play_traits?.includes('hard_game_learning_ok'));
  } finally {
    const hardestCleanup = await db.from('profile_hardest_games').delete().eq('user_id', testUid);
    const voteCleanup = await db.from('meeting_votes').delete().eq('vote_date', testDate).eq('user_id', testUid);
    const profileCleanup = await db.from('profiles').delete().eq('user_id', testUid);
    const [hardestConfirm, voteConfirm, profileConfirm] = await Promise.all([
      db.from('profile_hardest_games').select('id').eq('user_id', testUid),
      db.from('meeting_votes').select('user_id').eq('vote_date', testDate).eq('user_id', testUid),
      db.from('profiles').select('user_id').eq('user_id', testUid),
    ]);
    check('격리 테스트 데이터 삭제·0행 재확인',
      !hardestCleanup.error && !voteCleanup.error && !profileCleanup.error
      && !hardestConfirm.error && !voteConfirm.error && !profileConfirm.error
      && hardestConfirm.data.length === 0 && voteConfirm.data.length === 0 && profileConfirm.data.length === 0);
  }
}

(async () => {
  const apiNames = ['getProfileBoardData', 'getProfileHardestGames', 'updatePreferredGameDepths', 'replaceProfileHardestGames'];
  check('신규 API 4개 공개', apiNames.every(name => typeof window.CottageDB[name] === 'function'));

  const invalidAny = await window.CottageDB.updatePreferredGameDepths('u1', ['any']);
  check('평소 깊이 any 거부', NEG ? invalidAny?.error !== 'invalid' : invalidAny?.error === 'invalid',
    NEG ? 'negctl — 이 줄만 FAIL이어야 정상' : '');
  const validDepths = await window.CottageDB.updatePreferredGameDepths('u1', ['weight_heavy', 'weight_light', 'weight_heavy']);
  const depthWrite = writes.find(item => item.table === 'profiles' && item.action === 'update');
  check('복수 깊이 손실 없이 저장·중복 정규화', validDepths.success === true
    && JSON.stringify(depthWrite?.payload?.preferred_game_depths) === JSON.stringify(['weight_heavy', 'weight_light']));

  const tooMany = await window.CottageDB.replaceProfileHardestGames('u1', [
    {gameId:'a'}, {gameId:'b'}, {gameId:'c'},
  ]);
  check('어려웠던 게임 3개 클라이언트 거부', tooMany.error === 'invalid');
  const mixed = await window.CottageDB.replaceProfileHardestGames('u1', [{gameId:'a', customName:'직접입력'}]);
  check('카탈로그/직접입력 동시값 거부', mixed.error === 'invalid');
  const replaced = await window.CottageDB.replaceProfileHardestGames('u1', [
    {gameId:'ark-nova'}, {customName:'혁신의 시대'},
  ]);
  const rpc = rpcCalls.at(-1);
  check('2개 목록을 원자 교체 RPC로 전달', replaced.success === true
    && rpc?.name === 'replace_profile_hardest_games'
    && rpc.args.p_games[0].game_id === 'ark-nova'
    && rpc.args.p_games[1].custom_name === '혁신의 시대');

  const board = await window.CottageDB.getProfileBoardData('u1');
  check('기존 SSOT와 신규 깊이·경험 통합 읽기', board?.bio === '한줄 소개'
    && board?.preferredGameDepths?.join(',') === 'light,deep'
    && board?.hardestGames?.[0]?.game_id === 'ark-nova');

  const intent = await window.CottageDB.upsertMeetingVote('u1', '테스터', '2099-01-01', 10, 20, 0, {
    playTraits:['hard_game_learning_ok', 'hard_game_learning_ok'],
  });
  const voteWrite = writes.find(item => item.table === 'meeting_votes' && item.action === 'upsert');
  check('날짜별 학습 의지 저장·중복 정규화', intent.success === true
    && JSON.stringify(voteWrite?.payload?.play_traits) === JSON.stringify(['hard_game_learning_ok']));
  const invalidTrait = await window.CottageDB.upsertMeetingVote('u1', '테스터', '2099-01-01', 10, 20, 0, {
    playTraits:['persistent_profile_trait'],
  });
  check('평소 성향을 날짜별 play_traits에 혼입하지 않음', !!invalidTrait.error);

  if (LIVE) await runLiveContract();

  console.log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(error => { console.error(error); process.exit(1); });
