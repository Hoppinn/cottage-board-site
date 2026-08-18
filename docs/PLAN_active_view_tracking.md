# PLAN — 활성 뷰(시트/모달/iframe) 단위 체류시간 추적

작성: 2026-08-18. 사용자 요청("시트·모달도 다 마찬가지, 지금 페이지가 어디냐가 아니라 어떤 시트/모달을 보고 있는지로 카운팅해야") → 판단(안전한 쪽만 건드리는 설계 확정) → Plan. **미승인 — 실행 전 승인 대기.**

## 배경 — 왜 필요한가

지금 체류시간은 전부 `window.location.pathname` 기준이다. 그런데 실사용의 상당 시간이 **URL이 안 바뀌는 오버레이**(프로필 패널 서브시트, 게임시트, 일정 상세 모달, 플래너 바텀시트, index.html이 미리 로드하는 iframe 모달) 안에서 일어난다. 그 결과 "메인 체류가 압도적으로 길다"는 집계가 나오는데, 실제로는 사람들이 메인 화면 자체가 아니라 그 위에 뜬 플래너·내 보드·게임시트를 보고 있었을 뿐이다 — 지금 지표로는 이 둘을 구분할 수 없다.

## 설계 원칙 — 왜 이 모양인가

`profiles.today_seconds`/`total_minutes`(하루 누적 총합)는 **상태 누적값**이라 fire-and-forget 재시도와 상성이 나쁘다(2026-08-18 세션에서 실측 확인: `pagehide`에서 이 값만 못 들어가는 사고가 이미 있고, 억지로 고치려 하면 이중계상·유실 둘 중 하나를 반드시 감수해야 함 — 상세는 git log 2026-08-18 세션 대화, `_syncTimeToDBNow`의 로컬 accumulator+RPC 재시도 구조 때문).

`page_sessions`(행 추가, append-only)는 그 문제가 없다. **그래서 이번 설계는 `page_sessions`에 세분화된 `page` 값만 새로 넣고, `profiles.today_seconds`/`total_minutes`(하루 총합)는 건드리지 않는다.** 총합 지표는 그대로 정확하고, "무엇을 보고 있었나"라는 새 지표만 얻는다 — 기존 지표를 깨뜨릴 위험이 없는 쪽으로 범위를 좁힌 것.

## 변경할 대상

### 1. 핵심 API — `assets/js/supabase-client.js`

- 기존: `_syncTimeToDBNow`가 `insertPageSession=true`일 때 `page`를 `location.pathname`에서 파생([supabase-client.js:1174-1176](../assets/js/supabase-client.js#L1174-L1176)).
- 신규: 모듈 스코프에 `_activeViewStack = []` 추가. `window.CottageDB.pushActiveView(key)` / `popActiveView()` 노출.
  - `pushActiveView(key)`: 현재까지 누적된 시간을 **지금 라벨**(스택 top 또는 location 기반 기본값)로 먼저 flush(`_syncTimeToDBNow`를 페이지 오버라이드 인자와 함께 호출) → 스택에 `key` push → 타이머 리셋.
  - `popActiveView()`: 지금 라벨(=방금 push한 key)로 flush → 스택 pop → 새 top(또는 기본 페이지)으로 복귀, 타이머 리셋.
  - `_syncTimeToDBNow`에 `pageOverride` 파라미터 추가(기본값 없으면 기존 동작 그대로 — 하위호환).
  - **`profiles.today_seconds`/`total_minutes` RPC 호출은 각 flush마다 그대로 실행**(총합은 지금처럼 계속 누적, 변경 없음). 바뀌는 건 `page_sessions.page`에 들어가는 문자열뿐.
  - 중첩 시트(예: 게임시트 위에 게임위치 바텀시트, `openShelfSheet`)는 스택이라 자연히 해결 — push/push/…/pop/pop 순서만 지키면 됨.
  - iframe 경계: iframe 자신은 지금처럼 추적을 계속 끈 채로 둔다(#24 재발 방지 — 이 규칙은 안 건드림). 대신 iframe이 자기 표시 상태를 `postMessage({type:'cottage-view-active', key})` / `{type:'cottage-view-inactive'}`로 부모에 알리고, **부모(index.html)가 그 메시지를 받아 자기 `pushActiveView`/`popActiveView`를 대신 호출**한다. 실제 타이머는 항상 최상위 프레임 하나만 돈다는 원칙 유지.

### 2. 가상 페이지 키 등록 — 기존 체계 재사용

`kakao-auth.js`의 `_trackPvOnce` 가상 키(예: `other-board`, `my-board-meeting`)는 **조회수**(`page_views`)만 센다. 이번 건 **체류시간**(`page_sessions`)이라 같은 이름을 공유하되 별개 호출로 `pushActiveView`도 같이 부른다. 새 키가 필요하면(게임시트·일정상세모달 등은 지금 가상 키가 아예 없음) 다음을 신설:
  - `game-sheet` (게임시트, [game-sheet.js:595](../assets/js/game-sheet.js#L595) `openGameSheet`)
  - `game-location-shelf` (게임위치 바텀시트, [game-sheet.js:372](../assets/js/game-sheet.js#L372) `openShelfSheet`)
  - `day-detail` (일정 상세 모달, [day-detail.js:756](../assets/js/day-detail.js#L756) `openDayDetailModal`, [:1221](../assets/js/day-detail.js#L1221) `openDateMeetingModal`)
  - `planner-register` (등록/수정 바텀시트, [club-schedule.html:956](../pages/club/club-schedule.html#L956) `initScheduleSheet`, [:1064](../pages/club/club-schedule.html#L1064) `initMultiSheet`)
  - (기존 재사용) `my-board`/`other-board`/`my-board-meeting`/`my-board-growth`/`my-board-records`/`my-board-usage`/`my-board-taste`/`my-board-notif`/`my-board-voucher` — [kakao-auth.js:1959](../assets/js/kakao-auth.js#L1959), [:3007-3067](../assets/js/kakao-auth.js#L3007-L3067)

새 키는 `page-labels.js`(`COTTAGE_PAGE_LABELS`)와 `member-analytics.js`(`PAGE_KEY_ALIASES`) 양쪽에 동시 등록 — 안 하면 관리자 화면에 slug가 그대로 노출되거나(#16 재발 패턴) 회원별 집계에서 조용히 빠진다.

### 3. 호출부 배선 — 열 때 push, 닫을 때 pop

| 파일 | 함수 | push 시점 | pop 시점 |
|---|---|---|---|
| kakao-auth.js | `openProfilePanel`/`openOtherProfileSheet`/`openOtherMeetingSheet` | 패널 오픈 | 패널 닫기(기존 `closeTopLayer` 계열에 이미 있는 단일 닫기 경로에 편승) |
| kakao-auth.js | `_openSubSheet` | 서브시트 오픈 | 서브시트 뒤로가기/패널 닫기 |
| game-sheet.js | `openGameSheet`/`_openAndInitSheet` | 시트 오픈 | 시트 닫기(MutationObserver로 `.is-active` 제거 감지하는 기존 패턴 재사용) |
| game-sheet.js | `openShelfSheet` | 오버레이 오픈 | 뒤로가기/닫기 |
| day-detail.js | `openDayDetailModal`/`openDateMeetingModal`/`openDateScheduleModal` | 모달 오픈 | 모달 닫기(`closeTopLayer` 경유) |
| club-schedule.html | `initScheduleSheet`/`initMultiSheet` | 바텀시트 오픈 | 닫기/저장 후 닫힘 |
| index.html (부모) | 신규: `message` 리스너에 `cottage-view-active`/`cottage-view-inactive` 케이스 추가 | iframe이 보내는 신호 수신 시 | 동일 |

## 보존해야 할 기존 동작

- `profiles.today_seconds`/`total_minutes` 값과 계산 로직 — **절대 변경 없음** (그대로 각 flush에서 누적).
- iframe 자체 추적 차단(#24 방지 로직) — 그대로 유지, 이번 설계는 그 위에 얹는 것.
- 기존 `page_sessions` 조회부(관리자 페이지·요약 탭) — `page` 값 종류가 늘어나는 것뿐이라 집계 자체는 자동으로 세분화된다. 단 `normalizePageKey`/`PAGE_KEY_ALIASES` 미등록 시 slug 노출 위험(위 2번 항목).
- `openShelfSheet` 같은 중첩 스택 — push/pop 짝이 안 맞으면(예: 강제 종료 경로에서 pop 누락) 다음 전환까지 시간이 잘못된 키에 붙는다. 각 닫기 경로가 **정말 한 함수로 모여 있는지**(PROJECT_STRUCTURE.md §2-A 4번 원칙) 먼저 확인하고 그 자리 하나에 pop을 건다 — 여러 닫기 경로에 각각 심으면 #16류 누락 재발.

## 위험요소 — 첫 번째로 실패할 가능성이 높은 지점

1. **닫기 경로 누락으로 인한 스택 어긋남**: 어떤 시트가 ESC·배경클릭·버튼 3갈래로 닫히는데 pop을 한 곳에만 걸면, 그 경로로 닫힌 다음 사용자가 보는 다음 화면 시간이 이전 시트 이름으로 계속 잡힌다. → 착수 시 각 대상 시트의 실제 닫기 경로 개수부터 grep으로 센다.
2. **iframe postMessage 유실**: 부모가 언마운트되거나 리스너 등록 전에 iframe이 신호를 보내면(기존 `_pendingEdit` 큐잉 패턴이 이미 겪은 문제) push가 누락돼 그 구간이 통째로 "메인"으로 남는다 — 완전한 실패는 아니고 기존 수준으로 회귀할 뿐이라 안전하지만, 큐잉 처리를 빠뜨리면 안 됨.
3. **가상 키 등록 누락**: `page-labels.js`/`PAGE_KEY_ALIASES` 둘 중 하나만 갱신하면 화면엔 라벨이 보이는데 회원별 집계에선 빠지는 식으로 반쪽 반영된다(#16과 동일 패턴).

## 검증 계획

- 새 스크립트(`scripts/verify-active-view-tracking.js`): `pushActiveView`/`popActiveView` eval 테스트 — 단일 push/pop, 중첩 2단 push/pop, pop 없이 다음 push(강제 전환) 3가지 케이스에서 `page_sessions` insert에 들어가는 `page` 값과 각 구간 duration 합이 전체 경과시간과 일치하는지 검증. `today_seconds` 누적값은 이번 변경으로 값이 달라지지 않아야 함(회귀 확인 — 위 "보존해야 할 기존 동작" 1번을 자동 검사로 확정).
- 실브라우저로 게임시트 열기→닫기, 프로필 패널 서브시트 이동 2~3회, 플래너 바텀시트 열기→저장 시나리오에서 관리자 페이지 「페이지」 탭에 새 가상 키가 정확한 duration으로 뜨는지 육안 확인.

## 실행 단위 — 한 세션에 다 안 되면 이렇게 자른다

1차(핵심 인프라): supabase-client.js API + page-labels.js/member-analytics.js 키 등록 + 검증 스크립트. 이것만으로는 화면 변화 없음(아무도 아직 안 부르므로) — 그래도 노드 테스트로 닫을 수 있는 독립 단위.
2차: kakao-auth.js 배선(프로필 패널류) — 사용자가 가장 자주 여는 화면이라 우선순위 최상단.
3차: game-sheet.js·day-detail.js·club-schedule.html 배선 + iframe postMessage.

각 차수 끝에 커밋 + 관리자 페이지 육안 확인 1회(Vertical slice 원칙).
