-- 013_meeting_votes_guest_count.sql
-- 모임 플래너 — 동반 지인 인원 (2026-07-21)
--
-- 배경: 등록 1건 = 방문 1명이라는 전제가 코드 8곳에 박혀 있었다(.length / Set(user_id).size).
--       철수가 지인 2명을 데려오면 실제 방문은 3명인데 모든 화면이 1명으로 표시된다.
--       요금 정책상 "모임 참여자 + 그 동반 지인"만 플래너 등록 대상이므로(1인 5,000원),
--       지인 수를 vote 행에 실어 인원 계산의 단일 출처로 삼는다.
--
--   guest_count INTEGER NOT NULL DEFAULT 0  — 본인 제외 동반 인원
--     · 실제 방문 인원 = 1 + guest_count  (JS: CottageDB.getPartySize(vote))
--     · 상한 99는 정책이 아니라 오타 방지(3자리 오입력 차단). 20명도 정상 입력값.
--
-- 실행: Supabase SQL Editor > 전체 붙여넣기 후 실행
-- 재실행 안전: ADD COLUMN IF NOT EXISTS / 제약은 DO$$ 조건부
--
-- 검증 (실행 후 SQL Editor에서):
--   ① select count(*) from meeting_votes where guest_count <> 0;   -- 기대: 0 (기존 행 전부 default)
--   ② insert 테스트 없이도 아래로 제약 확인:
--      select conname from pg_constraint where conrelid = 'meeting_votes'::regclass;
--      -- meeting_votes_guest_count_check 가 보이면 정상
--
-- 롤백:
--   ALTER TABLE meeting_votes DROP CONSTRAINT IF EXISTS meeting_votes_guest_count_check;
--   ALTER TABLE meeting_votes DROP COLUMN IF EXISTS guest_count;

-- ── 컬럼 추가 ────────────────────────────────────────────────────────────────
ALTER TABLE meeting_votes
  ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 0;

-- ── 값 범위 제약 (오타 방지) ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'meeting_votes'::regclass
      AND conname  = 'meeting_votes_guest_count_check'
  ) THEN
    ALTER TABLE meeting_votes
      ADD CONSTRAINT meeting_votes_guest_count_check
      CHECK (guest_count >= 0 AND guest_count <= 99);
    RAISE NOTICE 'guest_count CHECK 추가됨';
  ELSE
    RAISE NOTICE 'guest_count CHECK 이미 존재 — 스킵';
  END IF;
END $$;

-- ── RLS 상태 명시 ────────────────────────────────────────────────────────────
-- 이 프로젝트 기본 = RLS DISABLE (카카오 OAuth라 auth.uid() 불가, anon 키 직접 read/write).
-- meeting_votes는 008에서 명시가 누락돼 있었으므로(db-schema.md 「RLS 상태 미명시 8개」)
-- 재구축 시 조용히 켜지지 않도록 여기서 함께 선언한다. 운영 DB엔 이미 off라 무영향.
ALTER TABLE meeting_votes DISABLE ROW LEVEL SECURITY;
