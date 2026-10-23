// 사용: node --test game-system/admin-gui/announce-queue.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createQueue } = require('./announce-queue');

test('removing one of two items queued in the same instant keeps the other', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 0 });
  const q = createQueue(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'q-')), 'p.json'));
  q.enqueue({ kind: 'new', names: ['가'] });
  q.enqueue({ kind: 'new', names: ['나'] });
  q.remove([q.list()[0]]);
  assert.deepStrictEqual(q.list().map(i => i.names[0]), ['나']);
});
