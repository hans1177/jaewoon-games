from pathlib import Path

ROOT = Path('.')

# Apply after vibe2-work-package-refactor-temp.py.
# Keep sequential dependency chains as one expanded functional package task;
# only already-bundled independent diagnostics/maintenance stay multi-item internally.

wp_path = ROOT / 'tools/vibe2-work-package.mjs'
wp = wp_path.read_text(encoding='utf-8')
wp = wp.replace(
    "const maxMin=clampInt(base.adaptiveMinMax||6,baseMin,8);",
    "const maxMin=clampInt(base.efficiencyAdaptation?.maxMinWorkUnitsPerPackage||base.adaptiveMinMax||6,baseMin,8);",
)
wp_path.write_text(wp, encoding='utf-8')

planner_path = ROOT / 'tools/vibe2-auto-planner.mjs'
planner = planner_path.read_text(encoding='utf-8')
planner = planner.replace(
    "import { buildWorkPackage, computeWorkloadTelemetry, resolveWorkPackagePolicy } from './vibe2-work-package.mjs';",
    "import { buildWorkPackage, computeWorkloadTelemetry, estimateTaskWorkUnits, resolveWorkPackagePolicy } from './vibe2-work-package.mjs';",
)

marker = "function findSafeTask(project,repoRoot,queue)"
helper = r'''function expandTaskToMinimumWorkload(taskInput,project,policy){
  if(!taskInput)return null;
  const min=Math.max(2,Number(policy?.minWorkUnitsPerPackage||3));
  const current=estimateTaskWorkUnits(taskInput);
  if(taskInput.ownerDirective===true||current>=min)return taskInput;
  const isWeb=project?.engine==='web';
  const expansion=isWeb
    ? '같은 책임 파일 범위 안에서 이 기능의 오류 처리와 회귀 안전성을 보강하고, 직접 관련된 접근성·가독성·모바일 입력·기본 성능 문제도 함께 점검해 발견 시 같이 수정한다. 관련 incremental QA까지 통과시킨다.'
    : '같은 책임 파일 범위 안에서 이 기능의 불변조건·오류 처리·회귀 안전성을 함께 보강하고 관련 incremental QA까지 통과시킨다.';
  const evidence=[...(taskInput.evidence||[]),'work-package-auto-expanded','work-package-expansion:qa-hardening'];
  if(isWeb)evidence.push('work-package-expansion:ux-readability','work-package-expansion:performance-sanity');
  return{
    ...taskInput,
    workUnits:min,
    goal:`${taskInput.goal}\n\n[WORK PACKAGE AUTO-EXPANSION]\n${expansion}`,
    evidence:[...new Set(evidence)]
  };
}

'''
if helper not in planner:
    planner = planner.replace(marker, helper + marker, 1)

start = planner.index("export function planVibe2AutonomousTasks(")
end = planner.index("export function planVibe2AutonomousTask(args={})", start)
new_plan = r'''export function planVibe2AutonomousTasks({status={},catalog={},queue:queueInput={},repoRoot=process.cwd(),maxConcurrentTasks=DEFAULT_MAX_CONCURRENT_TASKS,workPackagePolicy={}}={}){
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
    let next=findSafeTask(project,repoRoot,queue);
    if(!next)continue;
    if(plannerConflict(queue,next))continue;
    next=expandTaskToMinimumWorkload(next,project,policy);
    sequence+=1;
    const pkg=buildWorkPackage({tasks:[next],project,sequence,policy});
    if(!pkg.accepted){
      deferredSmallPackages.push({gameId:project.gameId,taskIds:[next.id],workUnits:pkg.packageWorkUnits,reason:pkg.rejectionReason});
      continue;
    }
    const acceptedTask=pkg.tasks[0];
    queue=createVibeContinuousQueue({tasks:[...queue.tasks,acceptedTask],maxConcurrentTasks:queue.maxConcurrentTasks});
    planned.push(acceptedTask);
    packages.push({...pkg,tasks:[acceptedTask]});
    if(project.engine==='unity'&&project.releaseState==='release-confirmed')unityReleaseFocusTaken=true;
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
planner = planner[:start] + new_plan + planner[end:]
planner_path.write_text(planner, encoding='utf-8')

# Larger package is a tie-breaker inside the same safety/project tier, not an override of owner/release priority.
queue_path = ROOT / 'assets/vibe-continuous-queue.js'
queue = queue_path.read_text(encoding='utf-8')
queue = queue.replace(
    "+ Math.min(30, Number(task.packageWorkUnits || task.taskWorkUnits || 0) * 3)\n    + (task.packageLongWorkProtected ? 12 : 0)",
    "+ Math.min(6, Number(task.packageWorkUnits || task.taskWorkUnits || 0))\n    + (task.packageLongWorkProtected ? 3 : 0)",
)
queue_path.write_text(queue, encoding='utf-8')

# Update one legacy diagnostic progression assertion: a completed bundle may have consumed
# all currently related diagnostics, but it must never re-plan the same diagnostic keys.
test_path = ROOT / 'qa/vibe2-auto-planner.test.mjs'
test = test_path.read_text(encoding='utf-8')
old = """  const second=planVibe2AutonomousTask({status,catalog,queue:completed,repoRoot:root});\n  assert.equal(second.planned,true);\n  assert.notEqual(second.task.id,first.task.id);\n  assert.equal(second.task.evidence.some(x=>x.startsWith('diagnostic:')),true);\n  assert.equal(second.task.evidence.some(x=>x.startsWith('diagnostic-key:')),true);\n"""
new = """  const second=planVibe2AutonomousTask({status,catalog,queue:completed,repoRoot:root});\n  if(second.planned){\n    assert.notEqual(second.task.id,first.task.id);\n    const firstKeys=new Set(first.task.evidence.filter(x=>x.startsWith('diagnostic-key:')));\n    const secondKeys=second.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));\n    assert.equal(secondKeys.some(x=>firstKeys.has(x)),false);\n  }else{\n    assert.equal(second.reason,'NO_SAFE_AUTONOMOUS_TASK');\n  }\n"""
if old in test:
    test = test.replace(old, new, 1)

test_path.write_text(test, encoding='utf-8')

print('VIBE2_WORK_PACKAGE_DEPENDENCY_SAFE_FIX=YES')
