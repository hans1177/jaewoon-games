import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildGameStudyPlannerContext,
  enrichQueueWithGameStudyKnowledge,
  gameStudyPlannerGuidance
} from '../tools/vibe2-game-study-planner-context.mjs';

const knowledge = {
  version: 1,
  entries: [
    {
      studyId: 'study-a', gameId: 'external-a', engine: 'web', confirmations: 2,
      gameDna: { combat: 0.8, ui: 0.5, input: 0.5 },
      reusablePatterns: ['mechanic:combat', 'observed-flow:ui->combat', 'mechanic:economy'],
      hypotheses: [], features: {}, firstSeenAt: '2026-09-10T00:00:00Z', lastSeenAt: '2026-09-11T00:00:00Z'
    },
    {
      studyId: 'study-b', gameId: 'external-b', engine: 'web', confirmations: 3,
      gameDna: { combat: 0.7, ui: 0.6, input: 0.4 },
      reusablePatterns: ['mechanic:combat', 'observed-flow:ui->combat'],
      hypotheses: [], features: {}, firstSeenAt: '2026-09-10T00:00:00Z', lastSeenAt: '2026-09-12T00:00:00Z'
    },
    {
      studyId: 'study-own', gameId: 'target-game', engine: 'web', confirmations: 1,
      gameDna: { combat: 0.75, ui: 0.55, input: 0.45 },
      reusablePatterns: [], hypotheses: [], features: {}, firstSeenAt: '2026-09-12T00:00:00Z', lastSeenAt: '2026-09-12T00:00:00Z'
    }
  ]
};

const liveKnowledge = JSON.parse(fs.readFileSync('.vibe2/game-study-knowledge.json', 'utf8'));

test('planner context uses only cross-game verified patterns relevant to the task goal', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'new-game', target: 'web', goal: 'combat enemy attack flow and UI feedback' }
  });
  assert.equal(context.applied, true);
  assert.equal(context.crossGamePatterns.some((row) => row.pattern === 'mechanic:combat'), true);
  assert.equal(context.crossGamePatterns.some((row) => row.pattern === 'observed-flow:ui->combat'), true);
  assert.equal(context.crossGamePatterns.some((row) => row.pattern === 'mechanic:economy'), false);
  assert.equal(context.nearestStatus, 'INSUFFICIENT_TARGET_DNA');
  assert.equal(context.policy.mayCopyGameplayValues, false);
  assert.equal(context.policy.mayChangeProtectedGameplay, false);
  assert.equal(context.authorityExpanded, false);
});

test('nearest-game retrieval is used only when the target game already has verified DNA', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'target-game', target: 'web', goal: 'combat UI attack feedback' }
  });
  assert.equal(context.nearestStatus, 'VERIFIED_TARGET_DNA_MATCHES');
  assert.equal(context.nearest.length > 0, true);
  assert.notEqual(context.nearest[0].gameId, 'target-game');
});

test('queue enrichment is idempotent, advisory, and skips owner directives', () => {
  const queue = {
    version: 5,
    maxConcurrentTasks: 20,
    tasks: [
      { id: 'auto', gameId: 'new-game', target: 'web', type: 'implementation', status: 'queued', ownerDirective: false, goal: 'combat attack UI fix', evidence: [] },
      { id: 'owner', gameId: 'new-game', target: 'web', type: 'implementation', status: 'queued', ownerDirective: true, goal: 'combat attack UI fix', evidence: [] }
    ]
  };
  const first = enrichQueueWithGameStudyKnowledge({ queueInput: queue, knowledgeInput: knowledge });
  assert.equal(first.changed, true);
  assert.equal(first.enrichedCount, 1);
  assert.match(first.queue.tasks[0].goal, /GAME STUDY KNOWLEDGE/);
  assert.equal(first.queue.tasks[0].evidence.includes('game-study-planner-context:v1'), true);
  assert.equal(first.queue.tasks[1].goal, 'combat attack UI fix');
  assert.equal(first.queue.maxConcurrentTasks, 20);
  assert.equal(first.authorityExpanded, false);

  const second = enrichQueueWithGameStudyKnowledge({ queueInput: first.queue, knowledgeInput: knowledge });
  assert.equal(second.changed, false);
  assert.equal(second.enrichedCount, 0);
  assert.equal((second.queue.tasks[0].goal.match(/GAME STUDY KNOWLEDGE/g) || []).length, 1);
});

test('guidance never presents source, exact values, or authority expansion as available', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'new-game', target: 'web', goal: 'combat attack UI fix' }
  });
  const guidance = gameStudyPlannerGuidance(context);
  assert.match(guidance, /verified advisory context only/);
  assert.match(guidance, /원본 코드·게임 고유 수치/);
  assert.equal(context.policy.rawSourceAvailableToPlanner, false);
  assert.equal(context.policy.rawGameplayValuesAvailableToPlanner, false);
  assert.equal(context.policy.mayAutoExecute, false);
  assert.equal(context.policy.mayExpandAuthority, false);
});

test('central GAME STUDY knowledge is populated from verified real-browser studies', () => {
  assert.equal(liveKnowledge.kind, 'vibe2-game-study-knowledge');
  assert.equal(liveKnowledge.entries.length, 3);
  assert.equal(new Set(liveKnowledge.entries.map((row) => row.gameId)).size, 2);
  assert.equal(liveKnowledge.policy.serverFanInOnly, true);
  assert.equal(liveKnowledge.policy.verifiedStudiesOnly, true);
  assert.equal(liveKnowledge.policy.rawSourcePersisted, false);
  assert.equal(liveKnowledge.policy.noInventedCausality, true);
  assert.equal(liveKnowledge.policy.authorityExpanded, false);
  assert.equal(liveKnowledge.authorityExpanded, false);

  for (const entry of liveKnowledge.entries) {
    assert.ok(entry.studyId);
    assert.equal(entry.engine, 'web');
    assert.ok(entry.confirmations >= 1);
    assert.equal(entry.features['game-dna'], 'VERIFIED');
    assert.ok(Object.keys(entry.gameDna || {}).length > 0);
    assert.ok((entry.reusablePatterns || []).length > 0);
  }

  const merged = liveKnowledge.derived.mergedKnowledge || [];
  const crossGame = merged.filter((row) => row.crossGameVerified === true);
  const supported = (liveKnowledge.derived.hypotheses || []).filter((row) => row.status === 'SUPPORTED_ACROSS_GAMES');
  assert.equal(liveKnowledge.derived.continualDistillation.inputEntryCount, 3);
  assert.equal(liveKnowledge.derived.continualDistillation.uniquePatternCount, 28);
  assert.equal(liveKnowledge.derived.continualDistillation.crossGamePatternCount, 14);
  assert.equal(crossGame.length, 14);
  assert.equal(supported.length, 4);
  assert.ok(crossGame.every((row) => row.gameCount >= 2));
  assert.ok(merged.every((row) => row.confirmations >= row.gameCount));
});

test('central live knowledge reaches queued planner work end-to-end as advisory context', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: liveKnowledge,
    task: { gameId: 'new-production-game', target: 'web', goal: 'improve input movement progression UI flow' }
  });
  assert.equal(context.applied, true);
  assert.equal(context.nearestStatus, 'INSUFFICIENT_TARGET_DNA');
  assert.ok(context.crossGamePatterns.length > 0);
  assert.ok(context.crossGamePatterns.every((row) => row.crossGameVerified === true && row.gameCount >= 2));
  assert.equal(context.policy.rawSourceAvailableToPlanner, false);
  assert.equal(context.policy.rawGameplayValuesAvailableToPlanner, false);
  assert.equal(context.policy.mayAutoExecute, false);
  assert.equal(context.policy.mayCopyGameplayValues, false);
  assert.equal(context.policy.mayChangeProtectedGameplay, false);
  assert.equal(context.policy.mayExpandAuthority, false);

  const queue = {
    version: 5,
    maxConcurrentTasks: 20,
    tasks: [
      { id: 'live-auto', gameId: 'new-production-game', target: 'web', type: 'implementation', status: 'queued', ownerDirective: false, goal: 'improve input progression UI flow', evidence: [] },
      { id: 'live-owner', gameId: 'new-production-game', target: 'web', type: 'implementation', status: 'queued', ownerDirective: true, goal: 'improve input progression UI flow', evidence: [] }
    ]
  };
  const result = enrichQueueWithGameStudyKnowledge({ queueInput: queue, knowledgeInput: liveKnowledge });
  assert.equal(result.changed, true);
  assert.equal(result.enrichedCount, 1);
  assert.match(result.queue.tasks[0].goal, /GAME STUDY KNOWLEDGE - verified advisory context only/);
  assert.ok(result.queue.tasks[0].evidence.includes('game-study-planner-context:v1'));
  assert.equal(result.queue.tasks[1].goal, queue.tasks[1].goal);
  assert.equal(result.queue.maxConcurrentTasks, 20);
  assert.equal(result.authorityExpanded, false);
});
