#!/usr/bin/env node
/**
 * Stop 훅 — 「진행 중인 작업이 미완인데 임의로 멈추는 것」만 막는다.
 *
 * 🚫 이 훅이 **하지 않는 일** (이전 구현이 여기서 망했다):
 *   - 사용자 문장을 분류하지 않는다 (질문인가/명령인가/재개인가를 정규식으로 판별하지 않는다)
 *   - 쓰기·실행 도구를 막지 않는다
 *   - 질문을 받았다고 작업 상태를 건드리지 않는다
 *   자연어 판별은 정규식으로 안정적으로 풀리지 않는다. 그래서 **작업 상태만** 본다.
 *
 * ✅ 하는 일 하나:
 *   .claude/current-task.json 의 status가 open이고 미완 조건이 남아 있으면
 *   "다음 단계를 계속하라"를 반환한다. 그 외엔 침묵한다.
 *
 * 🚨 기본값은 **무개입**이다. 상태 파일이 없으면 아무 일도 일어나지 않는다.
 * 🚨 어떤 오류에서도 fail-open 한다 — 이 장치가 고장 나서 작업을 못 끝내는 게 최악이다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// 진전 없이 연속으로 몇 번 멈추려 하면 손을 떼는가.
// 전역 상한이 아니라 **연속 무진전** 카운트다 — 조건이 하나라도 닫히면 0으로 돌아간다.
// 그래서 실제로 일하고 있는 한 이 한도에 걸리지 않고, 헛도는 순간에만 걸린다.
const MAX_STALLED = 3;

const STATE = path.join(__dirname, '..', 'current-task.json');

// 무엇을 하든 훅이 죽어서 턴을 망치면 안 된다. 전부 fail-open.
function pass() { process.exit(0); }

let raw;
try {
  raw = fs.readFileSync(STATE, 'utf8');
} catch {
  pass(); // 상태 파일 없음 = 추적 중인 작업 없음 = 무개입 (정상 경로)
}

let s;
try {
  s = JSON.parse(raw);
} catch (e) {
  // 상태 파일이 깨졌으면 **막지 않고** 사용자에게만 알린다.
  // 여기서 block을 반환하면 고장난 파일 때문에 영원히 못 멈춘다.
  process.stdout.write(JSON.stringify({
    systemMessage: `[task-continue] current-task.json 파싱 실패 — 이번 정지는 통과시킵니다: ${e.message}`,
  }));
  pass();
}

if (!s || s.status !== 'open' || !Array.isArray(s.conditions)) pass();

const remaining = s.conditions.filter(c => c && !c.done);
if (remaining.length === 0) pass(); // 조건 전부 충족 = 멈춰도 된다

// ── 진전 판정 ───────────────────────────────────────────────
// 지난번 정지 시점보다 미완 조건이 줄었으면 「진전 있음」이다.
// 줄지 않았으면 같은 자리에서 헛돌고 있는 것이므로 카운트를 올린다.
const prev = typeof s._lastRemaining === 'number' ? s._lastRemaining : Infinity;
const stalled = remaining.length < prev ? 0 : (s._stalled || 0) + 1;

s._lastRemaining = remaining.length;
s._stalled = stalled;
try { fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n'); } catch { /* 못 써도 진행 */ }

if (stalled > MAX_STALLED) {
  // 안전장치 발동 — 계속 요구해도 진전이 없다. 손을 떼고 사용자에게 넘긴다.
  process.stdout.write(JSON.stringify({
    systemMessage:
      `[task-continue] 「${s.task || '무제'}」가 ${stalled}회 연속 진전 없이 멈췄습니다. ` +
      `자동 재개를 중단하고 넘깁니다. 미완: ${remaining.map(c => c.label).join(' / ')}`,
  }));
  pass();
}

const list = remaining.map(c => `  - [ ] ${c.label}`).join('\n');
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason:
    `진행 중인 작업 「${s.task}」의 완료 조건이 아직 남아 있다:\n${list}\n\n` +
    `다음 안전한 단계를 이어서 실행하라. 새 작업을 시작하지 말고 이 조건들만 닫는다.\n` +
    `조건 하나를 실제로 끝냈으면 .claude/current-task.json에서 그 항목의 done을 true로 바꾼다 ` +
    `(끝내지 않고 true로 바꾸는 것은 이 장치를 무력화하는 것이다).\n` +
    `사용자가 중단·취소를 지시했거나, 사용자 판단 없이는 진행할 수 없는 지점에 도달했으면 ` +
    `status를 "closed"로 바꾸고 stoppedBecause에 이유를 한 줄 적은 뒤 사용자에게 보고하라.`,
}));
process.exit(0);
