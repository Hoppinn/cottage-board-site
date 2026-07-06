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
  const el = document.querySelector('script[src$="assets/js/script-nav.js"]');
  if(!el) return './';
  return el.src.replace(/assets\/js\/script\.js(\?.*)?$/, '');
})();
/* =========================
   # MOBILE MENU
========================= */

const menuToggle =
  document.querySelector('#menuToggle');

const mobileMenu =
  document.querySelector('#mobileMenu');


function resetMenuGroups(){
  // 잔류 inline style 및 preview-active 초기화
  document.querySelectorAll('.header-menu a').forEach(l => {
    l.style.removeProperty('background');
    l.style.removeProperty('color');
    l.style.removeProperty('font-weight');
    l.style.removeProperty('border-radius');
    l.classList.remove('preview-active');
  });

  document.querySelectorAll('.menu-group').forEach(g=>{
    g.classList.remove('is-open');
  });

  // index.html: 섹션별 스크롤 표시
  const isIndex = /\/(index\.html)?$/.test(location.pathname);
  const halfH = window.innerHeight * 0.5;

  // preview 섹션 독립 체크 — 둘 다 보이면 둘 다 점+그룹 열림
  let previewShown = false;
  if (isIndex) {
    [
      { id: 'recent-play', match: 'game-reviews.html' },
      { id: 'meeting',     match: 'club.html' },
    ].forEach(({ id, match }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inView = r.top < window.innerHeight && r.bottom > 0;
      if (r.top < halfH && r.bottom > 0) previewShown = true; // recommend 해제는 상단 50% 진입 시만
      if (inView) {
        const link = document.querySelector(`.header-menu a[href*="${match}"]`);
        if (link) {
          link.classList.add('preview-active');
          const group = link.closest('.menu-group');
          if (group) group.classList.add('is-open');
        }
      }
    });
  }

  // 추천: preview 섹션이 하나라도 보이면 해제, 아니면 스크롤 기준
  const recEl = document.getElementById('recommend');
  const recommendLink = document.querySelector('#openRecommendMenu');
  if (recEl && recommendLink) {
    const isRecActive = !previewShown && recEl.getBoundingClientRect().top < halfH;
    recommendLink.classList.toggle('is-current', isRecActive);
  }

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

// 메뉴 열린 상태에서 스크롤 시 실시간 active 갱신
function refreshMenuActive() {
  if (!mobileMenu || !mobileMenu.classList.contains('active')) return;

  const halfH = window.innerHeight * 0.5;
  const isIndex = /\/(index\.html)?$/.test(location.pathname);

  // preview-active 초기화
  document.querySelectorAll('.header-menu a.preview-active').forEach(l => l.classList.remove('preview-active'));

  // recommend is-current + 인라인 스타일 초기화
  const recommendLink = document.querySelector('#openRecommendMenu');
  if (recommendLink) {
    recommendLink.classList.remove('is-current');
    ['background','color','font-weight','border-radius'].forEach(p => recommendLink.style.removeProperty(p));
  }

  // 그룹 닫기 후 재계산
  document.querySelectorAll('.menu-group').forEach(g => g.classList.remove('is-open'));

  let previewShown = false;
  if (isIndex) {
    [
      { id: 'recent-play', match: 'game-reviews.html' },
      { id: 'meeting',     match: 'club.html' },
    ].forEach(({ id, match }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inView = r.top < window.innerHeight && r.bottom > 0;
      if (r.top < halfH && r.bottom > 0) previewShown = true; // recommend 해제는 상단 50% 진입 시만
      if (inView) {
        const link = document.querySelector(`.header-menu a[href*="${match}"]`);
        if (link) {
          link.classList.add('preview-active');
          const group = link.closest('.menu-group');
          if (group) group.classList.add('is-open');
        }
      }
    });
  }

  const recEl = document.getElementById('recommend');
  if (recEl && recommendLink) {
    const isRecActive = !previewShown && recEl.getBoundingClientRect().top < halfH;
    recommendLink.classList.toggle('is-current', isRecActive);
    if (isRecActive) {
      recommendLink.style.setProperty('background', '#7a4828', 'important');
      recommendLink.style.setProperty('color', '#fff', 'important');
      recommendLink.style.setProperty('font-weight', '900', 'important');
      recommendLink.style.setProperty('border-radius', '8px', 'important');
      const group = recommendLink.closest('.menu-group');
      if (group) group.classList.add('is-open');
    }
  }

  // 현재 페이지 is-current 링크 — 그룹 유지 + 인라인 스타일 동기화
  const currentLink = document.querySelector('.header-menu a.is-current');
  if (currentLink) {
    document.querySelectorAll('.header-menu a').forEach(l => {
      if (l !== currentLink && l !== recommendLink) {
        l.style.removeProperty('background');
        l.style.removeProperty('color');
        l.style.removeProperty('font-weight');
        l.style.removeProperty('border-radius');
      }
    });
    currentLink.style.setProperty('background', '#7a4828', 'important');
    currentLink.style.setProperty('color', '#fff', 'important');
    currentLink.style.setProperty('font-weight', '900', 'important');
    currentLink.style.setProperty('border-radius', '8px', 'important');
    const activeGroup = currentLink.closest('.menu-group');
    if (activeGroup) activeGroup.classList.add('is-open');
  }
}

window.addEventListener('scroll', refreshMenuActive, { passive: true });

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
  const currentHash = location.hash;
  const allLinks = Array.from(document.querySelectorAll('.header-menu a'));
  const hashMatchExists = allLinks.some(l=>{
    const raw = l.getAttribute('href') || '';
    if(raw === '#' || raw.startsWith('#')) return false;
    const u = new URL(l.href, location.href);
    return u.pathname.replace(/\/$/, '') === currentPath && u.hash && u.hash === currentHash;
  });
  allLinks.forEach(link=>{
    const rawHref = link.getAttribute('href') || '';
    if(rawHref === '#' || rawHref.startsWith('#')) return;
    const u = new URL(link.href, location.href);
    const linkPath = u.pathname.replace(/\/$/, '');
    const linkHash = u.hash;
    const matches = linkHash
      ? linkPath === currentPath && linkHash === currentHash
      : linkPath === currentPath && !hashMatchExists;
    if(matches){
      link.classList.add('is-current');
      const group = link.closest('.menu-group');
      if(group) group.classList.add('is-open');
    }
  });

  // 정확한 매칭 없으면 같은 디렉토리 링크를 current로 표시 (서브페이지 지원)
  if(!document.querySelector('.header-menu a.is-current')){
    const currentDir = currentPath.replace(/\/[^/]+$/, '/');
    allLinks.forEach(link=>{
      const rawHref = link.getAttribute('href') || '';
      if(rawHref === '#' || rawHref.startsWith('#')) return;
      const u = new URL(link.href, location.href);
      if(u.hash) return; // hash 링크는 디렉토리 매칭 제외
      const linkDir = u.pathname.replace(/\/[^/]+$/, '/');
      if(linkDir === currentDir){
        link.classList.add('is-current');
        const group = link.closest('.menu-group');
        if(group) group.classList.add('is-open');
      }
    });
  }
})();

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
    murder: ["murder_mystery"],
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
            <strong>${detail.title}</strong>
            ${getAvailBadgeHtml(game)}
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
    ensureGameSheet();
    openGameSheet(gameKey);
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
   # PAGE SESSION TRACKER
   페이지별 체류 시간 + 유입 경로 기록 → page_sessions 테이블
========================= */
(function() {
  const PAGE_LABELS = window.COTTAGE_PAGE_LABELS_BY_PATH || {};

  const _entryTime = Date.now();
  const _page = PAGE_LABELS[location.pathname] || location.pathname;
  const _ref = document.referrer
    ? (PAGE_LABELS[new URL(document.referrer).pathname] || new URL(document.referrer).pathname)
    : '';
  const ADMIN_UID = '4916417947';

  function _getUid() {
    try { return JSON.parse(localStorage.getItem('kakao_user') || 'null')?.id || null; } catch(_) { return null; }
  }
  function _isLocalhost() {
    return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  }
  function _isAdminVisitor() {
    try { return !!localStorage.getItem('cottage_is_admin') || String(_getUid() || '') === ADMIN_UID; } catch(_) { return false; }
  }
  function _shouldSkipSessionTracking() {
    return _isLocalhost() || _isAdminVisitor();
  }
  if (_shouldSkipSessionTracking()) return;

  function _getSk() {
    let k = localStorage.getItem('cottage_session_id');
    if (!k) { k = Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem('cottage_session_id', k); }
    return k;
  }

  let _sent = false;
  function _send() {
    if (_sent) return;
    if (_shouldSkipSessionTracking()) return;
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

