# COTTAGEBOARD PROJECT STATE v6

## 0. 현재 작업 단계

현재는 `game-system` 데이터 파이프라인의 1차 fallback 구조를 잡은 뒤, 프론트 UI 중 `추천게임 상세페이지`와 `전체게임 보기 페이지` 레이아웃을 정리하는 단계다.

이번 작업방의 핵심 변화:

- 추천게임 결과 목록 정렬을 평점 높은 순으로 변경
- 최종 `cottage-games-data.json`에 `rating / weight / minPlayers / maxPlayers` fallback 반영
- `owned-games-normalized.json`의 `sourceRating / difficultyWeight / recommendedPlayers`가 최종 gameData에 반영되도록 수정
- `sourceMechanism`을 `bgg.mechanics` fallback으로 임시 연결
- 추천 상세페이지 핵심 정보 카드가 2x2 구조로 확장됨
  - 베스트 인원
  - 난이도
  - 평점
  - 플레이 시간
- 상세페이지 하단에 `게임 정보` 섹션 추가
  - 평점
  - 진행방식
  - 테마
- 전체게임 페이지의 중복 select UI 문제 확인
- `owned-games.html` 정리본 생성 필요
- 다음방 이동 준비 단계


---

## 1. 현재 canonical 기준

현재 최신 기준 문서:

```txt
docs/
├─ PROJECT_STRUCTURE/
│  ├─ PROJECT_STRUCTURE.v1.md
│  ├─ PROJECT_STRUCTURE.v2_ADDENDUM.md
│  ├─ PROJECT_STRUCTURE.v3.md
│  ├─ PROJECT_STRUCTURE.v4.md
│  └─ PROJECT_STRUCTURE.v5.md
│
├─ PROJECT_STATE/
│  ├─ PROJECT_STATE.v1.md
│  ├─ PROJECT_STATE.v2.md
│  ├─ PROJECT_STATE.v3.md
│  ├─ PROJECT_STATE.v4.md
│  ├─ PROJECT_STATE.v5.md
│  └─ PROJECT_STATE.v6.md
│
└─ TAG_SYSTEM/
   ├─ COTTAGEBOARD_TAG_SURVEY.v1.md
   └─ TAG_SYSTEM_DECISION.v1.md
```

현재 최신 state:

```txt
PROJECT_STATE.v6.md
```

현재 최신 structure:

```txt
PROJECT_STRUCTURE.v5.md
```


---

## 2. 현재 큰 방향

현재 전략:

```txt
단기:
XLSX normalized JSON을 이용해 추천/상세/전체게임 UI가 최소한 안정적으로 작동하게 만든다.

중기:
BGG CSV / API details fetch가 붙으면 rating, year, playingTime, categories, mechanics, designers, image를 자동 보강한다.

장기:
게임명만 입력하면 BGG 자동매칭/fetch/build까지 이어지는 add-game 시스템으로 전환한다.
```

현재는 API가 완전히 붙기 전이므로, 정확한 카테고리/메커니즘/디자이너/이미지/설명 완성보다 **레이아웃 자리와 fallback 구조**를 우선한다.


---

## 3. 데이터 파이프라인 현재 상태

현재 데이터 흐름:

```txt
cottage-owned-games.xlsx
↓
convert-owned-xlsx.js
↓
owned-games-normalized.json
↓
build-cottage-game-data.js
↓
cottage-games-data.json / cottage-games-data.js
↓
script.js + game-view-utils.js
```

현재 `owned-games-normalized.json`에서 최종 gameData로 반영되는 주요 값:

```txt
sourceRating → bgg.rating fallback
difficultyWeight → bgg.weight / cottage.difficultyWeight fallback
recommendedPlayers → bgg.recommendedPlayers / minPlayers / maxPlayers fallback
bestPlayers → bgg.bestPlayers fallback
supportsLargeGroup → large group 판단 보조
sourceMechanism → bgg.mechanics fallback
```

현재 `build-cottage-game-data.js`의 핵심 fallback 정책:

```js
rating:
  toNumber(details.average, 0) ||
  toNumber(normalizedOwned.sourceRating, 0) ||
  0,

weight:
  toNumber(details.averageweight, 0) ||
  toNumber(normalizedOwned.difficultyWeight, 0) ||
  0,

minPlayers:
  toNumber(details.minplayers, 0) ||
  (normalizedRecommendedPlayers.length
    ? Math.min(...normalizedRecommendedPlayers)
    : 0),

maxPlayers:
  toNumber(details.maxplayers, 0) ||
  (normalizedRecommendedPlayers.length
    ? Math.max(...normalizedRecommendedPlayers)
    : 0),

mechanics:
  details.mechanics?.length
    ? details.mechanics
    : toArray(normalizedOwned.sourceMechanism),
```


---

## 4. 추천게임 목록 정렬 변경

추천게임 결과는 이제 다음 순서로 정렬한다.

```txt
1순위: 평점 높은 순
2순위: 같은 평점이면 난이도 낮은 순
```

`assets/js/script.js`의 `renderGameCards()` 안에서 `filteredGames` 정렬 기준 변경 완료.

핵심 구조:

```js
const ratingA =
  Number(dataA.rating) ||
  Number(dataA.sourceRating) ||
  0;

const ratingB =
  Number(dataB.rating) ||
  Number(dataB.sourceRating) ||
  0;

if (ratingA !== ratingB) {
  return ratingB - ratingA;
}

return weightA - weightB;
```

처음에는 정렬이 안 되는 것처럼 보였으나, 원인은 프론트가 아니라 최종 `cottage-games-data.json`의 `bgg.rating`이 전부 0이었기 때문이었다.

이후 fallback 반영 후 `rating` 값 정상 확인됨.


---

## 5. 추천게임 상세페이지 현재 상태

현재 상세페이지 핵심 정보 카드는 2x2 구조다.

```txt
[베스트 인원] [난이도]
[평점]       [플레이 시간]
```

보존해야 할 중요한 정책:

```txt
베스트 인원
(추천 n명)

난이도 숫자
(체감 난이도 라벨)
```

이 두 구조는 사용자가 신경 써서 만든 시스템이므로, 이후 수정 시 유지한다.

현재 상세페이지 하단 섹션:

```txt
게임 정보
- 평점
- 진행방식
- 테마

간단 게임 규칙
이런 분께 추천해요
참고하면 좋아요
룰 설명 영상
디자이너
```

단, API details가 아직 비활성 상태라 실제로는 대부분 다음만 표시될 수 있다.

```txt
게임 정보
- 평점
```

`mechanics/categories`는 데이터가 들어오면 자동 표시될 자리만 만들어둔 상태다.

mock data는 헷갈림 방지를 위해 보류했다.


---

## 6. 상세페이지 디자인 현재 판단

현재 상세페이지는 전체 구조를 갈아엎기보다 CSS polish 단계다.

현재 유효한 방향:

```txt
- 이미지 정사각형 유지
- 이미지가 정보를 압도하지 않게 높이/여백만 조절
- 제목 크기 과도하면 축소
- 정보카드 2x2 구조 유지
- section h4에 아이콘 추가 가능
- 하단 정보 섹션은 데이터 들어오면 자동 확장
```

고려한 CSS 방향:

```css
.sheet-image img{
  width:100%;
  aspect-ratio:1/1;
  max-height:190px;
  object-fit:contain;
  padding:14px;
  border-radius:20px;
  background:#f5eee2;
}
```

단, 실제 적용 여부는 다음방에서 화면 기준으로 다시 판단한다.


---

## 7. 전체게임 페이지 현재 상태

현재 `owned-games.html`에는 중복 UI가 있었다.

문제:

```txt
상단 카드형 정렬/필터 UI
+
하단 기본 select UI
+
ownedGameList / ownedPagination 중복
```

중복 때문에 화면에 아래 기본 select가 다시 노출됨:

```txt
방향 오름차순
체감 난이도 전체
메커니즘 전체
```

정리 방향:

```txt
- 카드형 정렬/필터 UI만 유지
- 중복 owned-control 블록 삭제
- ownedGameList는 1개만 유지
- ownedPagination은 1개만 유지
- body에 owned-page class 추가
- game-view-utils.js를 script.js보다 먼저 로드
```

정리된 `owned-games.html` 전문을 새 파일로 생성했다.

다음방에서 우선 할 일:

```txt
1. owned-games.html 교체
2. 전체게임 페이지 중복 select 제거 확인
3. 목록 카드 레이아웃 polish
4. owned-game-meta를 pill 구조로 바꿀지 판단
```


---

## 8. 전체게임 목록 카드 현재 상태

현재 `script.js`의 `renderOwnedGameList()`는 목록 아이템을 다음 구조로 출력한다.

```txt
썸네일
제목
👥 인원 · ⏱ 시간 · 난이도 · ⭐ 평점
```

현재는 `<p>` 안에 문자열로 이어붙이는 방식이라, CSS만으로 각 정보를 pill처럼 분리하기 어렵다.

향후 개선 후보:

```html
<div class="owned-game-meta">
  <span>👥 3~4명</span>
  <span>⏱ 40분</span>
  <span>😈 3.88</span>
  <span>⭐ 8.6</span>
</div>
```

추천 순서:

```txt
1. HTML 중복 제거
2. 현재 목록이 정상 출력되는지 확인
3. 그 다음 meta 구조를 span 기반으로 바꿔 CSS 정리
```


---

## 9. API / CSV 관련 현재 판단

완전한 보드게임 DB형 상세페이지는 BGG API details가 열려야 완성 가능하다.

API가 필요한 값:

```txt
year
playingTime
minPlayTime / maxPlayTime
categories
mechanics
designers
description
image / thumbnail
```

현재 가능한 fallback:

```txt
rating → cottage sourceRating
weight → cottage difficultyWeight
players → XLSX recommendedPlayers / bestPlayers
mechanics → XLSX sourceMechanism
```

categories는 현재 엑셀에서 억지로 만들지 않는다.

CSV는 현재 ranks CSV만 확인되었고, categories/mechanics를 주는 CSV는 별도 파일이 필요하다.


---

## 10. 현재 완료된 것

- 평점 정렬 로직 적용
- rating fallback 적용
- weight fallback 적용
- minPlayers/maxPlayers fallback 적용
- mechanics fallback 적용
- 추천 상세페이지 2x2 정보카드 구조 적용
- 게임 정보 섹션 추가
- 전체게임 페이지 중복 HTML 문제 확인
- 정리된 owned-games.html 작성


---

## 11. 현재 미완 핵심

- owned-games.html 교체 후 화면 확인
- 전체게임 목록 카드 UI 개선
- 전체게임 목록 meta를 span 구조로 변경할지 판단
- 상세페이지 이미지/제목/section CSS polish
- BGG API details fetch 활성화
- BGG API details cache 채우기
- categories/mechanics/designers/year/description/image 자동 반영
- 전체게임 상세페이지 UI 연결 최종 확인
- add-game 자동화 시스템 설계
- CMD/EXE/웹 입력창 기반 새 게임 추가 방식 검토
- 서버에서 직접 입력/모바일 관리 가능한 구조 검토


---

## 12. 다음 작업 추천 순서

다음방에서는 아래 순서로 간다.

```txt
1. PROJECT_STATE.v6 / PROJECT_STRUCTURE.v5 기준 확인
2. owned-games.html 정리본으로 교체
3. 전체게임 페이지 중복 UI 제거 확인
4. 전체게임 목록 카드 디자인 개선
5. 필요 시 renderOwnedGameList()의 meta 구조를 span 기반으로 변경
6. 상세페이지 CSS polish
7. API details fetch 또는 add-game 설계로 이동
```


---

## 13. 다음방 첫 메시지

```txt
코티지보드 홈페이지 프로젝트 이어서 간다.

Canonical:
- PROJECT_STATE.v6 기준
- PROJECT_STRUCTURE.v5 기준
- TAG_SYSTEM_DECISION.v1 기준

현재 핵심:
- 추천게임 정렬은 평점 높은 순 → 같은 평점이면 난이도 낮은 순으로 변경 완료
- build-cottage-game-data.js에서 rating/weight/minPlayers/maxPlayers fallback 적용 완료
- sourceRating/difficultyWeight/recommendedPlayers/bestPlayers가 최종 cottage-games-data에 반영됨
- mechanics는 details.mechanics가 없으면 normalizedOwned.sourceMechanism을 fallback으로 사용 중
- 추천 상세페이지는 2x2 핵심 정보카드 구조 적용:
  베스트 인원 / 난이도 / 평점 / 플레이 시간
- 게임 정보 섹션은 평점/진행방식/테마 자리만 만들어둠
- mechanics/categories mock 데이터는 헷갈림 방지를 위해 보류
- 전체게임 페이지는 owned-games.html에 중복 UI가 있어서 정리본으로 교체해야 함

다음 작업:
owned-games.html 정리본으로 교체한 뒤, 전체게임 페이지 중복 UI 제거 확인하고 목록 카드 레이아웃을 개선하자.
```
