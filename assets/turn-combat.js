function int(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class JaewoonTurnCombat {
  constructor({ rules = null, maxTurnsPerRound = 1000 } = {}) {
    this.rules = rules;
    this.maxTurnsPerRound = Math.max(1, int(maxTurnsPerRound, 1000));
    this.combatants = new Map();
    this.order = [];
    this.turnIndex = -1;
    this.round = 0;
    this.started = false;
    this.finished = false;
    this.log = [];
  }

  addCombatant({ id, team = 'neutral', hp = 1, maxHp = hp, defense = 10, initiative = null, initiativeModifier = 0, data = {} } = {}) {
    const key = String(id || '').trim();
    if (!key) throw new Error('combatant id is required');
    if (this.combatants.has(key)) throw new Error(`duplicate combatant id: ${key}`);
    const safeMaxHp = Math.max(1, int(maxHp, 1));
    const combatant = {
      id: key,
      team: String(team || 'neutral'),
      hp: Math.max(0, Math.min(safeMaxHp, int(hp, safeMaxHp))),
      maxHp: safeMaxHp,
      defense: int(defense, 10),
      initiative: initiative == null ? null : int(initiative),
      initiativeModifier: int(initiativeModifier),
      conditions: new Map(),
      data: clone(data || {}),
    };
    this.combatants.set(key, combatant);
    return combatant;
  }

  removeCombatant(id) {
    const key = String(id || '');
    const removed = this.combatants.delete(key);
    this.order = this.order.filter((item) => item !== key);
    if (this.turnIndex >= this.order.length) this.turnIndex = this.order.length - 1;
    return removed;
  }

  getCombatant(id) {
    return this.combatants.get(String(id || '')) || null;
  }

  isAlive(idOrCombatant) {
    const combatant = typeof idOrCombatant === 'string' ? this.getCombatant(idOrCombatant) : idOrCombatant;
    return Boolean(combatant && combatant.hp > 0);
  }

  addCondition(id, name, { rounds = null, data = {} } = {}) {
    const combatant = this.getCombatant(id);
    if (!combatant) throw new Error(`unknown combatant: ${id}`);
    const key = String(name || '').trim();
    if (!key) throw new Error('condition name is required');
    combatant.conditions.set(key, {
      roundsRemaining: rounds == null ? null : Math.max(0, int(rounds)),
      data: clone(data || {}),
    });
    return combatant.conditions.get(key);
  }

  removeCondition(id, name) {
    const combatant = this.getCombatant(id);
    return combatant ? combatant.conditions.delete(String(name || '')) : false;
  }

  rollInitiative(combatant) {
    if (combatant.initiative != null) return combatant.initiative;
    if (this.rules?.initiative) {
      return int(this.rules.initiative({ modifier: combatant.initiativeModifier }).total);
    }
    return int(combatant.initiativeModifier);
  }

  start({ order = null } = {}) {
    if (!this.combatants.size) throw new Error('at least one combatant is required');
    if (Array.isArray(order) && order.length) {
      const seen = new Set();
      this.order = order.map(String).filter((id) => this.combatants.has(id) && !seen.has(id) && seen.add(id));
      for (const id of this.combatants.keys()) if (!seen.has(id)) this.order.push(id);
    } else {
      this.order = [...this.combatants.values()]
        .map((combatant, index) => ({ id: combatant.id, initiative: this.rollInitiative(combatant), index }))
        .sort((a, b) => b.initiative - a.initiative || a.index - b.index)
        .map((item) => item.id);
    }
    this.round = 1;
    this.turnIndex = -1;
    this.started = true;
    this.finished = false;
    this.logEvent('combat-start', { order: [...this.order] });
    return this.nextTurn();
  }

  current() {
    if (this.turnIndex < 0 || this.turnIndex >= this.order.length) return null;
    return this.getCombatant(this.order[this.turnIndex]);
  }

  nextTurn() {
    if (!this.started || this.finished) return null;
    if (!this.order.length) return null;
    let attempts = 0;
    while (attempts < this.maxTurnsPerRound) {
      attempts += 1;
      this.turnIndex += 1;
      if (this.turnIndex >= this.order.length) {
        this.turnIndex = 0;
        this.round += 1;
        this.tickConditions();
      }
      const combatant = this.current();
      if (this.isAlive(combatant)) {
        this.logEvent('turn-start', { id: combatant.id, round: this.round });
        return combatant;
      }
    }
    throw new Error('turn loop exceeded safety limit');
  }

  applyDamage(targetId, amount, sourceId = null) {
    const target = this.getCombatant(targetId);
    if (!target) throw new Error(`unknown combatant: ${targetId}`);
    const damage = Math.max(0, int(amount));
    target.hp = Math.max(0, target.hp - damage);
    this.logEvent('damage', { sourceId, targetId: target.id, amount: damage, hp: target.hp });
    this.updateFinishedState();
    return target.hp;
  }

  heal(targetId, amount, sourceId = null) {
    const target = this.getCombatant(targetId);
    if (!target) throw new Error(`unknown combatant: ${targetId}`);
    const healing = Math.max(0, int(amount));
    target.hp = Math.min(target.maxHp, target.hp + healing);
    this.logEvent('heal', { sourceId, targetId: target.id, amount: healing, hp: target.hp });
    return target.hp;
  }

  attack({ attackerId, targetId, attackBonus = 0, damage = { count: 1, sides: 6, modifier: 0 }, mode = 'normal' } = {}) {
    const attacker = this.getCombatant(attackerId);
    const target = this.getCombatant(targetId);
    if (!attacker || !target) throw new Error('attacker and target are required');
    if (!this.isAlive(attacker)) throw new Error('attacker is defeated');
    if (!this.isAlive(target)) throw new Error('target is defeated');

    if (!this.rules?.attackRoll || !this.rules?.damageRoll) {
      throw new Error('rules adapter with attackRoll and damageRoll is required for attack()');
    }

    const attack = this.rules.attackRoll({ attackBonus, defense: target.defense, mode });
    let damageResult = null;
    if (attack.hit) {
      damageResult = this.rules.damageRoll({ ...damage, critical: attack.critical });
      this.applyDamage(target.id, damageResult.total, attacker.id);
    }
    const result = Object.freeze({ attackerId: attacker.id, targetId: target.id, attack, damage: damageResult });
    this.logEvent('attack', result);
    return result;
  }

  tickConditions() {
    for (const combatant of this.combatants.values()) {
      for (const [name, condition] of combatant.conditions) {
        if (condition.roundsRemaining == null) continue;
        condition.roundsRemaining -= 1;
        if (condition.roundsRemaining <= 0) {
          combatant.conditions.delete(name);
          this.logEvent('condition-expired', { id: combatant.id, condition: name });
        }
      }
    }
  }

  livingTeams() {
    return [...new Set([...this.combatants.values()].filter((item) => item.hp > 0).map((item) => item.team))];
  }

  updateFinishedState() {
    const teams = this.livingTeams();
    if (teams.length <= 1) {
      this.finished = true;
      this.logEvent('combat-end', { winnerTeam: teams[0] || null });
    }
    return this.finished;
  }

  snapshot() {
    return Object.freeze({
      round: this.round,
      turnIndex: this.turnIndex,
      order: [...this.order],
      started: this.started,
      finished: this.finished,
      combatants: [...this.combatants.values()].map((item) => ({
        id: item.id,
        team: item.team,
        hp: item.hp,
        maxHp: item.maxHp,
        defense: item.defense,
        initiative: item.initiative,
        initiativeModifier: item.initiativeModifier,
        conditions: [...item.conditions.entries()].map(([name, value]) => ({ name, ...clone(value) })),
        data: clone(item.data),
      })),
    });
  }

  logEvent(type, detail = {}) {
    const event = Object.freeze({ type, round: this.round, turnIndex: this.turnIndex, detail: clone(detail) });
    this.log.push(event);
    return event;
  }
}

if (typeof window !== 'undefined') window.JaewoonTurnCombat = JaewoonTurnCombat;
