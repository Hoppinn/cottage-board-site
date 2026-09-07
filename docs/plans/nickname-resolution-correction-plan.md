# 닉네임 해소 보정 Plan

## 목표와 종료 조건

`game_play_records.player_names`의 참여자 토큰을 기존 원문 그대로 보존하면서, 공백을 제외한 닉네임 키가 `profiles`에서 한 회원에게만 유일하게 연결될 때만 그 회원의 활동·알림·도감·업적·참여자 링크에 반영한다. 충돌·조회 실패·비회원 토큰은 자동 연결하지 않으며, 기존 기록을 수정하지 않는다.

## 공통 정본 규칙

기존 `window.normalizeNick`을 공통 정본으로 유지한다. `supabase-client.js`가 먼저 정의하고 `play-records-utils.js`는 이를 재사용한다. 별도 resolver 계층이나 새 공개 API는 만들지 않는다.

1. 원문 문자열을 쉼표 토큰 단위로 분리하고 trim한다.
2. 정규화 키는 공백 전체 제거와 소문자화로 만든다.
3. `profiles(user_id, nickname)`에서 같은 키를 가진 프로필이 정확히 하나이고 그 `user_id`가 조회 대상과 같을 때만 공백 보정을 허용한다.
4. 둘 이상이면 충돌 키로 표시하고 자동 연결하지 않는다.
5. 참여자 토큰은 이 유일 조건과 정규화 키의 정확 일치를 모두 통과할 때만 포함한다.

기록 작성자의 `user_id` 권한·원문 표시는 이 규칙의 대상이 아니다.

## 후보 조회와 최종 판정

- 유일 해소된 닉네임의 후보 ILIKE 패턴은 정규화 키의 문자 사이에 `%`를 넣는다. 예: `덕 지` → `%덕%지%`. 따라서 공백이 들어간 원문과 공백 없는 기록 토큰이 모두 후보에 들어온다.
- ILIKE는 후보를 넓히는 수단일 뿐 회원 판정이 아니다. 응답의 `player_names`를 다시 쉼표 토큰으로 나누고, 공통 정규화 키·유일 프로필·대상 user_id를 모두 확인한 행만 소비한다.
- 키 충돌 또는 프로필 조회 실패 시에는 공백 보정을 중단하고, 기존 원문 닉네임과 대소문자만 무시한 정확 토큰 일치만 fallback으로 허용한다. 부분 문자열 ILIKE 일치는 fallback에도 최종 판정으로 쓰지 않는다.

## 읽을 파일

- `docs/db-schema.md` — `profiles`, `game_play_records`, `user_achievements`, `voucher_log` 계약
- `docs/js-api.md` — CottageDB 공개 API 및 닉네임 소비 계약
- `assets/js/supabase-client.js` — 현재 ILIKE 조회와 CottageDB 공개 객체
- `assets/js/play-records-utils.js` — 기존 `normalizeNick`
- `assets/js/game-reviews.js`, `assets/js/index-page.js`, `pages/club/club-history.html` — 참여자 링크 맵
- `assets/js/achievements.js`, `assets/js/kakao-auth.js` — 통계·소급 업적 호출 경로

## 변경 대상

- 기존 `window.normalizeNick`을 공통 정본으로 사용하고, 참여자 DB 조회에는 작은 공통 헬퍼만 둔다.
- `getMyStats`, `getMyNotifications`, `getUserPlayedGames`, `getUserParticipationCount`, `getUserUniqueDayCount`의 참여자 조회를 공통 후보 조회·정확 판정 헬퍼로 교체한다.
- 플레이기록·홈 미리보기·동호회 기록의 기존 닉네임 Map은 공백 정규화 키를 쓰되, 다른 user_id가 같은 키를 쓰면 값을 `null`로 막아 자동 연결하지 않는다.
- `getMyStats.moimCount` 및 모임 UI에 새 데이터를 연결하거나 모임 참석으로 해석하지 않는다.

## 새로 생성

- `scripts/verify-nickname-resolution.js` — fixture 정적 검증: 공백 일치, 충돌 차단, 부분 문자열 차단, 다른 닉네임 불일치.
- `scripts/audit-nickname-resolution.js` — 운영 DB 읽기 전용 감사: 프로필 충돌, 해소되는 태그, 보정 전후 play·unique-day 수치와 새 업적 임계값 후보만 보고. DB write는 하지 않는다.

## 영향 파일

- `assets/js/supabase-client.js`
- `assets/js/play-records-utils.js`
- `assets/js/game-reviews.js`
- `assets/js/index-page.js`
- `pages/club/club-history.html`
- `docs/js-api.md`
- `docs/PROJECT_STATE.md`
- 위 Plan 및 검증·감사 스크립트

## 업적 안전장치

구현 직전 감사 스크립트로 보정 전후 `play` 및 `balance` 값을 계산하고, 새로 임계값을 넘는 회원·업적을 읽기 전용으로 보고한다. 이 결과 확인 전에는 `checkAchievements`·`grantRetroAchievements`를 실행하는 브라우저 검증이나 임의의 지급 호출을 하지 않는다. 기존 내 보드의 정상 소급 지급 경로는 코드상 보존하되, 배포 후 실제 지급 여부는 감사 결과를 보고 별도 결정한다.

## 위험과 롤백

- 넓은 후보 ILIKE는 많은 행을 반환할 수 있으므로 최종 토큰 필터 전에 결과를 집계하거나 count하지 않는다.
- 프로필 닉네임 변경과 충돌은 공백 보정 해소 실패로 처리한다.
- 원문 데이터·`user_id` 권한·모임 데이터는 쓰지 않는다. 롤백은 helper 소비처를 기존 원문 정확 토큰 경로로 되돌리는 코드 revert이며, 기록 데이터 롤백은 필요 없다.

## 검증

1. fixture로 공통 정규화·후보 패턴·최종 토큰 판정을 확인한다.
2. 운영 DB 읽기 전용 감사로 충돌 수와 `덕지`→`덕 지` 후보를 재확인한다.
3. 업적 임계값 변화 후보를 읽기 전용으로 보고한 뒤에만, 사용자 승인 범위에서 실제 내 보드 동작을 확인한다.
4. 정적 검사, `git diff --check`, 공개 API 문서와 상태 문서 동기화를 확인한다.

