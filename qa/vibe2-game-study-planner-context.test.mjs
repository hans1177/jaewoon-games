import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildGameStudyPlannerContext,
  enrichQueueWithGameStudyKnowledge,
  gameStudyPlannerGuidance
} from '../tools/vibe2-game-study-planner-context.mjs';
import { runQueueCommand } from '../tools/vibe2-queue-control.mjs';

const knowledge = {
  version: 1,
  entries: [
    {
      studyId: 'study-a', gameId: 'external-a', engine: 'web', confirmations: 2,
      gameDna: { combat: 0.8, ui: 0.5, input: 0.5 },
      reusablePatterns: ['mechanic:combat', 'observed-flow:ui->combat', 'mechanic:economy', 'mechanic:restart'],
      hypotheses: [], features: {}, firstSeenAt: '2026-09-10T00:00:00Z', lastSeenAt: '2026-09-11T00:00:00Z'
    },
    {
      studyId: 'study-b', gameId: 'external-b', engine: 'web', confirmations: 3,
      gameDna: { combat: 0.7, ui: 0.6, input: 0.4 },
      reusablePatterns: ['mechanic:combat', 'observed-flow:ui->combat', 'mechanic:restart'],
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

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

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

test('queue enrichment is idempotent, advisory, and includes owner directives', () => {
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
  assert.equal(first.enrichedCount, 2);
  assert.match(first.queue.tasks[0].goal, /GAME STUDY KNOWLEDGE/);
  assert.match(first.queue.tasks[1].goal, /GAME STUDY KNOWLEDGE/);
  assert.equal(first.queue.tasks[0].evidence.includes('game-study-planner-context:v1'), true);
  assert.equal(first.queue.tasks[1].evidence.includes('game-study-planner-context:v1'), true);
  assert.equal(first.queue.tasks[0].evidence.includes('game-study-owner-directive:no'), true);
  assert.equal(first.queue.tasks[1].evidence.includes('game-study-owner-directive:yes'), true);
  assert.equal(first.queue.maxConcurrentTasks, 20);
  assert.equal(first.authorityExpanded, false);

  const second = enrichQueueWithGameStudyKnowledge({ queueInput: first.queue, knowledgeInput: knowledge });
  assert.equal(second.changed, false);
  assert.equal(second.enrichedCount, 0);
  assert.equal((second.queue.tasks[0].goal.match(/GAME STUDY KNOWLEDGE/g) || []).length, 1);
  assert.equal((second.queue.tasks[1].goal.match(/GAME STUDY KNOWLEDGE/g) || []).length, 1);
});

test('guidance is a real production planning input but never exposes source, exact values, or authority expansion', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'new-game', target: 'web', goal: 'combat attack UI fix' }
  });
  const guidance = gameStudyPlannerGuidance(context);
  assert.match(guidance, /verified advisory context only/);
  assert.match(guidance, /기능 선택·구현 방향/);
  assert.match(guidance, /원본 코드·게임 고유 수치/);
  assert.equal(context.policy.rawSourceAvailableToPlanner, false);
  assert.equal(context.policy.rawGameplayValuesAvailableToPlanner, false);
  assert.equal(context.policy.mayAutoExecute, false);
  assert.equal(context.policy.mayExpandAuthority, false);
});

test('restart and round goals can retrieve verified restart knowledge', () => {
  const context = buildGameStudyPlannerContext({
    knowledgeInput: knowledge,
    task: { gameId: 'roblox-obby', target: 'roblox', goal: 'add round retry restart loop after finish' }
  });
  assert.equal(context.applied, true);
  assert.ok(context.goalSystems.includes('restart'));
  assert.ok(context.crossGamePatterns.some((row) => row.pattern === 'mechanic:restart'));
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

test('central live knowledge reaches queued owner and autonomous planner work end-to-end', () => {
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
  assert.equal(result.enrichedCount, 2);
  assert.match(result.queue.tasks[0].goal, /GAME STUDY KNOWLEDGE - verified advisory context only/);
  assert.match(result.queue.tasks[1].goal, /GAME STUDY KNOWLEDGE - verified advisory context only/);
  assert.ok(result.queue.tasks[0].evidence.includes('game-study-planner-context:v1'));
  assert.ok(result.queue.tasks[1].evidence.includes('game-study-planner-context:v1'));
  assert.equal(result.queue.maxConcurrentTasks, 20);
  assert.equal(result.authorityExpanded, false);
});

test('production reserve-batch injects verified GAME STUDY knowledge before selecting work', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-game-study-reserve-'));
  try {
    const queueFile = path.join(root, 'queue.json');
    const knowledgeFile = path.join(root, 'knowledge.json');
    const controlFile = path.join(root, 'parallelism.json');
    const outputFile = path.join(root, 'batch.json');
    writeJson(queueFile, {
      version: 5,
      maxConcurrentTasks: 20,
      tasks: [{
        id: 'production-combat-task', gameId: 'new-game', target: 'web', department: 'development', type: 'implementation',
        goal: 'improve combat attack UI feedback', responsibleFiles: ['web-games/new-game/game.js'], dependencies: [],
        priority: 'normal', releaseState: 'development-confirmed', status: 'queued', retries: 0, maxRetries: 2,
        ownerDirective: false, requiresOwnerDecision: false, protectedChange: false, paidResourceRequired: false,
        sourceRoot: 'web-games/new-game', speculativeEligible: false, estimatedRisk: 'low', evidence: []
      }]
    });
    writeJson(knowledgeFile, knowledge);
    writeJson(controlFile, { version: 1, currentMax: 20 });

    const result = runQueueCommand({
      command: 'reserve-batch', queue: queueFile, knowledge: knowledgeFile, control: controlFile, output: outputFile, max: '20'
    });
    assert.equal(result.gameStudyPlanner.changed, true);
    assert.equal(result.gameStudyPlanner.enrichedCount, 1);
    assert.equal(result.gameStudyPlanner.authorityExpanded, false);
    assert.equal(result.tasks.length, 1);
    assert.match(result.tasks[0].goal, /GAME STUDY KNOWLEDGE - verified advisory context only/);
    assert.ok(result.tasks[0].evidence.includes('game-study-planner-context:v1'));

    const persisted = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    assert.equal(persisted.tasks[0].status, 'running');
    assert.match(persisted.tasks[0].goal, /GAME STUDY KNOWLEDGE - verified advisory context only/);
    assert.ok(persisted.tasks[0].evidence.includes('game-study-planner-context:v1'));

    const batch = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    assert.equal(batch.scheduler.gameStudyPlannerEnrichedCount, 1);
    assert.equal(batch.scheduler.gameStudyPlannerAuthorityExpanded, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('production reservation injects verified GAME STUDY knowledge into owner directives too', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-game-study-owner-'));
  try {
    const queueFile = path.join(root, 'queue.json');
    const knowledgeFile = path.join(root, 'knowledge.json');
    const controlFile = path.join(root, 'parallelism.json');
    writeJson(queueFile, {
      version: 5,
      maxConcurrentTasks: 20,
      tasks: [{
        id: 'owner-task', gameId: 'new-game', target: 'web', department: 'development', type: 'implementation',
        goal: 'owner combat request', responsibleFiles: ['web-games/new-game/game.js'], dependencies: [],
        priority: 'owner-immediate', releaseState: 'development-confirmed', status: 'queued', retries: 0, maxRetries: 2,
        ownerDirective: true, requiresOwnerDecision: false, protectedChange: false, paidResourceRequired: false,
        sourceRoot: 'web-games/new-game', speculativeEligible: false, estimatedRisk: 'low', evidence: []
      }]
    });
    writeJson(knowledgeFile, knowledge);
    writeJson(controlFile, { version: 1, currentMax: 20 });

    const result = runQueueCommand({ command: 'reserve', queue: queueFile, knowledge: knowledgeFile, control: controlFile, max: '20' });
    assert.equal(result.gameStudyPlanner.enrichedCount, 1);
    assert.match(result.task.goal, /GAME STUDY KNOWLEDGE - verified advisory context only/);
    assert.equal(result.task.evidence.includes('game-study-planner-context:v1'), true);
    assert.equal(result.task.evidence.includes('game-study-owner-directive:yes'), true);
    assert.equal(result.gameStudyPlanner.authorityExpanded, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
