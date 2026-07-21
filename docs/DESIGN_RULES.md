# DESIGN_RULES.md — 코티지보드 디자인 원칙

장기 유효한 원칙만 기록한다.

---

## 1. 브랜드 팔레트

- 기준 색상: `--green: #7a4828` (갈색), `--bg: #fffdf8` (베이지), `--paper: #fffaf0` (아이보리)
- 이 팔레트 밖의 색상을 신규 도입할 때는 브랜드 톤과의 조화를 먼저 확인한다.
- 플레이기록·카드 등 보조 컴포넌트의 색상도 이 팔레트 안에서 변주한다.
- **새 색상은 반드시 `:root` CSS 변수로만 추가한다. style.css에 hex 직접 하드코딩 금지.**

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

### 6-a. 모서리를 위한 `overflow:hidden`은 **그 안에서 열리는 팝업을 자른다** (2026-07-22 교훈)

`overflow:hidden`이 **스크롤 없이 오직 모서리 클리핑만을 위해** 걸려 있다면, 그 카드 안에서 열리는 드롭다운·툴팁은 카드 경계에서 잘린다. `.pr-session`(기록 카드)이 정확히 그랬고 ⋯ 메뉴가 잘렸다.

**해결 순서 — 위에서부터 시도한다:**
1. **각진 배경을 가진 자식이 자기 `border-radius`를 갖게 하고, 부모의 `overflow:hidden`을 뗀다.** ✅ 이게 정답이었다. 여기선 헤더(`.pr-session-hd`)에 `13px 13px 0 0`을, 접힌 상태엔 네 모서리를 줬다.
2. 자식이 여럿이라 1번이 번거로우면 그때 다른 방법을 찾는다.

🚫 **하지 말 것 (둘 다 2026-07-22에 실제로 해보고 되돌렸다):**
- **`position:fixed`로 카드 밖에 띄우고 스크롤마다 좌표 재계산** — 메뉴가 스크롤을 쫓아다니고 sticky 헤더 위로 떠오른다. 사용자가 바로 잡아냈다.
- **자리가 없으면 위로 펼치기** — 카드가 짧으면 위에도 자리가 없어 결국 잘린다. 증상을 줄일 뿐 원인을 안 없앤다.

⚠️ **판정 함정 3개** (전부 이날 실제로 오진했다): `getComputedStyle(el).bottom`은 absolute 요소에서 **항상 px**라 방향 판정에 못 쓴다 / `elementFromPoint`는 **뷰포트 밖이면 null**이라 「잘림」으로 오독된다 / 「마지막 행」을 화면에 보이는 것 중 마지막으로 고르면 **경계를 안 밟는다**(카드 끝에서 754px 떨어진 행이었다).

## 7. sticky 헤더 / bottom-sheet 높이 조정 원칙 ⚠️

**sticky 헤더를 줄일 때는 `top`·`height`·패널 위치를 건드리지 않고, 헤더 자체의 `padding`/`margin`만 줄인다.** bottom-sheet 상단 여백은 `height: calc(100dvh - Npx)`에서 Npx가 결정하므로, height 값만 조정하고 `border-radius`/`overflow`/`margin`은 건드리지 않는다.

**sticky 헤더 사이 공백으로 본문이 지나가는 패턴:**

`헤더1 + 공백 + 헤더2`가 함께 고정돼야 할 때 공백이 scroll body 안에 있으면, 본문 콘텐츠가 그 공백 위치를 통과해 올라간다.

```css
/* ❌ 잘못된 패턴 — 공백이 scroll body 안 (padding-top) */
.subsheet-body { padding-top: 48px; }

/* ✅ 올바른 패턴 — ::before sticky 덮개로 공백을 고정 영역에 포함 */
.subsheet-body--records::before {
  content: '';
  display: block;
  position: sticky;
  top: 0;
  height: 8px;
  background: var(--bg);
  z-index: 1;
}
```

**이 프로젝트 적용 위치:**
- `.profile-panel-header` padding 조정 — top/height 변경 없이 패딩만 (버그1, 2026-07-03)
- `.profile-subsheet-body--records::before` sticky 덮개 — 헤더 간 공백 고정 (버그2, 2026-07-03)
- 게임위치 바텀시트 `height: calc(100dvh - 102px)` — 값만 조정, 구조 유지 (버그3, 2026-07-03)

**증상으로 오해하기 쉬운 형태:**
- "sticky 헤더 고정 영역이 너무 크다" → `top`·`min-height` 줄이지 말고 header padding만 줄인다
- "헤더 아래 공백으로 본문이 보인다" → scroll body의 `padding-top`이 아니라 `::before` sticky 덮개로 해결
- "바텀시트 상단 여백이 너무 크다" → `height: calc(100dvh - Npx)` 의 Npx 값만 늘린다

**절대 하지 말 것:**
- sticky 헤더 축소 목적으로 `top`, `min-height`, `position` 변경
- 공백을 scroll body의 `padding-top`으로 만들고 본문이 그 틈으로 올라가는 구조 방치
- bottom-sheet 상단 여백 조정을 위해 `border-radius`, `margin`, `overflow` 변경

---

> 아래 3절은 2026-07-20에 CLAUDE.md에서 이관했다. 매 세션 읽을 필요는 없고 **해당 증상을 만질 때 읽는다**.

## 8. UI 요소 '안 보임' 버그 디버깅 순서

dropdown/tooltip/modal이 안 보일 때 JS 코드 탐색 전에:
1. CSS 클리핑 먼저 확인: 부모 체인에서 overflow:hidden/auto/scroll 찾기
2. z-index 확인: position:fixed/absolute 요소가 다른 stacking context에 묻히는지
3. display:none / visibility:hidden 여부

JS 탐색은 그 다음. "붙었는지"가 아니라 "보이는지"로 증상을 먼저 분류할 것.

새 등록 vs 수정 같은 "같은 코드, 다른 결과" 패턴:
→ 상태 차이(empty vs has-data) 기준으로 코드 실행 경로 분기점을 먼저 찾고,
  그 분기점 이후에 레이아웃이 달라지는 CSS 쪽도 함께 확인.

### 8-a. flex 줄이 안 줄어들 때 — 내가 지정한 게 flex 항목이 맞나 (2026-07-21 교훈)

입력칸 옆에 버튼을 늘렸더니 마지막 버튼이 **화면 밖으로 63px 잘렸다.** `input`에 `flex:1; min-width:0`을 줬는데도 안 줄어들었는데, 원인은 **`attachAc`가 입력칸을 클래스 없는 `<div style="position:relative">`로 감싸는 것**([play-records-utils.js](../assets/js/play-records-utils.js) `attachAc`) — **flex 항목은 input이 아니라 그 래퍼**였다. 자동완성을 붙인 입력칸을 flex 줄에 넣을 땐 `부모 > div`에 `min-width:0`을 건다.

- 🚨 **판정은 "같은 줄인가"가 아니라 "넘치는가"로 한다** — `flex-wrap`이 없으면 줄바꿈 대신 **옆으로 넘쳐 잘린다.** 자식들의 `top`이 같은지만 보면 잘림을 통과시킨다(실제로 통과시켰고 스크린샷에서 잡았다). `scrollWidth - clientWidth`와 **컨테이너 오른쪽 경계를 넘는 자식**을 함께 잴 것.
- 📌 자동완성 드롭다운의 폭·좌표는 **입력칸이 아니라 입력줄 전체**를 기준으로 잡는다. 입력칸이 좁아지면 드롭다운도 같이 좁아져 항목 글자가 두 줄로 접힌다.

## 9. CSS/sticky/바텀시트 원칙 (2026-07-03 교훈)

sticky·scroll·bottom sheet·fixed header·iframe sheet·border-radius·overflow 버그는 수치 문제처럼 보여도 실제 원인은 레이아웃 구조인 경우가 많다.

1. **사용자가 말한 기준 컴포넌트를 다시 확인한다.** 최근 수정한 값을 기준으로 삼지 말고, 현재 요청의 비교 대상을 다시 확인.
2. **공백이 스크롤 영역인지 고정 영역인지 먼저 구분한다.** `헤더1+공백+헤더2`가 함께 고정돼야 하면 공백도 sticky/fixed 영역에 포함.
3. **패널 시작 위치·height·sticky top을 건드리지 말라는 요청은 그대로 지킨다.** 고정되는 영역 자체의 padding/margin만 조정. 위치·height 변경은 다른 버그를 만든다.
4. **같은 선택자를 2번 이상 건드려도 안 되면 값 추측을 멈춘다.** DevTools 런타임 값으로 확인 후 수정.
5. **커밋 전 diff에서 의도 밖 선택자가 바뀌었는지 선택자 이름까지 확인한다.**

## 10. 닫기 애니메이션·show-then-hide 깜빡임 (2026-07-18 교훈)

"열 땐 멀쩡한데 **닫을 때 뭔가 한 프레임 켜졌다 꺼지는**" 깜빡임의 두 원인. 실제 사고: 홈 플래너 빠른진입 모달을 닫으면 플래너가 순간 떴다 사라짐(1차 수정 실패 후 2차에 규명, 커밋 511c15e).

1. **transition 진행 중 상태 클래스 제거 금지.** opacity/transform transition이 걸린 요소를 **닫는 도중** 상태 클래스를 떼면 요소가 '기본 모습'으로 복귀해 애니메이션되며 깜빡인다. 실제: `closeModal`이 `is-open`(opacity 0.25s 페이드)과 `is-quick-entry`를 **동시 제거** → 페이드 도중 quick-entry가 빠져 `.planner-sheet-panel`이 투명·풀스크린에서 기본 `background:#fff`·480px 박스로 복귀하며 슬라이드·페이드. **해결: 닫기에선 상태 클래스를 안 떼고 다음 정상 오픈에서 정리**(요소가 완전히 사라진 뒤 떼야 페이드에 안 걸림).
2. **show-then-hide(전체 로드 후 일부 숨김) 패턴은 컨테이너 전체를 숨겨라.** 일부만 숨기면 나머지가 닫을 때 드러난다. 실제: `is-quick-entry`가 `#viewWeek`만 숨겨 브레드크럼·페이지 헤더가 남아 오버레이 닫을 때 노출 → `.inner-page` 전체를 `display:none`으로 바꿔 해결. 사용자 표현 "**애초에 안 켜지게**"가 이 뜻(켜놓고 지우는 게 아니라 아예 렌더 안 되게).
3. ⚠️ **1차 실패의 뿌리 = 추론으로 먼저 고침.** iframe `#viewWeek` 토글 타이밍만 가정해 옮겼다가 실패 — 진짜 원인은 부모 패널의 transition+배경 복귀였다. 「런타임 값 검증」의 재확인: **닫기 깜빡임은 닫는 요소의 CSS(transition 있는가·상태클래스가 뭘 되돌리는가·숨김이 완전한가)부터 읽을 것.** 그걸 먼저 읽었으면 1차에서 잡혔다.
