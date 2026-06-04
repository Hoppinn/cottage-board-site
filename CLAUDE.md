# CLAUDE.md

Claude Code가 이 프로젝트에서 따라야 할 규칙.

---

## 세션 시작 시 필독

모든 작업 세션 시작 전에 반드시 아래 두 문서를 먼저 읽는다.

- `docs/PROJECT_STRUCTURE.md` — 페이지 구조, JS 역할, DB 테이블, 데이터 흐름
- `docs/PROJECT_STATE.md` — 현재 완료 기능, 버그 목록, 중복 구현, 추후 작업

---

## 문서 관리

- 추후 작업 목록은 PROJECT_STATE.md에서만 관리한다. TODO.md는 사용하지 않는다.
- docs/TODO.md가 있으면 삭제한다.
- 커밋 전 아래 순서로 문서 갱신한다:
  1. PROJECT_STATE.md — 오늘 변경사항 반영
  2. PROJECT_STRUCTURE.md — 아래 중 하나라도 해당하면 갱신:
     - 페이지 파일 이동/추가/삭제
     - DB 테이블·컬럼 변경
     - JS 전역 API(window.CottageDB, window.escH 등) 변경
     - 인증·데이터 흐름 변경
  3. git diff로 실제 변경 여부 확인 후 커밋
- 서브에이전트에 작업을 위임한 경우, 완료 후 문서 갱신 여부를 직접 확인한다.
  서브에이전트는 CLAUDE.md 규칙을 따르지 않는다.

## 운영 규칙 관리

작업 중 운영 방식이 바뀌면:
- 이번 세션만 적용 → PROJECT_STATE.md에 메모
- 앞으로 계속 적용 → CLAUDE.md 갱신

커밋 전, 바뀐 운영 방식이 있으면 사용자에게 한 줄로만 물어봐라.  
예: "TODO.md 삭제 규칙 CLAUDE.md에 추가할까요?"  
목록 나열하거나 길게 설명하지 말 것.

## Git 작업

- 작업이 완료될 때마다 자동으로 커밋한다.
- commit 후 자동으로 push하지 않는다. push는 사용자가 명시적으로 요청할 때만 한다.
