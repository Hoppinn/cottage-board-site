// play-records-utils.js
// game-reviews.html, club-history.html 공통 유틸
// 전역 노출: window.parsePhotoUrls / window.buildPhotoHtml / window.openLightbox
//            window.toInitials / window.hangulMatch / window.attachAc
//            window.initTagInput / window.buildPhotoItemAdder / window.revokePhotoGridBlobs
//            window.getGameKeyById / window.renderCrossBackLink / window.normalizeNick
//            window.buildRecordCaption / window.copyCaption / window.trackMoreMenu

(function () {
  function _escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // DB의 game_id(gameKey 슬러그 또는 BGG ID) → gameData 키.
  // openLightbox의 gameThumbs/gameKeys를 만들려면 호출부마다 필요해서 여기 둔다
  // (원래 kakao-auth.js 지역함수였음 — 사본을 늘리지 않고 단일 소스로 공유).
  function getGameKeyById(gameId) {
    if (!gameId || !window.gameData) return null;
    if (window.gameData[gameId]) return gameId;
    const entry = Object.entries(window.gameData).find(([, g]) => String(g.bgg?.id) === String(gameId));
    return entry ? entry[0] : null;
  }

  function parsePhotoUrls(raw) {
    if (!raw) return [];
    if (raw.trimStart().startsWith('[')) {
      try { return JSON.parse(raw).filter(Boolean); } catch (_) {}
    }
    return [raw];
  }

  function buildPhotoHtml(photoUrls, recordId, canDelPhoto) {
    if (!photoUrls.length) return '';
    const SHOW = 3;
    const more = photoUrls.length - SHOW;
    const allAttr = _escAttr(JSON.stringify(photoUrls));
    return `<div class="pr-rec-photo-wrap" data-urls="${allAttr}">
      ${photoUrls.map((u, i) => `<div class="pr-rec-photo-item${i >= SHOW ? ' sheet-photo-hidden' : ''}"><img class="pr-rec-photo" src="${_escAttr(u)}" alt="사진" loading="lazy" data-idx="${i}">${canDelPhoto ? `<button aria-label="사진 빼기" class="pr-rec-photo-del" data-id="${recordId}" data-url="${_escAttr(u)}" type="button">×</button>` : ''}</div>`).join('')}
      ${more > 0 ? `<div class="pr-rec-photo-more">+${more}장</div>` : ''}
    </div>`;
  }

  // 기록 행(.pr-rec-row) 사진 라이트박스 — 캡션 + 좌하단 게임 썸네일 + (내 기록이면) 삭제.
  // 기록 허브·동호회 기록이 공유. 한 기록의 사진만 띄우므로 게임·소유권이 전 장에 동일 →
  // gameThumbs/gameKeys는 같은 값으로 채운다.
  // 필요 DOM: wrap[data-urls] · row[data-id][data-record] (record에 gameId·mine 포함)
  // opts: { buildCaption?: (rec) => string, onAfterDelete?: (recId, newPhotoUrl) => void }
  function openRecordLightbox(wrap, row, startIdx, opts) {
    let urls = [];
    try { urls = JSON.parse(wrap?.dataset.urls || '[]'); } catch (e) { console.error('[openRecordLightbox] urls 파싱', e); }
    if (!urls.length) return;
    let rec = {};
    try { rec = JSON.parse(row?.dataset.record || '{}'); } catch (e) { console.error('[openRecordLightbox] record 파싱', e); }

    const gameKey = rec.gameId ? getGameKeyById(rec.gameId) : null;
    const thumb = gameKey ? (window.gameData?.[gameKey]?.images?.thumbnail || null) : null;

    const lbOpts = {
      caption: opts?.buildCaption?.(rec) || '',
      gameThumbs: urls.map(() => thumb),
      gameKeys: urls.map(() => gameKey),
      onGameClick: key => { if (!key) return; window.ensureGameSheet?.(); window.openGameRecordSheet?.(key); },
    };

    // deletable을 생략하면 openLightbox가 '전부 삭제 가능'으로 처리하므로,
    // 남의 기록에 삭제버튼이 뜨지 않도록 내 기록일 때만 onDelete를 넘긴다.
    if (rec.mine) {
      lbOpts.onDelete = async delIdx => {
        const recId = row?.dataset.id;
        if (!recId || !window.CottageDB) return;
        const rem = urls.filter((_, i) => i !== delIdx);
        const newUrl = rem.length === 0 ? null : rem.length === 1 ? rem[0] : JSON.stringify(rem);
        const res = await window.CottageDB.updateGamePlay(recId, { photo_url: newUrl });
        if (res?.error) { console.error('[openRecordLightbox] 사진 삭제', res.error); alert('사진 삭제에 실패했습니다.'); return; }
        opts?.onAfterDelete?.(recId, newUrl);
      };
    }
    openLightbox(urls, startIdx, lbOpts);
  }

  function openLightbox(urls, startIdx, opts) {
    if (!urls || !urls.length) return;
    let cur = ((startIdx || 0) + urls.length) % urls.length;

    const lb = document.createElement('div');
    lb.className = 'pr-lightbox';

    const img = document.createElement('img');
    img.className = 'pr-lightbox-img';
    img.addEventListener('click', e => e.stopPropagation());

    const close = document.createElement('button');
    close.className = 'pr-lightbox-close'; close.type = 'button'; close.textContent = '✕';

    const prev = document.createElement('button');
    prev.className = 'pr-lightbox-nav pr-lightbox-prev'; prev.type = 'button'; prev.textContent = '‹';

    const next = document.createElement('button');
    next.className = 'pr-lightbox-nav pr-lightbox-next'; next.type = 'button'; next.textContent = '›';

    const counter = document.createElement('div');
    counter.className = 'pr-lightbox-counter';

    const cap = (opts?.captions || opts?.caption) ? document.createElement('div') : null;
    if (cap) cap.className = 'pr-lightbox-caption';

    const delBtn = opts?.onDelete ? document.createElement('button') : null;
    if (delBtn) {
      delBtn.className = 'pr-lightbox-del';
      delBtn.type = 'button';
      delBtn.textContent = '삭제';
    }

    // 좌하단 게임 썸네일 (사진별 해당 게임 표지) — 클릭 시 opts.onGameClick(gameKey)
    const gameThumb = opts?.gameThumbs ? document.createElement('img') : null;
    if (gameThumb) {
      gameThumb.className = 'pr-lightbox-game-thumb';
      gameThumb.alt = '';
      gameThumb.addEventListener('click', e => {
        e.stopPropagation();
        const key = opts.gameKeys ? opts.gameKeys[cur] : null;
        if (!key) return;
        closeLb();
        opts.onGameClick?.(key);
      });
    }

    function show(idx) {
      cur = ((idx % urls.length) + urls.length) % urls.length;
      img.src = urls[cur];
      const multi = urls.length > 1;
      prev.style.display = multi ? '' : 'none';
      next.style.display = multi ? '' : 'none';
      counter.textContent = multi ? `${cur + 1} / ${urls.length}` : '';
      if (cap) {
        const text = opts.captions ? (opts.captions[cur] || '') : (opts.caption || '');
        cap.innerHTML = text;
      }
      if (delBtn) {
        const canDel = !opts.deletable || opts.deletable[cur];
        delBtn.style.display = canDel ? '' : 'none';
      }
      if (gameThumb) {
        const turl = opts.gameThumbs[cur];
        if (turl) { gameThumb.src = turl; gameThumb.style.display = ''; }
        else gameThumb.style.display = 'none';
      }
    }

    function closeLb() {
      document.removeEventListener('keydown', onKey);
      lb.remove();
      if (window.parent !== window) window.parent.postMessage({ type: 'cottage-lightbox-close' }, '*');
    }

    if (delBtn) {
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('이 사진을 삭제할까요?')) { opts.onDelete(cur); closeLb(); }
      });
    }
    prev.addEventListener('click', e => { e.stopPropagation(); show(cur - 1); });
    next.addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
    close.addEventListener('click', closeLb);

    let touchStartX = 0;
    lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });

    function onKey(e) {
      if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'Escape') closeLb();
    }
    document.addEventListener('keydown', onKey);

    lb.append(close, prev, img, next, counter);
    if (cap) lb.appendChild(cap);
    if (delBtn) lb.appendChild(delBtn);
    if (gameThumb) lb.appendChild(gameThumb);
    document.body.appendChild(lb);
    if (window.parent !== window) window.parent.postMessage({ type: 'cottage-lightbox-open' }, '*');
    show(cur);
  }

  // 한글 초성 검색
  const _INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function _escH(s) {   // GS5: 정본 위임 (supabase-client.js의 window.escH) — 호출시점 참조
    return window.escH(s);
  }

  function toInitials(str) {
    return [...str].map(ch => {
      const code = ch.charCodeAt(0);
      return (code >= 0xAC00 && code <= 0xD7A3)
        ? _INITIALS[Math.floor((code - 0xAC00) / 28 / 21)]
        : ch;
    }).join('');
  }

  function hangulMatch(target, query) {
    const t = target.toLowerCase(), q = query.toLowerCase();
    if (t.includes(q)) return true;
    if (/^[ㄱ-ㅎ]+$/.test(q)) return toInitials(target).includes(q);
    return false;
  }

  // 공용 자동완성 드롭다운
  function attachAc(input, getSuggestions, onSelect, listRef) {
    let list, focusedIdx = -1;
    if (listRef && listRef.classList.contains('pr-autocomplete-list')) {
      list = listRef;
    } else if (listRef) {
      list = document.createElement('div');
      list.className = 'pr-autocomplete-list';
      listRef.style.position = 'relative';
      listRef.appendChild(list);
    } else {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      list = document.createElement('div');
      list.className = 'pr-autocomplete-list';
      wrap.appendChild(list);
    }
    function render(matches) {
      list.innerHTML = ''; focusedIdx = -1;
      if (!matches.length) { list.classList.remove('is-open'); return; }
      matches.forEach(s => {
        const item = document.createElement('div');
        item.className = 'pr-autocomplete-item'; item.textContent = s;
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          if (onSelect) { onSelect(s); } else { input.value = s; }
          list.classList.remove('is-open');
        });
        list.appendChild(item);
      });
      list.classList.add('is-open');
    }
    function updateFocus() {
      const items = [...list.querySelectorAll('.pr-autocomplete-item')];
      items.forEach((el, i) => el.classList.toggle('is-focused', i === focusedIdx));
      if (focusedIdx >= 0 && items[focusedIdx]) items[focusedIdx].scrollIntoView({ block: 'nearest' });
    }
    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) { render([]); return; }
      render(getSuggestions().filter(s => hangulMatch(s, q)));
    });
    input.addEventListener('focus', () => {
      const q = input.value.trim();
      if (!q) return;
      render(getSuggestions().filter(s => hangulMatch(s, q)));
    });
    input.addEventListener('keydown', e => {
      if (!list.classList.contains('is-open')) return;
      const items = [...list.querySelectorAll('.pr-autocomplete-item')];
      if (e.key === 'ArrowDown') { e.preventDefault(); focusedIdx = Math.min(focusedIdx + 1, items.length - 1); updateFocus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusedIdx = Math.max(focusedIdx - 1, 0); updateFocus(); }
      else if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault();
        const s = items[focusedIdx].textContent;
        items.forEach(el => el.classList.remove('is-focused'));
        focusedIdx = -1;
        list.classList.remove('is-open');
        if (onSelect) { onSelect(s); } else { input.value = s; }
      } else if (e.key === 'Escape') { list.classList.remove('is-open'); }
    });
    input.addEventListener('blur', () => setTimeout(() => list.classList.remove('is-open'), 150));
  }

  // 공용 태그칩 입력 초기화
  function initTagInput(wrap, hidden, initialValue, onAdd) {
    if (!wrap) return;
    const chips = wrap.querySelector('.tag-chips');
    const text = wrap.querySelector('.tag-text-input');
    function updateHidden() {
      hidden.value = [...chips.querySelectorAll('.tag-chip')].map(c => c.dataset.val).join(', ');
    }
    function addTag(val) {
      val = val.trim(); if (!val) return;
      if ([...chips.querySelectorAll('.tag-chip')].some(c => c.dataset.val.trim().toLowerCase() === val.toLowerCase())) return;
      const chip = document.createElement('span');
      chip.className = 'tag-chip'; chip.dataset.val = val;
      chip.innerHTML = _escH(val) + '<button aria-label="참여자 빼기" type="button" class="tag-chip-del">×</button>';
      chip.querySelector('.tag-chip-del').addEventListener('click', () => { chip.remove(); updateHidden(); });
      chips.appendChild(chip); updateHidden();
      if (onAdd) onAdd(val);
    }
    function triggerRefresh() { text.dispatchEvent(new Event('input', { bubbles: true })); }
    text.setAttribute('enterkeyhint', 'done');
    let _enterDone = false;
    text.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (wrap.querySelector('.pr-autocomplete-item.is-focused')) { e.preventDefault(); return; }
        e.preventDefault();
        if (e.isComposing) { _enterDone = false; return; }
        const v = text.value.trim(); _enterDone = !!v;
        if (v) { addTag(v); text.value = ''; triggerRefresh(); text.focus(); }
      } else if (e.key === 'Backspace' && !text.value) {
        const last = chips.querySelector('.tag-chip:last-child');
        if (last) { last.remove(); updateHidden(); }
      }
    });
    text.addEventListener('keyup', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        if (_enterDone) { _enterDone = false; return; }
        if (wrap.querySelector('.pr-autocomplete-item.is-focused')) return;
        const v = text.value.trim();
        if (v) { addTag(v); text.value = ''; triggerRefresh(); text.focus(); }
      }
    });
    wrap.addEventListener('click', () => text.focus());
    if (initialValue) initialValue.split(',').forEach(v => addTag(v));
  }

  // PU2: root(그리드/행/폼) 안의 blob: URL 전부 해제 — innerHTML='' 또는 .remove()로
  // 통째로 지우기 전에 호출해야 createObjectURL로 만든 blob이 페이지 수명 내내 누적되지 않음
  function revokePhotoGridBlobs(root) {
    if (!root) return;
    root.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    });
  }

  // 공용 사진 그리드 아이템 추가 함수
  function buildPhotoItemAdder(grid, files, maxCount) {
    return async function(file) {
      if (maxCount && files.length >= maxCount) { alert(`사진은 최대 ${maxCount}장까지 추가할 수 있어요.`); return; }
      const resized = window.resizeImageFile ? await window.resizeImageFile(file) : file;
      files.push(resized);
      const item = document.createElement('div');
      item.className = 'pr-photo-item'; item.dataset.idx = String(files.length - 1);
      const img = document.createElement('img');
      img.src = URL.createObjectURL(resized);
      img.style.cursor = 'pointer';
      img.addEventListener('click', e => {
        e.stopPropagation();
        const allImgs = [...grid.querySelectorAll('.pr-photo-item img')];
        openLightbox(allImgs.map(i => i.src), allImgs.indexOf(img));
      });
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'pr-photo-item-del'; del.textContent = '×';
      del.addEventListener('click', () => {
        URL.revokeObjectURL(img.src);
        const i = parseInt(item.dataset.idx);
        files.splice(i, 1); item.remove();
        grid.querySelectorAll('.pr-photo-item').forEach((el, j) => el.dataset.idx = j);
      });
      item.append(img, del); grid.appendChild(item);
    };
  }

  // ── 캡션 복사 (동호회 기록&사진 + 플레이기록 공용) ─────────────────────────
  // 캡션은 인스타·단톡에 그대로 붙여넣는 용도라 **실제로 쓰던 양식**을 따른다(2026-07-22 확정).
  // 게임 블록 3줄: 「게임명 (N인)」 / 「2시간30분」 / 「154 / 143 / 141점」.
  // 참여자 이름·해시태그·🎲 헤더는 넣지 않는다 — 앞뒤 인사말은 사람이 직접 쓴다.
  // ⚠️ player_count·play_time_min·score_note는 비어 있을 수 있고, 그 줄은 통째로 빠진다.
  // ⚠️ window에 formatPlayTime을 그대로 노출하지 않는다 — game-sheet.js에 같은 이름의
  //    전역 함수가 있고(「N분」 반환) 의미가 다르다.
  function _captionPlayTime(min) {
    const m = Number(min);
    if (!Number.isFinite(m) || m <= 0) return '';
    const h = Math.floor(m / 60), r = m % 60;
    if (!h) return `${r}분`;
    return r ? `${h}시간${r}분` : `${h}시간`;
  }

  // score_note는 자유 텍스트다 — 실측(70행)에 「154 / 143 / 141」뿐 아니라 「실패」·「1패 1승」·
  // 「볼테어 이지모드 클리어」·「탐험가120 / 인간94」가 실재한다. 무조건 「점」을 붙이면
  // 「실패점」이 되므로, 숫자와 구분자로만 이뤄졌을 때만 붙인다.
  function _captionScore(note) {
    const s = String(note ?? '').trim();
    if (!s) return '';
    return /^[0-9\s/]+$/.test(s) ? `${s}점` : s;
  }

  // 게임명 해석 기본값 — 호출부가 자기 resolver를 넘기면 그걸 쓴다.
  function _captionGameName(gameId) {
    if (!window.COTTAGE_GAMES) return gameId;
    const g = window.COTTAGE_GAMES.find(x => String(x.bggId) === String(gameId) || x.id === gameId);
    return g ? (g.display || g.titleKo || g.titleEn || gameId) : gameId;
  }

  function buildRecordCaption(records, getName) {
    const name = typeof getName === 'function' ? getName : _captionGameName;
    return (records || []).map(r => [
      `${name(r.game_id)}${r.player_count ? ` (${r.player_count}인)` : ''}`,
      _captionPlayTime(r.play_time_min),
      _captionScore(r.score_note),
    ].filter(Boolean).join('\n')).join('\n\n');
  }

  // ⋯ 메뉴의 「캡션 복사」 — 클립보드가 막힌 환경(비보안 컨텍스트 등)엔 prompt 폴백.
  // 로그인·회원 여부를 보지 않는다: 캡션은 누구나 쓸 수 있어야 한다(2026-07-22 사용자 결정).
  function copyCaption(btn) {
    const text = btn.dataset.caption || '';
    const done = () => {
      const old = btn.textContent;
      btn.textContent = '📋 복사됨!';
      setTimeout(() => { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => prompt('아래 텍스트를 복사해주세요', text));
    } else {
      prompt('아래 텍스트를 복사해주세요', text);
    }
  }

  // ── 기록 행 ⋯ 메뉴의 위치 ──────────────────────────────────────────────────
  // **JS는 이 메뉴의 위치를 계산하지 않는다.** CSS의 position:absolute 하나로 끝이다 —
  // 페이지와 함께 움직이고, 헤더 위로 떠오르지 않고, 잘리지도 않는다.
  // 2026-07-22 하루에 두 번 틀린 자리다. 남기는 이유는 세 번째를 막기 위해서다:
  //   ①position:fixed + 스크롤마다 좌표 재계산 → 메뉴가 스크롤을 쫓아다니고 헤더를 덮었다
  //   ②자리가 없으면 위로 펼치기 → 카드가 짧으면 위에도 자리가 없어 그대로 잘렸다
  //   ③(현재) 자르는 주체인 `.pr-session { overflow: hidden }`을 없앴다 — 그게 근원이었고,
  //     헤더의 각진 배경은 헤더 자신의 border-radius로 해결했다(style.css).
  // 남은 두 함수는 호출부 호환용 빈 껍데기다. 여기에 좌표 계산을 다시 넣지 말 것.
  function trackMoreMenu(btn, menu) { menu?.removeAttribute('style'); }
  function untrackMoreMenu() { /* no-op */ }

  // 참여자 이름 ↔ 회원 닉네임 대조용 정규화.
  // 참여자 이름은 사람이 손으로 친 자유 텍스트라 회원 닉네임과 공백·대소문자가 어긋난다.
  // 실제 사건(2026-07-22): 회원 닉네임이 「덕 지」인데 기록엔 「덕지」로 적혀 있어 13건이
  // 조용히 클릭 불가였다. 맵을 만들 때와 조회할 때 **양쪽 다** 이 함수를 통과시킬 것.
  function normalizeNick(s) {
    return String(s ?? '').replace(/\s+/g, '').toLowerCase();
  }

  // ── 크로스 페이지 복귀 링크 (플레이기록 ↔ 동호회 기록&사진) ────────────────
  // 두 게시판이 서로를 링크하는데 돌아올 길이 없었다(2026-07-22 사용자 지적).
  // 「닫고 전환」이지 「겹쳐 쌓기」가 아니므로(PROJECT_STRUCTURE §2-A 6) 모달이 아니라
  // 복귀 링크가 맞다 — 넘어간 페이지 자체를 계속 쓰다가 돌아오는 동선이기 때문.
  // 링크에 ?from=키 를 붙이면 도착 페이지 맨 위에 「← ○○로」가 뜬다.
  const _BACK_TARGETS = {
    'club-history': { href: '../club/club-history.html', label: '모임 기록 & 사진' },
    'game-reviews': { href: '../game/game-reviews.html', label: '플레이 기록' },
  };

  function renderCrossBackLink() {
    const key = new URLSearchParams(location.search).get('from');
    const target = _BACK_TARGETS[key];
    if (!target) return;
    const anchor = document.querySelector('.inner-page > .breadcrumb');
    if (!anchor || document.querySelector('.cross-back-link')) return;

    // 조사: 마지막 글자에 받침이 있으면 「으로」, 없으면 「로」
    // (「사진로 돌아가기」가 실제로 나왔다 — 라벨을 새로 추가할 때도 이 판정이 알아서 맞춘다)
    const last = target.label.trim().slice(-1).charCodeAt(0);
    const josa = (last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0) ? '으로' : '로';

    const a = document.createElement('a');
    a.className = 'cross-back-link';
    a.href = target.href;
    a.textContent = `← ${target.label}${josa} 돌아가기`;
    // 뒤로가기로 갈 수 있으면 그쪽을 쓴다 — 스크롤 위치가 보존된다.
    // (referrer가 비거나 다른 경로로 들어왔으면 href 그대로 이동)
    a.addEventListener('click', e => {
      const ref = document.referrer || '';
      if (history.length > 1 && ref.includes(target.href.replace('../', '/'))) {
        e.preventDefault();
        history.back();
      }
    });
    anchor.parentNode.insertBefore(a, anchor);
  }

  // 전역 노출
  window.renderCrossBackLink = renderCrossBackLink;
  window.normalizeNick = normalizeNick;
  window.escAttr = _escAttr;   // 속성값 이스케이프(& 와 ")는 escH가 안 해준다
  window.buildRecordCaption = buildRecordCaption;
  window.copyCaption = copyCaption;
  window.trackMoreMenu = trackMoreMenu;
  window.untrackMoreMenu = untrackMoreMenu;
  window.parsePhotoUrls = parsePhotoUrls;
  window.buildPhotoHtml = buildPhotoHtml;
  window.openLightbox = openLightbox;
  window.toInitials = toInitials;
  window.hangulMatch = hangulMatch;
  window.attachAc = attachAc;
  window.initTagInput = initTagInput;
  window.buildPhotoItemAdder = buildPhotoItemAdder;
  window.getGameKeyById = getGameKeyById;
  window.openRecordLightbox = openRecordLightbox;
  window.revokePhotoGridBlobs = revokePhotoGridBlobs;
})();
