import { JaewoonVibeRuntime } from './vibe-runtime.js';
import { JaewoonGameLoop } from './game-loop.js';
import { JaewoonInputActions } from './input-actions.js';
import { JaewoonSceneFlow } from './scene-flow.js';
import { JaewoonStateMachine } from './state-machine.js';
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
    loopOptions = {},
    inputOptions = {},
    sceneOptions = {},
    stateMachines = {},
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
    this.loop = new JaewoonGameLoop(loopOptions);
    this.input = new JaewoonInputActions(inputOptions);
    this.scenes = new JaewoonSceneFlow(sceneOptions);
    this.stateMachines = new Map();
    for (const [id, options] of Object.entries(stateMachines || {})) this.createStateMachine(id, options);
    this.started = false;
    this.meta = {};

    if (autoRestore) this.restore();
  }

  start({
    bootRuntime = true,
    startLoop = false,
    attachInput = true,
    visibilityPause = true,
    errorReporter = console.error,
  } = {}) {
    if (this.started) return this;
    if (bootRuntime && typeof window !== 'undefined') {
      this.runtime.boot({ visibilityPause, errorReporter });
    }
    if (attachInput && typeof window !== 'undefined') this.input.attachKeyboard(window);
    if (startLoop) this.loop.start();
    this.started = true;
    this.emit('session-start', { gameId: this.blueprint.gameId, systems: this.kit.enabledSystems() });
    return this;
  }

  setLoopCallbacks(callbacks = {}) {
    this.loop.setCallbacks(callbacks);
    return this;
  }

  defineInputAction(name, config = {}) {
    return this.input.defineAction(name, config);
  }

  registerScene(name, scene = {}) {
    return this.scenes.register(name, scene);
  }

  goToScene(name, data = null, options = {}) {
    const result = this.scenes.go(name, data, options);
    this.input.releaseAll();
    this.emit('session-scene', { gameId: this.blueprint.gameId, scene: result });
    return result;
  }

  backScene(fallback = null) {
    const result = this.scenes.back(fallback);
    this.input.releaseAll();
    this.emit('session-scene', { gameId: this.blueprint.gameId, scene: result });
    return result;
  }

  checkpointScene(label = 'default', extra = null) {
    return this.scenes.checkpoint(label, extra);
  }

  restoreSceneCheckpoint(label = 'default') {
    const result = this.scenes.restoreCheckpoint(label);
    if (result) {
      this.input.releaseAll();
      this.emit('session-scene', { gameId: this.blueprint.gameId, scene: this.scenes.current });
    }
    return result;
  }

  createStateMachine(id, options = {}) {
    const key = String(id || '').trim();
    if (!key) throw new Error('state machine id required');
    if (this.stateMachines.has(key)) throw new Error(`state machine already exists: ${key}`);
    const machine = new JaewoonStateMachine({ ...options, id: key });
    this.stateMachines.set(key, machine);
    return machine;
  }

  getStateMachine(id) {
    return this.stateMachines.get(String(id)) || null;
  }

  removeStateMachine(id) {
    return this.stateMachines.delete(String(id));
  }

  updateStateMachines(delta, data = null) {
    const results = {};
    for (const [id, machine] of this.stateMachines) results[id] = machine.update(delta, data);
    return results;
  }

  setPaused(value, reason = 'manual') {
    const paused = Boolean(value);
    this.runtime.setPaused(paused, reason);
    this.loop.setPaused(paused);
    if (paused) this.input.releaseAll();
    this.emit('session-pause', { gameId: this.blueprint.gameId, paused, reason });
    return paused;
  }

  pause(reason = 'manual') { return this.setPaused(true, reason); }
  resume(reason = 'manual') { return this.setPaused(false, reason); }
  togglePause(reason = 'manual') { return this.setPaused(!this.loop.paused, reason); }

  snapshot(extra = {}) {
    return {
      sessionVersion: 1,
      gameId: this.blueprint.gameId,
      kit: this.kit.snapshot(),
      scenes: this.scenes.snapshot(),
      stateMachines: Object.fromEntries([...this.stateMachines].map(([id, machine]) => [id, machine.snapshot()])),
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
    if (session?.scenes) this.scenes.restore(session.scenes);
    if (session?.stateMachines && typeof session.stateMachines === 'object') {
      for (const [id, snapshot] of Object.entries(session.stateMachines)) {
        const machine = this.stateMachines.get(id);
        if (machine) machine.restore(snapshot);
      }
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
    this.loop.stop();
    this.input.destroy();
    this.scenes.reset();
    for (const machine of this.stateMachines.values()) machine.reset();
    this.stateMachines.clear();
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
