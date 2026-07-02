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
      margin-bottom: 12px;
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
   * 막대 클릭 시 센터 모달 열기
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
})();
