# 게임 관리 GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 바탕화면 아이콘 → 로컬 브라우저 화면 하나에서 게임 추가·수정·위치(일괄) 변경·약칭·BGG 없는 게임 수동 정보·룰/정리법·종 알림·사이트 반영을 명령어 없이 끝낸다.

**Architecture:** WSL 안에서 Node 내장 `http` 로컬 서버(`127.0.0.1`)가 GUI 페이지와 JSON API를 제공한다. API는 기존 파이프라인 모듈을 대화형 껍데기 없이 부르는 새 비대화형 모듈(`game-ops.js` 등)을 쓴다. 룰/정리법은 GUI 페이지가 사이트의 `supabase-client.js`를 그대로 로드해 기존 `CottageDB` 함수로 저장한다. 종 알림은 새 `game_announcements` 테이블에 쓰되 **push 성공 뒤에만** 보낸다.

**Tech Stack:** Node 24(CommonJS, `node:test`, `node:http`), 기존 `exceljs`, Supabase REST(anon), 바닐라 HTML/JS.

**Spec:** [docs/superpowers/specs/2026-10-23-game-admin-gui-design.md](../specs/2026-10-23-game-admin-gui-design.md)

## Global Constraints

- 엑셀(`cottage-owned-games.xlsx`)이 목록·위치 정본. 게임 데이터를 DB로 옮기지 않는다.
- 위치 선택지 = `SHELF_GROUPS` 전체 + `협력`. 자유 입력 금지. `협력` 41개 일괄 변환 금지.
- "도착" = Z 계열(`incoming`/`shipping`/`to_buy`)에서 Z가 아닌 위치로. Z끼리 이동은 알림 없음.
- 알림 받는 사람 = 로그인 회원 전체. 일괄 변경은 알림 1건.
- 약칭은 `game-abbr.json`(bggId 있음) 또는 `game-abbr-byname.json`(없음) 한쪽에만. 다른 쪽 중복 항목은 지운다.
- 사진은 `library/images/thumb/{gameId}{ext}`에만. 수동 정보 파일엔 사진 없음.
- 수동 정보 파일 = `LIBRARY_MISSING_FILL_DIR/manual-game-info.json`. `build-master`는 BGG 값이 없을 때만 쓴다.
- 올리기: 허용 경로만 스테이징(`game-system/game-data/`, `game-system/config/shelf-locations.js`는 제외 — 코드 변경은 사람이 커밋), 원격보다 뒤처지면 거부, `main`에 직접.
- 서버는 `127.0.0.1`에만 바인딩. 리포 안에 상태 파일을 쓰지 않는다(Live Server 리로드 — CLAUDE.md). 대기 알림은 `~/.cottage-admin/pending-announcements.json`.
- 기존 `npm run add-game` CLI 동작 유지.
- DB 변경(Task 6)은 Plan → 사용자 승인 → 실행. 테이블 RLS 상태 명시, `to anon`, 실행 직후 anon SELECT 확인(CLAUDE.md).
- supabase 응답은 `{ data, error }`로 받고 `error`를 로그한다(CLAUDE.md DB 함수 에러 처리).
- 도메인 문서는 바뀐 코드와 **같은 커밋**에 갱신(CLAUDE.md).

## Review Focus

1. **push 전에 알림이 나감** — 회원이 "도착" 알림을 눌렀는데 사이트는 아직 "도착예정". → 알림은 대기열에 쌓고 push 성공 후에만 전송(Task 8 테스트).
2. **엑셀이 윈도우 Excel에서 열려 있음** — 저장이 실패하거나 잠금 파일(`~$cottage-owned-games.xlsx`)과 충돌. → 저장 전 잠금 파일 감지, 평문 거부(Task 3 테스트).
3. **없는 게임 이름으로 위치 변경** — `addOwnedGame`은 없으면 새로 만든다. 일괄 변경에서 오타가 신규 게임을 만들면 안 된다. → `setLocation`은 모르는 이름을 거부(Task 3 테스트).
4. **파이프라인 중간 실패**(BGG 토큰 없음 401, Anthropic 키 없음) — 어디서 멈췄는지 모름. → 단계별 결과를 반환하고, 번역 키 없음은 실패가 아니라 "번역 대기"(Task 3 테스트).
5. **아이콘 두 번 더블클릭** — 같은 포트에 두 번째 서버가 `EADDRINUSE`로 죽음. → 이미 떠 있으면 브라우저만 연다(Task 9 테스트).

---

## 사전 준비 (사용자 몫 포함, 코드 작업 아님)

- [ ] `cd ~/cottage-board-site && npm install` → `node_modules/exceljs` 존재 확인.
- [ ] 사용자가 `.env`에 `ANTHROPIC_API_KEY`, `BGG_API_TOKEN` 입력(이미 `.gitignore`에 `.env` 있음).
- [ ] `git push --dry-run` 으로 WSL GitHub 인증 확인. 실패하면 사용자에게 메시지 전달 후 진행(Task 8의 push만 영향).

키·인증이 없어도 Task 1~7은 진행된다(파이프라인 실행 검증만 뒤로 밀림).

---

### Task 1: 「따로」 선반 추가

**Files:**
- Modify: `game-system/config/shelf-locations.js` (`to_buy` 앞, `escape_room` 뒤에 삽입)
- Modify: `pages/game/game-location.html:245-262` (`SECTIONS` 배열, 같은 위치)
- Create: `scripts/verify-shelf-lists.js`
- Docs: `docs/PROJECT_STATE.md` — 옆 문제로 "선반 목록 두 벌(config·game-location.html)" 항목 1개 등록

**Interfaces:**
- Produces: 선반 `{ id: "separate", code: "G", label: "따로 보관", parentId: null, sourceValues: ["따로", "별도", "separate"] }`

- [ ] **Step 1: Write the failing check** — `scripts/verify-shelf-lists.js` (기존 `scripts/verify-*.js` 스타일, `check(label, cond)` + `--negctl`):
  - `getShelfGroupBySourceValue('따로')?.id === 'separate'`, `'별도'`도 동일
  - `game-location.html`의 `SECTIONS`에서 정규식으로 뽑은 `{id, code, label}` 집합 == `SHELF_GROUPS`의 `{id, code, label}` 집합 (단 `mini_box` 라벨은 현재도 다름 — `"작은상자에 담긴 게임"` vs `"작은상자게임"` — id·code만 비교)
  - `--negctl`이면 `'따로'` 대신 `'없는값'`을 넣어 FAIL이 나는지
- [ ] **Step 2: Run** `node scripts/verify-shelf-lists.js` → FAIL (`따로` 미해결), `--negctl` → FAIL
- [ ] **Step 3: Add the shelf** to both lists (game-location.html: `{ id: 'separate', code: 'G', label: '따로 보관', sub: false }`, Z 앞). 선반 사진 `assets/images/shelf-locations/separate.webp`가 없을 때 `game-location.html:317,357`의 `<img>`가 깨진 아이콘으로 보이지 않는지 확인하고, 깨지면 기존 `onerror` 처리 유무를 따라 숨김 처리.
- [ ] **Step 4: Run** `node scripts/verify-shelf-lists.js` → 전부 PASS. `npm run build` 후 `cottage-games-data-output.json`에서 두근두근악어이빨의 `shelfGroupId === 'separate'`.
- [ ] **Step 5: 육안** — 로컬 `pages/game/game-location.html`에 G 「따로 보관」 섹션에 5개 게임이 보이는 스크린샷을 **읽는다**.
- [ ] **Step 6: Commit** `feat: add 따로 shelf (G) for 5 games stored separately` (산출물 재빌드 포함)

### Task 2: 위치 규칙 모듈

**Files:**
- Create: `game-system/tools/_core/location-rules.js`
- Test: `game-system/tools/_core/location-rules.test.js`

**Interfaces:**
- Consumes: `SHELF_GROUPS`, `getShelfGroupBySourceValue` (`config/shelf-locations.js`)
- Produces:
  - `listPickableLocations(): Array<{ value: string, label: string, code: string|null }>` — `SHELF_GROUPS` 각각 `value = label`(엑셀에 쓰는 값)과 `{ value: '협력', label: '협력(난이도로 자동 분류)', code: null }`
  - `isPendingLocation(value: string): boolean` — 해석된 그룹 id가 `incoming|shipping|to_buy`
  - `isArrival(from: string, to: string): boolean` — `isPendingLocation(from) && !isPendingLocation(to) && isPickable(to)`
  - `findLocationIssues(games: Array<{ownedName, location}>): Array<{ownedName, location}>` — `협력`도 아니고 `getShelfGroupBySourceValue`로도 해석 안 되는 것(빈칸 포함)

- [ ] **Step 1: Write failing tests** (`node:test` + `assert`):
  - `isArrival('발매후 도착예정', '전략') === true`, `isArrival('발매후 도착예정', '배송중') === false`, `isArrival('전략', '가족') === false`, `isArrival('배송중', '협력') === true`
  - 실제 마스터를 읽은 `findLocationIssues` 결과 이름 집합 == `{테베, 원드러스크리처, 글렌모어연대기, 딥씨크루}` (Task 1 이후 기준; `협력` 41개 미포함)
  - `listPickableLocations()`에 `value === '협력'` 1개, `value === '따로 보관'` 1개
- [ ] **Step 2: Run** `node --test game-system/tools/_core/location-rules.test.js` → FAIL (module not found)
- [ ] **Step 3: Implement** the four functions.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat: add location rules for game admin`

### Task 3: 비대화형 게임 작업 모듈 + CLI 공용화

**Files:**
- Create: `game-system/tools/0-input/game-ops.js`
- Modify: `game-system/tools/0-input/add-game.js` — `saveForced`·`getGameId`·`runTranslation`의 비대화형 부분을 `game-ops.js`에서 가져다 쓰게. 대화형 흐름·출력은 그대로.
- Test: `game-system/tools/0-input/game-ops.test.js`
- Docs: `docs/PROJECT_STRUCTURE.md` §8 — `game-ops.js`가 CLI/GUI 공용 진입점임을 한 줄

**Interfaces:**
- Produces:
  - `parseBggInput(text: string): string|null` — 숫자, `boardgamegeek.com/boardgame/123/...`, `.../boardgameexpansion/123` → `"123"`; 그 외 `null`
  - `getMatchCandidates(name: string): Promise<Array<{ bggId: string, bggName: string, year: number|null, score: number|null, status: string }>>` — `autoResolveBggMatches()` 후 `2-match-map.json[name]`의 `auto-confirmed`/`bestGuess`/`reviewCandidates`를 평탄화. ⚠️ 매처는 **엑셀에 이미 있는 이름만** 매칭한다(`add-game.js`도 `addOwnedGame` 다음에 매칭) → 신규 게임은 `addGame` 뒤에만 호출 가능
  - `confirmBgg(name: string, bggId: string|null): void` — `null`이면 `'skip'` (`forced-bgg-overrides.json`)
  - `assertXlsxWritable(): void` — 같은 폴더에 `~$cottage-owned-games.xlsx`가 있으면 `Error('엑셀 파일이 열려 있어요. Excel을 닫고 다시 시도해 주세요.')`
  - `addGame(name: string, location: string): Promise<{ gameId: string }>` — 이미 있으면 `Error('이미 있는 게임이에요')`
  - `setLocation(name: string, location: string): Promise<{ from: string, to: string }>` — 마스터에 없으면 `Error('없는 게임: ' + name)`, 선택지 밖 위치면 거부(Task 2 `listPickableLocations`)
  - `runPipeline({ gameIds: string[], fetchBgg: boolean, translate: boolean }, onStep?: (step: {name: string, status: 'ok'|'failed'|'skipped', note?: string}) => void): Promise<{ ok: boolean, steps: Step[] }>` — 순서: (fetchBgg면) 매칭 재계산 → BGG fetch → `build-master` → `label-translator` → (translate면 게임별) 설명·요약 번역 → `build-output`. 번역은 `ANTHROPIC_API_KEY` 없으면 `skipped`, note `'번역 대기 — 키를 넣고 나중에 다시'`. 실패한 단계에서 멈추고 `ok:false`.

- [ ] **Step 1: Write failing tests:**
  - `parseBggInput('https://boardgamegeek.com/boardgame/342942/ark-nova') === '342942'`, `('342942') === '342942'`, `('아크노바') === null`
  - `assertXlsxWritable` — 임시로 잠금 파일을 만들었다 지우며 throw/비throw (테스트가 만든 파일만 지운다)
  - `setLocation('존재하지않는게임xyz', '전략')` rejects `/없는 게임/`, 그리고 마스터 JSON 바이트가 전후 동일
  - `setLocation('테베', 'x')` rejects (선택지 밖)
  - `runPipeline({gameIds:[], fetchBgg:false, translate:true})` with `ANTHROPIC_API_KEY` unset → 번역 단계 `skipped` (빌드 단계는 실제 실행 — 산출물이 바뀌지 않는지 `git diff --quiet`로 확인)
- [ ] **Step 2: Run** `node --test game-system/tools/0-input/game-ops.test.js` → FAIL
- [ ] **Step 3: Implement** `game-ops.js`; 자식 프로세스는 `child_process.spawn('node', [...], { cwd: root })`, 종료코드로 성공 판정.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: CLI 회귀** — `printf '1\nn\n' | npm run add-game -- "테베"` (기존 게임, 매칭 유지, 위치 유지) → 정상 종료 후 `git status`로 산출물 외 변화 없음 확인, 변화는 `git checkout --`으로 되돌림
- [ ] **Step 6: Commit** `refactor: share non-interactive game ops between CLI and GUI` (feat과 분리 — 이 커밋은 동작 변화 없음, game-ops 신규 함수는 다음 커밋 `feat:`로 쪼개도 됨)

### Task 4: 약칭 편집

**Files:**
- Create: `game-system/tools/_core/abbr-edit.js`
- Test: `game-system/tools/_core/abbr-edit.test.js`

**Interfaces:**
- Consumes: `resolveAbbrEntry` (`_core/abbr-audit.js`) — 결과 검증용
- Produces:
  - `applyAbbr(maps: { byId: object, byName: object }, game: { bggId: string|null, ownedName: string }, abbr: string): { byId, byName }` — 순수 함수. bggId 있으면 `byId[bggId] = abbr` + `delete byName[ownedName]`; 없으면 반대. `abbr === ''`이면 양쪽에서 삭제(앞 2글자 폴백으로 복귀).
  - `saveAbbr(game, abbr): void` — 두 JSON 읽기 → `applyAbbr` → 쓰기(기존 들여쓰기·키 순서 유지)

- [ ] **Step 1: Write failing tests** — bggId 있는 게임은 byId에만, 이전에 byName에 있던 항목 제거; bggId 없는 게임은 byName에만; 빈 문자열은 양쪽 삭제; 입력 객체를 변경하지 않음.
- [ ] **Step 2: Run** `node --test game-system/tools/_core/abbr-edit.test.js` → FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** → PASS; 실제 파일에 한 건 저장 후 `npm run check` 통과, `git checkout --`으로 되돌림
- [ ] **Step 5: Commit** `feat: add abbreviation editing for game admin`

### Task 5: BGG 없는 게임 수동 정보

**Files:**
- Create: `game-system/tools/_core/manual-fill.js`
- Modify: `game-system/tools/3-build-master/build-master.js` — `buildMasterGame`에 수동 정보 인자 추가, `module.exports`에 `buildMasterGame` 추가
- Test: `game-system/tools/_core/manual-fill.test.js`
- Docs: `docs/PROJECT_STRUCTURE.md` §7 트리에 `human-input/missing-fill/manual-game-info.json` 한 줄; `docs/PROJECT_STATE.md` §5 「BGG 영구 미연결 게임의 수동 기본정보」 항목 삭제(닫힘)

**Interfaces:**
- Produces:
  - 파일 형식: `{ "<gameId>": { "minPlayers"?: number, "maxPlayers"?: number, "minPlayTime"?: number, "maxPlayTime"?: number, "playingTime"?: number, "minAge"?: number, "description"?: string } }`
  - `readManualFill(): object`, `saveManualFill(gameId: string, fields: object): void` (빈 값 키는 삭제, 남는 게 없으면 게임 키 삭제)
  - `buildMasterGame(xlsxRow, matchInfo, bggDetails, existing, invalidatedGames, manual = {})` — 위 7개 필드 각각 `BGG값 ?? manual값 ?? null`(description은 `''`)

- [ ] **Step 1: Write failing tests:**
  - BGG details `{}` + manual `{minPlayers:2,maxPlayers:4,description:'수동'}` → 결과 `minPlayers 2`, `maxPlayers 4`, `description '수동'`
  - BGG details `{minplayers:'1'}` + manual `{minPlayers:3}` → `minPlayers 1` (BGG 우선)
  - `saveManualFill('x', {minPlayers:null})` 후 파일에 `x` 키 없음 (테스트는 임시 경로를 쓰도록 `saveManualFill`이 선택 인자 `filePath`를 받는다)
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement** + `buildMaster()`가 `readManualFill()`을 한 번 읽어 넘김
- [ ] **Step 4: Run** → PASS. 그리고 회귀: 수동 정보 파일이 비어 있을 때 `npm run build:master && npm run build` 후 `git diff --stat game-system/game-data/library` 가 비어 있음(기존 645개 결과 불변)
- [ ] **Step 5: Commit** `feat: keep manual info for games without BGG data`

### Task 6: 공지 테이블과 종 알림 (⚠️ Plan → 승인 → 실행)

**Files:**
- Create: `docs/migrations/035_game_announcements.sql`
- Modify: `assets/js/supabase-client.js` — `getMyNotifications`에 조회 추가(1886행 `newGamePromise` 옆), 결과를 `new_game` 루프 뒤에서 push
- Modify: `assets/js/kakao-auth.js` — `_renderNotifItem`의 `new_game` 분기(2467행 부근) 옆에 `game_announce` 분기
- Create: `scripts/verify-game-announcements.js`
- Docs: `docs/db-schema.md`(테이블 행 + 마이그레이션 표), `docs/js-api.md`(`getMyNotifications` 반환 타입에 `game_announce`)

**Interfaces:**
- 테이블: `game_announcements(id bigint generated always as identity pk, kind text not null check (kind in ('new','arrived')), game_names text[] not null, location_label text, created_at timestamptz not null default now())`. `ENABLE ROW LEVEL SECURITY` + `to anon` SELECT/INSERT 정책 (DELETE/UPDATE 정책 없음 — 회원이 지우지 못하게; `game_overrides`와 달리 공개 쓰기가 필요한 건 INSERT뿐). 
- 알림 객체: `{ type: 'game_announce', key: 'game_announce:<id>', kind: 'new'|'arrived', gameNames: string[], locationLabel: string|null, date: created_at, isNew }` — `isNew`는 `new_game`과 같은 `effectiveNewGameSeenAt`·`readKeys` 규칙.
- 카드 문구: `new` → 제목 게임명(1개) 또는 게임 링크 목록, 부제 `새 게임이 추가됐어요 · <위치>`; `arrived` → 부제 `도착했어요! · <위치>`. 아이콘 `new` 📦, `arrived` 🎉. 게임 링크는 기존 `data-game-name`/`notif-game-link` 재사용.

- [ ] **Step 1: 사용자에게 위 Plan 블록(CLAUDE.md 「Plan이 필요한 작업」 형식) 제시 → 승인 대기.** 승인 전 SQL 실행·코드 커밋 금지.
- [ ] **Step 2: Write failing check** `scripts/verify-game-announcements.js`: (a) 정적 — `getMyNotifications` 소스에 `from('game_announcements')`와 `error` 로그가 있음, kakao-auth에 `n.type === 'game_announce'` 분기; (b) `--live` — anon `count: 'exact'` SELECT가 HTTP 200·`count !== null`(테이블 존재) ; `--negctl`은 없는 테이블명으로 `count === null`을 잡는지.
- [ ] **Step 3: Run** → FAIL
- [ ] **Step 4: 사용자가 SQL 실행**(Supabase SQL 편집기) → `--live` 확인 → 코드 구현
- [ ] **Step 5: Run** 정적·live·negctl → PASS
- [ ] **Step 6: 육안** — 격리 행(`game_names = ['__테스트__']`) 1건 INSERT 후 관리자 계정 종 알림 스크린샷을 읽고, 행 삭제(대시보드) 후 0행 재확인. `/browser-verify` 레시피 준수.
- [ ] **Step 7: Commit** `feat: add game announcements to member notifications` (마이그레이션·문서 포함)

### Task 7: 로컬 서버와 API

**Files:**
- Create: `game-system/admin-gui/server.js` (기동·정적 제공), `game-system/admin-gui/api.js` (라우터: `handleApi(req, res)`), `game-system/admin-gui/announce-queue.js`
- Test: `game-system/admin-gui/api.test.js`
- Modify: `package.json` — `"admin": "node game-system/admin-gui/server.js"`

**Interfaces:**
- Consumes: Task 2·3·4·5 함수
- Produces (모두 JSON, 실패는 `{ error: '<평문 한국어>' }` + 4xx/5xx):
  - `GET /api/games` → `{ games: [{ id, ownedName, bggId, location, locationLabel, abbr, hasThumb, manual }], locations: listPickableLocations(), issues: findLocationIssues(...) }`
  - `GET /api/candidates?name=` → `getMatchCandidates`
  - `POST /api/games` `{ name, location }` → `addGame` → `getMatchCandidates(name)`; 응답 `{ gameId, candidates }`.
  - `POST /api/games/bgg` `{ name, bggInput }` → `confirmBgg(parseBggInput(bggInput))` (`bggInput`이 후보의 bggId, 붙여넣은 주소, 또는 빈 값=BGG 없음). 공지 대기열에 `{kind:'new', names:[name], location}` 추가(요청에 `announce:false`면 생략)
  - `POST /api/locations` `{ names: string[], location, announce: boolean }` → 각 `setLocation`; `isArrival(from,to)`인 이름들만 모아 **1건** `{kind:'arrived', names, location}` 대기열 추가; 응답 `{ changed: [{name,from,to}], arrived: string[] }`
  - `POST /api/abbr` `{ gameId, abbr }`, `POST /api/manual` `{ gameId, fields }`, `POST /api/thumb` (raw body, `?gameId=&ext=`; ext ∈ `.png|.jpg|.jpeg|.webp`, 10MB 상한) → `LIBRARY_IMAGES_THUMB_DIR/{gameId}{ext}`, 다른 확장자의 같은 게임 사진은 삭제
  - `POST /api/build` `{ gameIds, fetchBgg, translate }` → `runPipeline` 결과
  - `GET /api/publish` / `POST /api/publish` → Task 8
- `announce-queue.js`: `enqueue(item)`, `list()`, `clear()` — 파일 `~/.cottage-admin/pending-announcements.json`
- 정적: `/` → `game-system/admin-gui/index.html`; `/site/*` → 리포 루트 파일(읽기 전용, `..` 경로 거부) — GUI가 `/site/assets/js/supabase-client.js` 등을 로드

- [ ] **Step 1: Write failing tests** (서버를 포트 0으로 띄워 실제 HTTP):
  - `GET /api/games` 200, `games.length >= 645`, `issues` 이름 4개
  - `POST /api/locations {names:['없는게임'], location:'전략'}` → 400, 본문 `error`에 `없는 게임`
  - `GET /site/../.env` → 403
  - 대기열: `POST /api/locations`를 모의 `setLocation`(api.js가 의존성 주입 `createApi({ ops })`를 받는다)으로 호출해 도착 3개 → `list()` 길이 1, `names.length 3`
- [ ] **Step 2: Run** `node --test game-system/admin-gui/api.test.js` → FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat: add local admin server and API`

### Task 8: 사이트에 올리기 + 알림 전송

**Files:**
- Create: `game-system/admin-gui/publish.js`
- Test: `game-system/admin-gui/publish.test.js`
- Docs: `docs/PROJECT_STRUCTURE.md` §8 — GUI 올리기 흐름 3줄

**Interfaces:**
- Produces:
  - `PUBLISH_PATHS = ['game-system/game-data/']`
  - `filterPublishable(porcelainLines: string[]): { publish: string[], other: string[] }` — `git status --porcelain` 줄 분류
  - `describeChanges(files): string[]` — 평문 ("게임 목록(엑셀)", "게임 데이터 산출물", "약칭", "게임 사진 N장", "수동 정보")
  - `getPublishPreview(): Promise<{ files, summary: string[], pendingAnnouncements, behind: number }>`
  - `publish(): Promise<{ ok, step, message, commit? }>` — 순서: 변경 0이면 `ok:false, message:'올릴 변경이 없어요'` → `npm run check` 실패 시 중단 → `git fetch` 후 `HEAD..origin/main` 개수 > 0이면 중단(`'GitHub에 더 새 버전이 있어요. 먼저 받아와야 해요'`) → `git add` 허용 경로만 → `git commit -m "data: <요약>"` → `git push` → **성공 시에만** 대기열 알림을 Supabase REST로 `game_announcements`에 INSERT(anon 키는 `assets/js/supabase-config.js`에서 읽음) → 성공한 항목만 대기열에서 제거
- Consumes: `announce-queue.js`

- [ ] **Step 1: Write failing tests:**
  - `filterPublishable([' M game-system/game-data/source/2-cottage-manual/cottage-owned-games.xlsx', ' M assets/js/kakao-auth.js'])` → publish 1, other 1
  - `publish()`를 주입된 `git`/`check`/`insertAnnouncement` 모의로: push 실패 시 `insertAnnouncement` 호출 0회·대기열 유지; push 성공 시 호출 = 대기열 길이, 대기열 비워짐; behind 1이면 commit 호출 0회
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement** (`createPublisher({ git, runCheck, insertAnnouncement, queue })` 주입형, 기본값은 실제 구현)
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat: publish game data and send queued announcements after push`

### Task 9: GUI 화면 + 바탕화면 실행

**Files:**
- Create: `game-system/admin-gui/index.html`, `game-system/admin-gui/app.js`, `game-system/admin-gui/launch.js`
- Modify: `package.json` — `"admin"`을 `node game-system/admin-gui/launch.js`로
- Create: `docs/game-admin-gui.md` — 사용법(바탕화면 바로가기 만드는 법 포함) — 사용자 대상 1페이지

**Interfaces:**
- Consumes: Task 7 API, 사이트 `CottageDB.getGameOverride / upsertGameOverride / uploadOrganizerPhoto`(GUI가 `/site/assets/js/supabase-config.js`, supabase CDN(사이트와 같은 버전 태그), `/site/assets/js/supabase-client.js` 로드)
- `launch.js`: 포트 `5178`에 `GET /api/health` → 응답 있으면 브라우저만 열기; 없으면 서버 기동 후 열기. 브라우저 열기 = `explorer.exe http://127.0.0.1:5178` (WSL), 실패 시 URL 출력.
- 바로가기 대상(문서에 기재): `wsl.exe -d Ubuntu --cd ~/cottage-board-site -- npm run admin`

화면(탭 5개): **새 게임**(이름·위치 드롭다운 → 「목록에 추가」 → 후보 카드 / BGG 주소 붙여넣기 / BGG 없음 → 「회원에게 알림」 체크 기본 ON → 저장 → 빌드 진행 단계 표시) / **게임 수정**(검색 → 위치·약칭·BGG 교정·수동 정보·사진·룰 4칸·자주 틀리는 규칙·정리 방법 글+사진) / **위치 일괄**(위치별 필터 기본 「발매후 도착예정」, 체크박스 다중 선택, 대상 위치, 알림 체크, "N개 중 M개가 도착 알림 대상" 미리보기) / **확인 필요**(issues 4개, 바로 위치 지정) / **올리기**(평문 변경 목록, 대기 알림 목록, 버튼, 단계별 결과).

- [ ] **Step 1: Write failing test** `launch.test.js`: 포트를 점유한 가짜 서버(`/api/health` 200)가 있을 때 `launch({ open: spy })`가 새 서버를 띄우지 않고 `spy` 1회 호출.
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement** launch.js + 화면
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: 실사용 리허설(육안)** — `npm run admin` → ①위치 일괄에서 「발매후 도착예정」 7개 선택 → 실제 선반 지정 → 저장 → 빌드 → 올리기 미리보기에 "알림 1건(7개 도착)" 표시 스크린샷을 **읽는다** ②게임 수정에서 정리 방법 글 저장 → 사이트 게임시트에 반영 확인. 올리기 실행 여부는 사용자가 정한다(운영 반영·알림 발송).
- [ ] **Step 6: Commit** `feat: add game admin GUI and desktop launcher` (+ 문서)

---

## 완료 조건 (스펙 §7)

- 사용자가 바로가기 더블클릭 → 7개 도착 처리 → 올리기 → 운영 사이트 위치 반영 + 회원 종 알림 1건.
- BGG 없는 게임 수동 인원 입력 후 `npm run build:master` 재실행해도 유지(Task 5).
- `npm run add-game` 기존대로(Task 3 Step 5).
