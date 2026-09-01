-- 모임원 프로필 게임 취향을 주 취향·취향 범위·꺼림 3단으로 전환한다.
-- 적용 순서: 030_member_intro_available_days_holiday.sql → 이 파일 → 새 프론트 배포

BEGIN;

ALTER TABLE public.member_intros
  ADD COLUMN IF NOT EXISTS game_type_range TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS avoid_game_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_game_depths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS game_depth_range TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS avoid_game_depths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 기존 작성자는 취향만 새 설문으로 다시 고른다. 비취향 설문 답변과 완료 시각은 보존한다.
UPDATE public.member_intros
SET preferred_game_types = ARRAY[]::TEXT[],
    game_type_range = ARRAY[]::TEXT[],
    avoid_game_types = ARRAY[]::TEXT[],
    preferred_game_depths = ARRAY[]::TEXT[],
    game_depth_range = ARRAY[]::TEXT[],
    avoid_game_depths = ARRAY[]::TEXT[]
WHERE questionnaire_completed_at IS NOT NULL;

-- 이전 프로필 보드 전용 취향값은 더 이상 이 설문의 정본이 아니다.
UPDATE public.profiles
SET avoid_tags = ARRAY[]::TEXT[],
    preferred_game_depths = ARRAY[]::TEXT[]
WHERE user_id IN (SELECT user_id FROM public.member_intros WHERE questionnaire_completed_at IS NOT NULL);

ALTER TABLE public.member_intros
  DROP CONSTRAINT IF EXISTS member_intros_primary_type_in_range_check,
  DROP CONSTRAINT IF EXISTS member_intros_primary_depth_in_range_check,
  DROP CONSTRAINT IF EXISTS member_intros_depth_range_avoid_disjoint_check,
  DROP CONSTRAINT IF EXISTS member_intros_type_any_check,
  DROP CONSTRAINT IF EXISTS member_intros_avoid_type_none_check,
  DROP CONSTRAINT IF EXISTS member_intros_type_avoid_conflict_check,
  DROP CONSTRAINT IF EXISTS member_intros_depth_codes_check;

ALTER TABLE public.member_intros
  ADD CONSTRAINT member_intros_primary_type_in_range_check
    CHECK (preferred_game_types <@ game_type_range),
  ADD CONSTRAINT member_intros_primary_depth_in_range_check
    CHECK (preferred_game_depths <@ game_depth_range),
  ADD CONSTRAINT member_intros_depth_range_avoid_disjoint_check
    CHECK (NOT (game_depth_range && avoid_game_depths)),
  ADD CONSTRAINT member_intros_type_any_check
    CHECK ((NOT ('any' = ANY(preferred_game_types)) OR cardinality(preferred_game_types) = 1)
       AND (NOT ('any' = ANY(game_type_range)) OR (cardinality(game_type_range) = 1 AND preferred_game_types = ARRAY['any']::TEXT[]))),
  ADD CONSTRAINT member_intros_avoid_type_none_check
    CHECK (NOT ('none' = ANY(avoid_game_types)) OR cardinality(avoid_game_types) = 1),
  ADD CONSTRAINT member_intros_type_avoid_conflict_check
    CHECK (NOT ('party' = ANY(game_type_range) AND '파티게임' = ANY(avoid_game_types))
       AND NOT ('social_deduction' = ANY(game_type_range) AND '마피아류' = ANY(avoid_game_types))),
  ADD CONSTRAINT member_intros_depth_codes_check
    CHECK (preferred_game_depths <@ ARRAY['intro','light','strategy','hardcore']::TEXT[]
       AND game_depth_range <@ ARRAY['intro','light','strategy','hardcore']::TEXT[]
       AND avoid_game_depths <@ ARRAY['intro','light','strategy','hardcore']::TEXT[]);

DROP FUNCTION IF EXISTS public.submit_member_intro(
  TEXT, TEXT, TEXT[], TEXT[], SMALLINT, SMALLINT, SMALLINT, SMALLINT, SMALLINT,
  TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT
);

CREATE FUNCTION public.submit_member_intro(
  p_user_id TEXT,
  p_nickname TEXT,
  p_location TEXT,
  p_join_sources TEXT[],
  p_companion_types TEXT[],
  p_average_play_frequency SMALLINT,
  p_possible_frequency_min SMALLINT,
  p_possible_frequency_max SMALLINT,
  p_desired_frequency_min SMALLINT,
  p_desired_frequency_max SMALLINT,
  p_available_days TEXT[],
  p_available_times TEXT[],
  p_preferred_game_types TEXT[],
  p_game_type_range TEXT[],
  p_avoid_game_types TEXT[],
  p_preferred_game_depths TEXT[],
  p_game_depth_range TEXT[],
  p_avoid_game_depths TEXT[],
  p_clocktower_preference TEXT,
  p_expectation TEXT
)
RETURNS TABLE(intro_id UUID, voucher_granted BOOLEAN)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE v_intro_id UUID; v_voucher_id BIGINT;
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR NULLIF(btrim(p_nickname), '') IS NULL THEN RAISE EXCEPTION 'required_identity'; END IF;
  IF char_length(btrim(COALESCE(p_location, ''))) > 20 THEN RAISE EXCEPTION 'invalid_location'; END IF;
  IF COALESCE(cardinality(p_join_sources), 0) < 1 OR NOT (p_join_sources <@ ARRAY['store_visit','friend_referral','cottage_homepage','open_chat_search','daangn','naver_place','social_media']::TEXT[]) THEN RAISE EXCEPTION 'invalid_join_sources'; END IF;
  IF COALESCE(cardinality(p_companion_types), 0) < 1 OR NOT (p_companion_types <@ ARRAY['friends','partner','family','boardgame_group','various']::TEXT[]) THEN RAISE EXCEPTION 'invalid_companion_types'; END IF;
  IF p_average_play_frequency IS NULL OR p_average_play_frequency NOT BETWEEN 0 AND 6 THEN RAISE EXCEPTION 'invalid_average_frequency'; END IF;
  IF p_possible_frequency_min IS NULL OR p_possible_frequency_max IS NULL OR p_possible_frequency_min NOT BETWEEN 0 AND 6 OR p_possible_frequency_max NOT BETWEEN 0 AND 6 OR p_possible_frequency_min > p_possible_frequency_max THEN RAISE EXCEPTION 'invalid_possible_frequency_range'; END IF;
  IF p_desired_frequency_min IS NULL OR p_desired_frequency_max IS NULL OR p_desired_frequency_min NOT BETWEEN 0 AND 6 OR p_desired_frequency_max NOT BETWEEN 0 AND 6 OR p_desired_frequency_min > p_desired_frequency_max THEN RAISE EXCEPTION 'invalid_desired_frequency_range'; END IF;
  IF COALESCE(cardinality(p_available_days), 0) < 1 OR NOT (p_available_days <@ ARRAY['mon','tue','wed','thu','fri','sat','sun','holiday','flexible']::TEXT[]) THEN RAISE EXCEPTION 'invalid_available_days'; END IF;
  IF COALESCE(cardinality(p_available_times), 0) < 1 OR cardinality(p_available_times) > 49 OR EXISTS (SELECT 1 FROM unnest(p_available_times) AS item WHERE item NOT IN ('morning','afternoon','evening','late_night','flexible') AND item !~ '^([01][0-9]|2[0-3]):(00|30)$') THEN RAISE EXCEPTION 'invalid_available_times'; END IF;
  IF COALESCE(cardinality(p_preferred_game_types), 0) < 1 OR cardinality(p_preferred_game_types) > 20 OR EXISTS (SELECT 1 FROM unnest(p_preferred_game_types) item WHERE item <> btrim(item) OR char_length(item) NOT BETWEEN 1 AND 20) THEN RAISE EXCEPTION 'invalid_preferred_game_types'; END IF;
  IF COALESCE(cardinality(p_game_type_range), 0) < 1 OR cardinality(p_game_type_range) > 20 OR NOT (p_preferred_game_types <@ p_game_type_range) THEN RAISE EXCEPTION 'invalid_game_type_range'; END IF;
  IF ('any' = ANY(p_preferred_game_types) AND cardinality(p_preferred_game_types) > 1) OR ('any' = ANY(p_game_type_range) AND (cardinality(p_game_type_range) > 1 OR p_preferred_game_types <> ARRAY['any']::TEXT[])) THEN RAISE EXCEPTION 'conflicting_game_type_range'; END IF;
  IF COALESCE(cardinality(p_avoid_game_types), 0) < 1 OR cardinality(p_avoid_game_types) > 20 OR EXISTS (SELECT 1 FROM unnest(p_avoid_game_types) item WHERE item <> btrim(item) OR char_length(item) NOT BETWEEN 1 AND 20) OR ('none' = ANY(p_avoid_game_types) AND cardinality(p_avoid_game_types) > 1) THEN RAISE EXCEPTION 'invalid_avoid_game_types'; END IF;
  IF ('party' = ANY(p_game_type_range) AND '파티게임' = ANY(p_avoid_game_types)) OR ('social_deduction' = ANY(p_game_type_range) AND '마피아류' = ANY(p_avoid_game_types)) THEN RAISE EXCEPTION 'conflicting_game_type_avoid'; END IF;
  IF COALESCE(cardinality(p_preferred_game_depths), 0) < 1 OR NOT (p_preferred_game_depths <@ ARRAY['intro','light','strategy','hardcore']::TEXT[]) OR NOT (p_preferred_game_depths <@ p_game_depth_range) OR NOT (p_game_depth_range <@ ARRAY['intro','light','strategy','hardcore']::TEXT[]) OR NOT (p_avoid_game_depths <@ ARRAY['intro','light','strategy','hardcore']::TEXT[]) OR p_game_depth_range && p_avoid_game_depths THEN RAISE EXCEPTION 'invalid_game_depths'; END IF;
  IF p_clocktower_preference IS NULL OR p_clocktower_preference NOT IN ('love','interested','curious','not_preferred','no') THEN RAISE EXCEPTION 'invalid_clocktower_preference'; END IF;
  IF char_length(btrim(COALESCE(p_expectation, ''))) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'invalid_expectation_length'; END IF;

  INSERT INTO public.member_intros (user_id,nickname,location,join_sources,companion_types,average_play_frequency,possible_frequency_min,possible_frequency_max,desired_frequency_min,desired_frequency_max,available_days,available_times,preferred_game_types,game_type_range,avoid_game_types,preferred_game_depths,game_depth_range,avoid_game_depths,clocktower_preference,expectation,questionnaire_completed_at)
  VALUES (p_user_id,btrim(p_nickname),NULLIF(btrim(p_location),''),p_join_sources,p_companion_types,p_average_play_frequency,p_possible_frequency_min,p_possible_frequency_max,p_desired_frequency_min,p_desired_frequency_max,p_available_days,p_available_times,p_preferred_game_types,p_game_type_range,p_avoid_game_types,p_preferred_game_depths,p_game_depth_range,p_avoid_game_depths,p_clocktower_preference,btrim(p_expectation),now())
  ON CONFLICT (user_id) DO UPDATE SET nickname=EXCLUDED.nickname,location=EXCLUDED.location,join_sources=EXCLUDED.join_sources,companion_types=EXCLUDED.companion_types,average_play_frequency=EXCLUDED.average_play_frequency,possible_frequency_min=EXCLUDED.possible_frequency_min,possible_frequency_max=EXCLUDED.possible_frequency_max,desired_frequency_min=EXCLUDED.desired_frequency_min,desired_frequency_max=EXCLUDED.desired_frequency_max,available_days=EXCLUDED.available_days,available_times=EXCLUDED.available_times,preferred_game_types=EXCLUDED.preferred_game_types,game_type_range=EXCLUDED.game_type_range,avoid_game_types=EXCLUDED.avoid_game_types,preferred_game_depths=EXCLUDED.preferred_game_depths,game_depth_range=EXCLUDED.game_depth_range,avoid_game_depths=EXCLUDED.avoid_game_depths,clocktower_preference=EXCLUDED.clocktower_preference,expectation=EXCLUDED.expectation,questionnaire_completed_at=COALESCE(member_intros.questionnaire_completed_at,EXCLUDED.questionnaire_completed_at)
  RETURNING id INTO v_intro_id;
  INSERT INTO public.voucher_log (user_id,delta,reason,nickname,note) VALUES (p_user_id,1,'intro_complete',btrim(p_nickname),'회원 자기소개 작성') ON CONFLICT (user_id) WHERE reason='intro_complete' DO NOTHING RETURNING id INTO v_voucher_id;
  RETURN QUERY SELECT v_intro_id, v_voucher_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_member_intro(TEXT,TEXT,TEXT,TEXT[],TEXT[],SMALLINT,SMALLINT,SMALLINT,SMALLINT,SMALLINT,TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT,TEXT) TO anon;
COMMIT;
