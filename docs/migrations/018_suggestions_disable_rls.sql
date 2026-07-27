-- 018_suggestions_disable_rls.sql
-- suggestions 테이블의 RLS를 끈다 — 이 사이트의 다른 모든 테이블과 같은 원칙.
--
-- 배경: 카카오 OAuth 구조상 이 프로젝트엔 Supabase의 "authenticated" 역할이 존재할 수
--       없다(auth.uid()가 항상 NULL). 그런데 suggestions만 RLS가 켜진 채 anon용 SELECT
--       정책이 없어서, 제출(INSERT)은 됐지만 그 어떤 화면도(관리자 포함) 조회가 항상
--       0건으로 나왔다(2026-07-28 실측 — insert 성공 직후 같은 anon 키로 select해도 빈 배열).
--       "건의사항이 통째로 사라지는 구조"라는 제보의 실제 원인이 Make 알림 장애가 아니라
--       이것이었다. game_requests/snack_requests/meeting_votes 등 이미 RLS DISABLE인
--       테이블들과 동일하게 맞춘다.

alter table public.suggestions disable row level security;
