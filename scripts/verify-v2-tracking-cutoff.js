// v2(활성 뷰) 추적 cutoff 로직 검증 — computeV2Cutoff/filterToV2/buildPageMap의 내부 필터.
// member-analytics.js를 실제로 eval해서 검사한다(사본 금지, #15).
//
//   node scripts/verify-v2-tracking-cutoff.js --negctl
//   node scripts/verify-v2-tracking-cutoff.js
const { loadMemberAnalytics } = require('./_member-analytics');
const NEGCTL = process.argv.includes('--negctl');

let fail = 0;
const check = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

function mk(page, entered_at, user_id, duration_sec = 60) {
  return { page, entered_at, user_id, session_key: 'sk', duration_sec };
}

console.log('\n=== 1) computeV2Cutoff: v1/v2 섞인 셋에서 최초 v2 시각을 정확히 찾는가 ===');
{
  const MA = loadMemberAnalytics(NEGCTL ? src => src.replace("'my-board', 'other-board',", "'__never-real-key__',") : undefined);
  const rows = [
    mk('index', '2026-07-01T00:00:00Z', 'u1'),
    mk('index', '2026-08-17T23:00:00Z', 'u1'),
    mk('my-board', '2026-08-18T05:00:00Z', 'u1'), // 최초 v2 행
    mk('index', '2026-08-18T05:00:10Z', 'u1'),
    mk('other-board', '2026-08-19T00:00:00Z', 'u2'),
  ];
  const cutoff = MA.computeV2Cutoff(rows);
  if (NEGCTL) {
    check(cutoff === null, `--negctl(가상 키 목록을 무력화): cutoff이 null이어야 함 — 실제 ${cutoff}`);
  } else {
    check(cutoff === '2026-08-18T05:00:00Z', `cutoff = 최초 my-board 시각 — 실제 ${cutoff}`);
  }
}

console.log('\n=== 2) computeV2Cutoff: v2 행이 하나도 없으면 null(전부 잘리는 사고 방지) ===');
{
  const MA = loadMemberAnalytics();
  const rows = [mk('index', '2026-07-01T00:00:00Z', 'u1'), mk('game-reviews', '2026-07-02T00:00:00Z', 'u1')];
  const cutoff = MA.computeV2Cutoff(rows);
  check(cutoff === null, `v2 행 없음 → null — 실제 ${cutoff}`);
  const filtered = MA.filterToV2(rows, cutoff);
  check(filtered.length === rows.length, `filterToV2(rows, null) → 원본 그대로(0건으로 안 잘림) — 실제 ${filtered.length}/${rows.length}`);
}

console.log('\n=== 3) filterToV2: cutoff 이후만, 이전은 제외(경계값 포함=inclusive) ===');
{
  const MA = loadMemberAnalytics();
  const rows = [
    mk('index', '2026-08-17T23:59:59Z', 'u1'),
    mk('my-board', '2026-08-18T00:00:00Z', 'u1'),
    mk('index', '2026-08-18T00:00:00Z', 'u1'), // cutoff과 정확히 같은 시각 — 포함돼야 함
    mk('index', '2026-08-18T00:00:01Z', 'u1'),
  ];
  const cutoff = MA.computeV2Cutoff(rows);
  const filtered = MA.filterToV2(rows, cutoff);
  check(filtered.length === 3, `4건 중 3건 남음(cutoff 이전 1건 제외) — 실제 ${filtered.length}`);
  check(!filtered.some(r => r.entered_at < cutoff), `남은 행 중 cutoff 이전 없음`);
}

console.log('\n=== 4) buildPageMap이 내부적으로 v2 cutoff을 자동 적용하는가(호출부가 안 걸러도) ===');
{
  const MA = loadMemberAnalytics();
  const rows = [
    mk('index', '2026-07-01T00:00:00Z', 'u1', 600), // v1, 10분 — 걸러져야 함
    mk('my-board', '2026-08-18T05:00:00Z', 'u1', 60),
    mk('index', '2026-08-18T05:01:00Z', 'u1', 30),
  ];
  const pm = MA.buildPageMap(rows, 'member', 'u1', 'all', '2026-08-19');
  const totalSec = [...pm.values()].reduce((s, v) => s + v.totalSec, 0);
  check(totalSec === 90, `v1의 600초는 안 잡히고 v2의 60+30=90초만 — 실제 ${totalSec}`);
  check(!pm.has('index') || pm.get('index').totalSec === 30, `index 항목이 v1의 600초를 안 먹음(30초만) — 실제 ${JSON.stringify(pm.get('index'))}`);
}

console.log('\n=== 5) 실제 파일에 V2_ONLY_PAGE_KEYS로 등록된 my-board류가 page-labels.js에도 다 있는가(라벨 누락 방지, #16류) ===');
{
  const fs = require('fs'), path = require('path');
  const MA = loadMemberAnalytics();
  const labelsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'page-labels.js'), 'utf8');
  const window = {}; // page-labels.js가 바로 이 이름을 참조한다(_member-analytics.js 로더와 동일 관례)
  eval(labelsSrc);
  const missing = [...MA.V2_ONLY_PAGE_KEYS].filter(k => !(k in window.COTTAGE_PAGE_LABELS));
  check(missing.length === 0, `V2_ONLY_PAGE_KEYS 전부 COTTAGE_PAGE_LABELS에 라벨 있음 — 누락 ${JSON.stringify(missing)}`);
}

console.log(`\n${fail === 0 ? '✅ 전부 통과' : `🔴 ${fail}건 실패`}`);
process.exit(fail === 0 ? 0 : 1);
