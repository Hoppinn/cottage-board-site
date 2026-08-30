-- 내보드 IA 1단계: 평소 게임 깊이 + 가장 어려웠던 게임 + 날짜별 학습 의지
-- 실행: Supabase SQL Editor > 전체 붙여넣기 후 실행
-- 기존 데이터는 비우거나 이동하지 않는다. 새 프로필 값은 빈 배열/0행으로 호환한다.

-- 1. 평소 즐기는 게임 깊이: 복수선택, any 없음
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_game_depths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE public.profiles
SET preferred_game_depths = ARRAY[]::TEXT[]
WHERE preferred_game_depths IS NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_game_depths_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_game_depths_check
  CHECK (
    preferred_game_depths <@ ARRAY['light', 'medium', 'deep']::TEXT[]
    AND cardinality(array_positions(preferred_game_depths, 'light')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'medium')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'deep')) <= 1
  );

-- 2. 해본 게임 중 가장 어려웠던 게임: 순서가 있는 최대 2개
-- game_id는 game_likes/meeting_game_prefs와 같은 COTTAGE_GAMES game key를 저장한다.
-- 카탈로그 밖 게임은 custom_name에 보존하며 둘 중 정확히 하나만 사용한다.
CREATE TABLE IF NOT EXISTS public.profile_hardest_games (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  sort_order  SMALLINT NOT NULL CHECK (sort_order BETWEEN 1 AND 2),
  game_id     TEXT,
  custom_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_hardest_games_one_game_check CHECK (
    num_nonnulls(NULLIF(btrim(game_id), ''), NULLIF(btrim(custom_name), '')) = 1
  ),
  CONSTRAINT profile_hardest_games_custom_name_check CHECK (
    custom_name IS NULL OR char_length(btrim(custom_name)) BETWEEN 1 AND 100
  ),
  CONSTRAINT profile_hardest_games_game_id_check CHECK (
    game_id IS NULL OR char_length(btrim(game_id)) BETWEEN 1 AND 100
  ),
  CONSTRAINT profile_hardest_games_user_order_unique UNIQUE (user_id, sort_order)
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_hardest_games_catalog_uq
  ON public.profile_hardest_games (user_id, game_id)
  WHERE game_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profile_hardest_games_custom_uq
  ON public.profile_hardest_games (user_id, lower(btrim(custom_name)))
  WHERE custom_name IS NOT NULL AND game_id IS NULL;

-- 카카오 OAuth + anon 직접 접근이라는 기존 프로필 테이블 계약을 따른다.
ALTER TABLE public.profile_hardest_games DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_hardest_games TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.profile_hardest_games_id_seq TO anon;

-- 목록 교체 중 INSERT가 실패해 기존 두 행만 지워지는 일을 막기 위한 원자적 저장 함수.
CREATE OR REPLACE FUNCTION public.replace_profile_hardest_games(
  p_user_id TEXT,
  p_games JSONB DEFAULT '[]'::JSONB
)
RETURNS SETOF public.profile_hardest_games
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  IF jsonb_typeof(COALESCE(p_games, '[]'::JSONB)) <> 'array' THEN
    RAISE EXCEPTION 'games must be an array';
  END IF;
  IF jsonb_array_length(COALESCE(p_games, '[]'::JSONB)) > 2 THEN
    RAISE EXCEPTION 'hardest games must contain at most 2 items';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_games, '[]'::JSONB)) AS item
    WHERE
      ((NULLIF(btrim(item->>'game_id'), '') IS NOT NULL)::INT
       + (NULLIF(btrim(item->>'custom_name'), '') IS NOT NULL)::INT) <> 1
      OR char_length(COALESCE(NULLIF(btrim(item->>'game_id'), ''), '')) > 100
      OR char_length(COALESCE(NULLIF(btrim(item->>'custom_name'), ''), '')) > 100
  ) THEN
    RAISE EXCEPTION 'each game needs exactly one game_id or custom_name (max 100 chars)';
  END IF;

  DELETE FROM public.profile_hardest_games
  WHERE user_id = p_user_id;

  INSERT INTO public.profile_hardest_games (user_id, sort_order, game_id, custom_name)
  SELECT
    p_user_id,
    ordinality::SMALLINT,
    NULLIF(btrim(item->>'game_id'), ''),
    NULLIF(btrim(item->>'custom_name'), '')
  FROM jsonb_array_elements(COALESCE(p_games, '[]'::JSONB)) WITH ORDINALITY AS rows(item, ordinality);

  RETURN QUERY
  SELECT *
  FROM public.profile_hardest_games
  WHERE user_id = p_user_id
  ORDER BY sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_profile_hardest_games(TEXT, JSONB) TO anon;

-- 3. 특정 날짜의 어려운 게임 학습 의지: 기존 play_traits SSOT 확장
ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_play_traits_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_play_traits_check
  CHECK (play_traits <@ ARRAY['beginner_welcome', 'new_game_ok', 'hard_game_learning_ok']::TEXT[]);

-- 적용 확인: invalid_*가 모두 0이어야 한다.
SELECT
  COUNT(*) FILTER (
    WHERE NOT (preferred_game_depths <@ ARRAY['light', 'medium', 'deep']::TEXT[])
  ) AS invalid_depth_rows
FROM public.profiles;

SELECT
  COUNT(*) FILTER (WHERE sort_order NOT BETWEEN 1 AND 2) AS invalid_order_rows,
  COUNT(*) FILTER (
    WHERE num_nonnulls(NULLIF(btrim(game_id), ''), NULLIF(btrim(custom_name), '')) <> 1
  ) AS invalid_game_rows
FROM public.profile_hardest_games;

SELECT
  COUNT(*) FILTER (
    WHERE NOT (play_traits <@ ARRAY['beginner_welcome', 'new_game_ok', 'hard_game_learning_ok']::TEXT[])
  ) AS invalid_play_trait_rows
FROM public.meeting_votes;
