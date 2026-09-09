# PROJECT_STATE — 코티지보드 현재 상태

최종 갱신: 2026-09-10

> 이 문서는 세션을 다시 시작할 수 있게 **열린 상태와 그 재개 맥락**만 보관한다. 완료한 변경·검증의 상세는 git commit, 계속 유효한 구조·데이터 계약은 도메인 문서가 정본이다. 완료 목록·커밋 목록·세션 회고는 여기서 제거한다.

## 0. 현재 상태

- 현재 승인된 구현 작업은 없다. 최근 완료된 공통 계약은 Host-relative presentation stack inheritance와 stable `user_id`/public `member_intros.nickname` identity 분리다. 구조·navigation은 [UI_STRUCTURE.md](UI_STRUCTURE.md)·[UI_PATTERNS.md](UI_PATTERNS.md), identity·participant resolver는 [js-api.md](js-api.md)를 정본으로 쓴다. 완료 근거는 git과 [DEBUGGING_HISTORY.md](DEBUGGING_HISTORY.md)에 둔다.

## 1. NOW

- 없음.

## 2. NEXT (자동 착수 금지)

1. **게임 데이터 확인** — 대상: 보유 게임 목록의 스위트랜드·파수꾼. 현재: 스위트랜드는 미등록, 파수꾼은 `active/incoming`이며 페야의늪은 `active/heavy_strategy`로 이미 의도와 일치한다. 기대 결과: 스위트랜드를 BGG ID `425445`로 추가하고, 파수꾼을 `active/easy_coop`(쉬운 협력게임)으로 옮긴다. 완료: 원본 xlsx·master·출력 데이터가 같은 분류/게임을 가리키는지 확인한다. 스위트랜드의 배치 위치는 사용자 확인 대기다.
2. **가입경로 보드라이프** — `member_intros.join_sources` 허용 목록·입력 UI·표시 라벨·최신 RPC 마이그레이션을 함께 바꾸는 Red Plan 승인 후 구현한다.
3. **모임 보드 → 플래너 미리보기 scroll** — 진입 시 중간 scroll position에서 시작하는 문제의 target, 이벤트, 실제 scroll owner와 클릭 전후 rect를 측정한 뒤 플래너의 올바른 시작 위치로 수정한다.
4. **플레이 기록 accordion 위치 보정** — 날짜별/모임별 accordion의 열린 header가 닫힌 상태보다 높아지지 않게 하고, 페이지 하단에서도 `compensateHeaderPosition`이 클릭 header viewport 위치를 유지하도록 실제 부족 scroll 여유를 조사한다.
5. **게임위치 scroll boundary** — geometry와 표시 지연은 사용자 실화면 통과했다. 별도로 남은 game-location scroll bug가 있으면 실제 scroll owner/boundary와 iframe/local overlay 전달 경로를 확인한다.
6. **홈페이지 기능 child route 공통화 리팩터링** — 기능별 위임 분기와 URL 조립을 공통 child 요청/route registry 계약으로 정리하는 별도 Plan 후보다. 독립 URL·일반 embed·작은 sheet는 유지한다.
7. **추천 전체보기 상단 과대 영역** — `홈페이지 기능 → 추천게임찾기 → 게임 더 찾기 → 전체보기`의 Host X와 제목 영역이 중복 점유하는지 사용자와 같은 URL·viewport에서 shell/header/divider rect로 먼저 판정한다.
8. **AGENTS canonical 기능 재사용·embed/iframe 원칙 점검** — embed는 기존 기능의 표시 방식이며 duplicate renderer/state/handler를 만들지 않고 canonical renderer·markup·state·validation·save·auth·event logic을 우선 재사용한다는 원칙이 현재 AGENTS에 충분히 있는지 검토한다. embed 분기는 layout/chrome 숨김으로 최소화하고, preload가 auth·진입 가능 여부·user flow를 바꾸지 않으며 인증은 실제 제한 action 가까이에 둔다는 점도 확인한다. 새 embed 전용 구조가 필요하면 canonical 재사용 불가 사유를 먼저 명시한다. 이번에는 AGENTS를 수정하지 않는다.

## 3. BACKLOG (자동 착수 금지)

| 항목 | 남은 확인 | 재개·판정 경로 |
|---|---|---|
| 레거시 프로필 취향 | `profiles.preferred_game_depths`·`profiles.avoid_tags`가 새 설문 출력에 다시 섞이지 않는지 | 새 설문 정본은 `member_intros`; [UI_MAP.md](UI_MAP.md)와 [db-schema.md](db-schema.md)의 계약을 따른다. |
| 자기소개 제출·교환권 | 최초 제출 1회 지급, 재수정 미지급, PC/모바일 입력 화면 | [db-schema.md](db-schema.md) 023과 [js-api.md](js-api.md) `submitMemberIntro`. 기존 자동 검사는 통과했으나 실사용 경로 확인이 남음. |
| 사진 연동 | 내 미연동 기록이 정확히 1건인 게임에서 사진 추가 후 `연동하기`가 기존 기록에 병합되는지 | [js-api.md](js-api.md) `_confirmLinkOrPlain`. 실제 파일 선택·업로드 클릭만 미확인. |
| 플래너 다른 날짜 동기화 | 실제 폰에서 토글이 반응하는지, 수정 진입 시 노출 조건이 이해되는지 | 등록일 2개 선택 → ON → 기존 게임 보존·신규 반영 → 삭제 시 사본 제거. 수정 화면에서는 Step1에서 날짜를 추가해야 토글이 보이는 것이 정상. |
| `record_complete` 분석 이벤트 | 운영 URL의 비관리자 계정으로 기록 저장 시 `page_events`에 쌓이는지 | [db-schema.md](db-schema.md) `page_events`. 관리자 플래그 또는 localhost에서는 의도적으로 추적되지 않으므로 다른 기기/시크릿 창의 실제 비관리자 계정이 필요하다. |
| 업적 2건 | 게임평 진행도, 기존 기록에 사진·참여자 수정으로 임계값을 넘겼을 때 업적이 즉시 반영되는지 | 커밋 `22488d7`, `7a1b68d`. 브라우저 실확인만 남음. |
| 추천게임 코스·QR | 실제 폰에서 sticky 바가 헤더 아래에 붙는지, 배포 뒤 QR이 코스 탭까지 이동하는지 | 배포된 URL에서만 확인 가능. |

## 4. BACKLOG — 사용자 판단 대기 (자동 착수 금지)

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

## 5. DEFERRED / TRIGGER (자동 착수 금지)

- **Active-view 페이지 분석 실사용 검증** — 구현 완료, 정적 검증 완료, 격리 브라우저 전송 검증 완료. 남은 완료조건은 실제 일반 사용자 계정의 운영 surface(대표 센터모달·바텀시트·iframe) 행동 뒤 `page_sessions` 및 관리자 페이지 `페이지` 분석 표시를 확인하는 것이다. 현재 차단 조건은 일반 사용자 테스트 계정 없음이며, 일반 사용자 테스트 계정 확보 또는 실제 일반 사용자 검증 가능 시 재개한다. 상세: [PLAN_active_view_tracking.md](PLAN_active_view_tracking.md).
- **보드 sticky 헤더 우선순위** — 수집 보드와 프로필 보드의 UI 후보다. 각 보드 scroll container 안에서 현재 섹션 하나만 고정하며, 여러 보드를 건드리는 Yellow 작업이므로 별도 Plan과 변경안 승인 뒤에만 착수한다.
- **Legacy naming migration** — 다음 점검: 현재 큰 기능 묶음 완료 후. 구조 안정화·의존관계 파악·회귀 검증·호환 전략·반복 혼선 여부를 함께 판단하며, 트리거는 검토 시작 시점일 뿐 실행 확정이 아니다. 상세 기준은 [명칭 정합성 조사 Plan](plans/naming-alignment-audit-plan.md)을 따른다.
- **최근 참여 데이터 모델** — [모임 참여 데이터 Plan](plans/meeting-participation-data-plan.md)에 따라 데이터 관계와 범위를 먼저 확정한 뒤 재검토한다.
- BGG 영구 미연결 게임의 수동 기본정보는 `build:master` 실행 시 초기화될 수 있다. 해당 작업 전 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 최상단의 보존 한계를 확인한다. 근본 해소는 별도 파이프라인 설계다.
- `game_play_records`가 약 1,500행에 가까워지면 `getUserFirstRecordCount`의 RPC 전환을 재검토한다. 정확성 위험과 근거는 [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md)에 있다.

## 6. 작업별 정본

- 페이지 구조·렌더 경로: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- DB·RLS·RPC: [db-schema.md](db-schema.md)
- 공개 JS API·반환 계약: [js-api.md](js-api.md)
- localStorage·세션: [ls-schema.md](ls-schema.md)
- UI·sticky·modal: [DESIGN_RULES.md](DESIGN_RULES.md)
- 관리자 분석: [admin-analytics.md](admin-analytics.md)
