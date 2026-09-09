# UI_PATTERNS — 구조 그룹별 공통 UI 계약

최종 정리: 2026-09-09
구조 정본: [UI_STRUCTURE.md](UI_STRUCTURE.md)

이 문서는 `UI_STRUCTURE`에서 확인한 **실제 구조 그룹**에 공통 동작·소유 책임을 붙이는 장기 계약 정본이다. 화면 이름이나 특정 selector의 CSS 예외 목록이 아니다. 구현 변경이나 최종 CSS/JS API 설계는 별도 승인 작업에서 다룬다.

## 적용 방법과 경계

1. 먼저 화면의 outer layer, rendering method, parent/child 관계를 `UI_STRUCTURE` mapping에서 찾는다.
2. 그 구조 Pattern의 ownership 계약을 적용한다.
3. overlay / local navigation / drilldown 중 navigation semantics를 별도 축으로 붙인다.
4. 실제 runtime verification이 끝나지 않은 scroll·geometry 세부값은 이 문서를 근거로 확정하지 않는다.

따라서 `Host child iframe`은 구조 Pattern이고, `overlay`와 `drilldown`은 그 위에 붙는 navigation semantics/presentation이다. functional renderer/surface는 또 다른 축이다: 같은 기능은 parent가 달라도 canonical renderer를 유지한다. `game-sheet`, `profile-panel`, `meeting-adjust`는 새 Host child document가 아니라 이미 열린 document의 local surface이며, profile local subsheet는 그 안에서 local navigation을 계속 소유한다.

## 공통 용어

Canonical local surface registry는 `game-sheet`, `profile-panel`, `meeting-adjust`를 등록한다. renderer가 parent geometry를 바꾸지 않으며, 모든 registered surface는 `prepare → ready → first visible paint` handshake를 거쳐 first paint를 안정화한다. `profile-panel`은 현재 document의 기존 local panel을 재사용하고, `meeting-adjust`는 feature-owned compact variant를 유지한다. `game-sheet`는 Independent Overlay로서 parent owner를 재분류하지 않으며 Host iframe 안에서 열린 경우 ancestor document의 이미 열린 canonical renderer로 portal되어 iframe clipping 밖의 자기 geometry를 쓴다. active canonical local surface의 close/ESC는 Host frame pop보다 우선하며, 그 surface가 닫힌 뒤에만 Host-owned outer close가 frame을 닫을 수 있다. 따라서 functional renderer·surface·geometry variant·geometry owner·parent context·close owner는 별도 축이다.

| 용어 | 의미 |
|---|---|
| outer geometry | viewport 기준 position, inset, width/height, radius, overflow처럼 화면의 외곽틀을 결정하는 값 |
| inner layout | outer shell 안에서 기능 content, list, tabs, form을 배치하는 책임 |
| chrome | close/back, title, identity header처럼 화면 외곽 제어 또는 식별을 위한 UI |
| function header | search/filter/tab/sticky action처럼 기능 사용에 필요한 header. 단순 standalone page chrome과 구분한다. |
| top frame | 현재 입력(pointer/keyboard)을 받을 수 있는 최상위 layer/frame |
| local navigation | 같은 feature의 부모 화면을 DOM에 보존하고 내부 child로 전환하는 방식 |

## Navigation semantics (구조와 독립된 축)

| semantics | 상태 보존 | close/back 의미 | frame 생성 여부 | 현재 적용 예 |
|---|---|---|---|---|
| Independent Overlay | 직전 화면의 DOM·scroll·selection을 보존 | ×는 현재 top overlay/frame 하나만 닫음 | Host 안에서도 registry에 등록된 route만 new top frame이고, 그 밖에는 canonical local overlay일 수 있음 | 추천 전체보기, 게임정보, 게임기록 상세, 모임 조율, 내/회원 보드 |
| Local Navigation | feature parent를 inert/hidden 상태로 보존 | ←/ESC는 local parent 복귀; close는 feature root 종료 규칙을 따름 | Host frame 추가 없음 | 내 보드 → 프로필/모임/기록/수집 보드 |
| Drilldown | 현재 flow의 직전 단계를 보존 | ←/ESC는 직전 단계 한 단계 복귀 | 현재 게임 drilldown은 canonical local detail overlay이며 Host child frame이 아니다 | 게임정보 → 게임위치, 게임정보 → 게임안내 |

의미는 동일해도 구조는 다를 수 있다. 예를 들어 게임위치는 local iframe modal이되 Host 문맥에서는 ancestor presentation을 요청한다. 따라서 닫기 동작의 의미만 보고 geometry/backdrop owner를 복사해서는 안 된다.

## Pattern P1 — Standalone / root document

적용 그룹: `standalone/root document`.

| 책임 | owner / 계약 |
|---|---|
| outer geometry | 해당 document의 page layout |
| inner layout | 해당 page/renderer |
| scroll | document scrolling이 기본. component-specific list가 별도 scroll owner가 되면 그 component가 명시해야 한다. |
| chrome | standalone site/page chrome |
| backdrop | 없음. local modal을 열 때 그 local owner가 별도로 소유한다. |
| navigation | page router/link 또는 해당 local feature |
| close/back | browser/page navigation 또는 해당 local feature |

이 Pattern은 홈페이지, 게임기록/게임 위치/플래너의 독립 URL을 포괄한다. embed되었다고 독립 page 자체의 구조가 사라지는 것은 아니며, parent Pattern이 outer layer만 교체한다.

## Pattern P2 — Root iframe modal + Modal Stack Host root

적용 그룹: 홈페이지 기능 modal, 홈 플래너, 홈 모임원 프로필.

| 책임 | owner / 계약 |
|---|---|
| outer geometry | root modal shell (`.guide-iframe-shell`, `.planner-sheet-panel`, `.record-iframe-panel`; member-profile root shares the record iframe panel class) |
| inner layout | root iframe document와 그 기존 renderer |
| scroll | root iframe document의 intended content scroll. parent shell은 iframe viewport를 제공하며 root iframe의 content scroll을 대신 소유하지 않는다. |
| chrome | root modal owner의 root ×; Host child가 top이면 Host child chrome이 top-level action을 받는다. |
| backdrop | root modal owner가 정확히 하나 소유. Host는 child push마다 새 backdrop을 만들지 않는다. |
| navigation | root iframe의 local navigation은 root iframe에 남고, child route 요청은 Host가 수신·push한다. |
| close/back | root close는 root owner lifecycle; child가 있을 때 Host pop은 top child 한 장만 처리한다. |

Host는 root iframe을 첫 frame으로 보존하고 registry에 등록된 child frame을 sibling으로 append한다. 현재 등록된 child route는 `recommend-all` 하나다. inactive frame은 inert/`aria-hidden`이 되며, pop 뒤 DOM·scroll·selection을 복구한다.

## Pattern P3 — Modal Stack Host child iframe

**Current route scope:** `modal-stack-host.js` registers `recommend-all` as the only Host child route. `meeting-adjust`, `profile-panel`, `game-sheet`, `game-location`, and game-rule flows are canonical local surfaces; they must not be classified as P3 merely because they can be requested while a Host is open.

적용 그룹: `recommend-all` child route.

| 책임 | owner / 계약 |
|---|---|
| outer geometry | Modal Stack Host shell (`.modal-stack-frame-shell`)만 소유한다. `standard`/`compact` geometry variant는 shell 형태를 고르며 ownership과 별개다. |
| inner layout | child iframe의 기존 renderer. child renderer는 local `0,0` fill과 기능 layout만 소유한다. |
| scroll | child renderer의 intended scroll area (`.recommend-overlay-list`). Host layer/shell/iframe element를 application scroll owner로 만들지 않는다. |
| chrome | Host가 `recommend-all`의 ×를 소유한다. child의 function header는 유지할 수 있으나, duplicate outer close/title-only page chrome은 child mode에서 제거·위임한다. |
| backdrop | Host root의 단일 backdrop. child renderer는 transparent local layer만 가질 수 있고 second dim/blur를 만들지 않는다. |
| navigation | Host client `request()`가 parent Host에 child push를 요청한다. child 내부의 진짜 local navigation은 local owner에게 남긴다. |
| close/back | Host ×/ESC는 top `recommend-all` frame 하나를 처리한다. canonical local surface의 close/back는 local owner가 처리하며 Host 책임을 중복 소유하지 않는다. |

### P3 embed chrome policy

`modalFrame=child`의 `guide-child-mode`는 legacy compatibility class다. `header.js`가 child body/renderer에 붙이는 `data-ui-*` marker가 실제 CSS hook이며, 다음은 tag 이름으로 숨기는 규칙이 아니라 **역할** 기준이다.

숨길/위임할 대상:

- global site header/footer, breadcrumb, hero, standalone page title처럼 direct URL에서만 outer chrome인 요소
- reused renderer의 independent center-modal inset/backdrop/outer close
- Host top control과 역할이 같은 local ×/← 또는 title-only chrome

유지할 대상:

- 실제 기능 content
- 기능 header, tab, search/filter, sticky function control
- 사용자 identity나 보드 상태처럼 feature 자체를 식별하는 header

현재 구현은 `data-ui-chrome="global|global-content|host-duplicate"`만 숨기고, `data-ui-chrome="functional"`은 유지한다. 현재 `recommend-all` Host renderer가 `data-ui-geometry="host-fill"`과 `data-ui-layer="host-transparent"`으로 content-only가 된다. classifier의 일반 marker는 future route registry가 아니다. `data-ui-functional-surface="game-sheet"`은 이 reset에서 제외된다. 게임정보/기록/위치/안내는 Host route가 아니라 현재 document의 native game-sheet flow이므로 local chrome과 scroll owner를 유지한다.

### P3 geometry invariant

Parent/Host가 outer geometry를 소유하면 child는 같은 center-modal inset, fixed position, width/height, radius, backdrop를 다시 적용하지 않는다. child renderer의 box는 iframe `0,0`을 채운다. 현재 이 Host child geometry 계약의 적용 route는 `recommend-all`이다.

### P3-A functional surface presentation owner

Geometry owner와 presentation/layer owner는 별도다. geometry owner는 surface rect와 variant를, presentation document owner는 그 surface를 실제로 생성할 document를 정한다. presentation stack position은 그 document 안에서 requesting Host surface에 대한 순서를 정한다. `header.js`의 canonical functional-surface registry에서 `presentationOwner: 'ancestor'`인 surface는 Host iframe 안에서 열릴 때 `CottageFunctionalSurface.requestAncestor()`로 이미 로드된 ancestor document의 같은 canonical renderer에 요청한다. parent Host shell은 preserve 상태로 남는다.

- `game-sheet`, `profile-panel`, `game-location`은 현재 ancestor presentation owner를 가진다. renderer는 각각 기존 `openGameSheet()`, `openProfilePanel()`, `openShelfSheet()`이며 Host 전용 renderer/document를 만들지 않는다.
- `game-sheet`, `profile-panel`, `game-location`은 `presentationStack: 'above-requesting-host'`도 가진다. `ModalStackHost`의 semantic layer owner에서 실제 z-index를 읽어 바로 한 단계 위에만 표시한다. profile의 `_openSubSheet()`는 body sibling local overlay이므로 portal된 panel의 relative layer를 한 단계 이어받는다. 모든 ancestor surface를 topmost로 올리거나 고정 큰 z-index를 쓰지 않는다.
- standalone 또는 일반 local context에서는 요청하지 않고 기존 local renderer/layer를 유지한다.
- iframe 안의 `position: fixed`는 iframe viewport 밖으로 나갈 수 없다. child를 크게 보이게 하려고 parent geometry owner를 `available`/fullscreen으로 바꾸는 것은 금지한다.

### P3-B presentation stack inheritance

child presentation surface는 독립적인 전역 `z-index`(예: `9200`, `9500`, `9999`)를 선택하지 않는다. requesting Host의 실제 presentation layer를 기준으로 바로 위 local layer를 계산·상속한다. 이는 geometry owner를 바꾸거나 Host frame을 하나 더 만드는 규칙이 아니다.

- canonical `#profilePanel`은 requesting Host 바로 위에 표시한다. ancestor document로 portal되어도 panel 자체와 기존 dim/panel/scroll tree를 재사용한다.
- DOM상 `body` sibling인 `#profileSubSheet`는 `_openSubSheet()`에서 active profile panel의 inherited local layer보다 한 단계 위에 표시한다. 프로필·모임·기록·수집·알림 등 모든 subsheet가 이 경로를 공유하며, subsheet를 Host modal/frame으로 승격하지 않는다.
- `game-sheet`와 `game-location`도 ancestor presentation stack을 받아 requesting Host 바로 위에서 기존 renderer를 연다.
- `←`, `×`, ESC와 profile local navigation은 기존 owner가 계속 처리한다. 보이는 순서 문제를 새 상태관리·route별 z-index·topmost escalation으로 우회하지 않는다.

## Pattern P4 — Host overlay frame

**Current route scope:** the only current P4 frame is `recommend-all`. The table describes the Host overlay contract for that registered route; it is not evidence that profile, meeting, or game surfaces are Host frames.

P3 child 중 `presentation: 'overlay'`가 붙는 frame이다. 현재 registry에서 그 route는 `recommend-all`뿐이다.

| 책임 | owner / 계약 |
|---|---|
| outer geometry / backdrop / top interaction | Host standard or compact shell variant |
| inner layout / intended scroll | child renderer |
| chrome | Host ×; child function header는 필요하면 유지 |
| navigation | Independent Overlay |
| close/back | ×/ESC = top `recommend-all` frame one-pop. root modal 전체 close나 canonical local parent navigation으로 해석하지 않는다. |

현재 대상: 추천 전체보기 (`recommend-all`).

## Pattern P5 — Host drilldown frame (no current route)

No Host child route currently uses `presentation: 'drilldown'`. Game location and game guide retain their existing local drilldown/navigation owners; a future Host drilldown requires an explicit registry change and must not be inferred from similar UX.

P3 child 중 `presentation: 'drilldown'`이 붙는 frame을 설명하는 예약 Pattern이다. 현재 적용 route는 없다.

| 책임 | owner / 계약 |
|---|---|
| outer geometry / backdrop / top interaction | Host standard or compact shell variant |
| inner layout / intended scroll | child renderer |
| chrome | 향후 승인된 Host drilldown에서만 Host ← for one-step navigation을 사용한다. 현재 game flow에는 적용하지 않는다. |
| navigation | Drilldown |
| close/back | 향후 승인된 Host drilldown에서만 ←/ESC = 직전 Host frame 한 단계 pop이다. |

현재 대상은 없다. 게임정보 → 게임위치와 게임정보 → 게임안내는 `openShelfSheet()`와 `_openRuleHubModal()`이 소유하는 local drilldown이다.

## Pattern P6 — Profile local subsheet navigation

적용 그룹: 내 보드/회원 보드의 profile, meeting, record, usage, collection, notification, voucher, admin subsheet.

| 책임 | owner / 계약 |
|---|---|
| outer geometry | profile feature. local `.profile-subsheet-box`가 root/profile context의 outer frame을 사용한다. profile panel은 Host child route가 아니며, Host 문맥에서는 ancestor presentation으로 portal된 local panel geometry를 유지한다. |
| inner layout | each subsheet renderer |
| scroll | `.profile-subsheet-body`가 intended main scroll owner. flex scroll child는 `min-height: 0`을 유지해야 하며 sticky header 기준은 이 body다. |
| chrome | profile subsheet header: local identity/back control; identity/back semantics을 보존하며 Host child mode로 바꾸지 않는다. |
| backdrop | local profile layer. Host 문맥에서도 parent Host backdrop을 다시 만들지 않으며 local subsheet background is transparent. |
| navigation | profile feature owner. `_openSubSheet()`가 parent `#profilePanel`을 inert로 보존한다. |
| close/back | ←/ESC = local parent panel restore; subsheet × = profile root close path. Host frame pop으로 승격하지 않는다. |

### P6 scroll contract

- `.profile-subsheet-body`가 scrollable area여야 하며 outer panel/iframe/body가 경쟁 scroll owner가 되지 않아야 한다.
- `overscroll-behavior: contain`은 local body 끝에서 parent profile/iframe으로 scroll chaining을 막아야 하는 subsheet에만 적용한다.
- 실제 bottom-boundary issue의 element/chain은 아직 runtime 확인 전이다. 그러므로 이 문서는 selector 추가나 global overscroll 변경을 확정하지 않는다.

## Pattern P7 — Local iframe modal

적용 그룹: non-stack 게임위치 sheet, day-detail의 `#__plannerModal`, 홈 플레이기록 modal.

| 책임 | owner / 계약 |
|---|---|
| outer geometry | local modal owner (`.shelf-sheet-box`, `.planner-modal-box`, `.record-iframe-panel`) |
| inner layout | iframe document |
| scroll | iframe document의 intended content scroll. outer modal box is viewport/clip owner, not feature-list scroll owner. |
| chrome | local modal owner. iframe-local feature chrome remains local unless an explicit parent-child delegation exists. |
| backdrop | local modal owner, one per local modal lifecycle |
| navigation | local owner ↔ iframe message contract or iframe-local navigation |
| close/back | local owner handler. Host push/pop is not implied by iframe status. |

The day-detail planner and homepage planner share an iframe source but are not interchangeable: they have different root owners, message source guards, and quick-entry lifecycle.

## Pattern P8 — Local same-document overlay

적용 그룹: non-stack 게임안내 (`#ruleHubModal`), local game sheet/record sheet, local 모임 조율 (`#__ddModal`).

| 책임 | owner / 계약 |
|---|---|
| outer geometry | local overlay/box renderer |
| inner layout | same-document component |
| scroll | component-specific body/list; the renderer must name and preserve its intended owner |
| chrome | local overlay renderer |
| backdrop | local overlay renderer; parent sheet/panel is made inert where the component creates a child layer |
| navigation | local overlay or Drilldown semantics, depending on caller |
| close/back | component local handler; no Host behavior unless `CottageModalStack.request()` has already intercepted the open call |

## Scroll ownership rules across Patterns

| Pattern | intended main scroll | chaining | sticky reference | flex requirement | verification boundary |
|---|---|---|---|---|---|
| P1 standalone/root | document unless page declares a local list/body | normal page behavior unless component intentionally contains it | actual page/document scroll owner | local flex scrollers need `min-height:0` | inspect per page before changing |
| P2 Host root iframe | root iframe document | root shell does not consume feature scroll | root iframe's actual scroll owner | iframe content owns its own flex contract | runtime verify root iframe versus child transitions |
| P3/P4 Host child | child functional scroll area | no parent Host scroll handoff; child-local containment only when the component requires it | child functional scroll area | child flex scroll area must remain shrinkable | measure child document/body/component, not Host shell alone |
| P6 profile subsheet | `.profile-subsheet-body` | contain at the subsheet body when verified | `.profile-subsheet-body` | required: `min-height:0` on flex scroll child | bottom overscroll remains runtime work |
| P7 local iframe modal | iframe document | parent box clips but does not become application scroll | iframe's actual owner | iframe content owns it | inspect normal and quick-entry branches separately |
| P8 local same-document overlay | component body/list | local owner decides; do not leak into inert parent | component scroll owner | required when overlay body is flex child | inspect per renderer |

## UI → Pattern → semantics mapping

| UI | structural Pattern(s) | navigation semantics | geometry / chrome rule | scroll rule | verification status |
|---|---|---|---|---|---|
| 홈페이지 | P1 | page navigation | page owns outer and site chrome | document | code confirmed / runtime needed |
| 추천게임찾기 | P1 | local feature navigation | page owns outer; recommendation controls are function UI | document | code confirmed / runtime needed |
| 추천 전체보기 / 게임 더 찾기 | P8 when local; P3+P4 when Host child | Independent Overlay | local overlay owns itself; stacked version Host owns outer ×/geometry | `.recommend-overlay-list` | code confirmed / runtime needed |
| 홈페이지 기능 modal | P2 | root modal close; child semantics vary | guide root owns root shell/backdrop; child Host owns pushed frame | root iframe document | code confirmed / runtime needed |
| 게임정보 | P8 local game-sheet | Independent Overlay / local game flow | canonical local sheet in every parent | `.game-sheet-scroll` | code confirmed / runtime needed |
| 게임위치 | P7 local iframe modal + P3-A ancestor presentation when requested from Host context | Drilldown | local sheet back; Host does not own a drilldown frame | iframe actual owner needs measurement | code confirmed / runtime needed |
| 게임안내 | P8 canonical local overlay | Drilldown | local rule overlay back; Host does not own a drilldown frame | `.rule-hub-scroll` | code confirmed / runtime needed |
| 홈 플레이기록 | P7 | root iframe modal local close | record modal owns shell/backdrop/× | iframe document | code confirmed / runtime needed |
| 게임기록 독립 페이지 | P1 | page navigation | page owns outer/site chrome | document | code confirmed / runtime needed |
| 게임기록 상세 | P8 local game-sheet | Independent Overlay / local game flow | canonical local sheet in every parent | game sheet functional body | code confirmed / runtime needed |
| 내 보드 / 회원 보드 | P8 canonical local + P3-A ancestor presentation when requested from Host context | Independent Overlay | local profile outer box; Host does not own a profile frame | `.profile-panel-body` | code confirmed / runtime needed |
| 프로필 보드 / 모임 보드 | P6 | Local Navigation | profile owns parent/subsheet; no Host push | `.profile-subsheet-body` | code confirmed / runtime needed |
| 프로필 작성/수정 wizard | iframe-internal local exception under P2 | Local Navigation / wizard-local flow | wizard owns internal layer; parent X delegates while wizard active | `.intro-wizard-body` is the flex scroll owner; while open, the surrounding embed root `html/body` is locked and the overlay is fixed to that iframe viewport | close delegation runtime confirmed; lower-boundary root-scroll lock user verification needed |
| 홈 모임 플래너 | P2 | root modal close; child semantics vary | planner root owns shell/backdrop, Host owns pushed child | iframe document/local planner sheets | code confirmed / runtime needed |
| 모임 조율 | P8 canonical local | Independent Overlay | local `dd` chrome; Host does not own a meeting frame | local modal body needs measurement | code confirmed / runtime needed |
| day-detail 플래너/quick entry | P7 | local iframe modal flow | `#__plannerModal` owner remains distinct from home planner | iframe/local sheet needs measurement | code confirmed / runtime needed |

## Implemented reuse hooks

| candidate | applies to | current code evidence / remaining page-specific branch |
|---|---|---|
| semantic Host-child marker | current P3/P4 `recommend-all` iframe | child body gets structure, geometry owner, navigation, chrome owner, scroll-boundary, and functional-surface data; `guide-child-mode` remains legacy only |
| shared iframe-fill/outer-geometry reset | current P3 child renderer | central classifier marks the reused outer box `data-ui-geometry="host-fill"`; one CSS rule applies Host ownership, except canonical local functional surfaces |
| embed chrome policy helper | current P3 child renderer | classifier marks global, duplicate Host chrome, and functional chrome separately; CSS hides only the first two |
| presentation helper | P3-A canonical local surfaces | `CottageFunctionalSurface.requestAncestor()` selects the existing ancestor renderer and its Host-relative layer; it does not add a Host child route |
| close/back routing contract | P2–P8 | Host one-pop, profile local restore, and local iframe close each have distinct handlers; a shared classifier could prevent wrong owner routing without merging lifecycles |
| profile subsheet scroll contract | P6 | `_openSubSheet()` centrally creates header/body and CSS centralizes `.profile-subsheet-body`; actual bottom-boundary runtime data is still needed |
| root iframe modal shell contract | P2/P7 | planner/member/guide/record shells share iframe-modal traits, but Host ownership and quick-entry lifecycle differ; common code must keep those distinctions explicit |

## Legacy / exceptions that block blind commonization

- `guide-child-mode` names a generic Host child mode despite originating in guide; rename is a later refactor, not a behavior change in this task.
- 게임정보/기록/위치/안내 are canonical local `game-sheet` flows, including when requested from a Host context. They must not regain a Host iframe route merely to alter outer geometry or navigation chrome.
- 홈 플래너 and day-detail planner share `club-schedule.html` but have different parent modal owners, message source guards, and quick-entry behavior.
- Profile subsheets structurally remain local when the profile parent is portalled through ancestor presentation. Promoting them to Host frames would change their local ←/ESC contract.
- Presentation order is Host-relative inheritance, not route-specific global z-index. A hidden child must be traced to its requesting Host/panel stack before changing any layer value.
- 모임원 프로필 wizard has explicit parent-to-iframe close delegation because parent and child close controls can occupy the same physical coordinates. It is not an ordinary bubbling/click-through case.

## Runtime verification before implementation

- For the current Host child kind (`recommend-all`): shell rect, one backdrop, top-only pointer/keyboard interaction, one-frame pop, and below-frame DOM/scroll preservation at the same viewport.
- Game-location: actual child scroll owner, open/highlight state, target/header rect after settled render.
- Profile subsheet: `.profile-subsheet-body`, profile parent, iframe document scroll metrics and overscroll chain at the lower boundary.
- Planner: home normal, home quick-entry, and day-detail local iframe modal must be measured as three distinct root lifecycles.
- Wizard: local geometry/scroll while parent close delegation is active; only close ownership has runtime confirmation.

## Current-document policy alignment

This document does not change [DESIGN_RULES.md](DESIGN_RULES.md). Its Host one-frame pop, single-backdrop, `recommend-all` Host overlay chrome, canonical local drilldown, and embed content-only direction align with current code. The remaining items above are intentionally marked as runtime prerequisites rather than asserted as final selector-level fixes.
