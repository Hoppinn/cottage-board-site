const { readJson } = require("./_core/file-read-writer");
const {
  BGG_MATCH_MAP_PATH,
  BGG_GAME_DETAILS_PATH,
  COTTAGE_OWNED_GAMES_MASTER_PATH,
} = require("./_core/paths");

function check() {
  const matchMap   = readJson(BGG_MATCH_MAP_PATH, {});
  const cache      = readJson(BGG_GAME_DETAILS_PATH, {});
  const masterData = readJson(COTTAGE_OWNED_GAMES_MASTER_PATH, { games: {} });
  const games      = Object.values(masterData.games || {});

  const issues = [];
  const steps  = [];

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

  // ── 출력 ──────────────────────────────────────────────────────
  console.log("\n=== 파이프라인 상태 점검 ===\n");
  issues.forEach((line) => console.log(line));

  if (steps.length === 0) {
    console.log("\n[✅] 파이프라인 최신 상태 — 실행 필요 없음\n");
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
}

check();
