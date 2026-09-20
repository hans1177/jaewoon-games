// 파일명: tools/company-recovery-escalation.mjs
// 역할: 일반 작업큐와 시스템-AI 큐의 반복 실패/공통 병목을 복구큐로 자동 승격한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeRecoveryQueue, enqueueRecovery } from './company-recovery-queue.mjs';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function evidenceSignature(task={}){
  const ev=uniq(task.evidence);
  const steward=[...ev].reverse().find(x=>x.startsWith('system-steward:failure-signature:'));
  if(steward)return clean(steward.slice('system-steward:failure-signature:'.length));
  const cause=[...ev].reverse().find(x=>x.startsWith('failure-cause:'));
  if(cause)return clean(cause.slice('failure-cause:'.length));
  return clean(task.blocker||task.lastOutcome);
}
function failureStage(task={}){
  const ev=uniq(task.evidence);
  const recoveryExact=[...ev].reverse().find(x=>x.startsWith('recovery-exact-stage:'));
  if(recoveryExact)return clean(recoveryExact.slice('recovery-exact-stage:'.length));
  const explicit=[...ev].reverse().find(x=>x.startsWith('failure-stage:'));
  if(explicit)return clean(explicit.slice('failure-stage:'.length));
  return clean(task.currentStep||task.phase||task.blocker||'UNKNOWN_STAGE');
}
function gameRepairRoute(task={}){
  const target=clean(task.target).toLowerCase();
  const source=clean(task.sourceRoot);
  const gameSource=/^(web|roblox|unity|unreal|godot)-games\//.test(source)||['web','roblox','unity','unreal','godot'].includes(target);
  return gameSource?'VIBE2_VIBE3':'SYSTEM_AI';
}
function escalationRow({sourceQueue,task,signature,stage,blastRadius='single-task',relatedTaskIds=[]}){
  const route=sourceQueue==='system-ai'? 'SYSTEM_AI':gameRepairRoute(task);
  return{
    priority:blastRadius.startsWith('portfolio')?'critical':'high',
    sourceQueue,sourceTaskId:clean(task.id),relatedTaskIds,
    failureStage:stage,failureSignature:signature,blastRadius,
    checkpoint:clean(task.candidateSha||task.sourceRevision||task.baseMainSha||task.reservedAt)||null,
    evidence:uniq([...(task.evidence||[]),'recovery-escalated-from:'+sourceQueue,'recovery-route:'+route]),
    recoveryOwner:route,
    recoveryStrategy:route==='VIBE2_VIBE3'
      ?'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT'
      :'ASSIGN_SCOPED_SYSTEM_REPAIR_TO_SUPERVISED_SYSTEM_AI_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:[
      'RERUN_EXACT_FAILED_STAGE',
      'INDEPENDENT_QA_WHEN_APPLICABLE',
      'REGRESSION_WHEN_APPLICABLE',
      'CONFIRM_FAILURE_SIGNATURE_NOT_RECURRING'
    ]
  };
}
export function escalateRecoveryCandidates({gameQueueInput={},systemAiQueueInput={},recoveryInput={}}={}){
  let queue=normalizeRecoveryQueue(recoveryInput);const added=[],reactivated=[];
  const gameTasks=Array.isArray(gameQueueInput.tasks)?gameQueueInput.tasks:[];
  const sysTasks=Array.isArray(systemAiQueueInput.tasks)?systemAiQueueInput.tasks:[];
  const candidates=[];
  for(const task of gameTasks){
    const status=clean(task.status).toLowerCase();
    if(['done','completed','cancelled','verified'].includes(status))continue;
    const ev=uniq(task.evidence);
    const repeated=Number(task.recoveryGeneration||0)>0||ev.some(x=>x.startsWith('system-steward:retry-exhausted-regenerated:'))||clean(task.status)==='failed';
    const sig=evidenceSignature(task);
    if(repeated&&sig)candidates.push({sourceQueue:'vibe2',task,signature:sig,stage:failureStage(task)});
  }
  for(const task of sysTasks){
    const status=clean(task.status).toLowerCase();
    if(['done','completed','cancelled','verified'].includes(status))continue;
    const repeated=Number(task.retries||0)>=2||status==='failed';
    const sig=clean(task.blocker||task.lastOutcome);
    if(repeated&&sig)candidates.push({sourceQueue:'system-ai',task,signature:sig,stage:failureStage(task)});
  }
  const grouped=new Map();
  for(const row of candidates){
    const key=row.sourceQueue+'|'+row.signature;
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(row);
  }
  const handled=new Set();
  for(const rows of grouped.values()){
    if(rows.length<3)continue;
    const first=rows[0],ids=rows.map(x=>clean(x.task.id)).filter(Boolean);
    const result=enqueueRecovery(queue,escalationRow({
      sourceQueue:first.sourceQueue,task:first.task,signature:first.signature,stage:first.stage,
      blastRadius:'portfolio:'+rows.length,relatedTaskIds:ids
    }),{reactivateDispatched:rows.some(x=>clean(x.task.status).toLowerCase()==='failed')});
    queue=result.queue;if(result.added)added.push(result.id);if(result.reactivated)reactivated.push(result.id);rows.forEach(x=>handled.add(x.sourceQueue+'|'+clean(x.task.id)));
  }
  for(const row of candidates){
    if(handled.has(row.sourceQueue+'|'+clean(row.task.id)))continue;
    const result=enqueueRecovery(queue,escalationRow({sourceQueue:row.sourceQueue,task:row.task,signature:row.signature,stage:row.stage}),{reactivateDispatched:clean(row.task.status).toLowerCase()==='failed'});
    queue=result.queue;if(result.added)added.push(result.id);if(result.reactivated)reactivated.push(result.id);
  }
  return{queue,added,reactivated};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const recoveryFile=clean(args.recovery)||'.vibe2/recovery-queue.json';
  const result=escalateRecoveryCandidates({
    gameQueueInput:readJson(clean(args.queue)||'.vibe2/queue.json',{tasks:[]}),
    systemAiQueueInput:readJson(clean(args['system-ai'])||'.vibe2/system-ai-queue.json',{tasks:[]}),
    recoveryInput:readJson(recoveryFile,{tasks:[]})
  });
  writeJson(recoveryFile,result.queue);
  console.log('RECOVERY_ESCALATION_ADDED='+result.added.length);
  console.log('RECOVERY_ESCALATION_REACTIVATED='+result.reactivated.length);
}
