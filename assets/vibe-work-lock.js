// 파일명: assets/vibe-work-lock.js
// 역할: ChatGPT, Vibe2, company-ai가 같은 책임 파일을 동시에 수정하지 않도록 공용 작업 잠금 계약을 제공한다.
// 상태 저장소는 소스 main과 분리된 vibe2-work-locks 브랜치의 .vibe2/work-locks.json을 사용한다.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set(values.map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));

export const VIBE_WORK_LOCK_STATE_BRANCH = 'vibe2-work-locks';
export const VIBE_WORK_LOCK_STATE_PATH = '.vibe2/work-locks.json';
export const VIBE_WORK_LOCK_WORKERS = freezeList(['chatgpt', 'vibe2', 'company-ai']);
export const VIBE_WORK_LOCK_DEFAULT_LEASE_MINUTES = 45;
export const VIBE_WORK_LOCK_MAX_LEASE_MINUTES = 120;

function stableHash(value = '') {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeVibeWorkPath(value = '') {
  let path = clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
  while (path.startsWith('/')) path = path.slice(1);
  if (path === '.') return '';
  return path;
}

function normalizePattern(value = '') {
  const path = normalizeVibeWorkPath(value);
  if (!path) return '';
  if (path.endsWith('/**')) return path;
  if (path.endsWith('/')) return `${path}**`;
  return path;
}

function patternPrefix(value = '') {
  const pattern = normalizePattern(value);
  return pattern.endsWith('/**') ? pattern.slice(0, -3).replace(/\/$/, '') : null;
}

export function vibeWorkPathsOverlap(left = '', right = '') {
  const a = normalizePattern(left);
  const b = normalizePattern(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const aPrefix = patternPrefix(a);
  const bPrefix = patternPrefix(b);
  if (aPrefix !== null && (b === aPrefix || b.startsWith(`${aPrefix}/`))) return true;
  if (bPrefix !== null && (a === bPrefix || a.startsWith(`${bPrefix}/`))) return true;
  if (aPrefix !== null && bPrefix !== null) {
    return aPrefix === bPrefix || aPrefix.startsWith(`${bPrefix}/`) || bPrefix.startsWith(`${aPrefix}/`);
  }
  return false;
}

function iso(value, fallback = '') {
  const date = value instanceof Date ? value : new Date(value || fallback);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function leaseMinutes(value) {
  const n = Math.floor(Number(value) || VIBE_WORK_LOCK_DEFAULT_LEASE_MINUTES);
  return Math.min(VIBE_WORK_LOCK_MAX_LEASE_MINUTES, Math.max(5, n));
}

function normalizeLock(input = {}, index = 0) {
  const files = freezeList((input.files || []).map(normalizePattern));
  return freeze({
    id: clean(input.id) || `lock-${index + 1}`,
    worker: clean(input.worker).toLowerCase(),
    taskId: clean(input.taskId) || null,
    gameId: clean(input.gameId) || null,
    files,
    baseSha: clean(input.baseSha) || null,
    acquiredAt: iso(input.acquiredAt) || null,
    expiresAt: iso(input.expiresAt) || null,
    status: clean(input.status).toLowerCase() === 'released' ? 'released' : 'active',
    evidence: freezeList(input.evidence || [])
  });
}

export function createVibeWorkLockState(seed = {}) {
  const locks = Array.isArray(seed) ? seed : Array.isArray(seed?.locks) ? seed.locks : [];
  return freeze({
    version: 1,
    branch: VIBE_WORK_LOCK_STATE_BRANCH,
    locks: freeze(locks.map(normalizeLock))
  });
}

export function pruneExpiredVibeWorkLocks(stateInput, now = new Date()) {
  const state = createVibeWorkLockState(stateInput);
  const nowMs = new Date(now).getTime();
  const locks = state.locks.filter((lock) => {
    if (lock.status !== 'active') return false;
    const expiry = new Date(lock.expiresAt || 0).getTime();
    return Number.isFinite(expiry) && expiry > nowMs;
  });
  return createVibeWorkLockState({ locks });
}

export function findVibeWorkLockConflicts(stateInput, request = {}, now = new Date()) {
  const state = pruneExpiredVibeWorkLocks(stateInput, now);
  const worker = clean(request.worker).toLowerCase();
  const taskId = clean(request.taskId);
  const files = unique((request.files || []).map(normalizePattern));
  const conflicts = [];
  for (const lock of state.locks) {
    if (lock.worker === worker && taskId && lock.taskId === taskId) continue;
    const overlapping = [];
    for (const requested of files) {
      for (const held of lock.files) {
        if (vibeWorkPathsOverlap(requested, held)) overlapping.push(`${requested} <> ${held}`);
      }
    }
    if (overlapping.length) conflicts.push(freeze({ lock, overlapping: freezeList(overlapping) }));
  }
  return freeze({ state, conflicts: freeze(conflicts), blocked: conflicts.length > 0 });
}

export function acquireVibeWorkLock(stateInput, request = {}, now = new Date()) {
  const worker = clean(request.worker).toLowerCase();
  const taskId = clean(request.taskId);
  const files = freezeList((request.files || []).map(normalizePattern));
  const baseSha = clean(request.baseSha);
  if (!VIBE_WORK_LOCK_WORKERS.includes(worker)) throw new Error(`unsupported work-lock worker: ${worker || 'empty'}`);
  if (!taskId) throw new Error('work-lock taskId required');
  if (!baseSha) throw new Error('work-lock baseSha required');
  if (!files.length) throw new Error('work-lock files required');

  const current = pruneExpiredVibeWorkLocks(stateInput, now);
  const existing = current.locks.find((lock) => lock.worker === worker && lock.taskId === taskId);
  if (existing) {
    const sameBase = existing.baseSha === baseSha;
    const sameFiles = existing.files.length === files.length && existing.files.every((file) => files.includes(file));
    if (!sameBase || !sameFiles) {
      return freeze({ acquired: false, reason: 'worker-task-lock-mismatch', lock: existing, state: current, conflicts: freeze([]) });
    }
    return freeze({ acquired: true, reused: true, reason: 'existing-worker-task-lock', lock: existing, state: current, conflicts: freeze([]) });
  }

  const conflictResult = findVibeWorkLockConflicts(current, { worker, taskId, files }, now);
  if (conflictResult.blocked) {
    return freeze({ acquired: false, reused: false, reason: 'file-lock-conflict', lock: null, state: conflictResult.state, conflicts: conflictResult.conflicts });
  }

  const minutes = leaseMinutes(request.leaseMinutes);
  const acquiredAt = new Date(now);
  const expiresAt = new Date(acquiredAt.getTime() + minutes * 60_000);
  const id = `wl-${stableHash([worker, taskId, baseSha, acquiredAt.toISOString(), ...files].join('|'))}`;
  const lock = normalizeLock({
    id,
    worker,
    taskId,
    gameId: request.gameId,
    files,
    baseSha,
    acquiredAt,
    expiresAt,
    status: 'active',
    evidence: request.evidence || []
  });
  const next = createVibeWorkLockState({ locks: [...conflictResult.state.locks, lock] });
  return freeze({ acquired: true, reused: false, reason: 'acquired', lock, state: next, conflicts: freeze([]) });
}

export function renewVibeWorkLock(stateInput, { lockId = '', worker = '', leaseMinutes: requestedLease = null } = {}, now = new Date()) {
  const current = pruneExpiredVibeWorkLocks(stateInput, now);
  const id = clean(lockId);
  const owner = clean(worker).toLowerCase();
  let found = false;
  const minutes = leaseMinutes(requestedLease);
  const expiresAt = new Date(new Date(now).getTime() + minutes * 60_000).toISOString();
  const locks = current.locks.map((lock) => {
    if (lock.id !== id) return lock;
    if (owner && lock.worker !== owner) throw new Error('work-lock owner mismatch');
    found = true;
    return normalizeLock({ ...lock, expiresAt });
  });
  return freeze({ renewed: found, state: createVibeWorkLockState({ locks }), lock: locks.find((lock) => lock.id === id) || null });
}

export function releaseVibeWorkLock(stateInput, { lockId = '', worker = '' } = {}, now = new Date()) {
  const current = pruneExpiredVibeWorkLocks(stateInput, now);
  const id = clean(lockId);
  const owner = clean(worker).toLowerCase();
  const target = current.locks.find((lock) => lock.id === id) || null;
  if (!target) return freeze({ released: false, reason: 'lock-not-found', state: current, lock: null });
  if (owner && target.worker !== owner) throw new Error('work-lock owner mismatch');
  const locks = current.locks.filter((lock) => lock.id !== id);
  return freeze({ released: true, reason: 'released', state: createVibeWorkLockState({ locks }), lock: target });
}

export function detectVibeBaseShaOverlap(lockInput, changedFiles = []) {
  const lock = normalizeLock(lockInput);
  const changed = freezeList(changedFiles.map(normalizeVibeWorkPath));
  const overlaps = [];
  for (const file of changed) {
    for (const held of lock.files) {
      if (vibeWorkPathsOverlap(file, held)) overlaps.push(file);
    }
  }
  return freeze({
    stale: changed.length > 0,
    conflicting: overlaps.length > 0,
    overlaps: freezeList(overlaps),
    decision: overlaps.length ? 'REPLAN_REQUIRED' : changed.length ? 'REBASE_THEN_QA' : 'QA_ALLOWED'
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeWorkLock = freeze({
    VIBE_WORK_LOCK_STATE_BRANCH,
    VIBE_WORK_LOCK_STATE_PATH,
    createVibeWorkLockState,
    acquireVibeWorkLock,
    renewVibeWorkLock,
    releaseVibeWorkLock,
    findVibeWorkLockConflicts,
    detectVibeBaseShaOverlap,
    vibeWorkPathsOverlap
  });
}
