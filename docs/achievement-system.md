# Cottage Achievement System — SSOT

본 문서는 업적 시스템의 단일 진실 원천이다.
ACH_DEFS / TITLE_DEFS / 보상 / 지급 경로는 모두 이 문서를 기준으로 구현한다.
이 문서 없이 충돌하는 해석을 새로 만들지 않는다.

---

# 시스템 목적

포인트 누적이 아니라 코티지 이용의 다양한 흔적을 수집하는 성장 시스템.
첫 행동 유도 → 재방문 유도 → 성장 시각화(캐릭터/칭호/도감) → 다양한 활동 장려.
게임을 많이 한 사람보다 코티지에 다양하게 기여한 사람을 높게 평가한다.

---

# 업적 축 (8개)

| type | 의미 | 캐릭터 |
|------|------|--------|
| record | 플레이기록 작성 | 다람쥐 |
| new_game | 새 게임 경험 | 토끼 |
| photo | 사진 업로드 | 고슴도치 |
| review | 게임평 작성 | 햄스터 |
| visit | 홈페이지 탐방 | 참새 |
| play | 플레이 참여 | 곰 |
| first_record | 코티지 최초 기록 | 부엉이 |
| balance | 함께한 날 | 여우 |

---

# ID 규칙

## 업적 ID — 행동축 기준
- 형식: `{type}_{threshold}` (예: `record_100`, `review_50`, `new_game_20`)
- 금지: 동물명 기반 (`rabbit_20`, `fox_25`, `hamster_100`)

## 칭호 ID — 행동축 기준
- 형식: `title_{type}_{threshold}` (예: `title_record_100`, `title_review_50`)
- 금지: 동물명 기반 (`title_rabbit_20`, `title_fox_25`)

## 캐릭터 ID — 파일명 기준
- 형식: `{animal}_lv{n}` / `rare_{name}` / `season_{name}` (예: `rabbit_lv1`, `rare_lightning`, `season_spring`)

⚠️ 업적 ID는 사용자 자산(획득 업적, 교환권, 도감 진행률)의 기준값이므로 배포 후 변경 금지. `CLAUDE.md §영구 식별자` 참조.

---

# 보상 구조

모든 업적의 rewards 필드:
```js
{ character: null, title: null, voucher: false }
```
포인트 비활성화 — `points` 필드 사용 금지.

보상 순서 원칙: 캐릭터 → 칭호 → 캐릭터 → 칭호 교차를 가능한 한 유지. 완벽한 대칭 강제 안 함.

⚠️ 이 문서는 보상이 있는 임계값만 기재한다. 보상 없는 중간 업적(예: record_3, record_5…)의 전체 목록은 `achievements.js ACH_DEFS` 기준이다.

---

# 교환권 지급 규칙

총 7개. 축당 최대 1개.

| 업적 | 지급 함수 | 비고 |
|------|-----------|------|
| `record_1` | `grantFirstPlayVoucher` | recordGamePlay 직후 자동 지급. **다른 업적과 경로 다름** |
| `new_game_20` | `grantAchievementVoucher` | |
| `photo_100` | `grantAchievementVoucher` | |
| `review_100` | `grantAchievementVoucher` | |
| `visit_200` | `grantAchievementVoucher` | |
| `play_100` | `grantAchievementVoucher` | |
| `first_record_50` | `grantAchievementVoucher` | |

⚠️ `balance` 축은 교환권 없음 — by design. ACH_DEF에 `voucher: false` 유지.

`grantAchievementVoucher` 중복 방지: JS 사전 SELECT 확인 + DB partial unique index (`voucher_log(user_id, note) WHERE reason='achievement'`) 이중 방어. 오너(`_OWNER_ID = '4916417947'`) 제외.

---

# 시스템 철학 (요약)

- **캐릭터**: 성장의 증거. 닉네임 아바타.
- **칭호**: 정체성. 닉네임 옆 표시 시 캐릭터보다 우선.
- **교환권**: 실물 보상. 희소해야 함. 축당 최대 1개.
- **시즌 캐릭터**: 성장선 아님. 이벤트/컬렉션. 획득 조건 추후 설계.
- **희귀 캐릭터**: 성장선 아님. 특수 조건 보상.

---

# 희귀 캐릭터

일반 성장선과 분리. 특수 조건 보상. 수정 시 아래 축 보상 테이블도 함께 확인할 것.

| 캐릭터 | 획득 업적 | 축 |
|--------|-----------|-----|
| `rare_lightning` | `review_8` | review |
| `rare_storyteller` | `review_15` | review |
| `rare_night` | `play_100` | play |

---

# 시즌 캐릭터

`season_spring` / `season_summer` / `season_halloween` / `season_christmas`

---

# Balance(여우) — 함께한 날

## 정의

코티지보드 매장에 함께한 고유 날짜 수.

- 하루에 여러 기록이 있어도 1일
- 날짜 기준: `played_at` 우선, 없으면 `created_at` KST 변환 (`+9h`)
- 카운팅 대상: `user_id` 작성자 + `player_names` ILIKE 닉네임 포함 참여자

## 판정 한계 (임시 방식)

player_names 텍스트 기반 카운팅 — 닉네임 변경/동명이인/부분매칭 오탐 가능.

장기 전환 목표: `game_play_participants` 테이블
```
game_play_participants
- id
- record_id (game_play_records.id)
- user_id
- nickname_snapshot
- created_at
```
전환 시 play/balance/new_game 카운팅을 모두 user_id 기준으로 정확화 가능.

## 보상

balance_10 → fox_lv1
balance_30 → title_balance_30
balance_50 → fox_lv2
balance_100 → title_balance_100
balance_200 → fox_lv3
balance_300 → fox_lv4 + title_balance_300

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
review_8 → rare_lightning
review_10 → title_review_10
review_15 → rare_storyteller
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
