// 대표 캐릭터 identity icon의 안전 계약 정적 회귀 검사 (DB/브라우저 불필요)
// 사용: node scripts/verify-identity-icon-contract.js [--negctl]
const fs = require('fs');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const has = (source, needle, why) => assert.ok(source.includes(needle), why);

let achievements = read('assets/js/achievements.js');
if (process.argv.includes('--negctl')) achievements = achievements.replace('!host.isConnected || currentUserId !== userId', 'false');

has(achievements, 'const _identityIconCache = new Map();', '공통 identity icon cache가 있다');
has(achievements, 'function _renderIdentityIcon(host, userId, achId)', '공통 renderer가 있다');
has(achievements, 'icons.forEach(icon => icon.remove());', 'idempotent 교체/제거가 있다');
has(achievements, "fallback.textContent = '🐾';", '확정 stable user_id에 대표 캐릭터가 없으면 공통 기본 발바닥을 렌더한다');
has(achievements, "const resolvedAchievementId = path && def ? achId : '';", '대표 캐릭터가 없는 확정 회원도 기존 아이콘을 정확히 교체한다');
has(achievements, "snapshot.filter(item => !item.userId).forEach", 'user_id가 제거된 host의 옛 icon도 제거한다');
has(achievements, '!host.isConnected || currentUserId !== userId', '삽입 전 연결 상태·현재 user_id 재확인');
has(achievements, 'if (revision !== _identityIconRevision) return hydrateIdentityIcons(root);', '대표 변경 뒤 stale async 결과를 재조회');
has(achievements, 'function invalidateIdentityIcons(userId, repAchievementId)', '단일 cache invalidation API가 있다');
has(achievements, 'void invalidateIdentityIcons(userId, achId || null);', '대표 캐릭터 변경 handler가 공통 invalidation만 사용한다');

const db = read('assets/js/supabase-client.js');
has(db, "function getRepresentativeCharacters(userIds)", '대표 캐릭터 batch API가 있다');
has(db, ".select('user_id,rep_achievement_id')", 'batch API가 최소 컬럼만 읽는다');

for (const file of ['assets/js/game-reviews.js', 'assets/js/index-page.js', 'pages/club/club-history.html']) {
  const src = read(file);
  has(src, "dataset.identityIconVariant = 'micro'", `${file}: D가 micro variant다`);
  has(src, 'hydrateIdentityIcons', `${file}: 렌더 뒤 공통 hydrator를 부른다`);
}
const gameSheet = read('assets/js/game-sheet.js');
has(gameSheet, 'function _buildSheetParticipantNickMap(profiles, records)', '게임정보 D도 exact/unique resolver를 사용한다');
has(gameSheet, 'function _hydrateSheetParticipantIcons(root, nickUserMap)', '게임정보 D도 공통 hydrator만 호출한다');
has(gameSheet, 'window.CottageDB.getAllProfiles?.() || []', '게임정보 D는 회원 별칭 명부를 비동기로 확보한다');
for (const file of ['assets/js/game-reviews.js', 'assets/js/index-page.js', 'assets/js/game-sheet.js', 'assets/js/day-detail.js']) {
  has(read(file), 'data-identity-user-id', `${file}: stable user_id host를 만든다`);
}

const day = read('assets/js/day-detail.js');
has(day, 'window.buildBarsInCard', 'E 공통 플래너 막대 renderer를 유지한다');
has(day, 'data-identity-user-id="${esc(v.user_id)}"', 'E는 meeting_votes stable user_id만 쓴다');
const css = read('assets/css/style.css');
has(css, '.identity-character-icon{display:inline-flex', '일반 identity icon CSS가 있다');
has(css, 'width:20px;height:20px', 'C/E standard icon은 투명 여백을 보정한 20px이다');
has(css, '.identity-character-icon--micro{width:12px;height:12px', 'D micro icon은 12px이다');

console.log('PASS representative identity icon contract');
