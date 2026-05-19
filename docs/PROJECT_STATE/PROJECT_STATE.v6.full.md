# PROJECT_STATE.v4.md

# COTTAGEBOARD PROJECT STATE v4

## 0. 현재 작업 단계

현재는 UI 세부 디자인 단계가 아니라, `game-system` 기준 데이터/tools 파이프라인과 추천게임찾기 출력 구조를 재정렬하는 단계다.

이번 작업방의 핵심 변화는 다음과 같다.

- `auto-tag-rules.js` 정식 도입
- `build-cottage-game-data.js`에 `mergeCottageTags()` 적용
- `difficultyId / difficultyWeight` 구조 정리
- 추천게임찾기 UI에서 “선택안함/상관없어요” 구조 복구
- 분위기 선택값을 내부 다중 태그로 매핑하는 `moodTagMap` 구조 도입
- 기존 TSV 중심 원본 전략에서 `XLSX → normalized JSON → build` 방향으로 전환
- `convert-owned-xlsx.js` 생성
- XLSX의 굵은글씨 정보를 읽어 `bestPlayers`로 변환하는 구조 확인
- 추천인원 셀 값을 읽어 `recommendedPlayers`로 변환하는 구조 확인
- 장기적으로는 add-game 자동화 시스템으로 전환하는 방향 확정


---

## 1. 현재 canonical 기준

현재 최신 기준 문서:

```txt
docs/
├─ PROJECT_STRUCTURE/
│  ├─ PROJECT_STRUCTURE.v1.md
│  ├─ PROJECT_STRUCTURE.v2_ADDENDUM.md
│  └─ PROJECT_STRUCTURE.v3.md
│
├─ PROJECT_STATE/
│  ├─ PROJECT_STATE.v1.md
│  ├─ PROJECT_STATE.v2.md
│  ├─ PROJECT_STATE.v3.md
│  └─ PROJECT_STATE.v4.md
│
└─ TAG_SYSTEM/
   ├─ COTTAGEBOARD_TAG_SURVEY.v1.md
   └─ TAG_SYSTEM_DECISION.v1.md
```

현재 최신 state:

```txt
PROJECT_STATE.v4.md
```

현재 최신 structure:

```txt
PROJECT_STRUCTURE.v3.md
```


---

## 2. 현재 큰 방향

현재 전략은 다음과 같이 정리한다.

```txt
단기:
기존 XLSX 운영 데이터를 최대한 보존해서 normalized JSON으로 변환한다.

중기:
normalized JSON + BGG match/cache + auto-tag-rules를 build에서 병합한다.

장기:
게임명만 입력하면 BGG 자동매칭/fetch/build까지 이어지는 add-game 시스템으로 전환한다.
```

즉 현재 XLSX는 최종 목표가 아니라, 기존 수동 운영 데이터를 잃지 않기 위한 과도기 원본이다.

최종 목표는:

```txt
새 게임명 입력
↓
BGG 자동 검색/매칭
↓
BGG details fetch
↓
autoTags 생성
↓
필요한 값만 운영자 수동 보정
↓
최종 cottage-games-data.json 반영
```


---

## 3. 데이터 원본 전략 변경

### 기존 방향

```txt
TSV 원본
↓
build-cottage-game-data.js
↓
cottage-games-data.json
```

### 현재 방향

```txt
cottage-owned-games.xlsx
↓
convert-owned-xlsx.js
↓
owned-games-normalized.json
↓
build-cottage-game-data.js
↓
cottage-games-data.json
```

### 판단

TSV는 장기 핵심 원본으로 부적합하다.

이유:

- TSV는 글자만 보존한다.
- 굵은글씨, 색상, 셀 서식이 사라진다.
- 현재 보유게임 엑셀의 “굵은글씨 = 베스트인원” 같은 의미 데이터를 잃는다.

따라서 앞으로는:

```txt
XLSX = 기존 운영 데이터 보존용 원본
JSON = build가 읽는 안정적인 중간 데이터
API/add-game = 장기 최종 자동화
```

로 간다.

TSV는 당장 삭제하지 않고 과도기 호환용으로만 유지한다.


---

## 4. XLSX 변환기 추가

새 파일:

```txt
game-system/tools/source/convert-owned-xlsx.js
```

역할:

```txt
cottage-owned-games.xlsx
↓
owned-games-normalized.json
owned-games-normalized.js
```

필요 패키지:

```bash
npm.cmd install exceljs
```

PowerShell에서 `npm install exceljs`가 막힐 경우 `npm.cmd install exceljs`를 사용한다.

실행:

```bash
node game-system/tools/source/convert-owned-xlsx.js
```

입력 파일 위치:

```txt
game-system/game-data/source/manual/cottage-owned-games.xlsx
```

출력 파일 위치:

```txt
game-system/game-data/source/owned-games-normalized.json
game-system/game-data/source/owned-games-normalized.js
```

변환기에서 읽는 주요 컬럼:

```txt
보유게임명
난이도
위치
메커니즘
긱평점
1인
2인
3인
4인
5인
6인
7인
8인
8인 이상
안해본거
```

인원 해석 규칙:

```txt
해당 인원 칸에 값 있음
→ recommendedPlayers에 추가

해당 인원 칸이 굵은글씨
→ bestPlayers에 추가

8인 이상 칸에 값 있음
→ supportsLargeGroup: true
```


---

## 5. owned-games-normalized.json 구조

생성되는 항목 예시:

```js
{
  "7원더스": {
    "id": "7원더스",
    "ownedName": "7원더스",
    "difficultyWeight": 2.32,
    "shelfGroupId": "",
    "sourceMechanism": "",
    "sourceRating": 0,
    "recommendedPlayers": [3, 4, 5, 6, 7],
    "bestPlayers": [4, 5],
    "supportsLargeGroup": false
  }
}
```

이 데이터는 최종 build에서 BGG 데이터와 병합한다.

장기적으로 `owned-games-normalized.json`은 build가 읽는 공식 로컬 운영 데이터가 된다.


---

## 6. paths.js 추가 필요

`game-system/tools/core/paths.js`에 아래 경로를 추가한다.

```js
const OWNED_GAMES_NORMALIZED_PATH =
  path.join(
    GAME_DATA_DIR,
    "source/owned-games-normalized.json"
  );
```

그리고 `module.exports`에 추가한다.

```js
OWNED_GAMES_NORMALIZED_PATH,
```

주의:

입력 XLSX는 `source/manual/`에 있지만, 변환 결과 JSON은 `source/` 바로 아래에 둔다.

```txt
game-system/game-data/source/manual/cottage-owned-games.xlsx
game-system/game-data/source/owned-games-normalized.json
```


---

## 7. build-cottage-game-data.js 현재 상태

파일 위치:

```txt
game-system/tools/build/build-cottage-game-data.js
```

이미 적용된 것:

- nested schema 생성
- `mergeCottageTags(rawGame)` 적용
- `difficultyId` 숫자값 자동 보정
- `difficultyWeight` 자동 정리
- `moodTags / playTags / situationTags / interactionTags` 병합
- `autoTags` 생성
- `displayTags` 생성

추가 진행 중인 것:

- `OWNED_GAMES_NORMALIZED_PATH` 읽기
- `ownedGamesNormalized`를 `buildRawGameItem()`에서 참조
- `normalizedOwned.difficultyWeight` 병합
- `normalizedOwned.bestPlayers` 병합
- `normalizedOwned.recommendedPlayers` 병합
- `normalizedOwned.supportsLargeGroup` 병합

현재 설계 판단:

```txt
BGG API suggested 데이터가 있으면 API 우선
없으면 XLSX normalized 데이터 fallback
```

이유:

- XLSX는 현재 수동 운영 데이터이지만, 장기적으로는 API 자동화로 대체될 수 있다.
- 하지만 현재는 API details fetch가 막혀 있으므로 XLSX fallback이 필요하다.
- bestPlayers/recommendedPlayers는 추천게임찾기 인원 필터 복구에 중요하다.


---

## 8. auto-tag-rules.js 현재 상태

파일 위치:

```txt
game-system/tools/tagging/auto-tag-rules.js
```

역할:

- difficultyWeight 기반 difficultyId 변환
- difficultyWeight 기반 기본 autoTags 생성
- BGG categories/mechanics 기반 autoTags 생성 준비
- manualTags + autoTags + displayTags 병합

현재 난이도 기준은 프론트의 `DIFFICULTY_LEVELS`와 맞춘다.

```txt
kids          0.00 ~ 1.10
beginner      1.11 ~ 1.50
light_family  1.51 ~ 2.50
heavy_mania   2.51 ~ 3.50
hardcore      3.51 ~ 5.00
```

현재 `getDifficultyAutoTags()`는 임시로 난이도 기반 분위기/상황 태그를 생성한다.

주의:

이 방식은 완벽한 의미 태그 시스템이 아니라, API details가 아직 없는 상태에서 추천이 최소 작동하게 만드는 임시 추론이다.

장기적으로는:

```txt
difficultyWeight
→ 난이도 관련 태그

BGG mechanics/categories
→ 플레이방식/상호작용/분위기 태그

manualTags
→ 운영자 보정
```

으로 분리한다.


---

## 9. 추천게임찾기 UI 현재 상태

파일 위치:

```txt
assets/js/script.js
```

현재 추천게임찾기 UI는 다음 3축이다.

```txt
1. 인원
2. 난이도
3. 분위기
```

핵심 원칙:

```txt
조건 1개 이상만 선택해도 추천 결과가 나온다.
선택하지 않은 축은 필터에서 무시한다.
```

기본 필터 구조:

```js
matchRecommendLevel(game, levelValue) &&
matchRecommendPlayer(game, playerValue) &&
matchRecommendMood(game, moodValue)
```

각 match 함수 내부에서 값이 없으면 true를 반환한다.

```js
if(!moodValue){
  return true;
}
```


---

## 10. “상관없어요” 옵션 복구

추천게임찾기 각 축에 `상관없어요` 옵션을 추가했다.

의미:

```txt
상관없어요
= 해당 조건 무시
= 필터 해제
= 상단 요약은 “인원 선택 / 난이도 선택 / 분위기 선택”으로 복귀
```

구현 방식:

```js
renderInlineOption("players", "", "⊘ 상관없어요", playerValue)
renderInlineOption("level", "", "⊘ 상관없어요", levelValue)
renderInlineOption("mood", "", "⊘ 상관없어요", moodValue)
```

또는 `::before`로 `⊘` 아이콘을 붙이고, 아이콘은 붉은색으로 처리한다.

CSS 방향:

```css
.recommend-inline-option.is-none-option::before{
  content:"⊘";
  color:#c85a5a;
  margin-right:4px;
}
```

주의:

`상관없어요`는 일반 선택지가 아니라 “필터 해제” 성격이다.

따라서 선택 표시가 남지 않거나, 상단 요약이 placeholder로 돌아가는 방식이 자연스럽다.


---

## 11. moodTagMap 추가

추천게임찾기 UI의 분위기 선택값은 내부 태그 여러 개로 매핑한다.

목적:

```txt
UI는 단순하게 유지
내부 추천은 다층 태그로 확장
```

예:

```js
const moodTagMap = {
  fun: ["funny", "light", "party"],
  brain: ["brainy", "strategy", "puzzle"],
  talk: ["table_talk", "deduction", "bluffing"],
  immersive: ["immersive", "tense", "long_stay"],
  cozy: ["cozy", "low_conflict", "beginner", "light"]
};
```

`matchRecommendMood()`는 `moodValue`를 직접 찾지 않고, `moodTagMap[moodValue]`에 포함된 내부 태그 중 하나라도 있으면 매칭한다.

이 구조는 2차/3차 태그 시스템의 시작점이다.


---

## 12. 인원 필터 현재 상태

현재 인원 필터는 API details가 없으면 제대로 작동하기 어렵다.

이유:

```txt
BGG details fetch 비활성화
→ minPlayers / maxPlayers / bestPlayers / recommendedPlayers 비어 있음
```

하지만 XLSX 변환기에서 다음 데이터를 확보했다.

```txt
recommendedPlayers
bestPlayers
supportsLargeGroup
```

따라서 다음 작업에서 `owned-games-normalized.json`을 build에 병합하면 인원 필터를 복구할 수 있다.

주의:

인원 데이터가 없다고 모든 게임을 통과시키면 추천 품질이 망가진다.

따라서 인원 필터는:

```txt
1순위: BGG details suggested/min/max
2순위: owned-games-normalized recommended/best/suppportsLargeGroup
3순위: 데이터 없으면 제외 또는 임시 보류
```

방향이 맞다.


---

## 13. BGG details fetch 현재 상태

`convert-bgg.js`에는 외부 스위치가 있다.

```js
const ENABLE_FETCH_BGG_DETAILS = true;
```

하지만 `fetch-bgg-details.js` 내부에서 아직 Thing API 호출이 임시 비활성화되어 있다.

현재 로그 예시:

```txt
[2/3] Fetching BGG details...
fetchBggDetails: BGG Thing API disabled.
{ pending: 425 }
```

즉 현재 425개 정도의 details fetch 대기 항목이 있으나, 실제 API 호출은 막혀 있다.

장기적으로는 `fetch-bgg-details.js`를 활성화해 다음 값들을 채워야 한다.

```txt
rating
weight
minPlayers
maxPlayers
bestPlayers
recommendedPlayers
playingTime
categories
mechanics
designers
description
images
```


---

## 14. 현재 완료된 것

- `auto-tag-rules.js` 생성
- `TAG_SYSTEM_DECISION.v1.md` 생성
- `COTTAGEBOARD_TAG_SURVEY.v1.md` 생성
- `build-cottage-game-data.js`에 `mergeCottageTags()` 적용
- difficulty 기준을 사용자 기준으로 수정
- `difficultyId` 숫자값 자동 변환 확인
- `displayTags` 생성 확인
- 추천게임찾기 “상관없어요” 옵션 복구
- `moodTagMap` 구조 도입
- `convert-owned-xlsx.js` 생성
- `exceljs` 설치 방식 확인
- XLSX 굵은글씨 기반 `bestPlayers` 추출 확인
- XLSX 인원칸 기반 `recommendedPlayers` 추출 확인
- TSV 장기 중심 원본 부적합 판단
- XLSX → normalized JSON → build 방향 결정
- add-game 자동화 최종 방향 확인


---

## 15. 현재 미완 핵심

- `build-cottage-game-data.js`에 `owned-games-normalized.json` merge 마무리
- `getSuggestedPlayers(details, normalizedOwned)` 구조 완성
- BGG API suggested 우선 / XLSX fallback 구조 완성
- `recommendedPlayers / bestPlayers / supportsLargeGroup` 최종 gameData 반영 확인
- 추천게임찾기 인원 필터 복구
- `supportsLargeGroup`이 `group` 필터에 반영되도록 script.js 보정
- TSV 의존도 축소
- XLSX normalized JSON만으로 build 가능한 구조 검토
- `fetch-bgg-details.js` 실제 API 호출 활성화
- BGG details cache 채우기
- API 기반 autoTags 품질 확인
- manualTags 보정 흐름 정리
- add-game 자동화 시스템 설계
- CMD/EXE/웹 입력창 기반 새 게임 추가 방식 검토
- 서버에서 직접 입력/모바일 관리 가능한 구조 검토
- PROJECT_STATE.v5 갱신


---

## 16. 다음 작업 추천 순서

다음방에서는 아래 순서로 간다.

```txt
1. PROJECT_STATE.v4 / PROJECT_STRUCTURE.v3 기준 확인
2. paths.js의 OWNED_GAMES_NORMALIZED_PATH 추가 여부 확인
3. build-cottage-game-data.js에서 ownedGamesNormalized readJson 확인
4. buildRawGameItem()에서 normalizedOwned 참조 확인
5. getSuggestedPlayers(details, normalizedOwned) 구조 완성
6. bestPlayers / recommendedPlayers / supportsLargeGroup 최종 gameData 반영
7. convert-owned-xlsx.js 실행
8. convert-bgg.js 실행
9. cottage-games-data.json에서 7원더스 / 가짜예술가 / 갈팡질팡 인원 데이터 확인
10. 추천게임찾기에서 인원 필터 테스트
11. 그 다음 BGG API fetch 또는 add-game 설계로 이동
```


---

## 17. 다음방 첫 메시지

```txt
코티지보드 홈페이지 프로젝트 이어서 간다.

Canonical:
- PROJECT_STATE.v4 기준
- PROJECT_STRUCTURE.v3 기준
- TAG_SYSTEM_DECISION.v1 기준

현재 핵심:
- XLSX → owned-games-normalized.json 변환기 생성 완료
- XLSX 굵은글씨를 bestPlayers로 읽는 것 확인
- XLSX 인원칸을 recommendedPlayers로 읽는 것 확인
- TSV는 과도기 호환용, 장기적으로는 XLSX normalized JSON + API/add-game 자동화 방향
- build-cottage-game-data.js에 ownedGamesNormalized merge 진행 중
- 추천게임찾기는 인원/난이도/분위기 3축
- 선택하지 않은 축은 무시하고, “상관없어요” 옵션은 필터 해제 역할
- moodTagMap으로 분위기 UI값을 내부 다중 태그로 매핑하기 시작함

다음 작업:
paths.js / build-cottage-game-data.js의 ownedGamesNormalized merge를 마무리하고, bestPlayers/recommendedPlayers/supportsLargeGroup을 최종 gameData에 반영한 뒤 인원 필터를 복구하자.
```


---

# 18. v5 추가 변경사항

## 추천게임 상세페이지 구조 변경

현재 상세페이지 정보 구조:

- 베스트 인원
- 추천 인원(괄호 보조표시)
- 난이도(weight)
- 체감 난이도 설명
- 플레이 시간

출력 형식:

3~6명
베스트 인원
(추천 3~6명)

1.00
난이도
(😊 아이도 할 수 있어요)

40~90분
플레이 시간

정책:
- 플레이 가능 인원(min/maxPlayers)은 노출하지 않음
- bestPlayers 중심 운영
- recommendedPlayers는 괄호 보조 정보만 사용

---

## 추천게임 empty 상태 UX 수정

초기 상태:
인원, 난이도, 분위기 중
하나 이상을 골라주세요.

결과 없음:
조건에 맞는 게임이 아직 없어요.
다른 조건으로 다시 찾아보세요.

현재:
CSS :has(.recommend-empty) 방식으로 중앙 정렬 해결 완료

---

## 현재 상세페이지 추가 완료 항목

- 룰 설명 영상 섹션
- 디자이너 섹션 자리 생성
- 비슷한 게임 섹션 placeholder 생성

---

## 작업 방식 변경

기존:
- 전체 전문 재생성 위주

현재:
- Ctrl+P / 검색 기반 부분 수정 workflow 우선
- 단순 수정은 부분패치 우선
- 구조 크게 꼬일 때만 전문 재생성

---

# 19. v6 추가 변경사항

## 19-1. 추천게임 정렬 변경

추천게임 목록 출력 순서를 기존 난이도 낮은 순 중심에서 아래 기준으로 변경했다.

```txt
1순위: 평점 높은 순
2순위: 같은 평점이면 난이도 낮은 순
```

`assets/js/script.js`의 `renderGameCards()` 안 `filteredGames.sort()`에서 처리한다.

핵심 코드 방향:

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

처음에는 평점순으로 보이지 않았으나, 원인은 프론트 정렬이 아니라 최종 `cottage-games-data.json`의 `bgg.rating`이 전부 0이었기 때문이다.


---

## 19-2. 최종 gameData 평점/난이도/인원 fallback 반영

`build-cottage-game-data.js`에서 `owned-games-normalized.json`의 값을 최종 `cottage-games-data.json`으로 fallback 반영하도록 수정했다.

적용된 핵심값:

```txt
normalizedOwned.sourceRating
→ bgg.rating fallback

normalizedOwned.difficultyWeight
→ bgg.weight fallback
→ cottage.difficultyWeight fallback

normalizedOwned.recommendedPlayers
→ minPlayers / maxPlayers fallback

normalizedOwned.bestPlayers
→ bestPlayers fallback

normalizedOwned.sourceMechanism
→ bgg.mechanics fallback
```

현재 핵심 코드 방향:

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

확인 결과 `cottage-games-data.json`에서 다음 값들이 정상 생성됨.

예:

```txt
7원더스
rating: 7.7
weight: 2.32
minPlayers: 3
maxPlayers: 7

가짜예술가뉴욕에가다
rating: 7.1
weight: 1.12
minPlayers: 5
maxPlayers: 8
```

따라서 추천게임 평점순 정렬도 정상 작동 가능해졌다.


---

## 19-3. API / CSV / XLSX 평점 정책 정리

처음에는 `ratingSource`를 추가할지 검토했으나 생략하기로 했다.

이유:

```txt
코티지 sourceRating 자체가 BGG 기준으로 수기 입력한 값이므로
API / CSV / XLSX / 코티지 값의 의미가 크게 다르지 않다.
추적보다 fallback 안정성이 더 중요하다.
```

따라서 현재 정책은:

```txt
어딘가에서 값이 없으면 다른 어딘가에서 가져온다.
별도의 ratingSource 추적 필드는 만들지 않는다.
```

장기적으로 API가 활성화되면 `details.average`가 우선되고, API 값이 없을 때만 `sourceRating`이 fallback으로 사용된다.


---

## 19-4. 추천게임 상세페이지 구조 변경

상세페이지 핵심 정보 카드가 기존 3칸에서 2x2 구조로 확장되었다.

현재 핵심 정보 카드:

```txt
[베스트 인원] [난이도]
[평점]       [플레이 시간]
```

중요 보존 원칙:

```txt
베스트 인원
(추천 n명)

난이도 숫자
(체감 난이도 라벨)
```

이 두 구조는 사용자가 신경 써서 미세 조정한 부분이므로 이후 수정 시 반드시 유지한다.

현재 예시 화면:

```txt
3~4명
베스트 인원
(추천 2~4명)

3.88
난이도
(😈 하드코어)

⭐ 8.6
평점

-
플레이 시간
```


---

## 19-5. 상세페이지 `게임 정보` 섹션 추가

상세페이지 하단에 `게임 정보` 섹션을 추가했다.

현재 표시 후보:

```txt
평점
진행방식
테마
```

현재 API details가 비어 있어 실제로는 대부분 평점만 표시될 수 있다.

```txt
게임 정보
평점 ⭐ 8.6
```

`mechanics`는 현재 `sourceMechanism` fallback을 연결했으므로 일부 게임에서 표시될 수 있다.

`categories`는 아직 API 또는 별도 카테고리 CSV가 필요하다.

mock 데이터는 넣지 않기로 했다.

이유:

```txt
나중에 API가 붙었을 때
무엇이 임시 mock이고 무엇이 실데이터인지 헷갈릴 가능성이 높다.
```

따라서 UI 자리만 만들어두고, 데이터가 들어오면 자동 노출되도록 유지한다.


---

## 19-6. 상세페이지 디자인 현재 판단

현재 상세페이지는 전체 구조를 갈아엎기보다 CSS polish 단계다.

유효한 방향:

```txt
- 사진은 정사각형 유지가 맞다.
- 이미지 비율보다 이미지 영역의 높이/점유율 조정이 핵심이다.
- 보드게임 박스아트와 코티지 감성에는 aspect-ratio: 1/1 + object-fit: contain 구조가 잘 맞는다.
- 제목이 너무 크면 줄일 수 있다.
- section h4에는 아이콘을 붙일 수 있다.
```

검토한 section h4 아이콘 후보:

```html
<h4>🎲 간단 게임 규칙</h4>
<h4>💡 이런 분께 추천해요</h4>
<h4>⚠ 참고하면 좋아요</h4>
<h4>🎥 룰 설명 영상</h4>
```

이 변경은 아직 필수 완료가 아니라 다음방에서 화면 기준으로 적용 여부를 판단한다.


---

## 19-7. 전체게임 페이지 HTML 중복 문제 확인

`owned-games.html`에 아래 중복 문제가 있었다.

```txt
1. 카드형 정렬/필터 UI가 한 번 있음
2. 그 아래 기본 select UI가 다시 노출됨
3. ownedGameList가 2번 있음
4. ownedPagination이 2번 있음
5. ownedDifficultyFilter / ownedMechanicFilter id가 중복됨
```

화면에서는 아래 항목들이 중복 노출되었다.

```txt
방향 오름차순
체감 난이도 전체
메커니즘 전체
```

정리 방향:

```txt
- 카드형 정렬/필터 UI만 유지
- 하단 owned-control 블록 삭제
- ownedGameList 1개만 유지
- ownedPagination 1개만 유지
- body에 owned-page class 추가
- game-view-utils.js를 script.js보다 먼저 로드
```

정리된 `owned-games.cleaned.html` 파일을 생성했다.

다음방 첫 작업은 이 파일을 기존 `owned-games.html`에 반영하는 것이다.


---

## 19-8. 전체게임 목록 카드 개선 예정

현재 `renderOwnedGameList()`는 목록 아이템을 다음 구조로 출력한다.

```txt
썸네일
제목
👥 인원 · ⏱ 시간 · 난이도 · ⭐ 평점
```

현재 meta 정보가 `<p>` 안의 문자열로 이어붙는 방식이라 CSS만으로 pill 형태 분리가 어렵다.

향후 개선 후보:

```html
<div class="owned-game-meta">
  <span>👥 3~4명</span>
  <span>⏱ 40분</span>
  <span>😈 3.88</span>
  <span>⭐ 8.6</span>
</div>
```

다음방에서 전체게임 HTML 중복 제거 후 이 구조 변경을 검토한다.


---

## 19-9. 다음 작업 추천 순서 갱신

다음방에서는 아래 순서로 진행한다.

```txt
1. PROJECT_STATE.v6 / PROJECT_STRUCTURE.v5 기준 확인
2. owned-games.cleaned.html을 기존 owned-games.html에 반영
3. 전체게임 페이지 중복 UI 제거 확인
4. 전체게임 목록 카드 UI 개선
5. 필요 시 renderOwnedGameList()의 meta 구조를 span 기반으로 변경
6. 상세페이지 CSS polish
7. API details fetch 또는 add-game 설계로 이동
```


---

## 19-10. 다음방 첫 메시지 갱신

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
owned-games.cleaned.html 정리본을 기존 owned-games.html로 교체한 뒤, 전체게임 페이지 중복 UI 제거 확인하고 목록 카드 레이아웃을 개선하자.
```
