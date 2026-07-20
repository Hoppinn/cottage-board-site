// #22 재현 — profiles의 read-modify-write가 동시 쓰기에서 증가분을 잃는지 실측.
//
//   node scripts/verify-lost-update.js [동시성]        기본 30 — 옛 방식(비원자) 재현
//   node scripts/verify-lost-update.js [동시성] --rpc  마이그레이션 012 RPC로 같은 실험
//
// before/after 대조가 이 스크립트의 목적이다. 같은 동시성에서
//   기본  → 손실 발생(수정 전 재현)
//   --rpc → 손실 0     (수정 검증)
// 이어야 한다.
//
// ⚠️ **운영 DB에 임시 행을 1개 만든다** (verify-notif-read.js와 같은 방식).
//    user_id = `__racetest_<epoch>` 이고 finally에서 삭제하며, 마지막에 삭제를 재확인한다.
//    스크립트가 죽어 행이 남으면 아래 SQL로 정리:
//      delete from profiles where user_id like '__racetest_%';
//    ※ 이 행은 page_sessions가 없어 분석 화면에 실질적 영향이 없고, 창은 수십 초다.
//
// 무엇을 보나: _syncTimeToDBNow는 select(total_minutes) → 계산 → update 형태다.
//   원자적이면 N번 증가 후 값이 정확히 N이어야 한다. 덜 나오면 그 차이가 lost update다.
// 음성 대조군: 같은 증가를 **순차**로도 돌린다. 순차가 N이 아니면 DB가 아니라
//   이 검사기가 고장 난 것이므로 결과를 신뢰하면 안 된다.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const N = parseInt(process.argv[2] || '30', 10);
const USE_RPC = process.argv.includes('--rpc');
const UID = `__racetest_${Date.now()}`;

// (수정 전) 옛 코드와 같은 형태의 비원자적 증가
async function rmwIncrement(uid, by = 1) {
  const { data, error: selErr } = await db.from('profiles')
    .select('total_minutes').eq('user_id', uid).maybeSingle();
  if (selErr || !data) return { ok: false, err: selErr?.message || 'no row' };
  const { error: updErr } = await db.from('profiles')
    .update({ total_minutes: (data.total_minutes || 0) + by }).eq('user_id', uid);
  return updErr ? { ok: false, err: updErr.message } : { ok: true };
}

// (수정 후) 마이그레이션 012의 원자적 증가
async function rpcIncrement(uid, by = 1) {
  const { data, error } = await db.rpc('increment_profile_counters', {
    p_user_id: uid, p_secs: by, p_today: null, p_bump_visit: false,
  });
  if (error) return { ok: false, err: error.message };
  if (!data || !data.length) return { ok: false, err: 'no row' };
  return { ok: true };
}

const increment = USE_RPC ? rpcIncrement : rmwIncrement;

// ⚠️ error를 반드시 받는다 — RLS 차단·컬럼 오타·권한 만료는 예외가 아니라
//    { data: null, error }로 온다. 여기서 삼키면 손실률이 조용히 "측정 불가"가 아니라
//    "0" 또는 "100%"로 나와 실험 결과 자체가 거짓이 된다.
//    (2026-07-20: 일회성 조회 스크립트가 HTTP 401을 "RPC 없음"으로 오독한 직후 점검해 발견)
const read = async uid => {
  const { data, error } = await db.from('profiles').select('total_minutes').eq('user_id', uid).maybeSingle();
  if (error) { console.error('[read] 조회 실패 — 아래 수치를 신뢰하지 말 것', error); return null; }
  return data?.total_minutes ?? null;
};
const reset = async uid => {
  const { error } = await db.from('profiles').update({ total_minutes: 0 }).eq('user_id', uid);
  if (error) console.error('[reset] 초기화 실패 — 라운드 시작값이 0이 아니다', error);
};

(async () => {
  let created = false;
  try {
    const { count: dup } = await db.from('profiles')
      .select('*', { count: 'exact', head: true }).eq('user_id', UID);
    if (dup) { console.log('❌ 같은 user_id가 이미 있다 — 중단'); return; }

    const { error: insErr } = await db.from('profiles')
      .insert({ user_id: UID, nickname: '__racetest__', total_minutes: 0 });
    if (insErr) { console.log('❌ 임시 행 생성 실패:', insErr.message); return; }
    created = true;
    console.log(`임시 행 생성: ${UID}\n`);

    // ── 음성 대조군: 순차 증가 ──
    await reset(UID);
    for (let i = 0; i < N; i++) await increment(UID);
    const seq = await read(UID);
    console.log(`[음성 대조군] 순차 ${N}회 → ${seq}`);
    if (seq !== N) {
      console.log(`  ❌ 순차인데도 ${N}이 아니다 → 검사기/네트워크 문제. 아래 결과를 신뢰하지 말 것.`);
      return;
    }
    console.log(`  ✅ 정확히 ${N} — 검사기는 정상. 아래 손실은 동시성 탓으로 읽을 수 있다.\n`);

    // ── 본 실험: 동시 증가 ──
    const rounds = 3;
    let totLost = 0;
    for (let r = 1; r <= rounds; r++) {
      await reset(UID);
      const res = await Promise.all(Array.from({ length: N }, () => increment(UID)));
      const failed = res.filter(x => !x.ok);
      const got = await read(UID);
      const lost = N - got - failed.length;
      totLost += lost;
      console.log(`[동시 ${N}] 라운드 ${r}: 기대 ${N} · 실제 ${got} · 손실 ${lost}` +
        ` (${(lost / N * 100).toFixed(0)}%)${failed.length ? ` · 요청실패 ${failed.length}` : ''}`);
    }
    const avg = totLost / rounds;
    console.log(`\n평균 손실 ${avg.toFixed(1)}/${N}회 (${(avg / N * 100).toFixed(0)}%)`);
    // 판정 방향이 모드에 따라 **반대**다 — 옛 방식은 손실이 나야 재현 성공,
    // RPC는 손실이 0이어야 수정 성공. 한쪽 문구를 그대로 쓰면 결과를 거꾸로 읽는다.
    if (USE_RPC) {
      console.log(avg === 0
        ? '→ ✅ 수정 검증 통과: 원자적 증가라 동시 실행에도 손실이 없다.'
        : `→ ❌ RPC인데도 손실 ${avg.toFixed(1)} — 012가 안 올라갔거나 함수가 원자적이지 않다.`);
    } else {
      console.log(avg > 0
        ? '→ ✅ #22 재현됨: 동시 read-modify-write에서 증가분이 실제로 사라진다.'
        : '→ ❌ 손실 0 — 이 동시성 수준에선 재현 안 됨. 동시성을 올리거나 가설을 재검토할 것.');
    }
  } finally {
    if (created) {
      const { error } = await db.from('profiles').delete().eq('user_id', UID);
      const { count } = await db.from('profiles')
        .select('*', { count: 'exact', head: true }).eq('user_id', UID);
      console.log(`\n임시 행 삭제: ${error ? '❌ ' + error.message : '✅'} · 삭제 후 잔여 ${count}행`);
      if (count) console.log(`🚨 수동 정리 필요: delete from profiles where user_id = '${UID}';`);
    }
  }
})();
