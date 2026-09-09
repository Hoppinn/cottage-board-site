(function () {
  const isEmbedValue = value => value === '1' || value === 'true';
  const _embedQuery = new URLSearchParams(location.search);
  const _embedHash = new URLSearchParams(location.hash.slice(1));
  const _stackValue = _embedQuery.get('modalStack') || _embedHash.get('modalStack');
  const _stackFrame = _embedQuery.get('modalFrame') || _embedHash.get('modalFrame') || '';
  const _stackKind = _embedQuery.get('stackKind') || _embedHash.get('stackKind') || '';
  const _stackPresentation = _embedQuery.get('stackPresentation') || _embedHash.get('stackPresentation') || 'overlay';
  const _stackGeometry = _embedQuery.get('stackGeometry') || _embedHash.get('stackGeometry') || 'standard';
  // A functional surface stays local even when its parent page is a Host child.
  // `request()` returns false for these kinds so existing callers use their
  // canonical renderer instead of creating another iframe document.
  const _canonicalLocalSurfaces = Object.freeze({
    'game-info': 'game-sheet',
    'game-record': 'game-sheet',
    'game-location': 'game-sheet',
    'game-rule': 'game-sheet',
  });
  // A local surface may sit above a Host child without becoming that Host
  // frame. Its own close must therefore not pop the preserved parent frame.
  const _canonicalLocalSurfaceStates = Object.freeze({
    'game-sheet': '.game-sheet.is-active',
  });
  let _localStackOpenDepth = 0;

  function _hasActiveCanonicalLocalSurface() {
    return Object.values(_canonicalLocalSurfaceStates)
      .some(selector => !!document.querySelector(selector));
  }

  function _setChildSurfaceGeometry(event) {
    const data = event.data;
    if (!['cottage-functional-surface-state', 'cottage-functional-surface-prepare'].includes(data?.type) || data.surface !== 'game-sheet') return;
    if (event.origin !== location.origin) return;
    const frame = Array.from(document.querySelectorAll('iframe'))
      .find(candidate => candidate.contentWindow === event.source);
    const owner = frame?.closest('[data-ui-surface-geometry-owner]');
    if (owner) {
      if (data.type === 'cottage-functional-surface-prepare' || data.active) owner.dataset.uiFunctionalSurface = data.surface;
      else delete owner.dataset.uiFunctionalSurface;
    }
    if (data.type === 'cottage-functional-surface-prepare') {
      event.source?.postMessage({ type: 'cottage-functional-surface-ready', surface: data.surface }, event.origin);
    }
  }

  function _completeLocalSurfaceGeometry(event) {
    if (event.origin !== location.origin || event.data?.type !== 'cottage-functional-surface-ready' || event.data.surface !== 'game-sheet') return;
    delete document.documentElement.dataset.uiFunctionalSurfacePending;
  }

  function _prepareLocalSurfaceGeometry(surface) {
    if (surface !== 'game-sheet' || window.parent === window) return;
    document.documentElement.dataset.uiFunctionalSurfacePending = surface;
    window.parent.postMessage({ type: 'cottage-functional-surface-prepare', surface }, location.origin);
  }

  function _publishLocalSurfaceGeometry() {
    if (window.parent === window) return;
    const active = !!document.querySelector('.game-sheet.is-active');
    window.parent.postMessage({ type: 'cottage-functional-surface-state', surface: 'game-sheet', active }, location.origin);
  }
  window.addEventListener('message', _setChildSurfaceGeometry);
  window.addEventListener('message', _completeLocalSurfaceGeometry);
  const _surfaceStateObserver = new MutationObserver(_publishLocalSurfaceGeometry);
  const _surfaceDiscoveryObserver = new MutationObserver(_watchLocalSurfaceGeometry);
  function _watchLocalSurfaceGeometry() {
    const sheet = document.querySelector('.game-sheet');
    if (!sheet) return;
    _surfaceStateObserver.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    _surfaceDiscoveryObserver.disconnect();
    _publishLocalSurfaceGeometry();
  }
  _surfaceDiscoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
  _watchLocalSurfaceGeometry();

  // A Host child reuses an existing page/component renderer. Annotate concrete
  // roles once so CSS can follow ownership instead of route or tag names.
  function _applyHostChildContract() {
    const body = document.body;
    if (!body || _stackValue !== '1' || _stackFrame !== 'child') return;
    const set = (selector, name, value) => document.querySelectorAll(selector)
      .forEach(el => { el.dataset[name] = value; });

    body.dataset.uiStructure = 'host-child';
    body.dataset.uiGeometryOwner = 'host';
    body.dataset.uiNavigation = _stackPresentation === 'drilldown' ? 'drilldown' : 'overlay';
    body.dataset.uiChromeOwner = 'mixed';
    body.dataset.uiGeometryVariant = _stackGeometry === 'compact' ? 'compact' : 'standard';
    body.dataset.uiScrollBoundary = 'child';
    body.dataset.uiFunctionalSurface = _canonicalLocalSurfaces[_stackKind] || 'page';

    set('.site-header, .site-footer, .breadcrumb, .page-hero, .inner-page-title', 'uiChrome', 'global');
    if (_stackKind === 'game-location') {
      set('main', 'uiContentRole', 'functional');
    } else {
      set('main, #recommend, .inner-page', 'uiChrome', 'global-content');
    }
    set('.dd-meeting-modal, .recommend-overlay-panel, .profile-panel-box, .profile-subsheet-box, .rule-hub-box', 'uiGeometry', 'host-fill');
    set('.dd-overlay, .recommend-overlay, .profile-panel, .profile-subsheet, .rule-hub-overlay', 'uiLayer', 'host-transparent');
    set('.dd-meeting-header .dd-x-btn, .recommend-overlay-close, .profile-panel-close, .profile-subsheet-close, .profile-subsheet-title, .rule-hub-back', 'uiChrome', 'host-duplicate');
    set('.recommend-overlay-header, .profile-subsheet-header, .profile-subsheet-back', 'uiChrome', 'functional');
    set('.profile-subsheet-back', 'uiNavigation', 'local');
    set('.game-sheet-scroll, .rule-hub-scroll, .recommend-overlay-list, .profile-panel-body, .profile-subsheet-body, .dd-modal-scroll', 'uiScrollOwner', 'feature');
    set('.game-sheet, .game-sheet-panel, .game-sheet-scroll', 'uiFunctionalSurface', 'game-sheet');
  }
  window.CottageModalStack = {
    state: () => ({ enabled: _stackValue === '1', frame: _stackFrame, kind: _stackKind, presentation: _stackPresentation, geometry: _stackGeometry, query: _embedQuery, hash: _embedHash }),
    request: (kind, payload = {}, options = {}) => {
      if (_stackValue !== '1' || _localStackOpenDepth || window.parent === window || _canonicalLocalSurfaces[kind]) return false;
      const presentation = options?.presentation === 'drilldown' ? 'drilldown' : 'overlay';
      window.parent.postMessage({ type: 'cottage-modal-stack-push', kind, payload, presentation }, '*');
      return true;
    },
    pop: () => {
      if (_hasActiveCanonicalLocalSurface()) return false;
      if (_stackValue !== '1' || _stackFrame !== 'child' || window.parent === window) return false;
      window.parent.postMessage({ type: 'cottage-modal-stack-pop' }, '*');
      return true;
    },
    prepareFunctionalSurface: _prepareLocalSurfaceGeometry,
    runLocal: fn => {
      _localStackOpenDepth++;
      try { return fn(); } finally { _localStackOpenDepth--; }
    },
  };
  if (isEmbedValue(_embedQuery.get('embed')) || isEmbedValue(_embedHash.get('embed'))) {
    document.body.classList.add('embed-mode');
    // Parent stack child는 첫 paint부터 원 페이지 chrome을 숨긴다.
    if (_stackValue === '1' && _stackFrame === 'root') document.body.classList.add('modal-stack-root');
    if (_stackValue === '1' && _stackFrame === 'child') {
      document.body.classList.add('guide-child-mode');
      // child chrome 예외는 URL 자체가 아니라 Host가 지정한 route kind에만 한정한다.
      if (/^[a-z-]+$/.test(_stackKind)) document.body.classList.add(`modal-stack-kind-${_stackKind}`);
      _applyHostChildContract();
      new MutationObserver(_applyHostChildContract).observe(document.body, { childList: true, subtree: true });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (window.CottageModalStack.pop()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, true);
    }
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!href || /^(#|mailto:|tel:|javascript:)/.test(href)) return;
      let url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || !url.pathname.endsWith('.html')) return;
      if (isEmbedValue(url.searchParams.get('embed')) || isEmbedValue(new URLSearchParams(url.hash.slice(1)).get('embed'))) return;
      url.searchParams.set('embed', '1');
      // localhost의 extensionless redirect가 query를 버려도 hash는 보존된다.
      url.hash = 'embed=1';
      e.preventDefault();
      location.href = url.toString();
    });
    return;
  }
  const _s = document.currentScript;
  const isIndex = _s && _s.dataset.index === 'true';
  const root = isIndex ? './' : '../../';
  const p    = isIndex ? './pages/' : '../';

  const homeHref  = isIndex ? '#' : root + 'index.html';
  const logoId    = isIndex ? ' id="goHomeLogo"' : '';
  const centerId  = isIndex ? ' id="goHomeTitle"' : '';
  const recommendLink = isIndex
    ? '<a href="#" id="openRecommendMenu">추천 게임 찾기</a>'
    : `<a href="${root}index.html#recommend">추천 게임 찾기</a>`;

  const html = `<header class="site-header">
  <a class="header-logo" href="${homeHref}"${logoId}>
    <img src="${root}assets/images/main/logo.png" alt="코티지보드 로고">
  </a>
  <a class="header-center" href="${homeHref}"${centerId} onclick="event.preventDefault();window.scrollTo({top:0,behavior:'smooth'});">좋은 사람 사이에, 좋은 게임을 놓다</a>
  <div class="header-actions">
    <button class="header-search" id="headerSearchButton" type="button" aria-label="게임 검색 열기"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg></button>
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="메뉴 열기">☰</button>
  </div>
  <nav class="header-menu" id="mobileMenu">
    <div class="menu-group">
      <button class="menu-group-header" type="button">게임 <span class="menu-group-arrow">›</span></button>
      <div class="menu-group-body">
        ${recommendLink}
        <a href="${p}game/owned-games.html">전체 게임 보기</a>
        <a href="${p}game/game-location.html">게임 위치</a>
        <a href="${p}game/game-reviews.html">플레이 기록</a>
      </div>
    </div>
    <a href="${p}info/about.html" class="menu-link-home">코티지를 만든 이유</a>
    <div class="menu-group">
      <button class="menu-group-header" type="button">코티지 이용 <span class="menu-group-arrow">›</span></button>
      <div class="menu-group-body">
        <a href="${p}info/price-rules.html">가격 · 이용안내</a>
        <a href="${p}info/guide.html">홈페이지 기능</a>
        <div class="menu-group menu-group--nested">
          <button class="menu-group-header" type="button">동호회 <span class="menu-group-arrow">›</span></button>
          <div class="menu-group-body">
            <a href="${p}club/club.html">동호회 홈</a>
            <a href="${p}club/club-intro.html">모임원 프로필</a>
            <a href="${p}club/club-schedule.html">모임 플래너</a>
            <a href="${p}club/club-history.html">모임 기록 &amp; 사진</a>
          </div>
        </div>
        <a href="${p}admin/requests.html">요청하기</a>
      </div>
    </div>
    <div class="menu-login-area">
      <button id="kakaoLoginBtn" class="menu-kakao-login-btn" type="button">
        <img id="kakaoProfileImg" src="" alt="" style="display:none">
        <span id="kakaoLoginText">카카오 로그인</span>
        <span class="menu-login-arrow" aria-hidden="true">›</span>
      </button>
      <a id="menuAdminLink" class="menu-admin-link" href="/pages/admin/requests-admin.html" style="display:none;">🔧 관리자 페이지</a>
      <div id="kakaoUserActions" class="menu-kakao-user-actions">
        <button id="kakaoPhotoBtn" type="button">사진 변경</button>
        <button id="kakaoNicknameBtn" type="button">닉네임 변경</button>
        <button id="kakaoLogoutBtn" type="button">로그 아웃</button>
      </div>
    </div>
  </nav>
  <div class="header-search-panel" id="headerSearchPanel">
    <input id="headerSearchInput" type="search" placeholder="게임명을 입력하세요">
    <p class="header-search-hint">게임명을 누르면 바로 보기 · Enter를 누르면 전체 검색</p>
    <div class="header-search-results" id="headerSearchResults"></div>
  </div>
</header>`;

  if (_s && _s.parentNode) {
    _s.insertAdjacentHTML('afterend', html);
  }
})();

// 푸터 외부 이동 링크(지도·전화·카카오채널·인스타그램) — 바로 이동하지 않고 확인창 먼저.
// 마크업은 pages/*.html 15곳에 중복돼 있지만 header.js는 그 전부에 공통 로드되므로 여기 한 곳만 고치면 된다.
(function () {
  document.addEventListener('click', function (e) {
    const a = e.target.closest('.site-footer a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    let msg;
    if (href.indexOf('tel:') === 0) {
      msg = href.slice(4) + '로 전화를 거시겠어요?';
    } else {
      const label = (a.textContent || '').replace(/^←\s*/, '').trim() || '외부 사이트';
      msg = label + '(으)로 이동할까요? 코티지보드를 벗어납니다.';
    }
    e.preventDefault();
    if (!window.confirm(msg)) return;
    if (a.target === '_blank') {
      window.open(a.href, '_blank', 'noopener,noreferrer');
    } else {
      location.href = a.href;
    }
  });
})();
