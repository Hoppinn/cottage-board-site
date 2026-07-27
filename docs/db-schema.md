# DB 스키마 — 코티지보드

최종 갱신: 2026-07-16 (마이그레이션 적용 상태 실측 기록 추가)

---

## 마이그레이션 적용 상태 (2026-07-16 실측)

`docs/migrations/` 000~009 **전부 운영 DB 적용 완료**. anon 키 읽기 전용 조회로 확인:

| 확인 대상 | 결과 |
|---|---|
| 007 `page_views.session_key` | ✅ 컬럼 존재. 신규 행 99% 채워짐(최근 7일 384행 중 NULL 3) / 과거 legacy 1,513행은 NULL(소급 보정 안 함) |
| 009 `meeting_vote_games.is_priority`·`player_condition` | ✅ 둘 다 존재, 실데이터 확인 |
| 008 `meeting_votes` / `meeting_vote_games` / `meeting_game_prefs` | ✅ 16 / 16 / 13행 |
| 001·003 `voucher_products` / `voucher_log` | ✅ 13 / 39행 |
| 취향보드 `profiles.bio`·`avoid_tags`·`notif_seen_at` | ✅ 전부 존재 (bio·avoid_tags 실데이터 각 2행) |
| 010 `profiles.notif_read_keys` | ✅ **실행 완료 (2026-07-18 실측)** — 컬럼 존재, 5행 전부 기본값 `[]` 확인 |
| 011 `page_events` anon SELECT 정책 | ✅ **실행 완료 + 검증 (2026-07-18)** — anon SELECT 1,452행 정상, 관리자 이벤트 퍼널이 실수치로 렌더됨(Playwright 확인) |
| 013 `meeting_votes.guest_count` | ✅ **실행 완료 + 검증 (2026-07-21)** — 22행 전부 default 0. anon 조회 응답에 `guest_count` 필드 존재를 실측(`scripts/verify-party-size.js --live`). **행 수만 보면 안 된다** — 컬럼이 없으면 PostgREST가 400을 내고 클라이언트는 `[]`를 반환해 「0행」으로 보인다 |
| 012 `increment_profile_counters` RPC | ✅ **실행 완료 + 검증 (2026-07-20 재확인)** — anon RPC 호출이 HTTP 200, 없는 `user_id`로 불러도 빈 행이 안 생김(012 파일의 검증 ②). ⚠️ **이 칸은 2026-07-20까지 「미실행」으로 남아 PROJECT_STATE의 「완료」와 충돌하고 있었다** — 문서 두 곳이 갈리면 그럴듯한 쪽으로 잇지 말고 이렇게 **DB에 직접 물어서** 닫을 것 |
| 014 `game_comments.record_id` | ✅ **실행 완료 + 검증 (2026-07-22)** — anon SELECT에 `record_id` 존재(드라이런 200), 뽁님 게임평 2건에 record_id=96/97 세팅 후 되읽기 확인. `getRecordComments(['96','97'])`가 2건 반환. ⚠️ **코드 배포 전 이 마이그레이션이 선행돼야 함**(`getGameComments`가 컬럼 select) — 순서가 뒤바뀌면 게임시트 「게임평」이 400으로 빈다 |

### ⚙️ PostgREST `max-rows` = 50000 (2026-07-18 변경, 마이그레이션 아님)

Supabase 대시보드 **Project Settings → API → Max rows**. 기본값 `1000`이 관리자 분석 조회 4개를 전부 조용히 절단하고 있었다(`page_sessions` 91% 누락 → "90일 분석"이 실제로는 7일). **에러가 아니라 그냥 행이 적게 오는 것**이라 감지기로 못 잡힌다.

⚠️ **이 값은 SQL이 아니라 대시보드 설정이라 마이그레이션 파일에 안 남는다** — DB를 재구축하면 기본값 1000으로 돌아가고 증상이 조용히 재발한다. 재구축 체크리스트에 포함할 것.

**보안 아님**: anon이 `.range()`로 전량 취득 가능함을 실측 확인했다(`range(1000,1999)` 정상). `max-rows`는 성능 가드레일이지 접근 통제가 아니다.

**한계**: 데이터가 5만 행을 넘으면 다시 절단된다. 그때는 집계 RPC로 전환([admin-analytics.md](admin-analytics.md) §5 "조건부 트리거" 참조 — 착수 트리거와 실제 난점이 거기 있다).

**배경**: PROJECT_STATE에 "⚠️ SQL 미실행"·"⚠️ 테이블 생성 필요"·"007 적용 전" 경고가 남아 있었으나 **전부 낡은 기재**였음(실제론 오래전 적용돼 기능이 운영 중). 세션마다 읽는 문서의 가짜 경고는 판단을 흐리므로 실측 후 닫음. **새 마이그레이션 추가 시 이 표에 적용 여부를 함께 기록할 것.**

### ⚠️ RLS 상태 — 마이그레이션에 명시 안 된 테이블 8개 (2026-07-16 발견)

**이 프로젝트 기본 = RLS DISABLE**(카카오 OAuth라 `auth.uid()` 불가, anon 키 직접 read/write). 그런데 마이그레이션 **000·001·004·008**은 테이블을 만들면서 `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;`를 넣지 않았다 — CLAUDE.md 「Supabase RLS: 테이블 생성 시 항상 RLS 상태를 명시」 규칙이 **2026-07-08에 생겨 그 이전 파일에 소급되지 않은 것**.

| 테이블 (생성 마이그레이션) | 운영 실측 (2026-07-16) |
|---|---|
| `achievements`·`user_achievements`·`points_log`·`point_rewards` (000) | ✅ anon 읽기 OK → RLS off (22/110/0/6행) |
| `voucher_products`·`voucher_log` (001) | ✅ RLS off (13/39행) |
| `member_intros` (004) | ✅ RLS off (8행) |
| `meeting_votes` (008) | ✅ RLS off (16행) |

**운영 영향 없음** — 전부 실제로 RLS가 꺼져 있음(대시보드 수동 해제 또는 생성 당시 기본값). **위험은 재구축 시**: 마이그레이션만으로 새 DB를 만들면 Supabase가 신규 테이블에 RLS를 **자동 활성화**해 앱이 전면 파손된다. `005_meeting_game_prefs_rls_fix.sql`이 바로 이 사고를 한 번 겪고 사후 수습한 파일 — 규칙이 생긴 이유다.

**대응(미착수, 우선순위 낮음)**: 재구축 계획이 실제로 생길 때 000·001·004·008에 `DISABLE ROW LEVEL SECURITY` 문을 추가하거나, 별도 `012_rls_baseline.sql`로 일괄 선언(※011은 아래 page_events 건이 가져갔음). 운영 DB엔 무영향(이미 off)이라 **긴급하지 않음**. 단 **새 테이블을 만들 때는 반드시 같은 파일에 명시**할 것.

### 🔴 RLS 두 번째 실패 모드 — 정책은 있는데 역할이 틀린 경우 (2026-07-18 발견)

위 8개가 "RLS 상태 **미명시**"였다면, `page_events`는 **RLS를 켜고 정책까지 걸었는데 `to` 역할이 틀린** 경우다. 규칙이 못 잡던 새 유형.

```sql
-- supabase-setup.sql:705-711 (문제의 원본)
alter table public.page_events enable row level security;
create policy "anon_insert_page_events" on ... for insert to anon          -- ✅ 쓰기 됨
create policy "auth_select_page_events" on ... for select to authenticated -- ❌ 읽기 영구 차단
```

**이 프로젝트엔 `authenticated` 역할이 존재할 수 없다**(카카오 OAuth라 Supabase Auth 세션이 안 생김 → 모든 요청이 `anon`). 따라서 SELECT 정책이 아무에게도 매치되지 않아 **RLS가 전 행을 필터링**했다. 결과는 **에러가 아니라 빈 결과**라 관리자 이벤트 퍼널이 조용히 0으로만 렌더됐고 콘솔에도 안 찍혔다.

**실측(2026-07-18)**: anon 0행 / postgres **1,452행**. 데이터는 계속 쌓이고 있었고 **읽기만** 막혀 있었다.

**비교 — 형제 테이블은 맞게 돼 있다**: `page_views`(:24-31)·`page_sessions`(:469-476)는 INSERT·SELECT 둘 다 `anon`. 같은 파일 안에서 `page_events`만 갈렸으니 **정책 판단이 아니라 실수**다. (이 형제들이 이미 `user_id`·`session_key`를 anon에 노출하므로 page_events를 여는 것이 **새로운 종류의 노출은 아니다**.)

🧹 **anon 키로는 `page_views`·`page_events`를 지울 수 없다 (2026-07-19 실측)** — 두 테이블은 RLS ON에 **INSERT·SELECT 정책만** 있어 DELETE 정책이 없다. 그래서 anon DELETE는 **`error: null`에 0행 처리**되고 PostgREST는 성공을 반환한다. 테스트 데이터를 남겼다면 **SQL Editor에서 지워야 하며, 삭제 후 반드시 건수를 재확인할 것**(성공 반환을 믿으면 안 지워진 걸 놓친다 — 「행 수 자체가 거짓말한다」의 삭제판). `profiles`·`page_sessions`는 RLS OFF라 anon 삭제가 실제로 먹는다.
- ⚠️ **SQL `LIKE`에서 `_`는 와일드카드다** — `'__racetest%'`는 임의의 두 글자로 시작하는 모든 행을 잡는다. 접두사로 지울 땐 `'\_\_racetest%'`로 이스케이프할 것.

**교훈**: 「테이블 생성 시 RLS 상태 명시」만으로는 부족하다 — **정책을 쓸 땐 `to` 역할이 `anon`인지도 확인**해야 한다. `authenticated`/`auth.uid()`는 이 프로젝트에서 항상 죽은 코드다. 조치는 `011_page_events_anon_select.sql`.

⚠️ **컬럼명을 추측해서 확인하지 말 것** — 2026-07-16 점검 중 `priority`/`condition_type`으로 조회해 "009 미적용"이라는 **거짓 결론**이 나올 뻔했음(실제 이름은 `is_priority`/`player_condition`). PostgREST는 없는 컬럼에 HTTP 400을 주므로, 마이그레이션 SQL 파일의 실제 이름으로 조회하고 **HTTP 상태를 반드시 확인**할 것(에러 응답을 "0행"으로 오독하기 쉬움).

---

## 영구 식별자 — 배포 후 변경 금지

사용자 자산(캐릭터·도감·포인트)의 기준이다.

- `achievements.id` (예: `record_1`)
- `game_play_records.game_id` (BGG ID)

변경 가능한 건 이름·설명·이미지·포인트뿐. **DB 변경 전 "기존 사용자가 무엇을 잃는가?"를 먼저 확인**하고, 불가피하면 기존 ID 유지 + 데이터 이전 설계 후 승인.

---

## 테이블 목록

| 테이블 | 주요 컬럼 | 용도 |
|--------|----------|------|
| `game_views` | game_id, created_at | 조회수 트래킹 |
| `game_ratings` | game_id, rating, session_key | 별점 |
| `game_likes` | game_id (nullable), user_id, custom_name (nullable text) | 따봉. custom_name은 직접입력 게임명 (game_id IS NULL일 때 사용). 🚨 **`game_id`에 들어 있는 건 bggId가 아니라 COTTAGE_GAMES 슬러그다**(실측 2026-07-21: `"리바이브"`·`"메이지나이트-얼티밋-에디션"`). `meeting_vote_games.game_id`는 **bggId 숫자**(`332772`)라 **같은 게임인데 두 테이블의 값이 다르다** — 두 출처를 한 화면에서 비교할 땐 반드시 한쪽으로 변환할 것. 안 하면 "이미 담은 게임"을 못 알아본다(모임 플래너 Step3 피커에서 실제로 발생, `normalizePickerItem`이 그 자리의 변환기). 옛 `meeting_vote_games` 행에는 `custom_name`에 `#슬러그`가 들어간 것도 있다(2026-07-09 이전) |
| `game_curious` | game_id (nullable), user_id, custom_name (nullable text) | 궁금해요. 동일 구조 |
| `game_comments` | game_key, comment_text, nickname, user_id, **record_id** (nullable, 014) | 게임 코멘트/게임평. `record_id`가 있으면 특정 플레이기록(`game_play_records.id`)에 매인 게임평 → 그 기록 아래 표시(P1). NULL이면 게임 단위 독립 게임평(종전 동작). FK 제약 없음(text) |
| `game_reviews` | game_id, content, nickname, user_id | 리뷰 |
| `game_play_records` | game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text | 플레이 기록 |
| `page_views` | page, created_at, referrer, is_bot (boolean, default false), user_id (text, nullable), session_key (text, nullable) | 페이지 방문 (referrer: utm_source 또는 외부 도메인 hostname). is_bot/user_id는 143차-178부터 추가 — `__visitor__` 마커 삽입 시점에 navigator.userAgent로 알려진 크롤러 패턴 매칭 시 is_bot=true, 로그인 상태면 user_id 채움(회원/비회원 구분용). session_key는 143차-190부터 추가 — `trackPageView()`가 `cottage_session_id` 값을 함께 저장. **과거 행은 session_key=NULL이며 소급 보정하지 않음** |
| `page_events` | event_type, game_id, referrer, session_key, user_id, created_at | 기능 이벤트. referrer: 세션 귀속 소스. session_key/user_id는 143차-160(2026-06-30)에 추가 — **그 이전 행은 NULL이라 unique 집계는 추가 시점 이후 데이터부터만 정확**. 이벤트 타입 목록: hero_recommend_click, recommend_start, recommend_complete, hero_record_click, record_start, record_complete, signup_complete, home_recommend_game_detail_click, home_recommend_all_click, home_recommend_main_click, recommend_run, home_record_main_click, home_record_write_click, home_record_more_click, home_meeting_main_click, home_meeting_planner_click, home_meeting_date_preview_click(홈 날짜 칩 클릭), home_meeting_preview_card_click(홈 미리보기 카드→날짜집계모달), meeting_planner_bar_click(플래너 막대→개인일정모달), meeting_profile_click(플래너 주간뷰 닉네임 클릭), home_meeting_week_nav(홈 미리보기 ◀▶ 주 이동 — event_type만 저장, direction/offset 페이로드는 현재 trackEvent가 game_id 외 opts 미처리로 버려짐), roulette_spin(날짜집계모달 룰렛 결과 확정 — game_id: COTTAGE_GAMES 소속이면 bggId, 직접입력·커스텀이면 null) |
| `page_sessions` | page, referrer, user_id, session_key, duration_sec, entered_at | 세션 분석 |
| `profiles` | user_id, nickname, real_name, last_seen_at, visit_count, total_minutes, is_banned, photo_url, today_seconds, today_date, rep_achievement_id, rep_title_id, first_source, bio (text), avoid_tags (text[]), notif_seen_at (timestamptz) | 유저 프로필. **bio: 한줄소개 SSOT** — 취향보드/회원 자기소개(club-intro.html)/모임 보드 3곳이 동일 컬럼을 공유 읽기·쓰기(`updateUserBio`). 한쪽에서 수정하면 나머지에도 즉시 반영됨(의도된 동작). avoid_tags: 피하는 유형 태그 배열, notif_seen_at: 알림 마지막 읽은 시각 (기기 간 동기화용), notif_read_keys (jsonb, default `[]`): **개별** 알림 읽음 키 배열 — `${type}:${소스행 id}` 형식(예: `new_intro:42`). notif_seen_at이 "이 시각 이전 전부 읽음"이라는 지평선만 표현할 수 있어 "이것만 읽음"을 담지 못하는 문제를 보완(010). **`updateNotifSeenAt`(모두 읽기)이 이 배열을 `[]`로 비운다** — 지평선을 새로 그으면 그 이전 개별 키는 전부 흡수되므로. 이게 배열 크기의 상한선 |
| `game_requests` | game_name, request_count, status, is_planned, user_id, purchase_status, status_date, purchased_at, actual_games, added_at | 게임 요청 |
| `snack_requests` | item_name, request_count, user_id, is_done, done_at | 간식 요청 (015: 처리완료 상태) |
| `suggestions` | content, user_id, is_done, is_planned | 건의사항 |
| `play_highlights` | game_id, highlight_text | 플레이 하이라이트 |
| `game_request_votes` | request_id, user_id | 요청 투표 |
| `member_intros` | id, user_id (**UNIQUE**), nickname, favorite_games, available, location, travel_range, meeting_style (text[]), card_color, created_at | 회원 자기소개 + 모임 보드 공유 프로필. user_id당 1행(143차, 마이그레이션 004) — 로그인 필수로 작성, upsert로 갱신. 2026-05-27 이전 작성된 일부 행은 user_id가 NULL인 레거시(로그인 비강제 시절) — 연동 대상에서 제외(클릭 불가). available: 참여 가능 시간, location: 활동 지역(시 단위, 정확한 주소 아님), travel_range: 이동 가능 범위, meeting_style: 선호 게임/모임 스타일 태그 |
| `meeting_game_prefs` | id, user_id, list_type (`want_this_time`\|`can_explain_rules`), game_id (nullable), custom_name (nullable), created_at | 모임 보드: "룰 설명 가능한 게임" 저장용. **`want_this_time` UNUSED** (2026-07-09 모임보드 미러링 전환 — "하고 싶은 게임"은 `game_likes`, "배우고 싶은 게임"은 `game_curious`로 이전, 읽기 중단). `can_explain_rules`만 현역. game_likes/game_curious와 동일한 행 구조 + list_type 구분 (143차, 마이그레이션 004). **RLS 비활성화**(005) — 이 프로젝트는 카카오 로그인 기반이라 Supabase Auth RLS가 적용되지 않음, 다른 테이블과 동일하게 anon key 직접 접근 |
| `anon_sessions` | session_key, first_seen_at, last_seen_at, visit_count, today_seconds, today_date | 비로그인 세션 분석 (1분 주기 upsert, profiles와 동일 구조) |
| `achievements` | id, name, emoji, category, threshold | 업적/캐릭터 정의 (V1: 17개) |
| `user_achievements` | user_id, achievement_id, earned_at, UNIQUE(user_id, achievement_id) | 유저별 획득 업적 = 해금 캐릭터 |
| `voucher_products` | id, name, cost, is_active | 교환 가능 상품 카탈로그 (물 2병/홈런볼/캔커피) |
| `voucher_log` | user_id, delta, reason, product_id, nickname, created_at | 교환권 원장 (append-only). delta>0=지급, delta<0=사용. reason='first_play' 시 UNIQUE INDEX로 중복 방지. nickname: Supabase DB webhook payload에 포함돼 Make.com 알림에 표시 |
| `meeting_votes` | vote_date, user_id, nickname, time_start, time_end, **guest_count**, created_at | 모임 플래너 가능 시간 등록. UNIQUE(vote_date, user_id). time_start/end: 정수(시 단위, 9~23). `guest_count`: 본인 제외 동반 인원(화면 라벨 「동반 인원」)(default 0, CHECK 0~99 — 상한은 오타 방지지 정책 아님). 🚨 **방문 인원 = 1 + guest_count이고 등록 건수와 다르다** — 세는 건 전부 `CottageDB.getPartySize`/`sumPartySize`로만([js-api.md](js-api.md)), `.length`·`Set(user_id).size`로 세면 동반 인원이 사라진다 |
| `meeting_vote_games` | id, vote_date, user_id, list_type (`want`\|`learn`), game_id (nullable), custom_name (nullable), **is_priority** (boolean, default false), **player_condition** (text, default 'any', check: any/best/recommended/2/3/4/5+), created_at | 모임 플래너 날짜별 게임 선호. `meeting_game_prefs`(모임 보드 상시 선호)와 분리. game_id IS NULL일 때 custom_name 사용(직접입력). 🚨 **game_id 표기가 `game_likes`와 다르다 — 그 행의 🚨 참조.** partial unique index 2개로 중복 방지. **마이그레이션 008·009** — is_priority: 대표 게임 플래그(유저당·날짜당 최대 2개, application 강제). player_condition: 인원 조건(2.7·7단계 UI에서 활성). **RLS 비활성화** — Supabase가 테이블 생성 시 자동 활성화했으나 009 마이그레이션에서 명시적 DISABLE 처리. auth.uid() 불가(카카오 OAuth 구조), meeting_votes와 동일하게 UNRESTRICTED 의도적 유지. Edge Function 경유 write 설계 후 별도 마이그레이션(010). |
| `club_meeting_comments` | id, nickname, user_id, content, created_at | 자유 댓글 (club-schedule.html 하단) |
| `club_polls` | id, week_label, question, is_active | ⚠️ UNUSED — 구 week_label 방식 투표 (club-meeting.html 폐기로 미사용) |
| `club_poll_options` | id, poll_id, option_text, sort_order | ⚠️ UNUSED |
| `club_poll_votes` | id, poll_id, option_id, user_id | ⚠️ UNUSED |

---

## Storage

| 버킷 | 경로 패턴 | 용도 |
|------|----------|------|
| `play-photos` | `{userId}/{timestamp}.{ext}` | 플레이 기록 사진 |

---

## RPC 함수

| 함수 | 용도 |
|------|------|
| `get_popular_games(limit_count)` | 최근 30일 조회수 기반 인기 게임 집계 |
| `get_all_game_ratings()` | 전체 게임 별점 평균+건수 집계 |
| `increment_profile_counters(p_user_id, p_secs, p_today, p_bump_visit)` | **profiles 카운터 원자적 증가**(012, #22). `total_minutes` += secs / `today_seconds`는 `today_date`가 다르면 리셋 후 시작 / `p_bump_visit`일 때만 `visit_count` +1 / `last_seen_at` 갱신. **`returns setof profiles`** — 반환이 비면 "그 user_id의 행이 없다"는 뜻이다. 🚨 **UPDATE만 하고 upsert하지 않는다** — 행 생성은 `upsertProfile`의 몫이고, 여기서 만들면 프로필 없는 사용자에게 빈 행이 생겨 회원 수가 부풀려진다 |

📖 **이 세 컬럼을 읽는 곳**(계약을 바꾸기 전 영향 판단용, 2026-07-19 실측): `total_minutes` → 내 보드 「함께한 시간」([kakao-auth.js:1988](../assets/js/kakao-auth.js#L1988)) · 관리자 회원 카드·차트. `visit_count` → **업적 `visit` 축**([supabase-client.js:1184](../assets/js/supabase-client.js#L1184)) — **업적과 연결된 건 여기뿐이고 `total_minutes`는 업적이 아예 안 읽는다.** 보관용 복구 스크립트(`recover-time-data.js`·`recover-visit-count.js`)도 이 컬럼을 만지므로 계약이 바뀌면 같이 낡는다.

🚨 **`profiles`의 `total_minutes`/`today_seconds`/`visit_count`는 클라이언트에서 직접 `update`하지 말 것** — 반드시 위 RPC를 쓴다. `select` → 계산 → `update`로 쓰면 탭이 겹칠 때 증가분이 사라진다(실측: 동시성 2에서 33% 손실). 상세는 [admin-analytics.md](admin-analytics.md) §4 #22.
⚠️ **`anon_sessions`는 아직 옛 방식이다**(`_startAnonHeartbeat`) — 같은 병이 남아 있으며 별도 항목으로 열려 있다.

---

## photo_url 저장 형식

- 단일 사진: `"https://...url"` (일반 문자열)
- 복수 사진: `'["https://...url1","https://...url2"]'` (JSON 배열 문자열)
- 구분: `parsePhotoUrls(raw)` 헬퍼로 통일 파싱

---

## referrer 저장 형식

- `page_views.referrer`: utm_source 값 또는 외부 도메인 hostname 저장 (예: `"kakao"`, `"naver.com"`)
  - 방문자 수/경로 집계 기준 (관리자 방문경로 도넛 차트)
  - 동일 도메인 방문·직접 접속은 `null` → '직접 방문'으로 분류
  - 관리자 분석에서 유입 `명` 집계는 `__visitor__` 행의 `user_id || session_key` 기준. `page_sessions`와 섞지 않음
- `page_sessions.referrer`: **`page_views.referrer`와 같은 형식**(2026-07-21 #28로 통일). 저장 경로
  둘(`script-nav.js` 세션 트래커 / `supabase-client.js`)이 `window.COTTAGE_SESSION_REF` **한 규칙**을
  공유한다 — utm_source > 외부 호스트 > 당일 last-touch > `null`. 규칙 본문은 [js-api.md](js-api.md).
  - 🚨 **2026-07-21 이전 행 8,382건은 형식이 다르다** — 트래커가 자체 규칙으로 **내부 라벨**
    (`'메인'`)이나 **호스트를 버린 pathname**(`/pages/info/guide.html`)을 넣었다. **소급 UPDATE는
    하지 않았다**(원래 유입 소스를 복원할 방법이 없다 — `page` 컬럼의 #14와 달리 읽기 정규화로도
    못 되살린다). 대신 **읽는 쪽이 「귀속 불가」로 따로 세고 화면에 건수를 표기**한다
    (`requests-admin.html`의 `refSecMap` 루프). 검증은 `scripts/verify-referrer.js`.
  - ⚠️ **`categorizeRef` 결과에 `|| '직접 방문'` 폴백을 걸지 말 것** — `page_sessions`를 모집단으로
    쓰는 자리에서 그러면 옛 행이 **진짜 직접 방문으로 위조**된다(272.1h ↔ 실제 32.3h).
    `page_views` 모집단(유입 명/회·교차분석)은 처음부터 올바른 규칙이라 해당 없음.

## `page_sessions.page` 저장 형식

**슬러그 하나로 저장한다** (예: `index`, `game-reviews`). 규칙은 `page-labels.js`의
`window.COTTAGE_PAGE_SLUG(pathname)`이 SSOT이고, 저장 경로 둘(`script-nav.js` 세션 트래커 /
`supabase-client.js` `_startAnonHeartbeat`)이 **같은 함수**를 쓴다.

🚨 **표시 라벨을 저장하지 말 것** (#14, 2026-07-20 수정) — 2026-07-20 이전엔 트래커가 한글
라벨을 넣어서, **라벨을 개명할 때마다 같은 페이지가 새 버킷으로 쪼개졌다.** 실측 결과 11,777행이
**42종 값**으로 흩어져 있었고 그중 14종이 중복 버킷이었다(`메인` 2,914 ↔ `index` 999 등).
과거 행은 그대로 남아 있으므로 **읽는 쪽(`requests-admin.html`의 `normalizePageKey`)이 접는다** —
그 별칭표에서 한글 키를 지우면 과거 행이 다시 독립 버킷으로 튀어나온다.
