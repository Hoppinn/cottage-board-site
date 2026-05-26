const KAKAO_APP_KEY = 'a1121194b54290671b9c1521c6cfe392';
const KAKAO_USER_KEY = 'kakao_user';

// ── 관리자 카카오 ID ────────────────────────────────────────
// 로그인 후 브라우저 콘솔에서 getKakaoUser().id 를 입력해서 확인한 뒤 아래에 넣으세요
const OWNER_KAKAO_ID = '';

function initKakaoAuth() {
  if (typeof Kakao === 'undefined') return;

  if (!Kakao.isInitialized()) {
    Kakao.init(KAKAO_APP_KEY);
  }

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
  Kakao.Auth.login({
    success: function () {
      Kakao.API.request({
        url: '/v2/user/me',
        success: function (res) {
          const profile = res.kakao_account?.profile || {};
          const user = {
            id: String(res.id),
            nickname: profile.nickname || '손님',
            profileImage: profile.profile_image_url || '',
          };
          localStorage.setItem(KAKAO_USER_KEY, JSON.stringify(user));
          updateLoginUI(user);
        },
        fail: function (err) {
          console.error('kakao user info error', err);
        },
      });
    },
    fail: function (err) {
      console.error('kakao login error', err);
    },
  });
}

function kakaoLogout() {
  if (Kakao.Auth.getAccessToken()) {
    Kakao.Auth.logout(function () {
      localStorage.removeItem(KAKAO_USER_KEY);
      updateLoginUI(null);
    });
  } else {
    localStorage.removeItem(KAKAO_USER_KEY);
    updateLoginUI(null);
  }
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

  // 로그인 상태 변경을 페이지에 알림
  window.dispatchEvent(new CustomEvent('cottage-auth-changed', { detail: { user } }));
}

if (typeof window !== 'undefined') {
  window.getKakaoUser = getKakaoUser;
  window.kakaoLogin = kakaoLogin;
  window.kakaoLogout = kakaoLogout;

  // 현재 로그인 유저가 관리자(소유자)인지 확인
  window.isOwner = function() {
    if (!OWNER_KAKAO_ID) return false;
    const user = getKakaoUser();
    return !!user && String(user.id) === String(OWNER_KAKAO_ID);
  };
}

document.addEventListener('DOMContentLoaded', initKakaoAuth);
