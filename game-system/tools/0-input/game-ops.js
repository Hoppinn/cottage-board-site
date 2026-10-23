/**
 * 게임 추가·위치 변경·빌드의 비대화형 진입점 — add-game.js(CLI)와 게임 관리 GUI가 함께 쓴다.
 * 터미널 질문(readline)은 여기 없다. 사람에게 물을 것은 호출부(CLI 프롬프트 / GUI 화면)가 묻는다.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { readJson, writeJson } = require('../_core/file-read-writer');
const {
  BGG_MATCH_MAP_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_XLSX_PATH,
} = require('../_core/paths');
const { isPickable } = require('../_core/location-rules');
const { readXlsxNormalized } = require('./from-file/import-from-xlsx');
const { addOwnedGame, updateXlsxLocation } = require('./from-name/add-owned-game');
const { autoResolveBggMatches } = require('../1-matcher/b_run-local-match');

const ROOT = path.resolve(__dirname, '../../..');

function parseBggInput(text) {
  const s = String(text || '').trim();
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)/i);
  return m ? m[1] : null;
}

// BGG ID 수동 확정. null이면 'skip'(BGG 없음)으로 기록한다.
function saveForced(name, bggIdOrSkip) {
  const overrides = readJson(FORCED_BGG_OVERRIDES_PATH, {});
  overrides[name] = bggIdOrSkip;
  writeJson(FORCED_BGG_OVERRIDES_PATH, overrides);
}

function confirmBgg(name, bggId) {
  saveForced(name, bggId || 'skip');
}

// Excel이 파일을 열고 있으면 같은 폴더에 `~$파일명` 잠금 파일이 생긴다.
function assertXlsxWritable() {
  const lock = path.join(path.dirname(COTTAGE_OWNED_GAMES_XLSX_PATH), '~$' + path.basename(COTTAGE_OWNED_GAMES_XLSX_PATH));
  if (fs.existsSync(lock)) throw new Error('엑셀 파일이 열려 있어요. Excel을 닫고 다시 시도해 주세요.');
}

function findMasterGame(name) {
  const master = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const game = Object.values(master.games || {}).find(g => g.ownedName === name) || null;
  return { master, game };
}

async function getMatchCandidates(name) {
  await autoResolveBggMatches();
  const r = readJson(BGG_MATCH_MAP_PATH, {})[name];
  if (!r) return [];
  const list = [];
  if (r.bggId) list.push({ bggId: String(r.bggId), bggName: r.bggName || '', year: r.year || null, score: r.score ?? null, status: r.status });
  for (const c of [r.bestGuess, ...(r.reviewCandidates || [])].filter(Boolean)) {
    if (list.some(x => x.bggId === String(c.bggId))) continue;
    list.push({ bggId: String(c.bggId), bggName: c.bggName || '', year: c.year || null, score: c.score ?? null, status: r.status });
  }
  return list;
}

async function addGame(name, location) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('게임 이름을 입력해 주세요.');
  if (findMasterGame(clean).game) throw new Error('이미 있는 게임이에요: ' + clean);
  if (!isPickable(location)) throw new Error('고를 수 없는 위치예요: ' + (location || '(빈칸)'));
  assertXlsxWritable();
  await addOwnedGame(clean, { location });
  const { rows } = await readXlsxNormalized(COTTAGE_OWNED_GAMES_XLSX_PATH);
  const row = rows.find(r => r.ownedName === clean);
  if (!row) throw new Error('엑셀에 게임을 추가하지 못했어요: ' + clean);
  return { gameId: row.id };
}

async function setLocation(name, location) {
  const { master, game } = findMasterGame(name);
  if (!game) throw new Error('없는 게임: ' + name);
  if (!isPickable(location)) throw new Error('고를 수 없는 위치예요: ' + (location || '(빈칸)'));
  assertXlsxWritable();
  const from = game.location || '';
  const saved = await updateXlsxLocation(name, location);
  if (!saved) throw new Error('엑셀에 위치를 저장하지 못했어요: ' + name);
  game.location = location;
  fs.writeFileSync(COTTAGE_OWNED_GAMES_MASTER_PATH, JSON.stringify(master, null, 2), 'utf8');
  return { from, to: location };
}

// ── 빌드 파이프라인 ─────────────────────────────────────

function hasAnthropicKey(env) {
  if (env.ANTHROPIC_API_KEY) return true;
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return false;
  return /^ANTHROPIC_API_KEY=\S+/m.test(fs.readFileSync(envPath, 'utf8'));
}

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: ROOT });
    let tail = '';
    const keep = d => { tail = (tail + d.toString()).slice(-2000); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(tail.trim().split('\n').slice(-3).join(' / ') || `exit ${code}`))));
  });
}

const TOOLS = 'game-system/tools';
async function defaultRun(name, arg = {}) {
  if (name === 'match') return autoResolveBggMatches();
  if (name === 'fetch-bgg') return runNode([`${TOOLS}/2-fetcher/a_fetch-bgg-game-data-by-id.js`]);
  if (name === 'build-master') return runNode([`${TOOLS}/3-build-master/build-master.js`]);
  if (name === 'label-translate') return runNode([`${TOOLS}/4-label-translator/label-translator.js`]);
  if (name === 'build-output') return runNode([`${TOOLS}/5-build-output/build-output.js`]);
  if (name === 'translate') {
    // add-game.js와 같은 조건: 이미 있는 번역은 다시 만들지 않는다(API 비용).
    const game = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} }).games?.[arg.gameId];
    if (!game?.description?.trim()) return;
    const script = `${TOOLS}/4-label-translator/description-translator.js`;
    if (!game.descriptionKo) await runNode([script, '--game-id', arg.gameId]);
    if (!game.summaryKo) await runNode([script, '--game-id', arg.gameId, '--summary']);
    return;
  }
  throw new Error('알 수 없는 단계: ' + name);
}

/**
 * 단계: (fetchBgg) match → fetch-bgg → build-master → label-translate → (translate) translate → build-output.
 * 실패한 단계에서 멈춘다. 번역은 키가 없으면 실패가 아니라 'skipped'(번역 대기).
 * deps: { run(name, arg), env } — 테스트 주입용. 기본은 실제 실행·process.env.
 */
async function runPipeline({ gameIds = [], fetchBgg = false, translate = false } = {}, onStep, deps = {}) {
  const run = deps.run || defaultRun;
  const env = deps.env || process.env;
  const steps = [];
  const report = step => { steps.push(step); onStep?.(step); };

  const plan = [
    ...(fetchBgg ? ['match', 'fetch-bgg'] : []),
    'build-master',
    'label-translate',
    ...(translate ? ['translate'] : []),
    'build-output',
  ];
  for (const name of plan) {
    if (name === 'translate') {
      if (!gameIds.length) { report({ name, status: 'skipped', note: '번역할 게임 없음' }); continue; }
      if (!hasAnthropicKey(env)) { report({ name, status: 'skipped', note: '번역 대기 — 키를 넣고 나중에 다시' }); continue; }
      try {
        for (const gameId of gameIds) await run(name, { gameId });
        report({ name, status: 'ok' });
      } catch (e) {
        // 번역 실패는 사이트 반영을 막지 않는다(add-game.js의 runOptional과 같은 취급).
        report({ name, status: 'failed', note: e.message });
      }
      continue;
    }
    try {
      await run(name);
      report({ name, status: 'ok' });
    } catch (e) {
      report({ name, status: 'failed', note: e.message });
      return { ok: false, steps };
    }
  }
  return { ok: true, steps };
}

module.exports = {
  parseBggInput,
  saveForced,
  confirmBgg,
  assertXlsxWritable,
  getMatchCandidates,
  addGame,
  setLocation,
  runPipeline,
};
