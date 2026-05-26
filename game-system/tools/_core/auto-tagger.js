/**
 * auto-tag-rules.v1.js
 *
 * Cottageboard game auto-tag rule system.
 *
 * Goal:
 * - Keep DB tags structured.
 * - Generate autoTags from BGG data.
 * - Preserve manualTags as human override layer.
 * - Build displayTags as customer-facing summary tags.
 *
 * Recommended path:
 * game-system/tools/tagging/auto-tag-rules.js
 */

/* =========================
   # TAG MINIMUM SET v1
========================= */

const TAG_MINIMUM_SET_V1 = {
  moodTags: [
    "cozy",
    "tense",
    "funny",
    "chaotic",
    "immersive"
  ],

  playTags: [
    "party",
    "strategy",
    "deduction",
    "bluffing",
    "puzzle",
    "card_play",
    "storytelling",
    "dexterity",
    "murder_mystery"
  ],

  situationTags: [
    "beginner",
    "experienced",
    "couple",
    "group",
    "large_group",
    "quick_play",
    "long_stay",
    "first_game"
  ],

  interactionTags: [
    "competitive",
    "cooperative",
    "easy_coop",
    "hard_coop",
    "coop",
    "team",
    "hidden_role",
    "betrayal",
    "low_conflict",
    "table_talk",
    "social",
    "silent_focus",
    "simultaneous",
    "turn_based"
  ]
};

/* =========================
   # DISPLAY LABELS
========================= */

const TAG_LABELS_KR = {
  // 특수/수동 태그
  머더미:        "머더미스터리",
  murder_mystery:"머더미스터리",

  // moodTags → 6 카테고리
  cozy:          "편안하게",
  tense:         "빠져들게",
  funny:         "즐기고",
  chaotic:       "즐기고",
  immersive:     "빠져들게",

  // playTags → 6 카테고리
  party:         "즐기고",
  strategy:      "머리쓰게",
  deduction:     "머리쓰게",
  bluffing:      "대화하며",
  puzzle:        "머리쓰게",
  card_play:     "머리쓰게",
  storytelling:  "빠져들게",
  dexterity:     "즐기고",

  // interactionTags → 6 카테고리 또는 특수
  competitive:   "경쟁형",
  cooperative:   "같이해낼게",
  easy_coop:     "쉬운협력",
  hard_coop:     "어려운협력",
  coop:          "같이해낼게",
  team:          "같이해낼게",
  hidden_role:   "대화하며",
  betrayal:      "대화하며",
  low_conflict:  "편안하게",
  table_talk:    "대화하며",
  social:        "대화하며",
  silent_focus:  "집중형",
  simultaneous:  "동시진행",
  turn_based:    "순서진행",

  // 상황 태그 (displayTags 미포함)
  beginner:      "입문추천",
  experienced:   "게임러추천",
  couple:        "2인추천",
  group:         "모임추천",
  large_group:   "단체추천",
  quick_play:    "짧게한판",
  long_stay:     "오래즐김",
  first_game:    "첫게임추천",
};

/* =========================
   # BGG MECHANIC RULES
========================= */

const BGG_MECHANIC_TAG_RULES = {
  "Acting": {
    playTags: ["party", "storytelling"],
    moodTags: ["funny", "chaotic"],
    situationTags: ["group", "beginner"],
    interactionTags: ["table_talk"]
  },

  "Area Majority / Influence": {
    playTags: ["strategy"],
    interactionTags: ["competitive"]
  },

  "Auction/Bidding": {
    playTags: ["strategy"],
    interactionTags: ["competitive", "table_talk"]
  },

  "Bluffing": {
    playTags: ["bluffing", "party"],
    moodTags: ["tense", "funny"],
    interactionTags: ["competitive", "social", "table_talk"]
  },

  "Communication Limits": {
    playTags: ["deduction", "party"],
    moodTags: ["tense", "funny"],
    interactionTags: ["cooperative", "social", "table_talk"]
  },

  "Cooperative Game": {
    situationTags: ["beginner", "group"],
    interactionTags: ["cooperative", "low_conflict"]
  },

  "Deduction": {
    playTags: ["deduction"],
    moodTags: ["tense"],
    interactionTags: ["social", "table_talk"]
  },

  "Dexterity": {
    playTags: ["dexterity", "party"],
    moodTags: ["funny", "chaotic"],
    situationTags: ["beginner", "group", "quick_play"]
  },

  "Drawing": {
    playTags: ["party", "storytelling"],
    moodTags: ["funny", "cozy"],
    situationTags: ["beginner", "group"],
    interactionTags: ["table_talk"]
  },

  "Engine Building": {
    playTags: ["strategy"],
    moodTags: ["immersive"],
    situationTags: ["experienced", "long_stay"],
    interactionTags: ["competitive"]
  },

  "Hand Management": {
    playTags: ["card_play", "strategy"],
    interactionTags: ["competitive"]
  },

  "Hidden Roles": {
    playTags: ["deduction", "bluffing"],
    moodTags: ["tense"],
    situationTags: ["group", "large_group"],
    interactionTags: ["hidden_role", "betrayal", "team", "social", "table_talk"]
  },

  "Memory": {
    playTags: ["puzzle"],
    situationTags: ["beginner", "quick_play"]
  },

  "Negotiation": {
    moodTags: ["tense", "chaotic"],
    situationTags: ["group"],
    interactionTags: ["competitive", "social", "table_talk"]
  },

  "Pattern Recognition": {
    playTags: ["puzzle"],
    situationTags: ["quick_play"],
    interactionTags: ["silent_focus"]
  },

  "머더미스터리": {
    playTags: ["deduction", "murder_mystery"],
    moodTags: ["tense", "immersive"],
    interactionTags: ["social", "table_talk"]
  },

  "Push Your Luck": {
    playTags: ["party"],
    moodTags: ["tense", "funny"],
    situationTags: ["beginner", "quick_play"],
    interactionTags: ["competitive"]
  },

  "Real-Time": {
    playTags: ["party", "dexterity"],
    moodTags: ["chaotic", "tense"],
    situationTags: ["group", "quick_play"],
    interactionTags: ["simultaneous"]
  },

  "Set Collection": {
    playTags: ["card_play", "strategy"],
    interactionTags: ["competitive"]
  },

  "Simultaneous Action Selection": {
    interactionTags: ["simultaneous", "competitive"]
  },

  "Storytelling": {
    playTags: ["storytelling", "party"],
    moodTags: ["cozy", "immersive"],
    situationTags: ["group", "beginner"],
    interactionTags: ["table_talk"]
  },

  "Take That": {
    moodTags: ["chaotic", "funny"],
    interactionTags: ["competitive", "betrayal"]
  },

  "Team-Based Game": {
    situationTags: ["group"],
    interactionTags: ["team", "table_talk"]
  },

  "Tile Placement": {
    playTags: ["puzzle", "strategy"],
    interactionTags: ["competitive"]
  },

  "Trick-taking": {
    playTags: ["card_play", "strategy"],
    interactionTags: ["competitive", "turn_based"]
  },

  "Variable Player Powers": {
    playTags: ["strategy"],
    moodTags: ["immersive"],
    situationTags: ["experienced"]
  },

  "Worker Placement": {
    playTags: ["strategy"],
    moodTags: ["immersive"],
    situationTags: ["experienced", "long_stay"],
    interactionTags: ["competitive", "turn_based"]
  },

  "Word Game": {
    playTags: ["party", "deduction"],
    moodTags: ["funny"],
    situationTags: ["beginner", "group"],
    interactionTags: ["table_talk"]
  }
};

/* =========================
   # BGG CATEGORY RULES
========================= */

const BGG_CATEGORY_TAG_RULES = {
  "Card Game": {
    playTags: ["card_play"]
  },

  "Children's Game": {
    moodTags: ["cozy"],
    situationTags: ["beginner", "family", "first_game"]
  },

  "Deduction": {
    playTags: ["deduction"],
    moodTags: ["tense"],
    interactionTags: ["social", "table_talk"]
  },

  "Dice": {
    moodTags: ["funny"],
    situationTags: ["beginner", "quick_play"]
  },

  "Fantasy": {
    moodTags: ["immersive"]
  },

  "Fighting": {
    moodTags: ["tense"],
    interactionTags: ["competitive"]
  },

  "Humor": {
    moodTags: ["funny"],
    situationTags: ["group", "beginner"]
  },

  "Murder / Mystery": {
    playTags: ["deduction", "murder_mystery"],
    moodTags: ["tense", "immersive"],
    interactionTags: ["social", "table_talk"]
  },

  "Party Game": {
    playTags: ["party"],
    moodTags: ["funny", "chaotic"],
    situationTags: ["beginner", "group", "large_group", "first_game"],
    interactionTags: ["table_talk"]
  },

  "Puzzle": {
    playTags: ["puzzle"],
    interactionTags: ["silent_focus"]
  },

  "Real-time": {
    playTags: ["party", "dexterity"],
    moodTags: ["chaotic", "tense"],
    situationTags: ["quick_play"],
    interactionTags: ["simultaneous"]
  },

  "Trivia": {
    playTags: ["party"],
    moodTags: ["funny"],
    situationTags: ["group", "beginner"],
    interactionTags: ["table_talk"]
  },

  "Word Game": {
    playTags: ["party", "deduction"],
    moodTags: ["funny"],
    situationTags: ["beginner", "group"],
    interactionTags: ["table_talk"]
  }
};

/* =========================
   # DIFFICULTY RULES
========================= */

function getDifficultyAutoTags(weight) {
  const n = toNumber(weight);

  if (!n) {
    return {};
  }

  // 아이도 가능
  if (n <= 1.10) {
    return {
      moodTags: ["cozy"],
      situationTags: ["first_game", "quick_play"]
    };
  }

  // 입문 추천
  if (n <= 1.50) {
    return {
      moodTags: ["cozy"],
      situationTags: ["beginner", "first_game"]
    };
  }

  // 라이트 · 패밀리
  if (n <= 2.50) {
    return {
      situationTags: ["beginner"],
      interactionTags: ["low_conflict"]
    };
  }

  // 헤비 · 매니아
  if (n <= 3.50) {
    return {
      playTags: ["strategy"],
      moodTags: ["immersive"],
      situationTags: ["experienced", "long_stay"]
    };
  }

  // 하드코어
  return {
    playTags: ["strategy"],
    moodTags: ["immersive"],
    situationTags: ["experienced", "long_stay"],
    interactionTags: ["silent_focus"]
  };
}

function getCoopTypeTags(mechanics, weight) {
  if (!normalizeArray(mechanics).includes("Cooperative Game")) return {};
  const n = toNumber(weight);
  return (n > 0 && n <= 2.50)
    ? { interactionTags: ["easy_coop"], moodTags: ["cozy"] }
    : { interactionTags: ["hard_coop"] };
}

function getDifficultyIdFromWeight(weight) {
  const n = toNumber(weight);

  if (!n) return "";

if (n <= 1.10) return "kids";
if (n <= 1.50) return "beginner";
if (n <= 2.50) return "light_family";
if (n <= 3.50) return "heavy_mania";
return "hardcore";
}

/* =========================
   # PLAYER / TIME RULES
========================= */

function getPlayerAutoTags(game) {
  const bgg = game?.bgg || {};
  const bestPlayers = normalizeArray(bgg.bestPlayers || bgg.best_players);
  const minPlayers = toNumber(bgg.minPlayers || bgg.min_players);
  const maxPlayers = toNumber(bgg.maxPlayers || bgg.max_players);

  const tags = {
    situationTags: [],
    interactionTags: []
  };

  if (bestPlayers.includes(2) || (minPlayers <= 2 && maxPlayers === 2)) {
    tags.situationTags.push("couple");
  }

  if (maxPlayers >= 5 || bestPlayers.some((n) => n >= 5)) {
    tags.situationTags.push("group", "large_group");
  }

  if (maxPlayers >= 3 && maxPlayers <= 4) {
    tags.situationTags.push("group");
  }

  return tags;
}

function getTimeAutoTags(game) {
  const bgg = game?.bgg || {};
  const playingTime = toNumber(
    bgg.playingTime ||
    bgg.playing_time ||
    bgg.maxPlayTime ||
    bgg.max_play_time
  );

  if (!playingTime) return {};

  if (playingTime <= 20) {
    return {
      situationTags: ["quick_play"]
    };
  }

  if (playingTime >= 90) {
    return {
      situationTags: ["long_stay"],
      moodTags: ["immersive"]
    };
  }

  return {};
}

/* =========================
   # MAIN GENERATOR
========================= */

function generateAutoTags(game) {
  const bgg = game?.bgg || {};

  const mechanics = normalizeArray(bgg.mechanics);
  const categories = normalizeArray(bgg.categories);
  const weight = getBestDifficultyWeight(game);

  const result = createEmptyTagBucket();

  mechanics.forEach((mechanic) => {
    mergeTagBucket(result, BGG_MECHANIC_TAG_RULES[mechanic]);
  });

  categories.forEach((category) => {
    mergeTagBucket(result, BGG_CATEGORY_TAG_RULES[category]);
  });

  mergeTagBucket(result, getDifficultyAutoTags(weight));
  mergeTagBucket(result, getPlayerAutoTags(game));
  mergeTagBucket(result, getTimeAutoTags(game));
  mergeTagBucket(result, getCoopTypeTags(mechanics, weight));

  return cleanupTagBucket(result);
}

function normalizeDifficultyFields(game) {
  const next = { ...game };
  const cottage = { ...(next.cottage || {}) };

  const rawDifficultyId = cottage.difficultyId;
  const rawDifficultyWeight = cottage.difficultyWeight;

  const numericDifficultyId = toNumber(rawDifficultyId);
  const numericDifficultyWeight = toNumber(rawDifficultyWeight);

  const bggWeight = toNumber(next?.bgg?.weight);

  if (numericDifficultyId && !numericDifficultyWeight) {
    cottage.difficultyWeight = numericDifficultyId;
    cottage.difficultyId = getDifficultyIdFromWeight(numericDifficultyId);
  } else if (!cottage.difficultyId && numericDifficultyWeight) {
    cottage.difficultyId = getDifficultyIdFromWeight(numericDifficultyWeight);
  } else if (!cottage.difficultyId && bggWeight) {
    cottage.difficultyWeight = bggWeight;
    cottage.difficultyId = getDifficultyIdFromWeight(bggWeight);
  }

  next.cottage = cottage;
  return next;
}

function mergeCottageTags(game) {
  const normalizedGame = normalizeDifficultyFields(game);
  const next = { ...normalizedGame };
  const cottage = { ...(next.cottage || {}) };

  const autoTags = generateAutoTags(next);

  cottage.moodTags = unique([
    ...normalizeArray(autoTags.moodTags),
    ...normalizeArray(cottage.moodTags)
  ]);

  cottage.playTags = unique([
    ...normalizeArray(autoTags.playTags),
    ...normalizeArray(cottage.playTags)
  ]);

  cottage.situationTags = unique([
    ...normalizeArray(autoTags.situationTags),
    ...normalizeArray(cottage.situationTags)
  ]);

  cottage.interactionTags = unique([
    ...normalizeArray(autoTags.interactionTags),
    ...normalizeArray(cottage.interactionTags)
  ]);

  cottage.autoTags = unique(flattenTagBucket(autoTags));
  cottage.manualTags = unique(normalizeArray(cottage.manualTags));

  cottage.displayTags = buildDisplayTags(cottage);

  next.cottage = cottage;
  return next;
}

const DISPLAY_INTERACTION_ALLOWLIST = new Set([
  "easy_coop", "hard_coop",
  "competitive", "hidden_role",
  "table_talk", "social",
]);

function buildDisplayTags(cottage) {
  const manualTags = normalizeArray(cottage.manualTags);

  const priorityTags = [
    ...manualTags,
    ...normalizeArray(cottage.playTags),
    ...normalizeArray(cottage.moodTags),
    ...normalizeArray(cottage.interactionTags).filter(
      t => DISPLAY_INTERACTION_ALLOWLIST.has(t)
    ),
  ];

  return unique(
    unique(priorityTags).map((tag) => TAG_LABELS_KR[tag] || tag)
  ).slice(0, 4);
}

/* =========================
   # HELPERS
========================= */

function createEmptyTagBucket() {
  return {
    moodTags: [],
    playTags: [],
    situationTags: [],
    interactionTags: []
  };
}

function mergeTagBucket(target, source) {
  if (!source) return target;

  target.moodTags = unique([
    ...normalizeArray(target.moodTags),
    ...normalizeArray(source.moodTags)
  ]);

  target.playTags = unique([
    ...normalizeArray(target.playTags),
    ...normalizeArray(source.playTags)
  ]);

  target.situationTags = unique([
    ...normalizeArray(target.situationTags),
    ...normalizeArray(source.situationTags)
  ]);

  target.interactionTags = unique([
    ...normalizeArray(target.interactionTags),
    ...normalizeArray(source.interactionTags)
  ]);

  return target;
}

function cleanupTagBucket(bucket) {
  return {
    moodTags: filterKnownTags(bucket.moodTags, "moodTags"),
    playTags: filterKnownTags(bucket.playTags, "playTags"),
    situationTags: unique(normalizeArray(bucket.situationTags)),
    interactionTags: filterKnownTags(bucket.interactionTags, "interactionTags")
  };
}

function filterKnownTags(tags, groupName) {
  const allowed = TAG_MINIMUM_SET_V1[groupName] || [];
  return unique(normalizeArray(tags)).filter((tag) => allowed.includes(tag));
}

function flattenTagBucket(bucket) {
  if (!bucket) return [];

  return [
    ...normalizeArray(bucket.moodTags),
    ...normalizeArray(bucket.playTags),
    ...normalizeArray(bucket.situationTags),
    ...normalizeArray(bucket.interactionTags)
  ];
}

function unique(values) {
  return Array.from(new Set(normalizeArray(values)));
}

function normalizeArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map(normalizeValue)
      .filter((item) => item !== "");
  }

  return [normalizeValue(value)].filter((item) => item !== "");
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value.trim() : value;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getBestDifficultyWeight(game) {
  const cottage = game?.cottage || {};
  const bgg = game?.bgg || {};

  return (
    toNumber(cottage.difficultyWeight) ||
    toNumber(cottage.difficultyId) ||
    toNumber(bgg.weight)
  );
}

/* =========================
   # EXPORT
========================= */

const CottageAutoTagRules = {
  TAG_MINIMUM_SET_V1,
  TAG_LABELS_KR,
  BGG_MECHANIC_TAG_RULES,
  BGG_CATEGORY_TAG_RULES,
  generateAutoTags,
  mergeCottageTags,
  normalizeDifficultyFields,
  buildDisplayTags,
  getDifficultyIdFromWeight
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CottageAutoTagRules;
}

if (typeof window !== "undefined") {
  window.CottageAutoTagRules = CottageAutoTagRules;
}
