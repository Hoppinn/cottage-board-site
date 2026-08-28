const fs = require("fs");
const crypto = require("crypto");

const MIGRATION_MANIFEST_CONTRACT = Object.freeze({
  version: 1,
  kind: "migration-invariant",
  sourceCommit: "602f9a7a",
  sourcePath: "assets/data/game-short-names.js",
  requiredCount: 148,
  requiredIdsSha256: "4fabeae67bddd1ac361fc1eea759c149a0b28094d3691574739632f96565bda1",
});

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function loadAbbrMigrationManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[ABBR MIGRATION] manifest 파일 없음: ${filePath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return validateAbbrMigrationManifest(manifest);
}

function validateAbbrMigrationManifest(manifest) {
  for (const [key, expected] of Object.entries(MIGRATION_MANIFEST_CONTRACT)) {
    if (manifest[key] !== expected) {
      throw new Error(`[ABBR MIGRATION] manifest ${key} 불일치: ${manifest[key]} (예상 ${expected})`);
    }
  }
  if (!Array.isArray(manifest.requiredBggIds)) {
    throw new Error("[ABBR MIGRATION] manifest requiredBggIds가 배열이 아님");
  }
  const normalizedIds = manifest.requiredBggIds.map(String);
  const uniqueIds = new Set(normalizedIds);
  if (
    normalizedIds.length !== MIGRATION_MANIFEST_CONTRACT.requiredCount ||
    uniqueIds.size !== MIGRATION_MANIFEST_CONTRACT.requiredCount
  ) {
    throw new Error(
      `[ABBR MIGRATION] manifest BGG ID 수 불일치: 전체 ${normalizedIds.length} / 고유 ${uniqueIds.size} (예상 ${MIGRATION_MANIFEST_CONTRACT.requiredCount})`
    );
  }
  const idsSha256 = crypto
    .createHash("sha256")
    .update([...uniqueIds].sort((a, b) => Number(a) - Number(b)).join("\n"))
    .digest("hex");
  if (idsSha256 !== MIGRATION_MANIFEST_CONTRACT.requiredIdsSha256) {
    throw new Error(`[ABBR MIGRATION] manifest BGG ID 집합 checksum 불일치: ${idsSha256}`);
  }
  return { ...manifest, requiredBggIds: normalizedIds };
}

function resolveAbbrEntry(game, abbrMap, abbrByName) {
  const bggId = String(game.bggId || "");
  if (bggId && hasOwn(abbrMap, bggId)) return { abbr: abbrMap[bggId], source: "manual-id" };
  if (hasOwn(abbrByName, game.ownedName)) {
    return { abbr: abbrByName[game.ownedName], source: "manual-name" };
  }
  return { abbr: String(game.ownedName || "").slice(0, 2), source: "fallback" };
}

function resolveAbbr(game, abbrMap, abbrByName) {
  return resolveAbbrEntry(game, abbrMap, abbrByName).abbr;
}

function auditAbbrSources(games, abbrMap, abbrByName, migrationRequiredIds = []) {
  const migrationMissing = migrationRequiredIds.filter((id) => !hasOwn(abbrMap, String(id)));
  const duplicateSources = games.filter((game) => {
    const bggId = String(game.bggId || "");
    return bggId && hasOwn(abbrMap, bggId) && hasOwn(abbrByName, game.ownedName);
  });
  return { migrationMissing, duplicateSources };
}

function auditAbbrOutput(games, abbrMap, abbrByName, outputData) {
  const mismatches = [];
  games.forEach((game) => {
    if (!game.id || !game.ownedName) return;
    const expected = resolveAbbr(game, abbrMap, abbrByName);
    const actual = outputData?.[game.id]?.abbr;
    if (actual !== expected) {
      mismatches.push({ id: game.id, name: game.ownedName, expected, actual });
    }
  });
  return mismatches;
}

function auditByNameExport(abbrByName, exportedMap) {
  const keys = new Set([...Object.keys(abbrByName || {}), ...Object.keys(exportedMap || {})]);
  return [...keys]
    .filter((key) => abbrByName?.[key] !== exportedMap?.[key])
    .map((key) => ({ key, expected: abbrByName?.[key], actual: exportedMap?.[key] }));
}

module.exports = {
  MIGRATION_MANIFEST_CONTRACT,
  loadAbbrMigrationManifest,
  validateAbbrMigrationManifest,
  resolveAbbrEntry,
  resolveAbbr,
  auditAbbrSources,
  auditAbbrOutput,
  auditByNameExport,
};
