/**
 * 플레이기록·동호회 기록의 「닉네임 클릭 → 읽기전용 보드」가 실제로 몇 개나 열리는지 실측 (읽기전용)
 *
 * 두 화면의 구조가 다르다:
 *   - game-reviews.js  : .pr-tag-who[data-nick] + _nickUserMap(profiles ∪ 기록 recorder) → 이름이 맵에 없으면 조용히 클릭 불가
 *   - club-history.html: 참여자 태그에 data-nick 자체가 없다(핸들러도 없음) → 구조상 100% 불가
 *
 * 그래서 이 스크립트는 game-reviews 쪽 맵 구성을 원문 그대로 재현해
 * 「참여자 태그 N개 중 몇 개가 열리는가」를 센다.
 *
 * 사용: node scripts/audit-nick-click.js [--negctl]
 *   --negctl: 맵을 비워 돌린다. 매칭률이 0%로 떨어지지 않으면 계산기가 고장난 것이다.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const NEG = process.argv.includes('--negctl');

// 키는 SSOT에서 읽는다 (복사해두면 회전 시 조용히 어긋남)
const cfgSrc = fs.readFileSync(path.join(__dirname, '../assets/js/supabase-config.js'), 'utf8');
const window = {};
eval(cfgSrc);
const { url, anonKey } = window.SUPABASE_CONFIG;
const db = createClient(url, anonKey);

(async () => {
  const { data: profiles, error: pErr, count: pCount } = await db
    .from('profiles').select('user_id,nickname', { count: 'exact' });
  if (pErr) { console.error('[profiles]', pErr); process.exit(1); }

  const { data: recs, error: rErr, count: rCount } = await db
    .from('game_play_records')
    .select('id,user_id,nickname,player_names,group_name', { count: 'exact' });
  if (rErr) { console.error('[records]', rErr); process.exit(1); }

  console.log(`profiles ${profiles.length}행 (count=${pCount}) / records ${recs.length}행 (count=${rCount})`);
  if (recs.length === 1000) console.log('🚨 정확히 1000행 — PostgREST max-rows 절단 의심');

  // play-records-utils.js normalizeNick과 같은 규칙 (공백 제거 + 소문자)
  const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase();

  // 🚨 정규화가 서로 다른 회원을 한 사람으로 합치면 엉뚱한 보드가 열린다 — 먼저 센다
  const collide = new Map();
  for (const p of profiles) {
    if (!p.nickname) continue;
    const k = norm(p.nickname);
    if (!collide.has(k)) collide.set(k, []);
    collide.get(k).push(p.nickname);
  }
  const dup = [...collide.values()].filter(v => v.length > 1);
  console.log(dup.length
    ? `🔴 공백 제거 후 겹치는 회원 닉네임 ${dup.length}쌍: ${JSON.stringify(dup)} — 정규화를 쓰면 안 된다`
    : '✅ 공백 제거 후 회원 닉네임 충돌 0쌍 — 정규화해도 사람이 섞이지 않는다');

  // game-reviews.js renderRecords의 맵 구성을 그대로 재현
  const nickMap = new Map();
  if (!NEG) {
    for (const p of profiles) {
      if (p.user_id && p.nickname) nickMap.set(norm(p.nickname), String(p.user_id));
    }
    for (const r of recs) {
      if (r.user_id && r.nickname) nickMap.set(norm(r.nickname), String(r.user_id));
    }
  }
  console.log(`닉네임→userId 맵: ${nickMap.size}개${NEG ? ' (음성 대조군: 비움)' : ''}`);

  // 참여자 태그 = player_names를 쉼표로 쪼갠 것 (game-reviews.js buildSessionBody와 동일)
  let total = 0, hit = 0;
  const missCount = new Map();
  const clubMiss = new Map();
  for (const r of recs) {
    if (!r.player_names) continue;
    for (const raw of r.player_names.split(',')) {
      const t = raw.trim();
      if (!t) continue;
      total++;
      if (nickMap.has(norm(t))) hit++;
      else {
        missCount.set(t, (missCount.get(t) || 0) + 1);
        if (r.group_name === '코티지보드 동호회') clubMiss.set(t, (clubMiss.get(t) || 0) + 1);
      }
    }
  }
  const pct = total ? Math.round(hit / total * 1000) / 10 : 0;
  console.log(`\n참여자 태그 ${total}개 중 클릭 가능 ${hit}개 (${pct}%)`);

  if (missCount.size) {
    console.log(`\n열리지 않는 이름 ${missCount.size}종 (많은 순):`);
    [...missCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
      .forEach(([n, c]) => console.log(`  ${String(c).padStart(3)}회  "${n}"${clubMiss.has(n) ? '  (동호회 기록 포함)' : ''}`));
  }

  // 후기 작성자 = r.user_id가 있어야 클릭 가능
  const withReview = recs.filter(r => r.nickname);
  const reviewerOk = withReview.filter(r => r.user_id).length;
  console.log(`\n기록 작성자 이름 ${withReview.length}건 중 user_id 있음 ${reviewerOk}건 (없으면 클릭 불가)`);

  if (NEG) {
    console.log(`\n${pct === 0 ? '✅ 음성 대조군 통과 — 맵을 비우니 0%다. 계산기가 맵을 실제로 본다.' : '🔴 음성 대조군 실패 — 맵을 비웠는데도 ' + pct + '%다. 아래 본 결과를 믿지 말 것.'}`);
  }
  process.exit(0);
})();
