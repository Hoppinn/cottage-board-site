const KAKAO_APP_KEY = 'e0f056bc67d4a032e7a612c2e4ff2b71';
const KAKAO_REST_KEY = '0e496d427628f9f9b239b106cb5313fa';
const KAKAO_USER_KEY = 'kakao_user';

const OWNER_KAKAO_ID = '';

// SDK 즉시 초기화 (채널 버튼이 DOMContentLoaded 전에 사용할 수 있도록)
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
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (getKakaoUser()) {
      if (confirm(getKakaoUser().nickname + '님, 로그아웃할까요?')) {
        kakaoLogout();
      }
    } else {
      kakaoLogin();
    }
  });
}

function kakaoLogin() {
  sessionStorage.setItem('kakao_login_return', window.location.href);
  const callbackUrl = window.location.origin + '/auth-callback.html';
  window.location.href =
    'https://kauth.kakao.com/oauth/authorize' +
    '?response_type=token' +
    '&client_id=' + KAKAO_REST_KEY +
    '&redirect_uri=' + encodeURIComponent(callbackUrl) +
    '&scope=profile_nickname%2Cprofile_image';
}

function kakaoLogout() {
  localStorage.removeItem(KAKAO_USER_KEY);
  updateLoginUI(null);
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
  } else {
    btn.classList.remove('is-logged-in');
    if (profileImg) profileImg.style.display = 'none';
    if (loginText) loginText.textContent = '로그인';
  }

  window.dispatchEvent(new CustomEvent('cottage-auth-changed', { detail: { user } }));
}

if (typeof window !== 'undefined') {
  window.getKakaoUser = getKakaoUser;
  window.kakaoLogin = kakaoLogin;
  window.kakaoLogout = kakaoLogout;

  window.isOwner = function () {
    if (!OWNER_KAKAO_ID) return false;
    const user = getKakaoUser();
    return !!user && String(user.id) === String(OWNER_KAKAO_ID);
  };
}

document.addEventListener('DOMContentLoaded', initKakaoAuth);
