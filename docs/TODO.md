# 코티지보드 홈페이지 TODO
기준: 2026-05-27

---

## 페이지 현황

| 파일 | 상태 | 비고 |
|------|------|------|
| `index.html` | ✅ 완료 | 히어로, 방문자수, 추천게임, 분위기태그 |
| `pages/owned-games.html` | ✅ 완료 | 전체게임, 바텀시트 |
| `pages/cottage/about.html` | ✅ 완료 | 소개, 오시는 길 |
| `pages/store/price-rules.html` | ✅ 완료 | 가격, 규칙 |
| `pages/store/requests.html` | ✅ 완료 | 작성자 삭제 기능 포함 |
| `pages/cottage/club.html` | ✅ 완료 | 동호회 소개/참여방법/바로가기 링크 |
| `pages/cottage/club-intro.html` | ✅ 완료 | 가입 인사 게시판 (member_intros) |
| `pages/store/game-location.html` | ❌ 플레이스홀더 | 3D 책장 구현 보류 |

---

## 버그 / UI 수정

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| 바텀시트: 스플렌더포켓몬/스플렌더마블 리테마 처리 | 보통 | 🔧 대기 (수동 BGG ID 또는 커스텀 설명 필요) |

---

## 백엔드 / Supabase

| 항목 | 상태 |
|------|------|
| 카카오 Developers 웹 플랫폼 도메인 등록 | 🔧 사용자 직접 (앱 1467212 → 앱설정 → 플랫폼 → Web) |
| "팽" 테스트 요청 삭제 | 🔧 Supabase 대시보드 game_requests에서 직접 삭제 |

---

## 데이터 작업

| 항목 | 상태 |
|------|------|
| BGG 수동 보정: ~53개 unresolved 잔여 | ⏸ 일시정지 (요청 시 재개) |
| 리테마 게임(스플렌더포켓몬 등) 개별 처리 | 🔧 대기 |

---

## 완료된 항목

- ✅ 메뉴 구조 변경 (게임찾기/코티지보드안내/요청하기)
- ✅ 푸터 텍스트 링크 방식으로 전환 + 화살표 방향 수정
- ✅ 카카오 로그인 전체 페이지 연동
- ✅ 카카오 비즈채널 버튼 전체 페이지 연동
- ✅ 바텀시트 UI 개편 (스티키바/통계/코멘트/로그인게이트)
- ✅ 바텀시트 스티키바 빈칸 제거
- ✅ 바텀시트 코멘트/플레이기록/따봉 삭제·취소 기능 추가
- ✅ 따봉 토글 (toggleGameLike — 다시 누르면 취소)
- ✅ 방문자수 Supabase 연동 (sessionStorage 중복 방지)
- ✅ requests.html 게임/간식 요청 작성자 삭제 기능
- ✅ club-intro.html 가입 인사 게시판 신규 생성
- ✅ club.html 참여방법 → club-intro.html 링크 연결
- ✅ Supabase 전체 테이블 + 정책 설정 완료 (supabase-setup.sql)
- ✅ requests.html, about.html, price-rules.html 구현
- ✅ club.html 동호회 페이지 구현
- ✅ 분위기 태그 재정의 + 오분류 수정
- ✅ BGG 매칭 점수 버그 수정 (tokenSimilarity 다단어 패턴)
- ✅ 게임 자동 매칭: auto-confirmed 향상
- ✅ 강제 매핑(forced-bgg-overrides): 8→140개
- ✅ BGG 데이터 rebuild (484개 ready)
- ✅ 신규 BGG 데이터 fetch + 한국어 설명 번역
