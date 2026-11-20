// main에 직접 push한 게임 데이터의 전후 차이에서 회원 종 알림을 만든다.
// 게임 관리 GUI의 data: 커밋은 GUI 대기열이 별도로 발송하므로 건너뛴다.
const { execFileSync } = require('node:child_process');
const { isArrival } = require('../game-system/tools/_core/location-rules');
const { realInsertAnnouncement } = require('../game-system/admin-gui/publish');

const MASTER = 'game-system/game-data/library/1-master/cottage-owned-games-master.json';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}

function readGames(rev) {
  return JSON.parse(git('show', `${rev}:${MASTER}`)).games;
}

function announcementsFor(before, after) {
  const added = [];
  const arrivedByLocation = new Map();
  for (const [name, game] of Object.entries(after)) {
    const previous = before[name];
    if (!previous) {
      added.push(name);
      continue;
    }
    if (isArrival(previous.location, game.location)) {
      const location = game.location || null;
      if (!arrivedByLocation.has(location)) arrivedByLocation.set(location, []);
      arrivedByLocation.get(location).push(name);
    }
  }
  return [
    ...(added.length ? [{ kind: 'new', names: added.sort(), location: null }] : []),
    ...[...arrivedByLocation].map(([location, names]) => ({ kind: 'arrived', names: names.sort(), location })),
  ];
}

function pendingForPush(beforeRev, afterRev) {
  const commits = git('rev-list', '--reverse', `${beforeRev}..${afterRev}`).split('\n').filter(Boolean);
  const pending = [];
  for (const commit of commits) {
    if (git('log', '-1', '--format=%s', commit).startsWith('data:')) continue;
    const parent = git('rev-parse', `${commit}^`);
    if (!git('diff', '--name-only', parent, commit, '--', MASTER)) continue;
    pending.push(...announcementsFor(readGames(parent), readGames(commit)));
  }
  return pending;
}

async function main() {
  const args = process.argv.slice(2);
  const value = flag => args[args.indexOf(flag) + 1];
  const before = args.includes('--before') ? value('--before') : process.env.GITHUB_EVENT_BEFORE;
  const after = args.includes('--after') ? value('--after') : process.env.GITHUB_SHA;
  if (!before || !after || /^0+$/.test(before)) throw new Error('유효한 이전/현재 커밋이 필요합니다.');
  const pending = pendingForPush(before, after);
  console.log(JSON.stringify(pending, null, 2));
  if (args.includes('--dry-run')) return;
  for (const item of pending) await realInsertAnnouncement(item);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { announcementsFor, pendingForPush };
