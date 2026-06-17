# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-17 (72차)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

**보류**: 카카오 알림 → Discord 전환 (Make 시나리오 5213346 수정 필요, 다음 세션에)
- 현재: kapi.kakao.com/v2/api/talk/memo/default/send (내 대화방, 알림 안 옴)
- 목표: Discord webhook으로 교체 (HTTP 2 토큰발급 모듈 삭제, HTTP 3 URL 교체)

**보류**: 기존 플레이 기록에 대한 업적 수동 부여 (SQL 실행됨 확인, 새싹 토끼 1개 지급됨)

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, localStorage + DB 저장, 다기기 복원)
- [x] 내 활동 패널 (플레이 기록, 코멘트, 모임 참석 통계)
- [x] 유저 차단/해제 (어드민)

### 게임 기록
- [x] 신규 기록 등록 (다중 게임 행, 날짜/그룹명/참여자/인원/시간/점수/후기)
- [x] 사진 다중 업로드 (최대 5장, JSON 배열 저장, 1200px/JPEG 0.85 리사이즈)
- [x] 기존 기록 수정 (인라인 수정폼, 사진 개별 삭제/신규 추가)
- [x] 기록 삭제
- [x] 모임별 보기 (3단 계층: 그룹 > 날짜 > 게임)
- [x] 게임별 보기 (게임 > 모임/인원 > 날짜)
- [x] 단일 게임 플레이 기록 조회 (?game= 파라미터) ← deprecated: 기본 동선은 openGameRecordSheet 바텀시트로 대체. URL 공유/SEO 검토 전까지 코드 보류
- [x] 그룹명 / 게임명 / 참여자 이름 자동완성 (등록폼 + 수정폼)
- [x] 사진 썸네일 표시 (80px, 가로 스크롤, 최대 3장 + +N장 배지, 라이트박스 연동)

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원 1인~9인+, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 코멘트, 따봉/궁금해요, 플레이 기록)
- [x] 별점 제출/조회 (user_id 기반, 비로그인 세션키 기반 중복 방지)
- [x] 코멘트 등록/삭제/수정 (user_id 기반 권한)
- [x] 따봉/궁금해요 토글
- [x] 추천 게임 인원 필터 (1~4인 정확 매칭, 단체 5인+, 개별 5~9인+)
- [x] 업적/캐릭터/게임도감 V1
  - achievements 테이블 (17개 초기 데이터), user_achievements, points_log 신규 생성
  - profiles.rep_achievement_id 컬럼 추가 (대표 캐릭터 1개)
  - achievements.js: 체크 로직 + 토스트 + 내 활동 패널 렌더링
  - recordGamePlay/submitRating 성공 후 자동 업적 체크
  - 내 활동 패널: 게임 도감 진행률 + 캐릭터 목록 + 대표 캐릭터 선택
  - point_rewards 테이블: 업적 달성 시 pending 생성 → 관리자 승인 → points_log 반영
  - 관리자 포인트 승인 패널: 근거 보기(플레이/게임/사진/별점), 승인/거절 버튼
  - 캐릭터 섹션 빈 상태 안내 문구 표시 (업적 0개여도 섹션 보임)
  - 캐릭터 픽셀아트 이미지 47종 → assets/images/characters/characters_basic/{id}.png
  - 캐릭터 배지 PNG 연동 완료 (achievements.js, characters_basic/ 경로, onerror 이모지 fallback)
  - ⚠️ SQL 미실행 확인 필요: docs/migrations/000_schema.sql — Supabase 대시보드에서 실행 후 RLS 정책 포함 적용 확인
- [x] 게임 바텀시트 3섹션 (게임평/플레이기록/사진) 완성
  - 사진 독립 3번째 섹션 추가 (미리보기 3장 + 전체보기 9장)
  - 게임평·플레이기록·사진 모두 작성자+날짜 표시 (통일 포맷: `6월 N일`)
  - 섹션별 전체보기 3개 → "기록 전체보기 →" 버튼 1개로 통합
  - play-records-utils.js 로드 추가 (index.html, owned-games.html, game-location.html)

### 어드민
- [x] 게임/간식 요청 관리 (계획/완료 처리)
- [x] 건의사항 관리
- [x] 회원 목록 및 차단
- [x] 페이지 분석 대시보드 — 홍보 실험 판단판으로 전면 개편
  - 요약 카드 4종 (오늘 방문자, 7일 평균, 지난주 대비 %, 주요 유입경로 1위)
  - 날짜별 방문자 (day: 최근 7일+이전 7일 비교선, week: 4주, month/all: 12개월)
  - 유입경로 수평막대 (도넛 → 전환), 페이지별 수평막대
  - 유입경로 × 페이지 교차분석 (소스별 착지 페이지 chip 목록)
  - 보조지표 접힘 섹션 (시간대별, 방문자 구성 도넛, 회원별 이용시간)
  - 관리자(호핀) 유입경로 카운팅 제외 (cottage_is_admin 자동 설정)
  - 유입경로 수평막대 차트 제목 "유입 경로별 페이지뷰"로 명확화 (방문자 오독 방지)

### 인프라
- [x] 방문자 통계 (페이지뷰, 하루 1회 카운트)
- [x] 채널 귀속 추적 개선 — last-touch 모델, 날짜+source+page dedup, 비로그인 포함 세션 내 이동 추적
- [x] 추천게임찾기 이벤트 추적 — page_events 테이블, recommend_run(추천 받기 버튼) / recommend_game_click(결과 게임 클릭) 별도 집계
  - `cottage_orig_src_{date}`: 외부 유입 감지 시 항상 갱신 (최초 유입 보존 아님)
  - `page_views`: source+page별 각각 기록 (이전: source당 1회 → 이후: source+page당 1회)
  - `page_sessions._sessionReferrer`: 내부 이동 시 `cottage_orig_src_{date}` fallback 적용
- [x] 체류 시간 누적 (초 단위, localStorage → DB, 1분마다 heartbeat 반영)
- [x] localStorage 세션 키 통합 (`cottage_sess_{id}` 단일 JSON, 자동 마이그레이션)
- [x] 닉네임/사진 덮어쓰기 방지
- [x] 구형 localStorage 포맷 마이그레이션 완료
- [x] sitemap.xml / robots.txt 경로 현행화
- [x] 업로드 전 이미지 리사이즈 (1200px, JPEG 0.85)

---

## 2. 현재 버그

현재 알려진 버그 없음.

### 알려진 제한사항

| 항목 | 내용 |
|------|------|
| 이용시간 기기 중복 | 동일 유저가 여러 기기에서 동시에 사용 시 각 기기 시간이 모두 합산됨 |
| 사진 배열 전체 삭제 | `deletePlayPhoto`는 photo_url = null로 전체 삭제 (개별 URL 삭제 불가) |
| 관리자 페이지 금일이용데이터 | 간헐적 미표시 — 원인 불명, 별도 조사 필요 |

---

## 3. 추후 작업 목록

### P1 — 기능 (중요)

- [x] **인앱 알림 시스템**: "내 활동" 버튼 빨간 배지 + 패널 내 알림 섹션
  - 트리거: 플레이 기록에 내 이름 태그됨, 궁금해요 게임 새 코멘트, 게임 구매완료
  - notifSeenAt: cottage_sess_에 추가. 패널 열 때 갱신 + 배지 제거
  - 최근 N건 항상 조회 + isNew 플래그 방식. 배지=isNew 항목 존재 시, 패널=전체 목록 + NEW 배지 강조
- [ ] **음료교환권 시스템** (진행 중)
  - [x] 1단계: DB — voucher_products/voucher_log + partial unique index (`docs/migrations/001_vouchers.sql`)
  - [x] 2단계: JS API — grantFirstPlayVoucher/getVoucherBalance/getVoucherProducts/redeemVoucher/getVoucherHistory
  - [x] 3단계: recordGamePlay 성공 후 grantFirstPlayVoucher fire-and-forget 연동
  - [x] 4단계: 내 활동 패널 UI — 보유 N장 + 상품 목록 + [사용하기] 버튼 + confirm + 잔액 재렌더
  - [x] 5단계: 관리자 UI — 전체 지급/사용 로그 (닉네임/내역/장수/시각), delta 기반 색상 구분
  - [x] 6단계: 로그 항목에 당시 잔액 표시 (`bal` 역산 방식, 사용자 패널 + 관리자 패널 양쪽)
    - 사용자 패널: `bal`(현재) 기준 hist(DESC 5건) 역산 → "→ N장" 표시
    - 관리자 패널: limit 제거 + ASC → user별 Map 누적합 → DESC 재정렬 → "잔액" 컬럼
    - ⚠️ 추후 로그 대량 누적 시: `balance_after` 컬럼 또는 RPC 방식으로 전환 검토 (현재 전체 조회)
  - 정책: 계정당 1회 자동 지급, 오너 제외, 승인 없음, 사용 즉시 차감
- [ ] **관리자 카카오 알림 확장**: 새 회원 가입, 모집 게시판 글 작성 시 알림 추가
  - ⚠️ 현재 코드베이스에 카톡 알림 전송 코드 없음. 사용자에게 기능 위치/구현 방식 재확인 필요

### P2 — 기능 (선택)

- [ ] **게임 위치 페이지** (game-location.html) — 책장 위치 기능 본격 구현
- [ ] **게임 위치 0종 카테고리 숨기기** — A-2(직소퍼즐), A-3(장난감) 등 게임수=0인 선반 항목 JS에서 숨김 처리
- [ ] **모임 일정 페이지** — 페이지만 있는 상태, 기능 구현 필요
- [ ] **동호회 가입 추적** — page_sessions 데이터 활용

- [x] **내 활동 패널 정보 우선순위 개선** — 정보 순서 재배치 + 알림 텍스트 압축 (로직 변경 없음, HTML 재배치만)
  - 현재 순서: 가입일 → 상태 → 이전 방문 → 방문 일수 → 오늘 이용시간 → 총 이용시간 → 플레이 기록
  - 변경 순서: 총 이용시간 → 방문 일수 → 플레이 기록 건수 → 모임 참여 → (구분) → 오늘 이용시간 → 이전 방문 → 가입일 → 상태
  - 알림 문장 단축: "궁금해요한 에이다의꿈에 새 코멘트가 달렸어요" → "에이다의꿈 새 코멘트" 수준으로 압축 (카드 높이 절감)
  - 기존 가입일/상태/이전 방문은 삭제 아닌 하단 이동 (계정 소유감 유지)
  - 알림 섹션 기본 접힘, 펼칠 때 seen 처리 (notifSeenAt + voucherNoticeSeen + 버튼 빨간점 제거) 완료
  - 추후 검토: "상태: 접속중"은 정보 가치 낮음 → "최근 플레이 게임" 등 의미 있는 필드로 교체 고려

- [x] **시각 완성도 개선** — 레이아웃·기능·색상 체계 변경 없이 모바일 기준 완성도 10~20% 향상
  - 작업 우선순위: 타이포 계층+여백 → 카드 계층감 → 히어로 배너 → 버튼 일관성
  - **타이포 계층 + 여백** (효과 최대): 메인제목/섹션제목/본문/보조텍스트 크기·굵기 차이 강화. 카드↔카드, 섹션↔섹션 사이 숨쉴 공간 확보. 꽉 차 있는 느낌 해소.
  - **카드 계층감**: 현재 카드가 배경에 붙어 보임 → 모든 카드에 매우 약한 shadow 추가 (hover 불필요, 모바일 위주). border 유지.
  - ~~**히어로 배너**: 갈색 유지하되 은은한 그라데이션으로 입체감 추가.~~ ✓ (::after 그라데이션 갈색 톤으로 변경)
  - **버튼 일관성**: 분석 결과 컨텍스트별로 이미 일관됨 (히어로:999px/필터:50%/폼:10px). 추가 작업 불필요.
  - 금지: 레이아웃 구조 변경, 색상 체계 변경, 신규 컬러 추가

- [ ] **관심 기반 묶음 알림** (설계 완료, 선공개 이후 진행)
  - 현재 개별 알림 → "내가 플레이한 게임에 새 후기 3개" 묶음 방식으로 전환
  - notifSeenAt 단일 string → 유형별 객체 `{ tagged, review, play_record, purchased }` 확장
  - 묶음 유형: tagged, 기록 게임 후기, 기록 게임 신규 플레이, 구매요청 완료, 궁금해요 코멘트
  - seen 처리 시점: 최근 알림 섹션 펼칠 때로 이동 (현재: 패널 열자마자)
  - localStorage 방식으로 충분 (기기간 동기화 불필요 수준), DB 테이블은 선택
  - 구현 시 Red (getMyNotifications API 변경, 다수 파일 의존) → Plan 필수

- [x] **페이지/회원 분석 UX 개선** (requests-admin)
  - 운영 요약 카드 3개 추가: 24h 방문자 / 7일 방문자 / 30일 신규 방문자
  - 회원 + 비로그인 방문자 통합 목록 → last_seen_at DESC, 회원/비로그인 뱃지
  - 이용 상세 접힘 유지

- [x] **업적 목록 UI 개선** — "✅ 달성" → "✓" (도감/RPG 느낌 강화, 정보 중복 제거)
  - 미달성은 현재 그대로 `25/50`

- [ ] **유입 경로 first_source 저장** — 현재 UTM은 세션별만 추적 → 어느 채널이 충성 유저를 만드는지 알 수 없음
  - profiles 테이블에 `first_source TEXT` 컬럼 추가 (최초 1회만 저장, 덮어쓰기 금지)
  - 저장 시점: 최초 로그인(upsertProfile) 시 현재 세션의 UTM/referrer 값 사용
  - 어드민 대시보드 "채널별 재방문 분포" 차트에 활용 (first_source + visit_count)
  - 판단 제외: last_source(page_sessions에 이미 있음), 재방문 횟수(visit_count로 충분), 채널별 전환율(전환 정의 모호 + 분석 쿼리 차원), 가입까지 걸린 시간(first_visit_at 없어 불가)

### P3 — 인프라

- [x] **캐릭터 PNG 크롭 품질 개선** — split-characters.js + 배경제거 소스(업적아이콘 (1).png)로 전체 재추출. 구버전 crop-characters.js 및 characters/ 루트 파일 삭제 완료.
- [ ] **renderSingleGame / ?game= 페이지 처리**: 기본 동선 제거 완료. 코드는 deprecated 상태로 보류 중 — 직접 URL 공유·SEO 필요 여부 결정 후 삭제 또는 공개 랜딩 페이지로 전환
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] price-rules.html 사진 중심 재구성
- [ ] club-rules.html 사진 중심 재구성
- [ ] `game-system/tools/reclassify-coop.js` — 완료된 일회성 스크립트. 유사 파일이 2개 이상 생기면 `game-system/tools/data-fixes/` 폴더로 이동

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
| 2026-06-17 | fix: 파비콘 여백 최소화 — 투명 영역 감지 후 8px만 남기고 512x512 꽉 채움 |
| 2026-06-17 | fix: 파비콘 이미지 교체 — 글씨없는버전 노여백 로고 전용 아이콘으로 변경 |
| 2026-06-17 | refactor: 업적 UI — "✅ 달성" → "✓" (크기 15px/굵게, 도감 느낌 강화) |
| 2026-06-17 | refactor: requests-admin 1차 바텀시트 개편 — 포인트승인/교환권로그/요청관리 바텀시트화, 메뉴카드 그리드 도입. 차트 섹션 기존 유지 |
| 2026-06-17 | feat: 음료교환권 지급+사용 통합 로그 — delta 기반 +/- 표시, reason별 문구, 지급=초록/사용=기본. 관리자 페이지도 전체 로그 표시 |
| 2026-06-17 | fix: 새 게임 알림 "입고됐어요" → "추가됐어요" |
| 2026-06-17 | fix: DEV 교환권 버튼 — reason CHECK에 dev_test 추가, 실패 시 alert+console.error |
| 2026-06-17 | feat: 음료교환권 DEV 테스트 지급 버튼 (localhost/OWNER 전용, reason=dev_test, 운영 노출 없음) |
| 2026-06-17 | fix: 파비콘 찌부 수정 — favicon-square.png 생성(1024x1024 center crop), 전체 18개 HTML 교체 |
| 2026-06-17 | fix: achievements.js 누락 9개 페이지 추가 — 도감/캐릭터/업적 섹션 복구 (info/3, club/5, admin/requests) |
| 2026-06-17 | feat: 내 활동 패널 알림·교환권 섹션 토글 추가 (기본 펼침, 클릭 접기/펴기) |
| 2026-06-17 | fix: 음료교환권 공지 카드 텍스트 단순화 (문장 축약, 설명문 제거, 버튼 문구 단축) |
| 2026-06-17 | feat: 음료교환권 공지에 날짜 표시 추가 (VOUCHER_NOTICE_DATE 상수 고정) |
| 2026-06-17 | fix: 음료교환권 공지 seen = 삭제가 아닌 읽음 처리 (확인 후 항목 유지, NEW 배지만 제거) |
| 2026-06-17 | feat: 내 활동 패널 통계 기본 접힘 + 교환권 상품 이모지 (🥤🍫☕) |
| 2026-06-17 | fix: 드롭다운 중복 닉네임 카드 제거 (menu-user-card 삭제) |
| 2026-06-16 | feat: 음료교환권 5단계 — 관리자 UI 사용내역 섹션 (닉네임/상품/사용장수/시각, 최신순 30건) |
| 2026-06-16 | feat: 음료교환권 4단계 — 내 활동 패널 음료교환권 섹션 (보유장수/상품목록/사용하기 버튼/confirm/인라인 재렌더/사용내역) |
| 2026-06-16 | feat: 음료교환권 3단계 — recordGamePlay 성공 후 grantFirstPlayVoucher fire-and-forget 연동 |
| 2026-06-16 | feat: 음료교환권 2단계 — JS API 5개 (grantFirstPlayVoucher/getVoucherBalance/getVoucherProducts/redeemVoucher/getVoucherHistory) |
| 2026-06-16 | feat: 음료교환권 1단계 — voucher_products/voucher_log 테이블 + partial unique index + RLS |
| 2026-06-16 | feat: 대표 캐릭터 드롭다운 카드 뱃지 표시 — avatar wrap + #menuUserCardRepChar 14px overlay, 로그인 시 getRepAchievement 비동기 로드, select 변경 즉시 갱신 |
| 2026-06-16 | feat: 대표 캐릭터 저장 피드백 — handleRepSelect 저장 성공(테두리 초록)/실패(복원+console.warn), data-prev-value 초기값 주입 |
| 2026-06-16 | refactor: 메뉴 드롭다운 위계 정리 — 미니 프로필 카드 + 내 활동 강조 + 사진·닉네임 보조화 + 구분선 2개 (HTML 변경 없음) |
| 2026-06-16 | feat: 업적 진행률 UI — 패널 순서 재배치(도감/캐릭터/업적→통계), buildAchievementsSection 신규, 달성/미달성/진행도 표시, 목록 접힘 토글 |
| 2026-06-16 | feat: 음료교환권 공지 — 내 활동 빨간점 + 최근 알림에 공지 항목. 버튼 클릭 시 seen 처리, localStorage voucherNoticeSeen 플래그 |
| 2026-06-16 | feat: 포인트 UI 숨김 — 업적 해금 토스트 + 내 활동 패널 포인트 표시 제거 (DB/로직 유지) |
| 2026-06-16 | feat: 캐릭터 픽셀아트 이미지 17종 스프라이트시트에서 분리 (토끼5/다람쥐4/고슴도치4/햄스터4), scripts/crop-characters.js + sharp |
| 2026-06-13 | fix: 유입 경로 추적 개선 — source별 1일 1회 기록 (cottage_pv_{date}_{source} 키). 같은 경로 재방문 무시, 다른 경로 재방문은 각각 집계 |
| 2026-06-13 | fix: 게임위치 페이지 게임 클릭 시 바텀시트 열리도록 — ensureGameSheet() 호출 추가 (openGame 함수) |
| 2026-06-13 | chore: renderSingleGame / ?game= deprecated — 기본 동선은 openGameRecordSheet 바텀시트로 대체 완료, 코드 보류(URL 공유·SEO 검토 전) |
| 2026-06-13 | refactor: 게임평/기록 전용 바텀시트 신규(openGameRecordSheet) — 게임 상세 시트에 미리보기 1건+전체보기, 게임별 탭 미니카드로 축소, 📚 링크 위치 이동 |
| 2026-06-13 | refactor: 바텀시트 "코멘트"→"게임평" 전면 교체, 게임평 섹션에 플레이기록 review_text 병합+작성자 표시, 플레이 모달에 게임평 입력 추가, 브레드크럼 "게임 찾기 & 기록"→"게임"(링크) |
| 2026-06-13 | refactor: 바텀시트 정보 위계 정립 — 📚제목 아래 이동, 좋아요/궁금해요 게임정보 끝, 게임평 먼저/플레이기록 나중, 플레이기록 링크 텍스트형. getAllPlayRecordsForHub review_text 누락 버그 수정. 게임별 페이지 게임평 = game_comments + review_text 통합+작성자 표시 |
| 2026-06-13 | feat: 게임별 페이지 게임평 섹션 추가 + 바텀시트 작성자 표시 강화 — game-reviews?game=X 상단 게임평 N개, 닉네임 갈색bold/날짜 muted 분리 |
| 2026-06-13 | feat: 게임 위치 링크 game-location.html 연결 — 📍 버튼/📚 책장 버튼 모두 game-location.html?shelf={id} 연결, 책장 버튼 상단 이동, goToShelf 제거, game-location shelf 파라미터 자동 오픈 |
| 2026-06-13 | refactor: club.html/club-history 타이포+여백 마감 — about-for-list 간격 10→12px, about-for-item 패딩 14→16px, pr-sub-hd 12px, is-open 마진 16px |
| 2026-06-13 | fix: 방문경로 집계 page_views 기준 통일 — trackPageView에 referrer 추가, 관리자 방문경로 차트 page_sessions→page_views 변경 |
| 2026-06-13 | fix+feat: 바텀시트 UI 정리 — 플레이기록 링크 이번플레이됨 아래 이동, 책장 링크 최하단 이동, "따봉"→"좋아요"/궁금해요 라벨 추가, 코멘트 중복 제거(initSheetComments review_text 제거) |
| 2026-06-13 | fix: 게임별 플레이기록 페이지 — 상단 코멘트 섹션 제거(카드와 중복), "게임정보·코멘트 보기→" 페이지 이동→바텀시트 직접 오픈 변경 |
| 2026-06-13 | fix+feat: 플레이 카운팅 전체 수정 — initPlayWidget gameKey→numericId 변환(getGamePlayCount/Highlights/Records 0건 버그), 바텀시트 플레이기록 건수 실시간 연동, 게임기록 페이지 코멘트+플레이감상 섹션 추가, 링크 텍스트 개선 |
| 2026-06-13 | fix: 헤더 검색 결과 클릭 시 바텀시트 없는 페이지에서 owned-games로 이동하던 버그 — ensureGameSheet() 동적 주입으로 전 페이지 지원 |
| 2026-06-13 | fix: 게임명 클릭 시 바텀시트 열리던 버그 제거 — 썸네일만 클릭 가능하도록 변경 |
| 2026-06-13 | refactor: 회원 자기소개 카드 — 테두리 중립화, 닉네임/날짜 색·크기·간격 개선, 팔레트 세이지/웜브라운 2색 열 반복 |
| 2026-06-12 | fix+feat: 썸네일 클릭 수정(game-reviews/club-history), 플레이 감상 코멘트 연동(getPlayReviewsByGame + initSheetComments), trackPageView console.warn 추가 |
| 2026-06-12 | refactor: 색상 정리 2건 + club-rules 기본매너 슬림화 — club-intro 카드 베이지 통일/닉네임 텍스트 색 구분, about 섹션레이블 브랜드갈색/피처카드 테두리 강화/본문 대비 증가, club-rules 기본매너 4→2항목 |
| 2026-06-12 | refactor: 히어로 그라데이션 갈색 톤으로 개선 — ::after 오버레이 검정→갈색(#3d2810) 3-stop 그라데이션, 하단 0.52 불투명도 |
| 2026-06-12 | refactor: 히어로 여백·뷰포트 수정 — margin-bottom 24→16px, min-height -48px→-28px(top12+bottom16) |
| 2026-06-12 | refactor: 타이포 계층 + 여백 개선 — owned-games 게임명 16→17px/line-height 강화, 아이템 padding/gap 확대, recommend-section 상단 여백 12→22px |
| 2026-06-12 | refactor: 카드 계층감 개선 — .game-card / .recommend-filter box-shadow:none → 0 2px 8px rgba(40,30,18,0.07) |
| 2026-06-12 | refactor: 내 활동 패널 구분선 2개로 3단 구조 확정 — 누적 활동 / 최근 활동 / 계정 정보 |
| 2026-06-12 | refactor: 내 활동 패널 정보 우선순위 개선 — 누적 성과(총 이용시간·방문일수·플레이기록) 상단, 계정 메타(가입일·상태·이전방문) 하단, 구분선 추가, 알림 텍스트 단축 |
| 2026-06-12 | fix: 유입경로 차트 중복 카운팅 — user_id 기준 Set 중복 제거, UTM 캡처 시점 모듈 초기화로 이동(_sessionReferrer) |
| 2026-06-12 | feat: 단축 URL 리다이렉트 — /kakao_club /instagram /naverplace /store /boardlife /flyer /daangn → UTM 자동 부착 (vercel.json) |
| 2026-06-12 | feat: UTM 파라미터 유입경로 추적 — startSession에서 utm_source 우선 저장, categorizeRef UTM 브랜드명 매핑 |
| 2026-06-12 | feat: 관리자 비주얼 분석 — 날짜/주/월 달력 탐색(◀▶) 추가, 유입경로 실제 hostname 표시 |
| 2026-06-12 | refactor: 인앱 알림 구조 개선 — 최근 N건 항상 조회 + isNew 플래그 방식으로 변경. 배지=isNew 존재, 패널=전체목록+NEW 강조 |
| 2026-06-12 | feat: 인앱 알림 시스템 — "내 활동" 배지 + 패널 알림 섹션. getMyNotifications 신규, notifSeenAt cottage_sess_ 확장 |
| 2026-06-12 | refactor: 파일 구조 정리 — scripts/ 신설(DB 운영 스크립트 5개 이동), query-hoppin-time*.js 삭제, FULL_TREE.txt 삭제(STRUCTURE.md 중복), CLAUDE.md Plan 형식 추가, pages/store 리다이렉트 문서화 |
| 2026-06-12 | refactor: MD 리팩토링 — STRUCTURE.md 인덱스화, db-schema/js-api/ls-schema 서브파일 분리, STATE.md 정리, CLAUDE.md 규칙 추가 |
| 2026-06-11 | refactor: localStorage 세션 키 8개 → cottage_sess_{id} 단일 JSON 통합. window._cottageSess 유틸, 기존 기기 자동 마이그레이션 |
| 2026-06-11 | fix: DB 데이터 복구 — visit_count 리셋 + total_minutes 60배 뻥튀기. page_sessions 기반 재집계로 복구 |
| 2026-06-11 | fix: heartbeat 이용시간 누락 — _syncTimeToDBNow(false)로 교체, 1분마다 total_minutes 저장 |
| 2026-06-11 | fix: upsertProfile selectError 시 시간 필드 0 덮어쓰기 방지 |
| 2026-06-11 | feat: 어드민 비주얼 분석 대시보드 — Chart.js 5종 + 기간 필터 + 유입 경로 도넛 차트 |
| 2026-06-11 | feat: 추천 게임 카드 BGG 평점 표시 |
| 2026-06-11 | fix: 추천 게임 오버레이 평점순 정렬 |
| 2026-06-11 | feat: game_curious 테이블 — 비추(game_dislikes) → 궁금해요. 버튼 👎→🤔 |
