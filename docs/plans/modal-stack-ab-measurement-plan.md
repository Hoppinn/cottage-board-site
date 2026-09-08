# Modal Stack A/B 계측 Plan

상태: B는 실제 화면 해결 확인 완료. A는 아래 계획으로 실제 계측 후 원인 확정·최소 수정·실제 화면 해결 확인 완료. 이 문서는 동일 유형 재발 시의 계측 기준으로 보존한다.

## A. child 첫 프레임 우하단 시작

확정 재현 경로:

1. 홈 → 프로필페이지 미리보기 → 내 보드

이전 `전체보기 → 게임정보`는 A의 실제 재현 경로가 아니었으므로, 그 경로의 미재현으로 A 부재를 판정하지 않는다.

측정 대상:

- parent document: `.modal-stack-frame-layer`, `.modal-stack-frame-shell`, root backdrop/root shell
- child iframe document: 실제 열린 local overlay와 panel (`.game-sheet`, `.game-sheet-panel`, `.recommend-overlay-panel`, `.profile-panel-box`, `.dd-meeting-modal` 중 해당 화면)

측정 시점:

1. `push()`가 layer를 append한 직후
2. parent 첫 `requestAnimationFrame`
3. child iframe `load`
4. child bootstrap 직후와 다음 `requestAnimationFrame`

기록값:

- 각 대상의 `getBoundingClientRect()`
- `position`, `transform`, `transform-origin`, `animation-name`, `animation-play-state`, `transition`, `filter`, `backdrop-filter`, `perspective`, `contain`
- ancestor chain 중 fixed containing block을 만드는 computed style
- iframe URL, `body` class, `stackKind`, local overlay가 active가 되는 시점

원인 확정 기준:

- outer shell rect가 시점 사이 변하면 Host/containing block 문제다.
- outer shell rect는 고정이고 child local panel rect 또는 transform만 변하면 child component lifecycle/animation 문제다.
- iframe load 전후에만 변하면 bootstrap/first-paint 순서 문제다.

이번 확정 결과:

- Host layer/shell은 append부터 정상 표준 rect였고, iframe 내부 `.profile-panel-box.center-modal-shell`만 iframe 안에서 다시 `10px / 36px / 12px` outer 좌표를 적용했다.
- `guide-child-mode`의 해당 panel을 `inset:0; width:auto; height:auto`로 바꾼 뒤 사용자가 실제 경로에서 첫 프레임 우하단 시작이 사라진 것을 확인했다.

구현 금지 조건:

- 위 타임라인에서 실제 이동 대상이 확정되기 전에는 fixed/portal/outer geometry 변경을 하지 않는다.

## B. 최상단 X가 아래 modal까지 닫힘

재현 경로:

1. 모임원 프로필 → 작성/수정 wizard → X
2. 플래너 → 내 보드 → X
3. 전체보기 → 게임정보 → X
4. 게임정보 → 게임위치 → ←

측정 대상:

- 화면상 X 중심 좌표의 `document.elementFromPoint(x, y)`를 parent와 해당 iframe document에서 각각 기록
- Host X, root X, local wizard X, root/child backdrop
- `pointerdown`, `pointerup`, `click`, `keydown`의 `target`, `currentTarget`, `eventPhase`, `defaultPrevented`, `composedPath()`
- close/pop 함수 호출 순서와 frame depth/token

측정 방법:

- 계측 전용 capture/bubble listener를 각 document와 close/backdrop 요소에 일시적으로 등록한다.
- 각 close 함수의 진입/종료에 frame id·depth·timestamp를 남긴다.
- 한 번의 pointer gesture에서 pop/close 호출이 둘 이상이면 해당 호출 stack과 target path를 함께 저장한다.

원인 확정 기준:

- 첫 hit target이 parent/root X면 z-index/chrome ownership 충돌이다.
- 같은 target의 bubble/capture에서 두 close handler가 실행되면 event propagation 문제다.
- pointerdown 뒤 DOM 제거 후 pointerup/click target이 바뀌면 removal timing click-through다.
- iframe 내부 postMessage와 parent root close가 같은 gesture 시간에 연속하면 message/lifecycle 중복이다.

구현 금지 조건:

- hit target과 두 번째 close 호출의 발생 지점이 확인되기 전에는 `stopPropagation`, pointer capture, deferred removal, parent chrome 숨김, Host route 승격을 적용하지 않는다.
