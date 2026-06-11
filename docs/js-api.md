# JS API 레퍼런스 — 코티지보드

최종 갱신: 2026-06-12

---

## window.CottageDB (supabase-client.js)

| 함수 | 용도 |
|------|------|
| `trackView(gameId)` | 게임 조회수 기록 |
| `trackPageView(page)` | 페이지 뷰 기록 (하루 1회) |
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
| `startSession(userId)` | 체류 세션 시작 |
| `upsertProfile(userId, nickname, realName, visitCount)` | 프로필 upsert + 방문 카운트 + 시간 반영 |
| `getAllProfiles()` | 전체 프로필 (어드민용) |
| `checkNicknameAvailable(nickname, userId)` | 닉네임 중복 확인 |
| `getPageAnalytics()` | 페이지 분석 (어드민용) |
| `getMyStats(userId, nickname)` | 내 활동 통계 |
| `getGameReviews(gameId)` | 게임 리뷰 조회 |
| `insertGameReview(...)` | 게임 리뷰 등록 |
| `deleteGameReview(id)` | 게임 리뷰 삭제 |
| `banUser(userId)` / `unbanUser(userId)` | 차단/해제 |
| `deletePlayPhoto(recordId)` | 기록 사진 삭제 |
| `isUserBanned()` | 현재 유저 차단 여부 |
| `getProfilePhoto(userId)` | profiles.photo_url 단일 조회 |
| `getProfileSnapshot(userId)` | profiles.photo_url + nickname 단일 조회 (다기기 동기화용) |

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
| `promptProfileImageChange()` | 프로필 사진 변경 (프리셋 or 업로드) |
| `isOwner()` | OWNER_KAKAO_ID와 일치 여부 |

---

## window.escH (supabase-client.js)

HTML 특수문자 이스케이프. 전체 파일에서 공용.

```js
window.escH = (s) => String(s ?? '').replace(/[&<>"']/g, ...)
```

---

## window.resizeImageFile (supabase-client.js 또는 script.js)

업로드 전 이미지 리사이즈. 1200px, JPEG 0.85.

---

## 공유 유틸 (play-records-utils.js)

| 함수 | 용도 | 사용처 |
|------|------|--------|
| `parsePhotoUrls(raw)` | photo_url 문자열 → URL 배열 | game-reviews.js, club-history.html |
| `buildPhotoHtml(urls)` | 사진 썸네일 HTML 생성 | 동일 |
| `openLightbox(urls, idx)` | 전체화면 라이트박스 | 동일 |
| `attachAc(input, items, onSelect)` | 자동완성 드롭다운 연결 | game-reviews.js |
| `initTagInput(wrap, onUpdate)` | 태그칩 입력 컴포넌트 | game-reviews.js |
| `buildPhotoItemAdder(grid, files)` | 사진 추가 UI 컴포넌트 | game-reviews.js |
| `toInitials(name)` | 이름 이니셜 변환 | game-reviews.js |
| `hangulMatch(query, target)` | 한글 초성 검색 | game-reviews.js |
