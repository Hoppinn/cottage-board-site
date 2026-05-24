-- ======================================================
-- 코티지보드 Supabase 초기 설정 SQL
-- Supabase 대시보드 > SQL Editor 에서 실행
-- ======================================================

-- ── game_views (게임 상세 열람 → 인기게임 집계) ──────────

create table if not exists public.game_views (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  viewed_at  timestamptz not null default now()
);

create index if not exists game_views_game_id_idx  on public.game_views (game_id);
create index if not exists game_views_viewed_at_idx on public.game_views (viewed_at desc);

alter table public.game_views enable row level security;

create policy "anon_insert_game_views"
  on public.game_views for insert
  to anon
  with check (true);

-- ── game_ratings (손님 익명 별점) ─────────────────────────

create table if not exists public.game_ratings (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null,
  rating       smallint not null check (rating between 1 and 5),
  session_key  text,
  rated_at     timestamptz not null default now()
);

create index if not exists game_ratings_game_id_idx on public.game_ratings (game_id);

alter table public.game_ratings enable row level security;

create policy "anon_insert_game_ratings"
  on public.game_ratings for insert
  to anon
  with check (true);

create policy "anon_select_game_ratings"
  on public.game_ratings for select
  to anon
  using (true);

-- ── RPC: 인기게임 집계 (최근 30일 조회수 상위) ────────────

create or replace function public.get_popular_games(limit_count int default 20)
returns table(game_id text, view_count bigint)
language sql security definer stable
as $$
  select game_id, count(*) as view_count
  from public.game_views
  where viewed_at > now() - interval '30 days'
  group by game_id
  order by view_count desc
  limit limit_count;
$$;

-- ── RPC: 전체 게임 별점 요약 ──────────────────────────────

create or replace function public.get_all_game_ratings()
returns table(game_id text, avg_rating numeric, rating_count bigint)
language sql security definer stable
as $$
  select
    game_id,
    round(avg(rating)::numeric, 2) as avg_rating,
    count(*) as rating_count
  from public.game_ratings
  group by game_id;
$$;
