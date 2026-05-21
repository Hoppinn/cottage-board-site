const {
  readJson,
} = require("../core/read-write");

const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
} = require("../core/paths");

function showMasterGames() {
  const master = readJson(
    COTTAGE_OWNED_GAMES_MASTER_PATH,
    {
      version: 1,
      source: "cottageboard-master",
      games: {},
    }
  );

  const games = master.games || {};
  const gameIds = Object.keys(games);

  console.log("Cottageboard master DB");
  console.log({
    path: COTTAGE_OWNED_GAMES_MASTER_PATH,
    version: master.version,
    source: master.source,
    total: gameIds.length,
  });

  if (gameIds.length > 0) {
    console.log("Sample:");
    gameIds.slice(0, 10).forEach((id) => {
      console.log("-", id, games[id]?.title?.owned || "");
    });
  }
}

showMasterGames();
