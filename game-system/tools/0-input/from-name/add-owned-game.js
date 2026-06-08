const ExcelJS = require("exceljs");
const fs = require("fs");

const { readJson } = require("../../_core/file-read-writer");

const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_XLSX_PATH,
  BGG_GAME_DETAILS_PATH,
} = require("../../_core/paths");

function saveMaster(master) {
  fs.writeFileSync(
    COTTAGE_OWNED_GAMES_MASTER_PATH,
    JSON.stringify(master, null, 2),
    "utf8"
  );
}

function findHeaderInfo(worksheet) {
  for (let rn = 1; rn <= Math.min(worksheet.rowCount, 10); rn++) {
    const row = worksheet.getRow(rn);
    let found = false;
    row.eachCell(cell => {
      if (String(cell.value || "").trim() === "보유게임명") found = true;
    });
    if (found) {
      const headerMap = {};
      row.eachCell((cell, colNum) => {
        const h = String(cell.value || "").trim();
        if (h) headerMap[h] = colNum;
      });
      return { headerRowNum: rn, headerMap };
    }
  }
  return null;
}

function findCol(headerMap, candidates) {
  for (const name of candidates) {
    if (headerMap[name] != null) return headerMap[name];
  }
  return null;
}

// xlsx에서 기존 행의 위치 컬럼만 수정
async function updateXlsxLocation(ownedName, location) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(COTTAGE_OWNED_GAMES_XLSX_PATH);
  const worksheet = workbook.getWorksheet("보유게임리스트") || workbook.worksheets[0];
  if (!worksheet) {
    console.warn("xlsx: 시트를 찾을 수 없음");
    return false;
  }

  const headerInfo = findHeaderInfo(worksheet);
  if (!headerInfo) {
    console.warn("xlsx: 헤더(보유게임명)를 찾을 수 없어 위치 미저장");
    return false;
  }

  const { headerRowNum, headerMap } = headerInfo;
  const nameCol = findCol(headerMap, ["보유게임명", "게임명", "name", "name_kr"]);
  const locCol  = findCol(headerMap, ["위치", "책장그룹", "shelf", "shelfGroupId"]);

  if (!nameCol) { console.warn("xlsx: 게임명 컬럼 없음"); return false; }
  if (!locCol)  { console.warn("xlsx: 위치 컬럼 없음 — 헤더목록:", Object.keys(headerMap).join(", ")); return false; }

  for (let rn = headerRowNum + 1; rn <= worksheet.rowCount; rn++) {
    const cellName = String(worksheet.getCell(rn, nameCol).value || "").trim();
    if (cellName === ownedName) {
      worksheet.getCell(rn, locCol).value = location || null;
      await workbook.xlsx.writeFile(COTTAGE_OWNED_GAMES_XLSX_PATH);
      console.log(`xlsx 위치 저장: "${ownedName}" → "${location || '(없음)'}"`);
      return true;
    }
  }

  console.warn(`xlsx: "${ownedName}" 행을 찾지 못해 위치 미저장`);
  return false;
}

async function appendLedgerRow(game, extraInfo = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(COTTAGE_OWNED_GAMES_XLSX_PATH);
  const worksheet = workbook.getWorksheet("보유게임리스트");

  const nextRow = worksheet.rowCount + 1;
  const headerInfo = findHeaderInfo(worksheet);

  if (headerInfo) {
    const { headerMap } = headerInfo;
    console.log("xlsx 헤더 발견:", Object.keys(headerMap).join(", "));

    const setCell = (candidates, value) => {
      const col = findCol(headerMap, candidates);
      if (col != null) {
        worksheet.getCell(nextRow, col).value = value;
      } else {
        console.warn(`  xlsx: 컬럼 후보 [${candidates.join("/")}] 미발견`);
      }
    };

    setCell(["보유게임명", "게임명", "name", "name_kr"], game.ownedName);

    if (extraInfo.location) {
      setCell(["위치", "책장그룹", "shelf", "shelfGroupId"], extraInfo.location);
      console.log(`  xlsx 위치 컬럼 쓰기: "${extraInfo.location}"`);
    }
  } else {
    console.warn("xlsx: 헤더를 찾지 못해 컬럼 번호 fallback 사용");
    worksheet.getCell(nextRow, 1).value = game.ownedName;
    if (extraInfo.location) worksheet.getCell(nextRow, 2).value = extraInfo.location;
  }

  await workbook.xlsx.writeFile(COTTAGE_OWNED_GAMES_XLSX_PATH);
  console.log("source xlsx 추가 완료:", game.ownedName);
}

function createGameId(gameName) {
  return String(gameName || "")
    .trim()
    .replace(/\s+/g, "-");
}

function findBggDetailByOwnedName(gameName) {
  const detailsCache = readJson(BGG_GAME_DETAILS_PATH, {});
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

async function addOwnedGame(gameName, extraInfo = {}) {
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
    // 이미 존재: 위치가 지정된 경우 xlsx + master 둘 다 업데이트
    if (extraInfo.location !== undefined && extraInfo.location !== "") {
      console.log(`이미 존재: "${cleanName}" — xlsx 위치 업데이트 시도`);
      const updated = await updateXlsxLocation(cleanName, extraInfo.location);
      if (updated) {
        master.games[resolvedGame.id].location = extraInfo.location;
        saveMaster(master);
      }
    } else {
      console.log("이미 존재 (변경 없음):", resolvedGame.id);
    }
    return;
  }

  if (extraInfo.location) resolvedGame.location = extraInfo.location;

  master.games[resolvedGame.id] = resolvedGame;

  saveMaster(master);
  await appendLedgerRow(resolvedGame, extraInfo);
  console.log("master 추가 완료:", cleanName);
}

if (require.main === module) {
  addOwnedGame(process.argv[2]).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { addOwnedGame, updateXlsxLocation };
