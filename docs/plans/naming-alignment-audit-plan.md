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

## Legacy naming migration 점검

`taste`·`growth` 같은 legacy 명칭의 완전 제거는 기능 개발 중에 끼워 넣지 않는다. 큰 기능 묶음 완료, 안정화·버그 수정 중심 단계, 배포 전 technical debt 정리, 또는 같은 명칭으로 인한 오해·잘못된 수정·설명 비용이 두 번 이상 반복될 때 검토를 시작한다.

트리거는 검토 시작 시점이며 실행 조건은 별개다. 구조 안정성, 호출처 파악, 회귀 검증, UI 작업과의 비중첩, DB/URL/저장/분석 호환 전략, 기존 데이터·링크 보존, 반복 유지보수 비용을 함께 판단한다. 충분하지 않으면 보류한다.

실행한다면 JS뿐 아니라 CSS·HTML attribute·URL/file/iframe 경로·DB·analytics·storage·공개 API·기존 링크·데이터 migration/fallback·문서·테스트를 별도 Plan에서 검토하고, 필요하면 old→new alias를 기간 한정으로 유지한다.
