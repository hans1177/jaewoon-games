import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
const OWNER_EVIDENCE = 'owner-directive:full-roblox-game-rebuild';

function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
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

function directiveTask(directive = {}) {
  const id = clean(directive.id);
  const gameId = clean(directive.gameId);
  const sourceRoot = posix(directive.sourceRoot);
  const goal = clean(directive.goal);
  if (!id || !gameId || !goal || !sourceRoot.startsWith('roblox-games/')) return null;

  const responsibleFiles = [...new Set((directive.responsibleFiles || []).map(posix).filter(Boolean))];
  if (!responsibleFiles.length || responsibleFiles.some((file) => !file.startsWith(`${sourceRoot}/`))) return null;

  const dependencies = [...new Set((directive.dependencies || []).map(clean).filter(Boolean))];
  const workUnits = Math.max(5, Math.trunc(Number(directive.workUnits) || 5));
  const extraEvidence = (directive.evidence || []).map(clean).filter(Boolean);

  return {
    id,
    gameId,
    target: 'roblox',
    department: 'development',
    type: 'implementation',
    goal,
    responsibleFiles,
    dependencies,
    priority: clean(directive.priority) || 'critical',
    releaseState: 'development-confirmed',
    status: 'queued',
    retries: 0,
    maxRetries: 2,
    ownerDirective: true,
    requiresOwnerDecision: false,
    protectedChange: false,
    paidResourceRequired: false,
    sourceRoot,
    estimatedRisk: 'high',
    speculativeEligible: false,
    fullRebuild: true,
    rebuildMode: 'FULL_REBUILD',
    workUnits,
    taskWorkUnits: workUnits,
    evidence: [
      'central-policy:COMPANY_FLOW.md',
      OWNER_EVIDENCE,
      'platform-focus:roblox-primary',
      `source-root:${sourceRoot}`,
      ...extraEvidence,
    ],
  };
}

function isImportedRobloxOwnerTask(task = {}) {
  return task.ownerDirective === true
    && clean(task.target).toLowerCase() === 'roblox'
    && Array.isArray(task.evidence)
    && task.evidence.includes(OWNER_EVIDENCE);
}

function taskSpec(task = {}) {
  return JSON.stringify({
    gameId: clean(task.gameId),
    target: clean(task.target),
    department: clean(task.department),
    type: clean(task.type),
    goal: clean(task.goal),
    responsibleFiles: (task.responsibleFiles || []).map(posix),
    dependencies: (task.dependencies || []).map(clean),
    priority: clean(task.priority),
    releaseState: clean(task.releaseState),
    sourceRoot: posix(task.sourceRoot),
    estimatedRisk: clean(task.estimatedRisk),
    fullRebuild: task.fullRebuild === true,
    rebuildMode: clean(task.rebuildMode),
    workUnits: Number(task.workUnits || task.taskWorkUnits || 0),
    evidence: (task.evidence || []).map(clean).filter(Boolean),
  });
}

export function syncRobloxOwnerDirectives(queueInput = {}, directivesInput = {}, { inboxExists = true } = {}) {
  let queue = createVibeContinuousQueue(queueInput);
  const active = [];
  for (const directive of directivesInput.directives || []) {
    const state = clean(directive.status || 'pending').toLowerCase();
    if (['cancelled', 'disabled', 'completed'].includes(state)) continue;
    const task = directiveTask(directive);
    if (task) active.push(task);
  }

  const activeIds = new Set(active.map((task) => task.id));
  const pruned = inboxExists
    ? (queue.tasks || []).filter((task) => isImportedRobloxOwnerTask(task) && !activeIds.has(clean(task.id)))
    : [];
  if (pruned.length) {
    const staleIds = new Set(pruned.map((task) => task.id));
    queue = createVibeContinuousQueue({
      ...queue,
      tasks: (queue.tasks || []).filter((task) => !staleIds.has(task.id)),
    });
  }

  const imported = [];
  const refreshed = [];
  const tasks = [...(queue.tasks || [])];
  for (const task of active) {
    const index = tasks.findIndex((row) => clean(row.id) === task.id);
    if (index < 0) {
      tasks.push(task);
      imported.push(task);
      continue;
    }
    const existing = tasks[index];
    if (!isImportedRobloxOwnerTask(existing)) continue;
    if (taskSpec(existing) === taskSpec(task)) continue;
    tasks[index] = task;
    refreshed.push(task);
  }

  if (imported.length || refreshed.length) {
    queue = createVibeContinuousQueue({ ...queue, tasks });
  }
  return { queue, imported, refreshed, pruned };
}

export function applyRobloxOwnerDirectives({ queueFile = '.vibe2/queue.json', directivesFile = '.vibe2/owner-directives-roblox.json' } = {}) {
  const inboxExists = fs.existsSync(directivesFile);
  const queue = readJson(queueFile, { tasks: [] });
  const directives = readJson(directivesFile, { directives: [] });
  const result = syncRobloxOwnerDirectives(queue, directives, { inboxExists });
  if (result.imported.length || result.refreshed.length || result.pruned.length) writeJson(queueFile, result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = applyRobloxOwnerDirectives({
    queueFile: path.resolve(clean(args.queue) || '.vibe2/queue.json'),
    directivesFile: path.resolve(clean(args.directives) || '.vibe2/owner-directives-roblox.json'),
  });
  console.log(`VIBE2_ROBLOX_OWNER_IMPORTED=${result.imported.map((task) => task.id).join(',') || 'NONE'}`);
  console.log(`VIBE2_ROBLOX_OWNER_REFRESHED=${result.refreshed.map((task) => task.id).join(',') || 'NONE'}`);
  console.log(`VIBE2_ROBLOX_OWNER_PRUNED=${result.pruned.map((task) => task.id).join(',') || 'NONE'}`);
}
