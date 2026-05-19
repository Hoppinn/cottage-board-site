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
