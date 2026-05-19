# PROJECT_STATE.md

# COTTAGEBOARD PROJECT STATE

## 0. 현재 작업 단계

현재는 UI 수정 단계가 아니라, game-system 기준으로 데이터/tools 파이프라인을 재정렬하는 단계다.


---

## 1. 현재 확정 방향

### 추천게임찾기

역할:
- 감성 큐레이션 UI
- 손님이 “오늘 어떤 게임이 어울리는지” 고르는 흐름
- 인원 / 난이도 / 분위기 중심
- 게임을 잘 모르는 손님에게 추천해주는 기능

주의:
- 전체게임보기처럼 DB 탐색형으로 만들지 말 것
- 감성/상황/체류 경험 중심


### 전체게임보기

역할:
- DB / 도감형 UI
- 보유 게임 전체 목록
- 정렬 / 필터 / 검색 / 상세보기
- BGG 정보와 코티지 정보를 함께 볼 수 있는 구조

주의:
- 추천게임찾기와 역할 섞지 말 것
- 여기는 감성 큐레이션이 아니라 데이터 탐색


### 상세페이지 / 바텀시트

역할:
- 코티지 큐레이션 정보 + BGG 정보 혼합
- 추천 인원
- 플레이 시간
- 난이도
- 체감 난이도
- 코티지 코멘트
- 룰 요약
- 추천 포인트
- 설명 영상
- BGG 정보
- 디자이너 / 디자이너의 다른 작품까지 확장 가능


---

## 2. 현재까지 완료된 것

### 프론트

- index.html 생성
- owned-games.html 생성
- style.css 전체 UI 정리본 존재
- script.js에 추천게임찾기 / 전체게임보기 / 상세 바텀시트 로직 존재
- 로고 이미지 존재
- 히어로 이미지 존재

### 데이터

- cottage-owned-games.tsv 존재
- boardgames_ranks.csv 존재
- bgg-match-result.json 생성 구조 존재
- bgg-search-cache.json 존재
- bgg-details-cache.json 존재
- cottage-games-data.js/json 생성 구조 존재

### game-config

현재 폴더 구조:
- game-config/difficulty-levels.js
- game-config/shelf-groups.js
- game-config/tag/mood-groups.js
- game-config/tag/play-tags.js
- game-config/tag/relationship-tags.js
- game-config/tag/tag-utils.js

### tools

현재 최신 계열로 볼 파일:
- game-data-tools/core/paths.js
- game-data-tools/core/read-write.js
- game-data-tools/core/normalize-game-name.js
- game-data-tools/match/auto-resolve-bgg-matches.js
- game-data-tools/match/generate-name-candidates.js
- game-data-tools/match/search-bgg-candidates.js
- game-data-tools/match/score-bgg-candidates.js
- game-data-tools/fetch/fetch-bgg-details.js
- game-data-tools/build/build-cottage-game-data.js
- game-data-tools/convert-bgg.js


---

## 3. 현재 가장 중요한 문제

### 1. 최신 파일과 예전 파일이 섞여 있음

현재 tools 안에는 최신 구조 파일과 예전 실험 파일이 같이 있다.

정리 필요:
- canonical pipeline 확정
- legacy 파일 분리
- 중복 build/fetch 제거
- 오래된 manual match 흐름 정리


### 2. paths.js가 현재 위험함

문제: 
- `GAME_CONFIG_DIR`
- `GAME_CONFIG_TAG_DIR`

이 module.exports 아래에서 선언되어 있음.

즉, 선언 전에 사용하는 구조라 실행 오류 가능성이 큼.

다음방 첫 작업 후보:
- paths.js 정리
- 모든 경로 상수 위에서 선언
- module.exports는 마지막에 한 번만


### 3. script.js가 너무 많은 책임을 가짐

현재 script.js가 담당하는 것:
- 메뉴
- 추천 페이지 전환
- 추천 필터
- 게임 카드
- 상세 바텀시트
- 전체게임보기
- 정렬
- 필터
- 페이지네이션
- difficulty system

향후 분리 필요:
- menu.js
- recommend.js
- owned-games.js
- game-sheet.js
- game-utils.js

하지만 지금 당장은 UI 분리보다 데이터/tools 안정화가 우선.


### 4. style.css에 패치가 많이 누적됨

현재 상태:
- recommend/modal/owned/page fix들이 계속 아래에 덧붙은 상태
- CSS 안에 HTML 조각이 들어간 흔적 있음

정리 필요:
- 나중에 UI 정리 단계에서 진행
- 지금은 우선순위 낮음


### 5. game-config와 script.js의 중복

현재 difficulty 기준이 두 곳에 있음:
- script.js
- game-config/difficulty-levels.js

나중에는 game-config가 single source of truth가 되어야 함.


### 6. BGG detail fetch가 꺼져 있음

현재:
- ENABLE_BGG_THING_API = false
- ENABLE_BGG_API_SEARCH = false

그래서 최종 gameData에 averageweight, minplayers, categories, mechanics 등이 비거나 0일 수 있음.

현재는 파이프라인 구조 완성이 먼저.


---

## 4. 현재 공식으로 유지할 방향

### 공식 빌드라인

convert-bgg.js
↓
auto-resolve-bgg-matches.js
↓
fetch-bgg-details.js
↓
build-cottage-game-data.js

이 흐름을 유일한 공식 빌드라인으로 정한다.


---

## 5. 데이터 계층 정의

### source

원본 입력 데이터.
사람이 직접 관리하거나 외부에서 받은 원본.

예:
- cottage-owned-games.tsv
- boardgames_ranks.csv


### generated

자동 생성 중간 산출물.
삭제 후 재생성 가능해야 함.

예:
- bgg-match-result.json
- bgg-search-cache.json
- bgg-details-cache.json
- auto-english-candidates-cache.json


### library/manual

사람이 직접 판단한 예외/보정층.

예:
- forced-bgg-overrides.json
- game-name-aliases.json
- mood-tag-rules.json


### library/games

사이트가 실제로 읽는 최종 산출물.

예:
- cottage-games-data.js
- cottage-games-data.json


### game-config

게임 운영 기준 OS.

예:
- difficulty-levels
- shelf-groups
- mood-groups
- play-tags
- relationship-tags
- auto-tag-rules


---

## 6. 현재 gameData 스키마 상태

현재 final gameData에는 다음 필드들이 들어감.

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
- minplaytime
- maxplaytime
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

다음 재설계 때 추가/정리할 후보:

- difficultyWeight
- difficultyId
- shelfGroupId
- playTagIds
- moodGroupIds
- relationshipTagIds
- autoTags
- manualTags
- displayTags
- designer
- designerOtherGames
- bggRating
- cottageRating
- status


---

## 7. 다음방에서 먼저 해야 할 일

다음방에서는 바로 코드 수정하지 말고, 먼저 전체 재설계를 한다.

순서:

1. 현재 PROJECT_STRUCTURE.md와 PROJECT_STATE.md를 읽고 전체 구조 파악
2. canonical pipeline 확정
3. 최신 파일 / legacy 파일 분리 기준 확정
4. 최종 gameData schema 확정
5. game-config 역할 확정
6. auto-tag-rules 설계
7. paths.js 정리 방향 확정
8. build-cottage-game-data.js 수정 방향 확정
9. 새 PROJECT_STRUCTURE.md / PROJECT_STATE.md 다시 생성
10. 그 다음방에서 실제 수정 작업 시작


---

## 8. 다음방 첫 메시지

아래 문구로 시작하면 된다.

“이 프로젝트는 코티지보드 홈페이지 제작 작업이다. 아래 PROJECT_STRUCTURE.md와 PROJECT_STATE.md를 기준으로 전체 구조를 먼저 재설계하자. 바로 코드 수정하지 말고, 현재 구조의 canonical pipeline, legacy 분리, 최종 gameData schema, game-config 역할, auto-tag-rules 구조부터 확정한 뒤, 새 PROJECT_STRUCTURE.md와 PROJECT_STATE.md를 다시 만들어줘.”


---

## 9. 절대 주의사항

- UI 먼저 다시 만지지 말 것
- 데이터 구조와 tools 안정화 우선
- 추천게임찾기와 전체게임보기 역할 섞지 말 것
- 추천게임찾기 = 감성 큐레이션
- 전체게임보기 = DB / 도감형
- game-config = 기준 정의층
- library/manual = 사람이 개입하는 예외층
- generated = 자동 생성층
- library/games = 최종 출력층
- 실제 최신 코드는 로컬 기준
- 작업방 넘어가기 전에는 항상 PROJECT_STRUCTURE.md와 PROJECT_STATE.md를 갱신할 것


---

## 10. 현재 미완 핵심

- paths.js 정리
- auto-tag-rule 시스템 완성
- 최종 gameData 구조 확정
- 자동 태그 + 수동 보정 merge 구조
- build-cottage-game-data.js 리팩토링
- 전체게임 상세페이지 UI 연결
- 전체게임보기 HTML 중복 정리
- script.js 역할 분리
- style.css 누적 패치 정리
- 새 게임 한글명만 입력하면 자동으로 tools 실행되는 add-game 시스템
- CMD/EXE/입력창 기반 add-game 검토
- 서버 직접 입력 + 핸드폰 관리 구조 검토
- BGG API fetch 활성화 여부 검토
- manual/legacy 파일 정리