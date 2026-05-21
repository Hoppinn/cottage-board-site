const path = require("path");

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
const GAME_DISPLAY_ADAPTER_PATH = path.join(ASSETS_JS_DIR, "game-display-adapter.js");

/* =========================
   GAME SYSTEM ROOT
========================= */

const GAME_SYSTEM_DIR = path.join(ROOT_DIR, "game-system");

/* =========================
   TOOLS (먼저 선언 — AUTO_TAGGER_PATH 참조)
========================= */

const TOOLS_DIR = path.join(GAME_SYSTEM_DIR, "tools");
const TOOLS_CORE_DIR = path.join(TOOLS_DIR, "_core");
const TOOLS_INPUT_DIR = path.join(TOOLS_DIR, "0-input");
const TOOLS_MATCHER_DIR = path.join(TOOLS_DIR, "1-matcher");
const TOOLS_FETCHER_DIR = path.join(TOOLS_DIR, "2-fetcher");
const TOOLS_BUILD_MASTER_DIR = path.join(TOOLS_DIR, "3-build-master");
const TOOLS_BUILD_OUTPUT_DIR = path.join(TOOLS_DIR, "4-build-output");

const AUTO_TAGGER_PATH = path.join(TOOLS_CORE_DIR, "auto-tagger.js");

/* =========================
   GAME CONFIG
========================= */

const GAME_CONFIG_DIR = path.join(GAME_SYSTEM_DIR, "config");
const GAME_CONFIG_TAG_DIR = path.join(GAME_CONFIG_DIR, "tags");

const DIFFICULTY_LEVELS_PATH = path.join(GAME_CONFIG_DIR, "difficulty-levels.js");
const SHELF_LOCATIONS_PATH = path.join(GAME_CONFIG_DIR, "shelf-locations.js");
const BGG_LABEL_MAP_PATH = path.join(GAME_CONFIG_DIR, "bgg-label-map.js");

const MOOD_TAGS_PATH = path.join(GAME_CONFIG_TAG_DIR, "mood-tags.js");
const PLAY_MECHANISM_TAGS_PATH = path.join(GAME_CONFIG_TAG_DIR, "play-mechanism-tags.js");
const RELATIONSHIP_TAGS_PATH = path.join(GAME_CONFIG_TAG_DIR, "relationship-tags.js");
const GAME_TAG_MATCHER_PATH = path.join(GAME_CONFIG_TAG_DIR, "game-tag-matcher.js");

/* =========================
   GAME DATA ROOTS
========================= */

const GAME_DATA_DIR = path.join(GAME_SYSTEM_DIR, "game-data");

const SOURCE_DIR = path.join(GAME_DATA_DIR, "source");
const STAGING_DIR = path.join(GAME_DATA_DIR, "staging");
const LIBRARY_DIR = path.join(GAME_DATA_DIR, "library");

/* =========================
   SOURCE DATA
========================= */

const SOURCE_BGG_DIR = path.join(SOURCE_DIR, "1-bgg");
const SOURCE_BGG_CSV_DIR = path.join(SOURCE_BGG_DIR, "csv");
const SOURCE_BGG_API_DIR = path.join(SOURCE_BGG_DIR, "api");
const SOURCE_COTTAGE_MANUAL_DIR = path.join(SOURCE_DIR, "2-cottage-manual");

const BGG_RANKS_CSV_PATH = path.join(SOURCE_BGG_CSV_DIR, "boardgames_ranks.csv");
const COTTAGE_OWNED_GAMES_XLSX_PATH = path.join(SOURCE_COTTAGE_MANUAL_DIR, "cottage-owned-games.xlsx");

/* =========================
   STAGING DATA
========================= */

const STAGING_BGG_ID_MAPPING_DIR = path.join(STAGING_DIR, "bgg-id-mapping");
const STAGING_BGG_API_SNAPSHOT_DIR = path.join(STAGING_DIR, "bgg-api-snapshot");

const BGG_SEARCH_CANDIDATES_PATH = path.join(STAGING_BGG_ID_MAPPING_DIR, "1-search-candidates.json");
const BGG_MATCH_MAP_PATH = path.join(STAGING_BGG_ID_MAPPING_DIR, "2-match-map.json");
const BGG_UNRESOLVED_CANDIDATES_PATH = path.join(STAGING_BGG_ID_MAPPING_DIR, "3-unresolved-candidates.json");

const BGG_NAME_SEARCH_PATH = path.join(STAGING_BGG_API_SNAPSHOT_DIR, "bgg-name-search.json");
const BGG_GAME_DETAILS_PATH = path.join(STAGING_BGG_API_SNAPSHOT_DIR, "bgg-game-details.json");

/* =========================
   LIBRARY DATA
========================= */

const LIBRARY_MASTER_DIR = path.join(LIBRARY_DIR, "1-master");
const LIBRARY_LEDGER_DIR = path.join(LIBRARY_DIR, "2-ledger");
const LIBRARY_OUTPUT_DIR = path.join(LIBRARY_DIR, "3-output");
const LIBRARY_HUMAN_INPUT_DIR = path.join(LIBRARY_DIR, "human-input");
const LIBRARY_OVERWRITE_DIR = path.join(LIBRARY_HUMAN_INPUT_DIR, "overwrite");
const LIBRARY_MISSING_FILL_DIR = path.join(LIBRARY_HUMAN_INPUT_DIR, "missing-fill");
const LIBRARY_IMAGES_DIR = path.join(LIBRARY_DIR, "images");
const LIBRARY_IMAGES_THUMB_DIR = path.join(LIBRARY_IMAGES_DIR, "thumb");
const LIBRARY_IMAGES_DETAIL_DIR = path.join(LIBRARY_IMAGES_DIR, "detail");

const COTTAGE_OWNED_GAMES_MASTER_PATH = path.join(LIBRARY_MASTER_DIR, "cottage-owned-games-master.json");
const COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH = path.join(LIBRARY_LEDGER_DIR, "cottage-owned-games-ledger.xlsx");
const COTTAGE_OWNED_GAMES_LEDGER_JSON_PATH = path.join(LIBRARY_LEDGER_DIR, "cottage-owned-games-ledger.json");

const COTTAGE_GAMES_DATA_JS_PATH = path.join(LIBRARY_OUTPUT_DIR, "cottage-games-data-output.js");
const COTTAGE_GAMES_DATA_JSON_PATH = path.join(LIBRARY_OUTPUT_DIR, "cottage-games-data-output.json");

const FORCED_BGG_OVERRIDES_PATH = path.join(LIBRARY_OVERWRITE_DIR, "forced-bgg-overrides.json");
const GAME_NAME_ALIASES_PATH = path.join(LIBRARY_OVERWRITE_DIR, "game-name-aliases.json");
const MOOD_TAG_RULES_PATH = path.join(LIBRARY_OVERWRITE_DIR, "mood-tag-rules.json");

/* =========================
   EXPORTS
========================= */

module.exports = {
  ROOT_DIR,

  INDEX_HTML_PATH,
  OWNED_GAMES_HTML_PATH,

  ASSETS_DIR,
  ASSETS_CSS_DIR,
  ASSETS_JS_DIR,
  ASSETS_IMAGES_DIR,
  STYLE_CSS_PATH,
  SCRIPT_JS_PATH,
  GAME_DISPLAY_ADAPTER_PATH,

  GAME_SYSTEM_DIR,

  TOOLS_DIR,
  TOOLS_CORE_DIR,
  TOOLS_INPUT_DIR,
  TOOLS_MATCHER_DIR,
  TOOLS_FETCHER_DIR,
  TOOLS_BUILD_MASTER_DIR,
  TOOLS_BUILD_OUTPUT_DIR,
  AUTO_TAGGER_PATH,

  GAME_CONFIG_DIR,
  GAME_CONFIG_TAG_DIR,
  DIFFICULTY_LEVELS_PATH,
  SHELF_LOCATIONS_PATH,
  BGG_LABEL_MAP_PATH,
  MOOD_TAGS_PATH,
  PLAY_MECHANISM_TAGS_PATH,
  RELATIONSHIP_TAGS_PATH,
  GAME_TAG_MATCHER_PATH,

  GAME_DATA_DIR,
  SOURCE_DIR,
  STAGING_DIR,
  LIBRARY_DIR,

  SOURCE_BGG_DIR,
  SOURCE_BGG_CSV_DIR,
  SOURCE_BGG_API_DIR,
  SOURCE_COTTAGE_MANUAL_DIR,
  BGG_RANKS_CSV_PATH,
  COTTAGE_OWNED_GAMES_XLSX_PATH,

  STAGING_BGG_ID_MAPPING_DIR,
  STAGING_BGG_API_SNAPSHOT_DIR,
  BGG_SEARCH_CANDIDATES_PATH,
  BGG_MATCH_MAP_PATH,
  BGG_UNRESOLVED_CANDIDATES_PATH,
  BGG_NAME_SEARCH_PATH,
  BGG_GAME_DETAILS_PATH,

  LIBRARY_MASTER_DIR,
  LIBRARY_LEDGER_DIR,
  LIBRARY_OUTPUT_DIR,
  LIBRARY_HUMAN_INPUT_DIR,
  LIBRARY_OVERWRITE_DIR,
  LIBRARY_MISSING_FILL_DIR,
  LIBRARY_IMAGES_DIR,
  LIBRARY_IMAGES_THUMB_DIR,
  LIBRARY_IMAGES_DETAIL_DIR,
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH,
  COTTAGE_OWNED_GAMES_LEDGER_JSON_PATH,
  COTTAGE_GAMES_DATA_JS_PATH,
  COTTAGE_GAMES_DATA_JSON_PATH,
  FORCED_BGG_OVERRIDES_PATH,
  GAME_NAME_ALIASES_PATH,
  MOOD_TAG_RULES_PATH,
};
