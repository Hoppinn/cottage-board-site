// 「사이트에 올리기」 — 게임 데이터만 커밋해 main에 push하고, push가 성공한 뒤에만 종 알림을 보낸다.
// 순서: main 확인 → 바뀐 게임 데이터 확인 → npm run check → fetch(GitHub이 앞서면 중단) → add → commit → push → 알림
// 재시도: push가 실패해 커밋만 남았으면(ahead) 다시 누를 때 그 커밋을 push한다. 올릴 것이 없어도 대기열 알림은 보낸다.
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { createQueue } = require('./announce-queue');

const ROOT = path.resolve(__dirname, '../..');
const PUBLISH_PATHS = ['game-system/game-data/'];

function pathOf(porcelainLine) {
  const p = porcelainLine.slice(3);
  return p.includes(' -> ') ? p.split(' -> ')[1] : p;
}

function filterPublishable(porcelainLines) {
  const publish = [];
  const other = [];
  for (const line of porcelainLines.filter(Boolean)) {
    const p = pathOf(line);
    (PUBLISH_PATHS.some(prefix => p.startsWith(prefix)) ? publish : other).push(p);
  }
  return { publish, other };
}

function describeChanges(files) {
  const has = re => files.some(f => re.test(f));
  const photos = files.filter(f => /\/library\/images\/thumb\//.test(f)).length;
  const out = [];
  if (has(/\/source\/2-cottage-manual\//)) out.push('게임 목록(엑셀)');
  if (has(/\/source\/3-abbr\//)) out.push('약칭');
  if (photos) out.push(`게임 사진 ${photos}장`);
  if (has(/\/library\/human-input\/missing-fill\//)) out.push('수동 정보');
  if (has(/\/library\/human-input\/overwrite\//)) out.push('BGG 연결');
  if (has(/\/library\/(1-master|3-output)\//) || has(/\/staging\//)) out.push('게임 데이터 산출물');
  return out;
}

// ── 실제 git / check / 알림 구현 ────────────────────────

function gitCmd(args) {
  return new Promise((resolve, reject) => {
    execFile('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim().split('\n').slice(-2).join(' / ')));
      else resolve(stdout);
    });
  });
}

const realGit = {
  branch: async () => (await gitCmd(['rev-parse', '--abbrev-ref', 'HEAD'])).trim(),
  status: async () => (await gitCmd(['status', '--porcelain', '-uall'])).split('\n').filter(Boolean),
  fetch: async () => { await gitCmd(['fetch', 'origin', 'main']); },
  behindCount: async () => Number((await gitCmd(['rev-list', '--count', 'HEAD..origin/main'])).trim()) || 0,
  aheadCount: async () => Number((await gitCmd(['rev-list', '--count', 'origin/main..HEAD'])).trim()) || 0,
  add: async files => { await gitCmd(['add', '--', ...files]); },
  // 경로를 지정해 커밋한다 — 다른 파일이 미리 스테이징돼 있어도 게임 데이터만 들어간다.
  commit: async (message, files) => {
    await gitCmd(['commit', '-m', message, '--', ...files]);
    return (await gitCmd(['rev-parse', '--short', 'HEAD'])).trim();
  },
  push: async () => { await gitCmd(['push', 'origin', 'main']); },
};

function realRunCheck() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'check'], { cwd: ROOT });
    let tail = '';
    const keep = d => { tail = (tail + d.toString()).slice(-1500); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(tail.trim().split('\n').slice(-3).join(' / ')))));
  });
}

function readSupabaseConfig() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/supabase-config.js'), 'utf8');
  return { url: src.match(/url:\s*["']([^"']+)/)[1], anonKey: src.match(/anonKey:\s*["']([^"']+)/)[1] };
}

async function realInsertAnnouncement(item) {
  const { url, anonKey } = readSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/game_announcements`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ kind: item.kind, game_names: item.names, location_label: item.location || null }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

// ── 조립 ────────────────────────────────────────────────

function createPublisher({
  git = realGit, runCheck = realRunCheck, insertAnnouncement = realInsertAnnouncement, queue = createQueue(),
} = {}) {
  async function getPublishPreview() {
    const branch = await git.branch();
    const { publish, other } = filterPublishable(await git.status());
    const ahead = await git.aheadCount();
    return { branch, files: publish, other, ahead, summary: describeChanges(publish), pendingAnnouncements: queue.list() };
  }

  async function publish() {
    const fail = (step, message) => ({ ok: false, step, message });
    if ((await git.branch()) !== 'main') return fail('branch', '지금 main 브랜치가 아니라서 올릴 수 없어요. main으로 바꾼 뒤 다시 해 주세요.');

    const { publish: files } = filterPublishable(await git.status());
    const summary = describeChanges(files);
    let commit;
    if (files.length) {
      try { await runCheck(); } catch (e) { return fail('check', '데이터 검사에서 문제가 나왔어요: ' + e.message); }
    }
    if (files.length || (await git.aheadCount()) > 0) {
      try { await git.fetch(); } catch (e) { return fail('fetch', 'GitHub에 연결하지 못했어요: ' + e.message); }
      if ((await git.behindCount()) > 0) return fail('fetch', 'GitHub에 더 새 버전이 있어요. 먼저 받아와야 해요(git pull).');
      if (files.length) {
        try {
          await git.add(files);
          commit = await git.commit(`data: ${summary.join(', ') || '게임 데이터 갱신'}`, files);
        } catch (e) { return fail('commit', '커밋하지 못했어요: ' + e.message); }
      }
      try { await git.push(); } catch (e) {
        return { ...fail('push', 'GitHub에 올리지 못했어요(커밋은 이 PC에 남아 있어요 — 다시 누르면 이어서 올려요): ' + e.message), commit };
      }
    } else if (!queue.list().length) {
      return fail('status', '올릴 변경이 없어요.');
    }

    // push가 성공했으니 사이트에도 곧 반영된다 — 이제 알림을 보낸다. 실패한 알림은 대기열에 남겨 다음에 다시 보낸다.
    const pending = queue.list();
    const sent = [];
    const errors = [];
    for (const item of pending) {
      try { await insertAnnouncement(item); sent.push(item); } catch (e) { errors.push(e.message); }
    }
    queue.remove(sent);
    const message = errors.length
      ? `사이트에 올렸어요. 알림 ${sent.length}건 보냄, ${errors.length}건은 보내지 못해 다음에 다시 보내요 (${errors[0]})`
      : `사이트에 올렸어요. 알림 ${sent.length}건을 보냈어요.`;
    return { ok: true, step: 'done', commit, message, summary };
  }

  return { getPublishPreview, publish };
}

module.exports = { PUBLISH_PATHS, filterPublishable, describeChanges, createPublisher };
