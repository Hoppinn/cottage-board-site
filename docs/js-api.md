# JS API 레퍼런스 — 코티지보드

최종 갱신: 2026-07-15 (Stage 3 UX 개편 — 확인창 `_openJoinConfirm` + 사진 세션참여, game-reviews 잠금폼 제거)

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
| `getMyNotifications(userId, nickname, notifSeenAt)` | 최근 알림 목록 반환. 각 항목에 `isNew: created_at > notifSeenAt` 포함. ①태그된 기록(최근20) ②궁금해요 게임 코멘트(최근20) ③구매완료(최근10) ④new_game(newGameSeenAt 이후 추가된 게임) ⑤new_intro(타인 소개글, 로그인 회원 전체 수신, `{type:'new_intro', count, names, firstUserId, date, isNew}`). notifSeenAt=null이면 isNew=true(전체 기간). 반환: `[{type, ..., isNew}]` |
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
| `getUserTasteProfile(userId)` | `{nickname, photo_url, bio, avoid_tags, likedGames, curiousGames}` — 다른 플레이어 취향보드 시트용. **Phase C 통합 후 미사용(dead)** — 읽기전용 보드는 `openProfilePanel(_, {readOnly})`가 `getMyStats`/`getMeetingProfile`로 직접 조회. 정리 후보 |
| `addGamePref(userId, gameId, customName, table)` | 취향보드: game_likes 또는 game_curious에 항목 추가. gameId/customName 중 하나만 필요 |
| `removeGamePref(userId, gameId, customName, table)` | 취향보드: 항목 삭제 |
| `getCustomPrefSuggestions()` | 취향보드: 두 테이블 전체에서 distinct custom_name 목록 반환 |
| `updateUserBio(userId, bio)` | profiles.bio 업데이트 — 취향보드/회원 자기소개/모임 보드가 공유하는 한줄소개 SSOT. 한쪽에서 호출하면 나머지 모든 화면에 즉시 반영됨 |
| `updateUserAvoidTags(userId, tags)` | profiles.avoid_tags (text[]) 업데이트 |
| `getMeetingVotes(startDate, endDate)` | 모임 플래너: 날짜 범위 내 전체 투표 조회. startDate/endDate: 'YYYY-MM-DD' |
| `upsertMeetingVote(userId, nickname, voteDate, timeStart, timeEnd)` | 모임 플래너: 가능 시간 등록/수정. UNIQUE(vote_date, user_id) upsert |
| `deleteMeetingVote(userId, voteDate)` | 모임 플래너: 등록 취소. **cascade**: 같은 user_id+vote_date의 `meeting_vote_games`(하고싶은/배우고싶은 게임)도 함께 삭제 — 참여 취소 시 orphan 게임 방지 |
| `getMeetingProfile(userId)` | 모임 보드/자기소개 편집용. profiles.bio + member_intros + game_likes(getUserLikedGamesAll) + game_curious(getUserCuriousGamesAll) + meeting_game_prefs(can_explain_rules만) 통합 조회 → `{bio, nickname, location, available, travelRange, meetingStyle, favoriteGames, cardColor, likedGames, curiousGames, ruleGames}` (2026-07-09: wantGames → likedGames/curiousGames 미러링 전환) |
| `getUserMeetingProfile(userId)` | 다른 유저 모임 보드 읽기 전용 조회. getUserTasteProfile과 동일 패턴. **Phase C 통합 후 미사용(dead)** — 읽기전용 모임 보드도 `getMeetingProfile(userId)` 재사용. 정리 후보 |
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
| `openProfilePanel(autoSubsheet?, opts?)` | 프로필 보드 열기. `autoSubsheet`: `'taste'\|'records'\|'usage'\|'meeting'\|'voucher'`(자동 진입할 서브시트). **`opts={userId, readOnly}`** (Phase C): `readOnly:true`면 대상 `userId`의 **공개 보드를 편집 컨트롤 없이** 표시(비공개 섹션=알림·교환권·함께한 시간 제외, 로그인 없이도 조회 가능). readOnly=false(기본)면 종전대로 `getKakaoUser()` 기준 내 보드(버튼 재클릭 토글). 편집 HTML은 내부 `_ro()`로 생략, `.profile-panel--readonly`/`.profile-subsheet--readonly` 클래스 부여 |
| `openOtherProfileSheet(userId)` | **Phase C: 얇은 래퍼** → `openProfilePanel('taste', {userId, readOnly:true})` (본인이면 편집 가능한 내 보드). 구 `.other-profile-overlay` 별도 시트 제거 |
| `openOtherMeetingSheet(userId)` | **Phase C: 얇은 래퍼** → `openProfilePanel('meeting', {userId, readOnly:true})` (본인이면 `openProfilePanel('meeting')`). 회원 자기소개(club-intro.html)·모임 참여자(club-schedule.html) 닉네임 클릭 진입점. 구 otherMainPanel/`_openOtherMeetingSubSheet` 2단 구조 제거 |

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
| `openLightbox(urls, idx, opts)` | 전체화면 라이트박스. opts: captions[]/caption, onDelete+deletable[], **gameThumbs[]**(사진별 게임 표지 URL, 좌하단 표시)+**gameKeys[]**+**onGameClick(key)**(썸네일 클릭 시) | 동일, kakao-auth.js(기록보드 사진) |
| `attachAc(input, getSuggestions, onSelect, listRef)` | 자동완성 드롭다운 연결. getSuggestions=후보 배열 반환 함수, listRef=드롭다운 삽입 기준 DOM(없으면 input을 새 div로 감쌈) | game-reviews.js |
| `initTagInput(wrap, hidden, initialValue, onAdd)` | 태그칩 입력 컴포넌트. wrap=컨테이너, hidden=값 동기화할 hidden input, initialValue=초기값 배열, onAdd=태그 추가 콜백 | game-reviews.js |
| `buildPhotoItemAdder(grid, files)` | 사진 추가 UI 컴포넌트 | game-reviews.js |
| `toInitials(name)` | 이름 이니셜 변환 | game-reviews.js |
| `hangulMatch(query, target)` | 한글 초성 검색 | game-reviews.js |

---

## game-sheet.js 내부 헬퍼

| 함수 | 용도 |
|------|------|
| `openGameSheet(gameKey, restoreScroll, fromKey)` | 게임 정보시트 열기. **미보유 게임**(`gameData[gameKey]` 없음)이면 정보시트가 없으므로 `openGameRecordSheet(gameKey)`로 리다이렉트(gameKey가 비어있지 않은 문자열일 때만). DOM(gameSheet/gameSheetContent) 없으면 무반응. → 모든 openGameSheet 호출처가 미보유를 한 지점에서 처리하는 단일 진입점 |
| `openGameRecordSheet(gameKey)` | 게임 기록시트(좋아요/궁금해요/게임평/사진/플레이기록). `game` 널이어도 제목·이미지·rating 폴백으로 렌더(미보유 지원). 미보유면 "← 게임 정보" 버튼 대신 `.sheet-unowned-badge`("🚫 미보유·게임정보 없음") 표시. 좋아요·게임평 등은 `_gameIds(gameKey)`(미보유는 슬러그 단건)로 조회 |
| `_gameIds(gameKey)` | gameKey → `[gameKey]` 또는 `[gameKey, bggId]` 배열 반환. game_id가 gameKey와 BGG ID 두 가지로 저장될 수 있어 CottageDB 조회 시 배열로 전달하여 `.in()` 쿼리 처리 |
| `_fetchGamePhotos(gameKey)` | 해당 게임 플레이 기록에서 사진 URL 목록 추출 |
| `_getMyUnlinkedPlayRecords(gameKey)` | 게임평↔플레이기록 연동 공용 조회. `{all, unreviewed}` 반환 — all=내 기록 전체, unreviewed=후기(review_text) 없는 것만. `onOpenCommentInput`(작성 시 체크박스 연동)과 `onLinkCommentToPlay`(사후 연동) 양쪽이 공유 |
| `onOpenCommentInput(btn)` | 게임평 작성 모달. "연동" select = 내 후기없는 기록(value=id) + 남의 세션(`data-join`, `modal._joinSessions`, `data-rec-ids`). `all.length`→`modal._myRecordCountAtOpen` 캐시(넛지 판정). `btn.dataset.recordId` 있으면(⋯메뉴 특정 기록 진입) `_preselectLinkOption`으로 그 기록/세션을 기본 체크+선택 |
| `_preselectLinkOption(linkCheck, linkSelect, recordId)` | ⋯메뉴 특정 기록에서 모달 진입 시 그 기록을 "연동" 기본값으로: select에서 value===recordId(내 기록) 또는 `data-join`+`data-rec-ids`에 recordId 포함(남 세션) 옵션을 찾아 체크박스 ON+선택. 게임평·사진 모달 공용 |
| `onLinkCommentToPlay(btn)` | 기존 게임평(코멘트) → 내 플레이기록 사후 연동. 후기 없는 내 기록이 있으면 `getOrCreateCommentModal()`을 link-mode로 재사용(`modal.dataset.linkCommentId` 설정, 텍스트 readonly 프리필, 기록 select 강제 표시). 내 기록 없으면 `_getOthersSessions` 조회 → 있으면 `_openJoinConfirm`(확인창 → 즉시 참여, 원본 코멘트 이동), 없으면 game-reviews.html?tab=input 빈 입력 넛지 |
| `onSubmitCommentModal()` | link-mode(`linkCommentId`)면 `updateGamePlay`+원본 `deleteComment`. select 연동 분기: `join:` 옵션이면 세션 필드 복사한 `recordGamePlay`(남 세션 참여), 내 기록 id면 `updateGamePlay(review_text)`, 미선택이면 `insertComment`. 셋 다 아니고 내 기록 0개면 남 세션 있을 때 `_openJoinConfirm`(방금 쓴 게임평 이동), 없으면 넛지 토스트 |
| `_getOthersSessions(gameKey)` | 남의 세션에 내 후기/사진으로 참여: `getGamePlayRecords(_gameIds)`에서 내 기록 제외 + `group_name\|played_at\|player_count\|player_names` 키로 dedupe + 최신순 정렬. 각 세션에 `rec_ids`(그 세션 기록 id들, 프리셀렉트 매칭용) 포함. 그룹·날짜 둘 다 없는 기록은 세션으로 안 봄 |
| `_openJoinConfirm(gameKey, sessions, reviewText, sourceCommentId?)` | 남의 세션에 내 후기로 참여(1안 = 확인창, 입력폼·페이지이동 없음). `#sheetJoinModal`(세션 정보+후기 미리보기, 세션 여러 개면 select) → [남기기] 시 세션 필드(게임·인원·참여자·그룹·날짜) 그대로 복사한 `recordGamePlay`로 내 새 기록 생성 → 모임별·게임별 뷰 모두 같은 세션에 nest. `sourceCommentId` 있으면 성공 후 `deleteComment`(후기 이동=중복 방지). 완료 후 `initSheetComments`/`Preview`/`initPlayWidget` 갱신 |
| `onOpenPhotoInput(btn)` / `onSubmitPhotoModal()` | 사진 남기기 모달. "연동" select = 내 기록(선택 시 `updateGamePlay`로 photo_url 병합) + **남의 세션**(`data-join="1"`, `data-rec-ids`, `modal._joinSessions`; 선택 시 세션 필드 복사한 `recordGamePlay`로 내 새 사진 기록 = 세션 참여). `btn.dataset.recordId` 있으면 `_preselectLinkOption`으로 기본 연동. 미연동이면 사진만 담은 새 기록 생성 |
| `initPlayWidget(gameKey)` 기록별 ⋯메뉴 | 게임(기록)시트 플레이위젯의 각 기록 항목에 `.sheet-rec-more`(⋯) 인라인 확장 메뉴 — `💬 게임평 추가`(`onOpenCommentInput`)·`📷 사진 추가`(`onOpenPhotoInput`), 버튼에 `data-game-id`+`data-record-id` → 그 기록/세션이 모달 "연동" 기본값으로. `.sheet-play-box{overflow:hidden}` 클리핑 회피 위해 절대배치 드롭다운 대신 인라인 확장(`.sheet-rec-more-actions.is-open`) |

---

## window.CottageGameView / window.COTTAGE_GAMES (game-display-adapter.js)

| 전역 | 내용 |
|------|------|
| `window.CottageGameView` | gameData → 화면 출력용 view 함수 모음 |
| `window.COTTAGE_GAMES` | 게임 플랫 배열 `{id, bggId, display, titleKo, titleEn, abbr, bestPlayers, recPlayers}`. 게임명 자동완성·인원 조건 표시용.<br>`abbr` 결정 3단계 (build-output.js): ① `game-abbr.json[bggId]` → ② `game-abbr-byname.json[ownedName]` → ③ `titleKo.slice(0,2)` 폴백.<br>`bestPlayers`/`recPlayers`: gameData.bgg.bestPlayers/recommendedPlayers 배열 원본. 데이터 없으면 `null`. `window.formatCondLabel`이 소비.<br>**abbr 소비처**: 막대 라벨(`resolveGameAbbr` in day-detail.js:918), 룰렛 휠 SVG(day-detail.js:778,789), 룰렛 후보 wantGameMap(day-detail.js:622), 룰렛 수동 추가(day-detail.js:829). 모든 소비처는 `COTTAGE_GAMES[i].abbr` 우선 → 없으면 `titleKo.slice(0,2)` 로컬 폴백. `#` 접두 제거(`replace(/^#/,'')`) 후 slice 필수 — c0a495c(bar), 8052782(roulette)에서 각각 수정됨. |
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

## 전역 커스텀 이벤트

| 이벤트 | 발화 | 수신 | detail |
|--------|------|------|--------|
| `cottage-likes-changed` | 좋아요/궁금해요 원천(game_likes/game_curious) 변경 시. 발화 지점: ①게임시트 버튼(game-sheet.js `emitLikesChanged`, `onSheetLike`/`onSheetCurious` — 상호배타로 반대 목록 제거 시에도 별도 발화) ②취향보드 추가/삭제(kakao-auth.js `_emitLikesChanged`) ③모임보드 "좋아하는 게임에도 추가"(kakao-auth.js) | 취향보드(열려있으면 목록 추가/삭제·카운트 갱신) / 모임보드(`_likedSlugSet`/`_curiousSlugSet` 갱신 후 `_renderWeekList`로 ❤️/👀 마커 즉시 반영). 수신 핸들러는 `window.__tasteLikesHandler`/`window.__mbLikesHandler`로 dedupe + 서브시트 DOM 이탈 시 self-remove | `{ table:'game_likes'\|'game_curious', gameId(슬러그 문자열), added:bool }` |

> `gameId`는 항상 game_likes 슬러그. 모임 수신부는 `_mbSlug()`로 정규화 후 슬러그 Set과 매칭. game-reviews.js(기록 iframe)의 `onPrMenuLike/Curious`는 별도 window 컨텍스트라 이 이벤트 미발화(Phase A 범위 밖).

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
| `window.COTTAGE_GAMES` | game-display-adapter.js | game-reviews.js, day-detail.js |
| `window.formatCondLabel` | day-detail.js | club-schedule.html (Step 3 칩) |
| `window.CottageGameView` | game-display-adapter.js | game-sheet.js, owned-games-page.js, index-page.js |
| `window.getAllGamesArray` | game-display-adapter.js | index-page.js, owned-games-page.js |
| `window.SUPABASE_CONFIG` | supabase-config.js | supabase-client.js |
| `window.COTTAGE_PAGE_LABELS` / `window.COTTAGE_PAGE_LABELS_BY_PATH` | page-labels.js | script-nav.js, requests-admin.html (script-nav.js 로드 직전 필수) |
| `window.renderDayDetailHTML` | day-detail.js | 일정 상세 블록 HTML 반환 `({ date, timeStart, timeEnd, wantGames, learnGames })`. 모달/인라인 공용. |
| `window.openDayDetailModal` | day-detail.js | 레거시 — 직접 데이터 전달 방식으로 개인 일정 모달 열기 `(opts)`. |
| `window.openDateScheduleModal` | day-detail.js | 막대 클릭 → DB 조회 후 개인 일정 모달 `(userId, voteDate)`. club-schedule.html에서 호출. |
| `window.openDateMeetingModal` | day-detail.js | 날짜 전체 집계 모달 `(voteDate, votes, voteGames, opts?)`. 홈 미리보기 카드 클릭 시 index-page.js에서 호출. |
| `window.buildBarsInCard` | day-detail.js | 주간 카드/홈 미리보기 시간 막대 HTML 반환 `(dayVotes, voteGames, myVote)`. myVote=null이면 is-mine 강조·수정삭제 버튼 없음. club-schedule.html·index-page.js에서 호출. |
| `window.openDatePreviewModal` | day-detail.js | 하루치 미리보기 센터모달 `(dateStr, dayVotes, dayGames, myVote?, onChange?)` — buildBarsInCard 재사용, 그날 참여자 막대그래프. 우상단 ✕로 닫기. 내 막대 ✎=플래너 편집(그 날, onDirtyClose=onChange)/✕=참여 취소(deleteMeetingVote 후 onChange). onChange=변경 후 호출(모임보드는 `_loadMeetingWeek` 전달). 모임보드 "자세히"에서 호출. |
| `window.openPlannerModal` | day-detail.js | **공용** 모임 플래너 센터모달(전 페이지). `(opts)`: `weekOffset`(주차), `register`/`edit`(date), `onDirtyClose`(저장 후 닫힘 콜백). club-schedule.html?embed=true를 iframe으로 띄우고 open 시 목표 상태 전체 선언(cottage-reset-week/register/edit). 모임보드 "✎ 편집"에서 호출. |
| `window.formatCondLabel` | day-detail.js | `(cond, game_id)` → 인원 조건 표시 문자열. `'best'`/`'recommended'`는 COTTAGE_GAMES에서 실제 인원 배열 조회 후 포맷(`베스트 4인` / `추천 3~4인` / `베스트 3·5·6·8인`). 데이터 없으면 `베스트인원`/`추천인원` 폴백. `'any'`→`''`. `'2'`/`'3'`/`'4'`/`'5+'`→`'N인'`. club-schedule.html Step 3 칩 레이블에서 호출. |
- 관리자/로컬 제외 기준은 유지한다.
