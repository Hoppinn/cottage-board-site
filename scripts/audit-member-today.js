// 「관리자 금일이용데이터 간헐 미표시」 — 회원 카드의 「오늘 N분」 칩이 사라지는 조건 실측.
// 읽기 전용 (DB 무변경).
//
//   node scripts/audit-member-today.js [--days N] [--negctl]
//
// 무엇을 보나:
//   관리자 화면의 회원 카드는 `오늘` 칩을 profiles.today_seconds **하나만** 보고 그린다
//   (requests-admin.html, `todayS > 0` 이면 표시 / 0이면 DOM에서 통째로 빠짐).
//   반면 비회원 카드는 2026-07-20부터 page_sessions와 anon_sessions의 **큰 쪽**을 쓴다 —
//   한 경로만 보면 다른 경로에만 잡힌 방문이 0으로 덮여 사라지기 때문이다.
//   회원 경로는 그 수정을 못 받았다. 그래서 여기서 세는 건 딱 하나다:
//
//     "오늘 page_sessions에는 체류가 잡혔는데 profiles.today_seconds로는 0인 회원"
//
//   이 수가 0보다 크면, 그 회원들은 지금 이 순간 관리자 화면에서 「오늘」이 안 보인다.
//   = 「간헐 미표시」의 재현이며, 증상이 뜬 순간을 잡지 않아도 판정할 수 있다.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const OWNER = '4916417947'; // 관리자는 추적 제외 대상이라 집계에서 뺀다
const argIdx = process.argv.indexOf('--days');
const DAYS = argIdx > -1 ? Number(process.argv[argIdx + 1]) : 0; // 0 = 오늘만
const NEGCTL = process.argv.includes('--negctl');

// 화면과 같은 KST 공식 (requests-admin.html _toKstDate / kstDateStr)
const toKstDate = isoStr => new Date(new Date(isoStr).getTime() + 9 * 3600000).toISOString().slice(0, 10);
const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const addDays = (ds, n) => {
  const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const today = kstToday();
  const targetDays = [today];
  for (let i = 1; i <= DAYS; i++) targetDays.push(addDays(today, -i));
  console.log(`KST 기준 대상 날짜: ${targetDays.join(', ')}\n`);

  // ── page_sessions: 대상 날짜의 회원 체류 ──────────────────────────
  const sinceIso = new Date(new Date(targetDays[targetDays.length - 1] + 'T00:00:00Z').getTime() - 9 * 3600000).toISOString();
  const { data: rows, error: rErr } = await db.from('page_sessions')
    .select('user_id, page, duration_sec, entered_at')
    .gte('entered_at', sinceIso)
    .limit(20000);
  if (rErr) { console.error('🔴 page_sessions 조회 실패:', rErr.message); process.exit(1); }
  const { count: psCount } = await db.from('page_sessions')
    .select('*', { count: 'exact', head: true }).gte('entered_at', sinceIso);
  console.log(`page_sessions: 받은 ${rows.length}행 / 실제 ${psCount}행`);
  if (rows.length === 1000) { console.error('🔴 정확히 1000행 — PostgREST max-rows 절단. 결과 신뢰 금지.'); process.exit(1); }
  if (psCount != null && rows.length < psCount) { console.error(`🔴 받은 행이 실제보다 적다(${rows.length} < ${psCount}). 결과 신뢰 금지.`); process.exit(1); }

  // ── profiles ────────────────────────────────────────────────────
  const { data: profs, error: pErr } = await db.from('profiles')
    .select('user_id, nickname, today_date, today_seconds, total_minutes, last_seen_at');
  if (pErr) { console.error('🔴 profiles 조회 실패:', pErr.message); process.exit(1); }
  const { count: prCount } = await db.from('profiles').select('*', { count: 'exact', head: true });
  console.log(`profiles: 받은 ${profs.length}행 / 실제 ${prCount}행\n`);
  if (profs.length !== prCount) { console.error('🔴 profiles 행수 불일치. 결과 신뢰 금지.'); process.exit(1); }

  const profByUid = new Map(profs.map(p => [String(p.user_id), p]));

  // 회원별·날짜별 page_sessions 합
  const psByUidDay = new Map(); // `${uid}|${day}` → sec
  for (const r of rows) {
    if (!r.user_id || String(r.user_id) === OWNER || !r.entered_at) continue;
    const day = toKstDate(r.entered_at);
    if (!targetDays.includes(day)) continue;
    const k = `${r.user_id}|${day}`;
    psByUidDay.set(k, (psByUidDay.get(k) || 0) + (r.duration_sec || 0));
  }

  // 화면이 「오늘」로 인정하는 값 (현재 코드): today_date가 오늘일 때만 today_seconds
  const screenToday = p => (p.today_date === today ? (p.today_seconds || 0) : 0);

  let mismatches = [];
  for (const [k, psSec] of psByUidDay) {
    const [uid, day] = k.split('|');
    if (day !== today) continue; // 화면의 「오늘」 칩은 오늘만 따진다
    const p = profByUid.get(String(uid));
    if (!p) { mismatches.push({ uid, nick: '(profiles에 없음)', psSec, profSec: 0, why: 'profiles 행 없음' }); continue; }
    let profSec = screenToday(p);
    if (NEGCTL && mismatches.length === 0 && psSec > 0 && profSec > 0) {
      profSec = 0; // 음성 대조군: 정상인 한 명을 일부러 0으로 만든다 → 불일치가 1건 늘어야 한다
      mismatches.push({ uid, nick: (p.nickname || '') + ' ⟵ negctl로 조작', psSec, profSec, why: '[negctl]' });
      continue;
    }
    if (psSec > 0 && profSec === 0) {
      mismatches.push({
        uid, nick: p.nickname || '(닉네임없음)', psSec, profSec,
        why: p.today_date !== today ? `today_date=${p.today_date || 'null'} (오늘 아님)` : 'today_seconds=0',
      });
    }
  }

  // 0으로 사라지는 경우만이 아니라 **얼마나 어긋나는지**도 본다.
  // 화면이 한 경로만 보므로, page_sessions 쪽이 더 크면 그만큼 과소 표시되고 있는 것이다.
  console.log('--- 오늘 회원별: 화면 표시(profiles) vs page_sessions 합 ---');
  for (const [k, psSec] of psByUidDay) {
    const [uid, day] = k.split('|');
    if (day !== today) continue;
    const p = profByUid.get(String(uid));
    const profSec = p ? screenToday(p) : 0;
    const bigger = psSec > profSec ? 'page_sessions가 큼' : psSec < profSec ? 'profiles가 큼' : '같음';
    console.log(`  ${(p?.nickname || uid).padEnd(12)} 화면 ${String(profSec).padStart(6)}초 / PS ${String(psSec).padStart(6)}초  → ${bigger}`);
  }
  console.log('');

  const todayMembers = [...psByUidDay.keys()].filter(k => k.endsWith('|' + today)).length;
  console.log(`오늘 page_sessions에 체류가 잡힌 회원: ${todayMembers}명`);
  console.log(`그중 화면에 「오늘」이 안 뜨는 회원: ${mismatches.length}명\n`);
  mismatches.forEach(m => {
    console.log(`  🔴 ${m.nick} (${m.uid})`);
    console.log(`     page_sessions ${m.psSec}초  vs  화면 표시 ${m.profSec}초  — ${m.why}`);
  });

  if (todayMembers === 0) {
    console.log('⚠️ 오늘 회원 체류 자체가 0건이다 — 이 실행은 아무것도 판정하지 못한다.');
    console.log('   회원이 접속한 날 다시 돌리거나 --days N 으로 범위를 넓혀 볼 것.');
    console.log('   (「0건」은 발견이 아니라 질문이다 — CLAUDE.md)');
  } else {
    console.log(mismatches.length === 0
      ? '✅ 오늘 기준 불일치 없음 — 이 가설로는 재현되지 않았다.'
      : '🔴 재현됨 — 회원 카드가 page_sessions를 안 보기 때문에 생기는 누락이다.');
  }

  // 참고: 며칠치 분포 (오늘 표본이 작을 때 규모 감각용)
  if (DAYS > 0) {
    console.log('\n--- 참고: 날짜별 회원 체류 건수 (page_sessions 기준) ---');
    const byDay = {};
    for (const k of psByUidDay.keys()) { const d = k.split('|')[1]; byDay[d] = (byDay[d] || 0) + 1; }
    targetDays.forEach(d => console.log(`  ${d}: ${byDay[d] || 0}명`));
  }

  process.exit(0); // supabase 타이머가 이벤트루프를 잡는다
})();
