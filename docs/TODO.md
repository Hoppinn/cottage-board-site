# 코티지보드 홈페이지 TODO
기준: 2026-05-28

---

## 페이지 현황

| 파일 | 상태 | 비고 |
|------|------|------|
| `index.html` | ✅ 완료 | 히어로, 방문자수, 추천게임, 분위기태그 |
| `pages/owned-games.html` | ✅ 완료 | 전체게임, 바텀시트 |
| `pages/cottage/about.html` | ✅ 완료 | 소개, 오시는 길 |
| `pages/store/price-rules.html` | ✅ 완료 | 가격, 규칙 |
| `pages/store/requests.html` | 🔧 개선 필요 | 디자인/로그인게이트 개선 예정 |
| `pages/store/suggestions-admin.html` | ✅ 완료 | 관리자 전용 건의함 |
| `pages/cottage/club.html` | ✅ 완료 | 참여방법 리스트 |
| `pages/cottage/club-intro.html` | ✅ 완료 | 가입 인사 게시판 |
| `pages/cottage/club-history.html` | ✅ 완료 | 모임별 플레이 기록 + 캡션 복사 |
| `pages/store/game-location.html` | ❌ 플레이스홀더 | 3D 책장 구현 보류 |

---

## 다음 작업 (우선순위 순)

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| 인스타그램 사진 연동 (club.html) | 높음 | LightWidget 또는 직접 임베드 |
| requests.html 디자인·로그인게이트 개선 | 보통 | 카카오 로그인 필요 안내, user_id 소유권 |
| game-location.html 간단 콘텐츠 | 낮음 | 게임 위치 안내 이미지·텍스트 |
| 바텀시트: 스플렌더포켓몬/마블 리테마 처리 | 낮음 | 수동 BGG ID 또는 커스텀 설명 필요 |

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
| "팽" 테스트 요청 삭제 | 🔧 Supabase 대시보드에서 직접 삭제 |

---

## 완료된 항목

- ✅ 바텀시트 전면 개편: 플레이기록 모달, 코멘트, 메커니즘 라벨
- ✅ 플레이기록/코멘트 user_id 기반 소유권
- ✅ 플레이기록 모임명 표시 (닉네임 · 날짜 · 모임명)
- ✅ 플레이기록 모임명 입력 (datalist 자동완성)
- ✅ club-history.html 모임별 플레이 기록 + 인스타 캡션 복사
- ✅ 구매/간식 요청 인라인 수정 + 투표 1개만 이동 로직
- ✅ 카카오 알림: 게임/간식/건의 요청 등록 시 카톡 전송
- ✅ suggestions-admin.html 관리자 전용 건의함
- ✅ requests.html 탭 URL 파라미터 이동 (?tab=)
- ✅ 카카오 재로그인 시 커스텀 닉네임/프로필 복원
- ✅ club-intro.html 가입 인사 게시판
- ✅ Supabase 전체 테이블 + 정책 설정
