(function () {
  const _embedQuery = new URLSearchParams(location.search);
  const _embedHash = new URLSearchParams(location.hash.slice(1));
  if (_embedQuery.get('embed') === '1' || _embedHash.get('embed') === '1') {
    document.body.classList.add('embed-mode');
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!href || /^(#|mailto:|tel:|javascript:)/.test(href)) return;
      let url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || !url.pathname.endsWith('.html')) return;
      if (url.searchParams.get('embed') === '1' || new URLSearchParams(url.hash.slice(1)).get('embed') === '1') return;
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
        <a href="${p}admin/requests.html">요청하기</a>
      </div>
    </div>
    <div class="menu-group">
      <button class="menu-group-header" type="button">동호회 <span class="menu-group-arrow">›</span></button>
      <div class="menu-group-body">
        <a href="${p}club/club.html">동호회 홈</a>
        <a href="${p}club/club-schedule.html">모임 플래너</a>
        <a href="${p}club/club-intro.html">모임원 프로필</a>
        <a href="${p}club/club-history.html">모임 기록 &amp; 사진</a>
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
