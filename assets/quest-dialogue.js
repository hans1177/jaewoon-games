function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function int(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : fallback; }

export class JaewoonQuestDialogue {
  createState({ quests = {}, flags = {}, npc = {} } = {}) {
    return { quests: clone(quests) || {}, flags: clone(flags) || {}, npc: clone(npc) || {} };
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

  snapshot(state) { return clone(state || this.createState()); }
}

if (typeof window !== 'undefined') window.JaewoonQuestDialogue = JaewoonQuestDialogue;
