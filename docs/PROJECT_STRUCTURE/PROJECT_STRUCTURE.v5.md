# COTTAGEBOARD PROJECT STRUCTURE v5

## 0. 현재 구조 핵심

현재 프로젝트는 세 영역으로 나눈다.

```txt
assets
= 브라우저 화면 출력 시스템

game-system
= 게임 데이터 생성/운영 시스템

docs
= 프로젝트 상태/구조/태그 설계 문서
```

현재 핵심 흐름:

```txt
XLSX
→ owned-games-normalized.json
→ build-cottage-game-data.js
→ cottage-games-data.json / cottage-games-data.js
→ game-view-utils.js
→ script.js
→ index.html / owned-games.html
```


---

## 1. 전체 루트 구조

```txt
ROOT
├─ index.html
├─ owned-games.html
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
│
├─ docs/
│  ├─ PROJECT_STRUCTURE/
│  ├─ PROJECT_STATE/
│  └─ TAG_SYSTEM/
│
└─ game-system/
   ├─ config/
   ├─ game-data/
   └─ tools/
```


---

## 2. 프론트 HTML 구조

### index.html

역할:

```txt
홈페이지 메인
추천게임찾기
추천게임 결과 카드
게임 상세 바텀시트
```

사용 스크립트 순서:

```html
<script src="./game-data/generated/maps/bgg-tag-translations.js"></script>
<script src="./game-data/library/games/cottage-games-data.js"></script>
<script src="./assets/js/view/game-view-utils.js"></script>
<script src="./assets/js/script.js"></script>
```

중요:

`game-view-utils.js`는 `script.js`보다 먼저 로드되어야 한다.


### owned-games.html

역할:

```txt
전체 게임 보기 페이지
정렬/필터 UI
전체게임 목록
게임 상세 바텀시트 연결
```

현재 정리 방향:

```txt
- 카드형 정렬/필터 UI만 유지
- 중복 owned-control 제거
- ownedGameList 1개만 유지
- ownedPagination 1개만 유지
- body class="owned-page" 적용
- game-view-utils.js를 script.js보다 먼저 로드
```

정리된 구조:

```txt
owned-games-page
├─ h1
├─ owned-toolbar
│  └─ owned-sort-grid
│     ├─ 정렬
│     │  ├─ 이름 sortTitle
│     │  ├─ 난이도 sortWeight
│     │  └─ 평점 sortRating
│     │
│     └─ 필터
│        ├─ 체감 난이도 ownedDifficultyFilter
│        └─ 메커니즘 ownedMechanicFilter
│
├─ ownedGameList
└─ ownedPagination
```


---

## 3. assets 구조

```txt
assets/
├─ css/
│  └─ style.css
│
└─ js/
   ├─ script.js
   └─ view/
      └─ game-view-utils.js
```


### assets/js/view/game-view-utils.js

역할:

```txt
최종 gameData를 화면용 detail/card/recommend data로 변환하는 adapter
```

중요 원칙:

```txt
DB schema와 화면 schema를 직접 섞지 않는다.
script.js는 가능하면 GameView를 통해 화면용 값을 받는다.
```

사용 함수 후보:

```txt
GameView.getAllGamesArray()
GameView.getGameCardData()
GameView.getRecommendData()
GameView.getGameDetailData()
GameView.getGameImage()
GameView.getGameMainImage()
```


### assets/js/script.js

현재 임시 통합 프론트 실행 파일이다.

역할:

```txt
- 모바일 메뉴
- 추천게임찾기 UI
- 추천게임 필터
- 추천게임 카드 렌더링
- 게임 상세 바텀시트
- 전체게임보기 리스트
- 전체게임보기 정렬/필터/페이지네이션
```

현재 주요 함수:

```txt
showRecommendPage()
showHomePage()

getDifficultyData()
normalizeLevelValue()

formatDifficultyWeight()
formatDifficultyLabel()
formatPlayers()
formatRecommendedPlayers()
formatPlayTime()

matchRecommendPlayer()
matchRecommendLevel()
matchRecommendMood()

renderGameCards()
bindGameCardEvents()

openGameSheet()
closeGameSheet()

updateRecommendFilterText()
showRecommendResults()
backToHero()

sortOwnedGames()
renderMechanicOptions()
renderOwnedPagination()
renderOwnedGameList()
```

장기 분리 후보:

```txt
assets/js/
├─ script.js
├─ view/
│  └─ game-view-utils.js
├─ recommend/
│  └─ recommend.js
├─ owned-games/
│  └─ owned-games.js
├─ game-sheet/
│  └─ game-sheet.js
└─ menu/
   └─ menu.js
```


---

## 4. 추천게임찾기 구조

현재 UI 축:

```txt
1. 인원
2. 난이도
3. 분위기
```

원칙:

```txt
조건은 1개 이상만 선택해도 결과가 나온다.
선택하지 않은 축은 필터에서 무시한다.
상관없어요는 해당 축의 필터 해제 역할이다.
```

추천 결과 정렬:

```txt
1순위: 평점 높은 순
2순위: 같은 평점이면 난이도 낮은 순
```

렌더링 함수:

```txt
renderGameCards()
```

결과 카드 클릭 시:

```txt
openGameSheet(gameKey)
```


---

## 5. 게임 상세 바텀시트 구조

상세페이지 담당:

```txt
openGameSheet(gameKey)
```

현재 핵심 구조:

```txt
sheet-image
sheet-content
├─ level-badge
├─ title
├─ sheet-description
├─ sheet-info-grid
│  ├─ 베스트 인원
│  ├─ 난이도
│  ├─ 평점
│  └─ 플레이 시간
│
├─ sheet-data-section
│  └─ sheet-data-list
│     ├─ 평점
│     ├─ 진행방식
│     └─ 테마
│
├─ 간단 게임 규칙
├─ 이런 분께 추천해요
├─ 참고하면 좋아요
├─ 룰 설명 영상
└─ 디자이너
```

보존해야 하는 핵심 정보 구조:

```txt
베스트 인원
(추천 n명)

난이도 숫자
(체감 난이도 라벨)
```

이 구조는 사용자가 신경 써서 미세 조정한 부분이므로, 이후 레이아웃 수정 시에도 유지한다.

현재 게임 정보 섹션은 API 전 자리 만들기 성격이 강하다.

```txt
- 평점은 현재 표시 가능
- 진행방식은 mechanics 데이터가 있으면 표시
- 테마는 categories 데이터가 있으면 표시
```


---

## 6. style.css 구조

현재 `assets/css/style.css`는 다음 큰 영역으로 구성되어 있다.

```txt
1. RESET / TOKENS
2. HEADER
3. HERO
4. RECOMMEND RESULT
5. GAME CARD
6. RECOMMEND MODAL
7. GAME SHEET
8. RESPONSIVE
9. RECOMMEND FILTER V2/V3
10. OWNED GAMES PAGE
11. OWNED CONTROLS
12. DETAIL PATCHES
```

상세페이지 관련 주요 클래스:

```txt
.game-sheet
.game-sheet-panel
.game-sheet-close
.sheet-image
.sheet-content
.level-badge
.sheet-description
.sheet-info-grid
.player-sub-info
.difficulty-sub-info
.sheet-section
.sheet-data-section
.sheet-data-list
.sheet-youtube-link
```

전체게임 페이지 관련 주요 클래스:

```txt
.owned-games-page
.owned-toolbar
.owned-sort-grid
.owned-sort-item
.owned-control-title
.owned-control-divider
#ownedGameList
.owned-game-item
.owned-game-info
.owned-pagination
```


---

## 7. game-system 구조

```txt
game-system/
├─ config/
├─ game-data/
└─ tools/
```


### game-system/game-data

현재 권장 구조:

```txt
game-system/game-data/
├─ source/
│  ├─ manual/
│  │  └─ cottage-owned-games.xlsx
│  │
│  ├─ csv/
│  │  └─ boardgames_ranks.csv
│  │
│  ├─ owned-games-normalized.json
│  └─ owned-games-normalized.js
│
├─ generated/
│  ├─ cache/
│  │  ├─ bgg-match-result.json
│  │  ├─ bgg-search-cache.json
│  │  ├─ bgg-details-cache.json
│  │  ├─ auto-english-candidates-cache.json
│  │  └─ bgg-search-candidates.json
│  │
│  └─ maps/
│     └─ bgg-tag-translations.js
│
└─ library/
   ├─ games/
   │  ├─ cottage-games-data.json
   │  └─ cottage-games-data.js
   │
   └─ manual/
      ├─ forced-bgg-overrides.json
      ├─ game-name-aliases.json
      ├─ manual-bgg-matches.json
      └─ mood-tag-rules.json
```


---

## 8. game-system/tools 구조

현재 권장 구조:

```txt
game-system/tools/
├─ convert-bgg.js
│
├─ core/
│  ├─ paths.js
│  └─ read-write.js
│
├─ source/
│  └─ convert-owned-xlsx.js
│
├─ build/
│  └─ build-cottage-game-data.js
│
├─ tagging/
│  └─ auto-tag-rules.js
│
├─ match/
│  ├─ auto-resolve-bgg-matches.js
│  ├─ match-owned-games-to-bgg.js
│  ├─ build-bgg-candidates.js
│  └─ apply-manual-matches.js
│
└─ fetch/
   └─ fetch-bgg-details.js
```


### tools/convert-bgg.js

공식 build 실행 진입점.

현재 pipeline:

```txt
autoResolveBggMatches
→ fetchBggDetails
→ buildCottageGameData
```


### tools/source/convert-owned-xlsx.js

역할:

```txt
cottage-owned-games.xlsx
→ owned-games-normalized.json
→ owned-games-normalized.js
```

실행:

```bash
node game-system/tools/source/convert-owned-xlsx.js
```


### tools/build/build-cottage-game-data.js

최종 gameData 생성기.

현재 입력:

```txt
COTTAGE_OWNED_GAMES_TSV_PATH
BGG_MATCH_RESULT_PATH
BGG_DETAILS_CACHE_PATH
OWNED_GAMES_NORMALIZED_PATH
auto-tag-rules.js
```

현재 출력:

```txt
cottage-games-data.json
cottage-games-data.js
```

현재 fallback 반영:

```txt
rating
weight
minPlayers
maxPlayers
bestPlayers
recommendedPlayers
mechanics
```

주의:

아직 TSV를 완전히 폐기하지 않았고, `ownedRows`는 여전히 TSV에서 파싱한다. XLSX normalized JSON은 fallback/보강 데이터로 사용 중이다.


---

## 9. 최종 gameData schema 현재 방향

최종 gameData는 아래 큰 영역으로 나눈다.

```txt
id
title
bgg
cottage
images
community
```

현재 주요 구조:

```js
{
  id,

  title: {
    display,
    owned,
    bgg
  },

  bgg: {
    id,
    matchStatus,
    year,
    rating,
    weight,
    minPlayers,
    maxPlayers,
    bestPlayers,
    recommendedPlayers,
    notRecommendedPlayers,
    playingTime,
    minPlayTime,
    maxPlayTime,
    categories,
    mechanics,
    designers,
    description
  },

  cottage: {
    status,
    shelfGroupId,
    difficultyId,
    difficultyWeight,

    moodTags,
    playTags,
    situationTags,
    interactionTags,
    relationshipTags,

    manualTags,
    autoTags,
    displayTags,

    comment,
    ruleSummary,
    recommendPoint,
    caution,
    youtubeUrl
  },

  images: {
    main,
    thumbnail,
    source,
    type
  },

  community: {
    reviewEnabled,
    ratingEnabled,
    boardId
  }
}
```


---

## 10. API 전/후 구조 원칙

API 전:

```txt
정확한 categories/mechanics/designers/image/description 완성보다
레이아웃 자리와 fallback 구조를 우선한다.
```

API 후:

```txt
details.average
details.averageweight
details.minplayers/maxplayers
details.suggested_numplayers
details.playingtime
details.categories
details.mechanics
details.designers
details.description
details.image/thumbnail
```

이 값을 최종 gameData에 자동 반영한다.

mock 데이터는 헷갈림 방지를 위해 현재 보류한다.


---

## 11. 다음 작업 기준

다음방에서는 아래 순서로 진행한다.

```txt
1. owned-games.html 정리본 교체
2. 전체게임 페이지에서 중복 select 제거 확인
3. 전체게임 목록 카드 UI 개선
4. renderOwnedGameList()의 meta 정보를 span 기반으로 바꿀지 판단
5. 상세페이지 CSS polish
6. API details fetch 또는 add-game 설계로 이동
```
