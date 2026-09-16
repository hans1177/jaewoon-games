import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGameStudyQueue, reserveGameStudyBatch } from '../tools/vibe2-game-study-queue.mjs';

const target = {
  version: 1,
  maxConcurrentTasks: 20,
  targets: [{
    id: 'external-roblox-potion-shop-flow-a',
    enabled: true,
    engine: 'roblox',
    gameId: 'external-roblox-potion-shop-demo',
    scenarioFile: '.vibe2/game-study-scenarios/roblox-potion-shop-flow-a.json',
    sourceRoot: '.vibe2/authorized-roblox-source/potion-shop-demo',
    sourceAccess: 'owned-or-authorized-server-workspace',
    runnerReady: true,
    priority: 'low'
  }]
};

function studyTask(overrides = {}) {
  return {
    id: 'game-study-external-roblox-potion-shop-flow-a',
    gameId: 'external-roblox-potion-shop-demo',
    target: 'roblox',
    department: 'qa',
    type: 'research',
    goal: 'study',
    status: 'running',
    retries: 0,
    maxRetries: 2,
    sourceRoot: '.vibe2/authorized-roblox-source/potion-shop-demo',
    evidence: [
      'game-study-target:external-roblox-potion-shop-flow-a',
      'game-study-engine:roblox'
    ],
    ...overrides
  };
}

test('prepareGameStudyQueue recovers running task after immutable fan-in reports a missing result', () => {
  const queue = {
    maxConcurrentTasks: 20,
    tasks: [studyTask({
      evidence: [
        'game-study-target:external-roblox-potion-shop-flow-a',
        'game-study-engine:roblox',
        'game-study-production-fanin:game-study-result-missing'
      ]
    })]
  };

  const prepared = prepareGameStudyQueue(queue, target);
  const recovered = prepared.queue.tasks.find((row) => row.id === 'game-study-external-roblox-potion-shop-flow-a');
  assert.equal(recovered.status, 'queued');
  assert.equal(recovered.retries, 0);
  assert.equal(recovered.lastOutcome ?? null, null);
  assert(recovered.evidence.includes('game-study-production-fanin:game-study-result-missing'));
  assert(recovered.evidence.includes('game-study-stale-running-recovered'));
});

test('prepareGameStudyQueue preserves a healthy running GAME STUDY task', () => {
  const original = studyTask();
  const prepared = prepareGameStudyQueue({ maxConcurrentTasks: 20, tasks: [original] }, target);
  const running = prepared.queue.tasks.find((row) => row.id === original.id);
  assert.equal(running.status, 'running');
  assert.equal(running.evidence.includes('game-study-stale-running-recovered'), false);
});

test('reserveGameStudyBatch can select a recovered Roblox task again', () => {
  const queue = {
    maxConcurrentTasks: 20,
    tasks: [studyTask({
      evidence: [
        'game-study-target:external-roblox-potion-shop-flow-a',
        'game-study-engine:roblox',
        'game-study-production-fanin:game-study-result-missing'
      ]
    })]
  };

  const reserved = reserveGameStudyBatch(queue, target, { currentMax: 20 }, { maxConcurrentTasks: 20 });
  assert.equal(reserved.selectedCount, 1);
  assert.equal(reserved.robloxMatrix.length, 1);
  assert.equal(reserved.robloxMatrix[0].taskId, 'game-study-external-roblox-potion-shop-flow-a');
  const selected = reserved.queue.tasks.find((row) => row.id === 'game-study-external-roblox-potion-shop-flow-a');
  assert.equal(selected.status, 'running');
  assert(selected.evidence.includes('game-study-stale-running-recovered'));
});
