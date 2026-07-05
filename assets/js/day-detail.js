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

    /* 홈 미리보기 모달 — 플래너 보기 버튼 */
    .dd-green-btn {
      background: var(--green, #7a4828);
      color: white;
    }
    .dd-green-btn:active { background: #5a3318; }

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
    if (g.custom_name) return g.custom_name;
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
  window.openDateScheduleModal = async function (userId, voteDate) {
    document.getElementById('__ddModal')?.remove();
    const el = document.createElement('div');
    el.id = '__ddModal';
    el.className = 'dd-overlay';

    const renderModal = (bodyHtml) => {
      el.innerHTML = `<div class="dd-modal" role="dialog" aria-modal="true">
        <div class="dd-modal-scroll">${bodyHtml}</div>
        <div class="dd-close-row">
          <button class="dd-close-btn" type="button">닫기</button>
        </div>
      </div>`;
      el.querySelector('.dd-close-btn').addEventListener('click', () => el.remove());
      el.addEventListener('click', e => { if (e.target === el) el.remove(); });
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

      const wantGames  = myGames.filter(g => g.list_type === 'want').map(resolveGameName);
      const learnGames = myGames.filter(g => g.list_type === 'learn').map(resolveGameName);

      renderModal(`
        <div class="dd-modal-nick">${esc(myVote.nickname)}</div>
        ${statsHtml}
        ${window.renderDayDetailHTML({ date: voteDate, timeStart: myVote.time_start, timeEnd: myVote.time_end, wantGames, learnGames })}
      `);
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

    // 2명 이상이 원하는 공통 게임
    const gkCount = {};
    const gkMeta  = {};
    voteGames.forEach(g => {
      const k = g.game_id ? `id:${g.game_id}` : `name:${(g.custom_name || '').trim().toLowerCase()}`;
      gkCount[k] = (gkCount[k] || 0) + 1;
      if (!gkMeta[k]) gkMeta[k] = g;
    });
    const commonGames = Object.entries(gkCount)
      .filter(([, c]) => c >= 2)
      .map(([k]) => esc(resolveGameName(gkMeta[k])));

    const statsHtml = `<div class="dd-stats-row">
      <span class="dd-stat-chip">👥 ${count}명 참여</span>
      ${peakCnt >= 2 ? `<span class="dd-stat-chip is-match">⏱ 최대 ${peakCnt}명 겹침</span>` : ''}
      ${commonGames.length ? `<span class="dd-stat-chip is-match">🎲 공통 게임 ${commonGames.length}종</span>` : ''}
    </div>`;

    const commonGamesHtml = commonGames.length
      ? `<div class="dd-section" style="margin-bottom:12px">
          <span class="dd-section-label">🎲 함께 하고 싶은 게임</span>
          <ul class="dd-game-list">${commonGames.map(n => `<li>${n}</li>`).join('')}</ul>
        </div>`
      : '';

    const participantsHtml = uniqueVotes.map(v => {
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

    el.innerHTML = `<div class="dd-modal" role="dialog" aria-modal="true">
      <div class="dd-modal-scroll">
        <div class="dd-date">${fmtDate(voteDate)}</div>
        ${statsHtml}
        ${commonGamesHtml}
        ${participantsHtml || '<div class="dd-empty">참여자가 없습니다.</div>'}
      </div>
      <div class="dd-close-row" style="gap:8px">
        <button class="dd-close-btn dd-green-btn" type="button">플래너 보기</button>
        <button class="dd-close-btn" type="button">닫기</button>
      </div>
    </div>`;

    document.body.appendChild(el);
    const [plannerBtn, closeBtn] = el.querySelectorAll('.dd-close-btn');
    plannerBtn.addEventListener('click', () => { el.remove(); opts.onPlannerClick?.(); });
    closeBtn.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
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

    function gameNames(voteDate, userId) {
      const games = voteGames.filter(g =>
        g.vote_date === voteDate && String(g.user_id) === String(userId)
      );
      if (!games.length) return '';
      const names = games.map(g => esc(resolveGameName(g)));
      return names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}`;
    }

    function barRow(v) {
      const left     = ((v.time_start - MIN_H) / range * 100).toFixed(1);
      const width    = ((v.time_end - v.time_start) / range * 100).toFixed(1);
      const mine     = myVote && String(v.user_id) === String(myVote.user_id);
      const gameLine = gameNames(v.vote_date, v.user_id);
      const timeLabel = gameLine
        ? `${v.time_start}~${v.time_end} · ${gameLine}`
        : `${v.time_start}~${v.time_end}`;
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
        <div class="sched-bar-track" data-date="${esc(v.vote_date)}" data-uid="${esc(v.user_id)}" style="cursor:pointer">
          <div class="sched-bar-fill${mine ? ' is-mine' : ''}" style="left:${left}%;width:${width}%">
            <span class="sched-bar-time">${timeLabel}</span>
          </div>
        </div>
      </div>`;
    }

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
    </div>`;
  };
})();
