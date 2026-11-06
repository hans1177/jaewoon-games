function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
}

function normalizeAction(action = {}) {
  const id = String(action.id || '').trim();
  if (!id) throw new Error('combat action id required');
  return {
    id,
    damage: finiteNonNegative(action.damage, 0),
    range: Number.isFinite(Number(action.range)) ? finiteNonNegative(action.range, 0) : Infinity,
    cooldown: finiteNonNegative(action.cooldown, 0),
    hitChance: clamp01(action.hitChance, 1),
    criticalChance: clamp01(action.criticalChance, 0),
    criticalMultiplier: Math.max(1, Number.isFinite(Number(action.criticalMultiplier)) ? Number(action.criticalMultiplier) : 2),
    allowFriendlyFire: Boolean(action.allowFriendlyFire),
    bypassShield: Boolean(action.bypassShield),
    ignoreInvulnerability: Boolean(action.ignoreInvulnerability),
    damageType: action.damageType == null ? null : String(action.damageType),
    statusEffects: Array.isArray(action.statusEffects) ? clone(action.statusEffects) : [],
    meta: clone(action.meta || {}) || {},
  };
}

export class JaewoonCombatActions {
  constructor({ actions = [], targeting = null, combatVitals = null, statusEffects = null, rng = Math.random, paused = false } = {}) {
    this.actions = new Map();
    this.cooldowns = new Map();
    this.targeting = targeting;
    this.combatVitals = combatVitals;
    this.statusEffects = statusEffects;
    this.rng = typeof rng === 'function' ? rng : Math.random;
    this.paused = Boolean(paused);
    for (const action of actions || []) this.register(action);
  }

  bind({ targeting = this.targeting, combatVitals = this.combatVitals, statusEffects = this.statusEffects } = {}) {
    this.targeting = targeting;
    this.combatVitals = combatVitals;
    this.statusEffects = statusEffects;
    return this;
  }

  register(action = {}) {
    const normalized = normalizeAction(action);
    this.actions.set(normalized.id, normalized);
    return this.get(normalized.id);
  }

  remove(id) {
    const key = String(id);
    for (const cooldownKey of [...this.cooldowns.keys()]) {
      if (cooldownKey.endsWith(`:${key}`)) this.cooldowns.delete(cooldownKey);
    }
    return this.actions.delete(key);
  }

  get(id) {
    const action = this.actions.get(String(id));
    return action ? Object.freeze(clone(action)) : null;
  }

  list() {
    return Object.freeze([...this.actions.values()].map((action) => Object.freeze(clone(action))));
  }

  _cooldownKey(sourceId, actionId) {
    return `${String(sourceId)}:${String(actionId)}`;
  }

  cooldownRemaining(sourceId, actionId) {
    return this.cooldowns.get(this._cooldownKey(sourceId, actionId)) || 0;
  }

  canUse(sourceId, actionId, targetId = null) {
    const action = this.actions.get(String(actionId));
    if (!action) return Object.freeze({ ok: false, reason: 'unknown-action' });
    if (this.paused) return Object.freeze({ ok: false, reason: 'paused' });
    const remaining = this.cooldownRemaining(sourceId, actionId);
    if (remaining > 0) return Object.freeze({ ok: false, reason: 'cooldown', remaining });
    if (!this.combatVitals?.get?.(sourceId)) return Object.freeze({ ok: false, reason: 'unknown-source' });
    if (this.combatVitals.get(sourceId)?.dead) return Object.freeze({ ok: false, reason: 'source-dead' });
    if (targetId == null) return Object.freeze({ ok: true, action: this.get(actionId) });
    if (!this.combatVitals?.get?.(targetId)) return Object.freeze({ ok: false, reason: 'unknown-target' });
    if (this.combatVitals.get(targetId)?.dead) return Object.freeze({ ok: false, reason: 'target-dead' });

    const sourceTarget = this.targeting?.get?.(sourceId);
    const target = this.targeting?.get?.(targetId);
    if (sourceTarget && target) {
      if (!action.allowFriendlyFire && sourceTarget.team != null && target.team != null && sourceTarget.team === target.team) {
        return Object.freeze({ ok: false, reason: 'friendly-fire-blocked' });
      }
      if (Number.isFinite(action.range) && this.targeting.distance(sourceId, targetId) > action.range) {
        return Object.freeze({ ok: false, reason: 'out-of-range' });
      }
      if (!target.targetable) return Object.freeze({ ok: false, reason: 'untargetable' });
    }
    return Object.freeze({ ok: true, action: this.get(actionId) });
  }

  use(sourceId, actionId, targetId, context = {}) {
    const allowed = this.canUse(sourceId, actionId, targetId);
    if (!allowed.ok) return allowed;
    const action = this.actions.get(String(actionId));

    if (this.rng() > action.hitChance) {
      if (action.cooldown > 0) this.cooldowns.set(this._cooldownKey(sourceId, actionId), action.cooldown);
      return Object.freeze({
        ok: true,
        type: 'miss',
        sourceId: String(sourceId),
        targetId: String(targetId),
        actionId: action.id,
        cooldown: action.cooldown,
      });
    }

    const critical = this.rng() < action.criticalChance;
    const damage = action.damage * (critical ? action.criticalMultiplier : 1);
    const damageEvent = this.combatVitals.damage(targetId, damage, {
      source: sourceId,
      damageType: context.damageType ?? action.damageType,
      bypassShield: context.bypassShield ?? action.bypassShield,
      ignoreInvulnerability: context.ignoreInvulnerability ?? action.ignoreInvulnerability,
      meta: { ...clone(action.meta), ...clone(context.meta || {}) },
    });

    if (action.cooldown > 0) this.cooldowns.set(this._cooldownKey(sourceId, actionId), action.cooldown);

    const appliedStatuses = [];
    if (damageEvent.ok && this.statusEffects) {
      for (const effect of action.statusEffects) {
        const chance = clamp01(effect.chance, 1);
        if (this.rng() > chance) continue;
        const event = this.statusEffects.apply(targetId, { ...effect, source: effect.source ?? sourceId });
        appliedStatuses.push(clone(event));
      }
    }

    return Object.freeze({
      ok: damageEvent.ok,
      type: damageEvent.ok ? 'combat-action' : 'combat-action-failed',
      sourceId: String(sourceId),
      targetId: String(targetId),
      actionId: action.id,
      critical,
      requestedDamage: damage,
      damage: clone(damageEvent),
      statuses: Object.freeze(appliedStatuses),
      cooldown: action.cooldown,
    });
  }

  update(delta) {
    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('delta must be a finite number >= 0');
    if (this.paused || amount === 0) return [];
    const ready = [];
    for (const [key, remaining] of [...this.cooldowns]) {
      const next = Math.max(0, remaining - amount);
      if (next <= 0) {
        this.cooldowns.delete(key);
        const index = key.lastIndexOf(':');
        ready.push(Object.freeze({ type: 'combat-action-ready', sourceId: key.slice(0, index), actionId: key.slice(index + 1) }));
      } else {
        this.cooldowns.set(key, next);
      }
    }
    return ready;
  }

  setPaused(value) {
    this.paused = Boolean(value);
    return this.paused;
  }

  snapshot() {
    return clone({
      version: 1,
      paused: this.paused,
      cooldowns: Object.fromEntries(this.cooldowns),
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('combat action snapshot required');
    this.cooldowns.clear();
    const cooldowns = snapshot.cooldowns && typeof snapshot.cooldowns === 'object' ? snapshot.cooldowns : {};
    for (const [key, value] of Object.entries(cooldowns)) {
      const remaining = finiteNonNegative(value, 0);
      if (remaining > 0) this.cooldowns.set(key, remaining);
    }
    this.paused = Boolean(snapshot.paused);
    return this.snapshot();
  }

  reset() {
    this.cooldowns.clear();
    this.paused = false;
    return this.snapshot();
  }
}

if (typeof window !== 'undefined') window.JaewoonCombatActions = JaewoonCombatActions;
