/**
 * dump-abbr.js
 * 전체 게임 약칭 덤프: bggId / titleKo / 최종abbr / 출처(manual-id|manual-name|fallback)
 * 충돌(fallback 포함 그룹)도 함께 출력.
 *
 * 사용: node game-system/tools/5-build-output/dump-abbr.js
 */

const path = require("path");
const { readJson } = require("../_core/file-read-writer");
const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  SOURCE_DIR,
} = require("../_core/paths");

const GAME_ABBR_PATH = path.join(SOURCE_DIR, "3-abbr", "game-abbr.json");
const GAME_ABBR_BYNAME_PATH = path.join(SOURCE_DIR, "3-abbr", "game-abbr-byname.json");

function run() {
  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const masterGames = Object.values(masterData.games || {});
  const abbrMap = readJson(GAME_ABBR_PATH, {});
  const abbrByName = readJson(GAME_ABBR_BYNAME_PATH, {});

  const rows = masterGames
    .filter((g) => g.id && g.ownedName)
    .map((g) => {
      const bggId = String(g.bggId || "");
      let abbr, source;
      if (abbrMap[bggId]) {
        abbr = abbrMap[bggId];
        source = "manual-id";
      } else if (abbrByName[g.ownedName]) {
        abbr = abbrByName[g.ownedName];
        source = "manual-name";
      } else {
        abbr = (g.ownedName || "").slice(0, 2);
        source = "fallback";
      }
      return { bggId, titleKo: g.ownedName, abbr, source };
    })
    .sort((a, b) => a.abbr.localeCompare(b.abbr, "ko"));

  // ── 전체 목록 출력 ──────────────────────────────────────────────────
  console.log("\n=== 전체 게임 약칭 목록 ===");
  console.log(["bggId", "titleKo", "abbr", "출처"].join("\t"));
  rows.forEach((r) =>
    console.log([r.bggId, r.titleKo, r.abbr, r.source].join("\t"))
  );

  // ── 충돌 목록 출력 (fallback 포함 그룹만) ───────────────────────────
  const byAbbr = {};
  rows.forEach((r) => {
    if (!byAbbr[r.abbr]) byAbbr[r.abbr] = [];
    byAbbr[r.abbr].push(r);
  });

  const conflicts = Object.entries(byAbbr).filter(
    ([, list]) => list.length > 1 && list.some((m) => m.source === "fallback")
  );

  console.log("\n=== 약칭 충돌 목록 (fallback 포함 그룹만) ===");
  if (conflicts.length === 0) {
    console.log("충돌 없음");
  } else {
    conflicts.forEach(([abbr, list]) => {
      console.log(`\n[${abbr}] — ${list.length}건`);
      list.forEach((r) =>
        console.log(`  ${r.bggId}\t${r.titleKo}\t(${r.source})`)
      );
    });
  }

  const fallbackCount = rows.filter((r) => r.source === "fallback").length;
  const manualCount = rows.length - fallbackCount;
  console.log(
    `\n총 ${rows.length}개 게임 (manual ${manualCount} / fallback ${fallbackCount}) / 충돌 ${conflicts.length}건`
  );
}

run();
