# 보드 상호작용 회귀 Plan

## 목표

360px에서 보드·기록 화면의 확장, 아코디언, 모달/시트 조작이 배경 스크롤이나 위치 이동 없이 예측 가능하게 동작한다.

## 종료 조건

사진 접기, 홈 미리보기 진입, 기록 아코디언, iframe footer, 모달/시트 끝 스크롤이 각 사용자 기대 위치와 스크롤 경계를 유지한다.

## 범위와 순서

1. 사진 전체보기 접기 — `.profile-section-more-btn`은 일반 목록 토글과 다른 경로이므로, 사진 sticky 헤더의 클릭 전후 viewport top과 서브시트 scrollTop을 360px에서 측정한 뒤 그 경로에만 복원을 적용한다.
2. 모임 보드→홈 미리보기 focus — `/?focus=meeting`의 브라우저 scroll restoration, 카드 렌더 완료, 고정 헤더 높이를 같은 뷰포트에서 측정하고 최종 카드 위치만 한 번 보정한다.
3. 기록 보드 아코디언 — 날짜별·모임별의 열림/닫힘 헤더 `height`, `padding`, `margin`, `line-height`, border와 클릭 헤더 viewport top을 대조한다. 열림 상태의 margin/장식이 헤더 box를 바꾸지 않게 한다. 하단 부족 scroll 여유는 실제 부족량만 임시 spacer로 보충한다.
4. iframe footer — 프로필 수정 위저드의 실제 embed DOM·계산된 display/overflow를 확인해 기존 위저드 markup·handler가 보이게 한다. 별도 위저드 구현은 만들지 않는다.
5. 모달·바텀시트 배경 스크롤 — 센터모달·바텀시트·iframe에서 내부 scroll container의 상단/하단 wheel·touchmove가 부모 페이지로 체이닝되는 경로를 확인하고, 양방향 모두 차단한다. iPhone 실기기 확인이 필요하다.

## 읽을 파일

- `docs/DESIGN_RULES.md` §9
- `docs/PROJECT_STRUCTURE.md` §2-A
- `assets/js/kakao-auth.js` — 기록 보드 토글·board iframe
- `assets/js/index-page.js` — 미리보기 focus·모달
- `assets/js/game-reviews.js` — 아코디언 보정
- `assets/css/style.css` — sticky·modal·sheet 규칙

## 보존할 동작

- 일반 목록의 기존 전체보기와 모임 보드 다가오는 모임 구조
- `compensateHeaderPosition`의 상단 보정 의도
- 기존 프로필 위저드 validation·저장·권한 경로
- 모달/시트 내부 정상 스크롤

## 위험요소와 검증

- 같은 선택자를 두 번 고친 이력이 있으므로 런타임 측정 없이 세 번째 CSS 수치 패치를 하지 않는다.
- 자동화가 가능한 환경에서는 360px screenshot과 `getBoundingClientRect()`·`getComputedStyle()`을 읽는다. 연결이 없으면 변경을 완료로 판정하지 않고 필요한 사용자 실기기 확인을 명시한다.
- 아코디언은 날짜별·모임별, 상단·페이지 최하단에서 각각 확인한다.
- 모달/시트는 내부 최상단·최하단에서 위/아래 방향을 모두 확인한다.

## 롤백

각 항목을 독립 커밋한다. 위치 보정이나 scroll lock이 다른 화면을 막으면 해당 항목 커밋만 되돌린다.
