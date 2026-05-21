# PROJECT_STRUCTURE.v14

## 0. 문서 목적

이 문서는 코티지보드 홈페이지/게임 데이터 시스템의 최신 canonical 구조 문서다.

v14의 목적은 단순 파일 목록이 아니라, 다음 작업자가 현재 프로젝트를 바로 이어받을 수 있도록 다음을 통합 정리하는 것이다.

- 실제 폴더/파일 구조
- 데이터 흐름
- tool 역할
- add-owned-game 중심 구조
- cache 철학
- ledger/master/final 역할
- pending-cache 구조
- legacy build 상태
- 향후 작업 방향

---

## 1. 현재 핵심 구조 요약

현재 프로젝트의 중심축은 기존 batch 변환 구조에서 add-owned-game 중심 구조로 이동했다.

기존 중심:

TSV / source
→ match-result
→ details-cache
→ build
→ final

현재 새 중심:

게임명 입력
→ add-owned-game.js
→ BGG details cache 조회
→ resolvedGame 생성
→ ledger.xlsx + master.json 생성
→ 향후 final json/js 자동 build

---

## 2. 핵심 원칙

### 2-1. API는 실시간 운영 의존 대상이 아니다

BGG API는 운영 중 매번 직접 호출하지 않는다.

BGG API의 역할은 cache를 미리 쌓는 것이다.

실제 운영 흐름은 cache를 읽는 방식으로 간다.

정리:

BGG API
→ bgg-search-cache / bgg-details-cache 생성

add-owned-game
→ cache 읽기
→ resolvedGame 생성
→ ledger/master/final 생성

---

### 2-2. ledger와 master는 둘 다 결과물이다

ledger는 원천이 아니다.

master도 원천이 아니다.

둘 다 게임명 입력과 cache/source 조합을 통해 생성되는 결과물이다.

다만 역할이 다르다.

ledger.xlsx:
- 사람이 빠르게 보는 간단 장부
- 표 형태
- 추천 인원/베스트 인원 확인 중심

master.json:
- 사람이 자세히 보는 상세 장부
- 많은 정보 보존
- 검수/수정용
- 향후 final build의 기준 데이터

---

### 2-3. final은 홈페이지 출력물이다

final json/js는 홈페이지가 직접 쓰는 배포용 데이터다.

final은 사람이 관리하는 원본이 아니다.

추천게임카드, 전체게임보기, 상세페이지, 검색/필터/정렬에 맞게 가공된 출력물이다.

---

### 2-4. bestPlayers가 메인이다

코티지보드 추천 시스템에서는 bestPlayers를 메인 기준으로 쓴다.

recommendedPlayers는 보조다.

notRecommendedPlayers는 참고/제외용이다.

ledger에서:
- 굵은 글씨 = bestPlayers
- 일반 글씨 = recommendedPlayers

홈페이지 추천에서도 bestPlayers 중심으로 설계한다.

---

## 3. canonical 데이터 흐름

### 3-1. 단건 입력 흐름

명령:

node game-system/tools/admin/add-owned-game.js "아크노바"

흐름:

1. 게임명 입력
2. add-owned-game.js 실행
3. BGG details cache 조회
4. cache에 있으면 상세 데이터 반영
5. cache에 없으면 pending-cache 상태로 등록
6. resolvedGame 생성
7. master.json에 저장
8. ledger.xlsx에 행 추가
9. 중복이면 추가하지 않음
10. 향후 final 자동 rebuild 연결 예정

---

### 3-2. cache 없는 경우

cache가 없더라도 보유게임 입력은 가능해야 한다.

이 경우:

status: "pending-cache"

의미:
- 이름은 등록됨
- ledger/master 생성됨
- BGG 상세 정보는 아직 없음
- 나중에 cache 생성 후 보강 가능

---

### 3-3. cache 있는 경우

cache가 있으면:

status: "ready"

반영 가능 데이터:
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
- image
- thumbnail
- description

---

## 4. 주요 산출물 경로

### 4-1. ledger

경로:

game-system/game-data/library/owned/ledger/cottage-owned-games-ledger.xlsx

역할:
- 사람용 간단 장부
- 엑셀 기반
- 굵은글씨로 bestPlayers 표현
- 추천 인원 표기

주의:
ledger.json은 현재 canonical이 아니다.
필요 없다면 폐기 후보.
진짜 ledger는 xlsx다.

---

### 4-2. master

경로:

game-system/game-data/library/owned/master/cottage-owned-games-master.json

역할:
- 사람용 상세 장부
- 상세 데이터 확인/검수
- 시스템이 향후 final build에 사용할 기준 데이터

주의:
이전 혼선 경로인 game-system/game-data/library/master 는 canonical이 아니다.
현재 canonical은 library/owned/master 다.

---

### 4-3. final

경로:

game-system/game-data/library/owned/final/cottage-games-data.json
game-system/game-data/library/owned/final/cottage-games-data.js

역할:
- 홈페이지 출력용
- 추천게임카드
- 전체게임보기
- 상세페이지
- 검색/필터/정렬

현재:
아직 build-cottage-game-data.js는 legacy 구조를 기반으로 final을 만든다.

향후:
master 기반 build로 이전해야 한다.

---

## 5. 주요 tool 구조

### 5-1. admin/add-owned-game.js

현재 핵심 엔진.

역할:
- 게임명 단건 입력
- cache 조회
- resolvedGame 생성
- master 저장
- ledger 저장
- pending-cache 처리
- 중복 방지

현재 상태:
1차 안정화 완료.

중요:
이 파일은 향후 CLI, GUI, 웹 관리자, 모바일 입력창의 공통 엔진이 될 가능성이 높다.

---

### 5-2. admin/show-master-games.js

master 확인용 도구.

역할:
- master 경로 출력
- version 출력
- source 출력
- total 출력
- sample 게임명 출력

---

### 5-3. core/paths.js

모든 경로의 기준 파일.

중요한 export:
- COTTAGE_OWNED_GAMES_MASTER_PATH
- COTTAGE_OWNED_GAMES_LEDGER_XLSX_PATH
- COTTAGE_GAMES_DATA_JSON_PATH
- COTTAGE_GAMES_DATA_JS_PATH
- BGG_DETAILS_CACHE_PATH
- BGG_SEARCH_CACHE_PATH
- BGG_MATCH_RESULT_PATH

주의:
개별 tool에서 경로를 하드코딩하지 않는다.
paths.js에서 가져다 쓴다.

---

### 5-4. core/read-write.js

json/text read/write 공통 도구.

역할:
- readJson
- writeJson
- readText
- writeText 계열

---

### 5-5. core/normalize-game-name.js

게임명 정규화 도구.

역할:
- 한글/영문명 비교
- 후보 검색
- match scoring
- alias 처리 기반

---

### 5-6. fetch/fetch-bgg-details.js

BGG Thing API 상세정보 fetch 도구.

현재:
ENABLE_BGG_THING_API = false

이유:
API 승인 대기 중.

역할:
- bgg-match-result를 보고 필요한 bggId 추출
- BGG Thing API 호출
- bgg-details-cache.json 생성/갱신

현재 parser 확장 완료:
- image
- thumbnail
- description
- yearpublished
- minplayers
- maxplayers
- playingtime
- minplaytime
- maxplaytime
- minage
- averageweight
- average
- bayesaverage
- usersrated
- rank
- designers
- artists
- publishers
- categories
- mechanics
- suggested_numplayers

중요:
이 도구는 운영 중 실시간 호출용이 아니다.
cache 생성용 batch 도구다.

---

### 5-7. match/search-bgg-candidates.js

BGG 후보 검색 도구.

현재 구조:
- local CSV 검색 가능
- BGG API search는 ENABLE_BGG_API_SEARCH = false
- search cache 사용

역할:
- 한국어/영어 후보명 기반으로 BGG 후보 목록 수집
- local csv + api search 후보 병합

---

### 5-8. match/score-bgg-candidates.js

후보 점수화 도구.

기능:
- 이름 유사도
- rank bonus
- usersRated bonus
- expansion penalty
- source bonus

역할:
- search 후보 중 가장 가능성 높은 BGG 게임을 고름

---

### 5-9. build/build-cottage-game-data.js

현재 final build 도구.

현재 상태:
legacy 구조.

현재 입력:
- TSV
- match-result
- details-cache
- owned-games-normalized

현재 출력:
- cottage-games-data.json
- cottage-games-data.js

중요:
즉시 제거하지 않는다.
현재 홈페이지가 이 구조에 의존할 가능성이 높다.

향후:
master.json 기반 build로 전환 예정.

---

### 5-10. source/convert-owned-xlsx.js

원본 xlsx/source 변환 관련 도구.

역할:
- 기존 source를 읽어 중간 데이터로 변환
- 대량 입력/초기 이관용으로 남겨둔다

---

### 5-11. tagging/auto-tag-rules.js

자동 태그 규칙.

역할:
- mechanics/categories/difficulty/player count 등을 보고 코티지 태그 자동 생성
- final build에서 활용 가능

---

### 5-12. legacy/

예전 batch 파이프라인 도구 보관 위치.

주의:
즉시 삭제하지 않는다.
현재 구조 전환 중이므로 일부는 아직 참고/복구용이다.

---

## 6. 현재 전체 폴더 스냅샷

아래 파일은 PowerShell로 자동 생성된 실제 로컬 파일트리 스냅샷이다.

- docs/PROJECT_DOCS_v14/FULL_TREE_SNAPSHOT.v14.txt

이 스냅샷은 node_modules, .git, dist, build 폴더를 제외하고 생성한다.

---

## 7. 현재 미완 항목

### 7-1. BGG details cache 생성

현재 bgg-details-cache.json은 거의 비어 있음.

fetchBggDetails 실행 결과:
pending 약 425개

API 승인 후:
ENABLE_BGG_THING_API = true
로 변경한 뒤 fetch 실행 필요.

---

### 7-2. pending-cache refresh tool

필요한 도구:

refresh-owned-games-from-cache.js

역할:
- master에서 pending-cache 게임 찾기
- details cache에 해당 데이터 생겼는지 확인
- 있으면 ready로 보강
- ledger/final 필요 시 갱신

---

### 7-3. final auto rebuild

현재 add-owned-game은 master/ledger까지 생성.

향후:
add-owned-game 실행 후 build-cottage-game-data 또는 master 기반 build를 자동 실행할 수 있어야 한다.

---

### 7-4. master 기반 build

현재 build는 legacy.

향후:
master.json
→ final json/js

로 바꾸는 build 도구 필요.

추천:
기존 build-cottage-game-data.js를 바로 갈아엎기보다,
build-cottage-game-data-from-master.js 같은 새 파일로 병행 개발.

---

### 7-5. 입력 편의화

현재:
CLI 명령어 입력

향후:
- 간단 입력창
- GUI
- 웹 관리자
- 모바일 입력 UI

단:
입력창은 껍데기다.
엔진은 add-owned-game.js다.

---

## 8. 홈페이지/UI 다음 작업

데이터 시스템 1차 안정화 이후 다음 우선순위:

1. 추천게임카드 구조 polish
2. 전체게임카드 구조
3. 상세게임페이지 구조
4. 모바일 UX
5. 매장안내
6. 브랜드 소개

작업 원칙:
- 구조 시안 먼저
- A/B/C안 비교
- 확정 후 HTML/CSS/JS 묶음 수정
- 마지막에 디테일 polish

---

## 9. 작업 방식

앞으로 문서 생성은 로컬 docs 폴더에 PowerShell로 직접 생성한다.

기준 폴더:

docs/PROJECT_DOCS_vXX

장점:
- 긴 MD 복붙 실수 감소
- 파일/zip 직접 생성
- 다음방 업로드 쉬움
- 실제 운영문서 축적 가능
- 채팅 렉 감소

---

## 10. 다음방 인수인계 핵심

다음 작업자는 다음을 반드시 지켜야 한다.

- add-owned-game/core/cache 구조를 함부로 흔들지 말 것
- BGG API를 실시간 운영 호출로 바꾸지 말 것
- ledger/master/final 역할을 혼동하지 말 것
- build legacy를 즉시 제거하지 말 것
- UI 작업은 구조 시안부터 비교할 것
- bestPlayers를 메인 추천 기준으로 볼 것
