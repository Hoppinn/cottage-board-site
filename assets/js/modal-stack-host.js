/* Parent-owned center-modal frame stack. Root modals keep their existing lifecycle;
   this host owns only child frames and never adds a second backdrop. */
(function () {
  const scriptUrl = document.currentScript?.src || location.href;
  const siteRoot = new URL('../../', scriptUrl);
  const childKinds = {
    'recommend-all': { route: 'index.html' },
  };
  const activeViews = {
    'recommend-all': 'recommend-all',
  };

  function stackUrl(kind, payload = {}, presentation = 'overlay') {
    const config = childKinds[kind];
    if (!config) return '';
    const url = new URL(config.route, siteRoot);
    url.searchParams.set('embed', '1');
    url.searchParams.set('modalStack', '1');
    url.searchParams.set('modalFrame', 'child');
    url.searchParams.set('stackKind', kind);
    url.searchParams.set('stackPresentation', presentation === 'drilldown' ? 'drilldown' : 'overlay');
    url.searchParams.set('stackGeometry', config.geometry || 'standard');
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    url.hash = url.searchParams.toString();
    return url.href;
  }

  class ModalStackHost {
    constructor({ container, rootFrame, rootShell, isOpen, onRootClose }) {
      this.container = container;
      // A functional surface portalled out of this Host needs a semantic layer
      // anchor, not a route selector or a hard-coded z-index.
      this.container.dataset.uiPresentationLayerOwner = 'host';
      this.isOpen = isOpen || (() => true);
      this.onRootClose = onRootClose || (() => {});
      this.frames = [{ frame: rootFrame, shell: rootShell, root: true, token: null }];
      this.nextFlowId = 0;
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
      const config = childKinds[kind];
      if (!config) return false;
      const mode = presentation === 'drilldown' ? 'drilldown' : 'overlay';
      const src = stackUrl(kind, payload, mode);
      if (!src || !this.isOpen()) return false;
      const previous = this.top();
      const flowId = config.flow && previous?.flow === config.flow
        ? previous.flowId
        : config.flow ? `${config.flow}-${++this.nextFlowId}` : null;
      const geometry = config.geometry || 'standard';
      this._setInactive(previous, true);
      const layer = document.createElement('div');
      layer.className = `modal-stack-frame-layer modal-stack-frame-layer--${mode}`;
      layer.dataset.stackKind = kind;
      layer.dataset.presentation = mode;
      layer.dataset.uiGeometryVariant = geometry;
      layer.innerHTML = `<div class="modal-stack-frame-shell center-modal-shell" data-ui-structure="host-child-frame" data-ui-surface-geometry-owner data-ui-geometry-owner="host" data-ui-geometry-variant="${geometry}" data-ui-navigation="${mode}" data-ui-chrome-owner="host" data-ui-flow-close-owner="${flowId ? 'host' : 'none'}" data-ui-navigation-back-owner="${mode === 'drilldown' ? 'host' : 'none'}" role="dialog" aria-modal="true">
        ${mode === 'drilldown'
          ? '<button class="modal-stack-frame-back" data-ui-chrome="navigation-back" type="button" aria-label="이전 화면으로 돌아가기">←</button>' : ''}
        <button class="modal-stack-frame-close" data-ui-chrome="flow-close" type="button" aria-label="${flowId ? '게임 탐색 닫기' : '닫기'}">✕</button>
        <iframe class="modal-stack-frame" src="${src}" allow="camera;microphone"></iframe>
      </div>`;
      const shell = layer.querySelector('.modal-stack-frame-shell');
      const frame = layer.querySelector('iframe');
      this.container.appendChild(layer);
      const token = window.pushActiveView?.(window.COTTAGE_ACTIVE_VIEWS?.[activeViews[kind]]?.key) ?? null;
      const entry = { layer, shell, frame, root: false, token, presentation: mode, flow: config.flow || null, flowId };
      this.frames.push(entry);
      layer.querySelector('.modal-stack-frame-back')?.addEventListener('click', () => this.pop());
      // Flow close and one-step back are separate contracts. A game drilldown
      // keeps both controls: ← returns one frame, X removes the whole game flow.
      layer.querySelector('.modal-stack-frame-close')?.addEventListener('click', () => {
        if (flowId) this.closeFlow(flowId); else this.pop();
      });
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

    closeFlow(flowId) {
      let closed = false;
      while (this.hasChildren() && this.top()?.flowId === flowId) {
        this.pop();
        closed = true;
      }
      return closed;
    }

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
