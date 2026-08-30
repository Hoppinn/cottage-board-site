-- 프로필 선호 웨이트 코드 분리
-- 기존 light/medium/deep의 의미를 바꾸지 않고, 새 4단계 코드를 별도로 허용한다.
-- 기존 회원 데이터는 변환하지 않는다.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_game_depths_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_game_depths_check
  CHECK (
    preferred_game_depths <@ ARRAY[
      'light', 'medium', 'deep',
      'weight_intro', 'weight_light', 'weight_heavy', 'weight_hardcore'
    ]::TEXT[]
    AND cardinality(array_positions(preferred_game_depths, 'light')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'medium')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'deep')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'weight_intro')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'weight_light')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'weight_heavy')) <= 1
    AND cardinality(array_positions(preferred_game_depths, 'weight_hardcore')) <= 1
  );

SELECT
  COUNT(*) FILTER (
    WHERE NOT (preferred_game_depths <@ ARRAY[
      'light', 'medium', 'deep',
      'weight_intro', 'weight_light', 'weight_heavy', 'weight_hardcore'
    ]::TEXT[])
  ) AS invalid_depth_rows
FROM public.profiles;
