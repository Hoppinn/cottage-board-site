-- 008_meeting_vote_games.sql
-- 모임 플래너 날짜별 게임 선호 저장 테이블
-- 용도: 특정 날짜(vote_date)에 하고 싶은 게임(want) / 배우고 싶은 게임(learn) 등록
-- meeting_game_prefs(모임 보드 상시 선호)와 분리 — 날짜 단위 의사 전용
--
-- 실행: Supabase SQL Editor > 이 파일 내용 붙여넣기 후 실행

CREATE TABLE IF NOT EXISTS meeting_vote_games (
  id          BIGSERIAL PRIMARY KEY,
  vote_date   DATE        NOT NULL,
  user_id     TEXT        NOT NULL,
  list_type   TEXT        NOT NULL CHECK (list_type IN ('want', 'learn')),
  game_id     INT,
  custom_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- game_id 또는 custom_name 중 하나는 반드시 있어야 함
  CHECK (game_id IS NOT NULL OR custom_name IS NOT NULL)
);

-- 카탈로그 게임 중복 방지 (같은 날짜+유저+타입+게임ID)
CREATE UNIQUE INDEX IF NOT EXISTS meeting_vote_games_catalog_uq
  ON meeting_vote_games (vote_date, user_id, list_type, game_id)
  WHERE game_id IS NOT NULL;

-- 직접입력 게임 중복 방지 (같은 날짜+유저+타입+게임명, game_id 없을 때만)
CREATE UNIQUE INDEX IF NOT EXISTS meeting_vote_games_custom_uq
  ON meeting_vote_games (vote_date, user_id, list_type, custom_name)
  WHERE custom_name IS NOT NULL AND game_id IS NULL;
