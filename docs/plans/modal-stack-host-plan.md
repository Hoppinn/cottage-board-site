# Modal Stack Host 리팩터링 Plan

상태: portal·topmost close guard·profile wizard child 이관은 실제 회귀(흰 화면)를 받아 rollback 완료 / B는 실제 화면 해결 확인 / A는 실제 계측·최소 CSS 수정 후 실제 화면 해결 확인

계측 정본: [Modal Stack A/B 계측 Plan](modal-stack-ab-measurement-plan.md), 실제 실패·측정 결과는 [DEBUGGING_HISTORY.md](../DEBUGGING_HISTORY.md). portal/fixed 같은 공통 구조 변경은 측정 전 다시 시도하지 않는다.

### A 확정 결과

`홈 → 프로필페이지 미리보기 → 내 보드`에서 Host layer/shell은 append 순간부터 표준 rect였고, iframe 내부 `.profile-panel-box.center-modal-shell`만 기존 독립 modal의 `10px / 36px / 12px` outer 좌표를 다시 적용하고 있었다. `guide-child-mode`에서 이 panel을 `inset:0; width:auto; height:auto`로 iframe 전체에 맞춰 Host shell만 outer geometry를 소유하게 했으며, 사용자가 실제 화면에서 우하단 시작 제거를 확인했다.

## 2026-09-08 정책 전환: drill-down과 독립 overlay 분리

현재 host는 모든 `push()`에 공통 ←를 붙여, 서로 다른 기능 modal도 뒤로가기 흐름으로 취급한다. 이 정책 전환은 host를 폐기하지 않고 frame 배열·top source 검증·inert·단일 backdrop·DOM 보존은 그대로 재사용한다. 각 entry에 `presentation: 'drilldown'|'overlay'`만 추가한다.

| 분류 | 대상 route | top chrome / 종료 |
|---|---|---|
| drill-down | `game-info → game-location`, `game-info → game-rule` | 좌상단 ←, `pop()`으로 이전 게임정보 복귀 |
| 독립 overlay | `recommend-all → game-info`, `game-location → game-info`, 플래너 보기·홈페이지 기능·모임원 프로필 root에서 여는 `game-info`/`game-record`/`recommend-all`/`meeting`/`profile` | 우상단 ×, `pop()`으로 현재 top frame만 닫아 아래 frame 복귀 |

내 보드의 프로필 보드·모임 보드 등은 `profile` iframe **안**에서 유지되는 기존 local navigation이다. profile overlay 자체의 ×는 현재 modal stack 전체를 종료하고, 보드 내부 ←는 내 보드로만 복귀한다.

### 구현 Plan

읽을 파일: `assets/js/modal-stack-host.js`, `assets/js/header.js`, `assets/js/game-sheet.js`, `assets/js/day-detail.js`, `assets/js/index-page.js`, `assets/js/kakao-auth.js`, `assets/css/style.css`, `docs/js-api.md`, `docs/PROJECT_STRUCTURE.md`, `docs/DESIGN_RULES.md`, `docs/PROJECT_STATE.md`.

변경할 대상:

1. `ModalStackHost.push(kind,payload)` → `push(kind,payload,presentation)`으로 확장한다. 같은 frame layer/shell/iframe, top source 검증, inert, active-view token, pop DOM 보존을 재사용한다. `drilldown`은 ← 버튼만, 기본 `overlay`는 × 버튼만 생성한다.
2. `window.CottageModalStack.request(kind,payload)` → 선택적 세 번째 인자 `{ presentation }`을 받고 push message에 전달한다. 기존 두 인자 호출은 모두 `overlay`가 기본이다. `pop()`은 이름을 유지해 ←·ESC·host ×가 최상단 한 장만 복귀하게 한다.
3. `openShelfSheet()`와 `_openRuleHubModal()`만 명시적으로 `drilldown` 요청으로 바꾼다. 나머지 기존 request 호출은 기본 overlay로 남긴다. 특히 `openGameSheet`, `openGameRecordSheet`, `openRecommendOverlay`, `openDateMeetingModal`, `openProfilePanel`은 별도 modal overlay다.
4. host 공통 CSS에 overlay ×만 추가한다. 표준 `.center-modal-shell` geometry·root backdrop 값·z-index·child content-fill은 바꾸지 않는다.
5. 문서의 API/구조/디자인 계약을 새 구분으로 갱신하고 state의 기존 “모두 ←” 설명을 교체한다.

새로 생성: 없음. 기존 `modal-stack-host.js`와 기존 iframe/deep-link/component를 재사용한다.

영향 파일: 위 읽을 파일 중 host/client·두 게임 drill-down caller·CSS·문서. 플래너/추천/프로필 caller는 기본값 전환이 의도대로 적용되는지 확인만 하고 개별 예외 분기를 새로 만들지 않는다.

보존: 독립 URL local modal, game-info root의 짧은 slide-up, 표준 외곽(좌우 10px·상단 36px·하단 12px·18px radius), single backdrop, quick-entry·댓글·사진·작성 보조 UI, 내 보드 내부 sub-sheet navigation.

위험요소: ×를 local close handler가 연쇄 실행하도록 두면 아래 modal까지 닫힐 수 있다. Host ×·←·ESC는 모두 `pop()`만 쓰게 분리한다. 반대로 모든 `request()`를 drill-down으로 두면 정책이 회귀한다. 기본값을 `overlay`로 두고 game-location/rule 두 caller만 명시적으로 drilldown 지정해 이를 피한다.

롤백: host의 `presentation` 처리와 두 explicit caller만 되돌리면 기존 전부-← 동작으로 복귀한다. route registry·iframe bootstrap·center shell CSS는 삭제하지 않는다.

검증: 360×640에서 (A) 게임정보→게임위치→←, (B) 게임정보→게임안내→←, (C) 전체보기→게임정보→×, (D) 플래너 보기→내 보드→프로필 보드→←→내 보드→×, (E) 플래너 보기→모임 보드→×를 확인한다. 각 단계에서 shell rect·backdrop 밝기·top-only pointer/ESC·아래 iframe scroll/state를 확인한다.

## 목표와 종료 조건

홈페이지 기능, 플래너 보기, 모임원 프로필의 embed root에서 center-modal 성격의 화면이 몇 단계로 이어져도 iframe 내부의 작은 modal을 만들지 않는다. parent Modal Stack Host가 같은 viewport center shell의 iframe frame을 push/pop하고, pop 뒤 직전 frame의 DOM·scroll·상태를 보존한다. 게임정보의 하위 상세만 ← drill-down으로, 별도 기능 modal은 × overlay로 구분한다.

## 현재 임시 구조와 문제

- `pages/info/guide.html`은 `guideChildOpen` boolean과 `#guideChildFrame` 한 장만 소유한다. root iframe만 `cottage-guide-child-open`을 보낼 수 있어 child의 child 요청을 받을 수 없다.
- `assets/js/game-sheet.js`, `assets/js/index-page.js`, `assets/js/day-detail.js`, `assets/js/kakao-auth.js`는 각각 `guideStack`/`guideChild`를 직접 해석하고 서로 다른 message와 close 분기를 사용한다.
- `index.html`의 플래너 보기 (`#plannerSheetModal`)와 모임원 프로필 (`#memberProfilesModal`)은 guide host와 독립적인 iframe modal이므로 같은 child 위임 계약을 받지 못한다.
- 그 결과 전체보기→게임정보의 pop이 전체보기를 보존하지 못하고, 게임정보→게임위치 및 플래너/모임조율→보드가 iframe 내부 modal로 회귀한다.

## 소유 파일과 책임

| 대상 | 책임 |
|---|---|
| `assets/js/modal-stack-host.js` (신규) | 공통 parent host 엔진, frame 배열, route registry, push/pop, source 검증, child inert, child active-view token, parent ESC 처리 |
| `assets/js/header.js` | 모든 embed frame의 공통 client: `modalStack=1` URL 상태 파싱, `cottage-modal-stack-push`/`cottage-modal-stack-pop` message, child 첫 paint class 및 child ESC 전달 |
| `pages/info/guide.html` | 홈페이지 기능 root host 등록. 기존 1장 child DOM/message handler 제거 후 공통 host 사용 |
| `assets/js/index-page.js` | 플래너 보기·모임원 프로필 root host 등록, 추천 전체보기의 임시 guide 분기 제거, 기존 root close/ESC가 child stack을 건너뛰지 않도록 host에 위임 |
| `assets/js/game-sheet.js` | 게임정보/기록 open, 게임위치, 게임안내가 stack client 요청을 사용. 독립 URL의 기존 local sheet 유지 |
| `assets/js/day-detail.js` | 모임 조율 open이 stack client 요청을 사용. quick-entry 등 제외 |
| `assets/js/kakao-auth.js` | 내 보드·회원/모임 보드 open이 stack client 요청을 사용. 작은 profile subsheet·작성 UI는 승격하지 않음 |
| `pages/club/club-schedule.html` | 기존 `guideChild` deep-link bootstrap을 일반 `stackKind` bootstrap으로 이관 |
| `assets/css/style.css` | 기존 확정 center shell/backdrop을 유지한 공통 frame-layer와 stack child content-fill 규칙만 제공 |

## 공통 API / 메시지 계약

`window.CottageModalStack` (header client, iframe에서만 동작):

```js
request(kind, payload, { presentation }?) // 기본 overlay, drilldown만 ← frame으로 push
pop()                  // child frame이면 parent에 최상단 pop 요청 후 true
state()                // { enabled, frame: 'root'|'child', kind, payload }
```

iframe → parent: `{ type: 'cottage-modal-stack-push', kind, payload }` / `{ type: 'cottage-modal-stack-pop' }`.

parent host는 message source가 현재 top frame의 `contentWindow`인 경우에만 처리한다. 이는 아래 frame의 stale event와 외부 frame 요청을 막는다.

## kind → 기존 화면/deep-link 매핑

| kind | parent-level child iframe | presentation | 기존 재사용 bootstrap |
|---|---|---|
| `recommend-all` | `index.html` | overlay | `stackKind=recommend-all` → 기존 `openRecommendOverlay()` |
| `game-info` | `index.html` | overlay | `stackKind=game-info&game=` → 기존 `openGameSheet()` |
| `game-record` | `pages/game/game-reviews.html` | overlay | `stackKind=game-record&game=` → 기존 기록 open 함수 |
| `game-location` | `pages/game/game-location.html` | drilldown | 기존 location 페이지의 `highlight=` deep-link |
| `game-rule` | `index.html` | drilldown | `stackKind=game-rule&game=` → 기존 game rule hub open 함수 |
| `meeting` | `pages/club/club-schedule.html` | overlay | `stackKind=meeting&date=` → 기존 `openDateMeetingModal()` |
| `profile` | `index.html` | overlay | `stackKind=profile&user=&subsheet=&readonly=` → 기존 `openProfilePanel()` |

새 화면 복제는 하지 않는다. `game-rule`/`profile`처럼 원래 overlay component인 경우에도 parent의 새 iframe frame 안에서 기존 component를 content-only로 열며, parent shell 외곽은 하나만 소유한다.

## 이관 순서와 제거 대상

1. 공통 host/client와 route registry를 추가하고 guide root만 host로 이관한다.
2. 게임정보·추천 전체보기·모임 조율·프로필 open 함수를 공통 `request()`로 이관한다.
3. stackKind bootstrap을 각 기존 화면에 추가하고 depth 2/3 경로를 연결한다.
4. 플래너 보기와 모임원 프로필 root에 같은 host 엔진을 등록한다.
5. 기존 `guideStack`, `guideChild`, `guideChildOpen`, `cottage-guide-child-open/close`, 기능별 `_requestGuide...` / `_closeGuide...` 분기를 제거한다.

각 이관 뒤 기존 독립 URL은 `modalStack=1`이 없으므로 local modal 구현을 유지한다.

## active-view / ESC / backdrop / inert

- root active-view token은 기존 root modal 소유자가 그대로 관리한다.
- host가 push한 child는 kind별 기존 active-view key를 host 문서에서 push하고 pop 때 같은 token을 pop한다. embed frame 자체의 중복 추적은 기존 iframe guard를 유지한다.
- host는 push 전에 이전 top shell/iframe에 `inert`, `aria-hidden`, `pointer-events:none`을 적용하고, pop 때만 복구한다. frame DOM을 제거하지 않아 scroll/state가 보존된다.
- child iframe의 header client capture ESC는 pop message를 보낸다. parent ESC도 depth>0일 때 top 하나만 pop한다. drilldown의 ←와 overlay의 ×도 top-one pop이다.
- backdrop은 root overlay가 한 장만 렌더한다. child layer에는 transparent backdrop을 두지 않고 shell만 덮는다.

## 영향 파일 / 보존 동작

읽을 파일: `pages/info/guide.html`, `index.html`, `assets/js/index-page.js`, `assets/js/header.js`, `assets/js/game-sheet.js`, `assets/js/day-detail.js`, `assets/js/kakao-auth.js`, `pages/club/club-schedule.html`, `assets/css/style.css`, `docs/js-api.md`.

변경할 대상: 기존 guide 전용 message/1장 child → 공통 host/client. 새로 생성: `assets/js/modal-stack-host.js` (여러 root가 같은 stack lifecycle을 공유해야 하므로 필요).

보존: 표준 center shell 규격, backdrop 값/위치, 게임정보 root slide-up, 독립 URL local modal, quick-entry/등록/수정/댓글/사진/날짜선택 등 작은 UI.

## 회귀 위험과 검증

- 가장 높은 위험: 기존 플래너 quick-entry와 day-detail 전용 planner modal을 center child로 잘못 승격하는 경우. 이들은 request 대상에서 제외한다.
- 두 번째: profile의 board subsheet와 active-view/backTo 동작. profile child frame의 외곽만 host로 승격하고 내부 보드 데이터/동작은 재사용한다.
- 세 번째: root close/ESC listener가 child가 열린 상태에서 서로 다른 종료 의미를 섞는 경우. root close는 root 소유자가 처리하고, Host overlay ×·←·ESC는 `pop()`만 실행한다.

브라우저가 가능하면 360×640에서 다음을 실제 측정한다: 각 depth shell `getBoundingClientRect()`, backdrop computed background, 아래 frame pointer 차단, depth 2/3의 pop sequence 및 이전 iframe scroll/state. 브라우저 자동화 불가 시 코드 구현 완료와 실제 렌더 검증 미완료를 분리해 수동 경로를 제공한다.
