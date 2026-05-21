# PROJECT_STRUCTURE.v15

기준: 2026-05-21
이전 버전: v14까지의 설계 전체를 검토한 뒤 처음부터 재설계.

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
2. 사이트 출력 데이터(output)는 운영자용 관리 데이터(owned)와 분리된다.
3. source는 원본이다. generated는 재생성 가능한 중간물이다. output은 사이트가 읽는 최종물이다.
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
│   └── view/
│       └── game-view-utils.js
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

### assets/js/view/game-view-utils.js

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
├── shelf-groups.js
├── bgg-tag-translations.js       ← (이동 예정: generated/maps/ → config/)
└── tags/
    ├── mood-groups.js
    ├── play-tags.js
    ├── relationship-tags.js
    └── tag-utils.js
```

config는 전체 게임 운영의 기준 상수 OS다.
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

### config/shelf-groups.js

매장 실제 책장 위치 기준. 추천 태그가 아니라 운영/배치 기준.

현재 구조:
- A: 파티게임 / A-1~A-5 세부
- B: 라이트패밀리 / B-1
- C: 헤비전략 / C-1
- D: 작은상자게임
- E: 2인 베스트
- F: 기타공간

데이터에서는 shelfGroupId로 연결. 화면에는 shelfLabel / shelfFullLabel로 표시.

### config/bgg-tag-translations.js

BGG 영어 mechanics / categories를 한국어로 번역하는 lookup map.
현재 generated/maps/ 아래에 있으나 자동 생성물이 아니라 수동 유지 번역표이므로 config/로 이동 예정.
HTML에서 script 태그로 직접 로드됨.

### config/tags/

추천 / 태그 시스템의 기준 정의.
- mood-groups.js: 분위기 그룹 정의
- play-tags.js: 플레이 유형 태그 정의
- relationship-tags.js: 관계/상황 태그 정의 (장기적으로 situationTags + interactionTags로 분리 예정)
- tag-utils.js: 매칭 유틸 함수

---

## 7. game-system/game-data/

```
game-data/
├── source/
├── generated/
└── library/
```

세 개 레이어의 역할이 명확하게 분리된다.

| 레이어 | 역할 | 수정 주체 |
|--------|------|-----------|
| source | 원본 입력 | 사람 또는 외부 |
| generated | 자동 생성 중간물 | tools 실행 |
| library | 최종 정제물 | build 결과 + 사람 보정 |

---

## 7-1. game-data/source/

```
source/
├── manual/
│   ├── cottage-owned-games.tsv      ← 현재 레거시 파이프라인 원본
│   └── cottage-owned-games.xlsx     ← 굵은글씨(bestPlayers) 포함 원본
└── csv/
    └── boardgames_ranks.csv         ← BGG 랭킹 데이터 (BGG CSV 매칭용)
```

### source/manual/cottage-owned-games.tsv

코티지보드 보유게임 목록의 현재 레거시 원본.
구글 스프레드시트에서 수작업으로 입력하고 TSV로 export한 파일.

현재 레거시 파이프라인(convert-bgg.js)이 이 파일을 읽는다.

장기 방향:
게임 이름만 입력하면 자동 분류/BGG 매칭이 되는 시스템을 구축할 예정.
BGG API 승인 이후 API가 주 데이터 소스가 되면 TSV 의존도는 줄어든다.

### source/manual/cottage-owned-games.xlsx

TSV와 같은 원본이지만 중요한 차이가 있다:
굵은 글씨로 bestPlayers(베스트 인원)가 표시되어 있다.
이 정보는 TSV 변환 시 소실되므로 XLSX도 보존한다.

### source/csv/boardgames_ranks.csv

BGG 전체 게임 랭킹 CSV 다운로드.
BGG 이름 후보 검색 시 이 파일을 로컬에서 조회한다 (API 호출 최소화).
BGG API search가 활성화되면 보조 역할이 된다.

---

## 7-2. game-data/generated/

자동 생성 중간 산출물. 직접 편집하지 않는다. 삭제해도 tools 실행으로 재생성 가능.

```
generated/
├── cache/
│   ├── bgg-search-cache.json            ← BGG 이름 검색 결과 캐시
│   ├── bgg-details-cache.json           ← BGG 상세 정보 캐시 (현재 대부분 비어있음)
│   ├── bgg-match-result.json            ← 한국어 보유게임명 → BGG ID 매칭 결과
│   ├── bgg-search-candidates.json       ← 이름 후보 목록 캐시
│   └── auto-english-candidates-cache.json ← 자동 영어 후보 캐시 (AI/번역 연결 예정)
└── maps/
    └── bgg-tag-translations.js          ← config/로 이동 예정 (자동 생성물 아님)
```

### generated/cache/bgg-details-cache.json

BGG Thing API로 수집한 게임 상세 데이터 캐시.

현재 상태: 거의 비어있음 (BGG API 승인 대기 중, ENABLE_BGG_THING_API = false).
API 승인 후 fetch-bgg-details.js를 실행하면 채워진다.

포함 예정 데이터:
image, thumbnail, description, yearpublished, minplayers, maxplayers,
playingtime, averageweight, average(rating), bayesaverage, usersrated,
rank, designers, artists, publishers, categories, mechanics,
suggested_numplayers (best/recommended/not_recommended)

### generated/cache/bgg-match-result.json

auto-resolve-bgg-matches.js 실행 결과.
한국어 보유게임명과 BGG 게임 ID의 매칭 결과.

status 체계:
- forced: forced-bgg-overrides.json으로 강제 지정
- auto-confirmed: 자동 매칭 신뢰도 높음 (score >= 80, gap >= 8)
- needs-review: 자동 매칭 있으나 검수 필요 (score >= 55)
- unresolved: 매칭 실패

### generated/cache/auto-english-candidates-cache.json

unresolved 게임들에 대한 영어 이름 후보 캐시.
향후 AI 번역 / 외부 API 연결로 자동 생성 예정.
현재는 수동으로 채우거나 비어있는 상태.

---

## 7-3. game-data/library/

최종 정제된 라이브러리. 홈페이지와 운영자가 실제로 읽는 데이터.

```
library/
├── owned/                               ← 운영자용 게임 관리 데이터
│   ├── ledger/
│   │   └── cottage-owned-games-ledger.xlsx
│   └── master/
│       └── cottage-owned-games-master.json
├── output/                              ← 홈페이지 사이트 출력 (owned와 독립)
│   ├── cottage-games-data.js
│   └── cottage-games-data.json
├── overrides/                           ← 사람이 판단한 예외/보정 레이어
│   ├── forced-bgg-overrides.json
│   ├── game-name-aliases.json
│   └── mood-tag-rules.json
└── images/                              ← 게임 이미지 (BGG 이미지의 로컬 사본)
    ├── thumb/
    └── detail/
```

### library/owned/

운영자가 보유게임을 관리하는 공간.
ledger와 master는 원천 데이터가 아니라, 게임 입력 후 생성되는 결과물이다.

**ledger.xlsx** (cottage-owned-games-ledger.xlsx)
사람이 빠르게 보는 간단 장부.
굵은 글씨 = bestPlayers (베스트 인원).
일반 글씨 = recommendedPlayers.

**master.json** (cottage-owned-games-master.json)
사람이 자세히 보는 상세 장부.
검수 / 수동 보정용.
향후 final output build의 기준 데이터가 될 예정.

현재 master에 저장되는 resolvedGame 구조:
id, ownedName, titleKo, titleEn, bggId, yearPublished,
minPlayers, maxPlayers, playingTime, minPlayTime, maxPlayTime,
minAge, difficulty, rating, bayesRating, usersRated, rank,
designers, artists, publishers, categories, mechanics,
recommendedPlayers, bestPlayers, notRecommendedPlayers,
location, comment, tags, image, thumbnail, description,
status (ready / pending-cache), createdAt, updatedAt, source

### library/output/

홈페이지가 직접 읽는 배포용 최종 데이터.
사이트 출력이라는 역할이 owned 게임 관리와 개념이 다르기 때문에 owned/ 하위가 아니라 독립 경로로 둔다.

HTML에서 script 태그로 직접 로드:
```html
<script src="game-system/game-data/library/output/cottage-games-data.js"></script>
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

### library/overrides/

사람이 직접 판단해서 관리하는 예외 / 보정 레이어.
자동 매칭이 틀렸을 때, 또는 자동화가 처리 못하는 특수 케이스를 여기서 수동 보정한다.

- forced-bgg-overrides.json: 자동 매칭 결과를 특정 BGG ID로 강제 지정
- game-name-aliases.json: 자동 후보 생성이 어려운 특수 별칭/약칭
- mood-tag-rules.json: 분위기 태그 수동 보정 규칙

---

## 8. game-system/tools/

빌드 / 관리 / 데이터 파이프라인 스크립트.

```
tools/
├── convert-bgg.js               ← 레거시 파이프라인 진입점
├── admin/
├── build/
├── core/
├── fetch/
├── match/
├── tagging/
├── source/
└── legacy/
```

---

### tools/convert-bgg.js

레거시 배치 파이프라인 진입점.

실행: node game-system/tools/convert-bgg.js

흐름:
1. autoResolveBggMatches() → bgg-match-result.json 생성
2. fetchBggDetails() → bgg-details-cache.json 갱신 (현재 비활성 플래그)
3. buildCottageGameData() → library/output/ 생성

ENABLE_FETCH_BGG_DETAILS 플래그로 BGG API fetch를 켜고 끈다.
현재 false. BGG API 승인 후 true로 전환.

---

### tools/admin/

운영자 관리 도구.

**add-owned-game.js** — 현재 핵심 엔진

역할:
- 게임명 1개 입력
- bgg-details-cache.json 조회
- resolvedGame 생성
- master.json에 저장
- ledger.xlsx에 행 추가
- cache 없으면 status: pending-cache로 저장 (등록은 됨, 상세 데이터만 없음)
- 중복 방지

실행: node game-system/tools/admin/add-owned-game.js "게임명"

이 파일은 향후 CLI / GUI / 웹 관리자 / 모바일 입력창의 공통 엔진이 될 예정.
껍데기가 바뀌어도 엔진은 이 파일이다.

**show-master-games.js**

master.json 내용 확인용 도구.
version / source / total / sample 게임명 출력.

---

### tools/build/build-cottage-game-data.js

현재 레거시 final build 도구.

입력: TSV + bgg-match-result + bgg-details-cache + owned-games-normalized
출력: library/output/cottage-games-data.js / .json

내부적으로 auto-tag-rules.mergeCottageTags()를 호출해서 태그를 병합한다.

현재 상태: legacy 구조. 즉시 제거하지 않는다.
향후: master.json 기반 build(build-cottage-game-data-from-master.js)로 전환 예정.

---

### tools/core/

모든 tools의 공통 인프라.

**paths.js**
프로젝트 전체 경로 상수 관리.
모든 tool은 경로를 여기서만 가져온다. 개별 파일 안에 경로 하드코딩 금지.

명명 규칙:
- 디렉토리: *_DIR
- 파일: *_PATH

**read-write.js**
JSON / 텍스트 파일 읽기쓰기 공통 함수.
readJson / writeJson / readText / ensureDir 포함.

**normalize-game-name.js**
게임명 정규화 함수.
대소문자 / 괄호 / 특수문자 / 공백 정리.
매칭 / 검색 / 스코어링의 공통 기반.

---

### tools/fetch/fetch-bgg-details.js

BGG Thing API 상세 정보 수집 배치 도구.

역할:
- bgg-match-result.json에서 bggId 추출
- BGG Thing API 호출
- bgg-details-cache.json 갱신

현재 상태: ENABLE_BGG_THING_API = false (BGG API 승인 대기 중).
승인 후 true로 전환하고 실행하면 details cache가 채워진다.

수집 필드:
image, thumbnail, description, yearpublished, minplayers, maxplayers,
playingtime, minplaytime, maxplaytime, minage, averageweight, average,
bayesaverage, usersrated, rank, designers, artists, publishers,
categories, mechanics, suggested_numplayers

주의: 운영 중 실시간 호출용이 아니다. cache 생성 전용 배치 도구다.

---

### tools/match/

한국어 보유게임명 → BGG ID 자동 매칭 파이프라인.

**auto-resolve-bgg-matches.js**
TSV에서 게임명을 읽어 전체 매칭 파이프라인을 실행. bgg-match-result.json 생성.

status 체계:
- forced: overrides/forced-bgg-overrides.json으로 강제 지정
- auto-confirmed: 자동 매칭 신뢰도 높음
- needs-review: 후보는 있으나 검수 필요
- unresolved: 매칭 실패

**generate-name-candidates.js**
한국어 게임명에서 BGG 검색용 후보 이름 생성.
괄호 제거 / 확장판 단어 제거 / 부제목 분리 / 별칭 힌트 적용.
전체 게임을 alias에 다 넣지 않는다. 자동 처리 어려운 케이스만 최소로 관리.

**search-bgg-candidates.js**
이름 후보를 가지고 BGG CSV 로컬 검색.
BGG API search는 현재 비활성 (ENABLE_BGG_API_SEARCH = false).
search cache 사용으로 반복 검색 최소화.

**score-bgg-candidates.js**
BGG 후보들을 점수화해서 최적 매칭을 선정.
기준: 이름 유사도 + rank bonus + usersRated bonus + expansion penalty + source bonus.

**generate-auto-english-cache.js**
unresolved 게임에 대한 영어 후보 캐시 초기화.
향후 AI 번역 또는 외부 API 연결 예정.

**generate-auto-english-candidates.js**
auto-english-candidates-cache.json을 읽어 영어 후보를 반환.
외부 생성 기능은 현재 비활성.

---

### tools/tagging/auto-tag-rules.js

코티지보드 자동 태그 생성 시스템.

이 파일은 규칙 정의(config 성격)와 실행(tool 성격)이 함께 있다.
build 과정에서 require로 직접 호출되므로 tools/ 아래에 위치한다.

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

### tools/source/convert-owned-xlsx.js

XLSX → 정규화 JSON 변환 도구.
레거시 파이프라인에서 XLSX를 처리하던 도구.
add-owned-game.js 방식이 확립된 이후에는 보조 역할.

---

### tools/legacy/

구버전 배치 파이프라인 파일 보관소.
즉시 삭제하지 않는다.
전체 구조 설계 확정 후 참조 여부를 확인하고 삭제 여부를 결정한다.

---

## 9. 데이터 흐름

### 9-1. 현재 레거시 파이프라인 (convert-bgg.js)

```
source/manual/cottage-owned-games.tsv
        ↓
tools/match/auto-resolve-bgg-matches.js
        ↓
generated/cache/bgg-match-result.json
        ↓
tools/fetch/fetch-bgg-details.js  [현재 비활성]
        ↓
generated/cache/bgg-details-cache.json
        ↓
tools/build/build-cottage-game-data.js
        ↓
library/output/cottage-games-data.js / .json
        ↓
index.html / owned-games.html → window.gameData
```

### 9-2. 신 파이프라인 (add-owned-game 중심)

```
게임명 입력 (CLI)
        ↓
tools/admin/add-owned-game.js
        ↓
generated/cache/bgg-details-cache.json 조회
        ↓ cache 있음             ↓ cache 없음
status: ready            status: pending-cache
        ↓                        ↓
library/owned/master/cottage-owned-games-master.json
library/owned/ledger/cottage-owned-games-ledger.xlsx
        ↓
[향후] library/output/ 자동 rebuild
```

### 9-3. BGG API cache 생성 흐름 (현재 비활성)

```
BGG API 승인 완료
        ↓
ENABLE_BGG_THING_API = true
        ↓
tools/fetch/fetch-bgg-details.js 실행
        ↓
generated/cache/bgg-details-cache.json 갱신
        ↓
pending-cache 게임들 → status: ready 전환 (refresh 도구 예정)
```

---

## 10. 현재 상태 vs 미래 의도

| 항목 | 현재 상태 | 미래 의도 |
|------|-----------|-----------|
| 데이터 원본 | TSV/XLSX (수작업) | BGG API (자동) |
| BGG details | 거의 비어있음 | API 승인 후 채워짐 |
| final build | TSV 기반 레거시 | master.json 기반으로 전환 |
| 게임 추가 방식 | TSV 수동 편집 | add-owned-game.js CLI |
| add-owned-game 입력창 | CLI | GUI / 모바일 입력창 |
| bgg-tag-translations.js 위치 | generated/maps/ (임시) | config/ |
| script.js 구조 | 통합 단일 파일 | 역할별 분리 (장기) |
| output 경로 (HTML) | 미정/혼선 중 | library/output/ 확정 |

---

## 11. 현재 미완 / 결정 대기 항목

- BGG API 승인 후 ENABLE_BGG_THING_API = true 전환
- pending-cache refresh 도구 (refresh-owned-games-from-cache.js)
- master 기반 final build 도구
- library/output/ 경로 확정 및 paths.js / HTML 반영
- bgg-tag-translations.js를 config/로 이동
- tools/legacy/ 삭제 여부 결정 (참조 여부 확인 후)
- config/difficulty-levels.js와 script.js 내 DIFFICULTY_LEVELS 중복 해소
- owned-games-normalized.js/.json 위치 재정리 (source/보다 generated/가 적합)
- script.js 역할 분리 (장기 과제)
- style.css 누적 패치 정리 (구조 확정 후)

---

## 12. 다음 작업 우선순위

1. paths.js 및 HTML의 output 경로 확정 및 반영
2. bgg-tag-translations.js config/ 이동
3. _DEPRECATED_ 파일 삭제
4. library/games/, library/master/ 빈 폴더 삭제
5. BGG API 승인 후 details cache 수집
6. master 기반 build 도구 개발
7. UI polish (구조 확정 후)
