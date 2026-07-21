/**
 * 뽁님 7/11 게임평 → 호핀 세션에 뽁님 플레이기록 추가 (2026-07-15 요청, 2026-07-22 실행)
 *
 * 「남의 세션에 내 후기로 참여」를 운영자가 대신 수행한다. UI로는 불가능하다 —
 * game-sheet.js의 그 경로는 getKakaoUser() 기준이라 호핀이 누르면 호핀 기록이 생긴다.
 *
 * ⚠️ 원본 game_comments는 **지우지 않는다.** 코멘트 유지가 이 작업의 전제다
 *    (UI의 게임평 연동 경로는 sourceCommentId를 넘겨 원본을 지우지만, 여기선 안 넘긴다).
 *
 * 기본은 드라이런. 실제 삽입은 --commit.
 * 되돌리기: 출력된 id를 delete-from game_play_records 하면 끝(2행).
 *
 * 중복 가드: 같은 (user_id, game_id, played_at) 기록이 이미 있으면 건너뛴다 —
 * 실수로 두 번 돌려도 기록이 겹치지 않는다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { createClient } = require(path.join(ROOT, 'node_modules/@supabase/supabase-js'));

const COMMIT = process.argv.includes('--commit');
const win = {}; global.window = win;
eval(fs.readFileSync(path.join(ROOT, 'assets/js/supabase-config.js'), 'utf8'));
const db = createClient(win.SUPABASE_CONFIG.url, win.SUPABASE_CONFIG.anonKey);

const TARGET_NICK = '뽁';
const PLAYED_AT = '2026-07-11';

(async () => {
  // ① 뽁님 user_id — 닉네임이 아니라 id로 기록을 만들어야 본인 보드에 잡힌다
  const { data: profs, error: pErr } = await db.from('profiles')
    .select('user_id, nickname').eq('nickname', TARGET_NICK);
  if (pErr) { console.error('[profiles]', pErr); process.exit(1); }
  if (profs.length !== 1) {
    console.error(`🔴 닉네임 "${TARGET_NICK}" 프로필이 ${profs.length}건 — 1건이어야 진행한다.`, profs);
    process.exit(1);
  }
  const bbok = profs[0];
  console.log(`대상: ${bbok.nickname} (user_id=${bbok.user_id})\n`);

  // ② 뽁님이 남긴 게임평(코멘트) — 후기 본문의 출처
  const { data: comments, error: cErr } = await db.from('game_comments')
    .select('id, game_key, comment_text, created_at').eq('user_id', bbok.user_id);
  if (cErr) { console.error('[game_comments]', cErr); process.exit(1); }

  // ③ 호핀의 7/11 세션 — 여기에 참여하는 형태로 복사한다
  const { data: sessions, error: sErr } = await db.from('game_play_records')
    .select('id, game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at')
    .eq('played_at', PLAYED_AT);
  if (sErr) { console.error('[game_play_records]', sErr); process.exit(1); }

  // ④ 이미 뽁님 기록이 있는지 (중복 가드)
  const { data: mine, error: mErr } = await db.from('game_play_records')
    .select('id, game_id, played_at').eq('user_id', bbok.user_id);
  if (mErr) { console.error('[game_play_records/mine]', mErr); process.exit(1); }

  // 코멘트의 game_key ↔ 세션의 game_id를 짝짓는다.
  // ⚠️ 둘은 다른 체계일 수 있다(game_key=슬러그, game_id=BGG id) → 게임 데이터로 해석해 맞춘다.
  const games = require(path.join(ROOT, 'game-system/game-data/library/3-output/cottage-games-data-output.json'));
  const idOfKey = key => {
    const g = games[key];
    return g ? String(g.id ?? (g.bgg && g.bgg.id) ?? key) : String(key);
  };
  const keyOfId = id => {
    const hit = Object.entries(games).find(([, v]) => String(v.id) === String(id) || String(v.bgg && v.bgg.id) === String(id));
    return hit ? hit[0] : String(id);
  };

  const plan = [];
  for (const c of comments) {
    const wantId = idOfKey(c.game_key);
    const s = sessions.find(x => String(x.game_id) === wantId || keyOfId(x.game_id) === c.game_key);
    if (!s) { console.log(`  ⏭  "${c.game_key}" — ${PLAYED_AT}에 대응하는 세션이 없어 건너뜀`); continue; }
    if (String(s.user_id) === String(bbok.user_id)) { console.log(`  ⏭  "${c.game_key}" — 본인 세션이라 참여 불필요`); continue; }
    const dup = mine.find(m => String(m.game_id) === String(s.game_id) && m.played_at === s.played_at);
    if (dup) { console.log(`  ⏭  "${c.game_key}" — 이미 뽁님 기록 있음(id=${dup.id})`); continue; }
    plan.push({
      _label: keyOfId(s.game_id),
      _fromComment: c.id,
      game_id: s.game_id,
      user_id: bbok.user_id,
      nickname: bbok.nickname,
      player_count: s.player_count ?? null,
      player_names: s.player_names ?? null,
      play_time_min: null,      // 후기 참여 = 세션 필드만 복사. UI 경로도 시간/점수는 안 넣는다
      score_note: null,
      group_name: s.group_name ?? null,
      played_at: s.played_at,
      photo_url: null,
      review_text: c.comment_text,
    });
  }

  console.log(`\n── 넣을 기록 ${plan.length}건 ──`);
  plan.forEach(p => {
    console.log(`\n  [${p._label}]  (원본 코멘트 id=${p._fromComment} — 이 코멘트는 지우지 않는다)`);
    console.log(`    game_id=${p.game_id} · ${p.group_name} · ${p.played_at} · ${p.player_count}명`);
    console.log(`    참여자: ${p.player_names}`);
    console.log(`    후기: ${String(p.review_text).replace(/\n/g, '\n          ')}`);
  });

  if (!COMMIT) {
    console.log(`\n⚪ 드라이런이다. 실제로 넣으려면 --commit 을 붙일 것.`);
    process.exit(0);
  }
  if (!plan.length) { console.log('\n넣을 게 없다.'); process.exit(0); }

  const rows = plan.map(({ _label, _fromComment, ...r }) => r);
  const { data: ins, error: iErr } = await db.from('game_play_records').insert(rows).select('id, game_id');
  if (iErr) { console.error('[insert]', iErr); process.exit(1); }
  console.log(`\n✅ ${ins.length}건 삽입 — 되돌리려면 아래 id를 지우면 된다`);
  ins.forEach(r => console.log(`   id=${r.id}  (${keyOfId(r.game_id)})`));

  // 사후 확인: 코멘트가 그대로인지 (이 작업의 전제)
  const { count: cAfter } = await db.from('game_comments')
    .select('id', { count: 'exact', head: true }).eq('user_id', bbok.user_id);
  console.log(`\n코멘트 잔존 확인: ${cAfter}건 (작업 전 ${comments.length}건 — 같아야 정상)`);
  process.exit(0);
})();
