# PROJECT_STRUCTURE.v3.md

# COTTAGEBOARD PROJECT STRUCTURE v3

## 0. 현재 구조 핵심

이번 버전의 핵심 변화는 데이터 원본 파이프라인이다.

기존에는 TSV 원본을 중심으로 build를 진행했으나, 현재는 XLSX 원본을 읽어 normalized JSON으로 변환한 뒤 build에 병합하는 방향으로 전환 중이다.

```txt
기존:
TSV
→ build-cottage-game-data.js
→ cottage-games-data.json

현재:
XLSX
→ convert-owned-xlsx.js
→ owned-games-normalized.json
→ build-cottage-game-data.js
→ cottage-games-data.json
```

장기 목표는 `add-game` 자동화다.

```txt
게임명 입력
→ BGG 자동매칭
→ BGG details fetch
→ autoTags 생성
→ 최종 gameData 반영
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
│  └─ js/
│     ├─ script.js
│     └─ view/
│        └─ game-view-utils.js
│
├─ docs/
│  ├─ PROJECT_STRUCTURE/
│  │  ├─ PROJECT_STRUCTURE.v1.md
│  │  ├─ PROJECT_STRUCTURE.v2_ADDENDUM.md
│  │  └─ PROJECT_STRUCTURE.v3.md
│  │
│  ├─ PROJECT_STATE/
│  │  ├─ PROJECT_STATE.v1.md
│  │  ├─ PROJECT_STATE.v2.md
│  │  ├─ PROJECT_STATE.v3.md
│  │  └─ PROJECT_STATE.v4.md
│  │
│  └─ TAG_SYSTEM/
│     ├─ COTTAGEBOARD_TAG_SURVEY.v1.md
│     └─ TAG_SYSTEM_DECISION.v1.md
│
└─ game-system/
   ├─ config/
   ├─ game-data/
   └─ tools/
```


---

## 2. assets 구조

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

### assets/js/script.js

현재 임시 통합 프론트 실행 파일이다.

역할:

- 모바일 메뉴
- 추천게임찾기 UI
- 추천게임 필터
- 게임 카드 렌더링
- 게임 상세 바텀시트
- 전체게임보기 리스트
- 전체게임보기 정렬/필터/페이지네이션

장기적으로 분리 후보:

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


### assets/js/view/game-view-utils.js

화면 출력용 view adapter다.

역할:

```txt
gameData = 출처/운영 기준 DB
CottageGameView = 화면/추천/상세페이지 기준 변환기
script.js = UI 렌더링 담당
```

중요 원칙:

`play` 계층은 DB에 만들지 않는다.

이유:

- bestPlayers, recommendedPlayers, playingTime 등은 출처상 bgg 또는 owned normalized 데이터에 가깝다.
- 화면에서 필요한 플레이 요약값은 view-utils에서 조립하는 것이 좋다.


---

## 3. docs 구조

```txt
docs/
├─ PROJECT_STRUCTURE/
├─ PROJECT_STATE/
└─ TAG_SYSTEM/
```

### docs/PROJECT_STRUCTURE

프로젝트의 폴더/파일/역할 구조를 기록한다.

현재 최신:

```txt
PROJECT_STRUCTURE.v3.md
```

### docs/PROJECT_STATE

현재 진행 상태, 결정사항, TODO, 다음방 이동 문구를 기록한다.

현재 최신:

```txt
PROJECT_STATE.v4.md
```

### docs/TAG_SYSTEM

추천 태그 시스템, 태그 축, 자동 태그 규칙, 수동 태그 기준을 기록한다.

현재 문서:

```txt
COTTAGEBOARD_TAG_SURVEY.v1.md
TAG_SYSTEM_DECISION.v1.md
```

주의:

`TAG_SYSTEM_DECISION.v1.md`는 기존 `docs/PROJECT_STATE/`가 아니라 `docs/TAG_SYSTEM/`에 두는 것이 적절하다.


---

## 4. game-system 구조

```txt
game-system/
├─ config/
├─ game-data/
└─ tools/
```

의미:

```txt
game-system
= 게임 데이터 생성/운영 시스템

assets
= 브라우저 출력 시스템

docs
= 프로젝트 상태/구조/태그 설계 문서
```


---

## 5. game-system/game-data 구조

현재 권장 구조:

```txt
game-system/game-data/
├─ source/
│  ├─ manual/
│  │  └─ cottage-owned-games.xlsx
│  │
│  ├─ owned-games-normalized.json
│  └─ owned-games-normalized.js
│
├─ library/
│  └─ games/
│     ├─ cottage-games-data.json
│     └─ cottage-games-data.js
│
├─ cache/
│  └─ bgg-details-cache.json
│
├─ matches/
│  └─ bgg-match-result.json
│
└─ manual/
   ├─ manual-bgg-matches.json
   └─ forced-bgg-overrides.json
```

### source/manual/cottage-owned-games.xlsx

사람이 관리하는 기존 보유게임 원본 엑셀이다.

현재 의미:

- 보유게임명
- 난이도
- 위치
- 메커니즘
- 긱평점
- 인원별 추천 여부
- 굵은글씨를 통한 베스트인원 표시

TSV로는 굵은글씨 정보가 사라지므로 XLSX 원본을 유지한다.

### source/owned-games-normalized.json

`convert-owned-xlsx.js`가 생성하는 중간 JSON이다.

역할:

- build가 읽기 쉬운 안정적인 데이터
- XLSX 서식 기반 데이터를 구조화한 결과
- recommendedPlayers / bestPlayers / supportsLargeGroup 보존

### library/games/cottage-games-data.json

최종 게임 데이터 JSON이다.

브라우저와 전체게임보기/추천게임찾기에서 사용하는 핵심 데이터다.

### library/games/cottage-games-data.js

브라우저에서 바로 사용할 수 있도록 `window.gameData`를 포함한 JS 버전이다.

### cache/bgg-details-cache.json

BGG Thing API details fetch 결과 캐시다.

현재는 fetch가 내부적으로 비활성화되어 있어 대부분 비어 있다.

### matches/bgg-match-result.json

보유게임명과 BGG id 매칭 결과다.

### manual/manual-bgg-matches.json

자동 매칭 실패 시 수동 연결용이다.

### manual/forced-bgg-overrides.json

자동 매칭이 틀렸을 때 강제 교정하는 파일이다.


---

## 6. game-system/tools 구조

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

공식 build 실행 진입점이다.

현재 pipeline:

```txt
autoResolveBggMatches
→ fetchBggDetails
→ buildCottageGameData
```

주의:

`ENABLE_FETCH_BGG_DETAILS = true`여도 `fetch-bgg-details.js` 내부에서 Thing API가 비활성화되어 있으면 실제 details fetch는 진행되지 않는다.


### tools/source/convert-owned-xlsx.js

새로 추가된 XLSX normalizer다.

역할:

```txt
cottage-owned-games.xlsx
→ owned-games-normalized.json
→ owned-games-normalized.js
```

필요 패키지:

```bash
npm.cmd install exceljs
```

실행:

```bash
node game-system/tools/source/convert-owned-xlsx.js
```


### tools/build/build-cottage-game-data.js

최종 gameData 생성기다.

입력:

```txt
기존 TSV 원본 또는 추후 normalized source
BGG match result
BGG details cache
owned-games-normalized.json
auto-tag-rules.js
```

출력:

```txt
cottage-games-data.json
cottage-games-data.js
```

현재 진행 중:

- `ownedGamesNormalized` merge
- `recommendedPlayers / bestPlayers / supportsLargeGroup` 최종 반영
- TSV 의존도 축소


### tools/tagging/auto-tag-rules.js

자동 태그 규칙 파일이다.

역할:

- difficultyWeight → difficultyId 변환
- difficulty 기반 autoTags 생성
- BGG mechanics/categories 기반 autoTags 생성 준비
- manualTags / autoTags / displayTags 병합

현재 기준:

```txt
kids          0.00 ~ 1.10
beginner      1.11 ~ 1.50
light_family  1.51 ~ 2.50
heavy_mania   2.51 ~ 3.50
hardcore      3.51 ~ 5.00
```


### tools/core/paths.js

모든 주요 경로를 중앙 관리한다.

이번에 추가해야 하는 경로:

```js
OWNED_GAMES_NORMALIZED_PATH
```

추천 값:

```js
const OWNED_GAMES_NORMALIZED_PATH =
  path.join(
    GAME_DATA_DIR,
    "source/owned-games-normalized.json"
  );
```


---

## 7. 최종 gameData schema 방향

최종 gameData는 아래 큰 영역으로 나눈다.

```txt
id
title
bgg
cottage
images
community
```

현재 방향:

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
    description,

    supportsLargeGroup
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

주의:

`supportsLargeGroup`의 위치는 아직 확정 전이다.

후보:

```txt
bgg.supportsLargeGroup
cottage.supportsLargeGroup
view-utils에서 계산
```

현재는 추천 필터용 파생값에 가까우므로 view-utils에서 계산하거나 bgg 계층에 임시 보관하는 방식이 가능하다.


---

## 8. 추천게임찾기 구조

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
```

추가된 UX:

```txt
상관없어요
= 해당 조건을 보지 않음
= 필터 해제
```

상관없어요 아이콘:

```txt
⊘
```

CSS:

```css
.recommend-inline-option.is-none-option::before{
  content:"⊘";
  color:#c85a5a;
  margin-right:4px;
}
```

분위기 버튼은 1차 UI 값이고, 실제 내부 검색은 여러 태그로 확장한다.

```js
const moodTagMap = {
  fun: ["funny", "light", "party"],
  brain: ["brainy", "strategy", "puzzle"],
  talk: ["table_talk", "deduction", "bluffing"],
  immersive: ["immersive", "tense", "long_stay"],
  cozy: ["cozy", "low_conflict", "beginner", "light"]
};
```


---

## 9. 향후 add-game 자동화 구조

장기 목표:

```txt
새 게임명만 입력
↓
BGG 자동 매칭
↓
BGG details fetch
↓
autoTags 생성
↓
최종 gameData 업데이트
```

후보 형태:

```txt
CMD 입력
EXE
로컬 입력창
관리자 웹 페이지
서버 직접 입력
모바일 관리 화면
```

현재 결정:

- 지금은 XLSX 기존 운영 데이터를 보존한다.
- TSV에는 더 투자하지 않는다.
- 최종적으로는 add-game 자동화로 넘어간다.
- 서버 호스팅 시 파일을 매번 업로드하지 않고 직접 입력 가능한 구조를 검토한다.


---

## 10. 다음 작업 기준

다음방에서는 아래 순서로 진행한다.

```txt
1. PROJECT_STATE.v4 / PROJECT_STRUCTURE.v3 기준 확인
2. paths.js의 OWNED_GAMES_NORMALIZED_PATH 추가 확인
3. build-cottage-game-data.js에서 ownedGamesNormalized readJson 확인
4. buildRawGameItem()에서 normalizedOwned 참조 확인
5. getSuggestedPlayers(details, normalizedOwned) 완성
6. bestPlayers / recommendedPlayers / supportsLargeGroup 최종 반영
7. convert-owned-xlsx.js 실행
8. convert-bgg.js 실행
9. cottage-games-data.json 결과 확인
10. 추천게임찾기 인원 필터 복구
```


---

# 11. v4 추가 구조 메모

## 추천게임 상세페이지 현재 구조

현재 상세페이지는:

- 핵심 정보 카드
- 추천 인원
- 난이도
- 플레이 시간
- 룰 설명 영상
- 디자이너
- 비슷한 게임

구조를 중심으로 확장 중이다.

참고 레이아웃:
- 보드라이프 상세페이지 참고

---

## 추천게임 인원 정책

현재 추천게임찾기 및 상세페이지는:

- bestPlayers 중심
- recommendedPlayers 보조표시
- 플레이 가능 인원(min/maxPlayers) 비노출

방향으로 정리 완료.

---

## 현재 프론트 핵심 수정 포인트

현재 대부분 작업은:

assets/js/script.js
assets/css/style.css

에서 진행 중이다.

주요 변경:
- renderGameCards()
- openGameSheet()
- matchRecommendPlayer()
- formatPlayers()
- formatDifficultyWeight()
- formatDifficultyLabel()

관련 CSS:
- .recommend-empty
- .player-sub-info
- .difficulty-sub-info
- .sheet-info-grid

---

# 12. v5 추가 구조 메모

## 12-1. assets/js/script.js 상세페이지 현재 구조

`openGameSheet(gameKey)`는 추천게임 카드와 전체게임 목록 카드 양쪽에서 공통으로 사용하는 상세 바텀시트 렌더링 함수다.

현재 상세페이지 구조:

```txt
gameSheetContent
├─ sheet-image
│  └─ img
│
└─ sheet-content
   ├─ level-badge
   ├─ h3 title
   ├─ sheet-description
   │
   ├─ sheet-info-grid
   │  ├─ bestPlayers
   │  ├─ difficultyWeight + difficultyLabel
   │  ├─ rating
   │  └─ playingTime
   │
   ├─ sheet-data-section
   │  └─ sheet-data-list
   │     ├─ rating
   │     ├─ mechanics
   │     └─ categories
   │
   ├─ ruleSummary section
   ├─ recommendPoint section
   ├─ caution section
   ├─ youtubeUrl section
   └─ designers section
```

보존해야 하는 핵심 정보 구조:

```txt
formatPlayers(detail.bestPlayers)
베스트 인원
(추천 formatPlayers(detail.recommendedPlayers))

formatDifficultyWeight(detail.difficultyWeight)
난이도
formatDifficultyLabel(difficulty)
```

이 구조는 사용자가 직접 미세 조정한 핵심 UX이므로, 이후 레이아웃 개선 시에도 의미를 유지한다.


---

## 12-2. 추천게임 목록 정렬 구조

`renderGameCards()`는 추천 조건 선택 후 결과 배열을 생성하고 카드로 렌더링한다.

현재 정렬 구조:

```txt
filter
→ sort
→ slice(0, 40)
→ card render
```

정렬 기준:

```txt
1. rating desc
2. difficultyWeight asc
```

즉 추천게임은 평점 높은 게임을 먼저 보여주고, 같은 평점이면 더 쉬운 게임을 먼저 보여준다.


---

## 12-3. 전체게임 페이지 HTML 정리 구조

기존 `owned-games.html`에는 중복 UI가 있었다.

정리 후 구조:

```txt
body.owned-page
├─ header.site-header
│
├─ main
│  └─ section.owned-games-page
│     ├─ h1
│     ├─ div.owned-toolbar
│     │  └─ div.owned-sort-grid
│     │     ├─ p.owned-control-title 정렬
│     │     ├─ sortTitle select
│     │     ├─ sortWeight select
│     │     ├─ sortRating select
│     │     ├─ owned-control-divider
│     │     ├─ p.owned-control-title 필터
│     │     ├─ ownedDifficultyFilter select
│     │     └─ ownedMechanicFilter select
│     │
│     ├─ div#ownedGameList
│     └─ div#ownedPagination
│
├─ div#gameSheet
│  └─ shared game sheet
│
└─ scripts
   ├─ bgg-tag-translations.js
   ├─ cottage-games-data.js
   ├─ game-view-utils.js
   └─ script.js
```

중요:

```txt
ownedDifficultyFilter / ownedMechanicFilter id는 문서 내 1번만 존재해야 한다.
ownedGameList / ownedPagination도 1번만 존재해야 한다.
```


---

## 12-4. 전체게임 목록 카드 구조

현재 `renderOwnedGameList()` 출력 구조:

```txt
button.owned-game-item
├─ img
└─ div.owned-game-info
   ├─ strong title
   └─ p meta text
```

현재 meta text:

```txt
👥 bestPlayers · ⏱ playingTime · difficultyIcon difficultyWeight · ⭐ rating
```

향후 개선 후보:

```txt
button.owned-game-item
├─ img
└─ div.owned-game-info
   ├─ strong title
   └─ div.owned-game-meta
      ├─ span players
      ├─ span playingTime
      ├─ span difficulty
      └─ span rating
```

이 구조로 바꾸면 CSS에서 각 정보를 pill 형태로 다듬기 쉽다.


---

## 12-5. game-system/build fallback 구조

`build-cottage-game-data.js`에서 API details가 없는 동안 `owned-games-normalized.json`을 fallback으로 사용한다.

현재 추가된 fallback:

```txt
bgg.rating
bgg.weight
bgg.minPlayers
bgg.maxPlayers
bgg.mechanics
```

데이터 계층상 엄밀히는 `sourceMechanism`이 BGG mechanics는 아니지만, API 전까지 화면/필터를 위한 임시 fallback으로 허용한다.

categories는 현재 fallback 없음.

이유:

```txt
엑셀에 일관된 category source가 없고,
ranks CSV에도 category가 없으므로
API 또는 별도 categories CSV가 필요하다.
```


---

## 12-6. API 전/후 상세페이지 구조 원칙

API 전:

```txt
- 평점/인원/난이도 중심으로 상세페이지를 구성한다.
- mechanics/categories/designers/year/description/image는 자리만 열어둔다.
- mock 데이터는 헷갈림 방지를 위해 넣지 않는다.
```

API 후:

```txt
- categories / mechanics / designers / year / description / image를 자동 반영한다.
- 게임 정보 섹션이 자연스럽게 확장된다.
- 디자이너 다른 작품 / 관련 게임 / 사진 갤러리 섹션을 추가 검토한다.
```


---

## 12-7. 현재 최신 파일 산출물

이번 작업방에서 생성한 다음방용 파일:

```txt
owned-games.cleaned.html
PROJECT_STATE.v6.md
PROJECT_STRUCTURE.v5.md
cottageboard_next_docs_v6_full.zip
```

주의:

이전 `cottageboard_next_docs_v6.zip`은 요약본 성격이 강했으므로 폐기하고, 새 full 버전을 사용한다.
