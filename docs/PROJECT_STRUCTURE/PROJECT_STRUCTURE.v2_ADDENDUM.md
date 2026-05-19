# PROJECT_STRUCTURE.v2_ADDENDUM.md

# COTTAGEBOARD PROJECT STRUCTURE ADDENDUM

## 0. 이번 추가 구조

PROJECT_STRUCTURE.v1을 유지하되, 이번 작업에서 아래 구조가 추가되었다.

```txt
assets/js/view/game-view-utils.js
```

역할:

- nested gameData를 화면 출력용 데이터로 변환
- script.js가 직접 깊은 경로를 참조하지 않도록 중앙 변환 계층 역할
- paths.js가 파일 경로를 중앙관리하듯, game-view-utils.js는 화면 출력용 데이터 경로를 중앙관리

구조 의미:

```txt
game-system
= 데이터 생성/운영 시스템

assets/js/view
= 화면 출력 변환 시스템

assets/js/script.js
= 현재 임시 통합 UI 실행 파일
```


---

## 1. 최신 데이터 구조 방향

최종 gameData는 아래 큰 영역으로 나눈다.

```txt
id
title
bgg
cottage
images
community
```

`play`는 DB 계층으로 두지 않는다.

이유:

- play는 출처 데이터라기보다 화면/추천용 요약값에 가깝다.
- bestPlayers, recommendedPlayers, playingTime 등은 BGG 출처값이므로 bgg에 둔다.
- 화면에서 필요한 플레이 요약은 game-view-utils.js에서 조립한다.


---

## 2. 태그 구조 방향

장기 목표:

```js
cottage: {
  moodTags: [],
  playTags: [],
  situationTags: [],
  interactionTags: [],
  manualTags: [],
  autoTags: [],
  displayTags: []
}
```

기존 relationshipTags는 임시 유지 가능하지만 장기적으로는 아래 둘로 분리한다.

```txt
relationshipTags
↓
situationTags
interactionTags
```

구분:

```txt
moodTags
= 분위기 / 감정

playTags
= 플레이 행동 / 재미 방식

situationTags
= 누구랑 / 언제 / 사용 상황

interactionTags
= 협력/경쟁/팀전/배신 등 관계 구조
```


---

## 3. 추천 필터 원칙

추천게임찾기는 모든 축을 필수로 요구하지 않는다.

```txt
하나만 골라도 출력
두 개만 골라도 출력
세 개 다 골라도 출력
```

선택하지 않은 축은 필터에서 무시한다.

이 원칙은 태그가 많아져도 손님 UI가 복잡해지지 않도록 하기 위한 핵심 구조다.
