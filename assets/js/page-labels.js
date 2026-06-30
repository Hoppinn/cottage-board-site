(function () {
  // slug 키 (page_views.page 컬럼 표시용) — requests-admin.html 분석 대시보드
  window.COTTAGE_PAGE_LABELS = {
    'index': '메인', 'about': '코티지가 만들어진 이유', 'game-reviews': '기록 보기',
    'club': '동호회', 'requests': '요청하기', 'requests-admin': '관리자',
    'game-location': '게임 위치', 'owned-games': '보유 게임',
    'club-history': '모임 기록', 'club-meeting': '동호회 모임',
    'club-intro': '동호회 소개', 'club-schedule': '모임 일정',
    'club-rules': '동호회 규칙', 'price-rules': '가격·이용안내', 'guide': '홈페이지 기능',
    'my-board': '내 보드', 'my-board-growth': '내 보드 > 수집보드',
    'my-board-taste': '내 보드 > 취향보드', 'my-board-records': '내 보드 > 기록보드',
    'my-board-voucher': '내 보드 > 교환권', 'my-board-notif': '내 보드 > 소식',
  };

  // pathname 키 (page_sessions.page 컬럼에 저장될 값) — script.js 세션 트래커
  window.COTTAGE_PAGE_LABELS_BY_PATH = {
    '/': '메인',
    '/index.html': '메인',
    '/pages/game/owned-games.html': '게임 목록',
    '/pages/game/game-reviews.html': '플레이 기록',
    '/pages/game/game-location.html': '게임 위치',
    '/pages/info/about.html': '코티지가 만들어진 이유',
    '/pages/info/price-rules.html': '가격·이용안내',
    '/pages/club/club.html': '동호회 소개',
    '/pages/club/club-history.html': '모임 기록',
    '/pages/club/club-intro.html': '회원 자기소개',
    '/pages/club/club-schedule.html': '모임 플래너',
    '/pages/admin/requests.html': '요청하기',
    '/pages/admin/requests-admin.html': '관리자',
  };
})();
