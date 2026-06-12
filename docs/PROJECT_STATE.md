# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-13 (46차 — 2026-06 디자인 감사 완료 + club 여백 마감)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

현재 진행 중 작업 없음.

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
- [x] 단일 게임 플레이 기록 조회 (?game= 파라미터)
- [x] 그룹명 / 게임명 / 참여자 이름 자동완성 (등록폼 + 수정폼)
- [x] 사진 썸네일 표시 (80px, 가로 스크롤, 최대 3장 + +N장 배지, 라이트박스 연동)

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원 1인~9인+, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 코멘트, 따봉/궁금해요, 플레이 기록)
- [x] 별점 제출/조회 (user_id 기반, 비로그인 세션키 기반 중복 방지)
- [x] 코멘트 등록/삭제/수정 (user_id 기반 권한)
- [x] 따봉/궁금해요 토글
- [x] 추천 게임 인원 필터 (1~4인 정확 매칭, 단체 5인+, 개별 5~9인+)

### 어드민
- [x] 게임/간식 요청 관리 (계획/완료 처리)
- [x] 건의사항 관리
- [x] 회원 목록 및 차단
- [x] 페이지 분석 대시보드 (Chart.js 5종 차트, 기간 필터, 유입 경로 도넛 차트)

### 인프라
- [x] 방문자 통계 (페이지뷰, 하루 1회 카운트)
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
- [ ] **관리자 카카오 알림 확장**: 새 회원 가입, 모집 게시판 글 작성 시 알림 추가

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
  - 추후 검토: 알림 여러 건 쌓이면 통계가 밀리는 구조 → 알림 섹션 접기/펼치기 도입 필요
  - 추후 검토: "상태: 접속중"은 정보 가치 낮음 → "최근 플레이 게임" 등 의미 있는 필드로 교체 고려

- [x] **시각 완성도 개선** — 레이아웃·기능·색상 체계 변경 없이 모바일 기준 완성도 10~20% 향상
  - 작업 우선순위: 타이포 계층+여백 → 카드 계층감 → 히어로 배너 → 버튼 일관성
  - **타이포 계층 + 여백** (효과 최대): 메인제목/섹션제목/본문/보조텍스트 크기·굵기 차이 강화. 카드↔카드, 섹션↔섹션 사이 숨쉴 공간 확보. 꽉 차 있는 느낌 해소.
  - **카드 계층감**: 현재 카드가 배경에 붙어 보임 → 모든 카드에 매우 약한 shadow 추가 (hover 불필요, 모바일 위주). border 유지.
  - ~~**히어로 배너**: 갈색 유지하되 은은한 그라데이션으로 입체감 추가.~~ ✓ (::after 그라데이션 갈색 톤으로 변경)
  - **버튼 일관성**: 분석 결과 컨텍스트별로 이미 일관됨 (히어로:999px/필터:50%/폼:10px). 추가 작업 불필요.
  - 금지: 레이아웃 구조 변경, 색상 체계 변경, 신규 컬러 추가

- [ ] **유입 경로 first_source 저장** — 현재 UTM은 세션별만 추적 → 어느 채널이 충성 유저를 만드는지 알 수 없음
  - profiles 테이블에 `first_source TEXT` 컬럼 추가 (최초 1회만 저장, 덮어쓰기 금지)
  - 저장 시점: 최초 로그인(upsertProfile) 시 현재 세션의 UTM/referrer 값 사용
  - 어드민 대시보드 "채널별 재방문 분포" 차트에 활용 (first_source + visit_count)
  - 판단 제외: last_source(page_sessions에 이미 있음), 재방문 횟수(visit_count로 충분), 채널별 전환율(전환 정의 모호 + 분석 쿼리 차원), 가입까지 걸린 시간(first_visit_at 없어 불가)

### P3 — 인프라

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
