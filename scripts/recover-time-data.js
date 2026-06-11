/**
 * 이용시간 데이터 복구 스크립트
 *
 * page_sessions 테이블에 저장된 세션 기록을 합산해서
 * profiles.total_minutes가 더 작으면 복구한다.
 *
 * 실행: node game-system/tools/recover-time-data.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fqddfvprknwcgojwfrbs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== 이용시간 복구 시작 ===\n');

  // 1. page_sessions에서 유저별 총 시간 합산
  const { data: sessions, error: sessErr } = await db
    .from('page_sessions')
    .select('user_id, duration_sec')
    .not('user_id', 'is', null);

  if (sessErr) {
    console.error('page_sessions 조회 실패:', sessErr.message);
    process.exit(1);
  }

  // user_id별 합산
  const sessionTotals = {};
  for (const row of sessions) {
    if (!row.user_id) continue;
    sessionTotals[row.user_id] = (sessionTotals[row.user_id] || 0) + (row.duration_sec || 0);
  }

  console.log(`page_sessions 기록 수: ${sessions.length}건`);
  console.log(`기록 있는 유저 수: ${Object.keys(sessionTotals).length}명\n`);

  // 2. 현재 profiles 조회
  const { data: profiles, error: profErr } = await db
    .from('profiles')
    .select('user_id, nickname, total_minutes');

  if (profErr) {
    console.error('profiles 조회 실패:', profErr.message);
    process.exit(1);
  }

  // 3. 비교 후 복구 필요 목록 추출
  const toUpdate = [];
  for (const profile of profiles) {
    const sessionTotal = sessionTotals[profile.user_id] || 0;
    const dbTotal = profile.total_minutes || 0;
    if (sessionTotal > dbTotal) {
      toUpdate.push({
        user_id: profile.user_id,
        nickname: profile.nickname,
        current: dbTotal,
        recovered: sessionTotal,
        diff: sessionTotal - dbTotal,
      });
    }
  }

  // page_sessions에 있지만 profiles에 없는 유저 (비정상 케이스)
  const profileIds = new Set(profiles.map(p => p.user_id));
  for (const [userId, total] of Object.entries(sessionTotals)) {
    if (!profileIds.has(userId)) {
      console.warn(`⚠ profiles에 없는 user_id: ${userId} (${total}초)`);
    }
  }

  if (toUpdate.length === 0) {
    console.log('복구 대상 없음 — profiles가 page_sessions보다 크거나 같습니다.');
    return;
  }

  console.log('=== 복구 대상 ===');
  for (const u of toUpdate) {
    const fmt = s => s >= 3600
      ? `${Math.floor(s/3600)}시간 ${Math.floor((s%3600)/60)}분`
      : `${Math.floor(s/60)}분 ${s%60}초`;
    console.log(`  ${u.nickname || u.user_id}: ${fmt(u.current)} → ${fmt(u.recovered)} (+${fmt(u.diff)})`);
  }
  console.log();

  // 4. 복구 실행
  let successCount = 0;
  for (const u of toUpdate) {
    const { error } = await db
      .from('profiles')
      .update({ total_minutes: u.recovered })
      .eq('user_id', u.user_id);

    if (error) {
      console.error(`  ✗ ${u.nickname || u.user_id} 업데이트 실패:`, error.message);
    } else {
      console.log(`  ✓ ${u.nickname || u.user_id} 복구 완료`);
      successCount++;
    }
  }

  console.log(`\n=== 완료: ${successCount}/${toUpdate.length}명 복구 ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
