// 사용: node --test game-system/admin-gui/api.test.js
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { createAdminServer } = require('./server');
const { createQueue } = require('./announce-queue');

function request(port, method, rawPath, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({ host: '127.0.0.1', port, method, path: rawPath,
      headers: data ? { 'content-type': 'application/json', 'content-length': data.length } : {} }, res => {
      let text = '';
      res.on('data', d => { text += d; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch (_) { /* 정적 파일 응답 */ }
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function withServer(deps, fn) {
  const server = createAdminServer(deps);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try { await fn(server.address().port); } finally { server.close(); }
}

function tempQueue() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cottage-queue-'));
  return createQueue(path.join(dir, 'pending.json'));
}

test('GET /api/games lists the real catalog with the 4 location issues', async () => {
  await withServer({ queue: tempQueue() }, async port => {
    const res = await request(port, 'GET', '/api/games');
    assert.strictEqual(res.status, 200);
    assert.ok(res.json.games.length >= 645);
    assert.strictEqual(res.json.issues.length, 4);
    assert.ok(res.json.locations.some(l => l.value === '협력'));
  });
});

test('POST /api/locations with an unknown game answers 400 in plain Korean', async () => {
  await withServer({ queue: tempQueue() }, async port => {
    const res = await request(port, 'POST', '/api/locations', { names: ['없는게임'], location: '헤비 전략게임', announce: true });
    assert.strictEqual(res.status, 400);
    assert.match(res.json.error, /없는 게임/);
  });
});

test('static /site/ refuses paths that escape the repo or touch dotfiles', async () => {
  await withServer({ queue: tempQueue() }, async port => {
    assert.strictEqual((await request(port, 'GET', '/site/../.env')).status, 403);
    assert.strictEqual((await request(port, 'GET', '/site/.env')).status, 403);
    assert.strictEqual((await request(port, 'GET', '/site/assets/js/supabase-config.js')).status, 200);
  });
});

test('a batch arrival of 3 games queues exactly one announcement naming all 3', async () => {
  const queue = tempQueue();
  const ops = { setLocation: async () => ({ from: '발매후 도착예정', to: '헤비 전략게임' }) };
  await withServer({ queue, ops }, async port => {
    const res = await request(port, 'POST', '/api/locations', { names: ['가', '나', '다'], location: '헤비 전략게임', announce: true });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.json.arrived, ['가', '나', '다']);
  });
  const items = queue.list();
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].kind, 'arrived');
  assert.deepStrictEqual(items[0].names, ['가', '나', '다']);
});

test('moves that are not arrivals, or announce:false, queue nothing', async () => {
  const queue = tempQueue();
  const ops = { setLocation: async () => ({ from: '전략', to: '라이트패밀리게임' }) };
  await withServer({ queue, ops }, async port => {
    await request(port, 'POST', '/api/locations', { names: ['가'], location: '라이트패밀리게임', announce: true });
  });
  const ops2 = { setLocation: async () => ({ from: '발매후 도착예정', to: '헤비 전략게임' }) };
  await withServer({ queue, ops: ops2 }, async port => {
    await request(port, 'POST', '/api/locations', { names: ['나'], location: '헤비 전략게임', announce: false });
  });
  assert.strictEqual(queue.list().length, 0);
});
