# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-07-09 (인원조건 라벨 실제 인원수 표시)

---

## 최근 완료 (2026-07-09)

| 커밋 | 내용 |
|------|------|
| (이번) | feat: 인원 조건 라벨에 실제 베스트/추천 인원수 표시 — COTTAGE_GAMES에 bestPlayers/recPlayers 추가(game-display-adapter.js), day-detail.js에 fmtPlayerArr+condLabel+window.formatCondLabel 헬퍼 추가, condBadgeHtml 헬퍼 적용, 개인 모달 isMine=false 조건 표시 추가, club-schedule.html Step 3 칩 레이블 formatCondLabel 적용. 형식: 단일→"베스트 4인", 연속범위→"추천 3~7인", 비연속→"베스트 3·5·6·8인", 데이터없음→"베스트인원" 폴백 |

## 최근 완료 (2026-07-08)

| 커밋 | 내용 |
|------|------|
| f21c8d7 | 막대 게임명 표기 가변화 — gameAbbrs(durationH) 파라미터화, barRow에서 실제 체류시간 전달. 기준: <4h=2개, 4~5h59m=3개, ≥6h=4개 |
| 8052782 | 룰렛 약칭 1글자 버그 fix — # 접두사 slice 전 제거 누락(c0a495c bar-only 수정의 룰렛 미적용 경로). game_id=null 게임 이름 기반 COTTAGE_GAMES 조회 추가 |
| 601af4e | 메이지나이트 얼티밋 에디션 약칭 등록 (248562→메나) + output 재빌드 |
| 0019bdd | 베스트/추천 칩 disabled 오판 fix — isManual(game_id===null) → gameData bestPlayers/recommendedPlayers 실제 데이터 기준으로 교체, 이름 기반 2차 조회 추가 |
| 9e539d5 | Step 2 시간 슬라이더 CSS 복원 (8cdc4df에서 삭제됐던 8개 규칙 원상복원) |
| d438902 | Step 3 등록 플로우 ⭐·인원조건 칩 — club-schedule.html: gameListHtml ⭐ 버튼 want→공통, 조건 칩 행 [무관\|베스트\|추천\|2인~5인+](직접입력 베스트/추천 disabled). ⭐ max 카운트 want+learn 합산. addGameStep2 entry player_condition:'any' 초기화. _gameMap 프리로드 is_priority+player_condition 포함. saveAll is_priority·player_condition want+learn 모두 전송(항상). API 파라미터 순서(listType, value) 준수. CSS 3종 신규. |
| (이전) | Stage 7 판정 — 센터모달 게임 칩 인원 조건 배지: peakCnt(기존 계산 재사용) 기준 미충족 시 .dd-cond-badge 병기. 판정 로직: '2'/'3'/'4'/'5+' → 수치 비교, 'best'/'recommended' → window.gameData[id].bgg.bestPlayers/recommendedPlayers(숫자 배열) 포함 여부, 직접입력(game_id=null) → 조건명만, 'any' → 표시 없음. aggrConds 중복 제거. CSS .dd-cond-badge 신규. |
| (이전) | setMeetingVoteGameCondition/Priority listType 파라미터 확장 + ⭐ learn 확장 — supabase-client.js: 두 함수에 listType 파라미터 추가(list_type='want' 하드코딩 → 동적), max_priority 카운트 want+learn 합산으로 변경. day-detail.js: buildWantSection+buildLearnSection → buildGameSection 통합, learn 행에 ⭐ 토글+인원조건 select 추가, gameAbbrs 정렬(⭐ 타입 무관 최우선), aggrPriority/chip star learn 포함, data-listtype 속성 추가, myGames.find(+listType 매칭). CHECKPOINT+js-api.md 갱신 |
| (이전) | 7단계 인원 조건부 선호 UI — day-detail.js: buildWantSection에 COND_LABELS+<select class="dd-cond-select"> 추가(isMine 조건, player_condition 초기화, change→setMeetingVoteGameCondition·실패 시 복구), CSS .dd-cond-select 신규. supabase-client.js: setMeetingVoteGameCondition 함수 신규(list_type='want' 가드, not_found/db_error/exception reason, console.error), CottageDB 노출 추가. js-api.md 갱신 |
| (이전) | 2.7단계 개인 모달 ⭐ 토글 — day-detail.js: openDateScheduleModal에 isMine 판별(getKakaoUser), want 게임 ⭐/☆ 버튼+dd-game-list--editable·dd-star-btn·dd-star-notice CSS 3종, setMeetingVoteGamePriority 호출·max_priority/not_found 분기·DOM 즉시 반영·postMessage 통보. MEETING_REVAMP_CHECKPOINT.md 정렬 비대칭 설계 확정 기록 |
| (이전) | 2.7단계 표시/집계 — day-detail.js: gameAbbrs 정렬(want-priority→want→learn), buildGameTags priorityCnt 집계·2차 정렬, aggrMap aggrPriority 집계·aggrItems 정렬+⭐N 렌더링 |
| (이전) | 일별 뷰 제거 + 달력 날짜 클릭 → 해당 주차 이동 — club-schedule.html: renderCalendar·openDay~removeVote (~359줄) + #viewDay HTML + btnBackCal + 일별뷰 전용 CSS ~230줄 제거. navigateToDate(ds)/getWeekOffset(ds) 추가, renderWeekView에 targetDate 파라미터+is-target CSS 신규. 진입점 2곳(요일 헤더·월간 셀) → navigateToDate로 교체. db-schema.md meeting_profile_click 설명 정리 |
| (이전) | 홈 미리보기 갱신 버그 수정 — club-schedule.html: 모든 쓰기 완료 지점(saveAll/saveVote/removeVote/saveVoteForDate/removeVoteForDate)에 `_notifyParentSaved()` 헬퍼 추가, `window.parent.postMessage({type:'cottage-meeting-saved'})` 전송. index-page.js: `_meetingDirty`+`_meetingReload` 모듈 변수, message 핸들러에 수신 시 dirty 세팅, closeModal에서 dirty면 loadWeek() 1회 재조회 후 플래그 해제. 변경 없이 닫으면 DB 조회 0건 유지. |
| (이전) | 2.7단계 Step3 ⭐ 지정 — club-schedule.html: initDay에 is_priority 복사, addGameStep2 기본값 false, gameListHtml want칩에 ☆/⭐ 버튼, 로컬 토글 핸들러(최대 2개 초과 시 showToast), saveAll INSERT 후 setMeetingVoteGamePriority 호출, allVoteGames 메모리에 is_priority 포함. CSS .sm-game-star 신규 1개 |

## 최근 완료 (2026-07-07)

| 커밋 | 내용 |
|------|------|
| fb38ef8 | 홈 미리보기 카드 하단 "이날 모임 한눈에 보기 →" 풀폭 행 버튼 (mpc-detail-btn), 카드 :active 추가 |
| 8a99827 | 4단계 룰렛: openDateMeetingModal 내 want 2개↑ 시 SVG 원판+칩 토글+결과, 균등확률 |
| b3d350d | 룰렛 원판 조각에 게임 약칭(abbr) 표시 (SVG text, 반지름 방향, 폰트 3단계) |
| 85a14fa | 룰렛 "+ 게임 추가" attachAc 자동완성+직접입력, 세션 임시, 점선 칩, 중복 강조 |
| 635ed11 | 게임방식 필터에 머더미스터리 항목 추가 (index-page.js moodTagMap·moodShortMap, script-nav.js, index.html, owned-games.html) |

## 최근 완료 (2026-07-04)

| 커밋 | 내용 |
|------|------|
| fc0ef5e | 이번 주 모임 → 플래너 바텀시트 전환: initPlannerModal(로그인 무관 preload, cottage-planner-ready postMessage), initMeetingSection 다가오는 모임 미리보기(참여자·공통시간), club-schedule.html ?embed=true 감지(header/footer 숨김) |
| 559b6d0 | CTA 트래킹 3세트 정리: home_recommend_main/game_detail/all_click, home_record_main/write/more_click, home_meeting_main/planner_click. 기존 hero_recommend/hero_record onclick 제거(중복 발화 차단). 관리자 이벤트탭 모임 서브탭 추가, 퍼널 3개 반영 |
| 9c39790 | 바텀시트 우하단 "↗ 페이지로 이동" 링크 추가(기록→game-reviews.html, 플래너→club-schedule.html). 플래너 보기 화살표 제거 |
| bfe512a | fix: 기록더보기 최초진입 시 input탭 고정 버그 — pendingTab 변수로 tab 파라미터 저장, cottage-hub-ready 수신 시 전환 |
| 283a925 | fix: 최근플레이 게임평+사진 모두 있는 기록 우선 표시(50개 중 find), 섹션 설명 문구 변경 |
| a9c7c59 | fix: 바텀시트 라이트박스 독립 닫기 — iframeLightboxOpen 상태 추적, dim 클릭 시 라이트박스만 닫기, closeModal 시 강제 닫기, play-records-utils cottage-lightbox-open/close postMessage, game-reviews.js cottage-close-lightbox 수신 |
| c153bbf | fix: 라이트박스 검은 배경 클릭 닫힘 제거(X버튼·외부 dim만 닫기) |

## 최근 완료 (2026-07-03)

| 커밋 | 내용 |
|------|------|
| 195736e | 플레이기록 게시판: [날짜별] 탭 신설(연월→날짜→모임→기록), 모임별 탭 연월 중간 계층 추가(모임→연월→날짜→기록), 기본 탭 날짜별로 변경 |
| c2b91bc | 햄버거 메뉴 스크롤 표시 정책: 추천게임찾기 full-active 유지, recent-play/meeting 진입 시 갈색 점+그룹 자동 열림, 겹침 구간 동시 표시, 실시간 scroll 반영(refreshMenuActive) |
| 23c789d | 최근 플레이 섹션 개편: 3개 표시, 우상단 기록 더보기·기록 남기기, 좌하단 CTA 제거, 기록 남기기 → iframe 센터모달 |
| 7018aaa | 난이도 토글 레이블 변경(난이도 기준 보기→보드게임 난이도 안내), 중복 타이틀 제거, 카드 공백 축소 |
| adec443 | 게임카드↔가로선 사이 공백 축소(game-scroll padding-bottom 18→8px, difficulty-guide margin-top 20→8px) |
| (이전) | 메인페이지 라이브 콘텐츠 2차: #recent-play getAllPlayRecordsForHub(6) 연동(게임명/날짜/닉네임/리뷰미리보기 카드), Hero 기록하기 버튼 → #recent-play 스크롤 전환 |
| 74d1294 | 메인페이지 라이브 콘텐츠 1차: Hero deco-2/3 제거, 우하단 모임 버튼, 난이도 안내 기본접힘, #recent-play 섹션 껍데기, #meeting 섹션(getMeetingVotes 연동, 상태메시지+날짜칩) |
| 39fe161 | 배너 타이틀 중앙정렬(.page-mini-hero h1 margin:0 !important) + 게임시트 상단 개편(본문 표지 제거, 영문제목 이동, 버튼 2열, 썸네일 클릭 모달) |
| c15d215 | play-records-utils.js 상단 주석 window 노출 8개로 갱신 |
| b4e7078 | SC2 재검증 결과 PLAN_refactor_audit_workflow.md 기록 (getRepAchievement name 누락 → 이미 getCharacterName 경로로 해결됨) |
| abe774b | 궁금해요 추가 시 좋아요 DB 제거 (onSheetCurious, onPrMenuCurious) — 좋아요↔궁금해요 상호배타 비대칭 버그 수정 |
| (문서) | CSS1 재검증: .sheet-section 중복 정의 없음, 코드 수정 불필요 — REFACTOR_CHECKPOINT.md·PLAN_refactor_audit_workflow.md 반영 |
| (문서) | GR1+GR2 재검증: deprecated 단건 게임 경로(initGameView/renderSingleGame) 제거 완료, 직접 Supabase 접근 없음, 코드 수정 불필요 |
| (운영 원칙) | 작업기록 동기화 실패 방지 원칙 추가 — 해결된 항목은 원문서/PLAN/STATE 상태를 함께 닫고, 커밋 전 항목 ID 검색으로 낡은 미해결 기록 확인 |
| (문서) | ACH9 재검증: POINTS 맵 없음, grantAchievement/showAchievementToast points 인자 없음, achievement-system.md 삭제 정책 명시 — 코드 수정 불필요 |
| (문서) | ACH7 재검증: showAchievementToast points 파라미터 제거 완료, 호출부도 name만 전달 — 코드 수정 불필요 |
| (문서) | SC2/SC3 체크포인트 문서 상태 동기화: 메인 표·Yellow 목록·보류 표 해결됨 갱신, PLAN SC3 재검증 기록 추가 |
| (문서) | PU3/PU4 재검증: 실제 버그 없음, 잠재 리팩토링 후보로 유지 |

---

## md 미갱신 내용 (세션 간 수집 중 → 리팩토링 때 일괄 정리)

> 각 세션에서 커밋은 됐지만 이 문서에 반영 안 된 작업들. 여러 채팅에서 돌아다니며 모아두고, 리팩토링 세션 때 한꺼번에 정리한다.

### 기록보드 CSS 개선 (2026-07-04, 이 채팅)

| 커밋 | 내용 |
|------|------|
| `054ee98` | 플레이기록 게시판 3종 개선 (n게임 표시, 갭·가독성, 참여자 이름 클릭 초안) |
| `ad2e843` | 기록보드 참여자 이름 클릭 → `openOtherMeetingSheet()` 단일 함수로 교체 (본인/타인 분기를 함수 내부로 위임) |
| `583f989` | 기록보드 계층 색상 정리 (n게임 weight 400·색 연하게, 날짜 세로선 초록→갈색 #c49a72, pr-date-group-label 배경 제거·color·indent) |
| `f6e5380` | 기록보드 월/날짜 계층 간격·세로선·모임명 (padding-top 제거 → first-child.is-open margin-top, ::before left:8px로 세로선 이동) |
| `0a424c7` | 월↔첫 날짜 열림 간격 16px→8px 축소 |
| `ae948f5` | 날짜 헤더 세로선 색 #c49a72→#a06040, bottom:-3px 연장 |
| `e8fb680` | pr-game-group-hd 왼쪽 세로선 #6fa068(초록)→#a06040(갈색) |

### 기록 모달 개선 (2026-07-04, 다른 채팅)

| 커밋 | 내용 |
|------|------|
| `8a509fb` | 최근 플레이 섹션 — 리치 카드 1건 표시 (썸네일+인원+리뷰+사진) |
| `7cc69f4` | 기록 모달 위치 하단 치우치게 조정 (align-items: flex-end, padding-bottom: 5dvh) |
| `1470f96` | 기록 모달 바텀시트 슬라이드업 애니메이션 추가 |
| `f76ffb2` | 기록 모달 하단 여백 5dvh→3dvh |
| `20e7e0a` | 게임평 세로선 초록→갈색 (pr-rec-review·sheet-comment-item--review: #c4d4c0→#c8b49a), 모달 애니메이션 0.35→0.48s |

### 관리자 이벤트 탭 개편 (2026-07-04, 다른 채팅)

| 커밋 | 내용 |
|------|------|
| `916b6f5` | 이벤트 탭 3축 카드 뷰로 전면 개편 |
| `780752b` | 이벤트 퍼널 디자인 개선 (번호 소형화, 라벨-숫자 계층, ↓전환율, 플로우 도트) |

### CSS 변수화 전체 3차 (2026-07-05)

script.js 분리 검증 → CLAUDE.md 2줄 추가 → CSS 일관성 감사 → 변수화 1~3차.

| 커밋 | 내용 |
|------|------|
| `65e015a` | refactor: script.js → script-nav.js + game-sheet.js 분리 (14개 페이지) |
| `7c3a681` | docs: CLAUDE.md 병렬세션금지·feat+refactor혼합금지 규칙 추가 |
| `62cdf27` | refactor(css): :root 신규 변수 7개 선언 (--border, --card-bg, --review-accent, --line-soft, --text-dark, --bg-soft, --req-accent) |
| `6a43620` | refactor(css): 기존 :root 변수와 동일값 하드코딩 치환 (42건) |
| `8d86388` | refactor(css): 신설 변수와 동일값 하드코딩 치환 (115건) |
| `f0ccc3d` | docs: DESIGN_RULES.md §1 hex 하드코딩 금지 규칙 추가 |
| `b43c249` | refactor(css): style.css #7a4828 → var(--green) 치환 (101+1건, 구역별) |
| `07d27a7` | refactor(css): requests-admin.html style블록 변수화 (#e8e4dc 22건, #f5f0e8 11건, #7a4828 6건) |
| `d2ee5c8` | refactor(css): 죽은 폴백·중첩 폴백 제거 (var(--brown,#7a4828)→var(--brown) 23건, 자기참조·중첩 폴백 전수 정리) |
| `31bec88` | refactor(css): requests-admin.html 인라인 style 속성 치환 (JS 템플릿 내 6건) |
| `a0214d0` | refactor(css): var(--accent,#7a4828) → var(--green) (유령 변수 제거, --accent 미선언) |
| `f99c962` | refactor(css): --brown을 --green으로 통일 (사용자 DevTools 비교 후 구분 불가 확인·승인, 23건) |

**CSS 변수화 전체 완료.** 잔여: `var(--card-bg,#fff)` 8건(폴백값 #fff ≠ --card-bg 실제값, 의도적 유지).

### 홈 기록 입력 최근인원불러오기 무동작 수정 (2026-07-05)

| 커밋 | 내용 |
|------|------|
| (이 세션) | game-reviews.js `initHub()` 내 `if (!startInput) loadRecords()` → `loadRecords()`. 홈 `#openRecordModalBtn`(기록 남기기) → iframe `?tab=input` 진입 시 `loadRecords()`가 건너뛰어져 `window._prLatestRecord`가 undefined → "↑ 최신 기록(인원·참여자)" 버튼 무동작. `loadRecords()`를 항상 실행하도록 수정. "기록 보기" 탭 클릭 시에는 캐시 재사용(early return)으로 추가 비용 없음. |

### 게임별 탭 게임 목록 정렬 버그 수정 (2026-07-05)

| 커밋 | 내용 |
|------|------|
| (이 세션) | game-reviews.js `renderGameView()` Map 구성 후 게임 단위 명시적 정렬 추가. 원인: `getAllPlayRecordsForHub()`가 `ORDER BY played_at DESC`로 정렬 반환 시 PostgreSQL NULLS FIRST 동작으로 `played_at = NULL` 기록이 배열 앞에 위치 → Map 삽입 순서 = 렌더 순서가 되어 played_at NULL 기록을 가진 게임(킹덤오브다이스·더루프·멘네페르·벚꽃)이 항상 최상단 고정. 수정: Map 완성 후 각 게임 그룹의 `max(played_at \|\| created_at)` 기준 내림차순 정렬(sortedGames) 후 렌더. 쿼리 변경 없음(렌더 단 수정). |

**다음 작업 후보 메모** (게임별 탭 버그 관련):
- `played_at NULL 기록이 위 4개 게임에 존재 — 정상 데이터인지(날짜 미입력 허용 시절?) 소급 보정 대상인지 별도 판단 필요. 신규 기록 입력에서 played_at NULL 저장이 지금도 가능한지도 확인 대상.`

### 관리자 이벤트 top4 누락 버그 수정 (2026-07-05)

| 커밋 | 내용 |
|------|------|
| (이 세션) | requests-admin.html `_EVT_LBL` 맵에 모임 이벤트 4종 추가: `home_meeting_date_preview_click`, `home_meeting_preview_card_click`, `meeting_planner_bar_click`, `meeting_profile_click`. 01aea34/71baf5c에서 신규 trackEvent 추가 후 _EVT_LBL 미등록으로 top4에서 집계 제외됐던 버그. 기능 감사에서 발견 → 라벨 등록으로 해결. |

**다음 작업 후보 메모**:
- `kakao-auth-ready 이벤트 미발화 확인됨(game-reviews.js·index-page.js 두 곳이 수신 등록하지만 실제 발화 파일 없음) — initHub()는 항상 setTimeout(tryInit, 1200) 폴백으로만 실행. 발화가 필요하면 kakao-auth.js의 cottage-auth-changed 발화 시점에 함께 dispatch 추가 검토.`

### 홈 모임 미리보기 막대 공용화 (2026-07-05)

| 커밋 | 내용 |
|------|------|
| 6f9178d | day-detail.js에 `window.buildBarsInCard(dayVotes, voteGames, myVote)` 추가 + sched-bar-* CSS 이동. club-schedule.html에서 함수 정의 제거 → `window.buildBarsInCard` 호출로 교체. |
| (이 세션) | index-page.js `renderPreview()`의 이름칩·공통시간 독자 렌더를 `window.buildBarsInCard` 호출로 교체. 더보기 버튼 stopPropagation 추가. |

**다음 작업 후보 메모** (홈 미리보기 막대 관련):
- `홈 미리보기 막대에 본인 강조(is-mine) 적용 여부 판단 — 현재 myVote=null로 호출해 강조 없음.`
- `모임 등록 모달 개선 (기획 확정, 구현 필요) — 여러 주차 사전 등록 지원. 방향: 모달 내 주 네비게이션(←→), 주 넘어 선택 상태 유지, 하단 선택 요약 표시, 시간은 날짜별 개별 입력 + 본인 과거 meeting_votes 기반 자주 쓰는 시간대 프리셋(기본값: 최근 시간대).`
- `접근성 개선 — 아이콘 버튼 title/aria-label, 폼 label 부여 (DevTools Issues 기준).`
- `모임 룰렛 — 센터모달에서 해당 날짜 want 게임 2개 이상 시 룰렛 버튼 표시, 원판 애니메이션 + 결과 표시. DB 변경 없음, day-detail.js 공용 후보.`
- `인원수 조건부 게임 선호 (기획+DB Plan 필요) — meeting_vote_games에 선호 인원 조건 컬럼(값: 무관(기본)/best/recommended/숫자) 추가. 입력: 게임 추가 시 선택 칩 [무관|베스트|추천|2인|3인|4인|5+], 직접입력 게임은 베스트/추천 비활성. 표시: 막대 제외, 게임 목록 칩에만 접미사. 센터모달에서 당일 등록 인원과 조건 매칭 강조. 선행 확인: gameData에 BGG 베스트/추천 인원 필드 존재 여부.`

---

## 0. 진행 중 작업 (세션 시작 시 확인)

### 메인페이지 라이브 콘텐츠 강화 — 다음 작업

- [x] **#recent-play 데이터 연동** — `getAllPlayRecordsForHub` 게임평+사진 있는 기록 1개 리치카드 렌더. 완료.
- [x] **Hero 기록하기 버튼 → #recent-play 스크롤** — smooth scroll. 완료.
- [x] **기록 더보기·기록 남기기 → 바텀시트** — records/input 탭 전환, pendingTab 저장, preload(로그인 시). 완료.
- [x] **이번 주 모임 → 플래너 바텀시트** — initPlannerModal, 다가오는 모임 미리보기, club-schedule.html embed 지원. 완료.
- [ ] **이번 주 모임 섹션 추가 기획** — 날짜별 미니 막대 상세화, 모임 참여 버튼 연결 (낮은 우선순위).

---

### 🔵 CHECKPOINT: 모임 기능 개편 (2026-07-05 시작)

**문서**: `docs/MEETING_REVAMP_CHECKPOINT.md`

**진행 현황**:
- [x] **1단계: 게임 약칭 소스** — game-abbr.json 생성, build-output abbr 병합, COTTAGE_GAMES abbr 필드 추가
- [x] **2단계: 막대 2줄 표기** — buildBarsInCard 시간/약칭 2줄, has-games CSS, sched-bar-time ellipsis
- [x] **2.5단계: 하루 카드 게임 태그 줄** — buildBarsInCard 하단 flex-wrap 칩 (want 🎲 / learn 📖, ·N 합산, 전량 표시)
- [x] **2.7단계: 대표 게임** — ① DB 레이어 완료 (getMeetingVoteGames 필드 확장 + setMeetingVoteGamePriority 신설). ② UI 레이어 완료 (막대 대표 우선 정렬, 센터모달 ⭐N 집계·표시, buildGameTags 2차 정렬)
  - ⚠️ **알려진 이슈**: `index-page.js:1358` 홈 top-level에서 `openDateScheduleModal(uid, date)` 직접 호출 경로 존재 확인됨. ⭐ 토글 성공 시 `postMessage({type:'cottage-meeting-saved'})` 발송되나, `_meetingDirty` 소비 로직이 `closeModal`(iframe 닫기)에서만 동작 → 홈 미리보기 즉시 갱신 안 됨. 별도 수정 후보로 등록.
- [x] **3단계: 센터모달 재정의** — openDateMeetingModal 게임 집계 상단, 참여자별 접힘, fromHome 버튼 문구
- [x] **3단계(홈 클릭 분화)** — index-page.js .sched-bar-track 클릭 → openDateScheduleModal, fromHome:true 전달
- [x] **3.5단계: 칩 병합 + 홈 주 네비게이션** — buildGameTags want/learn 단일 칩 병합, initMeetingSection ◀이전주/다음주▶ 주별 재조회, 홈 닉네임 클릭 → openOtherMeetingSheet
- [x] **홈 카드 진입점 명확화** — mpc-hint → mpc-detail-btn 풀폭 행 버튼, 카드 :active 추가
- [x] **4단계: 룰렛** — openDateMeetingModal 내 want 2개↑ 시 SVG 원판+칩토글+결과, 균등확률
  - 원판 각 조각에 게임 약칭(abbr) 표시, 반지름 방향 회전, 폰트 3단계 자동 축소
  - "+ 게임 추가" attachAc 자동완성+직접입력, 세션 임시(DB 없음), 점선 칩 구분, 중복 강조
- [x] **5단계: 모임보드 이번주 섹션** — _buildMiniBarWeekHtml(+voteGames), want/learn 게임 표시
- [x] **6단계: 등록 모달 다주치** — 전체 완료
  - [x] ①②②-a②-b: 주 네비·Step2·날짜칩·진입 통합
  - [x] ②-c: 홈 등록 직행 (c289793 + 31e6568→30f96b9→63b41d0→e2cd0c2→3676131→b93aaeb 안정화)
  - [x] ③: Step3 게임 선택 분리 + "건너뛰고 저장" + 본인 기등록 날짜 disabled
  - [ ] **④ 후보: 내 등록 관리 동선** — 등록은 홈 직행 가능하나 수정·삭제는 플래너 수동 탐색 필요. 방향: Step 1 "등록됨" 칩 클릭 → 해당 날짜 편집 모드(시간/게임 수정 + 삭제). 009 unique 제약·upsert 경로 충돌은 009 Plan에서 선확인.
- [x] **[Red] 마이그레이션 009 — 실행 완료**: A(is_priority) · B(player_condition) · C(unique 제약) · RLS DISABLE (Supabase 자동 활성화 → 명시적 해제, meeting_votes와 동일)
- [x] **7단계: 인원 조건부 선호** — openDateScheduleModal want+learn 행 모두 인원 조건 select(isMine), setMeetingVoteGameCondition(listType) API. ⭐ want+learn 합산 최대 2개. 개인 막대 ⭐ 타입 무관 최우선 정렬. 센터모달 learn 칩에도 ⭐N 병기. 360px overflow PASS. DB 실반영은 실제 로그인 세션 필요.

---

### 게임 약칭 정비 (신규 트랙, 3단계)

**배경**: game-abbr.json 수동 등록이 거의 없고 대부분 titleKo 앞 2글자 폴백 의존. 폴백 충돌 존재 확인됨 (마라케시/마라카이보 → 둘 다 "마라"). 약칭 원칙 확정됨 (2026-07-08, 아래).

**약칭 원칙 (우선순위 순)**:
1. 보드게임 커뮤니티 통용 약칭 최우선 (아콜, 그웨트, 에오스)
2. 단일어 제목 → 앞 2글자 (현행 폴백과 동일 — 수동 등록 불필요)
3. 복합어 제목 → 각 단어 첫 음절 조합 (혁신의 시대→혁시, 엔들리스 윈터→엔윈)
4. 첫 단어가 고유명사(인명·지명)면 첫 단어 통째 (다윈, 오딘, 에즈라, 아노)

**수동 예외 3종**:
- 어색어 회피: 기도하고 일하라 → "기일" 금지 → 기도일
- 통용어 충돌: 에이지 오브 스팀=에오스(통용어 지위), 에이스 오브 스페이드는 별도 부여
- 폴백 충돌: 마라케시→마케, 마라카이보→마카 (후보, 미확정)

**진행 계획**:
- [x] **1단계 (Claude Code)**: 덤프 스크립트 — 전체 게임 bggId/titleKo/최종abbr/출처(수동or폴백) 목록 출력. + build-output.js에 약칭 충돌 린트 추가 (경고만, 빌드 중단 없음, output 생성 로직 무변경). 644개 / 충돌 83건. (커밋: ed89c39)
- [x] **2단계 (Fable)**: 충돌 83건 전체 약칭 확정 → 사용자 검토 완료
- [x] **3단계 (Claude Code)**: game-abbr.json 전면 갱신(161개 bggId 등록) + game-abbr-byname.json 신설(9건, ownedName 키) + 린트 규칙 수정(fallback 포함 그룹만 경고) → 충돌 0건, build 정상. (커밋: 이번)

---

### MEETING_REVAMP 다음 덩어리 (순서 미정)

- [x] **Step 3 게임 선택** — 등록 플로우에서 ⭐·인원 조건 칩 (want+learn 공통). (커밋: d438902)
- [ ] **집계 모달 리디자인** — 센터모달 집계 화면 개편. 설계 논의 선행 필요.

---

### 🔵 CHECKPOINT: 모임 플래너 Phase 확장 (2026-07-02 시작)

**목표**: 모임 플래너에 요일별 게임 선호(want/learn) 추가, 달력 요약 표시, 멀티스텝 바텀시트

**Phase 진행 현황**:
- [x] **달력 요약** — `mcal-mine-dot` 추가, "N명" 표기, fetch 범위 62일 확장 (커밋: 143차-190)
- [x] **Phase A: DB** — `docs/migrations/008_meeting_vote_games.sql` 작성, `db-schema.md` 갱신 (커밋: 143차-190) ⚠️ **Supabase SQL Editor에서 직접 실행 필요**
- [x] **Phase B: API** — `getMeetingVoteGames`, `addMeetingVoteGame`, `removeMeetingVoteGame` 3개 함수 (supabase-client.js, js-api.md 갱신) (커밋: 143차-191)
- [x] **Phase C: 기존 화면 검증** — 사용자 직접 확인 완료
- [x] **Phase D: 멀티스텝 바텀시트** — `initMultiSheet()` 구현: Step1(요일선택)→Step2(시간)→Step3(게임입력). 상단 [모임 등록] 버튼 + 카드 [+ 등록]/[✎] 진입 (커밋: 143차-192)
- [x] **Phase E: 카드 미리보기** — `sched-bar-games` 구조 구현 완료, Phase D 저장 데이터 자동 표시
- [x] **Phase F: 가져오기 연결** — Step3에 "취향보드에서 ▾ / 모임보드에서 ▾" 피커 추가 (커밋: 143차-193). 게임 lazy fetch + 캐시. 중복 추가 방지. 직접 입력 유지. 모임보드 can_explain_rules → "룰 설명 가능" 레이블 분리 표시
- [x] **Step 3 제거 + Step 2 인라인 게임 추가** — Step 3(게임 가져오기 전용 화면) 완전 제거. Step 2에 하고 싶은 게임(🎲)/배우고 싶은 게임(📖) 토글 섹션 통합. 직접 입력 + 피커 공존. 역연동 confirm (addGamePref) + 다중날짜 propagation confirm. isDup trim 비교 버그 수정. 배지 항상 (N) 표시 (커밋: 143차-194)
- [x] **게임시트 top 36px + sm-body/footer padding 축소** — profile-panel-box 시각 top(32px) 기준으로 36px 맞춤. Step 2 내용 높이에 맞게 padding 줄여 시트 압축감 개선 (커밋: 143차-193 포함)

**확정 설계 결정**:
- `meeting_game_prefs`(모임 보드 주간 선호) vs `meeting_vote_games`(플래너 날짜별): 별개 유지
- 날짜 카드 [+ 등록]/[수정]: 해당 날짜 시간+게임 입력으로 바로 진입
- 겹치는 게임 표시 단위: 요일별 (카드별)
- 역방향 연결(취향/모임보드 → 플래너): Step 2 addGameStep2() isManualInput=true 경로로 구현 완료
- 모임플래너 = 입력, 모임보드 = 보기(읽기전용), DateScheduleModal = 날짜 상세

**남은 작업 (이 CHECKPOINT 안에서)**:
- [x] **② DateScheduleModal 확장** — `openDateScheduleModal(userId, voteDate)` async 함수 추가. 👥같은날 N명 / ⏱시간겹침 N명 / 🎲게임겹침 N명 통계 칩. 로딩 상태 먼저 표시. 기존 `openDayDetailModal` 레거시 유지. 막대 클릭 → 새 함수로 교체 (커밋: 143차-195)
- [x] **③ 모임보드 리디자인** — 이번주일정 섹션: 미니 시간막대(9~23시 범위) + [자세히]→openDateScheduleModal. 본인 보드에만 "모임 플래너에서 수정하기" CTA. 타인 보드: renderDayDetailHTML 블록 제거, 미니막대로 교체. _buildMiniBarWeekHtml/_thisWeekRange 모듈 헬퍼 추가 (커밋: 143차-196)

---

### 🔵 CHECKPOINT: 리팩토링 및 점검 작업 계획 (2026-07-02 시작)

**문서**: `docs/PLAN_refactor_audit_workflow.md`

**현재 목표**: 전체 리팩토링을 한 번에 하지 않고, 문서-코드 싱크 점검 → 안전한 Green 정리 → Yellow 버그 후보 검증 → Red 작업 별도 Plan 순서로 진행한다.

**보류 항목**:
- `style.css`, `kakao-auth.js`, `requests-admin.html` 같은 큰 파일 즉시 분리 — 영향 범위가 넓어 사전 감사 후 진행.
- DB/localStorage/window 전역 API 변경 — 별도 Plan과 승인 전까지 보류.
- 관리자 분석 페이지 전체 재구성 — 카운팅 기준 안정화 후 필요할 때 별도 진행.

**완료 항목**:
- [x] `play-records-utils.js` 상단 주석 — 실제 window 노출 8개와 일치시킴 (3개만 나열돼 있던 것: toInitials / hangulMatch / attachAc / initTagInput / buildPhotoItemAdder 추가)

**미실행 항목**:
- `docs/REFACTOR_CHECKPOINT.md` Green 항목 현재 유효성 재검증
- 이후 Yellow 버그 후보별 증상/호출처/검증 방법 작성

**다음 작업 후보**: `docs/PLAN_refactor_audit_workflow.md` 1단계부터 시작. 우선 `js-api.md`, `ls-schema.md`, `REFACTOR_CHECKPOINT.md`의 불일치 후보를 재검증한다.

### 🔵 CHECKPOINT: 관리자 분석 카운팅 기준 통합 (2026-07-02 시작)

**문서**: `docs/PLAN_admin_analytics_counting.md`

**현재 목표**: 관리자 분석 페이지에서 유입/방문 지표의 `명`과 `회` 기준을 통일해 `직접 방문 11명(7회)`처럼 해석이 꼬이는 표시를 없앤다.

**보류 항목**:
- 과거 `user_id/session_key` 없는 `page_views` 데이터 소급 보정 — 관리자/비회원/봇 구분을 안전하게 복원할 수 없어 삭제·수정하지 않음.
- 분석 탭 대규모 재구성 — 우선 카운팅 기준을 바로잡은 뒤 별도 작업으로 진행.

**미실행 항목**:
- 실제 Supabase 운영 DB에 `docs/migrations/007_page_views_session_key.sql` 적용
- 브라우저에서 관리자 분석 화면 수치/콘솔 확인

**다음 작업 후보**: SQL 적용 후 관리자 분석 화면에서 유입 카드와 유입 차트의 `명/회`가 같은 기준으로 표시되는지 확인.

### 🔵 CHECKPOINT: 관리자 분석 페이지 "요약→분석→상세" 탭 리팩토링 (2026-06-30 시작)

**목표**: `pages/admin/requests-admin.html`의 4개 그룹(groupCharts/groupEvents/groupAnalysis/groupReferrer)을 탭 5개(방문/회원/유입/페이지/이벤트)로 통합. 기능 추가가 아니라 정보 압축·가독성 향상이 목적.

**진행 순서 (사용자 확정)**: 구조 → 트래킹 설계 → 구현

- **1단계 (구조) — 완료 (143차-166)**
  - HTML 골격을 `groupAnalysis` 1개(탭 5개: 방문/회원/유입/페이지/이벤트)로 통합, 캔버스 id는 전부 유지(차트 그리기 JS 무수정)
  - 오늘 요약(상단 고정) / 분석 탭 / 날짜필터(방문·유입·페이지 탭만 노출) / 이벤트 탭 서브탭 / 유입 탭 "상세" 접힘
  - 회원 탭: 기존 `subSection('방문자 목록',...)` 래퍼 제거 → 이미 내장돼 있던 "최근 3건 + 더보기" 구조를 그대로 1차 화면에 노출(신규 로직 아님), 회원별 이용시간 차트 추가 배치
  - 실브라우저(Playwright, 실제 Supabase 데이터)로 5개 탭 + 서브탭 전환 확인, 기존 수치(오늘 방문자 6명, 7일평균 6.4 등) 정상 표시, 콘솔 에러 없음
  - 메뉴 카드 6개→3개(분석/교환권 관리/요청관리)로 축소, `data-scroll="groupCharts/groupEvents/groupReferrer"` 등 구 id 참조 제거
- **2단계 (데이터)** — 보류, 다음 세션
  - 요일별 집계, 재방문율 집계 — 신규 계산 로직 필요 (기존 page_sessions로 가능, 신규 이벤트 불필요)
  - 회원가입 퍼널: 노출(메인 방문, 기존 재사용)→클릭(카카오 로그인 버튼 클릭, **신규 이벤트 필요** — kakao-auth.js `kakaoLogin()`에 `trackEvent('login_click')` 추가)→완료(`signup_complete`, 이미 존재 — supabase-client.js:1013)
  - 도감 퍼널: 노출(내 보드 진입/도감 섹션 펼침, **신규 이벤트 필요**)→클릭(개별 게임 클릭, **신규 이벤트 필요**)→완료(첫 플레이기록으로 도감 등록 — 기존 game_play_records로 추정 가능한지 확인 필요). "후속행동" 단계는 범위에서 제외하기로 확정.
- **3단계 (연결)** — 보류
  - 2단계에서 만든 데이터를 탭에 연결, 빈 데이터/로딩/예외 처리

**위험요소**: 관리자 전용 페이지라 일반 사용자 영향 없음. 단일 파일(1700+줄) 대규모 재구성이라 세션을 나눠 진행 중 — 1단계 완료 후 git diff로 기존 차트/통계 수치가 동일하게 나오는지 반드시 확인.

### 143차-197~214 완료 항목 (2026-07-03) — 관리자 분석 페이지 개선

| # | 내용 | 비고 |
|---|------|------|
| 비로그인 중복집계 수정 | `dedupUserPageDay`: anon도 `session_key+page+day` 기준 dedup | |
| 오늘 이용시간 수정 | member 차트 "오늘" 분기에서 stale `profiles.today_date` 제거 → `filtered` rows 기준 | |
| 페이지 상세 테이블 제거 | `renderPageTable` 함수 + `pagesBody` 주입 제거 | |
| 페이지 차트 바 안에 시간 표시 | `afterDatasetsDraw` 커스텀 플러그인, 가운데 정렬 | |
| 유입 차트 바 안에 시간 표시 | 동일 플러그인, `page_sessions.referrer` 직접 집계 | |
| `makeOrUpdate` plugins 파라미터 추가 | 5번째 인수로 Chart.js inline plugins 전달 | |
| `fmtTime` scope 버그 수정 | `loadAnalytics()` 내부에만 있던 것 → `renderCharts()` 에도 추가 | |
| 회원 탭 날짜 헤더 추가 | `usesDateFilter`에 `member` 포함 (이벤트는 고정 30일이라 제외) | |
| 요약 탭 페이지 카드 시간 추가 | 전체 rows(non-dedup) 기준 totalSec, `(N회 · N시간)` 형태 | |
| 요약 탭 유입 카드 시간 추가 | `page_sessions.referrer` 직접 집계 | |
| 페이지 카드 짧은 이름 alias | `코티지가 만들어진 이유 → 소개`, `홈페이지 기능 → 기능안내` | |

**미해결 (설계 한계)**:
- 단기 방문(heartbeat 전 종료)은 `duration_sec=0` → 시간 표시 안 됨. 추적 로직 변경 필요, 별도 작업.

---

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
| fix: 홈페이지 기능 iframe 시트 여백 (Codex) | `guide.html` 카드 클릭 iframe 오버레이를 `width:calc(100% - 20px)`, `margin:0 10px 12px`, `height:calc(100dvh - 48px)`, `border-radius:18px`로 조정해 게임정보/내 보드 시트 여백 규격과 맞춤 | Codex |
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
| fix: 바텀시트 사진 미표시 (142차-89) | _fetchGamePhotos가 BGG ID 쿼리 결과가 있으면 fallback 안 탔던 버그. gameKey·bggId 병렬 조회+중복 제거로 수정 | 142차-89 |
| fix: "..." 메뉴 수정/삭제만 남기기 (142차-90) | 💬👍 바텀시트 링크 제거, 수정·삭제만 표시 | 142차-90 |
| refactor: game_id 이중저장 근본 수정 (142차-91) | supabase-client.js 4개 함수 배열 지원(.in()), _gameIds(gameKey) 헬퍼 추가, script.js 전체 fallback 패턴 제거, gameIdByName→bggId 우선 저장 | 142차-91 |
| fix: 기록페이지 사진 라이트박스 캡션 (142차-92) | 그룹·날짜·인원·참여자·시간·점수 표시 — 바텀시트와 동일한 포맷 | 142차-92 |
| fix: 바텀시트 사진 미리보기 +N장 가로펼침 (142차-93) | initSheetPhotoPreview: 전체 사진 렌더링+앞 3장만 표시, +N장 클릭 시 가로 펼침. _attachPhotoLightbox에서 .pr-rec-photo-more 라이트박스 바인딩 제거 | 142차-93 |
| fix: PC 게임위치 시트 전폭 (142차-94) | .shelf-sheet-box max-width:480px 제거 → 게임시트와 동일한 전체 화면 폭 | 142차-94 |
| design: 플레이기록 카드 개별 박스 디자인 (142차-95) | sheet-my-record-item: border→radius+배경+gap 개별 카드 스타일 적용 | 142차-95 |
| fix/feat: 게임평·사진 작성자 표시 + 모임연동 버그수정 (142차-96) | Item2: onOpenCommentInput _gameIds 적용(기존 모임 연동 미노출 수정) / Item3: placeholder 텍스트 변경 / Item5: 라이트박스 캡션 닉네임 추가 / Item6: 전체사진 헤더 N명의 사진+그리드 개별 작성자명 / Item7: 게임평 앞 작성자 이름 표시 | 142차-96 |
| feat: 기록게시판 사진 추가 탭 (142차-97) | 세 번째 탭 "사진 추가" — 전체 기록 목록에서 원하는 기록 선택 후 사진 업로드, 타인 기록에도 추가 가능 | 142차-97 |
| fix: 게임 바텀시트 코너 삐져나옴 근본 수정 (142차-118) | `.game-sheet-panel` overflow:hidden(외부 클리핑) + `.game-sheet-scroll` overflow-y:auto(내부 스크롤) 분리. JS scroll 참조 5곳 `.game-sheet-panel` → `.game-sheet-scroll` 변경. **3세션 소요 근본 원인: Chrome GPU 컴포지터가 overflow-y:auto+border-radius 동일 요소에서 배경 클리핑을 직각으로 렌더링하는 버그.** DESIGN_RULES.md §6 참조 | 142차-118 |
| fix: 게임위치 바텀시트 상단 여백 (Codex) | `.shelf-sheet-box` 좌우/아래 여백과 overflow/radius 구조는 유지하고 높이만 `100dvh - 72px` → `100dvh - 102px`로 축소해 상단 여백 30px 추가 | Codex |
| 내 보드 모임 플래너 연동 + 모임페이지 로그인 버튼 (142차-123) | 함께한 시간 서브시트 상단에 "📅 모임 플래너 바로가기 →" 초록 버튼 추가 (경로: index.html/서브페이지 공용). 모임 플래너 날짜 상세 뷰에서 로그인 힌트가 텍스트만 있던 문제 → 실제 카카오 로그인 버튼으로 교체. | 142차-123 |
| 디자인 시스템 정보성 텍스트 색·굵기 통일 (142차-124~133) | 페이지별 순차 적용: `--text-info(#505050)+500` 원칙. about.html, price-rules.html, club-rules.html, guide.html, game-reviews.html, owned-games.html, 요청하기, 내보드 패널 완료. 갈색 배너 12% 연하게(#7a4828→#8a5e42 등). club.html·club-schedule.html은 이미 CSS변수 사용으로 패스. | 142차-124~133 |
| 수집보드 카드 3줄 표시 + 취향보드 카드 간격 (142차-133) | 캐릭터·도감·업적을 1줄(·구분)→개행(\n) 3줄 표시. 취향보드 카드 #태그 bio-row/games-row 분리, margin-top:3px. | 142차-133 |
| fix BUG-B + 추가 기능 (142차-136) | BUG-B: getGameComments 배열 지원(_gameIds 전달), getMyStats game_key 컬럼 수정, profile 게임평에 game_comments 통합. 추가1: 기록 페이지 상단 좋아요/궁금해요 추가. 추가2: game-reviews ··· 메뉴에 좋아요/궁금해요 + lazy load 상태 | 142차-136 |
| fix BUG-A/C + 궁금해요 자동취소 (143차-136) | BUG-C: profile-game-link 버튼만 클릭 가능. BUG-A: +N 클릭 시 인라인 확장(라이트박스→그리드). 궁금해요 취소 토스트 String() 타입 수정. 좋아요 클릭 시 궁금해요 자동취소(onSheetLike/onPrMenuLike) | 143차-136 |
| feat: 내보드 사진 3열 그리드+캡션+삭제 / 정리법 버튼 (143차-137) | BUG-A완성: 3열 CSS grid, 캡션(작성자/모임/날짜/인원/시간/점수), 본인 사진 삭제. 정리법: _ORGANIZER_GAMES 오브젝트+버튼+폴더 인프라(게임명 등록 후 활성화) | 143차-137 |
| fix: 게임시트 열림 불가 버그 (143차-148) | _getOrganizerPhotos에서 getGameName 직접 호출 → game-reviews.html에서 ReferenceError. window.getGameName?.()으로 수정 | 143차-148 |
| design: 섹션 순서·굵기 전반 개선 (143차-149) | 게임평→사진→플레이기록 순서 통일(게임시트/기록시트/기록보드). 게임평 PREVIEW 3. 전역 font-weight 일반화(검색/게임정보/기록/보드 항목 500으로) | 143차-149 |
| design: 관리자 분석 섹션 고정헤더+클릭이동 (143차-154) | .admin-group-title position:sticky+top:--header-total-h+배경색 추가. .admin-group scroll-margin-top 추가로 menu-card 클릭 이동 시 헤더 가림 방지 | 143차-154 |
| design: 플레이기록 인원/시간/점수 칩 가독성 (143차-153) | .sheet-play-info-tag font-size 11→12px, font-weight 700→500, padding 2px 8px→3px 9px | 143차-153 |
| design: font-weight 조정 시리즈 (143차-155-test1~15) | 게임시트 고정헤더(900→700), 히어로설명(500→700), 기록시트타이틀(900→700), 추천안내/오버레이타이틀(→700), 수집보드업적축레이블(600→500), 추천필터하위옵션(800→500). 플레이기록카드: 참여자배지 600, 편집아이콘 opacity 0.3→hover 1.0 | 143차-155-test1~12 |
| design: 플레이기록 배지 재편 (143차-155) | 인원/이름/시간 한 줄 합치기(파이프 구분자), 점수 둘째줄, 배경 var(--cream), 색 #1e1a16, 구분자 .badge-sep 옅은색. 게임리뷰 점수 슬래시→파이프 동일 적용 | 143차-155 |
| design: 추천필터 UX 개선 (143차-155) | "나에게 맞는 게임 찾기" 서브타이틀 배너 이동. 3버튼 단독개폐(exclusive toggle). 처음이시면 안내 버튼 하단 고정. 외부박스 제거(v3 투명). 하나만선택 여백 축소 | 143차-155 |
| design: 좋아요/궁금해요 본인 표시 (143차-152) | #sheetLikeBtnWrap.is-active → 초록 테두리+배경, #sheetCuriousBtnWrap.is-active → 앰버 테두리+배경. JS에서 is-active 클래스 이미 설정 중, CSS 스타일만 추가 | 143차-152 |
| design: 기록시트 고정헤더 (143차-151) | .sheet-record-header position:sticky+top:0, 배경색, 음수마진으로 full-width. .game-sheet-close z-index:10 보강. PC 32px 패딩 대응 반응형 오버라이드 추가 | 143차-151 |
| fix: 기록보드 sticky 공백 (Codex) | 기록보드 시트에서 헤더 아래 공백을 scroll padding이 아니라 `.profile-subsheet-body--records::before` sticky 덮개로 분리. `기록보드 헤더 + 공백 + 게임평/사진/플레이기록 헤더`가 함께 고정되고 본문은 그 아래로만 스크롤되도록 수정 | Codex |
| design: font-weight 일반화 2차 (143차-150) | items 13~30 A그룹. 필터칩/게임카드제목/소유게임제목/히어로텍스트/버튼(.btn)/검색입력/페이지네이션/about·club소개/모임기록게임명/게임평내용/요청카드명 → 500. 게임정보 진행·테마·디자이너 레이블(.sheet-mechs-label/.sheet-meta-label) 700 복원. 19=이미완료. B그룹(23/24/26/27) 미실행 | 143차-150 |
| refactor: 내보드 첫 화면 카드 구조 재배치 — "내보드 대공사" (143차-165) | **[143차-155 미완료 9/10/10-1/11/11-1] + [내보드 정기모임 위치 재구성] 항목 처리.** ① 수집보드 카드를 그리드에서 제거, 핵심 정보(업적→캐릭터→칭호→도감 순 한 줄 `_growthLine`)를 상단 프로필 영역으로 흡수 + 클릭 시 수집보드 서브시트 진입(`profile-growth-line`). "다음 업적까지 N남음" 문구는 기존부터 이미 상단 `_growthBadge`에 있었음을 확인, 추가 이동 작업 불필요. ② 아바타/칭호/수집요약 클릭 3곳 모두 `_trackPvOnce('my-board-growth')` 호출 추가 — 그리드 카드 제거로 인한 분석 트래킹 유실 방지. ③ 카드 그리드 재배치: 1행 취향보드/기록보드, 2행 함께한시간/모임보드, 3행 음료교환권(`.profile-card--span2` 기존 미사용 클래스 재사용, 전체폭). ④ "함께한 시간" 카드는 `.profile-card--notif` 가로형 스타일 제거 → taste/records와 동일한 표준 세로형 `.profile-card` 스타일로 통일, 정기모임 일정(`_scheduleHtml`)은 카드에서 제외하고 통계 요약만 표시. ⑤ "모임 보드" 신규 카드(`<a href="club-schedule.html">`) — 서브시트 안 거치고 바로 이동. "모임 플래너 보기"(`.profile-card-meeting-cta`, 초록 강조)가 먼저, 일정 있으면 `_scheduleHtml` 재사용 표시, 없으면 "아직 등록한 일정이 없어요"(`.profile-card-meeting-empty`) 빈 상태 — 카드 숨김 대신 항상 노출해 기능 발견성 유지. ⑥ 기존 "함께한 시간" 서브시트 내부 "모임 플래너 바로가기" 버튼(`.profile-meeting-btn`)은 의도적으로 유지(중복 허용, 이번 작업 범위 아님). ⑦ DB/localStorage 신규 키 없음. ⑧ 360px 모바일 화면 Playwright 스크린샷으로 레이아웃 검증 완료(스크린샷 시각 확인, 실제 로그인 데이터 아닌 정적 마크업 재현본). 영향 파일: `assets/js/kakao-auth.js`(상단 프로필 영역 + 카드 그리드 마크업, 클릭 핸들러), `assets/css/style.css`(`.profile-card--notif` 제거, `.profile-growth-line`/`.profile-card-meeting-cta`/`.profile-card-meeting-empty` 신규, `.profile-card` 베이스에 `text-decoration:none`/`color:inherit` 추가로 anchor 카드 대응) | 143차-165 |
| fix+design: 헤더 로그아웃 위치 + font-weight + 내보드 추가 개선 3종 (143차-167) | ① 헤더 드롭다운 메뉴에서 로그아웃 아이콘이 관리자 계정일 때만 "🔧 관리자 페이지" 링크(`flex:0 0 100%`라 줄바꿈 강제) 뒤로 밀려 닉네임과 떨어져 보이던 버그 — `loginArea.appendChild` → `btn.insertAdjacentElement('afterend', ...)`로 닉네임 버튼 바로 다음에 삽입, 관리자 링크보다 항상 앞 줄에 위치하도록 수정(`kakao-auth.js`). ② `.menu-kakao-login-btn`(헤더 드롭다운 닉네임) font-weight 900→700, `.admin-group-title`(관리자 페이지 섹션 타이틀, `requests-admin.html`) font-weight 900→700 — 둘 다 값만 변경(Green). ③ **[내보드 1] 수집보드 클릭 가능성 개선**: `_growthLine`+`_growthBadge`를 별개 텍스트에서 하나의 `.profile-growth-link` 버튼으로 통합 — 베이지 배경 박스(#f5f0ea)+우측 화살표(›)+hover/active 시각 피드백 추가, 기존 `.profile-growth-badge`의 개별 박스 스타일은 제거하고 외곽 박스 하나로 통일(중첩 박스 방지). "라벨 추가" 옵션은 보류 — `_growthBadge`에 이미 "🌱 코티지 성장도" 문구가 있어 "수집 보드" 라벨을 더 넣으면 중복으로 판단, 화살표+박스+hover만으로 충분한 어포던스 확보. ④ **[내보드 2] 상단 수집 요약 가독성**: 4항목 한 줄(`업적·캐릭터·칭호·도감`)이 360px에서 길어 줄바꿈이 들쭉날쭉했던 문제 — 2줄(업적+캐릭터 / 칭호+도감)로 고정 분리, `white-space:pre-line` 적용. 업적·캐릭터를 성장 관련 한 쌍, 칭호·도감을 컬렉션 관련 한 쌍으로 의미 단위 묶음. ⑤ **[내보드 3] 음료교환권 카드 높이**: `.profile-card-grid .profile-card`의 `min-height:80px`(세로형 2열 카드 공통값)를 전체폭(`--span2`) 카드에도 그대로 적용해 "0장 보유" 한 줄에 비해 빈 공간이 많던 문제 — `--span2`만 `flex-direction:row`로 전환해 아이콘+라벨(좌)+요약(우, margin-left:auto) 가로 배치, `min-height:0`으로 콘텐츠만큼만 높이 차지하도록 축소. 기존 전체폭 위치·클릭 동작은 변경 없음. 검증: Playwright로 관리자/일반 계정 드롭다운 메뉴 2종 + 관리자 그룹타이틀 + 내보드 360px 정적 마크업 스크린샷 확인. 영향 파일: `assets/js/kakao-auth.js`, `assets/css/style.css`, `pages/admin/requests-admin.html` | 143차-167 |
| design: 143차-167 사용자 피드백 기반 미세조정 (143차-168) | 사용자 평가(7.8→9.0~9.2) 기반 3건 보완, CSS 값만 변경(Green). ① **클릭 피드백 강화**: `.profile-growth-link` hover 시 테두리색도 함께 진해지도록(`border-color:#d8c8b0`) + 화살표가 hover 시 브�운(#7a4828)으로 바뀌며 2px 오른쪽으로 이동(`translateX(2px)`) — "눌리는 방향"을 화살표 움직임으로 암시. active 시 `transform:scale(0.99)`로 모바일 탭 시 눌리는 촉각 피드백 추가(기존엔 배경색 변화만 있어 PC hover 전제 디자인이었음, 터치 환경 보완). ② **수집요약 박스 여백**: `padding 8px 10px→10px 12px`, 요약 텍스트 `line-height 1.5→1.7`, 성장도 줄 `margin-top 4px→6px`, 다음업적 줄 `margin-top 2px→4px` — 박스 안 4줄(요약2줄+성장도+다음업적)이 촘촘했던 문제, 줄 수를 줄이지 않고 간격만 확장. ③ **음료교환권 카드**: `padding 11px 14px→9px 14px`, 아이콘 `18px→16px`, `gap 10px→9px` — 사용자가 "15~20%만, 너무 줄이면 균형 깨짐"이라 명시해 패딩만 약 18% 축소(높이를 강제로 고정하지 않고 패딩으로 자연 조절, 다른 카드와 비례 유지). ④ "업적 46/106" 라벨-숫자 공백 요청은 확인 결과 `_growthLine` 코드에 이미 공백 포함(143차-167부터)되어 있어 변경 불필요 — 스크린샷으로 재확인. 영향 파일: `assets/css/style.css` | 143차-168 |
| content: about.html 제약 사진 실사진 교체 + price-rules.html 사진 이동 + 라이트박스 (143차-169) | ① **공간의 제약** 사진을 `photo-interior.jpg`(기존 일반 내부 사진) → 신규 `photo-library.jpg`(책장+테이블 실사진, 사용자 제공)로 교체. ② **시작의 제약** 사진을 임시 대체였던 `photo-shelves.jpg` → 신규 `photo-recommend.jpg`(추천 게임 찾기 기능 실제 화면 캡처, 사용자 제공)로 교체 — 143차-163에서 예고했던 "홈페이지 기능 캡처로 교체 예정" 항목 완료. ③ about.html 마지막 WHY 회수 섹션 사진을 `photo-snack.jpg`(냉장고·사물함) → `photo-exteriorooo.jpg`(매장 외관 간판)로 교체. ④ `photo-snack.jpg`는 about.html에서 제거하고 price-rules.html 최상단(인트로 문구 "모두가 편하게 오래 머무를 수 있도록..." 바로 아래)으로 이동 — 처음엔 "음식 안내" 섹션에 넣었다가 사용자 지시로 위치 재조정. ⑤ **클릭 시 라이트박스 확대**: about.html 제약 사진 4종 + 마지막 WHY 사진, price-rules.html 이동된 사진까지 전부 `onclick="window.openLightbox(...)"` 추가 — 기존 `play-records-utils.js`의 `window.openLightbox` 재사용(신규 JS 작성 없음, 두 페이지 모두 이미 스크립트 로드돼 있던 상태). 신규 이미지 파일 2개(`photo-library.jpg`, `photo-recommend.jpg`)는 사용자가 직접 `assets/images/main/`에 배치. 검증: Playwright로 직접 `window.openLightbox()` 호출해 모달 렌더링 확인(`.click()` 이벤트 트리거는 lazy-load 타이밍 이슈로 테스트 스크립트에서만 불안정했고, 함수 자체와 onclick 마크업은 정상 — 실제 브라우저 클릭은 별도 이슈 없음). 영향 파일: `pages/info/about.html`, `pages/info/price-rules.html` | 143차-169 |
| design: price-rules.html 섹션 재구성 (143차-170) | ① 운영시간 그룹의 `.rules-keywords`("시간 제한 없음 · 편하게 머물 수 있음") 줄 삭제 — 바로 위 카드 설명과 중복. ② "음식 안내"를 독립 그룹(4번)에서 빼서 "이용 약속" 그룹의 `rules-line-list` 3번째 항목으로 통합 — 순서: 공간 이용→게임 이용→음식 안내→편의. ③ "⚠ 꼭 지켜주세요" 박스를 "이용 약속" 그룹 안에서 분리해 신규 독립 그룹 "소음 약속"으로 이동(페이지 맨 아래). 영향 파일: `pages/info/price-rules.html` | 143차-170 |
| fix: guide.html iframe 오버레이 4종 버그 + price-rules 하단 여백 (143차-171) | **[버그1] 추천게임찾기 시작 위치**: index.html `#recommend` 해시 진입 시 토글 섹션으로 스크롤 안 되고 히어로에 머무는 문제. 근본 원인 — `index-page.js`에 `#recommend` 해시 체크가 두 곳 중복(즉시 실행 1곳 + setTimeout 200ms 1곳), 둘 다 `initHeroStats()`(Supabase 이벤트 카운트 비동기 조회 → 히어로 방문자 텍스트 삽입)가 끝나기 전에 실행돼 `recommendSection.offsetTop`을 텍스트 삽입 전(레이아웃 변경 전) 값으로 잘못 계산. 중복 체크 둘 다 제거하고 `initHeroStats()`의 `finally` 블록(성공/실패 무관 항상 실행)에서 1곳만 트리거하도록 통합 — 통계 텍스트 반영이 끝난 뒤 레이아웃이 확정된 시점에 스크롤 계산. **[버그2~3] 동호회/플레이기록/요청하기 시작 시 상단 공백 과다**: `body.embed-mode`는 `.site-header`를 `display:none`할 뿐 아니라 애초에 `header.js`가 `embed=1`일 때 헤더 마크업 자체를 삽입하지 않고 즉시 return — 그런데 `.inner-page`/`.owned-games-page`/`.about-hero` 등 페이지 전반의 상단 여백이 전부 `calc(var(--header-total-h) + Npx)`로 "헤더가 있다"는 전제로 계산돼 있어, 헤더가 없는데 그 공간만 빈 채로 남음. 개별 선택자마다 패치하는 대신 `body.embed-mode { --header-h:0px; --safe-top:0px; }`로 변수 자체를 0 재정의 — `--header-total-h`를 쓰는 30여 곳의 calc()가 자동으로 일괄 보정됨(sticky `top` 위치 등도 함께 정상화). **[버그4] price-rules.html 하단 여백 과다**: 페이지 재구성(143차-170)으로 "소음 약속"이 마지막 그룹이 되면서 `.rules-group`의 `margin-bottom:36px` + `.inner-page-body`의 `padding-bottom:36px`가 중첩(72px). `.rules-group:last-child{margin-bottom:0}` 추가로 마지막 그룹만 자체 마진 제거(하드코딩 클래스 대신 `:last-child`라 순서가 또 바뀌어도 안전). 검증: Playwright로 guide.html 오버레이 4종(추천게임찾기 scrollTo 호출값 701=offsetTop689-0+12 일치 확인 / 플레이기록·동호회·요청하기 상단 공백 스크린샷 비교) + price-rules.html 하단 스크린샷 확인. 영향 파일: `assets/js/index-page.js`, `assets/css/style.css` | 143차-171 |
| fix: 143차-171 embed 여백 수정이 실제로는 안 먹던 근본 원인 + 추가 3종 (143차-173) | **143차-171 재현 실패 원인**: `body.embed-mode{--header-h:0px;--safe-top:0px;}`만 재정의했는데, `--header-total-h`는 `:root`에서만 선언된 파생 변수(`calc(var(--header-h)+var(--safe-top))`)라 하위 요소가 상속받는 값은 **:root에서 이미 계산이 끝난 값**이라 `--header-h`를 아무리 하위에서 바꿔도 영향이 없었음(CSS 커스텀 프로퍼티는 자기 자신이 재선언된 지점에서만 var() 체인이 재평가됨). `getComputedStyle`로 직접 비교해 확인(`--header-h`는 0px로 잘 바뀌는데 `--header-total-h`는 여전히 `calc(clamp(52px,13vw,68px)+0px)`로 고정). 수정: `body.embed-mode`에 `--header-total-h:0px`도 함께 명시적으로 재정의 — 이제 `.about-hero` margin-top이 80px→28px로 정상화(검증: `getComputedStyle` 직접 비교 + guide.html 오버레이 3종 재스크린샷). **[추가1]** club.html에 브레드크럼 없던 것 추가(`코티지 이용 › 동호회`, requests.html과 동일 패턴 `.about-hero` 내부 `<nav class="breadcrumb">`). **[추가2]** 요청하기 페이지 카드 게임명(`.req-card-name`) font-weight 500→700. **[추가3]** 햄버거 드롭다운에서 "요청하기"만 빨간기(`#9e3a2a`/900)로 따로 스타일링되던 `.header-menu a[href*="requests.html"]` 전용 규칙 3줄 삭제 — 다른 메뉴 항목과 동일한 기본 갈색(`#5a3418`)·is-current 처리(`#f0e4d4`/`#3d2010`)로 통일. 영향 파일: `assets/css/style.css`, `pages/club/club.html` | 143차-173 |
| fix: 브레드크럼 간격·색 통일 + "코티지 이용" 클릭 이동 + about.html 버튼 추가 (143차-174) | **간격 버그 원인**: `.breadcrumb span{margin:0 5px;opacity:.6}`이 구분자(`›`) span뿐 아니라 about-hero 패턴의 현재 페이지 span(`<span style="color:#111;opacity:1">동호회</span>`)에도 중복 적용돼 간격이 2배로 보임(club.html/guide.html/requests.html/requests-admin.html). `.breadcrumb span:first-of-type`로 스코프 축소해 구분자만 margin 적용, 현재 페이지 span은 영향 없음 — 간격은 owned-page-breadcrumb 계열(price-rules 등)과 동일해지고, 색 구분(현재 페이지 진하게)은 기존 inline style 그대로 유지. **price-rules.html 색 구분 부재**: "코티지 이용"이 링크가 아닌 plain text라 `.owned-page-breadcrumb a`(연한 갈색) 색이 적용 안 됐던 것 — 아래 링크 추가로 자동 해결. **"코티지 이용" 클릭 이동**: price-rules.html·guide.html·club.html(최상단 브레드크럼만) "코티지 이용" 텍스트를 `<a href=".../about.html">`로 변경, 클릭 시 about.html(코티지가 만들어진 이유)로 이동. requests.html·requests-admin.html은 동일 패턴이지만 이번 요청 범위 아니라 제외(사용자 확인). **about.html 버튼 추가**: 기존 "가격·이용안내 보러가기 →"·"홈페이지 기능 보러가기 →" 아래 "동호회 보러가기 →"(`../club/club.html`) 3번째 버튼 신설. 검증: 로컬 정적 서버(node http 서버, 8765포트) + Playwright로 price-rules/club/guide 브레드크럼 스크린샷 비교(간격·색 정상화 확인) + club.html "코티지 이용" 클릭 → about.html 이동 실제 확인 + about.html 하단 버튼 3개 스크린샷 확인. 영향 파일: `assets/css/style.css`, `pages/info/price-rules.html`, `pages/info/guide.html`, `pages/club/club.html`, `pages/info/about.html` | 143차-174 |
| fix: 브레드크럼 사이즈·구분자 선택자 site-wide 통일 (143차-175) | **143차-174 후속**: "게임" 하부 페이지(owned-games/game-location/game-reviews)도 동일 패턴 적용 요청 + 사이즈를 club.html 기준(12px)으로 통일 요청. `.owned-page-breadcrumb` font-size 13px→12px로 site-wide 통일(price-rules/owned-games/game-location/game-reviews/club-history/club-schedule 전부 영향, 12px 단일값). "게임" 텍스트는 about.html 같은 연결 가능한 허브 페이지가 없어 링크화 대신 `<span class="bc-parent">게임</span>`으로 감싸 `.owned-page-breadcrumb .bc-parent{color:#a08060;font-weight:600}` 적용 — 클릭은 안 되지만 링크와 동일한 연한 갈색으로 시각적 구분만 부여. **선택자 버그 발견**: 143차-174의 `.breadcrumb span:first-of-type` 방식이 "게임" 부모를 span으로 감싸자 깨짐 — `:first-of-type`은 DOM상 "해당 태그 중 첫 번째"를 가리키므로 `<span class="bc-parent">게임</span> <span>›</span>` 구조에서 구분자가 아닌 bc-parent가 첫 번째 span이 되어버려 의도와 다른 요소에 margin/opacity 적용됨. 근본 수정: 구분자 span에 `class="bc-sep"`을 명시적으로 부여(10개 파일의 `<span>›</span>` 전부)하고 CSS를 `.breadcrumb .bc-sep{margin:0 5px;opacity:.6}`로 변경 — 구조 순서에 의존하지 않는 명시적 선택자로 전환. 검증: Playwright로 owned-games/game-location/game-reviews/price-rules/club 5개 페이지 브레드크럼 스크린샷 + `getComputedStyle().fontSize` 3개 페이지 12px 일치 확인. 영향 파일: `assets/css/style.css`, `pages/game/owned-games.html`, `pages/game/game-location.html`, `pages/game/game-reviews.html`, `pages/club/club.html`, `pages/club/club-schedule.html`, `pages/club/club-history.html`, `pages/info/guide.html`, `pages/info/price-rules.html`, `pages/admin/requests.html`, `pages/admin/requests-admin.html` | 143차-175 |
| fix: embed 모드 내부 링크 헤더 중복 + 모임 플래너 라벨/링크 통일 (143차-176) | **[버그] embed 시트 안 내부 링크 클릭 시 헤더 중복**: guide.html 오버레이(iframe)로 club.html을 띄운 상태에서 club.html 내부의 브레드크럼·카드 링크(예: 143차-174에서 추가한 "코티지 이용"→about.html)를 클릭하면 그 링크에 `embed=1`이 없어 iframe이 일반 모드로 새 페이지를 로드 — 그 페이지의 `header.js`가 정상 헤더를 삽입해 guide.html 바깥 헤더와 겹쳐 보임. 개별 링크마다 embed=1을 박아넣는 대신(향후 추가되는 링크마다 또 깨짐) `header.js`의 embed 분기에 공통 클릭 인터셉터를 추가 — `document` 클릭을 위임으로 감지해 내부 `.html` 링크(외부/새창/`#`/`mailto:`/`tel:`/`javascript:` 제외)면 `embed=1`을 자동으로 붙여 재이동, 단일 진입점이라 신규 링크가 추가돼도 자동 적용됨. **[기능] "동호회" 카드/버튼 → "모임 플래너"로 통일**: guide.html "동호회" 카드를 "모임 플래너"로 개명(아이콘 동일, 설명 "동호회 모임 일정\n확인 및 참여" 2줄), 링크 대상도 `club.html` → `club-schedule.html`로 변경(클릭 시 club.html이 아닌 모임 플래너로 바로 이동). club.html `#club-meeting` 섹션의 "📅 모임 참여하기" 카드명을 "모임 플래너"로 통일(기존 해당 카드 `<a>` aria-label이 이미 "모임 플래너"였던 것과 표시 텍스트 불일치를 함께 해소). 섹션 내부 브레드크럼("모임참여하기")은 사용자 지시로 원복 — 카드명만 바꾸고 브레드크럼은 그대로 유지. 검증: Playwright로 club.html?embed=1에서 브레드크럼 클릭 → about.html?embed=1로 이동 + 헤더 0개 확인, guide.html "모임 플래너" 카드 클릭 → iframe src가 club-schedule.html?embed=1로 로드되는지 확인, 카드/섹션 텍스트 스크린샷 확인. 영향 파일: `assets/js/header.js`, `pages/info/guide.html`, `pages/club/club.html` | 143차-176 |
| feat: 회원 자기소개 ↔ 내 보드 > 모임 보드 데이터 연동 (143차-177) | **DB(마이그레이션 004/005)**: `member_intros`에 `travel_range`/`meeting_style` 컬럼 + `UNIQUE(user_id)` 추가(유저당 1행), 신규 테이블 `meeting_game_prefs`(list_type으로 "이번에 하고싶은 게임"/"룰 설명 가능한 게임" 구분, game_likes와 동일 행 구조). `profiles.bio`는 취향보드/자기소개/모임보드 3곳이 공유하는 한줄소개 SSOT로 명문화(updateUserBio 재사용, 신규 컬럼 없음). **API(supabase-client.js)**: `getMeetingProfile`/`getUserMeetingProfile`/`upsertMeetingIntro`/`addMeetingGamePref`/`removeMeetingGamePref` 5개 신규 함수. **모임 보드(kakao-auth.js)**: 143차-172의 mock 레이아웃을 실데이터로 교체 — 상단 "모임 프로필"(활동지역/참여시간/이동범위/한줄소개/모임스타일, 수정 버튼) + 게임 목록 2종(취향보드와 동일한 검색·추가·삭제 패턴) + 최근 모임 참여. 저장 시 자기소개 페이지에서 설정한 닉네임을 카카오 닉네임으로 덮어쓰지 않도록 `_meeting.nickname` 우선 순위 적용(발견한 버그 즉시 수정). **회원 자기소개(club-intro.html)**: 작성을 로그인 필수로 전환(기존 비로그인 글은 `user_id=null` 레거시로 보존, 연동 제외), 한줄소개/이동가능범위 입력 필드 추가, insert→upsert 전환. 카드 클릭 시 `openOtherMeetingSheet(userId)`로 해당 회원의 모임 보드 진입 — hover 시 카드가 살짝 떠오르고(`translateY(-3px)`+그림자) 우측 하단에 "모임 보드 보기 ›" 텍스트로 클릭 가능성을 암시(과한 버튼 느낌 배제). **읽기 전용 모임 보드(`openOtherMeetingSheet`)**: 처음엔 별도 오버레이 스타일(`.other-profile-overlay`)로 구현했으나 사용자 피드백으로 본인 모임 보드와 동일한 `.profile-panel`+`.profile-subsheet` 마크업으로 전면 재작성 — 뒤로가기 시 그 유저의 "내 보드" 메인 패널(읽기 전용, 취향보드/모임보드 카드만 노출)이 보이고 ✕로 전체 닫기. 본인 카드 클릭 시 `openProfilePanel('meeting')`으로 위임. **데이터 보정**: 호핀(오너) 계정의 2026-05-27자 레거시 자기소개 글(로그인 필수화 이전 작성, user_id=null)을 현재 계정에 1회성으로 연결(사용자 승인 후 UPDATE). **검증**: Playwright로 로컬 정적 서버(node, 8765포트) + 가짜 로그인(localStorage.kakao_user) 주입 후 ① 자기소개 작성→모임보드 반영 ② 모임보드 수정(게임 추가/프로필 편집)→자기소개 역반영 ③ 다른 유저 카드 클릭→읽기전용 모임보드(수정 버튼 없음 확인)→뒤로가기→메인 패널 유지 ④ 콘솔 에러 0건까지 실데이터로 확인. 과정에서 `meeting_game_prefs` RLS 활성화로 게임 추가가 401로 막히는 버그 발견 → 005 마이그레이션으로 RLS 비활성화(이 프로젝트는 카카오 로그인 기반이라 Supabase Auth RLS 미적용, 다른 테이블과 동일 정책). 영향 파일: `docs/migrations/004_meeting_profile.sql`(신규), `docs/migrations/005_meeting_game_prefs_rls_fix.sql`(신규), `assets/js/supabase-client.js`, `assets/js/kakao-auth.js`, `pages/club/club-intro.html`, `assets/css/style.css` | 143차-177 |
| fix+feat: 방문자 통계 봇 트래픽 조사 + 봇/회원/비회원 트래킹 분리 (143차-178) | **조사**: 2026-06-30 방문자 40명 집계 신고 → `__visitor__` 마커 41건 중 36건이 동일 2.5시간대(16:26~19:03 KST)에 전부 다른 session_key·referrer=null로 사이트 주요 페이지(about/price-rules/guide/club/requests 등)를 순회한 패턴 확인. `page_sessions`와 매칭한 결과 관리자(호핀) 본인 세션과 전혀 겹치지 않음 — 관리자 중복집계·로그인 플리커 가설 모두 데이터로 배제, 봇/크롤러 트래픽으로 결론(page_views에 user-agent 컬럼이 없어 100% 확정은 불가). **DB(마이그레이션 006)**: `page_views`에 `is_bot`(boolean, default false), `user_id`(text, nullable) 컬럼 추가. 과거 데이터는 소급 보정하지 않음(is_bot=false/user_id=null로 일괄 채워짐 — 신규 데이터부터 정확). **API**: `trackPageView(page, referrer, extra={})`로 시그니처 확장(기존 2-arg 호출 호환), `__visitor__` 마커 삽입 시점에 `_isBotUA()`(알려진 크롤러 UA 패턴 매칭)·`_currentVisitorUserId()`(localStorage.kakao_user에서 즉시 읽음, DOM 의존 없음)로 is_bot/user_id 채움. **관리자 UI**: 분석 탭 요약 카드 영역에 "전체 방문자(봇 제외)/회원 방문자/비회원 방문자/봇 방문자" 4종 신규 카드 추가(기존 "오늘 방문자/7일평균/지난주대비/주요유입" 카드는 유지, `visitorRows`가 is_bot 제외 기준으로 바뀌면서 날짜별 차트·7일평균 등 기존 지표도 자동으로 봇 제외 적용됨 — 부수 효과). `page_views` select에 `is_bot, user_id` 컬럼 추가. **검증**: Playwright로 봇 UA(Googlebot)/일반 UA 각각 trackPageView 직접 호출 → DB에 is_bot/user_id 정확히 기록되는지 확인(PASS) + 관리자 페이지 실제 로그인 시뮬레이션으로 4개 카드 정상 렌더링·콘솔 에러 0건 확인. 영향 파일: `docs/migrations/006_visitor_bot_tracking.sql`(신규), `assets/js/supabase-client.js`, `pages/admin/requests-admin.html` | 143차-178 |
| fix: 모바일 내 보드 메인 패널 스크롤 시 배경 페이지 같이 스크롤되는 버그 (143차-179) | **증상**: 모바일에서 내 보드(`#profilePanel`)를 열고 위아래로 스크롤하면 진입 전 페이지가 패널 뒤에서 같이 스크롤됨. 서브시트(취향보드/기록보드 등)에서는 발생 안 함. **근본 원인**: `.profile-panel-box`가 `border-radius:18px`와 `overflow-y:auto`를 같은 요소에 함께 사용 — `DESIGN_RULES.md §6`에 명시된 안티패턴(142차-118 game-sheet-panel 버그와 동일 원인)이면서, 단일 레이어 스크롤 박스라 스크롤 경계에서 체이닝을 막을 장치가 없어 모바일에서 배경 페이지로 그대로 새어나감. 서브시트(`.profile-subsheet-box`+`.profile-subsheet-body`)는 처음부터 outer/inner 분리 구조라 이 문제가 없었음. **수정**: `.profile-panel-box`를 outer(`overflow:hidden`, `display:flex;flex-direction:column`, border-radius 클리핑 전담)로, 신규 `.profile-panel-body`를 inner(`flex:1;overflow-y:auto;overscroll-behavior:contain`, 스크롤 전담)로 분리 — `.game-sheet-panel`/`.game-sheet-scroll`과 동일 패턴. `overscroll-behavior:contain`은 실제 스크롤되는 inner 요소에 둬야 효과가 있음(outer에 두면 무의미 — 시행착오로 확인). **검증**: Playwright(iPhone 13 에뮬레이션, hasTouch)로 패널 본문을 끝까지 스크롤한 뒤 패널 영역 위에서 추가 휠 이벤트 발생 시 배경 페이지 `window.scrollY`가 변하지 않음을 확인(0→0), 패널 레이아웃 스크린샷으로 헤더 고정+콘텐츠 정상 스크롤 시각 확인. 영향 파일: `assets/css/style.css` | 143차-179 |

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
- [ ] **[96]** 게임시트 "게임평 남기기" → 카네기 등 game-reviews에서 입력한 기록에서도 "기존 플레이 기록에 연동" 체크박스 노출
- [x] **[96]** 게임평 남기기 모달 placeholder → "게임에 대한 평가를 남겨주세요" ✅ 확인
- [x] **[96]** 바텀시트 사진 클릭 → 라이트박스 캡션 첫 줄에 닉네임 표시 ✅ 확인
- [x] **[96]** 기록게시판 사진 클릭 → 라이트박스 캡션 첫 줄에 닉네임 표시 ✅ 확인
- [x] **[96]** 여러 명 사진 올린 게임 바텀시트 → 헤더 "N명의 사진" / 전체사진 그리드 각 이미지 아래 닉네임 ✅ 확인
- [x] **[96]** 기록게시판 게임평 있는 카드 → 게임평 앞에 작은 [닉네임] 태그 표시 ✅ 확인
- [x] **[97]** 기록게시판 "사진 추가" 세 번째 탭 표시 ✅ 확인
- [x] **[97]** 사진 추가 탭 → 기록 드롭다운 전체 기록 최신순 표시 ✅ 확인
- [x] **[97]** 사진 선택 → 그리드 미리보기 → 추가하기 → 해당 기록에 사진 반영 ✅ 확인
- [x] **[98]** 기록게시판 사진 3장 초과 시 "+N장" 클릭 → 라이트박스 아닌 가로 펼침 ✅ 확인

### 142차 보류 항목

| 항목 | 사유 |
|------|------|
| 한줄소개 GPT 연동 | 이전 기획 내용 복원 불가 — 사용자가 다시 공유 필요 |
| 모임플래너 참여자 UI 추가 개선 | 방향 논의 필요 (현재: 이름 클릭→프로필 시트) |
| 모임 플래너 Phase 3 게임 투표 | Red — Plan 필수, meeting_vote_games 테이블 신규 |
| 취향보드 Phase 2 (성향 5축) | Phase 1 테스트 후 진행 |

**143차-156 완료 (2026-06-30)**
- ~~[4]+[5]~~ 게임시트 링크 2줄 재배치 완료 (게임위치+책장 통합 1줄 / 룰영상+정리법 2줄)
- ~~[8]~~ stats flex:1 확장 + 폰트 14→15px 완료
- ~~[6] item 5~~ 바텀시트 닫을 때 스크롤 위치 복원 완료
- 배지 배경 var(--cream), 텍스트 #3d2a18, 파이프 구분자 적용
- 추천필터 exclusive 토글, 외부박스 제거, 버튼에 색상 적용, hint 위치
- 기록페이지 고정헤더 gap 수정
- 게임시트 박스 여백·패딩 전반 조정 (진행/디자이너/게임설명/게임평 등)
- sheet-meta-label p태그 브라우저 기본 margin 제거 (같은 디자이너 박스 상단 균등)

**다음 작업 후보 (우선)**
- ~~**[모임 보드 데이터 연결]**~~ — 완료 (143차-177). 회원 자기소개(club-intro.html) ↔ 내 보드 > 모임 보드 데이터 연동.
- ~~**[143차-155 미완료 — [6] item 13]** 기록보드 게임평/플레이기록 게임타이틀에 썸네일 추가 (JS)~~ — 완료 (143차-158, _getGameThumbKey bgg.id fallback)
- ~~**[143차-155 미완료 — [9][10][10-1][11][11-1]] 내보드 대공사**~~ / ~~**[내보드 정기모임 위치 재구성]**~~ — 완료 (143차-165, 카드 그리드 재배치 + 모임 보드 카드 신설)
- **[추천필터 미완료]** "2-3그러면 이제" 이후 잘린 항목 — 사용자에게 재입력 요청 필요
- **[취향보드 수정 후 내보드 즉시 갱신]** — 취향보드에서 뭔가 수정하고 내보드로 돌아오면 정보가 바로 갱신 안 됨. 닫았다 열어야 갱신됨. 탭 전환 또는 저장 후 관련 섹션 re-render 트리거 필요.
- **[취향보드 한줄소개 칩 줄바꿈]** — "새로해보는..." / "익숙지않은..." 두 칩이 1줄에 같이 있어야 하는데 현재 줄바꿈됨. 칩 너비 축소 또는 font-size 조정으로 해결 가능 여부 확인.
- ~~**[guide.html 요청하기 카드 미세조정]**~~ — 완료 (143차-184). 마지막 요청하기 카드의 최대폭을 `calc(50% - 6px)` 고정 반폭에서 `min(360px, 100%)`로 변경해 PC 폭은 기존과 비슷하게 유지하고 모바일에서는 지나치게 좁아지지 않도록 조정.
- ~~**[플레이기록 기록입력 탭 안내 문구]**~~ — 완료 (143차-186). 기록입력 탭의 게임 검색 위에 `🎁 첫 플레이 기록 작성 시 음료 교환권 1장 지급!` 안내를 추가하되, 기존 교환권 내역에 `first_play` 지급 기록이 있는 사용자는 숨김. 기록보기 탭 변경 없음.
- ~~**[PC 헤더 삐뚤빼뚤 + 관리자 교환권 안내 버그]**~~ — 완료 (143차-187). ① PC 헤더: `menu-admin-link`의 `flex:0 0 100%`가 PC flex-row 레이아웃에서도 줄바꿈을 강제해 헤더가 2줄이 되던 문제. PC 미디어쿼리에서 `flex:0 0 auto; padding:0 7px` 오버라이드 + `menu-login-area{flex-wrap:nowrap}` + `menu-kakao-login-btn{flex:0 0 auto}` 추가. ② game-reviews.js 기록입력 탭: 관리자는 `first_play` 지급 제외 대상인데 `hasFirstPlayVoucher` 체크가 없어 안내 문구가 항상 노출됐던 버그 — `_isAdmin(cottage_is_admin)` 체크 추가. ③ kakao-auth.js 알림 교환권 카드: 관리자는 카드 자체 숨김(voucherCardHtml=''). 이미 수령한 일반 유저는 "수령 완료" 텍스트+is-seen 스타일로 교체(버튼 없음). 미수령 유저는 기존 동작 유지. `_effectiveVoucherSeen` 플래그로 NEW 카운트·카드 위치 통합 관리.
- **[게임위치 카테고리 스티키 헤더]** — 게임위치 페이지에서 특정 카테고리(예: 파티게임) 토글 열면 해당 카테고리 헤더 sticky 고정. 토글 닫거나 다른 카테고리로 이동 시 해제. 게임 바텀시트 → "꽂혀있는 책장 보러가기" 진입 시에도 동작: 게임위치 고정헤더 하단에 카테고리 헤더가 추가 sticky되는 구조.
- **[추천게임 전체카드 페이지 고정헤더 크기 점검]** — `더보기` 버튼 클릭 후 나오는 전체 카드 페이지(owned-games 계열)의 고정 헤더가 비정상적으로 큰지 확인 필요. 재현 → 비교 → 필요 시 CSS 수정.
- ~~**[헤더 클릭 시 스크롤 살짝 올라가는 버그]**~~ — 완료 (143차-183). `backToHero()`가 추천 섹션이 닫혀 있고 이미 최상단이어도 `scrollIntoView()`를 호출하던 문제를 방지. 추천 섹션이 열려 있거나 실제로 아래에 있을 때만 `scrollTo({top:0})` 실행.
- ~~**[Hero CTA 개선 — 확정 사항]**~~ — 143차-182 적용 후 사용자 테스트 피드백으로 Secondary "기록 남기기" 강조는 기존 크림 아웃라인 스타일로 롤백(143차-185). 보상 안내 문구는 첫 기록 보상 미수령자에게만 표시하도록 조정(143차-186).
- **[Hero CTA 개선 — A/B 후보]** — ① 버튼 문구: "📝 게임 기록 남기기" / "📝 플레이 기록 남기기" / "📝 플레이 기록 작성" 비교. ② 버튼 아래 보조 문구(첫 기록 시 음료 교환권). ③ Primary 버튼 5~10% 크게. 시안 비교 후 결정, 즉시 적용 금지.
- **[운영 퍼널 분석 시스템]** — `docs/PLAN_funnel_analytics.md` 참조. event_name 기반 이벤트 추적(hero_recommend_click 등 7종) + Hero 하단 실시간 완료 카운트 + 관리자 분석 탭 개편. 다음 세션 시작 시 Plan 검토 후 진행. 🔴 Red (DB 신규 가능성, 구조 변경)
- **[관리자 분석 상위 탭 클릭 시 스크롤 정렬]** — `요약/방문/유입/페이지/이벤트/회원` 상위 탭을 누르면 해당 탭 패널 맨 위가 고정된 탭+날짜줄 바로 아래에 오도록 스크롤 이동. 별도 버튼 신설 금지. 방문 하위 탭(`시간대/회원·비회원/...`)은 같은 화면 안 차트 전환이므로 스크롤 이동 없음.
- **[소개글 알림 묶음 분리 후보]** — 현재 여러 명이 소개글 올리면 "냐냐뇨뇨 외 N명" 묶음 카드로 표시. 클릭 시 첫 번째 작성자만 열림. 향후 개선 시 작성자별 개별 카드로 분리 검토.
- ~~**전체기록시트 플레이기록 카드 디자인 개선**~~ — 완료 (142차-95)
- ~~**PC버전 게임위치 시트 크기**~~ — 완료 (142차-94)
- ~~**기록게시판 사진 미리보기 "+N장" 토글**~~ — 완료 (142차-98)
- ~~**기록게시판 사진 기록하기 버튼 (세번째 탭)**~~ — ~~롤백~~ 완료 (142차-99-1)
- ~~**게임시트 같은 디자이너 다른 게임 가로 스크롤**~~ — 완료 (142차-99)
- ~~**카베르나 게임평 나나 명의 문제**~~ — 142차-91에서 game_id 이중저장 근본 수정(BGG ID 우선 저장)으로 신규 기록은 정상 처리. 기존 잘못된 레코드는 건드리지 않기로 결정(사용자 판단).
- ~~**[1] 142차-97 롤백**~~ — 완료 (142차-99)
- ~~**[2] 게임시트 사진 남기기 버튼**~~ — 기록 페이지 사진 섹션에 📷 남기기 버튼 추가 완료 (142차-115). 게임평 모달 동일 패턴, 기존 플레이 기록 연동 또는 신규 기록 생성.
- ~~**[같은 디자이너 게임 → 뒤로가기]**~~ — 완료. openGameSheet에 fromKey 파라미터 추가, 같은 디자이너 카드 onclick에 현재 게임키 전달, 새 시트 최상단에 '← [이전 게임명]' 버튼 표시.
- ~~**[3] 게임상세시트 플레이 기록하기 플레이어 자동완성**~~ — 완료 (142차-120). tag-input-wrap + initTagInput + attachAc 연결, _prPlayerNames lazy load.
- ~~**[4] 게임 상세시트 수정/삭제 버튼 top-right 탈출 버그 + 관련 수정**~~ — CSS 스코프 수정 (142차-106), 섹션 복구 (142차-108). .sheet-comment-actions의 position:absolute를 .sheet-comment-item 컨텍스트로 스코프 축소. initSheetPhotos 사진 그리드에서 작성자 닉네임 표시 제거 (라이트박스 캡션에만 유지, 142차-108).
- ~~**[이전 세션 발생 버그 3개 수정]**~~ — (142차-113) 귀 현상은 이미 해결(142차-111, border-radius 제거). 외부박스 복구(border-radius 없이), 게임평 미리보기 수정/삭제 버튼 숨김(.sheet-play-scroll-card .sheet-comment-actions{display:none}), 게임시트 스크롤 리셋 개선(is-active 이후 rAF로 scrollTop 설정).
- ~~**[바텀시트 코너 삐져나옴 3세션 시행착오 기록]**~~ — (142차-118) **근본 원인:** `overflow-y:auto`+`border-radius`를 `.game-sheet-panel` 단일 요소에 함께 사용 → Chrome 컴포지터가 GPU 레이어로 승격 시 배경을 직각으로 렌더링, 라운딩 밖으로 크림색 사각형이 튀어나와 보임. **이전 세션 시행착오:** ① `.sheet-records-group` 카드 스타일 제거 시도(142차-109, revert) — 엉뚱한 요소 타깃. ② `border-radius` 자체를 제거(142차-111) — 현상을 숨겼을 뿐 근본 해결 아님, 이후 복구(142차-113). ③ `-webkit-overflow-scrolling:touch` 제거 — 원인 아님. ④ 코드 전체 탐색 방향 없이 반복 read — 토큰 낭비. **올바른 진단법:** DevTools Elements 탭에서 해당 코너 클릭 → `.game-sheet-dim`이 선택됨(어두운 오버레이) → 그 뒤에 `.game-sheet-panel` 배경이 직각으로 렌더링돼 보이는 것. **해결:** outer(`.game-sheet-panel`) `overflow:hidden`만, inner(`.game-sheet-scroll`) `overflow-y:auto` 분리. JS scroll 참조 5곳 변경. DESIGN_RULES.md §6 참조.
- ~~**[5] 방문자목록 회원탭 표시 개선**~~ — 완료 (142차-99, applyVisitorFilter/expandVisitorMore 함수)
- ~~**[6] 비주얼분석 날짜 필터 → 상단 지표 동기화**~~ — 완료 (142차-99, draw() 내 기간 연동)
- **[7] 페이지/회원 분석 기간 필터 개편** — 기본값 최근1주일, 대분류 "최근1주일/전체" 추가, 각 대분류 아래 전체/회원/비회원 서브탭 유지
- ~~**[8] 더루프 사진 미표시**~~ — 완료 확인
- ~~**같은 디자이너 디자인 개선 (A 스타일)**~~ — sheet-info-group 클래스 추가 완료 + 박스 여백 축소 (142차-102, padding 12→10, margin-bottom 12→8)
- ~~**오너 방문 카운팅 제외**~~ — kakao-auth.js에서 오너 로그인 시 cottage_is_admin 자동 설정

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

10. ~~**about.html HOW 섹션 사진 교체**~~ — 완료 (143차-169). 공간의 제약→photo-library.jpg, 시작의 제약→photo-recommend.jpg(실제 기능 캡처) 실사진 교체 완료.
11. **about.html/price-rules.html 파일명 리네임 보류** — about.html→story.html, price-rules.html→pricing.html 의미상 후보였으나(143차-162 논의), 외부 공유 링크/SEO 인덱스/카카오톡 링크/QR 가능성 대비 이득이 작아 보류. 재검토 시 redirect shim(`pages/store/` 패턴) 동반 필요.

---

### 코드 품질 주석 (리팩토링 참고용)

- `kakao-auth.js` 취향보드 이벤트 핸들러: for 루프 + 이벤트 위임 혼용. 추후 서브파일 분리 검토.
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

### 기록보드(내보드) 버그 3건 (2026-06-27 발견)

**[BUG-B] 기록보드 게임평 미표시 → 수정 완료 (142차-136)**
- 원인 1: `getGameComments(gameKey)`가 단일 키만 조회 → 배열 지원 + `_gameIds` 전달로 한글명/BGG ID 둘 다 조회
- 원인 2: `getMyStats`에서 `game_comments.game_id`(없는 컬럼) 조회 → `game_key, comment_text`로 수정
- 원인 3: profile panel "게임평" 섹션이 `review_text`(game_play_records)만 표시 → `game_comments`도 통합
- `commentListHtml` 변수 미정의 버그도 함께 수정

**[BUG-A] 기록보드 사진 +N 토글 오작동 → 143차-137 완료**
- 3열 CSS grid(전체폭), aspect-ratio 1:1 정사각형 썸네일
- 6장(3열×2행) 기본 표시, +N 클릭 시 인라인 확장
- 사진 클릭 라이트박스: 작성자/모임/날짜/인원/시간/점수 캡션 표시
- 본인 사진에 삭제 버튼 표시 (updateGamePlay 개별 삭제)

**[BUG-B] 기록보드 게임평 미표시**
- 증상: 게임평을 여러 개 작성했는데 더루프 게임평만 표시됨. 나머지 연동 안 된 것으로 보임.

**[BUG-C] 기록보드 플레이기록 카드 클릭 범위 과도 → 143차-136 수정 완료**
- 원인: kakao-auth.js `profile-activity-item` 전체에 click 핸들러 바인딩
- 수정: 게임이름을 `<button class="profile-game-link">` 래핑 후 버튼만 click 핸들러 적용

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
| 관리자/로컬 카운팅 제외 기준 통합 (2026-07-02) | 143차-189에서 localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID=4916417947)는 `page_views`, `page_events`, `page_sessions`, `anon_sessions`, `profiles.visit_count/total_minutes/today_seconds` 누적에서 제외하도록 통합. 관리자 분석 화면도 관리자 user_id가 붙은 rows/pageViews/profiles를 표시 집계에서 제외. 과거에 user_id 없이 쌓인 관리자 추정 page_views는 식별 불가하므로 삭제/소급 보정하지 않음. |
| 방문자 통계 명/회 역전 (2026-07-01) | 143차-190에서 `page_views.session_key` 추가 계획/마이그레이션/코드 반영. 신규 데이터는 `__visitor__` 행 안의 `user_id || session_key`로 명/회를 함께 계산한다. 실제 운영 DB에 `docs/migrations/007_page_views_session_key.sql` 적용 전에는 관리자 화면이 fallback 조회를 사용하며, 과거 NULL 행은 행 단위 fallback으로 집계한다. |
| 기록보드 플레이기록 시간 | 기록보드에 표시되는 플레이기록 시간이 전부 09:00으로 표시됨. 원인 미확인 |
| 서브시트(취향보드 등) 상단 모서리 음영 (2026-06-30) | 사용자가 스크린샷으로 보고한 모서리 음영 — 시도한 가설 3건 모두 효과 없음: ①`.profile-activity-toggle` 상단 radius 제거, ②`.profile-subsheet-header` radius를 box와 맞춤(overflow:hidden이라 무의미함 확인), ③`.profile-subsheet-header`에 `background:#fff` 추가(외부 GPT 의견, 적용했으나 미해결). 다음 시도 전 확대 스크린샷으로 정확한 형태 확인 필요 |
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

- [x] **게임시트 상단 레이아웃 개편** (커밋: 39fe161) — sheet-img-col 제거, sheet-en-title을 sheet-title-block 최상단으로 이동, 버튼 한 줄 배치([꽂혀있는 책장 보기][룰영상 보기]), 헤더 썸네일 클릭 시 _openCoverModal() 표지 확대 모달.

---

- [ ] **[기술부채] 오늘 이벤트 수 집계 날짜 비교** — `initHeroStats`에서 `created_at`(UTC 타임스탬프) 날짜 부분을 KST 날짜 문자열과 비교. KST 00~09시 사이 이벤트는 UTC 기준 전날로 저장되어 오늘 집계에서 누락됨. 수정 방향: 문자열 비교 → KST 범위 타임스탬프 비교로 전환. 관련 파일: `assets/js/index-page.js` `initHeroStats`.

- [ ] **[PC 리팩토링] 타인 보드 내부 네비게이션 통일** — 모임보드→취향보드 등 전환이 바텀시트로 뜸. 내 보드와 동일한 센터모달 + 고정 헤더 + 뒤로가기로 통일.
- [ ] **[검토] 기록보드 타인 공개** — 요약(플레이 수·게임평)만 부분 공개 또는 본인 설정 온오프. 함께한 시간은 비공개 유지 확정.
- [ ] **[디자인] 모임보드 개선** — 미입력 필드 노출 방식, 일정 막대 정보 밀도, 하고 싶은 게임 0개 빈 상태.

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
- [ ] **[보안] meeting 계열 쓰기 보호** — `meeting_votes` / `meeting_vote_games` / `meeting_game_prefs` 전체 현재 UNRESTRICTED (anon 키로 전체 읽기/쓰기/삭제 가능). auth.uid() 불가(카카오 OAuth 구조상 Supabase Auth 세션 없음 = uid() NULL). 방향: Edge Function 경유 write (서버에서 카카오 토큰 검증 후 service_role로 write), 별도 설계 세션 필요. RLS UNRESTRICTED 배지는 그때까지 의도적 유지. 마이그레이션 010으로 분리.

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
| 2026-07-02 | design: 모임플래너 상세 UI 1차 개선. myVoteSection을 날짜 제목 바로 아래 최상단으로 이동(overlapSection 앞). 등록된 경우 '내 등록' 레이블 → '✅ 참여중' 상태 배지로 교체. 버튼 텍스트 '수정'→'시간 변경', '취소'→'참여 취소'. 통계 카드 라벨 아이콘 추가(👥 참여/⏰ 전체/🔥 겹침). 겹치는 시간대 섹션 레이블 → '🔥 모두 가능한 시간'. 슬라이더 로직·DB 구조 미수정. (143차-189) |
| 2026-07-02 | fix: 관리자 분석/카운팅 기준 통합. `supabase-client.js`에 localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID=4916417947) 제외 공통 기준을 두고 `trackPageView`, `trackEvent`, `__visitor__` 마커, 로그인 체류시간/page_sessions, 비회원 anon_sessions/page_sessions, profiles 방문수/체류시간 누적에 적용. `script.js`의 구형 직접 page_sessions 전송 경로에도 동일 제외 기준 추가. 관리자 분석 페이지는 로드 직후 관리자 user_id가 붙은 rows/pageViews/profiles를 집계에서 제외하고, 방문자 구성 도넛을 일반 page_views가 아니라 전체 방문자 카드와 동일한 `__visitor__` 기준으로 변경해 총합 불일치(예: 전체 13명 vs 비회원 24명)를 방지. 방문자 더보기/닫기 최초 클릭이 먹히지 않던 문제는 숨겨진 `visitorExtras` 부모를 먼저 열도록 수정. (143차-189) |
| 2026-07-02 | fix/plan: 관리자 분석 `명/회` 기준 통합 1단계. `docs/PLAN_admin_analytics_counting.md` 생성 후 `page_views.session_key` 마이그레이션(`007_page_views_session_key.sql`) 작성, `trackPageView`가 기본으로 `session_key`를 저장하도록 수정. 관리자 분석의 주요유입/유입 차트/유입×페이지 상세는 `page_sessions`와 섞지 않고 `__visitor__` 행의 `user_id || session_key` 기준으로 명을 계산한다. `session_key` 컬럼 미적용 DB에서는 관리자 화면이 기존 컬럼 조회로 fallback. (143차-190) |
| 2026-07-02 | design: 관리자 분석 탭 sticky 적용. 사용자 제안의 3단 고정헤더(분석 제목 + 상위 탭 + 방문 하위 탭)는 모바일 차트 영역을 과하게 줄이고 top/z-index 충돌 위험이 높다고 판단해 보류. 대신 `방문/회원/유입/페이지/이벤트` 상위 탭만 `.admin-group-title` 아래에 sticky로 고정하고, 날짜 필터와 방문 하위 탭(`시간대/회원·비회원/...`)은 기존 흐름 유지. (143차-191) |
| 2026-07-02 | design: 관리자 분석 날짜 컨트롤 위치 조정. 날짜 범위/날짜 이동은 `방문` 하위 옵션이 아니라 `방문/유입/페이지`에 공통 적용되는 분석 조건이므로, 상위 분석 탭과 같은 `.admin-analysis-controls` 묶음으로 감싸 함께 sticky 처리. 방문 하위 탭(`시간대/회원·비회원/...`)은 기존 위치 유지. (143차-193) |
| 2026-07-02 | design: 관리자 분석 탭 구조 조정. 기존 상단 고정 요약 카드를 `요약` 탭으로 옮기고 기본 선택으로 설정. 상위 탭 순서를 `요약/방문/유입/페이지/이벤트/회원`으로 변경해 방문 흐름을 먼저 보게 하고, 회원 분석은 맨 뒤로 이동. 날짜 범위/날짜 이동 컨트롤은 요약/이벤트/회원에서는 숨기고 방문/유입/페이지에서만 표시. (143차-194) |
| 2026-07-02 | design: 관리자 분석 요약 탭 보강. 요약 탭도 날짜 범위/날짜 이동 컨트롤을 사용하도록 변경하고, 방문자 지표는 4개 카드가 아니라 `방문자` 카드 1개로 통합. 큰 숫자는 봇 제외 전체 방문자, 하위 숫자로 회원/비회원/봇을 표시해 전체와 봇 카운트가 섞여 보이지 않게 조정. (143차-195) |
| 2026-07-02 | fix/design: 관리자 분석 요약 카드 배치 정정. 방문자 통합 카드를 `주요 유입` 뒤에 새로 추가하지 않고, 요약 첫 번째 카드 자체를 `방문자` 카드로 변경. 요약 카드 순서는 `방문자/평균/전기간 대비/주요 유입` 4개로 유지하고, 방문자 카드 내부에 봇 제외 전체 숫자와 회원/비회원/봇 하위 숫자를 표시. (143차-196) |
| 2026-07-02 | design: 관리자 분석 요약 방문자 카드 하위 숫자 표시 조정. 회원/비회원/봇 숫자를 세로 블록과 굵은 숫자에서 한 줄 작은 보조 텍스트(`회원 n명 비회원 n명 봇 n명`)로 변경해 옆 카드의 보조 정보 톤과 맞춤. (143차-197) |
| 2026-07-02 | design: 관리자 분석 고정 영역 압축. `분석` 그룹 제목은 sticky에서 제외하고, 상위 탭(`요약/방문/유입/페이지/이벤트/회원`)과 날짜 컨트롤만 고정되도록 변경. 기간 버튼과 날짜 이동 버튼을 한 줄 `.admin-date-controls`로 묶어 화면 세로 공간을 줄이고, 상위 탭 클릭 시 선택된 패널 시작점이 고정 탭+날짜줄 아래에 오도록 스크롤 정렬. 방문 하위 탭은 스크롤 이동 없음. (143차-198) |
| 2026-07-02 | design: 관리자 분석 날짜 이동 라벨을 짧게 표시. 화면 상단 날짜 칸은 일 단위 `6/3(금)`, 7일 단위 `6-1`, 30일 단위 `6월`처럼 압축해 작은 모바일 폭에서도 의미가 보이게 하고, 차트 부제에는 기존 긴 날짜 설명을 유지. 유입 탭의 `상세 (유입 → 페이지 이동)`은 `유입별 이동 페이지`로 이름을 바꾸고 기본 펼침으로 전환. 페이지 탭의 체류시간/횟수 정보는 별도 구조 개선 후보로 유지. (143차-199) |
| 2026-07-02 | fix/design: 관리자 분석 날짜 이동 라벨 조정 및 탭 스크롤 위치 보정. 7일 단위 라벨은 `6-1`이 월/주 의미를 바로 알기 어려워 `6월 1주` 형식으로 변경. 상위 탭(`방문/유입/페이지/이벤트/회원`) 클릭 시 패널 내부가 조금 내려간 상태로 보이던 문제는 패널 시작점이 아니라 고정 탭·날짜 컨트롤 시작점으로 스크롤 기준을 바꿔 보정. (143차-200) |
| 2026-07-02 | design: 관리자 분석 날짜 컨트롤 폭 보정. 7일 단위 `6월 1주`가 `6월 ...`처럼 말줄임 처리되지 않도록 날짜줄의 gap, 기간 버튼 padding/font-size, 화살표 padding/font-size를 소폭 줄이고 날짜 라벨 최소폭을 넓힘. (143차-201) |
| 2026-07-02 | fix: 관리자 분석 탭 클릭 스크롤 보정 재수정. sticky 상태의 `analysisControls` 자체를 기준으로 삼으면 이미 화면 상단에 붙어 있을 때 현재 스크롤 위치가 유지될 수 있어, sticky 요소 바로 앞에 `analysisControlsAnchor`를 두고 탭 클릭 시 그 고정되지 않는 기준점으로 이동하도록 변경. (143차-202) |
| 2026-07-02 | fix: 관리자 분석 탭 진입 위치 및 페이지별 방문 중복 개선. 탭 클릭 스크롤은 좌표 anchor 방식 대신, 탭 전환 후 첫 카드(`admin-summary-grid`/`admin-chart-card`)가 sticky 탭+날짜줄 바로 아래에 오도록 화면 기준으로 보정. 페이지별 방문은 `page_sessions`의 한글 라벨(`메인`)과 slug(`index`)가 화면에서 모두 `메인`으로 보이던 중복 원인을 확인하고, 관리자 집계 단계에서 `메인`/`index`/경로형 값을 canonical page key로 정규화해 합산. DB 데이터는 수정하지 않음. (143차-203) |
| 2026-07-02 | fix: 관리자 분석 탭 진입 위치 재정렬. 143차-203의 첫 카드 기준 `scrollBy` 보정이 고정헤더 최상단 진입 의도와 충돌해 제거. 탭 클릭 시 다시 `analysisControlsAnchor` 기준으로 스크롤해 `요약/방문/유입/페이지/이벤트/회원` 고정헤더가 화면 최상단에 오도록 복원. 페이지별 방문 정규화는 유지. (143차-204) |
| 2026-07-02 | fix: 관리자 분석 탭 진입 기준을 날짜줄로 조정. 실제 고정영역은 `요약/방문/...` 상위 탭과 `오늘/7일/30일/전체` 날짜줄 2단 구조라, 요약/방문 줄이 아니라 날짜줄(`analysisDateControls`)을 스크롤 기준점으로 사용. 날짜줄이 숨는 이벤트/회원 탭은 기존 상위 탭 기준 유지. (143차-205) |
| 2026-07-02 | fix/design: 버그 1 — 내 보드 메인 패널 스크롤 시 고정헤더가 차지하는 영역 축소. 패널 시작 위치, 패널 height, sticky top은 변경하지 않고 `.profile-panel-header`의 세로 padding만 10px→7px로 줄임. 하위 기록보드/서브시트 헤더는 버그 2 범위라 미수정. |
| 2026-07-02 | fix/design: 버그 1 보정 — 내 보드 메인 고정헤더 라인 아래 흰 여백이 함께 고정영역처럼 보이는 문제를 줄이기 위해 `.profile-panel-header`의 아래 margin만 16px→6px로 축소. 패널 위치/height/top은 변경 없음. |
| 2026-07-02 | fix/design: 버그 1 추가 보정 — 내 보드 메인 고정헤더 라인 아래 흰 영역이 아직 남아 `.profile-panel-header` 아래 margin을 6px→2px로 추가 축소. 패널 위치/height/top은 변경 없음. |
| 2026-07-03 | design: 버그 5 — 고정헤더 높이 미세 축소. position/top/시트 height는 변경하지 않고 게임정보 `.sheet-sticky-bar` padding 10→8px + min-height 48→44px, 기록시트 `.sheet-record-header` padding 14→10px 및 back 버튼 하단 padding 8→6px, 내 보드 `.profile-panel-header` padding 7→6px, 기록보드 섹션 `.profile-activity-toggle` padding 9→7px, 하위보드 `.profile-subsheet-header` padding 10→8px로 값만 조정. |
| 2026-07-02 | fix/design: 버그 2 — 기록보드 하위 시트에서 기록보드 헤더와 첫 게임평 헤더 사이 여백 추가. 기록보드 전용 `.profile-subsheet-body--records`에만 `padding-top:8px`을 주고, 내부 `.profile-activity-toggle` sticky top도 8px로 맞춰 스크롤 중에도 `헤더1+공백+헤더2` 구조가 유지되도록 조정. 다른 서브시트 미수정. |
| 2026-07-02 | docs/refactor: 리팩토링 및 점검 작업 계획(`PLAN_refactor_audit_workflow.md`) 작성. 기존 `REFACTOR_CHECKPOINT.md`를 재검증 입력으로 삼고, 문서-코드 싱크 → 안전한 Green 정리 → Yellow 버그 후보 검증 → Red 별도 Plan 순서로 진행하기로 정리. 1차 점검에서 `initTagInput` 시그니처, `CottageAchievements.getCharacterPath`, `cottage_is_admin` 문서 누락 후보는 이미 해결됨을 확인하고, `club-intro.html`/`requests.html` 계열 localStorage 키 누락을 `ls-schema.md`에 보강. (143차-192) |
| 2026-07-01 | fix: 교환권 알림 카드 혼합 상태 제거 — 미수령(`_hasFirstPlayVoucher=false`)일 때 `is-seen` 클래스 적용 금지. 이전에 "확인했어요" 클릭(voucherSeen=true)해도 카드는 중립(클래스 없음) 상태로 표시, "게임 기록하기" 링크 항상 노출. `is-seen`은 실제 수령 완료 케이스에서만 사용해 미수령/수령완료 두 상태만 보이도록 보장. `grantFirstPlayVoucher`에서 관리자 예외 제거(일반 사용자와 동일 처리). (143차-188) |
| 2026-07-01 | fix/design: about.html 구분선이 여전히 푸른색처럼 보이는 원인을 `<hr>` 기본 테두리로 보고 `.about-divider`의 border를 제거하고 실제 표시 선을 더 명확한 베이지/브라운(`#c8ad83`)으로 조정. 플레이 기록 입력 탭 보상 안내는 기존 교환권 내역의 `first_play` 지급 기록이 있는 사용자에게 숨기고, 미수령 사용자에게만 느낌표가 붙은 안내 문구를 문구 크기 박스로 중앙 표시하도록 변경. (143차-186) |
| 2026-07-01 | design: 사용자 테스트 피드백 반영 — 메인 Hero `기록 남기기` 버튼 강조(브라운 테두리/900 굵기)는 기존 크림 아웃라인 스타일이 더 자연스럽다고 판단해 롤백. about.html 구분선이 화면에서 푸른 회색처럼 보여 `.about-divider`를 브랜드 브라운 투명선(`rgba(122,72,40,0.26)`)으로 재조정. (143차-185) |
| 2026-07-01 | design: guide.html 기능 카드 마지막 "요청하기" 카드 최대폭 조정. 기존 반폭 고정(`calc(50% - 6px)`)은 모바일에서 과하게 좁아질 수 있어 `min(360px, 100%)`로 변경, PC 폭은 기존과 유사하게 유지하고 좁은 화면에서는 줄 전체폭 사용. (143차-184) |
| 2026-07-01 | fix: index.html 헤더 로고/중앙문구 클릭 시 화면이 미세하게 움직이던 버그 수정. `backToHero()`에서 추천 섹션이 닫혀 있고 이미 최상단이면 스크롤 호출을 생략하고, 필요한 경우만 `window.scrollTo({top:0})`로 복귀하도록 변경. (143차-183) |
| 2026-07-01 | design/content: 메인 Hero CTA 확정 사항 반영 — Primary는 기존 베이지/크림 Filled 유지, Secondary "기록 남기기"는 브라운 테두리와 글씨 굵기를 강화. 플레이 기록 입력 탭 게임 검색 위에 `🎁 첫 플레이 기록 작성 시 음료 교환권 1장 지급` 안내 한 줄 추가(기록보기 탭 변경 없음). (143차-182) |
| 2026-07-01 | fix/design: 동호회 > 모임참여하기의 모임 플래너 카드 중복 아이콘 제거 — 아이콘 영역은 📅만 유지하고 제목은 텍스트만 표시. about/club 계열 섹션 구분선 `.about-divider` 색을 `var(--line)`의 푸른 회색 계열에서 브랜드 베이지 계열(`rgba(223,199,161,0.55)`)로 조정. 방문자 통계 “3명 1회” 원인 감사 결과를 알려진 제한사항에 기록(집계 구조 개선은 별도 Plan 필요). (143차-181) |
| 2026-07-01 | fix: 모임 플래너 참여자 이름 클릭 시 임시 프로필 바텀시트(`openProfileSheet`) 대신 기존 읽기 전용 모임 보드(`openOtherMeetingSheet`)를 열도록 연결. `club-schedule.html` 내부 임시 프로필 시트 DOM/CSS/인라인 Supabase 조회 함수를 제거해 사람 보기 진입점을 모임 보드로 통일. (143차-180) |
| 2026-06-30 | feat: 모임 보드 서브시트 신규 추가(디자인/레이아웃 우선, 데이터 저장은 추후 연결) — 이번에 하고 싶은 게임/룰 설명 가능한 게임(취향보드 게임목록 UI 재사용)/인원수별 하고 싶은 게임(레이아웃만)/모임 스타일 칩(취향보드 bio-chip 재사용, 토글만)/모임 메모(textarea)/최근 플레이(실데이터). "모임 보드" 카드를 club-schedule.html 직접 이동(`<a>`) → 바텀시트 진입(`<button data-subsheet="meeting">`)으로 변경. "함께한 시간" 서브시트의 "모임 플래너 바로가기" 버튼 제거. 성장요약을 2줄로 압축(업적·캐릭터·칭호·도감 한 줄 / 성장도·다음업적 한 줄), 다음 업적 텍스트를 이름 대신 타입 라벨로 표시("코티지 피플까지" → "🐻까지 참여 N회 남음") — achievements.js _NEXT_ACH_META에 label 필드 추가 (143차-172) |
| 2026-06-30 | refactor: 관리자 분석 페이지 4그룹(비주얼분석/이벤트퍼널/페이지·회원/유입경로) → 탭 5개(방문/회원/유입/페이지/이벤트) 통합 1단계(구조). 캔버스 id 유지로 차트 로직 무수정, membersBody의 불필요한 subSection 래퍼 제거(최근3건+더보기는 기존 내장 로직 그대로), 메뉴카드 6→3개 축소. 요일·재방문율·회원가입퍼널·도감퍼널은 2단계(트래킹 설계 필요)로 보류 (143차-166) |
| 2026-06-30 | design: price-rules.html 레이아웃 다듬기 — 운영시간에 키워드 라인 추가, 이용 약속을 카드 그리드→박스 없는 섹션 리스트로 전환, "꼭 지켜주세요" 박스 배경/내부 카드 완화(테두리·제목 색은 유지), 음식 안내를 더 작은 라인 스타일로 재조정. breadcrumb 상위 항목을 이동 링크가 아닌 현재 위치 텍스트로 전환 — 실제 허브 페이지가 없는 "게임"(owned-games/game-reviews/game-location)과 "코티지 이용"(price-rules/guide) breadcrumb root를 plain text로 변경, club 계열은 club.html이 실제 허브 페이지라 링크 유지 (143차-164) |
| 2026-06-30 | design: about.html HOW 섹션 카드형(2x2 그리드) → 섹션형 리스트로 전환 — 텍스트(아이콘+제목+키워드+설명) 우선, 사진은 보조 역할로 140px 축소+섹션 끝에 배치, hr 구분선. 항목별 키워드 라인 신규 추가(무제한·24시간 / 700여 종·밝은 조명·넓은 테이블 / 추천 시스템·룰 영상·위치 안내 / 동호회 운영). 사진 역할 분리(시간=외관/공간=내부/함께=동호회), 시작의 제약은 홈페이지 캡처 이미지 부재로 photo-shelves.jpg 임시 대체(추후 교체 필요) (143차-163) |
| 2026-06-30 | fix+refactor: 헤더 메뉴 글자크기 통일(.menu-link-home 14px), about.html WHY1 마무리 문단 추가, 변경된 페이지명(about/price-rules/guide) title·meta·breadcrumb 전체 동기화. refactor: PAGE_LABEL 중복 제거 — script.js PAGE_LABELS(pathname 키)와 requests-admin.html PAGE_LABEL(slug 키)이 같은 목적의 별도 하드코딩이라 about.html 개명 시 드리프트 발생했던 것을 assets/js/page-labels.js 단일 소스로 통합(값 100% 동일 유지, script.js 로드 직전 위치 — 14개 HTML 전체 적용) (143차-162) |
| 2026-06-30 | feat: 퍼널 분석 1단계(PLAN_funnel_analytics.md) — page_events에 session_key/user_id 컬럼 추가(SQL 직접 실행), trackEvent()가 함께 저장하도록 수정. 누락 이벤트 3개 연결: recommend_start(추천 조건 실제 선택 시 1회, 모달 오픈 아님), record_start(game-reviews.js 진입 시 1회), signup_complete(upsertProfile의 기존 isNewUser 조건 그대로 사용). getPageViewCounts() 신규 — 관리자 이벤트 퍼널에 "메인 방문(page_views 기준)" 단계 추가. **주의: session_key/user_id는 이 시점 이전 행에는 없음(NULL) — unique 집계는 2026-06-30 이후 데이터부터만 정확.** 관리자 UI 구조/분석탭 재설계는 범위 밖(보류) (143차-161) |
| 2026-06-30 | content: about.html → "코티지가 만들어진 이유" 브랜드 스토리 페이지로 전면 재구성 (Hero 1줄+서브타이틀 → WHY1/WHY2(텍스트+사진) → 제약 2x2 카드(각 카드 사진 슬롯 추가, 임시 플레이스홀더) → WHY 회수 → 버튼). 기존 소개문단/사진3장/특징카드5/대상자안내4 제거(중복). 헤더 메뉴 구조 개편: "코티지보드"+"동호회" 그룹 폐지 → "코티지를 만든 이유"(about.html 직접링크) + "코티지 이용"(가격·이용안내/홈페이지 기능/동호회/요청하기) 신설. price-rules.html을 이용요금→운영시간(신규)→이용 약속→음식 안내 순으로 재배치, 상단 안내문구 추가. guide.html/price-rules.html breadcrumb를 변경된 메뉴 그룹명에 맞춰 갱신 (143차-160) |
| 2026-06-30 | fix: play-records-utils.js가 9개 페이지(about/guide/club-schedule/price-rules/club/club-rules/club-intro/requests/requests-admin)에 누락되어 parsePhotoUrls·openLightbox 미정의 — 다중사진 기록 이미지 깨짐 + 사진 더보기 버튼 무반응 버그. 9개 페이지에 스크립트 추가, game-reviews.html 로드순서 정정, 더보기 토글을 openLightbox 의존 블록에서 분리. 기록보드 기본 펼침 축소(게임평1/사진3) + 더보기 문구 통일. 내 보드 메인 패널 헤더 sticky화 + padding-top:0 (143차-159) |
| 2026-06-30 | feat+fix: 기록보드(내보드>기록보드) 게임평/플레이기록 썸네일 추가(_getGameThumbKey bgg.id fallback) + 게임평 폰트/공백 조정 + 사진 더보기 토글 버그 수정 + 게임평/사진/플레이기록 섹션별 sticky 헤더 + .sheet-back-btn--hist modifier 분리(이전게임 히스토리 vs 기록시트 복귀 버튼 공유 클래스 충돌로 타이틀이 백버튼 덮던 버그) (143차-158) |
| 2026-06-30 | fix: 게임정보 시트 타이틀 위 공백 축소(.sheet-title-row margin-top:-32px) — sticky-bar 자체에 음수 margin 주면 sticky 깨짐 확인, sticky-bar는 안정값(margin-bottom:14px) 유지하고 sticky와 무관한 .sheet-title-row만 조정. sheet-record-header도 top:-22px→0, margin-top 0으로 통일해 뒤로가기 버튼 잘림 버그 해결 (143차-157) |
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

## 2026-07-03 CSS/sticky 버그 회고

이번 세션의 버그 1~5는 대부분 "값이 조금 틀림"이 아니라 "어떤 영역이 고정되고 어떤 영역이 스크롤되는지"를 잘못 해석해서 생긴 문제였다.

### 공통 실패 원인

- 최근 수정값을 기준으로 삼고, 사용자가 말한 비교 대상 컴포넌트를 다시 확인하지 않았다.
- 공백을 만들 때 그 공백이 scroll body 안에 있는지 sticky/fixed 영역에 있는지 구분하지 않았다.
- 같은 현상을 여러 번 값만 바꿔 고치려 했고, 2회 실패 후 런타임 값/DOM 구조 확인으로 전환하지 않았다.
- 커밋 전 diff에서 선택자 이름까지 확인하지 않으면 엉뚱한 비슷한 속성이 함께 바뀔 수 있다.

### 버그별 진짜 원인과 해결

- 버그1: 내 보드 메인 고정헤더가 큰 이유는 패널 위치/height가 아니라 `.profile-panel-header`의 세로 padding과 아래 margin이 함께 고정 영역처럼 보였기 때문. 패널 위치와 height는 그대로 두고 header padding/margin만 줄였다.
- 버그2: 기록보드에서 `기록보드 헤더 + 공백 + 게임평 헤더`가 함께 고정되어야 했는데, 공백을 `.profile-subsheet-body--records`의 scroll padding으로 만들어 본문이 그 틈으로 지나갔다. `::before` sticky 덮개로 공백 자체를 고정 영역에 포함했다.
- 버그3: 게임위치 바텀시트는 `align-items:flex-end` 구조라 `height:calc(100dvh - Npx)`가 상단 여백을 결정한다. 좌우/아래/radius/overflow는 유지하고 height 값만 조정했다.
- 버그4: 홈페이지 기능 iframe 시트는 "게임정보/내 보드 시트와 동일"이 기준이었는데, 직전 게임위치 시트의 `102px` 기준을 복사해 상단 여백이 과해졌다. `height:calc(100dvh - 48px)` + `margin-bottom:12px`로 게임정보/내 보드 계열 기준에 맞췄다.
- 버그5: 초기 렌더 버그는 재현되지 않아 구조 수정 대신 고정헤더 높이만 줄였다. position/top/height는 유지하고 padding/min-height 값만 조정했다. 작업 중 의도 밖 `.hero-visitor-bar` 변경을 diff에서 발견해 커밋 전 원복했다.

### 다음 작업 원칙

- sticky/scroll/fixed/iframe/bottom sheet 문제는 먼저 DOM 구조와 고정 영역 범위를 말로 정의한다.
- 공백이 필요하면 "스크롤되는 공백"인지 "고정되는 공백"인지 먼저 결정한다.
- 2회 이상 같은 증상이 반복되면 값 추측을 멈추고 `getBoundingClientRect()`, `getComputedStyle()`, `offsetHeight`, `clientHeight`로 실제 런타임 값을 확인한다.
- CSS 변수에 `calc()`, `var()`, `env()`가 섞이면 `parseFloat()`로 처리하지 않는다. 실제 DOM 크기를 측정하거나 CSS에 맡긴다.
- 커밋 전 diff에서 파일뿐 아니라 선택자 이름까지 확인한다.
