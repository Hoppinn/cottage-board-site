// 필수 자기소개 설문 + 최초 1회 음료교환권 계약 검사
// 사용: node scripts/verify-intro-questionnaire.js [--negctl]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const html = read('pages/club/club-intro.html');
const adminHtml = read('pages/admin/requests-admin.html');
let sql = read('docs/migrations/023_member_intro_questionnaire.sql');
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
  return (block.match(/<input\b/g) || []).length;
};
check(inOrder(html, joinSources), '가입 경로 7개 순서 불일치');
check(inOrder(html, companionTypes), '동반 유형 5개 순서 불일치');
check((html.match(/data-group="joinSources"/g) || []).length === 1, '가입 경로 그룹 중복/누락');
check(groupOptionCount('availableDays') === 8, '가능 요일 선택지 개수 불일치');
check(groupOptionCount('availableTimes') === 5, '가능 시간대 선택지 개수 불일치');
check(groupOptionCount('preferredGameTypes') === 10, '선호 게임 유형 선택지 개수 불일치');
check(groupOptionCount('avoidGameTypes') === 9, '비선호 게임 유형 선택지 개수 불일치');
check(groupOptionCount('clocktowerPreference') === 5, '시계탑 선호도 선택지 개수 불일치');
check(html.includes('submitMemberIntro?.(String(u.id), answers)'), '전체 제출 API 연결 누락');
check(!html.includes("from('voucher_log')"), '화면에서 교환권 원장을 직접 써 원자성이 깨짐');
check(html.includes('possibleFrequencyMin > answers.possibleFrequencyMax'), '가능 빈도 최소≤최대 검증 누락');
check(html.includes('desiredFrequencyMin > answers.desiredFrequencyMax'), '희망 빈도 최소≤최대 검증 누락');

check(sql.includes(uniqueClause), 'intro_complete 사용자당 1회 unique index 누락');
check(sql.includes("ON CONFLICT (user_id) WHERE reason = 'intro_complete' DO NOTHING"), '중복 지급 충돌 처리 누락');
check(sql.includes('CREATE OR REPLACE FUNCTION public.submit_member_intro'), '원자적 제출 RPC 누락');
check(sql.includes('UPDATE public.profiles SET avoid_tags = v_avoid_tags'), 'avoid_tags SSOT 갱신 누락');
check(sql.includes('IF NOT FOUND THEN'), '프로필 미존재 전체 롤백 가드 누락');
check(sql.includes("'flexible' = ANY(p_available_days)"), '요일 유동적 배타 검증 누락');
check(sql.includes("'flexible' = ANY(p_available_times)"), '시간대 유동적 배타 검증 누락');
check(sql.includes("'any' = ANY(p_preferred_game_types)"), '장르 무관 배타 검증 누락');
check(client.includes("db.rpc('submit_member_intro'"), 'CottageDB RPC 래퍼 누락');
check(client.includes('submitMemberIntro,'), 'CottageDB export 누락');
check(adminHtml.includes("join_sources').not('user_id','is',null)"), '관리자 가입 경로 조회 누락');
check(!/joinSources: intro\.join_sources/.test(client), '공개 모임 보드에 가입 경로가 노출됨');

if (failures.length) {
  console.error(`🔴 ${failures.length}건 실패`);
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`✅ 통과 — 가입 경로 ${joinSources.length}개, 동반 유형 ${companionTypes.length}개, 저장+지급 단일 RPC, 공개 보드 가입 경로 제외`);
}
