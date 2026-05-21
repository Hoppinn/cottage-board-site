# PROJECT_STATE.v14

## 0. 현재 프로젝트 상태 요약

현재 코티지보드 프로젝트는:

기존:
TSV / source 중심 batch pipeline

에서

현재:
add-owned-game 중심 orchestration 구조

로 중심축이 이동한 상태다.

즉:
"대량 변환 시스템"

중심에서

"게임명 1개 입력 → 전체 결과물 생성"

중심 구조로 이동했다.

---

## 1. 이번 단계 핵심 변화

### 1-1. add-owned-game.js가 핵심 엔진이 됨

이전에는:
build-cottage-game-data.js 중심 사고가 강했다.

현재는:
add-owned-game.js가 실제 핵심 orchestration 역할을 수행한다.

현재 역할:
- 게임명 입력
- cache 조회
- resolvedGame 생성
- master 저장
- ledger 저장
- 중복 방지
- pending-cache 처리

향후:
- final 자동 rebuild
- GUI
- 모바일 입력
- 웹 관리자

모두 add-owned-game 기반으로 갈 가능성이 높다.

---

### 1-2. ledger/master/final 역할이 정리됨

기존에는 역할 혼선이 있었다.

현재 정리:

ledger.xlsx
= 사람용 간단 장부

master.json
= 사람용 상세 장부 + 시스템 기준 상세 데이터

final.json/js
= 홈페이지 출력용 배포 데이터

중요:
ledger/master 모두 원천 데이터가 아니다.
둘 다 생성되는 결과물이다.

---

### 1-3. cache 철학이 정리됨

핵심:
운영 중 API 직접 호출 금지.

정리:

BGG API
→ cache 생성용

실제 운영:
→ cache 읽기

이유:
- 속도
- 안정성
- API 제한 회피
- 오프라인 운영 가능성
- 서버 의존 감소

---

## 2. add-owned-game.js 작업 상세

### 2-1. 현재 테스트 완료 상태

실행:

node game-system/tools/admin/add-owned-game.js "캐시없는테스트"

결과:
- master 추가 성공
- ledger 추가 성공
- status: pending-cache

중복 테스트:
같은 이름 다시 입력 시:
"이미 존재"

출력 확인.

ledger 중복 추가 방지 확인 완료.

---

### 2-2. resolvedGame 구조 확장

처음:
최소 draft 수준 구조.

현재:
상당히 넓은 canonical game object 수준.

현재 필드:

- id
- ownedName
- titleKo
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
- location
- comment
- tags
- image
- thumbnail
- description
- status
- source

의미:
여기서 데이터를 최대한 풍부하게 만든 뒤,
master/final/UI가 필요한 만큼 가져다 쓰는 구조.

---

### 2-3. bestPlayers 중심 구조 확정

현재 철학:

bestPlayers
= 메인 추천

recommendedPlayers
= 보조 추천

notRecommendedPlayers
= 참고/제외용

ledger:
굵은 글씨 = bestPlayers

홈페이지 추천도 bestPlayers 중심 예정.

---

## 3. fetch-bgg-details.js 작업 상세

### 3-1. parser 확장 완료

추가 완료:
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
- categories
- mechanics
- suggested_numplayers

현재 parser는 꽤 넓은 BGG detail 수집 가능 상태.

---

### 3-2. 현재 API 상태

ENABLE_BGG_THING_API = false

이유:
BGG API 승인 대기.

현재 pending:
약 425개.

현재 bgg-details-cache.json은 거의 비어 있음.

---

### 3-3. 중요한 판단

fetch-bgg-details.js는:
운영 중 직접 호출용이 아니다.

역할:
cache 생성용 batch 도구.

즉:
사용자가 게임 입력할 때마다 API를 부르지 않는다.

---

## 4. build 시스템 상태

### 4-1. 현재 build는 legacy

현재 build-cottage-game-data.js는:

TSV
+ match-result
+ details-cache
+ owned-games-normalized

중심 구조.

즉:
아직 완전히 새 시스템으로 옮겨지지 않았다.

---

### 4-2. 중요한 판단

지금 build를 바로 갈아엎지 않는다.

이유:
현재 홈페이지가 legacy build에 의존 중일 가능성이 높다.

추천 방향:
새 build를 병행 개발.

예:
build-cottage-game-data-from-master.js

---

## 5. 현재 안정화된 것

안정화 완료:
- add-owned-game
- pending-cache
- cache 기반 구조
- resolvedGame schema
- UTF8 출력
- paths canonical 정리
- bestPlayers 구조
- parser 확장

---

## 6. 현재 미완 항목

### 6-1. details cache 실제 생성

현재 API disabled 상태.

승인 후:
ENABLE_BGG_THING_API = true
→ fetch 실행
→ details cache 생성 필요.

---

### 6-2. pending-cache refresh 도구

필요 예정:

refresh-owned-games-from-cache.js

역할:
- pending-cache 게임 찾기
- cache 생겼는지 확인
- 자동 보강
- ready 상태 전환

---

### 6-3. final auto rebuild

현재:
master/ledger까지만 자동 생성.

향후:
final json/js 자동 rebuild 연결 필요.

---

### 6-4. master 기반 build

현재 build는 legacy.

향후:
master 기반 final build 필요.

---

### 6-5. 입력 편의화

현재:
CLI.

향후:
- GUI
- 웹 관리자
- 모바일 입력창

단:
엔진은 add-owned-game 유지.

---

## 7. 홈페이지/UI 현재 상태

다음 우선순위:

1. 추천게임카드 구조 polish
2. 전체게임카드 구조
3. 상세게임페이지 구조
4. 모바일 UX
5. 매장안내
6. 브랜드 소개

현재 판단:
데이터 시스템은 1차 안정화 완료 상태이므로,
잠시 UI 쪽으로 이동해도 괜찮은 타이밍.

---

## 8. 작업 방식 정리

현재 프로젝트는:
긴 전문을 채팅에 직접 복붙하는 방식보다,

PowerShell 기반 docs 생성 방식이 더 적합하다.

현재 방식:
- Set-Content
- Compress-Archive
- docs/PROJECT_DOCS_vXX

장점:
- 렉 감소
- 긴 전문 안정적 저장
- zip 생성 가능
- 다음방 업로드 쉬움
- 운영문서 축적 가능

향후:
PROJECT_STRUCTURE / PROJECT_STATE를 실제 운영문서처럼 버전 관리한다.

---

## 9. 현재 가장 중요한 핵심

현재 가장 중요한 것은:

"구조 중심축이 add-owned-game 쪽으로 이동했다"

는 점이다.

즉:
지금 프로젝트는 더 이상 단순 TSV 변환기가 아니다.

현재는:
게임명 입력
→ canonical game object 생성
→ 여러 결과물 생성

구조로 진화 중이다.
