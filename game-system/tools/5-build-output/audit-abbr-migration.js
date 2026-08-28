/**
 * 2026-08-29 약칭 정본 전환 감사를 역사 커밋의 실제 BGG-ID 키로 재현한다.
 * 사용: node game-system/tools/5-build-output/audit-abbr-migration.js
 */
const { execFileSync } = require("child_process");
const vm = require("vm");

const REFS = {
  legacy: "602f9a7a:assets/data/game-short-names.js",
  master: "ed89c399:game-system/game-data/library/1-master/cottage-owned-games-master.json",
  canonicalBefore: "ed89c399:game-system/game-data/source/3-abbr/game-abbr.json",
  canonicalAfter: "bb92e265:game-system/game-data/source/3-abbr/game-abbr.json",
  canonicalBeforeFix: "a91f4fb0^:game-system/game-data/source/3-abbr/game-abbr.json",
  canonicalCurrent: "HEAD:game-system/game-data/source/3-abbr/game-abbr.json",
};

function gitShow(ref) {
  return execFileSync("git", ["show", ref], { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 });
}

function setIntersection(a, b) {
  return new Set([...a].filter((key) => b.has(key)));
}

function setDifference(a, b) {
  return new Set([...a].filter((key) => !b.has(key)));
}

function sortedKeys(set) {
  return [...set].sort((a, b) => Number(a) - Number(b));
}

function auditHistoricalMigration() {
  const legacyContext = { window: {} };
  vm.runInNewContext(gitShow(REFS.legacy), legacyContext, { filename: REFS.legacy });

  const legacyMap = legacyContext.window.GAME_SHORT_NAMES || {};
  const masterData = JSON.parse(gitShow(REFS.master));
  const beforeMap = JSON.parse(gitShow(REFS.canonicalBefore));
  const afterMap = JSON.parse(gitShow(REFS.canonicalAfter));
  const beforeFixMap = JSON.parse(gitShow(REFS.canonicalBeforeFix));
  const currentMap = JSON.parse(gitShow(REFS.canonicalCurrent));
  const games = Object.values(masterData.games || {}).filter((game) => game.id && game.ownedName);

  const rows = games.map((game) => {
    const bggId = String(game.bggId || "");
    return {
      bggId,
      name: game.ownedName,
      abbr: beforeMap[bggId] || String(game.ownedName).slice(0, 2),
      source: beforeMap[bggId] ? "manual-id" : "fallback",
    };
  });
  const rowsByAbbr = new Map();
  rows.forEach((row) => {
    if (!rowsByAbbr.has(row.abbr)) rowsByAbbr.set(row.abbr, []);
    rowsByAbbr.get(row.abbr).push(row);
  });
  const collisionGroups = [...rowsByAbbr.entries()].filter(
    ([, members]) => members.length > 1 && members.some((member) => member.source === "fallback")
  );
  const collisionRows = collisionGroups.flatMap(([, members]) => members);

  const legacyIds = new Set(Object.keys(legacyMap));
  const collisionIds = new Set(collisionRows.map((row) => row.bggId).filter(Boolean));
  const beforeIds = new Set(Object.keys(beforeMap));
  const afterIds = new Set(Object.keys(afterMap));
  const beforeFixIds = new Set(Object.keys(beforeFixMap));
  const currentIds = new Set(Object.keys(currentMap));

  const sets = {
    legacy_intersect_collision: setIntersection(legacyIds, collisionIds),
    legacy_minus_collision: setDifference(legacyIds, collisionIds),
    collision_minus_legacy: setDifference(collisionIds, legacyIds),
    legacy_migrated_at_bb92: setIntersection(legacyIds, afterIds),
    legacy_missing_at_bb92: setDifference(legacyIds, afterIds),
    collision_migrated_at_bb92: setIntersection(collisionIds, afterIds),
    collision_missing_at_bb92: setDifference(collisionIds, afterIds),
    canonical_after_minus_collision: setDifference(afterIds, collisionIds),
    canonical_after_non_legacy: setDifference(afterIds, legacyIds),
    legacy_present_before: setIntersection(legacyIds, beforeIds),
    legacy_migrated_before_fix: setIntersection(legacyIds, beforeFixIds),
    legacy_missing_before_fix: setDifference(legacyIds, beforeFixIds),
    legacy_migrated_current: setIntersection(legacyIds, currentIds),
    legacy_missing_current: setDifference(legacyIds, currentIds),
  };

  return {
    refs: REFS,
    units: {
      legacy_bgg_id_keys: legacyIds.size,
      collision_alias_groups: collisionGroups.length,
      collision_member_game_rows: collisionRows.length,
      collision_unique_bgg_id_keys: collisionIds.size,
      canonical_before_keys: beforeIds.size,
      canonical_after_keys: afterIds.size,
      canonical_before_fix_keys: beforeFixIds.size,
      canonical_current_keys: currentIds.size,
    },
    populations: {
      legacy: sortedKeys(legacyIds),
      collision_targets: sortedKeys(collisionIds),
      canonical_before: sortedKeys(beforeIds),
      canonical_after_bb92: sortedKeys(afterIds),
      canonical_before_fix: sortedKeys(beforeFixIds),
      canonical_current: sortedKeys(currentIds),
    },
    sets: Object.fromEntries(
      Object.entries(sets).map(([name, set]) => [name, { count: set.size, bggIds: sortedKeys(set) }])
    ),
  };
}

if (require.main === module) {
  console.log(JSON.stringify(auditHistoricalMigration(), null, 2));
}

module.exports = { auditHistoricalMigration };
