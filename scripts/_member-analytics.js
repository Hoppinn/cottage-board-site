// scripts/_member-analytics.js — 검증 스크립트용 공용 로더 (P4, 2026-07-22)
//
// member-analytics.js는 브라우저 모듈(window.MemberAnalytics에 싣는 IIFE)이다. 검증
// 스크립트가 그 집계(기간 헬퍼·정규화·페이지 맵·이벤트 계열)를 사본으로 다시 짜면 화면과
// 조용히 갈린다(#15). 그래서 **그 파일을 실제로 eval**해 노출된 객체를 그대로 꺼내온다.
//
// mutate(src)를 주면 eval 전에 소스를 변형한다 — 음성 대조군 전용(일부러 한 줄을 지워
// 판정기가 그걸 잡는지 본다). 본검사에서는 넘기지 않는다.
const fs = require('fs');
const path = require('path');

function loadMemberAnalytics(mutate) {
  const window = {};
  let src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'member-analytics.js'), 'utf8');
  if (mutate) src = mutate(src);
  eval(src);
  if (!window.MemberAnalytics) throw new Error('member-analytics.js가 window.MemberAnalytics를 싣지 않았다 — 로더가 낡았다');
  return window.MemberAnalytics;
}

module.exports = { loadMemberAnalytics };
