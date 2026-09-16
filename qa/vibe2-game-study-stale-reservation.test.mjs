import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareGameStudyQueue, reserveGameStudyBatch } from '../tools/vibe2-game-study-queue.mjs';

const targetId = 'external-roblox-potion-shop-flow-a';
const taskId = `game-study-${targetId}`;
const targets = {
  maxConcurrentTasks: 20,
  targets: [{
    id: targetId,
    enabled: true,
    engine: 'roblox',
    gameId: 'external-roblox-potion-shop-demo',
    scenarioFile: '.vibe2/game-study-scenarios/external-roblox-potion-shop-flow-a.json',
    sourceAccess: 'owned-or-authorized-server-workspace',
    sourceRoot: '.vibe2/authorized-roblox-source/potion-shop-demo',
    runnerReady: true,
    timeoutMs: 240000
  }]
};

function runningTask(extra = {}) {
  return {
    id: taskId,
    gameId: 'external-roblox-potion-shop-demo',
    target: 'roblox',
    department: 'qa',
    type: 'research',
    goal: 'study',
    status: 'running',
    retries: 1,
    maxRetries: 2,
    sourceRoot: '.vibe2/authorized-roblox-source/potion-shop-demo',
    evidence: [
      `game-study-target:${targetId}`,
      'game-study-engine:roblox',
      'game-study-production-fanin:game-study-result-missing'
    ],
    ...extra
  };
}

test('legacy GAME STUDY running task with settled missing-result evidence is recovered', () => {
  const nowMs = Date.parse('2026-09-16T09:00:00Z');
  const prepared = prepareGameStudyQueue({ maxConcurrentTasks: 20, tasks: [runningTask()] }, targets, { nowMs });
  const task = prepared.queue.tasks.find((row) => row.id === taskId);
  assert.equal(task.status, 'queued');
  assert.equal(task.retries, 1);
  assert(task.evidence.includes('game-study-stale-running-recovered'));
});

test('fresh leased GAME STUDY task is not reclaimed even with historical missing-result evidence', () => {
  const nowMs = Date.parse('2026-09-16T09:00:00Z');
  const prepared = prepareGameStudyQueue({
    maxConcurrentTasks: 20,
    tasks: [runningTask({ gameStudyReservationAt: new Date(nowMs - 60000).toISOString() })]
  }, targets, { nowMs });
  const task = prepared.queue.tasks.find((row) => row.id === taskId);
  assert.equal(task.status, 'running');
  assert.equal(task.gameStudyReservationAt, new Date(nowMs - 60000).toISOString());
  assert.equal(task.evidence.includes('game-study-stale-running-recovered'), false);
});

test('normal running GAME STUDY task without fan-in failure evidence is never reclaimed', () => {
  const nowMs = Date.parse('2026-09-16T09:00:00Z');
  const task = runningTask({ evidence: [`game-study-target:${targetId}`, 'game-study-engine:roblox'] });
  const prepared = prepareGameStudyQueue({ maxConcurrentTasks: 20, tasks: [task] }, targets, { nowMs });
  assert.equal(prepared.queue.tasks.find((row) => row.id === taskId).status, 'running');
});

test('new reservation records a lease timestamp so later cycles can distinguish live from stale work', () => {
  const nowMs = Date.parse('2026-09-16T09:00:00Z');
  const result = reserveGameStudyBatch({ maxConcurrentTasks: 20, tasks: [runningTask()] }, targets, { currentMax: 20 }, { maxConcurrentTasks: 20, nowMs });
  const task = result.queue.tasks.find((row) => row.id === taskId);
  assert.equal(result.robloxMatrix.length, 1);
  assert.equal(task.status, 'running');
  assert.equal(task.gameStudyReservationAt, new Date(nowMs).toISOString());
  assert(task.evidence.includes('game-study-stale-running-recovered'));
});
