// 운영 DB 모임원 프로필 RPC 검증. 기본은 읽기 전용 probe다.
// --live는 voucher_log anon DELETE가 0행일 수 있어 --manual-cleanup-ok를 함께 명시해야 한다.
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://fqddfvprknwcgojwfrbs.supabase.co';
const KEY = 'sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl';
const db = createClient(URL, KEY);
const live = process.argv.includes('--live');
const userId = process.argv.find(arg => arg.startsWith('--user-id='))?.slice('--user-id='.length) || '';
const inspectNickname = process.argv.find(arg => arg.startsWith('--nickname='))?.slice('--nickname='.length) || '';
const allowSnapshot = process.argv.includes('--allow-real-snapshot');
const manualCleanupOk = process.argv.includes('--manual-cleanup-ok');
const check = (ok, message) => { if (!ok) throw new Error(message); };

const INTRO_FIELDS = [
  'nickname','join_sources','companion_types','average_play_frequency',
  'possible_frequency_min','possible_frequency_max','desired_frequency_min','desired_frequency_max',
  'available_days','available_times','preferred_game_types','clocktower_preference',
  'expectation','questionnaire_completed_at',
];

function rpcPayload(id, answers) {
  return {
    p_user_id:id,
    p_nickname:answers.nickname,
    p_join_sources:answers.joinSources,
    p_companion_types:answers.companionTypes,
    p_average_play_frequency:answers.averagePlayFrequency,
    p_possible_frequency_min:answers.possibleFrequencyMin,
    p_possible_frequency_max:answers.possibleFrequencyMax,
    p_desired_frequency_min:answers.desiredFrequencyMin,
    p_desired_frequency_max:answers.desiredFrequencyMax,
    p_available_days:answers.availableDays,
    p_available_times:answers.availableTimes,
    p_preferred_game_types:answers.preferredGameTypes,
    p_avoid_game_types:answers.avoidGameTypes,
    p_clocktower_preference:answers.clocktowerPreference,
    p_expectation:answers.expectation,
  };
}

async function exactCount(table) {
  const { count, error } = await db.from(table).select('*', {count:'exact', head:true});
  if (error) throw error;
  return count;
}

async function probe() {
  const [profiles, intros, vouchers] = await Promise.all([
    exactCount('profiles'), exactCount('member_intros'), exactCount('voucher_log'),
  ]);
  let query = db.from('profiles').select('user_id,nickname').limit(20);
  query = inspectNickname ? query.eq('nickname', inspectNickname) : query.or('nickname.ilike.%검증%,nickname.ilike.%테스트%');
  const { data, error } = await query;
  if (error) throw error;
  const inspected = [];
  for (const profile of data || []) {
    const [{data:intro}, {count:voucherCount}] = await Promise.all([
      db.from('member_intros').select('id,questionnaire_completed_at').eq('user_id', profile.user_id).maybeSingle(),
      db.from('voucher_log').select('*', {count:'exact', head:true}).eq('user_id', profile.user_id).eq('reason', 'intro_complete'),
    ]);
    inspected.push({...profile, introId:intro?.id || null, questionnaireCompleted:!!intro?.questionnaire_completed_at, introVoucherCount:voucherCount || 0});
  }
  console.log(JSON.stringify({counts:{profiles,intros,vouchers}, candidates:inspected}, null, 2));
}

async function runLive() {
  check(userId, '--live에는 --user-id=<검증용 profile user_id>가 필요하다.');
  check(manualCleanupOk, '--live는 테스트 쿠폰을 SQL Editor에서 수동 제거할 수 있을 때만 --manual-cleanup-ok와 함께 실행한다.');
  const { data:profile, error:profileError } = await db.from('profiles')
    .select('user_id,nickname,avoid_tags').eq('user_id', userId).maybeSingle();
  if (profileError) throw profileError;
  check(profile, '지정 profile이 없다. 새 운영 profile은 만들지 않는다.');
  check(allowSnapshot || String(profile.user_id).startsWith('__') || /검증|테스트/.test(profile.nickname || ''), '실회원으로 보이는 profile은 --allow-real-snapshot 없이 자동 검증에 사용하지 않는다.');

  const [{data:intro, error:introError}, {data:vouchers, error:voucherError}] = await Promise.all([
    db.from('member_intros').select('*').eq('user_id', userId).maybeSingle(),
    db.from('voucher_log').select('*').eq('user_id', userId).eq('reason', 'intro_complete'),
  ]);
  if (introError) throw introError;
  if (voucherError) throw voucherError;
  check((vouchers || []).length === 0, '이미 intro_complete 쿠폰이 있는 검증 계정이라 최초 지급을 검증할 수 없다.');

  const baselineCounts = {
    profiles:await exactCount('profiles'), intros:await exactCount('member_intros'), vouchers:await exactCount('voucher_log'),
  };
  let createdVoucher = false;
  let cleanupIssue = '';
  try {
    const firstAnswers = {
      nickname:profile.nickname || '프로필 검증', joinSources:['store_visit'], companionTypes:['friends'],
      averagePlayFrequency:3, possibleFrequencyMin:1, possibleFrequencyMax:3,
      desiredFrequencyMin:2, desiredFrequencyMax:4,
      availableDays:['sat','flexible'],
      availableTimes:['09:30','10:00','10:30','11:00','11:30','15:00','15:30','16:00','16:30','17:00','17:30','22:30','23:00','23:30','00:00','00:30','flexible'],
      preferredGameTypes:['strategy','검증용 유형'], avoidGameTypes:['검증용 비선호'],
      clocktowerPreference:'interested', expectation:'운영 저장과 쿠폰 원자성을 확인하는 격리 검증입니다.',
    };
    const first = await db.rpc('submit_member_intro', rpcPayload(userId, firstAnswers));
    if (first.error) throw first.error;
    const firstRow = first.data?.[0];
    check(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(firstRow?.intro_id || ''), 'intro_id가 UUID로 반환되지 않았다.');
    check(firstRow.voucher_granted === true, '최초 저장에서 쿠폰이 지급되지 않았다.');
    createdVoucher = true;

    const [{data:saved, error:savedError}, {data:firstVouchers, error:firstVoucherError}] = await Promise.all([
      db.from('member_intros').select('id,user_id,available_days,available_times,preferred_game_types').eq('user_id', userId).single(),
      db.from('voucher_log').select('id,reason,delta').eq('user_id', userId).eq('reason', 'intro_complete'),
    ]);
    if (savedError) throw savedError;
    if (firstVoucherError) throw firstVoucherError;
    check(saved.id === firstRow.intro_id && saved.user_id === userId, 'member_intros 사용자/UUID 왕복 불일치');
    check(saved.available_days.includes('sat') && saved.available_days.includes('flexible'), '요일+유동적 저장 불일치');
    check(saved.available_times.includes('09:30') && saved.available_times.includes('00:30') && saved.available_times.includes('flexible'), '30분/자정/유동적 저장 불일치');
    check(saved.preferred_game_types.includes('검증용 유형'), '커스텀 선호 유형 저장 불일치');
    check(firstVouchers.length === 1 && firstVouchers[0].delta === 1, '최초 쿠폰 원장 행 수/증분 불일치');

    const secondAnswers = {...firstAnswers, expectation:'같은 계정의 재저장과 쿠폰 중복 방지를 확인합니다.', preferredGameTypes:['party','재저장 유형']};
    const second = await db.rpc('submit_member_intro', rpcPayload(userId, secondAnswers));
    if (second.error) throw second.error;
    const secondRow = second.data?.[0];
    check(secondRow.intro_id === firstRow.intro_id, '재저장 시 intro 행이 중복 생성됐다.');
    check(secondRow.voucher_granted === false, '재저장 시 쿠폰이 중복 지급됐다.');
    const { data:secondVouchers, error:secondVoucherError } = await db.from('voucher_log')
      .select('id').eq('user_id', userId).eq('reason', 'intro_complete');
    if (secondVoucherError) throw secondVoucherError;
    check(secondVouchers.length === 1, '재저장 후 intro_complete 원장 행이 1개가 아니다.');

    console.log(JSON.stringify({
      passed:true, introId:firstRow.intro_id, firstVoucherGranted:true, secondVoucherGranted:false,
      stored:{availableDays:saved.available_days, availableTimes:saved.available_times, preferredGameTypes:saved.preferred_game_types},
    }, null, 2));
  } finally {
    if (intro) {
      const restore = Object.fromEntries(INTRO_FIELDS.map(field => [field, intro[field] ?? null]));
      const { error } = await db.from('member_intros').update(restore).eq('id', intro.id);
      if (error) throw error;
    } else {
      const { error } = await db.from('member_intros').delete().eq('user_id', userId);
      if (error) throw error;
    }
    const { error:profileRestoreError } = await db.from('profiles').update({avoid_tags:profile.avoid_tags || []}).eq('user_id', userId);
    if (profileRestoreError) throw profileRestoreError;
    if (createdVoucher) {
      const { data:deleted, error } = await db.from('voucher_log').delete()
        .eq('user_id', userId).eq('reason', 'intro_complete').select('id');
      if (error) throw error;
      if ((deleted || []).length !== 1) {
        cleanupIssue = `voucher_log anon DELETE가 ${(deleted || []).length}행 처리됨. SQL Editor에서 DELETE FROM public.voucher_log WHERE user_id = '${userId}' AND reason = 'intro_complete'; 실행 필요`;
      }
    }
    const restoredCounts = {
      profiles:await exactCount('profiles'), intros:await exactCount('member_intros'), vouchers:await exactCount('voucher_log'),
    };
    check(!cleanupIssue, cleanupIssue);
    check(JSON.stringify(restoredCounts) === JSON.stringify(baselineCounts), `정리 후 전체 행 수가 다르다: ${JSON.stringify({baselineCounts, restoredCounts})}`);
    const [{data:restoredIntro}, {data:restoredVoucher}] = await Promise.all([
      db.from('member_intros').select('id').eq('user_id', userId),
      db.from('voucher_log').select('id').eq('user_id', userId).eq('reason', 'intro_complete'),
    ]);
    check(restoredIntro.length === (intro ? 1 : 0) && restoredVoucher.length === 0, '검증 데이터 정리 결과가 기준과 다르다.');
    console.log(`CLEANUP_OK ${JSON.stringify(restoredCounts)}`);
  }
}

(live ? runLive() : probe()).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
