// 업적/캐릭터 시스템 V1
// 트리거: recordGamePlay 성공 후 ('play'), submitRating 성공 후 ('review')

(function () {
  // 캐릭터/업적 정의 — buildCharacterSection·buildAchievementsSection에서 공유
  const ACH_DEFS = [
    { id: 'rabbit_first',  name: '새싹 토끼 🌱',          emoji: '🌱', type: 'play',     threshold: 1   },
    { id: 'squirrel_10',   name: '도토리 다람쥐 🌰',       emoji: '🌰', type: 'play',     threshold: 10  },
    { id: 'squirrel_50',   name: '창고 다람쥐 📦',         emoji: '📦', type: 'play',     threshold: 50  },
    { id: 'squirrel_100',  name: '겨울준비 다람쥐 🧺',     emoji: '🧺', type: 'play',     threshold: 100 },
    { id: 'squirrel_200',  name: '사서 다람쥐 📖',         emoji: '📖', type: 'play',     threshold: 200 },
    { id: 'rabbit_5',      name: '호기심 토끼 🔍',         emoji: '🔍', type: 'new_game', threshold: 5   },
    { id: 'rabbit_20',     name: '탐험 토끼 🎒',           emoji: '🎒', type: 'new_game', threshold: 20  },
    { id: 'rabbit_50',     name: '여행 토끼 🧭',           emoji: '🧭', type: 'new_game', threshold: 50  },
    { id: 'rabbit_100',    name: '유랑 토끼 🗺️',           emoji: '🗺️', type: 'new_game', threshold: 100 },
    { id: 'hedgehog_1',    name: '초보 고슴도치 📸',       emoji: '📸', type: 'photo',    threshold: 1   },
    { id: 'hedgehog_10',   name: '기록가 고슴도치 🎞️',     emoji: '🎞️', type: 'photo',    threshold: 10  },
    { id: 'hedgehog_50',   name: '포토마스터 고슴도치 📷', emoji: '📷', type: 'photo',    threshold: 50  },
    { id: 'hedgehog_100',  name: '작가 고슴도치 🎨',       emoji: '🎨', type: 'photo',    threshold: 100 },
    { id: 'hamster_1',     name: '리뷰어 햄스터 ✏️',       emoji: '✏️', type: 'review',   threshold: 1   },
    { id: 'hamster_10',    name: '서평가 햄스터 📝',       emoji: '📝', type: 'review',   threshold: 10  },
    { id: 'hamster_50',    name: '평론가 햄스터 📚',       emoji: '📚', type: 'review',   threshold: 50  },
    { id: 'hamster_100',   name: '비평가 햄스터 🎓',       emoji: '🎓', type: 'review',   threshold: 100 },
  ];

  // 칭호 정의 — achId: user_achievements 기반 / visitThreshold: profiles.visit_count 기반
  const TITLE_DEFS = [
    { id: 'title_squirrel_10',  name: '첫 페이지',          emoji: '📝', rarity: '일반', achId: 'squirrel_10'  },
    { id: 'title_squirrel_50',  name: '이야기 수집가',       emoji: '📖', rarity: '고급', achId: 'squirrel_50'  },
    { id: 'title_squirrel_100', name: '코티지 연대기 작가',  emoji: '📚', rarity: '희귀', achId: 'squirrel_100' },
    { id: 'title_squirrel_200', name: '코티지 사서',         emoji: '🏛', rarity: '전설', achId: 'squirrel_200' },
    { id: 'title_rabbit_20',    name: '탐험가',              emoji: '🗺', rarity: '일반', achId: 'rabbit_20'    },
    { id: 'title_rabbit_50',    name: '개척자',              emoji: '⛺', rarity: '희귀', achId: 'rabbit_50'    },
    { id: 'title_rabbit_100',   name: '코티지 유랑자',       emoji: '🚂', rarity: '전설', achId: 'rabbit_100'   },
    { id: 'title_hedgehog_1',   name: '첫 셔터',             emoji: '📸', rarity: '일반', achId: 'hedgehog_1'   },
    { id: 'title_hedgehog_10',  name: '순간 수집가',         emoji: '🎞', rarity: '고급', achId: 'hedgehog_10'  },
    { id: 'title_hedgehog_50',  name: '기억 포착자',         emoji: '📷', rarity: '희귀', achId: 'hedgehog_50'  },
    { id: 'title_hedgehog_100', name: '코티지 사진사',       emoji: '🎨', rarity: '전설', achId: 'hedgehog_100' },
    { id: 'title_hamster_1',    name: '첫 감상가',           emoji: '✍', rarity: '일반', achId: 'hamster_1'    },
    { id: 'title_hamster_10',   name: '취향 기록자',         emoji: '📖', rarity: '고급', achId: 'hamster_10'   },
    { id: 'title_hamster_50',   name: '코티지 안내자',       emoji: '📚', rarity: '희귀', achId: 'hamster_50'   },
    { id: 'title_hamster_100',  name: '코티지 큐레이터',     emoji: '🏛', rarity: '전설', achId: 'hamster_100'  },
    { id: 'title_visit_10',  name: '코티지 단골', emoji: '☕', rarity: '일반', visitThreshold: 10  },
    { id: 'title_visit_30',  name: '코티지 이웃', emoji: '🏡', rarity: '고급', visitThreshold: 30  },
    { id: 'title_visit_50',  name: '코티지 주민', emoji: '🔥', rarity: '희귀', visitThreshold: 50  },
    { id: 'title_visit_100', name: '터줏대감',    emoji: '🌳', rarity: '영웅', visitThreshold: 100 },
    { id: 'title_visit_300', name: '코티지 원로', emoji: '👑', rarity: '전설', visitThreshold: 300 },
  ];

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
        // rabbit_first 신규 달성 시 rep가 null이면 자동 대표 설정 (덮어쓰기 금지)
        if (id === 'rabbit_first') {
          const currentRep = await db.getRepAchievement?.(userId).catch(() => null);
          if (!currentRep?.id) {
            await db.setRepAchievement?.(userId, 'rabbit_first').catch(() => {});
            const menuImg = document.getElementById('kakaoProfileImg');
            if (menuImg) menuImg.src = '/assets/images/characters/characters_basic/rabbit_first.png';
          }
        }
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
      </div>
      <a class="achievement-toast-link" href="#" onclick="event.preventDefault();document.querySelector('#kakaoProfileBtn')?.click()">내 보드 →</a>
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

  // 칭호 섹션 HTML 빌드 — { html, earnedIds } 반환
  async function buildTitleSection(userId, repTitleId, visitCount) {
    const db = window.CottageDB;
    if (!db) return { html: '', earnedIds: new Set() };
    try {
      const achievements = await db.getUserAchievements(userId);
      const earnedAchIds = new Set(achievements.map(a => a.id));
      const vc = Number(visitCount) || 0;

      const earnedIds = new Set();
      TITLE_DEFS.forEach(def => {
        const earned = def.achId ? earnedAchIds.has(def.achId) : vc >= (def.visitThreshold || Infinity);
        if (earned) earnedIds.add(def.id);
      });

      const RARITY_COLOR = { '일반': '#888', '고급': '#4caf50', '희귀': '#2196f3', '영웅': '#9c27b0', '전설': '#ff9800' };

      const cards = TITLE_DEFS.map(def => {
        const earned = earnedIds.has(def.id);
        const isRep = earned && repTitleId === def.id;
        let cls = 'profile-title-card';
        if (!earned) cls += ' is-locked';
        if (isRep) cls += ' is-rep';
        const rarityColor = RARITY_COLOR[def.rarity] || '#888';
        return `<button class="${cls}" data-title-id="${def.id}" data-earned="${earned}" type="button">` +
          `<span class="profile-title-emoji">${def.emoji}</span>` +
          `<span class="profile-title-name">${def.name}</span>` +
          `<span class="profile-title-rarity" style="color:${rarityColor}">${earned ? def.rarity : '???'}</span>` +
          `</button>`;
      }).join('');

      const repActionHtml = earnedIds.size
        ? `<div class="profile-title-action-row" id="profileTitleActionRow" data-user-id="${userId}" data-orig-rep-id="${repTitleId || ''}" style="display:none">` +
          `<button class="profile-title-change-btn" type="button">변경</button>` +
          `<button class="profile-title-cancel-btn" type="button">취소</button>` +
          `</div>`
        : '';

      const html = `<div class="profile-title-section" data-earned-count="${earnedIds.size}">` +
        `<div class="profile-title-header">🏷 칭호 <span class="profile-title-count">${earnedIds.size} / ${TITLE_DEFS.length}종</span>` +
        `<button class="profile-title-toggle-btn" type="button">전체 보기 ▾</button></div>` +
        `<div class="profile-title-body is-hidden">` +
        `${earnedIds.size === 0 ? '<p class="profile-title-empty">칭호를 획득하려면 업적을 달성해보세요 🏷</p>' : ''}` +
        `<div class="profile-title-grid">${cards}</div>` +
        `${repActionHtml}` +
        `</div></div>`;

      return { html, earnedIds };
    } catch (_) { return { html: '', earnedIds: new Set() }; }
  }

  // 대표 칭호 변경 핸들러
  async function handleRepTitleSelect(userId, titleId, origId, titleBody) {
    if (!userId || !titleId) return;
    // earned 방어: data-earned 속성 확인은 호출부에서 이미 처리됨
    const ok = await window.CottageDB?.setRepTitle?.(userId, titleId);
    if (ok === false) {
      console.warn('[CottageAchievements] 대표 칭호 저장 실패');
      titleBody.querySelectorAll('.profile-title-card').forEach(c => c.classList.remove('is-selected'));
      if (origId) titleBody.querySelector(`.profile-title-card[data-title-id="${origId}"]`)?.classList.add('is-selected');
    } else {
      titleBody.querySelectorAll('.profile-title-card').forEach(c => c.classList.remove('is-rep', 'is-selected'));
      if (titleId) titleBody.querySelector(`.profile-title-card[data-title-id="${titleId}"]`)?.classList.add('is-rep');
      const actionRow = titleBody.querySelector('#profileTitleActionRow');
      if (actionRow) { actionRow.style.display = 'none'; actionRow.dataset.origRepId = titleId || ''; }
      // 패널 상단 칭호 라인 즉시 갱신
      const titleDef = TITLE_DEFS.find(t => t.id === titleId);
      const panelTitleEl = document.querySelector('#profilePanel .profile-panel-title-name');
      if (panelTitleEl && titleDef) panelTitleEl.textContent = `${titleDef.emoji} ${titleDef.name}`;
    }
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

    return `<div class="profile-codex-section" data-played-count="${playedCount}" data-total-games="${totalGames}">
      <div class="profile-codex-header">
        🎲 게임 도감 <span class="profile-codex-summary">${playedCount} / ${totalGames}</span>
        <button class="profile-codex-toggle-btn" type="button">전체 보기 ▾</button>
      </div>
      <div class="profile-codex-body is-hidden">
        <div class="profile-codex-count">${playedCount} <span>/ ${totalGames}</span></div>
        <div class="profile-codex-bar-wrap"><div class="profile-codex-bar" style="width:${barWidth}%"></div></div>
        <div class="profile-codex-grade">${grade}</div>
        ${listHtml}
      </div>
    </div>`;
  }

  // 캐릭터/대표 캐릭터 섹션 HTML 빌드
  async function buildCharacterSection(userId) {
    const db = window.CottageDB;
    if (!db) return '';

    const [achievements, repAch] = await Promise.all([
      db.getUserAchievements(userId),
      db.getRepAchievement(userId),
    ]);

    const earnedIds = new Set(achievements.map(a => a.id));
    const earnedCount = earnedIds.size;

    // 17종 전체 그리드 — 획득: 컬러(is-rep=현재대표), 미획득: grayscale+disabled
    const gridCards = ACH_DEFS.map(def => {
      const done = earnedIds.has(def.id);
      const isRep = repAch?.id === def.id;
      const imgSrc = `/assets/images/characters/characters_basic/${def.id}.png`;
      let cls = 'profile-char-card';
      if (!done) cls += ' is-locked';
      if (isRep) cls += ' is-rep';
      const dataAttr = done ? ` data-ach-id="${def.id}"` : '';
      const disabledAttr = done ? '' : ' disabled';
      return `<button class="${cls}" title="${def.name}" type="button"${dataAttr}${disabledAttr}>` +
        `<img src="${imgSrc}" alt="${def.name}" ` +
        `onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'">` +
        `<span class="profile-char-emoji-fallback" style="display:none">${def.emoji}</span>` +
        `<span class="profile-char-card-name">${def.name}</span>` +
        `</button>`;
    }).join('');

    const repActionHtml = earnedCount
      ? `<div class="profile-rep-action-row" id="profileRepActionRow" data-user-id="${userId}" data-orig-rep-id="${repAch?.id || ''}" style="display:none">
          <button class="profile-rep-change-btn" type="button">변경</button>
          <button class="profile-rep-cancel-btn" type="button">취소</button>
        </div>`
      : '';

    const emptyHint = earnedCount === 0
      ? '<p class="profile-char-empty">게임을 플레이하면 캐릭터가 해금됩니다 🐾</p>'
      : '';

    const _repIconHtml = repAch?.id
      ? `<img class="profile-char-rep-icon" src="/assets/images/characters/characters_basic/${repAch.id}.png" alt="">`
      : '';
    return `<div class="profile-char-section" data-char-count="${earnedCount}">
      <div class="profile-char-header">🐾 내 캐릭터 ${_repIconHtml}<span class="profile-char-count">${earnedCount} / ${ACH_DEFS.length}종</span><button class="profile-char-toggle-btn" type="button">전체 보기 ▾</button></div>
      <div class="profile-char-body is-hidden">
        ${emptyHint}
        <div class="profile-char-grid">${gridCards}</div>
        ${repActionHtml}
      </div>
    </div>`;
  }

  // 업적 전체 목록 섹션 HTML 빌드 (UI 전용, checkAchievements 로직과 독립)
  async function buildAchievementsSection(userId) {
    const db = window.CottageDB;
    if (!db) return '';

    // ACH_DEFS는 IIFE 스코프에서 공유
    const TYPE_LABELS = { play: '플레이 기록', new_game: '신규 게임', photo: '사진 업로드', review: '별점 등록' };

    const [earned, playCount, distinctCount, photoCount, ratingCount] = await Promise.all([
      db.getUserAchievements(userId),
      db.getUserPlayCount(userId),
      db.getUserDistinctGameCount(userId),
      db.getUserPhotoCount(userId),
      db.getUserRatingCount(userId),
    ]);

    const earnedIds = new Set(earned.map(a => a.id));
    const COUNTS = { play: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount };

    const items = ACH_DEFS.map(def => {
      const done = earnedIds.has(def.id);
      const cur = Math.min(COUNTS[def.type] || 0, def.threshold);
      const imgSrc = `/assets/images/characters/characters_basic/${def.id}.png`;
      const typeLabel = TYPE_LABELS[def.type] || def.type;
      if (done) {
        return `<li class="profile-ach-item is-achieved">` +
          `<img class="profile-ach-img" src="${imgSrc}" alt="${def.name}" ` +
          `onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline'">` +
          `<span class="profile-ach-img-fallback" style="display:none">${def.emoji}</span>` +
          `<div class="profile-ach-info"><span class="profile-ach-name">${def.name}</span></div>` +
          `<span class="profile-ach-status is-done">✓ ${typeLabel} · ${cur}/${def.threshold}</span></li>`;
      }
      return `<li class="profile-ach-item is-locked">` +
        `<span class="profile-ach-img-lock">${def.emoji}</span>` +
        `<div class="profile-ach-info"><span class="profile-ach-name">${def.name}</span></div>` +
        `<span class="profile-ach-status">${typeLabel} · ${cur}/${def.threshold}</span></li>`;
    }).join('');

    return `<div class="profile-ach-section" data-ach-count="${earnedIds.size}">` +
      `<div class="profile-ach-header">` +
      `<span class="profile-ach-title">🏆 업적 <span class="profile-ach-count">${earnedIds.size} / ${ACH_DEFS.length}</span></span>` +
      `<button class="profile-ach-toggle-btn" type="button">전체 보기 ▾</button>` +
      `</div>` +
      `<ul class="profile-ach-list is-hidden">${items}</ul>` +
      `</div>`;
  }

  // 대표 캐릭터 변경 — 카드 클릭 UI에서 호출 (setRepAchievement 흐름 재사용)
  async function handleRepCardSelect(userId, achId, origId, charBody) {
    if (!userId) return;
    const ok = await window.CottageDB?.setRepAchievement(userId, achId || null);
    if (ok === false) {
      console.warn('[CottageAchievements] 대표 캐릭터 저장 실패');
      charBody.querySelectorAll('.profile-char-card').forEach(c => c.classList.remove('is-selected'));
      if (origId) charBody.querySelector(`.profile-char-card[data-ach-id="${origId}"]`)?.classList.add('is-selected');
    } else {
      // 성공: is-rep 이동, is-selected 제거, 변경/취소 버튼 숨김
      charBody.querySelectorAll('.profile-char-card').forEach(c => c.classList.remove('is-rep', 'is-selected'));
      if (achId) charBody.querySelector(`.profile-char-card[data-ach-id="${achId}"]`)?.classList.add('is-rep');
      const actionRow = charBody.querySelector('#profileRepActionRow');
      if (actionRow) { actionRow.style.display = 'none'; actionRow.dataset.origRepId = achId || ''; }
      // 패널 상단 아바타 갱신
      const panelAvatar = document.querySelector('#profilePanel .profile-panel-avatar');
      if (panelAvatar && achId) panelAvatar.src = `/assets/images/characters/characters_basic/${achId}.png`;
      // 메뉴 하단 프로필 이미지 즉시 갱신
      const menuAvatar = document.getElementById('kakaoProfileImg');
      if (menuAvatar && achId) menuAvatar.src = `/assets/images/characters/characters_basic/${achId}.png`;
    }
  }

  window.CottageAchievements = {
    checkAchievements,
    buildCodexSection,
    buildCharacterSection,
    buildAchievementsSection,
    handleRepCardSelect,
    buildTitleSection,
    handleRepTitleSelect,
    getTitleById: (id) => TITLE_DEFS.find(t => t.id === id) || null,
  };

  // supabase-client.js에서 호출하는 전역 함수
  window.checkAchievements = checkAchievements;
})();
