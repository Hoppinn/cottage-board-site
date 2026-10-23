// 게임 공지(game_announcements) 종 알림 연결 검증. DB 쓰기 없음.
// 사용: node scripts/verify-game-announcements.js [--live] [--negctl]
//   --live   : anon SELECT(count exact)로 테이블 존재·컬럼 확인
//   --negctl : 정적 검사는 없는 분기명을, live 검사는 없는 테이블명을 찾게 해 FAIL이 나는지 본다
const fs = require('fs');
const path = require('path');

const NEG = process.argv.includes('--negctl');
const LIVE = process.argv.includes('--live');
const root = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'assets/js/supabase-client.js'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'assets/js/kakao-auth.js'), 'utf8');

let failures = 0;
function check(label, condition, detail = '') {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures++;
}

console.log('=== 정적 ===');
check("getMyNotifications가 game_announcements를 조회", client.includes("from('game_announcements')"));
check('조회 오류를 로그', client.includes('[getMyNotifications:game_announcements]'));
check("알림 객체 type 'game_announce'", client.includes("type: 'game_announce'"));
const branch = NEG ? "n.type === 'game_announce_x'" : "n.type === 'game_announce'";
check(`kakao-auth에 ${branch} 분기`, auth.includes(branch));

async function live() {
  console.log('=== live (anon SELECT) ===');
  const cfg = fs.readFileSync(path.join(root, 'assets/js/supabase-config.js'), 'utf8');
  const url = cfg.match(/url:\s*["']([^"']+)/)[1];
  const key = cfg.match(/anonKey:\s*["']([^"']+)/)[1];
  const table = NEG ? 'game_announcements_none' : 'game_announcements';
  const res = await fetch(`${url}/rest/v1/${table}?select=id,kind,game_names,location_label,created_at`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
  });
  const range = res.headers.get('content-range');
  check(`${table} HTTP 200`, res.status === 200 || res.status === 206, `HTTP ${res.status}`);
  check('count 존재(content-range */N)', /\/\d+$/.test(range || ''), `content-range ${range}`);
}

(LIVE ? live() : Promise.resolve()).then(() => {
  console.log(failures ? `\n❌ ${failures}건 실패` : '\n✅ 전부 통과');
  process.exit(failures ? 1 : 0);
});
