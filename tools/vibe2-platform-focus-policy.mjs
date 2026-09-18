// 파일명: tools/vibe2-platform-focus-policy.mjs
// 역할: 중앙 플랫폼 정책에 따라 Unity와 Roblox의 동급 1티어 실행을 보장하고 과거 Roblox-primary 지연 상태를 정규화한다.
// 원칙: 플랫폼 정책은 QA·릴리스 게이트·사용자 지시를 약화하지 않으며 다른 blocker를 해제하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const lower = (value) => clean(value).toLowerCase();
const LEGACY_POLICY_PREFIX = 'platform-focus:roblox-primary';
const EQUAL_TIER_EVIDENCE = 'platform-focus:unity-roblox-equal-tier';

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
function withEvidence(task, value) {
  return {
    ...task,
    evidence: [...new Set([...(Array.isArray(task?.evidence) ? task.evidence : []), value].map(clean).filter(Boolean))]
  };
}
function isLegacyPolicyBlocked(task) {
  return lower(task?.status) === 'blocked' && clean(task?.blocker).startsWith(LEGACY_POLICY_PREFIX);
}
function equalTierEnabled(config = {}) {
  const platforms = (Array.isArray(config?.primaryPlatforms) ? config.primaryPlatforms : []).map(lower);
  return config?.enabled !== false
    && clean(config?.mode).toUpperCase() === 'UNITY_ROBLOX_EQUAL_FIRST_TIER'
    && platforms.includes('unity')
    && platforms.includes('roblox');
}

export function applyPlatformFocusPolicy(queueInput = {}, configInput = {}) {
  const queue = queueInput && typeof queueInput === 'object' ? structuredClone(queueInput) : { tasks: [] };
  const config = configInput && typeof configInput === 'object' ? configInput : {};
  const originalTasks = Array.isArray(queue.tasks) ? queue.tasks : [];
  const enabled = equalTierEnabled(config);
  let restored = 0;

  const tasks = originalTasks.map((task) => {
    if (!enabled || !isLegacyPolicyBlocked(task)) return task;
    restored += 1;
    return withEvidence(
      { ...task, status: 'queued', blocker: null },
      `${EQUAL_TIER_EVIDENCE}:legacy-roblox-primary-block-released`
    );
  });

  const robloxAvailable = tasks.some((task) => isTarget(task, 'roblox') && ['queued','running'].includes(lower(task?.status)) && !clean(task?.blocker));
  const unityRunning = tasks.filter((task) => isTarget(task, 'unity') && lower(task?.status) === 'running').length;
  const capacity = Math.max(1, Math.floor(Number(queue?.maxConcurrentTasks) || 20));

  return {
    queue: { ...queue, tasks },
    changed: JSON.stringify(tasks) !== JSON.stringify(originalTasks),
    enabled,
    equalTier: enabled,
    robloxAvailable,
    unitySoftCap: capacity,
    unityRunning,
    deferredMaintenanceOnly: 0,
    deferredBudget: 0,
    restored
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
  const result = runPlatformFocusPolicy({
    queueFile: clean(args.queue) || '.vibe2/queue.json',
    configFile: clean(args.config) || '.vibe2/platform-focus.json'
  });
  console.log(`VIBE2_PLATFORM_FOCUS=${result.enabled ? 'UNITY_ROBLOX_EQUAL_FIRST_TIER' : 'DISABLED'}`);
  console.log(`VIBE2_UNITY_ROBLOX_EQUAL_TIER=${result.equalTier ? 'YES' : 'NO'}`);
  console.log(`VIBE2_ROBLOX_WORK_AVAILABLE=${result.robloxAvailable ? 'YES' : 'NO'}`);
  console.log(`VIBE2_UNITY_RUNNING=${result.unityRunning}`);
  console.log('VIBE2_UNITY_DEFERRED_MAINTENANCE_ONLY=0');
  console.log('VIBE2_UNITY_DEFERRED_BUDGET=0');
  console.log(`VIBE2_LEGACY_PLATFORM_BLOCKS_RESTORED=${result.restored}`);
  console.log(`VIBE2_PLATFORM_FOCUS_QUEUE_WRITE=${result.changed ? 'YES' : 'NO'}`);
}
