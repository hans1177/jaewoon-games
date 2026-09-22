// 파일명: tools/company-system-ai-queue.mjs
// 역할: 총괄이 외부 무료 AI에 배정한 시스템 작업을 충돌 없이 예약하고 결과를 감독 대기로 모은다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isSafeSecurityRepairFile } from './company-recovery-queue.mjs';
import { classifySystemAiFailure } from './company-system-ai-failure-classifier.mjs';

const clean=v=>String(v??'').trim();
const unique=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const now=()=>new Date().toISOString();
export const PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION='PRIMARY_AI_SECURITY_RECOVERY_ASSIGN=APPROVE';
export const PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS='PRIMARY_AI_SECURITY_RECOVERY_REVIEW=PASS';
export const PRIMARY_AI_SECURITY_RECOVERY_REVIEW_REWORK='PRIMARY_AI_SECURITY_RECOVERY_REVIEW=REWORK';
function securityRecoveryRepairFiles(rec={}){
  return unique([...(rec.evidence||[]),...(rec.dispatchEvidence||[])]
    .map(clean)
    .filter(x=>x.startsWith('security-repair-file:')||x.startsWith('primary-ai-repair-file:'))
    .map(x=>clean(x.slice(x.indexOf(':')+1)))
    .filter(isSafeSecurityRepairFile));
}

function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function normalizeTask(row={}){
  const retryPolicy=clean(row.retryPolicy).toUpperCase()==='UNLIMITED_CAUSAL_REPAIR'?'UNLIMITED_CAUSAL_REPAIR':'BOUNDED_RETRY';
  return{
    id:clean(row.id),status:clean(row.status)||'queued',priority:clean(row.priority)||'normal',
    department:clean(row.department)||null,taskType:clean(row.taskType)||null,gameId:clean(row.gameId)||null,
    jointDecisionRequired:row.jointDecisionRequired===true,
    goal:clean(row.goal),responsibleFiles:unique(row.responsibleFiles),contextFiles:unique(row.contextFiles),
    focusPatterns:row.focusPatterns&&typeof row.focusPatterns==='object'?row.focusPatterns:{},
    acceptanceCriteria:unique(row.acceptanceCriteria),verificationCommands:unique(row.verificationCommands),
    dependencies:unique(row.dependencies),relatedTaskIds:unique(row.relatedTaskIds),blockedTaskIds:unique(row.blockedTaskIds),
    retries:Math.max(0,Number(row.retries||0)),recurrenceCount:Math.max(0,Number(row.recurrenceCount||0)),
    failureStage:clean(row.failureStage)||null,failureSignature:clean(row.failureSignature)||null,failureClass:clean(row.failureClass)||null,
    handoffCount:Math.max(0,Number(row.handoffCount||0)),previousReservationId:clean(row.previousReservationId)||null,
    blastRadius:clean(row.blastRadius)||null,knownGoodRevision:clean(row.knownGoodRevision||row.knownGoodSourceRevision)||null,
    repairRisk:Math.max(0,Math.min(10,Number(row.repairRisk??1)||0)),
    sourceMutationRequired:row.sourceMutationRequired===true,sourceMutationBaseline:clean(row.sourceMutationBaseline)||null,
    retryPolicy,maxRetries:retryPolicy==='UNLIMITED_CAUSAL_REPAIR'?null:Math.max(0,Math.min(5,Number(row.maxRetries??2))),reservationId:clean(row.reservationId)||null,
    reservedAt:clean(row.reservedAt)||null,candidateBranch:clean(row.candidateBranch)||null,
    pullRequestUrl:clean(row.pullRequestUrl)||null,lastOutcome:clean(row.lastOutcome)||null,
    blocker:clean(row.blocker)||null,evidence:unique(row.evidence),supervisorReviewRequired:row.supervisorReviewRequired!==false,
    impactScore:Number.isFinite(Number(row.impactScore))?Number(row.impactScore):null,
    impactComponents:row.impactComponents&&typeof row.impactComponents==='object'?row.impactComponents:null,
    createdAt:clean(row.createdAt)||now(),updatedAt:clean(row.updatedAt)||now()
  };
}
export function normalizeSystemAiQueue(input={}){
  return{version:1,kind:'company-system-ai-queue',policy:'PRIMARY_AI_SUPERVISED_FREE_EXTERNAL_AI_SYSTEM_WORK',
    worker:'tools/company-system-ai-worker.mjs',tasks:(input.tasks||[]).map(normalizeTask)};
}
function rank(p){return({critical:4,high:3,normal:2,low:1})[clean(p).toLowerCase()]||2;}
function failureSignatureOf(task={}){
  const explicit=clean(task.failureSignature);
  if(explicit)return explicit;
  const evidence=unique(task.evidence);
  for(const prefix of ['shared-signature:','system-steward:failure-signature:','failure-cause:']){
    const row=[...evidence].reverse().find(x=>x.startsWith(prefix));
    if(row)return clean(row.slice(prefix.length));
  }
  return clean(task.blocker||task.lastOutcome)||null;
}
function numericEvidence(task={},prefix=''){
  const row=[...unique(task.evidence)].reverse().find(x=>x.startsWith(prefix));
  const value=Number(row?clean(row.slice(prefix.length)):NaN);
  return Number.isFinite(value)?value:null;
}
export function systemAiImpactProfile(taskInput={},queueInput={tasks:[]},{at=Date.now()}={}){
  const queue=normalizeSystemAiQueue(queueInput),task=normalizeTask(taskInput);
  const signature=failureSignatureOf(task);
  const live=queue.tasks.filter(x=>!['done','completed','cancelled','verified'].includes(clean(x.status).toLowerCase()));
  const directDependents=live.filter(x=>(x.dependencies||[]).includes(task.id)).map(x=>x.id);
  const signatureCohort=signature?live.filter(x=>x.id!==task.id&&failureSignatureOf(x)===signature).map(x=>x.id):[];
  const explicitCohort=Math.max(0,Number(numericEvidence(task,'cohort-size:')??0));
  const blockedIds=unique([...(task.blockedTaskIds||[]),...(task.relatedTaskIds||[]),...directDependents,...signatureCohort]);
  const blockedTaskCount=Math.max(blockedIds.length,Math.max(0,explicitCohort-1));
  const recurrenceCount=Math.max(task.recurrenceCount||0,task.retries||0,signatureCohort.length);
  const dependencyCentrality=Math.max(directDependents.length,task.relatedTaskIds?.length||0);
  const createdMs=Date.parse(task.createdAt);
  const ageHours=Number.isFinite(createdMs)?Math.max(0,Math.min(168,(at-createdMs)/3600000)):0;
  const severity=rank(task.priority);
  const repairRisk=Math.max(0,Math.min(10,Number(task.repairRisk||0)));
  const score=Math.max(0,Math.round(
    severity*100+
    Math.min(50,blockedTaskCount)*28+
    Math.min(20,recurrenceCount)*22+
    Math.min(50,dependencyCentrality)*16+
    ageHours*0.75-
    repairRisk*24
  ));
  return{
    score,
    signature,
    commonBottleneck:Boolean(signature&&(signatureCohort.length>0||explicitCohort>1||task.relatedTaskIds?.length>1||task.blockedTaskIds?.length>1)),
    blockedTaskCount,
    blockedTaskIds,
    recurrenceCount,
    dependencyCentrality,
    ageHours:Number(ageHours.toFixed(2)),
    severity,
    repairRisk,
    cohortSize:Math.max(1,signatureCohort.length+1,explicitCohort,blockedTaskCount+1),
    components:{severity,blockedTaskCount,recurrenceCount,dependencyCentrality,ageHours:Number(ageHours.toFixed(2)),repairRisk}
  };
}
function overlap(a,b){const s=new Set(a.responsibleFiles||[]);return (b.responsibleFiles||[]).some(x=>s.has(x));}
function dependencyReady(task,queue){
  const byId=new Map(queue.tasks.map(x=>[x.id,x]));
  return (task.dependencies||[]).every(id=>byId.get(id)?.status==='done');
}
export function reclaimStaleSystemAiReservations(queueInput,{leaseMinutes=30,at=Date.now()}={}){
  const queue=normalizeSystemAiQueue(queueInput),stamp=new Date(at).toISOString();
  const leaseMs=Math.max(1,Number(leaseMinutes)||30)*60*1000;
  let reclaimed=0;
  const tasks=queue.tasks.map(task=>{
    if(task.status!=='running')return task;
    const missingReservation=!clean(task.reservationId);
    const reservedMs=Date.parse(clean(task.reservedAt)||clean(task.updatedAt));
    const expired=Number.isFinite(reservedMs)&&(at-reservedMs)>=leaseMs;
    if(!missingReservation&&!expired)return task;
    reclaimed+=1;
    const priorReservation=clean(task.reservationId)||null;
    return{
      ...task,
      status:'queued',
      blocker:'stale-system-ai-reservation-reclaimed',
      previousReservationId:priorReservation,
      handoffCount:Math.max(0,Number(task.handoffCount||0))+1,
      reservationId:null,
      reservedAt:null,
      updatedAt:stamp,
      evidence:unique([
        ...(task.evidence||[]),
        'system-ai-stale-reservation-reclaimed:YES',
        missingReservation?'stale-reservation-cause:MISSING_RESERVATION_ID':'stale-reservation-cause:LEASE_EXPIRED',
        'system-ai-handoff-state:STALE_RECLAIM',
        ...(priorReservation?['system-ai-handoff-from-reservation:'+priorReservation]:[]),
        'system-ai-handoff-to-reservation:PENDING',
        'system-ai-exact-checkpoint-resume:YES',
        'retry-budget-consumed:NO',
        'learning-penalty:NO'
      ])
    };
  });
  return{queue:{...queue,tasks},reclaimed};
}
export function assignSecurityRecovery(queueInput,recoveryInput,{recoveryId='',decision=''}={}){
  const queue=normalizeSystemAiQueue(queueInput);
  const recovery={...recoveryInput,tasks:(recoveryInput.tasks||[]).map(x=>({...x}))};
  if(clean(decision)!==PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_EXPLICIT_APPROVAL_REQUIRED');
  const id=clean(recoveryId);
  if(!id)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ID_REQUIRED');
  const rec=recovery.tasks.find(x=>clean(x.id)===id);
  if(!rec)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_NOT_FOUND:'+id);
  if(clean(rec.status)!=='blocked-primary-ai-assignment-required')throw new Error('SYSTEM_AI_SECURITY_RECOVERY_NOT_ASSIGNABLE:'+id+':'+clean(rec.status));
  if(clean(rec.sourceQueue).toLowerCase()!=='security'||clean(rec.recoveryOwner).toUpperCase()!=='SYSTEM_AI')throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ROUTE_INVALID:'+id);
  const responsibleFiles=securityRecoveryRepairFiles(rec);
  if(!responsibleFiles.length)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_SAFE_SCOPE_REQUIRED:'+id);
  const taskId=clean(rec.sourceTaskId);
  if(!taskId)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_SOURCE_TASK_REQUIRED:'+id);
  if(queue.tasks.some(x=>clean(x.id)===taskId))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TASK_EXISTS:'+taskId);
  const stamp=now();
  const task=normalizeTask({
    id:taskId,
    status:'queued',
    priority:'critical',
    goal:'Repair quarantined security findings only within the Primary-AI-approved responsible files while preserving all existing authority and review boundaries.',
    responsibleFiles,
    contextFiles:unique([...responsibleFiles,'tools/company-security-steward.mjs','tools/company-security-incident.mjs']),
    acceptanceCriteria:[
      'Remove or remediate the quarantined security finding without weakening security, QA, review, or main-write gates',
      'Modify only the Primary-AI-approved responsible files',
      'Security verification must return PASS before candidate PR publication',
      'Primary-AI supervisor review remains required before acceptance'
    ],
    verificationCommands:['node --test qa/company-security-steward.test.mjs'],
    dependencies:[],
    retries:0,
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',
    maxRetries:null,
    evidence:unique([
      ...(rec.evidence||[]),
      'security-recovery:'+id,
      'primary-ai-security-recovery-assignment:APPROVE',
      'recovery-source-task:'+taskId
    ]),
    supervisorReviewRequired:true,
    createdAt:stamp,
    updatedAt:stamp
  });
  const tasks=[...queue.tasks,task];
  recovery.tasks=recovery.tasks.map(x=>clean(x.id)!==id?x:{
    ...x,
    status:'queued',
    evidence:unique([
      ...(x.evidence||[]),
      'primary-ai-security-recovery-assignment:APPROVE',
      'system-ai-assignment:'+taskId
    ]),
    updatedAt:stamp
  });
  return{queue:{...queue,tasks},recovery,task};
}

export function reviewSecurityRecovery(queueInput,recoveryInput,{recoveryId='',decision='',evidence=[]}={}){
  const queue=normalizeSystemAiQueue(queueInput);
  const recovery={...recoveryInput,tasks:(recoveryInput.tasks||[]).map(x=>({...x}))};
  const review=clean(decision);
  if(![PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS,PRIMARY_AI_SECURITY_RECOVERY_REVIEW_REWORK].includes(review))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_EXACT_REVIEW_REQUIRED');
  const id=clean(recoveryId);
  if(!id)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ID_REQUIRED');
  const rec=recovery.tasks.find(x=>clean(x.id)===id);
  if(!rec)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_NOT_FOUND:'+id);
  if(clean(rec.status)!=='awaiting-primary-ai-review')throw new Error('SYSTEM_AI_SECURITY_RECOVERY_NOT_REVIEWABLE:'+id+':'+clean(rec.status));
  if(clean(rec.sourceQueue).toLowerCase()!=='security'||clean(rec.recoveryOwner).toUpperCase()!=='SYSTEM_AI')throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ROUTE_INVALID:'+id);
  const taskId=clean(rec.sourceTaskId);
  if(!taskId||!(rec.evidence||[]).includes('system-ai-assignment:'+taskId))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ASSIGNMENT_LINK_REQUIRED:'+id);
  const task=queue.tasks.find(x=>x.id===taskId);
  if(!task)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TASK_NOT_FOUND:'+taskId);
  if(!(task.evidence||[]).includes('primary-ai-security-recovery-assignment:APPROVE'))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ASSIGNMENT_EVIDENCE_REQUIRED:'+taskId);
  if(!(task.evidence||[]).includes('security-recovery:'+id))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TASK_LINK_MISMATCH:'+taskId+':'+id);
  const stamp=now();
  const reviewEvidence=unique([...(evidence||[]),'security-recovery-review:'+id,'security-recovery-review-decision:'+review]);
  let tasks;
  let recoveryTasks;
  if(review===PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS){
    const candidateReady=task.status==='awaiting-supervisor';
    const currentMainReady=task.status==='done'&&task.lastOutcome==='DETERMINISTIC_CURRENT_MAIN_SATISFIED';
    if(!candidateReady&&!currentMainReady)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TASK_NOT_REVIEWABLE:'+taskId+':'+task.status+':'+clean(task.lastOutcome));
    tasks=queue.tasks.map(x=>x.id!==taskId?x:{
      ...x,
      status:'done',
      blocker:null,
      lastOutcome:candidateReady?'PRIMARY_AI_ACCEPTED':x.lastOutcome,
      evidence:unique([...(x.evidence||[]),...reviewEvidence,'primary-ai-review:PASS']),
      updatedAt:stamp,
      reservationId:null,
      reservedAt:null
    });
    recoveryTasks=recovery.tasks.map(x=>clean(x.id)!==id?x:{
      ...x,
      status:'verified',
      primaryAiReview:'PASS',
      evidence:unique([...(x.evidence||[]),...reviewEvidence,'primary-ai-recovery-review:PASS']),
      updatedAt:stamp
    });
  }else{
    tasks=queue.tasks.map(x=>x.id!==taskId?x:{
      ...x,
      status:'queued',
      blocker:'security-recovery-primary-ai-rework',
      candidateBranch:null,
      pullRequestUrl:null,
      reservationId:null,
      reservedAt:null,
      evidence:unique([...(x.evidence||[]),...reviewEvidence,'primary-ai-rework:security-recovery-primary-ai-rework']),
      updatedAt:stamp
    });
    recoveryTasks=recovery.tasks.map(x=>clean(x.id)!==id?x:{
      ...x,
      status:'queued',
      primaryAiReview:'REWORK',
      evidence:unique([...(x.evidence||[]),...reviewEvidence,'primary-ai-recovery-review:REWORK']),
      updatedAt:stamp
    });
  }
  return{queue:{...queue,tasks},recovery:{...recovery,tasks:recoveryTasks},taskId,recoveryId:id,decision:review};
}

export function reserveSecurityRecoveryTask(queueInput,{id='',reservationId=''}={}){
  const queue=normalizeSystemAiQueue(queueInput);
  const taskId=clean(id);
  if(!taskId)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TARGET_ID_REQUIRED');
  const task=queue.tasks.find(x=>x.id===taskId);
  if(!task)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TARGET_NOT_FOUND:'+taskId);
  if(task.status!=='queued')throw new Error('SYSTEM_AI_SECURITY_RECOVERY_TARGET_NOT_QUEUED:'+taskId+':'+task.status);
  if(task.supervisorReviewRequired!==true)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_SUPERVISION_REQUIRED:'+taskId);
  if(!(task.evidence||[]).includes('primary-ai-security-recovery-assignment:APPROVE'))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ASSIGNMENT_EVIDENCE_REQUIRED:'+taskId);
  if(!(task.evidence||[]).some(x=>clean(x).startsWith('security-recovery:')))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_LINK_EVIDENCE_REQUIRED:'+taskId);
  if(!dependencyReady(task,queue))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_DEPENDENCY_NOT_READY:'+taskId);
  const active=queue.tasks.filter(t=>t.status==='running'&&t.id!==taskId);
  if(active.some(other=>overlap(task,other)))throw new Error('SYSTEM_AI_SECURITY_RECOVERY_ACTIVE_FILE_CONFLICT:'+taskId);
  const stamp=now();
  const rid=clean(reservationId)||`system-ai-security-recovery:${Date.now()}`;
  const tasks=queue.tasks.map(t=>t.id===taskId?{...t,status:'running',reservationId:rid,reservedAt:stamp,updatedAt:stamp,blocker:null}:t);
  return{queue:{...queue,tasks},reserved:tasks.filter(t=>t.id===taskId),reservationId:rid};
}

export function reserveSystemAiBatch(queueInput,{max=16,reservationId='',leaseMinutes=30,at=Date.now()}={}){
  const reclaimed=reclaimStaleSystemAiReservations(queueInput,{leaseMinutes,at});
  const queue=reclaimed.queue, active=queue.tasks.filter(t=>t.status==='running');
  const profiles=new Map(queue.tasks.map(task=>[task.id,systemAiImpactProfile(task,queue,{at})]));
  const candidates=queue.tasks.filter(t=>t.status==='queued'&&dependencyReady(t,queue))
    .sort((a,b)=>(profiles.get(b.id)?.score||0)-(profiles.get(a.id)?.score||0)||rank(b.priority)-rank(a.priority)||a.createdAt.localeCompare(b.createdAt));
  const chosen=[],commonCanarySignatures=new Set();
  for(const task of candidates){
    if(chosen.length>=Math.max(1,Math.floor(Number(max)||16)))break;
    if([...active,...chosen].some(other=>overlap(task,other)))continue;
    const impact=profiles.get(task.id);
    const signature=clean(impact?.signature);
    if(impact?.commonBottleneck===true&&signature){
      if(commonCanarySignatures.has(signature))continue;
      commonCanarySignatures.add(signature);
    }
    chosen.push(task);
  }
  const ids=new Set(chosen.map(x=>x.id)),stamp=now();
  const rid=clean(reservationId)||`system-ai:${Date.now()}`;
  const tasks=queue.tasks.map(t=>{
    if(!ids.has(t.id))return t;
    const impact=profiles.get(t.id)||systemAiImpactProfile(t,queue,{at});
    return{
      ...t,status:'running',reservationId:rid,reservedAt:stamp,updatedAt:stamp,blocker:null,
      impactScore:impact.score,impactComponents:impact.components,
      evidence:unique([...(t.evidence||[]),`system-ai-impact-score:${impact.score}`,`system-ai-blocked-task-count:${impact.blockedTaskCount}`,`system-ai-common-bottleneck:${impact.commonBottleneck?'YES':'NO'}`,...(impact.commonBottleneck&&impact.signature?[`system-ai-representative-canary:${impact.signature}`]:[]),...(t.previousReservationId?[`system-ai-handoff-to-reservation:${rid}`]:[])])
    };
  });
  return{queue:{...queue,tasks},reserved:tasks.filter(t=>ids.has(t.id)),reservationId:rid,reclaimed:reclaimed.reclaimed,impactProfiles:Object.fromEntries(chosen.map(t=>[t.id,profiles.get(t.id)]))};
}
export function reserveSystemAiTargets(queueInput,{ids=[],reservationId='',leaseMinutes=30,at=Date.now()}={}){
  const reclaimed=reclaimStaleSystemAiReservations(queueInput,{leaseMinutes,at});
  const queue=reclaimed.queue,active=queue.tasks.filter(t=>t.status==='running');
  const wanted=unique(ids);
  if(!wanted.length)throw new Error('SYSTEM_AI_TARGET_IDS_REQUIRED');
  const byId=new Map(queue.tasks.map(t=>[t.id,t]));
  const chosen=[];
  for(const id of wanted){
    const task=byId.get(id);
    if(!task)throw new Error('SYSTEM_AI_TARGET_NOT_FOUND:'+id);
    if(task.status!=='queued')continue;
    if(!dependencyReady(task,queue))throw new Error('SYSTEM_AI_TARGET_DEPENDENCY_NOT_READY:'+id);
    if([...active,...chosen].some(other=>overlap(task,other)))continue;
    chosen.push(task);
  }
  const chosenIds=new Set(chosen.map(x=>x.id)),stamp=now();
  const rid=clean(reservationId)||`system-ai-target:${Date.now()}`;
  const tasks=queue.tasks.map(t=>chosenIds.has(t.id)?{...t,status:'running',reservationId:rid,reservedAt:stamp,updatedAt:stamp,blocker:null}:t);
  return{queue:{...queue,tasks},reserved:tasks.filter(t=>chosenIds.has(t.id)),reservationId:rid,reclaimed:reclaimed.reclaimed};
}
export function applySystemAiResults(queueInput,results=[]){
  let queue=normalizeSystemAiQueue(queueInput);const byResult=new Map((results||[]).map(r=>[clean(r.taskId),r]).filter(([id])=>id));
  const stamp=now();
  queue={...queue,tasks:queue.tasks.map(task=>{
    const row=byResult.get(task.id);if(!row)return task;
    if(task.status!=='running')return task;
    let outcome=clean(row.outcome).toUpperCase();
    const rowEvidence=unique(row.evidence);
    const mutationEvidence=rowEvidence.some(x=>x.startsWith('source-mutation-sha:'))&&rowEvidence.some(x=>x.startsWith('changed-file:'));
    if(task.sourceMutationRequired===true&&!mutationEvidence&&['PASS','CURRENT_MAIN_SATISFIED'].includes(outcome))outcome='FAIL';
    const baseEvidence=unique([...(task.evidence||[]),...rowEvidence,...(task.sourceMutationRequired===true&&!mutationEvidence?['source-mutation-gate:BLOCKED_UNCHANGED_SOURCE_REVALIDATION']:[])]);
    if(outcome==='CURRENT_MAIN_SATISFIED')return{...task,status:'done',candidateBranch:null,pullRequestUrl:null,lastOutcome:'DETERMINISTIC_CURRENT_MAIN_SATISFIED',blocker:null,evidence:unique([...baseEvidence,'deterministic-current-main-satisfied','worker-self-acceptance:NO']),updatedAt:stamp,reservationId:null,reservedAt:null};
    if(outcome==='PASS'&&row.jointAccepted===true&&clean(task.department).toLowerCase()==='planning-growth-marketing')return{...task,status:'done',candidateBranch:null,pullRequestUrl:clean(row.pullRequestUrl)||null,lastOutcome:'PRIMARY_AI_VIBE_JOINT_ACCEPTED',blocker:null,evidence:unique([...baseEvidence,'primary-ai-vibe-joint-accept:YES']),updatedAt:stamp,reservationId:null,reservedAt:null};
    if(outcome==='PASS')return{...task,status:'awaiting-supervisor',candidateBranch:clean(row.candidateBranch)||null,pullRequestUrl:clean(row.pullRequestUrl)||null,lastOutcome:'PASS',blocker:'primary-ai-review-pending',evidence:baseEvidence,updatedAt:stamp,reservationId:null,reservedAt:null};

    const classification=classifySystemAiFailure({task,result:{...row,outcome}});
    const retryIncrement=classification.retryBudgetConsumed?1:0;
    const retries=task.retries+retryIncrement;
    const unlimited=task.retryPolicy==='UNLIMITED_CAUSAL_REPAIR';
    const retry=unlimited||retries<=task.maxRetries;
    const collaborationEvidence=classification.primaryAiCollaborationRequired?[
      'primary-ai-collaboration:REQUESTED',
      'primary-ai-collaboration-reason:'+classification.failureClass,
      'primary-ai-collaboration-task:'+task.id
    ]:[];
    const evidence=unique([
      ...baseEvidence,
      ...classification.evidence,
      ...collaborationEvidence,
      ...(classification.workerHandoffRecommended?['system-ai-handoff-state:REQUEUE_NEW_WORKER','system-ai-exact-checkpoint-resume:YES']:[]),
      ...(unlimited?['system-ai-retry:UNLIMITED_CAUSAL_REPAIR']:[])
    ]);
    const blocker=task.sourceMutationRequired===true&&!mutationEvidence
      ?'source-mutation-required-before-revalidation'
      :classification.failureClass==='STALE_QA_CONTRACT'
        ?'qa-contract-drift-repair-required'
        :clean(row.blocker)||'system-ai-worker-failed';
    return{...task,status:retry?'queued':'failed',retries,failureClass:classification.failureClass,lastOutcome:outcome||'FAIL',blocker,evidence,updatedAt:stamp,previousReservationId:classification.workerHandoffRecommended?clean(task.reservationId)||task.previousReservationId:task.previousReservationId,reservationId:null,reservedAt:null};
  })};
  return queue;
}

export function handoffMissingSystemAiResults(queueInput,{reservationId='',resultTaskIds=[],at=Date.now()}={}){
  const queue=normalizeSystemAiQueue(queueInput),rid=clean(reservationId);
  if(!rid)throw new Error('SYSTEM_AI_HANDOFF_RESERVATION_REQUIRED');
  const completed=new Set(unique(resultTaskIds));
  const stamp=new Date(at).toISOString();let handedOff=0;
  const tasks=queue.tasks.map(task=>{
    if(task.status!=='running'||clean(task.reservationId)!==rid||completed.has(task.id))return task;
    handedOff+=1;
    const nextHandoff=Math.max(0,Number(task.handoffCount||0))+1;
    return{
      ...task,
      status:'queued',
      blocker:'system-ai-worker-missing-result-handoff',
      previousReservationId:rid,
      handoffCount:nextHandoff,
      reservationId:null,
      reservedAt:null,
      updatedAt:stamp,
      evidence:unique([
        ...(task.evidence||[]),
        'system-ai-handoff-state:MISSING_RESULT_REQUEUED',
        'system-ai-handoff-from-reservation:'+rid,
        'system-ai-handoff-to-reservation:PENDING',
        'system-ai-exact-checkpoint-resume:YES',
        'retry-budget-consumed:NO',
        'learning-penalty:NO',
        ...(nextHandoff>=2?['primary-ai-collaboration:REQUESTED','primary-ai-collaboration-reason:REPEATED_WORKER_HANDOFF','primary-ai-collaboration-task:'+task.id]:[])
      ])
    };
  });
  return{queue:{...queue,tasks},handedOff};
}

export function requeueSystemAiTask(queueInput,{id,reason='primary-ai-rework'}={}){
  const queue=normalizeSystemAiQueue(queueInput),stamp=now();let found=false;
  const tasks=queue.tasks.map(t=>{if(t.id!==clean(id))return t;found=true;return{...t,status:'queued',blocker:clean(reason),candidateBranch:null,pullRequestUrl:null,reservationId:null,reservedAt:null,updatedAt:stamp,evidence:unique([...(t.evidence||[]),`primary-ai-rework:${clean(reason)}`])};});
  if(!found)throw new Error(`SYSTEM_AI_TASK_NOT_FOUND:${clean(id)}`);return{...queue,tasks};
}
export function acceptSystemAiTask(queueInput,{id,evidence=[]}={}){
  const queue=normalizeSystemAiQueue(queueInput),stamp=now();let found=false;
  const tasks=queue.tasks.map(t=>{if(t.id!==clean(id))return t;found=true;if(t.status!=='awaiting-supervisor')throw new Error(`SYSTEM_AI_TASK_NOT_REVIEWABLE:${t.id}:${t.status}`);return{...t,status:'done',blocker:null,lastOutcome:'PRIMARY_AI_ACCEPTED',updatedAt:stamp,evidence:unique([...(t.evidence||[]),...evidence,'primary-ai-review:PASS'])};});
  if(!found)throw new Error(`SYSTEM_AI_TASK_NOT_FOUND:${clean(id)}`);return{...queue,tasks};
}
export function runSystemAiQueue(args={}){
  const file=clean(args.queue)||'.vibe2/system-ai-queue.json',command=clean(args.command).toLowerCase();
  let queue=normalizeSystemAiQueue(readJson(file,{tasks:[]}));
  if(command==='assign-security-recovery'){
    const recoveryFile=clean(args.recovery);
    if(!recoveryFile)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_FILE_REQUIRED');
    const result=assignSecurityRecovery(queue,readJson(recoveryFile,{tasks:[]}),{
      recoveryId:args['recovery-id'],
      decision:args.decision
    });
    writeJson(file,result.queue);
    writeJson(recoveryFile,result.recovery);
    return{command,...result};
  }
  if(command==='review-security-recovery'){
    const recoveryFile=clean(args.recovery);
    if(!recoveryFile)throw new Error('SYSTEM_AI_SECURITY_RECOVERY_FILE_REQUIRED');
    const result=reviewSecurityRecovery(queue,readJson(recoveryFile,{tasks:[]}),{
      recoveryId:args['recovery-id'],
      decision:args.decision,
      evidence:unique(clean(args.evidence).split(','))
    });
    writeJson(file,result.queue);
    writeJson(recoveryFile,result.recovery);
    return{command,...result};
  }
  if(command==='reserve-security-recovery'){
    const result=reserveSecurityRecoveryTask(queue,{id:args.id,reservationId:args.reservation});
    writeJson(file,result.queue);if(clean(args.output))writeJson(args.output,{version:1,reservationId:result.reservationId,tasks:result.reserved});
    return{command,...result};
  }
  if(command==='reserve'){
    const result=reserveSystemAiBatch(queue,{max:Number(args.max||16),reservationId:args.reservation,leaseMinutes:Number(args['lease-minutes']||30)});
    writeJson(file,result.queue);if(clean(args.output))writeJson(args.output,{version:1,reservationId:result.reservationId,tasks:result.reserved});
    return{command,...result};
  }
  if(command==='reserve-targets'){
    const result=reserveSystemAiTargets(queue,{ids:clean(args.ids).split(',').map(clean).filter(Boolean),reservationId:args.reservation,leaseMinutes:Number(args['lease-minutes']||30)});
    writeJson(file,result.queue);if(clean(args.output))writeJson(args.output,{version:1,reservationId:result.reservationId,tasks:result.reserved});
    return{command,...result};
  }
  if(command==='fan-in'){
    const dir=clean(args.results);const rows=[];
    if(dir&&fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort())rows.push(readJson(path.join(dir,name),{}));
    queue=applySystemAiResults(queue,rows);writeJson(file,queue);return{command,queue,results:rows.length};
  }
  if(command==='handoff-missing'){
    const dir=clean(args.results),rows=[];
    if(dir&&fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort())rows.push(readJson(path.join(dir,name),{}));
    const result=handoffMissingSystemAiResults(queue,{reservationId:args.reservation,resultTaskIds:rows.map(row=>row.taskId)});
    writeJson(file,result.queue);return{command,...result};
  }
  if(command==='requeue'){queue=requeueSystemAiTask(queue,{id:args.id,reason:args.reason});writeJson(file,queue);return{command,queue};}
  if(command==='accept'){queue=acceptSystemAiTask(queue,{id:args.id,evidence:unique(clean(args.evidence).split(','))});writeJson(file,queue);return{command,queue};}
  if(command==='summary')return{command,queue,counts:queue.tasks.reduce((m,t)=>(m[t.status]=(m[t.status]||0)+1,m),{})};
  throw new Error(`SYSTEM_AI_QUEUE_COMMAND_UNKNOWN:${command}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=runSystemAiQueue(parseArgs());
  const counts=result.queue.tasks.reduce((m,t)=>(m[t.status]=(m[t.status]||0)+1,m),{});
  console.log(`COMPANY_SYSTEM_AI_QUEUE=${result.command.toUpperCase()}`);
  console.log(`COMPANY_SYSTEM_AI_COUNTS=${JSON.stringify(counts)}`);
  if(Number.isFinite(Number(result.reclaimed)))console.log(`COMPANY_SYSTEM_AI_STALE_RESERVATIONS_RECLAIMED=${Number(result.reclaimed)}`);
}
