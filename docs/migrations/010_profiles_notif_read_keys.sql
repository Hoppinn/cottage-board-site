-- 010_profiles_notif_read_keys.sql
-- Purpose: allow marking a SINGLE notification as read.
--
-- Until now read state was one timestamp (`profiles.notif_seen_at`), which can
-- only express "everything before T is read". The per-card 읽음 button therefore
-- had no place to store its result and silently fell back to mark-all
-- (kakao-auth.js `_markAllNotifSeen`) — the bug this migration unblocks.
--
-- Notifications are not rows in one table; they are derived on the fly from 7
-- different sources. Identity is `{type}:{source row id}`, e.g. `new_intro:42`.
-- Both mechanisms stay: notif_seen_at is the bulk horizon ("모두 읽기"), while
-- notif_read_keys holds individual reads made after that horizon. Keys older
-- than notif_seen_at are pruned on write since the horizon already covers them.
--
-- RLS: no change. This adds a column to an existing table; `profiles` already
-- runs with RLS disabled (project default — Kakao OAuth means no auth.uid(),
-- anon key reads/writes directly). No ALTER ... DISABLE ROW LEVEL SECURITY is
-- needed here because that only applies to newly created tables.

alter table public.profiles
  add column if not exists notif_read_keys jsonb not null default '[]'::jsonb;

-- Verify after running (anon key SELECT, per CLAUDE.md 「Supabase RLS」):
--   select user_id, notif_seen_at, notif_read_keys from public.profiles limit 5;
