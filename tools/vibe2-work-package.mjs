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
  minRelatedImprovementsPerPackage:3,
  targetWorkUnitsPerCycle:12,
  targetPackagesPerCycle:4,
  targetFeaturePackagesPerCycle:1,
  maxPackagesPerCycle:null,
  maxTasksPerPackage:null,
  adaptiveMinMax:6,
  maxAdaptiveBoost:3,
  lowEfficiencyMicroTaskRatePct:35,
  lowEfficiencyReworkRatePct:20,
  lowEfficiencyPreparationRatioPct:45,
  lowEfficiencyQaDuplicateRatePct:25,
  lowEfficiencyStreakThreshold:2,
  longWorkUnits:5,
  longWorkProtectedSlots:1,
  explorationRequired:true,
  roleSeparation:true
});

function evidenceValues(task={},prefix=''){
  return (Array.isArray(task.evidence)?task.evidence:[])
    .map(clean)
    .filter(value=>value.startsWith(prefix))
    .map(value=>value.slice(prefix.length))
    .filter(Boolean);
}
function evidenceNumber(task={},prefix=''){
  const values=evidenceValues(task,prefix).map(Number).filter(Number.isFinite);
  return values.length?values.reduce((a,b)=>a+b,0):0;
}
function evidenceMetricKnown(task={},prefix=''){
  return (Array.isArray(task.evidence)?task.evidence:[]).some(value=>clean(value).startsWith(prefix));
}
export function relatedImprovementScopes(tasks=[]){
  return unique((tasks||[]).flatMap(task=>evidenceValues(task,'work-package-scope:')));
}

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

function packageHistory(queue={}){
  const tasks=Array.isArray(queue?.tasks)?queue.tasks:[];
  const packages=new Map();
  tasks.forEach((task,index)=>{
    const id=clean(task.packageId);
    if(!id)return;
    if(!packages.has(id))packages.set(id,{id,firstIndex:index,tasks:[]});
    packages.get(id).tasks.push(task);
  });
  return [...packages.values()].sort((a,b)=>a.firstIndex-b.firstIndex);
}
function summarizePackage(row,policy=DEFAULT_WORK_PACKAGE_POLICY){
  const tasks=row.tasks||[];
  const taskUnits=tasks.map(estimateTaskWorkUnits);
  const scopes=relatedImprovementScopes(tasks);
  const retries=tasks.reduce((n,t)=>n+Math.max(0,Number(t.retries||0)),0);
  const qaHashes=unique(tasks.flatMap(t=>evidenceValues(t,'incremental-qa-hash:')));
  const qaRuns=tasks.reduce((n,t)=>n+evidenceValues(t,'incremental-qa-hash:').length,0);
  const changedFiles=tasks.reduce((n,t)=>n+evidenceNumber(t,'workload:changed-files:'),0);
  const changedLines=tasks.reduce((n,t)=>n+evidenceNumber(t,'workload:changed-lines:'),0);
  const prepMs=tasks.reduce((n,t)=>n+evidenceNumber(t,'workload:prep-ms:'),0);
  const cycleMs=Math.max(0,...tasks.map(t=>evidenceNumber(t,'workload:cycle-ms:')));
  const changeMetricsKnown=tasks.some(t=>evidenceMetricKnown(t,'workload:changed-files:'));
  const timingKnown=tasks.some(t=>evidenceMetricKnown(t,'workload:cycle-ms:'));
  const qaDuplicateRatePct=qaRuns?round(Math.max(0,qaRuns-qaHashes.length)/qaRuns*100):0;
  const preparationRatioPct=cycleMs?round(prepMs/cycleMs*100):0;
  const plannedUnits=Math.max(
    0,
    ...tasks.map(t=>Number(t.packageWorkUnits||0)),
    taskUnits.reduce((a,b)=>a+b,0)+scopes.length
  );
  const done=tasks.length>0&&tasks.every(t=>clean(t.status)==='done');
  const failed=tasks.some(t=>clean(t.status)==='failed');
  const lowEfficiency=done&&(
    retries>0 ||
    (changeMetricsKnown&&changedFiles<=0) ||
    (timingKnown&&preparationRatioPct>Number(policy.lowEfficiencyPreparationRatioPct||45)) ||
    qaDuplicateRatePct>Number(policy.lowEfficiencyQaDuplicateRatePct||25)
  );
  return{
    id:row.id,
    taskCount:tasks.length,
    done,
    failed,
    retries,
    taskUnits,
    plannedUnits,
    relatedImprovementCount:scopes.length,
    changedFiles,
    changedLines,
    changeMetricsKnown,
    prepMs,
    cycleMs,
    timingKnown,
    qaRuns,
    qaUniqueRuns:qaHashes.length,
    qaDuplicateRatePct,
    preparationRatioPct,
    lowEfficiency
  };
}

export function computeWorkPackageEfficiency(queue={},policyInput={}){
  const policy={...DEFAULT_WORK_PACKAGE_POLICY,...(policyInput||{})};
  const tasks=Array.isArray(queue?.tasks)?queue.tasks:[];
  const packaged=tasks.filter(t=>clean(t.packageId));
  const packageRows=packageHistory(queue).map(row=>summarizePackage(row,policy));
  const completedPackageCount=packageRows.filter(row=>row.done).length;
  const failedPackageCount=packageRows.filter(row=>row.failed).length;
  const taskUnits=packaged.map(estimateTaskWorkUnits);
  const microTaskCount=taskUnits.filter(v=>v<=1).length;
  const reworkedTaskCount=packaged.filter(t=>Number(t.retries||0)>0).length;
  const microTaskRatePct=packaged.length?round(microTaskCount/packaged.length*100):0;
  const reworkRatePct=packaged.length?round(reworkedTaskCount/packaged.length*100):0;
  const avgTaskWorkUnits=taskUnits.length?round(taskUnits.reduce((a,b)=>a+b,0)/taskUnits.length):0;
  const avgPackageWorkUnits=packageRows.length?round(packageRows.reduce((n,row)=>n+row.plannedUnits,0)/packageRows.length):0;
  const changedFileCount=packageRows.reduce((n,row)=>n+row.changedFiles,0);
  const changedLineCount=packageRows.reduce((n,row)=>n+row.changedLines,0);
  const qaRunCount=packageRows.reduce((n,row)=>n+row.qaRuns,0);
  const qaUniqueRunCount=packageRows.reduce((n,row)=>n+row.qaUniqueRuns,0);
  const qaDuplicateRatePct=qaRunCount?round(Math.max(0,qaRunCount-qaUniqueRunCount)/qaRunCount*100):0;
  const totalPrepMs=packageRows.reduce((n,row)=>n+row.prepMs,0);
  const totalCycleMs=packageRows.reduce((n,row)=>n+row.cycleMs,0);
  const preparationRatioPct=totalCycleMs?round(totalPrepMs/totalCycleMs*100):0;
  const completedCycleTimes=packageRows.filter(row=>row.done&&row.cycleMs>0).map(row=>row.cycleMs);
  const averagePackageCycleTimeMs=completedCycleTimes.length?round(completedCycleTimes.reduce((a,b)=>a+b,0)/completedCycleTimes.length):0;
  let lowEfficiencyStreak=0;
  for(let i=packageRows.length-1;i>=0;i--){
    const row=packageRows[i];
    if(!row.done)continue;
    if(!row.lowEfficiency)break;
    lowEfficiencyStreak+=1;
  }
  const lowEfficiencyDetected=packaged.length>=4&&(
    microTaskRatePct>Number(policy.lowEfficiencyMicroTaskRatePct||35) ||
    reworkRatePct>Number(policy.lowEfficiencyReworkRatePct||20) ||
    avgTaskWorkUnits<1.75 ||
    preparationRatioPct>Number(policy.lowEfficiencyPreparationRatioPct||45) ||
    qaDuplicateRatePct>Number(policy.lowEfficiencyQaDuplicateRatePct||25) ||
    lowEfficiencyStreak>=Number(policy.lowEfficiencyStreakThreshold||2)
  );
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
    changedFileCount,
    changedLineCount,
    qaRunCount,
    qaUniqueRunCount,
    qaDuplicateRatePct,
    preparationRatioPct,
    averagePackageCycleTimeMs,
    lowEfficiencyStreak,
    lowEfficiencyDetected
  };
}

export function resolveWorkPackagePolicy(runtimePolicy={},queue={}){
  const base={...DEFAULT_WORK_PACKAGE_POLICY,...(runtimePolicy||{})};
  const efficiency=computeWorkPackageEfficiency(queue,base);
  const baseMin=clampInt(base.minWorkUnitsPerPackage||3,2,6);
  const maxMin=clampInt(base.efficiencyAdaptation?.maxMinWorkUnitsPerPackage||base.adaptiveMinMax||6,baseMin,8);
  const streakThreshold=clampInt(base.lowEfficiencyStreakThreshold||2,1,5);
  const maxBoost=clampInt(base.maxAdaptiveBoost||3,1,4);
  let adaptiveBoost=0;
  if(base.efficiencyAdaptation?.enabled!==false){
    if(efficiency.lowEfficiencyStreak>=streakThreshold)adaptiveBoost=Math.min(maxBoost,efficiency.lowEfficiencyStreak-streakThreshold+1);
    else if(efficiency.lowEfficiencyDetected)adaptiveBoost=1;
  }
  return{
    ...base,
    minWorkUnitsPerPackage:Math.min(maxMin,baseMin+adaptiveBoost),
    minTasksPerPackage:clampInt(base.minTasksPerPackage||2,1,5),
    substantialSingleTaskWorkUnits:clampInt(base.substantialSingleTaskWorkUnits||3,2,8),
    minRelatedImprovementsPerPackage:clampInt(base.minRelatedImprovementsPerPackage||3,2,6),
    targetWorkUnitsPerCycle:clampInt(base.targetWorkUnitsPerCycle||12,3,100),
    targetPackagesPerCycle:clampInt(base.targetPackagesPerCycle||4,1,10),
    targetFeaturePackagesPerCycle:clampInt(base.targetFeaturePackagesPerCycle||1,1,10),
    maxPackagesPerCycle:null,
    maxTasksPerPackage:null,
    longWorkUnits:clampInt(base.longWorkUnits||5,3,12),
    longWorkProtectedSlots:clampInt(base.longWorkProtectedSlots||1,1,3),
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
  const scopes=relatedImprovementScopes(list);
  const baseTaskWorkUnits=taskUnits.reduce((a,b)=>a+b,0);
  const packageWorkUnits=baseTaskWorkUnits+scopes.length;
  const substantial=taskUnits.some(v=>v>=Number(resolved.substantialSingleTaskWorkUnits||3));
  const owner=list.some(t=>t.ownerDirective===true);
  const relatedImprovementGoalMet=scopes.length>=Number(resolved.minRelatedImprovementsPerPackage||3);
  const multiTaskGoalMet=list.length>=Number(resolved.minTasksPerPackage||2);
  const minimumWorkloadMet=packageWorkUnits>=Number(resolved.minWorkUnitsPerPackage||3);
  const quantityGoal=owner||substantial?'FEATURE_COMPLETION':relatedImprovementGoalMet?'RELATED_IMPROVEMENTS':multiTaskGoalMet?'MULTI_TASK_FEATURE':null;
  const accepted=list.length>0&&minimumWorkloadMet&&Boolean(quantityGoal);
  const gameId=clean(project.gameId||list[0]?.gameId)||'global';
  const sourceRoot=posix(project.projectPath||list[0]?.sourceRoot);
  const fingerprint=list.map(t=>clean(t.id)).join('|');
  const packageId=`${gameId}-wp-${hashText(fingerprint||`${gameId}-${sequence}`)}`;
  const responsibleFiles=unique(list.flatMap(t=>t.responsibleFiles||[]));
  const diagnosticEvidence=unique(list.flatMap(t=>t.evidence||[]).filter(x=>/^diagnostic:|^repair-mode:|^maintenance-file:/.test(clean(x))));
  const studioContracts=list.map(t=>t?.studioQualityEvolution).filter(value=>value&&typeof value==='object');
  const studioQualityEvolution=studioContracts[0]?Object.freeze({...studioContracts[0]}):null;
  const completionCriteria=unique(resolved.completionCriteria||[
    'exploration-handoff-produced-and-reused',
    'functional-scope-implemented',
    'all-package-task-incremental-qa-pass',
    'performance-sanity-pass',
    'full-core-regression-once-at-fan-in',
    'fan-in-package-review-pass',
    'machine-contract-and-central-doc-synced-when-architecture-changes'
  ]);
  if(scopes.length)completionCriteria.push(`related-improvement-scopes-verified:${scopes.length}`);
  if(studioQualityEvolution){
    completionCriteria.push(
      'studio-quality-baseline-or-explicit-gap-evidence',
      'studio-quality-focus-implemented',
      'verified-quality-gap-closure-or-delta',
      'no-protected-semantics-regression',
      'next-studio-build-cycle-remains-live'
    );
  }
  const studioGoal=studioQualityEvolution
    ?` 단계=${clean(studioQualityEvolution.phase)||'BUILD_UP'}, 품질축=${clean(studioQualityEvolution.focusPillar)||'STABILITY'}, 기준선=${clean(studioQualityEvolution.baselineId)||'CURRENT_VERIFIED_BASELINE'}.`
    :'';
  const packageGoal=`${clean(project.name)||gameId}: 관련 구현·품질 개선을 기능 단위로 묶어 끝까지 완료한다.${studioGoal}`;
  const packageContext={
    explorationMode:clean(resolved.explorationMode)||'dedicated-exploration-worker-handoff',
    explorationRequired:resolved.explorationRequired!==false,
    sharedPreparation:resolved.sharedPreparation!==false,
    sourceRoot,
    responsibleFiles,
    diagnosticEvidence,
    roles:{
      owner:'work-package-owner',
      exploration:'read-only-exploration-worker',
      implementation:'parallel-implementation-workers',
      test:'incremental-qa-worker',
      performance:'performance-sanity-worker',
      regression:'single-fan-in-regression-worker',
      review:'fan-in-package-review-worker'
    },
    studioQualityEvolution
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
    studioQualityEvolution:task?.studioQualityEvolution||studioQualityEvolution,
    completionCriteria,
    evidence:unique([
      ...(task.evidence||[]),
      `work-package:${packageId}`,
      `task-work-units:${taskUnits[index]}`,
      `package-work-units:${packageWorkUnits}`,
      `package-related-improvements:${scopes.length}`,
      'package-role-separation:exploration|implementation|test|performance|regression|review',
      studioQualityEvolution&&'studio-quality-loop:v1',
      studioQualityEvolution&&`studio-quality-phase:${clean(studioQualityEvolution.phase)||'BUILD_UP'}`,
      studioQualityEvolution&&`studio-quality-focus:${clean(studioQualityEvolution.focusPillar)||'STABILITY'}`,
      studioQualityEvolution&&`studio-quality-baseline:${clean(studioQualityEvolution.baselineId)||'CURRENT_VERIFIED_BASELINE'}`,
      studioQualityEvolution&&'studio-quality-next-cycle-required:YES',
      quantityGoal&&`package-quantity-goal:${quantityGoal}`
    ].filter(Boolean))
  }));
  return{
    accepted,
    packageId,
    packageGoal,
    packageWorkUnits,
    baseTaskWorkUnits,
    relatedImprovementCount:scopes.length,
    relatedImprovementScopes:scopes,
    taskCount:list.length,
    substantial,
    owner,
    quantityGoal,
    minimumWorkloadMet,
    completionCriteria,
    packageContext,
    studioQualityEvolution,
    tasks:decorated,
    rejectionReason:accepted?null:minimumWorkloadMet?'CYCLE_QUANTITY_GOAL':'MINIMUM_WORKLOAD_GATE'
  };
}

export function computeWorkloadTelemetry(queue={},plannedPackages=[]){
  const efficiency=computeWorkPackageEfficiency(queue);
  const packages=(plannedPackages||[]).filter(Boolean);
  const plannedWorkUnits=packages.reduce((n,p)=>n+Number(p.packageWorkUnits||0),0);
  const plannedTaskCount=packages.reduce((n,p)=>n+Number(p.taskCount||p.tasks?.length||0),0);
  const plannedRelatedImprovementCount=packages.reduce((n,p)=>n+Number(p.relatedImprovementCount||0),0);
  const plannedFeaturePackageCount=packages.filter(p=>['FEATURE_COMPLETION','MULTI_TASK_FEATURE'].includes(clean(p.quantityGoal))).length;
  return{
    version:3,
    plannedPackageCount:packages.length,
    plannedTaskCount,
    plannedWorkUnits,
    plannedFeaturePackageCount,
    plannedRelatedImprovementCount,
    averagePlannedWorkUnitsPerPackage:packages.length?round(plannedWorkUnits/packages.length):0,
    completedFeaturePackageCount:efficiency.completedPackageCount,
    failedFeaturePackageCount:efficiency.failedPackageCount,
    actualChangedFileCount:efficiency.changedFileCount,
    actualChangedLineCount:efficiency.changedLineCount,
    historicalPackageCount:efficiency.packageCount,
    historicalMicroTaskRatePct:efficiency.microTaskRatePct,
    historicalReworkRatePct:efficiency.reworkRatePct,
    historicalQaDuplicateRatePct:efficiency.qaDuplicateRatePct,
    historicalPreparationRatioPct:efficiency.preparationRatioPct,
    averagePackageCycleTimeMs:efficiency.averagePackageCycleTimeMs,
    historicalAvgTaskWorkUnits:efficiency.avgTaskWorkUnits,
    historicalAvgPackageWorkUnits:efficiency.avgPackageWorkUnits,
    lowEfficiencyStreak:efficiency.lowEfficiencyStreak,
    lowEfficiencyDetected:efficiency.lowEfficiencyDetected,
    roleSeparated:true,
    explorationReusable:true,
    longWorkProtectedSlots:1,
    qaMode:'incremental-per-task-plus-single-full-fan-in-regression',
    duplicateFullRegressionExpected:false
  };
}
