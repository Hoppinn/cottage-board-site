# 모임 기능 개편 체크포인트

목표: 플래너/홈 미리보기/센터모달/모임보드 통합 개선. 아래 단계 순서로
진행하며, 각 단계는 별도 세션+커밋. 앞 단계 커밋 전 다음 단계 착수 금지.

실행 순서: 2.5 → 3 → 3.5 → 4 → 5 → 6 → [DB Plan: 2.7+7 통합, 마이그레이션 009]
→ 2.7 UI → 7 UI. DB 없이 가능한 단계 소진 후 Red 일괄 처리.

핵심 결정 (변경 시 사용자 승인 필요):
- 모임보드 = 상시선호(meeting_game_prefs) + 이번주 일정/게임
  (meeting_votes/meeting_vote_games) 통합 "표시" 뷰. 저장은 분리 유지.
- 막대 2줄: 1줄 시간(10~22), 2줄 게임 약칭(아르·윙스 +1, 최대 2개+N).
  막대=누가/언제, 태그=무엇을 역할 분리.
- 하루 카드 게임 태그 줄: 플래너·홈 공용 카드 하단. 그날 전체 want/learn
  게임 전량 표시(생략·더보기 없음), 여러 줄 감김 허용, 풀네임(display).
  같은 게임 = 단일 칩 병합. 형식: "아르낙 🎲📖" (want N명·learn M명 각각
  아이콘+숫자, 1인이면 숫자 생략, 0인 쪽 아이콘 전체 생략). 정렬: want수
  내림차순→learn수 내림차순. 칩 톤: want 포함 시 --want, 아니면 --learn.
  카드 태그 줄·센터모달 집계에서 대표 지정 게임에 ⭐ 병기 (2.7 이후 활성).
- is-past 원칙: 홈·플래너 공통으로 opacity 시각만. pointer-events:none 차단 없음.
  클릭 → 보기(막대·겹침·상세) 허용. 등록 행동만 JS 레벨에서 차단:
  홈 날짜 칩은 클릭 허용(모달 조회), 플래너 renderMyVote에서 과거 날짜 시
  등록/수정/취소 버튼 숨기고 읽기 전용 표시. 멀티스텝 Step1 날짜 칩은 기존
  disabled 속성 유지.
- 약칭 소스: game-system source 레이어에 BGG ID→약칭 매핑,
  build-output이 gameData에 abbr 병합. 폴백 = titleKo 앞 2글자.
  직접입력 게임은 폴백만.
- 센터모달 = "그날의 결정 도우미": 게임 기준 집계(N명이 하고 싶어요,
  내림차순)를 상단에, 개인별 목록은 하단 접힘. 하단 버튼 문구
  "플래너 보기" → "전체 일정 보기" (홈에서 열린 경우만).
  게임 집계 리스트에 정렬 토글 [투표순|대표순]. 각 게임 칩에 투표수·대표수
  병기 (예: 아르낙 ·3 ⭐2). 기본 투표순. 대표순은 ⭐수 내림차순, 동점 시 투표수.
  ⭐데이터는 2.7 이후 활성 — 그 전엔 투표순만 노출.
- 홈 미리보기 카드 클릭 분화: 막대 클릭 시 해당 유저 개인 일정 모달
  (openDateScheduleModal 재사용, stopPropagation, 이벤트는 기존
  meeting_planner_bar_click 재사용). 그 외 영역 클릭은 기존대로
  날짜 집계 모달.
- 홈 미리보기 닉네임 클릭: .sched-bar-name[data-uid] 클릭 →
  openOtherMeetingSheet(uid), stopPropagation, 이벤트 meeting_profile_click 재사용.
  더미 유저 클릭 시 기존 null 처리("프로필을 불러올 수 없어요" 토스트).
- 홈 주 네비게이션 라벨: '날짜범위 · 이번 주/지난 주/다음 주/N주 전/N주 후'.
  offset 0=이번 주, +1=다음 주, -1=지난 주, |offset|>1은 N주 후/전.
- 5단계 모임보드 이번주 섹션: 내 보드(openProfilePanel) + 읽기전용
  (openOtherMeetingSheet) 양쪽에 동일 섹션. 해당 유저의 이번주
  meeting_votes + meeting_vote_games 조회, 날짜별로
  "화 7/7 · 10~22시 · 🎲아르낙 📖루트" 식 행. 게임명 = COTTAGE_GAMES
  display(약칭 아님). 등록 없으면 '이번 주 등록된 일정이 없어요.'
  _buildMiniBarWeekHtml(myVotes, voteGames, userId, isOwner) 시그니처 확장.
- 홈 미리보기 카드 진입점: 카드 하단 "이날 모임 한눈에 보기 →" 풀폭 행 버튼이
  대표 진입점. 카드 전체 클릭은 보조로 유지 (동일 동작). 버튼은 카드 padding
  밖으로 풀폭, border-top 구분선, border-radius 하단 맞춤.
- 룰렛: 센터모달 안, 해당 날짜 want 게임(중복 제거) 2개 이상일 때
  "🎡 룰렛으로 정하기" 버튼. 원판 애니메이션+결과. DB 변경 없음.
  기본 후보 = 대표 게임(없으면 want 전체), 돌리기 전 후보 칩 탭으로
  제외/포함 토글(제외 칩 흐림), 결과 후 다시 돌리기.
  룰렛 확률: 균등 (대표수 가중치 없음 — 단순 유지).
- 등록 모달: 주 네비게이션(←→)으로 여러 주 선택, 주 넘어 선택 상태
  유지, 하단 선택 요약. 다음 단계에서 날짜별 시간 개별 입력 —
  본인 과거 meeting_votes 기반 프리셋, 기본값 최근 시간대.
- 대표 게임 (2.7): meeting_vote_games에 is_priority boolean 추가.
  유저당·날짜당 최대 2개(want/learn 통합). 입력: 게임 칩 ⭐ 토글,
  3개째 시도 시 안내. 막대 2줄째 = 대표 게임 약칭 우선,
  대표 미지정자는 기존 폴백(등록순 2+N).
  마이그레이션 009는 7단계(인원 조건 컬럼)와 통합해 한 번에 설계.
- 인원 조건부 선호 (7단계): meeting_vote_games에 조건 컬럼
  (무관(기본)/best/recommended/숫자). 입력 칩
  [무관|베스트|추천|2인|3인|4인|5+], 직접입력 게임은 베스트/추천 비활성.
  표시는 막대 제외, 게임 목록 칩 접미사만. 센터모달에서 당일 인원과
  매칭 강조. 판정 기준: 당일 '최대 동시 겹침 인원'(시간대 스윕, 기존
  겹침 계산 재사용) ≥ 게임 조건 인원이면 충족. 총원 아닌 동시 인원 기준.
  초과는 충족(테이블 분할 가능). 베스트/추천은 BGG 범위 최솟값, 무관은
  항상 충족. 충족 칩 ✓+강조, 미달 톤다운(숨김 금지), 툴팁 'N명 더 겹치면
  가능'(선택 구현). 게임별 희망자 간 겹침까지는 판정하지 않음.
  마이그레이션 009 = 2.7(is_priority) + 7(조건 컬럼) 통합 한 번에.
  선행 확인: gameData에 BGG 베스트/추천 인원 필드 존재 여부.

단계:
1. [x] 게임 약칭 소스 (Yellow) — 완료
2. [x] 막대 2줄 표기 (1 의존) — buildBarsInCard + CSS — 완료
2.5. [x] 하루 카드 게임 태그 줄 — buildBarsInCard 하단 flex-wrap 칩 — 완료
2.7. [ ] 대표 게임 (Red — DB Plan 필수, 마이그레이션 009 통합)
   - [x] Step 3 ⭐ 지정 — club-schedule.html 로컬 토글 + saveAll is_priority 반영 (2026-07-08)
   - [ ] 표시/집계 반영 — buildBarsInCard 대표 우선, 센터모달 대표수 집계·칩 ⭐ 병기
3. [x] 센터모달 재정의 (Yellow) — day-detail.js — 완료
3.5. [x] 칩 병합 + 홈 주 네비게이션 — 완료
  - [x] ① 게임 태그 칩 병합: want/learn 같은 게임 → 단일 칩 "아르낙 🎲📖" — 완료
  - [x] ② 홈 미리보기 ◀이전주/다음주▶ 주 네비게이션 (주별 재조회) — 완료
4. [x] 룰렛 — day-detail.js openDateMeetingModal, want 2개 이상 시 버튼, CSS 원판+칩 토글+결과
   - SVG conic 원판, 조각별 게임 약칭(abbr) 표시, 반지름 방향 회전
   - "+ 게임 추가" 입력 (attachAc 자동완성, 직접입력 Enter 포함), 세션 임시(DB 없음)
   - 추가 칩 점선 테두리(is-custom), 중복 시 해당 칩 outline 강조
5. [x] 모임보드 이번주 섹션 — _buildMiniBarWeekHtml(+voteGames), want/learn 게임 행 — 완료
6. [x] 등록 모달 다주치 (Yellow, club-schedule.html 대수정) — 전체 완료, QA 통과
   커밋 순서: ①→②→②-a→②-b→②-c→③
   - [x] ① Step1 주 네비게이션 + 선택 요약 (31c10f5)
   - [x] ② Step2 재설계: 날짜별 시간 행 + 프리셋 칩 + _historicalVotes 8주 조회 (fb5819b)
   - [x] ②-a Step1 날짜 칩 참여 인원 표시 (8dcd56c)
   - [x] ②-b 날짜별 등록 진입 통합 (c152859):
         .sched-card-reg-hdr: startStep:2 직행 유지(빠른 경로 보존),
           대신 Step 2 "← 날짜 더 선택" 뒤로 버튼 항상 노출 → renderStep1(사전선택 유지)
           (smBack 핸들러를 _fromStep1 조건 없이 step 기반으로 변경)
         renderMyVote #btnRegister → _openMultiSheet({ startStep:1, dates:[ds] })
         .sched-bar-edit-btn(수정)은 startStep:2 유지.
         구 renderSlider 코드는 #btnEdit 경로에서 여전히 사용, 제거는 별도 리팩 커밋.
   - [x] ②-c 홈 "플래너에서 등록하기" → 등록 모달 직행 — 완료:
         c289793 구현, 이후 안정화 클러스터:
         - 31e6568: 직행 postMessage 프레임 미로드 시 증발 → _plannerPendingDate 대기
         - 30f96b9: 기록/플래너 모달 재오픈 시 직전 상태 유지 fix (close 시 src 리셋)
         - 63b41d0: 무조건 재로드가 프리로드 무력화 → contentWindow.location 조건부 재로드
         - e2cd0c2: close 청소 방식 폐기, open 시 cottage-reset-week(0) 선언으로 전환
                   + _openMultiSheet dates 있으면 첫 날짜 주차 자동 계산
         - 3676131: 직행 경로에서 reset이 pending date를 덮는 회귀 fix
                   (_openMultiSheet가 dates 주차 직접 계산해 weekOffset 무관)
         - b93aaeb: reset-week 핸들러에 뷰 모드 포함 (달력/상세 페이지 잔류 버그)
   - [x] ③ Step3 게임 선택 분리 — QA 통과 (e796f7c→9dfce77→c0a495c→2276522)
         e796f7c: renderStep3() 신규, 날짜별 sm-tabs, 기등록 날짜 is-registered+disabled
         9dfce77: 저장 버튼 통합 — 게임 0개↔1개↑ 라벨 전환 (renderStep2Games 끝 갱신)
         c0a495c: buildBarsInCard 태그 약칭 # 제거 후 slice (day-detail.js)
         2276522: index-page.js 날짜 문자열 5지점 로컬 기준 통일 (toISOString 제거)
   - [ ] **④ 홈 미리보기 카드 직접 수정 진입 (미구현)** — 현재 `renderPreview()`에서 `buildBarsInCard(dayVotes, dayGames, null)` 호출(myVote=null → 편집 버튼 없음). 개선 방향: 본인 vote 있을 시 myVote를 전달해 is-mine 막대에 [수정] 버튼 노출 → 플래너 해당 날짜 편집 모드(startStep:2) 직행. PROJECT_STATE ④후보(Step1 "등록됨" 칩 클릭 편집 모드)와 병행 검토 필요.
6.9. [x] **일별 뷰 제거 + 달력 날짜 클릭 → 해당 주차 이동 (완료)**
   - 근거: "날짜별 상세는 안 만들고 센터모달로 가벼운 상세만" 원칙
   - 제거 실적: renderCalendar(dead code)+openDay~removeVote (~359줄), #viewDay HTML, btnBackCal, renderCalendar CSS, 일별뷰 전용 CSS ~230줄
   - 진입점 2곳(renderWeekView 헤더, renderMonthCalendar 셀) → navigateToDate(ds) 로 교체
     (renderCalendar는 saveVote/removeVote에서만 호출 → 함께 dead code로 제거됨)
   - 공유 유지: calcSummary, calcOverlap, .sched-confirm-btn, .sched-bar-name, .sched-register-btn, .sched-discard-btn CSS
   - ⚠️ 이식 후보: "모두 가능한 시간(겹침 슬롯+이름)" — 집계 모달 개편 시 git 커밋 [TODO: 커밋 해시] 직전
     club-schedule.html의 renderHourlyBreakdown(lines 1060-1092), renderOverlap(lines 1094-1133) 참조
7. [ ] 인원 조건부 선호 (Red — DB Plan 필수, 마이그레이션 009 통합)

완료 조건: 7단계 전부 커밋 + 문서 갱신 후 이 체크포인트 삭제,
PROJECT_STATE §0에서 해제.
