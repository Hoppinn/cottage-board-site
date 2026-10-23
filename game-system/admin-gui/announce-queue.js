// 회원 종 알림 대기열. 사이트 반영(push)이 성공한 뒤에만 보내야 하므로 저장 시점엔 쌓아만 둔다.
// 리포 밖에 둔다 — 리포 안에 쓰면 Live Server가 감시하다 페이지를 리로드한다(CLAUDE.md).
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_PATH = path.join(os.homedir(), '.cottage-admin', 'pending-announcements.json');

function createQueue(filePath = DEFAULT_PATH) {
  function list() {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return []; } // 파일 없음 = 빈 대기열
  }
  function save(items) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  }
  function enqueue(item) {
    save([...list(), { ...item, id: crypto.randomUUID(), queuedAt: new Date().toISOString() }]);
  }
  function remove(items) {
    const gone = new Set(items.map(i => i.id));
    save(list().filter(i => !gone.has(i.id)));
  }
  return { list, enqueue, remove, filePath };
}

module.exports = { createQueue, DEFAULT_PATH };
