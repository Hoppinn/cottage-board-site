/**
 * 호핀(user_id = 4916417947) 이용시간 DB 조사
 */

const SUPABASE_URL = 'https://fqddfvprknwcgojwfrbs.supabase.co';
const ANON_KEY     = 'sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl';

const HOPPIN_UID = '4916417947';

async function q(path, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params ? '?' + params : ''}`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json();
}

function fmtTime(s) {
  if (!s) return '0초';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}시간 ${m}분` : m > 0 ? `${m}분 ${sec}초` : `${sec}초`;
}

(async () => {
  try {
    // ── 1. profiles ──────────────────────────────────────────────
    console.log('\n══════════════ profiles ══════════════');
    const profiles = await q('profiles', `user_id=eq.${HOPPIN_UID}&select=total_minutes,today_seconds,today_date,last_seen_at,visit_count`);
    if (!profiles.length) {
      console.log('profiles 레코드 없음');
    } else {
      const p = profiles[0];
      console.log(`total_minutes  : ${p.total_minutes} 초 → ${fmtTime(p.total_minutes)}`);
      console.log(`today_seconds  : ${p.today_seconds} 초 → ${fmtTime(p.today_seconds)}`);
      console.log(`today_date     : ${p.today_date}`);
      console.log(`last_seen_at   : ${p.last_seen_at}`);
      console.log(`visit_count    : ${p.visit_count}`);
    }

    // ── 2. page_sessions 전체 집계 ───────────────────────────────
    console.log('\n══════════ page_sessions 전체 집계 ══════════');
    // limit 높게 해서 전량 조회 (최대 10000)
    const rows = await q('page_sessions', `user_id=eq.${HOPPIN_UID}&select=entered_at,duration_sec&order=entered_at.asc&limit=10000`);
    if (!rows.length) {
      console.log('page_sessions 레코드 없음');
      return;
    }

    const total = rows.reduce((s, r) => s + (r.duration_sec || 0), 0);
    console.log(`레코드 수       : ${rows.length}건`);
    console.log(`가장 오래된 기록: ${rows[0].entered_at}`);
    console.log(`가장 최근 기록  : ${rows[rows.length - 1].entered_at}`);
    console.log(`duration_sec 총합: ${total}초 → ${fmtTime(total)}`);

    // ── 3. 일자별 합계 ───────────────────────────────────────────
    console.log('\n══════ 일자별 duration_sec 합계 (상위 20일) ══════');
    const dayMap = new Map();
    for (const r of rows) {
      if (!r.entered_at) continue;
      // KST 날짜 (UTC+9)
      const kst = new Date(new Date(r.entered_at).getTime() + 9 * 3600000);
      const day = kst.toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + (r.duration_sec || 0));
    }
    const sorted = [...dayMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [day, secs] of sorted) {
      console.log(`  ${day}  ${String(secs).padStart(7)}초  ${fmtTime(secs)}`);
    }

    // ── 4. 중복 삽입 분석 ────────────────────────────────────────
    console.log('\n══════ 중복 삽입 의심 분석 ══════');
    // 같은 entered_at, 같은 page, 같은 duration_sec 중복 확인
    const rowsFull = await q('page_sessions', `user_id=eq.${HOPPIN_UID}&select=entered_at,page,duration_sec&order=entered_at.asc&limit=10000`);
    const seen = new Map();
    let dupCount = 0;
    let dupSecs = 0;
    for (const r of rowsFull) {
      const key = `${r.entered_at}|${r.page}|${r.duration_sec}`;
      if (seen.has(key)) {
        dupCount++;
        dupSecs += r.duration_sec || 0;
        if (dupCount <= 5) console.log(`  dup: ${r.entered_at} / ${r.page} / ${r.duration_sec}초`);
      }
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    if (dupCount === 0) {
      console.log('  정확히 일치하는 중복 없음');
    } else {
      console.log(`  ⚠ 중복 ${dupCount}건, 합계 ${dupSecs}초 (${fmtTime(dupSecs)})`);
    }

    // ── 5. 비정상적으로 큰 duration_sec 탐지 ────────────────────
    console.log('\n══════ 이상값 (duration_sec > 3600초=1시간) ══════');
    const outliers = rowsFull.filter(r => (r.duration_sec || 0) > 3600);
    if (!outliers.length) {
      console.log('  이상값 없음');
    } else {
      console.log(`  ${outliers.length}건`);
      for (const r of outliers.slice(0, 10)) {
        console.log(`  ${r.entered_at} / ${r.page} / ${r.duration_sec}초 = ${fmtTime(r.duration_sec)}`);
      }
    }

    // ── 6. 하루 합계가 실제 하루(86400초)를 넘는 날 ────────────
    console.log('\n══════ 하루 합계 > 4시간 인 날 ══════');
    for (const [day, secs] of dayMap) {
      if (secs > 14400) console.log(`  ${day}: ${secs}초 = ${fmtTime(secs)}`);
    }

  } catch (e) {
    console.error('오류:', e.message);
  }
})();
