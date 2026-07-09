# DB 스키마 — 코티지보드

최종 갱신: 2026-07-08 (009: meeting_vote_games is_priority·player_condition 컬럼 추가; RLS 미적용 사유 명기)

---

## 테이블 목록

| 테이블 | 주요 컬럼 | 용도 |
|--------|----------|------|
| `game_views` | game_id, created_at | 조회수 트래킹 |
| `game_ratings` | game_id, rating, session_key | 별점 |
| `game_likes` | game_id (nullable), user_id, custom_name (nullable text) | 따봉. custom_name은 직접입력 게임명 (game_id IS NULL일 때 사용) |
| `game_curious` | game_id (nullable), user_id, custom_name (nullable text) | 궁금해요. 동일 구조 |
| `game_comments` | game_key, comment_text, nickname, user_id | 코멘트 |
| `game_reviews` | game_id, content, nickname, user_id | 리뷰 |
| `game_play_records` | game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text | 플레이 기록 |
| `page_views` | page, created_at, referrer, is_bot (boolean, default false), user_id (text, nullable), session_key (text, nullable) | 페이지 방문 (referrer: utm_source 또는 외부 도메인 hostname). is_bot/user_id는 143차-178부터 추가 — `__visitor__` 마커 삽입 시점에 navigator.userAgent로 알려진 크롤러 패턴 매칭 시 is_bot=true, 로그인 상태면 user_id 채움(회원/비회원 구분용). session_key는 143차-190부터 추가 — `trackPageView()`가 `cottage_session_id` 값을 함께 저장. **과거 행은 session_key=NULL이며 소급 보정하지 않음** |
| `page_events` | event_type, game_id, referrer, session_key, user_id, created_at | 기능 이벤트. referrer: 세션 귀속 소스. session_key/user_id는 143차-160(2026-06-30)에 추가 — **그 이전 행은 NULL이라 unique 집계는 추가 시점 이후 데이터부터만 정확**. 이벤트 타입 목록: hero_recommend_click, recommend_start, recommend_complete, hero_record_click, record_start, record_complete, signup_complete, home_recommend_game_detail_click, home_recommend_all_click, home_recommend_main_click, recommend_run, home_record_main_click, home_record_write_click, home_record_more_click, home_meeting_main_click, home_meeting_planner_click, home_meeting_date_preview_click(홈 날짜 칩 클릭), home_meeting_preview_card_click(홈 미리보기 카드→날짜집계모달), meeting_planner_bar_click(플래너 막대→개인일정모달), meeting_profile_click(플래너 주간뷰 닉네임 클릭), home_meeting_week_nav(홈 미리보기 ◀▶ 주 이동 — event_type만 저장, direction/offset 페이로드는 현재 trackEvent가 game_id 외 opts 미처리로 버려짐), roulette_spin(날짜집계모달 룰렛 결과 확정 — game_id: COTTAGE_GAMES 소속이면 bggId, 직접입력·커스텀이면 null) |
| `page_sessions` | page, referrer, user_id, session_key, duration_sec, entered_at | 세션 분석 |
| `profiles` | user_id, nickname, real_name, last_seen_at, visit_count, total_minutes, is_banned, photo_url, today_seconds, today_date, rep_achievement_id, rep_title_id, first_source, bio (text), avoid_tags (text[]), notif_seen_at (timestamptz) | 유저 프로필. **bio: 한줄소개 SSOT** — 취향보드/회원 자기소개(club-intro.html)/모임 보드 3곳이 동일 컬럼을 공유 읽기·쓰기(`updateUserBio`). 한쪽에서 수정하면 나머지에도 즉시 반영됨(의도된 동작). avoid_tags: 피하는 유형 태그 배열, notif_seen_at: 알림 마지막 읽은 시각 (기기 간 동기화용) |
| `game_requests` | game_name, request_count, status, is_planned, user_id, purchase_status, status_date, purchased_at, actual_games, added_at | 게임 요청 |
| `snack_requests` | item_name, request_count, user_id | 간식 요청 |
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
| `meeting_votes` | vote_date, user_id, nickname, time_start, time_end, created_at | 모임 플래너 가능 시간 등록. UNIQUE(vote_date, user_id). time_start/end: 정수(시 단위, 9~23) |
| `meeting_vote_games` | id, vote_date, user_id, list_type (`want`\|`learn`), game_id (nullable), custom_name (nullable), **is_priority** (boolean, default false), **player_condition** (text, default 'any', check: any/best/recommended/2/3/4/5+), created_at | 모임 플래너 날짜별 게임 선호. `meeting_game_prefs`(모임 보드 상시 선호)와 분리. game_id IS NULL일 때 custom_name 사용(직접입력). partial unique index 2개로 중복 방지. **마이그레이션 008·009** — is_priority: 대표 게임 플래그(유저당·날짜당 최대 2개, application 강제). player_condition: 인원 조건(2.7·7단계 UI에서 활성). **RLS 비활성화** — Supabase가 테이블 생성 시 자동 활성화했으나 009 마이그레이션에서 명시적 DISABLE 처리. auth.uid() 불가(카카오 OAuth 구조), meeting_votes와 동일하게 UNRESTRICTED 의도적 유지. Edge Function 경유 write 설계 후 별도 마이그레이션(010). |
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
- `page_sessions.referrer`: 동일 형식, 세션 분석 전용 (방문경로 집계에는 미사용)
