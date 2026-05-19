const { normalizeGameName } = require("../core/normalize-game-name");

function toNumber(value, fallback = 0) {
  const num = Number(value);

  return Number.isFinite(num)
    ? num
    : fallback;
}

function tokenSimilarity(a, b) {
  const normalizedA = normalizeGameName(a);
  const normalizedB = normalizeGameName(b);

  if (!normalizedA || !normalizedB) return 0;

  if (normalizedA === normalizedB) {
    return 100;
  }

  if (
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  ) {
    const shorter =
      normalizedA.length < normalizedB.length
        ? normalizedA
        : normalizedB;

    const longer =
      normalizedA.length >= normalizedB.length
        ? normalizedA
        : normalizedB;

    /**
     * 짧은 단어가 긴 단어 내부 일부로만 들어간 경우 방지
     *
     * 예:
     * cat / catastrophe
     */
    const longerWords = new Set(
      longer.split(" ").filter(Boolean)
    );

    if (!longerWords.has(shorter)) {
      return 20;
    }

    if (shorter.length <= 2) return 20;
    if (shorter.length <= 4) return 45;

    return 82;
  }

  const aWords = new Set(
    normalizedA.split(" ").filter(Boolean)
  );

  const bWords = new Set(
    normalizedB.split(" ").filter(Boolean)
  );

  if (aWords.size === 0 || bWords.size === 0) {
    return 0;
  }

  let overlap = 0;

  aWords.forEach((word) => {
    if (bWords.has(word)) {
      overlap++;
    }
  });

  return Math.round(
    (overlap / Math.max(aWords.size, bWords.size)) * 70
  );
}

function getBestNameScore(searchNames, candidate) {
  const candidateNames = [
    candidate.name,
    ...(candidate.alternate_names || []),
    candidate.searchQuery,
  ].filter(Boolean);

  let best = {
    score: 0,
    matchedSearchName: "",
    matchedCandidateName: "",
  };

  searchNames.forEach((searchName) => {
    candidateNames.forEach((candidateName) => {
      const score = tokenSimilarity(
        searchName,
        candidateName
      );

      if (score > best.score) {
        best = {
          score,
          matchedSearchName: searchName,
          matchedCandidateName: candidateName,
        };
      }
    });
  });

  return best;
}

function getRankBonus(candidate) {
  const rank = toNumber(candidate.rank, 0);

  if (!rank) return 0;

  if (rank <= 100) return 10;
  if (rank <= 500) return 8;
  if (rank <= 1000) return 6;
  if (rank <= 3000) return 4;
  if (rank <= 7000) return 2;

  return 0;
}

function getUsersRatedBonus(candidate) {
  const usersRated = toNumber(
    candidate.usersrated,
    0
  );

  if (usersRated >= 10000) return 6;
  if (usersRated >= 3000) return 4;
  if (usersRated >= 1000) return 2;

  return 0;
}

function getExpansionPenalty(candidate, ownedName) {
  const owned = normalizeGameName(ownedName);

  const candidateName = normalizeGameName(
    candidate.name
  );

  const ownedLooksExpansion =
    owned.includes("확장") ||
    owned.includes("expansion");

  const candidateLooksExpansion =
    candidate.isExpansion ||
    candidateName.includes("expansion");

  if (
    !ownedLooksExpansion &&
    candidateLooksExpansion
  ) {
    return -18;
  }

  return 0;
}

function getSourceBonus(candidate) {
  const source = String(candidate.source || "");
  const matchSource = String(
    candidate.matchSource || ""
  );

  let bonus = 0;

  if (source.includes("csv")) {
    bonus += 3;
  }

  if (source.includes("api-search")) {
    bonus += 3;
  }

  if (matchSource.includes("local-csv")) {
    bonus += 2;
  }

  if (matchSource.includes("api-search")) {
    bonus += 2;
  }

  return bonus;
}

function scoreBggCandidates({
  ownedName,
  nameCandidates = [],
  candidates,
}) {
  const searchNames = [
    ownedName,
    ...nameCandidates,
  ].filter(Boolean);

  return candidates
    .map((candidate) => {
      const nameMatch = getBestNameScore(
        searchNames,
        candidate
      );

      const rankBonus = getRankBonus(candidate);

      const usersRatedBonus =
        getUsersRatedBonus(candidate);

      const expansionPenalty =
        getExpansionPenalty(
          candidate,
          ownedName
        );

      const sourceBonus =
        getSourceBonus(candidate);

      const totalScore =
        nameMatch.score +
        rankBonus +
        usersRatedBonus +
        expansionPenalty +
        sourceBonus;

      return {
        ...candidate,

        score: totalScore,

        reason: {
          nameScore: nameMatch.score,
          matchedSearchName:
            nameMatch.matchedSearchName,
          matchedCandidateName:
            nameMatch.matchedCandidateName,

          rankBonus,
          usersRatedBonus,
          expansionPenalty,
          sourceBonus,
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  scoreBggCandidates,
};