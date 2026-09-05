function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function positiveInt(value, fallback = 1) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeDefinition(definition = {}) {
  const id = String(definition.id || '').trim();
  if (!id) throw new Error('resource node id required');
  const resourceId = String(definition.resourceId || definition.itemId || '').trim();
  if (!resourceId) throw new Error(`resourceId required: ${id}`);
  const minAmount = positiveInt(definition.minAmount ?? definition.amount, 1);
  const maxAmount = Math.max(minAmount, positiveInt(definition.maxAmount ?? definition.amount, minAmount));
  const maxCharges = positiveInt(definition.maxCharges ?? definition.charges, 1);
  const phases = Array.isArray(definition.phases)
    ? [...new Set(definition.phases.map((phase) => String(phase).toLowerCase()).filter((phase) => ['day', 'night'].includes(phase)))]
    : [];
  return Object.freeze({
    id,
    resourceId,
    minAmount,
    maxAmount,
    maxCharges,
    respawnDelay: nonNegative(definition.respawnDelay, 0),
    phases: Object.freeze(phases),
    minDay: definition.minDay == null ? null : positiveInt(definition.minDay, 1),
    maxDay: definition.maxDay == null ? null : positiveInt(definition.maxDay, 1),
    requiredFlags: Object.freeze({ ...(definition.requiredFlags || {}) }),
    meta: Object.freeze(clone(definition.meta || {}) || {}),
  });
}

export class JaewoonResourceGathering {
  constructor({ nodes = [], rng = Math.random, paused = false } = {}) {
    this.rng = typeof rng === 'function' ? rng : Math.random;
    this.definitions = new Map();
    this.states = new Map();
    this.paused = Boolean(paused);
    for (const node of nodes || []) this.register(node);
  }

  register(definition = {}) {
    const normalized = normalizeDefinition(definition);
    this.definitions.set(normalized.id, normalized);
    if (!this.states.has(normalized.id)) {
      this.states.set(normalized.id, {
        charges: normalized.maxCharges,
        respawnRemaining: 0,
        totalGathered: 0,
        timesGathered: 0,
      });
    }
    return normalized;
  }

  remove(id) {
    const key = String(id);
    this.states.delete(key);
    return this.definitions.delete(key);
  }

  get(id) {
    const key = String(id);
    const definition = this.definitions.get(key);
    const state = this.states.get(key);
    if (!definition || !state) return null;
    return Object.freeze({ definition, state: clone(state) });
  }

  reset() {
    for (const [id, definition] of this.definitions) {
      this.states.set(id, {
        charges: definition.maxCharges,
        respawnRemaining: 0,
        totalGathered: 0,
        timesGathered: 0,
      });
    }
    this.paused = false;
    return this.snapshot();
  }

  setPaused(value) {
    this.paused = Boolean(value);
    return this.paused;
  }

  canGather(id, context = {}) {
    const key = String(id);
    const definition = this.definitions.get(key);
    const state = this.states.get(key);
    if (!definition || !state) return Object.freeze({ ok: false, reason: 'unknown-node' });
    if (state.charges <= 0) return Object.freeze({ ok: false, reason: 'depleted', respawnRemaining: state.respawnRemaining });

    const phase = context.phase == null ? null : String(context.phase).toLowerCase();
    if (definition.phases.length && !definition.phases.includes(phase)) {
      return Object.freeze({ ok: false, reason: 'phase-restricted' });
    }

    const day = context.day == null ? null : Math.max(1, Math.floor(Number(context.day) || 1));
    if (definition.minDay != null && (day == null || day < definition.minDay)) return Object.freeze({ ok: false, reason: 'day-too-early' });
    if (definition.maxDay != null && (day == null || day > definition.maxDay)) return Object.freeze({ ok: false, reason: 'day-too-late' });

    const flags = context.flags && typeof context.flags === 'object' ? context.flags : {};
    for (const [flag, expected] of Object.entries(definition.requiredFlags)) {
      if (flags[flag] !== expected) return Object.freeze({ ok: false, reason: 'flag-restricted', flag });
    }
    return Object.freeze({ ok: true, reason: null });
  }

  gather(id, context = {}) {
    const allowed = this.canGather(id, context);
    if (!allowed.ok) return allowed;

    const key = String(id);
    const definition = this.definitions.get(key);
    const state = this.states.get(key);
    const span = definition.maxAmount - definition.minAmount + 1;
    const roll = Math.min(0.999999999, Math.max(0, Number(this.rng()) || 0));
    const quantity = definition.minAmount + Math.floor(roll * span);

    state.charges -= 1;
    state.totalGathered += quantity;
    state.timesGathered += 1;
    if (state.charges <= 0) {
      state.charges = 0;
      state.respawnRemaining = definition.respawnDelay;
    }

    return Object.freeze({
      ok: true,
      nodeId: key,
      resourceId: definition.resourceId,
      quantity,
      chargesRemaining: state.charges,
      depleted: state.charges === 0,
      respawnRemaining: state.respawnRemaining,
      meta: definition.meta,
    });
  }

  refill(id) {
    const key = String(id);
    const definition = this.definitions.get(key);
    const state = this.states.get(key);
    if (!definition || !state) return false;
    state.charges = definition.maxCharges;
    state.respawnRemaining = 0;
    return true;
  }

  update(delta) {
    const raw = Number(delta);
    if (!Number.isFinite(raw) || raw < 0) throw new Error('delta must be a finite number >= 0');
    if (this.paused || raw === 0) return [];
    const events = [];
    for (const [id, state] of this.states) {
      if (state.charges > 0 || state.respawnRemaining <= 0) continue;
      state.respawnRemaining = Math.max(0, state.respawnRemaining - raw);
      if (state.respawnRemaining === 0) {
        const definition = this.definitions.get(id);
        state.charges = definition.maxCharges;
        events.push(Object.freeze({ type: 'resource-respawn', nodeId: id, charges: state.charges }));
      }
    }
    return events;
  }

  snapshot() {
    return clone({
      version: 1,
      paused: this.paused,
      states: Object.fromEntries([...this.states].map(([id, state]) => [id, state])),
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('resource gathering snapshot required');
    const source = snapshot.states && typeof snapshot.states === 'object' ? snapshot.states : {};
    for (const [id, definition] of this.definitions) {
      const saved = source[id];
      if (!saved) continue;
      this.states.set(id, {
        charges: Math.min(definition.maxCharges, Math.max(0, Math.floor(Number(saved.charges) || 0))),
        respawnRemaining: nonNegative(saved.respawnRemaining, 0),
        totalGathered: nonNegative(saved.totalGathered, 0),
        timesGathered: nonNegative(saved.timesGathered, 0),
      });
    }
    this.paused = Boolean(snapshot.paused);
    return this.snapshot();
  }
}

if (typeof window !== 'undefined') window.JaewoonResourceGathering = JaewoonResourceGathering;
