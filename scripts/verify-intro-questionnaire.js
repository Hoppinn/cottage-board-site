// 필수 자기소개 설문 + 최초 1회 음료교환권 계약 검사
// 사용: node scripts/verify-intro-questionnaire.js [--negctl]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const html = read('pages/club/club-intro.html');
const adminHtml = read('pages/admin/requests-admin.html');
let sql = [
  read('docs/migrations/023_member_intro_questionnaire.sql'),
  read('docs/migrations/025_fix_member_intro_uuid_return.sql'),
  read('docs/migrations/026_member_intro_time_slots_custom_types.sql'),
  read('docs/migrations/030_member_intro_available_days_holiday.sql'),
  read('docs/migrations/031_member_intro_preference_layers.sql'),
].join('\n');
const latestSql = read('docs/migrations/031_member_intro_preference_layers.sql');
const client = read('assets/js/supabase-client.js');
const negctl = process.argv.includes('--negctl');

const uniqueClause = "CREATE UNIQUE INDEX IF NOT EXISTS voucher_log_intro_complete_unique\n  ON public.voucher_log (user_id)\n  WHERE reason = 'intro_complete';";
if (negctl) {
  sql = sql.replace(uniqueClause, '');
  console.log('[negctl] intro_complete unique index를 제거했다. 검사가 실패해야 정상.');
}

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const inOrder = (source, values) => values.every((value, i) => i === 0 || source.indexOf(values[i - 1]) < source.indexOf(value));

check((html.match(/class="intro-wizard-step/g) || []).length === 6, 'Wizard step count mismatch');
check(html.includes('id="introWizardProgress"'), 'Wizard progress missing');
check(html.includes('validateStep(wizardStep)'), 'Wizard step validation missing');
check(html.includes('openWizard({ edit: !!r.questionnaire_completed_at })'), 'Wizard edit entry missing');
check(html.includes("document.getElementById('introWizardReward').hidden = !result.voucherGranted"), 'Voucher completion branch missing');
const cardRenderer = html.slice(html.indexOf("el.innerHTML = data.map"), html.indexOf('// 카드 색상 적용'));
check(cardRenderer.includes('r._bio') && cardRenderer.includes('r.companion_types')
  && cardRenderer.includes('r.preferred_game_depths') && cardRenderer.includes('r._liked_game_count')
  && cardRenderer.includes('r._curious_game_count') && !cardRenderer.includes('r.clocktower_preference'),
  'Profile card matches the profile-preview summary fields');
check(html.includes("myRow?.questionnaire_completed_at ? '모임원 프로필 수정하기' : '모임원 프로필 작성하기'"), 'Existing profile start label missing');

// 브라우저가 없어도 인라인 스크립트의 파싱 오류는 잡는다.
for (const [file, source] of [['club-intro.html', html], ['requests-admin.html', adminHtml]]) {
  const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(s => s.trim());
  scripts.forEach((script, i) => {
    try { new vm.Script(script, { filename: `${file}:inline-${i + 1}` }); }
    catch (error) { failures.push(`${file} 인라인 스크립트 ${i + 1} 파싱 실패: ${error.message}`); }
  });
}

const joinSources = ['store_visit','friend_referral','cottage_homepage','open_chat_search','daangn','naver_place','social_media'];
const companionTypes = ['friends','partner','family','boardgame_group','various'];
const groupOptionCount = group => {
  const block = html.match(new RegExp(`data-group="${group}"[\\s\\S]*?<\\/fieldset>`))?.[0] || '';
  return (block.match(/<input\b[^>]*type="(?:checkbox|radio)"/g) || []).length;
};
check(inOrder(html, joinSources), '가입 경로 7개 순서 불일치');
check(inOrder(html, companionTypes), '동반 유형 5개 순서 불일치');
check((html.match(/data-group="joinSources"/g) || []).length === 1, '가입 경로 그룹 중복/누락');
check(groupOptionCount('availableDays') === 8, '가능 요일 선택지 개수 불일치');
check(html.includes("holidayOption.hidden = true") && html.includes('isMemberIntroHolidaySupported'), '공휴일 선택의 migration 적용 전 숨김 계약 누락');
check(html.includes('data-day-preset="weekday"') && html.includes('data-day-preset="weekend"') && html.includes('data-day-preset="daily"'), '요일 빠른 선택 누락');
check(groupOptionCount('availableTimes') === 1, '시간대 유동적 선택지 누락');
check(html.includes('const rows = [[12,24], [24,36], [36,48], [48,60]]'), '30분 시간 막대 48슬롯 구성 누락');
check(html.includes('const GAME_TYPE_OPTIONS') && html.includes('const DEPTH_OPTIONS'), '유형·난이도 선택지 정본 누락');
check(groupOptionCount('avoidGameTypes') === 9, '비선호 게임 유형 선택지 개수 불일치');
check(groupOptionCount('clocktowerPreference') === 5, '시계탑 선호도 선택지 개수 불일치');
check(html.includes('submitMemberIntro?.(String(u.id), answers)'), '전체 제출 API 연결 누락');
check(!html.includes("from('voucher_log')"), '화면에서 교환권 원장을 직접 써 원자성이 깨짐');
check(html.includes('possibleFrequencyMin > answers.possibleFrequencyMax'), '가능 빈도 최소≤최대 검증 누락');
check(html.includes('desiredFrequencyMin > answers.desiredFrequencyMax'), '희망 빈도 최소≤최대 검증 누락');

check(sql.includes(uniqueClause), 'intro_complete 사용자당 1회 unique index 누락');
check(sql.includes("ON CONFLICT (user_id) WHERE reason = 'intro_complete' DO NOTHING"), '중복 지급 충돌 처리 누락');
check(sql.includes('CREATE OR REPLACE FUNCTION public.submit_member_intro') || sql.includes('CREATE FUNCTION public.submit_member_intro'), '원자적 제출 RPC 누락');
check(latestSql.includes('game_type_range') && latestSql.includes('avoid_game_depths'), '3단 취향 컬럼 누락');
check(latestSql.includes('preferred_game_types <@ game_type_range') && latestSql.includes('preferred_game_depths <@ game_depth_range'), '주 취향 부분집합 DB 계약 누락');
check(latestSql.includes('NOT (game_depth_range && avoid_game_depths)'), '난이도 범위·꺼림 충돌 방지 누락');
check(latestSql.includes('RETURNS TABLE(intro_id UUID'), 'member_intros UUID 반환 계약 누락');
check(latestSql.includes('v_intro_id UUID'), 'member_intros UUID 로컬 변수 누락');
check(!latestSql.includes("'flexible' = ANY(p_available_days)"), '요일 유동적이 다른 요일과 여전히 배타적');
check(latestSql.includes("'mon','tue','wed','thu','fri','sat','sun','holiday','flexible'"), '공휴일 허용값 호환 확장 누락');
check(sql.includes('member_intro_holiday_supported') && sql.includes('GRANT EXECUTE ON FUNCTION public.member_intro_holiday_supported() TO anon'), '공휴일 migration 적용 확인 RPC 누락');
check(!latestSql.includes("'flexible' = ANY(p_available_times)"), '시간대 유동적이 시간 슬롯과 여전히 배타적');
check(latestSql.includes("item !~ '^([01][0-9]|2[0-3]):(00|30)$'"), '30분 슬롯 DB 검증 누락');
check(sql.includes("'any' = ANY(p_preferred_game_types)"), '장르 무관 배타 검증 누락');
check(client.includes("db.rpc('submit_member_intro'"), 'CottageDB RPC 래퍼 누락');
check(client.includes('submitMemberIntro,'), 'CottageDB export 누락');
check(client.includes('normalizeMemberIntroTimes,') && client.includes('formatMemberIntroDays,') && client.includes('formatMemberIntroTimes,') && client.includes('formatMemberIntroAvailability,'), '요일·시간 호환 공용 API 누락');
check(client.includes('isMemberIntroHolidaySupported,'), '공휴일 적용 확인 API export 누락');
check(html.includes('data-add-custom="preferredGameTypes"') && html.includes('data-add-custom="avoidGameTypes"'), '게임 유형 기타 입력 누락');
check(adminHtml.includes("join_sources').not('user_id','is',null)"), '관리자 가입 경로 조회 누락');
check(/joinSources: intro\.join_sources/.test(client), '공개 프로필 가입 경로 전달 누락');

const memory = new Map();
const clientWindow = {
  SUPABASE_CONFIG:{url:'https://example.invalid', anonKey:'test'},
  supabase:{createClient:() => ({})},
  addEventListener:()=>{}, dispatchEvent:()=>{},
};
clientWindow.window = clientWindow;
vm.runInNewContext(client, {
  window:clientWindow,
  console,
  localStorage:{getItem:key => memory.get(key) || null, setItem:(key, value) => memory.set(key, value)},
  document:{addEventListener:()=>{}},
  Image:function(){}, FileReader:function(){}, URL:{createObjectURL:()=>'', revokeObjectURL:()=>{}},
  Blob:function(){}, CustomEvent:function(){}, setTimeout, clearTimeout,
});
const timeApi = clientWindow.CottageDB;
check(timeApi.formatMemberIntroTimes(['09:00','09:30','10:00','10:30','11:00','11:30']) === '09시~12시', '단일 시간 범위 출력 불일치');
check(timeApi.formatMemberIntroTimes(['09:30','10:00','10:30','11:00','11:30']) === '09시30분~12시', '30분 시간 범위 출력 불일치');
check(timeApi.formatMemberIntroTimes(['22:30','23:00','23:30','00:00','00:30']) === '22시30분~01시', '자정 넘김 시간 범위 출력 불일치');
check(timeApi.formatMemberIntroTimes(['09:00','09:30','15:00','15:30','flexible']) === '09시~10시 · 15시~16시 · 시간대 유동적', '복수 범위+유동적 출력 불일치');
check(timeApi.normalizeMemberIntroTimes(['morning','flexible']).length === 13, '기존 오전 데이터 30분 슬롯 호환 불일치');

check(timeApi.formatMemberIntroDays(['mon','tue','wed','thu','fri','sat','sun','holiday']) === '매일', '매일 요약 불일치');
check(timeApi.formatMemberIntroDays(['mon','tue','wed','thu','fri','holiday']) === '평일·공휴일', '평일·공휴일 요약 불일치');
check(timeApi.formatMemberIntroDays(['sat','sun','holiday']) === '주말·공휴일', '주말·공휴일 요약 불일치');
check(timeApi.formatMemberIntroDays(['tue','thu','flexible']) === '화·목', '개별 요일 요약 불일치');
check(timeApi.formatMemberIntroAvailability(['tue','thu','flexible'], ['18:00','18:30','19:00']) === '화·목 · 18시~19시30분 · 일정 유동적', '개별 요일·유동성 요약 불일치');
check(timeApi.formatMemberIntroAvailability(['sat','sun','holiday'], ['14:00','14:30','15:00','15:30']) === '주말·공휴일 · 14시~16시', '요일·시간 결합 요약 불일치');

if (failures.length) {
  console.error(`🔴 ${failures.length}건 실패`);
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`✅ 통과 — 가입 경로 ${joinSources.length}개, 동반 유형 ${companionTypes.length}개, 저장+지급 단일 RPC, 상세 프로필 가입 경로 공개`);
}
