-- ======================================================
-- 코티지보드 Supabase 전체 테이블 설정 SQL
-- Supabase 대시보드 > SQL Editor 에서 전체 실행
-- 이미 존재하는 테이블은 IF NOT EXISTS로 건너뜀
-- ======================================================


-- ── page_views (페이지 방문자 트래킹) ────────────────────
create table if not exists public.page_views (
  id         uuid primary key default gen_random_uuid(),
  page       text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;

create policy if not exists "anon_insert_page_views"
  on public.page_views for insert
  to anon
  with check (true);

create policy if not exists "anon_select_page_views"
  on public.page_views for select
  to anon
  using (true);


-- ── game_views (게임 상세 열람 → 인기게임 집계) ──────────
create table if not exists public.game_views (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  viewed_at  timestamptz not null default now()
);

create index if not exists game_views_game_id_idx   on public.game_views (game_id);
create index if not exists game_views_viewed_at_idx on public.game_views (viewed_at desc);

alter table public.game_views enable row level security;

create policy if not exists "anon_insert_game_views"
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

create policy if not exists "anon_insert_game_ratings"
  on public.game_ratings for insert
  to anon
  with check (true);

create policy if not exists "anon_select_game_ratings"
  on public.game_ratings for select
  to anon
  using (true);


-- ── game_play_records (플레이 기록) ──────────────────────
create table if not exists public.game_play_records (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null,
  player_count smallint,
  created_at   timestamptz not null default now()
);

create index if not exists game_play_records_game_id_idx on public.game_play_records (game_id);

alter table public.game_play_records enable row level security;

create policy if not exists "anon_insert_game_play_records"
  on public.game_play_records for insert
  to anon
  with check (true);

create policy if not exists "anon_select_game_play_records"
  on public.game_play_records for select
  to anon
  using (true);


-- ── play_highlights (플레이 하이라이트 메모) ─────────────
create table if not exists public.play_highlights (
  id             uuid primary key default gen_random_uuid(),
  game_id        text not null,
  highlight_text text not null,
  created_at     timestamptz not null default now()
);

create index if not exists play_highlights_game_id_idx on public.play_highlights (game_id);

alter table public.play_highlights enable row level security;

create policy if not exists "anon_insert_play_highlights"
  on public.play_highlights for insert
  to anon
  with check (true);

create policy if not exists "anon_select_play_highlights"
  on public.play_highlights for select
  to anon
  using (true);


-- ── game_comments (게임 코멘트) ───────────────────────────
create table if not exists public.game_comments (
  id           uuid primary key default gen_random_uuid(),
  game_key     text not null,
  comment_text text not null check (char_length(comment_text) between 1 and 500),
  created_at   timestamptz not null default now()
);

create index if not exists game_comments_game_key_idx on public.game_comments (game_key);
create index if not exists game_comments_created_at_idx on public.game_comments (created_at desc);

alter table public.game_comments enable row level security;

create policy if not exists "anon_insert_game_comments"
  on public.game_comments for insert
  to anon
  with check (true);

create policy if not exists "anon_select_game_comments"
  on public.game_comments for select
  to anon
  using (true);


-- ── game_likes (따봉) ─────────────────────────────────────
create table if not exists public.game_likes (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  user_id    text not null,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index if not exists game_likes_game_id_idx on public.game_likes (game_id);

alter table public.game_likes enable row level security;

create policy if not exists "anon_insert_game_likes"
  on public.game_likes for insert
  to anon
  with check (true);

create policy if not exists "anon_select_game_likes"
  on public.game_likes for select
  to anon
  using (true);

create policy if not exists "anon_delete_game_likes"
  on public.game_likes for delete
  to anon
  using (true);


-- ── game_requests (게임 구매 요청) ───────────────────────
create table if not exists public.game_requests (
  id            uuid primary key default gen_random_uuid(),
  game_name     text not null,
  request_count int not null default 1,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

create index if not exists game_requests_count_idx on public.game_requests (request_count desc);

alter table public.game_requests enable row level security;

create policy if not exists "anon_insert_game_requests"
  on public.game_requests for insert
  to anon
  with check (true);

create policy if not exists "anon_select_game_requests"
  on public.game_requests for select
  to anon
  using (true);

create policy if not exists "anon_update_game_requests"
  on public.game_requests for update
  to anon
  using (true);


-- ── snack_requests (간식·음료 요청) ──────────────────────
create table if not exists public.snack_requests (
  id            uuid primary key default gen_random_uuid(),
  item_name     text not null,
  request_count int not null default 1,
  created_at    timestamptz not null default now()
);

create index if not exists snack_requests_count_idx on public.snack_requests (request_count desc);

alter table public.snack_requests enable row level security;

create policy if not exists "anon_insert_snack_requests"
  on public.snack_requests for insert
  to anon
  with check (true);

create policy if not exists "anon_select_snack_requests"
  on public.snack_requests for select
  to anon
  using (true);

create policy if not exists "anon_update_snack_requests"
  on public.snack_requests for update
  to anon
  using (true);


-- ── suggestions (개선 건의, 비공개) ──────────────────────
create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

create policy if not exists "anon_insert_suggestions"
  on public.suggestions for insert
  to anon
  with check (true);

-- 건의는 운영자만 조회 (select 정책 없음 = anon 조회 불가)


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
