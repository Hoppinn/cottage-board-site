const fs = require("fs");
const path = require("path");

const {
  normalizeGameName
} = require("../core/normalize-game-name");

const ROOT_DIR =
  path.resolve(__dirname, "..");

const OWNED_GAMES_PATH =
  path.join(
    ROOT_DIR,
    "game-data/source/manual/cottage-owned-games.tsv"
  );

const BGG_RANKS_PATH =
  path.join(
    ROOT_DIR,
    "game-data/source/csv/boardgames_ranks.csv"
  );

const MATCH_RESULT_PATH =
  path.join(
    ROOT_DIR,
    "game-data/generated/cache/bgg-match-result.json"
  );

const FORCED_OVERRIDES_PATH =
  path.join(
    ROOT_DIR,
    "game-data/library/manual/forced-bgg-overrides.json"
  );

function readTextFile(filePath){

  if(!fs.existsSync(filePath)){
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf-8");

}

function readJsonIfExists(filePath){

  if(!fs.existsSync(filePath)){
    return {};
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );

}

function parseTsv(text){

  const lines =
    text
      .split(/\r?\n/)
      .filter(line=>line.trim());

  const headerIndex =
    lines.findIndex(line=>line.includes("보유게임명"));

  if(headerIndex === -1){
    throw new Error("TSV에서 '보유게임명' 헤더를 찾을 수 없습니다.");
  }

  const headers =
    lines[headerIndex].split("\t").map(header=>header.trim());

  return lines.slice(headerIndex + 1).map(line=>{

    const values =
      line.split("\t");

    const row = {};

    headers.forEach((header, index)=>{
      row[header] = values[index] ? values[index].trim() : "";
    });

    return row;

  }).filter(row=>row["보유게임명"]);

}

function parseCsvLine(line){

  const result = [];
  let current = "";
  let insideQuotes = false;

  for(let i = 0; i < line.length; i++){

    const char = line[i];
    const nextChar = line[i + 1];

    if(char === '"' && nextChar === '"'){
      current += '"';
      i++;
      continue;
    }

    if(char === '"'){
      insideQuotes = !insideQuotes;
      continue;
    }

    if(char === "," && !insideQuotes){
      result.push(current);
      current = "";
      continue;
    }

    current += char;

  }

  result.push(current);

  return result;

}

function parseCsv(text){

  const lines =
    text
      .split(/\r?\n/)
      .filter(line=>line.trim());

  const headers =
    parseCsvLine(lines[0]).map(header=>header.trim());

  return lines.slice(1).map(line=>{

    const values =
      parseCsvLine(line);

    const row = {};

    headers.forEach((header, index)=>{
      row[header] = values[index] ? values[index].trim() : "";
    });

    return row;

  });

}

function getOwnedGameName(row){

  return (
    row["보유게임명"] ||
    row["게임명"] ||
    row["한글명"] ||
    row.title ||
    row.name ||
    ""
  );

}

function getBggGameName(row){

  return (
    row.name ||
    row.title ||
    row.primary ||
    ""
  );

}

function getBggGameId(row){

  return (
    row.id ||
    row.objectid ||
    row.boardgame_id ||
    row.bgg_id ||
    ""
  );

}

function matchOwnedGamesToBgg(){

  const ownedText =
    readTextFile(OWNED_GAMES_PATH);

  const bggText =
    readTextFile(BGG_RANKS_PATH);

  const ownedGames =
    parseTsv(ownedText);

  const bggGames =
    parseCsv(bggText);

  const overrides =
    readJsonIfExists(FORCED_OVERRIDES_PATH);

  const bggIndex = new Map();

  bggGames.forEach(game=>{

    const name =
      getBggGameName(game);

    const normalized =
      normalizeGameName(name);

    if(!normalized){
      return;
    }

    if(!bggIndex.has(normalized)){
      bggIndex.set(normalized, game);
    }

  });

  const matched = [];
  const unmatched = [];

  ownedGames.forEach(ownedGame=>{

    const ownedName =
      getOwnedGameName(ownedGame);

    const normalizedOwnedName =
      normalizeGameName(ownedName);

    const manualBggId =
      overrides[ownedName] ||
      overrides[normalizedOwnedName];

    if(manualBggId){

      matched.push({
        ownedName,
        normalizedName: normalizedOwnedName,
        bggId: String(manualBggId),
        bggName: "",
        ownedData: ownedGame,
        bggRankData: {},
        matchType: "manual"
      });

      return;

    }

    const bggGame =
      bggIndex.get(normalizedOwnedName);

    if(bggGame){

      matched.push({
        ownedName,
        normalizedName: normalizedOwnedName,
        bggId: getBggGameId(bggGame),
        bggName: getBggGameName(bggGame),
        ownedData: ownedGame,
        bggRankData: bggGame,
        matchType: "auto"
      });

      return;

    }

    unmatched.push({
      ownedName,
      normalizedName: normalizedOwnedName,
      ownedData: ownedGame
    });

  });

  const result = {
    generatedAt: new Date().toISOString(),
    totalOwnedGames: ownedGames.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matched,
    unmatched
  };

  fs.mkdirSync(
    path.dirname(MATCH_RESULT_PATH),
    { recursive: true }
  );

  fs.writeFileSync(
    MATCH_RESULT_PATH,
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log(`매칭 완료: ${matched.length}/${ownedGames.length}`);
  console.log(`저장 위치: ${MATCH_RESULT_PATH}`);

  return result;

}

if(require.main === module){
  matchOwnedGamesToBgg();
}

module.exports = {
  matchOwnedGamesToBgg
};