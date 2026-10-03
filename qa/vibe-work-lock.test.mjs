import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireVibeWorkLock,
  createVibeWorkLockState,
  detectVibeBaseShaOverlap,
  findVibeWorkLockConflicts,
  pruneExpiredVibeWorkLocks,
  releaseVibeWorkLock,
  vibeWorkPathsOverlap
} from '../assets/vibe-work-lock.js';

const NOW = new Date('2026-09-09T00:00:00.000Z');

test('exact file and directory glob overlap are detected', () => {
  assert.equal(vibeWorkPathsOverlap('unity-games/demo/Assets/A.cs', 'unity-games/demo/Assets/A.cs'), true);
  assert.equal(vibeWorkPathsOverlap('unity-games/demo/Assets/**', 'unity-games/demo/Assets/Scripts/A.cs'), true);
  assert.equal(vibeWorkPathsOverlap('unity-games/demo/Assets/A.cs', 'unity-games/demo/Assets/B.cs'), false);
});

test('chatgpt lock blocks vibe2 on same file but not independent file', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'chatgpt',
    taskId: 'chat-1',
    gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Player.cs'],
    baseSha: 'abc123',
    leaseMinutes: 45
  }, NOW);
  assert.equal(first.acquired, true);

  const conflict = acquireVibeWorkLock(first.state, {
    worker: 'vibe2',
    taskId: 'vibe-1',
    gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Player.cs'],
    baseSha: 'def456'
  }, NOW);
  assert.equal(conflict.acquired, false);
  assert.equal(conflict.reason, 'file-lock-conflict');

  const independent = acquireVibeWorkLock(first.state, {
    worker: 'vibe2',
    taskId: 'vibe-2',
    gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Enemy.cs'],
    baseSha: 'def456'
  }, NOW);
  assert.equal(independent.acquired, true);
});

test('same worker/task acquisition is idempotent only when scope matches', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'vibe2',
    taskId: 'task-a',
    files: ['unreal-games/demo/Source/Demo/Hero.cpp'],
    baseSha: 'sha1'
  }, NOW);
  const reused = acquireVibeWorkLock(first.state, {
    worker: 'vibe2',
    taskId: 'task-a',
    files: ['unreal-games/demo/Source/Demo/Hero.cpp'],
    baseSha: 'sha1'
  }, NOW);
  assert.equal(reused.acquired, true);
  assert.equal(reused.reused, true);

  const mismatch = acquireVibeWorkLock(first.state, {
    worker: 'vibe2',
    taskId: 'task-a',
    files: ['unreal-games/demo/Source/Demo/Other.cpp'],
    baseSha: 'sha1'
  }, NOW);
  assert.equal(mismatch.acquired, false);
  assert.equal(mismatch.reason, 'worker-task-lock-mismatch');
});

test('expired locks do not block new work', () => {
  const state = createVibeWorkLockState({
    locks: [{
      id: 'old', worker: 'chatgpt', taskId: 'old-task',
      files: ['unity-games/demo/Assets/**'], baseSha: 'oldsha',
      acquiredAt: '2026-09-08T20:00:00.000Z', expiresAt: '2026-09-08T20:30:00.000Z'
    }]
  });
  const pruned = pruneExpiredVibeWorkLocks(state, NOW);
  assert.equal(pruned.locks.length, 0);
  const check = findVibeWorkLockConflicts(state, {
    worker: 'vibe2', taskId: 'new', files: ['unity-games/demo/Assets/A.cs']
  }, NOW);
  assert.equal(check.blocked, false);
});

test('release frees the file scope', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'chatgpt', taskId: 'chat-release', files: ['unity-games/demo/Assets/A.cs'], baseSha: 'x'
  }, NOW);
  const released = releaseVibeWorkLock(first.state, { lockId: first.lock.id, worker: 'chatgpt' }, NOW);
  assert.equal(released.released, true);
  assert.equal(released.state.locks.length, 0);
});

test('base SHA overlap requires replan; unrelated changes only require rebase and QA', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'chatgpt', taskId: 'base-check', files: ['unity-games/demo/Assets/Scripts/Player.cs'], baseSha: 'base'
  }, NOW);
  const conflict = detectVibeBaseShaOverlap(first.lock, ['unity-games/demo/Assets/Scripts/Player.cs']);
  assert.equal(conflict.decision, 'REPLAN_REQUIRED');
  const unrelated = detectVibeBaseShaOverlap(first.lock, ['README.md']);
  assert.equal(unrelated.decision, 'REBASE_THEN_QA');
  const clean = detectVibeBaseShaOverlap(first.lock, []);
  assert.equal(clean.decision, 'QA_ALLOWED');
});


test('lock preserves owning workflow run identity', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'vibe2',
    taskId: 'run-owned-task',
    files: ['roblox-games/demo/client/Game.client.luau'],
    baseSha: 'sha-run',
    runId: '12345',
    runAttempt: '2'
  }, NOW);
  assert.equal(first.acquired, true);
  assert.equal(first.lock.runId, '12345');
  assert.equal(first.lock.runAttempt, '2');
  const restored = createVibeWorkLockState(first.state);
  assert.equal(restored.locks[0].runId, '12345');
  assert.equal(restored.locks[0].runAttempt, '2');
});

test('same game different platform file locks can run together', () => {
  const roblox = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'vibe2', taskId: 'same-roblox', gameId: 'same',
    files: ['roblox-games/same/client/Game.client.luau'], baseSha: 'same-base'
  }, NOW);
  assert.equal(roblox.acquired, true);
  const unity = acquireVibeWorkLock(roblox.state, {
    worker: 'vibe2', taskId: 'same-unity', gameId: 'same',
    files: ['unity-games/same/Assets/Scripts/GameCore.cs'], baseSha: 'same-base'
  }, NOW);
  assert.equal(unity.acquired, true);
  const web = acquireVibeWorkLock(unity.state, {
    worker: 'vibe2', taskId: 'same-web', gameId: 'same',
    files: ['web-games/same/index.html'], baseSha: 'same-base'
  }, NOW);
  assert.equal(web.acquired, true);
});
