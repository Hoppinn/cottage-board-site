# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-18 (103차)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

**보류**: 카카오 알림 → Discord 전환 (Make 시나리오 5213346 수정 필요)
- 현재: kapi.kakao.com/v2/api/talk/memo/default/send (내 대화방, 알림 안 옴)
- 목표: Discord webhook으로 교체 (HTTP 2 토큰발급 모듈 삭제, HTTP 3 URL 교체)

**보류**: 기존 플레이 기록에 대한 업적 수동 부여 (SQL 실행됨 확인, 새싹 토끼 1개 지급됨)

**다음 작업 후보 (98차 이후, 우선순위 순)**

1. **개별 알림 확인 (seenNotifIds)** — Red, 설계 완료, 우선순위 낮음

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, localStorage + DB 저장, 다기기 복원)
- [x] 내 보드 패널 (플레이 기록, 코멘트, 모임 참석 통계)
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

### 최근 수정 버그

| 항목 | 내용 | 수정 |
|------|------|------|
| 구매희망 토글 차감 오류 | li.dataset.count stale + 연타 시 동일 delta 중복 write → count 과차감 | li._voting 락 + dataset.count 즉시 갱신 (91차) |

### 알려진 제한사항

| 항목 | 내용 |
|------|------|
| 이용시간 기기 중복 | 동일 유저가 여러 기기에서 동시에 사용 시 각 기기 시간이 모두 합산됨 |
| 사진 배열 전체 삭제 | `deletePlayPhoto`는 photo_url = null로 전체 삭제 (개별 URL 삭제 불가) |
| 관리자 페이지 금일이용데이터 | 간헐적 미표시 — 원인 불명, 별도 조사 필요 |

---

## 3. 추후 작업 목록

### P1 — 기능 (중요)

- [x] **인앱 알림 시스템**: "내 보드" 버튼 빨간 배지 + 패널 내 알림 섹션
  - 트리거: 플레이 기록 태그, 궁금해요 게임 새 코멘트, 게임 구매완료
  - 알림 섹션 기본 접힘. [모두 확인] 버튼 클릭 시만 seen 처리 (펼치기는 읽음 아님)
  - 신규 가입자 기본 알림: "첫 게임평을 남기면 음료교환권 1장을 받을 수 있어요" (voucherNoticeSeen 기반, 항상 표시)
  - 캐릭터 섹션 기본 접힘 + "N/17종" 헤더. 업적 섹션 기본 접힘 + "N/17" 헤더
  - 패널 버튼/제목 "내 활동" → "내 보드" 변경 완료. Playwright 브라우저 검증 완료.
- [x] **내 보드 P2 구조 정리** (선공개 전 완료)
  - 게임 도감: 접힘 기본, 헤더에 "N/641" 표시, 본문(바/등급/목록) 펼침 토글
  - 캐릭터: 17종 전체 정사각형 그리드(4열), 획득=컬러/미획득=grayscale
  - ACH_DEFS IIFE 스코프 호이스팅 (buildChar/buildAch 공유, 중복 제거)
  - 섹션 순서: 알림→캐릭터→도감→업적→교환권→통계→활동
  - 교환권 헤더에 "N장 보유" 잔액 표시
  - 플레이한 게임/코멘트 헤더에 건수 표시
  - 보류: 프로필사진/닉네임 통합, 대표캐릭터=프로필 연동, 도감 산정기준 변경
- [x] **내 보드 카드→서브시트 구조 전환** (76차, 선공개 전 완료)
  - 메인 패널: 닉네임 + 카드 3개 (최근 알림 / 성장 보드 / 이용·혜택)
  - 각 카드 클릭 시 #profileSubSheet 바텀시트로 상세 진입
  - 서브시트: .profile-subsheet / z-index 9200 / gameSheet 계열과 완전 분리
  - ‹ 내 보드: 서브시트만 닫힘 / ✕: 서브시트+메인패널 동시 닫힘
  - 메인 패널 dim/close → 서브시트도 함께 제거
  - _bindVoucher(container=body), _markVoucherSeen(container=body) 파라미터화
  - 알림 배지 has-badge CSS로 알림 카드에 표시
  - Playwright 7개 항목 전체 통과
  - ⚠️ 이전 그룹 박스 CSS(.profile-group)는 DOM 제거 후에도 style.css에 보류 상태 (영향 없음)
- [x] **내 보드 화면 목적지 정리** (79차)
  - 대표 캐릭터 변경 버튼/아바타 클릭 → 성장 보드 서브시트 열리며 내 캐릭터 섹션 기본 펼침
  - 음료교환권 서브시트 기본 펼침 (교환/확인 목적에 맞춤)
  - 이용기록 서브시트 통계 섹션 기본 펼침
  - 내 보드 메인 패널 크기 92vh로 확대 (서브시트와 위계 균형)
  - _afterGrowthRender(subBody, expandChar) 헬퍼 추출 (카드 클릭=false, 프로필 버튼=true)
  - Playwright 검증: 내 캐릭터 펼침/음료교환권 펼침/이용기록 통계 펼침 모두 true
- [x] **내 보드 프로필 영역 + 드롭다운 정리** (78차)
  - 드롭다운 사용자 영역: 내 보드 / 로그아웃만 유지 (사진변경·닉네임변경·관리자 제거)
  - 내 보드 상단에 .profile-panel-profile 영역 추가: 대표 캐릭터 아바타 + 닉네임 + 캐릭터명(칭호) + 대표캐릭터변경/닉네임변경 버튼
  - 대표 캐릭터 없으면 🐾 placeholder 표시 + "대표 캐릭터 설정하기" 버튼
  - 아바타 클릭 / 대표캐릭터변경 버튼 → 성장 보드 서브시트 오픈
  - 카카오 프로필 사진 사용 중단. promptProfileImageChange / PRESET_AVATAR_CONFIGS 삭제
  - Promise.all에 getRepAchievement 추가 (기존 API 재사용)
  - Playwright 4개 항목 전체 통과
- [x] **내 보드 4축 구조 전환 + 서브시트 전체 높이** (77차)
  - 메인 패널 4카드: 최근 알림(thin row) / 성장 보드 + 음료교환권 (2열 그리드) / 홈페이지 이용 기록(thin row)
  - 성장 보드 서브시트: 캐릭터→업적→게임도감 순 / 헤더에 대표 캐릭터 아이콘 표시
  - 음료교환권 서브시트: 교환권 단독 분리
  - 홈페이지 이용 기록 서브시트: 통계+플레이한 게임+코멘트 통합
  - 서브시트 높이 calc(100vh - 48px)로 전체화면 수준 확장
  - Playwright 검증: 카드 4개 / 성장보드 height 796px / 섹션순서(char→ach→codex) 모두 통과
- [x] **홈페이지 이용안내 카드 개편** (80차)
  - 카드 2열 그리드 구조 (추천게임찾기/플레이기록/내 보드/동호회/요청하기)
  - 카카오 로그인 카드 제거 → 내 보드 카드로 교체
  - 마지막 카드(요청하기) grid-column:1/-1로 2열 span
  - CSS: .about-for-list--grid 수식자 추가 (about.html, club.html 영향 없음)

- [x] **드롭다운 완전 제거 + 직접 내 보드 열기** (81차→82차)
  - 프로필 버튼 클릭 → openProfilePanel() 직접 호출 (드롭다운 없앰)
  - 로그아웃 아이콘 버튼(#kakaoLogoutIconBtn) .menu-login-area에 JS로 삽입, stopPropagation
  - updateLoginUI에서 is-visible 토글로 로그인/로그아웃 상태 반영
  - promptNicknameChange에서 드롭다운 복원 코드 제거 (이제 패널 내에서만 호출)
  - HTML 15개 파일 수정 없음
  - (82차) _restoreMenuExpanded()에서 userActions 복원 코드 제거 (패널 닫기 시 구 드롭다운 복원 버그 수정)
  - (82차) initKakaoAuth()에서 kakaoLogoutBtn도 JS remove()
- [x] **push 전 잔버그 4건** (84차)
  - 알림 공지 날짜·본문 텍스트 겹침 → `.profile-notif-voucher`에 `padding-right:48px`
  - 로그아웃 아이콘 버튼 미표시 → `appendChild` 직후 `is-visible` 즉시 추가 (타이밍 버그)
  - 내 보드 패널 높이 서브시트보다 48px 작음 → `height:calc(100vh-48px)` (서브시트와 동일값으로 통일)
  - 생수·곤약젤리 표시명에 "2개" 미표시 → `VOUCHER_DISPLAY_NAME` 오버라이드 맵 추가 (DB 변경 없음)
  - 관리자 페이지 음료교환권 로그에도 표시명 반영

- [x] **대표 캐릭터 카드 선택 UI + 알림 배지 수정 + 패널 높이** (83차)
  - 캐릭터 카드 select→button 전환 (접근성), is-rep(갈색)/is-selected(초록) 테두리 구분
  - 변경/취소 버튼: 선택이 origRepId와 다를 때만 표시, 성공 시 is-rep 이동
  - 알림 isNew: notifSeenAt=null이면 true (신규/미확인 상태 배지 표시 버그 수정)
  - "모두 확인" 버튼 알림 1건 이상일 때만 표시, 확인 후 _updateNotifBadge() 재호출
  - profile-panel-box min-height:calc(100vh - 96px) (서브시트와 크기감 통일)

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
  - [x] 7단계: 실제 매장 상품으로 교체 (81차)
    - DB: 기존 더미 상품 is_active=false → 실제 상품 INSERT SQL 아래 제공 (스키마 변경 없음)
    - JS: VOUCHER_EMOJI 10종으로 업데이트 (음료/생수/곤약젤리/스니커즈/참크래커/예감/홈런볼/버터와플/카스타드/촉촉한초코칩)
    - 1장: 음료·생수·곤약젤리·스니커즈·참크래커·예감·홈런볼·버터와플 / 2장: 카스타드 / 3장: 촉촉한초코칩
- [x] **칭호 시스템 V1** (89차 구현 완료)
  - TITLE_DEFS 20종: 기록(4)/탐험(3)/사진(4)/리뷰(4)/방문(5) 계열
  - user_achievements 기반 파생 (업적계열) + profiles.visit_count 기반 (방문계열)
  - profiles.rep_title_id TEXT 컬럼 추가 필요 (SQL 미실행 시 저장만 실패, 나머지 정상)
  - setRepTitle API, buildTitleSection({html,earnedIds}), getTitleById 헬퍼 노출
  - 성장 보드: 캐릭터→칭호→업적→도감 순, 미획득 카드 클릭 가능(저장만 차단)

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
  - 알림 섹션 기본 접힘. seen 처리: [모두 확인] 버튼 클릭 시만 (펼치기는 읽음 처리 아님)
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

- [ ] **로그인 메뉴 HTML 공통화** (추후 검토)
  - 현재 kakaoPhotoBtn/kakaoNicknameBtn 등을 JS에서 remove()로 처리 (HTML 15개 파일 직접 수정 보류)
  - 향후: JS로 메뉴 HTML 생성 → 모든 페이지 동일 구조 / 또는 공통 include 방식
  - 기대효과: 메뉴 구조 변경 시 1곳만 수정, HTML 15개 파일 반복 수정 제거
  - 현재 결정: 기능 완성 우선, 구조 개편은 이후 단계

- [x] **캐릭터 PNG 크롭 품질 개선** — split-characters.js + 배경제거 소스(업적아이콘 (1).png)로 전체 재추출. 구버전 crop-characters.js 및 characters/ 루트 파일 삭제 완료.
- [ ] **renderSingleGame / ?game= 페이지 처리**: 기본 동선 제거 완료. 코드는 deprecated 상태로 보류 중 — 직접 URL 공유·SEO 필요 여부 결정 후 삭제 또는 공개 랜딩 페이지로 전환
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] price-rules.html 사진 중심 재구성
- [ ] club-rules.html 사진 중심 재구성
- [ ] `game-system/tools/reclassify-coop.js` — 완료된 일회성 스크립트. 유사 파일이 2개 이상 생기면 `game-system/tools/data-fixes/` 폴더로 이동

### V4 아이디어 (장기, 구현 미정)

데이터 축적 후 가능한 기능들. 현재 추가 구현 없음, 아이디어 기록용.

| # | 기능 | 필요한 데이터 |
|---|------|--------------|
| 1 | **게이머 성향 분석** — 플레이 패턴으로 "전략형/파티형/탐험형" 등 분류 | game_play_records(장르/난이도/인원), 게임별 메타(tags, difficulty) |
| 2 | **연말 플레이 리포트** — "올해 N종 탐험, 가장 많이 플레이한 게임" 등 | game_play_records(연도별 집계), game_play_records.played_at |
| 3 | **유저 취향 매칭** — 비슷한 플레이 패턴의 다른 유저 추천 | game_play_records(user_id × game_id 매트릭스), game_ratings |
| 4 | **개인화 게임 추천** — 내가 좋아한 게임과 유사한 미플레이 게임 추천 | game_ratings(사용자 별점), game_curious, 게임 태그/장르 유사도 |
| 5 | **모임 추천** — 내 플레이 성향과 맞는 모임/그룹 추천 | game_play_records.group_name, player_names, 성향 분석 결과 |

공통 전제: 유저당 플레이 기록 20건 이상 누적 시 의미있는 분석 가능.

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
| 2026-06-18 | feat: 게임 요청에 실제 게임 이름 입력 — actual_games JSONB, 초성검색 자동완성, 추가됨 알림에 실제 게임명 표시 (103차) |
| 2026-06-18 | fix: 완료된 게임 섹션 복구 — purchased_at OR added_at 기준 필터 (102차) |
| 2026-06-18 | fix: 추가된 게임 30일 필터, 구매완료 날짜 클릭 편집, 액션 버튼 confirm 메시지 (101차) |
| 2026-06-18 | refactor: 요청 목록 2열 카드 그리드, 구매/추가됨 설정·해제 분리+confirm, 추가됨 배지 관리자 전용 (100차) |
| 2026-06-18 | fix: 요청 목록 레이아웃 2행, 추가됨 배지 일반 유저 표시, added_at TIMESTAMPTZ + 1분 딜레이 필터 (99차) |
| 2026-06-18 | feat: 추가됐어요 전체 알림 — game_requests.added_at, getMyNotifications newGameSeenAt 파라미터, new_game 알림 렌더, 관리자 추가됨 버튼 (98차) |
| 2026-06-18 | fix: 구매희망 알림 type 'purchased'→'ordered', 표시 문구 "추가됐어요"→"주문됐어요" (97차) |
| 2026-06-18 | fix: 투표 상태 DB 기준 초기화 — initMyVotesFromDB 도입, syncSubmittedToVotes 근본 제거. myVotes는 game_request_votes를 source of truth로 사용 (96차) |
| 2026-06-18 | fix: 구매희망 토글 영구 -1 버그 — removedVotes localStorage set 추가, syncSubmittedToVotes에서 명시 제거된 항목 제외 처리 (95차) |
| 2026-06-18 | feat: 업적/칭호 시스템 V2 — ACH_DEFS rewards 구조, 방문 업적 5종, hedgehog threshold 조정, 미해금 카드 진행도 표시, upsertProfile visit 트리거, getUserVisitCount API 추가 (94차) |
| 2026-06-18 | fix: 교환권 공지 문구 오류 — "첫 게임평" → "첫 플레이기록". 업적 TYPE_LABELS review "게임 별점"→"게임평" (93차 재정정) |
| 2026-06-18 | fix: 구매희망 토글 차감 오류 — li._voting 락 + li.dataset.count 즉시 갱신으로 연타 stale read 방지 (게임/간식 양쪽) |
| 2026-06-18 | feat: 업적 카드 보상 표시 — 달성 전 "받을 보상" / 달성 후 "획득한 보상". 캐릭터 항상 표시, 칭호(TITLE_DEFS.achId 역참조)/교환권(rabbit_first 하드코딩) 존재 시 추가 표시. profile-ach-info column 레이아웃 전환 |
| 2026-06-18 | feat: 칭호 시스템 V1 — TITLE_DEFS 20종, buildTitleSection(earnedIds반환), handleRepTitleSelect, setRepTitle API, 프로필 칭호 라인+버튼, 성장보드 칭호 섹션(캐릭터→칭호→업적→도감). SQL: ALTER TABLE profiles ADD COLUMN rep_title_id TEXT |
| 2026-06-18 | feat: 알림 클릭 액션 — 알림 li 클릭 시 게임 상세 열기. tagged(gameId→key변환)/curious_comment(gameKey직접)/purchased(이름매칭 best effort). is-clickable CSS, _getGameKeyById/_getGameKeyByName 헬퍼 |
| 2026-06-18 | feat: N번째 플레이 표시 — 내 보드 플레이한 게임 목록 + game-reviews 모임별 보기에서 2번째 이상 플레이 시 "(N번째 플레이)" 표시 |
| 2026-06-18 | fix: 알림 UI 3건 — 모두 확인 후 알림 카드 라벨 "최근 알림" 갱신, 서브시트 제목 "최근 알림 N건", 교환권 개별 확인 후 _updateNotifBadge 재호출 |
| 2026-06-18 | feat: 게임 2개 추가 — 사라진속옷과 하늘을나는물고기 (BGG 350586), 로나에나: 재앙의 선물 (BGG 350585). 총 643종 |
| 2026-06-18 | feat: 메뉴 프로필 이미지 → 대표 캐릭터 전환. 기본값 rabbit_first, rep 있으면 교체. 변경 시 즉시 갱신. rabbit_first 첫 달성 시 rep null이면 자동 대표 설정 |
| 2026-06-18 | feat: 캐릭터 카드 하단 이름 상시 표시 (획득/미획득 모두, 미획득 opacity:0.4) |
| 2026-06-18 | refactor: 업적 목록 1행 압축 — typeLabel 오른쪽 이동, "✓ 플레이 기록 · 10/10" / "플레이 기록 · 25/50" 형식 |
| 2026-06-18 | docs: 칭호 시스템 네이밍 최종 확정 (기록/탐험/사진/리뷰/방문 5계열, 희귀도 5단계) |
| 2026-06-18 | fix: 달성 업적 진행도 표시 추가 — `✓ N/N` 형식, is-done 폰트 15px→12px |
| 2026-06-18 | fix: push 전 잔버그 4건 — 알림날짜 겹침/로그아웃버튼/패널높이/생수곤약젤리 표시명 |
| 2026-06-18 | feat: 대표 캐릭터 카드 선택 UI — select 제거, button 카드(is-rep/is-selected), 변경/취소, 패널 아바타 갱신 |
| 2026-06-18 | fix: 알림 isNew 판정 — notifSeenAt=null 시 true로 수정 (신규 가입자 배지 미표시 버그) |
| 2026-06-18 | fix: 모두 확인 버튼 조건 개선 + 확인 후 _updateNotifBadge() 재호출 |
| 2026-06-18 | fix: profile-panel-box min-height:calc(100vh-96px) — 서브시트와 크기감 통일 |
| 2026-06-18 | fix: 패널 닫기 시 구 드롭다운 복원 버그 (_restoreMenuExpanded userActions 제거) |
| 2026-06-17 | feat: 내 보드 화면 목적지 정리 — 내 캐릭터/교환권/이용기록 기본 펼침, 패널 92vh, _afterGrowthRender(expandChar) 헬퍼 |
| 2026-06-17 | feat: 내 보드 프로필 영역 + 드롭다운 정리 — 대표캐릭터 아바타/닉네임/칭호/변경버튼, 드롭다운=내보드+로그아웃, 카카오사진 폐기 |
| 2026-06-17 | feat: 내 보드 4축 구조 + 서브시트 전체높이 — 최근알림/성장보드/음료교환권/이용기록 카드, height:calc(100vh-48px), 성장보드 헤더 대표캐릭터 아이콘 |
| 2026-06-17 | feat: 내 보드 카드→서브시트 구조 전환 — 메인 카드 3개 + profile-subsheet 바텀시트, gameSheet 계열과 분리 |
| 2026-06-17 | feat: 내 보드 3묶음 재구성 — 성장 보드(캐릭터+도감+업적)/이용·혜택(교환권+통계+활동기록) 그룹 박스, 기본 접힘, 헤더 요약 표시 |
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
