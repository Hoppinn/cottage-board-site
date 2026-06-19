-- ============================================================
-- 소급 업적 부여 SQL (128차 ID 체계 전환 후)
--
-- 실행 조건:
--   · achievements_id FK 제약 이미 제거됨
--     (ALTER TABLE user_achievements DROP CONSTRAINT user_achievements_achievement_id_fkey)
--   · earned_at 컬럼 확인됨 (NOT granted_at)
--   · photo_url: JSON array OR plain URL 혼재 → CASE로 처리
--
-- 실행 순서: 각 INSERT를 순서대로 실행 (CTE 스코프 제한으로 독립 문 분리)
-- ============================================================

-- ① record 축
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT s.user_id, ach.id, NOW()
FROM (
  SELECT user_id, COUNT(id) AS cnt FROM game_play_records WHERE user_id IS NOT NULL GROUP BY user_id
) s
CROSS JOIN (VALUES
  ('record_1',1),('record_3',3),('record_5',5),('record_8',8),
  ('record_10',10),('record_15',15),('record_20',20),('record_30',30),('record_40',40),
  ('record_50',50),('record_75',75),('record_100',100),('record_125',125),
  ('record_150',150),('record_200',200),('record_250',250),('record_300',300),
  ('record_400',400),('record_500',500)
) AS ach(id, threshold)
WHERE s.cnt >= ach.threshold
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.user_id = s.user_id AND ua.achievement_id = ach.id
);

-- ② new_game 축
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT s.user_id, ach.id, NOW()
FROM (
  SELECT user_id, COUNT(DISTINCT game_id) AS cnt FROM game_play_records WHERE user_id IS NOT NULL GROUP BY user_id
) s
CROSS JOIN (VALUES
  ('new_game_1',1),('new_game_3',3),('new_game_5',5),('new_game_7',7),
  ('new_game_10',10),('new_game_15',15),('new_game_20',20),('new_game_30',30),('new_game_40',40),
  ('new_game_50',50),('new_game_75',75),('new_game_100',100),('new_game_125',125),
  ('new_game_150',150),('new_game_200',200),('new_game_250',250),('new_game_300',300)
) AS ach(id, threshold)
WHERE s.cnt >= ach.threshold
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.user_id = s.user_id AND ua.achievement_id = ach.id
);

-- ③ photo 축 (JSON array → 개수, plain URL → 1개로 카운트)
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT s.user_id, ach.id, NOW()
FROM (
  SELECT user_id,
    SUM(
      CASE
        WHEN photo_url ~ '^\[.*\]$' THEN jsonb_array_length(photo_url::jsonb)
        ELSE 1
      END
    ) AS cnt
  FROM game_play_records
  WHERE user_id IS NOT NULL AND photo_url IS NOT NULL AND photo_url <> '' AND photo_url <> '[]'
  GROUP BY user_id
) s
CROSS JOIN (VALUES
  ('photo_1',1),('photo_2',2),('photo_3',3),('photo_5',5),
  ('photo_10',10),('photo_20',20),('photo_30',30),('photo_50',50),('photo_75',75),
  ('photo_100',100),('photo_150',150),('photo_200',200),('photo_300',300),('photo_500',500)
) AS ach(id, threshold)
WHERE s.cnt >= ach.threshold
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.user_id = s.user_id AND ua.achievement_id = ach.id
);

-- ④ review 축
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT s.user_id, ach.id, NOW()
FROM (
  SELECT user_id, COUNT(id) AS cnt FROM game_ratings WHERE user_id IS NOT NULL GROUP BY user_id
) s
CROSS JOIN (VALUES
  ('review_1',1),('review_2',2),('review_3',3),('review_5',5),('review_8',8),
  ('review_10',10),('review_15',15),('review_20',20),('review_25',25),('review_40',40),
  ('review_50',50),('review_75',75),('review_100',100),('review_150',150),
  ('review_200',200),('review_300',300),('review_500',500)
) AS ach(id, threshold)
WHERE s.cnt >= ach.threshold
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.user_id = s.user_id AND ua.achievement_id = ach.id
);

-- ⑤ visit 축
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT s.user_id, ach.id, NOW()
FROM (
  SELECT user_id, visit_count AS cnt FROM profiles WHERE user_id IS NOT NULL AND visit_count > 0
) s
CROSS JOIN (VALUES
  ('visit_3',3),('visit_5',5),('visit_10',10),('visit_15',15),('visit_20',20),('visit_25',25),
  ('visit_30',30),('visit_40',40),('visit_50',50),('visit_75',75),('visit_100',100),
  ('visit_150',150),('visit_200',200),('visit_300',300),('visit_400',400),('visit_500',500)
) AS ach(id, threshold)
WHERE s.cnt >= ach.threshold
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.user_id = s.user_id AND ua.achievement_id = ach.id
);

-- ⑥ first_record 축
INSERT INTO user_achievements (user_id, achievement_id, earned_at)
SELECT s.user_id, ach.id, NOW()
FROM (
  SELECT r.user_id, COUNT(DISTINCT r.game_id) AS cnt
  FROM game_play_records r
  INNER JOIN (
    SELECT game_id, MIN(created_at) AS first_at FROM game_play_records WHERE user_id IS NOT NULL GROUP BY game_id
  ) f ON f.game_id = r.game_id AND r.created_at = f.first_at
  GROUP BY r.user_id
) s
CROSS JOIN (VALUES
  ('first_record_1',1),('first_record_3',3),('first_record_5',5),
  ('first_record_10',10),('first_record_20',20),('first_record_50',50)
) AS ach(id, threshold)
WHERE s.cnt >= ach.threshold
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua
  WHERE ua.user_id = s.user_id AND ua.achievement_id = ach.id
);

-- ⑦ page_sessions에 session_key 컬럼이 없으면 추가
ALTER TABLE public.page_sessions ADD COLUMN IF NOT EXISTS session_key TEXT;
