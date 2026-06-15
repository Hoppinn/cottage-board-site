-- V1 업적/캐릭터/포인트 시스템
-- Supabase 대시보드 SQL 에디터에서 실행

-- 1. 업적 정의 (= 캐릭터 정의)
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  category TEXT,   -- 'play_record' | 'new_game' | 'photo' | 'review'
  threshold INT,
  points INT DEFAULT 0
);

-- 2. 유저별 획득 업적 (= 해금된 캐릭터)
CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- 3. 포인트 원장 (append-only)
CREATE TABLE IF NOT EXISTS points_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. profiles에 대표 캐릭터 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rep_achievement_id TEXT;

-- 5. V1 초기 업적 데이터 (17개)
INSERT INTO achievements (id, name, emoji, category, threshold, points) VALUES
  -- 탐험가 계열 (토끼) — 새로운 게임 경험
  ('rabbit_first', '새싹 토끼',          '🌱', 'play_record', 1,   300),
  ('rabbit_5',     '호기심 토끼',         '🔍', 'new_game',    5,   500),
  ('rabbit_20',    '탐험 토끼',           '🎒', 'new_game',    20,  1000),
  ('rabbit_50',    '여행 토끼',           '🧭', 'new_game',    50,  2000),
  ('rabbit_100',   '유랑 토끼',           '🗺️', 'new_game',   100, 3000),

  -- 기록가 계열 (다람쥐) — 플레이 기록 수
  ('squirrel_10',  '도토리 다람쥐',       '🌰', 'play_record', 10,  500),
  ('squirrel_50',  '창고 다람쥐',         '📦', 'play_record', 50,  1000),
  ('squirrel_100', '겨울준비 다람쥐',     '🧺', 'play_record', 100, 2000),
  ('squirrel_200', '사서 다람쥐',         '📖', 'play_record', 200, 5000),

  -- 사진가 계열 (고슴도치) — 사진 URL 개수 합산
  ('hedgehog_1',   '초보 고슴도치',       '📸', 'photo',       1,   300),
  ('hedgehog_10',  '기록가 고슴도치',     '🎞️', 'photo',      10,  500),
  ('hedgehog_50',  '포토마스터 고슴도치', '📷', 'photo',       50,  1000),
  ('hedgehog_100', '작가 고슴도치',       '🎨', 'photo',       100, 3000),

  -- 평론가 계열 (햄스터) — 별점(game_ratings) 수
  ('hamster_1',    '리뷰어 햄스터',       '✏️', 'review',     1,   300),
  ('hamster_10',   '서평가 햄스터',       '📝', 'review',      10,  500),
  ('hamster_50',   '평론가 햄스터',       '📚', 'review',      50,  1000),
  ('hamster_100',  '비평가 햄스터',       '🎓', 'review',      100, 3000)
ON CONFLICT (id) DO NOTHING;
