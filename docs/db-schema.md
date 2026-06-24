# DB 스키마 — 코티지보드

최종 갱신: 2026-06-22 (141차: meeting_votes 추가, club_polls unused 표기. 136차: anon_sessions 컬럼 정정, page_sessions session_key 추가, game_requests 컬럼 보완)

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
| `page_views` | page, created_at, referrer | 페이지 방문 (referrer: utm_source 또는 외부 도메인 hostname) |
| `page_events` | event_type, game_id, referrer, created_at | 기능 이벤트 (recommend_run, recommend_game_click). referrer: 세션 귀속 소스 |
| `page_sessions` | page, referrer, user_id, session_key, duration_sec, entered_at | 세션 분석 |
| `profiles` | user_id, nickname, real_name, last_seen_at, visit_count, total_minutes, is_banned, photo_url, today_seconds, today_date, rep_achievement_id, rep_title_id, first_source, bio (text), avoid_tags (text[]), notif_seen_at (timestamptz) | 유저 프로필. bio: 한줄소개, avoid_tags: 피하는 유형 태그 배열, notif_seen_at: 알림 마지막 읽은 시각 (기기 간 동기화용) |
| `game_requests` | game_name, request_count, status, is_planned, user_id, purchase_status, status_date, purchased_at, actual_games, added_at | 게임 요청 |
| `snack_requests` | item_name, request_count, user_id | 간식 요청 |
| `suggestions` | content, user_id, is_done, is_planned | 건의사항 |
| `play_highlights` | game_id, highlight_text | 플레이 하이라이트 |
| `game_request_votes` | request_id, user_id | 요청 투표 |
| `member_intros` | id, user_id, nickname, favorite_games, available, location, card_color, created_at | 멤버 소개 |
| `anon_sessions` | session_key, first_seen_at, last_seen_at, visit_count, today_seconds, today_date | 비로그인 세션 분석 (1분 주기 upsert, profiles와 동일 구조) |
| `achievements` | id, name, emoji, category, threshold | 업적/캐릭터 정의 (V1: 17개) |
| `user_achievements` | user_id, achievement_id, earned_at, UNIQUE(user_id, achievement_id) | 유저별 획득 업적 = 해금 캐릭터 |
| `voucher_products` | id, name, cost, is_active | 교환 가능 상품 카탈로그 (물 2병/홈런볼/캔커피) |
| `voucher_log` | user_id, delta, reason, product_id, created_at | 교환권 원장 (append-only). delta>0=지급, delta<0=사용. reason='first_play' 시 UNIQUE INDEX로 중복 방지 |
| `meeting_votes` | vote_date, user_id, nickname, time_start, time_end, created_at | 모임 플래너 가능 시간 등록. UNIQUE(vote_date, user_id). time_start/end: 정수(시 단위, 9~23) |
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
- `page_sessions.referrer`: 동일 형식, 세션 분석 전용 (방문경로 집계에는 미사용)
