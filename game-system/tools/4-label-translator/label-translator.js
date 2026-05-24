const { readJson, writeJson } = require("../_core/file-read-writer");
const { COTTAGE_OWNED_GAMES_MASTER_PATH } = require("../_core/paths");
const { categories: catMap, mechanics: mechMap } = require("../../config/bgg-label-map");

function translateArray(arr, map) {
  return (arr || []).map((item) => map[item] || item);
}

function translateMasterLabels() {
  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const games = masterData.games || {};
  const gameList = Object.values(games);

  if (gameList.length === 0) {
    console.error("master.json가 비어있습니다. 먼저 npm run build:master 를 실행하세요.");
    process.exit(1);
  }

  const unmappedCats = new Set();
  const unmappedMechs = new Set();

  for (const game of gameList) {
    game.categoriesKo = translateArray(game.categories, catMap);
    game.mechanicsKo = translateArray(game.mechanics, mechMap);

    (game.categories || []).forEach((c) => { if (!catMap[c]) unmappedCats.add(c); });
    (game.mechanics || []).forEach((m) => { if (!mechMap[m]) unmappedMechs.add(m); });
  }

  writeJson(COTTAGE_OWNED_GAMES_MASTER_PATH, masterData);

  console.log(`번역 완료: ${gameList.length}개 게임`);

  if (unmappedCats.size) {
    console.warn("미번역 categories:", [...unmappedCats].sort().join(", "));
  }
  if (unmappedMechs.size) {
    console.warn("미번역 mechanics:", [...unmappedMechs].sort().join(", "));
  }
  if (!unmappedCats.size && !unmappedMechs.size) {
    console.log("미번역 항목 없음.");
  }
}

module.exports = { translateMasterLabels };

if (require.main === module) {
  try {
    translateMasterLabels();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
