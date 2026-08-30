// 내보드 IA 028/API 계약 검증 (DB 쓰기 없음)
//   node scripts/verify-profile-board-ia.js --negctl
//   node scripts/verify-profile-board-ia.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NEG = process.argv.includes('--negctl');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sql = read('docs/migrations/028_profile_board_ia.sql');
const clientSrc = read('assets/js/supabase-client.js');
let failures = 0;
function check(label, condition, detail = '') {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
}

console.log('=== 1. 028 migration 계약 ===');
check('평소 깊이는 TEXT[] 복수값', sql.includes('preferred_game_depths TEXT[]'));
check('평소 깊이 허용값에 any 없음', sql.includes("ARRAY['light', 'medium', 'deep']::TEXT[]")
  && !/preferred_game_depths[^;]*'any'/s.test(sql));
check('평소 깊이 중복값 DB 차단', ['light', 'medium', 'deep']
  .every(code => sql.includes(`cardinality(array_positions(preferred_game_depths, '${code}')) <= 1`)));
check('어려웠던 게임은 순서 1~2와 사용자별 순서 UNIQUE', sql.includes('sort_order BETWEEN 1 AND 2')
  && sql.includes('UNIQUE (user_id, sort_order)'));
check('카탈로그/직접입력 중 정확히 하나', sql.includes('num_nonnulls(') && sql.includes('= 1'));
check('신규 테이블 RLS 상태 명시', sql.includes('profile_hardest_games DISABLE ROW LEVEL SECURITY'));
check('최대 2개 원자 교체 RPC', sql.includes('replace_profile_hardest_games')
  && sql.includes('jsonb_array_length') && sql.includes('> 2'));
check('날짜별 어려운 게임 학습 의지 허용', sql.includes("'hard_game_learning_ok'"));

console.log('\n=== 2. CottageDB API 실행 계약 ===');
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

(async () => {
  const apiNames = ['getProfileBoardData', 'getProfileHardestGames', 'updatePreferredGameDepths', 'replaceProfileHardestGames'];
  check('신규 API 4개 공개', apiNames.every(name => typeof window.CottageDB[name] === 'function'));

  const invalidAny = await window.CottageDB.updatePreferredGameDepths('u1', ['any']);
  check('평소 깊이 any 거부', NEG ? invalidAny?.error !== 'invalid' : invalidAny?.error === 'invalid',
    NEG ? 'negctl — 이 줄만 FAIL이어야 정상' : '');
  const validDepths = await window.CottageDB.updatePreferredGameDepths('u1', ['deep', 'light', 'deep']);
  const depthWrite = writes.find(item => item.table === 'profiles' && item.action === 'update');
  check('복수 깊이 손실 없이 저장·중복 정규화', validDepths.success === true
    && JSON.stringify(depthWrite?.payload?.preferred_game_depths) === JSON.stringify(['deep', 'light']));

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

  console.log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(error => { console.error(error); process.exit(1); });
