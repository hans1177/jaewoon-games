// 파일명: tools/vibe2-auto-planner.mjs
// 역할: 최신 회사 상태·게임 카탈로그·실제 소스에서 서로 충돌하지 않는 저위험 작업을 병렬 슬롯만큼 계획한다.
// 원칙: 사용자 지시 > 출시확정/개발확정 Roblox > 출시확정 Unity > 개발확정 Web. 동일 source root는 한 번에 하나.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';
import { diagnoseGame, microTaskFromIssue } from './autonomous-diagnostics.mjs';

const clean = (value) => String(value ?? '').trim();
const posix = (value) => clean(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
const RELEASE_RANK = Object.freeze({ 'release-confirmed': 0, 'development-confirmed': 1, reviewing: 2, other: 3 });
const ENGINE_RANK = Object.freeze({ roblox: 0, unity: 1, web: 2, unreal: 3, godot: 4 });
const SEVERITY_PRIORITY = Object.freeze({ critical:'critical', high:'high', medium:'normal', low:'low' });

function readJson(file, fallback = {}) { if (!file || !fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
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
function parallelLimit(value) { return Math.max(1, Math.min(8, Math.floor(Number(value) || DEFAULT_MAX_CONCURRENT_TASKS))); }
function releaseState(value) {
  const normalized = clean(value).toLowerCase();
  return Object.hasOwn(RELEASE_RANK, normalized) ? normalized : 'other';
}
function stateFromCatalog(game = {}) {
  const productionClass = clean(game.productionClass).toUpperCase();
  if (productionClass === 'RELEASE_CONFIRMED') return 'release-confirmed';
  if (productionClass === 'DEVELOPMENT_CONFIRMED') return 'development-confirmed';
  return releaseState(game.homepageCategory);
}
function engineFromProject(project = {}) {
  const projectPath = posix(project.robloxProjectPath || project.projectPath || project.source);
  const target = clean(project.selectedPlatform || project.targetPlatform || project.target).toLowerCase();
  if (projectPath.startsWith('roblox-games/') || target.startsWith('roblox')) return 'roblox';
  if (projectPath.startsWith('unity-games/') || target.startsWith('unity')) return 'unity';
  if (projectPath.startsWith('web-games/') || target === 'web') return 'web';
  if (projectPath.startsWith('unreal-games/') || target.startsWith('unreal')) return 'unreal';
  if (projectPath.startsWith('godot-games/') || target.startsWith('godot')) return 'godot';
  return null;
}
function webRootFromCatalog(game = {}) {
  const webPath = posix(game.webPath).replace(/^\//, '');
  return /^web-games\/[a-zA-Z0-9._-]+$/.test(webPath) ? webPath : null;
}
function robloxRootFromCatalog(game = {}) {
  const explicit = posix(game.robloxProjectPath || game.robloxPath || '');
  if (/^roblox-games\/[a-zA-Z0-9._-]+$/.test(explicit)) return explicit;
  const id = clean(game.id);
  return id ? `roblox-games/${id}` : null;
}
function catalogById(catalog = {}) { return new Map((Array.isArray(catalog.games) ? catalog.games : []).map((game) => [clean(game.id), game])); }
export function latestDevelopmentBaselineEvidence(gameId, repoRoot = process.cwd()) {
  const id = clean(gameId);
  const root = path.join(repoRoot, 'design', id);
  const missing = { ready:false, reason:'DEVELOPMENT_BASELINE_REQUIRED', source:null, gate:null };
  if (!id || !fs.existsSync(root)) return missing;
  let dates = [];
  try { dates = fs.readdirSync(root, { withFileTypes:true }).filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)).map((entry) => entry.name).sort().reverse(); } catch { return missing; }
  for (const date of dates) {
    const file = path.join(root, date, 'cycle-status.json');
    const status = readJson(file, null);
    const gate = status?.baselineGate;
    if (!gate || gate.policyDocument !== 'COMPANY_FLOW.md' || gate.state !== 'DEVELOPMENT_BASELINE_READY' || gate.ready !== true) continue;
    const evidence = gate.evidence || {};
    if (evidence.webGameplay?.pass !== true || evidence.unityProject?.present !== true || evidence.unityTechnical?.pass !== true) continue;
    return { ready:true, reason:'DEVELOPMENT_BASELINE_READY', source:posix(path.relative(repoRoot, file)), gate };
  }
  return missing;
}
function collectProjects(status = {}, catalog = {}, repoRoot = process.cwd()) {
  const byId = catalogById(catalog);
  const rows = [];
  for (const project of Array.isArray(status.projects) ? status.projects : []) {
    const id = clean(project.gameId);
    const engine = engineFromProject(project);
    const root = posix(project.robloxProjectPath || project.projectPath || project.source);
    if (!id || !engine || !root || clean(project.ownerDecision).toUpperCase() !== 'PASS') continue;
    const game = byId.get(id) || {};
    const state = stateFromCatalog(game);
    const developmentBaseline = state === 'release-confirmed' && engine === 'unity' ? latestDevelopmentBaselineEvidence(id, repoRoot) : null;
    rows.push({ ...project, gameId:id, engine, projectPath:root, releaseState:state, existing:true, source:'company-status', developmentBaseline });
  }
  for (const game of Array.isArray(catalog.games) ? catalog.games : []) {
    const id = clean(game.id);
    const state = stateFromCatalog(game);
    const robloxRoot = robloxRootFromCatalog(game);
    if (id && robloxRoot && ['release-confirmed','development-confirmed'].includes(state) && fs.existsSync(path.join(repoRoot, robloxRoot)) && !rows.some((row) => row.gameId === id && row.engine === 'roblox')) {
      rows.push({ gameId:id, name:clean(game.name), engine:'roblox', target:'roblox', projectPath:robloxRoot, existing:true, releaseState:state, progress:0, source:'game-catalog', developmentBaseline:null });
    }
    const root = webRootFromCatalog(game);
    if (!id || !root || game.hasWebArchive !== true || game.homepageWebPlayable !== true) continue;
    if (!fs.existsSync(path.join(repoRoot, root))) continue;
    if (rows.some((row) => row.gameId === id && row.engine === 'web')) continue;
    rows.push({ gameId:id, name:clean(game.name), engine:'web', target:'web', projectPath:root, existing:true, releaseState:state, progress:0, source:'game-catalog', developmentBaseline:null });
  }
  return rows;
}
function projectSort(a, b) {
  const release = (RELEASE_RANK[a.releaseState] ?? 9) - (RELEASE_RANK[b.releaseState] ?? 9);
  if (release) return release;
  const engine = (ENGINE_RANK[a.engine] ?? 9) - (ENGINE_RANK[b.engine] ?? 9);
  if (engine) return engine;
  return Number(b.progress || 0) - Number(a.progress || 0) || a.gameId.localeCompare(b.gameId);
}
function isAutonomousProductionTarget(project = {}) {
  if (project.engine === 'roblox') return ['release-confirmed','development-confirmed'].includes(project.releaseState);
  if (project.releaseState === 'release-confirmed') return project.engine === 'unity' && project.developmentBaseline?.ready === true;
  if (project.releaseState === 'development-confirmed') return project.engine === 'web';
  return false;
}
function sourceFile(root, relative) { return path.join(root, ...posix(relative).split('/')); }
function readText(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function hasTask(queue, id) { return queue.tasks.some((item) => item.id === id); }
function activeTasks(queue) { return queue.tasks.filter((item) => ['queued','running'].includes(clean(item.status).toLowerCase())); }
function activeSourceRoots(queue) { return new Set(activeTasks(queue).map((item) => posix(item.sourceRoot)).filter(Boolean)); }
function task(id, project, goal, responsibleFiles, priority = 'normal', estimatedRisk = 'low', extraEvidence = []) {
  const baselineEvidence = project.releaseState === 'release-confirmed' && project.engine === 'unity' && project.developmentBaseline?.ready === true ? [`development-baseline:${project.developmentBaseline.source}`] : [];
  return { id, gameId:project.gameId, target:project.engine, department:'development', type:'implementation', goal, responsibleFiles, dependencies:[], priority, releaseState:project.releaseState, status:'queued', retries:0, maxRetries:2, ownerDirective:false, requiresOwnerDecision:false, protectedChange:false, paidResourceRequired:false, sourceRoot:posix(project.projectPath), estimatedRisk, speculativeEligible:estimatedRisk === 'high', evidence:[`vibe2-auto-planner:${project.source}`, `release-state:${project.releaseState}`, `source-root:${posix(project.projectPath)}`, ...baselineEvidence, ...extraEvidence] };
}
function findUnityTask(project, repoRoot, queue) {
  const projectPath = posix(project.projectPath);
  const runtimeRel = `${projectPath}/Assets/Scripts/RuntimeBootstrap.cs`;
  const coreRel = `${projectPath}/Assets/Scripts/GameCore.cs`;
  const motionRel = `${projectPath}/Assets/Scripts/PrototypeAnimatedVisuals.cs`;
  const runtime = readText(sourceFile(repoRoot, runtimeRel));
  const core = readText(sourceFile(repoRoot, coreRel));
  const motion = readText(sourceFile(repoRoot, motionRel));
  if (runtime && core && core.includes('["field-4"]') && !runtime.includes('FIELD 4') && !hasTask(queue, `${project.gameId}-region-controls-4-7`)) return task(`${project.gameId}-region-controls-4-7`, project, 'GameCatalog에 이미 존재하는 field-4, field-5, field-6, jungle 지역을 RuntimeBootstrap 이동 UI에 연결한다. 기존 RegionDefinition.recommendedLevelMin을 사용하고 전투 수치·보상·세이브·지역 데이터는 변경하지 않는다.', [runtimeRel], 'high');
  if (core && core.includes('public List<string> ownedWeapons') && !core.includes('Player.ownedWeapons ??=') && !hasTask(queue, `${project.gameId}-save-null-guards`)) return task(`${project.gameId}-save-null-guards`, project, 'GameCore.Load 직후 오래되거나 불완전한 JSON 세이브에서 ownedWeapons, ownedArmors, completedHiddenQuests가 null이면 빈 목록으로 복구한다. SaveKey, 데이터 버전, 수치와 소유 의미는 변경하지 않는다.', [coreRel]);
  if (motion && motion.includes('public void PlayTravelToBattle()') && !/PlayTravelToBattle\(\)[\s\S]{0,500}StopCoroutine\(_combatRoutine\)/.test(motion) && !hasTask(queue, `${project.gameId}-motion-routine-safety`)) return task(`${project.gameId}-motion-routine-safety`, project, 'PrototypeAnimatedVisuals에서 전투 코루틴 중 새 이동 모션을 시작할 때 이전 combat routine을 안전하게 중지해 애니메이션 상태 덮어쓰기를 막는다. 전투 판정 타이밍·데미지·보상·에셋은 변경하지 않는다.', [motionRel]);
  return null;
}
function diagnosticTaskId(project, issue, micro) {
  const token = `${clean(issue?.type)}-${posix(micro?.file)}`.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(-64) || 'issue';
  return `${project.gameId}-diagnostic-${token}`;
}
function findWebDiagnosticTask(project, repoRoot, queue) {
  if (project.engine !== 'web' || project.releaseState !== 'development-confirmed') return null;
  const root = sourceFile(repoRoot, project.projectPath);
  if (!fs.existsSync(root)) return null;
  let report;
  try { report = diagnoseGame(root, { maxIssues:12 }); } catch { return null; }
  for (const issue of report.issues || []) {
    const micro = microTaskFromIssue(issue);
    if (!micro?.file || !micro?.goal) continue;
    const id = diagnosticTaskId(project, issue, micro);
    if (hasTask(queue, id)) continue;
    const relative = `${posix(project.projectPath)}/${posix(micro.file)}`;
    const priority = SEVERITY_PRIORITY[clean(issue.severity).toLowerCase()] || 'normal';
    const estimatedRisk = micro.repairMode === 'RULE_PATCH' ? 'low' : 'medium';
    return task(id, project, micro.goal, [relative], priority, estimatedRisk, [`diagnostic:${clean(issue.type) || 'UNKNOWN'}`, `diagnostic-severity:${clean(issue.severity) || 'unknown'}`, `repair-mode:${clean(micro.repairMode) || 'MODEL'}`, `diagnostic-primary-file:${relative}`]);
  }
  return null;
}
function scanExplicitMarkerTask(project, repoRoot, queue) {
  const root = sourceFile(repoRoot, project.projectPath);
  if (!fs.existsSync(root)) return null;
  const extensions = project.engine === 'roblox' ? new Set(['.luau','.lua','.json']) : project.engine === 'web' ? new Set(['.html','.css','.js','.mjs','.json']) : project.engine === 'unity' ? new Set(['.cs']) : project.engine === 'unreal' ? new Set(['.cpp','.h','.hpp','.ini']) : new Set(['.gd']);
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes:true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (['node_modules','dist','build','.rbxcloud','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache','.git'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!extensions.has(path.extname(entry.name).toLowerCase())) continue;
      const text = readText(full);
      if (!/(TODO|FIXME|NotImplementedException)/.test(text)) continue;
      const relative = posix(path.relative(repoRoot, full));
      const id = `${project.gameId}-explicit-maintenance-${relative.replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(-48)}`;
      if (hasTask(queue, id)) continue;
      return task(id, project, `책임 파일 ${relative}에 이미 표시된 TODO/FIXME/NotImplementedException 중 현재 구조 안에서 해결 가능한 저위험 항목 1개를 직접 구현한다. 핵심 규칙·밸런스·세이브 의미·유료 의존성은 바꾸지 않는다.`, [relative], 'low', 'medium');
    }
  }
  return null;
}
function findSafeTask(project, repoRoot, queue) {
  if (project.engine === 'roblox') return scanExplicitMarkerTask(project, repoRoot, queue);
  if (project.engine === 'unity') return findUnityTask(project, repoRoot, queue) || scanExplicitMarkerTask(project, repoRoot, queue);
  if (project.engine === 'web') return findWebDiagnosticTask(project, repoRoot, queue) || scanExplicitMarkerTask(project, repoRoot, queue);
  return null;
}
function releaseUnityFocusBusy(queue) { return activeTasks(queue).some((item) => item.target === 'unity' && item.releaseState === 'release-confirmed'); }

export function planVibe2AutonomousTasks({ status = {}, catalog = {}, queue:queueInput = {}, repoRoot = process.cwd(), maxConcurrentTasks = DEFAULT_MAX_CONCURRENT_TASKS } = {}) {
  let queue = createVibeContinuousQueue({ ...(queueInput || {}), maxConcurrentTasks: parallelLimit(maxConcurrentTasks) });
  const active = activeTasks(queue);
  if (active.some((item) => item.ownerDirective)) return { planned:false, count:0, reason:'OWNER_DIRECTIVE_ACTIVE', queue, tasks:[] };
  const capacity = Math.max(0, queue.maxConcurrentTasks - active.length);
  if (!capacity) return { planned:false, count:0, reason:'PARALLEL_QUEUE_AT_CAPACITY', queue, tasks:[] };
  const allProjects = collectProjects(status, catalog, repoRoot);
  const blockedTier1 = allProjects.filter((project) => project.releaseState === 'release-confirmed' && project.engine === 'unity' && project.developmentBaseline?.ready !== true);
  const projects = allProjects.filter(isAutonomousProductionTarget).sort(projectSort);
  if (!projects.length) return { planned:false, count:0, reason:blockedTier1.length ? 'DEVELOPMENT_BASELINE_REQUIRED' : 'NO_CONFIRMED_PRODUCTION_PROJECT', queue, tasks:[], blockedTier1GameIds:blockedTier1.map((project) => project.gameId) };
  const roots = activeSourceRoots(queue);
  let unityReleaseFocusTaken = releaseUnityFocusBusy(queue);
  const planned = [];
  for (const project of projects) {
    if (planned.length >= capacity) break;
    const root = posix(project.projectPath);
    if (roots.has(root)) continue;
    if (project.engine === 'unity' && project.releaseState === 'release-confirmed' && unityReleaseFocusTaken) continue;
    const next = findSafeTask(project, repoRoot, queue);
    if (!next) continue;
    queue = createVibeContinuousQueue({ tasks:[...queue.tasks, next], maxConcurrentTasks:queue.maxConcurrentTasks });
    planned.push(next);
    roots.add(root);
    if (project.engine === 'unity' && project.releaseState === 'release-confirmed') unityReleaseFocusTaken = true;
  }
  if (!planned.length) return { planned:false, count:0, reason:active.length ? 'NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK' : 'NO_SAFE_AUTONOMOUS_TASK', queue, tasks:[], projectId:projects[0]?.gameId || null, blockedTier1GameIds:blockedTier1.map((project) => project.gameId) };
  return { planned:true, count:planned.length, reason:'SAFE_PARALLEL_TASKS_PLANNED', queue, tasks:planned, task:planned[0], projectId:planned[0].gameId, projectReleaseState:planned[0].releaseState, projectEngine:planned[0].target, blockedTier1GameIds:blockedTier1.map((project) => project.gameId), projectPriorityPolicy:'OWNER_THEN_CONFIRMED_ROBLOX_THEN_RELEASE_UNITY_FOCUS_THEN_DEVELOPMENT_WEB_WITH_SOURCE_ROOT_EXCLUSIVITY' };
}

export function planVibe2AutonomousTask(args = {}) { return planVibe2AutonomousTasks(args); }
export function runVibe2AutoPlanner({ statusFile='.vibe2/main-company-status.json', catalogFile='.vibe2/main-game-catalog.json', queueFile='.vibe2/queue.json', repoRoot=process.cwd(), maxConcurrentTasks=process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS || DEFAULT_MAX_CONCURRENT_TASKS } = {}) {
  const result = planVibe2AutonomousTasks({ status:readJson(statusFile, {}), catalog:readJson(catalogFile, {}), queue:readJson(queueFile, { tasks:[] }), repoRoot, maxConcurrentTasks });
  if (result.planned) writeJson(queueFile, result.queue);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = runVibe2AutoPlanner({ statusFile:clean(args.status) || '.vibe2/main-company-status.json', catalogFile:clean(args.catalog) || '.vibe2/main-game-catalog.json', queueFile:clean(args.queue) || '.vibe2/queue.json', repoRoot:clean(args.root) || process.cwd(), maxConcurrentTasks:clean(args.max) || process.env.VIBE2_MAX_CONCURRENT_GAME_TASKS || DEFAULT_MAX_CONCURRENT_TASKS });
  console.log(`VIBE2_AUTO_PLAN=${result.planned ? 'YES' : 'NO'}`);
  console.log(`VIBE2_AUTO_PLAN_REASON=${result.reason}`);
  console.log(`VIBE2_AUTO_PLAN_COUNT=${result.count || 0}`);
  console.log(`VIBE2_AUTO_PLAN_PROJECT=${result.projectId || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_RELEASE_STATE=${result.projectReleaseState || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_ENGINE=${result.projectEngine || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_PRIORITY=${result.projectPriorityPolicy || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_TASK=${result.task?.id || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_TASKS=${(result.tasks || []).map((task) => task.id).join(',') || 'NONE'}`);
  console.log(`VIBE2_AUTO_PLAN_BLOCKED_TIER1=${(result.blockedTier1GameIds || []).join(',') || 'NONE'}`);
}
