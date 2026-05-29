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
| `pages/cottage/game-reviews.html` | ✅ 완료 | 세션 기반 3탭 허브 (기록입력·최근기록·게임후기) |
| `pages/cottage/club.html` | ✅ 완료 | 동호회 소개 |
| `pages/cottage/club-schedule.html` | ❌ 플레이스홀더 | 투표 기능 미구현 |
| `pages/cottage/club-history.html` | ✅ 완료 | 모임별 플레이 기록 + 인스타 캡션 복사 |
| `pages/cottage/club-intro.html` | ✅ 완료 | 가입 인사 게시판 |
| `pages/store/game-location.html` | ❌ 플레이스홀더 | 3D 책장 구현 보류 |

---

## 다음 작업 (우선순위 순)

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| suggestions 테이블 Supabase 확인/생성 | 높음 | 개선건의 저장 안 됨 — RLS 또는 테이블 미존재 가능 |
| game-location.html 간단 콘텐츠 | 낮음 | 게임 위치 안내 이미지·텍스트 |
| club-schedule.html 일정 투표 기능 | 낮음 | 미래 기능 |
| 바텀시트: 스플렌더포켓몬/마블 리테마 처리 | 낮음 | 수동 BGG ID 또는 커스텀 설명 필요 |
| 인스타그램 사진 연동 (club.html) | 낮음 | LightWidget 또는 직접 임베드 |

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
| BGG 수동 보정: ~53개 unresolved 잔여 | ⏸ 일시정지 (요청 시 재개) |
| 리테마 게임(스플렌더포켓몬 등) 개별 처리 | 🔧 대기 |

---

## 완료된 항목

- ✅ 네비게이션 최종 구조 개편 (게임찾기 / 코티지보드소개 / 동호회 / 요청하기)
- ✅ 브레드크럼 전 페이지 추가 및 가시성 개선
- ✅ 요청하기 메뉴 terracotta 색상 (#9e3a2a) 강조
- ✅ 메뉴 상위그룹(게임찾기 등)은 연한 색, 하위항목은 짙은 초록으로 구분
- ✅ 햄버거 메뉴 추천게임찾기 active 상태 — 플래그 기반 안정 구현
- ✅ 관리자 뒤로가기 버튼 흰색으로 수정 (about-hero 다크 배경)
- ✅ 개선건의 오류 처리 추가 (저장 실패 시 alert 표시)
- ✅ 브레드크럼 자기지시 제거: `코티지보드 소개 › 소개` → `코티지보드 소개`
- ✅ 바텀시트 전면 개편: 플레이기록 모달, 코멘트, 메커니즘 라벨
- ✅ 플레이기록/코멘트 user_id 기반 소유권
- ✅ club-history.html 모임별 플레이 기록 + 인스타 캡션 복사
- ✅ 구매/간식 요청 인라인 수정 + 투표 1개만 이동 로직
- ✅ 카카오 알림: 게임/간식/건의 요청 등록 시 카톡 전송
- ✅ requests.html 탭 URL 파라미터 이동 (?tab=)
- ✅ 카카오 재로그인 시 커스텀 닉네임/프로필 복원
- ✅ Supabase 전체 테이블 + 정책 설정
- ✅ game-reviews.html 세션 기반 3탭 허브로 재설계
- ✅ club-schedule.html 신설 (플레이스홀더)
