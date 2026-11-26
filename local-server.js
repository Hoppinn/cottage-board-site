const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const { parseArgs } = require('node:util');

const siteFiles = new Set(['index.html', 'auth-callback.html', 'favicon.ico', 'robots.txt', 'sitemap.xml']);
const siteDirectories = [
  'assets/',
  'pages/',
  'game-system/config/',
  'game-system/game-data/library/3-output/',
  'game-system/game-data/library/images/',
];
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
};

function isSiteFile(relative) {
  return siteFiles.has(relative) || siteDirectories.some(directory => relative.startsWith(directory));
}

async function serve(root, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  const segments = urlPath.slice(1).split('/');
  if (!urlPath.startsWith('/') || /[\\:\x00-\x1f]/.test(urlPath) ||
      segments.some(segment => segment.startsWith('.') || segment.endsWith(' ') || segment.endsWith('.'))) {
    res.writeHead(404).end('Not found');
    return;
  }

  let relative = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  if (!path.extname(relative) && !relative.endsWith('/')) relative += '.html';
  const contentType = contentTypes[path.extname(relative).toLowerCase()];
  if (!contentType || !isSiteFile(relative)) {
    res.writeHead(404).end('Not found');
    return;
  }

  let file;
  try {
    const resolved = await fs.realpath(path.join(root, relative));
    const resolvedRelative = path.relative(root, resolved).split(path.sep).join('/');
    if (resolvedRelative !== relative) {
      res.writeHead(404).end('Not found');
      return;
    }
    file = await fs.open(resolved, 'r');
    const stat = await file.stat();
    if (!stat.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') res.end();
    else await pipeline(file.createReadStream({ autoClose: false }), res);
  } catch (error) {
    if (res.destroyed) return;
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const missing = ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(error.code);
    res.writeHead(missing ? 404 : 500).end(missing ? 'Not found' : 'Unable to serve file');
    if (!missing) console.error(error.message);
  } finally {
    await file?.close();
  }
}

function openBrowser(url) {
  let command = 'xdg-open';
  let args = [url];
  if (process.platform === 'darwin') command = 'open';
  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/d', '/c', 'start', url];
  }
  const child = spawn(command, args, { stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.log(`브라우저에서 직접 열기: ${url}`));
  child.on('exit', code => {
    if (code) console.log(`브라우저에서 직접 열기: ${url}`);
  });
  child.unref();
}

async function main() {
  const { values } = parseArgs({
    options: {
      host: { type: 'string', default: '127.0.0.1' },
      port: { type: 'string', default: '3000' },
      open: { type: 'boolean' },
    },
  });
  const port = Number(values.port);
  if (!/^\d+$/.test(values.port) || port < 1 || port > 65535) {
    throw new Error('--port에 1~65535 사이의 포트를 입력하세요.');
  }

  const root = await fs.realpath(__dirname);
  const url = `http://127.0.0.1:${port}/`;
  const server = http.createServer((req, res) => {
    serve(root, req, res).catch(error => {
      console.error(error.message);
      res.destroy();
    });
  });
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? `포트 ${port} 사용 중. 열려 있는 서버를 확인하거나 --port로 다른 번호를 선택하세요.`
      : error.message);
    process.exitCode = 1;
  });
  server.listen(port, values.host, () => {
    console.log(`코티지보드 로컬 서버 · ${url}\n종료: Ctrl+C`);
    if (values.open) openBrowser(url);
  });
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
