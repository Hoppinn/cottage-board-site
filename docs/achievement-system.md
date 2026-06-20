# Cottage Achievement System — SSOT

본 문서는 업적 시스템의 단일 진실 원천이다.
ACH_DEFS / TITLE_DEFS / 보상 / 지급 경로는 모두 이 문서를 기준으로 구현한다.
이 문서 없이 충돌하는 해석을 새로 만들지 않는다.

---

# 시스템 목적

코티지 이용의 다양한 흔적을 수집하는 성장 시스템.
첫 행동 유도 → 재방문 유도 → 성장 시각화(캐릭터/칭호/도감) → 다양한 활동 장려.
게임을 많이 한 사람보다 코티지에 다양하게 기여한 사람을 높게 평가한다.

---

# 업적 축 (8개)

| type | 의미 | 캐릭터 |
|------|------|--------|
| balance | 함께한 날 | 여우 |
| play | 플레이 참여 | 곰 |
| new_game | 새 게임 경험 | 토끼 |
| record | 플레이기록 작성 | 다람쥐 |
| photo | 사진 업로드 | 고슴도치 |
| review | 게임평 작성 | 햄스터 |
| first_record | 코티지 최초 기록 | 부엉이 |
| visit | 홈페이지 탐방 | 참새 |

표시 순서: balance → play → new_game / (구분선) / record → photo → review → first_record / (구분선) / visit

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
포인트 제도 삭제됨 — 음료교환권(voucher)으로 대체. `points` 필드 사용 금지.

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

일반 성장선과 분리. ACH_DEFS 보상에 포함하지 않는다. 획득 조건 추후 설계.

| 캐릭터 ID | 캐릭터이름 | 획득 조건 |
|-----------|-----------|-----------|
| `rare_lightning` | 번개 토끼 | 미정 |
| `rare_storyteller` | 이야기꾼 여우 | 미정 |
| `rare_night` | 밤의 순찰자 | 미정 |
| `rare_neoguri_1` | 미정 | 미정 |
| `rare_neoguri_2` | 미정 | 미정 |
| `rare_friend_rich` | 미정 | 미정 |

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

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| balance_10 | 다재다능 | fox_lv1 | 수습 여우 |
| balance_30 | 균형의 시작 | title_balance_30 | 코티지 올라운더 |
| balance_50 | 올라운더 | fox_lv2 | 탐정 여우 |
| balance_100 | 균형의 달인 | title_balance_100 | 균형의 달인 |
| balance_200 | 박식한 여우 | fox_lv3 | 명탐정 여우 |
| balance_300 | 코티지의 전설 | fox_lv4 + title_balance_300 | 전설의 탐정 여우 / 코티지의 전설 |

---

# Record (다람쥐)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| record_1 | 기록의 시작 | squirrel_lv1 + 교환권 | 새싹 다람쥐 |
| record_10 | 열 번의 기록 | title_record_10 | 첫 페이지 |
| record_30 | 서른 번의 기록 | squirrel_lv2 | 도토리 다람쥐 |
| record_50 | 쉰 번의 기록 | title_record_50 | 이야기 수집가 |
| record_75 | 장인 게이머 | squirrel_lv3 | 창고 다람쥐 |
| record_100 | 백 번의 기록 | title_record_100 | 코티지 연대기 작가 |
| record_150 | 백오십 번의 기록 | squirrel_lv4 | 겨울준비 다람쥐 |
| record_200 | 이백 번의 기록 | title_record_200 | 코티지 사서 |
| record_300 | 삼백 번의 기록 | title_record_300 | 코티지 골수팬 |
| record_400 | 여름의 플레이어 | squirrel_lv5 | 사서 다람쥐 |
| record_500 | 코티지 마스터 | cottage_master + title_record_500 | 코티지 마스터 / 코티지 마스터 |

---

# New Game (토끼)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| new_game_1 | 첫 탐험 | rabbit_lv1 | 새싹 토끼 |
| new_game_5 | 다섯 번째 탐험 | rabbit_lv2 | 호기심 토끼 |
| new_game_20 | 스무 가지 탐험 | rabbit_lv3 + 교환권 | 탐험 토끼 |
| new_game_30 | 서른 가지 탐험 | title_new_game_30 | 게임 사냥꾼 |
| new_game_50 | 오십 종 탐험 | rabbit_lv4 | 여행 토끼 |
| new_game_100 | 백 종 탐험 | title_new_game_100 | 코티지 유랑자 |
| new_game_150 | 백오십 종 탐험 | rabbit_lv5 | 유랑 토끼 |
| new_game_200 | 이백 종 탐험 | title_new_game_200 | 게임 학자 |
| new_game_300 | 삼백 종 탐험 | rabbit_lv6 + title_new_game_300 | 전설의 토끼 / 전설 탐험가 |

---

# Photo (고슴도치)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| photo_1 | 첫 사진 | hedgehog_lv1 | 초보 고슴도치 |
| photo_10 | 순간 수집 | title_photo_10 | 순간 수집가 |
| photo_20 | 스무 장의 기록 | hedgehog_lv2 | 기록가 고슴도치 |
| photo_50 | 기억 포착 | title_photo_50 | 기억 포착자 |
| photo_100 | 백 장의 기억 | hedgehog_lv3 + 교환권 | 포토마스터 고슴도치 |
| photo_150 | 사진 마스터 | title_photo_150 | 코티지 사진사 |
| photo_200 | 이백 장의 추억 | hedgehog_lv4 | 작가 고슴도치 |
| photo_300 | 사진 예술가 | title_photo_300 | 사진 마스터 |
| photo_500 | 전설의 사진가 | hedgehog_lv5 ⚠️미완성 | 작가 고슴도치 (lv5 파일 미제작) |

---

# Review (햄스터)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| review_1 | 첫 게임평 | hamster_lv1 | 리뷰어 햄스터 |
| review_8 | 번개 리뷰어 | (보상 없음) | — |
| review_10 | 열 번의 감상 | title_review_10 | 취향 기록자 |
| review_15 | 이야기꾼 | (보상 없음) | — |
| review_20 | 코티지 논객 | hamster_lv2 | 서평가 햄스터 |
| review_50 | 쉰 번의 감상 | title_review_50 | 코티지 안내자 |
| review_100 | 백 번의 감상 | hamster_lv3 + 교환권 | 평론가 햄스터 |
| review_150 | 백오십 번의 감상 | title_review_150 | 코티지 비평가 |
| review_200 | 이백 번의 감상 | hamster_lv4 | 비평가 햄스터 |
| review_300 | 삼백 번의 감상 | title_review_300 | 전설의 리뷰어 |
| review_500 | 전설의 리뷰어 | hamster_lv5 | 전설의 평론가 햄스터 |

---

# Visit (참새)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| visit_3 | 코티지 방문객 | sparrow_lv1 | 공감받는 참새 |
| visit_10 | 코티지 단골 | title_visit_10 | 코티지 단골 |
| visit_20 | 코티지 단골 Lv2 | sparrow_lv2 | 인기 참새 |
| visit_30 | 코티지 이웃 | title_visit_30 | 코티지 이웃 |
| visit_50 | 코티지 주민 | sparrow_lv3 | 스타 참새 |
| visit_100 | 터줏대감 | title_visit_100 | 터줏대감 |
| visit_200 | 코티지의 오랜 친구 | sparrow_lv4 + 교환권 | 전설의 참새 |
| visit_300 | 코티지 원로 | title_visit_300 | 코티지 원로 |
| visit_500 | 전설의 방문자 | sparrow_lv5 ⚠️미완성 + title_visit_500 | 전설 참새 / 코티지 전설 (lv5 파일 미제작) |

---

# Play (곰)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| play_10 | 활발한 참여자 | bear_lv1 | 손님 곰 |
| play_20 | 게임 동반자 | title_play_20 | 게임 동료 |
| play_50 | 코티지 피플 | bear_lv2 | 주민 곰 |
| play_100 | 백전노장 | 교환권 | — |
| play_150 | 코티지 레전드 | bear_lv3 | 단골 곰 |
| play_200 | 게임왕 | title_play_200 | 코티지 플레이어 |
| play_400 | 전설의 게이머 | bear_lv4 | 터줏대감 곰 |
| play_500 | 코티지 마스터 | bear_lv5 + title_play_500 | 숲의 전설 곰 / 게임왕 |

---

# First Record (부엉이)

| 업적 ID | 업적이름 | 보상 | 캐릭터이름 / 칭호이름 |
|---------|---------|------|----------------------|
| first_record_1 | 첫 개척 | owl_lv1 | 새내기 부엉이 |
| first_record_3 | 세 게임 개척 | title_first_record_3 | 첫 개척자 |
| first_record_5 | 다섯 게임 개척 | owl_lv2 | 지혜로운 부엉이 |
| first_record_10 | 개척자 | title_first_record_10 | 코티지 탐구자 |
| first_record_20 | 코티지 개척단 | owl_lv3 | 현자 부엉이 |
| first_record_50 | 전설의 개척자 | owl_lv4 + title_first_record_50 + 교환권 | 대현자 부엉이 / 전설의 개척자 |

---

# 미완성 항목

| 항목 | 내용 |
|------|------|
| hedgehog_lv5.png | photo_500 보상 파일 미제작. 달성자 발생 전 추가 필요. |
| sparrow_lv5.png | visit_500 보상 파일 미제작. 달성자 발생 전 추가 필요. |

---

# 고아 칭호 (TITLE_DEFS에 정의됐으나 ACH_DEFS에서 미참조)

| 칭호 ID | 칭호이름 | 비고 |
|---------|---------|------|
| title_record_150 | 코티지 단골손님 | record_150는 squirrel_lv4만 지급. 향후 추가 예정인지 확인 필요. |
| title_review_500 | 코티지의 감식가 | review_500은 hamster_lv5만 지급. 향후 추가 예정인지 확인 필요. |
