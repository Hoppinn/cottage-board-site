# PROJECT_STATE.v3.md

# COTTAGEBOARD PROJECT STATE

## 0. 현재 작업 단계

현재는 UI 세부 디자인 단계가 아니라, `game-system` 기준 데이터/tools 파이프라인과 프론트 출력 구조를 재정렬하는 단계다.

이번 작업방에서는 다음 큰 구조 전환을 진행했다.

- 기존 납작한 gameData 구조를 nested schema 방향으로 전환
- `bgg / cottage / images / community` 구분 확정
- `play` 계층은 DB 안에 두지 않고 view adapter에서 출력용으로 조립하는 방향 확정
- `assets/js/view/game-view-utils.js` 계층 생성
- `script.js`를 새 nested schema 기준으로 전체 교체
- `style.css` 정리
- 파일 출력 workflow를 zip 다운로드 방식으로 전환
- 태그 축 설문조사 v1 생성


---

## 1. 현재 canonical 기준

현재 기준 문서:

```txt
docs/
├─ PROJECT_STRUCTURE/
│  └─ PROJECT_STRUCTURE.v1.md
│
└─ PROJECT_STATE/
   ├─ PROJECT_STATE.v1.md
   ├─ PROJECT_STATE.v2.md
   └─ PROJECT_STATE.v3.md
```

현재 최신 state:

```txt
PROJECT_STATE.v3.md
```

현재 구조 기준:

```txt
ROOT
├─ index.html
├─ owned-games.html
├─ assets/
│  ├─ css/
│  │  └─ style.css
│  └─ js/
│     ├─ script.js
│     └─ view/
│        └─ game-view-utils.js
├─ docs/
│  ├─ PROJECT_STRUCTURE/
│  └─ PROJECT_STATE/
└─ game-system/
   ├─ config/
   ├─ game-data/
   └─ tools/
```


---

## 2. 출력 workflow 확정

앞으로 긴 전문 출력은 기본적으로 채팅창 전문 복붙이 아니라:

```txt
파일 생성
↓
zip 압축
↓
다운로드
↓
기존 파일 교체
```

방식을 우선한다.

특히 아래 파일들은 zip 다운로드 방식 우선:

- JS 전문
- CSS 전문
- HTML 전문
- MD 전문
- JSON 전문

이 방식이 현재 사용자 작업 흐름에 가장 잘 맞고, 렉과 복사 실수를 줄인다.


---

## 3. 현재 완료된 주요 작업

### 3-1. build-cottage-game-data.js 교체

파일 위치:

```txt
game-system/tools/build/build-cottage-game-data.js
```

역할:

- TSV 원본
- BGG 매칭 결과
- BGG 상세 캐시

를 병합하여 최종 gameData를 생성한다.

현재 생성 schema는 nested 구조다.

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

현재 `difficultyId`에 `"1.10"` 같은 숫자형 난이도 값이 들어간 항목이 많다.  
이 값은 장기적으로 `difficultyWeight`로 옮기고, `difficultyId`는 아래처럼 분류형 id가 들어가야 한다.

```txt
kids
beginner
light_family
heavy_mania
hardcore
```

즉 다음 리팩토링 후보:

```txt
difficultyId 숫자값 문제 해결
difficultyWeight 자동 보정
difficultyId 자동 변환
```


---

## 4. game-view-utils.js 생성

파일 위치:

```txt
assets/js/view/game-view-utils.js
```

역할:

`gameData`를 화면 출력용 데이터로 변환하는 view adapter다.

핵심 원칙:

```txt
gameData = 출처/운영 기준 DB
CottageGameView = 화면/추천/상세페이지 기준 변환기
script.js = UI 렌더링 담당
```

즉 `script.js`가 직접 아래처럼 깊은 경로를 계속 뒤지지 않게 한다.

```js
game.bgg.weight
game.cottage.displayTags
game.images.thumbnail
```

대신 아래처럼 중앙 변환 함수를 사용한다.

```js
CottageGameView.getGameCardData(game)
CottageGameView.getGameDetailData(game)
CottageGameView.getRecommendData(game)
```

현재 주요 함수:

```txt
getGameCardData
getGameDetailData
getRecommendData
getDisplayTitle
getDifficultyWeight
getBestPlayersText
getRecommendedPlayersText
getPrimaryPlayersText
getPlayingTimeText
getPlayingTimeGroup
getDisplayTags
getPrimaryTags
getSearchText
```

중요한 설계 판단:

`play` 계층은 DB에 만들지 않는다.

이유:

- DB는 출처/운영 기준으로 보관
- 플레이 요약값은 화면 출력용에 가까움
- `play`는 view-utils에서 조립하는 게 낫다


---

## 5. script.js 교체

파일 위치:

```txt
assets/js/script.js
```

현재 역할:

- 모바일 메뉴
- 추천게임찾기 영역
- 추천 필터
- 게임 카드 렌더링
- 게임 상세 바텀시트
- 전체게임보기 리스트
- 정렬/필터/페이지네이션

현재 script.js는 새 nested schema를 직접 읽지 않고, 대부분 `CottageGameView`를 통해 읽도록 수정되었다.

주의:

아직 완전 분리된 상태는 아니다.  
장기적으로 아래처럼 나누는 것이 좋다.

```txt
assets/js/
├─ script.js              // 임시 통합 진입점
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

## 6. style.css 정리

파일 위치:

```txt
assets/css/style.css
```

이번 정리 내용:

- CSS 파일 안에 섞여 있던 HTML 조각 제거
- `#recommend.is-hidden`이어도 아래로 자연 스크롤 가능하도록 조정
- 히어로를 숨겨 추천 페이지로 전환하는 방식 제거
- 추천게임찾기를 누르지 않아도 히어로 아래 추천 영역으로 내려갈 수 있게 수정
- owned-games 정렬/필터 CSS 분리 정리

주의:

가로 스와이프로 index/owned-games 페이지 전환 기능은 핵심 기능이 아니므로 보류했다.

브라우저/DevTools 기본 히스토리 스와이프와 충돌이 있어 커스텀 구현은 제거/복구하는 방향이 맞다.


---

## 7. 태그 시스템 방향

기존 태그 축:

```txt
moodTags
playTags
relationshipTags
manualTags
autoTags
displayTags
```

이번 논의에서 `relationshipTags`가 너무 넓다는 판단을 했다.

새 방향:

```txt
moodTags = 분위기 / 감정
playTags = 플레이 행동 / 재미 방식
situationTags = 누구랑 / 언제 / 사용 상황
interactionTags = 플레이어 간 관계 구조
manualTags = 사람이 직접 붙인 보정 태그
autoTags = 자동 규칙으로 생성된 태그
displayTags = 화면에 보여줄 대표 태그
```

즉 장기적으로:

```txt
relationshipTags
↓
situationTags
interactionTags
```

로 분리한다.

예:

```txt
situationTags:
date
friends
family
group
beginner
experienced
couple
large_group
quick_play
long_stay
first_game

interactionTags:
competitive
cooperative
team
hidden_role
betrayal
semi_coop
take_that
low_conflict
simultaneous
turn_based
table_talk
silent_focus
```


---

## 8. 태그 선택 원칙

중요 원칙:

```txt
모든 태그 축을 반드시 채워야 하는 구조로 만들지 않는다.
```

이유:

- 태그가 너무 많으면 입력/관리 피로가 커진다.
- 추천게임찾기에서 손님도 모든 조건을 고르고 싶어하지 않는다.
- 일부 축만 있어도 추천 결과가 나와야 한다.
- 태그 시스템은 완전 분류가 아니라 추천 정확도를 높이는 보조 장치다.

따라서 추천 필터는 아래처럼 동작해야 한다.

```txt
아무 조건 없음
→ 결과 숨김 또는 기본 추천

인원만 선택
→ 인원 기준으로 추천 출력

난이도만 선택
→ 난이도 기준으로 추천 출력

분위기만 선택
→ 분위기 기준으로 추천 출력

인원 + 분위기 선택
→ 두 조건 기준으로 추천 출력

인원 + 난이도 + 분위기 선택
→ 세 조건 기준으로 추천 출력
```

즉 필터 조건은 AND 기반이지만, 선택되지 않은 축은 무시한다.

개발 기준:

```js
const matched =
  (!playerValue || matchPlayer(game, playerValue)) &&
  (!levelValue || matchLevel(game, levelValue)) &&
  (!moodValue || matchMood(game, moodValue));
```

이 원칙은 이미 추천게임찾기에서도 중요하게 적용되어야 한다.


---

## 9. 태그 설문조사 파일

이번 작업에서 생성한 파일:

```txt
COTTAGEBOARD_TAG_SURVEY.v1.md
auto-tag-rules.v1.draft.js
```

압축 파일명:

```txt
tag-survey-v1.zip
```

역할:

- 태그 축 정리
- 선택지 후보 제시
- auto-tag-rules.js 설계 전 설문조사 기준표
- 사용자에게 직접 매핑을 요구하지 않고, 선택지형으로 판단하게 하기 위한 문서

다음방에서 이 파일을 기준으로 태그 선택지를 줄이고/수정한 뒤 `auto-tag-rules.js`를 생성하면 된다.


---

## 10. 현재 데이터 상태

현재 `cottage-games-data.json`은 생성되었지만 BGG 상세 fetch가 꺼져 있어 다음 값들이 대부분 비어 있다.

```txt
bgg.rating = 0
bgg.weight = 0
bgg.minPlayers = 0
bgg.maxPlayers = 0
bgg.bestPlayers = []
bgg.recommendedPlayers = []
bgg.playingTime = 0
bgg.categories = []
bgg.mechanics = []
bgg.designers = []
bgg.description = ""
images.main = ""
images.thumbnail = ""
```

원인:

```txt
fetch-bgg-details.js에서 BGG Thing API fetch가 아직 비활성화되어 있음
```

따라서 auto-tag-rule을 제대로 적용하려면 이후 단계에서 BGG details cache 확보가 필요하다.

다만 지금은 태그 축과 구조 설계를 먼저 잡고 있다.


---

## 11. 현재 미완 핵심

- BGG details fetch 활성화 여부 검토
- bgg-details-cache.json 채우기
- difficultyId / difficultyWeight 구조 수정
- situationTags / interactionTags schema 추가
- auto-tag-rules.js 정식 생성
- build-cottage-game-data.js에 auto-tag merge 적용
- manualTags + autoTags + displayTags 병합 규칙 확정
- 추천게임찾기에서 모든 축 필수 선택이 아니라 1~2개 조건만으로도 출력되는 구조 유지/검증
- 전체게임보기 검색/필터 강화
- script.js 역할 분리
- style.css 추가 정리
- game-system/config와 프론트 DIFFICULTY_LEVELS 중복 제거
- add-game 자동화 시스템
- CMD/EXE/입력창 기반 새 게임 추가 시스템
- 서버 직접 입력 + 모바일 관리 구조


---

## 12. 다음방 우선 작업 추천

다음방에서는 바로 코드부터 만들지 말고 아래 순서로 간다.

```txt
1. PROJECT_STRUCTURE.v1 / PROJECT_STATE.v3 기준 확인
2. 태그 설문지 v1 검토
3. 태그 선택지 줄이기
4. situationTags / interactionTags 최종 도입 여부 확정
5. difficultyId / difficultyWeight 정리
6. auto-tag-rules.js 정식 생성
7. build-cottage-game-data.js에 auto-tag merge 적용
8. convert-bgg 실행
9. cottage-games-data.json 결과 확인
10. PROJECT_STATE.v4 갱신
```


---

## 13. 다음방 첫 메시지

아래 문구로 시작하면 된다.

```txt
코티지보드 홈페이지 프로젝트 이어서 간다.

Canonical:
- PROJECT_STRUCTURE.v1 기준
- PROJECT_STATE.v3 기준

현재 구조:
- gameData는 nested schema 방향
- bgg / cottage / images / community 구분
- play 계층은 DB에 두지 않고 assets/js/view/game-view-utils.js에서 출력용으로 조립
- script.js와 style.css는 zip 파일 교체 workflow로 정리됨
- 태그 축은 moodTags / playTags / situationTags / interactionTags / manualTags / autoTags / displayTags 방향
- relationshipTags는 장기적으로 situationTags + interactionTags로 분리 예정
- 태그는 모든 축을 필수로 채우지 않고, 하나나 두 개 조건만 선택해도 추천 결과가 나와야 함

다음 작업:
태그 설문지 v1을 기준으로 선택지를 줄이고, difficultyId/difficultyWeight 정리 후 auto-tag-rules.js 정식 생성과 build-cottage-game-data.js merge 적용을 진행하자.
```
