(function () {
  // slug → 표시 라벨. **관리자 분석의 유일한 표시 소스**다(#14, 2026-07-20부터
  // page_sessions·page_views 양쪽 화면이 전부 이 맵을 통해 이름을 붙인다).
  // 🚨 값은 각 페이지의 실제 `<title>`과 맞춘다. 예전엔 이 맵이 개명을 따라가지 못해
  //    `club-intro`가 '동호회 소개'(실제로는 club.html의 옛 이름)로 표시되는 등
  //    **화면에서 두 페이지가 같은 이름으로 보였다** — 2026-07-20 title 대조로 6개 정정.
  //    ⚠️ 여기 값을 바꿔도 저장 데이터는 안 갈린다(저장은 슬러그) — 그게 #14 수정의 핵심이다.
  window.COTTAGE_PAGE_LABELS = {
    'index': '메인', 'about': '코티지가 만들어진 이유', 'game-reviews': '플레이 기록',
    'club': '동호회', 'requests': '요청하기', 'requests-admin': '관리자',
    'game-location': '게임 위치', 'owned-games': '전체 게임 보기',
    'club-history': '모임 기록', 'club-meeting': '모임 플래너(구 경로)',
    'club-intro': '멤버 게임 프로필', 'club-schedule': '모임 플래너',
    'club-rules': '동호회 참여 안내', 'price-rules': '가격·이용안내', 'guide': '홈페이지 기능',
    'my-board': '내 보드', 'my-board-growth': '내 보드 > 수집보드',
    'my-board-taste': '내 보드 > 취향보드', 'my-board-records': '내 보드 > 기록보드',
    'my-board-voucher': '내 보드 > 교환권', 'my-board-notif': '내 보드 > 소식',
    'my-board-usage': '내 보드 > 함께한 시간', 'my-board-meeting': '내 보드 > 모임보드',
    'other-board': '다른 회원 보드',
    // PLAN_active_view_tracking.md 2차(2026-08-19) — 게임시트/게임위치 선반도 활성 뷰로 추적.
    'game-sheet': '게임 정보 시트', 'game-location-shelf': '게임 위치(시트)',
    // PLAN_active_view_tracking.md 3차(2026-08-19) — 이날 모임 상세·플래너 등록/수정 모달.
    'day-detail': '이날 모임 상세', 'planner-register': '모임 플래너(등록/수정)',
  };

  // pathname → slug. `page_sessions.page`에 저장되는 값은 **항상 이 함수의 결과**다.
  // 저장 경로가 둘(script-nav.js 세션 트래커 / supabase-client.js _startAnonHeartbeat)이라
  // 규칙을 각자 갖고 있으면 같은 페이지가 두 값으로 쌓인다(#14가 정확히 그것이었다).
  window.COTTAGE_PAGE_SLUG = function (pathname) {
    const p = String(pathname || '/');
    return (p.split('/').filter(Boolean).pop() || 'index').replace(/\.html$/, '');
  };

  // pathname 키 — script-nav.js가 `page_sessions.referrer`(내부 유입)에 넣는 표시 라벨.
  // ⚠️ `page` 컬럼에는 더 이상 쓰지 않는다(#14, 2026-07-20). 라벨을 바꾸면 과거 행과
  //    갈라지므로 저장용이 아니라 표시용으로만 쓸 것.
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
    '/pages/club/club-intro.html': '멤버 게임 프로필',
    '/pages/club/club-schedule.html': '모임 플래너',
    '/pages/admin/requests.html': '요청하기',
    '/pages/admin/requests-admin.html': '관리자',
  };
})();
