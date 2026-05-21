/**
 * convert-owned-xlsx.js
 *
 * Cottageboard owned-games XLSX normalizer.
 *
 * Purpose:
 * - Read the manually maintained Excel file.
 * - Preserve player recommendation cells.
 * - Detect bold player cells as bestPlayers.
 * - Export a normalized JSON that build-cottage-game-data.js can merge later.
 *
 * Recommended path:
 * game-system/tools/source/convert-owned-xlsx.js
 *
 * Required package:
 * npm install exceljs
 *
 * Usage:
 * node game-system/tools/source/convert-owned-xlsx.js
 *
 * Optional:
 * node game-system/tools/source/convert-owned-xlsx.js "D:/path/to/cottage-owned-games.xlsx"
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const GAME_SYSTEM_DIR =
  path.resolve(__dirname, "../../..");

const DEFAULT_INPUT_XLSX_PATH =
  path.join(
    GAME_SYSTEM_DIR,
    "game-data/source/2-cottage-manual/cottage-owned-games.xlsx"
  );

const DEFAULT_OUTPUT_JSON_PATH =
  path.join(
    GAME_SYSTEM_DIR,
    "game-data/source/owned-games-normalized.json"
  );

const DEFAULT_OUTPUT_JS_PATH =
  path.join(
    GAME_SYSTEM_DIR,
    "game-data/source/owned-games-normalized.js"
  );

const PLAYER_HEADERS = [
  { header: "1인", value: 1 },
  { header: "2인", value: 2 },
  { header: "3인", value: 3 },
  { header: "4인", value: 4 },
  { header: "5인", value: 5 },
  { header: "6인", value: 6 },
  { header: "7인", value: 7 },
  { header: "8인", value: 8 },
  { header: "8인 이상", value: 8, largeGroup: true },
];

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if (value.richText) {
      return value.richText
        .map((part) => part.text || "")
        .join("")
        .trim();
    }

    if (value.text) {
      return String(value.text).trim();
    }

    if (value.result !== undefined) {
      return String(value.result).trim();
    }
  }

  return String(value).trim();
}

function toNumber(value, fallback = 0) {
  const text =
    normalizeText(value).replace(/[^\d.]/g, "");

  if (!text) {
    return fallback;
  }

  const n = Number(text);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function uniqueArray(values) {
  return [
    ...new Set(
      (values || []).filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
    )
  ];
}

function slugifyKorean(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isCellBold(cell) {
  if (!cell) {
    return false;
  }

  if (cell.font && cell.font.bold) {
    return true;
  }

  const value = cell.value;

  if (
    value &&
    typeof value === "object" &&
    Array.isArray(value.richText)
  ) {
    return value.richText.some((part) =>
      Boolean(part.font && part.font.bold)
    );
  }

  return false;
}

function getCellText(row, columnNumber) {
  if (!columnNumber) {
    return "";
  }

  return normalizeText(
    row.getCell(columnNumber).value
  );
}

function findHeaderRow(worksheet) {
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);

    const hasOwnedGameHeader =
      row.values.some((value) =>
        normalizeText(value) === "보유게임명"
      );

    if (hasOwnedGameHeader) {
      return rowNumber;
    }
  }

  throw new Error(
    "XLSX에서 '보유게임명' 헤더를 찾지 못했습니다."
  );
}

function buildHeaderMap(worksheet, headerRowNumber) {
  const row = worksheet.getRow(headerRowNumber);
  const headerMap = {};

  row.eachCell((cell, columnNumber) => {
    const header = normalizeText(cell.value);

    if (header) {
      headerMap[header] = columnNumber;
    }
  });

  return headerMap;
}

function getColumn(headerMap, candidates) {
  for (const candidate of candidates) {
    if (headerMap[candidate]) {
      return headerMap[candidate];
    }
  }

  return null;
}

function extractPlayerInfo(row, headerMap) {
  const recommendedPlayers = [];
  const bestPlayers = [];
  let supportsLargeGroup = false;

  PLAYER_HEADERS.forEach((config) => {
    const columnNumber =
      headerMap[config.header];

    if (!columnNumber) {
      return;
    }

    const cell =
      row.getCell(columnNumber);

    const text =
      normalizeText(cell.value);

    if (!text) {
      return;
    }

    recommendedPlayers.push(config.value);

    if (config.largeGroup) {
      supportsLargeGroup = true;
    }

    if (isCellBold(cell)) {
      bestPlayers.push(config.value);
    }
  });

  return {
    recommendedPlayers:
      uniqueArray(recommendedPlayers),
    bestPlayers:
      uniqueArray(bestPlayers),
    supportsLargeGroup,
  };
}

function extractRow(row, headerMap) {
  const ownedNameColumn =
    getColumn(headerMap, [
      "보유게임명",
      "게임명",
      "name",
      "name_kr"
    ]);

  const ownedName =
    getCellText(row, ownedNameColumn);

  if (!ownedName) {
    return null;
  }

  const difficultyColumn =
    getColumn(headerMap, [
      "난이도",
      "체감난이도",
      "difficulty",
      "difficultyWeight"
    ]);

  const locationColumn =
    getColumn(headerMap, [
      "위치",
      "책장그룹",
      "shelf",
      "shelfGroupId"
    ]);

  const mechanismColumn =
    getColumn(headerMap, [
      "메커니즘",
      "메커니즘즈",
      "mechanics",
      "mechanism"
    ]);

  const ratingColumn =
    getColumn(headerMap, [
      "긱평점",
      "리펭점수",
      "평점",
      "rating"
    ]);

  const playerInfo =
    extractPlayerInfo(row, headerMap);

  return {
    id: slugifyKorean(ownedName),
    ownedName,

    difficultyWeight:
      toNumber(getCellText(row, difficultyColumn), 0),

    shelfGroupId:
      getCellText(row, locationColumn),

    sourceMechanism:
      getCellText(row, mechanismColumn),

    sourceRating:
      toNumber(getCellText(row, ratingColumn), 0),

    recommendedPlayers:
      playerInfo.recommendedPlayers,

    bestPlayers:
      playerInfo.bestPlayers,

    supportsLargeGroup:
      playerInfo.supportsLargeGroup,
  };
}

async function convertOwnedXlsx() {
  const inputPath =
    process.argv[2]
      ? path.resolve(process.argv[2])
      : DEFAULT_INPUT_XLSX_PATH;

  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `XLSX 파일을 찾지 못했습니다: ${inputPath}`
    );
  }

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.readFile(inputPath);

  const worksheet =
    workbook.getWorksheet("보유게임리스트") ||
    workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(
      "XLSX 안에서 읽을 수 있는 시트를 찾지 못했습니다."
    );
  }

  const headerRowNumber =
    findHeaderRow(worksheet);

  const headerMap =
    buildHeaderMap(worksheet, headerRowNumber);

  const normalized = {};
  const rows = [];

  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row =
      worksheet.getRow(rowNumber);

    const item =
      extractRow(row, headerMap);

    if (!item) {
      continue;
    }

    normalized[item.ownedName] = item;
    rows.push(item);
  }

  fs.mkdirSync(
    path.dirname(DEFAULT_OUTPUT_JSON_PATH),
    { recursive: true }
  );

  fs.writeFileSync(
    DEFAULT_OUTPUT_JSON_PATH,
    JSON.stringify(normalized, null, 2),
    "utf-8"
  );

  const jsText =
    `const ownedGamesNormalized = ${JSON.stringify(normalized, null, 2)};\n\n` +
    `if (typeof window !== "undefined") {\n` +
    `  window.ownedGamesNormalized = ownedGamesNormalized;\n` +
    `}\n\n` +
    `if (typeof module !== "undefined" && module.exports) {\n` +
    `  module.exports = ownedGamesNormalized;\n` +
    `}\n`;

  fs.writeFileSync(
    DEFAULT_OUTPUT_JS_PATH,
    jsText,
    "utf-8"
  );

  const withRecommended =
    rows.filter((item) =>
      item.recommendedPlayers.length > 0
    ).length;

  const withBest =
    rows.filter((item) =>
      item.bestPlayers.length > 0
    ).length;

  console.log(
    "Owned XLSX normalized:"
  );

  console.log({
    sheet: worksheet.name,
    total: rows.length,
    withRecommended,
    withBest,
    input: inputPath,
    json: DEFAULT_OUTPUT_JSON_PATH,
    js: DEFAULT_OUTPUT_JS_PATH,
  });

  console.log(
    "\nSample:"
  );

  rows.slice(0, 5).forEach((item) => {
    console.log({
      ownedName: item.ownedName,
      difficultyWeight: item.difficultyWeight,
      recommendedPlayers: item.recommendedPlayers,
      bestPlayers: item.bestPlayers,
      supportsLargeGroup: item.supportsLargeGroup,
    });
  });
}

if (require.main === module) {
  convertOwnedXlsx().catch((error) => {
    console.error(
      "\nconvert-owned-xlsx failed."
    );

    console.error(error);

    process.exit(1);
  });
}

module.exports = {
  convertOwnedXlsx,
};
