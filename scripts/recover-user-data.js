/**
 * 유저 데이터 복구 실행 스크립트
 * 실행: node game-system/tools/recover-user-data.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fqddfvprknwcgojwfrbs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function fmt(s) {
  if (!s && s !== 0) return '-';
  if (s >= 3600) return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
  if (s >= 60)   return `${Math.floor(s/60)}m ${s%60}s`;
  return `${s}s`;
}

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

async function update(userId, fields, label) {
  const { error } = await db.from('profiles').update(fields).eq('user_id', userId);
  if (error) console.error(`  ✗ ${label} 실패:`, error.message);
  else console.log(`  ✓ ${label}`);
  return !error;
}

async function main() {
  console.log('=== 유저 데이터 복구 실행 ===\n');

  const [profiles, sessions] = await Promise.all([
    fetchAll('profiles', '*'),
    fetchAll('page_sessions', 'user_id, duration_sec', q => q.not('user_id', 'is', null)),
  ]);

  // 세션 합산
  const sessionTotals = {};
  for (const s of sessions) {
    sessionTotals[s.user_id] = (sessionTotals[s.user_id] || 0) + (s.duration_sec || 0);
  }

  // ── 1. 이용시간 복구 (세션합계 > DB인 경우만) ────────────────
  console.log('[ 이용시간 복구 ]');
  for (const p of profiles) {
    const dbTime = p.total_minutes || 0;
    const sesTime = sessionTotals[p.user_id] || 0;
    if (sesTime > dbTime + 60) { // 1분 이상 차이 나는 경우만
      await update(
        p.user_id,
        { total_minutes: sesTime },
        `${p.nickname || p.user_id}: ${fmt(dbTime)} → ${fmt(sesTime)} (+${fmt(sesTime - dbTime)})`
      );
    } else if (sesTime > 0 && dbTime === 0) { // 작은 차이여도 0이면 복구
      await update(
        p.user_id,
        { total_minutes: sesTime },
        `${p.nickname || p.user_id}: 0s → ${fmt(sesTime)}`
      );
    }
  }

  // ── 2. 실명 복구 ─────────────────────────────────────────────
  console.log('\n[ 실명 복구 ]');

  // 이복규: 닉네임이 한국 실명 형태 (성+이름) → real_name = nickname
  const ibokkyu = profiles.find(p => p.user_id === '4922126155');
  if (ibokkyu && !ibokkyu.real_name) {
    await update(ibokkyu.user_id, { real_name: ibokkyu.nickname }, `이복규 real_name = 닉네임으로 복원`);
  }

  // 실명 복구 불가 목록 출력
  const stillMissing = profiles.filter(p => !p.real_name && p.user_id !== '4922126155');
  if (stillMissing.length > 0) {
    console.log('\n  실명 복구 불가 (카카오 원본 없음, 수동 입력 필요):');
    for (const p of stillMissing) {
      console.log(`    ${p.nickname || '(닉네임없음)'} (user_id: ${p.user_id})`);
    }
  }

  // ── 3. 최종 상태 출력 ─────────────────────────────────────────
  const { data: final } = await db.from('profiles').select('nickname, real_name, total_minutes, visit_count').order('total_minutes', { ascending: false });
  console.log('\n[ 복구 후 최종 상태 ]');
  for (const p of (final || [])) {
    console.log(`  ${(p.nickname || '(없음)').padEnd(10)} | 실명: ${(p.real_name || '미복구').padEnd(8)} | 방문: ${p.visit_count || 0}회 | 총이용: ${fmt(p.total_minutes)}`);
  }

  console.log('\n=== 복구 완료 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
