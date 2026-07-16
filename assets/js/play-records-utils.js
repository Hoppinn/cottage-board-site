// play-records-utils.js
// game-reviews.html, club-history.html 공통 유틸
// 전역 노출: window.parsePhotoUrls / window.buildPhotoHtml / window.openLightbox
//            window.toInitials / window.hangulMatch / window.attachAc
//            window.initTagInput / window.buildPhotoItemAdder / window.revokePhotoGridBlobs
//            window.getGameKeyById

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
      ${photoUrls.map((u, i) => `<div class="pr-rec-photo-item${i >= SHOW ? ' sheet-photo-hidden' : ''}"><img class="pr-rec-photo" src="${_escAttr(u)}" alt="사진" loading="lazy" data-idx="${i}">${canDelPhoto ? `<button class="pr-rec-photo-del" data-id="${recordId}" data-url="${_escAttr(u)}" type="button">×</button>` : ''}</div>`).join('')}
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
  function _escH(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      chip.innerHTML = _escH(val) + '<button type="button" class="tag-chip-del">×</button>';
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

  // 전역 노출
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
