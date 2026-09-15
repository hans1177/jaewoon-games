// 파일명: tools/vibe2-platform-focus-policy.mjs
// 역할: Roblox 집중 기간에는 Unity를 중단하지 않고 저강도 유지보수로 제한하며, Roblox 작업이 없거나 막히면 Unity 슬롯을 다시 연다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const lower = (value) => clean(value).toLowerCase();
const POLICY_PREFIX = 'platform-focus:roblox-primary';
const MAINTENANCE_BLOCKER = `${POLICY_PREFIX}-maintenance-only`;
const BUDGET_BLOCKER = `${POLICY_PREFIX}-unity-budget`;
const PRIORITY_SCORE = Object.freeze({ 'owner-immediate': 1000, critical: 800, high: 600, normal: 400, low: 200 });
const RELEASE_SCORE = Object.freeze({ 'release-confirmed': 80, 'development-confirmed': 60, reviewing: 40, other: 20 });

function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function isTarget(task, target) {
  const value = lower(task?.target);
  return value === target || value.startsWith(`${target}-`);
}
function isPolicyBlocked(task) {
  return lower(task?.status) === 'blocked' && clean(task?.blocker).startsWith(POLICY_PREFIX);
}
function withEvidence(task, value) {
  return { ...task, evidence: [...new Set([...(Array.isArray(task?.evidence) ? task.evidence : []), value].map(clean).filter(Boolean))] };
}
function restorePolicyDeferredTask(task) {
  if (!isPolicyBlocked(task)) return task;
  return withEvidence({ ...task, status: 'queued', blocker: null }, `${POLICY_PREFIX}:released-for-reevaluation`);
}
function robloxWorkAvailable(tasks) {
  return tasks.some((task) => {
    if (!isTarget(task, 'roblox')) return false;
    const status = lower(task?.status);
    if (status === 'running') return true;
    return status === 'queued' && !clean(task?.blocker);
  });
}
function isCriticalUnity(task, config) {
  if (task?.ownerDirective === true) return true;
  if (clean(task?.priority) === 'owner-immediate') return true;
  return config?.unity?.criticalBypassesBudget !== false && clean(task?.priority) === 'critical';
}
function isUnityMaintenance(task) {
  const type = lower(task?.type);
  if (['qa', 'inspect', 'research'].includes(type)) return true;
  const evidence = Array.isArray(task?.evidence) ? task.evidence.join(' ') : '';
  const text = `${clean(task?.goal)} ${evidence}`;
  return /(maintenance|bug|fix|repair|hotfix|build|compile|error|crash|failure|failed|regression|safety|guard|null|save|corrupt|stability|broken|버그|오류|수정|복구|핫픽스|빌드|컴파일|크래시|실패|회귀|안전|가드|세이브|손상|안정성|유지보수)/i.test(text);
}
function taskScore(task, index) {
  return (task?.ownerDirective ? 10000 : 0)
    + (PRIORITY_SCORE[clean(task?.priority)] || 0)
    + (RELEASE_SCORE[clean(task?.releaseState)] || 0)
    - index / 10000;
}
function unitySoftCap(queue, config) {
  const capacity = Math.max(1, Math.floor(Number(queue?.maxConcurrentTasks) || 20));
  const configured = Math.floor(Number(config?.unity?.softSlotCap) || 0);
  if (configured > 0) return Math.min(capacity, configured);
  const robloxWeight = Math.max(0, Number(config?.weights?.roblox) || 80);
  const unityWeight = Math.max(0, Number(config?.weights?.unity) || 20);
  const total = robloxWeight + unityWeight || 100;
  return Math.max(1, Math.floor(capacity * unityWeight / total));
}
function deferTask(task, blocker) {
  return withEvidence({ ...task, status: 'blocked', blocker }, `${POLICY_PREFIX}:deferred`);
}

export function applyPlatformFocusPolicy(queueInput = {}, configInput = {}) {
  const queue = queueInput && typeof queueInput === 'object' ? structuredClone(queueInput) : { tasks: [] };
  const config = configInput && typeof configInput === 'object' ? configInput : {};
  const originalTasks = Array.isArray(queue.tasks) ? queue.tasks : [];
  let tasks = originalTasks.map(restorePolicyDeferredTask);
  const enabled = config.enabled !== false && lower(config.primary) === 'roblox';
  const restoredCount = tasks.filter((task, index) => isPolicyBlocked(originalTasks[index]) && lower(task.status) === 'queued').length;

  if (!enabled) {
    return {
      queue: { ...queue, tasks },
      changed: JSON.stringify(tasks) !== JSON.stringify(originalTasks),
      enabled: false,
      robloxAvailable: false,
      unitySoftCap: unitySoftCap(queue, config),
      unityRunning: tasks.filter((task) => isTarget(task, 'unity') && lower(task.status) === 'running').length,
      deferredMaintenanceOnly: 0,
      deferredBudget: 0,
      restored: restoredCount
    };
  }

  const robloxAvailable = robloxWorkAvailable(tasks);
  const allowUnityFallback = config?.unity?.allowWhenRobloxUnavailable !== false;
  const cap = unitySoftCap(queue, config);
  const unityRunning = tasks.filter((task) => isTarget(task, 'unity') && lower(task.status) === 'running').length;

  if (!robloxAvailable && allowUnityFallback) {
    return {
      queue: { ...queue, tasks },
      changed: JSON.stringify(tasks) !== JSON.stringify(originalTasks),
      enabled: true,
      robloxAvailable: false,
      unitySoftCap: cap,
      unityRunning,
      deferredMaintenanceOnly: 0,
      deferredBudget: 0,
      restored: restoredCount
    };
  }

  const maintenanceOnly = config?.unity?.maintenanceOnlyWhileRobloxAvailable !== false;
  const candidates = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => isTarget(task, 'unity') && lower(task.status) === 'queued' && !clean(task.blocker) && !isCriticalUnity(task, config))
    .filter(({ task }) => !maintenanceOnly || isUnityMaintenance(task))
    .sort((a, b) => taskScore(b.task, b.index) - taskScore(a.task, a.index));
  const availableUnitySlots = Math.max(0, cap - unityRunning);
  const allowed = new Set(candidates.slice(0, availableUnitySlots).map((row) => row.index));
  let deferredMaintenanceOnly = 0;
  let deferredBudget = 0;

  tasks = tasks.map((task, index) => {
    if (!isTarget(task, 'unity') || lower(task.status) !== 'queued' || clean(task.blocker)) return task;
    if (task?.ownerDirective === true || isCriticalUnity(task, config)) return task;
    const maintenance = isUnityMaintenance(task);
    if (maintenanceOnly && !maintenance) {
      deferredMaintenanceOnly += 1;
      return deferTask(task, MAINTENANCE_BLOCKER);
    }
    if (!allowed.has(index)) {
      deferredBudget += 1;
      return deferTask(task, BUDGET_BLOCKER);
    }
    return withEvidence(task, `${POLICY_PREFIX}:unity-low-intensity-allowed`);
  });

  return {
    queue: { ...queue, tasks },
    changed: JSON.stringify(tasks) !== JSON.stringify(originalTasks),
    enabled: true,
    robloxAvailable,
    unitySoftCap: cap,
    unityRunning,
    deferredMaintenanceOnly,
    deferredBudget,
    restored: restoredCount
  };
}

export function runPlatformFocusPolicy({ queueFile = '.vibe2/queue.json', configFile = '.vibe2/platform-focus.json' } = {}) {
  const queue = readJson(queueFile, { tasks: [] });
  const config = readJson(configFile, { enabled: false });
  const result = applyPlatformFocusPolicy(queue, config);
  if (result.changed) writeJson(queueFile, result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = runPlatformFocusPolicy({ queueFile: clean(args.queue) || '.vibe2/queue.json', configFile: clean(args.config) || '.vibe2/platform-focus.json' });
  console.log(`VIBE2_PLATFORM_FOCUS=${result.enabled ? 'ROBLOX_PRIMARY_UNITY_LOW_INTENSITY' : 'DISABLED'}`);
  console.log(`VIBE2_ROBLOX_WORK_AVAILABLE=${result.robloxAvailable ? 'YES' : 'NO'}`);
  console.log(`VIBE2_UNITY_SOFT_CAP=${result.unitySoftCap}`);
  console.log(`VIBE2_UNITY_RUNNING=${result.unityRunning}`);
  console.log(`VIBE2_UNITY_DEFERRED_MAINTENANCE_ONLY=${result.deferredMaintenanceOnly}`);
  console.log(`VIBE2_UNITY_DEFERRED_BUDGET=${result.deferredBudget}`);
  console.log(`VIBE2_UNITY_RESTORED_FOR_REEVALUATION=${result.restored}`);
  console.log(`VIBE2_PLATFORM_FOCUS_QUEUE_WRITE=${result.changed ? 'YES' : 'NO'}`);
}
