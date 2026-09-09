const assert = require('assert');
const fs = require('fs');
const path = require('path');

function normalizeNick(value) {
  return String(value ?? '').trim().replace(/\s+/g, '').toLowerCase();
}

function identityKeys(profile) {
  return [...new Set([profile.nickname, profile.real_name, profile.public_nickname].map(normalizeNick).filter(Boolean))];
}

function matchesPlayerNames(playerNames, nickname, profiles, userId) {
  const target = profiles.find(profile => String(profile.user_id) === String(userId));
  const identitiesByKey = new Map();
  for (const profile of profiles) {
    for (const key of identityKeys(profile)) {
      if (!identitiesByKey.has(key)) identitiesByKey.set(key, new Set());
      identitiesByKey.get(key).add(String(profile.user_id));
    }
  }
  const uniqueTargetKeys = new Set(identityKeys(target)
    .filter(key => identitiesByKey.get(key)?.size === 1 && identitiesByKey.get(key).has(String(userId))));
  return String(playerNames || '').split(',').map(token => token.trim()).some(token => {
    if (!token) return false;
    return token.toLowerCase() === String(nickname).trim().toLowerCase()
      || uniqueTargetKeys.has(normalizeNick(token));
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
assert.equal(matchesPlayerNames('서은희', '써니', [
  { user_id: 'sunny', nickname: '서은희(Sun...)', real_name: '서은희', public_nickname: '써니' },
], 'sunny'), true, '본명 토큰을 유일한 회원 닉네임으로 연결');
assert.equal(matchesPlayerNames('서 은 희', '써니', [
  { user_id: 'sunny', nickname: '써니', real_name: '서은희' },
], 'sunny'), true, '본명 공백 변형 연결');
assert.equal(matchesPlayerNames('서은희', '써니', [
  { user_id: 'sunny', nickname: '써니', real_name: '서은희' },
  { user_id: 'other', nickname: '서은희' },
], 'sunny'), false, '본명-닉네임 충돌 자동 연결 차단');
assert.equal(matchesPlayerNames('써니', '써니', [
  { user_id: 'sunny', nickname: '서은희(Sun...)', public_nickname: '써니' },
], 'sunny'), true, '모임원 공개 닉네임도 stable user_id의 identity 별칭으로 연결');

const clientSource = fs.readFileSync(path.join(__dirname, '../assets/js/supabase-client.js'), 'utf8');
for (const name of ['getMyStats', 'getMyNotifications', 'getUserPlayedGames', 'getUserParticipationCount', 'getUserUniqueDayCount']) {
  const start = clientSource.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} 정의`);
  const next = clientSource.indexOf('\n  async function ', start + 1);
  const body = clientSource.slice(start, next === -1 ? undefined : next);
  assert.ok(body.includes('_getParticipantRows('), `${name} 공통 참여자 판정 사용`);
}
const participantStart = clientSource.indexOf('async function _getParticipantRows');
const participantEnd = clientSource.indexOf('\n  // 기록 추가', participantStart);
const participantBody = clientSource.slice(participantStart, participantEnd);
assert.ok(participantBody.includes("member_intros').select('user_id,nickname')"), '참여자 resolver가 모임원 공개 nickname 별칭을 조회');
assert.ok(participantBody.includes('publicNickByUserId'), '참여자 resolver가 stable user_id별 공개 nickname을 병합');

const introSource = fs.readFileSync(path.join(__dirname, '../pages/club/club-intro.html'), 'utf8');
assert.ok(introSource.includes('data-nickname="${escHtml(r.nickname)}"'), '모임원 카드가 canonical nickname을 stable user_id와 함께 보존');
assert.ok(introSource.includes('nickname: head.dataset.nickname'), '모임원 헤더 클릭이 canonical nickname을 상세로 전달');
assert.ok(introSource.includes("autoSubsheet: 'taste', nickname: cardBody.dataset.nickname"), '모임원 본문 클릭도 같은 canonical nickname을 전달');

const authSource = fs.readFileSync(path.join(__dirname, '../assets/js/kakao-auth.js'), 'utf8');
assert.ok(authSource.includes('const meetingProfilePromise ='), 'read-only 상세가 stable user_id의 공개 프로필을 먼저 조회');
assert.ok(authSource.indexOf('const meetingProfilePromise =') < authSource.indexOf('window.CottageDB.getMyStats(String(user.id), user.nickname || null)'), '공개 nickname 확정 뒤 같은 stable user_id로 통계 조회');

console.log('PASS nickname resolution fixtures');
