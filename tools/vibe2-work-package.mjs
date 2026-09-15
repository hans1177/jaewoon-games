// 파일명: tools/vibe2-work-package.mjs
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
  const maxMin=clampInt(base.efficiencyAdaptation?.maxMinWorkUnitsPerPackage||base.adaptiveMinMax||6,baseMin,8);
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
