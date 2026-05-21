const path = require("path");

/**
 * COTTAGEBOARD PROJECT PATHS
 *
 * 원칙:
 * - 모든 tools 파일은 여기 경로만 가져다 쓴다.
 * - 개별 파일에서 ROOT 경로를 하드코딩하지 않는다.
 * - game-system 아래에 config / game-data / tools를 둔다.
 * - source / generated / library 역할을 분리한다.
 * - 디렉토리는 *_DIR, 실제 파일은 *_PATH로 구분한다.
 */

const ROOT_DIR = path.resolve(__dirname, "../../..");

/* =========================
   FRONTEND
========================= */

const INDEX_HTML_PATH = path.join(ROOT_DIR, "index.html");
const OWNED_GAMES_HTML_PATH = path.join(ROOT_DIR, "owned-games.html");

const ASSETS_DIR = path.join(ROOT_DIR, "assets");
const ASSETS_CSS_DIR = path.join(ASSETS_DIR, "css");
const ASSETS_JS_DIR = path.join(ASSETS_DIR, "js");
const ASSETS_IMAGES_DIR = path.join(ASSETS_DIR, "images");

const STYLE_CSS_PATH = path.join(ASSETS_CSS_DIR, "style.css");
const SCRIPT_JS_PATH = path.join(ASSETS_JS_DIR, "script.js");

/* =========================
   GAME SYSTEM ROOT
========================= */

const GAME_SYSTEM_DIR = path.join(ROOT_DIR, "game-system");

/* =========================
   GAME CONFIG
========================= */

const GAME_CONFIG_DIR = path.join(GAME_SYSTEM_DIR, "config");
const GAME_CONFIG_TAG_DIR = path.join(GAME_CONFIG_DIR, "tags");

const DIFFICULTY_LEVELS_PATH = path.join(
  GAME_CONFIG_DIR,
  "difficulty-levels.js"
);

const SHELF_GROUPS_PATH = path.join(
  GAME_CONFIG_DIR,
  "shelf-groups.js"
);

const MOOD_GROUPS_PATH = path.join(
  GAME_CONFIG_TAG_DIR,
  "mood-groups.js"
);

const PLAY_TAGS_PATH = path.join(
  GAME_CONFIG_TAG_DIR,
  "play-tags.js"
);

const RELATIONSHIP_TAGS_PATH = path.join(
  GAME_CONFIG_TAG_DIR,
  "relationship-tags.js"
);

const TAG_UTILS_PATH = path.join(
  GAME_CONFIG_TAG_DIR,
  "tag-utils.js"
);

const AUTO_TAG_RULES_PATH = path.join(
  GAME_DATA_TOOLS_DIR,
  "tagging/auto-tag-rules.js"
);

/* =========================
   GAME DATA ROOTS
========================= */

const GAME_DATA_DIR = path.join(GAME_SYSTEM_DIR, "game-data");

const SOURCE_DIR = path.join(GAME_DATA_DIR, "source");
const GENERATED_DIR = path.join(GAME_DATA_DIR, "generated");
const LIBRARY_DIR = path.join(GAME_DATA_DIR, "library");

/* =========================
   SOURCE DATA
========================= */

const SOURCE_CSV_DIR = path.join(SOURCE_DIR, "csv");
const SOURCE_MANUAL_DIR = path.join(SOURCE_DIR, "manual");

const BGG_RANKS_CSV_PATH = path.join(
  SOURCE_CSV_DIR,
  "boardgames_ranks.csv"
);

const COTTAGE_OWNED_GAMES_TSV_PATH = path.join(
  SOURCE_MANUAL_DIR,
  "cottage-owned-games.tsv"
);

/* =========================
   GENERATED DATA
========================= */

const GENERATED_CACHE_DIR = path.join(GENERATED_DIR, "cache");
const GENERATED_MAPS_DIR = path.join(GENERATED_DIR, "maps");

const BGG_MATCH_RESULT_PATH = path.join(
  GENERATED_CACHE_DIR,
  "bgg-match-result.json"
);

const BGG_SEARCH_CACHE_PATH = path.join(
  GENERATED_CACHE_DIR,
  "bgg-search-cache.json"
);

const BGG_DETAILS_CACHE_PATH = path.join(
  GENERATED_CACHE_DIR,
  "bgg-details-cache.json"
);

const AUTO_ENGLISH_CANDIDATES_CACHE_PATH = path.join(
  GENERATED_CACHE_DIR,
  "auto-english-candidates-cache.json"
);

const BGG_SEARCH_CANDIDATES_PATH = path.join(
  GENERATED_CACHE_DIR,
  "bgg-search-candidates.json"
);

const BGG_TAG_TRANSLATIONS_PATH = path.join(
  GENERATED_MAPS_DIR,
  "bgg-tag-translations.js"
);


const OWNED_GAMES_NORMALIZED_PATH =
  path.join(
    GAME_DATA_DIR,
    "source/owned-games-normalized.json"
  );

/* =========================
   LIBRARY DATA
========================= */

const OWNED_DIR = path.join(LIBRARY_DIR, "owned");

const OWNED_LEDGER_DIR = path.join(
  OWNED_DIR,
  "ledger"
);

const COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH = path.join(
  OWNED_LEDGER_DIR,
  "cottage-owned-games-ledger.xlsx"
);

const OWNED_MASTER_DIR = path.join(
  OWNED_DIR,
  "master"
);

const COTTAGE_OWNED_GAMES_MASTER_PATH = path.join(
  OWNED_MASTER_DIR,
  "cottage-owned-games-master.json"
);

const LIBRARY_GAMES_DIR = path.join(LIBRARY_DIR, "games");
const LIBRARY_MANUAL_DIR = path.join(LIBRARY_DIR, "manual");
const LIBRARY_IMAGES_DIR = path.join(LIBRARY_DIR, "images");
const LIBRARY_IMAGES_THUMB_DIR = path.join(LIBRARY_IMAGES_DIR, "thumb");
const LIBRARY_IMAGES_DETAIL_DIR = path.join(LIBRARY_IMAGES_DIR, "detail");

const COTTAGE_GAMES_DATA_JSON_PATH = path.join(
  LIBRARY_GAMES_DIR,
  "cottage-games-data.json"
);

const COTTAGE_GAMES_DATA_JS_PATH = path.join(
  LIBRARY_GAMES_DIR,
  "cottage-games-data.js"
);

const FORCED_BGG_OVERRIDES_PATH = path.join(
  LIBRARY_MANUAL_DIR,
  "forced-bgg-overrides.json"
);

const GAME_NAME_ALIASES_PATH = path.join(
  LIBRARY_MANUAL_DIR,
  "game-name-aliases.json"
);

const MANUAL_BGG_MATCHES_PATH = path.join(
  LIBRARY_MANUAL_DIR,
  "manual-bgg-matches.json"
);

const MOOD_TAG_RULES_PATH = path.join(
  LIBRARY_MANUAL_DIR,
  "mood-tag-rules.json"
);

/* =========================
   TOOLS
========================= */

const GAME_DATA_TOOLS_DIR = path.join(GAME_SYSTEM_DIR, "tools");

const TOOLS_CORE_DIR = path.join(GAME_DATA_TOOLS_DIR, "core");
const TOOLS_MATCH_DIR = path.join(GAME_DATA_TOOLS_DIR, "match");
const TOOLS_FETCH_DIR = path.join(GAME_DATA_TOOLS_DIR, "fetch");
const TOOLS_BUILD_DIR = path.join(GAME_DATA_TOOLS_DIR, "build");
const TOOLS_LEGACY_DIR = path.join(GAME_DATA_TOOLS_DIR, "legacy");

/* =========================
   EXPORTS
========================= */

module.exports = {
  ROOT_DIR,

  INDEX_HTML_PATH,
  OWNED_GAMES_HTML_PATH,
  OWNED_GAMES_NORMALIZED_PATH,

  ASSETS_DIR,
  ASSETS_CSS_DIR,
  ASSETS_JS_DIR,
  ASSETS_IMAGES_DIR,
  STYLE_CSS_PATH,
  SCRIPT_JS_PATH,

  GAME_SYSTEM_DIR,

  GAME_CONFIG_DIR,
  GAME_CONFIG_TAG_DIR,
  DIFFICULTY_LEVELS_PATH,
  SHELF_GROUPS_PATH,
  MOOD_GROUPS_PATH,
  PLAY_TAGS_PATH,
  RELATIONSHIP_TAGS_PATH,
  TAG_UTILS_PATH,
  AUTO_TAG_RULES_PATH,

  GAME_DATA_DIR,
  SOURCE_DIR,
  GENERATED_DIR,
  LIBRARY_DIR,
COTTAGE_OWNED_GAMES_MASTER_PATH,

  SOURCE_CSV_DIR,
  SOURCE_MANUAL_DIR,
  BGG_RANKS_CSV_PATH,
  COTTAGE_OWNED_GAMES_TSV_PATH,

  GENERATED_CACHE_DIR,
  GENERATED_MAPS_DIR,
  BGG_MATCH_RESULT_PATH,
  BGG_SEARCH_CACHE_PATH,
  BGG_DETAILS_CACHE_PATH,
  AUTO_ENGLISH_CANDIDATES_CACHE_PATH,
  BGG_SEARCH_CANDIDATES_PATH,
  BGG_TAG_TRANSLATIONS_PATH,

  
  OWNED_DIR,
  OWNED_LEDGER_DIR,
  COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH,
  OWNED_MASTER_DIR,
  LIBRARY_GAMES_DIR,
  LIBRARY_MANUAL_DIR,
  LIBRARY_IMAGES_DIR,
  LIBRARY_IMAGES_THUMB_DIR,
  LIBRARY_IMAGES_DETAIL_DIR,
  COTTAGE_GAMES_DATA_JSON_PATH,
  COTTAGE_GAMES_DATA_JS_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  GAME_NAME_ALIASES_PATH,
  MANUAL_BGG_MATCHES_PATH,
  MOOD_TAG_RULES_PATH,

  GAME_DATA_TOOLS_DIR,
  TOOLS_CORE_DIR,
  TOOLS_MATCH_DIR,
  TOOLS_FETCH_DIR,
  TOOLS_BUILD_DIR,
  TOOLS_LEGACY_DIR,
};

