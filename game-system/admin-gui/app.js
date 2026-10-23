// 게임 관리 GUI 화면. 서버 API(/api/*)와 사이트의 CottageDB(룰·정리 방법)를 쓴다.
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { games: [], locations: [], issues: [] };

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({ error: `서버 응답을 읽지 못했어요 (HTTP ${res.status})` }));
    if (!res.ok || json.error) throw Object.assign(new Error(json.error || `HTTP ${res.status}`), { data: json });
    return json;
  }

  function show(el, kind, text) { el.innerHTML = text ? `<div class="msg ${kind}">${esc(text)}</div>` : ''; }

  function stepsHtml(steps) {
    const label = { match: 'BGG 찾기', 'fetch-bgg': 'BGG 정보 받기', 'build-master': '게임 목록 정리', 'label-translate': '분류 번역', translate: '설명 번역', 'build-output': '사이트용 데이터 만들기' };
    const icon = { ok: '✅', failed: '❌', skipped: '⏸️' };
    return `<ul class="steps">${steps.map(s => `<li data-icon="${icon[s.status] || '•'}">${esc(label[s.name] || s.name)}${s.note ? ` — ${esc(s.note)}` : ''}</li>`).join('')}</ul>`;
  }

  async function build(el, opts) {
    show(el, 'info', '사이트용 데이터를 만드는 중… (보통 10초 안팎)');
    const r = await api('POST', '/api/build', opts);
    el.innerHTML = `<div class="msg ${r.ok ? 'ok' : 'err'}">${r.ok ? '준비 완료 — 「사이트에 올리기」 탭에서 올리면 사이트에 반영돼요.' : '중간에 멈췄어요. 아래 ❌ 단계를 확인해 주세요.'}${stepsHtml(r.steps)}</div>`;
    return r;
  }

  const pendingLabels = () => new Set(state.locations.filter(l => (l.code || '').startsWith('Z')).map(l => l.label));
  const isArrival = (fromLabel, toValue) => {
    const pend = pendingLabels();
    const to = state.locations.find(l => l.value === toValue);
    return pend.has(fromLabel) && to && !pend.has(to.label);
  };

  function locationOptions(selected, withAll) {
    return (withAll ? '<option value="">(전체)</option>' : '<option value="">위치를 고르세요</option>')
      + state.locations.map(l => `<option value="${esc(l.value)}"${l.value === selected ? ' selected' : ''}>${esc(l.code ? l.code + ' · ' : '')}${esc(l.label)}</option>`).join('');
  }

  async function reload() {
    const data = await api('GET', '/api/games');
    Object.assign(state, data);
    state.games.sort((a, b) => a.ownedName.localeCompare(b.ownedName, 'ko'));
    $('issueCount').hidden = !state.issues.length;
    $('issueCount').textContent = state.issues.length;
    const pending = (await api('GET', '/api/announcements')).pending;
    $('pendingCount').hidden = !pending.length;
    $('pendingCount').textContent = pending.length;
    $('editNames').innerHTML = state.games.map(g => `<option value="${esc(g.ownedName)}">`).join('');
  }

  // ── 탭 ─────────────────────────────────────────────
  $('tabs').addEventListener('click', e => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('main > section').forEach(s => { s.hidden = s.id !== 'tab-' + btn.dataset.tab; });
    if (btn.dataset.tab === 'issues') renderIssues();
    if (btn.dataset.tab === 'publish') loadPublishPreview();
  });

  // ── 위치 일괄 변경 ─────────────────────────────────
  const batchChecked = new Set();
  function renderBatch() {
    const filter = $('batchFilter').value;
    const q = $('batchSearch').value.trim();
    const rows = state.games.filter(g => (!filter || g.locationValue === filter) && (!q || g.ownedName.includes(q)));
    $('batchList').innerHTML = rows.map(g => `<label class="item"><input type="checkbox" data-name="${esc(g.ownedName)}"${batchChecked.has(g.ownedName) ? ' checked' : ''}> ${esc(g.ownedName)}<span class="loc">${esc(g.locationLabel || g.location || '(위치 없음)')}</span></label>`).join('')
      || '<div class="item help">해당하는 게임이 없어요.</div>';
    renderBatchPreview();
  }
  function renderBatchPreview() {
    const target = $('batchTarget').value;
    const chosen = state.games.filter(g => batchChecked.has(g.ownedName));
    const arrivals = target ? chosen.filter(g => isArrival(g.locationLabel, target)).length : 0;
    $('batchSelectedCount').textContent = `${chosen.length}개 선택됨`;
    $('batchPreview').textContent = !chosen.length ? '' : !target ? '옮길 위치를 고르세요.'
      : `${chosen.length}개를 옮겨요. 그중 ${arrivals}개가 「도착」이에요${arrivals && $('batchAnnounce').checked ? ' → 알림 1건' : ''}.`;
    $('batchSave').disabled = !chosen.length || !target;
  }
  $('batchList').addEventListener('change', e => {
    const cb = e.target.closest('input[data-name]');
    if (!cb) return;
    cb.checked ? batchChecked.add(cb.dataset.name) : batchChecked.delete(cb.dataset.name);
    renderBatchPreview();
  });
  $('batchAll').addEventListener('click', () => {
    $('batchList').querySelectorAll('input[data-name]').forEach(cb => { cb.checked = true; batchChecked.add(cb.dataset.name); });
    renderBatchPreview();
  });
  ['batchFilter', 'batchSearch'].forEach(id => $(id).addEventListener('input', renderBatch));
  ['batchTarget', 'batchAnnounce'].forEach(id => $(id).addEventListener('change', renderBatchPreview));
  $('batchSave').addEventListener('click', async () => {
    const out = $('batchResult');
    $('batchSave').disabled = true;
    try {
      const r = await api('POST', '/api/locations', { names: [...batchChecked], location: $('batchTarget').value, announce: $('batchAnnounce').checked });
      show(out, 'ok', `${r.changed.length}개 위치를 저장했어요.${r.arrived.length ? ` 도착 ${r.arrived.length}개 — 알림은 사이트에 올릴 때 나가요.` : ''}`);
      batchChecked.clear();
      await reload();
      renderBatch();
      out.insertAdjacentHTML('beforeend', '<div></div>');
      await build(out.lastElementChild, { fetchBgg: false, translate: false });
    } catch (e) {
      const done = e.data?.changed?.length ? `\n(그 전까지 ${e.data.changed.length}개는 저장됐어요)` : '';
      show(out, 'err', e.message + done);
      await reload(); renderBatch();
    } finally { renderBatchPreview(); }
  });

  // ── 새 게임 ────────────────────────────────────────
  let addingName = null;
  let addingId = null;
  $('addSubmit').addEventListener('click', async () => {
    const out = $('addResult');
    const name = $('addName').value.trim();
    if (!name) return show(out, 'err', '게임 이름을 입력해 주세요.');
    if (!$('addLocation').value) return show(out, 'err', '위치를 골라 주세요.');
    $('addSubmit').disabled = true;
    show(out, 'info', 'BGG 후보를 찾는 중…');
    try {
      const r = await api('POST', '/api/games', { name, location: $('addLocation').value, announce: $('addAnnounce').checked });
      addingName = name; addingId = r.gameId;
      $('addCandidates').innerHTML = r.candidates.length
        ? r.candidates.map(c => `<button class="cand" type="button" data-bgg="${esc(c.bggId)}"><b>${esc(c.bggName || '(이름 없음)')}</b>${c.year ? ` (${esc(c.year)})` : ''} · BGG ${esc(c.bggId)}${c.score != null ? ` · 일치도 ${esc(c.score)}` : ''}</button>`).join('')
        : '<p class="help">자동으로 찾은 후보가 없어요. BGG 주소를 붙여넣거나 「BGG 없음」을 골라 주세요.</p>';
      $('addStep2').hidden = false;
      show(out, 'ok', `「${name}」을 목록에 넣었어요. BGG 연결을 고르면 정보 받기·번역·빌드가 이어서 돌아가요.`);
      await reload();
    } catch (e) { show(out, 'err', e.message); $('addSubmit').disabled = false; }
  });
  async function finishAdd(bggInput) {
    const out = $('addResult');
    try {
      await api('POST', '/api/games/bgg', { name: addingName, bggInput });
      out.insertAdjacentHTML('beforeend', '<div></div>');
      await build(out.lastElementChild, { gameIds: [addingId], fetchBgg: true, translate: true });
      $('addStep2').hidden = true;
      $('addSubmit').disabled = false;
      $('addName').value = '';
      await reload();
    } catch (e) { show(out, 'err', e.message); }
  }
  $('addCandidates').addEventListener('click', e => { const b = e.target.closest('[data-bgg]'); if (b) finishAdd(b.dataset.bgg); });
  $('addBggPaste').addEventListener('click', () => { const v = $('addBggInput').value.trim(); if (v) finishAdd(v); });
  $('addBggNone').addEventListener('click', () => finishAdd(''));

  // ── 게임 수정 ──────────────────────────────────────
  let editing = null;
  let override = null;
  let photoUrls = [];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('스크립트를 불러오지 못했어요: ' + src));
      document.head.appendChild(s);
    });
  }
  let dbReady = null;
  function ensureDb() {
    dbReady = dbReady || (async () => {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      await loadScript('/site/assets/js/supabase-config.js');
      await loadScript('/site/assets/js/supabase-client.js');
      if (!window.CottageDB) throw new Error('DB 연결을 준비하지 못했어요.');
      return window.CottageDB;
    })();
    return dbReady;
  }

  function renderPhotos() {
    $('organizerPhotos').innerHTML = photoUrls.map((u, i) => `<figure><img src="${esc(u)}" alt=""><button type="button" data-i="${i}" title="빼기">✕</button></figure>`).join('');
  }
  $('organizerPhotos').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (b) { photoUrls.splice(Number(b.dataset.i), 1); renderPhotos(); }
  });

  $('editSearch').addEventListener('change', async () => {
    const game = state.games.find(g => g.ownedName === $('editSearch').value.trim());
    const out = $('editResult');
    if (!game) { $('editBody').hidden = true; return; }
    editing = game;
    $('editBody').hidden = false;
    $('editLocation').innerHTML = locationOptions(game.locationValue);
    $('editBggNow').textContent = game.bggId ? `지금 연결: BGG ${game.bggId}` : '지금 BGG에 연결돼 있지 않아요.';
    $('editBggInput').value = '';
    $('editAbbr').value = game.abbrSource === 'fallback' ? '' : game.abbr;
    $('editAbbrNow').textContent = game.abbrSource === 'fallback' ? `지금은 자동(앞 2글자 「${game.abbr}」)` : '직접 정한 약칭 — 비우고 저장하면 자동으로 돌아가요';
    show(out, 'info', '룰·정리 방법을 불러오는 중…');
    try {
      const db = await ensureDb();
      override = await db.getGameOverride(game.id);
      const sec = override?.rule_sections || {};
      $('ruleGoal').value = sec.goal || ''; $('ruleSetup').value = sec.setup || '';
      $('rulePlay').value = sec.play || ''; $('ruleEnd').value = sec.end || '';
      $('errorNote').value = override?.error_note || '';
      $('organizerNote').value = override?.organizer_note || '';
      photoUrls = [...(override?.organizer_photo_urls || [])];
      renderPhotos();
      show(out, '', '');
    } catch (e) { show(out, 'err', e.message); }
  });

  $('editLocationSave').addEventListener('click', async () => {
    const out = $('editResult');
    try {
      const r = await api('POST', '/api/locations', { names: [editing.ownedName], location: $('editLocation').value, announce: $('editAnnounce').checked });
      show(out, 'ok', `위치를 저장했어요.${r.arrived.length ? ' 도착 알림은 사이트에 올릴 때 나가요.' : ''}`);
      await reload();
      out.insertAdjacentHTML('beforeend', '<div></div>');
      await build(out.lastElementChild, { fetchBgg: false, translate: false });
    } catch (e) { show(out, 'err', e.message); }
  });

  $('editAbbrSave').addEventListener('click', async () => {
    const out = $('editResult');
    try {
      await api('POST', '/api/abbr', { gameId: editing.id, abbr: $('editAbbr').value.trim() });
      show(out, 'ok', '약칭을 저장했어요.');
      await reload();
      out.insertAdjacentHTML('beforeend', '<div></div>');
      await build(out.lastElementChild, { fetchBgg: false, translate: false });
    } catch (e) { show(out, 'err', e.message); }
  });

  $('editBggSave').addEventListener('click', async () => {
    const out = $('editResult');
    try {
      await api('POST', '/api/games/bgg', { name: editing.ownedName, bggInput: $('editBggInput').value.trim() });
      out.innerHTML = '<div></div>';
      await build(out.lastElementChild, { gameIds: [editing.id], fetchBgg: true, translate: true });
      await reload();
    } catch (e) { show(out, 'err', e.message); }
  });

  $('overrideSave').addEventListener('click', async () => {
    const out = $('editResult');
    $('overrideSave').disabled = true;
    try {
      const db = await ensureDb();
      for (const file of $('organizerPhotoInput').files) {
        const url = await db.uploadOrganizerPhoto(file, editing.id);
        if (!url) throw new Error(`사진을 올리지 못했어요: ${file.name}`);
        photoUrls.push(url);
      }
      const ok = await db.upsertGameOverride(editing.id, {
        organizerPhotoUrls: photoUrls,
        organizerNote: $('organizerNote').value,
        // 레거시 rule_note는 이 화면에서 편집하지 않지만, 넘기지 않으면 null로 지워진다.
        ruleNote: override?.rule_note || null,
        errorNote: $('errorNote').value,
        ruleSections: { goal: $('ruleGoal').value, setup: $('ruleSetup').value, play: $('rulePlay').value, end: $('ruleEnd').value },
      });
      if (!ok) throw new Error('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      $('organizerPhotoInput').value = '';
      renderPhotos();
      show(out, 'ok', '룰·정리 방법을 저장했어요. 사이트에 바로 반영돼요.');
    } catch (e) { show(out, 'err', e.message); } finally { $('overrideSave').disabled = false; }
  });

  // ── 위치 확인 필요 ─────────────────────────────────
  function renderIssues() {
    $('issueList').innerHTML = state.issues.map(g => `<div class="item"><b>${esc(g.ownedName)}</b><span class="help" style="margin:0">지금: ${esc(g.location || '(빈칸)')}</span><select data-name="${esc(g.ownedName)}" style="margin-left:auto;max-width:260px">${locationOptions('')}</select></div>`).join('')
      || '<div class="item help">확인할 게임이 없어요. 👍</div>';
  }
  $('issueList').addEventListener('change', async e => {
    const sel = e.target.closest('select[data-name]');
    if (!sel || !sel.value) return;
    const out = $('issueResult');
    try {
      await api('POST', '/api/locations', { names: [sel.dataset.name], location: sel.value, announce: false });
      show(out, 'ok', `「${sel.dataset.name}」 위치를 저장했어요. 다 고친 뒤 「사이트에 올리기」에서 올려 주세요.`);
      await reload(); renderIssues();
      out.insertAdjacentHTML('beforeend', '<div></div>');
      await build(out.lastElementChild, { fetchBgg: false, translate: false });
    } catch (err) { show(out, 'err', err.message); }
  });

  // ── 사이트에 올리기 ────────────────────────────────
  async function loadPublishPreview() {
    const el = $('publishPreview');
    try {
      const p = await api('GET', '/api/publish');
      const lines = [
        p.branch !== 'main' ? `⚠️ 지금 「${p.branch}」 브랜치예요. main에서만 올릴 수 있어요.` : null,
        p.summary.length ? `올라갈 것: ${p.summary.join(', ')} (파일 ${p.files.length}개)` : '올릴 게임 데이터 변경이 없어요.',
        p.pendingAnnouncements.length
          ? `보낼 알림 ${p.pendingAnnouncements.length}건: ` + p.pendingAnnouncements.map(a => `${a.kind === 'arrived' ? '도착' : '새 게임'} — ${a.names.join(', ')}`).join(' / ')
          : '보낼 알림 없음',
      ].filter(Boolean);
      show(el, 'info', lines.join('\n'));
      $('publishGo').disabled = p.branch !== 'main' || !p.files.length;
    } catch (e) { show(el, 'err', e.message); }
  }
  $('publishGo').addEventListener('click', async () => {
    const out = $('publishResult');
    $('publishGo').disabled = true;
    show(out, 'info', '검사하고 올리는 중… (1분 안팎)');
    try {
      const r = await api('POST', '/api/publish');
      show(out, r.ok ? 'ok' : 'err', r.message + (r.commit ? `\n(커밋 ${r.commit})` : ''));
    } catch (e) { show(out, 'err', e.message); }
    await reload();
    loadPublishPreview();
  });

  // ── 시작 ───────────────────────────────────────────
  reload().then(() => {
    const incoming = state.locations.find(l => l.code === 'Z');
    $('batchFilter').innerHTML = locationOptions(incoming?.value || '', true);
    $('batchTarget').innerHTML = locationOptions('');
    $('addLocation').innerHTML = locationOptions('');
    renderBatch();
  }).catch(e => show($('globalMsg'), 'err', '게임 목록을 불러오지 못했어요: ' + e.message));
})();
