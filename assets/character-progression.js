function int(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeAttributes(attributes = {}) {
  const result = {};
  for (const [key, value] of Object.entries(attributes || {})) result[String(key)] = number(value, 0);
  return result;
}

function normalizeResources(resources = {}) {
  const result = {};
  for (const [key, value] of Object.entries(resources || {})) {
    const name = String(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const max = Math.max(0, number(value.max, value.current ?? 0));
      const current = Math.max(0, Math.min(max, number(value.current, max)));
      result[name] = { current, max };
    } else {
      const current = Math.max(0, number(value, 0));
      result[name] = { current, max: current };
    }
  }
  return result;
}

export class JaewoonCharacterProgression {
  constructor({
    maxLevel = 100,
    xpForLevel = (level) => Math.max(0, Math.trunc(100 * Math.pow(Math.max(1, level - 1), 1.5))),
    onLevelUp = null,
  } = {}) {
    if (typeof xpForLevel !== 'function') throw new Error('xpForLevel must be a function');
    this.maxLevel = Math.max(1, int(maxLevel, 100));
    this.xpForLevel = xpForLevel;
    this.onLevelUp = typeof onLevelUp === 'function' ? onLevelUp : null;
  }

  createCharacter({
    id,
    level = 1,
    xp = 0,
    attributes = {},
    resources = {},
    tags = [],
    skillPoints = 0,
    statPoints = 0,
    meta = {},
  } = {}) {
    const safeLevel = Math.max(1, Math.min(this.maxLevel, int(level, 1)));
    return {
      id: String(id || 'character'),
      level: safeLevel,
      xp: Math.max(0, int(xp, 0)),
      attributes: normalizeAttributes(attributes),
      resources: normalizeResources(resources),
      tags: new Set(Array.isArray(tags) ? tags.map(String) : []),
      skillPoints: Math.max(0, int(skillPoints, 0)),
      statPoints: Math.max(0, int(statPoints, 0)),
      meta: clone(meta) || {},
    };
  }

  xpThreshold(level) {
    const safe = Math.max(1, Math.min(this.maxLevel, int(level, 1)));
    return Math.max(0, int(this.xpForLevel(safe), 0));
  }

  levelFromXp(xp) {
    const total = Math.max(0, int(xp, 0));
    let level = 1;
    while (level < this.maxLevel && total >= this.xpThreshold(level + 1)) level += 1;
    return level;
  }

  addXp(character, amount, { skillPointsPerLevel = 0, statPointsPerLevel = 0 } = {}) {
    if (!character) throw new Error('character is required');
    const gained = Math.max(0, int(amount, 0));
    const beforeLevel = character.level;
    character.xp = Math.max(0, int(character.xp, 0)) + gained;
    character.level = this.levelFromXp(character.xp);
    const levelsGained = Math.max(0, character.level - beforeLevel);
    if (levelsGained > 0) {
      character.skillPoints = Math.max(0, int(character.skillPoints, 0)) + levelsGained * Math.max(0, int(skillPointsPerLevel, 0));
      character.statPoints = Math.max(0, int(character.statPoints, 0)) + levelsGained * Math.max(0, int(statPointsPerLevel, 0));
      this.onLevelUp?.({ character, beforeLevel, afterLevel: character.level, levelsGained });
    }
    return Object.freeze({ gained, beforeLevel, afterLevel: character.level, levelsGained, xp: character.xp });
  }

  getAttribute(character, key, fallback = 0) {
    if (!character) throw new Error('character is required');
    return number(character.attributes?.[key], fallback);
  }

  setAttribute(character, key, value) {
    if (!character) throw new Error('character is required');
    const name = String(key || '').trim();
    if (!name) throw new Error('attribute key is required');
    character.attributes[name] = number(value, 0);
    return character.attributes[name];
  }

  changeAttribute(character, key, delta) {
    return this.setAttribute(character, key, this.getAttribute(character, key, 0) + number(delta, 0));
  }

  spendStatPoints(character, key, amount = 1, { gainPerPoint = 1 } = {}) {
    if (!character) throw new Error('character is required');
    const cost = Math.max(1, int(amount, 1));
    if (int(character.statPoints, 0) < cost) return false;
    character.statPoints -= cost;
    this.changeAttribute(character, key, cost * number(gainPerPoint, 1));
    return true;
  }

  spendSkillPoints(character, amount = 1) {
    if (!character) throw new Error('character is required');
    const cost = Math.max(1, int(amount, 1));
    if (int(character.skillPoints, 0) < cost) return false;
    character.skillPoints -= cost;
    return true;
  }

  setResource(character, key, current, max = current) {
    if (!character) throw new Error('character is required');
    const name = String(key || '').trim();
    if (!name) throw new Error('resource key is required');
    const safeMax = Math.max(0, number(max, 0));
    const safeCurrent = Math.max(0, Math.min(safeMax, number(current, 0)));
    character.resources[name] = { current: safeCurrent, max: safeMax };
    return character.resources[name];
  }

  changeResource(character, key, delta) {
    const resource = character?.resources?.[key];
    if (!resource || typeof resource !== 'object') throw new Error(`resource not found: ${key}`);
    resource.current = Math.max(0, Math.min(number(resource.max, 0), number(resource.current, 0) + number(delta, 0)));
    return resource.current;
  }

  addTag(character, tag) {
    if (!character?.tags) throw new Error('character tags are required');
    const value = String(tag || '').trim();
    if (!value) throw new Error('tag is required');
    character.tags.add(value);
    return true;
  }

  removeTag(character, tag) {
    if (!character?.tags) throw new Error('character tags are required');
    return character.tags.delete(String(tag || ''));
  }

  snapshot(character) {
    if (!character) throw new Error('character is required');
    return Object.freeze({
      id: character.id,
      level: int(character.level, 1),
      xp: Math.max(0, int(character.xp, 0)),
      attributes: clone(character.attributes) || {},
      resources: clone(character.resources) || {},
      tags: [...(character.tags || [])],
      skillPoints: Math.max(0, int(character.skillPoints, 0)),
      statPoints: Math.max(0, int(character.statPoints, 0)),
      meta: clone(character.meta) || {},
    });
  }

  restore(snapshot = {}) {
    return this.createCharacter(snapshot);
  }
}

if (typeof window !== 'undefined') window.JaewoonCharacterProgression = JaewoonCharacterProgression;
