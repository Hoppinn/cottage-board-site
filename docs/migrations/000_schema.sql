-- 코티지보드 전체 스키마 마이그레이션
-- Supabase 대시보드 SQL 에디터에서 전체 실행 (IF NOT EXISTS로 멱등)
-- 파일 하나에서 모두 관리 — 새 테이블/컬럼 추가 시 하단에 이어 붙임

-- ── 업적/캐릭터/포인트 V1 ──────────────────────────────────────────────

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

-- 3. 포인트 원장 (append-only, 관리자 승인 후 기록)
CREATE TABLE IF NOT EXISTS points_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 포인트 승인 대기 테이블
--    업적 달성 시 point_rewards(pending) 생성 → 관리자 승인 → points_log 반영
CREATE TABLE IF NOT EXISTS point_rewards (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT REFERENCES achievements(id),
  points INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- 5. profiles에 대표 캐릭터 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rep_achievement_id TEXT;

-- 6. RLS + anon 정책 (다른 테이블과 동일 패턴)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_achievements" ON achievements;
CREATE POLICY "anon_select_achievements"
  ON achievements FOR SELECT TO anon USING (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_user_achievements" ON user_achievements;
CREATE POLICY "anon_insert_user_achievements"
  ON user_achievements FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_user_achievements" ON user_achievements;
CREATE POLICY "anon_select_user_achievements"
  ON user_achievements FOR SELECT TO anon USING (true);

ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_points_log" ON points_log;
CREATE POLICY "anon_insert_points_log"
  ON points_log FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_points_log" ON points_log;
CREATE POLICY "anon_select_points_log"
  ON points_log FOR SELECT TO anon USING (true);

ALTER TABLE point_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_point_rewards" ON point_rewards;
CREATE POLICY "anon_insert_point_rewards"
  ON point_rewards FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_point_rewards" ON point_rewards;
CREATE POLICY "anon_select_point_rewards"
  ON point_rewards FOR SELECT TO anon USING (true);

-- 7. RLS 비활성화 — 이 프로젝트는 카카오 OAuth 기반이라 auth.uid()가 없고
--    프로젝트 기본이 RLS OFF다(운영 DB 실측 확인, docs/db-schema.md 참조).
--    위 6번은 ENABLE + SELECT/INSERT 정책만 걸어놔서, 이 파일만으로 재구축하면
--    RLS는 켜진 채 UPDATE/DELETE 정책이 없어 조용히 막힌다 — 009/013/018과 동일하게
--    명시적으로 끈다(2026-07-31, 무인 운영 내구성 감사).
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE points_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_rewards DISABLE ROW LEVEL SECURITY;

-- 8. V1 초기 업적 데이터 (17개)
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
