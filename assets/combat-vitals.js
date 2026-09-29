function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeEntity(entity = {}) {
  const id = String(entity.id || '').trim();
  if (!id) throw new Error('combat entity id required');
  const maxHp = Math.max(1, finiteNonNegative(entity.maxHp ?? entity.hp, 100));
  const hp = Math.min(maxHp, finiteNonNegative(entity.hp, maxHp));
  const shield = finiteNonNegative(entity.shield, 0);
  return {
    id,
    hp,
    maxHp,
    shield,
    maxShield: Math.max(shield, finiteNonNegative(entity.maxShield, shield)),
    invulnerable: Boolean(entity.invulnerable),
    dead: hp <= 0,
    meta: clone(entity.meta || {}) || {},
  };
}

export class JaewoonCombatVitals {
  constructor({ entities = [] } = {}) {
    this.entities = new Map();
    for (const entity of entities || []) this.register(entity);
  }

  register(entity = {}) {
    const normalized = normalizeEntity(entity);
    this.entities.set(normalized.id, normalized);
    return this.get(normalized.id);
  }

  remove(id) {
    return this.entities.delete(String(id));
  }

  has(id) {
    return this.entities.has(String(id));
  }

  get(id) {
    const entity = this.entities.get(String(id));
    return entity ? Object.freeze(clone(entity)) : null;
  }

  setInvulnerable(id, value) {
    const entity = this.entities.get(String(id));
    if (!entity) return false;
    entity.invulnerable = Boolean(value);
    return entity.invulnerable;
  }

  setShield(id, value, { maxShield = null } = {}) {
    const entity = this.entities.get(String(id));
    if (!entity) return null;
    if (maxShield != null) entity.maxShield = finiteNonNegative(maxShield, entity.maxShield);
    entity.shield = Math.min(entity.maxShield || Number.POSITIVE_INFINITY, finiteNonNegative(value, 0));
    return this.get(id);
  }

  damage(id, amount, context = {}) {
    const entity = this.entities.get(String(id));
    if (!entity) return Object.freeze({ ok: false, reason: 'unknown-entity' });
    const requested = finiteNonNegative(amount, 0);
    if (requested <= 0) return Object.freeze({ ok: false, reason: 'invalid-amount' });
    if (entity.dead) return Object.freeze({ ok: false, reason: 'already-dead', entity: this.get(id) });
    if (entity.invulnerable && !context.ignoreInvulnerability) {
      return Object.freeze({ ok: false, reason: 'invulnerable', requested, entity: this.get(id) });
    }

    const bypassShield = Boolean(context.bypassShield);
    const shieldBefore = entity.shield;
    let remaining = requested;
    let shieldDamage = 0;
    if (!bypassShield && entity.shield > 0) {
      shieldDamage = Math.min(entity.shield, remaining);
      entity.shield -= shieldDamage;
      remaining -= shieldDamage;
    }

    const hpBefore = entity.hp;
    const hpDamage = Math.min(entity.hp, remaining);
    entity.hp -= hpDamage;
    const died = !entity.dead && entity.hp <= 0;
    entity.dead = entity.hp <= 0;

    return Object.freeze({
      ok: true,
      type: died ? 'death' : 'damage',
      entityId: entity.id,
      requested,
      applied: shieldDamage + hpDamage,
      shieldDamage,
      hpDamage,
      shieldBefore,
      shieldAfter: entity.shield,
      hpBefore,
      hpAfter: entity.hp,
      died,
      source: context.source ?? null,
      damageType: context.damageType ?? null,
      meta: clone(context.meta || {}) || {},
    });
  }

  heal(id, amount, context = {}) {
    const entity = this.entities.get(String(id));
    if (!entity) return Object.freeze({ ok: false, reason: 'unknown-entity' });
    const requested = finiteNonNegative(amount, 0);
    if (requested <= 0) return Object.freeze({ ok: false, reason: 'invalid-amount' });
    if (entity.dead && !context.revive) return Object.freeze({ ok: false, reason: 'dead', entity: this.get(id) });

    const hpBefore = entity.hp;
    if (context.revive && entity.dead) entity.dead = false;
    entity.hp = Math.min(entity.maxHp, entity.hp + requested);
    const applied = entity.hp - hpBefore;
    entity.dead = entity.hp <= 0;

    return Object.freeze({
      ok: true,
      type: context.revive && hpBefore <= 0 && entity.hp > 0 ? 'revive' : 'heal',
      entityId: entity.id,
      requested,
      applied,
      hpBefore,
      hpAfter: entity.hp,
      source: context.source ?? null,
      meta: clone(context.meta || {}) || {},
    });
  }

  restoreFull(id, { shield = false } = {}) {
    const entity = this.entities.get(String(id));
    if (!entity) return null;
    entity.hp = entity.maxHp;
    entity.dead = false;
    if (shield) entity.shield = entity.maxShield;
    return this.get(id);
  }

  setMaxHp(id, maxHp, { preserveRatio = false, fill = false } = {}) {
    const entity = this.entities.get(String(id));
    if (!entity) return null;
    const nextMax = Math.max(1, finiteNonNegative(maxHp, entity.maxHp));
    const ratio = entity.maxHp > 0 ? entity.hp / entity.maxHp : 0;
    entity.maxHp = nextMax;
    entity.hp = fill ? nextMax : preserveRatio ? Math.min(nextMax, nextMax * ratio) : Math.min(entity.hp, nextMax);
    entity.dead = entity.hp <= 0;
    return this.get(id);
  }

  snapshot() {
    return clone({
      version: 1,
      entities: Object.fromEntries([...this.entities].map(([id, entity]) => [id, entity])),
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('combat vitals snapshot required');
    this.entities.clear();
    const source = snapshot.entities && typeof snapshot.entities === 'object' ? snapshot.entities : {};
    for (const [id, entity] of Object.entries(source)) this.entities.set(id, normalizeEntity({ ...entity, id }));
    return this.snapshot();
  }

  reset() {
    this.entities.clear();
    return this.snapshot();
  }
}

if (typeof window !== 'undefined') window.JaewoonCombatVitals = JaewoonCombatVitals;
