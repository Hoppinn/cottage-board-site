/**
 * game-view-utils.js
 *
 * 역할:
 * - nested gameData 구조를 화면 출력용 데이터로 변환한다.
 * - 프론트 코드가 game.bgg / game.cottage / game.images 경로를 직접 많이 뒤지지 않게 한다.
 * - paths.js가 파일 경로를 중앙관리하듯, 이 파일은 게임 출력 경로를 중앙관리한다.
 *
 * 핵심 원칙:
 * - gameData = 출처/운영 기준 DB
 * - CottageGameView = 화면/추천/상세페이지 기준 view adapter
 * - BGG raw data와 코티지 해석값이 겹치면 코티지 값을 우선한다.
 *
 * 전제:
 * - window.gameData가 먼저 로드되어 있어야 한다.
 */

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function uniqueArray(items) {
  return [...new Set(safeArray(items).filter(Boolean))];
}

function getTextBlockText(block, fallback = "") {
  if (!block) return fallback;
  return safeText(block.text, fallback);
}

function getTextBlockSource(block, fallback = "none") {
  if (!block) return fallback;
  return safeText(block.source, fallback);
}

function getDisplayTitle(game) {
  return (
    safeText(game?.title?.display) ||
    safeText(game?.title?.owned) ||
    safeText(game?.title?.bgg) ||
    "이름 없는 게임"
  );
}

function getOwnedTitle(game) {
  return safeText(game?.title?.owned);
}

function getBggTitle(game) {
  return safeText(game?.title?.bgg);
}

function getGameImage(game) {
  return (
    safeText(game?.images?.thumbnail) ||
    safeText(game?.images?.main) ||
    ""
  );
}

function getGameMainImage(game) {
  return (
    safeText(game?.images?.main) ||
    safeText(game?.images?.thumbnail) ||
    ""
  );
}

function getDifficultyWeight(game) {
  return (
    safeNumber(game?.cottage?.difficultyWeight, 0) ||
    safeNumber(game?.bgg?.weight, 0)
  );
}

function getDifficultyId(game) {
  return safeText(game?.cottage?.difficultyId);
}

function getRating(game) {
  return safeNumber(game?.bgg?.rating, 0);
}

function getBestPlayers(game) {
  return safeArray(game?.bgg?.bestPlayers);
}

function getRecommendedPlayers(game) {
  return safeArray(game?.bgg?.recommendedPlayers);
}

function getNotRecommendedPlayers(game) {
  return safeArray(game?.bgg?.notRecommendedPlayers);
}

function getMinPlayers(game) {
  return safeNumber(game?.bgg?.minPlayers, 0);
}

function getMaxPlayers(game) {
  return safeNumber(game?.bgg?.maxPlayers, 0);
}

function getPlayerRangeText(game) {
  const min = getMinPlayers(game);
  const max = getMaxPlayers(game);

  if (min && max && min !== max) {
    return `${min}-${max}인`;
  }

  if (min && max && min === max) {
    return `${min}인`;
  }

  if (min) {
    return `${min}인 이상`;
  }

  return "";
}

function getBestPlayersText(game) {
  const bestPlayers = getBestPlayers(game);

  if (bestPlayers.length > 0) {
    return `${bestPlayers.join(", ")}인 베스트`;
  }

  return "";
}

function getRecommendedPlayersText(game) {
  const recommendedPlayers = getRecommendedPlayers(game);

  if (recommendedPlayers.length > 0) {
    return `${recommendedPlayers.join(", ")}인 추천`;
  }

  const rangeText = getPlayerRangeText(game);

  return rangeText ? `${rangeText} 가능` : "";
}

function getPrimaryPlayersText(game) {
  return (
    getBestPlayersText(game) ||
    getRecommendedPlayersText(game) ||
    getPlayerRangeText(game)
  );
}

function getPlayingTimeMinutes(game) {
  return safeNumber(game?.bgg?.playingTime, 0);
}

function getPlayingTimeText(game) {
  const min = safeNumber(game?.bgg?.minPlayTime, 0);
  const max = safeNumber(game?.bgg?.maxPlayTime, 0);
  const base = getPlayingTimeMinutes(game);

  if (min && max && min !== max) {
    return `${min}-${max}분`;
  }

  if (base) {
    return `약 ${base}분`;
  }

  if (min) {
    return `약 ${min}분`;
  }

  return "";
}

function getPlayingTimeGroup(game) {
  const minutes = getPlayingTimeMinutes(game);

  if (!minutes) return "";

  if (minutes <= 20) return "short";
  if (minutes <= 45) return "medium";
  if (minutes <= 90) return "long";

  return "very_long";
}

function getPlayingTimeGroupLabel(game) {
  const group = getPlayingTimeGroup(game);

  const labels = {
    short: "짧게 즐겨요",
    medium: "가볍게 한 판",
    long: "충분히 몰입",
    very_long: "긴 호흡",
  };

  return labels[group] || "";
}

function getMoodTags(game) {
  return safeArray(game?.cottage?.moodTags);
}

function getPlayTags(game) {
  return safeArray(game?.cottage?.playTags);
}

function getRelationshipTags(game) {
  return safeArray(game?.cottage?.relationshipTags);
}

function getManualTags(game) {
  return safeArray(game?.cottage?.manualTags);
}

function getAutoTags(game) {
  return safeArray(game?.cottage?.autoTags);
}

function getDisplayTags(game) {
  const explicitDisplayTags =
    safeArray(game?.cottage?.displayTags);

  if (explicitDisplayTags.length > 0) {
    return uniqueArray(explicitDisplayTags);
  }

  return uniqueArray([
    ...getManualTags(game),
    ...getMoodTags(game),
    ...getPlayTags(game),
    ...getRelationshipTags(game),
    ...getAutoTags(game),
  ]);
}

function getPrimaryTags(game, limit = 6) {
  return getDisplayTags(game).slice(0, limit);
}

function getBggCategories(game) {
  return safeArray(game?.bgg?.categories);
}

function getBggMechanics(game) {
  return safeArray(game?.bgg?.mechanics);
}

function getDesigners(game) {
  return safeArray(game?.bgg?.designers);
}

function getCommentText(game) {
  return (
    getTextBlockText(game?.cottage?.comment) ||
    safeText(game?.bgg?.descriptionKo) ||
    safeText(game?.bgg?.description)
  );
}

function getCommentSource(game) {
  const manualSource =
    getTextBlockSource(game?.cottage?.comment);

  if (manualSource !== "none") {
    return manualSource;
  }

  return safeText(game?.bgg?.description)
    ? "bgg"
    : "none";
}

function getRuleSummaryText(game) {
  return getTextBlockText(game?.cottage?.ruleSummary);
}

function getRecommendPointText(game) {
  return getTextBlockText(game?.cottage?.recommendPoint);
}

function getCautionText(game) {
  return safeText(game?.cottage?.caution);
}

function getYoutubeUrl(game) {
  return safeText(game?.cottage?.youtubeUrl);
}

function getCommunityData(game) {
  return {
    reviewEnabled: game?.community?.reviewEnabled !== false,
    ratingEnabled: game?.community?.ratingEnabled !== false,
    boardId: safeText(game?.community?.boardId, game?.id || ""),
  };
}

function getGameStatus(game) {
  return safeText(game?.cottage?.status, "active");
}

function isActiveGame(game) {
  return getGameStatus(game) === "active";
}

function getSearchText(game) {
  return [
    getDisplayTitle(game),
    getOwnedTitle(game),
    getBggTitle(game),
    ...getDisplayTags(game),
    ...getMoodTags(game),
    ...getPlayTags(game),
    ...getRelationshipTags(game),
    ...getBggCategories(game),
    ...getBggMechanics(game),
    ...getDesigners(game),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getGameCardData(game) {
  return {
    id: game?.id || "",
    title: getDisplayTitle(game),
    image: getGameImage(game),

    rating: getRating(game),
    difficultyId: getDifficultyId(game),
    difficultyWeight: getDifficultyWeight(game),

    bestPlayers: getBestPlayers(game),
    recommendedPlayers: getRecommendedPlayers(game),
    playerRangeText: getPlayerRangeText(game),
    primaryPlayersText: getPrimaryPlayersText(game),

    playingTimeText: getPlayingTimeText(game),
    playingTimeMinutes: getPlayingTimeMinutes(game),
    playingTimeGroup: getPlayingTimeGroup(game),
    playingTimeGroupLabel: getPlayingTimeGroupLabel(game),

    tags: getPrimaryTags(game),
    status: getGameStatus(game),
    searchText: getSearchText(game),
  };
}

function getGameDetailData(game) {
  return {
    id: game?.id || "",

    title: getDisplayTitle(game),
    ownedTitle: getOwnedTitle(game),
    bggTitle: getBggTitle(game),

    image: getGameMainImage(game),
    thumbnail: getGameImage(game),

    rating: getRating(game),
    difficultyId: getDifficultyId(game),
    difficultyWeight: getDifficultyWeight(game),

    bestPlayers: getBestPlayers(game),
    recommendedPlayers: getRecommendedPlayers(game),
    notRecommendedPlayers: getNotRecommendedPlayers(game),
    playerRangeText: getPlayerRangeText(game),
    bestPlayersText: getBestPlayersText(game),
    recommendedPlayersText: getRecommendedPlayersText(game),
    primaryPlayersText: getPrimaryPlayersText(game),

    playingTimeText: getPlayingTimeText(game),
    playingTimeMinutes: getPlayingTimeMinutes(game),
    playingTimeGroup: getPlayingTimeGroup(game),
    playingTimeGroupLabel: getPlayingTimeGroupLabel(game),

    comment: getCommentText(game),
    commentSource: getCommentSource(game),
    ruleSummary: getRuleSummaryText(game),
    recommendPoint: getRecommendPointText(game),
    caution: getCautionText(game),
    youtubeUrl: getYoutubeUrl(game),

    moodTags: getMoodTags(game),
    playTags: getPlayTags(game),
    relationshipTags: getRelationshipTags(game),
    manualTags: getManualTags(game),
    autoTags: getAutoTags(game),
    displayTags: getDisplayTags(game),
    primaryTags: getPrimaryTags(game),

    bgg: {
      id: safeText(game?.bgg?.id),
      matchStatus: safeText(game?.bgg?.matchStatus),
      year: safeText(game?.bgg?.year),
      rating: getRating(game),
      weight: safeNumber(game?.bgg?.weight, 0),
      minPlayers: getMinPlayers(game),
      maxPlayers: getMaxPlayers(game),
      categories: getBggCategories(game),
      mechanics: getBggMechanics(game),
      designers: getDesigners(game),
      description: safeText(game?.bgg?.description),
      descriptionKo: safeText(game?.bgg?.descriptionKo),
    },

    community: getCommunityData(game),
    status: getGameStatus(game),
    searchText: getSearchText(game),
  };
}

function getRecommendData(game) {
  return {
    id: game?.id || "",
    title: getDisplayTitle(game),
    image: getGameImage(game),

    difficultyId: getDifficultyId(game),
    difficultyWeight: getDifficultyWeight(game),

    bestPlayers: getBestPlayers(game),
    recommendedPlayers: getRecommendedPlayers(game),
    playerRangeText: getPlayerRangeText(game),
    bestPlayersText: getBestPlayersText(game),
    recommendedPlayersText: getRecommendedPlayersText(game),
    primaryPlayersText: getPrimaryPlayersText(game),

    moodTags: getMoodTags(game),
    playTags: getPlayTags(game),
    relationshipTags: getRelationshipTags(game),
    displayTags: getDisplayTags(game),
    primaryTags: getPrimaryTags(game),

    rating: getRating(game),
    playingTimeText: getPlayingTimeText(game),
    playingTimeMinutes: getPlayingTimeMinutes(game),
    playingTimeGroup: getPlayingTimeGroup(game),
    playingTimeGroupLabel: getPlayingTimeGroupLabel(game),

    comment: getCommentText(game),
    recommendPoint: getRecommendPointText(game),
    status: getGameStatus(game),
    searchText: getSearchText(game),
  };
}

function getAllGamesArray(gameData) {
  return Object.values(gameData || {});
}

if (typeof window !== "undefined") {
  window.CottageGameView = {
    safeArray,
    safeText,
    safeNumber,
    uniqueArray,

    getDisplayTitle,
    getOwnedTitle,
    getBggTitle,

    getGameImage,
    getGameMainImage,

    getDifficultyWeight,
    getDifficultyId,
    getRating,

    getBestPlayers,
    getRecommendedPlayers,
    getNotRecommendedPlayers,
    getMinPlayers,
    getMaxPlayers,
    getPlayerRangeText,
    getBestPlayersText,
    getRecommendedPlayersText,
    getPrimaryPlayersText,

    getPlayingTimeMinutes,
    getPlayingTimeText,
    getPlayingTimeGroup,
    getPlayingTimeGroupLabel,

    getDisplayTags,
    getPrimaryTags,
    getMoodTags,
    getPlayTags,
    getRelationshipTags,
    getManualTags,
    getAutoTags,

    getBggCategories,
    getBggMechanics,
    getDesigners,

    getCommentText,
    getCommentSource,
    getRuleSummaryText,
    getRecommendPointText,
    getCautionText,
    getYoutubeUrl,

    getCommunityData,
    getGameStatus,
    isActiveGame,
    getSearchText,

    getGameCardData,
    getGameDetailData,
    getRecommendData,
    getAllGamesArray,
  };
}
