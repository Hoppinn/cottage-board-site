# 모임 참여 데이터 Plan

## 목표

모임 보드의 `최근 참여`를 실제 참여한 코티지 모임 단위로 보여줄 수 있는지, 기존 데이터의 의미를 훼손하지 않고 판단한다.

## 현재 판정

현 구조만으로는 구현 불가다. `game_play_records`는 `group_name`과 `played_at`만 가지며 모임 식별자가 없고, `meeting_votes`는 `vote_date + user_id`의 참여 등록이다. 날짜 일치 또는 그룹명 문자열만으로 실제 참석과 특정 모임을 결합하지 않는다.

## 읽을 파일

- `docs/db-schema.md` — `game_play_records`, `meeting_votes`, `meeting_vote_games`
- `docs/js-api.md` — `getMyStats`, 모임 조회 API
- `assets/js/supabase-client.js` — 플레이 기록·모임 조회/저장
- `assets/js/kakao-auth.js` — 현재 최근 참여 렌더
- `assets/js/game-reviews.js`, `pages/club/club-history.html` — 기존 그룹별 기록 소비처

## 변경할 대상

미정. 먼저 기존 기록에서 안전하게 연결 가능한 표본과 새 기록 입력 시의 모임 선택 UX를 설계한다.

## 신규 생성 가능성

실제 모임 식별자와 플레이 기록 연결 필드 또는 세션 테이블이 필요할 수 있다. 이는 DB/API 변경이므로 별도 Red Plan·승인 없이는 만들거나 적용하지 않는다.

## 보존할 동작

- 기록 보드는 게임/기록 중심
- 모임 보드는 날짜/참여 중심
- 기존 `group_name` 기록, 과거 플레이 기록, `meeting_votes` 등록 데이터
- `모임 기록 & 사진`의 `코티지보드 동호회` 그룹 필터

## 위험요소와 검증

- 같은 날 복수 모임·개인 플레이·등록 후 불참을 한 카드로 오인하지 않는다.
- 새 식별자 도입 시 기존 행의 미연결 상태를 임의 보정하지 않는다.
- UI에 표시하는 인원·게임은 실제 관계가 보장되는 값만 쓴다.

## 다음 판단

데이터 모델을 승인하기 전까지 최근 참여 UI와 `코티지 모임에서 플레이된 게임 보기 ›` 링크는 변경하지 않는다.
