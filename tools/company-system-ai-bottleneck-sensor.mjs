// 파일명: tools/company-system-ai-bottleneck-sensor.mjs
// 역할: System AI 큐/게임 큐의 처리량 병목을 읽기 전용으로 감지하고 다음 예약 파동의 권장 용량과 대표 canary를 계산한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { systemAiImpactProfile } from './company-system-ai-queue.mjs';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const terminal=s=>['done','completed','cancelled','verified','failed'].includes(clean(s).toLowerCase());

function failureSignature(task={}){
  if(clean(task.failureSignature))return clean(task.failureSignature);
  const evidence=(task.evidence||[]).map(clean);
  for(const prefix of ['system-ai-failure-signature:','shared-signature:','system-steward:failure-signature:','failure-cause:']){
    const row=[...evidence].reverse().find(x=>x.startsWith(prefix));
    if(row)return clean(row.slice(prefix.length));
  }
  return null;
}
function reservedAtMs(task={}){
  const value=Date.parse(clean(task.reservedAt)||clean(task.updatedAt));
  return Number.isFinite(value)?value:null;
}
function fileOverlap(a={},b={}){
  const set=new Set((a.responsibleFiles||[]).map(clean));
  return (b.responsibleFiles||[]).map(clean).some(x=>set.has(x));
}
function rankPriority(v=''){
  return({critical:4,high:3,normal:2,low:1})[clean(v).toLowerCase()]||2;
}
function chooseRepresentative(rows=[],impactProfiles=new Map()){
  return [...rows].sort((a,b)=>(impactProfiles.get(b.id)?.score||Number(b.impactScore||0))-(impactProfiles.get(a.id)?.score||Number(a.impactScore||0))
    ||rankPriority(b.priority)-rankPriority(a.priority)
    ||clean(a.createdAt).localeCompare(clean(b.createdAt))
    ||clean(a.id).localeCompare(clean(b.id)))[0]||null;
}


/* ── 게임별 F0~F9 원인 분류: 검증되지 않은 단계는 절대 PASS로 판단하지 않는다. ── */
function developmentFloorSnapshot(developmentQueue={}) {
  const items=Array.isArray(developmentQueue?.items)?developmentQueue.items:[];
  const rows=[];
  for(const item of items){
    if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED'||clean(item.status).toUpperCase()==='DISABLED')continue;
    const gameId=clean(item.gameId),revision=clean(item.robloxSourceCommit),artifact=clean(item.robloxBuildArtifactIdentity);
    const f0=item.robloxFoundationF0Evidence||{},candidate=item.robloxRuntimeCandidateEvidence||{};
    const buildExact=item.robloxBuildOrPackagePassed===true&&item.robloxBuildPreflightPassed===true
      &&revision!==''&&artifact.startsWith('sha256:')&&clean(item.robloxBuildSourceRevision)===revision;
    const f0Exact=buildExact&&item.robloxFoundationF0Passed===true
      &&clean(f0.sourceRevision)===revision&&clean(f0.artifactIdentity)===artifact
      &&Number(f0.artifactRunId||0)>0;
    const candidateExact=f0Exact&&candidate.published===true
      &&clean(candidate.sourceRevision)===revision&&clean(candidate.artifactIdentity)===artifact
      &&Number(candidate.versionNumber||0)>0&&clean(candidate.placeId)!=='';
    const qualityBlocked=f0Exact&&item.robloxQualityBuildUpRequired===true
      &&clean(item.robloxQualityBuildUpSourceRevision)===revision;
    const signature=clean(item.robloxFailureSignature);
    let stage,classification,repair;
    if(!buildExact){
      stage='TARGET_PLATFORM_BUILD_OR_PACKAGE';
      classification=/asset.binding/i.test(signature)?'SOURCE_ASSET_BINDING':'BUILD_OR_SOURCE_IDENTITY_INVALID';
      repair='REPAIR_EXACT_SOURCE_PACKAGE_THEN_REVALIDATE_F0';
    }else if(!f0Exact){
      stage='F0_SOURCE_PREFLIGHT';
      classification='F0_NOT_VERIFIED_FOR_EXACT_PACKAGE';
      repair='RETRY_F0_WITH_EXACT_SOURCE_AND_ARTIFACT';
    }else if(qualityBlocked){
      stage='SOURCE_QUALITY_BUILD_UP';
      classification='QUALITY_GATE_BLOCKS_CANDIDATE_HANDOFF';
      repair='REPAIR_RESPONSIBLE_GAMEPLAY_SOURCE_AND_REVALIDATE';
    }else if(!candidateExact){
      stage='PRIVATE_RUNTIME_CANDIDATE_DEPLOY';
      classification='F0_PASSED_CANDIDATE_NOT_PUBLISHED';
      repair='DISPATCH_EXISTING_PRIVATE_VALIDATION_FOR_EXACT_ARTIFACT';
    }else if(signature==='ROBLOX_OPEN_CLOUD_ENGINE_PROBE_TRANSIENT_FAILURE'){
      stage='TARGET_PLATFORM_RUNTIME_FOUNDATION';
      classification='EXTERNAL_RUNTIME_TRANSIENT';
      repair='RETRY_SAME_CANDIDATE_ENGINE_PROBE_WITH_REAL_EVIDENCE';
    }else{
      stage=clean(item.robloxFailureStage)||'F1_F9_PLATFORM_VERIFICATION';
      classification='RUNTIME_OR_QA_EVIDENCE_REQUIRED';
      repair='RESUME_EXACT_UNVERIFIED_FLOOR';
    }
    const unityEvidence=item.unityF0ThroughF9Evidence||{};
    const unityF9Reported=item.unityF9ReleaseRegressionPassed===true;
    const unityF9Bound=unityF9Reported
      &&/^sha256:[0-9a-f]{64}$/i.test(clean(unityEvidence.artifactIdentity))
      &&/^[0-9a-f]{40}$/i.test(clean(unityEvidence.sourceRevision));
    rows.push({
      gameId,platform:'ROBLOX',stage,failureSignature:signature||null,classification,repair,
      exactBuildCheckpoint:buildExact,exactF0Checkpoint:f0Exact,exactCandidateCheckpoint:candidateExact,
      qualitySourceRepairRequired:qualityBlocked,
      unityF9Reported,unityF9EvidenceIdentityBound:unityF9Bound,
      unityF9IndependentRuntimeReviewRequired:true,
      automaticPassClaim:false
    });
  }
  const cohorts=new Map();
  for(const row of rows){
    if(!row.failureSignature)continue;
    const key=[row.platform,row.stage,row.failureSignature].join('|');
    if(!cohorts.has(key))cohorts.set(key,[]);
    cohorts.get(key).push(row.gameId);
  }
  const commonFailureCohorts=[...cohorts.entries()]
    .filter(([,ids])=>ids.length>=2)
    .map(([key,ids])=>({key,gameIds:ids,representativeGameId:[...ids].sort()[0],size:ids.length,verifiedFixRequiredBeforeCohortReuse:true}))
    .sort((a,b)=>b.size-a.size||a.key.localeCompare(b.key));
  return{
    total:rows.length,exactF0Count:rows.filter(x=>x.exactF0Checkpoint).length,
    f0RepairCount:rows.filter(x=>!x.exactF0Checkpoint).length,
    pendingCandidateCount:rows.filter(x=>x.classification==='F0_PASSED_CANDIDATE_NOT_PUBLISHED').length,
    qualityBlockedCount:rows.filter(x=>x.qualitySourceRepairRequired).length,
    exactCandidateCount:rows.filter(x=>x.exactCandidateCheckpoint).length,
    unityF9ReportedCount:rows.filter(x=>x.unityF9Reported).length,
    unityF9IdentityBoundCount:rows.filter(x=>x.unityF9EvidenceIdentityBound).length,
    rows,commonFailureCohorts
  };
}

export function analyzeSystemAiBottlenecks({
  systemAiQueue={tasks:[]},
  gameQueue={tasks:[]},
  developmentQueue={items:[]},
  maxBatch=32,
  leaseMinutes=30,
  at=Date.now(),
  workflowMetrics={}
}={}){
  const tasks=Array.isArray(systemAiQueue?.tasks)?systemAiQueue.tasks:[];
  const gameTasks=Array.isArray(gameQueue?.tasks)?gameQueue.tasks:[];
  const queued=tasks.filter(t=>clean(t.status).toLowerCase()==='queued');
  const running=tasks.filter(t=>clean(t.status).toLowerCase()==='running');
  const awaiting=tasks.filter(t=>clean(t.status).toLowerCase()==='awaiting-supervisor');
  const impactProfiles=new Map(tasks.map(task=>[clean(task.id),systemAiImpactProfile(task,systemAiQueue,{at})]));
  const leaseMs=Math.max(1,Number(leaseMinutes)||30)*60000;
  const stale=running.filter(t=>{
    const stamp=reservedAtMs(t);
    return !clean(t.reservationId)||(stamp!==null&&at-stamp>=leaseMs);
  });

  const signatureGroups=new Map();
  for(const task of [...queued,...running]){
    const sig=failureSignature(task);
    if(!sig)continue;
    if(!signatureGroups.has(sig))signatureGroups.set(sig,[]);
    signatureGroups.get(sig).push(task);
  }
  const commonFailureCohorts=[...signatureGroups.entries()]
    .filter(([,rows])=>rows.length>=2)
    .map(([signature,rows])=>{
      const runningRepresentativeExists=rows.some(t=>clean(t.status).toLowerCase()==='running');
      const queuedRows=rows.filter(t=>clean(t.status).toLowerCase()==='queued');
      return{
        signature,
        size:rows.length,
        runningRepresentativeExists,
        representativeTaskId:runningRepresentativeExists?null:(chooseRepresentative(queuedRows,impactProfiles)?.id||null),
        maxImpactScore:Math.max(...rows.map(t=>Number(impactProfiles.get(clean(t.id))?.score||0))),
        taskIds:rows.map(t=>clean(t.id)).filter(Boolean)
      };
    })
    .sort((a,b)=>b.size-a.size||a.signature.localeCompare(b.signature));

  const disjointQueued=[];
  for(const task of [...queued].sort((a,b)=>(impactProfiles.get(clean(b.id))?.score||0)-(impactProfiles.get(clean(a.id))?.score||0)
    ||rankPriority(b.priority)-rankPriority(a.priority)
    ||clean(a.createdAt).localeCompare(clean(b.createdAt)))){
    if([...running,...disjointQueued].some(other=>fileOverlap(task,other)))continue;
    disjointQueued.push(task);
  }

  const development=developmentFloorSnapshot(developmentQueue);
  const caretakerBacklog={};
  for(const task of gameTasks){
    if(task?.postReleaseFocused!==true||terminal(task.status))continue;
    const gameId=clean(task.gameId)||'unknown';
    caretakerBacklog[gameId]=(caretakerBacklog[gameId]||0)+1;
  }
  const caretakerHotspots=Object.entries(caretakerBacklog)
    .filter(([,count])=>count>1)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .map(([gameId,count])=>({gameId,count}));

  const reservationWaitMs=Math.max(0,Number(workflowMetrics.reservationWaitMs)||0);
  const fanInWaitMs=Math.max(0,Number(workflowMetrics.fanInWaitMs)||0);
  const supervisorReviewWaitMs=Math.max(0,Number(workflowMetrics.supervisorReviewWaitMs)||0);
  const pendingRuns=Math.max(0,Number(workflowMetrics.pendingRuns)||0);
  const observedRunnerQueuedRuns=Math.max(0,Number(workflowMetrics.runnerQueuedRuns)||0);
  const runnerInProgressRuns=Math.max(0,Number(workflowMetrics.runnerInProgressRuns)||0);
  const observedPrimaryGameQueuedRuns=Math.max(0,Number(workflowMetrics.primaryGameQueuedRuns)||0);
  const joblessOrphanQueuedRuns=Math.min(observedRunnerQueuedRuns,Math.max(0,Number(workflowMetrics.joblessOrphanQueuedRuns)||0));
  const joblessOrphanPrimaryRuns=Math.min(observedPrimaryGameQueuedRuns,Math.max(0,Number(workflowMetrics.joblessOrphanPrimaryRuns)||0));
  const runnerQueuedRuns=Math.max(0,observedRunnerQueuedRuns-joblessOrphanQueuedRuns);
  const primaryGameQueuedRuns=Math.max(0,observedPrimaryGameQueuedRuns-joblessOrphanPrimaryRuns);
  const duplicateWorkflowRuns=Math.max(0,Number(workflowMetrics.duplicateWorkflowRuns)||0);
  const stalePrimaryRuns=Math.max(0,Number(workflowMetrics.stalePrimaryRuns)||0);
  const runnerPressure=primaryGameQueuedRuns>0&&runnerQueuedRuns>=Math.max(4,runnerInProgressRuns*2);

  const configured=Math.max(1,Math.floor(Number(maxBatch)||32));
  const freeCapacity=Math.max(0,configured-running.length);
  const reserveCeiling=runnerPressure?1:configured;
  const recommendedBatch=Math.max(0,Math.min(reserveCeiling,freeCapacity,disjointQueued.length));
  const disjointIds=new Set(disjointQueued.map(t=>clean(t.id)));
  const canaryFirst=commonFailureCohorts
    .map(row=>clean(row.representativeTaskId))
    .filter(id=>id&&disjointIds.has(id));
  const recommendedReserveTaskIds=uniq([
    ...canaryFirst,
    ...disjointQueued.map(t=>clean(t.id))
  ]).slice(0,recommendedBatch);
  const recommendedTargets=recommendedReserveTaskIds.map(id=>{
    const task=tasks.find(t=>clean(t.id)===id)||{};
    const impact=impactProfiles.get(id)||{};
    const cohort=commonFailureCohorts.find(row=>row.representativeTaskId===id)||null;
    return{
      taskId:id,
      priority:clean(task.priority)||'normal',
      impactScore:Number(impact.score||0),
      commonBottleneck:Boolean(impact.commonBottleneck),
      cohortSize:Number(cohort?.size||impact.cohortSize||1),
      failureSignature:clean(cohort?.signature||impact.signature)||null,
      responsibleFiles:uniq(task.responsibleFiles)
    };
  });
  const actions=[];
  if(stale.length)actions.push('RECLAIM_STALE_RESERVATIONS');
  if(development.commonFailureCohorts.length)actions.push('DEVELOPMENT_FLOOR_COMMON_FAILURE_CANARY');
  if(development.pendingCandidateCount)actions.push('RECOVER_VERIFIED_F0_PRIVATE_RUNTIME_HANDOFF');
  if(development.qualityBlockedCount)actions.push('REPAIR_SOURCE_QUALITY_BEFORE_RUNTIME_HANDOFF');
  if(commonFailureCohorts.length)actions.push('REPRESENTATIVE_CANARY_FOR_COMMON_FAILURE');
  if(recommendedBatch>0)actions.push('REFILL_FREE_SYSTEM_AI_CAPACITY');
  if(caretakerHotspots.length)actions.push('PRIORITIZE_PER_GAME_CARETAKER_BACKLOG');
  if(pendingRuns>0)actions.push('REDUCE_SCHEDULER_PENDING_RUN_WAIT');
  if(duplicateWorkflowRuns>0)actions.push('COLLAPSE_EXACT_DUPLICATE_INGRESS');
  if(stalePrimaryRuns>0)actions.push('CANCEL_STALE_PRIMARY_REVISION_INGRESS');
  if(joblessOrphanQueuedRuns>0)actions.push('EXCLUDE_JOBLESS_ORPHAN_FROM_RUNNER_PRESSURE');
  if(runnerPressure)actions.push('PRESERVE_PRIMARY_GAME_RUNNER_CAPACITY');
  if(reservationWaitMs>=60000)actions.push('PRIORITIZE_LONG_WAIT_RUNNABLE_WORK');
  if(fanInWaitMs>=60000)actions.push('REDUCE_FAN_IN_WAIT');
  if(supervisorReviewWaitMs>=60000)actions.push('PRIORITIZE_PRIMARY_AI_SUPERVISOR_REVIEW');
  if(!actions.length)actions.push('NO_CURRENT_BOTTLENECK_ACTION_REQUIRED');

  return{
    version:1,
    kind:'company-system-ai-bottleneck-snapshot',
    observedAt:new Date(at).toISOString(),
    queueDepth:{total:tasks.length,queued:queued.length,running:running.length,awaitingSupervisor:awaiting.length},
    staleReservations:stale.map(t=>({taskId:clean(t.id),reservationId:clean(t.reservationId)||null,reservedAt:clean(t.reservedAt)||null})),
    commonFailureCohorts,
    representativeCanaryTaskIds:uniq(commonFailureCohorts.map(x=>x.representativeTaskId)),
    disjointQueuedTaskIds:disjointQueued.map(t=>clean(t.id)).filter(Boolean),
    caretakerHotspots,
    development,
    workflow:{pendingRuns,reservationWaitMs,fanInWaitMs,supervisorReviewWaitMs,observedRunnerQueuedRuns,runnerQueuedRuns,runnerInProgressRuns,observedPrimaryGameQueuedRuns,primaryGameQueuedRuns,joblessOrphanQueuedRuns,joblessOrphanPrimaryRuns,duplicateWorkflowRuns,stalePrimaryRuns,runnerPressure},
    configuredBatch:configured,
    reserveCeiling,
    freeCapacity,
    recommendedBatch,
    recommendedReserveTaskIds,
    recommendedTargets,
    decisionSummary:{
      representativeCanaryCount:canaryFirst.length,
      highestImpactTaskId:recommendedTargets[0]?.taskId||null,
      highestImpactScore:recommendedTargets[0]?.impactScore||0,
      pendingRuns,
      reservationWaitMs,
      fanInWaitMs,
      supervisorReviewWaitMs,
      observedRunnerQueuedRuns,
      runnerQueuedRuns,
      runnerInProgressRuns,
      observedPrimaryGameQueuedRuns,
      primaryGameQueuedRuns,
      joblessOrphanQueuedRuns,
      joblessOrphanPrimaryRuns,
      duplicateWorkflowRuns,
      stalePrimaryRuns,
      runnerPressure
    },
    actions,
    reserveSharedQueueMutationSerialized:true,
    disjointWorkersMayRunParallel:true,
    authorityExpanded:false
  };
}

function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const at=raw.indexOf('=');if(at<0)out[raw.slice(2)]=true;else out[raw.slice(2,at)]=raw.slice(at+1);}return out;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const a=parseArgs();
  const result=analyzeSystemAiBottlenecks({
    systemAiQueue:readJson(clean(a['system-ai'])||clean(a.queue),{tasks:[]}),
    gameQueue:readJson(clean(a['game-queue']),{tasks:[]}),
    developmentQueue:readJson(clean(a['development-queue']),{items:[]}),
    maxBatch:Number(a.max||32),
    leaseMinutes:Number(a['lease-minutes']||30),
    workflowMetrics:{
      pendingRuns:Number(a['pending-runs']||0),
      reservationWaitMs:Number(a['reservation-wait-ms']||0),
      fanInWaitMs:Number(a['fan-in-wait-ms']||0),
      supervisorReviewWaitMs:Number(a['supervisor-review-wait-ms']||0),
      runnerQueuedRuns:Number(a['runner-queued-runs']||0),
      runnerInProgressRuns:Number(a['runner-in-progress-runs']||0),
      primaryGameQueuedRuns:Number(a['primary-game-queued-runs']||0),
      joblessOrphanQueuedRuns:Number(a['jobless-orphan-queued-runs']||0),
      joblessOrphanPrimaryRuns:Number(a['jobless-orphan-primary-runs']||0),
      duplicateWorkflowRuns:Number(a['duplicate-workflow-runs']||0),
      stalePrimaryRuns:Number(a['stale-primary-runs']||0)
    }
  });
  if(clean(a.output)){fs.mkdirSync(path.dirname(a.output),{recursive:true});fs.writeFileSync(a.output,JSON.stringify(result,null,2)+'\n');}
  console.log('SYSTEM_AI_BOTTLENECK_QUEUE_DEPTH='+result.queueDepth.queued);
  console.log('SYSTEM_AI_DEVELOPMENT_FLOOR_GAMES='+result.development.total);
  console.log('SYSTEM_AI_DEVELOPMENT_F0_EXACT='+result.development.exactF0Count);
  console.log('SYSTEM_AI_DEVELOPMENT_F0_REPAIR_REQUIRED='+result.development.f0RepairCount);
  console.log('SYSTEM_AI_DEVELOPMENT_F0_CANDIDATE_HANDOFF_PENDING='+result.development.pendingCandidateCount);
  console.log('SYSTEM_AI_DEVELOPMENT_QUALITY_GATE_BLOCKED='+result.development.qualityBlockedCount);
  console.log('SYSTEM_AI_DEVELOPMENT_SHARED_FAILURE_COHORTS='+result.development.commonFailureCohorts.length);
  console.log('SYSTEM_AI_BOTTLENECK_STALE_RESERVATIONS='+result.staleReservations.length);
  console.log('SYSTEM_AI_BOTTLENECK_COMMON_FAILURE_COHORTS='+result.commonFailureCohorts.length);
  console.log('SYSTEM_AI_BOTTLENECK_RECOMMENDED_BATCH='+result.recommendedBatch);
  console.log('SYSTEM_AI_BOTTLENECK_RECOMMENDED_TARGETS='+(result.recommendedReserveTaskIds||[]).join(','));
  console.log('SYSTEM_AI_RUNNER_PRESSURE='+(result.workflow.runnerPressure?'YES':'NO'));
  console.log('SYSTEM_AI_RUNNER_QUEUED_RUNS_OBSERVED='+result.workflow.observedRunnerQueuedRuns);
  console.log('SYSTEM_AI_RUNNER_QUEUED_RUNS_EFFECTIVE='+result.workflow.runnerQueuedRuns);
  console.log('SYSTEM_AI_PRIMARY_GAME_QUEUED_RUNS_OBSERVED='+result.workflow.observedPrimaryGameQueuedRuns);
  console.log('SYSTEM_AI_PRIMARY_GAME_QUEUED_RUNS='+result.workflow.primaryGameQueuedRuns);
  console.log('SYSTEM_AI_JOBLESS_ORPHAN_QUEUED_RUNS='+result.workflow.joblessOrphanQueuedRuns);
  console.log('SYSTEM_AI_JOBLESS_ORPHAN_PRIMARY_RUNS='+result.workflow.joblessOrphanPrimaryRuns);
  console.log('SYSTEM_AI_DUPLICATE_WORKFLOW_RUNS='+result.workflow.duplicateWorkflowRuns);
  console.log('SYSTEM_AI_STALE_PRIMARY_RUNS='+result.workflow.stalePrimaryRuns);
  console.log('SYSTEM_AI_BOTTLENECK_ACTIONS='+result.actions.join(','));
}
