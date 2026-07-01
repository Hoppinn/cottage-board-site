-- 007_page_views_session_key.sql
-- Purpose: keep visitor-count analytics on one source of truth.
-- `page_views.__visitor__` rows already represent unique visitor-day markers.
-- Adding session_key lets admin analytics count guest visitors from the same
-- rows instead of mixing page_views counts with page_sessions identities.

alter table public.page_views
  add column if not exists session_key text;

create index if not exists idx_page_views_session_key
  on public.page_views (session_key);
