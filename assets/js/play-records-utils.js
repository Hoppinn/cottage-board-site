// play-records-utils.js
// game-reviews.html, club-history.html 공통 유틸
// window.parsePhotoUrls / window.buildPhotoHtml / window.openLightbox 전역 노출

(function () {
  function _escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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
    const show = photoUrls.slice(0, 3);
    const more = photoUrls.length - 3;
    const allAttr = _escAttr(JSON.stringify(photoUrls));
    return `<div class="pr-rec-photo-wrap" data-urls="${allAttr}">
      ${show.map((u, i) => `<div class="pr-rec-photo-item"><img class="pr-rec-photo" src="${_escAttr(u)}" alt="사진" loading="lazy" data-idx="${i}">${canDelPhoto ? `<button class="pr-rec-photo-del" data-id="${recordId}" data-url="${_escAttr(u)}" type="button">×</button>` : ''}</div>`).join('')}
      ${more > 0 ? `<div class="pr-rec-photo-more" data-idx="3">+${more}장</div>` : ''}
    </div>`;
  }

  function openLightbox(urls, startIdx) {
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

    function show(idx) {
      cur = ((idx % urls.length) + urls.length) % urls.length;
      img.src = urls[cur];
      const multi = urls.length > 1;
      prev.style.display = multi ? '' : 'none';
      next.style.display = multi ? '' : 'none';
      counter.textContent = multi ? `${cur + 1} / ${urls.length}` : '';
    }

    function closeLb() { document.removeEventListener('keydown', onKey); lb.remove(); }

    prev.addEventListener('click', e => { e.stopPropagation(); show(cur - 1); });
    next.addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
    close.addEventListener('click', closeLb);
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });

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
    document.body.appendChild(lb);
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
})();
