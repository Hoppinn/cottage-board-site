const KAKAO_APP_KEY = 'a1121194b54290671b9c1521c6cfe392';
const KAKAO_REST_KEY = '0e496d427628f9f9b239b106cb5313fa';
const KAKAO_USER_KEY = 'kakao_user';

const OWNER_KAKAO_ID = '4916417947';

if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
  Kakao.init(KAKAO_APP_KEY);
}

async function _updateNotifBadge() {
  const user = getKakaoUser();
  if (!user || !window.CottageDB?.getMyNotifications) return;
  const btn = document.getElementById('kakaoLoginBtn');
  if (!btn) return;
  const sess = window._cottageSess?.get(String(user.id)) || {};
  if (!sess.voucherNoticeSeen) {
    if (!btn.querySelector('.notif-badge')) {
      const b = document.createElement('span');
      b.className = 'notif-badge';
      btn.appendChild(b);
    }
    return;
  }
  const notifs = await window.CottageDB.getMyNotifications(String(user.id), user.nickname || null, sess.notifSeenAt || null, sess.newGameSeenAt || null);
  const existing = btn.querySelector('.notif-badge');
  if (notifs.some(n => n.isNew)) {
    if (!existing) {
      const b = document.createElement('span');
      b.className = 'notif-badge';
      btn.appendChild(b);
    }
  } else {
    existing?.remove();
  }
}

function _showVoucherGrantToast() {
  const user = getKakaoUser();
  if (user?.id && window._cottageSess) {
    const s = window._cottageSess.get(String(user.id));
    s.voucherNoticeSeen = true;
    window._cottageSess.set(String(user.id), s);
  }
  const existing = document.getElementById('voucherGrantToast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'voucherGrantToast';
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-toast-icon">🎫</div>
    <div class="achievement-toast-body">
      <div class="achievement-toast-title">음료교환권 지급!</div>
      <div class="achievement-toast-name">교환권 1장을 받았어요</div>
    </div>
    <a class="achievement-toast-link" href="#" onclick="event.preventDefault();document.querySelector('#kakaoLoginBtn')?.click()">내 보드 →</a>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
  setTimeout(_updateNotifBadge, 200);
}
window._onVoucherGranted = _showVoucherGrantToast;

function _restoreMenuExpanded() {
  setTimeout(() => {
    const menu = document.getElementById('mobileMenu');
    const loginBtn = document.getElementById('kakaoLoginBtn');
    if (menu) menu.classList.add('active');
    if (loginBtn) loginBtn.classList.add('is-expanded');
  }, 30);
}

function initKakaoAuth() {
  const saved = localStorage.getItem(KAKAO_USER_KEY);
  if (saved) {
    try {
      const user = JSON.parse(saved);
      updateLoginUI(user);
      if (window.CottageDB && user.id) {
        const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
        const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
        if (!isLocal) {
          const sess = window._cottageSess?.get(String(user.id)) || {};
          if (sess.lastVisitDate !== kstDate) {
            sess.visitCount = (sess.visitCount || 0) + 1;
            window._cottageSess.set(String(user.id), sess);
            window.CottageDB.upsertProfile(String(user.id), user.nickname || '손님', user.kakaoNickname || null, sess.visitCount).catch(() => {});
          }
        }
        window.CottageDB.startSession?.(String(user.id));
        // 다기기 프로필 동기화 — DB photo_url/nickname이 localStorage와 다르면 갱신
        window.CottageDB.getProfileSnapshot?.(String(user.id)).then(snap => {
          if (!snap) return;
          let changed = false;
          if (snap.photo_url && snap.photo_url !== user.profileImage) {
            user.profileImage = snap.photo_url;
            localStorage.setItem(`cottage_custom_photo_${user.id}`, snap.photo_url);
            changed = true;
          }
          if (snap.nickname && snap.nickname !== user.kakaoNickname && snap.nickname !== user.nickname) {
            user.nickname = snap.nickname;
            localStorage.setItem(`cottage_custom_nick_${user.id}`, snap.nickname);
            changed = true;
          }
          if (changed) {
            localStorage.setItem(KAKAO_USER_KEY, JSON.stringify(user));
            updateLoginUI(user);
          }
        }).catch(() => {});
        // 메뉴 프로필 이미지 → 대표 캐릭터로 교체 (squirrel_lv1이 기본값, rep 있으면 덮어씀)
        window.CottageDB.getRepAchievement?.(String(user.id)).then(rep => {
          if (rep?.id) {
            const img = document.getElementById('kakaoProfileImg');
            const _path = window.CottageAchievements?.getCharacterPath?.(rep.id);
            if (img && _path) img.src = _path;
          }
        }).catch(() => {});
      }
    } catch (e) {
      localStorage.removeItem(KAKAO_USER_KEY);
    }
  }

  const btn = document.getElementById('kakaoLoginBtn');
  if (btn) {
    const loginArea = btn.closest('.menu-login-area') || btn.parentElement;
    // 프로필 버튼 클릭 → 직접 내 보드 열기 (드롭다운 없앰)
    btn.addEventListener('click', () => {
      if (!getKakaoUser()) kakaoLogin();
      else openProfilePanel();
    });
    // 로그아웃 아이콘 버튼 삽입
    if (loginArea && !document.getElementById('kakaoLogoutIconBtn')) {
      const logoutIconBtn = document.createElement('button');
      logoutIconBtn.id = 'kakaoLogoutIconBtn';
      logoutIconBtn.className = 'header-logout-icon';
      logoutIconBtn.type = 'button';
      logoutIconBtn.setAttribute('aria-label', '로그아웃');
      logoutIconBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
      logoutIconBtn.addEventListener('click', e => { e.stopPropagation(); kakaoLogout(); });
      loginArea.appendChild(logoutIconBtn);
      if (getKakaoUser()) logoutIconBtn.classList.add('is-visible');
    }
  }

  // HTML 내 사진변경·닉네임변경 버튼 제거 (15개 파일 수정 대신 JS 처리)
  const userActions = document.getElementById('kakaoUserActions');
  if (userActions) {
    userActions.querySelector('#kakaoPhotoBtn')?.remove();
    userActions.querySelector('#kakaoNicknameBtn')?.remove();
    userActions.querySelector('#kakaoLogoutBtn')?.remove();
  }
  if (getKakaoUser()) setTimeout(_updateNotifBadge, 0);
}

function kakaoLogin() {
  sessionStorage.setItem('kakao_login_return', window.location.href);
  Kakao.Auth.authorize({
    redirectUri: window.location.origin + '/auth-callback.html',
    scope: 'profile_nickname,profile_image',
    throughTalk: false,
  });
}

function kakaoLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  localStorage.removeItem(KAKAO_USER_KEY);
  updateLoginUI(null);
}


async function promptNicknameChange() {
  const user = getKakaoUser();
  if (!user) return;
  const newNick = window.prompt('사용할 닉네임을 입력하세요 (2~10자)', user.nickname);
  if (newNick === null) return;
  const trimmed = newNick.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 10) {
    alert('닉네임은 2~10자로 입력해주세요.');
    return;
  }
  if (window.CottageDB?.checkNicknameAvailable) {
    const available = await window.CottageDB.checkNicknameAvailable(trimmed, user.id);
    if (!available) {
      alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
      return;
    }
  }
  user.nickname = trimmed;
  localStorage.setItem(`cottage_custom_nick_${user.id}`, trimmed);
  localStorage.setItem(KAKAO_USER_KEY, JSON.stringify(user));
  updateLoginUI(user);
  window.CottageDB?.upsertProfile(String(user.id), trimmed, user.kakaoNickname || null).catch(() => {});
}

function getKakaoUser() {
  const saved = localStorage.getItem(KAKAO_USER_KEY);
  if (!saved) return null;
  try {
    const user = JSON.parse(saved);
    if (user?.profileImage) user.profileImage = user.profileImage.replace(/^http:\/\//, 'https://');
    if (user?.kakaoProfileImage) user.kakaoProfileImage = user.kakaoProfileImage.replace(/^http:\/\//, 'https://');
    return user;
  } catch (e) {
    return null;
  }
}

function updateLoginUI(user) {
  const btn = document.getElementById('kakaoLoginBtn');
  const profileImg = document.getElementById('kakaoProfileImg');
  const loginText = document.getElementById('kakaoLoginText');
  const userActions = document.getElementById('kakaoUserActions');

  if (!btn) return;

  const logoutIconBtn = document.getElementById('kakaoLogoutIconBtn');
  if (user) {
    btn.classList.add('is-logged-in');
    if (profileImg) {
      profileImg.src = '/assets/images/characters/characters_basic/squirrel_lv1.png';
      profileImg.style.display = 'inline-block';
    }
    if (loginText) loginText.textContent = user.nickname;
    if (userActions) userActions.style.display = 'none';
    if (logoutIconBtn) logoutIconBtn.classList.add('is-visible');
  } else {
    btn.classList.remove('is-logged-in');
    if (profileImg) profileImg.style.display = 'none';
    if (loginText) loginText.textContent = '카카오 로그인';
    if (userActions) userActions.style.display = 'none';
    if (logoutIconBtn) logoutIconBtn.classList.remove('is-visible');
  }

  window.dispatchEvent(new CustomEvent('cottage-auth-changed', { detail: { user } }));
}

if (typeof window !== 'undefined') {
  window.getKakaoUser = getKakaoUser;
  window.kakaoLogin = kakaoLogin;
  window.kakaoLogout = kakaoLogout;
  window.promptNicknameChange = promptNicknameChange;

  window.isOwner = function () {
    if (!OWNER_KAKAO_ID) return false;
    const user = getKakaoUser();
    return !!user && String(user.id) === String(OWNER_KAKAO_ID);
  };
}

function _afterGrowthRender(subBody, expandChar = false, expandTitle = false) {
  const _charBody = subBody.querySelector('.profile-char-body');
  if (_charBody) {
    _charBody.querySelectorAll('.profile-char-card:not(.is-locked)').forEach(card => {
      card.addEventListener('click', () => {
        const achId = card.dataset.achId || '';
        const actionRow = _charBody.querySelector('#profileRepActionRow');
        const origRepId = actionRow?.dataset.origRepId || '';
        _charBody.querySelectorAll('.profile-char-card').forEach(c => c.classList.remove('is-selected'));
        if (achId !== origRepId) card.classList.add('is-selected');
        if (actionRow) actionRow.style.display = achId !== origRepId ? 'flex' : 'none';
      });
    });
    _charBody.querySelector('.profile-rep-change-btn')?.addEventListener('click', () => {
      const actionRow = _charBody.querySelector('#profileRepActionRow');
      const userId = actionRow?.dataset.userId || '';
      const origRepId = actionRow?.dataset.origRepId || '';
      const selectedCard = _charBody.querySelector('.profile-char-card.is-selected');
      const achId = selectedCard?.dataset.achId || '';
      if (achId && userId) window.CottageAchievements?.handleRepCardSelect(userId, achId, origRepId, _charBody);
    });
    _charBody.querySelector('.profile-rep-cancel-btn')?.addEventListener('click', () => {
      const actionRow = _charBody.querySelector('#profileRepActionRow');
      const origRepId = actionRow?.dataset.origRepId || '';
      _charBody.querySelectorAll('.profile-char-card').forEach(c => c.classList.remove('is-selected'));
      if (actionRow) actionRow.style.display = 'none';
    });
  }
  const charToggleBtn = subBody.querySelector('.profile-char-toggle-btn');
  if (charToggleBtn) {
    const charBody = subBody.querySelector('.profile-char-body');
    const charPreview = subBody.querySelector('.profile-char-preview');
    if (expandChar) {
      charBody?.classList.remove('is-hidden');
      charPreview?.classList.add('is-hidden');
      charToggleBtn.textContent = '접기 ▴';
      setTimeout(() => {
        const sec = subBody.querySelector('.profile-char-section');
        if (sec) subBody.scrollTop = sec.offsetTop;
      }, 50);
    }
    charToggleBtn.addEventListener('click', () => {
      const hidden = charBody.classList.toggle('is-hidden');
      if (charPreview) charPreview.classList.toggle('is-hidden', !hidden);
      charToggleBtn.textContent = hidden ? '전체보기 ▾' : '접기 ▴';
    });
    subBody.querySelectorAll('.profile-char-preview .profile-char-card').forEach(card => {
      card.addEventListener('click', () => {
        const achId = card.dataset.achId;
        if (!achId) return;
        charBody?.classList.remove('is-hidden');
        charPreview?.classList.add('is-hidden');
        charToggleBtn.textContent = '접기 ▴';
        charBody?.querySelector(`.profile-char-card[data-ach-id="${achId}"]`)?.click();
      });
    });
  }
  const _titleBody = subBody.querySelector('.profile-title-body');
  if (_titleBody) {
    _titleBody.querySelectorAll('.profile-title-card').forEach(card => {
      card.addEventListener('click', () => {
        const earned = card.dataset.earned === 'true';
        if (!earned) return;
        const titleId = card.dataset.titleId || '';
        const actionRow = _titleBody.querySelector('#profileTitleActionRow');
        const origRepId = actionRow?.dataset.origRepId || '';
        _titleBody.querySelectorAll('.profile-title-card').forEach(c => c.classList.remove('is-selected'));
        if (titleId !== origRepId) card.classList.add('is-selected');
        if (actionRow) actionRow.style.display = titleId !== origRepId ? 'flex' : 'none';
      });
    });
    _titleBody.querySelector('.profile-title-change-btn')?.addEventListener('click', () => {
      const actionRow = _titleBody.querySelector('#profileTitleActionRow');
      const userId = actionRow?.dataset.userId || '';
      const origRepId = actionRow?.dataset.origRepId || '';
      const selectedCard = _titleBody.querySelector('.profile-title-card.is-selected');
      if (selectedCard?.dataset.earned !== 'true') return;
      const titleId = selectedCard?.dataset.titleId || '';
      if (titleId && userId) window.CottageAchievements?.handleRepTitleSelect?.(userId, titleId, origRepId, _titleBody);
    });
    _titleBody.querySelector('.profile-title-cancel-btn')?.addEventListener('click', () => {
      const actionRow = _titleBody.querySelector('#profileTitleActionRow');
      const origRepId = actionRow?.dataset.origRepId || '';
      _titleBody.querySelectorAll('.profile-title-card').forEach(c => c.classList.remove('is-selected'));
      if (origRepId) _titleBody.querySelector(`.profile-title-card[data-title-id="${origRepId}"]`)?.classList.add('is-rep');
      if (actionRow) actionRow.style.display = 'none';
    });
  }
  const titleToggleBtn = subBody.querySelector('.profile-title-toggle-btn');
  if (titleToggleBtn) {
    const titleBody = subBody.querySelector('.profile-title-body');
    const titlePreview = subBody.querySelector('.profile-title-preview');
    if (expandTitle) {
      titleBody?.classList.remove('is-hidden');
      titlePreview?.classList.add('is-hidden');
      titleToggleBtn.textContent = '접기 ▴';
      setTimeout(() => {
        const sec = subBody.querySelector('.profile-title-section');
        if (sec) subBody.scrollTop = sec.offsetTop;
      }, 50);
    }
    titleToggleBtn.addEventListener('click', () => {
      const hidden = titleBody.classList.toggle('is-hidden');
      if (titlePreview) titlePreview.classList.toggle('is-hidden', !hidden);
      titleToggleBtn.textContent = hidden ? '전체보기 ▾' : '접기 ▴';
    });
    subBody.querySelectorAll('.profile-title-preview .profile-title-card').forEach(card => {
      card.addEventListener('click', () => {
        const titleId = card.dataset.titleId;
        if (!titleId) return;
        titleBody?.classList.remove('is-hidden');
        titlePreview?.classList.add('is-hidden');
        titleToggleBtn.textContent = '접기 ▴';
        titleBody?.querySelector(`.profile-title-card[data-title-id="${titleId}"]`)?.click();
      });
    });
  }
  const codexToggleBtn = subBody.querySelector('.profile-codex-toggle-btn');
  if (codexToggleBtn) {
    codexToggleBtn.addEventListener('click', () => {
      const codexBody = subBody.querySelector('.profile-codex-body');
      const hidden = codexBody.classList.toggle('is-hidden');
      codexToggleBtn.textContent = hidden ? '전체 보기 ▾' : '접기 ▴';
    });
  }
  const achToggleBtn = subBody.querySelector('.profile-ach-toggle-btn');
  if (achToggleBtn) {
    achToggleBtn.addEventListener('click', () => {
      const list = subBody.querySelector('.profile-ach-list');
      const hidden = list.classList.toggle('is-hidden');
      achToggleBtn.textContent = hidden ? '전체보기 ▾' : '접기 ▴';
    });
  }
  subBody.querySelectorAll('.profile-codex-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.previousElementSibling;
      const isHidden = wrap.classList.toggle('is-hidden');
      btn.textContent = isHidden
        ? `전체 보기 (${wrap.querySelectorAll('li').length}개 더) ▾`
        : '접기 ▴';
    });
  });
  subBody.querySelectorAll('.profile-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.profile-more-btn-wrap')?.previousElementSibling;
      if (!wrap) return;
      const isHidden = wrap.classList.toggle('is-hidden');
      btn.textContent = isHidden ? `더 보기 (${btn.dataset.moreCount}건 더)` : '접기';
    });
  });
}

function _buildVoucherInner(bal, prods, hist, isDevMode) {
  const fmtDt = iso => {
    const d = new Date(iso);
    return `${d.getMonth()+1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const VOUCHER_EMOJI = { '음료': '🥤', '생수': '💧', '곤약젤리': '🍮', '스니커즈': '🍫', '참크래커': '🍘', '예감': '🥨', '홈런볼': '⚾', '버터와플': '🧇', '카스타드': '🧁', '촉촉한초코칩': '🍪' };
  const VOUCHER_DISPLAY_NAME = { '생수': '생수 2개', '곤약젤리': '곤약젤리 2개' };
  const productHtml = prods.map(p => {
    const dis = bal < p.cost ? ' disabled' : '';
    const emoji = VOUCHER_EMOJI[p.name] || '';
    const dispName = VOUCHER_DISPLAY_NAME[p.name] || p.name;
    return `<li class="profile-voucher-product"><span class="profile-voucher-pname">${emoji} ${escH(dispName)}</span><span class="profile-voucher-pcost"> · ${p.cost}장</span><button class="profile-voucher-use-btn" data-product-id="${p.id}" data-product-name="${escH(dispName)}" data-cost="${p.cost}"${dis} type="button">사용하기</button></li>`;
  }).join('');
  const histHtml = hist.slice(0, 5).map((h, i, arr) => {
    const isGrant = h.delta > 0;
    const label = isGrant
      ? (h.reason === 'first_play' ? '첫 기록 보상' : h.reason === 'dev_test' ? '테스트 지급 [DEV]' : '지급')
      : escH(h.voucher_products?.name || '사용');
    const balAfter = bal - arr.slice(0, i).reduce((s, e) => s + e.delta, 0);
    return `<li class="profile-voucher-hist-item${isGrant?' profile-voucher-hist-grant':' profile-voucher-hist-redeem'}"><span class="profile-voucher-hist-prefix">${isGrant?'+':'-'}</span> ${label} <span class="profile-voucher-hist-dt">${fmtDt(h.created_at)}</span><span class="profile-voucher-hist-bal">→ ${balAfter}장</span></li>`;
  }).join('');
  const devBtnHtml = isDevMode ? `<button class="profile-voucher-dev-btn" type="button">🔧 테스트 교환권 지급 [DEV]</button>` : '';
  return `${prods.length ? `<ul class="profile-voucher-product-list">${productHtml}</ul><p class="profile-voucher-note">냉장고에서 직접 꺼내주세요 🧊</p>` : ''}${histHtml ? `<ul class="profile-voucher-hist-list">${histHtml}</ul>` : ''}${devBtnHtml}`;
}

function _buildGameListHtml(gameIds, emptyMsg) {
  if (!gameIds.length) return `<p class="profile-gamelist-empty">${emptyMsg}</p>`;
  const PREV_GAME = 3;
  const allItems = gameIds.map(id => {
    const g = window.gameData?.[id];
    const name = g?.display || g?.titleKo || g?.titleEn || id;
    const thumb = g?.images?.thumbnail || '';
    return `<li class="profile-gamelist-item" data-game-key="${escH(id)}">
        ${thumb ? `<img src="${escH(thumb)}" class="profile-gamelist-thumb" alt="">` : '<span class="profile-gamelist-thumb-empty"></span>'}
        <span class="profile-gamelist-name">${escH(name)}</span>
      </li>`;
  });
  const hasMore = allItems.length > PREV_GAME;
  return `<ul class="profile-gamelist">${allItems.slice(0, PREV_GAME).join('')}${hasMore ? `<div class="profile-more-wrap is-hidden">${allItems.slice(PREV_GAME).join('')}</div><li class="profile-more-btn-wrap"><button class="profile-more-btn" data-more-count="${allItems.length - PREV_GAME}" type="button">더 보기 (${allItems.length - PREV_GAME}개 더)</button></li>` : ''}</ul>`;
}

function _bindActivityTogglesAndMore(subBody) {
  subBody.querySelectorAll('.profile-activity-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.nextElementSibling;
      const arrow = btn.querySelector('.profile-toggle-arrow');
      const collapsed = list.classList.toggle('is-collapsed');
      arrow.textContent = collapsed ? '▾' : '▴';
    });
  });
  subBody.querySelectorAll('.profile-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.profile-activity-list').querySelector('.profile-more-wrap');
      const isHidden = wrap.classList.toggle('is-hidden');
      btn.textContent = isHidden
        ? `더 보기 (${wrap.querySelectorAll('li').length}건 더)`
        : '접기';
    });
  });
}

async function openProfilePanel() {
  const user = getKakaoUser();
  if (!user) return;

  const existing = document.getElementById('profilePanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'profilePanel';
  panel.className = 'profile-panel';
  const isOwnerUser = String(user.id) === String(OWNER_KAKAO_ID);
  const isDevMode = location.hostname === 'localhost' || isOwnerUser;
  const adminOrigin = window.location.origin;
  panel.innerHTML = `<div class="profile-panel-box">
    <div class="profile-panel-header">
      <span class="profile-panel-title">내 보드</span>
      <button class="profile-panel-close" type="button">✕</button>
    </div>
    <div class="profile-panel-body">
      <p class="profile-panel-loading">불러오는 중...</p>
    </div>
  </div>`;
  document.body.appendChild(panel);
  window.CottageDB?.trackPageView('my-board');
  panel.querySelector('.profile-panel-close').addEventListener('click', () => { document.getElementById('profileSubSheet')?.remove(); panel.remove(); _restoreMenuExpanded(); });
  panel.addEventListener('click', e => { if (e.target === panel) { document.getElementById('profileSubSheet')?.remove(); panel.remove(); _restoreMenuExpanded(); } });

  if (!window.CottageDB?.getMyStats) return;
  const _sessForNotif = window._cottageSess?.get(String(user.id)) || {};
  const [stats, notifs, codexHtml, userStats, voucherBalance, voucherProducts, voucherHistory, likedGameIds, curiousGameIds] = await Promise.all([
    window.CottageDB.getMyStats(String(user.id), user.nickname || null),
    window.CottageDB.getMyNotifications?.(String(user.id), user.nickname || null, _sessForNotif.notifSeenAt || null, _sessForNotif.newGameSeenAt || null) || Promise.resolve([]),
    (window.CottageAchievements?.buildCodexSection(String(user.id)) || Promise.resolve('')).catch(() => ''),
    (window.CottageAchievements?.fetchUserStats?.(String(user.id), user.nickname || null) || Promise.resolve(null)).catch(() => null),
    (window.CottageDB?.getVoucherBalance?.(String(user.id)) || Promise.resolve(0)).catch(() => 0),
    (window.CottageDB?.getVoucherProducts?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getVoucherHistory?.(String(user.id), 5) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getUserLikedGames?.(String(user.id)) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getUserCuriousGames?.(String(user.id)) || Promise.resolve([])).catch(() => []),
  ]);
  // 칭호/캐릭터/업적 섹션: rep_title_id + visit_count 확정 후, fetchUserStats 결과 공유 → DB 재조회 없음
  const _repTitleId = stats?.profile?.rep_title_id || null;
  const _visitCount = stats?.profile?.visit_count || 0;
  const [charHtml, achHtml, _titleResult] = await Promise.all([
    (window.CottageAchievements?.buildCharacterSection(String(user.id), user.nickname || null, userStats) || Promise.resolve('')).catch(() => ''),
    (window.CottageAchievements?.buildAchievementsSection(String(user.id), user.nickname || null, userStats) || Promise.resolve('')).catch(() => ''),
    (window.CottageAchievements?.buildTitleSection?.(String(user.id), _repTitleId, _visitCount, user.nickname || null, userStats) || Promise.resolve({ html: '', earnedIds: new Set() })).catch(() => ({ html: '', earnedIds: new Set() })),
  ]);
  const titleHtml = _titleResult?.html || '';
  const _earnedTitleIds = _titleResult?.earnedIds || new Set();
  // seen 처리는 알림 섹션을 펼칠 때로 이동 (아래 toggle 핸들러)
  const fmt = iso => iso ? new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const fmtShort = iso => iso ? new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '';

  function getGameName(gameId) {
    if (window.gameData?.[gameId]) {
      const g = window.gameData[gameId];
      return g.display || g.titleKo || g.titleEn || gameId;
    }
    if (window.COTTAGE_GAMES) {
      const g = window.COTTAGE_GAMES.find(g => String(g.bggId) === String(gameId));
      if (g) return g.display || g.titleKo || g.titleEn || gameId;
    }
    return gameId;
  }

  const PREVIEW = 5;

  function buildActivityList(items, renderFn) {
    const preview = items.slice(0, PREVIEW).map(renderFn).join('');
    const rest = items.slice(PREVIEW).map(renderFn).join('');
    const hasMore = items.length > PREVIEW;
    return `<ul class="profile-activity-list is-collapsed">
      ${preview}
      ${hasMore ? `<div class="profile-more-wrap is-hidden">${rest}</div>
        <li class="profile-more-btn-wrap">
          <button class="profile-more-btn" type="button">더 보기 (${items.length - PREVIEW}건 더)</button>
        </li>` : ''}
    </ul>`;
  }

  // game_id별 날짜순 누적 플레이 순서 계산 (표시용)
  const _playOrderMap = new Map();
  {
    const _cnt = {};
    [...stats.plays]
      .sort((a, b) => {
        const da = a.played_at || (a.created_at || '').slice(0, 10);
        const db = b.played_at || (b.created_at || '').slice(0, 10);
        return da < db ? -1 : da > db ? 1 : 0;
      })
      .forEach(r => {
        if (!r.game_id) return;
        _cnt[r.game_id] = (_cnt[r.game_id] || 0) + 1;
        _playOrderMap.set(r.id, _cnt[r.game_id]);
      });
  }
  const playListHtml = buildActivityList(stats.plays, r => {
    const date = r.played_at || (r.created_at||'').slice(0,10);
    const pn = _playOrderMap.get(r.id);
    const pLabel = pn >= 2 ? ` <span class="pr-play-order">(${pn}번째 플레이)</span>` : '';
    return `<li class="profile-activity-item" data-game-id="${escH(String(r.game_id || ''))}">${escH(getGameName(r.game_id))}${pLabel} <span>${fmtShort(date)}</span></li>`;
  });

  const commentListHtml = buildActivityList(stats.comments, r =>
    `<li class="profile-activity-item" data-game-id="${escH(String(r.game_id || ''))}">${escH(getGameName(r.game_id))} <span>${fmtShort(r.created_at)}</span></li>`
  );

  const voucherSeen = !!_sessForNotif.voucherNoticeSeen;
  const VOUCHER_NOTICE_DATE = '2026-06-16';
  const _voucherDateLabel = fmtShort(VOUCHER_NOTICE_DATE);
  const voucherCardHtml = `<div class="notif-reward-card${voucherSeen ? ' is-seen' : ' is-new'}">
    <div class="notif-reward-row">
      <div class="notif-reward-icon-col">🎫</div>
      <div class="notif-reward-body">
        <div class="notif-reward-title">첫 기록 보상 도착 ${voucherSeen ? '' : '<span class="profile-notif-new-badge" style="color:#fff">NEW</span>'}</div>
        <div class="notif-reward-desc">첫 플레이기록을 남기면 음료교환권 1장을 받을 수 있어요</div>
        <div class="notif-card-date">${escH(_voucherDateLabel)}</div>
      </div>
    </div>
    <div class="notif-reward-actions">
      <a class="notif-reward-btn profile-voucher-link${voucherSeen ? ' is-seen' : ''}" href="/pages/game/game-reviews.html">게임 기록하기</a>
      ${voucherSeen ? '' : '<button class="profile-voucher-confirm" type="button">확인했어요</button>'}
    </div>
  </div>`;
  const _newCount = notifs.filter(n => n.isNew).length + (!voucherSeen ? 1 : 0);
  function _getGameKeyById(gameId) {
    if (!gameId || !window.gameData) return null;
    if (window.gameData[gameId]) return gameId;
    const entry = Object.entries(window.gameData).find(([, g]) => String(g.bgg?.id) === String(gameId));
    return entry ? entry[0] : null;
  }
  function _getGameKeyByName(name) {
    if (!name || !window.COTTAGE_GAMES || !window.gameData) return null;
    const found = window.COTTAGE_GAMES.find(g =>
      (g.display || g.titleKo || g.titleEn || '').trim() === name.trim()
    );
    if (!found) return null;
    return _getGameKeyById(String(found.bggId));
  }

  function _renderNotifItem(n) {
    const cls = ['notif-card', 'is-clickable', n.isNew ? 'is-new' : ''].filter(Boolean).join(' ');
    const badge = n.isNew ? '<span class="profile-notif-new-badge" style="color:#fff">NEW</span>' : '';
    const dt = `<div class="notif-card-date">${fmtShort(n.date)}</div>`;
    const _card = (icon, title, desc) =>
      `<div class="notif-card-icon">${icon}</div><div class="notif-card-body"><div class="notif-card-title">${title} ${badge}</div><div class="notif-card-desc">${desc}</div>${dt}</div>`;
    if (n.type === 'tagged')
      return `<li class="${cls}" data-game-id="${escH(String(n.gameId))}">${_card('🎲', escH(getGameName(n.gameId)) + ' 기록 태그', '새 기록에 내 닉네임이 태그됐어요')}</li>`;
    if (n.type === 'curious_comment')
      return `<li class="${cls}" data-game-key="${escH(String(n.gameKey))}">${_card('🤔', escH(getGameName(n.gameKey)) + ' 새 코멘트', '궁금해요 게임에 코멘트가 달렸어요')}</li>`;
    if (n.type === 'ordered')
      return `<li class="${cls}" data-game-name="${escH(String(n.gameName))}">${_card('🛒', escH(n.gameName) + ' 주문 완료', '게임 요청이 접수/주문되었습니다')}</li>`;
    if (n.type === 'new_game') {
      const games = n.actualGames?.length ? n.actualGames : [n.gameName].filter(Boolean);
      if (games.length === 1) {
        return `<li class="${cls}" data-game-name="${escH(games[0])}">${_card('📦', escH(games[0]) + ' 입고', '새 게임이 추가됐어요')}</li>`;
      }
      const gameLinks = games.map(g => `<span class="notif-game-link" data-game-name="${escH(g)}">${escH(g)}</span>`).join(', ');
      return `<li class="${cls}">${_card('📦', gameLinks + ' 입고', '새 게임이 추가됐어요')}</li>`;
    }
    return '';
  }
  const _hasAnyNew = _newCount > 0;
  const _allNotifItems = notifs.slice(0, 8).map(_renderNotifItem).join('');
  const _notifMore = notifs.length > 8 ? `<li class="profile-notif-more">외 ${notifs.length - 8}건 더 있어요</li>` : '';
  const _notifHelpHtml = notifs.length === 0
    ? `<div class="notif-help">새 알림이 없으면 여기에서 보상, 게임 요청, 업적 달성 소식을 확인할 수 있어요.</div>`
    : '';
  const _notifInnerHtml = `<div class="notif-list-header">${_hasAnyNew ? '<button class="profile-notif-confirm-all" type="button">모두 읽기</button>' : ''}</div>${voucherCardHtml}<ul class="profile-notif-list">${_allNotifItems}${_notifMore}</ul>${_notifHelpHtml}`;

  const voucherHtml = `<div class="profile-voucher-section"><button class="profile-voucher-toggle" type="button"><span class="profile-voucher-header">🎫 음료교환권 <span class="profile-voucher-bal-label">${voucherBalance}장 보유</span></span><span class="profile-toggle-arrow">▾</span></button><div id="profileVoucherInner" class="is-collapsed">${_buildVoucherInner(voucherBalance, voucherProducts, voucherHistory, isDevMode)}</div></div>`;

  const body = panel.querySelector('.profile-panel-body');
  const sessData = window._cottageSess?.get(String(user.id)) || {};

  // 통계 요약줄 계산
  const _statsSavedSecs = stats.profile?.total_minutes || 0;
  const _statsLocalSecs = sessData.timeSec || 0;
  const _statsSessionSecs = window._cottageSessionStart
    ? Math.floor((Date.now() - window._cottageSessionStart) / 1000) : 0;
  const _statsTotalSecs = _statsSavedSecs + _statsLocalSecs + _statsSessionSecs;
  const _statsFmt = s => s >= 3600
    ? Math.floor(s/3600)+'시간 '+Math.floor((s%3600)/60)+'분'
    : s >= 60 ? Math.floor(s/60)+'분' : s+'초';
  const _statsVc = Math.max(sessData.visitCount||0, stats.profile?.visit_count||0);
  const _summaryParts = [
    _statsTotalSecs > 0 ? _statsFmt(_statsTotalSecs) : null,
    _statsVc > 0 ? `${_statsVc}일 방문` : null,
    stats.plays.length > 0 ? `${stats.plays.length}기록` : null,
  ].filter(Boolean);
  const _statsSummary = _summaryParts.length ? _summaryParts.join(' · ') : '활동 없음';

  // 그룹 요약용 카운트 추출 — regex 실패 시 0 fallback
  function _safeInt(html, pattern, fallback) {
    try { const m = html.match(pattern); return m ? parseInt(m[1], 10) : fallback; } catch(e) { return fallback; }
  }
  const _charCount   = _safeInt(charHtml,  /data-char-count="(\d+)"/,    0);
  const _charTotal   = _safeInt(charHtml,  /data-char-total="(\d+)"/,    47);
  const _titleCount  = _safeInt(titleHtml, /data-earned-count="(\d+)"/,  0);
  const _titleTotal  = _safeInt(titleHtml, /data-title-total="(\d+)"/,   33);
  const _codexPlayed = _safeInt(codexHtml, /data-played-count="(\d+)"/, 0);
  const _codexTotal  = _safeInt(codexHtml, /data-total-games="(\d+)"/,  641);
  const _achCount    = _safeInt(achHtml,   /data-ach-count="(\d+)"/,    0);
  const _achTotal    = _safeInt(achHtml,   /data-ach-total="(\d+)"/,    96);

  const _growthSummary = `캐릭터 ${_charCount}/${_charTotal} · 도감 ${_codexPlayed}/${_codexTotal} · 업적 ${_achCount}/${_achTotal}`;
  const _growthBadge = `<div class="profile-growth-badge">🌱 캐릭터 ${_charCount}/${_charTotal} · 칭호 ${_titleCount}/${_titleTotal} · 업적 ${_achCount}/${_achTotal} · 도감 ${_codexPlayed}/${_codexTotal}</div>`;

  const _actParts = [
    `교환권 ${voucherBalance}장`,
    _statsTotalSecs > 0 ? _statsFmt(_statsTotalSecs) : null,
    _statsVc > 0 ? `${_statsVc}회 방문` : null,
    stats.plays.length > 0 ? `플레이 ${stats.plays.length}건` : null,
  ].filter(Boolean);
  const _actSummary = _actParts.join(' · ');

  // 통계 상세 목록 HTML
  const _statsListHtml = (() => {
    const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const dbTodaySecs = stats.profile?.today_date === todayKst ? (stats.profile?.today_seconds || 0) : 0;
    const localSecs = sessData.timeSec || 0;
    const sessionSecs = window._cottageSessionStart
      ? Math.floor((Date.now() - window._cottageSessionStart) / 1000) : 0;
    const todaySecs = dbTodaySecs + localSecs + sessionSecs;
    const fmtT = s => s >= 3600
      ? Math.floor(s/3600)+'시간 '+Math.floor((s%3600)/60)+'분'
      : s >= 60 ? Math.floor(s/60)+'분' : s+'초';
    const prevDt = sessData.prevSeenDt;
    let prevRel = '';
    if (prevDt) {
      const diffMs = Date.now() - new Date(prevDt).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      if (diffMin < 1)        prevRel = '방금 전';
      else if (diffMin < 60)  prevRel = `${diffMin}분 전`;
      else if (diffHour < 24) prevRel = `${diffHour}시간 전`;
      else if (diffDay <= 14) prevRel = `${diffDay}일 전`;
      else prevRel = new Date(prevDt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    }
    return [
      `<li><span>총 이용시간</span><strong>${_statsFmt(_statsTotalSecs)}</strong></li>`,
      _statsVc ? `<li><span>방문 일수</span><strong>${_statsVc}일</strong></li>` : '',
      stats.plays.length ? `<li><span>플레이 기록</span><strong>${stats.plays.length}건</strong></li>` : '',
      stats.moimCount ? `<li><span>모임 참여</span><strong>${stats.moimCount}회</strong></li>` : '',
      stats.comments.length ? `<li><span>코멘트</span><strong>${stats.comments.length}건</strong></li>` : '',
      stats.suggestions ? `<li><span>건의하기</span><strong>${stats.suggestions}건</strong></li>` : '',
      '<li class="profile-stats-divider"></li>',
      todaySecs > 0 ? `<li><span>오늘 이용시간</span><strong>${fmtT(todaySecs)}</strong></li>` : '',
      prevDt ? `<li><span>이전 방문</span><strong>${prevRel}</strong></li>` : '',
      '<li class="profile-stats-divider"></li>',
      `<li><span>가입일</span><strong>${fmt(stats.profile?.first_seen_at)}</strong></li>`,
      `<li><span>상태</span><strong style="color:#4caf50">● 접속중</strong></li>`,
    ].join('');
  })();

  // ── 서브시트 콘텐츠 변수 ──────────────────────────────────────
  // 성장 보드: 업적 → 캐릭터 → 칭호 → 게임 도감 순
  const _growthInnerHtml = `${achHtml}${charHtml}${titleHtml}${codexHtml}`;
  // 음료교환권: voucherHtml 단독
  const _voucherInnerHtml = voucherHtml;
  // 취향 보드: 좋아하는 + 해보고싶은 합산 (기본 열림 토글)
  const _tasteInnerHtml = `
    <div class="profile-gamelist-section">
      <button class="profile-gamelist-section-toggle" type="button">❤️ 좋아하는 게임 <span class="profile-activity-count">${likedGameIds.length}개</span><span class="profile-toggle-arrow">▴</span></button>
      <div class="profile-gamelist-body">${_buildGameListHtml(likedGameIds, '게임 페이지에서 ❤️를 눌러 추가해보세요')}</div>
    </div>
    <div class="profile-gamelist-section">
      <button class="profile-gamelist-section-toggle" type="button">👀 해보고 싶은 게임 <span class="profile-activity-count">${curiousGameIds.length}개</span><span class="profile-toggle-arrow">▴</span></button>
      <div class="profile-gamelist-body">${_buildGameListHtml(curiousGameIds, '게임 페이지에서 👀를 눌러 추가해보세요')}</div>
    </div>`;
  // 기록 보드: 플레이기록/게임평/사진 3섹션 토글 (항상 표시, 기본 열림)
  const _openActivityList = html => html.replace('class="profile-activity-list is-collapsed"', 'class="profile-activity-list"');
  const _emptyList = msg => `<ul class="profile-activity-list"><li class="profile-gamelist-empty">${msg}</li></ul>`;
  const _recordInnerHtml = `
    <div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">🎲 플레이 기록 <span class="profile-activity-count">${stats.plays.length}건</span><span class="profile-toggle-arrow">▴</span></button>
      ${stats.plays.length ? _openActivityList(playListHtml) : _emptyList('아직 플레이 기록이 없어요')}
    </div>
    <div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">💬 게임평 <span class="profile-activity-count">${stats.comments.length}개</span><span class="profile-toggle-arrow">▴</span></button>
      ${stats.comments.length ? _openActivityList(commentListHtml) : _emptyList('아직 게임평이 없어요')}
    </div>
    <div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">📸 사진 <span class="profile-activity-count">${userStats?.photoCount || 0}장</span><span class="profile-toggle-arrow">▴</span></button>
      ${_emptyList('사진 목록은 기록 페이지에서 확인할 수 있어요')}
    </div>`;
  // 함께한 시간: 통계 + 코멘트한 게임 (플레이 기록은 기록 보드로 이동)
  const _usageInnerHtml = `
    <div class="profile-stats-wrap">
      <button class="profile-stats-toggle" type="button">📊 ${escH(_statsSummary)}<span class="profile-toggle-arrow">▾</span></button>
      <ul class="profile-panel-stats is-collapsed">${_statsListHtml}</ul>
    </div>
    ${stats.comments.length ? `<div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">💬 코멘트한 게임 <span class="profile-activity-count">${stats.comments.length}건</span><span class="profile-toggle-arrow">▾</span></button>
      ${commentListHtml}
    </div>` : ''}`;
  // 카드 요약
  const _voucherCardSummary = `${voucherBalance}장 보유`;
  const _tasteCardSummary = `❤️ 좋아요 ${likedGameIds.length}개\n👀 관심게임 ${curiousGameIds.length}개`;
  const _recordCardSummary = `플레이 기록 ${stats.plays.length}건\n게임평 ${stats.reviewCount}개\n사진 ${userStats?.photoCount || 0}장`;
  const _usageCardSummary = _statsSummary;

  // ── 메인 패널: 프로필 영역 + 4축 레이아웃 ──────────────────
  const _repCharPath = userStats?.repAch?.id
    ? (window.CottageAchievements?.getCharacterPath?.(userStats.repAch.id) || null)
    : null;
  const _repName = userStats?.repAch?.id
    ? (window.CottageAchievements?.getCharacterName?.(userStats.repAch.id) || null)
    : null;
  const _repImgHtml = `<div class="profile-panel-avatar-wrap">${
    _repCharPath
      ? `<img class="profile-panel-avatar" src="${_repCharPath}" alt="${escH(_repName || '')}">`
      : `<div class="profile-panel-avatar profile-panel-avatar--empty">🐾</div>`
  }<span class="profile-panel-avatar-edit">⚙</span></div>`;
  const _repLabel = _repName ? escH(_repName) : '대표 캐릭터 없음';
  const _repBtnLabel = userStats?.repAch?.id ? '대표 캐릭터 변경' : '대표 캐릭터 설정하기';
  // 대표 칭호: earned 검증 후 표시 (SQL 미실행/미획득 시 null)
  const _validRepTitle = (_repTitleId && _earnedTitleIds.has(_repTitleId))
    ? (window.CottageAchievements?.getTitleById?.(_repTitleId) || null)
    : null;
  const _titleLineHtml = _validRepTitle
    ? `<span class="profile-panel-title-name">${_validRepTitle.emoji} ${escH(_validRepTitle.name)}</span>`
    : `<span class="profile-panel-title-name is-empty">칭호 없음</span>`;
  const _titleBtnLabel = _validRepTitle ? '대표 칭호 변경' : '대표 칭호 설정하기';

  // 코티지 최초 기록 + 플레이 참여 업적 lazy check (프로필 열릴 때마다 백그라운드 확인)
  window.CottageDB?.getUserFirstRecordCount?.(String(user.id)).then(frc => {
    window.checkAchievements?.('first_record', String(user.id), { firstRecordCount: frc });
  }).catch(() => {});
  if (user.nickname) {
    window.CottageDB?.getUserParticipationCount?.(String(user.id), user.nickname).then(pc => {
      window.checkAchievements?.('play', String(user.id), { participationCount: pc });
    }).catch(() => {});
  }

  body.innerHTML = `
    <div class="profile-panel-profile">
      ${_repImgHtml}
      <div class="profile-panel-profile-info">
        <div class="profile-panel-nick-row">
          <button class="profile-panel-nick" type="button">${escH(user.nickname || '손님')} <span class="profile-nick-edit">✏️</span></button>
          ${_newCount > 0 ? `<button class="profile-panel-notif-btn" data-subsheet="notif" type="button"><span class="notif-red-dot"></span>🔔 새 알림 ${_newCount}건</button>` : ''}
        </div>
        <span class="profile-panel-rep-name">${_repLabel}</span>
        <button class="profile-panel-title-name${_validRepTitle ? '' : ' is-empty'}" type="button">${_validRepTitle ? `${_validRepTitle.emoji} ${escH(_validRepTitle.name)} <span class="profile-title-edit">⚙</span>` : '칭호 없음 <span class="profile-title-edit">⚙</span>'}</button>
        ${_growthBadge}
      </div>
    </div>
    <div class="profile-card-grid">
      <button class="profile-card" data-subsheet="growth" type="button">
        <span class="profile-card-icon">🌱</span>
        <span class="profile-card-label">수집 보드</span>
        <span class="profile-card-summary">${escH(_growthSummary)}</span>
      </button>
      <button class="profile-card" data-subsheet="taste" type="button">
        <span class="profile-card-icon">❤️</span>
        <span class="profile-card-label">취향 보드</span>
        <span class="profile-card-summary">${escH(_tasteCardSummary)}</span>
      </button>
      <button class="profile-card" data-subsheet="records" type="button">
        <span class="profile-card-icon">📝</span>
        <span class="profile-card-label">기록 보드</span>
        <span class="profile-card-summary">${escH(_recordCardSummary)}</span>
      </button>
      <button class="profile-card" data-subsheet="voucher" type="button">
        <span class="profile-card-icon">🎫</span>
        <span class="profile-card-label">음료교환권</span>
        <span class="profile-card-summary">${escH(_voucherCardSummary)}</span>
      </button>
    </div>
    <button class="profile-card profile-card--notif" data-subsheet="usage" type="button">
      <span class="profile-card-icon">📊</span>
      <div class="profile-card-usage-info">
        <span class="profile-card-label">함께한 시간</span>
        ${_summaryParts.length ? `<span class="profile-card-usage-detail">${escH(_statsSummary)}</span>` : ''}
      </div>
      <span class="profile-card-arrow">›</span>
    </button>
    ${isOwnerUser ? `<a href="${adminOrigin}/pages/admin/requests-admin.html" class="profile-admin-link">🔧 관리자 페이지</a>` : ''}`;

  // ── 서브시트 헬퍼 ──────────────────────────────────────────────
  function _openSubSheet(title, contentHtml, afterRender) {
    document.getElementById('profileSubSheet')?.remove();
    const sub = document.createElement('div');
    sub.id = 'profileSubSheet';
    sub.className = 'profile-subsheet';
    sub.innerHTML = `
      <div class="profile-subsheet-box">
        <div class="profile-subsheet-header">
          <button class="profile-subsheet-back" type="button">‹ 내 보드</button>
          <span class="profile-subsheet-title">${title}</span>
          <button class="profile-subsheet-close" type="button">✕</button>
        </div>
        <div class="profile-subsheet-body">${contentHtml}</div>
      </div>`;
    document.body.appendChild(sub);
    sub.querySelector('.profile-subsheet-back').addEventListener('click', () => sub.remove());
    sub.querySelector('.profile-subsheet-close').addEventListener('click', () => { sub.remove(); panel.remove(); _restoreMenuExpanded(); });
    sub.addEventListener('click', e => { if (e.target === sub) sub.remove(); });
    if (afterRender) afterRender(sub.querySelector('.profile-subsheet-body'));
  }

  // ── _markAllNotifSeen ─────────────────────────────────────────
  function _markAllNotifSeen(container = body) {
    if (window._cottageSess) {
      const _s = window._cottageSess.get(String(user.id));
      _s.notifSeenAt = new Date().toISOString();
      _s.newGameSeenAt = new Date().toISOString();
      _s.voucherNoticeSeen = true;
      window._cottageSess.set(String(user.id), _s);
    }
    container.querySelectorAll('.profile-notif-list .is-new').forEach(li => {
      li.classList.remove('is-new');
      li.querySelector('.profile-notif-new-badge')?.remove();
    });
    const _rewardCard = container.querySelector('.notif-reward-card');
    if (_rewardCard) {
      _rewardCard.classList.remove('is-new');
      _rewardCard.classList.add('is-seen');
      _rewardCard.querySelector('.profile-notif-new-badge')?.remove();
      _rewardCard.querySelector('.profile-voucher-confirm')?.remove();
      _rewardCard.querySelector('.notif-reward-btn')?.classList.add('is-seen');
    }
    container.querySelector('.profile-notif-confirm-all')?.remove();
    document.getElementById('kakaoLoginBtn')?.querySelector('.notif-badge')?.remove();
    body.querySelector('.profile-panel-notif-btn')?.remove();
    _updateNotifBadge();
  }

  // ── _markVoucherSeen (컨테이너 파라미터, 기본값 = body) ──────
  function _markVoucherSeen(container = body) {
    if (window._cottageSess) {
      const _s = window._cottageSess.get(String(user.id));
      _s.voucherNoticeSeen = true;
      window._cottageSess.set(String(user.id), _s);
    }
    document.getElementById('kakaoLoginBtn')?.querySelector('.notif-badge')?.remove();
    body.querySelector('.profile-panel-notif-btn')?.remove();
    const _vCard = container.querySelector('.notif-reward-card');
    if (_vCard) {
      _vCard.classList.remove('is-new');
      _vCard.classList.add('is-seen');
      _vCard.querySelector('.profile-notif-new-badge')?.remove();
      _vCard.querySelector('.profile-voucher-confirm')?.remove();
      _vCard.querySelector('.notif-reward-btn')?.classList.add('is-seen');
    }
    const remaining = container.querySelectorAll('.profile-notif-list .is-new').length;
    if (remaining === 0) {
      body.querySelector('.profile-panel-notif-btn')?.remove();
      container.querySelector('.profile-notif-confirm-all')?.remove();
    }
    _updateNotifBadge();
  }

  // ── _bindVoucher (컨테이너 파라미터화, 기본값 = body) ────────
  function _bindVoucher(container = body) {
    container.querySelectorAll('.profile-voucher-use-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = Number(btn.dataset.productId);
        const pname = btn.dataset.productName;
        const cost = Number(btn.dataset.cost);
        if (!confirm(`${pname} (${cost}장)을 사용할까요?\n냉장고에서 직접 꺼내 드시면 됩니다.`)) return;
        btn.disabled = true;
        const result = await window.CottageDB?.redeemVoucher(String(user.id), pid);
        if (result?.ok) {
          const [nb, np, nh] = await Promise.all([
            window.CottageDB.getVoucherBalance(String(user.id)),
            window.CottageDB.getVoucherProducts(),
            window.CottageDB.getVoucherHistory(String(user.id), 5),
          ]);
          const inner = container.querySelector('#profileVoucherInner');
          if (inner) { inner.innerHTML = _buildVoucherInner(nb, np, nh, isDevMode); _bindVoucher(container); }
        } else {
          btn.disabled = false;
          alert(result?.reason === 'insufficient' ? '보유 교환권이 부족합니다.' : '사용에 실패했습니다.');
        }
      });
    });
    const devBtn = container.querySelector('.profile-voucher-dev-btn');
    if (devBtn) {
      devBtn.addEventListener('click', async () => {
        devBtn.disabled = true;
        const ok = await window.CottageDB?.grantDevVoucher(String(user.id));
        if (ok) {
          const [nb, np, nh] = await Promise.all([
            window.CottageDB.getVoucherBalance(String(user.id)),
            window.CottageDB.getVoucherProducts(),
            window.CottageDB.getVoucherHistory(String(user.id), 5),
          ]);
          const inner = container.querySelector('#profileVoucherInner');
          if (inner) { inner.innerHTML = _buildVoucherInner(nb, np, nh, isDevMode); _bindVoucher(container); }
        } else {
          devBtn.disabled = false;
          console.error('[DEV] grantDevVoucher 실패 — DB CHECK 제약 또는 네트워크 오류. voucher_log.reason에 dev_test 허용 여부 확인.');
          alert('[DEV] 교환권 지급 실패. 콘솔 확인.');
        }
      });
    }
  }

  // ── 카드 클릭 → 서브시트 ─────────────────────────────────────
  body.querySelectorAll('.profile-card, .profile-panel-notif-btn').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.subsheet;

      if (type === 'notif') {
        window.CottageDB?.trackPageView('my-board-notif');
        const _notifTitle = '최근 소식';
        _openSubSheet(_notifTitle, _notifInnerHtml, subBody => {
          subBody.querySelector('.profile-notif-confirm-all')?.addEventListener('click', () => _markAllNotifSeen(subBody));
          subBody.querySelector('.profile-voucher-confirm')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelector('.profile-voucher-link')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelectorAll('.profile-notif-list li.is-clickable').forEach(li => {
            li.addEventListener('click', e => {
              if (e.target.closest('button, a')) return;
              let key = null;
              const gameLink = e.target.closest('[data-game-name]');
              if (gameLink) key = _getGameKeyByName(gameLink.dataset.gameName);
              else if (li.dataset.gameKey) key = li.dataset.gameKey;
              else if (li.dataset.gameId) key = _getGameKeyById(li.dataset.gameId);
              if (key && window.openGameSheet) window.openGameSheet(key);
            });
          });
        });

      } else if (type === 'growth') {
        window.CottageDB?.trackPageView('my-board-growth');
        _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody));

      } else if (type === 'voucher') {
        window.CottageDB?.trackPageView('my-board-voucher');
        _openSubSheet('음료교환권', _voucherInnerHtml, subBody => {
          // 기본 펼침
          subBody.querySelector('#profileVoucherInner')?.classList.remove('is-collapsed');
          const _va = subBody.querySelector('.profile-voucher-toggle .profile-toggle-arrow');
          if (_va) _va.textContent = '▴';
          subBody.querySelector('.profile-voucher-toggle')?.addEventListener('click', function() {
            const inner = subBody.querySelector('#profileVoucherInner');
            const arrow = this.querySelector('.profile-toggle-arrow');
            const collapsed = inner.classList.toggle('is-collapsed');
            arrow.textContent = collapsed ? '▾' : '▴';
          });
          _bindVoucher(subBody);
        }); // end voucher afterRender

      } else if (type === 'taste') {
        window.CottageDB?.trackPageView('my-board-taste');
        _openSubSheet('취향 보드', _tasteInnerHtml, subBody => {
          subBody.querySelectorAll('.profile-gamelist-section-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
              const body = btn.nextElementSibling;
              const arrow = btn.querySelector('.profile-toggle-arrow');
              const hidden = body.classList.toggle('is-hidden');
              arrow.textContent = hidden ? '▾' : '▴';
            });
          });
          subBody.querySelectorAll('.profile-gamelist-item').forEach(li => {
            li.addEventListener('click', () => {
              const key = li.dataset.gameKey;
              if (!key) return;
              window.ensureGameSheet?.();
              window.openGameSheet?.(key);
            });
          });
          subBody.querySelectorAll('.profile-gamelist .profile-more-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const wrap = btn.closest('.profile-more-btn-wrap')?.previousElementSibling;
              if (!wrap) return;
              const isHidden = wrap.classList.toggle('is-hidden');
              btn.textContent = isHidden ? `더 보기 (${btn.dataset.moreCount}개 더)` : '접기';
            });
          });
        });

      } else if (type === 'records') {
        window.CottageDB?.trackPageView('my-board-records');
        _openSubSheet('기록 보드', _recordInnerHtml, subBody => {
          _bindActivityTogglesAndMore(subBody);
          subBody.querySelectorAll('.profile-activity-item[data-game-id]').forEach(li => {
            const gameId = li.dataset.gameId;
            if (!gameId) return;
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
              const key = _getGameKeyById(gameId);
              if (!key) return;
              window.ensureGameSheet?.();
              window.openGameRecordSheet?.(key);
            });
          });
        });


      } else if (type === 'usage') {
        _openSubSheet('함께한 시간', _usageInnerHtml, subBody => {
          // 통계 기본 펼침
          subBody.querySelector('.profile-panel-stats')?.classList.remove('is-collapsed');
          const _sa = subBody.querySelector('.profile-stats-toggle .profile-toggle-arrow');
          if (_sa) _sa.textContent = '▴';
          subBody.querySelector('.profile-stats-toggle')?.addEventListener('click', function() {
            const list = subBody.querySelector('.profile-panel-stats');
            const arrow = this.querySelector('.profile-toggle-arrow');
            const collapsed = list.classList.toggle('is-collapsed');
            arrow.textContent = collapsed ? '▾' : '▴';
          });
          _bindActivityTogglesAndMore(subBody);
        }); // end usage afterRender
      }
    });
  });

  // ── 프로필 영역 버튼 바인딩 ─────────────────────────────────
  body.querySelector('.profile-panel-avatar-wrap')?.addEventListener('click', () => _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, true)));
  body.querySelector('.profile-panel-nick')?.addEventListener('click', () => promptNicknameChange());
  body.querySelector('.profile-panel-title-name')?.addEventListener('click', () => _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, false, true)));
}

document.addEventListener('DOMContentLoaded', initKakaoAuth);
