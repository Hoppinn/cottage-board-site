-- ============================================================
-- 코티지보드 Supabase 전체 테이블 설정 SQL
-- Supabase 대시보드 > SQL Editor 에서 전체 실행
--
-- 안전 원칙:
--   · CREATE TABLE IF NOT EXISTS  — 테이블 이미 있으면 건너뜀
--   · ALTER TABLE ADD COLUMN IF NOT EXISTS  — 컬럼 이미 있으면 건너뜀
--   · DROP POLICY IF EXISTS + CREATE POLICY  — 정책만 재생성 (데이터 무관)
--   · UPDATE/DELETE/TRUNCATE 문 없음  — 기존 데이터 절대 건드리지 않음
--   · INSERT … ON CONFLICT DO NOTHING  — 중복 무시
--   · CREATE OR REPLACE FUNCTION  — 함수만 덮어씀
-- ============================================================


-- ── page_views (페이지 방문자 트래킹 · 회원/비회원 모두) ────
create table if not exists public.page_views (
  id         uuid        primary key default gen_random_uuid(),
  page       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;

drop policy if exists "anon_insert_page_views" on public.page_views;
create policy "anon_insert_page_views"
  on public.page_views for insert to anon with check (true);

drop policy if exists "anon_select_page_views" on public.page_views;
create policy "anon_select_page_views"
  on public.page_views for select to anon using (true);


-- ── game_views (게임 상세 열람 → 인기게임 집계) ──────────────
create table if not exists public.game_views (
  id        uuid        primary key default gen_random_uuid(),
  game_id   text        not null,
  viewed_at timestamptz not null default now()
);

create index if not exists game_views_game_id_idx   on public.game_views (game_id);
create index if not exists game_views_viewed_at_idx on public.game_views (viewed_at desc);

alter table public.game_views enable row level security;

drop policy if exists "anon_insert_game_views" on public.game_views;
create policy "anon_insert_game_views"
  on public.game_views for insert to anon with check (true);


-- ── game_ratings (손님 익명 별점) ────────────────────────────
create table if not exists public.game_ratings (
  id          uuid     primary key default gen_random_uuid(),
  game_id     text     not null,
  rating      smallint not null check (rating between 1 and 5),
  session_key text,
  user_id     text,
  rated_at    timestamptz not null default now()
);

create index if not exists game_ratings_game_id_idx on public.game_ratings (game_id);
create index if not exists game_ratings_user_id_idx on public.game_ratings (user_id);

alter table public.game_ratings enable row level security;

drop policy if exists "anon_insert_game_ratings" on public.game_ratings;
create policy "anon_insert_game_ratings"
  on public.game_ratings for insert to anon with check (true);

drop policy if exists "anon_select_game_ratings" on public.game_ratings;
create policy "anon_select_game_ratings"
  on public.game_ratings for select to anon using (true);


-- ── game_play_records (플레이 기록) ──────────────────────────
create table if not exists public.game_play_records (
  id            uuid     primary key default gen_random_uuid(),
  game_id       text     not null,
  player_count  smallint,
  review_text   text,
  player_names  text,
  play_time_min smallint,
  score_note    text,
  nickname      text,
  user_id       text,
  group_name    text,
  played_at     date,
  photo_url     text,
  created_at    timestamptz not null default now()
);

create index if not exists game_play_records_game_id_idx on public.game_play_records (game_id);

alter table public.game_play_records enable row level security;

drop policy if exists "anon_insert_game_play_records" on public.game_play_records;
create policy "anon_insert_game_play_records"
  on public.game_play_records for insert to anon with check (true);

drop policy if exists "anon_select_game_play_records" on public.game_play_records;
create policy "anon_select_game_play_records"
  on public.game_play_records for select to anon using (true);

drop policy if exists "anon_update_game_play_records" on public.game_play_records;
create policy "anon_update_game_play_records"
  on public.game_play_records for update to anon using (true) with check (true);

drop policy if exists "anon_delete_game_play_records" on public.game_play_records;
create policy "anon_delete_game_play_records"
  on public.game_play_records for delete to anon using (true);

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.game_play_records add column if not exists review_text   text;
alter table public.game_play_records add column if not exists player_names  text;
alter table public.game_play_records add column if not exists play_time_min smallint;
alter table public.game_play_records add column if not exists score_note    text;
alter table public.game_play_records add column if not exists nickname      text;
alter table public.game_play_records add column if not exists user_id       text;
alter table public.game_play_records add column if not exists group_name    text;
alter table public.game_play_records add column if not exists played_at     date;
alter table public.game_play_records add column if not exists photo_url     text;


-- ── play_highlights (플레이 하이라이트 메모) ─────────────────
create table if not exists public.play_highlights (
  id             uuid primary key default gen_random_uuid(),
  game_id        text not null,
  highlight_text text not null,
  created_at     timestamptz not null default now()
);

create index if not exists play_highlights_game_id_idx on public.play_highlights (game_id);

alter table public.play_highlights enable row level security;

drop policy if exists "anon_insert_play_highlights" on public.play_highlights;
create policy "anon_insert_play_highlights"
  on public.play_highlights for insert to anon with check (true);

drop policy if exists "anon_select_play_highlights" on public.play_highlights;
create policy "anon_select_play_highlights"
  on public.play_highlights for select to anon using (true);


-- ── game_comments (게임 코멘트) ───────────────────────────────
create table if not exists public.game_comments (
  id           uuid primary key default gen_random_uuid(),
  game_key     text not null,
  comment_text text not null check (char_length(comment_text) between 1 and 500),
  nickname     text,
  user_id      text,
  record_id    text,   -- (014) 특정 플레이기록에 매인 게임평. NULL이면 게임 단위 독립 게임평
  created_at   timestamptz not null default now()
);

create index if not exists game_comments_game_key_idx  on public.game_comments (game_key);
create index if not exists game_comments_created_at_idx on public.game_comments (created_at desc);
create index if not exists game_comments_record_id_idx  on public.game_comments (record_id);

alter table public.game_comments enable row level security;

drop policy if exists "anon_insert_game_comments" on public.game_comments;
create policy "anon_insert_game_comments"
  on public.game_comments for insert to anon with check (true);

drop policy if exists "anon_select_game_comments" on public.game_comments;
create policy "anon_select_game_comments"
  on public.game_comments for select to anon using (true);

drop policy if exists "anon_update_game_comments" on public.game_comments;
create policy "anon_update_game_comments"
  on public.game_comments for update to anon
  using (true) with check (char_length(comment_text) between 1 and 500);

drop policy if exists "anon_delete_game_comments" on public.game_comments;
create policy "anon_delete_game_comments"
  on public.game_comments for delete to anon using (true);

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.game_comments add column if not exists nickname text;
alter table public.game_comments add column if not exists user_id  text;
alter table public.game_comments add column if not exists record_id text;  -- (014)


-- ── game_likes (따봉) ─────────────────────────────────────────
create table if not exists public.game_likes (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  user_id    text not null,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index if not exists game_likes_game_id_idx on public.game_likes (game_id);

alter table public.game_likes enable row level security;

drop policy if exists "anon_insert_game_likes" on public.game_likes;
create policy "anon_insert_game_likes"
  on public.game_likes for insert to anon with check (true);

drop policy if exists "anon_select_game_likes" on public.game_likes;
create policy "anon_select_game_likes"
  on public.game_likes for select to anon using (true);

drop policy if exists "anon_delete_game_likes" on public.game_likes;
create policy "anon_delete_game_likes"
  on public.game_likes for delete to anon using (true);


-- ── game_curious (궁금해요) ──────────────────────────────────
create table if not exists public.game_curious (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  user_id    text not null,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index if not exists game_curious_game_id_idx on public.game_curious (game_id);

alter table public.game_curious enable row level security;

drop policy if exists "anon_insert_game_curious" on public.game_curious;
create policy "anon_insert_game_curious"
  on public.game_curious for insert to anon with check (true);

drop policy if exists "anon_select_game_curious" on public.game_curious;
create policy "anon_select_game_curious"
  on public.game_curious for select to anon using (true);

drop policy if exists "anon_delete_game_curious" on public.game_curious;
create policy "anon_delete_game_curious"
  on public.game_curious for delete to anon using (true);


-- ── game_reviews (게임 후기) ──────────────────────────────────
create table if not exists public.game_reviews (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  user_id    text,
  nickname   text,
  content    text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists game_reviews_game_id_idx    on public.game_reviews (game_id);
create index if not exists game_reviews_created_at_idx on public.game_reviews (created_at desc);

alter table public.game_reviews enable row level security;

drop policy if exists "anon_insert_game_reviews" on public.game_reviews;
create policy "anon_insert_game_reviews"
  on public.game_reviews for insert to anon with check (true);

drop policy if exists "anon_select_game_reviews" on public.game_reviews;
create policy "anon_select_game_reviews"
  on public.game_reviews for select to anon using (true);

drop policy if exists "anon_delete_game_reviews" on public.game_reviews;
create policy "anon_delete_game_reviews"
  on public.game_reviews for delete to anon using (true);


-- ── game_requests (게임 구매 요청) ────────────────────────────
create table if not exists public.game_requests (
  id            uuid primary key default gen_random_uuid(),
  game_name     text not null,
  request_count int  not null default 1,
  status        text not null default 'pending',
  user_id       text,
  is_planned    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists game_requests_count_idx on public.game_requests (request_count desc);

alter table public.game_requests enable row level security;

drop policy if exists "anon_insert_game_requests" on public.game_requests;
create policy "anon_insert_game_requests"
  on public.game_requests for insert to anon with check (true);

drop policy if exists "anon_select_game_requests" on public.game_requests;
create policy "anon_select_game_requests"
  on public.game_requests for select to anon using (true);

drop policy if exists "anon_update_game_requests" on public.game_requests;
create policy "anon_update_game_requests"
  on public.game_requests for update to anon using (true);

drop policy if exists "anon_delete_game_requests" on public.game_requests;
create policy "anon_delete_game_requests"
  on public.game_requests for delete to anon using (true);

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.game_requests add column if not exists user_id    text;
alter table public.game_requests add column if not exists is_planned boolean not null default false;


-- ── snack_requests (간식·음료 요청) ──────────────────────────
create table if not exists public.snack_requests (
  id            uuid primary key default gen_random_uuid(),
  item_name     text not null,
  request_count int  not null default 1,
  user_id       text,
  created_at    timestamptz not null default now()
);

create index if not exists snack_requests_count_idx on public.snack_requests (request_count desc);

alter table public.snack_requests enable row level security;

drop policy if exists "anon_insert_snack_requests" on public.snack_requests;
create policy "anon_insert_snack_requests"
  on public.snack_requests for insert to anon with check (true);

drop policy if exists "anon_select_snack_requests" on public.snack_requests;
create policy "anon_select_snack_requests"
  on public.snack_requests for select to anon using (true);

drop policy if exists "anon_update_snack_requests" on public.snack_requests;
create policy "anon_update_snack_requests"
  on public.snack_requests for update to anon using (true);

drop policy if exists "anon_delete_snack_requests" on public.snack_requests;
create policy "anon_delete_snack_requests"
  on public.snack_requests for delete to anon using (true);

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.snack_requests add column if not exists user_id text;


-- ── suggestions (개선 건의 · 운영자만 조회 가능) ─────────────
create table if not exists public.suggestions (
  id         uuid primary key default gen_random_uuid(),
  content    text not null check (char_length(content) between 1 and 500),
  user_id    text,
  is_done    boolean not null default false,
  is_planned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

drop policy if exists "anon_insert_suggestions" on public.suggestions;
create policy "anon_insert_suggestions"
  on public.suggestions for insert to anon with check (true);

-- select 정책 없음 = anon 조회 불가 (운영자만 직접 조회)

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.suggestions add column if not exists user_id    text;
alter table public.suggestions add column if not exists is_done    boolean not null default false;
alter table public.suggestions add column if not exists is_planned boolean not null default false;


-- ── member_intros (동호회 가입 인사 게시판) ───────────────────
create table if not exists public.member_intros (
  id             uuid primary key default gen_random_uuid(),
  nickname       text not null check (char_length(nickname) between 1 and 20),
  favorite_games text check (char_length(favorite_games) <= 100),
  available      text check (char_length(available) <= 100),
  location       text check (char_length(location) <= 50),
  user_id        text,
  card_color     text,
  created_at     timestamptz not null default now()
);

create index if not exists member_intros_created_at_idx on public.member_intros (created_at desc);

alter table public.member_intros enable row level security;

drop policy if exists "anon_insert_member_intros" on public.member_intros;
create policy "anon_insert_member_intros"
  on public.member_intros for insert to anon with check (true);

drop policy if exists "anon_select_member_intros" on public.member_intros;
create policy "anon_select_member_intros"
  on public.member_intros for select to anon using (true);

drop policy if exists "anon_update_member_intros" on public.member_intros;
create policy "anon_update_member_intros"
  on public.member_intros for update to anon using (true) with check (true);

drop policy if exists "anon_delete_member_intros" on public.member_intros;
create policy "anon_delete_member_intros"
  on public.member_intros for delete to anon using (true);

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.member_intros add column if not exists user_id    text;
alter table public.member_intros add column if not exists card_color text;


-- ── game_request_votes (구매요청 투표자 기록) ─────────────────
create table if not exists public.game_request_votes (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id    text not null,
  created_at timestamptz default now(),
  unique (request_id, user_id)
);

alter table public.game_request_votes enable row level security;

drop policy if exists "anon_all_req_votes"    on public.game_request_votes;
drop policy if exists "anon_insert_req_votes" on public.game_request_votes;
drop policy if exists "anon_select_req_votes" on public.game_request_votes;
drop policy if exists "anon_delete_req_votes" on public.game_request_votes;
create policy "anon_all_req_votes"
  on public.game_request_votes for all to anon using (true) with check (true);


-- ── profiles (카카오 로그인 사용자 프로필) ────────────────────
-- ⚠ visit_count / total_minutes 등 집계 컬럼은 이 파일에서 절대 UPDATE하지 않는다.
--    이 파일은 테이블/컬럼/정책 구조만 설정하며 기존 데이터를 건드리지 않는다.
create table if not exists public.profiles (
  user_id            text        primary key,
  nickname           text,
  photo_url          text,
  first_seen_at      timestamptz default now(),
  last_seen_at       timestamptz default now(),
  visit_count        int         default 1,
  total_minutes      int         default 0,
  today_seconds      integer     default 0,
  today_date         date,
  is_banned          boolean     default false,
  rep_achievement_id text,
  rep_title_id       text
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

alter table public.profiles enable row level security;

drop policy if exists "anon_insert_profiles" on public.profiles;
create policy "anon_insert_profiles"
  on public.profiles for insert to anon with check (true);

drop policy if exists "anon_select_profiles" on public.profiles;
create policy "anon_select_profiles"
  on public.profiles for select to anon using (true);

drop policy if exists "anon_update_profiles" on public.profiles;
create policy "anon_update_profiles"
  on public.profiles for update to anon using (true) with check (true);

-- 기존 DB에 컬럼 없을 경우 추가
alter table public.profiles add column if not exists photo_url          text;
alter table public.profiles add column if not exists total_minutes       int     default 0;
alter table public.profiles add column if not exists today_seconds       integer default 0;
alter table public.profiles add column if not exists today_date          date;
alter table public.profiles add column if not exists is_banned           boolean default false;
alter table public.profiles add column if not exists rep_achievement_id  text;
alter table public.profiles add column if not exists rep_title_id        text;


-- ── page_sessions (페이지별 체류시간 트래킹) ─────────────────
create table if not exists public.page_sessions (
  id           uuid    primary key default gen_random_uuid(),
  page         text    not null,
  referrer     text,
  user_id      text,
  duration_sec integer,
  entered_at   timestamptz not null default now()
);

create index if not exists page_sessions_entered_at_idx on public.page_sessions (entered_at desc);
create index if not exists page_sessions_page_idx       on public.page_sessions (page);

alter table public.page_sessions enable row level security;

drop policy if exists "anon_insert_page_sessions" on public.page_sessions;
create policy "anon_insert_page_sessions"
  on public.page_sessions for insert to anon with check (true);

drop policy if exists "anon_select_page_sessions" on public.page_sessions;
create policy "anon_select_page_sessions"
  on public.page_sessions for select to anon using (true);


-- ── anon_sessions (비로그인 방문자 세션 추적) ─────────────────
-- session_key: localStorage의 cottage_session_id UUID
-- 하트비트 1분마다 last_seen_at 갱신
create table if not exists public.anon_sessions (
  session_key   text        primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists anon_sessions_last_seen_idx on public.anon_sessions (last_seen_at desc);

alter table public.anon_sessions enable row level security;

drop policy if exists "anon_upsert_anon_sessions" on public.anon_sessions;
create policy "anon_upsert_anon_sessions"
  on public.anon_sessions for insert to anon with check (true);

drop policy if exists "anon_update_anon_sessions" on public.anon_sessions;
create policy "anon_update_anon_sessions"
  on public.anon_sessions for update to anon using (true);

drop policy if exists "anon_select_anon_sessions" on public.anon_sessions;
create policy "anon_select_anon_sessions"
  on public.anon_sessions for select to anon using (true);


-- ── Storage: play-photos 버킷 + RLS ──────────────────────────
insert into storage.buckets (id, name, public)
values ('play-photos', 'play-photos', true)
on conflict (id) do nothing;

drop policy if exists "anon_insert_play_photos" on storage.objects;
create policy "anon_insert_play_photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'play-photos');

drop policy if exists "public_select_play_photos" on storage.objects;
create policy "public_select_play_photos"
  on storage.objects for select to anon
  using (bucket_id = 'play-photos');

drop policy if exists "anon_delete_play_photos" on storage.objects;
create policy "anon_delete_play_photos"
  on storage.objects for delete to anon
  using (bucket_id = 'play-photos');


-- ── RPC: 인기게임 집계 (최근 30일 조회수 상위) ───────────────
create or replace function public.get_popular_games(limit_count int default 20)
returns table(game_id text, view_count bigint)
language sql security definer stable as $$
  select game_id, count(*) as view_count
  from public.game_views
  where viewed_at > now() - interval '30 days'
  group by game_id
  order by view_count desc
  limit limit_count;
$$;


-- ── RPC: 전체 게임 별점 요약 ─────────────────────────────────
create or replace function public.get_all_game_ratings()
returns table(game_id text, avg_rating numeric, rating_count bigint)
language sql security definer stable as $$
  select
    game_id,
    round(avg(rating)::numeric, 2) as avg_rating,
    count(*) as rating_count
  from public.game_ratings
  group by game_id;
$$;


-- ── achievements (업적 정의 · legacy) ──────────────────────────
-- [legacy] 구 동물명 기반 ID 체계(V1). 현재 업적은 ACH_DEFS(JS) 기준으로 관리.
-- 이 테이블은 하위 호환성 유지용. 신규 데이터 INSERT 불필요.
create table if not exists public.achievements (
  id        text primary key,
  name      text not null,
  emoji     text,
  category  text,
  threshold int,
  points    int  default 0
);

alter table public.achievements enable row level security;
drop policy if exists "anon_select_achievements" on public.achievements;
create policy "anon_select_achievements"
  on public.achievements for select to anon using (true);


-- ── user_achievements (유저별 획득 업적) ─────────────────────
-- achievement_id FK 없음 — 131차 이후 행동축 기반 ID는 achievements 테이블 행 없이 직접 삽입
create table if not exists public.user_achievements (
  id             bigserial   primary key,
  user_id        text        not null,
  achievement_id text,
  earned_at      timestamptz default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
drop policy if exists "anon_insert_user_achievements" on public.user_achievements;
create policy "anon_insert_user_achievements"
  on public.user_achievements for insert to anon with check (true);
drop policy if exists "anon_select_user_achievements" on public.user_achievements;
create policy "anon_select_user_achievements"
  on public.user_achievements for select to anon using (true);


-- ── points_log (포인트 원장 · append-only) ───────────────────
create table if not exists public.points_log (
  id         bigserial   primary key,
  user_id    text        not null,
  delta      int         not null,
  reason     text,
  created_at timestamptz default now()
);

alter table public.points_log enable row level security;
drop policy if exists "anon_insert_points_log" on public.points_log;
create policy "anon_insert_points_log"
  on public.points_log for insert to anon with check (true);
drop policy if exists "anon_select_points_log" on public.points_log;
create policy "anon_select_points_log"
  on public.points_log for select to anon using (true);


-- ── point_rewards (포인트 승인 대기 · 비활성화) ──────────────
-- [legacy] 포인트 UI 숨김 상태. DB 구조는 유지하나 현재 미사용.
create table if not exists public.point_rewards (
  id             bigserial   primary key,
  user_id        text        not null,
  achievement_id text,
  points         int         not null,
  status         text        not null default 'pending',
  created_at     timestamptz default now(),
  reviewed_at    timestamptz,
  reviewed_by    text
);

alter table public.point_rewards enable row level security;
drop policy if exists "anon_insert_point_rewards" on public.point_rewards;
create policy "anon_insert_point_rewards"
  on public.point_rewards for insert to anon with check (true);
drop policy if exists "anon_select_point_rewards" on public.point_rewards;
create policy "anon_select_point_rewards"
  on public.point_rewards for select to anon using (true);


-- ── voucher_products (교환권 상품 카탈로그) ──────────────────
create table if not exists public.voucher_products (
  id        serial  primary key,
  name      text    not null,
  cost      int     not null,
  is_active boolean not null default true
);

alter table public.voucher_products enable row level security;
drop policy if exists "anon_select_voucher_products" on public.voucher_products;
create policy "anon_select_voucher_products"
  on public.voucher_products for select to anon using (true);

-- ⚠ 더미 데이터 (is_active=false). 실제 운영 상품은 Supabase에서 별도 INSERT 필요.
insert into public.voucher_products (id, name, cost, is_active) values
  (1, '물 2병',  1, false),
  (2, '홈런볼',  1, false),
  (3, '캔커피',  2, false)
on conflict (id) do nothing;


-- ── voucher_log (교환권 원장 · append-only) ──────────────────
-- delta > 0: 지급 (first_play / achievement) · delta < 0: 사용 (redeem)
-- 001_vouchers + 003_voucher_achievement 통합 최종 스키마
create table if not exists public.voucher_log (
  id         bigserial   primary key,
  user_id    text        not null,
  delta      int         not null,
  reason     text        not null
               check (reason in ('first_play', 'redeem', 'dev_test', 'achievement')),
  product_id int         references public.voucher_products(id),
  note       text,
  created_at timestamptz not null default now()
);

-- first_play 중복 방지 (user당 1회)
create unique index if not exists voucher_log_first_play_unique
  on public.voucher_log (user_id)
  where reason = 'first_play';

-- achievement 중복 방지 (user + achId 조합 1회)
create unique index if not exists voucher_log_achievement_unique
  on public.voucher_log (user_id, note)
  where reason = 'achievement';

-- 잔액 집계 성능용
create index if not exists voucher_log_user_idx on public.voucher_log (user_id);

alter table public.voucher_log enable row level security;
drop policy if exists "anon_insert_voucher_log" on public.voucher_log;
create policy "anon_insert_voucher_log"
  on public.voucher_log for insert to anon with check (true);
drop policy if exists "anon_select_voucher_log" on public.voucher_log;
create policy "anon_select_voucher_log"
  on public.voucher_log for select to anon using (true);


-- ── 이후 마이그레이션 (ALTER / 신규 테이블) ──────────────────
-- 아래 항목은 초기 배포 후 순차적으로 추가된 컬럼/테이블.
-- IF NOT EXISTS 보장 → 재실행 안전.

-- page_views: 유입경로 추적 컬럼
alter table public.page_views add column if not exists referrer text;

-- page_sessions: 비회원 추적용 세션키
alter table public.page_sessions add column if not exists session_key text;

-- page_events (추천게임찾기 이벤트 추적)
create table if not exists public.page_events (
  id         bigint generated always as identity primary key,
  event_type text        not null,
  game_id    text,
  referrer   text,
  created_at timestamptz not null default now()
);
alter table public.page_events enable row level security;
drop policy if exists "anon_insert_page_events" on public.page_events;
create policy "anon_insert_page_events"
  on public.page_events for insert to anon with check (true);
drop policy if exists "auth_select_page_events" on public.page_events;
create policy "auth_select_page_events"
  on public.page_events for select to authenticated using (true);

-- game_requests: 구매상태 / 날짜 / 실제추가게임 컬럼
alter table public.game_requests add column if not exists added_at     timestamptz;
alter table public.game_requests add column if not exists actual_games jsonb default '[]';
alter table public.game_requests add column if not exists purchase_status text;
alter table public.game_requests add column if not exists status_date  date;

