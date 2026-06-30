-- 004_meeting_profile.sql 후속 수정: meeting_game_prefs RLS로 인한 INSERT 401 차단 버그 수정
-- 실행 조건: 004_meeting_profile.sql 완료 상태
-- IF NOT EXISTS / DROP IF EXISTS 보장 → 재실행 안전
--
-- 발견 경위: Playwright 통합 테스트에서 모임 보드 "게임 추가" 시
-- "new row violates row-level security policy for table meeting_game_prefs" (42501) 확인.
-- 신규 테이블이 RLS 활성 상태로 생성되었으나 정책이 없어 anon key INSERT가 전부 차단됨.
-- 이 프로젝트는 Supabase Auth가 아닌 카카오 로그인(클라이언트 user_id) 구조라 RLS 기반 인증이
-- 적용되지 않음 — game_likes/member_intros 등 기존 테이블과 동일하게 RLS를 비활성화한다.

ALTER TABLE public.meeting_game_prefs DISABLE ROW LEVEL SECURITY;
