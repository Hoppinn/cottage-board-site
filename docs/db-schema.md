# DB 스키마 — 코티지보드

최종 갱신: 2026-06-12

---

## 테이블 목록

| 테이블 | 주요 컬럼 | 용도 |
|--------|----------|------|
| `game_views` | game_id, created_at | 조회수 트래킹 |
| `game_ratings` | game_id, rating, session_key | 별점 |
| `game_likes` | game_id, user_id | 따봉 |
| `game_curious` | game_id, user_id | 궁금해요 |
| `game_comments` | game_key, comment_text, nickname, user_id | 코멘트 |
| `game_reviews` | game_id, content, nickname, user_id | 리뷰 |
| `game_play_records` | game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text | 플레이 기록 |
| `page_views` | page, created_at | 페이지 방문 |
| `page_sessions` | page, referrer, user_id, duration_sec, entered_at | 세션 분석 |
| `profiles` | user_id, nickname, real_name, last_seen_at, visit_count, total_minutes, is_banned, photo_url, today_seconds, today_date | 유저 프로필 |
| `game_requests` | game_name, request_count, status, is_planned, user_id | 게임 요청 |
| `snack_requests` | item_name, request_count, user_id | 간식 요청 |
| `suggestions` | content, user_id, is_done, is_planned | 건의사항 |
| `play_highlights` | game_id, highlight_text | 플레이 하이라이트 |
| `game_request_votes` | request_id, user_id | 요청 투표 |
| `member_intros` | user_id, nickname | 멤버 소개 |
| `anon_sessions` | session_key, entered_at, duration_sec | 비로그인 세션 분석 |

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

- `page_sessions.referrer`: 외부 도메인 hostname만 저장 (예: `"carrot.me"`, `"naver.com"`)
- 동일 도메인 방문은 `null`
- 직접 접속(referrer 없음)은 `null`
