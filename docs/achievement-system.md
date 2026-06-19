# Cottage Achievement System

본 문서는 코티지 업적 시스템의 단일 진실 원천(SSOT)이다.

ACH_DEFS
TITLE_DEFS
캐릭터 보상
칭호 보상
교환권 보상
성장보드 UI

는 모두 본 문서를 기준으로 구현한다.

ClaudeCode는 본 문서와 충돌하는 해석을 새로 만들지 않는다.

---

# 목적

코티지 업적 시스템은 포인트를 모으는 시스템이 아니다.

유저가 코티지를 이용하며

- 다양한 게임을 경험하고
- 기록을 남기고
- 사진을 공유하고
- 게임평을 작성하고
- 꾸준히 방문하고
- 새로운 게임을 개척하고
- 여러 활동을 균형 있게 경험한 흔적

을 수집하는 성장 시스템이다.

---

# 핵심 목표

## 첫 행동 유도

첫 기록
첫 게임평
첫 사진

등의 행동을 유도한다.

## 재방문 유도

다음 보상을 향해 다시 방문하게 만든다.

## 성장 시각화

성장을

- 캐릭터
- 칭호
- 도감

으로 보여준다.

## 다양한 활동 장려

한 행동만 반복하지 않도록 만든다.

## 코티지 문화 형성

게임을 많이 한 사람보다

코티지에 다양하게 기여한 사람을 높게 평가한다.

---

# 업적 축

총 8개

| type | 의미 | 캐릭터 |
|--------|--------|--------|
| record | 기록 작성 | 다람쥐 |
| new_game | 새 게임 경험 | 토끼 |
| photo | 사진 업로드 | 고슴도치 |
| review | 게임평 작성 | 햄스터 |
| visit | 방문 | 참새 |
| play | 플레이 참여 | 곰 |
| first_record | 최초 기록 | 부엉이 |
| balance | 균형 성장 | 여우 |

---

# 시스템 철학

## 캐릭터

캐릭터는 성장이다.

## 칭호

칭호는 정체성이다.

닉네임 옆에는 캐릭터보다 칭호를 우선 노출한다.

## 교환권

교환권은 실물 보상이다.

희소해야 한다.

축당 최대 1개를 원칙으로 한다.

## 시즌 캐릭터

성장선이 아니다.

이벤트/컬렉션이다.

## 희귀 캐릭터

성장선이 아니다.

특수 조건 보상이다.

---

# ID 규칙

## 업적

업적 ID는 행동축 기준이다.

예

record_100
review_50
new_game_20

금지

rabbit_20
fox_25
hamster_100

## 칭호

칭호 ID는 행동축 기준이다.

예

title_record_100
title_review_50
title_new_game_20

금지

title_rabbit_20
title_fox_25

## 캐릭터

캐릭터 ID는 캐릭터 파일 기준이다.

예

rabbit_lv1
fox_lv2
season_spring
rare_lightning

---

# 보상 구조

모든 업적은 아래 구조를 사용한다.

{
  rewards: {
    character: null,
    title: null,
    voucher: false
  }
}

포인트 사용 금지.

points 필드 제거 또는 미사용.

---

# 성장 보상 원칙

기본 원칙

캐릭터
↓
칭호
↓
캐릭터
↓
칭호

가능한 한 유지한다.

단,

캐릭터 수가 축마다 다르므로 완벽한 대칭을 강제하지 않는다.

우선순위

1. 현재 보유 캐릭터 활용
2. 성장 체감
3. 퐁당퐁당

---

# Balance(여우)

여우는 게임평 축이 아니다.

여우는 균형 성장 축이다.

조건 계산 축

record
new_game
photo
review
visit
play

총 6개

first_record 제외

보상

balance_10 → fox_lv1

balance_30 → title_balance_30

balance_50 → fox_lv2

balance_100 → title_balance_100

balance_200 → fox_lv3

balance_300 → fox_lv4 + title_balance_300

---

# 교환권

총 7개

record_1
new_game_20
photo_100
review_100
visit_200
play_100
first_record_50

축당 최대 1개

---

# 희귀 캐릭터

rare_lightning
rare_storyteller
rare_night

일반 성장선과 분리

---

# 시즌 캐릭터

업적 보상 아님

별도 컬렉션

season_spring
season_summer
season_halloween
season_christmas

획득 조건은 추후 설계

---

# Record (다람쥐)

record_1 → squirrel_lv1 + 교환권

record_10 → title_record_10

record_30 → squirrel_lv2

record_50 → title_record_50

record_75 → squirrel_lv3

record_100 → title_record_100

record_150 → squirrel_lv4

record_200 → title_record_200

record_300 → title_record_300

record_400 → squirrel_lv5

record_500 → cottage_master + title_record_500

---

# New Game (토끼)

new_game_1 → rabbit_lv1

new_game_5 → rabbit_lv2

new_game_20 → rabbit_lv3 + 교환권

new_game_30 → title_new_game_30

new_game_50 → rabbit_lv4

new_game_100 → title_new_game_100

new_game_150 → rabbit_lv5

new_game_200 → title_new_game_200

new_game_300 → rabbit_lv6 + title_new_game_300

---

# Photo (고슴도치)

photo_1 → hedgehog_lv1

photo_10 → title_photo_10

photo_20 → hedgehog_lv2

photo_50 → title_photo_50

photo_100 → hedgehog_lv3 + 교환권

photo_150 → title_photo_150

photo_200 → hedgehog_lv4

photo_300 → title_photo_300

photo_500 → hedgehog_lv5

---

# Review (햄스터)

review_1 → hamster_lv1

review_10 → title_review_10

review_20 → hamster_lv2

review_50 → title_review_50

review_100 → hamster_lv3 + 교환권

review_150 → title_review_150

review_200 → hamster_lv4

review_300 → title_review_300

review_500 → hamster_lv5

---

# Visit (참새)

visit_3 → sparrow_lv1

visit_10 → title_visit_10

visit_20 → sparrow_lv2

visit_30 → title_visit_30

visit_50 → sparrow_lv3

visit_100 → title_visit_100

visit_200 → sparrow_lv4 + 교환권

visit_300 → title_visit_300

visit_500 → sparrow_lv5 + title_visit_500

---

# Play (곰)

play_10 → bear_lv1

play_20 → title_play_20

play_50 → bear_lv2

play_100 → rare_night + 교환권

play_150 → bear_lv3

play_200 → title_play_200

play_400 → bear_lv4

play_500 → bear_lv5 + title_play_500

---

# First Record (부엉이)

first_record_1 → owl_lv1

first_record_3 → title_first_record_3

first_record_5 → owl_lv2

first_record_10 → title_first_record_10

first_record_20 → owl_lv3

first_record_50 → owl_lv4 + title_first_record_50 + 교환권

---
