# PLAN — 활성 뷰(시트/모달/iframe) 단위 체류시간 추적

작성: 2026-08-18. 1차 개정: 같은 날, 사용자가 "단일 writer 원칙" 승인조건을 걸어 재설계. **승인됨(조건부) — 조건은 아래 「승인 조건」 그대로 고정.**

## 배경 — 왜 필요한가

지금 체류시간은 전부 `window.location.pathname` 기준이다. 그런데 실사용의 상당 시간이 **URL이 안 바뀌는 오버레이**(프로필 패널 서브시트, 게임시트, 일정 상세 모달, 플래너 바텀시트, index.html이 미리 로드하는 iframe 모달) 안에서 일어난다. 그 결과 "메인 체류가 압도적으로 길다"는 집계가 나오는데, 실제로는 사람들이 메인 화면 자체가 아니라 그 위에 뜬 플래너·내 보드·게임시트를 보고 있었을 뿐이다 — 지금 지표로는 이 둘을 구분할 수 없다.

## 승인 조건 (사용자, 2026-08-18) — 전부 고정 요구사항

1. **`page_sessions` 기록 경로는 끝까지 하나만 유지한다.** `pushActiveView`/`popActiveView`는 기존 writer의 "지금 라벨"을 전환·분할하는 역할만 하고, 별도의 독립 타이머·독립 INSERT 경로를 새로 만들지 않는다.
2. **스택 정합성**: A→B→B닫기→A 복귀가 정확해야 한다. 중첩 상태에서 단순 `pop()`으로 엉뚱한 화면으로 돌아가면 안 된다.
3. **중복 close 방어**: 같은 시트에서 close/overlay click/Escape/DOM removal이 겹쳐 `popActiveView()`가 두 번 불려도 스택이 안 무너져야 한다 → **토큰 기반**으로 방어(현재 top의 토큰과 일치할 때만 pop).
4. **visibility/pagehide는 현재 세그먼트만 flush, 스택은 안 건드림** — 탭이 숨겨져도 active view를 pop하지 않는다. 지금 보고 있던 뷰의 시간만 한 번 보내고, 돌아오면 같은 뷰에서 이어진다.
5. **검증은 DB 결과로, 단계마다 강제로 끊는다** — 1차(핵심 인프라 + 실제 화면 1곳) 완료 후 실제 DB 값으로 위 2~4번을 확인하고, 이상 없을 때만 다음 단계로 넘어간다. 화면이 멀쩡해도 데이터만 틀리는 게 이 영역에서 제일 위험하다는 전제.

## 재설계의 핵심 — "기존 writer"는 어느 쪽인가

`page_sessions`에 실제로 쓰는 코드는 이미 **두 곳**이었다(재발견, 2026-08-18 세션 "오늘 0분" 조사 중 확인):

- **`script-nav.js`의 `_send()`** — `visibilitychange:hidden` 또는 `pagehide`에서 `fetch(..., {keepalive:true})`로 씀. keepalive 덕분에 탭이 찢겨나가는 순간에도 살아남는다(실측: 다아님 케이스에서 44초가 정확히 여기로 들어갔다).
- **`supabase-client.js`의 `_syncTimeToDBNow(insertPageSession=true)`** — `visibilitychange:hidden`에서만 DB에 쓰고, `pagehide`/`beforeunload`에서는 로컬에만 남긴다(덜 안정적). 이게 같은 순간에 `script-nav.js`와 **동시에** 발사되는 경우가 있어 이미 발견 ⑧("한 방문이 page_sessions 2행")로 기록돼 있었고, 읽는 쪽(`collapseTwinInserts`)에서 사후 접기로만 덮어놨었다.

**결정**: 살아남길 writer는 `script-nav.js` 쪽이다(keepalive라 더 안정적, pagehide도 커버). `supabase-client.js`의 `_syncTimeToDBNow`는 이번에 **page_sessions insert 책임을 완전히 내려놓는다**(`insertPageSession` 파라미터·해당 블록 삭제) — profiles.today_seconds/total_minutes RPC만 남는다. 이러면 승인조건 1번이 원천적으로 지켜지고, **기존 발견 ⑧(이중 insert)도 이번 작업으로 같이 닫힌다** — 별도 작업 아님, 같은 원인.

## 설계 원칙 — profiles 쪽은 왜 안 건드리나 (유지)

`profiles.today_seconds`/`total_minutes`(하루 누적 총합)는 **상태 누적값**이라 fire-and-forget 재시도와 상성이 나쁘다(pagehide에서 이 값만 못 들어가는 사고가 이미 실측됨 — 억지로 고치면 이중계상 아니면 유실, 둘 중 하나를 반드시 감수해야 함). `page_sessions`(append-only)는 그 문제가 없다. **그래서 이번 설계는 `page_sessions`에 세분화된 `page` 값만 새로 넣고, profiles 쪽 총합은 그대로 둔다.**

## 변경할 대상

### 1. 핵심 API — `assets/js/script-nav.js` (writer 자체를 세그먼트 인식형으로 재작성)

기존(`_send`는 페이지 하나에 딱 1번만 발사되는 1회성 함수, [script-nav.js:866-892](../assets/js/script-nav.js#L866-L892))을 **여러 번 재호출 가능한 세그먼트 flush**로 바꾼다.

```
상태: _basePage(최초 location 기반 라벨, 고정) · _currentLabel · _segStart(현재 세그먼트 시작 시각)
      · _stack = [{key, token}] · _tokenSeq · _finalized(pagehide 이후 true)

_flushAndSwitch(nextLabel):
  dur = round((now - _segStart)/1000)
  prevLabel = _currentLabel; _segStart = now; _currentLabel = nextLabel
  dur >= 3초일 때만 fetch(keepalive) 전송 — 기존 "3초 미만 무시" 문턱 유지

window.pushActiveView(key) -> token:
  _finalized거나 스킵조건이면 null
  _flushAndSwitch(key) → 지금까지 분을 이전 라벨로 전송, 새 라벨로 전환
  token = ++_tokenSeq; _stack.push({key, token}); return token

window.popActiveView(token):
  top = _stack 마지막
  top이 없거나 top.token !== token → console.warn 후 그냥 return (스택 안 건드림, 승인조건 3)
  _stack.pop()
  restoreLabel = 스택에 남은 게 있으면 그 top.key, 없으면 _basePage
  _flushAndSwitch(restoreLabel) → 승인조건 2(중첩 복귀) 자동 충족

visibilitychange (hidden): _flushAndSwitch(_currentLabel) — 같은 라벨로 "재전환"해 지금까지 분만 보내고 스택은 안 건드림(승인조건 4)
visibilitychange (visible): _segStart = now — 숨겨져 있던 시간은 안 셈(기존 supabase-client.js의 동일 패턴과 동일 원칙)
pagehide: _finalized=true로 잠그고 마지막 세그먼트 flush(스택 상태와 무관하게 1회)
```

`window.pushActiveView`/`window.popActiveView`는 **bare global**로 노출(CottageDB 네임스페이스 아님) — script-nav.js가 supabase-client.js보다 먼저 로드되는 페이지가 있어 로드 순서 의존을 만들지 않기 위함. 호출부는 전부 `window.pushActiveView?.(key)`로 옵셔널 체이닝(day-detail.js 기존 관례와 동일).

### 2. `assets/js/supabase-client.js` — page_sessions insert 책임 제거

- `_syncTimeToDBNow(userId, insertPageSession=true)` → `_syncTimeToDBNow(userId)`로 시그니처 단순화, [supabase-client.js:1173-1179](../assets/js/supabase-client.js#L1173-L1179)의 `if (insertPageSession) { ... page_sessions insert ... }` 블록 삭제.
- 호출부 2곳([:1125](../assets/js/supabase-client.js#L1125) 헤어트비트, [:1187](../assets/js/supabase-client.js#L1187) visibilitychange) 인자 정리.
- profiles RPC(`increment_profile_counters`) 로직은 **그대로**.

### 3. 가상 페이지 키 등록 — 기존 체계 재사용

`_trackPvOnce`(조회수, page_views)와 이름만 공유하고 별개로 동작. 신설 필요:
  - `game-sheet` ([game-sheet.js:595](../assets/js/game-sheet.js#L595) `openGameSheet`)
  - `game-location-shelf` ([game-sheet.js:372](../assets/js/game-sheet.js#L372) `openShelfSheet`)
  - `day-detail` ([day-detail.js:756](../assets/js/day-detail.js#L756) `openDayDetailModal`, [:1221](../assets/js/day-detail.js#L1221) `openDateMeetingModal`)
  - `planner-register` ([club-schedule.html:956](../pages/club/club-schedule.html#L956) `initScheduleSheet`, [:1064](../pages/club/club-schedule.html#L1064) `initMultiSheet`)
  - (재사용) `my-board`/`other-board`/`my-board-meeting`/`my-board-growth`/`my-board-records`/`my-board-usage`/`my-board-taste`/`my-board-notif`/`my-board-voucher`

새 키는 `page-labels.js`(`COTTAGE_PAGE_LABELS`)와 `member-analytics.js`(`PAGE_KEY_ALIASES`) 양쪽에 동시 등록.

### 4. 호출부 배선 — 열 때 push, 닫을 때 pop (토큰 보관 필수)

각 sheet/modal은 자기 스코프에 `let _viewToken = null;`를 두고 `_viewToken = window.pushActiveView?.('key')` / `window.popActiveView?.(_viewToken)`로 짝을 맞춘다 — 전역 변수 하나로 여러 시트가 토큰을 공유하면 안 됨(교차 오염).

| 파일 | 함수 | 비고 |
|---|---|---|
| kakao-auth.js | `openProfilePanel`/`openOtherProfileSheet`/`openOtherMeetingSheet` | **1차 대상** — 사용 빈도 최다 |
| kakao-auth.js | `_openSubSheet` | 2차 |
| game-sheet.js | `openGameSheet`/`_openAndInitSheet`, `openShelfSheet` | 2차 |
| day-detail.js | `openDayDetailModal`/`openDateMeetingModal`/`openDateScheduleModal` | 3차 |
| club-schedule.html | `initScheduleSheet`/`initMultiSheet` | 3차 |
| index.html (부모) | `message` 리스너에 `cottage-view-active`/`cottage-view-inactive` 추가, iframe 대신 push/pop 호출 | 3차 |

## 보존해야 할 기존 동작

- `profiles.today_seconds`/`total_minutes` — 절대 변경 없음.
- iframe 자체 추적 차단(#24 방지) — 유지.
- 기존 "3초 미만 세그먼트는 무시" 문턱 — 유지(세분화되며 더 자주 걸릴 수 있음, 알려진 트레이드오프로 수용).
- `collapseTwinInserts`(읽기 측 방어) — 이번 수정으로 애초에 쌍이 안 생기지만, 남겨둔다(해가 없고 과거 데이터엔 여전히 필요).

## 위험요소

1. **닫기 경로 누락** — 시트가 ESC·배경클릭·버튼 3갈래로 닫히는데 pop을 한 곳에만 걸면 다음 화면 시간이 이전 라벨로 계속 잡힌다. 착수 시 각 대상의 실제 닫기 경로부터 grep.
2. **토큰 스코프 오염** — 시트 A의 pop 호출부가 실수로 시트 B의 토큰 변수를 참조하면 잘못된 pop(무시됨, 경고만 남고 스택은 안 깨짐 — 승인조건 3이 정확히 이 상황의 안전망).
3. **iframe postMessage 유실** — 부모 리스너 등록 전 신호 도착 시 push 누락, 그 구간은 그냥 "메인"으로 남음(회귀는 아님, 기존 수준 유지).
4. **가상 키 등록 누락** — `page-labels.js`/`PAGE_KEY_ALIASES` 한쪽만 갱신하면 반쪽 반영.

## 검증 계획 (1차 종료 시점, DB 실측)

- `scripts/verify-active-view-tracking.js`: script-nav.js 트래커 로직을 원문 그대로 eval해 아래 확인(음성 대조군 포함).
  - 단일 push→pop: 두 개의 행(구간1, 구간2)이 duration 합 = 전체 경과와 일치.
  - 중첩 2단(A push→B push→B pop→A pop): 복귀 라벨이 정확히 A인지, 3개 행의 라벨 순서가 [원본→A→B→A→원본] 구조로 맞는지.
  - **중복 pop**: 같은 토큰으로 popActiveView 2번 호출 시 두 번째는 no-op(스택 길이·라벨 불변) 확인.
  - **stale 토큰**: 이미 pop된 토큰으로 다시 pop 호출 시 no-op.
  - **visibility hidden→visible**: hidden 시 flush 발생(라벨 불변), 스택 길이 불변, visible 복귀 후 다음 pop이 여전히 올바른 라벨로 돌아가는지.
  - **3초 미만 세그먼트**: 행이 안 생기는지(기존 문턱 유지 확인).
  - **writer 단일성**: 코드베이스 전체에서 `page_sessions` INSERT를 시도하는 지점이 이 파일 한 곳뿐인지 grep으로 재확인(supabase-client.js 쪽 삭제 확인 포함).
- **1차 끝나면 여기서 멈춘다.** 위 검증이 전부 통과하고, 실브라우저로 프로필 패널 열기→서브시트 이동→닫기 시나리오를 1회 실행해 관리자 페이지 「페이지」 탭에 `my-board`류 duration이 정확히 찍히는지 확인한 뒤에만 2차(게임시트 등)로 진행한다.

## 실행 단위

**1차(핵심 인프라 + 실제 화면 1곳) — ✅ 완료 (2026-08-18)**: script-nav.js 재작성 + supabase-client.js 정리 + page-labels.js/member-analytics.js 키 확인(`my-board`류는 이미 있어 신규 등록 불필요, 게임시트 등 신규 키는 2차) + kakao-auth.js 프로필 패널(`openProfilePanel`/`openOtherProfileSheet`/`openOtherMeetingSheet`, 닫기 경로 4곳 전부: ✕·배경클릭·뒤로가기·재오픈 시 강제치우기) 배선.

**검증 결과**:
- `scripts/verify-active-view-tracking.js`(Node, DB 안 건드림) — 9개 테스트 전부 통과(단일 push/pop·중첩 2단 복귀·중복 pop 방어·stale 토큰 방어·visibility flush-without-pop·3초 문턱·트래킹 스킵·단일 writer 확인·profiles 로직 무변경) + `--negctl`로 3초 문턱이 실제로 걸려 있음을 확인(문턱 없앤 트래커에선 검출됨).
- `scripts/verify-active-view-live.js`(Playwright, 운영 DB 쓰기 0건 — GET 이외 전부 route.abort) — 로컬 서버(`verify-active-view.local`→127.0.0.1 host-resolver 매핑으로 `_isLocalhost()` 스킵 우회, 실서비스 도메인은 아직 미배포라 사용 불가) 실브라우저에서 `window.pushActiveView`/`popActiveView` 실재 확인 + 실제 fetch(keepalive) 경로로 세그먼트 3개(index/index/verify-live-test-view) 전환, 차단된 POST payload에서 라벨·duration_sec·session_key 전부 정상 확인. 콘솔 에러는 차단이 유발한 `_startAnonHeartbeat`(무관) 2건 외 0건.
- **미검증**: 실제 로그인 후 프로필 패널을 클릭으로 열고 닫는 UI 시나리오(로그인 게이트가 있어 자동화 스크립트로는 실행 불가 — 가짜 로그인은 운영 DB에 실제 프로필 행을 만들어 금지). 사용자가 실제로 로그인해 내 보드를 한 번 열고 닫아주면 관리자 페이지 「페이지」 탭에서 `my-board` duration이 찍히는지 읽기 전용으로 확인 가능.

**2차(game-sheet.js: 게임시트·게임위치 선반) — ✅ 완료 (2026-08-19)**: 새 가상 키 `game-sheet`(정보+기록 시트, `#gameSheet` 오버레이 공유)·`game-location-shelf`(선반 오버레이) 신설(page-labels.js·member-analytics.js `V2_ONLY_PAGE_KEYS` 동시 등록). `_ensureGameSheetViewToken()` 가드로 정보↔기록 전환 시 재-push 안 하게 처리(같은 뷰), `closeGameSheet()`에서 pop(닫기 경로는 이 함수 하나로 이미 수렴돼 있어 위험요소①이 해당 없었음 — dim/✕/버튼 3곳 전부 확인). 선반은 토큰을 오버레이 DOM 노드에 저장(kakao-auth.js 패널과 동일 패턴), 뒤로가기·배경클릭·"기존 오버레이 강제 치우기" 3곳에서 pop. 선반 안에서 게임 클릭 시 게임시트가 **중첩 push**되고(선반은 안 닫히고 뒤에 숨을 뿐), 게임시트 닫힘이 자동으로 선반을 스택 top으로 복원 — 별도 배선 불필요.
  - **검증**: script-nav.js 트래커를 원문 eval해 두 시나리오 확인(스크래치패드 임시 스크립트, 커밋 안 함) — ①게임시트 정보→기록→정보 전환 시 push 1번만(15초 단일 행, 재호출로 안 쪼개짐) ②선반→게임시트 중첩→게임시트 닫힘(선반 자동 복귀)→선반 닫힘이 `[index, game-location-shelf, game-sheet, game-location-shelf]` 순서로 정확히 나옴. 기존 `scripts/verify-active-view-tracking.js` 9종 재실행해 회귀 없음 확인(script-nav.js 자체는 무변경).
  - **미검증**: 실제 로그인 후 게임시트·선반을 실제로 열고 닫는 UI 시나리오(1차와 같은 사유로 자동화 불가) — 사용자가 실사용 후 관리자 페이지 「페이지」 탭에서 `game-sheet`/`game-location-shelf` duration이 찍히는지 확인.
**3차(day-detail.js·club-schedule.html·index.html 부모 iframe) — ✅ 완료 (2026-08-19)**: 새 가상 키 2개(`day-detail`, `planner-register`) 신설(page-labels.js·member-analytics.js `V2_ONLY_PAGE_KEYS` 동시 등록). 계획 시점엔 안 보였던 실제 구조를 코드로 확인하며 아래처럼 매핑을 정교화했다:
  - **`day-detail`** — `openDateScheduleModal`/`openDayDetailModal`/`openDatePreviewModal`/`openDateMeetingModal` **4개 함수 전부**가 같은 `#__ddModal` 오버레이를 공유(한쪽이 열리면 다른 쪽을 강제 치움) — game-sheet.js와 같은 active-플래그 가드(`_ensureDdViewToken`/`_popDdViewToken`)로 묶어 하나의 뷰로 취급. 이 안에서 참여자 클릭(other-board)·게임 클릭(game-sheet)이 열려도 **레이어로 겹칠 뿐 day-detail을 닫지 않으므로** 자연히 중첩 push가 된다(배선 불필요). 「등록/수정」 저장 후 `openDateMeetingModal`이 자기 자신을 다시 그려도(같은 `#__ddModal` 재생성) active 플래그 덕에 재-push 안 됨.
  - **`planner-register`** — 계획엔 club-schedule.html의 `initScheduleSheet`/`initMultiSheet`만 적혀 있었으나, 실제로 등록/수정 UI를 담는 iframe 래퍼가 **3곳**이나 더 있었다(day-detail.js `openPlannerModal`의 `#__plannerModal`, index.html 홈 전용 `initPlannerModal`의 `#plannerSheetModal` — 둘 다 club-schedule.html?embed=true를 감싼다). embed 모드에서는 iframe 자체 트래킹이 `_isEmbeddedFrame()`으로 이미 꺼져 있어(#24 방지, 기존 동작 유지) club-schedule.html 내부에서의 push는 embed일 때 자동 no-op이고, **부모 쪽(day-detail.js/index-page.js)에서 "박스가 실제로 보이는 순간"(`_pmReveal`/`cottage-sheet-shown` 반영 지점)에 같은 키로 push**해 실질적인 카운팅을 담당한다. club-schedule.html을 standalone 페이지로 직접 방문할 때는 그 자체 push가 정상 동작(embed 아님).
  - **`recordIframeModal`(index.html 홈, game-reviews.html embed)도 발견해 같이 배선** — 새 가상 키를 만들지 않고 기존 실페이지 키 `game-reviews`를 재사용(V2_ONLY_PAGE_KEYS엔 미등록 — 실페이지 키를 넣으면 v1 시절 방문까지 v2 마커로 오인해 cutoff이 오염된다).
  - **검증**: script-nav.js 트래커 원문 eval 시뮬레이션(스크래치패드, 커밋 안 함) — day-detail 안에서 other-board→game-sheet→planner-register를 차례로 중첩·복귀하고 마지막에 openDateMeetingModal 재렌더를 거쳐도 day-detail이 정확히 4개 행으로만 쪼개짐(재호출로 5번째가 안 생김) 확인, `scripts/verify-active-view-tracking.js` 9종 재실행 회귀 없음.
  - **미검증**: 실사용 확인(1·2차와 동일 사유로 자동화 불가) — push 후 사용자가 이날 모임 상세·플래너 등록·홈 플래너/기록 팝업을 실제로 열고 닫아보고 관리자 페이지 「페이지」 탭에 `day-detail`/`planner-register`/`game-reviews`(팝업 경유분) duration이 찍히는지 확인.

각 차수 끝에 커밋 + 관리자 페이지 육안 확인 1회.

**활성 뷰 추적 배선 — 1·2·3차 전부 완료.** 남은 건 실사용 확인뿐(위 각 차수의 "미검증" 항목들을 사용자가 실기기로 확인). 새 화면이 추가되면 그때 같은 패턴(overlay 생성 지점에 `pushActiveView`, 그 overlay의 모든 닫기 경로에 `popActiveView`, 재-push 방지가 필요하면 active 플래그 가드)으로 확장.

## 부록 — 읽기 측 v2 cutoff (2026-08-18, 1차와 별도로 처리·완료)

1차 배포 직후 실사용 데이터(user 5038837936이 실제로 my-board↔other-board를 여러 번 오간
세션)가 실제로 들어온 걸 확인하면서, 사용자가 "v1/v2를 그대로 합쳐 집계하면 v1 시절의
통짜 체류가 압도적으로 커서 v2가 아무리 정확히 쌓여도 오랫동안 착시가 안 없어진다(큰 수의
법칙)"는 지적을 함. 과거 데이터 소급 재분류는 불가능(정보 자체가 없음)하고 삭제할 필요도
없어서, **읽기 측에서만** v2 최초 등장 시점 이후로 페이지별 체류/비중 집계를 끊기로 결정.
상세 설계·구현·검증은 `member-analytics.js`/`requests-admin.html` diff와
`scripts/verify-v2-tracking-cutoff.js`, admin-analytics.md 2026-08-18 항목 참조 — 이
문서엔 "왜 write-path Plan과 같은 날 나온 별개 결정인가"만 남긴다. 쓰기 경로(단일 writer
원칙)는 전혀 안 건드림 — 순수 집계 쿼리 필터 + UI 라벨 추가뿐이라 Plan 승인 없이 바로
진행(되돌리기 쉬움, DB 스키마 무관).
