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

  // 전역 노출
  window.parsePhotoUrls = parsePhotoUrls;
  window.buildPhotoHtml = buildPhotoHtml;
  window.openLightbox = openLightbox;
})();
