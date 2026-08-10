-- 022_game_overrides_organizer_note.sql
-- 정리 방법(게임 정리하는 법)을 사진뿐 아니라 글로도 남길 수 있게 텍스트 컬럼 추가.
--
-- 배경: 지금은 organizer_photo_urls(사진)만 있어 정리법을 사진으로만 안내할 수
-- 있었다. 게임에 따라 사진보다 글 설명이 더 나은 경우가 있어(사용자 요청)
-- 사진과 글을 "병행"할 수 있어야 한다 — 기존 컬럼을 대체하지 않고 나란히 추가.
--
-- error_note(자주 틀리는 규칙)와 동일한 단일 텍스트 컬럼 패턴 재사용.
-- 관리자 폼에서 줄바꿈(빈 줄)으로 문단을 구분해 입력하면 게임시트 쪽에서
-- game-sheet.js의 _ruleHubParagraphsHtml (게임 방법 섹션과 동일 로직)로 렌더된다.

ALTER TABLE public.game_overrides ADD COLUMN IF NOT EXISTS organizer_note TEXT;

-- 테이블 자체는 019에서 이미 DISABLE ROW LEVEL SECURITY 처리됨 — 컬럼 추가는 RLS 상태에
-- 영향 없음(020·021과 같은 이유로 재실행 안 함).
