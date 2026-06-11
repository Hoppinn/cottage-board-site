/**
 * 유저 데이터 전수 분석 스크립트
 * 실행: node game-system/tools/analyze-user-data.js
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
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = db.from(table).select(select).range(from, from + pageSize - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`${table} 조회 실패:`, error.message); return all; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  console.log('=== 유저 데이터 전수 분석 ===\n');

  // 스키마 확인용 — profiles 컬럼 파악
  const { data: sampleRow, error: sErr } = await db.from('profiles').select('*').limit(1);
  if (sErr) {
    console.error('profiles 스키마 조회 실패:', sErr.message);
    process.exit(1);
  }
  if (sampleRow && sampleRow.length > 0) {
    console.log('profiles 컬럼:', Object.keys(sampleRow[0]).join(', '), '\n');
  } else {
    console.log('profiles 테이블 비어있음\n');
  }

  // ── 모든 테이블 fetch ──────────────────────────────────
  const [profiles, sessions, plays, comments] = await Promise.all([
    fetchAll('profiles', '*'),
    fetchAll('page_sessions', 'user_id, duration_sec, entered_at', q => q.not('user_id', 'is', null)),
    fetchAll('game_play_records', 'user_id, nickname, played_at', q => q.not('user_id', 'is', null)),
    fetchAll('game_comments', 'user_id, nickname, created_at', q => q.not('user_id', 'is', null)),
  ]);

  console.log(`profiles: ${profiles.length}명`);
  console.log(`page_sessions: ${sessions.length}건`);
  console.log(`game_play_records: ${plays.length}건`);
  console.log(`game_comments: ${comments.length}건\n`);

  // ── 집계 ──────────────────────────────────────────────
  const sessionTotals = {};
  const sessionEarliest = {};
  for (const s of sessions) {
    sessionTotals[s.user_id] = (sessionTotals[s.user_id] || 0) + (s.duration_sec || 0);
    const t = new Date(s.entered_at).getTime();
    if (!sessionEarliest[s.user_id] || t < sessionEarliest[s.user_id]) {
      sessionEarliest[s.user_id] = t;
    }
  }

  // 닉네임 목격 기록
  const seenNicknames = {};
  for (const r of [...plays, ...comments]) {
    if (!r.user_id || !r.nickname) continue;
    if (!seenNicknames[r.user_id]) seenNicknames[r.user_id] = new Set();
    seenNicknames[r.user_id].add(r.nickname.trim());
  }

  const profileMap = {};
  for (const p of profiles) profileMap[p.user_id] = p;

  // profiles에 없는 user_id
  const allUserIds = new Set([
    ...Object.keys(sessionTotals),
    ...plays.map(r => r.user_id),
    ...comments.map(r => r.user_id),
  ]);
  const orphanIds = [...allUserIds].filter(id => !profileMap[id]);

  if (orphanIds.length > 0) {
    console.log('=== profiles에 없는 user_id (활동 기록은 있음) ===');
    for (const id of orphanIds) {
      const nicks = seenNicknames[id] ? [...seenNicknames[id]].join(', ') : '-';
      const earliest = sessionEarliest[id] ? new Date(sessionEarliest[id]).toLocaleDateString('ko-KR') : '-';
      console.log(`  ${id} | 닉네임: ${nicks} | 세션합계: ${fmt(sessionTotals[id] || 0)} | 최초세션: ${earliest}`);
    }
    console.log();
  }

  // ── profiles 전체 현황 ─────────────────────────────────
  console.log('=== profiles 전체 현황 ===\n');

  const issues = [];

  for (const p of profiles.sort((a, b) => (b.total_minutes || 0) - (a.total_minutes || 0))) {
    const dbTime = p.total_minutes || 0;
    const sesTime = sessionTotals[p.user_id] || 0;
    const diff = sesTime - dbTime;
    const nicks = seenNicknames[p.user_id] ? [...seenNicknames[p.user_id]].join(', ') : '-';

    const flags = [];
    if (!p.nickname) flags.push('닉네임없음');
    if (!p.real_name) flags.push('실명없음');
    if (diff > 60) flags.push(`시간복구(+${fmt(diff)})`);
    if (dbTime === 0 && p.visit_count > 1) flags.push('0분이상해');

    console.log(`[${p.nickname || '(닉네임없음)'}] real_name=${p.real_name || 'null'} | 방문${p.visit_count || 0}회 | DB=${fmt(dbTime)} | 세션합계=${fmt(sesTime)}${diff > 0 ? ` (+${fmt(diff)})` : ''} | 목격닉네임: ${nicks}`);
    if (flags.length) {
      console.log(`  ⚠ ${flags.join(' / ')}`);
      issues.push({ profile: p, sesTime, diff, nicks, flags });
    }
  }

  // ── 이슈 요약 ─────────────────────────────────────────
  console.log('\n=== 수정 필요 요약 ===');
  if (issues.length === 0) {
    console.log('이슈 없음');
  } else {
    for (const { profile: p, sesTime, nicks, flags } of issues) {
      console.log(`\n  [${p.nickname || p.user_id}] ${flags.join(' / ')}`);
      console.log(`    user_id: ${p.user_id}`);
      console.log(`    nickname: ${p.nickname || 'null'} | real_name: ${p.real_name || 'null'}`);
      console.log(`    목격 닉네임: ${nicks}`);
      console.log(`    시간: DB=${fmt(p.total_minutes)} → 세션합계=${fmt(sesTime)}`);
    }
  }

  console.log('\n=== 분석 완료 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
