/* Parent-owned center-modal frame stack. Root modals keep their existing lifecycle;
   this host owns only child frames and never adds a second backdrop. */
(function () {
  const scriptUrl = document.currentScript?.src || location.href;
  const siteRoot = new URL('../../', scriptUrl);
  const activeViews = {
    'recommend-all': 'recommend-all',
    'game-info': 'game-sheet',
    'game-record': 'game-reviews',
    'game-location': 'game-location-shelf',
    'game-rule': 'game-rule',
    meeting: 'day-detail',
    profile: 'other-board',
  };

  function stackUrl(kind, payload = {}) {
    const routes = {
      'recommend-all': 'index.html',
      'game-info': 'index.html',
      'game-record': 'pages/game/game-reviews.html',
      'game-location': 'pages/game/game-location.html',
      'game-rule': 'index.html',
      meeting: 'pages/club/club-schedule.html',
      profile: 'index.html',
    };
    if (!routes[kind]) return '';
    const url = new URL(routes[kind], siteRoot);
    url.searchParams.set('embed', '1');
    url.searchParams.set('modalStack', '1');
    url.searchParams.set('modalFrame', 'child');
    url.searchParams.set('stackKind', kind);
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    if (kind === 'game-location' && payload?.game) {
      url.searchParams.set('highlight', String(payload.game));
      url.searchParams.delete('game');
    }
    url.hash = url.searchParams.toString();
    return url.href;
  }

  class ModalStackHost {
    constructor({ container, rootFrame, rootShell, isOpen, onRootClose }) {
      this.container = container;
      this.isOpen = isOpen || (() => true);
      this.onRootClose = onRootClose || (() => {});
      this.frames = [{ frame: rootFrame, shell: rootShell, root: true, token: null }];
      this._onMessage = this._onMessage.bind(this);
      this._onKeydown = this._onKeydown.bind(this);
      window.addEventListener('message', this._onMessage);
      document.addEventListener('keydown', this._onKeydown, true);
    }

    get depth() { return this.frames.length - 1; }
    hasChildren() { return this.depth > 0; }
    top() { return this.frames[this.frames.length - 1]; }

    _setInactive(entry, inactive) {
      if (!entry?.shell) return;
      entry.shell.classList.toggle('is-stack-inactive', inactive);
      if (inactive) {
        entry.shell.setAttribute('aria-hidden', 'true');
        entry.shell.inert = true;
        entry.shell.setAttribute('inert', '');
      } else {
        entry.shell.inert = false;
        entry.shell.removeAttribute('inert');
        entry.shell.removeAttribute('aria-hidden');
      }
    }

    push(kind, payload, presentation = 'overlay') {
      const src = stackUrl(kind, payload);
      if (!src || !this.isOpen()) return false;
      const mode = presentation === 'drilldown' ? 'drilldown' : 'overlay';
      const previous = this.top();
      this._setInactive(previous, true);
      const layer = document.createElement('div');
      layer.className = `modal-stack-frame-layer modal-stack-frame-layer--${mode}`;
      layer.dataset.stackKind = kind;
      layer.dataset.presentation = mode;
      layer.innerHTML = `<div class="modal-stack-frame-shell center-modal-shell" role="dialog" aria-modal="true">
        ${mode === 'drilldown'
          ? '<button class="modal-stack-frame-back" type="button" aria-label="이전 화면으로 돌아가기">←</button>'
          : '<button class="modal-stack-frame-close" type="button" aria-label="닫기">✕</button>'}
        <iframe class="modal-stack-frame" src="${src}" allow="camera;microphone"></iframe>
      </div>`;
      const shell = layer.querySelector('.modal-stack-frame-shell');
      const frame = layer.querySelector('iframe');
      this.container.appendChild(layer);
      const token = window.pushActiveView?.(window.COTTAGE_ACTIVE_VIEWS?.[activeViews[kind]]?.key) ?? null;
      const entry = { layer, shell, frame, root: false, token, presentation: mode };
      this.frames.push(entry);
      layer.querySelector('.modal-stack-frame-back')?.addEventListener('click', () => this.pop());
      // An independent overlay sits above the previous frame. Its X removes only
      // this top frame so the previous modal's DOM, scroll, and selection remain.
      layer.querySelector('.modal-stack-frame-close')?.addEventListener('click', () => this.pop());
      return true;
    }

    pop() {
      if (!this.hasChildren()) return false;
      const entry = this.frames.pop();
      window.popActiveView?.(entry.token);
      entry.frame.src = '';
      entry.layer.remove();
      this._setInactive(this.top(), false);
      return true;
    }

    clear() { while (this.hasChildren()) this.pop(); }

    // Root owners retain their existing close lifecycle. Child overlay X buttons
    // use pop(), so this remains available only to an explicit root close path.
    close() {
      if (!this.isOpen()) return false;
      this.clear();
      this.onRootClose();
      return true;
    }

    _onMessage(event) {
      if (!this.isOpen() || event.source !== this.top()?.frame?.contentWindow) return;
      if (event.data?.type === 'cottage-modal-stack-push') {
        this.push(event.data.kind, event.data.payload || {}, event.data.presentation);
      }
      if (event.data?.type === 'cottage-modal-stack-pop') this.pop();
      // game-location.html keeps its existing iframe message contract. At stack depth it
      // becomes one more parent frame instead of opening a local game sheet.
      if (event.data?.action === 'openGame' && event.data?.gameId) {
        this.push('game-info', { game: decodeURIComponent(String(event.data.gameId)) }, 'overlay');
      }
    }

    _onKeydown(event) {
      if (event.key !== 'Escape' || !this.isOpen()) return;
      // Root is closed by its × only. ESC is always a one-frame pop when children exist.
      event.preventDefault();
      event.stopImmediatePropagation();
      this.pop();
    }
  }

  window.CottageModalStackHost = { create: options => new ModalStackHost(options), stackUrl };
})();
