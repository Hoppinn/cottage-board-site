const ExcelJS = require("exceljs");
const fs = require("fs");

const { readJson } = require("../core/read-write");

const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH,
  BGG_DETAILS_CACHE_PATH,
} = require("../core/paths");

function saveMaster(master) {
  fs.writeFileSync(
    COTTAGE_OWNED_GAMES_MASTER_PATH,
    JSON.stringify(master, null, 2),
    "utf8"
  );
}

async function appendLedgerRow(game) {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(
    COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH
  );

  const worksheet = workbook.getWorksheet("보유게임리스트");

  const nextRowNumber = worksheet.rowCount + 1;

  worksheet.getCell(nextRowNumber, 1).value =
    game.ownedName;

  worksheet.getCell(nextRowNumber, 2).value =
    "-";

  worksheet.getCell(nextRowNumber, 3).value =
    "";

  worksheet.getCell(nextRowNumber, 4).value =
    "";

  worksheet.getCell(nextRowNumber, 5).value =
    0;

  await workbook.xlsx.writeFile(
    COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH
  );

  console.log(
    "ledger 추가 완료:",
    game.ownedName
  );
}

function createGameId(gameName) {
  return String(gameName || "")
    .trim()
    .replace(/\s+/g, "-");
}

function findBggDetailByOwnedName(gameName) {
  const detailsCache = readJson(BGG_DETAILS_CACHE_PATH, {});
  const cleanName = String(gameName || "").trim();

  return Object.values(detailsCache).find((detail) => {
    return (
      detail.title === cleanName ||
      detail.titleKo === cleanName ||
      detail.titleEn === cleanName
    );
  });
}

function createResolvedGame(gameName) {
  const cleanName = String(gameName || "").trim();
  const id = createGameId(cleanName);
  const bggDetail = findBggDetailByOwnedName(cleanName);

  return {
  id,
  ownedName: cleanName,
  titleKo: cleanName,
  titleEn:
  bggDetail?.titleEn ||
  bggDetail?.title ||
  "",

  bggId: bggDetail?.bggId || null,
  yearPublished: bggDetail?.yearpublished
    ? Number(bggDetail.yearpublished)
    : null,

  minPlayers: bggDetail?.minplayers
    ? Number(bggDetail.minplayers)
    : null,

  maxPlayers: bggDetail?.maxplayers
    ? Number(bggDetail.maxplayers)
    : null,

  playingTime: bggDetail?.playingtime
    ? Number(bggDetail.playingtime)
    : null,

  minPlayTime: bggDetail?.minplaytime
    ? Number(bggDetail.minplaytime)
    : null,

  maxPlayTime: bggDetail?.maxplaytime
    ? Number(bggDetail.maxplaytime)
    : null,

  minAge: bggDetail?.minage
    ? Number(bggDetail.minage)
    : null,

  difficulty: bggDetail?.averageweight
    ? Number(bggDetail.averageweight)
    : null,

  rating: bggDetail?.average
    ? Number(bggDetail.average)
    : null,

  bayesRating: bggDetail?.bayesaverage
    ? Number(bggDetail.bayesaverage)
    : null,

  usersRated: bggDetail?.usersrated
    ? Number(bggDetail.usersrated)
    : null,

  rank: bggDetail?.rank && bggDetail.rank !== "Not Ranked"
    ? Number(bggDetail.rank)
    : null,

  designers: bggDetail?.designers || [],
  artists: bggDetail?.artists || [],
  publishers: bggDetail?.publishers || [],

  categories: bggDetail?.categories || [],
  mechanics: bggDetail?.mechanics || [],

  recommendedPlayers:
    bggDetail?.suggested_numplayers?.recommended || [],

  bestPlayers:
    bggDetail?.suggested_numplayers?.best || [],

  notRecommendedPlayers:
    bggDetail?.suggested_numplayers?.not_recommended || [],

  location: "",
  comment: "",
  tags: [],

  image: bggDetail?.image || "",
  thumbnail: bggDetail?.thumbnail || "",
  description: bggDetail?.description || "",

  status: bggDetail ? "ready" : "pending-cache",

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  source: {
    base: bggDetail ? "bgg-cache" : "manual-input",
    overrides: [
  "ownedName",
  "titleKo",
  "bestPlayers",
  "recommendedPlayers",
  "location",
  "comment",
  "tags",
],
  },
};
}

async function addOwnedGame(gameName) {
  const cleanName = String(gameName || "").trim();

  if (!cleanName) {
    console.log("게임 이름 필요");
    return;
  }

  const master = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, {
    version: 1,
    source: "cottageboard-master",
    games: {},
  });

  const resolvedGame = createResolvedGame(cleanName);

  if (master.games[resolvedGame.id]) {
    console.log("이미 존재:", resolvedGame.id);
    return;
  }

  master.games[resolvedGame.id] = resolvedGame;

  saveMaster(master);
await appendLedgerRow(resolvedGame);
  console.log("master 추가 완료:");
  console.log(JSON.stringify(resolvedGame, null, 2));
}

const gameName = process.argv[2];

addOwnedGame(gameName);