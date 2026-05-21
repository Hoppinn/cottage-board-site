# PROJECT_STATE.v11.md

## 기준 시점
2026-05-20 / 코티지보드 홈페이지 제작 이어서

이번 문서는 `PROJECT_STATE.v10.md`, `PROJECT_STRUCTURE.v7.md`, `FULL_TREE.txt`, 현재 업로드된 코드/데이터 확인 후 갱신한 최신 상태다.

---

## 현재 작업 위치

전체게임보기 페이지 `owned-games.html` 모바일 DB 탐색 UX 조정 중.

현재 우선순위는 기존 v10의 “정렬 badge 분리”에서 잠시 확장되어 다음을 함께 점검했다.

1. 전체 폴더/시스템 구조 점검
2. 누락된 config/tag/shelf 시스템 확인
3. 게임책장/위치 시스템 복원
4. CSS warning 확인
5. 다음 방에서 중복 작업 방지용 문서화

---

## 완료/확인된 것

### 1. 전체게임보기 기본 구조
- `owned-games.html` 존재.
- 전체게임 카드형 리스트 출력.
- 한 페이지당 카드 4개 표시.
- 검색창 + 정렬/필터 접기 버튼 row 구성.
- 검색 결과 0개일 때 `owned-empty` 분리.
- 페이지네이션 기본 작동.

### 2. 정렬/필터 구조
- 이름 / 난이도 / 평점 정렬 select 존재.
- `activeSortKeys` 기반 다중 정렬 작동.
- 마지막으로 건드린 정렬 기준이 1순위로 올라감.
- `-` 선택 시 해당 정렬이 우선순위에서 제외됨.
- 현재 남은 문제: 우선순위 번호가 option 텍스트 안에 들어가 native select 열림 상태에서도 같이 보임.

다음 구조:
```text
[1] 이름 ↑
[2] 난이도 ↑
    평점 -
```

즉 번호는 select text가 아니라 별도 badge/span으로 분리한다.

### 3. 난이도 표시
- `formatDifficultyWeight()`로 1 → 1.00, 1.5 → 1.50 형태 통일.
- 값 없음/0/비정상값은 `-`.
- 난이도 정렬 사용 중에는 difficultyWeight 없는 게임 제외하는 방향 확정.

### 4. 게임책장/위치 시스템

중요: 기존에 이미 시스템이 있었다.

실제 canonical 파일:
```text
game-system/config/shelf-groups.js
```

대표 구조:
```text
A   파티게임
A-1 몸으로 하는 게임
A-2 1000피스 직소퍼즐
A-3 장난감
A-4 범용코인 · 포커칩 · 마작패
A-5 고객분실물
B   라이트패밀리게임
B-1 쉬운 협력게임
C   헤비 전략게임
C-1 어려운 협력게임
D   작은상자에 담긴 게임
E   2인 베스트게임
F   기타공간
```

현재 생성 데이터에는 `cottage.shelfGroupId` 값이 들어가기 시작함.
예:
```text
파티
가족
전략
작은
```

주의:
- 현재 최종 표시명은 새로 설계하면 안 됨.
- `shelf-groups.js` 기준으로 표시명 변환해야 함.
- 손님은 A/B/C 코드를 모르므로 코드보다 책장명 중심으로 보여줘야 함.

추천 표시 문구:
```text
게임책장 · 파티게임 책장 - 몸으로 하는 게임
```

또는 짧게:
```text
게임책장 · 파티게임 - 몸으로 하는 게임
```

카드에서는 더 짧게:
```text
게임책장 · 파티게임
```

상세 바텀시트에서는 풀표기:
```text
게임책장
파티게임 책장 - 몸으로 하는 게임
```

### 5. 위치 컬럼 → shelfGroupId
원본 `cottage-owned-games.tsv/xlsx`에는 위치 계열 값이 존재함.
`build-cottage-game-data.js`의 `shelfGroupId` 생성부는 반드시 다음 컬럼을 읽어야 함.

```js
shelfGroupId: getValue(
  row,
  [
    "책장그룹",
    "위치",
    "shelfGroupId",
    "shelf_group",
    "shelf"
  ]
)
```

주의:
- 업로드된 `build-cottage-game-data.js` 사본에는 `"위치"`가 빠져 있었음.
- 이후 생성된 gameData에는 shelfGroupId 값이 들어간 것을 확인했으므로, 로컬 최신 파일에는 패치됐을 가능성이 있음.
- 다음 방 첫 작업 시 `build-cottage-game-data.js`의 해당 배열에 `"위치"`가 실제 저장돼 있는지 확인 필요.

### 6. 프론트 표시 작업 상태
현재 업로드된 `script.js` 기준으로는 아직 `getGameShelfLabel()` / `shelfLabel` / `sheet-location`이 확인되지 않음.
사용자 로컬에서 일부 수정했을 수 있으므로 다음 방에서 실제 최신 `script.js`를 다시 확인해야 함.

추가해야 할 위치:
```text
renderOwnedGameList()
→ 전체게임 카드 메타라인

openGameSheet(gameKey)
→ 상세 바텀시트 게임 제목 아래
```

### 7. CSS warning
현재 VS Code warning 2개 확인.

1. `-webkit-line-clamp` 사용부에 표준 속성 추가:
```css
display:-webkit-box;
-webkit-line-clamp:2;
line-clamp:2;
-webkit-box-orient:vertical;
overflow:hidden;
```

2. 빈 legacy selector block 제거:
```css
.owned-control-title,
.owned-sort-item,
...
.owned-game-tag{
}
```
이 블록은 통째로 삭제하거나 주석만 남긴다.

---

## 문서화 오류/교훈

이번에 가장 큰 문제:
```text
shelf-groups.js가 이미 있었는데 PROJECT_STRUCTURE.v7에 누락되어 있었다.
```

그 결과:
- 기존 시스템을 바로 못 찾음.
- 새 설계를 중복 제안함.
- 위치/책장 시스템에서 삽질 발생.

해결:
- `PROJECT_STRUCTURE.v8.md`에 `game-system/config/shelf-groups.js`를 공식 등록.
- `PROJECT_STATE.v11.md`에 게임책장 시스템을 최신 상태로 명시.
- 앞으로 기능을 새로 설계하기 전에 `config/`, `tags/`, `tools/`, `game-data/` 실제 트리를 먼저 확인한다.

---

## 현재 남은 작업 우선순위

### 1순위: 게임책장 표시 시스템 완성

작업 순서:
1. `build-cottage-game-data.js`에서 `"위치"` 컬럼 포함 여부 확인.
2. `cottage-games-data.js`에서 `cottage.shelfGroupId` 값 확인.
3. `shelf-groups.js`를 프론트에서 쓸 수 있게 할지, `script.js`에 임시 매핑을 둘지 결정.
4. 카드에 `게임책장 · 파티게임` 표시.
5. 바텀시트에 `게임책장 · 파티게임 책장 - 몸으로 하는 게임` 표시.

추천 방향:
- 장기: `shelf-groups.js`를 브라우저 로드 가능하게 변환 또는 별도 browser map 생성.
- 단기: `script.js` 안에 최소 매핑 함수로 표시 먼저 완료.

### 2순위: CSS warning 2개 제거
- `line-clamp` 추가.
- 빈 ruleset 제거.

### 3순위: 정렬 badge 분리
- option text에서 `1.` 제거.
- 별도 badge/span으로 우선순위 표시.
- `updateSortOptionLabels()` 역할 축소.
- CSS override 정리.

### 4순위: owned controls CSS 정리
- `.owned-sort-*`, `.owned-filter-*`, `.owned-toolbar`, `.owned-search-row` 관련 최종 override 1개로 압축.

### 5순위: 추천게임 더보기
- 추천 결과 많을 때 일부만 표시.
- 더 많은 게임 보기 버튼.
- owned-games로 조건 query 전달 검토.

### 6순위: 상세 바텀시트 hierarchy polish
- 게임책장 정보
- 코티지 정보
- BGG 정보
- 추천/주의/룰요약
순서 정리.

### 7순위: 데이터 시스템 재개
- auto-tag-rule 시스템 완성.
- 최종 gameData 구조 확정.
- 자동 태그 + 수동 보정 merge 안정화.
- 게임명만 입력하면 자동 build.
- 서버 직접 입력/핸드폰 관리 구조 검토.

---

## 다음 방 첫 문장 추천

```text
Cottageboard 이어서. PROJECT_STRUCTURE.v8.md / PROJECT_STATE.v11.md 기준으로 시작. 먼저 게임책장 표시 시스템부터 완료하자. 기존 shelf-groups.js가 canonical이고, 새 설계 금지. 해야 할 순서: build-cottage-game-data.js의 위치 컬럼 확인 → gameData.shelfGroupId 확인 → script.js 카드/바텀시트에 게임책장 표시 → CSS warning 2개 제거 → 그다음 정렬 badge 분리.
```

---

## git commit 후보

게임책장 표시까지 완료 후:
```bash
git add .
git commit -m "게임책장 위치 표시 시스템 연결"
git push
```

문서만 먼저 저장할 경우:
```bash
git add docs/PROJECT_STATE docs/PROJECT_STRUCTURE
git commit -m "프로젝트 구조 문서 최신화"
git push
```
