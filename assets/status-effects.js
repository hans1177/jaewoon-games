function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function positiveInt(value, fallback = 1) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeEffect(effect = {}) {
  const id = String(effect.id || effect.effectId || '').trim();
  if (!id) throw new Error('status effect id required');
  const duration = finiteNonNegative(effect.duration, 0);
  const tickInterval = finiteNonNegative(effect.tickInterval, 0);
  const stackMode = ['refresh', 'stack', 'replace'].includes(String(effect.stackMode)) ? String(effect.stackMode) : 'refresh';
  return {
    id,
    kind: String(effect.kind || id),
    source: effect.source == null ? null : String(effect.source),
    duration,
    remaining: effect.remaining == null ? duration : finiteNonNegative(effect.remaining, duration),
    tickInterval,
    tickRemaining: effect.tickRemaining == null ? tickInterval : finiteNonNegative(effect.tickRemaining, tickInterval),
    stacks: positiveInt(effect.stacks, 1),
    maxStacks: positiveInt(effect.maxStacks, 1),
    stackMode,
    magnitude: Number.isFinite(Number(effect.magnitude)) ? Number(effect.magnitude) : 0,
    data: clone(effect.data || {}) || {},
    tags: Array.isArray(effect.tags) ? [...new Set(effect.tags.map(String))] : [],
  };
}

export class JaewoonStatusEffects {
  constructor({ paused = false } = {}) {
    this.entities = new Map();
    this.paused = Boolean(paused);
  }

  _bucket(entityId, create = false) {
    const key = String(entityId || '').trim();
    if (!key) throw new Error('entity id required');
    if (create && !this.entities.has(key)) this.entities.set(key, new Map());
    return this.entities.get(key) || null;
  }

  setPaused(value) {
    this.paused = Boolean(value);
    return this.paused;
  }

  apply(entityId, effect = {}) {
    const bucket = this._bucket(entityId, true);
    const next = normalizeEffect(effect);
    const current = bucket.get(next.id);

    if (!current || next.stackMode === 'replace') {
      bucket.set(next.id, next);
      return Object.freeze({ type: current ? 'effect-replaced' : 'effect-applied', entityId: String(entityId), effect: clone(next) });
    }

    if (next.stackMode === 'stack') {
      current.stacks = Math.min(Math.max(current.maxStacks, next.maxStacks), current.stacks + next.stacks);
      current.maxStacks = Math.max(current.maxStacks, next.maxStacks);
      current.remaining = Math.max(current.remaining, next.duration);
      current.tickInterval = next.tickInterval || current.tickInterval;
      if (current.tickInterval > 0 && current.tickRemaining <= 0) current.tickRemaining = current.tickInterval;
      current.magnitude = next.magnitude;
      current.data = clone(next.data) || {};
      current.tags = [...new Set([...current.tags, ...next.tags])];
      if (next.source != null) current.source = next.source;
      return Object.freeze({ type: 'effect-stacked', entityId: String(entityId), effect: clone(current) });
    }

    current.remaining = next.duration;
    current.tickInterval = next.tickInterval;
    current.tickRemaining = next.tickInterval;
    current.magnitude = next.magnitude;
    current.data = clone(next.data) || {};
    current.tags = [...next.tags];
    current.source = next.source;
    current.stacks = next.stacks;
    current.maxStacks = next.maxStacks;
    return Object.freeze({ type: 'effect-refreshed', entityId: String(entityId), effect: clone(current) });
  }

  has(entityId, effectId) {
    return Boolean(this._bucket(entityId, false)?.has(String(effectId)));
  }

  get(entityId, effectId) {
    const effect = this._bucket(entityId, false)?.get(String(effectId));
    return effect ? Object.freeze(clone(effect)) : null;
  }

  list(entityId) {
    const bucket = this._bucket(entityId, false);
    return Object.freeze(bucket ? [...bucket.values()].map((effect) => Object.freeze(clone(effect))) : []);
  }

  remove(entityId, effectId, reason = 'removed') {
    const bucket = this._bucket(entityId, false);
    if (!bucket) return null;
    const key = String(effectId);
    const effect = bucket.get(key);
    if (!effect) return null;
    bucket.delete(key);
    if (bucket.size === 0) this.entities.delete(String(entityId));
    return Object.freeze({ type: 'effect-removed', entityId: String(entityId), effectId: key, reason, effect: clone(effect) });
  }

  removeBySource(entityId, source) {
    const bucket = this._bucket(entityId, false);
    if (!bucket) return [];
    const sourceKey = source == null ? null : String(source);
    const events = [];
    for (const [id, effect] of [...bucket]) {
      if (effect.source === sourceKey) {
        const removed = this.remove(entityId, id, 'source-removed');
        if (removed) events.push(removed);
      }
    }
    return events;
  }

  clearEntity(entityId, reason = 'cleared') {
    const bucket = this._bucket(entityId, false);
    if (!bucket) return [];
    const events = [];
    for (const id of [...bucket.keys()]) {
      const removed = this.remove(entityId, id, reason);
      if (removed) events.push(removed);
    }
    return events;
  }

  update(delta) {
    const raw = Number(delta);
    if (!Number.isFinite(raw) || raw < 0) throw new Error('delta must be a finite number >= 0');
    if (this.paused || raw === 0) return [];

    const events = [];
    for (const [entityId, bucket] of [...this.entities]) {
      for (const [id, effect] of [...bucket]) {
        if (effect.duration > 0) effect.remaining = Math.max(0, effect.remaining - raw);

        if (effect.tickInterval > 0) {
          effect.tickRemaining -= raw;
          while (effect.tickRemaining <= 0 && (effect.duration === 0 || effect.remaining > 0)) {
            events.push(Object.freeze({
              type: 'effect-tick',
              entityId,
              effectId: id,
              kind: effect.kind,
              stacks: effect.stacks,
              magnitude: effect.magnitude,
              source: effect.source,
              data: clone(effect.data),
            }));
            effect.tickRemaining += effect.tickInterval;
          }
        }

        if (effect.duration > 0 && effect.remaining <= 0) {
          const expired = this.remove(entityId, id, 'expired');
          if (expired) events.push(Object.freeze({ ...expired, type: 'effect-expired' }));
        }
      }
    }
    return events;
  }

  snapshot() {
    return clone({
      version: 1,
      paused: this.paused,
      entities: Object.fromEntries([...this.entities].map(([entityId, bucket]) => [
        entityId,
        Object.fromEntries([...bucket].map(([effectId, effect]) => [effectId, effect])),
      ])),
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('status effect snapshot required');
    this.entities.clear();
    const source = snapshot.entities && typeof snapshot.entities === 'object' ? snapshot.entities : {};
    for (const [entityId, effects] of Object.entries(source)) {
      if (!effects || typeof effects !== 'object') continue;
      const bucket = new Map();
      for (const [effectId, effect] of Object.entries(effects)) {
        const normalized = normalizeEffect({ ...effect, id: effectId });
        bucket.set(effectId, normalized);
      }
      if (bucket.size) this.entities.set(entityId, bucket);
    }
    this.paused = Boolean(snapshot.paused);
    return this.snapshot();
  }

  reset() {
    this.entities.clear();
    this.paused = false;
    return this.snapshot();
  }
}

if (typeof window !== 'undefined') window.JaewoonStatusEffects = JaewoonStatusEffects;
