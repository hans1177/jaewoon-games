function normalizeKeys(keys) {
  return Array.isArray(keys) ? [...new Set(keys.filter(Boolean).map(String))] : [];
}

export class JaewoonInputActions {
  constructor({ actions = {}, target = null, preventDefault = false } = {}) {
    this.actions = new Map();
    this.keyMap = new Map();
    this.axes = new Map();
    this.pressed = new Set();
    this.released = new Set();
    this.cleanup = [];
    this.preventDefault = Boolean(preventDefault);
    for (const [name, config] of Object.entries(actions || {})) this.defineAction(name, config);
    if (target) this.attachKeyboard(target);
  }

  defineAction(name, config = {}) {
    const id = String(name || '').trim();
    if (!id) throw new Error('action name required');
    const keys = normalizeKeys(Array.isArray(config) ? config : config.keys);
    const existing = this.actions.get(id);
    if (existing) {
      for (const key of existing.keys) this.keyMap.get(key)?.delete(id);
    }
    const action = {
      name: id,
      keys,
      sources: new Set(existing?.sources || []),
    };
    this.actions.set(id, action);
    for (const key of keys) {
      if (!this.keyMap.has(key)) this.keyMap.set(key, new Set());
      this.keyMap.get(key).add(id);
    }
    return action;
  }

  removeAction(name) {
    const id = String(name);
    const action = this.actions.get(id);
    if (!action) return false;
    for (const key of action.keys) this.keyMap.get(key)?.delete(id);
    this.actions.delete(id);
    this.pressed.delete(id);
    this.released.delete(id);
    return true;
  }

  setAction(name, down, source = 'manual') {
    const id = String(name);
    if (!this.actions.has(id)) this.defineAction(id);
    const action = this.actions.get(id);
    const sourceId = String(source || 'manual');
    const before = action.sources.size > 0;
    if (down) action.sources.add(sourceId);
    else action.sources.delete(sourceId);
    const after = action.sources.size > 0;
    if (!before && after) {
      this.pressed.add(id);
      this.released.delete(id);
    } else if (before && !after) {
      this.released.add(id);
      this.pressed.delete(id);
    }
    return after;
  }

  press(name, source = 'manual') { return this.setAction(name, true, source); }
  release(name, source = 'manual') { return this.setAction(name, false, source); }
  isDown(name) { return Boolean(this.actions.get(String(name))?.sources.size); }
  wasPressed(name) { return this.pressed.has(String(name)); }
  wasReleased(name) { return this.released.has(String(name)); }

  setAxis(name, x = 0, y = 0) {
    const clamp = (value) => Math.max(-1, Math.min(1, Number(value) || 0));
    const axis = Object.freeze({ x: clamp(x), y: clamp(y) });
    this.axes.set(String(name), axis);
    return axis;
  }

  axis(name) {
    return this.axes.get(String(name)) || Object.freeze({ x: 0, y: 0 });
  }

  clearAxis(name) { this.axes.delete(String(name)); }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  releaseAll() {
    for (const action of this.actions.values()) {
      if (action.sources.size) {
        action.sources.clear();
        this.released.add(action.name);
      }
    }
    this.axes.clear();
  }

  handleKey(code, down, event = null) {
    const actionNames = this.keyMap.get(String(code));
    if (!actionNames?.size) return false;
    if (this.preventDefault) event?.preventDefault?.();
    for (const name of actionNames) this.setAction(name, down, `key:${code}`);
    return true;
  }

  attachKeyboard(target = typeof window !== 'undefined' ? window : null) {
    if (!target?.addEventListener) return () => {};
    const keydown = (event) => {
      if (event.repeat) return;
      this.handleKey(event.code, true, event);
    };
    const keyup = (event) => this.handleKey(event.code, false, event);
    const blur = () => this.releaseAll();
    target.addEventListener('keydown', keydown);
    target.addEventListener('keyup', keyup);
    target.addEventListener('blur', blur);
    const off = () => {
      target.removeEventListener('keydown', keydown);
      target.removeEventListener('keyup', keyup);
      target.removeEventListener('blur', blur);
    };
    this.cleanup.push(off);
    return off;
  }

  bindVirtualButton(element, actionName, { source = null } = {}) {
    if (!element?.addEventListener) return () => {};
    const sourceId = source || `pointer:${String(actionName)}`;
    const down = (event) => {
      event.preventDefault?.();
      this.press(actionName, sourceId);
      element.setPointerCapture?.(event.pointerId);
    };
    const up = (event) => {
      event.preventDefault?.();
      this.release(actionName, sourceId);
    };
    element.addEventListener('pointerdown', down, { passive: false });
    element.addEventListener('pointerup', up, { passive: false });
    element.addEventListener('pointercancel', up, { passive: false });
    const off = () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      this.release(actionName, sourceId);
    };
    this.cleanup.push(off);
    return off;
  }

  snapshot() {
    const down = {};
    for (const [name, action] of this.actions) down[name] = action.sources.size > 0;
    return {
      down,
      pressed: [...this.pressed],
      released: [...this.released],
      axes: Object.fromEntries(this.axes),
    };
  }

  destroy() {
    for (const off of this.cleanup.splice(0)) {
      try { off(); } catch {}
    }
    this.releaseAll();
    this.endFrame();
  }
}

if (typeof window !== 'undefined') window.JaewoonInputActions = JaewoonInputActions;
