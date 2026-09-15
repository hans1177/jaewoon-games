// 파일명: tools/vibe2-remote-work-lock.mjs
// 역할: GitHub의 vibe2-work-locks 브랜치에 공용 Work Lock을 원자적으로 획득/해제한다.
// 원칙: Contents API의 blob SHA 조건부 갱신을 사용하고 409/422 경쟁 시 최신 상태를 다시 읽어 재판정한다.

import { pathToFileURL } from 'node:url';
import {
  VIBE_WORK_LOCK_STATE_BRANCH,
  VIBE_WORK_LOCK_STATE_PATH,
  acquireVibeWorkLock,
  createVibeWorkLockState,
  releaseVibeWorkLock
} from '../assets/vibe-work-lock.js';

const clean = (value) => String(value ?? '').trim();
const list = (value) => clean(value).split(',').map(clean).filter(Boolean);

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

async function readRemoteState(ctx, fetchImpl) {
  const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/contents/${VIBE_WORK_LOCK_STATE_PATH}?ref=${encodeURIComponent(VIBE_WORK_LOCK_STATE_BRANCH)}`;
  const response = await fetchImpl(url, { headers: headers(ctx.token) });
  if (!response.ok) throw new Error(`work-lock state fetch failed: ${response.status}`);
  const body = await response.json();
  const raw = Buffer.from(String(body.content || '').replaceAll('\n', ''), 'base64').toString('utf8');
  return { sha: clean(body.sha), state: createVibeWorkLockState(JSON.parse(raw)) };
}

async function writeRemoteState(ctx, sha, state, message, fetchImpl) {
  const url = `https://api.github.com/repos/${ctx.owner}/${ctx.repo}/contents/${VIBE_WORK_LOCK_STATE_PATH}`;
  const content = Buffer.from(`${JSON.stringify(state, null, 2)}\n`, 'utf8').toString('base64');
  const response = await fetchImpl(url, {
    method: 'PUT',
    headers: { ...headers(ctx.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: VIBE_WORK_LOCK_STATE_BRANCH })
  });
  if (response.status === 409 || response.status === 422) return { updated: false, retryable: true, status: response.status };
  if (!response.ok) throw new Error(`work-lock state update failed: ${response.status}`);
  const body = await response.json();
  return { updated: true, retryable: false, status: response.status, commitSha: body?.commit?.sha || null };
}

function defaultDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function operationOptions(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
  const context = options.context || createRemoteWorkLockContext(options.contextOverrides || {});
  const delay = typeof options.delay === 'function' ? options.delay : defaultDelay;
  const maxAttempts = Math.max(1, Math.min(5, Number(options.maxAttempts) || 3));
  return { fetchImpl, context, delay, maxAttempts };
}

export async function acquireRemoteVibeWorkLock(args = {}, options = {}) {
  const { fetchImpl, context: ctx, delay, maxAttempts } = operationOptions(options);
  const request = {
    worker: clean(args.worker) || 'vibe2',
    taskId: clean(args.task),
    gameId: clean(args.game) || null,
    files: list(args.files),
    baseSha: clean(args['base-sha']),
    leaseMinutes: Number(args['lease-minutes'] || 45),
    evidence: list(args.evidence)
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remote = await readRemoteState(ctx, fetchImpl);
    const result = acquireVibeWorkLock(remote.state, request, new Date());
    if (!result.acquired) return { ...result, attempt, remoteUpdated: false };
    if (result.reused) return { ...result, attempt, remoteUpdated: false };
    const write = await writeRemoteState(ctx, remote.sha, result.state, `vibe2-lock: acquire ${request.worker} ${request.taskId}`, fetchImpl);
    if (write.updated) return { ...result, attempt, remoteUpdated: true, commitSha: write.commitSha };
    if (!write.retryable || attempt === maxAttempts) throw new Error(`work-lock acquire update race exhausted after ${attempt} attempts`);
    await delay(attempt * 500);
  }
  throw new Error('work-lock acquire unreachable');
}

export async function releaseRemoteVibeWorkLock(args = {}, options = {}) {
  const { fetchImpl, context: ctx, delay, maxAttempts } = operationOptions(options);
  const lockId = clean(args.id);
  const worker = clean(args.worker) || 'vibe2';
  if (!lockId) throw new Error('work-lock id required');

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remote = await readRemoteState(ctx, fetchImpl);
    const result = releaseVibeWorkLock(remote.state, { lockId, worker }, new Date());
    if (!result.released) return { ...result, attempt, remoteUpdated: false };
    const write = await writeRemoteState(ctx, remote.sha, result.state, `vibe2-lock: release ${worker} ${lockId}`, fetchImpl);
    if (write.updated) return { ...result, attempt, remoteUpdated: true, commitSha: write.commitSha };
    if (!write.retryable || attempt === maxAttempts) throw new Error(`work-lock release update race exhausted after ${attempt} attempts`);
    await delay(attempt * 500);
  }
  throw new Error('work-lock release unreachable');
}

function print(result, command) {
  console.log(JSON.stringify(result, null, 2));
  console.log(`VIBE_REMOTE_WORK_LOCK_COMMAND=${command}`);
  if ('acquired' in result) console.log(`VIBE_REMOTE_WORK_LOCK_ACQUIRED=${result.acquired ? 'YES' : 'NO'}`);
  if (result.reason) console.log(`VIBE_REMOTE_WORK_LOCK_REASON=${result.reason}`);
  if (result.lock?.id) console.log(`VIBE_REMOTE_WORK_LOCK_ID=${result.lock.id}`);
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
