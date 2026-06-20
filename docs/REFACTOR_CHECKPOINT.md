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

## Phase 2 감사 대상 (미착수)

Phase 1 완료 후 아래 순서로 진행:

| 순서 | 파일 | 비고 |
|------|------|------|
| 2-1 | `play-records-utils.js` | initTagInput 등 공유 유틸 |
| 2-2 | `game-display-adapter.js` | COTTAGE_GAMES 생성 |
| 2-3 | `achievements.js` | ACH_DEFS, _charImgPath |
| 2-4 | `game-reviews.js` | 플레이기록 허브 |
| 2-5 | `index-page.js`, `owned-games-page.js` | 페이지 전용 JS |
| 2-6 | `kakao-auth.js` | 인증·알림·프로필 |
| 2-7 | `supabase-client.js` | 핵심 DB 레이어 (마지막) |
| 2-8 | `style.css` | 마지막. 범위 가장 넓음 |

---

## 수정 우선순위 요약

| 즉시 수정 (Green) | 보류/확인 (Yellow) |
|-------------------|--------------------|
| D1 anon_sessions 컬럼 완전 오기재 | A1 sparrow/squirrel_lv5 삭제 여부 |
| D2 page_sessions session_key 누락 | A2~A3 rare/ 이미지 경로 체계 미반영 |
| D3 game_requests 컬럼 4개 누락 | A4 고아 칭호 의도 확인 |
| J1 initTagInput 시그니처 오기재 | S1 session_key 내러티브 혼란 |
| J2 COTTAGE_GAMES 필드 오기재 | PS2 scripts/ untracked 항목 |
| J3 new_game 타입 누락 | |
| J4 openProfilePanel 누락 | |
| L1 cottage_is_admin 누락 | |
| DR1 DESIGN_AUDIT.md broken reference | |
