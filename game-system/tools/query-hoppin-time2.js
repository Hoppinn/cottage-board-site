/**
 * page_sessions 추가 분석 — API limit 확인, 최신 레코드, INSERT 테스트
 */
const SUPABASE_URL = 'https://fqddfvprknwcgojwfrbs.supabase.co';
const ANON_KEY     = 'sb_publishable_gPxHQyp4fG7l3YBrCVUWJw_2-mBnNpl';
const HOPPIN_UID   = '4916417947';

async function q(path, params = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params ? '?' + params : ''}`;
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    Accept: 'application/json',
    Prefer: 'return=representation',
  };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  const txt = await res.text();
  return { status: res.status, ok: res.ok, text: txt };
}

(async () => {
  // 1. 실제 총 레코드 수 (HEAD 요청으로 count)
  console.log('\n== 1. 실제 총 레코드 수 (Prefer: count=exact) ==');
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/page_sessions?user_id=eq.${HOPPIN_UID}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: 'count=exact',
      Accept: 'application/json',
    },
  });
  const contentRange = countRes.headers.get('content-range');
  console.log('Content-Range:', contentRange); // e.g. "0-999/2345"

  // 2. 최신 레코드 10개 (desc)
  console.log('\n== 2. 가장 최근 page_sessions 10건 ==');
  const recent = await q('page_sessions', `user_id=eq.${HOPPIN_UID}&select=entered_at,page,duration_sec&order=entered_at.desc&limit=10`);
  console.log(recent.status, recent.text.substring(0, 1000));

  // 3. page_sessions 전체 user 통계 (user 수, total 레코드)
  console.log('\n== 3. page_sessions 전체 테이블 통계 ==');
  const allCount = await fetch(`${SUPABASE_URL}/rest/v1/page_sessions`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: 'count=exact',
      Accept: 'application/json',
    },
  });
  console.log('전체 Content-Range:', allCount.headers.get('content-range'));

  // 4. INSERT 테스트 — RLS 통과 여부 확인
  console.log('\n== 4. INSERT 테스트 (RLS 통과 여부) ==');
  const ins = await q('page_sessions', '', 'POST', {
    page: 'rls_test',
    user_id: HOPPIN_UID,
    duration_sec: 1,
    entered_at: new Date().toISOString(),
  });
  console.log('INSERT 응답 status:', ins.status);
  console.log('INSERT 응답 body:', ins.text.substring(0, 300));

  // 5. 만약 INSERT 성공했으면 해당 레코드 삭제
  if (ins.ok) {
    const del = await q('page_sessions', `page=eq.rls_test&user_id=eq.${HOPPIN_UID}&duration_sec=eq.1`, 'DELETE');
    console.log('테스트 레코드 삭제:', del.status);
  }

  // 6. profiles 마지막 갱신 이후로 page_sessions에 새 레코드가 있는지
  console.log('\n== 6. 2026-06-09 이후 page_sessions 레코드 ==');
  const after = await q('page_sessions', `user_id=eq.${HOPPIN_UID}&entered_at=gt.2026-06-08T00:00:00Z&select=entered_at,page,duration_sec&order=entered_at.desc&limit=20`);
  console.log(after.status, after.text.substring(0, 500));
})();
