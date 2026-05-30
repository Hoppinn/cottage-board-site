# 코티지보드 홈페이지 TODO
기준: 2026-05-31

---

## 페이지 현황

| 파일 | 상태 | 비고 |
|------|------|------|
| `index.html` | ✅ 완료 | 히어로, 방문자수, 추천게임, 분위기태그 |
| `pages/owned-games.html` | ✅ 완료 | 전체게임, 바텀시트, 정렬·필터 |
| `pages/cottage/about.html` | ✅ 완료 | 소개, 오시는 길 |
| `pages/store/price-rules.html` | ✅ 완료 | 가격, 규칙 |
| `pages/store/requests.html` | ✅ 완료 | 게임/간식/건의 탭, 투표·수정·삭제 |
| `pages/store/requests-admin.html` | ✅ 완료 | 관리자 건의 관리 페이지 |
| `pages/cottage/game-reviews.html` | ✅ 완료 | 기록입력·기록보기(세션 아코디언) 2탭, 게임후기 탭 통합 |
| `pages/cottage/club.html` | ✅ 완료 | 동호회 소개 (모임 사진 보기 제거) |
| `pages/cottage/club-schedule.html` | ❌ 플레이스홀더 | 일정 투표 기능 미구현 |
| `pages/cottage/club-history.html` | ✅ 완료 | 모임별 플레이 기록 + 인스타 캡션 복사 |
| `pages/cottage/club-intro.html` | ✅ 완료 | 가입 인사 게시판 |
| `pages/store/game-location.html` | ❌ 플레이스홀더 | 3D 책장 구현 보류 |

---

## 다음 작업 (우선순위 순)

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| **사진 업로드** | 🔴 높음 | Supabase Storage → play-photos 버킷 직접 생성 필요 (Public) |
| **club-schedule.html 일정 투표** | 🟡 높음 | 플레이스홀더만 있음, 기능 설계·구현 필요 |
| **체류시간·방문횟수 확인** | 🟡 중간 | 내일 내 활동창 + 관리자페이지에서 확인 |
| game-location.html 콘텐츠 | 🟢 낮음 | 게임 위치 안내 이미지·텍스트 |
| 전체 디자인 polish | 🟢 낮음 | |

---

## 백엔드 / 자동화

| 항목 | 상태 |
|------|------|
| 카카오 알림 (요청/건의 → 카톡 나에게 보내기) | ✅ 완료 (Make.com + Supabase Webhook) |
| Make.com 시나리오 Active 유지 필요 | 🔧 refresh_token 만료(60일) 시 재발급 필요 |

---

## 데이터 작업

| 항목 | 상태 |
|------|------|
| BGG 매칭 — 616/636 ready, no-bgg 19개, needs-review 0 | ✅ 완료 |
| 중복 bggId 자동감지 규칙 (b_run-local-match.js) | ✅ 완료 |
| 탁상탐정단1~4, 에이다, 펜스테르담 등 no-bgg 처리 | ✅ 완료 |

---

## 완료된 항목

- ✅ 네비게이션 최종 구조 개편 (게임찾기 / 코티지보드소개 / 동호회 / 요청하기)
- ✅ 브레드크럼 전 페이지 추가 및 가시성 개선
- ✅ 요청하기 메뉴 terracotta 색상 (#9e3a2a) 강조
- ✅ 메뉴 상위그룹(게임찾기 등)은 연한 색, 하위항목은 짙은 초록으로 구분
- ✅ 햄버거 메뉴 추천게임찾기 active 상태 — 스크롤 위치 기반 구현
- ✅ 햄버거 메뉴 active 그룹 토글 (인라인 스타일 제거로 닫기 동작 수정)
- ✅ 관리자 뒤로가기 버튼 흰색으로 수정 (about-hero 다크 배경)
- ✅ 개선건의 오류 처리 추가 (저장 실패 시 alert 표시)
- ✅ 브레드크럼 자기지시 제거
- ✅ 바텀시트 전면 개편: 플레이기록 모달, 코멘트, 메커니즘 라벨
- ✅ 플레이기록/코멘트 user_id 기반 소유권
- ✅ club-history.html 모임별 플레이 기록 + 인스타 캡션 복사
- ✅ 구매/간식 요청 인라인 수정 + 투표 1개만 이동 로직
- ✅ 카카오 알림: 게임/간식/건의 요청 등록 시 카톡 전송
- ✅ requests.html 탭 URL 파라미터 이동 (?tab=)
- ✅ 카카오 재로그인 시 커스텀 닉네임/프로필 복원
- ✅ Supabase 전체 테이블 + 정책 설정
- ✅ game-reviews.html: 기록보기 아코디언 (날짜+그룹 세션), 게임후기 탭 통합
- ✅ club-schedule.html 신설 (플레이스홀더)
- ✅ about.html + club.html 상단 헤더 여백 수정 (about-hero padding)
- ✅ 방문자 카운팅: 비로그인 포함 하루 1회 제한 (localStorage 날짜 기반)
- ✅ BGG ID 매칭 완료 (616/636 ready, 중복감지 규칙 추가)
- ✅ Supabase 다중 클라이언트 경고 해결 (_cottageSupabaseDb 싱글톤)
- ✅ 플레이 후기 game_play_records.review_text 통합 (별도 insertGameReview 제거)
- ✅ club-history.html 모임기록 연동 힌트 배너 항시 표시
- ✅ supabase-setup.sql 전체 정합성 보완 (game_dislikes/profiles/game_reviews 추가)
- ✅ Storage play-photos 버킷 + RLS 정책 추가
- ✅ 동호회 소개 문구 수정 (코티지보드 동호회, 요금 5,000원)
- ✅ 게임 구매요청 3단계 상태 (대기/구매예정/구매완료) + 클릭 투표
- ✅ 개선건의 예정/완료 상태 관리자 처리
- ✅ 방문 카운팅 하루 1회 고정 (새로고침 무한증가 방지)
- ✅ 체류 시간 추적 (total_minutes) + 내 활동창·관리자 표시
- ✅ 플레이 후기 game_play_records 통합, 인라인 수정 기능
- ✅ 구매요청 투표자 닉네임 관리자 표시 (game_request_votes)
- ✅ 간식 요청 클릭 투표 + 안내 문구
- ✅ BGG 추가 수정: 우봉고3D(269971), 탐험가들(368413), 스플렌더 찬란한도시확장(220653)
- ✅ 난이도 미설정("-") 게임 "아이도 가능" 필터에서 제외
- ✅ 동호회 서브페이지 breadcrumb → club.html 섹션 해시 앵커 연결
- ✅ club.html 모임 사진 보기 항목 제거
