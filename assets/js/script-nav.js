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
  return el.src.replace(/assets\/js\/script-nav\.js(\?.*)?$/, '');
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
      if (r.top < halfH && r.bottom > 0) previewShown = true; // recommend 해제는 상단 50% 진입 시만
      // 화면에 걸쳐 있기만 한 이전 섹션은 활성으로 보지 않는다. 화면 중앙을
      // 지나는 섹션 하나만 점을 표시해, 모임으로 내려갔을 때 플레이 기록 점이
      // 함께 남지 않게 한다.
      if (r.top < halfH && r.bottom > halfH) {
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
      if (r.top < halfH && r.bottom > 0) previewShown = true; // recommend 해제는 상단 50% 진입 시만
      if (r.top < halfH && r.bottom > halfH) {
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

    // 보드 패널·서브시트는 메뉴 위에 뜬 별개 레이어라 "메뉴 밖 클릭"으로 치지 않는다.
    // 종전엔 패널의 ✕ 클릭이 여기로 버블링돼 메뉴를 닫았고, kakao-auth가 30ms 뒤에 다시 여는
    // 우회책(_restoreMenuExpanded, 2026-07-18 제거)으로 메웠다 → 닫혔다 다시 열리는 깜빡임의 원인.
    // 이 제외가 근본 수정이라 그 우회책은 완전 no-op이 돼 제거했다.
    const clickedInsideBoard = !!event.target.closest?.('.profile-panel, .profile-subsheet');

    if(
      !clickedInsideMenu &&
      !clickedMenuButton &&
      !clickedInsideBoard
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
    GameView.normalizeLevelValue(levelValue);

  const recommend =
    GameView?.getRecommendData(game);

  const difficultyId =
    recommend?.difficultyId ||
    GameView.getDifficultyData(recommend?.difficultyWeight).id;

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
        String(detail.bggTitle || "");

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
   # PAGE SESSION TRACKER (+ 활성 뷰 세그먼트, 2026-08-18)
   페이지/뷰별 체류 시간 + 유입 경로 기록 → page_sessions 테이블
   🚨 이 파일이 page_sessions에 **실제 지속시간(duration_sec>0)을 쓰는 유일한 writer**다
      (승인조건, PLAN_active_view_tracking.md). supabase-client.js의 _syncTimeToDBNow는
      profiles.today_seconds/total_minutes만 갱신하고 page_sessions는 더 이상 안 건드린다 —
      예전엔 두 곳이 같이 써서 한 방문이 2행 되던 사고(발견 ⑧, 로그인 쪽)가 있었다.
      ⚠️ 비로그인 방문자의 `_startAnonHeartbeat`(supabase-client.js)가 넣는 duration_sec=0
      "입장 마커" 행은 별개다 — 명 집계용으로 의도적으로 유지되는 기존 구조(발견 ⑧ 문서에
      이미 기록됨)라 이번 변경과 무관, 안 건드림. 새 **지속시간** writer가 필요해도 이 파일을
      확장할 것, 별도 경로 금지.
========================= */
(function() {
  // page_sessions.page에는 **슬러그**를 넣는다(#14, 2026-07-20). 예전엔 한글 라벨을 넣어
  // heartbeat 경로(슬러그)와 갈라졌고, 라벨을 개명할 때마다 같은 페이지가 새 버킷으로
  // 쪼개졌다(`가격 & 규칙` 174행 ↔ `가격·이용안내` 65행). 표시 라벨은 읽는 쪽에서 붙인다.
  const _basePage = (window.COTTAGE_PAGE_SLUG || (p => p))(location.pathname);
  // page_sessions.referrer에는 **유입 소스**를 넣는다(#28, 2026-07-21). 예전엔 여기서 referrer
  // 페이지의 내부 라벨/경로를 넣었는데(`메인`·`/pages/info/guide.html`), 그 컬럼을 읽는
  // categorizeRef는 호스트·utm 토큰을 기대하므로 전부 null → 「직접 방문」으로 접혔다.
  // 규칙은 supabase-client.js가 SSOT(utm_source > 외부 호스트 > 당일 last-touch > null).
  // 사본을 만들지 않는다 — #14가 정확히 "같은 테이블에 두 규칙"으로 난 병이었다.
  const _ref = window.COTTAGE_SESSION_REF ?? '';
  const ADMIN_UID = '4916417947';

  function _getUid() {
    // localStorage 손상 시 "로그인 안 함"으로 처리 — 트래킹 귀속만 영향받는 낮은 위험
    try { return JSON.parse(localStorage.getItem('kakao_user') || 'null')?.id || null; } catch(_) { return null; }
  }
  function _isLocalhost() {
    return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  }
  function _isAdminVisitor() {
    // localStorage 접근 실패 시 "관리자 아님"으로 처리 — 안전한 쪽으로 fail(트래킹을 계속 켜둠)
    try { return !!localStorage.getItem('cottage_is_admin') || String(_getUid() || '') === ADMIN_UID; } catch(_) { return false; }
  }
  // index.html은 플래너·기록 모달을 iframe으로 **미리 로드**한다. 각 iframe이 이 파일을 다시
  // 로드하므로, 프레임을 거르지 않으면 홈 방문 1회가 page_sessions 3행이 된다(#24와 같은 병).
  // 실측(2026-07-21): 홈 방문마다 index·game-reviews·club-schedule 3행이 같은 초에 함께 들어와
  // 있었다 — 사용자가 그 두 페이지를 연 적이 없는데도.
  // ⚠️ supabase-client.js에도 **같은 이름의 함수**가 있고 그쪽은 `_isEmbeddedFrame()`을 포함한다.
  //    #24를 고칠 때 그 파일만 고쳐져 이 사본이 남았다 — 이름이 같아 고쳐진 것처럼 보이던 자리다.
  //    가르는 기준은 그 파일에 적힌 그대로다: "iframe 안에서 일어나도 진짜인가?"
  //    체류·방문은 사람·탭 단위라 부모 1회가 맞고, 사용자 행동(trackEvent)은 프레임을 안 본다.
  // 🚨 iframe 자신은 이 조기 return 때문에 window.pushActiveView/popActiveView가 아예
  //    정의되지 않는다(의도됨) — iframe은 postMessage로 부모에게 알리고, 부모가 대신
  //    push/pop을 호출한다(PLAN_active_view_tracking.md 3차 배선 완료).
  function _isEmbeddedFrame() {
    try { return window.top !== window.self; }
    catch (_) { return true; } // 크로스오리진 차단 = 남의 프레임 안 = 추적 안 함
  }
  function _shouldSkipSessionTracking() {
    return _isLocalhost() || _isAdminVisitor() || _isEmbeddedFrame();
  }
  if (_shouldSkipSessionTracking()) return;

  function _getSk() {
    let k = localStorage.getItem('cottage_session_id');
    if (!k) { k = Date.now().toString(36) + Math.random().toString(36).slice(2); localStorage.setItem('cottage_session_id', k); }
    return k;
  }

  // ── 활성 뷰 세그먼트 상태 ──────────────────────────────────────
  // _currentLabel: 지금 시간이 귀속되는 중인 라벨(기본 _basePage, push되면 그 key로 전환)
  // _segStart: 현재 세그먼트가 시작된 시각(ms) — 다음 flush의 entered_at·duration 기준
  // _stack: 열려 있는 뷰들의 LIFO. {key, token} — token은 중복/어긋난 pop을 무시하기 위한 식별자
  // _finalized: pagehide 이후 true — 이후 push/pop/visibilitychange는 전부 무시(마지막 flush 보존)
  let _currentLabel = _basePage;
  let _segStart = Date.now();
  const _stack = [];
  let _tokenSeq = 0;
  let _finalized = false;

  function _sendRow(page, dur, enteredAtMs) {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg?.url || !cfg?.anonKey) return;
    fetch(cfg.url + '/rest/v1/page_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        page,
        referrer: _ref || null,
        user_id: _getUid(),
        session_key: _getSk(),
        duration_sec: dur,
        entered_at: new Date(enteredAtMs).toISOString(),
      }),
      keepalive: true,
    }).catch(() => {});
  }

  // 지금 세그먼트를 flush하고 라벨을 nextLabel로 전환. 같은 값을 주면 "재시작"만 하는
  // 것 — visibilitychange:hidden이 이 방식으로 스택은 안 건드리고 시간만 끊어 보낸다.
  // 3초 미만 세그먼트는 기존 _send()의 문턱을 그대로 유지해 무시(노이즈 제거).
  function _flushAndSwitch(nextLabel) {
    if (_finalized) return;
    const enteredAtMs = _segStart;
    const dur = Math.round((Date.now() - _segStart) / 1000);
    _segStart = Date.now();
    const prevLabel = _currentLabel;
    _currentLabel = nextLabel;
    if (dur >= 3) _sendRow(prevLabel, dur, enteredAtMs);
  }

  // 열림 — 지금까지 분을 이전 라벨로 보내고 key로 전환, 스택에 push. 반환하는 token을
  // 호출부가 **자기 스코프 변수**에 보관했다가 닫을 때 popActiveView(token)으로 넘겨야
  // 한다(전역 변수 하나를 여러 시트가 공유하면 교차 오염됨).
  window.pushActiveView = function (key) {
    if (_shouldSkipSessionTracking() || _finalized || !key) return null;
    _flushAndSwitch(key);
    const token = ++_tokenSeq;
    _stack.push({ key, token });
    return token;
  };

  // 닫힘 — token이 지금 스택 맨 위와 일치할 때만 pop한다. 같은 시트가 close·배경클릭·
  // ESC 등 여러 경로로 겹쳐 두 번 불려도, 두 번째 호출의 token은 이미 스택에서 빠진
  // 뒤라 조용히 무시된다(경고만 로그) — 스택이 절대 안 무너진다.
  window.popActiveView = function (token) {
    if (_shouldSkipSessionTracking() || _finalized) return;
    const top = _stack[_stack.length - 1];
    if (!top || top.token !== token) {
      console.warn('[popActiveView] stale/mismatched token — 무시(스택 보존)', { expected: top?.token ?? null, got: token });
      return;
    }
    _stack.pop();
    const restoreLabel = _stack.length ? _stack[_stack.length - 1].key : _basePage;
    _flushAndSwitch(restoreLabel);
  };

  document.addEventListener('visibilitychange', () => {
    if (_finalized) return;
    if (document.visibilityState === 'hidden') {
      // 지금 보고 있던 뷰(스택 top 또는 기본 페이지)의 시간만 끊어 보낸다 — pop 안 함,
      // 스택은 그대로 둬서 돌아오면 같은 뷰에서 이어진다.
      _flushAndSwitch(_currentLabel);
    } else {
      // 숨겨져 있던 시간은 안 센다 — 다시 보이는 시점부터 재시작.
      _segStart = Date.now();
    }
  });
  window.addEventListener('pagehide', () => {
    if (_finalized) return;
    _finalized = true;
    const dur = Math.round((Date.now() - _segStart) / 1000);
    if (dur >= 3) _sendRow(_currentLabel, dur, _segStart);
  });
})();

