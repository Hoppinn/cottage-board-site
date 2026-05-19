const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT_DIR =
  path.resolve(__dirname, "..");

const MATCH_RESULT_PATH =
  path.join(
    ROOT_DIR,
    "game-data/generated/cache/bgg-match-result.json"
  );

const BGG_DETAILS_CACHE_PATH =
  path.join(
    ROOT_DIR,
    "game-data/generated/cache/bgg-details-cache.json"
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

function wait(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}

function fetchUrl(url){

  return new Promise((resolve, reject)=>{

    https
      .get(url, response=>{

        let data = "";

        response.on("data", chunk=>{
          data += chunk;
        });

        response.on("end", ()=>{
          resolve(data);
        });

      })
      .on("error", reject);

  });

}

function extractTag(xml, tagName){

  const regex =
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");

  const match =
    xml.match(regex);

  return match ? match[1].trim() : "";

}

function extractAttribute(xml, tagName, attrName){

  const regex =
    new RegExp(`<${tagName}[^>]*${attrName}="([^"]*)"[^>]*>`, "i");

  const match =
    xml.match(regex);

  return match ? match[1].trim() : "";

}

function extractPrimaryName(xml){

  const regex =
    /<name[^>]*type="primary"[^>]*value="([^"]*)"[^>]*>/i;

  const match =
    xml.match(regex);

  return match ? match[1].trim() : "";

}

function extractLinks(xml, linkType){

  const regex =
    new RegExp(
      `<link[^>]*type="${linkType}"[^>]*value="([^"]*)"[^>]*>`,
      "gi"
    );

  const result = [];
  let match;

  while((match = regex.exec(xml)) !== null){
    result.push(match[1].trim());
  }

  return result;

}

function extractPollBestPlayers(xml){

  const pollRegex =
    /<poll[^>]*name="suggested_numplayers"[\s\S]*?<\/poll>/i;

  const pollMatch =
    xml.match(pollRegex);

  if(!pollMatch){
    return null;
  }

  const pollXml =
    pollMatch[0];

  const resultRegex =
    /<results[^>]*numplayers="([^"]+)"[\s\S]*?<\/results>/gi;

  let bestPlayer = null;
  let bestVote = -1;
  let match;

  while((match = resultRegex.exec(pollXml)) !== null){

    const numplayers =
      match[1];

    const resultBlock =
      match[0];

    const bestMatch =
      resultBlock.match(
        /<result[^>]*value="Best"[^>]*numvotes="([^"]+)"[^>]*>/i
      );

    if(!bestMatch){
      continue;
    }

    const votes =
      Number(bestMatch[1]);

    if(votes > bestVote){
      bestVote = votes;
      bestPlayer = numplayers;
    }

  }

  return bestPlayer;

}

function normalizeBggDetail(xml, bggId){

  return {
    bggId,
    title: extractPrimaryName(xml),
    image: extractTag(xml, "image"),
    thumbnail: extractTag(xml, "thumbnail"),
    description: extractTag(xml, "description"),
    yearpublished: extractAttribute(xml, "yearpublished", "value"),
    minplayers: extractAttribute(xml, "minplayers", "value"),
    maxplayers: extractAttribute(xml, "maxplayers", "value"),
    playingtime: extractAttribute(xml, "playingtime", "value"),
    minplaytime: extractAttribute(xml, "minplaytime", "value"),
    maxplaytime: extractAttribute(xml, "maxplaytime", "value"),
    averageweight: extractAttribute(xml, "averageweight", "value"),
    categories: extractLinks(xml, "boardgamecategory"),
    mechanics: extractLinks(xml, "boardgamemechanic"),
    bestPlayer: extractPollBestPlayers(xml)
  };

}

async function fetchBggDetails(){

  const matchResult =
    readJson(MATCH_RESULT_PATH);

  let cache = {};

  if(fs.existsSync(BGG_DETAILS_CACHE_PATH)){
    cache = readJson(BGG_DETAILS_CACHE_PATH);
  }

  const matchedGames =
    matchResult.matched || [];

  for(const item of matchedGames){

    const bggId =
      item.bggId;

    if(!bggId){
      continue;
    }

    if(cache[bggId]){
      console.log(`캐시 사용: ${bggId}`);
      continue;
    }

    const url =
      `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;

    console.log(`BGG 요청: ${bggId}`);

    const xml =
      await fetchUrl(url);

    cache[bggId] =
      normalizeBggDetail(xml, bggId);

    writeJson(
      BGG_DETAILS_CACHE_PATH,
      cache
    );

    await wait(1200);

  }

  console.log("BGG 상세정보 수집 완료");
  console.log(`저장 위치: ${BGG_DETAILS_CACHE_PATH}`);

  return cache;

}

if(require.main === module){
  fetchBggDetails();
}

module.exports = {
  fetchBggDetails
};