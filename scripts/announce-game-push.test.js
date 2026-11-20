const test = require('node:test');
const assert = require('node:assert/strict');
const { announcementsFor, pendingForPush } = require('./announce-game-push');

test('new and arrived games get separate notices, while unavailable games do not', () => {
  const before = {
    A: { location: '발매후 도착예정' },
    B: { location: '배송중' },
    C: { location: '발매후 도착예정' },
  };
  const after = {
    A: { location: '헤비 전략게임' },
    B: { location: '헤비 전략게임' },
    C: { location: '1회용(미제공)게임' },
    D: { location: '가족게임' },
    E: { location: '구매예정' },
  };
  assert.deepEqual(announcementsFor(before, after), [
    { kind: 'new', names: ['D', 'E'], location: null },
    { kind: 'arrived', names: ['A', 'B'], location: '헤비 전략게임' },
  ]);
});

test('the last direct game-data commit yields the arrived games once', () => {
  const notices = pendingForPush('725d9cad', '3c8808a4');
  assert.deepEqual(notices.map(n => n.kind), ['arrived']);
  assert.equal(notices[0].names.length, 3);
});
