# localStorage 스키마 — 코티지보드

최종 갱신: 2026-06-12

---

## 현재 키 목록

| 키 패턴 | 저장 위치 | 내용 | 생명주기 |
|---------|----------|------|----------|
| `kakao_user` | kakao-auth.js, auth-callback.html | 유저 객체 `{ id, nickname, kakaoNickname, profileImage, kakaoProfileImage }` | 로그아웃 시 삭제 |
| `cottage_custom_nick_{userId}` | kakao-auth.js, auth-callback.html | 커스텀 닉네임 | 영구 |
| `cottage_custom_photo_{userId}` | kakao-auth.js, auth-callback.html | 커스텀 프로필 사진 (base64 또는 preset URL) | 영구 |
| `cottage_sess_{userId}` | supabase-client.js, kakao-auth.js | 세션 통합 JSON 객체 (아래 상세) | 영구 |
| `cottage_visited_{date}` | supabase-client.js | 당일 page_views 기록 여부 (하루 1회 중복 방지) | 날짜별 갱신 |
| `cottage_session_id` | supabase-client.js | 비로그인 세션 ID (별점 중복 방지, anon_sessions 연동) | 영구 |
| `cottage_rated_{gameId}` | supabase-client.js | 게임별 별점 캐시 | 영구 |
| `cottage_my_comments` | script.js | 내 코멘트 id 배열 (삭제 권한 확인용) | 영구 |
| `cottage_play_records_{gameKey}` | script.js | 바텀시트용 로컬 플레이 기록 | 영구 |
| `cottage_played_{gameKey}` | script.js | 구형 단일 포맷 (마이그레이션 완료, 신규 저장 없음) | 레거시 |

---

## cottage_sess_{userId} 상세

`window._cottageSess.get/set(uid)`으로 접근. 단일 JSON 객체.

```json
{
  "lastVisitDate":  "2026-06-12",
  "prevVisitDate":  "2026-06-11",
  "lastSeenDt":     "2026-06-12T10:30:00.000Z",
  "prevSeenDt":     "2026-06-11T20:00:00.000Z",
  "timeSec":        0,
  "visitCount":     5
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `lastVisitDate` | string (YYYY-MM-DD, KST) | 마지막 방문 날짜. 당일 중복 방문 방지에 사용 |
| `prevVisitDate` | string | 이전 방문 날짜. 내 활동 패널 "이전 방문" 표시 |
| `lastSeenDt` | string (ISO) | 마지막 세션 시작 시각 |
| `prevSeenDt` | string (ISO) | 이전 세션 시작 시각 |
| `timeSec` | number | DB 미반영 누적 체류 시간(초). DB upsert 성공 시 0으로 초기화 |
| `visitCount` | number | 총 방문 횟수 (로컬 카운터, DB 동기화는 upsertProfile에서) |

### 마이그레이션

`cottage_sess_{uid}` 키가 없으면 `_migrate(uid)` 자동 실행:
- 레거시 키 6개(`cottage_last_visit_date_*`, `cottage_prev_visit_date_*`, `cottage_last_seen_dt_*`, `cottage_prev_seen_dt_*`, `cottage_time_sec_*`, `cottage_visit_count_*`) 읽어 새 형식으로 통합 후 원본 삭제
- `cottage_profile_visited_{uid}_*` 키도 읽어 lastVisitDate 설정 후 삭제

