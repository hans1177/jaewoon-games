function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

export class JaewoonSkillEffects {
  createState({ resources = {}, cooldowns = {}, effects = [] } = {}) {
    return { resources: clone(resources) || {}, cooldowns: clone(cooldowns) || {}, effects: clone(effects) || [] };
  }

  setResource(state, key, current, max = current) {
    const safeMax = Math.max(0, number(max, 0));
    state.resources[String(key)] = { current: Math.max(0, Math.min(safeMax, number(current, 0))), max: safeMax };
    return state.resources[String(key)];
  }

  canUseSkill(state, skill = {}) {
    const id = String(skill.id || '').trim();
    if (!id) return false;
    if (number(state.cooldowns[id], 0) > 0) return false;
    for (const [key, cost] of Object.entries(skill.costs || {})) {
      if (number(state.resources?.[key]?.current, 0) < Math.max(0, number(cost, 0))) return false;
    }
    return true;
  }

  useSkill(state, skill = {}) {
    if (!this.canUseSkill(state, skill)) return false;
    const id = String(skill.id);
    for (const [key, cost] of Object.entries(skill.costs || {})) {
      state.resources[key].current = Math.max(0, number(state.resources[key].current, 0) - Math.max(0, number(cost, 0)));
    }
    state.cooldowns[id] = Math.max(0, number(skill.cooldown, 0));
    return true;
  }

  addEffect(state, effect = {}) {
    const id = String(effect.id || '').trim();
    if (!id) throw new Error('effect id is required');
    const stackMode = String(effect.stackMode || 'refresh');
    const existing = state.effects.find((item) => item.id === id);
    if (existing && stackMode !== 'stack') {
      existing.remaining = Math.max(number(existing.remaining, 0), Math.max(0, number(effect.duration, 0)));
      existing.stacks = stackMode === 'replace' ? Math.max(1, number(effect.stacks, 1)) : existing.stacks;
      existing.data = clone(effect.data) || existing.data;
      return existing;
    }
    const entry = {
      id,
      kind: String(effect.kind || 'buff'),
      remaining: Math.max(0, number(effect.duration, 0)),
      stacks: Math.max(1, number(effect.stacks, 1)),
      maxStacks: Math.max(1, number(effect.maxStacks, 99)),
      data: clone(effect.data) || {},
    };
    if (existing && stackMode === 'stack') {
      existing.stacks = Math.min(existing.maxStacks, existing.stacks + entry.stacks);
      existing.remaining = Math.max(existing.remaining, entry.remaining);
      return existing;
    }
    state.effects.push(entry);
    return entry;
  }

  removeEffect(state, effectId) {
    const index = state.effects.findIndex((item) => item.id === effectId);
    if (index < 0) return false;
    state.effects.splice(index, 1);
    return true;
  }

  tick(state, seconds) {
    const delta = Math.max(0, number(seconds, 0));
    for (const key of Object.keys(state.cooldowns)) state.cooldowns[key] = Math.max(0, number(state.cooldowns[key], 0) - delta);
    for (const effect of state.effects) effect.remaining = Math.max(0, number(effect.remaining, 0) - delta);
    state.effects = state.effects.filter((effect) => effect.remaining > 0 || effect.remaining === Infinity);
    return state;
  }

  hasEffect(state, effectId) { return state.effects.some((item) => item.id === effectId); }
  snapshot(state) { return clone(state || this.createState()); }
}

if (typeof window !== 'undefined') window.JaewoonSkillEffects = JaewoonSkillEffects;
