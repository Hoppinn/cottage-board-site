// BGG 데이터가 없는 게임의 사람 입력 기본정보. build-master가 BGG 값이 없을 때만 쓴다 —
// 마스터 JSON에 직접 넣으면 다음 빌드에서 BGG 빈 값으로 지워지기 때문(PROJECT_STATE §5 옛 항목).
// 사진은 여기 두지 않는다: library/images/thumb/{gameId}.{ext}가 정본(build-output findLocalThumb).
const fs = require('fs');
const path = require('path');
const { LIBRARY_MISSING_FILL_DIR, LIBRARY_IMAGES_THUMB_DIR } = require('./paths');

const MANUAL_FILL_PATH = path.join(LIBRARY_MISSING_FILL_DIR, 'manual-game-info.json');
const FIELDS = ['minPlayers', 'maxPlayers', 'minPlayTime', 'maxPlayTime', 'playingTime', 'minAge', 'description'];

function readManualFill(filePath = MANUAL_FILL_PATH) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return {}; } // 파일 없음 = 수동 정보 없음
}

function saveManualFill(gameId, fields, filePath = MANUAL_FILL_PATH) {
  const all = readManualFill(filePath);
  const entry = { ...(all[gameId] || {}) };
  for (const key of FIELDS) {
    if (!(key in (fields || {}))) continue;
    const v = fields[key];
    const empty = v === null || v === undefined || String(v).trim() === '';
    if (empty) delete entry[key];
    else entry[key] = key === 'description' ? String(v).trim() : Number(v);
  }
  if (Object.keys(entry).length) all[gameId] = entry;
  else delete all[gameId];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(all, null, 2) + '\n', 'utf8');
}

// build-output findLocalThumb이 읽는 확장자와 같다. 같은 게임의 다른 형식 사진은 지워 하나만 남긴다.
const THUMB_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
const THUMB_MAX_BYTES = 10 * 1024 * 1024;

function saveThumb(gameId, ext, buffer, dir = LIBRARY_IMAGES_THUMB_DIR) {
  const id = String(gameId || '');
  if (!id || /[\\/]/.test(id) || id.startsWith('.')) throw new Error('게임을 알아볼 수 없어요.');
  const e = String(ext || '').toLowerCase();
  if (!THUMB_EXTS.includes(e)) throw new Error('사진은 png·jpg·jpeg·webp만 올릴 수 있어요.');
  if (buffer.length > THUMB_MAX_BYTES) throw new Error('사진이 너무 커요(10MB까지).');
  fs.mkdirSync(dir, { recursive: true });
  for (const other of THUMB_EXTS) {
    const p = path.join(dir, id + other);
    if (other !== e && fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.writeFileSync(path.join(dir, id + e), buffer);
}

module.exports = { MANUAL_FILL_PATH, FIELDS, readManualFill, saveManualFill, THUMB_MAX_BYTES, saveThumb };
