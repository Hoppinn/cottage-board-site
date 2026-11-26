const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const branch = 'refs/heads/cloud-preview';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function publish() {
  if (git(root, 'status', '--porcelain', '--untracked-files=no')) {
    throw new Error('테스트에 보낼 변경을 먼저 커밋하세요.');
  }
  const commit = git(root, 'rev-parse', 'HEAD');
  git(root, 'fetch', '--no-tags', 'origin', branch);
  const previous = git(root, 'rev-parse', 'FETCH_HEAD');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cottage-preview-'));
  const checkout = path.join(temp, 'site');

  try {
    git(root, 'worktree', 'add', '--detach', checkout, previous);
    execFileSync('git', ['merge', '--no-edit', commit], { cwd: checkout, stdio: 'inherit' });
    execFileSync(process.execPath, ['game-system/tools/check-pipeline-status.js'], {
      cwd: checkout,
      stdio: 'inherit',
    });

    const published = git(checkout, 'rev-parse', 'HEAD');
    execFileSync('git', ['push', 'origin', `${published}:${branch}`], { cwd: checkout, stdio: 'inherit' });
    const remote = git(root, 'ls-remote', '--exit-code', 'origin', branch).split(/\s+/)[0];
    if (remote !== published) throw new Error('전송 직후 브랜치가 갱신됐습니다. 최신 테스트본을 확인하세요.');
    console.log(`노트북 테스트본 확인 완료 · ${published.slice(0, 8)}`);
  } finally {
    if (fs.existsSync(checkout)) git(root, 'worktree', 'remove', '--force', checkout);
    fs.rmdirSync(temp);
  }
}

try {
  publish();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
