# REFACTOR_CHECKPOINT — 리팩토링 감사 기록

생성: 2026-06-20 · **압축: 2026-07-17** (475 → 이 크기)

**남긴 것**: 아직 열린 항목 + 되돌리면 손해인 판단 + 재사용 가치가 있는 교훈.
**지운 것**: Phase 1(MD 감사)·Phase 2(JS 파일별 감사) 상세, Phase 2 요약, 처리 현황(136차), R11 사전조사, R9 결과 메모 — 전부 R1~R12로 처리 완료됐고 상세는 git log에 있다.
**이관**: 감사 항목 중 처리되지 않은 잔여분(PU5·ACH2·SC6 등)은 [PROJECT_STATE §3 「Phase 1~3 감사 잔여 항목」](PROJECT_STATE.md)으로 옮겼다(2026-07-17 실측 결과 포함). ⚠️ **감사 항목을 다시 찾을 땐 그 목록을 볼 것 — 이 문서엔 더 이상 없다.**
> ⚠️ **감사 항목의 "영향" 기재를 믿고 우선순위를 매기지 말 것** (2026-07-17 GDA3 교훈): GDA3는 이관 목록에서 **"유일하게 실동작 영향 가능"**으로 분류돼 §0 우선순위 2번까지 올라갔으나, 재검증하니 **소비처 0건인 dead code라 영향이 0**이었다. 감사는 코드 구조만 보고 **소비처를 확인하지 않은 채 영향을 추정**한다. → 착수 전 재검증 필수라는 기존 경고는 "코드가 바뀌어 stale"뿐 아니라 **"애초에 영향 판정이 틀렸을 수 있다"**까지 포함한다.

---

## 진행 요약 — R1~R12 전부 완료 (2026-07-15 ~ 07-17)

| 세션 | 항목 | 결과 |
|------|------|------|
| R1 | 그린 배치(dead code·중복 통합) | ✅ `buildGameBody` 삭제 · KA5/KA6 정리 · GR6 전역 4개 내부화 |
| A1 | Phase 3 감사(대형 파일 3개) | ✅ 아래 「Phase 3」 절 |
| R2 | 옐로 배치(ACH1·ACH3·KA4·검색모달 DRY) | ✅ `AXIS_ORDER` 단일화 · `_openGameAddSearchModal` 추출. **KA4는 종결(아래 판단 참조)** |
| R3 | KA2·KA3 | ✅ KA2 무해 종결 · KA3 `_safeInt` regex 파싱 제거(build 함수가 `{html,count,total}` 반환) |
| R4 | PU2 blob URL 누수 | ✅ `revokePhotoGridBlobs` 헬퍼 + 호출처 6곳 |
| R5 | SC1 LIKE 이스케이프 | ✅ 코드변경 없음 — `_escapeLike`가 이미 적용돼 있었음(감사 stale) |
| R6 | ACH5 소급지급 side-effect 분리 | ✅ `grantRetroAchievements` public 승격 + readOnly write 버그 수정 |
| R7 | GDA2 + GS3 | ✅ GDA2는 이미 IIFE(감사 stale). 실질은 GS3 — 죽은 `window.getAllGamesArray` 노출 제거 |
| R8 | SC4/SC5 성능 | ✅ 코드변경 없음 — SC4는 이미 count/head, SC5는 테이블 60행 규모. **RPC 재검토 트리거는 PROJECT_STATE §3에 등록** |
| R9 | GR3 과대함수 | ✅ 추출 4건 → `renderInputPanel` 287→65 · `renderRecords` 367→212. 파생 버그 1건 별도 fix(90997f0) |
| R11a/b/c | GS1·GS6·GS2 | ✅ `openGameSheet` 321→187 · 과대함수 3건 분리 · **파일 IIFE화**(99개 중 39 노출·60 은닉) |
| R12 | DD1 day-detail 과대함수 | ✅ `openDateMeetingModal` 273→58 · `openDateScheduleModal` 174→67 |
| R10a | KA1 `openProfilePanel` 추출 | ✅ **1,940→918줄**(서브시트 6블록 1,043줄 모듈화) |
| R10b | 크로스보드 stale | ✅ 방향 A(진입 시 재조회). 상세는 PROJECT_STATE §0 |
| R10c | 네비게이션(backTo) — **신규기능만**(리팩토링은 R10a, stale은 R10b) | ✅ 스모크 통과. §3-1(알림→남의 보드 복귀)·§3-2(토스트→게임시트 복귀) 해결. **"스택"은 불필요했음**. ⚠️ **부모 항목 「타인 보드 내부 네비게이션 통일」(바텀시트→센터모달)은 여전히 열림** — R10c 범위 아니었음. 상세는 PROJECT_STATE §0 |

**모델 배정 실적**: 그린 배치=Sonnet medium · 옐로 배치=Sonnet high · 구조 변경/IIFE/과대함수 분리=Opus xhigh + Plan.

---

## Phase 3 감사 (A1, 2026-07-15) — 열린 항목만

완료분(GS1→R11a · GS2→R11c · GS3→R7 · GS6→R11b · DD1/DD3→R12)은 위 표로 대체.

| # | 위험도 | 이슈 | 상세 |
|---|--------|------|------|
| GS4 | P2 | `getGameKey` 동명·다른 시그니처 | game-sheet.js:250(게임 **객체** 인자) vs game-reviews.js:14(게임 **id** 인자). 파일 넘나들 때 혼동. |
| GS5 | P2 | `escH` 사본 5곳 | `window.escH`(supabase-client) · `_escH`(play-records-utils) · `esc`(achievements) · `escH`(game-sheet) · `esc`(day-detail). ⚠️ 통합하려면 **`"` 이스케이프 차이 정리가 선행**(`_escH`는 `& < >`만, `window.escH`는 `"`까지). |
| GS7 | P2 | 난이도 헬퍼 전역 결합 | `getDifficultyData`/`normalizeLevelValue`가 game-sheet.js 정의 → game-display-adapter·script-nav·owned-games-page가 전역 참조. **IIFE로 안 풀린다**(어차피 전역 유지 대상) — 실제 해결은 헬퍼 별도 파일 분리 = 신규 파일 결정 필요. |
| DD4 | P2 | `openDateMeetingModal(voteDate, votes, voteGames, opts={})`의 **`opts` 미사용** | R12 중 발견. 공개 API 시그니처라 보존. ※같은 파일 `openDateScheduleModal`의 `opts`는 `onDirtyClosed`로 **실제 사용 중** — 혼동 주의. |
| IP1 | P1 | index-page.js 과대함수 | `renderGameCards` 208줄(5~213) · `updateRecommendFilterText` 157줄(464~621) · `initMeetingSection` IIFE 289줄(1305~1594, 내부 `renderPreview` 124줄) |
| IP2 | P2 | 구조 일관성 | 추천 관련 15+개는 상위 전역함수(onclick), 나머지 init은 IIFE — 한 파일에 두 방식 혼재, 경계 기준 불명확. |
| IP3 | P2 | 날짜 헬퍼 파편화 | `toDateStr`(index-page:930) vs day-detail `fmtDate`(368). ⚠️ **R12에서 "중복 아님"으로 판정** — 입력·출력·용도가 전부 다른 별개 함수. 통합 대상 아님. |
| DD2 | — | **(긍정) day-detail.js가 모범 구조** | IIFE 래핑 + CSS 자기주입 + window 노출 9개 전부 의도된 공개 API. game-sheet.js와 정반대 — **신규 파일 작성 시 이 구조를 따를 것**. |

**교차 파일**: escH 5사본(GS5) · 게임명 해석 4곳(KA4 — 아래 판단대로 **통합 안 함**) · `getGameKey` 2곳 다른 시그니처(GS4).

---

## 재방문 시 필요한 판단 (되돌리지 말 것)

- **KA4 — `getGameName` 3사본은 의도적으로 유지**(R2 종결). 겉보기 중복이지만 **실제로 다른 입력을 처리**한다: `window.gameData`는 **한글 슬러그** 키, `window.COTTAGE_GAMES`는 **bggId** 매칭 — kakao-auth/achievements 버전은 둘 다 처리하고 game-reviews 버전은 슬러그 조회가 없다. 게다가 game-reviews.html 로드 순서가 achievements→kakao-auth→game-reviews라 "하나를 전역 공유"도 안전하지 않다. 강제 병합 = 미보유 게임 이름표시 회귀. day-detail `resolveGameName`(4번째 변형)도 같은 이유로 제외.
- **과도분리 금지 선례 2건** — 함수가 길다고 다 쪼개지 않는다. ①`onSubmitPlayModal`(82줄, R11b): `if(editId)/else` 두 갈래로 이미 명확하고 쪼개려면 폼 값 9개를 DTO로 묶어야 해 **접두사가 붙어 diff 검증이 무력화**된다(R11a의 vm 기각과 동일 사유). ②`buildBarsInCard`(103줄, R12, 사용자 승인): 이미 **이름 붙은 nested 함수 4개**의 컨테이너라 모듈로 올리면 `voteGames`·`myVote` 스레딩으로 **호출부만 길어지고 이득이 없다**. 재방문 조건 = 그 파일을 실제로 만지다 경계가 불편해질 때.
- **GS5·GS7은 R11c(IIFE화)로 해결되지 않았다** — IIFE는 로컬 escH를 *안전하게* 만들 뿐 5사본 통합은 별건이고, GS7은 전역 유지 대상이라 IIFE와 무관. **"IIFE 했으니 끝"이라 착각 금지.**
- **DD3-esc 보류 사유** — GS5와 같은 항목인 데다, **club-schedule.html이 day-detail.js(664)를 supabase-client.js(668)보다 먼저 로드**해 IIFE 실행 시점에 `window.escH`가 undefined다(index.html은 반대 순서). 스냅샷(`const esc = window.escH`) 방식은 club-schedule에서 즉시 파손 → **로드 순서 통일이 선행 조건**.

---

## 교훈 (재사용 가치)

### ⚠️ 함수 추출 3종 함정 — `node --check`도 diff도 못 잡는다

R12 → R10a로 이어지며 실증된 것. 추출 작업 전 반드시 읽을 것.

1. **읽기 누수(R12)**: 바깥 스코프 변수를 인자 없이 참조 → **런타임 ReferenceError**. 실제로 `_buildMeetingStatsHtml`이 `voteGames`를 인자에서 누락해 모달이 즉시 터졌다. `node --check`는 문법만 보고, diff 검증은 이동만 보므로 **둘 다 통과**한다. ▶ 2026-07-17 R10c에서 **세 번째 재발**(`_notifTitle`이 라우터 블록 스코프인데 최상위 함수에서 참조) — 커밋 전 grep으로 차단.
   - **대응**: 헬퍼별로 `(바깥 지역변수) − (파라미터 ∪ 내부 선언)`이 0인지 계산. 파라미터 파싱 시 **구조분해·중첩 화살표 자체 파라미터**를 안 세면 오탐(`statChip=(icon,label,count)=>`의 `count`가 실제로 오탐났음).
2. **쓰기 누수(R10a)**: 재할당되는 캡처를 구조분해로 받으면 **복사**라 바깥에 전파되지 않는다. `node --check`·diff·**런타임 셋 다 통과하며 조용히 죽으므로 1번보다 나쁘다.** 실제 2건(`_currentBio`·`_pendingMeetingScrollTop`) — 둘 다 **접근자 콜백으로 승격**해 해결. 반면 `_allPhotoData`는 `splice` 변형일 뿐이라 참조 전달로 안전.
3. **크로스파일 갭(R11c)**: IIFE는 함수뿐 아니라 최상위 `const`/`let`도 가둔다. 사전조사가 **함수만 세어** 3건을 놓쳤고, 그대로 감쌌으면 로드 에러 없이 홈 추천·카드 이미지가 조용히 죽었다 — `DEFAULT_GAME_IMAGE`·`GameView`(→window 노출) · `gameSheet`(재할당 let → **라이브 getter**). ▶ **다음 IIFE 작업 시 "최상위 const/let의 크로스파일 bare 참조"도 함수와 함께 grep할 것.**

### 핵심 기법 — ctx + 첫 줄 구조분해로 본문 바이트 보존 (R10a)

캡처를 `ctx` 객체로 넘기고 추출 함수 첫 줄에서 `const { user, readOnly, … } = ctx;`로 **원래 이름을 복원** → 이동 본문을 한 글자도 안 고친다. R11a가 vm 객체안을 기각한 사유(`vm.` 접두사가 diff 검증을 무력화)를 구조분해로 회피. 이동 본문은 **들여쓰기까지 원본 그대로** 둘 것(template literal의 공백 = HTML 출력 바이트).

### 검사기 자체를 믿지 말 것

R10a에서 **검사기가 4번 조용히 틀렸고 음성 대조군이 전부 잡아냈다**. 교훈은 [CLAUDE.md 「검증 결과가 0건·전부 통과면 검사기 자체를 먼저 의심한다」](../CLAUDE.md)로 **승격됨(SSOT)** — 실제 사례 4건: ①bash heredoc이 정규식 백슬래시를 먹어 **아무것도 매치 못 함**(→ 스크립트는 Write 툴로 생성) ②문자열·주석 내용을 코드로 오탐 ③프로퍼티 접근(`document.body`)을 지역참조로 오탐 ④여러 줄 구조분해를 선언으로 못 읽음.

**137차의 "KA1 ✅ 완료" 오기재**도 같은 뿌리 — 실측 없이 완료로 적어 R10a 때까지 방치됐다(실제론 843→1,972줄로 **더 커져 있었음**). **줄 수는 추측하지 말고 셀 것.**

**검사 스크립트는 세션 스크래치패드에만 있다**(`capture.js`/`writes.js`/`leak.js`/`move.js`/`bodydiff.js`) — 착수 시 재작성 필요. 상설화하려면 `scripts/`에 신규 파일 = 별도 승인.

---

## 세션 전환 규칙

CLAUDE.md 모델 전환 원칙대로, 매 항목 시작 직전 현재 활성 모델이 그 항목에 맞는지 확인하고 다르면 멈추고 전환 요청. 그린/옐로는 Plan 없이 진행, Red는 착수 전 Plan 작성 → 승인 필수.
