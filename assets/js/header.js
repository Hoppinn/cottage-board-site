(function () {
  if (new URLSearchParams(location.search).get('embed') === '1') {
    document.body.classList.add('embed-mode');
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
  <a class="header-center" href="${homeHref}"${centerId}>오래 머무르고 싶은, 보드게임 공간</a>
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
    <div class="menu-group">
      <button class="menu-group-header" type="button">코티지보드 <span class="menu-group-arrow">›</span></button>
      <div class="menu-group-body">
        <a href="${p}info/about.html">소개</a>
        <a href="${p}info/price-rules.html">가격 &amp; 규칙</a>
        <a href="${p}info/guide.html">홈페이지 이용안내</a>
      </div>
    </div>
    <div class="menu-group">
      <button class="menu-group-header" type="button">동호회 <span class="menu-group-arrow">›</span></button>
      <div class="menu-group-body">
        <a href="${p}club/club.html">소개</a>
        <a href="${p}club/club.html#club-join">가입하기</a>
        <a href="${p}club/club.html#club-meeting">모임참여하기</a>
      </div>
    </div>
    <a href="${p}admin/requests.html">요청하기</a>
    <div class="menu-login-area">
      <button id="kakaoLoginBtn" class="menu-kakao-login-btn" type="button">
        <img id="kakaoProfileImg" src="" alt="" style="display:none">
        <span id="kakaoLoginText">카카오 로그인</span>
      </button>
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
