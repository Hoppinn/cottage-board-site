# Debugging History

## 2026-09-09 - Modal Stack 작업의 설계 과잉과 측정 지연 postmortem

현상:

- 최초 요구는 복잡한 framework가 아니었다. 기존 center modal A 위에 별도 기능 modal B가 필요하면 같은 표준 크기의 B를 한 장 더 올리고, A의 DOM·scroll·선택 상태는 보존하며 B를 닫은 뒤 A가 그대로 보이면 됐다.
- 내 보드 → 프로필 보드/모임 보드는 내 보드 안의 local navigation이고, 게임정보 → 게임위치/게임안내는 실제 drill-down이라 각각의 ←가 원래 화면으로만 돌아가야 했다.
- 그러나 iframe 안에서 기존 독립 modal renderer를 그대로 열면 작은 inset modal이 다시 생기고, 일부 child는 첫 visible frame에 우하단에서 출발해 보였으며, 프로필 작성·수정 wizard의 X는 root까지 닫는 것처럼 보였다.

잘못된 가설:

- 문제의 주된 원인이 Modal Stack Host의 containing block, `position: fixed`, portal/body root, transform, click bubbling이라고 먼저 판단했다.
- 모든 center modal 관계를 같은 ← back-stack으로 일반화했다가, 별도 기능 overlay와 실제 drill-down/local navigation의 UX 차이를 늦게 분리했다.
- overlay의 × 의미도 “현재 한 장 pop”과 “현재 modal experience 전체 종료” 사이에서 코드·문서 정책을 실제 경로 검증보다 먼저 확정하려 했다.
- 실제 사용자 재현 경로가 아닌 `전체보기 → 게임정보` 같은 대체 경로가 정상이라는 결과를 A의 부재처럼 취급해, 원인 추적을 늦췄다.

시도:

- iframe 내부 작은 modal을 parent delegation으로 넘기고, 처음에는 한 장짜리 child frame으로 처리했다.
- child의 child까지 막으려 공통 Modal Stack Host(frame 배열, inert, 단일 backdrop, iframe 상태 보존)를 만들고 route/presentation을 일반화했다.
- 모든 child를 ←로 보던 구조에서 `overlay`와 `drilldown` presentation을 분리하고, 이후 ×의 종료 의미도 Host가 소유하도록 변경했다.
- A에 대해 absolute/fixed, containing block, portal/body root, transform-origin, topmost guard를 의심해 구조 변경을 시도했다.
- B에 대해 bubbling/click-through/pointerdown·pointerup 전달을 가정하고 stopPropagation, pointer capture, topmost guard 계열을 검토했다.
- profile wizard를 child로 이관하는 시도는 정상 콘텐츠가 흰 화면으로 열리는 회귀를 만들었고, portal/topmost 변경과 함께 rollback했다.
- rollback 뒤 Playwright/Chrome 런타임 계측을 도입했다. 자동화는 실제 외부 데이터 경로를 재현하지 못해, 사용자의 일반 Chrome에서 `?modalDebug=1` 로그를 받아 parent/iframe 값을 시간순으로 확인했다.

결과:

- framework를 먼저 일반화한 동안 원래 단순한 화면 모델(독립 overlay / 내 보드 내부 navigation / 게임정보 drill-down)이 코드의 presentation 규칙보다 뒤로 밀렸다.
- fixed/portal 구조 변경은 A를 해결하지 못했고, profile wizard white-screen이라는 별도 회귀를 만들었다. 회귀 변경을 기반으로 추가 패치를 쌓지 않고 rollback한 것은 맞았지만, 처음부터 geometry를 측정했으면 피할 수 있는 비용이었다.
- B도 일반적인 event propagation 문제가 아니라 parent chrome ownership 문제였으므로, bubbling 차단만 추가했으면 잘못된 층을 고치게 됐을 것이다.
- 정적 검사와 코드 계약은 syntax·참조·선택자 존재만 확인했을 뿐, 첫 visible frame, 실제 hit target, iframe boot 시점, 사용자 경로의 UI 결과를 보장하지 못했다.

확인된 사실:

- A의 canonical reproduction은 `홈 → 프로필페이지 미리보기 → 내 보드`다. Host layer는 append 직후부터 `0,0,362.4×591.2`, Host shell/iframe은 `10,36,342.4×543.2`이고 transform도 `none`이었다. Host 외곽은 첫 프레임부터 정상이었다.
- 실제 이동 주체는 iframe 내부에서 재사용한 `.profile-panel-box.center-modal-shell`이었다. Host가 이미 소유한 `10px / 36px / 12px` outer geometry를 이 panel이 독립 modal 규칙으로 다시 적용했다. 즉 `outer Host center geometry + inner reused center-modal geometry`의 이중 적용이 직접 원인이었다.
- `body.guide-child-mode .profile-panel-box`를 iframe `0,0` 전체(`position:absolute; inset:0; width:auto; height:auto`)로 채우자 내 보드 child의 우하단 시작이 실제 화면에서 사라졌다. 이 원인을 처음부터 확인했으면 portal/fixed 같은 큰 구조 변경은 필요 없었다.
- B에서 iframe 내부 wizard X는 `display:none`/`0×0`이었고, 사용자가 누른 좌표의 실제 hit target은 부모 `#memberProfilesClose`였다. click-through가 아니라 같은 물리 좌표를 공유한 parent chrome ownership 문제였다.
- wizard open/close 상태를 parent에 전달하고, wizard가 열린 동안 부모 X가 root를 닫지 않고 기존 iframe `closeWizard()` 경로를 요청하게 하자 사용자가 실제 화면에서 해결을 확인했다.

다음 시도 조건:

- 사용자 재현 경로와 같은 viewport를 먼저 canonical reproduction으로 고정한다. 대체 경로의 정상 결과로 부재 판정을 하지 않는다.
- 위치/크기 문제는 Host → iframe → 실제 panel → 직계 wrapper → overlay 순서로 생성 직후·첫 rAF·둘째 rAF·load·visible·transitionend의 rect와 computed style을 비교하기 전에는 fixed/portal/containing-block 구조를 다시 바꾸지 않는다.
- 특히 `padding`, `margin`, `inset`, `top/right/bottom/left`, `width/height`, `position`, `transform`, `align-items`, `justify-content` 및 nested-modal용 잔여 geometry를 먼저 배제한다.
- 이벤트 문제는 `elementFromPoint()`와 pointerdown/pointerup/click의 capture·bubble target, 실제 close 함수 호출 순서를 기록하기 전에는 stopPropagation/pointer capture/deferred removal을 추가하지 않는다.
- 같은 가설 계열을 다시 쓰려면 이전과 다른 측정 근거가 있어야 한다. 두 번 실패한 계열은 세 번째부터 계측이 선행 조건이다.

재발 방지:

- 사용자 관점의 화면 모델을 먼저 명시한다: 별도 독립 modal overlay, local internal navigation, drill-down을 같은 stack 규칙으로 강제로 취급하지 않는다.
- parent가 viewport geometry를 소유하면 child renderer는 iframe/container의 `0,0,100%`만 소유하고 같은 center-modal geometry를 재적용하지 않는다.
- 첫 visible frame 버그는 최종 rect 한 번으로 판정하지 않는다. class 적용 전후와 iframe lifecycle을 포함한다.
- 이벤트가 이상해 보여도 propagation부터 고치지 않고 hit target과 chrome ownership을 확인한다.
- 실제 UI가 아직 해결되지 않았으면 API/문서 정책을 확정된 해결책처럼 쓰지 않는다. 정적 검사 통과는 `코드 수정 완료`일 뿐 `실제 UI 검증 완료`가 아니다.
- 최소 수정은 페이지별 숫자 덮어쓰기가 아니라, 측정으로 확인된 공통 책임 경계 하나를 고치는 것을 뜻한다.

### 후속 세션 재현·검증 필요 항목 — 이번 postmortem에서 수정하지 않음

- 추천게임찾기 → 게임 더 찾기 → 전체보기의 고정헤더가 사라지는 문제.
- 전체보기 → 게임정보 종료 시 부모까지 같이 닫히는 문제.
- 플레이기록 → 게임정보 종료 동작.
- 플래너 → 내 보드 종료 동작.
- 내 보드 하위 보드의 최하단 overscroll / sticky header 끌림.

각 항목은 이번 세션의 해결 완료로 취급하지 않는다. 다음 세션에서는 해당 실제 경로·viewport·target을 각각 고정하고, shared Host 문제인지 local renderer 문제인지 계측으로 분리한 뒤 최소 수정한다.

각 항목이 실제로 해결되면 이 목록에서 지우지 않고, 해당 항목 아래에 **최종 원인**, **최종 해결 방식**, **실제 화면 검증 결과** 세 가지만 추가해 `미해결 → 해결 완료` 기록으로 마감한다. 이후 Markdown 정리에서는 현재 확정된 UX/구조 원칙만 DESIGN_RULES·PROJECT_STRUCTURE 등 해당 정본에 남기고, 오늘의 실패 과정·폐기된 가설·중간 정책(예: `모든 child는 ←`, `X = 전체 stack 종료`)은 이 문서에만 보존한다.

모든 작업의 일지가 아니다. 실패한 시도·rollback·잘못된 가설 중, 같은 공통 구조에서 다시 반복할 위험이 있는 것만 기록한다.

## 2026-09-08 - 상태 축약으로 인한 조기 완료 판정

현상:

- `PROJECT_STATE.md`의 “메인 모임 미리보기의 모임원 프로필 링크”를 기존 참여자 이름의 프로필 보드 링크로 해석해, 새 CTA와 모달 진입 요구가 이미 충족됐다고 조기 완료 처리했다.

잘못된 가설:

- 상태 문서의 축약 키워드가 기존 코드의 같은 이름 경로와 일치하면, 원래 요청의 위치·행동·결과도 일치한다고 보았다.

시도:

- 기존 참여자 이름 링크를 근거로 state를 완료 상태로 갱신했다.

결과:

- 홈 `플래너 보기` 주변의 새 CTA, 모임원 프로필 페이지 modal 진입이라는 실제 요구를 누락했다.

확인된 사실:

- 상태 문구는 진입점·행동·사용자 결과가 빠지면 기존 기능 확인과 신규 기능 추가를 구분할 수 없다.

다음 시도 조건:

- 축약 상태가 둘 이상으로 해석되면 연결 Plan 또는 원 사용자 요구를 복원하기 전에는 기존 코드 경로를 완료 근거로 쓰지 않는다.

재발 방지:

- 상태에는 화면의 진입점, 사용자 행동, 보이는 결과를 함께 기록한다.
- 모호한 상태는 열린 상태로 남기고 키워드 일치만으로 정답 경로를 확정하지 않는다.

## 2026-09-08 - 사용자 지정 비교 대상 대신 대리 요소 측정

현상:

- 사용자는 게임 도감의 가이아프로젝트·다윈의여정 항목이 위로 이동한다고 했지만, 초기 진단에서는 증상이 없다고 판단했다.

잘못된 가설:

- 사용자가 지목한 게임 항목 대신 도감 섹션 시작줄·헤더·버튼과 `.profile-panel-body`의 `scrollTop`으로 같은 현상을 판정할 수 있다고 보았다.

시도:

- 대리 요소와 잘못된 scroll container를 먼저 측정했고, 실제 핸들러의 `.profile-subsheet-body` 확인도 늦었다.

결과:

- 사용자가 보던 이동을 놓쳤다. 이후 첫 게임 항목을 직접 측정해 `471 → 468px` 이동과 접힌 미리보기·펼친 목록의 시작 여백 차이를 확인했다.

확인된 사실:

- 사용자 지정 target의 viewport rect와 실제 조상 scroll container를 대리 지표로 바꾸면 증상 자체를 부정하게 될 수 있다.

다음 시도 조건:

- target의 클릭 전후 `getBoundingClientRect().top`, target DOM, 조상 scroll container, 렌더 경계를 확인하기 전에는 section/header/`scrollTop` 보정 가설을 세우지 않는다.

재발 방지:

- UI 이동 진단은 `증상 → target → 이벤트 → 실제 scroll container → 전후 viewport rect` 순서로 시작한다.

## 2026-08-27 - 스크린샷의 실제 화면 대신 이전 요청 대상을 고정

현상:

- 이후 스크린샷에는 `pages/info/about.html`과 본문이 한 글자 폭으로 붕괴한 증거가 있었지만, 문제를 추천 패널로 계속 분류했다.

잘못된 가설:

- 초기 추천 목록 요청의 대상이 후속 스크린샷에서도 그대로 유효하다고 보았다.

시도:

- 주소와 열린 화면을 먼저 식별하지 않고 이전 대상 가설에 맞춰 원인을 찾았다.

결과:

- 화면의 실제 오류와 다른 경로를 조사했다.

확인된 사실:

- 스크린샷에는 현재 URL·뷰포트·열린 화면·비교 기준이 있으며, 이전 대화의 대상보다 우선하는 증거다.

다음 시도 조건:

- 스크린샷을 받은 뒤 URL, 뷰포트, 열린 화면, 비교 기준을 식별하기 전에는 기존 가설의 대상 페이지를 유지하지 않는다.

재발 방지:

- 스크린샷 증거를 현재 가설과 먼저 대조하고, 불일치하면 대상 분류부터 수정한다.

## 2026-08-27 - 비활성 media query를 수정한 반응형 UI 진단

현상:

- 추천 목록 패널에서 PC용 `max-width`를 연속 수정했지만 360px 검증 화면은 바뀌지 않았다.

잘못된 가설:

- 수정한 PC media query가 현재 모바일 검증 뷰포트에도 적용된다고 보았다.

시도:

- 활성 여부를 확인하지 않고 `@media (min-width:720px)` 내부 규칙을 반복 수정했다.

결과:

- 화면 변화가 없었고, 실제 검증 조건과 수정 규칙이 맞지 않았다.

확인된 사실:

- 반응형 문제에서 규칙 자체보다 현재 뷰포트에서 해당 media query가 활성인지가 먼저 확인되어야 한다.

다음 시도 조건:

- 수정 전 검증 뷰포트, 활성 media query, 대상 요소의 실제 `getComputedStyle()`을 확인한다.

재발 방지:

- 다른 breakpoint의 규칙을 수정할 때는 그 breakpoint에서 따로 검증한다.

## 2026-08-31 - 센터모달 렌더 경계와 scroll target을 추측으로 판단

현상:

- 기록 센터모달 작업에서 iframe 렌더 경계와 sticky 위치가 잘못 판단됐고, 같은 영역의 부분 패치가 반복됐다.

잘못된 가설:

- 부분 코드와 정적 검사만으로 iframe 경계, sticky 상위 여백, 최종 scroll 위치를 충분히 알 수 있다고 보았다.

시도:

- 구조 문서를 선독하지 않은 채 수정했고, 이벤트 capture/첫 `requestAnimationFrame` 값을 최종 상태로 취급했다. `scrollTop`을 보정 목표로 삼아 부호도 반대로 적용했다.

결과:

- 원인 파악과 수정 횟수가 불필요하게 늘었고, 사용자가 고정되어 보길 기대한 target header의 viewport 위치를 놓쳤다.

확인된 사실:

- iframe·sticky·scroll 문제는 문서상 렌더 경계와 실제 target의 안정 시점 viewport rect를 함께 확인해야 한다.

다음 시도 조건:

- 관련 구조 문서, 실제 scroll container, 안정 렌더 이후 target rect를 확인하기 전에는 같은 영역을 다시 패치하지 않는다.

재발 방지:

- 공통 UI는 구조 선독 → 런타임 계측 → 최소 수정 순서로 진행하며, 첫 animation frame을 최종 상태로 단정하지 않는다.

## 2026-09-08 - Modal Stack child 첫 프레임 우하단 시작

현상:

- 사용자는 modal → modal 전환에서 최상단 child가 최종 위치와 달리 첫 순간에는 부모 modal의 우하단/내부 위치에서 시작한다고 확인했다.

잘못된 가설:

- Host child의 `absolute` 좌표계가 원인이며 `fixed` 또는 body 직계 portal로 바꾸면 해결된다고 추정했다.

시도:

- child layer/shell을 `fixed`로 바꾸고, 이어서 body 직계 portal로 mount하도록 변경했다.

결과:

- 실제 증상은 해결되지 않았다.
- `profile-wizard` child 이관과 결합되며 일부 프로필 작성·수정 wizard가 흰 화면으로 열리는 회귀가 생겼고, portal·topmost 변경은 rollback했다.

확인된 사실:

- 현재 코드만으로는 움직이는 대상이 Host outer shell인지, iframe 내부 기존 local component인지, iframe load/bootstrapping 시점인지 확정되지 않았다.
- container/containing block 가설은 실제 rect 측정으로 확인된 사실이 아니었다.

다음 시도 조건:

- 같은 재현 경로에서 Host layer/shell과 iframe 내부 local component의 `getBoundingClientRect()`를 생성 직후, 첫 rAF, iframe load, 다음 rAF에 각각 확보하기 전에는 fixed/portal/containing-block 구조를 다시 바꾸지 않는다.

재발 방지:

- shared modal의 첫 프레임 문제는 `transform`, `filter`, `perspective`, `contain`, animation keyframe, iframe lifecycle의 computed style/rect를 먼저 비교한다.
- outer shell과 local component 중 실제 이동 주체를 하나로 확정한 뒤 최소 selector만 수정한다.

### 2026-09-09 실제 계측·해결

- 재현 경로는 `홈 → 프로필페이지 미리보기 → 내 보드`로 확정했다. 이전의 `전체보기 → 게임정보` 미재현은 A 부재 근거가 아니었다.
- `frame-append`·첫/둘째 rAF에서 Host layer는 `0,0,362.4×591.2`, Host shell과 iframe은 모두 `10,36,342.4×543.2`였고 transform은 `none`이었다. Host outer shell은 첫 프레임부터 정상 위치였다.
- iframe 내부 `panel-visible`·다음 rAF에서 `.profile-panel-box.center-modal-shell`은 다시 `left:10px; top:36px; bottom:12px`를 적용받고 있었다. 직계 `.profile-panel`은 iframe 전체를 덮지만 `align-items:flex-end` 상태였다. 즉 이동/중복 좌표의 주체는 Host가 아니라 기존 독립 profile renderer의 두 번째 outer shell이었다.
- `body.guide-child-mode .profile-panel-box`만 `position:absolute; inset:0; width:auto; height:auto`로 바꿔 iframe 안에서 독립 center-modal 좌표를 재계산하지 않게 했다. padding 등 기존 board 본문 레이아웃은 보존했다.
- 사용자가 같은 경로에서 우하단 시작이 사라지고 부모 center shell을 처음부터 채우는 것을 실제 화면으로 확인했다.

## 2026-09-08 - 최상단 X가 아래 modal까지 닫힘

현상:

- 사용자는 프로필 modal 위 작성·수정 wizard의 X를 눌렀을 때 wizard뿐 아니라 뒤의 프로필 modal도 닫힌다고 확인했다.

잘못된 가설:

- 일반적인 click-through 또는 bubbling이 원인이므로 Host에 `stopPropagation`, pointer capture, topmost guard를 추가하면 해결된다고 추정했다.

시도:

- Host child layer의 pointer/click 소비와 root close topmost guard를 추가했다.

결과:

- 실제 event target을 측정하지 않은 상태에서 변경해 white-screen 회귀와 함께 rollback했다.

확인된 사실:

- profile root embed에서는 iframe 내부 `.intro-wizard-close`가 숨겨지고 부모 `#memberProfilesClose`가 같은 우상단 영역에 존재한다.
- profile child의 raw `board-wizard-modal`도 parent Host `.modal-stack-frame-close`와 같은 물리 좌표를 공유할 가능성이 있다.
- 이 충돌은 실제 `elementFromPoint()`·pointer/click target 기록 전에는 가능성일 뿐 확정 원인이 아니다.

다음 시도 조건:

- 각 재현 지점에서 `elementFromPoint()`와 pointerdown/pointerup/click capture·bubble target/currentTarget 로그를 확보하기 전에는 `stopPropagation`, pointer capture, deferred removal, topmost guard를 다시 추가하지 않는다.

재발 방지:

- nested modal close는 event propagation 가설보다 먼저 화면상 X 좌표의 실제 hit target과 iframe 경계를 확인한다.
- 회귀를 만든 close 정책 변경은 다음 시도의 기반으로 덧붙이지 않고 정상 상태로 복구한 뒤 다시 계측한다.

## 2026-09-08 - 공통 UI의 정적 검증과 실제 렌더 혼동

현상:

- 정적 검사와 코드 경로 검토만으로 shared modal UI가 해결된 것처럼 보고된 뒤, 사용자가 실제 화면에서 첫 프레임 위치·흰 화면·close 회귀를 확인했다.

잘못된 가설:

- syntax check, diff check, selector/호출 경로 검토가 실제 pointer·animation·iframe lifecycle 동작을 충분히 보장한다고 취급했다.

시도:

- 실제 브라우저 연결이 없는 상태에서 구조 변경을 진행하고 정적 결과를 근거로 완료에 가까운 표현을 사용했다.

결과:

- 실제 렌더 회귀를 놓쳤고, 사용자가 후속 회귀를 하나씩 찾아내는 흐름이 생겼다.

확인된 사실:

- 정적 검사는 문법·참조·CSS 선언 확인만 보장하며 rect, hit target, animation 첫 프레임, iframe load 순서는 보장하지 않는다.

다음 시도 조건:

- 실제 브라우저 측정이 불가능하면 `코드 수정 완료 / 실제 UI 검증 미완료` 외의 완료 표현을 쓰지 않는다.

재발 방지:

- 공통 UI 변경은 실제 렌더 검증 또는 사용자가 실행할 수 있는 전체 회귀 경로를 함께 제시한다.
- “가능성이 높다”와 “측정으로 확인했다”를 같은 수준의 근거로 보고하지 않는다.
