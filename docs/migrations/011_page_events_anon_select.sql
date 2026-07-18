-- 011_page_events_anon_select.sql
-- Purpose: make the admin event funnel readable again.
--
-- page_events was created (supabase-setup.sql:697-711) with RLS enabled and
-- these policies:
--     INSERT to anon           -- writes worked
--     SELECT to authenticated  -- reads never worked
--
-- This project authenticates with Kakao OAuth, not Supabase Auth, so no client
-- ever holds an `authenticated` role — every request is `anon`. The SELECT
-- policy therefore matched nobody and RLS filtered every row out. RLS returns
-- an EMPTY RESULT rather than an error, so the funnel silently rendered zeros
-- and nothing appeared in the console. Measured 2026-07-18: anon sees 0 rows
-- while the table actually holds 1,452.
--
-- The sibling analytics tables get this right and are the model here:
--   page_views    (:24-31)   INSERT anon / SELECT anon
--   page_sessions (:469-476) INSERT anon / SELECT anon
-- Only page_events diverged, in the same file — an oversight, not a policy
-- decision. Note these siblings already expose user_id and session_key to
-- anon, so opening page_events adds no new class of exposure.
--
-- No application code changes: the existing aggregation already works and has
-- simply been receiving empty arrays. Rollback is one DROP POLICY; no data is
-- touched.

-- 1) allow anon to read (mirrors page_views / page_sessions)
drop policy if exists "anon_select_page_events" on public.page_events;
create policy "anon_select_page_events"
  on public.page_events for select to anon using (true);

-- 2) drop the dead policy — `authenticated` is unreachable in this project
drop policy if exists "auth_select_page_events" on public.page_events;

-- Verify after running:
--   select count(*) from public.page_events;            -- postgres: 1452
--   -- then reload the admin page; the funnel should show non-zero steps.
--   select polname, polroles::regrole[], polcmd
--     from pg_policy where polrelid = 'public.page_events'::regclass;
--   -- expect: anon_insert_page_events {anon} a / anon_select_page_events {anon} r
