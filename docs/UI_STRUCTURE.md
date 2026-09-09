# UI_STRUCTURE — UI 구조 inventory

최종 조사: 2026-09-09

이 문서는 코티지보드 주요 UI가 실제로 올라가는 layer, 렌더 방식, 부모·자식 관계, geometry/scroll/chrome 소유자를 등록하는 구조 정본이다. UX 정책이나 CSS 값의 정본이 아니며, 한 화면은 여러 구조 그룹에 동시에 속할 수 있다.

## 조사 기준과 상태 표기

- **코드 확인**은 현재 HTML, JS 호출, 생성 DOM, CSS selector를 대조했다. 문서의 과거 설명은 보조 증거로만 썼다.
- **runtime 확인됨**은 2026-09-09 Modal Stack postmortem에서 실제 화면/rect로 확인된 경로만 뜻한다. 나머지 `코드 확인됨 / runtime 필요`는 이번 inventory에서 런타임을 추측으로 채우지 않았다는 뜻이다.
- **geometry owner**는 가장 바깥 position, size, inset을 결정하는 주체다. child가 동일한 geometry를 다시 적용하면 `중복`으로 표시한다.
- `body.guide-child-mode`는 Modal Stack child iframe에만 붙는 legacy compatibility class다. 실제 공통 CSS 경계는 `header.js`가 child `body`와 renderer node에 붙이는 `data-ui-*` marker다.

## 구조 축의 실제 타입

| 축 | 현재 확인된 타입 |
|---|---|
| Outer container / layer | standalone/root page, root center-modal, root iframe modal, Modal Stack Host child frame, root modal 내부 local overlay, profile local subsheet, bottom-sheet-style local overlay |
| Rendering method | same-document static/renderer, iframe document, iframe 안에서 기존 renderer 재사용, local component/subsheet, 기존 page DOM 재사용 |
| Parent / child | root, Host independent child frame, Host drilldown child frame, root modal 내부 local overlay, profile local navigation child, standalone |
| Geometry owner | viewport root overlay/shell, Modal Stack Host shell, profile parent panel, local overlay box; Host child mode에서는 child가 outer geometry를 다시 소유하지 않아야 함 |
| Surface geometry owner / context | the immediate iframe owner supplies a canonical surface's available coordinate area only when that surface explicitly opts in, without changing the preserved parent outer geometry. `profile-panel` may use that full available owner. An Independent Overlay `game-sheet` opened from a Host child is rendered by the already-open ancestor document, so it is not clipped by the preserved child iframe or its parent modal content box. |
| Functional renderer / surface | feature-owned renderer type is independent from geometry owner. `game-info`/record/location/rule use `game-sheet`; profile uses `profile-panel`; meeting-adjust uses `meeting-adjust`. Each canonical local surface is rendered by the already-open document in every parent context, and its local close never pops the preserved parent frame. The parent owns only its outer context; `meeting-adjust` keeps its compact variant. |
| Scroll owner | page document, component body/list, iframe document, profile `.profile-subsheet-body`; 코드만으로 확정할 수 없는 nested/quick-entry 경로는 runtime verification 필요 |
| Chrome owner | standalone page header, root modal/local component, Modal Stack Host, profile parent/subsheet header. Host iframe child에는 Host chrome과 child chrome이 공존할 수 있음 |

## 화면 mapping

`구현 상태`는 현재 코드 경로의 상태다. `active`는 호출 가능한 현재 경로, `dual`은 Host 경로와 기존 local 경로를 모두 가진 경우, `legacy/local fallback`은 Host 밖에서 유지되는 기존 구조다.

| UI 이름 | entry / source | outer container / layer | rendering method / iframe | parent UI | geometry owner (child 재적용) | scroll owner | chrome owner | 관련 DOM selector | 관련 JS open / bootstrap | 구현 상태 | runtime verification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 홈페이지 | `/index.html` | standalone/root page | same DOM | root | page layout | document | site header | `main`, `#recommend` | `index-page.js` init | active | 코드 확인됨 / runtime 필요 |
| 추천게임찾기 | 홈 `#openRecommendModal`, 메뉴 | root page 안 local recommendation UI | same DOM | 홈페이지 | `#recommend`/page layout | document | site header와 recommendation controls | `#recommend`, `#recommendModal` | `openRecommendModal()`, `openRecommendSectionOnTab()` | active local | 코드 확인됨 / runtime 필요 |
| 게임 더 찾기 | 홈 추천 카드의 더보기 | root center-modal 또는 Host child | existing `#recommendOverlay` renderer; Host면 child iframe `index.html` | 홈페이지 또는 홈페이지 기능 root | local은 `.recommend-overlay-panel`; Host면 `.modal-stack-frame-shell` (child panel fill) | `.recommend-overlay-list` | local header/close, Host에서는 Host × + child 기능 header | `#recommendOverlay`, `.recommend-overlay-panel`, `.recommend-overlay-list` | `openRecommendOverlay()`, `stackKind=recommend-all` | dual | 코드 확인됨 / runtime 필요 |
| 추천 전체보기 | 추천게임찾기에서 전체 목록 | 위와 동일 | 위와 동일 | 홈페이지 또는 Host root | 위와 동일 | `.recommend-overlay-list` | 위와 동일 | 위와 동일 | `openRecommendOverlay()` | dual | 코드 확인됨 / runtime 필요 |
| 홈페이지 기능 modal | `pages/info/guide.html` 기능 카드 | root iframe modal + Modal Stack Host root | iframe document (`#guideIframe`) | standalone guide page | `.guide-iframe-shell`; child는 Host shell | root iframe document | guide wrapper ×; Host child는 Host ←/× | `#guideIframeOverlay`, `.guide-iframe-shell`, `#guideIframe` | `openGuideOverlay()`, `CottageModalStackHost.create()` | active | 코드 확인됨 / runtime 필요 |
| 게임정보 | 카드/검색/기록 등에서 게임 클릭 | local `game-sheet` bottom sheet | canonical existing `openGameSheet()` renderer in the current document | standalone page, root modal, 또는 Host root child document | `.game-sheet-panel` local functional surface; Host does not create a child frame for it | `.game-sheet-scroll` | existing game-sheet close/sticky functional chrome | `#gameSheet`, `.game-sheet-panel`, `.game-sheet-scroll` | `openGameSheet()` | canonical local | 코드 확인됨 / runtime 필요 |
| 게임위치 | 게임정보의 위치 버튼 | local game-sheet child iframe overlay | existing `openShelfSheet()` flow | 게임정보 | `.shelf-sheet-box` local functional surface | iframe document (exact scrolling element runtime 필요) | existing local ← | `#shelfSheetOverlay`, `.shelf-sheet-box`, `.shelf-sheet-iframe` | `openShelfSheet()`, `openGame()` message | canonical local | 코드 확인됨 / runtime 필요; auto-focus/scroll은 NEXT 이슈 |
| 게임안내 | 게임정보의 rule/error/photo action | local overlay | existing `_openRuleHubModal()` flow | 게임정보 | `.rule-hub-box` local functional surface | `.rule-hub-scroll` | existing local ← | `#ruleHubModal`, `.rule-hub-box`, `.rule-hub-scroll` | `_openRuleHubModal()` | canonical local | 코드 확인됨 / runtime 필요 |
| 플레이기록 (홈) | 홈 기록/입력 entry | root iframe modal | iframe `pages/game/game-reviews.html` | 홈페이지 | `.record-iframe-panel` root shell | iframe document; local overlays vary | root `.record-iframe-close`; iframe-local overlay chrome remains local | `#recordIframeModal`, `.record-iframe-panel`, `#recordIframeFrame` | `openModal('records'|'input')` | active local iframe modal | 코드 확인됨 / runtime 필요 |
| 게임기록 (독립 페이지) | `/pages/game/game-reviews.html` | standalone/root page | same document, may be embedded as above | root or 홈 iframe | page layout / parent iframe shell | page document | standalone header; iframe parent close | `.inner-page`, `.game-sheet-panel` | `game-reviews.js`, `openGameRecordSheet()` | active | 코드 확인됨 / runtime 필요 |
| 게임기록 상세 | 게임기록 item/thumbnail | local `game-sheet` bottom sheet | canonical existing `openGameRecordSheet()` renderer in the current document | 게임기록 | `.game-sheet-panel` local functional surface | game sheet scroll area | local game sheet close | `.game-sheet`, `.game-sheet-panel` | `openGameRecordSheet()` | canonical local | 코드 확인됨 / runtime 필요 |
| 내 보드 | header/login/profile entry | local profile panel over its current document | canonical local `openProfilePanel()` renderer; no Host child document | standalone page, planner/member-profile/guide root context | `.profile-panel-box` is feature layout; immediate parent provides available surface context | `.profile-panel-body` | local `.profile-panel-close`; parent outer × remains parent-owned | `#profilePanel`, `.profile-panel`, `.profile-panel-box`, `.profile-panel-body` | `openProfilePanel()` | canonical local | code confirmed; user speed/visual verification needed |
| 프로필 보드 | 내 보드 카드 | profile local subsheet | local component | 내 보드 | `.profile-subsheet-box`; Host child mode fills Host frame, remains local navigation | `.profile-subsheet-body` | profile subsheet ←; its close is hidden in Host child mode | `#profileSubSheet`, `.profile-subsheet-box`, `.profile-subsheet-body` | `_openSubSheet('프로필 보드', ...)` | active local navigation | 코드 확인됨 / runtime 필요 |
| 모임 보드 | 내 보드 카드 / member profile route | profile local subsheet | local component | 내 보드 or read-only member board | same as 프로필 보드 | `.profile-subsheet-body` | same as 프로필 보드 | same selectors | `_openSubSheet('모임 보드', ...)`, `openOtherMeetingSheet()` | active local navigation | 코드 확인됨 / runtime 필요; overscroll is NEXT |
| 모임원 프로필 | 홈 모임원 보기 | root iframe modal + Modal Stack Host root | iframe `pages/club/club-intro.html` | 홈페이지 | `.record-iframe-panel`; Host child frame for stack requests | root iframe document | parent `#memberProfilesClose`; when wizard open it delegates to child | `#memberProfilesModal`, `#memberProfilesFrame`, `#memberProfilesClose` | member-profile modal init, `CottageModalStackHost.create()` | active Host root | root X → wizard close delegation **runtime 확인됨** per 2026-09-09 state |
| 프로필 작성/수정 wizard | 모임원 프로필 iframe entry | iframe-internal local layer | local component in `club-intro.html` | 모임원 프로필 root iframe | `.intro-wizard` local container (not promoted to Host frame) | `.intro-wizard-body` (`min-height:0`, `overflow-y:auto`, `overscroll-behavior:contain`); open 동안 root `html/body` is locked | iframe wizard close; parent X delegates while wizard open | `.intro-wizard`, `.intro-wizard-body`, `.intro-wizard-close` | `cottage-profile-wizard-state`, `cottage-close-profile-wizard` messages | active local exception | runtime close delegation 확인됨; lower-boundary root-scroll lock user verification needed |
| 모임 플래너 (홈) | `#openPlannerBtn` / quick entry | root iframe modal + Modal Stack Host root | iframe `pages/club/club-schedule.html` | 홈페이지 | `.planner-sheet-panel`; Host children use Host shell | iframe document / local planner sheets need runtime split | root `#plannerSheetClose`; Host child Host ×/← | `#plannerSheetModal`, `.planner-sheet-panel`, `#plannerSheetFrame` | `initPlannerModal()`, `__openPlannerFor()`, `CottageModalStackHost.create()` | active Host root | 코드 확인됨 / runtime 필요 |
| 모임 조율 | planner day/detail entry | local compact `dd` overlay in the current planner document | canonical local `openDateMeetingModal()` renderer; no Host child document | standalone planner or planner root context | feature-owned `.dd-meeting-modal` keeps compact variant; parent supplies only available context | local modal body (runtime selector needed) | local `.dd-x-btn`; planner outer × remains parent-owned | `#__ddModal`, `.dd-overlay`, `.dd-meeting-modal` | `openDateMeetingModal()` | canonical local | code confirmed; user compact geometry verification needed |
| 모임 플래너 (독립/quick entry) | day-detail 등록/수정 action | local root iframe modal | iframe `club-schedule.html?embed=true` | current page/day detail; explicitly not a Host child route | `#__plannerModal .planner-modal-box` | planner iframe document; local registration sheet needs runtime split | `.planner-modal-close`; quick entry hides it | `#__plannerModal`, `.planner-modal-box`, `.planner-modal-frame` | `openPlannerModal()` | active legacy/local fallback | 코드 확인됨 / runtime 필요 |

## Modal Stack Host frame registry

`assets/js/modal-stack-host.js` route registry is the complete current Host child set. The three current root hosts are homepage functionality modal, homepage planner modal, and homepage member-profile modal. Each child is a sibling iframe frame appended to the root host container; the former top frame becomes inert and remains in DOM.

| frame kind | iframe source | normal presentation in code | existing renderer reused | structure notes |
|---|---|---|---|---|
| `recommend-all` | `index.html` | overlay | `openRecommendOverlay()` | child content-only overlay; Host owns outer ×/geometry |

## Structure groups

### Standalone/root document

- 홈페이지
- 추천게임찾기 (홈 same-DOM section/modal)
- 게임기록 독립 페이지
- 게임 위치 독립 페이지
- 모임 플래너 독립 페이지

These are document/root-layout owners unless embedded by another structure.

### Root iframe modal + Modal Stack Host root

- 홈페이지 기능 modal (`guide.html`)
- 홈 모임 플래너
- 홈 모임원 프로필

All use a root iframe and create a Host. Their root shell remains the outer geometry owner; Host owns only pushed child frames and does not add another backdrop.

### Root iframe modal without Modal Stack Host

- 홈 플레이기록 modal

It has a root iframe and its own close/lightbox coordination, but current code does not create `CottageModalStackHost` for it.

### Modal Stack Host child iframe

- 추천 전체보기 / 게임 더 찾기
- 모임 조율
- 내 보드 / read-only member board

These overlap with the iframe-document group. Their child iframe invokes an existing renderer through `stackKind`; it is not a newly copied page.

### Host overlay frame

- 추천 전체보기
- 모임 조율
- 내 보드 / read-only member board

They use Host-owned outer geometry and Host-owned ×, while their prior frame stays inert below them.

### Profile local navigation/subsheet

- 내 보드 → 프로필 보드
- 내 보드 → 모임 보드
- 내 보드 → 기록 보드
- 내 보드 → 함께한 시간 / 수집 보드 / 알림 / 교환권 / 회원 분석

This is not a Host push. It makes `#profileSubSheet`, makes the parent `#profilePanel` inert, and restores that parent on ←/ESC. When the profile panel itself is a Host child, child mode removes only duplicate outer geometry/chrome; the subsheet relationship remains local.

### Local iframe modal not currently a Host child

- 게임정보 → 게임위치 in non-stack contexts (`#shelfSheetOverlay`)
- day-detail → 모임 플래너/등록·수정 (`#__plannerModal`)
- 홈 플레이기록 modal

These use their own overlay/shell lifecycle. They must not be assumed to be equivalent to a Host child merely because their content is an iframe.

### Local same-document overlay

- 게임정보 → 게임안내 in non-stack contexts (`#ruleHubModal`)
- 게임정보 / 게임기록 local sheet
- 모임 조율 local `#__ddModal`

## Structure mismatch, legacy, and investigation candidates

| finding | evidence | classification | no-change disposition |
|---|---|---|---|
| Game information formerly had Host child routes and local sheets | `CottageModalStack.request()` now returns `false` for the `game-sheet` functional surface and Host has no game route | resolved duplicate renderer | every parent uses the existing local game-sheet flow |
| Planner has two root iframe modal owners for the same `club-schedule.html` | homepage `#plannerSheetModal` versus `day-detail.js` `#__plannerModal`; comments explicitly protect their message sources | intentional legacy/local fallback | retain; they differ in root lifecycle and quick-entry behavior |
| Profile local subsheet retains `.center-modal-shell` although it can live inside a Host child | shared `data-ui-geometry="host-fill"` neutralizes `.profile-subsheet-box` geometry | compatibility hotspot, not evidence of a second Host frame | retain; runtime-check scroll/overscroll separately |
| Root/child chrome can share physical coordinates for member-profile wizard | postmortem measured iframe `.intro-wizard-close` and parent `#memberProfilesClose`; parent now delegates while wizard open | resolved ownership exception | retain delegation; do not classify as ordinary click-through |
| Stack child iframe uses broad `guide-child-mode` name even outside guide | `header.js` adds it for every `modalFrame=child` | naming legacy / investigation candidate | no rename in this inventory |
| `game-location` child keeps page `main` | classifier marks it functional content rather than global page content | route-specific content-source distinction | retain; its source is a page main, unlike component renderers |
| Existing Host plan says host roots include three roots, while route registry has seven child kinds | source code confirms the distinction | documentation interpretation risk | this inventory separates root hosts from child kinds |

## Implemented common markers

`header.js` classifies every `modalStack=1&modalFrame=child` document before its renderer opens, then observes renderer insertion. The Host passes `stackPresentation=overlay|drilldown`; the parent shell carries the same ownership data. CSS reads these markers rather than a route class, page name, or HTML tag.

| marker | scope | contract |
|---|---|---|
| `data-ui-structure="host-child"` | child `body` | P3/P4/P5 compatibility boundary; legacy `guide-child-mode` remains only for old non-contract rules. |
| `data-ui-geometry-owner="host"` + `data-ui-geometry-variant="standard|compact"` + `data-ui-geometry="host-fill"` | Host shell, child body, reused Host child renderer box | Host is the only outer geometry owner; variant selects the Host shell shape, renderer fills iframe `0,0` and does not reapply center-modal inset/radius/shadow. |
| `data-ui-functional-surface="game-sheet"` | game child body and `.game-sheet` renderer nodes | functional surface is distinct from outer geometry. Existing game-sheet DOM retains its local geometry, chrome, scroll, and lifecycle; Host does not create a game child iframe. |
| `data-ui-surface-geometry-owner` + active `data-ui-functional-surface="game-sheet"` | root/Host iframe shell that directly contains the game-sheet document | parent/child `prepare → ready` message bridge makes this owner transparent full-available-area before the canonical surface becomes visible, so the same `position:fixed` game-sheet neither becomes a modal-inside-modal nor first paints at the old small geometry. |
| `data-ui-layer="host-transparent"` | reused local overlay/layer/backdrop | child layer can render content but does not create a second dim/blur or outer viewport geometry. |
| `data-ui-chrome="global|global-content|host-duplicate|functional"` | page chrome and renderer controls | only global/duplicate chrome is suppressed; functional header, tab, search/filter, sticky control, and profile local back remain. |
| `data-ui-flow-close-owner` + `data-ui-navigation-back-owner` + `data-ui-navigation="overlay|drilldown|local"` | Host shell/control, child body/profile local back | flow close and one-step back are independent: game flow root has X; its drilldown has ← + X; local remains inside its feature owner. |
| `data-ui-scroll-owner="feature"` + `data-ui-scroll-boundary="child"` | intended component scroll areas + child body | records the Host/child boundary without changing individual overflow or overscroll behavior. |

The concrete renderer selector list is deliberately centralised in the classifier. Host child renderers receive shared geometry/chrome/scroll roles, while the game-sheet surface is explicitly excluded from Host outer-geometry and duplicate-chrome reset so its native local flow remains intact.

## Runtime verification queue

No runtime behavior was newly asserted by this inventory. The following need same-viewport inspection before any structural rule is finalized:

- Host root and child shell rects, one backdrop, inert/pointer behavior, and one-frame pop for every current child kind.
- Scroll owner and target rects for game-location highlight/open state; this is already an open NEXT item.
- Profile subsheet scroll/overscroll ownership (`.profile-subsheet-body`, iframe document, `.profile-panel`) at the bottom boundary; this is already an open NEXT item.
- Home planner normal versus quick-entry shell/iframe scroll ownership, and the separate day-detail planner route.
- Local (non-Host) game-location/game-rule branches versus their Host routes, so a future rule does not overgeneralize from one branch.
- Profile wizard geometry and scroll while parent close delegation is active; only the close ownership result is runtime-confirmed.
