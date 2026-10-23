// 사용: node --test game-system/admin-gui/launch.test.js
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { launch } = require('./launch');

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

test('when the admin server already runs, launch only opens the browser', async () => {
  const existing = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  const port = existing.address().port;
  const opened = [];
  let started = 0;
  try {
    const r = await launch({ port, open: url => opened.push(url), start: () => { started++; } });
    assert.strictEqual(r.reused, true);
  } finally { existing.close(); }
  assert.strictEqual(started, 0);
  assert.deepStrictEqual(opened, [`http://127.0.0.1:${port}`]);
});

test('when nothing runs, launch starts the server and then opens the browser', async () => {
  const probe = await listen(() => {});
  const port = probe.address().port;
  await new Promise(r => probe.close(r)); // 빈 포트 확보
  const opened = [];
  let started = 0;
  const r = await launch({ port, open: url => opened.push(url), start: () => { started++; } });
  assert.strictEqual(r.reused, false);
  assert.strictEqual(started, 1);
  assert.strictEqual(opened.length, 1);
});
