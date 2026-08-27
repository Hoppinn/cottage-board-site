/* 일정 상세 컴포넌트 — 막대 클릭 모달 + 모임보드 이번주 참여 공유 */
(function () {
  if (document.getElementById('__dayDetailCSS')) return;
  const s = document.createElement('style');
  s.id = '__dayDetailCSS';
  s.textContent = `
    /* ── 모달 오버레이 ── */
    .dd-overlay {
      position: fixed; inset: 0; z-index: 9200;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    /* 이날모임 상세 전용 — 보드(--z-profile 9100)가 이 위에 겹쳐 뜨고 보드를 닫으면
       이 모달이 그대로 남아야 하므로 9100 아래에 둔다. 헤더(1000)·게임시트(9500)·
       플래너(--z-shelf 9600)는 전부 위라 영향 없음. .dd-overlay 뒤에 와야 이긴다.
       ⚠️ .dd-overlay 기본값(9200) 자체를 낮추지 말 것 — openDatePreviewModal은
          모임보드 서브시트(9200) '안에서' 열려 낮추면 서브시트 뒤에 깔린다. */
    .dd-overlay--under-board { z-index: 9050; }
    .dd-modal {
      background: var(--paper, #fffaf0);
      border-radius: 16px;
      width: 100%; max-width: 300px;
      overflow: hidden;             /* border-radius 클리핑 */
      position: relative;           /* 우상단 ✕ 앵커 */
    }
    .dd-x-btn {
      position: absolute; top: 8px; right: 10px; z-index: 2;
      background: none; border: none; padding: 4px 6px;
      font-size: 17px; line-height: 1; cursor: pointer;
      color: var(--muted, #9b8f80);
    }
    .dd-x-btn:active { color: var(--green, #7a4828); }
    .dd-preview .dd-modal-scroll { padding-bottom: 20px; }
    .dd-modal-scroll {
      overflow-y: auto;             /* 스크롤만 담당 */
      max-height: 80svh;
      padding: 20px 20px 0;
    }
    .dd-modal-nick {
      font-size: 15px; font-weight: 700;
      color: var(--green, #7a4828);
      margin-bottom: 8px;
    }
    /* 참여자별 보기 닉네임만 클릭 가능 — 다른 모달의 .dd-modal-nick은 uid가 없어 제외 */
    .dd-nick-link { display: inline-block; cursor: pointer; }
    .dd-nick-link:hover { text-decoration: underline; }
    .dd-preview-head {
      font-size: 15px; font-weight: 700;
      color: var(--green, #7a4828);
      margin-bottom: 10px;
    }
    .dd-close-row {
      padding: 12px 20px;
      display: flex; justify-content: center; gap: 8px;
    }
    .dd-close-btn {
      background: #ede8e0; border: none; border-radius: 20px;
      padding: 6px 24px; font-size: 13px; cursor: pointer;
      color: var(--green, #7a4828); font-weight: 600;
    }
    .dd-close-btn:active { background: #ddd6cb; }
    /* 등록 진입(주행동) — 같은 줄의 닫기(중립 회색)와 구분되게 초록 채움 */
    .dd-planner-btn {
      background: var(--green, #7a4828); border: none; border-radius: 20px;
      padding: 6px 20px; font-size: 13px; cursor: pointer;
      color: #fff; font-weight: 700;
    }
    .dd-planner-btn:active { filter: brightness(0.92); }

    /* ── 통계 칩 ── */
    .dd-stats-row {
      display: flex; gap: 6px; flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .dd-stat-chip {
      font-size: 11px; font-weight: 500;
      color: var(--muted, #9e8e7e);
      background: #f0ece6;
      border-radius: 20px;
      padding: 3px 9px;
      white-space: nowrap;
    }
    .dd-stat-chip.is-match {
      color: var(--green, #7a4828);
      background: #e8f2e8;
    }

    /* ── 일정 상세 블록 (모달 안 + 모임보드 인라인 공용) ── */
    .dd-block {
      margin-bottom: 14px;
    }
    .dd-block + .dd-block {
      padding-top: 14px;
      border-top: 1px solid #ede8e0;
    }
    .dd-date {
      font-size: 13px; font-weight: 700;
      color: var(--text, #3b2f2f);
      margin-bottom: 4px;
    }
    .dd-time {
      font-size: 13px; color: var(--muted, #9e8e7e);
      margin-bottom: 8px;
    }
    .dd-date-time {
      font-size: 13px; color: var(--muted, #9e8e7e);
      margin-bottom: 10px;
    }
    .dd-section { margin-bottom: 6px; }
    .dd-section-label {
      font-size: 11px; color: var(--muted, #9e8e7e);
      display: block; margin-bottom: 3px;
    }
    .dd-game-list {
      list-style: none; margin: 0; padding: 0;
    }
    .dd-game-list li {
      font-size: 13px; color: var(--text, #3b2f2f);
      padding: 1px 0;
    }
    .dd-game-thumb { width: 13px; height: 13px; border-radius: 3px; object-fit: cover; vertical-align: middle; margin-right: 3px; flex-shrink: 0; }
    /* 클릭 대상은 썸네일만(2026-07-27 결정 — 이름까지 감싸면 "읽으려고 눌렀는데 화면이
       넘어간다"는 인상을 준다). 대신 썸네일 자체가 13px라 터치 타겟이 작으므로 보이지
       않는 padding으로 히트박스만 넓히고 음수 margin으로 레이아웃엔 안 끼게 한다. */
    .dd-game-hit { cursor: pointer; border-radius: 4px; padding: 4px; margin: -4px; display: inline-block; vertical-align: middle; }
    .dd-game-hit:hover { background: rgba(0, 0, 0, 0.04); }
    .dd-empty {
      font-size: 12px; color: var(--muted, #9e8e7e);
      padding: 4px 0;
    }
    .dd-loading {
      font-size: 13px; color: var(--muted, #9e8e7e);
      text-align: center; padding: 20px 0;
    }

    /* ── 개인 일정 — want 게임 ⭐ 토글 ── */
    .dd-game-list--editable li { display: flex; align-items: center; justify-content: space-between; }
    /* 아이콘+이름을 한 flex item으로, select+별을 한 flex item으로 — 이름이 텍스트 노드로
       li에 바로 들어가면 아이콘과 별개 item이 돼 justify-content:space-between이 넷을
       흩어놓는다(2026-07-28 실측). min-width:0로 긴 이름도 컨트롤 폭을 안 밀어내게. */
    .dd-game-name-wrap { min-width: 0; }
    .dd-game-controls { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .dd-star-btn { background: none; border: none; font-size: 14px; cursor: pointer; padding: 0 2px; flex-shrink: 0; }
    .dd-star-notice { font-size: 11px; color: var(--muted, #9e8e7e); margin: 4px 0 0; }
    .dd-cond-select { appearance: none; -webkit-appearance: none; -moz-appearance: none; font-size: 11px; padding: 1px 14px 1px 5px; border-radius: 10px; border: 1px solid #ede8e0; background: #f0ece6 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7' viewBox='0 0 8 8'%3E%3Cpath d='M1 2l3 3 3-3' stroke='%239e8e7e' stroke-width='1.3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 3px center; background-size: 7px 7px; color: var(--muted, #9e8e7e); cursor: pointer; flex-shrink: 0; }
    .dd-cond-tag { font-size: 11px; color: var(--muted, #9e8e7e); font-weight: 400; }

    /* ── 날짜 상세 모달 — 참여자 토글 ── */
    .dd-participants-toggle {
      margin-top: 8px;
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }
    .dd-participants-toggle > summary {
      font-size: 12px; color: var(--muted);
      cursor: pointer; list-style: none;
      padding: 5px 12px;
      background: #f0ece6; border-radius: 20px;
      display: inline-flex; align-items: center; gap: 4px;
      user-select: none;
    }
    .dd-participants-toggle > summary::after { content: '▼'; font-size: 9px; }
    .dd-participants-toggle[open] > summary::after { content: '▲'; }
    .dd-participants-toggle > summary::-webkit-details-marker { display: none; }
    .dd-participants-toggle[open] > summary { margin-bottom: 8px; }

    /* ── 막대 공용 CSS (주간 카드 + 홈 미리보기) ── */
    .sched-bar-axis {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 6px;
      padding-left: 60px;
    }
    .sched-bar-item {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 6px;
      margin-bottom: 8px;
    }
    .sched-card-bars .sched-bar-axis { padding-left: 46px; }
    .sched-bar-left {
      display: flex; flex-direction: column;
      align-items: flex-end; justify-content: space-between;
      padding: 3px 0;
    }
    .sched-bar-actions { display: flex; gap: 0; }
    .sched-bar-edit-btn,
    .sched-bar-del-btn {
      width: 18px; height: 18px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; border-radius: 4px;
      font-size: 11px; cursor: pointer;
      color: #b8b0a4; padding: 0;
      transition: background .15s, color .15s;
    }
    .sched-bar-edit-btn:hover,
    .sched-bar-edit-btn:active { background: #ede8de; color: var(--green); }
    .sched-bar-del-btn:hover,
    .sched-bar-del-btn:active { background: #fdecea; color: #d94f4f; }
    .sched-bar-name {
      font-size: 11px;
      color: var(--text);
      width: 52px;
      flex-shrink: 0;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      text-decoration: underline dotted;
      text-underline-offset: 2px;
    }
    .sched-bar-name:hover { color: var(--green); text-decoration: underline; }
    .sched-bar-guest {
      font-size: 10px;
      font-weight: 700;
      color: var(--green);
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0 4px;
      line-height: 15px;
      flex-shrink: 0;
    }
    .sched-bar-track {
      flex: 1;
      min-height: 24px;
      background: #ede8e0;
      border-radius: 5px;
      position: relative;
    }
    .sched-bar-track.has-games { min-height: 40px; }
    .sched-bar-fill {
      position: absolute;
      top: 0; bottom: 0;
      background: var(--green);
      border-radius: 5px;
      opacity: 0.72;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      padding: 2px 6px;
      min-width: 32px;
      overflow: hidden;
    }
    .sched-bar-fill.is-mine { background: #c0843a; opacity: 0.9; }
    .sched-bar-time {
      font-size: 10px;
      color: white;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
      line-height: 1.4;
    }
    .sched-bar-game-line {
      font-size: 9px;
      color: rgba(255,255,255,0.88);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
      line-height: 1.4;
    }
    .sched-card-bars {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #ede8e0;
    }
    .sched-card-more-btn {
      display: block;
      width: 100%;
      margin-top: 6px;
      padding: 4px 0;
      background: none;
      border: none;
      font-size: 12px;
      color: var(--muted);
      cursor: pointer;
      text-align: center;
    }
    .sched-card-more-btn:hover { color: var(--green); }
    .sched-card-detail-btn {
      display: block;
      width: 100%;
      margin-top: 8px;
      padding: 8px 0;
      background: none;
      border: none;
      border-top: 1px solid #e8e0d8;
      font-size: 12px;
      color: var(--text-info);
      cursor: pointer;
      text-align: center;
    }
    .sched-card-detail-btn:hover { color: var(--green); background: #f0ece6; }
    .sched-game-tags {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border);
    }
    .sched-tag-group { margin-top: 4px; }
    .sched-tag-group:first-child { margin-top: 0; }
    .sched-tag-group-label { font-size: 9.5px; font-weight: 600; color: var(--muted, #9e8e7e); }
    .sched-game-empty { font-size: 10.5px; color: var(--muted, #9e8e7e); }
    .sched-tag-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
    .sched-game-tag {
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 10px;
      line-height: 1.5;
      white-space: nowrap;
    }
    .sched-game-tag-thumb { width: 10px; height: 10px; border-radius: 2px; object-fit: cover; margin-right: 2px; flex-shrink: 0; vertical-align: middle; }
    /* 클릭 대상(.dd-game-hit)은 이 안의 썸네일만 — 히트박스 확장용 padding/margin이 팁 밖으로
       튀지 않게 pill 안에서만 눌러쓴다(2026-07-27). */
    .sched-game-tag .dd-game-hit { padding: 2px; margin: -2px; }
    .sched-game-tag--want { background: var(--bg-soft); color: var(--green); }
    .sched-game-tag--learn { background: var(--line); color: var(--muted); }

    /* ── 룰렛 패널 ── */
    .dd-roulette-open-btn {
      display: block; width: 100%; margin: 8px 0 4px;
      background: #f5ede3; border: none; border-radius: 20px;
      padding: 8px 0; font-size: 13px; font-weight: 600;
      color: var(--green, #7a4828); cursor: pointer; text-align: center;
    }
    .dd-roulette-open-btn:active { background: #ede5d8; }
    .dd-roulette-panel {
      overflow-y: auto; max-height: 80svh;
      padding: 16px 20px 4px;
    }
    .dd-roulette-wheel-wrap {
      position: relative; width: 140px; height: 140px;
      margin: 0 auto 14px;
    }
    .dd-roulette-ptr {
      position: absolute; top: -14px; left: 50%;
      transform: translateX(-50%);
      font-size: 18px; line-height: 1;
      color: var(--green, #7a4828); z-index: 1;
    }
    .dd-roulette-wheel {
      width: 100%; height: 100%; border-radius: 50%;
      border: 3px solid var(--green, #7a4828);
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .dd-roulette-chips {
      display: flex; flex-wrap: wrap; gap: 6px;
      justify-content: center; margin-bottom: 12px;
    }
    .dd-roulette-chip {
      font-size: 12px; padding: 4px 11px; border-radius: 14px;
      border: 1.5px solid transparent;
      color: var(--green, #7a4828); font-weight: 600;
      cursor: pointer; transition: opacity .15s;
    }
    .dd-roulette-chip.is-excluded {
      opacity: 0.3; text-decoration: line-through;
      background: #f0ece6 !important; border-color: #e0d8cc !important;
    }
    .dd-roulette-chip.is-custom { border-style: dashed; }
    .dd-roulette-add-row { margin: 4px 0 8px; }
    .dd-roulette-add-input {
      width: 100%; box-sizing: border-box;
      background: none; border: 1px solid #e0d8cc;
      border-radius: 16px; padding: 6px 12px;
      font-size: 12px; color: var(--text, #3b2f2f); outline: none;
    }
    .dd-roulette-add-input:focus { border-color: var(--green, #7a4828); }
    .dd-roulette-add-input::placeholder { color: var(--muted, #9e8e7e); }
    .dd-roulette-add-row .pr-autocomplete-list { top: auto; bottom: calc(100% + 2px); }
    .dd-roulette-result {
      min-height: 26px; text-align: center;
      font-size: 15px; font-weight: 700; color: var(--green, #7a4828);
      margin-bottom: 10px;
    }
    .dd-roulette-spin-btn {
      display: block; width: 100%;
      background: var(--green, #7a4828); color: white;
      border: none; border-radius: 20px;
      padding: 9px 0; font-size: 14px; font-weight: 700;
      cursor: pointer; margin-bottom: 8px;
    }
    .dd-roulette-spin-btn:not(:disabled):active { background: #5a3318; }
    .dd-roulette-spin-btn:disabled { opacity: 0.45; cursor: default; }
    .dd-roulette-back-btn {
      display: block; width: 100%; background: none;
      border: 1px solid #e0d8cc; border-radius: 20px;
      padding: 7px 0; font-size: 12px; color: var(--muted, #9e8e7e);
      cursor: pointer;
    }
    .dd-roulette-back-btn:active { background: #f5f0eb; }

    /* PC — 이 막대(.sched-bar-*)는 홈 「이번주 모임」 미리보기와 「하루치 플래너 미리보기」
       센터모달이 공유한다. 두 컨테이너는 이미 PC에서 넓어졌는데(624e47ea, 410ef7e0) 내용
       크기는 모바일 값 그대로라 헐렁해 보인다(2026-07-27 사용자 지적). 폰트·칩만 키운다 —
       레이아웃 구조(grid-template-columns 등)는 건드리지 않는다. */
    @media (min-width: 720px) {
      .sched-bar-axis { font-size: 12px; padding-left: 76px; }
      .sched-card-bars .sched-bar-axis { padding-left: 62px; }
      .sched-bar-item { grid-template-columns: 56px 1fr; }
      .sched-bar-name { font-size: 13px; width: 68px; }
      .sched-bar-track { min-height: 30px; }
      .sched-bar-track.has-games { min-height: 48px; }
      .sched-bar-fill { padding: 3px 8px; }
      .sched-bar-time { font-size: 12px; }
      .sched-bar-game-line { font-size: 10.5px; }
      .sched-bar-guest { font-size: 11px; }
    }
  `;
  document.head.appendChild(s);

  // 활성 뷰 체류시간 추적(PLAN_active_view_tracking.md 3차) — openDateScheduleModal·
  // openDayDetailModal·openDatePreviewModal·openDateMeetingModal 4개가 전부 같은 #__ddModal
  // 오버레이를 공유한다(한쪽이 열리면 위쪽 document.getElementById('__ddModal')?.remove()로
  // 다른 쪽을 대체). "이날 모임 상세" 한 뷰로 보고, 넷 중 아무거나로 전환돼도 재-push 안
  // 하게 가드한다(game-sheet.js `_ensureGameSheetViewToken`과 같은 패턴).
  let _ddViewToken = null;
  let _ddViewActive = false;
  function _ensureDdViewToken() {
    if (_ddViewActive) return;
    _ddViewActive = true;
    _ddViewToken = window.pushActiveView?.('day-detail') ?? null;
  }
  function _popDdViewToken() {
    if (!_ddViewActive) return;
    window.popActiveView?.(_ddViewToken);
    _ddViewActive = false;
    _ddViewToken = null;
  }

  // GS5: 정본 위임 (supabase-client.js의 window.escH).
  // ⚠️ 호출시점 참조 — club-schedule.html이 day-detail.js를 supabase-client.js보다 먼저 로드하므로
  //    IIFE 실행 시점 스냅샷(const esc = window.escH)은 undefined가 된다.
  function esc(s) {
    return window.escH(s);
  }

  // 지난 날짜 판정용 오늘(YYYY-MM-DD, 로컬). vote_date와 같은 형식이라 문자열 비교로 충분하다.
  // ⚠️ new Date().toISOString()은 UTC라 한국시간 오전 9시 전에 어제로 나온다 — 쓰지 말 것.
  function _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function fmtDate(ds) {
    const d = new Date(ds + 'T00:00:00');
    const days = ['일','월','화','수','목','금','토'];
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + days[d.getDay()] + ')';
  }

  function resolveGameName(g) {
    if (g.custom_name) {
      if (g.custom_name.startsWith('#') && window.COTTAGE_GAMES) {
        const found = window.COTTAGE_GAMES.find(c => c.id === g.custom_name.slice(1));
        if (found) return found.display;
      }
      return g.custom_name;
    }
    if (window.COTTAGE_GAMES) {
      const found = window.COTTAGE_GAMES.find(c => c.bggId === String(g.game_id));
      if (found) return found.display || found.name || `#${g.game_id}`;
    }
    return g.game_id ? `#${g.game_id}` : '(알 수 없음)';
  }

  function timeOverlap(a, b) {
    return a.time_start < b.time_end && a.time_end > b.time_start;
  }

  function gameKey(g) {
    return g.game_id ? `id:${g.game_id}` : `name:${(g.custom_name || '').trim().toLowerCase()}`;
  }

  // 방문 인원(등록자 + 동반 인원). supabase-client.js 공용 헬퍼에 위임 —
  // day-detail.js가 supabase-client.js보다 먼저 로드될 수 있어 호출 시점에 참조한다.
  function partyCount(votes) {
    return window.CottageDB?.sumPartySize?.(votes) ?? (votes ? votes.length : 0);
  }

  // 작은 게임 썸네일(글자 크기 정도) — 자세히/이날모임한눈에보기/미리보기 게임 목록 공용.
  // 커스텀 입력 게임(game_id 없음)은 썸네일 없음 → 빈 문자열.
  function dbThumbHtml(game_id, cls) {
    if (!game_id) return '';
    const url = window.COTTAGE_GAMES?.find(c => c.bggId === String(game_id))?.thumbnail;
    return url ? `<img class="${cls}" src="${esc(url)}" alt="">` : '';
  }

  function fmtPlayerArr(arr) {
    const nums = arr.map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (!nums.length) return '';
    if (nums.length === 1) return String(nums[0]);
    let consecutive = true;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] !== nums[i - 1] + 1) { consecutive = false; break; }
    }
    return consecutive ? `${nums[0]}~${nums[nums.length - 1]}` : nums.join('·');
  }

  function condLabel(cond, cgEntry) {
    if (!cond || cond === 'any') return '';
    if (cond === 'best' || cond === 'recommended') {
      const arr = cond === 'best' ? cgEntry?.bestPlayers : cgEntry?.recPlayers;
      const prefix = cond === 'best' ? '베스트' : '추천';
      if (!arr || !arr.length) return `${prefix}인원`;
      const ps = fmtPlayerArr(arr);
      return ps ? `${prefix} ${ps}인` : `${prefix}인원`;
    }
    return `${cond}인`;
  }

  window.formatCondLabel = function (cond, game_id) {
    if (!cond || cond === 'any') return '';
    const cgEntry = game_id ? window.COTTAGE_GAMES?.find(c => c.bggId === String(game_id)) : null;
    return condLabel(cond, cgEntry);
  };

  // 인원조건 select 폭 — 네이티브 select는 "가장 긴 옵션"에 맞춰 폭이 고정돼(브라우저 기본 동작)
  // "3인" 선택 중에도 "베스트 3인"만큼 넓은 여백이 남음. 현재 선택된 라벨 길이에 맞춰 동적으로 좁힘.
  window._condSelWidth = function (label) {
    return Math.max(34, (label || '').length * 9 + 18) + 'px';
  };

  // 모임 가능 시간(9~23, .5=30분)을 사람이 읽는 문자열로. compact:true는 막대 안처럼
  // 자리가 좁은 곳용("9:30") — 그 외엔 "9시30분" 형태(017 마이그레이션으로 소수 지원).
  window.formatVoteHour = function (h, opts = {}) {
    if (h == null) return '';
    const whole = Math.floor(h);
    const isHalf = Math.round((h - whole) * 10) === 5;
    if (opts.compact) return isHalf ? `${whole}:30` : `${whole}`;
    return isHalf ? `${whole}시30분` : `${whole}시`;
  };

  /**
   * 일정 상세 블록 HTML 반환 (모달/인라인 공용)
   * @param {{ date: string, timeStart: number, timeEnd: number, wantGames: string[], learnGames: string[] }} opts
   */
  window.renderDayDetailHTML = function ({ date, timeStart, timeEnd, wantGames = [], learnGames = [] }) {
    const gamesSection = (icon, label, games) => {
      if (!games.length) return '';
      return `<div class="dd-section">
        <span class="dd-section-label">${icon} ${label}</span>
        <ul class="dd-game-list">${games.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      </div>`;
    };
    return `<div class="dd-block">
      <div class="dd-date">${fmtDate(date)}</div>
      <div class="dd-time">${window.formatVoteHour(timeStart)}~${window.formatVoteHour(timeEnd)}</div>
      ${gamesSection('🎲', '하고 싶은 게임', wantGames)}
      ${gamesSection('📖', '배우고 싶은 게임', learnGames)}
    </div>`;
  };

  /**
   * 막대 클릭 시 센터 모달 열기 (DB 조회 + 통계 3종)
   * @param {string} userId — 클릭한 막대의 user_id
   * @param {string} voteDate — 'YYYY-MM-DD'
   */
  const COND_LABELS = { any:'무관', best:'베스트', recommended:'추천', '2':'2인', '3':'3인', '4':'4인', '5+':'5인+' };

  /** 내 일정 모달 통계 칩 HTML (같은 날 · 나와 시간겹침 · 게임 겹침) */
  function _buildSchedStatsHtml(votes, myVote, myGames, userId, voteGames) {
    const myGameKeys = new Set(myGames.map(gameKey));
      const others = votes.filter(v => String(v.user_id) !== String(userId));
      const totalCount  = partyCount(votes);
      const overlapCount = partyCount(others.filter(v => timeOverlap(myVote, v)));
      const gameMatchCount = others.filter(v => {
        const theirGames = voteGames.filter(g => String(g.user_id) === String(v.user_id));
        return theirGames.some(g => myGameKeys.has(gameKey(g)));
      }).length;

      const statChip = (icon, label, count, highlight) =>
        `<span class="dd-stat-chip${highlight ? ' is-match' : ''}">${icon} ${label} ${count}명</span>`;

      const statsHtml = `<div class="dd-stats-row">
        ${statChip('👥', '같은 날', totalCount, false)}
        ${statChip('⏱', '나와 시간겹침', overlapCount, overlapCount > 0)}
        ${statChip('🎲', '게임 겹침', gameMatchCount, gameMatchCount > 0)}
      </div>`;
    return statsHtml;
  }

  /** 게임 섹션 HTML — isMine이면 ⭐/인원조건 select 편집 컨트롤 포함, 아니면 읽기전용 */
  function _buildSchedGameSection(gameObjs, icon, label, isMine) {
        if (!gameObjs.length) return '';
        const items = gameObjs.map(g => {
          const name = esc(resolveGameName(g));
          const key  = gameKey(g);
          const thumb = dbThumbHtml(g.game_id, 'dd-game-thumb');
          // 클릭 대상은 썸네일만(_buildParticipantsHtml과 같은 2026-07-27 결정). 썸네일이
          // 없으면 이름이 대신 클릭 대상. 직접입력(game_id 없음)은 열 시트가 없어 클릭 불가.
          const hitTarget = thumb || name;
          const rest = thumb ? name : '';
          const hit = g.game_id
            ? `<span class="dd-game-hit" data-game-id="${esc(String(g.game_id))}">${hitTarget}</span>${rest}`
            : `${thumb}${name}`;
          if (isMine) {
            const star = g.is_priority ? '⭐' : '☆';
            const curCond = g.player_condition || 'any';
            // 옵션 텍스트 자체를 게임별 해석 라벨로(베스트→"베스트 3인", 3인→"3인") → 별도 태그 없이 select 하나로 통합
            const _optLabel = (v) => v === 'any' ? '무관' : (window.formatCondLabel?.(v, g.game_id) || COND_LABELS[v]);
            const selectOpts = Object.keys(COND_LABELS)
              .map(v => `<option value="${v}"${v === curCond ? ' selected' : ''}>${esc(_optLabel(v))}</option>`).join('');
            const selWidth = window._condSelWidth?.(_optLabel(curCond)) || '';
            // 🚫 hit(아이콘)와 이름을 <li> 바로 밑에 나란히 두지 않는다 — flex 컨테이너에서
            //    글자만 있는 텍스트 노드는 아이콘과 **별개의 flex item**이 돼(익명 박스),
            //    justify-content:space-between이 아이콘·이름·select·별 4개를 각각 흩어
            //    이름 뒤에 큰 빈 칸이 생기고 select가 오른쪽 끝으로 쏠려 짧은 이름일수록
            //    "가운데 떠 있는" 것처럼 보였다(2026-07-28 사용자 스크린샷으로 확인).
            //    이름·아이콘을 한 덩어리로, select·별을 한 덩어리로 묶어 flex item을 2개로 줄인다.
            return `<li><span class="dd-game-name-wrap">${hit}</span><span class="dd-game-controls"><select class="dd-cond-select" style="width:${selWidth}" data-key="${esc(key)}" data-listtype="${g.list_type}" data-gameid="${esc(String(g.game_id ?? ''))}" aria-label="인원 조건">${selectOpts}</select><button class="dd-star-btn" data-key="${esc(key)}" data-listtype="${g.list_type}" data-priority="${g.is_priority}" type="button" aria-label="대표 게임 지정">${star}</button></span></li>`;
          }
          const cond = g.player_condition || 'any';
          const cgEntry = g.game_id ? window.COTTAGE_GAMES?.find(c => c.bggId === String(g.game_id)) : null;
          const cl = condLabel(cond, cgEntry);
          return `<li>${hit}${cl ? ` <span class="dd-cond-tag">(${esc(cl)})</span>` : ''}</li>`;
        }).join('');
        const ulCls = isMine ? 'dd-game-list dd-game-list--editable' : 'dd-game-list';
        return `<div class="dd-section">
          <span class="dd-section-label">${icon} ${label}</span>
          <ul class="${ulCls}">${items}</ul>
        </div>`;
  }

  /**
   * 내 일정 모달 편집 컨트롤 바인딩 (⭐ 대표지정 · 인원조건 select)
   * onDirty: 변경 성공 시 호출 — 호출부가 닫기 시점에 onDirtyClosed로 주간뷰를 갱신한다.
   */
  function _bindSchedEditors(el, { userId, voteDate, myGames, onDirty }) {
        el.querySelectorAll('.dd-star-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            const key = btn.dataset.key;
            const listType = btn.dataset.listtype;
            const curPriority = btn.dataset.priority === 'true';
            const newPriority = !curPriority;
            const gameObj = myGames.find(g => gameKey(g) === key && g.list_type === listType);
            if (!gameObj) return;

            btn.disabled = true;
            const result = await window.CottageDB?.setMeetingVoteGamePriority(
              String(userId), voteDate, gameObj.game_id ?? null, gameObj.custom_name ?? null, gameObj.list_type, newPriority
            );
            btn.disabled = false;

            const noticeEl = el.querySelector('.dd-star-notice');
            if (!result || !result.ok) {
              const msg = result?.reason === 'max_priority'
                ? '대표 게임은 2개까지 지정할 수 있어요'
                : '오류가 발생했어요. 새로고침 후 다시 시도해 주세요.';
              if (result?.reason !== 'max_priority') console.error('[openDateScheduleModal] priority:', result);
              if (noticeEl) { noticeEl.textContent = msg; noticeEl.style.display = ''; }
              return;
            }

            gameObj.is_priority = newPriority;
            btn.dataset.priority = String(newPriority);
            btn.textContent = newPriority ? '⭐' : '☆';
            if (noticeEl) noticeEl.style.display = 'none';
            onDirty();
          });
        });

        el.querySelectorAll('.dd-cond-select').forEach(sel => {
          sel.dataset.prev = sel.value;
          sel.addEventListener('change', async () => {
            const key = sel.dataset.key;
            const listType = sel.dataset.listtype;
            const newCond = sel.value;
            const prevCond = sel.dataset.prev;
            const gameObj = myGames.find(g => gameKey(g) === key && g.list_type === listType);
            if (!gameObj) return;
            sel.disabled = true;
            const result = await window.CottageDB?.setMeetingVoteGameCondition(
              String(userId), voteDate, gameObj.game_id ?? null, gameObj.custom_name ?? null, gameObj.list_type, newCond
            );
            sel.disabled = false;
            if (!result || !result.ok) {
              console.error('[openDateScheduleModal] condition:', result);
              sel.value = prevCond;
              sel.style.width = window._condSelWidth?.(sel.options[sel.selectedIndex]?.text) || '';
              return;
            }
            gameObj.player_condition = newCond;
            sel.dataset.prev = newCond;
            // 옵션 텍스트가 이미 해석 라벨이라 select가 스스로 갱신됨(별도 태그 없음). 폭도 새 라벨 길이에 맞춤.
            sel.style.width = window._condSelWidth?.(sel.options[sel.selectedIndex]?.text) || '';
            onDirty();
          });
        });
  }

  window.openDateScheduleModal = async function (userId, voteDate, opts) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay';

    let _schedDirty = false;
    let _latestMyGames = null;
    const closeEl = () => {
      if (_schedDirty) opts?.onDirtyClosed?.(_latestMyGames);
      _popDdViewToken();
      el.remove();
    };

    const renderModal = (bodyHtml) => {
      el.innerHTML = `<div class="dd-modal" role="dialog" aria-modal="true">
        <div class="dd-modal-scroll">${bodyHtml}</div>
        <div class="dd-close-row">
          <button class="dd-close-btn" type="button">닫기</button>
        </div>
      </div>`;
      el.querySelector('.dd-close-btn').addEventListener('click', closeEl);
      el.addEventListener('click', e => { if (e.target === el) closeEl(); });
    };

    renderModal('<div class="dd-loading">불러오는 중…</div>');
    document.body.appendChild(el);
    _ensureDdViewToken();

    try {
      const [votes, voteGames] = await Promise.all([
        window.CottageDB?.getMeetingVotes(voteDate, voteDate) ?? [],
        window.CottageDB?.getMeetingVoteGames(voteDate, voteDate) ?? [],
      ]);

      const myVote = votes.find(v => String(v.user_id) === String(userId));
      if (!myVote) {
        renderModal('<div class="dd-loading">일정 정보를 찾을 수 없습니다.</div>');
        return;
      }

      const myGames = voteGames.filter(g => String(g.user_id) === String(userId));
      _latestMyGames = myGames;

      const statsHtml = _buildSchedStatsHtml(votes, myVote, myGames, userId, voteGames);

      const me = window.getKakaoUser?.();
      const isMine = !!(me && String(me.id) === String(userId));

      const wantGameObjs  = myGames.filter(g => g.list_type === 'want');
      const learnGameObjs = myGames.filter(g => g.list_type === 'learn');

      renderModal(`
        <div class="dd-modal-nick">${esc(myVote.nickname)}</div>
        <div class="dd-date-time">${fmtDate(voteDate)} · ${window.formatVoteHour(myVote.time_start)}~${window.formatVoteHour(myVote.time_end)}</div>
        ${statsHtml}
        <div class="dd-block">
          ${_buildSchedGameSection(wantGameObjs, '🎲', '하고 싶은 게임', isMine)}
          ${_buildSchedGameSection(learnGameObjs, '📖', '배우고 싶은 게임', isMine)}
          ${isMine ? '<p class="dd-star-notice" style="display:none"></p>' : ''}
        </div>
      `);

      if (isMine) _bindSchedEditors(el, { userId, voteDate, myGames, onDirty: () => { _schedDirty = true; } });
      _bindDdGameHitClicks(el);
    } catch (err) {
      console.error('openDateScheduleModal 오류:', err);
      renderModal('<div class="dd-loading">불러오기 실패. 다시 시도해 주세요.</div>');
    }
  };

  /**
   * 막대 클릭 시 센터 모달 열기 (레거시 — 직접 데이터 전달 방식)
   * @param {{ nickname: string, date: string, timeStart: number, timeEnd: number, wantGames: string[], learnGames: string[] }} opts
   */
  window.openDayDetailModal = function (opts) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay';
    el.innerHTML = `<div class="dd-modal" role="dialog" aria-modal="true">
      <div class="dd-modal-scroll">
        <div class="dd-modal-nick">${esc(opts.nickname)}</div>
        ${window.renderDayDetailHTML(opts)}
      </div>
      <div class="dd-close-row">
        <button class="dd-close-btn" type="button">닫기</button>
      </div>
    </div>`;
    document.body.appendChild(el);
    _ensureDdViewToken();
    const close = () => { _popDdViewToken(); el.remove(); };
    el.querySelector('.dd-close-btn').addEventListener('click', close);
    el.addEventListener('click', e => { if (e.target === el) close(); });
  };
  /**
   * 하루치 플래너 미리보기 모달 (모임보드 "자세히" — 그날 참여자 막대그래프 포함 카드)
   * 홈 미리보기 카드(buildBarsInCard)를 센터모달로 재사용.
   * @param {string} dateStr — 'YYYY-MM-DD'
   * @param {Array}  dayVotes — 해당 날짜 meeting_votes
   * @param {Array}  dayGames — 해당 날짜 meeting_vote_games
   * @param {Object} [myVote] — 본인 vote(막대 is-mine 강조용)
   */
  // backTo(선택) — 여기서 참여자 이름을 눌러 다른 보드로 넘어갈 때, 그 보드의 패널 헤더에
  // "‹ 뒤로"를 달아 이 모달을 연 보드(진입점)로 되돌아올 수 있게 한다(openProfilePanel opts.backTo 그대로 위임).
  window.openDatePreviewModal = function (dateStr, dayVotes, dayGames, myVote, onChange, backTo) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay';
    const dObj = new Date(dateStr + 'T00:00:00');
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];
    const dateLabel = `${dObj.getMonth() + 1}/${dObj.getDate()}(${DOW[dObj.getDay()]})`;
    const count = partyCount(dayVotes || []);
    const barsHtml = (window.buildBarsInCard && dayVotes && dayVotes.length)
      ? window.buildBarsInCard(dayVotes, dayGames || [], myVote || null)
      : '<p class="dd-loading">이 날 등록된 일정이 없어요.</p>';
    el.innerHTML = `<div class="dd-modal dd-preview" role="dialog" aria-modal="true">
      <button class="dd-x-btn" type="button" aria-label="닫기">✕</button>
      <div class="dd-modal-scroll">
        <div class="dd-preview-head">📅 ${esc(dateLabel)} · ${count}명</div>
        ${barsHtml}
      </div>
    </div>`;
    document.body.appendChild(el);
    _ensureDdViewToken();
    const close = () => { _popDdViewToken(); el.remove(); };
    el.querySelector('.dd-x-btn').addEventListener('click', close);
    el.addEventListener('click', e => { if (e.target === el) close(); });
    // 참여자 이름 클릭 → 해당 유저 모임 보드 (홈 미리보기와 동일)
    // 이 모달은 자신을 연 보드보다 위(z 9200 > --z-profile 9100)라서, 새로 열리는 남의 보드도
    // 같은 9100이라 안 닫으면 이 모달에 가려 안 보인다(먼저 닫아야 클릭 1번에 보드로 넘어간다).
    // openDateScheduleModal의 .dd-nick-link는 반대로 자기가 더 아래(9050)라 닫지 않는 게 맞는 설계 — 그쪽은 그대로 둔다.
    el.querySelectorAll('.sched-bar-name').forEach(n =>
      n.addEventListener('click', () => { close(); window.openOtherMeetingSheet?.(n.dataset.uid, backTo ? { backTo } : {}); }));
    // +N명 더보기 토글 (막대가 접힘 구조일 때)
    el.querySelectorAll('.sched-card-more-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const hidden = btn.previousElementSibling;
        if (hidden) hidden.style.display = hidden.style.display === 'none' ? '' : 'none';
      }));
    // 내 막대 ✎ 수정 → 플래너 편집(그 날) / ✕ → 참여 취소. 변경 후 onChange로 모임보드 갱신.
    el.querySelectorAll('.sched-bar-edit-btn').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        close();
        window.openPlannerModal?.({ weekOffset: 0, edit: dateStr, onDirtyClose: onChange });
      }));
    el.querySelectorAll('.sched-bar-del-btn').forEach(btn =>
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!myVote) return;
        if (!confirm(`${dateLabel} 참여를 취소할까요?`)) return;
        await window.CottageDB?.deleteMeetingVote?.(String(myVote.user_id), dateStr);
        close();
        onChange?.();
      }));
    // 「하고 싶은/배우고 싶은 게임」 썸네일 클릭 → 게임시트(2026-07-27, 예전엔 안 뚫려 있었음)
    _bindDdGameHitClicks(el);
  };

  // ── 모임 플래너 센터모달 (공용 유틸 — 전 페이지에서 호출, 페이지별 복제 금지) ──
  // club-schedule.html?embed=true 를 iframe 센터모달로 띄운다. open 시 목표 상태
  // (주차 오프셋·등록/수정 목적지)를 전부 선언(CLAUDE.md iframe 재사용 원칙).
  let _pmFrame = null, _pmReady = false, _pmPending = null, _pmDirty = false, _pmOnDirty = null;
  let _pmAwaitingReveal = false; // 등록/수정(edit·register) 진입 시 시트가 실제로 뜬 뒤에만 박스를 드러낸다
  // 활성 뷰 체류시간 추적(3차) — 이 모달은 iframe(club-schedule.html?embed=true) 안에서
  // 실제 등록/수정 UI가 그려지지만, 그 iframe은 임베드라 자체 트래킹이 원천 차단돼 있다
  // (#24 방지, "보존해야 할 기존 동작" 참조) — 그래서 push/pop은 **부모(day-detail.js가
  // 실행 중인 window)** 쪽에서, "박스가 실제로 보이는 순간"인 _pmReveal 기준으로 건다.
  // _pmReveal은 같은 박스가 열린 채로 다른 날짜를 다시 여는 경우 두 번 불릴 수 있어
  // (재선언만 하고 새 cottage-sheet-shown을 다시 기다림) active 플래그로 재-push을 막는다.
  let _pmViewToken = null;
  let _pmViewActive = false;
  function _pmDeclare(opts) {
    const w = _pmFrame?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'cottage-reset-week', offset: opts.weekOffset ?? 0 }, '*');
    if (opts.register) w.postMessage({ type: 'cottage-register', date: opts.register }, '*');
    else if (opts.edit) w.postMessage({ type: 'cottage-edit', date: opts.edit }, '*');
  }
  function _pmEsc(e) { if (e.key === 'Escape') _pmCloseModal(); }
  function _pmReveal() {
    const ov = document.getElementById('__plannerModal');
    if (!ov) return;
    ov.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', _pmEsc);
    if (!_pmViewActive) { _pmViewActive = true; _pmViewToken = window.pushActiveView?.('planner-register') ?? null; }
  }
  function _pmCloseModal() {
    const ov = document.getElementById('__plannerModal');
    if (!ov) return;
    _pmAwaitingReveal = false;
    ov.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', _pmEsc);
    if (_pmViewActive) { window.popActiveView?.(_pmViewToken); _pmViewActive = false; _pmViewToken = null; }
    if (_pmDirty) { _pmDirty = false; const cb = _pmOnDirty; _pmOnDirty = null; cb?.(); }
  }
  window.openPlannerModal = function (opts = {}) {
    _pmOnDirty = opts.onDirtyClose || _pmOnDirty;
    const p = window.location.pathname;
    const base = p.includes('/pages/club/') ? 'club-schedule.html'
               : p.includes('/pages/')      ? '../club/club-schedule.html'
               :                              'pages/club/club-schedule.html';
    const src = base + '?embed=true';
    let ov = document.getElementById('__plannerModal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = '__plannerModal';
      ov.className = 'planner-modal-overlay';
      ov.innerHTML = `<div class="planner-modal-box">
        <button class="planner-modal-close" type="button" aria-label="닫기">✕</button>
        <div class="planner-modal-loader">불러오는 중…</div>
        <iframe class="planner-modal-frame" title="모임 플래너"></iframe>
      </div>`;
      document.body.appendChild(ov);
      _pmFrame = ov.querySelector('.planner-modal-frame');
      ov.querySelector('.planner-modal-close').addEventListener('click', _pmCloseModal);
      ov.addEventListener('click', e => { if (e.target === ov) _pmCloseModal(); });
    }
    // 🚨 등록/수정(edit·register) 진입은 이 박스를 바로 드러내지 않는다 — 로드 중엔 "이날
    // 모임 상세" 뒤 화면이 그대로 유지되다가, 등록 시트가 **실제로 뜬 뒤에만**(club-schedule.html이
    // 보내는 cottage-sheet-shown) 이 박스가 나타난다. 예전엔 클릭 즉시 이 박스를 열어
    // "불러오는 중…" 빈 상자가 (짧게라도) 보였다 — 사용자가 원한 건 그 자체를 아예 안 보여주는
    // 것이었다("떴다 없어지는 것도 아니고"). 일반 오픈(주간뷰, edit/register 없음)은 기존대로
    // 즉시 드러낸다 — kakao-auth.js의 두 호출부는 이 신호를 안 보내므로 대기하면 영영 안 열린다.
    const isQuickEntry = !!(opts.edit || opts.register);
    // 🚨 진짜 "빈 흰 박스"의 정체는 타이밍이 아니라 레이아웃이었다(2026-07-30 스크린샷으로 확정) —
    // 안쪽 club-schedule.html은 등록/수정 시트를 하단 바텀시트(.sched-multi-sheet, max-height:72vh,
    // 아래쪽 정렬)로만 그리는데, 이 박스는 고정 88dvh 흰 카드라 시트가 안 닿는 위쪽 구간이
    // 빈 흰 카드처럼 남아 "박스가 두 개 겹쳐 보인다"로 보였다. is-quick-entry 클래스로 이 박스를
    // 풀블리드·투명화해(위 CSS) 그 구간이 바깥 어두운 배경으로 자연스럽게 채워지게 한다.
    ov.classList.toggle('is-quick-entry', isQuickEntry);
    if (isQuickEntry) _pmAwaitingReveal = true;
    else _pmReveal();
    // 조건부 재로드: 이미 플래너 로드됨 → 상태만 선언 / 아니면 로드 후 ready 대기
    let samePage = false;
    // 크로스오리진이면 .contentWindow.location 접근 자체가 SecurityError를 던진다 — 정상 경로
    try { samePage = !!_pmFrame.contentWindow?.location?.pathname?.includes('club-schedule'); } catch (_) { samePage = false; }
    if (_pmReady && samePage) {
      _pmDeclare(opts);
    } else {
      _pmPending = () => _pmDeclare(opts);
      const ldr = ov.querySelector('.planner-modal-loader');
      if (ldr) ldr.style.display = '';
      if (_pmFrame.getAttribute('src') !== src) _pmFrame.src = src;
    }
  };
  // 플래너 iframe 메시지 (본 모달 프레임만 처리)
  window.addEventListener('message', e => {
    if (!_pmFrame || e.source !== _pmFrame.contentWindow) return;
    if (e.data?.type === 'cottage-planner-ready') {
      _pmReady = true;
      const ldr = document.querySelector('#__plannerModal .planner-modal-loader');
      if (ldr) ldr.style.display = 'none';
      if (_pmPending) { const f = _pmPending; _pmPending = null; f(); }
    }
    if (e.data?.type === 'cottage-sheet-shown' && _pmAwaitingReveal) {
      _pmAwaitingReveal = false;
      _pmReveal();
    }
    if (e.data?.type === 'cottage-meeting-saved') { _pmDirty = true; _pmOnDirty?.(); } // 저장 즉시 부모 갱신(닫을 때만 기다리지 않음)
    // 🚨 club-schedule.html의 등록/수정 시트는 저장 성공 직후 *자기 자신*을 자동으로
    // 닫는다(is-quick-entry라 돌아갈 주간 뷰가 없어서) — 그런데 이 바깥 래퍼(#__plannerModal)는
    // 그 신호를 안 듣고 있었다. 그래서 안쪽 시트만 사라지고 **바깥 흰 박스가 빈 채로 계속
    // 떠 있는 채**로 남아, 사용자가 직접 ✕를 눌러야만 이 모달로 복귀됐다("등록해도 빈 흰
    // 배경 모달이 남는다" — 2026-07-29~30 재지적의 실제 원인). 여기서도 같이 닫는다.
    if (e.data?.type === 'cottage-quick-entry-closed') { _pmCloseModal(); }
  });
  /**
   * 날짜 전체 모임 모달 (홈 미리보기 카드 클릭 — 유저 비중심, 날짜 집계 뷰)
   * @param {string} voteDate — 'YYYY-MM-DD'
   * @param {Array}  votes    — 해당 날짜의 meeting_votes 배열 (사전 패치)
   * @param {Array}  voteGames — 해당 날짜의 meeting_vote_games 배열 (사전 패치)
   * @param {Object} [opts] — 현재 미사용, 재오픈(onDirtyClose) 시 그대로 다시 넘겨주기 위해 보존
   */
  /** 모임 상세 통계 칩 HTML (참여 인원 · 최대 동시 겹침 · 공통 게임 수) */
  function _buildMeetingStatsHtml(votes, uniqueVotes, voteGames) {
    const count = partyCount(uniqueVotes);
    // 최대 동시 참여 가능 인원 (1시간 단위 슬롯) — 동반 인원 포함
    const MIN_H = 10, MAX_H = 28; // 등록 상한 27시(익일 새벽 3시)까지 슬롯을 포함하려면 28이 필요(h<MAX_H)
    let peakCnt = 0;
    for (let h = MIN_H; h < MAX_H; h += 0.5) {
      const c = partyCount(votes.filter(v => v.time_start <= h && v.time_end > h));
      if (c > peakCnt) peakCnt = c;
    }

    // 공통 게임 수 (통계 칩용 — count ≥ 2인 게임만)
    const gkCount = {};
    voteGames.forEach(g => {
      const k = g.game_id ? `id:${g.game_id}` : `name:${(g.custom_name || '').trim().toLowerCase()}`;
      gkCount[k] = (gkCount[k] || 0) + 1;
    });
    const sharedGameCnt = Object.values(gkCount).filter(c => c >= 2).length;

    const statsHtml = `<div class="dd-stats-row">
      <span class="dd-stat-chip">👥 ${count}명 참여</span>
      ${peakCnt >= 2 ? `<span class="dd-stat-chip is-match">⏱ 최대 ${peakCnt}명 겹침</span>` : ''}
      ${sharedGameCnt ? `<span class="dd-stat-chip is-match">🎲 공통 게임 ${sharedGameCnt}종</span>` : ''}
    </div>`;
    return statsHtml;
  }

  // .dd-game-hit(게임 썸네일) 클릭 → 게임시트. openDateMeetingModal·openDateScheduleModal·
  // buildGameTags(.sched-game-tag 안, 홈 미리보기·플래너 막대바 모달·플래너 페이지 주간뷰가 공유)
  // 전부 이걸로 통일(2026-07-27) — 예전엔 셋 중 일부만 뚫려 있었다.
  // 게임시트(--z-sheet 9500)가 겹쳐 뜨므로 모달/카드를 안 닫는다(닫으면 아래로 복귀).
  // ⚠️ meeting_vote_games.game_id는 BGG ID인데 openGameSheet는 gameData 슬러그 키를 받는다 —
  //    변환 없이 넘기면 미보유 게임으로 오인해 조용히 기록시트로 폴백된다(에러도 안 남).
  function _bindDdGameHitClicks(el) {
    el.querySelectorAll('.dd-game-hit').forEach(hit =>
      hit.addEventListener('click', e => {
        // 홈 미리보기 카드·주간뷰 카드처럼 조상에 "카드 전체 클릭" 리스너가 있는 곳도 있어
        // 항상 막는다(안 막으면 게임시트 + 그 리스너가 같이 발동).
        e.stopPropagation();
        const key = window.getGameKeyById?.(hit.dataset.gameId);
        if (!key) return;
        window.ensureGameSheet?.();
        window.openGameSheet?.(key);
      }));
  }
  window._bindDdGameHitClicks = _bindDdGameHitClicks;

  /** 룰렛 후보 목록: want 게임 중복 제거 + 약칭 해석 → [{key, name, abbr}] */
  function _buildRouletteGames(voteGames) {
    const wantGameMap = new Map();
    voteGames.forEach(g => {
      if (g.list_type !== 'want') return;
      const key = g.game_id ? `id:${g.game_id}` : `n:${g.custom_name}`;
      if (!wantGameMap.has(key)) {
        const name = resolveGameName(g);
        const pureName = name.replace(/^#/, '');
        let abbr = pureName.slice(0, 2);
        if (g.game_id && window.COTTAGE_GAMES) {
          const cg = window.COTTAGE_GAMES.find(c => String(c.bggId) === String(g.game_id));
          if (cg) abbr = cg.abbr || (cg.titleKo || cg.display || pureName).slice(0, 2);
        } else if (!g.game_id && window.COTTAGE_GAMES && pureName) {
          const cg = window.COTTAGE_GAMES.find(c => c.display === pureName || c.titleKo === pureName);
          if (cg) abbr = cg.abbr || (cg.titleKo || cg.display || pureName).slice(0, 2);
        }
        wantGameMap.set(key, { name, abbr });
      }
    });
    const rouletteGames = [...wantGameMap.entries()].map(([key, { name, abbr }]) => ({ key, name, abbr }));
    return rouletteGames;
  }

  /** 참여자별 보기 블록 HTML (닉네임 · 시간 · 하고싶은/배우고싶은 게임) */
  function _buildParticipantsHtml(uniqueVotes, voteGames) {
    const participantsBody = uniqueVotes.map(v => {
      const myGames = voteGames.filter(g => String(g.user_id) === String(v.user_id));
      // 참여자별 게임 옆에 그 사람이 설정한 인원조건 표시(읽기전용). 무관 포함 — 어떤 게임이 특정 인원 필요한지 한눈에.
      const _li = g => {
        const c = g.player_condition || 'any';
        const cl = c === 'any' ? '무관' : (window.formatCondLabel?.(c, g.game_id) || c);
        // 클릭 대상은 썸네일만(2026-07-27 결정 — 이름까지 감싸면 "글자를 읽으려 눌렀는데
        // 화면이 넘어간다"는 인상을 준다). 썸네일이 없으면(썸네일 유실) 이름이 대신 클릭
        // 대상이 된다 — 아예 못 여는 것보다는 낫다. 직접입력(game_id 없음)은 열 시트가
        // 없어 묶지 않는다(= 클릭 불가).
        const thumb = dbThumbHtml(g.game_id, 'dd-game-thumb');
        const name = esc(resolveGameName(g));
        const hitTarget = thumb || name;
        const rest = thumb ? name : '';
        const hit = g.game_id
          ? `<span class="dd-game-hit" data-game-id="${esc(String(g.game_id))}">${hitTarget}</span>${rest}`
          : `${thumb}${name}`;
        return `<li class="dd-game-item">${hit}${cl ? ` <span class="dd-cond-tag">(${esc(cl)})</span>` : ''}</li>`;
      };
      const wantGames  = myGames.filter(g => g.list_type === 'want');
      const learnGames = myGames.filter(g => g.list_type === 'learn');
      const wantHtml  = wantGames.length  ? `<ul class="dd-game-list">${wantGames.map(_li).join('')}</ul>` : '';
      const learnHtml = learnGames.length ? `<ul class="dd-game-list">${learnGames.map(_li).join('')}</ul>` : '';
      return `<div class="dd-block">
        <div class="dd-modal-nick dd-nick-link" data-uid="${esc(v.user_id)}">${esc(v.nickname)}</div>
        <div class="dd-time">${window.formatVoteHour(v.time_start)}~${window.formatVoteHour(v.time_end)}${partyCount([v]) > 1 ? ` · ${partyCount([v]) - 1}명 동반` : ''}</div>
        ${wantGames.length  ? `<div class="dd-section"><span class="dd-section-label">🎲 하고 싶은 게임</span>${wantHtml}</div>`  : ''}
        ${learnGames.length ? `<div class="dd-section"><span class="dd-section-label">📖 배우고 싶은 게임</span>${learnHtml}</div>` : ''}
      </div>`;
    }).join('');
    return participantsBody;
  }

  /**
   * 룰렛 위젯 초기화 (휠·칩·게임추가·돌리기)
   * ⚠️ el.innerHTML 주입 + appendChild 이후에만 호출할 것 — 내부에서 el.querySelector로
   *    8개 요소를 잡으므로 그 전에 부르면 전부 null이 되어 조용히 죽는다.
   */
  function _initRouletteWidget(el, rouletteGames) {
      const COLORS = ['#e8d8c0','#ddc8a8','#f0e5d4','#d4c0a0','#e4d4bc','#cdb898','#ecddd0','#c8ac8c'];
      const state = rouletteGames.map((g, i) => ({ ...g, active: true, color: COLORS[i % COLORS.length] }));
      let spinTotal = 0;
      let spinning = false;

      const mainScroll    = el.querySelector('#__ddMainScroll');
      const roulettePanel = el.querySelector('#__ddRoulettePanel');
      const openBtn       = el.querySelector('.dd-roulette-open-btn');
      const plannerBtn    = el.querySelector('.dd-planner-btn');
      const wheelEl       = el.querySelector('#__rrWheel');
      const chipsEl       = el.querySelector('#__rrChips');
      const resultEl      = el.querySelector('#__rrResult');
      const spinBtn       = el.querySelector('#__rrSpin');
      const backBtn       = el.querySelector('#__rrBack');

      function buildWheel() {
        const active = state.filter(g => g.active);
        const n = active.length;
        if (!n) return;
        const cx = 70, cy = 70, r = 70, textR = 45;
        const toRad = deg => (deg - 90) * Math.PI / 180;
        const fs = n <= 3 ? 11 : n <= 6 ? 9 : 7;

        let svg = '<svg viewBox="0 0 140 140" style="width:100%;height:100%;display:block;">';
        if (n === 1) {
          svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${active[0].color}"/>`;
          svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="600" fill="#5a3318">${esc(active[0].abbr)}</text>`;
        } else {
          const segDeg = 360 / n;
          active.forEach((g, i) => {
            const s = i * segDeg, e = (i + 1) * segDeg, mid = s + segDeg / 2;
            const sr = toRad(s), er = toRad(e), mr = toRad(mid);
            const sx = cx + r * Math.cos(sr), sy = cy + r * Math.sin(sr);
            const ex = cx + r * Math.cos(er), ey = cy + r * Math.sin(er);
            const tx = cx + textR * Math.cos(mr), ty = cy + textR * Math.sin(mr);
            const rot = (mid > 90 && mid < 270) ? mid + 180 : mid;
            svg += `<path d="M${cx},${cy} L${sx.toFixed(1)},${sy.toFixed(1)} A${r},${r} 0 ${segDeg > 180 ? 1 : 0},1 ${ex.toFixed(1)},${ey.toFixed(1)} Z" fill="${g.color}" stroke="#fff8f0" stroke-width="1.5"/>`;
            svg += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="600" fill="#5a3318" transform="rotate(${rot.toFixed(1)},${tx.toFixed(1)},${ty.toFixed(1)})">${esc(g.abbr)}</text>`;
          });
        }
        svg += '</svg>';
        wheelEl.innerHTML = svg;
        wheelEl.style.background = '';
      }

      function buildChips() {
        chipsEl.innerHTML = state.map(g =>
          `<button class="dd-roulette-chip${g.active ? '' : ' is-excluded'}${g.isCustom ? ' is-custom' : ''}"
            style="${g.active ? `background:${g.color};border-color:${g.color}` : ''}"
            data-key="${esc(g.key)}" type="button">${esc(g.name)}</button>`
        ).join('');
        chipsEl.querySelectorAll('.dd-roulette-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            if (spinning) return;
            const item = state.find(g => g.key === chip.dataset.key);
            if (!item) return;
            if (item.active && state.filter(g => g.active).length <= 1) return;
            item.active = !item.active;
            buildChips();
            buildWheel();
            updateSpinBtn();
          });
        });
      }

      function updateSpinBtn() {
        spinBtn.disabled = state.filter(g => g.active).length < 2 || spinning;
      }

      const addRow   = el.querySelector('#__rrAddRow');
      const addInput = el.querySelector('#__rrAddInput');

      function handleAddGame(displayName) {
        const name = displayName.trim();
        if (!name) return;
        const cg = (window.COTTAGE_GAMES || []).find(g => g.display === name);
        const key  = cg ? `id:${cg.bggId}` : `custom:${name}`;
        const abbr = cg ? (cg.abbr || (cg.titleKo || cg.display || name).slice(0, 2)) : name.slice(0, 2);
        const dup = state.findIndex(g => g.key === key);
        if (dup >= 0) {
          const chip = chipsEl.querySelector(`[data-key="${esc(state[dup].key)}"]`);
          if (chip) { chip.style.outline = '2px solid var(--green,#7a4828)'; setTimeout(() => { chip.style.outline = ''; }, 700); }
          return;
        }
        state.push({ key, name, abbr, active: true, color: COLORS[state.length % COLORS.length], isCustom: true });
        buildChips();
        buildWheel();
        updateSpinBtn();
      }

      if (window.attachAc) {
        window.attachAc(
          addInput,
          () => (window.COTTAGE_GAMES || []).map(g => g.display),
          (selected) => { handleAddGame(selected); addInput.value = ''; },
          addRow
        );
      }

      addInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const acList = addRow?.querySelector('.pr-autocomplete-list');
        if (acList?.classList.contains('is-open')) return;
        const val = addInput.value.trim();
        if (!val) return;
        e.preventDefault();
        handleAddGame(val);
        addInput.value = '';
      });

      // 룰렛은 "이미 정한 후보 중 하나를 고르는" 화면이지 등록 화면이 아니다 —
      // 룰렛 보는 동안은 등록/수정 버튼을 숨긴다(2026-07-29 사용자 판단: "룰렛창에서까지
      // 모임등록을 할 필요가 있냐").
      openBtn.addEventListener('click', () => {
        mainScroll.style.display = 'none';
        roulettePanel.style.display = '';
        if (plannerBtn) plannerBtn.style.display = 'none';
        buildWheel();
        buildChips();
        updateSpinBtn();
      });

      backBtn.addEventListener('click', () => {
        roulettePanel.style.display = 'none';
        mainScroll.style.display = '';
        if (plannerBtn) plannerBtn.style.display = '';
        resultEl.textContent = '';
      });

      spinBtn.addEventListener('click', () => {
        if (spinning) return;
        const active = state.filter(g => g.active);
        if (active.length < 2) return;
        spinning = true;
        spinBtn.disabled = true;
        resultEl.textContent = '';

        const n = active.length;
        const winnerIdx = Math.floor(Math.random() * n);
        const segDeg = 360 / n;
        const winnerCenter = winnerIdx * segDeg + segDeg / 2;
        const targetAngle = (360 - winnerCenter + 360) % 360;
        const currentMod = spinTotal % 360;
        let delta = (targetAngle - currentMod + 360) % 360;
        if (delta === 0) delta = 360;
        spinTotal += 5 * 360 + delta;

        wheelEl.style.transition = 'transform 3.5s cubic-bezier(0.2, 0.8, 0.15, 1)';
        wheelEl.style.transform = `rotate(${spinTotal}deg)`;

        setTimeout(() => {
          const winner = active[winnerIdx];
          resultEl.textContent = `🎲 ${winner.name}`;
          spinning = false;
          spinBtn.disabled = false;
          spinBtn.textContent = '다시 돌리기 🎡';
          const gameId = winner.key.startsWith('id:') ? winner.key.slice(3) : null;
          window.CottageDB?.trackEvent('roulette_spin', { game_id: gameId });
        }, 3600);
      });
  }

  window.openDateMeetingModal = function (voteDate, votes, voteGames, opts = {}) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay dd-overlay--under-board';

    const uniqueVotes = [...new Map(votes.map(v => [String(v.user_id), v])).values()];

    const statsHtml = _buildMeetingStatsHtml(votes, uniqueVotes, voteGames);
    const rouletteGames = _buildRouletteGames(voteGames);
    const participantsBody = _buildParticipantsHtml(uniqueVotes, voteGames);

    // 등록/수정 진입 버튼 — 지난 날짜엔 등록 행동을 렌더하지 않는다(A-10, 판정은
    // 이 한 곳에서). 로그인 안 했으면 어차피 등록할 수 없으니 숨긴다.
    const user = window.getKakaoUser?.();
    const myVote = user && votes.find(v => String(v.user_id) === String(user.id));
    const plannerBtnHtml = (user && voteDate >= _todayStr())
      ? `<button class="dd-planner-btn" type="button">${myVote ? '내 등록 수정하기' : '플래너에서 등록하기'}</button>`
      : '';

    const rouletteBtnHtml = rouletteGames.length >= 2
      ? '<button class="dd-roulette-open-btn" type="button">🎡 룰렛으로 정하기</button>'
      : '';
    const roulettePanelHtml = rouletteGames.length >= 2
      ? `<div class="dd-roulette-panel" id="__ddRoulettePanel" style="display:none">
          <div class="dd-roulette-wheel-wrap">
            <div class="dd-roulette-ptr">▼</div>
            <div class="dd-roulette-wheel" id="__rrWheel"></div>
          </div>
          <div class="dd-roulette-chips" id="__rrChips"></div>
          <div class="dd-roulette-add-row" id="__rrAddRow">
            <input class="dd-roulette-add-input" id="__rrAddInput" placeholder="+ 게임 추가..." type="text" autocomplete="off">
          </div>
          <div class="dd-roulette-result" id="__rrResult"></div>
          <button class="dd-roulette-spin-btn" id="__rrSpin" type="button">돌리기 🎡</button>
          <button class="dd-roulette-back-btn" id="__rrBack" type="button">← 목록으로</button>
        </div>`
      : '';

    el.innerHTML = `<div class="dd-modal" role="dialog" aria-modal="true">
      <div class="dd-modal-scroll" id="__ddMainScroll">
        <div class="dd-date">${fmtDate(voteDate)}</div>
        ${statsHtml}
        ${rouletteBtnHtml}
        ${participantsBody
          ? `<details class="dd-participants-toggle" open>
              <summary>참여자별 보기</summary>
              <div class="dd-participants-body">${participantsBody}</div>
            </details>`
          : '<div class="dd-empty">참여자가 없습니다.</div>'
        }
      </div>
      ${roulettePanelHtml}
      <div class="dd-close-row">
        ${plannerBtnHtml}
        <button class="dd-close-btn" type="button">닫기</button>
      </div>
    </div>`;

    document.body.appendChild(el);
    _ensureDdViewToken();
    const closeBtn = el.querySelector('.dd-close-btn');
    closeBtn.addEventListener('click', () => { _popDdViewToken(); el.remove(); });
    el.addEventListener('click', e => { if (e.target === el) { _popDdViewToken(); el.remove(); } });

    // 참여자 닉네임 클릭 → 그 사람 모임 보드 (Phase D 진입점 규칙: 모임 참여자 = openOtherMeetingSheet)
    // 보드는 이 모달 위에 겹쳐 뜬다(--z-profile 9100 > .dd-overlay--under-board 9050) —
    // 전환이 아니라 레이어를 쌓는 것이므로 모달을 닫지 않는다. 보드를 닫으면 이 모달이 그대로 보인다.
    el.querySelectorAll('.dd-nick-link').forEach(n =>
      n.addEventListener('click', () => window.openOtherMeetingSheet?.(n.dataset.uid)));

    // 게임 행 클릭 → 게임시트. 게임시트(--z-sheet 9500)가 이 모달 위에 겹쳐 뜨므로 닫지 않는다
    // (시트를 닫으면 이 모달로 복귀 — 닉네임→보드와 같은 레이어 방식).
    _bindDdGameHitClicks(el);

    // 등록/수정 → 플래너. 이 모달을 닫지 않는다(닉네임→보드·게임행→게임시트와 같은
    // 레이어 방식 — 플래너 --z-shelf 9600 > 이 모달 9050이라 겹쳐 뜬다).
    //
    // ⚠️ __openPlannerFor(홈 전용 빠른진입, index-page.js)로 바꿔봤다가 되돌렸다
    // (2026-07-29) — is-quick-entry 모드는 "뒤에 아무 것도 없다"는 전제로
    // .planner-sheet-dim/.planner-sheet-panel/.planner-sheet-frame을 전부
    // background:transparent로 만든다(style.css:6910~6916). 그 전제가 이 화면에선
    // 깨진다 — 이 모달(rich한 상세 내용)이 뒤에 있는데 그게 훤히 비쳐 보였다
    // (steady-state 스크린샷으로 확인, opacity 전환 문제 아님). window.openPlannerModal
    // (day-detail.js 전용, 자체 어두운 배경의 #__plannerModal)로 되돌린다.
    el.querySelector('.dd-planner-btn')?.addEventListener('click', () => {
      window.CottageDB?.trackEvent('meeting_detail_planner_click');
      window.openPlannerModal?.({
        weekOffset: 0,
        edit: voteDate,
        onDirtyClose: async () => {
          const [freshVotes, freshGames] = await Promise.all([
            window.CottageDB?.getMeetingVotes(voteDate, voteDate) ?? [],
            window.CottageDB?.getMeetingVoteGames(voteDate, voteDate) ?? [],
          ]);
          window.openDateMeetingModal(voteDate, freshVotes, freshGames, opts);
          // 이 모달은 자기 자신(같은 날짜)만 새로 그린다 — 홈 상단 주간 미리보기(index-page.js
          // loadWeek)는 별도 캐시라 신호 없이는 갱신 안 됨(kakao-auth.js 인원조건 변경과 동일
          // 이유). 전역 이벤트로 통지해 새로고침 없이도 반영되게 한다(2026-07-31).
          window.dispatchEvent(new CustomEvent('cottage-meeting-changed', { detail: { reason: 'edit' } }));
        },
      });
    });

    // 룰렛 로직
    if (rouletteGames.length >= 2) _initRouletteWidget(el, rouletteGames);
  };

  /**
   * 주간 카드/홈 미리보기 시간 막대 HTML 반환 (club-schedule + index-page 공용)
   * @param {Array}       dayVotes  — 해당 날짜 meeting_votes
   * @param {Array}       voteGames — 해당 날짜(또는 전체)의 meeting_vote_games
   * @param {Object|null} myVote    — 내 vote (is-mine 강조·수정삭제 버튼), 홈에서는 null
   * @returns {string} HTML string
   */
  window.buildBarsInCard = function (dayVotes, voteGames, myVote) {
    if (!dayVotes.length) return '';
    // 고정 9~27시 축 대신 그날 실제 등록된 범위로 확대(반응형, 2026-08-18 사용자 스크린샷 리포트).
    // 등록 상한이 23시→27시로 넓어지며(range 14→18h) 흔한 8~9시간짜리 등록이 막대 폭의 절반도
    // 안 채워 안쪽 텍스트가 짓눌려 보였다. floor/ceil로 정시 단위로만 반올림(딱 붙지 않게 약간의
    // 여백). 범위가 너무 좁으면(다들 겹치는 한두 시간) 축 눈금 3개가 겹쳐 보여 최소 3시간은 보장.
    const rawMin = Math.min(...dayVotes.map(v => v.time_start));
    const rawMax = Math.max(...dayVotes.map(v => v.time_end));
    let MIN_H = Math.floor(rawMin);
    let MAX_H = Math.ceil(rawMax);
    const MIN_RANGE = 3;
    if (MAX_H - MIN_H < MIN_RANGE) {
      const mid = (rawMin + rawMax) / 2;
      MIN_H = Math.max(9, Math.floor(mid - MIN_RANGE / 2));
      MAX_H = Math.min(27, MIN_H + MIN_RANGE);
      MIN_H = Math.max(9, MAX_H - MIN_RANGE); // MAX_H가 27에서 잘렸으면 왼쪽으로 재보정
    }
    const range = MAX_H - MIN_H;
    const today = _todayStr();

    function resolveGameAbbr(g) {
      if (g.game_id && window.COTTAGE_GAMES) {
        const found = window.COTTAGE_GAMES.find(c => c.bggId === String(g.game_id));
        if (found && found.abbr) return found.abbr;
        if (found) return (found.titleKo || found.display || '').slice(0, 2);
      }
      const rawName = (g.custom_name || '').replace(/^#/, '');
      if (g.custom_name?.startsWith('#') && window.COTTAGE_GAMES) {
        const found = window.COTTAGE_GAMES.find(c => c.id === g.custom_name.slice(1));
        if (found) return found.abbr || (found.titleKo || found.display || rawName).slice(0, 2);
      }
      return rawName.slice(0, 2);
    }

    function gameAbbrs(voteDate, userId, durationH) {
      const games = voteGames.filter(g =>
        g.vote_date === voteDate && String(g.user_id) === String(userId)
      );
      if (!games.length) return '';
      const sorted = [...games].sort((a, b) => {
        const ta = a.is_priority ? 0 : (a.list_type === 'want' ? 1 : 2);
        const tb = b.is_priority ? 0 : (b.list_type === 'want' ? 1 : 2);
        return ta - tb;
      });
      const abbrs = sorted.map(g => (g.is_priority ? '⭐' : '') + esc(resolveGameAbbr(g)));
      const maxShow = durationH >= 6 ? 4 : durationH >= 4 ? 3 : 2;
      if (abbrs.length <= maxShow) return abbrs.join(' · ');
      return abbrs.slice(0, maxShow).join(' · ') + ` +${abbrs.length - maxShow}`;
    }

    function barRow(v) {
      const left     = ((v.time_start - MIN_H) / range * 100).toFixed(1);
      const width    = ((v.time_end - v.time_start) / range * 100).toFixed(1);
      const mine     = myVote && String(v.user_id) === String(myVote.user_id);
      const gameLine = gameAbbrs(v.vote_date, v.user_id, v.time_end - v.time_start);
      // 이름은 등록자 1명뿐이지만 인원은 동반 포함이라 다르다 → 막대에 「+N」으로 드러낸다
      const guestN   = partyCount([v]) - 1;
      // 지난 날짜엔 수정·취소를 렌더하지 않는다 — 등록 경로(cottage-edit/register)가
      // `ds >= 오늘`에서 조용히 버려져 눌러도 아무 일이 안 일어나던 자리다.
      // 보기(막대·상세·모달)는 그대로 열린다(확정 사양: opacity만, pointer-events 차단 없음).
      const actions = (mine && v.vote_date >= today)
        ? `<div class="sched-bar-actions">
            <button class="sched-bar-edit-btn" type="button" aria-label="참여 시간 수정">✎</button>
            <button class="sched-bar-del-btn" type="button" aria-label="참여 취소">✕</button>
          </div>`
        : '';
      return `<div class="sched-bar-item">
        <div class="sched-bar-left">
          <span class="sched-bar-name" data-uid="${esc(v.user_id)}">${esc(v.nickname)}</span>
          ${guestN > 0 ? `<span class="sched-bar-guest" title="동반 인원 ${guestN}명">+${guestN}</span>` : ''}
          ${actions}
        </div>
        <div class="sched-bar-track${gameLine ? ' has-games' : ''}" data-date="${esc(v.vote_date)}" data-uid="${esc(v.user_id)}" style="cursor:pointer">
          <div class="sched-bar-fill${mine ? ' is-mine' : ''}" style="left:${left}%;width:${width}%">
            <span class="sched-bar-time">${window.formatVoteHour(v.time_start, {compact:true})}~${window.formatVoteHour(v.time_end, {compact:true})}</span>
            ${gameLine ? `<span class="sched-bar-game-line">${gameLine}</span>` : ''}
          </div>
        </div>
      </div>`;
    }

    function buildGameTags(voteDate) {
      const dateGames = voteGames.filter(g => g.vote_date === voteDate);
      if (!dateGames.length) {
        // 참여자는 있으나(막대는 렌더됨) 아무도 게임을 안 고른 날 — 게임 영역이 통째로
        // 사라지는 대신 넛지로 등록을 유도한다. 지난 날짜는 등록이 무의미하므로 숨긴다.
        return voteDate >= today
          ? '<div class="sched-game-tags"><div class="sched-game-empty">🎲 아직 하고 싶은 게임이 없어요</div></div>'
          : '';
      }

      const nameMap = {}, wantCnt = {}, learnCnt = {}, priorityCnt = {};
      dateGames.forEach(g => {
        const name = g.game_id
          ? (window.COTTAGE_GAMES?.find(c => c.bggId === String(g.game_id))?.display || g.custom_name || `#${g.game_id}`)
          : (g.custom_name || '?');
        const key = g.game_id ? `id:${g.game_id}` : `n:${g.custom_name}`;
        if (!nameMap[key]) nameMap[key] = name;
        if (g.list_type === 'want')  wantCnt[key]  = (wantCnt[key]  || 0) + 1;
        if (g.list_type === 'learn') learnCnt[key] = (learnCnt[key] || 0) + 1;
        if (g.list_type === 'want' && g.is_priority) priorityCnt[key] = (priorityCnt[key] || 0) + 1;
      });

      // 개별 태그에 🎲/📖를 붙이지 않고 하고싶은/배우고싶은 그룹 헤더로 분리(집계 칩과 동일 구성).
      // 한 게임이 want·learn 둘 다면 양쪽 그룹에 각각 표시(카운트 기준).
      const _tag = (key, cnt, tone) => {
        const suffix = cnt > 1 ? ` ·${cnt}` : '';
        const gameId = key.startsWith('id:') ? key.slice(3) : null;
        const thumb = dbThumbHtml(gameId, 'sched-game-tag-thumb');
        const name = esc(nameMap[key]);
        // 클릭 대상은 썸네일만(2026-07-27 통일 — .dd-game-hit 재사용, 다른 두 목록과 같은 규칙·같은
        // 바인딩). 썸네일이 없으면 이름이 대신 클릭 대상. 직접입력(game_id 없음)은 클릭 불가.
        const hitTarget = thumb || name;
        const rest = thumb ? name : '';
        const hit = gameId
          ? `<span class="dd-game-hit" data-game-id="${esc(String(gameId))}">${hitTarget}</span>${rest}`
          : `${thumb}${name}`;
        return `<span class="sched-game-tag sched-game-tag--${tone}">${hit}${suffix}</span>`;
      };
      const wantKeys = Object.keys(wantCnt).sort((a, b) =>
        ((wantCnt[b] || 0) - (wantCnt[a] || 0)) || ((priorityCnt[b] || 0) - (priorityCnt[a] || 0)));
      const learnKeys = Object.keys(learnCnt).sort((a, b) => (learnCnt[b] || 0) - (learnCnt[a] || 0));
      const _group = (label, keys, cntObj, tone) => keys.length
        ? `<div class="sched-tag-group"><span class="sched-tag-group-label">${label}</span><div class="sched-tag-row">${keys.map(k => _tag(k, cntObj[k], tone)).join('')}</div></div>`
        : '';

      return `<div class="sched-game-tags">${_group('🎲 하고 싶은 게임', wantKeys, wantCnt, 'want')}${_group('📖 배우고 싶은 게임', learnKeys, learnCnt, 'learn')}</div>`;
    }

    const voteDate = dayVotes[0].vote_date;

    return `<div class="sched-card-bars">
      <div class="sched-bar-axis">
        <span>${MIN_H}시</span><span>${window.formatVoteHour((MIN_H + MAX_H) / 2)}</span><span>${MAX_H}시</span>
      </div>
      ${dayVotes.map(barRow).join('')}
      ${buildGameTags(voteDate)}
    </div>`;
  };
})();
