# PROJECT_STRUCTURE — 코티지보드 홈페이지 구조 문서

최종 갱신: 2026-07-16 (page-labels.js 라벨 동시갱신 규칙 추가)

---

## 참조 파일

| 주제 | 파일 |
|------|------|
| DB 테이블/컬럼/RPC/Storage | [docs/db-schema.md](db-schema.md) |
| CottageDB 함수 / JS 전역 API | [docs/js-api.md](js-api.md) |
| localStorage 키/구조/크로스파일 의존관계 | [docs/ls-schema.md](ls-schema.md) |
| 업적/칭호/캐릭터/교환권/성장보드 (SSOT) | [docs/achievement-system.md](achievement-system.md) |

---

## 1. 페이지 구조

```
/
├── index.html                      # 메인 (추천 게임, 인기 게임, 검색)
├── auth-callback.html              # 카카오 OAuth 리다이렉트 처리
├── pages/
│   ├── game/                       # 게임 찾기 & 기록
│   │   ├── owned-games.html        # 전체 게임 목록 + 필터 + 바텀시트
│   │   ├── game-reviews.html       # 플레이 기록 허브 (핵심 기능 페이지)
│   │   └── game-location.html      # 게임 위치 안내
│   ├── info/                       # 코티지보드 소개
│   │   ├── about.html              # 코티지가 만들어진 이유 (브랜드 스토리: Hero→WHY1→WHY2→제약 2x2 카드→WHY 회수→버튼)
│   │   ├── price-rules.html        # 가격·이용안내 (이용요금→운영시간→이용 약속→음식 안내)
│   │   └── guide.html              # 홈페이지 기능 안내
│   ├── club/                       # 동호회
│   │   ├── club.html               # 동호회 소개
│   │   ├── club-intro.html         # 동호회 멤버 소개
│   │   ├── club-schedule.html      # 모임 플래너 (달력, 가능 시간 등록, 겹침 계산, 자유 댓글)
│   │   ├── club-meeting.html       # → club-schedule.html 리다이렉트 (구 투표 페이지)
│   │   ├── club-rules.html         # 동호회 규칙
│   │   └── club-history.html       # 모임 기록 & 사진 (DB 연동)
│   ├── admin/                      # 요청/관리
│   │   ├── requests.html           # 게임/간식 요청 (로그인 필요)
│   │   └── requests-admin.html     # 요청 관리 어드민 (오너 전용)
│   └── store/                      # 구 URL 리다이렉트 shim (카카오톡 링크 404 방지)
│       ├── requests.html           # → pages/admin/requests.html
│       └── requests-admin.html     # → pages/admin/requests-admin.html
├── scripts/                        # DB/운영/분석 스크립트 (게임 파이프라인과 무관)
│   ├── analyze-user-data.js        # 유저 데이터 전수 분석 (재사용 가능)
│   ├── recover-time-data.js        # total_minutes 복구 (완료, 보관)
│   ├── recover-user-data.js        # 유저 데이터 복구 (완료, 보관)
│   ├── recover-visit-count.js      # visit_count 복구 (완료, 보관)
│   ├── resize-existing-photos.js   # Storage 사진 일괄 리사이즈 (완료, 보관)
│   ├── crop-characters.js          # 캐릭터 스프라이트 크롭 (완료, 보관)
│   ├── split-characters.js         # 캐릭터 시트 분할 (완료, 보관)
│   ├── split-seasons.js            # 시즌 캐릭터 시트 분할 (완료, 보관)
│   ├── test-subsheet.js            # 서브시트 레이아웃 테스트
│   ├── test-profile-area.js        # 프로필 영역 테스트
│   ├── ss_subsheet/                # 서브시트 스크린샷 (비교용 이미지)
│   ├── ss_4axis/                   # 4축 UI 스크린샷
│   └── ss_profile/                 # 프로필 패널 스크린샷
```

### 헤더 메뉴 구조 (assets/js/header.js)

```
게임
 ├ 추천 게임 찾기
 ├ 전체 게임 보기
 ├ 게임 위치
 └ 플레이 기록

코티지를 만든 이유   ← 직접 링크 (드롭다운 아님), info/about.html
                      페이지 내 타이틀은 "코티지가 만들어진 이유"

코티지 이용
 ├ 가격 · 이용안내    (info/price-rules.html)
 ├ 홈페이지 기능      (info/guide.html)
 ├ 동호회             (club/club.html, 단일 링크)
 └ 요청하기           (admin/requests.html)
```

`코티지보드` 그룹과 `동호회` 그룹은 폐지되어 `코티지 이용` 그룹으로 흡수됨 (143차-157 전후). `.menu-link-home` 클래스로 직접 링크 스타일(그룹 헤더와 동일 색상) 적용.

### 페이지별 인증 요구

| 페이지 | 인증 필요 | 오너 전용 |
|--------|----------|----------|
| index.html | 선택 (별점 등) | N |
| game/owned-games.html | 선택 (코멘트, 따봉) | N |
| game/game-reviews.html | 기록 입력 시 필수 | N |
| admin/requests.html | 필수 | N |
| admin/requests-admin.html | 필수 | **Y** |
| club/club-* | 대부분 선택 | N |

---

## 2. JS 파일 역할

```
assets/js/
├── supabase-config.js          # Supabase URL + anonKey 설정 (window.SUPABASE_CONFIG)
├── supabase-client.js          # DB 접근 모듈 (window.CottageDB, window._cottageSess, window.escH 노출)
│                               # 방문자 추적(__visitor__), 체류시간, 비로그인 heartbeat 포함
├── kakao-auth.js               # 카카오 로그인/로그아웃, 프로필 패널, 알림, 교환권
│                               # (window.getKakaoUser / openProfilePanel 노출)
├── script-nav.js               # 한글 검색 유틸, rootPath, 모바일 메뉴/스크롤스파이, 헤더 검색, 카드 이벤트, 세션 트래커
├── game-sheet.js               # GameView, 게임 데이터 포매터, 게임시트, 플레이 모달, 코멘트·사진 모달
├── game-display-adapter.js     # gameData → 화면 출력용 view adapter (window.COTTAGE_GAMES 생성) · 난이도 시스템(getDifficultyData/normalizeLevelValue, GS7 이관)
├── game-reviews.js             # 플레이기록 허브 (game-reviews.html 전용)
│                               # 기록 등록·수정·삭제, 모임/게임별 보기, 사진 업로드
├── achievements.js             # 업적·캐릭터·칭호 체크 및 지급 (window.checkAchievements 노출)
├── day-detail.js               # 일정 상세 모달 + 막대 공용 컴포넌트 (즉시실행 IIFE, CSS 자기주입)
│                               # window 노출: renderDayDetailHTML / openDayDetailModal /
│                               #   openDateScheduleModal / openDateMeetingModal /
│                               #   buildBarsInCard(dayVotes, voteGames, myVote)
│                               # 로드 페이지: index.html, club-schedule.html
│                               # 의존: window.CottageDB (getMeetingVotes, getMeetingVoteGames),
│                               #   window.COTTAGE_GAMES (게임명 해석, optional),
│                               #   window.openOtherMeetingSheet (kakao-auth.js — 참여자 닉네임 클릭),
│                               #   window.getGameKeyById (play-records-utils.js) +
│                               #     window.ensureGameSheet/openGameSheet (game-sheet.js — 게임 행 클릭)
│                               # ⚠️ 위 전역은 전부 클릭 시점에 window.X?.()로 참조할 것 —
│                               #   club-schedule.html은 day-detail.js를 kakao-auth.js·game-sheet.js·
│                               #   play-records-utils.js보다 먼저 로드하므로 IIFE 실행 시점 스냅샷은 undefined
│                               # index-page.js → openDateMeetingModal 호출 (홈 미리보기 카드 클릭)
│                               # club-schedule.html → openDateScheduleModal 호출 (막대 클릭)
├── index-page.js               # 메인 페이지 전용 (추천게임, 인기게임, 홈 모임 미리보기)
│                               # day-detail.js 함수 호출 (openDateMeetingModal)
├── owned-games-page.js         # owned-games.html 전용 (게임 목록 필터·렌더)
├── play-records-utils.js       # 공유 유틸 (parsePhotoUrls / openLightbox / attachAc / initTagInput 등)
└── page-labels.js              # 페이지 경로→한글 라벨 단일 소스 (window.COTTAGE_PAGE_LABELS{,_BY_PATH})
                                 # ⚠️ 새 _trackPvOnce/trackPageView 가상 페이지 키를 추가하면
                                 #   COTTAGE_PAGE_LABELS에 라벨도 같이 추가할 것 — 관리자 분석이
                                 #   `_pageLabels[r.page] || r.page` 폴백이라 라벨이 없으면 slug가
                                 #   그대로 노출되고 에러는 안 남(조용히 발생). 2026-07-16에
                                 #   my-board-meeting·other-board가 실제로 이 상태였음(커밋 aaa0b1d)
                                 # script-nav.js를 로드하는 모든 페이지에서 script-nav.js 직전 로드 필수
                                 # 로드 순서: page-labels.js → script-nav.js → game-sheet.js → 페이지별 JS
```

함수 목록 → [docs/js-api.md](js-api.md)

---

## 2-A. 인앱 iframe 시트 패턴

### embed 모드 (`?embed=1`)

URL에 `embed=1` 파라미터가 있으면 `header.js`가 `body.embed-mode` 클래스 추가 후 헤더 미삽입.  
`style.css`에 전역 규칙 → `body.embed-mode .site-header, .site-footer { display:none }`

embed 모드에서는 `header.js`가 `document` 클릭을 가로채 내부 `.html` 링크 클릭 시 `embed=1`을 자동으로 붙여 재이동시킨다(143차-176) — 시트 안에서 다른 내부 링크(브레드크럼, 카드 등)를 눌러도 헤더가 다시 삽입되지 않도록 하는 단일 진입점. 외부 링크·`target="_blank"`·`#`/`mailto:`/`tel:`/`javascript:` 링크는 제외.

사용 페이지:
- `game-location.html` — `openShelfSheet(url)`이 `?embed=1&highlight=GAMEID` URL로 호출
- `guide.html` — `openGuideOverlay(href)` 내부에서 `?embed=1` 자동 추가

### openShelfSheet (game-sheet.js)

게임 상세시트 위에 게임위치 페이지를 바텀시트로 표시하는 스택 내비게이션.

```
게임시트(A) 열림
  → openShelfSheet(?embed=1&highlight=A) 호출
  → 선반 오버레이(z:9600) 표시 — 선반에서 게임 칩 클릭
  → postMessage({ action:'openGame', gameId }) 수신
  → 선반 z:0 + pointerEvents:none (숨김)
  → openGameSheet(B) 호출
  → MutationObserver: #gameSheet.is-active 제거 감지 → 선반 복원
  → ← 뒤로가기 클릭 → overlay.remove() + openGameSheet(prevGameKey)
```

### openGuideOverlay (pages/info/guide.html)

이용안내 카드 클릭 → 해당 페이지를 인앱 iframe 오버레이(z:9000, 92dvh)로 표시.  
`?embed=1` 자동 추가 → 로드된 페이지의 헤더/푸터 자동 숨김.

---

## 3. 인증 흐름

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
  2. _cottageSess.get(uid) → 당일 첫 방문 체크 (lastVisitDate ≠ 오늘)
  3. 당일 첫 방문 → visitCount++ 후 upsertProfile() (방문 카운트 + 누적 시간 DB 반영)
  4. 당일 재방문 → startSession() (체류 시간 세션 시작만)
  5. 로그인 UI 업데이트, '내 활동' 버튼 삽입

[닉네임 변경]
  promptNicknameChange()
  → localStorage 갱신 (kakao_user + cottage_custom_nick_{id})
  → upsertProfile()로 DB도 갱신

[로그아웃]
  kakaoLogout()
  → localStorage.kakao_user 삭제
  → cottage_custom_nick_*, cottage_custom_photo_* 는 유지
```

---

## 4. 게임기록 흐름

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
```

---

## 5. 프로필 흐름

```
[DB profiles 갱신 시점]
  - 하루 첫 방문 시 upsertProfile() 실행
    - visit_count: _cottageSess의 visitCount 값 사용
    - total_minutes += timeSec (초 단위) → 분으로 변환
    - last_seen_at 갱신
    - nickname: 기존 커스텀 닉네임 보호 로직 적용
    - selectError 발생 시 시간 필드 업데이트 제외 (0 덮어쓰기 방지)

[닉네임 우선순위]
  auth-callback: cottage_custom_nick_{userId} > DB 닉네임 > 카카오 닉네임
  upsertProfile: 기존 DB 닉네임(≠ 카카오명)이 있으면 유지, 없으면 새 닉네임 저장

[프로필 사진 우선순위]
  auth-callback: cottage_custom_photo_{userId} > 카카오 프로필 사진
  initKakaoAuth: getProfileSnapshot()으로 DB photo_url 복원 (다기기 동기화)
  → profiles.photo_url에 저장됨 (updateProfilePhoto)

[내 활동 패널 (openProfilePanel)]
  - getMyStats()로 플레이 기록, 코멘트, 건의, 모임 참석 집계
  - player_names ILIKE '%nickname%'로 참여 기록도 병합
  - _cottageSess에서 visitCount, timeSec, prevSeenDt 표시

[모임 보드 ↔ 회원 자기소개 연동 (143차)]
  - SSOT: profiles.bio(한줄소개) + member_intros(활동지역/참여시간/이동범위/모임스타일, user_id당 1행)
    + meeting_game_prefs(이번에 하고싶은 게임/룰 설명 가능한 게임)
  - 내 보드 > 모임 보드(kakao-auth.js openProfilePanel('meeting'))와
    회원 자기소개(club-intro.html)가 동일 테이블/컬럼을 읽고 씀 — 한쪽 수정이 다른 쪽에 즉시 반영
  - 자기소개 작성은 로그인 필수(member_intros.user_id 기준 upsert, 유저당 1행)
  - 회원 자기소개 카드 클릭 → openOtherMeetingSheet(userId). **Phase C(2026-07-15)부터 얇은 래퍼**로
    openProfilePanel('meeting', {userId, readOnly:true}) 호출 — 본인 내 보드와 동일한 통합 패널을 편집
    컨트롤 없이·비공개 섹션(알림/교환권/함께한시간) 제외하고 표시. 본인 카드 클릭 시 openProfilePanel('meeting')으로 위임
    (구 별도 otherMainPanel/_openOtherMeetingSubSheet 구조는 폐지)
  - **Phase D(2026-07-15) 진입점 통일**: 닉네임 클릭 진입점을 두 갈래로 확정 — **모임 참여자**(`.sched-bar-name`)는
    openOtherMeetingSheet(모임 보드 직행), **그 외 전부**(게임시트 좋아요/궁금해요 아바타, 게임평·플레이기록 닉네임/리뷰어 이름)는
    openOtherProfileSheet(읽기전용 내 보드 전체). 플레이기록 게시판 참여자 태그가 기존에 모임 보드로 잘못 연결돼 있던 것을
    수정하고, 게임평·리뷰어 이름에는 클릭 진입점을 신규 추가. 상세는 js-api.md openOtherProfileSheet/openOtherMeetingSheet 항목.
```

---

## 6. 이용시간 / 방문자 추적 흐름

```
[로그인 세션 시작]
  startSession(userId) ← initKakaoAuth()에서 호출
  _sessionStart = Date.now()
  _sessionUserId = userId

[시간 누적 (로컬)]
  visibilitychange → 탭 숨김: _flushTime()
  beforeunload / pagehide → 이탈: _flushTime()

  _flushTime():
    elapsed = Date.now() - _sessionStart (초 단위)
    cottageSess.timeSec += elapsed

[DB 반영]
  _syncTimeToDBNow() ← visibilitychange/beforeunload/heartbeat(1분)
    localhost 방문 시 즉시 return (dev 환경 카운팅 제외)
    profiles.total_minutes / today_seconds UPDATE
    page_sessions INSERT (page, user_id, session_key, duration_sec, entered_at, referrer)

[비로그인 방문자 추적]
  cottage-auth-changed 이벤트 없거나 user=null → _startAnonHeartbeat()
    localhost 방문 시 즉시 return
    anon_sessions UPSERT (session_key, last_seen_at) — 1분 주기 갱신
    page_sessions INSERT (user_id: null, session_key, page, referrer) — 입장 1회

[방문자 마커 (__visitor__)]
  DOMContentLoaded → localhost/admin 제외
  하루 첫 방문 (cottage_visited_{date} 미존재) 시:
    page_views INSERT (page: '__visitor__', referrer: effectiveSource or null,
                       session_key, user_id, is_bot)  ← 143차-178/190부터
  관리자 분석에서 유입 명/회 집계 = __visitor__ 행의 user_id || session_key 기준
  (page_sessions와 섞지 않음)

[session_key]
  getSessionKey() ← localStorage.cottage_session_id (없으면 생성)
  로그인/비로그인 모두 동일 키 사용
  비로그인 명 집계 = page_sessions.session_key WHERE user_id IS NULL
```

---

### 6-1. 관리자/로컬 카운팅 제외

2026-07-02부터 localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID=4916417947)는
`page_views`, `page_events`, `page_sessions`, `anon_sessions`, `profiles.visit_count/total_minutes/today_seconds`
누적에서 제외한다. 관리자 분석 화면도 관리자 `user_id`가 붙은 `rows/pageViews/profiles`를 표시 집계에서 제외한다.

## 7. 게임 데이터 시스템 game-system/

```
game-system/
  config/
    difficulty-levels.js          ← 난이도 5단계 기준 (kids/beginner/light/heavy/hardcore)
    shelf-locations.js            ← 선반 위치 그룹 (A~G)
    bgg-label-map.js              ← BGG 영어 mechanics/categories → 한국어 lookup map
    tags/                         ← 태그 시스템 기준 정의
  game-data/
    source/                       ← 원본 입력 (수동 관리)
      1-bgg/csv/                  ← BGG 랭킹 CSV
      2-cottage-manual/           ← cottage-owned-games.xlsx
      3-abbr/game-abbr.json       ← BGG ID → 약칭 매핑 (수동 관리)
      3-abbr/game-abbr-byname.json ← ownedName → 약칭 매핑 (bggId 없는 게임 전용)
                                    조회 순서: abbrMap[bggId] → abbrByName[ownedName] → titleKo 앞 2글자 폴백
    staging/                      ← 자동 생성 중간물 (재생성 가능)
    library/                      ← 최종 정제물 (사이트가 읽는 데이터)
  tools/                          ← 빌드/관리 스크립트
```

---

## 8. 빌드 파이프라인

```
cottage-owned-games.xlsx
    ↓
tools/1-matcher/b_run-local-match.js
    ↓ 2-match-map.json
tools/2-fetcher/a_fetch-bgg-game-data-by-id.js
    ↓ bgg-game-details.json
node game-system/tools/3-build-master/build-master.js
    ↓ cottage-owned-games-master.json
node game-system/tools/4-label-translator/description-translator.js
    ↓
node game-system/tools/5-build-output/build-output.js
    ↓ cottage-games-data-output.js → window.gameData
```

주요 빌드 명령:
```bash
node game-system/tools/3-build-master/build-master.js
node game-system/tools/4-label-translator/description-translator.js --summary
node game-system/tools/5-build-output/build-output.js
```

핵심 원칙: BGG API는 실시간 호출하지 않는다. source → staging → library → output 레이어 분리. output만 사이트에서 읽는다.
