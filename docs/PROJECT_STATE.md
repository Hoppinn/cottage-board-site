# PROJECT_STATE — 코티지보드 현재 상태

최종 갱신: 2026-09-08

> 이 문서는 세션을 다시 시작할 수 있게 **열린 상태와 그 재개 맥락**만 보관한다. 완료한 변경·검증의 상세는 git commit, 계속 유효한 구조·데이터 계약은 도메인 문서가 정본이다. 완료 목록·커밋 목록·세션 회고는 여기서 제거한다.

## 0. 현재 상태

- 시간 단위 표시: `profiles.total_minutes`의 legacy 이름과 실제 seconds 단위를 코드·도메인 문서에 명시하고, 오너 전용 회원 분석의 60배 표시를 수정했다. 관리자와 회원 분석의 `page_sessions` 경로 비교는 별도 보류 후보다.
- 현재 작업: 가입경로 `보드라이프` 추가 범위 조사 완료, DB/RPC 변경 Plan 승인 대기. 아래 NEXT/BACKLOG/DEFERRED 항목은 승인 없이 착수하지 않는다.
- 상세 Plan: [보드 상호작용 회귀](plans/board-interaction-regressions-plan.md) · [모임 참여 데이터](plans/meeting-participation-data-plan.md) · [닉네임 해소 보정](plans/nickname-resolution-correction-plan.md)
- 현재 단계: 최근 참여의 모임 단위 개편은 데이터 관계가 불명확해 구현 보류다. `game_play_records`에는 모임 ID가 없고 `meeting_votes`는 참여 등록이므로 날짜만으로 결합하지 않는다.
- P2 완료: `player_names` 후보는 공백 사이 `%` 패턴으로 넓히고, 최종적으로 쉼표 토큰의 `normalizeNick` 정확 일치만 사용한다. 활동 통계·태그 알림·게임 도감·참여/함께한 날 업적과 참여자 링크에 같은 규칙을 적용했고, 충돌 키는 자동 연결하지 않는다. 원문 기록과 작성자 `user_id` 권한은 보존했으며 모임 참석을 추론하지 않았다. 읽기 전용 감사는 프로필 46개·기록 122개·충돌 0쌍, `덕 지` 0→20건/3→9일 및 `play_5·10·20` 신규 임계값 후보, `원철` 부분문자열 오탐 2→0건을 확인했다. 이번 세션에서 업적 지급 write는 실행하지 않았다.
- 인수인계: 가장 어려웠던 게임은 기존 `profile_hardest_games` 정본을 유지하고 위저드 편집으로 이동한다. 최초 작성 쿠폰 partial unique 보장은 변경하지 않는다.
- 승인 대기: 가입경로 `보드라이프` 추가 — `member_intros.join_sources` 허용 목록·입력 UI·표시 라벨·최신 RPC 마이그레이션을 함께 변경하는 Red Plan.
- 최근 버그 닫힘: 게임도감 전체보기 전환 시 기존 항목이 3px 위로 이동하던 원인을 미리보기/전체 목록의 `margin-top` 차이로 확인하고 수정·커밋했다.

## 1. NOW

- 현재 승인되어 진행 중인 작업 없음.

## 2. NEXT (자동 착수 금지)

1. **P3 기능·콘텐츠** — 메인 모임 미리보기의 모임원 프로필 링크는 코드 경로 확인 완료(이름→프로필 보드, 카드→모임 보드). 이후 게임 위치 2건·보유게임 1건을 별도 범위로 처리한다.
2. **가입경로 보드라이프** — DB/RPC 변경 Plan 승인 후 구현한다.

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

- **보드 sticky 헤더 우선순위** — P2 데이터 정합성 다음의 UI 작업 후보. ① 수집 보드의 업적·캐릭터·칭호·도감, ② 프로필 보드의 좋아하는 게임·해보고 싶은 게임 순으로 적용한다. 각 보드 scroll container 안에서 현재 섹션 하나만 고정하고, 기존 시각 스타일은 유지한다. ③ 모임 보드 `최근 참여`는 모임 단위 데이터 모델이 확정된 뒤에만 적용한다. 여러 보드를 건드리는 Yellow UI 작업이므로 착수 시 별도 Plan과 변경안 승인을 받는다.
- **Legacy naming migration** — 다음 점검: 현재 큰 기능 묶음 완료 후. 구조 안정화·의존관계 파악·회귀 검증·호환 전략·반복 혼선 여부를 함께 판단하며, 트리거는 검토 시작 시점일 뿐 실행 확정이 아니다. 상세 기준은 [명칭 정합성 조사 Plan](plans/naming-alignment-audit-plan.md)을 따른다.
- **최근 참여 데이터 모델** — [모임 참여 데이터 Plan](plans/meeting-participation-data-plan.md)에 따라 데이터 관계와 범위를 먼저 확정한 뒤 재검토한다.
- BGG 영구 미연결 게임의 수동 기본정보는 `build:master` 실행 시 초기화될 수 있다. 해당 작업 전 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 최상단의 보존 한계를 확인한다. 근본 해소는 별도 파이프라인 설계다.
- `game_play_records`가 약 1,500행에 가까워지면 `getUserFirstRecordCount`의 RPC 전환을 재검토한다. 정확성 위험과 근거는 [REFACTOR_CHECKPOINT.md](REFACTOR_CHECKPOINT.md)에 있다.
- 닉네임 보호·체류시간 원자 증가·다기기 프로필/사진 복원은 열린 작업이 아니라 현재 계약이다. [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) §3~5, [db-schema.md](db-schema.md) `increment_profile_counters`, [ls-schema.md](ls-schema.md)를 정본으로 사용한다.
- `openProfilePanel`의 서브시트 라우팅·backTo·비동기 렌더 주의는 [js-api.md](js-api.md)를 정본으로 사용한다. 이 문서에 사본을 만들지 않는다.
- `task-continue` 훅은 다음 긴 미완 작업에서만 검증한다: 작업 파일을 여는지, 질문 뒤 이어가는지, 진전 없이 반복하지 않는지. 실패하면 더 고치지 않고 훅을 폐기한다.

## 6. 작업별 정본

- 페이지 구조·렌더 경로: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- DB·RLS·RPC: [db-schema.md](db-schema.md)
- 공개 JS API·반환 계약: [js-api.md](js-api.md)
- localStorage·세션: [ls-schema.md](ls-schema.md)
- UI·sticky·modal: [DESIGN_RULES.md](DESIGN_RULES.md)
- 관리자 분석: [admin-analytics.md](admin-analytics.md)
