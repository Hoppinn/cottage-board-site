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
  const notifs = await window.CottageDB.getMyNotifications(String(user.id), user.nickname || null, sess.notifSeenAt || null);
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

function _restoreMenuExpanded() {
  setTimeout(() => {
    const menu = document.getElementById('mobileMenu');
    const loginBtn = document.getElementById('kakaoLoginBtn');
    const userActions = document.getElementById('kakaoUserActions');
    if (menu) menu.classList.add('active');
    if (loginBtn) loginBtn.classList.add('is-expanded');
    if (userActions) userActions.style.display = 'flex';
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
      }
    } catch (e) {
      localStorage.removeItem(KAKAO_USER_KEY);
    }
  }

  const btn = document.getElementById('kakaoLoginBtn');
  if (btn) {
    const isHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const loginArea = btn.closest('.menu-login-area') || btn.parentElement;
    if (isHover && loginArea) {
      // PC: 마우스 올리면 열고 벗어나면 닫힘
      // 딜레이 필요: dropdown이 header 아래 absolute 위치라 gap 통과 시 mouseleave 발화
      let _hideTimer = null;
      const _showActions = () => {
        clearTimeout(_hideTimer);
        if (!getKakaoUser()) return;
        const actions = document.getElementById('kakaoUserActions');
        if (!actions) return;
        btn.classList.add('is-expanded');
        actions.style.display = 'flex';
      };
      const _scheduleHide = () => {
        _hideTimer = setTimeout(() => {
          const actions = document.getElementById('kakaoUserActions');
          if (actions) actions.style.display = 'none';
          btn.classList.remove('is-expanded');
        }, 200);
      };
      loginArea.addEventListener('mouseenter', _showActions);
      loginArea.addEventListener('mouseleave', _scheduleHide);
      const actEl = document.getElementById('kakaoUserActions');
      if (actEl) {
        actEl.addEventListener('mouseenter', () => clearTimeout(_hideTimer));
        actEl.addEventListener('mouseleave', _scheduleHide);
      }
      btn.addEventListener('click', () => { if (!getKakaoUser()) kakaoLogin(); });
    } else {
      btn.addEventListener('click', () => {
        if (!getKakaoUser()) {
          kakaoLogin();
        } else {
          const actions = document.getElementById('kakaoUserActions');
          if (!actions) return;
          const opening = !btn.classList.contains('is-expanded');
          btn.classList.toggle('is-expanded', opening);
          actions.style.display = opening ? 'flex' : 'none';
        }
      });
    }
  }

  const nicknameBtn = document.getElementById('kakaoNicknameBtn');
  if (nicknameBtn) {
    nicknameBtn.addEventListener('click', promptNicknameChange);
  }

  const photoBtn = document.getElementById('kakaoPhotoBtn');
  if (photoBtn) {
    photoBtn.addEventListener('click', promptProfileImageChange);
  }

  const logoutBtn = document.getElementById('kakaoLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', kakaoLogout);
  }

  const userActions = document.getElementById('kakaoUserActions');
  if (userActions && !document.getElementById('kakaoProfileBtn')) {
    const _u = getKakaoUser();

    // 내 보드 버튼
    const profileBtn = document.createElement('button');
    profileBtn.id = 'kakaoProfileBtn';
    profileBtn.type = 'button';
    profileBtn.textContent = '내 보드';
    userActions.insertBefore(profileBtn, userActions.firstChild);
    profileBtn.addEventListener('click', openProfilePanel);

    // 구분선 (내 활동 / 설정)
    const div1 = document.createElement('div');
    div1.className = 'menu-divider';
    userActions.insertBefore(div1, profileBtn.nextSibling);

    // 사진·닉네임 버튼 보조 스타일
    userActions.querySelector('#kakaoPhotoBtn')?.classList.add('menu-settings-item');
    userActions.querySelector('#kakaoNicknameBtn')?.classList.add('menu-settings-item');

    // 구분선 (설정 / 로그아웃)
    const logoutBtn = userActions.querySelector('#kakaoLogoutBtn');
    if (logoutBtn) {
      const div2 = document.createElement('div');
      div2.className = 'menu-divider';
      userActions.insertBefore(div2, logoutBtn);
    }
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

function genPresetAvatar(emoji, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 34);
  return canvas.toDataURL();
}

const PRESET_AVATAR_CONFIGS = [
  { emoji: '🎲', bg: '#F0A820' },
  { emoji: '🃏', bg: '#5B7ED7' },
  { emoji: '♟️', bg: '#5A8A4A' },
  { emoji: '🎯', bg: '#D04040' },
  { emoji: '🌲', bg: '#4A7D5A' },
  { emoji: '🏡', bg: '#8B6B4A' },
  { emoji: '🦊', bg: '#E8813A' },
  { emoji: '🐻', bg: '#9B7B5A' },
  { emoji: '🐱', bg: '#E8C55A' },
  { emoji: '🐸', bg: '#5DB85D' },
  { emoji: '🦝', bg: '#8888AA' },
  { emoji: '🐧', bg: '#5599CC' },
  { emoji: '🌙', bg: '#5C4A8A' },
  { emoji: '⭐', bg: '#D4A820' },
  { emoji: '🌈', bg: '#6AAED6' },
  { emoji: '🍀', bg: '#4A9A5A' },
  { emoji: '🎮', bg: '#4455AA' },
  { emoji: '🏆', bg: '#C8952A' },
  { emoji: '🎨', bg: '#CC5577' },
  { emoji: '🔮', bg: '#7755BB' },
];

function promptProfileImageChange() {
  const user = getKakaoUser();
  if (!user) return;

  const presets = PRESET_AVATAR_CONFIGS.map(c => genPresetAvatar(c.emoji, c.bg));

  const modal = document.createElement('div');
  modal.className = 'photo-picker-modal';
  modal.innerHTML = `
    <div class="photo-picker-panel">
      <p class="photo-picker-title">프로필 사진 변경</p>
      <div class="photo-picker-presets">
        ${presets.map((url, i) => `<button class="photo-preset-btn" data-idx="${i}" type="button"><img src="${url}" alt="프리셋 ${i + 1}"></button>`).join('')}
      </div>
      <label class="photo-upload-btn">
        📁 내 사진 업로드
        <input type="file" accept="image/*" style="display:none" id="photoFileInput">
      </label>
      ${user.kakaoProfileImage ? `<button class="photo-kakao-reset-btn" type="button">카카오 사진으로 돌아가기</button>` : ''}
      <button class="photo-picker-close" type="button">취소</button>
    </div>
  `;
  document.body.appendChild(modal);

  function applyAndClose(imgSrc) {
    user.profileImage = imgSrc;
    localStorage.setItem(`cottage_custom_photo_${user.id}`, imgSrc);
    localStorage.setItem(KAKAO_USER_KEY, JSON.stringify(user));
    updateLoginUI(user);
    modal.remove();
    _restoreMenuExpanded();
    if (window.CottageDB?.updateProfilePhoto) {
      window.CottageDB.updateProfilePhoto(String(user.id), imgSrc)
        .then(() => console.log('[프로필사진] DB 저장 성공'))
        .catch(e => console.warn('[프로필사진] DB 저장 실패', e));
    } else {
      console.warn('[프로필사진] CottageDB.updateProfilePhoto 없음 — localStorage만 저장됨');
    }
  }

  modal.querySelector('#photoFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => applyAndClose(ev.target.result);
    reader.readAsDataURL(file);
  });

  modal.querySelectorAll('.photo-preset-btn').forEach((btn, i) => {
    btn.addEventListener('click', e => { e.stopPropagation(); applyAndClose(presets[i]); });
  });

  const resetBtn = modal.querySelector('.photo-kakao-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', e => { e.stopPropagation(); applyAndClose(user.kakaoProfileImage || ''); });
  }

  modal.querySelector('.photo-picker-close').addEventListener('click', () => { modal.remove(); _restoreMenuExpanded(); });
  modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); _restoreMenuExpanded(); } });
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
  // 동기적으로 즉시 복원 (setTimeout 의존 제거)
  const _ua = document.getElementById('kakaoUserActions');
  const _lb = document.getElementById('kakaoLoginBtn');
  const _mm = document.getElementById('mobileMenu');
  if (_ua) _ua.style.display = 'flex';
  if (_lb) _lb.classList.add('is-expanded');
  if (_mm) _mm.classList.add('active');
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

  if (user) {
    btn.classList.add('is-logged-in');
    if (profileImg) {
      if (user.profileImage) {
        profileImg.src = user.profileImage.replace(/^http:\/\//, 'https://');
        profileImg.style.display = 'inline-block';
      } else {
        profileImg.style.display = 'none';
      }
    }
    if (loginText) loginText.textContent = user.nickname;
    if (userActions) {
      userActions.style.display = 'none';
      if (String(user.id) === String(OWNER_KAKAO_ID) && !userActions.querySelector('#kakaoAdminBtn')) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'kakaoAdminBtn';
        adminBtn.type = 'button';
        adminBtn.textContent = '🔧 관리자';
        adminBtn.addEventListener('click', () => {
          window.location.href = window.location.origin + '/pages/admin/requests-admin.html';
        });
        userActions.appendChild(adminBtn);
      }
    }
  } else {
    btn.classList.remove('is-logged-in');
    if (profileImg) profileImg.style.display = 'none';
    if (loginText) loginText.textContent = '카카오 로그인';
    if (userActions) userActions.style.display = 'none';
  }

  window.dispatchEvent(new CustomEvent('cottage-auth-changed', { detail: { user } }));
}

if (typeof window !== 'undefined') {
  window.getKakaoUser = getKakaoUser;
  window.kakaoLogin = kakaoLogin;
  window.kakaoLogout = kakaoLogout;
  window.promptNicknameChange = promptNicknameChange;
  window.promptProfileImageChange = promptProfileImageChange;

  window.isOwner = function () {
    if (!OWNER_KAKAO_ID) return false;
    const user = getKakaoUser();
    return !!user && String(user.id) === String(OWNER_KAKAO_ID);
  };
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
      <p class="profile-panel-nick">${String(user.nickname || '손님').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
      ${isOwnerUser ? `<a href="${adminOrigin}/pages/admin/requests-admin.html" class="profile-admin-link">🔧 관리자 페이지</a>` : ''}
      <p class="profile-panel-loading">불러오는 중...</p>
    </div>
  </div>`;
  document.body.appendChild(panel);
  panel.querySelector('.profile-panel-close').addEventListener('click', () => { document.getElementById('profileSubSheet')?.remove(); panel.remove(); _restoreMenuExpanded(); });
  panel.addEventListener('click', e => { if (e.target === panel) { document.getElementById('profileSubSheet')?.remove(); panel.remove(); _restoreMenuExpanded(); } });

  if (!window.CottageDB?.getMyStats) return;
  const _sessForNotif = window._cottageSess?.get(String(user.id)) || {};
  const [stats, notifs, codexHtml, charHtml, achHtml, voucherBalance, voucherProducts, voucherHistory] = await Promise.all([
    window.CottageDB.getMyStats(String(user.id), user.nickname || null),
    window.CottageDB.getMyNotifications?.(String(user.id), user.nickname || null, _sessForNotif.notifSeenAt || null) || Promise.resolve([]),
    (window.CottageAchievements?.buildCodexSection(String(user.id)) || Promise.resolve('')).catch(() => ''),
    (window.CottageAchievements?.buildCharacterSection(String(user.id)) || Promise.resolve('')).catch(() => ''),
    (window.CottageAchievements?.buildAchievementsSection(String(user.id)) || Promise.resolve('')).catch(() => ''),
    (window.CottageDB?.getVoucherBalance?.(String(user.id)) || Promise.resolve(0)).catch(() => 0),
    (window.CottageDB?.getVoucherProducts?.() || Promise.resolve([])).catch(() => []),
    (window.CottageDB?.getVoucherHistory?.(String(user.id), 5) || Promise.resolve([])).catch(() => []),
  ]);
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

  const playListHtml = buildActivityList(stats.plays, r => {
    const date = r.played_at || (r.created_at||'').slice(0,10);
    return `<li>${escH(getGameName(r.game_id))} <span>${fmtShort(date)}</span></li>`;
  });

  const commentListHtml = buildActivityList(stats.comments, r =>
    `<li>${escH(getGameName(r.game_id))} <span>${fmtShort(r.created_at)}</span></li>`
  );

  const voucherSeen = !!_sessForNotif.voucherNoticeSeen;
  const VOUCHER_NOTICE_DATE = '2026-06-16'; // 공지 생성일 고정 (캠페인 공지)
  const _voucherDateLabel = fmtShort(VOUCHER_NOTICE_DATE);
  // seen 여부와 무관하게 항상 표시. seen이면 읽음 스타일(NEW 배지·확인 버튼 없음).
  const voucherItemHtml = `<li class="profile-notif-voucher${voucherSeen ? ' is-seen' : ' is-new'}">
    ${voucherSeen ? '' : '<span class="profile-notif-new-badge">NEW</span>'}
    <div class="profile-voucher-body">
      <strong>🎫 첫 게임평을 남기면 음료교환권 1장을 받을 수 있어요</strong>
      <div class="profile-voucher-btns">
        ${voucherSeen ? '' : '<button class="profile-voucher-confirm" type="button">확인했어요</button>'}
        <a class="profile-voucher-link${voucherSeen ? ' is-seen' : ''}" href="/pages/game/game-reviews.html">게임 기록하기</a>
      </div>
    </div>
    <span class="profile-notif-voucher-date">${escH(_voucherDateLabel)}</span>
  </li>`;
  const _newCount = notifs.filter(n => n.isNew).length + (!voucherSeen ? 1 : 0);
  const _notifItems = notifs.slice(0, 5).map(n => {
    const cls = n.isNew ? ' class="is-new"' : '';
    const badge = n.isNew ? '<span class="profile-notif-new-badge">NEW</span> ' : '';
    if (n.type === 'tagged')
      return `<li${cls}>${badge}🎲 <strong>${escH(getGameName(n.gameId))}</strong> 기록 태그됨 <span>${fmtShort(n.date)}</span></li>`;
    if (n.type === 'curious_comment')
      return `<li${cls}>${badge}🤔 <strong>${escH(getGameName(n.gameKey))}</strong> 새 코멘트 <span>${fmtShort(n.date)}</span></li>`;
    if (n.type === 'purchased')
      return `<li${cls}>${badge}🛒 <strong>${escH(n.gameName)}</strong> 추가됐어요 <span>${fmtShort(n.date)}</span></li>`;
    return '';
  }).join('');
  const _notifMore = notifs.length > 5 ? `<li class="profile-notif-more">외 ${notifs.length - 5}건 더</li>` : '';
  const _notifConfirmBtn = _newCount > 0 ? `<li class="profile-notif-confirm-row"><button class="profile-notif-confirm-all" type="button">모두 확인</button></li>` : '';
  const _notifInnerHtml = `<ul class="profile-notif-list">${voucherItemHtml}${_notifItems}${_notifMore}${_notifConfirmBtn}</ul>`;

  function _buildVoucherInner(bal, prods, hist) {
    const fmtDt = iso => {
      const d = new Date(iso);
      return `${d.getMonth()+1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    // 상품명 → 이모지 (상품명 변경 시 여기도 함께 수정)
    const VOUCHER_EMOJI = { '물 2병': '🥤', '홈런볼': '🍫', '캔커피': '☕' };
    const productHtml = prods.map(p => {
      const dis = bal < p.cost ? ' disabled' : '';
      const emoji = VOUCHER_EMOJI[p.name] || '';
      return `<li class="profile-voucher-product"><span class="profile-voucher-pname">${emoji} ${escH(p.name)}</span><span class="profile-voucher-pcost"> · ${p.cost}장</span><button class="profile-voucher-use-btn" data-product-id="${p.id}" data-product-name="${escH(p.name)}" data-cost="${p.cost}"${dis} type="button">사용하기</button></li>`;
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
    return `<div class="profile-voucher-balance">보유 <strong>${bal}장</strong></div>${prods.length ? `<ul class="profile-voucher-product-list">${productHtml}</ul><p class="profile-voucher-note">냉장고에서 직접 꺼내주세요 🧊</p>` : ''}${histHtml ? `<ul class="profile-voucher-hist-list">${histHtml}</ul>` : ''}${devBtnHtml}`;
  }
  const voucherHtml = `<div class="profile-voucher-section"><button class="profile-voucher-toggle" type="button"><span class="profile-voucher-header">🎫 음료교환권 <span class="profile-voucher-bal-label">${voucherBalance}장 보유</span></span><span class="profile-toggle-arrow">▾</span></button><div id="profileVoucherInner" class="is-collapsed">${_buildVoucherInner(voucherBalance, voucherProducts, voucherHistory)}</div></div>`;

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
  const _charCount   = _safeInt(charHtml,  /data-char-count="(\d+)"/,   0);
  const _codexPlayed = _safeInt(codexHtml, /data-played-count="(\d+)"/, 0);
  const _codexTotal  = _safeInt(codexHtml, /data-total-games="(\d+)"/,  641);
  const _achCount    = _safeInt(achHtml,   /data-ach-count="(\d+)"/,    0);

  const _growthSummary = `캐릭터 ${_charCount}/17 · 도감 ${_codexPlayed}/${_codexTotal} · 업적 ${_achCount}/17`;

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

  // ── 성장 보드 / 이용·혜택 서브시트 콘텐츠 ───────────────────
  const _growthInnerHtml = `${charHtml}${codexHtml}${achHtml}`;
  const _activityInnerHtml = `
    ${voucherHtml}
    <div class="profile-stats-wrap">
      <button class="profile-stats-toggle" type="button">📊 ${escH(_statsSummary)}<span class="profile-toggle-arrow">▾</span></button>
      <ul class="profile-panel-stats is-collapsed">${_statsListHtml}</ul>
    </div>
    ${stats.plays.length ? `<div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">🎲 플레이한 게임 <span class="profile-activity-count">${stats.plays.length}건</span><span class="profile-toggle-arrow">▾</span></button>
      ${playListHtml}
    </div>` : ''}
    ${stats.comments.length ? `<div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">💬 코멘트한 게임 <span class="profile-activity-count">${stats.comments.length}건</span><span class="profile-toggle-arrow">▾</span></button>
      ${commentListHtml}
    </div>` : ''}`;

  // ── 메인 패널: 카드 3개 ──────────────────────────────────────
  body.innerHTML = `
    <p class="profile-panel-nick">${escH(user.nickname || '손님')}</p>
    ${isOwnerUser ? `<a href="${adminOrigin}/pages/admin/requests-admin.html" class="profile-admin-link">🔧 관리자 페이지</a>` : ''}
    <button class="profile-card${_newCount > 0 ? ' has-badge' : ''}" data-subsheet="notif" type="button">
      <span class="profile-card-icon">🔔</span>
      <div class="profile-card-content">
        <span class="profile-card-label">최근 알림</span>
        <span class="profile-card-summary">${_newCount > 0 ? `새 알림 ${_newCount}건` : '최근 알림'}</span>
      </div>
      <span class="profile-card-arrow">›</span>
    </button>
    <button class="profile-card" data-subsheet="growth" type="button">
      <span class="profile-card-icon">🌱</span>
      <div class="profile-card-content">
        <span class="profile-card-label">성장 보드</span>
        <span class="profile-card-summary">${escH(_growthSummary)}</span>
      </div>
      <span class="profile-card-arrow">›</span>
    </button>
    <button class="profile-card" data-subsheet="activity" type="button">
      <span class="profile-card-icon">📋</span>
      <div class="profile-card-content">
        <span class="profile-card-label">이용·혜택</span>
        <span class="profile-card-summary">${escH(_actSummary)}</span>
      </div>
      <span class="profile-card-arrow">›</span>
    </button>`;

  // ── 서브시트 헬퍼 ─────────────────────────────────────────────
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

  // ── _markVoucherSeen (컨테이너 파라미터, 기본값 = body) ──────
  function _markVoucherSeen(container = body) {
    if (window._cottageSess) {
      const _s = window._cottageSess.get(String(user.id));
      _s.voucherNoticeSeen = true;
      window._cottageSess.set(String(user.id), _s);
    }
    document.getElementById('kakaoLoginBtn')?.querySelector('.notif-badge')?.remove();
    body.querySelector('.profile-card[data-subsheet="notif"]')?.classList.remove('has-badge');
    const voucherItem = container.querySelector('.profile-notif-voucher');
    if (voucherItem) {
      voucherItem.classList.remove('is-new');
      voucherItem.querySelector('.profile-notif-new-badge')?.remove();
      voucherItem.querySelector('.profile-voucher-confirm')?.remove();
    }
    const remaining = container.querySelectorAll('.profile-notif-list .is-new').length;
    if (remaining === 0) body.querySelector('.profile-card[data-subsheet="notif"]')?.classList.remove('has-badge');
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
          if (inner) { inner.innerHTML = _buildVoucherInner(nb, np, nh); _bindVoucher(container); }
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
          if (inner) { inner.innerHTML = _buildVoucherInner(nb, np, nh); _bindVoucher(container); }
        } else {
          devBtn.disabled = false;
          console.error('[DEV] grantDevVoucher 실패 — DB CHECK 제약 또는 네트워크 오류. voucher_log.reason에 dev_test 허용 여부 확인.');
          alert('[DEV] 교환권 지급 실패. 콘솔 확인.');
        }
      });
    }
  }

  // ── 카드 클릭 → 서브시트 ─────────────────────────────────────
  body.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.subsheet;

      if (type === 'notif') {
        _openSubSheet('최근 알림', _notifInnerHtml, subBody => {
          subBody.querySelector('.profile-notif-confirm-all')?.addEventListener('click', function() {
            if (window._cottageSess) {
              const _s = window._cottageSess.get(String(user.id));
              _s.notifSeenAt = new Date().toISOString();
              _s.voucherNoticeSeen = true;
              window._cottageSess.set(String(user.id), _s);
            }
            document.getElementById('kakaoLoginBtn')?.querySelector('.notif-badge')?.remove();
            body.querySelector('.profile-card[data-subsheet="notif"]')?.classList.remove('has-badge');
            const list = subBody.querySelector('.profile-notif-list');
            list?.querySelectorAll('.is-new').forEach(el => {
              el.classList.remove('is-new');
              el.querySelectorAll('.profile-notif-new-badge').forEach(b => b.remove());
              el.querySelector('.profile-voucher-confirm')?.remove();
            });
            this.closest('.profile-notif-confirm-row')?.remove();
          });
          subBody.querySelector('.profile-voucher-confirm')?.addEventListener('click', () => _markVoucherSeen(subBody));
          subBody.querySelector('.profile-voucher-link')?.addEventListener('click', () => _markVoucherSeen(subBody));
        });

      } else if (type === 'growth') {
        _openSubSheet('성장 보드', _growthInnerHtml, subBody => {
          subBody.querySelectorAll('.profile-rep-select').forEach(sel => {
            sel.addEventListener('change', () => window.CottageAchievements?.handleRepSelect(sel));
          });
          const charToggleBtn = subBody.querySelector('.profile-char-toggle-btn');
          if (charToggleBtn) {
            charToggleBtn.addEventListener('click', () => {
              const charBody = subBody.querySelector('.profile-char-body');
              const hidden = charBody.classList.toggle('is-hidden');
              charToggleBtn.textContent = hidden ? '전체 보기 ▾' : '접기 ▴';
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
              achToggleBtn.textContent = hidden ? '전체 보기 ▾' : '접기 ▴';
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
              const wrap = btn.closest('.profile-activity-list').querySelector('.profile-more-wrap');
              const isHidden = wrap.classList.toggle('is-hidden');
              btn.textContent = isHidden
                ? `더 보기 (${wrap.querySelectorAll('li').length}건 더)`
                : '접기';
            });
          });
        }); // end growth afterRender

      } else if (type === 'activity') {
        _openSubSheet('이용·혜택', _activityInnerHtml, subBody => {
          subBody.querySelector('.profile-voucher-toggle')?.addEventListener('click', function() {
            const inner = subBody.querySelector('#profileVoucherInner');
            const arrow = this.querySelector('.profile-toggle-arrow');
            const collapsed = inner.classList.toggle('is-collapsed');
            arrow.textContent = collapsed ? '▾' : '▴';
          });
          subBody.querySelector('.profile-stats-toggle')?.addEventListener('click', function() {
            const list = subBody.querySelector('.profile-panel-stats');
            const arrow = this.querySelector('.profile-toggle-arrow');
            const collapsed = list.classList.toggle('is-collapsed');
            arrow.textContent = collapsed ? '▾' : '▴';
          });
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
          _bindVoucher(subBody);
        }); // end activity afterRender
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initKakaoAuth);
