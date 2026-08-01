-- 020_game_overrides_error_note.sql
-- game_overrides에 에러로그(자주 하는 실수·헷갈리는 룰 메모) 컬럼 추가.
-- rule_note와 동일한 저장/편집/노출 구조를 공유한다(db-schema.md 참조).

ALTER TABLE public.game_overrides ADD COLUMN IF NOT EXISTS error_note TEXT;
