// 파일명: tools/vibe2-system-steward.mjs
// 역할: 24H 개발 시스템의 자잘한 마찰과 관문 전 병목을 causal scope 단위로 자동 복구한다.
// 원칙: 게임 의도/관문은 변경하지 않고 큐, lease, retry 묘지, stale 병렬 상태만 보수한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, EXTERNAL_MATRIX_BATCH_MAX } from '../assets/vibe-continuous-queue.js';
import { createParallelismControl, DEFAULT_ADAPTIVE_TARGET, DEFAULT_TELEMETRY_TTL_MS, ADAPTIVE_PARALLELISM_STEPS } from './vibe2-adaptive-backpressure.mjs';
import { injectSelfArchitectureEvolutionTasks } from './vibe2-self-architecture-evolution.mjs';

const clean=v=>String(v??'').trim();
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const parseArgs=(argv=process.argv.slice(2))=>Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
const safeTask=t=>t?.requiresOwnerDecision!==true&&t?.protectedChange!==true&&t?.paidResourceRequired!==true;
const activeStatus=s=>['queued','running'].includes(clean(s).toLowerCase());
createVibeContinuousQueue,EXTRACTION_MODE,UNLIMITED_CAUSAL_REPAIR
const failureSignature=t=>clean(t?.blocker)||clean(t?.lastOutcome)||'causal-repair-required';
const ADAPTIVE_STEPS=new Set(ADAPTIVE_PARALLELISM_STEPS.filter(step=>step>=DEFAULT_ADAPTIVE_TARGET));
const staleMachineBlocker=v=>/^MACHINE_STATE_INCONSISTENT:.*(?:PARALLELISM_VERSION_MISMATCH|QUEUE_MAX_DIVERGED|PERSISTENT_MAX_OUTSIDE_STEPS|PERSISTENT_MAX_ABOVE_CONFIGURED)/i.test(clean(v));
const rawMachineStateHealthy=({queueInput={},controlInput={}}={})=>
  Number(queueInput?.maxConcurrentTasks)===EXTERNAL_MATRIX_BATCH_MAX&&
  Number(controlInput?.version)===3&&
  ADAPTIVE_STEPS.has(Number(controlInput?.currentMax));
const clearReservation=task=>({...task,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null});

function staleRunningIds(queue,{nowMs=Date.now(),staleMs=45*60*1000}={}){
  return new Set(queue.tasks.filter(task=>{
    if(clean(task.status).toLowerCase()!=='running'||waitBlocker(task.blocker))return false;
    const at=Date.parse(clean(task.reservedAt));
    return !Number.isFinite(at)||nowMs-at>Math.max(60_000,Number(staleMs)||45*60*1000);
  }).map(task=>task.id));
}
function unlimitedCausalRepairTasks(queue){
  return queue.tasks.filter(task=>clean(task.status).toLowerCase()==='failed'
    &&clean(task.retryPolicy).toUpperCase()==='UNLIMITED_CAUSAL_REPAIR'
    &&clean(task.department).toLowerCase()==='development'
    &&clean(task.type||'implementation').toLowerCase()==='implementation'
    &&safeTask(task));
}

export function runSystemStewardState({queueInput={},controlInput={},neuralExpansionReadiness={},now=new Date().toISOString(),staleRunningMs=45*60*1000,telemetryTtlMs=DEFAULT_TELEMETRY_TTL_MS}={}){
  let queue=createVibeContinuousQueue(queueInput);
  let control=createParallelismControl(controlInput);
  const nowMs=Date.parse(now)||Date.now(),actions=[],taskIds=[];
  const rawControlVersionHealthy=Number(controlInput?.version||3)===3;
  const rawControlStepHealthy=ADAPTIVE_STEPS.has(Number(controlInput?.currentMax));
  const machineRepairActions=[];

  if(rawControlVersionHealthy&&!rawControlStepHealthy){
    control=createParallelismControl({
      currentMax:DEFAULT_ADAPTIVE_TARGET,
      healthyStreak:0,
      pressureStreak:0,
      lastDecision:'RESET',
      lastReason:`SYSTEM_STEWARD_INVALID_V3_PARALLELISM_STEP_RESET_TO_${DEFAULT_ADAPTIVE_TARGET}`,
      lastRunId:null,
      lastUpdatedAt:now,
      lastTelemetry:null
    });
    machineRepairActions.push('RESET_INVALID_PARALLELISM_STATE');
  }
  if(queue.maxConcurrentTasks!==EXTERNAL_MATRIX_BATCH_MAX){
    queue=createVibeContinuousQueue({maxConcurrentTasks:EXTERNAL_MATRIX_BATCH_MAX,tasks:queue.tasks});
    machineRepairActions.push('ALIGN_QUEUE_EXTERNAL_BOUNDARY_256');
  }

  const repairedMachineStateHealthy=
    Number(queue.maxConcurrentTasks)===EXTERNAL_MATRIX_BATCH_MAX&&
    rawControlVersionHealthy&&
    ADAPTIVE_STEPS.has(Number(control.currentMax));

  const staleMachineIds=new Set(
    repairedMachineStateHealthy
      ? queue.tasks.filter(task=>clean(task.status).toLowerCase()==='blocked'&&safeTask(task)&&staleMachineBlocker(task.blocker)).map(task=>task.id)
      : []
  );
  if(staleMachineIds.size){
    queue=createVibeContinuousQueue({maxConcurrentTasks:queue.maxConcurrentTasks,tasks:queue.tasks.map(row=>staleMachineIds.has(row.id)?{
      ...clearReservation(row),status:'queued',blocker:null,lastOutcome:'SYSTEM_STEWARD_STALE_MACHINE_BLOCKER_RECOVERED',
      evidence:uniq([...(row.evidence||[]),'system-steward:stale-machine-state-blocker-recovered','system-steward:machine-state-revalidated:v3-external-boundary-256'])
    }:row)});
    actions.push('RECOVER_STALE_MACHINE_STATE_BLOCKER'); taskIds.push(...staleMachineIds);
  }

  const staleIds=staleRunningIds(queue,{nowMs,staleMs:staleRunningMs});
  if(staleIds.size){
    queue=createVibeContinuousQueue({maxConcurrentTasks:queue.maxConcurrentTasks,tasks:queue.tasks.map(row=>staleIds.has(row.id)?{
      ...clearReservation(row),status:'queued',blocker:null,lastOutcome:'SYSTEM_STEWARD_STALE_LEASE_RECOVERED',
      evidence:uniq([...(row.evidence||[]),'system-steward:stale-running-reservation-recovered'])
    }:row)});
    actions.push('RECOVER_STALE_RUNNING_RESERVATION'); taskIds.push(...staleIds);
  }

  const causalRepair=unlimitedCausalRepairTasks(queue);
  if(causalRepair.length){
    const ids=new Set(causalRepair.map(task=>task.id)),signatures=uniq(causalRepair.map(failureSignature));
    queue=createVibeContinuousQueue({maxConcurrentTasks:queue.maxConcurrentTasks,tasks:queue.tasks.map(row=>{
      if(!ids.has(row.id))return row;
      const generation=Math.max(0,Number(row.recoveryGeneration||0))+1,signature=failureSignature(row);
      return {...clearReservation(row),status:'queued',blocker:null,lastOutcome:'SYSTEM_STEWARD_UNLIMITED_CAUSAL_REPAIR_RESUMED',
        recoveryGeneration:generation,
        evidence:uniq([...(row.evidence||[]),`system-steward:unlimited-causal-repair:resume:generation-${generation}`,'repair-mode:UNLIMITED_CAUSAL_REPAIR',`system-steward:failure-signature:${signature}`,'system-steward:fix-pattern:causal-repair-without-attempt-ceiling'])};
    })});
    actions.push('RESUME_UNLIMITED_CAUSAL_REPAIR'); taskIds.push(...ids);
    if(signatures.length)actions.push('PERSIST_REPEATED_FAILURE_SIGNATURE_SCOPE');
  }

  const lastAt=Date.parse(clean(control.lastUpdatedAt));
  if(Number.isFinite(lastAt)&&nowMs-lastAt>Math.max(60_000,Number(telemetryTtlMs)||DEFAULT_TELEMETRY_TTL_MS)){
    control=createParallelismControl({currentMax:DEFAULT_ADAPTIVE_TARGET,healthyStreak:0,pressureStreak:0,lastDecision:'RESET',lastReason:`SYSTEM_STEWARD_STALE_TELEMETRY_RESET_TO_${DEFAULT_ADAPTIVE_TARGET}`,lastRunId:null,lastUpdatedAt:now,lastTelemetry:null});
    actions.push('RESET_STALE_PARALLELISM_PRESSURE');
  }
  actions.push(...machineRepairActions);

  const evolution=injectSelfArchitectureEvolutionTasks(queue,{...control,neuralExpansionReadiness});
  if(evolution.changed){
    queue=evolution.queue;
    actions.push('ENQUEUE_SELF_ARCHITECTURE_EVOLUTION');
    taskIds.push(...evolution.added.map(task=>task.id));
  }

  const active=queue.tasks.filter(t=>activeStatus(t.status)&&!waitBlocker(t.blocker));
  const action=actions[0]||(active.length?'HEALTHY_NO_SCOPED_REPAIR':'NO_RUNNABLE_WORK_FOR_PLANNER_REFILL');
  return {action,actions:uniq(actions),
    changedQueue:actions.some(x=>['RECOVER_STALE_MACHINE_STATE_BLOCKER','RECOVER_STALE_RUNNING_RESERVATION','RESUME_UNLIMITED_CAUSAL_REPAIR','ALIGN_QUEUE_EXTERNAL_BOUNDARY_256','ENQUEUE_SELF_ARCHITECTURE_EVOLUTION'].includes(x)),
    changedControl:actions.some(x=>['RESET_INVALID_PARALLELISM_STATE','RESET_STALE_PARALLELISM_PRESSURE'].includes(x)),
    taskId:taskIds[0]||null,taskIds:uniq(taskIds),queue,control,
    neuralExpansionReadiness:evolution.neuralExpansionReadiness};
}

export function runSystemStewardFiles({queueFile='.vibe2/queue.json',controlFile='.vibe2/parallelism-control.json',neuralReadinessFile='',now=new Date().toISOString()}={}){
  const result=runSystemStewardState({
    queueInput:readJson(queueFile,{tasks:[]}),
    controlInput:readJson(controlFile,{}),
    neuralExpansionReadiness:readJson(neuralReadinessFile,{}),
    now
  });
  if(result.changedQueue)writeJson(queueFile,result.queue);
  if(result.changedControl)writeJson(controlFile,result.control);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(),result=runSystemStewardFiles({
    queueFile:clean(args.queue)||'.vibe2/queue.json',
    controlFile:clean(args.control)||'.vibe2/parallelism-control.json',
    neuralReadinessFile:clean(args['neural-readiness']),
    now:clean(args.now)||new Date().toISOString()
  });
  console.log('VIBE2_SYSTEM_STEWARD_ACTION='+result.action);
  console.log('VIBE2_SYSTEM_STEWARD_ACTIONS='+result.actions.join(','));
  console.log('VIBE2_SYSTEM_STEWARD_TASK='+(result.taskId||'NONE'));
  console.log('VIBE2_SYSTEM_STEWARD_TASK_COUNT='+result.taskIds.length);
  console.log('VIBE2_SYSTEM_STEWARD_QUEUE_CHANGED='+(result.changedQueue?'YES':'NO'));
  console.log('VIBE2_SYSTEM_STEWARD_CONTROL_CHANGED='+(result.changedControl?'YES':'NO'));
  console.log('VIBE2_SYSTEM_STEWARD_QUEUE_MAX='+result.queue.maxConcurrentTasks);
  console.log('VIBE2_SYSTEM_STEWARD_ADAPTIVE_MAX='+result.control.currentMax);
  const neuralReady=result.neuralExpansionReadiness?.pass===true;
  console.log('VIBE2_NEURAL_EXPANSION_READINESS='+(neuralReady?'PASS':'PENDING'));
  console.log('VIBE2_NEURAL_EXPANSION_MISSING='+(result.neuralExpansionReadiness?.missing||[]).join(',')||'NONE');
}
