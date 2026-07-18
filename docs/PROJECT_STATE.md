# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-07-19 (세션 ⑪ — 관리자 화면 육안 점검. DB 층은 깨끗하나 **표시 층 문제 5건** 실측 확정: 필터 칩 모집단 불일치·퍼널 전환율 사망·차트 축 2건·요약 기간 표기). **최근 세션(⑪·⑩) 요약은 §0 상단.** 이전 세션(①~⑨) 상세는 git log + [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md), 그때 발생한 열린 항목·교훈은 전부 §3·CLAUDE.md·js-api.md로 이관 완료.

---

## 0. 진행 중 작업 (세션 시작 시 확인)

**진행 중 작업 없음** (2026-07-19 세션 ⑪ 종료 시점) · **열린 스모크 0건**.

**세션 ⑪ (2026-07-19)** — 시작점 1번 「관리자 화면 눈으로 보기」 → 발견 등록 → **#5·#6 수정까지**:

- ✅ **#5·#6 해결 (하나의 원인이었다)** — 날짜 메뉴가 **반대 탭에 배선**돼 있었음: 회원 탭엔 적용되고 이벤트 탭엔 숨겨져 있었다([:604](../pages/admin/requests-admin.html#L604) `usesDateFilter`, 주석까지 그렇게 달려 있었음). **사용자 진단("지금은 반대로 됐있는 거 같음")이 정확했다.** `member`↔`event` 교체 + 회원 목록 날짜필터 제거 + 퍼널을 `draw()` 기간에 연결 + 이벤트 조회 전 기간화 + 죽은 `getPageViewCounts` 왕복 제거. 검증: 칩 341=목록 341, 전환율 `7일 100/167/50/0/55%`·`전체 60/83/118/0/94%`, 콘솔 에러 0.
  - 📌 **고치니 다음 문제가 보였다** → 발견 #10(전환율 100% 초과 = 순차 퍼널이 아님)·#11(기간 버튼 라벨 불일치)·#12(회원탭 차트 기간 조작 수단 상실). §3 등록, 시작점 1·2번.
- ✅ **#13 해결 — 요약 이벤트 카드 계열 묶기 + 이벤트 77% 누락 해소** (사용자 요청에서 출발) — "계열별로 묶어달라"는 표현 요청을 착수하다 **조회 목록 자체가 1,493행 중 344행(23%)만 덮고 있던 것**을 발견. 조회 목록과 라벨 표가 **두 벌로 관리돼 어긋난 게 원인**이라 `EVENT_FAMILIES` 단일 출처로 합치고 조회를 파생시켰다. 요약 카드는 계열당 한 줄(`🤝 모임 1,050`)로. 검증: 계열 합계 = DB 전체 행수 일치.
  - 📌 **교훈 — "표현을 바꿔달라"는 요청이 데이터 구멍을 드러냈다.** 계열로 묶으려면 "어떤 이벤트가 어느 계열인가"를 전수로 따져야 했고, 그 과정에서 조회조차 안 되던 77%가 나왔다. 평평한 나열은 **빠진 항목이 눈에 안 띄는** 표현이었다.

**아래는 수정 전 육안 점검 단계의 기록:**
- **DB 층 재확인 ✅ 이상 없음** — 세션 ⑩의 `max-rows` 상향이 유지되고 있음을 실측(`page_sessions` 11,514/11,514 · `page_views` 2,331/2,331 · `page_events` 1,489/1,489 전량 수신, 절단·RLS 0, 콘솔 에러 0건).
- 🔍 **표시 층 문제 5건 실측 확정** → §3 「[감사] 관리자 페이지」 **발견 #5~#9**에 등록. 요지: **데이터가 없는 게 아니라, 있는 데이터를 잘못 보여준다.**
  - 🔴 #5 회원 탭 필터 칩 `전체 (341)`인데 목록은 **4명**(칩은 누적, 목록은 날짜 필터 — 모집단이 다름) / 🔴 #6 퍼널 전환율이 **오늘 표본으로만** 계산돼 5칸 전부 `-`(7일 값이 옆에 있는데 미사용) / 🟡 #7 이용시간 차트 x축 눈금 불규칙(초 데이터에 분 라벨 반올림) / 🟡 #8 가로막대 길이=횟수인데 막대 위 텍스트=체류시간 / 🟢 #9 요약 카드 기간 기준 제각각·말줄임.
  - ✅ 방문 탭 「요일」·「재방문율」 회색 칩은 **버그 아님** — `disabled title="준비 중"`, 「관리자 분석 2단계」가 붙을 **예약된 자리**.
  - 📌 **2단계 입력으로서의 결론**: #5·#6·#9가 전부 "어느 기간·누구를 센 숫자인지 화면이 말해주지 않는다"는 한 뿌리 → **새 지표를 추가하기 전에 기존 지표의 기준부터 맞춰야 한다.**
- 🧰 **육안 점검 하니스 보존** — [scripts/shot-admin-tabs.js](../scripts/shot-admin-tabs.js) (6탭 스크린샷 + 발견 #5~#7 자동 판정). 발견 #5·#6 수정 시 **전후 비교**에 그대로 쓸 것. 실행 결과 3건 모두 🔴/🟡로 잡히는 것 확인(양성 대조).
- 🚨 **도구 함정 A — Playwright 산출물을 리포 안에 쓰면 죽는다 (2회 실패 후 규명, 규칙 승격 후보)**: `scripts/ss_admin/`에 PNG를 쓰자 **두 번째 탭부터 `boundingBox=null` → 스크린샷 30초 타임아웃**. 증상이 "탭이 안 열림"이라 스크립트를 두 번 고쳤으나 **원인은 개발 서버(Live Server 5500)의 라이브 리로드**였다 — 리포를 감시 중이라 PNG 쓰기가 곧 페이지 리로드였고, 페이지가 첫 탭으로 초기화됐다. **출력 경로만 리포 밖(OS 임시폴더)으로 옮기니 6/6 통과.**
  - 📌 **「반복 패치 정지」 규칙이 정확히 작동한 사례** — 2회 실패에서 멈추고 런타임 관측(패널 크기·탭 활성 상태)으로 전환했고, "스크립트가 아니라 **환경 전제**를 의심하라"는 그 규칙의 문구가 답이었다. 최소 재현으로 **출력 경로만 바꿔** 성공/실패가 갈리는 걸 보여 확정.
- ⚠️ **도구 함정 B (이 환경 한정)**: Grep의 `content` 출력이 **`/`를 `\`로 표시**한다 — `Math.round(a/b*100)`이 `a\b`로, `// ──` 주석이 `\ ──`로 보였다. JS 문법 오류로 오인해 "깨진 코드 발견"이라 보고할 뻔했고, **Read로 원본을 확인해 아티팩트임을 규명**했다. 「검증 결과가 이상하면 검사기를 먼저 의심」의 변형 — **Grep 출력의 슬래시는 근거로 쓰지 말 것.**

**세션 ⑩ (2026-07-18)** — 전부 실브라우저·실DB 검증 통과:
- **개별 알림 읽음 ✅ 종결** (Red, 마이그레이션 010) — '읽음' 버튼이 실제로는 `_markAllNotifSeen`을 불러 전부 읽음 처리되던 버그. 읽음 상태가 `notif_seen_at` **타임스탬프 하나**뿐이라 "이것만 읽음"을 담을 자리가 구조적으로 없던 게 원인. **지평선 + 개별키(`notif_read_keys` jsonb) 2층**으로 해결. 커밋 a4469fe. 계약은 [js-api.md](js-api.md)·[db-schema.md](db-schema.md), 상세는 git.
  - 🔑 **재방문 시 알아야 할 것 2개**: ①알림 서브시트는 `_notifInnerHtml` **문자열 캐시**로 재렌더되므로 DOM만 바꾸는 변경은 `_openSubSheet`의 **`onLeave` 스냅샷**을 함께 걸어야 재진입 시 안 되돌아간다(기록보드와 같은 방식). ②`updateNotifSeenAt`이 `notif_read_keys`를 비우는 게 **배열 크기 상한선**이라 이걸 없애면 무한 증가한다.
  - **R1(알림 읽음) 열린 스모크도 이때 함께 종결** — 무지님 소개글로 알림이 발생해 확인 가능해짐.
- **알림 '모두 읽기'가 8건 초과분을 안 지우던 버그 ✅** — `.profile-notif-list`만 훑어 9번째부터 들어가는 별도 `<ul>`(`.profile-notif-more-list`)의 NEW 배지가 남던 것. 커밋 8b5d9f7.
- 🔥 **관리자 페이지 감사 — "조용한 실패" 2건 규명 ✅** (단일버그 추적을 감사로 전환한 사용자 결정의 성과):
  - **이벤트 퍼널이 몇 주간 죽어 있던 원인 = `page_events` SELECT 정책이 `authenticated`** (이 프로젝트엔 없는 역할) → 1,452행이 통째로 안 보임. 마이그레이션 011로 종결, 퍼널 실수치 렌더 확인.
  - **관리자 분석이 데이터의 9%만 보고 있던 원인 = PostgREST `max-rows` 1000 절단** → `max-rows` 50000으로 해소. **총 체류시간 12시간 → 276시간(23배)**, 집계 비회원 57 → 348명.
  - 📌 **둘 다 `error`가 `null`이라 감지기 1~4단계가 전부 못 잡았다** → CLAUDE.md 「행 수 자체가 거짓말한다」로 규칙 승격 완료.
  - 상세·미수정 발견 2건(#3 `anonTodayS` 잠재버그 · #4 dead code)은 §3 「[감사] 관리자 페이지」.
- **히어로 통계 미노출로 되돌림 ✅** — 011로 RLS가 풀리자 **몇 주간 안 보이던 "오늘 N개의 플레이기록이 작성됐어요"가 메인에 갑자기 나타남**(사용자 발견). 추적 결과 **삭제된 적이 없는 코드**였고([index.html](../index.html) 껍데기 `7e0712a` → `b4eef49`에서 `getEventCounts` 연동), `page_events` SELECT 차단 때문에 항상 빈 문자열이라 **"안 노출하기로 하고 반영된 상태"처럼 보였던 것**. 사용자 의도(메인은 깔끔하게)에 맞춰 `index.html`의 `<p>` 2개만 제거.
  - ⚠️ **JS는 건드리지 않았다** — `initHeroStats` 블록의 `finally`에 **`index.html#recommend` 딥링크 자동 열기**가 얹혀 있다. 요소가 없으면 조기 `return` 하지만 **`return`이어도 `finally`는 실행**되므로 딥링크는 유지된다(Playwright로 실측 확인: scrollY 740). 이 블록을 정리할 땐 그 로직을 반드시 살릴 것.
  - 되살리는 법은 index.html 해당 위치 주석에 남겨둠.

### 🎯 다음 세션 시작점 — 우선순위 순

| # | 항목 | 위치 | 등급·모델 |
|---|------|------|----------|
| 1 | **발견 #10 — 전환율 100% 초과**(1-2→1-3 167%). 단계들이 순차 통과가 아니라 독립 이벤트라 전환율 개념이 성립 안 함. **ⓑ(전환율 표기 제거·건수 비교로 개명)가 싸고 정직 / ⓐ(session_key 순차 카운트)는 「분석 2단계」 본체** — 어느 쪽인지 결정 필요 | §3 | 판단+옐로 / Opus |
| 2 | **발견 #9(요약 카드 기간 표기·말줄임, Green)** + **#11(기간 버튼 라벨 "7일"인데 실제 이번 주)** — 둘 다 "화면이 기준을 잘못 말함" 같은 뿌리 | §3 | 그린·옐로 / Sonnet |
| 3 | **[감사] 관리자 페이지 — 잔여분**. 남은 것: #3(`anonTodayS`)·#4(dead code)·#7·#8(차트 축)·#12(회원탭 차트 기간 조작 수단 없음)·**요청관리 영역 미착수** | §3 | 감사 / Opus |
| 4 | 남은 버그: 기록보드 플레이기록 09:00 고정 / 서브시트 모서리 음영 / 단기방문 시간 미표시(`duration_sec=0` 14.7%) | §2 | 버그 / 개별 판단 |
| 5 | 기록게시판 디자인 개선 (+ GS5 esc 2사본 겸사겸사) | §3 | design·feat |
| 6 | GS5(escH ~11개) — **보류**(선행: 로드순서), 착수 시 REFACTOR_CHECKPOINT 필독 | §3·[REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md) | 보류 / Opus xhigh+Plan |

**Phase 3 감사 실착수 전부 종결** (IP1·IP2·GS4·GS7·문서감사 ✅ / GS5만 선행조건 대기, DD4·IP3 판정종결). REFACTOR_CHECKPOINT 「Phase 3」 표에 남은 열린 항목은 GS5뿐.

⚠️ **리팩토링(GS5 등)에 착수하면 REFACTOR_CHECKPOINT.md 「재방문 시 필요한 판단」·「교훈」을 먼저 읽을 것** — KA4 3사본을 통합하면 안 되는 이유, 과도분리 금지 선례 2건, **함수 추출 3종 함정**(읽기누수·쓰기누수·크로스파일 갭 — `node --check`도 diff도 못 잡는다. R10c에서 세 번째 재발).

### ✅ 종료: 전체 리팩토링 R1~R12 (2026-07-15 ~ 07-17, 전부 스모크 통과)

세션별 결과는 [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md) 「진행 요약」 표, 상세는 git log. `REFACTOR_CHECKPOINT.md` 정리(474→90줄)도 완료 — 감사 잔여 12건은 §3로 이관(a8ca07e).

> ⚠️ **"R10c 완료 = 그 주제 전체 완료"가 아니다 (2026-07-17 확인)**: R10 원안은 **리팩토링 + stale 버그 + 네비스택**을 한 항목에 묶었으나 CLAUDE.md 「구현/리팩토링 분리」 위반이라 2026-07-16에 **R10a(추출) / R10b(stale) / R10c(네비스택)로 분할 승인**됐다. 따라서 **R10c = 신규기능(backTo)만**이고 그건 끝났다.
> **그러나 부모 항목은 열려 있다** → §3 「[PC 리팩토링] 타인 보드 내부 네비게이션 통일」: 남의 보드 안에서 서브시트를 전환할 때 **바텀시트로 뜨는** 것을 내 보드처럼 센터모달 + 고정 헤더로 통일하는 건. **R10c가 만든 `backTo`를 재사용할 수 있는지가 착수 시 첫 검토 사항.**

### 열린 스모크 (선택 — 해당 화면을 만질 때 함께)

- ~~**R1**(알림 읽음)~~ — ✅ **2026-07-18 스모크 통과 종결**(세션 ⑩). 무지님 소개글 알림으로 확인. 읽음이 DB `notif_seen_at`에 저장돼 새로고침 후에도 유지됨을 실측.
- **R2**(취향보드 게임 추가가 새로고침해야 반영) — R10b가 고친 경로와 겹쳐 **해소됐을 가능성 높음**. 취향보드 열 때 **확인만 하면 닫힘**. ※2026-07-17 검색 모달 토글 스모크에서 추가/삭제 즉시 반영은 봤으나 **R2 자체를 명시 확인하진 않았다**.
- **R4**(사진첨부 후 새로고침해야 표시) — **기록보드 = R10b 범위 밖**이라 그대로 남아 있을 것. 기록보드 만지는 세션에서 **재현부터** 볼 것.

### 📌 `openProfilePanel` 구조 메모 (그 파일을 다시 만질 때 — R10a/b/c의 산물)
- `openProfilePanel` 구성: 패널 셸+DB조회 **11개**(R10b가 중복 2개 제거) → 로컬 헬퍼 → **HTML 빌드**(`_buildTasteInnerHtml`·`_buildMeetingInnerHtml`은 이제 **함수**라 진입 시마다 호출됨 / `_recordInnerHtml`·`_growthInnerHtml` 등 나머지는 여전히 오픈 시 1회 문자열) → `_openSubSheet` → **서브시트 라우터**(`.profile-card` 클릭 → `type`별 분기 7개) → 프로필 영역 바인딩 + `autoSubsheet` 자동클릭. ※줄번호는 자주 밀리므로 grep으로 확인할 것.
- **taste/meeting 라우터 분기는 이제 async**(재조회 대기). 진입 시 `_SUBSHEET_LOADING_HTML`로 먼저 열리고 데이터 도착 후 `subBody.innerHTML` 교체 → **렌더 직후를 전제로 하는 코드는 afterRender 안에 둘 것**. 실제로 모임보드 '비선호 수정 →'의 스크롤이 이 때문에 옮겨졌고(`setTasteScrollTo`), 대기 중 이탈은 `subBody.isConnected` 가드로 처리.
- **record 스냅샷(`_recordInnerHtml`의 `onLeave`)은 남아 있다** — 기록보드는 크로스보드 중복이 아니라 범위에서 제외(사용자 승인 2026-07-17). 없애려면 진입 시 `getMyStats` 재조회 설계가 필요(무거운 조회 + `_allPhotoData` 재구성).
- ⚠️ **낡은 지시 정정 (2026-07-17)**: 여기 있던 "`openProfilePanel` 인라인 `.catch()` 24곳을 `{data, error}` 수신 형태로 바꿔야 한다"는 **레이어를 잘못 짚은 지시였음**. 이 자리들은 raw supabase가 아니라 **`CottageDB` 래퍼**를 부르고, 래퍼는 내부에서 이미 try/catch + error 수신을 한다(2단계) → 여기서 `{data, error}`를 받을 수 있는 대상이 애초에 없다. 쿼리 오류 감지는 **DB 계층의 일**이고 그건 §3 「감지기 갭」으로 이관. 이 인라인 `.catch()`들이 삼키는 건 **JS 예외뿐**이며, 실효가 있는 건 `CottageAchievements.build*`(자체 try/catch 없음) 정도 → 저가치·저위험이라 미실행.

- **`backTo` 네비게이션(R10c)**: `openProfilePanel(sub, {backTo})` — 시그니처·형태는 [js-api.md](js-api.md). ⚠️ 뒤로가기 핸들러는 **자기 패널을 먼저 제거한 뒤** 복귀를 호출해야 한다. 순서가 바뀌면 토글 가드(`if (existing) … if (!readOnly) return`)에 걸려 **내 보드가 안 열리고 화면이 텅 빈다**. 깊이 1(스택 자료구조 없음 — 체인은 각 패널 클로저가 자기 backTo를 들고 있어 자연 발생).
- **게임시트 ↔ 보드는 "닫고 backTo로 복귀"가 규칙**: 패널(`--z-profile` 9100) < 게임시트(`--z-sheet` 9500)이라 시트를 연 채 패널을 열면 뒤에 깔린다. **z를 올려 고치지 말 것** — 반대로 "취향보드 → 게임 썸네일 → 게임시트"가 깨진다(그땐 시트가 위에 떠야 함). 상세는 §3 R10c 인용절.



### ✅ 종료: 읽기전용 내 보드 + 취향 연동 + 좋아요 동기화 (2026-07-14~15, Phase A~E 전부 완료 + 실서버 스모크 확인 완료)

`openProfilePanel(autoSubsheet, {userId, readOnly})`로 남의 보드를 편집 없이 통합 표시(취향/모임/기록보드), 좋아요 전역 이벤트 동기화(`cottage-likes-changed`), 진입점 정리(`.sched-bar-name`→모임보드, 그 외 닉네임 클릭→읽기전용 내 보드), 모임보드 밀도 정리(요일배지·✨마크·게임 썸네일·인원조건 표시 등). 상세는 git log(커밋 68e2de4~3d99561) 참조. 알려진 잔여 한계: readOnly 닉네임 미확정으로 "태그된 참여 기록" 일부 미포함(getMyStats nickname=null).

### ✅ 종료: 미보유 게임 기록시트 + 게임평↔플레이기록 연동 (2026-07-14~15, Red, Stage 1·2·3 전부 완료)

미보유 게임도 `openGameRecordSheet`로 열리게 확장(좋아요/게임평/사진/플레이기록), 게임평 저장 후 내 플레이기록 연동 넛지, 남의 세션에 내 후기로 즉시 참여(`_openJoinConfirm`, 확인창 방식). 상세는 git log(커밋 cb07c8c~2666afa) 참조. 남은 실서버 확인 항목: ①미보유/보유 게임 넛지·⋯메뉴→저장 후 게시판에 같은 세션 아래 내 후기 나란히 표시되는지 ②`.sheet-rec-more`(⋯) 메뉴 위치·간격(내 기록 ✏️/✕와 공존). 미착수 후속(§3 이관): 뽁님 7/11 게임평↔호핀 플레이기록 연결.

---

### 론칭 후 이월 (2026-07-09 기준)

모임 개편 완료 후 미착수 또는 기획만 된 항목. 론칭 후 별도 세션에서 진행.

| 항목 | 분류 | 비고 |
|------|------|------|
| 집계 모달 리디자인 | feat | 센터모달 집계 화면 개편. 이식 후보: renderHourlyBreakdown/renderOverlap (git 8cdc4df 직전 club-schedule.html) |
| 내 등록 관리 동선 | feat | Step 1 "등록됨" 칩 클릭 → 해당 날짜 편집 모드 직행. 009 upsert 경로 선확인 필요 |
| 여러 주차 사전 등록 확장 | feat | 현재 Step1 주 네비로 선택 가능하나, 주 단위 복수 예약(사전등록 대량 입력) UX 미완 |
| Hero CTA A/B | design | 버튼 문구·보조 문구·크기 비교 테스트 |
| 관리자 분석 2단계 (데이터) | feat | 요일별 집계, 재방문율, 회원가입/도감 퍼널 신규 이벤트 |
| 관리자 분석 3단계 (연결) | feat | 2단계 데이터를 탭에 연결 + 빈 데이터/로딩/예외 처리 |
| 퍼널 시스템 | feat | PLAN_funnel_analytics.md 기반. DB/이벤트 설계 확정 필요 |
| 게임위치 카테고리 스티키 헤더 | design | 게임위치 바텀시트 내 카테고리 헤더 고정 |
| 소개글 알림 개별 분리 | feat | 카카오/Discord 알림에서 Make 라우터 분기 (코드 외 작업) |
| `played_at NULL` 소급 판단 | data | 기존 4개 게임 NULL 기록 — 정상 데이터인지 보정 대상인지 확인 |
| 취향보드 즉시 갱신 확인 | verify | 게임 추가/삭제 후 홈 카드 미갱신 여부 재확인. ⚠️ **"홈 카드"가 무엇인지 이 기재만으론 확정 불가** (2026-07-17 확인) — §3 「내 보드 카드 요약이 서브시트 편집을 반영 안 함」(내 보드 패널 4카드)과 **같은 건일 가능성이 높으나 근거 없음**. 착수 시 재현부터 해서 같으면 이 행을 삭제할 것. §0 열린 스모크 R2(취향보드 **서브시트 자체**가 새로고침해야 반영)는 **다른 건** |
| 추천게임 전체카드 고정헤더 점검 | verify | 추천 필터 전체화면 모드에서 헤더 sticky 동작 확인 |
| 이번 주 모임 섹션 추가 기획 | feat | 날짜별 미니 막대 상세화, 모임 참여 버튼 연결 (낮은 우선순위) |

---

### 코드 품질 주석 (리팩토링 참고용)

- `kakao-auth.js` 취향보드 이벤트 핸들러: for 루프 + 이벤트 위임 혼용. 추후 서브파일 분리 검토.
- `_buildTasteGameItems` 더보기: 아이템 추가 시 `insertBefore` 처리. 대량 추가 시 재렌더 방식 검토.
- `script.js` `onSheetLike`/`onSheetCurious`: is-active wrap 동기화가 여러 곳에 분산. 리팩토링 시 `_setLikeActive(active)` / `_setCuriousActive(active)` 헬퍼 함수로 통합 권장. (142차-57에서 onSheetLike 단순화 — 확인 토스트 제거)
- `game-reviews.js` `buildGameBody` — 어디서도 호출되지 않는 dead code(2026-07-15 Phase D 검증 중 발견, 실서버 테스트로 게임별 보기가 실제론 게임 카드 그리드만 렌더함을 확인). 삭제 시 회귀 위험 낮음, REFACTOR 세션에서 정리 권장.
- `game-display-adapter.js` `getSearchText` + `searchText` 필드 3곳 — **dead code**(2026-07-17 GDA3 재검증 중 확정, §3 「Phase 1~3 감사 잔여」 참조). 소비처 0건이고 실제 검색은 `title`/`originalTitle` 직접 비교로 돈다. 삭제 대상: 함수 [game-display-adapter.js:325](../assets/js/game-display-adapter.js#L325) + export [:530](../assets/js/game-display-adapter.js#L530) + `searchText:` 3줄([:365](../assets/js/game-display-adapter.js#L365)·[:432](../assets/js/game-display-adapter.js#L432)·[:467](../assets/js/game-display-adapter.js#L467)). **삭제 시 회귀 위험 낮음**(그 3개 함수의 반환 객체에서 필드 하나가 빠질 뿐 — 다만 삭제 전 소비처 0건을 **한 번 더** 확인할 것). REFACTOR 세션에서 GDA5(동일 파싱 3중 실행)와 **같은 파일이므로 함께 처리 권장**.
  - ⚠️ **지금 지우지 않은 이유**: 발견 시점이 BUG FIX 세션이라 CLAUDE.md 「구현/리팩토링 분리」에 따라 등록만. `buildGameBody`와 동일한 처리.
- `play-records-utils.js` `openLightbox` — 부모가 `cottage-close-lightbox`로 닫을 때 game-reviews의 수신부가 `.pr-lightbox`를 **DOM에서 직접 제거**해 `closeLb()`를 안 거침 → `document`의 `keydown`(onKey) 리스너가 해제되지 않고 누적. 현재 사용자 영향은 없음(고아 핸들러가 detached 노드에 `remove()`+중복 postMessage를 쏘는 정도). 정리하려면 iframe 수신부가 노드 제거 대신 닫기 함수를 호출하도록 바꿔야 함. 2026-07-16 발견(버그 수정 중, BUG FIX MODE라 보고만).

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, 다기기 복원)
- [x] 내 보드 패널 — 메인(4카드) + 서브시트(성장/교환권/이용기록/취향보드) + 프로필 영역(대표캐릭터/닉네임/칭호)
- [x] 취향 보드 Phase 1 (142차) — 한줄소개(bio), 좋아하는/해보고싶은 게임(추가/삭제/직접입력/ESC 닫기/이미추가됨 표시), 피하는 유형 태그, 좋아요 토스트→취향보드 직접 진입
  - ~~⚠️ SQL 미실행: Supabase SQL Editor에서 실행 필요~~ → ✅ **실행 완료 확인 (2026-07-16 실측)**: `profiles.bio`·`avoid_tags`·`notif_seen_at` 전부 존재, `game_likes` 44행·`game_curious` 53행, bio/avoid_tags 실데이터 각 2행. **낡은 경고였음**(기능이 운영에서 정상 동작 중인데 경고만 남아 있었음)
  - 게임 시트에 좋아요/궁금해요 유저 아바타 목록 표시 (getGameLikers/getGameCuriousUsers)
- [x] 약식 카드 클릭 → 해당 본문 카드로 위임 (캐릭터/칭호, 132차)
- [x] 인앱 알림 시스템 — 배지 + 패널. 2차 개선(날짜/unread 바/보상카드 강조/명칭 "최근 소식") (130차)

### 게임 기록
- [x] 신규 기록 등록 (다중 게임 행, 날짜/그룹명/참여자/인원/시간/점수/후기)
- [x] 사진 다중 업로드 (최대 5장, 1200px/JPEG 0.85 리사이즈)
- [x] 기존 기록 수정 (인라인 수정폼, 사진 개별 삭제/신규 추가)
- [x] 기록 삭제
- [x] 모임별 보기 (그룹 > 날짜 > 게임) / 게임별 보기 (게임 > 모임/인원 > 날짜)
- [x] 그룹명 / 게임명 / 참여자 이름 자동완성
- [x] 사진 썸네일 표시 (80px, 최대 3장 + +N장 배지, 라이트박스 연동)

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원 1인~9인+, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 게임평, 따봉/궁금해요, 플레이기록, 사진 3섹션)
- [x] 별점 제출/조회 (user_id 기반, 비로그인 세션키 중복 방지)
- [x] 게임평 등록/삭제/수정 (user_id 기반 권한)
- [x] 따봉/궁금해요 토글 + 좋아요/궁금해요한 유저 아바타 목록 표시 (142차-2)

### 업적 / 캐릭터 / 칭호 / 교환권

상세 정의: `docs/achievement-system.md` (SSOT)

- [x] 업적 시스템 — ACH_DEFS 기반 8축 (record/new_game/photo/review/visit/play/first_record/balance)
  - checkAchievements: 기록/별점/방문/함께한 날 트리거 후 자동 체크
  - 달성 → 캐릭터/칭호/교환권 자동 지급. 포인트 비활성화 (UI 숨김, DB/로직 유지)
  - ⚠️ play/balance 카운팅은 player_names 텍스트 기반 — 닉네임 변경/동명이인 오탐 가능. 장기 과제: game_play_participants 테이블
- [x] 캐릭터 — 47종 픽셀아트 PNG, 대표 캐릭터 선택/저장/프로필 표시
- [x] 칭호 — TITLE_DEFS, 대표 칭호 선택, 프로필 표시
- [x] 교환권 시스템 — 전 단계 완료
  - DB: voucher_products/voucher_log (001_vouchers.sql)
  - voucher_log.note + achievement reason CHECK + partial unique index (003_voucher_achievement.sql ← Supabase 실행 완료)
  - grantFirstPlayVoucher (첫 플레이, record_1 경로) / grantAchievementVoucher (업적별, JS + DB 이중 중복방지)
  - 관리자 UI: 전체 지급/사용 로그, 당시 잔액 역산 표시
  - 정책: 계정당 1회 자동 지급, 오너 제외, 승인 없음, 사용 즉시 차감
- [x] 업적 소급 부여 SQL 실행 완료 (002_sogeup_achievements.sql, 129차)

### 어드민
- [x] 게임/간식 요청 관리 — 상태 시스템 (purchase_status/status_date + 상태 피커)
- [x] 건의사항 관리 / 회원 목록 및 차단
- [x] 페이지 분석 대시보드 — 요약 카드, 날짜/주/월 필터, 유입경로, 교차분석

### 인프라
- [x] 방문자 통계 — `__visitor__` 마커 방식 (113차 버그 수정, 118차 filteredPV 중복 제거)
- [x] 채널 귀속 추적 — last-touch 모델, UTM 파라미터, 날짜+source+page dedup
- [x] 추천게임찾기 이벤트 추적 (page_events 테이블)
- [x] 체류 시간 누적 (초 단위, localStorage → DB, 1분마다 heartbeat)
- [x] localStorage 세션 키 통합 (`cottage_sess_{id}` 단일 JSON, 자동 마이그레이션)
- [x] 업로드 전 이미지 리사이즈 (1200px, JPEG 0.85)

---

## 2. 현재 버그

(버그2-b 크로스보드 stale은 **2026-07-17 R10b로 해결·스모크 통과** — §0 참조. **R4 "사진첨부 후 새로고침해야 표시"는 미해결**: R10b 동반 검증 예정이었으나 기록보드가 범위 밖이라 확인 안 됨 → §0 "남은 스모크" 참조)

- [x] ~~**'함께한 시간' 서브시트만 방문 집계 누락**~~ — ✅ **해결** (2026-07-16, 커밋 aaa0b1d, 사용자 지시). `usage` 분기에 `_trackPvOnce('my-board-usage')` 추가. **함께 발견·수정**: `my-board-meeting`·`other-board`는 추적은 되고 있었으나 `page-labels.js`에 **라벨이 없어** 관리자 화면에 slug가 그대로 노출되던 상태(`_pageLabels[r.page] || r.page` 폴백) → 라벨 3개 추가. 코드가 쏘는 가상 페이지 키 9개 ↔ 라벨 전수 대조로 검증. 과거 데이터 소급 불가 = usage/meeting 집계는 이 시점부터 유효.

### 알려진 제한사항

| 항목 | 내용 |
|------|------|
| 관리자/로컬 카운팅 제외 기준 통합 (2026-07-02) | 143차-189에서 localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID=4916417947)는 `page_views`, `page_events`, `page_sessions`, `anon_sessions`, `profiles.visit_count/total_minutes/today_seconds` 누적에서 제외하도록 통합. 관리자 분석 화면도 관리자 user_id가 붙은 rows/pageViews/profiles를 표시 집계에서 제외. 과거에 user_id 없이 쌓인 관리자 추정 page_views는 식별 불가하므로 삭제/소급 보정하지 않음. |
| 방문자 통계 명/회 역전 (2026-07-01) | 143차-190에서 `page_views.session_key` 추가 계획/마이그레이션/코드 반영. 신규 데이터는 `__visitor__` 행 안의 `user_id \|\| session_key`로 명/회를 함께 계산한다. ▶ **2026-07-16 실측 갱신**: `docs/migrations/007_page_views_session_key.sql`은 **운영 DB에 적용 완료**(anon 키로 `page_views.session_key` 조회 성공). 신규 행에도 정상 기록 중(최근 7일 384행 중 NULL 3행 = 99% 채워짐) → **명/회 역전은 신규 데이터 기준 해소**. **잔여**: 과거 legacy 행 1,513/2,171(70%)이 `session_key` NULL이라 그 구간은 여전히 행 단위 fallback 집계(소급 불가). 즉 "적용 전이라 fallback"이라는 기존 기재는 낡았음. |
| 기록보드 플레이기록 시간 | 기록보드에 표시되는 플레이기록 시간이 전부 09:00으로 표시됨. 원인 미확인 |
| 서브시트(취향보드 등) 상단 모서리 음영 (2026-06-30) | 사용자가 스크린샷으로 보고한 모서리 음영 — 시도한 가설 3건 모두 효과 없음: ①`.profile-activity-toggle` 상단 radius 제거, ②`.profile-subsheet-header` radius를 box와 맞춤(overflow:hidden이라 무의미함 확인), ③`.profile-subsheet-header`에 `background:#fff` 추가(외부 GPT 의견, 적용했으나 미해결). 다음 시도 전 확대 스크린샷으로 정확한 형태 확인 필요 |
| 이용시간 기기 중복 | 동일 유저가 여러 기기에서 동시에 사용 시 각 기기 시간이 모두 합산됨. ▶ 작업 항목은 §3 「[통합] 방문/이용 집계 전면 점검」③ (해법 방향·성격 포함) |
| 사진 배열 전체 삭제 | `deletePlayPhoto`는 photo_url = null로 전체 삭제 (개별 URL 삭제 불가) |
| 관리자 페이지 금일이용데이터 | 간헐적 미표시 — 원인 불명, 별도 조사 필요 |
| TITLE_DEFS 미배정 칭호 3개 | `title_record_150` / `title_review_100` / `title_review_500`가 TITLE_DEFS에 정의돼 있으나 ACH_DEFS 어디서도 `rewards.title`로 참조되지 않음. 의도적 예약인지 잔존 버그인지 확인 필요 |
| 단기 방문 시간 미표시 | heartbeat 전 종료 시 `duration_sec=0` → 관리자 분석에서 시간 표시 안 됨. 추적 로직 변경 필요, 별도 작업 (143차-197 이관). ▶ **2026-07-16 실측**: 최근 7일 `page_sessions` 753행 중 **111행(14.7%)**이 `duration_sec=0`. §3 "[통합] 방문/이용 집계 전면 점검" ①번 항목. |
| ~~모바일 "이번주모임 미리보기" 일요일 레이아웃 밀림~~ | ✅ **해결** (2026-07-15, 3차 수정으로 최소화 완료). 원인: `#meetingDays`(`.meeting-day-chip` 7개, `flex-wrap:wrap`)가 좁은 모바일 뷰포트에서 컨테이너 폭을 근소하게 초과 — 투표 인원수 텍스트가 있는 요일 칩만 폭이 넓어져 참여자가 몰린 주(예: 금1·토2·일2)에만 7번째 칩이 다음 줄로 밀림. 1차(gap 6→4, padding 6px10px→6px5px, min-width 36→32) 과다 축소로 사용자 재지적 → 2차(gap 6 복원, padding 6px7px, min-width 34)도 "여전히 필요 이상으로 줄임"이라는 재지적 → **3차: padding만 6px10px→6px9px(각 변 1px), gap·min-width는 원래값(6px/36px) 그대로 유지**로 최소화. 340px 미만은 원래 디자인도 줄바꿈되던 구간이라 그대로 두고, 340px 이상(실사용 전 구간) 줄바꿈 해소 재확인(스크린샷 대조) |
| ~~이번 주 하고싶은 게임에 취소된 테스트 게임 잔존~~ | ✅ **해결** (2026-07-15). 원인: `meeting_vote_games` orphan 행 2개 — id=22(vote_date 2026-07-08), id=36(vote_date 2026-07-17), 둘 다 user_id=4916417947(오너), 대응하는 `meeting_votes` 행 없음(참여 취소됨). `deleteMeetingVote` cascade 삭제(커밋 de89af8, 2026-07-14)가 이후 취소부터만 적용돼 그 이전 생성분(created_at 07-07·07-13)이 소급 정리 안 된 것. 사용자 승인 후 anon 키 DELETE로 두 행 제거, 재조회로 삭제 확인. 코드 변경 없음(향후 신규 취소는 기존 cascade 로직으로 자동 처리됨) |
| ~~플레이기록 수정 시 업적 미반영~~ | ✅ **해결** (2026-07-15). 원인: `recordGamePlay`(신규 등록)만 `checkAchievements`를 호출하고 `updateGamePlay`(수정 — 사진 후추가 8곳 + 인라인 전체수정 포함)는 어디서도 호출 안 함. 사진 추가로 photo 축 임계값을 채워도, 참여자 수정으로 play/balance 축을 채워도 다음 신규 기록 등록 전까지 지급 안 됨. `updateGamePlay`(supabase-client.js)에 `record`/`play`/`balance` 재체크를 추가해 8개 호출처 공통 해결. |
| ~~"이날 참여 등록"/"플래너에서 등록하기"/홈 미리보기 ✎ 닫을 때 플래너 깜빡임~~ | ✅ **해결** (2026-07-16 등록 → 2026-07-18: 1차 실패 → 2차 근본원인 규명+3부분 수정, **사용자 스모크 통과**). 재현 경로: 홈 미리보기 닉네임 옆 **✎**·**+이날 참여 등록**·**+플래너에서 등록하기** → 시간설정 시트 → **✕** 닫을 때. **1차 수정(4ab32d8)이 실패한 이유 = 엉뚱한 레이어를 고침**(iframe `#viewWeek` 토글만 이동). **진짜 원인 2개**(CSS 증거): ①**부모 패널 흰박스 복귀** — `closeModal`이 `is-open`+부모 `is-quick-entry`를 동시 제거하는데 `is-open` 제거는 opacity 0.25s 페이드([style.css:6855](../assets/css/style.css#L6855))라, 그 사이 `is-quick-entry`가 빠져 `.planner-sheet-panel`이 quick-entry 투명·풀스크린([:6869](../assets/css/style.css#L6869))에서 기본 `background:#fff`·480px·슬라이드([:6858](../assets/css/style.css#L6858))로 복귀→흰 박스가 페이드. ②**iframe 크롬 미숨김** — `is-quick-entry`가 `#viewWeek`만 숨겨 브레드크럼·`<h1>모임 플래너</h1>`([club-schedule.html:628](../pages/club/club-schedule.html#L628))가 남아 오버레이 닫을 때 드러남. **2차 3부분 수정**: (a)`close()`는 is-quick-entry 유지·`cottage-reset-week`에서 정리(4ab32d8 유지) (b)CSS `body.is-quick-entry .inner-page{display:none}` — 페이지 전체 숨김, 오버레이만(fixed라 독립) (c)홈 모달 `closeModal`에서 부모 is-quick-entry 제거를 빼고 `openModal`에서 정리 → 닫기 페이드 중 패널이 투명 유지. **⚠️ paint 타이밍이라 시각 확인 필수** — 사용자 스모크 전 종결 금지. 검증: day-detail 편집(공유 CSS)도 함께 확인. §0 열린 스모크 참조. |
| ~~모임일정 삭제 후 재등록 막힘 ("등록됨" 잔류)~~ | ✅ **해결** (2026-07-16 등록 → 2026-07-18 수정·**스모크 통과**, 커밋 644fb90). **근본 원인**: 플래너는 **한 번만 로드돼 재사용되는 iframe**(`preload`가 `preloaded` 플래그로 `frame.src`를 1회만 세팅, 재로드 없음 — [index-page.js:1277](../assets/js/index-page.js#L1277))인데, 홈 "모임 등록"이 보내는 `cottage-reset-week` 수신 시 **메모리 `allVotes`로 렌더만 하고 DB 재조회를 안 했다**. `allVotes`는 `init()` 1회 로드 + 플래너 **안에서** 등록/취소할 때만 로컬 갱신 → **홈 프리뷰 ✕ 등 iframe 밖 삭제를 iframe이 몰라** 재등록 시 stale 기준 "등록됨" 잔류. **왜 다시 문제 아님**: `_loadAllVotes()` 로더 추출 → `cottage-reset-week` 수신 시 재조회하므로 플래너를 다시 열 때마다 최신 상태. 모달/iframe 재사용 원칙 사례. 홈 미리보기 자체 반영(홈 ✕→`_meetingReload`=loadWeek 재조회)도 스모크에서 정상 확인. |

---

## 3. 추후 작업 목록

### P1 — 기능 (중요)

- [x] **관리자 카카오 알림 확장** — 신규 회원 가입(profiles INSERT) + 교환권 사용(voucher_log INSERT) 시 카톡 알림. Supabase DB webhook → Make.com 시나리오 5213346 Router 3개 분기 (140차)
- [x] **업적 8축 순서 재배열** — record→first_record→new_game→play→photo→review→visit→balance (118차)
- [x] **달성 업적 아이콘 컬러 적용** — .is-achieved .profile-ach-img-lock { filter: none } 추가 (118차)
- [x] **업적명·내용·아이콘 불일치 수정** — new_game_10/30/300 🦉→게임이모지, review_5/25/300 🦊→글쓰기이모지 (118차)
- [x] **rare 캐릭터 축 대표 오탐 수정** — _topCharPerAxis에서 rare_ 접두사 캐릭터 제외 (118차)

### P2 — 기능 (선택)

- [x] ~~**[feat] 기록입력 '최신 기록' 버튼 → 최근 세팅 드롭다운 선택**~~ — ✅ **해결·스모크 통과** (2026-07-18). 1번 행 `↑ 최신 기록` 버튼([game-reviews.js:190](../assets/js/game-reviews.js#L190))이 최신 1건만 채우던 것 → **최근 세팅 드롭다운 선택**. (1차 순회 토글은 오버슈트 UX 문제로 폐기.) `_prRecents`(내 기록 최신순 dedup, `(group,count,names)` 시그니처) 목록을 버튼 클릭 시 표시, 항목 클릭 시 그룹·인원·참여자 채움([:276~](../assets/js/game-reviews.js#L276), CSS `.pr-last-record-*` [style.css:7000](../assets/css/style.css#L7000)). 바깥클릭·ESC 닫기. DB 추가조회 0.

- [x] **게임시트 상단 레이아웃 개편** (커밋: 39fe161) — sheet-img-col 제거, sheet-en-title을 sheet-title-block 최상단으로 이동, 버튼 한 줄 배치([꽂혀있는 책장 보기][룰영상 보기]), 헤더 썸네일 클릭 시 _openCoverModal() 표지 확대 모달.

---

- [x] ~~[기술부채] 오늘 이벤트 수 집계 날짜 비교~~ — ✅ **해결** (2026-07-15). `initHeroStats`가 `created_at`(UTC)의 `slice(0,10)`을 KST 오늘 날짜와 직접 비교해 KST 00~09시 이벤트가 UTC 전날로 잘려 누락되던 것을, `kstDateStr`(created_at을 +9h 변환 후 slice) 헬퍼로 양쪽 모두 KST 기준 비교하도록 수정. node로 KST 경계(00:30/08:30/23:30/내일/어제/null) 7케이스 검증 통과. 관련 파일: `assets/js/index-page.js`.

- [ ] **[PC 리팩토링] 타인 보드 내부 네비게이션 통일** — 모임보드→취향보드 등 전환이 바텀시트로 뜸. 내 보드와 동일한 센터모달 + 고정 헤더 + 뒤로가기로 통일.
  - ⚠️ **R10c(3-1·3-2)와 별개 이슈로 남아 있음** — R10c가 만든 건 **패널 레벨 뒤로가기**(backTo)이고, 이 항목은 **남의 보드 안에서 서브시트를 전환할 때 바텀시트로 뜨는 표현** 문제라 그대로 열려 있다. 착수 시 R10c의 `backTo`를 재사용할 수 있는지 먼저 검토할 것.
  - [x] ~~**3-1 알림 → 남의 보드 복귀**~~ — ✅ **완료·스모크 통과** (2026-07-17 R10c, 커밋 ade71df).
  - [x] ~~**3-2 게임시트 → 취향보드 복귀**~~ — ✅ **완료·스모크 통과** (2026-07-17 R10c, 커밋 9593237).

> **R10c ✅ 전부 완료 (2026-07-17, 스모크 통과)** — 뒤로가기 2경로 + 회귀 + 후속 5건 전부 확인. 아래는 **다시 건드릴 때 필요한 판단만** 남긴 것.
> - 📌 **z-index를 올려 고치려 하지 말 것 (e886af1)**: `--z-profile`(9100)·`--z-subsheet`(9200) < `--z-sheet`(9500)은 **의도된 순서**다 — 취향보드에서 게임 썸네일을 누르면 게임시트가 패널 **위에** 떠야 한다(박스모달이 z 9700>9500이라 `close()` 먼저 하는 것도 같은 이유). 패널을 9500 위로 올리면 그쪽이 깨진다. 그래서 **게임시트 → 보드 경로는 전부 "시트를 닫고 `backTo`로 복귀"**로 통일했다(닉네임/아바타 4곳).
> - 📌 **`.no-anim`은 복귀에만**(5838e1b): 시트가 `display:none↔block`이라 켤 때마다 `sheetUp`이 재생된다. 새로 여는 경로는 올라와야 정상.
> - 📌 **햄버거 깜빡임의 근본**(5838e1b): script-nav.js의 "메뉴 밖 클릭 시 닫기"가 보드 ✕ 클릭을 메뉴 밖으로 오인 → 닫힘. `_restoreMenuExpanded`의 30ms는 그 뒤에 다시 여는 **우회책**이었다(= 그 함수가 "무조건 add"였던 이유). 이제 보드 클릭을 제외해 애초에 안 닫힌다. **그 우회책 함수는 2026-07-18 완전 no-op으로 확인돼 제거됨**(위 §3 종결 항목).
> - **알려진 차이**: 기록시트(`openGameRecordSheet`)에서 닉네임을 누르면 복귀 대상이 기록시트가 아니라 **게임시트** — 둘 다 `_currentSheetGameKey`를 쓰기 때문. 무해로 판단. 거슬리면 `backTo.type` 분화.
> - **트레이드오프**: 알림 복귀 시 목록은 DB 재조회 → 읽음 상태는 유지되나 **스크롤은 상단으로 리셋**(사용자 인지·승인).
- [x] ~~**[리팩토링] `_restoreMenuExpanded` 제거 검토**~~ — ✅ **2026-07-18 종결·제거 완료**. 검토 결과 **모든 경로에서 완전 no-op**으로 확인돼 함수+호출 3곳+죽은 `_menuWasOpen` 제거. **커밋 메시지가 걱정한 "loginBtn is-expanded 얽힘"은 과다 우려였음**: `is-expanded`(및 `menu.active`)를 제거하는 유일한 함수 `resetMenuGroups`의 호출처가 **오직 햄버거 토글(script-nav.js:275)** 하나뿐이고, 스크롤 핸들러 `refreshMenuActive`는 loginBtn을 안 건드린다 → 보드가 풀스크린 오버레이라 그 뒤 햄버거 탭이 불가능해 보드 열린 동안 두 클래스가 절대 안 빠짐 → ✕ 때 `add`는 이미 붙은 클래스에 대한 no-op. 오히려 30ms 타이머의 잠재 레이스가 사라져 더 안전.
- [x] ~~**[Yellow] 이날모임 상세 — 참여자 닉네임·게임 클릭해서 열기**~~ — ✅ **완료·스모크 통과** (2026-07-17, 커밋 d7a0a88·8957e8b·83b8df4·fd928c1).
  - **무엇을 한 건가** (나중에 읽고 알아볼 수 있게 — "진입점 2건" 같은 압축 표기는 6개월 뒤 아무 의미 없다): 홈 "이번주 모임 미리보기" 카드나 모임 플래너(club-schedule)의 **"자세히"를 누르면 그 날짜의 모임 상세 모달**이 뜬다(`day-detail.js` `openDateMeetingModal`). 그 안엔 참여자별로 [닉네임 / 참여 시간 / 하고싶은 게임·배우고싶은 게임 목록]이 나온다. **거기서 ①닉네임을 누르면 그 사람 모임보드가 열리고, ②게임을 누르면 그 게임 정보시트가 열리게** 한 것. 사용자 요청.
  - **구현**: 닉네임 = `.dd-nick-link`+`data-uid` → `openOtherMeetingSheet`(Phase D 규칙: 모임 참여자는 모임보드 직행). 게임 = 썸네일+이름을 `.dd-game-hit` span으로 감싸고 `data-game-id` → **`getGameKeyById`로 변환 후** `openGameSheet`. **둘 다 모달을 닫지 않고 위에 겹쳐 띄운다.**
  - **스모크 ✅ 전부 통과** (2026-07-17 사용자 확인): 닉네임→보드→✕/배경클릭으로 닫으면 모달 복귀 / 게임→정보시트→닫으면 복귀 / 직접입력 게임 무반응 / club-schedule 경로 / 썸네일·이름에서만 반응(인원조건 태그 무반응). **클릭 범위는 2회 반려 후 통과.**
  - **클릭 범위**: **썸네일+이름만.** 인원조건 태그(`(베스트 4인)`)는 게임 이름이 아니므로 **제외**. 썸네일이 13px라 터치 타겟에 미달해 이름까지 묶은 것이지 "행"이 단위가 아니다. ⚠️ 처음에 `<li>` 전체에 줬다가 빈 공간이, `fit-content`로 고쳤더니 인원조건 태그가 눌려 **2회 반려**. → **교훈: "행 전체"는 클릭 범위 명세로 부정확하다. 무엇이 눌리면 안 되는지까지 정하고 시작할 것.**
  - ⚠️ **착수 메모 3건 중 2건이 틀렸다** — 219행 e2bfefb 교훈("동기화 경로를 문서 메모로 믿지 말 것")과 **같은 뿌리이고 또 맞았다**:
    - ① "`.sched-bar-name[data-uid]` 패턴이 이미 있으니 확인만" → **틀림**. 그건 `buildBarsInCard`(막대) 것이고 이 모달은 `_buildParticipantsHtml`이 그리는 **별도 마크업**이라 uid도 핸들러도 없었다.
    - ② "z-index 확인 선행(박스모달 9700 > 게임시트 9500)" → **무관한 모달 얘기였음**. `.dd-overlay`는 9200이라 게임시트(9500)가 이미 위였다.
    - ③ **가장 위험 — "썸네일은 `openGameSheet?.(gid)`"를 그대로 썼으면 12건 전부 깨졌다**: 그 패턴이 통하는 박스모달은 `game_likes`(**슬러그**)를 읽지만 이 모달은 `meeting_vote_games.game_id`(**BGG ID**)를 읽는다. `openGameSheet`는 `gameData[key]`(슬러그) 조회 후 **미스 시 에러 없이 `openGameRecordSheet`로 폴백**하므로 엉뚱한 기록시트가 조용히 열린다. → `getGameKeyById` 변환 필수. **실측**(HTTP 200): `meeting_vote_games` 16행 중 game_id 보유 12행이 **전부 BGG ID**(슬러그 0), 변환 시 12/12 성공·음성 대조군으로 폴백 재현 확인.
  - ⚠️⚠️ **가장 큰 교훈 — "닫고 전환"과 "겹쳐 쌓기"를 혼동했다** (사용자 지적으로 발견): 보드(9100)가 모달(9200) 아래라 처음엔 **모달을 닫고 보드를 열었다** → 사용자가 보드를 닫자 **돌아갈 화면이 사라졌다**. 이어서 R10c의 `backTo`(뒤로가기 버튼)를 끌어오려 했으나 **그것도 오답**이었다. 사용자 지적대로 이건 패널→패널 **전환**이 아니라 모달 위에 보드가 **겹쳐 뜨는** 것이고, 그러면 닫았을 때 아래가 그대로 있는 게 당연하다. **해법은 복귀 장치가 아니라 레이어 순서** → `.dd-overlay--under-board`(9050)로 이 모달만 보드 아래로 내리고 닫지 않는다. **판단 기준: 사용자가 "닫으면 원래 화면이 있어야지"라고 느끼는 관계면 전환이 아니라 레이어다.**
    - 📌 **`.dd-overlay` 기본값(9200)은 낮추지 말 것** — `openDatePreviewModal`은 모임보드 서브시트(9200) **안에서** 열려([kakao-auth.js:1565](../assets/js/kakao-auth.js#L1565)) 낮추면 뒤에 깔린다. 그래서 **이 모달에만** 클래스를 준 것. 9050은 헤더(1000)·게임시트(9500)·플래너(`--z-shelf` 9600) 전부와 무관함을 확인.
    - 📌 **CSS 선언 순서**: `.dd-overlay--under-board`는 `.dd-overlay`와 우선순위가 같아 **뒤에 와야** 이긴다(실제로 앞에 뒀다가 발견).
  - ⚠️ **검사기 오판 1건 — "배경 클릭으로 보드 닫기는 기능이 없다"고 문서·커밋 메시지에 적었으나 새빨간 거짓이었다**(사용자가 "동작하는데?"로 반박). 실제로는 [kakao-auth.js:1717](../assets/js/kakao-auth.js#L1717)에 **있다** — 내가 본 1716행(✕) **바로 다음 줄**인데 grep을 좁게 걸고 `head -8`로 잘라놓고 "핸들러 0건 = 기능 없음"이라 단정했다. **CLAUDE.md 「0건이면 검사기를 먼저 의심」의 정확한 재발** — 사용자의 실사용 경험과 충돌했으면 코드를 다시 봤어야 했다. **"없다"는 결론은 "있다"보다 훨씬 강한 주장이고 grep 한 번으로 낼 수 없다.**
  - **알려진 엣지케이스**(기존 구조, 미수정): 이 모달과 `openDatePreviewModal`이 **같은 `__ddModal` id**를 쓴다 → 이날모임 상세 → 닉네임 → 남의 모임보드 → 거기서 "자세히"를 열면 원래 모달이 제거된다(보드를 닫으면 preview 모달이 대신 남음). 빈도 낮다고 판단해 보고만.
- [ ] **[검토] 모임보드 취향 박스모달에서 게임을 누르면 박스모달이 닫힌다** (2026-07-17 등록 — CLAUDE.md 「모달/iframe 재사용 원칙 6: 닫고 전환 vs 겹쳐 쌓기」를 새로 추가하면서 한 **소급 위반 확인**의 결과. 미착수) — [kakao-auth.js:1455](../assets/js/kakao-auth.js#L1455)가 `close(); ensureGameSheet(); openGameSheet(gid)` 형태다. 박스모달(`--z-sheet-modal` 9700) > 게임시트(9500)라 **닫지 않으면 시트가 뒤에 깔리기 때문**에 그렇게 짠 것 → 그 결과 **게임시트를 닫아도 박스모달로 돌아오지 않는다**. 이날모임 상세에서 나온 것과 **같은 종류의 불만**이 나올 수 있는 자리.
  - **착수 시 확인 순서**: ①박스모달이 9700인 이유 = 모임보드 서브시트(9200) 위에 떠야 함 → **9200 < x < 9500**(예: 9300)으로 내리면 레이어로 풀리는지 ②`.mb-add-overlay`는 공유 클래스이므로 **다른 호출부가 "무엇 안에서" 열리는지 먼저 grep**(규칙 6의 `.dd-overlay` 사례와 동일 함정) ③그 자리 `gid`는 `game_likes` **슬러그**라 `getGameKeyById` 변환은 불필요(이날모임 건과 다름 — 혼동 주의).
  - **급하지 않음**: 현재 사용자 불만 보고 없음. 규칙상 **등록이 목적**이고 즉시 수정 대상 아님.
- [ ] **[문서-코드 불일치] `squirrel_lv5` 캐릭터 파일 미제작인데 경고가 없음** (Phase 1 감사 A1, 2026-07-02 발견 → **처리 현황 표에 등재된 적 없는 고아 항목**, 2026-07-17 REFACTOR_CHECKPOINT 압축 검토 중 재발견·실측 확인) — 실재하는 lv5 파일은 `bear_lv5`·`hamster_lv5`·`rabbit_lv5` **3개뿐**. `sparrow_lv5`(visit_500)는 [achievement-system.md](achievement-system.md) 234·271행에 **⚠️미완성으로 명시**돼 있으나, **`squirrel_lv5`(record_400)는 167행에 아무 경고 없이 정상 보상처럼 적혀 있고 271행 미완성 목록에도 없음**. → record_400 달성자가 나오면 **깨진 이미지**가 뜬다(sparrow와 달리 아무도 모르는 상태). 조치: ①파일 제작 or ②171행/271행에 미완성 표기 추가. **record_400은 먼 임계값이라 급하진 않으나, 달성 후엔 사용자 자산(캐릭터) 영역이라 사후 대응이 어렵다.**
- [ ] **[문서] 캐릭터 이미지 경로 체계(`rare/` 서브폴더) 문서 미반영** (Phase 1 감사 A2·A3, 위와 같은 고아 항목) — `achievements.js`의 `_charImgPath()`가 `rare_*`·`season_*`·`cottage_master`를 `characters_basic/rare/` 서브폴더로 라우팅하는데(실측: `assets/images/characters/characters_basic/rare/cottage_master.png` 존재), **SSOT인 [achievement-system.md](achievement-system.md)에 경로 체계 설명이 아예 없음**. 신규 캐릭터 추가 시 어느 폴더에 둘지 문서만 보고는 알 수 없음.
- [x] ~~**[Yellow] 모임보드 취향 박스모달에 게임 삭제(✕) 추가**~~ — ✅ **완료·스모크 통과** (2026-07-17, 커밋 e2bfefb). 확답 3건대로: confirm 띄움 / readOnly 숨김(`_ro()`) / 룰 배지는 표시 전용 유지. CSS 변경 없음(`.taste-game-del` 전역 선택자 재사용). `data-custom-name`을 함께 추가 — 직접입력 게임은 식별 속성이 없어 삭제 자체가 불가능했음.
  - ⚠️ **여기서 얻은 교훈 — "이벤트를 쐈으니 동기화됐겠지"가 이 코드베이스에선 안 통한다**: 이 항목의 옛 메모는 "splice + `_emitLikesChanged` 둘이면 stale이 안 되살아난다"고 적었으나 **틀렸다**. `_emitLikesChanged`([1616](../assets/js/kakao-auth.js#L1616))는 이벤트를 dispatch할 뿐이고, 그걸 듣는 취향보드 리스너([869~](../assets/js/kakao-auth.js#L869))는 앵커 `#tastelikedList`가 **모임보드엔 없어 스스로 해제**된다 → 모임보드의 `_likedSlugSet`/`_curiousSlugSet`은 **아무도 안 고친다**. 삭제 시 `.delete()`를 직접 해야 이번 주 리스트의 ❤️/👀 마커가 안 남는다(추가 경로 `onAdd`가 `.add`를 직접 하는 이유도 이것). **동기화 경로를 문서 메모로 믿지 말고 리스너의 앵커가 그 화면에 실재하는지 확인할 것.**
- [x] ~~**[Yellow] 검색 모달 "추가됨" 항목 재클릭 = 취소**~~ — ✅ **완료·스모크 통과** (2026-07-17 사용자 제안·확인, 커밋 9d8d06f[refactor]·0db1f03[feat]).
  - **왜 했나**: 기존엔 이미 추가된 항목을 누르면 `addGame`의 `inList` 가드([496 부근](../assets/js/kakao-auth.js#L496))에 걸려 **아무 일도 안 일어났다**(버튼인데 죽은 클릭). 취향보드·모임보드 취향박스 양쪽 동시 적용(`_openGameAddSearchModal` 공유).
  - **설계 결정 2건**: ①**토글 대상은 `is-added` 붙은 항목만** — "+ 직접 추가"·직접입력 제안은 라벨이 없어 추가 전용으로 남긴다(그 버튼이 삭제로 동작하면 최악). ②**confirm 없음** — 토글은 되돌리기가 대칭이라(한 번 더 누르면 재추가) 복구가 싸다. 리스트 ✕의 confirm은 거기선 복구에 재검색이 필요해서지, 두 자리의 안전장치 차이는 이 비대칭에서 나온다.
  - **선행 리팩토링(9d8d06f, 동작 무변경)**: `_removeTasteChip`(=`_appendTasteChip`의 역) / `_removeBoxGame` 추출 / `_setAddedState`로 "추가됨" 라벨 갱신을 모달 내부로 이동(`onAdd` 시그니처에서 `resultsEl` 제거).
  - **스모크 포인트**: ①취향보드 ＋추가 → 검색 → "추가됨" 항목 클릭 → 라벨·목록에서 사라짐 ②한 번 더 클릭 → 재추가(대칭 복구) ③모임보드 박스모달 ＋게임 추가에서도 동일 ④박스모달 토글 취소 시 뒤 이번주 리스트 마커도 갱신 ⑤"+ 직접 추가"는 여전히 추가로만 동작 ⑥토글로 지운 뒤 모달 닫으면 리스트에도 반영.
- [ ] **[버그] 내 보드 카드 요약이 서브시트 편집을 반영 안 함** (2026-07-17 R10b에서 범위 밖으로 분리, 사용자 승인) — 취향보드에서 게임을 추가하고 뒤로 나오면 카드엔 "❤️ 좋아하는 게임 3개"인데 들어가면 4개. `_tasteCardSummaryHtml` 등 카드 요약 6종이 **패널 오픈 시 1회** 빌드되기 때문. **R10b가 만든 문제가 아니고 그 전부터 그랬음**(패널을 닫았다 열면 맞는 값).
  - **R10b에 안 넣은 이유**: 해법 방향이 반대다. 서브시트는 **pull**(진입 시 재조회)로 풀리지만 카드는 이미 그려져 있어 **push**(나갈 때 갱신)가 필요 → R10b가 방금 지운 `onLeave` 콜백을 다른 용도로 되살리거나, 방향 A를 패널 레벨로 확장해야 함. 한 세션에 섞으면 설계가 흐려짐.
  - ⚠️ **R10b로 상대적 체감은 커졌을 수 있음** — 서브시트가 항상 최신이 되면서 카드만 옛날 값인 게 눈에 띔.
  - 참고: bio 저장 경로([kakao-auth.js:738](../assets/js/kakao-auth.js#L738) 부근)는 **이미 카드 요약을 직접 갱신**하는 push 코드가 있음 — 착수 시 그 패턴을 일반화할지 검토.
  - 🔗 **같은 건일 수 있는 다른 기재 2곳** (2026-07-17 교차 확인) — 착수 시 재현으로 판별해 중복이면 정리할 것: ①「론칭 후 이월」 **"취향보드 즉시 갱신 확인"**("홈 카드" 미갱신 — 그 "홈 카드"가 여기 말하는 내 보드 4카드일 가능성 높음) ②§0 열린 스모크 **R2**(취향보드 서브시트 자체가 새로고침해야 반영 — **이건 다른 건으로 보임**. R10b로 해소됐을 가능성 높아 확인만 하면 닫힘).
- [x] ~~**[기술부채] 감지기 갭 — `Promise.all` + 비구조분해 결과는 2단계가 통째로 지나쳤다**~~ (2026-07-17 R10b 중 발견) — ✅ **2026-07-18 완료** (`supabase-client.js` 5개 지점 error 수신 추가). 2단계는 `const { data, error } = await`(구조분해) 형태 59곳을 고쳤는데, **`const [aRes, bRes] = await Promise.all([...])` 후 `aRes.data`만 읽는 형태는 대상이 아니었다**. 이 자리들은 `.error`를 아무도 안 봐서 **컬럼 오타·RLS 차단이 여전히 조용히 빈 값**이 됐었다(`catch`도 안 울림).
  - **착수 시 재측정 결과 — 기록된 목록이 또 틀렸다**(§3 3단계 「위반 N곳 믿지 말 것」 경고의 세 번째 실증): `await Promise.all` 전수 grep = 6지점. `getMeetingProfile`(R10b 기존 처리)을 뺀 **5지점**이 대상이었고, 기존 기록은 이 중 **2개를 통째로 누락**했다 — ①`getCustomPrefSuggestions`(749, l·c) 목록에 없었음 ②`getMyNotifications` 중첩(1405, recentComments·playRecords) 별도 지점인데 없었음. `getMyStats`도 5개로 적혔으나 실제 6개(`profile` 누락).
  - **처리 지점(전부 순수 로그 추가, 반환 무변경)**: `getCustomPrefSuggestions`(l·c) · `getVisitorStats`(totalRes·todayRes) · `getMyStats`(playRes·commentRes·suggestRes·profile·reviewRes·taggedRes) · `getMyNotifications` 바깥(taggedRes·curiousRes·purchasedRes·newGameRes·introListRes·profileSeenRes·voucherEventsRes) · `getMyNotifications` 중첩(rcErr·prErr). 라벨은 `[함수명:테이블명]`. `taggedRes`·`voucherEventsRes`는 조건부 `Promise.resolve`라 `.error` 없음(정상 falsy).
  - ✅ `getMeetingProfile`(profileRes·introRes)은 R10b가 선처리 완료(커밋 507f2e9).
  - **이게 왜 중요했나**: `getMyStats`·`getMyNotifications`는 **내 보드의 핵심 조회**다. 2026-07-17 "화재 테스트 불난 곳 0건"은 이 두 함수에 관한 한 감지 능력이 없는 상태의 결과였음 → 이제 `supabase-client.js`의 Promise.all 갭은 닫혔다.
  - **✅ 파일 커버리지 (2026-07-18 갱신)**: `game-sheet.js`의 `.catch()` 7곳은 처리 완료(init 함수 JS 예외 로그), `achievements.js`는 래퍼라 "대상 아님" 재분류 → 아래 「감지기 3단계」 종결. **당초 "호출부 구조 변경 필요" 전제는 오판이었음**(남은 자리가 raw supabase가 아니었다).
- [ ] **[기술부채] Phase 1~3 감사 잔여 항목** (2026-06-20~07-15 감사분 → 2026-07-17 `REFACTOR_CHECKPOINT.md` 압축 시 이관. **그 문서에서 감사 상세는 삭제됐으므로 여기가 유일한 기록**) — R1~R12로 처리되지 않고 남은 P2 위주 항목. ⚠️ **전부 "감사 시점 기록"이라 착수 전 재검증 필수** — 감사 이후 코드가 바뀌어 stale이 된 전례가 많다(GDA2·SC1·SC4는 재검증해 보니 **이미 해소돼 있었음**).
  - **2026-07-17 실측으로 닫은 것**: ✅ **GR4 종결** — `isParticipant`/`score_note` 중복의 짝이던 `buildGameBody`가 R1에서 삭제돼 **중복 자체가 소멸**. ✅ **PS2 종결** — scripts/ 폴더 항목이 [PROJECT_STRUCTURE §1](PROJECT_STRUCTURE.md)에 이미 기재됨.
  - **2026-07-17 실측으로 축소된 것(저가치, 굳이 안 해도 됨)**: 🟡 **SC7** — `_OWNER_ID` 3중복 → `supabase-client.js`엔 **1곳뿐**([1784](../assets/js/supabase-client.js#L1784)), `kakao-auth.js`의 `OWNER_KAKAO_ID`와 크로스파일 중복만 잔존. 🟡 **KA7** — R3가 `_safeInt` regex 파싱을 없애 **취약성은 해소**됐고 하드코딩 fallback(`?? 47`·`?? 641`·`?? 96`, [kakao-auth.js:2027~2033](../assets/js/kakao-auth.js#L2027))만 남음. 정상 경로는 build 함수가 반환하는 실제 total을 쓰므로 이 숫자는 **함수가 실패할 때만** 노출된다(= 캐릭터가 47종을 넘어도 평소엔 안 틀림).
  - **2026-07-17 실측으로 닫은 것 (추가)**: ✅ **GDA3 종결 — 오탐이었음**. 기존 기재("`getSearchText`의 이중 집계로 **검색 가중치 2배**, 이 목록에서 **유일하게 실동작 영향 가능**")는 **틀렸다**. 이중 집계 자체는 실재하나([game-display-adapter.js:330~333](../assets/js/game-display-adapter.js#L330)이 `getDisplayTags`를 펼친 뒤 mood/play/relationship을 또 펼침 — `getDisplayTags`의 fallback 분기가 이미 그 셋을 포함) **실동작 영향은 0**:
    - ① **`searchText`는 아무도 읽지 않는다** — 생산 3곳([:365](../assets/js/game-display-adapter.js#L365)·[:432](../assets/js/game-display-adapter.js#L432)·[:467](../assets/js/game-display-adapter.js#L467))뿐이고 저장소 전체(js 외 파일 포함) 소비처 **0건**. 동적 접근(`GameView[...]`·`Object.values`)도 없음.
    - ② 실제 검색은 `matchOwnedSearch`([owned-games-page.js:106](../assets/js/owned-games-page.js#L106))가 `detail.title`/`detail.originalTitle`만 비교. 네비 검색([script-nav.js:664](../assets/js/script-nav.js#L664))도 동일.
    - ③ 설령 읽혔어도 `join(" ")` 문자열에 `includes`를 거는 구조라 **"가중치"라는 개념이 성립하지 않는다** — 중복 토큰은 `includes` 결과를 바꾸지 못함.
    - **⚠️ 교훈**: 감사가 코드 구조만 보고 **소비처를 확인하지 않은 채 영향을 추정**했고, 그 추정이 §0 우선순위 2번("유일한 버그성")까지 올라와 있었다. → **이제 이 목록에 "실동작 영향 가능" 항목은 0개**다. 실체는 dead code이므로 「코드 품질 주석」에 등록(삭제는 REFACTOR 세션).
  - **2026-07-17 실측으로 유효 확인**: **PS1** — `package.json`에 npm 스크립트 8개(`check`/`build:master`/`translate*`/`build`)가 있는데 [PROJECT_STRUCTURE §8](PROJECT_STRUCTURE.md)은 `node …` 직접 경로만 기재.
  - **미검증(감사 시점 기록 그대로, 전부 P2 구조 지적)**: PU5(play-records-utils 헤더 주석이 전역 8개 중 3개만 기재) · PU6(`attachAc` 61줄·`openLightbox` 56줄 과대) · PU7(`initTagInput`이 `split(',')`이라 **쉼표 포함 참여자 이름 불가** — 미문서화 제약) · GDA4(`window.COTTAGE_GAMES` 즉시 생성 = 로드 순서 의존) · GDA5(`getGameCardData`/`getGameDetailData`/`getRecommendData`가 동일 파싱을 각자 실행) · ACH2(`checkAchievements` 175줄 등 과대함수 4개) · GR5(자동완성 `onSelect`→Enter 디스패치 2중 구현) · GR7(`KeyboardEvent` 디스패치로 `initTagInput` 간접 트리거 = 깨지기 쉬운 결합) · SC6(`redeemVoucher` TOCTOU — 잔액확인↔insert 사이 race, 단일 사용자 패턴상 현실 위험 낮음) · SC8(`window.CottageDB={…}` 뒤에 함수 절반이 정의 = 호이스팅 의존, 실제 버그 없음) · CSS4(style.css 7395줄 단일 파일) · S1(PROJECT_STATE의 134~135차 session_key 내러티브 혼란 — 그 기록이 슬림화로 이미 사라졌을 수 있음).
  - **여기 넣지 말 것(이미 다른 곳에 등록됨)**: A1·A2·A3 → 위 `squirrel_lv5`·`rare/` 경로 항목 / A4 → §2 「TITLE_DEFS 미배정 칭호 3개」 / PU4·ACH6 → escH 5사본 = GS5 / GS4·GS5·GS7·DD4·IP1~3 → `REFACTOR_CHECKPOINT.md` 「잔여 미배정 항목」.
- [ ] **[검토] 기록보드 타인 공개** — 요약(플레이 수·게임평)만 부분 공개 또는 본인 설정 온오프. 함께한 시간은 비공개 유지 확정.
- [ ] **[디자인] 모임보드 개선** — 미입력 필드 노출 방식, 일정 막대 정보 밀도, 하고 싶은 게임 0개 빈 상태.
  - ⚠️ **착수 전 필독 — 아래는 "의도된 설계"이므로 버그로 오해해 고치지 말 것** (2026-07-09 확정 사양, 2026-07-17 `MEETING_REVAMP_CHECKPOINT.md` 삭제 시 흡수. 구현은 완료돼 있고 **코드가 진실**):
  - **대표 게임(⭐) 정렬이 뷰마다 다른 건 정상**: 개인 막대는 `⭐ 우선(타입 무관)→want→learn`(개인 강조 뷰), 집계(태그줄·센터모달)는 `투표수 먼저 → 대표수 2차`(그룹 합의 뷰). **뷰어와 목적이 달라 비대칭이 정상.** 통일하려 들면 설계가 깨짐.
  - **역할 분리**: 막대 = "누가/언제", 태그줄 = "무엇을". 막대 2줄(1줄 시간, 2줄 게임 약칭)은 이 분리의 산물. 센터모달의 성격은 "그날의 결정 도우미"(게임 기준 집계 상단, 개인별 목록 하단 접힘).
  - **모임보드는 "표시" 뷰**: 상시선호(`meeting_game_prefs`) + 이번주 일정/게임(`meeting_votes`/`meeting_vote_games`)을 합쳐 보여줄 뿐, **저장은 분리 유지**.
  - **대표 게임(⭐) 범위**: want+learn 모두 가능, 유저+날짜 단위 합산 **최대 2개**.
  - ※ 문서 사양이 코드보다 낡았던 사례: 사양엔 "시간축 10~22 / 약칭 최대 2개"였으나 실제 코드는 `MIN_H=9, MAX_H=23` + 막대 길이 적응형(6h↑ 4개·4h↑ 3개·그 외 2개). [day-detail.js:1113](../assets/js/day-detail.js#L1113) `buildBarsInCard` 참조.
- [x] ~~게임평→캐릭터/업적 미반영~~ (A-7, 2026-07-12) — ✅ **해결** (2026-07-15). 원인: 지급 로직(`checkAchievements('review')`→`getUserCommentCount`)은 정상이었으나, 진행도 표시 4곳(achievements.js COUNTS)이 `review` 축에 `ratingCount`(별점 수)를 쓰고 있어 게임평을 써도 진행도가 안 오르는 것처럼 보였음(해금 자체는 DB 업적 기준이라 실제론 됐음). `_fetchUserStats`의 `getUserRatingCount`→`getUserCommentCount` 교체, `ratingCount`→`commentCount` 리네이밍으로 표시를 지급 기준과 통일.
- [ ] **[verify] 오늘 고친 업적 버그 2건 실서버 확인** (2026-07-15) — ①게임평 진행도(커밋 22488d7): 게임평 쓰고 성장보드에서 review 진행도(게임평 N개 기준)가 오르는지 ②플레이기록 수정 후 업적(커밋 7a1b68d): 기존 기록에 사진 후추가/참여자 수정으로 photo·play·balance 임계값 채웠을 때 즉시 업적 뜨는지. 브라우저 눈 확인만 남음.
- [ ] **지난 일정 흐리게+수정불가** (A-10) — 모임보드/플래너에서 지난 날짜 일정 흐리게 + 편집 차단. (2026-07-16 추가) 메인 "이번주 모임 미리보기"의 "플래너에서 등록하기"/"이날 참여 등록" 버튼도 대상 — 지난 날짜는 클릭해도 무반응(`club-schedule.html`의 `ds >= toDateStr(TODAY)` 체크로 무시됨)인데 흐림 처리가 없어 비활성 상태를 알 수 없음. 관련: `assets/js/index-page.js` renderPreview/empty-state 렌더.
  - ⚠️ **확정된 `is-past` 원칙과 위 제목이 어긋남 — 착수 전 확인 필요** (2026-07-09 확정, 2026-07-17 `MEETING_REVAMP_CHECKPOINT.md` 삭제 시 흡수): **홈·플래너 공통으로 `opacity` 시각 처리만 하고 `pointer-events:none` 차단은 하지 않는다.** 클릭 → 보기(막대·겹침·상세)는 **허용**하고, **등록 행동만 JS 레벨에서 차단**한다(홈 날짜 칩은 클릭 허용해 모달 조회, 플래너 `renderMyVote`는 과거 날짜면 등록/수정/취소 버튼을 숨기고 읽기 전용 표시, 멀티스텝 Step1 날짜 칩은 기존 `disabled` 유지). 즉 "수정불가"는 맞지만 **"클릭 차단"으로 구현하면 확정 사양 위반** — 지난 모임도 내용은 볼 수 있어야 함.
- [ ] **캡션 복사 인스타/단톡 분리** (A-8) — 사진 캡션 복사를 인스타용/단톡용 포맷 분리.
- [ ] **접근성 개선** — 아이콘 버튼 title/aria-label, 폼 label 부여 (DevTools Issues 기준).
- [ ] **[보류] 한줄소개 GPT 연동** — 이전 기획 복원 불가, 사용자 재공유 필요.
- [ ] **[보류] 취향보드 Phase 2 (성향 5축)** — Phase 1 테스트 후 진행.
- [ ] **[보류] 모임플래너 참여자 UI 추가 개선** — 방향 논의 필요 (현재: 이름 클릭→프로필 시트).
- [ ] **뽁님 7/11 게임평 ↔ 호핀 플레이기록 연결** (2026-07-15 요청, 미착수) — 뽁님의 7/11 레비아탄와일드·원더랜드워-풀확 게임평(game_key만 정정 이동됨, 플레이기록 미연동)을 호핀이 작성한 7/11 플레이기록과 연결. "남의 세션에 내 후기로 참여"(Stage 3, `_openJoinConfirm`) 기능으로 커버 가능해 보이나 실행 주체(뽁님 직접 UI vs 운영자 DB 처리) 미확정 — 착수 전 확인 필요.

- [x] ~~**메인 최근 플레이 미리보기 클릭 비활성**~~ — ✅ **해결·스모크 통과** (2026-07-16 기록 → 2026-07-18 수정, 스모크 2차 통과). [index-page.js `initRecentPlay`](../assets/js/index-page.js#L1017). 최종 동작: ①썸네일→게임시트(`openGameRecordSheet`) ②게임명·인원 텍스트는 비클릭(의도) ③참여자 이름→각 회원 읽기전용 보드(`openOtherProfileSheet`) — `data-nick` + `getAllProfiles`(전체 회원, 기록 조회와 `Promise.all` 병렬) 기준 nickname→user_id 해석. **비회원(미가입) 이름은 프로필이 없어 비클릭 = 정상**(스모크에서 '춘팝' 미가입 확인). ④내 기록/오너면 `data-record.mine=true`로 라이트박스 사진 삭제 노출. 리뷰어 닉네임→프로필 유지. **잔여(무해)**: 라이트박스 삭제 후 홈 카드는 새로고침 전까지 stale(onAfterDelete 미전달). **파생 발견(별건)**: game-reviews 허브 참여자 이름 해석도 `p.id`(profiles에 없는 컬럼)라 프로필맵이 빈 맵 → 기록 있는 회원만 걸림. 여기선 `p.user_id`로 정정했으나 허브는 범위 밖이라 미수정 — 아래 신규 항목.
- [x] ~~**[버그] game-reviews 허브 참여자 이름 해석 `p.id` → `p.user_id`**~~ — ✅ **수정 적용** (2026-07-18 발견·수정, 허브 만질 때 확인). [game-reviews.js:501](../assets/js/game-reviews.js#L501) `_profileNickMap`이 `p.id`로 세팅하는데 profiles엔 `id` 컬럼이 없어(kakao 키=`user_id`) **맵이 빈 채**로 돌던 것 → `p.user_id`로 정정(1줄). 허브 참여자 이름이 이제 **전원**(미기록 회원 포함) 보드로 연결됨. `getAllProfiles`는 이미 호출 중이라 추가 fetch 없음. 홈 카드에서 동일 로직이 2차 스모크 통과했으므로 저위험 — 허브 재현(미기록 회원 이름 클릭→보드)은 그 페이지 만질 때 겸사겸사 확인.

- [ ] **내 보드 수집보드 스크롤 진입점 수정** (JS) — ① 캐릭터 수정 버튼 클릭 → "내 캐릭터" 타이틀 위치로 스크롤 (현재: 그 아래로 진입). ② 칭호 클릭 → "칭호" 타이틀이 화면 상단에 오도록 (현재: 아래로 내려간 채 진입). ③ 캐릭터 이름 클릭 → 캐릭터 타이틀로 이동 (현재: 칭호 섹션으로 진입). 관련 파일: `assets/js/kakao-auth.js` 수집보드 서브시트 open/scroll 로직.

- [ ] **게임 검색 영어 제목 인식** — 검색창에서 영어로 입력 시 `bggTitle`로도 매칭. 게임정보 시트 영어제목 독립 표시 작업 이후 자연스러운 연계.

- [ ] **동호회 가입 추적** — page_sessions 데이터 활용
- [ ] **`record_complete` 이벤트가 저장 경로 6개 중 1곳에서만 발화** (2026-07-18 등록, 히어로 통계 조사 중 실측) — 퍼널 정확도 문제. `recordGamePlay` 호출부는 6곳인데 `trackEvent('record_complete')`는 [game-reviews.js:469](../assets/js/game-reviews.js#L469)(기록 허브 저장)에만 있고 **`game-sheet.js` 5곳**(816·1948·1962·2036·2641)은 무추적. 그 결과 **`record_start` 231건 대 `record_complete` 1건**(전체 누적)이라 관리자 퍼널의 기록 단계가 사실상 무의미하다.
  - ⚠️ **추가로 관리자는 트래킹에서 영구 제외**된다(`_shouldSkipAnalytics`, [supabase-client.js:275](../assets/js/supabase-client.js#L275)) — 실측: 오늘 기록 4건 중 호핀 3건이 이벤트 0, 뽁 1건만 기록됨. **이벤트 기반 지표는 관리자 활동을 절대 반영하지 않는다**는 전제를 깔고 읽을 것.
  - 착수 시 판단: 5곳에 `trackEvent` 추가로 퍼널을 맞출지, 아니면 이 퍼널 단계를 접을지. 「관리자 분석 2단계」와 함께 다루면 자연스러움.
- [ ] **관리자 알림이 교환권 로그로 도배됨** (2026-07-18 등록, 개별 읽음 스모크 중 실측) — 알림 **35건 중 30건이 `voucher:*`**(관리자만 받는 교환권 지급/사용 로그, [supabase-client.js:1384](../assets/js/supabase-client.js#L1384)에서 `limit(30)`). 소개글·태그 같은 실제 알림이 묻힌다. **의도된 사양인지 먼저 확인** 후 처리 방향 결정(묶음 표시 / 별도 탭 분리 / limit 축소). 아래 「관심 기반 묶음 알림」과 함께 다루면 자연스러움.
- [ ] **관심 기반 묶음 알림** (Red, Plan 필수)
  - 개별 알림 → 유형별 묶음 방식 전환
  - notifSeenAt → `{ tagged, review, play_record, purchased }` 확장

### P2-admin — 관리자 분석 페이지 추가 작업

- [ ] **[결정] 관리자 분석 탭 구조 압축안 적용 여부** (2026-07-02 기획, 미결정 — 2026-07-17 `PLAN_admin_analytics_counting.md` 삭제 시 추출) — 탭을 `요약 / 방문자 / 유입·페이지 / 행동` 중심으로 재구성하는 안. 당시 "카운팅 기준부터 안정화하고 큰 UI 재구성은 보류"로 미룬 뒤 그대로 방치됨(같은 건이 `PLAN_refactor_audit_workflow.md` 보류 절에 "관리자 분석 페이지 전체 재구성"으로도 있었음). **선행 조건이던 카운팅 기준 통일은 완료**(007 적용 + 명/회 기준 통일, §2 참조) → 이제 적용 여부만 결정하면 됨. 관련: 아래 "관리자 분석 2단계/3단계"(론칭 후 이월)와 범위가 겹치므로 착수 전 통합 판단 필요.
- [x] ~~**[verify] 관리자 분석 화면 수치·콘솔 확인**~~ (2026-07-02 등록 → **2026-07-18 종결**) — 콘솔 실측 **에러 0건**. 이 확인이 겨냥했던 「금일이용데이터 간헐 미표시」 가설은 **단일버그 추적 자체가 종료**되고 페이지 전체 감사로 대체됐다(§3 「[감사] 관리자 페이지」). 그 감사에서 진짜 원인 2건(RLS 역할 오지정·`max-rows` 절단)을 찾아 둘 다 종결. **`명 <= 회` 표시 확인은 절단 해소 후 다시 봐야 의미가 있으므로** 새 시작점 1번(「관리자 화면 눈으로 보기」)으로 이관.

### P3 — 인프라

- [ ] **[기술부채] DB 조회 에러 삼키기 — 1·2단계 완료(supabase-client.js), 나머지 파일 반응형** (2026-07-16 등록 / 2026-07-17 1·2단계 완료) — CLAUDE.md 「DB 함수 에러 처리」가 `catch (_) { return []; }`를 금지하는데 기존 코드에 소급 적용이 안 돼 있던 건. 감사(Phase 2 SC1~SC8)도 놓쳤음.
  - **방침 (사용자 결정 2026-07-17): "로그는 전부 켜고, 동작은 그때그때"** — ①로그 추가는 동작 무변경이라 일괄 처리(반응형만으론 우리가 안 만지는 영역 = 원인불명 버그가 사는 곳에 영원히 로그가 안 생김) ②반환값·에러 전파 변경은 동작 변경이라 실제 문제 발생 시 그 자리만(호출부가 빈 배열 fallback 전제로 렌더 중).
  - **🟡 `supabase-client.js` 부분 완료** — 1단계(try/catch 로그 75곳, 34e79f5) + 2단계(**구조분해** 59곳 error 수신, 32f73ee) + 노이즈·오라벨 정리(019bd7c). ~~구조분해 104곳 전부 감지~~ → **"전부"가 아님**: `Promise.all`+비구조분해 ~16곳이 대상에서 빠져 있었음(2026-07-17 R10b 발견, 아래 신규 항목). **규약·점검법은 [js-api.md](js-api.md) "CottageDB 에러 처리 규약"이 SSOT**(교훈은 CLAUDE.md 「DB 함수 에러 처리」로 승격).
  - ⏳ **남음 (2026-07-18 실측으로 정정)**: `game-sheet.js`는 **9곳이 아니라 빈 catch 1곳**만 남았다(세션 ⑨ 감지기 3단계가 7곳 처리 — 현재 catch 17개 중 `console.error` 12개). `achievements.js` 5곳은 **"미착수"가 아니라 "대상 아님" 판정**(래퍼 위라 raw supabase가 없음, 감지기 3단계에서 재분류). 즉 **이 항목에 실질적으로 남은 건 `game-sheet.js` 빈 catch 1곳뿐**이고 우선순위 낮음. ※이 줄은 감지기 3단계 종결 기재와 **어긋난 채 남아 있던 낡은 기록**이었다. **`kakao-auth.js` 24곳은 R10b에서 재검토 후 "대상 아님"으로 정정 (2026-07-17)** — 이 자리들은 raw supabase가 아니라 **`CottageDB` 래퍼**를 부르므로 `{data, error}`를 받을 대상이 없다(래퍼가 내부에서 이미 수신). 삼키는 건 JS 예외뿐이고 대부분의 래퍼는 reject하지 않아 `.catch()`가 아예 안 울린다 = 저가치. **원래 지시("`{data, error}` 형태로 바꿔야 실효")는 레이어를 잘못 짚은 것**이었음.
  - 🔥 **진짜 갭은 따로 있었다** → 아래 「감지기 갭 — `Promise.all` + 비구조분해」 신규 항목 참조. 2단계가 **구조분해 형태만** 세어 `getMyStats`·`getMyNotifications` 등 ~16곳을 통째로 놓쳤음.
  - **제외 판정(실물 확인 후 — 기계적으로 다 고치려 들지 말 것)**: `index-page.js`는 catch에서 "불러오기 실패"를 **화면에 표시**하므로 조용한 실패가 아님. `script-nav.js`는 `JSON.parse`/`localStorage` 방어용이라 로그 가치 낮음. 분류기가 이 둘을 삼킴으로 오분류했었음.
  - **화재 테스트 하니스**: `@supabase/supabase-js`가 `node_modules`에 설치돼 있어 node에서 실DB로 읽기 함수를 돌릴 수 있음(window/document/localStorage 스텁 + `eval(supabase-client.js)`). **읽기 전용(`get*`)만** 호출, `window.location.hostname='localhost'`면 추적성 write가 자체 차단됨. 함정: `getMeetingVotes(startDate, endDate)` **인자 필수**(빼먹으면 진짜 쿼리 오류가 나 오탐) / 끝에 **`process.exit(0)`** 필요(supabase 타이머가 이벤트루프를 잡음) / RPC는 `db.rpc("...")` **큰따옴표**라 작은따옴표 grep은 "RPC 없음" 오답.
    - ✅ **2026-07-18: 검증 스크립트는 이제 `scripts/`에 둔다** — 이 하니스가 "스크래치패드에만 있어 재작성 필요" 상태로 방치됐던 전례가 있어, 세션 ⑩의 스크립트 3개는 처음부터 `scripts/`에 커밋했다([PROJECT_STRUCTURE §1](PROJECT_STRUCTURE.md) 목록 참조). **패턴은 `scripts/audit-admin-analytics.js`를 보면 됨** — 상대경로 require(`../node_modules/...`), `supabase-config.js`를 eval해 키를 SSOT에서 읽기(복사해두면 회전 시 조용히 어긋남), `count:'exact'` 대조로 절단/RLS 판정.
    - ⚠️ **운영 DB를 바꾸는 스크립트는 `finally` 복원 필수** — `verify-notif-read.js`가 그 예(미읽음이 0건이면 읽음 버튼이 안 뜨므로 지평선을 되돌려야 테스트가 성립). 1차 작성판이 중간 크래시로 복원을 건너뛴 적이 있어 구조를 그렇게 잡았다.
  - **최근 결과 (2026-07-17, 2단계 후 읽기 42개 실DB)**: **불난 곳 0건**. 열감지기가 켜진 상태라 1단계의 "반쪽 증거"와 달리 실효 있음.
  - ~~**다음 관찰 포인트**~~ → **2026-07-18 확인 완료**: 관리자 페이지 콘솔에 대괄호 라벨 에러 **0건**. 감지기가 켜진 상태의 결과이므로 "조회 실패가 조용히 빈 값" 가설은 배제. 원인은 렌더/집계 쪽으로 좁혀졌고, 단일버그 추적 대신 **페이지 전체 감사로 전환**(위 「방문/이용 집계」④ 참조).
  - ⚠️ **"`getPageAnalytics`가 1000행 정상 반환"은 오독이었음 (2026-07-18 정정)** — 그 1000은 정상값이 아니라 **PostgREST `max-rows` 절단값**이었다(90일 내 실존 11,439행). 「[감사] 관리자 페이지」 발견 #2 참조. **감지기가 못 잡은 이유도 같다 — 절단은 에러가 아니라 그냥 적은 행이다.**
  - 🔍 **감지기 현재 커버리지 — "화재 0건"의 유효 범위 (2026-07-17 정직한 한계, 사용자와 확인)**: 아래 3개가 아직 사각지대다. **"불난 곳 0건"은 `supabase-client.js`의 읽기 함수 42개에 한정된 결론**이며 앱 전체 안전 증명이 아니다.
    - ① ~~**파일 커버리지 절반 이하**~~ → **2026-07-18 갱신**: raw supabase 쿼리 오류 감지는 `supabase-client.js`(구조분해 59 + Promise.all 5) + `game-sheet.js`(init 함수 JS 예외 7) 처리 완료. `kakao-auth.js` 24곳·`achievements.js` 4곳은 **대상 아님으로 재분류**(전부 CottageDB 래퍼 위 — 래퍼가 내부 수신). 즉 "raw supabase 미수신"은 이제 앱 전역에서 없음.
    - ② ~~**쓰기 경로 미검증**~~ → **2026-07-18 종결(4단계)**: 정적 census로 쓰기 경로 전수 확인 후 갭 전부 로그 추가(커밋 c5b5f68 + 🔗 family). record/meeting/pref 계열은 이미 전파, 갭은 추적성 write·toggle·업적/교환권 지급 family에 집중했음. 아래 「감지기 4단계」 종결 항목 참조.
    - ③ **울려도 아무도 못 듣는다** — `console.error`는 사용자 브라우저 콘솔에만 남고 우리에게 오지 않는다. DevTools를 열어둔 사람만 본다. **④ "관리자 금일이용데이터 간헐적 미표시"가 원인불명인 이유가 정확히 이것일 수 있음**(간헐적이라 재현 시점에 콘솔이 안 열려 있음). 근본 해결 = 에러 수집(`page_events`에 error 이벤트 적재 or 외부 수집기) → **Red + Plan 필수, 별도 기획 필요**(현재 미제안·미착수).
- [x] ~~**[기술부채] 감지기 3단계 — 나머지 JS 파일 확장**~~ (2026-07-17 등록 → **2026-07-18 종결**) — `supabase-client.js` Promise.all 갭(위 항목) + `game-sheet.js`를 처리하고, 나머지 대상은 실측으로 "대상 아님"으로 재분류. **문서가 겁냈던 "`{data, error}` 호출부 구조 변경"은 착수해 보니 불필요했다** — 남은 자리는 raw supabase가 아니었다.
  - **착수 시 실측으로 드러난 것(문서 전제가 세 군데 틀림)**:
    - **`achievements.js` = 대상 아님** (kakao-auth 24곳과 동일 재분류). `.catch()`는 4곳(문서는 5)이고 [achievements.js:432·434·441·753](../assets/js/achievements.js#L432) **전부 `db.grantAchievement`·`getRepAchievement`·`grantAchievementVoucher` 등 CottageDB 래퍼 위**다 → 래퍼가 쿼리 오류를 내부에서 이미 수신(2단계). `.catch()`가 삼키는 건 JS 예외뿐이고 래퍼는 대부분 reject 안 함 = 저가치. **R10b의 kakao-auth 판정과 같은 근거인데 이 항목만 옛 이해로 남아 있었다.**
    - ✅ **`game-sheet.js` = 처리 완료** (7곳, 문서는 9). `.catch(() => {})`가 [game-sheet.js:463~466·1019~1021](../assets/js/game-sheet.js#L463)에 있는데 이건 래퍼가 아니라 **렌더 로직을 담은 내부 init 함수**(`initSheetComments` 등) 위다. 쿼리 오류는 그 안에서 부르는 래퍼가 로그하지만, **init 함수 본문의 JS 예외(`.map`·DOM)는 여기서만 잡혀 조용히 사라지던** 자리 → `.catch(err => console.error('[initFn]', err))`로 로그 추가(순수 log-add, 동작 무변경). [game-sheet.js:1022](../assets/js/game-sheet.js#L1022) `initSheetPhotos`는 이미 로그+사용자 메시지 처리돼 있어 제외.
  - **결론적으로 "2단계 방식 못 쓴다 = 구조 변경 필요"는 오판이었다** — 남은 자리 어디에도 raw supabase가 없어 `{data, error}` 수신 대상이 애초에 없었다. game-sheet는 순수 로그 추가로 끝났고, achievements는 손댈 가치가 없었다. **"위반 N곳" 숫자는 이번에도 3군데(ach 5→4, gs 9→7, 그리고 대상 여부 자체) 틀렸다** — 착수 전 실측이 매번 옳다.
  - **제외 판정 유지**: `index-page.js`(화면에 실패 표시함) · `script-nav.js`(localStorage 방어용). 위 "제외 판정" 항목 참조.
  - **커버리지 상태**: raw supabase 쿼리 오류 감지는 이제 `supabase-client.js`(구조분해 59 + Promise.all 5 + 기존) 전역 커버. 남은 사각지대는 **쓰기 경로 검증(4단계)**과 **에러 수집(③, Red)** 둘뿐 — 아래 참조.
- [x] ~~**[기술부채] 감지기 4단계 — 쓰기 경로 검증**~~ (2026-07-17 등록 → **2026-07-18 종결**, 정적 검사 ③) — 실DB 쓰기 없이 정적 census로 쓰기 경로(insert/update/delete/upsert) 전수 확인. **③만으로 끝** — 갭이 전부 로그 추가로 닫혀 ①②(실DB 쓰기 테스트)는 불필요했다.
  - **결과 = §3 예측 반쪽 맞음**: `recordGamePlay`·`updateGamePlay`·insert/delete/updateComment·`addGamePref`·`upsertMeetingVote`·`deleteMeetingVote`·`addMeetingVoteGame`·`setMeetingVoteGame*`·`removeMeetingVoteGame`·`submitGameReview`·`deletePlayPhoto`·`banUser` 등은 이미 `return {error}` 전파(또는 로그)라 **갭 없음**(예측대로). **갭은 두 family에 집중** — ①추적성 write(`trackView`·`trackEvent`·`_startAnonHeartbeat` anon_sessions·`page_sessions` fire-and-forget)가 쿼리 오류 조용 ②`toggleGameLike`/`toggleGameCurious`가 SELECT 에러만 로그하고 실제 delete/insert 에러를 삼킴 ③수신했으나 미로그(`_syncTimeToDBNow`·`upsertProfile`·`updateNotifSeenAt`). **커밋 c5b5f68** — 전부 반환 계약 무변경(로그만 추가).
  - **🔗 UNIQUE 오삼킴 family 동반 종결**(이 커밋): `grantAchievement`·`grantAchievementVoucher`·`grantFirstPlayVoucher`는 `error.code !== '23505'`일 때만 로그(23505=정상 중복 방어, 파일 관용 상수 = `addMeetingVoteGame`도 사용)로 진짜 실패와 분리. `setRepAchievement`·`setRepTitle`·`grantDevVoucher`(UNIQUE 없음)·`redeemVoucher`는 무조건 로그. **반환 계약 전부 무변경**(return false/reason 그대로) → 방침 "로그는 전부 켜고" 범위, 동작 변경 아님.
  - **남은 사각지대 = ③ 에러 수집(Red)뿐** — `console.error`는 사용자 브라우저 콘솔에만 남고 우리에게 안 옴. 위 「감지기 현재 커버리지」③(관리자 금일이용데이터 간헐 미표시 가설 포함) 참조. 이것만 열려 있고 감지기 1~4단계는 전부 종결.
- [x] ~~**[기술부채] 문서-코드 참조 정합성 감사**~~ — ✅ **2026-07-18 종결** (2026-07-18 등록 — 사용자 제기 "참조가 잘못돼 못 찾거나 토큰 낭비하는 것들도 리팩토링해야 하지 않나"). 범위 = `PROJECT_STRUCTURE.md` 파일역할 표·`js-api.md` 소비처 열·`REFACTOR_CHECKPOINT.md` 감사 항목(네비게이션 인덱스 3파일).
  - **착수 전 확인**: 이 세션 착수 전 이미 고쳐져 있던 2건(GS7 감사 항목·js-api.md CottageGameView 소비처, 커밋 9b8c946·4e178b4) 확인 완료 — 중복 수정 없음.
  - **음성 대조군**: 가짜 함수명(`totallyFakeFn_XYZ123`)을 실제 파일에 grep해 0건 확인 + 실존 함수(`getGameKeyById`) grep으로 15건 확인 → grep 도구 자체가 정상 동작함을 먼저 검증(CLAUDE.md 「검증 결과 0건이면 검사기 의심」).
  - **발견한 드리프트 3건, 전부 수정**:
    1. `PROJECT_STRUCTURE.md` §2 JS 파일 역할 목록에 **`header.js` 자체가 통째로 누락**(§2-A에서 경로만 언급되고 정작 파일 역할 표엔 없었음) → 항목 추가.
    2. `js-api.md:255` `window.CottageDB` 소비처에 **`script-nav.js`가 잘못 포함**(실측: script-nav.js는 CottageDB 대소문자 무관 0건 참조) → 제거 + 실제 소비처(achievements.js·day-detail.js·play-records-utils.js 등) 보강.
    3. `js-api.md:260` `window.getKakaoUser` 소비처에도 **동일하게 `script-nav.js` 오기재** → 동일하게 정정.
  - **드리프트 아님으로 확인(검토했으나 정확했던 것들)**: `CottageGameView`/`getAllGamesArray`의 script-nav.js 소비 표기(`GameView` 별칭으로 실사용 확인), `COTTAGE_PAGE_LABELS_BY_PATH`, day-detail.js 의존관계 전체(`ensureGameSheet` 등), page-labels.js↔script-nav.js 로드 순서(14개 HTML 전수 확인), 빌드 파이프라인 경로, game-system 디렉터리 구조, `cottage-likes-changed`/`cottage-meeting-changed` 발화·수신처, GS5 escH 5사본, REFACTOR_CHECKPOINT.md 전체(이미 최신 상태).
  - **결론**: 실제 드리프트는 "소비처 리스트에 있으면 안 될 파일이 잘못 끼어든 것"(2건, 같은 파일명 script-nav.js가 반복 오기재)과 "파일 자체 누락"(1건) 패턴. 전체 문장 재작성 아닌 표 항목만 수정(zero-blast-radius).
- [ ] **[감사] 관리자 페이지(`requests-admin.html`) 전체** (2026-07-18 등록 — 사용자 결정: "페이지 전체 리팩토링 한다고 생각하고 감사부터") — 「금일이용데이터 간헐 미표시」 단일버그 추적을 **종료하고 대체**한 항목. 전환 사유: 증상이 오래돼 재현 조건이 불확실("어떤 에런지 긴가민가")하고, 콘솔 에러 0건 + 가설 3건 기각으로 **단일 원인 추적의 기대값이 낮아짐**.
  - **성격**: 감사(읽기)라 Yellow 이하. 단 **결과가 §3 항목 다발로 나올 것**이므로 착수 시 WIP 제한 확인.
  - **범위 미확정 — 착수 시 사용자와 먼저 합의할 것**: 이 페이지는 요청관리 + 방문자/이용 분석 + 이벤트 퍼널이 한 파일에 있다(2100줄+). "기능이 조금씩 아쉬운 것들"(사용자 표현)이 어느 영역인지 먼저 좁히지 않으면 감사가 발산한다.
  - **이미 확보된 입력 (재조사 금지)**: 아래 「방문/이용 집계」④의 기각 가설 3건 + 확정 버그 1건(`_startAnonHeartbeat` 자정 넘김) + 구조적 특성(`todayS > 0`이면 항목이 DOM에서 빠짐).
  - ⚠️ **CLAUDE.md 「구현/리팩토링 분리」**: 감사 중 발견한 버그는 **등록만** 하고 그 자리에서 고치지 않는다.
  - **범위 확정 (2026-07-18 사용자)**: **방문·이용 분석 + 이벤트 퍼널**(둘은 엮여 있음). 요청관리 영역은 이번 범위 밖. 이벤트 퍼널은 "아예 동작 안 함", 방문·이용 분석은 "디테일이 조금씩 부족".
  - 🔴 **감사 발견 #1 — `page_events` SELECT가 RLS로 막혀 있음 (원인 확정, 미수정)**:
    - **증상**: 이벤트 퍼널이 전부 0/빈 화면. anon 키로 `page_events` count = **0** (에러 없음).
    - **원인**: [supabase-setup.sql:705-711](supabase-setup.sql#L705-L711)이 `enable row level security` 후 **INSERT는 `anon`, SELECT는 `authenticated`**로 정책을 걸었다. 이 프로젝트는 **카카오 OAuth라 `authenticated` 세션이 생기지 않아** 모든 클라이언트가 영원히 `anon` → **SELECT가 영구 차단**. RLS는 차단 시 에러가 아니라 **빈 결과를 조용히** 반환하므로 콘솔에도 안 찍힌다(감지기 사각지대의 실제 사례).
    - **대조 증거**: `page_views`([:24-31](supabase-setup.sql#L24-L31))·`page_sessions`([:469-476](supabase-setup.sql#L469-L476))는 **SELECT도 `anon`**이라 정상(2,309행·11,439행 읽힘). 같은 파일 안에서 `page_events`만 다르다.
    - **음성 대조군**: 존재하지 않는 테이블은 count가 `null`, `page_events`는 숫자 `0` → "테이블 없음"이 아니라 "RLS 필터링"임을 구분 확인.
    - ✅ **행 존재 확인 (2026-07-18, postgres 역할)**: **1,452행**. 데이터는 그동안 정상 수집되고 있었고 **읽기만** 막혀 있었다 → 정책 수정만으로 과거분 전부 복구.
    - ✅ **`011_page_events_anon_select.sql` 작성 + 실행 + 검증 완료**: ①`anon_select_page_events` 추가 ②`auth_select_page_events` 제거(증명 가능한 dead policy). **애플리케이션 코드 변경 0** — 기존 집계가 빈 배열만 받고 있었을 뿐이라 권한만 열면 그대로 돌았다. 롤백은 정책 drop 한 줄, 데이터 무변경.
    - ⚠️ **"전부 복구"는 DB 기준이지 화면 기준이 아님** — 퍼널은 30일 창(`getEventCounts(…, 30)`)이라 1,452행 중 최근 30일분만 뜬다.
    - ✅ **종결 — 마이그레이션 011 실행 + 엔드투엔드 검증 완료 (2026-07-18)**: anon SELECT 1,452행 정상, Playwright로 관리자 페이지 렌더 확인 → 퍼널 3그룹 전부 실수치 표시(예: "히어로 모임 클릭 오늘 15 / 7일 72", 전환율 40%·67% 계산됨), 콘솔 에러 0건.

  - 🔴 **감사 발견 #2 — PostgREST `max-rows`(1000) 절단으로 관리자 분석이 데이터의 9%만 본다 (미수정, 최우선)**:
    - **실측**: `getPageAnalytics`는 90일·`limit(20000)`을 요청하지만 **실제 반환 1,000행 / 90일 내 실존 11,439행 = 91% 누락**. `entered_at DESC` 정렬이라 **반환 구간이 2026-07-11~07-18(7일)** — 즉 **"90일 분석"이 실제로는 최근 7일 분석**이다.
    - **클라이언트 `.limit()`으로 못 넘는다** — `.limit(20000)`을 명시해도 1000. Supabase 프로젝트의 서버측 `max-rows` 설정이 상한이기 때문.
    - **동일 문제 2곳 더**: `getEventCounts`(현재 1,452행 중 1,000만 = 31% 누락), `getPageViewCounts`(현재 266행이라 미발현이나 1000 넘으면 동일).
    - **이것이 "디테일이 조금씩 부족"의 유력 본체** — 방문일수·총체류·페이지별 집계·월별 차트가 전부 이 절단된 표본 위에서 계산된다. 트래픽이 늘수록 창이 좁아져 **조용히 악화**된다(과거 "월별 차트에 나나만 보임"도 이것일 가능성).
    - **절단 범위 = 관리자 페이지 조회 4개 전부** (2026-07-18 실측): `getPageAnalytics` 1,000/11,439(91%) · `fetchPageViewsForAnalytics` 1,000/2,312(57%) · `getEventCounts` 1,000/1,452(31%) · `getPageViewCounts('index')` 266/266(아직 0%).
    - ✅ **종결 — Ⓐ 적용 완료 + 검증 (2026-07-18)**: Supabase `max-rows` **1000 → 50000**. 4개 조회 전부 전량 수신 확인(`getPageAnalytics` 11,455/11,455 · `page_views` 2,312/2,312 · `getEventCounts` 342/342). 커버 구간 **7일 → 49일**(2026-05-31~07-18, 데이터 전 범위).
      - **실제 개선폭(절단 전 vs 후, 동일 로직 재현)**: 집계된 비회원 **57명 → 348명**(6배) · 페이지 종류 **23 → 42** · **총 체류시간 12시간 → 276시간(23배)** · 반영 세션행 1,000 → 11,455.
      - ⚠️ **퍼널 표시값은 변화 없음** — 퍼널은 30일을 조회하지만 화면엔 `오늘`/`7일`만 찍는데, 잘린 1000행 창이 이미 최근 7일을 덮고 있었기 때문. **절단이 실제로 망가뜨린 건 더 긴 창을 쓰는 이용 분석 쪽**이었다(위 개선폭). 퍼널 부활은 별건(발견 #1 RLS).
      - **코드 변경 0** — 설정만 바꿨고 커밋된 코드는 그대로다.
    - **결정 근거: Ⓐ (2026-07-18 사용자 승인)**. 코드 변경 0·회귀 위험 0으로 **정확성부터 즉시 회복**하고, 구조 개선(Ⓒ)은 트리거를 걸어 분리.
      - **Ⓑ(`.range()` 루프) 기각 이유**: 코드는 바꾸는데 여전히 원시행을 전량 내려받고 왕복만 11회로 늘어난다 — 어중간.
      - **`max-rows`는 보안 경계가 아니다**: anon이 `.range()`로 전량 취득 가능함을 실측 확인(`range(1000,1999)` 정상 반환). 성능 가드레일일 뿐이라 상향이 접근통제를 푸는 게 아니다.
    - ⏳ **Ⓒ(집계 RPC) — 트리거 도달 시 착수. "언젠가" 아님**:
      - **착수 트리거(둘 중 하나)**: `page_sessions` **5만 행 초과** 또는 관리자 페이지 로딩 **3초 초과**.
      - **여유 실측 (2026-07-18 전 테이블 census)**: `page_sessions` **11,461행**이 유일한 주시 대상(2위 `page_views` 2,312, 나머지는 전부 500행 미만). 5만까지 38,539행 여유 = 주당 ~753행 기준 **약 1년**. ⚠️ 이 세션 중간에 "약 2년"으로 적었던 것은 **계산 착오, 정정함**.
      - **선행 조건**: 「관리자 분석 2단계(데이터)」 확정 후. 그게 **어떤 집계를 추가할지 정하는 작업**이라 RPC를 먼저 만들면 갈아엎게 된다.
      - **지금 미루는 진짜 이유**: 관리자 화면이 그동안 **91% 잘린 표본**을 보여줬기 때문에 "어떤 집계가 쓸모 있는지"에 대한 판단 자체가 틀린 데이터 위에 서 있다. Ⓐ로 정확한 숫자를 먼저 본 뒤라야 맞는 RPC를 설계할 수 있다.
      - 🔑 **Ⓒ의 실제 난점(2026-07-18 감사 중 파악 — 다시 파헤치지 말 것)**: 어려운 건 집계 SQL이 아니라 **클라이언트 인터랙션 의존**이다. 이 페이지는 `rows`를 메모리에 올려두고 날짜 네비·오늘/7일 버튼·필터를 **즉시 재계산**한다. 관련 함수 5개 = `dedupUserPageDay`·`buildPageMap`·`buildUserMap`·`buildAnonUserMap`·`filterByRange`. RPC로 가면 필터마다 서버 왕복을 하든 RPC를 여러 개 파든 **화면 동작을 재설계**해야 한다 → 조회 방식 교체가 아니라 UI 재작성에 가깝다.
    - ⚠️ **낡은 기재 정정**: §3 「감지기」 항목의 "`getPageAnalytics`가 1000행 **정상 반환**"은 오독이었다 — 그 1000은 정상이 아니라 **절단값**이었다.

  - 🟡 **감사 발견 #3 — `ent` 0이 유효값을 가림 (잠재, 현재 발현 0건)**: [requests-admin.html:1088](../pages/admin/requests-admin.html#L1088) `const anonTodayS = ent ? ent.todaySec : (a.today_date === todayKst ? ... )` — `ent`가 존재하되 `todaySec === 0`이면 **`anon_sessions.today_seconds`의 유효값이 있어도 0으로 덮인다**(삼항이 존재 여부만 보고 값을 안 봄). heartbeat는 `anon_sessions`에 60초마다 쓰는데 `page_sessions.duration_sec`는 단기방문 시 0이라 실제로 갈릴 수 있는 구조. **다만 2026-07-18 실측 결과 해당 사례 0건** → 「금일이용데이터 미표시」의 원인으로 **단정하지 말 것**. `ent.todaySec || dbVal` 형태가 맞아 보이나 미수정.

  - 🟢 **감사 발견 #4 — `memberCountBadge` dead code**: [requests-admin.html:1031](../pages/admin/requests-admin.html#L1031)이 `getElementById('memberCountBadge')`를 잡는데 **HTML에 그 요소가 없다**(전체 파일 통틀어 이 한 줄만 존재). `if (memberCountEl)` 가드에 막혀 조용히 스킵 중. 삭제 대상.
    - 📌 **교훈 후보**: CLAUDE.md 「Supabase RLS 상태 명시」가 **신규 테이블의 RLS 활성화**만 경고하는데, 이 건은 **RLS는 켜고 정책은 걸었으나 대상 역할이 틀린** 경우다. 규칙에 "정책의 `to` 역할이 `anon`인지"를 추가할지 검토.

  #### 육안 점검 결과 (2026-07-19, 시작점 1번 「관리자 화면 눈으로 보기」 — 전부 실측 확정, 미수정)

  절단(#2)이 풀린 뒤 **정확한 수치 위에서** 6개 탭을 실제로 렌더해 본 결과. **DB 층은 이상 없음**(`page_sessions` 11,514/11,514 · `page_views` 2,331/2,331 · `page_events` 1,489/1,489 전량 수신, 콘솔 에러 0건) → **남은 문제는 전부 표시·집계 층**이다. 아래 5건은 "데이터가 없어서"가 아니라 **있는 데이터를 잘못 보여주는** 것들.

  - [x] ~~🔴 **발견 #5 — 회원 탭 필터 칩이 날짜 필터를 무시한다**~~ · [x] ~~🔴 **발견 #6 — 퍼널 전환율이 오늘 표본으로만 계산돼 죽어 있다**~~ — ✅ **둘 다 2026-07-19 해결·검증 통과**. **하나의 원인이었다**: 날짜 메뉴가 **반대 탭에 배선**돼 있었음([:604](../pages/admin/requests-admin.html#L604) `usesDateFilter`가 `member` 포함·`event` 제외). 사용자 진단 그대로 `member`↔`event` 교체 + 회원 목록 날짜필터 블록 제거 + 퍼널을 `draw()`의 기간에 연결.
    - **왜 다시 문제 아님**: 회원 목록은 이제 `dateHidden`을 아예 세우지 않으므로 칩(누적)과 목록이 같은 모집단 → 실측 `칩 341 = 목록 341`, `더보기 (338명 더)`. 퍼널은 선택 기간 1칸 + 그 기간 기준 전환율 → 실측 `7일 100/167/50/0/55%`, `전체 60/83/118/0/94%`("오늘"이 `-`인 건 그날 클릭이 0일 뿐 정상).
    - **판단 근거(사용자)**: 회원 카드는 그 자체가 개인 타임라인 요약("46분 전 · 오늘 19초 · 방문 13회 · 가입 5/31")이라 목록을 다시 날짜로 거르는 게 무의미. 반대로 이벤트는 "기간별 몇 건"이 본질. 누적 회원 수는 요약 탭 「회원」 카드가 이미 보여줘 **잃는 정보 없음**.
    - **함께 처리**: 이벤트 조회를 30일 → 전 기간으로. ⚠️ **오늘 기준 효과는 0** — `page_events` 1,490행이 전부 최근 30일 안(가장 오래된 것 6/24)이라 지금은 30일 조회와 결과가 같다. **데이터가 30일을 넘겨 쌓일 때 조용히 비는 걸 막는 예방적 변경**이다.
    - **죽은 조회 제거**: `getPageViewCounts('index')` + `pv0`/`pv7`이 **선언만 되고 아무도 안 읽었다**(참조 1회, 음성 대조로 검사기 검증). 매 로드마다 헛도는 왕복이라 제거. 관련 문서 오기재도 정정([PLAN_funnel_analytics.md](PLAN_funnel_analytics.md) — "「메인 방문」 단계 추가"는 사실이 아니었음).
    - 🧰 회귀 확인은 [scripts/shot-admin-tabs.js](../scripts/shot-admin-tabs.js) (#5·#6 자동 판정, #6은 기간 순회).
    - ⚠️ **아래 원래 기술은 보존** — 재발 시 증상·원인 대조용.
  - 🔴 **발견 #5 — 회원 탭 필터 칩이 날짜 필터를 무시한다 (표시 모순, 확정)**: 칩은 `전체 (341) / 회원 (20) / 비회원 (321)`인데 **실제 목록에 뜨는 건 4명**(회원 3·비회원 1). 실측: DOM 카드 341개 중 `dataset.dateHidden !== '1'`가 4개.
    - **원인**: 칩 라벨은 렌더 시 `unified.length`/`memberCount`/`anonCount`([:1055-1058](../pages/admin/requests-admin.html#L1055))로 **누적 전체**를 박아두는데, 목록 표시는 날짜 네비([:1849-1855](../pages/admin/requests-admin.html#L1849))가 `data-last-seen`으로 걸러낸 뒤 `applyVisitorFilter`가 **`dateVisible` 기준**으로 3개만 보이고 더보기 개수도 거기서 계산([:2114-2124](../pages/admin/requests-admin.html#L2114)). **두 숫자의 모집단이 다르다.**
    - **증상**: "비회원 (321)"을 누르면 1명이 나온다. 날짜가 오늘일수록 괴리가 커짐(341 → 4).
    - **판단 필요**: 칩을 날짜 기준으로 재계산할지, 아니면 칩은 누적 유지 + 라벨에 기간을 명시할지. **전자가 자연스러워 보이나 "전체 회원 수"를 보는 용도로 쓰고 있었다면 후자** — 착수 전 사용자 의도 확인.
  - 🔴 **발견 #6 — 퍼널 전환율이 "오늘" 표본으로만 계산돼 대부분 `-`로 죽어 있다 (확정)**: 이벤트 탭 전환율 화살표가 **5칸 전부 `-`**(`convArrow` 호출 5곳 = 퍼널1 2 + 퍼널2 2 + 퍼널3 1). 7일 값(3·3·4 / 6·3·0 / 71·39)이 **바로 옆 칸에 있는데도** 쓰지 않는다.
    - **원인**: `convArrow(fromN, toN)`이 `pct()`로 계산하는데([:2052-2054](../pages/admin/requests-admin.html#L2052)) 인자로 **오늘 값만** 넘긴다(`convArrow(hr0, rgd0)` 등 [:2071~2085](../pages/admin/requests-admin.html#L2071), `hr0 = countDay(…, 0)`). `pct`는 분모가 0이면 `-`([:2020](../pages/admin/requests-admin.html#L2020))이므로 **오늘 클릭이 0인 시간대엔 항상 공백**.
    - ⚠️ **감사(7/18)에서 "전환율 40%·67% 계산됨"으로 확인했던 것과 모순되지 않는다** — 그날은 오늘값이 있었을 뿐이고, **오늘값이 0이면 죽는 구조 자체는 그대로**였다. 하루 트래픽이 한 자릿수인 사이트에서 전환율을 일 단위 표본으로 내는 것이 설계 실수.
    - **처리 방향**: 전환율을 **7일 값 기준**으로 바꾸거나(1줄: `convArrow(hr7, rgd7)`), 오늘/7일 두 줄을 다 보여주기. 30일을 조회해놓고([:1998-2002](../pages/admin/requests-admin.html#L1998)) 오늘/7일만 쓰는 것도 같은 맥락 — 「관리자 분석 2단계」와 함께 결정.
  - 🟡 **발견 #7 — 「회원별 이용시간」 차트 x축 눈금이 불규칙하게 찍힌다 (표시 버그, 확정)**: 실측 눈금 `0m 1m 3m 5m 6m 8m 10m 11m 13m` — **2m·4m·7m·9m·12m가 없다.** 값 자체는 맞다(실측 데이터 `[724, 151, 39]`초).
    - **원인**: 데이터가 **초 단위**인데 축 라벨만 **분으로 반올림**해 붙이므로, 균등한 초 간격(≈97.5초)이 분으로 접히며 1↔2씩 튄다. 축이 비선형처럼 보여 막대 길이를 눈으로 읽을 수 없다.
    - **처리 방향**: 눈금 간격을 60초 배수로 고정하거나, 라벨을 `분:초`로 바꾸기.
  - 🟡 **발견 #8 — 가로막대 길이(=횟수)와 막대 위 텍스트(=체류시간)가 서로 다른 지표다**: 「페이지별 방문」·「유입 경로별 페이지뷰」 둘 다. x축은 `stepSize:1`의 **횟수**([:1582](../pages/admin/requests-admin.html#L1582)·[:1651](../pages/admin/requests-admin.html#L1651), 툴팁도 `${ctx.raw}회`)인데, 막대 위엔 플러그인이 `총4분45초 (평균1분35초)` 같은 **시간**을 그린다.
    - **증상**: 오늘처럼 횟수가 동률(3·3·3)이면 **막대 3개가 전부 축 끝까지 꽉 차** 길이 차이가 0인데 텍스트의 시간은 제각각(4분45초/6분2초/4분27초) → "시간 비교 차트"로 오해하면 정반대로 읽는다. 유입 탭은 축이 0~1이라 더 심함(막대 2개 모두 100%).
    - **버그가 아니라 설계 선택일 수 있음** — 다만 축 제목이 없어 무엇의 길이인지 화면만 봐선 알 수 없다. 축 라벨 추가가 최소 조치.
  - 🟢 **발견 #9 — 요약 탭 카드의 기간 기준이 제각각이고 표기가 없다**: 5개 카드 중 **「주요 유입 (7일)」만 기간을 밝힌다**. 실제로는 방문자=오늘, 페이지=7일(메인 7회 — 같은 시각 페이지 탭의 오늘 값은 3회), 이벤트=오늘, 회원=누적+30일 신규가 **한 줄에 섞여 있다**. 또 「주요 유입」 카드는 폭이 좁아 `카카오 동호회 1명 (1회 …`로 **말줄임돼 핵심 수치가 안 보인다**.
    - Green 등급(문구·표기)이라 다른 항목과 달리 즉시 처리 가능.
  - ✅ **버그 아님으로 확인**: 방문 탭의 회색 칩 「요일」·「재방문율」은 `disabled title="준비 중"`([:477-478](../pages/admin/requests-admin.html#L477))로 **의도된 자리표시자**다 → 「관리자 분석 2단계(요일별 집계·재방문율)」가 **붙을 자리가 이미 UI에 예약돼 있다**. 2단계 착수 시 여기부터.
  - 📌 **2단계 입력으로서의 결론**: 시작점 1번이 물었던 "무엇을 더 봐야 하나"의 답은 **"새 지표를 더 만들기 전에 이미 있는 지표의 기준(기간·모집단·축)을 맞춰야 한다"**이다. #5·#6·#9가 전부 **"어느 기간·누구를 센 숫자인지 화면이 말해주지 않는다"**는 같은 뿌리다.

  #### #5·#6 수정이 새로 드러낸 것 (2026-07-19, 전부 미수정·등록만)

  전환율이 살아나고 기간이 표기되자 **그 전엔 보이지 않던** 문제가 드러났다. 「고치면 다음 문제가 보인다」의 사례.

  - 🔴 **발견 #10 — 전환율이 100%를 넘는다 (이 "퍼널"은 순차 퍼널이 아니다)**: 실측 `1-2→1-3 167%`, `2-1→2-2 118%`. 즉 **뒤 단계가 앞 단계보다 많다**. 원인은 계산이 아니라 **모델**이다 — 사용자는 히어로(1-1)를 거치지 않고도 추천 섹션·기록 더보기에 도달할 수 있어서, 세 단계가 **통과 관계가 아니라 독립 이벤트**다. 전환율이 항상 `-`였을 땐 이 모순이 드러나지 않았다.
    - **처리 방향 판단 필요**: ⓐ 진짜 퍼널로 만들려면 `session_key` 기준 **동일 세션 내 순차 통과**를 세야 한다([PLAN_funnel_analytics.md](PLAN_funnel_analytics.md) 2단계의 "unique 카운트 기반 전환율"이 정확히 이것, 미착수) ⓑ 아니면 전환율 표기를 버리고 **단순 이벤트 건수 비교**로 이름을 바꾼다. **ⓑ가 훨씬 싸고 지금 데이터로 정직하다** — ⓐ는 2단계 본체 작업.
  - 🟡 **발견 #11 — 기간 버튼 라벨과 실제 단위가 다르다**: `7일` 버튼을 누르면 라벨이 **"2026년 7월 2째주"**(주 단위), `30일`은 **"2026년 7월"**(월 단위)이 된다([:1931·1936](../pages/admin/requests-admin.html#L1931)에서 `_navType`을 `week`/`month`로 바꿈). 즉 "최근 7일"이 아니라 "이번 주"다 — **경계에서 값이 달라진다**(월요일엔 "7일"이 1~2일치). #9와 같은 뿌리(화면이 기준을 잘못 말함). 기존 동작이며 이번에 이벤트 탭에도 노출돼 눈에 띄게 됨.
  - [x] ~~🔴 **발견 #13 — 관리자가 이벤트의 77%를 아예 조회하지 않고 있었다**~~ — ✅ **2026-07-19 해결** (사용자 요청 "요약탭 이벤트 박스도 계열별로 묶어달라"를 착수하다 발각). **전 기간 1,493행 중 1,149행(77%)이 조회 대상 밖**이었다. 최다 이벤트 `home_meeting_date_preview_click` **443행**이 통째로 안 보였고 `record_start` 336 · `meeting_planner_bar_click` 128 · `home_meeting_preview_card_click` 83 · `meeting_profile_click` 75 · `home_meeting_week_nav` 65도 마찬가지.
    - **원인 = 목록이 두 벌이었다**: `loadEventStats`의 조회 목록(10종)과 요약 카드의 `_EVT_LBL` 라벨 표(12종)가 **따로 관리돼 어긋났다**. 라벨 표엔 있는데 조회 목록엔 없는 4종(729행)은 **영원히 표시 불가능한 죽은 라벨**이었다 — 표시하려는 의도는 있었으나 조회에 안 넣은 것.
    - **해결 = 단일 출처화**: `EVENT_FAMILIES`(계열 표) 하나를 두고 **조회 목록을 거기서 파생**(`EVENT_ALL_TYPES`). 새 이벤트는 그 표에만 등록하면 조회·요약이 함께 따라온다 → **드리프트가 구조적으로 재발 불가**.
    - **검증**: 요약 카드 계열 합계 **1,493 = DB 전체 행수 정확히 일치**(모임 1,050 · 플레이기록 361 · 추천게임 75 · 가입 7). 퍼널 회귀 없음, 콘솔 에러 0.
    - 📌 **함께 드러난 것 2개**: ①`home_record_write_click`은 **DB 0건** — 퍼널 2-3단계가 늘 0인 건 사용자가 안 눌러서가 아니라 **이벤트가 안 쏘여서**다(§3 `record_complete` 6경로 중 1곳 항목과 같은 계열). ②`30일` 버튼으로 본 합계가 1,453인데 `전체`는 1,493 — 40행 차이는 6/24~30일분으로, **발견 #11(그 버튼이 실제로는 "이번 달")의 추가 실증**이다.
  - 🟡 **발견 #12 — 회원 탭의 「회원별 이용시간」 차트가 기간 조작 수단을 잃었다** (이번 수정의 부작용, 무해): 그 차트는 여전히 날짜 네비를 따르는데(라벨 `오늘 · 2026.7.19`) 회원 탭에선 컨트롤이 숨겨져 바꿀 수가 없다. **깨진 건 아니다** — 라벨이 정직하고 다른 탭에서 기간을 바꾸면 반영된다. 정리하려면 ⓐ이 차트를 방문 탭으로 옮기거나 ⓑ회원 탭에서만 기간 버튼을 남기고 목록에만 미적용. **목록과 차트의 성격이 다른 게 근본**(목록=명부, 차트=기간 집계).
- [ ] **[통합] 방문/이용 집계 전면 점검** (2026-07-16 등록 — 사용자 제기 "방문 집계가 잘 안 작동, 전체 리팩토링 필요") — **지금까지 개별 증상으로만 흩어져 있고 통합 항목이 없어 신규 등록**. 아래가 이 주제의 전부이며, 착수 시 이 목록부터 확인:
  - **2026-07-16 실측 결과 — "안 쌓임"은 아님**: `page_views` 2,171행(그중 `__visitor__` 758, `my-board*` 314), `page_sessions` **10,975행**(최근 7일 753) 정상 수집 중. 007 마이그레이션도 적용 완료. 즉 문제는 **수집이 아니라 정확도·표시 구멍**.
  - ① **duration_sec=0** — 최근 7일 `page_sessions` 753행 중 **111행(14.7%)**. heartbeat(1분) 전 이탈 시 0으로 기록 → 관리자 분석에서 시간 미표시. (아래 "단기 방문 시간 미표시" 제한사항과 동일 건, 실측치 추가)
  - ② **과거 session_key NULL 1,513/2,171(70%)** — 007 이전 legacy. 신규는 99% 채워짐. 소급 불가라 이 구간은 영구 fallback 집계. (아래 "명/회 역전" 제한사항)
  - ③ **이용시간 기기 중복** — 동일 유저 다기기 동시 사용 시 각 기기 시간이 모두 합산 (증상 기록은 §2 「알려진 제한사항」). **해법 방향: 서버 세션 단위 관리** — 2026-07-17까지 §3에 별도 항목("이용시간 기기 중복 카운트 방지")으로도 있던 것을 여기로 흡수(같은 건이 3곳에 있었음).
  - ④ ~~**관리자 금일이용데이터 간헐적 미표시**~~ → **2026-07-18 단일버그 추적 종료, 페이지 전체 감사로 전환**(사용자 결정). 아래 「[감사] 관리자 페이지 전체」 항목으로 이관.
    - **기각된 가설 3건 (정적 추적, 재조사 금지 — 근거 있음)**: ⓐ 로드순서 레이스 → 스크립트가 전부 classic이고 인라인 IIFE가 `supabase-client.js` 뒤라 `window.CottageDB`는 항상 정의됨(`requests-admin.html:813`의 조용한 early-return은 도달 불가). ⓑ `tried` 래치+1200ms 게이트 → `isOwner()`가 동기 localStorage 읽기([kakao-auth.js:202](../assets/js/kakao-auth.js#L202))라 그 시점에 확정됨. ⓒ KST 타임존 불일치 → 읽기/쓰기가 전부 동일 공식(`Date.now()+9h`).
    - **콘솔 실측 (2026-07-18)**: 대괄호 라벨 에러 **0건**. 감지기 1~4단계가 켜진 상태의 결과라 "조회 실패로 조용히 빈 값" 경로는 사실상 배제됨.
    - **확정된 실제 버그 1건 (미수정, 감사에서 처리)**: `_startAnonHeartbeat`의 1분 인터벌([supabase-client.js:1125-1132](../assets/js/supabase-client.js#L1125-L1132))이 `today_seconds`만 갱신하고 `today_date`는 세션 시작값에 고정 → 탭을 KST 자정 너머로 열어두면 `today_date`가 어제로 남아 관리자의 `today_date === todayKst` 조건이 거짓이 됨. 단 `page_sessions` 파생값(`ent`)을 우선 쓰므로([requests-admin.html:1088](../pages/admin/requests-admin.html#L1088)) 그 행이 없을 때만 발현.
    - **구조적 특성**: 회원·비회원 모두 표시 조건이 `todayS > 0`이라 **0이면 항목이 DOM에서 빠진다**(0으로 표시되는 게 아님). ①번 `duration_sec=0`과 같은 뿌리.
  - ⑥ **로그인 시 잔여 누적시간이 `page_sessions`에 안 들어감** (2026-07-04 `PLAN_page_sessions_on_login.md`로 기획됐으나 **미구현 — 2026-07-17 코드 실측 확인**) — `page_sessions` INSERT는 [supabase-client.js:1022](../assets/js/supabase-client.js#L1022) `_syncTimeToDBNow(uid, insertPageSession=true)` **한 경로뿐**이고 이건 `visibilitychange`(탭 숨김)에서만 호출된다. **heartbeat는 `insertPageSession=false`로 부르고**([:972](../assets/js/supabase-client.js#L972)), **`beforeunload`/`pagehide`는 `_flushTime`(localStorage 전용)만 부른다**([:1034~1041](../assets/js/supabase-client.js#L1034)). → visibilitychange가 안 뜨거나 async INSERT가 못 끝난 세션의 시간은 `profiles.total_minutes`에만 남고 `page_sessions`엔 영영 안 들어감(= 월별/주별 차트와 '전체' 수치의 구조적 불일치).
    - **당초 문제("월별 차트에 나나만 보임")는 해소된 것으로 보임** — `page_sessions` 10,975행(최근 7일 753)으로 폭넓게 수집 중. 탭을 닫아도 브라우저가 unload 전에 `visibilitychange`(hidden)를 먼저 쏘기 때문으로 추정(미검증). **즉 급한 건 아니고, 남은 건 위 "영영 안 들어가는 잔여분"뿐.**
    - **기획됐던 해법**(삭제된 PLAN, `git show 4838691^:docs/PLAN_page_sessions_on_login.md`로 복원 가능): `upsertProfile`에서 `accumulated > 0`이면 `page_sessions` INSERT 추가, `entered_at`은 `_sessionEnterAt` 폴백. 중복 삽입은 `_popAccumulatedSecs`가 localStorage를 이미 비운 뒤라 없음. 착수 시 이 설계 재검토부터.
  - ⑤ **가상 페이지 키↔라벨 정합성** — 2026-07-16 커밋 aaa0b1d로 현재 9개 키 전부 라벨 보유. **신규 `_trackPvOnce` 키 추가 시 `page-labels.js` 동시 갱신 필요**(안 하면 관리자에 slug 노출, 조용히 발생). 이번에 meeting·other-board가 그 상태였음.
  - **성격**: 대부분 "추적 로직 설계"(heartbeat 타이밍·기기 단위 세션) 문제라 Red + Plan 필수. 코드 리팩토링보다 **집계 모델 재설계**에 가까움. 착수 전 ①~④ 중 실제로 고칠 것을 먼저 확정할 것(②는 소급 불가라 대상 아님).
- [ ] **[조건부 트리거] `game_play_records` ~1500행 도달 시 `getUserFirstRecordCount` RPC 재검토** (R8 재검증 결론, 2026-07-16 — REFACTOR_CHECKPOINT.md "Phase 2 SC5"에만 있던 것을 2026-07-17 여기로 보존) — 현재 테이블 **60행**(실측)이라 성능 문제 없음이 확인돼 RPC 전환은 **선제적 과최적화로 보류**. 단 함수가 `.in('game_id', myGameIds).limit(2000)`이라 **유저 게임들의 누적 기록이 2000행을 넘으면 ascending limit이 일부 게임의 최초 기록을 누락**해 업적 오지급이 가능(정확성 엣지). 지금 대비 ~33배 규모. **행수가 1500 근처에 오면 재검토**할 것.
- [ ] price-rules.html / club-rules.html 사진 중심 재구성
- [ ] **기록게시판 디자인 개선** — 현재 너무 밋밋, 전반적 비주얼 리뉴얼 필요
  - 🧹 **겸사겸사**: 이 작업이 `game-reviews.js`를 만지므로, GS5(escH 통합)의 **이 파일 로컬 사본 2개**([:85](../assets/js/game-reviews.js#L85)·[:583](../assets/js/game-reviews.js#L583))를 그 자리에서 `window.escH` 호출시점 위임으로 함께 정리하면 GS5 일부가 해소됨. 상세는 [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md) GS5 행.
- [ ] **[보안] meeting 계열 쓰기 보호** (2026-07-15 조사 완료, **사용자 결정=문서화 후 보류**) — `meeting_votes` / `meeting_vote_games` / `meeting_game_prefs` 전체 현재 UNRESTRICTED (anon 키로 전체 읽기/쓰기/삭제 가능).
  - **위협 모델**: 서버측 신원 증명 부재가 근본 원인. 클라이언트가 `user_id`(카카오 id)를 자기 주장할 뿐 검증 단계 없음 → anon 키(페이지 소스에 노출, 정상)만 알면 아무 user_id로나 남의 일정 write/delete 가능. **단 meeting 테이블엔 금융·PII 없음**(날짜/시간/게임선호/닉네임) → 실제 위협은 "REST 직접 호출 가능한 사람이 동호회 일정 훼손·사칭" 수준, 심각도 중간 이하.
  - **범위 주의**: 이건 meeting만의 문제가 아님. 카카오 OAuth라 `auth.uid()` NULL → **전체 테이블이 RLS off + anon 키 직접 write** 동일 구조(game_likes, game_play_records, profiles, member_intros …). meeting만 고치면 반쪽.
  - **쓰기 호출부 8개**(전부 supabase-client.js): `upsertMeetingVote`/`deleteMeetingVote`(votes), `addMeetingVoteGame`/`setMeetingVoteGamePriority`/`setMeetingVoteGameCondition`/`removeMeetingVoteGame`(vote_games), `saveMeetingGamePref`/`deleteMeetingGamePref`(game_prefs).
  - **근본 해결 = Edge Function + 카카오 토큰 검증**: 클라가 카카오 액세스 토큰 동봉 → Edge Function이 kakao `/v2/user/me`로 신원 서버검증 → service_role로 user_id 일치 행만 write. **결정적 제약**: 현재 카카오 토큰을 로그인 후 저장 안 하고 버림([auth-callback.html:86](../auth-callback.html#L86)) → **토큰 저장·refresh 흐름을 신규 구축**해야 하고 만료 시 write 실패 UX 처리 필요. 추가로 Edge Function 배포 인프라(Supabase CLI, 지금까지 SQL Editor만 사용 — **배포 권한/환경 확인 선행**) + 마이그레이션 010(테이블 잠그고 Edge Function만 write).
  - **착수 조건**: Red, Plan 모드 + Opus xhigh 고정. 착수 전 ①Edge Function 배포 가능 환경인지 ②meeting만 vs 앱 전체 범위 재확정. RLS UNRESTRICTED 배지는 그때까지 의도적 유지.

### V4 아이디어 (장기, 구현 미정)

유저당 플레이 기록 20건 이상 누적 시 의미있는 분석 가능.

| # | 기능 | 필요한 데이터 |
|---|------|--------------|
| 1 | **게이머 성향 분석** — "전략형/파티형/탐험형" 분류 | game_play_records, 게임 태그 |
| 2 | **연말 플레이 리포트** — "올해 N종 탐험" 등 | game_play_records(연도별 집계) |
| 3 | **유저 취향 매칭** — 비슷한 패턴의 다른 유저 추천 | game_play_records, game_ratings |
| 4 | **개인화 게임 추천** — 미플레이 유사 게임 추천 | game_ratings, 게임 태그/장르 유사도 |
| 5 | **모임 추천** — 성향 분석 기반 | game_play_records.group_name |
| 6 | **다른 사람 성장보드 구경하기** — 타 유저 성장 현황 열람 | user_achievements, profiles |
| 7 | **나는 어떤 보드게이머일까?** — 연말 성향 분석 리포트 | game_play_records, game_ratings |

---

## 4. 위험한 데이터 흐름

### 4-1. 닉네임 손상 체인

auth-callback: DB 닉네임 조회 fallback 있음. upsertProfile: DB 닉네임 ≠ 카카오명이면 기존 유지. selectError 시 닉네임 필드 업데이트 제외.

### 4-2. 이용시간 데이터

_syncTimeToDBNow 성공 시에만 timeSec=0. upsertProfile selectError 시 시간 필드 업데이트 제외 (0 덮어쓰기 방지).

### 4-3. 다기기 localStorage 의존

| 기능 | 복원 방식 |
|------|----------|
| 커스텀 닉네임 | DB 조회로 복원 |
| 커스텀 사진 | DB photo_url 조회로 복원 |
| 별점 기록 | user_id 기반 → 다기기 중복 방지 |
| 코멘트 소유권 | user_id 기반 → 다기기 삭제 버튼 표시 |

