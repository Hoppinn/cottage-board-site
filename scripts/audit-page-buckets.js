// #14 실측 — page_sessions.page에 무엇이 저장돼 있는가 (읽기 전용, DB 무변경)
//
//   node scripts/audit-page-buckets.js
//
// 대장의 「가격 & 규칙 174행 vs 가격·이용안내 65행」은 2026-07-20 이전 기재다.
// 「0건」·낡은 수치를 근거로 쓰지 않기 위해 착수 첫 동작으로 다시 잰다.
//
// 보는 것:
//   ① page 값 전수 분포 (행수 / 회원·비회원 / 최초·최근 등장일)
//   ② 값의 형태 판정 — 슬러그(page-labels 키) / 한글 라벨 / 원시 pathname / 미상
//   ③ 같은 페이지를 가리키는 값이 둘 이상인 버킷 (= #14가 말하는 쪼개짐)
//   ④ count:'exact' 대조 — 절단(정확히 1000/50000) 여부
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'page-labels.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const BY_SLUG = window.COTTAGE_PAGE_LABELS;       // slug  -> 라벨
const BY_PATH = window.COTTAGE_PAGE_LABELS_BY_PATH; // path -> 라벨

// pathname -> slug (heartbeat 경로가 만드는 값과 같은 규칙)
const pathToSlug = p => (p.split('/').filter(Boolean).pop() || 'index').replace('.html', '');

// 라벨 -> 그 라벨을 내는 slug들
const labelToSlugs = {};
for (const [p, label] of Object.entries(BY_PATH)) {
  (labelToSlugs[label] ||= new Set()).add(pathToSlug(p));
}
for (const [slug, label] of Object.entries(BY_SLUG)) {
  (labelToSlugs[label] ||= new Set()).add(slug);
}

// 저장값 -> 정규 슬러그 (판정 불가면 null)
function normalize(v) {
  if (v == null) return { slug: null, kind: 'null' };
  if (BY_SLUG[v]) return { slug: v, kind: 'slug' };
  if (v.startsWith('/')) return { slug: pathToSlug(v), kind: 'path' };
  const s = labelToSlugs[v];
  if (s) return { slug: [...s].join('|'), kind: 'label' };
  return { slug: null, kind: 'unknown' };
}

(async () => {
  const { data, error } = await db.from('page_sessions')
    .select('page, user_id, entered_at').limit(50000);
  const { count } = await db.from('page_sessions')
    .select('*', { count: 'exact', head: true });

  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  const got = data.length;
  if (count === null) console.log('🔴 count=null — 테이블 없음/접근불가');
  else if (got < count) console.log(`🔴 절단 ${count - got}행 누락 — max-rows 확인 (요청 ${got} / 실제 ${count})`);
  else console.log(`✅ 전수 확보 ${got}행 (count=${count})`);

  const buckets = new Map();
  for (const r of data) {
    const key = r.page === null ? '(null)' : r.page;
    let b = buckets.get(key);
    if (!b) buckets.set(key, b = { n: 0, member: 0, anon: 0, first: null, last: null });
    b.n++;
    if (r.user_id) b.member++; else b.anon++;
    const t = r.entered_at;
    if (!b.first || t < b.first) b.first = t;
    if (!b.last || t > b.last) b.last = t;
  }

  console.log(`\n=== ① page 값 전수 분포 (${buckets.size}종) ===`);
  const rows = [...buckets.entries()]
    .map(([v, b]) => ({ v, ...b, ...normalize(v === '(null)' ? null : v) }))
    .sort((a, b) => b.n - a.n);
  const d = s => (s || '').slice(0, 10);
  for (const r of rows) {
    console.log(
      `${String(r.n).padStart(6)}행  회원 ${String(r.member).padStart(5)} / 비회원 ${String(r.anon).padStart(5)}` +
      `  ${d(r.first)}~${d(r.last)}  [${r.kind.padEnd(7)}] ${r.v}` +
      (r.slug && r.kind !== 'slug' ? `  → ${r.slug}` : '')
    );
  }

  console.log('\n=== ② 형태별 합계 ===');
  const byKind = {};
  for (const r of rows) { byKind[r.kind] = (byKind[r.kind] || 0) + r.n; }
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(8)} ${String(n).padStart(6)}행 (${(n / got * 100).toFixed(1)}%)`);
  }

  console.log('\n=== ③ 쪼개진 버킷 (같은 슬러그를 가리키는 저장값이 둘 이상) ===');
  const bySlug = new Map();
  for (const r of rows) {
    if (!r.slug) continue;
    (bySlug.get(r.slug) || bySlug.set(r.slug, []).get(r.slug)).push(r);
  }
  let split = 0;
  for (const [slug, rs] of [...bySlug].sort((a, b) => b[1].reduce((s, r) => s + r.n, 0) - a[1].reduce((s, r) => s + r.n, 0))) {
    if (rs.length < 2) continue;
    split++;
    const tot = rs.reduce((s, r) => s + r.n, 0);
    console.log(`  ${slug} — 합 ${tot}행이 ${rs.length}줄로 갈림: ` +
      rs.map(r => `"${r.v}" ${r.n}`).join(' / '));
  }
  console.log(split ? `  → 쪼개진 슬러그 ${split}종` : '  → 없음');

  const unknown = rows.filter(r => r.kind === 'unknown');
  if (unknown.length) {
    console.log('\n=== ④ 매핑 불가 값 (소급 시 수동 판정 필요) ===');
    for (const r of unknown) console.log(`  ${String(r.n).padStart(5)}행  "${r.v}"  ${d(r.first)}~${d(r.last)}`);
  }
  process.exit(0);
})();
