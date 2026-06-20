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

## Phase 2 감사 대상

| 순서 | 파일 | 상태 |
|------|------|------|
| 2-1 | `play-records-utils.js` | ✅ 완료 |
| 2-2 | `game-display-adapter.js` | 대기 |
| 2-3 | `achievements.js` | 대기 |
| 2-4 | `game-reviews.js` | 대기 |
| 2-5 | `index-page.js`, `owned-games-page.js` | 대기 |
| 2-6 | `kakao-auth.js` | 대기 |
| 2-7 | `supabase-client.js` | 대기 (마지막) |
| 2-8 | `style.css` | 대기 (마지막) |
