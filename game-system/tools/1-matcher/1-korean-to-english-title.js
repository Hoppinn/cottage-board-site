// game-data-tools/match/generate-name-candidates.js

const { readJson } = require("../_core/file-read-writer");
const {
  BGG_UNRESOLVED_CANDIDATES_PATH,
} = require("../_core/paths");

const { normalizeGameName } = require("../_core/game-name-normalizer");

/**
 * 최소 힌트 사전
 *
 * 원칙:
 * - 전체 게임을 여기에 등록하지 않는다.
 * - 자동 검색이 특히 어려운 대표 별칭/축약명만 둔다.
 * - 오답 확정 교정은 forced-bgg-overrides.json에서 처리한다.
 */
const knownKoToEn = {
  "1862 이스턴 카운티": "1862 Railway Mania in the Eastern Counties",
  "5초준다": "5 Second Rule",
  "7원더스": "7 Wonders",

  "가짜예술가뉴욕에가다": "A Fake Artist Goes to New York",
  "갈팡질팡": "Wavelength",
  "내마음의주파수": "Wavelength",
  "그것이문제로다": "Top Ten",
  "냥자역학연구소": "Cat in the Box",
  "나나": "Trio",

  스플렌더: "Splendor",
  카탄: "Catan",
  할리갈리: "Halli Galli",
  코드네임: "Codenames",
  딕싯: "Dixit",
  아줄: "Azul",
  티켓투라이드: "Ticket to Ride",
  루미큐브: "Rummikub",
  도미니언: "Dominion",
  카르카손: "Carcassonne",
  팬데믹: "Pandemic",
};

function compactKorean(name) {
  return String(name || "")
    .replace(/\s+/g, "")
    .replace(/[()\[\]{}:;'"“”‘’]/g, "")
    .replace(/[·ㆍ・]/g, "")
    .trim();
}

function removeBracketText(name) {
  return String(name || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/【[^】]*】/g, "")
    .replace(/〈[^〉]*〉/g, "")
    .replace(/《[^》]*》/g, "")
    .trim();
}

function removeEditionWords(name) {
  return String(name || "")
    .replace(/확장판/g, "")
    .replace(/확장/g, "")
    .replace(/본판/g, "")
    .replace(/기본판/g, "")
    .replace(/한글판/g, "")
    .replace(/한국어판/g, "")
    .replace(/영문판/g, "")
    .replace(/보드게임/g, "")
    .replace(/카드게임/g, "")
    .replace(/개정판/g, "")
    .replace(/신판/g, "")
    .replace(/구판/g, "")
    .replace(/디럭스/g, "")
    .replace(/프로모/g, "")
    .trim();
}

function splitSubtitle(name) {
  // "+" 구분도 처리: "윙스팬 + 아시아 + 오세아니아" → ["윙스팬", "아시아", "오세아니아"]
  return String(name || "")
    .split(/[:：\-–—+]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAutoEnglishCandidates(koreanName) {
  const cache = readJson(BGG_UNRESOLVED_CANDIDATES_PATH, {});
  const key = compactKorean(koreanName);

  return cache[key] || [];
}

function addCandidate(set, value) {
  const text = String(value || "").trim();
  if (!text) return;

  set.add(text);

  const normalized = normalizeGameName(text);
  if (normalized) set.add(normalized);

  const compact = compactKorean(text);
  if (compact) set.add(compact);
}

function addKnownEnglishCandidates(set, rawVariants) {
  const compactVariants = rawVariants.map(compactKorean);

  Object.entries(knownKoToEn).forEach(([ko, en]) => {
    const compactKo = compactKorean(ko);

    const matched = rawVariants.some((variant, index) => {
      return variant.includes(ko) || compactVariants[index].includes(compactKo);
    });

    if (!matched) return;

    addCandidate(set, en);

    rawVariants.forEach((variant) => {
      addCandidate(set, variant.replace(ko, en));
      addCandidate(set, compactKorean(variant).replace(compactKo, en));
    });
  });
}

function generateNameCandidates(koreanName) {
  const raw = String(koreanName || "").trim();

  if (!raw) return [];

  const noBracket = removeBracketText(raw);
  const noEdition = removeEditionWords(raw);
  const noBracketNoEdition = removeEditionWords(noBracket);

  const subtitleParts = [
    ...splitSubtitle(raw),
    ...splitSubtitle(noBracket),
    ...splitSubtitle(noEdition),
  ];

  const rawVariants = [
    raw,
    noBracket,
    noEdition,
    noBracketNoEdition,
    ...subtitleParts,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const candidates = new Set();

  rawVariants.forEach((variant) => {
    addCandidate(candidates, variant);
  });

  addKnownEnglishCandidates(candidates, rawVariants);

  getAutoEnglishCandidates(raw).forEach((candidate) => {
    addCandidate(candidates, candidate);
  });

  return [...candidates]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

module.exports = {
  generateNameCandidates,
};