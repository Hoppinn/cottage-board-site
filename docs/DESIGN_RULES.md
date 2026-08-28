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
- 모임 플래너의 참여자 표시는 `day-detail.js`의 `buildBarsInCard`가 단일 렌더러다. 본 플래너·홈 히어로 미리보기·하루치 미리보기 모두 별도 compact variant 없이 **한 참여자=한 카드** 구조를 그대로 쓴다. 닉네임·동반인원·시간 텍스트·시간 범위 막대·판 의도·성향·모집 문구·want/learn 게임은 카드 밖으로 분리하지 않는다. 짧은 참여시간에서도 읽히도록 시간 텍스트는 막대 안에 넣지 않고 카드 헤더에 둔다.

### 5-a. PC 720px 본문의 `--page-x` 사용 계약

- PC의 `--page-x` 값은 `calc((100vw - 720px) / 2)`로 계산한 **페이지 외부 좌우 거터**다. 컴포넌트 내부의 일반 padding으로 쓰지 않는다.
- `padding-inline:var(--page-x)`를 쓰는 PC 본문은 `.about-section`처럼 박스의 `max-width`를 풀어 전체 폭에서 거터를 빼는 공용 패턴을 재사용한다. 중앙 `max-width` 박스와 함께 적용하면 폭을 두 번 제한한다.
- 2026-08-27 `about.html` WHY에서 `max-width` 박스에 `--page-x` 패딩을 덮어 1,174px 박스의 좌우 padding이 각 587px가 되고 본문 폭이 0px로 붕괴했다. 폭 수치를 반복 조정하지 말고 `getBoundingClientRect()`와 계산된 padding을 함께 측정한다.

#### 실패 사례: `about.html` PC 본문 폭 (2026-08-27)

- **반복 규모:** 대화상 10차례 같은 증상을 반복했고, git에는 `about.html` 폭을 직접 건드린 7개 커밋(`3aa0aebb`부터 `a174bd46`)과 그 앞의 오대상 추천 패널 수정이 남았다. 720→900px, `width`, `max-width`, `min-width`, 전용 선택자를 바꿨지만 동일한 이중 폭 제한을 유지했다.
- **작업 방식의 원인:** 초기 추천 패널 요청에 대상 가설을 고정해 `about.html` URL·제목·본문을 보고도 현재 대상으로 재분류하지 않았다. PC의 `about.html` 증상을 확인해야 하는 중에 360px 추천 패널을 검증 근거로 사용했고, `club.html`의 공용 `.about-section` DOM과 매칭 규칙을 대조하지 않은 채 전용 CSS를 쌓았다. “여전히 같다”는 반복 증거를 가설 오류가 아니라 패치 강도 부족으로 오독했다.
- **기술적 원인:** PC `--page-x` 거터를 `max-width` 박스의 내부 padding으로 동시에 사용해 콘텐츠 폭을 두 번 제한했다. 상위 박스의 표면 폭만 넓어지고 실제 본문은 0px로 남았으므로 수치 조정으로는 해결할 수 없었다.
- **해결·검증:** 실패한 전용 900px 규칙을 모두 제거하고 WHY 3개 래퍼만 공용 `.about-section`으로 교체했다. 1,920px 브라우저에서 `about.html`과 `club.html`을 같은 조건으로 캡처해 본문 시작점·폭·줄바꿈을 확인했다. 첫 시도 직전과의 누적 diff에는 HTML 클래스 3개 교체만 남겼다.
- **재발 방지 판정:** “다른 페이지와 공용 규격으로”가 종료 조건이면 새 폭 숫자나 페이지 전용 선택자보다 **기준 페이지와 같은 DOM 컴포넌트를 재사용했는지**를 먼저 확인한다. 예외 CSS가 필요하면 공용 컴포넌트로 해결할 수 없는 구체적 차이를 먼저 설명한다.

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

## 11. 글로우 펄스(반짝임) 표준 (2026-08-02 확정)

"조건부로만 나타나고 놓치면 안 되는 정보"(관리자가 채워둔 게임정리·룰요약·에러플로그, 입고예정 안내, 안 읽은 알림, 이번주 모임 상태, 추천게임 1위, 대표 캐릭터/칭호 등)에 시선을 끌기 위해 쓰는 표준 애니메이션. 실제로 여러 차례 강도를 잘못 잡아(너무 어둡다/밝다/부담스럽다/줄 전체가 번진다) 반복 조정한 끝에 정착한 값이라 **새로 만들지 말고 그대로 재사용**한다.

**표준값**: `animation-duration: 3.6s ease-in-out infinite`, 트로프(0%, 100%)는 **완전히 투명**(`border-color:transparent` 또는 `box-shadow:0 0 0 0 transparent`), 피크(50%)는 `box-shadow: 0 0 9px 2px <색상>`(2026-08-02부터 박스형은 `16px 5px`, 아래 참고). `prefers-reduced-motion: reduce`에서 항상 `animation:none`.

⚠️ **2026-08-02 실제 코드가 이 표준을 절반만 지키고 있었다** — `orgBtnGlow`/`sheetAvailGlow`/`earliestChipGlow` 셋 다 `box-shadow`만 펄스하고 `border-color`는 정적으로 박혀 있어서, 트로프에도 색 있는 테두리가 남아 "최소 상태에도 이미 강조돼 보인다"(사용자 지적 — 다른 메뉴와 구분 안 되는 지점부터 시작해야 대비가 극명하다). `border-color`도 함께 펄스하도록 셋 다 수정(색상별 `--org-border`/`--avail-border` 커스텀 프로퍼티로 `.is-warn`/`--preorder` 변형까지 대응). **배경은 그대로 둔다** — 배경은 "지금 이게 존재/활성 상태"라는 정보라 지우지 않고, 테두리·링만 트로프에서 완전히 사라지게 한다.

- **테두리 있는 박스**(실제 `background`가 있는 버튼·배지·카드)는 `border-color`+`box-shadow`를 함께 펄스(`.sheet-org-btn`, `.sheet-avail-notice--pending/--preorder`, `.meeting-day-chip.is-earliest` 참고 — 게임정리/룰설명/에러로그 버튼, 입고예정 안내, 모임 요일칩이 이 부류). **2026-08-02 강도 상향**: 배경 있는 박스 3종(위 예시)은 표준값(`9px 2px`)이 "은은해서 애매하다"는 피드백으로 `box-shadow: 0 0 16px 5px <색상>`(알파도 `.5~.6`→`.8~.9`대로 상향)으로 통일 — **스케일 확대(transform: scale) 없이 링만 더 화끈하게** 키우는 쪽으로 확정(사용자가 "살짝 팝" 있는 시안은 거부, 링만 커지는 쪽을 선택). 이 세 곳 외 신규로 늘릴 땐 이 절충값(`16px 5px`)을 기본으로 삼는다.
- **배경 없는 순수 텍스트**(대표 캐릭터명·칭호, 이번주 모임 상태 메시지)는 **박스가 아니라 글자 자체가 완전히 나타났다 사라진다**(`textBlinkGlow` 키프레임, `.profile-panel-rep-name`/`.profile-panel-title-name`/`.meeting-status-msg.is-glow` 공유). **2026-08-02 세 단계로 정착**: ①처음엔 "text-shadow만으론 안 보인다"며 투명 테두리+box-shadow로 박스 모양을 흉내냄 → ②사용자가 "박스 테두리 말고 글씨 자체가 반짝이는 게 낫다"고 판단, 항상 읽히는 이중 레이어 `text-shadow`로 교체 → ③시안 비교 끝에 "아예 글자가 나타났다 사라지는" 완전 소멸형(opacity 1↔0 + text-shadow 동기화)으로 재확정, 캐릭터명·칭호까지 전부 이 방식으로 통일. **배경 필(pill)로 채우는 방식은 ①보다도 전에 시도했다가 "부담스럽다"는 피드백으로 폐기**됐던 것 — 그것과는 다른 방향(필 대신 박스 자체를 없앰).
  - **핵심 조건: opacity와 text-shadow의 피크·트로프가 정확히 같은 시점이어야 한다** — 어긋나면 "글자가 안 보일 때 그림자만 진해지는" 무의미한 상태가 된다(실제로 처음 구현이 이 실수였다).
  - 트로프에서 `text-shadow:none` 대신 `0 0 0 rgba(...,0)`(레이어 수를 맞춘 명시적 투명값)을 쓸 것 — `none`은 셰이프가 안 맞아 부드럽게 보간되지 않는다.
  - ⚠️ **버튼 요소(`<button>`)에 이 패턴을 쓸 땐 `border:none`을 명시할 것** — 안 그러면 브라우저 기본 버튼 테두리가 드러난다(`.profile-panel-title-name`에서 실제 발생, 검정 사각 테두리로 신고됨).
  - **박스에 이미 배경이 있는 것**(모임 요일칩의 `has-vote` 등)은 이 대상이 아니다 — 배경 자체는 "그 날 활동이 있다"는 상시 정보라 사라지면 안 되고, 강조는 링(`box-shadow`)만 펄스한다(아래 참조).
- **이미 큰 정적 그림자가 있는 카드**(`.game-card.active`)에 얹으면 기존 그림자에 묻힌다 — 피크 강도를 확실히 올리거나(9px/2px 이상) 별도 레이어로 분리.
- **여러 개가 동시에 뜰 수 있는 목록 컨텍스트**(검색 자동완성 배지, 알림 리스트의 NEW 여러 건, 관리자 목록형 뱃지)에는 **적용하지 않는다** — 여러 개가 같이 반짝이면 산만해진다는 이유로 의도적으로 제외한 전례가 있다(`.avail-badge-sm`, `.profile-notif-new-badge`는 안 읽은 알림이 정확히 1건일 때만 켜짐, `kakao-auth.js`의 `is-multi-new` 참고).
- **예외**: `.profile-char-card/.profile-title-card.is-newly-earned`(신규 해금 캐릭터·칭호 카드)는 순수 펄스가 아니라 "새로 얻음" 상태를 계속 표시하는 뱃지라 트로프에도 정적 링(`0 0 0 1px #e09a3c`)이 남아있다 — 완전 투명 규칙의 의도적 예외.
- **색상은 문맥에 맞춰 변주**(주의/경고는 붉은 계열 `#9e3a2a`, 정보/특수정보는 베이지·황금 계열 `rgba(200,168,122,*)`/`rgba(224,154,60,*)`, 알림은 빨강 `#e53935`) — 다만 주기·번짐 수치는 위 표준값을 벗어나지 않는다.
