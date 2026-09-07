const assert = require('assert');
const fs = require('fs');
const path = require('path');

function normalizeNick(value) {
  return String(value ?? '').trim().replace(/\s+/g, '').toLowerCase();
}

function matchesPlayerNames(playerNames, nickname, profiles, userId) {
  const key = normalizeNick(nickname);
  const matches = profiles.filter(profile => normalizeNick(profile.nickname) === key);
  const uniqueTarget = matches.length === 1 && String(matches[0].user_id) === String(userId);
  return String(playerNames || '').split(',').map(token => token.trim()).some(token => {
    if (!token) return false;
    return uniqueTarget
      ? normalizeNick(token) === key
      : token.toLowerCase() === String(nickname).trim().toLowerCase();
  });
}

const profiles = [
  { user_id: 'deok', nickname: '덕 지' },
  { user_id: 'other', nickname: '원철' },
];

assert.equal(normalizeNick(' 덕 지 '), '덕지', '공백 정규화');
assert.equal(matchesPlayerNames('호핀, 덕지, DK', '덕 지', profiles, 'deok'), true, '공백 차이 일치');
assert.equal(matchesPlayerNames('호핀, 박원철', '원철', profiles, 'other'), false, '부분문자열 오탐 차단');
assert.equal(matchesPlayerNames('호핀, 덕지', '원철', profiles, 'other'), false, '다른 닉네임 불일치');
assert.equal(matchesPlayerNames('덕지', '덕 지', [
  { user_id: 'a', nickname: '덕 지' },
  { user_id: 'b', nickname: '덕지' },
], 'a'), false, '정규화 충돌 자동 연결 차단');

const clientSource = fs.readFileSync(path.join(__dirname, '../assets/js/supabase-client.js'), 'utf8');
for (const name of ['getMyStats', 'getMyNotifications', 'getUserPlayedGames', 'getUserParticipationCount', 'getUserUniqueDayCount']) {
  const start = clientSource.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} 정의`);
  const next = clientSource.indexOf('\n  async function ', start + 1);
  const body = clientSource.slice(start, next === -1 ? undefined : next);
  assert.ok(body.includes('_getParticipantRows('), `${name} 공통 참여자 판정 사용`);
}

console.log('PASS nickname resolution fixtures');
