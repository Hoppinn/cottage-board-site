# REFACTOR_CHECKPOINT — 전체 리팩토링 감사 기록

생성: 2026-06-20  
목적: Phase 1 감사 — 파일 수정 없이 문제 후보만 기록. 즉시 수정 / 보류 / 위험 구분.

**Green 9개 수정 완료 (136차)**: db-schema.md, js-api.md, ls-schema.md, DESIGN_RULES.md

---

## Phase 1: MD 7개 감사 결과

### 즉시 수정해도 되는 것 (Green)

#### db-schema.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| D1 | **P0** | `anon_sessions` 컬럼 완전 오기재 | 문서: `session_key, entered_at, duration_sec` → 실제 DB+코드: `session_key, last_seen_at` 만 존재. `entered_at/duration_sec`은 `page_sessions` 테이블 컬럼임. |
| D2 | **P1** | `page_sessions`에 `session_key` 컬럼 누락 | 135차에서 추가됨. `supabase-setup.sql` line 695에 ALTER문 있음. 문서에만 미반영. |
| D3 | **P1** | `game_requests` 주요 컬럼 누락 | `purchase_status`, `status_date`, `purchased_at`, `actual_games` 4개 컬럼이 없음. requests-admin.html line 252에서 실제 SELECT 확인. |
| D4 | **P2** | `profiles.rep_achievement_id` 표기 혼란 | 별도 행으로 분리되어 있으나 profiles 테이블의 컬럼임. 표기 방식 통일 필요. |

#### js-api.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| J1 | **P0** | `initTagInput` 시그니처 오기재 | 문서: `(wrap, onUpdate)` 2파라미터 → 실제: `(wrap, hidden, initialValue, onAdd)` 4파라미터 (play-records-utils.js line 174) |
| J2 | **P1** | `COTTAGE_GAMES` 필드 오기재 | 문서: `{id, name, nameKo}` → 실제: `{id, bggId, display, titleKo, titleEn}` (game-display-adapter.js). 이 오류로 `_getGameKeyByName` 버그가 이번 세션에 발생했음. |
| J3 | **P1** | `getMyNotifications` 설명에 `new_game` 타입 누락 | 문서에 ①태그된기록 ②궁금해요 ③구매완료 3종만 기재. `new_game` 알림 타입 누락. |
| J4 | **P1** | `openProfilePanel` 전역 함수 목록 누락 | kakao-auth.js line 255에 존재. `window.openProfilePanel` 형태로 노출. |
| J5 | **P2** | `grantAchievementVoucher` 미기재 | CottageDB 함수 목록에 없음. achievement-system.md에는 기재됨. |

#### ls-schema.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| L1 | **P1** | `cottage_is_admin` 키 누락 | requests-admin.html에서 설정. supabase-client.js에서 읽어 admin 세션 필터링에 사용. |

#### DESIGN_RULES.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| DR1 | **P1** | `docs/DESIGN_AUDIT.md` broken reference | line 3: "특정 작업의 세부 지시는 `docs/DESIGN_AUDIT.md`에 기록한다" → 해당 파일 존재하지 않음. 제거하거나 파일 생성 필요. |

---

### 보류할 것 (확인 필요, 단독 결정 불가)

#### achievement-system.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| A1 | **P1** | `sparrow_lv5`, `squirrel_lv5` 상태 불일치 | 문서: "미제작 — 달성자 발생 전 추가 필요" → 실제: git status에서 `D sparrow_lv5.png`, `D squirrel_lv5.png` (삭제됨). 의도적 삭제인지 확인 필요. |
| A2 | **P1** | `cottage_master.png` 이동 미반영 | git status에서 `D assets/images/characters/characters_basic/cottage_master.png` → 실제로는 `rare/cottage_master.png`로 이동됨 (achievements.js line 688-691 `_charImgPath`가 `rare/` 서브폴더로 라우팅). 문서에 이미지 경로 체계 변경 미반영. |
| A3 | **P1** | `rare_*`, `season_*` 이미지 경로 체계 변경 미반영 | 위 A2와 동일 원인. `rare/` 서브폴더로 통합 이동. 문서에 언급 없음. |
| A4 | **P2** | `고아 칭호` 섹션 — 의도적인지 확인 필요 | `title_record_150` (record_150은 squirrel_lv4만), `title_review_500` (review_500은 hamster_lv5만) — 향후 추가 예정인지 아니면 삭제 대상인지 판단 필요. |

#### PROJECT_STATE.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| S1 | **P2** | 134차–135차 session_key 내러티브 혼란 | 134차: "getPageAnalytics에서 session_key 제거", 135차: "page_sessions에 session_key 추가". 컬럼이 없어서 제거했다가 컬럼 생성 후 재추가 — 컨텍스트 없으면 앞뒤 모순처럼 보임. |

---

### 건드리면 위험한 것 (영향 범위 불명확, 사전 확인 필수)

#### PROJECT_STRUCTURE.md

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| PS1 | **P1** | §8 빌드 파이프라인에 `npm run build` 단축 명령 누락 | 문서에는 `node ...` 직접 경로만 기재. `package.json`의 `npm run build` 단축어가 어떤 단계를 포함하는지도 미기재. (확인 후 추가 가능, 위험은 낮음) |
| PS2 | **P2** | scripts/ 폴더 항목 중 `test-subsheet.js`, `ss_4axis/`, `ss_profile/`, `ss_subsheet/` 미기재 | git status에 untracked 상태로 존재. 문서에 없음. 추가 가능하나 지금 untracked 이유 먼저 확인 필요. |

---

## Phase 2: JS 감사 결과

### 2-1. play-records-utils.js (254줄, 8함수)

**상태**: 감사 완료

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| PU1 | **P1** | 문서 불일치 | `attachAc` 시그니처 오기재 (js-api.md에 미수정) | 문서: `(input, items, onSelect)` → 실제: `(input, getSuggestions, onSelect, listRef)`. 2번째 인자가 배열이 아닌 **함수**임. 4번째 `listRef`도 누락. J1과 같은 유형, Green 수정 시 누락된 건. |
| PU2 | **P1** | 메모리 누수 | `buildPhotoItemAdder`: blob URL 미해제 | line 227: `URL.createObjectURL(resized)` 후 `URL.revokeObjectURL()` 없음. 기록 수정 반복 시 blob URL 페이지 내 무한 누적. 탭 닫힐 때까지 해제 안 됨. |
| PU3 | **P1** | 사이드이펙트 | `attachAc`: `listRef` 없을 때 input의 DOM 위치 변경 | line 119-127: input을 새 `div.wrap`으로 이동시킴. 호출 측 CSS 셀렉터나 이벤트 리스너가 input 부모를 참조하면 깨짐. `listRef`를 전달하는 호출은 안전. ▶ **2026-07-03 재검증**: 전체 호출처 8곳 확인. listRef 미전달 3곳(game-reviews.js 수정폼 게임명·모임명, club-history.html 수정폼 게임명) 모두 동적 생성 폼 내부 — 현재 실제 버그 없음. 신규 호출처엔 listRef 전달 권장. **잠재 위험 유지, 코드 수정 불필요.** |
| PU4 | **P2** | 중복 코드 | `_escH` (line 89) ↔ `window.escH` (supabase-client.js) 거의 동일 | `_escH`: `& < >` 이스케이프. `window.escH`: `& < > "` 이스케이프. 기능 95% 동일. supabase-client.js가 항상 먼저 로드되므로 `window.escH` 재사용 가능. 단, `"` 이스케이프 여부 차이 있으므로 단순 치환은 불가 (용도 확인 필요). ▶ **2026-07-03 재검증**: `_escH` 사용처 1곳(칩 innerHTML). `"` 미처리는 이론적 개선점이나 현재 실제 버그 없음. **리팩토링 후보 유지, 코드 수정 불필요.** |
| PU5 | **P2** | 파일 헤더 불일치 | 상단 주석이 8개 전역 중 3개만 기재 | line 3: `parsePhotoUrls / buildPhotoHtml / openLightbox`만 언급. `toInitials, hangulMatch, attachAc, initTagInput, buildPhotoItemAdder` 5개 누락. |
| PU6 | **P2** | 복잡도 | `attachAc`(61줄), `openLightbox`(56줄) 과대 함수 | 단일 책임은 명확하나 각각 테스트 불가 구조. 리팩토링 시 우선 분리 후보. |
| PU7 | **P2** | 암묵적 제약 | `initTagInput` 쉼표 포함 이름 불가 | line 215: `initialValue.split(',')` — 쉼표가 포함된 플레이어 이름은 분리됨. 문서화되지 않은 제약. 실제 오탐 가능성 낮음. |

**즉시 수정 가능 (Green)**: PU1 (js-api.md에서 attachAc 시그니처 수정), PU5 (파일 헤더 주석)  
**수정 시 검증 필요 (Yellow)**: PU3 (listRef 없는 호출처 확인 후), PU4 (_escH 용도 확인 후)  
**코드 수정 필요 (Red)**: PU2 (blob URL 누수 — buildPhotoItemAdder 수정)

---

### 2-2. game-display-adapter.js (541줄)

**상태**: 감사 완료

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| GDA1 | **P1** | 파일 헤더 오기재 | 상단 주석 파일명 불일치 | 주석 상단: `game-view-utils.js` 언급 → 실제 파일명: `game-display-adapter.js`. 파일 검색 시 혼란. |
| ~~GDA2~~ | ~~**P1**~~ | ~~전역 오염~~ | ~~IIFE 없음 — 25개 이상 함수가 전역 노출~~ | **✅ 해결됨 (R7, 2026-07-16 재검증)** — 현재 파일은 이미 `(function(){…})()` IIFE로 감싸져 있고 내부 헬퍼 전부 IIFE 스코프. 전역은 `window.CottageGameView`(네임스페이스)·`window.COTTAGE_GAMES`(의도된 공개)뿐. 감사가 언급한 `renderStars` 등은 현재 파일에 없음 = 구버전 기준 stale 기록이었음. un-expose 대상 없음. |
| GDA3 | **P2** | 중복 로직 | `getSearchText`: `getDisplayTags` 호출 + 직접 접근 이중 집계 | `getDisplayTags`가 이미 `moodTags/playTags/relationshipTags`를 반환하는데 동일 필드를 직접 join도 함. 검색 가중치가 2배가 되거나 중복 토큰 생성 가능. |
| GDA4 | **P2** | 로드 순서 의존 | `window.COTTAGE_GAMES` 실행 시점 즉시 생성 | line 533: `window.gameData`가 로드된 상태여야 함. 로드 순서 변경 시 빈 배열로 초기화. |
| GDA5 | **P2** | 중복 로직 | `getGameCardData` / `getGameDetailData` / `getRecommendData` 내 서브함수 호출 중복 | 세 함수 모두 `safeArray(g.mood_tags)` 등 동일 파싱 로직을 각자 실행. 공용 파싱 레이어가 없음. |
| ~~GDA6~~ | ~~**P2**~~ | ~~불필요한 파라미터~~ | ~~`getAllGamesArray(gameData)` — 파라미터가 전역과 중복~~ | **✅ GS3와 함께 종결 (R7, 2026-07-16)** — "혼용"의 실체는 두 개의 서로 다른 `getAllGamesArray`(game-sheet 무인자 vs adapter 인자版)였고 GS3에서 정리됨. adapter의 `CottageGameView.getAllGamesArray(gameData)`는 game-sheet.js:301이 `window.gameData` 명시 전달로 소비하는 순수 유틸이라 파라미터 유지가 맞음(전역 암묵참조보다 명확). 별도 조치 불필요. |

**즉시 수정 가능 (Green)**: GDA1 (파일 헤더 주석 수정)  
**수정 시 검증 필요 (Yellow)**: GDA3 (getSearchText 실제 동작 확인 후), GDA6 (getAllGamesArray 호출처 일치 후)  
**구조 변경 필요 (Red)**: GDA2 (IIFE 적용 — 영향 범위 확인 필수)

---

### 2-3. achievements.js (924줄)

**상태**: 감사 완료

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| ACH1 | **P1** | 중복 상수 | 8축 정렬 순서가 4곳에 중복 정의 | `_CHAR_SORT_ORDER` (line 716), `_CHAR_AXES` (line 739), `_TITLE_AXES` (line 589), `_ACH_TYPE_ORDER` (line 810) 모두 동일 배열 `['balance','play','new_game','record','photo','review','first_record','visit']`. 한 곳만 수정해도 나머지 3곳이 잘못된 순서가 됨. |
| ACH2 | **P1** | 과대 함수 | 주요 함수 4개가 과도하게 큼 | `checkAchievements`(175줄), `buildAchievementsSection`(103줄), `buildTitleSection`(89줄), `buildCharacterSection`(85줄). 각 함수가 DB 쿼리 + 계산 + HTML 빌드 + 이벤트 바인딩을 혼합. |
| ACH3 | **P1** | 성능 | 패널 열 때마다 3개 빌드 함수가 각자 8~9개 DB 쿼리 | `buildAchievementsSection`, `buildTitleSection`, `buildCharacterSection` 각각 독립 DB 쿼리 실행. `getUserAchievements` 등 동일 데이터를 3번 중복 조회. |
| ACH4 | **P1** | 하드코딩 이미지 경로 | `checkAchievements` line 474에 직접 경로 기재 | `'/assets/images/characters/characters_basic/squirrel_lv1.png'` 하드코딩. `_charImgPath('squirrel_lv1')` 함수가 있음에도 미사용 — 경로 체계 변경 시 이 경로만 깨짐. |
| ~~ACH5~~ | ~~**P1**~~ | ~~숨은 사이드이펙트~~ | ~~`buildAchievementsSection` 이름과 달리 소급 업적 지급 실행~~ | **✅ 해결됨 (2026-07-16 R6)** — 소급지급을 `grantRetroAchievements(userId, stats)` public 함수로 분리, `buildAchievementsSection`은 순수 read-only 빌드로 전환(내부 write 제거). 호출부(kakao-auth.js openProfilePanel)에서 빌드 앞·`!readOnly` 가드로 명시 호출. **부수 버그 수정**: 기존엔 남의 보드 readOnly 열람만으로 대상 유저 `user_achievements`에 소급 insert가 발생했으나(readOnly 설계 위반) 이제 차단. grant가 stats.achievements를 in-place 갱신해 캐릭터/업적/칭호 3섹션이 같은 렌더에 신규지급 반영. |
| ACH6 | **P2** | 중복 코드 | `esc` 함수 (line 656) — `window.escH`의 세 번째 복사본 | `buildCodexSection` 내부 로컬 `esc` 함수 = play-records-utils.js의 `_escH`와 동일 패턴. `window.escH`로 대체 가능. |
| ~~ACH7~~ | ~~**P2**~~ | ~~미사용 파라미터~~ | ~~`showAchievementToast(name, points)` — `points` 받지만 HTML에 미출력~~ | **✅ 해결됨** — 2026-07-03 재검증: `showAchievementToast(name)` points 파라미터 없음, 호출부도 name만 전달, 함수 내 points 변수 없음. 코드 수정 불필요. |
| ACH8 | **P2** | 문서 불일치 | `getCharacterPath` js-api.md 미기재 | `window.CottageAchievements.getCharacterPath`가 공개 API인데 js-api.md의 `CottageAchievements` 노출 목록에 없음. kakao-auth.js line 118에서 외부 사용 확인. |
| ~~ACH9~~ | ~~**P2**~~ | ~~불일치~~ | ~~`POINTS` 맵이 "포인트 비활성화" 문서와 충돌~~ | **✅ 해결됨** — 2026-07-03 재검증: POINTS 맵 없음, `grantAchievement(userId, achievementId)` points 인자 없음, `showAchievementToast(name)` points 인자 없음, achievement-system.md에 "포인트 제도 삭제됨" 명시. 코드 수정 불필요. |

**즉시 수정 가능 (Green)**: ACH4 (하드코딩 경로 → `_charImgPath` 호출로 교체), ACH8 (js-api.md에 `getCharacterPath` 추가)  
**수정 시 검증 필요 (Yellow)**: ACH1 (중복 상수 통합 — 4곳 호출처 동시 변경), ~~ACH9 (포인트 비활성화 의도 재확인)~~ → **✅ 해결됨** (2026-07-03 재검증: 코드 이미 정리됨)  
**구조 변경 필요 (Red)**: ACH5 (buildAchievementsSection 사이드이펙트 분리), ACH3 (DB 쿼리 통합)

---

### 2-4. game-reviews.js (1078줄)

**상태**: 감사 완료

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| GR1 | **P1** | 데드코드 | ~~`initGameView` + `renderSingleGame` (133줄) deprecated 명시~~ **✅ 해결됨** | ~~line 937-941 주석: "기본 동선은 바텀시트로 대체됨."~~ 2026-07-03 재검증: `initGameView`/`renderSingleGame` 모두 game-reviews.js에 없음. 호출처도 없음. 136차-7 삭제 완료 확인. |
| GR2 | **P1** | Supabase 직접 접근 | ~~`renderSingleGame` line 958: `window.supabase.createClient()` 직접 호출~~ **✅ 해결됨** | ~~`window.CottageDB` 추상화 레이어 우회.~~ 2026-07-03 재검증: `window.supabase.createClient()` game-reviews.js에 없음. GR1 함수 삭제와 함께 제거 완료. |
| GR3 | **P1** | 과대 함수 | ~~`renderRecords`(277줄), `renderInputPanel`(255줄), `addRow`(137줄)~~ **✅ 해결됨 (R9, 2026-07-16)** | ~~렌더링·이벤트 바인딩·저장 로직이 단일 함수에 혼합. 테스트 불가 구조.~~ R9에서 중첩 블록 4개를 모듈 함수로 추출(`_buildGameRow`·`_submitInputRows`·`_openInlineEditForm`·`_recCaption`) → renderInputPanel 65줄·renderRecords 212줄. 커밋 e813fe3~159cdd6, 스모크 통과. |
| GR4 | **P2** | 중복 로직 | `isParticipant` 계산, `score_note` 포맷팅이 `buildSessionBody`/`buildGameBody`에 각각 동일 코드 | 같은 6~7줄 로직이 두 함수에 그대로 복사됨. |
| GR5 | **P2** | 중복 로직 | 참여자 자동완성 `onSelect → Enter 디스패치` 패턴 2중 구현 | 신규 입력 폼(lines 252-263)과 수정 폼(lines 558-568)에 동일 코드. initTagInput과의 간접 결합 패턴. |
| GR6 | **P2** | 전역 오염 | `window._prGroups`, `window._prPlayerNames`, `window._prLatestRecord`, `window._prMoreOutsideClickBound`, `window._refreshAutocompleteLists` — 임시 상태 5개 전역 노출 | IIFE 내부 변수로 충분한데 window에 붙어 있음. 외부에서 덮어쓰기 가능. |
| GR7 | **P2** | 깨지기 쉬운 결합 | 자동완성 선택 시 `KeyboardEvent('keydown', Enter)` 디스패치로 `initTagInput` 간접 트리거 | initTagInput 내부 구현 변경 시 연쇄 파괴. |

**즉시 수정 가능 (Green)**: 없음  
**수정 시 검증 필요 (Yellow)**: ~~GR1~~ (2026-07-03 재검증으로 해결됨 확인)  
**구조 변경 필요 (Red)**: ~~GR2~~ (2026-07-03 재검증으로 해결됨 확인), ~~GR3~~ (과대 함수 분리 — R9에서 완료, 2026-07-16)

---

### 2-5. kakao-auth.js (1100줄)

**상태**: 감사 완료  
*참고: 원래 Phase 2 순서에 없던 index-page.js, owned-games-page.js는 원래 사용자 지시 목록에 없어 건너뜀.*

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| KA1 | **P1** | 과대 함수 | `openProfilePanel` 843줄 — 프로젝트 내 최대 단일 함수 | 내 보드 전체(12개 병렬 DB 조회 + HTML 빌드 + 서브시트 5개 + 이벤트 바인딩)를 단일 함수에 담음. 수정 위험 매우 높음. |
| KA2 | **P1** | IIFE 없음 | `initKakaoAuth`, `updateLoginUI`, `_updateNotifBadge`, `_showVoucherGrantToast`, `_restoreMenuExpanded` 전역 노출 | 대부분 의도적이나 `_` 접두사 함수 3개(내부 전용)도 window에 노출됨. |
| KA3 | **P1** | 취약한 파싱 | `_safeInt` (lines 473-475): HTML 문자열을 regex로 파싱해 count 추출 | `buildCharacterSection/buildAchievementsSection` HTML 구조가 변경되면 regex 미일치 → 0 fallback. 버그 탐지 없이 통계 0 표시. `_charTotal`=47, `_codexTotal`=641, `_achTotal`=96 하드코딩 fallback도 자동 갱신 안 됨. |
| KA4 | **P2** | 중복 코드 | `getGameName` (lines 308-318) — 세 번째 복사본 | game-reviews.js line 7, achievements.js line 510에 이미 있음. |
| KA5 | **P2** | 중복 코드 | `_markAllNotifSeen` vs `_markVoucherSeen` 로직 90% 동일 | DOM 조작 + `_cottageSess` 업데이트 + `_updateNotifBadge` 호출이 두 함수에 반복. |
| KA6 | **P2** | 중복 코드 | 'records'/'usage' 서브시트 afterRender에 `.profile-activity-toggle` + `.profile-more-btn` 이벤트 바인딩 동일 | 각각 6줄씩 두 번 동일하게 작성됨. |
| KA7 | **P2** | 하드코딩 fallback | `_charTotal`=47, `_codexTotal`=641, `_achTotal`=96 (lines 477-483) | 게임/업적 추가 시 자동 갱신 안 됨. HTML 파싱 실패 시 이 값이 표시됨. |
| KA8 | **P2** | 전역 접근 불일치 | line 1053: `if (typeof ensureGameSheet === 'function')` | 다른 곳(line 1013)은 `window.ensureGameSheet?.()` 형태 사용. 동일 패턴인데 표기 방식 혼재. |

**즉시 수정 가능 (Green)**: KA8 (전역 접근 표기 통일)  
**수정 시 검증 필요 (Yellow)**: KA2 (IIFE 적용 시 외부 참조 확인), KA3 (HTML 파싱 대신 데이터 전달 방식 설계)  
**구조 변경 필요 (Red)**: KA1 (openProfilePanel 분리 — 매우 높은 복잡도)

---

### 2-6. supabase-client.js (1504줄)

**상태**: 감사 완료

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| ~~SC1~~ | ~~**P1**~~ | ~~SQL LIKE 와일드카드~~ | ~~`ilike('%${nickname}%')` 4곳에서 닉네임 미이스케이프~~ | **✅ 해결됨** — 2026-07-16(R5) 재검증: 감사 이후 `_escapeLike(str)`(supabase-client.js:94, 닉네임에서 `%`·`_` **제거**)가 이미 추가돼 4곳(`getMyStats`:1252, `getMyNotifications`:1289, `getUserParticipationCount`:1670, `getUserUniqueDayCount`:1758) 전부 적용됨. 다른 곳엔 미이스케이프 ilike/like 없음(grep 전수 확인). 감사의 핵심 우려(와일드카드 누출로 타인기록 오혼입·크래시)는 제거로 해소. **잔여 한계**: 제거 방식이라 닉네임에 문자 그대로 `_`/`%`가 있으면(예 `a_b`→`%ab%`) 자기 기록을 못 찾는 손실적 매칭 가능(극히 드묾). 백슬래시 정식 이스케이프(`\_`)로 바꾸면 정확해지나 PostgREST/supabase-js의 `\` 처리 의존이라 잘못 시 전체 닉네임 매칭이 깨질 위험 > 이득이라 현행(제거) 유지 결정. |
| ~~SC2~~ | ~~**P1**~~ | ~~기능 버그~~ | ~~`getRepAchievement` 반환 `{ id }` 만 — `name` 없음~~ | **✅ 해결됨** — 2026-07-03 재검증: `kakao-auth.js`에 `repData?.name` 참조 없음. 이름 조회는 `CottageAchievements.getCharacterName(repAch.id)` → 로컬 ACH_DEFS 경로로 교체됨. 코드 수정 불필요. |
| ~~SC3~~ | ~~**P1**~~ | ~~숨은 사이드이펙트~~ | ~~`toggleGameCurious` (line 585): 궁금해요 추가 시 game_likes도 삭제~~ | **✅ 해결됨** — 2026-07-03 재검증: `toggleGameCurious` 자체는 game_likes 삭제 안 함. 좋아요↔궁금해요 상호배타 처리는 abe774b에서 호출부(`onSheetCurious`, `onPrMenuCurious`)에서 대칭 처리. 코드 수정 불필요(이미 수정됨). |
| ~~SC4~~ | ~~**P1**~~ | ~~성능~~ | ~~`getVisitorStats`: `page_views.__visitor__` 전체 조회 (limit 없음)~~ | **✅ 해결됨 (R8, 2026-07-16 재검증)** — 현재 구현(supabase-client.js:847)은 `select('id', { count:'exact', head:true })` 2쿼리로 **행을 반환하지 않고 count 숫자만** 받음. 감사가 지적한 "전체 행 반환"은 stale. 데이터 증가와 무관하게 상수 비용. 코드 변경 불필요. |
| ~~SC5~~ | ~~**P1**~~ | ~~성능~~ | ~~`getUserFirstRecordCount`: 유저 플레이 게임 전체에 대해 모든 기록 조회~~ | **✅ 재검증 종결 (R8, 2026-07-16, 코드변경 없음)** — 현재 `.in('game_id', myGameIds).limit(2000)` 有(감사의 "limit 없음"도 stale). **실측 규모**: `game_play_records` 전체 테이블 = **60행**(2026-07-16 anon 키 count 확인). 이 함수가 긁는 최대치가 테이블 전체(60행)라 성능 문제 실재하지 않음. limit(2000)이 물리는 시점 = 유저 게임들의 누적 기록이 2000행 초과 = 현재 대비 ~33배. RPC(서버측 first-recorder 집계)는 60행짜리에 영구 DB 표면 추가라 선제적 과최적화로 판단, **보류**. **재방문 임계값**: `game_play_records`가 ~1500행 접근 시 RPC 재검토(정확성 엣지 = 유저 게임 누적기록>2000이면 ascending limit이 일부 게임 최초기록을 누락 가능). |
| SC6 | **P1** | TOCTOU | `redeemVoucher`: 잔액 확인 → insert 사이 race 가능 | DB 레벨 잔액 >= 0 constraint 없으면 동시 요청 시 음수 잔액 가능. 단일 사용자 패턴상 현실적 위험은 낮음. |
| SC7 | **P2** | 중복 상수 | `_OWNER_ID = '4916417947'` — 3번 중복 | `grantAchievementVoucher`(line 1404), `grantFirstPlayVoucher`(line 1443) 로컬 const + kakao-auth.js의 `OWNER_KAKAO_ID`. |
| SC8 | **P2** | 구조 | `window.CottageDB = {...}` (line 1076) 이후 함수 정의 (lines 1155-1503) | 호이스팅으로 동작하나 50개 함수 중 절반이 CottageDB 선언 아래에 있어 가독성 혼란. 실제 버그 없음. |

**즉시 수정 가능 (Green)**: SC7 (중복 상수 통합)  
**수정 시 검증 필요 (Yellow)**: ~~SC2 (`getRepAchievement`에 name 추가 — DB join 또는 클라이언트 resolve)~~ → **✅ 해결됨**, ~~SC3 (game_likes 삭제 의도 확인 후 문서화 또는 제거)~~ → **✅ 해결됨**  
**구조 변경 필요 (Red)**: ~~SC1~~ (✅ R5 해결), ~~SC4/SC5~~ (✅ R8 종결 — SC4 이미 count/head, SC5는 60행 규모라 현행 유지·재방문 임계값 기록)

---

### 2-7. style.css (7395줄, 1654 선택자)

**상태**: 감사 완료

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| CSS1 | **P1** | 중복 정의 충돌 | ~~`.sheet-section` 두 번 정의 — 의도치 않은 cascade~~ **✅ 해결됨** | ~~line 1699: 카드형 스타일 vs line 2879: margin-bottom:14px만.~~ 2026-07-03 재검증: 두 번째 정의 제거·통합 완료. 현재 line 1797에 단일 정의만 존재(margin-top:24px/margin-bottom:14px 통합). 사용처도 script.js:1350 게임시트 게임설명 섹션 1곳뿐. 충돌 없음, 코드 수정 불필요. |
| CSS2 | **P2** | 과잉 !important | `!important` 196회 사용 | 특히 `# 8. OWNED SEARCH + SORT/FILTER TOOLBAR` 섹션 집중. 특이성 전쟁의 결과물. 새 스타일 추가 시 `!important` 없이는 덮어쓰기 어려운 구조. |
| CSS3 | **P2** | 파일 헤더 오기재 | line 8: `owned-games.html / script.js 구조 기준` 언급 | style.css는 전 페이지 공통 파일인데 특정 페이지 기준으로 작성된 것처럼 표기됨. |
| CSS4 | **P2** | 파일 크기 | 단일 파일 7395줄 | 페이지별 분리 없음. 현재 구조에서는 불가피하나 장기 유지보수 비용 높음. |

**즉시 수정 가능 (Green)**: CSS3 (파일 헤더 주석 수정)  
**수정 시 검증 필요 (Yellow)**: ~~CSS1~~ (2026-07-03 재검증으로 해결됨 확인)  
**구조 변경 필요 (Red)**: CSS2 (특이성 정리 — 영향 범위 넓어 전면 재검토 필요)

---

## Phase 2 감사 대상

| 순서 | 파일 | 상태 |
|------|------|------|
| 2-1 | `play-records-utils.js` | ✅ 완료 |
| 2-2 | `game-display-adapter.js` | ✅ 완료 |
| 2-3 | `achievements.js` | ✅ 완료 |
| 2-4 | `game-reviews.js` | ✅ 완료 |
| 2-5 | `kakao-auth.js` | ✅ 완료 |
| 2-6 | `supabase-client.js` | ✅ 완료 |
| 2-7 | `style.css` | ✅ 완료 |
| ~~2-5~~ | ~~`index-page.js`, `owned-games-page.js`~~ | 원래 지시 목록 외 — 건너뜀 |

---

## Phase 2 전체 요약

### 즉시 수정해도 되는 것 (Green — 코드 변경 없거나 영향 범위 명확)

| # | 파일 | 항목 |
|---|------|------|
| PU1 | js-api.md | `attachAc` 시그니처 수정 |
| ACH4 | achievements.js | squirrel_lv1 하드코딩 경로 → `_charImgPath()` |
| ACH8 | js-api.md | `getCharacterPath` 누락 항목 추가 |
| GDA1 | game-display-adapter.js | 파일 헤더 주석 수정 |
| KA8 | kakao-auth.js | `typeof ensureGameSheet` → `window.ensureGameSheet?.()` |
| CSS3 | style.css | 파일 헤더 주석 수정 |

### 보류할 것 (Yellow — 의도 확인 또는 영향 범위 분석 후)

| # | 파일 | 항목 | 확인 필요 사항 |
|---|------|------|--------------|
| ~~SC2~~ | ~~supabase-client.js~~ | ~~`getRepAchievement` name 누락~~ | **✅ 해결됨** — 2026-07-03 재검증: repData?.name 참조 없음, getCharacterName 경로로 교체됨. 코드 수정 불필요 |
| ~~SC3~~ | ~~supabase-client.js~~ | ~~`toggleGameCurious`에서 like 삭제~~ | **✅ 해결됨** — 2026-07-03 재검증: toggleGameCurious 자체는 game_likes 삭제 안 함. abe774b에서 호출부 대칭 처리 완료 |
| ~~ACH9~~ | ~~achievements.js~~ | ~~POINTS 맵 vs 포인트 비활성화~~ | **✅ 해결됨** — 2026-07-03 재검증: POINTS 맵 없음, grantAchievement points 인자 없음, achievement-system.md에 삭제 정책 명시. 코드 수정 불필요 |
| ~~GR1~~ | ~~game-reviews.js~~ | ~~deprecated `renderSingleGame` 유지 여부~~ | **✅ 해결됨** — 2026-07-03 재검증: 함수 없음, 호출처 없음, 직접 Supabase 접근 없음, 코드 수정 불필요 |
| ~~CSS1~~ | ~~style.css~~ | ~~`.sheet-section` 이중 정의~~ | **✅ 해결됨** — 2026-07-03 재검증: 두 번째 정의 없음, 코드 수정 불필요 |

### 건드리면 위험한 것 (Red — Plan + 승인 필요)

| # | 파일 | 항목 | 위험 이유 |
|---|------|------|----------|
| ~~SC1~~ | ~~supabase-client.js~~ | ~~LIKE 와일드카드 미이스케이프 4곳~~ | ✅ 해결됨 (2026-07-16 R5 재검증 — `_escapeLike` 이미 적용됨, 위 2-6절 SC1 상세 참조) |
| GDA2 | game-display-adapter.js | IIFE 미적용 | 25+ 함수 전역화 — 제거 시 외부 참조 확인 필수 |
| ACH5 | achievements.js | `buildAchievementsSection` 사이드이펙트 분리 | retroMissed 로직 이동 시 업적 소급 지급 타이밍 변경 |
| ACH3 | achievements.js | 패널 open 시 3중 DB 쿼리 통합 | 세 빌드 함수의 DB 쿼리 공유는 인터페이스 재설계 필요 |
| KA1 | kakao-auth.js | `openProfilePanel` 843줄 분리 | 프로젝트 내 최대 함수 — 부분 수정도 회귀 위험 높음 |
| PU2 | play-records-utils.js | blob URL 누수 수정 | `buildPhotoItemAdder` 수명주기 추적 필요 |
| ~~GR2~~ | ~~game-reviews.js~~ | ~~`renderSingleGame` CottageDB 전환~~ | ✅ GR1과 함께 삭제 완료 (136차-7) |
| ~~SC4/SC5~~ | ~~supabase-client.js~~ | ~~성능 개선 (getVisitorStats, getUserFirstRecordCount)~~ | ✅ R8 종결 — SC4 이미 count/head(행 미반환), SC5는 테이블 60행 규모라 현행 유지. 재방문 임계값(~기록 1500행) 기록. |
| CSS2 | style.css | !important 196개 특이성 정리 | 전체 레이아웃 영향, 단계적 교체만 가능 |

---

## 처리 현황 (136차 기준)

| 분류 | 항목 | 상태 |
|------|------|------|
| Green | ACH4, PU1, ACH8, GDA1, KA8, CSS3 | ✅ 완료 |
| Yellow | SC2, SC3, CSS1, GR1+GR2, ACH9 | ✅ 완료 |
| Red | ACH3, CSS2 | ✅ 완료 (137차, ACH3는 buildCharacterSection/buildAchievementsSection의 `preStats` 파라미터로 쿼리 공유 확인, CSS2는 `!important` 196→30회로 감소 확인, 2026-07-15 재검증) |
| Red | ~~KA1~~ | ❌ **미완료 정정 (2026-07-15 재검증)** — `openProfilePanel`은 분리되지 않았고 오히려 494~2465줄(~1972줄)로 이전(843줄)보다 더 커짐(Phase C readOnly 파라미터화 등 누적). 위 "✅ 완료" 표기는 오기재였던 것으로 확인. 여전히 구조 변경 필요(Red) 항목으로 유지. |
| Red | ~~SC1~~, ~~PU2~~, ~~ACH5~~, ~~GDA2~~, ~~SC4/SC5~~, ~~GR3~~ | SC1(R5)·PU2(R4)·ACH5(R6)·GDA2+GS3(R7)·SC4/SC5(R8)·GR3(R9) ✅ **전부 완료**. 최신 진행은 아래 "처리 계획" 표 기준. |

---

## Phase 3: 미감사 대형 파일 감사 (A1, 2026-07-15, Opus high — 코드 변경 없이 조사만)

Phase 2 당시 없었거나 순서 밖이라 감사 안 됐던 3파일. 조사 방식: 함수 선언·전역 노출·교차파일 중복·과대함수 경계 grep + 핵심 구간 read.

### 3-1. game-sheet.js (2693줄, 프로젝트 최대 파일) — 약 90개 함수

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| GS1 | **P1** | 과대함수 | `openGameSheet` 321줄(439~760) | 게임데이터 읽기 + 난이도/협력 계산 + 거대 HTML 빌드 + 서브위젯 초기화 혼합. 단일 함수로는 프로젝트 최상위급(KA1 다음). 부분 수정 회귀 위험 높음. |
| GS2 | **P1** | 전역 오염 | 파일 전체 **IIFE 없음** — ~90개 함수 전부 전역 노출 | onclick 핸들러(onSheetLike/onOpenPlayModal 등)는 전역 불가피하나, 순수 헬퍼 20+개(getDifficultyData·normalizeLevelValue·formatRating·formatDifficultyWeight·getGameThumbnail·getGameDetailImage·formatPlayers·formatPlayTime·getGameKey·getAllGamesArray·formatDate·_reactionUserChip 등)도 전역. GDA2와 동일 유형이나 규모 최대. |
| ~~GS3~~ | ~~**P1**~~ | ~~중복 정의~~ | ~~`getAllGamesArray` 2곳 다른 시그니처~~ | **✅ 해결됨 (R7, 2026-07-16)** — 전 14페이지가 adapter→game-sheet 순 로드라 game-sheet의 전역 무인자版(`{key,...game}`)이 adapter의 `window.getAllGamesArray`(raw·인자版)를 항상 덮어써 후자는 죽은 코드였음. adapter의 `window.getAllGamesArray = …` 노출 제거 → 전역은 game-sheet 단일 소스로 확정. adapter의 순수版은 `CottageGameView.getAllGamesArray(gameData)`로만 남김(game-sheet.js:301 유일 소비). 런타임 무변화(behavior-preserving), node --check 통과. |
| GS4 | **P2** | 이름 충돌 | `getGameKey` 동명·다른 시그니처 | game-sheet.js:250(게임 **객체** 인자) vs game-reviews.js:14(게임 **id** 인자). 파일 넘나들 때 혼동. |
| GS5 | **P2** | 중복 코드 | `escH` 로컬 재정의(2248, initPlayWidget 내부) | `window.escH`(supabase-client)와 중복 — escH 계열 5번째 사본(PU4/ACH6/DD3와 동일 패턴). |
| GS6 | **P2** | 과대함수 다수 | 100줄 안팎 함수 다수 | `buildRecordItemHtml`(128줄, initPlayWidget 내부) · `getOrCreatePlayModal`(110줄) · `openGameRecordSheet`(97줄) · `onSubmitPlayModal`(70+줄). 렌더+이벤트+저장 혼합. |
| GS7 | **P2** | 전역 결합 | 난이도 헬퍼 전역 의존 | `getDifficultyData`/`normalizeLevelValue`가 game-sheet.js에 정의되고 game-display-adapter·script-nav·owned-games-page가 전역 참조. 로드 순서 결합. |

### 3-2. index-page.js (1594줄) — 상위 전역함수 + IIFE 모듈 혼재

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| IP1 | **P1** | 과대함수 | `renderGameCards` 208줄(5~213) · `updateRecommendFilterText` 157줄(464~621) · `initMeetingSection` IIFE 289줄(1305~1594, 내부 `renderPreview` 124줄) | |
| IP2 | **P2** | 구조 일관성 | 부분 모듈화 혼재 | 추천 관련 15+개는 상위 전역함수(onclick), 나머지 init은 IIFE `(function initX(){})()`. 한 파일에 두 방식 혼재 — 경계 기준 불명확. |
| IP3 | **P2** | 중복/파편화 | `toDateStr`(930) 전역 vs day-detail.js `fmtDate`(368) 별도 | 날짜 포맷 헬퍼가 파일마다 각자. escH·getGameName 계열과 동일 파편화. (※KST 집계 버그는 2026-07-15 이미 수정 완료) |

### 3-3. day-detail.js (1180줄) — **구조 양호(모범)**, 과대함수만 이슈

| # | 위험도 | 분류 | 이슈 | 상세 |
|---|--------|------|------|------|
| DD1 | **P1** | 과대함수 | `openDateMeetingModal` 281줄(796~1077) · `openDateScheduleModal` 179줄(465~644) · `buildBarsInCard` 100줄 | 렌더 + 이벤트 바인딩 + DB 조회 혼합. |
| DD2 | — | (긍정) | **IIFE 래핑 + CSS 자기주입 + window 노출 9개(전부 의도된 공개 API)** | 전역 오염 없음. game-sheet.js와 정반대 — 신규 파일 작성 시 이 구조가 모범. |
| DD3 | **P2** | 중복 코드 | `esc`(364)·`fmtDate`(368) 로컬 | esc는 escH 계열 사본, fmtDate는 IP3 파편화의 일부. |

### 교차 파일 종합 (기존 등록분 + Phase 3 확장)

- **escH/esc 사본 5곳**: `window.escH`(supabase-client) · `_escH`(play-records-utils, PU4) · `esc`(achievements, ACH6) · `escH`(game-sheet GS5) · `esc`(day-detail DD3). → 공용화하려면 `"` 이스케이프 차이(PU4 지적) 먼저 정리 필요.
- **게임명 해석 4곳**: getGameName(game-reviews·achievements·kakao-auth) + resolveGameName(day-detail). KA4(R2)에서 3곳 통합 시 day-detail resolveGameName도 함께 검토.
- **getGameKey 2곳 다른 시그니처**(GS4), **getAllGamesArray 2곳 다른 시그니처**(GS3).

### A1 결론 — 재정렬 판단

- game-sheet.js는 **파일 단위 구조부채는 최대**(GS2, 90개 전역)지만, onclick 핸들러가 다수라 "IIFE로 감싸기"가 클린한 작업이 아님(내보낼 것/숨길 것 선별 필요) → KA1(단일함수 1972줄)만큼 급하진 않으나 규모 큼.
- **즉시 R7과 병합 가능**: GS3(getAllGamesArray 중복)은 R7(GDA2, game-display-adapter IIFE)과 원인이 같아 함께 처리.
- **KA4(R2)에 day-detail resolveGameName 검토 추가**.
- 신규 대형 항목 **R11(game-sheet.js 구조/과대함수)·R12(day-detail.js 과대함수 DD1)**를 계획 말미(R10 KA1 앞뒤)에 추가. game-sheet.js가 KA1보다 먼저인지 뒤인지는 R2~R9 진행하며 체감 후 최종 결정(현재는 KA1을 최후, R11을 그 앞에 잠정 배치).

---

## 처리 계획 (2026-07-15 수립) — 세션 분할 + 모델 배정

**원칙**: 각 세션 = 1항목(또는 안전하게 묶이는 그린 배치 1건). REFACTOR MODE(신규기능·UI변경 금지) 준수, 세션 끝마다 atomic 커밋 + 이 표 갱신. 낮은 리스크·빠른 종료 순으로 정렬(위험한 것을 뒤로).

| 순서 | 세션 | 항목 | 모델·effort | Plan 필요? | 상태 |
|------|------|------|------------|-----------|------|
| 1 | R1 | **그린 배치**: `buildGameBody` dead code 삭제(game-reviews.js) · KA4 `getGameName` 중복 통합 · KA5 `_markAllNotifSeen`/`_markVoucherSeen` 중복 통합 · KA6 이벤트 바인딩 중복 제거 · GR6 `window._pr*` 전역변수 5개 IIFE 내부화 · `.mb-week-games` dead CSS 삭제 | **Sonnet medium** | 아니오 | ✅ **완료 (2026-07-15)** — 세부: ①`buildGameBody`(76줄) 삭제, 호출처 0곳 확인 ②KA4는 세 파일 구현이 실제로 다름(game-reviews.js만 fallback 문구·gameData조회 없음) 발견 → 강행 통합 보류, **R2로 재분류** ③KA5 `_markRewardCardSeen`/`_resetNotifBtnAndConfirmAll` 헬퍼 2개로 중복 6+5줄 추출 ④KA6은 `_bindActivityTogglesAndMore` 헬퍼가 이미 존재·양쪽 서브시트가 이미 사용 중이라 **재검증만 하고 종료**(이전 세션에서 이미 해결, 문서 미반영이었던 것) ⑤GR6 4개(`_prGroups`/`_prLatestRecord`/`_prMoreOutsideClickBound`/`_refreshAutocompleteLists`) IIFE 내부화, `_prPlayerNames`는 game-sheet.js 크로스파일 참조 확인돼 **window 유지**(내부화 시 깨짐) ⑥`.mb-week-games` CSS 1줄 삭제. node --check 통과. |
| 2 | **A1** | Phase 3 감사 — 미감사 대형 파일 3개(game-sheet.js·index-page.js·day-detail.js) | **Opus high** | 아니오 | ✅ **완료 (2026-07-15)** — 위 "Phase 3" 섹션에 GS1~7·IP1~3·DD1~3 기록. 결론: game-sheet.js 구조부채 최대지만 onclick 다수라 clean IIFE화 어려움. GS3은 R7과 병합, KA4에 day-detail resolveGameName 추가, 신규 R11(game-sheet)·R12(day-detail) 추가. |
| 3 | R2 | **옐로 배치**: `_openBoxAddSearch`↔`_openTasteAddModal` DRY 통합 · ACH1 8축 정렬 순서 중복상수 4곳→1곳 · ACH3 재검증 · KA4 | **Sonnet high** | 아니오 | ✅ **완료 (2026-07-15)** — ①ACH3: `fetchUserStats`를 1회만 호출해 `userStats`로 캐싱, 3개 build함수+findNextAchievement가 재사용 중임을 재확인(이미 해결돼 있었음). ②ACH1: `AXIS_ORDER` 단일 상수 신설, `_CHAR_SORT_ORDER`/`_CHAR_AXES`/`_TITLE_AXES`/`_ACH_TYPE_ORDER` 4곳 제거해 참조로 교체. ③**KA4는 병합하지 않고 종결** — 추가 조사 결과 `window.gameData`는 **한글슬러그** 키, `window.COTTAGE_GAMES`는 **bggId** 매칭이라 kakao-auth/achievements 버전(둘 다 처리)과 game-reviews 버전(슬러그 조회 누락)이 실제로 다른 입력을 처리함. 게다가 game-reviews.html 로드순서가 achievements.js→kakao-auth.js→game-reviews.js라 "하나를 전역 공유" 방식도 안전하지 않음(achievements가 kakao-auth보다 먼저 로드). 강제 병합은 미보유 게임(슬러그 기반) 이름표시 회귀 위험 → 3개 함수 현행 유지, day-detail.js `resolveGameName`(4번째 변형)도 통합 대상에서 제외. ④`_openBoxAddSearch`↔`_openTasteAddModal`: 검색 UI(디바운스·매칭·결과렌더링) 46줄 동일 확인 → `_openGameAddSearchModal({overlayId,title,inList,onAdd})` 공용 헬퍼로 추출, 목록추적 방식 차이(DOM기반 vs 배열기반)는 각자 `inList`/`onAdd` 콜백으로 유지(동작 무변경). node --check 통과. |
| 4 | R3 | KA2(`_` 내부함수 window 노출 제거) · KA3(`_safeInt` regex파싱 → 데이터 전달 방식) | **Opus medium** (⚠️실제로는 Sonnet high로 실행됨 — R2 이후 모델 전환 없이 이어감, 착수 전 미확인. 검증절차(참조 전수확인·node --check)는 동일하게 거쳐 결과물 자체는 문제없음 확인) | 아니오(외부참조 확인만) | ✅ **완료 (2026-07-15)** — ①KA2: `_updateNotifBadge`/`_showVoucherGrantToast`/`_restoreMenuExpanded` 외부참조 전수 확인(grep 전체 프로젝트) 결과 kakao-auth.js 내부 호출뿐, 다른 파일·HTML 어디서도 미참조 → **현재 무해, 코드 수정 불필요로 종결**. 완전 제거하려면 파일 전체(2500+줄) IIFE 래핑이 필요해 KA1급 규모라 별도 항목 아님. ②KA3: `buildCodexSection`/`buildCharacterSection`/`buildAchievementsSection`(문자열 반환) + `buildTitleSection`(이미 `{html,earnedIds}` 반환)을 전부 `{html, count, total}` 객체 반환으로 통일 — 호출처가 각 함수당 kakao-auth.js 1곳뿐이라 범위 작음 확인 후 진행. `data-char-count` 등 8개 스크래핑용 속성 제거, kakao-auth.js `_safeInt`(regex 파싱) 함수 자체 삭제, 반환값 직접 참조로 교체. node --check 통과. |
| 5 | R4 | PU2 — `buildPhotoItemAdder` blob URL 미해제(메모리 누수) 수정 | **Sonnet high** | 아니오 | ✅ **완료 (2026-07-16)** — 개별 삭제(✕) 시엔 이미 `revokeObjectURL` 있었으나, **그리드/행/폼을 통째로 `innerHTML=''`·`.remove()`로 지우는 지점**에서 미해제였던 게 진짜 누수. `revokePhotoGridBlobs(root)` 공용 헬퍼(play-records-utils.js) 신설 — root 안의 `blob:` img 전부 해제. 호출처 6곳: game-sheet.js `onOpenPhotoInput`/`onOpenPlayModal`/`onClosePlayModal`(그리드 초기화 3곳), game-reviews.js 행삭제(`.pr-rm-btn`)·편집폼 취소(`.pr-inline-cancel`/`-top` 2곳)·**다중행 저장 성공 후 `prGameRows` 전체 초기화**(가장 빈번한 지점). node --check 전체 통과. |
| 6 | R5 | SC1 — LIKE 와일드카드 미이스케이프 4곳 동시 수정 (PostgreSQL escape 방식 조사 선행) | **Opus medium~high** | 아니오(쿼리 로직만, DB스키마 무변경) | ✅ **완료 (2026-07-16, 코드변경 없음)** — 조사 선행 결과 감사 이후 `_escapeLike`가 이미 4곳에 적용돼 있어 SC1 핵심(안전성) 해소 확인. 백슬래시 정식 이스케이프로의 업그레이드는 위험>이득이라 현행 유지. 상세는 2-6절 SC1. |
| 7 | R6 | ACH5 — `buildAchievementsSection`의 숨은 업적 소급지급 side-effect를 명시적 함수로 분리 | **Opus high** | 권장(지급 타이밍 영향) | ✅ **완료 (2026-07-16)** — 인라인 루프는 이미 `_grantRetroAchievements`로 추출돼 있었으나 여전히 `buildAchievementsSection` 내부에서 호출(hidden write)됐던 것이 핵심 문제. `grantRetroAchievements(userId,stats)` public 승격 → buildAchievementsSection 순수화 → kakao-auth.js openProfilePanel에서 빌드 앞·`!readOnly` 가드로 명시 호출. readOnly 열람 시 대상 유저 DB write 발생하던 부수 버그 함께 수정. node --check 통과. 상세는 위 2-3절 ACH5. |
| 8 | R7 | GDA2 — `game-display-adapter.js` IIFE 적용, 25+ 전역함수 비노출화 **+ GS3**(`getAllGamesArray` 2곳 중복 정의 정리, A1에서 병합) | **Opus xhigh** | **필요**(외부 참조 전수 확인 먼저) | ✅ **완료 (2026-07-16)** — GDA2는 이미 IIFE 적용돼 있어 un-expose 대상 없음(감사 stale). 실질 작업은 GS3: adapter의 죽은 `window.getAllGamesArray` 노출 제거(551~552줄) → 전역은 game-sheet 단일 소스. GDA6도 함께 종결. 외부참조 전수확인(호출처 6곳 전부 무인자, 14페이지 로드순서 adapter<sheet 전수확인)·node --check 통과. 런타임 무변화. |
| 9 | R8 | SC4/SC5 — `getVisitorStats`/`getUserFirstRecordCount` 성능 개선(limit 또는 RPC) | **Opus xhigh** | **필요**(RPC 신설 시 DB 변경) | ✅ **완료 (2026-07-16, 코드변경 없음)** — 재검증 결과 SC4는 이미 count/head(행 미반환), SC5는 `game_play_records` 전체 60행(실측) 규모에 limit(2000)도 有라 성능 문제 부재. RPC는 선제적 과최적화로 보류(사용자 승인 A안). 재방문 임계값(~기록 1500행) 기록. DB 변경 없음. 상세는 2-6절 SC4/SC5. |
| 10 | R9 | GR3 — `game-reviews.js` 과대함수 3개(`renderRecords` 277줄 등) 분리 | **Opus xhigh** | **필요** | ✅ **완료 (2026-07-16, 커밋 e813fe3·a118763·1b6fe42·159cdd6 + 스모크 통과)** — 승인 플랜의 추출 4건 전부 실행: `_buildGameRow`(141줄)·`_submitInputRows`(90줄)·`_openInlineEditForm`(148줄)·`_recCaption` 모듈화. renderInputPanel 287→**65줄**, renderRecords 367→**212줄**(플랜 목표 ~60/~217 부합). 본문 diff 검증으로 behavior-preserving 확인 — 이동 블록 전체에서 바뀐 문자는 `++rowIdx`→`rowIdx`, `groups`→`_prGroups` 2건뿐. window 노출 변화 0(js-api.md 갱신 불필요). 플랜 대비 1건 이탈: 저장버튼 바인딩을 `onclick` 대신 기존 `addEventListener` 유지(동작 보존에 더 안전, 결과 동일). 스모크에서 파생 버그 1건 발견 → 별도 fix 90997f0(아래 결과 메모). |
| 11 | **R11a** | **[A1 신규] GS1 — `openGameSheet` 321줄 분리** | **Opus xhigh** | 완료(플랜 승인 2026-07-16) | ✅ **완료 (2026-07-16, 커밋 3d09527~3824bf1 + 스모크 통과)** — 5개 추출(`_buildSameDesignerHtml`·`_openAndInitSheet`·`_buildSheetRecordsHtml`·`_buildSheetReactionsHtml`·`_buildSheetMechsHtml`)로 **321→187줄**. 감사가 지적한 4개 관심사 중 '서브위젯 초기화'를 경계로 분리. 본문 diff로 무수정 이동 검증(변경분은 assignment→return 등 각 1~2줄), window 노출 변화 0. 계산부(~93줄)를 vm 객체로 묶는 안은 템플릿 변수 15개에 접두사가 붙어 diff 검증이 무력화되므로 기각. |
| 11b | **R11b** | GS6 — 나머지 과대함수 4개 분리: `initPlayWidget`(161)·`getOrCreatePlayModal`(110)·`openGameRecordSheet`(97)·`onSubmitPlayModal`(81) | **Opus xhigh** | 권장 | ⏳ 대기 (R11a와 동일 패턴, 교차파일 위험 없음) |
| 11c | **R11c** | GS2 — 파일 IIFE화 + 선별 노출. **단독 세션 필수** | **Opus xhigh** | **필요, 필수** | ⏳ 대기 — 유일하게 교차파일 위험 있음. 아래 "R11 사전조사" 참조 |
| 12 | R12 | **[A1 신규] day-detail.js 과대함수 분리** — DD1(`openDateMeetingModal` 281줄·`openDateScheduleModal` 179줄·`buildBarsInCard`). 구조 자체는 양호(IIFE) — 과대함수만. DD3(esc/fmtDate 로컬)도 함께. | **Opus xhigh** | **필요** | ⏳ 대기 |
| 13 | R10 | **KA1 — `openProfilePanel` 1,972줄 분리** (최대·최고위험 단일함수, 서브시트별로 여러 세션 재분할 가능성 있음). **+ 크로스보드 stale 버그 동반 해결(2026-07-16)**: 취향보드(`likedGames`)와 모임보드(`_meeting.likedGames`)가 같은 `game_likes`를 패널오픈 시 각각 따로 불러와 **별도 배열 2개**로 들고 있어, 한쪽에서 게임 추가/삭제해도 반대 보드엔 새로고침 전까지 미반영(`getMeetingProfile`이 내부에서 `getUserLikedGamesAll` 재호출). 방향 A(진입 시 DB 재조회 = 단일 소스)로 서브시트/박스 데이터 로딩을 재설계 → 현재 취향보드 스냅샷 임시방편(커밋 11e10b8)도 이걸로 대체. | **Opus xhigh** | **필요, 필수** | ⏳ 대기 |

**A1 재정렬 결과 (2026-07-15)**: game-sheet.js가 파일 단위로는 최대 부채지만 onclick 핸들러 다수라 clean IIFE화가 어려워, R2~R6(안전·빠른 항목)을 앞당길 이유가 없다고 판단 — 기존 순서 유지하고 신규 R11(game-sheet)·R12(day-detail)을 R9와 R10(KA1) 사이에 삽입. game-sheet.js(R11)와 openProfilePanel(R10=최후)의 선후는 R2~R9 진행하며 체감 후 최종 확정.

~~**감사 자체가 안 된 파일**: game-sheet.js·index-page.js·day-detail.js~~ → **✅ 해소됨 (A1 Phase 3 감사, 2026-07-15)**. 세 파일 모두 감사 완료로 위 "Phase 3" 절에 GS1~7·IP1~3·DD1~3 기록됨. 그 결과로 R11(game-sheet)·R12(day-detail)이 계획에 편입됨. index-page(IP1~3)는 아직 R번호 미배정 — 잔여 미배정 항목은 GS4(`getGameKey` 이름 충돌)·IP1~3.

**세션 전환 규칙**: CLAUDE.md 모델전환 원칙대로, 매 항목 시작 직전 이 표의 모델과 현재 활성 모델이 다르면 멈추고 전환 요청. 그린/옐로 항목은 Plan 없이 바로 진행, Red 중 Plan 표시된 항목(R6~R10)은 착수 전 Plan 작성→승인 필수.

---

## R11 사전조사 (2026-07-16, R11c 실행 시 재조사 불필요)

`game-sheet.js` IIFE화(GS2)의 핵심은 "전역으로 남겨야 하는 함수" 특정. 실측 결과:

| 구분 | 개수 |
|---|---|
| 최상위 함수 전체 | 90 (R11a 후 95) |
| 파일 밖(js/html)에서 참조 | 16 — `ensureGameSheet` `formatDate` `formatDifficultyWeight` `formatPlayers` `formatRating` `getAllGamesArray` `getAvailBadgeHtml` `getDifficultyData` `getGameKey` `getShelfSpanHtml` `normalizeLevelValue` `onOpenCommentInput` `onOpenPhotoInput` `openGameRecordSheet` `openGameSheet` `requireLogin` |
| 자기 템플릿 `onclick=`이 호출 | 27 (위와 4개 중복) |
| **→ 전역 유지 필수** | **39** |
| **→ 내부화 가능** | **51** (R11a 신규 5개 포함 시 56) |

**감사의 "onclick 다수라 clean IIFE화 어려움" 판단은 과했음** — 목록이 특정되므로 기계적으로 가능. 단 아래 함정 주의:

- ⚠️ **`onclick` 한 속성에 호출이 여러 개**인 경우 있음(3곳). 첫 호출만 잡는 정규식은 `_openCoverModal`을 놓쳐 "내부화 가능"으로 **오분류**함 → 표지 클릭 사망. 속성 단위·줄 단위 두 방식으로 교차검증할 것(2026-07-16 조사에선 두 방식이 27개로 일치).
- ⚠️ 감사 원문 수치 일부 부정확: `onOpenPlayModal`은 onclick이 아니라 `requireLogin(() => …)` 내부 호출(내부화 가능). `buildRecordItemHtml`은 128줄이 아니라 실측 ~40줄.
- ⚠️ 노출 누락 시 **로드 에러 없이 버튼만 조용히 죽음** → 페이지별 클릭 스모크 필수.

**보류 권고**: GS5(escH 사본 제거)는 감사 자체가 `"` 이스케이프 차이(PU4) 선행 정리를 조건으로 담. GS7(난이도 헬퍼 전역결합)은 IIFE로 안 풀림 — `getDifficultyData`/`normalizeLevelValue`가 어차피 전역 유지 대상이라, 실제 해결은 헬퍼 별도 파일 분리(신규 파일 = 별도 결정).

---

## R9 결과 메모 (2026-07-16 종료)

브라우저 스모크 통과 확인(사용자, 2026-07-16) — 입력탭·보기탭 전 항목 정상.

**스모크에서 파생된 버그 1건 발견·수정 (커밋 90997f0)**: 리팩토링 중 "보존할 quirk"로 분류했던 *저장 후 첫 행에 '최신 기록' 대신 '위와 동일'이 붙는 동작*은 quirk가 아니라 **버그**였음. 사용자가 "최신 기록이 나와야 하는 것 아니냐"고 짚어 재검토한 결과: 저장 시 `rowIdx`가 이어져 새 첫 행이 2번째 이상으로 취급 → 위에 복사할 행이 없어 **무동작 죽은 버튼**이 되고, 새로고침 전까지 복구 불가. R9 종료 후 별도 fix 커밋으로 처리(리팩토링과 미혼합). `resetRows()`를 저장 경로에 전달하는 방식 — 리팩토링으로 경계가 생긴 덕에 "저장 후엔 행을 처음부터"라는 의도가 코드에 명시됨.

**남은 구조 메모**: renderRecords 잔여 소형 핸들러 블록은 "과도분리 금지" 원칙으로 그대로 뒀음 — 추가 분리 대상 아님.

**후속 정리(토큰 여유 시)**: 이 CHECKPOINT의 Phase 1/2/3 감사 상세는 대부분 ✅ 종결됐으나 미슬림 — 세션 시작 필독 아니라 방치 중. R10 이후 별도 정리 세션에서 해결된 감사행 압축.
