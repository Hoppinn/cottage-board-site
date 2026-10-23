// 사용: node --test game-system/admin-gui/publish.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { filterPublishable, describeChanges, createPublisher } = require('./publish');
const { createQueue } = require('./announce-queue');

const XLSX = 'game-system/game-data/source/2-cottage-manual/cottage-owned-games.xlsx';

test('filterPublishable keeps only game data paths', () => {
  const r = filterPublishable([` M ${XLSX}`, ' M assets/js/kakao-auth.js', '?? game-system/game-data/library/images/thumb/테베.png']);
  assert.deepStrictEqual(r.publish, [XLSX, 'game-system/game-data/library/images/thumb/테베.png']);
  assert.deepStrictEqual(r.other, ['assets/js/kakao-auth.js']);
});

test('describeChanges speaks in plain words', () => {
  const s = describeChanges([XLSX, 'game-system/game-data/library/images/thumb/a.png', 'game-system/game-data/library/images/thumb/b.png']);
  assert.ok(s.includes('게임 목록(엑셀)'));
  assert.ok(s.includes('게임 사진 2장'));
});

function fakeGit({ branch = 'main', behind = 0, pushFails = false, status = [` M ${XLSX}`] } = {}) {
  const calls = [];
  return {
    calls,
    branch: async () => branch,
    status: async () => status,
    fetch: async () => { calls.push('fetch'); },
    behindCount: async () => behind,
    add: async files => { calls.push('add:' + files.join(',')); },
    commit: async msg => { calls.push('commit'); return 'abc1234'; },
    push: async () => { calls.push('push'); if (pushFails) throw new Error('Authentication failed'); },
  };
}

function tempQueueWith(n) {
  const q = createQueue(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pq-')), 'p.json'));
  for (let i = 0; i < n; i++) q.enqueue({ kind: 'arrived', names: ['게임' + i], location: '헤비 전략게임' });
  return q;
}

test('a failed push sends no announcements and keeps the queue', async () => {
  const queue = tempQueueWith(2);
  let sent = 0;
  const p = createPublisher({ git: fakeGit({ pushFails: true }), runCheck: async () => {}, insertAnnouncement: async () => { sent++; }, queue });
  const r = await p.publish();
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.step, 'push');
  assert.strictEqual(sent, 0);
  assert.strictEqual(queue.list().length, 2);
});

test('a successful push sends every queued announcement and empties the queue', async () => {
  const queue = tempQueueWith(2);
  let sent = 0;
  const p = createPublisher({ git: fakeGit(), runCheck: async () => {}, insertAnnouncement: async () => { sent++; }, queue });
  const r = await p.publish();
  assert.strictEqual(r.ok, true);
  assert.strictEqual(sent, 2);
  assert.strictEqual(queue.list().length, 0);
});

test('an announcement that fails to send stays queued while the publish still succeeds', async () => {
  const queue = tempQueueWith(1);
  const p = createPublisher({ git: fakeGit(), runCheck: async () => {}, insertAnnouncement: async () => { throw new Error('HTTP 404'); }, queue });
  const r = await p.publish();
  assert.strictEqual(r.ok, true);
  assert.match(r.message, /알림/);
  assert.strictEqual(queue.list().length, 1);
});

test('when GitHub is ahead, nothing is committed', async () => {
  const git = fakeGit({ behind: 1 });
  const p = createPublisher({ git, runCheck: async () => {}, insertAnnouncement: async () => {}, queue: tempQueueWith(0) });
  const r = await p.publish();
  assert.strictEqual(r.ok, false);
  assert.ok(!git.calls.includes('commit'));
  assert.match(r.message, /GitHub에 더 새 버전/);
});

test('publishing is refused off the main branch', async () => {
  const git = fakeGit({ branch: 'feat/x' });
  const p = createPublisher({ git, runCheck: async () => {}, insertAnnouncement: async () => {}, queue: tempQueueWith(0) });
  const r = await p.publish();
  assert.strictEqual(r.ok, false);
  assert.ok(!git.calls.includes('fetch'));
  assert.match(r.message, /main/);
});

test('with no game data changes there is nothing to publish', async () => {
  const git = fakeGit({ status: [' M assets/js/kakao-auth.js'] });
  const p = createPublisher({ git, runCheck: async () => {}, insertAnnouncement: async () => {}, queue: tempQueueWith(0) });
  const r = await p.publish();
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /올릴 변경이 없어요/);
});

test('a failing pipeline check stops before commit', async () => {
  const git = fakeGit();
  const p = createPublisher({ git, runCheck: async () => { throw new Error('약칭 충돌'); }, insertAnnouncement: async () => {}, queue: tempQueueWith(0) });
  const r = await p.publish();
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.step, 'check');
  assert.ok(!git.calls.includes('commit'));
});
