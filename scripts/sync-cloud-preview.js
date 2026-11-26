const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const exec = promisify(execFile);
const branch = 'cloud-preview';
const repository = 'https://github.com/hoppinn/cottage-board-site.git';

function createPreviewSync(root) {
  const localData = process.env.LOCALAPPDATA;
  const unixData = process.env.XDG_DATA_HOME || (process.env.HOME && path.join(process.env.HOME, '.local', 'share'));
  const data = process.platform === 'win32' ? localData : unixData;
  if (!data) return;
  const expected = path.resolve(data, 'CottageBoardPreview', 'cottage-board-site');
  const normalize = input => process.platform === 'win32' ? input.toLowerCase() : input;
  if (normalize(root) !== normalize(expected)) return;

  const git = async (...args) => {
    const result = await exec('git', args, {
      cwd: root,
      timeout: args[0] === 'ls-remote' ? 5_000 : 25_000,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return result.stdout.trim();
  };
  let lastError;
  let pending;

  async function update() {
    try {
      if ((await git('config', '--get', 'remote.origin.url')).toLowerCase() !== repository ||
          await git('branch', '--show-current') !== branch) {
        throw new Error('테스트 폴더의 주소나 브랜치가 달라 갱신을 멈췄습니다.');
      }
      const previous = await git('rev-parse', 'HEAD');
      const remote = (await git('ls-remote', '--exit-code', 'origin', `refs/heads/${branch}`)).split(/\s+/)[0];
      if (previous !== remote) {
        if (await git('status', '--porcelain')) {
          throw new Error('테스트 폴더에 수정한 파일이 있어 갱신을 멈췄습니다.');
        }
        await git('pull', '--ff-only', '--no-rebase', 'origin', branch);
        const current = await git('rev-parse', 'HEAD');
        if (current !== await git('rev-parse', 'FETCH_HEAD')) {
          throw new Error('테스트 폴더에 별도 커밋이 있어 갱신을 멈췄습니다.');
        }
        if (current !== previous) console.log(`새 테스트본 ${current.slice(0, 7)} 반영 완료`);
      }
      lastError = undefined;
    } catch (error) {
      const message = error.stderr?.trim() || error.message;
      if (message !== lastError) console.warn(`테스트본 동기화 대기: ${message}`);
      lastError = message;
    }
  }

  console.log('페이지를 열거나 새로고침할 때 최신 테스트본을 확인합니다.');
  return () => {
    pending ??= update().finally(() => { pending = undefined; });
    return pending;
  };
}

module.exports = { createPreviewSync };
