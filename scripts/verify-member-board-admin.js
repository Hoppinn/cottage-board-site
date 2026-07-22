// P4 회원 보드 오너 전용 「회원 분석」 섹션 검증 (읽기 전용)
//
//   node scripts/verify-member-board-admin.js            ← 본검사(실DB 대조 포함)
//   node scripts/verify-member-board-admin.js --negctl   ← 음성 대조군(기대값을 한 칸 비틈)
//   node scripts/verify-member-board-admin.js --nodb     ← 가드/이벤트 층만(DB 없이)
//
// 🚨 --negctl을 **먼저** 돌릴 것. "전부 통과"는 검사기 고장과 구별되지 않는다.
//
// 세 가지를 본다.
//   ① 오너 가드 — kakao-auth.js의 _adminView 판정식을 **원문 그대로 잘라 eval**해 진리표와 대조.
//      섹션이 「보는 사람이 오너 + 남의 보드(readOnly) + 대상이 오너 아님」일 때만 떠야 한다.
//   ② countMemberEvents — member-analytics.js(단일 소스)를 eval해, 한 회원의 이벤트를 계열별로
//      센 값이 **이 파일에서 손으로 짠 독립 집계**와 일치하는가(#15: 사본 금지).
//   ③ 필터 조회 충실도 — page_sessions/page_events의 .eq('user_id') 결과가 전량에서 그 유저만
//      추린 것과 정확히 같은가(getUserPageSessions/getUserEvents가 새 규칙을 만들지 않았나).
const fs = require('fs');
const path = require('path');
const { loadMemberAnalytics } = require('./_member-analytics');

const NEGCTL = process.argv.includes('--negctl');
const NODB = process.argv.includes('--nodb');
const OWNER = '4916417947';

let fail = 0;
const ck = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

const MA = loadMemberAnalytics();

// ── ① 오너 가드: kakao-auth.js의 판정식을 원문 그대로 잘라온다 ─────────
const KA = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'kakao-auth.js'), 'utf8').replace(/\r\n/g, '\n');
const gi = KA.indexOf('const _adminView = readOnly');
const gj = KA.indexOf('OWNER_KAKAO_ID);', gi);
if (gi < 0 || gj < 0) { console.log('🔴 kakao-auth.js에서 _adminView 판정식을 못 찾음 — 코드가 바뀌었으면 이 스크립트를 먼저 고칠 것'); process.exit(1); }
// `const _adminView = ` 를 떼고 순수 식만 남긴다(const는 eval 밖으로 안 새므로 식을 반환시킨다).
const guardExpr = KA.slice(gi, gj + 'OWNER_KAKAO_ID);'.length)
  .replace('const _adminView =', '').replace(/;\s*$/, '');
function adminView(readOnly, selfId, targetId) {
  const OWNER_KAKAO_ID = OWNER;
  const _selfUser = selfId == null ? null : { id: selfId };
  const _targetUserId = targetId;
  return eval(guardExpr);
}

console.log('=== ① 오너 가드 진리표 ===');
{
  const O = OWNER, A = '30001', B = '30002';
  //          readOnly, self,  target, 기대
  const cases = [
    [true,  O,    A,    true,  '오너가 남의 보드 → 보인다'],
    [true,  O,    O,    false, '오너가 자기 보드(readOnly) → 안 보인다'],
    [true,  A,    B,    false, '비오너가 남의 보드 → 안 보인다'],
    [true,  A,    O,    false, '비오너가 오너 보드 → 안 보인다'],
    [false, O,    O,    false, '오너 자기 보드(편집 모드) → 안 보인다'],
    [true,  null, A,    false, '로그아웃 상태 → 안 보인다'],
  ];
  cases.forEach(([ro, self, tgt, exp, label], idx) => {
    let want = exp;
    if (NEGCTL && idx === 0) { want = !exp; console.log(`  (음성 대조군) case#0 기대값을 ${exp}→${want}로 비틀었다 — 바로 아래 🔴가 정상`); }
    ck(adminView(ro, self, tgt) === want, label);
  });
}

// ── ② countMemberEvents 독립 대조 (합성) ─────────────────────────────
console.log('\n=== ② 이벤트 계열 집계 (합성) ===');
{
  const U = 'U-alice';
  // EVENT_FAMILIES에서 실재 타입 몇 개를 골라 심는다(하드코딩하지 않고 모듈에서 뽑아 쓴다).
  const recTypes = MA.EVENT_FAMILIES.find(f => f.key === 'record').types;       // 플레이기록
  const meetTypes = MA.EVENT_FAMILIES.find(f => f.key === 'meeting').types;      // 모임
  const events = [
    { user_id: U, event_type: recTypes[0] }, { user_id: U, event_type: recTypes[0] },
    { user_id: U, event_type: recTypes[1] },
    { user_id: U, event_type: meetTypes[0] },
    { user_id: 'U-bob', event_type: recTypes[0] },   // 남의 것 — 섞이면 안 된다
    { user_id: U, session_key: null, event_type: 'unknown_type_xyz' }, // 계열 밖 — 무시돼야 한다
  ];
  const fams = MA.countMemberEvents(events, U);
  const rec = fams.find(f => f.key === 'record');
  const meet = fams.find(f => f.key === 'meeting');
  let expRec = 3; if (NEGCTL) { expRec = 99; console.log(`  (음성 대조군) record 기대 총계를 3→99로 비틀었다 — 아래 🔴가 정상`); }
  ck(rec && rec.total === expRec, `record 계열 총 ${rec ? rec.total : '없음'}회 (alice의 rec 3건만)`);
  ck(meet && meet.total === 1, `meeting 계열 총 ${meet ? meet.total : '없음'}회`);
  ck(!fams.some(f => f.key === 'recommend' || f.key === 'signup'), '활동 없는 계열은 빠진다(0인 계열 미표시)');
  ck(fams.length > 0 && fams[0].total >= (fams[fams.length - 1].total), '계열이 총계 내림차순으로 정렬');
  ck(!fams.some(f => f.types.some(t => t.type === 'unknown_type_xyz')), '계열 밖 이벤트는 세지 않는다');
  ck(!MA.countMemberEvents(events, 'U-bob').some(f => f.total > 1), '남의 user_id는 섞이지 않는다');
  // 이벤트 타입 한글 라벨(보드 「무엇을 했나」가 raw 타입명 대신 이걸 보여준다)
  ck(MA.eventTypeLabel('home_record_write_click') === '홈 · 기록 작성 버튼', 'eventTypeLabel 한글 매핑');
  ck(MA.eventTypeLabel('nonexistent_xyz') === 'nonexistent_xyz', '없는 타입은 raw 폴백');
  ck(rec.types.every(t => t.label && t.label !== t.type), 'countMemberEvents types에 한글 label이 실린다');
  ck(MA.EVENT_ALL_TYPES.every(t => MA.EVENT_TYPE_LABELS[t]), '모든 이벤트 타입에 라벨이 있다(누락 시 raw 노출)');
}

// ── ②-b 활동도 기간 필터를 받는다 (페이지 분포와 같은 기간 규칙) ─────────
console.log('\n=== ②-b 이벤트 기간 필터 (합성) ===');
{
  const U = 'U-carol';
  const TODAY = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const dayAgo = n => new Date(new Date(TODAY + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
  const rt = MA.EVENT_FAMILIES.find(f => f.key === 'record').types;
  // KST 기준 정오로 심어 자정 경계 오염을 피한다.
  const at = kstDate => new Date(new Date(kstDate + 'T00:00:00Z').getTime() + 3 * 3600000).toISOString();
  const events = [
    { user_id: U, event_type: rt[0], created_at: at(TODAY) },
    { user_id: U, event_type: rt[0], created_at: at(TODAY) },
    { user_id: U, event_type: rt[1], created_at: at(dayAgo(1)) },
    { user_id: U, event_type: rt[1], created_at: at(dayAgo(6)) },   // 7일 안
    { user_id: U, event_type: rt[1], created_at: at(dayAgo(7)) },   // 7일 밖
  ];
  const tot = p => MA.countMemberEvents(events, U, p, TODAY).reduce((s, f) => s + f.total, 0);
  ck(tot('all') === 5, `전 기간 = 5건 (${tot('all')})`);
  ck(tot('today') === 2, `오늘 = 2건 (${tot('today')})`);
  ck(tot('yesterday') === 1, `어제 = 1건 (${tot('yesterday')})`);
  ck(tot('7d') === 4, `7일 = 4건 (오늘2+어제1+6일전1, ${tot('7d')})`);
  ck(tot(dayAgo(1)) === 1, `특정 날짜(어제) = 1건 (${tot(dayAgo(1))})`);
  ck(tot('today') <= tot('7d') && tot('7d') <= tot('all'), '기간 좁힐수록 단조 감소');
  ck(MA.inPeriodByKst(at(TODAY), 'today', TODAY) && !MA.inPeriodByKst(at(dayAgo(1)), 'today', TODAY), 'inPeriodByKst가 created_at을 기간으로 판정');
}

if (NODB) { console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 가드·이벤트 층 통과 (--nodb라 DB 대조는 건너뜀)'); process.exit(fail ? 1 : 0); }

// ── ③ 실DB — 필터 조회 충실도 + 실회원 이벤트 대조 ───────────────────
(async () => {
  console.log('\n=== ③ 실DB 대조 ===');
  const { createClient } = require('../node_modules/@supabase/supabase-js');
  let window = {};
  eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
  const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

  // 이벤트가 가장 많은 회원 하나를 고른다.
  const { data: allEv, error: e1, count: evCount } = await db.from('page_events')
    .select('event_type, user_id, session_key', { count: 'exact' })
    .in('event_type', MA.EVENT_ALL_TYPES).limit(50000);
  if (e1) { console.log('🔴 page_events 조회 실패:', e1.message); process.exit(1); }
  ck((allEv || []).length === evCount, `page_events 전량 수신 ${(allEv || []).length} = count ${evCount}`);
  const byUser = new Map();
  for (const e of (allEv || [])) if (e.user_id) byUser.set(e.user_id, (byUser.get(e.user_id) || 0) + 1);
  const target = [...byUser.entries()].filter(([id]) => id !== OWNER).sort((a, b) => b[1] - a[1])[0];
  ck(!!target, `대조할 회원 선정 (${target ? target[0].slice(0, 8) + ' — ' + target[1] + '건' : '없음'})`);
  if (!target) { console.log(fail ? `\n🔴 ${fail}건 실패` : '\n(이벤트 있는 비오너 회원이 없어 DB 대조 생략)'); process.exit(fail ? 1 : 0); }
  const M = target[0];

  // (a) 필터 조회 충실도 — .eq('user_id', M)가 전량에서 M만 추린 것과 같은가
  const { data: evM } = await db.from('page_events').select('event_type, user_id, session_key')
    .eq('user_id', M).in('event_type', MA.EVENT_ALL_TYPES).limit(50000);
  const evMfromAll = (allEv || []).filter(e => String(e.user_id) === String(M));
  ck((evM || []).length === evMfromAll.length, `이벤트 .eq 충실도 — 필터 ${(evM || []).length}건 = 전량추출 ${evMfromAll.length}건`);

  const { data: psAll, count: psCount } = await db.from('page_sessions')
    .select('user_id', { count: 'exact', head: false }).eq('user_id', M).limit(50000);
  ck(psCount !== null && (psAll || []).length === psCount, `page_sessions .eq 전량 수신 ${(psAll || []).length} = count ${psCount}`);

  // (b) countMemberEvents(실회원) == 손으로 짠 독립 집계
  const fams = MA.countMemberEvents(evM || [], M);
  const famTotal = fams.reduce((s, f) => s + f.total, 0);
  // 독립 집계: 모듈을 안 쓰고 직접 센다
  const famDefs = MA.EVENT_FAMILIES;
  const indep = new Map();
  for (const e of (evM || [])) {
    if (String(e.user_id) !== String(M)) continue;
    const fam = famDefs.find(f => f.types.includes(e.event_type));
    if (fam) indep.set(fam.key, (indep.get(fam.key) || 0) + 1);
  }
  const indepTotal = [...indep.values()].reduce((s, n) => s + n, 0);
  let want = indepTotal; if (NEGCTL) { want = indepTotal + 7; console.log(`  (음성 대조군) 실회원 총계 기대를 +7로 비틀었다 — 아래 🔴가 정상`); }
  ck(famTotal === want, `실회원 계열 총계 ${famTotal} = 독립 집계 ${indepTotal}`);
  for (const f of fams) ck(f.total === indep.get(f.key), `  · ${f.emoji}${f.label} ${f.total} = 독립 ${indep.get(f.key)}`);

  console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 전부 통과');
  process.exit(fail ? 1 : 0);
})();
