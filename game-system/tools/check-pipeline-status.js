const fs = require("fs");
const vm = require("vm");

const { readJson } = require("./_core/file-read-writer");
const {
  loadAbbrMigrationManifest,
  auditAbbrSources,
  auditAbbrOutput,
  auditByNameExport,
} = require("./_core/abbr-audit");
const {
  BGG_MATCH_MAP_PATH,
  BGG_GAME_DETAILS_PATH,
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_GAMES_DATA_JS_PATH,
  COTTAGE_GAMES_DATA_JSON_PATH,
  GAME_ABBR_PATH,
  GAME_ABBR_BYNAME_PATH,
  GAME_ABBR_MIGRATION_MANIFEST_PATH,
} = require("./_core/paths");

function check() {
  const matchMap   = readJson(BGG_MATCH_MAP_PATH, {});
  const cache      = readJson(BGG_GAME_DETAILS_PATH, {});
  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const games      = Object.values(masterData.games || {});

  const issues = [];
  const steps  = [];
  let hasFatalIssue = false;

  // ── 1. fetch:bgg ──────────────────────────────────────────────
  const needFetch = Object.values(matchMap).filter(
    (m) => ["auto-confirmed", "forced"].includes(m.status) && m.bggId && !cache[String(m.bggId)]
  );
  if (needFetch.length) {
    issues.push(`[⚠️] fetch:bgg       캐시 누락 ${needFetch.length}개`);
    needFetch.forEach((m) => issues.push(`      · ${m.ownedName}  bggId=${m.bggId}`));
    steps.push("npm run fetch:bgg");
  } else {
    issues.push(`[✅] fetch:bgg       캐시 최신 (${Object.keys(cache).length}개)`);
  }

  // ── 2. build:master ───────────────────────────────────────────
  const masterMap     = Object.fromEntries(games.map((g) => [g.ownedName || g.id, g.bggId]));
  const needBuildMaster = Object.entries(matchMap).filter(([name, m]) => {
    if (!["auto-confirmed", "forced"].includes(m.status)) return false;
    if (!m.bggId) return false;
    const masterGame = games.find((g) => g.id === (m.id || name.replace(/\s+/g, "-")));
    const masterBggId = masterGame?.bggId;
    return masterBggId && String(masterBggId) !== String(m.bggId);
  });
  if (needBuildMaster.length) {
    issues.push(`[⚠️] build:master   match-map↔master 불일치 ${needBuildMaster.length}개`);
    needBuildMaster.forEach(([name, m]) => {
      const masterGame  = games.find((g) => g.ownedName === name);
      const masterBggId = masterGame?.bggId || "?";
      issues.push(`      · ${name.padEnd(20)} match-map=${m.bggId} / master=${masterBggId}`);
    });
    steps.push("npm run build:master");
  } else {
    issues.push(`[✅] build:master   match-map↔master 일치`);
  }

  // ── 3. translate:desc ─────────────────────────────────────────
  const needDesc = games.filter((g) => g.description && g.description.trim() && !g.descriptionKo);
  if (needDesc.length) {
    issues.push(`[⚠️] translate:desc  descriptionKo 없는 게임 ${needDesc.length}개`);
    issues.push(`      · ${needDesc.map((g) => g.ownedName || g.id).join(", ")}`);
    if (!steps.includes("npm run build:master")) steps.push("npm run translate");
    steps.push("npm run translate:desc");
  } else {
    issues.push(`[✅] translate:desc  모두 완료`);
  }

  // ── 4. translate:summary ──────────────────────────────────────
  const needSummary = games.filter((g) => g.descriptionKo && g.descriptionKo.trim() && !g.summaryKo);
  if (needSummary.length) {
    issues.push(`[⚠️] translate:summary  summaryKo 없는 게임 ${needSummary.length}개`);
    issues.push(`      · ${needSummary.map((g) => g.ownedName || g.id).join(", ")}`);
    steps.push("npm run translate:summary");
  } else {
    issues.push(`[✅] translate:summary  모두 완료`);
  }

  // ── 5. abbreviations ──────────────────────────────────────────
  const abbrMap = readJson(GAME_ABBR_PATH, {});
  const abbrByName = readJson(GAME_ABBR_BYNAME_PATH, {});
  const migrationManifest = loadAbbrMigrationManifest(GAME_ABBR_MIGRATION_MANIFEST_PATH);
  const outputJson = readJson(COTTAGE_GAMES_DATA_JSON_PATH, {});
  const sourceAudit = auditAbbrSources(
    games,
    abbrMap,
    abbrByName,
    migrationManifest.requiredBggIds
  );
  const jsonMismatches = auditAbbrOutput(games, abbrMap, abbrByName, outputJson);

  const jsContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(COTTAGE_GAMES_DATA_JS_PATH, "utf-8"), jsContext, {
    filename: COTTAGE_GAMES_DATA_JS_PATH,
  });
  const jsMismatches = auditAbbrOutput(games, abbrMap, abbrByName, jsContext.window.gameData || {});
  const byNameExportMismatches = auditByNameExport(
    abbrByName,
    jsContext.window.COTTAGE_GAME_ABBR_BY_NAME || {}
  );

  if (sourceAudit.migrationMissing.length || sourceAudit.duplicateSources.length) {
    hasFatalIssue = true;
    issues.push(`[❌] abbreviations  수동 약칭 정본 충돌`);
    if (sourceAudit.migrationMissing.length) {
      issues.push(`      · 이관 manifest 누락 BGG ID: ${sourceAudit.migrationMissing.join(", ")}`);
    }
    sourceAudit.duplicateSources.forEach((game) => {
      const bggId = String(game.bggId || "");
      issues.push(
        `      · 중복 정본 ${game.ownedName}: ID맵=${abbrMap[bggId]} / 이름맵=${abbrByName[game.ownedName]}`
      );
    });
  } else if (jsonMismatches.length || jsMismatches.length || byNameExportMismatches.length) {
    hasFatalIssue = true;
    issues.push(
      `[❌] abbreviations  정본↔산출물 불일치 JSON ${jsonMismatches.length} / JS ${jsMismatches.length} / 직접입력맵 ${byNameExportMismatches.length}`
    );
    steps.push("npm run build");
  } else {
    issues.push(
      `[✅] abbreviations  정본·이관 manifest·JSON/JS 산출물 일치 (수동 정본 ${Object.keys(abbrMap).length + Object.keys(abbrByName).length}키)`
    );
  }

  // ── 출력 ──────────────────────────────────────────────────────
  console.log("\n=== 파이프라인 상태 점검 ===\n");
  issues.forEach((line) => console.log(line));

  if (steps.length === 0) {
    if (hasFatalIssue) {
      console.log("\n[❌] 파이프라인 점검 실패 — 약칭 정본을 먼저 정리하세요.\n");
      process.exitCode = 1;
    } else {
      console.log("\n[✅] 파이프라인 최신 상태 — 실행 필요 없음\n");
    }
    return;
  }

  // build:master 다음엔 translate도 필요
  if (steps.includes("npm run build:master") && !steps.includes("npm run translate")) {
    const idx = steps.indexOf("npm run build:master");
    steps.splice(idx + 1, 0, "npm run translate");
  }
  // 마지막엔 항상 build
  if (!steps.includes("npm run build")) steps.push("npm run build");

  console.log("\n▶ 실행 순서:");
  steps.forEach((s) => console.log(`  ${s}`));
  console.log();
  if (hasFatalIssue) process.exitCode = 1;
}

check();
