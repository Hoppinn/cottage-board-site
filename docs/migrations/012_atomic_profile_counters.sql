-- 012_atomic_profile_counters.sql
-- #22 — profiles의 시간·방문 카운터를 원자적으로 증가시킨다.
--
-- 배경: 클라이언트가 `select` → 계산 → `update` 하는 read-modify-write라
--   탭이 겹치면 나중 write가 앞 증가분을 덮어 조용히 사라졌다.
--   실측(scripts/verify-lost-update.js): 동시성 2에서 33% · 3에서 56% ·
--   5에서 73% · 30에서 93% 손실. 순차는 손실 0(대조군).
--   PostgREST는 `col = col + n`처럼 컬럼을 참조하는 UPDATE를 지원하지 않아
--   서버 함수가 불가피하다.
--
-- 보존한 기존 동작 3가지 (바꾸면 회귀다):
--   ① **행이 없으면 아무것도 하지 않는다.** UPDATE만 하고 upsert하지 않는다.
--      호출부는 반환이 비면 조기 종료하고 시간을 localStorage에 남겨,
--      upsertProfile이 나중에 처리한다. 여기서 upsert를 하면 프로필 없는
--      사용자에게 빈 행이 생겨 회원 수가 부풀려진다.
--   ② **today_seconds는 단순 증가가 아니다.** today_date가 오늘이 아니면
--      누적이 아니라 리셋 후 시작. 이 분기가 함수 안에 있어야 원자성이 성립한다.
--   ③ **visit_count는 명시 요청(p_bump_visit)일 때만** 증가한다.
--      닉네임 변경 등으로 부르는 경로가 방문을 올리면 안 된다.
--
-- 과거에 이미 잃은 값은 보정하지 않는다(2026-07-19 결정) — 얼마를 잃었는지
--   알 근거가 없고(page_sessions도 heartbeat 분이 빠진 하한), 추정치로 덮으면
--   데이터가 더 불투명해진다. 이 함수는 **앞으로의 증가만** 정확하게 만든다.

create or replace function public.increment_profile_counters(
  p_user_id    text,
  p_secs       integer default 0,
  p_today      text    default null,
  p_bump_visit boolean default false
)
returns setof public.profiles   -- 행 타입 그대로 반환 → 컬럼 타입 불일치 위험 없음
language sql
as $$
  update public.profiles p
     set total_minutes = coalesce(p.total_minutes, 0) + greatest(coalesce(p_secs, 0), 0),
         today_seconds = case
           when p_today is null            then p.today_seconds
           when p.today_date = p_today     then coalesce(p.today_seconds, 0) + greatest(coalesce(p_secs, 0), 0)
           else greatest(coalesce(p_secs, 0), 0)   -- 날짜가 바뀌었으면 리셋 후 시작
         end,
         today_date    = coalesce(p_today, p.today_date),
         visit_count   = case when p_bump_visit then coalesce(p.visit_count, 0) + 1 else p.visit_count end,
         last_seen_at  = now()
   where p.user_id = p_user_id
  returning p.*;
$$;

-- 이 프로젝트는 카카오 OAuth라 `authenticated` 역할이 존재할 수 없다.
-- 반드시 anon에 부여할 것 (CLAUDE.md 「정책을 쓸 땐 to 역할이 anon인지 확인」).
grant execute on function public.increment_profile_counters(text, integer, text, boolean) to anon;

-- profiles는 이 프로젝트 기본대로 RLS DISABLE 상태이며 이 함수는 security invoker다.
-- (RLS를 켜게 되면 이 함수도 함께 재검토할 것 — 지금은 켜져 있지 않다.)

-- 실행 후 검증:
--   1) 함수 존재 확인
--      select proname, pg_get_function_identity_arguments(oid)
--        from pg_proc where proname = 'increment_profile_counters';
--   2) 없는 user_id로 호출 → 0행이어야 한다(빈 행이 생기면 안 됨)
--      select count(*) from public.increment_profile_counters('__nope__', 10, '2026-07-19', false);
--      select count(*) from public.profiles where user_id = '__nope__';   -- 0
--   3) 손실 0 확인 (수정 전 33% → 후 0%)
--      node scripts/verify-lost-update.js 5 --rpc
