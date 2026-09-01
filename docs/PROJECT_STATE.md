# PROJECT_STATE — 코티지보드 현재 상태

최종 갱신: 2026-09-01

> 이 문서는 세션을 다시 시작할 수 있게 **열린 상태와 그 재개 맥락**만 보관한다. 완료한 변경·검증의 상세는 git commit, 계속 유효한 구조·데이터 계약은 도메인 문서가 정본이다. 완료 목록·커밋 목록·세션 회고는 여기서 제거한다.

## 0. 현재 상태

- 현재 작업: 모임원 프로필 설문 — 평소 플레이·모임 참여 분리
- 상세 Plan: [member-intro-play-pattern-plan.md](plans/member-intro-play-pattern-plan.md)
- 현재 단계: 위저드·내 프로필 보드 정본·프로필 보드 미리보기 카드·모임 보드의 명칭 규칙을 동기화했다. `usual_play_days/times`는 평소 습관, 기존 `available_days/times`는 모임 참여 가능 일정 정본으로 분리했다.
- 다음 작업: 360px 실화면에서 위저드와 프로필 보드의 줄바꿈을 확인한 뒤, 모임원 목록 카드의 출력 밀도를 정리한다.
- 인수인계: 가장 어려웠던 게임은 기존 `profile_hardest_games` 정본을 유지하고 위저드 편집으로 이동한다. 최초 작성 쿠폰 partial unique 보장은 변경하지 않는다.
- 승인 대기: 없음.
- 현재 버그: 게임도감 전체보기 전환 시 시작줄이 살짝 위로 올라오는 증상은 상세 조건 설명 대기.

### 다음 시작점

1. [member-board-plan.md](plans/member-board-plan.md)를 읽고 4번 모임원 프로필 작성하기 양식의 현재 구조를 조사한다.
2. 조사·사용자 확정 전에는 4번 UI·저장 구조를 수정하지 않는다.
3. 기존 사용자 확인 대기 항목은 현재 작업과 직접 관련될 때만 함께 판정한다.

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
