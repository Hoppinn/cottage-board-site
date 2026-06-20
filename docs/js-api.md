# JS API 레퍼런스 — 코티지보드

최종 갱신: 2026-06-20 (136차: initTagInput 시그니처, COTTAGE_GAMES 필드, getMyNotifications new_game, openProfilePanel 추가)

---

## window.CottageDB (supabase-client.js)

| 함수 | 용도 |
|------|------|
| `trackView(gameId)` | 게임 조회수 기록 |
| `trackPageView(page, referrer = null)` | 페이지 뷰 기록 (하루 1회). referrer: utm_source 또는 외부 hostname — page_views.referrer에 저장 |
| `trackEvent(eventType, opts = {})` | 이벤트 기록 — page_events 테이블 insert. admin/localhost 자동 제외, referrer는 `cottage_orig_src_{date}`에서 자동 읽음. opts: `{ game_id? }` |
| `getGameRating(gameId)` | 별점 평균+건수 조회 |
| `submitRating(gameId, rating)` | 별점 제출 |
| `getMyRating(gameId)` | 내 별점 (localStorage) |
| `getPopularGames(limit)` | 인기 게임 (RPC) |
| `getAllGameRatings()` | 전체 게임 별점 요약 (RPC) |
| `uploadPlayPhoto(file, userId)` | 사진 Storage 업로드 |
| `recordGamePlay(...)` | 플레이 기록 저장 |
| `deleteGamePlay(id)` | 플레이 기록 삭제 |
| `updateGamePlay(id, fields)` | 플레이 기록 수정 |
| `getGamePlayRecords(gameId)` | 단일 게임 플레이 기록 조회 |
| `getGroupNames()` | 그룹명 목록 조회 |
| `getPlayerNames()` | 참여자 이름 목록 조회 (조합+개별) |
| `getAllPlayRecordsForHistory(limit)` | 모임별 기록 전체 조회 |
| `getAllPlayRecordsForHub(options)` | 기록 허브 전체 조회 |
| `getGamePlayCount(gameId)` | 게임 플레이 건수 |
| `getPlayHighlights(gameId)` | 플레이 하이라이트 |
| `getPlayReviewsByGame(gameId)` | game_play_records에서 review_text IS NOT NULL인 기록 조회 (게임 상세 코멘트 연동용) |
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
| `getUserLikedGames(userId)` | 유저가 따봉(❤️)한 game_id 배열 반환 |
| `getUserCuriousGames(userId)` | 유저가 궁금해요(🤔)한 game_id 배열 반환 |

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
| `openProfilePanel()` | 내 활동 패널 열기 (로그인 상태에서만 동작) |

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

## window.CottageGameView / window.COTTAGE_GAMES (game-display-adapter.js)

| 전역 | 내용 |
|------|------|
| `window.CottageGameView` | gameData → 화면 출력용 view 함수 모음 |
| `window.COTTAGE_GAMES` | 게임 플랫 배열 `{id, bggId, display, titleKo, titleEn}`. 게임명 자동완성용 |
| `window.getAllGamesArray` | `getAllGamesArray(gameData)` 직접 참조용 편의 노출. index-page.js / owned-games-page.js가 전역으로 직접 호출. `CottageGameView.getAllGamesArray`와 동일 함수 |

---

## window._cottageSessionStart (supabase-client.js)

현재 세션 시작 시각 (Date.now() 값). `startSession()` 및 `visibilitychange` 탭 복귀 시 set. `kakao-auth.js`의 `openProfilePanel`에서 현재 세션 경과 시간 계산에 사용.

내부 cross-file 전역 — 외부 페이지에서 직접 호출하지 않음.

---

## 크로스파일 의존관계 (전역 변수 전체)

| 전역 | 정의 파일 | 사용 파일 |
|------|----------|----------|
| `window.CottageDB` | supabase-client.js | script.js, kakao-auth.js, game-reviews.js, index-page.js, club-history.html, requests-admin.html 등 |
| `window._cottageSess` | supabase-client.js | kakao-auth.js |
| `window._cottageSessionStart` | supabase-client.js | kakao-auth.js |
| `window.escH` | supabase-client.js | 전체 |
| `window.resizeImageFile` | supabase-client.js | play-records-utils.js (optional) |
| `window.getKakaoUser` | kakao-auth.js | script.js, game-reviews.js, supabase-client.js, requests.html 등 |
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
| `window.CottageAchievements` | achievements.js | kakao-auth.js (패널 섹션 빌드). 노출: checkAchievements, buildCodexSection, buildCharacterSection, buildAchievementsSection, handleRepCardSelect, buildTitleSection (→ `{html,earnedIds}`), handleRepTitleSelect, getTitleById(id), getCharacterPath(achId), getCharacterName(achId) |
| `window.gameData` | cottage-games-data-output.js | game-display-adapter.js, script.js, owned-games-page.js, index-page.js |
| `window.COTTAGE_GAMES` | game-display-adapter.js | game-reviews.js |
| `window.CottageGameView` | game-display-adapter.js | script.js, owned-games-page.js, index-page.js |
| `window.getAllGamesArray` | game-display-adapter.js | index-page.js, owned-games-page.js |
| `window.SUPABASE_CONFIG` | supabase-config.js | supabase-client.js |
