const KAKAO_APP_KEY = 'a1121194b54290671b9c1521c6cfe392';
const KAKAO_REST_KEY = '0e496d427628f9f9b239b106cb5313fa';
const KAKAO_USER_KEY = 'kakao_user';

const OWNER_KAKAO_ID = '4916417947';

if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
  Kakao.init(KAKAO_APP_KEY);
}

function initKakaoAuth() {
  const saved = localStorage.getItem(KAKAO_USER_KEY);
  if (saved) {
    try {
      updateLoginUI(JSON.parse(saved));
    } catch (e) {
      localStorage.removeItem(KAKAO_USER_KEY);
    }
  }

  const btn = document.getElementById('kakaoLoginBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!getKakaoUser()) kakaoLogin();
    });
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
  }

  modal.querySelector('#photoFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => applyAndClose(ev.target.result);
    reader.readAsDataURL(file);
  });

  modal.querySelectorAll('.photo-preset-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => applyAndClose(presets[i]));
  });

  const resetBtn = modal.querySelector('.photo-kakao-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => applyAndClose(user.kakaoProfileImage || ''));
  }

  modal.querySelector('.photo-picker-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function promptNicknameChange() {
  const user = getKakaoUser();
  if (!user) return;
  const newNick = window.prompt('사용할 닉네임을 입력하세요 (2~10자)', user.nickname);
  if (newNick === null) return;
  const trimmed = newNick.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 10) {
    alert('닉네임은 2~10자로 입력해주세요.');
    return;
  }
  user.nickname = trimmed;
  localStorage.setItem(`cottage_custom_nick_${user.id}`, trimmed);
  localStorage.setItem(KAKAO_USER_KEY, JSON.stringify(user));
  updateLoginUI(user);
}

function getKakaoUser() {
  const saved = localStorage.getItem(KAKAO_USER_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
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
        profileImg.src = user.profileImage;
        profileImg.style.display = 'inline-block';
      } else {
        profileImg.style.display = 'none';
      }
    }
    if (loginText) loginText.textContent = user.nickname;
    if (userActions) userActions.style.display = 'flex';
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

document.addEventListener('DOMContentLoaded', initKakaoAuth);
