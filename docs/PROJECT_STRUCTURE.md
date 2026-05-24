# PROJECT_STRUCTURE.v16

기준: 2026-05-22
이전 버전: v15 (2026-05-21) — 전체 디렉토리 재편 후 반영.

---

## 0. 이 문서의 목적

이 문서는 단순 파일 목록이 아니다.

- **왜** 이 구조인지 의도를 기록한다
- **현재 상태**와 **미래 의도**를 구분한다
- 다음 작업자(또는 AI)가 의도를 오해하지 않도록 한다
- 구조를 바꿀 때 이 문서를 먼저 바꾼다

---

## 1. 프로젝트 목적

코티지보드는 24시 무제한 보드게임카페다.

이 홈페이지는 두 가지 경험을 제공한다.

**추천게임찾기**
손님이 인원 / 난이도 / 분위기를 고르면 어울리는 게임을 추천한다.
게임을 모르는 손님을 위한 감성 큐레이션 UX.

**전체게임보기**
보유 게임 전체를 검색 / 정렬 / 필터링하는 DB 탐색 페이지.
추천게임찾기와 역할을 섞지 않는다.

---

## 2. 핵심 설계 원칙

1. BGG API는 실시간 호출하지 않는다. cache를 먼저 쌓고, 운영은 cache를 읽는다.
2. 사이트 출력 데이터(output)는 운영자용 관리 데이터와 분리된다.
3. source는 원본이다. staging은 재생성 가능한 중간물이다. output은 사이트가 읽는 최종물이다.
4. UI 작업보다 데이터/tools 안정화를 먼저 한다.
5. 추천게임찾기와 전체게임보기의 역할을 섞지 않는다.
6. 모든 경로는 paths.js에서만 관리한다. 파일 안에 하드코딩하지 않는다.
7. bestPlayers가 메인 추천 인원이다. recommendedPlayers는 보조다.

---

## 3. 루트 구조

```
cottage-board-site/
├── index.html
├── owned-games.html
├── store-usage-guide.html
├── contact.html
├── package.json
├── assets/
├── game-system/
└── docs/
```

---

## 4. 프론트엔드: assets/

```
assets/
├── css/
│   └── style.css
├── js/
│   ├── script.js
│   ├── game-display-adapter.js
│   └── config/                  ← 빌드 도구가 config 복사본을 놓을 예정 (현재 비어있음)
└── images/
    └── main/
        ├── logo.png
        └── hero.png
```

### assets/css/style.css

전체 스타일. index / owned-games / 공통 헤더 / 바텀시트 모두 포함.
현재 누적 패치 상태. 구조 확정 후 정리 예정.

### assets/js/script.js

메인 프론트 로직. 현재 모든 기능이 통합되어 있음.

담당:
- 모바일 메뉴
- 헤더 검색 (초성 검색 포함)
- 추천게임찾기 필터 상태 및 렌더링
- 게임 카드 렌더링
- 게임 상세 바텀시트
- 전체게임보기 정렬 / 필터 / 페이지네이션

향후 분리 후보 (현재는 통합 유지):
- recommend.js
- owned-games.js
- game-sheet.js
- menu.js

### assets/js/game-display-adapter.js

window.CottageGameView 제공.

역할: gameData(raw DB 구조)를 화면 출력용 데이터로 변환하는 어댑터.
script.js가 game.bgg.weight 같은 deep path를 직접 뒤지지 않도록 중앙화.

원칙: BGG 값과 cottage 값이 겹치면 cottage 값 우선.

주요 함수:
- getGameCardData(game)
- getGameDetailData(game)
- getRecommendData(game)
- getAllGamesArray(gameData)

---

## 5. 게임 시스템: game-system/

```
game-system/
├── config/
├── game-data/
└── tools/
```

game-system은 홈페이지 게임 데이터의 생성 / 관리 / 운영 시스템 전체다.
프론트(assets/)와 완전히 분리되어 있다.

---

## 6. game-system/config/

```
config/
├── difficulty-levels.js
├── shelf-locations.js
├── bgg-label-map.js
└── tags/
    ├── mood-tags.js
    ├── play-mechanism-tags.js
    ├── relationship-tags.js
    └── game-tag-matcher.js
```

config는 전체 게임 운영의 기준 상수다.
사람이 직접 수정하는 개별 게임 데이터가 아니라,
전체 게임 데이터에 적용되는 분류 체계와 기준값이 여기에 있다.

### config/difficulty-levels.js

BGG weight 또는 코티지 체감 난이도 수치를 5단계로 변환하는 기준.

단계:
- kids: 0 ~ 1.10
- beginner: 1.11 ~ 1.50
- light_family: 1.51 ~ 2.50
- heavy_mania: 2.51 ~ 3.50
- hardcore: 3.51 ~ 5.00

주의: script.js 내부에 DIFFICULTY_LEVELS 상수가 중복 존재함. 장기적으로 단일 소스로 통합 필요.

### config/shelf-locations.js

매장 실제 책장 위치 기준. 추천 태그가 아니라 운영/배치 기준.

현재 구조:
- A: 파티게임 / A-1~A-5 세부
- B: 라이트패밀리 / B-1
- C: 헤비전략 / C-1
- D: 작은상자게임
- E: 2인 베스트
- F: 기타공간

데이터에서는 shelfGroupId로 연결. 화면에는 shelfLabel / shelfFullLabel로 표시.

### config/bgg-label-map.js

BGG 영어 mechanics / categories를 한국어로 번역하는 lookup map.
자동 생성물이 아니라 수동 유지 번역표.
HTML에서 script 태그로 직접 로드됨 (tools에서는 require 안 함).

```html
<script src="game-system/config/bgg-label-map.js"></script>
```

### config/tags/

추천 / 태그 시스템의 기준 정의.
- mood-tags.js: 분위기 그룹 정의
- play-mechanism-tags.js: 플레이 유형 태그 정의
- relationship-tags.js: 관계/상황 태그 정의 (장기적으로 situationTags + interactionTags로 분리 예정)
- game-tag-matcher.js: 매칭 유틸 함수

주의: game-tag-matcher.js는 ES module 문법(import/export) 사용 중.
tools는 CommonJS(require) 환경이므로 현재 tools에서 직접 require 불가. 장기 해소 필요.

---

## 7. game-system/game-data/

```
game-data/
├── source/
├── staging/
└── library/
```

세 개 레이어의 역할이 명확하게 분리된다.

| 레이어 | 역할 | 수정 주체 |
|--------|------|-----------|
| source | 원본 입력 | 사람 또는 외부 |
| staging | 자동 생성 중간물 | tools 실행 |
| library | 최종 정제물 | build 결과 + 사람 보정 |

---

## 7-1. game-data/source/

```
source/
├── 1-bgg/
│   ├── csv/
│   │   └── boardgames_ranks.csv    ← BGG 랭킹 전체 CSV
│   └── api/                        ← BGG API 응답 원본 보관 (현재 비어있음)
│       ├── 1-search/
│       ├── 2-thing/
│       └── 3-rankings/
└── 2-cottage-manual/
    └── cottage-owned-games.xlsx    ← 굵은글씨(bestPlayers) 포함 원본
```

### source/1-bgg/csv/boardgames_ranks.csv

BGG 전체 게임 랭킹 CSV 다운로드.
BGG 이름 후보 검색 시 이 파일을 로컬에서 조회한다 (API 호출 최소화).
BGG API search가 활성화되면 보조 역할이 된다.

### source/2-cottage-manual/cottage-owned-games.xlsx

코티지보드 보유게임 목록 원본.
굵은 글씨 = bestPlayers (베스트 인원). 이 정보는 TSV 변환 시 소실되므로 XLSX만 보존.
TSV는 삭제됨 — XLSX가 유일한 수동 입력 원본.

---

## 7-2. game-data/staging/

자동 생성 중간 산출물. 직접 편집하지 않는다. 삭제해도 tools 실행으로 재생성 가능.

```
staging/
├── bgg-id-mapping/
│   ├── 1-search-candidates.json        ← 이름 후보 목록 캐시
│   ├── 2-match-map.json                ← 한국어 보유게임명 → BGG ID 매칭 결과
│   └── 3-unresolved-candidates.json   ← 자동 영어 후보 캐시 (AI/번역 연결 예정)
└── bgg-api-snapshot/
    ├── bgg-name-search.json            ← BGG 이름 검색 결과 캐시
    └── bgg-game-details.json           ← BGG 상세 정보 캐시 (현재 대부분 비어있음)
```

### staging/bgg-id-mapping/2-match-map.json

b_run-local-match.js 실행 결과.
한국어 보유게임명과 BGG 게임 ID의 매칭 결과.

status 체계:
- forced: human-input/overwrite/forced-bgg-overrides.json으로 강제 지정
- auto-confirmed: 자동 매칭 신뢰도 높음 (score >= 80, gap >= 8)
- needs-review: 자동 매칭 있으나 검수 필요 (score >= 55)
- unresolved: 매칭 실패

### staging/bgg-api-snapshot/bgg-game-details.json

BGG Thing API로 수집한 게임 상세 데이터 캐시.

현재 상태: BGG API 승인 완료, ENABLE_BGG_THING_API = true. 636개 중 ~346개 수집 완료 (일부 429 rate limit으로 pending).
API 승인 후 2-fetcher/a_fetch-bgg-game-data-by-id.js를 실행하면 채워진다.

포함 예정 데이터:
image, thumbnail, description, yearpublished, minplayers, maxplayers,
playingtime, averageweight, average(rating), bayesaverage, usersrated,
rank, designers, artists, publishers, categories, mechanics,
suggested_numplayers (best/recommended/not_recommended)

### staging/bgg-id-mapping/3-unresolved-candidates.json

unresolved 게임들에 대한 영어 이름 후보 캐시.
향후 AI 번역 / 외부 API 연결로 자동 생성 예정.
현재는 수동으로 채우거나 비어있는 상태.

---

## 7-3. game-data/library/

최종 정제된 라이브러리. 홈페이지와 운영자가 실제로 읽는 데이터.

```
library/
├── 1-master/
│   └── cottage-owned-games-master.json
├── 2-ledger/
│   ├── cottage-owned-games-ledger.xlsx
│   └── cottage-owned-games-ledger.json
├── 3-output/                            ← 홈페이지 사이트 출력 (독립 경로)
│   ├── cottage-games-data-output.js
│   └── cottage-games-data-output.json
├── human-input/                         ← 사람이 판단한 예외/보정 레이어
│   ├── overwrite/
│   │   ├── forced-bgg-overrides.json
│   │   └── mood-tag-rules.json
│   └── missing-fill/                    ← 자동 처리 불가 항목 수동 보완 (현재 비어있음)
└── images/
    ├── thumb/
    └── detail/
```

### library/1-master/cottage-owned-games-master.json

사람이 자세히 보는 상세 장부. 검수 / 수동 보정용.
build-master.js 실행으로 생성. final output build(build-output.js)의 기준 데이터.

저장되는 resolvedGame 구조:
id, ownedName, titleKo, titleEn, bggId, yearPublished,
minPlayers, maxPlayers, playingTime, minPlayTime, maxPlayTime,
minAge, difficulty, rating, bayesRating, usersRated, rank,
designers, artists, publishers, categories, mechanics,
recommendedPlayers, bestPlayers, notRecommendedPlayers,
location, comment, tags, image, thumbnail, description,
status (ready / pending-cache), createdAt, updatedAt, source

### library/2-ledger/

운영자가 빠르게 보는 간단 장부.
- ledger.xlsx: 굵은 글씨 = bestPlayers, 일반 글씨 = recommendedPlayers
- ledger.json: XLSX의 JSON 변환본

### library/3-output/

홈페이지가 직접 읽는 배포용 최종 데이터.
사이트 출력이라는 역할이 1-master/2-ledger 게임 관리와 개념이 다르기 때문에 독립 경로로 둔다.

HTML에서 script 태그로 직접 로드:
```html
<script src="game-system/game-data/library/3-output/cottage-games-data-output.js"></script>
```

직접 편집하지 않는다. build 실행으로 생성한다.

gameData 최종 스키마:
```js
{
  id,
  title: { display, owned, bgg },
  bgg: {
    id, matchStatus, year, rating, weight,
    minPlayers, maxPlayers,
    bestPlayers, recommendedPlayers, notRecommendedPlayers,
    playingTime, minPlayTime, maxPlayTime,
    categories, mechanics, designers, description
  },
  cottage: {
    status, shelfGroupId, shelfLabel, shelfFullLabel,
    difficultyId, difficultyWeight,
    moodTags, playTags, situationTags, interactionTags,
    manualTags, autoTags, displayTags,
    comment, ruleSummary, recommendPoint, caution, youtubeUrl
  },
  images: { main, thumbnail, source, type },
  community: { reviewEnabled, ratingEnabled, boardId }
}
```

### library/human-input/

사람이 직접 판단해서 관리하는 예외 / 보정 레이어.

**overwrite/** — 자동 처리 결과를 덮어쓰는 강제 보정:
- forced-bgg-overrides.json: 자동 매칭 결과를 특정 BGG ID로 강제 지정
- mood-tag-rules.json: 분위기 태그 수동 보정 규칙

**missing-fill/** — 자동화가 채우지 못한 항목을 수동 보완 (현재 비어있음)

---

## 8. game-system/tools/

빌드 / 관리 / 데이터 파이프라인 스크립트.

```
tools/
├── _core/                           ← 모든 tools의 공통 인프라
├── 0-input/                         ← 게임 데이터 입력 도구
├── 1-matcher/                       ← 한국어명 → BGG ID 매칭 파이프라인
├── 2-fetcher/                       ← BGG API 수집 도구
├── 3-build-master/                  ← master.json 빌드
├── 4-label-translator/              ← BGG 영어 labels → 한국어 번역 (categoriesKo / mechanicsKo)
└── 5-build-output/                  ← 사이트 출력 데이터 빌드
```

---

### tools/_core/

모든 tools의 공통 인프라.

**paths.js**
프로젝트 전체 경로 상수 관리.
모든 tool은 경로를 여기서만 가져온다. 개별 파일 안에 경로 하드코딩 금지.

명명 규칙:
- 디렉토리: *_DIR
- 파일: *_PATH

**file-read-writer.js**
JSON / 텍스트 파일 읽기쓰기 공통 함수.
readJson / writeJson / readText / ensureDir 포함.

**game-name-normalizer.js**
게임명 정규화 함수.
대소문자 / 괄호 / 특수문자 / 공백 정리.
매칭 / 검색 / 스코어링의 공통 기반.

**auto-tagger.js**
코티지보드 자동 태그 생성 시스템.

태그 축:
- moodTags: 분위기 / 감정
- playTags: 플레이 행동 / 재미 방식
- situationTags: 누구랑 / 언제 / 사용 상황
- interactionTags: 플레이어 간 관계 구조

자동 태그 생성 기준:
1. BGG mechanics → 태그 규칙 (BGG_MECHANIC_TAG_RULES)
2. BGG categories → 태그 규칙 (BGG_CATEGORY_TAG_RULES)
3. BGG weight(난이도) → 태그
4. 인원 수 → 상황 태그
5. 플레이 시간 → 상황 태그

manualTags는 사람이 직접 붙인 보정 태그. autoTags보다 우선한다.
displayTags는 화면에 보여줄 대표 태그 (최대 5개).

---

### tools/0-input/

게임 데이터를 시스템에 입력하는 도구.

```
0-input/
├── from-name/
│   └── add-owned-game.js       ← 게임명 1개 입력 → master.json + ledger.xlsx 저장
└── from-file/
    └── import-from-xlsx.js     ← XLSX → 정규화 JSON 변환 (레거시 보조 도구)
```

**add-owned-game.js** — 현재 핵심 엔진

역할:
- 게임명 1개 입력
- staging/bgg-api-snapshot/bgg-game-details.json 조회
- resolvedGame 생성
- 1-master/cottage-owned-games-master.json에 저장
- 2-ledger/cottage-owned-games-ledger.xlsx에 행 추가
- cache 없으면 status: pending-cache로 저장 (등록은 됨, 상세 데이터만 없음)
- 중복 방지

실행: node game-system/tools/0-input/from-name/add-owned-game.js "게임명"

이 파일은 향후 CLI / GUI / 웹 관리자 / 모바일 입력창의 공통 엔진이 될 예정.

**import-from-xlsx.js**

XLSX → 정규화 JSON 변환 도구. 레거시 파이프라인에서 XLSX를 처리하던 도구.
add-owned-game.js 방식이 확립된 이후에는 보조 역할.

---

### tools/1-matcher/

한국어 보유게임명 → BGG ID 자동 매칭 파이프라인.

```
1-matcher/
├── a_run-api-match.js               ← BGG API 검색 기반 매칭 실행 진입점
├── b_run-local-match.js             ← BGG CSV 로컬 검색 기반 매칭 실행 진입점
├── 1-korean-to-english-title.js     ← 한국어명 → 영어 후보 이름 생성
├── 2a-search-bgg-api-by-title.js    ← BGG API로 후보 검색 (현재 비활성)
├── 2b-search-bgg-csv-by-title.js    ← BGG CSV 로컬로 후보 검색
├── 3-score-and-pick-best-title.js   ← 후보 점수화 및 최적 매칭 선정
└── 4-save-unmatched-titles.js       ← unresolved 게임 영어 후보 캐시 저장
```

**b_run-local-match.js** (현재 주요 실행 진입점)

매칭 파이프라인 전체 실행. staging/bgg-id-mapping/2-match-map.json 생성.

status 체계:
- forced: human-input/overwrite/forced-bgg-overrides.json으로 강제 지정
- auto-confirmed: 자동 매칭 신뢰도 높음
- needs-review: 후보는 있으나 검수 필요
- unresolved: 매칭 실패

주의: 현재 b_run-local-match.js 내부 로직이 TSV 읽기 방식을 일부 참조 중.
TSV 삭제 후 XLSX 또는 master.json 기반으로 로직 전환 필요 (미완).

**1-korean-to-english-title.js**
한국어 게임명에서 BGG 검색용 후보 이름 생성.
괄호 제거 / 확장판 단어 제거 / 부제목 분리 / 별칭 힌트 적용.

**2b-search-bgg-csv-by-title.js**
이름 후보를 가지고 BGG CSV 로컬 검색.
BGG API search는 현재 비활성 (ENABLE_BGG_API_SEARCH = false).
search cache 사용으로 반복 검색 최소화.

**3-score-and-pick-best-title.js**
BGG 후보들을 점수화해서 최적 매칭을 선정.
기준: 이름 유사도 + rank bonus + usersRated bonus + expansion penalty + source bonus.

**4-save-unmatched-titles.js**
unresolved 게임에 대한 영어 후보 캐시 초기화.
향후 AI 번역 또는 외부 API 연결 예정.

---

### tools/2-fetcher/

BGG API 데이터 수집 도구. API 호출 전용 — 운영 중 실시간 사용 아님.

```
2-fetcher/
├── _api-only.txt                           ← 이 폴더는 BGG API 호출 도구만
├── a_fetch-bgg-game-data-by-id.js          ← BGG Thing API 상세 정보 수집 배치
└── b_fetch-cottage-game-data-from-xlsx.js  ← XLSX에서 코티지 데이터 읽기
```

**a_fetch-bgg-game-data-by-id.js**

BGG Thing API 상세 정보 수집 배치 도구.

역할:
- staging/bgg-id-mapping/2-match-map.json에서 bggId 추출
- BGG Thing API 호출
- staging/bgg-api-snapshot/bgg-game-details.json 갱신

현재 상태: ENABLE_BGG_THING_API = false (BGG API 승인 대기 중).

수집 필드:
image, thumbnail, description, yearpublished, minplayers, maxplayers,
playingtime, minplaytime, maxplaytime, minage, averageweight, average,
bayesaverage, usersrated, rank, designers, artists, publishers,
categories, mechanics, suggested_numplayers

---

### tools/3-build-master/

1-master/cottage-owned-games-master.json 빌드 도구.

```
3-build-master/
└── build-master.js
```

입력: XLSX + 2-match-map.json + bgg-game-details.json
출력: library/1-master/cottage-owned-games-master.json + library/2-ledger/cottage-owned-games-ledger.json

실행: node game-system/tools/3-build-master/build-master.js (또는 npm run build:master)

특징:
- 기존 master.json에서 수동 편집 필드(comment, tags) 보존
- XLSX 굵은 글씨 bestPlayers 우선 사용 (BGG 추천보다 코티지 큐레이션 우선)
- status: ready (BGG 이미지 있음) / pending-cache (BGG 데이터 없음)

---

### tools/4-label-translator/

BGG 영어 labels를 한국어로 번역해 master.json에 추가하는 도구.

```
4-label-translator/
├── label-translator.js
└── description-translator.js
```

**label-translator.js**

입력: library/1-master/cottage-owned-games-master.json
출력: 동일 파일 (categoriesKo / mechanicsKo 필드 추가)

번역 소스: config/bgg-label-map.js (categories 69개 + mechanics 175개)
미번역 항목은 원문 그대로 유지하고 콘솔에 경고 출력.

실행: npm run translate

**description-translator.js**

입력: library/1-master/cottage-owned-games-master.json
출력: 동일 파일 (descriptionKo 필드 추가)

Claude Haiku API(claude-haiku-4-5-20251001)로 description 영→한 번역.
이미 번역된 게임(descriptionKo 있음)은 스킵.
옵션: --limit N (최대 N개), --dry-run (목록만 출력)
환경변수: ANTHROPIC_API_KEY 필수

실행: npm run translate:desc [-- --limit N] [-- --dry-run]

---

### tools/5-build-output/

사이트 출력 데이터(library/3-output/) 빌드 도구.

```
5-build-output/
└── build-output.js
```

**build-output.js**

입력: library/1-master/cottage-owned-games-master.json
출력: library/3-output/cottage-games-data-output.js / .json

내부적으로 _core/auto-tagger.js의 mergeCottageTags()를 호출해서 태그를 병합한다.

실행: node game-system/tools/5-build-output/build-output.js (또는 npm run build)

주의: master.json이 없거나 비어있으면 실패. 먼저 npm run build:master 를 실행해야 한다.

---

## 9. 데이터 흐름

### 9-1. 현재 파이프라인

```
source/2-cottage-manual/cottage-owned-games.xlsx
        ↓
tools/1-matcher/b_run-local-match.js
        ↓
staging/bgg-id-mapping/2-match-map.json
        ↓
tools/2-fetcher/a_fetch-bgg-game-data-by-id.js
        ↓
staging/bgg-api-snapshot/bgg-game-details.json
        ↓
tools/3-build-master/build-master.js  (npm run build:master)
        ↓
library/1-master/cottage-owned-games-master.json
library/2-ledger/cottage-owned-games-ledger.json
        ↓
tools/4-label-translator/label-translator.js  (npm run translate)
        ↓
library/1-master/cottage-owned-games-master.json  (categoriesKo / mechanicsKo 추가)
        ↓
tools/5-build-output/build-output.js  (npm run build)
        ↓
library/3-output/cottage-games-data-output.js / .json
        ↓
index.html / owned-games.html → window.gameData
```

### 9-2. 신 파이프라인 (add-owned-game 중심)

```
게임명 입력 (CLI)
        ↓
tools/0-input/from-name/add-owned-game.js
        ↓
staging/bgg-api-snapshot/bgg-game-details.json 조회
        ↓ cache 있음             ↓ cache 없음
status: ready            status: pending-cache
        ↓                        ↓
library/1-master/cottage-owned-games-master.json
library/2-ledger/cottage-owned-games-ledger.xlsx
        ↓
[향후] library/3-output/ 자동 rebuild
```

### 9-3. BGG API cache 갱신 흐름

```
npm run fetch:bgg
        ↓
tools/2-fetcher/a_fetch-bgg-game-data-by-id.js 실행
(match-map에서 auto-confirmed/forced 게임 중 미수집 항목만 요청)
        ↓
staging/bgg-api-snapshot/bgg-game-details.json 갱신
        ↓
npm run build:master  (pending-cache → ready 전환)
        ↓
npm run build
```

### 9-4. HTML → 브라우저 로딩 순서

```html
<!-- 1. BGG 영어→한국어 번역 lookup map -->
<script src="game-system/config/bgg-label-map.js"></script>

<!-- 2. 게임 데이터 → window.gameData -->
<script src="game-system/game-data/library/3-output/cottage-games-data-output.js"></script>

<!-- 3. 뷰 어댑터 → window.CottageGameView -->
<script src="assets/js/game-display-adapter.js"></script>

<!-- 4. 메인 프론트 로직 -->
<script src="assets/js/script.js"></script>
```

---

## 10. 현재 상태 vs 미래 의도

| 항목 | 현재 상태 | 미래 의도 |
|------|-----------|-----------|
| 데이터 원본 | XLSX (수작업) | BGG API (자동) |
| BGG details | ~346개 수집 완료, 290개 pending | 전체 수집 완료 |
| final build | master.json 기반 (완료) | — |
| 게임 추가 방식 | add-owned-game.js CLI | GUI / 모바일 입력창 |
| 3-build-master | 구현 완료 | — |
| b_run-local-match 입력 | 로직 전환 미완 | XLSX 또는 master.json 기반으로 정리 |
| script.js 구조 | 통합 단일 파일 | 역할별 분리 (장기) |
| assets/js/config/ | 빈 폴더 | config 파일 복사본 빌드 후 배치 예정 |

---

## 11. 현재 미완 / 결정 대기 항목

- pending-cache 290개 → fetch:bgg 재실행으로 추가 수집 필요 (429 rate limit으로 미수집)
- b_run-local-match.js 로직 전환 (TSV → XLSX/master.json 기반)
- config/difficulty-levels.js와 script.js 내 DIFFICULTY_LEVELS 중복 해소
- game-tag-matcher.js ES module/CommonJS 충돌 해소 (장기)
- assets/js/config/ 빌드 도구 구현
- script.js 역할 분리 (장기 과제)
- style.css 누적 패치 정리 (구조 확정 후)
