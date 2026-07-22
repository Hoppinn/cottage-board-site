// 회원 탭 「📄 페이지 N개」 펼침의 기간 선택 검증 (읽기 전용)
//
//   node scripts/verify-member-period.js            ← 본검사(실DB 대조 포함)
//   node scripts/verify-member-period.js --negctl   ← 음성 대조군(일부러 틀린 기대값)
//   node scripts/verify-member-period.js --nodb     ← 합성 데이터 층만(DB 없이)
//
// 🚨 --negctl을 **먼저** 돌릴 것. "전부 통과"는 검사기가 고장 난 것과 구별되지 않는다.
//    기대값을 한 칸 비틀어 그 줄에서만 🔴이 뜨는 걸 본 뒤에야 통과를 믿는다.
//
// 이 스크립트가 화면 코드를 **원문 그대로 잘라 eval**하는 이유: 사본을 만들면 화면과 조용히
// 갈린다(#15의 교훈 — 같은 개념에 계산이 두 벌이면 그 일부가 다른 답을 낸다).
//
// 층이 셋이다.
//   ① 합성 rows — KST 자정·7일 경계처럼 **실DB에 마침 없을 수도 있는 경우**를 직접 만든다.
//   ② 실DB rows — loadAnalytics와 같은 파이프라인(관리자 제외 → normalizePageKey →
//      collapseTwinInserts)을 태운 뒤, pageMapFor의 답을 **이 파일에서 따로 쓴 집계**와 맞댄다.
//      같은 코드를 두 번 부르면 검증이 아니라 반복이라, 대조군 집계는 일부러 손으로 짰다.
//   ③ 불변식 — 기간이 좁아질수록 단조 감소, today+yesterday ⊆ 7d ⊆ all.
const fs = require('fs');
const path = require('path');

const NEGCTL = process.argv.includes('--negctl');
const NODB = process.argv.includes('--nodb');
const ADMIN_UID = '4916417947';

let fail = 0;
const ck = (ok, msg) => { console.log(`  ${ok ? '✅' : '🔴'} ${msg}`); if (!ok) fail++; };

// ── 단일 소스(member-analytics.js) + 화면 잔여 코드 가져오기 ──────────
// P4(2026-07-22)부터 기간 헬퍼·pageMapFor·정규화는 member-analytics.js가 단일 소스다
// (관리자 페이지와 회원 보드가 공유). 사본을 만들지 않고 그 모듈을 **실제로 eval**해
// window.MemberAnalytics를 그대로 쓴다(#15: 계산이 두 벌이면 갈린다).
// collapseTwinInserts만 아직 requests-admin.html 안에 있어 원문을 잘라 eval한다.
const { loadMemberAnalytics } = require('./_member-analytics');
const MA = loadMemberAnalytics();
const normalizePageKey = MA.normalizePageKey;

const HTML = fs.readFileSync(path.join(__dirname, '..', 'pages', 'admin', 'requests-admin.html'), 'utf8').replace(/\r\n/g, '\n');
function cut(startsWith, endsWith, label) {
  const i = HTML.indexOf(startsWith);
  if (i < 0) { console.log(`🔴 원문에서 「${label}」을 못 찾았다 — 코드가 바뀌었으면 이 스크립트를 먼저 고칠 것`); process.exit(1); }
  const j = HTML.indexOf(endsWith, i + startsWith.length);
  if (j < 0) { console.log(`🔴 「${label}」의 끝을 못 찾았다`); process.exit(1); }
  return HTML.slice(i, j + endsWith.length);
}
const SRC_TWIN = cut('const TWIN_WINDOW_MS = 3000;', '\n    }', 'collapseTwinInserts');
const _pick = names => `\n({ ${names.join(', ')} })`;
// collapseTwinInserts는 PAGE_KEY_ALIASES를 클로저로 읽는다 → 모듈 것을 스코프에 실어 eval한다.
const { collapseTwinInserts } = (() => {
  const PAGE_KEY_ALIASES = MA.PAGE_KEY_ALIASES;
  return eval(SRC_TWIN + _pick(['collapseTwinInserts']));
})();

// pageMapFor·_inVpPeriod는 rows·todayKst를 받는 지역 래퍼로 감싼다 — requests-admin.html의
// 실제 래퍼와 **같은 모양**이다(그 파일도 MemberAnalytics.buildPageMap/inVpPeriod를 이렇게 부른다).
// 핵심 로직은 전부 모듈 것이라 사본이 아니다.
function mountPeriodApi(rows, todayKst) {
  return {
    VP_PERIODS: MA.VP_PERIODS,
    _toKstDate: MA.toKstDate,
    _kstShift: MA.kstShift,
    _vpLabel: MA.vpLabel,
    _inVpPeriod: (r, period) => MA.inVpPeriod(r, period, todayKst),
    pageMapFor: (idType, id, period) => MA.buildPageMap(rows, idType, id, period, todayKst),
  };
}

// ── 대조군 집계 (일부러 화면 코드를 안 쓴다) ───────────────────────
const kstDay = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
function expectMap(rows, idType, id, todayKst, period) {
  const days = new Set();
  if (period === 'today') days.add(todayKst);
  if (period === 'yesterday') days.add(new Date(new Date(todayKst + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10));
  if (period === '7d') for (let i = 0; i < 7; i++) days.add(new Date(new Date(todayKst + 'T00:00:00Z') - i * 86400000).toISOString().slice(0, 10));
  const out = new Map();
  for (const r of rows) {
    const mine = idType === 'member' ? String(r.user_id || '') === String(id) : (!r.user_id && r.session_key === id);
    if (!mine) continue;
    if (period !== 'all') { if (!r.entered_at || !days.has(kstDay(r.entered_at))) continue; }
    if (!out.has(r.page)) out.set(r.page, { visits: 0, totalSec: 0 });
    out.get(r.page).visits++; out.get(r.page).totalSec += r.duration_sec || 0;
  }
  return out;
}
const sumSec = m => [...m.values()].reduce((s, d) => s + d.totalSec, 0);
const sumVis = m => [...m.values()].reduce((s, d) => s + d.visits, 0);
const sameMap = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) && b.get(k).visits === v.visits && b.get(k).totalSec === v.totalSec);

(async () => {
  // ══ ① 합성 rows — 경계를 직접 만든다 ═══════════════════════════
  console.log('=== ① 경계 (합성 데이터) ===');
  {
    // 🚨 날짜를 박아두지 않는다 — _kstShift는 Date.now()를 보므로 고정 날짜를 쓰면
    //    **내일 이 검사가 썩는다**(첫 작성판이 그래서 7일 경계에서 틀렸다).
    const TODAY = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const dayAgo = n => new Date(new Date(TODAY + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
    // KST 기준 날짜가 되도록 UTC로 적는다(KST = UTC+9).
    const mk = (kstDate, kstHHMM, sec, page, uid = 'U1', sk = null) => {
      const [h, m] = kstHHMM.split(':').map(Number);
      const utc = new Date(new Date(kstDate + 'T00:00:00Z').getTime() + (h - 9) * 3600000 + m * 60000);
      return { user_id: uid, session_key: sk, page, duration_sec: sec, entered_at: utc.toISOString() };
    };
    const rows = [
      mk(TODAY, '00:00', 10, 'index'),        // 오늘 자정 정각 — 오늘에 들어가야 한다
      mk(TODAY, '23:59', 20, 'index'),        // 오늘 끝 — 내일로 새면 안 된다
      mk(dayAgo(1), '23:59', 30, 'index'),    // 어제 끝
      mk(dayAgo(1), '00:00', 40, 'owned-games'),
      mk(dayAgo(6), '12:00', 50, 'index'),    // 오늘 포함 7일의 첫날 (경계 안)
      mk(dayAgo(7), '12:00', 60, 'index'),    // 7일 밖 (경계 밖)
      { user_id: 'U1', session_key: null, page: 'index', duration_sec: 70, entered_at: null }, // 날짜 없음
      mk(TODAY, '10:00', 80, 'index', null, 'S1'), // 비회원
    ];
    const api = mountPeriodApi(rows, TODAY);
    const at = (i, p) => api._inVpPeriod(rows[i], p);
    ck(at(0, 'today') && at(1, 'today'), '오늘 00:00과 23:59가 둘 다 「오늘」');
    ck(!at(2, 'today') && at(2, 'yesterday'), '어제 23:59는 「오늘」이 아니라 「어제」 (자정 경계)');
    ck(at(4, '7d'), '7일 전(오늘 포함 7일의 첫날)이 「7일」 안');
    ck(!at(5, '7d'), '8일 전은 「7일」 밖');
    ck(at(6, 'all') && !at(6, 'today') && !at(6, '7d'), 'entered_at 없는 행은 「전 기간」에만 (기간을 물을 수 없다)');
    // 회원/비회원이 서로 섞이지 않는가 — 같은 page라 섞이면 조용히 부풀어 보인다
    const mAll = api.pageMapFor('member', 'U1', 'all');
    const aAll = api.pageMapFor('anon', 'S1', 'all');
    ck(sumVis(mAll) === 7 && sumVis(aAll) === 1, `회원 7행 / 비회원 1행으로 갈림 (회원 ${sumVis(mAll)}, 비회원 ${sumVis(aAll)})`);
    ck(sumSec(api.pageMapFor('member', 'U1', 'today')) === 30, '오늘 체류 = 10+20 = 30초');
    ck(sumSec(api.pageMapFor('member', 'U1', 'yesterday')) === 70, '어제 체류 = 30+40 = 70초');
    ck(api.pageMapFor('member', 'U1', 'yesterday').size === 2, '어제는 페이지 2종(index·owned-games)');
    ck(sumSec(api.pageMapFor('member', 'U1', '7d')) === 150, '7일 체류 = 10+20+30+40+50 = 150초');
    ck(api.pageMapFor('member', 'U1', 'all').size === 2, '전 기간 페이지 2종');
    // 기본값이 기존 동작과 같아야 한다 — 'all'은 아무것도 거르지 않는다
    ck(sumVis(api.pageMapFor('member', 'U1', 'all')) === 7 && sumVis(api.pageMapFor('member', 'U1', undefined)) === 7,
      "'all'과 기본값(undefined)이 전량 — 기존 동작 회귀 가드");
    ck(api.VP_PERIODS.map(p => p.key).join(',') === 'all,today,yesterday,7d', '기간 프리셋 4종의 키와 순서');
    // 특정 날짜(YYYY-MM-DD) — 그날 하루만 걸러야 한다
    ck(api._inVpPeriod(rows[0], TODAY) && !api._inVpPeriod(rows[2], TODAY), '특정 날짜는 그날 하루만 (오늘 행 O, 어제 행 X)');
    ck(sumSec(api.pageMapFor('member', 'U1', dayAgo(1))) === 70, '특정 날짜(어제)의 값이 yesterday 프리셋과 일치');
    ck(api.pageMapFor('member', 'U1', TODAY).size === 1 && sumSec(api.pageMapFor('member', 'U1', TODAY)) === 30, '특정 날짜(오늘): index 1종 30초');
    ck(api._vpLabel(dayAgo(1)).endsWith('일') && api._vpLabel('7d') === '7일' && api._vpLabel('all') === '전 기간', `라벨 파생 — 날짜는 「M월 D일」, 프리셋은 그 라벨 (예: ${api._vpLabel(dayAgo(1))})`);
  }

  if (NODB) { console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 합성 층 전부 통과 (--nodb라 DB 층은 건너뜀)'); process.exit(0); }

  // ══ ② 실DB rows — loadAnalytics와 같은 파이프라인 ═══════════════
  console.log('\n=== ② 실DB 대조 ===');
  const { createClient } = require('../node_modules/@supabase/supabase-js');
  let window = {};
  eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js'), 'utf8'));
  const db = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

  const { data: raw, error, count } = await db.from('page_sessions')
    .select('user_id,session_key,page,duration_sec,entered_at,referrer', { count: 'exact' })
    .order('entered_at', { ascending: false }).limit(50000);
  if (error) { console.log('🔴 page_sessions 조회 실패:', error.message); process.exit(1); }
  ck(count !== null, `page_sessions 존재 (count=${count})`);
  ck((raw || []).length !== 1000, `절단 아님 — 받은 ${(raw || []).length}행 (정확히 1000이면 max-rows 절단 의심)`);
  ck((raw || []).length === count, `전량 수신 ${(raw || []).length} = count ${count}`);

  const rows = collapseTwinInserts(
    (raw || []).filter(r => String(r.user_id || '') !== ADMIN_UID)
      .map(r => ({ ...r, page: normalizePageKey(r.page) })));
  const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const api = mountPeriodApi(rows, todayKst);
  console.log(`  · 파이프라인 후 ${rows.length}행 (관리자 제외 + 슬러그 정규화 + 쌍둥이 접기), 오늘(KST) ${todayKst}`);

  // 대상 고르기 — 행이 많은 회원 3명과 비회원 2명
  const cntBy = (pred, key) => {
    const m = new Map();
    for (const r of rows) if (pred(r)) m.set(r[key], (m.get(r[key]) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const members = cntBy(r => r.user_id, 'user_id').slice(0, 3).map(([id]) => id);
  const anons = cntBy(r => !r.user_id && r.session_key, 'session_key').slice(0, 2).map(([id]) => id);
  ck(members.length > 0, `대조할 회원 ${members.length}명`);
  ck(anons.length > 0, `대조할 비회원 ${anons.length}명`);

  const targets = [...members.map(id => ['member', id]), ...anons.map(id => ['anon', id])];
  for (const [type, id] of targets) {
    const short = String(id).slice(0, 8);
    for (const p of ['all', 'today', 'yesterday', '7d']) {
      const got = api.pageMapFor(type, id, p);
      const exp = expectMap(rows, type, id, todayKst, p);
      if (NEGCTL && p === 'all' && type === targets[0][0] && id === targets[0][1]) {
        // 음성 대조군: 기대값을 한 칸 비튼다. 여기서 🔴가 안 뜨면 비교문이 죽은 것이다.
        const k = [...exp.keys()][0];
        if (k) { exp.get(k).visits += 1; console.log(`  (음성 대조군) ${short}/${p}의 「${k}」 기대 진입을 +1로 비틀었다 — 바로 아래에 🔴가 떠야 정상`); }
      }
      ck(sameMap(got, exp), `${type} ${short} / ${p}: 페이지 ${got.size}종·진입 ${sumVis(got)}·체류 ${sumSec(got)}초가 독립 집계와 일치`);
    }
  }

  // ══ ③ 불변식 ═══════════════════════════════════════════════════
  console.log('\n=== ③ 불변식 ===');
  for (const [type, id] of targets) {
    const short = String(id).slice(0, 8);
    const all = api.pageMapFor(type, id, 'all');
    const d7 = api.pageMapFor(type, id, '7d');
    const td = api.pageMapFor(type, id, 'today');
    const yd = api.pageMapFor(type, id, 'yesterday');
    ck(td.size <= d7.size && d7.size <= all.size, `${short}: 페이지 수 단조 감소 (오늘 ${td.size} ≤ 7일 ${d7.size} ≤ 전체 ${all.size})`);
    ck(sumSec(td) <= sumSec(d7) && sumSec(d7) <= sumSec(all), `${short}: 체류 단조 감소 (${sumSec(td)} ≤ ${sumSec(d7)} ≤ ${sumSec(all)}초)`);
    ck(sumVis(td) + sumVis(yd) <= sumVis(d7), `${short}: 오늘+어제 ⊆ 7일 (${sumVis(td)}+${sumVis(yd)} ≤ ${sumVis(d7)})`);
    ck([...td.keys()].every(k => all.has(k)), `${short}: 오늘의 페이지가 전부 전 기간에도 있다`);
  }

  console.log(fail ? `\n🔴 ${fail}건 실패` : '\n✅ 전부 통과');
  process.exit(0);
})();
