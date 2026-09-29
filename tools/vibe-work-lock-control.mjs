// 파일명: tools/vibe-work-lock-control.mjs
// 역할: 공용 Work Lock 상태 파일을 조회/획득/갱신/해제한다.
// 주의: GitHub 원격 상태 갱신은 호출자가 vibe2-work-locks 브랜치에서 원자적으로 커밋/푸시해야 한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  VIBE_WORK_LOCK_STATE_PATH,
  acquireVibeWorkLock,
  createVibeWorkLockState,
  detectVibeBaseShaOverlap,
  findVibeWorkLockConflicts,
  pruneExpiredVibeWorkLocks,
  releaseVibeWorkLock,
  renewVibeWorkLock
} from '../assets/vibe-work-lock.js';

const clean = (value) => String(value ?? '').trim();
const bool = (value) => value === true || ['1', 'true', 'yes', 'y'].includes(clean(value).toLowerCase());
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

function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stateFile(args) { return clean(args.state) || VIBE_WORK_LOCK_STATE_PATH; }
function nowValue(args) { return clean(args.now) || new Date().toISOString(); }

export function runVibeWorkLockCommand(args = {}) {
  const file = stateFile(args);
  const now = new Date(nowValue(args));
  let state = createVibeWorkLockState(readJson(file, { locks: [] }));
  const command = clean(args.command).toLowerCase();
  let result;

  if (command === 'summary') {
    state = pruneExpiredVibeWorkLocks(state, now);
    result = { command, updated: false, state, activeCount: state.locks.length };
  } else if (command === 'check') {
    result = {
      command,
      updated: false,
      ...findVibeWorkLockConflicts(state, {
        worker: args.worker,
        taskId: args.task,
        files: list(args.files)
      }, now)
    };
  } else if (command === 'acquire') {
    const acquired = acquireVibeWorkLock(state, {
      worker: args.worker,
      taskId: args.task,
      gameId: args.game,
      files: list(args.files),
      baseSha: args['base-sha'],
      leaseMinutes: args['lease-minutes'],
      evidence: list(args.evidence)
    }, now);
    if (acquired.acquired && !acquired.reused) writeJson(file, acquired.state);
    result = { command, updated: Boolean(acquired.acquired && !acquired.reused), ...acquired };
  } else if (command === 'renew') {
    const renewed = renewVibeWorkLock(state, {
      lockId: args.id,
      worker: args.worker,
      leaseMinutes: args['lease-minutes']
    }, now);
    if (renewed.renewed) writeJson(file, renewed.state);
    result = { command, updated: renewed.renewed, ...renewed };
  } else if (command === 'release') {
    const released = releaseVibeWorkLock(state, { lockId: args.id, worker: args.worker }, now);
    if (released.released) writeJson(file, released.state);
    result = { command, updated: released.released, ...released };
  } else if (command === 'basecheck') {
    state = pruneExpiredVibeWorkLocks(state, now);
    const lock = state.locks.find((item) => item.id === clean(args.id)) || null;
    if (!lock) throw new Error(`work-lock not found: ${clean(args.id)}`);
    result = {
      command,
      updated: false,
      lock,
      ...detectVibeBaseShaOverlap(lock, list(args.changed))
    };
  } else if (command === 'prune') {
    const next = pruneExpiredVibeWorkLocks(state, now);
    const changed = JSON.stringify(next) !== JSON.stringify(state);
    if (changed || bool(args.write)) writeJson(file, next);
    result = { command, updated: changed, state: next, activeCount: next.locks.length };
  } else {
    throw new Error(`unknown work-lock command: ${command}`);
  }
  return result;
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
  console.log(`VIBE_WORK_LOCK_COMMAND=${result.command}`);
  if ('acquired' in result) console.log(`VIBE_WORK_LOCK_ACQUIRED=${result.acquired ? 'YES' : 'NO'}`);
  if (result.lock?.id) console.log(`VIBE_WORK_LOCK_ID=${result.lock.id}`);
  if ('blocked' in result) console.log(`VIBE_WORK_LOCK_BLOCKED=${result.blocked ? 'YES' : 'NO'}`);
  if (result.decision) console.log(`VIBE_WORK_LOCK_BASE_DECISION=${result.decision}`);
  if ('released' in result) console.log(`VIBE_WORK_LOCK_RELEASED=${result.released ? 'YES' : 'NO'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = runVibeWorkLockCommand(parseArgs());
    printResult(result);
    if (result.command === 'acquire' && !result.acquired) process.exitCode = 3;
    if (result.command === 'check' && result.blocked) process.exitCode = 3;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 2;
  }
}
