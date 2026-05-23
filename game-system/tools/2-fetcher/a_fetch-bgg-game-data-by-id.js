const fs = require("fs");
const path = require("path");

// .env 로드 (dotenv 없이 직접 파싱)
try {
  const envPath = path.resolve(process.cwd(), ".env");
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const eq = line.indexOf("=");
      if (eq < 1) return;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    });
} catch {}

const { readJson, writeJson } = require("../_core/file-read-writer");

const {
  COTTAGE_OWNED_GAMES_MASTER_PATH,
  COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH,
    BGG_MATCH_MAP_PATH,
  BGG_GAME_DETAILS_PATH,
} = require("../_core/paths");

const ENABLE_BGG_THING_API = true;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getAttr(xml, tag) {
  const match = xml.match(
    new RegExp(
      `<${tag}\\s+[^>]*value="([^"]*)"`,
      "i"
    )
  );

  return match
    ? decodeXmlEntities(match[1])
    : "";
}

function getTagText(xml, tag) {
  const match = xml.match(
    new RegExp(
      `<${tag}>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    )
  );

  return match
    ? decodeXmlEntities(match[1].trim())
    : "";
}

function getPrimaryName(xml) {
  const match =
    xml.match(
      /<name\s+[^>]*type="primary"[^>]*value="([^"]*)"/i
    ) ||
    xml.match(
      /<name\s+[^>]*value="([^"]*)"/i
    );

  return match
    ? decodeXmlEntities(match[1])
    : "";
}

function getLinks(xml, type) {
  const regex = new RegExp(
    `<link\\s+[^>]*type="${type}"[^>]*value="([^"]*)"[^>]*\\/?>`,
    "gi"
  );

  const values = [];

  let match;

  while ((match = regex.exec(xml)) !== null) {
    values.push(
      decodeXmlEntities(match[1])
    );
  }

  return [...new Set(values)];
}

function parseSuggestedNumPlayers(xml) {
  const pollMatch = xml.match(
    /<poll\s+[^>]*name="suggested_numplayers"[\s\S]*?<\/poll>/i
  );

  if (!pollMatch) {
    return {
      best: [],
      recommended: [],
      not_recommended: [],
    };
  }

  const pollXml = pollMatch[0];

  const resultRegex =
    /<results\s+[^>]*numplayers="([^"]+)"[^>]*>([\s\S]*?)<\/results>/gi;

  const best = [];
  const recommended = [];
  const notRecommended = [];

  let resultMatch;

  while (
    (resultMatch = resultRegex.exec(pollXml)) !== null
  ) {
    const playerLabel = resultMatch[1];
    const body = resultMatch[2];

    if (!/^\d+\+?$/.test(playerLabel)) {
      continue;
    }

    const playerCount = Number(
      playerLabel.replace("+", "")
    );

    if (!playerCount) {
      continue;
    }

    const votes = {
      best: 0,
      recommended: 0,
      not_recommended: 0,
    };

    const itemRegex =
      /<result\s+[^>]*value="([^"]+)"[^>]*numvotes="([^"]+)"/gi;

    let itemMatch;

    while ((itemMatch = itemRegex.exec(body)) !== null) {
      const label = itemMatch[1];
      const count = Number(itemMatch[2] || 0);

      if (label === "Best") {
        votes.best = count;
      }

      if (label === "Recommended") {
        votes.recommended = count;
      }

      if (label === "Not Recommended") {
        votes.not_recommended = count;
      }
    }

    const maxVote = Math.max(
      votes.best,
      votes.recommended,
      votes.not_recommended
    );

    if (maxVote === 0) {
      continue;
    }

    if (votes.best === maxVote) {
      best.push(playerCount);
    } else if (
      votes.recommended === maxVote
    ) {
      recommended.push(playerCount);
    } else {
      notRecommended.push(playerCount);
    }
  }

  return {
    best,
    recommended,
    not_recommended: notRecommended,
  };
}

function parseBggThingXml(xml, bggId) {
  return {
    bggId: String(bggId),

    title: getPrimaryName(xml),

    image: getTagText(xml, "image"),
    thumbnail: getTagText(xml, "thumbnail"),
    description: getTagText(xml, "description"),

    yearpublished: getAttr(
      xml,
      "yearpublished"
    ),

    minplayers: getAttr(
      xml,
      "minplayers"
    ),

minage: getAttr(
  xml,
  "minage"
),

    maxplayers: getAttr(
      xml,
      "maxplayers"
    ),

    playingtime: getAttr(
      xml,
      "playingtime"
    ),

    minplaytime: getAttr(
      xml,
      "minplaytime"
    ),

    maxplaytime: getAttr(
      xml,
      "maxplaytime"
    ),

    averageweight: (() => {
      const match = xml.match(
        /<averageweight\s+[^>]*value="([^"]*)"[^>]*\/?>/i
      );

      return match
        ? match[1]
        : "";
    })(),


average: (() => {
  const match = xml.match(
    /<average\s+[^>]*value="([^"]*)"[^>]*\/?>/i
  );

  return match ? match[1] : "";
})(),

bayesaverage: (() => {
  const match = xml.match(
    /<bayesaverage\s+[^>]*value="([^"]*)"[^>]*\/?>/i
  );

  return match ? match[1] : "";
})(),

usersrated: (() => {
  const match = xml.match(
    /<usersrated\s+[^>]*value="([^"]*)"[^>]*\/?>/i
  );

  return match ? match[1] : "";
})(),

rank: (() => {
  const match = xml.match(
    /<rank\s+[^>]*name="boardgame"[^>]*value="([^"]*)"[^>]*\/?>/i
  );

  return match ? match[1] : "";
})(),

designers: getLinks(
  xml,
  "boardgamedesigner"
),

artists: getLinks(
  xml,
  "boardgameartist"
),

publishers: getLinks(
  xml,
  "boardgamepublisher"
),

    categories: getLinks(
      xml,
      "boardgamecategory"
    ),

    mechanics: getLinks(
      xml,
      "boardgamemechanic"
    ),

    suggested_numplayers:
      parseSuggestedNumPlayers(xml),
  };
}

async function fetchBggThing(bggId) {
  const url =
    `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(
      bggId
    )}&stats=1`;

  console.log(`BGG thing fetch: ${bggId}`);

  const headers = {
    "User-Agent":
      "CottageBoardGameDataBot/1.0 (personal boardgame cafe data tool)",
    Accept:
      "application/xml,text/xml,*/*",
  };

  if (process.env.BGG_API_TOKEN) {
    headers["Authorization"] =
      `Bearer ${process.env.BGG_API_TOKEN}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(
      `BGG thing failed: ${bggId} / ${res.status}`
    );
  }

  const xml = await res.text();

  return parseBggThingXml(xml, bggId);
}

function getTargetBggIds(
  matchResult,
  detailsCache
) {
  const ids = new Set();

  Object.values(matchResult).forEach((item) => {
    if (
      !["auto-confirmed", "forced"].includes(
        item.status
      )
    ) {
      return;
    }

    if (!item.bggId) {
      return;
    }

    if (detailsCache[item.bggId]) {
      return;
    }

    ids.add(String(item.bggId));
  });

  return [...ids];
}

async function fetchBggDetails() {
  const matchResult = readJson(
    BGG_MATCH_MAP_PATH,
    {}
  );

  const detailsCache = readJson(
    BGG_GAME_DETAILS_PATH,
    {}
  );

  const targetIds = getTargetBggIds(
    matchResult,
    detailsCache
  );

  if (!ENABLE_BGG_THING_API) {
    console.log(
      "fetchBggDetails: BGG Thing API disabled."
    );

    console.log({
      pending: targetIds.length,
    });

    return;
  }

  for (const bggId of targetIds) {
    try {
      const detail =
        await fetchBggThing(bggId);

      detailsCache[bggId] = detail;

      writeJson(
        BGG_GAME_DETAILS_PATH,
        detailsCache
      );

      await sleep(1500);
    } catch (error) {
      console.log(error.message);

      await sleep(2500);
    }
  }

  console.log(
    "BGG details cache updated:"
  );

  console.log({
    total: Object.keys(detailsCache).length,
  });
}

module.exports = {
  fetchBggDetails,
};

if (require.main === module) {
  fetchBggDetails().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}