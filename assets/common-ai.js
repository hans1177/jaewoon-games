export class JaewoonCommonAI {
  static State = Object.freeze({
    IDLE: 'IDLE', FOLLOW: 'FOLLOW', SEARCH: 'SEARCH', ATTACK: 'ATTACK',
    DODGE: 'DODGE', HEAL: 'HEAL', RETREAT: 'RETREAT', GUARD: 'GUARD',
    REVIVE: 'REVIVE', INTERACT: 'INTERACT', PATROL: 'PATROL'
  });

  static Role = Object.freeze({
    TANK: 'tank', MELEE: 'melee', RANGED: 'ranged', HEALER: 'healer', SUPPORT: 'support'
  });

  static Order = Object.freeze({
    AUTO: 'auto', FOLLOW: 'follow', HOLD: 'hold', ATTACK: 'attack',
    RETREAT: 'retreat', FOCUS: 'focus', PROTECT: 'protect'
  });

  constructor(options = {}) {
    this.role = options.role || JaewoonCommonAI.Role.MELEE;
    this.order = JaewoonCommonAI.Order.AUTO;
    this.focusTargetId = '';
    this.protectTargetId = '';
    this.config = {
      retreatHpRatio: 0.30,
      healHpRatio: 0.40,
      followDistance: 7,
      attackDistance: 3,
      rangedAttackDistance: 10,
      dangerThreshold: 0.75,
      ...(options.config || {})
    };
  }

  setRole(role) { this.role = role; }

  setOrder(order, targetId = '') {
    this.order = order;
    if (order === JaewoonCommonAI.Order.FOCUS) this.focusTargetId = String(targetId || '');
    if (order === JaewoonCommonAI.Order.PROTECT) this.protectTargetId = String(targetId || '');
  }

  clearOrder() {
    this.order = JaewoonCommonAI.Order.AUTO;
    this.focusTargetId = '';
    this.protectTargetId = '';
  }

  decide(context = {}) {
    return context.entityKind === 'npc' ? this.decideNpc(context) : this.decideCompanion(context);
  }

  decideCompanion(context = {}) {
    const hp = this.clamp(context.hpRatio ?? 1);
    const danger = this.clamp(context.danger ?? 0);
    const ownerDistance = Number(context.ownerDistance || 0);
    const enemies = Array.isArray(context.enemies) ? context.enemies : [];
    const allies = Array.isArray(context.allies) ? context.allies : [];
    const S = JaewoonCommonAI.State;
    const O = JaewoonCommonAI.Order;

    if (this.order === O.RETREAT) return this.action(S.RETREAT, 'order_retreat');
    if (this.order === O.HOLD) {
      const target = this.chooseEnemy(enemies);
      return target && this.canAttack(target)
        ? this.action(S.ATTACK, 'hold_attack', target)
        : this.action(S.GUARD, 'order_hold');
    }
    if (this.order === O.FOLLOW) return this.action(S.FOLLOW, 'order_follow');
    if (this.order === O.FOCUS && this.focusTargetId) {
      const target = enemies.find(e => String(e?.id || '') === this.focusTargetId);
      if (target) return this.action(S.ATTACK, 'focus_target', target);
    }
    if (this.order === O.PROTECT) {
      const protectedAlly = allies.find(a => String(a?.id || '') === this.protectTargetId);
      if (protectedAlly?.downed && context.canRevive) return this.action(S.REVIVE, 'protect_revive', protectedAlly);
      const target = this.chooseEnemy(enemies);
      return target ? this.action(this.canAttack(target) ? S.ATTACK : S.GUARD, 'protect_target', target) : this.action(S.GUARD, 'protect_wait');
    }

    if (danger >= this.config.dangerThreshold) return this.action(S.DODGE, 'high_danger');
    if (hp <= this.config.retreatHpRatio) return this.action(S.RETREAT, 'low_hp');

    if ([JaewoonCommonAI.Role.HEALER, JaewoonCommonAI.Role.SUPPORT].includes(this.role)) {
      if (context.canRevive) {
        const downed = this.chooseDownedAlly(allies);
        if (downed) return this.action(S.REVIVE, 'ally_downed', downed);
      }
      if (context.canHeal) {
        const wounded = this.chooseWoundedAlly(allies);
        if (wounded && Number(wounded.hpRatio ?? 1) <= this.config.healHpRatio) return this.action(S.HEAL, 'ally_low_hp', wounded);
      }
    }

    if (ownerDistance > this.config.followDistance) return this.action(S.FOLLOW, 'owner_too_far');

    const target = this.chooseEnemy(enemies);
    if (target) {
      if (this.order === O.ATTACK || this.canAttack(target)) return this.action(S.ATTACK, 'enemy_in_range', target);
      return this.action(S.SEARCH, 'approach_enemy', target);
    }
    if (this.order === O.ATTACK) return this.action(S.SEARCH, 'order_attack_no_target');
    return this.action(S.FOLLOW, 'no_enemy');
  }

  decideNpc(context = {}) {
    const S = JaewoonCommonAI.State;
    const danger = this.clamp(context.danger ?? 0);
    const enemies = Array.isArray(context.enemies) ? context.enemies : [];
    if (danger >= this.config.dangerThreshold && !context.hostile) return this.action(S.RETREAT, 'npc_danger');
    if (context.hostile) {
      const target = this.chooseEnemy(enemies);
      if (target) return this.action(this.canAttack(target) ? S.ATTACK : S.SEARCH, 'npc_hostile', target);
    }
    if (context.canInteract) return this.action(S.INTERACT, 'player_nearby');
    if (context.patrolReady !== false) return this.action(S.PATROL, 'npc_patrol');
    return this.action(S.IDLE, 'npc_idle');
  }

  canAttack(target = {}) {
    const distance = Number(target.distance ?? Infinity);
    const range = this.role === JaewoonCommonAI.Role.RANGED ? this.config.rangedAttackDistance : this.config.attackDistance;
    return distance <= range;
  }

  chooseEnemy(enemies = []) {
    let best = null;
    let bestScore = -Infinity;
    for (const enemy of enemies) {
      if (!enemy || typeof enemy !== 'object') continue;
      const distance = Math.max(Number(enemy.distance ?? 99999), 0.01);
      const threat = Math.max(Number(enemy.threat ?? 1), 0);
      const hp = this.clamp(enemy.hpRatio ?? 1);
      let score = threat * 3 + (1 / distance) * 4 + (1 - hp);
      if (this.role === JaewoonCommonAI.Role.TANK) score += threat * 2;
      if (this.role === JaewoonCommonAI.Role.RANGED) score += Math.min(distance, this.config.rangedAttackDistance) * 0.03;
      if (score > bestScore) { bestScore = score; best = enemy; }
    }
    return best;
  }

  chooseWoundedAlly(allies = []) {
    return allies.filter(a => a && !a.downed).sort((a, b) => Number(a.hpRatio ?? 1) - Number(b.hpRatio ?? 1))[0] || null;
  }

  chooseDownedAlly(allies = []) {
    return allies.filter(a => a?.downed).sort((a, b) => Number(a.distance ?? Infinity) - Number(b.distance ?? Infinity))[0] || null;
  }

  action(state, reason, target = null) {
    return { state, reason, targetId: String(target?.id || ''), target: target || null };
  }

  clamp(value) { return Math.max(0, Math.min(1, Number(value))); }
}

export class JaewoonGeminiAI {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/api/ai/gemini';
    this.requestCooldownMs = Number(options.requestCooldownMs || 2500);
    this.cacheTtlMs = Number(options.cacheTtlMs || 60000);
    this.lastRequestAt = 0;
    this.cache = new Map();
  }

  async askDialogue({ characterId = '', personality = '', gameContext = '', playerText = '', fallbackSpeech = '...' } = {}) {
    const fallback = { ok: false, fallback: true, speech: fallbackSpeech, mood: 'neutral', intent: 'talk' };
    const cacheKey = `dialogue|${characterId}|${gameContext}|${playerText}`;
    return this.ask({
      purpose: 'dialogue',
      system: `Character ID: ${String(characterId).slice(0, 80)}\nPersonality: ${String(personality).slice(0, 800)}`,
      context: String(gameContext).slice(0, 5000),
      user_text: String(playerText).slice(0, 2000)
    }, cacheKey, fallback);
  }

  async askStrategy({ actorId = '', role = '', gameContext = '', allowedActions = [], fallbackAction = 'follow' } = {}) {
    const allowed = Array.isArray(allowedActions) ? allowedActions.map(String) : [];
    const safeFallback = allowed.includes(fallbackAction) ? fallbackAction : (allowed[0] || 'follow');
    const fallback = { ok: false, fallback: true, action: safeFallback, reason: 'local_fallback', speech: '' };
    const result = await this.ask({
      purpose: 'strategy',
      system: `Actor ID: ${String(actorId).slice(0, 80)}\nRole: ${String(role).slice(0, 80)}\nAllowed actions: ${JSON.stringify(allowed)}\nChoose ONLY one action from that list.`,
      context: String(gameContext).slice(0, 5000),
      user_text: 'Choose the best high-level action.'
    }, '', fallback);
    if (!result.fallback && !allowed.includes(String(result.action || ''))) return { ...fallback, fallbackReason: 'invalid_strategy_action' };
    return result;
  }

  async ask(payload, cacheKey, fallback) {
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) return structuredClone(cached.result);
      if (cached) this.cache.delete(cacheKey);
    }

    const now = Date.now();
    if (now - this.lastRequestAt < this.requestCooldownMs) return { ...fallback, fallbackReason: 'cooldown' };
    this.lastRequestAt = now;

    let response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      return { ...fallback, fallbackReason: 'network_error' };
    }

    if (!response.ok) return { ...fallback, fallbackReason: `http_${response.status}` };
    let data;
    try { data = await response.json(); } catch { return { ...fallback, fallbackReason: 'invalid_response' }; }
    if (!data?.ok || !data.result || typeof data.result !== 'object') return { ...fallback, fallbackReason: 'invalid_result' };

    const result = { ...data.result, ok: true, fallback: false, model: data.model || '' };
    if (cacheKey) this.cache.set(cacheKey, { expires: Date.now() + this.cacheTtlMs, result: structuredClone(result) });
    return result;
  }

  clearCache() { this.cache.clear(); }
}

if (typeof window !== 'undefined') {
  window.JaewoonCommonAI = JaewoonCommonAI;
  window.JaewoonGeminiAI = JaewoonGeminiAI;
}
