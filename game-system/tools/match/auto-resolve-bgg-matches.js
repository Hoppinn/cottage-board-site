const { readText, readJson, writeJson } = require("../core/read-write");
const {
  COTTAGE_OWNED_GAMES_TSV_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  BGG_MATCH_RESULT_PATH,
} = require("../core/paths");

const { generateNameCandidates } = require("./generate-name-candidates");
const { searchBggCandidates } = require("./search-bgg-candidates");
const { scoreBggCandidates } = require("./score-bgg-candidates");

function parseTsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const headerIndex = lines.findIndex((line) => {
    return line.split("\t").some((cell) => cell.trim() === "보유게임명");
  });

  if (headerIndex === -1) {
    throw new Error("TSV에서 '보유게임명' 헤더를 찾지 못했습니다.");
  }

  const headers = lines[headerIndex].split("\t").map((h) => h.trim());

  return lines.slice(headerIndex + 1).map((line) => {
    const values = line.split("\t");
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

function getGameName(row) {
  return (
    row["보유게임명"] ||
    row.name_kr ||
    row.korean_name ||
    row["한글명"] ||
    row["게임명"] ||
    row.name ||
    ""
  ).trim();
}

function simplifyCandidate(candidate) {
  if (!candidate) return null;

  return {
    bggId: candidate.id,
    bggName: candidate.name,
    year: candidate.year || "",
    score: candidate.score,
    reason: candidate.reason
      ? {
          nameScore: candidate.reason.nameScore,
          matchedSearchName: candidate.reason.matchedSearchName,
          matchedCandidateName: candidate.reason.matchedCandidateName,
        }
      : undefined,
  };
}

async function autoResolveBggMatches() {
  const ownedRows = parseTsv(readText(COTTAGE_OWNED_GAMES_TSV_PATH));
  const overrides = readJson(FORCED_BGG_OVERRIDES_PATH, {});

  const result = {};

  for (const row of ownedRows) {
    const ownedName = getGameName(row);
    if (!ownedName) continue;

    if (overrides[ownedName]) {
      result[ownedName] = {
        status: "forced",
        bggId: overrides[ownedName],
        ownedName,
      };
      continue;
    }

    const nameCandidates = generateNameCandidates(ownedName);
    const bggCandidates = await searchBggCandidates(nameCandidates);

    const scored = scoreBggCandidates({
      ownedName,
      ownedRow: row,
      nameCandidates,
      candidates: bggCandidates,
    });

    const best = scored[0];
    const second = scored[1];
    const scoreGap = best && second ? best.score - second.score : 999;

    if (best && best.score >= 80 && scoreGap >= 8) {
      result[ownedName] = {
        status: "auto-confirmed",
        bggId: best.id,
        ownedName,
        bggName: best.name,
        score: best.score,
        scoreGap,
      };
    } else if (best && best.score >= 55) {
      result[ownedName] = {
        status: "needs-review",
        ownedName,
        bestGuess: {
          bggId: best.id,
          bggName: best.name,
          score: best.score,
          scoreGap,
        },
        reviewCandidates: scored.slice(0, 5).map(simplifyCandidate),
      };
    } else {
      result[ownedName] = {
        status: "unresolved",
        ownedName,
        reviewCandidates: scored.slice(0, 3).map(simplifyCandidate),
      };
    }
  }

  writeJson(BGG_MATCH_RESULT_PATH, result);

  const summary = Object.values(result).reduce(
    (acc, item) => {
      acc.total++;
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  console.log("BGG match result created:");
  console.log(summary);
}

module.exports = {
  autoResolveBggMatches,
};