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
| `pages/store/requests.html` | ✅ 완료 | Supabase 연동 (테이블 미생성) |
| `pages/cottage/club.html` | ❌ 플레이스홀더 | 콘텐츠 미작성 |
| `pages/store/game-location.html` | ❌ 플레이스홀더 | 3D 책장 구현 보류 |

---

## 버그 / UI 수정

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| 바텀시트: 스플렌더포켓몬/스플렌더마블 리테마 처리 | 보통 | 🔧 대기 (수동 BGG ID 또는 커스텀 설명 필요) |

---

## 콘텐츠 작업

| 항목 | 상태 |
|------|------|
| `club.html` 콘텐츠 (동호회 소개, 가입 안내) | 🔧 대기 |
| `game-location.html` 3D 책장 (도면 작업 선행 필요) | ⏸ 보류 |

---

## 백엔드 / Supabase

| 항목 | 상태 |
|------|------|
| 테이블 생성: SQL 파일(`docs/supabase-setup.sql`) 대시보드에서 실행 필요 | 🔧 대기 |
| `requests.html` Supabase 실제 저장 연결 | 🔧 대기 |
| 카카오 비즈채널 문의하기 실제 연결 | 🔧 대기 |

---

## 데이터 작업

| 항목 | 상태 |
|------|------|
| BGG 수동 보정: unresolved 118개, needs-review 29개 | 🔧 진행 중 |
| 리테마 게임(스플렌더포켓몬 등) 개별 처리 | 🔧 대기 |

---

## 완료된 항목

- ✅ 메뉴 구조 변경 (게임찾기/코티지보드안내/요청하기)
- ✅ 푸터 텍스트 링크 방식으로 전환 + 화살표 방향 수정
- ✅ 카카오 로그인 전체 페이지 연동
- ✅ 카카오 비즈채널 버튼 전체 페이지 연동
- ✅ 바텀시트 UI 개편 (스티키바/통계/코멘트/로그인게이트)
- ✅ 바텀시트 스티키바 빈칸 제거 (height:0 방식)
- ✅ 바텀시트 코멘트 섹션: 빈상태+버튼 같은 줄, 타인코멘트 표시
- ✅ 따봉 기능 Supabase 연결 (toggleGameLike, 카운트 표시)
- ✅ 방문자수 Supabase 연동 (page_views)
- ✅ requests.html, about.html, price-rules.html 구현
- ✅ 분위기 태그 재정의 + 오분류 수정
- ✅ BGG 매칭 점수 버그 수정 (tokenSimilarity 다단어 패턴)
- ✅ 게임 자동 매칭: auto-confirmed 440개 (기존 대비 대폭 향상)
- ✅ 강제 매핑(forced-bgg-overrides): 8→49개
- ✅ 신규 BGG 데이터 fetch 48개 + 한국어 설명 번역
