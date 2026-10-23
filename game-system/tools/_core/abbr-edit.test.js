// 사용: node --test game-system/tools/_core/abbr-edit.test.js
const test = require('node:test');
const assert = require('node:assert');
const { applyAbbr } = require('./abbr-edit');

test('a game with a BGG id stores its abbreviation by id and drops a name entry', () => {
  const maps = { byId: { 1: '옛' }, byName: { 테베: '테' } };
  const r = applyAbbr(maps, { bggId: '30869', ownedName: '테베' }, '테베스');
  assert.strictEqual(r.byId['30869'], '테베스');
  assert.ok(!('테베' in r.byName));
  assert.strictEqual(r.byId['1'], '옛');
});

test('a game without a BGG id stores its abbreviation by name and drops nothing else', () => {
  const r = applyAbbr({ byId: {}, byName: { 다른게임: '다른' } }, { bggId: null, ownedName: '에이다의꿈' }, '에이다');
  assert.strictEqual(r.byName['에이다의꿈'], '에이다');
  assert.strictEqual(r.byName['다른게임'], '다른');
});

test('an empty abbreviation removes the manual entry from both maps', () => {
  const r = applyAbbr({ byId: { 30869: '테베스' }, byName: { 테베: '테' } }, { bggId: '30869', ownedName: '테베' }, '  ');
  assert.ok(!('30869' in r.byId));
  assert.ok(!('테베' in r.byName));
});

test('applyAbbr does not mutate its input', () => {
  const maps = { byId: { 30869: '테베스' }, byName: {} };
  const before = JSON.stringify(maps);
  applyAbbr(maps, { bggId: '30869', ownedName: '테베' }, '테');
  assert.strictEqual(JSON.stringify(maps), before);
});

test('reading and writing the real abbreviation files changes no byte (order kept)', () => {
  const fs = require('fs');
  const { GAME_ABBR_PATH, GAME_ABBR_BYNAME_PATH } = require('./paths');
  const { parsePairs, serializePairs } = require('./abbr-edit');
  for (const p of [GAME_ABBR_PATH, GAME_ABBR_BYNAME_PATH]) {
    const text = fs.readFileSync(p, 'utf8');
    assert.strictEqual(serializePairs(parsePairs(text)), text, p);
  }
});

test('updating a key keeps its position and appends new keys at the end', () => {
  const { mergePairs } = require('./abbr-edit');
  const pairs = [['248562', '메나'], ['12333', '황투']];
  const merged = mergePairs(pairs, { 248562: '메나2', 12333: '황투', 999: '새' });
  assert.deepStrictEqual(merged, [['248562', '메나2'], ['12333', '황투'], ['999', '새']]);
  assert.deepStrictEqual(mergePairs(pairs, { 12333: '황투' }), [['12333', '황투']]);
});
