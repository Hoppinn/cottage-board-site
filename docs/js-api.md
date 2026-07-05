# JS API 레퍼런스 — 코티지보드

최종 갱신: 2026-07-05 (window.buildBarsInCard 추가)

---

## window.CottageDB (supabase-client.js)

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
| `recordGamePlay(...)` | 플레이 기록 저장 |
| `deleteGamePlay(id)` | 플레이 기록 삭제 |
| `updateGamePlay(id, fields)` | 플레이 기록 수정 |
| `getGamePlayRecords(gameId, limit)` | 게임 플레이 기록 조회. `gameId`는 단일 값 또는 배열 (배열 시 `.in()` 쿼리) |
| `getGroupNames()` | 그룹명 목록 조회 |
| `getPlayerNames()` | 참여자 이름 목록 조회 (조합+개별) |
| `getAllPlayRecordsForHistory(limit)` | 모임별 기록 전체 조회 |
| `getAllPlayRecordsForHub(options)` | 기록 허브 전체 조회 |
| `getGamePlayCount(gameId)` | 게임 플레이 건수. `gameId` 배열 지원 |
| `getPlayHighlights(gameId)` | 플레이 하이라이트. `gameId` 배열 지원 |
| `getPlayReviewsByGame(gameId, limit)` | game_play_records에서 review_text IS NOT NULL인 기록. `gameId` 배열 지원 |
| `getGameComments(gameKey)` | 게임 코멘트 조회 |
| `insertComment(...)` | 코멘트 등록 |
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
| `upsertProfile(userId, nickname, realName, visitCount)` | 프로필 upsert + 방문 카운트 + 시간 반영 |
| `getAllProfiles()` | 전체 프로필 (어드민용) |
| `checkNicknameAvailable(nickname, userId)` | 닉네임 중복 확인 |
| `getPageAnalytics()` | 페이지 분석 (어드민용) |
| `getEventCounts(eventTypes[], daysBack=7)` | page_events에서 지정 이벤트 타입들의 최근 N일 로우 반환 `[{event_type, created_at}]`. admin/localhost 제외 없음(쿼리 전용) |
| `getPageViewCounts(page, daysBack=7)` | page_views에서 특정 page의 최근 N일 로우 반환 `[{created_at}]`. 관리자 이벤트 퍼널의 "메인 방문" 단계용(143차-160) — page_events가 아니라 page_views 기준임에 유의 |
| `getMyStats(userId, nickname)` | 내 활동 통계 |
| `getMyNotifications(userId, nickname, notifSeenAt)` | 최근 알림 목록 반환. 각 항목에 `isNew: created_at > notifSeenAt` 포함. ①태그된 기록(최근20) ②궁금해요 게임 코멘트(최근20) ③구매완료(최근10) ④new_game(newGameSeenAt 이후 추가된 게임). notifSeenAt=null이면 isNew=true(전체 기간). 반환: `[{type, ..., isNew}]` |
| `getGameReviews(gameId)` | 게임 리뷰 조회 |
| `insertGameReview(...)` | 게임 리뷰 등록 |
| `deleteGameReview(id)` | 게임 리뷰 삭제 |
| `banUser(userId)` / `unbanUser(userId)` | 차단/해제 |
| `deletePlayPhoto(recordId)` | 기록 사진 삭제 |
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
| `getUserTasteProfile(userId)` | `{nickname, photo_url, bio, avoid_tags, likedGames, curiousGames}` — 다른 플레이어 취향보드 시트용 |
| `addGamePref(userId, gameId, customName, table)` | 취향보드: game_likes 또는 game_curious에 항목 추가. gameId/customName 중 하나만 필요 |
| `removeGamePref(userId, gameId, customName, table)` | 취향보드: 항목 삭제 |
| `getCustomPrefSuggestions()` | 취향보드: 두 테이블 전체에서 distinct custom_name 목록 반환 |
| `updateUserBio(userId, bio)` | profiles.bio 업데이트 — 취향보드/회원 자기소개/모임 보드가 공유하는 한줄소개 SSOT. 한쪽에서 호출하면 나머지 모든 화면에 즉시 반영됨 |
| `updateUserAvoidTags(userId, tags)` | profiles.avoid_tags (text[]) 업데이트 |
| `getMeetingVotes(startDate, endDate)` | 모임 플래너: 날짜 범위 내 전체 투표 조회. startDate/endDate: 'YYYY-MM-DD' |
| `upsertMeetingVote(userId, nickname, voteDate, timeStart, timeEnd)` | 모임 플래너: 가능 시간 등록/수정. UNIQUE(vote_date, user_id) upsert |
| `deleteMeetingVote(userId, voteDate)` | 모임 플래너: 등록 취소 |
| `getMeetingProfile(userId)` | 모임 보드/자기소개 편집용. profiles.bio + member_intros + meeting_game_prefs(want_this_time, can_explain_rules) 통합 조회 → `{bio, nickname, location, available, travelRange, meetingStyle, favoriteGames, cardColor, wantGames, ruleGames}` |
| `getUserMeetingProfile(userId)` | 다른 유저 모임 보드 읽기 전용 조회 (`openOtherMeetingSheet`용). getUserTasteProfile과 동일 패턴 |
| `upsertMeetingIntro(userId, fields)` | member_intros upsert (`onConflict:'user_id'`). 유저당 1행 보장. fields에 전달한 키만 갱신 |
| `addMeetingGamePref(userId, listType, gameId, customName)` / `removeMeetingGamePref(...)` | meeting_game_prefs 추가/삭제. listType: `'want_this_time'` \| `'can_explain_rules'`. addGamePref/removeGamePref와 동일 구조 |
| `getMeetingVoteGames(startDate, endDate)` | 모임 플래너 날짜별 게임 선호 조회. → `[{vote_date, user_id, list_type, game_id, custom_name}]`. getMeetingVotes와 동일 패턴 |
| `addMeetingVoteGame(userId, voteDate, listType, gameId, customName)` | meeting_vote_games 추가. listType: `'want'`\|`'learn'`. 중복(23505) 성공 처리. addMeetingGamePref와 동일 구조 + voteDate |
| `removeMeetingVoteGame(userId, voteDate, listType, gameId, customName)` | meeting_vote_games 삭제. removeMeetingGamePref와 동일 구조 + voteDate |

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
| `openProfilePanel(autoSubsheet?)` | 내 활동 패널 열기 (로그인 상태에서만 동작). autoSubsheet: `'taste'\|'records'\|'usage'\|'meeting'\|'voucher'` |
| `openOtherProfileSheet(userId)` | 다른 유저 취향 보드 읽기 전용 시트 (142차-44) |
| `openOtherMeetingSheet(userId)` | 다른 유저 모임 보드 읽기 전용 시트. 회원 자기소개(club-intro.html) 카드 클릭 시 진입점. 본인 `.profile-panel`/`.profile-subsheet`와 동일 마크업의 읽기 전용 메인패널+서브시트 2단 구조 — 뒤로가기로 그 유저의 "내 보드" 메인 패널(취향보드/모임보드 카드만 노출) 확인 가능, ✕로 전체 닫기. 본인 클릭 시 `openProfilePanel('meeting')`으로 위임 |

---

## window.escH (supabase-client.js)

HTML 특수문자 이스케이프. 전체 파일에서 공용.

```js
window.escH = (s) => String(s ?? '').replace(/[&<>"']/g, ...)
```

---

## window.resizeImageFile (supabase-client.js)

업로드 전 이미지 리사이즈. 1200px, JPEG 0.85. play-records-utils.js에서 `window.resizeImageFile?.(file)`로 optional call.

---

## 공유 유틸 (play-records-utils.js)

| 함수 | 용도 | 사용처 |
|------|------|--------|
| `parsePhotoUrls(raw)` | photo_url 문자열 → URL 배열 | game-reviews.js, club-history.html |
| `buildPhotoHtml(urls)` | 사진 썸네일 HTML 생성 | 동일 |
| `openLightbox(urls, idx)` | 전체화면 라이트박스 | 동일 |
| `attachAc(input, getSuggestions, onSelect, listRef)` | 자동완성 드롭다운 연결. getSuggestions=후보 배열 반환 함수, listRef=드롭다운 삽입 기준 DOM(없으면 input을 새 div로 감쌈) | game-reviews.js |
| `initTagInput(wrap, hidden, initialValue, onAdd)` | 태그칩 입력 컴포넌트. wrap=컨테이너, hidden=값 동기화할 hidden input, initialValue=초기값 배열, onAdd=태그 추가 콜백 | game-reviews.js |
| `buildPhotoItemAdder(grid, files)` | 사진 추가 UI 컴포넌트 | game-reviews.js |
| `toInitials(name)` | 이름 이니셜 변환 | game-reviews.js |
| `hangulMatch(query, target)` | 한글 초성 검색 | game-reviews.js |

---

## game-sheet.js 내부 헬퍼

| 함수 | 용도 |
|------|------|
| `_gameIds(gameKey)` | gameKey → `[gameKey]` 또는 `[gameKey, bggId]` 배열 반환. game_id가 gameKey와 BGG ID 두 가지로 저장될 수 있어 CottageDB 조회 시 배열로 전달하여 `.in()` 쿼리 처리 |
| `_fetchGamePhotos(gameKey)` | 해당 게임 플레이 기록에서 사진 URL 목록 추출 |

---

## window.CottageGameView / window.COTTAGE_GAMES (game-display-adapter.js)

| 전역 | 내용 |
|------|------|
| `window.CottageGameView` | gameData → 화면 출력용 view 함수 모음 |
| `window.COTTAGE_GAMES` | 게임 플랫 배열 `{id, bggId, display, titleKo, titleEn}`. 게임명 자동완성용 |
| `window.getAllGamesArray` | `getAllGamesArray(gameData)` 직접 참조용 편의 노출. index-page.js / owned-games-page.js가 전역으로 직접 호출. `CottageGameView.getAllGamesArray`와 동일 함수 |

---

## window.COTTAGE_PAGE_LABELS / window.COTTAGE_PAGE_LABELS_BY_PATH (page-labels.js)

페이지 경로 → 한글 라벨 매핑 단일 소스. 구 script.js(현 script-nav.js)의 PAGE_LABELS(pathname 키, 세션 트래커용)와 requests-admin.html의 PAGE_LABEL(slug 키, 분석 대시보드 표시용)이 별도 하드코딩이라 about.html 개명 시 드리프트가 발생했던 것을 통합(143차-161).

| 전역 | 키 형식 | 용도 |
|------|--------|------|
| `window.COTTAGE_PAGE_LABELS` | slug (예: `'about'`) | requests-admin.html — `page_views.page`(slug 저장) 표시용 |
| `window.COTTAGE_PAGE_LABELS_BY_PATH` | pathname (예: `'/pages/info/about.html'`) | script-nav.js — `page_sessions.page`에 저장될 한글 라벨 자체를 동기 평가로 만들 때 사용 |

두 맵은 같은 페이지라도 값이 다를 수 있음(예: `game-reviews`는 "플레이 기록" vs "기록 보기") — 기존부터 그랬던 것이라 통합 시에도 의도적으로 보존함. **`script-nav.js`가 로드 시점에 동기 평가하므로, page-labels.js는 반드시 script-nav.js 로드 직전에 위치해야 함** (14개 HTML 전체 적용 완료).

---

## window._cottageSessionStart (supabase-client.js)

현재 세션 시작 시각 (Date.now() 값). `startSession()` 및 `visibilitychange` 탭 복귀 시 set. `kakao-auth.js`의 `openProfilePanel`에서 현재 세션 경과 시간 계산에 사용.

내부 cross-file 전역 — 외부 페이지에서 직접 호출하지 않음.

---

## 크로스파일 의존관계 (전역 변수 전체)

| 전역 | 정의 파일 | 사용 파일 |
|------|----------|----------|
| `window.CottageDB` | supabase-client.js | script-nav.js, game-sheet.js, kakao-auth.js, game-reviews.js, index-page.js, club-history.html, requests-admin.html 등 |
| `window._cottageSess` | supabase-client.js | kakao-auth.js |
| `window._cottageSessionStart` | supabase-client.js | kakao-auth.js |
| `window.escH` | supabase-client.js | 전체 |
| `window.resizeImageFile` | supabase-client.js | play-records-utils.js (optional) |
| `window.getKakaoUser` | kakao-auth.js | script-nav.js, game-sheet.js, game-reviews.js, supabase-client.js, requests.html 등 |
| `window.kakaoLogin` | kakao-auth.js | game-reviews.js, 각 페이지 |
| `window.kakaoLogout` | kakao-auth.js | 각 페이지 |
| `window.promptNicknameChange` | kakao-auth.js | 각 페이지 |
| `window.isOwner` | kakao-auth.js | requests-admin.html |
| `window.parsePhotoUrls` | play-records-utils.js | game-reviews.js, club-history.html |
| `window.buildPhotoHtml` | play-records-utils.js | game-reviews.js, club-history.html |
| `window.openLightbox` | play-records-utils.js | game-reviews.js, club-history.html |
| `window.attachAc` | play-records-utils.js | game-reviews.js |
| `window.initTagInput` | play-records-utils.js | game-reviews.js |
| `window.toInitials` | play-records-utils.js | game-reviews.js |
| `window.hangulMatch` | play-records-utils.js | game-reviews.js |
| `window.checkAchievements` | achievements.js | supabase-client.js (recordGamePlay, submitRating 후 호출) |
| `window.CottageAchievements` | achievements.js | kakao-auth.js (패널 섹션 빌드). 노출: checkAchievements, buildCodexSection, buildCharacterSection, buildAchievementsSection, handleRepCardSelect, buildTitleSection (→ `{html,earnedIds}`), handleRepTitleSelect, getTitleById(id), getCharacterPath(achId), getCharacterName(achId), fetchUserStats(userId, nickname), findNextAchievement(preStats) → `{emoji,name,gap,unit}` or null |
| `window.gameData` | cottage-games-data-output.js | game-display-adapter.js, game-sheet.js, owned-games-page.js, index-page.js |
| `window.COTTAGE_GAMES` | game-display-adapter.js | game-reviews.js |
| `window.CottageGameView` | game-display-adapter.js | game-sheet.js, owned-games-page.js, index-page.js |
| `window.getAllGamesArray` | game-display-adapter.js | index-page.js, owned-games-page.js |
| `window.SUPABASE_CONFIG` | supabase-config.js | supabase-client.js |
| `window.COTTAGE_PAGE_LABELS` / `window.COTTAGE_PAGE_LABELS_BY_PATH` | page-labels.js | script-nav.js, requests-admin.html (script-nav.js 로드 직전 필수) |
| `window.renderDayDetailHTML` | day-detail.js | 일정 상세 블록 HTML 반환 `({ date, timeStart, timeEnd, wantGames, learnGames })`. 모달/인라인 공용. |
| `window.openDayDetailModal` | day-detail.js | 레거시 — 직접 데이터 전달 방식으로 개인 일정 모달 열기 `(opts)`. |
| `window.openDateScheduleModal` | day-detail.js | 막대 클릭 → DB 조회 후 개인 일정 모달 `(userId, voteDate)`. club-schedule.html에서 호출. |
| `window.openDateMeetingModal` | day-detail.js | 날짜 전체 집계 모달 `(voteDate, votes, voteGames, opts?)`. 홈 미리보기 카드 클릭 시 index-page.js에서 호출. |
| `window.buildBarsInCard` | day-detail.js | 주간 카드/홈 미리보기 시간 막대 HTML 반환 `(dayVotes, voteGames, myVote)`. myVote=null이면 is-mine 강조·수정삭제 버튼 없음. club-schedule.html·index-page.js에서 호출. |
- 관리자/로컬 제외 기준은 유지한다.
