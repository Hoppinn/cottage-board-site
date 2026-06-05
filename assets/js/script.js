const CHOSEONG_LIST = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ",
  "ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ",
  "ㅋ","ㅌ","ㅍ","ㅎ"
];

function getChoseong(text=""){
  return [...String(text)]
    .map(char=>{
      const code = char.charCodeAt(0) - 44032;

      if(code >= 0 && code <= 11171){
        return CHOSEONG_LIST[
          Math.floor(code / 588)
        ];
      }

      return char;
    })
    .join("");

    

}

const DOUBLE_CONSONANT_MAP = {
  "ㄳ": "ㄱㅅ",
  "ㄵ": "ㄴㅈ",
  "ㄶ": "ㄴㅎ",
  "ㄺ": "ㄹㄱ",
  "ㄻ": "ㄹㅁ",
  "ㄼ": "ㄹㅂ",
  "ㄽ": "ㄹㅅ",
  "ㄾ": "ㄹㅌ",
  "ㄿ": "ㄹㅍ",
  "ㅀ": "ㄹㅎ",
  "ㅄ": "ㅂㅅ"
};

function normalizeKoreanSearchQuery(text=""){
  return normalizeSearchText(text)
    .split("")
    .map(char => DOUBLE_CONSONANT_MAP[char] || char)
    .join("");
}

function isHangulSyllable(char){
  const code = char.charCodeAt(0);
  return code >= 44032 && code <= 55203;
}

function isKoreanConsonant(char){
  return CHOSEONG_LIST.includes(char);
}

function matchKoreanSmart(title, query){
  const target =
    normalizeSearchText(title);

  const pattern =
    normalizeKoreanSearchQuery(query);

  if(!target || !pattern){
    return false;
  }

  for(let start = 0; start <= target.length - pattern.length; start++){
    let matched = true;

    for(let i = 0; i < pattern.length; i++){
      const queryChar = pattern[i];
      const titleChar = target[start + i];

      if(isHangulSyllable(queryChar)){
        if(queryChar !== titleChar){
          matched = false;
          break;
        }
      } else if(isKoreanConsonant(queryChar)){
        if(getChoseong(titleChar) !== queryChar){
          matched = false;
          break;
        }
      } else {
        if(queryChar !== titleChar){
          matched = false;
          break;
        }
      }
    }

    if(matched){
      return true;
    }
  }

  return false;
}

function normalizeSearchText(text=""){
  return String(text)
    .toLowerCase()
    .replace(/\s+/g,"")
    .trim();
}


// 현재 페이지 기준 사이트 루트 경로 (script.js src로 역산)
const rootPath = (()=>{
  const el = document.querySelector('script[src$="assets/js/script.js"]');
  if(!el) return './';
  return el.src.replace(/assets\/js\/script\.js(\?.*)?$/, '');
})();

/* =========================
   # COTTAGEBOARD FRONT SCRIPT
   - nested gameData schema 기준
   - assets/js/view/game-view-utils.js 필요
========================= */

const GameView = window.CottageGameView;

if (!GameView) {
  console.warn(
    "CottageGameView가 로드되지 않았습니다. assets/js/game-display-adapter.js를 script.js보다 먼저 불러오세요."
  );
}

const DEFAULT_GAME_IMAGE =
  `${rootPath}assets/images/main/hero.png`;


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

function resetMenuGroups(){
  // 스크롤 위치 기반: 추천 섹션 top이 뷰포트 상반부에 들어오면 active
  const recEl = document.getElementById('recommend');
  let isRecActive = false;
  if(recEl){
    const rect = recEl.getBoundingClientRect();
    isRecActive = rect.top < window.innerHeight * 0.5;
  }

  const recommendLink = document.querySelector('#openRecommendMenu');
  if(recommendLink){
    recommendLink.classList.toggle('is-current', isRecActive);
    recommendLink.style.background = '';
    recommendLink.style.color = '';
    recommendLink.style.fontWeight = '';
    recommendLink.style.borderRadius = '';
  }

  document.querySelectorAll('.menu-group').forEach(g=>{
    g.classList.remove('is-open');
  });

  const loginBtn = document.getElementById('kakaoLoginBtn');
  const userActions = document.getElementById('kakaoUserActions');
  if(loginBtn && userActions){
    loginBtn.classList.remove('is-expanded');
    userActions.style.display = 'none';
  }

  const currentLink = document.querySelector('.header-menu a.is-current');
  if(currentLink){
    currentLink.style.setProperty('background', '#7a4828', 'important');
    currentLink.style.setProperty('color', '#fff', 'important');
    currentLink.style.setProperty('font-weight', '900', 'important');
    currentLink.style.setProperty('border-radius', '8px', 'important');
    const activeGroup = currentLink.closest('.menu-group');
    if(activeGroup) activeGroup.classList.add('is-open');
  }
}

function toggleMenu(){
  if(!mobileMenu){ return; }
  const isOpening = !mobileMenu.classList.contains('active');
  if(isOpening){
    resetMenuGroups();
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

    // 단체 버튼 클릭 시 드롭다운 닫힘 예외 처리 (자식 요소 클릭 포함)
    if(event.target.closest('[data-inline-value="group"]')){
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

// 메뉴 그룹 아코디언 (모바일 클릭 / 데스크톱 hover는 CSS)
document.querySelectorAll('.menu-group-header').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const group = btn.closest('.menu-group');
    const isOpen = group.classList.contains('is-open');
    document.querySelectorAll('.menu-group').forEach(g=>g.classList.remove('is-open'));
    if(!isOpen) group.classList.add('is-open');
  });
});

// 현재 페이지 메뉴 active 표시 + 해당 그룹 자동 펼침
(()=>{
  const currentPath = location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.header-menu a').forEach(link=>{
    const rawHref = link.getAttribute('href') || '';
    if(rawHref === '#' || rawHref.startsWith('#')) return;
    const linkPath = new URL(link.href, location.href).pathname.replace(/\/$/, '');
    if(linkPath === currentPath){
      link.classList.add('is-current');
      const group = link.closest('.menu-group');
      if(group) group.classList.add('is-open');
    }
  });
})();


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

const DIFFICULTY_UNKNOWN = { id: "unknown", label: "-", shortLabel: "-", icon: "", className: "" };

function getDifficultyData(weight){
  const numericWeight =
    Number(weight) || 0;

  if(numericWeight === 0){
    return DIFFICULTY_UNKNOWN;
  }

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

  if(value === "easy_coop"){
    return "easy_coop";
  }

  if(value === "hard_coop"){
    return "hard_coop";
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

function cleanTitleForYoutubeSearch(title) {
  return (title || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\+.*$/, '')
    .trim();
}

function formatRating(value){
  const num = Number(value);
  if(!value || !Number.isFinite(num) || num <= 0) return "-";
  return num.toFixed(2);
}

function formatDifficultyWeight(value){
  const num = Number(value);

  if(
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isFinite(num) ||
    num <= 0
  ){
    return "-";
  }

  return num.toFixed(2);
}

function formatDifficultyLabel(difficulty){
  if(!difficulty || difficulty.id === "unknown") return "";
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

function getGameShelfLabel(game){
  return (
    game?.cottage?.shelfLabel ||
    game?.cottage?.shelfGroupId ||
    "-"
  );
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

const DEFAULT_RECOMMEND_MAX_WEIGHT = 2.5;

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

function matchBestPlayers(game, playerValue){
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
    return bestPlayers.some((p) => Number(p) >= 5);
  }

  if(playerValue === "9+"){
    return bestPlayers.some((p) => Number(p) >= 9);
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

  if(difficultyId === "unknown"){
    return false;
  }

  return difficultyId === normalizedLevel;
}

function matchRecommendMood(game, moodValue){
  if(!moodValue){
    return true;
  }

  const recommend =
    GameView?.getRecommendData(game);

  const weight =
    Number(recommend?.difficultyWeight) ||
    Number(game?.bgg?.weight) ||
    0;

  // 가벼운 카드게임: 난이도 2.5 이하
  if (moodValue === "card" && weight > 2.50) return false;

  // 가벼운 주사위게임: 난이도 2.0 이하
  if (moodValue === "dice" && weight > 2.00) return false;

  // 운 게임: 메커닉 자동감지 + 수동 보정
  if (moodValue === "luck") {
    const gameId = game?.id || "";
    // 수동 제외 (메커닉 걸리지만 운게임 아닌 것)
    const LUCK_EXCLUDE = new Set([]);
    if (LUCK_EXCLUDE.has(gameId)) return false;
    // 수동 포함 (메커닉으로 안 잡히지만 운게임인 것)
    const LUCK_INCLUDE = new Set(['럭키넘버스', '데드맨스드로우', '플립7']);
    if (LUCK_INCLUDE.has(gameId)) return true;
    // 메커닉 자동감지
    const mechs = new Set((game?.bgg?.mechanics || []).map(
      m => m.toLowerCase().replace(/[\s\-]+/g, '_')
    ));
    return mechs.has('re_rolling_and_locking') ||
      (mechs.has('push_your_luck') && mechs.has('score_and_reset_game'));
  }

  const normalizeBgg = str => str.toLowerCase().replace(/[\s\-\/]+/g, '_');
  const allTags = [
    ...(recommend?.moodTags || []),
    ...(recommend?.playTags || []),
    ...(recommend?.relationshipTags || []),
    ...(recommend?.displayTags || []),
    ...(game?.cottage?.situationTags || []),
    ...(game?.cottage?.interactionTags || []),
    ...(game?.cottage?.autoTags || []),
    ...(game?.bgg?.mechanics || []).map(normalizeBgg),
    ...(game?.bgg?.categories || []).map(normalizeBgg),
  ];

  // 협력 게임: 팀 대항전 태그 있으면 제외 (코드네임 등)
  if (moodValue === "coop" && allTags.includes("team")) return false;

  const moodTagMap = {
    talk:   ["table_talk", "social", "storytelling", "negotiation", "murder_mystery"],
    luck:   ["luck", "chaotic", "random"],
    bluff:  ["bluffing", "hidden_role", "betrayal"],
    guess:  ["deduction", "guessing", "word_game", "pattern_recognition"],
    brain:  ["puzzle", "strategy", "immersive"],
    coop:   ["cooperative", "easy_coop", "hard_coop"],
    team:   ["team"],
    card:   ["card_play"],
    dice:   ["dice_rolling", "re_rolling_and_locking", "die_icon_resolution"],
    active: ["dexterity", "chaotic", "quick_play"],
  };

  const targetTags =
    moodTagMap[moodValue] || [moodValue];

  return targetTags.some(tag =>
    allTags.includes(tag)
  );
}





const headerSearchButton =
  document.getElementById("headerSearchButton");

if(mobileMenu){
  mobileMenu.classList.remove("active");
}
  
const headerSearchPanel =
  document.getElementById("headerSearchPanel");

const headerSearchInput =
  document.getElementById("headerSearchInput");

if(headerSearchButton && headerSearchPanel && headerSearchInput){
  headerSearchButton.addEventListener("click", ()=>{
  if(mobileMenu){
    mobileMenu.classList.remove("active");
  }

  headerSearchPanel.classList.toggle("is-active");

  if(headerSearchPanel.classList.contains("is-active")){
    headerSearchInput.focus();

    renderHeaderSearchResults(
      headerSearchInput.value
    );
  }
});
}

const headerSearchResults =
  document.getElementById("headerSearchResults");

function renderHeaderSearchResults(keyword){
  if(!headerSearchResults){
    return;
  }

  const query =
    String(keyword || "").trim().toLowerCase();

  if(!query){
    headerSearchResults.innerHTML = "";
    return;
  }

  const matchedGames =
  getAllGamesArray()
    .map(game=>{
      const detail =
        GameView.getGameDetailData(game);

      const title =
        String(detail.title || "");

      const originalTitle =
        String(detail.originalTitle || "");

      const lowerTitle =
        title.toLowerCase();

      const lowerOriginalTitle =
        originalTitle.toLowerCase();

      const rating =
        Number(detail.rating) || 0;

      const normalizedTitle =
  normalizeSearchText(title);

const normalizedOriginalTitle =
  normalizeSearchText(originalTitle);

const normalizedQuery =
  normalizeKoreanSearchQuery(query);

const titleChoseong =
  getChoseong(normalizedTitle);

const originalTitleChoseong =
  getChoseong(normalizedOriginalTitle);

const queryChoseong =
  getChoseong(normalizedQuery);

const isMatched =
  normalizedTitle.includes(normalizedQuery) ||
  normalizedOriginalTitle.includes(normalizedQuery) ||
  matchKoreanSmart(title, normalizedQuery) ||
  matchKoreanSmart(originalTitle, normalizedQuery);

      if(!isMatched){
        return null;
      }

      let score = 0;

      if(lowerTitle === query){
        score += 1000;
      }

      if(lowerTitle.startsWith(query)){
        score += 500;
      }

if(titleChoseong.startsWith(queryChoseong)){
  score += 400;
}

if(titleChoseong.includes(queryChoseong)){
  score += 120;
}


      
      if(lowerOriginalTitle.startsWith(query)){
        score += 300;
      }

      if(lowerTitle.includes(query)){
        score += 100;
      }

      if(lowerOriginalTitle.includes(query)){
        score += 60;
      }

      score -= title.length * 0.5;
      score += rating;

      return {
        game,
        score
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(item => item.game)
    .slice(0, 8);

  if(matchedGames.length === 0){
    headerSearchResults.innerHTML = `
      <p class="header-search-empty">
        검색 결과가 없어요.
      </p>
    `;
    return;
  }

  headerSearchResults.innerHTML =
    matchedGames
      .map(game=>{
        const detail =
          GameView.getGameDetailData(game);

        return `
          <button
            class="header-search-result"
            type="button"
            data-game="${getGameKey(game)}"
          >
            <img
              src="${detail.thumbnail || detail.image || DEFAULT_GAME_IMAGE}"
              alt="${detail.title}"
              loading="lazy"
              onerror="this.onerror=null; this.src='${DEFAULT_GAME_IMAGE}';"
            >

            <strong>
              ${detail.title}
            </strong>
          </button>
        `;
      })
      .join("");
}

if(headerSearchInput){
  headerSearchInput.addEventListener("input", ()=>{
    renderHeaderSearchResults(headerSearchInput.value);
  });

  headerSearchInput.addEventListener("keydown", (event)=>{
    if(event.key !== "Enter"){
      return;
    }

    const keyword =
      headerSearchInput.value.trim();

    if(!keyword){
      return;
    }

    window.location.href =
      `${rootPath}pages/game/owned-games.html?search=${encodeURIComponent(keyword)}`;
  });
}

if(headerSearchResults){
  headerSearchResults.addEventListener("click", (event)=>{
    const resultButton =
      event.target.closest("[data-game]");

    if(!resultButton){
      return;
    }

    const gameKey = resultButton.dataset.game;
    if(gameSheet && gameSheetContent){
      openGameSheet(gameKey);
    } else {
      window.location.href =
        `${rootPath}pages/game/owned-games.html?open=${encodeURIComponent(gameKey)}`;
    }
  });
}

document.addEventListener("click", (event)=>{
  if(
    !headerSearchPanel ||
    !headerSearchButton
  ){
    return;
  }

  const clickedInsideSearch =
    headerSearchPanel.contains(event.target);

  const clickedSearchButton =
    headerSearchButton.contains(event.target);

  const clickedInsideGameSheet =
    event.target.closest("#gameSheet");

  if(clickedInsideGameSheet){
    return;
  }

  if(
    !clickedInsideSearch &&
    !clickedSearchButton
  ){
    headerSearchPanel.classList.remove("is-active");
  }
});

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

let _currentSheetGameKey = null;

function openGameSheet(gameKey){
  _currentSheetGameKey = gameKey;
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
    getDifficultyData(detail.difficultyWeight);

  const isCooperative =
    game.bgg?.mechanics?.includes("Cooperative Game") || false;

  const difficultyLabel = isCooperative
    ? (detail.difficultyWeight <= 2.50 ? "쉬운 협력게임" : "어려운 협력게임")
    : difficulty.label;

  const weightDisplay = detail.difficultyWeight > 0
    ? ` 🏠 ${formatDifficultyWeight(detail.difficultyWeight)}`
    : "";

  const bestText = formatPlayers(detail.bestPlayers);
  const recArr   = detail.recommendedPlayers;
  const recShort = (Array.isArray(recArr) && recArr.length)
    ? (() => {
        const s = [...recArr].map(Number).sort((a,b)=>a-b);
        return s[0] === s[s.length-1] ? `${s[0]}` : `${s[0]}~${s[s.length-1]}`;
      })()
    : null;
  const playersLine =
    bestText !== "-" && recShort ? `베스트 ${bestText} (추천 ${recShort}명)`
    : bestText !== "-" ? `베스트 ${bestText}`
    : recShort ? `추천 ${recShort}명`
    : detail.playerRangeText || "-";

  const shelfGroupId = game.cottage?.shelfGroupId || "";
  const shelfLabel   = game.cottage?.shelfLabel   || "-";
  const mechanicsDisplay  = (detail.bgg.mechanicsKo?.length  ? detail.bgg.mechanicsKo  : detail.bgg.mechanics)  || [];
  const categoriesDisplay = (detail.bgg.categoriesKo?.length ? detail.bgg.categoriesKo : detail.bgg.categories) || [];

  // 인원 정보
  const bestDisplayMain = bestText !== "-"
    ? `<span class="sheet-player-icon">👥</span> 베스트 ${bestText}`
    : (recShort ? `<span class="sheet-player-icon">👥</span> 추천 ${recShort}명` : `<span class="sheet-player-icon">👥</span> -`);
  const bestDisplaySub = bestText !== "-" && recShort
    ? `(추천 ${recShort}명)`
    : "";

  // 무게/난이도 정보
  const weightMain = detail.difficultyWeight > 0
    ? `🎯 ${formatDifficultyWeight(detail.difficultyWeight)}`
    : `🎯 ${difficultyLabel}`;
  const weightSub = detail.difficultyWeight > 0
    ? `(${difficultyLabel})`
    : "";

  gameSheetContent.innerHTML = `

    <!-- sticky bar (스크롤 시 표시) -->
    <div class="sheet-sticky-bar" id="sheetStickyBar">
      <img class="sheet-sticky-thumb"
        src="${detail.image || DEFAULT_GAME_IMAGE}"
        alt="${detail.title}"
        onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';"
      >
      <span class="sheet-sticky-title">${detail.title}</span>
      ${detail.rating ? `<span class="sheet-sticky-bgg">⭐ ${formatRating(detail.rating)}</span>` : ""}
    </div>

    <!-- 제목 행 -->
    <div class="sheet-title-row">
      <h3 class="sheet-game-title">${detail.title}</h3>
      ${detail.bggTitle && detail.bggTitle !== detail.title
        ? `<p class="sheet-en-title">${detail.bggTitle}</p>` : ""}
    </div>

    <!-- 이미지 + 설명 -->
    <div class="sheet-header">
      <div class="sheet-img-col">
        <img class="sheet-thumb"
          src="${detail.image || DEFAULT_GAME_IMAGE}"
          alt="${detail.title}"
          onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';"
        >
        ${detail.rating ? `<div class="sheet-img-bgg">⭐ ${formatRating(detail.rating)}</div>` : ""}
      </div>
      <div class="sheet-title-block">
        ${detail.summaryKo ? `<p class="sheet-summary">${detail.summaryKo}</p>` : ""}
        <div class="sheet-action-btns">
          <button class="sheet-loc-btn" onclick="goToShelf('${shelfGroupId}')">
            📍 ${shelfLabel}
          </button>
          <a class="sheet-yt-btn"
            href="${detail.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitleForYoutubeSearch(detail.title) + ' 보드게임')}`}"
            onclick="return confirm('유튜브로 이동할까요?')"
            target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
            룰영상 보기
          </a>
        </div>
      </div>
    </div>

    <!-- 인원 · 시간 · 무게 한 줄 -->
    <div class="sheet-stats-block">
      <div class="sheet-stats-row">
        <span class="sheet-stats-item">
          <span class="sheet-stats-main">${bestDisplayMain}</span>
          ${bestDisplaySub ? `<span class="sheet-stats-sub">${bestDisplaySub}</span>` : ""}
        </span>
        <span class="sheet-stats-dot">·</span>
        <span class="sheet-stats-item">
          <span class="sheet-stats-main">⏱ ${detail.playingTimeText || "-"}</span>
        </span>
        <span class="sheet-stats-dot">·</span>
        <span class="sheet-stats-item">
          <span class="sheet-stats-main">${weightMain}</span>
          ${weightSub ? `<span class="sheet-stats-sub">${weightSub}</span>` : ""}
        </span>
      </div>
    </div>

    <!-- 분위기 태그 -->
    ${detail.displayTags?.length ? `
      <div class="sheet-dtags">
        ${detail.displayTags.map(t => `<span class="sheet-dtag" style="cursor:pointer" onclick="if(confirm('책장 페이지로 이동할까요?'))alert('준비 중입니다.')">${t}</span>`).join("")}
      </div>
    ` : ""}

    <!-- 게임 설명 (한국어 소스만 표시) -->
    ${(detail.bgg.descriptionKo || detail.commentSource !== 'bgg') && detail.comment ? `
      <div class="sheet-section">
        <p class="sheet-section-label">게임 설명</p>
        <div class="sheet-desc-wrap">
          <p class="sheet-desc is-clamped" id="sheetDesc">${detail.comment.replace(/\n/g, '<br>')}</p>
          <button class="sheet-desc-toggle" id="sheetDescToggle" onclick="toggleSheetDesc(this)">+ 더보기</button>
        </div>
      </div>
    ` : ""}

    <!-- 메커니즘 · 테마 + 디자이너 -->
    ${mechanicsDisplay.length || categoriesDisplay.length || detail.bgg.designers?.length ? `
      <div class="sheet-info-group">
        ${mechanicsDisplay.length || categoriesDisplay.length ? `
          <div class="sheet-mechs-wrap" id="sheetMechsWrap">
            ${mechanicsDisplay.length ? `
              <div class="sheet-mechs-section">
                <span class="sheet-mechs-label">진행</span>
                <p class="sheet-mechs-text is-clamped">${mechanicsDisplay.join(" · ")}</p>
              </div>
            ` : ""}
            ${categoriesDisplay.length ? `
              <div class="sheet-mechs-section">
                <span class="sheet-mechs-label">테마</span>
                <p class="sheet-mechs-text is-clamped">${categoriesDisplay.join(" · ")}</p>
              </div>
            ` : ""}
            <button class="sheet-mechs-toggle" id="sheetMechsToggle" onclick="toggleSheetMechs(this)">+ 더보기</button>
          </div>
        ` : ""}
        ${detail.bgg.designers?.length ? `
          <div class="sheet-meta">
            <span class="sheet-meta-label">디자이너</span>
            <span>${detail.bgg.designers.join(", ")}</span>
          </div>
        ` : ""}
      </div>
    ` : ""}

    <!-- 플레이기록 · 코멘트 · 따봉 -->
    <div class="sheet-social-group">
      <div class="sheet-play-widget" id="sheetPlayWidget-${gameKey}"></div>
      <div class="sheet-reactions-footer">
        <div class="sheet-comments-area">
          <div class="sheet-comments-header">
            <span class="sheet-comments-count-label" id="sheetCommentsCount-${gameKey}">코멘트</span>
            <div class="sheet-comments-header-right">
              <button class="sheet-comment-write-btn" data-game-id="${gameKey}" onclick="onOpenCommentInput(this)" type="button">💬 남기기</button>
              <button class="sheet-comments-toggle-btn" onclick="toggleSheetComments('${gameKey}')" type="button">
                <span class="sheet-toggle-arrow" id="sheetCommentsArrow-${gameKey}">▾</span>
              </button>
            </div>
          </div>
          <div class="sheet-comments-list" id="sheetCommentsList-${gameKey}">
            <span class="sheet-comments-empty">코멘트가 없습니다</span>
          </div>
        </div>
        <div class="sheet-feedback-reactions">
          <button class="sheet-reaction-btn" id="sheetLikeBtn" data-game-id="${gameKey}" onclick="onSheetLike(this)">👍 0</button>
          <button class="sheet-reaction-btn" id="sheetDislikeBtn" data-game-id="${gameKey}" onclick="onSheetDislike(this)">👎 0</button>
        </div>
      </div>
    </div>

    <button class="sheet-view-all-btn" style="cursor:pointer;font-family:inherit" onclick="alert('준비 중입니다.')">📚 꽂혀있는 책장 보러가기 →</button>
    <a class="sheet-view-all-btn sheet-review-btn"
      href="${rootPath}pages/game/game-reviews.html?game=${encodeURIComponent(gameKey)}"
    >🎲 플레이기록 보러가기 →</a>

  `;

  gameSheet.classList.add('is-active');
  document.body.classList.add('sheet-open');

  if (window.CottageDB) window.CottageDB.trackView(gameKey);
  initStickyBar();
  initPlayWidget(gameKey).catch(() => {});
  initSheetDescToggle();
  initSheetMechsToggle();
  initSheetComments(gameKey).catch(() => {});
  initSheetLikes(gameKey).catch(() => {});

  // ?scroll=comments → 코멘트 섹션으로 스크롤
  const _scrollParam = new URLSearchParams(location.search).get('scroll');
  if (_scrollParam === 'comments') {
    setTimeout(() => {
      const panel = gameSheet.querySelector('.game-sheet-panel');
      const commentsEl = document.getElementById(`sheetCommentsList-${gameKey}`);
      if (panel && commentsEl) panel.scrollTo({ top: commentsEl.offsetTop - 20, behavior: 'smooth' });
    }, 400);
  }
}

function closeGameSheet(){
  if(!gameSheet){
    return;
  }

  const panel = gameSheet.querySelector('.game-sheet-panel');
  if (panel?._stickyCleanup) {
    panel._stickyCleanup();
    delete panel._stickyCleanup;
  }

  gameSheet.classList.remove('is-active');
  document.body.classList.remove('sheet-open');
  _currentSheetGameKey = null;
}

if(closeGameSheetButton){
  closeGameSheetButton.addEventListener('click', closeGameSheet);
}
if(closeGameSheetDim){
  closeGameSheetDim.addEventListener('click', closeGameSheet);
}


function toggleSheetDesc(btn){
  const desc = document.getElementById('sheetDesc');
  if(!desc) return;
  const clamped = desc.classList.toggle('is-clamped');
  btn.textContent = clamped ? '+ 더보기' : '- 접기';
}

function initSheetDescToggle(){
  const desc   = document.getElementById('sheetDesc');
  const toggle = document.getElementById('sheetDescToggle');
  if(!desc || !toggle) return;
  if(desc.scrollHeight <= desc.clientHeight){
    toggle.style.display = 'none';
  }
}

function toggleSheetMechs(btn) {
  const wrap = btn.closest('.sheet-mechs-wrap');
  if (!wrap) return;
  const texts = wrap.querySelectorAll('.sheet-mechs-text');
  const nowClamped = texts.length && texts[0].classList.contains('is-clamped');
  texts.forEach(t => t.classList.toggle('is-clamped', !nowClamped));
  btn.textContent = nowClamped ? '- 접기' : '+ 더보기';
}

function initSheetMechsToggle() {
  const toggle = document.getElementById('sheetMechsToggle');
  if (!toggle) return;
  const wrap = toggle.closest('.sheet-mechs-wrap');
  const texts = wrap ? wrap.querySelectorAll('.sheet-mechs-text') : [];
  let needsToggle = false;
  texts.forEach(t => { if (t.scrollHeight > t.clientHeight + 1) needsToggle = true; });
  if (!needsToggle) toggle.style.display = 'none';
}

function initStickyBar() {
  const panel = gameSheet?.querySelector('.game-sheet-panel');
  const bar   = document.getElementById('sheetStickyBar');
  if (!panel || !bar) return;
  function onScroll() {
    bar.classList.toggle('is-visible', panel.scrollTop > 80);
  }
  panel.addEventListener('scroll', onScroll);
  panel._stickyCleanup = () => panel.removeEventListener('scroll', onScroll);
}

function loginFromSheet() {
  if (typeof Kakao === 'undefined' || typeof kakaoLogin !== 'function') return;
  // 바텀시트가 열려 있으면 ?open= 파라미터로 복원 위치 보존
  if (_currentSheetGameKey) {
    const url = new URL(window.location.href);
    url.searchParams.set('open', _currentSheetGameKey);
    sessionStorage.setItem('kakao_login_return', url.toString());
    Kakao.Auth.authorize({
      redirectUri: window.location.origin + '/auth-callback.html',
      scope: 'profile_nickname,profile_image',
      throughTalk: false,
    });
  } else {
    kakaoLogin();
  }
}

function showLoginToast() {
  let toast = document.getElementById('loginToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'loginToast';
    toast.className = 'login-toast';
    toast.innerHTML = `
      <span>카카오 로그인 후 이용할 수 있어요</span>
      <button onclick="loginFromSheet()" type="button">로그인</button>
    `;
    document.body.appendChild(toast);
  }
  toast.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function requireLogin(action) {
  const user = window.getKakaoUser?.();
  if (user) { action(); return; }
  showLoginToast();
}

async function initSheetLikes(gameKey) {
  if (!window.CottageDB) return;
  const user = window.getKakaoUser?.();
  const userId = user ? String(user.id) : null;
  const [likeCount, dislikeCount, liked, disliked] = await Promise.all([
    window.CottageDB.getGameLikeCount(gameKey),
    window.CottageDB.getGameDislikeCount(gameKey),
    userId ? window.CottageDB.hasUserLiked(gameKey, userId) : false,
    userId ? window.CottageDB.hasUserDisliked(gameKey, userId) : false,
  ]);
  const likeBtn = document.getElementById('sheetLikeBtn');
  if (likeBtn) {
    likeBtn.textContent = `👍 ${likeCount}`;
    likeBtn.classList.toggle('is-active', liked);
  }
  const dislikeBtn = document.getElementById('sheetDislikeBtn');
  if (dislikeBtn) {
    dislikeBtn.textContent = `👎 ${dislikeCount}`;
    dislikeBtn.classList.toggle('is-active', disliked);
  }
}

async function onSheetLike(btn) {
  requireLogin(async () => {
    const user = window.getKakaoUser?.();
    if (!user || !window.CottageDB) return;
    const gameKey = btn?.dataset.gameId;
    if (!gameKey) return;
    const result = await window.CottageDB.toggleGameLike(gameKey, String(user.id));
    if (result.liked !== undefined) {
      const likeCount = await window.CottageDB.getGameLikeCount(gameKey);
      const likeBtn = document.getElementById('sheetLikeBtn');
      if (likeBtn) {
        likeBtn.textContent = `👍 ${likeCount}`;
        likeBtn.classList.toggle('is-active', result.liked);
      }
      if (result.liked) {
        const dislikeCount = await window.CottageDB.getGameDislikeCount(gameKey);
        const dislikeBtn = document.getElementById('sheetDislikeBtn');
        if (dislikeBtn) {
          dislikeBtn.textContent = `👎 ${dislikeCount}`;
          dislikeBtn.classList.remove('is-active');
        }
      }
    }
  });
}

async function onSheetDislike(btn) {
  requireLogin(async () => {
    const user = window.getKakaoUser?.();
    if (!user || !window.CottageDB) return;
    const gameKey = btn?.dataset.gameId;
    if (!gameKey) return;
    const result = await window.CottageDB.toggleGameDislike(gameKey, String(user.id));
    if (result.disliked !== undefined) {
      const dislikeCount = await window.CottageDB.getGameDislikeCount(gameKey);
      const dislikeBtn = document.getElementById('sheetDislikeBtn');
      if (dislikeBtn) {
        dislikeBtn.textContent = `👎 ${dislikeCount}`;
        dislikeBtn.classList.toggle('is-active', result.disliked);
      }
      if (result.disliked) {
        const likeCount = await window.CottageDB.getGameLikeCount(gameKey);
        const likeBtn = document.getElementById('sheetLikeBtn');
        if (likeBtn) {
          likeBtn.textContent = `👍 ${likeCount}`;
          likeBtn.classList.remove('is-active');
        }
      }
    }
  });
}
function onSheetComment() { requireLogin(() => {}); }

async function onCancelPlayRecord(gameKey, id) {
  if (!confirm('이 플레이 기록을 삭제할까요?')) return;
  if (!window.CottageDB) return;
  const result = await window.CottageDB.deleteGamePlay(id);
  if (!result.error) {
    removeMyPlayRecord(gameKey, id);
    await initPlayWidget(gameKey);
  }
}

function initSheetCommentGate() {
  // legacy — textarea removed, now using onOpenCommentInput gate
}

function getMyCommentIds() {
  try { return JSON.parse(localStorage.getItem('cottage_my_comments') || '[]'); } catch { return []; }
}
function saveMyCommentId(id) {
  const ids = getMyCommentIds();
  if (id && !ids.includes(id)) { ids.push(id); localStorage.setItem('cottage_my_comments', JSON.stringify(ids)); }
}
function removeMyCommentId(id) {
  localStorage.setItem('cottage_my_comments', JSON.stringify(getMyCommentIds().filter(x => x !== id)));
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const kst = new Date(d.getTime() + 9 * 3600000);
  const yy = String(kst.getUTCFullYear()).slice(2);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const day = ["일","월","화","수","목","금","토"][kst.getUTCDay()];
  return `${yy}.${mm}.${dd}(${day})`;
}

function toggleSheetComments(gameKey) {
  const list = document.getElementById(`sheetCommentsList-${gameKey}`);
  const arrow = document.getElementById(`sheetCommentsArrow-${gameKey}`);
  if (!list) return;
  const collapsed = list.classList.toggle('is-collapsed');
  list.dataset.open = collapsed ? "0" : "1";
  if (arrow) arrow.textContent = collapsed ? "▾" : "▴";
}

async function initSheetComments(gameKey) {
  const listEl = document.getElementById(`sheetCommentsList-${gameKey}`);
  const countEl = document.getElementById(`sheetCommentsCount-${gameKey}`);
  const arrowEl = document.getElementById(`sheetCommentsArrow-${gameKey}`);
  if (!listEl || !window.CottageDB) return;
  const comments = await window.CottageDB.getGameComments(gameKey);
  const toggleBtn = document.getElementById(`sheetCommentsArrow-${gameKey}`)?.closest('.sheet-comments-toggle-btn');
  if (!comments.length) {
    if (countEl) countEl.textContent = "코멘트";
    if (toggleBtn) toggleBtn.style.display = "none";
    listEl.classList.remove('is-collapsed', 'has-comments');
    listEl.innerHTML = '<span class="sheet-comments-empty">코멘트가 없습니다</span>';
    return;
  }
  if (countEl) countEl.textContent = `코멘트 ${comments.length}개`;
  if (toggleBtn) toggleBtn.style.display = comments.length > 1 ? "" : "none";
  // 이전에 열었으면 유지, 아니면 접힌 상태로 시작
  const wasOpen = listEl.dataset.open === "1";
  listEl.classList.toggle('is-collapsed', !wasOpen);
  const myIds = getMyCommentIds();
  const currentUserId = window.getKakaoUser?.()?.id || null;
  listEl.classList.add('has-comments');
  listEl.innerHTML = comments.map(c => {
    const txt = c.comment_text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const attr = c.comment_text.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // 로그인 시: user_id 기반 서버 판단만 사용 (다기기 일관성)
    // 비로그인 시: localStorage 폴백
    const mine = currentUserId
      ? (c.user_id ? String(c.user_id) === String(currentUserId) : false)
      : myIds.includes(c.id);
    const nick = c.nickname ? c.nickname.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '익명';
    const dateStr = formatDate(c.created_at);
    const meta = dateStr ? `${nick} · ${dateStr}` : nick;
    return `<div class="sheet-comment-item">
      <span class="sheet-comment-nickname">${meta}</span>
      <p class="sheet-comment-text">${txt}</p>
      ${mine ? `<div class="sheet-comment-actions">
        <button class="sheet-comment-edit-btn" data-id="${c.id}" data-game="${gameKey}" data-text="${attr}" onclick="onEditComment(this)" type="button">✏️</button>
        <button class="sheet-comment-delete-btn" onclick="onDeleteComment('${c.id}','${gameKey}')" type="button">✕</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

async function onDeleteComment(id, gameKey) {
  if (!confirm('이 코멘트를 삭제할까요?')) return;
  if (!window.CottageDB) return;
  const result = await window.CottageDB.deleteComment(id);
  if (!result.error) {
    removeMyCommentId(id);
    await initSheetComments(gameKey);
  }
}

function getOrCreateCommentModal() {
  let modal = document.getElementById('sheetCommentModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sheetCommentModal';
  modal.className = 'sheet-comment-modal';
  modal.innerHTML = `
    <div class="sheet-comment-modal-box">
      <p class="sheet-comment-modal-title">코멘트 남기기</p>
      <textarea class="sheet-comment-modal-input" id="sheetCommentModalInput" rows="4" placeholder="게임에 대한 코멘트를 남겨보세요"></textarea>
      <div class="sheet-comment-modal-actions">
        <button class="sheet-comment-form-cancel" onclick="onCloseCommentModal()">취소</button>
        <button class="sheet-comment-form-submit" id="sheetCommentModalSubmit" onclick="onSubmitCommentModal()">등록</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) onCloseCommentModal(); });
  document.body.appendChild(modal);
  return modal;
}

function onOpenCommentInput(btn) {
  const gameKey = btn.dataset.gameId;
  requireLogin(() => {
    const modal = getOrCreateCommentModal();
    modal.dataset.gameId = gameKey;
    delete modal.dataset.editId;
    const titleEl = modal.querySelector('.sheet-comment-modal-title');
    const submitEl = document.getElementById('sheetCommentModalSubmit');
    if (titleEl) titleEl.textContent = '코멘트 남기기';
    if (submitEl) submitEl.textContent = '등록';
    document.getElementById('sheetCommentModalInput').value = '';
    modal.style.display = 'flex';
    document.getElementById('sheetCommentModalInput')?.focus();
  });
}

function onEditComment(btn) {
  const modal = getOrCreateCommentModal();
  modal.dataset.gameId = btn.dataset.game;
  modal.dataset.editId = btn.dataset.id;
  const titleEl = modal.querySelector('.sheet-comment-modal-title');
  const submitEl = document.getElementById('sheetCommentModalSubmit');
  if (titleEl) titleEl.textContent = '코멘트 수정';
  if (submitEl) submitEl.textContent = '수정 완료';
  const input = document.getElementById('sheetCommentModalInput');
  if (input) input.value = btn.dataset.text;
  modal.style.display = 'flex';
  input?.focus();
}

function onCloseCommentModal() {
  const modal = document.getElementById('sheetCommentModal');
  if (modal) { modal.style.display = 'none'; delete modal.dataset.editId; }
}

async function onSubmitCommentModal() {
  const modal = document.getElementById('sheetCommentModal');
  const gameKey = modal?.dataset.gameId;
  const editId = modal?.dataset.editId;
  const input = document.getElementById('sheetCommentModalInput');
  const text = input?.value?.trim();
  if (!text || !gameKey) { input?.focus(); return; }
  if (!window.CottageDB) return;
  const submitBtn = document.getElementById('sheetCommentModalSubmit');
  if (submitBtn) submitBtn.disabled = true;
  let result;
  if (editId) {
    result = await window.CottageDB.updateComment(editId, text);
  } else {
    const _cu = window.getKakaoUser?.();
    result = await window.CottageDB.insertComment(gameKey, text, _cu?.nickname || null, _cu?.id || null);
    if (!result.error && result.id) saveMyCommentId(result.id);
  }
  if (!result.error) {
    onCloseCommentModal();
    await initSheetComments(gameKey);
  }
  if (submitBtn) submitBtn.disabled = false;
}

function goToShelf(shelfGroupId){
  if(!shelfGroupId) return;
  window.location.href =
    rootPath + 'pages/game/owned-games.html?shelf=' + encodeURIComponent(shelfGroupId);
}

// ── 손님 별점 위젯 ──────────────────────────────────────

function renderStarIcons(value) {
  return [1, 2, 3, 4, 5]
    .map((n) => `<span class="cottage-star-icon ${n <= value ? "filled" : ""}">${n <= value ? "★" : "☆"}</span>`)
    .join("");
}

function renderRatingWidget(widget, gameKey, ratingData, myRating) {
  const avgText = ratingData
    ? `평균 ${ratingData.avg}점 · ${ratingData.count}명`
    : "아직 별점이 없어요";

  if (myRating) {
    widget.innerHTML = `
      <div class="cottage-rating-result">
        <div class="cottage-rating-stars">${renderStarIcons(myRating)}</div>
        <p class="cottage-rating-info">내 별점 ${myRating}점 · ${avgText}</p>
      </div>`;
    return;
  }

  widget.innerHTML = `
    <div class="cottage-star-input" data-game-id="${gameKey}">
      ${[1, 2, 3, 4, 5]
        .map((n) => `<button class="cottage-star-btn" data-value="${n}" aria-label="${n}점">★</button>`)
        .join("")}
    </div>
    ${ratingData ? `<p class="cottage-rating-info">${avgText}</p>` : ""}`;
}

async function initCottageRatingWidget(gameKey) {
  const widget = document.querySelector(`.cottage-rating-widget[data-game-id="${gameKey}"]`);
  if (!widget) return;

  if (!window.CottageDB) {
    widget.style.display = "none";
    return;
  }

  window.CottageDB.trackView(gameKey);

  const [ratingData, myRating] = await Promise.all([
    window.CottageDB.getGameRating(gameKey),
    window.CottageDB.getMyRating(gameKey),
  ]);

  renderRatingWidget(widget, gameKey, ratingData, myRating);
}

// ── 플레이 기록 localStorage 헬퍼 ──────────────────────

function getMyPlayRecords(gameKey) {
  try {
    const d = localStorage.getItem(`cottage_play_records_${gameKey}`);
    if (d) return JSON.parse(d);
  } catch {}
  // 구형 단일 포맷 마이그레이션
  try {
    const old = localStorage.getItem(`cottage_played_${gameKey}`);
    if (old) {
      const p = JSON.parse(old);
      const rec = (p && typeof p === "object") ? p : { id: old !== "1" ? old : null };
      const arr = [rec];
      localStorage.setItem(`cottage_play_records_${gameKey}`, JSON.stringify(arr));
      localStorage.removeItem(`cottage_played_${gameKey}`);
      return arr;
    }
  } catch {
    const old = localStorage.getItem(`cottage_played_${gameKey}`);
    if (old) {
      const arr = [{ id: old !== "1" ? old : null }];
      localStorage.setItem(`cottage_play_records_${gameKey}`, JSON.stringify(arr));
      localStorage.removeItem(`cottage_played_${gameKey}`);
      return arr;
    }
  }
  return [];
}

function addMyPlayRecord(gameKey, rec) {
  const arr = getMyPlayRecords(gameKey);
  arr.push(rec);
  localStorage.setItem(`cottage_play_records_${gameKey}`, JSON.stringify(arr));
}

function removeMyPlayRecord(gameKey, id) {
  const arr = getMyPlayRecords(gameKey).filter(r => String(r.id) !== String(id));
  localStorage.setItem(`cottage_play_records_${gameKey}`, JSON.stringify(arr));
}

function togglePlayRecords(listId) {
  const list = document.getElementById(listId);
  const arrow = document.getElementById(`${listId}-arrow`);
  if (!list) return;
  const collapsed = list.classList.toggle('is-collapsed');
  if (arrow) arrow.textContent = collapsed ? "▾" : "▴";
}

// ── 플레이 위젯 ─────────────────────────────────────────

async function initPlayWidget(gameKey) {
  const widget = document.getElementById(`sheetPlayWidget-${gameKey}`);
  if (!widget) return;

  if (!window.CottageDB) {
    widget.style.display = "none";
    return;
  }

  const [playCount, highlights, allRecords] = await Promise.all([
    window.CottageDB.getGamePlayCount(gameKey),
    window.CottageDB.getPlayHighlights(gameKey),
    window.CottageDB.getGamePlayRecords(gameKey),
  ]);

  const myRecordIds = new Set(
    getMyPlayRecords(gameKey).map(r => String(r.id)).filter(Boolean)
  );
  const currentUserIdForPlay = window.getKakaoUser?.()?.id || null;

  function escH(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  let html = "";

  if (highlights.length) {
    html += `<div class="sheet-highlights">
      ${highlights.map(h => `<p class="sheet-highlight-item">✨ ${h.highlight_text}</p>`).join("")}
    </div>`;
  }

  const listId = `sheetAllRecords-${gameKey}`;

  // 플레이 박스 (헤더 + 기록 목록 하나의 카드)
  html += `<div class="sheet-play-box">`;
  html += `<div class="sheet-play-record">
    <span class="sheet-play-count">🎲 ${playCount}번 플레이됨</span>
    <div class="sheet-play-record-btns">
      <button class="sheet-played-btn" data-game-id="${gameKey}" type="button">+ 기록하기</button>
      ${allRecords.length > 1 ? `<button class="sheet-records-toggle-btn" onclick="togglePlayRecords('${listId}')" type="button"><span class="sheet-toggle-arrow" id="${listId}-arrow">▾</span></button>` : ""}
    </div>
  </div>`;

  // 전체 플레이 기록 목록 (접기/펼치기)
  if (allRecords.length) {
    html += `<div class="sheet-my-records-list is-collapsed" id="${listId}">
      ${allRecords.map(r => {
        const isMine = (currentUserIdForPlay && r.user_id && String(r.user_id) === String(currentUserIdForPlay))
          || (r.id && myRecordIds.has(String(r.id)));
        const showNick = !r.player_names && r.nickname;
        const dateStr = r.played_at
          ? new Date(r.played_at + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
          : formatDate(r.created_at);
        const groupLabel = r.group_name
          ? `<a class="sheet-history-link" href="./club/club-history.html?group=${encodeURIComponent(r.group_name)}">${escH(r.group_name)}</a>`
          : null;
        const header = [showNick ? escH(r.nickname) : null, dateStr, groupLabel].filter(Boolean).join(" · ");
        const hasDetail = r.player_count || r.player_names || r.play_time_min || r.score_note;
        return `<div class="sheet-my-record-item">
          <div class="sheet-record-info">
            ${header ? `<span class="sheet-record-nickname">${header}</span>` : ""}
            ${hasDetail ? `<div class="sheet-play-info">
              ${r.player_count ? `<span class="sheet-play-info-tag">👥 ${r.player_count}명</span>` : ""}
              ${r.player_names ? `<span class="sheet-play-info-tag">🎮 ${escH(r.player_names)}</span>` : ""}
              ${r.play_time_min ? `<span class="sheet-play-info-tag">⏱ ${r.play_time_min}분</span>` : ""}
              ${r.score_note ? `<span class="sheet-play-info-tag">🏆 ${escH(r.score_note)}</span>` : ""}
            </div>` : ""}
          ${r.review_text ? `<p class="sheet-record-review">${escH(r.review_text)}</p>` : ""}
          </div>
          ${isMine ? `<div class="sheet-play-record-actions">
            <button class="sheet-play-edit-btn"
              data-game="${gameKey}" data-id="${r.id}"
              data-count="${r.player_count || ''}" data-names="${escH(r.player_names || '')}"
              data-time="${r.play_time_min || ''}" data-score="${escH(r.score_note || '')}"
              data-group="${escH(r.group_name || '')}" data-played-at="${r.played_at || ''}"
              type="button">수정</button>
            <button class="sheet-play-cancel-btn" onclick="onCancelPlayRecord('${gameKey}','${r.id}')" type="button">취소</button>
          </div>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  html += `</div>`; // .sheet-play-box 닫기

  const wasExpanded = (() => {
    const prev = document.getElementById(listId);
    return prev ? !prev.classList.contains('is-collapsed') : false;
  })();

  widget.innerHTML = html;

  if (wasExpanded) {
    const newList = document.getElementById(listId);
    const newArrow = document.getElementById(`${listId}-arrow`);
    if (newList) newList.classList.remove('is-collapsed');
    if (newArrow) newArrow.textContent = '▴';
  }

  widget.querySelectorAll('.sheet-play-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => onOpenEditPlayModal(
      btn.dataset.game, btn.dataset.id,
      Number(btn.dataset.count) || 0,
      btn.dataset.names,
      Number(btn.dataset.time) || 0,
      btn.dataset.score,
      btn.dataset.group || '',
      btn.dataset.playedAt || ''
    ));
  });
}

// 플레이 위젯 클릭 이벤트
if (gameSheetContent) {
  gameSheetContent.addEventListener("click", function (e) {
    const playBtn = e.target.closest(".sheet-played-btn");
    if (playBtn) {
      requireLogin(() => onOpenPlayModal(playBtn.dataset.gameId));
      return;
    }
  });
}


// ── 플레이 기록 모달 ─────────────────────────────────────

function getOrCreatePlayModal() {
  let modal = document.getElementById('sheetPlayModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sheetPlayModal';
  modal.className = 'sheet-play-modal';
  modal.innerHTML = `
    <div class="sheet-play-modal-box">
      <p class="sheet-play-modal-title">플레이 기록하기</p>
      <p class="sheet-play-modal-label">몇 명이서 했나요?</p>
      <div class="sheet-player-select-btns" id="sheetPlayModalCountBtns">
        ${[1,2,3,4,5,6,7,8].map(n => `<button class="sheet-player-select-btn" data-count="${n}" type="button">${n}명</button>`).join("")}
      </div>
      <div class="sheet-play-modal-details" id="sheetPlayModalDetails" style="display:none;">
        <input class="sheet-play-detail-input" id="sheetPlayModalNames" type="text" placeholder="플레이어 이름 (선택, 예: 김철수, 이영희)" maxlength="100">
        <div class="sheet-play-detail-row">
          <input class="sheet-play-detail-input is-half" id="sheetPlayModalTime" type="number" placeholder="플레이 시간(분)" min="1" max="999">
          <input class="sheet-play-detail-input is-half" id="sheetPlayModalScore" type="text" placeholder="점수 메모 (선택)" maxlength="100">
        </div>
      </div>
      <div class="sheet-play-date-wrap">
        <span class="sheet-play-date-lbl">📅 플레이 날짜</span>
        <input class="sheet-play-detail-input" id="sheetPlayModalDate" type="date">
      </div>
      <label class="sheet-play-group-check-label">
        <input type="checkbox" id="sheetPlayModalGroupCheck">
        <span>모임 기록으로 남기기</span>
      </label>
      <div class="sheet-play-group-name-wrap" id="sheetPlayModalGroupNameWrap" style="display:none;">
        <input class="sheet-play-detail-input" id="sheetPlayModalGroupName"
          type="text" placeholder="모임명 (예: 코티지동호회)" list="sheetPlayGroupNameList" maxlength="50" autocomplete="off">
        <datalist id="sheetPlayGroupNameList"></datalist>
      </div>
      <div class="sheet-play-modal-actions">
        <button class="sheet-play-modal-cancel" onclick="onClosePlayModal()" type="button">취소</button>
        <button class="sheet-play-modal-skip" onclick="onSubmitPlayModal(true)" type="button">건너뛰기</button>
        <button class="sheet-play-modal-submit" id="sheetPlayModalSubmit" onclick="onSubmitPlayModal(false)" type="button">기록하기</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) onClosePlayModal(); });
  modal.querySelector('#sheetPlayModalCountBtns').addEventListener('click', e => {
    const btn = e.target.closest('.sheet-player-select-btn');
    if (!btn) return;
    modal.querySelectorAll('.sheet-player-select-btn').forEach(b => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    modal.dataset.count = btn.dataset.count;
    document.getElementById('sheetPlayModalDetails').style.display = 'block';
  });
  modal.querySelector('#sheetPlayModalGroupCheck').addEventListener('change', e => {
    document.getElementById('sheetPlayModalGroupNameWrap').style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) document.getElementById('sheetPlayModalGroupName').value = '';
  });
  document.body.appendChild(modal);

  if (window.CottageDB) {
    window.CottageDB.getGroupNames().then(names => {
      const dl = document.getElementById('sheetPlayGroupNameList');
      if (dl) dl.innerHTML = names.map(n => `<option value="${n}">`).join('');
    });
  }

  return modal;
}

function onOpenPlayModal(gameKey) {
  const modal = getOrCreatePlayModal();
  modal.dataset.gameId = gameKey;
  delete modal.dataset.count;
  modal.querySelectorAll('.sheet-player-select-btn').forEach(b => b.classList.remove('is-selected'));
  document.getElementById('sheetPlayModalDetails').style.display = 'none';
  document.getElementById('sheetPlayModalNames').value = '';
  document.getElementById('sheetPlayModalTime').value = '';
  document.getElementById('sheetPlayModalScore').value = '';
  const groupCheck = document.getElementById('sheetPlayModalGroupCheck');
  if (groupCheck) { groupCheck.checked = false; }
  document.getElementById('sheetPlayModalGroupNameWrap').style.display = 'none';
  document.getElementById('sheetPlayModalGroupName').value = '';
  const dateInput = document.getElementById('sheetPlayModalDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
    dateInput.max = new Date().toISOString().split('T')[0];
  }
  modal.style.display = 'flex';
}

function onClosePlayModal() {
  const modal = document.getElementById('sheetPlayModal');
  if (!modal) return;
  modal.style.display = 'none';
  delete modal.dataset.editId;
  const title = modal.querySelector('.sheet-play-modal-title');
  const submit = document.getElementById('sheetPlayModalSubmit');
  const skipBtn = modal.querySelector('.sheet-play-modal-skip');
  if (title) title.textContent = '플레이 기록하기';
  if (submit) submit.textContent = '기록하기';
  if (skipBtn) skipBtn.style.display = '';
}

function onOpenEditPlayModal(gameKey, recordId, playerCount, playerNames, playTimeMin, scoreNote, groupName, playedAt) {
  const modal = getOrCreatePlayModal();
  modal.dataset.gameId = gameKey;
  modal.dataset.editId = recordId;
  delete modal.dataset.count;

  modal.querySelectorAll('.sheet-player-select-btn').forEach(b => b.classList.remove('is-selected'));
  if (playerCount) {
    const btn = modal.querySelector(`.sheet-player-select-btn[data-count="${playerCount}"]`);
    if (btn) {
      btn.classList.add('is-selected');
      modal.dataset.count = String(playerCount);
    }
  }
  document.getElementById('sheetPlayModalDetails').style.display = 'block';

  document.getElementById('sheetPlayModalNames').value = playerNames || '';
  document.getElementById('sheetPlayModalTime').value = playTimeMin || '';
  document.getElementById('sheetPlayModalScore').value = scoreNote || '';

  const groupCheck = document.getElementById('sheetPlayModalGroupCheck');
  const groupNameInput = document.getElementById('sheetPlayModalGroupName');
  const groupWrap = document.getElementById('sheetPlayModalGroupNameWrap');
  if (groupName) {
    if (groupCheck) groupCheck.checked = true;
    if (groupWrap) groupWrap.style.display = 'block';
    if (groupNameInput) groupNameInput.value = groupName;
  } else {
    if (groupCheck) groupCheck.checked = false;
    if (groupWrap) groupWrap.style.display = 'none';
    if (groupNameInput) groupNameInput.value = '';
  }

  const dateInput = document.getElementById('sheetPlayModalDate');
  if (dateInput) {
    dateInput.value = playedAt || new Date().toISOString().split('T')[0];
    dateInput.max = new Date().toISOString().split('T')[0];
  }

  const errEl = modal.querySelector('.sheet-play-modal-err');
  if (errEl) errEl.textContent = '';

  const title = modal.querySelector('.sheet-play-modal-title');
  const submit = document.getElementById('sheetPlayModalSubmit');
  const skipBtn = modal.querySelector('.sheet-play-modal-skip');
  if (title) title.textContent = '플레이 기록 수정';
  if (submit) submit.textContent = '수정하기';
  if (skipBtn) skipBtn.style.display = 'none';

  modal.style.display = 'flex';
}

async function onSubmitPlayModal(skip) {
  const modal = document.getElementById('sheetPlayModal');
  const gameKey = modal?.dataset.gameId;
  const editId = modal?.dataset.editId || null;
  if (!gameKey || !window.CottageDB) return;
  const count = parseInt(modal?.dataset.count || "0", 10);
  let playerNames = null, playTimeMin = null, scoreNote = null;
  if (!skip) {
    playerNames = document.getElementById('sheetPlayModalNames')?.value?.trim() || null;
    const tv = document.getElementById('sheetPlayModalTime')?.value;
    playTimeMin = tv ? parseInt(tv, 10) : null;
    scoreNote = document.getElementById('sheetPlayModalScore')?.value?.trim() || null;
  }
  const groupCheck = document.getElementById('sheetPlayModalGroupCheck');
  const groupName = (groupCheck?.checked
    ? document.getElementById('sheetPlayModalGroupName')?.value?.trim()
    : null) || null;
  const playedAt = document.getElementById('sheetPlayModalDate')?.value || null;
  const submitBtn = document.getElementById('sheetPlayModalSubmit');
  if (submitBtn) submitBtn.disabled = true;

  if (editId) {
    const result = await window.CottageDB.updateGamePlay(editId, {
      player_count: count || null,
      player_names: playerNames,
      play_time_min: playTimeMin,
      score_note: scoreNote,
      group_name: groupName,
      played_at: playedAt,
    });
    if (!result?.error) {
      onClosePlayModal();
      await initPlayWidget(gameKey);
    } else {
      const errEl = modal.querySelector('.sheet-play-modal-err') || (() => {
        const el = document.createElement('p');
        el.className = 'sheet-play-modal-err';
        el.style.cssText = 'color:#e03;font-size:12px;margin:6px 0 0;text-align:center';
        modal.querySelector('.sheet-play-modal-actions').before(el);
        return el;
      })();
      errEl.textContent = '수정에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
  } else {
    const _u = window.getKakaoUser?.();
    const playResult = await window.CottageDB.recordGamePlay(
      gameKey, count, playerNames, playTimeMin, scoreNote,
      _u?.nickname || null, _u?.id || null, groupName, playedAt
    );
    if (!playResult?.error) {
      addMyPlayRecord(gameKey, {
        id: playResult?.id || null,
        playerCount: count || null,
        playerNames: playerNames || null,
        playTimeMin: playTimeMin || null,
        scoreNote: scoreNote || null,
      });
      onClosePlayModal();
      await initPlayWidget(gameKey);
    }
  }
  if (submitBtn) submitBtn.disabled = false;
}

/* =========================
   # RECOMMEND MODAL ELEMENTS
========================= */


/* =========================
   # PAGE SESSION TRACKER
   페이지별 체류 시간 + 유입 경로 기록 → page_sessions 테이블
========================= */
(function() {
  const PAGE_LABELS = {
    '/': '메인',
    '/index.html': '메인',
    '/pages/game/owned-games.html': '게임 목록',
    '/pages/game/game-reviews.html': '플레이 기록',
    '/pages/game/game-location.html': '게임 위치',
    '/pages/info/about.html': '코티지보드 소개',
    '/pages/info/price-rules.html': '가격 & 규칙',
    '/pages/club/club.html': '동호회 소개',
    '/pages/club/club-history.html': '모임 기록',
    '/pages/club/club-intro.html': '회원 자기소개',
    '/pages/club/club-schedule.html': '일정 투표',
    '/pages/admin/requests.html': '요청하기',
    '/pages/admin/requests-admin.html': '관리자',
  };

  const _entryTime = Date.now();
  const _page = PAGE_LABELS[location.pathname] || location.pathname;
  const _ref = document.referrer
    ? (PAGE_LABELS[new URL(document.referrer).pathname] || new URL(document.referrer).pathname)
    : '';

  function _getUid() {
    try { return JSON.parse(localStorage.getItem('kakao_user') || 'null')?.id || null; } catch(_) { return null; }
  }
  function _getSk() {
    let k = localStorage.getItem('cottage_session_id');
    if (!k) { k = Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem('cottage_session_id', k); }
    return k;
  }

  let _sent = false;
  function _send() {
    if (_sent) return;
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg?.url || !cfg?.anonKey) return;
    const dur = Math.round((Date.now() - _entryTime) / 1000);
    if (dur < 3) return;
    _sent = true;
    fetch(cfg.url + '/rest/v1/page_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        page: _page,
        referrer: _ref || null,
        user_id: _getUid(),
        session_key: _getSk(),
        duration_sec: dur,
        entered_at: new Date(_entryTime).toISOString(),
      }),
      keepalive: true,
    }).catch(() => {});
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') _send(); });
  window.addEventListener('pagehide', _send);
})();

