// 사용: node --test game-system/tools/_core/manual-fill.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildMasterGame } = require('../3-build-master/build-master');
const { readManualFill, saveManualFill } = require('./manual-fill');

const row = { id: '수동게임', ownedName: '수동게임' };

test('without BGG data, manual player count, time and description fill the master game', () => {
  const g = buildMasterGame(row, null, {}, null, [], { minPlayers: 2, maxPlayers: 4, playingTime: 30, description: '수동' });
  assert.strictEqual(g.minPlayers, 2);
  assert.strictEqual(g.maxPlayers, 4);
  assert.strictEqual(g.playingTime, 30);
  assert.strictEqual(g.description, '수동');
});

test('BGG values win over manual values', () => {
  const g = buildMasterGame(row, null, { minplayers: '1', description: 'bgg' }, null, [], { minPlayers: 3, description: '수동' });
  assert.strictEqual(g.minPlayers, 1);
  assert.strictEqual(g.description, 'bgg');
});

test('without manual info the master game is unchanged from before', () => {
  const g = buildMasterGame(row, null, {}, null, []);
  assert.strictEqual(g.minPlayers, null);
  assert.strictEqual(g.description, '');
});

test('saveManualFill drops empty fields and removes a game left with nothing', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-')), 'manual-game-info.json');
  saveManualFill('x', { minPlayers: 2, description: '' }, file);
  assert.deepStrictEqual(readManualFill(file), { x: { minPlayers: 2 } });
  saveManualFill('x', { minPlayers: null }, file);
  assert.deepStrictEqual(readManualFill(file), {});
});

test('saveThumb writes one photo per game and removes the same game\'s photo in another format', () => {
  const { saveThumb } = require('./manual-fill');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-'));
  fs.writeFileSync(path.join(dir, '테베.jpg'), 'old');
  saveThumb('테베', '.png', Buffer.from('new'), dir);
  assert.deepStrictEqual(fs.readdirSync(dir), ['테베.png']);
});

test('saveThumb refuses other file types and files over 10MB', () => {
  const { saveThumb } = require('./manual-fill');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'th-'));
  assert.throws(() => saveThumb('테베', '.gif', Buffer.from('x'), dir), /png/);
  assert.throws(() => saveThumb('테베', '.png', Buffer.alloc(10 * 1024 * 1024 + 1), dir), /10MB/);
  assert.throws(() => saveThumb('../밖', '.png', Buffer.from('x'), dir), /게임/);
});
