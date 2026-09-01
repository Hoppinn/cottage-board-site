# 모임원 프로필 설문 3단 취향·난이도 개편 Plan

상태: 승인됨 · 구현 중

## 목표와 종료 조건

- 목표: 모임원 프로필의 게임 취향을 `주 취향 → 취향 범위 → 꺼림` 3단 구조로 바꾸고, 상세 프로필에서 게임 유형·난이도 전체를 명확하게 읽을 수 있게 한다.
- 종료 조건: 신규·기존 작성자가 설문을 저장·수정할 수 있고, DB가 부분집합·충돌·쿠폰 1회 지급 계약을 보장하며, 상세 프로필과 360px 화면에서 새 정보가 의도대로 표시된다.

## 현재 구조와 결정

- 입력·수정은 `pages/club/club-intro.html`의 6단계 위저드, 저장은 `submit_member_intro` RPC, 상세 결과는 `assets/js/kakao-auth.js`의 프로필 보드가 맡는다.
- `member_intros.location`은 기존 재사용 가능한 거주 지역 필드다. 새 컬럼을 만들지 않고 기본 정보 단계에서 20자 이하 자유 입력으로 저장·상세 공개한다.
- `member_intros.preferred_game_types`는 주 취향 게임 유형으로 재사용한다. 새 `game_type_range`는 **주 취향을 포함한 전체 취향 범위**를 저장한다.
- 새 난이도 3단 필드와 유형 범위/꺼림 필드는 모두 `member_intros`에 둔다. 기존 `profiles.avoid_tags` 및 `profiles.preferred_game_depths`는 이 설문의 정본으로 더 사용하지 않는다.
- 기존 작성자의 유형·비선호·웨이트는 031에서 초기화한다. 닉네임, 가입 경로, 빈도, 요일·시간, 시계탑 선호, 서술, 거주 지역은 보존한다.

## 구현 계약

### 데이터

`031_member_intro_preference_layers.sql`은 아래 5개 `member_intros TEXT[] NOT NULL DEFAULT '{}'` 컬럼을 추가한다.

- `game_type_range`
- `avoid_game_types`
- `preferred_game_depths`
- `game_depth_range`
- `avoid_game_depths`

유형 범위는 `preferred_game_types ⊆ game_type_range`, 난이도 범위는 `preferred_game_depths ⊆ game_depth_range`를 항상 만족한다. 난이도는 `game_depth_range ∩ avoid_game_depths = ∅`를 보장한다. 명백한 유형 충돌인 `party ↔ 파티게임`, `social_deduction ↔ 마피아류`도 차단한다.

RPC는 새 5개 배열과 기존 `location`을 받아 한 트랜잭션으로 upsert한다. 기존 `intro_complete` partial unique 기반 쿠폰 지급은 바꾸지 않는다.

### UI와 출력

- 설문 기본 정보에 거주 지역을 추가한다.
- 게임 유형과 난이도는 한 `게임 취향` 단계 안에서 각각 주 취향·취향 범위·꺼림을 연속해서 입력한다.
- 주 취향은 취향 범위에서 자동 선택·잠금으로 표시하며 주 취향 변경 때 즉시 범위를 동기화한다.
- 난이도 범위와 꺼림은 서로 선택 해제·비활성화해 충돌을 막는다.
- 상세 프로필은 `게임 취향 > 게임 유형 / 게임 난이도` 계층으로 3단 결과와 가입 경로·거주 지역을 표시한다. 난이도 결과는 이름과 병합된 숫자 범위만 표시하고 예시는 표시하지 않는다.
- 요약 카드에는 주 취향 중심의 짧은 요약만 표시하며 취향 범위 전문은 넣지 않는다.

## 파일과 순서

읽을 파일: `docs/db-schema.md`, `docs/js-api.md`, `docs/DESIGN_RULES.md`, `pages/club/club-intro.html`, `assets/js/supabase-client.js`, `assets/js/kakao-auth.js`, `scripts/verify-intro-questionnaire.js`.

변경 파일: `docs/migrations/031_member_intro_preference_layers.sql`, `pages/club/club-intro.html`, `assets/js/supabase-client.js`, `assets/js/kakao-auth.js`, `scripts/verify-intro-questionnaire.js`, `docs/db-schema.md`, `docs/js-api.md`, `docs/PROJECT_STATE.md`.

운영 적용 순서는 반드시 `030 → 031 → 새 코드 배포`다. 031 이전에 새 프론트를 배포하지 않는다.

### 범위 `장르를 가리지 않음` 보정 (032)

`game_type_range`의 `any`는 주 취향이 일반 유형이어도 선택할 수 있다. 저장값은 `주 취향 값 + any`이며, 범위에서 다른 추가 유형은 함께 고를 수 없다. `032_member_intro_range_any.sql`이 이 계약으로 031의 RPC·제약을 교체하므로 운영 순서는 `030 → 031 → 032 → 코드 배포`로 갱신한다.

## 검증

- 신규 작성과 기존 작성 수정의 저장·재조회
- 주 취향→범위 자동 포함·잠금·변경 동기화
- 유형의 `any`/`none` 상호배타와 명백한 유형 충돌 차단
- 난이도 부분집합 및 범위↔꺼림 상호 배제
- 연속/비연속 난이도 숫자 범위 포맷
- 가입 경로·거주 지역의 보존과 상세 공개
- 최초 쿠폰 1회·수정 시 재지급 없음
- 360px 입력·상세 화면

## 롤백

코드 롤백이 필요하면 이전 UI와 이전 RPC 시그니처를 함께 복원한다. 새 컬럼은 남아도 이전 경로에 영향을 주지 않는다. 운영 DB의 031 적용 전에는 새 코드를 배포하지 않아 롤백 필요성을 줄인다.
