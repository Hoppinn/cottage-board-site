const fs = require("fs");
const path = require("path");

const { readJson, writeJson } = require("../_core/file-read-writer");

const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_GAMES_DATA_JS_PATH,
  COTTAGE_GAMES_DATA_JSON_PATH,
  GAME_ABBR_PATH,
  GAME_ABBR_BYNAME_PATH,
  GAME_ABBR_MIGRATION_MANIFEST_PATH,
  LIBRARY_IMAGES_THUMB_DIR,
  ROOT_DIR,
} = require("../_core/paths");
const {
  loadAbbrMigrationManifest,
  resolveAbbrEntry,
  auditAbbrSources,
} = require("../_core/abbr-audit");

const THUMB_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

function findLocalThumb(game) {
  const names = [game.id, game.ownedName].filter(Boolean);
  for (const name of names) {
    for (const ext of THUMB_EXTS) {
      const filePath = path.join(LIBRARY_IMAGES_THUMB_DIR, name + ext);
      if (fs.existsSync(filePath)) {
        return path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
      }
    }
  }
  return null;
}

const { mergeCottageTags } = require("../_core/auto-tagger");

const {
  getShelfGroupBySourceValue,
  getShelfGroupDisplay,
} = require("../../config/shelf-locations");

function toNumber(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function toArray(value) {
  if (!value) return [];
  return String(value)
    .split(/[,/|·ㆍ]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function makeTextBlock(text, source = "manual") {
  const clean = String(text || "").trim();
  return { text: clean, source: clean ? source : "none" };
}

function buildRawGameItem(game) {
  const recommended = game.recommendedPlayers || [];
  const best = game.bestPlayers || [];

  const shelfGroup = getShelfGroupBySourceValue(game.location || "");
  const shelfInfo = shelfGroup
    ? getShelfGroupDisplay(shelfGroup.id)
    : {
        shelfGroupId: game.location || "",
        shelfLabel: game.location || "-",
        shelfFullLabel: game.location || "-",
      };

  return {
    id: game.id,

    title: {
      display: game.ownedName,
      owned: game.ownedName,
      bgg: game.titleEn || "",
    },

    bgg: {
      id: game.bggId || "",
      matchStatus: game.matchStatus || "unmatched",
      year: game.yearPublished ? String(game.yearPublished) : "",
      rating: toNumber(game.rating, 0) || toNumber(game.sourceRating, 0),
      weight: toNumber(game.difficulty, 0) || toNumber(game.difficultyWeight, 0),
      minPlayers: toNumber(game.minPlayers, 0) || (recommended.length ? Math.min(...recommended) : 0),
      maxPlayers: toNumber(game.maxPlayers, 0) || (recommended.length ? Math.max(...recommended) : 0),
      bestPlayers: best,
      recommendedPlayers: recommended,
      notRecommendedPlayers: game.notRecommendedPlayers || [],
      playingTime: toNumber(game.playingTime, 0),
      minPlayTime: toNumber(game.minPlayTime, 0),
      maxPlayTime: toNumber(game.maxPlayTime, 0),
      categories: game.categories || [],
      categoriesKo: game.categoriesKo || [],
      mechanics: game.mechanics?.length ? game.mechanics : toArray(game.sourceMechanism || ""),
      mechanicsKo: game.mechanicsKo || [],
      designers: game.designers || [],
      description: game.description || "",
      descriptionKo: game.descriptionKo || "",
    },

    cottage: {
      status: "active",
      shelfGroupId: shelfInfo.shelfGroupId,
      shelfLabel: shelfInfo.shelfLabel,
      shelfFullLabel: shelfInfo.shelfFullLabel,
      difficultyId: "",
      difficultyWeight: toNumber(game.difficultyWeight, 0) || toNumber(game.difficulty, 0),
      moodTags: [],
      playTags: [],
      situationTags: [],
      interactionTags: [],
      relationshipTags: [],
      manualTags: game.tags || [],
      autoTags: [],
      displayTags: [],
      summaryKo: game.summaryKo || "",
      comment: makeTextBlock(game.comment || "", "manual"),
      ruleSummary: makeTextBlock("", "none"),
      recommendPoint: makeTextBlock("", "none"),
      caution: "",
      youtubeUrl: game.youtubeUrl || "",
    },

    images: (() => {
      const localThumb = findLocalThumb(game);
      return {
        main: localThumb || game.image || "",
        thumbnail: localThumb || game.thumbnail || "",
        source: localThumb ? "local" : (game.image ? "bgg" : "none"),
        type: localThumb ? path.extname(localThumb).slice(1) : "jpg",
        localOverride: localThumb || undefined,
      };
    })(),

    community: {
      reviewEnabled: true,
      ratingEnabled: true,
      boardId: game.id,
    },
  };
}

function buildGameItem(game) {
  return mergeCottageTags(buildRawGameItem(game));
}

function buildCottageGameData() {
  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const masterGames = Object.values(masterData.games || {});

  if (masterGames.length === 0) {
    console.error("master.json가 비어있습니다. 먼저 npm run build:master 를 실행하세요.");
    process.exit(1);
  }

  const abbrMap = readJson(GAME_ABBR_PATH, {});
  const abbrByName = readJson(GAME_ABBR_BYNAME_PATH, {});
  const migrationManifest = loadAbbrMigrationManifest(GAME_ABBR_MIGRATION_MANIFEST_PATH);
  const sourceAudit = auditAbbrSources(
    masterGames,
    abbrMap,
    abbrByName,
    migrationManifest.requiredBggIds
  );
  if (sourceAudit.migrationMissing.length || sourceAudit.duplicateSources.length) {
    const details = [];
    if (sourceAudit.migrationMissing.length) {
      details.push(`이관 manifest 누락: ${sourceAudit.migrationMissing.join(", ")}`);
    }
    if (sourceAudit.duplicateSources.length) {
      details.push(`ID/이름 맵 중복 정본: ${sourceAudit.duplicateSources.map((g) => g.ownedName).join(", ")}`);
    }
    throw new Error(`[ABBR SOURCE] ${details.join(" / ")}`);
  }

  const gameData = {};
  const abbrSourceMap = {};

  masterGames.forEach((game) => {
    if (!game.id || !game.ownedName) return;
    const item = buildGameItem(game);
    const resolved = resolveAbbrEntry(game, abbrMap, abbrByName);
    item.abbr = resolved.abbr;
    abbrSourceMap[game.id] = resolved.source;
    gameData[game.id] = item;
  });

  // ── 약칭 충돌 린트: fallback 포함 그룹만 경고 (manual끼리 중복은 의도됨)
  const abbrIndex = {};
  Object.entries(gameData).forEach(([id, g]) => {
    if (!abbrIndex[g.abbr]) abbrIndex[g.abbr] = [];
    abbrIndex[g.abbr].push({ name: g.title.display, source: abbrSourceMap[id] });
  });
  const abbrConflicts = Object.entries(abbrIndex).filter(
    ([, list]) => list.length > 1 && list.some((m) => m.source === "fallback")
  );
  if (abbrConflicts.length > 0) {
    console.warn(`[ABBR LINT] 약칭 충돌 ${abbrConflicts.length}건 (fallback 포함):`);
    abbrConflicts.forEach(([abbr, members]) =>
      console.warn(`  "${abbr}" → ${members.map((m) => `${m.name}(${m.source})`).join(", ")}`)
    );
  }
  // ─────────────────────────────────────────────────────────────────────

  writeJson(COTTAGE_GAMES_DATA_JSON_PATH, gameData);

  const jsText =
    `const gameData = ${JSON.stringify(gameData, null, 2)};\n\n` +
    `const cottageGameAbbrByName = ${JSON.stringify(abbrByName, null, 2)};\n\n` +
    `if (typeof window !== "undefined") {\n` +
    `  window.gameData = gameData;\n` +
    `  window.COTTAGE_GAME_ABBR_BY_NAME = cottageGameAbbrByName;\n` +
    `}\n`;

  fs.writeFileSync(COTTAGE_GAMES_DATA_JS_PATH, jsText, "utf-8");

  const total = Object.keys(gameData).length;
  const withImage = Object.values(gameData).filter((g) => g.images.main).length;

  console.log("output built:");
  console.log({ total, withImage, js: COTTAGE_GAMES_DATA_JS_PATH });
}

module.exports = { buildCottageGameData };

if (require.main === module) {
  try {
    buildCottageGameData();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
