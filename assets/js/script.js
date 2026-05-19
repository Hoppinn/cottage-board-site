/* =========================
   # COTTAGEBOARD FRONT SCRIPT
   - nested gameData schema 기준
   - assets/js/view/game-view-utils.js 필요
========================= */

const GameView = window.CottageGameView;

if (!GameView) {
  console.warn(
    "CottageGameView가 로드되지 않았습니다. assets/js/view/game-view-utils.js를 script.js보다 먼저 불러오세요."
  );
}

const DEFAULT_GAME_IMAGE =
  "./assets/images/main/hero.png";


/* =========================
   # PAGE MODE
========================= */

function showRecommendPage(){
  document.body.classList.add("recommend-page");

  const recommendSection = document.getElementById("recommend");
  if(recommendSection){
    recommendSection.classList.remove("is-hidden");
  }

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}

function showHomePage(){
  document.body.classList.remove("recommend-page");

  const recommendSection = document.getElementById("recommend");
  if(recommendSection){
    recommendSection.classList.add("is-hidden");
  }

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}


/* =========================
   # MOBILE MENU
========================= */

const menuToggle =
  document.querySelector('#menuToggle');

const mobileMenu =
  document.querySelector('#mobileMenu');

function toggleMenu(){
  if(!mobileMenu){
    return;
  }

  mobileMenu.classList.toggle('active');
}

if(menuToggle){
  menuToggle.addEventListener(
    'click',
    toggleMenu
  );
}

document.addEventListener(
  'click',
  (event)=>{
    if(!mobileMenu){
      return;
    }

    const clickedInsideMenu =
      mobileMenu.contains(event.target);

    const clickedMenuButton =
      menuToggle
        ? menuToggle.contains(event.target)
        : false;

    if(
      !clickedInsideMenu &&
      !clickedMenuButton
    ){
      mobileMenu.classList.remove('active');
    }
  }
);

const mobileMenuLinks =
  document.querySelectorAll('.header-menu a');

mobileMenuLinks.forEach(link=>{
  link.addEventListener(
    'click',
    ()=>{
      if(!mobileMenu){
        return;
      }

      mobileMenu.classList.remove('active');
    }
  );
});


/* =========================
   # DIFFICULTY SYSTEM
   TODO: 추후 game-system/config/difficulty-levels.js와 통합
========================= */

const DIFFICULTY_LEVELS = [
  {
    id: "kids",
    label: "아이도 할 수 있어요",
    shortLabel: "아이도가능",
    icon: "😊",
    className: "difficulty-kids",
    minWeight: 0,
    maxWeight: 1.10
  },
  {
    id: "beginner",
    label: "입문 추천",
    shortLabel: "입문추천",
    icon: "🌱",
    className: "difficulty-beginner",
    minWeight: 1.11,
    maxWeight: 1.50
  },
  {
    id: "light_family",
    label: "라이트 · 패밀리",
    shortLabel: "라이트패밀리",
    icon: "🏡",
    className: "difficulty-light",
    minWeight: 1.51,
    maxWeight: 2.50
  },
  {
    id: "heavy_mania",
    label: "헤비 · 매니아",
    shortLabel: "헤비매니아",
    icon: "🧠",
    className: "difficulty-heavy",
    minWeight: 2.51,
    maxWeight: 3.50
  },
  {
    id: "hardcore",
    label: "하드코어",
    shortLabel: "하드코어",
    icon: "😈",
    className: "difficulty-hardcore",
    minWeight: 3.51,
    maxWeight: 5.00
  }
];

function getDifficultyData(weight){
  const numericWeight =
    Number(weight) || 0;

  return (
    DIFFICULTY_LEVELS.find((level) =>
      numericWeight >= level.minWeight &&
      numericWeight <= level.maxWeight
    ) ||
    DIFFICULTY_LEVELS[1]
  );
}

function normalizeLevelValue(value){
  if(value === "light"){
    return "light_family";
  }

  if(value === "heavy"){
    return "heavy_mania";
  }

  return value || "";
}


/* =========================
   # GAME DATA FORMATTER
========================= */

function getGameThumbnail(game){
  return (
    GameView?.getGameImage(game) ||
    DEFAULT_GAME_IMAGE
  );
}

function getGameDetailImage(game){
  return (
    GameView?.getGameMainImage(game) ||
    DEFAULT_GAME_IMAGE
  );
}

function formatDifficultyWeight(value){
  const num = Number(value);

  if(!Number.isFinite(num)){
    return "-";
  }

  return num.toFixed(2);
}

function formatDifficultyLabel(difficulty){
  if(difficulty.id === "kids"){
    return `(${difficulty.icon} 아이도 <br>할 수 있어요)`;
  }

  return `(${difficulty.icon} ${difficulty.label})`;
}

function formatPlayers(players){
  if(Array.isArray(players)){
    if(players.length === 0){
      return "-";
    }

    const sorted =
      [...players]
        .map(Number)
        .sort((a, b) => a - b);

    const min =
      sorted[0];

    const max =
      sorted[sorted.length - 1];

    if(min === max){
      return `${min}명`;
    }

    return `${min}~${max}명`;
  }

  if(!players){
    return "-";
  }

  return `${players}명`;
}

function formatRecommendedPlayers(
  bestPlayers,
  recommendedPlayers
){
  const bestText =
    formatPlayers(bestPlayers);

  const recommendedText =
    formatPlayers(recommendedPlayers);

  if(
    bestText === "-" &&
    recommendedText === "-"
  ){
    return "-";
  }

  if(recommendedText === "-"){
    return `${bestText} 베스트`;
  }

  if(bestText === "-"){
    return `${recommendedText} 추천`;
  }

  return (
    `${bestText} 베스트 ` +
    `(추천 ${recommendedText})`
  );
}

function formatPlayTime(minutes){
  if(!minutes){
    return "-";
  }

  return `${minutes}분`;
}

function getGameDescription(game){
  const detail =
    GameView?.getGameDetailData(game);

  return (
    detail?.comment ||
    detail?.bgg?.description ||
    ""
  );
}

function getGameKey(game){
  return game?.key || game?.id || "";
}

function getAllGamesArray(){
  if(GameView?.getAllGamesArray){
    return GameView
      .getAllGamesArray(window.gameData)
      .map(game => ({
        key: game.id,
        ...game
      }));
  }

  return Object.keys(window.gameData || {})
    .map(gameKey => ({
      key: gameKey,
      ...window.gameData[gameKey]
    }));
}


/* =========================
   # RECOMMEND MATCH HELPERS
========================= */

const DEFAULT_RECOMMEND_MAX_WEIGHT = 3.0;

const moodMaxWeightMap = {
  fun: 2.5,
  brain: 2.5,
  talk: 2.5,
  immersive: 3.0,
  cozy: 2.3
};

function arrayIncludesPlayer(values, playerValue){
  const normalized =
    (values || []).map(value => String(value));

  if(playerValue === "group"){
    return normalized.some(value =>
      Number(value) >= 5
    );
  }

  return normalized.includes(String(playerValue));
}

function matchRecommendPlayer(game, playerValue){
  if(!playerValue){
    return true;
  }

  const recommend =
    GameView?.getRecommendData(game);

    

  const bestPlayers =
    recommend?.bestPlayers || [];

  /*
   * 단체 선택:
   * bestPlayers 중 6명 이상이 있거나
   * large_group 태그가 있으면 통과
   */
  if(playerValue === "group"){
    const hasLargeBestPlayer =
      bestPlayers.some((p) => Number(p) >= 6);

    const tags =
      game?.cottage?.autoTags || [];

    return (
      hasLargeBestPlayer ||
      tags.includes("large_group")
    );
  }

  return arrayIncludesPlayer(
    bestPlayers,
    playerValue
  );
}

function matchRecommendLevel(game, levelValue){
  if(!levelValue){
    return true;
  }

  const normalizedLevel =
    normalizeLevelValue(levelValue);

  const recommend =
    GameView?.getRecommendData(game);

  const difficultyId =
    recommend?.difficultyId ||
    getDifficultyData(recommend?.difficultyWeight).id;

  return difficultyId === normalizedLevel;
}

function matchRecommendMood(game, moodValue){
  if(!moodValue){
    return true;
  }

  const recommend =
    GameView?.getRecommendData(game);

const allTags = [
  ...(recommend?.moodTags || []),
  ...(recommend?.playTags || []),
  ...(recommend?.situationTags || []),
  ...(recommend?.interactionTags || []),
  ...(recommend?.relationshipTags || []),
  ...(recommend?.displayTags || []),

  ...(game?.cottage?.moodTags || []),
  ...(game?.cottage?.playTags || []),
  ...(game?.cottage?.situationTags || []),
  ...(game?.cottage?.interactionTags || []),
  ...(game?.cottage?.relationshipTags || []),
  ...(game?.cottage?.displayTags || []),
  ...(game?.cottage?.autoTags || [])
];




  const moodTagMap = {
    fun: ["funny", "light", "party"],
brain: [
  "brainy",
  "머리 쓰는",
  "puzzle",
  "abstract",
  "pattern",
  "tile_placement",
  "number",
  "set_collection",
  "hand_management",
  "card_drafting",
  "light_strategy"
],
  };

  const targetTags =
    moodTagMap[moodValue] || [moodValue];

  return targetTags.some(tag =>
    allTags.includes(tag)
  );
}


/* =========================
   # GAME CARD RENDER
========================= */

function renderGameCards(){
  const gameScroll =
    document.getElementById("gameScroll");

  if(!gameScroll){
    return;
  }

  const modalSelectedPlayer =
    document.querySelector('[data-players].is-selected');

  const modalSelectedLevel =
    document.querySelector('[data-level].is-selected');

  const modalSelectedMood =
    document.querySelector('[data-mood].is-selected');

  const inlineSelectedPlayer =
    document.querySelector('[data-inline-type="players"].is-selected');

  const inlineSelectedLevel =
    document.querySelector('[data-inline-type="level"].is-selected');

  const inlineSelectedMood =
    document.querySelector('[data-inline-type="mood"].is-selected');

  const playerValue =
    modalSelectedPlayer
      ? modalSelectedPlayer.dataset.players
      : inlineSelectedPlayer
        ? inlineSelectedPlayer.dataset.inlineValue
        : null;

  const levelValue =
    modalSelectedLevel
      ? modalSelectedLevel.dataset.level
      : inlineSelectedLevel
        ? inlineSelectedLevel.dataset.inlineValue
        : null;

  const moodValue =
    modalSelectedMood
      ? modalSelectedMood.dataset.mood
      : inlineSelectedMood
        ? inlineSelectedMood.dataset.inlineValue
        : null;

 if(
  !playerValue &&
  !levelValue &&
  !moodValue
){
  gameScroll.style.display = "block";

  gameScroll.innerHTML = `
    <p class="recommend-empty">
      인원, 난이도, 분위기 중<br>
하나 이상을 골라주세요.
    </p>
  `;

  return;
}

  gameScroll.style.display = "flex";

  

const maxWeight =
  moodMaxWeightMap[moodValue] || DEFAULT_RECOMMEND_MAX_WEIGHT;

const filteredGames =
  getAllGamesArray()
    .filter((game) => {
      const data =
        GameView.getRecommendData(game);

   const weight =
  Number(data.difficultyWeight) ||
  Number(data.weight) ||
  Number(game?.cottage?.difficultyWeight) ||
  Number(game?.bgg?.weight) ||
  999;

if (weight > maxWeight) {
  return false;
}

      return (
        matchRecommendLevel(game, levelValue) &&
        matchRecommendPlayer(game, playerValue) &&
        matchRecommendMood(game, moodValue)
      );
    })
    .sort((a, b) => {
      const dataA =
        GameView.getRecommendData(a);

      const dataB =
        GameView.getRecommendData(b);

      const ratingA =
        Number(dataA.rating) ||
        Number(dataA.sourceRating) ||
        0;

      const ratingB =
        Number(dataB.rating) ||
        Number(dataB.sourceRating) ||
        0;

      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }

      const weightA =
        Number(dataA.difficultyWeight) || 999;

      const weightB =
        Number(dataB.difficultyWeight) || 999;

      return weightA - weightB;
    });


      
  if(filteredGames.length === 0){
    gameScroll.innerHTML = `
      <p class="recommend-empty">
        조건에 맞는 게임이 아직 없어요.<br>
다른 조건으로 다시 찾아보세요.
      </p>
    `;

    return;
  }

  const html =
    filteredGames
      .slice(0, 40)
      .map((game, index)=>{
        const gameKey =
          getGameKey(game);

        const card =
          GameView.getGameCardData(game);

        const difficulty =
          getDifficultyData(
            card.difficultyWeight
          );

        return `
          <button
            class="game-card ${index === 0 ? "active" : ""}"
            data-game="${gameKey}"
          >

            <img
              src="${card.image || DEFAULT_GAME_IMAGE}"
              alt="${card.title}"
              loading="lazy"
              onerror="this.onerror=null; this.src='${DEFAULT_GAME_IMAGE}';"
            >

            <strong>
              ${card.title}
            </strong>

            <div class="game-meta">

              <span>
                👥 ${formatPlayers(card.bestPlayers)}
              </span>

  <span class="card-difficulty ${difficulty.className}">
                ${difficulty.icon} ${card.difficultyWeight || "-"}
              </span>


              <span>
                ⏱ ${card.playingTimeText || "-"}
              </span>

            

            </div>

            <p class="game-card-description">
              ${(getGameDescription(game) || "").slice(0, 16)}...
            </p>

          </button>
        `;
      })
      .join("");

  gameScroll.innerHTML = html;
  bindGameCardEvents();
}


/* =========================
   # CARD EVENTS
========================= */

function bindGameCardEvents(){
  document
    .querySelectorAll('.game-card')
    .forEach(card=>{
      card.addEventListener('click', ()=>{
        const gameKey =
          card.dataset.game;

        openGameSheet(gameKey);

        document
          .querySelectorAll('.game-card')
          .forEach(c=>{
            c.classList.remove('active');
          });

        card.classList.add('active');
      });
    });
}


/* =========================
   # GAME SHEET
========================= */

const gameSheet =
  document.querySelector('#gameSheet');

const gameSheetContent =
  document.querySelector('#gameSheetContent');

const closeGameSheetButton =
  document.querySelector('#closeGameSheetButton');

const closeGameSheetDim =
  document.querySelector('#closeGameSheetDim');

function openGameSheet(gameKey){
  const game =
    window.gameData?.[gameKey];

  if(
    !game ||
    !gameSheet ||
    !gameSheetContent
  ){
    return;
  }

  const detail =
    GameView.getGameDetailData(game);


    
  const difficulty =
    getDifficultyData(
      detail.difficultyWeight
    );

  gameSheetContent.innerHTML = `
    <div class="sheet-image">

      <img
        src="${detail.image || DEFAULT_GAME_IMAGE}"
        alt="${detail.title}"
        onerror="this.onerror=null; this.src='${DEFAULT_GAME_IMAGE}';"
      >

    </div>

    <div class="sheet-content">

      <span class="level-badge">
        ${difficulty.label}
      </span>

      <h3>
        ${detail.title}
      </h3>

      <p class="sheet-description">
        ${detail.comment || detail.bgg.description || ""}
      </p>
      <div class="sheet-info-grid">

        <div>
          <strong>
            ${formatPlayers(detail.bestPlayers)}
          </strong>

          <span>베스트 인원</span>

          ${
            detail.recommendedPlayers?.length
              ? `
                <em class="player-sub-info">
                  (추천 ${formatPlayers(detail.recommendedPlayers)})
                </em>
              `
              : ""
          }
        </div>

        <div>
          <strong>
            ${formatDifficultyWeight(detail.difficultyWeight)}
          </strong>

          <span>난이도</span>

          <em class="difficulty-sub-info">
            ${formatDifficultyLabel(difficulty)}
          </em>
        </div>

      <div>
  <strong>
    ⭐ ${detail.rating || "-"}
  </strong>

  <span>평점</span>
</div>

<div>
  <strong>
    ${detail.playingTimeText || "-"}
  </strong>

  <span>플레이 시간</span>
</div>

      </div>

      ${
        detail.rating ||
        detail.bgg?.mechanics?.length ||
        detail.bgg?.categories?.length
          ? `
            <section class="sheet-section sheet-data-section">
              <h4>게임 정보</h4>

              <div class="sheet-data-list">
                ${
                  detail.rating
                    ? `
                      <div>
                        <span>평점</span>
                        <strong>⭐ ${detail.rating}</strong>
                      </div>
                    `
                    : ""
                }

                ${
                  detail.bgg?.mechanics?.length
                    ? `
                      <div>
                        <span>진행방식</span>
                        <strong>${detail.bgg.mechanics.slice(0, 3).join(", ")}</strong>
                      </div>
                    `
                    : ""
                }

                ${
                  detail.bgg?.categories?.length
                    ? `
                      <div>
                        <span>테마</span>
                        <strong>${detail.bgg.categories.slice(0, 3).join(", ")}</strong>
                      </div>
                    `
                    : ""
                }
              </div>
            </section>
          `
          : ""
      }

      ${
        detail.ruleSummary
          ? `
            <section class="sheet-section">
              <h4>🎲 간단 게임 규칙</h4>
              <p>${detail.ruleSummary}</p>
            </section>
          `
          : ''
      }

      ${
        detail.recommendPoint
          ? `
            <section class="sheet-section">
              <h4>💡 이런 분께 추천해요</h4>
              <p>${detail.recommendPoint}</p>
            </section>
          `
          : ''
      }

      ${
        detail.caution
          ? `
            <section class="sheet-section">
              <h4>⚠ 참고하면 좋아요</h4>
              <p>${detail.caution}</p>
            </section>
          `
          : ''
      }

      ${
        detail.youtubeUrl
          ? `
            <section class="sheet-section">
              <h4>🎥 룰 설명 영상</h4>

              <a
                class="sheet-youtube-link"
                href="${detail.youtubeUrl}"
                target="_blank"
                rel="noopener noreferrer"
              >
                유튜브로 설명 보기
              </a>
            </section>
          `
          : ''
      }

      ${
        detail.designers?.length
          ? `
            <section class="sheet-section">
              <h4>디자이너</h4>
              <p>${detail.designers.join(", ")}</p>
            </section>
          `
          : ""
      }

    </div>
  `;


  
  gameSheet.classList.add('is-active');
  document.body.classList.add('sheet-open');
}

function closeGameSheet(){
  if(!gameSheet){
    return;
  }

  gameSheet.classList.remove('is-active');
  document.body.classList.remove('sheet-open');
}


/* =========================
   # RECOMMEND MODAL ELEMENTS
========================= */

const openRecommendModalButton =
  document.querySelector('#openRecommendModal');

const openRecommendMenuButton =
  document.querySelector('#openRecommendMenu');

const recommendModal =
  document.querySelector('#recommendModal');

const closeRecommendModalButton =
  document.querySelector('#closeRecommendModal');

const closeRecommendModalDim =
  document.querySelector('#closeRecommendModalDim');

const applyRecommendConditionButton =
  document.querySelector('#applyRecommendCondition');

const changeRecommendConditionButton =
  document.querySelector('#changeRecommendCondition');

const backToHeroButton =
  document.querySelector('#backToHero');

const recommendSection =
  document.querySelector('#recommend');

const heroSection =
  document.querySelector('.hero');

const goHomeTitle =
  document.querySelector('#goHomeTitle');

const goHomeLogo =
  document.querySelector('#goHomeLogo');

const recommendFilter =
  document.querySelector('#recommendFilter');


/* =========================
   # OPEN / CLOSE MODAL
========================= */

function openRecommendModal(){
  if(!recommendModal){
    return;
  }

  recommendModal.classList.add('is-active');

  recommendModal.setAttribute(
    'aria-hidden',
    'false'
  );
}

function closeRecommendModal(){
  if(!recommendModal){
    return;
  }

  recommendModal.classList.remove('is-active');

  recommendModal.setAttribute(
    'aria-hidden',
    'true'
  );
}


/* =========================
   # UPDATE RECOMMEND FILTER TEXT
========================= */

function renderInlineOption(type, value, label, selectedValue){
  const isNoneOption = value === "";
  const isSelected = value === selectedValue;

  return `
    <button
      class="recommend-inline-option ${isNoneOption ? "is-none-option" : ""} ${isSelected ? "is-selected" : ""}"
      type="button"
      data-inline-type="${type}"
      data-inline-value="${value}"
    >
      ${label}
    </button>
  `;
}

const playerTextMap = {
  "1": "혼자 왔어요",
  "2": "둘이 왔어요",
  "3": "셋이 왔어요",
  "4": "넷이 왔어요",
  "group": "단체로 왔어요"
};

const levelTextMap = {
  kids: "아이도 할 수 있어요",
  beginner: "입문 추천",
  light: "라이트·패밀리",
  heavy: "헤비·매니아",
  hardcore: "하드코어"
};

const moodTextMap = {
  fun: "가볍게 웃고 싶어요",
  brain: "머리 쓰는 느낌",
  talk: "대화가 많은 게임",
  immersive: "몰입감 있게"
};

function updateRecommendFilterText(){
  if(!recommendFilter){
    return;
  }

  const selectedPlayers =
    document.querySelector('[data-players].is-selected');

  const selectedLevel =
    document.querySelector('[data-level].is-selected');

  const selectedMood =
    document.querySelector('[data-mood].is-selected');

  const inlineSelectedPlayer =
    document.querySelector('[data-inline-type="players"].is-selected');

  const inlineSelectedLevel =
    document.querySelector('[data-inline-type="level"].is-selected');

  const inlineSelectedMood =
    document.querySelector('[data-inline-type="mood"].is-selected');

  const playerValue =
    selectedPlayers
      ? selectedPlayers.dataset.players
      : inlineSelectedPlayer
        ? inlineSelectedPlayer.dataset.inlineValue
        : null;

  const levelValue =
    selectedLevel
      ? selectedLevel.dataset.level
      : inlineSelectedLevel
        ? inlineSelectedLevel.dataset.inlineValue
        : null;

  const moodValue =
    selectedMood
      ? selectedMood.dataset.mood
      : inlineSelectedMood
        ? inlineSelectedMood.dataset.inlineValue
        : null;

  recommendFilter.innerHTML = `
    <div class="recommend-filter-card recommend-filter-card-v3">

      <h2 class="recommend-filter-main-title">
        🍀 오늘은 어떤 게임이 어울릴까요?
      </h2>

      <div class="recommend-step" data-filter-group="players">
        <button class="recommend-step-head" type="button" data-toggle-filter="players">
          <span><b>1</b> 인원</span>
          <strong class="${playerValue ? '' : 'is-placeholder'}">
            ${playerValue ? playerTextMap[playerValue] : '인원 선택'} ▾
          </strong>
        </button>

        <div class="recommend-step-options">
        
          ${renderInlineOption("players", "2", "💗 둘이 왔어요", playerValue)}
          ${renderInlineOption("players", "3", "🍻 셋이 왔어요", playerValue)}
          ${renderInlineOption("players", "4", "🎲 넷이 왔어요", playerValue)}
          ${renderInlineOption("players", "group", "🎉 단체로왔어요", playerValue)}
          ${renderInlineOption("players", "1", "☕ 혼자 왔어요", playerValue)}
        ${renderInlineOption("players", "", "상관없어요", playerValue)}
          </div>
      </div>

      <div class="recommend-step" data-filter-group="level">
        <button class="recommend-step-head" type="button" data-toggle-filter="level">
          <span><b>2</b> 난이도</span>
          <strong class="${levelValue ? '' : 'is-placeholder'}">
            ${levelValue ? levelTextMap[levelValue] : '난이도 선택'} ▾
          </strong>
        </button>

        <div class="recommend-step-options">
          ${renderInlineOption("level", "kids", "😊 아이도 할 수 있어요", levelValue)}
          ${renderInlineOption("level", "beginner", "🌱 입문 추천", levelValue)}
          ${renderInlineOption("level", "light", "🏡 라이트·패밀리", levelValue)}
          ${renderInlineOption("level", "heavy", "🧠 헤비·매니아", levelValue)}
          ${renderInlineOption("level", "hardcore", "😈 하드코어", levelValue)}
          ${renderInlineOption("level", "", "상관없어요", levelValue)}
        </div>
      </div>

      <div class="recommend-step" data-filter-group="mood">
        <button class="recommend-step-head" type="button" data-toggle-filter="mood">
          <span><b>3</b> 분위기</span>
          <strong class="${moodValue ? '' : 'is-placeholder'}">
            ${moodValue ? moodTextMap[moodValue] : '분위기 선택'} ▾
          </strong>
        </button>

        <div class="recommend-step-options">
          ${renderInlineOption("mood", "fun", "😄 가볍게 웃고 싶어요", moodValue)}
          ${renderInlineOption("mood", "brain", "🧠 머리 쓰는 느낌", moodValue)}
          ${renderInlineOption("mood", "talk", "💬 대화가 많은 게임", moodValue)}
          ${renderInlineOption("mood", "immersive", "🔥 몰입감 있게", moodValue)}
          ${renderInlineOption("mood", "", "상관없어요", moodValue)}
        </div>
      </div>

    </div>
  `;
}

if(recommendFilter){
  recommendFilter.addEventListener(
    'click',
    (event)=>{
      const toggleButton =
        event.target.closest('[data-toggle-filter]');

      if(toggleButton){
        const group =
          toggleButton.closest('.recommend-step');

        if(group){
          group.classList.toggle('is-open');
        }

        return;
      }

      const optionButton =
  event.target.closest('[data-inline-type]');

if(!optionButton){
  return;
}

const type =
  optionButton.dataset.inlineType;

const wasSelected =
  optionButton.classList.contains('is-selected');

recommendFilter
  .querySelectorAll(`[data-inline-type="${type}"]`)
  .forEach(btn=>{
    btn.classList.remove('is-selected');
  });

if(
  !wasSelected &&
  optionButton.dataset.inlineValue !== ""
){
  optionButton.classList.add('is-selected');
}

updateRecommendFilterText();
renderGameCards();
    }
  );
}


/* =========================
   # SHOW RECOMMEND RESULTS
========================= */

function showRecommendResults(){
  updateRecommendFilterText();
  renderGameCards();
  closeRecommendModal();

  if(recommendSection){
    recommendSection.classList.remove('is-hidden');

    const header =
      document.querySelector('.site-header');

    const headerHeight =
      header ? header.offsetHeight : 0;

    window.scrollTo({
      top:
        recommendSection.offsetTop - headerHeight + 12,
      behavior:'smooth'
    });
  }
}


/* =========================
   # BACK TO HERO
========================= */

function backToHero(){
  if(recommendSection){
    recommendSection.classList.add('is-hidden');
  }

  if(heroSection){
    heroSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}


/* =========================
   # EVENT LISTENERS
========================= */

if(openRecommendModalButton){
  openRecommendModalButton.addEventListener(
    'click',
    showRecommendResults
  );
}

if(openRecommendMenuButton){
  openRecommendMenuButton.addEventListener(
    'click',
    (event)=>{
      event.preventDefault();
      showRecommendResults();
    }
  );
}

if(changeRecommendConditionButton){
  changeRecommendConditionButton.addEventListener(
    'click',
    openRecommendModal
  );
}

if(closeRecommendModalButton){
  closeRecommendModalButton.addEventListener(
    'click',
    closeRecommendModal
  );
}

if(closeRecommendModalDim){
  closeRecommendModalDim.addEventListener(
    'click',
    closeRecommendModal
  );
}

if(applyRecommendConditionButton){
  applyRecommendConditionButton.addEventListener(
    'click',
    showRecommendResults
  );
}

if(backToHeroButton){
  backToHeroButton.addEventListener(
    'click',
    backToHero
  );
}

if(closeGameSheetButton){
  closeGameSheetButton.addEventListener(
    'click',
    closeGameSheet
  );
}

if(closeGameSheetDim){
  closeGameSheetDim.addEventListener(
    'click',
    closeGameSheet
  );
}

if(goHomeTitle){
  goHomeTitle.addEventListener(
    'click',
    (event)=>{
      event.preventDefault();
      backToHero();
    }
  );
}

if(goHomeLogo){
  goHomeLogo.addEventListener(
    'click',
    (event)=>{
      event.preventDefault();
      backToHero();
    }
  );
}


/* =========================
   # MODAL SCROLL RESET
========================= */

function forceResetModalScroll(){
  const modal =
    document.querySelector('.recommend-modal');

  const modalPanel =
    document.querySelector('.recommend-modal-panel');

  const modalBody =
    document.querySelector('.recommend-modal-body');

  if(modal){
    modal.scrollTop = 0;
  }

  if(modalPanel){
    modalPanel.scrollTop = 0;
  }

  if(modalBody){
    modalBody.scrollTop = 0;
  }
}

document.addEventListener(
  'click',
  (event)=>{
    const clickedOpenButton =
      event.target.closest(
        '#openRecommendModal, #openRecommendMenu, #changeRecommendCondition'
      );

    if(!clickedOpenButton){
      return;
    }

    setTimeout(()=>{
      forceResetModalScroll();
    }, 30);
  }
);


/* =========================
   # OWNED GAMES PAGE
========================= */

const ownedPageState = {
  page: 1,
  perPage: 20,

  sortTitle: "asc",
  sortWeight: "none",
  sortRating: "none",

  difficultyFilter: "",
  mechanicFilter: ""
};


/* =========================
   # OWNED FILTER
========================= */

function matchOwnedDifficulty(game){
  const filter =
    ownedPageState.difficultyFilter;

  if(!filter){
    return true;
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


/* =========================
   # OWNED SORT
========================= */

function sortOwnedGames(games){
  return [...games].sort((a, b)=>{
    const sortRules = [
      {
        key: "title",
        dir: ownedPageState.sortTitle
      },
      {
        key: "weight",
        dir: ownedPageState.sortWeight
      },
      {
        key: "rating",
        dir: ownedPageState.sortRating
      }
    ];

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
   # OWNED PAGINATION
========================= */

function renderOwnedPagination(totalPages){
  const ownedPagination =
    document.getElementById("ownedPagination");

  if(!ownedPagination){
    return;
  }

  const safeTotalPages =
    Math.max(totalPages, 1);

  let html = "";

  html += `
    <button
      type="button"
      ${ownedPageState.page === 1 ? "disabled" : ""}
      data-page-action="prev"
    >
      이전
    </button>
  `;

  for(let i = 1; i <= safeTotalPages; i++){
    if(
      i === 1 ||
      i === safeTotalPages ||
      Math.abs(i - ownedPageState.page) <= 2
    ){
      html += `
        <button
          type="button"
          class="${i === ownedPageState.page ? "is-active" : ""}"
          data-page="${i}"
        >
          ${i}
        </button>
      `;
    }
  }

  html += `
    <button
      type="button"
      ${ownedPageState.page === safeTotalPages ? "disabled" : ""}
      data-page-action="next"
    >
      다음
    </button>
  `;

  ownedPagination.innerHTML = html;
}


/* =========================
   # OWNED LIST
========================= */

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
    getAllGamesArray()
      .filter(matchOwnedDifficulty)
      .filter(matchOwnedMechanic);

  const sortedGames =
    sortOwnedGames(filteredGames);

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
      <p class="recommend-empty">
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
          getDifficultyData(
            Number(detail.difficultyWeight) || 0
          );

        return `
          <button
            class="owned-game-item"
            type="button"
            data-game="${getGameKey(game)}"
          >

            <img
              src="${detail.thumbnail || detail.image || DEFAULT_GAME_IMAGE}"
              alt="${detail.title}"
              loading="lazy"
              onerror="this.onerror=null; this.src='${DEFAULT_GAME_IMAGE}';"
            >

            <div class="owned-game-info">

              <strong>
                ${detail.title}
              </strong>

              <div class="owned-game-meta">
  <span>
    👥 ${
      formatPlayers(detail.bestPlayers) ||
      detail.playerRangeText ||
      "-"
    }
  </span>

  <span>
    ⏱ ${
      detail.playingTimeText ||
      "-"
    }
  </span>

  <span class="${difficulty.className}">
    ${difficulty.icon}
    ${
      detail.difficultyWeight ||
      "-"
    }
  </span>

  <span>
    ⭐ ${
      detail.rating ||
      "-"
    }
  </span>
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
  .getElementById("ownedDifficultyFilter")
  ?.addEventListener(
    "change",
    (event)=>{
      ownedPageState.difficultyFilter =
        event.target.value;

      ownedPageState.page = 1;
      renderOwnedGameList();
    }
  );

document
  .getElementById("ownedMechanicFilter")
  ?.addEventListener(
    "change",
    (event)=>{
      ownedPageState.mechanicFilter =
        event.target.value;

      ownedPageState.page = 1;
      renderOwnedGameList();
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
            getAllGamesArray().length /
            ownedPageState.perPage
          ),
          1
        );

      if(pageButton){
        ownedPageState.page =
          Number(pageButton.dataset.page);

        renderOwnedGameList();

        window.scrollTo({
          top:0,
          behavior:"smooth"
        });

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

        renderOwnedGameList();
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

        renderOwnedGameList();
      }
    }
  );

document
  .getElementById("sortTitle")
  ?.addEventListener("change", (event)=>{
    ownedPageState.sortTitle = event.target.value;
    ownedPageState.page = 1;
    renderOwnedGameList();
  });

document
  .getElementById("sortWeight")
  ?.addEventListener("change", (event)=>{
    ownedPageState.sortWeight = event.target.value;
    ownedPageState.page = 1;
    renderOwnedGameList();
  });

document
  .getElementById("sortRating")
  ?.addEventListener("change", (event)=>{
    ownedPageState.sortRating = event.target.value;
    ownedPageState.page = 1;
    renderOwnedGameList();
  });


/* =========================
   # URL HASH
========================= */

if(window.location.hash === "#recommend"){
  setTimeout(()=>{
    showRecommendResults();
  }, 200);
}


/* =========================
   # INIT
========================= */

if(document.getElementById("gameScroll")){
  updateRecommendFilterText();
  renderGameCards();
}

const playerOptions =
  document.querySelectorAll('[data-players]');

const levelOptions =
  document.querySelectorAll('[data-level]');

const moodOptions =
  document.querySelectorAll('[data-mood]');

playerOptions.forEach(option=>{
  option.addEventListener(
    'click',
    ()=>{
      playerOptions.forEach(btn=>{
        btn.classList.remove('is-selected');
      });

      option.classList.add('is-selected');
    }
  );
});

levelOptions.forEach(option=>{
  option.addEventListener(
    'click',
    ()=>{
      levelOptions.forEach(btn=>{
        btn.classList.remove('is-selected');
      });

      option.classList.add('is-selected');
    }
  );
});

moodOptions.forEach(option=>{
  option.addEventListener(
    'click',
    ()=>{
      moodOptions.forEach(btn=>{
        btn.classList.remove('is-selected');
      });

      option.classList.add('is-selected');
    }
  );
});




updateRecommendFilterText();

renderMechanicOptions();
renderOwnedGameList();


const recommendTitle =
  document.getElementById("recommendTitle");

if (recommendTitle && recommendSection) {

  recommendTitle.addEventListener("click", () => {

    const header =
      document.querySelector(".site-header");

    const headerHeight =
      header ? header.offsetHeight : 0;

    window.scrollTo({
      top:
        recommendSection.offsetTop - headerHeight + 12,
      behavior: "smooth"
    });

  });

}