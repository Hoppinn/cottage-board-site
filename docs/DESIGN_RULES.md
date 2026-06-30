# DESIGN_RULES.md — 코티지보드 디자인 원칙

장기 유효한 원칙만 기록한다.

---

## 1. 브랜드 팔레트

- 기준 색상: `--green: #7a4828` (갈색), `--bg: #fffdf8` (베이지), `--paper: #fffaf0` (아이보리)
- 이 팔레트 밖의 색상을 신규 도입할 때는 브랜드 톤과의 조화를 먼저 확인한다.
- 플레이기록·카드 등 보조 컴포넌트의 색상도 이 팔레트 안에서 변주한다.

## 2. 모바일 우선

- 기준 뷰포트: 360px 너비, `100svh` 높이
- 모든 레이아웃 결정은 모바일 화면에서 먼저 검증한다.
- 데스크탑 대응은 기능 유지 수준으로 충분하다.

## 3. 가독성 우선

- 정보 구조(계층, 간격, 폰트 크기)를 해치면서 시각 효과를 추가하지 않는다.
- 타이포그래피와 여백 개선은 색상 변경보다 효과가 크다. 이 순서로 우선한다.
- 장식적 요소(그라데이션, 애니메이션, 그림자)는 콘텐츠 전달을 방해하지 않는 범위에서만 사용한다.

## 4. 점진적 개선

- 전면 리디자인보다 국소적·점진적 개선을 우선한다.
- 한 번에 한 영역씩, 변경 전후를 직접 비교하고 커밋한다.

## 5. 컴포넌트 일관성

- 동일 용도의 컴포넌트(배너, 카드, 헤더)는 같은 CSS 패턴을 사용한다.
- 신규 CSS 클래스를 만들기 전에 기존 패턴(`page-mini-hero--*` 등)을 먼저 확인한다.
- 비슷한 역할의 요소가 페이지마다 다른 스타일을 갖는 상황을 만들지 않는다.

## 6. border-radius + 스크롤 분리 원칙 ⚠️

**같은 요소에 `border-radius`와 `overflow-y:auto`를 동시에 쓰지 않는다.**

Chrome 컴포지터는 `overflow-y:auto` 요소를 GPU 레이어로 승격할 때 `border-radius` 클리핑을 배경(background)에 제대로 적용하지 않는 경우가 있다. 결과적으로 배경이 직각 사각형으로 렌더링되어 라운딩된 모서리 밖으로 튀어나와 보인다. `position:absolute` 자식(닫기 버튼 등)도 동일하게 클리핑이 적용되지 않아 코너 영역 밖으로 노출된다.

**올바른 패턴:**

```css
/* ❌ 잘못된 패턴 — 같은 요소에 둘 다 */
.sheet-panel {
  border-radius: 28px 28px 0 0;
  overflow-y: auto;          /* border-radius 클리핑이 깨짐 */
}

/* ✅ 올바른 패턴 — 역할 분리 */
.sheet-panel {
  border-radius: 28px 28px 0 0;
  overflow: hidden;          /* 외부: 라운딩 클리핑만 담당 */
}
.sheet-panel-scroll {
  overflow-y: auto;          /* 내부: 스크롤만 담당 */
  height: 100%;
  box-sizing: border-box;
}
```

**이 프로젝트 적용 위치:** `.game-sheet-panel` (outer) + `.game-sheet-scroll` (inner), `.profile-panel-box` (outer) + `.profile-panel-body` (inner, 143차-179 — 모바일 스크롤 체이닝 버그로 발견)

`overscroll-behavior:contain`을 함께 쓸 때는 **실제 스크롤되는 inner 요소**에 둬야 한다. outer(overflow:hidden)에 두면 애초에 스크롤 컨테이너가 아니라서 효과가 없다(143차-179 시행착오).

**증상으로 오해하기 쉬운 형태:**
- "바텀시트 코너에 크림색 사각형이 삐져나와 보인다"
- "닫기(×) 버튼이 라운딩 밖으로 튀어나온다"
- "코너 부분에 별도의 레이어가 겹쳐 있는 것처럼 보인다"

**절대 하지 말 것:**
- `border-radius` 제거로 임시처방 (현상 숨길 뿐, 근본 해결 아님)
- `-webkit-overflow-scrolling:touch` 제거 (원인 아님)
- `overflow:hidden`만 추가 (스크롤이 죽음)
