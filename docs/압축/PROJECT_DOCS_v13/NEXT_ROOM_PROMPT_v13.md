PROJECT_STRUCTURE.v13 / PROJECT_STATE.v13 기준으로 이어서.

현재 상태:
- add-owned-game 중심 orchestration 구조 확정
- 게임명 입력 → cache 조회 → resolvedGame 생성 → master/ledger 동시 생성
- cache 없으면 status pending-cache
- cache 있으면 status ready
- resolvedGame schema 확장 완료
- bestPlayers 중심 구조 확정
- fetch-bgg-details parser 확장 완료
- PowerShell UTF8 출력 문제 해결
- paths.js 기준 master 경로는 game-system/game-data/library/owned/master
- ledger 경로는 game-system/game-data/library/owned/ledger/cottage-owned-games-ledger.xlsx
- final 경로는 game-system/game-data/library/owned/final
- build-cottage-game-data.js는 아직 TSV/match-result 기반 legacy 구조 유지
- API는 실시간 호출이 아니라 cache 생성 전용으로 사용

다음 우선순위:
1. 추천게임카드 구조 polish
2. 전체게임카드 구조
3. 상세게임페이지 구조
4. 모바일 UX
5. 매장안내/브랜드 소개

작업 방식:
- 구조 시안 먼저
- A/B/C안 비교
- 확정 후 HTML/CSS/JS 묶음 수정
- 마지막에 디테일 polish

주의:
- add-owned-game/core/cache 구조는 함부로 흔들지 말 것
- legacy build 즉시 제거하지 말 것
- API 승인 후 details cache 생성 및 pending-cache 보강으로 복귀
