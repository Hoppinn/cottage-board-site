# cottageboard-tag-rules-v1

## 포함 파일

```txt
auto-tag-rules.v1.js
TAG_SYSTEM_DECISION.v1.md
```

## 추천 배치

```txt
auto-tag-rules.v1.js
→ game-system/tools/tagging/auto-tag-rules.js

TAG_SYSTEM_DECISION.v1.md
→ docs/PROJECT_STATE/TAG_SYSTEM_DECISION.v1.md
```

## 다음 작업

`build-cottage-game-data.js`에서 아래처럼 연결한다.

```js
const {
  mergeCottageTags
} = require("../tagging/auto-tag-rules");
```

그리고 게임 객체 생성 직후:

```js
const game = mergeCottageTags(rawGame);
gameData[gameKey] = game;
```
