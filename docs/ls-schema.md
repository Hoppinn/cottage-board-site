# localStorage 스키마 — 코티지보드

최종 갱신: 2026-07-15 (sessionStorage `cottage_pending_join` 제거 — Stage 3 확인창 개편으로 핸드오프 폐기)

---

## 현재 키 목록

| 키 패턴 | 저장 위치 | 내용 | 생명주기 |
|---------|----------|------|----------|
| `kakao_user` | kakao-auth.js, auth-callback.html | 유저 객체 `{ id, nickname, kakaoNickname, profileImage, kakaoProfileImage }` | 로그아웃 시 삭제 |
| `cottage_custom_nick_{userId}` | kakao-auth.js, auth-callback.html | 커스텀 닉네임 | 영구 |
| `cottage_custom_photo_{userId}` | kakao-auth.js, auth-callback.html | 커스텀 프로필 사진 (base64 또는 preset URL) | 영구 |
| `cottage_sess_{userId}` | supabase-client.js, kakao-auth.js | 세션 통합 JSON 객체 (아래 상세) | 영구 |
| `cottage_visited_{date}` | supabase-client.js | 당일 page_views 기록 여부 (하루 1회 중복 방지) | 날짜별 갱신 |
| `cottage_orig_src_{date}` | supabase-client.js | 당일 마지막 외부 유입 소스 (last-touch 모델, 내부 이동 시 채널 귀속에 사용) | 날짜별 갱신, 외부 유입 감지 시 덮어씀 |
| `cottage_pv_{date}_{source}_{page}` | supabase-client.js | 날짜+source+page 기준 page_views dedup 플래그 | 날짜별 갱신 |
| `cottage_session_id` | supabase-client.js | 비로그인 세션 ID (별점 중복 방지, anon_sessions·page_sessions·page_views.session_key 연동). 143차-190부터 trackPageView()가 이 값을 page_views.session_key에도 저장 — 같은 기기+브라우저+localStorage 유지 시 같은 비회원으로 집계됨 | 영구 |
| `cottage_rated_{gameId}` | supabase-client.js | 게임별 별점 캐시 | 영구 |
| `cottage_my_comments` | game-sheet.js | 내 코멘트 id 배열 (삭제 권한 확인용) | 영구 |
| `cottage_my_intros` | club-intro.html | 내가 작성한 회원 자기소개 id 배열 (레거시/삭제 권한 보조) | 영구 |
| `cottage_my_game_reqs` | requests.html | 내가 등록한 게임 요청 id 배열 (삭제/표시 보조) | 영구 |
| `cottage_my_snack_reqs` | requests.html | 내가 등록한 간식 요청 id 배열 (삭제/표시 보조) | 영구 |
| `cottage_req_votes_{userId}` | requests.html | 게임 요청 투표 id 배열 | 영구 |
| `cottage_req_removed_{userId}` | requests.html | 취소/숨김 처리한 게임 요청 id 배열 | 영구 |
| `cottage_snack_votes_{userId}` | requests.html | 간식 요청 투표 id 배열 | 영구 |
| `cottage_play_records_{gameKey}` | game-sheet.js | 바텀시트용 로컬 플레이 기록 | 영구 |
| `cottage_played_{gameKey}` | game-sheet.js | 구형 단일 포맷 (마이그레이션 완료, 신규 저장 없음) | 레거시 |
| `cottage_is_admin` | requests-admin.html | 관리자 페이지 로드 시 set. supabase-client.js의 page_views/__visitor__ 기록에서 admin 세션 필터링에 사용 | 영구 |
| `cottage_hidden_time_presets_{userId}` | club-schedule.html | 참여 시간 등록 시 더 이상 안 볼 "내 자주 쓰는 시간" 프리셋의 `"s-e"` 문자열 배열(2026-08-02). DB의 실제 과거 참여 기록은 안 건드리고 프리셋 후보 계산에서만 제외 | 영구 |
| `cottage_hidden_past_games_{userId}` | club-schedule.html | 게임 선택창 "지난 모임" 피커에서 ✕로 지운 게임의 `"{want\|learn}:id:{bggId}"`/`"{want\|learn}:nm:{커스텀이름}"` 문자열 배열(2026-08-09). 위 시간 프리셋과 같은 패턴 — DB의 실제 과거 투표 기록은 안 지우고 `fetchPastVoteGames` 후보 계산에서만 제외 | 영구 |

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
  "visitCount":     5,
  "notifSeenAt":    "2026-06-12T10:30:00.000Z",
  "achSeenAt":      "2026-07-27T10:30:00.000Z"
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
| `notifSeenAt` | string (ISO) \| undefined | 마지막으로 알림 패널을 열었던 시각. 이 이후 이벤트가 "새 알림". 없으면 전체 기간 조회 |
| `newGameSeenAt` | string (ISO) \| undefined | [모두 확인] 클릭 시점. 이 이후 added_at인 게임이 new_game 알림으로 표시. 없으면 전체 기간 조회 |
| `voucherNoticeSeen` | boolean \| undefined | 음료교환권 공지 확인 여부. 미설정 또는 false이면 공지 표시 + 빨간점. [확인했어요] 또는 [플레이 기록 남기기] 클릭 시 true 저장 |
| `feeNoticeSeen` | boolean \| undefined | 전체 공지(요금 안내 변경) 확인 여부. `voucherNoticeSeen`과 **별도 키** — 하나를 읽어도 다른 하나는 NEW로 남아야 한다. [확인했어요] 또는 [모두 읽기] 시 true. ⚠️ 공지 카드는 `kakao-auth.js`의 `FEE_NOTICE.until`이 지나면 이 키와 무관하게 렌더 자체를 건너뛴다 |
| `achSeenAt` | string (ISO) \| undefined | 수집 보드(업적/캐릭터/칭호) 마지막 열람 시각(2026-07-27). `user_achievements.earned_at`이 이 값보다 최신이면 `.is-newly-earned` 표시. **`notifSeenAt`과 반대로 "없으면 전체 조회"가 아니다** — 없으면 아무것도 NEW로 안 켜고 그 자리에서 지금 시각으로만 세팅한다(기존 유저가 이 기능 배포 직후 과거 업적 전부가 NEW로 뜨는 걸 막기 위해). 매 열람마다 즉시 지금 시각으로 덮어써 "그 다음 열람부턴 꺼짐"을 만든다(readOnly 열람은 항상 null → 표시 안 함). |

### 마이그레이션

`cottage_sess_{uid}` 키가 없으면 `_migrate(uid)` 자동 실행:
- 레거시 키 6개(`cottage_last_visit_date_*`, `cottage_prev_visit_date_*`, `cottage_last_seen_dt_*`, `cottage_prev_seen_dt_*`, `cottage_time_sec_*`, `cottage_visit_count_*`) 읽어 새 형식으로 통합 후 원본 삭제
- `cottage_profile_visited_{uid}_*` 키도 읽어 lastVisitDate 설정 후 삭제
