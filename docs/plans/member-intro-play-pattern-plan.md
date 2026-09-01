# 모임원 프로필 설문: 평소 플레이·모임 참여 분리 Plan

상태: **033 운영 적용 완료(사용자 확인), 프런트 구현 완료·실계정 화면 검증 대기**

## 목표와 종료 조건

- 목표: 6단계 모임원 프로필 작성 위저드에서 평소 플레이 습관과 모임 참여 페이스 조건을 분리하고, 가장 어려웠던 게임 편집을 위저드로 옮긴다.
- 종료 조건: 신규·수정 프로필이 두 종류의 요일/시간을 별도 저장·출력하고, 가장 어려웠던 게임은 위저드에서만 편집되며 360px에서 1~6단계 action bar가 같은 위치에 정상 노출된다.

## 조사 결론: 정본과 필드

| 의미 | 정본·필드 | 판단 |
|---|---|---|
| 평균 플레이 빈도 | `member_intros.average_play_frequency` | 재사용 |
| 주로 함께 게임하는 사람 | `member_intros.companion_types` | 재사용 |
| 평소 플레이 요일 | `member_intros.usual_play_days` | **033 신규 `TEXT[]` 필요** |
| 평소 플레이 시간대 | `member_intros.usual_play_times` | **033 신규 `TEXT[]` 필요** |
| 현실적으로 가능한/원하는 참여 빈도 | `possible_frequency_min/max`, `desired_frequency_min/max` | 재사용 |
| 참여 가능한 요일/시간대 | `available_days`, `available_times` | 재사용. 평소 습관으로 복사·변환하지 않음 |
| 가장 어려웠던 게임 | `profile_hardest_games` | 기존 정본 재사용, 신규 컬럼 없음 |

`usual_play_days`는 `mon`~`sun`과 `flexible`만 허용한다. `usual_play_times`는 기존 30분 슬롯(`HH:00`/`HH:30`)과 `flexible`만 허용한다. 공휴일은 모임 참여 가능 일정(`available_days`)에만 둔다. 기존 행의 신규 두 필드는 빈 배열로 시작하며, 기존 `available_*` 값을 평소 습관으로 이관하지 않는다.

## DB/RPC Plan

### 033 migration — 필요

읽을 파일: `docs/db-schema.md`, `docs/migrations/031_member_intro_preference_layers.sql`, `docs/migrations/032_member_intro_range_any.sql`

- `member_intros.usual_play_days TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`, `usual_play_times TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`를 추가한다.
- 컬럼 CHECK는 허용값·최대 개수만 보장하고, 기존 행은 빈 배열로 보존한다. 저장 RPC는 새 평소 요일/시간의 비어 있지 않은 값을 요구한다.
- `submit_member_intro` 시그니처에 `p_usual_play_days`, `p_usual_play_times`를 추가하고 같은 검증·upsert 계약을 넣는다.
- `p_hardest_games JSONB`도 같은 RPC에 추가한다. 기존 `replace_profile_hardest_games(TEXT, JSONB)`를 RPC 내부에서 호출해, 자기소개 저장·가장 어려웠던 게임 교체·최초 쿠폰 판정을 하나의 트랜잭션으로 처리한다.
- `voucher_log`의 `intro_complete` partial unique 계약은 변경하지 않는다. 수정 저장에서 `voucher_granted=false`가 유지된다.

롤백: 033과 새 프런트는 함께 되돌린다. 신규 평소 플레이 데이터만 제거 대상이며 기존 `member_intros`, `profile_hardest_games`, 쿠폰 행은 손대지 않는다.

## 프런트/출력 Plan

| 파일 | 변경 |
|---|---|
| `pages/club/club-intro.html` | 2단계를 평소 플레이 습관(평균 빈도·동반자·평소 플레이 요일/시간대), 3단계를 모임 참여 페이스(참여 가능/원하는 참여 빈도·참여 가능한 요일/시간대)로 재배치. 요일/시간 선택 헬퍼를 대상별 설정으로 일반화한다. 수정 시 두 쌍을 각각 로드하고 새 RPC 인자를 저장한다. 4단계에 최대 2개의 가장 어려웠던 게임 선택 UI를 넣는다. 6단계 제목/안내문을 자기소개로 바꾼다. |
| `assets/js/supabase-client.js` | `getMeetingProfile`의 평소 플레이 필드 반환, `submitMemberIntro`의 033 인자 전달, 기존 hardest-game 조회/정규화 재사용. |
| `assets/js/kakao-auth.js` | `_buildTasteInnerHtml`에서 평소 플레이와 모임 참여를 분리 출력한다. 현재 보드의 `+ 게임 추가`·삭제 바인딩과 버튼을 제거하고 결과만 표시한다. `none`은 `없음`, 빈값은 `미입력`으로 표시한다. |
| `assets/css/style.css` | 위저드 공통 flex 레이아웃만 조정한다. body를 scroll 영역으로, nav를 공통 footer/action bar로 유지하여 1~6단계 모두 같은 위치에 둔다. 5·6단계 전용 margin/padding 보정은 만들지 않는다. |
| `docs/db-schema.md`, `docs/js-api.md`, `docs/UI_MAP.md`, `docs/PROJECT_STATE.md` | 033 적용 상태, 새 필드·RPC·출력 정본 및 완료 상태를 동기화한다. |

## 가장 어려웠던 게임 이동 방식

- 정본은 계속 `profile_hardest_games`이며 최대 2개·게임 ID/직접 입력 중 하나라는 기존 제약을 유지한다.
- 게임 검색 UX는 `kakao-auth.js`의 `_openGameAddSearchModal` 패턴을 위저드에서도 재사용 가능한 공용 위치로 추출하거나, 호출 계약을 공유해 사용한다. 별도 검색 방식·별도 저장 테이블은 만들지 않는다.
- 수정 위저드 진입 시 `getProfileHardestGames(userId)` 결과를 함께 읽어 선택 상태를 복원한다.
- 내 프로필 보드 정본은 게임명 결과만 출력한다. 현재 `_bindTasteSubsheet`의 직접 추가·삭제 이벤트와 `_buildTasteInnerHtml`의 action 버튼은 제거한다.

## footer/다음 버튼 원인과 해결 방향

- 현재 `.intro-wizard`의 기본 규칙은 `max-height` 중심이며, 내용이 짧을 때 flex 컨테이너가 콘텐츠 높이로 수축할 수 있다. 5·6단계 footer가 위로 올라오는 직접 원인 후보다. 모바일 media rule의 `height` 적용 여부와 embed viewport의 계산 높이는 구현 전 실제 360×568에서 측정한다.
- 해결은 페이지별 여백이 아니라 `.intro-wizard`(고정된 가시 높이) → `.intro-wizard-body`(`flex:1; min-height:0; overflow-y:auto`) → `.intro-wizard-nav`(shrink하지 않는 footer)의 공통 계약으로 한다. 키보드가 열린 상태와 내부 스크롤에서도 footer가 콘텐츠를 가리지 않는지 확인한다.

## 적용 순서와 위험

1. 033 migration 작성·검증 후 운영 DB 적용
2. 033 RPC가 준비된 것을 확인
3. 새 프런트 배포

가장 먼저 실패할 가능성이 높은 지점은 RPC 시그니처 변경 뒤 구 프런트가 호출할 때다. 따라서 migration 적용 전 새 코드 배포를 금지한다. 기존 수정자는 `usual_play_*`이 빈 상태이므로 다음 수정에서 새 평소 습관을 입력해야 하며, 기존 참여 가능 일정은 보존된다.

## 검증

1. 신규/기존 수정에서 2단계는 평소 습관, 3단계는 모임 참여만 묻는지
2. `usual_play_*`와 `available_*`가 별개 값으로 RPC·DB·수정 위저드 왕복되는지
3. 가장 어려웠던 게임의 기존값 로드·추가·삭제·저장, 최대 2개·중복·직접 입력 검증
4. 프로필 보드 정본이 평소 플레이/모임 참여를 분리 출력하고 직접 편집 UI가 없는지
5. `none → 없음`, 빈값 → `미입력` 출력
6. 신규 최초 저장 쿠폰 1회 지급, 기존 수정 저장 재지급 없음
7. 360×568 실제 화면에서 신규/수정 모두 1~6단계 action bar y 위치, 다음/저장 버튼, 키보드·스크롤 겹침 확인
