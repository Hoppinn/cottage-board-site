# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-12 (37차 — 인앱 알림 시스템 구현)

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
- [ ] **관리자 카카오 알림 확장**: 새 회원 가입, 모집 게시판 글 작성 시 알림 추가

### P2 — 기능 (선택)

- [ ] **게임 위치 페이지** (game-location.html) — 책장 위치 기능 본격 구현
- [ ] **모임 일정 페이지** — 페이지만 있는 상태, 기능 구현 필요
- [ ] **동호회 가입 추적** — page_sessions 데이터 활용

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
