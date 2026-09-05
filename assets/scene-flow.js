function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeScene(name, scene = {}) {
  const key = String(name || '').trim();
  if (!key) throw new Error('scene name required');
  return {
    name: key,
    enter: typeof scene.enter === 'function' ? scene.enter : null,
    exit: typeof scene.exit === 'function' ? scene.exit : null,
    snapshot: typeof scene.snapshot === 'function' ? scene.snapshot : null,
    restore: typeof scene.restore === 'function' ? scene.restore : null,
  };
}

export class JaewoonSceneFlow {
  constructor({ scenes = {}, initialScene = null, historyLimit = 32 } = {}) {
    this.scenes = new Map();
    this.current = null;
    this.currentData = null;
    this.history = [];
    this.checkpoints = new Map();
    this.historyLimit = Math.max(1, Math.floor(Number(historyLimit) || 32));

    for (const [name, scene] of Object.entries(scenes || {})) this.register(name, scene);
    if (initialScene) this.go(initialScene, null, { recordHistory: false });
  }

  register(name, scene = {}) {
    const normalized = normalizeScene(name, scene);
    this.scenes.set(normalized.name, normalized);
    return normalized;
  }

  unregister(name) {
    return this.scenes.delete(String(name));
  }

  has(name) {
    return this.scenes.has(String(name));
  }

  scene(name) {
    return this.scenes.get(String(name)) || null;
  }

  go(name, data = null, { recordHistory = true, replaceHistory = false } = {}) {
    const target = this.scene(name);
    if (!target) throw new Error(`unknown scene: ${name}`);

    const previousName = this.current;
    const previousData = clone(this.currentData);
    const previousScene = previousName ? this.scene(previousName) : null;

    if (previousScene?.exit) {
      previousScene.exit({ from: previousName, to: target.name, data: clone(data) });
    }

    if (previousName && recordHistory) {
      const entry = { name: previousName, data: previousData };
      if (replaceHistory && this.history.length) this.history[this.history.length - 1] = entry;
      else this.history.push(entry);
      if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
    }

    this.current = target.name;
    this.currentData = clone(data);
    if (target.enter) target.enter({ from: previousName, to: target.name, data: clone(data) });
    return this.current;
  }

  back(fallback = null) {
    const previous = this.history.pop();
    if (previous) return this.go(previous.name, previous.data, { recordHistory: false });
    if (fallback) return this.go(fallback, null, { recordHistory: false });
    return this.current;
  }

  clearHistory() {
    this.history.length = 0;
  }

  checkpoint(label = 'default', extra = null) {
    const key = String(label || 'default');
    const currentScene = this.current ? this.scene(this.current) : null;
    const sceneState = currentScene?.snapshot ? currentScene.snapshot() : null;
    const point = {
      label: key,
      current: this.current,
      currentData: clone(this.currentData),
      sceneState: clone(sceneState),
      extra: clone(extra),
    };
    this.checkpoints.set(key, point);
    return clone(point);
  }

  restoreCheckpoint(label = 'default') {
    const key = String(label || 'default');
    const point = this.checkpoints.get(key);
    if (!point) return false;
    if (point.current) this.go(point.current, point.currentData, { recordHistory: false });
    const currentScene = this.current ? this.scene(this.current) : null;
    if (currentScene?.restore && point.sceneState != null) currentScene.restore(clone(point.sceneState));
    return clone(point);
  }

  snapshot() {
    const sceneStates = {};
    for (const [name, scene] of this.scenes) {
      if (scene.snapshot) sceneStates[name] = clone(scene.snapshot());
    }
    return {
      current: this.current,
      currentData: clone(this.currentData),
      history: clone(this.history),
      checkpoints: clone(Object.fromEntries(this.checkpoints)),
      sceneStates,
    };
  }

  restore(snapshot = {}) {
    const data = snapshot && typeof snapshot === 'object' ? snapshot : {};
    this.history = Array.isArray(data.history) ? clone(data.history).slice(-this.historyLimit) : [];
    this.checkpoints = new Map(Object.entries(data.checkpoints || {}).map(([key, value]) => [key, clone(value)]));

    for (const [name, state] of Object.entries(data.sceneStates || {})) {
      const scene = this.scene(name);
      if (scene?.restore) scene.restore(clone(state));
    }

    if (data.current && this.has(data.current)) {
      this.current = String(data.current);
      this.currentData = clone(data.currentData);
      return true;
    }
    return false;
  }

  reset() {
    this.current = null;
    this.currentData = null;
    this.history.length = 0;
    this.checkpoints.clear();
  }
}

export function createSceneFlow(options = {}) {
  return new JaewoonSceneFlow(options);
}

if (typeof window !== 'undefined') {
  window.JaewoonSceneFlow = JaewoonSceneFlow;
  window.createJaewoonSceneFlow = createSceneFlow;
}
