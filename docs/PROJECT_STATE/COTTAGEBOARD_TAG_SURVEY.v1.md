# COTTAGEBOARD TAG SURVEY v1

## 목적

코티지보드 게임 추천 시스템에서 사용할 태그 축을 정리한다.

기존에는 mood / play / relationship 정도로 뭉뚱그려져 있었지만, 실제 추천 정확도를 높이기 위해 다음 4축으로 분리한다.

1. moodTags = 분위기 / 감정
2. playTags = 플레이 행동 / 재미 방식
3. situationTags = 누구랑 / 언제 / 사용 상황
4. interactionTags = 플레이어 간 관계 구조

이 문서는 설문조사식으로 게임별 태그를 고르기 위한 기준표다.


---

# 1. moodTags

## 의미

게임을 할 때 느껴지는 공기, 감정, 분위기.

## 선택지

```txt
funny
웃긴 / 빵 터지는

light
가벼운 / 부담 없는

cozy
편안한 / 느긋한

talky
대화 많은

tense
쫄리는 / 긴장감 있는

immersive
몰입되는

brainy
머리 쓰는

chaotic
왁자지껄 / 혼란스러운

warm
따뜻한 / 부드러운

exciting
흥분되는 / 에너지 있는
```

## 예시

```txt
도블
→ funny, light, exciting

딕싯
→ cozy, talky, warm

스컬
→ tense, talky

레지스탕스 아발론
→ tense, talky, immersive
```


---

# 2. playTags

## 의미

플레이어가 실제로 하는 행동, 재미를 느끼는 방식.

## 선택지

```txt
bluffing
블러핑 / 속이기

deduction
추리

reaction
순발력

party
파티게임

word
단어 / 언어

drawing
그림 / 표현

memory
기억력

puzzle
퍼즐

strategy
전략

card_play
카드 운용

auction
경매

negotiation
협상

trick_taking
트릭테이킹

set_collection
셋컬렉션

engine_building
엔진빌딩

area_control
영향력 / 구역 장악

push_your_luck
운 시험하기

roll_and_write
롤앤라이트

storytelling
스토리텔링

dexterity
손재주 / 피지컬
```

## 예시

```txt
바퀴벌레포커
→ bluffing, party

코드네임
→ word, deduction, party

세트
→ reaction, puzzle

보난자
→ negotiation, card_play
```


---

# 3. situationTags

## 의미

누구와 하면 좋은지, 어떤 상황에서 꺼내기 좋은지.

## 선택지

```txt
date
데이트

friends
친구모임

family
가족

group
단체

solo_friendly
혼자 온 손님도 가능

beginner
입문자 추천

experienced
보드게임 좋아하는 사람 추천

couple
2인 추천

three_four
3~4인 추천

large_group
5인 이상 추천

drinking_mood
술자리 느낌

quick_play
짧게 한 판

long_stay
오래 머물 때

first_game
첫 게임으로 좋음

closing_game
마무리 게임으로 좋음
```

## 예시

```txt
도블
→ family, beginner, group, quick_play

스플렌더
→ date, friends, beginner, three_four

뱅
→ friends, large_group, long_stay

저스트원
→ group, beginner, first_game
```


---

# 4. interactionTags

## 의미

플레이어들 사이의 관계 구조. 협력인지, 경쟁인지, 팀전인지, 배신이 있는지.

## 선택지

```txt
competitive
개인 경쟁

cooperative
협력

team
팀전

hidden_role
정체 숨김 / 역할 숨김

betrayal
배신 / 배신감

semi_coop
반협력

take_that
견제 강함

low_conflict
갈등 적음

simultaneous
동시 진행

turn_based
차례 진행

table_talk
말로 풀어가는 게임

silent_focus
조용히 집중하는 게임
```

## 예시

```txt
팬데믹
→ cooperative, low_conflict

레지스탕스 아발론
→ team, hidden_role, betrayal, table_talk

스컬
→ competitive, bluffing, table_talk

7원더스
→ competitive, simultaneous, low_conflict
```


---

# 5. 게임별 설문 양식

게임 하나를 태깅할 때는 아래 양식으로 고른다.

```txt
게임명:

1. 분위기(moodTags)
□ funny
□ light
□ cozy
□ talky
□ tense
□ immersive
□ brainy
□ chaotic
□ warm
□ exciting

2. 플레이 방식(playTags)
□ bluffing
□ deduction
□ reaction
□ party
□ word
□ drawing
□ memory
□ puzzle
□ strategy
□ card_play
□ auction
□ negotiation
□ trick_taking
□ set_collection
□ engine_building
□ area_control
□ push_your_luck
□ roll_and_write
□ storytelling
□ dexterity

3. 상황(situationTags)
□ date
□ friends
□ family
□ group
□ solo_friendly
□ beginner
□ experienced
□ couple
□ three_four
□ large_group
□ drinking_mood
□ quick_play
□ long_stay
□ first_game
□ closing_game

4. 상호작용(interactionTags)
□ competitive
□ cooperative
□ team
□ hidden_role
□ betrayal
□ semi_coop
□ take_that
□ low_conflict
□ simultaneous
□ turn_based
□ table_talk
□ silent_focus
```


---

# 6. 추천 시스템에서의 역할

## 추천게임찾기

추천게임찾기 UI에서는 처음부터 모든 태그를 노출하지 않는다.

1차 UI:
- 인원
- 난이도
- 분위기

2차 확장 가능:
- 같이 온 사람
- 협력/경쟁/팀전
- 짧게/오래
- 대화 많은/조용한


---

# 7. 데이터 구조 반영안

현재 gameData의 cottage 영역에 아래 구조를 둔다.

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

기존 relationshipTags는 너무 넓은 범위였으므로, 장기적으로는 아래 둘로 나눈다.

```txt
relationshipTags
↓
situationTags
interactionTags
```

임시 하위호환이 필요하면 relationshipTags를 유지하되, 내부적으로는 situationTags + interactionTags로 이동한다.


---

# 8. 자동 태그 규칙 설계 방향

auto-tag-rules.js는 다음 기준으로 자동 태그를 생성한다.

## BGG mechanics 기반

예:
```txt
Bluffing
→ playTags: bluffing
→ moodTags: tense, talky
→ interactionTags: competitive, table_talk

Cooperative Game
→ interactionTags: cooperative
→ situationTags: friends, family

Hidden Roles
→ interactionTags: hidden_role, betrayal
→ moodTags: tense, talky
```

## BGG categories 기반

예:
```txt
Party Game
→ playTags: party
→ moodTags: funny, light
→ situationTags: group, beginner

Word Game
→ playTags: word
→ moodTags: talky
```

## 난이도 기반

예:
```txt
weight <= 1.2
→ situationTags: beginner, first_game
→ moodTags: light

weight >= 3.0
→ situationTags: experienced, long_stay
→ moodTags: brainy, immersive
```

## 인원 기반

예:
```txt
bestPlayers includes 2
→ situationTags: couple, date

bestPlayers includes 5+
→ situationTags: large_group, group
```

## 시간 기반

예:
```txt
playingTime <= 20
→ situationTags: quick_play

playingTime >= 90
→ situationTags: long_stay
```


---

# 9. 다음 작업

1. 이 태그 축이 마음에 드는지 검토
2. 필요 없는 태그 제거
3. 빠진 태그 추가
4. 태그 이름 확정
5. auto-tag-rules.js v1 생성
6. build-cottage-game-data.js에 자동 태그 merge 적용
