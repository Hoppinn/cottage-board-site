/**
 * 참여자 identity 별칭 해소의 운영 영향 읽기 전용 감사.
 * 사용: node scripts/audit-nickname-resolution.js [--name 써니] [--token 서은희]
 * profiles / member_intros / game_play_records / user_achievements만 SELECT하며 쓰기 요청은 하지 않는다.
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

function buildResolver(profiles, publicNickByUserId) {
  const membersByKey = new Map();
  for (const profile of profiles) {
    if (!profile.user_id) continue;
    for (const key of new Set([profile.nickname, profile.real_name, publicNickByUserId.get(String(profile.user_id))].map(normalize).filter(Boolean))) {
      if (!membersByKey.has(key)) membersByKey.set(key, new Map());
      membersByKey.get(key).set(String(profile.user_id), profile.nickname);
    }
  }
  return {
    uniqueKeysFor(profile) {
      return new Set([profile.nickname, profile.real_name, publicNickByUserId.get(String(profile.user_id))].map(normalize).filter(key => {
        const matched = membersByKey.get(key);
        return matched?.size === 1 && matched.has(String(profile.user_id));
      }));
    },
    resolvesFor(profile, token) {
      if (rawTokenEqual(token, profile.nickname)) return true;
      return this.uniqueKeysFor(profile).has(normalize(token));
    },
    resolve(token) {
      const matched = membersByKey.get(normalize(token));
      if (!matched || matched.size !== 1) return null;
      const [userId, nickname] = matched.entries().next().value;
      return { userId, nickname };
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
  const [profileRes, introRes, recordRes, achievementRes] = await Promise.all([
    db.from('profiles').select('user_id,nickname,real_name'),
    db.from('member_intros').select('id,user_id,nickname'),
    db.from('game_play_records').select('id,user_id,player_names,played_at,created_at'),
    db.from('user_achievements').select('user_id,achievement_id'),
  ]);
  for (const [name, result] of [['profiles', profileRes], ['member_intros', introRes], ['game_play_records', recordRes], ['user_achievements', achievementRes]]) {
    if (result.error) throw new Error(`${name}: ${result.error.message || result.error.code || 'query failed'}`);
  }

  const profiles = profileRes.data || [];
  const intros = introRes.data || [];
  const records = recordRes.data || [];
  const publicNickByUserId = new Map(intros.filter(intro => intro.user_id && intro.nickname).map(intro => [String(intro.user_id), intro.nickname]));
  const resolver = buildResolver(profiles, publicNickByUserId);
  const ownedByUser = new Map();
  for (const row of achievementRes.data || []) {
    const userId = String(row.user_id);
    if (!ownedByUser.has(userId)) ownedByUser.set(userId, new Set());
    ownedByUser.get(userId).add(row.achievement_id);
  }

  const nameArg = process.argv.indexOf('--name');
  const requestedName = nameArg >= 0 ? process.argv[nameArg + 1] : null;
  const tokenArg = process.argv.indexOf('--token');
  const requestedToken = tokenArg >= 0 ? process.argv[tokenArg + 1] : null;
  if (requestedToken) {
    const key = normalize(requestedToken);
    const matched = records.filter(row => tokens(row.player_names).some(token => normalize(token) === key));
    const rawTokens = [...new Set(matched.flatMap(row => tokens(row.player_names).filter(token => normalize(token) === key)))];
    const days = [...new Set(matched.map(recordDate))].sort();
    console.log(`token=${requestedToken} normalized=${key}; records=${matched.length}; unique-days=${days.length}; raw-tokens=${rawTokens.join('|') || 'none'}; days=${days.join(',') || 'none'}`);
  }
  const requestedUserIds = new Set();
  if (requestedName) {
    profiles.filter(profile => [profile.nickname, profile.real_name].some(value => rawTokenEqual(value, requestedName)))
      .forEach(profile => requestedUserIds.add(String(profile.user_id)));
    intros.filter(intro => rawTokenEqual(intro.nickname, requestedName))
      .forEach(intro => requestedUserIds.add(String(intro.user_id)));
  }
  const auditProfiles = requestedName ? profiles.filter(profile => requestedUserIds.has(String(profile.user_id))) : profiles;
  if (requestedName && !requestedUserIds.size) {
    console.log(`No exact profiles/member_intros identity for --name ${requestedName}`);
  } else if (requestedName) {
    for (const userId of requestedUserIds) {
      const profile = profiles.find(row => String(row.user_id) === userId) || null;
      const intro = intros.find(row => String(row.user_id) === userId) || null;
      console.log(`identity user-id=${userId}; profiles.nickname=${profile?.nickname || 'none'}; profiles.real_name=${profile?.real_name || 'none'}; member_intros.id=${intro?.id || 'none'}; member_intros.nickname=${intro?.nickname || 'none'}`);
    }
  }
  const changed = [];
  for (const profile of auditProfiles) {
    const userId = String(profile.user_id);
    const nickname = profile.nickname || '';
    if (!nickname) continue;
    const beforeParticipant = records.filter(row => tokens(row.player_names).some(token => rawTokenEqual(token, nickname)));
    const afterParticipant = records.filter(row => tokens(row.player_names).some(token => resolver.resolvesFor(profile, token)));
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
      realName: profile.real_name || null,
      publicNickname: publicNickByUserId.get(userId) || null,
      uniqueIdentityKeys: [...resolver.uniqueKeysFor(profile)],
      play: `${beforeParticipant.length} -> ${afterParticipant.length}`,
      uniqueDays: `${beforeDays.size} -> ${afterDays.size}`,
      newAchievements: [
        ...crossedThresholds(beforeParticipant.length, afterParticipant.length, PLAY_THRESHOLDS, 'play', owned),
        ...crossedThresholds(beforeDays.size, afterDays.size, BALANCE_THRESHOLDS, 'balance', owned),
      ],
    });
  }

  console.log(`source=${window.SUPABASE_CONFIG.url}; profiles=${profiles.length} member-intros=${intros.length} records=${records.length} identity-key-collisions=${resolver.collisionCount}`);
  if (!changed.length) console.log('No count changes under the proposed resolver.');
  for (const row of changed) {
    console.log(`${row.nickname} (${row.userId}) real-name=${row.realName || 'none'} public-nickname=${row.publicNickname || 'none'} unique-keys=${row.uniqueIdentityKeys.join(',') || 'none'}; play ${row.play}; unique-day ${row.uniqueDays}; new-thresholds ${row.newAchievements.join(', ') || 'none'}`);
  }
  process.exit(0);
})().catch(error => { console.error('[audit-nickname-resolution]', error); process.exit(1); });
