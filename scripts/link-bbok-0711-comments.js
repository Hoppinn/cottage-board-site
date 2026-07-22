/**
 * 뽁님 7/11 게임평(game_comments)을 호핀의 7/11 플레이기록에 매단다 (P1, 2026-07-22).
 *
 * 이전 접근(link-bbok-0711-records.js: 남의 세션에 새 기록 삽입)은 되돌렸다 —
 * 같은 게임이 두 번 뜨고 원본이 「(2번째 플레이)」로 밀렸다. 이번엔 새 기록을 만들지 않고
 * 마이그레이션 014로 추가된 game_comments.record_id를 채워, 뽁님 게임평이 호핀 기록 아래
 * 표시되게만 한다. 원본 코멘트는 지우지 않는다(record_id만 세팅).
 *
 * 🚨 선행: 운영 DB에 마이그레이션 014(game_comments.record_id)가 적용돼 있어야 --commit 가능.
 *          컬럼이 없으면 UPDATE가 실패한다(드라이런은 컬럼 없이도 계획을 보여준다).
 *
 * 기본 드라이런. 실제 반영은 --commit. 되돌리기: --undo (--commit)로 record_id를 NULL로.
 * 멱등: 이미 그 record_id면 건너뛴다(두 번 돌려도 안전).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { createClient } = require(path.join(ROOT, 'node_modules/@supabase/supabase-js'));

const COMMIT = process.argv.includes('--commit');
const UNDO = process.argv.includes('--undo');

const win = {}; global.window = win;
eval(fs.readFileSync(path.join(ROOT, 'assets/js/supabase-config.js'), 'utf8'));
const db = createClient(win.SUPABASE_CONFIG.url, win.SUPABASE_CONFIG.anonKey);

const TARGET_NICK = '뽁';
const PLAYED_AT = '2026-07-11';

(async () => {
  // ① 뽁님 프로필 — user_id로 코멘트를 특정한다
  const { data: profs, error: pErr } = await db.from('profiles')
    .select('user_id, nickname').eq('nickname', TARGET_NICK);
  if (pErr) { console.error('[profiles]', pErr); process.exit(1); }
  if (profs.length !== 1) {
    console.error(`🔴 닉네임 "${TARGET_NICK}" 프로필이 ${profs.length}건 — 1건이어야 진행한다.`, profs);
    process.exit(1);
  }
  const bbok = profs[0];
  console.log(`대상: ${bbok.nickname} (user_id=${bbok.user_id})\n`);

  // ② 뽁님 게임평 (record_id도 읽어본다 — 컬럼 없으면 여기서 에러로 「014 미적용」이 드러난다)
  const { data: comments, error: cErr } = await db.from('game_comments')
    .select('id, game_key, comment_text, record_id, created_at').eq('user_id', bbok.user_id);
  if (cErr) {
    console.error('[game_comments]', cErr);
    console.error('🔴 record_id 컬럼이 없을 수 있다 — 마이그레이션 014를 먼저 적용할 것.');
    process.exit(1);
  }
  console.log(`뽁님 게임평 ${comments.length}건`);

  if (UNDO) {
    const linked = comments.filter(c => c.record_id != null);
    console.log(`\n── 되돌릴(record_id→NULL) 대상 ${linked.length}건 ──`);
    linked.forEach(c => console.log(`  코멘트 id=${c.id} · "${c.game_key}" · record_id=${c.record_id}`));
    if (!COMMIT) { console.log('\n⚪ 드라이런. 실제로 되돌리려면 --undo --commit'); process.exit(0); }
    for (const c of linked) {
      const { error } = await db.from('game_comments').update({ record_id: null }).eq('id', c.id);
      if (error) { console.error(`[undo/update id=${c.id}]`, error); process.exit(1); }
    }
    console.log(`\n✅ ${linked.length}건 record_id 해제`);
    process.exit(0);
  }

  // ③ 7/11 플레이기록 전부 — 뽁님이 아닌 사람(호핀)의 기록에 매단다
  const { data: recs, error: sErr } = await db.from('game_play_records')
    .select('id, game_id, user_id, nickname, played_at').eq('played_at', PLAYED_AT);
  if (sErr) { console.error('[game_play_records]', sErr); process.exit(1); }

  // 코멘트 game_key ↔ 기록 game_id 짝짓기 (다른 체계일 수 있어 게임 데이터로 해석)
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
    // 그 게임의 7/11 기록 중 뽁님이 아닌 것(호핀). 여럿이면 첫 번째.
    const target = recs.find(r =>
      (String(r.game_id) === wantId || keyOfId(r.game_id) === c.game_key) &&
      String(r.user_id) !== String(bbok.user_id));
    if (!target) { console.log(`  ⏭  "${c.game_key}" — 7/11에 매달 남의 기록이 없어 건너뜀`); continue; }
    if (String(c.record_id) === String(target.id)) { console.log(`  ⏭  "${c.game_key}" — 이미 그 기록에 매여 있음(record_id=${target.id})`); continue; }
    plan.push({ commentId: c.id, gameKey: c.game_key, targetId: target.id, targetNick: target.nickname, text: c.comment_text });
  }

  console.log(`\n── 매달 게임평 ${plan.length}건 ──`);
  plan.forEach(p => {
    console.log(`\n  "${p.gameKey}" 코멘트(id=${p.commentId}) → 기록 id=${p.targetId} (${p.targetNick}의 7/11 기록)`);
    console.log(`    게임평: ${String(p.text).replace(/\n/g, '\n           ')}`);
  });

  if (!COMMIT) { console.log(`\n⚪ 드라이런. 실제로 매달려면 --commit (마이그레이션 014 선행 필수).`); process.exit(0); }
  if (!plan.length) { console.log('\n매달 게 없다.'); process.exit(0); }

  for (const p of plan) {
    const { error } = await db.from('game_comments').update({ record_id: String(p.targetId) }).eq('id', p.commentId);
    if (error) { console.error(`[update id=${p.commentId}]`, error); process.exit(1); }
  }

  // 사후 확인: 코멘트 개수 불변(지운 적 없음) + record_id 세팅됨
  const { data: after, error: aErr } = await db.from('game_comments')
    .select('id, record_id').eq('user_id', bbok.user_id);
  if (aErr) { console.error('[after]', aErr); process.exit(1); }
  const set = after.filter(c => c.record_id != null).length;
  console.log(`\n✅ ${plan.length}건 매닮. 뽁님 코멘트 총 ${after.length}건(불변) 중 record_id 세팅 ${set}건.`);
  process.exit(0);
})();
