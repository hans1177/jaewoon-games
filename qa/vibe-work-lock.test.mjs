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
    worker: 'chatgpt', taskId: 'chat-1', gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Player.cs'], baseSha: 'abc123', leaseMinutes: 45
  }, NOW);
  assert.equal(first.acquired, true);
  const conflict = acquireVibeWorkLock(first.state, {
    worker: 'vibe2', taskId: 'vibe-1', gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Player.cs'], baseSha: 'def456'
  }, NOW);
  assert.equal(conflict.acquired, false);
  assert.equal(conflict.reason, 'file-lock-conflict');
  const independent = acquireVibeWorkLock(first.state, {
    worker: 'vibe2', taskId: 'vibe-2', gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Enemy.cs'], baseSha: 'def456'
  }, NOW);
  assert.equal(independent.acquired, true);
});

test('same worker/task acquisition is idempotent only when scope matches', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker: 'vibe2', taskId: 'task-a', files: ['unreal-games/demo/Source/Demo/Hero.cpp'], baseSha: 'sha1'
  }, NOW);
  const reused = acquireVibeWorkLock(first.state, {
    worker: 'vibe2', taskId: 'task-a', files: ['unreal-games/demo/Source/Demo/Hero.cpp'], baseSha: 'sha1'
  }, NOW);
  assert.equal(reused.acquired, true);
  assert.equal(reused.reused, true);
  const mismatch = acquireVibeWorkLock(first.state, {
    worker: 'vibe2', taskId: 'task-a', files: ['unreal-games/demo/Source/Demo/Other.cpp'], baseSha: 'sha1'
  }, NOW);
  assert.equal(mismatch.acquired, false);
  assert.equal(mismatch.reason, 'worker-task-lock-mismatch');
});

test('expired locks do not block new work', () => {
  const state = createVibeWorkLockState({locks:[{
    id:'old', worker:'chatgpt', taskId:'old-task', files:['unity-games/demo/Assets/**'], baseSha:'oldsha',
    acquiredAt:'2026-09-08T20:00:00.000Z', expiresAt:'2026-09-08T20:30:00.000Z'
  }]});
  assert.equal(pruneExpiredVibeWorkLocks(state, NOW).locks.length, 0);
  assert.equal(findVibeWorkLockConflicts(state, {
    worker:'vibe2', taskId:'new', files:['unity-games/demo/Assets/A.cs']
  }, NOW).blocked, false);
});

test('release frees the file scope', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker:'chatgpt', taskId:'chat-release', files:['unity-games/demo/Assets/A.cs'], baseSha:'x'
  }, NOW);
  const released = releaseVibeWorkLock(first.state, {lockId:first.lock.id, worker:'chatgpt'}, NOW);
  assert.equal(released.released, true);
  assert.equal(released.state.locks.length, 0);
});

test('base SHA overlap requires replan; unrelated changes only require rebase and QA', () => {
  const first = acquireVibeWorkLock(createVibeWorkLockState(), {
    worker:'chatgpt', taskId:'base-check', files:['unity-games/demo/Assets/Scripts/Player.cs'], baseSha:'base'
  }, NOW);
  assert.equal(detectVibeBaseShaOverlap(first.lock, ['unity-games/demo/Assets/Scripts/Player.cs']).decision, 'REPLAN_REQUIRED');
  assert.equal(detectVibeBaseShaOverlap(first.lock, ['README.md']).decision, 'REBASE_THEN_QA');
  assert.equal(detectVibeBaseShaOverlap(first.lock, []).decision, 'QA_ALLOWED');
});
