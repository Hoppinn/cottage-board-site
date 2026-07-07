-- 009_meeting_vote_games_expand.sql
-- 모임 플래너 게임 선호 확장 (2026-07-08)
--   A. is_priority BOOLEAN       — 대표 게임 플래그 (유저당·날짜당 최대 2개, application 강제)
--   B. player_condition TEXT     — 인원 조건 (any/best/recommended/2/3/4/5+)
--   C. meeting_votes UNIQUE      — (vote_date, user_id) 중복 DB 차단 (조건부)
--
-- D(RLS 활성화)는 이번 제외 — auth.uid() 불가(카카오 OAuth), Edge Function 설계 후 별도 010 마이그레이션
--
-- 실행: Supabase SQL Editor > 전체 붙여넣기 후 실행
-- 재실행 안전: IF NOT EXISTS / DO$$ 조건부 처리
-- C 결과 확인: 실행 후 NOTICE 메시지 ("추가됨" or "이미 존재 — 스킵")
--
-- 롤백:
--   ALTER TABLE public.meeting_vote_games DROP COLUMN IF EXISTS is_priority;
--   ALTER TABLE public.meeting_vote_games DROP COLUMN IF EXISTS player_condition;
--   ALTER TABLE public.meeting_votes DROP CONSTRAINT IF EXISTS meeting_votes_user_date_unique;

-- ── Step 1. C 사전 확인 SELECT (실행 후 NOTICE에서 결과 확인 가능, 아래 DO 블록으로 자동 처리) ──
-- 아래 쿼리를 먼저 단독 실행해 결과를 직접 확인할 수도 있음 (선택):
--   SELECT i.indisunique, t.relname
--   FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid
--   JOIN pg_attribute a1 ON a1.attrelid=t.oid AND a1.attname='vote_date' AND a1.attnum=ANY(i.indkey)
--   JOIN pg_attribute a2 ON a2.attrelid=t.oid AND a2.attname='user_id'   AND a2.attnum=ANY(i.indkey)
--   WHERE t.relname='meeting_votes' AND i.indisunique=true AND array_length(i.indkey,1)=2;

-- ── A. 대표 게임 플래그 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.meeting_vote_games
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;

-- ── B. 인원 조건 ─────────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.meeting_vote_games
  ADD COLUMN IF NOT EXISTS player_condition TEXT NOT NULL DEFAULT 'any';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name    = 'meeting_vote_games'
      AND constraint_name = 'meeting_vote_games_player_condition_check'
  ) THEN
    ALTER TABLE public.meeting_vote_games
      ADD CONSTRAINT meeting_vote_games_player_condition_check
      CHECK (player_condition IN ('any', 'best', 'recommended', '2', '3', '4', '5+'));
    RAISE NOTICE 'player_condition CHECK 추가됨';
  ELSE
    RAISE NOTICE 'player_condition CHECK 이미 존재 — 스킵';
  END IF;
END $$;

-- ── C. meeting_votes UNIQUE(vote_date, user_id) ───────────────────────────────────────────────
-- upsertMeetingVote ON CONFLICT 동작이 이미 이 제약을 전제함
-- pg_index 기반으로 컬럼 조합 실존 여부 확인 (제약 이름 무관)
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
    ALTER TABLE public.meeting_votes
      ADD CONSTRAINT meeting_votes_user_date_unique UNIQUE (vote_date, user_id);
    RAISE NOTICE 'meeting_votes UNIQUE(vote_date, user_id) 추가됨';
  ELSE
    RAISE NOTICE 'meeting_votes UNIQUE(vote_date, user_id) 이미 존재 — 스킵';
  END IF;
END $$;
