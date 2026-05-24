# 코티지보드 홈페이지 TODO
기준: 2026-05-24

---

## 확정된 전체 구조

### 메뉴
```
게임 찾기 ▼
  ㄴ 추천 게임 찾기 → index.html
  ㄴ 전체 게임 보기 → pages/owned-games.html
  ㄴ 게임 위치 → pages/store/game-location.html
코티지보드 안내 ▼
  ㄴ 소개 → pages/cottage/about.html (오시는 길/게임위치 개념 짧게 언급)
  ㄴ 가격 & 규칙 → pages/store/price-rules.html
  ㄴ 동호회 → pages/cottage/club.html
요청하기 → pages/store/requests.html (Supabase 연동)
```

### 헤더
- 카카오 간편로그인 버튼
- 로그인 후 프로필 아이콘 → 마이페이지 (내가 평점 남긴 게임 목록)

### 푸터 (C안 - 텍스트)
```
인스타그램
경기도 용인시 처인구 명지로 60번길 39-21 1층  지도 보기 →  (네이버플레이스 연결)
050-71371-6949  문의하기 →  (카카오 비즈채널 연결)
© 2026 Cottage Board. All Rights Reserved.
```

---

## 즉시 처리 (메뉴 구조 변경)

```
모든 HTML 파일 읽고 아래 메뉴 구조로 변경해줘.

게임 찾기 (그룹 헤더, 클릭 불가)
  ㄴ 추천 게임 찾기 → index.html
  ㄴ 전체 게임 보기 → pages/owned-games.html
  ㄴ 게임 위치 → pages/store/game-location.html
코티지보드 안내 (그룹 헤더, 클릭 불가)
  ㄴ 소개 → pages/cottage/about.html
  ㄴ 가격 & 규칙 → pages/store/price-rules.html
  ㄴ 동호회 → pages/cottage/club.html
요청하기 → pages/store/requests.html (새 파일 생성, 플레이스홀더)

기존 contact.html → 삭제 또는 requests.html로 대체
pages/store/map.html → 삭제
```

---

## 즉시 처리 (푸터 변경)

```
모든 HTML 파일 푸터 수정해줘.
1. 전화번호 → 050-71371-6949 (tel: 링크)
2. 레이아웃:
   인스타그램 (링크: https://www.instagram.com/cottageboard)
   경기도 용인시 처인구 명지로 60번길 39-21 1층  지도 보기 → (링크: https://naver.me/FRLnf1up)
   050-71371-6949  문의하기 → (카카오 비즈채널 링크: 추후 추가)
   © 2026 Cottage Board. All Rights Reserved.
3. 기존 아이콘 방식 → 텍스트 링크 방식으로 전환
```

---

## 페이지 콘텐츠 작업

| 파일 | 상태 | 비고 |
|------|------|------|
| `pages/cottage/about.html` | 플레이스홀더 | 공간 소개 + 오시는 길 짧게 + 게임위치 개념 언급 |
| `pages/store/price-rules.html` | 플레이스홀더 | 가격, 규칙 |
| `pages/cottage/club.html` | 플레이스홀더 | 동호회 소개, 가입 안내 |
| `pages/store/game-location.html` | 플레이스홀더 | 책장 구역 안내 (A~F), 구역 클릭 시 전체게임보기 필터 연동 |
| `pages/store/requests.html` | 미생성 | Supabase 연동 필요 |

---

## Supabase 세팅

```
Supabase 무료 계정 프로젝트 세팅해줘. 프로젝트명: cottageboard
아래 테이블 생성하고 RLS 설정까지 해줘. 바로 작업하지 말고 계획 먼저.

테이블:
1. page_view_counts - 방문자 카운팅
2. game_play_counts - 게임별 플레이 횟수
3. game_ratings - 익명 별점 (1~5점)
4. game_requests - 요청하기 (게임구매/음료/개선, 카운팅 공개)

2단계(카카오 로그인 후):
- 마이페이지 (내가 남긴 평점 목록)
- 동호회 출석/활동
```

---

## 카카오 로그인 세팅

- business.kakao.com 에서 비즈채널 생성 (문의 연결용)
- 카카오 개발자 콘솔에서 앱 생성 (간편로그인용)
- 헤더에 카카오 로그인 버튼 추가

---

## GitHub Codespaces 세팅

```
GitHub Codespaces 세팅하고 커밋 푸시까지 해줘.
핸드폰 브라우저에서 github.dev 또는 Codespaces로 접속해서 클로드 코드 쓸 수 있게.
.devcontainer/devcontainer.json 생성하고 Node.js 환경 + Claude Code 포함해줘.
```

```
이 프로젝트에 GitHub Codespaces 세팅해줘.
핸드폰 브라우저에서도 VS Code 환경으로 작업할 수 있게.
.devcontainer/devcontainer.json 생성하고 필요한 확장 포함해줘.
```

---

## 기타 남은 작업

- `perPage` 현재 4개 → 12개 또는 20개로 개선
- 게임 바텀시트 UI 기획 및 디자인
- 매칭 안 된 게임 수동 보정 (needs-review 52개 우선)
- BGG fetch 완료 후 build 실행 확인

---

## 참고: Claude Design 시스템
- 주소: https://claude.ai/design
- Cottage Board Design System 생성 완료
- 페이지 디자인 시 Claude Design → Claude Code 순서로 진행
