# 업적/캐릭터 ID 전면 리네임 체크포인트

최종 갱신: 2026-06-18
상태: **승인 완료 — 미실행**

---

## 0. 배경

업적 ID가 캐릭터 기반(`rabbit_first`, `squirrel_10`)으로 혼용되어 있어
축+조건 구조로 통일. 캐릭터 ID도 동물+레벨 구조로 정리.

이 작업은 론칭 전 마지막 기회. 승인 완료.

---

## 1. 확정된 원칙

| 종류 | 구조 | 예시 |
|---|---|---|
| 업적 ID | 축 + 조건 | `record_10`, `play_50`, `new_game_20` |
| 캐릭터 ID | 동물 + lv | `squirrel_lv2`, `bear_lv3` |
| 칭호 ID | title_ 계열 | 별도 정리 (이번 작업 범위 외) |

---

## 2. 축별 담당 동물 (확정)

| 축 | 타입 문자열 | 담당 동물 |
|---|---|---|
| 플레이기록 작성 | `record` | 다람쥐 (squirrel) |
| 플레이 참여 (보조) | `play` | 곰 (bear) |
| 새 게임 | `new_game` | 토끼 (rabbit) |
| 코티지 최초 기록 | `first_record` | 올빼미 (owl) |
| 사진 | `photo` | 고슴도치 (hedgehog) |
| 게임평 | `review` | 햄스터 (hamster) |
| 방문 | `visit` | 참새 (sparrow) |
| 복합/시즌/희귀 | — | 여우(fox) + rare_* + season_* |

---

## 3. 업적 ID 매핑표 (현재 → 신규)

### record 축 (현재 type: 'play' → 신규 type: 'record')
| 현재 ID | 신규 ID |
|---|---|
| rabbit_first | record_1 |
| play_3 | record_3 |
| play_5 | record_5 |
| play_8 | record_8 |
| squirrel_10 | record_10 |
| play_15 | record_15 |
| play_20 | record_20 |
| bear_30 | record_30 |
| play_40 | record_40 |
| squirrel_50 | record_50 |
| play_75 | record_75 |
| squirrel_100 | record_100 |
| play_125 | record_125 |
| bear_100 | record_150 |
| squirrel_200 | record_200 |
| play_250 | record_250 |
| bear_300 | record_300 |
| play_400 | record_400 |
| cottage_master | record_500 |

### play 축 (현재 type: 'participated' → 신규 type: 'play')
| 현재 ID | 신규 ID |
|---|---|
| participated_5 | play_5 |
| participated_10 | play_10 |
| participated_20 | play_20 |
| participated_30 | play_30 |
| participated_50 | play_50 |
| participated_100 | play_100 |
| participated_150 | play_150 |
| participated_200 | play_200 |
| participated_300 | play_300 |
| participated_500 | play_500 |

### 변경 없는 축 (ID 구조 이미 올바름)
- new_game_1 ~ owl_300 (new_game 축 17개)
- hedgehog_1 ~ hedgehog_100 (photo 축 12개)
- hamster_1 ~ fox_300 (review 축 16개)
- visit_3 ~ visit_500 (visit 축 16개)
- first_record_1 ~ first_record_50 (6개)

---

## 4. 캐릭터 ID 매핑표 (현재 파일명 → 신규)

### record 축 (다람쥐 계열)
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| rabbit_first.png | squirrel_lv1.png | record_1 | 새싹 다람쥐 |
| squirrel_10.png | squirrel_lv2.png | record_10 | 도토리 다람쥐 |
| squirrel_50.png | squirrel_lv3.png | record_50 | 창고 다람쥐 |
| squirrel_100.png | squirrel_lv4.png | record_100 | 겨울준비 다람쥐 |
| squirrel_200.png | squirrel_lv5.png | record_200 | 사서 다람쥐 |

### play 축 (곰 계열) — 임계값 기준 lv 재정렬
| 현재 파일 | 신규 파일 | 연결 업적(임계값) | 캐릭터명 |
|---|---|---|---|
| bear_10.png | bear_lv1.png | record_5 (5) | 단골 곰 |
| bear_30.png | bear_lv2.png | record_30 (30) | 놀이 곰돌이 |
| bear_50.png | bear_lv3.png | record_20 (20) → **주의** | 활발한 곰 |
| bear_100.png | bear_lv4.png | record_150 (150) | 코티지 곰 |
| bear_300.png | bear_lv5.png | record_300 (300) | 동면 곰 |

> ⚠️ bear_50(record_20)이 bear_30(record_30)보다 낮은 임계값에 붙어 있음.
> lv 번호는 임계값 오름차순으로 재정렬: lv1=5, lv2=20, lv3=30, lv4=150, lv5=300

### new_game 축 (토끼 계열)
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| rare_new_game.png | rabbit_lv1.png | new_game_1 | 탐험 토끼 |
| rabbit_5.png | rabbit_lv2.png | new_game_5 | 호기심 토끼 |
| rabbit_20.png | rabbit_lv3.png | new_game_20 | 탐험 토끼 |
| rabbit_50.png | rabbit_lv4.png | new_game_50 | 여행 토끼 |
| rabbit_100.png | rabbit_lv5.png | new_game_100 | 유랑 토끼 |
| rabbit_200.png | rabbit_lv6.png | new_game_150 | 방랑 토끼 |

### first_record 축 (올빼미 계열) — 현재 owl_* 가 new_game에도 쓰임
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| owl_10.png | owl_lv1.png | new_game_10 | 탐구 올빼미 |
| owl_30.png | owl_lv2.png | new_game_30 | 연구 올빼미 |
| owl_100.png | owl_lv3.png | new_game_200 | 박학 올빼미 |
| owl_300.png | owl_lv4.png | new_game_300 | 전설 올빼미 |

> ⚠️ 현재 owl은 new_game 축 보상에 연결됨.
> first_record 축(6개)은 현재 rewards: {} — 보상 캐릭터 없음.
> 추후 owl을 first_record 축 보상으로 이동할지는 다음 설계 결정 사항.
> 이번 작업에서는 owl은 new_game 축 보상 유지.

### photo 축 (고슴도치 계열)
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| hedgehog_1.png | hedgehog_lv1.png | photo_1 | 초보 고슴도치 |
| rare_first_record.png | hedgehog_lv2.png | photo_3 | 기록 고슴도치 |
| hedgehog_10.png | hedgehog_lv3.png | photo_20 | 기록가 고슴도치 |
| hedgehog_50.png | hedgehog_lv4.png | photo_100 | 포토마스터 고슴도치 |
| hedgehog_100.png | hedgehog_lv5.png | photo_200 | 작가 고슴도치 |

### review 축 (햄스터 계열)
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| hamster_1.png | hamster_lv1.png | review_1 | 리뷰어 햄스터 |
| hamster_10.png | hamster_lv2.png | review_10 | 서평가 햄스터 |
| hamster_50.png | hamster_lv3.png | review_50 | 평론가 햄스터 |
| hamster_100.png | hamster_lv4.png | review_100 | 비평가 햄스터 |
| hamster_300.png | hamster_lv5.png | review_150 | 마스터 햄스터 |

### visit 축 (참새 계열)
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| rare_friend.png | sparrow_lv1.png | visit_3 | 방문 참새 |
| sparrow_10.png | sparrow_lv2.png | visit_10 | 단골 참새 |
| sparrow_50.png | sparrow_lv3.png | visit_50 | 주민 참새 |
| sparrow_200.png | sparrow_lv4.png | visit_200 | 코티지 참새 |
| sparrow_1000.png | sparrow_lv5.png | visit_500 | 전설 참새 |

### 복합/여우 계열
| 현재 파일 | 신규 파일 | 연결 업적 | 캐릭터명 |
|---|---|---|---|
| fox_10.png | fox_lv1.png | review_5 | 감상 여우 |
| fox_30.png | fox_lv2.png | review_25 | 취향 여우 |
| fox_100.png | fox_lv3.png | review_200 | 박식한 여우 |
| fox_300.png | fox_lv4.png | review_300 | 코티지 여우 |

### 변경 없음 (시즌/희귀/특수)
- rare_night.png / rare_lightning.png / rare_storyteller.png / rare_new_game.png → **주의**: rare_new_game은 rabbit_lv1으로 흡수됨
- season_spring.png / season_summer.png / season_halloween.png / season_christmas.png
- cottage_master.png

---

## 5. 이미지 경로 버그 (기존 + 이번에 함께 수정)

`kakao-auth.js`에서 `repAch.id`를 직접 PNG 파일명으로 사용 중 — 잘못된 패턴.

수정 방향:
```js
// 현재 (버그)
src = `/assets/images/characters/characters_basic/${repAch.id}.png`

// 수정 후
const _repDef = ACH_DEFS.find(d => d.id === repAch?.id);
src = `/assets/images/characters/characters_basic/${_repDef?.rewards?.character || 'squirrel_lv1'}.png`
```

kakao-auth.js:224 기본 이미지도 `rabbit_first.png` → `squirrel_lv1.png`

---

## 6. DB 마이그레이션 SQL (사용자가 Supabase 대시보드에서 실행)

```sql
-- user_achievements
UPDATE user_achievements SET achievement_id = 'record_1'   WHERE achievement_id = 'rabbit_first';
UPDATE user_achievements SET achievement_id = 'record_3'   WHERE achievement_id = 'play_3';
UPDATE user_achievements SET achievement_id = 'record_5'   WHERE achievement_id = 'play_5';
UPDATE user_achievements SET achievement_id = 'record_8'   WHERE achievement_id = 'play_8';
UPDATE user_achievements SET achievement_id = 'record_10'  WHERE achievement_id = 'squirrel_10';
UPDATE user_achievements SET achievement_id = 'record_15'  WHERE achievement_id = 'play_15';
UPDATE user_achievements SET achievement_id = 'record_20'  WHERE achievement_id = 'play_20';
UPDATE user_achievements SET achievement_id = 'record_30'  WHERE achievement_id = 'bear_30';
UPDATE user_achievements SET achievement_id = 'record_40'  WHERE achievement_id = 'play_40';
UPDATE user_achievements SET achievement_id = 'record_50'  WHERE achievement_id = 'squirrel_50';
UPDATE user_achievements SET achievement_id = 'record_75'  WHERE achievement_id = 'play_75';
UPDATE user_achievements SET achievement_id = 'record_100' WHERE achievement_id = 'squirrel_100';
UPDATE user_achievements SET achievement_id = 'record_125' WHERE achievement_id = 'play_125';
UPDATE user_achievements SET achievement_id = 'record_150' WHERE achievement_id = 'bear_100';
UPDATE user_achievements SET achievement_id = 'record_200' WHERE achievement_id = 'squirrel_200';
UPDATE user_achievements SET achievement_id = 'record_250' WHERE achievement_id = 'play_250';
UPDATE user_achievements SET achievement_id = 'record_300' WHERE achievement_id = 'bear_300';
UPDATE user_achievements SET achievement_id = 'record_400' WHERE achievement_id = 'play_400';
UPDATE user_achievements SET achievement_id = 'record_500' WHERE achievement_id = 'cottage_master';
UPDATE user_achievements SET achievement_id = 'play_5'     WHERE achievement_id = 'participated_5';
UPDATE user_achievements SET achievement_id = 'play_10'    WHERE achievement_id = 'participated_10';
UPDATE user_achievements SET achievement_id = 'play_20'    WHERE achievement_id = 'participated_20';
UPDATE user_achievements SET achievement_id = 'play_30'    WHERE achievement_id = 'participated_30';
UPDATE user_achievements SET achievement_id = 'play_50'    WHERE achievement_id = 'participated_50';
UPDATE user_achievements SET achievement_id = 'play_100'   WHERE achievement_id = 'participated_100';
UPDATE user_achievements SET achievement_id = 'play_150'   WHERE achievement_id = 'participated_150';
UPDATE user_achievements SET achievement_id = 'play_200'   WHERE achievement_id = 'participated_200';
UPDATE user_achievements SET achievement_id = 'play_300'   WHERE achievement_id = 'participated_300';
UPDATE user_achievements SET achievement_id = 'play_500'   WHERE achievement_id = 'participated_500';

-- profiles (대표 캐릭터)
UPDATE profiles SET rep_achievement_id = 'record_1'   WHERE rep_achievement_id = 'rabbit_first';
UPDATE profiles SET rep_achievement_id = 'record_10'  WHERE rep_achievement_id = 'squirrel_10';
UPDATE profiles SET rep_achievement_id = 'record_30'  WHERE rep_achievement_id = 'bear_30';
UPDATE profiles SET rep_achievement_id = 'record_50'  WHERE rep_achievement_id = 'squirrel_50';
UPDATE profiles SET rep_achievement_id = 'record_100' WHERE rep_achievement_id = 'squirrel_100';
UPDATE profiles SET rep_achievement_id = 'record_150' WHERE rep_achievement_id = 'bear_100';
UPDATE profiles SET rep_achievement_id = 'record_200' WHERE rep_achievement_id = 'squirrel_200';
UPDATE profiles SET rep_achievement_id = 'record_300' WHERE rep_achievement_id = 'bear_300';
UPDATE profiles SET rep_achievement_id = 'record_500' WHERE rep_achievement_id = 'cottage_master';
-- new_game / photo / review / visit / first_record 축은 ID 불변 → SQL 불필요

-- point_rewards
UPDATE point_rewards SET achievement_id = 'record_1'   WHERE achievement_id = 'rabbit_first';
UPDATE point_rewards SET achievement_id = 'record_10'  WHERE achievement_id = 'squirrel_10';
-- (user_achievements와 동일 매핑 적용)

-- achievements 테이블 (DB측 정의 — 현재 17행)
UPDATE achievements SET id = 'record_1'  WHERE id = 'rabbit_first';
-- (동일 매핑 적용, 해당하는 행만)
```

---

## 7. 실행 순서 (다음 세션)

1. PNG 파일 rename (PowerShell 일괄)
2. `achievements.js` — ACH_DEFS 전체 재작성 (id + type + rewards.character)
3. `kakao-auth.js` — repAch 이미지 버그 수정 + 하드코딩 교체
4. `supabase-client.js` — category 문자열 교체 (play→record, participated→play)
5. 로직 검증 (node 또는 추적)
6. 커밋
7. DB SQL → 사용자가 Supabase 대시보드 실행

---

## 8. 미결 사항

- 올빼미(owl)를 new_game에서 first_record 축으로 이동할지 → **다음 세션 시작 시 결정 후 진행**
- 칭호 ID (`title_squirrel_10` 등) rename → **이번 범위 외, 추후 검토**
- `rare_new_game.png`가 `rabbit_lv1.png`로 흡수됨 — 파일 삭제 여부 확인 필요
