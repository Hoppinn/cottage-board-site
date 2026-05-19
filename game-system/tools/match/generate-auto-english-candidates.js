const { readJson } = require("../core/read-write");
const {
  AUTO_ENGLISH_CANDIDATES_CACHE_PATH,
} = require("../core/paths");

/**
 * TEMP:
 * 외부 번역/검색 API 붙이기 전 단계.
 * 지금은 캐시에 저장된 자동 후보만 읽는다.
 *
 * 나중에 여기 안에:
 * - 번역 API
 * - 검색 API
 * - BGG search API 보조 검색
 * 을 붙이면 됨.
 */
const ENABLE_EXTERNAL_AUTO_CANDIDATES = false;

function normalizeKey(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "");
}

function getCachedAutoEnglishCandidates(koreanName) {
  const cache = readJson(AUTO_ENGLISH_CANDIDATES_CACHE_PATH, {});
  const key = normalizeKey(koreanName);

  return cache[key] || [];
}

async function generateAutoEnglishCandidates(koreanName) {
  const cached = getCachedAutoEnglishCandidates(koreanName);

  if (cached.length > 0) {
    return cached;
  }

  if (!ENABLE_EXTERNAL_AUTO_CANDIDATES) {
    return [];
  }

  /**
   * TODO:
   * BGG API / 검색 API / 번역 API 승인 후 구현
   *
   * 예:
   * 도블 -> ["Dobble", "Spot it!"]
   * 노땡스 -> ["No Thanks!"]
   * 다운포스 -> ["Downforce"]
   */

  return [];
}

module.exports = {
  generateAutoEnglishCandidates,
};