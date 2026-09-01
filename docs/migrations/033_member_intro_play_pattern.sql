-- 평소 플레이 습관과 코티지 모임 참여 조건을 분리한다.
-- 적용 순서: 030 → 031 → 032 → 이 파일 → 새 프런트 배포
BEGIN;

ALTER TABLE public.member_intros
  ADD COLUMN IF NOT EXISTS usual_play_days TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS usual_play_times TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE OR REPLACE FUNCTION public.member_intro_time_values_valid(p_values TEXT[], p_allow_legacy BOOLEAN DEFAULT false)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT COALESCE(bool_and(
    item = 'flexible'
    OR (p_allow_legacy AND item IN ('morning','afternoon','evening','late_night'))
    OR item ~ '^([01][0-9]|2[0-3]):(00|30)$'
  ), TRUE)
  FROM unnest(COALESCE(p_values, ARRAY[]::TEXT[])) AS item;
$$;

ALTER TABLE public.member_intros
  DROP CONSTRAINT IF EXISTS member_intros_usual_play_days_check,
  DROP CONSTRAINT IF EXISTS member_intros_usual_play_times_check;

ALTER TABLE public.member_intros
  ADD CONSTRAINT member_intros_usual_play_days_check CHECK (
    usual_play_days <@ ARRAY['mon','tue','wed','thu','fri','sat','sun','flexible']::TEXT[]
  ),
  ADD CONSTRAINT member_intros_usual_play_times_check CHECK (
    cardinality(usual_play_times) <= 49
    AND public.member_intro_time_values_valid(usual_play_times)
  );

-- 032의 기존 시그니처를 새 평소 플레이·hardest-game 인자로 교체한다.
DROP FUNCTION IF EXISTS public.submit_member_intro(
  TEXT,TEXT,TEXT,TEXT[],TEXT[],SMALLINT,SMALLINT,SMALLINT,SMALLINT,SMALLINT,
  TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT,TEXT
);

CREATE FUNCTION public.submit_member_intro(
  p_user_id TEXT,p_nickname TEXT,p_location TEXT,p_join_sources TEXT[],p_companion_types TEXT[],
  p_average_play_frequency SMALLINT,p_possible_frequency_min SMALLINT,p_possible_frequency_max SMALLINT,p_desired_frequency_min SMALLINT,p_desired_frequency_max SMALLINT,
  p_usual_play_days TEXT[],p_usual_play_times TEXT[],p_available_days TEXT[],p_available_times TEXT[],
  p_preferred_game_types TEXT[],p_game_type_range TEXT[],p_avoid_game_types TEXT[],p_preferred_game_depths TEXT[],p_game_depth_range TEXT[],p_avoid_game_depths TEXT[],
  p_clocktower_preference TEXT,p_expectation TEXT,p_hardest_games JSONB
) RETURNS TABLE(intro_id UUID,voucher_granted BOOLEAN) LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_intro_id UUID; v_voucher_id BIGINT;
BEGIN
  IF NULLIF(btrim(p_user_id),'') IS NULL OR NULLIF(btrim(p_nickname),'') IS NULL THEN RAISE EXCEPTION 'required_identity'; END IF;
  IF char_length(btrim(COALESCE(p_location,''))) > 20 THEN RAISE EXCEPTION 'invalid_location'; END IF;
  IF COALESCE(cardinality(p_join_sources),0)<1 OR NOT(p_join_sources <@ ARRAY['store_visit','friend_referral','cottage_homepage','open_chat_search','daangn','naver_place','social_media']::TEXT[]) THEN RAISE EXCEPTION 'invalid_join_sources'; END IF;
  IF COALESCE(cardinality(p_companion_types),0)<1 OR NOT(p_companion_types <@ ARRAY['friends','partner','family','boardgame_group','various']::TEXT[]) THEN RAISE EXCEPTION 'invalid_companion_types'; END IF;
  IF p_average_play_frequency NOT BETWEEN 0 AND 6 OR p_possible_frequency_min NOT BETWEEN 0 AND 6 OR p_possible_frequency_max NOT BETWEEN 0 AND 6 OR p_possible_frequency_min>p_possible_frequency_max OR p_desired_frequency_min NOT BETWEEN 0 AND 6 OR p_desired_frequency_max NOT BETWEEN 0 AND 6 OR p_desired_frequency_min>p_desired_frequency_max THEN RAISE EXCEPTION 'invalid_frequency'; END IF;
  IF COALESCE(cardinality(p_usual_play_days),0)<1 OR NOT(p_usual_play_days <@ ARRAY['mon','tue','wed','thu','fri','sat','sun','flexible']::TEXT[]) THEN RAISE EXCEPTION 'invalid_usual_play_days'; END IF;
  IF COALESCE(cardinality(p_usual_play_times),0)<1 OR cardinality(p_usual_play_times)>49 OR EXISTS(SELECT 1 FROM unnest(p_usual_play_times) item WHERE item<>'flexible' AND item !~ '^([01][0-9]|2[0-3]):(00|30)$') THEN RAISE EXCEPTION 'invalid_usual_play_times'; END IF;
  IF COALESCE(cardinality(p_available_days),0)<1 OR NOT(p_available_days <@ ARRAY['mon','tue','wed','thu','fri','sat','sun','holiday','flexible']::TEXT[]) THEN RAISE EXCEPTION 'invalid_available_days'; END IF;
  IF COALESCE(cardinality(p_available_times),0)<1 OR cardinality(p_available_times)>49 OR EXISTS(SELECT 1 FROM unnest(p_available_times) item WHERE item NOT IN('morning','afternoon','evening','late_night','flexible') AND item !~ '^([01][0-9]|2[0-3]):(00|30)$') THEN RAISE EXCEPTION 'invalid_available_times'; END IF;
  IF COALESCE(cardinality(p_preferred_game_types),0)<1 OR cardinality(p_preferred_game_types)>20 OR EXISTS(SELECT 1 FROM unnest(p_preferred_game_types) item WHERE item<>btrim(item) OR char_length(item) NOT BETWEEN 1 AND 20) THEN RAISE EXCEPTION 'invalid_preferred_game_types'; END IF;
  IF COALESCE(cardinality(p_game_type_range),0)<1 OR cardinality(p_game_type_range)>20 OR NOT(p_preferred_game_types <@ p_game_type_range) THEN RAISE EXCEPTION 'invalid_game_type_range'; END IF;
  IF ('any'=ANY(p_preferred_game_types) AND cardinality(p_preferred_game_types)>1) OR ('any'=ANY(p_game_type_range) AND NOT(p_game_type_range <@ (p_preferred_game_types || ARRAY['any']::TEXT[]))) THEN RAISE EXCEPTION 'conflicting_game_type_range'; END IF;
  IF COALESCE(cardinality(p_avoid_game_types),0)<1 OR cardinality(p_avoid_game_types)>20 OR EXISTS(SELECT 1 FROM unnest(p_avoid_game_types) item WHERE item<>btrim(item) OR char_length(item) NOT BETWEEN 1 AND 20) OR ('none'=ANY(p_avoid_game_types) AND cardinality(p_avoid_game_types)>1) THEN RAISE EXCEPTION 'invalid_avoid_game_types'; END IF;
  IF ('party'=ANY(p_game_type_range) AND '파티게임'=ANY(p_avoid_game_types)) OR ('social_deduction'=ANY(p_game_type_range) AND '마피아류'=ANY(p_avoid_game_types)) THEN RAISE EXCEPTION 'conflicting_game_type_avoid'; END IF;
  IF COALESCE(cardinality(p_preferred_game_depths),0)<1 OR NOT(p_preferred_game_depths<@ARRAY['intro','light','strategy','hardcore']::TEXT[]) OR NOT(p_preferred_game_depths<@p_game_depth_range) OR NOT(p_game_depth_range<@ARRAY['intro','light','strategy','hardcore']::TEXT[]) OR NOT(p_avoid_game_depths<@ARRAY['intro','light','strategy','hardcore']::TEXT[]) OR p_game_depth_range&&p_avoid_game_depths THEN RAISE EXCEPTION 'invalid_game_depths'; END IF;
  IF p_clocktower_preference NOT IN('love','interested','curious','not_preferred','no') OR char_length(btrim(COALESCE(p_expectation,''))) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'invalid_final_answer'; END IF;

  INSERT INTO public.member_intros(user_id,nickname,location,join_sources,companion_types,average_play_frequency,possible_frequency_min,possible_frequency_max,desired_frequency_min,desired_frequency_max,usual_play_days,usual_play_times,available_days,available_times,preferred_game_types,game_type_range,avoid_game_types,preferred_game_depths,game_depth_range,avoid_game_depths,clocktower_preference,expectation,questionnaire_completed_at)
  VALUES(p_user_id,btrim(p_nickname),NULLIF(btrim(p_location),''),p_join_sources,p_companion_types,p_average_play_frequency,p_possible_frequency_min,p_possible_frequency_max,p_desired_frequency_min,p_desired_frequency_max,p_usual_play_days,p_usual_play_times,p_available_days,p_available_times,p_preferred_game_types,p_game_type_range,p_avoid_game_types,p_preferred_game_depths,p_game_depth_range,p_avoid_game_depths,p_clocktower_preference,btrim(p_expectation),now())
  ON CONFLICT(user_id) DO UPDATE SET nickname=EXCLUDED.nickname,location=EXCLUDED.location,join_sources=EXCLUDED.join_sources,companion_types=EXCLUDED.companion_types,average_play_frequency=EXCLUDED.average_play_frequency,possible_frequency_min=EXCLUDED.possible_frequency_min,possible_frequency_max=EXCLUDED.possible_frequency_max,desired_frequency_min=EXCLUDED.desired_frequency_min,desired_frequency_max=EXCLUDED.desired_frequency_max,usual_play_days=EXCLUDED.usual_play_days,usual_play_times=EXCLUDED.usual_play_times,available_days=EXCLUDED.available_days,available_times=EXCLUDED.available_times,preferred_game_types=EXCLUDED.preferred_game_types,game_type_range=EXCLUDED.game_type_range,avoid_game_types=EXCLUDED.avoid_game_types,preferred_game_depths=EXCLUDED.preferred_game_depths,game_depth_range=EXCLUDED.game_depth_range,avoid_game_depths=EXCLUDED.avoid_game_depths,clocktower_preference=EXCLUDED.clocktower_preference,expectation=EXCLUDED.expectation,questionnaire_completed_at=COALESCE(member_intros.questionnaire_completed_at,EXCLUDED.questionnaire_completed_at) RETURNING id INTO v_intro_id;

  PERFORM public.replace_profile_hardest_games(p_user_id, COALESCE(p_hardest_games, '[]'::JSONB));
  INSERT INTO public.voucher_log(user_id,delta,reason,nickname,note) VALUES(p_user_id,1,'intro_complete',btrim(p_nickname),'회원 자기소개 작성') ON CONFLICT(user_id) WHERE reason='intro_complete' DO NOTHING RETURNING id INTO v_voucher_id;
  RETURN QUERY SELECT v_intro_id,v_voucher_id IS NOT NULL;
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_member_intro(TEXT,TEXT,TEXT,TEXT[],TEXT[],SMALLINT,SMALLINT,SMALLINT,SMALLINT,SMALLINT,TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT[],TEXT,TEXT,JSONB) TO anon;
COMMIT;
