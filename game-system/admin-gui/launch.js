// 바탕화면 아이콘이 부르는 진입점(`npm run admin`). 이미 떠 있으면 브라우저만 다시 연다 —
// 아이콘을 두 번 눌러도 같은 포트에 서버를 또 띄우다 EADDRINUSE로 죽지 않게.
const http = require('http');
const { spawn } = require('child_process');
const { createAdminServer, PORT } = require('./server');

function isRunning(port) {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1500 }, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// WSL에서는 윈도우 기본 브라우저로 연다. 실패하면 주소만 보여준다.
function openBrowser(url) {
  const child = spawn('explorer.exe', [url], { stdio: 'ignore', detached: true });
  child.on('error', () => console.log(`브라우저에서 이 주소를 열어 주세요: ${url}`));
  child.unref();
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = createAdminServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function launch({ port = PORT, open = openBrowser, start = startServer } = {}) {
  const url = `http://127.0.0.1:${port}`;
  if (await isRunning(port)) {
    open(url);
    return { reused: true, url };
  }
  await start(port);
  console.log(`게임 관리 화면: ${url}  (이 창을 닫으면 프로그램이 꺼져요)`);
  open(url);
  return { reused: false, url };
}

if (require.main === module) {
  launch().catch(e => { console.error('게임 관리 화면을 시작하지 못했어요:', e.message); process.exit(1); });
}

module.exports = { launch, isRunning };
