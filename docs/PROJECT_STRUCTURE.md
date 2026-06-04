# PROJECT_STRUCTURE — 코티지보드 홈페이지 구조 문서

최종 갱신: 2026-06-04

---

## 1. 페이지 구조

```
/
├── index.html                      # 메인 (추천 게임, 인기 게임, 검색)
├── auth-callback.html              # 카카오 OAuth 리다이렉트 처리
├── pages/
│   ├── owned-games.html            # 전체 게임 목록 + 필터 + 바텀시트
│   ├── cottage/
│   │   ├── about.html              # 코티지보드 소개
│   │   ├── club.html               # 동호회 소개
│   │   ├── club-intro.html         # 동호회 멤버 소개
│   │   ├── club-schedule.html      # 일정 투표 & 확인
│   │   ├── club-meeting.html       # 모임 기록
│   │   ├── club-rules.html         # 동호회 규칙
│   │   ├── club-history.html       # 모임 기록 & 사진 (DB 연동)
│   │   └── game-reviews.html       # 플레이 기록 허브 (핵심 기능 페이지)
│   └── store/
│       ├── requests.html           # 게임/간식 요청 (로그인 필요)
│       ├── requests-admin.html     # 요청 관리 어드민 (오너 전용)
│       ├── price-rules.html        # 가격 & 규칙
│       └── game-location.html      # 게임 위치 안내
```

### 페이지별 인증 요구

| 페이지 | 인증 필요 | 오너 전용 |
|--------|----------|----------|
| index.html | 선택 (별점 등) | N |
| owned-games.html | 선택 (코멘트, 따봉) | N |
| game-reviews.html | 기록 입력 시 필수 | N |
| requests.html | 필수 | N |
| requests-admin.html | 필수 | **Y** |
| club-* | 대부분 선택 | N |

---

## 2. JS 파일 역할

```
assets/js/
├── supabase-config.js          # Supabase URL + anonKey 설정 (window.SUPABASE_CONFIG)
├── supabase-client.js          # DB 접근 모듈 (window.CottageDB 노출)
├── kakao-auth.js               # 카카오 로그인/로그아웃, 프로필, 세션 (window.getKakaoUser 등 노출)
├── script.js                   # 게임 바텀시트, 검색, 필터, 별점 위젯, 코멘트, 플레이기록 localStorage 헬퍼
└── game-display-adapter.js     # gameData → 화면 출력용 view adapter (CottageGameView)
```

### supabase-client.js가 노출하는 window.CottageDB API

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
| `getGamePlayCount(gameId)` | 게임 플레이 건수 |
| `getPlayHighlights(gameId)` | 플레이 하이라이트 |
| `getGameComments(gameKey)` | 게임 코멘트 조회 |
| `insertComment(...)` | 코멘트 등록 |
| `deleteComment(id)` | 코멘트 삭제 |
| `updateComment(id, text)` | 코멘트 수정 |
| `getGameLikeCount(gameId)` | 따봉 수 조회 |
| `toggleGameLike(gameId, userId)` | 따봉 토글 |
| `hasUserLiked(gameId, userId)` | 따봉 여부 확인 |
| `getGameDislikeCount(gameId)` | 비추 수 조회 |
| `toggleGameDislike(gameId, userId)` | 비추 토글 |
| `hasUserDisliked(gameId, userId)` | 비추 여부 확인 |
| `getVisitorStats()` | 방문자 통계 |
| `startSession(userId)` | 체류 세션 시작 |
| `upsertProfile(userId, nickname, realName)` | 프로필 upsert + 방문 카운트 + 시간 반영 |
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

### kakao-auth.js가 노출하는 전역 함수

| 함수 | 용도 |
|------|------|
| `getKakaoUser()` | localStorage에서 유저 객체 반환 |
| `kakaoLogin()` | 카카오 OAuth 리다이렉트 |
| `kakaoLogout()` | 로그아웃 (localStorage 삭제) |
| `promptNicknameChange()` | 닉네임 변경 다이얼로그 |
| `promptProfileImageChange()` | 프로필 사진 변경 (프리셋 or 업로드) |
| `isOwner()` | OWNER_KAKAO_ID와 일치 여부 |

---

## 3. DB 연동 구조 (Supabase)

### 테이블 목록

| 테이블 | 주요 컬럼 | 용도 |
|--------|----------|------|
| `game_views` | game_id, created_at | 조회수 트래킹 |
| `game_ratings` | game_id, rating, session_key | 별점 |
| `game_likes` | game_id, user_id | 따봉 |
| `game_dislikes` | game_id, user_id | 비추 |
| `game_comments` | game_key, comment_text, nickname, user_id | 코멘트 |
| `game_reviews` | game_id, content, nickname, user_id | 리뷰 |
| `game_play_records` | game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, **photo_url**, review_text | 플레이 기록 |
| `page_views` | page, created_at | 페이지 방문 |
| `page_sessions` | page, referrer, user_id, duration_sec, entered_at | 세션 분석 |
| `profiles` | user_id, nickname, real_name, last_seen_at, visit_count, total_minutes, is_banned | 유저 프로필 |
| `game_requests` | game_name, request_count, status, is_planned, user_id | 게임 요청 |
| `snack_requests` | item_name, request_count, user_id | 간식 요청 |
| `suggestions` | content, user_id, is_done, is_planned | 건의사항 |
| `play_highlights` | game_id, highlight_text | 플레이 하이라이트 |
| `game_request_votes` | request_id, user_id | 요청 투표 |
| `member_intros` | user_id, nickname | 멤버 소개 |

### Storage

| 버킷 | 경로 패턴 | 용도 |
|------|----------|------|
| `play-photos` | `{userId}/{timestamp}.{ext}` | 플레이 기록 사진 |

### RPC 함수

| 함수 | 용도 |
|------|------|
| `get_popular_games(limit_count)` | 최근 30일 조회수 기반 인기 게임 집계 |
| `get_all_game_ratings()` | 전체 게임 별점 평균+건수 집계 |

### photo_url 저장 형식

- 단일 사진: `"https://...url"` (일반 문자열)
- 복수 사진: `'["https://...url1","https://...url2"]'` (JSON 배열 문자열)
- 구분: `parsePhotoUrls(raw)` 헬퍼로 통일 파싱

---

## 4. localStorage 사용 위치

| 키 패턴 | 저장 위치 | 내용 | 생명주기 |
|---------|----------|------|----------|
| `kakao_user` | kakao-auth.js, auth-callback.html | 유저 객체 (id, nickname, profileImage 등) | 로그아웃 시 삭제 |
| `cottage_custom_nick_{userId}` | kakao-auth.js, auth-callback.html | 유저가 설정한 커스텀 닉네임 | 영구 (수동 삭제 필요) |
| `cottage_custom_photo_{userId}` | kakao-auth.js, auth-callback.html | 커스텀 프로필 사진 (base64 또는 URL) | 영구 |
| `cottage_profile_visited_{userId}_{date}` | kakao-auth.js | 당일 upsertProfile 실행 여부 (하루 1회 제한) | 날짜별 자동 만료 (키 갱신) |
| `cottage_visited_{date}` | supabase-client.js | 당일 페이지뷰 기록 여부 (하루 1회) | 날짜별 자동 만료 |
| `cottage_session_id` | supabase-client.js, script.js | 익명 세션 ID (별점 중복 방지) | 영구 |
| `cottage_rated_{gameId}` | supabase-client.js | 게임별 별점 (중복 방지) | 영구 |
| `cottage_time_{userId}` | supabase-client.js | 누적 체류 시간(분) 임시 저장 | upsertProfile DB 반영 성공 후 삭제 |
| `cottage_my_comments` | script.js | 내 코멘트 id 배열 (삭제 권한 확인용) | 영구 |
| `cottage_play_records_{gameKey}` | script.js | 바텀시트용 로컬 플레이 기록 | 영구 |
| `cottage_played_{gameKey}` | script.js | 구형 단일 포맷 (마이그레이션 대상) | 영구 (레거시) |

---

## 5. 인증 흐름

```
[유저] 카카오 로그인 버튼 클릭
  → kakao-auth.js: kakaoLogin()
  → Kakao.Auth.authorize() → 카카오 OAuth 서버
  → auth-callback.html?code=... 리다이렉트

auth-callback.html:
  1. code로 카카오 REST API 토큰 교환
  2. 토큰으로 /v2/user/me 프로필 조회
  3. localStorage.cottage_custom_nick_{userId} 확인
  4. 없으면 Supabase REST API로 DB 프로필 닉네임 조회 (다기기 복원용)
  5. user 객체 구성: { id, nickname, kakaoNickname, profileImage, kakaoProfileImage }
  6. localStorage.kakao_user 저장
  7. 원래 페이지로 window.location.replace()

[페이지 로드 후]
kakao-auth.js: initKakaoAuth()
  1. localStorage.kakao_user 파싱 → updateLoginUI()
  2. 당일 첫 방문 → upsertProfile() (방문 카운트 + 누적 시간 DB 반영)
  3. 당일 재방문 → startSession() (체류 시간 세션 시작만)
  4. 로그인 UI 업데이트, '내 활동' 버튼 삽입

[닉네임 변경]
  promptNicknameChange()
  → localStorage 갱신 (kakao_user + cottage_custom_nick_{id})
  → upsertProfile()로 DB도 갱신

[프로필 사진 변경]
  promptProfileImageChange()
  → localStorage만 갱신 (kakao_user + cottage_custom_photo_{id})
  → DB에는 저장 안 됨 (profiles 테이블에 photo_url 컬럼 없음)

[로그아웃]
  kakaoLogout()
  → localStorage.kakao_user 삭제
  → cottage_custom_nick_*, cottage_custom_photo_* 는 유지
```

---

## 6. 게임기록 흐름

```
[기록 입력 (신규)]
game-reviews.html — 기록 입력 탭
  1. 날짜, 그룹명 입력 (그룹명: 자동완성 - DB groupNames 기반)
  2. addRow()로 게임 행 추가
     - 게임명 검색 (COTTAGE_GAMES 자동완성)
     - 인원수 토글 버튼 (1~8명)
     - 플레이시간, 참여자 (태그칩 방식), 점수/메모
     - 사진 최대 5장 선택 (multiple file input → _photoFiles 배열 관리)
     - 후기 텍스트
  3. 저장 버튼 클릭
     - 각 게임 행의 _photoFiles 배열 순회 → uploadPlayPhoto() 업로드
     - 1장: 단일 URL 문자열, 2장 이상: JSON.stringify([...]) 저장
     - CottageDB.recordGamePlay() 호출 (게임당 1 INSERT)
     - 저장 성공 → 기록 보기 탭으로 자동 전환

[기록 조회]
  - 모임별 보기: group_name → date → records 3단 계층
  - 게임별 보기: game_id → group/player → records
  - DB에서 최대 200건 조회

[기록 수정]
  - ✏️ 버튼 클릭 → 인라인 수정폼 생성
  - 기존 사진: parsePhotoUrls()로 썸네일 전체 표시, 각 장 X 삭제
  - 신규 사진: multiple file input → pie-new-grid 관리
  - 저장: 남은 기존 URL + 새 업로드 URL 합산 → photo_url 갱신
  - CottageDB.updateGamePlay() 호출

[기록 삭제]
  - ✕ 버튼 → confirm → CottageDB.deleteGamePlay(id)
  - 로컬 recordsData 배열에서도 제거 → 리렌더링

[사진 삭제 (기록에서)]
  - 🗑 사진 삭제 버튼 → CottageDB.deletePlayPhoto(id)
  - photo_url = null로 UPDATE
  - 주의: 배열 전체 삭제됨 (개별 URL 삭제 불가)
```

---

## 7. 프로필 흐름

```
[DB profiles 테이블 갱신 시점]
  - 하루 첫 방문 시 upsertProfile() 실행
    - visit_count +1
    - total_minutes += 전날까지 누적 분 (cottage_time_{userId})
    - last_seen_at 갱신
    - nickname: 기존 커스텀 닉네임 보호 로직 적용

[닉네임 우선순위]
  auth-callback: cottage_custom_nick_{userId} > DB 닉네임 > 카카오 닉네임
  upsertProfile: 기존 DB 닉네임(≠ 카카오명)이 있으면 유지, 없으면 새 닉네임 저장

[프로필 사진 우선순위]
  auth-callback: cottage_custom_photo_{userId} > 카카오 프로필 사진
  → DB에는 사진 저장 안 함 → 다기기에서 항상 카카오 사진으로 표시

[내 활동 패널 (openProfilePanel)]
  - getMyStats()로 플레이 기록, 코멘트, 건의, 모임 참석 집계
  - player_names ILIKE '%nickname%'로 참여 기록도 병합
  - profiles에서 방문 통계 표시
```

---

## 8. 이용시간 흐름

```
[세션 시작]
  startSession(userId) ← upsertProfile() 또는 당일 재방문 시
  _sessionStart = Date.now()
  _sessionUserId = userId

[시간 누적 (로컬)]
  visibilitychange → 탭 숨김: _flushTime()
  beforeunload → 페이지 이탈: _flushTime()

  _flushTime():
    elapsed = Math.floor((Date.now() - _sessionStart) / 60000)  ← 분 단위, 59초 이하 버림
    if (elapsed <= 0) return  ← 1분 미만 완전 폐기 (B-03 미수정)
    cottage_time_{userId} += elapsed
    _sessionStart 리셋

[DB 반영]
  upsertProfile() 호출 시 (하루 첫 방문만)
    _popAccumulatedMinutes() → cottage_time_{userId} 읽기만 (삭제 안 함)
    DB upsert 성공 시에만 cottage_time_{userId} 삭제 (B-01 수정 완료)
    profiles.total_minutes += 누적 분

[결과]
  당일 시간은 다음날 첫 방문 때 DB 반영
  마지막 방문 이후 재방문 없으면 시간 누락 (B-06 미수정)
  1분 미만 세션은 모두 0으로 폐기 (B-03 미수정)
```

---

## 9. 게임 데이터 시스템 game-system/

```
game-system/
  config/
    difficulty-levels.js          ← 난이도 5단계 기준 (kids/beginner/light/heavy/hardcore)
    shelf-locations.js            ← 선반 위치 그룹 (A파티/B라이트/C헤비/D작은상자/E2인/G머더미스터리/F기타)
    bgg-label-map.js              ← BGG 영어 mechanics/categories → 한국어 lookup map
    tags/                         ← 태그 시스템 기준 정의
  game-data/
    source/                       ← 원본 입력 (수동 관리)
    staging/                      ← 자동 생성 중간물 (재생성 가능)
    library/                      ← 최종 정제물 (사이트가 읽는 데이터)
  tools/                          ← 빌드/관리 스크립트
```

---

## 10. 데이터 레이어

### source/
```
source/
  1-bgg/csv/boardgames_ranks.csv              ← BGG 랭킹 전체 CSV (로컬 매칭용)
  2-cottage-manual/cottage-owned-games.xlsx   ← 보유게임 원본 (굵은글씨=bestPlayers)
```

### staging/ (재생성 가능, 직접 편집 금지)
```
staging/
  bgg-id-mapping/
    2-match-map.json              ← 한국어명 → BGG ID 매칭 결과
  bgg-api-snapshot/
    bgg-game-details.json         ← BGG API 상세 캐시 (636개 중 ~346개 수집)
```

**2-match-map.json status 체계**: forced > auto-confirmed > needs-review > unmatched

### library/
```
library/
  1-master/cottage-owned-games-master.json  ← 상세 장부 (빌드+번역 결과 누적)
  2-ledger/                                 ← 운영자용 간단 장부
  3-output/cottage-games-data-output.js     ← 사이트 로드용 최종 데이터 (window.gameData)
  human-input/overwrite/
    forced-bgg-overrides.json               ← BGG ID 강제 지정
    mood-tag-rules.json                     ← 분위기 태그 보정
```

---

## 11. 빌드 파이프라인

```
cottage-owned-games.xlsx
    ↓
tools/1-matcher/b_run-local-match.js
    ↓ 2-match-map.json
tools/2-fetcher/a_fetch-bgg-game-data-by-id.js
    ↓ bgg-game-details.json
node game-system/tools/3-build-master/build-master.js
    ↓ cottage-owned-games-master.json (번역 필드 보존)
node game-system/tools/4-label-translator/label-translator.js      (categoriesKo/mechanicsKo)
node game-system/tools/4-label-translator/description-translator.js (descriptionKo/summaryKo)
    ↓
node game-system/tools/5-build-output/build-output.js
    ↓ cottage-games-data-output.js → window.gameData
```

### 주요 빌드 명령
```bash
node game-system/tools/3-build-master/build-master.js
node game-system/tools/4-label-translator/description-translator.js --summary
node game-system/tools/5-build-output/build-output.js
```

### 핵심 설계 원칙
1. BGG API는 실시간 호출하지 않는다. 캐시를 먼저 쌓고, 운영은 캐시를 읽는다.
2. source → staging → library → output 레이어 분리. output만 사이트에서 읽는다.
3. 번역 필드(categoriesKo, mechanicsKo, descriptionKo, summaryKo)는 build-master 실행 후 별도 translator 실행으로 추가. build-master가 덮어쓰지 않도록 보존 처리됨.
4. 모든 경로는 tools/_core/paths.js에서 관리한다.
