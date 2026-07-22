/* =========================
   # OWNED GAMES PAGE
========================= */

const ownedPageState = {
  page: 1,
  perPage: 4,

  sortTitle: "asc",
  sortWeight: "none",
  sortRating: "none",

  activeSortKeys: ["title"],

  playerFilter: "",
  difficultyFilter: "",
  moodFilter: "",
  mechanicFilter: "",
  shelfFilter: "",
  weightCap: false,

  search: ""
};


/* =========================
   # OWNED FILTER
========================= */

function matchOwnedPlayer(game){
  return matchBestPlayers(game, ownedPageState.playerFilter);
}

function matchOwnedMood(game){
  return matchRecommendMood(game, ownedPageState.moodFilter);
}

function matchOwnedWeightCap(game){
  if(!ownedPageState.weightCap) return true;
  const detail = GameView.getGameDetailData(game);
  const weight = Number(detail.difficultyWeight);
  if(!weight || weight === 0) return true;
  return weight <= 2.5;
}

function matchOwnedDifficulty(game){
  const filter =
    ownedPageState.difficultyFilter;

  if(!filter){
    return true;
  }

  if(filter === "easy_coop" || filter === "hard_coop"){
    const isCooperative =
      game?.bgg?.mechanics?.includes("Cooperative Game") ||
      game?.cottage?.interactionTags?.includes("cooperative") ||
      game?.cottage?.interactionTags?.includes("coop");

    if(!isCooperative){
      return false;
    }

    const weight = Number(game?.cottage?.difficultyWeight) || Number(game?.bgg?.weight) || 0;

    return filter === "easy_coop"
      ? weight <= 2.50
      : weight > 2.50;
  }

  return matchRecommendLevel(
    game,
    filter
  );
}

function matchOwnedMechanic(game){
  const filter =
    ownedPageState.mechanicFilter;

  if(!filter){
    return true;
  }

  const detail =
    GameView.getGameDetailData(game);

  return (
    detail.bgg.mechanics?.includes(filter) ||
    detail.playTags?.includes(filter) ||
    detail.displayTags?.includes(filter)
  );
}

function matchOwnedShelf(game){
  const filter = ownedPageState.shelfFilter;
  if(!filter) return true;
  return game.cottage?.shelfGroupId === filter;
}


/* =========================
   # OWNED SEARCH
========================= */

function matchOwnedSearch(game){
  const query =
    normalizeSearchText(
      ownedPageState.search
    );

  if(!query){
    return true;
  }

  const detail =
    GameView.getGameDetailData(game);

  return (
    matchKoreanSmart(detail.title, query) ||
    matchKoreanSmart(detail.bggTitle, query)
  );
}

/* =========================
   # OWNED SORT
========================= */

function activateSortKey(key){
  const sortDirMap = {
    title: ownedPageState.sortTitle,
    weight: ownedPageState.sortWeight,
    rating: ownedPageState.sortRating
  };

  ownedPageState.activeSortKeys =
    ownedPageState.activeSortKeys.filter(item => item !== key);

  if(sortDirMap[key] === "none"){
    return;
  }

  ownedPageState.activeSortKeys = [
    key,
    ...ownedPageState.activeSortKeys
  ];
}

function getSortOrderText(key, label){
  const index =
    ownedPageState.activeSortKeys.indexOf(key);

  if(index === -1){
    return label;
  }

  return `${index + 1}.${label}`;
}

function updateSortOptionLabels(){
  const sortTitleLabel =
    document.getElementById("sortTitleLabel");

  const sortWeightLabel =
    document.getElementById("sortWeightLabel");

  const sortRatingLabel =
    document.getElementById("sortRatingLabel");

  if(sortTitleLabel){
    const mark =
      ownedPageState.sortTitle === "desc" ? "↓" :
      ownedPageState.sortTitle === "none" ? "-" : "↑";

    sortTitleLabel.textContent =
      `${getSortOrderText("title", "이름")} ${mark}`;
  }

  if(sortWeightLabel){
    const mark =
      ownedPageState.sortWeight === "asc" ? "↑" :
      ownedPageState.sortWeight === "desc" ? "↓" : "-";

    sortWeightLabel.textContent =
      `${getSortOrderText("weight", "난이도")} ${mark}`;
  }

  if(sortRatingLabel){
    const mark =
      ownedPageState.sortRating === "asc" ? "↑" :
      ownedPageState.sortRating === "desc" ? "↓" : "-";

    sortRatingLabel.textContent =
      `${getSortOrderText("rating", "평점")} ${mark}`;
  }

  const sortBox =
    document.querySelector(".owned-sort-compact");

  if(sortBox){
    const sortSelectMap = {
      title: document.getElementById("sortTitle")?.closest(".sort-select-wrap"),
      weight: document.getElementById("sortWeight")?.closest(".sort-select-wrap"),
      rating: document.getElementById("sortRating")?.closest(".sort-select-wrap")
    };

    const allSortKeys = ["title", "weight", "rating"];

    const inactiveSortKeys =
      allSortKeys.filter(
        key => !ownedPageState.activeSortKeys.includes(key)
      );

    const orderedSortKeys = [
      ...ownedPageState.activeSortKeys,
      ...inactiveSortKeys
    ];

    orderedSortKeys.forEach(key=>{
      const item = sortSelectMap[key];

      if(item){
        sortBox.appendChild(item);
      }
    });
  }
}





function sortOwnedGames(games){
  return [...games].sort((a, b)=>{
    const sortDirMap = {
  title: ownedPageState.sortTitle,
  weight: ownedPageState.sortWeight,
  rating: ownedPageState.sortRating
};

const sortRules =
  ownedPageState.activeSortKeys
    .map(key => ({
      key,
      dir: sortDirMap[key]
    }))
    .filter(rule => rule.dir !== "none");

    for(const rule of sortRules){
      if(rule.dir === "none"){
        continue;
      }

      const detailA =
        GameView.getGameDetailData(a);

      const detailB =
        GameView.getGameDetailData(b);

      let result = 0;

      if(rule.key === "title"){
        result =
          String(detailA.title || "")
            .localeCompare(
              String(detailB.title || ""),
              "ko"
            );
      }

      if(rule.key === "weight"){
        result =
          (Number(detailA.difficultyWeight) || 0) -
          (Number(detailB.difficultyWeight) || 0);
      }

      if(rule.key === "rating"){
        result =
          (Number(detailA.rating) || 0) -
          (Number(detailB.rating) || 0);
      }

      if(result !== 0){
        return rule.dir === "desc"
          ? result * -1
          : result;
      }
    }

    return 0;
  });
}


/* =========================
   # MECHANIC OPTIONS
========================= */

function renderMechanicOptions(){
  const mechanicSelect =
    document.getElementById("ownedMechanicFilter");

  if(!mechanicSelect){
    return;
  }

  const mechanics =
    [...new Set(
      getAllGamesArray()
        .flatMap(game => {
          const detail =
            GameView.getGameDetailData(game);

          return [
            ...detail.bgg.mechanics,
            ...detail.playTags,
          ];
        })
    )]
      .filter(Boolean)
      .sort((a, b)=>
        a.localeCompare(b, "ko")
      );

  mechanicSelect.innerHTML = `
     <option value="" selected hidden>🎲 게임 유형</option>
  <option value="">전체</option>

    ${
      mechanics
        .map(mechanic => `
          <option value="${mechanic}">
            ${mechanic}
          </option>
        `)
        .join("")
    }
  `;
}


/* =========================
   # OWNED FILTERED GAMES
========================= */

function hasOwnedDifficultyWeight(game){
  const detail =
    GameView.getGameDetailData(game);

  const weight =
    Number(detail.difficultyWeight);

  return Number.isFinite(weight) && weight > 0;
}

function getOwnedFilteredGames(){
  const isDifficultySortActive =
    ownedPageState.sortWeight !== "none";

  return getAllGamesArray()
    .filter(game=>{
      if(!isDifficultySortActive){
        return true;
      }

      return hasOwnedDifficultyWeight(game);
    })
    .filter(matchOwnedPlayer)
    .filter(matchOwnedDifficulty)
    .filter(matchOwnedWeightCap)
    .filter(matchOwnedMood)
    .filter(matchOwnedMechanic)
    .filter(matchOwnedShelf)
    .filter(matchOwnedSearch);
}

/* =========================
   # OWNED PAGINATION
========================= */

function renderOwnedPagination(totalPages){
  const ownedPagination =
    document.getElementById("ownedPagination");

  if(!ownedPagination){
    return;
  }

  const cur   = ownedPageState.page;
  const total = Math.max(totalPages, 1);

  const btn = (page, label) =>
    `<button type="button" class="${page === cur ? "is-active" : ""}" data-page="${page}">${label ?? page}</button>`;
  const ellipsis =
    `<span class="pagination-ellipsis">…</span>`;

  let html = "";

  html += `<button type="button" ${cur === 1 ? "disabled" : ""} data-page-action="prev">이전</button>`;

  // 첫 페이지
  html += btn(1);

  const winStart = Math.max(2, cur - 2);
  const winEnd   = Math.min(total - 1, cur + 2);

  if(winStart > 2)  html += ellipsis;

  for(let i = winStart; i <= winEnd; i++){
    html += btn(i);
  }

  if(winEnd < total - 1) html += ellipsis;

  // 마지막 페이지 (total > 1 일 때만)
  if(total > 1) html += btn(total);

  html += `<button type="button" ${cur === total ? "disabled" : ""} data-page-action="next">다음</button>`;

  ownedPagination.innerHTML = html;
}


/* =========================
   # OWNED LIST
========================= */

function renderOwnedAccordionSummary(){
  const filterSummary =
    document.getElementById("ownedFilterSummary");

  if(filterSummary){
    const filterTexts = [];

    const difficultyLabelMap = {
      kids: "아이도 가능",
      beginner: "입문 추천",
      light: "라이트·패밀리",
      heavy: "헤비·매니아",
      hardcore: "하드코어",
      easy_coop: "쉬운 협력게임",
      hard_coop: "어려운 협력게임"
    };

    if(ownedPageState.difficultyFilter){
      filterTexts.push(
        difficultyLabelMap[ownedPageState.difficultyFilter] ||
        ownedPageState.difficultyFilter
      );
    }

    if(ownedPageState.mechanicFilter){
      filterTexts.push(ownedPageState.mechanicFilter);
    }

    filterSummary.textContent =
      filterTexts.length ? filterTexts.join(" / ") : "전체";
  }
}

function updateOwnedGames(){
  updateSortOptionLabels();
  renderOwnedAccordionSummary();
  renderOwnedGameList();
}

function renderOwnedGameList(){
  const ownedGameList =
    document.getElementById("ownedGameList");

  const ownedPagination =
    document.getElementById("ownedPagination");

  if(
    !ownedGameList ||
    !ownedPagination
  ){
    return;
  }

  const filteredGames =
  getOwnedFilteredGames();

  const sortedGames =
    sortOwnedGames(filteredGames);

  const heroSub = document.getElementById("ownedHeroSub");
  if(heroSub){
    const totalAll = getAllGamesArray().length;
    const hasFilter =
      (document.getElementById("ownedSearchInput")?.value || "").trim() ||
      document.getElementById("ownedPlayerFilter")?.value ||
      document.getElementById("ownedDifficultyFilter")?.value ||
      document.getElementById("ownedMoodFilter")?.value ||
      document.getElementById("ownedMechanicFilter")?.value;
    heroSub.textContent = hasFilter
      ? `조건에 부합하는 ${sortedGames.length}개의 게임을 찾았습니다`
      : `${totalAll}종의 게임이 기다리고 있어요`;
    heroSub.classList.toggle("is-filtered", !!hasFilter);
  }

  const totalPages =
    Math.ceil(
      sortedGames.length /
      ownedPageState.perPage
    );

  if(ownedPageState.page > totalPages){
    ownedPageState.page =
      Math.max(totalPages, 1);
  }

  const start =
    (ownedPageState.page - 1) *
    ownedPageState.perPage;

  const pageGames =
    sortedGames.slice(
      start,
      start + ownedPageState.perPage
    );

  if(pageGames.length === 0){
    ownedGameList.innerHTML = `
      <p class="owned-empty">
  표시할 게임이 없어요.
</p>
    `;

    renderOwnedPagination(totalPages);
    return;
  }

  ownedGameList.innerHTML =
    pageGames
      .map(game=>{
        const detail =
          GameView.getGameDetailData(game);

        const difficulty =
          GameView.getDifficultyData(
            Number(detail.difficultyWeight) || 0
          );

        return `
          <button
            class="owned-game-item"
            type="button"
            data-game="${getGameKey(game)}"
          >

            <div class="owned-game-thumb">
              <img
                src="${detail.thumbnail || detail.image || DEFAULT_GAME_IMAGE}"
                alt="${detail.title}"
                loading="lazy"
                onerror="this.onerror=null; this.src='${DEFAULT_GAME_IMAGE}';"
              >
              <span class="owned-img-rating">⭐ ${formatRating(detail.rating)}</span>
            </div>

            <div class="owned-game-info">

              <strong>
                ${detail.title}
              </strong>

              <div class="owned-game-meta">
  <span>
    👥 ${formatPlayers(detail.bestPlayers) || detail.playerRangeText || "-"}
  </span>
  <span class="${difficulty.className}">
    ${difficulty.icon} ${formatDifficultyWeight(detail.difficultyWeight)}
  </span>
  <span>
    ⏱ ${detail.playingTimeText || "-"}
  </span>
  ${getShelfSpanHtml(game)}
</div>

            </div>

          </button>
        `;
      })
      .join("");

  ownedGameList
    .querySelectorAll(".owned-game-item")
    .forEach(item=>{
      item.addEventListener(
        "click",
        ()=>{
          openGameSheet(
            item.dataset.game
          );
        }
      );
    });

  renderOwnedPagination(totalPages);
}


/* =========================
   # OWNED EVENTS
========================= */

document
  .querySelectorAll("[data-owned-accordion]")
  .forEach((button)=>{
    button.addEventListener("click", ()=>{
      const target =
        button.dataset.ownedAccordion;

      const body =
        document.querySelector(
          `[data-owned-accordion-body="${target}"]`
        );

      button.classList.toggle("is-open");

      if(body){
        body.classList.toggle("is-open");
      }
    });
  });

document
  .getElementById("ownedPlayerFilter")
  ?.addEventListener("change", (event) => {
    const value = event.target.value || "";
    ownedPageState.playerFilter = value;
    if(value === "") event.target.selectedIndex = 0;
    ownedPageState.page = 1;
    updateOwnedGames();
  });

const ownedDifficultyFilter =
  document.getElementById("ownedDifficultyFilter");

if (ownedDifficultyFilter) {
 ownedDifficultyFilter.addEventListener("change", () => {
  const value = ownedDifficultyFilter.value || "";

  ownedPageState.difficultyFilter = value;
  ownedPageState.page = 1;

  if(value === ""){
    ownedDifficultyFilter.selectedIndex = 0;
  }

  updateOwnedGames();
});
}

document
  .getElementById("ownedMoodFilter")
  ?.addEventListener("change", (event) => {
    const value = event.target.value || "";
    ownedPageState.moodFilter = value;
    if(value === "") event.target.selectedIndex = 0;
    ownedPageState.page = 1;
    updateOwnedGames();
  });

const ownedWeightCapToggle =
  document.getElementById("ownedWeightCapToggle");

if(ownedWeightCapToggle){
  ownedWeightCapToggle.addEventListener("click", () => {
    ownedPageState.weightCap = !ownedPageState.weightCap;
    const on = ownedPageState.weightCap;
    ownedWeightCapToggle.classList.toggle("is-on", on);
    ownedWeightCapToggle.textContent = on
      ? "난이도\n제한ON"
      : "난이도\n제한OFF";
    ownedPageState.page = 1;
    updateOwnedGames();
  });
}





document
  .getElementById("ownedMechanicFilter")
  ?.addEventListener(
    "change",
    (event)=>{
      const value = event.target.value || "";

      ownedPageState.mechanicFilter = value;
      ownedPageState.page = 1;

      if(value === ""){
        event.target.selectedIndex = 0;
      }

      updateOwnedGames();
    }
  );

document
  .getElementById("ownedPagination")
  ?.addEventListener(
    "click",
    (event)=>{
      const pageButton =
        event.target.closest("[data-page]");

      const actionButton =
        event.target.closest("[data-page-action]");

      const totalPages =
  Math.max(
    Math.ceil(
      getOwnedFilteredGames().length /
      ownedPageState.perPage
    ),
    1
  );

      if(pageButton){
        ownedPageState.page =
          Number(pageButton.dataset.page);

        updateOwnedGames();
        return;
      }

      if(
        actionButton?.dataset.pageAction === "prev"
      ){
        ownedPageState.page =
          Math.max(
            1,
            ownedPageState.page - 1
          );

        updateOwnedGames();
        return;
      }

      if(
        actionButton?.dataset.pageAction === "next"
      ){
        ownedPageState.page =
          Math.min(
            totalPages,
            ownedPageState.page + 1
          );

        updateOwnedGames();
      }
    }
  );

document
  .getElementById("sortTitle")
  ?.addEventListener("change", (event)=>{
    ownedPageState.sortTitle = event.target.value;
       activateSortKey("title");
    ownedPageState.page = 1;
    updateOwnedGames();
  });

document
  .getElementById("sortWeight")
  ?.addEventListener("change", (event)=>{
    ownedPageState.sortWeight = event.target.value;
activateSortKey("weight");    ownedPageState.page = 1;
    updateOwnedGames();
  });

document
  .getElementById("sortRating")
  ?.addEventListener("change", (event)=>{
    ownedPageState.sortRating = event.target.value;
    activateSortKey("rating");
    ownedPageState.page = 1;
    updateOwnedGames();
  });


["sortTitle", "sortWeight", "sortRating"].forEach(id=>{
  const select =
    document.getElementById(id);

  if(!select){
    return;
  }

  select.addEventListener("pointerdown", ()=>{
    updateSortOptionLabels();
  });

  select.addEventListener("blur", ()=>{
    updateSortOptionLabels();
  });
});

const ownedSearchInput =
  document.getElementById("ownedSearchInput");

if(ownedSearchInput){
  const params =
    new URLSearchParams(window.location.search);

  const searchKeyword =
    params.get("search") || "";

  ownedSearchInput.value =
    searchKeyword;

  ownedPageState.search =
    searchKeyword;

  const urlPlayers = params.get("players") || "";
  const urlLevel   = params.get("level")   || "";
  const urlMood    = params.get("mood")     || "";

  if(urlPlayers){
    ownedPageState.playerFilter = urlPlayers;
    const sel = document.getElementById("ownedPlayerFilter");
    if(sel) sel.value = urlPlayers;
  }

  if(urlLevel){
    ownedPageState.difficultyFilter = urlLevel;
    const sel = document.getElementById("ownedDifficultyFilter");
    if(sel) sel.value = urlLevel;
  }

  if(urlMood){
    ownedPageState.moodFilter = urlMood;
    const sel = document.getElementById("ownedMoodFilter");
    if(sel) sel.value = urlMood;
  }

  const urlShelf = params.get("shelf") || "";
  if(urlShelf){
    ownedPageState.shelfFilter = urlShelf;
  }

  if(params.get("sort") === "rating"){
    ownedPageState.sortRating = "desc";
    ownedPageState.sortTitle  = "none";
    ownedPageState.activeSortKeys = ["rating"];
    const selTitle  = document.getElementById("sortTitle");
    const selRating = document.getElementById("sortRating");
    if(selTitle)  selTitle.value  = "none";
    if(selRating) selRating.value = "desc";
    updateSortOptionLabels();
  }

  if(params.get("weightCap") === "1"){
    ownedPageState.weightCap = true;
    const btn = document.getElementById("ownedWeightCapToggle");
    if(btn){
      btn.classList.add("is-on");
      btn.textContent = "난이도\n제한ON";
    }
  }

  ownedSearchInput.addEventListener("input", (event)=>{
    ownedPageState.search =
      event.target.value;

    ownedPageState.page = 1;

    updateOwnedGames();
  });
}


renderMechanicOptions();
updateOwnedGames();


// ?open=gameKey → 게임 시트 자동 오픈 (타이틀 검색에서 이동)
const _openGameKey = new URLSearchParams(window.location.search).get('open');
if(_openGameKey && gameSheet){
  openGameSheet(decodeURIComponent(_openGameKey));
}

const ownedToolsToggle =
  document.getElementById("ownedToolsToggle");

const ownedToolbar =
  document.getElementById("ownedToolbar");

if(ownedToolsToggle && ownedToolbar){

  ownedToolsToggle.addEventListener("click", ()=>{

    ownedToolbar.classList.toggle("is-collapsed");

    const isCollapsed =
      ownedToolbar.classList.contains("is-collapsed");

    ownedToolsToggle.textContent =
      isCollapsed
        ? "▼ 정렬·필터"
        : "▲ 접기";

  });

}

