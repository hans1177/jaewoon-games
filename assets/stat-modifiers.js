function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeModifier(modifier = {}) {
  const id = String(modifier.id || '').trim();
  if (!id) throw new Error('modifier id required');
  const multiplier = modifier.multiplier == null ? 1 : finite(modifier.multiplier, 1);
  if (multiplier < 0) throw new Error('modifier multiplier must be >= 0');
  return {
    id,
    source: modifier.source == null ? null : String(modifier.source),
    flat: finite(modifier.flat, 0),
    percent: finite(modifier.percent, 0),
    multiplier,
    priority: finite(modifier.priority, 0),
    enabled: modifier.enabled !== false,
    min: modifier.min == null ? null : finite(modifier.min),
    max: modifier.max == null ? null : finite(modifier.max),
    tags: Array.isArray(modifier.tags) ? [...new Set(modifier.tags.map(String))] : [],
    data: clone(modifier.data || {}),
  };
}

export class JaewoonStatModifiers {
  createState({ base = {}, modifiers = {} } = {}) {
    const normalizedBase = {};
    for (const [stat, value] of Object.entries(base || {})) normalizedBase[String(stat)] = finite(value);
    const normalizedModifiers = {};
    for (const [stat, entries] of Object.entries(modifiers || {})) {
      normalizedModifiers[String(stat)] = Array.isArray(entries) ? entries.map(normalizeModifier) : [];
    }
    return { base: normalizedBase, modifiers: normalizedModifiers };
  }

  setBase(state, stat, value) {
    state.base[String(stat)] = finite(value);
    return state.base[String(stat)];
  }

  getBase(state, stat, fallback = 0) {
    const key = String(stat);
    return Object.prototype.hasOwnProperty.call(state.base, key) ? finite(state.base[key]) : finite(fallback);
  }

  addModifier(state, stat, modifier) {
    const key = String(stat);
    const normalized = normalizeModifier(modifier);
    const list = state.modifiers[key] || (state.modifiers[key] = []);
    const index = list.findIndex((item) => item.id === normalized.id);
    if (index >= 0) list[index] = normalized;
    else list.push(normalized);
    list.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    return clone(normalized);
  }

  removeModifier(state, stat, id) {
    const key = String(stat);
    const list = state.modifiers[key] || [];
    const index = list.findIndex((item) => item.id === String(id));
    if (index < 0) return false;
    list.splice(index, 1);
    return true;
  }

  removeSource(state, source) {
    const target = String(source);
    let removed = 0;
    for (const [stat, list] of Object.entries(state.modifiers || {})) {
      const kept = list.filter((item) => item.source !== target);
      removed += list.length - kept.length;
      state.modifiers[stat] = kept;
    }
    return removed;
  }

  setEnabled(state, stat, id, enabled) {
    const list = state.modifiers[String(stat)] || [];
    const modifier = list.find((item) => item.id === String(id));
    if (!modifier) return false;
    modifier.enabled = Boolean(enabled);
    return true;
  }

  calculate(state, stat, fallback = 0) {
    const key = String(stat);
    const base = this.getBase(state, key, fallback);
    const list = (state.modifiers[key] || []).filter((item) => item.enabled !== false);
    let flat = 0;
    let percent = 0;
    let multiplier = 1;
    let min = null;
    let max = null;

    for (const modifier of list) {
      flat += finite(modifier.flat);
      percent += finite(modifier.percent);
      multiplier *= modifier.multiplier == null ? 1 : finite(modifier.multiplier, 1);
      if (modifier.min != null) min = min == null ? modifier.min : Math.max(min, modifier.min);
      if (modifier.max != null) max = max == null ? modifier.max : Math.min(max, modifier.max);
    }

    if (min != null && max != null && min > max) throw new Error(`stat modifier clamp conflict: ${key}`);
    let value = (base + flat) * (1 + percent) * multiplier;
    if (min != null) value = Math.max(min, value);
    if (max != null) value = Math.min(max, value);
    return value;
  }

  breakdown(state, stat, fallback = 0) {
    const key = String(stat);
    const base = this.getBase(state, key, fallback);
    const modifiers = clone((state.modifiers[key] || []).filter((item) => item.enabled !== false));
    return { stat: key, base, modifiers, value: this.calculate(state, key, fallback) };
  }

  values(state) {
    const keys = new Set([...Object.keys(state.base || {}), ...Object.keys(state.modifiers || {})]);
    return Object.fromEntries([...keys].map((stat) => [stat, this.calculate(state, stat)]));
  }

  snapshot(state) {
    return clone(state);
  }
}

if (typeof window !== 'undefined') window.JaewoonStatModifiers = JaewoonStatModifiers;
