-- 회원 자기소개 ↔ 내 보드 > 모임 보드 데이터 연동
-- 실행 조건: 없음 (member_intros, profiles 기존 테이블 확장 + 신규 테이블 1개)
-- IF NOT EXISTS / DROP IF EXISTS 보장 → 재실행 안전
--
-- 사전 점검 완료 (2026-06-30, scripts/_tmp-check-member-intros-dup.js, 삭제됨):
--   member_intros 전체 7행 — user_id 보유 5행 모두 유일, 중복 없음 → dedup 단계 불필요
--
-- 주의: profiles.bio는 "한줄소개" SSOT다. 자기소개 페이지(club-intro.html)와
--       취향보드(kakao-auth.js) 양쪽이 동일 컬럼을 읽고/수정한다.
--       한쪽에서 수정하면 다른 쪽에도 즉시 반영된다 — 의도된 동작이며 버그 아님.

-- 1. member_intros: 모임 프로필 필드 확장
ALTER TABLE public.member_intros ADD COLUMN IF NOT EXISTS travel_range TEXT;     -- 이동 가능 범위
ALTER TABLE public.member_intros ADD COLUMN IF NOT EXISTS meeting_style TEXT[];  -- 선호 게임/모임 스타일 태그

-- 2. member_intros: 유저당 자기소개 카드 1개로 제한
--    (사전 점검 결과 중복 없음 확인 완료 — 별도 dedup 없이 바로 적용)
ALTER TABLE public.member_intros ADD CONSTRAINT member_intros_user_id_unique UNIQUE (user_id);

-- 3. 모임용 게임 목록 (이번에 하고 싶은 게임 / 룰 설명 가능한 게임)
--    game_likes/game_curious와 동일한 행 구조 + list_type 구분 컬럼
CREATE TABLE IF NOT EXISTS public.meeting_game_prefs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  list_type   TEXT NOT NULL CHECK (list_type IN ('want_this_time', 'can_explain_rules')),
  game_id     TEXT,
  custom_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_game_prefs_user_idx ON public.meeting_game_prefs (user_id, list_type);
