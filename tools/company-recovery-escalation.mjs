// 파일명: tools/company-recovery-escalation.mjs
// 역할: 일반 작업큐와 시스템-AI 큐의 반복 실패/공통 병목을 복구큐로 자동 승격한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeRecoveryQueue, enqueueRecovery } from './company-recovery-queue.mjs';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const VERIFIED_EXTERNAL_APPLICATION_FAILURE=/\b(?:VERIFIED_EXTERNAL_LEARNING_(?:MISSING|PARTIAL_APPLICATION|TRUNCATED|SILENTLY_IGNORED|NATIVE_SOURCE_STALE)|RAW_COMMERCIAL_EXPRESSION_COPY_DETECTED)\b/i;
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function evidenceSignature(task={}){
  const ev=uniq(task.evidence);
  // 실제 실패 서명만 허용한다. 외부 학습 후보/알고리즘 추천 문구는 복구 트리거가 아니다.
  const currentFanInMissing=clean(task.lastOutcome)==='FAN_IN_REVIEW_BLOCKED_REQUEUE'
    ?[...ev].reverse().find(x=>x.startsWith('package-review-missing:'))||'':'';
  const observed=[task.failureSignature,task.blocker,currentFanInMissing,task.lastOutcome,...[...ev].reverse()
    .filter(x=>/^(?:failure-cause:|failure-stage:|system-steward:failure-signature:)/i.test(x))].map(clean);
  for(const row of observed){
    const match=row.match(VERIFIED_EXTERNAL_APPLICATION_FAILURE);
    if(match)return match[0].toUpperCase();
  }
  const steward=[...ev].reverse().find(x=>x.startsWith('system-steward:failure-signature:'));
  if(steward)return clean(steward.slice('system-steward:failure-signature:'.length));
  const cause=[...ev].reverse().find(x=>x.startsWith('failure-cause:'));
  if(cause)return clean(cause.slice('failure-cause:'.length));
  return clean(task.blocker||task.lastOutcome);
}
function systemAiCohortKey(task={},signature=''){
  if(clean(signature)==='system-ai-infrastructure-contract-failed')return 'SHARED_SYSTEM_AI_INFRASTRUCTURE';
  const files=uniq(task.responsibleFiles).sort();
  return files.length?'RESPONSIBLE_FILES:'+files.join('|'):'TASK:'+clean(task.id);
}
function failureStage(task={}){
  const ev=uniq(task.evidence);
  if(clean(task.lastOutcome)==='FAN_IN_REVIEW_BLOCKED_REQUEUE'
    &&ev.some(x=>x.startsWith('package-review-missing:')&&VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(x)))return'FAN_IN_REVIEW';
  const recoveryExact=[...ev].reverse().find(x=>x.startsWith('recovery-exact-stage:'));
  if(recoveryExact)return clean(recoveryExact.slice('recovery-exact-stage:'.length));
  const explicit=[...ev].reverse().find(x=>x.startsWith('failure-stage:'));
  if(explicit)return clean(explicit.slice('failure-stage:'.length));
  return clean(task.currentStep||task.phase||task.blocker||'UNKNOWN_STAGE');
}
const CENTRAL_POLICY_FILES=new Set([
  'company-learning/platform-release-roadmap.json',
  'company-learning/company-architecture-map.json',
  'company-learning/company-log-map.json',
  'company-directive.json'
]);
function scopedExternalRepairEligible(task={}){
  const files=uniq(task.responsibleFiles).map(x=>x.replaceAll('\\','/').replace(/^\.\//,''));
  if(!files.length)return false;
  if(files.some(file=>CENTRAL_POLICY_FILES.has(file)))return false;
  if(task.protectedChange===true||task.requiresOwnerDecision===true||task.paidResourceRequired===true)return false;
  return true;
}
function gameRepairRoute(task={}){
  const target=clean(task.target).toLowerCase();
  const source=clean(task.sourceRoot);
  const gameSource=/^(web|roblox|unity|unreal|godot)-games\//.test(source)||['web','roblox','unity','unreal','godot'].includes(target);
  if(gameSource&&scopedExternalRepairEligible(task))return'SYSTEM_AI';
  return gameSource?'VIBE2_VIBE3':'SYSTEM_AI';
}
function escalationRow({sourceQueue,task,signature,stage,blastRadius='single-task',relatedTaskIds=[]}){
  const exactExternalApplication=VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(clean(signature));
  const gameSourceOwned=uniq(task.responsibleFiles).some(file=>/^(?:web|roblox|unity|unreal|godot)-games\//.test(file));
  // System AI는 원인을 분류하고 복구를 예약한다. 게임 소스 변경은 기존 Vibe 게임 작업자가 수행한다.
  const route=exactExternalApplication&&gameSourceOwned?'VIBE2_VIBE3':sourceQueue==='system-ai'?'SYSTEM_AI':gameRepairRoute(task);
  const sharedInfrastructure=sourceQueue==='system-ai'&&signature==='system-ai-infrastructure-contract-failed';
  const responsibleFiles=sharedInfrastructure
    ?['tools/company-system-ai-worker.mjs','.github/workflows/company-system-ai-workers.yml','qa/company-system-ai-worker.test.mjs','qa/company-system-ai-supervision-loop.test.mjs']
    :uniq(task.responsibleFiles);
  const contextFiles=sharedInfrastructure
    ?uniq([...(task.contextFiles||[]),'company-learning/platform-release-roadmap.json','company-learning/company-architecture-map.json'])
    :uniq(task.contextFiles);
  return{
    priority:sharedInfrastructure||blastRadius.startsWith('shared-worker-contract')||blastRadius.startsWith('portfolio')?'critical':'high',
    sourceQueue,sourceTaskId:clean(task.id),gameId:clean(task.gameId),responsibleFiles,contextFiles,
    goal:sharedInfrastructure?'Repair the shared System AI worker infrastructure contract for the repeated failure signature, then rerun the exact failed worker stage without expanding writable scope.'
      :exactExternalApplication?clean(task.goal)+' Repair the exact verified external-learning application failure '+clean(signature)+' in existing assigned source; apply game-specific semantic mapping with actual source evidence, preserve verified checkpoints, and re-run the failed canonical stage. Never copy commercial code or assets.'
      :clean(task.goal),
    relatedTaskIds,
    failureStage:stage,failureSignature:signature,blastRadius,
    checkpoint:clean(task.candidateSha||task.sourceRevision||task.baseMainSha||task.reservedAt)||null,
    evidence:uniq([...(task.evidence||[]),...(exactExternalApplication?['system-ai-external-application-bottleneck:DETECTED','system-ai-external-application-repair-owner:'+route,'system-ai-external-application-signature:'+clean(signature)]:[]),'recovery-escalated-from:'+sourceQueue,'recovery-route:'+route,'primary-ai-collaboration:REQUESTED','primary-ai-collaboration-reason:'+(sharedInfrastructure?'SHARED_SYSTEM_AI_INFRASTRUCTURE':blastRadius.startsWith('portfolio')||blastRadius.startsWith('shared-worker-contract')?'COMMON_BOTTLENECK':'REPEATED_FAILURE_SIGNATURE'),'primary-ai-collaboration-task:'+clean(task.id),...(sharedInfrastructure?['shared-system-ai-infrastructure-repair:YES','representative-canary-required:YES']:[])]),
    recoveryOwner:route,
    recoveryStrategy:sharedInfrastructure
      ?'REPAIR_SHARED_SYSTEM_AI_INFRASTRUCTURE_WITH_ONE_CANARY_THEN_RELEASE_DEPENDENT_COHORT'
      :route==='VIBE2_VIBE3'
        ?'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT'
        :'ASSIGN_SCOPED_IMPLEMENTATION_REPAIR_TO_SUPERVISED_SYSTEM_AI_CANDIDATE_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:sharedInfrastructure
      ?['node --check tools/company-system-ai-worker.mjs','node --test qa/company-system-ai-worker.test.mjs qa/company-system-ai-supervision-loop.test.mjs']
      :[
        'RERUN_EXACT_FAILED_STAGE',
        'INDEPENDENT_QA_WHEN_APPLICABLE',
        'REGRESSION_WHEN_APPLICABLE',
        'CONFIRM_FAILURE_SIGNATURE_NOT_RECURRING',
        ...(exactExternalApplication?['VERIFY_VERIFIED_EXTERNAL_LEARNING_DISPOSITIONS_AND_GAME_SPECIFIC_SEMANTIC_MAPPING','VERIFY_ACTUAL_OWNED_NATIVE_SOURCE_DELTA_AND_EXACT_STAGE_QA','PRESERVE_F0_F9_SECURITY_SAVE_BALANCE_AND_RELEASE_GATES']:[])
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
    const sig=evidenceSignature(task);
    if(sig==='RAW_COMMERCIAL_EXPRESSION_COPY_DETECTED')continue; // 보안 격리/검토 경로를 일반 자동 소스 수리로 대체하지 않는다.
    const externalApplication=VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(sig);
    const exactQueuedFailure=externalApplication&&status==='queued'&&
      (VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(clean(task.failureSignature||task.blocker))
        ||ev.some(x=>/^(?:failure-cause:|system-steward:failure-signature:)/i.test(x)&&VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(x))
        ||(clean(task.lastOutcome)==='FAN_IN_REVIEW_BLOCKED_REQUEUE'
          &&ev.some(x=>x.startsWith('package-review-missing:')&&VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(x))));
    const repeated=Number(task.recoveryGeneration||0)>0||ev.some(x=>x.startsWith('system-steward:retry-exhausted-regenerated:'))||status==='failed'||exactQueuedFailure;
    if(repeated&&sig)candidates.push({sourceQueue:'vibe2',task,signature:sig,stage:failureStage(task)});
  }
  for(const task of sysTasks){
    const status=clean(task.status).toLowerCase();
    if(['done','completed','cancelled','verified'].includes(status))continue;
    const blocker=clean(task.blocker),lastOutcome=clean(task.lastOutcome);
    if(/^shared-signature-canary-pending:/i.test(blocker))continue;
    if(blocker==='system-ai-duplicate-repair-superseded'||lastOutcome==='SUPERSEDED_DUPLICATE_WORK')continue;
    const repeated=Number(task.retries||0)>=2||status==='failed';
    const sig=evidenceSignature(task)||clean(blocker||lastOutcome);
    if(sig==='RAW_COMMERCIAL_EXPRESSION_COPY_DETECTED')continue;
    const exactQueuedFailure=status==='queued'&&VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(sig)&&
      VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(clean(task.failureSignature||task.blocker));
    if((repeated||exactQueuedFailure)&&sig)candidates.push({sourceQueue:'system-ai',task,signature:sig,stage:failureStage(task)});
  }
  const grouped=new Map();
  for(const row of candidates){
    // 외부 학습 적용 실패는 게임별 책임 파일 단위로 분리해 타 게임 작업을 한 canary로 묶지 않는다.
    const externalScope=VERIFIED_EXTERNAL_APPLICATION_FAILURE.test(row.signature)
      ?'|GAME_SCOPE:'+clean(row.task.gameId)+'|FILES:'+uniq(row.task.responsibleFiles).sort().join('|')
      :'';
    const key=row.sourceQueue+'|'+row.signature+(externalScope||(row.sourceQueue==='system-ai'?'|'+systemAiCohortKey(row.task,row.signature):''));
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(row);
  }
  const handled=new Set();
  for(const rows of grouped.values()){
    if(rows.length<2)continue;
    const first=rows[0],ids=rows.map(x=>clean(x.task.id)).filter(Boolean);
    const result=enqueueRecovery(queue,escalationRow({
      sourceQueue:first.sourceQueue,task:first.task,signature:first.signature,stage:first.stage,
      blastRadius:(first.sourceQueue==='system-ai'?'shared-worker-contract:':'portfolio:')+rows.length,relatedTaskIds:ids
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
