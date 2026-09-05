export class JaewoonVibeRuntime {
  constructor({ gameId = 'game', storagePrefix = 'jaewoon-games', autosaveDelay = 400 } = {}) {
    this.gameId = gameId;
    this.storageKey = `${storagePrefix}:${gameId}`;
    this.paused = false;
    this.autosaveDelay = Math.max(0, Number(autosaveDelay) || 0);
    this.autosaveTimer = null;
    this.defaultSettings = { music: 1, sfx: 1, vibration: true };
    this.settings = { ...this.defaultSettings, ...(this.load().settings || {}) };
    this.audio = new Map();
    this.cleanup = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(patch = {}) {
    const current = this.load();
    const next = { ...current, ...patch, updatedAt: Date.now() };
    try { localStorage.setItem(this.storageKey, JSON.stringify(next)); } catch {}
    return next;
  }

  saveProgress(progress) {
    return this.save({ progress });
  }

  queueSaveProgress(progress, delay = this.autosaveDelay) {
    clearTimeout(this.autosaveTimer);
    if (delay <= 0) return this.saveProgress(progress);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      this.saveProgress(progress);
    }, delay);
    return progress;
  }

  flushSaveProgress(progress) {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    return this.saveProgress(progress);
  }

  loadProgress(fallback = {}) {
    return this.load().progress ?? fallback;
  }

  setSetting(name, value) {
    this.settings = { ...this.settings, [name]: value };
    this.save({ settings: this.settings });
    this.applyAudioSettings();
    return this.settings;
  }

  setPaused(value, reason = 'manual') {
    this.paused = Boolean(value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jaewoon:pause', {
        detail: { paused: this.paused, reason }
      }));
    }
    return this.paused;
  }

  togglePause() {
    return this.setPaused(!this.paused);
  }

  installVisibilityPause({ pauseWhenHidden = true } = {}) {
    const handler = () => {
      if (pauseWhenHidden && document.hidden && !this.paused) this.setPaused(true, 'hidden');
      window.dispatchEvent(new CustomEvent('jaewoon:visibility', {
        detail: { hidden: document.hidden }
      }));
    };
    document.addEventListener('visibilitychange', handler);
    const off = () => document.removeEventListener('visibilitychange', handler);
    this.cleanup.push(off);
    return off;
  }

  async fullscreen(element = document.documentElement) {
    try {
      if (!document.fullscreenElement) await element.requestFullscreen?.();
      else await document.exitFullscreen?.();
      return true;
    } catch {
      return false;
    }
  }

  vibrate(pattern = 20) {
    if (this.settings.vibration !== false) navigator.vibrate?.(pattern);
  }

  registerAudio(name, audio, kind = 'sfx', baseVolume = 1) {
    if (!name || !audio) return false;
    audio.dataset.kind = kind === 'music' ? 'music' : 'sfx';
    audio.dataset.baseVolume = String(Math.max(0, Math.min(1, Number(baseVolume) || 0)));
    this.audio.set(name, audio);
    this.applyAudioSettings();
    return true;
  }

  applyAudioSettings() {
    for (const audio of this.audio.values()) {
      const kind = audio.dataset?.kind === 'music' ? 'music' : 'sfx';
      const setting = Number(this.settings[kind] ?? 1);
      const base = Number(audio.dataset?.baseVolume ?? 1);
      audio.volume = Math.max(0, Math.min(1, base * setting));
    }
  }

  safePlay(audio, volume = 1) {
    if (!audio) return false;
    const kind = audio.dataset?.kind === 'music' ? 'music' : 'sfx';
    const setting = Number(this.settings[kind] ?? 1);
    audio.volume = Math.max(0, Math.min(1, volume * setting));
    const promise = audio.play?.();
    promise?.catch?.(() => {});
    return true;
  }

  playAudio(name, { restart = false } = {}) {
    const audio = this.audio.get(name);
    if (!audio) return false;
    if (restart) {
      try { audio.currentTime = 0; } catch {}
    }
    const base = Number(audio.dataset?.baseVolume ?? 1);
    return this.safePlay(audio, base);
  }

  stopAudio(name, { reset = true } = {}) {
    const audio = this.audio.get(name);
    if (!audio) return false;
    audio.pause?.();
    if (reset) {
      try { audio.currentTime = 0; } catch {}
    }
    return true;
  }

  bindTouchButton(element, handler) {
    if (!element || !handler) return () => {};
    const onPointer = (event) => {
      event.preventDefault();
      handler(event);
    };
    element.addEventListener('pointerdown', onPointer, { passive: false });
    const off = () => element.removeEventListener('pointerdown', onPointer);
    this.cleanup.push(off);
    return off;
  }

  bindKeyboard(bindings = {}) {
    const held = new Set();
    const down = (event) => {
      if (event.repeat) return;
      held.add(event.code);
      bindings[event.code]?.down?.(event);
    };
    const up = (event) => {
      held.delete(event.code);
      bindings[event.code]?.up?.(event);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const off = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      held.clear();
    };
    this.cleanup.push(off);
    return { held, off };
  }

  emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(`jaewoon:${name}`, { detail }));
  }

  installGlobalErrorReporter(onError = console.error) {
    const errorHandler = (event) => onError({ type: 'error', message: event.message, error: event.error });
    const rejectionHandler = (event) => onError({ type: 'unhandledrejection', reason: event.reason });
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    const off = () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
    this.cleanup.push(off);
    return off;
  }

  boot({ visibilityPause = true, errorReporter = console.error } = {}) {
    this.applyAudioSettings();
    if (visibilityPause) this.installVisibilityPause();
    if (errorReporter) this.installGlobalErrorReporter(errorReporter);
    this.emit('boot', { gameId: this.gameId, settings: this.settings });
    return this;
  }

  destroy() {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    for (const off of this.cleanup.splice(0)) {
      try { off(); } catch {}
    }
    for (const audio of this.audio.values()) audio.pause?.();
    this.audio.clear();
  }
}

if (typeof window !== 'undefined') window.JaewoonVibeRuntime = JaewoonVibeRuntime;
