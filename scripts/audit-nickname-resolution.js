/**
 * 닉네임 공백 보정의 운영 영향 읽기 전용 감사.
 * 사용: node scripts/audit-nickname-resolution.js
 * profiles / game_play_records / user_achievements만 SELECT하며 쓰기 요청은 하지 않는다.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const cfgSource = fs.readFileSync(path.join(__dirname, '../assets/js/supabase-config.js'), 'utf8');
const window = {};
eval(cfgSource);
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const PLAY_THRESHOLDS = [5, 10, 20, 30, 50, 100, 150, 200, 300, 400, 500];
const BALANCE_THRESHOLDS = [10, 30, 50, 100, 200, 300];

function normalize(value) {
  return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}

function rawTokenEqual(token, nickname) {
  return String(token ?? '').trim().toLowerCase() === String(nickname ?? '').trim().toLowerCase();
}

function tokens(playerNames) {
  return String(playerNames || '').split(',').map(v => v.trim()).filter(Boolean);
}

function recordDate(row) {
  if (row.played_at) return row.played_at;
  const date = new Date(row.created_at);
  date.setHours(date.getHours() + 9);
  return date.toISOString().slice(0, 10);
}

function buildResolver(profiles) {
  const membersByKey = new Map();
  for (const profile of profiles) {
    const key = normalize(profile.nickname);
    if (!profile.user_id || !key) continue;
    if (!membersByKey.has(key)) membersByKey.set(key, new Map());
    membersByKey.get(key).set(String(profile.user_id), profile.nickname);
  }
  return {
    resolve(token) {
      const matched = membersByKey.get(normalize(token));
      if (!matched || matched.size !== 1) return null;
      const [userId, nickname] = matched.entries().next().value;
      return { userId, nickname };
    },
    isUniqueFor(profile) {
      const resolved = this.resolve(profile.nickname);
      return resolved?.userId === String(profile.user_id);
    },
    collisionCount: [...membersByKey.values()].filter(m => m.size > 1).length,
  };
}

function crossedThresholds(before, after, thresholds, prefix, ownedIds) {
  return thresholds
    .filter(threshold => before < threshold && after >= threshold)
    .map(threshold => `${prefix}_${threshold}`)
    .filter(id => !ownedIds.has(id));
}

(async () => {
  const [profileRes, recordRes, achievementRes] = await Promise.all([
    db.from('profiles').select('user_id,nickname'),
    db.from('game_play_records').select('id,user_id,player_names,played_at,created_at'),
    db.from('user_achievements').select('user_id,achievement_id'),
  ]);
  for (const [name, result] of [['profiles', profileRes], ['game_play_records', recordRes], ['user_achievements', achievementRes]]) {
    if (result.error) throw new Error(`${name}: ${result.error.message || result.error.code || 'query failed'}`);
  }

  const profiles = profileRes.data || [];
  const records = recordRes.data || [];
  const resolver = buildResolver(profiles);
  const ownedByUser = new Map();
  for (const row of achievementRes.data || []) {
    const userId = String(row.user_id);
    if (!ownedByUser.has(userId)) ownedByUser.set(userId, new Set());
    ownedByUser.get(userId).add(row.achievement_id);
  }

  const changed = [];
  for (const profile of profiles) {
    const userId = String(profile.user_id);
    const nickname = profile.nickname || '';
    if (!nickname) continue;
    const unique = resolver.isUniqueFor(profile);
    const beforeParticipant = records.filter(row => String(row.player_names || '').toLowerCase().includes(String(nickname).toLowerCase()));
    const afterParticipant = records.filter(row => tokens(row.player_names).some(token => {
      const resolved = resolver.resolve(token);
      return unique ? resolved?.userId === userId : rawTokenEqual(token, nickname);
    }));
    const beforeDays = new Set(records
      .filter(row => String(row.user_id) === userId || beforeParticipant.includes(row))
      .map(recordDate));
    const afterDays = new Set(records
      .filter(row => String(row.user_id) === userId || afterParticipant.includes(row))
      .map(recordDate));
    if (beforeParticipant.length === afterParticipant.length && beforeDays.size === afterDays.size) continue;
    const owned = ownedByUser.get(userId) || new Set();
    changed.push({
      userId,
      nickname,
      mode: unique ? 'normalized-unique' : 'raw-fallback',
      play: `${beforeParticipant.length} -> ${afterParticipant.length}`,
      uniqueDays: `${beforeDays.size} -> ${afterDays.size}`,
      newAchievements: [
        ...crossedThresholds(beforeParticipant.length, afterParticipant.length, PLAY_THRESHOLDS, 'play', owned),
        ...crossedThresholds(beforeDays.size, afterDays.size, BALANCE_THRESHOLDS, 'balance', owned),
      ],
    });
  }

  console.log(`profiles=${profiles.length} records=${records.length} nickname-key-collisions=${resolver.collisionCount}`);
  if (!changed.length) console.log('No count changes under the proposed resolver.');
  for (const row of changed) {
    console.log(`${row.nickname} (${row.userId}) [${row.mode}] play ${row.play}; unique-day ${row.uniqueDays}; new-thresholds ${row.newAchievements.join(', ') || 'none'}`);
  }
  process.exit(0);
})().catch(error => { console.error('[audit-nickname-resolution]', error); process.exit(1); });
