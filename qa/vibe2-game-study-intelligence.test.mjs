import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoPlayerResult } from '../tools/vibe2-auto-player-contract.mjs';
import { createVerifiedGameStudy } from '../tools/vibe2-game-study.mjs';
import {
  GAME_STUDY_INTELLIGENCE_FEATURES,
  buildGameStudyIntelligence,
  attachGameStudyIntelligence,
  createGameStudyKnowledge,
  updateGameStudyKnowledge,
  findNearestGameStudies,
  gameStudyIntelligenceSummary
} from '../tools/vibe2-game-study-intelligence.mjs';
import { applyGameStudyFanIn } from '../tools/vibe2-game-study-queue.mjs';

function autoPlayer(runId = 'study-intel-1') {
  return createAutoPlayerResult({
    engine: 'web',
    runId,
    actions: [
      { id: 'start-button', type: 'click', dispatched: true, ok: true },
      { id: 'move-right', type: 'key', dispatched: true, ok: true },
      { id: 'attack-enemy', type: 'key', dispatched: true, ok: true },
      { id: 'open-shop', type: 'click', dispatched: true, ok: true },
      { id: 'restart-button', type: 'click', dispatched: true, ok: true }
    ],
    checkpoints: [
      { id: 'combat-reward', name: 'combat reward gold', required: true, pass: true },
      { id: 'level-progress', name: 'level progress checkpoint', required: true, pass: true },
      { id: 'restart-ready', name: 'restart ready', required: true, pass: true }
    ],
    errors: [],
    metrics: {
      durationMs: 800,
      levelSeries: [1, 2, 3],
      goldSeries: [0, 10, 4, 20],
      enemyHpSeries: [100, 70, 20, 0]
    }
  });
}

function baseStudy(gameId = 'game-a', runId = 'study-intel-1') {
  const result = autoPlayer(runId);
  const study = createVerifiedGameStudy({ gameId, engine: 'web', autoPlayerResult: result, tags: ['rpg', 'shop', 'combat'] });
  return { result, study };
}

test('GAME STUDY intelligence exposes all 25 requested learning capabilities', () => {
  assert.equal(GAME_STUDY_INTELLIGENCE_FEATURES.length, 25);
  assert.equal(new Set(GAME_STUDY_INTELLIGENCE_FEATURES).size, 25);
});

test('verified play becomes mechanic, graph, curves, UI, onboarding, state, DNA and synthetic replay evidence', () => {
  const { result, study } = baseStudy();
  const intelligence = buildGameStudyIntelligence({ study, autoPlayer: result });
  assert.equal(intelligence.featureCatalog.length, 25);
  assert.equal(intelligence.features['mechanic-mining'].status, 'VERIFIED');
  assert.equal(intelligence.features['system-graph-learning'].status, 'VERIFIED');
  assert.equal(intelligence.features['progression-curve-learning'].status, 'VERIFIED');
  assert.equal(intelligence.features['economy-simulation-learning'].status, 'VERIFIED');
  assert.equal(intelligence.features['difficulty-curve-learning'].status, 'VERIFIED');
  assert.equal(intelligence.features['ui-interaction-mining'].status, 'VERIFIED');
  assert.equal(intelligence.features['onboarding-learning'].status, 'VERIFIED');
  assert.equal(intelligence.features['state-machine-extraction'].status, 'VERIFIED');
  assert.equal(intelligence.features['game-dna'].status, 'VERIFIED');
  assert.equal(intelligence.features['synthetic-mini-game-training'].status, 'VERIFIED');
  assert.equal(intelligence.policy.noInventedCausality, true);
  assert.equal(intelligence.authorityExpanded, false);
});

test('quantitative learning refuses to invent curves when numeric series are absent', () => {
  const result = createAutoPlayerResult({
    engine: 'web', runId: 'no-series',
    actions: [{ id: 'attack-enemy', type: 'key', dispatched: true, ok: true }],
    checkpoints: [{ id: 'combat-pass', name: 'combat pass', required: true, pass: true }],
    errors: [], metrics: { durationMs: 100 }
  });
  const study = createVerifiedGameStudy({ gameId: 'no-series', engine: 'web', autoPlayerResult: result });
  const intelligence = buildGameStudyIntelligence({ study, autoPlayer: result });
  assert.equal(intelligence.features['progression-curve-learning'].status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(intelligence.features['economy-simulation-learning'].status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(intelligence.features['difficulty-curve-learning'].status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(intelligence.features['knowledge-conflict'].status, 'PENDING_CROSS_GAME');
});

test('attached intelligence contributes only generalized patterns to Experience Memory input', () => {
  const { result, study } = baseStudy();
  const enriched = attachGameStudyIntelligence(study, result);
  assert.equal(enriched.intelligence.featureCatalog.length, 25);
  assert(enriched.distilledPatterns.some((row) => row.startsWith('study-intelligence:mechanic:')));
  assert.equal(enriched.authorityExpanded, false);
});

test('cross-game knowledge performs nearest retrieval, novelty, merge, hypothesis testing and continual distillation', () => {
  const firstBase = baseStudy('game-a', 'run-a');
  const secondBase = baseStudy('game-b', 'run-b');
  const first = attachGameStudyIntelligence(firstBase.study, firstBase.result);
  const second = attachGameStudyIntelligence(secondBase.study, secondBase.result);
  let knowledge = createGameStudyKnowledge({});
  const a = updateGameStudyKnowledge(knowledge, first);
  assert.equal(a.updated, true);
  knowledge = a.knowledge;
  const b = updateGameStudyKnowledge(knowledge, second);
  assert.equal(b.updated, true);
  knowledge = b.knowledge;
  const nearest = findNearestGameStudies(knowledge, second.intelligence.gameDna, { excludeGameId: 'game-b' });
  assert.equal(nearest[0].gameId, 'game-a');
  assert(nearest[0].similarity > 0.9);
  assert(knowledge.derived.mergedKnowledge.some((row) => row.crossGameVerified));
  assert(knowledge.derived.hypotheses.some((row) => row.status === 'SUPPORTED_ACROSS_GAMES'));
  assert.equal(knowledge.derived.continualDistillation.inputEntryCount, 2);
  assert.equal(typeof knowledge.derived.latestNovelty.novelty, 'number');
  const summary = gameStudyIntelligenceSummary(knowledge);
  assert.equal(summary.gameCount, 2);
  assert(summary.crossGamePatternCount > 0);
  assert.equal(summary.featureCount, 25);
});

test('fan-in updates Experience Memory and centralized GAME STUDY knowledge together', () => {
  const { result, study } = baseStudy('fan-in-game', 'fan-in-run');
  const enriched = attachGameStudyIntelligence(study, result);
  const queue = {
    maxConcurrentTasks: 20,
    tasks: [{
      id: 'game-study-fan-in', gameId: 'fan-in-game', target: 'web', department: 'qa', type: 'research', goal: 'study',
      status: 'running', retries: 0, maxRetries: 2, sourceRoot: 'game-study:fan-in', evidence: ['game-study-target:fan-in']
    }]
  };
  const fanIn = applyGameStudyFanIn({
    queueInput: queue,
    experienceInput: { records: [] },
    knowledgeInput: { entries: [] },
    results: [{ taskId: 'game-study-fan-in', outcome: 'PASS', study: enriched, evidence: ['worker:pass'] }]
  });
  assert.equal(fanIn.applied[0].promoted, true);
  assert.equal(fanIn.applied[0].knowledgeUpdated, true);
  assert.equal(fanIn.memory.records.length, 1);
  assert.equal(fanIn.knowledge.entries.length, 1);
  assert.equal(fanIn.knowledgeSummary.featureCount, 25);
  assert.equal(fanIn.queue.tasks[0].status, 'done');
  assert(fanIn.queue.tasks[0].evidence.includes('game-study-knowledge-updated'));
});
