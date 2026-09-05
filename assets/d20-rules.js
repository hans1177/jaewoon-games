const DEFAULT_RULES = Object.freeze({
  criticalSuccess: 20,
  criticalFailure: 1,
  criticalDamageMultiplier: 2,
  minimumAbilityScore: 1,
  maximumAbilityScore: 30,
});

function int(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMode(mode) {
  const value = String(mode || 'normal').toLowerCase();
  return ['normal', 'advantage', 'disadvantage'].includes(value) ? value : 'normal';
}

export class JaewoonD20Rules {
  constructor({ rng = Math.random, rules = {} } = {}) {
    if (typeof rng !== 'function') throw new Error('rng must be a function');
    this.rng = rng;
    this.rules = Object.freeze({ ...DEFAULT_RULES, ...rules });
  }

  rollDie(sides = 20) {
    const size = int(sides, 20);
    if (size < 2) throw new Error('die sides must be at least 2');
    return 1 + Math.floor(this.rng() * size);
  }

  rollDice({ count = 1, sides = 20, modifier = 0 } = {}) {
    const amount = clamp(int(count, 1), 1, 100);
    const rolls = Array.from({ length: amount }, () => this.rollDie(sides));
    const subtotal = rolls.reduce((sum, value) => sum + value, 0);
    return Object.freeze({ rolls, subtotal, modifier: int(modifier), total: subtotal + int(modifier) });
  }

  abilityModifier(score) {
    const bounded = clamp(
      int(score, 10),
      this.rules.minimumAbilityScore,
      this.rules.maximumAbilityScore,
    );
    return Math.floor((bounded - 10) / 2);
  }

  proficiencyBonus(level = 1) {
    const safeLevel = clamp(int(level, 1), 1, 20);
    return 2 + Math.floor((safeLevel - 1) / 4);
  }

  rollD20(mode = 'normal') {
    const normalized = normalizeMode(mode);
    const first = this.rollDie(20);
    if (normalized === 'normal') return Object.freeze({ mode: normalized, rolls: [first], natural: first });
    const second = this.rollDie(20);
    const natural = normalized === 'advantage' ? Math.max(first, second) : Math.min(first, second);
    return Object.freeze({ mode: normalized, rolls: [first, second], natural });
  }

  check({ dc = 10, modifier = 0, mode = 'normal', proficiency = 0 } = {}) {
    const roll = this.rollD20(mode);
    const bonus = int(modifier) + int(proficiency);
    const total = roll.natural + bonus;
    const criticalSuccess = roll.natural === this.rules.criticalSuccess;
    const criticalFailure = roll.natural === this.rules.criticalFailure;
    return Object.freeze({
      ...roll,
      dc: int(dc, 10),
      modifier: int(modifier),
      proficiency: int(proficiency),
      total,
      success: criticalSuccess || (!criticalFailure && total >= int(dc, 10)),
      criticalSuccess,
      criticalFailure,
    });
  }

  skillCheck(options = {}) {
    return this.check(options);
  }

  savingThrow(options = {}) {
    return this.check(options);
  }

  initiative({ modifier = 0, mode = 'normal' } = {}) {
    const roll = this.rollD20(mode);
    return Object.freeze({ ...roll, modifier: int(modifier), total: roll.natural + int(modifier) });
  }

  attackRoll({ attackBonus = 0, defense = 10, mode = 'normal' } = {}) {
    const roll = this.rollD20(mode);
    const bonus = int(attackBonus);
    const total = roll.natural + bonus;
    const critical = roll.natural === this.rules.criticalSuccess;
    const fumble = roll.natural === this.rules.criticalFailure;
    return Object.freeze({
      ...roll,
      attackBonus: bonus,
      defense: int(defense, 10),
      total,
      hit: critical || (!fumble && total >= int(defense, 10)),
      critical,
      fumble,
    });
  }

  damageRoll({ count = 1, sides = 6, modifier = 0, critical = false } = {}) {
    const multiplier = critical ? Math.max(1, int(this.rules.criticalDamageMultiplier, 2)) : 1;
    const dice = this.rollDice({ count: clamp(int(count, 1) * multiplier, 1, 100), sides, modifier });
    return Object.freeze({ ...dice, critical: Boolean(critical), multiplier });
  }

  contest({ aModifier = 0, bModifier = 0, aMode = 'normal', bMode = 'normal' } = {}) {
    const a = this.check({ dc: -999999, modifier: aModifier, mode: aMode });
    const b = this.check({ dc: -999999, modifier: bModifier, mode: bMode });
    const winner = a.total === b.total ? 'tie' : a.total > b.total ? 'a' : 'b';
    return Object.freeze({ a, b, winner });
  }

  createCombatant({ id, hp = 1, maxHp = hp, defense = 10, conditions = [] } = {}) {
    const safeMax = Math.max(1, int(maxHp, 1));
    return {
      id: String(id || 'combatant'),
      hp: clamp(int(hp, safeMax), 0, safeMax),
      maxHp: safeMax,
      defense: int(defense, 10),
      conditions: new Set(Array.isArray(conditions) ? conditions.map(String) : []),
    };
  }

  applyDamage(combatant, amount) {
    if (!combatant) throw new Error('combatant is required');
    combatant.hp = clamp(int(combatant.hp) - Math.max(0, int(amount)), 0, Math.max(1, int(combatant.maxHp, 1)));
    return combatant.hp;
  }

  heal(combatant, amount) {
    if (!combatant) throw new Error('combatant is required');
    combatant.hp = clamp(int(combatant.hp) + Math.max(0, int(amount)), 0, Math.max(1, int(combatant.maxHp, 1)));
    return combatant.hp;
  }

  setCondition(combatant, condition, enabled = true) {
    if (!combatant?.conditions) throw new Error('combatant conditions are required');
    const key = String(condition || '').trim();
    if (!key) throw new Error('condition is required');
    if (enabled) combatant.conditions.add(key);
    else combatant.conditions.delete(key);
    return combatant.conditions.has(key);
  }
}

export const d20Rules = Object.freeze({
  defaults: DEFAULT_RULES,
  create(options) { return new JaewoonD20Rules(options); },
});

if (typeof window !== 'undefined') {
  window.JaewoonD20Rules = JaewoonD20Rules;
  window.JaewoonD20 = d20Rules;
}
