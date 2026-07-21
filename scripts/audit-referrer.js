// #28 재측정 — page_sessions.referrer가 실제로 어떤 값들인가 (읽기 전용, DB 무변경)
//
//   node scripts/audit-referrer.js
//
// 대장 기재("내부는 한글 라벨, 외부는 pathname")가 낡았을 수 있으므로 착수 첫 동작으로 다시 잰다.
// 🚨 categorizeRef는 사본을 만들지 않고 requests-admin.html에서 **원문 그대로 잘라 eval**한다.
const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let window = { location: { hostname: 'cottageboard.co.kr' } };
eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

// ── 화면 코드에서 categorizeRef를 그대로 떼어온다 (의존 3개 포함) ──────
const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'admin', 'requests-admin.html'), 'utf8').replace(/\r\n/g, '\n');
const s = html.indexOf('function _punycodeLabel(');
const marker = '} catch (_) { return null; }\n        }';
const e = html.indexOf(marker, html.indexOf('function categorizeRef(ref)'));
if (s < 0 || e < 0) { console.error('🔴 requests-admin.html에서 categorizeRef를 못 찾음 — 검사기가 낡았다'); process.exit(1); }
const src = html.slice(s, e) + marker;
const categorizeRef = new Function('window', src + '\nreturn categorizeRef;')(window);

(async () => {
  const { data, error } = await db.from('page_sessions').select('referrer, duration_sec').limit(50000);
  const { count } = await db.from('page_sessions').select('*', { count: 'exact', head: true });
  if (error) { console.error('🔴 ERROR', error); process.exit(1); }
  console.log(`전수 ${data.length}행 (count=${count}) ${data.length === count ? '✅' : '🔴 절단 의심'}\n`);

  // ── ① referrer 원본 값 분포 ────────────────────────────────
  const raw = {};
  for (const r of data) { const k = r.referrer === null ? '(null)' : r.referrer === '' ? '(빈문자열)' : r.referrer; raw[k] = (raw[k] || 0) + 1; }
  console.log('=== ① referrer 원본 값 분포 (상위 30) ===');
  Object.entries(raw).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k}`));
  console.log(`  (고유 값 ${Object.keys(raw).length}종)\n`);

  // ── ② categorizeRef를 통과시킨 뒤 — 유입 탭이 실제로 보는 것 ──
  const catSec = {}, catRows = {};
  for (const r of data) {
    const cat = categorizeRef(r.referrer) || '직접 방문';
    catSec[cat] = (catSec[cat] || 0) + (r.duration_sec || 0);
    catRows[cat] = (catRows[cat] || 0) + 1;
  }
  console.log('=== ② 유입 탭 체류(refSecMap)가 지금 보는 것 ===');
  Object.entries(catSec).sort((a, b) => b[1] - a[1])
    .forEach(([k, sec]) => console.log(`  ${k.padEnd(14)} ${String(catRows[k]).padStart(6)}행  ${(sec / 3600).toFixed(1)}h`));

  // ── ③ 「직접 방문」으로 접힌 것 중 진짜 직접 방문이 아닌 것 ──
  const collapsed = {};
  for (const r of data) {
    if (!r.referrer) continue;              // 진짜 직접 방문
    if (categorizeRef(r.referrer)) continue; // 분류에 성공
    collapsed[r.referrer] = (collapsed[r.referrer] || 0) + 1;
  }
  const lost = Object.values(collapsed).reduce((a, b) => a + b, 0);
  console.log(`\n=== ③ referrer가 있는데 「직접 방문」으로 접힌 행: ${lost}행 (${Object.keys(collapsed).length}종) ===`);
  Object.entries(collapsed).sort((a, b) => b[1] - a[1]).slice(0, 30)
    .forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k}`));

  process.exit(0);
})();
