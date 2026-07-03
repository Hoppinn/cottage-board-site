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
| PU3 | **P1** | 사이드이펙트 | `attachAc`: `listRef` 없을 때 input의 DOM 위치 변경 | line 119-127: input을 새 `div.wrap`으로 이동시킴. 호출 측 CSS 셀렉터나 이벤트 리스너가 input 부모를 참조하면 깨짐. `listRef`를 전달하는 호출은 안전. |
| PU4 | **P2** | 중복 코드 | `_escH` (line 89) ↔ `window.escH` (supabase-client.js) 거의 동일 | `_escH`: `& < >` 이스케이프. `window.escH`: `& < > "` 이스케이프. 기능 95% 동일. supabase-client.js가 항상 먼저 로드되므로 `window.escH` 재사용 가능. 단, `"` 이스케이프 여부 차이 있으므로 단순 치환은 불가 (용도 확인 필요). |
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
| GDA2 | **P1** | 전역 오염 | IIFE 없음 — 25개 이상 함수가 전역 노출 | `safeArray`, `safeText`, `safeNumber`, `uniqueArray`, `renderStars`, `getDisplayTags` 등 내부 헬퍼가 모두 `window.*`로 노출. play-records-utils.js, achievements.js는 IIFE 적용됨. |
| GDA3 | **P2** | 중복 로직 | `getSearchText`: `getDisplayTags` 호출 + 직접 접근 이중 집계 | `getDisplayTags`가 이미 `moodTags/playTags/relationshipTags`를 반환하는데 동일 필드를 직접 join도 함. 검색 가중치가 2배가 되거나 중복 토큰 생성 가능. |
| GDA4 | **P2** | 로드 순서 의존 | `window.COTTAGE_GAMES` 실행 시점 즉시 생성 | line 533: `window.gameData`가 로드된 상태여야 함. 로드 순서 변경 시 빈 배열로 초기화. |
| GDA5 | **P2** | 중복 로직 | `getGameCardData` / `getGameDetailData` / `getRecommendData` 내 서브함수 호출 중복 | 세 함수 모두 `safeArray(g.mood_tags)` 등 동일 파싱 로직을 각자 실행. 공용 파싱 레이어가 없음. |
| GDA6 | **P2** | 불필요한 파라미터 | `getAllGamesArray(gameData)` — 파라미터가 전역과 중복 | `window.gameData`가 전역이므로 파라미터 불필요. 호출처가 일부는 전달, 일부는 생략 — 혼용됨. |

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
| ACH5 | **P1** | 숨은 사이드이펙트 | `buildAchievementsSection` 이름과 달리 소급 업적 지급 실행 | lines 801-808: `_retroMissed` 루프에서 `db.grantAchievement()` 호출. "build" 이름이 read-only를 암시하나 실제로는 write 발생. 외부 호출자는 이 부수효과를 예측하기 어려움. |
| ACH6 | **P2** | 중복 코드 | `esc` 함수 (line 656) — `window.escH`의 세 번째 복사본 | `buildCodexSection` 내부 로컬 `esc` 함수 = play-records-utils.js의 `_escH`와 동일 패턴. `window.escH`로 대체 가능. |
| ACH7 | **P2** | 미사용 파라미터 | `showAchievementToast(name, points)` — `points` 받지만 HTML에 미출력 | line 370+: toast HTML에 `name`만 표시, `points` 변수는 함수 내에서 사용되지 않음. 포인트 비활성화 결정이 반영된 것이면 파라미터 정리 필요. |
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
| GR3 | **P1** | 과대 함수 | `renderRecords`(277줄), `renderInputPanel`(255줄), `addRow`(137줄) | 렌더링·이벤트 바인딩·저장 로직이 단일 함수에 혼합. 테스트 불가 구조. |
| GR4 | **P2** | 중복 로직 | `isParticipant` 계산, `score_note` 포맷팅이 `buildSessionBody`/`buildGameBody`에 각각 동일 코드 | 같은 6~7줄 로직이 두 함수에 그대로 복사됨. |
| GR5 | **P2** | 중복 로직 | 참여자 자동완성 `onSelect → Enter 디스패치` 패턴 2중 구현 | 신규 입력 폼(lines 252-263)과 수정 폼(lines 558-568)에 동일 코드. initTagInput과의 간접 결합 패턴. |
| GR6 | **P2** | 전역 오염 | `window._prGroups`, `window._prPlayerNames`, `window._prLatestRecord`, `window._prMoreOutsideClickBound`, `window._refreshAutocompleteLists` — 임시 상태 5개 전역 노출 | IIFE 내부 변수로 충분한데 window에 붙어 있음. 외부에서 덮어쓰기 가능. |
| GR7 | **P2** | 깨지기 쉬운 결합 | 자동완성 선택 시 `KeyboardEvent('keydown', Enter)` 디스패치로 `initTagInput` 간접 트리거 | initTagInput 내부 구현 변경 시 연쇄 파괴. |

**즉시 수정 가능 (Green)**: 없음  
**수정 시 검증 필요 (Yellow)**: ~~GR1~~ (2026-07-03 재검증으로 해결됨 확인)  
**구조 변경 필요 (Red)**: ~~GR2~~ (2026-07-03 재검증으로 해결됨 확인), GR3 (과대 함수 분리)

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
| SC1 | **P1** | SQL LIKE 와일드카드 | `ilike('%${nickname}%')` 4곳에서 닉네임 미이스케이프 | `getMyStats`(line 979), `getMyNotifications`(line 1015), `getUserParticipationCount`(line 1349), `getUserUniqueDayCount`(line 1435). 닉네임에 `%` 또는 `_` 포함 시 LIKE 패턴으로 해석 → 타인 기록 포함되거나 자기 기록 미조회. 현재 닉네임은 안전하나 닉네임 제약이 느슨해지면 오탐. |
| SC2 | **P1** | 기능 버그 | `getRepAchievement` 반환 `{ id }` 만 — `name` 없음 | kakao-auth.js line 592: `repData?.name` 참조 → 항상 undefined → 대표 캐릭터 설정해도 이름 라벨이 '대표 캐릭터 없음'으로 표시됨. |
| SC3 | **P1** | 숨은 사이드이펙트 | `toggleGameCurious` (line 585): 궁금해요 추가 시 game_likes도 삭제 | `await db.from("game_likes").delete()...` — 유저의 ❤️가 사라짐. 의도적이라면 js-api.md에 명시 필요. |
| SC4 | **P1** | 성능 | `getVisitorStats`: `page_views.__visitor__` 전체 조회 (limit 없음) | 데이터 증가 시 수천~수만 행 클라이언트 반환. DB 집계 함수나 limit 추가 필요. |
| SC5 | **P1** | 성능 | `getUserFirstRecordCount`: 유저 플레이 게임 전체에 대해 모든 기록 조회 | line 1365: `in('game_id', myGameIds)` — 인기 게임 포함 시 수백~수천 행 반환. RPC 또는 범위 제한 필요. |
| SC6 | **P1** | TOCTOU | `redeemVoucher`: 잔액 확인 → insert 사이 race 가능 | DB 레벨 잔액 >= 0 constraint 없으면 동시 요청 시 음수 잔액 가능. 단일 사용자 패턴상 현실적 위험은 낮음. |
| SC7 | **P2** | 중복 상수 | `_OWNER_ID = '4916417947'` — 3번 중복 | `grantAchievementVoucher`(line 1404), `grantFirstPlayVoucher`(line 1443) 로컬 const + kakao-auth.js의 `OWNER_KAKAO_ID`. |
| SC8 | **P2** | 구조 | `window.CottageDB = {...}` (line 1076) 이후 함수 정의 (lines 1155-1503) | 호이스팅으로 동작하나 50개 함수 중 절반이 CottageDB 선언 아래에 있어 가독성 혼란. 실제 버그 없음. |

**즉시 수정 가능 (Green)**: SC7 (중복 상수 통합)  
**수정 시 검증 필요 (Yellow)**: SC2 (`getRepAchievement`에 name 추가 — DB join 또는 클라이언트 resolve), SC3 (game_likes 삭제 의도 확인 후 문서화 또는 제거)  
**구조 변경 필요 (Red)**: SC1 (LIKE 이스케이프 — 4곳 동시 수정, PostgreSQL ilike 이스케이프 방식 확인 필요), SC4/SC5 (성능 개선 — DB RPC 또는 limit 도입)

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
| SC2 | supabase-client.js | `getRepAchievement` name 누락 | 대표 캐릭터 이름이 어디서 표시되는지 실제 확인 |
| SC3 | supabase-client.js | `toggleGameCurious`에서 like 삭제 | 의도적인 동작인지 확인 후 문서화 또는 제거 |
| ~~ACH9~~ | ~~achievements.js~~ | ~~POINTS 맵 vs 포인트 비활성화~~ | **✅ 해결됨** — 2026-07-03 재검증: POINTS 맵 없음, grantAchievement points 인자 없음, achievement-system.md에 삭제 정책 명시. 코드 수정 불필요 |
| ~~GR1~~ | ~~game-reviews.js~~ | ~~deprecated `renderSingleGame` 유지 여부~~ | **✅ 해결됨** — 2026-07-03 재검증: 함수 없음, 호출처 없음, 직접 Supabase 접근 없음, 코드 수정 불필요 |
| ~~CSS1~~ | ~~style.css~~ | ~~`.sheet-section` 이중 정의~~ | **✅ 해결됨** — 2026-07-03 재검증: 두 번째 정의 없음, 코드 수정 불필요 |

### 건드리면 위험한 것 (Red — Plan + 승인 필요)

| # | 파일 | 항목 | 위험 이유 |
|---|------|------|----------|
| SC1 | supabase-client.js | LIKE 와일드카드 미이스케이프 4곳 | PostgreSQL ilike 이스케이프 방법 확인 필요, 쿼리 변경으로 기존 동작 영향 |
| GDA2 | game-display-adapter.js | IIFE 미적용 | 25+ 함수 전역화 — 제거 시 외부 참조 확인 필수 |
| ACH5 | achievements.js | `buildAchievementsSection` 사이드이펙트 분리 | retroMissed 로직 이동 시 업적 소급 지급 타이밍 변경 |
| ACH3 | achievements.js | 패널 open 시 3중 DB 쿼리 통합 | 세 빌드 함수의 DB 쿼리 공유는 인터페이스 재설계 필요 |
| KA1 | kakao-auth.js | `openProfilePanel` 843줄 분리 | 프로젝트 내 최대 함수 — 부분 수정도 회귀 위험 높음 |
| PU2 | play-records-utils.js | blob URL 누수 수정 | `buildPhotoItemAdder` 수명주기 추적 필요 |
| ~~GR2~~ | ~~game-reviews.js~~ | ~~`renderSingleGame` CottageDB 전환~~ | ✅ GR1과 함께 삭제 완료 (136차-7) |
| SC4/SC5 | supabase-client.js | 성능 개선 (getVisitorStats, getUserFirstRecordCount) | DB RPC 추가 또는 쿼리 재설계 필요 |
| CSS2 | style.css | !important 196개 특이성 정리 | 전체 레이아웃 영향, 단계적 교체만 가능 |

---

## 처리 현황 (136차 기준)

| 분류 | 항목 | 상태 |
|------|------|------|
| Green | ACH4, PU1, ACH8, GDA1, KA8, CSS3 | ✅ 완료 |
| Yellow | SC2, SC3, CSS1, GR1+GR2, ACH9 | ✅ 완료 |
| Red | ACH3, KA1, CSS2 | ✅ 완료 (137차) |
| Red | SC1, PU2, GDA2, ACH5, SC4/SC5 | ⏳ 미처리 |
