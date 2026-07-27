-- 015_snack_requests_done.sql
-- 간식·음료 요청에 "처리완료" 상태를 추가한다.
--
-- 배경: 지금까지 snack_requests엔 완료 상태 컬럼이 없어 관리자가 요청을
--       삭제하는 것 말고는 처리 여부를 표시할 방법이 없었고, 요청자에게도
--       완료 알림이 안 갔다. game_requests(purchase_status/purchased_at)·
--       suggestions(is_done) 패턴을 그대로 따른다.

alter table public.snack_requests
  add column if not exists is_done boolean not null default false,
  add column if not exists done_at timestamptz;

-- RLS: snack_requests는 이미 기존 anon 정책으로 읽기/쓰기 중 — 컬럼 추가는
-- 정책에 영향 없음(014와 동일 판단). 새 컬럼도 anon이 그대로 읽고 쓴다.
