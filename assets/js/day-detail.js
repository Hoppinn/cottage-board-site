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
    .dd-modal {
      background: var(--paper, #fffaf0);
      border-radius: 16px;
      width: 100%; max-width: 300px;
      overflow: hidden;             /* border-radius 클리핑 */
    }
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
    .dd-cond-select { font-size: 11px; padding: 1px 4px; border-radius: 10px; border: 1px solid #ede8e0; background: #f0ece6; color: var(--muted, #9e8e7e); cursor: pointer; flex-shrink: 0; }
    .dd-cond-badge { font-size: 10px; padding: 1px 5px; border-radius: 8px; background: #f0ece6; color: var(--green, #7a4828); }
    .dd-cond-tag { font-size: 11px; color: var(--muted, #9e8e7e); font-weight: 400; }

    /* 홈 미리보기 모달 — 플래너 보기 버튼 */
    .dd-green-btn {
      background: var(--green, #7a4828);
      color: white;
    }
    .dd-green-btn:active { background: #5a3318; }

    /* ── 날짜 집계 모달 — 게임 집계 + 참여자 토글 ── */
    .dd-game-aggr-section { margin-bottom: 12px; }
    .dd-game-aggr { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .dd-game-chip {
      display: inline-flex; align-items: center;
      font-size: 11px; padding: 3px 9px;
      border-radius: 12px; white-space: nowrap;
    }
    .dd-game-chip--want { background: var(--bg-soft); color: var(--green); }
    .dd-game-chip--learn { background: var(--line); color: var(--muted); }
    .dd-participants-toggle {
      margin-top: 8px;
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }
    .dd-participants-toggle > summary {
      font-size: 12px; color: var(--muted);
      cursor: pointer; list-style: none;
      padding: 4px 0; user-select: none;
    }
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
    .sched-game-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border);
    }
    .sched-game-tag {
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 10px;
      line-height: 1.5;
      white-space: nowrap;
    }
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
    return days[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
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
        ${statChip('⏱', '시간 겹침', overlapCount, overlapCount > 0)}
        ${statChip('🎲', '게임 겹침', gameMatchCount, gameMatchCount > 0)}
      </div>`;

      const me = window.getKakaoUser?.();
      const isMine = !!(me && String(me.id) === String(userId));

      const wantGameObjs  = myGames.filter(g => g.list_type === 'want');
      const learnGameObjs = myGames.filter(g => g.list_type === 'learn');

      const COND_LABELS = { any:'무관', best:'베스트', recommended:'추천', '2':'2인', '3':'3인', '4':'4인', '5+':'5인+' };
      function buildGameSection(gameObjs, icon, label) {
        if (!gameObjs.length) return '';
        const items = gameObjs.map(g => {
          const name = esc(resolveGameName(g));
          const key  = gameKey(g);
          if (isMine) {
            const star = g.is_priority ? '⭐' : '☆';
            const curCond = g.player_condition || 'any';
            const selectOpts = Object.entries(COND_LABELS)
              .map(([v, l]) => `<option value="${v}"${v === curCond ? ' selected' : ''}>${l}</option>`).join('');
            const _initCondLabel = window.formatCondLabel?.(curCond, g.game_id) || '';
            return `<li><span>${name}</span><select class="dd-cond-select" data-key="${esc(key)}" data-listtype="${g.list_type}" data-gameid="${esc(String(g.game_id ?? ''))}" aria-label="인원 조건">${selectOpts}</select><span class="dd-cond-tag dd-cond-live">${esc(_initCondLabel)}</span><button class="dd-star-btn" data-key="${esc(key)}" data-listtype="${g.list_type}" data-priority="${g.is_priority}" type="button" aria-label="대표 게임 지정">${star}</button></li>`;
          }
          const cond = g.player_condition || 'any';
          const cgEntry = g.game_id ? window.COTTAGE_GAMES?.find(c => c.bggId === String(g.game_id)) : null;
          const cl = condLabel(cond, cgEntry);
          return `<li>${name}${cl ? ` <span class="dd-cond-tag">(${esc(cl)})</span>` : ''}</li>`;
        }).join('');
        const ulCls = isMine ? 'dd-game-list dd-game-list--editable' : 'dd-game-list';
        return `<div class="dd-section">
          <span class="dd-section-label">${icon} ${label}</span>
          <ul class="${ulCls}">${items}</ul>
        </div>`;
      }

      renderModal(`
        <div class="dd-modal-nick">${esc(myVote.nickname)}</div>
        ${statsHtml}
        <div class="dd-block">
          <div class="dd-date">${fmtDate(voteDate)}</div>
          <div class="dd-time">${myVote.time_start}~${myVote.time_end}시</div>
          ${buildGameSection(wantGameObjs, '🎲', '하고 싶은 게임')}
          ${buildGameSection(learnGameObjs, '📖', '배우고 싶은 게임')}
          ${isMine ? '<p class="dd-star-notice" style="display:none"></p>' : ''}
        </div>
      `);

      if (isMine) {
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
            _schedDirty = true;
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
              return;
            }
            gameObj.player_condition = newCond;
            sel.dataset.prev = newCond;
            const _liveLabel = sel.closest('li')?.querySelector('.dd-cond-live');
            if (_liveLabel) _liveLabel.textContent = window.formatCondLabel?.(newCond, gameObj.game_id ?? null) || '';
            _schedDirty = true;
          });
        });
      }
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
   * 날짜 전체 모임 모달 (홈 미리보기 카드 클릭 — 유저 비중심, 날짜 집계 뷰)
   * @param {string} voteDate — 'YYYY-MM-DD'
   * @param {Array}  votes    — 해당 날짜의 meeting_votes 배열 (사전 패치)
   * @param {Array}  voteGames — 해당 날짜의 meeting_vote_games 배열 (사전 패치)
   * @param {{ onPlannerClick?: () => void }} [opts]
   */
  window.openDateMeetingModal = function (voteDate, votes, voteGames, opts = {}) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay';

    const uniqueVotes = [...new Map(votes.map(v => [String(v.user_id), v])).values()];
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

    // 룰렛 후보: want 게임 중복 제거, 약칭 포함
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

    // 전체 게임 집계 (want/learn 분리, 투표수 내림차순)
    const aggrMap = {}, aggrMeta = {}, aggrPriority = {}, aggrConds = {};
    voteGames.forEach(g => {
      const key = `${g.list_type}::${g.game_id ? `id:${g.game_id}` : `n:${g.custom_name}`}`;
      aggrMap[key] = (aggrMap[key] || 0) + 1;
      if (!aggrMeta[key]) aggrMeta[key] = { name: resolveGameName(g), type: g.list_type, game_id: g.game_id ?? null };
      if (g.is_priority) aggrPriority[key] = (aggrPriority[key] || 0) + 1;
      const cond = g.player_condition || 'any';
      if (cond !== 'any') {
        if (!aggrConds[key]) aggrConds[key] = [];
        aggrConds[key].push(cond);
      }
    });
    const aggrItems = Object.entries(aggrMap)
      .map(([key, count]) => ({
        ...aggrMeta[key],
        count,
        priority: aggrPriority[key] || 0,
        conds: [...new Set(aggrConds[key] || [])],
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'want' ? -1 : 1;
        const cd = b.count - a.count;
        return cd !== 0 ? cd : b.priority - a.priority;
      });

    function condBadgeHtml(conds, game_id, maxN) {
      if (!conds.length) return '';
      const badges = [];
      for (const c of conds) {
        if (c === '2' || c === '3' || c === '4') {
          if (maxN < Number(c)) badges.push(`${c}인 필요`);
        } else if (c === '5+') {
          if (maxN < 5) badges.push('5인+ 필요');
        } else if (c === 'best' || c === 'recommended') {
          const cgEntry = game_id ? window.COTTAGE_GAMES?.find(cg => cg.bggId === String(game_id)) : null;
          const arr = (c === 'best' ? cgEntry?.bestPlayers : cgEntry?.recPlayers) || [];
          if (!arr.length || !arr.some(p => Number(p) === maxN)) badges.push(condLabel(c, cgEntry));
        }
      }
      return badges.map(b => `<span class="dd-cond-badge">${esc(b)}</span>`).join('');
    }

    const gameAggrHtml = aggrItems.length
      ? `<div class="dd-section dd-game-aggr-section">
          <span class="dd-section-label">그날의 게임</span>
          <div class="dd-game-aggr">${aggrItems.map(({ name, type, count, priority, conds, game_id }) => {
            const icon = type === 'want' ? '🎲' : '📖';
            const suffix = count > 1 ? ` ·${count}` : '';
            const star = priority >= 1 ? ` ⭐${priority}` : '';
            const badges = condBadgeHtml(conds, game_id, peakCnt);
            return `<span class="dd-game-chip dd-game-chip--${type}">${icon} ${esc(name)}${suffix}${star}${badges}</span>`;
          }).join('')}</div>
        </div>`
      : '';

    const participantsBody = uniqueVotes.map(v => {
      const myGames = voteGames.filter(g => String(g.user_id) === String(v.user_id));
      const wantNames  = myGames.filter(g => g.list_type === 'want').map(g => esc(resolveGameName(g)));
      const learnNames = myGames.filter(g => g.list_type === 'learn').map(g => esc(resolveGameName(g)));
      const wantHtml  = wantNames.length  ? `<ul class="dd-game-list">${wantNames.map(n => `<li>${n}</li>`).join('')}</ul>` : '';
      const learnHtml = learnNames.length ? `<ul class="dd-game-list">${learnNames.map(n => `<li>${n}</li>`).join('')}</ul>` : '';
      return `<div class="dd-block">
        <div class="dd-modal-nick" style="font-size:13px">${esc(v.nickname)}</div>
        <div class="dd-time">${v.time_start}~${v.time_end}시</div>
        ${wantNames.length  ? `<div class="dd-section"><span class="dd-section-label">🎲 하고 싶은 게임</span>${wantHtml}</div>`  : ''}
        ${learnNames.length ? `<div class="dd-section"><span class="dd-section-label">📖 배우고 싶은 게임</span>${learnHtml}</div>` : ''}
      </div>`;
    }).join('');

    const plannerBtnLabel = opts.fromHome ? '전체 일정 보기' : '플래너 보기';
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
        ${gameAggrHtml}
        ${rouletteBtnHtml}
        ${participantsBody
          ? `<details class="dd-participants-toggle">
              <summary>참여자별 보기</summary>
              <div class="dd-participants-body">${participantsBody}</div>
            </details>`
          : '<div class="dd-empty">참여자가 없습니다.</div>'
        }
      </div>
      ${roulettePanelHtml}
      <div class="dd-close-row" style="gap:8px">
        <button class="dd-close-btn dd-green-btn" type="button">${plannerBtnLabel}</button>
        <button class="dd-close-btn" type="button">닫기</button>
      </div>
    </div>`;

    document.body.appendChild(el);
    const [plannerBtn, closeBtn] = el.querySelectorAll('.dd-close-btn');
    plannerBtn.addEventListener('click', () => { el.remove(); opts.onPlannerClick?.(); });
    closeBtn.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });

    // 룰렛 로직
    if (rouletteGames.length >= 2) {
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
    const MIN_H = 9, MAX_H = 23, LIMIT = 3;
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

      const chips = Object.keys(nameMap)
        .sort((a, b) => {
          const wd = (wantCnt[b] || 0) - (wantCnt[a] || 0);
          if (wd !== 0) return wd;
          const pd = (priorityCnt[b] || 0) - (priorityCnt[a] || 0);
          return pd !== 0 ? pd : (learnCnt[b] || 0) - (learnCnt[a] || 0);
        })
        .map(key => {
          const w = wantCnt[key] || 0;
          const l = learnCnt[key] || 0;
          const parts = [];
          if (w > 0) parts.push(`🎲${w > 1 ? w : ''}`);
          if (l > 0) parts.push(`📖${l > 1 ? l : ''}`);
          const tone = w > 0 ? 'want' : 'learn';
          return `<span class="sched-game-tag sched-game-tag--${tone}">${esc(nameMap[key])} ${parts.join(' ')}</span>`;
        }).join('');

      return `<div class="sched-game-tags">${chips}</div>`;
    }

    const voteDate = dayVotes[0].vote_date;
    const shown  = dayVotes.slice(0, LIMIT);
    const hidden = dayVotes.slice(LIMIT);
    const moreHtml = hidden.length
      ? `<div class="sched-card-hidden-rows" style="display:none">${hidden.map(barRow).join('')}</div>
         <button class="sched-card-more-btn" type="button">+${hidden.length}명 더보기</button>`
      : '';

    return `<div class="sched-card-bars">
      <div class="sched-bar-axis">
        <span>${MIN_H}시</span><span>${Math.round((MIN_H + MAX_H) / 2)}시</span><span>${MAX_H}시</span>
      </div>
      ${shown.map(barRow).join('')}
      ${moreHtml}
      ${buildGameTags(voteDate)}
    </div>`;
  };
})();
