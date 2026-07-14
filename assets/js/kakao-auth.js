const KAKAO_APP_KEY = 'a1121194b54290671b9c1521c6cfe392';
const KAKAO_REST_KEY = '0e496d427628f9f9b239b106cb5313fa';
const KAKAO_USER_KEY = 'kakao_user';

const OWNER_KAKAO_ID = '4916417947';

if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
  Kakao.init(KAKAO_APP_KEY);
}

// day-detail.js를 kakao-auth.js와 같은 디렉터리에서 동적 로드 (모든 페이지 대응)
(function () {
  const cs = document.currentScript;
  if (cs && !document.getElementById('__dayDetailCSS')) {
    const s = document.createElement('script');
    s.src = cs.src.replace('kakao-auth.js', 'day-detail.js');
    document.head.appendChild(s);
  }
})();

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
    <button class="achievement-toast-close" type="button" aria-label="닫기">✕</button>
  `;
  document.body.appendChild(toast);
  const _closeVToast = () => { toast.classList.remove('is-visible'); setTimeout(() => toast.remove(), 400); };
  toast.querySelector('.achievement-toast-close').addEventListener('click', _closeVToast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(_closeVToast, 8000);
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
      btn.insertAdjacentElement('afterend', logoutIconBtn);
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
  window.dispatchEvent(new CustomEvent('kakao-auth-ready'));
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
  const adminLink = document.getElementById('menuAdminLink');
  if (user) {
    btn.classList.add('is-logged-in');
    if (profileImg) {
      profileImg.src = '/assets/images/characters/characters_basic/squirrel_lv1.png';
      profileImg.style.display = 'inline-block';
    }
    if (loginText) loginText.textContent = user.nickname;
    if (userActions) userActions.style.display = 'none';
    if (logoutIconBtn) logoutIconBtn.classList.add('is-visible');
    if (String(user.id) === String(OWNER_KAKAO_ID)) localStorage.setItem('cottage_is_admin', '1');
    if (adminLink) adminLink.style.display = String(user.id) === String(OWNER_KAKAO_ID) ? '' : 'none';
  } else {
    btn.classList.remove('is-logged-in');
    if (profileImg) profileImg.style.display = 'none';
    if (loginText) loginText.textContent = '카카오 로그인';
    if (userActions) userActions.style.display = 'none';
    if (logoutIconBtn) logoutIconBtn.classList.remove('is-visible');
    if (adminLink) adminLink.style.display = 'none';
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

// 패널/서브시트 trackPageView 중복 방지 — 하루 1회 per 페이지명
function _trackPvOnce(pageName) {
  const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const key = `cottage_pv_${kstDate}_${pageName}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  window.CottageDB?.trackPageView(pageName);
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
        if (sec) subBody.scrollTop = sec.getBoundingClientRect().top - subBody.getBoundingClientRect().top + subBody.scrollTop;
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
        if (sec) subBody.scrollTop = sec.getBoundingClientRect().top - subBody.getBoundingClientRect().top + subBody.scrollTop;
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
  subBody.querySelectorAll('.profile-activity-toggle, .profile-sub-toggle').forEach(btn => {
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

async function openProfilePanel(autoSubsheet = null) {
  const user = getKakaoUser();
  if (!user) return;

  // 취향보드에서 수정 후 "‹ 모임 보드"로 복귀 시 복원할 스크롤 위치(패널 유지되는 동안 서브시트 스왑 간 보존)
  let _pendingMeetingScrollTop = null;

  // 좋아요/궁금해요 변경 전역 통보 (취향보드·모임보드·게임시트 간 즉시 동기화)
  const _emitLikesChanged = (table, gameId, added) => {
    if (!gameId) return;
    try { window.dispatchEvent(new CustomEvent('cottage-likes-changed', { detail: { table, gameId: String(gameId), added: !!added } })); } catch (_) {}
  };

  const existing = document.getElementById('profilePanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'profilePanel';
  panel.className = 'profile-panel';
  const isOwnerUser = String(user.id) === String(OWNER_KAKAO_ID);
  const isDevMode = location.hostname === 'localhost' || isOwnerUser;
  panel.innerHTML = `<div class="profile-panel-box">
    <div class="profile-panel-header">
      <span class="profile-panel-title">${escH(user.nickname || '손님')}의 내 보드</span>
      <button class="profile-panel-close" type="button">✕</button>
    </div>
    <div class="profile-panel-body">
      <p class="profile-panel-loading">불러오는 중...</p>
    </div>
  </div>`;
  document.body.appendChild(panel);
  _trackPvOnce('my-board');
  panel.querySelector('.profile-panel-close').addEventListener('click', () => { document.getElementById('profileSubSheet')?.remove(); panel.remove(); _restoreMenuExpanded(); });
  panel.addEventListener('click', e => { if (e.target === panel) { document.getElementById('profileSubSheet')?.remove(); panel.remove(); _restoreMenuExpanded(); } });
  panel.querySelector('.profile-panel-header').addEventListener('click', e => { if (!e.target.closest('button')) panel.querySelector('.profile-panel-body')?.scrollTo({top:0,behavior:'smooth'}); });

  if (!window.CottageDB?.getMyStats) return;
  const _sessForNotif = window._cottageSess?.get(String(user.id)) || {};
  const _now = new Date();
  const _monthStart = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-01`;
  const _monthEnd   = new Date(_now.getFullYear(), _now.getMonth()+1, 0);
  const _monthEndStr = `${_monthEnd.getFullYear()}-${String(_monthEnd.getMonth()+1).padStart(2,'0')}-${String(_monthEnd.getDate()).padStart(2,'0')}`;
  const [stats, notifs, codexHtml, userStats, voucherBalance, voucherProducts, voucherHistory, likedGames, curiousGames, allBioSuggestions, allAvoidSuggestions, _thisMonthVotes, meetingProfile] = await Promise.all([
    window.CottageDB.getMyStats(String(user.id), user.nickname || null),
    window.CottageDB.getMyNotifications?.(String(user.id), user.nickname || null, _sessForNotif.notifSeenAt || null, _sessForNotif.newGameSeenAt || null) || Promise.resolve([]),
    (window.CottageAchievements?.buildCodexSection(String(user.id)) || Promise.resolve('')).catch(() => ''),
    (window.CottageAchievements?.fetchUserStats?.(String(user.id), user.nickname || null) || Promise.resolve(null)).catch(() => null),
    (window.CottageDB?.getVoucherBalance?.(String(user.id)) || Promise.resolve(0)).catch(() => 0),
    (window.CottageDB?.getVoucherProducts?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getVoucherHistory?.(String(user.id), 5) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getUserLikedGamesAll?.(String(user.id)) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getUserCuriousGamesAll?.(String(user.id)) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getAllBioTagSuggestions?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getAllAvoidTagSuggestions?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getMeetingVotes?.(_monthStart, _monthEndStr) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getMeetingProfile?.(String(user.id)) || Promise.resolve(null)).catch(() => null),
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
  const fmtShort = iso => {
    if (!iso) return '';
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(iso).trim());
    const d = new Date(iso);
    const base = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    if (isDateOnly) return base;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${base} ${hh}:${mm}`;
  };

  function _getGameThumbKey(gameId) {
    if (!gameId || !window.gameData) return null;
    if (window.gameData[gameId]) return gameId;
    const entry = Object.entries(window.gameData).find(([, g]) => String(g.bgg?.id) === String(gameId));
    return entry ? entry[0] : null;
  }

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

  function buildActivityList(items, renderFn, previewCount = PREVIEW) {
    const preview = items.slice(0, previewCount).map(renderFn).join('');
    const rest = items.slice(previewCount).map(renderFn).join('');
    const hasMore = items.length > previewCount;
    return `<ul class="profile-activity-list is-collapsed">
      ${preview}
      ${hasMore ? `<div class="profile-more-wrap is-hidden">${rest}</div>
        <li class="profile-more-btn-wrap">
          <button class="profile-more-btn" type="button">더 보기 (${items.length - previewCount}건 더)</button>
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
  // 플레이기록 날짜 그룹화
  const _playGroups = new Map();
  for (const r of stats.plays) {
    const key = (r.played_at || (r.created_at||'').slice(0,10)).slice(0,10);
    if (!_playGroups.has(key)) _playGroups.set(key, []);
    _playGroups.get(key).push(r);
  }
  const _sortedPlayDates = [..._playGroups.keys()].sort((a,b) => b.localeCompare(a));
  const _playDateLabel = key => { const [,m,d] = key.split('-').map(Number); return `${m}월 ${d}일`; };

  let _playVisHtml = '', _playHidHtml = '', _playVisCnt = 0, _lastDate = null;
  for (const dateKey of _sortedPlayDates) {
    const groupItems = _playGroups.get(dateKey);
    const newGroup = _lastDate !== null;
    _lastDate = dateKey;
    for (let gi = 0; gi < groupItems.length; gi++) {
      const r = groupItems[gi];
      const pn = _playOrderMap.get(r.id);
      const pLabel = pn >= 2 ? ` <span class="pr-play-order">(${pn}번째 플레이)</span>` : '';
      const isFirst = gi === 0;
      const dateHtml = isFirst ? `<span class="profile-play-date">${_playDateLabel(dateKey)}</span>` : '';
      const sepHtml = (isFirst && newGroup) ? '<li class="profile-date-group-sep" aria-hidden="true"></li>' : '';
      const _thumbKey = _getGameThumbKey(r.game_id);
      const _thumbUrl = _thumbKey ? window.gameData[_thumbKey]?.images?.thumbnail : null;
      const _thumbHtml = _thumbUrl
        ? `<img class="profile-record-thumb" src="${escH(_thumbUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : `<span class="profile-record-thumb-empty"></span>`;
      const itemHtml = `${sepHtml}<li class="profile-activity-item" data-game-id="${escH(String(r.game_id || ''))}">${_thumbHtml}<button class="profile-game-link profile-game-link--light" type="button">${escH(getGameName(r.game_id))}</button>${pLabel}${dateHtml}</li>`;
      if (_playVisCnt < PREVIEW) { _playVisHtml += itemHtml; _playVisCnt++; }
      else _playHidHtml += itemHtml;
    }
  }
  const _playHasMore = stats.plays.length > PREVIEW;
  const playListHtml = `<ul class="profile-activity-list is-collapsed">
    ${_playVisHtml}
    ${_playHasMore ? `<div class="profile-more-wrap is-hidden">${_playHidHtml}</div>
      <li class="profile-more-btn-wrap"><button class="profile-more-btn" type="button">더 보기 (${stats.plays.length - PREVIEW}건 더)</button></li>` : ''}
  </ul>`;

  const _playsWithReview = stats.plays.filter(r => r.review_text);
  // game_comments도 게임평 섹션에 통합 (game_key = 한글명 또는 BGG ID 모두 getGameName으로 처리)
  const _commentsAsReviews = stats.comments.map(c => ({
    _isComment: true, game_id: c.game_key, review_text: c.comment_text,
    played_at: null, created_at: c.created_at,
  }));
  const _allReviews = [..._playsWithReview, ..._commentsAsReviews].sort((a, b) =>
    (b.played_at || b.created_at || '').localeCompare(a.played_at || a.created_at || '')
  );
  const commentListHtml = ''; // game_comments는 게임평 섹션에 통합됨
  const reviewListHtml = buildActivityList(_allReviews, r => {
    const pn = r._isComment ? 0 : _playOrderMap.get(r.id);
    const pLabel = pn >= 2 ? ` <span class="pr-play-order">(${pn}번째 플레이)</span>` : '';
    const _thumbKey = _getGameThumbKey(r.game_id);
    const _thumbUrl = _thumbKey ? window.gameData[_thumbKey]?.images?.thumbnail : null;
    const _thumbHtml = _thumbUrl
      ? `<img class="profile-record-thumb profile-record-thumb--review" src="${escH(_thumbUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<span class="profile-record-thumb-empty profile-record-thumb--review"></span>`;
    return `<li class="profile-activity-item profile-activity-item--review" data-game-id="${escH(String(r.game_id || ''))}"><div class="profile-review-header"><span class="profile-review-left">${_thumbHtml}<button class="profile-game-link" type="button">${escH(getGameName(r.game_id))}</button>${pLabel}</span><span class="profile-review-date">${fmtShort(r.played_at || r.created_at)}</span></div><p class="profile-review-text">${escH(r.review_text)}</p></li>`;
  }, 1);

  const _hasFirstPlayVoucher = voucherHistory.some((item) => item.reason === 'first_play' && Number(item.delta) > 0);
  const voucherSeen = !!_sessForNotif.voucherNoticeSeen;
  const VOUCHER_NOTICE_DATE = '2026-06-16';
  const _voucherDateLabel = fmtShort(VOUCHER_NOTICE_DATE);
  let voucherCardHtml = '';
  if (_hasFirstPlayVoucher) {
    voucherCardHtml = `<div class="notif-reward-card is-seen">
    <div class="notif-reward-row">
      <div class="notif-reward-icon-col">🎫</div>
      <div class="notif-reward-body">
        <div class="notif-reward-title">첫 기록 보상 수령 완료</div>
        <div class="notif-reward-desc">첫 플레이기록 보상으로 음료교환권 1장을 받으셨어요 ✓</div>
        <div class="notif-card-date">${escH(_voucherDateLabel)}</div>
      </div>
    </div>
  </div>`;
  } else {
    // 미수령: voucherSeen 여부와 무관하게 is-seen 사용 금지 (수령완료와 혼동 방지)
    // voucherSeen은 NEW 배지·확인했어요 버튼·카드 위치만 제어
    voucherCardHtml = `<div class="notif-reward-card${voucherSeen ? '' : ' is-new'}">
    <div class="notif-reward-row">
      <div class="notif-reward-icon-col">🎫</div>
      <div class="notif-reward-body">
        <div class="notif-reward-title">첫 기록 보상 안내 ${voucherSeen ? '' : '<span class="profile-notif-new-badge" style="color:#fff">NEW</span>'}</div>
        <div class="notif-reward-desc">첫 플레이기록을 남기면 음료교환권 1장을 받을 수 있어요</div>
        <div class="notif-card-date">${escH(_voucherDateLabel)}</div>
      </div>
    </div>
    <div class="notif-reward-actions">
      <a class="notif-reward-btn profile-voucher-link" href="/pages/game/game-reviews.html">게임 기록하기</a>
      ${voucherSeen ? '' : '<button class="profile-voucher-confirm" type="button">확인했어요</button>'}
    </div>
  </div>`;
  }
  const _effectiveVoucherSeen = _hasFirstPlayVoucher || voucherSeen;
  const _newCount = notifs.filter(n => n.isNew).length + (_effectiveVoucherSeen ? 0 : 1);
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
    const readBtn = n.isNew ? '<button class="notif-read-one-btn" type="button">읽음</button>' : '';
    const _card = (icon, title, desc) =>
      `<div class="notif-card-icon">${icon}</div><div class="notif-card-body"><div class="notif-card-title">${title} ${badge}</div><div class="notif-card-desc">${desc}</div>${dt}</div>`;
    if (n.type === 'tagged')
      return `<li class="${cls}" data-game-id="${escH(String(n.gameId))}">${_card('🎲', escH(getGameName(n.gameId)) + ' 기록 태그', '새 기록에 내 닉네임이 태그됐어요 · <a class="notif-inline-link" href="/pages/game/game-reviews.html" onclick="event.stopPropagation()">게임평 쓰러 가기 →</a>')}${readBtn}</li>`;
    if (n.type === 'curious_comment')
      return `<li class="${cls}" data-game-key="${escH(String(n.gameKey))}">${_card('🤔', escH(getGameName(n.gameKey)) + ' 새 코멘트', '궁금해요 게임에 코멘트가 달렸어요')}${readBtn}</li>`;
    if (n.type === 'curious_play')
      return `<li class="${cls}" data-game-id="${escH(String(n.gameId))}">${_card('🎲', escH(getGameName(n.gameId)) + ' 플레이됐어요', '궁금해요 게임을 누군가 플레이했어요')}${readBtn}</li>`;
    if (n.type === 'ordered')
      return `<li class="${cls}" data-game-name="${escH(String(n.gameName))}">${_card('🛒', escH(n.gameName) + ' 주문 완료', '게임 요청이 접수/주문되었습니다')}${readBtn}</li>`;
    if (n.type === 'new_game') {
      const games = n.actualGames?.length ? n.actualGames : [n.gameName].filter(Boolean);
      if (games.length === 1) {
        return `<li class="${cls}" data-game-name="${escH(games[0])}">${_card('📦', escH(games[0]), '새 게임이 추가됐어요')}${readBtn}</li>`;
      }
      const gameLinks = games.map(g => `<span class="notif-game-link" data-game-name="${escH(g)}">${escH(g)}</span>`).join(', ');
      return `<li class="${cls}">${_card('📦', gameLinks, '새 게임이 추가됐어요')}${readBtn}</li>`;
    }
    if (n.type === 'new_intro') {
      const desc = n.count === 1
        ? `${escH(n.names[0])}님이 소개글을 올렸어요`
        : `${escH(n.names[0])} 외 ${n.count - 1}명이 소개글을 올렸어요`;
      return `<li class="${cls}"${n.firstUserId ? ` data-intro-uid="${escH(String(n.firstUserId))}"` : ''}>${_card('👋', '동호회 소개글', desc)}${readBtn}</li>`;
    }
    if (n.type === 'voucher_granted') {
      const reasonLabel = n.reason === 'first_play' ? '첫 기록 보상' : n.reason === 'achievement' ? '업적 달성 보상' : '관리자 지급';
      return `<li class="${cls}">${_card('🎫', escH(n.nickname) + ' 교환권 획득', reasonLabel)}${readBtn}</li>`;
    }
    if (n.type === 'voucher_used')
      return `<li class="${cls}">${_card('🎫', escH(n.nickname) + ' 교환권 사용', '음료 교환권 사용')}${readBtn}</li>`;
    return '';
  }
  const _hasAnyNew = _newCount > 0;
  const _allNotifItems = notifs.slice(0, 8).map(_renderNotifItem).join('');
  const _hiddenNotifCount = Math.max(0, notifs.length - 8);
  const _hiddenNotifHtml = _hiddenNotifCount > 0
    ? `<button class="profile-notif-more-btn" type="button" data-more="${_hiddenNotifCount}">외 ${_hiddenNotifCount}건 더 보기 ▾</button><ul class="profile-notif-more-list is-hidden">${notifs.slice(8).map(_renderNotifItem).join('')}</ul>`
    : '';
  const _notifHelpHtml = notifs.length === 0
    ? `<div class="notif-help">새 알림이 없으면 여기에서 보상, 게임 요청, 업적 달성 소식을 확인할 수 있어요.</div>`
    : '';
  const _voucherFirst = !_effectiveVoucherSeen;
  let _notifInnerHtml = `<div class="notif-list-header">${_hasAnyNew ? '<button class="profile-notif-confirm-all" type="button">모두 읽기</button>' : ''}</div>${_voucherFirst ? voucherCardHtml : ''}<ul class="profile-notif-list">${_allNotifItems}</ul>${_hiddenNotifHtml}${_voucherFirst ? '' : voucherCardHtml}${_notifHelpHtml}`;

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

  // 이번달 참여 일정 (내가 투표한 날짜, 오늘 이후만 — 지난 모임 숨김)
  const _todayLocalStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const _myVoteDates = (_thisMonthVotes || [])
    .filter(v => String(v.user_id) === String(user.id) && v.vote_date >= _todayLocalStr)
    .map(v => v.vote_date)
    .sort();
  let _scheduleHtml = '';
  if (_myVoteDates.length) {
    const _fmtDate = ds => { const [,m,d] = ds.split('-'); return `${parseInt(m,10)}/${parseInt(d,10)} 정기모임`; };
    const _show = _myVoteDates.slice(0, 2).map(_fmtDate);
    const _extra = _myVoteDates.length - 2;
    if (_extra > 0) _show.push(`외 ${_extra}건`);
    _scheduleHtml = `<span class="profile-card-schedule">${_show.map(l => escH(l)).join('<br>')}</span>`;
  }

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

  const _growthLine = `업적 ${_achCount}/${_achTotal} · 캐릭터 ${_charCount}/${_charTotal} · 칭호 ${_titleCount}/${_titleTotal} · 도감 ${_codexPlayed}/${_codexTotal}`;
  const _growthPct = Math.round((_charCount + _titleCount + _achCount + _codexPlayed) / (_charTotal + _titleTotal + _achTotal + _codexTotal) * 100);
  const _nextAch = userStats ? window.CottageAchievements?.findNextAchievement?.(userStats) : null;
  const _growthBadge = `<div class="profile-growth-badge">🌱 성장도 ${_growthPct}%${_nextAch ? ` · ${_nextAch.emoji}까지 ${escH(_nextAch.label)} ${_nextAch.gap}${_nextAch.unit} 남음` : ''}</div>`;

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

  // 취향 보드
  const AVOID_TAGS = ['마피아류', '실시간', '협상', '파티게임', '긴 플레이타임', '고난도 전략', '운 비중 높음', '공격/견제 강함'];
  const _BIO_PREDEFINED = ['전략게임을 좋아해요', '가벼운 파티게임 선호해요', '협력게임 팬이에요', '무거운 유로게임 마니아', '보드게임 처음 시작했어요', '코티지보드 단골이에요', '새로 해보는 게임이 좋아요', '한 게임을 진득하게 파는 걸 좋아해요', '전략을 분석하는 게 좋아요', '창의적인 플레이가 좋아요', '함께 교류하는 걸 좋아해요'];
  const _bio = stats?.profile?.bio || '';
  const _bioTags = _bio ? _bio.split(',').map(t => t.trim()).filter(Boolean) : [];
  let _currentBio = _bio;
  const _avoidTags = stats?.profile?.avoid_tags || [];
  // 룰 설명 가능(can_explain_rules) — 취향·모임 보드 공유(meeting_game_prefs). game_id는 슬러그.
  const _ruleSet = new Set((meetingProfile?.ruleGames || []).map(g => g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`));

  // 취향보드 게임 칩 — 📖 룰설명 토글 + ✕ 삭제(모임보드와 동일 패턴, 단 원천 game_likes/curious)
  function _buildTasteGameItems(games, ruleSet, maxInitial = 5) {
    if (!games.length) return '<p class="taste-game-empty">아직 추가된 게임이 없어요</p>';
    const renderItem = g => {
      const _gd = g.game_id ? window.gameData?.[g.game_id] : null;
      const name = _gd
        ? (_gd.title?.display || _gd.title?.owned || _gd.title?.bgg || String(g.game_id))
        : (g.custom_name || String(g.game_id || ''));
      const thumb = _gd?.images?.thumbnail
        ? `<img class="taste-game-thumb" src="${escH(_gd.images.thumbnail)}" alt="">`
        : `<span class="taste-game-thumb-empty"></span>`;
      const gidAttr = g.game_id ? ` data-game-id="${g.game_id}"` : '';
      const cnAttr = g.custom_name ? ` data-custom-name="${escH(g.custom_name)}"` : '';
      const clickable = g.game_id ? ' taste-game-item--clickable' : '';
      const ruleKey = g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`;
      const ruleOn = ruleSet?.has(ruleKey) ? ' is-on' : '';
      return `<div class="taste-game-item${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(name)}</span><button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button><button class="taste-game-del" type="button" title="삭제">✕</button></div>`;
    };
    if (games.length <= maxInitial) return games.map(renderItem).join('');
    const restCount = games.length - maxInitial;
    return `${games.slice(0, maxInitial).map(renderItem).join('')}<div class="taste-game-more-wrap" hidden>${games.slice(maxInitial).map(renderItem).join('')}</div><button class="taste-more-btn" type="button">더 보기 (${restCount}개 더)</button>`;
  }

  // 모임보드 전용 게임 아이템 — 📖 룰설명 토글 버튼 포함, 초기 maxInitial=2(주간 배지 로드 전)
  function _buildMeetingGameItems(games, ruleSet, maxInitial = 2) {
    if (!games.length) return '<p class="taste-game-empty">아직 추가된 게임이 없어요</p>';
    const renderItem = g => {
      const _gd = g.game_id ? window.gameData?.[g.game_id] : null;
      const name = _gd
        ? (_gd.title?.display || _gd.title?.owned || _gd.title?.bgg || String(g.game_id))
        : (g.custom_name || String(g.game_id || ''));
      const thumb = _gd?.images?.thumbnail
        ? `<img class="taste-game-thumb" src="${escH(_gd.images.thumbnail)}" alt="">`
        : `<span class="taste-game-thumb-empty"></span>`;
      const gidAttr = g.game_id ? ` data-game-id="${g.game_id}"` : '';
      const cnAttr = g.custom_name ? ` data-custom-name="${escH(g.custom_name)}"` : '';
      const clickable = g.game_id ? ' taste-game-item--clickable' : '';
      const ruleKey = g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`;
      const ruleOn = ruleSet?.has(ruleKey) ? ' is-on' : '';
      return `<div class="taste-game-item${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(name)}</span><button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button><button class="taste-game-del" type="button" title="삭제">✕</button></div>`;
    };
    if (games.length <= maxInitial) return games.map(renderItem).join('');
    const restCount = games.length - maxInitial;
    return `${games.slice(0, maxInitial).map(renderItem).join('')}<div class="taste-game-more-wrap" hidden>${games.slice(maxInitial).map(renderItem).join('')}</div><button class="taste-more-btn" type="button">더 보기 (${restCount}개 더)</button>`;
  }

  const _tasteInnerHtml = `
    <div class="taste-bio-section">
      <div class="taste-section-label">한줄 소개</div>
      <div class="taste-bio-row">
        <span class="taste-bio-display" data-bio="${escH(_bio)}">${_bioTags.length ? _bioTags.map(t => `<span class="taste-bio-tag">${escH(t)}</span>`).join('') : '<span class="taste-bio-placeholder">소개를 추가해보세요</span>'}</span>
        <button class="taste-bio-edit-btn" type="button" title="편집">✏️</button>
      </div>
      <div class="taste-bio-edit-wrap" style="display:none">
        <div class="taste-bio-chips">
          ${_BIO_PREDEFINED.map(ex => `<button class="taste-bio-chip" type="button">${escH(ex)}</button>`).join('')}
        </div>
        <div class="taste-bio-custom-wrap">
          <input type="text" class="taste-bio-custom-input" maxlength="20" placeholder="직접 입력 후 Enter">
          <button class="taste-bio-custom-add" type="button">+</button>
        </div>
        <div class="taste-bio-custom-tags"></div>
        <div class="taste-bio-actions">
          <button class="taste-bio-save-btn" type="button">저장</button>
          <button class="taste-bio-cancel-btn" type="button">취소</button>
        </div>
      </div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">❤️ 좋아하는 게임 <span class="taste-count" id="tastelikedCount">${likedGames.length}개</span> <button class="taste-add-btn taste-add-btn--inline" id="tastelikedAddBtn" type="button">+ 게임 추가</button></div>
      <div class="taste-game-list" id="tastelikedList">${_buildTasteGameItems(likedGames, _ruleSet)}</div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">👀 해보고 싶은 게임 <span class="taste-count" id="tastecuriousCount">${curiousGames.length}개</span> <button class="taste-add-btn taste-add-btn--inline" id="tastecuriousAddBtn" type="button">+ 게임 추가</button></div>
      <div class="taste-game-list" id="tastecuriousList">${_buildTasteGameItems(curiousGames, _ruleSet)}</div>
    </div>
    <div class="taste-avoid-section">
      <div class="taste-section-label">🚫 피하는 유형 <span class="taste-avoid-count">${_avoidTags.length > 0 ? `${_avoidTags.length}개 선택됨` : ''}</span></div>
      <p class="taste-avoid-desc">선택한 유형은 가급적 피하고 싶어요 <span class="taste-avoid-desc-hint">· 선택 안 하면 제한 없음</span></p>
      ${(() => {
        const _avoidRender = t => { const active = _avoidTags.includes(t); return `<button class="taste-tag${active ? ' is-active' : ''}" data-tag="${escH(t)}" type="button">${active ? '🚫 ' : ''}${escH(t)}</button>`; };
        const _communityAvoid = (allAvoidSuggestions || []).filter(t => !AVOID_TAGS.includes(t));
        const _overflow = [...AVOID_TAGS.slice(4), ..._communityAvoid];
        return `<div class="taste-tag-grid">${AVOID_TAGS.slice(0, 4).map(_avoidRender).join('')}${_overflow.length ? `<div class="taste-avoid-more-wrap" hidden>${_overflow.map(_avoidRender).join('')}</div><button class="taste-more-btn taste-avoid-more-btn" type="button">더 보기 (${_overflow.length}개 더)</button>` : ''}</div>`;
      })()}
      <div class="taste-avoid-custom-wrap">
        <input type="text" class="taste-avoid-custom-input" maxlength="15" placeholder="직접 입력 후 Enter">
        <button class="taste-avoid-custom-add" type="button">+</button>
      </div>
    </div>`;
  // 기록 보드: 플레이기록/게임평/사진 3섹션 토글 (항상 표시, 기본 열림)
  const _openActivityList = html => html.replace('class="profile-activity-list is-collapsed"', 'class="profile-activity-list"');
  const _emptyList = msg => `<ul class="profile-activity-list"><li class="profile-gamelist-empty">${msg}</li></ul>`;
  // 사진 전체 목록 (photo_url: JSON 배열 or 단일 URL) — record 컨텍스트 포함
  const _allPhotoData = [];
  for (const p of stats.plays) {
    if (!p.photo_url) continue;
    const parsed = window.parsePhotoUrls ? window.parsePhotoUrls(p.photo_url) : [p.photo_url];
    for (const url of parsed) {
      _allPhotoData.push({ url, record_id: p.id, user_id: p.user_id, game_id: p.game_id || null, nickname: p.nickname || '', played_at: p.played_at || p.created_at?.slice(0,10) || '', group_name: p.group_name || '', player_count: p.player_count || null, player_names: p.player_names || '', play_time_min: p.play_time_min || null, score_note: p.score_note || '' });
    }
  }
  const _photoCount = userStats?.photoCount || 0;
  const _PHOTO_SHOW = 3;
  const _recentPhotoHtml = _allPhotoData.length
    ? `<ul class="profile-activity-list"><li style="display:block;padding:4px 0"><div class="record-photo-grid">${_allPhotoData.map((d, i) => `<img class="record-photo-thumb${i >= _PHOTO_SHOW ? ' record-photo-hidden' : ''}" src="${escH(d.url)}" alt="" data-photo-idx="${i}">`).join('')}${_allPhotoData.length > _PHOTO_SHOW ? `<button class="record-photo-more-badge" type="button">더 보기 (${_allPhotoData.length - _PHOTO_SHOW}장 더)</button>` : ''}</div></li></ul>`
    : _emptyList('아직 사진이 없어요');
  const _recordInnerHtml = `
    <div class="profile-activity-group profile-activity-group--review">
      <button class="profile-activity-toggle" type="button">💬 게임평 <span class="profile-activity-count">${_allReviews.length}개</span><span class="profile-toggle-arrow">▴</span></button>
      ${_allReviews.length ? _openActivityList(reviewListHtml) : _emptyList('아직 게임평이 없어요')}
    </div>
    <div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">📸 사진 <span class="profile-activity-count">${_photoCount}장</span><span class="profile-toggle-arrow">▾</span></button>
      ${_recentPhotoHtml}
    </div>
    <div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">🎲 플레이 기록 <span class="profile-activity-count">${stats.plays.length}건</span><span class="profile-toggle-arrow">▴</span></button>
      ${stats.plays.length ? _openActivityList(playListHtml) : _emptyList('아직 플레이 기록이 없어요')}
    </div>`;
  // 함께한 시간: 통계만 (플레이 기록·코멘트는 기록 보드에서 확인)
  const _usageInnerHtml = `
    <div class="profile-stats-wrap">
      <button class="profile-stats-toggle" type="button">📊 ${escH(_statsSummary)}<span class="profile-toggle-arrow">▾</span></button>
      <ul class="profile-panel-stats is-collapsed">${_statsListHtml}</ul>
    </div>`;
  // 카드 요약
  const _voucherCardSummary = `${voucherBalance}장 보유`;
  const _bioPreview = _bioTags.length ? `${_bioTags.slice(0, 2).map(t => `#${t}`).join(' ')}${_bioTags.length > 2 ? ` +${_bioTags.length - 2}` : ''}` : '';
  const _tasteCardSummaryHtml = (_bioPreview ? `<span class="profile-card-bio-row">${escH(_bioPreview)}</span>` : '') +
    `<span class="profile-card-games-row">❤️ 좋아하는 게임 ${likedGames.length}개\n👀 해보고싶은 게임 ${curiousGames.length}개</span>`;
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

  // 모임 보드: 회원 자기소개(member_intros) + profiles.bio(한줄소개, 취향보드와 공유 SSOT) +
  // meeting_game_prefs(이번에 하고싶은 게임/룰 설명 가능한 게임) 연동. 자기소개 페이지와 동일 데이터 공유.
  // 선호=bio(한줄소개), 비선호=avoid_tags — 편집은 취향보드에서. meeting_style은 미사용(하위호환 잔존).
  const _meeting = meetingProfile || { bio: '', location: '', available: '', travelRange: '', meetingStyle: [], likedGames: [], curiousGames: [], ruleGames: [] };
  // _ruleSet은 취향보드 템플릿보다 먼저 필요 → 위쪽(_avoidTags 근처)에서 정의
  const _relDay = iso => {
    if (!iso) return '';
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? iso + 'T00:00:00' : iso);
    const diffDay = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDay <= 0) return '오늘';
    return `${diffDay}일 전`;
  };
  const _recentPlays = [...stats.plays].sort((a, b) => {
    const da = a.played_at || (a.created_at || '').slice(0, 10);
    const db = b.played_at || (b.created_at || '').slice(0, 10);
    return da < db ? 1 : da > db ? -1 : 0;
  }).slice(0, 5);
  const _recentPlaysHtml = _recentPlays.length
    ? `<ul class="profile-activity-list">${_recentPlays.map(r => {
        const _gk = _getGameKeyById(r.game_id);
        const _gd = _gk ? window.gameData?.[_gk] : null;
        const _th = _gd?.images?.thumbnail
          ? `<img class="profile-record-thumb" src="${escH(_gd.images.thumbnail)}" alt="">`
          : `<span class="profile-record-thumb-empty"></span>`;
        return `<li class="profile-activity-item profile-activity-item--thumb" data-game-id="${escH(String(r.game_id || ''))}">${_th}<button class="profile-game-link profile-game-link--light" type="button">${escH(getGameName(r.game_id))}</button><span class="profile-review-date">${_relDay(r.played_at || r.created_at)}</span></li>`;
      }).join('')}</ul>`
    : _emptyList('아직 플레이 기록이 없어요');

  function _meetingProfileRowHtml(label, val) {
    return `<div class="meeting-profile-row"><span class="meeting-profile-label">${label}</span><span class="meeting-profile-val${val ? '' : ' is-empty'}">${val ? escH(val) : '미입력'}</span></div>`;
  }

  // 선호(취향보드 한줄소개=bio) / 비선호(취향보드 피하는 유형=avoid_tags) 요약 — 읽기전용 칩
  // 편집은 취향보드에서 (mb-pref-edit 버튼 → openProfilePanel('taste'))
  const _mbLikeStyleHtml = _bioTags.length
    ? _bioTags.map(t => `<span class="mb-pref-tag mb-pref-tag--like">${escH(t)}</span>`).join('')
    : '<span class="mb-pref-empty">미설정</span>';
  const _mbAvoidHtml = _avoidTags.length
    ? _avoidTags.map(t => `<span class="mb-pref-tag mb-pref-tag--avoid">${escH(t)}</span>`).join('')
    : '<span class="mb-pref-empty">미설정</span>';

  const _meetingInnerHtml = `
    <div class="taste-game-section" id="mbWeekSection">
      <div class="taste-section-label">📅 이번 주 일정</div>
      <p class="taste-game-empty">불러오는 중…</p>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label taste-section-label--mb"><span class="mb-sec-name">❤️ 이번 주 하고 싶은 게임</span> <span class="taste-count" id="meetinglikedCount"></span> <button class="taste-add-btn taste-add-btn--inline" id="meetinglikedAddBtn" type="button">＋추가</button> <button class="mb-taste-link" id="meetinglikedBoxBtn" type="button">좋아하는 게임</button></div>
      <div class="taste-game-list" id="meetinglikedList"><p class="taste-game-empty">불러오는 중…</p></div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label taste-section-label--mb"><span class="mb-sec-name">💡 이번 주 배우고 싶은 게임</span> <span class="taste-count" id="meetingcuriousCount"></span> <button class="taste-add-btn taste-add-btn--inline" id="meetingcuriousAddBtn" type="button">＋추가</button> <button class="mb-taste-link" id="meetingcuriousBoxBtn" type="button">궁금한 게임</button></div>
      <div class="taste-game-list" id="meetingcuriousList"><p class="taste-game-empty">불러오는 중…</p></div>
    </div>
    <div class="taste-game-section mb-pref-summary">
      <div class="mb-pref-block">
        <div class="taste-section-label">👍 선호 스타일 <button class="mb-pref-edit" type="button" data-pref="like">취향보드에서 수정 →</button></div>
        <div class="mb-pref-tags" id="mbLikeStyleTags">${_mbLikeStyleHtml}</div>
      </div>
      <div class="mb-pref-block">
        <div class="taste-section-label">🚫 비선호 유형 <button class="mb-pref-edit" type="button" data-pref="avoid">취향보드에서 수정 →</button></div>
        <div class="mb-pref-tags">${_mbAvoidHtml}</div>
      </div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">🕐 최근 모임 참여${stats.moimCount ? ` <span class="taste-count">${stats.moimCount}회</span>` : ''}</div>
      ${_recentPlaysHtml}
    </div>
    <div class="meeting-profile-section">
      <div class="taste-section-label">📍 모임 프로필</div>
      <div class="meeting-profile-display">
        ${_meetingProfileRowHtml('📍 활동 지역', _meeting.location)}
        ${_meetingProfileRowHtml('🕐 참여 가능 시간', _meeting.available)}
        ${_meetingProfileRowHtml('🚗 이동 가능 범위', _meeting.travelRange)}
      </div>
      <button class="meeting-profile-edit-btn taste-bio-edit-btn" type="button" title="수정">✏️ 수정</button>
      <div class="meeting-profile-edit-wrap" style="display:none">
        <div class="intro-field">
          <label class="intro-label">활동 지역</label>
          <input class="intro-input meeting-edit-location" type="text" placeholder="예: 용인, 수원, 성남, 서울 남부" maxlength="50" value="${escH(_meeting.location)}">
        </div>
        <div class="intro-field">
          <label class="intro-label">참여 가능 시간</label>
          <input class="intro-input meeting-edit-available" type="text" placeholder="예: 주말 오후, 평일 저녁 가능" maxlength="100" value="${escH(_meeting.available)}">
        </div>
        <div class="intro-field">
          <label class="intro-label">이동 가능 범위</label>
          <input class="intro-input meeting-edit-travel" type="text" placeholder="예: 차로 30분 이내" maxlength="50" value="${escH(_meeting.travelRange)}">
        </div>
        <div class="taste-bio-actions">
          <button class="meeting-profile-save-btn taste-bio-save-btn" type="button">저장</button>
          <button class="meeting-profile-cancel-btn taste-bio-cancel-btn" type="button">취소</button>
        </div>
      </div>
    </div>`;

  body.innerHTML = `
    <div class="profile-panel-profile">
      <div class="profile-panel-profile-top">
        ${_repImgHtml}
        <div class="profile-panel-profile-info">
          <div class="profile-panel-nick-row">
            <button class="profile-panel-nick" type="button">${escH(user.nickname || '손님')} <span class="profile-nick-edit">✏️</span></button>
            <button class="profile-panel-notif-btn${_newCount === 0 ? ' is-zero' : ''}" data-subsheet="notif" type="button">${_newCount > 0 ? '<span class="notif-red-dot"></span>' : ''}🔔 ${_newCount > 0 ? `새 알림 ${_newCount}건` : '알림'}</button>
          </div>
          <span class="profile-panel-rep-name">${_repLabel}</span>
          <button class="profile-panel-title-name${_validRepTitle ? '' : ' is-empty'}" type="button">${_validRepTitle ? `${_validRepTitle.emoji} ${escH(_validRepTitle.name)} <span class="profile-title-edit">⚙</span>` : '칭호 없음 <span class="profile-title-edit">⚙</span>'}</button>
        </div>
      </div>
      <button class="profile-growth-link" type="button">
        <span class="profile-growth-summary-row">
          <span class="profile-growth-summary-text">${escH(_growthLine)}</span>
          <span class="profile-growth-summary-arrow">›</span>
        </span>
        ${_growthBadge}
      </button>
    </div>
    <div class="profile-card-grid">
      <button class="profile-card" data-subsheet="taste" type="button">
        <span class="profile-card-icon">❤️</span>
        <span class="profile-card-label">취향 보드</span>
        <span class="profile-card-summary">${_tasteCardSummaryHtml}</span>
      </button>
      <button class="profile-card" data-subsheet="records" type="button">
        <span class="profile-card-icon">📝</span>
        <span class="profile-card-label">기록 보드</span>
        <span class="profile-card-summary">${escH(_recordCardSummary)}</span>
      </button>
      <button class="profile-card" data-subsheet="usage" type="button">
        <span class="profile-card-icon">📊</span>
        <span class="profile-card-label">함께한 시간</span>
        <span class="profile-card-summary">${escH(_statsSummary)}</span>
      </button>
      <button class="profile-card" data-subsheet="meeting" type="button">
        <span class="profile-card-icon">📅</span>
        <span class="profile-card-label">모임 보드</span>
        <span class="profile-card-summary"><span class="profile-card-meeting-cta">이번 모임 준비하기</span>${_scheduleHtml || '<span class="profile-card-meeting-empty">아직 등록한 일정이 없어요</span>'}</span>
      </button>
      <button class="profile-card profile-card--span2" data-subsheet="voucher" type="button">
        <span class="profile-card-icon">🎫</span>
        <span class="profile-card-label">음료교환권</span>
        <span class="profile-card-summary">${escH(_voucherCardSummary)}</span>
      </button>
    </div>`;

  // ── 서브시트 헬퍼 ──────────────────────────────────────────────
  function _openSubSheet(title, contentHtml, afterRender, bodyClass = '') {
    document.getElementById('profileSubSheet')?.remove();
    const sub = document.createElement('div');
    sub.id = 'profileSubSheet';
    sub.className = 'profile-subsheet';
    sub.innerHTML = `
      <div class="profile-subsheet-box">
        <div class="profile-subsheet-header">
          <button class="profile-subsheet-back" type="button">‹ ${escH(user.nickname || '손님')}의 내 보드</button>
          <span class="profile-subsheet-title">${title}</span>
          <button class="profile-subsheet-close" type="button">✕</button>
        </div>
        <div class="profile-subsheet-body${bodyClass ? ' ' + bodyClass : ''}">${contentHtml}</div>
      </div>`;
    document.body.appendChild(sub);
    sub.querySelector('.profile-subsheet-back').addEventListener('click', () => sub.remove());
    sub.querySelector('.profile-subsheet-close').addEventListener('click', () => { sub.remove(); panel.remove(); _restoreMenuExpanded(); });
    sub.addEventListener('click', e => { if (e.target === sub) sub.remove(); });
    sub.querySelector('.profile-subsheet-header').addEventListener('click', e => { if (!e.target.closest('button')) sub.querySelector('.profile-subsheet-body')?.scrollTo({top:0,behavior:'smooth'}); });
    if (afterRender) afterRender(sub.querySelector('.profile-subsheet-body'));
  }

  // ── _markAllNotifSeen ─────────────────────────────────────────
  function _markAllNotifSeen(container = body) {
    if (window._cottageSess) {
      const _s = window._cottageSess.get(String(user.id));
      const _now = new Date().toISOString();
      _s.notifSeenAt = _now;
      _s.newGameSeenAt = _now;
      _s.voucherNoticeSeen = true;
      window._cottageSess.set(String(user.id), _s);
      window.CottageDB?.updateNotifSeenAt?.(String(user.id), _now);
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
    const _nBtn = body.querySelector('.profile-panel-notif-btn');
    if (_nBtn) { _nBtn.innerHTML = '🔔 알림'; _nBtn.classList.add('is-zero'); }
    _notifInnerHtml = _notifInnerHtml
      .replace(/\bis-new\b/g, '')
      .replace(/<span class="profile-notif-new-badge"[^>]*>NEW<\/span>/g, '')
      .replace(/<button class="notif-read-one-btn"[^>]*>읽음<\/button>/g, '')
      .replace(/<button class="profile-notif-confirm-all"[^>]*>모두 읽기<\/button>/, '')
      .replace(/<button class="profile-voucher-confirm"[^>]*>확인했어요<\/button>/, '');
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
      const _nvBtn = body.querySelector('.profile-panel-notif-btn');
      if (_nvBtn) { _nvBtn.innerHTML = '🔔 알림'; _nvBtn.classList.add('is-zero'); }
      container.querySelector('.profile-notif-confirm-all')?.remove();
      _notifInnerHtml = _notifInnerHtml
        .replace(/\bis-new\b/g, '')
        .replace(/<span class="profile-notif-new-badge"[^>]*>NEW<\/span>/g, '')
        .replace(/<button class="notif-read-one-btn"[^>]*>읽음<\/button>/g, '')
        .replace(/<button class="profile-notif-confirm-all"[^>]*>모두 읽기<\/button>/, '')
        .replace(/<button class="profile-voucher-confirm"[^>]*>확인했어요<\/button>/, '');
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
        _trackPvOnce('my-board-notif');
        const _notifTitle = '최근 소식';
        _openSubSheet(_notifTitle, _notifInnerHtml, subBody => {
          subBody.querySelector('.profile-notif-confirm-all')?.addEventListener('click', () => _markAllNotifSeen(subBody));
          subBody.querySelector('.profile-voucher-confirm')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelector('.profile-voucher-link')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelectorAll('.notif-read-one-btn').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); _markAllNotifSeen(subBody); });
          });
          subBody.querySelector('.profile-notif-more-btn')?.addEventListener('click', function() {
            const moreList = subBody.querySelector('.profile-notif-more-list');
            if (!moreList) return;
            const isHidden = moreList.classList.toggle('is-hidden');
            this.textContent = isHidden ? `외 ${this.dataset.more}건 더 보기 ▾` : '접기 ▴';
          });
          subBody.querySelectorAll('.profile-notif-list li.is-clickable').forEach(li => {
            li.addEventListener('click', e => {
              if (e.target.closest('button, a')) return;
              if (li.dataset.introUid) {
                openOtherMeetingSheet(li.dataset.introUid);
                return;
              }
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
        _trackPvOnce('my-board-growth');
        _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody));

      } else if (type === 'voucher') {
        _trackPvOnce('my-board-voucher');
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
        _trackPvOnce('my-board-taste');
        _openSubSheet('취향 보드', _tasteInnerHtml, subBody => {
          const userId = String(user.id);

          // ── 한줄 소개 ──
          const bioRow = subBody.querySelector('.taste-bio-row');
          const bioDisplay = subBody.querySelector('.taste-bio-display');
          const bioEditWrap = subBody.querySelector('.taste-bio-edit-wrap');
          const bioCustomInput = subBody.querySelector('.taste-bio-custom-input');
          const bioCustomTagsWrap = subBody.querySelector('.taste-bio-custom-tags');
          const _PREDEFINED_CHIPS = _BIO_PREDEFINED;

          // 재진입 시 _currentBio 클로저 값으로 display 갱신
          const _syncBioTags = _currentBio ? _currentBio.split(',').map(t => t.trim()).filter(Boolean) : [];
          bioDisplay.dataset.bio = _currentBio;
          bioDisplay.innerHTML = _syncBioTags.length
            ? _syncBioTags.map(t => `<span class="taste-bio-tag">${escH(t)}</span>`).join('')
            : '<span class="taste-bio-placeholder">소개를 추가해보세요</span>';

          function _renderBioDisplay(tags) {
            bioDisplay.innerHTML = tags.length
              ? tags.map(t => `<span class="taste-bio-tag">${escH(t)}</span>`).join('')
              : '<span class="taste-bio-placeholder">소개를 추가해보세요</span>';
          }

          function _renderCustomTags(customTags) {
            bioCustomTagsWrap.innerHTML = customTags.map(t =>
              `<span class="taste-bio-tag-edit" data-tag="${escH(t)}">${escH(t)}<button class="taste-bio-tag-remove" type="button" aria-label="삭제">✕</button></span>`
            ).join('');
            bioCustomTagsWrap.querySelectorAll('.taste-bio-tag-remove').forEach(btn => {
              btn.addEventListener('click', () => { btn.closest('.taste-bio-tag-edit').remove(); });
            });
          }

          subBody.querySelector('.taste-bio-edit-btn')?.addEventListener('click', () => {
            bioRow.style.display = 'none';
            bioEditWrap.style.display = '';
            const currentTags = [...new Set((bioDisplay.dataset.bio || '').split(',').map(t => t.trim()).filter(Boolean))];
            subBody.querySelectorAll('.taste-bio-chip').forEach(chip => {
              chip.classList.toggle('is-selected', currentTags.includes(chip.textContent.trim()));
            });
            const menuChipTexts = [...subBody.querySelectorAll('.taste-bio-chip')].map(c => c.textContent.trim());
            const customTags = currentTags.filter(t => !menuChipTexts.includes(t));
            _renderCustomTags(customTags);
            bioCustomInput.value = '';
            bioCustomInput.focus();
          });

          subBody.querySelectorAll('.taste-bio-chip').forEach(chip => {
            chip.addEventListener('click', () => { chip.classList.toggle('is-selected'); });
          });

          function _addCustomTag() {
            const val = bioCustomInput.value.trim();
            if (!val) return;
            const existing = [...bioCustomTagsWrap.querySelectorAll('.taste-bio-tag-edit')].map(el => el.dataset.tag);
            if (!existing.includes(val)) {
              _renderCustomTags([...existing, val]);
            }
            bioCustomInput.value = '';
            bioCustomInput.focus();
          }
          bioCustomInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _addCustomTag(); } });
          subBody.querySelector('.taste-bio-custom-add')?.addEventListener('click', _addCustomTag);

          subBody.querySelector('.taste-bio-cancel-btn')?.addEventListener('click', () => {
            bioRow.style.display = '';
            bioEditWrap.style.display = 'none';
          });

          subBody.querySelector('.taste-bio-save-btn')?.addEventListener('click', async () => {
            if (bioCustomInput?.value.trim()) {
              window.showToast?.('＋를 눌러 취향을 추가한 뒤 저장해 주세요') || alert('＋를 눌러 취향을 추가한 뒤 저장해 주세요');
              bioCustomInput.focus();
              return;
            }
            const selectedChips = [...subBody.querySelectorAll('.taste-bio-chip.is-selected')].map(c => c.textContent.trim());
            const customTags = [...bioCustomTagsWrap.querySelectorAll('.taste-bio-tag-edit')].map(el => el.dataset.tag);
            const allTags = [...new Set([...selectedChips, ...customTags])].slice(0, 6);
            const newBio = allTags.join(',');
            // 신규 커뮤니티 칩 감지 → 관리자 알림 (page_events 로그)
            const _allBioSet = new Set(allBioSuggestions || []);
            allTags.filter(t => !_PREDEFINED_CHIPS.includes(t) && !_allBioSet.has(t))
              .forEach(() => window.CottageDB?.trackEvent?.('new_bio_chip'));
            await window.CottageDB?.updateUserBio?.(userId, newBio);
            _currentBio = newBio;
            bioDisplay.dataset.bio = newBio;
            _renderBioDisplay(allTags);
            bioRow.style.display = '';
            bioEditWrap.style.display = 'none';
            // 메인 패널 취향 카드 요약 즉시 갱신
            const _newBioPreview = allTags.length
              ? `${allTags.slice(0, 2).map(t => `#${t}`).join(' ')}${allTags.length > 2 ? ` +${allTags.length - 2}` : ''}`
              : '';
            const _tasteSummary = panel.querySelector('.profile-card[data-subsheet="taste"] .profile-card-summary');
            if (_tasteSummary) {
              const _bioRow = _tasteSummary.querySelector('.profile-card-bio-row');
              if (_newBioPreview) {
                if (_bioRow) _bioRow.textContent = _newBioPreview;
                else _tasteSummary.insertAdjacentHTML('afterbegin', `<span class="profile-card-bio-row">${escH(_newBioPreview)}</span>`);
              } else if (_bioRow) {
                _bioRow.remove();
              }
            }
          });

          // ── 게임 목록 (좋아요·관심) — 원천 관리(game_likes/curious) ──
          // 칩 1개 추가 (검색 모달 공용)
          const _appendTasteChip = (listEl, countEl, gameId, customName) => {
            const _gd = gameId ? window.gameData?.[gameId] : null;
            const name = _gd ? (_gd.title?.display || _gd.title?.owned || _gd.title?.bgg || String(gameId)) : (customName || '');
            const thumb = _gd?.images?.thumbnail
              ? `<img class="taste-game-thumb" src="${escH(_gd.images.thumbnail)}" alt="">`
              : `<span class="taste-game-thumb-empty"></span>`;
            listEl.querySelector('.taste-game-empty')?.remove();
            const newItem = document.createElement('div');
            newItem.className = `taste-game-item${gameId ? ' taste-game-item--clickable' : ''}`;
            if (gameId) newItem.dataset.gameId = gameId;
            if (customName) newItem.dataset.customName = customName;
            const ruleKey = gameId ? `id:${gameId}` : `cn:${customName || ''}`;
            const ruleOn = _ruleSet?.has(ruleKey) ? ' is-on' : '';
            newItem.innerHTML = `${thumb}<span class="taste-game-name">${escH(name)}</span><button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button><button class="taste-game-del" type="button" title="삭제">✕</button>`;
            if (gameId) {
              newItem.querySelector('.taste-game-thumb, .taste-game-thumb-empty')?.addEventListener('click', () => {
                window.ensureGameSheet?.();
                window.openGameSheet?.(String(gameId));
              });
            }
            const insertBefore = listEl.querySelector('.taste-game-more-wrap') || listEl.querySelector('.taste-more-btn');
            if (insertBefore) listEl.insertBefore(newItem, insertBefore);
            else listEl.appendChild(newItem);
            if (countEl) countEl.textContent = `${listEl.querySelectorAll('.taste-game-item').length}개`;
          };

          // 취향보드 게임 추가 센터모달 (검색 초성 + 직접입력 — 원천 등록, 날짜·퀵픽 없음)
          const _openTasteAddModal = ({ listKey, table, listEl, countEl }) => {
            document.getElementById('mbAddModal')?.remove();
            const isLiked = listKey === 'liked';
            const overlay = document.createElement('div');
            overlay.id = 'mbAddModal';
            overlay.className = 'mb-add-overlay';
            overlay.innerHTML = `
              <div class="mb-add-box">
                <div class="mb-add-head">
                  <span class="mb-add-title">${isLiked ? '❤️ 좋아하는 게임' : '👀 해보고 싶은 게임'} 추가</span>
                  <button class="mb-add-close" type="button" aria-label="닫기">✕</button>
                </div>
                <input class="mb-add-input" type="text" placeholder="게임 이름 검색 (초성 가능)" autocomplete="off">
                <div class="mb-add-results"></div>
              </div>`;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('.mb-add-input');
            const resultsEl = overlay.querySelector('.mb-add-results');
            const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
            const onEsc = e => { if (e.key === 'Escape') close(); };
            overlay.querySelector('.mb-add-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', onEsc);

            const inList = (gameId, customName) => {
              if (gameId) return !!listEl.querySelector(`[data-game-id="${gameId}"]`);
              if (customName) return [...listEl.querySelectorAll('[data-custom-name]')].some(el => el.dataset.customName === customName);
              return false;
            };
            const addGame = async (gameId, customName) => {
              if (inList(gameId, customName)) return;
              await window.CottageDB?.addGamePref?.(userId, gameId, customName, table);
              _appendTasteChip(listEl, countEl, gameId, customName);
              _emitLikesChanged(table, gameId, true);
              if (gameId) {
                const b = resultsEl.querySelector(`.taste-search-item[data-game-id="${gameId}"]`);
                if (b && !b.classList.contains('is-added')) { b.classList.add('is-added'); b.insertAdjacentHTML('beforeend', ' <span class="taste-search-added-label">추가됨</span>'); }
              }
            };

            const _smart = window.matchKoreanSmart;
            let _t = null;
            input.addEventListener('input', () => {
              clearTimeout(_t);
              _t = setTimeout(async () => {
                const q = input.value.trim();
                if (!q) { resultsEl.innerHTML = ''; return; }
                const matches = Object.entries(window.gameData || {}).filter(([, g]) => {
                  const nm = g.title?.display || g.title?.owned || g.title?.bgg || '';
                  return _smart ? _smart(nm, q) : nm.toLowerCase().includes(q.toLowerCase());
                }).slice(0, 8);
                const items = matches.map(([id, g]) => {
                  const nm = escH(g.title?.display || g.title?.owned || g.title?.bgg || String(id));
                  const added = inList(id, null);
                  return `<button class="taste-search-item${added ? ' is-added' : ''}" data-game-id="${escH(id)}" type="button">${nm}${added ? ' <span class="taste-search-added-label">추가됨</span>' : ''}</button>`;
                });
                const suggestions = await (window.CottageDB?.getCustomPrefSuggestions?.() || Promise.resolve([])).catch(() => []);
                const customItems = suggestions.filter(n => (_smart ? _smart(n, q) : n.toLowerCase().includes(q.toLowerCase()))).slice(0, 3)
                  .map(n => `<button class="taste-search-item" data-custom-name="${escH(n)}" type="button">${escH(n)} <span class="taste-search-custom-label">직접입력</span></button>`);
                const direct = `<button class="taste-search-direct" data-custom-name="${escH(q)}" type="button">+ "${escH(q)}" 직접 추가</button>`;
                resultsEl.innerHTML = [...items, ...customItems, direct].join('');
                resultsEl.querySelectorAll('[data-game-id],[data-custom-name]').forEach(btn =>
                  btn.addEventListener('click', () => addGame(btn.dataset.gameId || null, btn.dataset.customName || null)));
              }, 180);
            });
            setTimeout(() => input.focus(), 50);
          };

          for (const listType of ['liked', 'curious']) {
            const table = listType === 'liked' ? 'game_likes' : 'game_curious';
            const listEl = subBody.querySelector(`#taste${listType}List`);
            const addBtn = subBody.querySelector(`#taste${listType}AddBtn`);
            const countEl = subBody.querySelector(`#taste${listType}Count`);

            // 썸네일만 클릭 → 게임 시트
            listEl?.querySelectorAll('.taste-game-item--clickable').forEach(item => {
              item.querySelector('.taste-game-thumb, .taste-game-thumb-empty')?.addEventListener('click', () => {
                window.ensureGameSheet?.();
                window.openGameSheet?.(item.dataset.gameId);
              });
            });

            // 위임: 더보기 / 📖 룰토글(양방향 공유) / ✕ 삭제(확인)
            listEl?.addEventListener('click', async e => {
              const moreBtn = e.target.closest('.taste-more-btn');
              if (moreBtn) {
                const wrap = moreBtn.previousElementSibling;
                if (wrap?.classList.contains('taste-game-more-wrap')) {
                  const hidden = wrap.hidden;
                  wrap.hidden = !hidden;
                  const restCount = wrap.querySelectorAll('.taste-game-item').length;
                  moreBtn.textContent = hidden ? '접기' : `더 보기 (${restCount}개 더)`;
                }
                return;
              }
              const ruleBtn = e.target.closest('.mb-rule-btn');
              if (ruleBtn) {
                const item = ruleBtn.closest('.taste-game-item');
                const gameId = item?.dataset.gameId || null;
                const customName = item?.dataset.customName || null;
                const gameName = item?.querySelector('.taste-game-name')?.textContent || '이 게임';
                const isOn = ruleBtn.classList.toggle('is-on');
                if (isOn) {
                  await window.CottageDB?.addMeetingGamePref?.(userId, 'can_explain_rules', gameId, customName);
                  window.showToast?.(`📖 '${gameName}' 룰 설명해줄 수 있어요로 표시했어요`);
                } else {
                  await window.CottageDB?.removeMeetingGamePref?.(userId, 'can_explain_rules', gameId, customName);
                  window.showToast?.(`'${gameName}' 룰 설명 표시를 해제했어요`);
                }
                return;
              }
              const delBtn = e.target.closest('.taste-game-del');
              if (!delBtn) return;
              const item = delBtn.closest('.taste-game-item');
              const gameName = item?.querySelector('.taste-game-name')?.textContent || '이 게임';
              if (!confirm(`'${gameName}'을(를) 목록에서 뺄까요?`)) return;
              const gameId = item?.dataset.gameId || null;
              const customName = item?.dataset.customName || null;
              await window.CottageDB?.removeGamePref?.(userId, gameId, customName, table);
              item.remove();
              if (!listEl.querySelector('.taste-game-item')) {
                listEl.innerHTML = '<p class="taste-game-empty">아직 추가된 게임이 없어요</p>';
              }
              if (countEl) countEl.textContent = `${listEl.querySelectorAll('.taste-game-item').length}개`;
              _emitLikesChanged(table, gameId, false);
            });

            addBtn?.addEventListener('click', () => _openTasteAddModal({ listKey: listType, table, listEl, countEl }));
          }

          // 다른 화면(게임시트 등)에서 좋아요/궁금해요가 바뀌면 이 목록도 즉시 반영
          if (window.__tasteLikesHandler) window.removeEventListener('cottage-likes-changed', window.__tasteLikesHandler);
          const _onTasteLikesChanged = (e) => {
            const anchorList = subBody.querySelector('#tastelikedList');
            if (!anchorList || !document.body.contains(anchorList)) { window.removeEventListener('cottage-likes-changed', _onTasteLikesChanged); return; }
            const { table, gameId, added } = e.detail || {};
            if (!gameId) return;
            const lk = table === 'game_likes' ? 'liked' : (table === 'game_curious' ? 'curious' : null);
            if (!lk) return;
            const listEl = subBody.querySelector(`#taste${lk}List`);
            const countEl = subBody.querySelector(`#taste${lk}Count`);
            if (!listEl) return;
            const existing = listEl.querySelector(`[data-game-id="${CSS.escape(String(gameId))}"]`);
            if (added && !existing) {
              _appendTasteChip(listEl, countEl, String(gameId), null);
            } else if (!added && existing) {
              existing.remove();
              if (!listEl.querySelector('.taste-game-item')) listEl.innerHTML = '<p class="taste-game-empty">아직 추가된 게임이 없어요</p>';
              if (countEl) countEl.textContent = `${listEl.querySelectorAll('.taste-game-item').length}개`;
            }
          };
          window.__tasteLikesHandler = _onTasteLikesChanged;
          window.addEventListener('cottage-likes-changed', _onTasteLikesChanged);

          // ── 피하는 유형 태그 ──
          let currentAvoidTags = [...(_avoidTags)];
          const _avoidCountEl = subBody.querySelector('.taste-avoid-count');
          const _updateAvoidCount = () => {
            if (_avoidCountEl) _avoidCountEl.textContent = currentAvoidTags.length > 0 ? `${currentAvoidTags.length}개 선택됨` : '';
          };
          subBody.querySelectorAll('.taste-tag').forEach(btn => {
            btn.addEventListener('click', async () => {
              const tag = btn.dataset.tag;
              const idx = currentAvoidTags.indexOf(tag);
              if (idx >= 0) {
                currentAvoidTags.splice(idx, 1);
                btn.classList.remove('is-active');
                btn.textContent = tag;
              } else {
                currentAvoidTags.push(tag);
                btn.classList.add('is-active');
                btn.textContent = `🚫 ${tag}`;
              }
              _updateAvoidCount();
              await window.CottageDB?.updateUserAvoidTags?.(userId, currentAvoidTags);
            });
          });
          // 피하는 유형 더보기 버튼
          subBody.querySelector('.taste-avoid-more-btn')?.addEventListener('click', function() {
            const wrap = subBody.querySelector('.taste-avoid-more-wrap');
            if (!wrap) return;
            const isHidden = wrap.hasAttribute('hidden');
            if (isHidden) { wrap.removeAttribute('hidden'); this.textContent = '접기'; }
            else { wrap.setAttribute('hidden', ''); this.textContent = `더 보기 (${wrap.querySelectorAll('.taste-tag').length}개 더)`; }
          });

          // ── 피하는 유형 직접입력 ──
          const avoidCustomInput = subBody.querySelector('.taste-avoid-custom-input');
          function _attachAvoidTagBtn(btn, tag) {
            btn.addEventListener('click', async () => {
              const idx = currentAvoidTags.indexOf(tag);
              if (idx >= 0) { currentAvoidTags.splice(idx, 1); btn.classList.remove('is-active'); btn.textContent = tag; }
              else { currentAvoidTags.push(tag); btn.classList.add('is-active'); btn.textContent = `🚫 ${tag}`; }
              _updateAvoidCount();
              await window.CottageDB?.updateUserAvoidTags?.(userId, currentAvoidTags);
            });
          }
          async function _addCustomAvoidTag() {
            const val = avoidCustomInput.value.trim();
            if (!val || subBody.querySelector(`.taste-tag[data-tag="${CSS.escape(val)}"]`)) { avoidCustomInput.value = ''; return; }
            currentAvoidTags.push(val);
            const btn = document.createElement('button');
            btn.className = 'taste-tag is-active';
            btn.dataset.tag = val;
            btn.type = 'button';
            btn.textContent = `🚫 ${val}`;
            _attachAvoidTagBtn(btn, val);
            let moreWrap = subBody.querySelector('.taste-avoid-more-wrap');
            if (moreWrap) {
              moreWrap.appendChild(btn);
              moreWrap.removeAttribute('hidden');
              const moreBtn = subBody.querySelector('.taste-avoid-more-btn');
              if (moreBtn) moreBtn.textContent = '접기';
            } else {
              subBody.querySelector('.taste-tag-grid')?.appendChild(btn);
            }
            _updateAvoidCount();
            await window.CottageDB?.updateUserAvoidTags?.(userId, currentAvoidTags);
            avoidCustomInput.value = '';
          }
          avoidCustomInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _addCustomAvoidTag(); } });
          subBody.querySelector('.taste-avoid-custom-add')?.addEventListener('click', _addCustomAvoidTag);

          // ── 커뮤니티 bio 칩 동적 추가 ──
          const _communityBioChips = (allBioSuggestions || []).filter(t => !_PREDEFINED_CHIPS.includes(t));
          if (_communityBioChips.length > 0) {
            const _chipsContainer = subBody.querySelector('.taste-bio-chips');
            if (_chipsContainer) {
              _communityBioChips.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'taste-bio-chip';
                btn.type = 'button';
                btn.textContent = t;
                if ((_currentBio || '').split(',').map(s => s.trim()).includes(t)) btn.classList.add('is-selected');
                btn.addEventListener('click', () => btn.classList.toggle('is-selected'));

                const delBtn = document.createElement('button');
                delBtn.className = 'taste-bio-chip-del';
                delBtn.type = 'button';
                delBtn.textContent = '×';
                delBtn.setAttribute('aria-label', '메뉴에서 제거');
                delBtn.addEventListener('click', e => {
                  e.stopPropagation();
                  if (!confirm(`"${t}"은(는) 다른 사용자도 사용 중일 수 있습니다. 내 화면에서 제거하시겠습니까?`)) return;
                  wrap.remove();
                  bioCustomTagsWrap?.querySelectorAll('.taste-bio-tag-edit').forEach(tag => {
                    if (tag.dataset.tag === t) tag.remove();
                  });
                });

                const wrap = document.createElement('span');
                wrap.className = 'taste-bio-chip-wrap';
                wrap.appendChild(btn);
                wrap.appendChild(delBtn);
                _chipsContainer.appendChild(wrap);
              });
            }
          }
        });

      } else if (type === 'records') {
        _trackPvOnce('my-board-records');
        _openSubSheet('기록 보드', _recordInnerHtml, subBody => {
          _bindActivityTogglesAndMore(subBody);
          // 게임평 더보기/닫기 — 토글 클릭으로 activity list 열린 후 측정
          const _bindReviewToggles = container => {
            container.querySelectorAll('.profile-review-text').forEach(el => {
              if (el.dataset.toggleBound) return;
              el.dataset.toggleBound = '1';
              const needsToggle = el.scrollHeight > el.clientHeight + 3;
              if (!needsToggle) return;
              const btn = document.createElement('button');
              btn.className = 'profile-review-toggle-btn'; btn.type = 'button'; btn.textContent = '더보기';
              el.after(btn);
              btn.addEventListener('click', e => {
                e.stopPropagation();
                const exp = el.classList.toggle('is-expanded');
                btn.textContent = exp ? '접기' : '더보기';
              });
            });
          };
          _bindReviewToggles(subBody);
          subBody.addEventListener('click', e => {
            if (e.target.classList.contains('profile-more-btn')) setTimeout(() => _bindReviewToggles(subBody), 0);
          });
          subBody.querySelectorAll('.profile-activity-toggle, .profile-sub-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => setTimeout(() => _bindReviewToggles(subBody), 0));
          });
          // 게임명 + 썸네일 클릭 → 게임 기록 시트
          subBody.querySelectorAll('.profile-activity-item[data-game-id]').forEach(li => {
            const gameId = li.dataset.gameId;
            if (!gameId) return;
            const openSheet = () => {
              const key = _getGameKeyById(gameId);
              if (!key) return;
              window.ensureGameSheet?.();
              window.openGameRecordSheet?.(key);
            };
            li.querySelector('.profile-game-link')?.addEventListener('click', openSheet);
            li.querySelector('.profile-record-thumb, .profile-record-thumb-empty')?.addEventListener('click', openSheet);
          });
          // 더보기/접기 — 라이트박스 기능(play-records-utils.js) 유무와 무관하게 항상 동작
          const _moreBadge = subBody.querySelector('.record-photo-more-badge');
          if (_moreBadge) {
            const _hiddenTotal = _allPhotoData.length - _PHOTO_SHOW;
            let _photoExpanded = false;
            _moreBadge.addEventListener('click', e => {
              e.stopPropagation();
              _photoExpanded = !_photoExpanded;
              subBody.querySelectorAll('.record-photo-thumb').forEach(img => {
                const idx = parseInt(img.dataset.photoIdx || '0', 10);
                if (idx >= _PHOTO_SHOW) img.classList.toggle('record-photo-hidden', !_photoExpanded);
              });
              _moreBadge.textContent = _photoExpanded ? '접기' : `더 보기 (${_hiddenTotal}장 더)`;
            });
          }
          // 사진 클릭 → 라이트박스 (캡션+삭제 포함)
          if (window.openLightbox && _allPhotoData.length) {
            const _myId = String(window.getKakaoUser?.()?.id || '');
            const _escC = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
            const _buildPhotoCaption = d => {
              const lines = [];
              if (d.nickname) lines.push(_escC(d.nickname));
              const l1 = [d.group_name, d.played_at ? d.played_at.slice(2,10).replace(/-/g,'.') : ''].filter(Boolean).join(' · ');
              if (l1) lines.push(l1);
              const l2 = [d.player_count ? d.player_count+'명' : '', d.player_names, d.play_time_min ? d.play_time_min+'분' : ''].filter(Boolean).join(' · ');
              if (l2) lines.push(l2);
              if (d.score_note) lines.push(_escC(d.score_note));
              return lines.join('<br>');
            };
            const _photoUrls = _allPhotoData.map(d => d.url);
            const _photoCaptions = _allPhotoData.map(_buildPhotoCaption);
            const _deletable = _allPhotoData.map(d => !!(_myId && d.user_id && String(d.user_id) === _myId));
            // 라이트박스 좌하단 게임 썸네일 — 사진별 해당 게임 표지 + 클릭 시 게임 기록 시트
            const _photoGameKeys = _allPhotoData.map(d => d.game_id ? _getGameKeyById(d.game_id) : null);
            const _photoGameThumbs = _photoGameKeys.map(k => k ? (window.gameData?.[k]?.images?.thumbnail || null) : null);
            const _lbOpts = {
              captions: _photoCaptions,
              gameThumbs: _photoGameThumbs,
              gameKeys: _photoGameKeys,
              onGameClick: key => { if (!key) return; window.ensureGameSheet?.(); window.openGameRecordSheet?.(key); },
            };
            if (_deletable.some(Boolean)) {
              _lbOpts.deletable = _deletable;
              _lbOpts.onDelete = async delIdx => {
                const d = _allPhotoData[delIdx];
                if (!d || !window.CottageDB) return;
                const forRec = _allPhotoData.filter(x => x.record_id === d.record_id);
                const rem = forRec.filter(x => x !== d).map(x => x.url);
                const newUrl = rem.length === 0 ? null : rem.length === 1 ? rem[0] : JSON.stringify(rem);
                await window.CottageDB.updateGamePlay(d.record_id, { photo_url: newUrl });
                _allPhotoData.splice(delIdx, 1);
              };
            }
            subBody.querySelectorAll('.record-photo-thumb').forEach(img => {
              img.addEventListener('click', () => {
                const idx = parseInt(img.dataset.photoIdx || '0', 10);
                window.openLightbox(_photoUrls, idx, _lbOpts);
              });
            });
          }
        }, 'profile-subsheet-body--records');


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

      } else if (type === 'meeting') {
        _trackPvOnce('my-board-meeting');
        _openSubSheet('모임 보드', _meetingInnerHtml, subBody => {
          const userId = String(user.id);

          // ── 모임 프로필 (활동지역/참여시간/이동범위/한줄소개/스타일) 편집 ──
          const displayWrap = subBody.querySelector('.meeting-profile-display');
          const editWrap = subBody.querySelector('.meeting-profile-edit-wrap');

          subBody.querySelector('.meeting-profile-edit-btn')?.addEventListener('click', () => {
            displayWrap.style.display = 'none';
            editWrap.style.display = '';
          });
          subBody.querySelector('.meeting-profile-cancel-btn')?.addEventListener('click', () => {
            displayWrap.style.display = '';
            editWrap.style.display = 'none';
          });
          // 선호(한줄소개)/비선호(피하는 유형) 수정 → 취향보드 열기
          subBody.querySelectorAll('.mb-pref-edit').forEach(btn => {
            btn.addEventListener('click', () => {
              const savedScroll = subBody.scrollTop; // 되돌아왔을 때 복원할 위치
              const isAvoid = btn.dataset.pref === 'avoid';
              // 취향 서브시트로 전환(기존 카드 경로 재사용) — 모임보드에서 왔으므로 뒤로가기를 "모임 보드"로 재지정
              body.querySelector('.profile-card[data-subsheet="taste"]')?.click();
              const tasteSub = document.getElementById('profileSubSheet');
              const back = tasteSub?.querySelector('.profile-subsheet-back');
              if (back) {
                back.textContent = '‹ 모임 보드';
                const fresh = back.cloneNode(true); // 원래 back 핸들러(→ 메인 패널) 제거
                back.replaceWith(fresh);
                fresh.addEventListener('click', () => {
                  _pendingMeetingScrollTop = savedScroll; // 모임보드 재렌더 후 복원(_loadMeetingWeek 말미)
                  tasteSub.remove();
                  body.querySelector('.profile-card[data-subsheet="meeting"]')?.click();
                });
              }
              // 비선호쪽에서 왔으면 취향보드를 피하는 유형 섹션으로 스크롤해서 진입
              if (isAvoid) {
                const tBody = tasteSub?.querySelector('.profile-subsheet-body');
                const avoidSec = tBody?.querySelector('.taste-avoid-section');
                if (tBody && avoidSec) {
                  tBody.scrollTop = avoidSec.getBoundingClientRect().top - tBody.getBoundingClientRect().top + tBody.scrollTop;
                }
              }
            });
          });

          subBody.querySelector('.meeting-profile-save-btn')?.addEventListener('click', async () => {
            const location = subBody.querySelector('.meeting-edit-location').value.trim();
            const available = subBody.querySelector('.meeting-edit-available').value.trim();
            const travelRange = subBody.querySelector('.meeting-edit-travel').value.trim();

            // bio(한줄소개)는 취향보드에서 편집(선호 스타일). 여기선 로지스틱 정보만 저장.
            await window.CottageDB?.upsertMeetingIntro?.(userId, {
              // 자기소개 페이지에서 설정한 닉네임(단톡방 닉네임 등 카카오 닉네임과 다를 수 있음)이 있으면 보존
              nickname: _meeting.nickname || user.nickname || '',
              location: location || null,
              available: available || null,
              travel_range: travelRange || null,
            });

            displayWrap.innerHTML = `
              ${_meetingProfileRowHtml('📍 활동 지역', location)}
              ${_meetingProfileRowHtml('🕐 참여 가능 시간', available)}
              ${_meetingProfileRowHtml('🚗 이동 가능 범위', travelRange)}`;
            displayWrap.style.display = '';
            editWrap.style.display = 'none';
          });

          // ── 이번 주 하고싶은/배우고싶은 게임 (meeting_vote_games 소스, game_likes 미러 아님) ──
          // 이번 주 플래너 데이터는 _loadMeetingWeek에서 1회 fetch → _weekData로 공유(재조회 없음)
          let _weekData = { allV: [], allVG: [], myVotes: [], myVoteGames: [] };
          const _likedSlugSet = new Set((_meeting.likedGames || []).map(g => g.game_id).filter(Boolean).map(String));
          const _curiousSlugSet = new Set((_meeting.curiousGames || []).map(g => g.game_id).filter(Boolean).map(String));
          const _DOWs = '일월화수목금토';
          const _fmtLocalD = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const _mbSlug = rawId => {
            if (rawId == null) return null;
            const clean = String(rawId).startsWith('#') ? String(rawId).slice(1) : String(rawId);
            return _getGameKeyById(clean) || clean;
          };
          // 이번 주 7일 (월~일)
          const _mbWeek = (() => {
            const t0 = new Date(); t0.setHours(0,0,0,0);
            const mon = new Date(t0); mon.setDate(t0.getDate() + (t0.getDay() === 0 ? -6 : 1 - t0.getDay()));
            return Array.from({ length: 7 }, (_, i) => {
              const d = new Date(mon); d.setDate(mon.getDate() + i);
              return { ds: _fmtLocalD(d), label: _DOWs[d.getDay()], md: `${d.getMonth()+1}/${d.getDate()}`, past: d < t0 };
            });
          })();

          // vote_games(list_type) → 게임별 그룹 (이름/요일/좋아요·룰 상태)
          const _groupWeekGames = (listType, srcSet) => {
            const map = new Map();
            for (const g of _weekData.myVoteGames) {
              if ((g.list_type === 'want' ? 'want' : 'learn') !== listType) continue;
              const slug = g.game_id != null ? _mbSlug(g.game_id) : null;
              const key = slug ? `id:${slug}` : `cn:${g.custom_name || ''}`;
              if (!map.has(key)) map.set(key, { slug, customName: g.custom_name || null, dates: new Set() });
              map.get(key).dates.add(g.vote_date);
            }
            return [...map.values()].map(e => {
              const gd = e.slug ? window.gameData?.[e.slug] : null;
              const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || e.slug) : (e.customName || e.slug || '');
              const dateList = _mbWeek.map(w => w.ds).filter(ds => e.dates.has(ds));
              const days = dateList.map(ds => _mbWeek.find(w => w.ds === ds)?.label).filter(Boolean).join('·');
              const ruleKey = e.slug ? `id:${e.slug}` : `cn:${e.customName || ''}`;
              return {
                slug: e.slug, customName: e.customName, name,
                thumbUrl: gd?.images?.thumbnail || null,
                dates: dateList, days,
                isSource: e.slug ? srcSet.has(e.slug) : false,
                ruleOn: _ruleSet.has(ruleKey),
              };
            });
          };

          const _buildWeekChipHtml = (it, markIcon) => {
            const thumb = it.thumbUrl ? `<img class="taste-game-thumb" src="${escH(it.thumbUrl)}" alt="">` : `<span class="taste-game-thumb-empty"></span>`;
            const clickable = it.slug ? ' taste-game-item--clickable' : '';
            const gidAttr = it.slug ? ` data-game-id="${escH(it.slug)}"` : '';
            const cnAttr = it.customName ? ` data-custom-name="${escH(it.customName)}"` : '';
            const mark = it.isSource ? `<span class="mb-like-mark" title="내 목록에 있는 게임">${markIcon}</span>` : '';
            const badge = it.days ? `<span class="mb-week-badge">(${it.days})</span>` : '';
            const ruleOn = it.ruleOn ? ' is-on' : '';
            return `<div class="taste-game-item mb-week-game${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(it.name)}</span>${mark}${badge}<button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button><button class="mb-kebab-btn" type="button" title="이번 주 일정 관리" aria-label="메뉴">⋯</button></div>`;
          };

          const _renderWeekList = (listType) => {
            const listId = listType === 'want' ? 'meetinglikedList' : 'meetingcuriousList';
            const countId = listType === 'want' ? 'meetinglikedCount' : 'meetingcuriousCount';
            const srcSet = listType === 'want' ? _likedSlugSet : _curiousSlugSet;
            const markIcon = listType === 'want' ? '❤️' : '👀';
            const listEl = subBody.querySelector('#' + listId);
            const countEl = subBody.querySelector('#' + countId);
            if (!listEl) return;
            const items = _groupWeekGames(listType, srcSet);
            listEl.innerHTML = items.length
              ? items.map(it => _buildWeekChipHtml(it, markIcon)).join('')
              : '<p class="taste-game-empty">＋ 버튼으로 이번 주 하고 싶은 게임을 추가해보세요</p>';
            if (countEl) countEl.textContent = `${items.length}개`;
          };

          // 요일 선택(참여 등록한 날 내에서, 최소 1개) — 추가/수정 공용
          const _openMbDayPicker = ({ slug, customName, name, listType }, curDates, onDone) => {
            const partDays = _mbWeek.filter(w => !w.past && _weekData.myVotes.some(v => v.vote_date === w.ds));
            const overlay = document.createElement('div');
            overlay.className = 'mb-add-overlay';
            const vgId = slug ? (window.gameData?.[slug]?.bgg?.id ?? null) : null;
            const vgCustom = vgId != null ? null : (customName || name);
            const close = () => overlay.remove();
            if (!partDays.length) {
              overlay.innerHTML = `<div class="mb-add-box"><div class="mb-add-head"><span class="mb-add-title">🗓️ 요일 선택</span><button class="mb-add-close" type="button">✕</button></div><p class="mb-daypick-empty">먼저 이번 주 참여 가능한 날을 등록해주세요.<br>플래너에서 참여 요일을 정하면 그날 하고 싶은 게임을 고를 수 있어요.</p><button class="mb-add-daypick-done" type="button">플래너 열기</button></div>`;
              document.body.appendChild(overlay);
              overlay.querySelector('.mb-add-close').addEventListener('click', close);
              overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
              overlay.querySelector('.mb-add-daypick-done').addEventListener('click', () => { close(); window.openPlannerModal?.({ weekOffset: 0, onDirtyClose: _loadMeetingWeek }); });
              return;
            }
            const selected = new Set(curDates || []);
            overlay.innerHTML = `<div class="mb-add-box">
              <div class="mb-add-head"><span class="mb-add-title">🗓️ '${escH(name)}' 이번 주 언제 할까요?</span><button class="mb-add-close" type="button">✕</button></div>
              <div class="mb-add-daypick-days">${partDays.map(w => `<button class="mb-day-chip${selected.has(w.ds) ? ' is-selected' : ''}" data-date="${w.ds}" type="button"><span class="mb-day-dow">${w.label}</span><span class="mb-day-md">${w.md}</span></button>`).join('')}</div>
              <p class="mb-add-daypick-hint">참여 등록한 날 중에서 골라요 (최소 1개)</p>
              <button class="mb-add-daypick-done" type="button">완료</button>
            </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('.mb-add-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            overlay.querySelectorAll('.mb-day-chip').forEach(chip => chip.addEventListener('click', () => {
              const ds = chip.dataset.date;
              if (selected.has(ds)) { selected.delete(ds); chip.classList.remove('is-selected'); }
              else { selected.add(ds); chip.classList.add('is-selected'); }
            }));
            overlay.querySelector('.mb-add-daypick-done').addEventListener('click', async () => {
              const finalDates = [...selected];
              const cur = new Set(curDates || []);
              if (!finalDates.length) { window.showToast?.('요일을 최소 1개 골라주세요'); return; }
              const add = finalDates.filter(d => !cur.has(d));
              const del = [...cur].filter(d => !selected.has(d));
              for (const d of add) await window.CottageDB?.addMeetingVoteGame?.(userId, d, listType, vgId, vgCustom);
              for (const d of del) await window.CottageDB?.removeMeetingVoteGame?.(userId, d, listType, vgId, vgCustom);
              _weekData.myVoteGames = _weekData.myVoteGames.filter(g => {
                const gslug = g.game_id != null ? _mbSlug(g.game_id) : null;
                const same = (slug ? gslug === slug : (g.custom_name === (customName || name))) && g.list_type === listType;
                return !(same && del.includes(g.vote_date));
              });
              add.forEach(d => _weekData.myVoteGames.push({ user_id: userId, vote_date: d, list_type: listType, game_id: vgId, custom_name: vgCustom }));
              close();
              _renderWeekList(listType);
              onDone?.(finalDates);
            });
          };

          // ⋯ 케밥 메뉴 (fixed 포지션 — 서브시트 overflow 클리핑 회피)
          const _openMbKebab = (btn, ctx) => {
            document.getElementById('__mbKebab')?.remove();
            const menu = document.createElement('div');
            menu.id = '__mbKebab';
            menu.className = 'mb-kebab-menu';
            menu.innerHTML = `<button class="mb-kebab-item" data-act="edit" type="button">🗓️ 이번 주 일정 수정</button><button class="mb-kebab-item mb-kebab-item--danger" data-act="remove" type="button">🗑️ 이번 주에서 빼기</button>`;
            document.body.appendChild(menu);
            const r = btn.getBoundingClientRect();
            menu.style.top = `${r.bottom + 4}px`;
            menu.style.left = `${Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8))}px`;
            const closeMenu = () => { menu.remove(); document.removeEventListener('click', onDoc, true); };
            const onDoc = e => { if (!menu.contains(e.target)) closeMenu(); };
            setTimeout(() => document.addEventListener('click', onDoc, true), 0);
            menu.querySelector('[data-act="edit"]').addEventListener('click', () => { closeMenu(); _openMbDayPicker(ctx, ctx.dates); });
            menu.querySelector('[data-act="remove"]').addEventListener('click', async () => {
              closeMenu();
              if (!confirm(`'${ctx.name}'을(를) 이번 주 일정에서 뺄까요?`)) return;
              const vgId = ctx.slug ? (window.gameData?.[ctx.slug]?.bgg?.id ?? null) : null;
              const vgCustom = vgId != null ? null : (ctx.customName || ctx.name);
              for (const d of ctx.dates) await window.CottageDB?.removeMeetingVoteGame?.(userId, d, ctx.listType, vgId, vgCustom);
              _weekData.myVoteGames = _weekData.myVoteGames.filter(g => {
                const gslug = g.game_id != null ? _mbSlug(g.game_id) : null;
                const same = (ctx.slug ? gslug === ctx.slug : (g.custom_name === (ctx.customName || ctx.name))) && g.list_type === ctx.listType;
                return !same;
              });
              _renderWeekList(ctx.listType);
            });
          };

          // 게임 추가 센터모달 — 검색/퀵픽 → 요일 필수 → (미등록 카탈로그 게임이면) 좋아요 옵션
          const _openMbAddModal = (listType) => {
            document.getElementById('mbAddModal')?.remove();
            const isWant = listType === 'want';
            const srcSet = isWant ? _likedSlugSet : _curiousSlugSet;
            const srcTable = isWant ? 'game_likes' : 'game_curious';
            const srcLabel = isWant ? '좋아하는 게임' : '해보고 싶은 게임';
            const overlay = document.createElement('div');
            overlay.id = 'mbAddModal';
            overlay.className = 'mb-add-overlay';
            overlay.innerHTML = `<div class="mb-add-box">
              <div class="mb-add-head"><span class="mb-add-title">${isWant ? '❤️ 이번 주 하고 싶은 게임' : '💡 이번 주 배우고 싶은 게임'} 추가</span><button class="mb-add-close" type="button">✕</button></div>
              <input class="mb-add-input" type="text" placeholder="게임 이름 검색 (초성 가능)" autocomplete="off">
              <div class="mb-add-results"></div>
              <div class="mb-add-quick-wrap"><div class="mb-add-quick-label">${isWant ? '❤️' : '👀'} 내 ${srcLabel}</div><div class="mb-add-quick"></div></div>
            </div>`;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('.mb-add-input');
            const resultsEl = overlay.querySelector('.mb-add-results');
            const quickEl = overlay.querySelector('.mb-add-quick');
            const quickWrap = overlay.querySelector('.mb-add-quick-wrap');
            const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
            const onEsc = e => { if (e.key === 'Escape') close(); };
            overlay.querySelector('.mb-add-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', onEsc);

            const inWeek = () => new Set(_groupWeekGames(listType, srcSet).map(it => it.slug).filter(Boolean));
            const pickGame = (slug, customName) => {
              const gd = slug ? window.gameData?.[slug] : null;
              const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || slug) : (customName || '');
              const already = _groupWeekGames(listType, srcSet).filter(it => (slug ? it.slug === slug : it.customName === customName)).flatMap(it => it.dates);
              _openMbDayPicker({ slug, customName, name, listType }, already, async (finalDates) => {
                renderQuick();
                if (finalDates.length && slug && !srcSet.has(slug)) {
                  if (confirm(`'${name}'을(를) 내 ${srcLabel}에도 추가할까요?`)) {
                    await window.CottageDB?.addGamePref?.(userId, slug, null, srcTable);
                    srcSet.add(slug);
                    _emitLikesChanged(srcTable, slug, true);
                    _renderWeekList(listType);
                  }
                }
              });
            };

            function renderQuick() {
              const week = inWeek();
              const src = (isWant ? _meeting.likedGames : _meeting.curiousGames) || [];
              const cand = src.filter(g => g.game_id && !week.has(String(g.game_id)));
              if (!cand.length) { quickWrap.style.display = 'none'; return; }
              quickWrap.style.display = '';
              quickEl.innerHTML = cand.map(g => {
                const gd = window.gameData?.[g.game_id];
                const nm = escH(gd?.title?.display || gd?.title?.owned || gd?.title?.bgg || String(g.game_id));
                const thumb = gd?.images?.thumbnail ? `<img class="mb-add-quick-thumb" src="${escH(gd.images.thumbnail)}" alt="">` : `<span class="mb-add-quick-thumb mb-add-quick-thumb--empty"></span>`;
                return `<button class="mb-add-quick-item" data-game-id="${escH(String(g.game_id))}" type="button">${thumb}<span class="mb-add-quick-name">${nm}</span><span class="mb-add-quick-plus">＋</span></button>`;
              }).join('');
              quickEl.querySelectorAll('.mb-add-quick-item').forEach(chip => chip.addEventListener('click', () => pickGame(chip.dataset.gameId, null)));
            }
            renderQuick();

            const _smart = window.matchKoreanSmart;
            let _t = null;
            input.addEventListener('input', () => {
              clearTimeout(_t);
              _t = setTimeout(() => {
                const q = input.value.trim();
                if (!q) { resultsEl.innerHTML = ''; return; }
                const week = inWeek();
                const matches = Object.entries(window.gameData || {}).filter(([, g]) => {
                  const nm = g.title?.display || g.title?.owned || g.title?.bgg || '';
                  return _smart ? _smart(nm, q) : nm.toLowerCase().includes(q.toLowerCase());
                }).slice(0, 8);
                const items = matches.map(([id, g]) => {
                  const nm = escH(g.title?.display || g.title?.owned || g.title?.bgg || String(id));
                  const added = week.has(String(id));
                  return `<button class="taste-search-item${added ? ' is-added' : ''}" data-game-id="${escH(id)}" type="button">${nm}${added ? ' <span class="taste-search-added-label">이번주 등록됨</span>' : ''}</button>`;
                });
                const direct = `<button class="taste-search-direct" data-custom-name="${escH(q)}" type="button">+ "${escH(q)}" 직접 추가</button>`;
                resultsEl.innerHTML = [...items, direct].join('');
                resultsEl.querySelectorAll('[data-game-id],[data-custom-name]').forEach(btn => btn.addEventListener('click', () => pickGame(btn.dataset.gameId || null, btn.dataset.customName || null)));
              }, 180);
            });
            setTimeout(() => input.focus(), 50);
          };

          // 원천(game_likes/curious) 게임 검색·추가 모달 — 취향보드 _openTasteAddModal과 동일 기능(스코프 분리로 중복, Phase C 통합 예정)
          const _openBoxAddSearch = (listType, table, games, refresh) => {
            const isWant = listType === 'want';
            document.getElementById('mbBoxAddSearch')?.remove();
            const overlay = document.createElement('div');
            overlay.id = 'mbBoxAddSearch';
            overlay.className = 'mb-add-overlay';
            overlay.innerHTML = `<div class="mb-add-box">
              <div class="mb-add-head"><span class="mb-add-title">${isWant ? '❤️ 좋아하는 게임' : '👀 해보고 싶은 게임'} 추가</span><button class="mb-add-close" type="button" aria-label="닫기">✕</button></div>
              <input class="mb-add-input" type="text" placeholder="게임 이름 검색 (초성 가능)" autocomplete="off">
              <div class="mb-add-results"></div>
            </div>`;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('.mb-add-input');
            const resultsEl = overlay.querySelector('.mb-add-results');
            const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
            const onEsc = e => { if (e.key === 'Escape') close(); };
            overlay.querySelector('.mb-add-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', onEsc);

            const inList = (gameId, customName) => {
              if (gameId) return games.some(g => String(g.game_id) === String(gameId));
              if (customName) return games.some(g => !g.game_id && g.custom_name === customName);
              return false;
            };
            const addGame = async (gameId, customName) => {
              if (inList(gameId, customName)) return;
              await window.CottageDB?.addGamePref?.(userId, gameId, customName, table);
              games.push({ game_id: gameId || null, custom_name: customName || null });
              if (gameId) (isWant ? _likedSlugSet : _curiousSlugSet).add(String(gameId));
              _emitLikesChanged(table, gameId, true); // 모임보드 ❤️/👀 마커·취향보드 즉시 동기화(Phase A)
              refresh();
              if (gameId) {
                const b = resultsEl.querySelector(`.taste-search-item[data-game-id="${CSS.escape(String(gameId))}"]`);
                if (b && !b.classList.contains('is-added')) { b.classList.add('is-added'); b.insertAdjacentHTML('beforeend', ' <span class="taste-search-added-label">추가됨</span>'); }
              }
            };

            const _smart = window.matchKoreanSmart;
            let _t = null;
            input.addEventListener('input', () => {
              clearTimeout(_t);
              _t = setTimeout(async () => {
                const q = input.value.trim();
                if (!q) { resultsEl.innerHTML = ''; return; }
                const matches = Object.entries(window.gameData || {}).filter(([, g]) => {
                  const nm = g.title?.display || g.title?.owned || g.title?.bgg || '';
                  return _smart ? _smart(nm, q) : nm.toLowerCase().includes(q.toLowerCase());
                }).slice(0, 8);
                const items = matches.map(([id, g]) => {
                  const nm = escH(g.title?.display || g.title?.owned || g.title?.bgg || String(id));
                  const added = inList(id, null);
                  return `<button class="taste-search-item${added ? ' is-added' : ''}" data-game-id="${escH(id)}" type="button">${nm}${added ? ' <span class="taste-search-added-label">추가됨</span>' : ''}</button>`;
                });
                const suggestions = await (window.CottageDB?.getCustomPrefSuggestions?.() || Promise.resolve([])).catch(() => []);
                const customItems = suggestions.filter(n => (_smart ? _smart(n, q) : n.toLowerCase().includes(q.toLowerCase()))).slice(0, 3)
                  .map(n => `<button class="taste-search-item" data-custom-name="${escH(n)}" type="button">${escH(n)} <span class="taste-search-custom-label">직접입력</span></button>`);
                const direct = `<button class="taste-search-direct" data-custom-name="${escH(q)}" type="button">+ "${escH(q)}" 직접 추가</button>`;
                resultsEl.innerHTML = [...items, ...customItems, direct].join('');
                resultsEl.querySelectorAll('[data-game-id],[data-custom-name]').forEach(btn =>
                  btn.addEventListener('click', () => addGame(btn.dataset.gameId || null, btn.dataset.customName || null)));
              }, 180);
            });
            setTimeout(() => input.focus(), 50);
          };

          // 취향 원천(game_likes/curious) 박스만 센터모달로 보기 — 이번 주 리스트와 별개, 평소 취향 전체 (+ 게임 추가 가능)
          const _openTasteBoxModal = (listType) => {
            const isWant = listType === 'want';
            const table = isWant ? 'game_likes' : 'game_curious';
            const games = isWant ? _meeting.likedGames : _meeting.curiousGames;
            const title = isWant ? '❤️ 좋아하는 게임' : '👀 해보고 싶은 게임';
            document.getElementById('mbTasteBoxModal')?.remove();
            const overlay = document.createElement('div');
            overlay.id = 'mbTasteBoxModal';
            overlay.className = 'mb-add-overlay';
            overlay.innerHTML = `<div class="mb-add-box">
              <div class="mb-add-head"><span class="mb-add-title">${title} <span class="taste-count mb-box-count">${games.length}개</span></span><button class="mb-add-close" type="button" aria-label="닫기">✕</button></div>
              <p class="mb-taste-box-hint">이번 주 일정과 별개로, 평소 ${isWant ? '좋아하는' : '해보고 싶은'} 게임 전체예요</p>
              <button class="taste-add-btn mb-box-add-btn" type="button">＋ 게임 추가</button>
              <div class="taste-game-list mb-taste-box-list"></div>
            </div>`;
            document.body.appendChild(overlay);
            const listEl = overlay.querySelector('.mb-taste-box-list');
            const countEl = overlay.querySelector('.mb-box-count');
            const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
            const onEsc = e => { if (e.key === 'Escape') close(); };
            overlay.querySelector('.mb-add-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', onEsc);

            const _boxItemHtml = (g) => {
              const gd = g.game_id ? window.gameData?.[g.game_id] : null;
              const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || String(g.game_id)) : (g.custom_name || String(g.game_id || ''));
              const thumb = gd?.images?.thumbnail ? `<img class="taste-game-thumb" src="${escH(gd.images.thumbnail)}" alt="">` : `<span class="taste-game-thumb-empty"></span>`;
              const clickable = g.game_id ? ' taste-game-item--clickable' : '';
              const gidAttr = g.game_id ? ` data-game-id="${escH(String(g.game_id))}"` : '';
              const ruleKey = g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`;
              const ruleBadge = _ruleSet.has(ruleKey) ? '<span class="mb-rule-badge">📖</span>' : '';
              return `<div class="taste-game-item${clickable}"${gidAttr}>${thumb}<span class="taste-game-name">${escH(name)}</span>${ruleBadge}</div>`;
            };
            const renderList = () => {
              listEl.innerHTML = games.length ? games.map(_boxItemHtml).join('') : '<p class="taste-game-empty">아직 없어요</p>';
              if (countEl) countEl.textContent = `${games.length}개`;
              // 썸네일만 클릭 → 게임시트 (모달 z 9700 > 게임시트 9500 → 먼저 닫고 열기)
              listEl.querySelectorAll('.taste-game-item--clickable .taste-game-thumb, .taste-game-item--clickable .taste-game-thumb-empty').forEach(th => th.addEventListener('click', () => {
                const gid = th.closest('.taste-game-item')?.dataset.gameId;
                if (gid) { close(); window.ensureGameSheet?.(); window.openGameSheet?.(gid); }
              }));
            };
            renderList();
            overlay.querySelector('.mb-box-add-btn').addEventListener('click', () => _openBoxAddSearch(listType, table, games, renderList));
          };

          // 리스트 위임 핸들러 (📖 토글 / ⋯ 케밥 / 썸네일) — 리스트 내용은 _renderWeekList가 렌더
          for (const listType of ['want', 'learn']) {
            const listId = listType === 'want' ? 'meetinglikedList' : 'meetingcuriousList';
            const addBtnId = listType === 'want' ? 'meetinglikedAddBtn' : 'meetingcuriousAddBtn';
            const boxBtnId = listType === 'want' ? 'meetinglikedBoxBtn' : 'meetingcuriousBoxBtn';
            const listEl = subBody.querySelector('#' + listId);
            const srcSet = listType === 'want' ? _likedSlugSet : _curiousSlugSet;
            subBody.querySelector('#' + addBtnId)?.addEventListener('click', () => _openMbAddModal(listType));
            subBody.querySelector('#' + boxBtnId)?.addEventListener('click', () => _openTasteBoxModal(listType));
            listEl?.addEventListener('click', async e => {
              const item = e.target.closest('.taste-game-item');
              if (!item) return;
              const slug = item.dataset.gameId || null;
              const customName = item.dataset.customName || null;
              const name = item.querySelector('.taste-game-name')?.textContent || '이 게임';
              const grp = _groupWeekGames(listType, srcSet).find(it => (slug ? it.slug === slug : it.customName === customName));
              const ctx = { slug, customName, name, listType, dates: grp?.dates || [] };
              const ruleBtn = e.target.closest('.mb-rule-btn');
              if (ruleBtn) {
                const isOn = ruleBtn.classList.toggle('is-on');
                if (isOn) { await window.CottageDB?.addMeetingGamePref?.(userId, 'can_explain_rules', slug, customName); window.showToast?.(`📖 '${name}' 룰 설명해줄 수 있어요로 표시했어요`); }
                else { await window.CottageDB?.removeMeetingGamePref?.(userId, 'can_explain_rules', slug, customName); window.showToast?.(`'${name}' 룰 설명 표시를 해제했어요`); }
                return;
              }
              if (e.target.closest('.mb-kebab-btn')) { _openMbKebab(e.target.closest('.mb-kebab-btn'), ctx); return; }
              if (e.target.closest('.taste-game-thumb, .taste-game-thumb-empty') && slug) { window.ensureGameSheet?.(); window.openGameSheet?.(slug); }
            });
          }

          // 최근 모임 참여 → 게임시트 열기 (이름·썸네일 클릭)
          subBody.querySelectorAll('.profile-activity-item[data-game-id]').forEach(li => {
            const gameId = li.dataset.gameId;
            if (!gameId) return;
            const open = () => {
              const key = _getGameKeyById(gameId);
              if (key && window.openGameSheet) { window.ensureGameSheet?.(); window.openGameSheet(key); }
            };
            li.querySelector('.profile-game-link')?.addEventListener('click', open);
            li.querySelector('.profile-record-thumb, .profile-record-thumb-empty')?.addEventListener('click', open);
          });

          // 이번 주 일정 — mini bar (async, 플래너 편집 후 재호출 가능)
          const _loadMeetingWeek = async () => {
            const weekEl = subBody.querySelector('#mbWeekSection');
            const [wStart, wEnd] = _thisWeekRange();
            const [allV, allVG] = await Promise.all([
              window.CottageDB?.getMeetingVotes?.(wStart, wEnd).then(r => r || []).catch(() => []) || Promise.resolve([]),
              window.CottageDB?.getMeetingVoteGames?.(wStart, wEnd).then(r => r || []).catch(() => []) || Promise.resolve([]),
            ]);
            _weekData.allV = allV; _weekData.allVG = allVG;
            _weekData.myVotes = allV.filter(v => String(v.user_id) === userId);
            _weekData.myVoteGames = allVG.filter(g => String(g.user_id) === userId);
            // 이번 주 하고싶은/배우고싶은 게임 리스트 (fetch 공유 — 재조회 없음)
            _renderWeekList('want');
            _renderWeekList('learn');
            // 이번 주 일정 미니바
            if (weekEl) {
              weekEl.innerHTML = `<div class="taste-section-label">📅 이번 주 일정 <button class="mb-planner-edit" type="button" title="모임 플래너 편집">✎ 편집</button></div>` + _buildMiniBarWeekHtml(_weekData.myVotes, _weekData.myVoteGames, userId, true);
              weekEl.querySelector('.mb-planner-edit')?.addEventListener('click', () =>
                window.openPlannerModal?.({ weekOffset: 0, onDirtyClose: _loadMeetingWeek }));
              weekEl.querySelectorAll('.mb-detail-btn').forEach(btn => btn.addEventListener('click', () => {
                const _d = btn.dataset.date;
                window.openDatePreviewModal?.(_d, allV.filter(v => v.vote_date === _d), allVG.filter(g => g.vote_date === _d), _weekData.myVotes.find(v => v.vote_date === _d) || null, _loadMeetingWeek);
              }));
            }
            // 취향보드 수정 후 "‹ 모임 보드"로 복귀 시 눌렀던 스크롤 위치 복원 (렌더 완료 후)
            if (_pendingMeetingScrollTop != null) {
              subBody.scrollTop = _pendingMeetingScrollTop;
              _pendingMeetingScrollTop = null;
            }
          };
          // 다른 화면(게임시트·취향보드)에서 좋아요/궁금해요가 바뀌면 ❤️/👀 마커 즉시 반영
          if (window.__mbLikesHandler) window.removeEventListener('cottage-likes-changed', window.__mbLikesHandler);
          const _onMbLikesChanged = (e) => {
            const anchorList = subBody.querySelector('#meetinglikedList');
            if (!anchorList || !document.body.contains(anchorList)) { window.removeEventListener('cottage-likes-changed', _onMbLikesChanged); return; }
            const { table, gameId, added } = e.detail || {};
            const slug = _mbSlug(gameId);
            if (!slug) return;
            const set = table === 'game_likes' ? _likedSlugSet : (table === 'game_curious' ? _curiousSlugSet : null);
            if (!set) return;
            if (added) set.add(slug); else set.delete(slug);
            _renderWeekList(table === 'game_likes' ? 'want' : 'learn');
          };
          window.__mbLikesHandler = _onMbLikesChanged;
          window.addEventListener('cottage-likes-changed', _onMbLikesChanged);

          _loadMeetingWeek();
        }); // end meeting afterRender
      }
    });
  });

  // ── 프로필 영역 버튼 바인딩 ─────────────────────────────────
  body.querySelector('.profile-panel-avatar-wrap')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, true)); });
  body.querySelector('.profile-panel-rep-name')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, true)); });
  body.querySelector('.profile-panel-nick')?.addEventListener('click', () => promptNicknameChange());
  body.querySelector('.profile-panel-title-name')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, false, true)); });
  body.querySelector('.profile-growth-link')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody)); });

  if (autoSubsheet) {
    body.querySelector(`[data-subsheet="${autoSubsheet}"]`)?.click();
  }
}

// ── 다른 플레이어 취향보드 시트 ───────────────────────────────
async function openOtherProfileSheet(userId) {
  if (!userId) return;

  // 본인 프로필이면 내 보드 취향탭으로
  const self = getKakaoUser();
  if (self && String(self.id) === String(userId)) {
    openProfilePanel('taste');
    return;
  }

  document.getElementById('otherProfileSheet')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'otherProfileSheet';
  overlay.className = 'other-profile-overlay';
  overlay.innerHTML = `<div class="other-profile-box">
    <div class="other-profile-header">
      <span class="other-profile-title">취향 보드</span>
      <button class="other-profile-close" type="button">✕</button>
    </div>
    <div class="other-profile-body"><div class="other-profile-loading">불러오는 중…</div></div>
  </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('.other-profile-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const data = await window.CottageDB?.getUserTasteProfile?.(userId);
  const body = overlay.querySelector('.other-profile-body');
  if (!data) {
    body.innerHTML = '<div class="other-profile-empty">프로필을 불러올 수 없어요</div>';
    return;
  }

  const { nickname, photo_url, rep_achievement_id, bio, avoid_tags, likedGames, curiousGames } = data;
  const _e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const charPath = rep_achievement_id ? window.CottageAchievements?.getCharacterPath?.(rep_achievement_id) : null;
  const avatarSrc = charPath || photo_url;
  const avatarHtml = avatarSrc
    ? `<img class="other-profile-avatar" src="${_e(avatarSrc)}" alt="">`
    : `<span class="other-profile-avatar other-profile-avatar--empty">${(nickname || '?')[0]}</span>`;

  const bioTags = bio ? bio.split(',').map(t => t.trim()).filter(Boolean) : [];
  const bioHtml = bioTags.length
    ? bioTags.map(t => `<span class="taste-bio-tag">${_e(t)}</span>`).join('')
    : '<span class="taste-bio-placeholder">소개 없음</span>';

  const buildReadOnlyGames = (games, max = 5) => {
    if (!games.length) return '<p class="taste-game-empty">아직 없어요</p>';
    const items = games.map(g => {
      const gd = g.game_id ? window.gameData?.[g.game_id] : null;
      const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || String(g.game_id)) : (g.custom_name || String(g.game_id || ''));
      const thumb = gd?.images?.thumbnail
        ? `<img class="taste-game-thumb" src="${_e(gd.images.thumbnail)}" alt="">`
        : `<span class="taste-game-thumb-empty"></span>`;
      const gidAttr = g.game_id ? ` data-game-id="${g.game_id}"` : '';
      const clickable = g.game_id ? ' taste-game-item--clickable' : '';
      return `<div class="taste-game-item${clickable}"${gidAttr}>${thumb}<span class="taste-game-name">${_e(name)}</span></div>`;
    });
    if (items.length <= max) return items.join('');
    const rest = items.length - max;
    return `${items.slice(0, max).join('')}<div class="taste-game-more-wrap" hidden>${items.slice(max).join('')}</div><button class="taste-more-btn" type="button">더 보기 (${rest}개 더)</button>`;
  };

  body.innerHTML = `
    <div class="other-profile-hero">
      ${avatarHtml}
      <span class="other-profile-name">${_e(nickname)}</span>
    </div>
    ${bioTags.length ? `<div class="taste-bio-section">
      <div class="taste-section-label">한줄 소개</div>
      <div class="taste-bio-row">${bioHtml}</div>
    </div>` : ''}
    <div class="taste-game-section">
      <div class="taste-section-label">❤️ 좋아하는 게임 <span class="taste-count">${likedGames.length}개</span></div>
      <div class="taste-game-list">${buildReadOnlyGames(likedGames)}</div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">🤔 해보고싶은 게임 <span class="taste-count">${curiousGames.length}개</span></div>
      <div class="taste-game-list">${buildReadOnlyGames(curiousGames)}</div>
    </div>
    ${avoid_tags.length ? `<div class="taste-avoid-section">
      <div class="taste-section-label">🚫 피하는 유형</div>
      <div class="taste-tag-grid">${avoid_tags.map(t => `<span class="taste-avoid-tag is-active" style="pointer-events:none">${_e(t)}</span>`).join('')}</div>
    </div>` : ''}
  `;

  body.querySelectorAll('.taste-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.previousElementSibling;
      if (!wrap) return;
      const hiding = !wrap.hidden;
      wrap.hidden = hiding;
      btn.textContent = hiding ? `더 보기 (${wrap.querySelectorAll('.taste-game-item').length}개 더)` : '접기';
    });
  });

  body.querySelectorAll('.taste-game-item--clickable').forEach(item => {
    item.addEventListener('click', () => {
      const gid = item.dataset.gameId;
      if (gid && window.openGameSheet) { overlay.remove(); window.openGameSheet(gid); }
    });
  });
}
window.openOtherProfileSheet = openOtherProfileSheet;

// ── 모임보드 이번주 일정 공용 헬퍼 ──────────────────────────────
function _thisWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today); mon.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
}

function _buildMiniBarWeekHtml(myVotes, voteGames, userId, isOwner) {
  const _days = ['일','월','화','수','목','금','토'];
  const _vg = Array.isArray(voteGames) ? voteGames : [];

  function _gameName(gameId, customName) {
    // #접두 제거 후 bggId / 슬러그(id) / gameData 키 순으로 이름 해석 — # 노출 방지
    const clean = gameId != null ? String(gameId).replace(/^#/, '') : '';
    if (clean && window.COTTAGE_GAMES) {
      const cg = window.COTTAGE_GAMES.find(c => String(c.bggId) === clean || String(c.id) === clean);
      if (cg) return cg.display;
    }
    if (clean && window.gameData?.[clean]) {
      const gd = window.gameData[clean];
      return gd.title?.display || gd.title?.owned || gd.title?.bgg || clean;
    }
    return customName || clean || '?';
  }

  const fmtVD = ds => {
    const d = new Date(ds + 'T00:00:00');
    return (d.getMonth()+1) + '/' + d.getDate() + '(' + _days[d.getDay()] + ')';
  };
  const rows = myVotes.map(v => {
    const total = 14; // 9~23시
    const left  = ((v.time_start - 9) / total * 100).toFixed(1);
    const width = ((v.time_end - v.time_start) / total * 100).toFixed(1);
    const dayGames = _vg.filter(g => g.vote_date === v.vote_date && String(g.user_id) === String(userId));
    const gameParts = [
      ...dayGames.filter(g => g.list_type === 'want').map(g => `🎲${escH(_gameName(g.game_id, g.custom_name))}`),
      ...dayGames.filter(g => g.list_type === 'learn').map(g => `📖${escH(_gameName(g.game_id, g.custom_name))}`),
    ];
    const gamesHtml = gameParts.length ? `<div class="mb-week-games">${gameParts.join(' ')}</div>` : '';
    return `<div class="mb-week-entry">
      <div class="mb-week-row">
        <span class="mb-week-date">${escH(fmtVD(v.vote_date))}</span>
        <div class="mb-mini-bar-wrap"><div class="mb-mini-bar-fill" style="left:${left}%;width:${width}%"></div></div>
        <span class="mb-week-time">${v.time_start}~${v.time_end}시</span>
        <button class="mb-detail-btn" data-uid="${escH(String(userId))}" data-date="${escH(v.vote_date)}" type="button">자세히</button>
      </div>
      ${gamesHtml}
    </div>`;
  }).join('');
  const bodyHtml = myVotes.length
    ? `<div class="mb-week-list">${rows}</div>`
    : '<p class="taste-game-empty">이번 주 등록된 일정이 없어요.</p>';
  // 편집 진입점은 섹션 타이틀 옆 ✎ 아이콘(openPlannerModal)으로 이동 — 하단 CTA 제거
  return bodyHtml;
}

// ── 다른 유저 모임 보드 시트 (읽기 전용) ───────────────────────
// 회원 자기소개 카드 클릭 시 진입. 본인 내 보드(openProfilePanel)와 동일한 .profile-panel +
// .profile-subsheet 마크업을 그대로 사용 — 뒤로가기 시 그 유저의 "내 보드" 메인 패널(읽기 전용)이
// 보이고, ✕는 전체 닫기. 공개 범위는 자기소개 페이지에서 보이는 수준으로 한정
// (최근 플레이 등 개인 활동 이력은 포함하지 않음).
async function openOtherMeetingSheet(userId) {
  if (!userId) return;

  const self = getKakaoUser();
  if (self && String(self.id) === String(userId)) {
    openProfilePanel('meeting');
    return;
  }

  document.getElementById('otherMainPanel')?.remove();
  document.getElementById('otherMeetingSheet')?.remove();

  const data = await window.CottageDB?.getUserMeetingProfile?.(userId);
  const _e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  if (!data) {
    window.showToast?.('프로필을 불러올 수 없어요', { type: 'error' }) || alert('프로필을 불러올 수 없어요');
    return;
  }

  const { nickname, photo_url, rep_achievement_id } = data;
  const charPath = rep_achievement_id ? window.CottageAchievements?.getCharacterPath?.(rep_achievement_id) : null;
  const avatarSrc = charPath || photo_url;
  const avatarHtml = avatarSrc
    ? `<img class="profile-panel-avatar" src="${_e(avatarSrc)}" alt="">`
    : `<div class="profile-panel-avatar profile-panel-avatar--empty">🐾</div>`;

  // 본인 내 보드(openProfilePanel)와 동일한 .profile-panel 메인 패널 — 읽기 전용(수정 불가)
  const mainPanel = document.createElement('div');
  mainPanel.id = 'otherMainPanel';
  mainPanel.className = 'profile-panel';
  mainPanel.innerHTML = `<div class="profile-panel-box">
    <div class="profile-panel-header">
      <span class="profile-panel-title">${_e(nickname)}의 내 보드</span>
      <button class="profile-panel-close" type="button">✕</button>
    </div>
    <div class="profile-panel-body">
      <div class="profile-panel-profile">
        <div class="profile-panel-profile-top">
          <div class="profile-panel-avatar-wrap">${avatarHtml}</div>
          <div class="profile-panel-profile-info">
            <span class="profile-panel-nick-row"><span class="profile-panel-nick">${_e(nickname)}</span></span>
            <span class="profile-panel-readonly-hint">읽기 전용으로 보고 있어요</span>
          </div>
        </div>
      </div>
      <div class="profile-card-grid">
        <button class="profile-card" data-other-subsheet="taste" type="button">
          <span class="profile-card-icon">❤️</span>
          <span class="profile-card-label">취향 보드</span>
        </button>
        <button class="profile-card" data-other-subsheet="meeting" type="button">
          <span class="profile-card-icon">📅</span>
          <span class="profile-card-label">모임 보드</span>
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(mainPanel);
  mainPanel.querySelector('.profile-panel-close').addEventListener('click', () => mainPanel.remove());
  mainPanel.addEventListener('click', e => { if (e.target === mainPanel) mainPanel.remove(); });
  mainPanel.querySelector('[data-other-subsheet="taste"]').addEventListener('click', () => window.openOtherProfileSheet?.(userId));
  mainPanel.querySelector('[data-other-subsheet="meeting"]').addEventListener('click', () => _openOtherMeetingSubSheet(userId, nickname, data));

  await _openOtherMeetingSubSheet(userId, nickname, data);
}

async function _openOtherMeetingSubSheet(userId, nickname, data) {
  document.getElementById('otherMeetingSheet')?.remove();
  const _e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const { bio, location, available, travelRange, meetingStyle, likedGames, curiousGames, ruleGames } = data;

  // 이번 주 참여 일정 fetch
  const _today = new Date();
  const _dow = _today.getDay();
  const _mon = new Date(_today);
  _mon.setDate(_today.getDate() + (_dow === 0 ? -6 : 1 - _dow));
  const _sun = new Date(_mon);
  _sun.setDate(_mon.getDate() + 6);
  const _wStart = _mon.toISOString().slice(0, 10);
  const _wEnd   = _sun.toISOString().slice(0, 10);
  const [_allVotes, _allVoteGames] = await Promise.all([
    window.CottageDB?.getMeetingVotes?.(_wStart, _wEnd).then(r => r || []).catch(() => []) || Promise.resolve([]),
    window.CottageDB?.getMeetingVoteGames?.(_wStart, _wEnd).then(r => r || []).catch(() => []) || Promise.resolve([]),
  ]);
  const _myVotes     = (_allVotes     || []).filter(v => String(v.user_id) === String(userId));
  const _myVoteGames = (_allVoteGames || []).filter(g => String(g.user_id) === String(userId));

  const _weekSectionHtml = `<div class="taste-game-section">
    <div class="taste-section-label">📅 이번 주 일정</div>
    ${_buildMiniBarWeekHtml(_myVotes, _myVoteGames, userId, false)}
  </div>`;

  const _otherRuleSet = new Set((ruleGames || []).map(g => g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`));
  const buildReadOnlyGames = (games) => {
    if (!games.length) return '<p class="taste-game-empty">아직 없어요</p>';
    return games.map(g => {
      const gd = g.game_id ? window.gameData?.[g.game_id] : null;
      const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || String(g.game_id)) : (g.custom_name || String(g.game_id || ''));
      const thumb = gd?.images?.thumbnail
        ? `<img class="taste-game-thumb" src="${_e(gd.images.thumbnail)}" alt="">`
        : `<span class="taste-game-thumb-empty"></span>`;
      const gidAttr = g.game_id ? ` data-game-id="${g.game_id}"` : '';
      const clickable = g.game_id ? ' taste-game-item--clickable' : '';
      const ruleKey = g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`;
      const ruleBadge = _otherRuleSet.has(ruleKey) ? '<span class="mb-rule-badge">📖</span>' : '';
      return `<div class="taste-game-item${clickable}"${gidAttr}>${thumb}<span class="taste-game-name">${_e(name)}</span>${ruleBadge}</div>`;
    }).join('');
  };

  const contentHtml = `
    ${_weekSectionHtml}
    <div class="meeting-profile-section">
      <div class="taste-section-label">📍 모임 프로필</div>
      <div class="meeting-profile-display">
        <div class="meeting-profile-row"><span class="meeting-profile-label">📍 활동 지역</span><span class="meeting-profile-val${location ? '' : ' is-empty'}">${location ? _e(location) : '미입력'}</span></div>
        <div class="meeting-profile-row"><span class="meeting-profile-label">🕐 참여 가능 시간</span><span class="meeting-profile-val${available ? '' : ' is-empty'}">${available ? _e(available) : '미입력'}</span></div>
        <div class="meeting-profile-row"><span class="meeting-profile-label">🚗 이동 가능 범위</span><span class="meeting-profile-val${travelRange ? '' : ' is-empty'}">${travelRange ? _e(travelRange) : '미입력'}</span></div>
        <div class="meeting-profile-row"><span class="meeting-profile-label">📝 한줄소개</span><span class="meeting-profile-val${bio ? '' : ' is-empty'}">${bio ? _e(bio) : '미입력'}</span></div>
        <div class="meeting-profile-style-row">${meetingStyle.length ? meetingStyle.map(t => `<span class="taste-bio-tag">${_e(t)}</span>`).join('') : '<span class="taste-bio-placeholder">선호 스타일 미입력</span>'}</div>
      </div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">❤️ 하고 싶은 게임 <span class="taste-count">${likedGames.length}개</span></div>
      <div class="taste-game-list">${buildReadOnlyGames(likedGames)}</div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">💡 배우고 싶은 게임 <span class="taste-count">${curiousGames.length}개</span></div>
      <div class="taste-game-list">${buildReadOnlyGames(curiousGames)}</div>
    </div>`;

  // 본인 내 보드의 _openSubSheet와 동일한 .profile-subsheet 마크업 — 뒤로가기는 메인 패널만 노출
  const sub = document.createElement('div');
  sub.id = 'otherMeetingSheet';
  sub.className = 'profile-subsheet';
  sub.innerHTML = `
    <div class="profile-subsheet-box">
      <div class="profile-subsheet-header">
        <button class="profile-subsheet-back" type="button">‹ ${_e(nickname)}의 내 보드</button>
        <span class="profile-subsheet-title">모임 보드</span>
        <button class="profile-subsheet-close" type="button">✕</button>
      </div>
      <div class="profile-subsheet-body">${contentHtml}</div>
    </div>`;
  document.body.appendChild(sub);
  sub.querySelector('.profile-subsheet-back').addEventListener('click', () => sub.remove());
  sub.querySelector('.profile-subsheet-close').addEventListener('click', () => { sub.remove(); document.getElementById('otherMainPanel')?.remove(); });
  sub.addEventListener('click', e => { if (e.target === sub) sub.remove(); });

  sub.querySelectorAll('.mb-detail-btn').forEach(btn =>
    btn.addEventListener('click', () => window.openDateScheduleModal?.(btn.dataset.uid, btn.dataset.date))
  );

  sub.querySelectorAll('.taste-game-item--clickable').forEach(item => {
    item.addEventListener('click', () => {
      const gid = item.dataset.gameId;
      if (gid && window.openGameSheet) { sub.remove(); document.getElementById('otherMainPanel')?.remove(); window.openGameSheet(gid); }
    });
  });
}
window.openOtherMeetingSheet = openOtherMeetingSheet;

document.addEventListener('DOMContentLoaded', initKakaoAuth);
