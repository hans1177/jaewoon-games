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

export function analyzeSystemAiBottlenecks({
  systemAiQueue={tasks:[]},
  gameQueue={tasks:[]},
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

  const configured=Math.max(1,Math.floor(Number(maxBatch)||32));
  const freeCapacity=Math.max(0,configured-running.length);
  const recommendedBatch=Math.max(0,Math.min(configured,freeCapacity,disjointQueued.length));
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
  const reservationWaitMs=Math.max(0,Number(workflowMetrics.reservationWaitMs)||0);
  const fanInWaitMs=Math.max(0,Number(workflowMetrics.fanInWaitMs)||0);
  const supervisorReviewWaitMs=Math.max(0,Number(workflowMetrics.supervisorReviewWaitMs)||0);
  const pendingRuns=Math.max(0,Number(workflowMetrics.pendingRuns)||0);

  const actions=[];
  if(stale.length)actions.push('RECLAIM_STALE_RESERVATIONS');
  if(commonFailureCohorts.length)actions.push('REPRESENTATIVE_CANARY_FOR_COMMON_FAILURE');
  if(recommendedBatch>0)actions.push('REFILL_FREE_SYSTEM_AI_CAPACITY');
  if(caretakerHotspots.length)actions.push('PRIORITIZE_PER_GAME_CARETAKER_BACKLOG');
  if(pendingRuns>0)actions.push('REDUCE_SCHEDULER_PENDING_RUN_WAIT');
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
    workflow:{pendingRuns,reservationWaitMs,fanInWaitMs,supervisorReviewWaitMs},
    configuredBatch:configured,
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
      supervisorReviewWaitMs
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
    maxBatch:Number(a.max||32),
    leaseMinutes:Number(a['lease-minutes']||30),
    workflowMetrics:{pendingRuns:Number(a['pending-runs']||0),reservationWaitMs:Number(a['reservation-wait-ms']||0),fanInWaitMs:Number(a['fan-in-wait-ms']||0),supervisorReviewWaitMs:Number(a['supervisor-review-wait-ms']||0)}
  });
  if(clean(a.output)){fs.mkdirSync(path.dirname(a.output),{recursive:true});fs.writeFileSync(a.output,JSON.stringify(result,null,2)+'\n');}
  console.log('SYSTEM_AI_BOTTLENECK_QUEUE_DEPTH='+result.queueDepth.queued);
  console.log('SYSTEM_AI_BOTTLENECK_STALE_RESERVATIONS='+result.staleReservations.length);
  console.log('SYSTEM_AI_BOTTLENECK_COMMON_FAILURE_COHORTS='+result.commonFailureCohorts.length);
  console.log('SYSTEM_AI_BOTTLENECK_RECOMMENDED_BATCH='+result.recommendedBatch);
  console.log('SYSTEM_AI_BOTTLENECK_RECOMMENDED_TARGETS='+(result.recommendedReserveTaskIds||[]).join(','));
  console.log('SYSTEM_AI_BOTTLENECK_ACTIONS='+result.actions.join(','));
}
