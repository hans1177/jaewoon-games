// 파일명: assets/vibe-runtime.js
// 역할: 웹게임 공통 저장·자동저장·오디오·일시정지·터치·오류 처리 런타임
// 규칙: 게임별 저장 키 보존, 자동저장은 지연 저장 + 백그라운드 이탈 즉시 저장, 저장 실패가 게임 진행을 막지 않음

export class JaewoonVibeRuntime {
  constructor({ gameId = 'game', storagePrefix = 'jaewoon-games', autosaveDelay = 400, autosaveOnHide = true } = {}) {
    this.gameId = gameId;
    this.storageKey = `${storagePrefix}:${gameId}`;
    this.paused = false;
    this.autosaveDelay = Math.max(0, Number(autosaveDelay) || 0);
    this.autosaveOnHide = Boolean(autosaveOnHide);
    this.autosaveTimer = null;
    this.pendingProgress = null;
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
    this.pendingProgress = progress ?? null;
    return this.save({ progress: this.pendingProgress });
  }

  queueSaveProgress(progress, delay = this.autosaveDelay) {
    this.pendingProgress = progress ?? null;
    clearTimeout(this.autosaveTimer);
    if (delay <= 0) return this.flushSaveProgress();
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      this.saveProgress(this.pendingProgress);
    }, Math.max(0, Number(delay) || 0));
    return this.pendingProgress;
  }

  flushSaveProgress(progress = this.pendingProgress) {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    if (progress == null && this.pendingProgress == null) return this.load();
    this.pendingProgress = progress ?? null;
    return this.save({ progress: this.pendingProgress });
  }

  loadProgress(fallback = {}) {
    const progress = this.load().progress;
    this.pendingProgress = progress ?? null;
    return progress ?? fallback;
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

  installVisibilityPause({ pauseWhenHidden = true, saveWhenHidden = this.autosaveOnHide } = {}) {
    const handler = () => {
      if (document.hidden && saveWhenHidden) this.flushSaveProgress();
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

  installPageExitSave() {
    if (typeof window === 'undefined') return () => {};
    const handler = () => this.flushSaveProgress();
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    const off = () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
    };
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

  boot({ visibilityPause = true, errorReporter = console.error, pageExitSave = true } = {}) {
    this.applyAudioSettings();
    if (visibilityPause) this.installVisibilityPause();
    if (pageExitSave) this.installPageExitSave();
    if (errorReporter) this.installGlobalErrorReporter(errorReporter);
    this.emit('boot', { gameId: this.gameId, settings: this.settings });
    return this;
  }

  destroy() {
    this.flushSaveProgress();
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    for (const off of this.cleanup.splice(0)) {
      try { off(); } catch {}
    }
    for (const audio of this.audio.values()) audio.pause?.();
    this.audio.clear();
    this.pendingProgress = null;
  }
}

if (typeof window !== 'undefined') window.JaewoonVibeRuntime = JaewoonVibeRuntime;
