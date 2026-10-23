// 사용: node --test game-system/tools/0-input/game-ops.test.js
// 실제 엑셀·마스터 파일을 읽지만, 쓰기가 일어나는 경로는 거부 케이스만 실행한다.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_XLSX_PATH,
} = require('../_core/paths');
const {
  parseBggInput,
  assertXlsxWritable,
  setLocation,
  addGame,
  runPipeline,
} = require('./game-ops');

test('parseBggInput accepts a BGG URL, an expansion URL, or a bare number', () => {
  assert.strictEqual(parseBggInput('https://boardgamegeek.com/boardgame/342942/ark-nova'), '342942');
  assert.strictEqual(parseBggInput('boardgamegeek.com/boardgameexpansion/12345/x'), '12345');
  assert.strictEqual(parseBggInput(' 342942 '), '342942');
});

test('parseBggInput returns null for names and empty input', () => {
  assert.strictEqual(parseBggInput('아크노바'), null);
  assert.strictEqual(parseBggInput(''), null);
  assert.strictEqual(parseBggInput(null), null);
});

test('assertXlsxWritable refuses while Excel holds its lock file', () => {
  const lock = path.join(path.dirname(COTTAGE_OWNED_GAMES_XLSX_PATH), '~$' + path.basename(COTTAGE_OWNED_GAMES_XLSX_PATH));
  assert.ok(!fs.existsSync(lock), 'precondition: no real lock file');
  fs.writeFileSync(lock, '');
  try {
    assert.throws(() => assertXlsxWritable(), /엑셀 파일이 열려 있어요/);
  } finally {
    fs.unlinkSync(lock);
  }
  assert.doesNotThrow(() => assertXlsxWritable());
});

test('setLocation rejects an unknown game and leaves the master untouched', async () => {
  const before = fs.readFileSync(COTTAGE_OWNED_GAMES_MASTER_PATH);
  await assert.rejects(setLocation('존재하지않는게임xyz', '전략'), /없는 게임/);
  assert.ok(before.equals(fs.readFileSync(COTTAGE_OWNED_GAMES_MASTER_PATH)));
});

test('setLocation rejects a location outside the pickable list', async () => {
  await assert.rejects(setLocation('테베', 'x'), /고를 수 없는 위치/);
});

test('addGame rejects a game that already exists', async () => {
  await assert.rejects(addGame('테베', '전략'), /이미 있는 게임/);
});

test('runPipeline runs steps in order and skips translation without a key', async () => {
  const ran = [];
  const result = await runPipeline(
    { gameIds: ['테베'], fetchBgg: true, translate: true },
    null,
    { run: async (name) => { ran.push(name); }, env: {} },
  );
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(ran, ['match', 'fetch-bgg', 'build-master', 'label-translate', 'build-output']);
  const tr = result.steps.find(s => s.name === 'translate');
  assert.strictEqual(tr.status, 'skipped');
  assert.match(tr.note, /번역 대기/);
});

test('runPipeline stops at the first failing step', async () => {
  const ran = [];
  const result = await runPipeline(
    { gameIds: [], fetchBgg: true, translate: false },
    null,
    { run: async (name) => { ran.push(name); if (name === 'fetch-bgg') throw new Error('HTTP 401'); }, env: {} },
  );
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(ran, ['match', 'fetch-bgg']);
  assert.strictEqual(result.steps.at(-1).status, 'failed');
  assert.match(result.steps.at(-1).note, /401/);
});
