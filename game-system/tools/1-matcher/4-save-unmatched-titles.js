const { readJson, writeJson } = require("../_core/file-read-writer");
const {
  BGG_MATCH_MAP_PATH,
  BGG_UNRESOLVED_CANDIDATES_PATH,
} = require("../_core/paths");

function compactKorean(name) {
  return String(name || "")
    .replace(/\s+/g, "")
    .replace(/[()\[\]{}:;'"“”‘’]/g, "")
    .replace(/[·ㆍ・]/g, "")
    .trim();
}

/**
 * TEMP:
 * 아직 외부 번역/검색 API 붙이기 전.
 * unresolved 목록만 뽑아서 캐시에 빈 배열로 자리 만들어둔다.
 *
 * 나중에 여기에서:
 * - 검색 API
 * - 번역 API
 * - GPT API
 * 등을 붙여 자동 후보를 채우면 됨.
 */
async function generateAutoEnglishCache() {
  const matchResult = readJson(BGG_MATCH_MAP_PATH, {});
  const cache = readJson(BGG_UNRESOLVED_CANDIDATES_PATH, {});

  let added = 0;

  Object.values(matchResult).forEach((item) => {
    if (item.status !== "unresolved") return;

    const key = compactKorean(item.ownedName);

    if (!key) return;
    if (cache[key]) return;

    cache[key] = [];
    added++;
  });

  writeJson(BGG_UNRESOLVED_CANDIDATES_PATH, cache);

  console.log("Auto English candidates cache updated.");
  console.log({
    added,
    total: Object.keys(cache).length,
  });
}

generateAutoEnglishCache().catch((error) => {
  console.error(error);
  process.exit(1);
});