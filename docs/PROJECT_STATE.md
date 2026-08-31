# PROJECT_STATE — 코티지보드 현재 상태

최종 갱신: 2026-08-31

> 이 문서는 **열린 상태만** 보관한다. 완료한 변경·검증은 git commit, 구조·데이터 계약은 각 도메인 문서가 정본이다. 완료 이력·세션 회고·기존 감사 결과를 여기에 다시 쌓지 않는다.

## 0. 현재 작업

- 활성 코드 작업: 없음.
- 종료 조건: 새 작업을 시작할 때 사용자 변화 기준으로 한 문장으로 정한다.
- 다음 시작점: 아래의 사용자 확인 대기 항목 중 실제로 확인 가능한 항목을 닫거나, 사용자가 새 목표를 지정한다.

## 1. 사용자 확인 대기

| 항목 | 확인할 결과 | 관련 정본·근거 |
|---|---|---|
| 이날 모임 상세 UI (2026-08-31) | 날짜 고정 헤더, 두 섹션, 참여자 카드의 한 카드 위계가 모바일 화면에서 의도대로 보이는지 | 최근 `feat(meeting)`·`style(meeting)` 커밋 |
| 프로필 선호 웨이트 | `weight_*` 값을 저장한 뒤 보드를 다시 열어 값이 유지되는지 | [db-schema.md](db-schema.md) 029, [js-api.md](js-api.md) `updatePreferredGameDepths` |
| 자기소개 제출·교환권 | 최초 제출 1회 지급·재수정 미지급 및 PC/모바일 입력 화면 | [db-schema.md](db-schema.md) 023, [js-api.md](js-api.md) `submitMemberIntro` |
| 사진 연동 확인 | 기존 내 기록이 1건인 게임에서 사진 추가 후 `연동하기`가 기존 기록에 합쳐지는지 | [js-api.md](js-api.md) `_confirmLinkOrPlain` |
| 플래너 다른 날짜 동기화 | 실제 폰에서 토글 반응과 수정 진입 시 노출 조건이 자연스러운지 | 기존 플래너 동기화 커밋 |
| `record_complete` 분석 이벤트 | 운영 URL의 비관리자 계정으로 기록 저장 시 이벤트가 쌓이는지 | [db-schema.md](db-schema.md) `page_events` |
| 업적 2건 | 게임평 진행도, 기존 플레이기록 수정 뒤 임계 업적이 즉시 반영되는지 | 해당 업적 커밋 `22488d7`, `7a1b68d` |

## 2. 보류·사용자 판단 대기

| 항목 | 재개 조건 | 정본·근거 |
|---|---|---|
| 보드게이머 유형검사 신규 기능 | 사용자가 구현 재개를 요청 | 신규 DB/화면 설계가 필요하므로 Plan |
| Kakao Make 알림 토큰 만료 | 사용자가 토큰 재발급 또는 Discord 웹훅 전환을 선택 | 외부 Make/Kakao 설정; 코드 작업 없음 |
| 참여자 이름 5건의 회원 연결 | 해당 이름이 실제 회원인지 사용자 확인 | 확인 전에는 연결하지 않음 (`도라`와 `돠` 혼동 주의) |
| 외부 인프라 확인 | 사용자가 Supabase·Vercel·도메인·Kakao 상태를 공유 | 사용자 소유 외부 설정 |
| 에러 관측 시스템 | 사용자가 필요성을 결정 | 반환 계약은 [js-api.md](js-api.md)에 보존; 도입은 Red/Plan |
| 모임 데이터 쓰기 보호 | 사용자가 보안 설계를 재개 | [db-schema.md](db-schema.md) `meeting_vote_games`의 현행 UNRESTRICTED 계약 |

## 3. 조건부 작업

- 약칭 출처 분류: `audit-abbr-migration.js` 출력과 TSV 표기를 정리해야 할 때, [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) §8 약칭 정본·migration invariant를 먼저 읽고 집합 대조 후 진행한다.
- BGG 영구 미연결 게임의 수동 기본정보: `build:master`를 실행하기 전에 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 최상단의 보존 한계를 확인한다. 근본 해소는 별도 파이프라인 설계 작업이다.
- `game_play_records`가 약 1,500행에 가까워질 때 `getUserFirstRecordCount`의 RPC 전환 필요성을 재검토한다. 상세 근거는 [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md)에 둔다.

## 4. 문서 사용 경로

- 페이지·렌더 경로: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- DB·RLS·RPC: [db-schema.md](db-schema.md)
- 공개 JS API·반환 계약: [js-api.md](js-api.md)
- UI·sticky·modal 규칙: [DESIGN_RULES.md](DESIGN_RULES.md)
- 관리자 분석: [admin-analytics.md](admin-analytics.md)
