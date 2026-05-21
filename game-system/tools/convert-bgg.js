/**
 * COTTAGEBOARD BGG CONVERT PIPELINE
 *
 * 공식 build 실행 진입점.
 *
 * canonical pipeline:
 * autoResolveBggMatches
 * -> fetchBggDetails
 * -> buildCottageGameData
 */

const {
  autoResolveBggMatches,
} = require(
  "./match/auto-resolve-bgg-matches"
);

const {
  fetchBggDetails,
} = require(
  "./fetch/fetch-bgg-details"
);

const {
  buildCottageGameData,
} = require(
  "./build/build-cottage-game-data"
);

/**
 * TEMP SWITCH
 *
 * true:
 * - BGG Thing API 호출
 * - details cache 갱신
 *
 * false:
 * - details fetch 생략
 * - 기존 cache만 사용
 */
const ENABLE_FETCH_BGG_DETAILS = false;

async function main() {
  console.log(
    "Cottageboard build started."
  );

  console.log(
    "\n[1/3] Auto resolving BGG matches..."
  );

  await autoResolveBggMatches();

  if (ENABLE_FETCH_BGG_DETAILS) {
    console.log(
      "\n[2/3] Fetching BGG details..."
    );

    await fetchBggDetails();
  } else {
    console.log(
      "\n[2/3] Skipped BGG details fetch."
    );
  }

  console.log(
    "\n[3/3] Building cottage game data..."
  );

  await buildCottageGameData();

  console.log(
    "\nCottageboard build finished."
  );
}

main().catch((error) => {
  console.error(
    "\nCottageboard build failed."
  );

  console.error(error);

  process.exit(1);
});