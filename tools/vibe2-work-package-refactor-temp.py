from pathlib import Path
import json

ROOT = Path('.')

def replace_between(text, start, end, replacement):
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + replacement + text[b:]

# 1) Work-package scheduler + workload telemetry.
work_package = r'''// 파일명: tools/vibe2-work-package.mjs
// 역할: 작은 작업을 기능 단위 work package로 묶고 최소 작업량·공유 준비·효율 적응·완료 기준을 관리한다.

const clean=v=>String(v??'').trim();
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const clampInt=(v,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(v)||0)));
const round=v=>Math.round(Number(v||0)*100)/100;
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];

export const DEFAULT_WORK_PACKAGE_POLICY=Object.freeze({
  enabled:true,
  minWorkUnitsPerPackage:3,
  minTasksPerPackage:2,
  substantialSingleTaskWorkUnits:3,
  targetWorkUnitsPerCycle:12,
  targetPackagesPerCycle:4,
  maxPackagesPerCycle:10,
  maxTasksPerPackage:5,
  adaptiveMinMax:6,
  lowEfficiencyMicroTaskRatePct:35,
  lowEfficiencyReworkRatePct:20,
  longWorkUnits:5
});

export function estimateTaskWorkUnits(task={}){
  const explicit=Number(task.taskWorkUnits||task.workUnits||0);
  if(Number.isFinite(explicit)&&explicit>0)return clampInt(explicit,1,8);
  const evidence=Array.isArray(task.evidence)?task.evidence.map(clean):[];
  if(task.ownerDirective===true||evidence.some(x=>x==='full-web-game-rebuild'))return 6;
  const risk=clean(task.estimatedRisk).toLowerCase();
  let units=risk==='high'?3:risk==='medium'?2:1;
  const files=unique(task.responsibleFiles||[]).length;
  if(files>1)units+=Math.min(2,files-1);
  if(clean(task.goal).length>=700)units+=1;
  return clampInt(units,1,8);
}

export function computeWorkPackageEfficiency(queue={}){
  const tasks=Array.isArray(queue?.tasks)?queue.tasks:[];
  const packaged=tasks.filter(t=>clean(t.packageId));
  const packages=new Map();
  for(const task of packaged){
    const id=clean(task.packageId);
    if(!packages.has(id))packages.set(id,[]);
    packages.get(id).push(task);
  }
  const packageRows=[...packages.values()];
  const completedPackageCount=packageRows.filter(rows=>rows.length&&rows.every(t=>clean(t.status)==='done')).length;
  const failedPackageCount=packageRows.filter(rows=>rows.some(t=>clean(t.status)==='failed')).length;
  const taskUnits=packaged.map(estimateTaskWorkUnits);
  const packageUnits=packageRows.map(rows=>Math.max(...rows.map(t=>Number(t.packageWorkUnits||0)),rows.reduce((n,t)=>n+estimateTaskWorkUnits(t),0)));
  const microTaskCount=taskUnits.filter(v=>v<=1).length;
  const reworkedTaskCount=packaged.filter(t=>Number(t.retries||0)>0).length;
  const microTaskRatePct=packaged.length?round(microTaskCount/packaged.length*100):0;
  const reworkRatePct=packaged.length?round(reworkedTaskCount/packaged.length*100):0;
  const avgTaskWorkUnits=taskUnits.length?round(taskUnits.reduce((a,b)=>a+b,0)/taskUnits.length):0;
  const avgPackageWorkUnits=packageUnits.length?round(packageUnits.reduce((a,b)=>a+b,0)/packageUnits.length):0;
  const lowEfficiencyDetected=packaged.length>=4&&(microTaskRatePct>DEFAULT_WORK_PACKAGE_POLICY.lowEfficiencyMicroTaskRatePct||reworkRatePct>DEFAULT_WORK_PACKAGE_POLICY.lowEfficiencyReworkRatePct||avgTaskWorkUnits<1.75);
  return{
    packageCount:packageRows.length,
    completedPackageCount,
    failedPackageCount,
    packagedTaskCount:packaged.length,
    microTaskCount,
    microTaskRatePct,
    reworkedTaskCount,
    reworkRatePct,
    avgTaskWorkUnits,
    avgPackageWorkUnits,
    lowEfficiencyDetected
  };
}

export function resolveWorkPackagePolicy(runtimePolicy={},queue={}){
  const efficiency=computeWorkPackageEfficiency(queue);
  const base={...DEFAULT_WORK_PACKAGE_POLICY,...(runtimePolicy||{})};
  const baseMin=clampInt(base.minWorkUnitsPerPackage||3,2,6);
  const maxMin=clampInt(base.adaptiveMinMax||6,baseMin,8);
  const adaptiveBoost=base.efficiencyAdaptation?.enabled===false?0:(efficiency.lowEfficiencyDetected?1:0);
  return{
    ...base,
    minWorkUnitsPerPackage:Math.min(maxMin,baseMin+adaptiveBoost),
    minTasksPerPackage:clampInt(base.minTasksPerPackage||2,1,5),
    substantialSingleTaskWorkUnits:clampInt(base.substantialSingleTaskWorkUnits||3,2,8),
    targetWorkUnitsPerCycle:clampInt(base.targetWorkUnitsPerCycle||12,3,100),
    targetPackagesPerCycle:clampInt(base.targetPackagesPerCycle||4,1,10),
    maxPackagesPerCycle:clampInt(base.maxPackagesPerCycle||10,1,10),
    maxTasksPerPackage:clampInt(base.maxTasksPerPackage||5,1,8),
    longWorkUnits:clampInt(base.longWorkUnits||5,3,12),
    adaptiveBoost,
    efficiency
  };
}

function hashText(text=''){
  let hash=2166136261;
  for(const ch of String(text)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
  return hash.toString(36);
}

export function buildWorkPackage({tasks=[],project={},sequence=1,policy={}}={}){
  const list=(tasks||[]).filter(Boolean);
  const resolved={...DEFAULT_WORK_PACKAGE_POLICY,...policy};
  const taskUnits=list.map(estimateTaskWorkUnits);
  const packageWorkUnits=taskUnits.reduce((a,b)=>a+b,0);
  const substantial=taskUnits.some(v=>v>=Number(resolved.substantialSingleTaskWorkUnits||3));
  const owner=list.some(t=>t.ownerDirective===true);
  const accepted=list.length>0&&packageWorkUnits>=Number(resolved.minWorkUnitsPerPackage||3)&&(list.length>=Number(resolved.minTasksPerPackage||2)||substantial||owner);
  const gameId=clean(project.gameId||list[0]?.gameId)||'global';
  const sourceRoot=posix(project.projectPath||list[0]?.sourceRoot);
  const fingerprint=list.map(t=>clean(t.id)).join('|');
  const packageId=`${gameId}-wp-${hashText(fingerprint||`${gameId}-${sequence}`)}`;
  const responsibleFiles=unique(list.flatMap(t=>t.responsibleFiles||[]));
  const diagnosticEvidence=unique(list.flatMap(t=>t.evidence||[]).filter(x=>/^diagnostic:|^repair-mode:|^maintenance-file:/.test(clean(x))));
  const completionCriteria=unique(resolved.completionCriteria||[
    'functional-scope-implemented',
    'all-package-task-incremental-qa-pass',
    'full-core-regression-once-at-fan-in',
    'machine-contract-and-central-doc-synced-when-architecture-changes'
  ]);
  const packageGoal=`${clean(project.name)||gameId}: 관련 구현·품질 개선을 기능 단위로 묶어 끝까지 완료한다.`;
  const packageContext={
    explorationMode:clean(resolved.explorationMode)||'planner-precomputed-shared-context',
    sharedPreparation:resolved.sharedPreparation!==false,
    sourceRoot,
    responsibleFiles,
    diagnosticEvidence,
    roles:{owner:'work-package-owner',implementation:'parallel-implementation-workers',qa:'incremental-per-task-plus-fan-in-regression',review:'fan-in-package-review'}
  };
  const decorated=list.map((task,index)=>({
    ...task,
    taskWorkUnits:taskUnits[index],
    packageId,
    packageGoal,
    packageRole:index===0?'implementation-owner':'implementation',
    packageOwner:`feature-owner:${gameId}`,
    packageWorkUnits,
    packageSize:list.length,
    packageMinWorkUnits:Number(resolved.minWorkUnitsPerPackage||3),
    packageLongWorkProtected:packageWorkUnits>=Number(resolved.longWorkUnits||5),
    packageContext,
    completionCriteria,
    evidence:unique([...(task.evidence||[]),`work-package:${packageId}`,`task-work-units:${taskUnits[index]}`,`package-work-units:${packageWorkUnits}`])
  }));
  return{accepted,packageId,packageGoal,packageWorkUnits,taskCount:list.length,substantial,owner,completionCriteria,packageContext,tasks:decorated,rejectionReason:accepted?null:'MINIMUM_WORKLOAD_GATE'};
}

export function computeWorkloadTelemetry(queue={},plannedPackages=[]){
  const efficiency=computeWorkPackageEfficiency(queue);
  const packages=(plannedPackages||[]).filter(Boolean);
  const plannedWorkUnits=packages.reduce((n,p)=>n+Number(p.packageWorkUnits||0),0);
  const plannedTaskCount=packages.reduce((n,p)=>n+Number(p.taskCount||p.tasks?.length||0),0);
  return{
    version:1,
    plannedPackageCount:packages.length,
    plannedTaskCount,
    plannedWorkUnits,
    averagePlannedWorkUnitsPerPackage:packages.length?round(plannedWorkUnits/packages.length):0,
    completedFeaturePackageCount:efficiency.completedPackageCount,
    failedFeaturePackageCount:efficiency.failedPackageCount,
    historicalPackageCount:efficiency.packageCount,
    historicalMicroTaskRatePct:efficiency.microTaskRatePct,
    historicalReworkRatePct:efficiency.reworkRatePct,
    historicalAvgTaskWorkUnits:efficiency.avgTaskWorkUnits,
    historicalAvgPackageWorkUnits:efficiency.avgPackageWorkUnits,
    lowEfficiencyDetected:efficiency.lowEfficiencyDetected,
    qaMode:'incremental-per-task-plus-single-full-fan-in-regression',
    duplicateFullRegressionExpected:false
  };
}
'''
(ROOT/'tools/vibe2-work-package.mjs').write_text(work_package, encoding='utf-8')

# 2) Planner: bundle diagnostics/TODOs and schedule through work packages.
planner_path=ROOT/'tools/vibe2-auto-planner.mjs'
planner=planner_path.read_text(encoding='utf-8')
planner=planner.replace("import { diagnoseGame, microTaskFromIssue } from './autonomous-diagnostics.mjs';", "import { diagnoseGame, microTaskFromIssue } from './autonomous-diagnostics.mjs';\nimport { buildWorkPackage, computeWorkloadTelemetry, resolveWorkPackagePolicy } from './vibe2-work-package.mjs';")

old_diag_start='function diagnosticTaskId(project,issue,micro)'
old_diag_end='function findSafeTask(project,repoRoot,queue)'
new_diag=r'''function diagnosticKey(issue,micro){return`${clean(issue?.type)||'UNKNOWN'}:${posix(micro?.file)||'unknown'}`;}
function diagnosticSeen(queue,key){return queue.tasks.some(item=>(item.evidence||[]).some(e=>clean(e)===`diagnostic-key:${key}`));}
function diagnosticTaskId(project,rows){const token=rows.map(({issue,micro})=>`${clean(issue?.type)}-${posix(micro?.file)}`).join('-').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(-72)||'issues';return`${project.gameId}-diagnostic-bundle-${token}`;}
function findWebDiagnosticTask(project,repoRoot,queue){
  if(project.engine!=='web'||project.releaseState!=='development-confirmed')return null;
  const root=sourceFile(repoRoot,project.projectPath);if(!fs.existsSync(root))return null;
  let report;try{report=diagnoseGame(root,{maxIssues:20});}catch{return null;}
  const rows=[];
  for(const issue of report.issues||[]){
    const micro=microTaskFromIssue(issue);if(!micro?.file||!micro?.goal)continue;
    const key=diagnosticKey(issue,micro);if(diagnosticSeen(queue,key))continue;
    rows.push({issue,micro,key});if(rows.length>=4)break;
  }
  if(!rows.length)return null;
  const id=diagnosticTaskId(project,rows);if(hasTask(queue,id))return null;
  const files=[...new Set(rows.map(({micro})=>`${posix(project.projectPath)}/${posix(micro.file)}`))];
  const priorities=rows.map(({issue})=>SEVERITY_PRIORITY[clean(issue.severity).toLowerCase()]||'normal');
  const priority=priorities.includes('critical')?'critical':priorities.includes('high')?'high':priorities.includes('normal')?'normal':'low';
  const estimatedRisk=rows.some(({micro})=>micro.repairMode!=='RULE_PATCH')?'medium':'low';
  const goals=rows.map(({micro},i)=>`${i+1}. ${micro.goal}`);
  const evidence=rows.flatMap(({issue,micro,key})=>[`diagnostic:${clean(issue.type)||'UNKNOWN'}`,`diagnostic-key:${key}`,`diagnostic-severity:${clean(issue.severity)||'unknown'}`,`repair-mode:${clean(micro.repairMode)||'MODEL'}`]);
  const out=task(id,project,`[DIAGNOSTIC_BUNDLE] 같은 기능 경계의 관련 문제를 한 번에 해결한다.\n${goals.join('\n')}\n각 수정 후 해당 파일의 접근성/모바일 입력/기본 성능·문법 안정성도 함께 확인한다.`,files,priority,estimatedRisk,evidence);
  out.workUnits=Math.max(3,Math.min(6,rows.length+1));
  return out;
}
function scanExplicitMarkerTask(project,repoRoot,queue){
  const root=sourceFile(repoRoot,project.projectPath);if(!fs.existsSync(root))return null;
  const extensions=project.engine==='roblox'?new Set(['.luau','.lua','.json']):project.engine==='web'?new Set(['.html','.css','.js','.mjs','.json']):project.engine==='unity'?new Set(['.cs']):project.engine==='unreal'?new Set(['.cpp','.h','.hpp','.ini']):new Set(['.gd']);
  const stack=[root],rows=[];
  while(stack.length&&rows.length<3){
    const current=stack.pop();
    for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(['node_modules','dist','build','.rbxcloud','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache','.git'].includes(entry.name))continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory()){stack.push(full);continue;}
      if(!extensions.has(path.extname(entry.name).toLowerCase()))continue;
      const text=readText(full);if(!/(TODO|FIXME|NotImplementedException)/.test(text))continue;
      const relative=posix(path.relative(repoRoot,full));
      if(queue.tasks.some(item=>(item.evidence||[]).includes(`maintenance-file:${relative}`)))continue;
      rows.push(relative);if(rows.length>=3)break;
    }
  }
  if(!rows.length)return null;
  const token=rows.map(x=>x.replace(/[^a-zA-Z0-9]+/g,'-')).join('-').slice(-64),id=`${project.gameId}-maintenance-bundle-${token}`;
  if(hasTask(queue,id))return null;
  const out=task(id,project,`[MAINTENANCE_BUNDLE] ${rows.join(', ')}에 이미 표시된 TODO/FIXME/NotImplementedException을 같은 기능 경계 안에서 가능한 만큼 함께 해결한다. 단순 한 줄 제거로 끝내지 말고 관련 안전성·오류 처리·기본 QA까지 책임 파일 범위에서 마무리한다. 핵심 규칙·밸런스·세이브 의미·유료 의존성은 바꾸지 않는다.`,rows,'low','medium',rows.map(x=>`maintenance-file:${x}`));
  out.workUnits=Math.max(3,rows.length+1);
  return out;
}
'''
planner=replace_between(planner,old_diag_start,old_diag_end,new_diag)

plan_start='export function planVibe2AutonomousTasks('
plan_end='export function planVibe2AutonomousTask(args={})'
new_plan=r'''export function planVibe2AutonomousTasks({status={},catalog={},queue:queueInput={},repoRoot=process.cwd(),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS,workPackagePolicy={}}={}){
  let queue=createVibeContinuousQueue({...(queueInput||{}),maxConcurrentTasks:parallelLimit(maxConcurrentTasks)});
  const active=activeTasks(queue);
  if(active.some(item=>item.ownerDirective))return{planned:false,count:0,reason:'OWNER_DIRECTIVE_ACTIVE',queue,tasks:[],packages:[],workloadTelemetry:computeWorkloadTelemetry(queue,[])};
  const capacity=Math.max(0,queue.maxConcurrentTasks-active.length);
  if(!capacity)return{planned:false,count:0,reason:'PARALLEL_QUEUE_AT_CAPACITY',queue,tasks:[],packages:[],workloadTelemetry:computeWorkloadTelemetry(queue,[])};
  const policy=resolveWorkPackagePolicy(workPackagePolicy,queue);
  const allProjects=collectProjects(status,catalog,repoRoot),blockedTier1=allProjects.filter(project=>project.releaseState==='release-confirmed'&&project.engine==='unity'&&project.developmentBaseline?.ready!==true),projects=allProjects.filter(isAutonomousProductionTarget).sort(projectSort);
  if(!projects.length)return{planned:false,count:0,reason:blockedTier1.length?'DEVELOPMENT_BASELINE_REQUIRED':'NO_CONFIRMED_PRODUCTION_PROJECT',queue,tasks:[],packages:[],workPackagePolicy:policy,workloadTelemetry:computeWorkloadTelemetry(queue,[]),blockedTier1GameIds:blockedTier1.map(p=>p.gameId)};
  let unityReleaseFocusTaken=releaseUnityFocusBusy(queue);
  const planned=[],packages=[],deferredSmallPackages=[];
  let sequence=0;
  for(const project of projects){
    if(planned.length>=capacity||packages.length>=policy.maxPackagesPerCycle)break;
    if(project.engine==='unity'&&project.releaseState==='release-confirmed'&&unityReleaseFocusTaken)continue;
    let candidateQueue=queue,candidates=[],localAttempts=0;
    const packageTaskCap=Math.min(policy.maxTasksPerPackage,capacity-planned.length);
    while(candidates.length<packageTaskCap&&localAttempts<30){
      localAttempts+=1;
      const next=findSafeTask(project,repoRoot,candidateQueue);
      if(!next)break;
      if(plannerConflict(candidateQueue,next))break;
      candidateQueue=createVibeContinuousQueue({tasks:[...candidateQueue.tasks,next],maxConcurrentTasks:candidateQueue.maxConcurrentTasks});
      candidates.push(next);
      if(next.ownerDirective)break;
    }
    if(!candidates.length)continue;
    sequence+=1;
    const pkg=buildWorkPackage({tasks:candidates,project,sequence,policy});
    if(!pkg.accepted){deferredSmallPackages.push({gameId:project.gameId,taskIds:candidates.map(t=>t.id),workUnits:pkg.packageWorkUnits,reason:pkg.rejectionReason});continue;}
    for(const next of pkg.tasks){
      if(planned.length>=capacity)break;
      queue=createVibeContinuousQueue({tasks:[...queue.tasks,next],maxConcurrentTasks:queue.maxConcurrentTasks});
      planned.push(next);
    }
    packages.push({...pkg,tasks:pkg.tasks.slice(0,Math.max(0,capacity-(planned.length-pkg.tasks.length)))});
    if(project.engine==='unity'&&project.releaseState==='release-confirmed'){unityReleaseFocusTaken=true;}
  }
  const workloadTelemetry=computeWorkloadTelemetry(queue,packages);
  const cycleTarget={
    targetWorkUnits:policy.targetWorkUnitsPerCycle,
    targetPackages:policy.targetPackagesPerCycle,
    plannedWorkUnits:workloadTelemetry.plannedWorkUnits,
    plannedPackages:packages.length,
    met:workloadTelemetry.plannedWorkUnits>=policy.targetWorkUnitsPerCycle||packages.length>=policy.targetPackagesPerCycle
  };
  if(!planned.length)return{planned:false,count:0,reason:deferredSmallPackages.length?'MINIMUM_WORKLOAD_GATE':active.length?'NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK':'NO_SAFE_AUTONOMOUS_TASK',queue,tasks:[],packages:[],projectId:projects[0]?.gameId||null,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
  return{planned:true,count:planned.length,reason:'WORK_PACKAGES_PLANNED',queue,tasks:planned,packages,task:planned[0],projectId:planned[0].gameId,projectReleaseState:planned[0].releaseState,projectEngine:planned[0].target,blockedTier1GameIds:blockedTier1.map(p=>p.gameId),projectPriorityPolicy:'OWNER_WEBGAME_FIRST_THEN_CONFIRMED_WEB_THEN_ROBLOX_THEN_RELEASE_UNITY',deferredSmallPackages,workPackagePolicy:policy,cycleTarget,workloadTelemetry};
}
'''
planner=replace_between(planner,plan_start,plan_end,new_plan)
planner=planner.replace("const result=planVibe2AutonomousTasks({status:readJson(statusFile,{}),catalog:readJson(catalogFile,{}),queue:readJson(resolvedQueueFile,{tasks:[]}),repoRoot,maxConcurrentTasks:effectivePlannerMax});", "const result=planVibe2AutonomousTasks({status:readJson(statusFile,{}),catalog:readJson(catalogFile,{}),queue:readJson(resolvedQueueFile,{tasks:[]}),repoRoot,maxConcurrentTasks:effectivePlannerMax,workPackagePolicy:runtime.workPackages||{}});")
planner=planner.replace("console.log(`VIBE2_AUTO_PLAN_BLOCKED_TIER1=${(result.blockedTier1GameIds||[]).join(',')||'NONE'}`);", "console.log(`VIBE2_AUTO_PLAN_BLOCKED_TIER1=${(result.blockedTier1GameIds||[]).join(',')||'NONE'}`);console.log(`VIBE2_WORK_PACKAGE_COUNT=${result.packages?.length||0}`);console.log(`VIBE2_WORK_PACKAGE_UNITS=${result.workloadTelemetry?.plannedWorkUnits||0}`);console.log(`VIBE2_WORK_PACKAGE_CYCLE_TARGET=${result.cycleTarget?.met?'MET':'NOT_MET'}`);console.log(`VIBE2_WORK_PACKAGE_MICRO_RATE=${result.workloadTelemetry?.historicalMicroTaskRatePct||0}`);console.log(`VIBE2_WORK_PACKAGE_REWORK_RATE=${result.workloadTelemetry?.historicalReworkRatePct||0}`);")
planner_path.write_text(planner,encoding='utf-8')

# 3) Queue: preserve package metadata and prefer long functional packages without overriding owner/release priority.
queue_path=ROOT/'assets/vibe-continuous-queue.js'
queue=queue_path.read_text(encoding='utf-8')
queue=queue.replace("function normalizeCompanyContext(input = {}) {", r'''function normalizePackageContext(input = {}) {
  const source=input&&typeof input==='object'?input:{};
  if(!clean(source.explorationMode)&&!clean(source.sourceRoot)&&!(source.responsibleFiles||[]).length)return null;
  return freeze({
    explorationMode:clean(source.explorationMode)||'planner-precomputed-shared-context',
    sharedPreparation:source.sharedPreparation!==false,
    sourceRoot:posix(source.sourceRoot)||null,
    responsibleFiles:freezeList(source.responsibleFiles||[]),
    diagnosticEvidence:freezeList(source.diagnosticEvidence||[]),
    roles:freeze({...((source.roles&&typeof source.roles==='object')?source.roles:{})})
  });
}
function normalizeCompanyContext(input = {}) {''')
queue=queue.replace("    estimatedRisk: ['low','medium','high'].includes(clean(input.estimatedRisk).toLowerCase()) ? clean(input.estimatedRisk).toLowerCase() : 'low'\n", "    estimatedRisk: ['low','medium','high'].includes(clean(input.estimatedRisk).toLowerCase()) ? clean(input.estimatedRisk).toLowerCase() : 'low',\n    taskWorkUnits: clampInt(input.taskWorkUnits || input.workUnits || 0, 0, 8),\n    packageId: clean(input.packageId) || null,\n    packageGoal: clean(input.packageGoal) || null,\n    packageRole: clean(input.packageRole) || null,\n    packageOwner: clean(input.packageOwner) || null,\n    packageWorkUnits: clampInt(input.packageWorkUnits || 0, 0, 40),\n    packageSize: clampInt(input.packageSize || 0, 0, 8),\n    packageMinWorkUnits: clampInt(input.packageMinWorkUnits || 0, 0, 12),\n    packageLongWorkProtected: input.packageLongWorkProtected === true,\n    packageContext: normalizePackageContext(input.packageContext),\n    completionCriteria: freezeList(input.completionCriteria || [])\n")
queue=queue.replace("      speculativeParallelism: 'high-risk-opt-in-only'\n", "      speculativeParallelism: 'high-risk-opt-in-only',\n      workPackageAware: true,\n      longWorkPackagePriority: true,\n      minimumWorkloadGate: true\n")
queue=queue.replace("    + (PRIORITY_SCORE[task.priority] || 0)\n    - index / 1000;", "    + (PRIORITY_SCORE[task.priority] || 0)\n    + Math.min(30, Number(task.packageWorkUnits || task.taskWorkUnits || 0) * 3)\n    + (task.packageLongWorkProtected ? 12 : 0)\n    - index / 1000;")
queue_path.write_text(queue,encoding='utf-8')

# 4) Work order: carry shared package context and completion definition into every worker.
runner_path=ROOT/'tools/vibe2-continuous-runner.mjs'
runner=runner_path.read_text(encoding='utf-8')
runner=runner.replace("  const learningGuidance = buildLearningGuidance(plan.learning);\n  const executionGoal = [task.goal, designIntelligence.guidance, learningGuidance].filter(Boolean).join('\\n\\n');", r'''  const learningGuidance = buildLearningGuidance(plan.learning);
  const workPackage=freeze({
    id:clean(task.packageId)||null,
    goal:clean(task.packageGoal)||null,
    role:clean(task.packageRole)||null,
    owner:clean(task.packageOwner)||null,
    taskWorkUnits:Number(task.taskWorkUnits||0),
    packageWorkUnits:Number(task.packageWorkUnits||0),
    packageSize:Number(task.packageSize||0),
    longWorkProtected:task.packageLongWorkProtected===true,
    sharedContext:task.packageContext||null,
    completionCriteria:freezeList(task.completionCriteria||[])
  });
  const packageGuidance=workPackage.id?[
    `[WORK PACKAGE ${workPackage.id}]`,
    workPackage.goal||'',
    `역할=${workPackage.role||'implementation'}; taskWorkUnits=${workPackage.taskWorkUnits}; packageWorkUnits=${workPackage.packageWorkUnits}`,
    workPackage.sharedContext?.responsibleFiles?.length?`공유 준비 범위=${workPackage.sharedContext.responsibleFiles.join(', ')}`:'',
    workPackage.completionCriteria.length?`완료 기준=${workPackage.completionCriteria.join(' | ')}`:''
  ].filter(Boolean).join('\n'):'';
  const executionGoal = [packageGuidance, task.goal, designIntelligence.guidance, learningGuidance].filter(Boolean).join('\n\n');''')
runner=runner.replace("    qa, incrementalQa:incrementalQaPlan(task, plan.target, responsibleFiles),\n    designIntelligence,", "    qa, incrementalQa:incrementalQaPlan(task, plan.target, responsibleFiles),\n    workPackage,\n    designIntelligence,")
runner_path.write_text(runner,encoding='utf-8')

# 5) Central machine contract + single human central doc.
runtime_path=ROOT/'vibe2-runtime.json'
runtime=json.loads(runtime_path.read_text(encoding='utf-8'))
runtime['workPackages']={
  'enabled':True,
  'scheduler':'feature-boundary-work-package',
  'minWorkUnitsPerPackage':3,
  'minTasksPerPackage':2,
  'substantialSingleTaskWorkUnits':3,
  'targetWorkUnitsPerCycle':12,
  'targetPackagesPerCycle':4,
  'maxPackagesPerCycle':10,
  'maxTasksPerPackage':5,
  'smallTaskAction':'auto-expand-or-defer',
  'automaticExpansion':['related-diagnostics','adjacent-safe-maintenance','ux-readability','qa-hardening','performance-sanity'],
  'explorationMode':'planner-precomputed-shared-context',
  'sharedPreparation':True,
  'longWorkSlotProtection':True,
  'parallelRoles':['work-package-owner','parallel-implementation-workers','incremental-qa','fan-in-package-review'],
  'completionCriteria':['functional-scope-implemented','all-package-task-incremental-qa-pass','full-core-regression-once-at-fan-in','machine-contract-and-central-doc-synced-when-architecture-changes'],
  'preferredDeliveryUnit':'one-functional-pr-per-work-package-after-package-qa',
  'workloadTelemetry':{'enabled':True,'tool':'tools/vibe2-work-package.mjs','metrics':['plannedPackageCount','plannedWorkUnits','completedFeaturePackageCount','historicalMicroTaskRatePct','historicalReworkRatePct','historicalAvgPackageWorkUnits','lowEfficiencyDetected']},
  'efficiencyAdaptation':{'enabled':True,'lowEfficiencyAction':'increase-minimum-work-units-one-step','maxMinWorkUnitsPerPackage':6,'neverReduceSafetyOrQa':True}
}
runtime_path.write_text(json.dumps(runtime,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

human_path=ROOT/'VIBE2.md'
human=human_path.read_text(encoding='utf-8')
marker='## Work Package Execution'
if marker not in human:
    human += r'''

## Work Package Execution

Vibe2 개발은 작은 파일 수정 개수를 성과로 보지 않는다. Planner는 같은 기능 경계의 진단, 유지보수, UX/가독성, QA 보강, 성능 안전성 작업을 가능한 범위에서 하나의 work package로 확장한다. 최소 작업량을 못 채운 작은 작업은 즉시 실행하지 않고 관련 작업과 합치거나 보류한다.

각 package는 공유 준비 컨텍스트, 기능 owner, 구현 역할, incremental QA, fan-in 전체 회귀, 완료 기준을 가진다. 긴 package는 짧은 작업에 계속 밀리지 않도록 우선순위를 보강하며 source/file lock 안전 규칙은 그대로 유지한다. 작업량 평가는 worker 수가 아니라 package 완료 수, work units, micro-task 비율, 재작업률, package 평균 작업량을 기준으로 한다. 낮은 효율이 반복되면 다음 planning cycle의 최소 package 작업량을 한 단계 높인다.

중앙 machine 계약은 `vibe2-runtime.json`이다. 구현 구조가 바뀌는 작업은 별도 지시 없이 해당 계약과 이 문서를 함께 동기화한다. 핵심 권한/보호 규칙 변경은 owner 지시 없이 자동 확정하지 않는다.
'''
human_path.write_text(human,encoding='utf-8')

# 6) Tests.
wp_test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkPackage, computeWorkPackageEfficiency, computeWorkloadTelemetry, resolveWorkPackagePolicy } from '../tools/vibe2-work-package.mjs';

const baseTask=(id,extra={})=>({id,gameId:'demo',target:'web',sourceRoot:'web-games/demo',goal:`goal ${id}`,responsibleFiles:[`${id}.js`],status:'queued',estimatedRisk:'low',...extra});

test('minimum workload gate defers a truly tiny package',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('tiny')],project:{gameId:'demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,false);
  assert.equal(pkg.rejectionReason,'MINIMUM_WORKLOAD_GATE');
});

test('related tasks become one functional work package with shared prep and completion criteria',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('a',{estimatedRisk:'medium'}),baseTask('b')],project:{gameId:'demo',name:'Demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,true);
  assert.ok(pkg.packageWorkUnits>=3);
  assert.equal(pkg.tasks.length,2);
  assert.equal(pkg.tasks.every(t=>t.packageId===pkg.packageId),true);
  assert.equal(pkg.tasks[0].packageRole,'implementation-owner');
  assert.equal(pkg.tasks[0].packageContext.sharedPreparation,true);
  assert.ok(pkg.completionCriteria.includes('full-core-regression-once-at-fan-in'));
});

test('substantial owner work may form a single package',()=>{
  const policy=resolveWorkPackagePolicy({}, {tasks:[]});
  const pkg=buildWorkPackage({tasks:[baseTask('owner',{ownerDirective:true,evidence:['full-web-game-rebuild']})],project:{gameId:'demo',projectPath:'web-games/demo'},policy});
  assert.equal(pkg.accepted,true);
  assert.ok(pkg.packageWorkUnits>=6);
});

test('historical low efficiency increases minimum package work one step',()=>{
  const tasks=Array.from({length:5},(_,i)=>baseTask(`m${i}`,{packageId:`p${i}`,packageWorkUnits:1,taskWorkUnits:1,status:'done'}));
  const efficiency=computeWorkPackageEfficiency({tasks});
  assert.equal(efficiency.lowEfficiencyDetected,true);
  const policy=resolveWorkPackagePolicy({efficiencyAdaptation:{enabled:true}}, {tasks});
  assert.equal(policy.minWorkUnitsPerPackage,4);
  assert.equal(policy.adaptiveBoost,1);
});

test('workload telemetry counts completed packages and rework without using worker count as success',()=>{
  const tasks=[
    baseTask('a',{packageId:'p1',packageWorkUnits:4,taskWorkUnits:2,status:'done'}),
    baseTask('b',{packageId:'p1',packageWorkUnits:4,taskWorkUnits:2,status:'done',retries:1}),
    baseTask('c',{packageId:'p2',packageWorkUnits:3,taskWorkUnits:3,status:'running'})
  ];
  const t=computeWorkloadTelemetry({tasks},[{packageWorkUnits:5,taskCount:2}]);
  assert.equal(t.completedFeaturePackageCount,1);
  assert.equal(t.plannedPackageCount,1);
  assert.equal(t.plannedWorkUnits,5);
  assert.ok(t.historicalReworkRatePct>0);
  assert.equal(t.duplicateFullRegressionExpected,false);
});
'''
(ROOT/'qa/vibe2-work-package.test.mjs').write_text(wp_test,encoding='utf-8')

# Update planner tests for package contract and bundled diagnostics.
apt=ROOT/'qa/vibe2-auto-planner.test.mjs'
t=apt.read_text(encoding='utf-8')
t=t.replace("  assert.equal(result.tasks.every(t=>t.releaseState==='development-confirmed'&&t.target==='web'),true);", "  assert.equal(result.tasks.every(t=>t.releaseState==='development-confirmed'&&t.target==='web'),true);\n  assert.equal(result.tasks.every(t=>Boolean(t.packageId)&&t.packageWorkUnits>=3),true);\n  assert.ok(result.workloadTelemetry.plannedPackageCount>=1);")
t=t.replace("  assert.match(result.task.id,/diagnostic-MISSING-VIEWPORT-index-html/);", "  assert.match(result.task.id,/diagnostic-bundle/);")
t=t.replace("  assert.equal(result.task.evidence.includes('diagnostic:MISSING_VIEWPORT'),true);", "  assert.equal(result.task.evidence.includes('diagnostic:MISSING_VIEWPORT'),true);\n  assert.equal(result.task.packageWorkUnits>=3,true);\n  assert.equal(result.task.completionCriteria.includes('full-core-regression-once-at-fan-in'),true);")
t=t.replace("  assert.equal(second.task.evidence.some(x=>x==='diagnostic:TOUCH_ACTION_UNSPECIFIED'),true);", "  assert.equal(second.task.evidence.some(x=>x.startsWith('diagnostic:')),true);\n  assert.equal(second.task.evidence.some(x=>x.startsWith('diagnostic-key:')),true);")
# Residual one-unit Unity work should no longer be emitted alone; provide two remaining items by marking only first complete.
# Existing fixture has save + motion needs, so the package remains eligible and save stays first.
t=t.replace("  assert.equal(result.task.id,'demo-save-null-guards');", "  assert.equal(result.task.id,'demo-save-null-guards');\n  assert.equal(result.task.packageSize>=2,true);\n  assert.equal(result.task.packageWorkUnits>=3,true);")
apt.write_text(t,encoding='utf-8')

# Queue test: metadata survives normalization and long package wins inside same safety tier.
qtest=ROOT/'qa/vibe2-queue-control.test.mjs'
qt=qtest.read_text(encoding='utf-8')
qt += r'''

test('work package metadata survives queue normalization and larger functional package wins same-tier scheduling', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'tiny',gameId:'a',target:'web',goal:'tiny',sourceRoot:'web-games/a',responsibleFiles:['a.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'p-tiny',taskWorkUnits:1,packageWorkUnits:1,packageSize:1},
    {id:'feature',gameId:'b',target:'web',goal:'feature',sourceRoot:'web-games/b',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'p-feature',packageGoal:'finish feature',packageRole:'implementation-owner',taskWorkUnits:3,packageWorkUnits:6,packageSize:2,packageLongWorkProtected:true,completionCriteria:['functional-scope-implemented'],packageContext:{explorationMode:'planner-precomputed-shared-context',sharedPreparation:true,sourceRoot:'web-games/b',responsibleFiles:['b.js']}}
  ]});
  const selection=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selection.selected[0].id,'feature');
  assert.equal(selection.selected[0].packageId,'p-feature');
  assert.equal(selection.selected[0].packageContext.sharedPreparation,true);
  assert.deepEqual([...selection.selected[0].completionCriteria],['functional-scope-implemented']);
});
'''
qtest.write_text(qt,encoding='utf-8')

# Runner test contract gets covered in existing source through auto planner package metadata; add direct textual assertions to controller contract.
ct=ROOT/'qa/vibe2-controller-contract.test.mjs'
ctx=ct.read_text(encoding='utf-8')
ctx += r'''

test('central runtime enables functional work packages and adaptive workload telemetry',()=>{
  assert.equal(runtime.workPackages.enabled,true);
  assert.equal(runtime.workPackages.smallTaskAction,'auto-expand-or-defer');
  assert.equal(runtime.workPackages.sharedPreparation,true);
  assert.equal(runtime.workPackages.longWorkSlotProtection,true);
  assert.equal(runtime.workPackages.workloadTelemetry.enabled,true);
  assert.equal(runtime.workPackages.efficiencyAdaptation.neverReduceSafetyOrQa,true);
});
'''
ct.write_text(ctx,encoding='utf-8')

# 7) Update Vibe2 Core QA workflow in working tree, then caller snapshots/reverts it before token push.
wf_path=ROOT/'.github/workflows/vibe2-core-qa.yml'
wf=wf_path.read_text(encoding='utf-8')
wf=wf.replace("      - 'tools/vibe2-auto-planner.mjs'\n", "      - 'tools/vibe2-auto-planner.mjs'\n      - 'tools/vibe2-work-package.mjs'\n")
# second path list occurrence
wf=wf.replace("      - 'tools/vibe2-auto-planner.mjs'\n", "      - 'tools/vibe2-auto-planner.mjs'\n      - 'tools/vibe2-work-package.mjs'\n",1) if wf.count("      - 'tools/vibe2-work-package.mjs'\n")<2 else wf
wf=wf.replace("          node --check tools/vibe2-auto-planner.mjs\n", "          node --check tools/vibe2-auto-planner.mjs\n          node --check tools/vibe2-work-package.mjs\n")
wf=wf.replace("          node --check qa/vibe2-auto-planner.test.mjs\n", "          node --check qa/vibe2-auto-planner.test.mjs\n          node --check qa/vibe2-work-package.test.mjs\n")
wf=wf.replace("          node --test qa/vibe2-auto-planner.test.mjs\n", "          node --test qa/vibe2-auto-planner.test.mjs\n          node --test qa/vibe2-work-package.test.mjs\n")
wf_path.write_text(wf,encoding='utf-8')

print('VIBE2_WORK_PACKAGE_REFACTOR_APPLIED=YES')
