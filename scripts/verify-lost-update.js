// #22 재현 — profiles의 read-modify-write가 동시 쓰기에서 증가분을 잃는지 실측.
//
//   node scripts/verify-lost-update.js [동시성]        기본 30
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
const UID = `__racetest_${Date.now()}`;

// 운영 코드(_syncTimeToDBNow)와 같은 형태의 비원자적 증가
async function rmwIncrement(uid, by = 1) {
  const { data, error: selErr } = await db.from('profiles')
    .select('total_minutes').eq('user_id', uid).maybeSingle();
  if (selErr || !data) return { ok: false, err: selErr?.message || 'no row' };
  const { error: updErr } = await db.from('profiles')
    .update({ total_minutes: (data.total_minutes || 0) + by }).eq('user_id', uid);
  return updErr ? { ok: false, err: updErr.message } : { ok: true };
}

const read = async uid => {
  const { data } = await db.from('profiles').select('total_minutes').eq('user_id', uid).maybeSingle();
  return data?.total_minutes ?? null;
};
const reset = async uid => db.from('profiles').update({ total_minutes: 0 }).eq('user_id', uid);

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
    for (let i = 0; i < N; i++) await rmwIncrement(UID);
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
      const res = await Promise.all(Array.from({ length: N }, () => rmwIncrement(UID)));
      const failed = res.filter(x => !x.ok);
      const got = await read(UID);
      const lost = N - got - failed.length;
      totLost += lost;
      console.log(`[동시 ${N}] 라운드 ${r}: 기대 ${N} · 실제 ${got} · 손실 ${lost}` +
        ` (${(lost / N * 100).toFixed(0)}%)${failed.length ? ` · 요청실패 ${failed.length}` : ''}`);
    }
    const avg = totLost / rounds;
    console.log(`\n평균 손실 ${avg.toFixed(1)}/${N}회 (${(avg / N * 100).toFixed(0)}%)`);
    console.log(avg > 0
      ? '→ ✅ #22 재현됨: 동시 read-modify-write에서 증가분이 실제로 사라진다.'
      : '→ ❌ 손실 0 — 이 동시성 수준에선 재현 안 됨. 동시성을 올리거나 가설을 재검토할 것.');
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
