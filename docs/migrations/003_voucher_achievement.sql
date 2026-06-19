-- 업적 달성 교환권 지급 지원
-- 실행 조건: 001_vouchers.sql 완료 상태
-- IF NOT EXISTS / DROP IF EXISTS 보장 → 재실행 안전

-- 1. voucher_log에 note 컬럼 추가 (어떤 업적 교환권인지 저장)
ALTER TABLE public.voucher_log ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. reason check 제약 갱신 ('achievement' 추가)
ALTER TABLE public.voucher_log DROP CONSTRAINT IF EXISTS voucher_log_reason_check;
ALTER TABLE public.voucher_log ADD CONSTRAINT voucher_log_reason_check
  CHECK (reason IN ('first_play', 'redeem', 'dev_test', 'achievement'));

-- 3. 업적별 1회 지급 보장 — DB 레벨 partial unique index
--    user_id + note(achId) 조합당 reason='achievement' 행은 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS voucher_log_achievement_unique
  ON public.voucher_log (user_id, note)
  WHERE reason = 'achievement';
