# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-07-14 (문서 슬림화 — 과거 완료 로그·변경 이력·142/143차 이력·완료 체크포인트 제거, 열린 항목은 §2/§3/이월로 통합. git 로그가 삭제분 보존. 1158→329줄)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

### 🔵 CHECKPOINT: 읽기전용 내 보드 + 취향 연동 + 좋아요 동기화 (2026-07-14 시작, 미착수)

> **새 세션 시작점.** 아래 순서로 진행. Phase C가 큰 리팩토링이라 컨텍스트 깨끗한 상태에서 시작하려고 이전 세션에서 분리함. **모든 결정은 사용자 승인 완료 — 재확인 불필요, 그대로 구현.**

**배경**: 직전 작업으로 모임보드 하고싶은/배우고싶은 게임이 "이번 주 meeting_vote_games"로 바뀜(아래 완료 체크포인트 참조). 그 결과 ①남의 읽기전용 보드에서 "그 사람이 평소 좋아하는 게임(취향 전체)"을 볼 방법이 약해짐 ②모임보드 ❤️ 좋아요 마커가 다른 화면(게임시트/취향보드)에서 좋아요 바꿔도 즉시 반영 안 됨(스냅샷).

**선행 사실 (구현 전 알 것)**:
- 모임보드 게임 리스트 = 이번 주 `meeting_vote_games`. `game_id`=INT(bggId), `game_likes`/`meeting_game_prefs`(룰)=한글 슬러그. 변환 헬퍼 `_mbSlug`(kakao-auth.js 모임 afterRender 내) 이미 있음.
- 좋아요 소스: `_likedSlugSet`/`_curiousSlugSet`(패널 open 시 `_meeting.likedGames`/`curiousGames`=game_likes/curious 슬러그 스냅샷).
- 읽기전용 뷰 현재 2개: `openOtherTasteSheet`(getUserTasteProfile→좋아하는 게임 전체+피하는유형+bio, kakao-auth.js ~2260), `openOtherMeetingSheet`(getUserMeetingProfile→아직 옛 미러=game_likes를 "하고싶은게임"으로, ~2416). `buildReadOnlyGames` 렌더러 2곳(2294, 2510).
- 타 유저 데이터 함수: `getUserTasteProfile(userId)`, `getUserMeetingProfile(userId)` 존재. `getMyStats(userId, nickname)`는 userId 인자 받음 → 타 유저 가능한지 supabase-client.js에서 확인 필요.
- 게임시트 좋아요 버튼: game-sheet.js (좋아요 토글 위치 grep 필요).

**Phase A (소) — 좋아요 즉시 동기화** — ✅ 완료 (2026-07-14):
- 전역 이벤트 `cottage-likes-changed`(detail: {table:'game_likes'|'game_curious', gameId(슬러그), added:bool}) 도입. js-api.md "전역 커스텀 이벤트" 절 신규.
- 발화 지점: ①게임시트 좋아요/궁금해요 버튼(game-sheet.js `emitLikesChanged` — 상호배타 반대목록 제거 시 별도 발화) ②취향보드 추가/삭제(kakao-auth.js `_emitLikesChanged`) ③모임 "좋아하는 게임에도 추가?"(_openMbAddModal pickGame onDone).
- 수신: 모임보드 → `_likedSlugSet`/`_curiousSlugSet` 갱신 후 `_renderWeekList`(❤️/👀 마커 즉시 반영). 취향보드 열려있으면 목록 추가/삭제·카운트 갱신. 핸들러 dedupe(`window.__tasteLikesHandler`/`__mbLikesHandler`) + DOM 이탈 self-remove.
- 범위 밖: game-reviews.js `onPrMenuLike/Curious`(기록 iframe = 별도 window 컨텍스트라 미발화).

**Phase B (소) — 취향 박스 센터모달** — ✅ 완료 (2026-07-14, 셀프 보드):
- 셀프 모임보드 "❤️ 이번 주 하고 싶은 게임" 라벨에 `#meetinglikedBoxBtn`(.mb-taste-link) "❤️ 좋아하는 게임 보기" → **game_likes 박스만** 센터모달(`_openTasteBoxModal('want')`). "💡 배우고 싶은 게임" → game_curious 박스(`'learn'`).
- 모달: `.mb-add-overlay`/`.mb-add-box` 재사용 + `#mbTasteBoxModal`. 데이터=`_meeting.likedGames`/`curiousGames`(패널 open 시 이미 로드), 📖 룰뱃지(`_ruleSet`) 포함. 게임 클릭=**전체 아이템 클릭** → 게임시트. **z-index 주의**: 모달(--z-sheet-modal 9700) > 게임시트(--z-sheet 9500)라 클릭 시 `close()` 후 openGameSheet(안 그러면 게임시트가 모달 뒤에 묻힘). CSS `.mb-taste-box-hint`/`.mb-taste-box-list` 신규.
- **읽기전용 버전은 Phase C로 이월**: openOtherMeetingSheet는 아직 옛 미러(likedGames 전체를 인라인 표시)라 "이번주 vs 취향전체" 구분 자체가 없어 이 버튼이 무의미. Phase C에서 읽기전용을 this-week 모델로 전환할 때 함께 적용.

**Phase B 후속 — 디자인 폴리시(이번 세션 반영) + 추가 발견(다음 세션)**:
- ✅ 이번 세션 반영: ①라벨 문구 축약(`+ 게임 추가`→`＋추가`, 보기 버튼 `전체 보기` + ❤️/👀 이모지 제거) ②제목을 `.mb-sec-name`(nowrap span)으로 감싸고 `.taste-section-label--mb{flex-wrap:wrap}` 안전망 → 제목이 2줄로 깨지던 문제 해결 ③`.mb-taste-link` 11→10.5px 축소 ④`mb-pref-edit`(선호/비선호 "취향보드에서 수정") 버그 수정: 기존 `openProfilePanel('taste')`가 패널 토글로 **전부 닫히던** 것 → 취향 카드 클릭 경로 재사용으로 취향 서브시트 전환 + 뒤로가기를 "‹ 모임 보드"로 재지정(cloneNode로 원 핸들러 교체).
- ✅ 다음 세션 발견분 6건 완료 (2026-07-14, 이 세션 — 커밋 68e2de4·2e1d4b9·8c27dd0·#6):
  1. ✅ **박스 모달 썸네일만 클릭**: `_openTasteBoxModal` 클릭 바인딩을 썸네일(.taste-game-thumb/-empty)로 한정, `.mb-taste-box-list` 스코프 CSS로 아이템 커서 default·썸네일만 pointer/hover.
  2. ✅ **"자세히" 모달 닫기 UI**: 하단 "닫기" 제거 → 박스 우상단 `.dd-x-btn`(position:absolute). `.dd-preview` 스코프 스크롤 하단 패딩.
  2-1. ✅ **"자세히" 모달 편집/취소 버튼 동작**(사용자 선호=눌리게): 내 막대 ✎=플래너 편집(`openPlannerModal` edit, onDirtyClose=onChange) / ✕=참여 취소(confirm→`deleteMeetingVote`)→onChange. openDatePreviewModal에 `onChange`(5번째) 신설, 모임보드가 `_loadMeetingWeek` 전달.
     - **#2-1-2 후속 (커밋 de89af8)**: ✕ 참여 취소해도 그 날 게임이 "이번 주 하고싶은 게임"에 잔존(orphan) → `deleteMeetingVote`가 같은 user+date의 `meeting_vote_games`도 **cascade 삭제**하도록 수정(호출처 3곳: 프리뷰·홈·플래너 removeVoteForDate). js-api.md 갱신. **사용자 테스트 해결 확인.**
     - **#2-1 편집 라이브 반영 (커밋 e343ea2) — ⚠️ 실서버 재테스트 대기**: ✎ 편집은 플래너 경유라 "닫을 때만" onDirtyClose 발화 → 미니바 라이브 반영 안 됨. `cottage-meeting-saved` 수신 시 즉시 `_pmOnDirty(_loadMeetingWeek)`도 호출하도록 보강(day-detail.js). **아직 사용자 재테스트 미완.** 그래도 라이브 반영 안 되면 → **후속조사: club-schedule 편집-저장 경로(특히 `cottage-edit` 진입 편집 저장)가 `_notifyParentSaved()`(cottage-meeting-saved)를 실제로 발화하는지** 확인. (취소 ✕는 직접 onChange라 정상 확인됨.)
  3. ✅ **보기 버튼 문구**: want "좋아하는 게임" / learn "궁금한 게임".
  4. ✅ **복귀 스크롤 복원**: mb-pref-edit 클릭 시 scrollTop 저장 → 뒤로가기 시 `_pendingMeetingScrollTop`에 넣고 `_loadMeetingWeek` 말미에서 복원(패널 유지 중 서브시트 스왑 간 보존).
  4-1. ✅ **비선호쪽 진입 스크롤**: mb-pref-edit `data-pref`(like/avoid), avoid면 취향 진입 시 `.taste-avoid-section`으로 scrollTop(getBoundingClientRect).
  5. ✅ **최근 참여 썸네일**: `.profile-record-thumb`(28px) 추가 + 클릭 시 게임시트. `.profile-activity-item--thumb` flex 스코프.
  6. ✅ **박스 모달 게임 추가**: `_openBoxAddSearch`(검색 초성+커스텀+직접입력 → `addGamePref`) + `_openTasteBoxModal`에 "＋ 게임 추가" 버튼, 추가 시 `_meeting.likedGames`/curiousGames push→renderList→`_emitLikesChanged`(Phase A 동기화).
  - ⚠️ **리팩토링 후보**: `_openBoxAddSearch`는 취향보드 `_openTasteAddModal`과 기능 중복(스코프 분리로 복제). Phase C(openProfilePanel 통합) 때 공용 검색-추가 헬퍼로 DRY.

**Phase C (대) — 읽기전용 내 보드 (핵심 리팩토링)**:
- `openProfilePanel`을 **userId 파라미터화 + 읽기전용 모드**로 확장(현재 self=getKakaoUser 가정 다수 → 대상 userId 주입, 편집 컨트롤 숨김/가드). openOtherTasteSheet/openOtherMeetingSheet를 이걸로 **통합**.
- **공개 섹션(읽기전용)**: 프로필카드(닉네임·캐릭터·대표칭호) / 수집보드(캐릭터·업적·칭호·도감) / 취향(좋아하는·해보고싶은·피하는유형·한줄소개) / 모임보드(이번주 게임+취향링크+모임프로필) / 기록보드(플레이기록·게임평).
- **제외(비공개, 사용자 승인)**: ❌함께한 시간(이용시간 통계) ❌음료교환권(잔액/내역) ❌알림. 프로필카드의 방문일수/기록수 요약은 노출 OK.
- 편집 제거: 게임 추가/삭제/📖/⋯/프로필 수정/취향 편집 등 모든 편집 컨트롤 read-only 모드에서 숨김.

**Phase D (연계) — 진입점 정리**:
- **모임 참여자** 닉네임(막대 .sched-bar-name 등) 클릭 → 그 사람 **모임 보드 직행**(읽기전용).
- **그 외**(게임평·플레이기록 닉네임) 클릭 → 그 사람 **읽기전용 내 보드**(Phase C) 전체.
- 현재 진입점 산재 확인 후 통일.

**Phase E (후속) — 모임보드 전체 디자인 리뷰**: 아이콘 과다 여부(❤️/📖/⋯/배지 밀도), 동선, 전체 가독성. 스크린샷으로 사용자와 함께.

**위험요소**: ①openProfilePanel 파라미터화 — self 가정(getKakaoUser·_currentBio·세션·업적 자기조회) 다수라 광범위, 편집 핸들러 전수 가드 필요(가장 먼저 깨질 지점). ②이벤트 발화 지점 누락. ③읽기전용 모임뷰 이번주 정렬 시 참여요일/편집불가 처리. ④getMyStats 등 타유저 지원 여부 선확인.

**정리 항목**: `_buildMeetingGameItems`(구 미러 렌더러) dead code 제거.

---

### 🟠 CHECKPOINT: 미보유 게임 기록시트 + 게임평↔플레이기록 연동 (2026-07-14, Red — Plan 진행 중)

> 2026-07-14 세션 "추가사항" 논의에서 확정. item 1(미보유 게임 시트) Plan 작성 대상. **아래 설계는 사용자 승인 완료.**

**조사 결과 (#1-1-1, DB 실물 확인 — 버그 아님, 별개 시스템)**:
- "게임평" = `game_comments` 테이블(컬럼: id, game_key, comment_text, nickname, user_id, created_at). game_key=슬러그(예 `백로성`). 게임(기록)시트에서 `getGameComments(_gameIds(gameKey))`로만 표시.
- "플레이 후기" = `game_play_records.review_text`. 플레이기록 게시판(game-reviews.js)이 표시. **game_comments를 전혀 참조 안 함** → 게임평이 게시판에 안 뜨는 건 설계상 정상.
- 실물: game_comments 7건(뽁: 백로성×2·에버델 / 호핀 4), game_reviews는 테스트 1건, play_records 후기 8건엔 백로성·레이아탄 없음.
- **오귀속 원인**: 뽁님이 레이아탄와일드(미보유) 게임평을 백로성에 단 건, 레이아탄와일드가 미보유라 **시트가 없어 코멘트 달 데가 없어서**. → item 1으로 근본 해결.
- **식별 키**: game_comments(game_key=문자열)·game_likes/curious(슬러그)가 이미 이름/슬러그 기반이라, 미보유 게임도 `game_key=이름슬러그`로 일관 키 부여 가능(bggID 불필요).

**item 1 — 미보유 게임 기록시트 (확정 방향)**:
- `openGameRecordSheet`를 미보유 게임(gameData에 없음, game_id=슬러그/이름)도 열리게 확장.
- 표시: "🚫 미보유 · 게임 정보 없음" 배지, "← 게임 정보" 버튼 숨김(정보시트 없음).
- 노출: 좋아요/궁금해요/게임평(comments)/사진/플레이기록. (#1-1-2 미보유 게임 ⋯ 메뉴 없음도 이걸로 해결)

**게임평 ↔ 플레이기록 연동 (확정 설계, 스키마 변경 0)**:
- **트리거**: 게임평 저장 직후, 그 게임에 **내 플레이기록이 없을 때만** → **액션 토스트**(기존 `showActionToast(문구, 라벨, 콜백)` 재사용) "게임평을 남겼어요 · ↗ 플레이기록으로 남기기".
- **놓쳤을 때**: 게임평 ⋯ 메뉴(현재 수정/삭제 있음)에 **"↗ 플레이기록으로 남기기"** 항목 추가(누구나 자기 게임평에 대해).
- **연동 = 내 소유 새 플레이기록 생성**(남의 기록 수정 아님, 작성자 불일치 문제 해소). 게임평(코멘트)은 그대로 둠.
- **기존 세션이 있으면**: 그 세션의 **게임·날짜·그룹·인원을 잠금(수정불가) 프리필**, 내 **후기(=게임평 텍스트 프리필)·점수·사진만** 입력. 게시판이 `그룹명+날짜`로 묶으므로 **같은 세션 아래 내 후기가 나란히** 표시(A 로그 + B·C·D 각자 후기). 세션 여러 개면 최근 기본+선택.
- **세션 없으면**: 게임+후기 프리필, 날짜·인원은 새로 입력(내 새 세션).

**Plan 대상 파일(예정)**: game-sheet.js(openGameSheet/openGameRecordSheet 미보유 분기, 코멘트 저장 후 토스트, 코멘트 ⋯메뉴), game-reviews.js(입력창 프리필+필드 잠금, 기존 세션 조회), supabase-client.js(내 플레이기록 존재 확인 헬퍼 필요 시). **DB 스키마 변경 없음.**

**⚠️ 기존 코드 발견 (Plan 재검증)**: game-sheet.js에 **이미 게임평↔플레이기록 연동이 부분 존재**.
- `onOpenCommentInput`(1584~1627): 게임평 모달에 "기존 플레이 기록에 연동" 체크박스+선택. **내 기록 중 후기(review_text) 없는 것만** 나열(`r.user_id===나 && !r.review_text`, 1613).
- `onSubmitCommentModal`(1810~1841): 체크 시 `updateGamePlay(선택기록,{review_text})` — 내 기존 기록의 후기로. 안 하면 `insertComment`(일반 게임평).
- → **작성자 불일치는 이미 방어됨**(내 기록만). 확정 설계의 "세션에 내 후기 추가"는 **(A) 내 기존 기록 연동=이미 됨** / **(B) 남이 찍은 세션에 내 새 기록으로 참여=신규**로 갈림.

**Plan — 3단계 분리 (사용자 판단 위임 → 이 순서 확정)**:

*Stage 1 — item 1: 미보유 게임 기록시트*
- 읽을 파일: game-sheet.js `openGameSheet`(439~457, 미보유 시 early-return 확인됨), `openGameRecordSheet`(784~), `_gameIds`, 미보유 진입점(game-reviews.js 썸네일/이름 클릭 라우팅).
- 변경: 미보유 게임(gameData 없음) 클릭 → `openGameRecordSheet`로 라우팅(openGameSheet는 미보유 무반응). openGameRecordSheet에 미보유 분기 — "🚫 미보유·게임정보 없음" 배지, "← 게임 정보" 버튼(815) 숨김. 좋아요/궁금해요/게임평/사진/기록은 game_id(슬러그) 기반이라 그대로.
- 위험: openGameRecordSheet 하위 렌더가 game 널에서 깨지는 지점(썸네일·rating 등, 795 폴백 있으나 이하 확인), 좋아요 버튼이 슬러그 game_id로 동작하는지. **가장 먼저 깨질 곳=미보유 game 널 전제.**

*Stage 2 — 연동 1단계: 토스트 nudge + ⋯메뉴 나중연동 (기존 모달 재활용)*
- 읽을 파일: onSubmitCommentModal(1810), onOpenCommentInput(1584), 코멘트 액션 렌더(908~910, 1465~1476).
- 변경: ①게임평 등록 성공 후 그 게임에 **내 플레이기록 없으면** `showActionToast('게임평 남겼어요','↗ 플레이기록으로', 연동콜백)`. ②코멘트 ⋯(수정/삭제)에 "↗ 플레이기록으로" 추가 → 그 텍스트로 연동. 연동콜백=기존 링크 모달(내 기록 있으면) 재사용.
- 위험: "내 기록 없음" 판정 추가 조회 비용.

*Stage 3 — 연동 2단계 (B): 남의 세션에 내 후기로 참여*
- 읽을 파일: game-reviews.js 입력창(addRow/프리필 경로), `recordGamePlay`, `getGamePlayRecords`.
- 변경: 그 게임에 내 기록 없고 **남 세션 있으면** → 세션 선택 → 입력창을 게임·날짜·그룹·인원 **잠금 프리필** + 후기(게임평 텍스트)·점수·사진만 입력 → `recordGamePlay`(내 새 기록). 게시판 `group_name+date` 그룹핑으로 같은 세션에 묶임.
- 위험: 입력창 프리필+필드잠금 UI(iframe 교차 값전달), 세션 식별·선택, 그룹핑 키 정확 매칭.

**공통 위험요소**: ①미보유 game 널 전제 광범위(Stage1). ②iframe/모달 교차 프리필·필드잠금(Stage3). ③미보유 식별 키(이름 슬러그) 정규화 일관성.

**미결 결정 (다음 세션에 확정 필요)**:
- **뽁님 오귀속 코멘트 처리**: 뽁이 레이아탄와일드(미보유) 게임평을 `game_comments`에 game_key=`백로성`으로 2건 등록(id: 06e099d1…, 21dbf84c…). Stage 1(미보유 시트) 완료 후 → ①레이아탄와일드로 game_key 이동 ②수동 삭제 ③방치 중 택1. **미정.**
- **게시판에 게임평(comments) 노출 여부**: 현재는 안 뜸(설계상 정상). 클로드 추천=**분리 유지**(게임평=게임 단위 의견 / 후기=세션 로그), 대신 Stage 2·3(연동)으로 opt-in 브리지만 제공. **사용자 최종 확정 안 됨** — 통합 원하면 별도 기획.

**다음 세션 시작점**: Stage 1(item 1)부터. 이 Plan 그대로 진행(재조사 최소). Red라 구현 전 Plan 승인 확인.

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
- [ ] **게임평→캐릭터/업적 미반영** (A-7, 2026-07-12) — 게임평 작성이 review 업적/캐릭터에 반영 안 됨. `checkAchievements('review')` 트리거 재확인.
- [ ] **지난 일정 흐리게+수정불가** (A-10) — 모임보드/플래너에서 지난 날짜 일정 흐리게 + 편집 차단.
- [ ] **캡션 복사 인스타/단톡 분리** (A-8) — 사진 캡션 복사를 인스타용/단톡용 포맷 분리.
- [ ] **접근성 개선** — 아이콘 버튼 title/aria-label, 폼 label 부여 (DevTools Issues 기준).
- [ ] **[보류] 한줄소개 GPT 연동** — 이전 기획 복원 불가, 사용자 재공유 필요.
- [ ] **[보류] 취향보드 Phase 2 (성향 5축)** — Phase 1 테스트 후 진행.
- [ ] **[보류] 모임플래너 참여자 UI 추가 개선** — 방향 논의 필요 (현재: 이름 클릭→프로필 시트).

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

