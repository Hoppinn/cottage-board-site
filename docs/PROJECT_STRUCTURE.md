# PROJECT_STRUCTURE

기준: 2026-05-26

---

## 1. 프로젝트 목적

코티지보드 — 24시 무제한 보드게임카페 정적 홈페이지.

**추천게임찾기**: 인원 / 난이도 / 분위기 → 어울리는 게임 추천 (감성 큐레이션 UX)
**전체게임보기**: 보유 게임 전체 검색 / 정렬 / 필터 DB 탐색

---

## 2. 핵심 설계 원칙

1. BGG API는 실시간 호출하지 않는다. 캐시를 먼저 쌓고, 운영은 캐시를 읽는다.
2. source → staging → library → output 레이어 분리. output만 사이트에서 읽는다.
3. 추천게임찾기와 전체게임보기의 역할을 섞지 않는다.
4. 번역 필드(categoriesKo, mechanicsKo, descriptionKo, summaryKo)는 build-master 실행 후 별도 translator 실행으로 추가. build-master가 덮어쓰지 않도록 보존 처리됨.
5. 모든 경로는 tools/_core/paths.js에서 관리한다.

---

## 3. 페이지 구조

```
index.html                        ← 메인 (히어로, 방문자 수, 추천 게임)
pages/
  owned-games.html                ← 전체 게임 목록 (검색/정렬/필터/페이지네이션)
  cottage/
    about.html                    ← 코티지보드 소개
    club.html                     ← 동호회
  store/
    game-location.html            ← 게임 위치 (선반 배치)
    price-rules.html              ← 가격 & 규칙
    requests.html                 ← 요청하기 (게임 구매 / 간식 / 건의 — Supabase 연동)
```

---

## 4. 프론트엔드 assets/

```
assets/
  css/
    style.css                     ← 전체 스타일 (헤더, 히어로, 바텀시트, 페이지별 포함)
  js/
    script.js                     ← 메인 JS (메뉴, 검색, 추천, 카드, 바텀시트, 페이지네이션)
    game-display-adapter.js       ← window.CottageGameView (raw gameData → 화면용 변환)
    kakao-auth.js                 ← 카카오 로그인 / 채널 버튼
    supabase-config.js            ← Supabase URL / anonKey
    supabase-client.js            ← window.CottageDB (별점, 플레이기록, 방문자수 등)
  images/
    main/logo.png, hero.png
```

### script.js 주요 기능
- 모바일 메뉴 (아코디언 드롭다운)
- 헤더 검색 (초성 검색 포함)
- 추천게임찾기 필터 (인원/난이도/분위기 × weight 가드)
- 게임 카드 렌더링
- 게임 상세 바텀시트 (sticky bar, stats, 분위기태그, 설명 clamp, 메커니즘, 플레이위젯, 코멘트)
- 전체게임보기 정렬/필터/페이지네이션

### 바텀시트 레이아웃 순서
```
[sticky bar - 스크롤 80px 이상 시 등장: 썸네일 + 제목 + BGG별점]
[제목 (한글 + 영문)]
[이미지(좌) + BGG별점 + 짧은소개 + 위치/룰영상 버튼(우)]
[👥 베스트 N명 · ⏱ N분 · 🎯 N.NN]
  [(추천 N~N명)]  ← 베스트 아래 중앙정렬
[분위기 태그 배지]
[게임 설명] 3줄 clamp + 더보기
[메커니즘/테마] 1줄 clamp + 더보기
[디자이너]
[플레이 기록 위젯]
[따봉 / 따봉반대]
[코멘트 목록 + 💬 코멘트 남기기 버튼]
[전체 게임에서 보기 →]
```

### supabase-client.js (window.CottageDB) 기능
- trackView(gameKey) — 게임뷰 기록
- getGameRating(gameKey) / getMyRating(gameKey) — 별점 조회
- getGamePlayCount(gameKey) / getPlayHighlights(gameKey) — 플레이 기록
- recordGamePlay(gameKey, count) — 플레이 기록 저장
- getVisitorStats() — 방문자 수 (오늘/누적)

---

## 5. Supabase 테이블 현황

| 테이블 | 용도 | 상태 |
|--------|------|------|
| page_views | 페이지 방문 기록 | ✅ 운영중 |
| game_views | 게임 바텀시트 뷰 기록 | ✅ 운영중 |
| game_ratings | 별점 (익명 세션 기반) | ✅ 운영중 |
| game_play_records | 플레이 기록 | ✅ 운영중 |
| play_highlights | 플레이 하이라이트 | ✅ 운영중 |
| game_requests | 게임 구매 요청 | 🔲 테이블 생성 필요 |
| snack_requests | 간식/음료 요청 | 🔲 테이블 생성 필요 |
| suggestions | 개선 건의 | 🔲 테이블 생성 필요 |
| game_comments | 게임별 코멘트 | 🔲 테이블 생성 필요 |

### 미생성 테이블 SQL

```sql
-- game_requests
create table game_requests (
  id bigint generated always as identity primary key,
  game_name text not null,
  request_count int not null default 1,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table game_requests enable row level security;
create policy "all" on game_requests for all using (true) with check (true);

-- snack_requests
create table snack_requests (
  id bigint generated always as identity primary key,
  item_name text not null,
  request_count int not null default 1,
  created_at timestamptz default now()
);
alter table snack_requests enable row level security;
create policy "all" on snack_requests for all using (true) with check (true);

-- suggestions
create table suggestions (
  id bigint generated always as identity primary key,
  content text not null,
  created_at timestamptz default now()
);
alter table suggestions enable row level security;
create policy "insert" on suggestions for insert with check (true);

-- game_comments
create table game_comments (
  id bigint generated always as identity primary key,
  game_key text not null,
  comment_text text not null,
  created_at timestamptz default now()
);
alter table game_comments enable row level security;
create policy "select" on game_comments for select using (true);
create policy "insert" on game_comments for insert with check (true);
```

---

## 6. 게임 데이터 시스템 game-system/

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

## 7. 데이터 레이어

### source/
```
source/
  1-bgg/csv/boardgames_ranks.csv  ← BGG 랭킹 전체 CSV (로컬 매칭용)
  2-cottage-manual/cottage-owned-games.xlsx  ← 보유게임 원본 (굵은글씨=bestPlayers)
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

## 8. 빌드 파이프라인

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

---

## 9. 현재 상태 및 TODO

### ✅ 완료
- 바텀시트 전면 개편 (보드라이프 스타일)
- 추천 필터 분위기 태그 weight 가드 (편안하게 ≤1.5, 대화 ≤2.5, 가볍게 <1.5+party)
- Supabase 별점/플레이기록/방문자수 연동
- 카카오 로그인/채널 버튼 전체 페이지 적용
- 소개/가격규칙/요청하기 페이지 신규 구현
- 머더미스터리 선반 표시 수정
- BGG ID 강제 수정 7개 (갈팡질팡/항로개척자/코드네임픽처스 등)
- 번역 데이터 보존 (build-master 패치)

### 🔲 TODO (Supabase)
- game_requests / snack_requests / suggestions / game_comments 테이블 생성
  (위 SQL 참고)

### 🔲 TODO (기능)
- 따봉(좋아요) 실제 저장 기능 구현
- 코멘트 로그인 사용자 구분 (현재 익명 저장)
- 플레이기록 × 카카오 로그인 연동

### 🔲 TODO (데이터)
- BGG details 미수집 290개 채우기 (rate limit 대기 후 fetch 재실행)

---

## 10. HTML 로딩 순서 (공통)

```html
<script src="game-system/config/bgg-label-map.js"></script>
<script src="game-system/game-data/library/3-output/cottage-games-data-output.js"></script>
<script src="assets/js/game-display-adapter.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/..."></script>
<script src="assets/js/supabase-config.js"></script>
<script src="assets/js/supabase-client.js"></script>
<script src="assets/js/script.js"></script>
<script src="assets/js/kakao-auth.js"></script>
```
