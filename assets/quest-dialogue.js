function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function int(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : fallback; }

export class JaewoonQuestDialogue {
  createState({ quests = {}, flags = {}, npc = {}, story = {}, relationships = {}, memories = {}, clues = {}, facts = {}, factions = {}, factionRelationships = {}, questProposals = {} } = {}) {
    return {
      quests: clone(quests) || {},
      flags: clone(flags) || {},
      npc: clone(npc) || {},
      story: clone(story) || {},
      relationships: clone(relationships) || {},
      memories: clone(memories) || {},
      clues: clone(clues) || {},
      facts: clone(facts) || {},
      factions: clone(factions) || {},
      factionRelationships: clone(factionRelationships) || {},
      questProposals: clone(questProposals) || {},
    };
  }

  ensureExtendedState(state) {
    if (!state || typeof state !== 'object') throw new Error('quest state is required');
    state.quests ||= {};
    state.flags ||= {};
    state.npc ||= {};
    state.story ||= {};
    state.relationships ||= {};
    state.memories ||= {};
    state.clues ||= {};
    state.facts ||= {};
    state.factions ||= {};
    state.factionRelationships ||= {};
    state.questProposals ||= {};
    return state;
  }

  registerActorQuestCandidate(state, candidate = {}, engineProposal = {}) {
    this.ensureExtendedState(state);
    if (candidate?.candidateOnly !== true) return { ok: false, reason: 'ACTOR_QUEST_CANDIDATE_REQUIRED' };
    if (candidate?.acceptanceCompletionRewardPersistentMutation !== 'engine-only') return { ok: false, reason: 'ENGINE_AUTHORITY_CONTRACT_REQUIRED' };
    if (candidate?.existingDeclaredGameplayCapabilitiesOnly !== true) return { ok: false, reason: 'DECLARED_GAMEPLAY_CAPABILITY_CONTRACT_REQUIRED' };
    const proposerId = String(candidate.giverOrOrigin || '').trim();
    const causeEventIds = Array.isArray(candidate.causeEventIds) ? candidate.causeEventIds.map(String).map(value => value.trim()).filter(Boolean) : [];
    const personalStake = String(candidate.personalStake || '').trim();
    const worldStake = String(candidate.worldStake || '').trim();
    const primaryVerb = String(candidate.primaryVerb || '').trim();
    const branches = Array.isArray(candidate.optionalBranches) ? candidate.optionalBranches.map(String) : [];
    const id = String(engineProposal.id || '').trim();
    const whyNow = String(engineProposal.whyNow || '').trim();
    const objectives = Array.isArray(engineProposal.objectives) ? engineProposal.objectives : [];
    const allowedObjectiveVerbs = Array.isArray(engineProposal.allowedObjectiveVerbs)
      ? engineProposal.allowedObjectiveVerbs.map(String).map(value => value.trim()).filter(Boolean)
      : [];
    if (!proposerId) return { ok: false, reason: 'PROPOSER_ID_REQUIRED' };
    if (!causeEventIds.length && !personalStake) return { ok: false, reason: 'ACTOR_QUEST_CAUSE_REQUIRED' };
    if (!id) return { ok: false, reason: 'ENGINE_PROPOSAL_ID_REQUIRED' };
    if (!whyNow) return { ok: false, reason: 'ENGINE_WHY_NOW_REQUIRED' };
    if (!objectives.length) return { ok: false, reason: 'ENGINE_OBJECTIVES_REQUIRED' };
    if (primaryVerb && !allowedObjectiveVerbs.includes(primaryVerb)) return { ok: false, reason: 'ENGINE_OBJECTIVE_VERB_NOT_DECLARED' };

    const signature = [
      proposerId,
      causeEventIds.join(','),
      personalStake,
      worldStake,
      primaryVerb,
      branches.join(',')
    ].join('|').toLowerCase();
    const duplicate = Object.values(state.questProposals).find((proposal) => String(proposal?.meta?.actorCandidateSignature || '') === signature);
    if (duplicate) return { ok: true, duplicate: true, proposal: clone(duplicate) };

    const sourceEventId = String(engineProposal.sourceEventId || causeEventIds[0] || '').trim();
    const cause = String(
      engineProposal.cause
      || (sourceEventId ? `source-event:${sourceEventId}` : '')
      || (personalStake ? `personal-goal:${personalStake}` : '')
    ).trim();
    const actorGoal = String(engineProposal.actorGoal || personalStake).trim();
    return this.registerQuestProposal(state, {
      id,
      proposerId,
      class: String(engineProposal.class || 'PERSONAL_SIDE'),
      title: String(engineProposal.title || id),
      cause,
      whyNow,
      actorGoal,
      sourceEventId,
      objectives,
      requirements: clone(engineProposal.requirements) || {},
      consequence: clone(engineProposal.consequence) || {},
      stake: String(engineProposal.stake || worldStake || personalStake),
      proposalLineIntent: String(engineProposal.proposalLineIntent || 'ask-for-help-in-character'),
      playerAcceptanceRequired: engineProposal.playerAcceptanceRequired !== false,
      meta: {
        ...(clone(engineProposal.meta) || {}),
        actorCandidateSignature: signature,
        actorCandidatePrimaryVerb: primaryVerb || null,
        actorCandidateAllowedObjectiveVerbs: allowedObjectiveVerbs,
        actorCandidateBranches: branches,
        actorCandidateCauseEventIds: causeEventIds,
        actorCandidateOnly: true,
        engineValidatedProposal: true
      }
    });
  }

  registerQuestProposal(state, proposal = {}) {
    this.ensureExtendedState(state);
    const id = String(proposal.id || '').trim();
    const proposerId = String(proposal.proposerId || '').trim();
    const cause = String(proposal.cause || '').trim();
    const whyNow = String(proposal.whyNow || '').trim();
    const actorGoal = String(proposal.actorGoal || '').trim();
    const sourceEventId = String(proposal.sourceEventId || '').trim();
    const objectives = Array.isArray(proposal.objectives) ? proposal.objectives : [];
    if (!id) return { ok: false, reason: 'PROPOSAL_ID_REQUIRED' };
    if (!proposerId) return { ok: false, reason: 'PROPOSER_ID_REQUIRED' };
    if (!cause || !whyNow || !actorGoal) return { ok: false, reason: 'CAUSAL_PERSONAL_CONTEXT_REQUIRED' };
    if (!objectives.length) return { ok: false, reason: 'OBJECTIVES_REQUIRED' };
    if (state.questProposals[id]) return { ok: true, duplicate: true, proposal: clone(state.questProposals[id]) };
    state.questProposals[id] = {
      id,
      proposerId,
      class: String(proposal.class || 'PERSONAL_SIDE').toUpperCase(),
      title: String(proposal.title || id),
      status: 'proposed',
      cause,
      whyNow,
      actorGoal,
      sourceEventId: sourceEventId || null,
      proposalLineIntent: String(proposal.proposalLineIntent || 'ask-for-help-in-character'),
      objectives: clone(objectives) || [],
      requirements: clone(proposal.requirements) || {},
      consequence: clone(proposal.consequence) || {},
      stake: String(proposal.stake || ''),
      meta: clone(proposal.meta) || {},
      generatedByRuntimeActorAI: true,
      rewardAuthority: 'engine-only',
      completionAuthority: 'engine-only',
      progressionAuthority: 'engine-only',
      playerAcceptanceRequired: proposal.playerAcceptanceRequired !== false,
    };
    return { ok: true, duplicate: false, proposal: clone(state.questProposals[id]) };
  }

  acceptQuestProposal(state, proposalId, engineDefinition = {}) {
    this.ensureExtendedState(state);
    const id = String(proposalId || '').trim();
    const proposal = state.questProposals[id];
    if (!proposal || proposal.status !== 'proposed') return { ok: false, reason: 'QUEST_PROPOSAL_NOT_AVAILABLE' };
    const definition = this.createQuestDefinition({
      id: String(engineDefinition.id || proposal.id),
      title: String(engineDefinition.title || proposal.title),
      class: String(engineDefinition.class || proposal.class),
      cause: proposal.cause,
      consequence: clone(engineDefinition.consequence ?? proposal.consequence) || {},
      requirements: clone(engineDefinition.requirements ?? proposal.requirements) || {},
      objectives: clone(engineDefinition.objectives ?? proposal.objectives) || [],
      rewards: clone(engineDefinition.rewards) || [],
      meta: {
        ...(clone(proposal.meta) || {}),
        ...(clone(engineDefinition.meta) || {}),
        proposerId: proposal.proposerId,
        sourceEventId: proposal.sourceEventId,
        whyNow: proposal.whyNow,
        actorGoal: proposal.actorGoal,
        generatedFromQuestProposal: proposal.id,
      }
    });
    if (!definition.id) return { ok: false, reason: 'ENGINE_QUEST_ID_REQUIRED' };
    if (!this.canStartQuest(state, definition)) return { ok: false, reason: 'QUEST_PREREQUISITE_FAILED' };
    if (!this.startQuest(state, definition)) return { ok: false, reason: 'QUEST_START_REJECTED' };
    proposal.status = 'accepted';
    proposal.acceptedQuestId = definition.id;
    return { ok: true, questId: definition.id, proposal: clone(proposal) };
  }

  declineQuestProposal(state, proposalId, sourceEvent = '') {
    this.ensureExtendedState(state);
    const id = String(proposalId || '').trim();
    const proposal = state.questProposals[id];
    if (!proposal || proposal.status !== 'proposed') return { ok: false, reason: 'QUEST_PROPOSAL_NOT_AVAILABLE' };
    proposal.status = 'declined';
    proposal.declineSourceEvent = String(sourceEvent || '').trim() || null;
    return { ok: true, proposal: clone(proposal) };
  }

  listQuestProposals(state, { proposerId = '', status = '' } = {}) {
    this.ensureExtendedState(state);
    return Object.values(state.questProposals)
      .filter((row) => !proposerId || String(row.proposerId) === String(proposerId))
      .filter((row) => !status || String(row.status) === String(status))
      .map(clone);
  }

  startQuest(state, definition = {}) {
    const id = String(definition.id || '').trim();
    if (!id) throw new Error('quest id is required');
    if (state.quests[id]?.status === 'completed') return false;
    const objectives = (definition.objectives || []).map((objective, index) => ({
      id: String(objective.id || `objective-${index + 1}`),
      type: String(objective.type || 'counter'),
      target: Math.max(1, int(objective.target, 1)),
      current: Math.max(0, int(objective.current, 0)),
      complete: Boolean(objective.complete),
      meta: clone(objective.meta) || {},
    }));
    state.quests[id] = {
      id,
      title: String(definition.title || id),
      status: 'active',
      objectives,
      rewards: clone(definition.rewards) || [],
      meta: clone(definition.meta) || {},
    };
    return true;
  }

  progress(state, questId, objectiveId, amount = 1) {
    const quest = state?.quests?.[questId];
    if (!quest || quest.status !== 'active') return false;
    const objective = quest.objectives.find((item) => item.id === objectiveId);
    if (!objective || objective.complete) return false;
    objective.current = Math.min(objective.target, objective.current + Math.max(0, int(amount, 1)));
    objective.complete = objective.current >= objective.target;
    if (quest.objectives.every((item) => item.complete)) quest.status = 'ready';
    return true;
  }

  completeQuest(state, questId) {
    const quest = state?.quests?.[questId];
    if (!quest || !['ready', 'active'].includes(quest.status)) return null;
    if (quest.objectives.some((item) => !item.complete)) return null;
    quest.status = 'completed';
    return clone(quest.rewards);
  }

  setFlag(state, key, value = true) {
    if (!state?.flags) throw new Error('quest state is required');
    state.flags[String(key)] = clone(value);
    return state.flags[String(key)];
  }

  getFlag(state, key, fallback = false) {
    return Object.prototype.hasOwnProperty.call(state?.flags || {}, key) ? state.flags[key] : fallback;
  }

  setNpcState(state, npcId, patch = {}) {
    if (!state?.npc) throw new Error('quest state is required');
    const id = String(npcId || '').trim();
    if (!id) throw new Error('npc id is required');
    state.npc[id] = { ...(state.npc[id] || {}), ...clone(patch) };
    return state.npc[id];
  }

  chooseDialogue(node = {}, choiceId, context = {}) {
    const choices = Array.isArray(node.choices) ? node.choices : [];
    const choice = choices.find((item) => String(item.id) === String(choiceId));
    if (!choice) return null;
    const requirements = choice.requirements || {};
    for (const [key, expected] of Object.entries(requirements.flags || {})) {
      if ((context.flags || {})[key] !== expected) return null;
    }
    return clone({
      id: choice.id,
      text: choice.text || '',
      next: choice.next ?? null,
      effects: choice.effects || {},
    });
  }

  registerStory(state, definition = {}) {
    this.ensureExtendedState(state);
    const id = String(definition.id || 'main').trim();
    state.story[id] = {
      id,
      stage: String(definition.stage || 'OPENING'),
      status: String(definition.status || 'active'),
      activeQuestIds: clone(definition.activeQuestIds) || [],
      resolvedThreads: clone(definition.resolvedThreads) || [],
      openThreads: clone(definition.openThreads) || [],
      history: clone(definition.history) || [],
      meta: clone(definition.meta) || {},
    };
    return clone(state.story[id]);
  }

  advanceStory(state, storyId = 'main', transition = {}) {
    this.ensureExtendedState(state);
    const id = String(storyId || 'main').trim();
    const story = state.story[id];
    if (!story) return { ok: false, reason: 'STORY_NOT_REGISTERED' };
    const eventId = String(transition.eventId || transition.sourceEvent || '').trim();
    if (!eventId) return { ok: false, reason: 'SOURCE_EVENT_REQUIRED' };
    story.history ||= [];
    if (story.history.some((row) => row.eventId === eventId)) return { ok: true, duplicate: true, stage: story.stage };

    const req = transition.requirements || {};
    for (const [key, expected] of Object.entries(req.flags || {})) if (state.flags[key] !== expected) return { ok: false, reason: 'FLAG_PREREQUISITE_FAILED', key };
    for (const [key, expected] of Object.entries(req.facts || {})) if (state.facts[key]?.value !== expected) return { ok: false, reason: 'FACT_PREREQUISITE_FAILED', key };
    for (const questId of req.completedQuests || []) if (state.quests[questId]?.status !== 'completed') return { ok: false, reason: 'QUEST_PREREQUISITE_FAILED', questId };
    for (const clueId of req.clues || []) if (state.clues[clueId]?.revealed !== true) return { ok: false, reason: 'CLUE_PREREQUISITE_FAILED', clueId };

    const stages = ['OPENING','EARLY','MID','LATE','FINAL_BOSS','ENDING'];
    const current = String(story.stage || '').toUpperCase();
    const next = String(transition.nextStage || current).toUpperCase();
    const currentIndex = stages.indexOf(current), nextIndex = stages.indexOf(next);
    if (transition.allowBackward !== true && currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex) return { ok: false, reason: 'BACKWARD_TRANSITION_BLOCKED' };

    story.stage = next;
    if (transition.status) story.status = String(transition.status);
    story.history.push({ eventId, from: current, to: next, reason: String(transition.reason || '') });
    return { ok: true, duplicate: false, stage: story.stage };
  }

  registerFaction(state, definition = {}) {
    this.ensureExtendedState(state);
    const id = String(definition.id || '').trim();
    if (!id) throw new Error('faction id is required');
    state.factions[id] = {
      id,
      name: String(definition.name || id),
      status: String(definition.status || 'active'),
      memberIds: clone(definition.memberIds) || [],
      controlledRegionIds: clone(definition.controlledRegionIds) || [],
      knownFactIds: clone(definition.knownFactIds) || [],
      meta: clone(definition.meta) || {},
    };
    return clone(state.factions[id]);
  }

  adjustFactionRelationship(state, fromFactionId, toFactionId, delta = {}, sourceEvent = '') {
    this.ensureExtendedState(state);
    const from = String(fromFactionId || '').trim(), to = String(toFactionId || '').trim();
    const eventId = String(sourceEvent || delta.sourceEvent || delta.eventId || '').trim();
    if (!from || !to) throw new Error('faction ids are required');
    if (!eventId) throw new Error('faction relationship source event is required');
    const key = `${from}->${to}`;
    const current = state.factionRelationships[key] || { ally: 0, rival: 0, hostile: 0, neutral: 0, debt: 0, trust: 0, fear: 0, control: 0, events: [] };
    current.events ||= [];
    if (current.events.includes(eventId)) return clone(current);
    for (const axis of ['ally','rival','hostile','neutral','debt','trust','fear','control']) {
      current[axis] = Math.max(-100, Math.min(100, int(current[axis], 0) + int(delta[axis], 0)));
    }
    current.events.push(eventId);
    state.factionRelationships[key] = current;
    return clone(current);
  }

  setFact(state, key, value = true, sourceEvent = '', visibility = {}) {
    this.ensureExtendedState(state);
    const id = String(key || '').trim();
    if (!id) throw new Error('fact key is required');
    const row = { value: clone(value), sourceEvent: String(sourceEvent || ''), updatedAtEvent: String(sourceEvent || '') };
    if (visibility?.public === true) row.public = true;
    if (Array.isArray(visibility?.audience)) row.audience = clone(visibility.audience.map(String));
    if (Array.isArray(visibility?.factionIds)) row.factionIds = clone(visibility.factionIds.map(String));
    state.facts[id] = row;
    return clone(state.facts[id]);
  }

  addMemory(state, npcId, memory = {}) {
    this.ensureExtendedState(state);
    const id = String(npcId || '').trim();
    const eventId = String(memory.eventId || memory.sourceEvent || '').trim();
    if (!id || !eventId) throw new Error('npc id and memory source event are required');
    const list = state.memories[id] ||= [];
    if (list.some((item) => item.eventId === eventId)) return false;
    list.push({
      eventId,
      type: String(memory.type || 'WITNESSED_EVENT'),
      factId: memory.factId ? String(memory.factId) : null,
      clueId: memory.clueId ? String(memory.clueId) : null,
      subjectId: memory.subjectId ? String(memory.subjectId) : null,
      valence: int(memory.valence, 0),
      detail: String(memory.detail || ''),
    });
    return true;
  }

  adjustRelationship(state, fromNpcId, toId, delta = {}, sourceEvent = '') {
    this.ensureExtendedState(state);
    const from = String(fromNpcId || '').trim(), to = String(toId || '').trim();
    const eventId = String(sourceEvent || delta.sourceEvent || delta.eventId || '').trim();
    if (!from || !to) throw new Error('relationship ids are required');
    if (!eventId) throw new Error('relationship source event is required');
    const key = `${from}->${to}`;
    const current = state.relationships[key] || { trust: 0, affinity: 0, fear: 0, respect: 0, debt: 0, betrayal: 0, events: [] };
    current.events ||= [];
    if (current.events.includes(eventId)) return clone(current);
    for (const axis of ['trust','affinity','fear','respect','debt','betrayal']) {
      current[axis] = Math.max(-100, Math.min(100, int(current[axis], 0) + int(delta[axis], 0)));
    }
    current.events.push(eventId);
    current.lastCauseEventId = eventId;
    state.relationships[key] = current;
    return clone(current);
  }

  revealClue(state, clue = {}) {
    this.ensureExtendedState(state);
    const id = String(clue.id || '').trim();
    if (!id) throw new Error('clue id is required');
    const existing = state.clues[id];
    if (existing?.revealed) return false;
    state.clues[id] = {
      id,
      threadId: String(clue.threadId || ''),
      revealed: true,
      sourceEvent: String(clue.sourceEvent || ''),
      payoffId: clue.payoffId ? String(clue.payoffId) : null,
      meta: clone(clue.meta) || {},
    };
    return true;
  }

  canStartQuest(state, definition = {}) {
    this.ensureExtendedState(state);
    const req = definition.requirements || {};
    for (const [key, expected] of Object.entries(req.flags || {})) if (state.flags[key] !== expected) return false;
    for (const [key, expected] of Object.entries(req.facts || {})) if ((state.facts[key]?.value) !== expected) return false;
    for (const questId of req.completedQuests || []) if (state.quests[questId]?.status !== 'completed') return false;
    for (const clueId of req.clues || []) if (state.clues[clueId]?.revealed !== true) return false;
    return true;
  }

  createQuestDefinition(input = {}) {
    const objectives = (input.objectives || []).map((objective, index) => ({
      id: String(objective.id || `objective-${index + 1}`),
      type: String(objective.type || 'counter'),
      target: Math.max(1, int(objective.target, 1)),
      meta: clone(objective.meta) || {},
    }));
    return {
      id: String(input.id || '').trim(),
      title: String(input.title || input.id || ''),
      class: String(input.class || 'SIDE').toUpperCase(),
      cause: String(input.cause || ''),
      consequence: clone(input.consequence) || {},
      requirements: clone(input.requirements) || {},
      objectives,
      rewards: clone(input.rewards) || [],
      meta: clone(input.meta) || {},
      generatedNarrativeAuthority: false,
    };
  }

  buildCharacterContext(state, npcId, profile = {}) {
    this.ensureExtendedState(state);
    const id = String(npcId || '').trim();
    const npcState = state.npc[id] || {};
    const memories = state.memories[id] || [];
    const factions = Object.values(state.factions).filter((row) => (row?.memberIds || []).includes(id));
    const factionIds = factions.map((row) => row.id);
    const knownFactIds = new Set([
      ...memories.map((row) => row?.factId).filter(Boolean),
      ...(Array.isArray(npcState.knownFactIds) ? npcState.knownFactIds : []),
      ...(Array.isArray(profile.knownFactIds) ? profile.knownFactIds : []),
      ...factions.flatMap((row) => Array.isArray(row?.knownFactIds) ? row.knownFactIds : []),
    ].map(String));
    for (const [factId, row] of Object.entries(state.facts)) {
      const audience = Array.isArray(row?.audience) ? row.audience.map(String) : [];
      const factionAudience = Array.isArray(row?.factionIds) ? row.factionIds.map(String) : [];
      if (row?.public === true || audience.includes(id) || factionAudience.some((factionId) => factionIds.includes(factionId))) knownFactIds.add(factId);
    }
    const knownFacts = Object.fromEntries([...knownFactIds].filter((factId) => state.facts[factId]?.value !== undefined).map((factId) => [factId, state.facts[factId]]));
    const explicitKnownClues = new Set([
      ...memories.map((row) => row?.clueId).filter(Boolean),
      ...(Array.isArray(npcState.knownClueIds) ? npcState.knownClueIds : []),
      ...(Array.isArray(profile.knownClueIds) ? profile.knownClueIds : []),
    ].map(String));
    const revealedClues = Object.values(state.clues).filter((row) => {
      if (row?.revealed !== true) return false;
      const clueId = String(row.id || '');
      const audience = Array.isArray(row?.meta?.audience) ? row.meta.audience.map(String) : [];
      const factionAudience = Array.isArray(row?.meta?.factionIds) ? row.meta.factionIds.map(String) : [];
      return explicitKnownClues.has(clueId) || row?.meta?.public === true || audience.includes(id) || factionAudience.some((factionId) => factionIds.includes(factionId));
    });
    return clone({
      npcId: id,
      persona: profile,
      npcState,
      memories,
      relationships: Object.fromEntries(Object.entries(state.relationships).filter(([key]) => key.startsWith(id + '->') || key.endsWith('->' + id))),
      knownFacts,
      revealedClues,
      factions,
      factionRelationships: Object.fromEntries(Object.entries(state.factionRelationships).filter(([key]) => factionIds.some((factionId) => key.startsWith(factionId + '->') || key.endsWith('->' + factionId)))),
      knowledgeBoundaryEnforced: true,
      gameplayAuthority: false,
    });
  }

  snapshot(state) { return clone(state || this.createState()); }
}

if (typeof window !== 'undefined') window.JaewoonQuestDialogue = JaewoonQuestDialogue;
