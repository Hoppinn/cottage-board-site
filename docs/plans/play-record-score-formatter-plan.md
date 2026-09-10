# 플레이기록 점수 formatter Plan

## 승인된 범위

- 기존 `game-reviews.js`의 score 끝단위 판단을 `play-records-utils.js`의 `window.formatPlayScore(raw)`로 공용화한다.
- Play Record Display Family 네 surface(플레이기록 게시판·홈 최근 플레이·게임정보 플레이기록·게임별 기록페이지)가 같은 formatter를 사용한다.
- 숫자만으로 된 `/` 점수열은 공백과 `점`을 정리해 마지막에만 `점`을 두고, 협력승리 등 자유 문자열은 기존 내용·끝문자 판단을 보존한다.

## 영향과 경계

- 변경: `play-records-utils.js`, `game-reviews.js`, `index-page.js`, `game-sheet.js`, `docs/js-api.md` 및 Play Record Display Family 문서.
- 보존: people row, card shell, 사진/게임평, score_note 저장값, 시간 표기와 UI 구조.
- 검증: formatter 입력 예시와 네 consumer의 공용 호출을 `scripts/verify-play-record-score-format.js`로 확인한다.
