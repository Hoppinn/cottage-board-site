const KAKAO_APP_KEY = 'a1121194b54290671b9c1521c6cfe392';
const KAKAO_REST_KEY = '0e496d427628f9f9b239b106cb5313fa';
const KAKAO_USER_KEY = 'kakao_user';

const OWNER_KAKAO_ID = '4916417947';

if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
  Kakao.init(KAKAO_APP_KEY);
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
        const profileKey = `cottage_profile_visited_${user.id}_${kstDate}`;
        if (!isLocal && !localStorage.getItem(profileKey)) {
          localStorage.setItem(profileKey, '1');
          const vcKey = `cottage_visit_count_${user.id}`;
          const newVisitCount = parseInt(localStorage.getItem(vcKey) || '0') + 1;
          localStorage.setItem(vcKey, String(newVisitCount));
          window.CottageDB.upsertProfile(String(user.id), user.nickname || '손님', user.kakaoNickname || null, newVisitCount).catch(() => {});
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
    const profileBtn = document.createElement('button');
    profileBtn.id = 'kakaoProfileBtn';
    profileBtn.type = 'button';
    profileBtn.textContent = '내 활동';
    userActions.insertBefore(profileBtn, userActions.firstChild);
    profileBtn.addEventListener('click', openProfilePanel);
  }
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
  const adminOrigin = window.location.origin;
  panel.innerHTML = `<div class="profile-panel-box">
    <div class="profile-panel-header">
      <span class="profile-panel-title">내 활동</span>
      <button class="profile-panel-close" type="button">✕</button>
    </div>
    <div class="profile-panel-body">
      <p class="profile-panel-nick">${String(user.nickname || '손님').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
      ${isOwnerUser ? `<a href="${adminOrigin}/pages/admin/requests-admin.html" class="profile-admin-link">🔧 관리자 페이지</a>` : ''}
      <p class="profile-panel-loading">불러오는 중...</p>
    </div>
  </div>`;
  document.body.appendChild(panel);
  panel.querySelector('.profile-panel-close').addEventListener('click', () => { panel.remove(); _restoreMenuExpanded(); });
  panel.addEventListener('click', e => { if (e.target === panel) { panel.remove(); _restoreMenuExpanded(); } });

  if (!window.CottageDB?.getMyStats) return;
  const stats = await window.CottageDB.getMyStats(String(user.id), user.nickname || null);
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

  const body = panel.querySelector('.profile-panel-body');
  body.innerHTML = `
    <p class="profile-panel-nick">${escH(user.nickname || '손님')}</p>
    <ul class="profile-panel-stats">
      <li><span>가입일</span><strong>${fmt(stats.profile?.first_seen_at)}</strong></li>
      <li><span>마지막 방문</span><strong>${fmt(stats.profile?.last_seen_at)}</strong></li>
      ${(() => {
        const localVc = parseInt(localStorage.getItem(`cottage_visit_count_${user.id}`) || '0');
        const dbVc = stats.profile?.visit_count || 0;
        const vc = Math.max(localVc, dbVc);
        return vc ? `<li><span>방문 일수</span><strong>${vc}일</strong></li>` : '';
      })()}
      ${(() => {
        const localSecs = parseInt(localStorage.getItem(`cottage_time_sec_${user.id}`) || '0');
        const sessionSecs = window._cottageSessionStart
          ? Math.floor((Date.now() - window._cottageSessionStart) / 1000)
          : 0;
        const todaySecs = localSecs + sessionSecs;
        const fmt = s => s >= 3600
          ? Math.floor(s/3600)+'시간 '+Math.floor((s%3600)/60)+'분'
          : s >= 60 ? Math.floor(s/60)+'분' : s+'초';
        return todaySecs > 0 ? `<li><span>오늘 이용시간</span><strong>${fmt(todaySecs)}</strong></li>` : '';
      })()}
      ${(() => {
        const savedSecs = stats.profile?.total_minutes || 0; // DB: 초 단위
        const localSecs = parseInt(localStorage.getItem(`cottage_time_sec_${user.id}`) || '0');
        const sessionSecs = window._cottageSessionStart
          ? Math.floor((Date.now() - window._cottageSessionStart) / 1000)
          : 0;
        const total = savedSecs + localSecs + sessionSecs;
        const fmt = s => s >= 3600
          ? Math.floor(s/3600)+'시간 '+Math.floor((s%3600)/60)+'분'
          : s >= 60 ? Math.floor(s/60)+'분' : s+'초';
        return `<li><span>총 이용시간</span><strong>${fmt(total)}</strong></li>`;
      })()}
      ${stats.plays.length ? `<li><span>플레이 기록</span><strong>${stats.plays.length}건</strong></li>` : ''}
      ${stats.moimCount ? `<li><span>모임 참여</span><strong>${stats.moimCount}회</strong></li>` : ''}
      ${stats.comments.length ? `<li><span>코멘트</span><strong>${stats.comments.length}건</strong></li>` : ''}
      ${stats.suggestions ? `<li><span>건의하기</span><strong>${stats.suggestions}건</strong></li>` : ''}
    </ul>
    ${stats.plays.length ? `<div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">🎲 플레이한 게임 <span class="profile-toggle-arrow">▾</span></button>
      ${playListHtml}
    </div>` : ''}
    ${stats.comments.length ? `<div class="profile-activity-group">
      <button class="profile-activity-toggle" type="button">💬 코멘트한 게임 <span class="profile-toggle-arrow">▾</span></button>
      ${commentListHtml}
    </div>` : ''}`;

  body.querySelectorAll('.profile-activity-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.nextElementSibling;
      const arrow = btn.querySelector('.profile-toggle-arrow');
      const collapsed = list.classList.toggle('is-collapsed');
      arrow.textContent = collapsed ? '▾' : '▴';
    });
  });

  body.querySelectorAll('.profile-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.profile-activity-list').querySelector('.profile-more-wrap');
      const isHidden = wrap.classList.toggle('is-hidden');
      btn.textContent = isHidden
        ? `더 보기 (${wrap.querySelectorAll('li').length}건 더)`
        : '접기';
    });
  });
}

document.addEventListener('DOMContentLoaded', initKakaoAuth);
