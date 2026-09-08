// 파일명: assets/vibe-company-queue-adapter.js
// 역할: 재운컴퍼니 부서 stage assignment를 Vibe2 연속 작업 큐 task로 변환한다.
// 원칙: 컴퍼니 권한·아트북 잠금·사용자 승인 게이트를 보존하며 새 작업을 임의로 발명하지 않는다.

import { createVibeContinuousQueue } from './vibe-continuous-queue.js';
import { detectVibeEngineTarget } from './vibe-engine-adapter.js';

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));

function stableHash(value = '') {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function normalizeTarget(target = 'auto', request = '') {
  const explicit = clean(target).toLowerCase();
  if (['unity', 'unity-android'].includes(explicit)) return 'unity';
  if (['unreal', 'unreal-engine', 'ue5'].includes(explicit)) return 'unreal';
  if (explicit === 'godot') return 'godot';
  if (['web', 'web-archive'].includes(explicit)) return 'web';
  return detectVibeEngineTarget(request, 'auto');
}

function taskTypeForRole(role = '') {
  const id = clean(role).toLowerCase();
  if (id === 'qa' || id === 'release') return 'qa';
  if (id === 'planning' || id === 'balance' || id === 'director') return 'research';
  return 'implementation';
}

function filesForRole(role, responsibleFilesByRole = {}, fallback = []) {
  const exact = Array.isArray(responsibleFilesByRole?.[role]) ? responsibleFilesByRole[role] : [];
  return freezeList(exact.length ? exact : fallback);
}

export function createVibeCompanyQueueTask({
  assignment = null,
  companyTask = null,
  target = 'auto',
  gameId = '',
  ownerDirective = false,
  responsibleFiles = [],
  responsibleFilesByRole = {},
  dependencies = [],
  protectedChange = false,
  maxRetries = 2,
  sourceRef = ''
} = {}) {
  if (!assignment || !companyTask) throw new Error('company assignment and task required');
  const request = clean(companyTask.request);
  const instruction = clean(companyTask.instruction);
  const role = clean(companyTask.role) || 'development';
  const stageId = clean(companyTask.stageId || assignment?.stage?.id) || 'unknown-stage';
  const resolvedGameId = clean(gameId || assignment.gameId);
  const resolvedTarget = normalizeTarget(target, `${request} ${instruction}`);
  const artbookLock = assignment.artbookLock && typeof assignment.artbookLock === 'object' ? assignment.artbookLock : {};
  const artbookLocked = companyTask.artbookLocked === true || artbookLock.locked === true;
  const artbookRef = clean(companyTask.artbookRef || artbookLock.ref);
  const requiresOwnerDecision = assignment.requiresOwnerAction === true || assignment.autoExecute === false;
  const priority = ownerDirective ? 'owner-immediate' : requiresOwnerDecision ? 'high' : 'normal';
  const goal = [request, instruction].filter(Boolean).join('\n[재운컴퍼니 부서 작업]\n');
  const idSeed = [resolvedGameId, stageId, role, request, instruction].join('|');
  return freeze({
    id: `company-${stableHash(idSeed)}`,
    gameId: resolvedGameId || null,
    target: resolvedTarget,
    department: role,
    type: taskTypeForRole(role),
    goal,
    responsibleFiles: filesForRole(role, responsibleFilesByRole, responsibleFiles),
    dependencies: freezeList(dependencies),
    priority,
    status: 'queued',
    retries: 0,
    maxRetries: Math.max(0, Math.min(5, Math.floor(Number(maxRetries) || 0))),
    ownerDirective: Boolean(ownerDirective),
    requiresOwnerDecision,
    protectedChange: Boolean(protectedChange),
    paidResourceRequired: false,
    evidence: freezeList(sourceRef ? [sourceRef] : []),
    companyContext: freeze({
      stageId,
      role,
      assignmentAuthority: clean(assignment.authority) || null,
      sourceRef: clean(sourceRef) || null,
      artbookLocked,
      artbookRef: artbookRef || null,
      artbookStatus: clean(artbookLock.status) || null,
      artbookCutCount: Math.max(0, Math.floor(Number(artbookLock.cutCount) || 0)),
      artbookPostprocessComplete: Boolean(artbookLock.postprocessComplete),
      reviewRequired: true
    })
  });
}

export function createVibeQueueFromCompanyAssignment({
  assignment = null,
  queue = null,
  target = 'auto',
  ownerDirective = false,
  responsibleFiles = [],
  responsibleFilesByRole = {},
  protectedChange = false,
  maxRetries = 2,
  sourceRef = ''
} = {}) {
  if (!assignment || !Array.isArray(assignment.tasks)) throw new Error('company stage assignment tasks required');
  const current = createVibeContinuousQueue(queue || []);
  const additions = assignment.tasks.map((companyTask) => createVibeCompanyQueueTask({
    assignment,
    companyTask,
    target,
    gameId: assignment.gameId,
    ownerDirective,
    responsibleFiles,
    responsibleFilesByRole,
    protectedChange,
    maxRetries,
    sourceRef
  }));
  const ids = new Set(current.tasks.map((task) => task.id));
  const fresh = additions.filter((task) => !ids.has(task.id));
  const nextQueue = createVibeContinuousQueue([...current.tasks, ...fresh]);
  return freeze({
    version: 1,
    added: freezeList(fresh.map((task) => task.id)),
    skippedExisting: freezeList(additions.filter((task) => ids.has(task.id)).map((task) => task.id)),
    queue: nextQueue,
    assignmentAuthority: clean(assignment.authority) || null,
    ownerGatePreserved: assignment.requiresOwnerAction === true,
    artbookLockPreserved: assignment.artbookLock?.locked === true,
    noCompanyAuthorityExpansion: true
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeCompanyQueueAdapter = freeze({
    createVibeCompanyQueueTask,
    createVibeQueueFromCompanyAssignment
  });
}
