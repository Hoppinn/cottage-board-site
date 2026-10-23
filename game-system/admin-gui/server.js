// 게임 관리 GUI 로컬 서버. 127.0.0.1에만 열린다.
//   /            → admin-gui/index.html
//   /gui/*       → admin-gui 폴더 정적 파일
//   /site/*      → 리포 루트 정적 파일(읽기 전용) — GUI가 사이트의 supabase-client.js를 로드
//   /api/*       → api.js
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createApi } = require('./api');
const { createQueue } = require('./announce-queue');

const ROOT = path.resolve(__dirname, '../..');
const GUI_DIR = __dirname;
const PORT = 5178;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

// 루트 밖으로 나가거나 점으로 시작하는 경로(.env, .git …)는 거부한다.
function resolveStatic(baseDir, relPath) {
  const segments = relPath.split('/').filter(Boolean);
  if (segments.some(s => s === '..' || s.startsWith('.'))) return null;
  const full = path.resolve(baseDir, ...segments);
  return full.startsWith(baseDir + path.sep) ? full : null;
}

function serveFile(res, full) {
  if (!full) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

function createAdminServer({ ops, queue = createQueue(), publisher } = {}) {
  const handleApi = createApi({ ops, queue, ...(publisher ? { publisher } : {}) });
  return http.createServer(async (req, res) => {
    // URL 생성자는 '..'을 정규화하므로 판정은 원본 경로 문자열로 한다.
    const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (rawPath.startsWith('/api/')) {
      if (!(await handleApi(req, res, url))) { res.writeHead(404); res.end('not found'); }
      return;
    }
    if (rawPath === '/' || rawPath === '/index.html') return serveFile(res, path.join(GUI_DIR, 'index.html'));
    if (rawPath.startsWith('/gui/')) return serveFile(res, resolveStatic(GUI_DIR, rawPath.slice('/gui/'.length)));
    if (rawPath.startsWith('/site/')) return serveFile(res, resolveStatic(ROOT, rawPath.slice('/site/'.length)));
    res.writeHead(404); res.end('not found');
  });
}

if (require.main === module) {
  createAdminServer().listen(PORT, '127.0.0.1', () => {
    console.log(`게임 관리 화면: http://127.0.0.1:${PORT}`);
  });
}

module.exports = { createAdminServer, PORT };
