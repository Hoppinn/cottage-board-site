# PROJECT_STRUCTURE — 코티지보드 홈페이지 구조 문서

최종 갱신: 2026-06-12 (scripts/ 폴더 추가, pages/store 리다이렉트 명시, FULL_TREE.txt 삭제)

---

## 참조 파일

| 주제 | 파일 |
|------|------|
| DB 테이블/컬럼/RPC/Storage | [docs/db-schema.md](db-schema.md) |
| CottageDB 함수 / JS 전역 API | [docs/js-api.md](js-api.md) |
| localStorage 키/구조/크로스파일 의존관계 | [docs/ls-schema.md](ls-schema.md) |

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
│   │   ├── about.html              # 코티지보드 소개
│   │   ├── price-rules.html        # 가격 & 규칙
│   │   └── guide.html              # 홈페이지 이용안내
│   ├── club/                       # 동호회
│   │   ├── club.html               # 동호회 소개
│   │   ├── club-intro.html         # 동호회 멤버 소개
│   │   ├── club-schedule.html      # 일정 투표 & 확인
│   │   ├── club-meeting.html       # 모임 기록
│   │   ├── club-rules.html         # 동호회 규칙
│   │   └── club-history.html       # 모임 기록 & 사진 (DB 연동)
│   ├── admin/                      # 요청/관리
│   │   ├── requests.html           # 게임/간식 요청 (로그인 필요)
│   │   └── requests-admin.html     # 요청 관리 어드민 (오너 전용)
│   └── store/                      # 구 URL 리다이렉트 shim (카카오톡 링크 404 방지)
│       ├── requests.html           # → pages/admin/requests.html
│       └── requests-admin.html     # → pages/admin/requests-admin.html
├── scripts/                        # DB/운영 관련 일회성·분석 스크립트 (게임 파이프라인과 무관)
│   ├── analyze-user-data.js        # 유저 데이터 전수 분석 (재사용 가능)
│   ├── recover-time-data.js        # total_minutes 복구 (완료, 보관)
│   ├── recover-user-data.js        # 유저 데이터 복구 (완료, 보관)
│   ├── recover-visit-count.js      # visit_count 복구 (완료, 보관)
│   └── resize-existing-photos.js  # Storage 사진 일괄 리사이즈 (완료, 보관)
```

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
├── kakao-auth.js               # 카카오 로그인/로그아웃, 프로필, 세션 (window.getKakaoUser 등 노출)
├── script.js                   # 게임 바텀시트, 검색, 필터, 별점 위젯, 코멘트
├── game-display-adapter.js     # gameData → 화면 출력용 view adapter (CottageGameView)
└── play-records-utils.js       # parsePhotoUrls / buildPhotoHtml / openLightbox / attachAc / initTagInput 등 공유
```

함수 목록 → [docs/js-api.md](js-api.md)

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

[프로필 사진 변경]
  promptProfileImageChange()
  → localStorage 갱신 (kakao_user + cottage_custom_photo_{id})
  → DB profiles.photo_url도 저장 (updateProfilePhoto)
  → 다기기 복원: initKakaoAuth 시 getProfileSnapshot()으로 DB에서 불러옴

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
```

---

## 6. 이용시간 흐름

```
[세션 시작]
  startSession(userId) ← initKakaoAuth()에서 호출
  _sessionStart = Date.now()
  _sessionUserId = userId

[시간 누적 (로컬)]
  visibilitychange → 탭 숨김: _flushTime()
  beforeunload → 페이지 이탈: _flushTime()
  pagehide → 모바일 이탈: _flushTime()

  _flushTime():
    elapsed = Math.floor((Date.now() - _sessionStart) / 1000)  ← 초 단위
    if (elapsed <= 0) return
    s = _cottageSess.get(userId)
    s.timeSec = (s.timeSec || 0) + elapsed
    _cottageSess.set(userId, s)
    _sessionStart 리셋

[DB 반영 (즉시)]
  _syncTimeToDBNow() ← visibilitychange/beforeunload/pagehide/heartbeat(1분)
    timeSec = _cottageSess.get(userId).timeSec
    if (timeSec < 1) return
    DB upsert 성공 시에만 s.timeSec = 0 초기화

[heartbeat]
  1분마다 _syncTimeToDBNow(false) 호출 → 탭 열려있는 동안 주기적 DB 반영

[결과]
  당일 시간이 즉시 DB에 반영됨
  1초 미만만 폐기, 나머지 전부 누적
```

---

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
