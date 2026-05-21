# PROJECT_AUDIT_2026-05-20.md

## 목적
다음 채팅방으로 넘어가기 전, 현재 코티지보드 홈페이지 프로젝트의 시스템 누락/중복/위험 지점을 점검한다.

---

## 1. 폴더 구조 점검

### 확인됨
- `assets/`: 프론트 자산 구조 정상.
- `game-system/config/`: 난이도/책장/태그 기준 파일 존재.
- `game-system/game-data/source/`: 원본/수동 데이터 존재.
- `game-system/game-data/generated/`: 자동 생성/캐시 데이터 존재.
- `game-system/game-data/library/`: 홈페이지 최종 데이터 존재.
- `game-system/tools/`: build/fetch/match/source/tagging 분리됨.

### 문제
- 기존 `PROJECT_STRUCTURE.v7.md`가 실제 구조보다 많이 축약되어 `shelf-groups.js`, `tags/` 계층 등을 누락함.

### 조치
- `PROJECT_STRUCTURE.v8.md` 작성.

---

## 2. 게임책장 시스템 점검

### 확인됨
- canonical 파일: `game-system/config/shelf-groups.js`
- A/B/C 및 A-1/A-2 세부 책장 체계 존재.
- `build-cottage-game-data.js`에는 `shelfGroupId` 필드 생성부가 있음.
- 최종 생성 데이터에는 `cottage.shelfGroupId` 값이 들어간 상태가 확인됨.

### 문제
- `PROJECT_STRUCTURE.v7.md`에 `shelf-groups.js` 누락.
- 업로드된 `build-cottage-game-data.js` 사본에는 `"위치"` 컬럼이 누락되어 있었음.
- 현재 업로드된 `script.js` 기준으로는 프론트 표시 helper가 아직 확인되지 않음.

### 조치 필요
- 로컬 최신 `build-cottage-game-data.js`에 `"위치"` 포함 여부 확인.
- `script.js`에 게임책장 표시 helper 추가/확인.
- 카드와 바텀시트에 표시.

---

## 3. 데이터 파이프라인 점검

### 현재 흐름
```text
source/manual/cottage-owned-games.tsv/xlsx
→ tools/build/build-cottage-game-data.js
→ library/games/cottage-games-data.js/json
→ assets/js/script.js 화면 렌더
```

### 공식 실행
```bash
node game-system/tools/convert-bgg.js
```

### 주의
- `cottage-games-data.js/json`은 자동 생성물 성격이므로 직접 편집 지양.
- 위치/책장/태그는 원본과 build 단계에서 처리하는 것이 맞음.

---

## 4. 문서 시스템 점검

### 확인됨
- docs/PROJECT_STATE에 여러 버전 존재.
- docs/PROJECT_STRUCTURE에 여러 버전 존재.

### 문제
- 최신 문서가 실제 구조를 완전히 반영하지 못함.
- 특히 config 계층과 책장 시스템 누락이 중복 작업을 유발함.

### 조치
- 다음 기준 문서:
```text
PROJECT_STRUCTURE.v8.md
PROJECT_STATE.v11.md
PROJECT_AUDIT_2026-05-20.md
```

---

## 5. CSS 점검

### 확인된 warning
1. `-webkit-line-clamp`에 `line-clamp` 추가 필요.
2. 비어 있는 legacy selector block 제거 필요.

### 문제 성격
- 치명적 오류 아님.
- 그러나 누적되면 신뢰도와 작업속도 저하.

### 조치
- 다음 방에서 첫 패치 또는 게임책장 표시 직후 바로 해결.

---

## 6. UI/UX 점검

### 현재 안정 상태
- 검색창
- 정렬/필터 접기 버튼
- compact toolbar
- 4개 카드 + 페이지네이션

### 보류/다음 작업
- 정렬 badge 분리.
- 전체게임 카드 polish.
- 바텀시트 정보 hierarchy 정리.

### 중요 원칙
- 구조 확정 전 CSS 미세조정 반복 금지.
- 먼저 구조 시안 → 확정 → HTML/CSS/JS 묶음 수정 → 마지막 polish.

---

## 7. 중복/혼선 위험

### 위험 1: manual/generated 중복
다음 파일들이 manual과 generated 양쪽에 있을 수 있음.
```text
game-name-aliases.json
mood-tag-rules.json
manual-bgg-matches.json
```

### 조치 필요
- `paths.js` 기준으로 authoritative source 확정.
- generated는 자동 생성 결과만 남기는 방향 검토.

### 위험 2: node_modules 포함 tree
`tree /F`가 node_modules까지 포함되면 구조 파악이 어려워짐.

### 다음부터 권장
Git Bash:
```bash
find . -path './node_modules' -prune -o -path './.git' -prune -o -print > FULL_TREE.txt
```

---

## 8. 다음 작업 순서 확정

1. 게임책장 표시 시스템 마무리.
2. CSS warning 2개 제거.
3. 정렬 badge 분리.
4. owned controls CSS 정리.
5. 추천게임 더보기.
6. 바텀시트 hierarchy polish.
7. 데이터 시스템 재개.
