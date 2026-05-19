const fs = require("fs");

const {
  readText,
  readJson,
  writeJson,
} = require("../core/read-write");

const {
  COTTAGE_OWNED_GAMES_TSV_PATH,
  BGG_MATCH_RESULT_PATH,
  BGG_DETAILS_CACHE_PATH,
  COTTAGE_GAMES_DATA_JS_PATH,
  COTTAGE_GAMES_DATA_JSON_PATH,
  OWNED_GAMES_NORMALIZED_PATH,
} = require("../core/paths");

const {
  mergeCottageTags,
} = require("../tagging/auto-tag-rules");

function parseTsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const headerIndex = lines.findIndex((line) =>
    line
      .split("\t")
      .some((cell) => cell.trim() === "보유게임명")
  );

  if (headerIndex === -1) {
    throw new Error(
      "TSV에서 '보유게임명' 헤더를 찾지 못했습니다."
    );
  }

  const headers = lines[headerIndex]
    .split("\t")
    .map((h) => h.trim());

  return lines
    .slice(headerIndex + 1)
    .map((line) => {
      const values = line.split("\t");
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      return row;
    });
}

function getValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      String(row[key]).trim() !== ""
    ) {
      return String(row[key]).trim();
    }
  }

  return fallback;
}

function getGameName(row) {
  return getValue(row, [
    "보유게임명",
    "name_kr",
    "korean_name",
    "한글명",
    "게임명",
    "name",
  ]);
}

function toNumber(value, fallback = 0) {
  const num = Number(
    String(value || "").replace(/[^\d.]/g, "")
  );

  return Number.isFinite(num) ? num : fallback;
}

function toArray(value) {
  if (!value) return [];

  return String(value)
    .split(/[,/|·ㆍ]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueArray(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function slugifyKorean(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getMatchInfo(matchResult, ownedName) {
  return matchResult[ownedName] || null;
}

function getBggId(matchInfo) {
  if (!matchInfo) return "";

  if (matchInfo.bggId) {
    return String(matchInfo.bggId);
  }

  if (matchInfo.bestGuess?.bggId) {
    return String(matchInfo.bestGuess.bggId);
  }

  return "";
}

function getBggName(matchInfo) {
  if (!matchInfo) return "";

  if (matchInfo.bggName) {
    return matchInfo.bggName;
  }

  if (matchInfo.bestGuess?.bggName) {
    return matchInfo.bestGuess.bggName;
  }

  return "";
}

function getSuggestedPlayers(details, normalizedOwned = {}) {
  const suggested =
    details.suggested_numplayers || {};

return {
  bestPlayers:
    suggested.best?.length
      ? suggested.best
      : normalizedOwned.bestPlayers || [],

  recommendedPlayers:
    suggested.recommended?.length
      ? suggested.recommended
      : normalizedOwned.recommendedPlayers || [],

  notRecommendedPlayers:
    suggested.not_recommended || [],

  supportsLargeGroup:
    normalizedOwned.supportsLargeGroup || false,
};
}

function makeTextBlock(text, source = "manual") {
  const cleanText = String(text || "").trim();

  return {
    text: cleanText,
    source: cleanText ? source : "none",
  };
}

function makeCommunityConfig(id, row) {
  const reviewEnabledRaw = getValue(
    row,
    [
      "후기활성화",
      "reviewEnabled",
      "review_enabled",
    ],
    "true"
  );

  const ratingEnabledRaw = getValue(
    row,
    [
      "평점활성화",
      "ratingEnabled",
      "rating_enabled",
    ],
    "true"
  );

  return {
    reviewEnabled:
      reviewEnabledRaw !== "false",
    ratingEnabled:
      ratingEnabledRaw !== "false",
    boardId: getValue(
      row,
      [
        "후기게시판ID",
        "reviewBoardId",
        "boardId",
      ],
      id
    ),
  };
}

function getManualTags(row) {
  return toArray(
    getValue(row, [
      "코티지태그",
      "cottage_tags",
      "추천태그",
      "태그",
      "manualTags",
      "manual_tags",
    ])
  );
}

function getMoodTags(row) {
  return toArray(
    getValue(row, [
      "분위기태그",
      "mood_tags",
      "moodTags",
      "분위기",
    ])
  );
}

function getPlayTags(row) {
  return toArray(
    getValue(row, [
      "플레이태그",
      "play_tags",
      "playTags",
      "플레이",
    ])
  );
}

function getSituationTags(row) {
  return toArray(
    getValue(row, [
      "상황태그",
      "situation_tags",
      "situationTags",
      "상황",
      "누구랑",
      "추천상황",
    ])
  );
}

function getInteractionTags(row) {
  return toArray(
    getValue(row, [
      "상호작용태그",
      "interaction_tags",
      "interactionTags",
      "관계구조",
      "상호작용",
    ])
  );
}

function getLegacyRelationshipTags(row) {
  return toArray(
    getValue(row, [
      "관계태그",
      "relationship_tags",
      "relationshipTags",
    ])
  );
}

function buildRawGameItem(
  row,
  matchResult,
  detailsCache,
  ownedGamesNormalized
) {
  const ownedName = getGameName(row);
  const id = slugifyKorean(ownedName);

const normalizedOwned =
  ownedGamesNormalized[ownedName] || {};

  const matchInfo = getMatchInfo(
    matchResult,
    ownedName
  );

  const bggId = getBggId(matchInfo);
  const bggName = getBggName(matchInfo);

  const details = bggId
    ? detailsCache[bggId] || {}
    : {};

  const displayTitle = getValue(
    row,
    [
      "표시명",
      "display_title",
      "title_kr",
    ],
    ownedName
  );

  const manualTags = getManualTags(row);
  const moodTags = getMoodTags(row);
  const playTags = getPlayTags(row);
  const situationTags = getSituationTags(row);
  const interactionTags = getInteractionTags(row);

  /*
   * Legacy compatibility:
   * 기존 relationshipTags는 너무 넓은 축이므로 장기적으로 폐기 대상.
   * 다만 기존 TSV/JSON과 하위호환을 위해 보존한다.
   * 새 추천 로직은 situationTags + interactionTags를 우선 사용한다.
   */
  const relationshipTags = getLegacyRelationshipTags(row);

const suggestedPlayers =
  getSuggestedPlayers(details, normalizedOwned);

     const normalizedRecommendedPlayers =
  normalizedOwned.recommendedPlayers || [];

  return {
    id,

    title: {
      display: displayTitle,
      owned: ownedName,
      bgg: bggName || "",
    },

    bgg: {
      id: bggId,
      matchStatus:
        matchInfo?.status || "unmatched",
      year: details.yearpublished || "",
     


      rating:
  toNumber(details.average, 0) ||
  toNumber(normalizedOwned.sourceRating, 0) ||
  0,

weight:
  toNumber(details.averageweight, 0) ||
  toNumber(normalizedOwned.difficultyWeight, 0) ||
  0,

minPlayers:
  toNumber(details.minplayers, 0) ||
  (normalizedRecommendedPlayers.length
    ? Math.min(...normalizedRecommendedPlayers)
    : 0),

maxPlayers:
  toNumber(details.maxplayers, 0) ||
  (normalizedRecommendedPlayers.length
    ? Math.max(...normalizedRecommendedPlayers)
    : 0),
      bestPlayers:
        suggestedPlayers.bestPlayers,
      recommendedPlayers:
        suggestedPlayers.recommendedPlayers,
      notRecommendedPlayers:
        suggestedPlayers.notRecommendedPlayers,
      playingTime: toNumber(
        details.playingtime,
        0
      ),
      minPlayTime: toNumber(
        details.minplaytime,
        0
      ),
      maxPlayTime: toNumber(
        details.maxplaytime,
        0
      ),
      categories:
        details.categories || [],
mechanics:
  details.mechanics?.length
    ? details.mechanics
    : toArray(normalizedOwned.sourceMechanism),
      designers:
        details.designers || [],
      description:
        details.description || "",
    },

    cottage: {
      status: getValue(
        row,
        [
          "상태",
          "status",
          "game_status",
        ],
        "active"
      ),

      shelfGroupId: getValue(
        row,
        [
          "책장그룹",
          "shelfGroupId",
          "shelf_group",
          "shelf",
        ]
      ),

      /*
       * difficultyId:
       * 장기적으로는 kids / beginner / light_family / heavy_mania / hardcore 같은 분류형 id.
       * 현재 TSV에 1.10 같은 숫자값이 들어와도 auto-tag-rules에서 자동 보정한다.
       */
difficultyId: getValue(
  row,
  [
    "난이도구분",
    "difficultyId",
    "difficulty_type",
  ]
),

      difficultyWeight:
  normalizedOwned.difficultyWeight ||
  toNumber(
    getValue(row, [
      "체감난이도",
      "difficultyWeight",
      "difficulty_weight",
    ]),
    0
  ),

      moodTags,
      playTags,
      situationTags,
      interactionTags,

      /*
       * Legacy field.
       * 기존 화면이나 임시 스크립트가 참조할 수 있으므로 일단 유지.
       */
      relationshipTags,

      manualTags,

      /*
       * autoTags/displayTags는 아래 mergeCottageTags()에서 최종 생성한다.
       */
      autoTags: [],
      displayTags: [],

      comment: makeTextBlock(
        getValue(row, [
          "코티지코멘트",
          "cottage_comment",
          "한줄평",
        ]),
        "manual"
      ),

      ruleSummary: makeTextBlock(
        getValue(row, [
          "룰요약",
          "rule_summary",
        ]),
        "manual"
      ),

      recommendPoint: makeTextBlock(
        getValue(row, [
          "추천포인트",
          "recommend_point",
        ]),
        "manual"
      ),

      caution: getValue(row, [
        "주의사항",
        "caution",
      ]),

      youtubeUrl: getValue(row, [
        "유튜브",
        "youtube_url",
        "youtube",
      ]),
    },

    images: {
      main: details.image || "",
      thumbnail:
        details.thumbnail || "",
      source: details.image
        ? "bgg"
        : "none",
      type: getValue(
        row,
        [
          "imageType",
          "이미지타입",
        ],
        "jpg"
      ),
    },

    community: makeCommunityConfig(
      id,
      row
    ),
  };
}

function buildGameItem(
  row,
  matchResult,
  detailsCache,
  ownedGamesNormalized
) {
const rawGame = buildRawGameItem(
  row,
  matchResult,
  detailsCache,
  ownedGamesNormalized
);
  return mergeCottageTags(rawGame);
}

function buildCottageGameData() {
  const ownedRows = parseTsv(
    readText(
      COTTAGE_OWNED_GAMES_TSV_PATH
    )
  );

  const matchResult = readJson(
    BGG_MATCH_RESULT_PATH,
    {}
  );

  const detailsCache = readJson(
    BGG_DETAILS_CACHE_PATH,
    {}
  );


  const ownedGamesNormalized = readJson(
  OWNED_GAMES_NORMALIZED_PATH,
  {}
);

  const gameData = {};

  ownedRows.forEach((row) => {
    const ownedName = getGameName(row);

    if (!ownedName) {
      return;
    }

const item = buildGameItem(
  row,
  matchResult,
  detailsCache,
  ownedGamesNormalized
);

    gameData[item.id] = item;
  });

  writeJson(
    COTTAGE_GAMES_DATA_JSON_PATH,
    gameData
  );

  const jsText =
    `const gameData = ${JSON.stringify(
      gameData,
      null,
      2
    )};\n\n` +
    `if (typeof window !== "undefined") {\n` +
    `  window.gameData = gameData;\n` +
    `}\n`;

  fs.writeFileSync(
    COTTAGE_GAMES_DATA_JS_PATH,
    jsText,
    "utf-8"
  );

  console.log(
    "Cottage game data created:"
  );

  console.log({
    total:
      Object.keys(gameData).length,

    json:
      COTTAGE_GAMES_DATA_JSON_PATH,

    js:
      COTTAGE_GAMES_DATA_JS_PATH,
  });
}

module.exports = {
  buildCottageGameData,
};
