/**
 * 방문일수(visit_count) 복구 스크립트
 * page_sessions의 entered_at KST 날짜 기준 유니크 날짜 수를 집계해서
 * profiles.visit_count보다 크면 업데이트한다.
 * 실행: node game-system/tools/recover-visit-count.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fqddfvprknwcgojwfrbs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAll(table, select, filter) {
  let all = [], from = 0;
  while (true) {
    let q = db.from(table).select(select).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`${table} 조회 실패:`, error.message); return all; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log('=== 방문일수 복구 ===\n');

  const [profiles, sessions] = await Promise.all([
    fetchAll('profiles', 'user_id, nickname, visit_count'),
    fetchAll('page_sessions', 'user_id, entered_at', q => q.not('user_id', 'is', null)),
  ]);

  console.log(`profiles: ${profiles.length}명, page_sessions: ${sessions.length}건\n`);

  // user_id별 유니크 KST 날짜 집계
  // entered_at은 UTC ISO 문자열 → UTC+9 적용 → 날짜 추출
  const visitDays = {};
  for (const s of sessions) {
    if (!s.user_id || !s.entered_at) continue;
    const kstDate = new Date(new Date(s.entered_at).getTime() + 9 * 3600000)
      .toISOString().slice(0, 10); // 'YYYY-MM-DD' KST
    if (!visitDays[s.user_id]) visitDays[s.user_id] = new Set();
    visitDays[s.user_id].add(kstDate);
  }

  // 복구 실행
  let updated = 0, skipped = 0;
  for (const p of profiles) {
    const days = visitDays[p.user_id] ? visitDays[p.user_id].size : 0;
    const current = p.visit_count || 0;
    const label = p.nickname || p.user_id;

    if (days > current) {
      const { error } = await db.from('profiles')
        .update({ visit_count: days })
        .eq('user_id', p.user_id);
      if (error) {
        console.error(`  ✗ ${label}: ${error.message}`);
      } else {
        console.log(`  ✓ ${label}: ${current}일 → ${days}일 (+${days - current}일)`);
        updated++;
      }
    } else {
      console.log(`  - ${label}: ${current}일 (세션집계 ${days}일, 유지)`);
      skipped++;
    }
  }

  console.log(`\n복구 완료: ${updated}명 업데이트, ${skipped}명 유지`);

  // 최종 상태 출력
  const { data: final } = await db.from('profiles')
    .select('nickname, visit_count, total_minutes')
    .order('visit_count', { ascending: false });
  console.log('\n[ 복구 후 visit_count 순위 ]');
  for (const p of (final || [])) {
    const totalH = Math.floor((p.total_minutes || 0) / 3600);
    const totalM = Math.floor(((p.total_minutes || 0) % 3600) / 60);
    console.log(`  ${(p.nickname || '(없음)').padEnd(10)} | 방문 ${p.visit_count || 0}일 | 총이용 ${totalH}h ${totalM}m`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
