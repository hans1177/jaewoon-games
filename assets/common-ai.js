// 파일명: assets/common-ai.js
// 역할: 게임 내 로컬 AI, Gemini 보조 AI, 다중 AI 편대 협동 판단
// 규칙: AI는 행동을 결정하지만 게임 규칙/피해/보상/세이브의 최종 권한을 갖지 않음

export class JaewoonCommonAI {
  static State = Object.freeze({
    IDLE: 'IDLE', FOLLOW: 'FOLLOW', SEARCH: 'SEARCH', ATTACK: 'ATTACK',
    DODGE: 'DODGE', HEAL: 'HEAL', RETREAT: 'RETREAT', GUARD: 'GUARD',
    REVIVE: 'REVIVE', INTERACT: 'INTERACT', PATROL: 'PATROL',
    TALK: 'TALK', INVITE: 'INVITE', GUIDE: 'GUIDE'
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
    this.identity = Object.freeze({ ...(options.identity || {}) });
    this.personality = this.normalizePersonality(options.personality || {});
    this.emotion = String(options.emotion || 'calm');
    this.memoryLimit = Math.max(4, Math.min(24, Number(options.memoryLimit || 12)));
    this.memory = [];
    this.relationships = new Map();
    this.relationshipEvents = new Set();
    this.causalEventIds = new Set();
    this.causalContext = null;
    this.lastIntent = '';
    this.intentHoldUntil = 0;
    // 유틸: 관계·대화 제안의 반복 발화를 막는 비저장, 비권한 타이머.
    this.lastSocialAt = -Infinity;
    this.lastSocialTopic = '';
    this.presentedBossScenes = new Set();
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
      socialCooldownMs: 18000,
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
    if (['enemy','monster','boss','elite'].includes(String(context.entityKind || '').toLowerCase())) return this.decideEnemy(context);
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
    const causal = context.causalContext || this.causalContext;
    const causalPreferences = Array.isArray(causal?.actionPreferences) ? causal.actionPreferences : [];

    const personality = this.personality;
    const effectiveDanger = this.clamp(danger + personality.caution * 0.12 - personality.courage * 0.10);
    const effectiveRetreatHp = this.clamp(this.config.retreatHpRatio + personality.caution * 0.10 - personality.courage * 0.08);
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

    if (effectiveDanger >= this.config.dangerThreshold) return this.action(S.DODGE, 'high_danger');
    if (hp <= effectiveRetreatHp) return this.action(S.RETREAT, 'low_hp');
    if (causalPreferences.includes('avoid-source') && context.canDisengage === true) return this.action(S.RETREAT, 'causal_avoid_source');
    if (causalPreferences.includes('investigate-cause') && context.investigateTarget) return this.action(S.SEARCH, 'causal_investigate', context.investigateTarget);
    if (causalPreferences.includes('support-target') && context.canInteract && !enemies.length) return this.action(S.INTERACT, 'causal_support_target', context.interactTarget || null);

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
    // 메인: 동료가 이미 확인한 정보에 대해서만 플레이어에게 먼저 말을 걸 수 있다.
    const now = Number.isFinite(Number(context.now)) ? Number(context.now) : Date.now();
    const tip = context.knownAdvice;
    if (this.order === O.AUTO && context.canInitiateDialogue === true && context.playerVisible === true
      && ownerDistance <= this.config.followDistance && context.playerBusy !== true
      && now - this.lastSocialAt >= this.config.socialCooldownMs && tip?.observed === true && tip?.id
      && String(tip.id) !== this.lastSocialTopic) {
      this.lastSocialAt = now;
      this.lastSocialTopic = String(tip.id);
      return this.action(S.GUIDE, 'companion_observed_advice', { id: String(tip.id), text: String(tip.text || '').slice(0, 240) });
    }
    return this.action(S.FOLLOW, 'no_enemy');
  }

  decideNpc(context = {}) {
    const S = JaewoonCommonAI.State;
    const danger = this.clamp(context.danger ?? 0);
    const enemies = Array.isArray(context.enemies) ? context.enemies : [];
    const causal = context.causalContext || this.causalContext;
    const causalPreferences = Array.isArray(causal?.actionPreferences) ? causal.actionPreferences : [];
    if (danger >= this.config.dangerThreshold && !context.hostile) return this.action(S.RETREAT, 'npc_danger');
    if (context.hostile) {
      const target = this.chooseEnemy(enemies);
      if (target) return this.action(this.canAttack(target) ? S.ATTACK : S.SEARCH, 'npc_hostile', target);
    }
    if (causalPreferences.includes('avoid-source') && context.canDisengage === true) return this.action(S.RETREAT, 'causal_avoid_source');
    if (causalPreferences.includes('investigate-cause') && context.investigateTarget) return this.action(S.SEARCH, 'causal_investigate', context.investigateTarget);
    if ((causalPreferences.includes('cooperate-with-source') || causalPreferences.includes('support-target')) && context.canInteract) return this.action(S.INTERACT, 'causal_social_followup', context.interactTarget || null);

    // 메인: 스토리/가이드/파티는 플레이어가 알아챌 수 있는 제안이며 엔진의 승인 전에는 상태를 바꾸지 않는다.
    // NPC는 플레이어에게 접근해 대화 제안은 할 수 있어도 보상·파티 합류·퀘스트 완료를 결정할 수 없다.
    const now = Number.isFinite(Number(context.now)) ? Number(context.now) : Date.now();
    const near = context.playerVisible === true && context.playerNearby === true && context.playerBusy !== true;
    const canOffer = near && context.canInitiateDialogue === true
      && now - this.lastSocialAt >= this.config.socialCooldownMs;
    const story = context.authoredStoryBeat;
    const party = context.partyInvitation;
    const advice = context.knownAdvice;
    if (canOffer && story?.eligible === true && story?.engineApproved === true && story?.sourceEventId && story?.id
      && this.lastSocialTopic !== 'story:' + String(story.id)) {
      this.lastSocialAt = now;
      this.lastSocialTopic = 'story:' + story.id;
      return this.action(S.TALK, 'npc_authored_story_offer', { id: String(story.id), sourceEventId: String(story.sourceEventId) });
    }
    if (canOffer && party?.recruitable === true && party?.engineApproved === true
      && Number(party.openSlots) > 0 && party?.playerId
      && this.lastSocialTopic !== 'party:' + String(party.playerId)) {
      this.lastSocialAt = now;
      this.lastSocialTopic = 'party:' + String(party.playerId);
      return this.action(S.INVITE, 'npc_party_invitation_proposal', { id: String(party.playerId) });
    }
    if (canOffer && advice?.observed === true && advice?.id
      && String(advice.id) !== this.lastSocialTopic) {
      this.lastSocialAt = now;
      this.lastSocialTopic = String(advice.id);
      return this.action(S.GUIDE, 'npc_observed_progress_guidance', { id: String(advice.id), text: String(advice.text || '').slice(0, 240) });
    }

    // 마을/필드의 기존 경로만 따라 걸으며 실제 좌표·충돌·스폰 판정은 엔진에 위임한다.
    if (context.canRoam === true && context.movementAuthorized === true && Array.isArray(context.authoredAnchors)) {
      const activityAnchor = String(context.currentActivity?.anchorId || context.nextAnchorId || '');
      const allowedRegion = String(context.regionId || '');
      const anchor = context.authoredAnchors.find(item => item && item.id
        && (!activityAnchor || item.id === activityAnchor)
        && (!allowedRegion || !item.regionId || item.regionId === allowedRegion)
        && Number.isFinite(item.x) && Number.isFinite(item.y));
      if (anchor) return this.action(S.PATROL, 'npc_authored_daily_route', { id: String(anchor.id), x: anchor.x, y: anchor.y });
    }
    if (context.canInteract && this.personality.sociability >= -0.35) return this.action(S.INTERACT, 'player_nearby');
    if (context.investigateTarget && this.personality.curiosity > 0.2) return this.action(S.SEARCH, 'npc_curiosity', context.investigateTarget);
    if (context.patrolReady !== false) return this.action(S.PATROL, 'npc_patrol');
    return this.action(S.IDLE, 'npc_idle');
  }

  decideEnemy(context = {}) {
    const S = JaewoonCommonAI.State;
    const hp = this.clamp(context.hpRatio ?? 1);
    const danger = this.clamp(context.danger ?? 0);
    const enemies = Array.isArray(context.enemies) ? context.enemies : [];
    const allies = Array.isArray(context.allies) ? context.allies : [];
    const personality = this.personality;
    const causal = context.causalContext || this.causalContext;
    const causalPreferences = Array.isArray(causal?.actionPreferences) ? causal.actionPreferences : [];
    const retreatLine = this.clamp(this.config.retreatHpRatio + personality.caution * 0.14 - personality.courage * 0.10 - personality.aggression * 0.05);
    const pressure = personality.aggression * 0.35 + personality.courage * 0.20 - personality.caution * 0.20;
    const target = this.chooseEnemy(enemies);
    // 보스 소개 장면은 승인된 원본 대사/현재 페이즈에만 연결한다. 연출 이후 전투 수치는 그대로다.
    const bossScene = context.bossScene;
    if (context.entityKind === 'boss' && bossScene?.engineApproved === true
      && bossScene?.sourceEventId && bossScene?.id && bossScene?.authoredDialogue
      && context.playerVisible === true && context.canPresentBossScene === true
      && (!bossScene.requiredPhase || bossScene.requiredPhase === context.currentPhase)
      && !this.presentedBossScenes.has(String(bossScene.id))) {
      this.presentedBossScenes.add(String(bossScene.id));
      return this.action(S.TALK, 'boss_authored_cinematic', {
        id: String(bossScene.id), sourceEventId: String(bossScene.sourceEventId),
        text: String(bossScene.authoredDialogue).slice(0, 320),
        skipAllowed: true, presentationOnly: true
      });
    }
    if (hp <= retreatLine && context.canRetreat !== false) return this.action(S.RETREAT, 'enemy_self_preservation', target);
    if (context.allyLostRecently && personality.loyalty > 0.35 && target) return this.action(S.ATTACK, 'enemy_ally_loss_pressure', target);
    if (danger > 0.8 && personality.courage < 0.1) return this.action(S.DODGE, 'enemy_high_danger');
    if (causalPreferences.includes('avoid-source') && context.canRetreat !== false) return this.action(S.RETREAT, 'causal_avoid_source', target);
    if (causalPreferences.includes('investigate-cause') && context.investigateTarget) return this.action(S.SEARCH, 'causal_investigate', context.investigateTarget);
    if (target) {
      if (context.canFlank && personality.caution > 0.2 && pressure < 0.25) return this.action(S.SEARCH, 'enemy_flank', target);
      if (this.canAttack(target)) return this.action(S.ATTACK, pressure > 0.25 ? 'enemy_pressure' : 'enemy_attack', target);
      return this.action(S.SEARCH, context.territorial ? 'enemy_territory_intercept' : 'enemy_approach', target);
    }
    if (context.investigateTarget && personality.curiosity > 0) return this.action(S.SEARCH, 'enemy_investigate', context.investigateTarget);
    if (allies.length && context.groupObjective === 'guard') return this.action(S.GUARD, 'enemy_group_guard');
    return this.action(context.patrolReady === false ? S.IDLE : S.PATROL, 'enemy_ecology_idle');
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
      let score = threat * (3 + this.personality.protectiveness) + (1 / distance) * (4 + this.personality.aggression) + (1 - hp) * (1 + Math.max(0, this.personality.aggression));
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
    const intent = String(state || '');
    this.lastIntent = intent;
    const causalRelationshipTargetId = String(this.causalContext?.relationshipTargetId || '');
    const actorPlayerModel = causalRelationshipTargetId ? this.inferPlayerModel(causalRelationshipTargetId) : null;
    return {
      state, reason, targetId: String(target?.id || ''), target: target || null,
      personalityIntent: Object.freeze({
        courage: this.personality.courage,
        caution: this.personality.caution,
        aggression: this.personality.aggression,
        protectiveness: this.personality.protectiveness,
        curiosity: this.personality.curiosity
      }),
      emotion: this.emotion,
      causalContext: this.causalContext ? Object.freeze({
        sourceEventId: this.causalContext.sourceEventId,
        sourceEventType: this.causalContext.sourceEventType,
        relationshipTargetId: this.causalContext.relationshipTargetId,
        attentionTargetId: this.causalContext.attentionTargetId,
        judgmentEvidence: this.causalContext.judgmentEvidence || null,
        actorPlayerModel,
        actionPreferences: Object.freeze([...(this.causalContext.actionPreferences || [])]),
        dialogueActs: Object.freeze([...(this.causalContext.dialogueActs || [])]),
        eventCandidate: this.causalContext.eventCandidate || null,
        questCandidate: this.causalContext.questCandidate || null,
        persistentMutationRequiresEngineValidation: true,
        gameplayAuthority: false
      }) : null,
      gameplayAuthority: false
    };
  }

  normalizePersonality(profile = {}) {
    const axis = (value) => Math.max(-1, Math.min(1, Number(value) || 0));
    return Object.freeze({
      courage: axis(profile.courage),
      caution: axis(profile.caution),
      aggression: axis(profile.aggression),
      empathy: axis(profile.empathy),
      curiosity: axis(profile.curiosity),
      sociability: axis(profile.sociability),
      patience: axis(profile.patience),
      loyalty: axis(profile.loyalty),
      pride: axis(profile.pride),
      discipline: axis(profile.discipline),
      independence: axis(profile.independence),
      protectiveness: axis(profile.protectiveness),
      vengefulness: axis(profile.vengefulness)
    });
  }

  setEmotion(emotion = 'calm') { this.emotion = String(emotion || 'calm'); return this.emotion; }

  observeCausalEvent(packet = {}) {
    const event = packet.sourceEvent || packet.event || {};
    const eventId = String(event.id || event.eventId || '');
    const eventType = String(event.type || '');
    const eventActorId = String(event.actorId || event.actor || '');
    const eventLocation = String(event.location || '');
    const eventTick = event.tick ?? event.time ?? null;
    const eventObservability = String(event.observability || '');
    const contractComplete = event.contractComplete === true || Boolean(eventId && eventType && eventActorId && eventLocation && eventTick !== null && eventObservability);
    if (!eventId || !eventType) return Object.freeze({ applied: false, reason: 'source_event_required', gameplayAuthority: false });
    if (!contractComplete) return Object.freeze({ applied: false, reason: 'source_event_contract_incomplete', gameplayAuthority: false });
    const observerId = String(this.identity.id || this.identity.name || '');
    const witnessIds = Array.isArray(event.witnesses)
      ? event.witnesses.map(row => String(typeof row === 'string' ? row : row?.actorId || row?.id || row?.name || '')).filter(Boolean)
      : [];
    const informationPath = String(packet.informationPath || packet.interpretation?.informationPath || '');
    const hasInformationPath = packet.perceived === true && (witnessIds.includes(observerId) || (informationPath && informationPath !== 'none'));
    if (!hasInformationPath) return Object.freeze({ applied: false, reason: 'no_information_path', gameplayAuthority: false });
    const rememberedSourceEvent = this.memory.some(row => String(row?.sourceEventId || row?.id || '') === eventId);
    const relationshipSourceEvent = [...this.relationships.values()].some(state => Array.isArray(state?.causeEventIds) && state.causeEventIds.includes(eventId));
    if (this.causalEventIds.has(eventId) || rememberedSourceEvent || relationshipSourceEvent) return Object.freeze({ applied: false, reason: 'duplicate_event', state: this.snapshotMind(), gameplayAuthority: false });

    const relationshipTargetId = String(packet.relationshipTargetId || event.actorId || event.actor || '');
    const memoryCandidate = packet.memoryCandidate || {
      id: eventId,
      type: eventType,
      sourceEventId: eventId,
      sourceActionId: String(event.actionId || ''),
      sourceActionType: String(event.actionType || event.action || ''),
      actor: String(event.actorId || event.actor || ''),
      target: relationshipTargetId,
      observerId: String(this.identity.id || this.identity.name || ''),
      perspectiveSpecific: true,
      certainty: Number(packet.interpretation?.certainty ?? 1),
      emotionBefore: this.emotion,
      emotionAfter: String(packet.emotionAfter || this.emotion),
      authoritative: false
    };
    const remembered = this.remember(memoryCandidate);
    if (packet.emotionAfter) this.setEmotion(packet.emotionAfter);

    let relationshipResult = Object.freeze({ applied: false, reason: 'no_relationship_delta' });
    const deltas = packet.relationshipDelta && typeof packet.relationshipDelta === 'object' ? packet.relationshipDelta : {};
    const hasRelationshipDelta = Object.entries(deltas).some(([key, value]) => key === 'stage' ? Boolean(value) : Number(value) !== 0);
    if (relationshipTargetId && hasRelationshipDelta) {
      relationshipResult = this.applyRelationshipEvent(relationshipTargetId, event, deltas, { currentObservation: true });
    }

    const next = packet.next && typeof packet.next === 'object' ? packet.next : {};
    this.causalContext = Object.freeze({
      sourceEventId: eventId,
      sourceEventType: eventType,
      relationshipTargetId,
      attentionTargetId: String(next.attentionTargetId || relationshipTargetId || event.objectId || ''),
      judgmentEvidence: next.judgmentEvidence || memoryCandidate || null,
      actionPreferences: Object.freeze(Array.isArray(next.actionPreferences) ? [...next.actionPreferences] : []),
      dialogueActs: Object.freeze(Array.isArray(next.dialogueActs) ? [...next.dialogueActs] : []),
      eventCandidate: next.eventCandidate || null,
      questCandidate: next.questCandidate || null,
      emotion: this.emotion,
      persistentMutationRequiresEngineValidation: true,
      gameplayAuthority: false
    });
    this.causalEventIds.add(eventId);
    return Object.freeze({
      applied: true,
      remembered,
      emotion: this.emotion,
      relationship: relationshipResult,
      causalContext: this.causalContext,
      persistentWrite: false,
      gameplayAuthority: false
    });
  }

  remember(event = {}) {
    if (!event || !event.id || !event.type) return false;
    if (this.memory.some(row => row.id === event.id)) return false;
    this.memory.push(Object.freeze({ ...event }));
    if (this.memory.length > this.memoryLimit) this.memory.splice(0, this.memory.length - this.memoryLimit);
    return true;
  }

  relationshipWith(id = '') { return this.relationships.get(String(id || '')) || null; }

  setRelationship(id = '', state = {}) {
    const key = String(id || '');
    if (!key) return null;
    const axis = value => Math.max(-100, Math.min(100, Math.round(Number(value) || 0)));
    const next = Object.freeze({
      trust: axis(state.trust), familiarity: axis(state.familiarity), respect: axis(state.respect),
      tension: axis(state.tension), affection: axis(state.affection), fear: axis(state.fear),
      debt: axis(state.debt), rivalry: axis(state.rivalry), protectiveness: axis(state.protectiveness),
      dependence: axis(state.dependence), boundaryComfort: axis(state.boundaryComfort), stage: String(state.stage || 'stranger'),
      causeEventIds: Object.freeze([...(Array.isArray(state.causeEventIds) ? state.causeEventIds : [])].map(String).filter(Boolean).slice(-24)),
      initialized: true, gameplayAuthority: false
    });
    this.relationships.set(key, next);
    return next;
  }

  applyRelationshipEvent(id = '', event = {}, deltas = {}, { currentObservation = false } = {}) {
    const key = String(id || ''), eventId = String(event?.id || event?.eventId || '');
    if (!key || !eventId || !event?.type) return { applied: false, reason: 'source_event_required' };
    const existing = this.relationshipWith(key);
    const rememberedSourceEvent = this.memory.some(row => String(row?.sourceEventId || row?.id || '') === eventId);
    if (this.relationshipEvents.has(eventId) || existing?.causeEventIds?.includes(eventId) || (rememberedSourceEvent && currentObservation !== true)) return { applied: false, reason: 'duplicate_event', state: existing };
    const current = existing || this.setRelationship(key, {});
    const axis = value => Math.max(-100, Math.min(100, Math.round(Number(value) || 0)));
    const fields = ['trust','familiarity','respect','tension','affection','fear','debt','rivalry','protectiveness','dependence','boundaryComfort'];
    const next = { ...current };
    for (const field of fields) next[field] = axis(Number(current[field] || 0) + Math.max(-20, Math.min(20, Number(deltas[field] || 0))));
    if (deltas.stage) next.stage = String(deltas.stage);
    next.lastCauseEventId = eventId;
    next.lastCauseType = String(event.type);
    next.causeEventIds = Object.freeze([...(Array.isArray(current.causeEventIds) ? current.causeEventIds : []),eventId].slice(-24));
    next.initialized = false;
    next.gameplayAuthority = false;
    const frozen = Object.freeze(next);
    this.relationships.set(key, frozen);
    this.relationshipEvents.add(eventId);
    this.remember({ id: eventId, type: String(event.type), actor: event.actor || event.actorId || '', target: key, relationshipEffect: { ...deltas } });
    return { applied: true, state: frozen };
  }

  inferPlayerModel(playerId = '') {
    const id = String(playerId || '');
    const relevant = this.memory.filter(row => !id || String(row.actor || row.target || '') === id);
    const count = (...types) => relevant.filter(row => types.includes(String(row.type || '').toLowerCase())).length;
    const evidenceCount = relevant.length;
    return Object.freeze({
      actorId: id,
      patterns: Object.freeze({
        helpful: count('help','rescue'),
        promiseKept: count('promise-kept'),
        promiseBroken: count('promise-broken'),
        boundaryRespected: count('respect-boundary'),
        boundaryCrossed: count('cross-boundary'),
        adviceFollowed: count('followed-advice'),
        adviceIgnored: count('ignored-advice'),
        allyAbandoned: count('abandon'),
        recklessRisk: count('reckless-risk')
      }),
      confidence: Math.max(0, Math.min(1, evidenceCount / 12)),
      perspectiveSpecific: true,
      globalTruth: false
    });
  }

  restoreMindState(snapshot = {}, { engineValidated = false, restoreTransientContext = false } = {}) {
    if (engineValidated !== true) {
      return Object.freeze({ restored: false, reason: 'engine_validation_required', persistentWrite: false, gameplayAuthority: false });
    }
    const selfId = String(this.identity?.id || this.identity?.name || '');
    const snapshotId = String(snapshot?.identity?.id || snapshot?.identity?.name || '');
    if (selfId && snapshotId && selfId !== snapshotId) {
      return Object.freeze({ restored: false, reason: 'actor_identity_mismatch', actorId: selfId, snapshotActorId: snapshotId, persistentWrite: false, gameplayAuthority: false });
    }

    const restoredMemory = [];
    const seenMemoryIds = new Set();
    for (const row of Array.isArray(snapshot?.memory) ? snapshot.memory.slice(-this.memoryLimit) : []) {
      const id = String(row?.id || '');
      const type = String(row?.type || '');
      if (!id || !type || seenMemoryIds.has(id)) continue;
      seenMemoryIds.add(id);
      restoredMemory.push(Object.freeze({ ...row }));
    }
    this.memory = restoredMemory;

    this.relationships.clear();
    for (const row of Array.isArray(snapshot?.relationships) ? snapshot.relationships : []) {
      const id = String(row?.id || '');
      if (!id || !row?.state || typeof row.state !== 'object') continue;
      this.setRelationship(id, row.state);
    }

    const relationshipCauseIds = [...this.relationships.values()]
      .flatMap(state => Array.isArray(state?.causeEventIds) ? state.causeEventIds : [])
      .map(String)
      .filter(Boolean);
    const memorySourceIds = this.memory
      .map(row => String(row?.sourceEventId || row?.id || ''))
      .filter(Boolean);

    this.relationshipEvents = new Set([
      ...(Array.isArray(snapshot?.relationshipEventIds) ? snapshot.relationshipEventIds : []),
      ...relationshipCauseIds
    ].map(String).filter(Boolean));

    this.causalEventIds = new Set([
      ...(Array.isArray(snapshot?.causalEventIds) ? snapshot.causalEventIds : []),
      ...memorySourceIds,
      ...relationshipCauseIds
    ].map(String).filter(Boolean));

    this.emotion = String(snapshot?.emotion || this.emotion || 'calm');
    this.lastIntent = String(snapshot?.lastIntent || '');

    if (restoreTransientContext === true && snapshot?.causalContext && typeof snapshot.causalContext === 'object') {
      const transient = snapshot.causalContext;
      this.causalContext = Object.freeze({
        ...transient,
        actionPreferences: Object.freeze(Array.isArray(transient.actionPreferences) ? [...transient.actionPreferences] : []),
        dialogueActs: Object.freeze(Array.isArray(transient.dialogueActs) ? [...transient.dialogueActs] : []),
        persistentMutationRequiresEngineValidation: true,
        gameplayAuthority: false
      });
    } else {
      this.causalContext = null;
    }

    return Object.freeze({
      restored: true,
      memoryCount: this.memory.length,
      relationshipCount: this.relationships.size,
      relationshipEventCount: this.relationshipEvents.size,
      causalEventCount: this.causalEventIds.size,
      transientContextRestored: this.causalContext !== null,
      persistentWrite: false,
      gameplayAuthority: false
    });
  }

  snapshotMind() {
    return Object.freeze({
      identity: this.identity,
      personality: this.personality,
      emotion: this.emotion,
      lastIntent: this.lastIntent,
      memory: Object.freeze([...this.memory]),
      relationships: Object.freeze([...this.relationships.entries()].map(([id, state]) => Object.freeze({ id, state }))),
      relationshipEventIds: Object.freeze([...this.relationshipEvents]),
      causalEventIds: Object.freeze([...this.causalEventIds]),
      causalContext: this.causalContext,
      gameplayAuthority: false
    });
  }

  clamp(value) { return Math.max(0, Math.min(1, Number(value))); }
}

export class JaewoonAISquad {
  constructor({ members = [], commanderId = '', decisionIntervalMs = 350 } = {}) {
    this.members = new Map();
    this.commanderId = String(commanderId || '');
    this.decisionIntervalMs = Math.max(100, Number(decisionIntervalMs) || 350);
    this.lastDecisionAt = 0;
    this.shared = { focusTargetId: '', protectedTargetId: '', danger: 0, objective: 'follow' };
    for (const member of Array.isArray(members) ? members : []) this.add(member);
  }

  add({ id, ai = null, role = JaewoonCommonAI.Role.MELEE, metadata = {}, identity = null, personality = null, emotion = '' } = {}) {
    const memberId = String(id || '');
    if (!memberId) throw new Error('AI squad member id required');
    const resolvedIdentity = identity && typeof identity === 'object' ? identity : (metadata.identity || {});
    const resolvedPersonality = personality && typeof personality === 'object'
      ? personality
      : (resolvedIdentity?.traits && typeof resolvedIdentity.traits === 'object' ? resolvedIdentity.traits : (metadata.personality || {}));
    const resolvedEmotion = String(emotion || metadata.emotion || 'calm');
    const controller = ai instanceof JaewoonCommonAI
      ? ai
      : new JaewoonCommonAI({ role, identity: resolvedIdentity, personality: resolvedPersonality, emotion: resolvedEmotion });
    this.members.set(memberId, {
      id: memberId,
      ai: controller,
      role,
      metadata: { ...metadata, identity: resolvedIdentity, personality: resolvedPersonality, emotion: resolvedEmotion }
    });
    return this.member(memberId);
  }

  remove(id) { return this.members.delete(String(id || '')); }
  member(id) { return this.members.get(String(id || '')) || null; }
  list() { return Object.freeze([...this.members.values()].map(({ id, role, metadata }) => ({ id, role, metadata: { ...metadata } }))); }

  snapshotMindStates() {
    return Object.freeze([...this.members.values()].map(member => Object.freeze({
      id: member.id,
      role: member.role,
      mind: member.ai.snapshotMind()
    })));
  }

  restoreMindStates(rows = [], { engineValidated = false } = {}) {
    if (engineValidated !== true) {
      return Object.freeze({ restored: false, reason: 'engine_validation_required', restoredCount: 0, missingCount: 0, gameplayAuthority: false });
    }
    let restoredCount = 0;
    let missingCount = 0;
    const results = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      const id = String(row?.id || '');
      const member = this.member(id);
      if (!member) {
        missingCount++;
        results.push(Object.freeze({ id, restored: false, reason: 'squad_member_missing' }));
        continue;
      }
      const result = member.ai.restoreMindState(row?.mind || {}, { engineValidated: true });
      if (result.restored === true) restoredCount++;
      results.push(Object.freeze({ id, ...result }));
    }
    return Object.freeze({
      restored: true,
      restoredCount,
      missingCount,
      results: Object.freeze(results),
      persistentWrite: false,
      gameplayAuthority: false
    });
  }

  command(order, targetId = '') {
    const value = String(order || JaewoonCommonAI.Order.AUTO);
    this.shared.focusTargetId = value === JaewoonCommonAI.Order.FOCUS ? String(targetId || '') : this.shared.focusTargetId;
    this.shared.protectedTargetId = value === JaewoonCommonAI.Order.PROTECT ? String(targetId || '') : this.shared.protectedTargetId;
    for (const member of this.members.values()) member.ai.setOrder(value, targetId);
    return this.snapshot();
  }

  setObjective(objective, targetId = '') {
    this.shared.objective = String(objective || 'follow');
    if (targetId) this.shared.focusTargetId = String(targetId);
    return this.shared.objective;
  }

  observeCausalPackets(packets = []) {
    const rows = [];
    for (const packet of Array.isArray(packets) ? packets : []) {
      const observerId = String(
        packet?.actorId
        || packet?.interpretation?.actor
        || packet?.memoryCandidate?.observerId
        || ''
      );
      if (!observerId) {
        rows.push(Object.freeze({ id: '', applied: false, reason: 'observer_identity_required', gameplayAuthority: false }));
        continue;
      }
      const member = this.member(observerId);
      if (!member) {
        rows.push(Object.freeze({ id: observerId, applied: false, reason: 'observer_not_in_squad', gameplayAuthority: false }));
        continue;
      }
      const result = member.ai.observeCausalEvent(packet);
      rows.push(Object.freeze({
        id: observerId,
        applied: result.applied === true,
        reason: String(result.reason || (result.applied === true ? 'applied' : 'not_applied')),
        result,
        gameplayAuthority: false
      }));
    }
    return Object.freeze(rows);
  }

  decide(context = {}, now = Date.now()) {
    const current = Number(now) || Date.now();
    if (current - this.lastDecisionAt < this.decisionIntervalMs) return [];
    this.lastDecisionAt = current;
    const members = Array.isArray(context.members) ? context.members : [];
    const results = [];
    for (const member of this.members.values()) {
      const own = members.find(item => String(item?.id || '') === member.id) || {};
      const allies = members.filter(item => String(item?.id || '') !== member.id);
      const decisionContext = {
        ...context,
        ...own,
        allies: context.allies || allies,
        shared: this.shared,
        enemyTarget: this.shared.focusTargetId,
        protectedTarget: this.shared.protectedTargetId,
      };
      results.push(Object.freeze({ id: member.id, role: member.role, decision: member.ai.decide(decisionContext) }));
    }
    return results;
  }

  snapshot() {
    return Object.freeze({ commanderId: this.commanderId, decisionIntervalMs: this.decisionIntervalMs, shared: { ...this.shared }, members: this.list() });
  }
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
  window.JaewoonAISquad = JaewoonAISquad;
  window.JaewoonGeminiAI = JaewoonGeminiAI;
}
