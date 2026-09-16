import test from 'node:test';
import assert from 'node:assert/strict';
import { syncRobloxOwnerDirectives } from '../tools/vibe2-roblox-owner-queue.mjs';

const staleRobloxTask = {
  id: 'STALE-ROBLOX', gameId: 'old-game', target: 'roblox', department: 'development', type: 'implementation',
  goal: 'old', responsibleFiles: ['roblox-games/old/server/Game.server.luau'], dependencies: [], priority: 'critical',
  releaseState: 'development-confirmed', status: 'queued', retries: 0, maxRetries: 2, ownerDirective: true,
  sourceRoot: 'roblox-games/old', estimatedRisk: 'high', speculativeEligible: false,
  evidence: ['owner-directive:full-roblox-game-rebuild']
};

const unityTask = {
  id: 'KEEP-UNITY', gameId: 'unity-game', target: 'unity', department: 'development', type: 'implementation',
  goal: 'maintenance', responsibleFiles: ['unity-games/x/A.cs'], dependencies: [], priority: 'normal',
  releaseState: 'development-confirmed', status: 'queued', retries: 0, maxRetries: 2, ownerDirective: false,
  sourceRoot: 'unity-games/x', estimatedRisk: 'low', speculativeEligible: false, evidence: []
};

const directive = {
  id: 'OWNER-ROBLOX-OBBY-WORLD-CORE-20260916',
  gameId: 'seed-roblox-obby-party-minigam-tower-of-hell',
  sourceRoot: 'roblox-games/seed-roblox-obby-party-minigam-tower-of-hell',
  responsibleFiles: ['roblox-games/seed-roblox-obby-party-minigam-tower-of-hell/server/Game.server.luau'],
  priority: 'critical', workUnits: 6, status: 'pending', goal: 'FULL_REBUILD_PHASE_1_WORLD_CORE'
};

test('Roblox owner directives import without deleting non-Roblox work and prune stale Roblox directives', () => {
  const result = syncRobloxOwnerDirectives({ maxConcurrentTasks: 20, tasks: [staleRobloxTask, unityTask] }, { directives: [directive] });
  assert.equal(result.imported.length, 1);
  assert.equal(result.pruned.length, 1);
  assert.equal(result.queue.tasks.some((task) => task.id === 'STALE-ROBLOX'), false);
  assert.equal(result.queue.tasks.some((task) => task.id === 'KEEP-UNITY'), true);
  const task = result.queue.tasks.find((row) => row.id === directive.id);
  assert.ok(task);
  assert.equal(task.target, 'roblox');
  assert.equal(task.shard, 'roblox');
  assert.equal(task.ownerDirective, true);
  assert.equal(task.sourceRoot, directive.sourceRoot);
  assert.equal(task.fullRebuild, true);
  assert.equal(task.rebuildMode, 'FULL_REBUILD');
  assert.equal(task.workUnits, 6);
  assert.equal(task.taskWorkUnits, 6);
  assert.ok(task.evidence.includes('owner-directive:full-roblox-game-rebuild'));
  assert.ok(task.evidence.includes('platform-focus:roblox-primary'));
});

test('unchanged Roblox owner directive does not reset queued task on the next sync', () => {
  const first = syncRobloxOwnerDirectives({ maxConcurrentTasks: 20, tasks: [unityTask] }, { directives: [directive] });
  const second = syncRobloxOwnerDirectives(first.queue, { directives: [directive] });
  assert.equal(second.imported.length, 0);
  assert.equal(second.refreshed.length, 0);
  assert.equal(second.pruned.length, 0);
  const task = second.queue.tasks.find((row) => row.id === directive.id);
  assert.equal(task?.status, 'queued');
  assert.equal(task?.shard, 'roblox');
  assert.equal(task?.fullRebuild, true);
  assert.equal(task?.rebuildMode, 'FULL_REBUILD');
});

test('completed Roblox owner directive is inactive and prunes its imported queue task', () => {
  const first = syncRobloxOwnerDirectives({ maxConcurrentTasks: 20, tasks: [unityTask] }, { directives: [directive] });
  const completed = { ...directive, status: 'completed' };
  const second = syncRobloxOwnerDirectives(first.queue, { directives: [completed] });
  assert.equal(second.imported.length, 0);
  assert.equal(second.refreshed.length, 0);
  assert.equal(second.pruned.length, 1);
  assert.equal(second.pruned[0]?.id, directive.id);
  assert.equal(second.queue.tasks.some((row) => row.id === directive.id), false);
  assert.equal(second.queue.tasks.some((row) => row.id === 'KEEP-UNITY'), true);
});
