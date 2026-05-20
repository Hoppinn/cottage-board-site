# PROJECT_STRUCTURE.v6

## 코티지보드 홈페이지 프로젝트 구조 메모

이 문서는 다음 채팅방에서 작업을 이어가기 위한 구조 기준이다.

## 핵심 작업 원칙

### UI 작업 workflow

코티지보드 홈페이지/UI 작업은 앞으로 다음 순서를 기본값으로 한다.

1. 구조 시안 빠른 비교
   - A안 / B안 / C안으로 레이아웃과 UX 구조를 먼저 판단한다.
   - 코드 수정 전에 구조 자체가 맞는지 먼저 본다.

2. 방향 확정
   - 사용자가 선택한 구조를 기준으로만 구현한다.
   - 기존 구조 유지에 집착하지 않는다.

3. 묶음 수정
   - HTML/CSS/JS 수정 범위를 한 번에 정리한다.
   - 단순한 몇 줄 수정은 부분수정으로 안내한다.
   - 구조가 크게 바뀌거나 파일이 꼬였을 때만 전체 파일 교체 방식을 쓴다.

4. 마지막 polish
   - 여백, 높이, 선, 그림자, 색감은 마지막에 조정한다.

이 원칙은 이번 전체게임보기 페이지 작업에서 새로 확정된 핵심 workflow다.

## 현재 주요 파일

### ROOT

```text
index.html
owned-games.html
store-usage-guide.html
contact.html
```

### assets

```text
assets/css/style.css
assets/js/script.js
assets/js/view/game-view-utils.js
assets/images/main/logo.png
```

### game-system

```text
game-system/game-data/library/games/cottage-games-data.js
game-system/game-data/library/games/cottage-games-data.json
game-system/game-data/generated/maps/bgg-tag-translations.js
game-system/tools/
```

## owned-games.html 현재 구조 기준

전체게임보기 페이지는 `body class="owned-page"`를 사용한다.

현재 상단 구조 목표:

```text
h1 전체 게임 보기

owned-search-box
  - 게임 검색창
  - 항상 고정 노출

ownedToolsToggle
  - ▼ 정렬·필터 / ▲ 정렬·필터
  - 정렬·필터 영역 접기/펼치기 버튼

ownedToolbar
  - 기본 접힘 상태
  - 정렬/필터만 포함

ownedGameList
  - 전체게임 카드 목록

ownedPagination
  - 페이지네이션
```

## 전체게임보기 페이지 UI 방향

검색은 고정한다.

정렬/필터는 접는다.

이유:
- 검색은 가장 자주 쓰는 기능이다.
- 정렬/필터는 보조 탐색 기능이다.
- 모바일에서 세로 공간을 줄여야 한다.
- 전체게임 페이지가 관리툴처럼 보이지 않게 해야 한다.

## 정렬/필터 목표 구조

닫힘:

```text
[게임 검색창]

▼ 정렬·필터
```

열림:

```text
[게임 검색창]

▲ 정렬·필터

↕ 정렬 [이름] [난이도] [평점]

🔎 필터 [체감 난이도] [메커니즘]
```

## 작업 시 주의

- 검색창은 `owned-toolbar` 안에 넣지 않는다.
- `owned-toolbar`에는 정렬/필터만 둔다.
- 정렬/필터는 기본 접힘으로 시작한다.
- 기존 정렬/필터 기능은 유지한다.
- 기능 추가는 하지 않는다.
- CSS polish 전에 구조를 먼저 확정한다.

## 다음방 첫 작업 추천

1. `owned-games.html`에서 검색창을 toolbar 밖에 유지
2. 검색창 아래에 `ownedToolsToggle` 추가
3. `owned-toolbar`에 `id="ownedToolbar"`와 `is-collapsed` 추가
4. `script.js`에 toggle 이벤트 추가
5. `style.css`에 접힘/펼침 스타일 추가
6. 화면 확인 후 카드 간격 polish

## 장기 미완 항목

1. auto-tag-rule 시스템 완성
2. 최종 gameData 구조 확정
3. 실제 JSON/JS 생성 구조에 자동 태그 + 수동 보정 merge 적용
4. 전체게임 상세페이지 UI 연결
5. CMD/EXE 또는 입력창에서 새 구입 게임 한글명만 입력하면 tools가 자동 실행되어 최종 출력용 데이터에 추가되는 시스템 검토/구현
6. 서버 호스팅 시 파일을 매번 업로드하지 않고 서버에 직접 입력하며 핸드폰에서도 관리 가능한 구조 검토/구현
