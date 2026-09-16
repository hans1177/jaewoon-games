import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reserveGameStudyBatch } from '../tools/vibe2-game-study-queue.mjs';

const queue = { version: 5, maxConcurrentTasks: 20, tasks: [] };
const control = { version: 2, currentMax: 20 };
const targets = {
  version: 1,
  maxConcurrentTasks: 20,
  targets: [
    {
      id: 'web-study', enabled: true, engine: 'web', gameId: 'web-reference',
      url: 'https://example.test/game', scenarioFile: '.vibe2/game-study-scenarios/web-study.json',
      sourceAccess: 'observation-only', priority: 'low'
    },
    {
      id: 'roblox-study', enabled: true, engine: 'roblox', gameId: 'roblox-reference',
      scenarioFile: '.vibe2/game-study-scenarios/roblox-study.json',
      sourceAccess: 'owned-or-authorized-server-workspace', sourceRoot: '.vibe2/authorized-roblox-source/test',
      runnerReady: true, priority: 'normal'
    }
  ]
};

test('offline dedicated Roblox runner does not consume the shared GAME STUDY slot', () => {
  const result = reserveGameStudyBatch(queue, targets, control, {
    maxConcurrentTasks: 1,
    robloxRunnerReady: false,
    nowMs: Date.parse('2026-09-16T12:00:00Z')
  });

  assert.equal(result.selectedCount, 1);
  assert.equal(result.webMatrix.length, 1);
  assert.equal(result.webMatrix[0].targetId, 'web-study');
  assert.equal(result.robloxMatrix.length, 0);
  assert.equal(result.runtimeReadiness.robloxRunnerReady, false);
  assert.equal(result.runtimeReadiness.deferredRobloxCount, 1);
  assert.equal(result.runtimeReadiness.productionFallback, false);
  assert.equal(result.scheduler.runtimeDeferredRobloxCount, 1);

  const robloxTask = result.queue.tasks.find((task) => task.id === 'game-study-roblox-study');
  assert.equal(robloxTask.status, 'blocked');
  assert.equal(robloxTask.blocker, 'roblox-dedicated-runner-offline-deferred');
  assert.equal(robloxTask.gameStudyReservationAt, null);
  assert.ok(robloxTask.evidence.includes('game-study-runtime-readiness:roblox-offline'));
  assert.ok(robloxTask.evidence.includes('production-studio-untouched'));
});

test('online dedicated Roblox runner restores normal priority-based reservation', () => {
  const result = reserveGameStudyBatch(queue, targets, control, {
    maxConcurrentTasks: 1,
    robloxRunnerReady: true,
    nowMs: Date.parse('2026-09-16T12:00:00Z')
  });

  assert.equal(result.selectedCount, 1);
  assert.equal(result.robloxMatrix.length, 1);
  assert.equal(result.robloxMatrix[0].targetId, 'roblox-study');
  assert.equal(result.webMatrix.length, 0);
  assert.equal(result.runtimeReadiness.robloxRunnerReady, true);
  assert.equal(result.runtimeReadiness.deferredRobloxCount, 0);
});

test('workflow and machine study policy bind reservation to live runner readiness without production fallback', () => {
  const workflow = fs.readFileSync('.github/workflows/vibe2-game-study-continuous.yml', 'utf8');
  const config = JSON.parse(fs.readFileSync('.vibe2/game-study-targets.json', 'utf8'));

  assert.match(workflow, /--roblox-ready="\$\{VIBE2_ROBLOX_DEDICATED_RUNNER_READY:-false\}"/);
  assert.match(workflow, /runs-on: \[self-hosted, Windows, vibe2-roblox\]/);
  assert.doesNotMatch(workflow, /roblox-studio-local/);
  assert.doesNotMatch(workflow, /runs-on: \$\{\{ vars\.VIBE2_ROBLOX_STUDIO_RUNNER_READY/);

  assert.equal(config.policy.runtimeReadinessScheduling.offlineBehavior, 'preserve-queue-without-consuming-study-slot');
  assert.equal(config.policy.runtimeReadinessScheduling.productionRunnerFallback, false);
  assert.equal(config.policy.runtimeReadinessScheduling.productionStudioUntouched, true);
  assert.equal(config.policy.robloxMaterialCollector.enabled, true);
  assert.equal(config.policy.robloxMaterialCollector.verifiedCrossGamePatternsOnly, true);
  assert.equal(config.policy.robloxMaterialCollector.rawSourceIncluded, false);
  assert.equal(config.policy.robloxMaterialCollector.rawGameplayValuesIncluded, false);
  assert.equal(config.policy.robloxMaterialCollector.authorityExpanded, false);
});
