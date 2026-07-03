# 리팩토링 및 점검 작업 계획

작성일: 2026-07-02

## 목적

프로젝트 전체를 한 번에 갈아엎지 않고, 버그 수정과 점검을 겸해 작은 단위로 구조를 안정화한다.

이 계획의 핵심 원칙:
- 기능 구현과 리팩토링을 섞지 않는다.
- 먼저 문서와 실제 코드가 맞는지 점검한다.
- 큰 파일은 바로 분리하지 않고, 위험한 부분과 안전한 부분을 구분한다.
- 한 작업 단위는 가능하면 파일 1~2개, 검증 1개로 제한한다.
- DB/localStorage/window 전역 API 변경은 별도 Plan과 승인 후 진행한다.
- Codex는 감사/설계/작업 지시서 작성과 결과 리뷰를 맡고, Claude Code는 반복 구현/기계적 정리를 맡긴다.
- Claude Code에 맡길 때는 "목표, 수정 가능 파일, 금지 파일/금지 변경, 검증 방법, 커밋 대상"을 한 묶음으로 전달한다.

## 참고 문서

- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_STATE.md`
- `docs/REFACTOR_CHECKPOINT.md`
- `docs/db-schema.md`
- `docs/js-api.md`
- `docs/ls-schema.md`
- `docs/DESIGN_RULES.md`

## 현재 관찰

큰 파일 순위:

| 순위 | 파일 | 대략 줄 수 | 판단 |
|---|---:|---:|---|
| 1 | `assets/css/style.css` | 7466 | 전역 CSS. 바로 분리하면 위험, 먼저 중복/충돌 감사부터 |
| 2 | `assets/js/script.js` | 2777 | 게임시트/공통 동작 혼재. 버그 수정 중심으로 작은 헬퍼부터 |
| 3 | `assets/js/kakao-auth.js` | 2079 | 로그인/내보드/알림/모임보드가 섞임. 가장 조심 |
| 4 | `pages/admin/requests-admin.html` | 1789 | 관리자 UI+분석 로직 혼재. 현재는 카운팅 안정화 우선 |
| 5 | `assets/js/supabase-client.js` | 1729 | DB API 집중 파일. 공개 API라 변경 전 문서 대조 필수 |
| 6 | `assets/js/game-reviews.js` | 1017 | 플레이 기록 입력/목록/사진 관련. 테스트 단위 잡기 좋음 |

기존 `docs/REFACTOR_CHECKPOINT.md`에는 이미 Phase 2 감사 결과가 있다. 다만 일부 항목은 이후 작업으로 해결되었을 수 있으므로 그대로 구현 목록으로 보지 않고, 재검증 입력으로만 사용한다.

## 진행 순서

### 1단계: 문서-코드 싱크 점검

완료 조건:
- `docs/REFACTOR_CHECKPOINT.md`의 Green/Yellow/Red 항목 중 현재도 유효한 것과 이미 해결된 것을 구분한다.
- `db-schema.md`, `js-api.md`, `ls-schema.md`의 명백한 누락/오기를 먼저 고친다.
- 코드 변경 없이 문서만 고칠 수 있는 항목을 우선 처리한다.

첫 후보:
- `js-api.md`의 `attachAc` 시그니처 재확인
- `CottageAchievements.getCharacterPath` 공개 API 문서화 여부 재확인
- `ls-schema.md`와 실제 localStorage 키 비교

### 2단계: 안전한 Green 리팩토링

완료 조건:
- 동작을 바꾸지 않는 이름/주석/문서/중복 상수 정리만 처리한다.
- 각 커밋은 변경 파일 1~2개로 제한한다.

첫 후보:
- `style.css` 파일 헤더 설명 정리
- `kakao-auth.js` 전역 접근 표기 통일 후보 재검증
- `achievements.js` 하드코딩 이미지 경로 후보 재검증

### 3단계: 버그 가능성이 있는 Yellow 점검

완료 조건:
- 실제 증상, 호출처, 검증 방법을 먼저 적고 수정한다.
- 수정 전후 동작을 최소 1개 테스트로 확인한다.

첫 후보:
- `supabase-client.js` `getRepAchievement` 반환값에 이름 누락 여부 확인
- `toggleGameCurious`가 좋아요를 지우는 동작이 의도인지 확인
- `.sheet-section` CSS 중복 정의가 실제 충돌인지 확인

### 4단계: 큰 파일 분리 준비

완료 조건:
- 바로 파일을 쪼개지 않는다.
- 분리 후보의 입력/출력/window 의존/localStorage/DB 의존을 먼저 표로 만든다.

후보:
- `kakao-auth.js`의 `openProfilePanel`
- `pages/admin/requests-admin.html`의 분석 차트 로직
- `assets/js/script.js`의 게임시트 관련 함수 묶음
- `assets/css/style.css`의 섹션별 CSS 경계

### 5단계: Red 작업은 별도 Plan

아래는 바로 구현하지 않는다.

- DB RPC 추가/쿼리 재설계
- localStorage 구조 변경
- window 전역 API 제거/이동
- `style.css` 대규모 분리
- `openProfilePanel` 대형 함수 분리

## 첫 번째 작업 후보

다음 세션 또는 다음 턴에서는 **문서-코드 싱크 점검 1차**부터 시작한다.

추천 시작점:
1. `docs/REFACTOR_CHECKPOINT.md`의 Green 항목이 현재도 유효한지 재검증
2. 문서만 고쳐도 되는 항목 1~2개 처리
3. `PROJECT_STATE.md`에 처리 결과 기록

## Codex ↔ Claude Code 협업 방식 (2026-07-03 확정)

목표: Codex 토큰을 원인 분석과 리뷰에 쓰고, Claude Code는 반복 구현에만 사용한다.

### Codex가 먼저 할 일

1. 관련 문서와 실제 코드 위치를 확인한다.
2. 리팩토링 후보를 "버그 위험 / 단순 중복 / 문서 불일치 / 대형 분리 후보"로 분류한다.
3. Claude Code에 넘길 작업 지시서를 작성한다.
4. Claude Code 결과를 받으면 diff를 기준으로 리뷰한다.

### Claude Code에 넘길 지시서 형식

```
목표:
수정 가능 파일:
수정 금지:
절대 바꾸면 안 되는 동작:
확인할 기존 패턴:
검증 방법:
커밋에 포함할 파일:
의심되면 멈출 조건:
```

### 우선 감사 순서

1. `docs/REFACTOR_CHECKPOINT.md` 남은 Green 후보 재검증
2. `docs/js-api.md`, `docs/ls-schema.md`, `docs/db-schema.md`와 실제 코드 불일치 점검
3. `assets/css/style.css`의 중복/충돌 후보를 "값만 정리 가능"과 "구조 변경 필요"로 분류
4. `assets/js/script.js`의 게임시트 관련 함수 묶음 감사
5. `assets/js/kakao-auth.js`의 내 보드/알림/모임보드 책임 분리 후보 감사
6. `pages/admin/requests-admin.html`은 관리자 분석 카운팅 안정화 후 별도 감사

### 첫 번째 Claude Code 위임 후보

아직 바로 위임하지 않는다. 먼저 Codex가 `REFACTOR_CHECKPOINT.md`의 남은 Green 후보 1개를 실제 코드로 재검증하고, 위 지시서 형식으로 샘플 작업서를 만든다.

## 1차 점검 결과 (2026-07-02)

- `docs/REFACTOR_CHECKPOINT.md`의 `initTagInput` 시그니처 오기재 후보는 현재 `docs/js-api.md`에 4개 인자 형태로 반영되어 있어 해결된 것으로 판단.
- `CottageAchievements.getCharacterPath` 공개 API 누락 후보도 현재 `docs/js-api.md`에 반영되어 있어 해결된 것으로 판단.
- `cottage_is_admin` 누락 후보도 현재 `docs/ls-schema.md`에 반영되어 있어 해결된 것으로 판단.
- 새로 확인한 누락: `club-intro.html`/`requests.html` 계열 localStorage 키가 `docs/ls-schema.md`에 빠져 있어 문서 보강.

다음 점검 후보:
- `docs/REFACTOR_CHECKPOINT.md`의 남은 Green 후보 중 실제로 아직 유효한 항목만 추려내기.
- `style.css` 파일 헤더 설명 정리 가능 여부 확인.
- `supabase-client.js`의 `getRepAchievement` name 누락 후보가 현재도 재현되는지 확인.

## 2차 점검 결과 (2026-07-03)

Codex가 `docs/REFACTOR_CHECKPOINT.md`의 Green 후보 일부를 실제 코드로 재검증했다.

이미 해결된 항목:
- PU1: `docs/js-api.md`의 `attachAc(input, getSuggestions, onSelect, listRef)` 시그니처는 실제 `assets/js/play-records-utils.js`와 일치.
- GDA1: `assets/js/game-display-adapter.js` 상단 주석은 현재 실제 파일명과 일치.
- CSS3: `assets/css/style.css` 상단 주석은 현재 전 페이지 공통 스타일 기준으로 정리되어 있음.
- ACH4: `assets/js/achievements.js`의 `squirrel_lv1` 대표 이미지 설정은 `_charImgPath('squirrel_lv1')` 사용 중.
- ACH8: `docs/js-api.md`의 `window.CottageAchievements` 노출 목록에 `getCharacterPath(achId)` 포함.
- KA8: `assets/js/kakao-auth.js`의 `ensureGameSheet` 호출은 현재 `window.ensureGameSheet?.()` 패턴으로 통일되어 있음.

아직 유효한 Green 후보:
- PU5: `assets/js/play-records-utils.js` 상단 주석이 `parsePhotoUrls / buildPhotoHtml / openLightbox` 3개만 전역 노출로 적고 있으나, 실제 전역 노출은 `parsePhotoUrls`, `buildPhotoHtml`, `openLightbox`, `toInitials`, `hangulMatch`, `attachAc`, `initTagInput`, `buildPhotoItemAdder` 8개.

### Claude Code 위임 작업서 1

목표:
- `assets/js/play-records-utils.js` 상단 파일 주석을 실제 전역 노출 목록과 일치시킨다.

수정 가능 파일:
- `assets/js/play-records-utils.js`
- `docs/PROJECT_STATE.md` (작업 완료 로그 1줄)

수정 금지:
- JS 함수 본문
- 전역 노출 방식
- HTML/CSS
- package 파일

절대 바꾸면 안 되는 동작:
- `window.parsePhotoUrls`, `window.buildPhotoHtml`, `window.openLightbox`, `window.toInitials`, `window.hangulMatch`, `window.attachAc`, `window.initTagInput`, `window.buildPhotoItemAdder` 이름과 할당 위치
- `window.resizeImageFile` optional call

확인할 기존 패턴:
- 파일 하단 `window.xxx = ...` 목록
- `docs/js-api.md` 공유 유틸 표

검증 방법:
- `git diff -- assets/js/play-records-utils.js docs/PROJECT_STATE.md`에서 주석과 로그 외 변경이 없는지 확인
- 함수 본문 diff가 생기면 중단

커밋에 포함할 파일:
- `assets/js/play-records-utils.js`
- `docs/PROJECT_STATE.md`

의심되면 멈출 조건:
- 주석 정리 중 함수명 변경 필요가 생긴다고 판단되는 경우
- 실제 전역 노출 목록과 `docs/js-api.md`가 다르게 보이는 경우

## 3차 점검 결과 (2026-07-03)

### SC2 — `getRepAchievement` name 누락 재검증

**검증 대상**: `REFACTOR_CHECKPOINT.md` SC2. 처리 현황 표에 "✅ 완료"로 기록되어 있으나 완료 사유가 없어 재검증.

**확인 내용**:

- `supabase-client.js` `getRepAchievement` 반환값: `{ id: data.rep_achievement_id }` 만 반환. `name` 필드 없음 — SC2 원래 진단 그대로.
- `kakao-auth.js` 내 `repData?.name` 참조: **파일에 없음**. 체크포인트가 적은 "line 592: `repData?.name`"은 이미 제거된 구 코드.
- 현재 대표 캐릭터 이름 조회 흐름:
  1. `achievements.js` `_fetchUserStats` → `db.getRepAchievement(userId)` → `repAch = { id }`
  2. `kakao-auth.js` `_repName = CottageAchievements.getCharacterName(repAch.id)` (line 1010)
  3. `achievements.js` `getCharacterName` → `ACH_DEFS.find(d => d.id === achId)?.rewards?.char_name` (line 896)
  - DB 반환값의 `name` 필드와 무관하게 로컬 정의에서 이름을 가져옴.

**판단**: 버그 없음. `getRepAchievement`의 반환 구조는 그대로지만, 이름 조회 경로가 DB → 로컬 ACH_DEFS 로 교체되어 동작상 완전히 해결된 상태.

**수정 필요 여부**: 코드 수정 불필요. 문서상 해결됨으로 분류.

---

## 보류

- 관리자 분석 페이지 전체 재구성: 현재는 카운팅 기준 안정화와 상위 탭 sticky만 적용. 큰 UI 재구성은 보류.
- 과거 방문자 데이터 보정: 식별 근거 부족으로 보류.
- 파일 삭제: 사용 여부를 확정하기 전까지 보류.
