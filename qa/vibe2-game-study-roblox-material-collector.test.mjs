import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGameStudyPlannerContext,
  enrichQueueWithGameStudyKnowledge,
  gameStudyMaterialGuidance
} from '../tools/vibe2-game-study-planner-context.mjs';

const knowledge = {
  version: 1,
  entries: [
    {
      studyId: 'roblox-a', gameId: 'external-roblox-a', engine: 'roblox', confirmations: 2,
      gameDna: { input: 0.8, progression: 0.7, ui: 0.7 },
      reusablePatterns: ['mechanic:input', 'mechanic:progression', 'architecture:ui', 'observed-flow:input->progression'],
      hypotheses: [], features: {}, firstSeenAt: '2026-09-15T00:00:00Z', lastSeenAt: '2026-09-16T00:00:00Z'
    },
    {
      studyId: 'web-a', gameId: 'external-web-a', engine: 'web', confirmations: 3,
      gameDna: { input: 0.8, progression: 0.8, ui: 0.6 },
      reusablePatterns: ['mechanic:input', 'mechanic:progression', 'architecture:ui', 'observed-flow:input->progression'],
      hypotheses: [], features: {}, firstSeenAt: '2026-09-15T00:00:00Z', lastSeenAt: '2026-09-16T00:00:00Z'
    },
    {
      studyId: 'web-b', gameId: 'external-web-b', engine: 'web', confirmations: 2,
      gameDna: { input: 0.7, progression: 0.6, ui: 0.8 },
      reusablePatterns: ['mechanic:input', 'architecture:ui'],
      hypotheses: [], features: {}, firstSeenAt: '2026-09-15T00:00:00Z', lastSeenAt: '2026-09-16T00:00:00Z'
    }
  ]
};

test('Roblox production tasks collect only verified goal-relevant generalized study materials', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'production-roblox', target: 'roblox', goal: 'improve input progression UI feedback' }
  });

  assert.equal(context.applied, true);
  assert.equal(context.materialCollector.enabled, true);
  assert.equal(context.materialCollector.autoConnectedAtReservation, true);
  assert.ok(context.materials.length > 0);
  assert.equal(context.materialCollector.materialCount, context.materials.length);
  assert.ok(context.materials.some((row) => row.transferClass === 'roblox-observed'));
  assert.ok(context.materials.every((row) => row.verified === true));
  assert.ok(context.materials.every((row) => row.matchedSystems.length > 0));
  assert.ok(context.materials.every((row) => row.rawSourceIncluded === false));
  assert.ok(context.materials.every((row) => row.rawGameplayValuesIncluded === false));
  assert.equal(context.authorityExpanded, false);

  const guidance = gameStudyMaterialGuidance(context);
  assert.match(guidance, /ROBLOX MATERIAL COLLECTOR/);
  assert.match(guidance, /verified generalized materials only/);
  assert.doesNotMatch(guidance, /raw source/i);
});

test('non-Roblox tasks keep the collector disabled while normal planner reuse remains available', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'production-web', target: 'web', goal: 'improve input progression UI feedback' }
  });

  assert.equal(context.applied, true);
  assert.equal(context.materialCollector.enabled, false);
  assert.equal(context.materialCollector.materialCount, 0);
  assert.deepEqual(context.materials, []);
  assert.equal(gameStudyMaterialGuidance(context), '');
});

test('legacy planner-enriched Roblox queue tasks receive collector materials once without duplicating planner guidance', () => {
  const queue = {
    version: 5,
    maxConcurrentTasks: 20,
    tasks: [{
      id: 'legacy-roblox-task',
      gameId: 'production-roblox',
      target: 'roblox',
      type: 'implementation',
      status: 'queued',
      ownerDirective: false,
      goal: 'improve input progression UI feedback\n\n[GAME STUDY KNOWLEDGE - verified advisory context only]\nexisting planner guidance',
      evidence: ['game-study-planner-context:v1']
    }]
  };

  const first = enrichQueueWithGameStudyKnowledge({ queueInput: queue, knowledgeInput: knowledge });
  assert.equal(first.changed, true);
  assert.equal(first.enrichedCount, 0);
  assert.ok(first.materialCollectedCount > 0);
  assert.equal(first.queue.tasks[0].evidence.includes('game-study-material-collector:v1'), true);
  assert.match(first.queue.tasks[0].goal, /GAME STUDY ROBLOX MATERIAL COLLECTOR/);
  assert.equal((first.queue.tasks[0].goal.match(/GAME STUDY KNOWLEDGE - verified advisory context only/g) || []).length, 1);
  assert.equal(first.authorityExpanded, false);

  const second = enrichQueueWithGameStudyKnowledge({ queueInput: first.queue, knowledgeInput: knowledge });
  assert.equal(second.changed, false);
  assert.equal(second.enrichedCount, 0);
  assert.equal(second.materialCollectedCount, 0);
  assert.equal((second.queue.tasks[0].goal.match(/GAME STUDY ROBLOX MATERIAL COLLECTOR/g) || []).length, 1);
});
