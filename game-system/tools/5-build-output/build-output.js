const fs = require("fs");

const { readJson, writeJson } = require("../_core/file-read-writer");

const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_GAMES_DATA_JS_PATH,
  COTTAGE_GAMES_DATA_JSON_PATH,
} = require("../_core/paths");

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
      comment: makeTextBlock(game.comment || "", "manual"),
      ruleSummary: makeTextBlock("", "none"),
      recommendPoint: makeTextBlock("", "none"),
      caution: "",
      youtubeUrl: "",
    },

    images: {
      main: game.image || "",
      thumbnail: game.thumbnail || "",
      source: game.image ? "bgg" : "none",
      type: "jpg",
    },

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

  const gameData = {};

  masterGames.forEach((game) => {
    if (!game.id || !game.ownedName) return;
    gameData[game.id] = buildGameItem(game);
  });

  writeJson(COTTAGE_GAMES_DATA_JSON_PATH, gameData);

  const jsText =
    `const gameData = ${JSON.stringify(gameData, null, 2)};\n\n` +
    `if (typeof window !== "undefined") {\n` +
    `  window.gameData = gameData;\n` +
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
