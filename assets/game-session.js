import { JaewoonVibeRuntime } from './vibe-runtime.js';
import { buildGameBlueprint } from './game-blueprint.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class JaewoonGameSession {
  constructor({
    gameId = 'game',
    genre,
    mixGenres = [],
    presetOptions = {},
    kitOptions = {},
    useGenreDefaults = true,
    runtimeOptions = {},
    autoRestore = true,
  } = {}) {
    this.blueprint = buildGameBlueprint({
      gameId,
      genre,
      mixGenres,
      presetOptions,
      kitOptions,
      useGenreDefaults,
    });
    this.kit = this.blueprint.createKit();
    this.runtime = new JaewoonVibeRuntime({ gameId: this.blueprint.gameId, ...runtimeOptions });
    this.started = false;
    this.meta = {};

    if (autoRestore) this.restore();
  }

  start({ bootRuntime = true, visibilityPause = true, errorReporter = console.error } = {}) {
    if (this.started) return this;
    if (bootRuntime && typeof window !== 'undefined') {
      this.runtime.boot({ visibilityPause, errorReporter });
    }
    this.started = true;
    this.emit('session-start', { gameId: this.blueprint.gameId, systems: this.kit.enabledSystems() });
    return this;
  }

  snapshot(extra = {}) {
    return {
      sessionVersion: 1,
      gameId: this.blueprint.gameId,
      kit: this.kit.snapshot(),
      meta: clone({ ...this.meta, ...extra }) || {},
    };
  }

  save(extra = {}) {
    const progress = this.kit.has('save') ? this.kit.wrapSave({ session: this.snapshot(extra) }) : this.snapshot(extra);
    this.runtime.saveProgress(progress);
    this.emit('session-save', { gameId: this.blueprint.gameId });
    return progress;
  }

  queueSave(extra = {}, delay) {
    const progress = this.kit.has('save') ? this.kit.wrapSave({ session: this.snapshot(extra) }) : this.snapshot(extra);
    this.runtime.queueSaveProgress(progress, delay);
    return progress;
  }

  restore(progress = null) {
    const stored = progress ?? this.runtime.loadProgress(null);
    if (!stored) return false;

    const wrappedData = stored?.data && stored?.version ? stored.data : stored;
    const session = wrappedData?.extra?.session || wrappedData;
    const gameId = String(session?.gameId || wrappedData?.gameId || '');
    if (gameId && gameId !== this.blueprint.gameId) throw new Error('game id mismatch');

    if (wrappedData?.state) {
      this.kit.restoreState(wrappedData);
    } else if (session?.kit) {
      this.kit.restoreState(session.kit);
    }
    this.meta = clone(session?.meta || {}) || {};
    this.emit('session-restore', { gameId: this.blueprint.gameId });
    return true;
  }

  setMeta(key, value) {
    this.meta[String(key)] = clone(value);
    return this.meta[String(key)];
  }

  emit(name, detail = {}) {
    if (typeof window !== 'undefined') this.runtime.emit(name, detail);
  }

  destroy({ save = false } = {}) {
    if (save) this.save();
    this.runtime.destroy();
    this.started = false;
  }
}

export function createGameSession(options = {}) {
  return new JaewoonGameSession(options);
}

if (typeof window !== 'undefined') {
  window.JaewoonGameSession = JaewoonGameSession;
  window.createJaewoonGameSession = createGameSession;
}
