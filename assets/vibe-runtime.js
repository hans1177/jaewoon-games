// 파일명: assets/vibe-runtime.js
// 역할: 웹게임 공통 저장·자동저장·오디오·일시정지·터치·오류 처리 런타임
// 규칙: 게임별 저장 키 보존, 자동저장은 지연 저장 + 백그라운드 이탈 즉시 저장, 저장 실패가 게임 진행을 막지 않음

export class JaewoonVibeRuntime {
  constructor({ gameId = 'game', storagePrefix = 'jaewoon-games', autosaveDelay = 400, autosaveOnHide = true, assetBaseUrl = null } = {}) {
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
    // [에셋 경로] 로컬 페이지와 공통 assets 루트를 분리해 GitHub Pages 하위 배포 경로를 보존한다.
    const documentUrl = typeof document !== 'undefined' ? document.baseURI : import.meta.url;
    this.assetBaseUrl = assetBaseUrl == null
      ? documentUrl
      : new URL(String(assetBaseUrl).replace(/\/?$/, '/'), documentUrl).href;
    this.assetRootUrl = assetBaseUrl == null
      ? new URL('../', import.meta.url).href
      : this.assetBaseUrl;
    this.assetCache = new Map();
    // [씬 소유권] 현재 씬의 임대를 추적하고, 전환 경쟁에서 오래된 결과가 화면을 덮지 못하게 한다.
    this.sceneAssets = new Map();
    this.activeSceneId = null;
    this.sceneTransition = 0;
    this.pendingSceneController = null;
    this.destroyed = false;
  }

  // [에셋 경로] 일반 상대 경로는 게임 페이지 기준, /assets 등 루트 경로는 프로젝트 기준이다.
  resolveAssetUrl(path) {
    const value = String(path ?? '').trim();
    if (!value) throw new Error('asset path required');
    let url;
    if (value.startsWith('/') && !value.startsWith('//')) {
      const root = new URL(this.assetRootUrl);
      const absoluteInProject = root.pathname !== '/' && value.startsWith(root.pathname);
      url = absoluteInProject ? new URL(value, root.origin) : new URL(value.slice(1), root);
      if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname))
        throw new Error('asset path escapes project root');
    } else {
      url = new URL(value, this.assetBaseUrl);
    }
    if (!['http:', 'https:', 'blob:', 'data:'].includes(url.protocol)) throw new Error('unsafe asset URL');
    return url.href;
  }

  // [에셋 유형] 포맷별 결과를 명확히 구분한다.
  assetType(path) {
    const name = String(path).split(/[?#]/)[0].toLowerCase();
    if (/\.(?:png|jpe?g|webp|gif|svg|avif|bmp)$/.test(name)) return 'image';
    if (/\.(?:mp3|wav|ogg|m4a|aac|flac)$/.test(name)) return 'audio';
    if (/\.(?:woff2?|ttf|otf)$/.test(name)) return 'font';
    if (/\.json$/.test(name)) return 'json';
    if (/\.(?:txt|css|glsl|vert|frag)$/.test(name)) return 'text';
    return 'binary';
  }

  async fetchAsset(url, signal = null) {
    const response = await fetch(url, signal ? { signal } : undefined);
    if (!response.ok) {
      const error = new Error('asset fetch failed: ' + response.status + ' ' + url);
      error.status = response.status;
      throw error;
    }
    return response;
  }

  // [에셋 로딩] 실제 네트워크·이미지 요청을 취소하고 부분 등록된 오디오·폰트를 남기지 않는다.
  async readAsset({ url, type, family, signal = null }) {
    const aborted = () => Object.assign(new Error('asset loading aborted'), { name: 'AbortError' });
    if (signal?.aborted) throw aborted();
    if (type === 'image') {
      if (typeof Image === 'undefined') throw new Error('image loader unavailable');
      return new Promise((resolve, reject) => {
        const image = new Image();
        const finish = (callback, result) => {
          image.onload = null;
          image.onerror = null;
          signal?.removeEventListener('abort', onAbort);
          callback(result);
        };
        const onAbort = () => {
          image.src = '';
          finish(reject, aborted());
        };
        image.onload = () => finish(resolve, { value: image });
        image.onerror = () => finish(reject, new Error('image load failed: ' + url));
        signal?.addEventListener('abort', onAbort, { once: true });
        if (signal?.aborted) onAbort();
        else image.src = url;
      });
    }
    const response = await this.fetchAsset(url, signal);
    if (type === 'json') return { value: await response.json() };
    if (type === 'text') return { value: await response.text() };
    if (type === 'binary') return { value: await response.arrayBuffer() };
    if (type === 'audio') {
      const bytes = await response.blob();
      if (signal?.aborted) throw aborted();
      const objectUrl = URL.createObjectURL(bytes);
      try {
        if (typeof Audio === 'undefined') throw new Error('audio loader unavailable');
        const audio = new Audio(objectUrl);
        audio.preload = 'auto';
        if (signal?.aborted) throw aborted();
        return { value: audio, objectUrl };
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
      }
    }
    if (type === 'font') {
      if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) throw new Error('font loader unavailable');
      const font = new FontFace(family, await response.arrayBuffer());
      await font.load();
      if (signal?.aborted) throw aborted();
      document.fonts.add(font);
      return { value: font, registeredFont: font };
    }
    throw new Error('unsupported asset type: ' + type);
  }

  // [에셋 캐시] 하나의 씬 또는 호출이 해제해도 다른 참조는 유지한다.
  acquireAsset({ path, type, family }) {
    if (this.destroyed) throw new Error('runtime destroyed');
    const url = this.resolveAssetUrl(path);
    const kind = type || this.assetType(path);
    if (!['image', 'audio', 'json', 'text', 'binary', 'font'].includes(kind)) throw new Error('unsupported asset type: ' + kind);
    const fontFamily = family || path;
    const key = JSON.stringify([kind, url, kind === 'font' ? fontFamily : '']);
    let entry = this.assetCache.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { key, refs: 0, resource: null, promise: null, controller };
      this.assetCache.set(key, entry);
      entry.promise = this.readAsset({ url, type: kind, family: fontFamily, signal: controller.signal }).then(resource => {
        entry.resource = resource;
        if (entry.refs === 0 || this.destroyed) {
          this.disposeAssetEntry(entry);
          throw Object.assign(new Error('asset loading aborted'), { name: 'AbortError' });
        }
        return resource.value;
      }).catch(error => {
        if (this.assetCache.get(key) === entry) this.assetCache.delete(key);
        throw error;
      });
    }
    entry.refs += 1;
    return { key, promise: entry.promise };
  }

  disposeAssetEntry(entry) {
    if (this.assetCache.get(entry.key) === entry) this.assetCache.delete(entry.key);
    const resource = entry.resource;
    if (!resource) return;
    const value = resource.value;
    if (resource.registeredFont) document.fonts.delete(resource.registeredFont);
    if (resource.objectUrl) {
      value.pause?.();
      value.removeAttribute?.('src');
      value.load?.();
      URL.revokeObjectURL(resource.objectUrl);
    } else if (typeof Image !== 'undefined' && value instanceof Image) {
      value.src = '';
    }
    entry.resource = null;
  }

  releaseAsset(key) {
    const entry = this.assetCache.get(key);
    if (!entry || entry.refs <= 0) return false;
    entry.refs -= 1;
    if (entry.refs === 0) {
      if (entry.resource) this.disposeAssetEntry(entry);
      else {
        this.assetCache.delete(key);
        entry.controller.abort();
      }
    }
    return true;
  }

  // [에셋 큐] 공유 요청은 참조 수로 보호하고, 개별 대기는 취소·재시도·시간 제한을 지원한다.
  async loadAssets(entries, { concurrency = 4, onProgress = null, onComplete = null, signal = null, retries = 1, timeoutMs = 30000 } = {}) {
    if (!Array.isArray(entries)) throw new Error('asset list required');
    if (this.destroyed) throw new Error('runtime destroyed');
    const items = entries.map(item => typeof item === 'string' ? { path: item, id: item } : item);
    const ids = new Set();
    for (const item of items) {
      if (!item || !item.path || !item.id || ids.has(String(item.id))) throw new Error('invalid or duplicate asset id');
      ids.add(String(item.id));
    }
    const total = items.length;
    const assets = Object.create(null);
    const leases = [];
    const errors = [];
    const retryCount = Math.max(0, Math.min(5, Math.floor(Number(retries) || 0)));
    const deadline = Math.max(0, Number(timeoutMs) || 0);
    let next = 0, loaded = 0, failed = 0;
    const notify = (event, detail) => {
      if (typeof window !== 'undefined') this.emit(event, detail);
    };
    const report = () => {
      const state = Object.freeze({ loaded, failed, total, completed: loaded + failed, progress: total ? (loaded + failed) / total : 1 });
      onProgress?.(state);
      notify('assets-progress', state);
    };
    const wait = promise => new Promise((resolve, reject) => {
      let timer = null, settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        callback(value);
      };
      const onAbort = () => finish(reject, Object.assign(new Error('asset loading aborted'), { name: 'AbortError' }));
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) { onAbort(); return; }
      if (deadline > 0) timer = setTimeout(() => finish(reject, Object.assign(new Error('asset loading timeout'), { name: 'TimeoutError' })), deadline);
      promise.then(value => finish(resolve, value), error => finish(reject, error));
    });
    report();
    const worker = async () => {
      while (next < total && !signal?.aborted) {
        const item = items[next++];
        try {
          for (let attempt = 0; attempt <= retryCount; attempt++) {
            if (signal?.aborted) throw Object.assign(new Error('asset loading aborted'), { name: 'AbortError' });
            let lease = null;
            try {
              lease = this.acquireAsset(item);
              const value = await wait(lease.promise);
              leases.push(lease.key);
              assets[item.id] = value;
              loaded++;
              break;
            } catch (error) {
              if (lease) this.releaseAsset(lease.key);
              if (signal?.aborted || error.name === 'AbortError' || [400, 401, 403, 404].includes(error.status) || attempt === retryCount) throw error;
            }
          }
        } catch (error) {
          errors.push(error);
          failed++;
        }
        report();
      }
    };
    await Promise.all(Array.from({ length: Math.min(total, Math.max(1, Math.floor(Number(concurrency) || 4))) }, worker));
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      for (const key of leases) this.releaseAsset(key);
    };
    const status = Object.freeze({ ok: errors.length === 0 && !signal?.aborted, loaded, failed, total });
    notify('assets-complete', status);
    onComplete?.(status);
    if (!status.ok) {
      release();
      throw new AggregateError(errors.length ? errors : [Object.assign(new Error('asset loading aborted'), { name: 'AbortError' })], 'asset loading failed');
    }
    return { assets, ...status, release };
  }

  // [씬 전환] 새 씬을 준비하는 동안 이전 씬을 유지하며, 성공할 때만 참조를 교체한다.
  async setScene(sceneId, entries, options = {}) {
    const id = String(sceneId ?? '').trim();
    if (!id) throw new Error('scene id required');
    if (this.destroyed) throw new Error('runtime destroyed');
    const version = ++this.sceneTransition;
    this.pendingSceneController?.abort();
    const controller = new AbortController();
    this.pendingSceneController = controller;
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
      const lease = await this.loadAssets(entries, { ...options, signal: controller.signal });
      if (controller.signal.aborted || this.destroyed || version !== this.sceneTransition) {
        lease.release();
        throw Object.assign(new Error('scene transition aborted'), { name: 'AbortError' });
      }
      const old = this.sceneAssets.get(this.activeSceneId);
      this.sceneAssets.clear();
      this.sceneAssets.set(id, lease);
      this.activeSceneId = id;
      old?.release();
      return {
        sceneId: id,
        assets: lease.assets,
        release: () => { if (this.sceneAssets.get(id) === lease) this.releaseScene(id); }
      };
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
      if (this.pendingSceneController === controller) this.pendingSceneController = null;
    }
  }

  // [씬 해제] 반환된 씬 임대의 release 또는 직접 호출로 현재 씬 에셋을 정리한다.
  releaseScene(sceneId = this.activeSceneId) {
    if (sceneId == null || sceneId !== this.activeSceneId) return false;
    ++this.sceneTransition;
    this.pendingSceneController?.abort();
    const lease = this.sceneAssets.get(sceneId);
    this.sceneAssets.delete(sceneId);
    this.activeSceneId = null;
    lease?.release();
    return Boolean(lease);
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
    if (this.destroyed) return;
    this.destroyed = true;
    ++this.sceneTransition;
    this.pendingSceneController?.abort();
    this.pendingSceneController = null;
    for (const lease of this.sceneAssets.values()) lease.release();
    this.sceneAssets.clear();
    this.activeSceneId = null;
    this.flushSaveProgress();
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    for (const off of this.cleanup.splice(0)) {
      try { off(); } catch {}
    }
    for (const entry of this.assetCache.values()) {
      entry.refs = 0;
      if (entry.resource) this.disposeAssetEntry(entry);
      else entry.controller.abort();
    }
    this.assetCache.clear();
    for (const audio of this.audio.values()) audio.pause?.();
    this.audio.clear();
    this.pendingProgress = null;
  }
}

if (typeof window !== 'undefined') window.JaewoonVibeRuntime = JaewoonVibeRuntime;
