-- 음료교환권 시스템 마이그레이션
-- Supabase 대시보드 SQL 에디터에서 전체 실행 (IF NOT EXISTS로 멱등)
-- 기존 000_schema.sql 실행 완료 상태에서 추가

-- ── 음료교환권 V1 ────────────────────────────────────────────────────────

-- 1. 상품 카탈로그
CREATE TABLE IF NOT EXISTS voucher_products (
  id     SERIAL PRIMARY KEY,
  name   TEXT NOT NULL,
  cost   INT  NOT NULL,              -- 교환에 필요한 교환권 장수
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. 교환권 원장 (append-only, points_log 패턴 동일)
--    delta > 0 : 지급 (reason = 'first_play')
--    delta < 0 : 사용 (reason = 'redeem', product_id 필수)
CREATE TABLE IF NOT EXISTS voucher_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT      NOT NULL,
  delta      INT       NOT NULL,
  reason     TEXT      NOT NULL CHECK (reason IN ('first_play', 'redeem', 'dev_test')),
  product_id INT       REFERENCES voucher_products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. first_play 중복 지급 방지 — DB 레벨 partial unique index
--    user_id당 reason='first_play' 행은 1개만 허용
--    reason='redeem'은 제외 → 여러 번 사용 가능
CREATE UNIQUE INDEX IF NOT EXISTS voucher_log_first_play_unique
  ON voucher_log (user_id)
  WHERE reason = 'first_play';

-- 4. 잔액 집계 성능용 인덱스
CREATE INDEX IF NOT EXISTS voucher_log_user_idx ON voucher_log (user_id);

-- 5. RLS + anon 정책 (000_schema.sql 동일 패턴)
ALTER TABLE voucher_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_voucher_products" ON voucher_products;
CREATE POLICY "anon_select_voucher_products"
  ON voucher_products FOR SELECT TO anon USING (true);

ALTER TABLE voucher_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_voucher_log" ON voucher_log;
CREATE POLICY "anon_insert_voucher_log"
  ON voucher_log FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_select_voucher_log" ON voucher_log;
CREATE POLICY "anon_select_voucher_log"
  ON voucher_log FOR SELECT TO anon USING (true);

-- 6-1. RLS 비활성화 — 000_schema.sql과 동일 이유(auth.uid() 없음, 프로젝트 기본 RLS OFF).
--      이 파일만으로 재구축하면 RLS ON + SELECT/INSERT만 있어 조용히 막히는 경로라 명시적으로 끈다
--      (2026-07-31, 무인 운영 내구성 감사).
ALTER TABLE voucher_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_log DISABLE ROW LEVEL SECURITY;

-- 7. 초기 상품 데이터
INSERT INTO voucher_products (id, name, cost, is_active) VALUES
  (1, '물 2병',  1, true),
  (2, '홈런볼', 1, true),
  (3, '캔커피',  2, true)
ON CONFLICT (id) DO NOTHING;
