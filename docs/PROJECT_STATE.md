# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-25 (142차-88)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

### 142차 완료 항목 (2026-06-22)

| # | 내용 | 커밋 |
|---|------|------|
| 취향보드 Phase 1 전체 | 한줄소개·게임목록(추가/삭제/직접입력)·피하는유형 | 142차-1 |
| 게임시트 양방향 연결 | 좋아요/궁금해요 유저 아바타 → 접기/펼치기 (N명▾) | 142차-2, 8 |
| 토스트 → 취향보드 직접 진입 | `openProfilePanel('taste')` | 142차-3 |
| fix: gameData 필드 경로 | `g.display` → `g.title?.display` | 142차-5 |
| 검색 UX | ESC 닫기, 이미추가됨 표시 | 142차-6 |
| 취향보드 UX 개선 | 게임목록 더보기/접기, 피하는유형 UX(🚫/빨간), bio 예시 칩 | 142차-8,11 |
| 기록보드 사진 표시 | 최근 4장 썸네일 + 클릭→라이트박스 | 142차-8 |
| guide.html 오버레이 | 링크 클릭 → 인앱 iframe 시트 (✕ 닫기) | 142차-9 |
| 모임플래너 개선 | 자유댓글 제거, 참여자 클릭 → 아바타+bio+일정 시트 | 142차-10 |
| fix: 삭제 핸들러 Number() | `Number(gameId)` → `gameId || null` (한글 키 대응) | 142차-8 |
| fix: 신규 게임 삽입 위치 | `appendChild` → `insertBefore(more-wrap)` | 142차-12 |
| UX 5종 (142차-16) | 기록보드 사진 토글 버그, 피하는유형 기본접힘+count, 모임시트 닫기버튼, 가이드 ESC/배경 닫기 | 142차-16 |
| 버그 3종 + UI (142차-18) | 게임카드 스크롤 peek(@media 158px 오버라이드 제거), 이미지 경로 서브페이지 깨짐(normalizeImagePath), 다크율에 속죄를 제목 수정, 처음이시면 문구 추가, 게임 위치 전시된게임(G) 추가 | 142차-18 |
| 알림 4종 개선 (142차-19) | 교환권 지급/사용 관리자 알림패널 표시, 알림 개별 읽음 버튼, 알림 0건에도 버튼 표시, 후기→게임평 텍스트 변경. 카카오 알림 webhook 인프라 추가(adminWebhookUrl 설정 필요) | 142차-19 |
| UX 6종 + 자동완성 (142차-26~28) | 갈색띠 다중기록자, 알림 더보기 토글, 알림 재진입 읽음 유지, 자동완성 빈입력 suppress, 게임추가 autocomplete off, 게임평 label fix | 142차-26~28 |
| 취향보드: bio 멀티태그·공유 (142차-29~30) | 한줄소개 칩→다중선택 태그, 직접입력, 커뮤니티 공유 태그, 새 칩 4개 추가. 피하는유형 직접입력+커뮤니티 공유 | 142차-29~30 |
| 교환권 알림 Supabase DB webhook 전환 (142차-31~32) | JS fetch→Supabase DB webhook, voucher_log에 nickname/note 컬럼 추가, Make 라우터 지급/사용 경로 분리, 상품명 표시 | 142차-31~32 |
| 이미 좋아요한 게임 토스트 (142차) | 재클릭 시 2버튼 토스트 "이미 좋아요" 표시, 토스트 5초로 연장 | 142차 |
| curious 토스트 + curious_play 알림 (142차-37~41) | 궁금해요 게임 플레이 기록 시 본인 토스트(2단계 확인)+좋아요 전환 / 다른 사용자 인앱 알림 / tagged 알림에 "게임평 쓰러 가기 →" 링크 / 업적·교환권 토스트 8s+수동✕ | 142차-37~41 |
| 어드민 비주얼 분석 UI 개선 (142차-42~43) | 유입경로×페이지 N명(M회) / 차트 정수 눈금 / 주요유입 명 먼저 / 사용자별 기본 열림 / 30일 신규 카드만 / 방문자 3명 기본+더보기 / 관리자 방문 통계 미포함+crossUserMap 버그 수정 | 142차-42~43 |
| 다른 플레이어 프로필 보기 (142차-44) | 좋아요/궁금해요 칩 클릭 → 읽기전용 취향보드 시트 / getUserTasteProfile API 추가 / 본인 클릭 시 내 보드 취향탭으로 | 142차-44 |
| 리액션 칩 개선 (142차-45~51) | rep_achievement_id 코티지 캐릭터 이미지 우선 / 시트 슬라이드업 애니메이션(overflow:hidden+fill-mode:both) / 칩 구조 개선(버튼 안 ▾ 토글, 이름만 소형 태그) / is-active 시각 효과 제거(베이지 유지) / 취소 시 즉시 칩 반영(취소 분기에 _updateReactionSection 추가) | 142차-45~51 |
| 게임 위치 바텀시트 (142차-52~56) | openShelfSheet: 게임상세 위에 게임위치 iframe 시트 (z:9600) / embed=1 파라미터로 헤더·푸터 숨김 / highlight 칩 강조+섹션 맨 앞 정렬 / ← 뒤로가기 버튼 + 이전 게임시트 복원 / 게임 클릭 시 스택 (선반 숨김→게임B→닫으면 선반 복원, MutationObserver) / displayTags onclick 제거 / Z시리즈 0→없음, 종→개, 특수섹션 0개 표시 | 142차-52~56 |
| 리액션 토스트 통일 + 이용안내 embed (142차-57) | 좋아요 재클릭 확인 토스트 제거 → 직접 토글(궁금해요 방식으로 통일) / header.js embed=1 감지 → body.embed-mode + 헤더 미삽입 / guide.html openGuideOverlay에 ?embed=1 자동 추가 | 142차-57 |
| 관리자 섹션 재정렬 (142차-58) | groupCharts: 요약+날짜별 차트만 / groupReferrer(신규): 유입경로 차트+보조지표 / groupAnalysis 중간 배치 / 유입경로 메뉴 버튼 추가 | 142차-58 |
| 게임평 업적 버그 수정 (142차-59) | review 업적 카운트: 별점(game_ratings) → 게임평 텍스트(game_comments) / insertComment 후 checkAchievements('review') 트리거 추가 / getUserCommentCount 함수 신규 | 142차-59 |
| 게임시트 버튼 + 모달 z-index + 변수화 (142차-60~61) | 게임상세시트 게임평/플레이기록 섹션 헤더에 남기기/기록하기 버튼 추가 / 모달 z-index 2200→9700 / style.css z-index 전체 변수화: --z-profile(9100) --z-subsheet(9200) --z-sheet(9500) --z-shelf(9600) --z-sheet-modal(9700) --z-top(9999) | 142차-60~61 |
| 메인 게임시트 게임평 제출 후 미리보기 갱신 (142차-62) | onSubmitCommentModal에 initSheetCommentsPreview 추가 — 기존 initSheetComments(기록전체보기용)만 호출해 메인시트 미리보기가 갱신 안 되던 버그 수정 | 142차-62 |
| 플레이기록 수정 후 스크롤 유지 (142차-63) | renderRecords 재렌더 전후 scrollY 저장/복원(rAF) — 수정/삭제/사진삭제 3곳 | 142차-63 |
| 이번달 참여일정 카드 통합 (142차-64) | 함께한 시간 카드에 이번달 meeting_votes(내 투표) 표시 / 최대 2줄+"외 N건" / "M/D 정기모임" 형식 / 카드 패딩 축소 | 142차-64 |
| 게임시트 개선 다수 (142차-74~85) | 내 닉네임 ★ 표시 / 플레이기록·게임평 가로스크롤 미리보기 / 사진 첨부(play modal) / 게임평 "기존 플레이기록에 연동" / 전체기록시트 섹션순서(플레이→게임평→사진) / 더보기/닫기 토글 / 게임위치 협력→hard_coop/easy_coop 매핑 / reclassify-coop(협력 41개 재분류) / 사진 상세시트 아래로 펼치기(sheet-photo-grid) / 기본 4장 표시(짝수) | 142차-74~85 |

### 142차 테스트 목록

✅ SQL 실행 완료 (2026-06-24)
✅ 카카오 알림 webhook 연결 완료 → Supabase DB webhook 방식으로 전환 완료 (Make 시나리오 5213346, 142차-31~32)

**테스트 체크리스트:**
- [ ] 취향보드: 한줄소개 편집→예시 칩 표시→클릭→저장
- [ ] 취향보드: 게임 검색 추가/삭제 (카탈로그 & 직접입력)
- [ ] 취향보드: 6개 초과 시 "더 보기 (N개 더)" 표시 + 펼치기
- [ ] 취향보드: 검색 후 추가된 아이템이 "더 보기" 위에 삽입되는지 확인
- [ ] 취향보드: 피하는 유형 클릭→🚫 빨간, 재클릭→해제
- [ ] 게임시트: 좋아요 후 토스트 "취향 보드 →" 클릭 → 취향보드 직접 열림
- [ ] 게임시트: 좋아요/궁금해요 "N명 ▾" → 클릭 시 아바타 펼침
- [ ] 기록보드: 사진 섹션에 최근 사진 썸네일 표시 (사진 있는 유저)
- [ ] 기록보드: 사진 클릭 → 라이트박스
- [ ] guide.html: 플레이기록/동호회/요청하기/추천게임찾기 클릭 → 오버레이 시트
- [ ] guide.html: ESC / 배경 클릭 → 오버레이 닫힘
- [ ] 기록보드: 사진 "📸 N장" 버튼 클릭 → 토글 작동 확인
- [ ] 취향보드: 피하는 유형 기본 4개만 표시 + "더 보기 (4개 더)" 버튼
- [ ] 취향보드: 피하는 유형 태그 클릭 시 "N개 선택됨" count 갱신
- [ ] 모임플래너: 프로필 시트 ✕ 버튼 → 닫힘
- [ ] 모임플래너: 참여자 이름에 점선 밑줄 표시 + 클릭 → 아바타+소개+일정 시트
- [ ] 모임플래너: 자유댓글 섹션 미표시 확인

### 142차 보류 항목

| 항목 | 사유 |
|------|------|
| 한줄소개 GPT 연동 | 이전 기획 내용 복원 불가 — 사용자가 다시 공유 필요 |
| 모임플래너 참여자 UI 추가 개선 | 방향 논의 필요 (현재: 이름 클릭→프로필 시트) |
| 모임 플래너 Phase 3 게임 투표 | Red — Plan 필수, meeting_vote_games 테이블 신규 |
| 취향보드 Phase 2 (성향 5축) | Phase 1 테스트 후 진행 |

**다음 작업 후보 (우선)**
- **전체기록시트 플레이기록 카드 디자인 개선** — 현재 3건이 구분 없이 나열됨. 방안 A(개별 카드, 게임기록게시판 스타일)/B(구분선)/C(타임라인) 중 선택 후 구현. game-reviews.js 스타일 참고.
- **PC버전 게임위치 시트 크기** — openShelfSheet가 iframe 삽입, 현재 모바일 사이즈로 뜸. PC에서는 기존 게임상세 바텀시트 너비에 맞는 사이즈로 조정 필요. openShelfSheet CSS/JS 수정.
- **기록게시판 사진 미리보기 "+N장" 토글** — buildPhotoHtml(play-records-utils.js)의 "+N장" 클릭 시 나머지 사진을 가로(pr-rec-photo-wrap 안)로 펼치고, "접기" 클릭 시 다시 숨기는 토글. 현재는 lightbox로 연결됨(_attachPhotoLightbox 또는 game-reviews.js 핸들러). pr-rec-photo-wrap은 flex nowrap+overflow-x:auto → 펼치면 가로스크롤로 자연스럽게 확장.

**다음 작업 후보**
1. ~~**다른 플레이어 프로필 보기**~~ — 완료 (142차-44)
2. ~~**플레이기록 → game_curious 알림 (4-1)**~~ — 완료 (142차-36)
3. ~~**게임시트 curious 상태 변경 (4-2)**~~ — 완료 (142차-36, 토스트+자동해제 방식으로 구현)
4. **좋아하는 게임 drag reorder + 대분류** — Red, Plan 필수 (game_likes.sort_order 컬럼 신규)
5. **취향보드 Phase 2** — 성향 5축 (Phase 1 테스트 완료 후)
6. **모임 플래너 Phase 3 게임 투표** — Plan 필요 (meeting_vote_games 테이블 신규)
7. **게임평/사진 통합 (linked_record_id)** — 🔴 Red, Plan 확정 (2026-06-25) ← "기존 플레이기록에 추가하시겠어요?" 프롬프트 포함, 미구현
   - game_play_records에 linked_record_id (nullable FK → game_play_records.id) 추가
   - 게임상세시트: 게임평 남기기 / 사진 추가 / 플레이 기록하기 버튼 3개 통합
   - 저장 시 "기존 기록에 추가" 선택 옵션 (같은 게임 최근 기록 목록)
   - 기록 전체보기 카드: 연결된 항목들 닉네임 붙여 합산 표시 (호핀: "~", 나나: "~")
   - game_comments는 유지(기존 호환), 신규 입력은 game_play_records로 통일
   - 영향 파일: supabase-client.js, script.js, game-reviews.js
8. ~~**이번달참여일정 — 함께한 시간 카드 통합**~~ — 완료 (142차-64)
9. ~~**관리자 페이지 섹션 재정렬**~~ — 완료 (142차-58)
   - groupCharts: summary카드 + 날짜별 방문자 수만 남김
   - groupReferrer (신규): 유입경로별/페이지별방문/유입경로×페이지 + subAuxCharts
   - groupAnalysis를 groupCharts-groupReferrer 사이로 이동
   - 위험: groupReferrer is-open 기본값 설정 필요, 기간필터는 groupCharts에 유지
   - 새 카드 생성 X, 함께한 시간 카드 하단에 일정 섹션 확장
   - 최대 2개 줄 표시, 3개 이상이면 마지막 줄에 "외 N건"
   - 표시 형식: 각 줄에 "6/27 정기모임" (슬래시 구분 아닌 줄바꿈)
   - 4개 메인 카드(수집/취향/기록/교환권) 상하 패딩 10~15% 축소 → 일정 1줄 공간 확보
   - 영향 파일: kakao-auth.js (함께한 시간 섹션), style.css (카드 패딩)

> Discord 알림 전환 폐기 — 카카오 개인 알림으로 유지 (142차-25)

---

### 코드 품질 주석 (리팩토링 참고용)

- `kakao-auth.js` 취향보드 이벤트 핸들러: for 루프 + 이벤트 위임 혼용. 추후 서브파일 분리 검토.
- `club-schedule.html` `openProfileSheet`: 인라인 Supabase 클라이언트(`_cottageSupabaseDb`) 사용 — `window.CottageDB`와 별개. 통합 검토.
- `_buildTasteGameItems` 더보기: 아이템 추가 시 `insertBefore` 처리. 대량 추가 시 재렌더 방식 검토.
- `script.js` `onSheetLike`/`onSheetCurious`: is-active wrap 동기화가 여러 곳에 분산. 리팩토링 시 `_setLikeActive(active)` / `_setCuriousActive(active)` 헬퍼 함수로 통합 권장. (142차-57에서 onSheetLike 단순화 — 확인 토스트 제거)

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

현재 알려진 버그 없음.

**142차-88 수정 내역 (2026-06-25):**
- [x] 알림 날짜에 시간(HH:MM) 추가 — kakao-auth.js `fmtShort`
- [x] 첫기록 보상 알림 순서 — 교환권 수령자는 알림 목록 아래로 (미수령 시 상단 유지)
- [x] 플레이기록 수정/삭제 권한 — user_id 없는 구기록은 nickname 폴백으로 isMine 판정
- [x] 기록게시판 ··· 드롭다운 — getBoundingClientRect+fixed 포지셔닝으로 pr-session overflow:hidden 클리핑 해결
- [x] 기록게시판 💬👍 버튼 — href="#" → button으로 스크롤 상단 이동 제거
- [x] 방문자 목록 회원/비회원 필터 — #visitorExtras 카드도 필터에 포함

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
- [x] **게임 위치 0종 카테고리 숨기기** — games.length === 0 시 렌더 스킵 (140차)
- [x] **모임 일정 페이지** — club-schedule.html로 통합 완료 (141차). 달력+겹침계산+슬라이더+자유댓글. club-meeting.html → redirect. ⚠️ Supabase meeting_votes 테이블 생성 필요
- [ ] **동호회 가입 추적** — page_sessions 데이터 활용
- [ ] **관심 기반 묶음 알림** (Red, Plan 필수)
  - 개별 알림 → 유형별 묶음 방식 전환
  - notifSeenAt → `{ tagged, review, play_record, purchased }` 확장
- [x] **유입 경로 first_source 저장** — profiles.first_source TEXT, 신규 유저 upsert 시 _sessionReferrer 1회 저장 (140차)

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
