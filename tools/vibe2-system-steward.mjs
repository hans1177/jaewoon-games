// 파일명: tools/vibe2-system-steward.mjs
// 역할: 24H 개발 시스템의 자잘한 마찰과 병목을 한 번에 한 종류씩 자동 복구한다.
// 원칙: 게임 의도/관문은 변경하지 않고 큐, lease, retry 묘지, stale 병렬 상태만 보수한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeContinuousQueue, DEFAULT_MAX_CONCURRENT_TASKS } from '../assets/vibe-continuous-queue.js';
import { createParallelismControl, DEFAULT_TELEMETRY_TTL_MS } from './vibe2-adaptive-backpressure.mjs';

const clean=v=>String(v??'').trim();
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const parseArgs=(argv=process.argv.slice(2))=>Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
const safeTask=t=>t?.requiresOwnerDecision!==true&&t?.protectedChange!==true&&t?.paidResourceRequired!==true;
const activeStatus=s=>['queued','running'].includes(clean(s).toLowerCase());
const waitBlocker=v=>/WAITING_FOR_GEMINI_QUOTA|external.*model.*quota|roblox.*(?:runner|studio).*(?:offline|deferred|wait)|WAITING_FOR_(?:ROBLOX_)?RUNTIME/i.test(clean(v));

function staleRunningIndex(queue,{nowMs=Date.now(),staleMs=45*60*1000}={}){
  return queue.tasks.findIndex(task=>{
    if(clean(task.status).toLowerCase()!=='running'||waitBlocker(task.blocker))return false;
    const at=Date.parse(clean(task.reservedAt));
    return !Number.isFinite(at)||nowMs-at>Math.max(60_000,Number(staleMs)||45*60*1000);
  });
}
function exhaustedIndex(queue){
  return queue.tasks.findIndex(task=>
    clean(task.status).toLowerCase()==='failed'&&
    Number(task.retries||0)>Number(task.maxRetries??2)&&
    safeTask(task)
  );
}
function clearReservation(task){return {...task,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null};}

export function runSystemStewardState({
  queueInput={},controlInput={},now=new Date().toISOString(),
  staleRunningMs=45*60*1000,telemetryTtlMs=DEFAULT_TELEMETRY_TTL_MS
}={}){
  let queue=createVibeContinuousQueue(queueInput);
  let control=createParallelismControl(controlInput);
  const nowMs=Date.parse(now)||Date.now();

  const staleIndex=staleRunningIndex(queue,{nowMs,staleMs:staleRunningMs});
  if(staleIndex>=0){
    const task=queue.tasks[staleIndex];
    const tasks=queue.tasks.map((row,i)=>i===staleIndex?{
      ...clearReservation(row),status:'queued',blocker:null,lastOutcome:'SYSTEM_STEWARD_STALE_LEASE_RECOVERED',
      evidence:uniq([...(row.evidence||[]),'system-steward:stale-running-reservation-recovered'])
    }:row);
    queue=createVibeContinuousQueue({maxConcurrentTasks:queue.maxConcurrentTasks,tasks});
    return{action:'RECOVER_STALE_RUNNING_RESERVATION',changedQueue:true,changedControl:false,taskId:task.id,queue,control};
  }

  const exhausted=exhaustedIndex(queue);
  if(exhausted>=0){
    const task=queue.tasks[exhausted];
    const generation=Math.max(0,Number(task.recoveryGeneration||0))+1;
    const tasks=queue.tasks.map((row,i)=>i===exhausted?{
      ...clearReservation(row),
      status:'queued',retries:0,blocker:null,lastOutcome:'SYSTEM_STEWARD_REGENERATED_AFTER_RETRY_EXHAUSTION',
      recoveryGeneration:generation,estimatedRisk:'high',speculativeEligible:true,
      evidence:uniq([...(row.evidence||[]),`system-steward:retry-exhausted-regenerated:generation-${generation}`,`repair-mode:CAUSAL_REGENERATION_GENERATION_${generation}`])
    }:row);
    queue=createVibeContinuousQueue({maxConcurrentTasks:queue.maxConcurrentTasks,tasks});
    return{action:'REGENERATE_RETRY_EXHAUSTED_TASK',changedQueue:true,changedControl:false,taskId:task.id,recoveryGeneration:generation,queue,control};
  }

  const lastAt=Date.parse(clean(control.lastUpdatedAt));
  const staleControl=control.currentMax<DEFAULT_MAX_CONCURRENT_TASKS&&Number.isFinite(lastAt)&&nowMs-lastAt>Math.max(60_000,Number(telemetryTtlMs)||DEFAULT_TELEMETRY_TTL_MS);
  if(staleControl){
    control=createParallelismControl({
      currentMax:DEFAULT_MAX_CONCURRENT_TASKS,healthyStreak:0,pressureStreak:0,
      lastDecision:'RESET',lastReason:'SYSTEM_STEWARD_STALE_TELEMETRY_RESET',
      lastRunId:null,lastUpdatedAt:now,lastTelemetry:null
    });
    return{action:'RESET_STALE_PARALLELISM_PRESSURE',changedQueue:false,changedControl:true,queue,control};
  }

  if(queue.maxConcurrentTasks!==DEFAULT_MAX_CONCURRENT_TASKS){
    queue=createVibeContinuousQueue({maxConcurrentTasks:DEFAULT_MAX_CONCURRENT_TASKS,tasks:queue.tasks});
    return{action:'ALIGN_QUEUE_MAX_TO_GLOBAL_30',changedQueue:true,changedControl:false,queue,control};
  }

  const active=queue.tasks.filter(t=>activeStatus(t.status)&&!waitBlocker(t.blocker));
  return{action:active.length?'HEALTHY_NO_SCOPED_REPAIR':'NO_RUNNABLE_WORK_FOR_PLANNER_REFILL',changedQueue:false,changedControl:false,queue,control};
}

export function runSystemStewardFiles({queueFile='.vibe2/queue.json',controlFile='.vibe2/parallelism-control.json',now=new Date().toISOString()}={}){
  const result=runSystemStewardState({queueInput:readJson(queueFile,{tasks:[]}),controlInput:readJson(controlFile,{}),now});
  if(result.changedQueue)writeJson(queueFile,result.queue);
  if(result.changedControl)writeJson(controlFile,result.control);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=runSystemStewardFiles({queueFile:clean(args.queue)||'.vibe2/queue.json',controlFile:clean(args.control)||'.vibe2/parallelism-control.json',now:clean(args.now)||new Date().toISOString()});
  console.log('VIBE2_SYSTEM_STEWARD_ACTION='+result.action);
  console.log('VIBE2_SYSTEM_STEWARD_TASK='+(result.taskId||'NONE'));
  console.log('VIBE2_SYSTEM_STEWARD_QUEUE_CHANGED='+(result.changedQueue?'YES':'NO'));
  console.log('VIBE2_SYSTEM_STEWARD_CONTROL_CHANGED='+(result.changedControl?'YES':'NO'));
  console.log('VIBE2_SYSTEM_STEWARD_QUEUE_MAX='+result.queue.maxConcurrentTasks);
  console.log('VIBE2_SYSTEM_STEWARD_ADAPTIVE_MAX='+result.control.currentMax);
}
