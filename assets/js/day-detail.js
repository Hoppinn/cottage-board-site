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
      display: flex; justify-content: center;
    }
    .dd-close-btn {
      background: #ede8e0; border: none; border-radius: 20px;
      padding: 6px 24px; font-size: 13px; cursor: pointer;
      color: var(--green, #7a4828); font-weight: 600;
    }
    .dd-close-btn:active { background: #ddd6cb; }

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
    /* 썸네일이 13px라 터치 타겟으로 작음 → 썸네일+이름 묶음을 클릭 영역으로.
       인라인 span이라 정확히 그 폭만 잡는다(li 전체에 주면 인원조건 태그·빈 공간까지 눌림). */
    .dd-game-hit { cursor: pointer; border-radius: 4px; }
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
    .sched-game-tag-thumb { width: 10px; height: 10px; border-radius: 2px; object-fit: cover; margin-right: 2px; flex-shrink: 0; }
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
  `;
  document.head.appendChild(s);

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
      <div class="dd-time">${timeStart}~${timeEnd}시</div>
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
      const totalCount  = votes.length;
      const overlapCount = others.filter(v => timeOverlap(myVote, v)).length;
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
          if (isMine) {
            const star = g.is_priority ? '⭐' : '☆';
            const curCond = g.player_condition || 'any';
            // 옵션 텍스트 자체를 게임별 해석 라벨로(베스트→"베스트 3인", 3인→"3인") → 별도 태그 없이 select 하나로 통합
            const _optLabel = (v) => v === 'any' ? '무관' : (window.formatCondLabel?.(v, g.game_id) || COND_LABELS[v]);
            const selectOpts = Object.keys(COND_LABELS)
              .map(v => `<option value="${v}"${v === curCond ? ' selected' : ''}>${esc(_optLabel(v))}</option>`).join('');
            const selWidth = window._condSelWidth?.(_optLabel(curCond)) || '';
            return `<li><span>${thumb}${name}</span><select class="dd-cond-select" style="width:${selWidth}" data-key="${esc(key)}" data-listtype="${g.list_type}" data-gameid="${esc(String(g.game_id ?? ''))}" aria-label="인원 조건">${selectOpts}</select><button class="dd-star-btn" data-key="${esc(key)}" data-listtype="${g.list_type}" data-priority="${g.is_priority}" type="button" aria-label="대표 게임 지정">${star}</button></li>`;
          }
          const cond = g.player_condition || 'any';
          const cgEntry = g.game_id ? window.COTTAGE_GAMES?.find(c => c.bggId === String(g.game_id)) : null;
          const cl = condLabel(cond, cgEntry);
          return `<li>${thumb}${name}${cl ? ` <span class="dd-cond-tag">(${esc(cl)})</span>` : ''}</li>`;
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
        <div class="dd-date-time">${fmtDate(voteDate)} · ${myVote.time_start}~${myVote.time_end}시</div>
        ${statsHtml}
        <div class="dd-block">
          ${_buildSchedGameSection(wantGameObjs, '🎲', '하고 싶은 게임', isMine)}
          ${_buildSchedGameSection(learnGameObjs, '📖', '배우고 싶은 게임', isMine)}
          ${isMine ? '<p class="dd-star-notice" style="display:none"></p>' : ''}
        </div>
      `);

      if (isMine) _bindSchedEditors(el, { userId, voteDate, myGames, onDirty: () => { _schedDirty = true; } });
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
    const close = () => el.remove();
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
  window.openDatePreviewModal = function (dateStr, dayVotes, dayGames, myVote, onChange) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay';
    const dObj = new Date(dateStr + 'T00:00:00');
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];
    const dateLabel = `${dObj.getMonth() + 1}/${dObj.getDate()}(${DOW[dObj.getDay()]})`;
    const count = new Set((dayVotes || []).map(v => v.user_id)).size;
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
    const close = () => el.remove();
    el.querySelector('.dd-x-btn').addEventListener('click', close);
    el.addEventListener('click', e => { if (e.target === el) close(); });
    // 참여자 이름 클릭 → 해당 유저 모임 보드 (홈 미리보기와 동일)
    el.querySelectorAll('.sched-bar-name').forEach(n =>
      n.addEventListener('click', () => window.openOtherMeetingSheet?.(n.dataset.uid)));
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
  };

  // ── 모임 플래너 센터모달 (공용 유틸 — 전 페이지에서 호출, 페이지별 복제 금지) ──
  // club-schedule.html?embed=true 를 iframe 센터모달로 띄운다. open 시 목표 상태
  // (주차 오프셋·등록/수정 목적지)를 전부 선언(CLAUDE.md iframe 재사용 원칙).
  let _pmFrame = null, _pmReady = false, _pmPending = null, _pmDirty = false, _pmOnDirty = null;
  function _pmDeclare(opts) {
    const w = _pmFrame?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'cottage-reset-week', offset: opts.weekOffset ?? 0 }, '*');
    if (opts.register) w.postMessage({ type: 'cottage-register', date: opts.register }, '*');
    else if (opts.edit) w.postMessage({ type: 'cottage-edit', date: opts.edit }, '*');
  }
  function _pmEsc(e) { if (e.key === 'Escape') _pmCloseModal(); }
  function _pmCloseModal() {
    const ov = document.getElementById('__plannerModal');
    if (!ov) return;
    ov.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', _pmEsc);
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
    ov.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', _pmEsc);
    // 조건부 재로드: 이미 플래너 로드됨 → 상태만 선언 / 아니면 로드 후 ready 대기
    let samePage = false;
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
    if (e.data?.type === 'cottage-meeting-saved') { _pmDirty = true; _pmOnDirty?.(); } // 저장 즉시 부모 갱신(닫을 때만 기다리지 않음)
  });
  /**
   * 날짜 전체 모임 모달 (홈 미리보기 카드 클릭 — 유저 비중심, 날짜 집계 뷰)
   * @param {string} voteDate — 'YYYY-MM-DD'
   * @param {Array}  votes    — 해당 날짜의 meeting_votes 배열 (사전 패치)
   * @param {Array}  voteGames — 해당 날짜의 meeting_vote_games 배열 (사전 패치)
   * @param {{ onPlannerClick?: () => void }} [opts]
   */
  /** 모임 상세 통계 칩 HTML (참여 인원 · 최대 동시 겹침 · 공통 게임 수) */
  function _buildMeetingStatsHtml(votes, uniqueVotes, voteGames) {
    const count = uniqueVotes.length;
    // 최대 동시 참여 가능 인원 (1시간 단위 슬롯)
    const MIN_H = 10, MAX_H = 24;
    let peakCnt = 0;
    for (let h = MIN_H; h < MAX_H; h++) {
      const c = votes.filter(v => v.time_start <= h && v.time_end > h).length;
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
        // 클릭 대상은 썸네일+이름 묶음뿐 — 인원조건 태그는 게임이 아니므로 제외한다.
        // 직접입력(game_id 없음)은 열 시트가 없어 묶음을 감싸지 않는다(= 클릭 불가).
        const label = `${dbThumbHtml(g.game_id, 'dd-game-thumb')}${esc(resolveGameName(g))}`;
        const hit = g.game_id
          ? `<span class="dd-game-hit" data-game-id="${esc(String(g.game_id))}">${label}</span>`
          : label;
        return `<li class="dd-game-item">${hit}${cl ? ` <span class="dd-cond-tag">(${esc(cl)})</span>` : ''}</li>`;
      };
      const wantGames  = myGames.filter(g => g.list_type === 'want');
      const learnGames = myGames.filter(g => g.list_type === 'learn');
      const wantHtml  = wantGames.length  ? `<ul class="dd-game-list">${wantGames.map(_li).join('')}</ul>` : '';
      const learnHtml = learnGames.length ? `<ul class="dd-game-list">${learnGames.map(_li).join('')}</ul>` : '';
      return `<div class="dd-block">
        <div class="dd-modal-nick dd-nick-link" data-uid="${esc(v.user_id)}">${esc(v.nickname)}</div>
        <div class="dd-time">${v.time_start}~${v.time_end}시</div>
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

      openBtn.addEventListener('click', () => {
        mainScroll.style.display = 'none';
        roulettePanel.style.display = '';
        buildWheel();
        buildChips();
        updateSpinBtn();
      });

      backBtn.addEventListener('click', () => {
        roulettePanel.style.display = 'none';
        mainScroll.style.display = '';
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
        <button class="dd-close-btn" type="button">닫기</button>
      </div>
    </div>`;

    document.body.appendChild(el);
    const closeBtn = el.querySelector('.dd-close-btn');
    closeBtn.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });

    // 참여자 닉네임 클릭 → 그 사람 모임 보드 (Phase D 진입점 규칙: 모임 참여자 = openOtherMeetingSheet)
    // 보드는 이 모달 위에 겹쳐 뜬다(--z-profile 9100 > .dd-overlay--under-board 9050) —
    // 전환이 아니라 레이어를 쌓는 것이므로 모달을 닫지 않는다. 보드를 닫으면 이 모달이 그대로 보인다.
    el.querySelectorAll('.dd-nick-link').forEach(n =>
      n.addEventListener('click', () => window.openOtherMeetingSheet?.(n.dataset.uid)));

    // 게임 행 클릭 → 게임시트. 게임시트(--z-sheet 9500)가 이 모달 위에 겹쳐 뜨므로 닫지 않는다
    // (시트를 닫으면 이 모달로 복귀 — 닉네임→보드와 같은 레이어 방식).
    // ⚠️ meeting_vote_games.game_id는 BGG ID인데 openGameSheet는 gameData 슬러그 키를 받는다 —
    //    변환 없이 넘기면 미보유 게임으로 오인해 조용히 기록시트로 폴백된다(에러도 안 남).
    el.querySelectorAll('.dd-game-hit').forEach(hit =>
      hit.addEventListener('click', () => {
        const key = window.getGameKeyById?.(hit.dataset.gameId);
        if (!key) return;
        window.ensureGameSheet?.();
        window.openGameSheet?.(key);
      }));

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
    const MIN_H = 9, MAX_H = 23;
    const range = MAX_H - MIN_H;

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
      const actions = mine
        ? `<div class="sched-bar-actions">
            <button class="sched-bar-edit-btn" type="button" aria-label="참여 시간 수정">✎</button>
            <button class="sched-bar-del-btn" type="button" aria-label="참여 취소">✕</button>
          </div>`
        : '';
      return `<div class="sched-bar-item">
        <div class="sched-bar-left">
          <span class="sched-bar-name" data-uid="${esc(v.user_id)}">${esc(v.nickname)}</span>
          ${actions}
        </div>
        <div class="sched-bar-track${gameLine ? ' has-games' : ''}" data-date="${esc(v.vote_date)}" data-uid="${esc(v.user_id)}" style="cursor:pointer">
          <div class="sched-bar-fill${mine ? ' is-mine' : ''}" style="left:${left}%;width:${width}%">
            <span class="sched-bar-time">${v.time_start}~${v.time_end}</span>
            ${gameLine ? `<span class="sched-bar-game-line">${gameLine}</span>` : ''}
          </div>
        </div>
      </div>`;
    }

    function buildGameTags(voteDate) {
      const dateGames = voteGames.filter(g => g.vote_date === voteDate);
      if (!dateGames.length) return '';

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
        const thumb = dbThumbHtml(key.startsWith('id:') ? key.slice(3) : null, 'sched-game-tag-thumb');
        return `<span class="sched-game-tag sched-game-tag--${tone}">${thumb}${esc(nameMap[key])}${suffix}</span>`;
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
        <span>${MIN_H}시</span><span>${Math.round((MIN_H + MAX_H) / 2)}시</span><span>${MAX_H}시</span>
      </div>
      ${dayVotes.map(barRow).join('')}
      ${buildGameTags(voteDate)}
    </div>`;
  };
})();
