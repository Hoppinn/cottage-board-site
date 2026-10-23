// 사용: node --test game-system/tools/_core/location-rules.test.js
const test = require('node:test');
const assert = require('node:assert');
const { readJson } = require('./file-read-writer');
const { COTTAGE_OWNED_GAMES_MASTER_PATH } = require('./paths');
const {
  listPickableLocations,
  isPendingLocation,
  isArrival,
  findLocationIssues,
} = require('./location-rules');

test('arrival means leaving a pending (Z) location for a real one', () => {
  assert.strictEqual(isArrival('발매후 도착예정', '전략'), true);
  assert.strictEqual(isArrival('배송중', '협력'), true);
});

test('moving between pending locations or between real shelves is not an arrival', () => {
  assert.strictEqual(isArrival('발매후 도착예정', '배송중'), false);
  assert.strictEqual(isArrival('전략', '가족'), false);
});

test('pending locations are the Z group only', () => {
  assert.strictEqual(isPendingLocation('구매예정'), true);
  assert.strictEqual(isPendingLocation('전략'), false);
  assert.strictEqual(isPendingLocation(''), false);
});

test('pickable locations include 협력 and the 따로 보관 shelf exactly once', () => {
  const values = listPickableLocations().map(l => l.value);
  assert.strictEqual(values.filter(v => v === '협력').length, 1);
  assert.strictEqual(values.filter(v => v === '따로 보관').length, 1);
});

test('location issues in the real master are exactly the 4 unresolved games (협력 excluded)', () => {
  const master = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const names = findLocationIssues(Object.values(master.games)).map(g => g.ownedName).sort();
  assert.deepStrictEqual(names, ['글렌모어연대기', '딥씨크루', '원드러스크리처', '테베'].sort());
});
