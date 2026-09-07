# PROJECT_STATE — 코티지보드 현재 상태

<!-- ACTIVE-VIEW REGISTRY REVIEW 2026-09-07 -->
- Follow-up requested: administrator page → `페이지` tab → `페이지 추적` must include currently untracked meaningful center modals and bottom sheets in its page-session view distribution. Use the active-view registry and the confirmed overlay inventory when implementing; preserve the distinction from `page_views` and do not count short toast/menu/confirm UI.
- Decision: extend existing `assets/js/page-labels.js`; do not create a parallel inventory file or move overlay lifecycle ownership. It already loads before `script-nav.js` on all relevant pages and is the display-label SSOT consumed by admin/member analytics.
- Proposed implementation for Commit B: add a consumed `window.COTTAGE_ACTIVE_VIEWS` registry whose entries have a stable `key`, display `label`, and `v2Only` classification. Each owner file looks up its entry/key and retains its own open/close lifecycle. `COTTAGE_PAGE_LABELS` remains the analytics display map; the active registry supplies its matching labels to avoid a second manually maintained label list.
- Keep `MemberAnalytics.V2_ONLY_PAGE_KEYS` in `member-analytics.js`, because it is a v2-cutoff calculation contract, not a UI registry. Add a small static verifier that every registry entry marked `v2Only` is present there and has a page label. Existing real-page reuse such as the home record iframe → `game-reviews` stays explicitly non-v2-marker, preventing historical v1 rows from becoming cutoff markers.
- Scope for the registry: existing tracked views plus confirmed missing targets: recommendation condition/list; game cover/rule/comment/photo/play; photo lightbox; board records iframe/wizard; game-search; meeting-day-picker; game/taste add; guide iframe. Exact keys are to be selected while wiring, favoring one key for one user-visible, long-lived view and reusing an existing key only when the same screen meaning is truly identical.

<!-- ACTIVE HANDOFF 2026-09-07: analytics preparation + active-view overlay audit -->
- Current objective: first commonize the read-only `page_sessions` preparation pipeline between administrator analytics and owner-only member analysis; then complete active-view wiring for every meaningful topmost overlay.
- Detailed active-view plan: `docs/PLAN_active_view_tracking.md`. The user approved this direction and required the full inventory before edits; inventory was reported in the session conversation.
- Commit A complete: `MemberAnalytics.preparePageSessions(rawRows)` now owns normalization, 3-second adjacent twin collapse (longest duration and external-referrer preference), and v2 preparation. The admin chooses its population first and consumes `{rows,v2Cutoff,rowsV2}`; `kakao-auth.js::_renderAdminMemberBoard` consumes `prepared.rows`. DB rows and `profiles.total_minutes` remain unreconciled.
- Commit B complete: active-view tokens now cover recommendation condition/list; game cover/rule/comment/photo/play; common photo lightbox including iframe-parent messages; board iframe/wizard; add-search/day-picker/taste overlays; and guide iframe. Existing connected targets remain unchanged; toast/menu/autocomplete/short confirmations and admin-only sheets stay excluded.
- Stack edge complete: `popActiveView` removes a matching non-top token without switching the visible label, while duplicate/unknown tokens stay no-op. The verifier covers nested return, reverse close, duplicate close, visibility, registry v2/label agreement, and the 3-second cutoff.
- Historical data: do not lower/rewrite page views. Overlay returns do not call page-view tracking; duplicate session effects are read-time deduped. Any data rewrite needs a separate evidence-based approved plan.

최종 갱신: 2026-09-07

> 이 문서는 세션을 다시 시작할 수 있게 **열린 상태와 그 재개 맥락**만 보관한다. 완료한 변경·검증의 상세는 git commit, 계속 유효한 구조·데이터 계약은 도메인 문서가 정본이다. 완료 목록·커밋 목록·세션 회고는 여기서 제거한다.

## 0. 현재 상태

- 시간 단위 표시: 2026-09-07 `profiles.total_minutes`의 legacy 이름과 실제 seconds 단위를 코드·도메인 문서에 명시하고, 오너 전용 회원 분석의 60배 표시를 수정했다. 다음 별도 후보는 관리자와 회원 분석의 `page_sessions` 중복 제거·집계 경로를 같은 지표인지 먼저 조사하는 일이며, 누적 `profiles` 값과 맞추는 작업은 아니다.
- 현재 작업: P1 시각 회귀와 P2 데이터 정합성 조사를 완료했다. 다음 UI 작업은 별도 Plan·Yellow 승인 후 시작한다.
- 상세 Plan: [보드 상호작용 회귀](plans/board-interaction-regressions-plan.md) · [모임 참여 데이터](plans/meeting-participation-data-plan.md) · [명칭 정합성 조사](plans/naming-alignment-audit-plan.md)
- 현재 단계: 최근 참여의 모임 단위 개편은 데이터 관계가 불명확해 구현 보류다. `game_play_records`에는 모임 ID가 없고 `meeting_votes`는 참여 등록이므로 날짜만으로 결합하지 않는다.
- P2 조사 결론: 2026-09-07 읽기 전용 감사에서 프로필 46개·기록 122개를 확인했고, 공백 제거 후 닉네임 충돌은 0쌍이었다. `덕지` 태그 20회는 `덕 지` 회원으로 안전하게 해소할 수 있는 후보다. 단, 통계·알림·업적의 DB 검색은 아직 원문 닉네임을 사용하므로 보정은 누적 수치에 영향을 준다. `game_play_records`에는 모임 ID가 없어 이를 실제 모임 참석으로 승격하거나 날짜·이름으로 결합하지 않는다. DB/API·수치 보정 범위의 별도 Plan 승인 없이는 구현하지 않는다.
- 인수인계: 가장 어려웠던 게임은 기존 `profile_hardest_games` 정본을 유지하고 위저드 편집으로 이동한다. 최초 작성 쿠폰 partial unique 보장은 변경하지 않는다.
- 승인 대기: `AGENTS.md` embed·iframe 재사용 원칙 추가(Yellow), 가입경로 `보드라이프` 추가(DB 값/입력 경로 확인 후 Plan 여부 판단).
- 현재 버그: 게임도감 전체보기 전환 시 시작줄이 살짝 위로 올라오는 증상은 상세 조건 설명 대기.

### 다음 시작점

1. **명칭 정합성 audit 완료** — 내부 지역 `openAdminBS`와 문서의 이전 함수명 참조를 정리했다. 현재 추가 rename 필요 없음; URL·DB·analytics·storage·routing·공개 API는 legacy 계약으로 유지한다.
2. **P2 데이터 정합성** — 조사 완료. 공백 제거 후 정확 토큰 일치 후보는 프로필 충돌 0쌍으로 안전성이 확인됐지만, 통계·알림·업적 수치 보정 및 모임 단위 연결은 별도 승인 Plan이 필요하다. 누적 체류시간 감사는 회원 카드의 당일 표시를 `rowsV2` 세션·heartbeat 중 큰 값으로 보완해 닫음(`admin-analytics.md` ⑦).
3. **P3 기능·콘텐츠** — 메인 모임 미리보기의 모임원 프로필 링크, 게임 위치 2건·보유게임 1건, 가입경로 보드라이프.
8. **보류/Plan 필요** — 최근 참여의 데이터 모델은 [모임 참여 데이터 Plan](plans/meeting-participation-data-plan.md)을 따른다. AGENTS.md 재사용 원칙 문서 반영은 별도 승인 완료 전까지 보류한다.

## 1. 사용자 확인 대기

| 항목 | 남은 확인 | 재개·판정 경로 |
|---|---|---|
| 레거시 프로필 취향 | `profiles.preferred_game_depths`·`profiles.avoid_tags`가 새 설문 출력에 다시 섞이지 않는지 | 새 설문 정본은 `member_intros`; [UI_MAP.md](UI_MAP.md)와 [db-schema.md](db-schema.md)의 계약을 따른다. |
| 자기소개 제출·교환권 | 최초 제출 1회 지급, 재수정 미지급, PC/모바일 입력 화면 | [db-schema.md](db-schema.md) 023과 [js-api.md](js-api.md) `submitMemberIntro`. 기존 자동 검사는 통과했으나 실사용 경로 확인이 남음. |
| 사진 연동 | 내 미연동 기록이 정확히 1건인 게임에서 사진 추가 후 `연동하기`가 기존 기록에 병합되는지 | [js-api.md](js-api.md) `_confirmLinkOrPlain`. 실제 파일 선택·업로드 클릭만 미확인. |
| 플래너 다른 날짜 동기화 | 실제 폰에서 토글이 반응하는지, 수정 진입 시 노출 조건이 이해되는지 | 등록일 2개 선택 → ON → 기존 게임 보존·신규 반영 → 삭제 시 사본 제거. 수정 화면에서는 Step1에서 날짜를 추가해야 토글이 보이는 것이 정상. |
| `record_complete` 분석 이벤트 | 운영 URL의 비관리자 계정으로 기록 저장 시 `page_events`에 쌓이는지 | [db-schema.md](db-schema.md) `page_events`. 관리자 플래그 또는 localhost에서는 의도적으로 추적되지 않으므로 다른 기기/시크릿 창의 실제 비관리자 계정이 필요하다. |
| 업적 2건 | 게임평 진행도, 기존 기록에 사진·참여자 수정으로 임계값을 넘겼을 때 업적이 즉시 반영되는지 | 커밋 `22488d7`, `7a1b68d`. 브라우저 실확인만 남음. |
| 추천게임 코스·QR | 실제 폰에서 sticky 바가 헤더 아래에 붙는지, 배포 뒤 QR이 코스 탭까지 이동하는지 | 배포된 URL에서만 확인 가능. |
| 프로필 수정 iframe footer | 사용자 확인으로 이전/다음 footer가 정상 노출·동작함 | 2026-09-07 확인 완료 — 열린 구현 작업에서 제외. |
| 아코디언 하단 위치 보정 | 사용자 확인으로 페이지 최하단에서도 클릭 헤더 위치가 보존됨 | 2026-09-07 확인 완료 — 열린 구현 작업에서 제외. |

## 2. 열린 구현 작업

### 약칭 출처 분류

- 현재 ID 정본 294키는 `레거시 값 유지·복원 135키/137행`, `fallback 충돌 해결값 유지 155키/160행`, `이후 개별 추가 4키/4행`으로 배타 분류됐고 미분류는 없다.
- 종료 조건: `audit-abbr-migration.js` 출력에 이 분류를 고정하고, 두 TSV의 `bgg-id`/`manual-abbr-missing` 표기를 각각 `ID 명시 약칭`/`fallback 사용` 계열로 정리한 뒤 집합 대조가 통과한다.
- 보존 경계: 약칭 값 정본은 `game-abbr.json`과 `game-abbr-byname.json`뿐이며, 산출물·manifest·구 레거시 파일에는 새 값을 추가하지 않는다. 상세 계약은 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) §8.

## 3. 보류·사용자 판단 대기

| 항목 | 현재 판단 | 재개 조건 |
|---|---|---|
| 보드게이머 유형검사(MBTI식) | 신규 DB 구조·화면 설계가 필요한 별도 기능 | 사용자가 구현을 다시 요청하면 Plan부터 작성 |
| Kakao Make 알림 토큰 만료 | 원인은 만료된 Kakao refresh token. 사용자가 “나중에”로 보류 | 토큰 재발급 또는 Discord 웹훅 전환 선택/URL 제공 |
| 참여자 이름 5건의 회원 연결 | `춘팝·도라·준혁·지인·호핀`이 실제 회원인지 미확정. `도라`와 `돠`는 혼동 가능 | 사용자 확인 뒤에만 연결. 재측정 시 `node scripts/audit-nick-click.js --negctl` |
| 외부 인프라 확인 | Supabase·Vercel 요금/한도, 도메인 만료, Kakao 앱 상태는 사용자 소유 | 사용자가 확인 결과를 공유 |
| 에러 관측 시스템 | 브라우저 `console.error` 밖으로 수집하지 않는 한계는 남아 있음 | 필요성 확정 시 Red/Plan으로 별도 설계 |
| 모임 데이터 쓰기 보호 | Kakao 인증에 서버측 신원 검증이 없어 anon 클라이언트가 `user_id`를 자기 주장할 수 있다. meeting만 보호하면 같은 구조의 다른 쓰기 경로는 남는다 | 범위(meeting만/전체)와 Edge Function 배포 환경을 확정한 뒤 Plan |
| 한줄소개 GPT 연동 | 이전 기획의 입력·출력 기준이 복원되지 않음 | 사용자가 원하는 경험을 다시 설명 |
| 취향보드 Phase 2 | 성향 5축의 정책·표현이 미확정 | Phase 1 사용자 검토 후 재개 |

## 4. 조건부 작업과 위험 계약

- **보드 sticky 헤더 우선순위** — P2 데이터 정합성 다음의 UI 작업 후보. ① 수집 보드의 업적·캐릭터·칭호·도감, ② 프로필 보드의 좋아하는 게임·해보고 싶은 게임 순으로 적용한다. 각 보드 scroll container 안에서 현재 섹션 하나만 고정하고, 기존 시각 스타일은 유지한다. ③ 모임 보드 `최근 참여`는 모임 단위 데이터 모델이 확정된 뒤에만 적용한다. 여러 보드를 건드리는 Yellow UI 작업이므로 착수 시 별도 Plan과 변경안 승인을 받는다.
- **Legacy naming migration** — 다음 점검: 현재 큰 기능 묶음 완료 후. 구조 안정화·의존관계 파악·회귀 검증·호환 전략·반복 혼선 여부를 함께 판단하며, 트리거는 검토 시작 시점일 뿐 실행 확정이 아니다. 상세 기준은 [명칭 정합성 조사 Plan](plans/naming-alignment-audit-plan.md)을 따른다.
- BGG 영구 미연결 게임의 수동 기본정보는 `build:master` 실행 시 초기화될 수 있다. 해당 작업 전 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 최상단의 보존 한계를 확인한다. 근본 해소는 별도 파이프라인 설계다.
- `game_play_records`가 약 1,500행에 가까워지면 `getUserFirstRecordCount`의 RPC 전환을 재검토한다. 정확성 위험과 근거는 [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md)에 있다.
- 닉네임 보호·체류시간 원자 증가·다기기 프로필/사진 복원은 열린 작업이 아니라 현재 계약이다. [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) §3~5, [db-schema.md](db-schema.md) `increment_profile_counters`, [ls-schema.md](ls-schema.md)를 정본으로 사용한다.
- `openProfilePanel`의 서브시트 라우팅·backTo·비동기 렌더 주의는 [js-api.md](js-api.md)를 정본으로 사용한다. 이 문서에 사본을 만들지 않는다.
- `task-continue` 훅은 다음 긴 미완 작업에서만 검증한다: 작업 파일을 여는지, 질문 뒤 이어가는지, 진전 없이 반복하지 않는지. 실패하면 더 고치지 않고 훅을 폐기한다.

## 5. 작업별 정본

- 페이지 구조·렌더 경로: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- DB·RLS·RPC: [db-schema.md](db-schema.md)
- 공개 JS API·반환 계약: [js-api.md](js-api.md)
- localStorage·세션: [ls-schema.md](ls-schema.md)
- UI·sticky·modal: [DESIGN_RULES.md](DESIGN_RULES.md)
- 관리자 분석: [admin-analytics.md](admin-analytics.md)
