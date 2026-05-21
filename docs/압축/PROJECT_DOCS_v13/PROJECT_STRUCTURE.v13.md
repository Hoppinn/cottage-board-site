# PROJECT_STRUCTURE.v13

## 0. 기준

이 문서는 코티지보드 홈페이지/게임 데이터 시스템의 최신 구조 기준이다.

이번 v13의 핵심 변화는 기존 TSV/match-result 중심 batch 구조에서 add-owned-game 중심 입력 구조로 중심축이 이동했다는 점이다.

기존 구조:
TSV / source
→ match-result
→ details-cache
→ build
→ final

현재 새 중심:
게임명 입력
→ add-owned-game.js
→ cache 조회
→ resolvedGame 생성
→ master.json + ledger.xlsx 생성
→ 향후 final 자동 build

---

## 1. 핵심 데이터 흐름

게임명 입력
예: node game-system/tools/admin/add-owned-game.js "아크노바"

↓  

add-owned-game.js

↓  

BGG details cache 조회

↓  

resolvedGame 생성

↓  

동시 출력:
1. ledger.xlsx
2. master.json
3. 향후 final json/js 자동 build

---

## 2. 데이터 역할 정의

### source / cache

진짜 원천 재료.

- BGG API
- BGG search cache
- BGG details cache
- manual match
- alias
- forced override
- 코티지 수동 규칙

주의:
운영 중 BGG API를 직접 실시간 호출하지 않는다.
BGG API는 cache를 쌓는 용도로만 사용한다.

---

### resolvedGame

프로그램 내부에서 게임명 1개를 기준으로 조립되는 표준 게임 객체.

역할:
- master 저장의 원본
- ledger 작성의 원본
- final build의 미래 원본
- UI/추천/상세페이지용 데이터 모델의 기반

현재 주요 필드:
- id
- ownedName
- titleKo
- titleEn
- bggId
- yearPublished
- minPlayers
- maxPlayers
- playingTime
- minPlayTime
- maxPlayTime
- minAge
- difficulty
- rating
- bayesRating
- usersRated
- rank
- designers
- artists
- publishers
- categories
- mechanics
- recommendedPlayers
- bestPlayers
- notRecommendedPlayers
- location
- comment
- tags
- image
- thumbnail
- description
- status
- source

---

### ledger.xlsx

사람이 빠르게 보는 간단 장부.

경로:
game-system/game-data/library/owned/ledger/cottage-owned-games-ledger.xlsx

역할:
- 보유게임명
- 난이도
- 위치
- 메커니즘
- 긱평점
- 1인~8인 이상 추천 인원
- 안 해본 게임 여부

중요:
굵은 글씨는 bestPlayers를 의미한다.
일반 글씨는 recommendedPlayers를 의미한다.

ledger는 원천이 아니다.
게임명 입력 후 생성/갱신되는 결과물이다.

---

### master.json

사람이 자세히 보는 상세 장부.

경로:
game-system/game-data/library/owned/master/cottage-owned-games-master.json

역할:
- 상세 데이터 확인
- 검수
- 수동 보정
- final build의 미래 기준 데이터

주의:
master도 사람용 결과물이다.
다만 시스템이 final을 만들 때도 참고하는 상세 기준 산출물이다.

---

### final json/js

홈페이지 출력용 데이터.

경로:
game-system/game-data/library/owned/final/cottage-games-data.json
game-system/game-data/library/owned/final/cottage-games-data.js

역할:
- 추천게임카드
- 전체게임보기
- 상세게임페이지
- 검색/필터/정렬
- 홈페이지 렌더링

현재:
아직 build-cottage-game-data.js는 legacy 구조를 주로 사용한다.

향후:
master 기반 build로 전환 예정.

---

## 3. 현재 실제 주요 폴더 구조

game-system/
├─ config/
│  ├─ shelf-groups.js
│  ├─ difficulty-levels.js
│  ├─ game-status.js
│  └─ tags/
│
├─ game-data/
│  │
│  ├─ generated/
│  │  ├─ cache/
│  │  │  ├─ bgg-search-cache.json
│  │  │  ├─ bgg-details-cache.json
│  │  │  ├─ bgg-match-result.json
│  │  │  ├─ bgg-search-candidates.json
│  │  │  └─ auto-english-candidates-cache.json
│  │  │
│  │  └─ maps/
│  │     └─ bgg-tag-translations.js
│  │
│  ├─ source/
│  │  ├─ csv/
│  │  └─ manual/
│  │     └─ cottage-owned-games.tsv
│  │
│  └─ library/
│     │
│     ├─ owned/
│     │  ├─ ledger/
│     │  │  ├─ cottage-owned-games-ledger.xlsx
│     │  │  └─ cottage-owned-games-ledger.json
│     │  │
│     │  ├─ master/
│     │  │  └─ cottage-owned-games-master.json
│     │  │
│     │  └─ final/
│     │     ├─ cottage-games-data.json
│     │     └─ cottage-games-data.js
│     │
│     ├─ manual/
│     │  ├─ forced-bgg-overrides.json
│     │  ├─ game-name-aliases.json
│     │  ├─ manual-bgg-matches.json
│     │  └─ mood-tag-rules.json
│     │
│     └─ images/
│
└─ tools/
   ├─ admin/
   │  ├─ add-owned-game.js
   │  └─ show-master-games.js
   │
   ├─ build/
   │  └─ build-cottage-game-data.js
   │
   ├─ core/
   │  ├─ paths.js
   │  ├─ read-write.js
   │  └─ normalize-game-name.js
   │
   ├─ fetch/
   │  └─ fetch-bgg-details.js
   │
   ├─ match/
   │  ├─ search-bgg-candidates.js
   │  ├─ score-bgg-candidates.js
   │  ├─ generate-name-candidates.js
   │  ├─ generate-auto-english-cache.js
   │  ├─ generate-auto-english-candidates.js
   │  ├─ search-bgg-candidates.js
   │  └─ auto-resolve-bgg-matches.js
   │
   ├─ source/
   │  └─ convert-owned-xlsx.js
   │
   ├─ tagging/
   │  └─ auto-tag-rules.js
   │
   └─ legacy/

---

## 4. tools 역할

### admin/add-owned-game.js

현재 핵심 엔진.

역할:
- 게임명 입력
- BGG details cache 조회
- resolvedGame 생성
- master.json 저장
- ledger.xlsx 저장
- 중복 방지
- cache 없으면 pending-cache 처리

현재 안정화 완료.

---

### admin/show-master-games.js

master.json 확인용.

역할:
- master 경로 출력
- version/source/total 출력
- sample 게임명 출력

---

### core/paths.js

모든 경로의 기준.

현재 중요한 canonical 경로:
- COTTAGE_OWNED_GAMES_MASTER_PATH
- COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH
- COTTAGE_GAMES_DATA_JSON_PATH
- COTTAGE_GAMES_DATA_JS_PATH
- BGG_DETAILS_CACHE_PATH
- BGG_SEARCH_CACHE_PATH
- BGG_MATCH_RESULT_PATH

중요:
master는 library/master가 아니라 library/owned/master 아래로 정리됨.

---

### fetch/fetch-bgg-details.js

BGG Thing API로 details cache를 쌓는 batch 도구.

현재:
ENABLE_BGG_THING_API = false

이유:
BGG API 승인 대기 중.

현재 pending:
약 425개.

역할:
- 운영 중 실시간 호출 아님
- cache 생성 전용

parser 확장 완료:
- average
- bayesaverage
- usersrated
- rank
- minage
- designers
- artists
- publishers
- categories
- mechanics
- suggested_numplayers

---

### match/search-bgg-candidates.js

BGG 후보 검색용.

현재:
- local CSV 검색 가능
- API search는 ENABLE_BGG_API_SEARCH = false
- search cache 구조 있음

---

### match/score-bgg-candidates.js

후보 점수화.

기능:
- 이름 유사도
- rank bonus
- usersRated bonus
- expansion penalty
- source bonus

---

### build/build-cottage-game-data.js

현재 legacy build.

현재 구조:
TSV + match-result + details-cache 기반.

주의:
즉시 제거하지 않는다.

향후:
master.json 기반 build로 전환 예정.

---

## 5. 현재 확정된 설계 철학

### API 실시간 호출 금지

운영 중 add-owned-game은 API를 직접 호출하지 않는다.
cache만 읽는다.

API는 별도 fetch 도구로 cache를 미리 쌓는다.

---

### pending-cache 허용

cache가 없어도 게임 등록은 가능해야 한다.

cache 없음:
status = pending-cache

cache 있음:
status = ready

나중에 cache가 생성되면 refresh 도구로 보강 예정.

---

### bestPlayers 중심

bestPlayers가 메인 추천 인원이다.

recommendedPlayers는 보조 추천 인원이다.

notRecommendedPlayers는 참고/제외용이다.

ledger에서는:
굵은 글씨 = bestPlayers
일반 글씨 = recommendedPlayers

홈페이지 추천에서도 bestPlayers 중심으로 설계한다.

---

## 6. 다음 작업 방향

### 시스템 쪽

나중에:
- pending-cache refresh 도구
- final auto rebuild 연결
- master 기반 build 전환
- GUI/간단 입력창
- 모바일 입력 관리 UI

---

### 홈페이지/UI 쪽

다음 우선순위:
1. 추천게임카드 구조 polish
2. 전체게임카드 구조 polish
3. 상세게임페이지 구조 설계
4. 모바일 UX
5. 매장안내
6. 브랜드 소개

작업 방식:
- 구조 시안 먼저
- A/B/C안 비교
- 확정 후 CSS/JS/HTML 묶음 수정
- 마지막에 디테일 polish
