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

// member-analytics.js 동적 로드 (오너 전용 「회원 분석」 섹션 P4용, 모든 페이지 대응).
// 오너가 남의 보드를 열 때만 쓰이므로 비동기 로드로 충분하다(파싱 시점엔 안 쓴다).
// requests-admin.html은 인라인 별칭을 위해 이미 명시 로드하므로 여기선 건너뛴다(중복 방지).
(function () {
  const cs = document.currentScript;
  if (cs && !window.MemberAnalytics && !document.getElementById('__memberAnalyticsJS')) {
    const s = document.createElement('script');
    s.id = '__memberAnalyticsJS';
    s.src = cs.src.replace('kakao-auth.js', 'member-analytics.js');
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
  // 로컬 세션(기기별)만 보면 다른 기기·브라우저에서 재노출된다 — DB ack(notice:*)도 함께 본다.
  const _dbAckKeys = await window.CottageDB?.getNoticeAckKeys?.(String(user.id)) || [];
  const voucherAcked = !!sess.voucherNoticeSeen || _dbAckKeys.includes('notice:voucher');
  const feeAcked = !!sess.feeNoticeSeen || _dbAckKeys.includes('notice:fee');
  if (!voucherAcked || (window._isFeeNoticeLive?.() && !feeAcked)) {
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
      const codexPreviewList = subBody.querySelector('.profile-codex-preview-list');
      const beforeTop = codexToggleBtn.getBoundingClientRect().top;
      const hidden = codexBody.classList.toggle('is-hidden');
      codexPreviewList?.classList.toggle('is-hidden', !hidden);
      codexToggleBtn.textContent = hidden ? '전체 보기 ▾' : '접기 ▴';
      void subBody.offsetHeight;
      const delta = codexToggleBtn.getBoundingClientRect().top - beforeTop;
      if (Math.abs(delta) > 0.5) {
        const previousBehavior = subBody.style.scrollBehavior;
        subBody.style.scrollBehavior = 'auto';
        subBody.scrollTop = Math.max(0, subBody.scrollTop + delta);
        subBody.style.scrollBehavior = previousBehavior;
      }
    });
  }
  subBody.querySelectorAll('.profile-codex-game-item[data-game-id]').forEach(item => {
    item.addEventListener('click', () => {
      const gameKey = window.getGameKeyById?.(item.dataset.gameId);
      if (!gameKey || !window.openGameSheet) return;
      window.ensureGameSheet?.();
      window.openGameSheet(gameKey);
    });
  });
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
  // 🚨 `_growthInnerHtml`은 패널 오픈 시 **1회** 만들어진 문자열이라, 수집 보드에
  //    다시 들어오면 그때의 대표 캐릭터·칭호가 되살아난다(= 방금 바꾼 게 되돌아간 것처럼 보임).
  //    렌더 직후 이번 세션에서 바꾼 값을 다시 입혀 맞춘다. 남의 보드(readOnly)엔 적용 금지.
  if (!readOnly) window.CottageAchievements?.reapplyRepOverrides?.();
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
      ? (h.reason === 'first_play' ? '첫 기록 보상' : h.reason === 'intro_complete' ? '모임원 프로필 작성 보상' : h.reason === 'dev_test' ? '테스트 지급 [DEV]' : '지급')
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
    const saved = await onAdd(gameId, customName);
    if (saved === false) return;
    _setAddedState(gameId, true);
  };

  // "추가됨" 항목 재클릭 = 취소. confirm을 두지 않는 이유: 토글은 되돌리기가 대칭이라
  // (잘못 눌러도 한 번 더 누르면 그대로 재추가) 확인창 없이도 복구가 싸다.
  // 리스트의 ✕에 confirm이 붙은 건 거기선 복구하려면 모달을 다시 열어 검색해야 하기 때문.
  const removeGame = async (gameId, customName) => {
    if (!onRemove || !inList(gameId, customName)) return;
    const saved = await onRemove(gameId, customName);
    if (saved === false) return;
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
function _openBoardFrameModal({ src, title, tab = null, wizardOnly = false }) {
  const existing = document.querySelector('.board-frame-modal');
  existing?._closeBoardFrameModal?.();
  existing?.remove();

  const modal = document.createElement('div');
  modal.className = `record-iframe-modal board-frame-modal${wizardOnly ? ' board-wizard-modal' : ''}`;
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = wizardOnly
    ? `<iframe class="board-wizard-frame" src="${escH(src)}" title="${escH(title)}"></iframe>`
    : `
    <div class="record-iframe-dim"></div>
    <div class="record-iframe-panel" role="dialog" aria-modal="true" aria-label="${escH(title)}">
      <button aria-label="${escH(title)} 닫기" class="record-iframe-close" type="button">✕</button>
      <div class="record-iframe-loader" aria-hidden="true"></div>
      <iframe class="record-iframe-frame" src="${escH(src)}" title="${escH(title)}"></iframe>
    </div>`;
  document.body.appendChild(modal);

  const frame = modal.querySelector('.record-iframe-frame, .board-wizard-frame');
  const loader = modal.querySelector('.record-iframe-loader');
  const previousOverflow = document.body.style.overflow;
  let wizardStartRequested = false;
  const onKeydown = e => { if (e.key === 'Escape') close(); };
  const onMessage = e => {
    if (e.source !== frame.contentWindow) return;
    if (e.data?.type === 'cottage-profile-intro-ready' && wizardOnly && !wizardStartRequested) {
      wizardStartRequested = true;
      frame.contentWindow?.postMessage({ type: 'cottage-open-profile-intro-wizard' }, '*');
    } else if (e.data?.type === 'cottage-close-profile-wizard') {
      close();
    }
  };
  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('message', onMessage);
    if (document.body.style.overflow === 'hidden') document.body.style.overflow = previousOverflow;
    modal.remove();
  };
  modal._closeBoardFrameModal = close;

  modal.querySelector('.record-iframe-dim')?.addEventListener('click', close);
  modal.querySelector('.record-iframe-close')?.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('message', onMessage);
  frame.addEventListener('load', () => {
    frame.classList.add('is-ready');
    loader?.remove();
    if (tab) frame.contentWindow?.postMessage({ type: 'cottage-switch-tab', tab }, '*');
  }, { once: true });

  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
  });
}
// 모임원 프로필 위저드도 같은 검색 UX를 재사용한다. 호출부가 목록 상태와 저장 시점만 정한다.
window.openCottageGameAddSearchModal = _openGameAddSearchModal;

function _bindRecordSubsheet(subBody, ctx) {
  const { _getGameKeyById, _allPhotoData, _PHOTO_SHOW, readOnly } = ctx;
          if (!subBody.querySelector('.profile-record-action-row')) {
            const actionRow = document.createElement('div');
            actionRow.className = 'profile-record-action-row';
            actionRow.innerHTML = `${readOnly ? '' : '<button class="profile-record-link" data-board-frame-src="/pages/game/game-reviews.html?embed=1&tab=input" data-board-frame-title="기록 작성" data-board-frame-tab="input" type="button">기록 작성</button>'}
              <a class="profile-record-link" href="/pages/game/game-reviews.html">플레이 기록 페이지 &gt;</a>`;
            subBody.appendChild(actionRow);
          }
          subBody.querySelectorAll('[data-board-frame-src]').forEach(button => {
            button.addEventListener('click', e => {
              e.preventDefault();
              e.stopPropagation();
              _openBoardFrameModal({
              src: button.dataset.boardFrameSrc,
              title: button.dataset.boardFrameTitle,
              tab: button.dataset.boardFrameTab || null,
              });
            });
          });
          _bindActivityTogglesAndMore(subBody);
          // 게임평 텍스트: 2줄로 자르고 항목별 "더보기"를 붙이던 방식은 2026-07-30 제거 —
          // 대부분 짧은 글인데 거의 매 항목마다 잘려서 "더보기"가 반복되니 오히려 산만하고,
          // 텍스트와 떨어진 줄에 떠서 어느 리뷰 것인지도 헷갈렸다(사용자 지적). 그냥 전문 표시.
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

// ── 프로필 보드 서브시트 afterRender (레거시 내부 이름 taste 유지) ──
function _bindTasteSubsheet(subBody, ctx) {
  const { user, readOnly, _emitLikesChanged, allBioSuggestions, _BIO_PREDEFINED, _ruleSet, onBioSaved, onProfileDataSaved, resolveGameName } = ctx;
          subBody.querySelectorAll('[data-board-frame-src]').forEach(button => {
            button.addEventListener('click', e => {
              e.preventDefault();
              e.stopPropagation();
              _openBoardFrameModal({
              src: button.dataset.boardFrameSrc,
              title: button.dataset.boardFrameTitle,
              wizardOnly: button.dataset.boardFrameWizard === 'true',
              });
            });
          });
          const userId = String(user.id);

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
          getPendingScroll, setPendingScroll, setTasteScrollTo, backTo, focusDate } = ctx;
          const userId = String(user.id);

          _bindActivityTogglesAndMore(subBody); // 최근 모임 참여 "더 보기" (2026-07-30)
          if (!subBody.querySelector('.meeting-board-page-link')) {
            const previewLink = document.createElement('a');
            previewLink.className = 'meeting-board-page-link';
            previewLink.href = '/?focus=meeting';
            previewLink.textContent = '코티지 모임 미리보기 페이지 >';
            subBody.appendChild(previewLink);
          }

          // 평소 성향은 프로필 보드가 SSOT다. 모임 보드에서는 짧게 참조하고 편집은 프로필로 보낸다.
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

          // ── 가까운 미래 하고싶은/배우고싶은 게임 (meeting_vote_games SSOT) ──
          // 일정과 게임을 모두 같은 오늘~+180일 범위로 읽어 일요일→다음 주 일정도 빠지지 않게 한다.
          let _weekData = { myVotes: [], myVoteGames: [], upcomingVotes: [] };
          const _likedSlugSet = new Set((_meeting.likedGames || []).map(g => g.game_id).filter(Boolean).map(String));
          const _curiousSlugSet = new Set((_meeting.curiousGames || []).map(g => g.game_id).filter(Boolean).map(String));
          const _DOWs = '일월화수목금토';
          const _mbSlug = rawId => {
            if (rawId == null) return null;
            const clean = String(rawId).startsWith('#') ? String(rawId).slice(1) : String(rawId);
            return _getGameKeyById(clean) || clean;
          };
          const _mbDay = ds => {
            const d = new Date(`${ds}T00:00:00`);
            return { ds, label: `${d.getMonth()+1}/${d.getDate()}(${_DOWs[d.getDay()]})`, md: `${d.getMonth()+1}/${d.getDate()}` };
          };

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
              const dateList = [...e.dates].sort();
              const days = dateList.map(ds => _mbDay(ds).label).join(' · ');
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
            // 평소 좋아하는/궁금한 게임은 표시 없음. 프로필 목록엔 없지만 가까운 일정에서 고른 게임만 예외 표시.
            const mark = !it.isSource ? `<span class="mb-like-mark mb-like-mark--new" title="평소 목록엔 없지만 가까운 일정에서 하고 싶은 게임">✨</span>` : '';
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
            return `<div class="taste-game-item mb-week-game${clickable}"${gidAttr}${cnAttr}>${thumb}<span class="taste-game-name">${escH(it.name)}</span>${condTag}${mark}${badge}${_ro(`<button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button>`)}${_ro('<button class="mb-kebab-btn" type="button" title="가까운 일정 관리" aria-label="메뉴">⋯</button>')}</div>`;
          };

          let _renderMeetingDates = null;
          const _renderWeekList = () => { _renderMeetingDates?.(); };

          // 요일 선택(참여 등록한 날 내에서, 최소 1개) — 추가/수정 공용
          const _openMbDayPicker = ({ slug, customName, name, listType }, curDates, onDone) => {
            const partDays = [...new Set(_weekData.myVotes.map(v => v.vote_date))].sort().map(_mbDay);
            const overlay = document.createElement('div');
            overlay.className = 'mb-add-overlay';
            const vgId = slug ? (window.gameData?.[slug]?.bgg?.id ?? null) : null;
            const vgCustom = vgId != null ? null : (customName || name);
            const close = () => overlay.remove();
            if (!partDays.length) {
              overlay.innerHTML = `<div class="mb-add-box"><div class="mb-add-head"><span class="mb-add-title">🗓️ 날짜 선택</span><button aria-label="닫기" class="mb-add-close" type="button">✕</button></div><p class="mb-daypick-empty">먼저 가까운 참여 일정을 등록해주세요.<br>플래너에서 날짜를 정하면 그날 하고 싶은 게임을 고를 수 있어요.</p><button class="mb-add-daypick-done" type="button">플래너 열기</button></div>`;
              document.body.appendChild(overlay);
              overlay.querySelector('.mb-add-close').addEventListener('click', close);
              overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
              overlay.querySelector('.mb-add-daypick-done').addEventListener('click', () => { close(); window.openPlannerModal?.({ weekOffset: 0, onDirtyClose: _loadMeetingWeek }); });
              return;
            }
            const selected = new Set(curDates || []);
            overlay.innerHTML = `<div class="mb-add-box">
              <div class="mb-add-head"><span class="mb-add-title">🗓️ '${escH(name)}' 언제 할까요?</span><button aria-label="닫기" class="mb-add-close" type="button">✕</button></div>
              <div class="mb-add-daypick-days">${partDays.map(w => `<button class="mb-day-chip${selected.has(w.ds) ? ' is-selected' : ''}" data-date="${w.ds}" type="button"><span class="mb-day-dow">${w.label}</span></button>`).join('')}</div>
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
            menu.innerHTML = `<button class="mb-kebab-item" data-act="edit" type="button">🗓️ 참여 일정 수정</button><button class="mb-kebab-item mb-kebab-item--danger" data-act="remove" type="button">🗑️ 가까운 일정에서 빼기</button>`;
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
              if (!confirm(`'${ctx.name}'을(를) 가까운 일정에서 뺄까요?`)) return;
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
              <div class="mb-add-head"><span class="mb-add-title">${isWant ? '❤️ 요즘 하고 싶은 게임' : '💡 요즘 배우고 싶은 게임'} 추가</span><button aria-label="닫기" class="mb-add-close" type="button">✕</button></div>
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
                  return `<button class="taste-search-item${added ? ' is-added' : ''}" data-game-id="${escH(id)}" type="button">${nm}${added ? ' <span class="taste-search-added-label">가까운 일정에 등록됨</span>' : ''}</button>`;
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

          // 프로필 원천(game_likes/curious) 박스 — 가까운 일정 목록과 별개인 평소 취향 전체
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
              <p class="mb-taste-box-hint">가까운 일정과 별개로, 평소 ${isWant ? '좋아하는' : '해보고 싶은'} 게임 전체예요</p>
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
            // srcSet.delete를 빼면 가까운 일정 목록의 ❤️/👀 마커가 남는다(_emitLikesChanged는 이 Set을 안 고침).
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
              // (가까운 일정 목록의 썸네일 핸들러가 서브시트 9200에서 쓰는 것과 같은 방식)
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
            const listEl = subBody.querySelector('#mbWeekSection');
            const srcSet = listType === 'want' ? _likedSlugSet : _curiousSlugSet;
            subBody.querySelector('#' + addBtnId)?.addEventListener('click', () => _openMbAddModal(listType));
            subBody.querySelector('#' + boxBtnId)?.addEventListener('click', () => _openTasteBoxModal(listType));
            listEl?.addEventListener('click', async e => {
              const item = e.target.closest('.taste-game-item');
              if (!item || item.dataset.listType !== listType) return;
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
              if (!item || item.dataset.listType !== listType) return;
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

          const _MB_STYLE_LABELS = { party: '파티', strategy: '전략', any: '게임 유형 무관', other: '기타' };
          const _MB_DEPTH_LABELS = { light: '가볍게', medium: '적당히', deep: '깊게' };
          const _MB_TRAIT_LABELS = { beginner_welcome: '초보 환영', new_game_ok: '새 게임 가능', hard_game_learning_ok: '어려운 게임도 배워보고 싶어요' };
          const _formatVoteHour = hour => {
            const whole = Math.floor(Number(hour));
            return Math.round((Number(hour) - whole) * 10) === 5 ? `${whole}시30분` : `${whole}시`;
          };
          const _formatDateLabel = date => {
            const day = _mbDay(date);
            return `${day.label}`;
          };
          const _buildDateGameChipHtml = (game, listType, date) => {
            const slug = game.game_id != null ? _mbSlug(game.game_id) : null;
            const customName = game.custom_name || null;
            const gd = slug ? window.gameData?.[slug] : null;
            const name = gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || slug) : (customName || slug || '');
            const thumb = gd?.images?.thumbnail ? `<img class="taste-game-thumb" src="${escH(gd.images.thumbnail)}" alt="">` : `<span class="taste-game-thumb-empty"></span>`;
            const ruleKey = slug ? `id:${slug}` : `cn:${customName || ''}`;
            const ruleOn = _ruleSet.has(ruleKey) ? ' is-on' : '';
            const condition = game.player_condition || 'any';
            const bggId = gd?.bgg?.id ?? null;
            const condOptions = Object.keys(_MB_COND_LABELS).map(value => ({
              value,
              label: value === 'any' ? _MB_COND_LABELS.any : (window.formatCondLabel?.(value, bggId) || _MB_COND_LABELS[value]),
            }));
            const condLabel = condOptions.find(option => option.value === condition)?.label || condition;
            const selWidth = window._condSelWidth?.(condLabel) || '';
            const cond = readOnly
              ? (condition !== 'any' ? `<span class="mb-week-cond">${escH(condLabel)}</span>` : '')
              : `<select class="mb-cond-select" style="width:${selWidth}" aria-label="인원 조건">${condOptions.map(option => `<option value="${option.value}"${option.value === condition ? ' selected' : ''}>${escH(option.label)}</option>`).join('')}</select>`;
            const action = _ro(`<button class="mb-rule-btn${ruleOn}" type="button" title="룰 설명 가능">📖</button><button class="mb-kebab-btn" type="button" title="가까운 일정 관리" aria-label="메뉴">⋯</button>`);
            return `<div class="taste-game-item mb-week-game${slug ? ' taste-game-item--clickable' : ''}" data-list-type="${listType}" data-date="${escH(date)}"${slug ? ` data-game-id="${escH(slug)}"` : ''}${customName ? ` data-custom-name="${escH(customName)}"` : ''}>${thumb}<span class="taste-game-name">${escH(name)}</span>${cond}${action}</div>`;
          };
          const _buildMeetingDateCardsHtml = (votes, voteGames) => {
            const gamesByDate = new Map();
            (voteGames || []).forEach(game => {
              if (!gamesByDate.has(game.vote_date)) gamesByDate.set(game.vote_date, { want: [], learn: [] });
              const type = game.list_type === 'learn' ? 'learn' : 'want';
              gamesByDate.get(game.vote_date)[type].push(game);
            });
            const cards = [...(votes || [])].sort((a, b) => String(a.vote_date).localeCompare(String(b.vote_date))).map(vote => {
              const games = gamesByDate.get(vote.vote_date) || { want: [], learn: [] };
              const intent = [];
              const style = vote.game_style === 'other' ? vote.game_style_custom : _MB_STYLE_LABELS[vote.game_style];
              if (style) intent.push(style);
              if (_MB_DEPTH_LABELS[vote.game_depth]) intent.push(_MB_DEPTH_LABELS[vote.game_depth]);
              (vote.play_traits || []).forEach(trait => { if (_MB_TRAIT_LABELS[trait]) intent.push(_MB_TRAIT_LABELS[trait]); });
              const renderGames = (type, label) => games[type].length
                ? `<div class="mb-date-games"><div class="mb-date-games-label">${label}</div>${games[type].map(game => _buildDateGameChipHtml(game, type, vote.vote_date)).join('')}</div>`
                : '';
              return `<article class="mb-date-card${focusDate === vote.vote_date ? ' is-focused' : ''}" data-date="${escH(vote.vote_date)}" data-uid="${escH(userId)}">
                <div class="mb-date-card-head"><span class="mb-date-card-main"><strong>${escH(_formatDateLabel(vote.vote_date))}</strong>${_ro(`<span class="mb-date-card-actions"><button class="mb-date-edit" type="button" data-date="${escH(vote.vote_date)}" aria-label="${escH(_formatDateLabel(vote.vote_date))} 참여 수정" title="참여 수정">✎</button><button class="mb-date-delete" type="button" data-date="${escH(vote.vote_date)}" aria-label="${escH(_formatDateLabel(vote.vote_date))} 참여 삭제" title="참여 삭제">✕</button></span>`)}</span><span class="mb-date-card-time">${_formatVoteHour(vote.time_start)}~${_formatVoteHour(vote.time_end)}</span></div>
                ${intent.length ? `<div class="mb-date-intent">${intent.map(item => `<span>${escH(item)}</span>`).join('')}</div>` : ''}
                ${renderGames('want', '하고 싶은 게임')}${renderGames('learn', '배우고 싶은 게임')}
                ${vote.recruitment_message ? `<p class="mb-date-message"><span>한마디</span>${escH(vote.recruitment_message)}</p>` : ''}
              </article>`;
            }).join('');
            return cards || '<p class="taste-game-empty">다가오는 모임이 없어요.</p>';
          };

          // 다가오는 모임 — 날짜별 참여카드 중심(플래너의 가까운 미래 SSOT 재사용)
          const _loadMeetingWeek = async () => {
            const weekEl = subBody.querySelector('#mbWeekSection');
            const [uStart, uEnd] = _upcomingRange();
            // 일정과 날짜별 게임을 같은 가까운 미래 범위로 읽는다. 월~일 경계로 잘라
            // 다음 주 일정/게임만 있는 사용자를 빈 상태로 보이게 하지 않는다.
            const [upcomingAllV, upcomingAllVG] = await Promise.all([
              window.CottageDB?.getMeetingVotes?.(uStart, uEnd).then(r => r || []).catch(() => []) || Promise.resolve([]),
              window.CottageDB?.getMeetingVoteGames?.(uStart, uEnd).then(r => r || []).catch(() => []) || Promise.resolve([]),
            ]);
            _weekData.upcomingVotes = upcomingAllV.filter(v => String(v.user_id) === userId);
            _weekData.myVotes = _weekData.upcomingVotes;
            _weekData.myVoteGames = upcomingAllVG.filter(g => String(g.user_id) === userId);
            if (weekEl) {
              const bindMeetingDateInteractions = () => {
                weekEl.querySelector('.mb-planner-edit')?.addEventListener('click', () =>
                  window.openPlannerModal?.({ weekOffset: 0, register: true, onDirtyClose: _loadMeetingWeek }));
                weekEl.querySelectorAll('.mb-date-edit').forEach(btn => btn.addEventListener('click', e => {
                  e.stopPropagation();
                  window.openPlannerModal?.({ weekOffset: 0, edit: btn.dataset.date, onDirtyClose: _loadMeetingWeek });
                }));
                weekEl.querySelectorAll('.mb-date-delete').forEach(btn => btn.addEventListener('click', async e => {
                  e.stopPropagation();
                  const date = btn.dataset.date;
                  if (!confirm(`${date} 모임 참여를 삭제할까요?`)) return;
                  const result = await window.CottageDB?.deleteMeetingVote?.(String(userId), date);
                  if (!result?.success) {
                    window.showToast?.('삭제하지 못했어요. 다시 시도해 주세요.');
                    return;
                  }
                  await _loadMeetingWeek();
                  window.showToast?.('참여 등록을 삭제했어요.');
                }));
              };
              _renderMeetingDates = () => {
                const cards = _buildMeetingDateCardsHtml(_weekData.upcomingVotes, _weekData.myVoteGames);
                weekEl.innerHTML = `<div class="taste-section-label">다가오는 모임 ${_ro('<button class="mb-planner-edit" type="button" title="참여 등록">＋ 참여 등록</button>')}</div>${cards}`;
                bindMeetingDateInteractions();
              };
              _renderMeetingDates();
              // 상세팝업에서 참여자 이름을 눌러 다른 보드로 넘어간 뒤, "‹ 뒤로"로 지금 이 보드
              // (모임보드 서브시트, 진입점)로 되돌아올 수 있게 — openProfilePanel의 panel-level
              // backTo(패널 헤더 back 버튼)를 그대로 재사용한다(2026-08-09, 넘어간 뒤 끊기던 것).
              // ⚠️ opts에 **이 보드 자신이 들어온 backTo**(위 openProfilePanel destructure의 `backTo`,
              // 이 보드로 넘어오기 전 화면)도 같이 심어야 체인이 이어진다 — 안 심으면 덕지→호핀→춘팝처럼
              // 계속 넘어가도 "뒤로"가 한 칸만 기억해 중간(춘팝→호핀)에서 끊긴다(2026-08-09 실사용 지적:
              // "몇 번이고 뒤로가기가 누적돼야" 하는데 2~3번까지만 되던 것). 각 패널이 자기 backTo를
              // 그대로 물려주는 재귀 링크드리스트라 별도 스택 자료구조는 필요 없다(설계 원문 그대로).
              const _mbBackTo = { type: 'panel', autoSubsheet: 'meeting', label: `${user.nickname || '이전'}의 모임보드`, opts: { userId: String(userId), readOnly, nickname: user.nickname || '', backTo } };
              const focused = focusDate ? weekEl.querySelector(`.mb-date-card[data-date="${CSS.escape(String(focusDate))}"]`) : null;
              focused?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              focused?.classList.add('is-focused');
              weekEl.querySelectorAll('.mb-detail-btn').forEach(btn => btn.addEventListener('click', e => {
                e.stopPropagation();
                const _d = btn.dataset.date;
                // 읽기전용: 남의 보드 상세는 편집 불가 스케줄 뷰로. 자기 보드는 편집 가능한 프리뷰 모달.
                // 읽기전용: 남의 보드도 그날 전원 막대 차트로. 편집은 막기 위해 myVote=null(내 막대 하이라이트·✎✕ 없음).
                // 상세도 같은 upcomingAllV/upcomingAllVG를 써야 범위가 어긋나지 않는다.
                window.openDateScheduleModal?.(userId, _d);
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
            const anchorList = subBody.querySelector('#mbWeekSection');
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
  const { _markAllNotifSeen, _markOneNotifSeen, _markVoucherSeen, _markNoticeSeen, _getGameKeyByName, _getGameKeyById, _notifTitle,
    _openSubSheet, _growthInnerHtml, _afterGrowthRender, readOnly, _openNotifSubsheet } = ctx;
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
          // "신규 회원" 묶음 알림의 "외 N명"이 누군지 안 보이던 문제(2026-08-19 사용자 지적) —
          // 클릭하면 숨겨둔 나머지 이름(각각 클릭 시 그 사람 보드로 이동)을 펼친다.
          // e.target.closest('button, a')에서 li 클릭 위임이 이미 막히므로 stopPropagation은 방어용.
          subBody.querySelectorAll('.notif-member-toggle').forEach(btn => {
            btn.addEventListener('click', e => {
              e.stopPropagation();
              const rest = btn.nextElementSibling;
              if (!rest || !rest.classList.contains('notif-member-rest')) return;
              const isHidden = rest.classList.toggle('is-hidden');
              btn.textContent = isHidden ? `외 ${btn.dataset.more}명` : '접기';
            });
          });
          // ⚠️ 「외 N건 더 보기」로 접힌 9번째부터는 형제 <ul>(.profile-notif-more-list)에 있다 —
          //    .profile-notif-list만 훑으면 그 항목들은 클릭이 조용히 안 먹는다(2026-07-21 발견).
          subBody.querySelectorAll('.profile-notif-list li.is-clickable, .profile-notif-more-list li.is-clickable').forEach(li => {
            li.addEventListener('click', e => {
              if (e.target.closest('button, a')) return;
              if (li.dataset.introUid) {
                // 남의 보드로 교체되므로 알림으로 돌아올 경로를 함께 넘긴다(R10c).
                // backTo.opts는 비워 둘 것 — readOnly를 실으면 알림 버튼이 _ro()로 사라져 조용히 무시된다.
                openOtherMeetingSheet(li.dataset.introUid, { backTo: { type: 'panel', autoSubsheet: 'notif', label: _notifTitle } });
                return;
              }
              const memberLink = e.target.closest('[data-member-uid]');
              if (memberLink) {
                // 신규 회원은 "모임 보드"도 "취향 보드"도 아니라 보드 홈(패널 메인, 서브시트
                // 자동 오픈 없음)으로 들어간다(2026-08-02 사용자 요청 — openOtherProfileSheet를
                // 써봤더니 'taste'를 하드코딩해서 취향 보드로 바로 들어가버렸다). 알림이 새
                // 회원 본인 것일 수 없어(쿼리 자체가 neq user_id) self-체크는 불필요.
                // 이름이 여러 개 묶일 수 있어 li 전체가 아니라 이름 각각에 uid를 실었다.
                openProfilePanel(null, { userId: String(memberLink.dataset.memberUid), readOnly: true, backTo: { type: 'panel', autoSubsheet: 'notif', label: _notifTitle } });
                return;
              }
              if (li.dataset.notifAchIds && _openSubSheet && _growthInnerHtml) {
                // 업적 알림 클릭 → 내 수집 보드로 이동, 업적 목록을 펼치고 해당 항목으로
                // 스크롤+강조(2026-08-02, 사용자 요청). 업적은 항상 "내" 것이라 readOnly만
                // 그대로 물려주면 되고(남의 알림을 보는 경로 자체가 없음), 캐릭터/칭호
                // 펼침(expandChar/expandTitle)은 이 진입과 무관해 둘 다 false로 둔다.
                const achIds = li.dataset.notifAchIds.split(',').filter(Boolean);
                _openSubSheet('수집 보드', _growthInnerHtml, gsubBody => {
                  _afterGrowthRender(gsubBody, false, false, readOnly);
                  const achToggleBtn = gsubBody.querySelector('.profile-ach-toggle-btn');
                  const achList = gsubBody.querySelector('.profile-ach-list');
                  if (achToggleBtn && achList?.classList.contains('is-hidden')) achToggleBtn.click();
                  const target = achIds.map(id => gsubBody.querySelector(`.profile-ach-item[data-ach-id="${id}"]`)).find(Boolean);
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('is-notif-highlight');
                    setTimeout(() => target.classList.remove('is-notif-highlight'), 2200);
                  }
                }, '', null, _openNotifSubsheet ? { label: _notifTitle, onClick: _openNotifSubsheet } : null);
                return;
              }
              let key = null;
              const idChip = e.target.closest('[data-notif-game-id]');
              const gameLink = e.target.closest('[data-game-name]');
              if (idChip) key = _getGameKeyById(idChip.dataset.notifGameId);
              else if (gameLink) key = _getGameKeyByName(gameLink.dataset.gameName);
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

// ── P4: 오너 전용 「회원 분석」 서브시트 렌더 ────────────────────────────
// 오너가 남의 보드를 열었을 때만 붙는 섹션. 관리자 분석 페이지의 「회원 카드 펼침」과 같은
// 집계를 그 사람 보드로 가져온다 — 계산은 전부 member-analytics.js(단일 소스, #15 방지).
// 🚨 이건 표시 게이팅이지 접근 제어가 아니다 — RLS off라 anon 키로 이미 읽히는 데이터다.
function _ambDur(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return sec + '초';
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h > 0 ? `${h}시간 ${m % 60}분` : `${m}분`;
}
function _ambInjectStyle() {
  if (document.getElementById('__ambStyle')) return;
  const s = document.createElement('style');
  s.id = '__ambStyle';
  s.textContent = `
    .amb { display:flex; flex-direction:column; gap:6px; }
    .amb-sec-label { font-weight:700; color:var(--brown-700,#6b4f3a); margin:14px 2px 4px; font-size:14px; }
    .amb-sec-label:first-child { margin-top:2px; }
    .amb-sec-sub { font-weight:500; color:var(--text-info,#8a7a6a); font-size:12px; }
    .amb-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
    .amb-stat { background:var(--card-bg,#faf6f0); border-radius:10px; padding:8px 4px; text-align:center; }
    .amb-stat-v { display:block; font-weight:700; font-size:14px; color:var(--brown-700,#6b4f3a); }
    .amb-stat-l { display:block; font-size:11px; color:var(--text-info,#8a7a6a); margin-top:2px; }
    .amb-note { font-size:11px; color:var(--text-info,#8a7a6a); line-height:1.5; margin:2px; }
    .amb-periods { display:flex; gap:6px; flex-wrap:wrap; }
    .amb-period-btn { border:1px solid var(--border,#e5d9c9); background:#fff; color:var(--text-info,#8a7a6a);
      border-radius:999px; padding:4px 12px; font-size:12px; cursor:pointer; }
    .amb-period-btn.is-active { background:var(--brown-700,#6b4f3a); color:#fff; border-color:var(--brown-700,#6b4f3a); }
    .amb-datenav { display:flex; align-items:center; gap:5px; margin-top:6px; position:relative; }
    .amb-date-arrow { font-size:12px; padding:3px 10px; border-radius:7px; border:1px solid var(--border,#e5d9c9);
      background:#fff; color:var(--text-info,#8a7a6a); cursor:pointer; }
    .amb-date-arrow:disabled { opacity:.35; cursor:default; }
    .amb-date-label { font-size:12px; font-weight:600; padding:3px 11px; border-radius:7px;
      border:1px dashed var(--border,#e5d9c9); background:#fff; color:var(--text-info,#8a7a6a); cursor:pointer; }
    .amb-date-label.is-active { border-style:solid; background:var(--brown-700,#6b4f3a); color:#fff; border-color:var(--brown-700,#6b4f3a); }
    .amb-date-input { position:absolute; opacity:0; pointer-events:none; width:0; height:0; }
    .amb-page-table { display:flex; flex-direction:column; }
    .amb-row { display:grid; grid-template-columns:1fr auto auto; gap:10px; align-items:center;
      padding:7px 4px; border-bottom:1px solid var(--border,#efe6d8); font-size:13px; }
    .amb-row--rest .amb-page { color:var(--text-info,#8a7a6a); }
    .amb-page { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .amb-visits { color:var(--text-info,#8a7a6a); font-size:12px; }
    .amb-dur { font-weight:600; color:var(--brown-700,#6b4f3a); min-width:56px; text-align:right; }
    .amb-ev-fam { background:var(--card-bg,#faf6f0); border-radius:10px; padding:8px 10px; margin-bottom:6px; }
    .amb-ev-fam-head { display:flex; justify-content:space-between; font-weight:600; font-size:13px; }
    .amb-ev-total { color:var(--brown-700,#6b4f3a); }
    .amb-ev-types { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
    .amb-ev-type { font-size:11px; color:var(--text-info,#8a7a6a); background:#fff; border-radius:6px; padding:2px 6px; }
    .amb-empty { color:var(--text-info,#8a7a6a); font-size:13px; padding:10px 4px; }
    .profile-card--admin { border:1px dashed var(--brown-700,#6b4f3a); background:var(--card-bg,#faf6f0); }
    .profile-card-admin-tag { font-size:10px; font-weight:700; color:#fff; background:var(--brown-700,#6b4f3a);
      border-radius:6px; padding:1px 5px; margin-left:4px; vertical-align:middle; }`;
  document.head.appendChild(s);
}
// 기간에 반응하는 한 통 — 기간 컨트롤(프리셋 + 날짜 네비) + 📄 페이지 분포 + 🎯 활동.
// 🚨 기간이 페이지 분포와 활동을 **함께** 지배한다 — 「이 회원이 (그 기간에) 뭘 봤고 뭘 했나」가
//    한 질문이라, 반쪽만 반응하면 혼란스럽다(사용자 지적, 2026-07-22). 페이지=page_sessions,
//    활동=page_events가 같은 기간 규칙(inPeriodByKst)을 쓴다. 기간이 바뀌면 이 통을 통째로 다시
//    그린다(프리셋 활성·화살표 disabled·페이지 표·활동이 한 계산에서, #15 방지). 이용 요약
//    (profiles 누적)만 기간 무관이라 이 통 밖에 둔다.
function _ambPeriodInner(rows, events, userId, period, MA) {
  const esc = window.escH, labels = window.COTTAGE_PAGE_LABELS || {};
  const todayKst = MA.kstToday();
  const isDateMode = MA.VP_DATE_RE.test(period);
  const pLabel = MA.vpLabel(period);
  const presetBar = `<div class="amb-periods">${MA.VP_PERIODS.map(p =>
    `<button class="amb-period-btn${p.key === period ? ' is-active' : ''}" data-period="${p.key}" type="button">${esc(p.label)}</button>`).join('')}</div>`;
  // 특정 날짜 — 주력은 달력 점프(오래 머문 날로 바로 간다), 화살표는 보조. ▶는 미래로 못 간다
  // (input의 max도 오늘이라 달력에서도 미래가 안 골라진다 — 이중 가드).
  const dateNav = `<div class="amb-datenav">
    <button class="amb-date-arrow" type="button" data-amb-arrow="-1" aria-label="하루 전">◀</button>
    <button class="amb-date-label${isDateMode ? ' is-active' : ''}" type="button" data-amb-datelabel>${isDateMode ? esc(pLabel) : '특정 날 📅'}</button>
    <input class="amb-date-input" type="date" data-amb-dateinput max="${todayKst}" value="${isDateMode ? period : ''}" aria-label="날짜 고르기">
    <button class="amb-date-arrow" type="button" data-amb-arrow="1" aria-label="하루 후"${isDateMode && period >= todayKst ? ' disabled' : ''}>▶</button>
  </div>`;

  // 📄 페이지 분포 (그 기간)
  const pm = MA.buildPageMap(rows, 'member', userId, period, todayKst);
  const sorted = [...pm.entries()].sort((a, b) => b[1].totalSec - a[1].totalSec);
  let table;
  if (!sorted.length) {
    table = `<div class="amb-empty">${esc(pLabel)} 페이지 기록이 없어요.</div>`;
  } else {
    const MAX = 10, head = sorted.slice(0, MAX), rest = sorted.slice(MAX);
    table = head.map(([page, d]) => `<div class="amb-row">
      <span class="amb-page">${esc(labels[page] || page)}</span>
      <span class="amb-visits">${d.visits}회</span>
      <span class="amb-dur">${_ambDur(d.totalSec)}</span>
    </div>`).join('');
    if (rest.length) {
      const rv = rest.reduce((s, [, d]) => s + d.visits, 0), rs = rest.reduce((s, [, d]) => s + d.totalSec, 0);
      table += `<div class="amb-row amb-row--rest"><span class="amb-page">외 ${rest.length}개</span><span class="amb-visits">${rv}회</span><span class="amb-dur">${_ambDur(rs)}</span></div>`;
    }
  }

  // 🎯 활동 (같은 기간)
  const fams = MA.countMemberEvents(events, userId, period, todayKst);
  const evHtml = fams.length
    ? fams.map(f => `<div class="amb-ev-fam">
        <div class="amb-ev-fam-head"><span>${f.emoji} ${esc(f.label)}</span><span class="amb-ev-total">${f.total}회</span></div>
        <div class="amb-ev-types">${f.types.map(t => `<span class="amb-ev-type">${esc(t.label)} ${t.n}</span>`).join('')}</div>
      </div>`).join('')
    : `<div class="amb-empty">${esc(pLabel)} 활동이 없어요.</div>`;

  return presetBar + dateNav
    + `<div class="amb-sec-label">📄 페이지 분포 <span class="amb-sec-sub">${esc(pLabel)}</span></div>`
    + `<div class="amb-page-table">${table}</div>`
    + `<div class="amb-sec-label">🎯 활동 <span class="amb-sec-sub">${esc(pLabel)} · 무엇을 했나</span></div>`
    + evHtml;
}
async function _renderAdminMemberBoard(subBody, userId) {
  const esc = window.escH, MA = window.MemberAnalytics;
  if (!MA) { subBody.innerHTML = '<div class="amb-empty">분석 모듈을 불러오지 못했어요. 새로고침 후 다시 시도하세요.</div>'; return; }
  _ambInjectStyle();
  const [rawSessions, events, usage] = await Promise.all([
    window.CottageDB?.getUserPageSessions?.(userId) || [],
    window.CottageDB?.getUserEvents?.(userId) || [],
    window.CottageDB?.getProfileUsage?.(userId) || null,
  ]);
  if (!subBody.isConnected) return; // 조회 대기 중 다른 서브시트로 이탈
  // page는 정규화 전 원문이라 관리자 페이지와 같은 버킷이 되도록 접는다(#14).
  const rows = (rawSessions || []).map(r => ({ ...r, page: MA.normalizePageKey(r.page) }));
  const evs = events || [];
  const todayKst = MA.kstToday();
  const visitCount = usage?.visit_count ?? 0;
  const totalMin = usage?.total_minutes ?? 0;
  const todaySec = (usage?.today_date === todayKst) ? (usage?.today_seconds ?? 0) : 0;
  const activeDays = new Set(rows.filter(r => r.entered_at).map(r => MA.toKstDate(r.entered_at))).size;

  subBody.innerHTML = `<div class="amb">
    <div class="amb-sec-label">📊 이용 요약 <span class="amb-sec-sub">전 기간 누적</span></div>
    <div class="amb-summary">
      <div class="amb-stat"><span class="amb-stat-v">${visitCount}</span><span class="amb-stat-l">방문</span></div>
      <div class="amb-stat"><span class="amb-stat-v">${_ambDur(totalMin * 60)}</span><span class="amb-stat-l">누적 체류</span></div>
      <div class="amb-stat"><span class="amb-stat-v">${_ambDur(todaySec)}</span><span class="amb-stat-l">오늘</span></div>
      <div class="amb-stat"><span class="amb-stat-v">${activeDays}일</span><span class="amb-stat-l">방문일수*</span></div>
    </div>
    <div class="amb-note">방문·누적은 profiles 기준(heartbeat 포함, 전 기간 고정) · 방문일수*와 아래 표는 page_sessions 기준(체류 하한). 아래 기간 선택은 페이지 분포·활동에 함께 적용됩니다.</div>
    <div class="amb-vp" data-vp-period="all">${_ambPeriodInner(rows, evs, userId, 'all', MA)}</div>
  </div>`;

  // 프리셋·화살표·달력을 **한 자리에서** 재계산·재렌더한다(관리자 페이지 applyVpPeriod와 같은
  // 방식). 갈래별로 복사하면 조용히 갈린다(#15). data-vp-period가 화살표 ±1의 기준점이다.
  // 페이지 분포와 활동이 이 통 안에 함께 있어 기간 하나로 둘 다 바뀐다.
  const applyVp = (period) => {
    const vp = subBody.querySelector('.amb-vp'); if (!vp) return;
    vp.dataset.vpPeriod = period;
    vp.innerHTML = _ambPeriodInner(rows, evs, userId, period, MA);
  };
  subBody.addEventListener('click', e => {
    const vp = subBody.querySelector('.amb-vp'); if (!vp) return;
    const cur = vp.dataset.vpPeriod || 'all';
    const pb = e.target.closest('.amb-period-btn');
    const dlabel = e.target.closest('.amb-date-label');
    const arrow = e.target.closest('.amb-date-arrow');
    if (pb) { applyVp(pb.dataset.period || 'all'); return; }
    if (dlabel) { vp.querySelector('.amb-date-input')?.showPicker?.(); return; }
    if (arrow) {
      // 프리셋 상태에서 화살표를 누르면 오늘을 기준으로 날짜 모드에 진입한다.
      const todayKst = MA.kstToday();
      const base = MA.VP_DATE_RE.test(cur) ? cur : todayKst;
      const d = new Date(base + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + Number(arrow.dataset.ambArrow));
      const nd = d.toISOString().slice(0, 10);
      if (nd > todayKst) return;   // 미래로는 못 간다(버튼 disabled + 이 컷의 이중 가드)
      applyVp(nd);
    }
  });
  // 달력에서 고르면 change로 온다(click 위임으론 안 잡힌다).
  subBody.addEventListener('change', e => {
    const input = e.target.closest('.amb-date-input');
    if (input && input.value) applyVp(input.value);
  });
}

async function openProfilePanel(autoSubsheet = null, opts = {}) {
  // Phase C: userId 파라미터화 + 읽기전용 모드. readOnly면 대상 유저(userId)의 공개 보드를
  // 편집 컨트롤 없이 표시(비공개 섹션=알림·교환권·함께한 시간 제외). 편집 컨트롤 HTML은 _ro()로 생략.
  // backTo: 진입 직전 화면으로 돌아갈 경로. 있으면 패널 헤더에 뒤로가기가 생긴다.
  //   { type:'gameSheet', gameKey, label } — 좋아요 토스트로 들어온 경우 원래 게임시트로
  //   { type:'panel', autoSubsheet, label, opts? } — 알림에서 남의 보드로 들어온 경우 내 보드로
  // 서브시트→패널 뒤로가기는 _openSubSheet가 이미 하므로, 여기는 패널 한 칸만 담당(깊이 1).
  // 체인이 생겨도 각 패널의 클로저가 자기 backTo를 들고 있어 스택 자료구조가 필요 없다.
  const { userId: _targetUserId = null, readOnly = false, backTo = null, focusDate = null } = opts;
  const _selfUser = getKakaoUser();
  const user = readOnly
    ? { id: String(_targetUserId), nickname: opts.nickname || '' }
    : _selfUser;
  if (!user || !user.id) return;
  // 🚨 타인 보드 진입부(openOtherProfileSheet 등)가 nickname을 안 넘겨 늘 ''였다 —
  // 패널 제목이 "회원"으로 뜨고, getUserPlayedGames/getUserParticipationCount 등
  // nickname 기반 집계(게임도감·참여횟수)가 본인이 작성 안 한 태그 참여 기록을 못 잡아
  // 0으로 보이는 원인이었다(2026-07-28 실사용 중 발견). DB에서 채워 넣는다.
  if (readOnly && !user.nickname) {
    const snap = await window.CottageDB?.getProfileSnapshot?.(user.id);
    if (snap?.nickname) user.nickname = snap.nickname;
  }
  // 편집 컨트롤 HTML 생략 헬퍼 (읽기전용이면 '' 반환)
  const _ro = html => (readOnly ? '' : html);
  // P4 오너 게이트: **보는 사람(self)이 오너 + 남의 보드(readOnly) + 대상이 오너가 아닐 때만**.
  //   isOwnerUser(1703)는 *대상* 기준이라 못 쓴다 — 여기 필요한 건 *뷰어* 기준이다.
  //   🚨 표시 게이팅이지 접근 제어가 아니다(RLS off). _ro의 반대 방향이라 별도 헬퍼로 둔다.
  const _adminView = readOnly && !!_selfUser && String(_selfUser.id) === String(OWNER_KAKAO_ID)
    && String(_targetUserId) !== String(OWNER_KAKAO_ID);
  const _adminOnly = html => (_adminView ? html : '');
  const _boardLabel = '내 보드';

  // 취향보드에서 수정 후 "‹ 모임 보드"로 복귀 시 복원할 스크롤 위치(패널 유지되는 동안 서브시트 스왑 간 보존)
  let _pendingMeetingScrollTop = null;

  // 좋아요/궁금해요 변경 전역 통보 (취향보드·모임보드·게임시트 간 즉시 동기화)
  // customName은 직접입력 게임(game_id 없음)용 — 개수 집계는 이것도 세야 맞다.
  // 목록 DOM을 고치는 기존 수신부들은 gameId가 없으면 그냥 무시한다.
  const _emitLikesChanged = (table, gameId, customName, added) => {
    if (!gameId && !customName) return;
    // CustomEvent 생성·dispatch는 정상 브라우저 환경에서 실패하지 않는다 — 방어적 삼킴, 로그 불필요
    try { window.dispatchEvent(new CustomEvent('cottage-likes-changed', { detail: { table, gameId: gameId ? String(gameId) : null, customName: customName || null, added: !!added } })); } catch (_) {}
  };

  const existing = document.getElementById('profilePanel');
  // 자기 보드는 버튼 재클릭 시 토글로 닫힘. 읽기전용은 항상 새로 열기(닉네임 클릭 등 진입).
  // ⚠️ 토글은 "지금 열려 있는 게 이미 내 보드일 때"만이다 — 남의 보드(readOnly)가 열린
  // 상태에서 그 안의 참여자 목록에 내 이름이 있어 클릭한 경우(openOtherMeetingSheet의
  // self.id===userId 분기, opts에 readOnly가 없어 여기선 false로 들어온다)까지 "이미 열려
  // 있으니 닫기"로 처리하면, 남의 보드만 닫히고 내 보드는 안 열린 채 끝난다(2026-08-09
  // 실사용 발견 — 남의 보드 참여자 목록에서 자기 자신 클릭 시 "그냥 꺼져버림").
  const _existingWasReadOnly = existing?.classList.contains('profile-panel--readonly');
  // 기존 패널을 자기 close 핸들러를 안 거치고 강제로 치우는 경로 — 그 패널이 push해둔
  // activeView도 여기서 같이 pop해야 한다(토큰은 DOM 노드에 저장돼 있어 이 클로저 밖에서도 접근 가능).
  if (existing) { window.removeEventListener('cottage-meeting-changed', existing._meetingPreviewRefresh); window.popActiveView?.(existing._viewToken); existing.remove(); document.getElementById('profileSubSheet')?.remove(); if (!readOnly && !_existingWasReadOnly) return; }

  const panel = document.createElement('div');
  panel.id = 'profilePanel';
  panel.className = 'profile-panel' + (readOnly ? ' profile-panel--readonly' : '') + (!backTo ? ' profile-panel--main' : '');
  const isOwnerUser = String(user.id) === String(OWNER_KAKAO_ID);
  const isDevMode = location.hostname === 'localhost' || isOwnerUser;
  const _panelHeaderHtml = backTo ? `
    <div class="profile-panel-header profile-panel-header--with-back">
      <button class="profile-panel-back" type="button">‹ ${escH(backTo.label || '뒤로')}</button>
      <span class="profile-panel-title">${escH(user.nickname || (readOnly ? '회원' : '손님'))}의 ${_boardLabel}</span>
      <button aria-label="내 보드 닫기" class="profile-panel-close" type="button">✕</button>
    </div>` : '';
  panel.innerHTML = `<div class="profile-panel-box">
    ${!backTo ? `<button aria-label="내 보드 닫기" class="profile-panel-close profile-panel-main-close" type="button">✕</button>` : ''}
    ${_panelHeaderHtml}
    <div class="profile-panel-body">
      <p class="profile-panel-loading">불러오는 중...</p>
    </div>
  </div>`;
  document.body.appendChild(panel);
  _trackPvOnce(readOnly ? 'other-board' : 'my-board');
  // 활성 뷰 체류시간 추적(2026-08-18, PLAN_active_view_tracking.md 1차) — 토큰을 패널
  // DOM 노드에 저장한다(클로저 변수가 아님). 위 "기존 패널 강제 치우기" 경로처럼 **다른**
  // openProfilePanel 호출이 이 패널을 닫는 경우에도 토큰을 꺼내 pop할 수 있어야 하기 때문.
  panel._viewToken = window.pushActiveView?.(readOnly ? 'other-board' : 'my-board') ?? null;
  const _popView = () => window.popActiveView?.(panel._viewToken);
  const _closePanel = () => {
    panel._identityObserver?.disconnect();
    window.removeEventListener('cottage-meeting-changed', panel._meetingPreviewRefresh);
    document.getElementById('profileSubSheet')?.remove();
    _popView();
    panel.remove();
  };
  panel.querySelectorAll('.profile-panel-close').forEach(button => button.addEventListener('click', _closePanel));
  panel.addEventListener('click', e => { if (e.target === panel) _closePanel(); });
  panel.querySelector('.profile-panel-header')?.addEventListener('click', e => { if (!e.target.closest('button')) panel.querySelector('.profile-panel-body')?.scrollTo({top:0,behavior:'smooth'}); });
  // ⚠️ 자기 패널을 먼저 지운 뒤 복귀시킨다. 순서가 바뀌면 위 토글 가드(`if (existing) … if (!readOnly) return`)에
  // 걸려 내 보드가 안 열리고 화면이 텅 빈다.
  panel.querySelector('.profile-panel-back')?.addEventListener('click', () => {
    document.getElementById('profileSubSheet')?.remove();
    _popView();
    panel.remove();
    // restoreScroll=true(보던 지점으로) + noAnim=true(올라오는 연출 없이) — 원래 있던 시트로 돌아가는 것이므로
    if (backTo.type === 'gameSheet') { window.ensureGameSheet?.(); window.openGameSheet?.(backTo.gameKey, true, null, true); }
    else if (backTo.type === 'panel') openProfilePanel(backTo.autoSubsheet || null, backTo.opts || {});
  });

  if (!window.CottageDB?.getMyStats) return;
  const _sessForNotif = window._cottageSess?.get(String(user.id)) || {};
  const [_upcomingStart, _upcomingEnd] = _upcomingRange();
  const _emptyCodex = { html: '', playedCount: 0, totalGames: 0 };
  // likedGames/curiousGames를 따로 조회하지 않는다 — getMeetingProfile이 내부에서 같은
  // getUserLikedGamesAll/getUserCuriousGamesAll를 부르므로 예전엔 같은 쿼리를 한 Promise.all에서
  // 두 번 쏘고 결과를 별도 배열로 들고 있었다. 그 중복이 크로스보드 stale의 실체였다(R10b).
  const [stats, notifs, _codexResult, userStats, voucherBalance, voucherProducts, voucherHistory, allBioSuggestions, _upcomingCardVotes, _upcomingCardGames, meetingProfile, _noticeAckKeys] = await Promise.all([
    window.CottageDB.getMyStats(String(user.id), user.nickname || null),
    // 알림·교환권은 비공개 → 읽기전용에서는 조회하지 않음(개인정보)
    readOnly ? Promise.resolve([]) : (window.CottageDB.getMyNotifications?.(String(user.id), user.nickname || null, _sessForNotif.notifSeenAt || null, _sessForNotif.newGameSeenAt || null) || Promise.resolve([])),
    (window.CottageAchievements?.buildCodexSection(String(user.id), user.nickname || null) || Promise.resolve(_emptyCodex)).catch(() => _emptyCodex),
    (window.CottageAchievements?.fetchUserStats?.(String(user.id), user.nickname || null) || Promise.resolve(null)).catch(() => null),
    readOnly ? Promise.resolve(0)  : (window.CottageDB?.getVoucherBalance?.(String(user.id)) || Promise.resolve(0)).catch(() => 0),
    readOnly ? Promise.resolve([]) : (window.CottageDB?.getVoucherProducts?.() || Promise.resolve([])).catch(() => []),
    readOnly ? Promise.resolve([]) : (window.CottageDB?.getVoucherHistory?.(String(user.id), 5) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getAllBioTagSuggestions?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getMeetingVotes?.(_upcomingStart, _upcomingEnd) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getMeetingVoteGames?.(_upcomingStart, _upcomingEnd) || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getProfileBoardData?.(String(user.id)) || window.CottageDB?.getMeetingProfile?.(String(user.id)) || Promise.resolve(null)).catch(() => null),
    // 전체공지·교환권공지 확인 여부 — 기기 간 동기화용(로컬 세션만으론 재노출됨)
    readOnly ? Promise.resolve([]) : (window.CottageDB?.getNoticeAckKeys?.(String(user.id)) || Promise.resolve([])).catch(() => []),
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
  // 수집 보드 신규 해금 표시(2026-07-27) — 남 보드(readOnly)는 항상 null이라 표시 안 됨.
  // 이 렌더가 "처음 열람"이므로, 빌드에 쓴 뒤 바로 지금 시각으로 갱신해 다음 열람부턴 NEW가 꺼진다.
  const _achSeenAt = readOnly ? null : (_sessForNotif.achSeenAt || null);
  const [_charResult, _achResult, _titleResult] = await Promise.all([
    (window.CottageAchievements?.buildCharacterSection(String(user.id), user.nickname || null, userStats, _achSeenAt) || Promise.resolve(_emptyChar)).catch(() => _emptyChar),
    (window.CottageAchievements?.buildAchievementsSection(String(user.id), user.nickname || null, userStats, _achSeenAt) || Promise.resolve(_emptyAch)).catch(() => _emptyAch),
    (window.CottageAchievements?.buildTitleSection?.(String(user.id), _repTitleId, _visitCount, user.nickname || null, userStats, _achSeenAt) || Promise.resolve(_emptyTitle)).catch(() => _emptyTitle),
  ]);
  if (!readOnly && window._cottageSess) {
    const _s = window._cottageSess.get(String(user.id));
    _s.achSeenAt = new Date().toISOString();
    window._cottageSess.set(String(user.id), _s);
  }
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
  // 로컬 세션(기기별) 또는 DB(notice:voucher, 기기 간 동기화) 둘 중 하나라도 확인됐으면 seen.
  const voucherSeen = !!_sessForNotif.voucherNoticeSeen || (_noticeAckKeys || []).includes('notice:voucher');
  const VOUCHER_NOTICE_DATE = '2026-06-16';
  const _voucherDateLabel = fmtShort(VOUCHER_NOTICE_DATE);
  // ── 전체 공지 카드 (기간 내에만) ──
  const _feeNoticeLive = window._isFeeNoticeLive();
  const _feeSeen = !!_sessForNotif.feeNoticeSeen || (_noticeAckKeys || []).includes('notice:fee');
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
    // 태그는 모임(그룹+날짜) 단위 묶음으로 온다. 1건이면 기존 카드 그대로.
    const _reviewCta = '<a class="notif-inline-link" href="/pages/game/game-reviews.html" onclick="event.stopPropagation()">게임평 쓰러 가기 →</a>';
    if (n.type === 'tagged') {
      if (!(n.count > 1))
        return `<li class="${cls}" data-game-id="${escH(String(n.gameId))}">${_card('🎲', escH(getGameName(n.gameId)) + ' 기록 태그', '새 기록에 내 닉네임이 태그됐어요 · ' + _reviewCta)}${readBtn}</li>`;
      // 게임 칩은 `data-notif-game-id`로 준다 — `data-game-id`를 쓰면 closest()가 <li>까지
      // 올라가 어느 칩을 눌러도 대표 게임이 열린다(new_game의 data-game-name과 같은 역할).
      const chips = (n.gameIds || []).map(id =>
        `<span class="notif-game-link" data-notif-game-id="${escH(String(id))}">${escH(getGameName(id))}</span>`).join(', ');
      const who = n.groupName ? escH(n.groupName) + ' ' : '';
      // 칩과 조사 사이에 공백을 두지 말 것 — "펄서2849 에"로 렌더된다(2026-07-21 스크린샷에서 잡음).
      return `<li class="${cls}" data-game-id="${escH(String(n.gameId))}">${_card('🎲', `${who}기록 ${n.count}개 태그`, `${chips}에 내 닉네임이 태그됐어요 · ${_reviewCta}`)}${readBtn}</li>`;
    }
    if (n.type === 'curious_comment')
      return `<li class="${cls}" data-game-key="${escH(String(n.gameKey))}">${_card('🤔', escH(getGameName(n.gameKey)) + ' 새 코멘트', '궁금해요 게임에 코멘트가 달렸어요')}${readBtn}</li>`;
    if (n.type === 'curious_play')
      return `<li class="${cls}" data-game-id="${escH(String(n.gameId))}">${_card('🎲', escH(getGameName(n.gameId)) + ' 플레이됐어요', '궁금해요 게임을 누군가 플레이했어요')}${readBtn}</li>`;
    if (n.type === 'ordered')
      return `<li class="${cls}" data-game-name="${escH(String(n.gameName))}">${_card('🛒', escH(n.gameName) + ' 주문 완료', '게임 요청이 접수/주문되었습니다')}${readBtn}</li>`;
    if (n.type === 'snack_done')
      return `<li class="${cls}">${_card('🍿', escH(n.itemName) + ' 준비 완료', '요청하신 간식·음료가 준비됐어요')}${readBtn}</li>`;
    if (n.type === 'new_game') {
      const games = n.actualGames?.length ? n.actualGames : [n.gameName].filter(Boolean);
      if (games.length === 1) {
        return `<li class="${cls}" data-game-name="${escH(games[0])}">${_card('📦', escH(games[0]), '새 게임이 추가됐어요')}${readBtn}</li>`;
      }
      const gameLinks = games.map(g => `<span class="notif-game-link" data-game-name="${escH(g)}">${escH(g)}</span>`).join(', ');
      return `<li class="${cls}">${_card('📦', gameLinks, '새 게임이 추가됐어요')}${readBtn}</li>`;
    }
    // new_intro/new_member 둘 다 "OOO 외 N명"으로 뭉개지 말고 이름을 보여주자는 결정이었는데
    // (2026-07-31, "다른 N명은 누군지 모른다"는 지적), 인원이 늘면서 한 줄에 이름이 끝없이
    // 쌓이는 반대쪽 문제가 생겼다(2026-08-02 사용자 지적). 5명까지는 전부 보여주고 그 이상만
    // "외 N명"으로 접는다 — 적을 땐 원래 취지(누군지 보임) 그대로, 많을 때만 안전장치.
    const MAX_NOTIF_NAMES = 5;
    // 조회 자체가 최근 30일 창(supabase-client.js _NOTIF_RECENT_SINCE)이라 그 기준을
    // 문구에도 명시한다 — "무엇을 언제 셌는지"가 안 붙으면 몇 명인지만 보고 "오늘 갑자기
    // 이렇게 많이?"로 오해하기 쉽다(2026-08-02 사용자 요청).
    const _period = '최근 한 달간 ';
    if (n.type === 'new_intro') {
      const shown = n.names.slice(0, MAX_NOTIF_NAMES);
      const rest = n.names.length - shown.length;
      const desc = n.count === 1
        ? `${escH(n.names[0])}님이 소개글을 올렸어요`
        : rest > 0
          ? `${_period}${shown.map(escH).join(', ')}님 외 ${rest}명이 소개글을 올렸어요`
          : `${_period}${shown.map(escH).join(', ')}님이 소개글을 올렸어요`;
      return `<li class="${cls}"${n.firstUserId ? ` data-intro-uid="${escH(String(n.firstUserId))}"` : ''}>${_card('👋', '동호회 소개글', desc)}${readBtn}</li>`;
    }
    if (n.type === 'new_member') {
      // 이름마다 그 사람의 uid를 실어 클릭 시 보드로 이동(2026-08-02, 사용자 요청 —
      // 나뿐 아니라 모든 사용자가 클릭하면 그 신규회원 보드로 가야 함). new_intro는
      // 1명(firstUserId)만 이동 가능했는데, 여러 명이 묶여도 이름 각각을 개별 링크로.
      const nameLink = (name, i) => {
        const uid = n.userIds?.[i];
        return uid ? `<span class="notif-member-link" data-member-uid="${escH(String(uid))}">${escH(name)}</span>` : escH(name);
      };
      const shownCount = Math.min(n.names.length, MAX_NOTIF_NAMES);
      const rest = n.names.length - shownCount;
      const shownLinks = n.names.slice(0, shownCount).map(nameLink).join(', ');
      // "외 N명"이 누군지 안 보이던 문제(2026-08-19 사용자 지적) — 접힌 나머지도 이름+링크로
      // 보여주되 한 줄이 끝없이 늘어지지 않도록 토글 뒤에 숨겨둔다. 펼쳐진 이름도
      // nameLink()를 그대로 써서 클릭하면 그 사람 보드로 이동(기존 5명과 동일 동작).
      const restToggle = rest > 0
        // ⚠️ .slice(shownCount).map(nameLink)로 쓰면 안 된다 — map의 인덱스가 잘라낸
        // 배열 기준으로 0부터 다시 시작해 n.userIds[i]가 엉뚱한(앞쪽 5명의) uid를 가리킨다.
        ? `<button class="notif-member-toggle" type="button" data-more="${rest}">외 ${rest}명</button><span class="notif-member-rest is-hidden">, ${n.names.slice(shownCount).map((name, i) => nameLink(name, i + shownCount)).join(', ')}</span>`
        : '';
      const desc = n.count === 1
        ? `${nameLink(n.names[0], 0)}님이 새로 가입했어요`
        : rest > 0
          ? `${_period}${shownLinks} ${restToggle}이 새로 가입했어요`
          : `${_period}${shownLinks}님이 새로 가입했어요`;
      return `<li class="${cls}">${_card('🎉', '신규 회원', desc)}${readBtn}</li>`;
    }
    // 교환권은 유형+날짜로 묶여서 온다(관리자 전용). names는 중복 제거된 사람 목록,
    // count는 건수라 서로 다를 수 있다 — 한 사람이 하루에 여러 번 쓰면 names 1 / count 13.
    if (n.type === 'voucher_granted' || n.type === 'voucher_used') {
      const used = n.type === 'voucher_used';
      const names = n.names || [n.nickname];
      const who = names.length > 1 ? `${escH(names[0])} 외 ${names.length - 1}명` : escH(names[0] || '사용자');
      const cnt = n.count > 1 ? ` ${n.count}건` : '';
      const reasonLabel = used ? '음료 교환권 사용'
        : n.reason === 'first_play' ? '첫 기록 보상' : n.reason === 'intro_complete' ? '모임원 프로필 작성 보상' : n.reason === 'achievement' ? '업적 달성 보상' : '관리자 지급';
      return `<li class="${cls}">${_card('🎫', `${who} 교환권 ${used ? '사용' : '획득'}${cnt}`, reasonLabel)}${readBtn}</li>`;
    }
    // 업적도 유형+날짜로 묶여서 온다 — showAchievementToast는 그 순간에만 보이는
    // 일회성 토스트라 알림판에 안 남던 걸 여기서 보충한다.
    if (n.type === 'achievement') {
      const defs = (n.achievementIds || []).map(id => window.CottageAchievements?.getAchievementDef?.(id)).filter(Boolean);
      const first = defs[0];
      const emoji = first?.emoji || '🏆';
      // "OOO 외 N개"로 뭉개지 않고 이름+조건을 전부 나열한다(2026-07-27) — "외 1건은 뭔지, 조건이 뭔지 안 보인다"는 지적.
      const _label = d => `${escH(d.name || '')}${d.conditionText ? `(${escH(d.conditionText)})` : ''}`;
      const desc = defs.length > 1
        ? `${defs.map(_label).join(', ')} 업적을 달성했어요`
        : `${_label(first || {})} 업적을 달성했어요`;
      // 클릭 시 내 수집 보드의 업적 목록으로 이동 + 해당 항목 스크롤·강조(2026-08-02, 사용자 요청).
      // 🚨 defs.map(d => d.id)로 뽑으면 안 된다 — getAchievementDef가 반환하는 객체엔 id 필드가
      // 없다({name,emoji,conditionText}만 있음). 그래서 1건짜리 알림은 id가 ""(빈 문자열,
      // Array.join의 undefined 처리)가 돼 속성 자체가 안 붙어 클릭이 씹혔다(실제 신고 사례:
      // "장인 게이머" 1건만 안 눌림 — 6건 묶음은 콤마가 여러 개라 우연히 값이 남아 열리긴 했다).
      // 원본 n.achievementIds를 그대로 쓴다.
      const achIdsAttr = (n.achievementIds && n.achievementIds.length) ? ` data-notif-ach-ids="${escH(n.achievementIds.join(','))}"` : '';
      return `<li class="${cls}"${achIdsAttr}>${_card(emoji, `업적 달성${n.count > 1 ? ` ${n.count}건` : ''}`, desc)}${readBtn}</li>`;
    }
    // 간식·음료 요청도 유형+날짜로 묶여서 온다(관리자 전용, voucher와 같은 패턴).
    if (n.type === 'snack_request') {
      const items = n.names || [];
      const desc = items.length > 1
        ? `${escH(items[0])} 외 ${items.length - 1}건이 새로 요청됐어요`
        : `${escH(items[0] || '')}이(가) 새로 요청됐어요`;
      return `<li class="${cls}">${_card('🍿', `간식·음료 요청 ${n.count}건`, desc)}${readBtn}</li>`;
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
  // 새 알림이 1건뿐일 때만 NEW 뱃지가 반짝임 — 여러 건이 동시에 반짝이면 산만해서(2026-08-02 판단) is-multi-new로 막는다.
  let _notifInnerHtml = `<div class="profile-notif-body${_newCount === 1 ? '' : ' is-multi-new'}"><div class="notif-list-header">${_hasAnyNew ? '<button class="profile-notif-confirm-all" type="button">모두 읽기</button>' : ''}</div>${_noticeFirst ? _feeNoticeHtml : ''}${_voucherFirst ? voucherCardHtml : ''}<ul class="profile-notif-list">${_allNotifItems}</ul>${_hiddenNotifHtml}${_voucherFirst ? '' : voucherCardHtml}${_noticeFirst ? '' : _feeNoticeHtml}${_notifHelpHtml}</div>`;

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

  // 모임 카드도 모임 보드와 같은 가까운 미래 범위를 쓴다. 날짜별 vote의 실제 참여
  // 정보(meeting_votes)와 날짜별 게임(meeting_vote_games)을 한 장의 짧은 요약으로 압축한다.
  // 평소 프로필 값은 여기서 읽지 않는다 — 프로필 보드의 다른 영역과 중복되기 때문이다.
  const _meetingStyleLabels = { party: '파티', strategy: '전략', any: '게임 유형 무관', other: '기타' };
  const _meetingDepthLabels = { light: '가볍게', medium: '적당히', deep: '깊게' };
  const _meetingTraitLabels = { beginner_welcome: '초보 환영', new_game_ok: '새 게임 가능', hard_game_learning_ok: '어려운 게임도 배워보고 싶어요' };
  const _meetingGameName = game => {
    const rawId = game?.game_id != null ? String(game.game_id).replace(/^#/, '') : '';
    const cottageGame = rawId && window.COTTAGE_GAMES?.find(g => String(g.bggId) === rawId || String(g.id) === rawId);
    if (cottageGame) return cottageGame.display;
    const gameKey = rawId ? (_getGameKeyById(rawId) || rawId) : '';
    const gameData = gameKey ? window.gameData?.[gameKey] : null;
    return gameData ? (gameData.title?.display || gameData.title?.owned || gameData.title?.bgg || gameKey) : (game?.custom_name || rawId);
  };
  const _uniqueMeetingValues = values => [...new Set(values.filter(Boolean))];
  const _renderMeetingPreview = (allVotes, allGames) => {
    const myVotes = (allVotes || []).filter(v => String(v.user_id) === String(user.id))
      .sort((a, b) => String(a.vote_date).localeCompare(String(b.vote_date)));
    const myGames = (allGames || []).filter(g => String(g.user_id) === String(user.id));
    if (!myVotes.length) return '<span class="profile-card-meeting-empty">아직 예정된 모임이 없어요</span>';
    const meetingDateLabels = myVotes.map(v => {
      const date = new Date(`${v.vote_date}T00:00:00`);
      return `${date.getMonth() + 1}/${date.getDate()}(${'일월화수목금토'[date.getDay()]})`;
    });
    const meetingStyles = _uniqueMeetingValues(myVotes.flatMap(v => [
      v.game_style === 'other' ? v.game_style_custom : _meetingStyleLabels[v.game_style],
      _meetingDepthLabels[v.game_depth],
      ...(v.play_traits || []).map(trait => _meetingTraitLabels[trait]),
    ]));
    const meetingGamesByType = listType => {
      const seen = new Set();
      return myGames.filter(g => g.list_type === listType).filter(g => {
        const key = g.game_id != null ? `id:${g.game_id}` : `cn:${String(g.custom_name || '').trim().toLocaleLowerCase('ko-KR')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const meetingGameLine = (listType, label) => {
      const games = meetingGamesByType(listType).map(_meetingGameName).filter(Boolean);
      return games.length ? `<div class="profile-card-meeting-line"><span class="profile-card-meeting-label">${label}</span><span class="profile-card-meeting-games">${games.map(escH).join(' · ')}</span></div>` : '';
    };
    const meetingMessages = _uniqueMeetingValues(myVotes.map(v => String(v.recruitment_message || '').trim()));
    const styleHtml = meetingStyles.length
      ? `<div class="profile-card-meeting-tags">${meetingStyles.map(label => `<span>${escH(label)}</span>`).join('')}</div>`
      : '';
    const gameHtml = [meetingGameLine('want', '하고 싶은 게임'), meetingGameLine('learn', '배우고 싶은 게임')].filter(Boolean).join('');
    const messageHtml = meetingMessages.length
      ? `<div class="profile-card-meeting-line profile-card-meeting-line--message"><span class="profile-card-meeting-label">한마디</span><span class="profile-card-meeting-games">${meetingMessages.map(escH).join(' · ')}</span></div>`
      : '';
    const _dateLimit = 3;
    const _shownDates = meetingDateLabels.slice(0, _dateLimit);
    const _extraDates = meetingDateLabels.length - _shownDates.length;
    const _dateHtml = `${_shownDates.join(' · ')}${_extraDates > 0 ? ` 외 ${_extraDates}회` : ''}`;
    return `<span class="profile-card-schedule"><span class="profile-card-meeting-heading">다가오는 모임</span><span class="profile-card-meeting-weeks">${escH(_dateHtml)}</span>${styleHtml}${gameHtml}${messageHtml}</span>`;
  };
  const _scheduleHtml = _renderMeetingPreview(_upcomingCardVotes, _upcomingCardGames);

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

  // 프로필 보드(레거시 내부 키 taste 유지)
  const _BIO_PREDEFINED = ['전략게임을 좋아해요', '가벼운 파티게임 선호해요', '협력게임 팬이에요', '무거운 유로게임 마니아', '보드게임 처음 시작했어요', '코티지보드 단골이에요', '새로 해보는 게임이 좋아요', '한 게임을 진득하게 파는 걸 좋아해요', '전략을 분석하는 게 좋아요', '창의적인 플레이가 좋아요', '함께 교류하는 걸 좋아해요'];
  const _INTRO_FREQUENCY_LABELS = ['몇 달에 1회 이하','월 1회','월 2~3회','주 1회','주 2회','주 3회','주 4회 이상'];
  const _INTRO_COMPANION_LABELS = { friends:'친구·지인', partner:'연인·배우자', family:'가족', boardgame_group:'보드게임 모임·동호회', various:'상황에 따라 다양함' };
  const _INTRO_DAY_LABELS = { mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일', flexible:'유동적' };
  const _INTRO_GAME_TYPE_LABELS = { party:'파티·친목', mystery:'추리·미스터리', strategy:'전략·유로', thematic:'테마·몰입', cooperative:'협력', social_deduction:'마피아·블러핑', card_deckbuilding:'카드·덱빌딩', puzzle_abstract:'퍼즐·추상', campaign_legacy:'캠페인·레거시', any:'장르 무관' };
  const _INTRO_JOIN_SOURCE_LABELS = { store_visit:'매장 방문', friend_referral:'지인 추천', cottage_homepage:'코티지 홈페이지', open_chat_search:'오픈카톡 검색', daangn:'당근 동호회·광고', naver_place:'네이버(플레이스) 검색', social_media:'인스타그램·기타 SNS' };
  const _INTRO_DEPTH_OPTIONS = { intro:{name:'입문 · 추천',start:1,end:1.5}, light:{name:'라이트 · 패밀리',start:1.5,end:2.5}, strategy:{name:'전략 · 매니아',start:2.5,end:3.5}, hardcore:{name:'하드코어',start:3.5,end:5} };
  const _formatDepthRanges = values => {
    const ordered = ['intro','light','strategy','hardcore'].filter(code => (values || []).includes(code));
    const groups = []; ordered.forEach(code => { const item = _INTRO_DEPTH_OPTIONS[code]; const last = groups.at(-1); if (last && last.end === item.start) last.end = item.end; else groups.push({start:item.start,end:item.end}); });
    return groups.map(group => `${group.start.toFixed(1)}~${group.end.toFixed(1)}`).join(' · ');
  };
  const _INTRO_CLOCKTOWER_LABELS = { love:'매우 좋아함', interested:'기회가 되면 참여하고 싶음', curious:'아직 모르지만 해보고 싶음', not_preferred:'별로 선호하지 않음', no:'참여하고 싶지 않음' };
  const _INTRO_DAY_LABELS_EXTENDED = { ..._INTRO_DAY_LABELS, holiday:'공휴일' };
  const _introLabels = (values, map) => (values || []).map(value => map[value] || value).join(', ');
  // ── 취향·모임 보드 공용 데이터 (R10b: 진입 시 DB 재조회 = 단일 소스) ────────────
  // 두 보드는 좋아요·궁금해요·한줄소개·피하는유형·룰설명을 똑같이 보여준다. 예전엔 각자
  // 사본을 들고 있어 한쪽 편집이 반대편에 새로고침 전까지 안 보였다(크로스보드 stale).
  // 이제 서브시트에 들어갈 때마다 getMeetingProfile 하나를 다시 읽어 양쪽에 넘긴다.
  const _emptyBoardData = { bio: '', nickname: '', location: '', joinSources: [], gameTypeRange: [], avoidGameTypes: [], gameDepthRange: [], avoidGameDepths: [], available: '', travelRange: '', meetingStyle: [], companionTypes: [], averagePlayFrequency: null, possibleFrequencyMin: null, possibleFrequencyMax: null, desiredFrequencyMin: null, desiredFrequencyMax: null, availableDays: [], availableTimes: [], preferredGameTypes: [], preferredGameDepths: [], hardestGames: [], clocktowerPreference: '', expectation: '', questionnaireCompletedAt: null, likedGames: [], curiousGames: [], ruleGames: [] };
  // 재조회하는 동안 잠깐 보이는 자리(모임보드가 이미 쓰던 클래스 재사용 — 신규 CSS 없음)
  const _SUBSHEET_LOADING_HTML = '<p class="taste-game-empty">불러오는 중…</p>';
  let _boardData = meetingProfile || _emptyBoardData; // 패널 오픈 시 값이 최초의 '직전 값'
  async function _refreshBoardData() {
    const mp = await (window.CottageDB?.getProfileBoardData?.(String(user.id)) || window.CottageDB?.getMeetingProfile?.(String(user.id)) || Promise.resolve(null))
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

  const _profileGameName = game => {
    const gameId = game?.game_id || game?.gameId || null;
    const gd = gameId ? window.gameData?.[gameId] : null;
    return gd ? (gd.title?.display || gd.title?.owned || gd.title?.bgg || String(gameId))
      : (game?.custom_name || game?.customName || String(gameId || ''));
  };
  const _profileInfoRowHtml = (label, value) => `<div class="profile-info-row"><span class="profile-info-label">${label}</span><span class="profile-info-value${value ? '' : ' is-empty'}">${value ? escH(value) : '미입력'}</span></div>`;
  const _buildHardestGamesHtml = games => {
    if (!games.length) return `<p class="profile-hardest-empty">${readOnly ? '등록된 게임이 없어요' : '해본 게임 중 어려웠던 게임을 추가해보세요'}</p>`;
    return games.map(game => {
      const name = _profileGameName(game);
      const gameId = game.game_id || '';
      const customName = game.custom_name || '';
      return `<div class="profile-hardest-item" data-game-id="${escH(gameId)}" data-custom-name="${escH(customName)}">
        <span class="profile-hardest-order">${Number(game.sort_order) || ''}</span>
        <span class="profile-hardest-name">${escH(name)}</span>
        ${_ro('<button class="profile-hardest-remove" type="button" title="삭제">✕</button>')}
      </div>`;
    }).join('');
  };

  // 내 프로필 보드 정본: 최신 데이터 전체를 3단 게임 취향까지 읽기 전용으로 보여준다.
  function _buildTasteInnerHtml(d) {
    const _ruleSet = _makeRuleSet(d);
    const likedGames = d.likedGames || [];
    const curiousGames = d.curiousGames || [];
    const _depthNames = values => (values || []).map(code => _INTRO_DEPTH_OPTIONS[code]?.name).filter(Boolean).join(' · ');
    const _rangeDepthNames = values => {
      const ordered = ['intro','light','strategy','hardcore'].filter(code => (values || []).includes(code));
      if (ordered.length <= 1) return _depthNames(ordered);
      return ordered.map(code => ({ intro:'입문', light:'라이트', strategy:'매니아', hardcore:'하드코어' })[code]).join(' · ');
    };
    const _gameRangeNames = values => (values || []).includes('any')
      ? _INTRO_GAME_TYPE_LABELS.any
      : _introLabels(values, _INTRO_GAME_TYPE_LABELS);
    const _tasteTier = (label, value, range = '') => `
      <div class="profile-taste-tier">
        <span class="profile-taste-tier-label">${label}</span>
        <span class="profile-taste-tier-value${value ? '' : ' is-empty'}">${value ? escH(value) : '미입력'}${range ? `<small>${escH(range)}</small>` : ''}</span>
      </div>`;
    const hardestGames = d.hardestGames || [];
    const availableStructured = window.CottageDB?.formatMemberIntroAvailability?.(d.availableDays, d.availableTimes) || [
      _introLabels(d.availableDays, _INTRO_DAY_LABELS_EXTENDED),
      window.CottageDB?.formatMemberIntroTimes?.(d.availableTimes) || _introLabels(d.availableTimes, {}),
    ].filter(Boolean).join(' · ');
    const usualStructured = window.CottageDB?.formatMemberIntroAvailability?.(d.usualPlayDays, d.usualPlayTimes) || [
      _introLabels(d.usualPlayDays, _INTRO_DAY_LABELS_EXTENDED),
      window.CottageDB?.formatMemberIntroTimes?.(d.usualPlayTimes) || _introLabels(d.usualPlayTimes, {}),
    ].filter(Boolean).join(' · ');
    const avoidTypes = d.avoidGameTypes || [];
    const avoidDepths = d.avoidGameDepths || [];
    return `
    ${d.expectation
      ? `<section class="profile-info-section profile-expectation-section">
      <div class="profile-main-title">코티지에서 함께 게임할 때</div>
      <p class="profile-expectation-text">${escH(d.expectation)}</p>
    </section>`
      : (readOnly ? '' : `<section class="profile-info-section profile-expectation-section">
      <div class="profile-main-title">코티지에서 함께 게임할 때</div>
      <p class="profile-info-value is-empty">아직 작성하지 않았어요</p>
    </section>`)}
    <section class="profile-info-section profile-usual-play-section">
      <div class="profile-main-title">평소 플레이</div>
      <div class="profile-info-list">
        ${_profileInfoRowHtml('평균 플레이 빈도', d.averagePlayFrequency != null ? _INTRO_FREQUENCY_LABELS[d.averagePlayFrequency] : '')}
        ${_profileInfoRowHtml('주로 함께하는 사람', _introLabels(d.companionTypes, _INTRO_COMPANION_LABELS))}
        ${_profileInfoRowHtml('주로 플레이하는 때', usualStructured)}
        ${_profileInfoRowHtml('거주 지역', d.location || '')}
        ${_profileInfoRowHtml('가입 경로', _introLabels(d.joinSources, _INTRO_JOIN_SOURCE_LABELS))}
      </div>
    </section>
    <section class="profile-info-section profile-meeting-play-section">
      <div class="profile-main-title">모임 참여 페이스</div>
      <div class="profile-info-list">
        ${_profileInfoRowHtml('참여 가능 빈도', _introFrequencyRange(d.possibleFrequencyMin, d.possibleFrequencyMax))}
        ${_profileInfoRowHtml('원하는 참여 빈도', _introFrequencyRange(d.desiredFrequencyMin, d.desiredFrequencyMax))}
        ${_profileInfoRowHtml('참여 가능한 때', availableStructured || d.available || '')}
      </div>
    </section>
    <section class="profile-info-section profile-taste-section">
      <div class="profile-main-title">게임 취향</div>
      <div class="profile-taste-group">
        <div class="profile-taste-subtitle">게임 유형</div>
        ${_tasteTier('주 취향', _introLabels(d.preferredGameTypes, _INTRO_GAME_TYPE_LABELS))}
        ${_tasteTier('즐기는 범위', _gameRangeNames(d.gameTypeRange))}
        ${_tasteTier('꺼림 유형', avoidTypes.includes('none') ? '없음' : _introLabels(avoidTypes, {}))}
      </div>
      <div class="profile-taste-group">
        <div class="profile-taste-subtitle">게임 난이도</div>
        ${_tasteTier('주 난이도', _rangeDepthNames(d.preferredGameDepths), _formatDepthRanges(d.preferredGameDepths))}
        ${_tasteTier('즐기는 범위', _rangeDepthNames(d.gameDepthRange), _formatDepthRanges(d.gameDepthRange))}
        ${_tasteTier('꺼림 난이도', avoidDepths.length ? _depthNames(avoidDepths) : '없음', _formatDepthRanges(avoidDepths))}
      </div>
      ${d.clocktowerPreference ? `<div class="profile-taste-clocktower">${_profileInfoRowHtml('시계탑 선호', _INTRO_CLOCKTOWER_LABELS[d.clocktowerPreference] || d.clocktowerPreference)}</div>` : ''}
      </div>
      <div class="profile-taste-subsection profile-taste-hardest-block">
      <div class="profile-experience-block">
      <div class="profile-experience-head"><span>가장 어려웠던 게임</span></div>
        <div class="profile-hardest-list">${_buildHardestGamesHtml(hardestGames)}</div>
        <p class="profile-experience-hint">실제로 플레이해본 범위를 보여줘요.</p>
      </div>
      </div>
    <div class="taste-game-section profile-taste-games-section">
      <div class="profile-taste-subtitle">❤️ 좋아하는 게임 <span class="taste-count" id="tastelikedCount">${likedGames.length}개</span> ${_ro('<button class="taste-add-btn taste-add-btn--inline" id="tastelikedAddBtn" type="button">+ 게임 추가</button>')}</div>
      <div class="taste-game-list" id="tastelikedList">${_buildTasteGameItems(likedGames, _ruleSet)}</div>
    </div>
    <div class="taste-game-section">
      <div class="profile-taste-subtitle">👀 해보고 싶은 게임 <span class="taste-count" id="tastecuriousCount">${curiousGames.length}개</span> ${_ro('<button class="taste-add-btn taste-add-btn--inline" id="tastecuriousAddBtn" type="button">+ 게임 추가</button>')}</div>
      <div class="taste-game-list" id="tastecuriousList">${_buildTasteGameItems(curiousGames, _ruleSet)}</div>
    </div>
    </section>
    <div class="profile-board-action-row">
      ${_ro(`<button class="profile-board-edit-link" data-board-frame-src="/pages/club/club-intro.html?embed=1&wizard=1#embed=1&wizard=1" data-board-frame-title="${d.questionnaireCompletedAt ? '프로필 수정' : '프로필 작성'}" data-board-frame-wizard="true" type="button">${d.questionnaireCompletedAt ? '프로필 수정' : '프로필 작성'}</button>`)}
      <a class="profile-board-page-link" href="/pages/club/club-intro.html">모임원 프로필 페이지 &gt;</a>
    </div>`;
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
  // 프로필 보드 미리보기 카드 요약: 주 취향만 빠르게 확인한다. 예전엔 패널 오픈 시 1회 문자열이라 서브시트에서 게임을 추가해도
  // 카드는 옛 개수 그대로였다(들어가면 4개, 나오면 3개). 이제 _boardData(취향·모임 공용
  // 단일 소스)를 받는 함수이고, 변경이 일어난 자리에서 _syncTasteCard()로 다시 그린다.
  const _tasteCardSummaryHtml = (d) => {
    const types = (d.preferredGameTypes || []).map(value => _INTRO_GAME_TYPE_LABELS[value] || value);
    const depthLabels = (d.preferredGameDepths || []).map(value => _INTRO_DEPTH_OPTIONS[value]?.name).filter(Boolean);
    const frequency = d.averagePlayFrequency != null ? _INTRO_FREQUENCY_LABELS[d.averagePlayFrequency] : '';
    const companions = (d.companionTypes || []).map(value => _INTRO_COMPANION_LABELS[value] || value).join(' · ');
    const available = window.CottageDB?.formatMemberIntroAvailability?.(d.availableDays, d.availableTimes)
      || [_introLabels(d.availableDays, _INTRO_DAY_LABELS_EXTENDED), window.CottageDB?.formatMemberIntroTimes?.(d.availableTimes)].filter(Boolean).join(' · ')
      || d.available
      || '';
    const bio = d.expectation || d.bio || '';
    return `${bio ? `<span class="profile-card-bio-row">${escH(bio)}</span>` : ''}
      ${types.length ? `<span class="profile-card-detail-row"><b>주 취향:</b> ${escH(types.join(' · '))}</span>` : ''}
      ${depthLabels.length ? `<span class="profile-card-detail-row"><b>주 난이도:</b> ${escH(depthLabels.join(' · '))}</span>` : ''}
      ${(frequency || companions) ? `<span class="profile-card-detail-row"><b>평소 플레이:</b> ${escH([frequency, companions].filter(Boolean).join(' · '))}</span>` : ''}
      ${available ? `<span class="profile-card-detail-row"><b>참여 가능한 때:</b> ${escH(available)}</span>` : ''}
      <span class="profile-card-games-row">좋아하는 게임 ${(d.likedGames || []).length} · 해보고 싶은 게임 ${(d.curiousGames || []).length} · 설명 가능 ${(d.ruleGames || []).length}</span>`;
  };
  const _syncTasteCard = () => {
    const el = body.querySelector('.profile-card[data-subsheet="taste"] .profile-card-summary');
    if (el) el.innerHTML = _tasteCardSummaryHtml(_boardData);
  };
  const _recordCardSummary = `게임평 ${_allReviews.length}개\n사진 ${userStats?.photoCount || 0}장\n플레이 기록 ${stats.plays.length}건`;
  const _usageCardSummary = _statsSummary;

  // ── 메인 패널: 프로필 영역 + 4축 레이아웃 ──────────────────
  const _repCharPath = userStats?.repAch?.id
    ? (window.CottageAchievements?.getCharacterPath?.(userStats.repAch.id) || null)
    : null;
  const _repName = userStats?.repAch?.id
    ? (window.CottageAchievements?.getCharacterName?.(userStats.repAch.id) || null)
    : null;
  const _repAvatarHtml =
    _repCharPath
      ? `<img class="profile-panel-avatar" src="${_repCharPath}" alt="${escH(_repName || '')}">`
      : `<span class="profile-panel-avatar profile-panel-avatar--empty">🐾</span>`;
  const _repImgHtml = `<div class="profile-panel-avatar-wrap">${_repAvatarHtml}${_ro('<span class="profile-panel-avatar-edit">⚙</span>')}</div>`;
  const _repIdentityHtml = `<span class="profile-panel-avatar-wrap">${_repAvatarHtml}</span>`;
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

  // 모임 보드: meeting_votes/meeting_vote_games의 가까운 미래 상태가 본문이고,
  // member_intros/profiles 평소 데이터는 프로필 보드 SSOT의 짧은 참조로만 표시한다.
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
  });
  const _recentPlayItemHtml = r => {
    const _gk = _getGameKeyById(r.game_id);
    const _gd = _gk ? window.gameData?.[_gk] : null;
    const _th = _gd?.images?.thumbnail
      ? `<img class="profile-record-thumb" src="${escH(_gd.images.thumbnail)}" alt="">`
      : `<span class="profile-record-thumb-empty"></span>`;
    return `<li class="profile-activity-item profile-activity-item--thumb" data-game-id="${escH(String(r.game_id || ''))}">${_th}<button class="profile-game-link profile-game-link--light" type="button">${escH(getGameName(r.game_id))}</button><span class="profile-review-date">${_relDay(r.played_at || r.created_at)}</span></li>`;
  };
  // 5개 초과분은 buildActivityList의 더 보기 뒤로 — 기록 보드 3섹션과 같은 패턴(2026-07-30)
  const _recentPlaysHtml = _recentPlays.length
    ? _openActivityList(buildActivityList(_recentPlays, _recentPlayItemHtml, 5))
    : _emptyList('아직 모임 참여 기록이 없어요');

  function _meetingProfileRowHtml(label, val) {
    return `<div class="meeting-profile-row"><span class="meeting-profile-label">${label}</span><span class="meeting-profile-val${val ? '' : ' is-empty'}">${val ? escH(val) : '미입력'}</span></div>`;
  }

  const _introFrequencyRange = (min, max) => {
    if (min == null || max == null) return '';
    return min === max ? _INTRO_FREQUENCY_LABELS[min] : `${_INTRO_FREQUENCY_LABELS[min]} ~ ${_INTRO_FREQUENCY_LABELS[max]}`;
  };

  // 진입할 때마다 최신 데이터로 다시 빌드한다.
  function _buildMeetingInnerHtml(d) {
    const _meeting = d;
    const _availableDayText = window.CottageDB?.formatMemberIntroDays?.(_meeting.availableDays)
      || _introLabels(_meeting.availableDays, _INTRO_DAY_LABELS_EXTENDED);
    const _availableDays = [_availableDayText,
      (_meeting.availableDays || []).some(value => String(value) === 'flexible') ? '일정 유동적' : '']
      .filter(Boolean).join(' · ');
    const _availableTimes = window.CottageDB?.formatMemberIntroTimes?.(_meeting.availableTimes)
      || _introLabels(_meeting.availableTimes, {});

    return `
    <section class="meeting-board-section meeting-upcoming-section" aria-label="다가오는 모임">
      <div id="mbWeekSection">
      <div class="taste-section-label">다가오는 모임</div>
      <p class="taste-game-empty">불러오는 중…</p>
      </div>
    </section>
    <section class="meeting-board-section meeting-plan-section">
      <div class="taste-section-label">모임 참여 페이스</div>
      <div class="meeting-profile-display">
        ${_meetingProfileRowHtml('참여 가능 빈도', _introFrequencyRange(_meeting.possibleFrequencyMin, _meeting.possibleFrequencyMax))}
        ${_meetingProfileRowHtml('원하는 참여 빈도', _introFrequencyRange(_meeting.desiredFrequencyMin, _meeting.desiredFrequencyMax))}
        ${_meetingProfileRowHtml('참여 가능한 요일', _availableDays)}
        ${_meetingProfileRowHtml('참여 가능한 시간대', _availableTimes)}
      </div>
    </section>
    <section class="meeting-board-section meeting-recent-section">
      <div class="taste-section-label">최근 참여${stats.moimCount ? ` · ${stats.moimCount}회` : ''}</div>
      ${_recentPlaysHtml}
    </section>
    `;
  }

  body.innerHTML = `
    ${!backTo ? `<div class="profile-panel-compact-header profile-fixed-header" aria-hidden="true">
      <div class="profile-panel-compact-header-inner">
          <div class="profile-panel-compact-identity profile-fixed-header-left">
          <span class="profile-panel-compact-avatar">${_repAvatarHtml}</span>
          <span class="profile-panel-compact-nickname">${escH(user.nickname || (readOnly ? '회원' : '손님'))}</span>
        </div>
        <span class="profile-panel-compact-title">내 보드</span>
        <button aria-label="내 보드 닫기" class="profile-panel-close profile-panel-compact-close profile-fixed-header-close" type="button">✕</button>
      </div>
    </div>` : ''}
    <div class="profile-panel-profile">
      <div class="profile-panel-profile-top">
        ${_repImgHtml}
        <div class="profile-panel-profile-info">
          <div class="profile-panel-nick-row">
            <button class="profile-panel-nick" type="button">${escH(user.nickname || (readOnly ? '회원' : '손님'))} ${_ro('<span class="profile-nick-edit">✏️</span>')}</button>
            ${_ro(`<span class="profile-panel-account-actions">
              <button class="profile-panel-notif-btn${_newCount === 0 ? ' is-zero' : ''}" data-subsheet="notif" type="button">${_newCount > 0 ? '<span class="notif-red-dot"></span>' : ''}🔔 ${_newCount > 0 ? `새 알림 ${_newCount}건` : '알림'}</button>
              <button class="profile-panel-voucher-btn" data-subsheet="voucher" type="button">🎫 음료교환권 ${voucherBalance}장 ›</button>
            </span>`)}
          </div>
          <span class="profile-panel-rep-name">${_repLabel}</span>
          <button class="profile-panel-title-name${_validRepTitle ? '' : ' is-empty'}" type="button">${_validRepTitle ? `${_validRepTitle.emoji} ${escH(_validRepTitle.name)} ${_ro('<span class="profile-title-edit">⚙</span>')}` : `칭호 없음 ${_ro('<span class="profile-title-edit">⚙</span>')}`}</button>
          ${readOnly ? '<span class="profile-panel-readonly-hint">읽기 전용으로 보고 있어요</span>' : ''}
        </div>
      </div>
      <button class="profile-growth-link" type="button">
        <span class="profile-growth-card-heading"><span class="profile-card-icon">🏆</span><span class="profile-card-label">수집 보드 <span class="profile-card-label-chevron" aria-hidden="true">›</span></span></span>
        <span class="profile-growth-summary-row">
          <span class="profile-growth-summary-text">${escH(_growthLine)}</span>
        </span>
        ${_growthBadge}
      </button>
    </div>
    <div class="profile-card-grid">
      <button class="profile-card" data-subsheet="taste" type="button">
        <span class="profile-card-heading"><span class="profile-card-icon">👤</span><span class="profile-card-label">프로필 보드 <span class="profile-card-label-chevron" aria-hidden="true">›</span></span></span>
        <span class="profile-card-summary">${_tasteCardSummaryHtml(_boardData)}</span>
      </button>
      <button class="profile-card" data-subsheet="meeting" type="button">
        <span class="profile-card-heading"><span class="profile-card-icon">📅</span><span class="profile-card-label">모임 보드 <span class="profile-card-label-chevron" aria-hidden="true">›</span></span></span>
        <div class="profile-card-summary">${_scheduleHtml}</div>
      </button>
      <button class="profile-card" data-subsheet="records" type="button">
        <span class="profile-card-heading"><span class="profile-card-icon">📝</span><span class="profile-card-label">기록 보드 <span class="profile-card-label-chevron" aria-hidden="true">›</span></span></span>
        <span class="profile-card-summary">${escH(_recordCardSummary)}</span>
      </button>
      ${_ro(`<button class="profile-card" data-subsheet="usage" type="button">
        <span class="profile-card-heading"><span class="profile-card-icon">📊</span><span class="profile-card-label">함께한 시간 <span class="profile-card-label-chevron" aria-hidden="true">›</span></span></span>
        <span class="profile-card-summary">${escH(_statsSummary)}</span>
      </button>`)}
      ${_adminOnly(`<button class="profile-card profile-card--span2 profile-card--admin" data-subsheet="adminboard" type="button">
        <span class="profile-card-icon">🛠️</span>
        <span class="profile-card-label">회원 분석<span class="profile-card-admin-tag">관리자</span> <span class="profile-card-label-chevron" aria-hidden="true">›</span></span>
        <span class="profile-card-summary">이 회원의 페이지·이용·활동 보기</span>
      </button>`)}
    </div>`;

  const _refreshMeetingPreview = async () => {
    const preview = body.querySelector('[data-subsheet="meeting"] .profile-card-summary');
    if (!preview) return;
    const [freshVotes, freshGames] = await Promise.all([
      window.CottageDB?.getMeetingVotes?.(_upcomingStart, _upcomingEnd) || Promise.resolve([]),
      window.CottageDB?.getMeetingVoteGames?.(_upcomingStart, _upcomingEnd) || Promise.resolve([]),
    ]);
    if (panel.isConnected) preview.innerHTML = _renderMeetingPreview(freshVotes, freshGames);
  };
  panel._meetingPreviewRefresh = () => { _refreshMeetingPreview().catch(() => {}); };
  window.addEventListener('cottage-meeting-changed', panel._meetingPreviewRefresh);

  body.querySelector('.profile-panel-compact-close')?.addEventListener('click', _closePanel);
  const compactHeader = body.querySelector('.profile-panel-compact-header');
  const largeIdentity = body.querySelector('.profile-panel-profile-top');
  const mainClose = panel.querySelector('.profile-panel-main-close');
  if (compactHeader && largeIdentity) {
    const setCompactVisibility = visible => {
      compactHeader.classList.toggle('is-visible', visible);
      compactHeader.setAttribute('aria-hidden', visible ? 'false' : 'true');
      mainClose?.classList.toggle('is-hidden', visible);
      mainClose?.setAttribute('aria-hidden', visible ? 'true' : 'false');
    };
    if ('IntersectionObserver' in window) {
      panel._identityObserver = new IntersectionObserver(([entry]) => setCompactVisibility(entry.intersectionRatio < 1), {
        root: body,
        threshold: 1,
        rootMargin: '0px',
      });
      panel._identityObserver.observe(largeIdentity);
    } else {
      const syncCompactVisibility = () => setCompactVisibility(largeIdentity.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + 20);
      body.addEventListener('scroll', syncCompactVisibility, { passive: true });
      panel._identityObserver = { disconnect: () => body.removeEventListener('scroll', syncCompactVisibility) };
      syncCompactVisibility();
    }
  }

  // ── 서브시트 헬퍼 ──────────────────────────────────────────────
  // backTo: {label, onClick} — 지정하면 뒤로가기가 패널 메인이 아니라 그 자리(예: 알림
  // 목록)로 돌아간다. R10c 패턴(openOtherMeetingSheet의 backTo)을 _openSubSheet 자체에도
  // 들여온 것 — 지금까지는 서브시트에서 또 다른 서브시트를 열면(수집 보드 등) "온 곳"이
  // 사라지고 무조건 "{닉네임}의 {보드}"로만 돌아갔다(2026-08-02 사용자 지적 — 알림에서
  // 업적 클릭 → 수집 보드로 갔는데 뒤로가기가 알림이 아니라 내 보드였음).
  function _openSubSheet(title, contentHtml, afterRender, bodyClass = '', onLeave = null, backTo = null) {
    document.getElementById('profileSubSheet')?.remove();
    const sub = document.createElement('div');
    sub.id = 'profileSubSheet';
    sub.className = 'profile-subsheet' + (readOnly ? ' profile-subsheet--readonly' : '');
    const isBoardSubsheet = ['프로필 보드', '모임 보드', '기록 보드', '함께한 시간', '수집 보드'].includes(title);
    const backLabel = backTo?.label || (isBoardSubsheet ? '내 보드' : `${escH(user.nickname || (readOnly ? '회원' : '손님'))}의 ${_boardLabel}`);
    sub.innerHTML = `
      <div class="profile-subsheet-box">
        <div class="profile-subsheet-header profile-fixed-header">
          <button class="profile-subsheet-back profile-fixed-header-left" type="button">${isBoardSubsheet
            ? `<span class="profile-subsheet-back-identity"><span class="profile-subsheet-back-arrow">‹</span><span class="profile-subsheet-back-avatar">${_repIdentityHtml}</span><span class="profile-subsheet-back-name">${escH(user.nickname || (readOnly ? '회원' : '손님'))}</span></span>`
            : `‹ ${backLabel}`}</button>
          <span class="profile-subsheet-title">${title}</span>
          <button aria-label="닫기" class="profile-subsheet-close profile-fixed-header-close" type="button">✕</button>
        </div>
        <div class="profile-subsheet-body${bodyClass ? ' ' + bodyClass : ''}">${contentHtml}</div>
      </div>`;
    document.body.appendChild(sub);
    // 서브시트를 패널로 되돌릴 때(뒤로가기/백드롭) 현재 DOM 상태를 스냅샷 → 재진입 시 변경분 유지.
    // (✕닫기는 패널 자체를 제거해 다음 오픈 시 DB에서 새로 읽으므로 스냅샷 불필요)
    // onLeave가 조용히 실패하면 스냅샷이 누락돼 재진입 시 상태가 되돌아간다(개별 읽음이 이걸 의존) → 로그 필수
    const _returnToMain = () => {
      try { onLeave?.(sub.querySelector('.profile-subsheet-body')); } catch (e) { console.error('[_openSubSheet onLeave]', e); }
      sub.remove();
    };
    const _leaveToPanel = () => {
      _returnToMain();
      if (backTo?.onClick) backTo.onClick();
    };
    sub.querySelector('.profile-subsheet-back').addEventListener('click', _leaveToPanel);
    sub.querySelector('.profile-subsheet-close').addEventListener('click', _closePanel);
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
      // addNotifReadKeys를 먼저 큐에 넣어야 updateNotifSeenAt의 notice: 보존 로직이 이 키를 본다
      // (같은 유저 체인으로 직렬화되므로 호출 순서 = 실행 순서, _queueNotifWrite 참조).
      window.CottageDB?.addNotifReadKeys?.(String(user.id), ['notice:fee', 'notice:voucher']);
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
    // DB에도 남겨 기기·브라우저를 바꿔도 재노출되지 않게 한다(notif_seen_at과 같은 방식).
    const _noticeDbKey = sessKey === 'feeNoticeSeen' ? 'notice:fee' : sessKey === 'voucherNoticeSeen' ? 'notice:voucher' : null;
    if (_noticeDbKey) window.CottageDB?.addNotifReadKeys?.(String(user.id), [_noticeDbKey]);
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

  // 알림 서브시트 열기 — 카드 클릭과 "업적 클릭 → 수집 보드"의 backTo(뒤로가기) 양쪽에서
  // 똑같이 쓴다(2026-08-02). 하나로 뽑아두지 않으면 두 자리가 미묘하게 갈릴 위험이 있다(#15류).
  const _notifTitle = '최근 소식';
  function _openNotifSubsheet() {
    _trackPvOnce('my-board-notif');
    // onLeave 스냅샷: 개별 읽음은 DOM만 바꾸므로, 뒤로가기/백드롭으로 나갔다 다시 들어와도
    // 유지되려면 캐시 문자열을 현재 DOM으로 갱신해야 한다(기록보드와 같은 방식).
    // ✕닫기는 패널째 제거 → 다음 오픈 시 DB에서 새로 읽으므로 스냅샷 불필요.
    _openSubSheet(_notifTitle, _notifInnerHtml, subBody => _bindNotifSubsheet(subBody, { _markAllNotifSeen, _markOneNotifSeen, _markVoucherSeen, _markNoticeSeen, _getGameKeyByName, _getGameKeyById, _notifTitle, _openSubSheet, _growthInnerHtml, _afterGrowthRender, readOnly, _openNotifSubsheet }), '', bodyEl => { _notifInnerHtml = bodyEl.innerHTML; });
  }

  // ── 카드 클릭 → 서브시트 ─────────────────────────────────────
  body.querySelectorAll('.profile-card, .profile-panel-notif-btn, .profile-panel-voucher-btn').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.subsheet;

      if (type === 'notif') {
        _openNotifSubsheet();

      } else if (type === 'growth') {
        _trackPvOnce('my-board-growth');
        _openSubSheet('수집 보드', _growthInnerHtml, subBody => _afterGrowthRender(subBody, false, false, readOnly));

      } else if (type === 'voucher') {
        _trackPvOnce('my-board-voucher');
        _openSubSheet('음료교환권', _voucherInnerHtml, subBody => _bindVoucherSubsheet(subBody, { _bindVoucher }));

      } else if (type === 'taste') {
        _trackPvOnce('my-board-taste');
        // 진입 시 DB 재조회 → 모임보드에서 뭘 바꿨든 항상 최신(R10b). 스냅샷 임시방편 제거.
        _openSubSheet('프로필 보드', _SUBSHEET_LOADING_HTML, async subBody => {
          const d = await _refreshBoardData();
          if (!subBody.isConnected) return; // 재조회를 기다리는 사이 다른 서브시트로 떠남
          _syncTasteCard(); // 다른 기기·탭에서 바뀐 값도 카드에 반영(재조회한 값이 곧 진실)
          subBody.innerHTML = _buildTasteInnerHtml(d);
          _bindTasteSubsheet(subBody, {
            user, readOnly, panel, _emitLikesChanged, allBioSuggestions, _BIO_PREDEFINED, _ruleSet: _makeRuleSet(d),
            onBioSaved: (newBio) => { _boardData.bio = newBio; _syncTasteCard(); },
            hardestGames: d.hardestGames || [],
            resolveGameName: _profileGameName,
            onProfileDataSaved: patch => { Object.assign(_boardData, patch); _syncTasteCard(); },
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
        _openSubSheet('기록 보드', _recordInnerHtml, subBody => _bindRecordSubsheet(subBody, { _getGameKeyById, _allPhotoData, _PHOTO_SHOW, readOnly }), 'profile-subsheet-body--records', bodyEl => { _recordInnerHtml = bodyEl.innerHTML; }); // 뒤로가기 시 현재 상태 스냅샷(재진입 유지)


      } else if (type === 'usage') {
        _trackPvOnce('my-board-usage');
        _openSubSheet('함께한 시간', _usageInnerHtml, _bindUsageSubsheet);

      } else if (type === 'adminboard') {
        // 오너 전용(카드가 _adminOnly로만 렌더됨). _trackPvOnce 안 함 — 오너는 트래킹 제외라
        // 무의미하고, 새 가상 페이지 키는 page-labels.js 갱신을 요구한다(안 하면 slug 노출).
        _openSubSheet('회원 분석', _SUBSHEET_LOADING_HTML, async subBody => {
          await _renderAdminMemberBoard(subBody, String(user.id));
        });

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
            setTasteScrollTo: v => { _pendingTasteScrollTo = v; }, focusDate,
            backTo, // 상세팝업 뒤로가기 체인용(2026-08-09) — 이 패널 자신이 들어온 backTo를 그대로 물려준다
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
  if (self && String(self.id) === String(userId)) return openProfilePanel(null, opts);
  return openProfilePanel(null, { userId: String(userId), readOnly: true, ...opts });
}
window.openOtherProfileSheet = openOtherProfileSheet;

// 모임 보드의 일정·하고 싶은/배우고 싶은 게임 공용 범위 — 오늘부터 +180일.
function _upcomingRange() {
  // toISOString()은 UTC 변환이라 KST(UTC+9)에서 자정을 0시로 맞추면 하루 앞으로 밀린다
  // 로컬 자정을 기준으로 잡으므로 toISOString 대신 로컬 Y/M/D를 직접 포맷한다.
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setDate(end.getDate() + 180);
  return [fmt(today), fmt(end)];
}

function _buildMiniBarWeekHtml(myVotes, voteGames, userId, isOwner, focusDate = null) {
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
  // day-detail.js의 window.formatVoteHour와 로직은 같지만 의존하지 않고 이 파일 안에 둔다 —
  // kakao-auth.js는 day-detail.js를 안 불러오는 페이지(club.html·requests.html 등)에서도
  // 로드되므로, 전역에 기대면 그 페이지들에서 이 함수가 조용히 죽는다(크로스파일 갭).
  const _fmtVoteH = h => {
    const whole = Math.floor(h);
    return Math.round((h - whole) * 10) === 5 ? `${whole}시30분` : `${whole}시`;
  };
  const rows = myVotes.map(v => {
    const total = 18; // 9~27시(익일 새벽 3시까지 등록 가능, 2026-08-18)
    const left  = ((v.time_start - 9) / total * 100).toFixed(1);
    const width = ((v.time_end - v.time_start) / total * 100).toFixed(1);
    return `<div class="mb-week-entry${focusDate === v.vote_date ? ' is-focused' : ''}" data-date="${escH(v.vote_date)}" data-uid="${escH(String(userId))}" role="button" tabindex="0">
      <div class="mb-week-row">
        <span class="mb-week-date">${escH(fmtVD(v.vote_date))}</span>
        <div class="mb-mini-bar-wrap"><div class="mb-mini-bar-fill" style="left:${left}%;width:${width}%"></div></div>
        <span class="mb-week-time">${_fmtVoteH(v.time_start)}~${_fmtVoteH(v.time_end)}${_guestSuffix(v)}</span>
        <button class="mb-detail-btn" data-uid="${escH(String(userId))}" data-date="${escH(v.vote_date)}" type="button">자세히</button>
      </div>
    </div>`;
  }).join('');
  const bodyHtml = myVotes.length
    ? `<div class="mb-week-list">${rows}</div>`
    : '<p class="taste-game-empty">다가오는 일정이 없어요.</p>';
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
