-- 009_meeting_vote_games_expand.sql
-- 모임 플래너 게임 선호 테이블 생성 + 확장 (2026-07-08)
--
-- 008이 미실행 상태임을 확인 → 008(테이블 생성) + 009(컬럼 확장)를 통합 처리
--   A. is_priority BOOLEAN       — 대표 게임 플래그 (유저당·날짜당 최대 2개, application 강제)
--   B. player_condition TEXT     — 인원 조건 (any/best/recommended/2/3/4/5+)
--   C. meeting_votes UNIQUE      — (vote_date, user_id) 중복 DB 차단 (조건부)
--
-- D(RLS 활성화)는 이번 제외 — auth.uid() 불가(카카오 OAuth), Edge Function 설계 후 별도 010
--
-- 실행: Supabase SQL Editor > 전체 붙여넣기 후 실행
-- 재실행 안전: IF NOT EXISTS / DO$$ 조건부 처리
-- C 결과 확인: 실행 후 NOTICE 메시지 ("추가됨" or "이미 존재 — 스킵")
--
-- 롤백:
--   DROP TABLE IF EXISTS meeting_vote_games;  -- 테이블이 이번에 새로 생겼다면
--   ALTER TABLE meeting_votes DROP CONSTRAINT IF EXISTS meeting_votes_user_date_unique;

-- ── 테이블 생성 (008 내용 + 009 신규 컬럼 포함) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_vote_games (
  id               BIGSERIAL   PRIMARY KEY,
  vote_date        DATE        NOT NULL,
  user_id          TEXT        NOT NULL,
  list_type        TEXT        NOT NULL CHECK (list_type IN ('want', 'learn')),
  game_id          INT,
  custom_name      TEXT,
  is_priority      BOOLEAN     NOT NULL DEFAULT FALSE,
  player_condition TEXT        NOT NULL DEFAULT 'any'
                               CHECK (player_condition IN ('any', 'best', 'recommended', '2', '3', '4', '5+')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
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

-- ── 기존 테이블에 컬럼이 없을 경우 추가 (테이블이 이미 있던 경우 대비) ─────────────────────
ALTER TABLE meeting_vote_games
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE meeting_vote_games
  ADD COLUMN IF NOT EXISTS player_condition TEXT NOT NULL DEFAULT 'any';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name    = 'meeting_vote_games'
      AND constraint_name = 'meeting_vote_games_player_condition_check'
  ) THEN
    ALTER TABLE meeting_vote_games
      ADD CONSTRAINT meeting_vote_games_player_condition_check
      CHECK (player_condition IN ('any', 'best', 'recommended', '2', '3', '4', '5+'));
    RAISE NOTICE 'player_condition CHECK 추가됨';
  ELSE
    RAISE NOTICE 'player_condition CHECK 이미 존재 — 스킵';
  END IF;
END $$;

-- ── C. meeting_votes UNIQUE(vote_date, user_id) ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_index    i
    JOIN   pg_class    t  ON t.oid = i.indrelid
    JOIN   pg_attribute a1 ON a1.attrelid = t.oid
                          AND a1.attname  = 'vote_date'
                          AND a1.attnum   = ANY(i.indkey)
    JOIN   pg_attribute a2 ON a2.attrelid = t.oid
                          AND a2.attname  = 'user_id'
                          AND a2.attnum   = ANY(i.indkey)
    WHERE  t.relname       = 'meeting_votes'
      AND  i.indisunique   = true
      AND  array_length(i.indkey, 1) = 2
  ) THEN
    ALTER TABLE meeting_votes
      ADD CONSTRAINT meeting_votes_user_date_unique UNIQUE (vote_date, user_id);
    RAISE NOTICE 'meeting_votes UNIQUE(vote_date, user_id) 추가됨';
  ELSE
    RAISE NOTICE 'meeting_votes UNIQUE(vote_date, user_id) 이미 존재 — 스킵';
  END IF;
END $$;
