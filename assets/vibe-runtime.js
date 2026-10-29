// 파일명: assets/vibe-runtime.js
// 역할: 웹게임 공통 저장·자동저장·오디오·일시정지·터치·오류 처리 런타임
// 규칙: 게임별 저장 키 보존, 자동저장은 지연 저장 + 백그라운드 이탈 즉시 저장, 저장 실패가 게임 진행을 막지 않음

export class JaewoonVibeRuntime {
  constructor({ gameId = 'game', storagePrefix = 'jaewoon-games', autosaveDelay = 400, autosaveOnHide = true, assetBaseUrl = null, assetMemoryLimitBytes = 64 * 1024 * 1024 } = {}) {
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
    this.assetMemoryLimitBytes = Number.isFinite(Number(assetMemoryLimitBytes)) ? Math.max(0, Number(assetMemoryLimitBytes)) : 64 * 1024 * 1024;
    this.preloadedScenes = new Map();
    this.preloadTasks = new Map();
    this.assetVersions = new Map();
    this.assetSignatures = new Map();
    // [씬 소유권] 현재 씬의 임대를 추적하고, 전환 경쟁에서 오래된 결과가 화면을 덮지 못하게 한다.
    this.sceneAssets = new Map();
    this.activeSceneId = null;
    this.sceneTransition = 0;
    this.pendingSceneController = null;
    this.pendingSceneId = null;
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
        return { value: audio, objectUrl, bytes: bytes.size };
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
      }
    }
    if (type === 'font') {
      if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) throw new Error('font loader unavailable');
      const fontBytes = await response.arrayBuffer();
      const font = new FontFace(family, fontBytes);
      await font.load();
      if (signal?.aborted) throw aborted();
      document.fonts.add(font);
      return { value: font, registeredFont: font, bytes: fontBytes.byteLength };
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
    const revision = this.assetVersions.get(url) || 0;
    const key = JSON.stringify([kind, url, kind === 'font' ? fontFamily : '', revision]);
    const requestUrl = revision && /^https?:/.test(url) ? (() => {
      const fresh = new URL(url);
      fresh.searchParams.set('_vibe_asset_revision', String(revision));
      return fresh.href;
    })() : url;
    let entry = this.assetCache.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { key, refs: 0, resource: null, promise: null, controller, bytes: 0 };
      this.assetCache.set(key, entry);
      entry.promise = this.readAsset({ url: requestUrl, type: kind, family: fontFamily, signal: controller.signal }).then(resource => {
        entry.resource = resource;
        const value = resource.value;
        entry.bytes = Math.max(0, Number(resource.bytes) || (kind === 'image'
          ? (Number(value.naturalWidth || value.width) || 0) * (Number(value.naturalHeight || value.height) || 0) * 4
          : kind === 'binary' ? value.byteLength : kind === 'text' ? value.length * 2
          : kind === 'json' ? JSON.stringify(value).length * 2 : 0));
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

  // [에셋 해제] 콜백·매체 오류에도 참조와 브라우저 자원을 끝까지 정리한다.
  disposeAssetEntry(entry) {
    if (this.assetCache.get(entry.key) === entry) this.assetCache.delete(entry.key);
    const resource = entry.resource;
    if (!resource) return;
    entry.resource = null;
    const value = resource.value;
    if (resource.registeredFont) {
      try { document.fonts.delete(resource.registeredFont); } catch {}
    }
    if (resource.objectUrl) {
      for (const [name, registered] of this.audio) {
        if (registered === value) this.audio.delete(name);
      }
      try { value.pause?.(); } catch {}
      try { value.removeAttribute?.('src'); } catch {}
      try { value.load?.(); } catch {}
      URL.revokeObjectURL(resource.objectUrl);
    } else if (typeof Image !== 'undefined' && value instanceof Image) {
      try { value.src = ''; } catch {}
    }
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

  // [에셋 상태] 실제 캐시와 임대를 기준으로 메모리 점검용 불변 스냅샷을 제공한다.
  getAssetStats() {
    const byType = { image: 0, audio: 0, json: 0, text: 0, binary: 0, font: 0 };
    let ready = 0, loading = 0, references = 0, estimatedBytes = 0;
    for (const entry of this.assetCache.values()) {
      const kind = JSON.parse(entry.key)[0];
      if (Object.hasOwn(byType, kind)) byType[kind]++;
      if (entry.resource) ready++;
      else loading++;
      references += entry.refs;
      estimatedBytes += entry.bytes || 0;
    }
    return Object.freeze({
      total: this.assetCache.size, ready, loading, references,
      activeSceneId: this.activeSceneId, pendingSceneId: this.pendingSceneId,
      sceneCount: this.sceneAssets.size, preloadedSceneCount: this.preloadedScenes.size,
      estimatedBytes, memoryLimitBytes: this.assetMemoryLimitBytes,
      overBudget: this.assetMemoryLimitBytes > 0 && estimatedBytes > this.assetMemoryLimitBytes,
      byType: Object.freeze(byType)
    });
  }

  // [에셋 큐] 공유 참조·중복 제거를 유지하며 실패 유형별 재시도와 취소 가능한 대기를 수행한다.
  async loadAssets(entries, {
    concurrency = 4, onProgress = null, onComplete = null, signal = null,
    retries = 1, timeoutMs = 30000, retryDelayMs = 120
  } = {}) {
    if (!Array.isArray(entries)) throw new Error('asset list required');
    if (this.destroyed) throw new Error('runtime destroyed');
    const items = entries.map(item => typeof item === 'string' ? { path: item, id: item } : item);
    const ids = new Set();
    for (const item of items) {
      if (!item || !item.path || !item.id || ids.has(String(item.id))) throw new Error('invalid or duplicate asset id');
      ids.add(String(item.id));
    }
    // [의존성] 완료된 선행 에셋만 다음 배치에 넣고, 순환/누락 의존성을 조기에 차단한다.
    const remaining = new Map(items.map(item => [String(item.id), item]));
    const scheduled = new Set();
    const batches = [];
    for (const item of items) {
      if (item.dependsOn != null && (!Array.isArray(item.dependsOn)
        || item.dependsOn.some(id => !ids.has(String(id)) || String(id) === String(item.id)))) {
        throw new Error('invalid asset dependency: ' + item.id);
      }
    }
    while (remaining.size) {
      const ready = [...remaining.values()].filter(item => (item.dependsOn || []).every(id => scheduled.has(String(id))));
      if (!ready.length) throw new Error('circular asset dependencies');
      ready.sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
      batches.push(ready);
      for (const item of ready) {
        remaining.delete(String(item.id));
        scheduled.add(String(item.id));
      }
    }
    const total = items.length;
    const assets = Object.create(null);
    const leases = [];
    const errors = [];
    const retryCount = Number.isFinite(Number(retries)) ? Math.max(0, Math.min(5, Math.floor(Number(retries)))) : 1;
    const deadline = Number.isFinite(Number(timeoutMs)) ? Math.max(0, Number(timeoutMs)) : 30000;
    const retryDelay = Number.isFinite(Number(retryDelayMs)) ? Math.max(0, Math.min(2000, Number(retryDelayMs))) : 120;
    const abortError = () => Object.assign(new Error('asset loading aborted'), { name: 'AbortError' });
    let loaded = 0, failed = 0;
    const failedIds = new Set();
    const notify = (event, detail) => {
      try { if (typeof window !== 'undefined') this.emit(event, detail); } catch {}
    };
    const report = () => {
      const state = Object.freeze({ loaded, failed, total, completed: loaded + failed, progress: total ? (loaded + failed) / total : 1 });
      try { onProgress?.(state); } catch {}
      notify('assets-progress', state);
      notify('assets-stats', this.getAssetDiagnostics());
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
      const onAbort = () => finish(reject, abortError());
      // Always attach rejection handlers, including an already-aborted consumer.
      promise.then(value => finish(resolve, value), error => finish(reject, error));
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
      else if (deadline > 0) timer = setTimeout(() => finish(reject,
        Object.assign(new Error('asset loading timeout'), { name: 'TimeoutError' })), deadline);
    });
    const pause = ms => new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(abortError()); return; }
      let timer = null;
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(abortError());
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
    });
    report();
    for (const batch of batches) {
    let next = 0;
    const worker = async () => {
      while (next < batch.length && !signal?.aborted && !this.destroyed) {
        const item = batch[next++];
        try {
          if ((item.dependsOn || []).some(id => failedIds.has(String(id)))) throw new Error('asset dependency failed: ' + item.id);
          for (let attempt = 0; attempt <= retryCount; attempt++) {
            if (signal?.aborted || this.destroyed) throw abortError();
            let lease = null;
            try {
              lease = this.acquireAsset(item);
              const value = await wait(lease.promise);
              if (signal?.aborted || this.destroyed) throw abortError();
              leases.push(lease.key);
              assets[item.id] = value;
              loaded++;
              break;
            } catch (error) {
              if (lease) this.releaseAsset(lease.key);
              const retryable = Boolean(lease) && (
                error.name === 'TimeoutError'
                || error.name === 'TypeError'
                || error.status === 408 || error.status === 429
                || error.status >= 500 || /^image load failed:/.test(error.message || '')
              );
              if (signal?.aborted || this.destroyed || error.name === 'AbortError' || !retryable || attempt === retryCount) throw error;
              if (retryDelay) await pause(Math.min(2000, retryDelay * 2 ** attempt));
            }
          }
        } catch (error) {
          errors.push(error);
          failedIds.add(String(item.id));
          failed++;
        }
        report();
      }
    };
    await Promise.all(Array.from({ length: Math.min(batch.length, Math.max(1, Math.floor(Number(concurrency) || 4))) }, worker));
    }
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      for (const key of leases) this.releaseAsset(key);
    };
    const status = Object.freeze({ ok: errors.length === 0 && !signal?.aborted && !this.destroyed, loaded, failed, total });
    notify('assets-complete', status);
    try { onComplete?.(status); } catch {}
    if (!status.ok) {
      release();
      throw new AggregateError(errors.length ? errors : [abortError()], 'asset loading failed');
    }
    return { assets, ...status, release };
  }

  // [씬 전환] 성공할 때만 씬을 교체하고, 이전 씬·공용 자원의 소유권을 정확히 이동한다.
  async setScene(sceneId, entries, options = {}) {
    const id = String(sceneId ?? '').trim();
    if (!id) throw new Error('scene id required');
    if (this.destroyed) throw new Error('runtime destroyed');
    const version = ++this.sceneTransition;
    this.pendingSceneController?.abort();
    const controller = new AbortController();
    this.pendingSceneController = controller;
    this.pendingSceneId = id;
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
      const signature = JSON.stringify(entries);
      const pending = this.preloadTasks.get(id);
      if (pending?.signature === signature) {
        try { await pending.promise; } catch { /* 배경 선행 로딩 실패 시 일반 씬 로딩으로 복구 */ }
      }
      const prefetched = this.preloadedScenes.get(id);
      if (prefetched && prefetched.signature !== signature) {
        this.preloadedScenes.delete(id);
        prefetched.lease.release();
      }
      const cached = this.preloadedScenes.get(id);
      const lease = cached ? cached.lease : await this.loadAssets(entries, { ...options, signal: controller.signal });
      if (controller.signal.aborted || this.destroyed || version !== this.sceneTransition) {
        if (cached) this.preloadedScenes.delete(id);
        lease.release();
        throw Object.assign(new Error('scene transition aborted'), { name: 'AbortError' });
      }
      if (cached) this.preloadedScenes.delete(id);
      const old = this.sceneAssets.get(this.activeSceneId);
      this.sceneAssets.clear();
      this.sceneAssets.set(id, lease);
      this.activeSceneId = id;
      old?.release();
      this.trimAssetCache();
      if (typeof window !== 'undefined') this.emit('assets-stats', this.getAssetDiagnostics());
      return {
        sceneId: id,
        assets: lease.assets,
        release: () => { if (this.sceneAssets.get(id) === lease) this.releaseScene(id); }
      };
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
      if (this.pendingSceneController === controller) {
        this.pendingSceneController = null;
        this.pendingSceneId = null;
      }
    }
  }

  // [씬 취소] 아직 씬이 활성화되기 전에도 진행 중인 전환만 안전하게 중단한다.
  cancelSceneLoading(sceneId = this.pendingSceneId) {
    if (!this.pendingSceneController || sceneId !== this.pendingSceneId) return false;
    ++this.sceneTransition;
    this.pendingSceneController.abort();
    this.pendingSceneController = null;
    this.pendingSceneId = null;
    return true;
  }

  // [씬 해제] 현재 씬 해제 또는 준비 중인 첫 씬 취소도 지원한다.
  releaseScene(sceneId = this.activeSceneId ?? this.pendingSceneId) {
    const active = sceneId != null && sceneId === this.activeSceneId;
    const cancelled = this.cancelSceneLoading(active ? this.pendingSceneId : sceneId);
    if (!active) return cancelled;
    ++this.sceneTransition;
    const lease = this.sceneAssets.get(sceneId);
    this.sceneAssets.delete(sceneId);
    this.activeSceneId = null;
    lease?.release();
    if (typeof window !== 'undefined') this.emit('assets-stats', this.getAssetDiagnostics());
    return Boolean(lease);
  }

  // [메모리] 활성 게임 임대는 절대 강제 해제하지 않고 오래된 선행 로딩부터 정리한다.
  setAssetMemoryLimit(bytes) {
    if (!Number.isFinite(Number(bytes)) || Number(bytes) < 0) throw new Error('invalid asset memory limit');
    this.assetMemoryLimitBytes = Number(bytes);
    this.trimAssetCache();
    return this.getAssetStats();
  }

  trimAssetCache() {
    let estimated = [...this.assetCache.values()].reduce((sum, entry) => sum + (entry.bytes || 0), 0);
    const evicted = [];
    if (this.assetMemoryLimitBytes > 0) {
      while (estimated > this.assetMemoryLimitBytes && this.preloadedScenes.size) {
        const [id, preload] = this.preloadedScenes.entries().next().value;
        this.preloadedScenes.delete(id);
        preload.lease.release();
        evicted.push(id);
        estimated = [...this.assetCache.values()].reduce((sum, entry) => sum + (entry.bytes || 0), 0);
      }
    }
    return Object.freeze({ evicted: Object.freeze(evicted), ...this.getAssetStats() });
  }

  // [선행 로딩] 다음 씬 소유 임대를 보관하되, 제한 초과 시 자동 해제한다.
  async preloadScene(sceneId, entries, options = {}) {
    const id = String(sceneId ?? '').trim();
    if (!id || !Array.isArray(entries)) throw new Error('invalid preload scene');
    if (this.destroyed) throw new Error('runtime destroyed');
    const signature = JSON.stringify(entries);
    const existing = this.preloadedScenes.get(id);
    if (existing?.signature === signature) return Object.freeze({ sceneId: id, ready: true, assets: existing.lease.assets });
    if (existing) {
      this.preloadedScenes.delete(id);
      existing.lease.release();
    }
    const pending = this.preloadTasks.get(id);
    if (pending?.signature === signature) return pending.promise;
    pending?.controller.abort();
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const promise = this.loadAssets(entries, { ...options, signal: controller.signal }).then(lease => {
      if (this.destroyed || controller.signal.aborted || this.preloadTasks.get(id)?.promise !== promise) {
        lease.release();
        return Object.freeze({ sceneId: id, ready: false });
      }
      this.preloadedScenes.set(id, { signature, entries, lease });
      this.trimAssetCache();
      if (typeof window !== 'undefined') this.emit('assets-stats', this.getAssetDiagnostics());
      return Object.freeze({ sceneId: id, ready: this.preloadedScenes.has(id), assets: this.preloadedScenes.has(id) ? lease.assets : null });
    }).finally(() => {
      options.signal?.removeEventListener('abort', onAbort);
      if (this.preloadTasks.get(id)?.promise === promise) this.preloadTasks.delete(id);
    });
    this.preloadTasks.set(id, { signature, entries, controller, promise });
    return promise;
  }

  // [에셋 변경] 사용 중인 리소스는 보존하고 다음 획득부터 새 버전을 요청한다.
  invalidateAsset(path) {
    const url = this.resolveAssetUrl(path);
    this.assetVersions.set(url, (this.assetVersions.get(url) || 0) + 1);
    for (const task of this.preloadTasks.values()) {
      if (task.entries.some(item => this.resolveAssetUrl(typeof item === 'string' ? item : item.path) === url)) task.controller.abort();
    }
    for (const [id, preload] of this.preloadedScenes) {
      if (!preload.entries || !preload.entries.some(item => this.resolveAssetUrl(typeof item === 'string' ? item : item.path) === url)) continue;
      this.preloadedScenes.delete(id);
      preload.lease.release();
    }
    return this.assetVersions.get(url);
  }

  // [변경 감지] ETag / Last-Modified 비교, 실패 시 현재 게임 에셋은 그대로 유지한다.
  async checkAssetUpdates(entries) {
    if (!Array.isArray(entries)) throw new Error('asset list required');
    const changed = [], errors = [];
    for (const item of entries) {
      const path = typeof item === 'string' ? item : item.path;
      const url = this.resolveAssetUrl(path);
      try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) throw new Error('asset check failed: ' + response.status);
        const signature = response.headers.get('etag') || response.headers.get('last-modified');
        if (!signature) continue;
        const previous = this.assetSignatures.get(url);
        this.assetSignatures.set(url, signature);
        if (previous != null && previous !== signature) {
          this.invalidateAsset(path);
          changed.push(path);
        }
      } catch (error) { errors.push(Object.freeze({ path, message: String(error.message || error) })); }
    }
    return Object.freeze({ checked: entries.length, changed: Object.freeze(changed), errors: Object.freeze(errors) });
  }

  // [자동 감시] 주기적 검사는 명시적으로 활성화된 게임 에셋만 확인한다.
  watchAssetUpdates(entries, { intervalMs = 120000 } = {}) {
    if (!Array.isArray(entries)) throw new Error('asset list required');
    if (this.destroyed) throw new Error('runtime destroyed');
    const delay = Number.isFinite(Number(intervalMs)) ? Math.max(30000, Number(intervalMs)) : 120000;
    const check = () => {
      if (this.destroyed) return;
      this.checkAssetUpdates(entries).then(result => {
        if (result.changed.length && typeof window !== 'undefined') {
          this.emit('assets-updated', result);
          this.emit('assets-stats', this.getAssetDiagnostics());
        }
      }).catch(() => {});
    };
    check();
    const timer = setInterval(check, delay);
    const off = () => clearInterval(timer);
    this.cleanup.push(off);
    return off;
  }

  // [진단] 실제 캐시와 씬 소유권만 읽으며 게임 데이터에는 접근하지 않는다.
  getAssetDiagnostics() {
    return Object.freeze({
      ...this.getAssetStats(),
      entries: Object.freeze([...this.assetCache.values()].map(entry => {
        const [type, url] = JSON.parse(entry.key);
        return Object.freeze({ type, url, references: entry.refs, ready: Boolean(entry.resource), estimatedBytes: entry.bytes || 0 });
      })),
      preloadedScenes: Object.freeze([...this.preloadedScenes.keys()])
    });
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
    this.pendingSceneId = null;
    for (const task of this.preloadTasks.values()) task.controller.abort();
    this.preloadTasks.clear();
    for (const preload of this.preloadedScenes.values()) preload.lease.release();
    this.preloadedScenes.clear();
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
