// 게임 위치 규칙 — 게임 관리 GUI와 game-ops가 공유한다.
// 위치 정본은 엑셀 값이고, 그 값을 SHELF_GROUPS로 해석한다(build-output과 같은 해석기).
const { SHELF_GROUPS, getShelfGroupBySourceValue } = require('../../config/shelf-locations');

// `협력`은 SHELF_GROUPS에 없지만 의도된 값이다 — 사이트가 BGG 난이도 2.5 기준으로
// 쉬운/어려운 협력으로 나눠 보여준다(game-sheet.js getGameShelfLabel, game-location.html).
const COOP_VALUE = '협력';
const PENDING_IDS = new Set(['incoming', 'shipping', 'to_buy']);

function listPickableLocations() {
  return [
    ...SHELF_GROUPS.map(g => ({ value: g.label, label: g.label, code: g.code })),
    { value: COOP_VALUE, label: '협력(난이도로 자동 분류)', code: null },
  ];
}

function isPickable(value) {
  const v = String(value || '').trim();
  return v === COOP_VALUE || Boolean(getShelfGroupBySourceValue(v));
}

function isPendingLocation(value) {
  const group = getShelfGroupBySourceValue(String(value || '').trim());
  return Boolean(group && PENDING_IDS.has(group.id));
}

function isArrival(from, to) {
  return isPendingLocation(from) && !isPendingLocation(to) && isPickable(to);
}

function findLocationIssues(games) {
  return (games || [])
    .filter(g => !isPickable(g.location))
    .map(g => ({ ownedName: g.ownedName, location: g.location || '' }));
}

module.exports = {
  COOP_VALUE,
  listPickableLocations,
  isPickable,
  isPendingLocation,
  isArrival,
  findLocationIssues,
};
