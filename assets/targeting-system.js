function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback));
}

function normalizeEntity(entity = {}) {
  const id = String(entity.id || '').trim();
  if (!id) throw new Error('target entity id required');
  const maxHp = nonNegative(entity.maxHp, 0);
  const hp = entity.hp == null ? maxHp : Math.min(maxHp || Infinity, nonNegative(entity.hp, 0));
  return {
    id,
    team: entity.team == null ? null : String(entity.team),
    x: finite(entity.x, 0),
    y: finite(entity.y, 0),
    hp,
    maxHp,
    alive: entity.alive == null ? hp > 0 || maxHp === 0 : Boolean(entity.alive),
    targetable: entity.targetable == null ? true : Boolean(entity.targetable),
    priority: finite(entity.priority, 0),
    threat: finite(entity.threat, 0),
    tags: Array.isArray(entity.tags) ? [...new Set(entity.tags.map(String))] : [],
    meta: clone(entity.meta || {}) || {},
  };
}

function distanceSquared(a, b) {
  const dx = finite(a?.x, 0) - finite(b?.x, 0);
  const dy = finite(a?.y, 0) - finite(b?.y, 0);
  return dx * dx + dy * dy;
}

export class JaewoonTargetingSystem {
  constructor({ entities = [], rng = Math.random } = {}) {
    this.entities = new Map();
    this.rng = typeof rng === 'function' ? rng : Math.random;
    for (const entity of entities || []) this.upsert(entity);
  }

  upsert(entity = {}) {
    const next = normalizeEntity(entity);
    const current = this.entities.get(next.id);
    const merged = current ? normalizeEntity({ ...current, ...next, id: next.id }) : next;
    this.entities.set(merged.id, merged);
    return Object.freeze(clone(merged));
  }

  update(id, patch = {}) {
    const key = String(id);
    const current = this.entities.get(key);
    if (!current) return null;
    return this.upsert({ ...current, ...patch, id: key });
  }

  remove(id) {
    return this.entities.delete(String(id));
  }

  get(id) {
    const entity = this.entities.get(String(id));
    return entity ? Object.freeze(clone(entity)) : null;
  }

  list() {
    return Object.freeze([...this.entities.values()].map((entity) => Object.freeze(clone(entity))));
  }

  setPosition(id, x, y) {
    return this.update(id, { x, y });
  }

  setVitals(id, { hp, maxHp, alive } = {}) {
    const current = this.entities.get(String(id));
    if (!current) return null;
    const nextMax = maxHp == null ? current.maxHp : nonNegative(maxHp, current.maxHp);
    const nextHp = hp == null ? current.hp : Math.min(nextMax || Infinity, nonNegative(hp, current.hp));
    const nextAlive = alive == null ? (nextHp > 0 || nextMax === 0) : Boolean(alive);
    return this.update(id, { hp: nextHp, maxHp: nextMax, alive: nextAlive });
  }

  distance(a, b) {
    const source = typeof a === 'string' ? this.entities.get(a) : a;
    const target = typeof b === 'string' ? this.entities.get(b) : b;
    if (!source || !target) return Infinity;
    return Math.sqrt(distanceSquared(source, target));
  }

  candidates(source, {
    range = Infinity,
    teams = null,
    excludeTeams = null,
    includeTags = null,
    excludeTags = null,
    includeDead = false,
    includeUntargetable = false,
    excludeIds = null,
  } = {}) {
    const origin = typeof source === 'string' ? this.entities.get(source) : source;
    if (!origin) return [];
    const rangeSq = Number.isFinite(Number(range)) ? Math.max(0, Number(range)) ** 2 : Infinity;
    const allowedTeams = Array.isArray(teams) ? new Set(teams.map(String)) : null;
    const deniedTeams = Array.isArray(excludeTeams) ? new Set(excludeTeams.map(String)) : null;
    const requiredTags = Array.isArray(includeTags) ? includeTags.map(String) : [];
    const blockedTags = Array.isArray(excludeTags) ? new Set(excludeTags.map(String)) : null;
    const deniedIds = new Set(Array.isArray(excludeIds) ? excludeIds.map(String) : []);
    if (typeof source === 'string') deniedIds.add(source);

    return [...this.entities.values()].filter((entity) => {
      if (deniedIds.has(entity.id)) return false;
      if (!includeDead && !entity.alive) return false;
      if (!includeUntargetable && !entity.targetable) return false;
      if (allowedTeams && !allowedTeams.has(String(entity.team))) return false;
      if (deniedTeams && deniedTeams.has(String(entity.team))) return false;
      if (requiredTags.some((tag) => !entity.tags.includes(tag))) return false;
      if (blockedTags && entity.tags.some((tag) => blockedTags.has(tag))) return false;
      return distanceSquared(origin, entity) <= rangeSq;
    }).map((entity) => Object.freeze(clone(entity)));
  }

  select(source, options = {}) {
    const strategy = String(options.strategy || 'nearest');
    const origin = typeof source === 'string' ? this.entities.get(source) : source;
    if (!origin) return null;
    const candidates = this.candidates(source, options);
    if (!candidates.length) return null;

    const hpRatio = (entity) => entity.maxHp > 0 ? entity.hp / entity.maxHp : 1;
    const byId = (a, b) => String(a.id).localeCompare(String(b.id));
    const scored = [...candidates];

    if (strategy === 'random') {
      const roll = Math.min(0.999999999, Math.max(0, Number(this.rng()) || 0));
      return scored[Math.floor(roll * scored.length)] || scored[0];
    }

    const compare = {
      nearest: (a, b) => distanceSquared(origin, a) - distanceSquared(origin, b) || byId(a, b),
      farthest: (a, b) => distanceSquared(origin, b) - distanceSquared(origin, a) || byId(a, b),
      'lowest-hp': (a, b) => hpRatio(a) - hpRatio(b) || a.hp - b.hp || byId(a, b),
      'highest-hp': (a, b) => hpRatio(b) - hpRatio(a) || b.hp - a.hp || byId(a, b),
      'highest-threat': (a, b) => b.threat - a.threat || byId(a, b),
      'lowest-threat': (a, b) => a.threat - b.threat || byId(a, b),
      'highest-priority': (a, b) => b.priority - a.priority || distanceSquared(origin, a) - distanceSquared(origin, b) || byId(a, b),
      'lowest-priority': (a, b) => a.priority - b.priority || distanceSquared(origin, a) - distanceSquared(origin, b) || byId(a, b),
    }[strategy];

    if (!compare) throw new Error(`unknown targeting strategy: ${strategy}`);
    scored.sort(compare);
    return scored[0] || null;
  }

  snapshot() {
    return clone({
      version: 1,
      entities: Object.fromEntries([...this.entities].map(([id, entity]) => [id, entity])),
    });
  }

  restore(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('targeting snapshot required');
    this.entities.clear();
    const source = snapshot.entities && typeof snapshot.entities === 'object' ? snapshot.entities : {};
    for (const [id, entity] of Object.entries(source)) this.upsert({ ...entity, id });
    return this.snapshot();
  }

  reset() {
    this.entities.clear();
    return this.snapshot();
  }
}

if (typeof window !== 'undefined') window.JaewoonTargetingSystem = JaewoonTargetingSystem;
