# 명칭 정합성 조사 Plan

## 목표

현재 사용자 화면의 명칭과 코드 내부 레거시 명칭이 다른 사례를 전수 조사해, 안전한 rename 묶음과 건드리면 안 되는 호환성 이름을 구분해 보고한다.

## 종료 조건

각 사례에 화면명·코드명·제안명·주요 소비처·영향·rename 위험도를 기록하고, 실행 우선순위와 제외 대상을 제안한다. 이 Plan 단계에서는 파일을 수정하지 않는다.

## 조사 범위

- `내 보드` ↔ `profilePanel`/`openProfilePanel`
- `프로필 보드` ↔ `taste`/`TasteSubsheet`
- 그 밖의 화면 텍스트, JS 함수/변수, CSS class, data attribute, 주석, 파일명

## 읽을 파일

- `docs/UI_MAP.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/js-api.md`
- `assets/js/kakao-auth.js`, `assets/js/index-page.js`, `assets/js/game-reviews.js`, `assets/css/style.css`

## 제외 및 위험 표시

DB 컬럼, RPC, `event_type`, localStorage 키, URL, 외부 메시지/API, 누적 사용자 데이터의 값은 단순 rename 대상으로 포함하지 않는다. 주석의 구명칭은 코드 실행 이름과 따로 보고한다.

## 제안 기준

- 공개 API와 분석 키는 호환 레이어를 유지할지 별도 판단한다.
- `profilePanel` 계열은 UI 이름과 내부 컨테이너 의미를 혼동하지 않도록 호출 흐름을 먼저 추적한다.
- 기능 의미까지 바뀌는 이름은 리팩토링 후보로 분리한다.

## 검증

조사 결과에 각 명칭의 정의·간접 호출·이벤트/HTML attribute·문서/주석 소비처를 구분해 제시한다. 실행 승인 전에는 rename하지 않는다.
