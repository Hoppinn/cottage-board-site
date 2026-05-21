# PROJECT_STATE.v13

## 1. 이번 단계 핵심 변화

이번 단계에서 프로젝트의 중심축이 이동했다.

기존 중심:
TSV / source
→ match-result
→ details-cache
→ build
→ final

새 중심:
게임명 입력
→ add-owned-game.js
→ cache 조회
→ resolvedGame
→ master.json + ledger.xlsx
→ 향후 final 자동 build

즉 batch source pipeline 중심에서 single game orchestration 중심으로 이동했다.

---

## 2. 완료된 작업

### add-owned-game.js 1차 안정화

완료:
- 게임명 입력
- master.json 저장
- ledger.xlsx 저장
- 중복 방지
- cache 조회
- pending-cache 처리
- resolvedGame schema 확장

현재 테스트 완료:
node game-system/tools/admin/add-owned-game.js "캐시없는테스트"

결과:
- master 추가
- ledger 추가
- status: pending-cache

중복 테스트:
같은 이름 다시 입력 시 이미 존재 메시지 출력.
ledger 중복 추가 방지.

---

### paths.js 경로 정리

master 경로가 수정됨.

이전 혼선:
game-system/game-data/library/master

현재 canonical:
game-system/game-data/library/owned/master/cottage-owned-games-master.json

ledger:
game-system/game-data/library/owned/ledger/cottage-owned-games-ledger.xlsx

final:
game-system/game-data/library/owned/final/cottage-games-data.json
game-system/game-data/library/owned/final/cottage-games-data.js

---

### resolvedGame schema 확장

처음에는 최소 draft 구조였으나, 현재는 최대한 풍부한 데이터 모델로 확장됨.

추가/정리된 필드:
- titleEn
- bggId
- yearPublished
- minPlayers
- maxPlayers
- playingTime
- minPlayTime
- maxPlayTime
- minAge
- difficulty
- rating
- bayesRating
- usersRated
- rank
- designers
- artists
- publishers
- categories
- mechanics
- recommendedPlayers
- bestPlayers
- notRecommendedPlayers
- image
- thumbnail
- description
- status
- source

의미:
여기서 final/master/ledger 저장 여부를 정하는 게 아니라, 일단 게임 1개 데이터를 최대한 풍부하게 조립한다.

---

### fetch-bgg-details parser 확장

추가된 parser 항목:
- average
- bayesaverage
- usersrated
- rank
- minage
- designers
- artists
- publishers

기존:
- image
- thumbnail
- description
- yearpublished
- minplayers
- maxplayers
- playingtime
- minplaytime
- maxplaytime
- averageweight
- categories
- mechanics
- suggested_numplayers

현재 parser는 BGG Thing API 응답을 상당히 넓게 받을 준비가 됨.

---

### cache 철학 확정

운영 중 BGG API 직접 호출하지 않는다.

정리:
fetch-bgg-details.js
= API로 cache 쌓는 도구

add-owned-game.js
= cache를 읽어서 master/ledger/final을 생성하는 도구

---

### bestPlayers 철학 확정

bestPlayers:
- 메인 추천 인원
- 홈페이지 추천 기준
- ledger에서 굵은 글씨

recommendedPlayers:
- 보조 추천 인원

notRecommendedPlayers:
- 참고/제외용

---

### UTF8 출력 문제 정리

PowerShell 출력에서 한글이 깨지는 문제는 파일 문제라기보다 터미널 출력 인코딩 문제였다.

해결 명령:
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001

---

## 3. 현재 미완 상태

### details cache

현재 bgg-details-cache.json은 거의 비어 있음.

API disabled 상태:
ENABLE_BGG_THING_API = false

fetchBggDetails 실행 시:
pending 약 425개.

API 승인 후:
ENABLE_BGG_THING_API = true
→ details cache 생성
→ pending-cache 게임 보강 가능.

---

### build-cottage-game-data.js

현재 legacy 구조.

현재 build 방식:
TSV
+ match-result
+ details-cache
+ owned-games-normalized
→ final json/js

즉시 제거 금지.

향후:
master.json 기반 build로 이전.

---

### final auto rebuild

아직 add-owned-game 실행 후 final json/js 자동 갱신까지는 연결하지 않음.

향후:
add-owned-game 끝에서 build 호출 또는 별도 rebuild 명령 연결.

---

## 4. 현재 판단

지금은 데이터 입력 시스템의 핵심 뼈대가 잡혔다.

다음 작업은 둘 중 하나.

A. 시스템 계속:
- pending-cache refresh tool
- final auto rebuild
- master 기반 build

B. UI 진행:
- 추천게임카드
- 전체게임카드
- 상세게임페이지
- 매장안내

현재 추천:
UI/페이지 작업으로 잠시 이동.
API 승인 후 데이터 시스템으로 복귀.

---

## 5. 다음 우선순위

1. 추천게임카드 구조 polish
2. 전체게임카드 구조
3. 상세게임페이지 구조
4. 모바일 UX
5. 매장안내
6. 브랜드 소개

작업 원칙:
- 구조 먼저
- 디테일 나중
- 레이아웃 시안 비교
- 확정 후 코드 묶음 수정
