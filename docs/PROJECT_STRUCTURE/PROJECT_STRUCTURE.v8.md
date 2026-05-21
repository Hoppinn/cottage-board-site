# PROJECT_STRUCTURE.v8.md

## 프로젝트
코티지보드 홈페이지 / `cottage-board-site`

기준 시점: 2026-05-20

이 문서는 `FULL_TREE.txt` 실제 폴더 구조를 기준으로 v7에서 누락된 시스템 파일을 보강한 구조 문서다.
`node_modules/`는 의존성 폴더이므로 구조 문서의 핵심 관리 대상에서 제외한다.

---

## 루트 파일

```text
cottage-board-site/
├─ index.html
├─ owned-games.html
├─ store-usage-guide.html
├─ contact.html
├─ package.json
├─ package-lock.json
├─ .gitignore
└─ FULL_TREE.txt
```

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
현재 주요 작업 페이지.
- 전체게임 DB 탐색
- 게임명 검색
- 정렬
- 필터
- 페이지네이션
- 게임 상세 바텀시트 연결

### `store-usage-guide.html`
매장 이용 안내 페이지.
현재 파일은 존재함. 향후 내용/디자인 정리 필요.

### `contact.html`
문의하기 페이지.
현재 파일은 존재함. 향후 내용/디자인 정리 필요.

---

## assets

```text
assets/
├─ css/
│  └─ style.css
│
├─ images/
│  ├─ main/
│  │  ├─ hero.png
│  │  └─ logo.png
│  ├─ pages/
│  │  ├─ games/
│  │  ├─ guide/
│  │  └─ recommend/
│  └─ ui/
│
└─ js/
   ├─ script.js
   └─ view/
      └─ game-view-utils.js
```

### `assets/css/style.css`
전체 스타일 파일.
현재 owned-games 정렬/필터/카드 UI 관련 override가 많이 누적되어 있어 정리 대상.

주의 구역:
```text
.owned-sort-compact
.owned-sort-compact select
.owned-filter-line
.owned-filter-line select
.owned-sort-line
.owned-search-row
.owned-tools-toggle
.owned-toolbar
.owned-game-item
.owned-game-meta
```

현재 확인된 VS Code warning:
1. `-webkit-line-clamp` 사용 구역에 표준 `line-clamp` 추가 필요.
2. 비어 있는 legacy selector block 제거 필요.

### `assets/js/script.js`
메인 프론트 JS.

담당:
- 모바일 메뉴
- 헤더 검색
- 추천게임찾기 조건 상태
- 추천게임 렌더링
- 전체게임 검색/정렬/필터/페이지네이션
- 게임 상세 바텀시트

주요 함수/상태:
```text
ownedPageState
activateSortKey(key)
getSortOrderText(key, label)
updateSortOptionLabels()
updateSortOptionLabelsForOpen()
sortOwnedGames(games)
renderOwnedGameList()
openGameSheet(gameKey)
formatDifficultyWeight(value)
```

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

## game-system

```text
game-system/
├─ config/
│  ├─ difficulty-levels.js
│  ├─ shelf-groups.js
│  ├─ draft/
│  │  └─ auto-tag-rules.v1.draft.js
│  └─ tags/
│     ├─ mood-groups.js
│     ├─ play-tags.js
│     ├─ relationship-tags.js
│     └─ tag-utils.js
│
├─ game-data/
│  ├─ generated/
│  │  ├─ cache/
│  │  │  ├─ auto-english-candidates-cache.json
│  │  │  ├─ bgg-details-cache.json
│  │  │  ├─ bgg-match-result.json
│  │  │  ├─ bgg-search-cache.json
│  │  │  ├─ bgg-search-candidates.json
│  │  │  └─ legacy-bgg-all-games.js
│  │  └─ maps/
│  │     ├─ bgg-tag-translations.js
│  │     ├─ game-name-aliases.json
│  │     ├─ manual-bgg-matches.json
│  │     └─ mood-tag-rules.json
│  │
│  ├─ library/
│  │  ├─ games/
│  │  │  ├─ cottage-games-data.js
│  │  │  └─ cottage-games-data.json
│  │  ├─ images/
│  │  │  ├─ detail/
│  │  │  │  └─ splendor.png
│  │  │  └─ thumb/
│  │  │     └─ splendor.png
│  │  └─ manual/
│  │     ├─ forced-bgg-overrides.json
│  │     ├─ game-name-aliases.json
│  │     └─ mood-tag-rules.json
│  │
│  └─ source/
│     ├─ owned-games-normalized.js
│     ├─ owned-games-normalized.json
│     ├─ api/
│     ├─ csv/
│     │  └─ boardgames_ranks.csv
│     └─ manual/
│        ├─ cottage-owned-games.tsv
│        └─ cottage-owned-games.xlsx
│
└─ tools/
   ├─ convert-bgg.js
   ├─ build/
   │  └─ build-cottage-game-data.js
   ├─ core/
   │  ├─ normalize-game-name.js
   │  ├─ paths.js
   │  └─ read-write.js
   ├─ fetch/
   │  └─ fetch-bgg-details.js
   ├─ legacy/
   │  ├─ apply-manual-matches.js
   │  ├─ build-bgg-candidates.js
   │  ├─ fetch-bgg-details.js
   │  └─ match-owned-games-to-bgg.js
   ├─ match/
   │  ├─ auto-resolve-bgg-matches.js
   │  ├─ generate-auto-english-cache.js
   │  ├─ generate-auto-english-candidates.js
   │  ├─ generate-name-candidates.js
   │  ├─ score-bgg-candidates.js
   │  └─ search-bgg-candidates.js
   ├─ source/
   │  └─ convert-owned-xlsx.js
   └─ tagging/
      └─ auto-tag-rules.js
```

---

## config 계층

### `game-system/config/difficulty-levels.js`
난이도 구간 정의 파일.
프론트 표시와 추천/필터 기준의 기준값 역할.

### `game-system/config/shelf-groups.js`
게임책장/책장 분류의 canonical 정의 파일.
A/B/C 및 A-1/A-2 같은 내부 코드와 책장 라벨을 관리한다.

현재 확인된 대표 구조:
```text
A   파티게임
A-1 몸으로 하는 게임
A-2 1000피스 직소퍼즐
A-3 장난감
A-4 범용코인 · 포커칩 · 마작패
A-5 고객분실물
B   라이트패밀리게임
B-1 쉬운 협력게임
C   헤비 전략게임
C-1 어려운 협력게임
D   작은상자에 담긴 게임
E   2인 베스트게임
F   기타공간
```

주의:
- 손님 UI에서는 A/B/C 코드보다 읽히는 이름이 중요하다.
- 추천 표시명: `게임책장 · 파티게임 책장 - 몸으로 하는 게임` 또는 `게임책장 · 파티게임 - 몸으로 하는 게임`.
- 내부 데이터는 `shelfGroupId`로 연결한다.

### `game-system/config/tags/*`
추천/태그 시스템의 기준 정의 파일.
- `mood-groups.js`: 분위기 태그 그룹
- `play-tags.js`: 플레이/유형 태그
- `relationship-tags.js`: 관계/상황 태그
- `tag-utils.js`: 태그 유틸

---

## game-data 계층 의미

### `game-data/source/`
외부/수동 원본 데이터.
사람이 직접 관리하거나 외부에서 가져온 입력 원본.

핵심:
```text
source/manual/cottage-owned-games.xlsx
source/manual/cottage-owned-games.tsv
source/owned-games-normalized.json
source/owned-games-normalized.js
```

### `game-data/generated/`
자동 생성/캐시/중간 산출물.
직접 편집보다 tools 실행으로 갱신하는 영역.

### `game-data/library/`
홈페이지가 실제로 읽는 최종 라이브러리 데이터.

핵심:
```text
library/games/cottage-games-data.js
library/games/cottage-games-data.json
```

---

## tools 파이프라인

공식 실행 진입점:
```bash
node game-system/tools/convert-bgg.js
```

현재 canonical 흐름:
```text
autoResolveBggMatches()
→ fetchBggDetails()
→ buildCottageGameData()
→ cottage-games-data.js/json 생성
```

중요 파일:
```text
tools/build/build-cottage-game-data.js
tools/core/paths.js
tools/tagging/auto-tag-rules.js
tools/source/convert-owned-xlsx.js
```

---

## 현재 구조상 점검 필요 항목

### 1. manual / generated 중복
현재 다음 파일이 `library/manual`과 `generated/maps` 양쪽에 존재한다.

```text
game-name-aliases.json
mood-tag-rules.json
manual-bgg-matches.json
```

권장 원칙:
- 사람이 수정하는 원본은 `library/manual/` 또는 `source/manual/`에 둔다.
- `generated/`는 자동 생성 결과만 둔다.
- 어느 쪽이 authoritative source인지 `paths.js` 기준으로 확정해야 한다.

### 2. shelf-groups.js 문서 누락 문제 해결
v7 구조문서에는 `shelf-groups.js`가 누락되어 있었음.
이 때문에 이미 만든 책장 시스템을 못 찾고 중복 설계를 유도했음.
본 v8부터 공식 구조에 포함한다.

### 3. FULL_TREE 생성 규칙
다음부터는 node_modules를 제외한 트리만 생성한다.

PowerShell 권장:
```powershell
tree /F /A | findstr /V "node_modules" > FULL_TREE.txt
```

Git Bash 권장:
```bash
find . -path './node_modules' -prune -o -path './.git' -prune -o -print > FULL_TREE.txt
```
