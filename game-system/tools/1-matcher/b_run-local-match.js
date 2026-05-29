const { readJson, writeJson } = require("../_core/file-read-writer");
const {
  COTTAGE_OWNED_GAMES_XLSX_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  BGG_MATCH_MAP_PATH,
} = require("../_core/paths");

const { readXlsxNormalized } = require("../0-input/from-file/import-from-xlsx");
const { generateNameCandidates } = require("./1-korean-to-english-title");
const { searchBggCandidates } = require("./2b-search-bgg-csv-by-title");
const { scoreBggCandidates } = require("./3-score-and-pick-best-title");

function getGameName(row) {
  return (
    row.ownedName ||
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
  const { rows: ownedRows } = await readXlsxNormalized(COTTAGE_OWNED_GAMES_XLSX_PATH);
  const overrides = readJson(FORCED_BGG_OVERRIDES_PATH, {});

  const result = {};

  for (const row of ownedRows) {
    const ownedName = getGameName(row);
    if (!ownedName) continue;

    if (ownedName in overrides) {
      const overrideId = overrides[ownedName];
      if (!overrideId || overrideId === "skip") {
        result[ownedName] = { status: "no-bgg", ownedName };
      } else {
        result[ownedName] = { status: "forced", bggId: overrideId, ownedName };
      }
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

  writeJson(BGG_MATCH_MAP_PATH, result);

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