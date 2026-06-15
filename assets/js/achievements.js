// 업적/캐릭터 시스템 V1
// 트리거: recordGamePlay 성공 후 ('play'), submitRating 성공 후 ('review')

(function () {
  // 도감 등급표
  const CODEX_GRADES = [
    { min: 100, label: '👑 코티지 마스터' },
    { min: 80,  label: '🏛️ 게임 큐레이터' },
    { min: 60,  label: '📚 게임학자' },
    { min: 40,  label: '🚂 유랑자' },
    { min: 20,  label: '⛺ 개척자' },
    { min: 10,  label: '🗺️ 탐험가' },
    { min: 5,   label: '🍀 입문자' },
    { min: 0,   label: '🌱 새싹' },
  ];

  function getCodexGrade(pct) {
    for (const g of CODEX_GRADES) if (pct >= g.min) return g.label;
    return '🌱 새싹';
  }

  // 업적 체크 진입점 — supabase-client.js에서 호출
  async function checkAchievements(category, userId, opts = {}) {
    if (!userId || !window.CottageDB) return;
    const db = window.CottageDB;

    const [playCount, distinctCount, photoCount, ratingCount] = await Promise.all([
      category === 'play' || category === 'review' ? db.getUserPlayCount(userId) : Promise.resolve(null),
      category === 'play' ? db.getUserDistinctGameCount(userId) : Promise.resolve(null),
      category === 'play' ? db.getUserPhotoCount(userId) : Promise.resolve(null),
      category === 'review' ? db.getUserRatingCount(userId) : Promise.resolve(null),
    ]);

    const checks = [];

    if (category === 'play') {
      // play_record 계열 (새싹 토끼 포함)
      checks.push(
        { id: 'rabbit_first',   v: playCount,    t: 1 },
        { id: 'squirrel_10',    v: playCount,    t: 10 },
        { id: 'squirrel_50',    v: playCount,    t: 50 },
        { id: 'squirrel_100',   v: playCount,    t: 100 },
        { id: 'squirrel_200',   v: playCount,    t: 200 },
        // new_game 계열
        { id: 'rabbit_5',       v: distinctCount, t: 5 },
        { id: 'rabbit_20',      v: distinctCount, t: 20 },
        { id: 'rabbit_50',      v: distinctCount, t: 50 },
        { id: 'rabbit_100',     v: distinctCount, t: 100 },
        // photo 계열
        { id: 'hedgehog_1',     v: photoCount,   t: 1 },
        { id: 'hedgehog_10',    v: photoCount,   t: 10 },
        { id: 'hedgehog_50',    v: photoCount,   t: 50 },
        { id: 'hedgehog_100',   v: photoCount,   t: 100 },
      );
    }

    if (category === 'review') {
      checks.push(
        { id: 'hamster_1',   v: ratingCount, t: 1 },
        { id: 'hamster_10',  v: ratingCount, t: 10 },
        { id: 'hamster_50',  v: ratingCount, t: 50 },
        { id: 'hamster_100', v: ratingCount, t: 100 },
      );
    }

    // threshold 도달한 것만 grant 시도
    const achieved = checks.filter(c => c.v !== null && c.v >= c.t);
    if (!achieved.length) return;

    // achievements 정의 가져오기 (points 확인용)
    const allDefs = await db.getUserAchievements(userId).then(() => null).catch(() => null);
    // points는 SQL INSERT에서 achievements 테이블로 직접 조회하지 않고 하드코딩 매핑
    const POINTS = {
      rabbit_first: 300, rabbit_5: 500, rabbit_20: 1000, rabbit_50: 2000, rabbit_100: 3000,
      squirrel_10: 500, squirrel_50: 1000, squirrel_100: 2000, squirrel_200: 5000,
      hedgehog_1: 300, hedgehog_10: 500, hedgehog_50: 1000, hedgehog_100: 3000,
      hamster_1: 300, hamster_10: 500, hamster_50: 1000, hamster_100: 3000,
    };
    const NAMES = {
      rabbit_first: '새싹 토끼 🌱', rabbit_5: '호기심 토끼 🔍', rabbit_20: '탐험 토끼 🎒',
      rabbit_50: '여행 토끼 🧭', rabbit_100: '유랑 토끼 🗺️',
      squirrel_10: '도토리 다람쥐 🌰', squirrel_50: '창고 다람쥐 📦',
      squirrel_100: '겨울준비 다람쥐 🧺', squirrel_200: '사서 다람쥐 📖',
      hedgehog_1: '초보 고슴도치 📸', hedgehog_10: '기록가 고슴도치 🎞️',
      hedgehog_50: '포토마스터 고슴도치 📷', hedgehog_100: '작가 고슴도치 🎨',
      hamster_1: '리뷰어 햄스터 ✏️', hamster_10: '서평가 햄스터 📝',
      hamster_50: '평론가 햄스터 📚', hamster_100: '비평가 햄스터 🎓',
    };

    for (const { id } of achieved) {
      const granted = await db.grantAchievement(userId, id, POINTS[id] || 0);
      if (granted) {
        showAchievementToast(NAMES[id] || id, POINTS[id] || 0);
      }
    }
  }

  // 달성 토스트
  function showAchievementToast(name, points) {
    const existing = document.getElementById('achievementToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'achievementToast';
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-icon">🏆</div>
      <div class="achievement-toast-body">
        <div class="achievement-toast-title">캐릭터 해금!</div>
        <div class="achievement-toast-name">${name}</div>
        ${points ? `<div class="achievement-toast-pts">+${points.toLocaleString()}pt (승인 대기)</div>` : ''}
      </div>
      <a class="achievement-toast-link" href="#" onclick="event.preventDefault();document.querySelector('#kakaoProfileBtn')?.click()">내 활동 →</a>
    `;
    document.body.appendChild(toast);

    // 등장 애니메이션
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function getGameName(gameId) {
    if (!gameId) return String(gameId);
    if (window.gameData?.[gameId]) {
      const g = window.gameData[gameId];
      return g.display || g.titleKo || g.titleEn || String(gameId);
    }
    if (window.COTTAGE_GAMES) {
      const g = window.COTTAGE_GAMES.find(g => String(g.bggId) === String(gameId));
      if (g) return g.display || g.titleKo || g.titleEn || String(gameId);
    }
    return String(gameId);
  }

  // 게임 도감 섹션 HTML 빌드 — kakao-auth.js의 openProfilePanel에서 호출
  async function buildCodexSection(userId) {
    const db = window.CottageDB;
    if (!db) return '';

    const [playedGames] = await Promise.all([
      db.getUserPlayedGames(userId),
    ]);

    const totalGames = window.gameData ? Object.keys(window.gameData).length : 0;
    const playedCount = playedGames.length;
    const pct = totalGames > 0 ? Math.round((playedCount / totalGames) * 100) : 0;
    const grade = getCodexGrade(pct);
    const barWidth = Math.min(pct, 100);

    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const PREVIEW = 3;
    const previewGames = playedGames.slice(0, PREVIEW);
    const restGames = playedGames.slice(PREVIEW);

    const previewHtml = previewGames.map(r =>
      `<li class="profile-codex-game-item">✅ ${esc(getGameName(r.game_id))}</li>`
    ).join('');

    const restHtml = restGames.length
      ? `<div class="profile-codex-more-wrap is-hidden">
          <ul class="profile-codex-game-list">${restGames.map(r =>
            `<li class="profile-codex-game-item">✅ ${esc(getGameName(r.game_id))}</li>`
          ).join('')}</ul>
        </div>
        <button class="profile-codex-more-btn" type="button">전체 보기 (${restGames.length}개 더) ▾</button>`
      : '';

    const listHtml = playedCount
      ? `<div class="profile-codex-list-section">
          <ul class="profile-codex-game-list">${previewHtml}</ul>
          ${restHtml}
        </div>`
      : `<p class="profile-codex-empty">아직 수집한 게임이 없어요.</p>`;

    return `<div class="profile-codex-section">
      <div class="profile-codex-header">🎲 게임 도감</div>
      <div class="profile-codex-count">${playedCount} <span>/ ${totalGames}</span></div>
      <div class="profile-codex-bar-wrap"><div class="profile-codex-bar" style="width:${barWidth}%"></div></div>
      <div class="profile-codex-grade">${grade}</div>
      ${listHtml}
    </div>`;
  }

  // 캐릭터/대표 캐릭터 섹션 HTML 빌드
  async function buildCharacterSection(userId) {
    const db = window.CottageDB;
    if (!db) return '';

    const [achievements, repAch, totalPts, ptStats] = await Promise.all([
      db.getUserAchievements(userId),
      db.getRepAchievement(userId),
      db.getTotalPoints(userId),
      db.getUserPointRewardStats(userId),
    ]);

    const chars = achievements.length
      ? achievements.map(a => {
          const imgSrc = `/assets/images/characters/${a.id}.png`;
          return `<span class="profile-char-badge" title="${a.name}">` +
            `<img class="profile-char-img" src="${imgSrc}" alt="${a.name}" ` +
            `onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline'">` +
            `<span class="profile-char-emoji" style="display:none">${a.emoji}</span>` +
            ` ${a.name}</span>`;
        }).join('')
      : '<p class="profile-char-empty">아직 획득한 캐릭터가 없어요.<br><span style="font-size:11px;color:var(--muted)">게임을 플레이하면 캐릭터가 해금됩니다 🐾</span></p>';

    const repOptions = achievements.map(a =>
      `<option value="${a.id}" ${repAch?.id === a.id ? 'selected' : ''}>${a.emoji} ${a.name}</option>`
    ).join('');

    const ptsHtml = (totalPts > 0 || ptStats.pending > 0)
      ? `<div class="profile-points-line">
          💎 ${totalPts.toLocaleString()}pt
          ${ptStats.pending > 0 ? `<span class="profile-points-pending">+${ptStats.pending.toLocaleString()}pt 승인 대기</span>` : ''}
        </div>`
      : '';

    const repRowHtml = achievements.length
      ? `<div class="profile-rep-row">
          <span class="profile-rep-label">⭐ 대표</span>
          <select class="profile-rep-select" data-user-id="${userId}">
            <option value="">미설정</option>
            ${repOptions}
          </select>
        </div>`
      : '';

    const countLabel = achievements.length ? `${achievements.length}종` : '';

    return `<div class="profile-char-section">
      <div class="profile-char-header">🐾 내 캐릭터${countLabel ? ` <span class="profile-char-count">${countLabel}</span>` : ''}</div>
      <div class="profile-char-list">${chars}</div>
      ${repRowHtml}
      ${ptsHtml}
    </div>`;
  }

  // 대표 캐릭터 변경 이벤트 — 패널 내 select에서 호출
  async function handleRepSelect(select) {
    const userId = select.dataset.userId;
    const achId = select.value || null;
    if (!userId) return;
    await window.CottageDB?.setRepAchievement(userId, achId);
  }

  window.CottageAchievements = {
    checkAchievements,
    buildCodexSection,
    buildCharacterSection,
    handleRepSelect,
  };

  // supabase-client.js에서 호출하는 전역 함수
  window.checkAchievements = checkAchievements;
})();
