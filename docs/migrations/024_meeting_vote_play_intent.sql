-- 모임 플래너 Phase 1: 날짜별 "오늘 원하는 판" 원천 데이터
-- 실행: Supabase SQL Editor > 전체 붙여넣기 후 실행
-- 범위: 저장·수정·표시용 필드만 추가. 매칭/후보 제안/점수화 규칙은 포함하지 않는다.

ALTER TABLE public.meeting_votes
  ADD COLUMN IF NOT EXISTS game_style TEXT;
ALTER TABLE public.meeting_votes
  ADD COLUMN IF NOT EXISTS game_depth TEXT;
ALTER TABLE public.meeting_votes
  ADD COLUMN IF NOT EXISTS play_traits TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.meeting_votes
  ADD COLUMN IF NOT EXISTS recruitment_message TEXT;

-- 재실행·부분 적용에도 기존 NULL 배열을 안전하게 정리한다.
UPDATE public.meeting_votes
SET play_traits = ARRAY[]::TEXT[]
WHERE play_traits IS NULL;

ALTER TABLE public.meeting_votes
  ALTER COLUMN play_traits SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN play_traits SET NOT NULL;

ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_game_style_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_game_style_check
  CHECK (game_style IS NULL OR game_style IN ('party', 'strategy', 'any'));

ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_game_depth_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_game_depth_check
  CHECK (game_depth IS NULL OR game_depth IN ('light', 'medium', 'deep', 'any'));

ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_play_traits_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_play_traits_check
  CHECK (play_traits <@ ARRAY['beginner_welcome', 'new_game_ok']::TEXT[]);

ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_recruitment_message_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_recruitment_message_check
  CHECK (recruitment_message IS NULL OR char_length(recruitment_message) <= 30);

-- 적용 확인(SQL Editor): 기존 행은 game_style/game_depth/recruitment_message가 NULL,
-- play_traits는 빈 배열이어야 한다.
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE game_style IS NOT NULL) AS game_style_rows,
  COUNT(*) FILTER (WHERE game_depth IS NOT NULL) AS game_depth_rows,
  COUNT(*) FILTER (WHERE cardinality(play_traits) > 0) AS play_trait_rows,
  COUNT(*) FILTER (WHERE recruitment_message IS NOT NULL) AS recruitment_message_rows
FROM public.meeting_votes;
