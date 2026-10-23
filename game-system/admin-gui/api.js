// 게임 관리 GUI의 JSON API. 실패는 { error: '<평문 한국어>' } + 4xx/5xx.
const fs = require('fs');
const path = require('path');

const { readJson } = require('../tools/_core/file-read-writer');
const {
  COTTAGE_OWNED_GAMES_MASTER_PATH, LIBRARY_IMAGES_THUMB_DIR, GAME_ABBR_PATH, GAME_ABBR_BYNAME_PATH,
} = require('../tools/_core/paths');
const { resolveAbbrEntry } = require('../tools/_core/abbr-audit');
const { saveAbbr } = require('../tools/_core/abbr-edit');
const { getShelfGroupBySourceValue } = require('../config/shelf-locations');
const {
  COOP_VALUE, listPickableLocations, isArrival, findLocationIssues,
} = require('../tools/_core/location-rules');
const realOps = require('../tools/0-input/game-ops');
const { createPublisher } = require('./publish');

const THUMB_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

function send(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': data.length });
  res.end(data);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('요청이 너무 커요.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const buf = await readBody(req);
  try { return buf.length ? JSON.parse(buf.toString('utf8')) : {}; } catch (_) { throw new Error('요청 형식이 올바르지 않아요.'); }
}

function locationLabel(value) {
  if (value === COOP_VALUE) return '협력';
  return getShelfGroupBySourceValue(value)?.label || '';
}

function hasThumb(game) {
  return [game.id, game.ownedName].filter(Boolean)
    .some(name => THUMB_EXTS.some(ext => fs.existsSync(path.join(LIBRARY_IMAGES_THUMB_DIR, name + ext))));
}

function readMasterGames() {
  return Object.values(readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} }).games || {});
}

function listGames() {
  const games = readMasterGames();
  const abbrById = readJson(GAME_ABBR_PATH, {});
  const abbrByName = readJson(GAME_ABBR_BYNAME_PATH, {});
  return {
    games: games.map(g => ({
      id: g.id,
      ownedName: g.ownedName,
      bggId: g.bggId || null,
      location: g.location || '',
      locationLabel: locationLabel(g.location || ''),
      // 위치 선택지(listPickableLocations)의 value와 같은 값 — 화면의 필터·기본 선택용. 해석 안 되면 ''.
      locationValue: g.location === COOP_VALUE ? COOP_VALUE : (getShelfGroupBySourceValue(g.location || '')?.label || ''),
      hasThumb: hasThumb(g),
      // 사이트와 같은 판정(abbr-audit.resolveAbbrEntry). source가 fallback이면 앞 2글자 자동값.
      ...(({ abbr, source }) => ({ abbr, abbrSource: source }))(resolveAbbrEntry(g, abbrById, abbrByName)),
    })),
    locations: listPickableLocations(),
    issues: findLocationIssues(games),
  };
}

/**
 * deps: { ops?, queue, publisher? } — ops 기본은 실제 game-ops, publisher 기본은 같은 queue를 쓰는 실제 publish.
 * 테스트는 setLocation·publisher 등을 주입한다.
 * 반환: (req, res, url) => Promise<boolean> — 처리했으면 true.
 */
function createApi({ ops = {}, queue, publisher = createPublisher({ queue }) }) {
  const o = { ...realOps, saveAbbr, ...ops };

  const routes = {
    'GET /api/health': async () => ({ ok: true }),
    'GET /api/games': async () => listGames(),

    'GET /api/candidates': async (req, url) => ({ candidates: await o.getMatchCandidates(url.searchParams.get('name') || '') }),

    'POST /api/games': async req => {
      const { name, location, announce = true } = await readJsonBody(req);
      const { gameId } = await o.addGame(name, location);
      if (announce) queue.enqueue({ kind: 'new', names: [String(name).trim()], location });
      return { gameId, candidates: await o.getMatchCandidates(String(name).trim()) };
    },

    'POST /api/games/bgg': async req => {
      const { name, bggInput } = await readJsonBody(req);
      const bggId = bggInput ? o.parseBggInput(bggInput) : null;
      if (bggInput && !bggId) throw new Error('BGG 주소나 번호를 알아볼 수 없어요.');
      o.confirmBgg(name, bggId);
      return { bggId };
    },

    'POST /api/locations': async req => {
      const { names = [], location, announce = true } = await readJsonBody(req);
      const changed = [];
      let failure = null;
      for (const name of names) {
        try {
          const { from, to } = await o.setLocation(name, location);
          changed.push({ name, from, to });
        } catch (e) {
          failure = e;
          break;
        }
      }
      // 실패 전까지 실제로 옮겨진 게임의 도착 알림은 남긴다. 일괄 변경은 알림 1건.
      const arrived = changed.filter(c => isArrival(c.from, c.to)).map(c => c.name);
      if (announce && arrived.length) queue.enqueue({ kind: 'arrived', names: arrived, location });
      if (failure) { const e = new Error(failure.message); e.extra = { changed, arrived }; throw e; }
      return { changed, arrived };
    },

    'POST /api/abbr': async req => {
      const { gameId, abbr } = await readJsonBody(req);
      const game = readMasterGames().find(g => g.id === gameId);
      if (!game) throw new Error('없는 게임: ' + gameId);
      o.saveAbbr({ bggId: game.bggId || null, ownedName: game.ownedName }, abbr);
      return { ok: true };
    },

    'POST /api/build': async req => {
      const { gameIds = [], fetchBgg = false, translate = true } = await readJsonBody(req);
      return o.runPipeline({ gameIds, fetchBgg, translate });
    },

    'GET /api/announcements': async () => ({ pending: queue.list() }),
    'GET /api/publish': async () => publisher.getPublishPreview(),
    'POST /api/publish': async () => publisher.publish(),
  };

  return async function handleApi(req, res, url) {
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) return false;
    try {
      send(res, 200, await handler(req, url));
    } catch (e) {
      send(res, 400, { error: e.message, ...(e.extra || {}) });
    }
    return true;
  };
}

module.exports = { createApi, listGames };
