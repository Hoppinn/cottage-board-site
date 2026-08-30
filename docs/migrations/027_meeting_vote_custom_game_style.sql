-- 모임 플래너: 날짜별 게임 유형의 안정 코드와 사용자 입력 문구 분리
-- 실행: Supabase SQL Editor > 전체 붙여넣기 후 실행
-- 범위: game_style='other'일 때만 최대 30자의 game_style_custom을 저장한다.

ALTER TABLE public.meeting_votes
  ADD COLUMN IF NOT EXISTS game_style_custom TEXT;

ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_game_style_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_game_style_check
  CHECK (game_style IS NULL OR game_style IN ('party', 'strategy', 'any', 'other'));

ALTER TABLE public.meeting_votes
  DROP CONSTRAINT IF EXISTS meeting_votes_game_style_custom_check;
ALTER TABLE public.meeting_votes
  ADD CONSTRAINT meeting_votes_game_style_custom_check
  CHECK (
    (game_style = 'other'
      AND game_style_custom IS NOT NULL
      AND char_length(btrim(game_style_custom)) BETWEEN 1 AND 30)
    OR
    (game_style IS DISTINCT FROM 'other' AND game_style_custom IS NULL)
  );

-- 적용 확인: 기존 행은 전부 game_style_custom=NULL이어야 하며 invalid_rows=0이어야 한다.
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE game_style = 'other') AS other_rows,
  COUNT(*) FILTER (WHERE game_style_custom IS NOT NULL) AS custom_rows,
  COUNT(*) FILTER (
    WHERE (game_style = 'other' AND (
      game_style_custom IS NULL
      OR char_length(btrim(game_style_custom)) NOT BETWEEN 1 AND 30
    ))
    OR (game_style IS DISTINCT FROM 'other' AND game_style_custom IS NOT NULL)
  ) AS invalid_rows
FROM public.meeting_votes;
