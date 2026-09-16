import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGameStudyPlannerContext,
  enrichQueueWithGameStudyKnowledge,
  gameStudyMaterialGuidance,
  multiSourceLearningGuidance
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
  ],
  derived: {
    mergedKnowledge: [
      { pattern: 'observed-flow:input->progression', confirmations: 7, gameCount: 3, games: ['external-roblox-a', 'external-web-a', 'external-web-b'], engines: ['roblox', 'web'], crossGameVerified: true }
    ]
  }
};

const experience = {
  version: 3,
  records: [
    {
      id: 'verified-success', gameId: 'internal-roblox-game', engine: 'roblox', taskType: 'game-study',
      problem: 'input progression UI flow', goal: 'improve input progression UI feedback',
      change: 'GAME_STUDY:study-intelligence:mechanic:input | GAME_STUDY:study-intelligence:mechanic:progression',
      outcome: 'PASS', qa: ['real-input-auto-player-verified', 'design-telemetry-verified'],
      evidence: ['e1', 'e2'], reusablePatterns: ['GAME_STUDY:study-intelligence:mechanic:input', 'GAME_STUDY:study-intelligence:mechanic:progression'],
      avoidPatterns: [], verified: true, reusable: true, confirmations: 3, confidence: 0.9
    },
    {
      id: 'verified-failure', gameId: 'internal-roblox-game', engine: 'roblox', taskType: 'runtime-regression',
      problem: 'progression checkpoint retry failure', goal: 'progression retry', change: 'verified failure',
      outcome: 'FAIL', failureCause: 'private exact failure text must not be copied', qa: ['engine-build-failure-cause-verified'],
      evidence: ['f1', 'f2'], reusablePatterns: [], avoidPatterns: ['private exact failure text must not be copied'],
      verified: true, reusable: true, confirmations: 2, confidence: 0.8
    },
    {
      id: 'unverified', gameId: 'bad', engine: 'roblox', taskType: 'test', problem: 'input', goal: 'input',
      change: 'unsafe raw value 9999', outcome: 'PASS', qa: [], evidence: [], reusablePatterns: ['mechanic:input'],
      verified: false, reusable: true, confirmations: 100, confidence: 1
    }
  ]
};

const runtimeEvidence = [
  {
    runtimeVerified: true,
    authority: 'vibe2-roblox-skyline-input-playtest',
    capabilities: { studioTestService: true, virtualInput: true },
    checkpoints: [{ name: 'physical-stage-01', pass: true }, { name: 'round-2-reset', pass: true }],
    metrics: { inputActions: 42, retries: 2, deaths: 1 },
    final: { progress: 8, round: 2 }
  },
  {
    runtimeVerified: false,
    authority: 'vibe2-roblox-unverified',
    metrics: { inputActions: 999999 },
    secret: 'must-not-leak'
  }
];

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
    experienceInput: experience,
    runtimeEvidenceInput: runtimeEvidence,
    task: { gameId: 'production-web', target: 'web', goal: 'improve input progression UI feedback' }
  });

  assert.equal(context.applied, true);
  assert.equal(context.materialCollector.enabled, false);
  assert.equal(context.materialCollector.materialCount, 0);
  assert.deepEqual(context.materials, []);
  assert.equal(context.multiSourceCollector.enabled, false);
  assert.deepEqual(context.multiSourceMaterials, []);
  assert.equal(gameStudyMaterialGuidance(context), '');
  assert.equal(multiSourceLearningGuidance(context), '');
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

test('multi-source collector distills verified internal runtime, telemetry, QA and Experience without copying raw values', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    experienceInput: experience,
    runtimeEvidenceInput: runtimeEvidence,
    task: { gameId: 'production-roblox', target: 'roblox', goal: 'improve input progression and retry flow' }
  });

  assert.equal(context.multiSourceCollector.enabled, true);
  assert.ok(context.multiSourceMaterials.length > 0);
  assert.ok(context.multiSourceMaterials.some((row) => row.sourceType === 'internal-runtime-evidence'));
  assert.ok(context.multiSourceMaterials.some((row) => row.sourceType === 'verified-experience-success'));
  assert.ok(context.multiSourceMaterials.some((row) => row.sourceType === 'verified-experience-failure'));
  assert.ok(context.multiSourceMaterials.some((row) => row.sourceType === 'verified-qa-regression'));
  assert.ok(context.multiSourceMaterials.some((row) => row.sourceType === 'cross-game-hypothesis'));
  assert.ok(context.multiSourceMaterials.every((row) => row.verified === true));
  assert.ok(context.multiSourceMaterials.every((row) => row.rawSourceIncluded === false));
  assert.ok(context.multiSourceMaterials.every((row) => row.rawGameplayValuesIncluded === false));
  assert.ok(context.multiSourceMaterials.every((row) => row.authorityExpanded === false));

  const guidance = multiSourceLearningGuidance(context);
  assert.match(guidance, /MULTI-SOURCE LEARNING/);
  assert.doesNotMatch(guidance, /999999|9999|must-not-leak|private exact failure text/);
});

test('multi-source learning is injected once and remains advisory across later queue cycles', () => {
  const queue = {
    version: 5,
    maxConcurrentTasks: 20,
    tasks: [{
      id: 'multi-source-roblox-task',
      gameId: 'production-roblox',
      target: 'roblox',
      type: 'implementation',
      status: 'queued',
      ownerDirective: true,
      goal: 'improve input progression and retry flow',
      evidence: []
    }]
  };

  const first = enrichQueueWithGameStudyKnowledge({
    queueInput: queue,
    knowledgeInput: knowledge,
    experienceInput: experience,
    runtimeEvidenceInput: runtimeEvidence
  });
  assert.equal(first.changed, true);
  assert.ok(first.multiSourceCollectedCount > 0);
  assert.equal(first.queue.tasks[0].evidence.includes('multi-source-learning-collector:v1'), true);
  assert.match(first.queue.tasks[0].goal, /VIBE2 MULTI-SOURCE LEARNING/);
  assert.doesNotMatch(first.queue.tasks[0].goal, /999999|9999|must-not-leak|private exact failure text/);

  const second = enrichQueueWithGameStudyKnowledge({
    queueInput: first.queue,
    knowledgeInput: knowledge,
    experienceInput: experience,
    runtimeEvidenceInput: runtimeEvidence
  });
  assert.equal(second.changed, false);
  assert.equal(second.multiSourceCollectedCount, 0);
  assert.equal((second.queue.tasks[0].goal.match(/VIBE2 MULTI-SOURCE LEARNING/g) || []).length, 1);
  assert.equal(second.authorityExpanded, false);
});
