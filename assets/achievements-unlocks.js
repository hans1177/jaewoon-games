function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeRequirement(req = {}) {
  const type = String(req.type || 'counter');
  const key = String(req.key || '').trim();
  if (!key) throw new Error('achievement requirement key required');
  return {
    type,
    key,
    target: Number.isFinite(Number(req.target)) ? Number(req.target) : 1,
    value: req.value,
  };
}

export class JaewoonAchievementsUnlocks {
  constructor({ definitions = [] } = {}) {
    this.definitions = new Map();
    for (const definition of definitions) this.register(definition);
  }

  register(definition = {}) {
    const id = String(definition.id || '').trim();
    if (!id) throw new Error('achievement id required');
    const normalized = {
      id,
      name: String(definition.name || id),
      hidden: Boolean(definition.hidden),
      requirements: Array.isArray(definition.requirements)
        ? definition.requirements.map(normalizeRequirement)
        : [],
      rewards: clone(definition.rewards || {}),
      meta: clone(definition.meta || {}),
    };
    this.definitions.set(id, normalized);
    return clone(normalized);
  }

  createState({ counters = {}, flags = {}, unlocked = {}, rewardsClaimed = {} } = {}) {
    return {
      counters: clone(counters || {}),
      flags: clone(flags || {}),
      unlocked: clone(unlocked || {}),
      rewardsClaimed: clone(rewardsClaimed || {}),
    };
  }

  setCounter(state, key, value) {
    state.counters[String(key)] = Number(value) || 0;
    return state.counters[String(key)];
  }

  increment(state, key, amount = 1) {
    const name = String(key);
    state.counters[name] = (Number(state.counters[name]) || 0) + (Number(amount) || 0);
    return this.evaluateAll(state);
  }

  setFlag(state, key, value = true) {
    state.flags[String(key)] = value;
    return this.evaluateAll(state);
  }

  requirementMet(state, requirement) {
    if (requirement.type === 'flag') return state.flags[requirement.key] === requirement.value || (requirement.value === undefined && Boolean(state.flags[requirement.key]));
    return (Number(state.counters[requirement.key]) || 0) >= requirement.target;
  }

  evaluate(state, id) {
    const definition = this.definitions.get(String(id));
    if (!definition) throw new Error(`achievement not found: ${id}`);
    if (state.unlocked[definition.id]) return false;
    if (!definition.requirements.every((req) => this.requirementMet(state, req))) return false;
    state.unlocked[definition.id] = true;
    return true;
  }

  evaluateAll(state) {
    const newlyUnlocked = [];
    for (const id of this.definitions.keys()) if (this.evaluate(state, id)) newlyUnlocked.push(id);
    return newlyUnlocked;
  }

  isUnlocked(state, id) {
    return Boolean(state.unlocked[String(id)]);
  }

  claimReward(state, id) {
    const key = String(id);
    if (!this.isUnlocked(state, key) || state.rewardsClaimed[key]) return null;
    const definition = this.definitions.get(key);
    if (!definition) return null;
    state.rewardsClaimed[key] = true;
    return clone(definition.rewards);
  }

  snapshot(state) {
    return clone(state);
  }
}

if (typeof window !== 'undefined') window.JaewoonAchievementsUnlocks = JaewoonAchievementsUnlocks;
