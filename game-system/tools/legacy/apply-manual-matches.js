const fs = require("fs");
const path = require("path");

const ROOT_DIR =
  path.resolve(__dirname, "..");

const CANDIDATES_PATH =
  path.join(
    ROOT_DIR,
    "game-data/generated/cache/bgg-search-candidates.json"
  );

const FORCED_OVERRIDES_PATH =
  path.join(
    ROOT_DIR,
    "game-data/library/manual/forced-bgg-overrides.json"
  );

function readJsonIfExists(filePath){

  if(!fs.existsSync(filePath)){
    return {};
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );

}

function writeJson(filePath, data){

  fs.mkdirSync(
    path.dirname(filePath),
    { recursive: true }
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );

}

function applyManualMatches(){

  const candidatesFile =
    readJsonIfExists(CANDIDATES_PATH);

  const existingManualMatches =
    readJsonIfExists(FORCED_OVERRIDES_PATH);

  const candidates =
    candidatesFile.candidates || [];

  let addedCount = 0;

  candidates.forEach(item=>{

    if(!item.selectedBggId){
      return;
    }

    if(!item.ownedName){
      return;
    }

    existingManualMatches[item.ownedName] =
      String(item.selectedBggId);

    addedCount++;

  });

  writeJson(
    FORCED_OVERRIDES_PATH,
    existingoverrides
  );

  console.log(`수동 매칭 반영 완료: ${addedCount}개`);
  console.log(`저장 위치: ${FORCED_OVERRIDES_PATH}`);

  return existingoverrides;

}

if(require.main === module){
  applyoverrides();
}

module.exports = {
  applyoverrides
};