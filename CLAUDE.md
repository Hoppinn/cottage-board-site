# CLAUDE.md

Claude Code가 이 프로젝트에서 따라야 할 규칙.

---

## 문서 관리

- PROJECT_STRUCTURE.md를 업데이트할 때는 새 버전 파일(v16, v17 등)을 만들지 않는다.
  기존 파일을 덮어씌운다.
- PROJECT_STRUCTURE.md를 갱신할 때는 FULL_TREE.txt도 함께 갱신한다.
  FULL_TREE.txt 생성 시 `.claude/`, `.git/`, `.github/` 관련 폴더/파일은 제외한다.
- 작업 세션이 끝날 때마다 `docs/TODO.md`를 실제 상태에 맞게 갱신한다.
  완료된 항목은 ✅ 완료 처리, 새로 발견된 버그나 작업은 추가한다.
- TODO.md의 날짜(기준: YYYY-MM-DD)도 갱신한다.

## Git 작업

- 작업이 완료될 때마다 자동으로 커밋한다.
- commit 후 자동으로 push하지 않는다. push는 사용자가 명시적으로 요청할 때만 한다.
