# COTTAGEBOARD TAG SYSTEM DECISION v1

## 0. 현재 결론

태그 시스템은 처음부터 과하게 세분화하지 않고, 추천 정확도와 관리 난이도의 균형을 맞춘 최소셋 v1로 시작한다.

기준은 다음과 같다.

```txt
내부 추천엔진용 태그
≠
손님에게 보여줄 출력 태그
```

따라서 내부에는 구조화된 태그를 유지하고, 화면에는 `displayTags`로 가공된 대표 태그만 보여준다.


---

## 1. 최종 태그 축 v1

```txt
moodTags
= 분위기 / 감정 / 공기

playTags
= 실제 플레이 행동 / 재미 방식

situationTags
= 누구랑 / 언제 / 사용 상황

interactionTags
= 플레이어 간 관계 구조
```


---

## 2. 최소 태그셋 v1

### moodTags

```txt
light       가볍게
cozy        편안하게
tense       쫄깃하게
brainy      머리 쓰는
chaotic     왁자지껄
funny       웃긴
immersive   몰입감
```

### playTags

```txt
party        파티게임
strategy     전략
deduction    추리
bluffing     블러핑
puzzle       퍼즐
card_play    카드운용
storytelling 스토리
dexterity    손재주
```

### situationTags

```txt
beginner     입문추천
experienced  게임러추천
couple       2인추천
group        모임추천
large_group  단체추천
quick_play   짧게한판
long_stay    오래즐김
first_game   첫게임추천
```

### interactionTags

```txt
competitive   개인경쟁
cooperative   협력
team          팀전
hidden_role   정체숨김
betrayal      배신/심리전
low_conflict  갈등적음
table_talk    대화많음
silent_focus  조용히집중
simultaneous  동시진행
turn_based    차례진행
```


---

## 3. 보류/제외한 태그

초기 버전에서는 아래 태그를 보류한다.

```txt
warm
talky
exciting
memory
auction
negotiation
trick_taking
set_collection
engine_building
area_control
push_your_luck
roll_and_write
date
family
solo_friendly
three_four
drinking_mood
closing_game
semi_coop
take_that
```

보류 이유:

- v1에서 너무 많은 선택지를 만들면 관리 피로가 커진다.
- 추천게임찾기 UI는 손님이 빠르게 고르는 구조여야 한다.
- 세부 태그는 BGG mechanics/categories로 내부 판별 가능하다.
- 실제 운영하면서 자주 필요한 태그만 v2에서 승격한다.


---

## 4. difficulty 구조 정리

현재 일부 데이터에서 `difficultyId`에 `"1.10"` 같은 숫자값이 들어간다.

장기적으로는 아래처럼 분리한다.

```js
cottage: {
  difficultyId: "beginner",
  difficultyWeight: 1.35
}
```

### difficultyId 기준

```txt
kids
beginner
light_family
heavy_mania
hardcore
```

### 자동 변환 기준 v1

```txt
weight <= 1.25  → kids
weight <= 1.75  → beginner
weight <= 2.40  → light_family
weight <= 3.00  → heavy_mania
weight > 3.00   → hardcore
```


---

## 5. autoTags / manualTags / displayTags 관계

```txt
autoTags
= BGG mechanics/categories/weight/players/time에서 자동 생성

manualTags
= 사람이 직접 보정한 태그

displayTags
= 손님에게 보여줄 대표 태그
```

우선순위:

```txt
manualTags
→ situationTags
→ moodTags
→ playTags
→ interactionTags
```

이 순서로 5개까지 대표 태그를 만든다.


---

## 6. 추천 필터 원칙

추천게임찾기는 모든 축을 필수로 요구하지 않는다.

```js
const matched =
  (!playerValue || matchPlayer(game, playerValue)) &&
  (!levelValue || matchLevel(game, levelValue)) &&
  (!moodValue || matchMood(game, moodValue));
```

즉 선택하지 않은 축은 무시한다.

예:

```txt
인원만 선택해도 추천
난이도만 선택해도 추천
분위기만 선택해도 추천
인원 + 분위기만 선택해도 추천
세 개 다 선택해도 추천
```


---

## 7. 파일 배치 추천

```txt
game-system/tools/tagging/auto-tag-rules.js
```

또는 tools 구조가 아직 단순하면:

```txt
game-system/tools/auto-tag-rules.js
```

초기에는 build 파일에서 require해서 사용한다.

```js
const {
  mergeCottageTags
} = require("../tagging/auto-tag-rules");
```


---

## 8. build-cottage-game-data.js 적용 개념

최종 gameData를 만들 때 각 게임 생성 직후 아래 단계를 거친다.

```js
const rawGame = {
  id,
  title,
  bgg,
  cottage,
  images,
  community
};

const game = mergeCottageTags(rawGame);

gameData[gameKey] = game;
```

이렇게 하면 build 단계에서 자동으로 다음이 정리된다.

```txt
difficultyId 숫자값 보정
difficultyWeight 보정
autoTags 생성
moodTags/playTags/situationTags/interactionTags 병합
displayTags 생성
```


---

## 9. 다음 작업

1. `auto-tag-rules.js`를 프로젝트에 추가한다.
2. `build-cottage-game-data.js`에서 `mergeCottageTags()`를 require한다.
3. gameData 생성 직후 `mergeCottageTags(rawGame)`를 적용한다.
4. convert/build 실행 후 `cottage-games-data.json`을 확인한다.
5. 태그가 과하거나 부족한 게임을 기준으로 manualTags 보정 구조를 추가한다.
