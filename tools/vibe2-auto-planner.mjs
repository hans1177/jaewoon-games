// 파일명: tools/vibe2-auto-planner.mjs
// 역할: Vibe2 큐가 비었을 때 최신 회사 상태와 실제 프로젝트 소스에서 근거가 있는 저위험 다음 작업 1개를 선택한다.
// 원칙: 기존 게임의 Unity 프로젝트를 최우선으로 하며 핵심 결정/밸런스/세이브 의미/유료 자원/web-games 수정은 자율 생성하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');

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
function engineFromProject(project = {}) {
  const projectPath = posix(project.projectPath);
  const target = clean(project.target).toLowerCase();
  if (projectPath.startsWith('unity-games/') || target.startsWith('unity')) return 'unity';
  if (projectPath.startsWith('unreal-games/') || target.startsWith('unreal')) return 'unreal';
  if (projectPath.startsWith('godot-games/') || target.startsWith('godot')) return 'godot';
  return null;
}
function existingGameIds(status = {}) {
  const ids = new Set();
  const redevelopmentQueue = Array.isArray(status?.redevelopmentReview?.queue) ? status.redevelopmentReview.queue : [];
  for (const item of redevelopmentQueue) {
    const id = clean(item?.gameId);
    if (id) ids.add(id);
  }
  for (const project of Array.isArray(status.projects) ? status.projects : []) {
    const source = posix(project?.source);
    const id = clean(project?.gameId);
    if (id && source.startsWith('web-games/')) ids.add(id);
  }
  return ids;
}
function projectPriority(project, status = {}) {
  const engine = engineFromProject(project);
  const existing = existingGameIds(status).has(clean(project?.gameId));
  if (existing && engine === 'unity') return 0;
  if (existing) return 1;
  if (engine === 'unity') return 2;
  return 3;
}
function approvedProjects(status = {}) {
  const projects = Array.isArray(status.projects) ? status.projects : [];
  return projects
    .filter((project) => {
      const projectPath = posix(project.projectPath);
      return clean(project.ownerDecision).toUpperCase() === 'PASS'
        && Boolean(engineFromProject(project))
        && !projectPath.startsWith('web-games/');
    })
    .sort((a, b) => {
      const priority = projectPriority(a, status) - projectPriority(b, status);
      if (priority !== 0) return priority;
      return Number(b.progress || 0) - Number(a.progress || 0);
    });
}
function activeProject(status = {}) {
  return approvedProjects(status)[0] || null;
}
function sourceFile(root, relative) {
  return path.join(root, ...posix(relative).split('/'));
}
function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}
function task(id, project, goal, responsibleFiles, priority = 'normal') {
  return {
    id,
    gameId: clean(project.gameId),
    target: engineFromProject(project),
    department: 'development',
    type: 'implementation',
    goal,
    responsibleFiles,
    dependencies: [],
    priority,
    status: 'queued',
    retries: 0,
    maxRetries: 2,
    ownerDirective: false,
    requiresOwnerDecision: false,
    protectedChange: false,
    paidResourceRequired: false,
    evidence: ['vibe2-auto-planner:source-evidence']
  };
}
function hasTask(queue, id) {
  return queue.tasks.some((item) => item.id === id);
}
function hasActiveWork(queue) {
  return queue.tasks.some((item) => ['queued', 'running'].includes(clean(item.status).toLowerCase()));
}
function findExplicitMaintenanceTask(project, repoRoot, queue) {
  const projectPath = posix(project.projectPath);
  const engine = engineFromProject(project);
  if (!projectPath || !engine) return null;

  if (engine === 'unity') {
    const runtimeRel = `${projectPath}/Assets/Scripts/RuntimeBootstrap.cs`;
    const coreRel = `${projectPath}/Assets/Scripts/GameCore.cs`;
    const motionRel = `${projectPath}/Assets/Scripts/PrototypeAnimatedVisuals.cs`;
    const runtime = readText(sourceFile(repoRoot, runtimeRel));
    const core = readText(sourceFile(repoRoot, coreRel));
    const motion = readText(sourceFile(repoRoot, motionRel));

    if (runtime && core && core.includes('["field-4"]') && !runtime.includes('FIELD 4') && !hasTask(queue, `${project.gameId}-region-controls-4-7`)) {
      return task(
        `${project.gameId}-region-controls-4-7`,
        project,
        'GameCatalog에 이미 존재하는 field-4, field-5, field-6, jungle 지역을 RuntimeBootstrap 이동 UI에 연결한다. 레벨 잠금은 기존 RegionDefinition.recommendedLevelMin을 사용하고 기존 전투 수치·보상·세이브·지역 데이터는 변경하지 않는다.',
        [runtimeRel],
        'high'
      );
    }

    if (core && core.includes('public List<string> ownedWeapons') && !core.includes('Player.ownedWeapons ??=') && !hasTask(queue, `${project.gameId}-save-null-guards`)) {
      return task(
        `${project.gameId}-save-null-guards`,
        project,
        'GameCore.Load 직후 오래되거나 불완전한 JSON 세이브에서 ownedWeapons, ownedArmors, completedHiddenQuests가 null이면 빈 목록으로 복구한다. SaveKey, 데이터 버전, 수치와 장비 소유 의미는 변경하지 않는다.',
        [coreRel]
      );
    }

    if (motion && motion.includes('public void PlayTravelToBattle()') && !/PlayTravelToBattle\(\)[\s\S]{0,500}StopCoroutine\(_combatRoutine\)/.test(motion) && !hasTask(queue, `${project.gameId}-motion-routine-safety`)) {
      return task(
        `${project.gameId}-motion-routine-safety`,
        project,
        'PrototypeAnimatedVisuals에서 전투 코루틴 중 새 이동 모션을 시작할 때 이전 combat routine을 안전하게 중지하여 애니메이션 상태 덮어쓰기를 막는다. 전투 판정 타이밍, 데미지, 보상과 에셋은 변경하지 않는다.',
        [motionRel]
      );
    }
  }

  const extensions = engine === 'unity' ? new Set(['.cs']) : engine === 'unreal' ? new Set(['.cpp', '.h', '.hpp', '.ini']) : new Set(['.gd']);
  const root = sourceFile(repoRoot, projectPath);
  if (!fs.existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['Library', 'Temp', 'Logs', 'Binaries', 'Intermediate', 'Saved', 'DerivedDataCache', '.git'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!extensions.has(path.extname(entry.name).toLowerCase())) continue;
      const text = readText(full);
      if (!/(TODO|FIXME|NotImplementedException)/.test(text)) continue;
      const relative = posix(path.relative(repoRoot, full));
      const id = `${project.gameId}-explicit-maintenance-${relative.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(-48)}`;
      if (hasTask(queue, id)) continue;
      return task(
        id,
        project,
        `책임 파일 ${relative}에 이미 표시된 TODO/FIXME/NotImplementedException 중 현재 구조 안에서 해결 가능한 저위험 항목 1개를 직접 구현한다. 새로운 게임 규칙, 밸런스, 세이브 의미, 외부 유료 의존성은 추가하지 않는다.`,
        [relative],
        'low'
      );
    }
  }
  return null;
}

export function planVibe2AutonomousTask({ status = {}, queue: queueInput = {}, repoRoot = process.cwd() } = {}) {
  const queue = createVibeContinuousQueue(queueInput);
  if (hasActiveWork(queue)) return { planned: false, reason: 'ACTIVE_QUEUE_WORK_EXISTS', queue, task: null };
  const project = activeProject(status);
  if (!project) return { planned: false, reason: 'NO_OWNER_APPROVED_PRODUCTION_PROJECT', queue, task: null };
  const next = findExplicitMaintenanceTask(project, repoRoot, queue);
  if (!next) return { planned: false, reason: 'NO_SAFE_AUTONOMOUS_TASK', queue, task: null, projectId: project.gameId };
  const nextQueue = createVibeContinuousQueue([...queue.tasks, next]);
  return {
    planned: true,
    reason: 'SAFE_TASK_PLANNED',
    queue: nextQueue,
    task: next,
    projectId: project.gameId,
    projectPriority: projectPriority(project, status),
    projectPriorityPolicy: 'EXISTING_UNITY_FIRST'
  };
}

export function runVibe2AutoPlanner({
  statusFile = '.vibe2/main-company-status.json',
  queueFile = '.vibe2/queue.json',
  repoRoot = process.cwd()
} = {}) {
  const status = readJson(statusFile, {});
  const queue = readJson(queueFile, { tasks: [] });
  const result = planVibe2AutonomousTask({ status, queue, repoRoot });
  if (result.planned) writeJson(queueFile, result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = runVibe2AutoPlanner({
    statusFile: clean(args.status) || '.vibe2/main-company-status.json',
    queueFile: clean(args.queue) || '.vibe2/queue.json',
    repoRoot: clean(args.root) || process.cwd()
  });
  console.log(`VIBE2_AUTO_PLAN=${result.planned ? 'YES' : 'NO'}`);
  console.log(`VIBE2_AUTO_PLAN_REASON=${result.reason}`);
  console.log(`VIBE2_AUTO_PLAN_PROJECT=${result.projectId || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_PRIORITY=${result.projectPriorityPolicy || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_TASK=${result.task?.id || 'NONE'}`);
}
