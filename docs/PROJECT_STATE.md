# PROJECT_STATE — 코티지보드 현재 상태

최종 갱신: 2026-09-09

> 이 문서는 세션을 다시 시작할 수 있게 **열린 상태와 그 재개 맥락**만 보관한다. 완료한 변경·검증의 상세는 git commit, 계속 유효한 구조·데이터 계약은 도메인 문서가 정본이다. 완료 목록·커밋 목록·세션 회고는 여기서 제거한다.

## 0. 현재 상태

- 시간 단위 표시: `profiles.total_minutes`의 legacy 이름과 실제 seconds 단위를 코드·도메인 문서에 명시하고, 오너 전용 회원 분석의 60배 표시를 수정했다. 관리자와 회원 분석의 `page_sessions` 경로 비교는 별도 보류 후보다.
- NOW: Modal Stack Host의 portal·topmost close guard·`profile-wizard` child 이관은 실제 흰 화면 회귀를 받아 rollback했다. 실패 원인은 `docs/DEBUGGING_HISTORY.md`에 기록했다. 기존 frame/inert/single backdrop/iframe 상태 보존 구조와 코스 UI 변경은 유지한다. B(root X가 iframe 위저드 X처럼 hit되는 경로)는 iframe close 요청 위임 후 사용자 실화면에서 해결 확인됐다. A(`홈 → 프로필페이지 미리보기 → 내 보드`)는 `?modalDebug=1` 실제 계측으로 iframe 내부 `.profile-panel-box.center-modal-shell`의 중복 `10/36/12` 좌표가 원인임을 확인했고, child 안을 채우도록 최소 수정한 뒤 사용자 실화면 해결 확인을 받았다. 상세 측정·실패 가설은 `docs/DEBUGGING_HISTORY.md`를 정본으로 한다.
- 상세 Plan: [보드 상호작용 회귀](plans/board-interaction-regressions-plan.md) · [모임 참여 데이터](plans/meeting-participation-data-plan.md) · [닉네임 해소 보정](plans/nickname-resolution-correction-plan.md)
- 현재 단계: 최근 참여의 모임 단위 개편은 데이터 관계가 불명확해 구현 보류다. `game_play_records`에는 모임 ID가 없고 `meeting_votes`는 참여 등록이므로 날짜만으로 결합하지 않는다.
- P2 완료: `player_names` 후보는 공백 사이 `%` 패턴으로 넓히고, 최종적으로 쉼표 토큰의 `normalizeNick` 정확 일치만 사용한다. 활동 통계·태그 알림·게임 도감·참여/함께한 날 업적과 참여자 링크에 같은 규칙을 적용했고, 충돌 키는 자동 연결하지 않는다. 원문 기록과 작성자 `user_id` 권한은 보존했으며 모임 참석을 추론하지 않았다. 읽기 전용 감사는 프로필 46개·기록 122개·충돌 0쌍, `덕 지` 0→20건/3→9일 및 `play_5·10·20` 신규 임계값 후보, `원철` 부분문자열 오탐 2→0건을 확인했다. 이번 세션에서 업적 지급 write는 실행하지 않았다.
- 인수인계: 가장 어려웠던 게임은 기존 `profile_hardest_games` 정본을 유지하고 위저드 편집으로 이동한다. 최초 작성 쿠폰 partial unique 보장은 변경하지 않는다.
- 승인 대기: 가입경로 `보드라이프` 추가 — `member_intros.join_sources` 허용 목록·입력 UI·표시 라벨·최신 RPC 마이그레이션을 함께 변경하는 Red Plan.
- 최근 버그 닫힘: 게임도감 전체보기 전환 시 기존 항목이 3px 위로 이동하던 원인을 미리보기/전체 목록의 `margin-top` 차이로 확인하고 수정·커밋했다.

## 1. NOW

- **게임정보 canonical surface** — 홈페이지 기능의 추천게임찾기·플레이기록·내 보드·모임플래너 어느 진입점에서도 `openGameSheet()`/`.game-sheet` local bottom-sheet renderer를 사용한다. Modal Stack Host는 게임정보·기록·위치·안내 iframe child route를 만들지 않으며, geometry owner와 functional surface를 분리한다. 사용자 확인 대기: 네 진입점의 게임정보와 게임 A→B/기록/위치/안내 local flow.
- **공통 Modal Stack Host** — `docs/plans/modal-stack-host-plan.md`의 기존 host 구조를 유지한다. game flow는 Host-owned flow-close X와 one-step ←를 분리해 drilldown에서도 둘 다 유지하며, X는 현재 contiguous game flow를 닫고 ←/ESC는 top frame 하나만 복귀한다. Host shell geometry owner와 `standard`/`compact` variant도 분리했고 모임조율 child는 compact variant를 쓴다. profile child의 내 보드·프로필 보드·모임 보드는 Host shell 외곽을 다시 적용하지 않고 iframe 전체를 채운다. 기존 모임원 프로필 작성·수정 wizard 경로와 내 보드 내부 ← navigation은 보존한다. 사용자 smoke 재확인 대기는 추천·플레이기록·내 보드·모임플래너의 game flow와 모임조율 compact geometry다.

## 2. NEXT (자동 착수 금지)

1. **게임 위치 자동 초점 2건·보유게임 1건** — 게임정보 모달에서 게임 위치 child로 들어갈 때 해당 shelf가 펼쳐지고, highlight 게임이 첫 항목인 상태로 shelf header가 iframe 상단에 와야 하나 실제 화면에서는 최상단에서 멈춘다. 실패한 시도: ① `scrollIntoView()` 호출 시점 rAF 조정, ② 좌표 기반 `window.scrollTo`, ③ `load` 뒤 재실행, ④ header rect를 반복 보정하는 방식. 모두 실제 런타임에서 해결되지 않았으며 제거했다. 재개 전에는 360px iframe의 최종 URL/query·`body.embed-mode`·shelf open 여부·highlight 첫 항목·shelf header/첫 게임 rect·실제 scroll container와 `scrollTop`을 함께 측정해 원인을 확정한다. `#embed=1` fallback은 localhost query 유실 회귀가 있어 측정 전 제거하지 않는다.
2. **가입경로 보드라이프** — DB/RPC 변경 Plan 승인 후 구현한다.
3. **홈페이지 기능 child route 공통화 리팩터링** — 현재 `guideStack=1`의 게임정보·기록·추천 전체보기·모임 조율·내 보드는 기존 원본 open 함수와 parent `guideChildSrc()`를 재사용하지만, 기능별 위임 분기와 URL 조립이 각 파일에 남아 있다. 영향 대상은 홈페이지 기능 root iframe에서 이후 추가될 center-modal 성격의 child 경로다. 별도 리팩터링 Plan 승인 뒤 `원본 open 함수 → 공통 child 요청({kind,payload}) → parent route registry → 기존 deep-link/component` 계약으로만 정리하고, 독립 URL·일반 embed·작은 sheet는 유지한다. 검증은 기존 5개 경로와 새 등록 경로에서 parent shell·←/ESC pop·root state 보존을 360×640으로 확인한다.
4. **추천 전체보기 상단 과대 영역** — 사용자가 `홈페이지 기능 → 추천게임찾기 → 게임 더 찾기 → 전체보기` 실제 화면에서 Host X 영역과 `추천 게임 전체 443개` 제목 영역이 두 층으로 쌓여 과대하다고 확인했다. 목표는 기존 `recommend-overlay-header`와 Host X를 같은 상단 행으로 보여 shell top부터 목록 구분선까지를 compact하게 만드는 것이다. 다만 로컬 Chrome 자동 재현에서는 shell top 36px, Host X 46–72px, header 36–84px, 목록 시작 84px으로 총 48px 한 행이었으므로, URL/query·viewport·캐시/배포본 차이가 미확인이다. 재개 시 사용자와 같은 URL·viewport에서 shell/Host X/header/divider rect를 먼저 비교하고, 재현된 경우에만 중복 세로 점유를 최소 수정한다.
5. **내 보드 sub-sheet 최하단 overscroll/헤더 끌림** — `내 보드 → 프로필 보드 또는 모임 보드 → 최하단 반복 scroll`에서 내부 콘텐츠 끝 뒤 상위 modal이 더 움직이고 고정헤더가 끌리는 문제를 profile edit wizard의 `.intro-wizard-body` overscroll과 혼동하지 않는다. 재개 시 `.profile-subsheet`·iframe `html/body`·`.profile-panel` wrapper의 scrollTop, scrollHeight/clientHeight, overflow/overscroll-behavior, sticky 기준과 target header rect를 실제 경로에서 측정한다. geometry/inset 해결사항은 유지하며, 실제 추가 scroll container를 확정한 뒤에만 수정·검증한다.

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
