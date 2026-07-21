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

// ── 전체 공지 (알림 패널 상단 카드) ──────────────────────────
// 한 건짜리 공지를 카드로 띄운다. 음료교환권 공지와 같은 장치를 쓰되 확인 여부는
// 별도 키(feeNoticeSeen)로 관리한다 — 하나를 확인해도 다른 하나는 남아야 하므로.
// ⚠️ UNTIL이 지나면 렌더 자체를 건너뛴다. 안 그러면 철 지난 공지가 영구히 쌓인다.
const FEE_NOTICE = {
  from:  '2026-08-01',   // 시행일
  until: '2026-09-01',   // 이 날짜부터 카드 미표시
  title: '요금 안내 변경',
};
window._isFeeNoticeLive = function () {
  return new Date().toISOString().slice(0, 10) < FEE_NOTICE.until;
};

async function _updateNotifBadge() {
  const user = getKakaoUser();
  if (!user || !window.CottageDB?.getMyNotifications) return;
  const btn = document.getElementById('kakaoLoginBtn');
  if (!btn) return;
  const sess = window._cottageSess?.get(String(user.id)) || {};
  if (!sess.voucherNoticeSeen || (window._isFeeNoticeLive?.() && !sess.feeNoticeSeen)) {
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

function _afterGrowthRender(subBody, expandChar = false, expandTitle = false, readOnly = false) {
  const _charBody = subBody.querySelector('.profile-char-body');
  // 읽기전용: 대표 캐릭터 선택/변경 바인딩 스킵(남의 대표를 바꾸면 안 됨). 펼침 토글은 유지.
  if (_charBody && !readOnly) {
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
  // 읽기전용: 대표 칭호 선택/변경 바인딩 스킵. 펼침 토글은 유지.
  if (_titleBody && !readOnly) {
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

// R2 DRY: _openTasteAddModal(취향보드)/_openBoxAddSearch(모임보드 취향박스) 공용 검색-추가 모달.
// 두 호출처의 "목록에 있는지 확인"(inList)·"추가 시 처리"(onAdd)·"취소 시 처리"(onRemove)만
// 다르고 검색 UI는 동일해 헬퍼로 추출. onRemove를 넘기면 "추가됨" 항목 재클릭이 취소로 동작한다.
function _openGameAddSearchModal({ overlayId, title, inList, onAdd, onRemove }) {
  const _TOGGLE_HINT = '다시 누르면 목록에서 빼요';
  document.getElementById(overlayId)?.remove();
  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.className = 'mb-add-overlay';
  overlay.innerHTML = `<div class="mb-add-box">
    <div class="mb-add-head"><span class="mb-add-title">${title}</span><button class="mb-add-close" type="button" aria-label="닫기">✕</button></div>
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

  // 검색 결과의 "추가됨" 표시 갱신 — 결과 목록은 이 모달의 렌더 산물이라 호출부가 아닌 여기서 관리.
  // gameId 항목만 대상: 직접입력 제안·"+ 직접 추가"는 애초에 추가됨 표시를 렌더하지 않는다.
  const _setAddedState = (gameId, added) => {
    if (!gameId) return;
    const b = resultsEl.querySelector(`.taste-search-item[data-game-id="${CSS.escape(String(gameId))}"]`);
    if (!b) return;
    b.classList.toggle('is-added', added);
    b.querySelector('.taste-search-added-label')?.remove();
    if (added) b.insertAdjacentHTML('beforeend', ' <span class="taste-search-added-label">추가됨</span>');
    if (added && onRemove) b.title = _TOGGLE_HINT; else b.removeAttribute('title');
  };

  const addGame = async (gameId, customName) => {
    if (inList(gameId, customName)) return;
    await onAdd(gameId, customName);
    _setAddedState(gameId, true);
  };

  // "추가됨" 항목 재클릭 = 취소. confirm을 두지 않는 이유: 토글은 되돌리기가 대칭이라
  // (잘못 눌러도 한 번 더 누르면 그대로 재추가) 확인창 없이도 복구가 싸다.
  // 리스트의 ✕에 confirm이 붙은 건 거기선 복구하려면 모달을 다시 열어 검색해야 하기 때문.
  const removeGame = async (gameId, customName) => {
    if (!onRemove || !inList(gameId, customName)) return;
    await onRemove(gameId, customName);
    _setAddedState(gameId, false);
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
        const hint = added && onRemove ? ` title="${_TOGGLE_HINT}"` : '';
        return `<button class="taste-search-item${added ? ' is-added' : ''}" data-game-id="${escH(id)}" type="button"${hint}>${nm}${added ? ' <span class="taste-search-added-label">추가됨</span>' : ''}</button>`;
      });
      const suggestions = await (window.CottageDB?.getCustomPrefSuggestions?.() || Promise.resolve([])).catch(() => []);
      const customItems = suggestions.filter(n => (_smart ? _smart(n, q) : n.toLowerCase().includes(q.toLowerCase()))).slice(0, 3)
        .map(n => `<button class="taste-search-item" data-custom-name="${escH(n)}" type="button">${escH(n)} <span class="taste-search-custom-label">직접입력</span></button>`);
      const direct = `<button class="taste-search-direct" data-custom-name="${escH(q)}" type="button">+ "${escH(q)}" 직접 추가</button>`;
      resultsEl.innerHTML = [...items, ...customItems, direct].join('');
      resultsEl.querySelectorAll('[data-game-id],[data-custom-name]').forEach(btn =>
        btn.addEventListener('click', () => {
          const gameId = btn.dataset.gameId || null;
          const customName = btn.dataset.customName || null;
          // 화면에 "추가됨"으로 보이는 항목만 취소로 동작 — 어포던스와 동작을 일치시킨다.
          // "+ 직접 추가"·직접입력 제안은 is-added를 안 달므로 추가 전용으로 남는다(삭제로 오작동하면 최악).
          if (btn.classList.contains('is-added')) removeGame(gameId, customName);
          else addGame(gameId, customName);
        }));
    }, 180);
  });
  setTimeout(() => input.focus(), 50);
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

// ── '기록 보드' 서브시트 afterRender (R10a: openProfilePanel에서 추출) ──
// ctx: _allPhotoData는 splice로 변형되지만 재할당은 없음 → 참조 전달 안전
function _bindRecordSubsheet(subBody, ctx) {
  const { _getGameKeyById, _allPhotoData, _PHOTO_SHOW } = ctx;
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
        }

// ── '취향 보드' 서브시트 afterRender (R10a: openProfilePanel에서 추출) ──
function _bindTasteSubsheet(subBody, ctx) {
  const { user, readOnly, panel, _emitLikesChanged, allBioSuggestions, _BIO_PREDEFINED, _ruleSet, onBioSaved } = ctx;
          const userId = String(user.id);

          // ── 한줄 소개 ──
          const bioRow = subBody.querySelector('.taste-bio-row');
          const bioDisplay = subBody.querySelector('.taste-bio-display');
          const bioEditWrap = subBody.querySelector('.taste-bio-edit-wrap');
          const bioCustomInput = subBody.querySelector('.taste-bio-custom-input');
          const bioCustomTagsWrap = subBody.querySelector('.taste-bio-custom-tags');
          const _PREDEFINED_CHIPS = _BIO_PREDEFINED;

          // (R10b) 재진입 시 bio를 다시 그리던 블록 제거 — 이제 진입할 때마다 DB에서 읽어
          // HTML을 새로 빌드하므로 subBody가 이미 최신이다.

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
            bioDisplay.dataset.bio = newBio;
            _renderBioDisplay(allTags);
            bioRow.style.display = '';
            bioEditWrap.style.display = 'none';
            // 메인 패널 취향 카드 요약 즉시 갱신 — 미리보기 포맷을 여기서 다시 조립하지 않고
            // 카드 빌더 한 곳(_tasteCardSummaryHtml)에 맡긴다(포맷이 갈리지 않게).
            onBioSaved?.(newBio);
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

          // _appendTasteChip의 역 — DOM 칩 제거 + 빈 상태·카운트 갱신. DB 삭제·전역 통보는 호출부 책임.
          const _removeTasteChip = (listEl, countEl, gameId, customName) => {
            const item = gameId
              ? listEl.querySelector(`.taste-game-item[data-game-id="${CSS.escape(String(gameId))}"]`)
              : [...listEl.querySelectorAll('.taste-game-item[data-custom-name]')].find(el => el.dataset.customName === customName);
            item?.remove();
            if (!listEl.querySelector('.taste-game-item')) {
              listEl.innerHTML = '<p class="taste-game-empty">아직 추가된 게임이 없어요</p>';
            }
            if (countEl) countEl.textContent = `${listEl.querySelectorAll('.taste-game-item').length}개`;
          };

          // 취향보드 게임 추가 센터모달 (검색 초성 + 직접입력 — 원천 등록, 날짜·퀵픽 없음)
          const _openTasteAddModal = ({ listKey, table, listEl, countEl }) => {
            const isLiked = listKey === 'liked';
            _openGameAddSearchModal({
              overlayId: 'mbAddModal',
              title: `${isLiked ? '❤️ 좋아하는 게임' : '👀 해보고 싶은 게임'} 추가`,
              inList: (gameId, customName) => {
                if (gameId) return !!listEl.querySelector(`[data-game-id="${gameId}"]`);
                if (customName) return [...listEl.querySelectorAll('[data-custom-name]')].some(el => el.dataset.customName === customName);
                return false;
              },
              onAdd: async (gameId, customName) => {
                await window.CottageDB?.addGamePref?.(userId, gameId, customName, table);
                _appendTasteChip(listEl, countEl, gameId, customName);
                _emitLikesChanged(table, gameId, customName, true);
              },
              onRemove: async (gameId, customName) => {
                await window.CottageDB?.removeGamePref?.(userId, gameId, customName, table);
                _removeTasteChip(listEl, countEl, gameId, customName);
                _emitLikesChanged(table, gameId, customName, false);
              },
            });
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
              _removeTasteChip(listEl, countEl, gameId, customName);
              _emitLikesChanged(table, gameId, customName, false);
            });

            addBtn?.addEventListener('click', () => _openTasteAddModal({ listKey: listType, table, listEl, countEl }));
          }

          // 다른 화면(게임시트 등)에서 좋아요/궁금해요가 바뀌면 이 목록도 즉시 반영
          // 읽기전용: 뷰어 본인의 좋아요 변경이 남의 목록에 반영되면 안 되므로 등록 스킵
          if (!readOnly) {
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
          }

          // ── 피하는 유형 태그 ──
          // 현재 DOM(is-active)에서 도출 — 서브시트 재진입(스냅샷 복원) 시에도 _avoidTags(패널 오픈값)와 어긋나지 않게
          let currentAvoidTags = [...subBody.querySelectorAll('.taste-tag.is-active')].map(b => b.dataset.tag);
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
                // 편집 버튼(_renderCustomTags 경로)과 같은 소스를 봄 — 재조회로 갓 렌더된 최신 bio
                if ((bioDisplay.dataset.bio || '').split(',').map(s => s.trim()).includes(t)) btn.classList.add('is-selected');
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
        }

// ── '모임 보드' 서브시트 afterRender (R10a: openProfilePanel에서 추출) ──
function _bindMeetingSubsheet(subBody, ctx) {
  const { user, readOnly, body, _ro, _emitLikesChanged, _getGameKeyById, _ruleSet, _meeting, _meetingProfileRowHtml,
          getPendingScroll, setPendingScroll, setTasteScrollTo } = ctx;
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
              // 비선호쪽에서 왔으면 취향보드를 피하는 유형 섹션으로 스크롤해서 진입.
              // (R10b) 취향보드 렌더가 DB 재조회를 기다리는 비동기가 됐으므로, 여기서 바로
              // 섹션을 찾으면 아직 '불러오는 중…'이라 못 찾는다 → 의도만 넘기고 스크롤은 렌더 후에.
              if (isAvoid) setTasteScrollTo?.('avoid');
              // 취향 서브시트로 전환(기존 카드 경로 재사용) — 모임보드에서 왔으므로 뒤로가기를 "모임 보드"로 재지정
              body.querySelector('.profile-card[data-subsheet="taste"]')?.click();
              const tasteSub = document.getElementById('profileSubSheet');
              const back = tasteSub?.querySelector('.profile-subsheet-back');
              if (back) {
                back.textContent = '‹ 모임 보드';
                const fresh = back.cloneNode(true); // 원래 back 핸들러(→ 메인 패널) 제거
                back.replaceWith(fresh);
                fresh.addEventListener('click', () => {
                  setPendingScroll(savedScroll); // 모임보드 재렌더 후 복원(_loadMeetingWeek 말미)
                  tasteSub.remove();
                  body.querySelector('.profile-card[data-subsheet="meeting"]')?.click();
                });
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
              ${_meetingProfileRowHtml('활동 지역', location)}
              ${_meetingProfileRowHtml('참여 가능 시간', available)}
              ${_meetingProfileRowHtml('이동 가능 범위', travelRange)}`;
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

          // 인원조건 옵션 (day-detail.js dd-cond-select와 동일 값 — 서로 다른 파일이라 값만 복제, DB 컬럼이 SSOT)
          const _MB_COND_LABELS = { any: '무관', best: '베스트', recommended: '추천', '2': '2인', '3': '3인', '4': '4인', '5+': '5인+' };
          // vote_games(list_type) → 게임별 그룹 (이름/요일/좋아요·룰 상태/인원조건)
          const _groupWeekGames = (listType, srcSet) => {
            const map = new Map();
            for (const g of _weekData.myVoteGames) {
              if ((g.list_type === 'want' ? 'want' : 'learn') !== listType) continue;
              const slug = g.game_id != null ? _mbSlug(g.game_id) : null;
              const key = slug ? `id:${slug}` : `cn:${g.custom_name || ''}`;
              if (!map.has(key)) map.set(key, { slug, customName: g.custom_name || null, dates: new Set(), condition: null });
              const entry = map.get(key);
              entry.dates.add(g.vote_date);
              // 여러 날 같은 게임이면 첫 번째로 발견된 인원조건(무관 제외)을 대표로 표시(날짜별 조건이 다를 수 있으나 단순화)
              if (!entry.condition && g.player_condition && g.player_condition !== 'any') entry.condition = g.player_condition;
            }
            return [...map.values()].map(e => {
              const gd = e.slug ? window.gameData?.[e.slug] : null;
              const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || e.slug) : (e.customName || e.slug || '');
              const dateList = _mbWeek.map(w => w.ds).filter(ds => e.dates.has(ds));
              const days = dateList.map(ds => _mbWeek.find(w => w.ds === ds)?.label).filter(Boolean).join('·');
              const ruleKey = e.slug ? `id:${e.slug}` : `cn:${e.customName || ''}`;
              const condition = e.condition || 'any';
              const bggId = gd?.bgg?.id ?? null;
              // 옵션 텍스트를 게임별 해석 라벨로(베스트→"베스트 3인") — 자세히 모달과 동일 표기(window.formatCondLabel 재사용)
              const condOptions = Object.keys(_MB_COND_LABELS).map(v => ({
                value: v,
                label: v === 'any' ? '무관' : (window.formatCondLabel?.(v, bggId) || _MB_COND_LABELS[v]),
              }));
              return {
                slug: e.slug, customName: e.customName, name,
                thumbUrl: gd?.images?.thumbnail || null,
                dates: dateList, days,
                isSource: e.slug ? srcSet.has(e.slug) : false,
                ruleOn: _ruleSet.has(ruleKey),
                condition, condOptions,
              };
            });
          };

          const _buildWeekChipHtml = (it) => {
            const thumb = it.thumbUrl ? `<img class="taste-game-thumb" src="${escH(it.thumbUrl)}" alt="">` : `<span class="taste-game-thumb-empty"></span>`;
            const clickable = it.slug ? ' taste-game-item--clickable' : '';
            const gidAttr = it.slug ? ` data-game-id="${escH(it.slug)}"` : '';
            const cnAttr = it.customName ? ` data-custom-name="${escH(it.customName)}"` : '';
            // 평소 좋아하는/궁금한 게임은 표시 없음. 취향엔 없는데 이번 주에만 하고 싶은 게임에만 예외 표시.
            const mark = !it.isSource ? `<span class="mb-like-mark mb-like-mark--new" title="평소 목록엔 없지만 이번 주에 하고 싶은 게임">✨</span>` : '';
            // 참여일이 하루뿐이면 모든 게임 배지가 같은 요일이라 정보가 없음 → 숨김(여러 날일 때만 표시)
            const _multiDay = new Set((_weekData.myVotes || []).map(v => v.vote_date)).size > 1;
            const badge = (it.days && _multiDay) ? `<span class="mb-week-badge">(${it.days})</span>` : '';
            const ruleOn = it.ruleOn ? ' is-on' : '';
            // 자세히(막대 클릭) 모달과 연동되는 인원조건 토글. 내 보드=select(수정 가능, 양쪽 연동) / 읽기전용=정적 라벨.
            const curCondLabel = it.condOptions.find(o => o.value === it.condition)?.label || '';
            // 네이티브 select는 가장 긴 옵션(베스트 3인 등)에 맞춰 폭이 고정됨 → 현재 선택 라벨 길이로 좁힘(day-detail.js 공유 헬퍼)
            const selWidth = window._condSelWidth?.(curCondLabel) || '';
            const condTag = readOnly
              ? (it.condition !== 'any' ? `<span class="mb-week-cond">${escH(curCondLabel)}</span>` : '')
              : `<select class="mb-cond-select" style="width:${selWidth}" aria-label="인원 조건">${it.condOptions.map(o => `<option value="${o.value}"${o.value === it.condition ? ' selected' : ''}>${escH(o.label)}</option>`).join('')}</select>`;
            return `<div class="taste-game-item mb-week-game${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(it.name)}</span>${condTag}${mark}${badge}${_ro(`<button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button>`)}${_ro('<button class="mb-kebab-btn" type="button" title="이번 주 일정 관리" aria-label="메뉴">⋯</button>')}</div>`;
          };

          const _renderWeekList = (listType) => {
            const listId = listType === 'want' ? 'meetinglikedList' : 'meetingcuriousList';
            const countId = listType === 'want' ? 'meetinglikedCount' : 'meetingcuriousCount';
            const srcSet = listType === 'want' ? _likedSlugSet : _curiousSlugSet;
            const listEl = subBody.querySelector('#' + listId);
            const countEl = subBody.querySelector('#' + countId);
            if (!listEl) return;
            const items = _groupWeekGames(listType, srcSet);
            listEl.innerHTML = items.length
              ? items.map(it => _buildWeekChipHtml(it)).join('')
              : (readOnly ? '<p class="taste-game-empty">아직 없어요</p>' : '<p class="taste-game-empty">＋ 버튼으로 이번 주 하고 싶은 게임을 추가해보세요</p>');
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
                    _emitLikesChanged(srcTable, slug, null, true);
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

          // 원천(game_likes/curious) 게임 검색·추가 모달 — 검색 UI는 _openGameAddSearchModal 공유(R2 DRY), 목록추적 방식만 다름(배열 vs DOM)
          const _openBoxAddSearch = (listType, table, games, refresh, removeGame) => {
            const isWant = listType === 'want';
            _openGameAddSearchModal({
              overlayId: 'mbBoxAddSearch',
              title: `${isWant ? '❤️ 좋아하는 게임' : '👀 해보고 싶은 게임'} 추가`,
              inList: (gameId, customName) => {
                if (gameId) return games.some(g => String(g.game_id) === String(gameId));
                if (customName) return games.some(g => !g.game_id && g.custom_name === customName);
                return false;
              },
              onAdd: async (gameId, customName) => {
                await window.CottageDB?.addGamePref?.(userId, gameId, customName, table);
                games.push({ game_id: gameId || null, custom_name: customName || null });
                if (gameId) (isWant ? _likedSlugSet : _curiousSlugSet).add(String(gameId));
                _emitLikesChanged(table, gameId, customName, true); // 모임보드 ❤️/👀 마커·취향보드 즉시 동기화(Phase A)
                refresh();
              },
              onRemove: removeGame,
            });
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
              ${_ro('<button class="taste-add-btn mb-box-add-btn" type="button">＋ 게임 추가</button>')}
              <div class="taste-game-list mb-taste-box-list"></div>
            </div>`;
            document.body.appendChild(overlay);
            const listEl = overlay.querySelector('.mb-taste-box-list');
            const countEl = overlay.querySelector('.mb-box-count');
            const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
            // 게임시트가 이 모달 위에 떠 있으면 Esc를 무시한다 — 게임시트엔 Esc 핸들러가 없어서,
            // 안 막으면 시트 뒤에서 이 모달만 조용히 닫히고 시트를 닫았을 때 돌아올 곳이 사라진다.
            const onEsc = e => {
              if (e.key !== 'Escape') return;
              if (document.getElementById('gameSheet')?.classList.contains('is-active')) return;
              close();
            };
            overlay.querySelector('.mb-add-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', onEsc);

            const _boxItemHtml = (g) => {
              const gd = g.game_id ? window.gameData?.[g.game_id] : null;
              const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || String(g.game_id)) : (g.custom_name || String(g.game_id || ''));
              const thumb = gd?.images?.thumbnail ? `<img class="taste-game-thumb" src="${escH(gd.images.thumbnail)}" alt="">` : `<span class="taste-game-thumb-empty"></span>`;
              const clickable = g.game_id ? ' taste-game-item--clickable' : '';
              const gidAttr = g.game_id ? ` data-game-id="${escH(String(g.game_id))}"` : '';
              const cnAttr = g.custom_name ? ` data-custom-name="${escH(g.custom_name)}"` : '';
              const ruleKey = g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`;
              const ruleBadge = _ruleSet.has(ruleKey) ? '<span class="mb-rule-badge">📖</span>' : '';
              return `<div class="taste-game-item${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(name)}</span>${ruleBadge}${_ro('<button class="taste-game-del" type="button" title="삭제">✕</button>')}</div>`;
            };
            // 원천에서 삭제 — _openBoxAddSearch onAdd의 역순(DB → 로컬 배열 → srcSet → 전역 통보 → 재렌더).
            // srcSet.delete를 빼면 이번 주 리스트의 ❤️/👀 마커가 남는다(_emitLikesChanged는 이 Set을 안 고침).
            const _removeBoxGame = async (gameId, customName) => {
              await window.CottageDB?.removeGamePref?.(userId, gameId, customName, table);
              const idx = games.findIndex(g => (gameId ? String(g.game_id) === String(gameId) : (!g.game_id && g.custom_name === customName)));
              if (idx >= 0) games.splice(idx, 1);
              if (gameId) (isWant ? _likedSlugSet : _curiousSlugSet).delete(String(gameId));
              _emitLikesChanged(table, gameId, customName, false);
              renderList();
              _renderWeekList(listType);
            };
            const renderList = () => {
              listEl.innerHTML = games.length ? games.map(_boxItemHtml).join('') : '<p class="taste-game-empty">아직 없어요</p>';
              if (countEl) countEl.textContent = `${games.length}개`;
              // 썸네일만 클릭 → 게임시트. 이 모달은 --z-board-modal(9300) < 게임시트(9500)이라
              // 닫지 않아도 시트가 위에 겹쳐 뜨고, 시트를 닫으면 이 모달로 돌아온다.
              // (이번 주 리스트의 썸네일 핸들러가 서브시트 9200에서 쓰는 것과 같은 방식)
              listEl.querySelectorAll('.taste-game-item--clickable .taste-game-thumb, .taste-game-item--clickable .taste-game-thumb-empty').forEach(th => th.addEventListener('click', () => {
                const gid = th.closest('.taste-game-item')?.dataset.gameId;
                if (gid) { window.ensureGameSheet?.(); window.openGameSheet?.(gid); }
              }));
              listEl.querySelectorAll('.taste-game-del').forEach(btn => btn.addEventListener('click', async () => {
                const item = btn.closest('.taste-game-item');
                const gameName = item?.querySelector('.taste-game-name')?.textContent || '이 게임';
                if (!confirm(`'${gameName}'을(를) 목록에서 뺄까요?`)) return;
                await _removeBoxGame(item?.dataset.gameId || null, item?.dataset.customName || null);
              }));
            };
            renderList();
            overlay.querySelector('.mb-box-add-btn')?.addEventListener('click', () => _openBoxAddSearch(listType, table, games, renderList, _removeBoxGame));
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
            // 인원조건 select — 자세히(막대 클릭) 모달의 dd-cond-select와 같은 DB 컬럼(player_condition)을 씀 → 양쪽 연동
            listEl?.addEventListener('change', async e => {
              const sel = e.target.closest('.mb-cond-select');
              if (!sel) return;
              const item = sel.closest('.taste-game-item');
              if (!item) return;
              const slug = item.dataset.gameId || null;
              const customName = item.dataset.customName || null;
              const grp = _groupWeekGames(listType, srcSet).find(it => (slug ? it.slug === slug : it.customName === customName));
              if (!grp || !grp.dates.length) return;
              const newCond = sel.value;
              const prevCond = grp.condition;
              const vgId = slug ? (window.gameData?.[slug]?.bgg?.id ?? null) : null;
              const vgCustom = vgId != null ? null : (customName || grp.name);
              sel.disabled = true;
              let ok = true;
              for (const d of grp.dates) {
                const result = await window.CottageDB?.setMeetingVoteGameCondition(String(userId), d, vgId, vgCustom, listType, newCond);
                if (!result || !result.ok) { ok = false; console.error('[모임보드] setMeetingVoteGameCondition:', result); }
              }
              sel.disabled = false;
              if (!ok) { sel.value = prevCond; sel.style.width = window._condSelWidth?.(sel.options[sel.selectedIndex]?.text) || ''; window.showToast?.('인원 조건 변경에 실패했어요'); return; }
              sel.style.width = window._condSelWidth?.(sel.options[sel.selectedIndex]?.text) || '';
              // 로컬 캐시 갱신(다음 자세히 모달 오픈 시 재조회 없이도 일치)
              const dateSet = new Set(grp.dates);
              _weekData.myVoteGames.forEach(g => {
                const gslug = g.game_id != null ? _mbSlug(g.game_id) : null;
                const same = (slug ? gslug === slug : g.custom_name === (customName || grp.name)) && g.list_type === listType && dateSet.has(g.vote_date);
                if (same) g.player_condition = newCond;
              });
              // 홈 미리보기("이날 모임 한눈에 보기")는 자체 캐시라 신호 없이는 갱신 안 됨 → 전역 이벤트로 통지
              window.dispatchEvent(new CustomEvent('cottage-meeting-changed', { detail: { reason: 'condition' } }));
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
              weekEl.innerHTML = `<div class="taste-section-label">📅 이번 주 일정 ${_ro('<button class="mb-planner-edit" type="button" title="모임 플래너 편집">✎ 편집</button>')}</div>` + _buildMiniBarWeekHtml(_weekData.myVotes, _weekData.myVoteGames, userId, !readOnly);
              weekEl.querySelector('.mb-planner-edit')?.addEventListener('click', () =>
                window.openPlannerModal?.({ weekOffset: 0, onDirtyClose: _loadMeetingWeek }));
              weekEl.querySelectorAll('.mb-detail-btn').forEach(btn => btn.addEventListener('click', () => {
                const _d = btn.dataset.date;
                // 읽기전용: 남의 보드 상세는 편집 불가 스케줄 뷰로. 자기 보드는 편집 가능한 프리뷰 모달.
                // 읽기전용: 남의 보드도 그날 전원 막대 차트로. 편집은 막기 위해 myVote=null(내 막대 하이라이트·✎✕ 없음).
                if (readOnly) { window.openDatePreviewModal?.(_d, allV.filter(v => v.vote_date === _d), allVG.filter(g => g.vote_date === _d), null, null); return; }
                window.openDatePreviewModal?.(_d, allV.filter(v => v.vote_date === _d), allVG.filter(g => g.vote_date === _d), _weekData.myVotes.find(v => v.vote_date === _d) || null, _loadMeetingWeek);
              }));
            }
            // 취향보드 수정 후 "‹ 모임 보드"로 복귀 시 눌렀던 스크롤 위치 복원 (렌더 완료 후)
            if (getPendingScroll() != null) {
              subBody.scrollTop = getPendingScroll();
              setPendingScroll(null);
            }
          };
          // 다른 화면(게임시트·취향보드)에서 좋아요/궁금해요가 바뀌면 ❤️/👀 마커 즉시 반영
          // 읽기전용: 뷰어 본인의 좋아요 변경이 남의 주간 마커에 반영되면 안 되므로 등록 스킵
          if (!readOnly) {
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
          }

          _loadMeetingWeek();
        }

// ── '최근 소식'(알림) 서브시트 afterRender (R10a: openProfilePanel에서 추출) ──
// ctx: _markAllNotifSeen/_markOneNotifSeen/_markVoucherSeen/_markNoticeSeen(user·body 캡처), _getGameKeyByName/_getGameKeyById
function _bindNotifSubsheet(subBody, ctx) {
  const { _markAllNotifSeen, _markOneNotifSeen, _markVoucherSeen, _markNoticeSeen, _getGameKeyByName, _getGameKeyById, _notifTitle } = ctx;
          subBody.querySelector('.profile-notif-confirm-all')?.addEventListener('click', () => _markAllNotifSeen(subBody));
          subBody.querySelector('.profile-voucher-confirm')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelector('.profile-voucher-link')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelector('.profile-notice-confirm')?.addEventListener('click', () => _markNoticeSeen(subBody));
          subBody.querySelectorAll('.notif-read-one-btn').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); _markOneNotifSeen(btn.closest('li'), subBody); });
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
                // 남의 보드로 교체되므로 알림으로 돌아올 경로를 함께 넘긴다(R10c).
                // backTo.opts는 비워 둘 것 — readOnly를 실으면 알림 버튼이 _ro()로 사라져 조용히 무시된다.
                openOtherMeetingSheet(li.dataset.introUid, { backTo: { type: 'panel', autoSubsheet: 'notif', label: _notifTitle } });
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
}

// ── '음료교환권' 서브시트 afterRender (R10a: openProfilePanel에서 추출) ──
// ctx: _bindVoucher (openProfilePanel 지역 — user/isDevMode를 캡처하므로 여기로 못 올림)
function _bindVoucherSubsheet(subBody, ctx) {
  const { _bindVoucher } = ctx;
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
}

// ── '함께한 시간' 서브시트 afterRender (R10a: openProfilePanel에서 추출) ──
// 바깥 스코프 캡처 없음 → ctx 불필요. 본문은 원본 들여쓰기 보존(diff로 이동 검증).
function _bindUsageSubsheet(subBody) {
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
}

async function openProfilePanel(autoSubsheet = null, opts = {}) {
  // Phase C: userId 파라미터화 + 읽기전용 모드. readOnly면 대상 유저(userId)의 공개 보드를
  // 편집 컨트롤 없이 표시(비공개 섹션=알림·교환권·함께한 시간 제외). 편집 컨트롤 HTML은 _ro()로 생략.
  // backTo: 진입 직전 화면으로 돌아갈 경로. 있으면 패널 헤더에 뒤로가기가 생긴다.
  //   { type:'gameSheet', gameKey, label } — 좋아요 토스트로 들어온 경우 원래 게임시트로
  //   { type:'panel', autoSubsheet, label, opts? } — 알림에서 남의 보드로 들어온 경우 내 보드로
  // 서브시트→패널 뒤로가기는 _openSubSheet가 이미 하므로, 여기는 패널 한 칸만 담당(깊이 1).
  // 체인이 생겨도 각 패널의 클로저가 자기 backTo를 들고 있어 스택 자료구조가 필요 없다.
  const { userId: _targetUserId = null, readOnly = false, backTo = null } = opts;
  const _selfUser = getKakaoUser();
  const user = readOnly
    ? { id: String(_targetUserId), nickname: opts.nickname || '' }
    : _selfUser;
  if (!user || !user.id) return;
  // 편집 컨트롤 HTML 생략 헬퍼 (읽기전용이면 '' 반환)
  const _ro = html => (readOnly ? '' : html);
  const _boardLabel = '내 보드';

  // 취향보드에서 수정 후 "‹ 모임 보드"로 복귀 시 복원할 스크롤 위치(패널 유지되는 동안 서브시트 스왑 간 보존)
  let _pendingMeetingScrollTop = null;

  // 좋아요/궁금해요 변경 전역 통보 (취향보드·모임보드·게임시트 간 즉시 동기화)
  // customName은 직접입력 게임(game_id 없음)용 — 개수 집계는 이것도 세야 맞다.
  // 목록 DOM을 고치는 기존 수신부들은 gameId가 없으면 그냥 무시한다.
  const _emitLikesChanged = (table, gameId, customName, added) => {
    if (!gameId && !customName) return;
    try { window.dispatchEvent(new CustomEvent('cottage-likes-changed', { detail: { table, gameId: gameId ? String(gameId) : null, customName: customName || null, added: !!added } })); } catch (_) {}
  };

  const existing = document.getElementById('profilePanel');
  // 자기 보드는 버튼 재클릭 시 토글로 닫힘. 읽기전용은 항상 새로 열기(닉네임 클릭 등 진입).
  if (existing) { existing.remove(); document.getElementById('profileSubSheet')?.remove(); if (!readOnly) return; }

  const panel = document.createElement('div');
  panel.id = 'profilePanel';
  panel.className = 'profile-panel' + (readOnly ? ' profile-panel--readonly' : '');
  const isOwnerUser = String(user.id) === String(OWNER_KAKAO_ID);
  const isDevMode = location.hostname === 'localhost' || isOwnerUser;
  panel.innerHTML = `<div class="profile-panel-box">
    <div class="profile-panel-header${backTo ? ' profile-panel-header--with-back' : ''}">
      ${backTo ? `<button class="profile-panel-back" type="button">‹ ${escH(backTo.label || '뒤로')}</button>` : ''}
      <span class="profile-panel-title">${escH(user.nickname || (readOnly ? '회원' : '손님'))}의 ${_boardLabel}</span>
      <button class="profile-panel-close" type="button">✕</button>
    </div>
    <div class="profile-panel-body">
      <p class="profile-panel-loading">불러오는 중...</p>
    </div>
  </div>`;
  document.body.appendChild(panel);
  _trackPvOnce(readOnly ? 'other-board' : 'my-board');
  panel.querySelector('.profile-panel-close').addEventListener('click', () => { document.getElementById('profileSubSheet')?.remove(); panel.remove(); });
  panel.addEventListener('click', e => { if (e.target === panel) { document.getElementById('profileSubSheet')?.remove(); panel.remove(); } });
  panel.querySelector('.profile-panel-header').addEventListener('click', e => { if (!e.target.closest('button')) panel.querySelector('.profile-panel-body')?.scrollTo({top:0,behavior:'smooth'}); });
  // ⚠️ 자기 패널을 먼저 지운 뒤 복귀시킨다. 순서가 바뀌면 위 토글 가드(`if (existing) … if (!readOnly) return`)에
  // 걸려 내 보드가 안 열리고 화면이 텅 빈다.
  panel.querySelector('.profile-panel-back')?.addEventListener('click', () => {
    document.getElementById('profileSubSheet')?.remove();
    panel.remove();
    // restoreScroll=true(보던 지점으로) + noAnim=true(올라오는 연출 없이) — 원래 있던 시트로 돌아가는 것이므로
    if (backTo.type === 'gameSheet') { window.ensureGameSheet?.(); window.openGameSheet?.(backTo.gameKey, true, null, true); }
    else if (backTo.type === 'panel') openProfilePanel(backTo.autoSubsheet || null, backTo.opts || {});
  });

  if (!window.CottageDB?.getMyStats) return;
  const _sessForNotif = window._cottageSess?.get(String(user.id)) || {};
  const _now = new Date();
  const _monthStart = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-01`;
  const _monthEnd   = new Date(_now.getFullYear(), _now.getMonth()+1, 0);
  const _monthEndStr = `${_monthEnd.getFullYear()}-${String(_monthEnd.getMonth()+1).padStart(2,'0')}-${String(_monthEnd.getDate()).padStart(2,'0')}`;
  const _emptyCodex = { html: '', playedCount: 0, totalGames: 0 };
  // likedGames/curiousGames를 따로 조회하지 않는다 — getMeetingProfile이 내부에서 같은
  // getUserLikedGamesAll/getUserCuriousGamesAll를 부르므로 예전엔 같은 쿼리를 한 Promise.all에서
  // 두 번 쏘고 결과를 별도 배열로 들고 있었다. 그 중복이 크로스보드 stale의 실체였다(R10b).
  const [stats, notifs, _codexResult, userStats, voucherBalance, voucherProducts, voucherHistory, allBioSuggestions, allAvoidSuggestions, _thisMonthVotes, meetingProfile] = await Promise.all([
    window.CottageDB.getMyStats(String(user.id), user.nickname || null),
    // 알림·교환권은 비공개 → 읽기전용에서는 조회하지 않음(개인정보)
    readOnly ? Promise.resolve([]) : (window.CottageDB.getMyNotifications?.(String(user.id), user.nickname || null, _sessForNotif.notifSeenAt || null, _sessForNotif.newGameSeenAt || null) || Promise.resolve([])),
    (window.CottageAchievements?.buildCodexSection(String(user.id)) || Promise.resolve(_emptyCodex)).catch(() => _emptyCodex),
    (window.CottageAchievements?.fetchUserStats?.(String(user.id), user.nickname || null) || Promise.resolve(null)).catch(() => null),
    readOnly ? Promise.resolve(0)  : (window.CottageDB?.getVoucherBalance?.(String(user.id)) || Promise.resolve(0)).catch(() => 0),
    readOnly ? Promise.resolve([]) : (window.CottageDB?.getVoucherProducts?.() || Promise.resolve([])).catch(() => []),
    readOnly ? Promise.resolve([]) : (window.CottageDB?.getVoucherHistory?.(String(user.id), 5) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getAllBioTagSuggestions?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getAllAvoidTagSuggestions?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getMeetingVotes?.(_monthStart, _monthEndStr) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getMeetingProfile?.(String(user.id)) || Promise.resolve(null)).catch(() => null),
  ]);
  // 읽기전용: 대상 유저 닉네임을 stats.profile에서 확정 후 헤더 갱신
  if (readOnly && !user.nickname) {
    user.nickname = stats?.profile?.nickname || '회원';
    const _titleEl = panel.querySelector('.profile-panel-title');
    if (_titleEl) _titleEl.textContent = `${user.nickname}의 ${_boardLabel}`;
  }
  // 칭호/캐릭터/업적 섹션: rep_title_id + visit_count 확정 후, fetchUserStats 결과 공유 → DB 재조회 없음
  const _repTitleId = stats?.profile?.rep_title_id || null;
  const _visitCount = stats?.profile?.visit_count || 0;
  const _emptyChar = { html: '', earnedCharCount: 0, charTotal: 47 };
  const _emptyAch = { html: '', achCount: 0, achTotal: 96 };
  const _emptyTitle = { html: '', earnedIds: new Set(), titleTotal: 33 };
  // 소급 업적 지급(명시적 write, ACH5) — 내 보드에서만. readOnly 열람은 대상 유저 DB를 건드리지 않는다.
  // 빌드 앞에서 처리해 userStats.achievements가 갱신 → 아래 3섹션이 신규 지급분을 같은 렌더에 반영.
  if (!readOnly && userStats) {
    await (window.CottageAchievements?.grantRetroAchievements?.(String(user.id), userStats) || Promise.resolve()).catch(() => {});
  }
  const [_charResult, _achResult, _titleResult] = await Promise.all([
    (window.CottageAchievements?.buildCharacterSection(String(user.id), user.nickname || null, userStats) || Promise.resolve(_emptyChar)).catch(() => _emptyChar),
    (window.CottageAchievements?.buildAchievementsSection(String(user.id), user.nickname || null, userStats) || Promise.resolve(_emptyAch)).catch(() => _emptyAch),
    (window.CottageAchievements?.buildTitleSection?.(String(user.id), _repTitleId, _visitCount, user.nickname || null, userStats) || Promise.resolve(_emptyTitle)).catch(() => _emptyTitle),
  ]);
  const codexHtml = _codexResult?.html || '';
  const charHtml = _charResult?.html || '';
  const achHtml = _achResult?.html || '';
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
  // ── 전체 공지 카드 (기간 내에만) ──
  const _feeNoticeLive = window._isFeeNoticeLive();
  const _feeSeen = !!_sessForNotif.feeNoticeSeen;
  const _feeNoticeHtml = !_feeNoticeLive ? '' : `<div class="notif-reward-card notif-reward-card--notice${_feeSeen ? ' is-seen' : ' is-new'}">
    <div class="notif-reward-row">
      <div class="notif-reward-icon-col">📢</div>
      <div class="notif-reward-body">
        <div class="notif-reward-title">${escH(FEE_NOTICE.title)} ${_feeSeen ? '' : '<span class="profile-notif-new-badge" style="color:#fff">NEW</span>'}</div>
        <div class="notif-reward-desc"><strong>${escH(fmtShort(FEE_NOTICE.from))}부터 지인팟 전용 요금 할인이 폐지됩니다.</strong><br>
        동호회 회원 없이 지인들끼리만 이용하시는 경우, 일반 이용 요금(1인 7,000원)이 적용됩니다.<br><br>
        <strong>모임에 함께 참여하시는 동반 인원 할인은 그대로 유지됩니다</strong>(1인 5,000원).<br><br>
        요금 할인은 모임을 활성화하고 모임에 기여해주시는 분들께 드리는 혜택이라는 취지에서 마련된 것이라, 이렇게 정리하게 되었습니다. 그동안 이용해주신 분들께 감사드리며 앞으로도 많은 이용 부탁드립니다.</div>
        <div class="notif-card-date">${escH(fmtShort(FEE_NOTICE.from))} 시행</div>
      </div>
    </div>
    ${_feeSeen ? '' : '<div class="notif-reward-actions"><button class="profile-notice-confirm" type="button">확인했어요</button></div>'}
  </div>`;

  let voucherCardHtml = '';
  if (_hasFirstPlayVoucher) {
    voucherCardHtml = `<div class="notif-reward-card notif-reward-card--voucher is-seen">
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
    voucherCardHtml = `<div class="notif-reward-card notif-reward-card--voucher${voucherSeen ? '' : ' is-new'}">
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
  const _newCount = notifs.filter(n => n.isNew).length + (_effectiveVoucherSeen ? 0 : 1)
    + (_feeNoticeLive && !_feeSeen ? 1 : 0);
  // play-records-utils.js의 공용 구현으로 위임(사본 제거). 전 페이지에서 utils가 먼저 로드됨.
  const _getGameKeyById = gameId => window.getGameKeyById?.(gameId) ?? null;
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
    // 개별 읽음 키를 버튼에 실어둔다 — <li> 8종에 각각 붙이는 대신 한 곳으로.
    // 묶음(new_intro)은 구성원 키가 여러 개라 콤마로 이어 붙인다.
    const _keys = (n.keys || (n.key ? [n.key] : [])).join(',');
    const readBtn = n.isNew ? `<button class="notif-read-one-btn" type="button" data-notif-keys="${escH(_keys)}">읽음</button>` : '';
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
    // 교환권은 유형+날짜로 묶여서 온다(관리자 전용). names는 중복 제거된 사람 목록,
    // count는 건수라 서로 다를 수 있다 — 한 사람이 하루에 여러 번 쓰면 names 1 / count 13.
    if (n.type === 'voucher_granted' || n.type === 'voucher_used') {
      const used = n.type === 'voucher_used';
      const names = n.names || [n.nickname];
      const who = names.length > 1 ? `${escH(names[0])} 외 ${names.length - 1}명` : escH(names[0] || '사용자');
      const cnt = n.count > 1 ? ` ${n.count}건` : '';
      const reasonLabel = used ? '음료 교환권 사용'
        : n.reason === 'first_play' ? '첫 기록 보상' : n.reason === 'achievement' ? '업적 달성 보상' : '관리자 지급';
      return `<li class="${cls}">${_card('🎫', `${who} 교환권 ${used ? '사용' : '획득'}${cnt}`, reasonLabel)}${readBtn}</li>`;
    }
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
  // 공지는 미확인이면 맨 위, 확인했으면 맨 아래 — 보상 카드와 같은 규칙
  const _noticeFirst = _feeNoticeLive && !_feeSeen;
  let _notifInnerHtml = `<div class="notif-list-header">${_hasAnyNew ? '<button class="profile-notif-confirm-all" type="button">모두 읽기</button>' : ''}</div>${_noticeFirst ? _feeNoticeHtml : ''}${_voucherFirst ? voucherCardHtml : ''}<ul class="profile-notif-list">${_allNotifItems}</ul>${_hiddenNotifHtml}${_voucherFirst ? '' : voucherCardHtml}${_noticeFirst ? '' : _feeNoticeHtml}${_notifHelpHtml}`;

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
  // KA3: build 함수가 {html, count, total} 객체를 직접 반환하므로 HTML regex 파싱 불필요(구 _safeInt 제거)
  const _charCount   = _charResult?.earnedCharCount ?? 0;
  const _charTotal   = _charResult?.charTotal ?? 47;
  const _titleCount  = _earnedTitleIds.size;
  const _titleTotal  = _titleResult?.titleTotal ?? 33;
  const _codexPlayed = _codexResult?.playedCount ?? 0;
  const _codexTotal  = _codexResult?.totalGames ?? 641;
  const _achCount    = _achResult?.achCount ?? 0;
  const _achTotal    = _achResult?.achTotal ?? 96;

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
  // ── 취향·모임 보드 공용 데이터 (R10b: 진입 시 DB 재조회 = 단일 소스) ────────────
  // 두 보드는 좋아요·궁금해요·한줄소개·피하는유형·룰설명을 똑같이 보여준다. 예전엔 각자
  // 사본을 들고 있어 한쪽 편집이 반대편에 새로고침 전까지 안 보였다(크로스보드 stale).
  // 이제 서브시트에 들어갈 때마다 getMeetingProfile 하나를 다시 읽어 양쪽에 넘긴다.
  const _emptyBoardData = { bio: '', avoidTags: [], nickname: '', location: '', available: '', travelRange: '', meetingStyle: [], likedGames: [], curiousGames: [], ruleGames: [] };
  // 재조회하는 동안 잠깐 보이는 자리(모임보드가 이미 쓰던 클래스 재사용 — 신규 CSS 없음)
  const _SUBSHEET_LOADING_HTML = '<p class="taste-game-empty">불러오는 중…</p>';
  let _boardData = meetingProfile || _emptyBoardData; // 패널 오픈 시 값이 최초의 '직전 값'
  async function _refreshBoardData() {
    const mp = await (window.CottageDB?.getMeetingProfile?.(String(user.id)) || Promise.resolve(null))
      .catch(e => { console.error('[openProfilePanel:_refreshBoardData]', e); return null; });
    // 성공했을 때만 교체 — 재조회가 실패해도 보고 있던 목록이 빈 목록으로 덮이지 않는다.
    // (쿼리 오류는 getMeetingProfile 내부에서 console.error로 울린다)
    if (mp) _boardData = mp;
    return _boardData;
  }
  // 룰 설명 가능(can_explain_rules) — 취향·모임 보드 공유(meeting_game_prefs). game_id는 슬러그.
  const _makeRuleSet = d => new Set((d?.ruleGames || []).map(g => g.game_id ? `id:${g.game_id}` : `cn:${g.custom_name || ''}`));
  const _bioTagsOf = d => (d?.bio ? d.bio.split(',').map(t => t.trim()).filter(Boolean) : []);
  // 취향보드에서 '비선호 유형 수정 →'으로 들어왔을 때 렌더 후 스크롤할 섹션(모임보드가 세팅)
  let _pendingTasteScrollTo = null;

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
      return `<div class="taste-game-item${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(name)}</span>${_ro(`<button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button>`)}${_ro('<button class="taste-game-del" type="button" title="삭제">✕</button>')}</div>`;
    };
    if (games.length <= maxInitial) return games.map(renderItem).join('');
    const restCount = games.length - maxInitial;
    return `${games.slice(0, maxInitial).map(renderItem).join('')}<div class="taste-game-more-wrap" hidden>${games.slice(maxInitial).map(renderItem).join('')}</div><button class="taste-more-btn" type="button">더 보기 (${restCount}개 더)</button>`;
  }

  // 진입할 때마다 최신 데이터로 다시 빌드(R10b). 첫 줄에서 원래 이름을 복원해
  // 아래 템플릿 본문은 예전 그대로 — 바뀐 건 "언제 빌드하나"지 "무엇을 그리나"가 아니다.
  function _buildTasteInnerHtml(d) {
    const _bio = d.bio || '';
    const _bioTags = _bioTagsOf(d);
    const _avoidTags = d.avoidTags || [];
    const _ruleSet = _makeRuleSet(d);
    const likedGames = d.likedGames || [];
    const curiousGames = d.curiousGames || [];
    return `
    <div class="taste-bio-section">
      <div class="taste-section-label">한줄 소개</div>
      <div class="taste-bio-row">
        <span class="taste-bio-display" data-bio="${escH(_bio)}">${_bioTags.length ? _bioTags.map(t => `<span class="taste-bio-tag">${escH(t)}</span>`).join('') : `<span class="taste-bio-placeholder">${readOnly ? '소개 없음' : '소개를 추가해보세요'}</span>`}</span>
        ${_ro('<button class="taste-bio-edit-btn" type="button" title="편집">✏️</button>')}
      </div>
      ${_ro(`<div class="taste-bio-edit-wrap" style="display:none">
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
      </div>`)}
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">❤️ 좋아하는 게임 <span class="taste-count" id="tastelikedCount">${likedGames.length}개</span> ${_ro('<button class="taste-add-btn taste-add-btn--inline" id="tastelikedAddBtn" type="button">+ 게임 추가</button>')}</div>
      <div class="taste-game-list" id="tastelikedList">${_buildTasteGameItems(likedGames, _ruleSet)}</div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label">👀 해보고 싶은 게임 <span class="taste-count" id="tastecuriousCount">${curiousGames.length}개</span> ${_ro('<button class="taste-add-btn taste-add-btn--inline" id="tastecuriousAddBtn" type="button">+ 게임 추가</button>')}</div>
      <div class="taste-game-list" id="tastecuriousList">${_buildTasteGameItems(curiousGames, _ruleSet)}</div>
    </div>
    ${readOnly
      ? (_avoidTags.length ? `<div class="taste-avoid-section">
      <div class="taste-section-label">🚫 피하는 유형</div>
      <div class="taste-tag-grid">${_avoidTags.map(t => `<span class="taste-avoid-tag is-active" style="pointer-events:none">${escH(t)}</span>`).join('')}</div>
    </div>` : '')
      : `<div class="taste-avoid-section">
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
    </div>`}`;
  }
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
  let _recordInnerHtml = `
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
  // 카드 요약 — 패널 오픈 시 1회. 서브시트에서 고친 값은 여기 반영 안 됨(패널을 닫았다 열면 맞음).
  // 알려진 열린 항목(PROJECT_STATE §3): 서브시트는 pull(진입 시 재조회), 카드는 push(나갈 때 갱신)라
  // 해법 방향이 반대여서 R10b 범위에서 제외.
  const _voucherCardSummary = `${voucherBalance}장 보유`;
  // 취향 카드 요약: 예전엔 패널 오픈 시 1회 문자열이라 서브시트에서 게임을 추가해도
  // 카드는 옛 개수 그대로였다(들어가면 4개, 나오면 3개). 이제 _boardData(취향·모임 공용
  // 단일 소스)를 받는 함수이고, 변경이 일어난 자리에서 _syncTasteCard()로 다시 그린다.
  const _tasteCardSummaryHtml = (d) => {
    const tags = _bioTagsOf(d);
    const preview = tags.length ? `${tags.slice(0, 2).map(t => `#${t}`).join(' ')}${tags.length > 2 ? ` +${tags.length - 2}` : ''}` : '';
    return (preview ? `<span class="profile-card-bio-row">${escH(preview)}</span>` : '') +
      `<span class="profile-card-games-row">❤️ 좋아하는 게임 ${(d.likedGames || []).length}개\n👀 해보고싶은 게임 ${(d.curiousGames || []).length}개</span>`;
  };
  const _syncTasteCard = () => {
    const el = body.querySelector('.profile-card[data-subsheet="taste"] .profile-card-summary');
    if (el) el.innerHTML = _tasteCardSummaryHtml(_boardData);
  };
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
  }${_ro('<span class="profile-panel-avatar-edit">⚙</span>')}</div>`;
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
  // 읽기전용에서는 남의 유저에 업적을 지급하면 안 되므로 스킵
  if (!readOnly) {
    window.CottageDB?.getUserFirstRecordCount?.(String(user.id)).then(frc => {
      window.checkAchievements?.('first_record', String(user.id), { firstRecordCount: frc });
    }).catch(() => {});
    if (user.nickname) {
      window.CottageDB?.getUserParticipationCount?.(String(user.id), user.nickname).then(pc => {
        window.checkAchievements?.('play', String(user.id), { participationCount: pc });
      }).catch(() => {});
    }
  }

  // 모임 보드: 회원 자기소개(member_intros) + profiles.bio(한줄소개, 취향보드와 공유 SSOT) +
  // meeting_game_prefs(이번에 하고싶은 게임/룰 설명 가능한 게임) 연동. 자기소개 페이지와 동일 데이터 공유.
  // 선호=bio(한줄소개), 비선호=avoid_tags — 편집은 취향보드에서. meeting_style은 미사용(하위호환 잔존).
  // 데이터는 _boardData(진입 시 재조회) — 취향보드와 같은 소스를 본다(R10b)
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

  // 진입할 때마다 최신 데이터로 다시 빌드(R10b) — 취향보드와 동일 기법(첫 줄에서 이름 복원)
  function _buildMeetingInnerHtml(d) {
    const _meeting = d;
    const _bioTags = _bioTagsOf(d);
    const _avoidTags = d.avoidTags || [];
    // 선호(취향보드 한줄소개=bio) / 비선호(취향보드 피하는 유형=avoid_tags) 요약 — 읽기전용 칩
    // 편집은 취향보드에서 (mb-pref-edit 버튼 → openProfilePanel('taste'))
    const _mbLikeStyleHtml = _bioTags.length
      ? _bioTags.map(t => `<span class="mb-pref-tag mb-pref-tag--like">${escH(t)}</span>`).join('')
      : '<span class="mb-pref-empty">미설정</span>';
    const _mbAvoidHtml = _avoidTags.length
      ? _avoidTags.map(t => `<span class="mb-pref-tag mb-pref-tag--avoid">${escH(t)}</span>`).join('')
      : '<span class="mb-pref-empty">미설정</span>';

    return `
    <div class="taste-game-section" id="mbWeekSection">
      <div class="taste-section-label">📅 이번 주 일정</div>
      <p class="taste-game-empty">불러오는 중…</p>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label taste-section-label--mb"><span class="mb-sec-name">❤️ 이번 주 하고 싶은 게임</span> <span class="taste-count" id="meetinglikedCount"></span> ${_ro('<button class="taste-add-btn taste-add-btn--inline" id="meetinglikedAddBtn" type="button">＋추가</button>')} <button class="mb-taste-link" id="meetinglikedBoxBtn" type="button">좋아하는 게임</button></div>
      <div class="taste-game-list" id="meetinglikedList"><p class="taste-game-empty">불러오는 중…</p></div>
    </div>
    <div class="taste-game-section">
      <div class="taste-section-label taste-section-label--mb"><span class="mb-sec-name">💡 이번 주 배우고 싶은 게임</span> <span class="taste-count" id="meetingcuriousCount"></span> ${_ro('<button class="taste-add-btn taste-add-btn--inline" id="meetingcuriousAddBtn" type="button">＋추가</button>')} <button class="mb-taste-link" id="meetingcuriousBoxBtn" type="button">궁금한 게임</button></div>
      <div class="taste-game-list" id="meetingcuriousList"><p class="taste-game-empty">불러오는 중…</p></div>
    </div>
    <div class="taste-game-section mb-pref-summary">
      <div class="mb-pref-block">
        <div class="taste-section-label">👍 선호 스타일 ${_ro('<button class="mb-pref-edit" type="button" data-pref="like">취향보드에서 수정 →</button>')}</div>
        <div class="mb-pref-tags" id="mbLikeStyleTags">${_mbLikeStyleHtml}</div>
      </div>
      <div class="mb-pref-block">
        <div class="taste-section-label">👎 비선호 유형 ${_ro('<button class="mb-pref-edit" type="button" data-pref="avoid">취향보드에서 수정 →</button>')}</div>
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
        ${_meetingProfileRowHtml('활동 지역', _meeting.location)}
        ${_meetingProfileRowHtml('참여 가능 시간', _meeting.available)}
        ${_meetingProfileRowHtml('이동 가능 범위', _meeting.travelRange)}
      </div>
      ${_ro(`<button class="meeting-profile-edit-btn taste-bio-edit-btn" type="button" title="수정">✏️ 수정</button>
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
      </div>`)}
    </div>`;
  }

  body.innerHTML = `
    <div class="profile-panel-profile">
      <div class="profile-panel-profile-top">
        ${_repImgHtml}
        <div class="profile-panel-profile-info">
          <div class="profile-panel-nick-row">
            <button class="profile-panel-nick" type="button">${escH(user.nickname || (readOnly ? '회원' : '손님'))} ${_ro('<span class="profile-nick-edit">✏️</span>')}</button>
            ${_ro(`<button class="profile-panel-notif-btn${_newCount === 0 ? ' is-zero' : ''}" data-subsheet="notif" type="button">${_newCount > 0 ? '<span class="notif-red-dot"></span>' : ''}🔔 ${_newCount > 0 ? `새 알림 ${_newCount}건` : '알림'}</button>`)}
          </div>
          <span class="profile-panel-rep-name">${_repLabel}</span>
          <button class="profile-panel-title-name${_validRepTitle ? '' : ' is-empty'}" type="button">${_validRepTitle ? `${_validRepTitle.emoji} ${escH(_validRepTitle.name)} ${_ro('<span class="profile-title-edit">⚙</span>')}` : `칭호 없음 ${_ro('<span class="profile-title-edit">⚙</span>')}`}</button>
          ${readOnly ? '<span class="profile-panel-readonly-hint">읽기 전용으로 보고 있어요</span>' : ''}
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
        <span class="profile-card-summary">${_tasteCardSummaryHtml(_boardData)}</span>
      </button>
      <button class="profile-card" data-subsheet="records" type="button">
        <span class="profile-card-icon">📝</span>
        <span class="profile-card-label">기록 보드</span>
        <span class="profile-card-summary">${escH(_recordCardSummary)}</span>
      </button>
      ${_ro(`<button class="profile-card" data-subsheet="usage" type="button">
        <span class="profile-card-icon">📊</span>
        <span class="profile-card-label">함께한 시간</span>
        <span class="profile-card-summary">${escH(_statsSummary)}</span>
      </button>`)}
      <button class="profile-card" data-subsheet="meeting" type="button">
        <span class="profile-card-icon">📅</span>
        <span class="profile-card-label">모임 보드</span>
        <span class="profile-card-summary">${_ro('<span class="profile-card-meeting-cta">이번 모임 준비하기</span>')}${_scheduleHtml || `<span class="profile-card-meeting-empty">아직 등록한 일정이 없어요</span>`}</span>
      </button>
      ${_ro(`<button class="profile-card profile-card--span2" data-subsheet="voucher" type="button">
        <span class="profile-card-icon">🎫</span>
        <span class="profile-card-label">음료교환권</span>
        <span class="profile-card-summary">${escH(_voucherCardSummary)}</span>
      </button>`)}
    </div>`;

  // ── 서브시트 헬퍼 ──────────────────────────────────────────────
  function _openSubSheet(title, contentHtml, afterRender, bodyClass = '', onLeave = null) {
    document.getElementById('profileSubSheet')?.remove();
    const sub = document.createElement('div');
    sub.id = 'profileSubSheet';
    sub.className = 'profile-subsheet' + (readOnly ? ' profile-subsheet--readonly' : '');
    sub.innerHTML = `
      <div class="profile-subsheet-box">
        <div class="profile-subsheet-header">
          <button class="profile-subsheet-back" type="button">‹ ${escH(user.nickname || (readOnly ? '회원' : '손님'))}의 ${_boardLabel}</button>
          <span class="profile-subsheet-title">${title}</span>
          <button class="profile-subsheet-close" type="button">✕</button>
        </div>
        <div class="profile-subsheet-body${bodyClass ? ' ' + bodyClass : ''}">${contentHtml}</div>
      </div>`;
    document.body.appendChild(sub);
    // 서브시트를 패널로 되돌릴 때(뒤로가기/백드롭) 현재 DOM 상태를 스냅샷 → 재진입 시 변경분 유지.
    // (✕닫기는 패널 자체를 제거해 다음 오픈 시 DB에서 새로 로드하므로 스냅샷 불필요)
    // onLeave가 조용히 실패하면 스냅샷이 누락돼 재진입 시 상태가 되돌아간다(개별 읽음이 이걸 의존) → 로그 필수
    const _leaveToPanel = () => { try { onLeave?.(sub.querySelector('.profile-subsheet-body')); } catch (e) { console.error('[_openSubSheet onLeave]', e); } sub.remove(); };
    sub.querySelector('.profile-subsheet-back').addEventListener('click', _leaveToPanel);
    sub.querySelector('.profile-subsheet-close').addEventListener('click', () => { sub.remove(); panel.remove(); });
    sub.addEventListener('click', e => { if (e.target === sub) _leaveToPanel(); });
    sub.querySelector('.profile-subsheet-header').addEventListener('click', e => { if (!e.target.closest('button')) sub.querySelector('.profile-subsheet-body')?.scrollTo({top:0,behavior:'smooth'}); });
    if (afterRender) afterRender(sub.querySelector('.profile-subsheet-body'));
  }

  // ── _markAllNotifSeen ─────────────────────────────────────────
  // ── _markAllNotifSeen/_markVoucherSeen 공용 헬퍼 (KA5 DRY) ──
  // sel로 대상을 좁힌다 — 카드가 2종(보상·공지)이라 querySelector 단수로는
  // 첫 카드만 잡혀 나머지가 조용히 안 읽힌 채 남는다. '모두 읽기'는 기본값으로 전부.
  function _markRewardCardSeen(container, sel = '.notif-reward-card') {
    container.querySelectorAll(sel).forEach(card => {
      card.classList.remove('is-new');
      card.classList.add('is-seen');
      card.querySelector('.profile-notif-new-badge')?.remove();
      card.querySelector('.profile-voucher-confirm')?.remove();
      card.querySelector('.profile-notice-confirm')?.remove();
      card.querySelector('.notif-reward-btn')?.classList.add('is-seen');
    });
  }
  function _resetNotifBtnAndConfirmAll(container) {
    const _nBtn = body.querySelector('.profile-panel-notif-btn');
    if (_nBtn) { _nBtn.innerHTML = '🔔 알림'; _nBtn.classList.add('is-zero'); }
    container.querySelector('.profile-notif-confirm-all')?.remove();
    _notifInnerHtml = _notifInnerHtml
      .replace(/\bis-new\b/g, '')
      .replace(/<span class="profile-notif-new-badge"[^>]*>NEW<\/span>/g, '')
      .replace(/<button class="notif-read-one-btn"[^>]*>읽음<\/button>/g, '')
      .replace(/<button class="profile-notif-confirm-all"[^>]*>모두 읽기<\/button>/, '')
      .replace(/<button class="profile-voucher-confirm"[^>]*>확인했어요<\/button>/, '')
      .replace(/<button class="profile-notice-confirm"[^>]*>확인했어요<\/button>/, '');
  }

  // 개별 읽음 — 이 카드 하나만. notif_seen_at(지평선)은 건드리지 않고
  // profiles.notif_read_keys에 이 알림의 키만 추가한다.
  async function _markOneNotifSeen(li, container = body) {
    if (!li) return;
    const btn = li.querySelector('.notif-read-one-btn');
    const keys = (btn?.dataset.notifKeys || '').split(',').filter(Boolean);
    li.classList.remove('is-new');
    li.querySelector('.profile-notif-new-badge')?.remove();
    btn?.remove();
    if (keys.length) {
      await window.CottageDB?.addNotifReadKeys?.(String(user.id), keys);
    }
    // 남은 미읽음이 없으면 '모두 읽기'와 패널 버튼 상태도 정리 (더보기 목록 포함해서 셈)
    const remaining = container.querySelectorAll('.profile-notif-list .is-new, .profile-notif-more-list .is-new').length;
    if (remaining === 0) _resetNotifBtnAndConfirmAll(container);
    _updateNotifBadge(); // DB 재조회로 배지 재계산 — 위 write가 끝난 뒤라야 정확
  }

  function _markAllNotifSeen(container = body) {
    if (window._cottageSess) {
      const _s = window._cottageSess.get(String(user.id));
      const _now = new Date().toISOString();
      _s.notifSeenAt = _now;
      _s.newGameSeenAt = _now;
      _s.voucherNoticeSeen = true;
      _s.feeNoticeSeen = true;
      window._cottageSess.set(String(user.id), _s);
      window.CottageDB?.updateNotifSeenAt?.(String(user.id), _now);
    }
    // 9번째부터는 '외 N건 더 보기'의 별도 <ul>(.profile-notif-more-list)에 있어 함께 훑어야 함
    container.querySelectorAll('.profile-notif-list .is-new, .profile-notif-more-list .is-new').forEach(li => {
      li.classList.remove('is-new');
      li.querySelector('.profile-notif-new-badge')?.remove();
    });
    _markRewardCardSeen(container);
    document.getElementById('kakaoLoginBtn')?.querySelector('.notif-badge')?.remove();
    _resetNotifBtnAndConfirmAll(container);
    _updateNotifBadge();
  }

  // ── _markVoucherSeen (컨테이너 파라미터, 기본값 = body) ──────
  function _markVoucherSeen(container = body) {
    _markOneCardSeen(container, 'voucherNoticeSeen', '.notif-reward-card--voucher');
  }

  // ── _markNoticeSeen — 전체 공지 카드의 [확인했어요] ──────────
  function _markNoticeSeen(container = body) {
    _markOneCardSeen(container, 'feeNoticeSeen', '.notif-reward-card--notice');
  }

  // 카드 한 종류만 읽음 처리. 다른 카드가 아직 미확인이면 배지를 지우지 않는다
  // (_updateNotifBadge가 두 키를 모두 보고 다시 계산한다).
  function _markOneCardSeen(container, sessKey, sel) {
    if (window._cottageSess) {
      const _s = window._cottageSess.get(String(user.id));
      _s[sessKey] = true;
      window._cottageSess.set(String(user.id), _s);
    }
    _markRewardCardSeen(container, sel);
    const remaining = container.querySelectorAll('.profile-notif-list .is-new, .profile-notif-more-list .is-new, .notif-reward-card.is-new').length;
    if (remaining === 0) {
      document.getElementById('kakaoLoginBtn')?.querySelector('.notif-badge')?.remove();
      _resetNotifBtnAndConfirmAll(container);
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
        // onLeave 스냅샷: 개별 읽음은 DOM만 바꾸므로, 뒤로가기/백드롭으로 나갔다 다시 들어와도
        // 유지되려면 캐시 문자열을 현재 DOM으로 갱신해야 한다(기록보드와 같은 방식).
        // ✕닫기는 패널째 제거 → 다음 오픈 시 DB에서 새로 읽으므로 스냅샷 불필요.
        _openSubSheet(_notifTitle, _notifInnerHtml, subBody => _bindNotifSubsheet(subBody, { _markAllNotifSeen, _markOneNotifSeen, _markVoucherSeen, _markNoticeSeen, _getGameKeyByName, _getGameKeyById, _notifTitle }), '', bodyEl => { _notifInnerHtml = bodyEl.innerHTML; });

      } else if (type === 'growth') {
        _trackPvOnce('my-board-growth');
        _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, false, false, readOnly));

      } else if (type === 'voucher') {
        _trackPvOnce('my-board-voucher');
        _openSubSheet('음료교환권', _voucherInnerHtml, subBody => _bindVoucherSubsheet(subBody, { _bindVoucher }));

      } else if (type === 'taste') {
        _trackPvOnce('my-board-taste');
        // 진입 시 DB 재조회 → 모임보드에서 뭘 바꿨든 항상 최신(R10b). 스냅샷 임시방편 제거.
        _openSubSheet('취향 보드', _SUBSHEET_LOADING_HTML, async subBody => {
          const d = await _refreshBoardData();
          if (!subBody.isConnected) return; // 재조회를 기다리는 사이 다른 서브시트로 떠남
          _syncTasteCard(); // 다른 기기·탭에서 바뀐 값도 카드에 반영(재조회한 값이 곧 진실)
          subBody.innerHTML = _buildTasteInnerHtml(d);
          _bindTasteSubsheet(subBody, {
            user, readOnly, panel, _emitLikesChanged, allBioSuggestions, _BIO_PREDEFINED, _ruleSet: _makeRuleSet(d),
            onBioSaved: (newBio) => { _boardData.bio = newBio; _syncTasteCard(); },
          });
          // 모임보드 '비선호 유형 수정 →'으로 들어왔으면 해당 섹션으로 스크롤(렌더 후여야 좌표가 나옴)
          if (_pendingTasteScrollTo === 'avoid') {
            const avoidSec = subBody.querySelector('.taste-avoid-section');
            if (avoidSec) subBody.scrollTop = avoidSec.getBoundingClientRect().top - subBody.getBoundingClientRect().top + subBody.scrollTop;
          }
          _pendingTasteScrollTo = null;
        });

      } else if (type === 'records') {
        _trackPvOnce('my-board-records');
        _openSubSheet('기록 보드', _recordInnerHtml, subBody => _bindRecordSubsheet(subBody, { _getGameKeyById, _allPhotoData, _PHOTO_SHOW }), 'profile-subsheet-body--records', bodyEl => { _recordInnerHtml = bodyEl.innerHTML; }); // 뒤로가기 시 현재 상태 스냅샷(재진입 유지)


      } else if (type === 'usage') {
        _trackPvOnce('my-board-usage');
        _openSubSheet('함께한 시간', _usageInnerHtml, _bindUsageSubsheet);

      } else if (type === 'meeting') {
        _trackPvOnce('my-board-meeting');
        // 진입 시 DB 재조회 → 취향보드에서 뭘 바꿨든 항상 최신(R10b).
        // _pendingMeetingScrollTop은 취향보드 편집 후 "‹ 모임 보드" 복귀 시 재렌더를 건너 살아남아야 함
        // (다음 afterRender 호출에서 읽음) → 구조분해 복사 대신 접근자로 전달
        _openSubSheet('모임 보드', _SUBSHEET_LOADING_HTML, async subBody => {
          const d = await _refreshBoardData();
          if (!subBody.isConnected) return; // 재조회를 기다리는 사이 다른 서브시트로 떠남
          _syncTasteCard(); // 모임보드도 같은 소스(_boardData)를 쓴다 → 취향 카드 함께 최신화
          subBody.innerHTML = _buildMeetingInnerHtml(d);
          _bindMeetingSubsheet(subBody, {
            user, readOnly, body, _ro, _emitLikesChanged, _getGameKeyById, _ruleSet: _makeRuleSet(d), _meeting: d, _meetingProfileRowHtml,
            getPendingScroll: () => _pendingMeetingScrollTop, setPendingScroll: v => { _pendingMeetingScrollTop = v; },
            setTasteScrollTo: v => { _pendingTasteScrollTo = v; },
          });
        }); // end meeting afterRender
      }
    });
  });

  // ── 프로필 영역 버튼 바인딩 ─────────────────────────────────
  body.querySelector('.profile-panel-avatar-wrap')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, true, false, readOnly)); });
  body.querySelector('.profile-panel-rep-name')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, true, false, readOnly)); });
  if (!readOnly) body.querySelector('.profile-panel-nick')?.addEventListener('click', () => promptNicknameChange());
  body.querySelector('.profile-panel-title-name')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, false, true, readOnly)); });
  body.querySelector('.profile-growth-link')?.addEventListener('click', () => { _trackPvOnce('my-board-growth'); _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, false, false, readOnly)); });

  // ── 취향 카드 요약 동기화 (좋아요/궁금해요가 어디서 바뀌든 한 곳에서 받는다) ──
  // 게임시트·취향보드·모임보드가 모두 'cottage-likes-changed'를 쏘므로, 발생 지점마다
  // 카드를 고치지 않고 여기서 _boardData를 갱신하고 카드를 다시 그린다.
  // 읽기전용(남의 보드)에서는 내 좋아요 변경이 남의 카드에 반영되면 안 되므로 등록하지 않는다.
  if (!readOnly) {
    if (window.__panelLikesHandler) window.removeEventListener('cottage-likes-changed', window.__panelLikesHandler);
    const _onPanelLikesChanged = (e) => {
      if (!body.isConnected) { window.removeEventListener('cottage-likes-changed', _onPanelLikesChanged); return; }
      const { table, gameId, customName, added } = e.detail || {};
      const list = table === 'game_likes' ? _boardData.likedGames
        : table === 'game_curious' ? _boardData.curiousGames : null;
      if (!list) return;
      const idx = list.findIndex(g => (gameId ? String(g.game_id) === String(gameId) : (!g.game_id && g.custom_name === customName)));
      // 모임보드 박스모달은 자기 배열(=_boardData)을 이미 고친 뒤 쏜다 → 중복 반영되지 않게 멱등으로
      if (added) { if (idx < 0) list.push({ game_id: gameId || null, custom_name: customName || null }); }
      else if (idx >= 0) list.splice(idx, 1);
      _syncTasteCard();
    };
    window.__panelLikesHandler = _onPanelLikesChanged;
    window.addEventListener('cottage-likes-changed', _onPanelLikesChanged);
  }

  if (autoSubsheet) {
    body.querySelector(`[data-subsheet="${autoSubsheet}"]`)?.click();
  }
}

// ── 다른 플레이어 보드(읽기 전용) ─────────────────────────────
// Phase C: openProfilePanel 통합 패널로 위임. 자기 자신이면 편집 가능한 내 보드로.
async function openOtherProfileSheet(userId, opts = {}) {
  if (!userId) return;
  const self = getKakaoUser();
  if (self && String(self.id) === String(userId)) return openProfilePanel('taste', opts);
  return openProfilePanel('taste', { userId: String(userId), readOnly: true, ...opts });
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
  // 동반 인원이 있는 날만 「+N」 — 인원 계산은 공용 헬퍼에 위임(자체 계산 금지)
  const _guestSuffix = v => {
    const n = (window.CottageDB?.getPartySize?.(v) ?? 1) - 1;
    return n > 0 ? ` <span class="mb-week-guest">+${n}</span>` : '';
  };
  const rows = myVotes.map(v => {
    const total = 14; // 9~23시
    const left  = ((v.time_start - 9) / total * 100).toFixed(1);
    const width = ((v.time_end - v.time_start) / total * 100).toFixed(1);
    return `<div class="mb-week-entry">
      <div class="mb-week-row">
        <span class="mb-week-date">${escH(fmtVD(v.vote_date))}</span>
        <div class="mb-mini-bar-wrap"><div class="mb-mini-bar-fill" style="left:${left}%;width:${width}%"></div></div>
        <span class="mb-week-time">${v.time_start}~${v.time_end}시${_guestSuffix(v)}</span>
        <button class="mb-detail-btn" data-uid="${escH(String(userId))}" data-date="${escH(v.vote_date)}" type="button">자세히</button>
      </div>
    </div>`;
  }).join('');
  const bodyHtml = myVotes.length
    ? `<div class="mb-week-list">${rows}</div>`
    : '<p class="taste-game-empty">이번 주 등록된 일정이 없어요.</p>';
  // 편집 진입점은 섹션 타이틀 옆 ✎ 아이콘(openPlannerModal)으로 이동 — 하단 CTA 제거
  return bodyHtml;
}

// ── 다른 유저 모임 보드(읽기 전용) ─────────────────────────────
// Phase C: openProfilePanel 통합 패널의 모임 서브시트로 위임. 자기 자신이면 편집 가능한 내 보드로.
async function openOtherMeetingSheet(userId, opts = {}) {
  if (!userId) return;
  const self = getKakaoUser();
  if (self && String(self.id) === String(userId)) return openProfilePanel('meeting', opts);
  return openProfilePanel('meeting', { userId: String(userId), readOnly: true, ...opts });
}

window.openOtherMeetingSheet = openOtherMeetingSheet;

document.addEventListener('DOMContentLoaded', initKakaoAuth);
