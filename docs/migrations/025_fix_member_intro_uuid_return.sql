-- submit_member_intro가 UUID인 member_intros.id를 BIGINT로 받던 오류를 수정한다.
-- 사용자 식별자는 기존 계약대로 profiles.user_id/member_intros.user_id의 TEXT(카카오 ID)를 유지한다.

BEGIN;

DROP FUNCTION IF EXISTS public.submit_member_intro(
  TEXT, TEXT, TEXT[], TEXT[], SMALLINT, SMALLINT, SMALLINT, SMALLINT, SMALLINT,
  TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT
);

CREATE FUNCTION public.submit_member_intro(
  p_user_id TEXT,
  p_nickname TEXT,
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
  p_avoid_game_types TEXT[],
  p_clocktower_preference TEXT,
  p_expectation TEXT
)
RETURNS TABLE(intro_id UUID, voucher_granted BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intro_id UUID;
  v_voucher_id BIGINT;
  v_avoid_tags TEXT[];
BEGIN
  IF NULLIF(btrim(p_user_id), '') IS NULL OR NULLIF(btrim(p_nickname), '') IS NULL THEN
    RAISE EXCEPTION 'required_identity';
  END IF;
  IF COALESCE(cardinality(p_join_sources), 0) < 1
    OR NOT (p_join_sources <@ ARRAY['store_visit','friend_referral','cottage_homepage','open_chat_search','daangn','naver_place','social_media']::TEXT[]) THEN
    RAISE EXCEPTION 'invalid_join_sources';
  END IF;
  IF COALESCE(cardinality(p_companion_types), 0) < 1
    OR NOT (p_companion_types <@ ARRAY['friends','partner','family','boardgame_group','various']::TEXT[]) THEN
    RAISE EXCEPTION 'invalid_companion_types';
  END IF;
  IF p_average_play_frequency IS NULL OR p_average_play_frequency NOT BETWEEN 0 AND 6 THEN
    RAISE EXCEPTION 'invalid_average_frequency';
  END IF;
  IF p_possible_frequency_min IS NULL OR p_possible_frequency_max IS NULL
    OR p_possible_frequency_min NOT BETWEEN 0 AND 6 OR p_possible_frequency_max NOT BETWEEN 0 AND 6
    OR p_possible_frequency_min > p_possible_frequency_max THEN
    RAISE EXCEPTION 'invalid_possible_frequency_range';
  END IF;
  IF p_desired_frequency_min IS NULL OR p_desired_frequency_max IS NULL
    OR p_desired_frequency_min NOT BETWEEN 0 AND 6 OR p_desired_frequency_max NOT BETWEEN 0 AND 6
    OR p_desired_frequency_min > p_desired_frequency_max THEN
    RAISE EXCEPTION 'invalid_desired_frequency_range';
  END IF;
  IF COALESCE(cardinality(p_available_days), 0) < 1
    OR NOT (p_available_days <@ ARRAY['mon','tue','wed','thu','fri','sat','sun','flexible']::TEXT[]) THEN
    RAISE EXCEPTION 'invalid_available_days';
  END IF;
  IF 'flexible' = ANY(p_available_days) AND cardinality(p_available_days) > 1 THEN
    RAISE EXCEPTION 'conflicting_available_days';
  END IF;
  IF COALESCE(cardinality(p_available_times), 0) < 1
    OR NOT (p_available_times <@ ARRAY['morning','afternoon','evening','late_night','flexible']::TEXT[]) THEN
    RAISE EXCEPTION 'invalid_available_times';
  END IF;
  IF 'flexible' = ANY(p_available_times) AND cardinality(p_available_times) > 1 THEN
    RAISE EXCEPTION 'conflicting_available_times';
  END IF;
  IF COALESCE(cardinality(p_preferred_game_types), 0) < 1
    OR NOT (p_preferred_game_types <@ ARRAY['party','mystery','strategy','thematic','cooperative','social_deduction','card_deckbuilding','puzzle_abstract','campaign_legacy','any']::TEXT[]) THEN
    RAISE EXCEPTION 'invalid_preferred_game_types';
  END IF;
  IF 'any' = ANY(p_preferred_game_types) AND cardinality(p_preferred_game_types) > 1 THEN
    RAISE EXCEPTION 'conflicting_preferred_game_types';
  END IF;
  IF COALESCE(cardinality(p_avoid_game_types), 0) < 1
    OR NOT (p_avoid_game_types <@ ARRAY['마피아류','실시간','협상','파티게임','긴 플레이타임','고난도 전략','운 비중 높음','공격/견제 강함','none']::TEXT[]) THEN
    RAISE EXCEPTION 'invalid_avoid_game_types';
  END IF;
  IF 'none' = ANY(p_avoid_game_types) AND cardinality(p_avoid_game_types) > 1 THEN
    RAISE EXCEPTION 'conflicting_avoid_game_types';
  END IF;
  IF p_clocktower_preference IS NULL OR p_clocktower_preference NOT IN ('love', 'interested', 'curious', 'not_preferred', 'no') THEN
    RAISE EXCEPTION 'invalid_clocktower_preference';
  END IF;
  IF char_length(btrim(COALESCE(p_expectation, ''))) < 10 OR char_length(btrim(p_expectation)) > 500 THEN
    RAISE EXCEPTION 'invalid_expectation_length';
  END IF;

  v_avoid_tags := CASE WHEN p_avoid_game_types = ARRAY['none']::TEXT[] THEN ARRAY[]::TEXT[] ELSE p_avoid_game_types END;
  UPDATE public.profiles SET avoid_tags = v_avoid_tags WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO public.member_intros (
    user_id, nickname, join_sources, companion_types, average_play_frequency,
    possible_frequency_min, possible_frequency_max, desired_frequency_min, desired_frequency_max,
    available_days, available_times, preferred_game_types, clocktower_preference,
    expectation, questionnaire_completed_at
  ) VALUES (
    p_user_id, btrim(p_nickname), p_join_sources, p_companion_types, p_average_play_frequency,
    p_possible_frequency_min, p_possible_frequency_max, p_desired_frequency_min, p_desired_frequency_max,
    p_available_days, p_available_times, p_preferred_game_types, p_clocktower_preference,
    btrim(p_expectation), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    join_sources = EXCLUDED.join_sources,
    companion_types = EXCLUDED.companion_types,
    average_play_frequency = EXCLUDED.average_play_frequency,
    possible_frequency_min = EXCLUDED.possible_frequency_min,
    possible_frequency_max = EXCLUDED.possible_frequency_max,
    desired_frequency_min = EXCLUDED.desired_frequency_min,
    desired_frequency_max = EXCLUDED.desired_frequency_max,
    available_days = EXCLUDED.available_days,
    available_times = EXCLUDED.available_times,
    preferred_game_types = EXCLUDED.preferred_game_types,
    clocktower_preference = EXCLUDED.clocktower_preference,
    expectation = EXCLUDED.expectation,
    questionnaire_completed_at = COALESCE(member_intros.questionnaire_completed_at, EXCLUDED.questionnaire_completed_at)
  RETURNING id INTO v_intro_id;

  INSERT INTO public.voucher_log (user_id, delta, reason, nickname, note)
  VALUES (p_user_id, 1, 'intro_complete', btrim(p_nickname), '회원 자기소개 작성')
  ON CONFLICT (user_id) WHERE reason = 'intro_complete' DO NOTHING
  RETURNING id INTO v_voucher_id;

  RETURN QUERY SELECT v_intro_id, v_voucher_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_member_intro(
  TEXT, TEXT, TEXT[], TEXT[], SMALLINT, SMALLINT, SMALLINT, SMALLINT, SMALLINT,
  TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT
) TO anon;

COMMIT;
