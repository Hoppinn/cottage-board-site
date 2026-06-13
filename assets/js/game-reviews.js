(function () {
  const params = new URLSearchParams(location.search);
  const GAME_ID = params.get('game') || '';

  // ── helpers ─────────────────────────────────────────────────────

  function getGameName(id) {
    if (!id) return '알 수 없는 게임';
    if (window.COTTAGE_GAMES) {
      const g = window.COTTAGE_GAMES.find(g => String(g.bggId) === String(id) || g.id === id);
      if (g) return g.display || g.titleKo || g.titleEn || id;
    }
    return id;
  }

  function getGameKey(gameId) {
    if (!gameId || !window.gameData) return null;
    if (window.gameData[gameId]) return gameId;
    const entry = Object.entries(window.gameData).find(([, g]) => String(g.bgg?.id) === String(gameId));
    return entry ? entry[0] : null;
  }

  function gameIdByName(name) {
    if (!window.COTTAGE_GAMES || !name) return name;
    const found = window.COTTAGE_GAMES.find(g => {
      const label = g.display || g.titleKo || g.titleEn || '';
      return label.trim() === name.trim();
    });
    return found ? String(found.bggId) : name;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function todayKst() {
    return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  }

  function formatKstDate(d) {
    if (!d || d === '?') return d;
    const [y, m, day] = d.split('-');
    return `${y}년 ${Number(m)}월 ${Number(day)}일`;
  }

  // toInitials, hangulMatch, attachAc, initTagInput, buildPhotoItemAdder,
  // parsePhotoUrls, buildPhotoHtml, openLightbox → play-records-utils.js 전역 사용

  // 참여자 이름 정규화 — 그룹핑 키 전용 (가나다순 정렬)
  function normalizeNames(raw) {
    if (!raw) return null;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return null;
    return parts.sort((a, b) => a.localeCompare(b, 'ko')).join(', ');
  }

  // 입력자를 맨 앞으로 — 신규 저장 전용
  function putSelfFirst(names, selfNick) {
    if (!names || !selfNick) return names;
    const parts = names.split(',').map(s => s.trim()).filter(Boolean);
    const idx = parts.findIndex(n => n.toLowerCase() === selfNick.toLowerCase());
    if (idx > 0) { const [me] = parts.splice(idx, 1); parts.unshift(me); }
    return parts.join(', ') || null;
  }

  function showToast(msg) {
    const t = document.getElementById('prToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }



  // ── entry point ──────────────────────────────────────────────────

  const headerEl = document.getElementById('reviewPageHeader');
  const root = document.getElementById('reviewRoot');

  let tried = false;
  function tryInit() { if (tried) return; tried = true; GAME_ID ? initGameView() : initHub(); }
  window.addEventListener('kakao-auth-ready', tryInit);
  window.addEventListener('cottage-auth-changed', () => { if (!GAME_ID) renderInputPanel(); });
  setTimeout(tryInit, 1200);

  // ══════════════════════════════════════════════════════════════
  // HUB MODE (메인 플레이 기록 허브)
  // ══════════════════════════════════════════════════════════════

  function initHub() {
    document.title = '플레이 기록 | 코티지보드';
    // h1은 static HTML에 있음

    root.innerHTML = `
      <div class="pr-tabs">
        <button class="pr-tab is-active" data-tab="records">기록 보기</button>
        <button class="pr-tab" data-tab="input">기록 입력</button>
      </div>
      <div id="prPanelInput" class="pr-panel"></div>
      <div id="prPanelRecords" class="pr-panel is-active"></div>`;

    root.querySelectorAll('.pr-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.pr-tab').forEach(t => t.classList.remove('is-active'));
        root.querySelectorAll('.pr-panel').forEach(p => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        document.getElementById('prPanel' + cap(tab.dataset.tab)).classList.add('is-active');
        if (tab.dataset.tab === 'records') loadRecords();
      });
    });

    renderInputPanel();
    loadRecords();
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── 기록 입력 탭 ─────────────────────────────────────────────

  async function renderInputPanel() {
    const panel = document.getElementById('prPanelInput');
    if (!panel) return;

    const user = window.getKakaoUser?.();
    if (!user) {
      panel.innerHTML = `<div class="pr-login-notice">
        <p>로그인하면 플레이 기록을 남길 수 있어요.</p>
        <button class="btn primary-btn" style="margin-top:14px;font-size:13px;padding:8px 18px;min-width:0" onclick="window.kakaoLogin?.()">카카오 로그인</button>
      </div>`;
      return;
    }

    const groups = await window.CottageDB?.getGroupNames() || [];
    if (!groups.includes('코티지보드 동호회')) groups.unshift('코티지보드 동호회');
    window._prGroups = groups;
    window._prPlayerNames = await window.CottageDB?.getPlayerNames() || [];

    async function refreshAutocompleteLists() {
      const fresh = await window.CottageDB?.getGroupNames() || [];
      if (!fresh.includes('코티지보드 동호회')) fresh.unshift('코티지보드 동호회');
      window._prGroups = fresh;
      window._prPlayerNames = await window.CottageDB?.getPlayerNames() || [];
      window._refreshAutocompleteLists = refreshAutocompleteLists;
    }
    window._refreshAutocompleteLists = refreshAutocompleteLists;

    panel.innerHTML = `
      <div class="pr-meta-grid">
        <div>
          <label class="pr-field-label">날짜</label>
          <input type="date" id="prDate" value="${todayKst()}">
        </div>
        <div>
          <label class="pr-field-label">그룹명 (선택)</label>
          <div class="pr-autocomplete-wrap">
            <input type="text" id="prGroup" placeholder="동호회명 등" autocomplete="off">
            <div class="pr-autocomplete-list" id="prGroupAcList"></div>
          </div>
        </div>
      </div>

      <div class="pr-game-rows" id="prGameRows"></div>
      <button class="pr-add-btn" id="prAddBtn" type="button">+ 게임 추가</button>
      <button class="pr-submit-btn" id="prSaveBtn" type="button">저장하기</button>`;

    let rowIdx = 0;

    function addRow(focusInput) {
      const div = document.createElement('div');
      div.className = 'pr-game-row';
      div.dataset.row = ++rowIdx;
      div.innerHTML = `
        <div class="pr-row-head">
          <div class="pr-autocomplete-wrap">
            <input type="text" class="pr-game-name" placeholder="게임명 검색" autocomplete="off">
            <div class="pr-autocomplete-list"></div>
          </div>
          <button class="pr-rm-btn" type="button" title="삭제">✕</button>
        </div>
        ${rowIdx > 1 ? `<button class="pr-same-as-above-btn" type="button">↑ 위와 동일 (인원·참여자)</button>` : ''}
        <div class="pr-detail-grid">
          <div>
            <label class="pr-field-label">인원수</label>
            <div class="pr-count-toggles">
              ${[1,2,3,4,5,6,7,8].map(n => `<button class="pr-count-btn" type="button" data-n="${n}">${n}명</button>`).join('')}
            </div>
          </div>
          <div>
            <label class="pr-field-label">플레이시간(분)</label>
            <input type="number" class="pr-time" placeholder="–" min="1">
          </div>
          <div>
            <label class="pr-field-label">참여자</label>
            <div class="tag-input-wrap pr-names-wrap">
              <div class="tag-chips"></div>
              <input type="text" class="tag-text-input" placeholder="이름 입력 후 엔터">
              <input type="hidden" class="pr-names">
            </div>
          </div>
          <div>
            <label class="pr-field-label">점수·메모</label>
            <textarea class="pr-score" placeholder="1등: 홍길동" rows="2"></textarea>
          </div>
        </div>
        <label class="pr-photo-trigger">
          📷 사진 추가 (선택, 여러 장)
          <input type="file" class="pr-photo" accept="image/*" multiple style="display:none">
        </label>
        <div class="pr-photo-grid"></div>
        <textarea class="pr-review-ta pr-review" placeholder="후기 (선택)" rows="2"></textarea>`;

      // 게임명 자동완성
      attachAc(
        div.querySelector('.pr-game-name'),
        () => (window.COTTAGE_GAMES || []).map(g => g.display || g.titleKo || g.titleEn || '').filter(Boolean),
        null,
        div.querySelector('.pr-autocomplete-list')
      );

      div.querySelectorAll('.pr-count-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const wasOn = btn.classList.contains('is-on');
          div.querySelectorAll('.pr-count-btn').forEach(b => b.classList.remove('is-on'));
          if (!wasOn) btn.classList.add('is-on');
        });
      });

      const photoInput = div.querySelector('.pr-photo');
      const photoGrid  = div.querySelector('.pr-photo-grid');
      div._photoFiles  = [];
      const addPhotoItem = buildPhotoItemAdder(photoGrid, div._photoFiles, 5);

      photoInput.addEventListener('change', async () => {
        for (const f of Array.from(photoInput.files)) await addPhotoItem(f);
        photoInput.value = '';
      });

      initTagInput(div.querySelector('.pr-names-wrap'), div.querySelector('.pr-names'));

      // 참여자 이름 자동완성 — 콤마 구분 조합 선택 시 개별 칩으로 분리
      attachAc(
        div.querySelector('.tag-text-input'),
        () => {
          const added = [...div.querySelectorAll('.pr-names-wrap .tag-chip')].map(c => c.dataset.val.trim().toLowerCase());
          return (window._prPlayerNames || []).filter(s =>
            !s.split(',').map(n => n.trim().toLowerCase()).some(n => n && added.includes(n))
          );
        },
        s => {
          const ti = div.querySelector('.tag-text-input');
          s.split(',').forEach(name => {
            name = name.trim();
            if (!name) return;
            ti.value = name;
            ti.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          });
        },
        div.querySelector('.pr-names-wrap')
      );

      const sameBtn = div.querySelector('.pr-same-as-above-btn');
      if (sameBtn) {
        sameBtn.addEventListener('click', () => {
          const allRows = [...document.querySelectorAll('#prGameRows .pr-game-row')];
          const curIdx = allRows.indexOf(div);
          if (curIdx <= 0) return;
          const firstRow = allRows[curIdx - 1];
          const activeCountBtn = firstRow.querySelector('.pr-count-btn.is-on');
          div.querySelectorAll('.pr-count-btn').forEach(b => b.classList.remove('is-on'));
          if (activeCountBtn) {
            const matchBtn = div.querySelector(`.pr-count-btn[data-n="${activeCountBtn.dataset.n}"]`);
            if (matchBtn) matchBtn.classList.add('is-on');
          }
          const firstNames = firstRow.querySelector('.pr-names').value;
          const chipsWrap = div.querySelector('.tag-chips');
          const textInput = div.querySelector('.tag-text-input');
          const hiddenInput = div.querySelector('.pr-names');
          chipsWrap.querySelectorAll('.tag-chip').forEach(c => c.remove());
          hiddenInput.value = '';
          if (firstNames) {
            firstNames.split(',').forEach(name => {
              name = name.trim();
              if (!name) return;
              textInput.value = name;
              textInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
            });
          }
        });
      }

      div.querySelector('.pr-rm-btn').addEventListener('click', () => div.remove());
      document.getElementById('prGameRows').appendChild(div);
      if (focusInput) div.querySelector('.pr-game-name').focus();
    }

    // 그룹명 자동완성
    attachAc(document.getElementById('prGroup'), () => window._prGroups || [], null, document.getElementById('prGroupAcList'));

    addRow(false);

    document.getElementById('prAddBtn').addEventListener('click', () => addRow(true));

    document.getElementById('prSaveBtn').addEventListener('click', async () => {
      if (window.CottageDB?.isUserBanned?.()) { showToast('⛔ 이용이 제한된 계정입니다.'); return; }
      const dateVal = document.getElementById('prDate').value || todayKst();
      const groupVal = document.getElementById('prGroup').value.trim();
      const rows = document.querySelectorAll('#prGameRows .pr-game-row');

      const entries = [];
      for (const row of rows) {
        const name = row.querySelector('.pr-game-name').value.trim();
        if (!name) continue;
        const activeCountBtn = row.querySelector('.pr-count-btn.is-on');
        entries.push({
          id: gameIdByName(name),
          count: activeCountBtn ? parseInt(activeCountBtn.dataset.n) : null,
          time: parseInt(row.querySelector('.pr-time').value) || null,
          names: putSelfFirst(row.querySelector('.pr-names').value.trim() || null, user.nickname),
          score: row.querySelector('.pr-score').value.trim().split(/\n+/).map(s=>s.trim()).filter(Boolean).join(' / ') || null,
          review: row.querySelector('.pr-review').value.trim() || null,
          photoFiles: row._photoFiles || [],
        });
      }

      if (!entries.length) { alert('게임을 하나 이상 입력해주세요.'); return; }

      const btn = document.getElementById('prSaveBtn');
      btn.disabled = true; btn.textContent = '저장 중...';

      let ok = true;
      for (const e of entries) {
        let photoUrl = null;
        if (e.photoFiles?.length) {
          const uploaded = [];
          for (const pf of e.photoFiles) {
            const url = await window.CottageDB.uploadPlayPhoto(pf, user.id);
            if (url) uploaded.push(url);
            else showToast('⚠️ 사진 업로드 실패 (Storage 정책 확인 필요)');
          }
          if (uploaded.length === 1) photoUrl = uploaded[0];
          else if (uploaded.length > 1) photoUrl = JSON.stringify(uploaded);
        }
        const res = await window.CottageDB.recordGamePlay(
          e.id, e.count, e.names, e.time, e.score,
          user.nickname, user.id, groupVal || null, dateVal, photoUrl, e.review || null
        );
        if (res?.error) { ok = false; continue; }
      }

      btn.disabled = false; btn.textContent = '저장하기';

      if (ok) {
        showToast('저장됐어요!'); window._refreshAutocompleteLists?.();
        document.getElementById('prGameRows').innerHTML = '';
        addRow(false);
        if (groupVal && !groups.includes(groupVal)) groups.push(groupVal);
        recordsLoaded = false;
        const recTab = root.querySelector('[data-tab="records"]');
        if (recTab) recTab.click();
      } else {
        alert('일부 저장에 실패했어요. 다시 시도해주세요.');
      }
    });
  }

  // ── 기록 보기 탭 ─────────────────────────────────────────────

  let recordsLoaded = false;
  let recordsData = null;
  let currentView = 'group';

  async function loadRecords() {
    if (recordsLoaded && recordsData !== null) {
      renderRecords(recordsData);
      return;
    }
    recordsLoaded = true;
    const panel = document.getElementById('prPanelRecords');
    panel.innerHTML = '<p class="pr-empty">불러오는 중...</p>';

    try {
      recordsData = await window.CottageDB.getAllPlayRecordsForHub();
      renderRecords(recordsData);
    } catch (err) {
      console.error(err);
      document.getElementById('prPanelRecords').innerHTML = '<p class="pr-empty">불러오기 실패</p>';
    }
  }

  function renderRecords(data) {
    const panel = document.getElementById('prPanelRecords');
    const user = window.getKakaoUser?.();

    const toggleHtml = `<div class="pr-view-toggle">
      <button class="pr-vt-btn ${currentView === 'group' ? 'is-active' : ''}" data-view="group">모임별</button>
      <button class="pr-vt-btn ${currentView === 'game' ? 'is-active' : ''}" data-view="game">게임별</button>
    </div>`;

    if (!data?.length) {
      panel.innerHTML = toggleHtml + '<p class="pr-empty">아직 기록이 없어요.</p>';
      bindToggle(panel);
      return;
    }

    const contentHtml = currentView === 'group'
      ? renderGroupView(data, user)
      : renderGameView(data, user);

    panel.innerHTML = toggleHtml + contentHtml;
    bindToggle(panel);

    panel.querySelectorAll('.pr-session-hd').forEach(hd => {
      hd.addEventListener('click', () => hd.closest('.pr-session').classList.toggle('is-open'));
    });
    panel.querySelectorAll('.pr-sub-hd').forEach(hd => {
      hd.addEventListener('click', () => hd.closest('.pr-sub-session').classList.toggle('is-open'));
    });
    panel.querySelectorAll('.pr-dates-more-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.pr-dates-more');
        wrap.classList.toggle('is-open');
        btn.textContent = wrap.classList.contains('is-open')
          ? btn.textContent.replace('더 보기 ▾', '접기 ▴')
          : btn.textContent.replace('접기 ▴', '더 보기 ▾');
      });
    });
    panel.querySelectorAll('.pr-rec-more-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const more = btn.closest('.pr-rec-more');
        const isOpen = more.classList.contains('is-open');
        panel.querySelectorAll('.pr-rec-more.is-open').forEach(m => m.classList.remove('is-open'));
        if (!isOpen) more.classList.add('is-open');
      });
    });
    if (!window._prMoreOutsideClickBound) {
      window._prMoreOutsideClickBound = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.pr-rec-more.is-open').forEach(m => m.classList.remove('is-open'));
      });
    }

    panel.querySelectorAll('.pr-rec-del').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('이 기록을 삭제할까요?')) return;
        const res = await window.CottageDB?.deleteGamePlay(btn.dataset.id);
        if (!res?.error) {
          recordsData = recordsData.filter(r => String(r.id) !== String(btn.dataset.id));
          renderRecords(recordsData);
        }
      });
    });

    panel.querySelectorAll('.pr-rec-photo-del').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('이 사진을 삭제할까요?')) return;
        const recId = btn.dataset.id;
        const delUrl = btn.dataset.url;
        const idx = recordsData.findIndex(r => String(r.id) === String(recId));
        if (idx === -1) return;
        const remaining = parsePhotoUrls(recordsData[idx].photo_url).filter(u => u !== delUrl);
        let newPhotoUrl = null;
        if (remaining.length === 1) newPhotoUrl = remaining[0];
        else if (remaining.length > 1) newPhotoUrl = JSON.stringify(remaining);
        const res = await window.CottageDB?.updateGamePlay(recId, { photo_url: newPhotoUrl });
        if (!res?.error) {
          recordsData[idx].photo_url = newPhotoUrl;
          renderRecords(recordsData);
        }
      });
    });

    panel.querySelectorAll('.pr-rec-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const row = btn.closest('.pr-rec-row');
        if (row.querySelector('.pr-inline-edit')) return;
        let rec = {};
        try { rec = JSON.parse(row.dataset.record || '{}'); } catch (_) {}
        const form = document.createElement('div');
        form.className = 'pr-inline-edit';
        // 현재 게임 표시 이름
        const currentGameDisplay = getGameName(rec.gameId || '');
        form.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:12px;font-weight:700;color:var(--muted)">기록 수정</span>
            <button class="pr-inline-cancel-top" type="button" style="font-size:12px;background:none;border:1px solid var(--border,#e8e4dc);border-radius:6px;padding:3px 10px;cursor:pointer;color:var(--muted);font-family:inherit">✕ 취소</button>
          </div>
          <label for="pie-game-${btn.dataset.id}" style="font-size:11px;color:var(--muted);font-weight:700;color:#c0392b">🎲 게임명 수정</label>
          <input id="pie-game-${btn.dataset.id}" name="pie-game" class="pie-game" placeholder="게임명 검색" value="${escH(currentGameDisplay)}" autocomplete="off" style="border-color:#c0392b">
          <label for="pie-names-text-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">참여자</label>
          <div class="tag-input-wrap pie-names-wrap">
            <div class="tag-chips"></div>
            <input id="pie-names-text-${btn.dataset.id}" type="text" class="tag-text-input" placeholder="이름 입력 후 엔터">
            <input type="hidden" name="pie-names" class="pie-names">
          </div>
          <label for="pie-count-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">인원수</label>
          <input id="pie-count-${btn.dataset.id}" name="pie-count" class="pie-count" type="number" placeholder="명" value="${escH(String(rec.count||''))}">
          <label for="pie-time-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">플레이 시간(분)</label>
          <input id="pie-time-${btn.dataset.id}" name="pie-time" class="pie-time" type="number" placeholder="분" value="${escH(String(rec.time||''))}">
          <label for="pie-score-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">점수·메모</label>
          <textarea id="pie-score-${btn.dataset.id}" name="pie-score" class="pie-score" placeholder="예: 83 / 75점" rows="2">${escH(rec.score||'')}</textarea>
          <label for="pie-group-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">모임명</label>
          <input id="pie-group-${btn.dataset.id}" name="pie-group" class="pie-group" placeholder="예: 코티지보드 동호회" value="${escH(rec.group||'')}">
          <label for="pie-date-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">날짜</label>
          <input id="pie-date-${btn.dataset.id}" name="pie-date" class="pie-date" type="date" value="${escH(rec.date||'')}">
          <label for="pie-review-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">후기</label>
          <textarea id="pie-review-${btn.dataset.id}" name="pie-review" class="pie-review" placeholder="후기">${escH(rec.review||'')}</textarea>
          <label style="font-size:11px;color:var(--muted)">사진</label>
          <div class="pie-cur-photos" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">
            ${parsePhotoUrls(rec.photo).map(u => `<div class="pie-existing-item" data-url="${escH(u)}" style="position:relative;width:80px;height:80px;flex-shrink:0"><img src="${escH(u)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;display:block"><button type="button" class="pr-photo-item-del pie-existing-del">×</button></div>`).join('')}
          </div>
          <div class="pr-photo-grid pie-new-grid"></div>
          <label class="pr-photo-trigger">📷 사진 추가<input type="file" class="pie-photo-file" accept="image/*" multiple style="display:none"></label>
          <div class="pr-inline-edit-actions">
            <button class="pr-inline-cancel" type="button">취소</button>
            <button class="pr-inline-save" type="button">저장</button>
          </div>`;
        row.querySelector('.pr-rec-main').appendChild(form);
        row.classList.add('is-editing');

        // 게임명 자동완성 (COTTAGE_GAMES display 목록)
        attachAc(form.querySelector('.pie-game'), () =>
          (window.COTTAGE_GAMES || []).map(g => g.display).filter(Boolean)
        );

        // 모임명 자동완성
        attachAc(form.querySelector('.pie-group'), () => window._prGroups || []);

        // 참여자 태그칩 (등록폼과 동일 방식, 기존 값 초기 로드)
        initTagInput(form.querySelector('.pie-names-wrap'), form.querySelector('.pie-names'), rec.names || '');
        attachAc(
          form.querySelector('.pie-names-wrap .tag-text-input'),
          () => {
            const added = [...form.querySelectorAll('.pie-names-wrap .tag-chip')].map(c => c.dataset.val.trim().toLowerCase());
            return (window._prPlayerNames || []).filter(s =>
              !s.split(',').map(n => n.trim().toLowerCase()).some(n => n && added.includes(n))
            );
          },
          s => {
            const ti = form.querySelector('.pie-names-wrap .tag-text-input');
            s.split(',').forEach(name => {
              name = name.trim();
              if (!name) return;
              ti.value = name;
              ti.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
            });
          },
          form.querySelector('.pie-names-wrap')
        );

        // 기존 사진 개별 삭제
        form.querySelectorAll('.pie-existing-del').forEach(btn => {
          btn.addEventListener('click', () => btn.closest('.pie-existing-item').remove());
        });

        // 새 사진 추가 (다중)
        const piePhotoFile = form.querySelector('.pie-photo-file');
        const pieNewGrid = form.querySelector('.pie-new-grid');
        const pieNewFiles = [];

        const addPieNewItem = buildPhotoItemAdder(pieNewGrid, pieNewFiles);

        if (piePhotoFile) {
          piePhotoFile.addEventListener('change', async () => {
            for (const f of Array.from(piePhotoFile.files)) await addPieNewItem(f);
            piePhotoFile.value = '';
          });
        }

        form.querySelector('.pr-inline-cancel').addEventListener('click', () => { form.remove(); row.classList.remove('is-editing'); });
        form.querySelector('.pr-inline-cancel-top').addEventListener('click', () => { form.remove(); row.classList.remove('is-editing'); });
        form.querySelector('.pr-inline-save').addEventListener('click', async () => {
          const saveBtn = form.querySelector('.pr-inline-save');
          saveBtn.disabled = true;
          // 게임명 → game_id (gameKey 우선)
          const gameDisplayInput = form.querySelector('.pie-game').value.trim();
          let newGameId = null;
          if (gameDisplayInput) {
            const found = (window.COTTAGE_GAMES || []).find(g => g.display === gameDisplayInput);
            newGameId = found ? found.id : gameDisplayInput;
          }
          // 사진 처리 — 남은 기존 URL + 새 업로드 URL 합산
          const remainingUrls = [...form.querySelectorAll('.pie-existing-item')].map(el => el.dataset.url).filter(Boolean);
          const uploadedUrls = [];
          let uploadErr = false;
          for (const pf of pieNewFiles) {
            const url = await window.CottageDB.uploadPlayPhoto(pf, user.id);
            if (url) uploadedUrls.push(url);
            else uploadErr = true;
          }
          if (uploadErr) { saveBtn.disabled = false; alert('사진 업로드에 실패했습니다.'); return; }
          const allPhotoUrls = [...remainingUrls, ...uploadedUrls];
          let photoUrlUpd = null;
          if (allPhotoUrls.length === 1) photoUrlUpd = allPhotoUrls[0];
          else if (allPhotoUrls.length > 1) photoUrlUpd = JSON.stringify(allPhotoUrls);

          const updFields = {
            player_names: form.querySelector('.pie-names').value.trim() || null,
            player_count: parseInt(form.querySelector('.pie-count').value) || null,
            play_time_min: parseInt(form.querySelector('.pie-time').value) || null,
            score_note: form.querySelector('.pie-score').value.trim().split(/\n+/).map(s=>s.trim()).filter(Boolean).join(' / ') || null,
            group_name: form.querySelector('.pie-group').value.trim() || null,
            played_at: form.querySelector('.pie-date').value || null,
            review_text: form.querySelector('.pie-review').value.trim() || null,
            ...(newGameId ? { game_id: newGameId } : {}),
            photo_url: photoUrlUpd,
          };
          const res = await window.CottageDB?.updateGamePlay(btn.dataset.id, updFields);
          if (!res?.error) {
            const idx = recordsData.findIndex(r => String(r.id) === String(btn.dataset.id));
            if (idx !== -1) Object.assign(recordsData[idx], updFields);
            renderRecords(recordsData); window._refreshAutocompleteLists?.();
          } else {
            saveBtn.disabled = false;
            alert('수정에 실패했습니다.');
          }
        });
      });
    });

    // 기록 사진 라이트박스
    panel.querySelectorAll('.pr-rec-photo').forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = img.closest('.pr-rec-photo-wrap');
        try { openLightbox(JSON.parse(wrap.dataset.urls || '[]'), Number(img.dataset.idx || 0)); } catch(_) {}
      });
    });
    panel.querySelectorAll('.pr-rec-photo-more').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = el.closest('.pr-rec-photo-wrap');
        try { openLightbox(JSON.parse(wrap.dataset.urls || '[]'), Number(el.dataset.idx || 3)); } catch(_) {}
      });
    });

    // URL 딥링크: ?group=X&date=YYYY-MM-DD → 해당 그룹+날짜 자동 확장
    if (currentView === 'group') {
      const urlP = new URLSearchParams(location.search);
      const urlGroup = urlP.get('group');
      const urlDate  = urlP.get('date');
      if (urlGroup) {
        panel.querySelectorAll('.pr-session').forEach(session => {
          const lbl = session.querySelector('.pr-session-date')?.textContent?.trim();
          if (lbl !== urlGroup) return;
          session.classList.add('is-open');
          if (urlDate) {
            // hidden dates("이전 N회 더 보기") 안에 있으면 먼저 펼침
            const moreWrap = session.querySelector('.pr-dates-more');
            if (moreWrap?.querySelector(`[data-date="${urlDate}"]`)) moreWrap.classList.add('is-open');
            const sub = session.querySelector(`.pr-sub-session[data-date="${urlDate}"]`);
            if (sub) {
              sub.classList.add('is-open');
              setTimeout(() => sub.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
            } else {
              setTimeout(() => session.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
            }
          } else {
            setTimeout(() => session.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
          }
        });
      }
    }
  }

  function bindToggle(panel) {
    panel.querySelectorAll('.pr-vt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        renderRecords(recordsData);
      });
    });
  }

  function renderGroupView(data, user) {
    // group_name → date → records[]
    const groups = new Map();
    for (const r of data) {
      const g = r.group_name || '';
      const d = r.played_at || r.created_at?.slice(0, 10) || '?';
      if (!groups.has(g)) groups.set(g, new Map());
      const dateMap = groups.get(g);
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d).push(r);
    }

    let html = '';
    const sortedGroups = [...groups.entries()].sort((a, b) => {
      const latestA = Math.max(...[...a[1].keys()].map(d => new Date(d).getTime() || 0));
      const latestB = Math.max(...[...b[1].keys()].map(d => new Date(d).getTime() || 0));
      return latestB - latestA;
    });
    for (const [groupName, dateMap] of sortedGroups) {
      const label = groupName || '기타 기록';
      const totalGames = [...dateMap.values()].reduce((s, recs) => s + recs.length, 0);
      html += `<div class="pr-session">
        <button class="pr-session-hd" type="button">
          <span class="pr-session-date">${escH(label)}</span>
          <span class="pr-session-summary">${dateMap.size}회 · ${totalGames}게임</span>
          <span class="pr-session-arrow">▾</span>
        </button>
        <div class="pr-session-body">`;

      const MAX_DATES = 3;
      const sortedDates = [...dateMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      const visibleDates = sortedDates.slice(0, MAX_DATES);
      const hiddenDates = sortedDates.slice(MAX_DATES);

      const renderDateBlock = ([dateStr, recs]) => {
        const gameNames = recs.map(r => getGameName(r.game_id));
        const summaryText = gameNames.slice(0, 3).join(', ') + (gameNames.length > 3 ? ` 외 ${gameNames.length - 3}개` : '');
        return `<div class="pr-sub-session" data-date="${dateStr}">
          <button class="pr-sub-hd" type="button">
            <span class="pr-sub-date">${escH(formatKstDate(dateStr))}</span>
            <span class="pr-sub-summary">${escH(summaryText)}</span>
            <span class="pr-sub-arrow">▾</span>
          </button>
          <div class="pr-sub-body">${buildSessionBody(recs, user)}</div>
        </div>`;
      };

      html += visibleDates.map(renderDateBlock).join('');

      if (hiddenDates.length > 0) {
        html += `<div class="pr-dates-more">
          <div class="pr-dates-more-body">${hiddenDates.map(renderDateBlock).join('')}</div>
          <button class="pr-dates-more-btn" type="button">이전 ${hiddenDates.length}회 더 보기 ▾</button>
        </div>`;
      }

      if (groupName === '코티지보드 동호회') {
        html += `<div class="pr-club-link-row"><a class="pr-club-link" href="../club/club-history.html">📸 동호회 기록 &amp; 사진 게시판에서 보러가기 →</a></div>`;
      }

      html += `</div></div>`;
    }
    return html;
  }

  function renderGameView(data, user) {
    // game_id → records[]
    const games = new Map();
    for (const r of data) {
      if (!games.has(r.game_id)) games.set(r.game_id, []);
      games.get(r.game_id).push(r);
    }

    let html = '';
    for (const [gameId, recs] of games) {
      const gameName = getGameName(gameId);
      const gKey = getGameKey(gameId) || gameId;
      const thumbUrl = window.gameData?.[gKey]?.images?.thumbnail || '';
      const safeKey = gKey ? gKey.replace(/'/g, "\\'") : '';
      html += `<div class="pr-game-card" role="button" tabindex="0"
        onclick="openGameRecordSheet('${safeKey}')"
        onkeydown="if(event.key==='Enter')openGameRecordSheet('${safeKey}')"
      >
        ${thumbUrl ? `<img class="pr-game-thumb" src="${escH(thumbUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="pr-game-card-info">
          <span class="pr-game-card-name">${escH(gameName)}</span>
          <span class="pr-game-card-meta">🎲 ${recs.length}회 플레이</span>
        </div>
        <span class="pr-game-card-arrow">›</span>
      </div>`;
    }
    return html;
  }

  function buildSessionBody(recs, user) {
    // 참여자(인원+이름) 기준으로 묶기
    const playerGroups = new Map();
    for (const r of recs) {
      const key = `${r.player_count||''}|${normalizeNames(r.player_names)||''}`;
      if (!playerGroups.has(key)) playerGroups.set(key, []);
      playerGroups.get(key).push(r);
    }

    let html = '';
    for (const [, groupRecs] of playerGroups) {
      const first = groupRecs[0];
      const countTag = first.player_count ? `<span class="pr-rec-tag pr-tag-count"><span class="pr-tag-icon">👥</span> ${first.player_count}명</span>` : '';
      const nameTags = first.player_names
        ? first.player_names.split(',').map((n, i) => {
            const t = n.trim();
            return `<span class="pr-rec-tag pr-tag-who${i === 0 ? ' pr-tag-who-first' : ''}">${escH(t)}</span>`;
          }).join('')
        : '';

      if (countTag || nameTags) {
        html += `<div class="pr-player-header">${countTag}${nameTags}</div>`;
      }

      html += groupRecs.map(r => {
        const isMine = user && String(r.user_id) === String(user.id);
        const reviewHtml = r.review_text ? `<p class="pr-rec-review">${escH(r.review_text)}</p>` : '';
        const photoUrls = parsePhotoUrls(r.photo_url);
        const canDelPhoto = photoUrls.length && (isMine || window.isOwner?.());
        const photoHtml = buildPhotoHtml(photoUrls, r.id, canDelPhoto);
        const gameKey = getGameKey(r.game_id);
        const thumbUrl = gameKey ? (window.gameData?.[gameKey]?.images?.thumbnail || '') : '';
        const thumbHtml = thumbUrl ? `<img class="pr-rec-thumb${gameKey ? ' pr-rec-thumb--link' : ''}" src="${escH(thumbUrl)}" alt="" loading="lazy" onerror="this.style.display='none'" ${gameKey ? `onclick="event.stopPropagation();openGameSheet('${gameKey.replace(/'/g,"\\'")}')"` : ''}>` : '';
        const isParticipant = user && (String(r.user_id) === String(user.id) || (r.player_names || '').split(',').map(n => n.trim()).some(n => n && n.toLowerCase() === (user.nickname || '').toLowerCase()));
        const dlParts = [r.play_time_min ? `${r.play_time_min}분` : '', r.score_note ? (s => /\d$/.test(s) ? s.replace(/점$/, '') + '점' : s)(escH(r.score_note).trimEnd()) : ''].filter(Boolean);
        const dateline = dlParts.length ? `<span class="pr-rec-dateline">${dlParts.join(' · ')}</span>` : '';
        const showSheet = gameKey && isParticipant;
        const showEdit = isMine || window.isOwner?.();
        const sheetItem = showSheet ? `<a class="pr-rec-sheet-item" href="#" onclick="event.preventDefault();event.stopPropagation();openGameSheet('${gameKey.replace(/'/g, "\\'")}')" >💬 👍</a>` : '';
        const editItems = showEdit ? `<button class="pr-rec-edit" data-id="${r.id}" type="button">✏️ 수정</button><button class="pr-rec-del" data-id="${r.id}" type="button">✕ 삭제</button>` : '';
        const moreMenu = (showSheet || showEdit) ? `<div class="pr-rec-more"><button class="pr-rec-more-btn" type="button" title="더보기">···</button><div class="pr-rec-more-menu">${sheetItem}${editItems}</div></div>` : '';
        return `<div class="pr-rec-row pr-rec-row--game" data-id="${r.id}" data-record='${JSON.stringify({gameId: r.game_id||'', names: r.player_names||'', count: r.player_count||'', time: r.play_time_min||'', score: r.score_note||'', review: r.review_text||'', group: r.group_name||'', date: r.played_at||'', photo: r.photo_url||''})}'>
          <div class="pr-rec-row-top">
            ${thumbHtml}
            <div class="pr-rec-main">
              <span class="pr-rec-game">${escH(getGameName(r.game_id))}</span>
              <div class="pr-rec-meta">${dateline}</div>
              ${reviewHtml}
            </div>
            ${moreMenu ? `<div class="pr-rec-actions">${moreMenu}</div>` : ''}
          </div>
          ${photoHtml}
        </div>`;
      }).join('');
    }
    return html;
  }

  function buildGameBody(recs, user) {
    // group_name + player_count + player_names 동일 시 묶기
    const groups = new Map();
    for (const r of recs) {
      const key = `${r.group_name||''}|${r.player_count||''}|${normalizeNames(r.player_names)||''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    let html = '';
    let isFirst = true;
    for (const [, grp] of groups) {
      const f = grp[0];
      const groupLabel = f.group_name || '';
      const countTag = f.player_count ? `<span class="pr-rec-tag pr-tag-count-game">${f.player_count}명</span>` : '';
      const nameTags = f.player_names
        ? f.player_names.split(',').map((n, i) => {
            const t = n.trim();
            return `<span class="pr-rec-tag pr-tag-who${i === 0 ? ' pr-tag-who-first' : ''}">${escH(t)}</span>`;
          }).join('')
        : '';

      html += `<div class="pr-game-group${isFirst ? ' pr-game-group--first' : ''}">`;
      if (groupLabel || countTag || nameTags) {
        html += `<div class="pr-game-group-hd">
          ${groupLabel ? `<span class="pr-game-group-moim">모임: ${escH(groupLabel)}</span>` : ''}
          ${countTag}${nameTags}
        </div>`;
      }

      const sorted = [...grp].sort((a, b) => {
        const da = a.played_at || a.created_at?.slice(0, 10) || '';
        const db = b.played_at || b.created_at?.slice(0, 10) || '';
        return db.localeCompare(da);
      });

      html += sorted.map(r => {
        const isMine = user && String(r.user_id) === String(user.id);
        const date = r.played_at || r.created_at?.slice(0, 10) || '?';
        const reviewHtml = r.review_text ? `<p class="pr-rec-review">${escH(r.review_text)}</p>` : '';
        const photoUrls = parsePhotoUrls(r.photo_url);
        const canDelPhoto = photoUrls.length && (isMine || window.isOwner?.());
        const photoHtml = buildPhotoHtml(photoUrls, r.id, canDelPhoto);
        const gameKey = getGameKey(r.game_id);
        const isParticipant = user && (String(r.user_id) === String(user.id) || (r.player_names || '').split(',').map(n => n.trim()).some(n => n && n.toLowerCase() === (user.nickname || '').toLowerCase()));
        const dlParts2 = [
          date !== '?' ? date.replace(/-/g, '.') : '',
          r.play_time_min ? `${r.play_time_min}분` : '',
          r.score_note ? (s => /\d$/.test(s) ? s.replace(/점$/, '') + '점' : s)(escH(r.score_note).trimEnd()) : ''
        ].filter(Boolean);
        const dateline = dlParts2.length ? `<span class="pr-rec-dateline">${dlParts2.join(' · ')}</span>` : '';
        const showSheet2 = gameKey && isParticipant;
        const showEdit2 = isMine || window.isOwner?.();
        const sheetItem2 = showSheet2 ? `<a class="pr-rec-sheet-item" href="#" onclick="event.preventDefault();event.stopPropagation();openGameSheet('${gameKey.replace(/'/g, "\\'")}')" >💬 👍</a>` : '';
        const editItems2 = showEdit2 ? `<button class="pr-rec-edit" data-id="${r.id}" type="button">✏️ 수정</button><button class="pr-rec-del" data-id="${r.id}" type="button">✕ 삭제</button>` : '';
        const moreMenu2 = (showSheet2 || showEdit2) ? `<div class="pr-rec-more"><button class="pr-rec-more-btn" type="button" title="더보기">···</button><div class="pr-rec-more-menu">${sheetItem2}${editItems2}</div></div>` : '';
        return `<div class="pr-rec-row" data-id="${r.id}" data-record='${JSON.stringify({gameId: r.game_id||'', names: r.player_names||'', count: r.player_count||'', time: r.play_time_min||'', score: r.score_note||'', review: r.review_text||'', group: r.group_name||'', date: r.played_at||'', photo: r.photo_url||''})}'>
          <div class="pr-rec-row-top">
            <div class="pr-rec-main">
              <div class="pr-rec-meta">${dateline}</div>
              ${reviewHtml}
            </div>
            ${moreMenu2 ? `<div class="pr-rec-actions">${moreMenu2}</div>` : ''}
          </div>
          ${photoHtml}
        </div>`;
      }).join('');

      html += `</div>`;
      isFirst = false;
    }
    return html;
  }

  // ══════════════════════════════════════════════════════════════
  // SINGLE GAME VIEW (?game=<id> 직접 URL 접근 — deprecated)
  // 기본 동선은 openGameRecordSheet(gameKey) 바텀시트로 대체됨.
  // 직접 URL 공유 / SEO 용도 검토 전까지 삭제 보류.
  // TODO: renderSingleGame 제거 또는 공개 랜딩용 전환 검토
  // ══════════════════════════════════════════════════════════════

  function initGameView() {
    const name = getGameName(GAME_ID);
    document.title = `${name} 플레이 기록 | 코티지보드`;

    const bc = document.getElementById('pageBreadcrumb');
    bc.innerHTML = `<a href="../../index.html">게임</a> <span>›</span> <a href="./game-reviews.html">플레이 기록</a> <span>›</span> ${escH(name)}`;

    headerEl.innerHTML = `<p class="rv-game-title">${escH(name)}</p>`;

    renderSingleGame();
  }

  async function renderSingleGame() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !window.supabase) { root.innerHTML = '<p class="pr-empty">DB 연결 실패</p>'; return; }
    if (!window._cottageSupabaseDb) window._cottageSupabaseDb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const db = window._cottageSupabaseDb;

    // GAME_ID는 game key(string). DB game_id는 numeric BGG ID → 변환 필요
    const numericGameId = window.gameData?.[GAME_ID]?.bgg?.id || GAME_ID;
    const gameKey = getGameKey(GAME_ID) || GAME_ID;

    let records = [];
    try {
      const recData = await db.from('game_play_records')
        .select('id, game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at')
        .eq('game_id', numericGameId)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (recData.error) console.warn('[renderSingleGame]', recData.error);
      records = recData.data || [];
    } catch (e) { console.warn('[renderSingleGame]', e); }

    let comments = [];
    try {
      if (window.CottageDB?.getGameComments) {
        comments = await window.CottageDB.getGameComments(gameKey, 20) || [];
      }
    } catch (e) { console.warn('[renderSingleGame] comments', e); }

    const user = window.getKakaoUser?.();

    const backToSheet = `<button class="rv-back-to-sheet" type="button" onclick="openGameSheet('${gameKey}')">게임 정보 · 코멘트 보기 →</button>`;

    const listHtml = records.length
      ? records.map(r => {
          const isMine = user && String(r.user_id) === String(user.id);
          const playedLabel = r.played_at ? formatKstDate(r.played_at) : formatDate(r.created_at);
          const countTag = r.player_count ? `<span class="pr-rec-tag pr-tag-count-game">${r.player_count}명</span>` : '';
          const timeTag  = r.play_time_min ? `<span class="pr-rec-tag pr-tag-time">⏱ ${r.play_time_min}분</span>` : '';
          const scoreTag = r.score_note ? `<span class="pr-rec-tag pr-tag-score">🏆 ${(s => /\d$/.test(s) ? s.replace(/점$/, '') + '점' : s)(escH(r.score_note).trimEnd())}</span>` : '';
          const groupTag = r.group_name ? `<span class="pr-rec-tag" style="background:#455a64;color:#fff;font-weight:700;">${escH(r.group_name)}</span>` : '';
          const namesTag = r.player_names ? `<span class="pr-rec-tag">${escH(r.player_names)}</span>` : '';
          const photoUrls = parsePhotoUrls(r.photo_url);
          const canDelPhoto = photoUrls.length && (isMine || window.isOwner?.());
          const photoHtml = buildPhotoHtml(photoUrls, r.id, canDelPhoto);
          return `<div class="rv-item" data-id="${r.id}">
            <div class="rv-head">
              <span class="rv-nick">${escH(r.nickname || '익명')}</span>
              <span style="display:flex;align-items:center;gap:6px">
                <span class="rv-date">${playedLabel}</span>
                ${isMine ? `<button class="rv-del" type="button">삭제</button>` : ''}
              </span>
            </div>
            <div class="pr-rec-meta" style="margin-bottom:4px">${groupTag}${countTag}${timeTag}${scoreTag}${namesTag}</div>
            ${photoHtml}
          </div>`;
        }).join('')
      : `<p class="pr-empty">아직 이 게임의 기록이 없어요.<br><small style="color:var(--muted)">바텀시트에서 '+ 기록하기'로 추가할 수 있어요.</small></p>`;

    // 게임평 = game_comments + play records의 review_text 통합, 날짜 내림차순
    const playReviews = records
      .filter(r => r.review_text)
      .map(r => ({
        text: r.review_text,
        nick: r.nickname || '익명',
        date: (r.played_at || r.created_at || '').slice(0, 10).replace(/-/g, '.'),
      }));
    const commentReviews = comments.map(c => ({
      text: c.comment_text,
      nick: c.nickname || '익명',
      date: (c.created_at || '').slice(0, 10).replace(/-/g, '.'),
    }));
    const allReviews = [...commentReviews, ...playReviews].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '')
    );

    const commentsHtml = allReviews.length
      ? allReviews.map(rv => {
          const txt = escH(rv.text || '');
          const nick = escH(rv.nick);
          return `<div class="rv-item">
            <div class="rv-head">
              <strong class="rv-nick">${nick}</strong>
              ${rv.date ? `<span class="rv-date">${rv.date}</span>` : ''}
            </div>
            <p style="margin:4px 0 0;font-size:14px;color:#3a3025;line-height:1.6">${txt}</p>
          </div>`;
        }).join('')
      : `<p class="pr-empty">아직 게임평이 없어요.<br><small style="color:var(--muted)">바텀시트에서 코멘트를 남길 수 있어요.</small></p>`;

    root.innerHTML = `
      ${backToSheet}
      <div class="rv-section-title" style="margin-top:14px">게임평 ${allReviews.length}개</div>
      ${commentsHtml}
      <div class="rv-section-title" style="margin-top:20px">플레이 기록 ${records.length}건</div>
      ${listHtml}`;

    root.querySelectorAll('.rv-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = btn.closest('.rv-item');
        if (!confirm('이 기록을 삭제할까요?')) return;
        const res = await window.CottageDB?.deleteGamePlay(item.dataset.id);
        if (!res?.error) item.remove();
      });
    });

    root.querySelectorAll('.pr-rec-photo').forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = img.closest('.pr-rec-photo-wrap');
        try { openLightbox(JSON.parse(wrap.dataset.urls || '[]'), Number(img.dataset.idx || 0)); } catch(_) {}
      });
    });
    root.querySelectorAll('.pr-rec-photo-more').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = el.closest('.pr-rec-photo-wrap');
        try { openLightbox(JSON.parse(wrap.dataset.urls || '[]'), Number(el.dataset.idx || 3)); } catch(_) {}
      });
    });
  }

})();
