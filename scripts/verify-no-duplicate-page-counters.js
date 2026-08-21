// #15 · #28 · #29 · #30이 전부 같은 병이었다 — "페이지별/사람별 집계를 화면마다
// 사본으로 다시 계산하다 한쪽만 고쳐져서 갈라짐". 코멘트로 4번 적어놨는데 4번 다시 났다
// (admin-analytics.md §5-1, 2026-08-21 사용자 지적: "문서 적어봐야 또 재발하면 소용없다").
// 그래서 이번엔 **문서가 아니라 이 스크립트**가 방지책이다 — pages/admin/requests-admin.html을
// 고칠 때마다(특히 요약 탭 카드류) 이걸 돌려서, "요약 페이지 카드"가 §3-b의 pageUniq를
// 재사용하지 않고 자기 몫으로 다시 세는 사본을 만들었는지 구조적으로 검사한다.
//
//   node scripts/verify-no-duplicate-page-counters.js          ← 평소 실행
//   node scripts/verify-no-duplicate-page-counters.js --negctl ← 판정기 자체가 살아있는지 확인
//
// 접근: 손으로 만든 JS 파서로 임의 코드를 분석하지 않는다(CLAUDE.md 경고 — 예전에 그렇게 하다
// "141개 중 138개 불일치"라는 그럴듯한 거짓을 낸 전적이 있다). 대신 **이미 위치를 아는 특정
// 블록**을 주석 마커로 잘라내(verify-active-view-tracking.js와 같은 기법) 그 안에 실제로
// 무슨 텍스트가 있는지 문자열로만 확인한다 — 판정 범위가 좁고 명확해 오탐 여지가 적다.
const fs = require('fs');
const path = require('path');

const NEGCTL = process.argv.includes('--negctl');
const srcPath = path.join(__dirname, '..', 'pages', 'admin', 'requests-admin.html');

function extractSummaryPageCardBlock(html) {
  const startMarker = '// ── 요약: 페이지 카드 (날짜 연동) ───────────────────────────────';
  const endMarker = '// ── 요약: 회원 카드 신규 (날짜 연동) ─────────────────────────────';
  const from = html.indexOf(startMarker);
  if (from < 0) return null;
  const to = html.indexOf(endMarker, from);
  if (to < 0) return null;
  return html.slice(from, to);
}

function check(block, label) {
  const findings = [];
  if (!block) {
    findings.push('블록 자체를 못 찾음 — 마커 주석이 바뀌었다. 판정 불가(구조 변경 시 이 스크립트도 같이 갱신할 것)');
    return findings;
  }
  // 양성: pageUniq를 재사용하고 있어야 한다.
  if (!/Object\.entries\(pageUniq\)/.test(block)) {
    findings.push('pageUniq를 재사용하지 않는다 — "요약 페이지 카드"가 §3-b의 캐노니컬 집계를 안 쓰고 있다');
  }
  // 음성: 사본 재도입 신호 — "무언가[r.page] = (...)" 형태의 누적 대입이 있으면 새 카운터
  // 객체를 직접 채우고 있다는 뜻이다(변수명이 _pageC가 아니어도 잡는다). 중괄호 균형을 세는
  // 방식(for...of 블록 경계)은 안 쓴다 — 이 파일 실측 코드에 템플릿 리터럴 `${...}`가 섞여
  // 있어 `}`를 블록 종료로 착각하고 일찍 멈춘다(첫 시도에서 실제로 이렇게 놓쳤다).
  const freshCounterPattern = /\w+\[\s*r\.page\s*\]\s*=\s*\(/;
  if (freshCounterPattern.test(block)) {
    findings.push('r.page를 키로 직접 누적하는 대입이 있다 — pageUniq 재사용을 우회한 사본으로 보인다(#30류 재발)');
  }
  return findings;
}

const html = fs.readFileSync(srcPath, 'utf8');
const block = extractSummaryPageCardBlock(html);

if (NEGCTL) {
  // 음성 대조군: #30 수정 이전의 실제 코드(사본이 있던 버전)를 그대로 재현해 판정기가
  // 정말로 이걸 잡아내는지 확인한다. 여기서 안 잡히면 위 findings 로직 자체가 죽은 것.
  const badBlock = `
    // ── 요약: 페이지 카드 (날짜 연동) ───────────────────────────────
    {
      const _src = start ? filtered : rowsV2;
      const _pageC = {};
      const _pageSeen = new Set();
      for (const r of _src) {
        if (!r.page) continue;
        const pid = r.user_id ? String(r.user_id) : (r.session_key ? \`anon:\${r.session_key}\` : null);
        const dKey = (pid || 'anon') + '|' + r.page + '|' + kstDate(r.entered_at);
        if (_pageSeen.has(dKey)) continue;
        _pageSeen.add(dKey);
        _pageC[r.page] = (_pageC[r.page] || 0) + 1;
      }
      const _topP = Object.entries(_pageC).sort((a, b) => b[1] - a[1]).slice(0, 4);
    }
  `;
  const negFindings = check(badBlock, 'negctl(구버전 재현)');
  if (negFindings.length > 0) {
    console.log('✅ 음성 대조군 통과 — 구버전(사본이 있던 코드)을 정확히 잡아냄:');
    negFindings.forEach(f => console.log('  -', f));
    process.exit(0);
  } else {
    console.error('🔴 음성 대조군 실패 — 구버전 코드인데도 아무것도 안 잡혔다. 판정기가 죽어있다. 이 스크립트를 믿지 말 것.');
    process.exit(1);
  }
}

const findings = check(block, '현재 코드');
if (findings.length === 0) {
  console.log('✅ 통과 — 요약 페이지 카드는 여전히 pageUniq를 재사용하고 있고, 새 사본 루프도 없음.');
  process.exit(0);
} else {
  console.error('🔴 재발 감지 — #30류 버그가 다시 생긴 것으로 보인다:');
  findings.forEach(f => console.error('  -', f));
  console.error('\n조치: _sumPage(요약 페이지 카드)가 pageUniq(§3-b, "페이지" 탭)를 그대로 재사용하도록 되돌릴 것. admin-analytics.md §5-1 참조.');
  process.exit(1);
}
