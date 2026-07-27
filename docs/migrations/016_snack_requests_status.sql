-- 016_snack_requests_status.sql
-- 간식·음료 요청에 게임구매요청과 같은 방식의 상태 배지를 추가한다(2단계: 구매예정/구매완료).
--
-- 배경: 015에서 추가한 is_done/done_at은 "완료 여부 + 알림 트리거"로 그대로 쓰고,
--       여기선 관리자 화면에 보이는 진행 배지용 필드만 더한다(game_requests의
--       purchase_status/status_date와 같은 역할). 구매완료를 고르는 순간 관리자
--       화면이 is_done/done_at도 함께 채워 알림을 트리거한다(자동 파이프라인이
--       없는 간식 특성상 두 신호를 같은 액션에서 채움 — game_requests와 다른 점).

alter table public.snack_requests
  add column if not exists purchase_status text,
  add column if not exists status_date date;

-- RLS: 컬럼 추가라 영향 없음(014·015와 동일 판단).
