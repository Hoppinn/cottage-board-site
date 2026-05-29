# 코티지보드 홈페이지 TODO
기준: 2026-05-29

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
| **바텀시트 + 플레이기록 + 동호회 모임기록 연동 다듬기** | 높음 | 삭제 동기화, 사진 업로드 등 |
| **club-history.html 모임기록 보기 고도화** | 높음 | 모임별 상세 보기 |
| **club-schedule.html 일정 투표 기능 구현** | 높음 | Supabase 투표 테이블 설계·구현 |
| **동호회 하위→상위 뒤로가기 스크롤 위치 확인** | 중간 | 구현 완료, 실제 동작 확인 필요 |
| page_views 테이블 초기화 (방문자 0 리셋) | 중간 | Supabase SQL: `DELETE FROM page_views;` 직접 실행 필요 |
| 요청하기 페이지 개선 | 낮음 | |
| 푸터 카카오 채널 링크 확인 | 낮음 | |
| game-location.html 간단 콘텐츠 | 낮음 | 게임 위치 안내 이미지·텍스트 |
| 전체 디자인 polish | 낮음 | |

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
| BGG 수동 보정: ~47개 unresolved 잔여 | ⏸ 일시정지 (요청 시 재개) |
| 탁상탐정단1~4: MicroMacro BGG ID 유지, 영어 제목은 원판명 | ✅ 완료 |
| 리테마 게임(스플렌더포켓몬 등) 개별 처리 | 🔧 대기 |

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
- ✅ 방문자 카운팅: 로그인 사용자만, 하루 1회 제한 (localStorage)
- ✅ BGG ID 매칭 대규모 업데이트 (~584/636개 이미지 확보)
- ✅ 난이도 미설정("-") 게임 "아이도 가능" 필터에서 제외
- ✅ 동호회 서브페이지 breadcrumb → club.html 섹션 해시 앵커 연결
- ✅ club.html 모임 사진 보기 항목 제거
