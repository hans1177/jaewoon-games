import test from 'node:test';
import assert from 'node:assert/strict';
import { syncRobloxOwnerDirectives } from '../tools/vibe2-roblox-owner-queue.mjs';
import { resolveVibeDevelopmentExecution } from '../tools/vibe2-development-execution-policy.mjs';

const root = 'roblox-games/seed-roblox-obby-party-minigam-tower-of-hell';

const incrementalDirective = {
  id: 'OWNER-ROBLOX-OBBY-ROUND-LOOP-20260916-R3',
  gameId: 'seed-roblox-obby-party-minigam-tower-of-hell',
  sourceRoot: root,
  responsibleFiles: [
    `${root}/server/Game.server.luau`,
    `${root}/client/Game.client.luau`
  ],
  priority: 'critical',
  workUnits: 6,
  status: 'pending',
  fullRebuild: false,
  rebuildMode: 'INCREMENTAL',
  goal: 'Add a round retry loop after finish with progression and UI feedback.'
};

test('incremental Roblox owner directive stays incremental and does not reuse world-core deterministic recipe', () => {
  const result = syncRobloxOwnerDirectives({ maxConcurrentTasks: 20, tasks: [] }, { directives: [incrementalDirective] });
  assert.equal(result.imported.length, 1);
  const task = result.queue.tasks.find((row) => row.id === incrementalDirective.id);
  assert.ok(task);
  assert.equal(task.ownerDirective, true);
  assert.equal(task.fullRebuild, false);
  assert.equal(task.rebuildMode, 'INCREMENTAL');
  assert.equal(task.evidence.includes('owner-directive:roblox-development'), true);
  assert.equal(task.evidence.includes('owner-directive:full-roblox-game-rebuild'), false);

  const execution = resolveVibeDevelopmentExecution({ task, target: 'roblox', route: 'text-source-worker' });
  assert.equal(execution.executor, 'ai-source-worker');
  assert.equal(execution.recipe, null);
  assert.equal(execution.reason, 'no-deterministic-recipe-for-task');
});
