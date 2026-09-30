// 파일명: tools/vibe2-remote-work-lock.mjs
// 역할: GitHub의 vibe2-work-locks 브랜치에 공용 Work Lock을 원자적으로 획득/해제한다.
// 원칙: Contents API의 blob SHA 조건부 갱신을 사용하고 409/422 경쟁 시 최신 상태를 다시 읽어 재판정한다.
// API 쓰기 제한 중에는 같은 blob SHA를 검증한 Git force-with-lease CAS로 전환해 잠금 의미를 보존한다.

import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  VIBE_WORK_LOCK_STATE_BRANCH,
  VIBE_WORK_LOCK_STATE_PATH,
  acquireVibeWorkLock,
  createVibeWorkLockState,
  releaseVibeWorkLock
} from '../assets/vibe-work-lock.js';

const clean = (value) => String(value ?? '').trim();
const list = (value) => clean(value).split(',').map(clean).filter(Boolean);
const execFileAsync = promisify(execFile);

function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'summary', ...rest] = argv;
  const args = { command };
  for (const raw of rest) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}

export function createRemoteWorkLockContext(overrides = {}) {
  const repository = clean(overrides.repository || process.env.GITHUB_REPOSITORY);
  const token = clean(overrides.token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  if (!repository || !repository.includes('/')) throw new Error('GITHUB_REPOSITORY required');
  if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN required');
  const [owner, repo] = repository.split('/');
  return { repository, owner, repo, token };
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'jaewoon-vibe2-work-lock'
  };
}

function apiWriteRetryable(status) {
  return status === 409 || status === 422;
}

function apiRateLimited(status) {
  return status === 403 || status === 429;
}

export function createGitCasTransport(overrides = {}) {
  const cwd = clean(overrides.cwd) || process.cwd();
  const runGit = overrides.runGit || (async (args, options = {}) => execFileAsync('git', ['-C', cwd, ...args], {
    maxBuffer: 4 * 1024 * 1024,
    ...options
  }));

  async function readHead() {
    await runGit(['fetch', '--no-tags', 'origin', `refs/heads/${VIBE_WORK_LOCK_STATE_BRANCH}`]);
    const { stdout: headOut } = await runGit(['rev-parse', 'FETCH_HEAD']);
    const head = clean(headOut);
    const { stdout: blobOut } = await runGit(['rev-parse', `${head}:${VIBE_WORK_LOCK_STATE_PATH}`]);
    const { stdout: raw } = await runGit(['show', `${head}:${VIBE_WORK_LOCK_STATE_PATH}`]);
    return {
      head,
      sha: clean(blobOut),
      state: createVibeWorkLockState(JSON.parse(raw))
    };
  }

  return {
    async read() {
      const current = await readHead();
      return { sha: current.sha, state: current.state, transport: 'git-cas' };
    },
    async write({ observedBlobSha, state, message }) {
      const current = await readHead();
      if (current.sha !== clean(observedBlobSha)) {
        return { updated: false, retryable: true, status: 409, transport: 'git-cas', reason: 'stale-observed-blob' };
      }
      const temporary = await mkdtemp(join(tmpdir(), 'vibe2-work-lock-'));
      const stateFile = join(temporary, 'work-locks.json');
      const indexFile = join(temporary, 'index');
      const gitEnv = {
        ...process.env,
        GIT_INDEX_FILE: indexFile,
        GIT_AUTHOR_NAME: 'jaewoon-vibe2-work-lock',
        GIT_AUTHOR_EMAIL: 'vibe2-work-lock@users.noreply.github.com',
        GIT_COMMITTER_NAME: 'jaewoon-vibe2-work-lock',
        GIT_COMMITTER_EMAIL: 'vibe2-work-lock@users.noreply.github.com'
      };
      try {
        await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
        const { stdout: blobOut } = await runGit(['hash-object', '-w', stateFile]);
        const blob = clean(blobOut);
        await runGit(['read-tree', current.head], { env: gitEnv });
        await runGit(['update-index', '--add', '--cacheinfo', '100644', blob, VIBE_WORK_LOCK_STATE_PATH], { env: gitEnv });
        const { stdout: treeOut } = await runGit(['write-tree'], { env: gitEnv });
        const { stdout: commitOut } = await runGit([
          'commit-tree', clean(treeOut), '-p', current.head, '-m', clean(message) || 'vibe2-lock: update shared work state'
        ], { env: gitEnv });
        const commitSha = clean(commitOut);
        try {
          await runGit([
            'push',
            `--force-with-lease=refs/heads/${VIBE_WORK_LOCK_STATE_BRANCH}:${current.head}`,
            'origin',
            `${commitSha}:refs/heads/${VIBE_WORK_LOCK_STATE_BRANCH}`
          ]);
        } catch (error) {
          const detail = `${clean(error?.stdout)}\n${clean(error?.stderr)}`;
          if (/stale info|fetch first|rejected|non-fast-forward/i.test(detail)) {
            return { updated: false, retryable: true, status: 409, transport: 'git-cas', reason: 'push-lease-race' };
          }
          throw error;
        }
        return { updated: true, retryable: false, status: 200, commitSha, transport: 'git-cas' };
      } finally {
        await rm(temporary, { recursive: true, force: true });
      }
    }
  };
}

async function readRemoteState(ctx, fetchImpl, gitTransport = null) {
  const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/contents/${VIBE_WORK_LOCK_STATE_PATH}?ref=${encodeURIComponent(VIBE_WORK_LOCK_STATE_BRANCH)}`;
  const response = await fetchImpl(url, { headers: headers(ctx.token) });
  if (apiRateLimited(response.status) && gitTransport) return gitTransport.read();
  if (!response.ok) throw new Error(`work-lock state fetch failed: ${response.status}`);
  const body = await response.json();
  const raw = Buffer.from(String(body.content || '').replaceAll('\n', ''), 'base64').toString('utf8');
  return { sha: clean(body.sha), state: createVibeWorkLockState(JSON.parse(raw)) };
}

async function writeRemoteState(ctx, sha, state, message, fetchImpl, gitTransport = null) {
  const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/contents/${VIBE_WORK_LOCK_STATE_PATH}`;
  const content = Buffer.from(`${JSON.stringify(state, null, 2)}\n`, 'utf8').toString('base64');
  const response = await fetchImpl(url, {
    method: 'PUT',
    headers: { ...headers(ctx.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: VIBE_WORK_LOCK_STATE_BRANCH })
  });
  if (apiWriteRetryable(response.status)) return { updated: false, retryable: true, status: response.status, transport: 'contents-api' };
  if (apiRateLimited(response.status) && gitTransport) {
    const fallback = await gitTransport.write({ observedBlobSha: sha, state, message });
    return { ...fallback, apiStatus: response.status };
  }
  if (!response.ok) throw new Error(`work-lock state update failed: ${response.status}`);
  const body = await response.json();
  return { updated: true, retryable: false, status: response.status, commitSha: body?.commit?.sha || null, transport: 'contents-api' };
}

function defaultDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function completedVibeRunLockIds(ctx, conflicts = [], fetchImpl) {
  const completedByRun = new Map();
  const ids = new Set();
  for (const conflict of conflicts) {
    const lock = conflict?.lock || {};
    if (clean(lock.worker).toLowerCase() !== 'vibe2') continue;
    const runId = clean(lock.runId);
    if (!runId) continue;
    let completed = completedByRun.get(runId);
    if (completed === undefined) {
      const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/actions/runs/${encodeURIComponent(runId)}`;
      const response = await fetchImpl(url, { headers: headers(ctx.token) });
      if (response.status === 404) completed = true;
      else if (response.ok) {
        const body = await response.json();
        completed = clean(body?.status).toLowerCase() === 'completed';
      } else completed = false;
      completedByRun.set(runId, completed);
    }
    if (completed && lock.id) ids.add(String(lock.id));
  }
  return ids;
}

export function remoteWorkLockRetryDelayMs(identity, attempt) {
  const key = `${clean(identity) || 'work-lock'}:${Math.max(1, Number(attempt) || 1)}`;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const jitter = (hash >>> 0) % 1200;
  return Math.min(2500, 200 + Math.max(1, Number(attempt) || 1) * 150 + jitter);
}

function operationOptions(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
  const context = options.context || createRemoteWorkLockContext(options.contextOverrides || {});
  const delay = typeof options.delay === 'function' ? options.delay : defaultDelay;
  const maxAttempts = Math.max(1, Math.min(8, Number(options.maxAttempts) || 8));
  const gitTransport = options.gitTransport === null
    ? null
    : options.gitTransport || (options.fetchImpl ? null : createGitCasTransport(options.gitOptions));
  return { fetchImpl, context, delay, maxAttempts, gitTransport };
}

export async function acquireRemoteVibeWorkLock(args = {}, options = {}) {
  const { fetchImpl, context: ctx, delay, maxAttempts, gitTransport } = operationOptions(options);
  const request = {
    worker: clean(args.worker) || 'vibe2',
    taskId: clean(args.task),
    gameId: clean(args.game) || null,
    files: list(args.files),
    baseSha: clean(args['base-sha']),
    runId: clean(args['run-id'] || process.env.GITHUB_RUN_ID),
    runAttempt: clean(args['run-attempt'] || process.env.GITHUB_RUN_ATTEMPT),
    leaseMinutes: Number(args['lease-minutes'] || 45),
    evidence: list(args.evidence)
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remote = await readRemoteState(ctx, fetchImpl, gitTransport);
    let result = acquireVibeWorkLock(remote.state, request, new Date());
    let reclaimedLockIds = [];
    if (!result.acquired && result.reason === 'file-lock-conflict') {
      const completedIds = await completedVibeRunLockIds(ctx, result.conflicts, fetchImpl);
      if (completedIds.size) {
        reclaimedLockIds = [...completedIds];
        const cleanedState = createVibeWorkLockState({
          locks: remote.state.locks.filter((lock) => !completedIds.has(String(lock.id)))
        });
        result = acquireVibeWorkLock(cleanedState, request, new Date());
      }
    }
    if (!result.acquired) return { ...result, reclaimedLockIds, attempt, remoteUpdated: false };
    if (result.reused) return { ...result, reclaimedLockIds, attempt, remoteUpdated: false };
    const write = await writeRemoteState(ctx, remote.sha, result.state, `vibe2-lock: acquire ${request.worker} ${request.taskId}`, fetchImpl, gitTransport);
    if (write.updated) return { ...result, reclaimedLockIds, attempt, remoteUpdated: true, commitSha: write.commitSha, remoteTransport: write.transport, apiStatus: write.apiStatus || null };
    if (!write.retryable) throw new Error(`work-lock acquire state update failed after ${attempt} attempts`);
    if (attempt === maxAttempts) {
      return {
        acquired: false,
        reused: false,
        reason: 'transient-state-update-race',
        transient: true,
        contention: true,
        attempt,
        remoteUpdated: false,
        retryStatus: write.status,
        lock: null,
        conflicts: []
      };
    }
    await delay(remoteWorkLockRetryDelayMs(request.taskId, attempt));
  }
  throw new Error('work-lock acquire unreachable');
}

export async function releaseRemoteVibeWorkLock(args = {}, options = {}) {
  const { fetchImpl, context: ctx, delay, maxAttempts, gitTransport } = operationOptions(options);
  const lockId = clean(args.id);
  const worker = clean(args.worker) || 'vibe2';
  if (!lockId) throw new Error('work-lock id required');

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remote = await readRemoteState(ctx, fetchImpl, gitTransport);
    const result = releaseVibeWorkLock(remote.state, { lockId, worker }, new Date());
    if (!result.released) return { ...result, attempt, remoteUpdated: false };
    const write = await writeRemoteState(ctx, remote.sha, result.state, `vibe2-lock: release ${worker} ${lockId}`, fetchImpl, gitTransport);
    if (write.updated) return { ...result, attempt, remoteUpdated: true, commitSha: write.commitSha, remoteTransport: write.transport, apiStatus: write.apiStatus || null };
    if (!write.retryable) throw new Error(`work-lock release state update failed after ${attempt} attempts`);
    if (attempt === maxAttempts) {
      return {
        released: false,
        reason: 'transient-state-update-race',
        transient: true,
        contention: true,
        attempt,
        remoteUpdated: false,
        retryStatus: write.status,
        lockId
      };
    }
    await delay(remoteWorkLockRetryDelayMs(lockId, attempt));
  }
  throw new Error('work-lock release unreachable');
}

function print(result, command) {
  console.log(JSON.stringify(result, null, 2));
  console.log(`VIBE_REMOTE_WORK_LOCK_COMMAND=${command}`);
  if ('acquired' in result) console.log(`VIBE_REMOTE_WORK_LOCK_ACQUIRED=${result.acquired ? 'YES' : 'NO'}`);
  if (result.reason) console.log(`VIBE_REMOTE_WORK_LOCK_REASON=${result.reason}`);
  if (result.lock?.id) console.log(`VIBE_REMOTE_WORK_LOCK_ID=${result.lock.id}`);
  if (Array.isArray(result.reclaimedLockIds) && result.reclaimedLockIds.length) console.log(`VIBE_REMOTE_WORK_LOCK_RECLAIMED=${result.reclaimedLockIds.join(',')}`);
  if ('released' in result) console.log(`VIBE_REMOTE_WORK_LOCK_RELEASED=${result.released ? 'YES' : 'NO'}`);
}

async function main() {
  const args = parseArgs();
  const command = clean(args.command).toLowerCase();
  if (command === 'acquire') {
    const result = await acquireRemoteVibeWorkLock(args);
    print(result, command);
    return;
  }
  if (command === 'release') {
    const result = await releaseRemoteVibeWorkLock(args);
    print(result, command);
    return;
  }
  throw new Error(`unknown remote work-lock command: ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 2;
  });
}
