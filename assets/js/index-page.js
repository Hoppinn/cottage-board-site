/* =========================
   # GAME CARD RENDER
========================= */

function renderGameCards(){
  const gameScroll =
    document.getElementById("gameScroll");

  if(!gameScroll){
    return;
  }

  const playerValue = recommendState.players;
const levelValue = recommendState.level;
const moodValue = recommendState.mood;

 if(
  !playerValue &&
  !levelValue &&
  !moodValue
){
  gameScroll.style.cssText = 'max-width:720px;margin:0 auto;padding:20px 40px;box-sizing:border-box;display:block;';
  gameScroll.innerHTML = `<p class="recommend-empty" style="max-width:480px;width:100%;margin:0 auto;display:block;text-align:center;">하나만 선택해도 추천해드려요.</p>`;

  return;
}

  gameScroll.style.cssText = '';

  

const normalizedLevel =
  normalizeLevelValue(levelValue);

const hasHardDifficultyFilter =
  normalizedLevel === "heavy_mania" ||
  normalizedLevel === "hardcore";

const maxWeight =
  hasHardDifficultyFilter || playerValue === '9+'
    ? 5.0
    : DEFAULT_RECOMMEND_MAX_WEIGHT;

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

const isMurderMystery = game?.cottage?.shelfGroupId === 'murder_mystery';
if (!isMurderMystery && weight > maxWeight) {
  return false;
}

      return (
        matchRecommendLevel(game, levelValue) &&
        matchBestPlayers(game, playerValue) &&
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
    gameScroll.style.cssText = 'max-width:720px;margin:0 auto;padding:20px 40px;box-sizing:border-box;display:block;';
    gameScroll.innerHTML = `<p class="recommend-empty" style="max-width:480px;width:100%;margin:0 auto;display:block;text-align:center;">조건에 맞는 게임이 아직 없어요.<br>다른 조건으로 다시 찾아보세요.</p>`;

    return;
  }

  _fireRecommendComplete();

  const MAX_CARDS = window.innerWidth >= 720 ? 4 : 5;
  const seenBaseTitles = new Set();
  const dedupedGames = filteredGames.filter(game => {
    const title = GameView.getDisplayTitle(game);
    const base = title.replace(/\s*\d+\s*$/, "").trim();
    if (seenBaseTitles.has(base)) return false;
    seenBaseTitles.add(base);
    return true;
  });
  const displayGames = dedupedGames.slice(0, MAX_CARDS);
  const hasMore = filteredGames.length > MAX_CARDS;

  const cardsHtml =
    displayGames
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

            ${card.rating > 0 ? `<span class="game-card-rating">⭐ ${formatRating(card.rating)}</span>` : ''}

            <strong>
              ${card.title}
            </strong>

            <div class="game-meta">

              <span>
                👥 ${(p => p.includes('~') ? p.replace(/명$/, '') : p)(formatPlayers(card.bestPlayers))}
              </span>

              <span class="card-difficulty ${difficulty.className}">
                ${difficulty.icon} ${formatDifficultyWeight(card.difficultyWeight)}
              </span>

              <span class="game-meta-time">
                ⏱ ${card.playingTimeText || "-"}
              </span>

            </div>

            ${card.tags?.length
              ? `<p class="game-card-description">${card.tags.slice(0, 3).map(t => `#${t}`).join(" ")}</p>`
              : ""}

          </button>
        `;
      })
      .join("");

  const moreParams = new URLSearchParams();
  if(recommendState.players) moreParams.set("players", recommendState.players);
  if(recommendState.level)   moreParams.set("level",   recommendState.level);
  if(recommendState.mood)    moreParams.set("mood",     recommendState.mood);
  moreParams.set("sort", "rating");
  const isHeavyLevel =
    recommendState.level === "heavy" ||
    recommendState.level === "hardcore";
  if(!isHeavyLevel) moreParams.set("weightCap", "1");
  const moreQuery = `?${moreParams.toString()}`;

  const moreHtml = hasMore
    ? `<button class="game-card-more" type="button" onclick="openRecommendOverlay()">전체 ${filteredGames.length}개<br>더보기 →</button>`
    : "";

  gameScroll.innerHTML = cardsHtml + moreHtml;
bindGameCardEvents();

  // 추천 결과 게임 클릭 이벤트 (overlay · 일반 목록 카드 제외, gameScroll 스코프)
  gameScroll.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      window.CottageDB?.trackEvent('recommend_game_click', { game_id: card.dataset.game });
    });
  });

gameScroll.scrollTo({
  left: 0,
  top: 0,
  behavior: "smooth"
});
}

function openRecommendOverlay(){
  const overlay = document.getElementById("recommendOverlay");
  const list    = document.getElementById("recommendOverlayList");
  if(!overlay || !list) return;

  const _overlayLevel = recommendState.level;
  const _overlayPlayer = recommendState.players;
  const _overlayHardLevel = (()=>{
    const nl = normalizeLevelValue(_overlayLevel);
    return nl === "heavy_mania" || nl === "hardcore";
  })();
  const _overlayMaxWeight = _overlayHardLevel || _overlayPlayer === '9+' ? 5.0 : DEFAULT_RECOMMEND_MAX_WEIGHT;

  const allFiltered = getAllGamesArray().filter(game => {
    const data = GameView.getRecommendData(game);
    const w = Number(data.difficultyWeight) || Number(data.weight) ||
      Number(game?.cottage?.difficultyWeight) || Number(game?.bgg?.weight) || 999;
    if(game?.cottage?.shelfGroupId !== 'murder_mystery' && w > _overlayMaxWeight) return false;
    return matchBestPlayers(game, _overlayPlayer) &&
      matchRecommendLevel(game, _overlayLevel) &&
      matchRecommendMood(game, recommendState.mood);
  }).sort((a, b) => {
    const ra = Number(GameView.getRecommendData(a).rating) || 0;
    const rb = Number(GameView.getRecommendData(b).rating) || 0;
    if (ra !== rb) return rb - ra;
    const wa = Number(GameView.getRecommendData(a).difficultyWeight) || 999;
    const wb = Number(GameView.getRecommendData(b).difficultyWeight) || 999;
    return wa - wb;
  });

  // 헤더에 필터 조건 + 개수 표시
  const filterChips = [];
  if(recommendState.players) {
    const pt = {2:'2인', 3:'3인', 4:'4인', group:'단체', 1:'1인', 5:'5인', 6:'6인', 7:'7인', 8:'8인', '9+':'9인+'};
    filterChips.push(pt[recommendState.players] || recommendState.players);
  }
  if(recommendState.level) {
    const lt = {kids:'😊 아이도', beginner:'🌱 입문', light:'🏡 라이트', heavy:'🧠 헤비', hardcore:'😈 하드코어'};
    filterChips.push(lt[recommendState.level] || recommendState.level);
  }
  if(recommendState.mood && moodTextMap[recommendState.mood]) {
    filterChips.push(moodTextMap[recommendState.mood]);
  }
  const titleEl = overlay.querySelector('.recommend-overlay-title');
  if(titleEl) {
    titleEl.innerHTML = filterChips.length
      ? `${filterChips.join(' · ')} <span style="color:#888;font-weight:600;font-size:13px">${allFiltered.length}개</span>`
      : `추천 게임 전체 <span style="color:#888;font-weight:600;font-size:13px">${allFiltered.length}개</span>`;
  }

  list.innerHTML = allFiltered.map(game => {
    const card = GameView.getGameCardData(game);
    const difficulty = getDifficultyData(card.difficultyWeight);
    return `<button class="game-card" type="button" data-game="${game.id}">
      <img src="${card.image || DEFAULT_GAME_IMAGE}" alt="${card.title}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';">
      ${card.rating > 0 ? `<span class="game-card-rating">⭐ ${formatRating(card.rating)}</span>` : ''}
      <strong>${card.title}</strong>
      <div class="game-meta">
        <span>👥 ${(p => p.includes('~') ? p.replace(/명$/, '') : p)(formatPlayers(card.bestPlayers))}</span>
        <span class="card-difficulty ${difficulty.className}">${difficulty.icon} ${formatDifficultyWeight(card.difficultyWeight)}</span>
        <span class="game-meta-time">⏱ ${card.playingTimeText || "-"}</span>
      </div>
      ${card.tags?.length ? `<p class="game-card-description">${card.tags.slice(0,3).map(t=>`#${t}`).join(' ')}</p>` : ''}
    </button>`;
  }).join("");

  list.querySelectorAll(".game-card").forEach(btn => {
    btn.addEventListener("click", () => {
      openGameSheet(btn.dataset.game);
    });
  });

  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeRecommendOverlay(){
  const overlay = document.getElementById("recommendOverlay");
  if(!overlay) return;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
}


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

  _recommendStartFired = false; // 모달 열 때마다 다음 선택 1회를 다시 추적
  _recommendCompleteFired = false; // 모달 열 때마다 다음 결과 표시 1회를 다시 추적

  // playerSubRow/playerMainRow 상태 보존 — 모달 재열기 시 초기화 방지
  const _subD  = playerSubRow  ? playerSubRow.style.display  : null;
  const _mainD = playerMainRow ? playerMainRow.style.display : null;

  recommendModal.classList.add('is-active');

  recommendModal.setAttribute(
    'aria-hidden',
    'false'
  );

  // 상태 복원 (다른 코드가 중간에 덮어썼을 경우 대비)
  if(playerSubRow  && _subD  !== null) playerSubRow.style.display  = _subD;
  if(playerMainRow && _mainD !== null) playerMainRow.style.display = _mainD;
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

let _recommendStartFired = false;
function _fireRecommendStart() {
  if (_recommendStartFired) return;
  _recommendStartFired = true;
  window.CottageDB?.trackEvent('recommend_start');
}

let _recommendCompleteFired = false;
function _fireRecommendComplete() {
  if (_recommendCompleteFired) return;
  _recommendCompleteFired = true;
  window.CottageDB?.trackEvent('recommend_complete');
}

const recommendState = {
  players: "",
  level: "",
  mood: ""
};

const playerTextMap = {
  "1": "1인",
  "2": "2인",
  "3": "3인",
  "4": "4인",
  "group": "단체",
  "5": "5인",
  "6": "6인",
  "7": "7인",
  "8": "8인",
  "9+": "9인+"
};

const levelTextMap = {
  kids: "😊 아이도 할 수 있어요",
  beginner: "🌱 입문 추천",
  light: "🏡 라이트·패밀리",
  heavy: "🧠 헤비·매니아",
  hardcore: "😈 하드코어"
};

const moodTextMap = {
  talk:   "💬 말·이야기 게임",
  luck:   "🍀 운 게임",
  guess:  "🎯 맞추기·추론",
  bluff:  "🃏 속이기·심리전",
  active: "⚡ 몸·반응속도",
  dice:   "🎲 가벼운 주사위게임",
  card:   "🎴 가벼운 카드게임",
  brain:  "🧠 전략·두뇌",
  coop:   "🤝 협력 게임",
  team:   "⚔️ 팀 대항전"
};

const levelShortMap = {
  kids: "😊 아이도", beginner: "🌱 입문", light: "🏡 라이트", heavy: "🧠 헤비", hardcore: "😈 하드코어"
};
const moodShortMap = {
  talk: "💬 말·이야기", luck: "🍀 운", guess: "🎯 추론", bluff: "🃏 심리전",
  active: "⚡ 몸", dice: "🎲 주사위", card: "🎴 카드", brain: "🧠 전략", coop: "🤝 협력", team: "⚔️ 팀"
};

function updateRecommendFilterText(){
  if(!recommendFilter){
    return;
  }

  const playerValue = recommendState.players;
const levelValue = recommendState.level;
const moodValue = recommendState.mood;

  recommendFilter.innerHTML = `
    <div class="recommend-filter-card recommend-filter-card-v3">
      <div class="recommend-steps-row">
        <div class="recommend-step" data-filter-group="players">
          <button class="recommend-step-head${playerValue ? ' is-selected' : ''}" type="button" data-toggle-filter="players">
            ${playerValue ? playerTextMap[playerValue] : '인원'} ▾
          </button>
        </div>
        <div class="recommend-step" data-filter-group="level">
          <button class="recommend-step-head${levelValue ? ' is-selected' : ''}" type="button" data-toggle-filter="level">
            ${levelValue ? levelShortMap[levelValue] : '난이도'} ▾
          </button>
        </div>
        <div class="recommend-step" data-filter-group="mood">
          <button class="recommend-step-head${moodValue ? ' is-selected' : ''}" type="button" data-toggle-filter="mood">
            ${moodValue ? moodShortMap[moodValue] : '게임방식'} ▾
          </button>
        </div>
      </div>

      <div class="recommend-options-area" data-options-group="players">
        ${ ['group','5','6','7','8','9+'].includes(playerValue)
          ? `${renderInlineOption("players", "", "← 뒤로", playerValue)}
             ${renderInlineOption("players","5","5인",playerValue)}
             ${renderInlineOption("players","6","6인",playerValue)}
             ${renderInlineOption("players","7","7인",playerValue)}
             ${renderInlineOption("players","8","8인",playerValue)}
             ${renderInlineOption("players","9+","9인+",playerValue)}`
          : `${playerValue !== "2" ? renderInlineOption("players", "2", "2인", playerValue) : ""}
             ${playerValue !== "3" ? renderInlineOption("players", "3", "3인", playerValue) : ""}
             ${playerValue !== "4" ? renderInlineOption("players", "4", "4인", playerValue) : ""}
             ${playerValue !== "group" ? renderInlineOption("players", "group", "단체", playerValue) : ""}
             ${playerValue !== "1" ? renderInlineOption("players", "1", "1인", playerValue) : ""}
             ${renderInlineOption("players", "", "상관없음", playerValue)}` }
      </div>

      <div class="recommend-options-area" data-options-group="level">
        ${levelValue !== "kids"     ? renderInlineOption("level", "kids",     "아이도 가능",  levelValue) : ""}
        ${levelValue !== "beginner" ? renderInlineOption("level", "beginner", "입문 추천",    levelValue) : ""}
        ${levelValue !== "light"    ? renderInlineOption("level", "light",    "라이트·패밀리",levelValue) : ""}
        ${levelValue !== "heavy"    ? renderInlineOption("level", "heavy",    "헤비·매니아",  levelValue) : ""}
        ${levelValue !== "hardcore" ? renderInlineOption("level", "hardcore", "하드코어",     levelValue) : ""}
        ${renderInlineOption("level", "", "상관없음", levelValue)}
      </div>

      <div class="recommend-options-area" data-options-group="mood">
        ${moodValue !== "talk"   ? renderInlineOption("mood", "talk",   "💬 말·이야기 게임",    moodValue) : ""}
        ${moodValue !== "luck"   ? renderInlineOption("mood", "luck",   "🍀 운 게임",            moodValue) : ""}
        ${moodValue !== "guess"  ? renderInlineOption("mood", "guess",  "🎯 맞추기·추론",       moodValue) : ""}
        ${moodValue !== "bluff"  ? renderInlineOption("mood", "bluff",  "🃏 속이기·심리전",     moodValue) : ""}
        ${moodValue !== "active" ? renderInlineOption("mood", "active", "⚡ 몸·반응속도",       moodValue) : ""}
        ${moodValue !== "dice"   ? renderInlineOption("mood", "dice",   "🎲 가벼운 주사위게임", moodValue) : ""}
        ${moodValue !== "card"   ? renderInlineOption("mood", "card",   "🎴 가벼운 카드게임",   moodValue) : ""}
        ${moodValue !== "brain"  ? renderInlineOption("mood", "brain",  "🧠 전략·두뇌",         moodValue) : ""}
        ${moodValue !== "coop"   ? renderInlineOption("mood", "coop",   "🤝 협력 게임",         moodValue) : ""}
        ${moodValue !== "team"   ? renderInlineOption("mood", "team",   "⚔️ 팀 대항전",         moodValue) : ""}
        ${renderInlineOption("mood", "", "상관없어요", moodValue)}
      </div>

      <p class="recommend-filter-hint">처음이시면 🌱 입문·추천 난이도로 시작하시면 됩니다^^</p>
    </div>
  `;
}

if(recommendFilter){
  recommendFilter.addEventListener(
    'click',
    (event)=>{
      // 헤더 토글 버튼
      const toggleButton =
        event.target.closest('[data-toggle-filter]');

      if(toggleButton){
        const group =
          toggleButton.closest('.recommend-step');

        if(group){
          const wasOpen = group.classList.contains('is-open');
          recommendFilter.querySelectorAll('.recommend-step.is-open').forEach(s => s.classList.remove('is-open'));
          if(!wasOpen) group.classList.add('is-open');
        }

        return;
      }

      const optionButton =
        event.target.closest('[data-inline-type]');

      if(!optionButton){ return; }

      const type  = optionButton.dataset.inlineType;
      const value = optionButton.dataset.inlineValue || "";

      // 재빌드 전 열린 step 저장
      const openGroups = new Set();
      recommendFilter.querySelectorAll('.recommend-step.is-open').forEach(s => {
        openGroups.add(s.dataset.filterGroup);
      });

      // step 열림/닫힘 제어
      if(type === 'players'){
        const wasGroupMode = ['group','5','6','7','8','9+'].includes(recommendState.players);
        if(value === 'group'){
          openGroups.add('players');       // 단체 클릭 → 유지 (서브버튼 표시)
        } else if(['5','6','7','8','9+'].includes(value)){
          openGroups.delete('players');    // 서브버튼 선택 → 닫힘
        } else if(value === '' && wasGroupMode){
          openGroups.add('players');       // 뒤로 클릭 → 유지 (기본 버튼 복원)
        } else {
          openGroups.delete('players');    // 1인/2인/3인/4인/상관없음 → 닫힘
        }
      } else {
        openGroups.delete(type);           // 난이도/게임방식 선택 → 닫힘
      }

      recommendState[type] = value;
      updateRecommendFilterText();

      // is-open 상태 복원
      recommendFilter.querySelectorAll('.recommend-step').forEach(s => {
        if(openGroups.has(s.dataset.filterGroup)){
          s.classList.add('is-open');
        }
      });

      renderGameCards();
    }
  );
}


/* =========================
   # SHOW RECOMMEND RESULTS
========================= */

function setRecommendMenuActive(active){
  const link = document.querySelector('#openRecommendMenu');
  if(!link) return;
  if(active){
    link.classList.add('is-current');
    const group = link.closest('.menu-group');
    if(group) group.classList.add('is-open');
  } else {
    link.classList.remove('is-current');
  }
}

function showRecommendResults(){
  updateRecommendFilterText();
  renderGameCards();
  closeRecommendModal();
  setRecommendMenuActive(true);

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
  setRecommendMenuActive(false);

  const recommendWasOpen =
    recommendSection && !recommendSection.classList.contains('is-hidden');

  if(recommendSection){
    recommendSection.classList.add('is-hidden');
  }

  if(!recommendWasOpen && window.scrollY <= 2){
    return;
  }

  if(heroSection){
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
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
  applyRecommendConditionButton.addEventListener('click', () => {
    window.CottageDB?.trackEvent('recommend_run');
    showRecommendResults();
  });
}

if(backToHeroButton){
  backToHeroButton.addEventListener(
    'click',
    backToHero
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
   # INIT
========================= */

if(document.getElementById("gameScroll")){
  updateRecommendFilterText();
  renderGameCards();
}

// ── 인원 선택 ─────────────────────────────────────────────
const playerMainRow = document.getElementById('playerMainRow');
const playerSubRow  = document.getElementById('playerSubRow');

function showGroupSub() {
  if(playerMainRow) playerMainRow.style.display = 'none';
  if(playerSubRow)  playerSubRow.style.display  = '';
  if(playerSubRow)  playerSubRow.querySelectorAll('.modal-option--sub').forEach(b => b.classList.remove('is-selected'));
}

function showGroupMain() {
  if(playerMainRow) playerMainRow.style.display = '';
  if(playerSubRow)  playerSubRow.style.display  = 'none';
  recommendState.players = "";
  document.querySelectorAll('[data-players]').forEach(b => b.classList.remove('is-selected'));
}

if(playerMainRow){
  playerMainRow.querySelectorAll('[data-players]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-players]').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      if(btn.dataset.players === 'group'){
        e.stopPropagation(); // 단체 클릭 시 버블링 차단 → 드롭다운 닫힘 방지
        showGroupSub();
      } else {
        recommendState.players = btn.dataset.players || "";
        _fireRecommendStart();
      }
    });
  });
}

if(playerSubRow){
  playerSubRow.querySelectorAll('.modal-option--sub').forEach(btn => {
    btn.addEventListener('click', () => {
      playerSubRow.querySelectorAll('.modal-option--sub').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      recommendState.players = btn.dataset.players || "";
      _fireRecommendStart();
      showRecommendResults(); // 서브버튼 선택 → 필터 적용 + 드롭다운 닫힘
    });
  });
}

const groupBackBtn = document.getElementById('groupBackBtn');
if(groupBackBtn){
  groupBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showGroupMain();
  });
}

const playerOptions = document.querySelectorAll('[data-players]');

const levelOptions =
  document.querySelectorAll('[data-level]');

const moodOptions =
  document.querySelectorAll('[data-mood]');

levelOptions.forEach(option=>{
  option.addEventListener(
    'click',
    ()=>{
      levelOptions.forEach(btn=>{
        btn.classList.remove('is-selected');
      });

      option.classList.add('is-selected');
      _fireRecommendStart();
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
      _fireRecommendStart();
    }
  );
});

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

(async function initHeroStats() {
  const recEl = document.getElementById("heroRecommendCount");
  const playEl = document.getElementById("heroPlayCount");
  try {
    if (!recEl && !playEl) return;
    const events = await window.CottageDB?.getEventCounts(
      ['recommend_complete', 'record_complete'], 1
    );
    if (!events) return;
    const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const recCount = events.filter(e =>
      e.event_type === 'recommend_complete' &&
      (e.created_at || '').slice(0, 10) === todayKst
    ).length;
    const playCount = events.filter(e =>
      e.event_type === 'record_complete' &&
      (e.created_at || '').slice(0, 10) === todayKst
    ).length;
    if (recEl) {
      recEl.textContent = recCount > 0
        ? `오늘 ${recCount}번의 추천게임이 완료됐어요. 🎲`
        : '';
    }
    if (playEl) {
      playEl.textContent = playCount > 0
        ? `오늘 ${playCount}개의 플레이기록이 작성됐어요. 📝`
        : '';
    }
  } catch (_) {
  } finally {
    // index.html#recommend 로 직접 진입 시 추천 섹션 자동 열기.
    // 히어로 통계 텍스트가 늦게 채워지며 #recommend 위쪽 높이가 바뀌므로,
    // 통계 반영(성공/실패 무관)이 끝난 뒤에 스크롤 위치를 계산해야 정확하다.
    if (location.hash === '#recommend' && document.getElementById('recommend')) {
      showRecommendResults();
    }
  }
})();


/* =========================
   # DIFFICULTY GUIDE TOGGLE
========================= */

(function initDgToggle() {
  const btn  = document.getElementById('dgToggle');
  const body = document.getElementById('dgBody');
  if (!btn || !body) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    body.hidden = open;
  });
})();


/* =========================
   # HERO MEETING BUTTON
========================= */

(function initHeroMeetingBtn() {
  const btn = document.getElementById('heroMeetingBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const section = document.getElementById('meeting');
    if (!section) return;
    const header = document.querySelector('.site-header');
    const headerH = header ? header.offsetHeight : 0;
    window.scrollTo({ top: section.offsetTop - headerH - 8, behavior: 'smooth' });
  });
})();


/* =========================
   # MEETING SECTION
========================= */

(async function initMeetingSection() {
  const statusEl = document.getElementById('meetingStatusMsg');
  const daysEl   = document.getElementById('meetingDays');
  if (!statusEl || !daysEl) return;

  function getThisWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0=일,1=월...6=토
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = d => d.toISOString().slice(0, 10);
    return { start: fmt(mon), end: fmt(sun), monDate: mon };
  }

  function getMeetingStatusMsg(count) {
    if (count === 0) return '🎲 이번 주 모임 모집 중';
    if (count === 1) return '🙋 1명이 기다리고 있어요';
    if (count === 2) return '👥 2명이 기다리고 있어요';
    if (count === 3) return '🎲 3명이 모였어요';
    return '🔥 이번 주 모임 진행 중';
  }

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  try {
    const { start, end, monDate } = getThisWeekRange();
    const votes = await window.CottageDB?.getMeetingVotes(start, end);
    if (!votes) return;

    // 날짜별 고유 user_id 집계
    const byDate = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(monDate);
      d.setDate(monDate.getDate() + i);
      byDate[d.toISOString().slice(0, 10)] = new Set();
    }
    votes.forEach(v => {
      if (byDate[v.vote_date]) byDate[v.vote_date].add(v.user_id);
    });

    // 이번 주 전체 고유 user_id 수
    const allUsers = new Set(votes.map(v => v.user_id));
    statusEl.textContent = getMeetingStatusMsg(allUsers.size);

    // 날짜 칩 렌더
    const dateKeys = Object.keys(byDate).sort();
    daysEl.innerHTML = dateKeys.map((dateStr, i) => {
      const cnt = byDate[dateStr].size;
      const hasVote = cnt > 0;
      return `<div class="meeting-day-chip${hasVote ? ' has-vote' : ''}">
        <span class="mdc-day">${DAY_LABELS[i]}</span>
        <span class="mdc-count">${hasVote ? cnt + '명' : '-'}</span>
      </div>`;
    }).join('');

  } catch (_) {
    statusEl.textContent = '🎲 이번 주 모임 모집 중';
  }
})();
