# 플레이기록 사람 표시·저장 보강 Plan

## 목적과 완료 조건

게임정보 모달, 기록 더보기, 홈 요약 미리보기에서 기록 작성자는 participant 입력 유무와 무관하게 첫 번째 사람 토큰으로 보이고, 일반 플레이기록 신규·수정은 입력된 participant 목록에서 작성자가 빠지는 신규 누락을 만들지 않는다.

## 범위

- 공통 `window.buildPlayPeopleHtml(record, { esc })`가 `game_play_records.user_id`·`nickname`의 stable author를 먼저 출력한다.
- `player_names`는 입력된 전체 참가자 이름 텍스트로 보존한다. 표시에서만 `record.nickname`과 exact하게 같은 쉼표 토큰을 제거한다. 별칭·부분일치·정규화 dedupe는 하지 않는다.
- 플레이기록 사람 token의 작성자는 direct `user_id` micro identity host이며, 나머지 token은 기존 exact·unique resolver가 확정한 경우에만 identity icon/profile link를 얻는다. 별도 작성자 meta인 게임평은 기존 standard variant, 사진은 micro variant를 유지한다.
- 게임정보의 플레이기록 목록·요약 미리보기, 기록 더보기, 홈 요약 미리보기가 같은 사람 token markup을 사용한다. icon+nickname은 `pr-rec-recorder`의 nowrap 토큰이다.
- 사진은 기존 uploader meta를 유지한다. 단일 작성자 meta에만 direct micro identity icon을 추가하며 사람 목록과 합치지 않는다.
- `recordGamePlay`와 `updateGamePlay`는 non-null `player_names`에 작성자의 historical nickname exact token이 없을 때만 끝에 보강한다. 사진 단독/null 기록은 그대로 null로 둔다.

## 제외

- participant 정본 테이블, DB schema/RLS/RPC 개편, 기존 레코드 자동 migration.
- nickname alias·부분일치 기반 중복 제거 또는 데이터 보정.
- `player_count` 재계산·수정.

## 데이터 보정 보류

- #155는 원본 사실 확인 뒤 exact nickname 누락이 확정되면 별도 승인으로 보정할 후보이다.
- #157은 alias 추정이나 자동 수정 대상이 아니며, 사용자 확인 전에는 그대로 둔다.

## 검증

- 정적: JS parse, shared helper 호출부, null 보존과 exact token 분기, 기존 identity verifier를 확인한다.
- UI: 360px에서 3인·4인·긴 이름 모두 사람 token이 자연 줄바꿈하고 컨테이너 가로 overflow가 없어야 한다. 자동 브라우저가 없는 세션이면 사용자 실화면으로 확인한다.
