import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {
  acquireRemoteVibeWorkLock,
  createGitCasTransport,
  createRemoteWorkLockContext,
  releaseRemoteVibeWorkLock,
  remoteWorkLockRetryDelayMs
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

test('remote acquire falls back to Git CAS when Contents API write is rate limited', async () => {
  const fallbackWrites = [];
  const gitTransport = {
    write: async (request) => {
      fallbackWrites.push(request);
      return { updated: true, retryable: false, status: 200, commitSha: 'git-cas-commit', transport: 'git-cas' };
    }
  };
  const fetchImpl = async (_url, options = {}) => {
    if ((options.method || 'GET') === 'GET') {
      return jsonResponse(200, { sha: 'observed-blob', content: encodedState([]) });
    }
    return jsonResponse(403, { message: 'API rate limit exceeded for installation' });
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'rate-limited-lock-task',
    game: 'demo',
    files: 'roblox-games/demo/server/Game.server.luau',
    'base-sha': 'main-rate-limited'
  }, { context, fetchImpl, gitTransport, delay: noDelay });

  assert.equal(result.acquired, true);
  assert.equal(result.remoteUpdated, true);
  assert.equal(result.remoteTransport, 'git-cas');
  assert.equal(result.apiStatus, 403);
  assert.equal(result.commitSha, 'git-cas-commit');
  assert.equal(fallbackWrites.length, 1);
  assert.equal(fallbackWrites[0].observedBlobSha, 'observed-blob');
  assert.equal(fallbackWrites[0].state.locks[0].taskId, 'rate-limited-lock-task');
});

test('remote acquire falls back to Git CAS when Contents API read is rate limited', async () => {
  let reads = 0;
  let writes = 0;
  const gitTransport = {
    read: async () => {
      reads += 1;
      return { sha: 'git-blob', state: { locks: [] }, transport: 'git-cas' };
    },
    write: async ({ observedBlobSha }) => {
      writes += 1;
      assert.equal(observedBlobSha, 'git-blob');
      return { updated: true, retryable: false, status: 200, commitSha: 'git-read-fallback-commit', transport: 'git-cas' };
    }
  };
  const fetchImpl = async (_url, options = {}) => {
    if ((options.method || 'GET') === 'GET') return jsonResponse(429, { message: 'too many requests' });
    return jsonResponse(429, { message: 'too many requests' });
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'read-rate-limited-lock-task',
    game: 'demo',
    files: 'unity-games/demo/Assets/Scripts/Game.cs',
    'base-sha': 'main-read-rate-limited'
  }, { context, fetchImpl, gitTransport, delay: noDelay });

  assert.equal(result.acquired, true);
  assert.equal(result.remoteTransport, 'git-cas');
  assert.equal(result.apiStatus, 429);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
});

test('Git CAS transport updates the dedicated lock branch without the Contents API', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-work-lock-git-cas-'));
  const remote = path.join(root, 'remote.git');
  const seed = path.join(root, 'seed');
  const worker = path.join(root, 'worker');
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' });
    execFileSync('git', ['clone', remote, seed], { stdio: 'ignore' });
    git(seed, 'config', 'user.name', 'test');
    git(seed, 'config', 'user.email', 'test@example.com');
    fs.mkdirSync(path.join(seed, '.vibe2'), { recursive: true });
    fs.writeFileSync(path.join(seed, '.vibe2', 'work-locks.json'), `${JSON.stringify({ version: 1, branch: 'vibe2-work-locks', locks: [] }, null, 2)}\n`);
    git(seed, 'add', '.vibe2/work-locks.json');
    git(seed, 'commit', '-m', 'seed lock state');
    git(seed, 'branch', '-M', 'vibe2-work-locks');
    git(seed, 'push', '-u', 'origin', 'vibe2-work-locks');
    execFileSync('git', ['clone', '--branch', 'vibe2-work-locks', remote, worker], { stdio: 'ignore' });

    const transport = createGitCasTransport({ cwd: worker });
    const before = await transport.read();
    const next = {
      ...before.state,
      locks: [activeLock({ id: 'git-cas-lock', worker: 'vibe2', taskId: 'git-cas-task' })]
    };
    const write = await transport.write({
      observedBlobSha: before.sha,
      state: next,
      message: 'test: acquire git cas lock'
    });
    assert.equal(write.updated, true);
    assert.equal(write.transport, 'git-cas');
    const after = await transport.read();
    assert.equal(after.state.locks.length, 1);
    assert.equal(after.state.locks[0].taskId, 'git-cas-task');
    assert.equal(git(worker, 'log', '-1', '--format=%s', 'FETCH_HEAD').trim(), 'test: acquire git cas lock');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('default remote acquire disperses transient CAS races and continues beyond the old three-attempt herd', async () => {
  let reads = 0;
  let writes = 0;
  const delays = [];
  const fetchImpl = async (_url, options = {}) => {
    if ((options.method || 'GET') === 'GET') {
      reads += 1;
      return jsonResponse(200, { sha: `state-sha-${reads}`, content: encodedState([]) });
    }
    writes += 1;
    if (writes <= 3) return jsonResponse(409, {});
    return jsonResponse(200, { commit: { sha: 'lock-commit-after-races' } });
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'parallel-lock-race-task',
    game: 'demo',
    files: 'unity-games/demo/Assets/Scripts/Player.cs',
    'base-sha': 'main-a'
  }, {
    context,
    fetchImpl,
    delay: async (ms) => delays.push(ms)
  });

  assert.equal(result.acquired, true);
  assert.equal(result.remoteUpdated, true);
  assert.equal(result.attempt, 4);
  assert.equal(result.commitSha, 'lock-commit-after-races');
  assert.equal(reads, 4);
  assert.equal(writes, 4);
  assert.deepEqual(delays, [
    remoteWorkLockRetryDelayMs('parallel-lock-race-task', 1),
    remoteWorkLockRetryDelayMs('parallel-lock-race-task', 2),
    remoteWorkLockRetryDelayMs('parallel-lock-race-task', 3)
  ]);
  assert.ok(new Set(delays).size > 1);
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

test('repeated remote acquire state races defer without becoming a worker failure', async () => {
  let call = 0;
  const fetchImpl = async (_url, options = {}) => {
    call += 1;
    if ((options.method || 'GET') === 'GET') {
      return jsonResponse(200, { sha: `state-sha-${call}`, content: encodedState([]) });
    }
    return jsonResponse(409, {});
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'vibe-race-defer',
    game: 'demo',
    files: 'unity-games/demo/Assets/Scripts/Player.cs',
    'base-sha': 'main-a'
  }, { context, fetchImpl, delay: noDelay, maxAttempts: 3 });

  assert.equal(result.acquired, false);
  assert.equal(result.reason, 'transient-state-update-race');
  assert.equal(result.transient, true);
  assert.equal(result.contention, true);
  assert.equal(result.remoteUpdated, false);
  assert.equal(result.attempt, 3);
  assert.equal(call, 6);
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


test('completed Vibe2 owner run is reclaimed before overlapping acquire', async () => {
  const held = activeLock({
    id: 'stale-vibe-lock',
    worker: 'vibe2',
    taskId: 'old-vibe-task',
    runId: '123456',
    runAttempt: '1'
  });
  let stateReads = 0;
  let runReads = 0;
  let writes = 0;
  const fetchImpl = async (url, options = {}) => {
    if (url.includes('/actions/runs/123456')) {
      runReads += 1;
      return jsonResponse(200, { status: 'completed', conclusion: 'cancelled' });
    }
    if ((options.method || 'GET') === 'GET') {
      stateReads += 1;
      return jsonResponse(200, { sha: 'stale-state-sha', content: encodedState([held]) });
    }
    writes += 1;
    const body = JSON.parse(options.body);
    const written = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    assert.equal(written.locks.some((lock) => lock.id === 'stale-vibe-lock'), false);
    assert.equal(written.locks.length, 1);
    assert.equal(written.locks[0].taskId, 'new-vibe-task');
    assert.equal(written.locks[0].runId, '987654');
    return jsonResponse(200, { commit: { sha: 'reclaim-commit' } });
  };

  const result = await acquireRemoteVibeWorkLock({
    worker: 'vibe2',
    task: 'new-vibe-task',
    game: 'demo',
    files: 'unity-games/demo/Assets/Scripts/Player.cs',
    'base-sha': 'main-b',
    'run-id': '987654',
    'run-attempt': '2'
  }, { context, fetchImpl, delay: noDelay });

  assert.equal(result.acquired, true);
  assert.deepEqual(result.reclaimedLockIds, ['stale-vibe-lock']);
  assert.equal(result.remoteUpdated, true);
  assert.equal(stateReads, 1);
  assert.equal(runReads, 1);
  assert.equal(writes, 1);
});


test('continuous worker binds shared lock to the owning Actions run', () => {
  const workflow = fs.readFileSync('.github/workflows/vibe2-continuous-core.yml', 'utf8');
  const acquire = workflow.slice(workflow.indexOf('      - name: Acquire shared Work Lock before source write'));
  assert.match(acquire, /--run-id="\$\{GITHUB_RUN_ID:-\}"/);
  assert.match(acquire, /--run-attempt="\$\{GITHUB_RUN_ATTEMPT:-\}"/);
});


test('remote acquire falls back to GitHub Actions run identity for older queued workflows', async () => {
  const previousRun = process.env.GITHUB_RUN_ID;
  const previousAttempt = process.env.GITHUB_RUN_ATTEMPT;
  process.env.GITHUB_RUN_ID = '7654321';
  process.env.GITHUB_RUN_ATTEMPT = '3';
  try {
    const fetchImpl = async (_url, options = {}) => {
      if ((options.method || 'GET') === 'GET') {
        return jsonResponse(200, { sha: 'fallback-state', content: encodedState([]) });
      }
      const body = JSON.parse(options.body);
      const written = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      assert.equal(written.locks[0].runId, '7654321');
      assert.equal(written.locks[0].runAttempt, '3');
      return jsonResponse(200, { commit: { sha: 'fallback-commit' } });
    };
    const result = await acquireRemoteVibeWorkLock({
      worker: 'vibe2',
      task: 'fallback-run-task',
      game: 'demo',
      files: 'roblox-games/demo/client/Game.client.luau',
      'base-sha': 'main-c'
    }, { context, fetchImpl, delay: noDelay });
    assert.equal(result.acquired, true);
  } finally {
    if (previousRun === undefined) delete process.env.GITHUB_RUN_ID;
    else process.env.GITHUB_RUN_ID = previousRun;
    if (previousAttempt === undefined) delete process.env.GITHUB_RUN_ATTEMPT;
    else process.env.GITHUB_RUN_ATTEMPT = previousAttempt;
  }
});
