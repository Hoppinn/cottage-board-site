/**
 * auto-tag-rules.v1.js
 *
 * 아직 실행용 최종 파일이 아니라, 태그 설문지 기반의 초안 규칙표다.
 * 이후 game-system/config/auto-tag-rules.js로 정리한다.
 */

const AUTO_TAG_RULES_V1 = {
  mechanics: {
    Bluffing: {
      moodTags: ["tense", "talky"],
      playTags: ["bluffing"],
      situationTags: ["friends"],
      interactionTags: ["competitive", "table_talk"],
    },

    Deduction: {
      moodTags: ["brainy", "tense"],
      playTags: ["deduction"],
      situationTags: ["friends", "experienced"],
      interactionTags: ["competitive"],
    },

    "Cooperative Game": {
      moodTags: ["immersive"],
      playTags: [],
      situationTags: ["friends", "family"],
      interactionTags: ["cooperative", "low_conflict"],
    },

    "Hidden Roles": {
      moodTags: ["tense", "talky"],
      playTags: ["deduction", "bluffing"],
      situationTags: ["group", "large_group"],
      interactionTags: ["hidden_role", "betrayal", "team", "table_talk"],
    },

    "Real-Time": {
      moodTags: ["exciting", "chaotic"],
      playTags: ["reaction"],
      situationTags: ["friends", "group"],
      interactionTags: ["simultaneous"],
    },

    "Memory": {
      moodTags: ["light", "brainy"],
      playTags: ["memory"],
      situationTags: ["family", "beginner"],
      interactionTags: ["competitive"],
    },

    "Auction/Bidding": {
      moodTags: ["brainy", "tense"],
      playTags: ["auction"],
      situationTags: ["experienced"],
      interactionTags: ["competitive", "table_talk"],
    },

    Negotiation: {
      moodTags: ["talky", "tense"],
      playTags: ["negotiation"],
      situationTags: ["friends", "experienced"],
      interactionTags: ["competitive", "table_talk", "take_that"],
    },

    "Trick-taking": {
      moodTags: ["brainy"],
      playTags: ["trick_taking", "card_play"],
      situationTags: ["experienced"],
      interactionTags: ["competitive", "turn_based"],
    },

    "Push Your Luck": {
      moodTags: ["exciting", "light"],
      playTags: ["push_your_luck"],
      situationTags: ["beginner", "friends"],
      interactionTags: ["competitive"],
    },
  },

  categories: {
    "Party Game": {
      moodTags: ["funny", "light", "talky"],
      playTags: ["party"],
      situationTags: ["group", "beginner", "first_game"],
      interactionTags: ["table_talk"],
    },

    "Word Game": {
      moodTags: ["talky", "brainy"],
      playTags: ["word"],
      situationTags: ["friends", "group"],
      interactionTags: ["team", "table_talk"],
    },

    "Card Game": {
      moodTags: [],
      playTags: ["card_play"],
      situationTags: [],
      interactionTags: ["turn_based"],
    },

    "Dice": {
      moodTags: ["light", "exciting"],
      playTags: ["push_your_luck"],
      situationTags: ["beginner"],
      interactionTags: ["competitive"],
    },
  },

  weight: [
    {
      max: 1.2,
      add: {
        moodTags: ["light"],
        situationTags: ["beginner", "first_game"],
      },
    },
    {
      min: 3.0,
      add: {
        moodTags: ["brainy", "immersive"],
        situationTags: ["experienced", "long_stay"],
      },
    },
  ],

  players: [
    {
      bestIncludes: 2,
      add: {
        situationTags: ["couple", "date"],
      },
    },
    {
      bestMin: 5,
      add: {
        situationTags: ["group", "large_group"],
      },
    },
  ],

  playingTime: [
    {
      max: 20,
      add: {
        situationTags: ["quick_play"],
      },
    },
    {
      min: 90,
      add: {
        situationTags: ["long_stay"],
      },
    },
  ],
};

if (typeof module !== "undefined") {
  module.exports = {
    AUTO_TAG_RULES_V1,
  };
}
