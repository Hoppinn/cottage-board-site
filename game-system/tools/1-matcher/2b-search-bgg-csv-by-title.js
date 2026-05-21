/**
 * TEMP:
 * BGG API 승인 대기 중이라 현재는 OFF.
 *
 * 승인 완료 후:
 * ENABLE_BGG_API_SEARCH = true
 */
const ENABLE_BGG_API_SEARCH = false;

const fs = require("fs");
const {
  BGG_RANKS_CSV_PATH,
  BGG_NAME_SEARCH_PATH,
} = require("../_core/paths");

const { readJson, writeJson } = require("../_core/file-read-writer");
const { normalizeGameName } = require("../_core/game-name-normalizer");

let cachedBggRows = null;
let searchCache = null;

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuote = false;

  for (const char of line) {
    if (char === '"') insideQuote = !insideQuote;
    else if (char === "," && !insideQuote) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function loadBggRanks() {
  if (cachedBggRows) return cachedBggRows;

  const text = fs.readFileSync(BGG_RANKS_CSV_PATH, "utf-8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  cachedBggRows = lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      return {
        id: row.id,
        name: row.name,
        year: row.yearpublished,
        rank: row.rank,
        average: Number(row.average || 0),
        bayesaverage: Number(row.bayesaverage || 0),
        usersrated: Number(row.usersrated || 0),
        isExpansion: row.is_expansion === "1",
        normalizedName: normalizeGameName(row.name),
        source: "csv",
      };
    })
    .filter((row) => row.id && row.name);

  console.log(`Loaded BGG CSV rows: ${cachedBggRows.length}`);

  return cachedBggRows;
}

function loadSearchCache() {
  if (!searchCache) {
    searchCache = readJson(BGG_NAME_SEARCH_PATH, {});
  }

  return searchCache;
}

function saveSearchCache() {
  writeJson(BGG_NAME_SEARCH_PATH, searchCache || {});
}

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseBggSearchXml(xml) {
  const items = [];
  const itemRegex =
    /<item\s+[^>]*id="(\d+)"[^>]*type="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g;

  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const [, id, type, body] = match;

    const nameMatch = body.match(/<name\s+[^>]*value="([^"]+)"[^>]*>/);
    const yearMatch = body.match(
      /<yearpublished\s+[^>]*value="([^"]+)"[^>]*>/
    );

    if (!nameMatch) continue;

    items.push({
      id,
      type,
      name: decodeXmlEntities(nameMatch[1]),
      year: yearMatch ? yearMatch[1] : "",
      normalizedName: normalizeGameName(decodeXmlEntities(nameMatch[1])),
      source: "api-search",
    });
  }

  return items;
}

async function fetchBggSearch(query) {
  const cache = loadSearchCache();

  const rawQuery = String(query || "").trim();
  if (!rawQuery) return [];

  const key = normalizeGameName(rawQuery);

  if (cache[key]) return cache[key];

  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(
    rawQuery
  )}&type=boardgame,boardgameexpansion`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "CottageBoardGameDataBot/1.0 (personal boardgame cafe data tool)",
        Accept: "application/xml,text/xml,*/*",
      },
    });

    if (!res.ok) {
      console.log(`BGG search failed: ${rawQuery} / ${res.status}`);

      cache[key] = [];
      saveSearchCache();

      await new Promise((resolve) => setTimeout(resolve, 1500));
      return [];
    }

    const xml = await res.text();

    const items = parseBggSearchXml(xml).map((item) => ({
      ...item,
      searchQuery: rawQuery,
    }));

    cache[key] = items;
    saveSearchCache();

    await new Promise((resolve) => setTimeout(resolve, 1200));

    return items;
  } catch (error) {
    console.log(`BGG search error: ${rawQuery}`);
    console.log(error.message);

    cache[key] = [];
    saveSearchCache();

    await new Promise((resolve) => setTimeout(resolve, 1500));
    return [];
  }
}

function searchLocalCsvCandidates(nameCandidates) {
  const bggRows = loadBggRanks();

  const normalizedCandidates = nameCandidates
    .map(normalizeGameName)
    .filter(Boolean);

  return bggRows.filter((row) => {
    const rowName = row.normalizedName;

    return normalizedCandidates.some((candidate) => {
      if (!candidate) return false;

      return (
        rowName === candidate ||
        rowName.includes(candidate) ||
        candidate.includes(rowName)
      );
    });
  });
}

async function searchBggCandidates(nameCandidates) {
  const candidates = [
    ...new Set(
      nameCandidates
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    ),
  ];

  const localCandidates = searchLocalCsvCandidates(candidates).map((item) => ({
    ...item,
    matchSource: "local-csv",
  }));

  const apiCandidatesNested = [];

  const apiSearchTargets = candidates
    .filter((candidate) => candidate.length >= 2)
    .slice(0, 8);

  if (ENABLE_BGG_API_SEARCH) {
    for (const candidate of apiSearchTargets) {
      const items = await fetchBggSearch(candidate);
      apiCandidatesNested.push(items);
    }
  }

  const apiCandidates = apiCandidatesNested.flat().map((item) => ({
    ...item,
    matchSource: "api-search",
  }));

  const merged = [...localCandidates, ...apiCandidates];

  const unique = new Map();

  merged.forEach((item) => {
    if (!item.id) return;

    const previous = unique.get(item.id);

    unique.set(item.id, {
      ...previous,
      ...item,

      source:
        previous?.source && item.source
          ? `${previous.source}+${item.source}`
          : item.source || previous?.source || "",

      matchSource:
        previous?.matchSource && item.matchSource
          ? `${previous.matchSource}+${item.matchSource}`
          : item.matchSource || previous?.matchSource || "",
    });
  });

  return [...unique.values()];
}

module.exports = {
  searchBggCandidates,
};