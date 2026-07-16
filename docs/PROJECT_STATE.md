# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-07-16 (R1~R8 완료 후 §0 슬림화 — git 중복 진행서술·해결버그 제거, R9 승인 플랜은 REFACTOR_CHECKPOINT.md로 박제)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

### 🔵 CHECKPOINT: 전체 리팩토링 순차 처리 (2026-07-15 시작, R1~R10 중 진행 예정 — **상세는 `docs/REFACTOR_CHECKPOINT.md` "처리 계획" 표 참조**)

REFACTOR_CHECKPOINT.md 감사 결과(Red 6건 + 새로 발견된 GR3) + 이번 세션 발견분(dead code·중복)을 리스크 오름차순으로 R1~R10 세션으로 분할, 항목별 모델(Sonnet/Opus)·effort·Plan 필요 여부 배정 완료. **매 항목 시작 전 그 표의 모델과 현재 활성 모델이 다르면 멈추고 전환 요청, 진행 상태(⏳/✅)는 그 표에서 갱신.** 감사 자체가 안 된 대형 파일(game-sheet.js 2693줄·index-page.js 1594줄·day-detail.js 1180줄)은 R1~R10 이후 별도 Phase 3 감사 세션 필요 — 문제 목록 없음, 지금은 계획 밖.

**진행 상황**: **R1~R8 ✅ 완료** (2026-07-16, 상세는 git log + REFACTOR_CHECKPOINT.md 각 항목행). 요약: R5·R7·R8은 재검증 결과 이미 해소/과최적화라 코드변경 없거나 죽은코드 제거만(behavior-preserving), R6은 소급지급 side-effect 분리 + readOnly write 버그 수정. **다음 = R9(승인 플랜 실행 대기)**.

**남은 스모크(선택)**: R3·R6 브라우저 확인 완료. **R4**(사진첨부 후 새로고침해야 표시·사진클릭 썸네일/삭제버튼 없음)·**R2**(취향 게임추가 새로고침해야 반영)는 크로스보드 stale/리로딩(아래 버그2-b)과 같은 뿌리라 **R10 동반 검증으로 이월**. **R1**(알림 읽음)은 알림 부재로 보류(다음 알림 발생 시).

**R10 동반 처리로 이월된 열린 항목 (2026-07-16):**
- ⏭️ **[버그2-b → R10 이월]** **크로스보드 stale**: 취향보드(`likedGames`)와 모임보드 박스(`_meeting.likedGames`)가 같은 `game_likes`를 패널오픈 시 **각각 따로 불러와 별도 배열 2개**로 보유 → 한쪽에서 추가/삭제해도 반대 보드엔 **새로고침 전까지 미반영**(`getMeetingProfile`이 내부에서 `getUserLikedGamesAll` 재호출). `cottage-likes-changed` 이벤트는 열린 서브시트 DOM/슬러그셋만 갱신(닫힌 보드 배열 못 건드림). **해결 방향 A(진입 시 DB 재조회=단일 소스)로 R10(KA1) 리팩토링과 함께 처리 확정** — 그때 스냅샷 임시방편도 대체. 사용자 승인(2026-07-16): R10 맨 마지막이라 그때까지 크로스보드 stale 잔존 감수.
- ⏭️ **[신규기능 3-1 → 백로그 이월]** 알림→읽기전용 보드→뒤로가기 복귀. 신규 네비게이션 스택이 필요하고 `openProfilePanel`(KA1) 한복판이라, R10(KA1 리팩토링)과 함께/후에 처리로 이월(§3 "타인 보드 내부 네비게이션 통일"에 병합 기록).

**다음 세션 시작점**: **R9 실행** — GR3 `game-reviews.js` 과대함수 분리. **플랜 이미 승인·박제됨**: `REFACTOR_CHECKPOINT.md` 맨 아래 "R9 승인 플랜" 소절을 그대로 실행(4개 추출·줄범위·보존주의·스모크 포인트 전부 기록됨). Opus xhigh. 착수 시 모델만 확인하고 Plan 재작성 불필요. 이후 R11~R13은 "처리 계획" 표 순서.

### ✅ 종료: 읽기전용 내 보드 + 취향 연동 + 좋아요 동기화 (2026-07-14~15, Phase A~E 전부 완료 + 실서버 스모크 확인 완료)

`openProfilePanel(autoSubsheet, {userId, readOnly})`로 남의 보드를 편집 없이 통합 표시(취향/모임/기록보드), 좋아요 전역 이벤트 동기화(`cottage-likes-changed`), 진입점 정리(`.sched-bar-name`→모임보드, 그 외 닉네임 클릭→읽기전용 내 보드), 모임보드 밀도 정리(요일배지·✨마크·게임 썸네일·인원조건 표시 등). 상세는 git log(커밋 68e2de4~3d99561) 참조. 알려진 잔여 한계: readOnly 닉네임 미확정으로 "태그된 참여 기록" 일부 미포함(getMyStats nickname=null).

### ✅ 종료: 미보유 게임 기록시트 + 게임평↔플레이기록 연동 (2026-07-14~15, Red, Stage 1·2·3 전부 완료)

미보유 게임도 `openGameRecordSheet`로 열리게 확장(좋아요/게임평/사진/플레이기록), 게임평 저장 후 내 플레이기록 연동 넛지, 남의 세션에 내 후기로 즉시 참여(`_openJoinConfirm`, 확인창 방식). 상세는 git log(커밋 cb07c8c~2666afa) 참조. 남은 실서버 확인 항목: ①미보유/보유 게임 넛지·⋯메뉴→저장 후 게시판에 같은 세션 아래 내 후기 나란히 표시되는지 ②`.sheet-rec-more`(⋯) 메뉴 위치·간격(내 기록 ✏️/✕와 공존). 미착수 후속(§3 이관): 뽁님 7/11 게임평↔호핀 플레이기록 연결.

---

### 론칭 후 이월 (2026-07-09 기준)

모임 개편 완료 후 미착수 또는 기획만 된 항목. 론칭 후 별도 세션에서 진행.

| 항목 | 분류 | 비고 |
|------|------|------|
| 집계 모달 리디자인 | feat | 센터모달 집계 화면 개편. 이식 후보: renderHourlyBreakdown/renderOverlap (git 8cdc4df 직전 club-schedule.html) |
| 내 등록 관리 동선 | feat | Step 1 "등록됨" 칩 클릭 → 해당 날짜 편집 모드 직행. 009 upsert 경로 선확인 필요 |
| 여러 주차 사전 등록 확장 | feat | 현재 Step1 주 네비로 선택 가능하나, 주 단위 복수 예약(사전등록 대량 입력) UX 미완 |
| Hero CTA A/B | design | 버튼 문구·보조 문구·크기 비교 테스트 |
| 관리자 분석 2단계 (데이터) | feat | 요일별 집계, 재방문율, 회원가입/도감 퍼널 신규 이벤트 |
| 관리자 분석 3단계 (연결) | feat | 2단계 데이터를 탭에 연결 + 빈 데이터/로딩/예외 처리 |
| 퍼널 시스템 | feat | PLAN_funnel_analytics.md 기반. DB/이벤트 설계 확정 필요 |
| 게임위치 카테고리 스티키 헤더 | design | 게임위치 바텀시트 내 카테고리 헤더 고정 |
| 소개글 알림 개별 분리 | feat | 카카오/Discord 알림에서 Make 라우터 분기 (코드 외 작업) |
| `played_at NULL` 소급 판단 | data | 기존 4개 게임 NULL 기록 — 정상 데이터인지 보정 대상인지 확인 |
| 취향보드 즉시 갱신 확인 | verify | 게임 추가/삭제 후 홈 카드 미갱신 여부 재확인 |
| 추천게임 전체카드 고정헤더 점검 | verify | 추천 필터 전체화면 모드에서 헤더 sticky 동작 확인 |
| 이번 주 모임 섹션 추가 기획 | feat | 날짜별 미니 막대 상세화, 모임 참여 버튼 연결 (낮은 우선순위) |

---

### 코드 품질 주석 (리팩토링 참고용)

- `kakao-auth.js` 취향보드 이벤트 핸들러: for 루프 + 이벤트 위임 혼용. 추후 서브파일 분리 검토.
- `_buildTasteGameItems` 더보기: 아이템 추가 시 `insertBefore` 처리. 대량 추가 시 재렌더 방식 검토.
- `script.js` `onSheetLike`/`onSheetCurious`: is-active wrap 동기화가 여러 곳에 분산. 리팩토링 시 `_setLikeActive(active)` / `_setCuriousActive(active)` 헬퍼 함수로 통합 권장. (142차-57에서 onSheetLike 단순화 — 확인 토스트 제거)
- `game-reviews.js` `buildGameBody` — 어디서도 호출되지 않는 dead code(2026-07-15 Phase D 검증 중 발견, 실서버 테스트로 게임별 보기가 실제론 게임 카드 그리드만 렌더함을 확인). 삭제 시 회귀 위험 낮음, REFACTOR 세션에서 정리 권장.

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, 다기기 복원)
- [x] 내 보드 패널 — 메인(4카드) + 서브시트(성장/교환권/이용기록/취향보드) + 프로필 영역(대표캐릭터/닉네임/칭호)
- [x] 취향 보드 Phase 1 (142차) — 한줄소개(bio), 좋아하는/해보고싶은 게임(추가/삭제/직접입력/ESC 닫기/이미추가됨 표시), 피하는 유형 태그, 좋아요 토스트→취향보드 직접 진입
  - ⚠️ **SQL 미실행**: Supabase SQL Editor에서 실행 필요 (커밋 메시지 참조)
  - 게임 시트에 좋아요/궁금해요 유저 아바타 목록 표시 (getGameLikers/getGameCuriousUsers)
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
- [x] 따봉/궁금해요 토글 + 좋아요/궁금해요한 유저 아바타 목록 표시 (142차-2)

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

### 알려진 제한사항

| 항목 | 내용 |
|------|------|
| 관리자/로컬 카운팅 제외 기준 통합 (2026-07-02) | 143차-189에서 localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID=4916417947)는 `page_views`, `page_events`, `page_sessions`, `anon_sessions`, `profiles.visit_count/total_minutes/today_seconds` 누적에서 제외하도록 통합. 관리자 분석 화면도 관리자 user_id가 붙은 rows/pageViews/profiles를 표시 집계에서 제외. 과거에 user_id 없이 쌓인 관리자 추정 page_views는 식별 불가하므로 삭제/소급 보정하지 않음. |
| 방문자 통계 명/회 역전 (2026-07-01) | 143차-190에서 `page_views.session_key` 추가 계획/마이그레이션/코드 반영. 신규 데이터는 `__visitor__` 행 안의 `user_id || session_key`로 명/회를 함께 계산한다. 실제 운영 DB에 `docs/migrations/007_page_views_session_key.sql` 적용 전에는 관리자 화면이 fallback 조회를 사용하며, 과거 NULL 행은 행 단위 fallback으로 집계한다. |
| 기록보드 플레이기록 시간 | 기록보드에 표시되는 플레이기록 시간이 전부 09:00으로 표시됨. 원인 미확인 |
| 서브시트(취향보드 등) 상단 모서리 음영 (2026-06-30) | 사용자가 스크린샷으로 보고한 모서리 음영 — 시도한 가설 3건 모두 효과 없음: ①`.profile-activity-toggle` 상단 radius 제거, ②`.profile-subsheet-header` radius를 box와 맞춤(overflow:hidden이라 무의미함 확인), ③`.profile-subsheet-header`에 `background:#fff` 추가(외부 GPT 의견, 적용했으나 미해결). 다음 시도 전 확대 스크린샷으로 정확한 형태 확인 필요 |
| 이용시간 기기 중복 | 동일 유저가 여러 기기에서 동시에 사용 시 각 기기 시간이 모두 합산됨 |
| 사진 배열 전체 삭제 | `deletePlayPhoto`는 photo_url = null로 전체 삭제 (개별 URL 삭제 불가) |
| 관리자 페이지 금일이용데이터 | 간헐적 미표시 — 원인 불명, 별도 조사 필요 |
| TITLE_DEFS 미배정 칭호 3개 | `title_record_150` / `title_review_100` / `title_review_500`가 TITLE_DEFS에 정의돼 있으나 ACH_DEFS 어디서도 `rewards.title`로 참조되지 않음. 의도적 예약인지 잔존 버그인지 확인 필요 |
| 단기 방문 시간 미표시 | heartbeat 전 종료 시 `duration_sec=0` → 관리자 분석에서 시간 표시 안 됨. 추적 로직 변경 필요, 별도 작업 (143차-197 이관) |
| ~~모바일 "이번주모임 미리보기" 일요일 레이아웃 밀림~~ | ✅ **해결** (2026-07-15, 3차 수정으로 최소화 완료). 원인: `#meetingDays`(`.meeting-day-chip` 7개, `flex-wrap:wrap`)가 좁은 모바일 뷰포트에서 컨테이너 폭을 근소하게 초과 — 투표 인원수 텍스트가 있는 요일 칩만 폭이 넓어져 참여자가 몰린 주(예: 금1·토2·일2)에만 7번째 칩이 다음 줄로 밀림. 1차(gap 6→4, padding 6px10px→6px5px, min-width 36→32) 과다 축소로 사용자 재지적 → 2차(gap 6 복원, padding 6px7px, min-width 34)도 "여전히 필요 이상으로 줄임"이라는 재지적 → **3차: padding만 6px10px→6px9px(각 변 1px), gap·min-width는 원래값(6px/36px) 그대로 유지**로 최소화. 340px 미만은 원래 디자인도 줄바꿈되던 구간이라 그대로 두고, 340px 이상(실사용 전 구간) 줄바꿈 해소 재확인(스크린샷 대조) |
| ~~이번 주 하고싶은 게임에 취소된 테스트 게임 잔존~~ | ✅ **해결** (2026-07-15). 원인: `meeting_vote_games` orphan 행 2개 — id=22(vote_date 2026-07-08), id=36(vote_date 2026-07-17), 둘 다 user_id=4916417947(오너), 대응하는 `meeting_votes` 행 없음(참여 취소됨). `deleteMeetingVote` cascade 삭제(커밋 de89af8, 2026-07-14)가 이후 취소부터만 적용돼 그 이전 생성분(created_at 07-07·07-13)이 소급 정리 안 된 것. 사용자 승인 후 anon 키 DELETE로 두 행 제거, 재조회로 삭제 확인. 코드 변경 없음(향후 신규 취소는 기존 cascade 로직으로 자동 처리됨) |
| ~~플레이기록 수정 시 업적 미반영~~ | ✅ **해결** (2026-07-15). 원인: `recordGamePlay`(신규 등록)만 `checkAchievements`를 호출하고 `updateGamePlay`(수정 — 사진 후추가 8곳 + 인라인 전체수정 포함)는 어디서도 호출 안 함. 사진 추가로 photo 축 임계값을 채워도, 참여자 수정으로 play/balance 축을 채워도 다음 신규 기록 등록 전까지 지급 안 됨. `updateGamePlay`(supabase-client.js)에 `record`/`play`/`balance` 재체크를 추가해 8개 호출처 공통 해결. |
| "이날 참여 등록"/"플래너에서 등록하기" 닫을 때 플래너 깜빡임 (2026-07-16, 미해결) | 홈에서 등록시트로 바로 들어가는 흐름(`index-page.js` `__openPlannerFor`, `club-schedule.html` `is-quick-entry`)에서 등록시트를 닫으면(`close()`) 플래너 주간뷰가 잠깐 켜졌다 꺼짐. 백지 배경 노출은 해결(3차 수정, 커밋 74f6345)했으나, 이 잔여 깜빡임은 "켜진 뒤 끄기"(is-quick-entry 클래스+cottage-quick-entry-closed 메시지로 부모 모달 닫기) 방식 자체의 타이밍 문제로 추정 — 사용자 피드백: 애초에 안 켜지게 만들어야지, 켜지는 로직은 그대로 두고 끄는 기능만 덧붙이면 안 됨. 다음 시도 전 재설계 방향 검토 필요(예: club-schedule.html 전체를 안 띄우고 등록 UI만 별도 구성). |
| 모임일정 삭제가 홈 미리보기에 즉시 반영 안 됨 (2026-07-16, 미해결) | 모임 등록 시엔 홈 "이번주 모임 미리보기"에 바로 반영되는데, 등록을 취소(삭제)하면 반영 안 되고 새로고침해야 사라짐. 삭제 직후 다시 "모임 등록" 버튼을 누르면 이미 취소된 날짜인데도 "등록됨" 상태로 표시돼 재등록이 막히고, 새로고침 후에야 재등록 가능. 원인 미조사 — 등록 경로(`cottage-meeting-saved`→`_meetingReload`)와 달리 삭제 경로가 홈 미리보기 캐시/리로드 신호를 안 태우는 것으로 추정. 관련 파일 추정: `assets/js/index-page.js`(`_meetingReload`, `cottage-meeting-changed` 리스너), 삭제 호출부(`deleteMeetingVote`). |

---

## 3. 추후 작업 목록

### P1 — 기능 (중요)

- [x] **관리자 카카오 알림 확장** — 신규 회원 가입(profiles INSERT) + 교환권 사용(voucher_log INSERT) 시 카톡 알림. Supabase DB webhook → Make.com 시나리오 5213346 Router 3개 분기 (140차)
- [x] **업적 8축 순서 재배열** — record→first_record→new_game→play→photo→review→visit→balance (118차)
- [x] **달성 업적 아이콘 컬러 적용** — .is-achieved .profile-ach-img-lock { filter: none } 추가 (118차)
- [x] **업적명·내용·아이콘 불일치 수정** — new_game_10/30/300 🦉→게임이모지, review_5/25/300 🦊→글쓰기이모지 (118차)
- [x] **rare 캐릭터 축 대표 오탐 수정** — _topCharPerAxis에서 rare_ 접두사 캐릭터 제외 (118차)

### P2 — 기능 (선택)

- [x] **게임시트 상단 레이아웃 개편** (커밋: 39fe161) — sheet-img-col 제거, sheet-en-title을 sheet-title-block 최상단으로 이동, 버튼 한 줄 배치([꽂혀있는 책장 보기][룰영상 보기]), 헤더 썸네일 클릭 시 _openCoverModal() 표지 확대 모달.

---

- [x] ~~[기술부채] 오늘 이벤트 수 집계 날짜 비교~~ — ✅ **해결** (2026-07-15). `initHeroStats`가 `created_at`(UTC)의 `slice(0,10)`을 KST 오늘 날짜와 직접 비교해 KST 00~09시 이벤트가 UTC 전날로 잘려 누락되던 것을, `kstDateStr`(created_at을 +9h 변환 후 slice) 헬퍼로 양쪽 모두 KST 기준 비교하도록 수정. node로 KST 경계(00:30/08:30/23:30/내일/어제/null) 7케이스 검증 통과. 관련 파일: `assets/js/index-page.js`.

- [ ] **[PC 리팩토링] 타인 보드 내부 네비게이션 통일** — 모임보드→취향보드 등 전환이 바텀시트로 뜸. 내 보드와 동일한 센터모달 + 고정 헤더 + 뒤로가기로 통일.
  - **3-1 (2026-07-16 요청 병합)**: 알림('냐냐뇨뇨님이 소개글 올렸어요') 클릭 → `openOtherMeetingSheet` → `openProfilePanel(readOnly)`가 **내 패널을 제거하고 남의 보드로 교체**(kakao-auth.js:572)라 돌아올 경로 없음. 필요 동작: 남의 보드에 뒤로가기 → 내 보드/알림 페이지로 복귀(진입 전 패널 상태 스택 복원). **신규 기능 = 네비게이션 히스토리 스택 필요. `openProfilePanel`(KA1, 1972줄) 한복판이라 R10(KA1) 리팩토링과 함께/후에 처리 권장** — 지금 넣으면 R10에서 재작업됨.
- [ ] **[검토] 기록보드 타인 공개** — 요약(플레이 수·게임평)만 부분 공개 또는 본인 설정 온오프. 함께한 시간은 비공개 유지 확정.
- [ ] **[디자인] 모임보드 개선** — 미입력 필드 노출 방식, 일정 막대 정보 밀도, 하고 싶은 게임 0개 빈 상태.
- [x] ~~게임평→캐릭터/업적 미반영~~ (A-7, 2026-07-12) — ✅ **해결** (2026-07-15). 원인: 지급 로직(`checkAchievements('review')`→`getUserCommentCount`)은 정상이었으나, 진행도 표시 4곳(achievements.js COUNTS)이 `review` 축에 `ratingCount`(별점 수)를 쓰고 있어 게임평을 써도 진행도가 안 오르는 것처럼 보였음(해금 자체는 DB 업적 기준이라 실제론 됐음). `_fetchUserStats`의 `getUserRatingCount`→`getUserCommentCount` 교체, `ratingCount`→`commentCount` 리네이밍으로 표시를 지급 기준과 통일.
- [ ] **[verify] 오늘 고친 업적 버그 2건 실서버 확인** (2026-07-15) — ①게임평 진행도(커밋 22488d7): 게임평 쓰고 성장보드에서 review 진행도(게임평 N개 기준)가 오르는지 ②플레이기록 수정 후 업적(커밋 7a1b68d): 기존 기록에 사진 후추가/참여자 수정으로 photo·play·balance 임계값 채웠을 때 즉시 업적 뜨는지. 브라우저 눈 확인만 남음.
- [ ] **지난 일정 흐리게+수정불가** (A-10) — 모임보드/플래너에서 지난 날짜 일정 흐리게 + 편집 차단. (2026-07-16 추가) 메인 "이번주 모임 미리보기"의 "플래너에서 등록하기"/"이날 참여 등록" 버튼도 대상 — 지난 날짜는 클릭해도 무반응(`club-schedule.html`의 `ds >= toDateStr(TODAY)` 체크로 무시됨)인데 흐림 처리가 없어 비활성 상태를 알 수 없음. 관련: `assets/js/index-page.js` renderPreview/empty-state 렌더.
- [ ] **캡션 복사 인스타/단톡 분리** (A-8) — 사진 캡션 복사를 인스타용/단톡용 포맷 분리.
- [ ] **접근성 개선** — 아이콘 버튼 title/aria-label, 폼 label 부여 (DevTools Issues 기준).
- [ ] **[보류] 한줄소개 GPT 연동** — 이전 기획 복원 불가, 사용자 재공유 필요.
- [ ] **[보류] 취향보드 Phase 2 (성향 5축)** — Phase 1 테스트 후 진행.
- [ ] **[보류] 모임플래너 참여자 UI 추가 개선** — 방향 논의 필요 (현재: 이름 클릭→프로필 시트).
- [ ] **뽁님 7/11 게임평 ↔ 호핀 플레이기록 연결** (2026-07-15 요청, 미착수) — 뽁님의 7/11 레비아탄와일드·원더랜드워-풀확 게임평(game_key만 정정 이동됨, 플레이기록 미연동)을 호핀이 작성한 7/11 플레이기록과 연결. "남의 세션에 내 후기로 참여"(Stage 3, `_openJoinConfirm`) 기능으로 커버 가능해 보이나 실행 주체(뽁님 직접 UI vs 운영자 DB 처리) 미확정 — 착수 전 확인 필요.

- [ ] **메인 최근 플레이 미리보기 클릭 비활성** (2026-07-16 기록, 미착수) — 메인 페이지 "최근 플레이 미리보기" 카드에서 ①게임 썸네일 ②인원 ③사진이 전부 클릭 안 됨. 게임시트/라이트박스 등으로 연결되게 클릭 가능화 필요. 관련 파일 추정: `assets/js/index-page.js`(홈 미리보기 렌더). 착수 시 게임별 보기/바텀시트와 동일 진입점 재사용 검토.

- [ ] **내 보드 수집보드 스크롤 진입점 수정** (JS) — ① 캐릭터 수정 버튼 클릭 → "내 캐릭터" 타이틀 위치로 스크롤 (현재: 그 아래로 진입). ② 칭호 클릭 → "칭호" 타이틀이 화면 상단에 오도록 (현재: 아래로 내려간 채 진입). ③ 캐릭터 이름 클릭 → 캐릭터 타이틀로 이동 (현재: 칭호 섹션으로 진입). 관련 파일: `assets/js/kakao-auth.js` 수집보드 서브시트 open/scroll 로직.

- [ ] **게임 검색 영어 제목 인식** — 검색창에서 영어로 입력 시 `bggTitle`로도 매칭. 게임정보 시트 영어제목 독립 표시 작업 이후 자연스러운 연계.

- [x] **게임 위치 페이지** (game-location.html) — 책장 위치 기능 구현 완료 (이전 세션)
- [x] **게임위치 협력게임 난이도 분류** — bgg.weight >= 2.5 → 어려운 협력(C-1), 미만 → 쉬운 협력(B-1), 41종 자동 분류 (118차). script.js 바텀시트도 동일 로직 적용 (134차)
- [x] **페이지별방문 내 보드 + 서브시트 카운팅** — trackPageView('my-board*') + admin 가상페이지 집계 (118차)
- [x] **방문자목록 회원/비회원 분류 버튼** — 전체/회원/비회원 토글 버튼 추가 (118차)
- [x] **게임 위치 0종 카테고리 숨기기** — games.length === 0 시 렌더 스킵 (140차)
- [x] **모임 일정 페이지** — club-schedule.html로 통합 완료 (141차). 달력+겹침계산+슬라이더+자유댓글. club-meeting.html → redirect. ⚠️ Supabase meeting_votes 테이블 생성 필요
- [ ] **동호회 가입 추적** — page_sessions 데이터 활용
- [ ] **관심 기반 묶음 알림** (Red, Plan 필수)
  - 개별 알림 → 유형별 묶음 방식 전환
  - notifSeenAt → `{ tagged, review, play_record, purchased }` 확장
- [x] **유입 경로 first_source 저장** — profiles.first_source TEXT, 신규 유저 upsert 시 _sessionReferrer 1회 저장 (140차)

### P2-admin — 관리자 분석 페이지 추가 작업

- [x] **유입 차트 바 안에 시간 표시** — `refTimeLabelPlugin` (afterDatasetsDraw) 완료
- [x] **방문 탭 차트 시간 표시** — `chartHourly` page_views 기반이라 duration_sec 없음, `chartDaily` line 차트라 불가 → 추가 작업 없음으로 확정

### P3 — 인프라

- [x] **로그인 메뉴 HTML 공통화** — assets/js/header.js 생성, 15개 HTML 파일 script 태그로 교체 (137차)
- [x] **renderSingleGame / ?game= 처리** — game-reviews.js dead code(GAME_ID) 삭제 완료 (137차)
- [x] **동호회 소개글 알림** — 소개글 올린 회원에게 new_intro 타입 묶음 알림 (N명이 소개글 올렸어요). supabase-client.js getMyNotifications + kakao-auth.js 렌더링 (138차)
- [x] **getPageAnalytics 조회 방식 개선** — limit(5000) → 최근 90일 필터 + limit(20000)로 교체. 25일치 → 90일치로 확장, raw는 DB에 유지 (139차)
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] price-rules.html / club-rules.html 사진 중심 재구성
- [ ] **기록게시판 디자인 개선** — 현재 너무 밋밋, 전반적 비주얼 리뉴얼 필요
- [ ] **[보안] meeting 계열 쓰기 보호** (2026-07-15 조사 완료, **사용자 결정=문서화 후 보류**) — `meeting_votes` / `meeting_vote_games` / `meeting_game_prefs` 전체 현재 UNRESTRICTED (anon 키로 전체 읽기/쓰기/삭제 가능).
  - **위협 모델**: 서버측 신원 증명 부재가 근본 원인. 클라이언트가 `user_id`(카카오 id)를 자기 주장할 뿐 검증 단계 없음 → anon 키(페이지 소스에 노출, 정상)만 알면 아무 user_id로나 남의 일정 write/delete 가능. **단 meeting 테이블엔 금융·PII 없음**(날짜/시간/게임선호/닉네임) → 실제 위협은 "REST 직접 호출 가능한 사람이 동호회 일정 훼손·사칭" 수준, 심각도 중간 이하.
  - **범위 주의**: 이건 meeting만의 문제가 아님. 카카오 OAuth라 `auth.uid()` NULL → **전체 테이블이 RLS off + anon 키 직접 write** 동일 구조(game_likes, game_play_records, profiles, member_intros …). meeting만 고치면 반쪽.
  - **쓰기 호출부 8개**(전부 supabase-client.js): `upsertMeetingVote`/`deleteMeetingVote`(votes), `addMeetingVoteGame`/`setMeetingVoteGamePriority`/`setMeetingVoteGameCondition`/`removeMeetingVoteGame`(vote_games), `saveMeetingGamePref`/`deleteMeetingGamePref`(game_prefs).
  - **근본 해결 = Edge Function + 카카오 토큰 검증**: 클라가 카카오 액세스 토큰 동봉 → Edge Function이 kakao `/v2/user/me`로 신원 서버검증 → service_role로 user_id 일치 행만 write. **결정적 제약**: 현재 카카오 토큰을 로그인 후 저장 안 하고 버림([auth-callback.html:86](../auth-callback.html#L86)) → **토큰 저장·refresh 흐름을 신규 구축**해야 하고 만료 시 write 실패 UX 처리 필요. 추가로 Edge Function 배포 인프라(Supabase CLI, 지금까지 SQL Editor만 사용 — **배포 권한/환경 확인 선행**) + 마이그레이션 010(테이블 잠그고 Edge Function만 write).
  - **착수 조건**: Red, Plan 모드 + Opus xhigh 고정. 착수 전 ①Edge Function 배포 가능 환경인지 ②meeting만 vs 앱 전체 범위 재확정. RLS UNRESTRICTED 배지는 그때까지 의도적 유지.

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

