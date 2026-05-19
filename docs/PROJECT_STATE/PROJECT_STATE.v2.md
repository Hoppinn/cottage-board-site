# PROJECT_STATE.v2.md

# COTTAGEBOARD PROJECT STATE

## 0. 현재 작업 단계

현재는 UI 수정 단계가 아니라, `game-system` 기준으로 데이터/tools 파이프라인을 재정렬하는 단계다.

기존 루트 구조였던:

- game-config
- game-data
- game-data-tools

를 하나의 상위 시스템 폴더인 `game-system` 아래로 이동하는 중이다.

목표는 보드게임 데이터, 설정값, 자동화 tools를 한 덩어리의 “게임 운영 시스템”으로 묶는 것이다.


---

## 1. 출력 / 작업 workflow

앞으로 긴 코드/전문 출력 시에는 채팅에 대량 텍스트를 직접 붙여넣기하는 방식보다:

- 파일 생성
- 다운로드
- 기존 파일 교체

workflow를 우선 사용한다.

특히 프로젝트 작업에서는:

- JS 전문
- CSS 전문
- HTML 전문
- MD 전문
- JSON 전문

등의 긴 출력은 가능하면 파일 생성 방식으로 제공하여 렉과 복사 부담을 줄이는 것을 기본 원칙으로 한다.

즉:

- 입력 = 필요한 부분 복붙
- 출력 = 다운로드 파일 생성

방식을 기본 workflow로 유지한다.


---

## 2. 현재 확정 방향

### 추천게임찾기

역할:
- 감성 큐레이션 UI
- 손님이 “오늘 어떤 게임이 어울리는지” 고르는 흐름
- 인원 / 난이도 / 분위기 중심
- 게임을 잘 모르는 손님에게 추천해주는 기능

주의:
- 전체게임보기처럼 DB 탐색형으로 만들지 말 것
- 감성 / 상황 / 체류 경험 중심


### 전체게임보기

역할:
- DB / 도감형 UI
- 보유 게임 전체 목록
- 정렬 / 필터 / 검색 / 상세보기
- BGG 정보와 코티지 정보를 함께 볼 수 있는 구조

주의:
- 추천게임찾기와 역할 섞지 말 것
- 여기는 감성 큐레이션이 아니라 데이터 탐색


---

## 3. 현재 canonical 루트 구조

ROOT
├─ index.html
├─ owned-games.html
├─ assets/
├─ docs/
│  ├─ PROJECT_STRUCTURE/
│  └─ PROJECT_STATE/
└─ game-system/
   ├─ config/
   ├─ game-data/
   └─ tools/


---

## 4. 문서 버전 관리 시스템

문서 구조:

docs/
├─ PROJECT_STRUCTURE/
│  ├─ PROJECT_STRUCTURE.v1.md
│  ├─ PROJECT_STRUCTURE.v2.md
│  └─ ...
│
└─ PROJECT_STATE/
   ├─ PROJECT_STATE.v1.md
   ├─ PROJECT_STATE.v2.md
   └─ ...

원칙:

- PROJECT_STRUCTURE = 구조 정의용 canonical 문서
- PROJECT_STATE = 현재 진행상황 / TODO / RAM 문서

추가 원칙:

- structure는 저빈도 갱신
- state는 고빈도 갱신

새 채팅방 시작 시에는:

Canonical:
- PROJECT_STRUCTURE.vX 기준
- PROJECT_STATE.vY 기준

형태로 현재 기준 버전을 먼저 명시한다.


---

## 5. 현재 공식 build pipeline

실행 파일:

game-system/tools/convert-bgg.js

실행 명령:

node game-system/tools/convert-bgg.js

공식 흐름:

convert-bgg.js
↓
auto-resolve-bgg-matches.js
↓
fetch-bgg-details.js
↓
build-cottage-game-data.js


---

## 6. 현재 canonical path 규칙

구식 export명 사용 중단:

- ownedGamesTsv
- bggMatchResult
- bggDetailsCache
- finalGameDataJson
- finalGameDataJs

현재 canonical export명:

- COTTAGE_OWNED_GAMES_TSV_PATH
- BGG_MATCH_RESULT_PATH
- BGG_DETAILS_CACHE_PATH
- COTTAGE_GAMES_DATA_JSON_PATH
- COTTAGE_GAMES_DATA_JS_PATH

원칙:

- 디렉토리 = *_DIR
- 실제 파일 = *_PATH
- 모든 tools 파일은 paths.js만 참조
- 개별 파일에서 경로 하드코딩 금지


---

## 7. 현재 중요한 문제

1.
실제 game-system 구조 이동 후 실행 테스트 필요

2.
index.html / owned-games.html script 경로 수정 필요

3.
legacy 파일 분리 필요

4.
auto-tag-rule 시스템 설계 필요

5.
최종 gameData schema 확정 필요

6.
script.js 역할 분리 필요

7.
style.css 누적 패치 정리 필요


---

## 8. 현재 미완 핵심

- game-system 기준 경로 이동 테스트
- auto-tag-rule 시스템 완성
- 최종 gameData 구조 확정
- 자동 태그 + 수동 보정 merge 구조
- build-cottage-game-data.js 리팩토링
- 전체게임 상세페이지 UI 연결
- 전체게임보기 HTML 중복 정리
- script.js 역할 분리
- style.css 누적 패치 정리
- add-game 자동화 시스템
- CMD/EXE 기반 add-game 입력 구조
- 서버 직접 입력 + 모바일 관리 구조
- BGG API fetch 활성화 여부
- manual / legacy 파일 정리


---

## 9. 현재 핵심 운영 원칙

1.
UI보다 data/tools 안정화를 먼저 한다.

2.
추천게임찾기와 전체게임보기 역할을 섞지 않는다.

3.
추천게임찾기 = 감성 큐레이션

4.
전체게임보기 = DB / 도감형 탐색

5.
game-config는 기준 정의층(OS)이다.

6.
generated는 자동 생성 중간 산출물이다.

7.
library/manual은 사람이 개입하는 예외층이다.

8.
library/games는 최종 출력층이다.

9.
긴 전문 출력은 가능하면 다운로드 파일 방식으로 제공한다.

10.
작업방 이동 전에는 PROJECT_STRUCTURE / PROJECT_STATE를 갱신한다.


---

## 10. 다음방 첫 메시지

코티지보드 홈페이지 프로젝트 이어서 간다.

Canonical:
- PROJECT_STRUCTURE.v1 기준
- PROJECT_STATE.v2 기준

현재 구조를 game-system 기준으로 바꿨다.

폴더 이동:
- game-config → game-system/config
- game-data → game-system/game-data
- game-data-tools → game-system/tools

paths.js는 game-system/tools/core/paths.js 기준으로 수정했다.

다음은:

node game-system/tools/convert-bgg.js

실행 테스트 후 터지는 경로/import를 하나씩 잡는다.

주의:
- UI 먼저 건드리지 말 것
- 데이터/tools pipeline 안정화 우선
- 구식 path export명 사용 금지
- canonical *_PATH / *_DIR 기준 유지
