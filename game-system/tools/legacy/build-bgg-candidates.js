const fs = require("fs");
const path = require("path");

const ROOT_DIR =
  path.resolve(__dirname, "..");

const MATCH_RESULT_PATH =
  path.join(
    ROOT_DIR,
    "game-data/generated/cache/bgg-match-result.json"
  );

const CANDIDATES_PATH =
  path.join(
    ROOT_DIR,
    "game-data/generated/cache/bgg-search-candidates.json"
  );

function readJson(filePath){

  if(!fs.existsSync(filePath)){
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
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

function buildBggCandidates(){

  const matchResult =
    readJson(MATCH_RESULT_PATH);

  const unmatched =
    matchResult.unmatched || [];

  const candidates =
    unmatched.map(item=>{

      return {
        ownedName: item.ownedName,
        normalizedName: item.normalizedName,
        status: "needs_review",
        selectedBggId: "",
        memo: "",
        ownedData: item.ownedData
      };

    });

  const result = {
    generatedAt: new Date().toISOString(),
    total: candidates.length,
    candidates
  };

  writeJson(
    CANDIDATES_PATH,
    result
  );

  console.log(`BGG 후보 검토 파일 생성 완료: ${candidates.length}개`);
  console.log(`저장 위치: ${CANDIDATES_PATH}`);

  return result;

}

if(require.main === module){
  buildBggCandidates();
}

module.exports = {
  buildBggCandidates
};