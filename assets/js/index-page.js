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
  gameScroll.style.cssText = 'max-width:720px;margin:0 auto;padding:10px 16px;box-sizing:border-box;display:block;';
  gameScroll.innerHTML = `<p class="recommend-empty" style="max-width:480px;width:100%;margin:0 auto;display:block;text-align:center;">하나만 골라도, 맞는 게임이 보여요.</p>`;

  return;
}

  gameScroll.style.cssText = '';

  

const filteredGames = _getRecommendedGames(playerValue, levelValue, moodValue);


      
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
      .map((game, index) => _recommendCardHtml(game, index))
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
    ? `<button class="game-card-more" type="button">전체 ${filteredGames.length}개<br>더보기 →</button>`
    : "";

  gameScroll.innerHTML = cardsHtml + moreHtml;
bindGameCardEvents();
  // 더보기 → 전체 추천 오버레이 (매 렌더마다 재생성되는 버튼이라 여기서 재배선)
  gameScroll.querySelector('.game-card-more')?.addEventListener('click', openRecommendOverlay);

  // 추천 결과 게임 클릭 이벤트 (overlay · 일반 목록 카드 제외, gameScroll 스코프)
  gameScroll.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const _gid = card.dataset.game;
      const _gname = window.COTTAGE_GAMES?.find(g => String(g.bggId) === String(_gid) || g.id === _gid)?.display || _gid;
      window.CottageDB?.trackEvent('home_recommend_game_detail_click', { game_id: _gid, game_name: _gname, source: 'home_recommend' });
    });
  });

gameScroll.scrollTo({
  left: 0,
  top: 0,
  behavior: "smooth"
});
}

function _getRecommendedGames(playerValue, levelValue, moodValue){
const normalizedLevel =
  GameView.normalizeLevelValue(levelValue);

const hasHardDifficultyFilter =
  normalizedLevel === "heavy_mania" ||
  normalizedLevel === "hardcore";

const maxWeight =
  hasHardDifficultyFilter || playerValue === '9+' || !recommendState.weightCap
    ? 5.0
    : DEFAULT_RECOMMEND_MAX_WEIGHT;

return getAllGamesArray()
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
}

function _recommendCardHtml(game, index){
        const gameKey =
          getGameKey(game);

        const card =
          GameView.getGameCardData(game);

        const difficulty =
          GameView.getDifficultyData(
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
}

function openRecommendOverlay(){
  window.CottageDB?.trackEvent('home_recommend_all_click');
  const overlay = document.getElementById("recommendOverlay");
  const list    = document.getElementById("recommendOverlayList");
  if(!overlay || !list) return;

  const _overlayLevel = recommendState.level;
  const _overlayPlayer = recommendState.players;
  const _overlayHardLevel = (()=>{
    const nl = GameView.normalizeLevelValue(_overlayLevel);
    return nl === "heavy_mania" || nl === "hardcore";
  })();
  const _overlayMaxWeight = _overlayHardLevel || _overlayPlayer === '9+' || !recommendState.weightCap ? 5.0 : DEFAULT_RECOMMEND_MAX_WEIGHT;

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
    const difficulty = GameView.getDifficultyData(card.difficultyWeight);
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

const closeRecommendOverlayButton =
  document.querySelector('.recommend-overlay-close');


/* =========================
   # RECOMMEND TABS (추천 코스 / 게임 더 찾기)
   2026-08 — 책자 연동. 기본 탭은 항상 '추천 코스'(히어로·헤더메뉴·QR 전부 동일 진입).
   '게임 더 찾기'는 기존 recommendFilter+gameScroll을 그대로 옮긴 것 — 죽어 있던
   recommendModal은 되살리지 않는다(PROJECT_STATE 2026-08 기획 합의).
========================= */

function switchRecTab(tabName){
  document.querySelectorAll('.rec-tab-btn').forEach(btn=>{
    btn.classList.toggle('is-active', btn.dataset.recTab === tabName);
  });
  document.querySelectorAll('.rec-tab-panel').forEach(panel=>{
    panel.classList.toggle('is-hidden', panel.dataset.recPanel !== tabName);
  });
}

const recTabRow = document.getElementById('recTabRow');
if(recTabRow){
  recTabRow.addEventListener('click', (event)=>{
    const btn = event.target.closest('[data-rec-tab]');
    if(!btn) return;
    switchRecTab(btn.dataset.recTab);
    window.CottageDB?.trackEvent('home_recommend_tab_click', { tab: btn.dataset.recTab });
  });
}

// 히어로 버튼·헤더메뉴·QR 진입이 공유하는 진입 함수 — 항상 지정한 탭을 켜고 섹션을 연다.
function openRecommendSectionOnTab(tabName){
  switchRecTab(tabName);
  setRecommendMenuActive(true);

  if(recommendSection){
    recommendSection.classList.remove('is-hidden');

    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.offsetHeight : 0;

    window.scrollTo({
      top: recommendSection.offsetTop - headerHeight + 12,
      behavior: 'smooth',
    });
  }
}


/* =========================
   # RECOMMEND COURSE (추천 코스 탭)
   window.BOOKLET_COURSES(booklet-courses-data.js)를 그대로 렌더링.
   기존 .game-card와 다른 가로형 리스트 카드(.course-item-card) — 비교용이 아니라
   책자 순서를 그대로 훑는 용도라 세로 리스트 + 번호 배지로 간다.
========================= */

let _selectedCourseId = null;

function _courseItemCardHtml(gameKey, note, opts){
  opts = opts || {};
  const game = window.gameData?.[gameKey];
  if(!game) return '';

  const card = GameView.getGameCardData(game);
  const titleText = opts.subtitle ? `${card.title} · ${opts.subtitle}` : card.title;
  const badgeHtml = opts.slot ? `<span class="course-item-badge">${opts.slot}</span>` : '';
  const variantClass =
    (opts.branch ? ' course-item-card--branch' : '') +
    (opts.bonus  ? ' course-item-card--bonus'  : '');

  return `
    <button class="course-item-card${variantClass}" type="button" data-game="${gameKey}">
      ${badgeHtml}
      <img
        src="${card.image || DEFAULT_GAME_IMAGE}"
        alt="${card.title}"
        loading="lazy"
        onerror="this.onerror=null; this.src='${DEFAULT_GAME_IMAGE}';"
      >
      <span class="course-item-text">
        <strong>${titleText}</strong>
        ${note ? `<em>${note}</em>` : ''}
      </span>
    </button>
  `;
}

function renderCourseList(course){
  const listEl = document.getElementById('courseList');
  if(!listEl) return;

  // 책자와 같은 좌(메인)→우(심화) 배치는 코스 안에 심화가 하나라도 있을 때만 쓴다.
  // 인원무관처럼 심화가 전혀 없는 코스는 굳이 빈 오른쪽 칸을 만들지 않고 1열 그대로.
  const hasAnyBranch = course.items.some(it => it.type === 'main' && it.branchGameKey);

  // 메인 게임끼리는 ↓로 진행을 잇는다 — 마지막 메인 항목(보너스 앞)에는 안 그린다.
  const mainIndexes = course.items
    .map((it, i) => (it.type === 'main' ? i : -1))
    .filter(i => i >= 0);
  const lastMainIndex = mainIndexes[mainIndexes.length - 1];

  listEl.innerHTML = course.items.map((item, idx) => {
    if(item.type === 'bonus'){
      return `
        <div class="course-row course-row--bonus">
          <span class="course-bonus-label">🔍 추가 추천</span>
          ${_courseItemCardHtml(item.gameKey, item.note, { subtitle: item.subtitle, bonus: true })}
        </div>
      `;
    }

    const rowClass = 'course-row' + (idx === lastMainIndex ? '' : ' course-row--has-next');
    const mainHtml = _courseItemCardHtml(item.gameKey, item.note, { slot: item.slot });

    if(!hasAnyBranch){
      return `<div class="${rowClass}"><div class="course-row-main">${mainHtml}</div></div>`;
    }

    // 이 코스는 좌우 분기 레이아웃 — 이 행에 심화가 없어도 오른쪽 칸을 비워
    // 아래위 행과 왼쪽(메인) 칸 폭이 흔들리지 않게 맞춘다(책자와 동일한 규칙).
    const branchHtml = item.branchGameKey
      ? `
        <div class="course-row-arrow">
          <span class="course-arrow-glyph" aria-hidden="true">→</span>
          <span class="course-arrow-label">심화</span>
        </div>
        <div class="course-row-branch">
          ${_courseItemCardHtml(item.branchGameKey, item.branchNote, { branch: true })}
        </div>
      `
      : `
        <div class="course-row-arrow"></div>
        <div class="course-row-branch"></div>
      `;

    return `
      <div class="${rowClass}">
        <div class="course-row-split">
          <div class="course-row-main">${mainHtml}</div>
          ${branchHtml}
        </div>
      </div>
    `;
  }).join('');

  // 화살표는 실제 렌더된 카드 위치를 재서 꽂는다 — 다음 프레임까지 기다려
  // innerHTML 반영 후 레이아웃이 끝난 값을 잡는다.
  requestAnimationFrame(positionCourseFlowArrows);
}

// 심화 유무로 카드 높이가 달라도 항상 "이 카드 바닥 ~ 다음 카드 위쪽"의
// 정중앙에 ↓를 꽂는다. CSS만으로 세 번 시도해도 안 맞았던 문제라
// 실측(getBoundingClientRect) 기반으로 전환(2026-08).
function positionCourseFlowArrows(){
  const listEl = document.getElementById('courseList');
  if(!listEl) return;

  listEl.querySelectorAll('.course-flow-arrow').forEach(el => el.remove());

  const listRect = listEl.getBoundingClientRect();
  const hasNextRows = Array.from(listEl.querySelectorAll('.course-row--has-next'));

  hasNextRows.forEach(row => {
    const mainCard = row.querySelector('.course-row-main .course-item-card');
    if(!mainCard) return;

    let nextRow = row.nextElementSibling;
    while(nextRow && !nextRow.classList.contains('course-row')) nextRow = nextRow.nextElementSibling;
    if(!nextRow) return;

    const nextCard =
      nextRow.querySelector('.course-row-main .course-item-card') ||
      nextRow.querySelector('.course-item-card');
    if(!nextCard) return;

    const mainRect = mainCard.getBoundingClientRect();
    const nextRect = nextCard.getBoundingClientRect();

    const midY = (mainRect.bottom + nextRect.top) / 2;
    const centerX = mainRect.left + mainRect.width / 2;

    const arrow = document.createElement('div');
    arrow.className = 'course-flow-arrow';
    arrow.style.top = (midY - listRect.top) + 'px';
    arrow.style.left = (centerX - listRect.left) + 'px';
    arrow.innerHTML = '<span class="course-flow-arrow-glyph" aria-hidden="true">↓</span>';
    listEl.appendChild(arrow);
  });
}

window.addEventListener('resize', () => {
  if(document.querySelector('.course-flow-arrow')) positionCourseFlowArrows();
});

function renderCourseChips(){
  const grid = document.getElementById('courseChipGrid');
  if(!grid || !window.BOOKLET_COURSES) return;

  grid.innerHTML = window.BOOKLET_COURSES
    .map(c => `<button class="course-chip" type="button" data-course="${c.id}">${c.name}</button>`)
    .join('');
}

function selectCourse(courseId){
  const course = window.BOOKLET_COURSES?.find(c => c.id === courseId);
  if(!course) return;

  _selectedCourseId = courseId;

  document.getElementById('courseChipCaption')?.classList.add('is-hidden');
  document.getElementById('courseChipGrid')?.classList.add('is-hidden');

  const stickyBar = document.getElementById('courseStickyBar');
  const stickyName = document.getElementById('courseStickyName');
  if(stickyBar) stickyBar.classList.remove('is-hidden');
  if(stickyName) stickyName.textContent = course.name;

  document.getElementById('courseListHint')?.classList.remove('is-hidden');

  renderCourseList(course);
  window.CottageDB?.trackEvent('home_recommend_course_select', { course: courseId });
}

function deselectCourse(){
  _selectedCourseId = null;

  document.getElementById('courseChipCaption')?.classList.remove('is-hidden');
  document.getElementById('courseChipGrid')?.classList.remove('is-hidden');
  document.getElementById('courseStickyBar')?.classList.add('is-hidden');
  document.getElementById('courseListHint')?.classList.add('is-hidden');

  const listEl = document.getElementById('courseList');
  if(listEl) listEl.innerHTML = '';
}

const courseChipGrid = document.getElementById('courseChipGrid');
if(courseChipGrid){
  courseChipGrid.addEventListener('click', (event)=>{
    const chip = event.target.closest('[data-course]');
    if(!chip) return;
    selectCourse(chip.dataset.course);
  });
}

const courseStickyBtn = document.getElementById('courseStickyBtn');
if(courseStickyBtn){
  courseStickyBtn.addEventListener('click', deselectCourse);
}

const courseListEl = document.getElementById('courseList');
if(courseListEl){
  courseListEl.addEventListener('click', (event)=>{
    const card = event.target.closest('[data-game]');
    if(!card) return;
    const gameKey = card.dataset.game;
    window.CottageDB?.trackEvent('home_recommend_course_game_click', {
      game_id: gameKey,
      course: _selectedCourseId,
    });
    openGameSheet(gameKey);
  });
}

renderCourseChips();


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
  mood: "",
  weightCap: true
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
  active: "⚡ 몸", dice: "🎲 주사위", card: "🎴 카드", brain: "🧠 전략", coop: "🤝 협력", team: "⚔️ 팀",
  murder: "🔍 머더미스터리"
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

      <div class="recommend-weight-cap-row">
        <button type="button" class="recommend-weight-cap-chip${recommendState.weightCap ? ' is-on' : ' is-off'}" data-action="toggle-weight-cap">
          ${recommendState.weightCap ? '✓ 난이도 필터 (헤비·하드코어 제외)' : '난이도 필터 (헤비·하드코어 제외)'}
        </button>
      </div>

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

      const weightCapBtn = event.target.closest('[data-action="toggle-weight-cap"]');
      if (weightCapBtn) {
        recommendState.weightCap = !recommendState.weightCap;
        updateRecommendFilterText();
        renderGameCards();
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
  openRecommendModalButton.addEventListener('click', () => {
    window.CottageDB?.trackEvent('home_recommend_main_click');
    openRecommendSectionOnTab('course');
  });
}

if(openRecommendMenuButton){
  openRecommendMenuButton.addEventListener(
    'click',
    (event)=>{
      event.preventDefault();
      openRecommendSectionOnTab('course');
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

if(closeRecommendOverlayButton){
  closeRecommendOverlayButton.addEventListener(
    'click',
    closeRecommendOverlay
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

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
    // created_at은 UTC ISO 문자열이라 KST(+9h)로 변환 후 날짜 비교.
    // (그냥 slice(0,10)하면 KST 00~09시 이벤트가 UTC 기준 전날로 잘려 오늘 집계에서 누락됨)
    const kstDateStr = ts => {
      const t = ts ? new Date(ts).getTime() : NaN;
      return Number.isNaN(t) ? '' : new Date(t + 9 * 3600000).toISOString().slice(0, 10);
    };
    const todayKst = kstDateStr(Date.now());
    const recCount = events.filter(e =>
      e.event_type === 'recommend_complete' && kstDateStr(e.created_at) === todayKst
    ).length;
    const playCount = events.filter(e =>
      e.event_type === 'record_complete' && kstDateStr(e.created_at) === todayKst
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
  } catch (err) {
    console.error('[히어로 오늘 통계]', err);
  } finally {
    // index.html#recommend 로 직접 진입 시 추천 섹션 자동 열기.
    // 히어로 통계 텍스트가 늦게 채워지며 #recommend 위쪽 높이가 바뀌므로,
    // 통계 반영(성공/실패 무관)이 끝난 뒤에 스크롤 위치를 계산해야 정확하다.
    if (location.hash === '#recommend' && document.getElementById('recommend')) {
      openRecommendSectionOnTab('course');
    }
  }
})();


/* =========================
   # HERO RECORD BUTTON
========================= */

(function initHeroRecordBtn() {
  const btn = document.getElementById('heroRecordBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.CottageDB?.trackEvent('home_record_main_click');
    const section = document.getElementById('recent-play');
    if (!section) return;
    const header = document.querySelector('.site-header');
    const headerH = header ? header.offsetHeight : 0;
    window.scrollTo({ top: section.offsetTop - headerH - 8, behavior: 'smooth' });
  });
})();


/* =========================
   # RECENT PLAY SECTION
========================= */

async function initRecentPlay() {
  const body = document.getElementById('recentPlayBody');
  if (!body) return;

  function rpGameName(id) {
    if (!id) return '알 수 없는 게임';
    if (window.COTTAGE_GAMES) {
      const g = window.COTTAGE_GAMES.find(g => String(g.bggId) === String(id) || g.id === id);
      if (g) return g.display || g.titleKo || g.titleEn || String(id);
    }
    return String(id);
  }

  function rpThumb(gameId) {
    if (!gameId || !window.gameData) return '';
    const key = window.gameData[gameId]
      ? gameId
      : (Object.entries(window.gameData).find(([, g]) => String(g.bgg?.id) === String(gameId)) || [])[0];
    return key ? (window.gameData[key]?.images?.thumbnail || '') : '';
  }

  function rpDate(played_at, created_at) {
    // 표시 날짜도 정렬과 같은 기준을 쓴다 — 어긋나면 "최신"으로 뽑힌 행에 다른 날짜가 찍힌다.
    const iso = window.CottageDB?.playRecordSortDate?.({ played_at, created_at })
      ?? (played_at || (created_at || '').slice(0, 10));
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const wd = ['일','월','화','수','목','금','토'][new Date(`${y}-${m}-${d}T00:00:00`).getDay()];
    return `${Number(m)}월 ${Number(d)}일 (${wd})`;
  }

  try {
    const [records, profiles] = await Promise.all([
      window.CottageDB?.getAllPlayRecordsForHub(50),
      window.CottageDB?.getAllProfiles?.() || Promise.resolve([]),
    ]);
    if (!records || records.length === 0) {
      body.innerHTML = '<p class="rp-empty">아직 기록된 플레이가 없어요.</p>';
      return;
    }

    const r = records.find(rec => rec.review_text?.trim() && rec.photo_url?.trim()) || records[0];
    const name  = rpGameName(r.game_id);
    const thumb = rpThumb(r.game_id);
    const date  = rpDate(r.played_at, r.created_at);
    const gameKey = window.getGameKeyById?.(r.game_id) || r.game_id;

    // (P1) 이 기록에 매인 남의 게임평(game_comments.record_id) — 한 기록에 여러 명이 각자
    // 게임평을 남길 수 있는데, 종전엔 r.review_text(기록 작성자 1인분)만 보여줘서 몇 명이
    // 썼든 항상 1개만 떴다(2026-08-10 버그 리포트). game-reviews.js buildSessionBody와 같은 소스.
    const linkedComments = await window.CottageDB?.getRecordComments?.(r.id) || [];

    // 참여자 이름 → user_id 해석용 맵 (전체 프로필 기준 + 기록에서 보강).
    // ⚠️ profiles엔 id 컬럼이 없고 kakao 키는 user_id — game-reviews의 p.id 프로필맵은 빈 맵이었음.
    const _nickUser = new Map();
    for (const p of (profiles || [])) { if (p.user_id && p.nickname) _nickUser.set(String(p.nickname).trim().toLowerCase(), String(p.user_id)); }
    for (const rec of records) { if (rec.user_id && rec.nickname) _nickUser.set(String(rec.nickname).trim().toLowerCase(), String(rec.user_id)); }
    // 이 기록이 내 것(또는 오너)인지 — 사진 삭제 권한
    const _me = window.getKakaoUser?.();
    const _canManagePhoto = !!(_me && ((r.user_id && String(r.user_id) === String(_me.id)) || (!r.user_id && r.nickname && r.nickname === (_me.nickname || _me.kakaoNickname)))) || window.isOwner?.() || false;

    const thumbHtml = thumb
      ? `<img class="pr-rec-thumb${gameKey ? ' pr-rec-thumb--link' : ''}" src="${thumb}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : '';

    const countTag = r.player_count
      ? `<span class="pr-rec-tag pr-tag-count"><span class="pr-tag-icon">👥</span> ${r.player_count}명</span>`
      : '';
    const nameTags = r.player_names
      ? r.player_names.split(',').map(n => { const nm = n.trim(); return `<span class="pr-rec-tag pr-tag-who" data-nick="${window.escH?.(nm) ?? nm}">${nm}</span>`; }).join('')
      : '';
    const playerHtml = (countTag || nameTags)
      ? `<div class="pr-player-header">${countTag}${nameTags}</div>`
      : '';

    const timeParts = [
      r.play_time_min ? `${r.play_time_min}분` : '',
      r.score_note || '',
    ].filter(Boolean);
    const metaHtml = timeParts.length
      ? `<div class="pr-rec-meta"><span class="pr-rec-dateline">${timeParts.join(' · ')}</span></div>`
      : '';

    const reviewHtml = r.review_text
      ? `<p class="pr-rec-review">${r.nickname ? `<span class="pr-rec-reviewer"${r.user_id ? ` data-user-id="${r.user_id}"` : ''}>${r.nickname}</span> ` : ''}${r.review_text}</p>`
      : '';
    // 기록 작성자 본인 후기와 같은 형식으로 뒤에 잇는다 — game-reviews.js buildSessionBody와 동일 패턴.
    const linkedHtml = linkedComments.map(c =>
      `<p class="pr-rec-review pr-rec-review--linked">${c.nickname ? `<span class="pr-rec-reviewer"${c.user_id ? ` data-user-id="${c.user_id}"` : ''}>${c.nickname}</span> ` : ''}${c.comment_text}</p>`
    ).join('');

    const photoUrls = window.parsePhotoUrls?.(r.photo_url) || [];
    const photoHtml = photoUrls.length
      ? (window.buildPhotoHtml?.(photoUrls, r.id, false) || '')
      : '';

    body.innerHTML = `
      <div class="rp-rich-card">
        <div class="rp-rich-date">${date}</div>
        <div class="pr-rec-row pr-rec-row--game" data-id="${r.id}" data-record='${JSON.stringify({ gameId: r.game_id || '', mine: _canManagePhoto })}'>
          <div class="pr-rec-row-top">
            ${thumbHtml}
            <div class="pr-rec-main">
              <span class="pr-rec-game">${name}</span>
              ${playerHtml}
              ${metaHtml}
              ${reviewHtml}${linkedHtml}
            </div>
          </div>
          ${photoHtml}
        </div>
      </div>`;

    // 게임 썸네일 → 게임시트 (게임-리뷰 허브와 동일 진입점). ※게임명·인원 텍스트는 클릭 대상 아님.
    if (gameKey) {
      const thumbEl = body.querySelector('.pr-rec-thumb');
      if (thumbEl) {
        thumbEl.style.cursor = 'pointer';
        thumbEl.addEventListener('click', e => { e.stopPropagation(); window.ensureGameSheet?.(); window.openGameRecordSheet?.(gameKey); });
      }
    }

    // 참여자 이름 → 해당 회원 읽기전용 보드 (기록에서 user_id가 해석되는 이름만 클릭 가능)
    body.querySelectorAll('.pr-tag-who[data-nick]').forEach(span => {
      const uid = _nickUser.get((span.dataset.nick || '').toLowerCase());
      if (!uid) return;
      span.style.cursor = 'pointer';
      span.addEventListener('click', e => { e.stopPropagation(); window.openOtherProfileSheet?.(uid); });
    });

    // 사진 → 라이트박스 (공용 openRecordLightbox — wrap[data-urls] + row[data-record] 사용)
    body.querySelectorAll('.pr-rec-photo').forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = img.closest('.pr-rec-photo-wrap');
        const row = img.closest('.pr-rec-row');
        try { window.openRecordLightbox?.(wrap, row, Number(img.dataset.idx || 0)); } catch (err) { console.error('[openRecordLightbox]', err); }
      });
    });
    body.querySelectorAll('.pr-rec-photo-more').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = el.closest('.pr-rec-photo-wrap');
        wrap.querySelectorAll('.sheet-photo-hidden').forEach(item => item.classList.remove('sheet-photo-hidden'));
        el.remove();
      });
    });

    // 리뷰어 닉네임 → 프로필 (기존)
    body.querySelectorAll('.pr-rec-reviewer[data-user-id]').forEach(span => {
      span.style.cursor = 'pointer';
      span.addEventListener('click', e => {
        e.stopPropagation();
        window.openOtherProfileSheet?.(span.dataset.userId);
      });
    });
  } catch (err) {
    console.error('[홈 최근기록 패널]', err);
    body.innerHTML = '<p class="rp-empty">불러오기 실패</p>';
  }
}
initRecentPlay();
// 기록 추가/수정/삭제 후 재조회 — 같은 창에서 직접 호출된 경우(window 이벤트)와
// record 모달이 iframe으로 열린 경우(message) 둘 다 온다. 아래 initRecordModal의
// message 리스너에서도 같은 타입을 받아 한 번 더 호출하지만 초기화 순서가 갈릴 수 있어
// 여기서도 독립적으로 듣는다 — 두 번 불려도 재조회일 뿐 부작용 없음.
window.addEventListener('cottage-record-changed', initRecentPlay);


/* =========================
   # RECORD MODAL
========================= */

(function initRecordModal() {
  const modal    = document.getElementById('recordIframeModal');
  const frame    = document.getElementById('recordIframeFrame');
  const dim      = document.getElementById('recordIframeDim');
  const closeBtn = document.getElementById('recordIframeClose');
  const openBtn     = document.getElementById('openRecordModalBtn');
  const openViewBtn = document.getElementById('openRecordViewBtn');
  const loader      = document.getElementById('recordIframeLoader');
  if (!modal || (!openBtn && !openViewBtn)) return;

  let preloaded = false;
  let pendingTab = null;
  let iframeLightboxOpen = false;
  // 활성 뷰 체류시간 추적(PLAN_active_view_tracking.md 3차) — 이 모달은 game-reviews.html을
  // embed=true iframe으로 보여준다. iframe 내부는 _isEmbeddedFrame() 가드로 자기 트래킹이
  // 이미 꺼져 있으니(#24 방지), 부모(이 파일)가 대신 push/pop한다. 새 가상 키를 만들지 않고
  // 기존 실페이지 키 'game-reviews'를 그대로 쓴다 — 직접 이동해서 보든 이 팝업으로 보든
  // 같은 화면이라 같은 라벨이 맞다(V2_ONLY_PAGE_KEYS엔 추가하지 않는다 — 이미 v1부터 있던
  // 진짜 페이지 키라 추가하면 v2 cutoff 계산이 과거 v1 방문까지 "v2 마커"로 오인한다).
  let _recordModalViewToken = null;
  let _recordModalViewActive = false;

  function preloadIfLoggedIn() {
    if (preloaded || !window.getKakaoUser?.()) return;
    preloaded = true;
    frame.src = './pages/game/game-reviews.html?embed=true&tab=input';
  }
  window.addEventListener('kakao-auth-ready', preloadIfLoggedIn);
  window.addEventListener('cottage-auth-changed', preloadIfLoggedIn);

  function openModal(tab) {
    if (!window.getKakaoUser?.()) { window.kakaoLogin?.(); return; }
    pendingTab = tab;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (!_recordModalViewActive) { _recordModalViewActive = true; _recordModalViewToken = window.pushActiveView?.('game-reviews') ?? null; }

    if (frame.classList.contains('is-ready')) {
      if (tab) frame.contentWindow?.postMessage({ type: 'cottage-switch-tab', tab }, '*');
      pendingTab = null;
    } else {
      if (loader) loader.style.display = 'flex';
      if (!preloaded) preloadIfLoggedIn();
    }
  }
  function closeModal() {
    frame.contentWindow?.postMessage({ type: 'cottage-close-lightbox' }, '*');
    iframeLightboxOpen = false;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    pendingTab = null;
    if (_recordModalViewActive) { window.popActiveView?.(_recordModalViewToken); _recordModalViewActive = false; _recordModalViewToken = null; }
    // 내부 탐색으로 game-reviews에서 이탈한 경우에만 재로드 (src 속성은 내부 탐색 시 불변)
    const curPath = frame.contentWindow?.location?.pathname ?? '';
    if (!curPath.endsWith('game-reviews.html')) {
      frame.classList.remove('is-ready');
      frame.src = './pages/game/game-reviews.html?embed=true&tab=input';
    }
  }

  window.addEventListener('message', e => {
    if (e.data?.type === 'cottage-hub-ready') {
      frame.classList.add('is-ready');
      if (loader) loader.style.display = 'none';
      if (pendingTab) {
        frame.contentWindow?.postMessage({ type: 'cottage-switch-tab', tab: pendingTab }, '*');
        pendingTab = null;
      }
    } else if (e.data?.type === 'cottage-lightbox-open') {
      iframeLightboxOpen = true;
    } else if (e.data?.type === 'cottage-lightbox-close') {
      iframeLightboxOpen = false;
    } else if (e.data?.type === 'cottage-record-changed') {
      // iframe(game-reviews.html embed) 안에서 기록을 쓰면 window.dispatchEvent는
      // iframe 자신의 window에서만 울려 부모(홈)엔 안 닿는다 — postMessage로 받는다.
      window.initRecentPlay?.();
    }
  });

  openBtn?.addEventListener('click', () => { window.CottageDB?.trackEvent('home_record_write_click'); openModal('input'); });
  openViewBtn?.addEventListener('click', () => { window.CottageDB?.trackEvent('home_record_more_click'); openModal('records'); });
  // 닫기 요청은 항상 '가장 위 레이어' 하나만 닫는다. iframe 안 라이트박스가 떠 있으면
  // 그것부터. closeModal()은 라이트박스+모달을 함께 닫으므로(위 postMessage) 이 가드가
  // 없으면 라이트박스만 닫으려 해도 모달까지 같이 닫힌다.
  // ⚠️ 부모의 ✕(recordIframeClose)는 iframe 밖 요소라 iframe 내부 z-index로 안 가려짐 —
  //    라이트박스 ✕와 위치가 겹쳐 사용자는 라이트박스를 누른다고 여긴다.
  function closeTopLayer() {
    if (iframeLightboxOpen) {
      frame.contentWindow?.postMessage({ type: 'cottage-close-lightbox' }, '*');
      iframeLightboxOpen = false;
    } else {
      closeModal();
    }
  }
  dim.addEventListener('click', closeTopLayer);
  closeBtn.addEventListener('click', closeTopLayer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTopLayer(); });
})();


/* =========================
   # DIFFICULTY GUIDE TOGGLE
========================= */

(function initDgToggle() {
  const btn     = document.getElementById('dgToggle');
  const body    = document.getElementById('dgBody');
  const section = document.getElementById('recommend');
  if (!btn || !body) return;

  function syncOpen(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.hidden = !open;
    if (section) section.classList.toggle('dg-open', open);
  }

  btn.addEventListener('click', () => {
    syncOpen(btn.getAttribute('aria-expanded') !== 'true');
  });

  syncOpen(false); // 초기 접힘
})();


/* =========================
   # HERO MEETING BUTTON
========================= */

(function initHeroMeetingBtn() {
  const btn = document.getElementById('heroMeetingBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.CottageDB?.trackEvent('home_meeting_main_click');
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

let _plannerPendingDate = null; // mpeGoPlanner 클릭 → 프레임 준비 전 대기 날짜
let _plannerPendingEdit = null; // 홈 수정 버튼 → 프레임 준비 전 대기 날짜
let _meetingDirty  = false;    // 플래너에서 저장 완료 신호 수신 → closeModal 시 재조회
let _meetingReload = null;     // initMeetingSection이 loadWeek 참조를 주입

// 모임보드 게임 목록 인원조건 select(kakao-auth.js)에서 바로 반영 — 홈 미리보기는
// dayVotes/dayGames를 초기 로드 시점 값으로만 렌더해 별도 갱신 신호 없이는 갱신 안 됨.
window.addEventListener('cottage-meeting-changed', () => { _meetingReload?.(); });

(function initPlannerModal() {
  const modal    = document.getElementById('plannerSheetModal');
  const frame    = document.getElementById('plannerSheetFrame');
  const dim      = document.getElementById('plannerSheetDim');
  const closeBtn = document.getElementById('plannerSheetClose');
  const openBtn  = document.getElementById('openPlannerBtn');
  const loader   = document.getElementById('plannerSheetLoader');
  if (!modal || !openBtn) return;

  let preloaded = false;
  // 활성 뷰 체류시간 추적(3차) — club-schedule.html?embed=true를 iframe으로 보여주는 홈 전용
  // 모달. day-detail.js의 #__plannerModal(같은 iframe 소스, 다른 진입점)과 같은 이유로
  // 'planner-register' 키를 공유한다 — 등록/수정 빠른진입뿐 아니라 주간뷰만 보는 일반 오픈도
  // "플래너를 보고 있다"는 점은 같아 굳이 키를 더 쪼개지 않는다(reveal 지점이 두 곳 — 일반
  // openModal / 빠른진입 cottage-sheet-shown — 이라 active 플래그로 재-push을 막는다).
  let _viewToken = null;
  let _viewActive = false;
  function _ensureView() { if (_viewActive) return; _viewActive = true; _viewToken = window.pushActiveView?.('planner-register') ?? null; }
  function _popView() { if (!_viewActive) return; window.popActiveView?.(_viewToken); _viewActive = false; _viewToken = null; }

  function preload() {
    if (preloaded) return;
    preloaded = true;
    frame.src = './pages/club/club-schedule.html?embed=true';
  }
  window.addEventListener('kakao-auth-ready', preload);

  function openModal(skipReset) {
    // 정상(주간뷰) 오픈 — 이전 빠른진입 잔여 상태 정리. (닫기에선 안 뗀다: 닫기 페이드 중
    // is-quick-entry가 빠지면 패널이 흰 480px 박스로 되돌아가 깜빡이므로, 정리는 여기서만.)
    modal.classList.remove('is-quick-entry');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _ensureView();
    if (frame.classList.contains('is-ready')) {
      if (!skipReset) frame.contentWindow?.postMessage({ type: 'cottage-reset-week', offset: 0 }, '*');
    } else {
      if (loader) loader.style.display = 'flex';
      if (!preloaded) preload();
    }
  }

  // 등록/수정 진입 전용 — 주간 뷰 카드 없이 등록 시트만 전체화면으로 보여주고,
  // 시트가 실제로 뜬 뒤(cottage-sheet-shown)에만 드러낸다. 시트를 닫으면
  // 돌아갈 주간 뷰가 없으므로 플래너 자체를 닫는다(cottage-quick-entry-closed).
  let _awaitingSheetReveal = false;
  window.__openPlannerFor = function (dateStr, isEdit) {
    window.CottageDB?.trackEvent('home_meeting_planner_click');
    _awaitingSheetReveal = true;
    modal.classList.add('is-quick-entry');
    // 실제 로컬 환경에서 iframe 준비/DB 조회가 늦으면 cottage-sheet-shown 전까지 부모 모달이
    // 완전히 숨겨져 클릭이 무시된 것처럼 보였다. 클릭 즉시 투명 quick-entry 위에 로더를
    // 드러내고, 등록 시트가 준비되면 같은 자리에서 교체한다.
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    if (loader) loader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _ensureView();
    if (!preloaded) preload();
    const type = isEdit ? 'cottage-edit' : 'cottage-register';
    if (frame.classList.contains('is-ready')) {
      frame.contentWindow?.postMessage({ type, date: dateStr }, '*');
    } else if (isEdit) {
      _plannerPendingEdit = dateStr;
    } else {
      _plannerPendingDate = dateStr;
    }
  };
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    // ⚠️ is-quick-entry는 여기서 제거하지 말 것 — is-open 제거는 opacity 0.25s로 페이드되는데,
    //    그 사이 is-quick-entry가 빠지면 .planner-sheet-panel이 흰 480px 박스(background:#fff)로
    //    되돌아가 슬라이드·페이드하며 "플래너 모달이 켜졌다 꺼짐". 정리는 openModal(정상 오픈)에서.
    document.body.style.overflow = '';
    _popView();
    if (_meetingDirty) { _meetingDirty = false; _meetingReload?.(); }
  }

  // 🚨 e.source가 이 iframe(frame)이 맞는지 반드시 먼저 확인한다 — day-detail.js가
  // 「이날 모임 상세」 등록 버튼용으로 club-schedule.html?embed=true를 여는 **별도의
  // 독립 iframe**(window.openPlannerModal, #__plannerModal)을 똑같이 띄우는데, 그쪽도
  // 똑같은 cottage-planner-ready/cottage-sheet-shown을 window.parent로 쏜다. 이 검사가
  // 없으면 그 iframe이 준비됐다는 신호에 **이 홈 전용 미리로드 패널(#plannerSheetModal)이
  // 엉뚱하게 열려**, 아무 날짜도 지시받지 못한 빈(주간뷰 로딩 중) 박스가 진짜 등록 시트
  // 위에 겹쳐 뜬다(2026-07-29 사용자가 스크린샷으로 잡은 "흰 빈 배경 모달").
  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow) return;
    if (e.data?.type === 'cottage-planner-ready') {
      frame.classList.add('is-ready');
      if (loader && !_awaitingSheetReveal) loader.style.display = 'none';
      if (_plannerPendingDate) {
        const ds = _plannerPendingDate;
        _plannerPendingDate = null;
        frame.contentWindow?.postMessage({ type: 'cottage-register', date: ds }, '*');
      } else if (_plannerPendingEdit) {
        const ds = _plannerPendingEdit;
        _plannerPendingEdit = null;
        frame.contentWindow?.postMessage({ type: 'cottage-edit', date: ds }, '*');
      }
    }
    if (e.data?.type === 'cottage-meeting-saved') {
      _meetingDirty = true;
    }
    if (e.data?.type === 'cottage-sheet-shown' && _awaitingSheetReveal) {
      _awaitingSheetReveal = false;
      if (loader) loader.style.display = 'none';
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      _ensureView();
    }
    if (e.data?.type === 'cottage-quick-entry-closed') {
      closeModal();
    }
  });

  openBtn.addEventListener('click', () => { window.CottageDB?.trackEvent('home_meeting_planner_click'); openModal(); });
  dim.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();


(async function initMeetingSection() {
  const statusEl  = document.getElementById('meetingStatusMsg');
  const daysEl    = document.getElementById('meetingDays');
  const previewEl = document.getElementById('meetingPreview');
  if (!statusEl || !daysEl) return;

  function getWeekRange(offset) {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon + offset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = d => toDateStr(d);
    return { start: fmt(mon), end: fmt(sun), monDate: mon };
  }

  // updateNav()의 주간 네비 라벨과 같은 문구 — 사본을 두지 않고 여기 하나만 쓴다(#15류 방지).
  function _weekSuffix(weekOffset) {
    return weekOffset === 0  ? '이번주'
         : weekOffset === 1  ? '다음주'
         : weekOffset === -1 ? '지난주'
         : weekOffset > 0    ? `${weekOffset}주 후`
         :                     `${Math.abs(weekOffset)}주 전`;
  }

  // weekOffset을 안 받던 시절엔 지난주·다음주를 봐도 무조건 "이번주 모임 진행 중"이라고
  // 떴다(2026-08-02 사용자 지적 — 이미 끝난 주인데 "진행 중", 다음주인데도 "이번주").
  // 과거/현재/미래를 나눠 시제와 라벨을 맞춘다. 현재 주(weekOffset===0)는 기존 문구 그대로.
  //
  // 🚨 실제 "모임"은 같은 날 2명 이상이 모여야 성사된다(2026-08-02, 사용자 예시: 월 1명+수
  // 1명=총 2명이지만 어느 날도 안 뭉쳐서 모임이 아님). maxDayCount(하루 최댓값)가 2 미만이면
  // 총원이 몇이든 "모였다/진행 중/진행 예정"으로 부풀리지 않는다 — 과거는 "없었어요", 현재·
  // 미래는 총원 기준 "기다리고 있어요"(약한 신호, 관심은 있으나 아직 안 뭉침)로 낮춘다.
  function getMeetingStatusMsg(count, weekOffset = 0, maxDayCount = 0) {
    const label = _weekSuffix(weekOffset);
    const clustered = maxDayCount >= 2; // 최소 하루에 2명 이상 뭉쳤는가
    if (weekOffset < 0) {
      if (!clustered) return `📭 ${label}엔 함께한 판이 없었어요`;
      return `✅ ${label}엔 ${count}명이 함께했어요`;
    }
    if (weekOffset > 0) {
      if (count === 0) return `🎲 ${label}, 함께할 사람을 기다려요`;
      if (!clustered) return `${count === 1 ? '🙋' : '👥'} ${label}에 ${count}명이 함께할 사람을 기다리고 있어요`;
      return `📅 ${label} 모임에 ${count}명이 함께할 예정이에요`;
    }
    if (count === 0) return '🎲 이번주, 함께할 사람을 기다려요';
    if (!clustered) return `${count === 1 ? '🙋' : '👥'} ${count}명이 함께할 사람을 기다리고 있어요`;
    if (count === 3) return '🎲 3명이 모였어요';
    return '🔥 이번주 함께할 판이 열렸어요';
  }

  // 상태 메시지가 뜨는 모든 인원수에서 반짝임 — 모임 요일칩(has-vote)과 같은 정도로 항상 강조.
  // 단, 지난주(이미 끝난 일)는 반짝일 이유가 없어 현재·미래 주만 켠다(2026-08-02).
  function isGlowworthyMeetingCount(count, weekOffset = 0) {
    return weekOffset >= 0;
  }

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  // 날짜별 참여 인원은 등록 행 수가 아니라 등록자 본인 + 동반 인원 합계다.
  // 상단 요일 탭과 상태 판정이 같은 공용 규칙을 사용하도록 한 곳에서 위임한다.
  function partyCount(votes) {
    return window.CottageDB?.sumPartySize?.(votes) ?? (votes ? votes.length : 0);
  }

  function renderPreview(dateStr, dayVotes, dayGames) {
    if (!previewEl) return;
    // 지난 날짜는 등록 진입을 렌더하지 않는다 — 플래너 iframe이 `ds >= 오늘`에서
    // 조용히 버려(club-schedule.html) 눌러도 모달조차 안 떴다. 보기는 그대로 허용.
    const isPastDate = dateStr < toDateStr(new Date());
    if (!dayVotes.length) {
      previewEl.innerHTML = `<div class="meeting-preview-empty">
        <div class="mpe-msg">${isPastDate ? '이날은 모임이 없었어요' : '아직 모임이 없어요'}</div>
        ${isPastDate ? '' : `<button class="mpe-link" type="button" id="mpeGoPlanner">+ 플래너에서 등록하기</button>`}
      </div>`;
      document.getElementById('mpeGoPlanner')?.addEventListener('click', () => {
        window.__openPlannerFor?.(dateStr);
      });
      return;
    }
    const _me     = window.getKakaoUser?.();
    const myVote  = _me ? dayVotes.find(v => String(v.user_id) === String(_me.id)) ?? null : null;

    const actionsHtml = (myVote || isPastDate)
      ? `<button class="mpc-detail-btn" type="button">이날 모임 상세 →</button>`
      : `<div class="mpc-actions-split">
          <button class="mpc-register-btn" type="button">+ 이날 함께하기</button>
          <button class="mpc-detail-btn" type="button">이날 모임 상세 →</button>
        </div>`;

    previewEl.innerHTML = `<div class="meeting-preview-card" role="button" tabindex="0">
      ${window.buildBarsInCard(dayVotes, dayGames, myVote)}
      ${actionsHtml}
    </div>`;

    function openMeetingDetail() {
      window.CottageDB?.trackEvent('home_meeting_preview_card_click');
      // 등록/수정 진입 버튼은 이제 openDateMeetingModal이 자체적으로 그려서 처리한다
      // (day-detail.js — 저장 후 이 모달로 복귀하는 onDirtyClose까지 자체 완결).
      window.openDateMeetingModal?.(dateStr, dayVotes, dayGames, { fromHome: true });
    }

    previewEl.querySelector('.mpc-detail-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      openMeetingDetail();
    });

    previewEl.querySelector('.mpc-register-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      window.__openPlannerFor?.(dateStr);
    });

    previewEl.querySelectorAll('.sched-card-more-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const hiddenEl   = btn.previousElementSibling;
        const isExpanded = hiddenEl.style.display !== 'none';
        hiddenEl.style.display = isExpanded ? 'none' : '';
        const hiddenCnt  = hiddenEl.querySelectorAll('.sched-bar-item').length;
        btn.textContent  = isExpanded ? `+${hiddenCnt}명 더보기` : '접기 ▴';
      });
    });

    previewEl.querySelectorAll('.sched-bar-item[data-date][data-uid]').forEach(card => {
      const openParticipant = e => {
        if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
        if (e.type === 'keydown' && e.target !== card) return;
        if (e.target.closest('button, a, input, select, textarea, .dd-game-hit')) return;
        e.preventDefault();
        e.stopPropagation();
        const uid  = card.dataset.uid;
        const date = card.dataset.date;
        window.CottageDB?.trackEvent('meeting_planner_bar_click', { date, user_id: uid });
        window.openDateScheduleModal?.(uid, date, { onDirtyClosed: () => _meetingReload?.() });
      };
      card.addEventListener('click', openParticipant);
      card.addEventListener('keydown', openParticipant);
    });

    previewEl.querySelectorAll('.sched-bar-edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const ds = btn.closest('.sched-bar-item')?.dataset.date;
        if (!ds) return;
        window.__openPlannerFor?.(ds, true);
      });
    });

    previewEl.querySelectorAll('.sched-bar-del-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const ds = btn.closest('.sched-bar-item')?.dataset.date;
        if (!ds) return;
        if (!confirm('참여를 취소할까요?')) return;
        const me = window.getKakaoUser?.();
        if (!me) return;
        const result = await window.CottageDB?.deleteMeetingVote(String(me.id), ds);
        if (result?.success) {
          _meetingReload?.();
        } else {
          alert('취소 중 오류가 발생했어요.');
        }
      });
    });

    // 「하고 싶은/배우고 싶은 게임」 썸네일 클릭 → 게임시트 (2026-07-27, 예전엔 안 뚫려 있었음)
    window._bindDdGameHitClicks?.(previewEl);

    previewEl.querySelector('.meeting-preview-card')?.addEventListener('click', openMeetingDetail);
  }

  // 주 네비게이션 상태 및 UI
  let weekOffset = 0;
  let selectedDate = null; // loadWeek()가 재호출돼도(조건 변경 등) 사용자가 고른 탭 유지. weekOffset 바뀌면 dateKeys에 없어져 자동 재계산됨.
  const navEl = document.createElement('div');
  navEl.className = 'meeting-week-nav';
  daysEl.parentNode.insertBefore(navEl, daysEl);

  function updateNav() {
    const { start, end } = getWeekRange(weekOffset);
    const s = start.slice(5).replace('-', '/');
    const e = end.slice(5).replace('-', '/');
    const suffix = _weekSuffix(weekOffset);
    navEl.innerHTML = `
      <button class="mwn-btn" type="button" data-dir="prev">◀ 이전주</button>
      <span class="mwn-label">${s} ~ ${e} · ${suffix}</span>
      <button class="mwn-btn" type="button" data-dir="next">다음주 ▶</button>
    `;
    navEl.querySelectorAll('.mwn-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        weekOffset += dir === 'next' ? 1 : -1;
        window.CottageDB?.trackEvent('home_meeting_week_nav', { direction: dir, offset: weekOffset });
        loadWeek();
      });
    });
  }

  async function loadWeek() {
    updateNav();
    const { start, end, monDate } = getWeekRange(weekOffset);
    const todayStr = toDateStr(new Date());

    statusEl.textContent = '불러오는 중...';
    daysEl.innerHTML = '';
    if (previewEl) previewEl.innerHTML = '';

    try {
      let [votes, voteGames] = await Promise.all([
        window.CottageDB?.getMeetingVotes(start, end) ?? [],
        window.CottageDB?.getMeetingVoteGames(start, end) ?? [],
      ]);
      if (!votes) { statusEl.textContent = getMeetingStatusMsg(0, weekOffset); statusEl.classList.toggle('is-glow', isGlowworthyMeetingCount(0, weekOffset)); return; }

      // [DEV] localhost ?dev=N — 메모리 더미 주입 (이번주만)
      const _devN = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? parseInt(new URLSearchParams(location.search).get('dev') || '0') : 0;
      if (_devN >= 2 && weekOffset === 0) {
        const tgt = new Date(monDate);
        tgt.setDate(monDate.getDate() + 1); // 이번주 화요일 고정
        const tgtStr = toDateStr(tgt);
        const NAMES = ['더미1','더미2','더미3','더미4','더미5','더미6','더미7'];
        const TIMES = [[10,15],[9,12],[12,17],[14,19],[16,21],[18,23],[9,23]];
        const WANT  = [
          { name: '아르낙',     id: null },
          { name: '윙스팬',     id: null },
          { name: '에버델',     id: null },
          { name: null,        id: '227935' },
          { name: '글룸헤이븐', id: null },
          { name: '브라스',     id: null },
          { name: '파운더스',   id: null },
        ];
        const LEARN = ['글룸헤이븐','루트','추산도','퀄라나리','팬데믹','윙스팬','아크노바'];
        for (let _i = 0; _i < Math.min(_devN - 1, NAMES.length); _i++) {
          const uid = `dev_u${_i + 2}`;
          votes = [...votes, { vote_date: tgtStr, user_id: uid, nickname: NAMES[_i], time_start: TIMES[_i][0], time_end: TIMES[_i][1] }];
          const w0 = WANT[_i], w1 = WANT[_i + 1];
          voteGames = [...voteGames,
            { vote_date: tgtStr, user_id: uid, list_type: 'want',  game_id: w0.id,  custom_name: w0.name },
            ...(LEARN[_i] ? [{ vote_date: tgtStr, user_id: uid, list_type: 'learn', game_id: null, custom_name: LEARN[_i] }] : []),
            ...(w1        ? [{ vote_date: tgtStr, user_id: uid, list_type: 'want',  game_id: w1.id, custom_name: w1.name }]  : []),
          ];
        }
      }

      const byDate = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(monDate);
        d.setDate(monDate.getDate() + i);
        byDate[toDateStr(d)] = [];
      }
      // 날짜별 vote 행을 그대로 담는다 — 인원은 sumPartySize(동반 인원 포함)로 세므로 Set(user_id)로 접지 않는다
      votes.forEach(v => { if (byDate[v.vote_date]) byDate[v.vote_date].push(v); });

      // 이번주 인원 = 등록자 + 동반 인원 (유저별 최대치 합산 — 공용 헬퍼가 규칙의 단일 출처)
      const weekPeople = window.CottageDB?.sumWeeklyPartySize?.(votes)
        ?? new Set(votes.map(v => String(v.user_id))).size;
      // 실제 "모임"은 같은 날 2명 이상이 모여야 성사된다(2026-08-02 사용자 지적) — 요일이
      // 갈려 있으면(월 1명+수 1명=총 2명) 총원은 2여도 아무 날도 안 뭉쳐 모임이 아니다.
      // 요일칩 인원수(mdc-count)와 같은 sumPartySize를 하루 단위로 재사용해 최댓값을 구한다.
      const maxDayCount = Math.max(0, ...Object.values(byDate).map(partyCount));
      statusEl.textContent = getMeetingStatusMsg(weekPeople, weekOffset, maxDayCount);
      statusEl.classList.toggle('is-glow', isGlowworthyMeetingCount(weekPeople, weekOffset));

      const dateKeys = Object.keys(byDate).sort();

      // 초기 선택(또는 이전 선택이 이번주 범위 밖이 됐을 때만 재계산): 오늘 이후 vote 있는 가장 빠른 날 → 없으면 오늘 이후 첫 날
      if (selectedDate == null || !dateKeys.includes(selectedDate)) {
        selectedDate = dateKeys.find(d => d >= todayStr && byDate[d].length > 0)
          || dateKeys.find(d => d >= todayStr)
          || dateKeys[0];
      }

      // 다가오는 가장 빠른 일정 — 클릭으로 바뀌는 is-selected와 별개로 고정. 사용자가 다른 요일을 눌러도
      // 이 칩의 강조는 그대로 남아야 "가장 빠른 일정"이라는 의미가 유지된다.
      const earliestVoteDate = dateKeys.find(d => d >= todayStr && byDate[d].length > 0) || null;

      function renderChips() {
        daysEl.innerHTML = dateKeys.map((ds, i) => {
          const cnt = partyCount(byDate[ds]);
          const hasVote  = cnt > 0;
          const isPast   = ds < todayStr;
          const isSelected = ds === selectedDate;
          const isEarliest = ds === earliestVoteDate;
          let cls = 'meeting-day-chip';
          if (hasVote)    cls += ' has-vote';
          if (isPast)     cls += ' is-past';
          if (isSelected) cls += ' is-selected';
          if (isEarliest) cls += ' is-earliest';
          return `<div class="${cls}" data-date="${ds}">
            <span class="mdc-day">${DAY_LABELS[i]}</span>
            <span class="mdc-count">${hasVote ? cnt + '명' : '-'}</span>
          </div>`;
        }).join('');

        daysEl.querySelectorAll('.meeting-day-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            window.CottageDB?.trackEvent('home_meeting_date_preview_click');
            selectedDate = chip.dataset.date;
            daysEl.querySelectorAll('.meeting-day-chip').forEach(c =>
              c.classList.toggle('is-selected', c.dataset.date === selectedDate)
            );
            renderPreview(
              selectedDate,
              votes.filter(v => v.vote_date === selectedDate),
              voteGames.filter(g => g.vote_date === selectedDate),
            );
          });
        });
      }

      renderChips();
      renderPreview(
        selectedDate,
        votes.filter(v => v.vote_date === selectedDate),
        voteGames.filter(g => g.vote_date === selectedDate),
      );
    } catch (err) {
      console.error('[홈 이번주 모임 미리보기]', err);
      statusEl.textContent = '🎲 이번주, 함께할 사람을 기다려요';
    }
  }

  _meetingReload = loadWeek;
  await loadWeek();
})();
