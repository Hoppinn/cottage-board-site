/* =========================
   # COTTAGEBOARD FRONT SCRIPT
   - nested gameData schema 기준
   - assets/js/view/game-view-utils.js 필요
========================= */

/* R11c(GS2): 파일 전체를 IIFE로 감싼다.
   내부 헬퍼 60개·모듈 상태는 은닉하고, 하단에서 공개 API(함수 39 + 크로스파일 const 2 + gameSheet getter)만 명시 노출한다. */
(function () {

const GameView = window.CottageGameView;

if (!GameView) {
  console.warn(
    "CottageGameView가 로드되지 않았습니다. assets/js/game-display-adapter.js를 script.js보다 먼저 불러오세요."
  );
}

const DEFAULT_GAME_IMAGE =
  `${rootPath}assets/images/main/hero.png`;


/* # DIFFICULTY SYSTEM — game-display-adapter.js로 이관(GS7).
   getDifficultyData/normalizeLevelValue + DIFFICULTY_LEVELS/UNKNOWN는 이제
   CottageGameView(=GameView) 네임스페이스. 이 파일 내부는 GameView.getDifficultyData 사용. */


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
  const id = game?.cottage?.shelfGroupId;
  if (id === '협력') {
    const w = game?.bgg?.weight;
    return (w && w >= 2.5) ? '어려운 협력게임' : '쉬운 협력게임';
  }
  return (
    game?.cottage?.shelfLabel ||
    id ||
    "-"
  );
}

// 카드용 위치 span (특수 상태면 배지, 아니면 📦 위치)
function getShelfSpanHtml(game){
  const loc = game?.cottage?.shelfGroupId || "";
  if (loc === "배송중")          return '<span class="avail-shipping">🚚 배송중</span>';
  if (loc === "구매예정")        return '<span class="avail-pending">🛒 구매예정</span>';
  if (loc === "발매후 도착예정") return '<span class="avail-preorder">⏳ 발매후 도착예정</span>';
  const label = getGameShelfLabel(game);
  return label && label !== "-" ? `<span>📦 ${label}</span>` : "";
}

// 검색 자동완성용 소형 배지
function getAvailBadgeHtml(game){
  const loc = game?.cottage?.shelfGroupId || "";
  if (loc === "배송중")          return '<span class="avail-badge-sm avail-shipping">🚚 배송중</span>';
  if (loc === "구매예정")        return '<span class="avail-badge-sm avail-pending">🛒 구매예정</span>';
  if (loc === "발매후 도착예정") return '<span class="avail-badge-sm avail-preorder">⏳ 발매후 도착예정</span>';
  return "";
}

// 모달용 이용 가능 상태 배지
function getAvailNoticHtml(game){
  const loc = game?.cottage?.shelfGroupId || "";
  if (loc === "배송중")
    return '<p class="sheet-avail-notice sheet-avail-notice--shipping">🚚 배송중 · 아직 매장에 입고되지 않았습니다</p>';
  if (loc === "구매예정")
    return '<p class="sheet-avail-notice sheet-avail-notice--pending">🛒 구매예정 · 아직 구매되지 않았습니다</p>';
  if (loc === "발매후 도착예정")
    return '<p class="sheet-avail-notice sheet-avail-notice--preorder">⏳ 발매후 도착예정 · 선주문 완료, 발매 후 도착 예정입니다</p>';
  return "";
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
   # GAME SHEET
========================= */

let gameSheet =
  document.querySelector('#gameSheet');

let gameSheetContent =
  document.querySelector('#gameSheetContent');

let closeGameSheetButton =
  document.querySelector('#closeGameSheetButton');

let closeGameSheetDim =
  document.querySelector('#closeGameSheetDim');

function ensureGameSheet() {
  if (document.getElementById('gameSheet')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = '<div class="game-sheet" id="gameSheet"><div class="game-sheet-dim" id="closeGameSheetDim"></div><div class="game-sheet-panel"><button aria-label="게임 정보 닫기" class="game-sheet-close" id="closeGameSheetButton" type="button">✕</button><div class="game-sheet-scroll"><div id="gameSheetContent"></div></div></div></div>';
  document.body.appendChild(wrap.firstChild);
  gameSheet          = document.getElementById('gameSheet');
  gameSheetContent   = document.getElementById('gameSheetContent');
  closeGameSheetButton = document.getElementById('closeGameSheetButton');
  closeGameSheetDim  = document.getElementById('closeGameSheetDim');
  closeGameSheetButton.addEventListener('click', closeGameSheet);
  closeGameSheetDim.addEventListener('click', closeGameSheet);
}

let _currentSheetGameKey = null;
let _savedSheetScrollTop = 0;
let _gameSheetHistory = [];
let _gameSheetNavBack = false;
let _savedBodyScrollY = 0;

function _openCoverModal(src) {
  document.getElementById('coverModal')?.remove();
  const m = document.createElement('div');
  m.id = 'coverModal';
  m.style.cssText = 'position:fixed;inset:0;z-index:9650;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;';
  m.innerHTML = `<img src="${src}" style="max-width:90%;max-height:85vh;object-fit:contain;border-radius:12px;" onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';">
    <button aria-label="표지 크게 보기 닫기" onclick="document.getElementById('coverModal')?.remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;width:36px;height:36px;border-radius:50%;cursor:pointer;line-height:1;">✕</button>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
}

function _openOrganizerLightbox(urls, gameName) {
  if (!urls?.length || !window.openLightbox) return;
  const captions = urls.map(() => `${gameName} 정리법`);
  window.openLightbox(urls, 0, { captions });
}

function _openRuleNoteModal(text, gameName) {
  if (!text) return;
  document.getElementById('ruleNoteModal')?.remove();
  const m = document.createElement('div');
  m.id = 'ruleNoteModal';
  m.style.cssText = 'position:fixed;inset:0;z-index:9650;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px;';
  m.innerHTML = `<div style="background:#fff;border-radius:12px;max-width:480px;max-height:80vh;overflow-y:auto;padding:20px;position:relative;">
    <button aria-label="룰 설명 닫기" onclick="document.getElementById('ruleNoteModal')?.remove()" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:20px;cursor:pointer;line-height:1;">✕</button>
    <h3 style="margin:0 0 12px;padding-right:28px;">${window.escH(gameName)} 룰 설명</h3>
    <p style="white-space:pre-wrap;margin:0;line-height:1.6;">${window.escH(text)}</p>
  </div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
}

function openShelfSheet(url) {
  document.getElementById('shelfSheetOverlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'shelfSheetOverlay';
  overlay.className = 'shelf-sheet-overlay';
  overlay.innerHTML = `
    <div class="shelf-sheet-box">
      <div class="shelf-sheet-header">
        <button class="shelf-sheet-back" type="button">&#8592;</button>
        <span class="shelf-sheet-title">게임 위치</span>
      </div>
      <iframe class="shelf-sheet-iframe" src="${url}"></iframe>
    </div>`;
  document.body.appendChild(overlay);

  // ← 뒤로가기: 선반 닫고 직전 게임시트 복원
  const prevGameKey = (typeof _currentSheetGameKey !== 'undefined') ? _currentSheetGameKey : null;
  overlay.querySelector('.shelf-sheet-back').addEventListener('click', () => {
    overlay.remove();
    if (prevGameKey) openGameSheet(prevGameKey);
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  function registerMsg() { window.addEventListener('message', handleShelfMsg); }
  function handleShelfMsg(e) {
    if (e.data?.action !== 'openGame' || !e.data?.gameId) return;
    window.removeEventListener('message', handleShelfMsg);

    overlay.style.zIndex = '0';
    overlay.style.pointerEvents = 'none';
    openGameSheet(decodeURIComponent(e.data.gameId));

    const gsEl = document.getElementById('gameSheet');
    if (gsEl) {
      const obs = new MutationObserver(() => {
        if (!gsEl.classList.contains('is-active')) {
          obs.disconnect();
          overlay.style.zIndex = '9600';
          overlay.style.pointerEvents = '';
          registerMsg();
        }
      });
      obs.observe(gsEl, { attributes: true, attributeFilter: ['class'] });
    } else {
      overlay.remove();
    }
  }
  registerMsg();
}

function goBackGameSheet() {
  if (_gameSheetHistory.length === 0) return;
  const prev = _gameSheetHistory.pop();
  _gameSheetNavBack = true;
  openGameSheet(prev);
}

// 같은 디자이너 다른 게임 — gameData 전체를 훑어 designer 교집합을 찾는다.
// 시트 표시 + 스크롤 복원 + 서브위젯 초기화 (openGameSheet의 마지막 단계)
function _openAndInitSheet(gameKey, restoreScroll, noAnim) {
  _savedBodyScrollY = window.scrollY;
  // noAnim: 뒤로가기 복귀(backTo)는 "원래 있던 시트로 돌아가는" 것이라 sheetUp(아래에서 올라옴)을
  // 재생하면 새 시트가 열리는 것처럼 보인다. 시트는 display:none↔block이라 켤 때마다 애니메이션이
  // 무조건 재생되므로 클래스로 억제. 새로 여는 경우는 종전대로 올라온다.
  gameSheet.classList.toggle('no-anim', !!noAnim);
  gameSheet.classList.add('is-active');
  document.body.classList.add('sheet-open');

  const _panel = gameSheet.querySelector('.game-sheet-scroll');
  requestAnimationFrame(() => {
    if (_panel) _panel.scrollTop = restoreScroll ? _savedSheetScrollTop : 0;
  });

  if (window.CottageDB) window.CottageDB.trackView(gameKey);
  initStickyBar();
  initSheetDescToggle();
  initSheetMechsToggle();
  // 래퍼가 쿼리 오류는 내부에서 로그함(2단계). 여기 catch는 init 함수 렌더 로직의 JS 예외를 삼키던 자리
  initSheetLikes(gameKey).catch(err => console.error('[initSheetLikes]', err));
  initSheetCommentsPreview(gameKey).catch(err => console.error('[initSheetCommentsPreview]', err));
  initSheetPlayPreview(gameKey).catch(err => console.error('[initSheetPlayPreview]', err));
  initSheetPhotoPreview(gameKey).catch(err => console.error('[initSheetPhotoPreview]', err));

  // ?scroll=comments → 코멘트 섹션으로 스크롤
  const _scrollParam = new URLSearchParams(location.search).get('scroll');
  if (_scrollParam === 'comments') {
    setTimeout(() => {
      const panel = gameSheet.querySelector('.game-sheet-scroll');
      const commentsEl = document.getElementById(`sheetCommentsList-${gameKey}`);
      if (panel && commentsEl) panel.scrollTo({ top: commentsEl.offsetTop - 20, behavior: 'smooth' });
    }, 400);
  }
}

// 게임평/사진/플레이기록 미리보기 3종 + 기록페이지 링크. gameKey만 필요.
function _buildSheetRecordsHtml(gameKey) {
  return `
    <!-- 기록 섹션 그룹 -->
    <div class="sheet-records-group">

      <!-- 게임평 미리보기 -->
      <div class="sheet-preview-section">
        <div class="sheet-preview-hd">
          <span class="sheet-preview-label" id="sheetPreviewCommentLabel-${gameKey}">게임평</span>
        </div>
        <div class="sheet-preview-body" id="sheetCommentsPreview-${gameKey}">
          <span class="sheet-comments-empty">불러오는 중...</span>
        </div>
      </div>

      <!-- 사진 미리보기 -->
      <div class="sheet-preview-section">
        <div class="sheet-preview-hd">
          <span class="sheet-preview-label" id="sheetPreviewPhotoLabel-${gameKey}">사진</span>
        </div>
        <div class="sheet-preview-body" id="sheetPhotoPreview-${gameKey}">
          <span class="sheet-comments-empty">불러오는 중...</span>
        </div>
      </div>

      <!-- 플레이기록 미리보기 -->
      <div class="sheet-preview-section">
        <div class="sheet-preview-hd">
          <span class="sheet-preview-label" id="sheetPreviewPlayLabel-${gameKey}">플레이기록</span>
        </div>
        <div class="sheet-preview-body" id="sheetPlayPreview-${gameKey}">
          <span class="sheet-comments-empty">불러오는 중...</span>
        </div>
      </div>

      <button class="sheet-records-all-btn" type="button" onclick="openGameRecordSheet('${gameKey}')">기록 페이지에서 보기 &amp; 남기기 →</button>
    </div>
`;
}

// 좋아요/궁금해요 버튼 + 사용자 패널. gameKey만 필요.
function _buildSheetReactionsHtml(gameKey) {
  return `
    <div class="sheet-feedback-reactions">
      <div class="sheet-reaction-group">
        <div class="sheet-reaction-btn-wrap" id="sheetLikeBtnWrap">
          <div class="sheet-reaction-btn-row">
            <button class="sheet-reaction-btn" id="sheetLikeBtn" data-game-id="${gameKey}" onclick="onSheetLike(this)" aria-label="좋아요">👍 좋아요 0</button>
            <button class="sheet-reaction-expand-btn" id="sheetLikeExpandBtn" type="button" aria-label="좋아요한 사람 보기">▾</button>
          </div>
          <div class="sheet-reaction-users-panel" id="sheetLikerPanel"></div>
        </div>
      </div>
      <div class="sheet-reaction-group">
        <div class="sheet-reaction-btn-wrap" id="sheetCuriousBtnWrap">
          <div class="sheet-reaction-btn-row">
            <button class="sheet-reaction-btn" id="sheetCuriousBtn" data-game-id="${gameKey}" onclick="onSheetCurious(this)" aria-label="궁금해요">🤔 궁금해요 0</button>
            <button class="sheet-reaction-expand-btn" id="sheetCuriousExpandBtn" type="button" aria-label="궁금해요한 사람 보기">▾</button>
          </div>
          <div class="sheet-reaction-users-panel" id="sheetCuriousPanel"></div>
        </div>
      </div>
    </div>
`;
}

// 메커니즘·테마·디자이너 블록.
function _buildSheetMechsHtml(detail, mechanicsDisplay, categoriesDisplay) {
  return mechanicsDisplay.length || categoriesDisplay.length || detail.bgg.designers?.length ? `
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
    ` : "";
}

function _buildSameDesignerHtml(gameKey, detail) {
  const _sameDesignGames = [];
  if (detail.bgg?.designers?.length && window.gameData) {
    const _dSet = new Set(detail.bgg.designers);
    for (const [_k, _g] of Object.entries(window.gameData)) {
      if (_k === gameKey) continue;
      if (_g.bgg?.designers?.some(d => _dSet.has(d))) {
        _sameDesignGames.push({ key: _k, g: _g });
      }
    }
  }
  return _sameDesignGames.length ? `
    <div class="sheet-same-designer sheet-info-group">
      <p class="sheet-meta-label" style="margin-bottom:8px">같은 디자이너의 다른 게임</p>
      <div class="sheet-same-design-scroll">
        ${_sameDesignGames.map(({ key: _k, g: _g }) => {
          const _title = _g.title?.display || _g.title?.owned || _k;
          const _img = getGameDetailImage(_g);
          const _safeTitle = window.escH(_title);
          const _safeKey = String(_k).replace(/'/g,"\\'");
          const _safeFromKey = String(gameKey).replace(/'/g,"\\'");
          return `<button class="sheet-same-design-card" type="button" onclick="openGameSheet('${_safeKey}', false, '${_safeFromKey}')">
            <img class="sheet-same-design-thumb" src="${_img}" alt="${_safeTitle}" onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';">
            <span class="sheet-same-design-title">${_safeTitle}</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : '';
}

function openGameSheet(gameKey, restoreScroll = false, fromKey = null, noAnim = false){
  if (_gameSheetNavBack) {
    _gameSheetNavBack = false;
  } else if (fromKey) {
    _gameSheetHistory.push(fromKey);
  } else if (!restoreScroll) {
    _gameSheetHistory = [];
  }
  _currentSheetGameKey = gameKey;
  const game =
    window.gameData?.[gameKey];

  if(
    !gameSheet ||
    !gameSheetContent
  ){
    return;
  }

  // 미보유 게임(gameData 없음): 정보시트가 없으므로 기록시트로 라우팅
  if (!game) {
    if (typeof gameKey === 'string' && gameKey) {
      return openGameRecordSheet(gameKey);
    }
    return;
  }

  onCloseCommentModal();
  onClosePhotoModal();
  _closeAllMoreMenus();

  const detail =
    GameView.getGameDetailData(game);

  const difficulty =
    GameView.getDifficultyData(detail.difficultyWeight);

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
  const shelfLabel   = getGameShelfLabel(game);
  // game-location.html 섹션 ID: '협력'은 weight 기준으로 hard_coop / easy_coop으로 분기
  const shelfSectionId = (() => {
    if (shelfGroupId === '협력') {
      const w = game.bgg?.weight;
      return (w && w >= 2.5) ? 'hard_coop' : 'easy_coop';
    }
    return shelfGroupId;
  })();
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

  const _sameDesignHtml = _buildSameDesignerHtml(gameKey, detail);

  const _prevHistKey = _gameSheetHistory.length > 0 ? _gameSheetHistory[_gameSheetHistory.length - 1] : null;
  const _prevHistGame = _prevHistKey ? window.gameData?.[_prevHistKey] : null;
  const _prevHistTitle = _prevHistGame ? (_prevHistGame.title?.display || _prevHistGame.title?.owned || _prevHistKey) : null;

  gameSheetContent.innerHTML = `
    <!-- 고정 헤더 (진입 시부터 표시) -->
    <div class="sheet-sticky-bar" id="sheetStickyBar" onclick="if(!event.target.closest('button,img')){const p=gameSheet?.querySelector('.game-sheet-scroll');if(p)p.scrollTo({top:0,behavior:'smooth'});}">
      <img class="sheet-sticky-thumb"
        src="${detail.image || DEFAULT_GAME_IMAGE}"
        alt="${detail.title}"
        onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';"
        onclick="event.stopPropagation();_openCoverModal('${(detail.image || DEFAULT_GAME_IMAGE).replace(/'/g,"\\'")}');"
        style="cursor:pointer;"
      >
      <span class="sheet-sticky-title">${detail.title}</span>
      ${detail.rating ? `<span class="sheet-sticky-bgg">⭐ ${formatRating(detail.rating)}</span>` : ""}
      <button aria-label="게임 정보 닫기" class="sheet-sticky-close" type="button" onclick="closeGameSheet()">✕</button>
    </div>

    <!-- 뒤로가기 (게임→게임 이동 시) -->
    ${_prevHistKey ? `<button class="sheet-back-btn sheet-back-btn--hist" type="button" onclick="goBackGameSheet()">← ${_prevHistTitle ? window.escH(_prevHistTitle) : '이전 게임'}</button>` : ''}

    <!-- 설명 + 버튼 -->
    <div class="sheet-header">
      <div class="sheet-title-block">
        ${detail.bggTitle && detail.bggTitle !== detail.title ? `<p class="sheet-en-title">${detail.bggTitle}</p>` : ""}
        ${getAvailNoticHtml(game)}
        ${detail.summaryKo ? `<p class="sheet-summary">${detail.summaryKo}</p>` : ""}
        <div class="sheet-links-block">
          <div class="sheet-links-row2">
            <button class="sheet-loc-btn" type="button" onclick="openShelfSheet('${rootPath}pages/game/game-location.html?${shelfSectionId ? 'shelf=' + encodeURIComponent(shelfSectionId) + '&' : ''}embed=1&highlight=${encodeURIComponent(gameKey)}')">📍 ${shelfLabel} ← 게임 위치</button>
            <a class="sheet-yt-btn"
              href="${detail.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitleForYoutubeSearch(detail.title) + ' 보드게임')}`}"
              onclick="return confirm('유튜브로 이동할까요?')"
              target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
              룰영상 보기
            </a>
          </div>
          <div class="sheet-org-area" id="sheetOrgArea-${gameKey}"></div>
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
        ${detail.displayTags.map(t => `<span class="sheet-dtag">${t}</span>`).join("")}
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
    ${_buildSheetMechsHtml(detail, mechanicsDisplay, categoriesDisplay)}

    ${_sameDesignHtml}

    <!-- 좋아요 / 궁금해요 (게임 정보 영역 끝) -->
    ${_buildSheetReactionsHtml(gameKey)}

    ${_buildSheetRecordsHtml(gameKey)}

  `;

  _openAndInitSheet(gameKey, restoreScroll, noAnim);
}

function _gameIds(gameKey) {
  const bggId = window.gameData?.[gameKey]?.bgg?.id;
  if (!bggId || String(bggId) === gameKey) return [gameKey];
  return [gameKey, String(bggId)];
}

// 게임평↔플레이기록 연동: 내 기록 전체 / 후기 없는 기록만 조회
async function _getMyUnlinkedPlayRecords(gameKey) {
  const _cu = window.getKakaoUser?.();
  if (!_cu?.id || !window.CottageDB) return { all: [], unreviewed: [] };
  const records = await window.CottageDB.getGamePlayRecords(_gameIds(gameKey));
  const all = records.filter(r => String(r.user_id) === String(_cu.id));
  const unreviewed = all.filter(r => !r.review_text);
  return { all, unreviewed };
}

// 게임평↔플레이기록 연동(Stage 3): 남(내가 아닌 사람)의 세션 목록 — 최신순, dedupe.
// 세션 식별 = group_name|played_at|player_count|player_names. 그룹·날짜 둘 다 없으면 세션으로 안 봄.
async function _getOthersSessions(gameKey) {
  const _cu = window.getKakaoUser?.();
  if (!window.CottageDB) return [];
  const records = await window.CottageDB.getGamePlayRecords(_gameIds(gameKey));
  const myId = _cu?.id ? String(_cu.id) : null;
  const byKey = new Map();
  for (const r of records) {
    if (myId && String(r.user_id) === myId) continue;   // 남의 기록만
    if (!r.group_name && !r.played_at) continue;          // 세션 식별 불가
    const key = `${r.group_name || ''}|${r.played_at || ''}|${r.player_count || ''}|${r.player_names || ''}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        game_id: r.game_id,
        group_name: r.group_name || null,
        played_at: r.played_at || null,
        player_count: r.player_count || null,
        player_names: r.player_names || null,
        nickname: r.nickname || null,
        rec_ids: [],   // 이 세션에 속한 기록 id들 (특정 기록에서 진입 시 프리셀렉트 매칭용)
      });
    }
    if (r.id != null) byKey.get(key).rec_ids.push(String(r.id));
  }
  const sessions = [...byKey.values()];
  sessions.sort((a, b) => String(b.played_at || '').localeCompare(String(a.played_at || '')));
  return sessions;
}

// 특정 기록에서 진입(⋯메뉴)했을 때 그 기록/세션을 "연동" 기본값으로 체크+선택.
// linkSelect에 내 기록(value=id) 또는 남 세션(data-join, data-rec-ids) 옵션이 이미 채워진 뒤 호출.
function _preselectLinkOption(linkCheck, linkSelect, recordId) {
  if (!recordId || !linkSelect) return false;
  const rid = String(recordId);
  let matched = null;
  for (const opt of linkSelect.options) {
    if (opt.value === rid) { matched = opt; break; }                                  // 내 기록 직접 매칭
    if (opt.dataset.join === '1' && (opt.dataset.recIds || '').split(',').includes(rid)) { matched = opt; break; }  // 남 세션 소속
  }
  if (!matched) return false;
  if (linkCheck) linkCheck.checked = true;
  linkSelect.value = matched.value;
  linkSelect.style.display = 'block';
  return true;
}

// Stage 3(1안): 남의 세션에 내 후기로 참여 — 확인창에서 바로 내 기록 생성(입력폼·페이지이동 없음).
// sourceCommentId 있으면 연동 성공 후 원본 게임평 삭제(후기 이동 = 중복 표시 방지).
function _openJoinConfirm(gameKey, sessions, reviewText, sourceCommentId) {
  const _u = window.getKakaoUser?.();
  if (!_u?.id || !window.CottageDB || !sessions?.length) return;
  const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
  const sessLabel = s => {
    const d = s.played_at ? s.played_at.slice(0, 10).replace(/-/g, '.') : '날짜 미상';
    return `${d}${s.group_name ? ' · ' + esc(s.group_name) : ''}${s.player_count ? ' · ' + s.player_count + '명' : ''}${s.nickname ? ' · ' + esc(s.nickname) + '님' : ''}`;
  };
  let modal = document.getElementById('sheetJoinModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sheetJoinModal';
    modal.className = 'sheet-comment-modal';
    modal.innerHTML = `
      <div class="sheet-comment-modal-box">
        <p class="sheet-comment-modal-title">플레이 기록에 남기기</p>
        <div class="sheet-join-body"></div>
        <div class="sheet-comment-modal-actions">
          <button class="sheet-comment-form-cancel" type="button" data-act="cancel">취소</button>
          <button class="sheet-comment-form-submit" type="button" data-act="ok">남기기</button>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    document.body.appendChild(modal);
  }
  const rv = (reviewText || '').trim();
  const body = modal.querySelector('.sheet-join-body');
  body.innerHTML = `
    ${sessions.length > 1
      ? `<select aria-label="참여할 기록 고르기" class="sheet-join-select">${sessions.map((s, i) => `<option value="${i}">${sessLabel(s)}</option>`).join('')}</select>`
      : `<div class="sheet-join-session">📅 ${sessLabel(sessions[0])}</div>`}
    ${rv ? `<div class="sheet-join-review">💬 “${esc(rv.slice(0, 60))}${rv.length > 60 ? '…' : ''}”</div>` : ''}
    <p class="sheet-join-hint">이 세션에 <b>내 플레이 기록</b>으로 후기를 남깁니다.</p>`;
  const okBtn = modal.querySelector('[data-act="ok"]');
  const cancelBtn = modal.querySelector('[data-act="cancel"]');
  cancelBtn.onclick = () => { modal.style.display = 'none'; };
  okBtn.disabled = false;
  okBtn.onclick = async () => {
    const sel = body.querySelector('.sheet-join-select');
    const s = sessions[sel ? parseInt(sel.value) : 0];
    okBtn.disabled = true;
    // 세션 필드(게임·인원·참여자·그룹·날짜)를 원본 그대로 복사 → 모임별·게임별 뷰 모두 같은 세션에 nest
    const res = await window.CottageDB.recordGamePlay(
      s.game_id, s.player_count || null, s.player_names || null, null, null,
      _u.nickname || null, _u.id, s.group_name || null, s.played_at || null, null, rv || null
    );
    if (res?.error) { okBtn.disabled = false; alert('저장에 실패했어요. 다시 시도해 주세요.'); return; }
    window.CottageDB?.trackEvent('record_complete', { game_id: s.game_id });
    if (sourceCommentId) {
      const del = await window.CottageDB.deleteComment(sourceCommentId);
      if (del?.error) console.error('[_openJoinConfirm] 연동 후 원본 게임평 삭제 실패', del.error);
    }
    modal.style.display = 'none';
    await initSheetComments(gameKey);
    await initSheetCommentsPreview(gameKey);
    await initPlayWidget(gameKey);
    window.refreshPlayRecordsBoard?.(); // 세션 참여로 새 기록 생성 → 게시판 반영
    showActionToast('세션에 후기를 남겼어요');
  };
  modal.style.display = 'flex';
}

async function updateSheetPlayCountLink(gameKey) {
  if (!window.CottageDB) return;
  const count = await window.CottageDB.getGamePlayCount(_gameIds(gameKey));
  const link = document.getElementById(`sheetPlayCountLink-${gameKey}`);
  if (link) link.textContent = `플레이 기록 ${count}건 보기 →`;
}

function closeGameSheet(){
  if(!gameSheet){
    return;
  }

  const panel = gameSheet.querySelector('.game-sheet-scroll');
  if (panel?._stickyCleanup) {
    panel._stickyCleanup();
    delete panel._stickyCleanup;
  }

  // 닫을 때 시트 내부 스크롤을 기억 → openGameSheet(key, true)로 되돌아올 때 보던 지점 복원.
  // (종전엔 openGameRecordSheet만 저장해서, 토스트로 취향보드에 갔다 backTo로 돌아오면 옛 값이 복원됐다)
  _savedSheetScrollTop = panel ? panel.scrollTop : 0;

  gameSheet.classList.remove('is-active');
  document.body.classList.remove('sheet-open');
  window.scrollTo(0, _savedBodyScrollY);
  _currentSheetGameKey = null;
}

// ── 게임평/기록 전용 바텀시트 ────────────────────────────────────────
function openGameRecordSheet(gameKey) {
  if (!gameSheet || !gameSheetContent) return;
  _currentSheetGameKey = gameKey;
  onCloseCommentModal();
  onClosePhotoModal();
  _closeAllMoreMenus();

  const _recPanel = gameSheet.querySelector('.game-sheet-scroll');
  _savedSheetScrollTop = _recPanel ? _recPanel.scrollTop : 0;

  const game = window.gameData?.[gameKey];
  const _owned = !!game;
  const rawTitle = game?.title?.display || game?.title?.owned || game?.title?.bgg || gameKey;
  const safeTitle = window.escH(rawTitle);
  const _recDetail = game ? GameView?.getGameDetailData(game) : null;
  const _recImg = _recDetail?.image || DEFAULT_GAME_IMAGE;
  const _recRating = _recDetail?.rating;

  gameSheetContent.innerHTML = `
    <!-- 고정 헤더 -->
    <div class="sheet-sticky-bar" onclick="if(!event.target.closest('button')){const p=gameSheet?.querySelector('.game-sheet-scroll');if(p)p.scrollTo({top:0,behavior:'smooth'});}">
      <img class="sheet-sticky-thumb"
        src="${_recImg}"
        alt="${safeTitle}"
        onerror="this.onerror=null;this.src='${DEFAULT_GAME_IMAGE}';"
      >
      <span class="sheet-sticky-title">${safeTitle} 기록</span>
      ${_recRating ? `<span class="sheet-sticky-bgg">⭐ ${formatRating(_recRating)}</span>` : ""}
      <button aria-label="게임 정보 닫기" class="sheet-sticky-close" type="button" onclick="closeGameSheet()">✕</button>
    </div>

    <!-- 뒤로가기 (미보유는 정보시트 없음 → 배지) -->
    ${_owned
      ? `<button class="sheet-back-btn sheet-back-btn--hist" type="button" onclick="openGameSheet('${gameKey}', true)">← 게임 정보</button>`
      : `<div class="sheet-unowned-badge">🚫 미보유 · 게임 정보 없음</div>`}
    <div class="sheet-top-spacer"></div>
    ${_buildSheetReactionsHtml(gameKey)}
    <div class="sheet-social-group">
      <div class="sheet-comments-area">
        <div class="sheet-comments-header">
          <span class="sheet-comments-count-label" id="sheetCommentsCount-${gameKey}">게임평</span>
          <div class="sheet-comments-header-right">
            <button class="sheet-comment-write-btn" data-game-id="${gameKey}" onclick="onOpenCommentInput(this)" type="button">💬 남기기</button>
          </div>
        </div>
        <div class="sheet-comments-list" id="sheetCommentsList-${gameKey}">
          <span class="sheet-comments-empty">불러오는 중...</span>
        </div>
      </div>
      <div class="sheet-play-section">
        <div class="sheet-comments-header">
          <span class="sheet-comments-count-label" id="sheetPhotosCount-${gameKey}">사진</span>
          <button class="sheet-comment-write-btn" data-game-id="${gameKey}" onclick="onOpenPhotoInput(this)" type="button">📷 남기기</button>
        </div>
        <div id="sheetPhotosArea-${gameKey}"><span class="sheet-comments-empty">불러오는 중...</span></div>
      </div>
      <div class="sheet-play-section">
        <div class="sheet-play-widget" id="sheetPlayWidget-${gameKey}"></div>
      </div>
    </div>
  `;

  const panel = gameSheet.querySelector('.game-sheet-scroll');
  if (panel) panel.scrollTop = 0;
  _savedBodyScrollY = window.scrollY;
  gameSheet.classList.add('is-active');
  document.body.classList.add('sheet-open');

  // 래퍼가 쿼리 오류는 내부에서 로그함(2단계). 여기 catch는 init 함수 렌더 로직의 JS 예외를 삼키던 자리
  initSheetComments(gameKey).catch(err => console.error('[initSheetComments]', err));
  initSheetLikes(gameKey).catch(err => console.error('[initSheetLikes]', err));
  initPlayWidget(gameKey).catch(err => console.error('[initPlayWidget]', err));
  initSheetPhotos(gameKey).catch(err => {
    const _el = document.getElementById(`sheetPhotosArea-${gameKey}`);
    if (_el) _el.innerHTML = '<span class="sheet-comments-empty">사진을 불러올 수 없습니다</span>';
    console.error('[initSheetPhotos]', err);
  });
  initSheetOrganizerContent(gameKey).catch(err => console.error('[initSheetOrganizerContent]', err));
}

async function initSheetOrganizerContent(gameKey) {
  const area = document.getElementById(`sheetOrgArea-${gameKey}`);
  if (!area || !window.CottageDB?.getGameOverride) return;
  const override = await window.CottageDB.getGameOverride(gameKey);
  const photos = override?.organizer_photo_urls || [];
  const ruleNote = override?.rule_note || '';
  if (!photos.length && !ruleNote) { area.innerHTML = ''; return; }
  const gameName = getGameName(gameKey) || String(gameKey);

  let html = '';
  if (photos.length) html += `<button class="sheet-org-btn" type="button" data-org-action="photos">📦 정리법 보기</button>`;
  if (ruleNote) html += `<button class="sheet-org-btn" type="button" data-org-action="rule">📖 룰 설명 보기</button>`;
  area.innerHTML = html;

  area.querySelector('[data-org-action="photos"]')?.addEventListener('click', () => _openOrganizerLightbox(photos, gameName));
  area.querySelector('[data-org-action="rule"]')?.addEventListener('click', () => _openRuleNoteModal(ruleNote, gameName));
}

async function initSheetCommentsPreview(gameKey) {
  const el = document.getElementById(`sheetCommentsPreview-${gameKey}`);
  const labelEl = document.getElementById(`sheetPreviewCommentLabel-${gameKey}`);
  if (!el || !window.CottageDB) return;

  const [comments, playReviews] = await Promise.all([
    window.CottageDB.getGameComments(_gameIds(gameKey), 5),
    window.CottageDB.getPlayReviewsByGame(_gameIds(gameKey), 5),
  ]);

  const currentUser = window.getKakaoUser?.();
  const commentItems = comments.map(c => ({ id: c.id, user_id: c.user_id, text: c.comment_text, nick: c.nickname || '익명', date: c.created_at, source: 'comment' }));
  const playItems = playReviews.map(r => ({ id: r.id, user_id: r.user_id, text: r.review_text, nick: r.nickname || '익명', date: r.played_at ? r.played_at + 'T00:00:00' : (r.created_at || ''), source: 'play' }));
  const allItems = [...commentItems, ...playItems].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = allItems.length;

  if (labelEl) labelEl.textContent = total > 0 ? `게임평 ${total}건` : '게임평';

  if (!total) {
    el.innerHTML = '<span class="sheet-comments-empty">게임평이 없습니다</span>';
    return;
  }

  const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
  const cards = allItems.map(item => {
    const txt = esc(item.text);
    const nick = esc(item.nick);
    const dateStr = item.date ? item.date.slice(2, 10).replace(/-/g, '.') : '';
    const isMine = item.source === 'comment' && currentUser && String(item.user_id) === String(currentUser.id);
    const _isMineAny = currentUser && item.user_id && String(item.user_id) === String(currentUser.id);
    const editBtns = isMine ? `<div class="sheet-comment-actions">
      <button class="sheet-comment-edit-btn" data-id="${item.id}" data-game="${esc(gameKey)}" data-text="${esc(item.text)}" onclick="onEditComment(this)" type="button">수정</button>
      <button class="sheet-comment-del-btn" data-id="${item.id}" data-game-key="${esc(gameKey)}" onclick="onDeleteCommentPreview(this)" type="button">삭제</button>
    </div>` : '';
    return `<div class="sheet-play-scroll-card">
      <span class="sheet-comment-nickname"><strong class="sheet-comment-nick"${item.user_id ? ` data-user-id="${item.user_id}"` : ''}>${_isMineAny ? '<span class="sheet-mine-mark">★</span> ' : ''}${nick}</strong>${dateStr ? ` <span class="sheet-comment-date">${dateStr}</span>` : ''}</span>
      <p class="sheet-comment-text">${txt}</p>
      ${editBtns}
    </div>`;
  }).join('');
  el.innerHTML = `<div class="sheet-play-scroll">${cards}</div>`;
  el.querySelectorAll('.sheet-comment-nick[data-user-id]').forEach(n => {
    n.style.cursor = 'pointer';
    n.addEventListener('click', e => { e.stopPropagation(); const _b = _sheetBackTo(_currentSheetGameKey); closeGameSheet(); window.openOtherProfileSheet?.(n.dataset.userId, { backTo: _b }); });
  });
}

async function initSheetPlayPreview(gameKey) {
  const el = document.getElementById(`sheetPlayPreview-${gameKey}`);
  const labelEl = document.getElementById(`sheetPreviewPlayLabel-${gameKey}`);
  if (!el || !window.CottageDB) return;

  const [records, count] = await Promise.all([
    window.CottageDB.getGamePlayRecords(_gameIds(gameKey), 5),
    window.CottageDB.getGamePlayCount(_gameIds(gameKey)),
  ]);

  if (labelEl) labelEl.textContent = count > 0 ? `플레이기록 ${count}건` : '플레이기록';

  if (!records || !records.length) {
    el.innerHTML = '<span class="sheet-comments-empty">아직 기록이 없습니다</span>';
    return;
  }

  const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
  const _me = window.getKakaoUser?.();

  const cards = records.map(r => {
    const dateStr = r.played_at
      ? r.played_at.slice(2, 10).replace(/-/g, '.')
      : (r.created_at ? r.created_at.slice(2, 10).replace(/-/g, '.') : '');
    const isMine = _me && r.user_id && String(r.user_id) === String(_me.id);
    const _ip = [r.player_count ? `${r.player_count}명` : null, r.player_names ? esc(r.player_names) : null, r.play_time_min ? `${r.play_time_min}분` : null].filter(Boolean);
    const _sep = '<span class="badge-sep"> | </span>';
    const _infoTag = _ip.length ? `<span class="sheet-play-info-tag">${_ip.join(_sep)}</span>` : '';
    const _scoreTag = r.score_note ? `<span class="sheet-play-info-tag">🏆 ${esc(r.score_note).replace(/\s*\/\s*/g,_sep)}</span>` : '';
    return `<div class="sheet-play-scroll-card">
      <span class="sheet-comment-nickname">
        ${r.nickname ? `<strong class="sheet-comment-nick"${r.user_id ? ` data-user-id="${r.user_id}"` : ''}>${isMine ? '<span class="sheet-mine-mark">★</span> ' : ''}${esc(r.nickname)}</strong>` : ''}
        ${dateStr ? `<span class="sheet-comment-date">${dateStr}</span>` : ''}
        ${r.group_name ? `<a class="sheet-preview-group sheet-history-link" href="${rootPath}pages/game/game-reviews.html?group=${encodeURIComponent(r.group_name)}${r.played_at ? '&date=' + encodeURIComponent(r.played_at) : ''}">${esc(r.group_name)}</a>` : ''}
      </span>
      <div class="sheet-play-info">
        ${_infoTag}${_scoreTag}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="sheet-play-scroll">${cards}</div>`;
  el.querySelectorAll('.sheet-comment-nick[data-user-id]').forEach(n => {
    n.style.cursor = 'pointer';
    n.addEventListener('click', e => { e.stopPropagation(); const _b = _sheetBackTo(_currentSheetGameKey); closeGameSheet(); window.openOtherProfileSheet?.(n.dataset.userId, { backTo: _b }); });
  });
}

function _attachPhotoLightbox(container, allPhotos, entries, deleteOpts) {
  if (!window.openLightbox) return;
  function _buildCaption(e) {
    if (!e) return '';
    const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
    const lines = [];
    if (e.nickname) lines.push(esc(e.nickname));
    const line1 = [e.group_name, e.played_at ? e.played_at.slice(2,10).replace(/-/g,'.') : ''].filter(Boolean).join(' · ');
    if (line1) lines.push(esc(line1));
    const line2 = [e.player_count ? e.player_count + '명' : '', e.player_names, e.play_time_min ? e.play_time_min + '분' : ''].filter(Boolean).join(' · ');
    if (line2) lines.push(esc(line2));
    if (e.score_note) lines.push(esc(e.score_note));
    return lines.join('<br>');
  }
  const captions = entries ? entries.map(_buildCaption) : null;
  const lbOpts = captions ? { captions } : {};
  if (deleteOpts) {
    lbOpts.deletable = deleteOpts.deletable;
    lbOpts.onDelete = deleteOpts.onDelete;
  }
  container.querySelectorAll('.pr-rec-photo').forEach(img => {
    img.addEventListener('click', () => {
      const idx = Number(img.dataset.idx || 0);
      // 삼키면 사진 클릭이 조용히 무반응이 된다(전역 부재·렌더 예외 둘 다 여기로 온다) → 로그 필수
      try { window.openLightbox(allPhotos, idx, lbOpts); } catch (e) { console.error('[openLightbox 호출]', e); }
    });
  });
}

async function _fetchGamePhotos(gameKey) {
  const records = await window.CottageDB.getGamePlayRecords(_gameIds(gameKey), 50);
  return records.flatMap(r =>
    (window.parsePhotoUrls ? window.parsePhotoUrls(r.photo_url) : []).map(url => ({
      url,
      record_id: r.id,
      user_id: r.user_id || null,
      nickname: r.nickname || '',
      played_at: r.played_at || r.created_at || '',
      group_name: r.group_name || '',
      player_count: r.player_count || null,
      player_names: r.player_names || '',
      play_time_min: r.play_time_min || null,
      score_note: r.score_note || '',
    }))
  );
}

async function initSheetPhotoPreview(gameKey) {
  const el = document.getElementById(`sheetPhotoPreview-${gameKey}`);
  const labelEl = document.getElementById(`sheetPreviewPhotoLabel-${gameKey}`);
  if (!el || !window.CottageDB) return;

  try {
  const entries = await _fetchGamePhotos(gameKey);
  const allPhotos = entries.map(e => e.url);
  const total = allPhotos.length;
  if (labelEl) labelEl.textContent = total > 0 ? `사진 ${total}장` : '사진';

  if (!total) {
    el.innerHTML = '<span class="sheet-comments-empty">사진이 없습니다</span>';
    return;
  }

  const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
  const uniqueNicks1 = new Set(entries.map(e => e.nickname).filter(Boolean));
  const headerName1 = uniqueNicks1.size > 1 ? uniqueNicks1.size + '명의 사진' : (entries[0].nickname ? esc(entries[0].nickname) : '');
  const headerDate1 = uniqueNicks1.size > 1 ? '' : (entries[0].played_at ? entries[0].played_at.slice(2, 10).replace(/-/g, '.') : '');
  const metaParts = [headerName1, headerDate1].filter(Boolean);

  const SHOW_FIRST = 3;
  const more = total - SHOW_FIRST;
  const dataUrls = JSON.stringify(allPhotos).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  el.innerHTML = `
    ${metaParts.length ? `<span class="sheet-comment-nickname"><strong class="sheet-comment-nick">${metaParts[0]}</strong>${metaParts[1] ? ` <span class="sheet-comment-date">${metaParts[1]}</span>` : ''}</span>` : ''}
    <div class="pr-rec-photo-wrap" data-urls="${dataUrls}">
      ${entries.map((e, i) => `<div class="pr-rec-photo-item${i >= SHOW_FIRST ? ' sheet-photo-hidden' : ''}"><img class="pr-rec-photo" src="${esc(e.url)}" alt="사진" loading="lazy" data-idx="${i}"></div>`).join('')}
      ${more > 0 ? `<div class="pr-rec-photo-more" data-idx="${SHOW_FIRST}">+${more}장</div>` : ''}
    </div>`;
  const expandBtn = el.querySelector('.pr-rec-photo-more');
  if (expandBtn) {
    expandBtn.addEventListener('click', e => {
      e.stopPropagation();
      const wrap = expandBtn.closest('.pr-rec-photo-wrap');
      wrap.querySelectorAll('.sheet-photo-hidden').forEach(item => item.classList.remove('sheet-photo-hidden'));
      expandBtn.remove();
    });
  }
  _attachPhotoLightbox(el, allPhotos, entries);
  } catch (err) {
    el.innerHTML = '<span class="sheet-comments-empty">사진을 불러올 수 없습니다</span>';
    console.error('[initSheetPhotoPreview]', err);
  }
}

async function initSheetPhotos(gameKey) {
  const el = document.getElementById(`sheetPhotosArea-${gameKey}`);
  const countEl = document.getElementById(`sheetPhotosCount-${gameKey}`);
  if (!el || !window.CottageDB) return;

  try {
  const entries = await _fetchGamePhotos(gameKey);
  const allPhotos = entries.map(e => e.url);
  const total = allPhotos.length;
  if (countEl) countEl.textContent = total > 0 ? `사진 ${total}장` : '사진';

  if (!total) {
    el.innerHTML = '<span class="sheet-comments-empty">사진이 없습니다</span>';
    return;
  }

  const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
  const uniqueNicks = new Set(entries.map(e => e.nickname).filter(Boolean));
  const multiUploader = uniqueNicks.size > 1;
  const headerName = multiUploader ? uniqueNicks.size + '명의 사진' : (entries[0].nickname ? esc(entries[0].nickname) : '');
  const headerDate = multiUploader ? '' : (entries[0].played_at ? entries[0].played_at.slice(2, 10).replace(/-/g, '.') : '');
  const metaParts = [headerName, headerDate].filter(Boolean);

  const SHOW_FIRST = 4;
  const more = total - SHOW_FIRST;
  const dataUrls = JSON.stringify(allPhotos).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  el.innerHTML = `
    ${metaParts.length ? `<span class="sheet-comment-nickname"><strong class="sheet-comment-nick">${metaParts[0]}</strong>${metaParts[1] ? ` <span class="sheet-comment-date">${metaParts[1]}</span>` : ''}</span>` : ''}
    <div class="sheet-photo-grid" data-urls="${dataUrls}">
      ${entries.map((e, i) => `<div class="pr-rec-photo-item${i >= SHOW_FIRST ? ' sheet-photo-hidden' : ''}"><img class="pr-rec-photo" src="${esc(e.url)}" alt="사진" loading="lazy" data-idx="${i}"></div>`).join('')}
    </div>
    ${more > 0 ? `<button class="sheet-list-more-btn sheet-photo-more-btn" type="button">${more}장 더보기 ▾</button>` : ''}`;
  const morePhotoBtn = el.querySelector('.sheet-photo-more-btn');
  if (morePhotoBtn) {
    morePhotoBtn.addEventListener('click', () => {
      const hidden = el.querySelectorAll('.sheet-photo-hidden');
      const isCollapsed = hidden[0]?.style.display !== 'none' && hidden[0]?.classList.contains('sheet-photo-hidden');
      if (isCollapsed || hidden.length) {
        hidden.forEach(item => item.classList.remove('sheet-photo-hidden'));
        morePhotoBtn.textContent = '접기 ▴';
      } else {
        el.querySelectorAll('.pr-rec-photo-item').forEach((item, i) => {
          if (i >= SHOW_FIRST) item.classList.add('sheet-photo-hidden');
        });
        morePhotoBtn.textContent = `${more}장 더보기 ▾`;
      }
    });
  }

  const _myId = window.getKakaoUser?.()?.id || null;
  const _isOwner = window.isOwner?.() || false;
  const deletable = entries.map(e => _isOwner || (_myId && e.user_id && String(e.user_id) === String(_myId)));
  const anyDeletable = deletable.some(Boolean);
  const deleteOpts = anyDeletable ? {
    deletable,
    onDelete: async (idx) => {
      const e = entries[idx];
      if (!e) return;
      const allRecs = await window.CottageDB.getGamePlayRecords(_gameIds(gameKey));
      const rec = allRecs.find(r => String(r.id) === String(e.record_id));
      if (!rec) return;
      const remaining = (window.parsePhotoUrls?.(rec.photo_url) || []).filter(u => u !== e.url);
      const newPhotoUrl = remaining.length === 0 ? null : remaining.length === 1 ? remaining[0] : JSON.stringify(remaining);
      await window.CottageDB.updateGamePlay(e.record_id, { photo_url: newPhotoUrl });
      await initSheetPhotos(gameKey);
    }
  } : null;
  _attachPhotoLightbox(el, allPhotos, entries, deleteOpts);
  } catch (err) {
    el.innerHTML = '<span class="sheet-comments-empty">사진을 불러올 수 없습니다</span>';
    console.error('[initSheetPhotos]', err);
  }
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

function initStickyBar() {}

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

function showActionToast(msg, linkLabel, linkAction, linkLabel2, linkAction2) {
  let toast = document.getElementById('actionToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'actionToast';
    toast.className = 'login-toast';
    document.body.appendChild(toast);
  }
  const closeToast = () => { clearTimeout(toast._timer); toast.classList.remove('is-visible'); };
  const closeBtn = `<button type="button" class="login-toast-close" aria-label="닫기">✕</button>`;
  if (linkLabel && linkAction) {
    const btn2Html = (linkLabel2 && linkAction2) ? `<button type="button" class="toast-btn-2">${linkLabel2}</button>` : '';
    toast.innerHTML = `<span>${msg}</span><button type="button">${linkLabel}</button>${btn2Html}${closeBtn}`;
    toast.querySelector('button').onclick = () => { linkAction(); closeToast(); };
    if (linkLabel2 && linkAction2) {
      toast.querySelector('.toast-btn-2').onclick = () => { linkAction2(); closeToast(); };
    }
  } else {
    toast.innerHTML = `<span>${msg}</span>${closeBtn}`;
  }
  toast.querySelector('.login-toast-close').onclick = closeToast;
  toast.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('is-visible'), 5000);
}

function requireLogin(action) {
  const user = window.getKakaoUser?.();
  if (user) { action(); return; }
  showLoginToast();
}

function _reactionUserChip(u) {
  const uid = u.user_id ? ` data-user-id="${u.user_id}"` : '';
  const name = String(u.nickname || '(알 수 없음)').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return `<span class="sheet-liker-chip"${uid}><span class="sheet-liker-name">${name}</span></span>`;
}

function _updateReactionSection(likers, curiousUsers) {
  function setupGroup(users, wrapId, expandBtnId, panelId) {
    const wrap = document.getElementById(wrapId);
    const expandBtn = document.getElementById(expandBtnId);
    const panel = document.getElementById(panelId);
    if (!wrap || !expandBtn || !panel) return;

    panel.innerHTML = users.map(_reactionUserChip).join('');
    panel.querySelectorAll('[data-user-id]').forEach(chip => {
      chip.addEventListener('click', () => { const _b = _sheetBackTo(_currentSheetGameKey); closeGameSheet(); window.openOtherProfileSheet?.(chip.dataset.userId, { backTo: _b }); });
    });

    if (users.length) {
      wrap.classList.add('has-users');
      expandBtn.onclick = () => {
        const isOpen = panel.classList.contains('is-open');
        panel.classList.toggle('is-open', !isOpen);
        expandBtn.textContent = isOpen ? '▾' : '▴';
      };
    } else {
      wrap.classList.remove('has-users');
      panel.classList.remove('is-open');
    }
  }

  setupGroup(likers, 'sheetLikeBtnWrap', 'sheetLikeExpandBtn', 'sheetLikerPanel');
  setupGroup(curiousUsers, 'sheetCuriousBtnWrap', 'sheetCuriousExpandBtn', 'sheetCuriousPanel');
}

async function initSheetLikes(gameKey) {
  if (!window.CottageDB) return;
  const user = window.getKakaoUser?.();
  const userId = user ? String(user.id) : null;
  const [likeCount, curiousCount, liked, curious, likers, curiousUsers] = await Promise.all([
    window.CottageDB.getGameLikeCount(gameKey),
    window.CottageDB.getGameCuriousCount(gameKey),
    userId ? window.CottageDB.hasUserLiked(gameKey, userId) : false,
    userId ? window.CottageDB.hasUserCurious(gameKey, userId) : false,
    window.CottageDB.getGameLikers?.(gameKey) || Promise.resolve([]),
    window.CottageDB.getGameCuriousUsers?.(gameKey) || Promise.resolve([]),
  ]);
  const likeBtn = document.getElementById('sheetLikeBtn');
  if (likeBtn) {
    likeBtn.textContent = `👍 좋아요 ${likeCount}`;
    likeBtn.classList.toggle('is-active', liked);
    document.getElementById('sheetLikeBtnWrap')?.classList.toggle('is-active', liked);
  }
  const curiousBtn = document.getElementById('sheetCuriousBtn');
  if (curiousBtn) {
    curiousBtn.textContent = `🤔 궁금해요 ${curiousCount}`;
    curiousBtn.classList.toggle('is-active', curious);
    document.getElementById('sheetCuriousBtnWrap')?.classList.toggle('is-active', curious);
  }
  _updateReactionSection(likers, curiousUsers);
}

// 좋아요/궁금해요 변경 전역 통보 (취향보드·모임보드 즉시 동기화)
function emitLikesChanged(table, gameId, added) {
  if (!gameId) return;
  // customName은 직접입력 게임용 — 게임시트에는 실제 게임만 있어 항상 null (payload 형태 통일)
  try { window.dispatchEvent(new CustomEvent('cottage-likes-changed', { detail: { table, gameId: String(gameId), customName: null, added: !!added } })); } catch (_) {}
}

// 게임시트에서 보드로 갈 때, 원래 게임시트로 돌아오기 위한 경로 (R10c).
// 보드 패널(--z-profile:9100)은 게임시트(--z-sheet:9500)보다 아래라 시트를 연 채 열면 뒤에 깔린다.
// z를 올리면 반대로 "취향보드 → 게임 썸네일 → 게임시트"가 깨지므로(그땐 시트가 위에 떠야 함),
// 게임시트에서 보드로 가는 경로는 전부 "시트를 닫고 backTo로 돌아온다"로 통일한다.
// ⚠️ closeGameSheet()가 _currentSheetGameKey를 null로 만드므로 반드시 닫기 전에 만들 것.
// 라벨에 게임명을 쓰는 건 openShelfSheet 뒤로가기(_prevHistTitle)와 같은 패턴.
function _sheetBackTo(gameKey) {
  const g = window.gameData?.[gameKey];
  return { type: 'gameSheet', gameKey, label: g?.title?.display || g?.title?.owned || gameKey };
}

async function onSheetLike(btn) {
  requireLogin(async () => {
    const user = window.getKakaoUser?.();
    if (!user || !window.CottageDB) return;
    const gameKey = btn?.dataset.gameId;
    if (!gameKey) return;
    const likeBtn = document.getElementById('sheetLikeBtn');
    const result = await window.CottageDB.toggleGameLike(gameKey, String(user.id));
    if (result.liked !== undefined) {
      emitLikesChanged('game_likes', gameKey, result.liked);
      const likeCount = await window.CottageDB.getGameLikeCount(gameKey);
      if (likeBtn) {
        likeBtn.textContent = `👍 좋아요 ${likeCount}`;
        likeBtn.classList.toggle('is-active', result.liked);
        document.getElementById('sheetLikeBtnWrap')?.classList.toggle('is-active', result.liked);
      }
      showActionToast(result.liked ? '❤️ 좋아하는 게임에 추가됐어요' : '좋아요를 취소했어요', result.liked ? '취향 보드 →' : null, result.liked ? () => { closeGameSheet(); window.openProfilePanel?.('taste', { backTo: _sheetBackTo(gameKey) }); } : null);
      if (result.liked) {
        const wasCurious = await window.CottageDB.hasUserCurious(gameKey, String(user.id));
        if (wasCurious) {
          await window.CottageDB.toggleGameCurious(gameKey, String(user.id));
          emitLikesChanged('game_curious', gameKey, false);
          showActionToast('😊 궁금해요가 취소됐어요');
        }
        const curiousCount = await window.CottageDB.getGameCuriousCount(gameKey);
        const curiousBtn = document.getElementById('sheetCuriousBtn');
        if (curiousBtn) {
          curiousBtn.textContent = `🤔 궁금해요 ${curiousCount}`;
          curiousBtn.classList.remove('is-active');
          document.getElementById('sheetCuriousBtnWrap')?.classList.remove('is-active');
        }
      }
      const [likers, curiousUsers] = await Promise.all([
        window.CottageDB.getGameLikers?.(gameKey) || Promise.resolve([]),
        window.CottageDB.getGameCuriousUsers?.(gameKey) || Promise.resolve([]),
      ]);
      _updateReactionSection(likers, curiousUsers);
    }
  });
}

async function onSheetCurious(btn) {
  requireLogin(async () => {
    const user = window.getKakaoUser?.();
    if (!user || !window.CottageDB) return;
    const gameKey = btn?.dataset.gameId;
    if (!gameKey) return;
    const result = await window.CottageDB.toggleGameCurious(gameKey, String(user.id));
    if (result.curious !== undefined) {
      emitLikesChanged('game_curious', gameKey, result.curious);
      const curiousCount = await window.CottageDB.getGameCuriousCount(gameKey);
      const curiousBtn = document.getElementById('sheetCuriousBtn');
      if (curiousBtn) {
        curiousBtn.textContent = `🤔 궁금해요 ${curiousCount}`;
        curiousBtn.classList.toggle('is-active', result.curious);
        document.getElementById('sheetCuriousBtnWrap')?.classList.toggle('is-active', result.curious);
      }
      showActionToast(result.curious ? '👀 해보고 싶은 게임에 추가됐어요' : '관심을 취소했어요', result.curious ? '취향 보드 →' : null, result.curious ? () => { closeGameSheet(); window.openProfilePanel?.('taste', { backTo: _sheetBackTo(gameKey) }); } : null);
      if (result.curious) {
        const wasLiked = await window.CottageDB.hasUserLiked(gameKey, String(user.id));
        if (wasLiked) { await window.CottageDB.toggleGameLike(gameKey, String(user.id)); emitLikesChanged('game_likes', gameKey, false); }
        const likeCount = await window.CottageDB.getGameLikeCount(gameKey);
        const likeBtn = document.getElementById('sheetLikeBtn');
        if (likeBtn) {
          likeBtn.textContent = `👍 좋아요 ${likeCount}`;
          likeBtn.classList.remove('is-active');
          document.getElementById('sheetLikeBtnWrap')?.classList.remove('is-active');
        }
      }
      const [likers, curiousUsers] = await Promise.all([
        window.CottageDB.getGameLikers?.(gameKey) || Promise.resolve([]),
        window.CottageDB.getGameCuriousUsers?.(gameKey) || Promise.resolve([]),
      ]);
      _updateReactionSection(likers, curiousUsers);
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

async function initSheetComments(gameKey) {
  const listEl = document.getElementById(`sheetCommentsList-${gameKey}`);
  const countEl = document.getElementById(`sheetCommentsCount-${gameKey}`);
  if (!listEl || !window.CottageDB) return;
  const [comments, playReviews] = await Promise.all([
    window.CottageDB.getGameComments(_gameIds(gameKey)),
    window.CottageDB.getPlayReviewsByGame(_gameIds(gameKey)),
  ]);

  const commentItems = comments.map(c => ({ type: 'comment', text: c.comment_text, nick: c.nickname || '익명', date: c.created_at, user_id: c.user_id, raw: c }));
  const playItems = playReviews.map(r => ({ type: 'play', id: r.id, user_id: r.user_id, text: r.review_text, nick: r.nickname || '익명', date: r.played_at ? r.played_at + 'T00:00:00' : (r.created_at || '') }));
  const allItems = [...commentItems, ...playItems].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = allItems.length;

  if (!total) {
    if (countEl) countEl.textContent = "게임평";
    listEl.classList.remove('has-comments');
    listEl.innerHTML = '<span class="sheet-comments-empty">게임평이 없습니다</span>';
    return;
  }
  if (countEl) countEl.textContent = `게임평 ${total}개`;
  listEl.classList.remove('is-collapsed');
  const myIds = getMyCommentIds();
  const currentUserId = window.getKakaoUser?.()?.id || null;
  // 게임 시트의 게임평은 review_text/game_comments 텍스트만 지우는 가벼운 모더레이션이라
  // 오너에게 전체 유저 수정·삭제를 허용한다(2026-07-27 사용자 결정 — 플레이기록게시판의 전체
  // 기록 편집과는 반대로, 여기는 오너 권한을 새로 연다).
  const _isOwner = window.isOwner?.() || false;
  listEl.classList.add('has-comments');

  const allHtml = allItems.map(item => {
    const txt = window.escH(item.text);
    const nick = window.escH(item.nick);
    const dateStr = formatDate(item.date);
    if (item.type === 'comment') {
      const c = item.raw;
      const attr = window.escH(c.comment_text);
      const isSelf = currentUserId
        ? (c.user_id ? String(c.user_id) === String(currentUserId) : false)
        : myIds.includes(c.id);
      const canManage = isSelf || _isOwner;
      // 「플레이기록으로 연동」은 내 기록에만 의미가 있어 오너 모더레이션 범위에서 뺀다 — 본인 것만.
      return `<div class="sheet-comment-item">
      <span class="sheet-comment-nickname"><strong class="sheet-comment-nick"${item.user_id ? ` data-user-id="${item.user_id}"` : ''}>${nick}</strong>${dateStr ? ` <span class="sheet-comment-date">${dateStr}</span>` : ''}</span>
      <p class="sheet-comment-text">${txt}</p>
      ${canManage ? `<div class="sheet-comment-actions">
        <button aria-label="코멘트 고치기" class="sheet-comment-edit-btn" data-id="${c.id}" data-game="${gameKey}" data-text="${attr}" onclick="onEditComment(this)" type="button">✏️</button>
        ${isSelf ? `<button class="sheet-comment-link-btn" data-id="${c.id}" data-game="${gameKey}" data-text="${attr}" onclick="onLinkCommentToPlay(this)" type="button" title="플레이기록으로 연동">↗</button>` : ''}
        <button aria-label="코멘트 지우기" class="sheet-comment-delete-btn" onclick="onDeleteComment('${c.id}','${gameKey}')" type="button">✕</button>
      </div>` : ''}
    </div>`;
    }
    const textAttr = window.escH(item.text);
    const mine = _isOwner || (currentUserId && item.user_id && String(item.user_id) === String(currentUserId));
    return `<div class="sheet-comment-item">
      <span class="sheet-comment-nickname"><strong class="sheet-comment-nick"${item.user_id ? ` data-user-id="${item.user_id}"` : ''}>${nick}</strong>${dateStr ? ` <span class="sheet-comment-date">${dateStr}</span>` : ''}</span>
      <p class="sheet-comment-text">${txt}</p>
      ${mine ? `<div class="sheet-comment-actions">
        <button aria-label="게임평 고치기" class="sheet-comment-edit-btn" data-id="${item.id}" data-game="${gameKey}" data-text="${textAttr}" onclick="onEditPlayReview(this)" type="button">✏️</button>
        <button aria-label="게임평 지우기" class="sheet-comment-delete-btn" data-id="${item.id}" data-game="${gameKey}" onclick="onDeletePlayReview(this)" type="button">✕</button>
      </div>` : ''}
    </div>`;
  }).join('');

  const htmlArr = allHtml.split(/(?=<div class="sheet-comment-item">)/).filter(Boolean);
  const restHtml = htmlArr.slice(1).join('');
  const moreCount = total - 1;
  listEl.innerHTML = htmlArr[0] +
    (moreCount > 0 ? `<div class="sheet-list-rest" style="display:none">${restHtml}</div><button class="sheet-list-more-btn" type="button">${moreCount}건 더보기 ▾</button>` : '');
  listEl.querySelectorAll('.sheet-comment-nick[data-user-id]').forEach(n => {
    n.style.cursor = 'pointer';
    n.addEventListener('click', e => { e.stopPropagation(); const _b = _sheetBackTo(_currentSheetGameKey); closeGameSheet(); window.openOtherProfileSheet?.(n.dataset.userId, { backTo: _b }); });
  });
  if (moreCount > 0) {
    const moreBtn = listEl.querySelector('.sheet-list-more-btn');
    const restEl = listEl.querySelector('.sheet-list-rest');
    moreBtn?.addEventListener('click', () => {
      const isExpanded = restEl.style.display !== 'none';
      restEl.style.display = isExpanded ? 'none' : '';
      moreBtn.textContent = isExpanded ? `${moreCount}건 더보기 ▾` : '접기 ▴';
    });
  }
}

async function onDeleteComment(id, gameKey) {
  if (!confirm('이 게임평을 삭제할까요?')) return;
  if (!window.CottageDB) return;
  const result = await window.CottageDB.deleteComment(id);
  if (!result.error) {
    removeMyCommentId(id);
    await initSheetComments(gameKey);
  }
}

function onEditPlayReview(btn) {
  const itemEl = btn.closest('.sheet-comment-item');
  if (!itemEl) return;
  const textEl = itemEl.querySelector('.sheet-comment-text');
  const actionsEl = itemEl.querySelector('.sheet-comment-actions');
  const origText = btn.dataset.text;
  const recId = btn.dataset.id;
  const gameKey = btn.dataset.game;

  const editDiv = document.createElement('div');
  editDiv.className = 'sheet-review-edit-wrap';
  editDiv.innerHTML = `<textarea aria-label="게임평 고치기" class="sheet-review-edit-area" rows="3"></textarea>
    <div class="sheet-review-edit-row">
      <button class="sheet-review-save-btn" type="button">저장</button>
      <button class="sheet-review-cancel-btn" type="button">취소</button>
    </div>`;
  editDiv.querySelector('textarea').value = origText;
  textEl.style.display = 'none';
  textEl.after(editDiv);
  if (actionsEl) actionsEl.style.display = 'none';

  editDiv.querySelector('.sheet-review-save-btn').onclick = async () => {
    const newText = editDiv.querySelector('textarea').value.trim();
    if (!newText) return;
    await window.CottageDB?.updateGamePlay?.(recId, { review_text: newText });
    await initSheetComments(gameKey);
    await initSheetCommentsPreview(gameKey);
  };
  editDiv.querySelector('.sheet-review-cancel-btn').onclick = () => {
    editDiv.remove();
    textEl.style.display = '';
    if (actionsEl) actionsEl.style.display = '';
  };
}

async function onDeletePlayReview(btn) {
  if (!confirm('게임평을 삭제할까요?')) return;
  const recId = btn.dataset.id;
  const gameKey = btn.dataset.game;
  await window.CottageDB?.updateGamePlay?.(recId, { review_text: '' });
  await initSheetComments(gameKey);
  await initSheetCommentsPreview(gameKey);
}

function getOrCreateCommentModal() {
  let modal = document.getElementById('sheetCommentModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sheetCommentModal';
  modal.className = 'sheet-comment-modal';
  modal.innerHTML = `
    <div class="sheet-comment-modal-box">
      <p class="sheet-comment-modal-title">게임평 남기기</p>
      <textarea class="sheet-comment-modal-input" id="sheetCommentModalInput" rows="4" placeholder="게임에 대한 평가를 남겨주세요"></textarea>
      <div class="sheet-comment-play-link" id="sheetCommentPlayLink" style="display:none;">
        <label class="sheet-comment-play-link-label">
          <input type="checkbox" id="sheetCommentLinkCheck">
          <span>기존 플레이 기록에 연동</span>
        </label>
        <select aria-label="연동할 플레이 기록" class="sheet-comment-play-select" id="sheetCommentPlaySelect" style="display:none;"></select>
      </div>
      <div class="sheet-comment-modal-actions">
        <button class="sheet-comment-form-cancel" onclick="onCloseCommentModal()">취소</button>
        <button class="sheet-comment-form-submit" id="sheetCommentModalSubmit" onclick="onSubmitCommentModal()">등록</button>
      </div>
    </div>
  `;
  modal.querySelector('#sheetCommentLinkCheck').addEventListener('change', e => {
    document.getElementById('sheetCommentPlaySelect').style.display = e.target.checked ? 'block' : 'none';
  });
  // 🚫 바깥 클릭으로 닫지 않는다 — 작성 중 실수로 바깥을 눌러 내용이 날아간다는 제보(2026-07-28).
  //    닫기는 "취소" 버튼(onCloseCommentModal)이나 등록 성공으로만.
  document.body.appendChild(modal);
  return modal;
}

function onOpenCommentInput(btn) {
  const gameKey = btn.dataset.gameId;
  const recordId = btn.dataset.recordId || '';   // (014) 특정 기록의 ⋯메뉴에서 진입했으면 존재
  requireLogin(async () => {
    const modal = getOrCreateCommentModal();
    modal.dataset.gameId = gameKey;
    delete modal.dataset.editId;
    delete modal.dataset.linkCommentId;
    const titleEl = modal.querySelector('.sheet-comment-modal-title');
    const submitEl = document.getElementById('sheetCommentModalSubmit');
    if (submitEl) submitEl.textContent = '등록';
    const input = document.getElementById('sheetCommentModalInput');
    if (input) { input.value = ''; input.readOnly = false; }

    const linkWrap = document.getElementById('sheetCommentPlayLink');
    const linkCheck = document.getElementById('sheetCommentLinkCheck');
    const linkSelect = document.getElementById('sheetCommentPlaySelect');
    const linkLabel = linkWrap?.querySelector('.sheet-comment-play-link-label');

    // (014) 특정 기록에서 진입 → 그 기록에 게임평을 매단다(누구 기록이든). 연동 select 없이 바로 첨부.
    //   연동 select(내 기록 채우기·남 세션 참여)는 '남기기'(기록과 무관) 진입에만 쓴다 — 그 UX를 여기
    //   섞으면 남의 세션에 preselect돼 새 기록이 생기는 옛 함정이 재발한다.
    if (recordId) {
      modal.dataset.recordId = recordId;
      modal._myRecordCountAtOpen = 0;
      modal._joinSessions = [];
      modal._opening = false;
      if (titleEl) titleEl.textContent = '게임평 추가';
      if (linkWrap) linkWrap.style.display = 'none';
      modal.style.display = 'flex';
      input?.focus();
      return;
    }
    delete modal.dataset.recordId;

    // 기록과 무관한 '남기기' — 내 기록 연동/남 세션 참여 select UX
    if (titleEl) titleEl.textContent = '게임평 남기기';
    if (linkLabel) linkLabel.style.display = '';
    modal.style.display = 'flex';
    input?.focus();

    modal._myRecordCountAtOpen = 0;
    modal._joinSessions = [];
    if (linkWrap && linkCheck && linkSelect) {
      linkCheck.checked = false;
      linkSelect.style.display = 'none';
      linkSelect.innerHTML = '';
      linkWrap.style.display = 'none';
      modal._opening = true;
      const { all } = await _getMyUnlinkedPlayRecords(gameKey);
      const others = await _getOthersSessions(gameKey);
      if (!modal._opening) return;
      modal._myRecordCountAtOpen = all.length;
      modal._joinSessions = others;
      // 새 game_comments를 매다는 것뿐이라 review_text 유무와 무관하다 — 사진 추가(onOpenPhotoInput)와
      // 같은 기준(all)으로 통일. 예전엔 unreviewed만 써서 이미 후기를 쓴 기록만 있으면 드롭다운
      // 자체가 안 떠 "연동 체크박스가 안 보인다"는 지적을 받았다(2026-07-27).
      all.forEach(r => {
        const dateStr = r.played_at ? r.played_at.slice(2,10).replace(/-/g,'.') : '날짜 미상';
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `${dateStr}${r.group_name ? ' · ' + r.group_name : ''}${r.player_count ? ' · ' + r.player_count + '명' : ''}`;
        linkSelect.appendChild(opt);
      });
      others.forEach((s, i) => {
        const dateStr = s.played_at ? s.played_at.slice(2,10).replace(/-/g,'.') : '날짜 미상';
        const opt = document.createElement('option');
        opt.value = 'join:' + i;
        opt.dataset.join = '1';
        opt.dataset.recIds = (s.rec_ids || []).join(',');
        opt.textContent = `${dateStr}${s.group_name ? ' · ' + s.group_name : ''}${s.nickname ? ' · ' + s.nickname + '님' : ''} (참여)`;
        linkSelect.appendChild(opt);
      });
      // 특정 기록(⋯메뉴)에서 진입 시 그 기록/세션 기본 연동
      _preselectLinkOption(linkCheck, linkSelect, btn.dataset.recordId);
      if (linkSelect.options.length) linkWrap.style.display = 'block';
    }
  });
}

function onEditComment(btn) {
  const modal = getOrCreateCommentModal();
  modal.dataset.gameId = btn.dataset.game;
  modal.dataset.editId = btn.dataset.id;
  delete modal.dataset.linkCommentId;
  const titleEl = modal.querySelector('.sheet-comment-modal-title');
  const submitEl = document.getElementById('sheetCommentModalSubmit');
  if (titleEl) titleEl.textContent = '게임평 수정';
  if (submitEl) submitEl.textContent = '수정 완료';
  const input = document.getElementById('sheetCommentModalInput');
  if (input) { input.value = btn.dataset.text; input.readOnly = false; }
  const linkWrap = document.getElementById('sheetCommentPlayLink');
  if (linkWrap) linkWrap.style.display = 'none';
  modal.style.display = 'flex';
  input?.focus();
}

// 게임평 → 플레이기록 연동 (기존 코멘트에 "↗ 플레이기록으로")
async function onLinkCommentToPlay(btn) {
  const gameKey = btn.dataset.game;
  const commentId = btn.dataset.id;
  const text = btn.dataset.text;
  if (!gameKey || !commentId) return;
  const { unreviewed } = await _getMyUnlinkedPlayRecords(gameKey);
  if (!unreviewed.length) {
    // 내 기록이 없으면 → 남의 세션에 내 후기로 참여(확인창), 그마저 없으면 빈 입력 폴백
    const sessions = await _getOthersSessions(gameKey);
    if (sessions.length) {
      _openJoinConfirm(gameKey, sessions, text, commentId);
    } else {
      showActionToast('연동할 플레이 기록이 없어요', '↗ 플레이기록 남기기', () => {
        location.href = `${rootPath}pages/game/game-reviews.html?tab=input`;
      });
    }
    return;
  }
  const modal = getOrCreateCommentModal();
  modal.dataset.gameId = gameKey;
  delete modal.dataset.editId;
  modal.dataset.linkCommentId = commentId;
  const titleEl = modal.querySelector('.sheet-comment-modal-title');
  const submitEl = document.getElementById('sheetCommentModalSubmit');
  const input = document.getElementById('sheetCommentModalInput');
  if (titleEl) titleEl.textContent = '플레이기록에 연동';
  if (submitEl) submitEl.textContent = '연동하기';
  if (input) { input.value = text; input.readOnly = true; }

  const linkWrap = document.getElementById('sheetCommentPlayLink');
  const linkCheck = document.getElementById('sheetCommentLinkCheck');
  const linkSelect = document.getElementById('sheetCommentPlaySelect');
  const linkLabel = linkWrap?.querySelector('.sheet-comment-play-link-label');
  if (linkLabel) linkLabel.style.display = 'none';
  if (linkCheck) linkCheck.checked = true;
  if (linkSelect) {
    linkSelect.innerHTML = '';
    unreviewed.forEach(r => {
      const dateStr = r.played_at ? r.played_at.slice(2,10).replace(/-/g,'.') : '날짜 미상';
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${dateStr}${r.group_name ? ' · ' + r.group_name : ''}${r.player_count ? ' · ' + r.player_count + '명' : ''}`;
      linkSelect.appendChild(opt);
    });
    linkSelect.style.display = 'block';
  }
  if (linkWrap) linkWrap.style.display = 'block';
  modal.style.display = 'flex';
}

function onCloseCommentModal() {
  const modal = document.getElementById('sheetCommentModal');
  if (modal) {
    modal._opening = false;
    modal.style.display = 'none';
    delete modal.dataset.editId;
    delete modal.dataset.linkCommentId;
    delete modal.dataset.recordId;   // (014) 기록 첨부 모드 해제
    const input = document.getElementById('sheetCommentModalInput');
    if (input) input.readOnly = false;
    const linkLabel = document.querySelector('#sheetCommentPlayLink .sheet-comment-play-link-label');
    if (linkLabel) linkLabel.style.display = '';
  }
}

/* ─── 사진 남기기 모달 ────────────────────────────────────── */
function getOrCreatePhotoModal() {
  let modal = document.getElementById('sheetPhotoModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sheetPhotoModal';
  modal.className = 'sheet-comment-modal';
  modal.innerHTML = `
    <div class="sheet-comment-modal-box">
      <p class="sheet-comment-modal-title">사진 남기기</p>
      <div class="sheet-play-photo-row" style="margin-bottom:8px;">
        <div class="sheet-play-photo-grid" id="sheetPhotoModalGrid"></div>
        <label class="sheet-play-photo-add-btn" id="sheetPhotoModalAddBtn">
          📷
          <input aria-label="사진 고르기" type="file" accept="image/*" multiple id="sheetPhotoModalInput" style="display:none;">
        </label>
      </div>
      <div class="sheet-comment-play-link" id="sheetPhotoPlayLink" style="display:none;">
        <label class="sheet-comment-play-link-label">
          <input type="checkbox" id="sheetPhotoLinkCheck">
          <span>기존 플레이 기록에 연동</span>
        </label>
        <select aria-label="연동할 플레이 기록" class="sheet-comment-play-select" id="sheetPhotoPlaySelect" style="display:none;"></select>
      </div>
      <div class="sheet-comment-modal-actions">
        <button class="sheet-comment-form-cancel" onclick="onClosePhotoModal()">취소</button>
        <button class="sheet-comment-form-submit" id="sheetPhotoModalSubmit" onclick="onSubmitPhotoModal()">등록</button>
      </div>
    </div>
  `;
  modal._photoFiles = [];
  modal.querySelector('#sheetPhotoModalInput').addEventListener('change', async e => {
    const grid = document.getElementById('sheetPhotoModalGrid');
    const adder = window.buildPhotoItemAdder?.(grid, modal._photoFiles, 5);
    if (!adder) return;
    for (const f of Array.from(e.target.files || [])) await adder(f);
    e.target.value = '';
  });
  modal.querySelector('#sheetPhotoLinkCheck').addEventListener('change', e => {
    document.getElementById('sheetPhotoPlaySelect').style.display = e.target.checked ? 'block' : 'none';
  });
  modal.addEventListener('click', e => { if (e.target === modal) onClosePhotoModal(); });
  document.body.appendChild(modal);
  return modal;
}

function onOpenPhotoInput(btn) {
  const gameKey = btn.dataset.gameId;
  requireLogin(async () => {
    const modal = getOrCreatePhotoModal();
    modal.dataset.gameId = gameKey;
    modal._photoFiles = [];
    const grid = document.getElementById('sheetPhotoModalGrid');
    if (grid) { window.revokePhotoGridBlobs?.(grid); grid.innerHTML = ''; }
    const linkWrap = document.getElementById('sheetPhotoPlayLink');
    const linkCheck = document.getElementById('sheetPhotoLinkCheck');
    const linkSelect = document.getElementById('sheetPhotoPlaySelect');
    if (linkWrap && linkCheck && linkSelect) {
      linkCheck.checked = false;
      linkSelect.style.display = 'none';
      linkSelect.innerHTML = '';
      linkWrap.style.display = 'none';
      const _cu = window.getKakaoUser?.();
      if (_cu?.id && window.CottageDB) {
        modal._opening = true;
        const records = await window.CottageDB.getGamePlayRecords(_gameIds(gameKey));
        if (!modal._opening) return;
        const mine = records.filter(r => String(r.user_id) === String(_cu.id));
        mine.forEach(r => {
          const dateStr = r.played_at ? r.played_at.slice(2,10).replace(/-/g,'.') : '날짜 미상';
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.dataset.photoUrl = r.photo_url || '';
          opt.textContent = `${dateStr}${r.group_name ? ' · ' + r.group_name : ''}${r.player_count ? ' · ' + r.player_count + '명' : ''}`;
          linkSelect.appendChild(opt);
        });
        // 남의 세션도 목록에 — 선택 시 내 새 기록(사진)으로 참여
        const others = await _getOthersSessions(gameKey);
        modal._joinSessions = others;
        others.forEach((s, i) => {
          const dateStr = s.played_at ? s.played_at.slice(2,10).replace(/-/g,'.') : '날짜 미상';
          const opt = document.createElement('option');
          opt.value = 'join:' + i;
          opt.dataset.join = '1';
          opt.dataset.recIds = (s.rec_ids || []).join(',');
          opt.textContent = `${dateStr}${s.group_name ? ' · ' + s.group_name : ''}${s.nickname ? ' · ' + s.nickname + '님' : ''} (참여)`;
          linkSelect.appendChild(opt);
        });
        // 특정 기록(⋯메뉴)에서 진입 시 그 기록/세션 기본 연동
        _preselectLinkOption(linkCheck, linkSelect, btn.dataset.recordId);
        if (mine.length || others.length) linkWrap.style.display = 'block';
      }
    }
    modal.style.display = 'flex';
  });
}

function onClosePhotoModal() {
  const modal = document.getElementById('sheetPhotoModal');
  if (modal) { modal._opening = false; modal.style.display = 'none'; }
}

async function onSubmitPhotoModal() {
  const modal = document.getElementById('sheetPhotoModal');
  const gameKey = modal?.dataset.gameId;
  if (!gameKey || !window.CottageDB) return;
  const photoFiles = modal?._photoFiles || [];
  if (!photoFiles.length) { alert('사진을 선택해 주세요.'); return; }
  const submitBtn = document.getElementById('sheetPhotoModalSubmit');
  if (submitBtn) submitBtn.disabled = true;
  const _u = window.getKakaoUser?.();
  if (!_u?.id) { if (submitBtn) submitBtn.disabled = false; return; }

  const uploaded = [];
  for (const pf of photoFiles) {
    const url = await window.CottageDB.uploadPlayPhoto(pf, _u.id);
    if (url) uploaded.push(url);
  }
  if (!uploaded.length) {
    alert('사진 업로드에 실패했습니다. 다시 시도해 주세요.');
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  const linkCheck = document.getElementById('sheetPhotoLinkCheck');
  const linkSelect = document.getElementById('sheetPhotoPlaySelect');
  const linked = linkCheck?.checked && linkSelect?.value;

  let err = null;
  // 새 플레이기록을 만든 경우에만 record_complete를 쏜다(기존 기록에 사진만 추가한 건 제외).
  // 생성 여부와 game_id를 분리한다 — 겸하면 game_id가 없을 때 이벤트가 조용히 누락된다.
  let created = false, createdGameId = null;
  const selectedOpt = linked ? linkSelect.options[linkSelect.selectedIndex] : null;
  if (linked && selectedOpt?.dataset.join === '1') {
    // 남의 세션에 참여 — 세션 필드 복사한 내 새 기록(사진)
    const s = (modal._joinSessions || [])[parseInt(String(linkSelect.value).slice(5))];
    const newPhotoUrl = uploaded.length === 1 ? uploaded[0] : JSON.stringify(uploaded);
    const result = s ? await window.CottageDB.recordGamePlay(
      s.game_id, s.player_count || null, s.player_names || null, null, null,
      _u.nickname || null, _u.id, s.group_name || null, s.played_at || null, newPhotoUrl, null
    ) : { error: 'no_session' };
    if (result?.error) err = result.error; else { created = true; createdGameId = s?.game_id || null; }
  } else if (linked) {
    const existingUrls = window.parsePhotoUrls ? window.parsePhotoUrls(selectedOpt.dataset.photoUrl) : [];
    const allUrls = [...existingUrls, ...uploaded];
    const newPhotoUrl = allUrls.length === 1 ? allUrls[0] : JSON.stringify(allUrls);
    const result = await window.CottageDB.updateGamePlay(linkSelect.value, { photo_url: newPhotoUrl });
    if (result?.error) err = result.error;
  } else {
    const storeGameId = window.gameData?.[gameKey]?.bgg?.id || gameKey;
    const newPhotoUrl = uploaded.length === 1 ? uploaded[0] : JSON.stringify(uploaded);
    const result = await window.CottageDB.recordGamePlay(
      storeGameId, null, null, null, null,
      _u.nickname || null, _u.id, null, null, newPhotoUrl, null
    );
    if (result?.error) err = result.error; else { created = true; createdGameId = storeGameId; }
  }

  if (submitBtn) submitBtn.disabled = false;
  if (err) { alert('등록에 실패했습니다. 다시 시도해 주세요.'); return; }
  if (created) window.CottageDB?.trackEvent('record_complete', { game_id: createdGameId });
  onClosePhotoModal();
  await initSheetPhotos(gameKey);
  window.refreshPlayRecordsBoard?.(); // 게시판 ⋯메뉴 경유 시 목록 즉시 반영(있을 때만)
}

function _closeAllMoreMenus() {
  document.querySelectorAll('.pr-rec-more').forEach(m => {
    m.classList.remove('is-open');
  });
  document.querySelectorAll('.pr-rec-more-menu').forEach(mm => {
    mm.removeAttribute('style');
    mm.style.display = 'none';
  });
}

async function onDeleteCommentPreview(btn) {
  if (!confirm('게임평을 삭제할까요?')) return;
  const result = await window.CottageDB?.deleteComment?.(btn.dataset.id);
  if (!result?.error) {
    const gameKey = btn.dataset.gameKey;
    if (gameKey) {
      await initSheetComments(gameKey);
      await initSheetCommentsPreview(gameKey);
    }
  }
}

async function onSubmitCommentModal() {
  const modal = document.getElementById('sheetCommentModal');
  const gameKey = modal?.dataset.gameId;
  const editId = modal?.dataset.editId;
  const linkCommentId = modal?.dataset.linkCommentId;
  const input = document.getElementById('sheetCommentModalInput');
  const text = input?.value?.trim();
  if (!text || !gameKey) { input?.focus(); return; }
  if (!window.CottageDB) return;
  const submitBtn = document.getElementById('sheetCommentModalSubmit');
  if (submitBtn) submitBtn.disabled = true;
  let result;
  let linkedRecId = null;
  let didJoin = false;
  let joinedGameId = null;
  let attachedRecId = null;   // (014) 특정 기록에 매단 게임평이면 그 기록 id
  if (linkCommentId) {
    const linkSelect = document.getElementById('sheetCommentPlaySelect');
    linkedRecId = linkSelect?.value;
    if (!linkedRecId) {
      if (submitBtn) submitBtn.disabled = false;
      alert('연동할 기록을 선택해주세요.');
      return;
    }
    result = await window.CottageDB.updateGamePlay(linkedRecId, { review_text: text });
    if (!result.error) {
      // 연동 성공 시 원본 게임평 삭제 — 남겨두면 통합 목록(게임평)에 같은 글이 중복 표시됨
      const delResult = await window.CottageDB.deleteComment(linkCommentId);
      if (delResult?.error) console.error('[onSubmitCommentModal] 연동 후 원본 게임평 삭제 실패', delResult.error);
    }
  } else if (editId) {
    result = await window.CottageDB.updateComment(editId, text);
  } else {
    const linkCheck = document.getElementById('sheetCommentLinkCheck');
    const linkSelect = document.getElementById('sheetCommentPlaySelect');
    const selVal = linkCheck?.checked ? linkSelect?.value : null;
    if (selVal && String(selVal).startsWith('join:')) {
      // 남의 세션에 참여 — 세션 필드 복사한 내 새 기록(후기)
      const s = (modal._joinSessions || [])[parseInt(String(selVal).slice(5))];
      const _cu = window.getKakaoUser?.();
      result = s ? await window.CottageDB.recordGamePlay(
        s.game_id, s.player_count || null, s.player_names || null, null, null,
        _cu?.nickname || null, _cu?.id || null, s.group_name || null, s.played_at || null, null, text
      ) : { error: 'no_session' };
      didJoin = true;
      joinedGameId = s?.game_id || null;
    } else if (selVal) {
      linkedRecId = selVal;
      result = await window.CottageDB.updateGamePlay(selVal, { review_text: text });
    } else {
      const _cu = window.getKakaoUser?.();
      attachedRecId = modal?.dataset.recordId || null;   // (014) 기록 ⋯메뉴 진입이면 그 기록에 매단다
      result = await window.CottageDB.insertComment(gameKey, text, _cu?.nickname || null, _cu?.id || null, attachedRecId);
      if (!result.error && result.id) saveMyCommentId(result.id);
    }
  }
  if (!result.error) {
    // 남의 세션 참여만 새 플레이기록을 만든다 — 연동(updateGamePlay)·게임평 단독은 아님
    if (didJoin) window.CottageDB?.trackEvent('record_complete', { game_id: joinedGameId });
    // 새 게임평(어디에도 연동 안 됨) + 이 게임에 내 플레이기록이 아예 없으면 → 남기기 넛지
    const shouldNudge = !linkCommentId && !editId && !linkedRecId && !didJoin && !attachedRecId && modal._myRecordCountAtOpen === 0;
    onCloseCommentModal();
    await initSheetComments(gameKey);         // 기록전체보기 시트용
    await initSheetCommentsPreview(gameKey);  // 메인 게임시트 미리보기용
    if (linkCommentId || linkedRecId || didJoin) {
      await initPlayWidget(gameKey);          // 연동/참여로 바뀐 기록 반영
      window.refreshPlayRecordsBoard?.();     // 게시판 목록도 반영(연동/참여로 기록 변경 시)
      showActionToast(didJoin ? '세션에 후기를 남겼어요' : '플레이기록에 연동했어요');
    } else if (attachedRecId) {
      // (014) 기록에 매단 게임평 — 게시판을 통째로 다시 그리지 않고 그 기록 줄에만 한 줄 꽂는다(위치 이동 없음)
      const _cu2 = window.getKakaoUser?.();
      window.addRecordCommentToBoard?.(attachedRecId, { id: result.id, nickname: _cu2?.nickname || null, user_id: _cu2?.id || null, comment_text: text, record_id: String(attachedRecId) });
      showActionToast('기록에 게임평을 남겼어요');
    } else if (shouldNudge) {
      // 내 기록이 없을 때: 남의 세션 있으면 확인창으로 그 세션에 후기 추가(방금 쓴 게임평은 이동)
      const sessions = await _getOthersSessions(gameKey);
      if (sessions.length) {
        _openJoinConfirm(gameKey, sessions, text, result.id);
      } else {
        showActionToast('게임평을 남겼어요', '↗ 플레이기록으로 남기기', () => {
          location.href = `${rootPath}pages/game/game-reviews.html?tab=input`;
        });
      }
    }
  }
  if (submitBtn) submitBtn.disabled = false;
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

// 플레이기록 아이템 렌더러 — R11c에서 initPlayWidget 내부 함수를 모듈 스코프로 추출.
// 캡처하던 gameKey·currentUserIdForPlay·myRecordIds는 인자로 전달, escH는 자기 로컬로 이동.
// (body의 template literal이 곧 HTML 출력이라, 출력 바이트 보존 위해 본문 들여쓰기는 원본 그대로 둔다.)
function buildRecordItemHtml(r, gameKey, currentUserIdForPlay, myRecordIds) {
  const escH = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
    const isMine = (currentUserIdForPlay && r.user_id && String(r.user_id) === String(currentUserIdForPlay))
      || (r.id && myRecordIds.has(String(r.id)));
    const showNick = !r.player_names && r.nickname;
    const dateStr = r.played_at
      ? new Date(r.played_at + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      : formatDate(r.created_at);
    const groupLabel = r.group_name
      ? `<a class="sheet-history-link" href="${rootPath}pages/game/game-reviews.html?group=${encodeURIComponent(r.group_name)}${r.played_at ? '&date=' + encodeURIComponent(r.played_at) : ''}">${escH(r.group_name)}</a>`
      : null;
    const header = [showNick ? escH(r.nickname) : null, dateStr, groupLabel].filter(Boolean).join(" · ");
    const _ip2 = [r.player_count ? `${r.player_count}명` : null, r.player_names ? escH(r.player_names) : null, r.play_time_min ? `${r.play_time_min}분` : null].filter(Boolean);
    const _sep2 = '<span class="badge-sep"> | </span>';
    const _infoTag2 = _ip2.length ? `<span class="sheet-play-info-tag">${_ip2.join(_sep2)}</span>` : '';
    const _scoreTag2 = r.score_note ? `<span class="sheet-play-info-tag">🏆 ${escH(r.score_note).replace(/\s*\/\s*/g,_sep2)}</span>` : '';
    const hasDetail = r.player_count || r.player_names || r.play_time_min || r.score_note;
    return `<div class="sheet-my-record-item${isMine ? ' sheet-my-record-item--mine' : ''}">
      <div class="sheet-record-info">
        ${header ? `<span class="sheet-record-nickname">${header}</span>` : ""}
        ${hasDetail ? `<div class="sheet-play-info">
          ${_infoTag2}${_scoreTag2}
        </div>` : ""}
      </div>
      <div class="sheet-play-record-actions">
        <button class="sheet-rec-more-btn" type="button" aria-label="사진·게임평 추가">···</button>
        ${isMine ? `<button aria-label="플레이 기록 고치기" class="sheet-play-edit-btn"
          data-game="${gameKey}" data-id="${r.id}"
          data-count="${r.player_count || ''}" data-names="${escH(r.player_names || '')}"
          data-time="${r.play_time_min || ''}" data-score="${escH(r.score_note || '')}"
          data-group="${escH(r.group_name || '')}" data-played-at="${r.played_at || ''}"
          data-review="${escH(r.review_text || '')}"
          type="button">✏️</button>
        <button aria-label="플레이 기록 지우기" class="sheet-play-cancel-btn" onclick="onCancelPlayRecord('${gameKey}','${r.id}')" type="button">✕</button>` : ""}
      </div>
      <div class="sheet-rec-more-actions">
        <button class="sheet-rec-add-btn" data-game-id="${gameKey}" data-record-id="${r.id}" onclick="onOpenCommentInput(this)" type="button">💬 게임평 추가</button>
        <button class="sheet-rec-add-btn" data-game-id="${gameKey}" data-record-id="${r.id}" onclick="onOpenPhotoInput(this)" type="button">📷 사진 추가</button>
      </div>
    </div>`;
}

async function initPlayWidget(gameKey) {
  const widget = document.getElementById(`sheetPlayWidget-${gameKey}`);
  if (!widget) return;

  if (!window.CottageDB) {
    widget.style.display = "none";
    return;
  }

  const [playCount, highlights, allRecords] = await Promise.all([
    window.CottageDB.getGamePlayCount(_gameIds(gameKey)),
    window.CottageDB.getPlayHighlights(_gameIds(gameKey)),
    window.CottageDB.getGamePlayRecords(_gameIds(gameKey)),
  ]);

  const myRecordIds = new Set(
    getMyPlayRecords(gameKey).map(r => String(r.id)).filter(Boolean)
  );
  const currentUserIdForPlay = window.getKakaoUser?.()?.id || null;

  let html = "";

  if (highlights.length) {
    html += `<div class="sheet-highlights">
      ${highlights.map(h => `<p class="sheet-highlight-item">✨ ${h.highlight_text}</p>`).join("")}
    </div>`;
  }

  const listId = `sheetAllRecords-${gameKey}`;

  // 플레이 박스 (헤더 + 기록 목록)
  html += `<div class="sheet-play-box">`;
  html += `<div class="sheet-play-record">
    <span class="sheet-play-count">플레이기록 ${playCount}건</span>
    <button class="sheet-played-btn" data-game-id="${gameKey}" type="button">+ 남기기</button>
  </div>`;

  if (allRecords.length) {
    const firstItem = buildRecordItemHtml(allRecords[0], gameKey, currentUserIdForPlay, myRecordIds);
    const restItems = allRecords.slice(1).map(r => buildRecordItemHtml(r, gameKey, currentUserIdForPlay, myRecordIds)).join('');
    const moreCount = allRecords.length - 1;
    html += `<div class="sheet-my-records-list" id="${listId}">
      ${firstItem}
      ${moreCount > 0 ? `<div class="sheet-list-rest" id="${listId}-rest" style="display:none">${restItems}</div>
      <button class="sheet-list-more-btn" id="${listId}-more" type="button">${moreCount}건 더보기 ▾</button>` : ''}
    </div>`;
  }

  html += `</div>`;

  widget.innerHTML = html;

  _bindPlayWidgetEvents(widget, listId, allRecords);
}

// initPlayWidget이 innerHTML을 넣은 뒤의 이벤트 바인딩 (더보기 토글 · ✏️ 수정 · ⋯ 메뉴)
function _bindPlayWidgetEvents(widget, listId, allRecords) {
  const moreBtn = document.getElementById(`${listId}-more`);
  if (moreBtn) {
    const restEl = document.getElementById(`${listId}-rest`);
    moreBtn.addEventListener('click', () => {
      const isExpanded = restEl.style.display !== 'none';
      if (isExpanded) {
        restEl.style.display = 'none';
        moreBtn.textContent = `${allRecords.length - 1}건 더보기 ▾`;
      } else {
        restEl.style.display = '';
        moreBtn.textContent = '접기 ▴';
        restEl.querySelectorAll('.sheet-play-edit-btn').forEach(b => {
          if (!b._editBound) {
            b._editBound = true;
            b.addEventListener('click', () => onOpenEditPlayModal(
              b.dataset.game, b.dataset.id,
              Number(b.dataset.count) || 0, b.dataset.names,
              Number(b.dataset.time) || 0, b.dataset.score,
              b.dataset.group || '', b.dataset.playedAt || '', b.dataset.review || ''
            ));
          }
        });
      }
    });
  }

  widget.querySelectorAll('.sheet-play-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => onOpenEditPlayModal(
      btn.dataset.game, btn.dataset.id,
      Number(btn.dataset.count) || 0,
      btn.dataset.names,
      Number(btn.dataset.time) || 0,
      btn.dataset.score,
      btn.dataset.group || '',
      btn.dataset.playedAt || '',
      btn.dataset.review || ''
    ));
  });

  // 기록별 ⋯ 햄버거(우상단) — 사진/게임평 추가 행을 아래로 인라인 확장(.sheet-play-box overflow:hidden 클리핑 회피)
  widget.querySelectorAll('.sheet-rec-more-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const actions = btn.closest('.sheet-my-record-item')?.querySelector('.sheet-rec-more-actions');
      if (!actions) return;
      const willOpen = !actions.classList.contains('is-open');
      widget.querySelectorAll('.sheet-rec-more-actions.is-open').forEach(a => a.classList.remove('is-open'));
      actions.classList.toggle('is-open', willOpen);
    });
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
  modal.innerHTML = _buildPlayModalHtml();
  _bindPlayModalEvents(modal);
  document.body.appendChild(modal);
  _initPlayModalNamesInput(modal);
  if (window.CottageDB) {
    window.CottageDB.getGroupNames().then(names => {
      const dl = document.getElementById('sheetPlayGroupNameList');
      if (dl) dl.innerHTML = names.map(n => `<option value="${n}">`).join('');
    });
  }

  return modal;
}

// 플레이 기록 모달의 정적 HTML — 캡처 없음(호출자 상태 불필요)
function _buildPlayModalHtml() {
  return `
    <div class="sheet-play-modal-box">
      <p class="sheet-play-modal-title">플레이 기록하기</p>
      <p class="sheet-play-modal-label">몇 명이서 했나요?</p>
      <div class="sheet-player-select-btns" id="sheetPlayModalCountBtns">
        ${[1,2,3,4,5,6,7,8].map(n => `<button class="sheet-player-select-btn" data-count="${n}" type="button">${n}명</button>`).join("")}
      </div>
      <div class="sheet-play-modal-details" id="sheetPlayModalDetails" style="display:none;">
        <div class="tag-input-wrap sheet-play-names-wrap" id="sheetPlayModalNamesWrap">
          <div class="tag-chips"></div>
          <input type="text" class="tag-text-input" placeholder="이름 입력 후 엔터" autocomplete="off">
          <input type="hidden" id="sheetPlayModalNames">
        </div>
        <div class="sheet-play-detail-row">
          <input class="sheet-play-detail-input is-half" id="sheetPlayModalTime" type="number" placeholder="플레이 시간(분)" min="1" max="999">
          <input class="sheet-play-detail-input is-half" id="sheetPlayModalScore" type="text" placeholder="점수 메모 (선택)" maxlength="100">
        </div>
      </div>
      <div class="sheet-play-date-wrap">
        <span class="sheet-play-date-lbl">📅 플레이 날짜</span>
        <input aria-label="플레이 날짜" class="sheet-play-detail-input" id="sheetPlayModalDate" type="date">
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
      <p class="sheet-play-modal-label" style="margin-top:8px;">💬 게임평 (선택)</p>
      <textarea class="sheet-play-detail-input" id="sheetPlayModalReview" rows="2" placeholder="이 게임 어떠셨나요?" maxlength="200" style="resize:none;"></textarea>
      <div class="sheet-play-photo-row">
        <div class="sheet-play-photo-grid" id="sheetPlayModalPhotoGrid"></div>
        <label class="sheet-play-photo-add-btn" id="sheetPlayModalPhotoAddBtn">
          📷
          <input aria-label="사진 고르기" type="file" accept="image/*" multiple id="sheetPlayModalPhotoInput" style="display:none;">
        </label>
      </div>
      <div class="sheet-play-modal-actions">
        <button class="sheet-play-modal-cancel" onclick="onClosePlayModal()" type="button">취소</button>
        <button class="sheet-play-modal-submit" id="sheetPlayModalSubmit" onclick="onSubmitPlayModal(false)" type="button">남기기</button>
      </div>
    </div>
  `;
}

// 모달 자체 이벤트: 배경 클릭 닫기 · 인원 선택 · 모임 체크 · 사진 추가
function _bindPlayModalEvents(modal) {
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
  modal._photoFiles = [];
  modal.querySelector('#sheetPlayModalPhotoInput').addEventListener('change', async e => {
    const grid = document.getElementById('sheetPlayModalPhotoGrid');
    const adder = window.buildPhotoItemAdder?.(grid, modal._photoFiles, 5);
    if (!adder) return;
    for (const f of Array.from(e.target.files || [])) await adder(f);
    e.target.value = '';
  });
}

// 참여자 이름 태그칩 + 자동완성 (play-records-utils 전역 사용)
function _initPlayModalNamesInput(modal) {
  // 참여자 이름 태그칩 + 자동완성
  const _namesWrap = modal.querySelector('#sheetPlayModalNamesWrap');
  const _namesHidden = modal.querySelector('#sheetPlayModalNames');
  if (_namesWrap && window.initTagInput) {
    window.initTagInput(_namesWrap, _namesHidden);
    window.attachAc?.(
      _namesWrap.querySelector('.tag-text-input'),
      () => {
        const added = [..._namesWrap.querySelectorAll('.tag-chip')].map(c => c.dataset.val.trim().toLowerCase());
        return (window._prPlayerNames || []).filter(s =>
          !s.split(',').map(n => n.trim().toLowerCase()).some(n => n && added.includes(n))
        );
      },
      s => {
        const ti = _namesWrap.querySelector('.tag-text-input');
        s.split(',').forEach(name => {
          name = name.trim(); if (!name) return;
          ti.value = name;
          ti.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        });
      },
      _namesWrap
    );
  }
}


function onOpenPlayModal(gameKey) {
  const modal = getOrCreatePlayModal();
  modal.dataset.gameId = gameKey;
  delete modal.dataset.count;
  modal.querySelectorAll('.sheet-player-select-btn').forEach(b => b.classList.remove('is-selected'));
  document.getElementById('sheetPlayModalDetails').style.display = 'none';
  // 태그칩 초기화
  const _nw = document.getElementById('sheetPlayModalNamesWrap');
  if (_nw) { _nw.querySelectorAll('.tag-chip').forEach(c => c.remove()); const _ti = _nw.querySelector('.tag-text-input'); if (_ti) _ti.value = ''; }
  document.getElementById('sheetPlayModalNames').value = '';
  if (!window._prPlayerNames) window.CottageDB?.getPlayerNames?.().then(n => { window._prPlayerNames = n || []; });
  document.getElementById('sheetPlayModalTime').value = '';
  document.getElementById('sheetPlayModalScore').value = '';
  const groupCheck = document.getElementById('sheetPlayModalGroupCheck');
  if (groupCheck) { groupCheck.checked = false; }
  document.getElementById('sheetPlayModalGroupNameWrap').style.display = 'none';
  document.getElementById('sheetPlayModalGroupName').value = '';
  const dateInput = document.getElementById('sheetPlayModalDate');
  if (dateInput) {
    // new Date().toISOString()은 UTC라 한국시간 오전 9시 전엔 "오늘"이 하루 전으로 나온다
    // (day-detail.js의 경고 주석과 동일 함정, 2026-07-28 실측으로 발견).
    const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0];
    dateInput.value = todayKst;
    dateInput.max = todayKst;
  }
  const reviewInput = document.getElementById('sheetPlayModalReview');
  if (reviewInput) reviewInput.value = '';
  modal._photoFiles = [];
  const photoGrid = document.getElementById('sheetPlayModalPhotoGrid');
  if (photoGrid) { window.revokePhotoGridBlobs?.(photoGrid); photoGrid.innerHTML = ''; }
  modal.style.display = 'flex';
}

function onClosePlayModal() {
  const modal = document.getElementById('sheetPlayModal');
  if (!modal) return;
  modal.style.display = 'none';
  delete modal.dataset.editId;
  const title = modal.querySelector('.sheet-play-modal-title');
  const submit = document.getElementById('sheetPlayModalSubmit');
  if (title) title.textContent = '플레이 기록하기';
  if (submit) submit.textContent = '남기기';
  const reviewInput = document.getElementById('sheetPlayModalReview');
  if (reviewInput) reviewInput.value = '';
  modal._photoFiles = [];
  const photoGrid = document.getElementById('sheetPlayModalPhotoGrid');
  if (photoGrid) { window.revokePhotoGridBlobs?.(photoGrid); photoGrid.innerHTML = ''; }
}

function onOpenEditPlayModal(gameKey, recordId, playerCount, playerNames, playTimeMin, scoreNote, groupName, playedAt, reviewText) {
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

  // 태그칩으로 playerNames 채우기
  const _nw2 = document.getElementById('sheetPlayModalNamesWrap');
  if (_nw2) {
    _nw2.querySelectorAll('.tag-chip').forEach(c => c.remove());
    const _ti2 = _nw2.querySelector('.tag-text-input');
    const _hi2 = document.getElementById('sheetPlayModalNames');
    if (_ti2 && _hi2) {
      _hi2.value = '';
      (playerNames || '').split(',').forEach(name => {
        name = name.trim(); if (!name) return;
        _ti2.value = name;
        _ti2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      });
    }
  } else {
    document.getElementById('sheetPlayModalNames').value = playerNames || '';
  }
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
    // KST 보정(위 sheetPlayModalDate 초기화 자리와 동일 이유)
    const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0];
    dateInput.value = playedAt || todayKst;
    dateInput.max = todayKst;
  }

  const errEl = modal.querySelector('.sheet-play-modal-err');
  if (errEl) errEl.textContent = '';

  const title = modal.querySelector('.sheet-play-modal-title');
  const submit = document.getElementById('sheetPlayModalSubmit');
  if (title) title.textContent = '플레이 기록 수정';
  if (submit) submit.textContent = '수정하기';

  const reviewInput = document.getElementById('sheetPlayModalReview');
  if (reviewInput) reviewInput.value = reviewText || '';

  modal.style.display = 'flex';
}

async function onSubmitPlayModal() {
  const modal = document.getElementById('sheetPlayModal');
  const gameKey = modal?.dataset.gameId;
  const editId = modal?.dataset.editId || null;
  if (!gameKey || !window.CottageDB) return;
  const count = parseInt(modal?.dataset.count || "0", 10);
  const playerNames = document.getElementById('sheetPlayModalNames')?.value?.trim() || null;
  const tv = document.getElementById('sheetPlayModalTime')?.value;
  const playTimeMin = tv ? parseInt(tv, 10) : null;
  const scoreNote = document.getElementById('sheetPlayModalScore')?.value?.trim() || null;
  const groupCheck = document.getElementById('sheetPlayModalGroupCheck');
  const groupName = (groupCheck?.checked
    ? document.getElementById('sheetPlayModalGroupName')?.value?.trim()
    : null) || null;
  const playedAt = document.getElementById('sheetPlayModalDate')?.value || null;
  const reviewText = document.getElementById('sheetPlayModalReview')?.value?.trim() || null;
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
      review_text: reviewText,
    });
    if (!result?.error) {
      onClosePlayModal();
      await initPlayWidget(gameKey);
      window.refreshPlayRecordsBoard?.(); // 기록 수정 → 게시판 반영
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
    const storeGameId = window.gameData?.[gameKey]?.bgg?.id || gameKey;
    let photoUrl = null;
    const photoFiles = modal?._photoFiles || [];
    if (photoFiles.length && _u?.id) {
      const uploaded = [];
      for (const pf of photoFiles) {
        const url = await window.CottageDB.uploadPlayPhoto(pf, _u.id);
        if (url) uploaded.push(url);
      }
      if (uploaded.length === 1) photoUrl = uploaded[0];
      else if (uploaded.length > 1) photoUrl = JSON.stringify(uploaded);
    }
    const playResult = await window.CottageDB.recordGamePlay(
      storeGameId, count, playerNames, playTimeMin, scoreNote,
      _u?.nickname || null, _u?.id || null, groupName, playedAt, photoUrl, reviewText
    );
    if (!playResult?.error) {
      window.CottageDB?.trackEvent('record_complete', { game_id: storeGameId });
      addMyPlayRecord(gameKey, {
        id: playResult?.id || null,
        playerCount: count || null,
        playerNames: playerNames || null,
        playTimeMin: playTimeMin || null,
        scoreNote: scoreNote || null,
      });
      onClosePlayModal();
      await initPlayWidget(gameKey);
      window.refreshPlayRecordsBoard?.(); // 신규 기록 → 게시판 반영
    }
  }
  if (submitBtn) submitBtn.disabled = false;
}

/* =========================
   # RECOMMEND MODAL ELEMENTS
========================= */

/* ===== R11c(GS2) 공개 API 노출 =====
   전역 유지 필수 = 파일 밖(js/html) 참조 14 ∪ 자기 템플릿 onclick 호출 27 = 함수 37개
   (GS7에서 getDifficultyData·normalizeLevelValue 2개를 game-display-adapter로 이관 → 39→37).
   + 크로스파일에서 bare 참조되는 상수 2개(DEFAULT_GAME_IMAGE·GameView).
   나머지 최상위 함수 60개와 모듈 상태(gameSheetContent·_gameSheetHistory 등)는 IIFE 내부 은닉. */
Object.assign(window, {
  _openCoverModal, _openOrganizerLightbox, closeGameSheet, ensureGameSheet,
  formatDate, formatDifficultyWeight, formatPlayers, formatRating,
  getAllGamesArray, getAvailBadgeHtml, getGameKey, getShelfSpanHtml,
  goBackGameSheet, loginFromSheet,
  onCancelPlayRecord, onCloseCommentModal, onClosePhotoModal, onClosePlayModal,
  onDeleteComment, onDeleteCommentPreview, onDeletePlayReview, onEditComment,
  onEditPlayReview, onLinkCommentToPlay, onOpenCommentInput, onOpenPhotoInput,
  onSheetCurious, onSheetLike, onSubmitCommentModal, onSubmitPhotoModal, onSubmitPlayModal,
  openGameRecordSheet, openGameSheet, openShelfSheet, requireLogin,
  toggleSheetDesc, toggleSheetMechs,
  DEFAULT_GAME_IMAGE, GameView,
});

// gameSheet: 재할당되는 시트 요소라 스냅샷 노출 불가 → 라이브 getter.
// (owned-games-page.js:884 + 자기 인라인 onclick 2곳이 bare `gameSheet` 참조)
Object.defineProperty(window, 'gameSheet', {
  get: function () { return gameSheet; },
  configurable: true,
});

})();


