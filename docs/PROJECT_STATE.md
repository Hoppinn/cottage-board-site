# PROJECT_STATE — 코티지보드 현재 상태

최종 갱신: 2026-09-10

> 이 문서는 세션을 다시 시작할 수 있게 **열린 상태와 그 재개 맥락**만 보관한다. 완료한 변경·검증의 상세는 git commit, 계속 유효한 구조·데이터 계약은 도메인 문서가 정본이다. 완료 목록·커밋 목록·세션 회고는 여기서 제거한다.

## 0. 현재 상태

- 대표 캐릭터 identity icon의 후속 조정(공통 기본 발바닥 fallback, C/E 20px·D 12px, 게임정보 D 두 경로 hydrate)은 코드·정적 검증·문서 동기화까지 완료했다. 승인된 상세 Plan은 [representative-character-identity-icon-plan.md](plans/representative-character-identity-icon-plan.md)이며, C/D/E 실화면 재확인만 남았다. 구조·navigation은 [UI_STRUCTURE.md](UI_STRUCTURE.md)·[UI_PATTERNS.md](UI_PATTERNS.md), identity·participant resolver는 [js-api.md](js-api.md)를 정본으로 쓴다.
- 플레이기록 사람 표시·저장 보강의 정본은 [play-record-people-display-plan.md](plans/play-record-people-display-plan.md)다. `player_names`는 전체 입력 참가자 이름을 유지하고, stable author의 선두 표시와 신규/수정 누락 방지를 데이터 보정과 분리한다.

## 1. NOW

- **게임정보 모달 기록 상세 실화면 조정** — 사진 섹션 header/wrapper의 상하 spacing을 게임평·플레이기록 섹션의 공통 문법과 대조해 사진 썸네일·2열 grid·남기기 버튼·개수 표시는 보존한 채 사진 섹션만 두껍게 보이는 별도 override를 제거한다. participant micro identity에서 대표 캐릭터 image와 fallback 발바닥의 실제 rendered rect/font/line-height를 대조해 같은 12px 역할로 보정한다. 360px의 짧은 4인+시간은 people/meta row와 상위 card/carousel의 실제 available/required width를 계측한 뒤에만 최소 수정한다. ★ 제거는 실화면 확인됨. 자동 브라우저 부재로 사용자 실화면 확인이 남음.

## 2. NEXT (자동 착수 금지)

- **모임보드 최근참여 날짜별 보기** — 모임보드의 최근참여를 참여 날짜별로 묶는 표시 변경. 현재 작업의 실화면 확인이 끝난 뒤 별도 범위·데이터 정본을 확인하고 착수한다.

- **대표 캐릭터 identity icon 실화면 재확인** — C/E 확정 회원은 대표 캐릭터 또는 대표 미설정 시 기본 발바닥이 20px standard로 보이고, D는 게임정보의 플레이기록 목록·요약 미리보기를 포함해 exact·unique로 연결된 회원만 12px micro로 보이는지 확인한다. 미연결/충돌 이름에는 아이콘이 없어야 하며 A/B/F와 게임평 요약 캐러셀 구조는 기존 표시를 유지해야 한다. 자동 브라우저가 이번 세션에 없어 사용자 실화면 확인이 필요하다. 정적 근거: `node scripts/verify-identity-icon-contract.js`, `node scripts/verify-nickname-resolution.js`; 상세: [representative-character-identity-icon-plan.md](plans/representative-character-identity-icon-plan.md).

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
| #155 participant 보정 후보 | 원본 기록에서 작성자의 historical nickname exact token 누락이 확정되면 그 레코드만 별도 승인으로 보정 가능 | 사용자 승인과 원본 대조 후 exact token만 추가; alias/추정 금지 |
| #157 participant 이름 | alias 가능성만으로 자동 연결·수정하면 historical 입력 의미가 바뀔 수 있음 | 사용자가 실제 participant identity를 확인한 뒤에만 별도 보정 검토 |
| 모임 데이터 쓰기 보호 | Kakao 인증에 서버측 신원 검증이 없어 anon 클라이언트가 `user_id`를 자기 주장할 수 있다. meeting만 보호하면 같은 구조의 다른 쓰기 경로는 남는다 | 범위(meeting만/전체)와 Edge Function 배포 환경을 확정한 뒤 Plan |
| 한줄소개 GPT 연동 | 이전 기획의 입력·출력 기준이 복원되지 않음 | 사용자가 원하는 경험을 다시 설명 |
| 취향보드 Phase 2 | 성향 5축의 정책·표현이 미확정 | Phase 1 사용자 검토 후 재개 |

## 5. DEFERRED / TRIGGER (자동 착수 금지)

- **Presentation entry contract 정리** — 현재는 정상 경로 보존을 위해 `modalStack=1` trusted legacy admission 및 structure/entry flag 결합을 리팩터링하지 않는다. route/embed/modalStack/wizard/iframe 플래그 변경이 다른 surface의 owner·presentation·geometry·close/back·active-view를 함께 바꾸거나, 같은 예외 분기·상이한 capability 판정·교차 surface 회귀가 추가로 실제 버그 원인이 될 때만 재개한다. 재개 시 renderer, presentation owner, functional-surface capability, entry mode, geometry, lifecycle owner, active-view/analytics owner, fallback을 독립 축으로 대조하고, trusted legacy admission과 explicit capability + renderer discovery를 공통 판단 표면으로 통합할지 검토한다.
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
