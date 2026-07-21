(function () {

  // GR6: 파일 내부에서만 쓰이는 상태 — window 노출 제거(IIFE 내부화)
  let _prGroups, _prRecents = [], _prMoreOutsideClickBound, _refreshAutocompleteLists;

  // ── helpers ─────────────────────────────────────────────────────

  function getGameName(id) {
    if (!id) return '알 수 없는 게임';
    if (window.COTTAGE_GAMES) {
      const g = window.COTTAGE_GAMES.find(g => String(g.bggId) === String(id) || g.id === id);
      if (g) return g.display || g.titleKo || g.titleEn || id;
    }
    return id;
  }

  function gameIdByName(name) {
    if (!window.COTTAGE_GAMES || !name) return name;
    const found = window.COTTAGE_GAMES.find(g => {
      const label = g.display || g.titleKo || g.titleEn || '';
      return label.trim() === name.trim();
    });
    return found ? (found.bggId || found.id) : name;
  }

  // 미보유 게임(표지 없음) 썸네일 플레이스홀더 — hero.png(= DEFAULT_GAME_IMAGE, 미보유 기록시트 헤더와 동일).
  // rootPath 전역이 script.js→script-nav.js 개명으로 깨져 있어 로컬에서 견고하게 계산.
  const GAME_LOGO_PLACEHOLDER = (() => {
    const el = document.querySelector('script[src*="assets/js/script-nav.js"]');
    const base = el ? el.src.replace(/assets\/js\/script-nav\.js.*$/, '') : '';
    return base + 'assets/images/main/hero.png';
  })();

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

  function formatKstDateWithDay(d) {
    if (!d || d === '?') return d;
    const [y, m, day] = d.split('-');
    const weekday = ['일','월','화','수','목','금','토'][new Date(`${y}-${m}-${day}T00:00:00`).getDay()];
    return `${Number(m)}월 ${Number(day)}일 (${weekday})`;
  }

  // toInitials, hangulMatch, attachAc, initTagInput, buildPhotoItemAdder,
  // parsePhotoUrls, buildPhotoHtml, openLightbox, getGameKeyById → play-records-utils.js 전역 사용

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
    t.classList.remove('has-action');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function _showCuriousPlayedToast(gameName, gameId, userId, onDone) {
    const t = document.getElementById('prToast');
    const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
    let resolved = false;
    const resolve = () => { if (!resolved) { resolved = true; t.classList.remove('show', 'has-action'); onDone?.(); } };

    const showMain = () => {
      t.innerHTML = `<button class="pr-toast-close-btn" type="button">✕</button>🎲 <b>${esc(gameName)}</b> 드디어 해보셨군요!<br><span style="font-size:12px;opacity:.85">궁금해요가 취소됐어요.</span><br><button class="pr-toast-action-btn">좋아하는 게임으로 추가하기</button>`;
      t.classList.add('show', 'has-action');
      t.querySelector('.pr-toast-action-btn')?.addEventListener('click', showConfirm);
      t.querySelector('.pr-toast-close-btn')?.addEventListener('click', resolve);
    };

    const showConfirm = () => {
      t.innerHTML = `<button class="pr-toast-close-btn" type="button">✕</button><span style="font-size:13px"><b>${esc(gameName)}</b>을<br>좋아하는 게임에 추가할까요?</span><br><button class="pr-toast-action-btn">✓ 추가하기</button> <button class="pr-toast-cancel-btn" type="button">취소</button>`;
      t.querySelector('.pr-toast-action-btn')?.addEventListener('click', async () => {
        await window.CottageDB?.toggleGameLike(gameId, userId);
        t.classList.remove('has-action');
        t.textContent = '❤️ 좋아하는 게임에 추가됐어요!';
        setTimeout(resolve, 2000);
      });
      t.querySelector('.pr-toast-cancel-btn')?.addEventListener('click', resolve);
      t.querySelector('.pr-toast-close-btn')?.addEventListener('click', resolve);
    };

    showMain();
  }



  // ── entry point ──────────────────────────────────────────────────

  const headerEl = document.getElementById('reviewPageHeader');
  const root = document.getElementById('reviewRoot');

  // record_start는 '사용자가 기록 입력 화면에 실제로 들어온 시점'에만 쏜다.
  // 홈(index.html)이 이 페이지를 ?tab=input iframe으로 **미리 로드**하므로 초기화 시점에
  // 쏘면 홈을 열기만 해도 발사된다(발견 #25). 발사 지점은 아래 3곳뿐:
  //   ① 비embed 진입 + ?tab=input (게임시트 → 기록하기)
  //   ② 탭 클릭으로 '기록 입력' 전환
  //   ③ 부모가 모달을 input 탭으로 열 때(cottage-switch-tab) — 프리로드로 이미 활성이라
  //      ②의 click이 안 일어나는 경로다
  function trackRecordStart() { window.CottageDB?.trackEvent('record_start'); }

  let tried = false;
  function tryInit() { if (tried) return; tried = true; initHub(); }
  window.addEventListener('kakao-auth-ready', tryInit);
  window.addEventListener('cottage-auth-changed', () => { renderInputPanel(); });
  setTimeout(tryInit, 1200);

  // embedded modal: switch tab on demand from parent
  window.addEventListener('message', e => {
    if (e.data?.type === 'cottage-switch-tab' && e.data.tab && root) {
      const tab = root.querySelector(`.pr-tab[data-tab="${e.data.tab}"]`);
      if (tab && !tab.classList.contains('is-active')) tab.click();
      else if (e.data.tab === 'input') trackRecordStart();  // ③ 이미 활성이라 click이 안 일어남
    } else if (e.data?.type === 'cottage-close-lightbox') {
      document.querySelectorAll('.pr-lightbox').forEach(el => el.remove());
    }
  });

  // ══════════════════════════════════════════════════════════════
  // HUB MODE (메인 플레이 기록 허브)
  // ══════════════════════════════════════════════════════════════

  function initHub() {
    document.title = '플레이 기록 | 코티지보드';

    const params = new URLSearchParams(location.search);
    const embedded = params.get('embed') === 'true';
    if (embedded) document.body.classList.add('is-embedded');
    const startInput = params.get('tab') === 'input';
    // ① embed는 홈의 프리로드(사용자가 연 적 없음)라 제외 — 열릴 땐 ③으로 잡힌다
    if (startInput && !embedded) trackRecordStart();

    root.innerHTML = `
      <div class="pr-tabs">
        <button class="pr-tab${startInput ? '' : ' is-active'}" data-tab="records">기록 보기</button>
        <button class="pr-tab${startInput ? ' is-active' : ''}" data-tab="input">기록 입력</button>
      </div>
      <div id="prPanelInput" class="pr-panel${startInput ? ' is-active' : ''}"></div>
      <div id="prPanelRecords" class="pr-panel${startInput ? '' : ' is-active'}"></div>`;

    root.querySelectorAll('.pr-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.pr-tab').forEach(t => t.classList.remove('is-active'));
        root.querySelectorAll('.pr-panel').forEach(p => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        document.getElementById('prPanel' + cap(tab.dataset.tab)).classList.add('is-active');
        if (tab.dataset.tab === 'records') loadRecords();
        if (tab.dataset.tab === 'input') trackRecordStart();  // ②
      });
    });

    renderInputPanel();
    loadRecords();

    // embedded modal: notify parent that tabs are rendered (hides loading state)
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'cottage-hub-ready' }, '*');
    }
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── 기록 입력 탭 ─────────────────────────────────────────────

  // rowIdx는 호출자(renderInputPanel)가 증가시켜 넘긴다. 1번 행에만 '최신 기록' 버튼이
  // 붙으므로, 행을 비우고 다시 시작할 때는 호출자가 카운터도 되돌려야 한다(resetRows).
  function _buildGameRow(rowIdx, focusInput) {
    const div = document.createElement('div');
    div.className = 'pr-game-row';
    div.dataset.row = rowIdx;
    div.innerHTML = `
      <div class="pr-row-head">
        <div class="pr-autocomplete-wrap">
          <input type="text" class="pr-game-name" placeholder="게임명 검색" autocomplete="off">
          <div class="pr-autocomplete-list"></div>
        </div>
        <button class="pr-rm-btn" type="button" title="삭제">✕</button>
      </div>
      ${rowIdx === 1
        ? `<div class="pr-last-record-wrap"><button class="pr-same-as-above-btn pr-last-record-btn" type="button">↑ 최신 기록 (인원·참여자)</button><div class="pr-last-record-menu" hidden></div></div>`
        : `<button class="pr-same-as-above-btn" type="button">↑ 위와 동일 (인원·참여자)</button>`}
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
      <label class="pr-field-label">게임평 (선택)</label>
      <textarea class="pr-review-ta pr-review" placeholder="평가를 남겨주시면 다른 플레이어에게 도움이 돼요." rows="2"></textarea>`;

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

    initTagInput(div.querySelector('.pr-names-wrap'), div.querySelector('.pr-names'), undefined, name => {
      if (window._prPlayerNames && !window._prPlayerNames.includes(name)) {
        window._prPlayerNames.push(name);
      }
    });

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
      const fillCountAndNames = (count, namesStr) => {
        div.querySelectorAll('.pr-count-btn').forEach(b => b.classList.remove('is-on'));
        if (count) div.querySelector(`.pr-count-btn[data-n="${count}"]`)?.classList.add('is-on');
        const chipsWrap = div.querySelector('.tag-chips');
        const textInput = div.querySelector('.tag-text-input');
        const hiddenInput = div.querySelector('.pr-names');
        chipsWrap.querySelectorAll('.tag-chip').forEach(c => c.remove());
        hiddenInput.value = '';
        (namesStr || '').split(',').forEach(name => {
          name = name.trim(); if (!name) return;
          textInput.value = name;
          textInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        });
        div.querySelector('.pr-names-wrap .pr-autocomplete-list')?.classList.remove('is-open');
      };

      if (sameBtn.classList.contains('pr-last-record-btn')) {
        // 행 1: 내 최근 세팅을 드롭다운으로 직접 선택 — 순회(오버슈트) 대신 목록에서 고른다.
        const menu = div.querySelector('.pr-last-record-menu');
        const closeMenu = () => {
          if (menu) menu.hidden = true;
          document.removeEventListener('click', onDocClick);
          document.removeEventListener('keydown', onEsc);
        };
        const onDocClick = e => { if (!e.target.closest('.pr-last-record-wrap')) closeMenu(); };
        const onEsc = e => { if (e.key === 'Escape') closeMenu(); };
        sameBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (!menu) return;
          if (!menu.hidden) { closeMenu(); return; }
          if (!_prRecents.length) return;
          menu.innerHTML = _prRecents.map((rec, i) =>
            `<button class="pr-last-record-item" type="button" data-i="${i}">${escH(rec.group || '그룹없음')} · ${rec.count || '?'}명${rec.names ? ' · ' + escH(rec.names) : ''}</button>`
          ).join('');
          menu.querySelectorAll('.pr-last-record-item').forEach(item => {
            item.addEventListener('click', ev => {
              ev.stopPropagation();
              const rec = _prRecents[Number(item.dataset.i)];
              const grpInput = document.getElementById('prGroup');
              if (grpInput) grpInput.value = rec.group || '';
              fillCountAndNames(rec.count, rec.names);
              closeMenu();
            });
          });
          menu.hidden = false;
          // 이번 클릭이 바깥클릭으로 즉시 닫는 것 방지 — 다음 틱에 바인딩
          setTimeout(() => {
            document.addEventListener('click', onDocClick);
            document.addEventListener('keydown', onEsc);
          }, 0);
        });
      } else {
        sameBtn.addEventListener('click', () => {
          // 행 2+: 바로 위 행에서 복사
          const allRows = [...document.querySelectorAll('#prGameRows .pr-game-row')];
          const curIdx = allRows.indexOf(div);
          if (curIdx <= 0) return;
          const aboveRow = allRows[curIdx - 1];
          const activeCountBtn = aboveRow.querySelector('.pr-count-btn.is-on');
          fillCountAndNames(activeCountBtn?.dataset.n, aboveRow.querySelector('.pr-names').value);
        });
      }
    }

    div.querySelector('.pr-rm-btn').addEventListener('click', () => { window.revokePhotoGridBlobs?.(div); div.remove(); });
    document.getElementById('prGameRows').appendChild(div);
    if (focusInput) div.querySelector('.pr-game-name').focus();
  }

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
    _prGroups = groups;
    window._prPlayerNames = await window.CottageDB?.getPlayerNames() || [];
    const voucherHistory = await window.CottageDB?.getVoucherHistory?.(String(user.id), 1000) || [];
    const hasFirstPlayVoucher = voucherHistory.some((item) => item.reason === 'first_play' && Number(item.delta) > 0);

    async function refreshAutocompleteLists() {
      const fresh = await window.CottageDB?.getGroupNames() || [];
      if (!fresh.includes('코티지보드 동호회')) fresh.unshift('코티지보드 동호회');
      _prGroups = fresh;
      window._prPlayerNames = await window.CottageDB?.getPlayerNames() || [];
      _refreshAutocompleteLists = refreshAutocompleteLists;
    }
    _refreshAutocompleteLists = refreshAutocompleteLists;

    panel.innerHTML = `
      ${hasFirstPlayVoucher ? '' : '<p class="pr-reward-note">🎁 첫 플레이 기록 작성 시 음료 교환권 1장 지급!</p>'}
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
    const addRow = focusInput => _buildGameRow(++rowIdx, focusInput);
    // 저장 후엔 행을 1번부터 다시 시작 — 안 그러면 새 첫 행이 2번째 이상으로 취급돼
    // '최신 기록' 대신 '위와 동일'(위에 행이 없어 눌러도 무동작)이 붙는다.
    const resetRows = () => { rowIdx = 0; addRow(false); };

    // 그룹명 자동완성
    attachAc(document.getElementById('prGroup'), () => _prGroups || [], null, document.getElementById('prGroupAcList'));

    addRow(false);

    document.getElementById('prAddBtn').addEventListener('click', () => addRow(false));

    document.getElementById('prSaveBtn').addEventListener('click', () => _submitInputRows(user, resetRows));
  }

  // 그룹명 목록은 _prGroups로 참조 — renderInputPanel의 지역 groups와 같은 배열 객체다.
  // _refreshAutocompleteLists()가 _prGroups를 새 배열로 갈아끼우지만 호출~push 사이에
  // await가 없어, push는 항상 갈아끼우기 전 배열에 닿는다(기존 동작과 동일).
  async function _submitInputRows(user, resetRows) {
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
        label: name,
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
      showToast('저장됐어요!'); _refreshAutocompleteLists?.();
      window.CottageDB?.trackEvent('record_complete');
      window.revokePhotoGridBlobs?.(document.getElementById('prGameRows'));
      document.getElementById('prGameRows').innerHTML = '';
      resetRows();
      if (groupVal && !_prGroups.includes(groupVal)) _prGroups.push(groupVal);
      recordsLoaded = false;
      const recTab = root.querySelector('[data-tab="records"]');
      if (recTab) recTab.click();

      if (user) {
        const userId = String(user.id);
        const curiousHits = [];
        for (const e of entries) {
          if (!e.id) continue;
          const _gid = String(e.id);
          const isCurious = await window.CottageDB.hasUserCurious(_gid, userId);
          if (isCurious) {
            await window.CottageDB.toggleGameCurious(_gid, userId);
            curiousHits.push({ label: e.label, id: _gid });
          }
        }
        if (curiousHits.length) {
          let idx = 0;
          const showNext = () => {
            if (idx >= curiousHits.length) return;
            const g = curiousHits[idx++];
            _showCuriousPlayedToast(g.label, g.id, userId, showNext);
          };
          setTimeout(showNext, 2400);
        }
      }
    } else {
      alert('일부 저장에 실패했어요. 다시 시도해주세요.');
    }
  }

    // ── 기록 보기 탭 ─────────────────────────────────────────────

  let recordsLoaded = false;
  let recordsData = null;
  let currentView = 'date';
  // 회원 전체의 현재 닉네임 → userId. loadRecords에서 1회 채운다(renderRecords는 7곳에서 불리는
  // 동기 재렌더라 그 안에서 조회하면 안 됨). 참여자 태그 클릭 진입점이 이 맵을 쓴다.
  let _profileNickMap = new Map();

  async function loadRecords() {
    if (recordsLoaded && recordsData !== null) {
      renderRecords(recordsData);
      return;
    }
    recordsLoaded = true;
    const panel = document.getElementById('prPanelRecords');
    panel.innerHTML = '<p class="pr-empty">불러오는 중...</p>';

    try {
      const [_recs, _profiles] = await Promise.all([
        window.CottageDB.getAllPlayRecordsForHub(),
        window.CottageDB?.getAllProfiles?.() || Promise.resolve([]),
      ]);
      recordsData = _recs;
      _profileNickMap = new Map();
      for (const p of _profiles) {
        if (p.user_id && p.nickname) _profileNickMap.set(String(p.nickname).trim().toLowerCase(), String(p.user_id));
      }
      const _uid = String(window.getKakaoUser?.()?.id || '');
      const _myNick = window.getKakaoUser?.()?.nickname?.toLowerCase() || '';
      const _mySorted = _uid ? (recordsData || [])
        .filter(r =>
          String(r.user_id) === _uid ||
          (_myNick && (r.player_names || '').split(',').some(n => n.trim().toLowerCase() === _myNick))
        )
        // 정렬 기준은 CottageDB.playRecordSortDate 하나만 쓴다 — played_at NULL 폴백을
        // 여기서 다시 구현하면 홈과 허브가 서로 다른 「최신」을 내놓는다(js-api.md 참조).
        .sort((a, b) => {
          const sd = window.CottageDB.playRecordSortDate;
          const diff = sd(b).localeCompare(sd(a));
          return diff !== 0 ? diff : String(b.created_at || '').localeCompare(String(a.created_at || ''));
        }) : [];
      // '최신 기록' 토글용: 서로 다른 세팅(그룹·인원·참여자)만 최신순으로 모음.
      // 같은 모임의 여러 게임 기록은 세팅이 같아 중복이므로 시그니처로 dedup(무의미한 순회 방지).
      const _seenSetup = new Set();
      _prRecents = [];
      for (const r of _mySorted) {
        const sig = `${r.group_name || ''}|${r.player_count || ''}|${(r.player_names || '').trim()}`;
        if (_seenSetup.has(sig)) continue;
        _seenSetup.add(sig);
        _prRecents.push({ count: r.player_count, names: r.player_names, group: r.group_name });
      }
      renderRecords(recordsData);
    } catch (err) {
      console.error(err);
      document.getElementById('prPanelRecords').innerHTML = '<p class="pr-empty">불러오기 실패</p>';
    }
  }

  // 게임(기록)시트 ⋯메뉴(사진/게임평/세션참여)로 기록이 바뀌면 game-sheet.js가 이 훅을 호출 →
  // 게시판 캐시 무효화 후, 기록 탭이 열려있으면 즉시 리로드(닫혀있으면 다음에 열 때 새로 로드).
  window.refreshPlayRecordsBoard = () => {
    recordsLoaded = false;
    recordsData = null;
    if (document.getElementById('prPanelRecords')?.classList.contains('is-active')) loadRecords();
  };

  function _saveViewState(panel) {
    const _openSess = new Set(
      [...panel.querySelectorAll('.pr-session.is-open')]
        .map(el => el.querySelector('.pr-session-date')?.textContent?.trim()).filter(Boolean)
    );
    const _openSub = new Set(
      [...panel.querySelectorAll('.pr-sub-session.is-open')]
        .map(el => el.dataset.date).filter(Boolean)
    );
    const _openMonth = new Set(
      [...panel.querySelectorAll('.pr-month-session.is-open')]
        .map(el => el.querySelector('.pr-month-label')?.textContent?.trim()).filter(Boolean)
    );
    return { _openSess, _openSub, _openMonth, _sy: window.scrollY };
  }

  function _restoreViewState(panel, _openSess, _openSub, _sy, _openMonth) {
    panel.querySelectorAll('.pr-session').forEach(el => {
      if (_openSess.has(el.querySelector('.pr-session-date')?.textContent?.trim())) el.classList.add('is-open');
    });
    panel.querySelectorAll('.pr-sub-session').forEach(el => {
      if (_openSub.has(el.dataset.date)) el.classList.add('is-open');
    });
    if (_openMonth) {
      panel.querySelectorAll('.pr-month-session').forEach(el => {
        if (_openMonth.has(el.querySelector('.pr-month-label')?.textContent?.trim())) el.classList.add('is-open');
      });
    }
    setTimeout(() => window.scrollTo(0, _sy), 0);
  }

  let _nickUserMap = new Map();

  // 기록 사진 라이트박스 — 공용 openRecordLightbox(play-records-utils)에 캡션 생성기와
  // 삭제 후 갱신만 주입. 라이트박스 구성·삭제 DB 반영은 공용 쪽이 담당.
  function _openRecordLightbox(wrap, row, startIdx, panel) {
    window.openRecordLightbox?.(wrap, row, startIdx, {
      buildCaption: _recCaption,
      onAfterDelete: (recId, newUrl) => {
        const idx = recordsData?.findIndex(r => String(r.id) === String(recId));
        if (idx != null && idx !== -1) recordsData[idx].photo_url = newUrl;
        const { _openSess, _openSub, _openMonth, _sy } = _saveViewState(panel);
        renderRecords(recordsData);
        _restoreViewState(panel, _openSess, _openSub, _sy, _openMonth);
      },
    });
  }

  // 라이트박스 캡션 — rec만 받는 순수 함수
  function _recCaption(rec) {
    const esc = s => window.escH(s);   // GS5: 정본 위임 (supabase-client.js)
    const lines = [];
    if (rec.nick) lines.push(esc(rec.nick));
    const dateStr = rec.date ? rec.date.slice(2, 10).replace(/-/g, '.') : '';
    const line1 = [rec.group, dateStr].filter(Boolean).join(' · ');
    if (line1) lines.push(esc(line1));
    const line2 = [rec.count ? rec.count + '명' : '', rec.names, rec.time ? rec.time + '분' : ''].filter(Boolean).join(' · ');
    if (line2) lines.push(esc(line2));
    if (rec.score) lines.push(esc(rec.score));
    return lines.join('<br>');
  }

  // 기록 행의 ✏️ 수정 → 인라인 폼 생성·바인딩. panel/user는 renderRecords의 지역이라 파라미터로 받는다.
  function _openInlineEditForm(btn, panel, user) {
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
      <label for="pie-review-${btn.dataset.id}" style="font-size:11px;color:var(--muted)">게임평 (선택)</label>
      <textarea id="pie-review-${btn.dataset.id}" name="pie-review" class="pie-review" placeholder="평가를 남겨주시면 다른 플레이어에게 도움이 돼요.">${escH(rec.review||'')}</textarea>
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
    attachAc(form.querySelector('.pie-group'), () => _prGroups || []);

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

    form.querySelector('.pr-inline-cancel').addEventListener('click', () => { window.revokePhotoGridBlobs?.(form); form.remove(); row.classList.remove('is-editing'); });
    form.querySelector('.pr-inline-cancel-top').addEventListener('click', () => { window.revokePhotoGridBlobs?.(form); form.remove(); row.classList.remove('is-editing'); });
    form.querySelector('.pr-inline-save').addEventListener('click', async () => {
      const saveBtn = form.querySelector('.pr-inline-save');
      saveBtn.disabled = true;
      // 게임명 → game_id (gameKey 우선)
      const gameDisplayInput = form.querySelector('.pie-game').value.trim();
      let newGameId = null;
      if (gameDisplayInput) {
        const found = (window.COTTAGE_GAMES || []).find(g => g.display === gameDisplayInput);
        newGameId = found ? (found.bggId || found.id) : gameDisplayInput;
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
        const { _openSess, _openSub, _openMonth, _sy } = _saveViewState(panel);
        renderRecords(recordsData); _refreshAutocompleteLists?.();
        _restoreViewState(panel, _openSess, _openSub, _sy, _openMonth);
      } else {
        saveBtn.disabled = false;
        alert('수정에 실패했습니다.');
      }
    });
  }

  function renderRecords(data) {
    const panel = document.getElementById('prPanelRecords');
    const user = window.getKakaoUser?.();

    // 닉네임 → userId 맵: 회원 전체(현재 닉네임)를 깔고, 기록의 recorder 정보(당시 닉네임)로 보강.
    // 종전엔 recorder만 썼는데, 그러면 "기록을 한 번도 등록한 적 없는 회원"이 맵에 없어 참여자로
    // 태그만 된 이름이 조용히 클릭 불가였다(커서도 안 바뀜). 반대로 profiles만 쓰면 닉네임을 바꾼
    // 회원의 옛 이름(player_names에 텍스트로 박혀 있음)이 안 잡히므로 둘 다 필요하다.
    _nickUserMap = new Map(_profileNickMap);
    if (data?.length) {
      for (const r of data) {
        if (r.user_id && r.nickname) _nickUserMap.set(r.nickname.trim().toLowerCase(), String(r.user_id));
      }
    }

    const toggleHtml = `<div class="pr-view-toggle">
      <button class="pr-vt-btn ${currentView === 'date' ? 'is-active' : ''}" data-view="date">날짜별</button>
      <button class="pr-vt-btn ${currentView === 'group' ? 'is-active' : ''}" data-view="group">모임별</button>
      <button class="pr-vt-btn ${currentView === 'game' ? 'is-active' : ''}" data-view="game">게임별</button>
    </div>`;

    if (!data?.length) {
      panel.innerHTML = toggleHtml + '<p class="pr-empty">아직 기록이 없어요.</p>';
      bindToggle(panel);
      return;
    }

    const contentHtml = currentView === 'date'
      ? renderDateView(data, user)
      : currentView === 'group'
        ? renderGroupView(data, user)
        : renderGameView(data, user);

    panel.innerHTML = toggleHtml + contentHtml;
    bindToggle(panel);

    panel.querySelectorAll('.pr-session-hd').forEach(hd => {
      hd.addEventListener('click', () => hd.closest('.pr-session').classList.toggle('is-open'));
    });
    panel.querySelectorAll('.pr-month-hd').forEach(hd => {
      hd.addEventListener('click', () => hd.closest('.pr-month-session').classList.toggle('is-open'));
    });
    panel.querySelectorAll('.pr-sub-hd').forEach(hd => {
      hd.addEventListener('click', () => hd.closest('.pr-sub-session').classList.toggle('is-open'));
    });

    // 참여자 이름 클릭 → 해당 회원 읽기전용 보드 열기
    panel.querySelectorAll('.pr-tag-who[data-nick]').forEach(span => {
      const userId = _nickUserMap.get((span.dataset.nick || '').toLowerCase());
      if (!userId) return;
      span.style.cursor = 'pointer';
      span.addEventListener('click', e => {
        e.stopPropagation();
        window.openOtherProfileSheet?.(userId);
      });
    });
    // 후기 작성자 이름 클릭 → 해당 회원 읽기전용 보드 열기
    panel.querySelectorAll('.pr-rec-reviewer[data-user-id]').forEach(span => {
      span.style.cursor = 'pointer';
      span.addEventListener('click', e => {
        e.stopPropagation();
        window.openOtherProfileSheet?.(span.dataset.userId);
      });
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
        document.querySelectorAll('.pr-rec-more.is-open').forEach(m => {
          m.classList.remove('is-open');
          const mm = m.querySelector('.pr-rec-more-menu');
          if (mm) mm.removeAttribute('style');
        });
        if (!isOpen) {
          more.classList.add('is-open');
          // 좋아요/궁금해요 상태 lazy load
          const _gkForState = more.querySelector('[data-game-id]')?.dataset.gameId;
          if (_gkForState && window.CottageDB) {
            const _cu = window.getKakaoUser?.();
            if (_cu?.id) {
              Promise.all([
                window.CottageDB.hasUserLiked(_gkForState, String(_cu.id)),
                window.CottageDB.hasUserCurious(_gkForState, String(_cu.id)),
              ]).then(([liked, curious]) => {
                more.querySelectorAll('.pr-rec-like-action').forEach(b => { b.textContent = liked ? '👍 좋아요 취소' : '👍 좋아요'; });
                more.querySelectorAll('.pr-rec-curious-action').forEach(b => { b.textContent = curious ? '🤔 궁금해요 취소' : '🤔 궁금해요'; });
              });
            }
          }
          const rect = btn.getBoundingClientRect();
          const menu = more.querySelector('.pr-rec-more-menu');
          if (menu) {
            menu.style.display = '';
            menu.style.position = 'fixed';
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.right = (window.innerWidth - rect.right) + 'px';
            menu.style.left = 'auto';
            menu.style.zIndex = '9400';
          }
        }
      });
    });
    if (!_prMoreOutsideClickBound) {
      _prMoreOutsideClickBound = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.pr-rec-more.is-open').forEach(m => {
          m.classList.remove('is-open');
          const mm = m.querySelector('.pr-rec-more-menu');
          if (mm) mm.removeAttribute('style');
        });
      });
    }

    panel.querySelectorAll('.pr-rec-del').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('이 기록을 삭제할까요?')) return;
        const res = await window.CottageDB?.deleteGamePlay(btn.dataset.id);
        if (!res?.error) {
          recordsData = recordsData.filter(r => String(r.id) !== String(btn.dataset.id));
          const { _openSess, _openSub, _openMonth, _sy } = _saveViewState(panel);
          renderRecords(recordsData);
          _restoreViewState(panel, _openSess, _openSub, _sy, _openMonth);
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
          const { _openSess, _openSub, _openMonth, _sy } = _saveViewState(panel);
          renderRecords(recordsData);
          _restoreViewState(panel, _openSess, _openSub, _sy, _openMonth);
        }
      });
    });

    panel.querySelectorAll('.pr-rec-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        _openInlineEditForm(btn, panel, user);
      });
    });

    // 기록 사진 라이트박스
    panel.querySelectorAll('.pr-rec-photo').forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = img.closest('.pr-rec-photo-wrap');
        const row = img.closest('.pr-rec-row');
        try { _openRecordLightbox(wrap, row, Number(img.dataset.idx || 0), panel); } catch(_) {}
      });
    });
    panel.querySelectorAll('.pr-rec-photo-more').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const wrap = el.closest('.pr-rec-photo-wrap');
        wrap.querySelectorAll('.sheet-photo-hidden').forEach(item => item.classList.remove('sheet-photo-hidden'));
        el.remove();
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
    // 전체 기록 기준 game_id별 날짜순 누적 플레이 순서 계산
    const _orderMap = new Map();
    {
      const _cnt = {};
      [...data]
        .sort((a, b) => {
          const da = a.played_at || (a.created_at || '').slice(0, 10);
          const db = b.played_at || (b.created_at || '').slice(0, 10);
          return da < db ? -1 : da > db ? 1 : 0;
        })
        .forEach(r => {
          if (!r.game_id) return;
          _cnt[r.game_id] = (_cnt[r.game_id] || 0) + 1;
          _orderMap.set(r.id, _cnt[r.game_id]);
        });
    }
    // group_name → ym → date → records[]
    const groups = new Map();
    for (const r of data) {
      const g = r.group_name || '';
      const d = r.played_at || r.created_at?.slice(0, 10) || '?';
      const ym = d.length >= 7 ? d.slice(0, 7) : '?';
      if (!groups.has(g)) groups.set(g, new Map());
      const ymMap = groups.get(g);
      if (!ymMap.has(ym)) ymMap.set(ym, new Map());
      const dateMap = ymMap.get(ym);
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d).push(r);
    }

    let html = '';
    const sortedGroups = [...groups.entries()].sort((a, b) => {
      const latestA = Math.max(...[...a[1].values()].flatMap(dm => [...dm.keys()]).map(d => new Date(d).getTime() || 0));
      const latestB = Math.max(...[...b[1].values()].flatMap(dm => [...dm.keys()]).map(d => new Date(d).getTime() || 0));
      return latestB - latestA;
    });

    for (const [groupName, ymMap] of sortedGroups) {
      const label = groupName || '모임 미선택';
      const totalGames = [...ymMap.values()].reduce((s, dm) => s + [...dm.values()].reduce((s2, recs) => s2 + recs.length, 0), 0);
      const totalDates = [...ymMap.values()].reduce((s, dm) => s + dm.size, 0);

      html += `<div class="pr-session">
        <button class="pr-session-hd" type="button">
          <span class="pr-session-date">${escH(label)}</span>
          <span class="pr-session-summary">${totalDates}회 · ${totalGames}게임</span>
          <span class="pr-session-arrow">▾</span>
        </button>
        <div class="pr-session-body">`;

      const sortedYms = [...ymMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      const latestYm = sortedYms[0]?.[0];

      for (const [ym, dateMap] of sortedYms) {
        const [y, m] = ym === '?' ? ['', ''] : ym.split('-');
        const ymLabel = ym === '?' ? '날짜 미지정' : `${y}년 ${Number(m)}월`;
        const ymTotalGames = [...dateMap.values()].reduce((s, recs) => s + recs.length, 0);
        const isLatestYm = ym === latestYm;

        html += `<div class="pr-month-session">
          <button class="pr-month-hd" type="button">
            <span class="pr-month-label">${escH(ymLabel)}</span>
            <span class="pr-month-summary">${dateMap.size}회 · ${ymTotalGames}게임</span>
            <span class="pr-month-arrow">▾</span>
          </button>
          <div class="pr-month-body">`;

        const MAX_DATES = 3;
        const sortedDates = [...dateMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
        const visibleDates = sortedDates.slice(0, MAX_DATES);
        const hiddenDates = sortedDates.slice(MAX_DATES);

        const renderDateBlock = ([dateStr, recs]) => {
          return `<div class="pr-sub-session" data-date="${dateStr}">
            <button class="pr-sub-hd" type="button">
              <span class="pr-sub-date">${escH(formatKstDate(dateStr))}</span>
              <span class="pr-sub-summary">${recs.length}게임</span>
              <span class="pr-sub-arrow">▾</span>
            </button>
            <div class="pr-sub-body">${buildSessionBody(recs, user, _orderMap)}</div>
          </div>`;
        };

        html += visibleDates.map(renderDateBlock).join('');

        if (hiddenDates.length > 0) {
          html += `<div class="pr-dates-more">
            <div class="pr-dates-more-body">${hiddenDates.map(renderDateBlock).join('')}</div>
            <button class="pr-dates-more-btn" type="button">이전 ${hiddenDates.length}회 더 보기 ▾</button>
          </div>`;
        }

        html += `</div></div>`;
      }

      if (groupName === '코티지보드 동호회') {
        html += `<div class="pr-club-link-row"><a class="pr-club-link" href="../club/club-history.html">📸 동호회 기록 &amp; 사진 게시판에서 보러가기 →</a></div>`;
      }

      html += `</div></div>`;
    }
    return html;
  }

  function renderDateView(data, user) {
    // 전체 기록 기준 game_id별 날짜순 누적 플레이 순서 계산
    const _orderMap = new Map();
    {
      const _cnt = {};
      [...data]
        .sort((a, b) => {
          const da = a.played_at || (a.created_at || '').slice(0, 10);
          const db = b.played_at || (b.created_at || '').slice(0, 10);
          return da < db ? -1 : da > db ? 1 : 0;
        })
        .forEach(r => {
          if (!r.game_id) return;
          _cnt[r.game_id] = (_cnt[r.game_id] || 0) + 1;
          _orderMap.set(r.id, _cnt[r.game_id]);
        });
    }

    // year/month → date → group_name → records[]
    const months = new Map();
    for (const r of data) {
      const d = r.played_at || r.created_at?.slice(0, 10) || '?';
      const ym = d.length >= 7 ? d.slice(0, 7) : '?';
      const g = r.group_name || '';
      if (!months.has(ym)) months.set(ym, new Map());
      const dateMap = months.get(ym);
      if (!dateMap.has(d)) dateMap.set(d, new Map());
      const groupMap = dateMap.get(d);
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g).push(r);
    }

    const sortedMonths = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    const latestYm = sortedMonths[0]?.[0];

    let html = '';
    for (const [ym, dateMap] of sortedMonths) {
      const [y, m] = ym === '?' ? ['', ''] : ym.split('-');
      const monthLabel = ym === '?' ? '날짜 미지정' : `${y}년 ${Number(m)}월`;
      const totalGames = [...dateMap.values()].reduce((s, gm) => s + [...gm.values()].reduce((s2, recs) => s2 + recs.length, 0), 0);
      const isLatestMonth = ym === latestYm;

      html += `<div class="pr-session pr-session--bydate">
        <button class="pr-session-hd" type="button">
          <span class="pr-session-date">${monthLabel}</span>
          <span class="pr-session-summary">${dateMap.size}일 · ${totalGames}게임</span>
          <span class="pr-session-arrow">▾</span>
        </button>
        <div class="pr-session-body">`;

      const sortedDates = [...dateMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      const latestDate = sortedDates[0]?.[0];

      for (const [dateStr, groupMap] of sortedDates) {
        const isLatestDate = dateStr === latestDate && isLatestMonth;
        const totalDateGames = [...groupMap.values()].reduce((s, recs) => s + recs.length, 0);
        const dateLabel = formatKstDateWithDay(dateStr);

        html += `<div class="pr-sub-session" data-date="${dateStr}">
          <button class="pr-sub-hd" type="button">
            <span class="pr-sub-date">${escH(dateLabel)}</span>
            <span class="pr-sub-summary">${totalDateGames}게임</span>
            <span class="pr-sub-arrow">▾</span>
          </button>
          <div class="pr-sub-body">`;

        const sortedGroupEntries = [...groupMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));

        for (const [groupName, recs] of sortedGroupEntries) {
          html += `<div class="pr-date-group-label">${escH(groupName || '모임 미선택')}</div>`;
          html += buildSessionBody(recs, user, _orderMap);
        }

        html += `</div></div>`;
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

    // played_at NULL 기록이 Postgres NULLS FIRST로 앞에 오는 문제 → 렌더 단에서 정렬
    const latestOf = recs => Math.max(...recs.map(r => new Date(r.played_at || r.created_at).getTime()));
    const sortedGames = [...games.entries()].sort(([, a], [, b]) => latestOf(b) - latestOf(a));

    let html = '';
    for (const [gameId, recs] of sortedGames) {
      const gameName = getGameName(gameId);
      const gKey = getGameKeyById(gameId) || gameId;
      const thumbUrl = window.gameData?.[gKey]?.images?.thumbnail || '';
      const safeKey = gKey ? gKey.replace(/'/g, "\\'") : '';
      html += `<div class="pr-game-card" role="button" tabindex="0"
        onclick="openGameRecordSheet('${safeKey}')"
        onkeydown="if(event.key==='Enter')openGameRecordSheet('${safeKey}')"
      >
        ${thumbUrl
          ? `<img class="pr-game-thumb" src="${escH(thumbUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : `<img class="pr-game-thumb pr-game-thumb--placeholder" src="${GAME_LOGO_PLACEHOLDER}" alt="미보유 게임" loading="lazy">`}
        <div class="pr-game-card-info">
          <span class="pr-game-card-name">${escH(gameName)}</span>
          <span class="pr-game-card-meta">🎲 ${recs.length}회 플레이</span>
        </div>
        <span class="pr-game-card-arrow">›</span>
      </div>`;
    }
    return html;
  }

  function buildSessionBody(recs, user, orderMap = new Map()) {
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
      const recorderNicks = new Set(groupRecs.map(r => (r.nickname || '').toLowerCase()).filter(Boolean));
      const nameTags = first.player_names
        ? first.player_names.split(',').map(n => {
            const t = n.trim();
            return `<span class="pr-rec-tag pr-tag-who${recorderNicks.has(t.toLowerCase()) ? ' pr-tag-who-first' : ''}" data-nick="${escH(t)}">${escH(t)}</span>`;
          }).join('')
        : '';

      if (countTag || nameTags) {
        html += `<div class="pr-player-header">${countTag}${nameTags}</div>`;
      }

      html += groupRecs.map(r => {
        const isMine = user && (
          (r.user_id && String(r.user_id) === String(user.id)) ||
          (!r.user_id && r.nickname && r.nickname === (user.nickname || user.kakaoNickname))
        );
        const reviewHtml = r.review_text ? `<p class="pr-rec-review">${r.nickname ? `<span class="pr-rec-reviewer"${r.user_id ? ` data-user-id="${r.user_id}"` : ''}>${escH(r.nickname)}</span> ` : ''}${escH(r.review_text)}</p>` : '';
        const photoUrls = parsePhotoUrls(r.photo_url);
        const canDelPhoto = photoUrls.length && (isMine || window.isOwner?.());
        const photoHtml = buildPhotoHtml(photoUrls, r.id, canDelPhoto);
        const gameKey = getGameKeyById(r.game_id) || r.game_id;
        const realThumb = getGameKeyById(r.game_id) ? (window.gameData?.[gameKey]?.images?.thumbnail || '') : '';
        const _thumbKey = gameKey ? String(gameKey).replace(/'/g,"\\'") : '';
        const _thumbClick = _thumbKey ? `onclick="event.stopPropagation();openGameRecordSheet('${_thumbKey}')"` : '';
        const thumbHtml = realThumb
          ? `<img class="pr-rec-thumb${gameKey ? ' pr-rec-thumb--link' : ''}" src="${escH(realThumb)}" alt="" loading="lazy" onerror="this.style.display='none'" ${_thumbClick}>`
          : (_thumbKey ? `<img class="pr-rec-thumb pr-rec-thumb--placeholder pr-rec-thumb--link" src="${GAME_LOGO_PLACEHOLDER}" alt="미보유 게임" loading="lazy" ${_thumbClick}>` : '');
        const dlParts = [r.play_time_min ? `${r.play_time_min}분` : '', r.score_note ? (s => /\d$/.test(s) ? s.replace(/점$/, '') + '점' : s)(escH(r.score_note).trimEnd()).replace(/\s*\/\s*/g,' | ') : ''].filter(Boolean);
        const dateline = dlParts.length ? `<span class="pr-rec-dateline">${dlParts.join(' · ')}</span>` : '';
        const showEdit = isMine || window.isOwner?.();
        const editItems = showEdit ? `<button class="pr-rec-edit" data-id="${r.id}" type="button">✏️ 수정</button><button class="pr-rec-del" data-id="${r.id}" type="button">✕ 삭제</button>` : '';
        const _safeGKey = gameKey ? String(gameKey).replace(/'/g,"\\'") : '';
        const likeItems = _safeGKey ? `<button class="pr-rec-add-action pr-rec-like-action" data-game-id="${_safeGKey}" onclick="onPrMenuLike(this)" type="button">👍 좋아요</button><button class="pr-rec-add-action pr-rec-curious-action" data-game-id="${_safeGKey}" onclick="onPrMenuCurious(this)" type="button">🤔 궁금해요</button>` : '';
        const addItems = _safeGKey ? `<button class="pr-rec-add-action" data-game-id="${_safeGKey}" data-record-id="${r.id}" onclick="onOpenCommentInput(this)" type="button">💬 게임평 추가</button><button class="pr-rec-add-action" data-game-id="${_safeGKey}" data-record-id="${r.id}" onclick="onOpenPhotoInput(this)" type="button">📷 사진 추가</button>` : '';
        const moreMenu = (likeItems || addItems || editItems) ? `<div class="pr-rec-more"><button class="pr-rec-more-btn" type="button" title="더보기">···</button><div class="pr-rec-more-menu">${likeItems}${addItems}${editItems}</div></div>` : '';
        return `<div class="pr-rec-row pr-rec-row--game" data-id="${r.id}" data-record='${JSON.stringify({gameId: r.game_id||'', nick: r.nickname||'', names: r.player_names||'', count: r.player_count||'', time: r.play_time_min||'', score: r.score_note||'', review: r.review_text||'', group: r.group_name||'', date: r.played_at||'', photo: r.photo_url||'', mine: !!showEdit})}'>
          <div class="pr-rec-row-top">
            ${thumbHtml}
            <div class="pr-rec-main">
              <span class="pr-rec-game">${escH(getGameName(r.game_id))}${orderMap.get(r.id) >= 2 ? `<span class="pr-play-order"> (${orderMap.get(r.id)}번째 플레이)</span>` : ''}</span>
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

})();

async function onPrMenuLike(btn) {
  const gameKey = btn.dataset.gameId;
  if (!gameKey || !window.CottageDB) return;
  requireLogin(async () => {
    const user = window.getKakaoUser?.();
    if (!user?.id) return;
    const result = await window.CottageDB.toggleGameLike(gameKey, String(user.id));
    if (!result?.error) {
      const more = btn.closest('.pr-rec-more');
      more?.querySelectorAll('.pr-rec-like-action').forEach(b => { b.textContent = result.liked ? '👍 좋아요 취소' : '👍 좋아요'; });
      if (result.liked) {
        const wasCurious = await window.CottageDB.hasUserCurious(gameKey, String(user.id));
        if (wasCurious) {
          await window.CottageDB.toggleGameCurious(gameKey, String(user.id));
          more?.querySelectorAll('.pr-rec-curious-action').forEach(b => { b.textContent = '🤔 궁금해요'; });
          showToast('😊 궁금해요가 취소됐어요');
        }
      }
    }
  });
}

async function onPrMenuCurious(btn) {
  const gameKey = btn.dataset.gameId;
  if (!gameKey || !window.CottageDB) return;
  requireLogin(async () => {
    const user = window.getKakaoUser?.();
    if (!user?.id) return;
    const result = await window.CottageDB.toggleGameCurious(gameKey, String(user.id));
    if (!result?.error) {
      const more = btn.closest('.pr-rec-more');
      more?.querySelectorAll('.pr-rec-curious-action').forEach(b => { b.textContent = result.curious ? '🤔 궁금해요 취소' : '🤔 궁금해요'; });
      if (result.curious) {
        const wasLiked = await window.CottageDB.hasUserLiked(gameKey, String(user.id));
        if (wasLiked) {
          await window.CottageDB.toggleGameLike(gameKey, String(user.id));
          more?.querySelectorAll('.pr-rec-like-action').forEach(b => { b.textContent = '👍 좋아요'; });
        }
      }
    }
  });
}
