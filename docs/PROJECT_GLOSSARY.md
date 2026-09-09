# Cottage Board Project Glossary

코티지보드 프로젝트에서 사용자와 작업자가 화면·기능·UI를 같은 이름으로 부르기 위한 사람 중심의 표준 용어집이다.

사람이 읽는 표준명을 먼저 사용하고, 실제 파일·selector·함수명은 필요한 경우에만 괄호로 병기한다. 표준명과 코드명이 다르다는 이유로 기존 CSS class, 함수, URL, DB, analytics 계약을 rename하지 않는다.

## 1. 주요 화면

### 게임정보 모달

게임 하나의 상세 정보가 열리는 센터모달이다. 모바일 센터모달 외곽 규격과 백드랍의 기준 화면으로 사용한다.

- 사용자가 만나는 곳: 홈의 게임 카드, 게임 목록, 기록·모임 화면의 게임명 또는 게임 썸네일을 누를 때
- 실제 화면 표시명: 게임 정보
- 주요 코드 대응: `assets/js/game-sheet.js`의 `openGameSheet()` / `.game-sheet` / `.game-sheet-panel`
- 구분: 게임정보 모달 안에서 다시 열리는 게임 위치 시트나 게임 안내 허브와는 별도 화면이다.
- 주의: `.game-sheet` 계열이라는 코드명은 게임정보 모달뿐 아니라 독립 게임 페이지의 게임 상세 진입에도 쓰인다.

### 내 보드

로그인한 사용자가 자신의 기록, 업적, 프로필, 모임 활동 등을 확인하는 개인 보드다.

- 사용자가 만나는 곳: 사이트 헤더의 내 보드, 홈페이지 기능의 내 보드 카드
- 실제 화면 표시명: 내 보드
- 주요 코드 대응: `assets/js/kakao-auth.js`의 `openProfilePanel()` / `.profile-panel` / `.profile-panel-box`
- 구분: 내 보드 안에서 프로필·모임·기록 등을 여는 화면은 내 보드 하위 보드다.
- 레거시 주의: `profilePanel`, `profile-panel`은 코드 이름이며 사람에게는 항상 내 보드라고 부른다.

### 내 보드 하위 보드

내 보드 안에서 특정 기능을 자세히 보는 상세 화면이다. 프로필 보드, 모임 보드, 기록 보드, 함께한 시간, 수집 보드 등이 여기에 속한다.

- 사용자가 만나는 곳: 내 보드의 기능 카드 또는 상세 보기 버튼
- 실제 화면 표시명: 프로필 보드, 모임 보드, 기록 보드 등 기능별 이름
- 주요 코드 대응: `assets/js/kakao-auth.js`의 `_openSubSheet()` / `.profile-subsheet` / `.profile-subsheet-box`
- 구분: 내 보드 자체인 `.profile-panel`과 다른 외곽 wrapper를 사용한다.
- 주의: `profile`이라는 코드명이 들어가도 내 보드 전체와 하위 보드를 같은 대상으로 취급하지 않는다.

### 게임 더 찾기 전체보기

추천 조건에 맞는 게임을 한 번에 목록으로 보는 화면이다. `전체 N개 더보기`를 눌렀을 때 열린다.

- 사용자가 만나는 곳: 홈의 게임 더 찾기 영역
- 실제 화면 표시명: 필터 조건과 게임 개수, 기본 제목은 추천 게임 전체보기
- 주요 코드 대응: `assets/js/index-page.js`의 `openRecommendOverlay()` / `#recommendOverlay` / `.recommend-overlay-panel`
- 구분: `#recommendModal` / `.recommend-modal`은 별도의 레거시 추천 조건 모달이며 이 화면과 같은 것으로 취급하지 않는다.

### 홈 플레이기록 모달

홈에서 플레이 기록을 조회하거나 입력하는 동일한 record iframe modal이다.

- 사용자가 만나는 곳: 홈 최근 플레이 영역의 `기록 더보기`, `기록 남기기`
- 실제 화면 표시명: 기록 보기, 기록 입력
- 주요 코드 대응: `assets/js/index-page.js`의 `openModal('records'|'input')` / `#recordIframeModal` / `.record-iframe-panel` / `pages/game/game-reviews.html`
- 구분: 내 보드 안의 기록 하위 보드와는 다른 홈 진입점이다.
- 주의: `기록 보기 / 기록 입력`은 제목줄이 아니라 실제 기능을 가진 기능헤더다. 별도 플레이기록 제목줄을 추가하지 않는다.

### 홈 모임원 프로필 모달

홈의 코티지 모임 영역에서 모임원 프로필 페이지를 iframe으로 여는 모달이다.

- 사용자가 만나는 곳: 홈 코티지 모임의 모임원 프로필
- 실제 화면 표시명: 모임원 프로필
- 주요 코드 대응: `assets/js/index-page.js`의 홈 모달 초기화·`openModal()` / `#memberProfilesModal` / `.record-iframe-panel` / `pages/club/club-intro.html`
- 구분: 모임원 카드에서 다른 사용자의 내 보드나 프로필 보드로 이동하는 navigation과는 별도 진입점이다.
- 주의: 부모의 제목만 표시하던 `.intro-wizard-head`는 제거되었고, 현재는 닫기 제어만 유지한다. iframe 내부의 모임원 프로필 카드와 구분한다.

### 홈 플래너 모달

홈에서 모임 주간 일정과 참여 기능을 iframe으로 보여주는 모달이다.

- 사용자가 만나는 곳: 홈 코티지 모임 영역의 플래너 보기
- 실제 화면 표시명: 모임 플래너
- 주요 코드 대응: `assets/js/index-page.js`의 `initPlannerModal()` / `#plannerSheetModal` / `.planner-sheet-panel` / `pages/club/club-schedule.html`
- 구분: `day-detail.js`의 `openPlannerModal()`이 만드는 `#__plannerModal`은 다른 부모 진입점과 lifecycle을 가진 별도 플래너 모달이다.
- 주의: 플래너 안의 등록·수정 시트는 홈 플래너 모달 자체가 아니라 iframe 내부 하위 UI다.

### 홈페이지 기능 모달

홈페이지 기능 안내 페이지에서 기능 카드를 눌렀을 때 열리는 공통 iframe wrapper다. 하나의 콘텐츠 페이지 이름이 아니다.

- 사용자가 만나는 곳: `pages/info/guide.html`의 추천게임찾기, 플레이기록, 모임 플래너, 요청하기 카드
- 실제 화면 표시명: 클릭한 기능 카드의 이름
- 주요 코드 대응: `pages/info/guide.html`의 `openGuideOverlay()` / `#guideIframeOverlay` / `#guideIframe`
- iframe 대상: `index.html#recommend`, `pages/game/game-reviews.html`, `pages/club/club-schedule.html`, `pages/admin/requests.html`
- 구분: 홈페이지 기능 모달은 바깥 wrapper의 표준명이고, iframe 안의 각 독립 페이지·기능은 각각의 화면 표준명을 유지한다.
- 주의: wrapper의 동적 제목줄과 iframe 내부의 page title은 서로 다른 요소다.

### 게임 위치 시트

게임정보 모달 안에서 게임이 실제로 놓인 위치를 확인하는 iframe 시트다.

- 사용자가 만나는 곳: 게임정보 모달의 게임 위치 버튼
- 실제 화면 표시명: 게임 위치
- 주요 코드 대응: `assets/js/game-sheet.js`의 `openShelfSheet()` / `.shelf-sheet-overlay` / `.shelf-sheet-box` / `pages/game/game-location.html`
- 구분: 게임정보 모달 위에 local iframe 시트로 쌓이며, `← 게임 위치`로 게임정보 모달에 복귀한다. Host 문맥에서는 ancestor presentation을 요청할 뿐 Host child frame으로 승격하지 않는다. 위치 목록 안에서 다시 열리는 별도 기능 UI와는 구분한다.

## 2. 공통 UI 용어

### 센터모달

현재 페이지 위에 백드랍을 깔고 화면 중앙 또는 중앙에 가까운 위치에 큰 패널을 여는 UX 분류명이다. 특정 구현 class명이 아니다.

센터모달 사이의 실제 Host child route는 현재 `recommend-all` 하나다. 이 frame은 `×`/ESC로 top frame 하나만 닫고, 아래 root DOM·스크롤·선택 상태를 보존한다. 부모는 inactive로 남고 최상단 frame만 포인터·키보드·백드랍 입력을 받으며, backdrop은 root가 한 번만 소유한다. 게임의 `←` drilldown과 profile local navigation은 각각 기존 local owner가 처리하므로, UX가 비슷하다는 이유로 Host stack으로 분류하지 않는다.

### 시트

화면의 한쪽, 특히 아래쪽에 붙거나 시트처럼 올라오는 패널이다. 센터모달과 겹칠 수 있지만 이름만으로 같은 wrapper라고 판단하지 않는다.

### 모달 외곽틀

모달의 위치, 크기, width·height, radius, overflow, 백드랍을 담당하는 outer shell이다. 내부 콘텐츠의 기능 구조와 구분한다.

### 백드랍

모달 뒤 페이지를 어둡게 하거나 흐리게 만드는 영역이다. dim 색상과 `backdrop-filter` blur를 포함한다.

### 제목줄

화면의 이름과 닫기 같은 최소 정보만 표시하는 상단 bar다. 실제 조작 기능이 없으면 제목줄로 분류한다.

### 기능헤더

탭·필터·입력·버튼처럼 사용자가 실제로 조작하는 상단 bar다. 홈 플레이기록의 `기록 보기 / 기록 입력`이 대표적인 기능헤더다.

### 임베드 화면

독립 페이지가 iframe 등으로 모달이나 시트 내부에 열린 상태다. URL이 같아도 부모 화면 안에서 열리면 임베드 화면으로 본다.

### 독립 페이지 요소

독립 URL로 직접 들어갔을 때 제공되는 글로벌 header, footer, breadcrumb, hero, page title이다. 임베드 화면에서는 중복 여부에 따라 숨길 수 있지만, 직접 진입 화면에서는 기존 동작을 유지한다.

## 3. 용어 사용 원칙

- 사람이 읽는 보고·Plan·작업 설명에서는 표준명을 먼저 쓴다. 예: `홈 플레이기록 모달 (.record-iframe-panel)`.
- 실제 코드명은 구조 확인이나 검색에 필요한 경우에만 괄호로 병기한다.
- 기존 CSS class, 함수, URL, DB, analytics 이름은 레거시 또는 구현 계약으로 보존한다.
- 비슷한 이름의 모달·시트는 wrapper, 진입 함수, lifecycle이 실제로 공유되는지 확인하기 전에는 같은 화면으로 묶지 않는다.
