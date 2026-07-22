// member-analytics.js — 관리자 분석의 "한 사람" 집계 단일 소스 (P4, 2026-07-22)
//
// 왜 이 파일이 있나: 같은 집계(페이지 분포·기간 선택·이벤트 계열)를 관리자 페이지
// (pages/admin/requests-admin.html)와 회원 보드(kakao-auth.js openProfilePanel의 오너
// 전용 섹션)가 **둘 다** 그린다. 두 곳이 각자 계산하면 같은 개념이 조용히 갈린다(#15 —
// admin-analytics.md가 반복 경고). 그래서 순수 함수만 여기 모아 양쪽이 공유한다.
//
// 🚨 순수 함수만 둔다 — 전역·클로저에 기대지 않고 인자로만 동작한다(「함수 추출 3종 함정」:
//    읽기누수·쓰기누수·크로스파일 갭). rows/events/todayKst를 전부 인자로 받는다.
// 🚨 rows는 **이미 normalizePageKey로 정규화된** page를 가진다고 가정한다(#14: 관리자
//    페이지는 loadAnalytics 진입점에서 정규화한다. 보드 소비처도 넣기 전에 정규화할 것).
(function () {
  'use strict';

  // ── KST 날짜 헬퍼 ──────────────────────────────────────────────────
  // toKstDate(iso) → 'YYYY-MM-DD'. buildAnonUserMap의 자정 판정과 같은 함수라야
  // 경계가 갈리지 않는다(관리자 페이지 _toKstDate와 동일).
  const toKstDate = isoStr => new Date(new Date(isoStr).getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const kstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const kstShift = n => new Date(Date.now() + 9 * 3600000 + n * 86400000).toISOString().slice(0, 10);

  // ── 펼침 표의 기간 선택 ────────────────────────────────────────────
  // 고정 프리셋 4개 + 특정 날짜(YYYY-MM-DD). renderCharts의 calcRange/filterByRange와는
  // 스코프가 다르다(그건 날짜 네비 경로 = #5의 영토). 여긴 KST 날짜 문자열 비교로 끝난다.
  const VP_PERIODS = [
    { key: 'all',       label: '전 기간' },
    { key: 'today',     label: '오늘' },
    { key: 'yesterday', label: '어제' },
    { key: '7d',        label: '7일' },
  ];
  const VP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  // 행이 그 기간에 속하는가. 'all'은 **아무것도 거르지 않는다** — 기본값이 기존 동작과
  // 한 글자도 달라지면 안 된다(회귀 가드가 이걸 본다). todayKst는 호출부가 넘긴다
  // (관리자 페이지는 loadAnalytics 시점 todayKst 고정값, 보드는 kstToday()).
  function inVpPeriod(r, period, todayKst) {
    if (!period || period === 'all') return true;
    if (!r.entered_at) return false;              // 날짜가 없으면 기간을 물을 수 없다
    const today = todayKst || kstToday();
    const d = toKstDate(r.entered_at);
    if (period === 'today') return d === today;
    if (period === 'yesterday') return d === kstShift(-1);
    if (period === '7d') return d > kstShift(-7) && d <= today;   // 오늘 포함 7일
    if (VP_DATE_RE.test(period)) return d === period;             // 특정 날 하루
    return true;
  }

  // 라벨은 고른 값에서 파생시킨다(원칙 ①) — 프리셋이면 그 라벨, 날짜면 「M월 D일」.
  function vpLabel(period) {
    const preset = VP_PERIODS.find(p => p.key === period);
    if (preset) return preset.label;
    if (VP_DATE_RE.test(period)) { const [, m, d] = period.split('-'); return `${+m}월 ${+d}일`; }
    return VP_PERIODS[0].label;
  }

  // ── 페이지 키 정규화 ───────────────────────────────────────────────
  // page_sessions.page에 네 형태가 섞여 있다(슬러그·한글 라벨·pathname·개명 전 옛 라벨, #14).
  // ⚠️ 별칭표에서 한글 키를 지우지 말 것 — 그 라벨로 저장된 과거 행이 다시 독립 버킷이 된다.
  const PAGE_KEY_ALIASES = {
    '/': 'index',
    '/index.html': 'index',
    index: 'index',
    '메인': 'index',
    '게임 목록': 'owned-games',
    '보유 게임': 'owned-games',
    '플레이 기록': 'game-reviews',
    '기록 보기': 'game-reviews',
    '게임 위치': 'game-location',
    '코티지가 만들어진 이유': 'about',
    '코티지보드 소개': 'about',          // ~2026-06-30 개명 전 라벨 (357행)
    '가격·이용안내': 'price-rules',
    '가격 & 규칙': 'price-rules',        // ~2026-07-01 개명 전 라벨 (174행)
    '홈페이지 기능': 'guide',
    '동호회 소개': 'club',
    '회원 자기소개': 'club-intro',
    '모임 플래너': 'club-schedule',
    '모임 일정': 'club-schedule',
    '일정 투표': 'club-schedule',        // ~2026-06-18 개명 전 라벨 (32행)
    '모임 기록': 'club-history',
    '동호회 규칙': 'club-rules',
    '요청하기': 'requests',
    '관리자': 'requests-admin',
  };

  function normalizePageKey(page) {
    if (!page) return page;
    let key = String(page);
    try {
      if (key.startsWith('http')) key = new URL(key).pathname;
    } catch (_) {}
    key = key.replace(/^https?:\/\/[^/]+/, '');
    if (key.startsWith('/pages/')) key = key.split('/').filter(Boolean).pop()?.replace('.html', '') || key;
    if (key.startsWith('/')) key = key === '/' ? '/' : key.split('/').filter(Boolean).pop()?.replace('.html', '') || key;
    key = key.replace(/\.html$/, '');
    return PAGE_KEY_ALIASES[key] || key;
  }

  // ── 한 사람의 페이지 분포 ──────────────────────────────────────────
  // idType 'member'면 user_id로, 아니면 session_key로(비회원) 거른다. 누적식은 관리자
  // 페이지 buildUserMap/buildAnonUserMap과 **같아야** 값이 갈리지 않는다.
  // ⚠️ dedupUserPageDay를 거치지 않는 것이 의도다 — dedup하면 체류가 그날 첫 세션 것만
  //    합산돼 과소집계된다(admin-analytics 5-1 제약).
  // rows는 정규화된 page를 가진다고 가정(위 파일 헤더). 반환: Map<page, {visits,totalSec}>.
  function buildPageMap(rows, idType, id, period, todayKst) {
    const pm = new Map();
    for (const r of rows) {
      if (idType === 'member') { if (String(r.user_id || '') !== String(id)) continue; }
      else { if (r.user_id || r.session_key !== id) continue; }
      if (!inVpPeriod(r, period, todayKst)) continue;
      if (!pm.has(r.page)) pm.set(r.page, { visits: 0, totalSec: 0 });
      pm.get(r.page).visits++; pm.get(r.page).totalSec += r.duration_sec || 0;
    }
    return pm;
  }

  // ── 이벤트 계열 (단일 출처) ────────────────────────────────────────
  // 🚨 새 trackEvent 타입은 **반드시 여기 등록**한다. 조회 목록(EVENT_ALL_TYPES)이 여기서
  //    파생되므로 빠지면 관리자 화면이 아예 조회하지 않아 조용히 안 보인다(#13: 1,493행 중
  //    77%가 그렇게 안 보였다). admin-analytics.md 5-1 제약 #1.
  const EVENT_FAMILIES = [
    { key: 'meeting',   emoji: '🤝', label: '모임', types: [
      'home_meeting_main_click', 'home_meeting_planner_click', 'home_meeting_date_preview_click',
      'home_meeting_preview_card_click', 'home_meeting_week_nav', 'meeting_planner_bar_click',
      'meeting_profile_click' ] },
    { key: 'record',    emoji: '📋', label: '플레이기록', types: [
      'home_record_main_click', 'home_record_more_click', 'home_record_write_click',
      'record_start', 'record_complete' ] },
    { key: 'recommend', emoji: '🔍', label: '추천게임', types: [
      'home_recommend_main_click', 'home_recommend_game_detail_click', 'home_recommend_all_click',
      'recommend_start', 'recommend_complete', 'recommend_game_click', 'hero_recommend_click' ] },
    { key: 'signup',    emoji: '👤', label: '가입', types: ['signup_complete'] },
  ];
  const EVENT_ALL_TYPES = EVENT_FAMILIES.flatMap(f => f.types);

  // 이벤트를 "사람" 단위로 세기 위한 식별자. 로그인 회원은 user_id, 비로그인은 session_key.
  const eventPersonId = e => e.user_id || e.session_key || null;

  // 이벤트 타입 → 한글 라벨. 보드 오너 섹션의 「무엇을 했나」가 raw 타입명 대신 이걸 보여준다.
  // (관리자 이벤트 탭은 계열 단위로만 보여줘 지금껏 필요 없었다.) 새 타입을 EVENT_FAMILIES에
  // 추가하면 여기도 한 줄 추가한다 — 빠지면 eventTypeLabel이 raw 타입명으로 폴백한다.
  const EVENT_TYPE_LABELS = {
    home_meeting_main_click: '홈 · 모임 메뉴',
    home_meeting_planner_click: '홈 · 플래너 열기',
    home_meeting_date_preview_click: '홈 · 날짜 미리보기',
    home_meeting_preview_card_click: '홈 · 모임 카드',
    home_meeting_week_nav: '홈 · 주간 넘김',
    meeting_planner_bar_click: '플래너 · 일정 막대',
    meeting_profile_click: '모임 · 참여자 프로필',
    home_record_main_click: '홈 · 기록 메뉴',
    home_record_more_click: '홈 · 기록 더보기',
    home_record_write_click: '홈 · 기록 작성 버튼',
    record_start: '기록 · 작성 시작',
    record_complete: '기록 · 저장 완료',
    home_recommend_main_click: '홈 · 추천 메뉴',
    home_recommend_game_detail_click: '홈 · 추천 게임 상세',
    home_recommend_all_click: '홈 · 추천 전체보기',
    recommend_start: '추천 · 시작',
    recommend_complete: '추천 · 완료',
    recommend_game_click: '추천 · 게임 클릭',
    hero_recommend_click: '홈 · 히어로 추천',
    signup_complete: '가입 완료',
  };
  const eventTypeLabel = t => EVENT_TYPE_LABELS[t] || t;

  // ── 한 회원의 이벤트 집계 (보드 오너 섹션 전용) ────────────────────
  // 그 회원(user_id === userId) 행만 계열별·타입별로 센다. 명단(ddPanelHtml)은 여기 없다 —
  // 그건 「여러 사람」 드릴다운이고 단일 보드엔 불필요하다. 반환: 계열 배열(총계 내림차순),
  // 각 { key, emoji, label, total, types:[{type,n}] }.
  function countMemberEvents(events, userId) {
    const uid = String(userId);
    const perType = new Map();
    for (const e of events) {
      if (String(e.user_id || '') !== uid) continue;
      perType.set(e.event_type, (perType.get(e.event_type) || 0) + 1);
    }
    const fams = EVENT_FAMILIES.map(f => {
      const types = f.types.map(t => ({ type: t, label: eventTypeLabel(t), n: perType.get(t) || 0 })).filter(x => x.n > 0);
      const total = types.reduce((s, x) => s + x.n, 0);
      return { key: f.key, emoji: f.emoji, label: f.label, total, types };
    }).filter(f => f.total > 0);
    fams.sort((a, b) => b.total - a.total);
    return fams;
  }

  window.MemberAnalytics = {
    toKstDate, kstToday, kstShift,
    VP_PERIODS, VP_DATE_RE, inVpPeriod, vpLabel,
    PAGE_KEY_ALIASES, normalizePageKey,
    buildPageMap,
    EVENT_FAMILIES, EVENT_ALL_TYPES, eventPersonId, countMemberEvents,
    EVENT_TYPE_LABELS, eventTypeLabel,
  };
})();
