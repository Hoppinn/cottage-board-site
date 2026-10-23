// 약칭 수동 정본(game-abbr.json: bggId → 약칭, game-abbr-byname.json: 게임명 → 약칭) 편집.
// 같은 게임을 두 맵에 함께 두지 않는다(PROJECT_STRUCTURE §7 약칭 운영 원칙).
const fs = require('fs');
const { GAME_ABBR_PATH, GAME_ABBR_BYNAME_PATH } = require('./paths');

function applyAbbr(maps, game, abbr) {
  const byId = { ...maps.byId };
  const byName = { ...maps.byName };
  const value = String(abbr || '').trim();
  const id = game.bggId ? String(game.bggId) : '';
  if (id) delete byId[id];
  delete byName[game.ownedName];
  if (value) {
    if (id) byId[id] = value;
    else byName[game.ownedName] = value;
  }
  return { byId, byName };
}

// 숫자 키는 JS 객체에 넣는 순간 오름차순으로 재정렬된다 — 파일 순서를 지키려고 [키, 값] 쌍으로 다룬다.
// 두 파일은 한 줄에 한 쌍인 평평한 JSON이다(왕복 무손실은 테스트가 보장).
function parsePairs(text) {
  return Object.keys(JSON.parse(text)).length === 0 ? [] : text.split('\n')
    .map(line => line.match(/^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*"),?\s*$/))
    .filter(Boolean)
    .map(m => [JSON.parse(m[1]), JSON.parse(m[2])]);
}

function serializePairs(pairs) {
  if (!pairs.length) return '{}\n';
  return '{\n' + pairs.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n';
}

function mergePairs(pairs, obj) {
  const kept = pairs.filter(([k]) => Object.prototype.hasOwnProperty.call(obj, k)).map(([k]) => [k, obj[k]]);
  const known = new Set(kept.map(([k]) => k));
  return [...kept, ...Object.keys(obj).filter(k => !known.has(k)).map(k => [k, obj[k]])];
}

function saveAbbr(game, abbr) {
  const idPairs = parsePairs(fs.readFileSync(GAME_ABBR_PATH, 'utf8'));
  const namePairs = parsePairs(fs.readFileSync(GAME_ABBR_BYNAME_PATH, 'utf8'));
  const next = applyAbbr({ byId: Object.fromEntries(idPairs), byName: Object.fromEntries(namePairs) }, game, abbr);
  fs.writeFileSync(GAME_ABBR_PATH, serializePairs(mergePairs(idPairs, next.byId)), 'utf8');
  fs.writeFileSync(GAME_ABBR_BYNAME_PATH, serializePairs(mergePairs(namePairs, next.byName)), 'utf8');
}

module.exports = { applyAbbr, parsePairs, serializePairs, mergePairs, saveAbbr };
