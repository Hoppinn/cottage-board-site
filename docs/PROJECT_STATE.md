# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-22 (140차)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

**리팩토링 완료** — 결과: `docs/REFACTOR_CHECKPOINT.md`
- Green 6개 완료: ACH4, PU1, ACH8, GDA1, KA8, CSS3
- Yellow 5개 완료: SC2(대표캐릭터 이름), SC3(좋아요/궁금해요 독립), CSS1(.sheet-section 중복), GR1+GR2(deprecated 경로 삭제), ACH9(포인트 제도 삭제)
- Red 7개 완료: PU2, SC1, GDA2, ACH5, SC4/SC5, ACH3, KA1(848줄→616줄)
- **모든 Red 완료** (CSS2 196→18 완료, 나머지 18개는 정당한 사유로 유지)

**보류**: 카카오 알림 → Discord 전환 (Make 시나리오 5213346 수정 필요)
- 현재: kapi.kakao.com/v2/api/talk/memo/default/send (내 대화방, 알림 안 옴)
- 목표: Discord webhook으로 교체 (HTTP 2 토큰발급 모듈 삭제, HTTP 3 URL 교체)

**다음 작업 후보**

1. **개별 알림 확인 (seenNotifIds)** — Red, 설계 완료, 우선순위 낮음

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, 다기기 복원)
- [x] 내 보드 패널 — 메인(4카드) + 서브시트(성장/교환권/이용기록) + 프로필 영역(대표캐릭터/닉네임/칭호)
- [x] 약식 카드 클릭 → 해당 본문 카드로 위임 (캐릭터/칭호, 132차)
- [x] 인앱 알림 시스템 — 배지 + 패널. 2차 개선(날짜/unread 바/보상카드 강조/명칭 "최근 소식") (130차)

### 게임 기록
- [x] 신규 기록 등록 (다중 게임 행, 날짜/그룹명/참여자/인원/시간/점수/후기)
- [x] 사진 다중 업로드 (최대 5장, 1200px/JPEG 0.85 리사이즈)
- [x] 기존 기록 수정 (인라인 수정폼, 사진 개별 삭제/신규 추가)
- [x] 기록 삭제
- [x] 모임별 보기 (그룹 > 날짜 > 게임) / 게임별 보기 (게임 > 모임/인원 > 날짜)
- [x] 그룹명 / 게임명 / 참여자 이름 자동완성
- [x] 사진 썸네일 표시 (80px, 최대 3장 + +N장 배지, 라이트박스 연동)

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원 1인~9인+, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 게임평, 따봉/궁금해요, 플레이기록, 사진 3섹션)
- [x] 별점 제출/조회 (user_id 기반, 비로그인 세션키 중복 방지)
- [x] 게임평 등록/삭제/수정 (user_id 기반 권한)
- [x] 따봉/궁금해요 토글

### 업적 / 캐릭터 / 칭호 / 교환권

상세 정의: `docs/achievement-system.md` (SSOT)

- [x] 업적 시스템 — ACH_DEFS 기반 8축 (record/new_game/photo/review/visit/play/first_record/balance)
  - checkAchievements: 기록/별점/방문/함께한 날 트리거 후 자동 체크
  - 달성 → 캐릭터/칭호/교환권 자동 지급. 포인트 비활성화 (UI 숨김, DB/로직 유지)
  - ⚠️ play/balance 카운팅은 player_names 텍스트 기반 — 닉네임 변경/동명이인 오탐 가능. 장기 과제: game_play_participants 테이블
- [x] 캐릭터 — 47종 픽셀아트 PNG, 대표 캐릭터 선택/저장/프로필 표시
- [x] 칭호 — TITLE_DEFS, 대표 칭호 선택, 프로필 표시
- [x] 교환권 시스템 — 전 단계 완료
  - DB: voucher_products/voucher_log (001_vouchers.sql)
  - voucher_log.note + achievement reason CHECK + partial unique index (003_voucher_achievement.sql ← Supabase 실행 완료)
  - grantFirstPlayVoucher (첫 플레이, record_1 경로) / grantAchievementVoucher (업적별, JS + DB 이중 중복방지)
  - 관리자 UI: 전체 지급/사용 로그, 당시 잔액 역산 표시
  - 정책: 계정당 1회 자동 지급, 오너 제외, 승인 없음, 사용 즉시 차감
- [x] 업적 소급 부여 SQL 실행 완료 (002_sogeup_achievements.sql, 129차)

### 어드민
- [x] 게임/간식 요청 관리 — 상태 시스템 (purchase_status/status_date + 상태 피커)
- [x] 건의사항 관리 / 회원 목록 및 차단
- [x] 페이지 분석 대시보드 — 요약 카드, 날짜/주/월 필터, 유입경로, 교차분석

### 인프라
- [x] 방문자 통계 — `__visitor__` 마커 방식 (113차 버그 수정, 118차 filteredPV 중복 제거)
- [x] 채널 귀속 추적 — last-touch 모델, UTM 파라미터, 날짜+source+page dedup
- [x] 추천게임찾기 이벤트 추적 (page_events 테이블)
- [x] 체류 시간 누적 (초 단위, localStorage → DB, 1분마다 heartbeat)
- [x] localStorage 세션 키 통합 (`cottage_sess_{id}` 단일 JSON, 자동 마이그레이션)
- [x] 업로드 전 이미지 리사이즈 (1200px, JPEG 0.85)

---

## 2. 현재 버그

현재 알려진 버그 없음.

**135차 수정 내역 (2026-06-20):**
- [x] 게임 위치 변경 — 사라진속옷과하늘을나는물고기, 로나에나:재앙의선물 `배송중` → `머더미스터리` (master.json + build)
- [x] 비회원 고유 ID — `page_sessions`에 `session_key` 컬럼 추가 (SQL: supabase-setup.sql line 695), 비로그인 방문 시 INSERT, `getPageAnalytics` SELECT 포함, 관리자 명 집계 session_key 반영
- [x] 알림 new_game 바텀시트 — 단일 게임 `data-game-name`, 복수 게임 개별 클릭 span, 클릭핸들러 `closest('[data-game-name]')` 우선 탐색
- [x] localhost page_sessions 기록 차단 — `_syncTimeToDBNow`에 localhost guard 추가 (회<명 역전 근본 원인 제거)
- [x] admin 명 집계 보완 — refUsers7, refUserMap, buildPageMap, pageUniq 모두 anon session_key 반영

**134차 수정 내역 (2026-06-20):**
- [x] 협력게임 책장 라벨 — script.js `getGameShelfLabel`에 weight 분류 추가. 바텀시트에서 "협력" → "쉬운/어려운 협력게임" 표시
- [x] 비주얼분석 데이터 0 복구 — `getPageAnalytics` SELECT에서 비존재 컬럼 `session_key` 제거, page_views SELECT에서 `user_id` 제거, anon_sessions SELECT에서 `first_seen_at` 제거
- [x] 유입경로 내부 도메인 오분류 — `categorizeRef`에 자사 도메인 self-referrer null 반환 추가
- [x] 7일 유입 요약 카드 중복 — `__visitor__` 필터 추가

### 알려진 제한사항

| 항목 | 내용 |
|------|------|
| 이용시간 기기 중복 | 동일 유저가 여러 기기에서 동시에 사용 시 각 기기 시간이 모두 합산됨 |
| 사진 배열 전체 삭제 | `deletePlayPhoto`는 photo_url = null로 전체 삭제 (개별 URL 삭제 불가) |
| 관리자 페이지 금일이용데이터 | 간헐적 미표시 — 원인 불명, 별도 조사 필요 |
| TITLE_DEFS 미배정 칭호 3개 | `title_record_150` / `title_review_100` / `title_review_500`가 TITLE_DEFS에 정의돼 있으나 ACH_DEFS 어디서도 `rewards.title`로 참조되지 않음. 의도적 예약인지 잔존 버그인지 확인 필요 |

---

## 3. 추후 작업 목록

### P1 — 기능 (중요)

- [x] **관리자 카카오 알림 확장** — 신규 회원 가입(profiles INSERT) + 교환권 사용(voucher_log INSERT) 시 카톡 알림. Supabase DB webhook → Make.com 시나리오 5213346 Router 3개 분기 (140차)
- [x] **업적 8축 순서 재배열** — record→first_record→new_game→play→photo→review→visit→balance (118차)
- [x] **달성 업적 아이콘 컬러 적용** — .is-achieved .profile-ach-img-lock { filter: none } 추가 (118차)
- [x] **업적명·내용·아이콘 불일치 수정** — new_game_10/30/300 🦉→게임이모지, review_5/25/300 🦊→글쓰기이모지 (118차)
- [x] **rare 캐릭터 축 대표 오탐 수정** — _topCharPerAxis에서 rare_ 접두사 캐릭터 제외 (118차)

### P2 — 기능 (선택)

- [x] **게임 위치 페이지** (game-location.html) — 책장 위치 기능 구현 완료 (이전 세션)
- [x] **게임위치 협력게임 난이도 분류** — bgg.weight >= 2.5 → 어려운 협력(C-1), 미만 → 쉬운 협력(B-1), 41종 자동 분류 (118차). script.js 바텀시트도 동일 로직 적용 (134차)
- [x] **페이지별방문 내 보드 + 서브시트 카운팅** — trackPageView('my-board*') + admin 가상페이지 집계 (118차)
- [x] **방문자목록 회원/비회원 분류 버튼** — 전체/회원/비회원 토글 버튼 추가 (118차)
- [ ] **게임 위치 0종 카테고리 숨기기** — A-2(직소퍼즐), A-3(장난감) 등 게임수=0인 선반 항목 숨김 처리
- [ ] **모임 일정 페이지** — 페이지만 있는 상태, 기능 구현 필요
- [ ] **동호회 가입 추적** — page_sessions 데이터 활용
- [ ] **관심 기반 묶음 알림** (Red, Plan 필수)
  - 개별 알림 → 유형별 묶음 방식 전환
  - notifSeenAt → `{ tagged, review, play_record, purchased }` 확장
- [ ] **유입 경로 first_source 저장** — profiles.first_source TEXT 컬럼, 최초 로그인 시 1회 저장
  - 어드민 대시보드 채널별 재방문 분포 활용 목적

### P3 — 인프라

- [x] **로그인 메뉴 HTML 공통화** — assets/js/header.js 생성, 15개 HTML 파일 script 태그로 교체 (137차)
- [x] **renderSingleGame / ?game= 처리** — game-reviews.js dead code(GAME_ID) 삭제 완료 (137차)
- [x] **동호회 소개글 알림** — 소개글 올린 회원에게 new_intro 타입 묶음 알림 (N명이 소개글 올렸어요). supabase-client.js getMyNotifications + kakao-auth.js 렌더링 (138차)
- [x] **getPageAnalytics 조회 방식 개선** — limit(5000) → 최근 90일 필터 + limit(20000)로 교체. 25일치 → 90일치로 확장, raw는 DB에 유지 (139차)
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] price-rules.html / club-rules.html 사진 중심 재구성

### V4 아이디어 (장기, 구현 미정)

유저당 플레이 기록 20건 이상 누적 시 의미있는 분석 가능.

| # | 기능 | 필요한 데이터 |
|---|------|--------------|
| 1 | **게이머 성향 분석** — "전략형/파티형/탐험형" 분류 | game_play_records, 게임 태그 |
| 2 | **연말 플레이 리포트** — "올해 N종 탐험" 등 | game_play_records(연도별 집계) |
| 3 | **유저 취향 매칭** — 비슷한 패턴의 다른 유저 추천 | game_play_records, game_ratings |
| 4 | **개인화 게임 추천** — 미플레이 유사 게임 추천 | game_ratings, 게임 태그/장르 유사도 |
| 5 | **모임 추천** — 성향 분석 기반 | game_play_records.group_name |
| 6 | **다른 사람 성장보드 구경하기** — 타 유저 성장 현황 열람 | user_achievements, profiles |
| 7 | **나는 어떤 보드게이머일까?** — 연말 성향 분석 리포트 | game_play_records, game_ratings |

---

## 4. 위험한 데이터 흐름

### 4-1. 닉네임 손상 체인

auth-callback: DB 닉네임 조회 fallback 있음. upsertProfile: DB 닉네임 ≠ 카카오명이면 기존 유지. selectError 시 닉네임 필드 업데이트 제외.

### 4-2. 이용시간 데이터

_syncTimeToDBNow 성공 시에만 timeSec=0. upsertProfile selectError 시 시간 필드 업데이트 제외 (0 덮어쓰기 방지).

### 4-3. 다기기 localStorage 의존

| 기능 | 복원 방식 |
|------|----------|
| 커스텀 닉네임 | DB 조회로 복원 |
| 커스텀 사진 | DB photo_url 조회로 복원 |
| 별점 기록 | user_id 기반 → 다기기 중복 방지 |
| 코멘트 소유권 | user_id 기반 → 다기기 삭제 버튼 표시 |

---

## 5. 변경 이력 (주요 패치)

| 날짜 | 내용 |
|------|------|
| 2026-06-19 | feat: 교환권 업적 지급(grantAchievementVoucher), 함께한 날(balance) 구현(getUserUniqueDayCount), 메뉴명 변경(record/play/visit/balance), 약식 카드 클릭→변경. 003_voucher_achievement.sql 실행 (132차) |
| 2026-06-19 | fix: 업적/캐릭터/칭호 0개 버그 — getUserAchievements FK join null → achievement_id 직접 매핑, getRepAchievement 2차 조회 제거 (131차) |
| 2026-06-19 | feat: 알림 2차 개선(날짜 위치/빈상태 조건/unread 좌측바/보상카드 강조/명칭 "최근 소식"). supabase-setup.sql 누락 항목 추가 (130차) |
| 2026-06-19 | feat: 업적 소급 부여 SQL(002_sogeup_achievements.sql) Supabase 실행 완료 (129차) |
| 2026-06-19 | fix: 비주얼 분석 kstDate is not defined — buildAnonUserMap 스코프 문제, _toKstDate 인라인 헬퍼 추가. 관리자 메뉴 맨 아래 이동 (128차) |
| 2026-06-19 | fix+feat: 내 보드 UX 개선 7건 — 취향보드 토글, 기록보드 섹션, 함께한 시간 명칭, 요청 투표 버그, 칭호 CSS (117차) |
| 2026-06-19 | feat: 내 보드 카드 구조 재정리 + 요청 상태 피커 개선 + guide 내 보드 연동 (116차) |
| 2026-06-18 | feat: 알림 클릭 액션 / N번째 플레이 표시 / 메뉴 대표캐릭터 전환 / 업적 보상 표시 (86~92차) |
| 2026-06-18 | feat: 칭호 시스템 V1 — TITLE_DEFS 20종, buildTitleSection, setRepTitle API (89차) |
| 2026-06-18 | feat: 업적/칭호 시스템 V2 — ACH_DEFS rewards 구조, 방문 업적 5종, 미해금 카드 진행도, visit 트리거 (94차) |
| 2026-06-18 | feat: 게임 요청 실제 게임명 입력 — actual_games JSONB, 초성검색 자동완성 (103차) |
| 2026-06-18 | feat: 게임 2개 추가 — 사라진속옷과 하늘을나는물고기, 로나에나. 총 643종 |
| 2026-06-17 | feat: 내 보드 서브시트 구조 전환 + 4축 카드 + 프로필 영역 + 드롭다운 정리 (76~83차) |
| 2026-06-17 | feat: 홈페이지 이용안내 카드 개편 / 업적 UI 개선 / 파비콘 수정 / achievements.js 누락 9개 페이지 추가 |
| 2026-06-17 | feat: 음료교환권 전 단계 완료 — DB/JS API/관리자UI/실제상품/로그 잔액 역산 (81~106차) |
| 2026-06-13 | feat: 게임 바텀시트 3섹션(게임평/플레이기록/사진) / 게임평 통합 / 게임 위치 연결 |
| 2026-06-12 | feat: UTM 유입경로 추적 / 단축 URL 리다이렉트(vercel.json) / 어드민 비주얼 분석 대시보드 |
| 2026-06-12 | refactor: localStorage 세션 키 8개 → cottage_sess_{id} 단일 JSON 통합 |
| 2026-06-11 | fix: DB 데이터 복구 — visit_count 리셋 + total_minutes 60배, page_sessions 기반 재집계 |
| 2026-06-11 | fix: heartbeat 이용시간 누락(_syncTimeToDBNow), upsertProfile selectError 시 0 덮어쓰기 방지 |
