# JS API 레퍼런스 — 코티지보드

최종 갱신: 2026-07-18 (문서-코드 참조 정합성 감사 — CottageDB·getKakaoUser 소비처의 script-nav.js 오기재 정정)

---

## window.CottageDB (supabase-client.js)

### ⚠️ 에러 처리 규약 (2026-07-17 신설 — 신규 DB 함수 작성 시 필독)

**supabase-js는 쿼리가 실패해도 예외를 던지지 않는다.** `{ data: null, error }`를 반환할 뿐이다(실측 확인: 없는 컬럼/없는 테이블 조회 시 예외 0, `error.message`에 사유). 결과적으로:

```js
// ❌ 사각지대 — 컬럼 오타·RLS 차단·테이블 없음이 전부 "데이터 없음"으로 둔갑
const { data } = await db.from('profiles').select('avoid_tags');
return data || [];          // → [] 반환, try/catch도 console.error도 안 울림

// ✅ error를 받아서 확인해야 함
const { data, error } = await db.from('profiles').select('avoid_tags');
if (error) console.error('[getAllAvoidTagSuggestions]', error);
return data || [];
```

- `try/catch` + `console.error`는 **네트워크 장애·JS 예외만** 잡는다. 쿼리 오류는 못 잡는다.
- **가장 흔한 실패(컬럼 오타·RLS·테이블 없음)가 정확히 쿼리 오류**라 이 구분이 결정적이다.
- 반환 계약(실패 시 `[]`/`null` fallback)은 **유지**한다 — 호출부가 빈 배열을 전제로 렌더 중이라 에러를 던지게 바꾸면 UI가 깨진다. 바꾸는 건 로그(관측)이지 동작이 아니다.
- **현황(2026-07-17)**: `supabase-client.js`의 `await` **구조분해** 104곳은 전부 error를 받아 로그한다(2단계에서 59곳 추가). 신규 DB 함수도 이 규약을 지킬 것.
  - 🔴 **단 "구조분해 104곳 = 전부"가 아니다 (2026-07-17 R10b에서 정정)**: **`const [aRes, bRes] = await Promise.all([...])` 후 `aRes.data`만 읽는 형태**는 구조분해가 아니라서 2단계 대상에서 통째로 빠졌다. 이 자리들은 `.error`를 아무도 안 봐 **쿼리 오류가 여전히 조용히 빈 값**이 된다. 실측(`Res.error` grep = **0건**): `getMyStats`·`getMyNotifications`·`getVisitorStats` 등 **~16곳**. `getMeetingProfile`(2곳)만 R10b가 선처리(507f2e9). → PROJECT_STATE §3 「감지기 갭 — Promise.all + 비구조분해」.
  - ⚠️ **그래서 점검은 `} = await`로도 부족하다** — **`.data`/`.count` 참조 전수**로 세야 한다. "위반 N곳" 숫자가 좁은 grep 때문에 틀린 게 이번이 **세 번째**다(1단계 40곳 오집계 → 2단계 `{count}`·별칭형 누락 → R10b `Promise.all` 계열 누락).
  - ⚠️ **대상은 `{ data }`만이 아니다**: 2단계 실측에서 `{ data }` 39곳 외에 **`{ count }` 7곳**(getUserPlayCount·getUserRatingCount 등 카운트 함수 전부)과 **별칭형 `{ data: existing/rows/product… }` 13곳**이 같은 사각지대였다. 이전 기재 "40곳"은 `const { data } = await db.`만 센 좁은 grep 결과였음.
  - **이름 충돌 주의**: 같은 블록에 이미 `const { error }`가 있거나 한 함수에서 두 번 조회하면 `error`를 그대로 추가하면 **재선언 SyntaxError**다. 파일 관용대로 `error: <이름>Err` 별칭을 쓴다(현재 10곳: `rowsErr`·`profsErr`·`existErr`·`productErr` 등).
  - **로그 여부의 기준은 "고칠 게 있는가"** — 조용한 실패(화재를 못 봄)와 정상 경로 로그(가짜 경보가 진짜를 가림)는 **같은 원칙의 양쪽 위반**이다. `getUserPhotoCount`의 안쪽 `JSON.parse` catch처럼 실패가 정상 분기인 곳엔 로그 대신 주석을 단다(1단계가 기계적으로 붙여 실제로 가짜 에러 발생). 상세는 CLAUDE.md 「DB 함수 에러 처리」.
  - **쓰기 경로(2026-07-18 4단계 종결)**: insert/update/delete/upsert도 전수 확인 완료. 대부분 `return {error}`로 호출부에 전파(record/comment/pref/meeting 계열)라 이 계층에선 갭 없음. 갭은 **추적성 write**(trackView·trackEvent·anon_sessions·page_sessions fire-and-forget)·**toggle**(like/curious가 SELECT 에러만 로그하고 쓰기 에러 삼킴)·**업적/교환권 지급 family**에 있었고 전부 로그 추가로 닫음(커밋 c5b5f68 외). ⚠️ 업적/교환권 **지급 함수는 UNIQUE 위반(이미 달성/중복 지급 방어)이 정상 경로**라 `if (error.code !== '23505') console.error(...)`로 진짜 실패만 로그 — 여기에 무조건 로그를 달면 정상 중복마다 가짜 경보(늑대소년). `23505`는 파일 관용 상수(`addMeetingVoteGame`도 사용).

| 함수 | 용도 |
|------|------|
| `trackView(gameId)` | 게임 조회수 기록 |
| `trackPageView(page, referrer = null, extra = {})` | 페이지 뷰 기록 (하루 1회). referrer: utm_source 또는 외부 hostname — page_views.referrer에 저장. extra: `{is_bot, user_id}` 등 추가 컬럼 병합. 143차-190부터 기본 payload에 `session_key: getSessionKey()`를 포함(extra로 session_key 전달 시 override). localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID)는 자동 제외 |
| `trackEvent(eventType, opts = {})` | 이벤트 기록 — page_events 테이블 insert. localhost/127.0.0.1 및 관리자 자동 제외, referrer는 `cottage_orig_src_{date}`에서 자동 읽음. session_key(getSessionKey())/user_id(_sessionUserId)도 함께 저장(143차-160). opts: `{ game_id? }` |
| `getGameRating(gameId)` | 별점 평균+건수 조회 |
| `submitRating(gameId, rating)` | 별점 제출 |
| `getMyRating(gameId)` | 내 별점 (localStorage) |
| `getPopularGames(limit)` | 인기 게임 (RPC) |
| `getAllGameRatings()` | 전체 게임 별점 요약 (RPC) |
| `uploadPlayPhoto(file, userId)` | 사진 Storage 업로드 |
| `getGameOverride(gameKey)` | `game_overrides`(019) 단건 조회 — 게임정리 사진 URL 배열 + 룰설명. 없으면 `null` |
| `upsertGameOverride(gameKey, {organizerPhotoUrls, ruleNote})` | 게임정리·룰설명 저장(관리자 전용 UI에서만 호출, DB 레벨 게이트 없음) |
| `uploadOrganizerPhoto(file, gameKey)` | 게임정리 사진 Storage 업로드(`organizer-photos` 버킷), `uploadPlayPhoto`와 동일 구조 |
| `recordGamePlay(...)` | 플레이 기록 저장 |
| `deleteGamePlay(id)` | 플레이 기록 삭제 |
| `updateGamePlay(id, fields)` | 플레이 기록 수정. 성공 시 `record`/`play`/`balance` 업적 재체크(2026-07-15 추가 — 신규 등록만 체크하고 수정은 안 해서 사진 후추가 등으로 임계값을 채워도 다음 신규 등록 전까지 지급 안 되던 버그 수정) |
| `getGamePlayRecords(gameId, limit)` | 게임 플레이 기록 조회. `gameId`는 단일 값 또는 배열 (배열 시 `.in()` 쿼리) |
| `getGroupNames()` | 그룹명 목록 조회 |
| `getPlayerNames()` | 참여자 이름 목록 조회 (조합+개별) |
| `getAllPlayRecordsForHistory(limit)` | 모임별 기록 전체 조회 |
| `getAllPlayRecordsForHub(limit)` | 기록 허브 전체 조회(기본 200). **반환 순서는 `playRecordSortDate` 기준 내림차순이 보장된다** — DB 정렬만으로는 `played_at NULL`이 선두를 점유하므로 반환 전 재정렬한다 |
| `playRecordSortDate(rec)` | 기록의 정렬·표시 기준 날짜 = `played_at ?? created_at의 날짜부분`. 🚨 **플레이기록을 날짜순으로 다룰 땐 반드시 이걸 쓴다** — `played_at`은 NULL일 수 있고(2026-07-21 실측 70행 중 8건), Postgres는 `DESC`에서 NULL을 **맨 앞**에 둔다. 각자 폴백을 재구현하면 화면마다 다른 「최신」이 나온다 |
| `getGamePlayCount(gameId)` | 게임 플레이 건수. `gameId` 배열 지원 |
| `getPlayHighlights(gameId)` | 플레이 하이라이트. `gameId` 배열 지원 |
| `getPlayReviewsByGame(gameId, limit)` | game_play_records에서 review_text IS NOT NULL인 기록. `gameId` 배열 지원 |
| `getGameComments(gameKey)` | 게임 코멘트 조회. select에 `record_id` 포함(014) |
| `getRecordComments(recordIds)` | (014) 특정 플레이기록들에 매인 게임평 조회. `record_id IN (...)` 배치. `buildSessionBody`가 화면 기록 id로 한 번에 로드해 기록 아래 렌더 |
| `insertComment(gameKey, text, nickname, userId, recordId?)` | 코멘트 등록. `recordId` 있으면(⋯메뉴로 특정 기록에 게임평 첨부, 014) `game_comments.record_id`에 저장 → 그 기록 아래 표시 |
| `deleteComment(id)` | 코멘트 삭제 |
| `updateComment(id, text)` | 코멘트 수정 |
| `getGameLikeCount(gameId)` | 따봉 수 조회 |
| `toggleGameLike(gameId, userId)` | 따봉 토글 |
| `hasUserLiked(gameId, userId)` | 따봉 여부 확인 |
| `getGameCuriousCount(gameId)` | 궁금해요 수 조회 |
| `toggleGameCurious(gameId, userId)` | 궁금해요 토글 → `{ curious: true/false }` |
| `hasUserCurious(gameId, userId)` | 궁금해요 여부 확인 |
| `getVisitorStats()` | 방문자 통계 |
| `startSession(userId)` | 체류 세션 시작. page_sessions.referrer = URL의 `utm_source` 우선, 없으면 `document.referrer` hostname |
| `upsertProfile(userId, nickname, realName, visitCount)` | 프로필 upsert + 방문 카운트 + 시간 반영. **2왕복이다** — ①upsert(닉네임 보호·`real_name`·`photo_url`·`first_source`, SELECT가 필요해 RPC로 못 옮김) ②`increment_profile_counters` RPC로 숫자 카운터 증가(012, #22). ⚠️ **`visitCount` 인자는 이제 플래그로만 쓴다** — `undefined`면 방문을 올리지 않고, 값을 줘도 그 숫자는 무시된다(실제 증가는 DB에서 원자적으로 `+1`). 예전엔 SELECT 실패 시 이 값을 fallback으로 썼으나 RPC가 DB 기준으로 올리므로 불필요해졌다. 업적 `visit` 축에 넘기는 카운트도 RPC 반환값에서 온다 |
| `getAllProfiles()` | 전체 프로필. 어드민 회원목록 + **nickname→user_id 해석**(game-reviews 허브 `_profileNickMap`·index-page 홈 최근 플레이 참여자 이름 클릭). ⚠️ 반환 행의 kakao 키는 **`user_id`**(profiles엔 `id` 컬럼 없음) |
| `checkNicknameAvailable(nickname, userId)` | 닉네임 중복 확인 |
| `getPageAnalytics()` | 페이지 분석 (어드민용) — 전체 `page_sessions` 90일(≤2만행) |
| `getUserPageSessions(userId, daysBack=90)` | **한 회원**의 `page_sessions` 필터 조회 (P4 보드 오너 섹션). `page`는 **정규화 전 원문** → 소비처가 `MemberAnalytics.normalizePageKey`로 접는다(#14). 전원치를 보드마다 받는 낭비 회피 |
| `getUserEvents(userId, daysBack=90)` | **한 회원**의 `page_events` 필터 조회 (P4). `[{event_type, created_at, user_id, session_key}]` |
| `getProfileUsage(userId)` | **한 회원**의 이용 누적 `{visit_count, total_minutes, today_seconds, today_date, last_seen_at, first_seen_at}` (P4 「이용 요약」 — 누적·방문은 R3대로 profiles가 정본). `getAllProfiles(*, 전원)`을 안 부른다 |
| `getEventCounts(eventTypes[], daysBack=7)` | page_events에서 지정 이벤트 타입들의 최근 N일 로우 반환 **`[{event_type, created_at, user_id, session_key}]`**. admin/localhost 제외 없음(쿼리 전용). 소비처: `index-page.js`(히어로 통계 — `event_type`/`created_at`만 읽음)·`requests-admin.html`(요약 계열 카드 + 이벤트 퍼널) |
| ↳ **식별자 2개 추가 (2026-07-19)** | "몇 건"뿐 아니라 **"몇 명"**을 세기 위함 — 한 사람이 여러 번 누르므로 건수만으론 과대평가된다(실측: 홈 모임 날짜칩 **443회 = 38명**, 평균 11.7회). 사람 식별은 **`user_id \|\| session_key`** 순, 둘 다 없는 행(전체의 3%)은 명 집계에서 제외. **가산적 변경이라 기존 소비처 무영향**. ⚠️ `session_key`는 **2026-07부터 100%**, 그 이전(06월)은 **8%**뿐이라 오래된 구간의 명 집계는 과소집계됨(건수는 무관) |
| `getPageViewCounts(page, daysBack=7)` | page_views에서 특정 page의 최근 N일 로우 반환 `[{created_at}]`. ⚠️ **2026-07-19 기준 소비처 0건** — 관리자 퍼널의 "메인 방문" 단계용으로 만들었으나 그 단계를 그리는 코드가 없어 결과를 아무도 읽지 않았고, 헛도는 왕복이라 호출을 제거했다([PLAN_funnel_analytics.md](PLAN_funnel_analytics.md) 정정 참조). 함수 자체는 보존 |
| `getMyStats(userId, nickname)` | 내 활동 통계 |
| `getMyNotifications(userId, nickname, notifSeenAt, newGameSeenAt)` | 최근 알림 목록 반환. ①태그된 기록(최근20) ②궁금해요 게임 코멘트(최근20) ③구매완료(최근10) ④new_game(newGameSeenAt 이후 추가된 게임) ⑤new_intro(타인 소개글, 로그인 회원 전체 수신, `{type:'new_intro', count, names, firstUserId, date, isNew}`) ⑥snack_done(내 간식·음료 요청 처리완료, 최근10 — `snack_requests.is_done`/`done_at`, 요청자 본인 전용, 015). notifSeenAt=null이면 지평선 없음(전체 기간). 반환: `[{type, key, keys?, ..., isNew}]` |
| ↳ **`isNew` 판정 (2026-07-18 변경)** | `(지평선 이후) && !notif_read_keys.has(key)` — 지평선(`max(notifSeenAt, profiles.notif_seen_at)`)**과** 개별 읽음 키를 **함께** 본다. 이전엔 지평선만 봤음 |
| ↳ **묶음 알림 3종과 묶는 축** | `new_intro`=유형 전체 / `voucher_granted`·`voucher_used`=유형+KST날짜 / **`tagged`=모임(`group_name`+날짜)**(2026-07-21 추가). 🚨 **`tagged`를 게임별로 묶지 말 것** — 실측에서 한 사람 16건 중 게임이 11종이라 거의 안 접힌다. 한 모임에서 게임 여러 개를 한 번에 기록하는 게 실제 패턴이라 **모임 축이어야 접힌다**(전체 91줄→44줄, 김기성 14→3) |
| ↳ **묶음의 `count`와 목록 필드는 단위가 다르다** | `tagged`: `count`=**기록 수**, `gameIds`=**중복 제거된 게임**(한 모임에서 같은 게임을 여러 판 하면 8건/6종). `voucher_*`: `count`=건수, `names`=사람. **둘을 같은 수로 가정한 문구를 쓰지 말 것** — 화면에 「도미니언」이 3번 나열된 게 이 혼동이었다 |
| ↳ **`key` / `keys`** | `key`는 `${type}:${소스행 id}`(예: `tagged:17`·`new_intro:42`). **묶음 알림만 `keys` 배열**을 추가로 가짐(구성원 전부를 한 번에 읽음 처리해야 하므로). 소비처는 `n.keys \|\| [n.key]`로 받을 것. ⚠️ 소스 select 7개가 **이미 전부 `id`를 조회**하고 있어 신규 쿼리는 없음 |
| `addNotifReadKeys(userId, keys[])` | **개별** 알림 읽음 — `profiles.notif_read_keys`에 키 배열을 합집합으로 추가(중복 제거). `notif_seen_at`(지평선)은 **건드리지 않음**. 반환 `{error}`. 소비처: kakao-auth.js `_markOneNotifSeen` |
| `updateNotifSeenAt(userId, timestamp)` | **모두 읽기** — 지평선을 `timestamp`로 옮기고 **`notif_read_keys`를 `[]`로 함께 비운다**(2026-07-18. 지평선 이전 개별 키는 전부 흡수되므로 중복 — 이게 배열 크기의 상한선). 소비처: kakao-auth.js `_markAllNotifSeen`. ※2026-07-18 이전까지 이 표에 **누락돼 있던 항목**(문서 드리프트, 발견 즉시 보강) |
| `getGameReviews(gameId)` | 게임 리뷰 조회 |
| `insertGameReview(...)` | 게임 리뷰 등록 |
| `deleteGameReview(id)` | 게임 리뷰 삭제 |
| `banUser(userId)` / `unbanUser(userId)` | 차단/해제 |
| ~~`deletePlayPhoto(recordId)`~~ | **없다 (2026-07-21 제거)** — 기록 사진 **개별** 삭제는 DB 함수가 아니라 `game-reviews.js`의 `.pr-rec-photo-del` 핸들러가 한다: `parsePhotoUrls`로 남은 URL을 다시 조립(1장이면 문자열·2장 이상이면 JSON 배열·0장이면 `null`)해 `updateGamePlay(id, { photo_url })`로 넘긴다. 옛 `deletePlayPhoto`는 `photo_url`을 통째로 `null`로 밀어 **그 기록의 사진을 전부 지우는** 함수였고 호출부가 0건이었다. 「사진 개별 삭제 불가」라는 버그 기재가 이 함수만 보고 쓰인 것이었다 |
| `isUserBanned()` | 현재 유저 차단 여부 |
| `getProfilePhoto(userId)` | profiles.photo_url 단일 조회 |
| `getProfileSnapshot(userId)` | profiles.photo_url + nickname 단일 조회 (다기기 동기화용) |
| `getUserAchievements(userId)` | 유저가 획득한 업적(캐릭터) 목록 |
| `grantAchievement(userId, achId)` | 업적 지급. 중복이면 false 반환 |
| `setRepAchievement(userId, achId)` | 대표 캐릭터 설정 (profiles.rep_achievement_id) |
| `getUserPlayCount(userId)` | 플레이 기록 건수 |
| `getUserDistinctGameCount(userId)` | 플레이한 게임 종류 수 (distinct game_id) |
| `getUserPhotoCount(userId)` | 첨부 사진 URL 개수 합산 |
| `getUserRatingCount(userId)` | 별점 제출 건수 |
| `getUserVisitCount(userId)` | profiles.visit_count 조회. 방문 업적 체크·진행도 표시에 사용 |
| `getRepAchievement(userId)` | 대표 캐릭터 객체 반환 |
| `setRepTitle(userId, titleId)` | 대표 칭호 설정 (profiles.rep_title_id). 성공 true, 실패 false |
| `grantFirstPlayVoucher(userId)` | 첫 플레이 기록 보상 교환권 1장 지급. 오너/중복이면 false. DB unique index로 이중 방어 |
| `getVoucherBalance(userId)` | voucher_log delta 합산 → 현재 보유 교환권 수 |
| `getVoucherProducts()` | 활성 상품 목록 (`{ id, name, cost }[]`) |
| `redeemVoucher(userId, productId)` | 교환권 사용. 잔액 부족이면 `{ ok:false, reason:'insufficient' }`. 성공 시 `{ ok:true }` |
| `getVoucherHistory(userId, limit=20)` | 교환권 입출 내역. `voucher_products(name)` FK expand 포함 |
| `getGameLikers(gameId, limit=6)` | 게임을 좋아요한 유저 목록 `[{user_id, nickname, photo_url}]`. 최대 limit명 |
| `getGameCuriousUsers(gameId, limit=6)` | 게임을 궁금해요한 유저 목록 (동일 구조) |
| `getUserLikedGames(userId)` | 유저가 따봉(❤️)한 game_id 배열 반환 (카탈로그 전용, 하위호환) |
| `getUserCuriousGames(userId)` | 유저가 궁금해요(🤔)한 game_id 배열 반환 (카탈로그 전용, 하위호환) |
| `getUserLikedGamesAll(userId)` | 취향보드용: `[{game_id, custom_name}]` 반환. custom_name은 직접입력 게임 |
| `getUserCuriousGamesAll(userId)` | 취향보드용: `[{game_id, custom_name}]` 반환 |
| `addGamePref(userId, gameId, customName, table)` | 취향보드: game_likes 또는 game_curious에 항목 추가. gameId/customName 중 하나만 필요 |
| `removeGamePref(userId, gameId, customName, table)` | 취향보드: 항목 삭제 |
| `getCustomPrefSuggestions()` | 취향보드: 두 테이블 전체에서 distinct custom_name 목록 반환 |
| `updateUserBio(userId, bio)` | profiles.bio 업데이트 — 취향보드/회원 자기소개/모임 보드가 공유하는 한줄소개 SSOT. 한쪽에서 호출하면 나머지 모든 화면에 즉시 반영됨 |
| `updateUserAvoidTags(userId, tags)` | profiles.avoid_tags (text[]) 업데이트 |
| `getMeetingVotes(startDate, endDate)` | 모임 플래너: 날짜 범위 내 전체 투표 조회. startDate/endDate: 'YYYY-MM-DD' |
| `getPartySize(vote)` | 그 등록 1건의 **방문 인원** = `1 + guest_count`(동반 인원). null·문자열·음수·NaN 전부 1로 방어 |
| `sumWeeklyPartySize(votes)` | **여러 날짜에 걸친 인원** — 유저별 **최대** 인원을 합산한다(월 3명·수 1명이면 그 사람 몫은 3). `sumPartySize`와 **다른 질문**이다: 저건 "그날 몇 명", 이건 "이 기간에 올 사람이 몇 명". 홈 상태 문구(*"N명이 기다리고 있어요"*)가 유일한 소비처. 동반 0이면 옛 `Set(user_id).size`와 동일 |
| `sumPartySize(votes)` | votes 배열의 총 방문 인원. `user_id` 기준 dedupe 후 `getPartySize` 합산 — 옛 `Set(user_id).size`의 의미를 보존하면서 지인만 더한다. 🚨 **「N명」을 세는 자리는 전부 이것만 쓴다** — `.length`로 세면 그 화면만 조용히 다른 답을 낸다(#15 `visitorKey` 사건과 동형). 현재 소비처: 플래너 3곳+`calcOverlap`/`calcSummary`, 이날 상세 4곳, 홈 이번주 모임 1곳 |
| `upsertMeetingVote(userId, nickname, voteDate, timeStart, timeEnd, guestCount=0)` | 모임 플래너: 가능 시간 등록/수정. UNIQUE(vote_date, user_id) upsert. `guestCount`는 동반 인원 — **인자를 생략하면 0으로 덮어쓴다**(수정 경로에서 기존 값을 안 실으면 동반 인원이 사라짐). 음수·NaN·소수는 0/정수로, 99 초과는 99로 접는다(DB CHECK와 같은 값) |
| `deleteMeetingVote(userId, voteDate)` | 모임 플래너: 등록 취소. **cascade**: 같은 user_id+vote_date의 `meeting_vote_games`(하고싶은/배우고싶은 게임)도 함께 삭제 — 참여 취소 시 orphan 게임 방지 |
| `getMeetingProfile(userId)` | **취향보드·모임보드 공용 단일 소스**(2026-07-17 R10b). profiles.bio+avoid_tags + member_intros + game_likes(getUserLikedGamesAll) + game_curious(getUserCuriousGamesAll) + meeting_game_prefs(can_explain_rules만) 통합 조회 → `{bio, avoidTags, nickname, location, available, travelRange, meetingStyle, favoriteGames, cardColor, likedGames, curiousGames, ruleGames}` (2026-07-09: wantGames → likedGames/curiousGames 미러링 전환 / 2026-07-17: `avoidTags` 추가 — 두 보드가 같은 값을 쓰는데 소스가 갈라져 크로스보드 stale이 났던 것을 이 함수로 통일). ⚠️ **취향/모임 서브시트 데이터를 여기 말고 다른 데서 또 불러오지 말 것** — 그 중복이 정확히 R10b가 고친 버그다 |
| `upsertMeetingIntro(userId, fields)` | member_intros upsert (`onConflict:'user_id'`). 유저당 1행 보장. fields에 전달한 키만 갱신 |
| `addMeetingGamePref(userId, listType, gameId, customName)` / `removeMeetingGamePref(...)` | meeting_game_prefs 추가/삭제. listType: `'want_this_time'` \| `'can_explain_rules'`. addGamePref/removeGamePref와 동일 구조 |
| `getMeetingVoteGames(startDate, endDate)` | 모임 플래너 날짜별 게임 선호 조회. → `[{vote_date, user_id, list_type, game_id, custom_name, is_priority, player_condition}]`. getMeetingVotes와 동일 패턴 |
| `addMeetingVoteGame(userId, voteDate, listType, gameId, customName)` | meeting_vote_games 추가. listType: `'want'`\|`'learn'`. 중복(23505) 성공 처리. addMeetingGamePref와 동일 구조 + voteDate |
| `removeMeetingVoteGame(userId, voteDate, listType, gameId, customName)` | meeting_vote_games 삭제. removeMeetingGamePref와 동일 구조 + voteDate |
| `setMeetingVoteGamePriority(userId, voteDate, gameId, customName, listType, isPriority)` | want/learn 게임 is_priority 토글. listType 가드 — 지정 타입 행만 수정. **isPriority=true 시**: userId+voteDate의 is_priority=true 개수 (want+learn 합산) ≥2이면 `{ok:false, reason:'max_priority'}` 반환. 행 없으면 `{ok:false, reason:'not_found'}`. 성공: `{ok:true}`. |
| `setMeetingVoteGameCondition(userId, voteDate, gameId, customName, listType, condition)` | want/learn 게임 player_condition 업데이트. listType 가드 — 지정 타입 행만 수정. condition 유효값: `'any'`\|`'best'`\|`'recommended'`\|`'2'`\|`'3'`\|`'4'`\|`'5+'`. 행 없으면 `{ok:false, reason:'not_found'}`. 성공: `{ok:true}`. |

---

## window._cottageSess (supabase-client.js)

localStorage 세션 유틸. supabase-client.js와 kakao-auth.js가 공유.

| 메서드 | 용도 |
|--------|------|
| `get(uid)` | 세션 객체 반환. 레거시 키 감지 시 `_migrate()` 자동 실행 후 반환 |
| `set(uid, data)` | 세션 객체 저장 |

`_migrate(uid)` — 레거시 키 6개(`cottage_last_visit_date_*` 등) + `cottage_profile_visited_*` 를 새 형식으로 이전 후 원본 삭제. 첫 접속 시 1회 자동 실행.

---

## window.kakao-auth.js 전역 함수

| 함수 | 용도 |
|------|------|
| `getKakaoUser()` | localStorage에서 유저 객체 반환 |
| `kakaoLogin()` | 카카오 OAuth 리다이렉트 |
| `kakaoLogout()` | 로그아웃 (localStorage 삭제) |
| `promptNicknameChange()` | 닉네임 변경 다이얼로그 |
| `isOwner()` | OWNER_KAKAO_ID와 일치 여부 |
| `openProfilePanel(autoSubsheet?, opts?)` | 프로필 보드 열기. `autoSubsheet`: `'taste'\|'records'\|'usage'\|'meeting'\|'voucher'\|'notif'`(자동 진입할 서브시트 — `[data-subsheet]` 요소를 클릭시킴. `'notif'`는 `_ro()`로 감싸져 **내 보드에만 존재**하므로 readOnly와 함께 쓰면 조용히 무시됨). **`opts={userId, readOnly, backTo}`**. `readOnly:true`면 대상 `userId`의 **공개 보드를 편집 컨트롤 없이** 표시(비공개 섹션=알림·교환권·함께한 시간 제외, 로그인 없이도 조회 가능). readOnly=false(기본)면 종전대로 `getKakaoUser()` 기준 내 보드(버튼 재클릭 토글). 편집 HTML은 내부 `_ro()`로 생략, `.profile-panel--readonly`/`.profile-subsheet--readonly` 클래스 부여 |
| ↳ `opts.backTo` (R10c) | 진입 직전 화면으로 돌아갈 경로. 넘기면 **패널 헤더에 뒤로가기(`.profile-panel-back`)가 생기고** 헤더가 `--with-back` 3열 그리드로 바뀐다(없으면 기존 flex 그대로 = 제목 왼쪽 정렬 보존). 형태: `{type:'gameSheet', gameKey, label}` → `openGameSheet(gameKey)`로 복귀 / `{type:'panel', autoSubsheet, label, opts?}` → `openProfilePanel(autoSubsheet, opts)`로 복귀. **서브시트→패널 뒤로가기는 `_openSubSheet`가 이미 하므로 backTo는 패널 한 칸만 담당**(깊이 1, 스택 자료구조 없음 — 체인은 각 패널 클로저가 자기 backTo를 들고 있어 자연 발생). ⚠️ 핸들러는 **자기 패널을 먼저 제거한 뒤** 복귀를 호출한다 — 순서가 바뀌면 `openProfilePanel` 토글 가드(`if (existing) … if (!readOnly) return`)에 걸려 내 보드가 안 열린다 |
| ↳ **서브시트 문자열 캐시 주의 (2026-07-18)** | 알림 서브시트는 `_notifInnerHtml` **문자열 캐시**로 재렌더되므로 **DOM만 바꾸는 변경은 재진입 시 되돌아간다.** 바꾸려면 `_openSubSheet`의 **`onLeave` 스냅샷**을 함께 걸 것(기록보드와 같은 방식). 같은 함정이 `_recordInnerHtml`·`_growthInnerHtml` 등 **오픈 시 1회 문자열로 만드는 서브시트 전부**에 적용된다(`_buildTasteInnerHtml`·`_buildMeetingInnerHtml`은 함수라 해당 없음) |
| `openOtherProfileSheet(userId, opts?)` | **Phase C: 얇은 래퍼** → `openProfilePanel('taste', {userId, readOnly:true, ...opts})` — `opts`는 `backTo` 통과용(R10c, 미전달 시 종전 동작). (본인이면 편집 가능한 내 보드). 구 `.other-profile-overlay` 별도 시트 제거. **Phase D(2026-07-15) 진입점 통일**: 게임시트 좋아요·궁금해요 아바타 칩(game-sheet.js), 게임시트 게임평·플레이기록 미리보기/전체목록 닉네임(`.sheet-comment-nick[data-user-id]`), 플레이기록 게시판 참여자 태그(`.pr-tag-who[data-nick]`, game-reviews.js — 종전 `openOtherMeetingSheet` 오배선 수정)·후기 작성자 이름(`.pr-rec-reviewer[data-user-id]`), 홈 최근 플레이 미리보기의 후기 작성자·참여자 이름(index-page.js, `.pr-tag-who[data-nick]`는 `getAllProfiles`+기록으로 nickname→user_id 해석) — "모임 참여자 외 전부"는 이 함수로 통일 |
| `openOtherMeetingSheet(userId, opts?)` | **Phase C: 얇은 래퍼** → `openProfilePanel('meeting', {userId, readOnly:true, ...opts})` (본인이면 `openProfilePanel('meeting', opts)`). `opts`는 `backTo` 통과용(R10c) — 알림 소개글 클릭이 `{backTo:{type:'panel', autoSubsheet:'notif'}}`로 복귀 경로를 실어 보낸다. 회원 자기소개(club-intro.html)·**모임 참여자**(`.sched-bar-name[data-uid]` — day-detail.js/index-page.js/club-schedule.html) 닉네임 클릭 진입점. 구 otherMainPanel/`_openOtherMeetingSubSheet` 2단 구조 제거 |

---

## window.escH (supabase-client.js)

HTML 특수문자 이스케이프. **이스케이프의 정본이며 사본을 만들지 않는다**(GS5, 2026-07-22).

```js
window.escH = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
```

- ⚠️ **`'`(작은따옴표)는 이스케이프하지 않는다** — 이 문서가 2026-07-22까지 `[&<>"']`로 잘못 적고 있었다. 작은따옴표로 감싼 속성이나 `onclick="fn('${x}')"` 안에 넣을 값은 이 함수로 안전해지지 않는다.
- **쓰는 쪽은 호출시점에 참조한다**: `const esc = s => window.escH(s);`. `const esc = window.escH` **스냅샷은 금지** — club-schedule.html이 day-detail.js를 supabase-client.js보다 먼저 로드해 그 시점엔 undefined다. **폴백도 붙이지 않는다**(폴백이 곧 사본).
- 통합 대상이 아닌 이스케이퍼 4종(속성 전용·JSON attr·부분 이스케이프 2)의 이유는 `scripts/verify-esch-unify.js`의 `ALLOW`에 있다. 사본이 다시 생겼는지는 `node scripts/verify-esch-unify.js --negctl`.

---

## window.MemberAnalytics (assets/js/member-analytics.js)

관리자 분석의 **「한 사람」 집계 단일 소스** (P4, 2026-07-22). `requests-admin.html`(관리자 페이지)과 `kakao-auth.js`의 오너 전용 「회원 분석」 섹션이 **둘 다** 이 모듈을 쓴다 — 두 곳이 각자 계산하면 조용히 갈린다(#15). 🚨 **순수 함수만** 둔다(전역·클로저 누수 없이 인자로만 동작 — 「함수 추출 3종 함정」 회피).

| export | 설명 |
|---|---|
| `toKstDate(iso)` / `kstToday()` / `kstShift(n)` | KST 날짜 `'YYYY-MM-DD'` |
| `VP_PERIODS` / `VP_DATE_RE` | 기간 프리셋 4종(`all/today/yesterday/7d`) + 날짜정규식 |
| `inVpPeriod(r, period, todayKst)` / `inPeriodByKst(iso, period, todayKst)` | ISO 날짜가 그 기간에 속하나. `inVpPeriod`는 `r.entered_at` 래퍼(buildPageMap용), `inPeriodByKst`는 임의 ISO(예: `page_events.created_at`)용 — **페이지·활동이 같은 기간 규칙**을 쓰게 한다. `'all'`은 아무것도 안 거른다(회귀 가드) |
| `vpLabel(period)` | 고른 값에서 라벨 파생 — 프리셋이면 그 라벨, 날짜면 「M월 D일」(원칙 ①) |
| `PAGE_KEY_ALIASES` / `normalizePageKey(page)` | 페이지 키 정규화(#14). ⚠️ 별칭표에서 **한글 키 삭제 금지**(과거 행이 독립 버킷이 됨) |
| `buildPageMap(rows, idType, id, period, todayKst)` | 한 사람 페이지 맵 `Map<page,{visits,totalSec}>`. rows는 **정규화된 page** 가정. `dedupUserPageDay`를 일부러 안 거친다(과소집계 방지, 5-1 제약) |
| `EVENT_FAMILIES` / `EVENT_ALL_TYPES` / `eventPersonId` | 이벤트 계열 **단일 출처**. 🚨 **새 `trackEvent` 타입은 여기 등록**(안 하면 조회 안 됨, #13) |
| `EVENT_TYPE_LABELS` / `eventTypeLabel(type)` | 타입 → 한글 라벨(보드 「무엇을 했나」가 raw 타입명 대신 이걸 보여줌). 없는 타입은 raw 폴백 — **새 타입 추가 시 여기도 한 줄**(안 하면 raw 노출) |
| `countMemberEvents(events, userId, period?, todayKst?)` | 그 회원 이벤트를 계열별 카운트 `[{key,emoji,label,total,types:[{type,label,n}]}]`(총계 내림차순, `types`의 `label`은 한글). `period`는 `created_at` 기준으로 페이지 분포와 **같은 기간 규칙**(안 넘기면 전 기간). 명단(`ddPanelHtml`)은 여기 없다 — 그건 「여러 사람」 드릴다운 |

- **관리자 페이지는 별칭·래퍼로 소비**한다(`const _inVpPeriod = (r,p) => MemberAnalytics.inVpPeriod(r,p,todayKst)` 등). 검증 스크립트도 이 모듈을 eval한다(`scripts/_member-analytics.js` 공용 로더, `--negctl`용 소스 변형 지원).
- **로드**: `requests-admin.html`은 인라인 별칭을 위해 명시 `<script>`(kakao-auth.js 앞). 그 외 페이지는 `kakao-auth.js`가 **자기경로 동적 로드**(day-detail.js와 같은 방식)라 HTML 편집 불필요.
- **오너 섹션 렌더**: `kakao-auth.js`의 `_renderAdminMemberBoard(subBody, userId)` — `getUserPageSessions`/`getUserEvents`/`getProfileUsage` 조회 → 이 모듈로 집계 → 페이지 분포(기간 버튼 위임)·이용 요약·활동 렌더. 카드는 `_adminView`(뷰어=오너 + readOnly + 대상≠오너)일 때만(`data-subsheet="adminboard"`). 🚨 **표시 게이팅이지 접근 제어가 아니다**(RLS off).

---

## window.resizeImageFile (supabase-client.js)

업로드 전 이미지 리사이즈. 1200px, JPEG 0.85. play-records-utils.js에서 `window.resizeImageFile?.(file)`로 optional call.

---

## 공유 유틸 (play-records-utils.js)

| 함수 | 용도 | 사용처 |
|------|------|--------|
| `parsePhotoUrls(raw)` | photo_url 문자열 → URL 배열 | game-reviews.js, club-history.html, index-page.js |
| `buildPhotoHtml(urls)` | 사진 썸네일 HTML 생성 | 동일 |
| `openLightbox(urls, idx, opts)` | 전체화면 라이트박스(저수준). opts: captions[]/caption, onDelete+deletable[], **gameThumbs[]**(사진별 게임 표지 URL, 좌하단 표시)+**gameKeys[]**+**onGameClick(key)**(썸네일 클릭 시). ⚠️ **deletable 생략 시 전부 삭제 가능으로 처리** — 남의 기록에도 삭제버튼이 뜨므로 권한 있을 때만 onDelete를 넘길 것 | 동일, kakao-auth.js(기록보드 사진) |
| `openRecordLightbox(wrap, row, idx, opts)` | **기록 행(.pr-rec-row) 사진용 고수준 래퍼.** 캡션 + 좌하단 게임 썸네일 + (내 기록이면) 삭제를 한 번에 구성하고, 삭제 시 `photo_url` 갱신까지 수행. 한 기록의 사진만 띄우므로 게임·소유권이 전 장 동일. 필요 DOM: `wrap[data-urls]`·`row[data-id][data-record]`(record에 `gameId`·`mine` 포함). opts: `buildCaption(rec)`, `onAfterDelete(recId, newPhotoUrl)`(호출부가 화면 갱신) | game-reviews.js(기록 허브), club-history.html(동호회 기록), index-page.js(홈 최근 플레이 미리보기 — opts 미전달, mine은 내 기록/오너면 true) |
| `getGameKeyById(gameId)` | DB `game_id`(gameKey 슬러그 또는 BGG ID) → `gameData` 키. 없으면 null. 원래 kakao-auth.js 지역함수였으나 라이트박스 썸네일 구성에 호출부마다 필요해 공용화(사본 증식 방지). ⚠️ **`openGameSheet`에 DB `game_id`를 넘기기 전엔 반드시 이걸 통과시킬 것** — 테이블마다 저장 형식이 다르다(`game_likes`/`game_curious`=슬러그 / `meeting_vote_games`=BGG ID, 2026-07-17 실측 12/12). BGG ID를 그대로 넘기면 `gameData` 미스 → **에러 없이 기록시트로 폴백**([game-sheet.js](../assets/js/game-sheet.js) `openGameSheet` 미보유 분기) | kakao-auth.js, day-detail.js, game-reviews.js, index-page.js, play-records-utils.js 내부 |
| `attachAc(input, getSuggestions, onSelect, listRef)` | 자동완성 드롭다운 연결. getSuggestions=후보 배열 반환 함수, listRef=드롭다운 삽입 기준 DOM(없으면 input을 새 div로 감쌈) | game-reviews.js |
| `initTagInput(wrap, hidden, initialValue, onAdd)` | 태그칩 입력 컴포넌트. wrap=컨테이너, hidden=값 동기화할 hidden input, initialValue=초기값 배열, onAdd=태그 추가 콜백 | game-reviews.js |
| `buildPhotoItemAdder(grid, files)` | 사진 추가 UI 컴포넌트 | game-reviews.js |
| `revokePhotoGridBlobs(root)` | root 안의 `blob:` img 전부 `URL.revokeObjectURL` — 그리드/행/폼을 `innerHTML=''`나 `.remove()`로 통째로 지우기 직전에 호출(개별 ✕삭제는 자체 처리돼 있음). 호출처: game-sheet.js 사진/플레이 모달 그리드 초기화 3곳, game-reviews.js 행삭제·편집폼취소·다중행저장성공 3곳 (2026-07-16 PU2) | play-records-utils.js |
| `toInitials(name)` | 이름 이니셜 변환 | game-reviews.js |
| `hangulMatch(query, target)` | 한글 초성 검색 | game-reviews.js |

---

## game-sheet.js 내부 헬퍼

| 함수 | 용도 |
|------|------|
| `openGameSheet(gameKey, restoreScroll, fromKey, noAnim)` | 게임 정보시트 열기. **미보유 게임**(`gameData[gameKey]` 없음)이면 정보시트가 없으므로 `openGameRecordSheet(gameKey)`로 리다이렉트(gameKey가 비어있지 않은 문자열일 때만). DOM(gameSheet/gameSheetContent) 없으면 무반응. → 모든 openGameSheet 호출처가 미보유를 한 지점에서 처리하는 단일 진입점. **`restoreScroll`**: 시트 내부 스크롤을 이전 위치로(`closeGameSheet`/`openGameRecordSheet`가 `_savedSheetScrollTop`에 저장). **`noAnim`**(R10c 후속): `sheetUp`(아래에서 올라옴) 연출 생략 — 시트는 `display:none↔block`이라 켤 때마다 애니메이션이 재생되므로, **뒤로가기 복귀처럼 "원래 있던 시트로 돌아가는" 경우에만** true. 새로 여는 경로는 false(기본) 유지 |
| `openGameRecordSheet(gameKey)` | 게임 기록시트(좋아요/궁금해요/게임평/사진/플레이기록). `game` 널이어도 제목·이미지·rating 폴백으로 렌더(미보유 지원). 미보유면 "← 게임 정보" 버튼 대신 `.sheet-unowned-badge`("🚫 미보유·게임정보 없음") 표시. 좋아요·게임평 등은 `_gameIds(gameKey)`(미보유는 슬러그 단건)로 조회 |
| `_gameIds(gameKey)` | gameKey → `[gameKey]` 또는 `[gameKey, bggId]` 배열 반환. game_id가 gameKey와 BGG ID 두 가지로 저장될 수 있어 CottageDB 조회 시 배열로 전달하여 `.in()` 쿼리 처리 |
| `_fetchGamePhotos(gameKey)` | 해당 게임 플레이 기록에서 사진 URL 목록 추출 |
| `_getMyUnlinkedPlayRecords(gameKey)` | 게임평↔플레이기록 연동 공용 조회. `{all, unreviewed}` 반환 — all=내 기록 전체, unreviewed=후기(review_text) 없는 것만. `onOpenCommentInput`(작성 시 체크박스 연동)과 `onLinkCommentToPlay`(사후 연동) 양쪽이 공유 |
| `onOpenCommentInput(btn)` | 게임평 작성 모달. **두 모드(014)**: ①`btn.dataset.recordId` **있으면**(기록 ⋯메뉴 진입) = **첨부 모드** — 연동 select를 아예 숨기고 `modal.dataset.recordId`만 세팅해, 저장 시 그 기록에 게임평을 매단다(누구 기록이든). ②record_id **없으면**(게임시트 「남기기」) = 기존 연동 select 모드: 내 후기없는 기록(value=id) + 남의 세션(`data-join`, `modal._joinSessions`, `data-rec-ids`), `all.length`→`modal._myRecordCountAtOpen` 캐시(넛지 판정). ⚠️ **①이 별도 모드인 이유**: 예전엔 record_id를 `_preselectLinkOption`으로 남 세션에 매칭해 「남 세션 참여」(=새 기록 생성)로 흘렀고, 그게 사용자가 거부한 「같은 게임 2번」 함정이었다. 첨부 모드는 그 경로를 타지 않는다 |
| `_preselectLinkOption(linkCheck, linkSelect, recordId)` | ⋯메뉴 특정 기록에서 모달 진입 시 그 기록을 "연동" 기본값으로: select에서 value===recordId(내 기록) 또는 `data-join`+`data-rec-ids`에 recordId 포함(남 세션) 옵션을 찾아 체크박스 ON+선택. 게임평·사진 모달 공용 |
| `onLinkCommentToPlay(btn)` | 기존 게임평(코멘트) → 내 플레이기록 사후 연동. 후기 없는 내 기록이 있으면 `getOrCreateCommentModal()`을 link-mode로 재사용(`modal.dataset.linkCommentId` 설정, 텍스트 readonly 프리필, 기록 select 강제 표시). 내 기록 없으면 `_getOthersSessions` 조회 → 있으면 `_openJoinConfirm`(확인창 → 즉시 참여, 원본 코멘트 이동), 없으면 game-reviews.html?tab=input 빈 입력 넛지 |
| `onSubmitCommentModal()` | link-mode(`linkCommentId`)면 `updateGamePlay`+원본 `deleteComment`. select 연동 분기: `join:` 옵션이면 세션 필드 복사한 `recordGamePlay`(남 세션 참여), 내 기록 id면 `updateGamePlay(review_text)`, 미선택이면 `insertComment`. **미선택이면서 `modal.dataset.recordId` 있으면(첨부 모드, 014)** `insertComment(..., recordId)` → 그 기록에 매인 게임평 → `refreshPlayRecordsBoard`로 게시판 반영, 넛지 건너뜀. 셋 다 아니고 내 기록 0개면 남 세션 있을 때 `_openJoinConfirm`(방금 쓴 게임평 이동), 없으면 넛지 토스트 |
| `_getOthersSessions(gameKey)` | 남의 세션에 내 후기/사진으로 참여: `getGamePlayRecords(_gameIds)`에서 내 기록 제외 + `group_name\|played_at\|player_count\|player_names` 키로 dedupe + 최신순 정렬. 각 세션에 `rec_ids`(그 세션 기록 id들, 프리셀렉트 매칭용) 포함. 그룹·날짜 둘 다 없는 기록은 세션으로 안 봄 |
| `_openJoinConfirm(gameKey, sessions, reviewText, sourceCommentId?)` | 남의 세션에 내 후기로 참여(1안 = 확인창, 입력폼·페이지이동 없음). `#sheetJoinModal`(세션 정보+후기 미리보기, 세션 여러 개면 select) → [남기기] 시 세션 필드(게임·인원·참여자·그룹·날짜) 그대로 복사한 `recordGamePlay`로 내 새 기록 생성 → 모임별·게임별 뷰 모두 같은 세션에 nest. `sourceCommentId` 있으면 성공 후 `deleteComment`(후기 이동=중복 방지). 완료 후 `initSheetComments`/`Preview`/`initPlayWidget` 갱신 |
| `onOpenPhotoInput(btn)` / `onSubmitPhotoModal()` | 사진 남기기 모달. "연동" select = 내 기록(선택 시 `updateGamePlay`로 photo_url 병합) + **남의 세션**(`data-join="1"`, `data-rec-ids`, `modal._joinSessions`; 선택 시 세션 필드 복사한 `recordGamePlay`로 내 새 사진 기록 = 세션 참여). `btn.dataset.recordId` 있으면 `_preselectLinkOption`으로 기본 연동. 미연동이면 사진만 담은 새 기록 생성 |
| `window.refreshPlayRecordsBoard()` | game-reviews.js가 노출하는 게시판 리로드 훅(정의: game-reviews.js). game-sheet.js의 ⋯메뉴 모달 저장(사진/게임평/세션참여/플레이기록 수정·신규) 성공 시 호출 → 게시판 캐시 무효화 후 기록 탭 열려있으면 즉시 리로드. 게시판 없는 페이지(index/owned 등)에선 `undefined`라 `?.()`로 no-op. (2026-07-16: ⋯메뉴로 사진/게임평 추가해도 새로고침 전엔 게시판에 안 뜨던 버그 수정) |
| `initPlayWidget(gameKey)` 기록별 ⋯메뉴 | 게임(기록)시트 플레이위젯의 각 기록 항목에 `.sheet-rec-more`(⋯) 인라인 확장 메뉴 — `💬 게임평 추가`(`onOpenCommentInput`)·`📷 사진 추가`(`onOpenPhotoInput`), 버튼에 `data-game-id`+`data-record-id`. `💬 게임평 추가`는 그 기록에 **첨부**(014, 위 `onOpenCommentInput` ①모드), `📷 사진 추가`는 그 기록/세션을 "연동" 기본값으로(`_preselectLinkOption`). `.sheet-play-box{overflow:hidden}` 클리핑 회피 위해 절대배치 드롭다운 대신 인라인 확장(`.sheet-rec-more-actions.is-open`) |
| `buildSessionBody(recs, user, orderMap)` (game-reviews.js) | 플레이기록 게시판의 기록 행 렌더(날짜별·모임별·게임별 세 뷰 공유). 기록 주인 후기(`review_text`)를 `pr-rec-review`로, 그 뒤에 **그 기록에 매인 남의 게임평**(`_recordCommentsMap[record.id]`, 014)을 `_linkedReviewHtml`로 잇는다. 맵은 `loadRecords`가 `getRecordComments(모든 기록 id)`로 1회 로드(동기 재렌더라 여기서 조회 안 함) |
| `_linkedReviewHtml(c, recordId, user)` / `_bindLinkedReview(scope)` / `window.addRecordCommentToBoard(recordId, comment)` (014) | 매인 게임평 한 줄의 HTML·바인딩·**surgical 삽입**. 게임평을 기록에 매단 직후(`onSubmitCommentModal` 첨부 분기) **게시판을 다시 그리지 않고** 그 기록 `.pr-rec-row[data-id]`의 `.pr-rec-main`에 한 줄만 append(위치 이동 없음 — 전체 리로드+스크롤 복원 대신). 작성자 본인·오너면 `⋯` 메뉴(`.pr-rev-menu-wrap`)가 붙고 **수정**(`_onEditLinkedReview` — 인라인 textarea → `updateComment` 후 그 줄만 갱신)·**삭제**(`_onDeleteLinkedReview` — `deleteComment` 후 그 `<p>`만 remove). 텍스트는 `.pr-rev-text`에 담아 수정 시 교체. 권한 규칙 = 사진 삭제(`canManage = isMine\|\|isOwner`)와 동일. 바깥 클릭 닫힘은 `_closeRevMenus`(기존 `_prMoreOutsideClickBound` 핸들러에 연결) |

---

## window.CottageGameView / window.COTTAGE_GAMES (game-display-adapter.js)

| 전역 | 내용 |
|------|------|
| `window.CottageGameView` | gameData → 화면 출력용 view 함수 모음 |
| `window.COTTAGE_GAMES` | 게임 플랫 배열 `{id, bggId, display, titleKo, titleEn, abbr, bestPlayers, recPlayers, thumbnail}`. 게임명 자동완성·인원 조건 표시용.<br>`thumbnail`: `getGameImage(g)` 재사용(images.thumbnail→images.main 순, 정규화됨), 없으면 `null`. day-detail.js 자세히/이날모임한눈에보기 모달의 작은 게임 썸네일에 사용(2026-07-15).<br>`abbr` 결정 3단계 (build-output.js): ① `game-abbr.json[bggId]` → ② `game-abbr-byname.json[ownedName]` → ③ `titleKo.slice(0,2)` 폴백.<br>`bestPlayers`/`recPlayers`: gameData.bgg.bestPlayers/recommendedPlayers 배열 원본. 데이터 없으면 `null`. `window.formatCondLabel`이 소비.<br>**abbr 소비처**: 막대 라벨(`resolveGameAbbr` in day-detail.js:918), 룰렛 휠 SVG(day-detail.js:778,789), 룰렛 후보 wantGameMap(day-detail.js:622), 룰렛 수동 추가(day-detail.js:829). 모든 소비처는 `COTTAGE_GAMES[i].abbr` 우선 → 없으면 `titleKo.slice(0,2)` 로컬 폴백. `#` 접두 제거(`replace(/^#/,'')`) 후 slice 필수 — c0a495c(bar), 8052782(roulette)에서 각각 수정됨. |
| `CottageGameView.getDifficultyData(weight)` · `.normalizeLevelValue(value)` | **난이도 헬퍼 — game-sheet.js에서 이관(GS7, 2026-07-18).** `getDifficultyData`: raw weight(숫자) → 난이도 레벨 객체 `{id,label,shortLabel,icon,className}`. weight 0/미상 → `DIFFICULTY_UNKNOWN`(id `unknown`), 범위 밖·갭값 → `DIFFICULTY_LEVELS[1]`(beginner) 폴백. `normalizeLevelValue`: 필터 레벨값 정규화(`light`→`light_family`, `heavy`→`heavy_mania`, easy_coop/hard_coop 통과, 그 외 원값). **game 객체가 아니라 순수 weight·문자열을 받는다**(어댑터의 `getDifficultyWeight(game)`/`getDifficultyId(game)`와 시그니처 다름). 소비처는 전부 `GameView.getDifficultyData(...)` 형태(= window.GameView, game-sheet가 재노출한 동일 객체): game-sheet.js 내부, index-page.js, script-nav.js, owned-games-page.js. **더 이상 bare `window.getDifficultyData` 아님.** |
| `window.getAllGamesArray` | **소유: game-sheet.js** (전역 함수선언, 무인자). `Object.values(gameData).map(g => ({ key: g.id, ...g }))` — 각 게임에 `key` 필드를 붙여 반환. 호출처(script-nav.js 헤더검색·index-page.js·owned-games-page.js) 전부 무인자로 사용.<br>**주의**: adapter의 `CottageGameView.getAllGamesArray(gameData)`는 **별개 함수**(순수 유틸, `key` 없음, 인자 필요) — game-sheet.js 내부에서만 사용. 과거 adapter가 `window.getAllGamesArray`로도 노출했으나 로드순서상 game-sheet가 항상 덮어써 죽은 코드였고 R7(2026-07-16)에서 제거. 전역은 game-sheet 단일 소스. |

---

## window.COTTAGE_PAGE_SLUG / COTTAGE_PAGE_LABELS / COTTAGE_PAGE_LABELS_BY_PATH (page-labels.js)

페이지 경로 → 한글 라벨 매핑 단일 소스. 구 script.js(현 script-nav.js)의 PAGE_LABELS(pathname 키, 세션 트래커용)와 requests-admin.html의 PAGE_LABEL(slug 키, 분석 대시보드 표시용)이 별도 하드코딩이라 about.html 개명 시 드리프트가 발생했던 것을 통합(143차-161).

| 전역 | 키 형식 | 용도 |
|------|--------|------|
| `window.COTTAGE_PAGE_SLUG(pathname)` | — (함수) | **저장용 SSOT** (#14). `page_sessions.page`에 넣을 슬러그를 만든다. `script-nav.js` 세션 트래커와 `supabase-client.js` `_startAnonHeartbeat`이 **둘 다 이 함수**를 쓴다 |
| `window.COTTAGE_PAGE_LABELS` | slug (예: `'about'`) | **표시용 SSOT.** requests-admin.html의 `page_views`·`page_sessions` 양쪽 화면이 전부 이 맵으로 이름을 붙인다 |
| `window.COTTAGE_PAGE_LABELS_BY_PATH` | pathname | ⚠️ **앱 코드에 소비처가 없다** (2026-07-21, #28). 마지막 용도였던 `page_sessions.referrer` 저장이 `COTTAGE_SESSION_REF`로 바뀌면서 비었고, 지금 읽는 건 `scripts/audit-page-buckets.js` 하나뿐이다. **그래서 삭제하지 않았다** — 지우려면 그 스크립트를 먼저 옮길 것 |

🚨 **표시 라벨을 DB에 저장하지 않는다** (#14, 2026-07-20). 예전엔 트래커가 `BY_PATH`의 한글 라벨을 `page_sessions.page`에 그대로 넣어서, **라벨을 개명할 때마다 같은 페이지가 새 버킷으로 쪼개졌다**(11,777행이 42종으로 흩어짐). 지금은 **저장=슬러그 / 표시=라벨**로 분리돼 있어 `COTTAGE_PAGE_LABELS` 값은 자유롭게 고쳐도 데이터가 안 갈린다.

⚠️ **두 맵의 값이 어긋나 있었다 (2026-07-21 정정)** — `COTTAGE_PAGE_LABELS`가 개명을 못 따라가 `club-intro`가 `'동호회 소개'`(실제로는 club.html의 옛 이름)로 표시되는 등 6개가 틀렸다. 이제 **각 페이지의 실제 `<title>`과 맞춘다** — 값을 바꿀 땐 title을 보고 바꿀 것.

**`script-nav.js`가 로드 시점에 동기 평가하므로, page-labels.js는 반드시 script-nav.js 로드 직전에 위치해야 함** (14개 HTML 전체 적용 완료).

---

## window.COTTAGE_SESSION_REF (supabase-client.js)

`page_sessions.referrer`에 넣을 **유입 소스**의 SSOT (#28, 2026-07-21). 값(함수 아님)이며 규칙은
**`utm_source` > 외부 호스트 > 당일 last-touch(`cottage_orig_src_{KST날짜}`) > `null`**.
`supabase-client.js`가 파싱 시점에 1회 계산해 노출하고, `script-nav.js` 세션 트래커가 그대로 쓴다.

| 저장 경로 | 어디 |
|---|---|
| `supabase-client.js` `_syncTimeToDBNow` / anon heartbeat | 내부 `_sessionReferrer` 직접 사용 |
| `script-nav.js` PAGE SESSION TRACKER | `window.COTTAGE_SESSION_REF` |

🚨 **사본을 만들지 말 것.** 2026-07-21 이전엔 트래커가 자체 규칙으로 **referrer 페이지의 내부
라벨**(`'메인'`·`/pages/info/guide.html`)을 넣었고, 읽는 쪽 `categorizeRef`는 호스트·utm 토큰을
기대하므로 전부 `null`로 떨어져 **11,825행 중 8,382행(71%)이 「직접 방문」으로 접혔다** —
채널별 체류시간이 통째로 과소집계됐다. `page` 컬럼의 #14와 **완전히 같은 병**이다.

⚠️ **`page-labels.js`가 아니라 `supabase-client.js`에 있다** — 로드 순서가 `supabase-client.js`
→ `page-labels.js` → `script-nav.js`라서 문제없다(14개 HTML 전수 확인, `scripts/verify-referrer.js` ①이 상시 검사).

---

## window._cottageSessionStart (supabase-client.js)

현재 세션 시작 시각 (Date.now() 값). `startSession()` 및 `visibilitychange` 탭 복귀 시 set. `kakao-auth.js`의 `openProfilePanel`에서 현재 세션 경과 시간 계산에 사용.

내부 cross-file 전역 — 외부 페이지에서 직접 호출하지 않음.

---

## 전역 커스텀 이벤트

| 이벤트 | 발화 | 수신 | detail |
|--------|------|------|--------|
| `cottage-likes-changed` | 좋아요/궁금해요 원천(game_likes/game_curious) 변경 시. 발화 지점: ①게임시트 버튼(game-sheet.js `emitLikesChanged`, `onSheetLike`/`onSheetCurious` — 상호배타로 반대 목록 제거 시에도 별도 발화) ②취향보드 추가/삭제(kakao-auth.js `_emitLikesChanged`) ③모임보드 "좋아하는 게임에도 추가"(kakao-auth.js) | 취향보드(열려있으면 목록 추가/삭제·카운트 갱신) / 모임보드(`_likedSlugSet`/`_curiousSlugSet` 갱신 후 `_renderWeekList`로 ❤️/👀 마커 즉시 반영) / **내 보드 패널(`window.__panelLikesHandler` — `_boardData`의 likedGames/curiousGames를 고치고 `_syncTasteCard()`로 취향 카드 요약을 다시 그린다. 멱등이라 이미 배열을 고친 발화 지점과 중복되지 않는다. 읽기전용 패널은 미등록)**. 수신 핸들러는 `window.__tasteLikesHandler`/`window.__mbLikesHandler`/`window.__panelLikesHandler`로 dedupe + DOM 이탈 시 self-remove | `{ table:'game_likes'\|'game_curious', gameId(슬러그 문자열\|null), customName(직접입력 이름\|null), added:bool }` |
| `cottage-meeting-changed` | 모임보드 이번주 게임 목록의 인원조건 select 변경 시(kakao-auth.js, `setMeetingVoteGameCondition` 성공 후) (2026-07-15) | index-page.js — 홈 "이번 주 모임 진행 중" 미리보기는 `dayVotes`/`dayGames`를 초기 로드 시점 값으로 캐시해 렌더하므로(`openDateMeetingModal`이 실시간 DB 재조회 안 함) 이 신호 없이는 "이날 모임 한눈에 보기" 모달이 갱신되지 않음. 수신 시 `_meetingReload?.()`(=loadWeek) 호출. club-schedule.html은 아직 미구독(자체 reload 함수 부재, 후속 과제) | `{ reason:'condition' }` |

> `gameId`는 항상 game_likes 슬러그이며, **직접입력 게임은 `gameId=null` + `customName`으로 온다**(개수 집계는 이것도 세야 맞아서 2026-07-21에 추가). 목록 DOM을 고치는 기존 수신부 둘은 `if (!gameId) return`으로 그대로 무시한다. 모임 수신부는 `_mbSlug()`로 정규화 후 슬러그 Set과 매칭. game-reviews.js(기록 iframe)의 `onPrMenuLike/Curious`는 별도 window 컨텍스트라 이 이벤트 미발화(Phase A 범위 밖).

---

## 크로스파일 의존관계 (전역 변수 전체)

| 전역 | 정의 파일 | 사용 파일 |
|------|----------|----------|
| `window.CottageDB` | supabase-client.js | game-sheet.js, kakao-auth.js, game-reviews.js, index-page.js, achievements.js, day-detail.js, play-records-utils.js, club-history.html, club-intro.html, club-schedule.html, requests.html, requests-admin.html 등 (**script-nav.js는 미사용** — 2026-07-18 감사에서 정정) |
| `window._cottageSess` | supabase-client.js | kakao-auth.js |
| `window._cottageSessionStart` | supabase-client.js | kakao-auth.js |
| `window.escH` | supabase-client.js | 전체 |
| `window.resizeImageFile` | supabase-client.js | play-records-utils.js (optional) |
| `window.getKakaoUser` | kakao-auth.js | game-sheet.js, game-reviews.js, index-page.js, day-detail.js, supabase-client.js, requests.html, club-history.html, club-intro.html, club-schedule.html, guide.html 등 (**script-nav.js는 미사용** — 2026-07-18 감사에서 정정) |
| `window.kakaoLogin` | kakao-auth.js | game-reviews.js, 각 페이지 |
| `window.kakaoLogout` | kakao-auth.js | 각 페이지 |
| `window.promptNicknameChange` | kakao-auth.js | 각 페이지 |
| `window.isOwner` | kakao-auth.js | requests-admin.html |
| `window.parsePhotoUrls` | play-records-utils.js | game-reviews.js, club-history.html, index-page.js |
| `window.buildPhotoHtml` | play-records-utils.js | game-reviews.js, club-history.html, index-page.js |
| `window.openLightbox` | play-records-utils.js | game-reviews.js, club-history.html |
| `window.openRecordLightbox` | play-records-utils.js | game-reviews.js, club-history.html, index-page.js |
| `window.getGameKeyById` | play-records-utils.js | kakao-auth.js, day-detail.js, game-reviews.js, index-page.js |
| `window.attachAc` | play-records-utils.js | game-reviews.js |
| `window.initTagInput` | play-records-utils.js | game-reviews.js |
| `window.toInitials` | play-records-utils.js | game-reviews.js |
| `window.hangulMatch` | play-records-utils.js | game-reviews.js |
| `window.checkAchievements` | achievements.js | supabase-client.js (recordGamePlay, submitRating 후 호출) |
| `window.CottageAchievements` | achievements.js | kakao-auth.js (패널 섹션 빌드). 노출: checkAchievements, buildCodexSection(userId) → `{html,playedCount,totalGames}`, buildCharacterSection(userId,nickname,preStats) → `{html,earnedCharCount,charTotal}`, buildAchievementsSection(userId,nickname,preStats) → `{html,achCount,achTotal}` **(순수 read-only 빌드 — 2026-07-16 R6부터 write 없음)**, grantRetroAchievements(userId, stats) **(명시적 write: 카운트 충족했으나 미트리거된 업적을 소급 insert. stats.achievements를 in-place 갱신. 호출부에서 `!readOnly`일 때만 호출)**, handleRepCardSelect, buildTitleSection → `{html,earnedIds,titleTotal}`, handleRepTitleSelect, getTitleById(id), getCharacterPath(achId), getCharacterName(achId), fetchUserStats(userId, nickname), findNextAchievement(preStats) → `{emoji,name,gap,unit}` or null. (2026-07-15 R3: 4개 build 함수 모두 문자열 대신 `{html,...}` 객체 반환으로 통일 — 호출측 HTML regex 스크래핑(`_safeInt`) 제거 목적. 2026-07-16 R6: 소급지급 side-effect를 buildAchievementsSection 밖으로 분리 → readOnly 열람 시 대상 유저 DB write 방지) |
| `window.gameData` | cottage-games-data-output.js | game-display-adapter.js, game-sheet.js, owned-games-page.js, index-page.js |
| `window.COTTAGE_GAMES` | game-display-adapter.js | game-reviews.js, day-detail.js |
| `window.formatCondLabel` | day-detail.js | club-schedule.html (Step 3 칩) |
| `window._condSelWidth` | day-detail.js | kakao-auth.js (모임보드 `.mb-cond-select`) — `(label) => 'Npx'`. 네이티브 select가 가장 긴 옵션 기준으로 폭 고정되는 문제 회피, 선택 라벨 길이 기준 동적 폭 계산(2026-07-15) |
| `window.formatVoteHour` | day-detail.js | `(h, {compact}?) => string`. meeting_votes.time_start/end(017부터 30분 단위, `.5`=30분)를 "9시"/"9시30분"로. `compact:true`면 "9"/"9:30"(막대 안처럼 좁은 자리용). club-schedule.html에서 호출(day-detail.js가 항상 먼저 로드됨). ⚠️ **kakao-auth.js는 이 전역에 기대지 않는다** — day-detail.js를 안 불러오는 페이지(club.html·requests.html 등)에서도 모임보드 미니바가 뜨므로, `_buildMiniBarWeekHtml` 안에 로직이 같은 지역 헬퍼(`_fmtVoteH`)를 따로 둔다(크로스파일 갭 회피, 2026-07-28). |
| `window.CottageGameView` | game-display-adapter.js | game-sheet.js, owned-games-page.js, index-page.js, script-nav.js |
| `window.getAllGamesArray` | game-sheet.js (전역 함수선언, 무인자·`{key,...game}`) | script-nav.js, index-page.js, owned-games-page.js |
| `window.SUPABASE_CONFIG` | supabase-config.js | supabase-client.js |
| `window.COTTAGE_PAGE_SLUG` / `COTTAGE_PAGE_LABELS` / `COTTAGE_PAGE_LABELS_BY_PATH` | page-labels.js | script-nav.js, supabase-client.js(`_startAnonHeartbeat`), requests-admin.html (script-nav.js 로드 직전 필수) |
| `window.renderDayDetailHTML` | day-detail.js | 일정 상세 블록 HTML 반환 `({ date, timeStart, timeEnd, wantGames, learnGames })`. 모달/인라인 공용. |
| `window.openDayDetailModal` | day-detail.js | 레거시 — 직접 데이터 전달 방식으로 개인 일정 모달 열기 `(opts)`. |
| `window.openDateScheduleModal` | day-detail.js | 막대 클릭 → DB 조회 후 개인 일정 모달 `(userId, voteDate)`. club-schedule.html에서 호출. |
| `window.openDateMeetingModal` | day-detail.js | 날짜 전체 집계 모달 `(voteDate, votes, voteGames, opts?)`. 홈 미리보기 카드 클릭 시 index-page.js에서 호출. |
| `window.buildBarsInCard` | day-detail.js | 주간 카드/홈 미리보기 시간 막대 HTML 반환 `(dayVotes, voteGames, myVote)`. myVote=null이면 is-mine 강조·수정삭제 버튼 없음. **지난 날짜(`vote_date < 오늘`)면 내 막대여도 ✎/✕를 렌더하지 않는다** — 플래너 iframe이 `cottage-edit`을 `ds >= 오늘`에서 버려 눌러도 무반응이던 자리(2026-07-22). 막대 자체는 그대로 그린다(보기 허용). club-schedule.html·index-page.js·openDatePreviewModal에서 호출. |
| `window.openDatePreviewModal` | day-detail.js | 하루치 미리보기 센터모달 `(dateStr, dayVotes, dayGames, myVote?, onChange?)` — buildBarsInCard 재사용, 그날 참여자 막대그래프. 우상단 ✕로 닫기. 내 막대 ✎=플래너 편집(그 날, onDirtyClose=onChange)/✕=참여 취소(deleteMeetingVote 후 onChange). onChange=변경 후 호출(모임보드는 `_loadMeetingWeek` 전달). 모임보드 "자세히"에서 호출 — **내 보드/읽기전용 보드 모두** 이 모달로 통일(Phase E, 2026-07-15). 읽기전용은 `myVote=null, onChange=null`로 호출해 막대 하이라이트·✎✕ 없이 그날 전원 막대만 표시(남 일정 편집 차단). |
| `window.openPlannerModal` | day-detail.js | **공용** 모임 플래너 센터모달(전 페이지). `(opts)`: `weekOffset`(주차), `register`/`edit`(date), `onDirtyClose`(저장 후 닫힘 콜백). club-schedule.html?embed=true를 iframe으로 띄우고 open 시 목표 상태 전체 선언(cottage-reset-week/register/edit). 모임보드 "✎ 편집"에서 호출. |
| `window.formatCondLabel` | day-detail.js | `(cond, game_id)` → 인원 조건 표시 문자열. `'best'`/`'recommended'`는 COTTAGE_GAMES에서 실제 인원 배열 조회 후 포맷(`베스트 4인` / `추천 3~4인` / `베스트 3·5·6·8인`). 데이터 없으면 `베스트인원`/`추천인원` 폴백. `'any'`→`''`. `'2'`/`'3'`/`'4'`/`'5+'`→`'N인'`. club-schedule.html Step 3 칩 레이블에서 호출. |
- 관리자/로컬 제외 기준은 유지한다.
