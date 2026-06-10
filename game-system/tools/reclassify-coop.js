/**
 * "협력" 태그 게임 → easy_coop / hard_coop 재분류 (weight 기준 2.50)
 * "방탈출" 태그 게임 → escape_room 으로 변환
 */

const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.resolve(
  __dirname,
  "../game-data/library/3-output/cottage-games-data-output.js"
);

const src = fs.readFileSync(OUTPUT_PATH, "utf8");

// eval trick: strip window assignment, expose gameData
const sandbox = {};
const code = src.replace(
  /if\s*\(typeof window[\s\S]*?\}\s*$/,
  ""
);
const fn = new Function("exports", code + "\nexports.gameData = gameData;");
fn(sandbox);
const { gameData } = sandbox;

let coopEasyCount = 0;
let coopHardCount = 0;
let escapeCount = 0;
const noWeightGames = [];

for (const key of Object.keys(gameData)) {
  const game = gameData[key];
  if (!game.cottage) continue;

  const { shelfGroupId } = game.cottage;

  if (shelfGroupId === "협력") {
    const weight =
      (game.bgg && game.bgg.weight) ||
      game.cottage.difficultyWeight ||
      0;

    if (weight === 0) {
      noWeightGames.push(key);
    }

    if (weight <= 2.49) {
      game.cottage.shelfGroupId = "easy_coop";
      game.cottage.shelfLabel = "쉬운 협력게임";
      game.cottage.shelfFullLabel = "라이트패밀리게임 - 쉬운 협력게임";
      coopEasyCount++;
    } else {
      game.cottage.shelfGroupId = "hard_coop";
      game.cottage.shelfLabel = "어려운 협력게임";
      game.cottage.shelfFullLabel = "헤비 전략게임 - 어려운 협력게임";
      coopHardCount++;
    }
  } else if (shelfGroupId === "방탈출") {
    game.cottage.shelfGroupId = "escape_room";
    game.cottage.shelfLabel = "방탈출";
    game.cottage.shelfFullLabel = "머더미스터리 - 방탈출";
    escapeCount++;
  }
}

console.log(`easy_coop (B-1): ${coopEasyCount}개`);
console.log(`hard_coop (C-1): ${coopHardCount}개`);
console.log(`escape_room (F-1): ${escapeCount}개`);
if (noWeightGames.length > 0) {
  console.log(`⚠ weight 없음 → hard_coop 처리: ${noWeightGames.join(", ")}`);
}

// Write back
const out =
  "const gameData = " +
  JSON.stringify(gameData, null, 2) +
  ";\n\nif (typeof window !== \"undefined\") {\n  window.gameData = gameData;\n}\n";

fs.writeFileSync(OUTPUT_PATH, out, "utf8");
console.log("✅ cottage-games-data-output.js 업데이트 완료");
