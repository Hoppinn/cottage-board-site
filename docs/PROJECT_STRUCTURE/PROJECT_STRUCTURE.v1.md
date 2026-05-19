# PROJECT_STRUCTURE.md

# COTTAGEBOARD PROJECT STRUCTURE

## 0. 프로젝트 목적

코티지보드 홈페이지는 보유 보드게임 데이터를 기반으로 두 가지 경험을 제공한다.

1. 추천게임찾기
- 감성 큐레이션 UI
- 손님이 인원 / 난이도 / 분위기를 고르면 어울리는 게임을 추천

2. 전체게임보기
- DB / 도감형 UI
- 보유 게임 전체를 검색, 정렬, 필터링하는 페이지

상세페이지는 코티지 큐레이션 정보와 BGG 정보를 섞은 구조를 지향한다.


---

## 1. 루트 구조

ROOT
├─ index.html
├─ owned-games.html
├─ assets/
└─ game-system/
   ├─ config/
   ├─ game-data/
   └─ tools/



---

## 2. 프론트엔드 파일

### index.html

역할:
- 홈페이지 메인 진입점
- 헤더
- 히어로
- 추천게임찾기 UI
- 추천 모달
- 게임 카드 영역
- 게임 상세 바텀시트

현재 상태:
- 추천게임찾기 버튼은 모달이 아니라 추천 영역으로 전환되는 흐름으로 바뀌는 중
- `game-data/generated/maps/bgg-tag-translations.js`
- `game-data/library/games/cottage-games-data.js`
- `assets/js/script.js`
를 순서대로 불러옴

주의:
- 추천게임찾기 = 감성 큐레이션
- 전체게임보기와 역할 섞지 말 것


---

### owned-games.html

역할:
- 전체게임보기 전용 페이지
- DB / 도감형 게임 목록
- 정렬 / 필터 / 페이지네이션 / 상세 바텀시트 연결

현재 상태:
- 전체게임보기 UI가 만들어져 있으나 HTML 중복이 있음
- `ownedGameList`, `ownedPagination`이 중복으로 들어간 부분 있음
- 정렬/필터 select id 중복 가능성 있음
- 다음 재설계 때 정리 필요

주의:
- 이 페이지는 추천 큐레이션이 아니라 “전체 DB 탐색”용


---

## 3. assets 구조

assets/
├─ css/
│  └─ style.css
├─ js/
│  └─ script.js
└─ images/
   └─ main/
      ├─ logo.png
      └─ hero.png


### assets/css/style.css

역할:
- 전체 디자인 시스템
- 헤더
- 히어로
- 추천 UI
- 추천 모달
- 게임 카드
- 상세 바텀시트
- 전체게임보기 페이지 스타일

현재 상태:
- 여러 단계의 패치가 누적된 상태
- recommend / modal / owned-games 관련 스타일이 한 파일에 모두 들어 있음
- 마지막 부분에 HTML 조각이 CSS 파일 안에 섞여 들어간 흔적 있음

주의:
- 지금 당장 UI를 먼저 고치지 말 것
- 데이터/tools 안정화 이후 CSS 정리


### assets/js/script.js

역할:
- 모바일 메뉴
- 추천게임찾기 상태 전환
- 추천 필터 렌더링
- 게임 카드 렌더링
- 게임 상세 바텀시트
- 전체게임보기 정렬/필터/페이지네이션

현재 상태:
- 모든 프론트 로직이 통합되어 있음
- difficulty 시스템이 `script.js` 안에도 있고, `game-config/difficulty-levels.js`에도 있어 중복 상태
- 추천게임찾기와 전체게임보기 로직이 같은 파일에 섞여 있음

향후 분리 후보:
- shared/game-utils.js
- recommend.js
- owned-games.js
- game-sheet.js
- menu.js


---

## 4. game-system/config 구조

game-system/config/
├─ difficulty-levels.js
├─ shelf-groups.js
├─ auto-tag-rules.js
├─ game-status.js
├─ ui-config.js
└─ tag/
   ├─ mood-groups.js
   ├─ play-tags.js
   ├─ relationship-tags.js
   └─ tag-utils.js



### game-config의 역할

game-config는 코티지보드의 “게임 운영 OS”다.

여기에는 사람이 매번 수정하는 개별 게임 데이터가 아니라, 전체 게임 데이터에 적용되는 기준값과 분류 체계를 둔다.

예:
- 난이도 기준
- 책장/위치 그룹
- 분위기 그룹
- 플레이 태그
- 관계/상황 태그
- 자동 태그 규칙
- UI 필터 순서


---

### difficulty-levels.js

역할:
- BGG weight 또는 코티지 난이도 수치를 체감 난이도 단계로 변환

현재 단계:
- kids
- beginner
- light_family
- heavy_mania
- hardcore

주의:
- 현재 `script.js` 안의 DIFFICULTY_LEVELS와 중복됨
- 나중에 single source of truth로 통합 필요


---

### shelf-groups.js

역할:
- 실제 매장 책장/공간 위치 기준
- 파티게임, 라이트패밀리, 헤비전략, 작은상자, 2인베스트 등

의미:
- 손님용 추천태그라기보다 실제 운영/배치 기준


---

### tag/mood-groups.js

역할:
- 분위기 상위 그룹
- 예: 떠들썩한, 쫄리는, 머리쓰는, 편안한, 몰입되는

mood는 play-tag를 묶는 상위 감성 필터다.


---

### tag/play-tags.js

역할:
- 실제 플레이 감각/메커니즘 기반 태그
- 예: 블러핑, 순발력, 마피아, 추리, 엔진빌딩, 협력, 스토리, 퍼즐


---

### tag/relationship-tags.js

역할:
- 데이트, 친구, 가족, 커플끼리, 팀전, 술자리 느낌, 편하게 쉬는 등
- 추천게임찾기 감성 큐레이션에서 활용 가능


---

### tag/tag-utils.js

역할:
- mood와 play-tag 매칭 유틸
- `gameMatchesMood`
- `gameMatchesPlayTag`
- `gameMatchesMoodAndPlayTag`

주의:
- 현재는 ES module 형식
- tools는 CommonJS 기반이라 바로 require하면 충돌 가능
- 프론트용/빌드용 사용 방식을 재설계해야 함


---

## 5. game-system/game-data 구조

game-system/game-data/
├─ source/
├─ generated/
└─ library/


---

### game-data/source/

역할:
- 원본 입력 데이터
- 사람이 직접 관리하거나 외부에서 받은 원본

구조:
source/
├─ csv/
│  └─ boardgames_ranks.csv
└─ manual/
   └─ cottage-owned-games.tsv


### cottage-owned-games.tsv

역할:
- 코티지보드 보유게임 원본 리스트
- 기본적으로 여기에 게임명과 수동 운영 데이터를 관리

핵심 원칙:
- 새 게임 추가는 우선 여기서 시작
- 장기적으로는 게임 한글명만 입력해도 자동 파이프라인이 돌도록 만들 예정


---

### game-data/generated/

역할:
- 자동 생성 중간 산출물
- 삭제해도 재생성 가능해야 함

구조:
generated/
├─ cache/
│  ├─ bgg-match-result.json
│  ├─ bgg-search-cache.json
│  ├─ bgg-details-cache.json
│  ├─ auto-english-candidates-cache.json
│  └─ bgg-search-candidates.json
└─ maps/
   └─ bgg-tag-translations.js


### generated/cache/

역할:
- API 재호출 방지
- 자동 매칭 결과
- BGG 상세정보 캐시
- 검색 후보 캐시

주의:
- cache는 작업속도 최적화용
- 최종 서비스 데이터가 아님


---

### game-data/library/

역할:
- 실제 서비스에서 사용하는 정제된 게임 라이브러리

구조:
library/
├─ games/
│  ├─ cottage-games-data.js
│  └─ cottage-games-data.json
├─ manual/
│  ├─ forced-bgg-overrides.json
│  ├─ game-name-aliases.json
│  ├─ manual-bgg-matches.json
│  └─ mood-tag-rules.json
└─ images/
   ├─ thumb/
   └─ detail/


### library/games/

역할:
- 사이트가 실제로 읽는 최종 게임 데이터
- `script.js`에서 사용하는 `gameData`

주의:
- 직접 수정하지 않는 것이 원칙
- build 결과물


### library/manual/

역할:
- 사람이 직접 판단해서 관리하는 예외/보정 데이터

파일별 역할:
- forced-bgg-overrides.json
  - 자동 매칭이 틀렸을 때 강제로 BGG id 교정
- game-name-aliases.json
  - 자동 후보 생성이 어려운 특수 별칭/약칭 관리
- manual-bgg-matches.json
  - 과거 수동 매칭 흔적. 현재 canonical 여부 재검토 필요
- mood-tag-rules.json
  - 과거 분위기 태그 규칙. 앞으로 auto-tag-rules와 역할 재정의 필요


---

## 6. game-system/tools 구조

game-system/tools/
├─ convert-bgg.js
├─ core/
│  ├─ paths.js
│  ├─ read-write.js
│  └─ normalize-game-name.js
├─ match/
├─ fetch/
├─ build/
└─ legacy/


---

### convert-bgg.js

역할:
- 전체 빌드 실행 진입점

공식 목표 흐름:
1. autoResolveBggMatches()
2. fetchBggDetails()
3. buildCottageGameData()

주의:
- 현재 파일 안에 main 함수가 중복된 흔적 있음
- 다음 재설계 때 정리 필요


---

### core/

core/
├─ paths.js
├─ read-write.js
└─ normalize-game-name.js


### paths.js

역할:
- 프로젝트 전체 경로 상수 관리
- tools에서 경로 하드코딩하지 않게 만드는 중심 파일

현재 문제:
- `GAME_CONFIG_DIR`, `GAME_CONFIG_TAG_DIR` 선언보다 module.exports에서 먼저 사용됨
- 실행 시 오류 가능성 있음
- 다음방에서 가장 먼저 정리 필요


### read-write.js

역할:
- JSON / 텍스트 파일 읽기쓰기 공통 함수
- ensureDir 포함


### normalize-game-name.js

역할:
- 게임명 정규화
- 대소문자, 괄호, 특수문자, 공백 정리
- 매칭/검색/스코어링의 기반


---

### match/

match/
├─ auto-resolve-bgg-matches.js
├─ generate-name-candidates.js
├─ search-bgg-candidates.js
├─ score-bgg-candidates.js
├─ generate-auto-english-cache.js
└─ generate-auto-english-candidates.js


### auto-resolve-bgg-matches.js

역할:
- 보유게임명 → BGG id 자동 매칭
- forced override 적용
- 후보 생성
- BGG 후보 검색
- 점수화
- 최종 status 결정

status 체계:
- forced
- auto-confirmed
- needs-review
- unresolved

이 status 체계는 데이터 품질 관리 OS로 유지한다.


### generate-name-candidates.js

역할:
- 한글 보유게임명에서 검색 후보 생성
- 괄호 제거
- 확장/판본 단어 제거
- subtitle 분리
- 최소 knownKoToEn 힌트 사전 적용
- auto-english-candidates-cache 적용

중요 원칙:
- 전체 게임을 alias에 다 넣지 않는다
- 자동 검색이 어려운 대표 별칭만 최소로 둔다


### search-bgg-candidates.js

역할:
- BGG CSV에서 후보 검색
- BGG Search API는 현재 OFF
- 검색 결과 cache 사용

현재:
- `ENABLE_BGG_API_SEARCH = false`


### score-bgg-candidates.js

역할:
- 후보 점수화
- 이름 유사도
- rank bonus
- users rated bonus
- expansion penalty
- source bonus

매우 중요한 파일.
자동 매칭 품질의 핵심.


### generate-auto-english-cache.js

역할:
- unresolved 항목을 자동 영어 후보 캐시에 빈 배열로 만들어둠
- 나중에 번역/API/GPT 후보 생성 연결 예정


### generate-auto-english-candidates.js

역할:
- 자동 영어 후보를 가져오는 함수
- 현재는 cache만 읽음
- 외부 자동 후보 생성은 OFF


---

### fetch/

fetch/
└─ fetch-bgg-details.js

역할:
- BGG Thing API로 상세정보 수집
- title, image, thumbnail, description, year, players, playtime, averageweight, categories, mechanics, suggested_numplayers 수집
- bgg-details-cache.json 갱신

현재:
- `ENABLE_BGG_THING_API = false`
- API 승인/안정화 전에는 캐시가 비어 있을 수 있음

주의:
- 현재 final gameData에 averageweight가 0으로 많이 들어가는 이유는 details cache가 비었거나 fetch가 OFF이기 때문


---

### build/

build/
└─ build-cottage-game-data.js

역할:
- cottage-owned-games.tsv
- bgg-match-result.json
- bgg-details-cache.json
을 병합해서 최종 `cottage-games-data.js/json` 생성

현재 출력 필드:
- id
- title
- display_title
- ownedName
- bggId
- matchStatus
- yearpublished
- minplayers
- maxplayers
- suggested_numplayers
- playingtime
- averageweight
- categories
- mechanics
- cottage_tags
- mood_tags
- difficulty_type
- image
- thumbnail
- imageType
- description
- cottage_comment
- rule_summary
- recommend_point
- youtube_url

향후 추가 예정:
- difficultyId
- difficultyWeight
- shelfGroupId
- playTagIds
- moodGroupIds
- relationshipTagIds
- manualTags
- autoTags
- displayTags


---

## 7. legacy / 정리 대상

현재 혼재된 과거 파일:
- match-owned-games-to-bgg.js
- build-bgg-candidates.js
- apply-manual-matches.js
- 예전 build-cottage-game-data.js
- 예전 fetch-bgg-details.js

주의:
- 일부 파일은 오타/함수명 불일치가 있음
- 바로 삭제하지 말고 legacy로 보내거나 canonical 여부 판단 후 정리


---

## 8. 공식 데이터 흐름

game-system/game-data/source/manual/cottage-owned-games.tsv
↓
game-system/tools/match/generate-name-candidates.js
↓
game-system/tools/match/search-bgg-candidates.js
↓
game-system/tools/match/score-bgg-candidates.js
↓
game-system/tools/match/auto-resolve-bgg-matches.js
↓
game-system/game-data/generated/cache/bgg-match-result.json
↓
game-system/tools/fetch/fetch-bgg-details.js
↓
game-system/game-data/generated/cache/bgg-details-cache.json
↓
game-system/tools/build/build-cottage-game-data.js
↓
game-system/game-data/library/games/cottage-games-data.js
game-system/game-data/library/games/cottage-games-data.json
↓
index.html / owned-games.html
↓
assets/js/script.js


---

## 9. 핵심 원칙

1. source는 원본이다.
2. generated는 자동 생성 중간 산출물이다.
3. cache는 API 재호출 방지용이다.
4. library/manual은 사람이 판단한 예외층이다.
5. library/games는 사이트가 읽는 최종 산출물이다.
6. game-config는 전체 게임 운영 기준 OS다.
7. UI보다 데이터/tools 안정화를 먼저 한다.
8. 추천게임찾기와 전체게임보기 역할을 섞지 않는다.
9. 자동화는 완전 자동보다 반자동 검증 구조로 간다.
10. generated와 library/games는 언제든 다시 생성 가능해야 한다.