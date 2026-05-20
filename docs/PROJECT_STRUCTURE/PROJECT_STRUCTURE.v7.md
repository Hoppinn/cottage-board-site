# PROJECT_STRUCTURE.v7.md

## 프로젝트
코티지보드 홈페이지 / cottage-board-site

## 현재 핵심 페이지

### `index.html`
홈페이지 메인.
- 헤더
- 히어로
- 추천게임찾기 섹션
- 추천게임 카드
- 게임 상세 바텀시트
- 추천 조건 UX

### `owned-games.html`
전체 게임 보기 페이지.
현재 가장 많이 작업 중인 페이지.
- 전체게임 DB 탐색
- 게임명 검색
- 정렬
- 필터
- 페이지네이션
- 게임 상세 바텀시트 연결

### 예정 페이지
- `store-usage-guide.html`
  - 매장 이용 안내
- `contact.html`
  - 문의하기

---

## 주요 폴더 구조

```text
cottage-board-site/
├─ index.html
├─ owned-games.html
├─ store-usage-guide.html        # 예정/생성 필요
├─ contact.html                  # 예정/생성 필요
│
├─ assets/
│  ├─ css/
│  │  └─ style.css
│  │
│  ├─ js/
│  │  ├─ script.js
│  │  └─ view/
│  │     └─ game-view-utils.js
│  │
│  └─ images/
│     └─ main/
│        ├─ logo.png
│        └─ hero.png
│
├─ game-system/
│  ├─ game-data/
│  │  ├─ library/
│  │  │  └─ games/
│  │  │     ├─ cottage-games-data.json
│  │  │     └─ cottage-games-data.js
│  │  │
│  │  └─ generated/
│  │     └─ maps/
│  │        └─ bgg-tag-translations.js
│  │
│  └─ tools/
│     └─ ...
│
└─ docs/
   ├─ PROJECT_STATE/
   │  └─ PROJECT_STATE.v10.md
   └─ PROJECT_STRUCTURE/
      └─ PROJECT_STRUCTURE.v7.md
```

---

## 핵심 파일 설명

### `assets/css/style.css`
전체 스타일 파일.
현재 가장 누적 override가 많은 파일.

특히 중복/정리 필요 구역:
```text
.owned-sort-compact
.owned-sort-compact select
.owned-filter-line
.owned-filter-line select
.owned-sort-line
.owned-search-row
.owned-tools-toggle
.owned-toolbar
```

다음 방에서 정렬 badge 분리 후, owned controls 관련 CSS를 한 번 정리하는 것이 좋음.

---

### `assets/js/script.js`
메인 프론트 JS.

주요 담당:
- 모바일 메뉴
- 헤더 검색
- 추천게임찾기 조건 상태
- 추천게임 렌더링
- 전체게임 검색/정렬/필터/페이지네이션
- 게임 상세 바텀시트

현재 주요 상태 객체:
```js
const ownedPageState = {
  page: 1,
  perPage: 4,

  sortTitle: "asc",
  sortWeight: "none",
  sortRating: "none",

  activeSortKeys: ["title"],

  difficultyFilter: "",
  mechanicFilter: "",

  search: ""
};
```

현재 정렬 관련 주요 함수:
```text
activateSortKey(key)
getSortOrderText(key, label)
updateSortOptionLabels()
updateSortOptionLabelsForOpen()
sortOwnedGames(games)
```

다음 방에서 바꿀 가능성이 큰 부분:
- `updateSortOptionLabels()`
- `updateSortOptionLabelsForOpen()`
- 정렬 select HTML 구조
- 우선순위 번호 표시 방식

---

### `assets/js/view/game-view-utils.js`
게임 데이터 표시용 유틸.
`window.CottageGameView` 제공.

주요 사용 함수:
```text
GameView.getAllGamesArray(window.gameData)
GameView.getGameCardData(game)
GameView.getGameDetailData(game)
GameView.getRecommendData(game)
GameView.getGameImage(game)
GameView.getGameMainImage(game)
```

---

### `game-system/game-data/library/games/cottage-games-data.js`
현재 홈페이지에서 실제 읽는 게임 데이터 JS.
`window.gameData` 역할.

주의:
- 자동생성 데이터 성격이 있음.
- 직접 편집보다 생성 파이프라인을 통해 관리하는 방향이 장기적으로 맞음.
- API 데이터가 아직 부족해서 일부 필드가 비어 있을 수 있음.

---

### `game-system/game-data/library/games/cottage-games-data.json`
JS와 같은 게임 데이터의 JSON 원본/출력본.

---

### `game-system/game-data/generated/maps/bgg-tag-translations.js`
BGG 태그 번역 맵.
`script.js`보다 먼저 로드됨.

---

## 현재 owned-games.html 구조 핵심

현재 상단 구조는 대략:

```html
<section class="owned-games-page">
  <h1>전체 게임 보기</h1>

  <div class="owned-toolbar is-collapsed" id="ownedToolbar">
    <div class="owned-sort-grid">

      <div class="owned-sort-line">
        <span class="owned-sort-title">↕ 정렬</span>
        <div class="owned-sort-compact">
          <select id="sortTitle">...</select>
          <select id="sortWeight">...</select>
          <select id="sortRating">...</select>
        </div>
      </div>

      <div class="owned-control-divider"></div>

      <div class="owned-filter-line">
        <span class="owned-filter-title">🔎 필터</span>
        <select id="ownedDifficultyFilter">...</select>
        <select id="ownedMechanicFilter">...</select>
      </div>

    </div>
  </div>

  <div class="owned-search-row">
    <div class="owned-search-box">
      <input id="ownedSearchInput" type="search">
    </div>

    <button class="owned-tools-toggle" id="ownedToolsToggle">
      ▼ 정렬·필터
    </button>
  </div>

  <div id="ownedGameList"></div>
  <div class="owned-pagination" id="ownedPagination"></div>
</section>
```

---

## 다음 구조 변경 추천: 정렬 badge 분리

현재:
```html
<select id="sortTitle">
  <option value="asc">1.이름 ↑</option>
</select>
```

추천 변경:
```html
<div class="owned-sort-control" data-sort-key="title">
  <span class="owned-sort-rank" id="sortTitleRank">1</span>
  <select id="sortTitle">
    <option value="asc">이름 ↑</option>
    <option value="desc">이름 ↓</option>
    <option value="none">이름 -</option>
  </select>
</div>
```

난이도/평점도 동일:
```html
<div class="owned-sort-control" data-sort-key="weight">
  <span class="owned-sort-rank" id="sortWeightRank">2</span>
  <select id="sortWeight">
    <option value="none">난이도 -</option>
    <option value="asc">난이도 ↑</option>
    <option value="desc">난이도 ↓</option>
  </select>
</div>
```

```html
<div class="owned-sort-control" data-sort-key="rating">
  <span class="owned-sort-rank" id="sortRatingRank"></span>
  <select id="sortRating">
    <option value="none">평점 -</option>
    <option value="asc">평점 ↑</option>
    <option value="desc">평점 ↓</option>
  </select>
</div>
```

JS는 option 텍스트를 조작하지 않고 rank span만 업데이트하는 구조로 바꾸는 것을 추천.

---

## 작업 규칙

- 구조가 꼬일 때는 임시 override를 더 추가하지 말고 마지막 관련 CSS 블록을 정리한다.
- 하나의 UI 파트는 최종 override 블록 1개만 남기는 방향.
- CSS는 너무 많이 쌓이면 다음 작업 속도가 급격히 느려짐.
- 다음 방에서는 먼저 구조 변경 시안을 짧게 확인하고 코드로 들어간다.
