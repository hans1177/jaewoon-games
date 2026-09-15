import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireRemoteVibeWorkLock,
  createRemoteWorkLockContext,
  releaseRemoteVibeWorkLock
} from '../tools/vibe2-remote-work-lock.mjs';

const context = createRemoteWorkLockContext({ repository: 'hans1177/jaewoon-games', token: 'test-token' });
const noDelay = async () => {};
const jsonResponse = (status, body = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body
});
const encodedState = (locks = []) => Buffer.from(JSON.stringify({ version: 1, branch: 'vibe2-work-locks', locks }), 'utf8').toString('base64');

function activeLock(overrides = {}) {
  return {
    id: 'held-lock',
    worker: 'chatgpt',
    taskId: 'chat-task',
    gameId: 'demo',
    files: ['unity-games/demo/Assets/Scripts/Player.cs'],
    baseSha: 'main-a',
    acquiredAt: '2026-09-09T00:00:00.000Z',
    expiresAt: '2099-09-09T01:00:00.000Z',
    status: 'active',
    evidence: [],
    ...overrides
  };
}

test('remote acquire writes with the observed blob SHA and lock-state branch', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if ((options.method || 'GET') === 'GET') {
      return jsonResponse(200, { sha: 'state-sha-1', content: encodedState([]) });
    }
    const body = JSON.parse(options.body);
    assert.equal(body.sha, 'state-sha-1');
    assert.equal(body.branch, 'vibe2-work-locks');
    const written = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    assert.equal(written.locks.length, 1);
    assert.equal(written.locks[0].worker, 'vibe2');
    return jsonResponse(200, { commit: { sha: 'lock-commit-1' } });
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'vibe-task',
    game: 'demo',
    files: 'unity-games/demo/Assets/Scripts/Player.cs',
    'base-sha': 'main-a'
  }, { context, fetchImpl, delay: noDelay });

  assert.equal(result.acquired, true);
  assert.equal(result.remoteUpdated, true);
  assert.equal(result.attempt, 1);
  assert.equal(result.commitSha, 'lock-commit-1');
  assert.equal(calls.length, 2);
});

test('409 race rereads state and stops when ChatGPT acquired the same file first', async () => {
  let call = 0;
  const fetchImpl = async (_url, options = {}) => {
    call += 1;
    if (call === 1) {
      assert.equal(options.method, undefined);
      return jsonResponse(200, { sha: 'state-sha-old', content: encodedState([]) });
    }
    if (call === 2) {
      assert.equal(options.method, 'PUT');
      return jsonResponse(409, {});
    }
    if (call === 3) {
      assert.equal(options.method, undefined);
      return jsonResponse(200, { sha: 'state-sha-new', content: encodedState([activeLock()]) });
    }
    throw new Error(`unexpected fetch call ${call}`);
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'vibe-race-task',
    game: 'demo',
    files: 'unity-games/demo/Assets/Scripts/Player.cs',
    'base-sha': 'main-a'
  }, { context, fetchImpl, delay: noDelay, maxAttempts: 3 });

  assert.equal(result.acquired, false);
  assert.equal(result.reason, 'file-lock-conflict');
  assert.equal(result.remoteUpdated, false);
  assert.equal(result.attempt, 2);
  assert.equal(result.conflicts[0].lock.worker, 'chatgpt');
  assert.equal(call, 3);
});

test('remote release retries a 409 with the latest state SHA', async () => {
  const held = activeLock({ id: 'vibe-held', worker: 'vibe2', taskId: 'vibe-task' });
  let call = 0;
  const fetchImpl = async (_url, options = {}) => {
    call += 1;
    if (call === 1) return jsonResponse(200, { sha: 'release-old', content: encodedState([held]) });
    if (call === 2) {
      const body = JSON.parse(options.body);
      assert.equal(body.sha, 'release-old');
      return jsonResponse(409, {});
    }
    if (call === 3) return jsonResponse(200, { sha: 'release-new', content: encodedState([held]) });
    if (call === 4) {
      const body = JSON.parse(options.body);
      assert.equal(body.sha, 'release-new');
      const written = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      assert.equal(written.locks.length, 0);
      return jsonResponse(200, { commit: { sha: 'release-commit' } });
    }
    throw new Error(`unexpected fetch call ${call}`);
  };

  const result = await releaseRemoteVibeWorkLock({ worker: 'vibe2', id: 'vibe-held' }, {
    context,
    fetchImpl,
    delay: noDelay,
    maxAttempts: 3
  });

  assert.equal(result.released, true);
  assert.equal(result.remoteUpdated, true);
  assert.equal(result.attempt, 2);
  assert.equal(result.commitSha, 'release-commit');
  assert.equal(call, 4);
});
