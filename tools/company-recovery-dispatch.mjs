// 파일명: tools/company-recovery-dispatch.mjs
// 역할: 복구큐의 queued 작업을 해당 실행 풀(Vibe2/Vibe3 또는 supervised system-AI)로 실제 지시한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isSafeSecurityRepairFile } from './company-recovery-queue.mjs';
import { systemAiRepairWorkIdentity } from './company-system-ai-queue.mjs';

const clean=v=>String(v??'').trim();
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
const now=()=>new Date().toISOString();
const GAME_SOURCE_PREFIXES=['web-games/','roblox-games/','unity-games/','unreal-games/','godot-games/'];
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function clearReservation(t){return{...t,reservationId:null,reservationRunId:null,reservationRunAttempt:0,reservedAt:null};}
function securityRepairFiles(rec={}){
  return uniq((rec.evidence||[])
    .map(clean)
    .filter(x=>x.startsWith('security-repair-file:'))
    .map(x=>clean(x.slice('security-repair-file:'.length)))
    .filter(isSafeSecurityRepairFile));
}

export function dispatchRecovery({recoveryInput={},gameQueueInput={},systemAiQueueInput={},route='all',sourceTaskId=''}={}){
  const stamp=now(), mode=clean(route).toLowerCase(), targetSourceTaskId=clean(sourceTaskId);
  const recovery={...recoveryInput,tasks:(recoveryInput.tasks||[]).map(x=>({...x}))};
  const gameQueue={...gameQueueInput,tasks:(gameQueueInput.tasks||[]).map(x=>({...x}))};
  const systemAi={...systemAiQueueInput,tasks:(systemAiQueueInput.tasks||[]).map(x=>({...x}))};
  const dispatched=[];

  recovery.tasks=recovery.tasks.map(rec=>{
    if(clean(rec.status)!=='queued')return rec;
    if(targetSourceTaskId&&clean(rec.sourceTaskId)!==targetSourceTaskId)return rec;
    const owner=clean(rec.recoveryOwner).toUpperCase();
    if(mode!=='all'&&mode==='vibe'&&owner!=='VIBE2_VIBE3')return rec;
    if(mode!=='all'&&mode==='system-ai'&&owner!=='SYSTEM_AI')return rec;
    const ids=uniq([rec.sourceTaskId,...(rec.relatedTaskIds||[])]);
    let touched=0;
    if(owner==='VIBE2_VIBE3'){
      const set=new Set(ids);
      gameQueue.tasks=gameQueue.tasks.map(task=>{
        if(!set.has(clean(task.id)))return task;
        if(clean(task.status)==='done'||clean(task.status)==='cancelled')return task;
        touched++;
        const running=clean(task.status)==='running';
        return{
          ...(running?task:clearReservation(task)),
          status:running?'running':'queued',
          priority:'critical',
          blocker:running?task.blocker:null,
          retries:running?task.retries:0,
          sourceMutationRequired:rec.sourceMutationRequired!==false,
          sourceMutationBaseline:clean(rec.sourceMutationBaseline||rec.checkpoint)||null,
          evidence:uniq([...(task.evidence||[]),'recovery-queue:'+clean(rec.id),'recovery-strategy:'+clean(rec.recoveryStrategy),'recovery-exact-stage:'+clean(rec.failureStage),'source-mutation-required:YES']),
          updatedAt:stamp
        };
      });
    }else if(owner==='SYSTEM_AI'){
      const sharedCanary=clean(rec.sourceQueue).toLowerCase()==='system-ai'&&clean(rec.blastRadius).startsWith('shared-worker-contract:');
      if(sharedCanary){
        const proposedRepairTaskId='recovery-'+clean(rec.id);
        const proposedRepairTask={
          id:proposedRepairTaskId,status:'queued',priority:'critical',department:'recovery',taskType:'bottleneck-repair',
          gameId:null,
          goal:clean(rec.goal)||`Repair shared System AI infrastructure failure ${clean(rec.failureSignature)} and release the dependent cohort only after deterministic verification.`,
          responsibleFiles:uniq(rec.responsibleFiles),contextFiles:uniq(rec.contextFiles),
          failureStage:clean(rec.failureStage)||null,failureSignature:clean(rec.failureSignature)||null,
          relatedTaskIds:ids,blockedTaskIds:ids,blastRadius:clean(rec.blastRadius)||null,recurrenceCount:Math.max(1,ids.length),
          sourceMutationRequired:true,sourceMutationBaseline:clean(rec.sourceMutationBaseline||rec.checkpoint)||null,
          acceptanceCriteria:['repair only assigned System AI infrastructure files','produce a real responsible-source mutation','rerun deterministic System AI worker QA','clear the repeated shared failure signature','release dependent cohort only after repair task is done','no central policy write','no self acceptance'],
          verificationCommands:uniq(rec.verificationPlan),
          dependencies:[],retries:0,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,reservationId:null,reservedAt:null,candidateBranch:null,pullRequestUrl:null,lastOutcome:null,blocker:null,
          evidence:uniq([...(rec.evidence||[]),'recovery-queue:'+clean(rec.id),'shared-signature-canary:YES','shared-signature:'+clean(rec.failureSignature),'cohort-size:'+ids.length,'learning-route:existing-vibe-learning-motor','primary-ai-collaboration:REQUESTED']),
          supervisorReviewRequired:true,workerSelfAcceptance:false,learningCandidate:true,createdAt:stamp,updatedAt:stamp
        };
        const proposedIdentity=systemAiRepairWorkIdentity(proposedRepairTask);
        const terminalStatuses=new Set(['done','completed','cancelled','verified']);
        const existingRepair=systemAi.tasks.find(task=>
          !terminalStatuses.has(clean(task.status).toLowerCase())
          &&systemAiRepairWorkIdentity(task)===proposedIdentity
        )||null;
        const repairTaskId=clean(existingRepair?.id)||proposedRepairTaskId;
        const set=new Set(ids);
        systemAi.tasks=systemAi.tasks.map(task=>{
          if(!set.has(clean(task.id))||clean(task.status)==='done')return task;
          touched++;
          return{
            ...clearReservation(task),
            status:'queued',
            priority:'critical',
            dependencies:uniq([...(task.dependencies||[]),repairTaskId]),
            blocker:'shared-signature-canary-pending:'+repairTaskId,
            evidence:uniq([...(task.evidence||[]),'recovery-queue:'+clean(rec.id),'shared-signature-canary:'+repairTaskId,'shared-signature:'+clean(rec.failureSignature)]),
            updatedAt:stamp
          };
        });
        if(existingRepair){
          systemAi.tasks=systemAi.tasks.map(task=>clean(task.id)!==repairTaskId?task:{
            ...task,
            relatedTaskIds:uniq([...(task.relatedTaskIds||[]),...ids]),
            blockedTaskIds:uniq([...(task.blockedTaskIds||[]),...ids]),
            recurrenceCount:Math.max(Number(task.recurrenceCount||0),ids.length),
            evidence:uniq([
              ...(task.evidence||[]),
              ...(rec.evidence||[]),
              'recovery-queue:'+clean(rec.id),
              'system-ai-producer-dedupe:REUSED_EXISTING_REPAIR',
              'primary-ai-collaboration:REQUESTED',
              'primary-ai-collaboration-task:'+repairTaskId
            ]),
            updatedAt:stamp
          });
          touched++;
        }else{
          systemAi.tasks.push({
            ...proposedRepairTask,
            evidence:uniq([...(proposedRepairTask.evidence||[]),'primary-ai-collaboration-task:'+repairTaskId])
          });
          touched++;
        }
      }else{
        const set=new Set(ids);
        systemAi.tasks=systemAi.tasks.map(task=>{
          if(!set.has(clean(task.id)))return task;
          if(clean(task.status)==='done')return task;
          touched++;
          const running=clean(task.status)==='running';
          return{
            ...task,
            status:running?'running':'queued',
            priority:'critical',
            retries:running?task.retries:0,
            blocker:running?task.blocker:null,
            reservationId:running?task.reservationId:null,
            reservedAt:running?task.reservedAt:null,
            failureStage:clean(rec.failureStage)||task.failureStage||null,
            failureSignature:clean(rec.failureSignature)||task.failureSignature||null,
            relatedTaskIds:uniq([...(task.relatedTaskIds||[]),...ids]),
            blockedTaskIds:uniq([...(task.blockedTaskIds||[]),...ids.filter(id=>id!==clean(task.id))]),
            blastRadius:clean(rec.blastRadius)||task.blastRadius||null,
            recurrenceCount:Math.max(Number(task.recurrenceCount||0),Number(rec.recurrenceCount||0),ids.length),
            gameRepairContract:{
              ...(task.gameRepairContract||{}),
              version:1,
              mode:Math.max(Number(task.recurrenceCount||0),Number(rec.recurrenceCount||0),ids.length)>=3?'ROOT_CAUSE_MODE':'FOCUSED_REPAIR',
              prePatchReproductionRequired:true,
              causalResponsibleSystemRequired:true,
              originalScenarioReplayRequired:true,
              invariantValidationRequired:true,
              impactRegressionRequired:true,
              fullRegressionFanInRequired:true,
              multiplayerUserAssistanceRequired:false
            },
            sourceMutationRequired:rec.sourceMutationRequired!==false,
            sourceMutationBaseline:clean(rec.sourceMutationBaseline||rec.checkpoint)||null,
            evidence:uniq([...(task.evidence||[]),'recovery-queue:'+clean(rec.id),'recovery-strategy:'+clean(rec.recoveryStrategy),'recovery-exact-stage:'+clean(rec.failureStage),'failure-cause:'+clean(rec.failureSignature),'source-mutation-required:YES']),
            updatedAt:stamp
          };
        });
      }
      if(touched===0&&clean(rec.sourceQueue).toLowerCase()==='vibe2'&&uniq(rec.responsibleFiles).length){
        const taskId='recovery-'+clean(rec.id);
        const exists=systemAi.tasks.some(task=>clean(task.id)===taskId);
        if(!exists){
          const gameSourceWrite=uniq(rec.responsibleFiles).some(file=>GAME_SOURCE_PREFIXES.some(prefix=>clean(file).startsWith(prefix)));
          const recurrenceCount=Math.max(1,Number(rec.recurrenceCount||0),ids.length);
          const repairMode=recurrenceCount>=3?'ROOT_CAUSE_MODE':'FOCUSED_REPAIR';
          const saveRepairRequired=uniq(rec.evidence).some(value=>/(?:save|load|migration|persist|storage|저장|불러오기)/i.test(value));
          const multiplayerRepairRequired=uniq(rec.evidence).some(value=>/(?:multiplayer|network|sync|join|rejoin|server|client|remote|멀티|협동|동기화)/i.test(value));
          systemAi.tasks.push({
            id:taskId,status:'queued',priority:'critical',department:'recovery',taskType:'bottleneck-repair',
            gameId:clean(rec.gameId)||null,
            goal:clean(rec.goal)||`Repair exact failed stage ${clean(rec.failureStage)} for recovery ${clean(rec.id)} without expanding scope. Failure signature: ${clean(rec.failureSignature)}.`,
            responsibleFiles:uniq(rec.responsibleFiles),contextFiles:uniq(rec.contextFiles),
            failureStage:clean(rec.failureStage)||null,failureSignature:clean(rec.failureSignature)||null,
            relatedTaskIds:ids,blockedTaskIds:ids,blastRadius:clean(rec.blastRadius)||null,recurrenceCount,
            sourceMutationRequired:true,sourceMutationBaseline:clean(rec.sourceMutationBaseline||rec.checkpoint)||null,
            gameRepairContract:{
              version:1,mode:repairMode,
              prePatchReproductionRequired:true,
              causalResponsibleSystemRequired:true,
              compareLastKnownGoodFirstBrokenCurrentRequired:repairMode==='ROOT_CAUSE_MODE',
              originalScenarioReplayRequired:true,
              invariantValidationRequired:true,
              saveMigrationValidationRequired:saveRepairRequired,
              multiplayerLifecycleValidationRequired:multiplayerRepairRequired,
              multiplayerUserAssistanceRequired:false,
              multiplayerMinimumAutomatedClients:multiplayerRepairRequired?2:0,
              impactRegressionRequired:true,
              fullRegressionFanInRequired:true,
              repeatedSameApproachWithoutNewCausalEvidenceForbidden:repairMode==='ROOT_CAUSE_MODE'
            },
            acceptanceCriteria:[
              'repair only assigned responsible files',
              'reproduce the exact failure before patch or preserve existing verified reproduction evidence',
              'identify the causal responsible system before widening scope',
              ...(repairMode==='ROOT_CAUSE_MODE'?['stop micro patch accumulation','compare last known good first broken and current revisions when history exists','reclassify implementation design mixed or unresolved cause before another repair approach']:[]),
              'produce a real responsible-source mutation before rerunning the same failed signature',
              'unchanged-source revalidation is forbidden',
              'rerun the original player-visible failure scenario after source mutation',
              'validate affected game-state invariants',
              ...(saveRepairRequired?['validate old-save load migration play save and reload without silent progress loss']:[]),
              ...(multiplayerRepairRequired?['machine-run at least two clients through join play leave rejoin late-join and authoritative sync; user assistance is not required or accepted as pass evidence']:[]),
              'run impact-scoped regression',
              'full regression fan-in remains required before acceptance',
              'preserve verified checkpoint and gameplay semantics',
              'no central policy write',
              'no self acceptance'
            ],
            verificationCommands:uniq(rec.verificationPlan),
            dependencies:[],retries:0,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,reservationId:null,reservedAt:null,candidateBranch:null,pullRequestUrl:null,lastOutcome:null,blocker:null,
            evidence:uniq([
              ...(rec.evidence||[]),
              'recovery-queue:'+clean(rec.id),
              'recovery-exact-stage:'+clean(rec.failureStage),
              'system-ai-scoped-game-repair:'+(gameSourceWrite?'YES':'NO'),
              'game-repair-mode:'+repairMode,
              'game-repair-repeat-count:'+recurrenceCount,
              'game-repair-save-migration:'+(saveRepairRequired?'REQUIRED':'NOT_APPLICABLE'),
              'game-repair-multiplayer-lifecycle:'+(multiplayerRepairRequired?'MACHINE_REQUIRED':'NOT_APPLICABLE'),
              'learning-route:existing-vibe-learning-motor',
              'primary-ai-collaboration:REQUESTED',
              'primary-ai-collaboration-task:'+taskId
            ]),
            supervisorReviewRequired:true,workerSelfAcceptance:false,learningCandidate:true,createdAt:stamp,updatedAt:stamp
          });
          touched++;
        }
      }
    }else return rec;
    if(touched===0){
      if(owner==='SYSTEM_AI'&&clean(rec.sourceQueue).toLowerCase()==='security'){
        const repairFiles=securityRepairFiles(rec);
        return{
          ...rec,
          status:repairFiles.length?'blocked-primary-ai-assignment-required':'blocked-executor-missing',
          dispatchEvidence:uniq([
            ...(rec.dispatchEvidence||[]),
            'security-recovery-executor-missing',
            ...(repairFiles.length?['primary-ai-assignment-required',...repairFiles.map(file=>'primary-ai-repair-file:'+file)]:[]),
            'recovery-dispatch-blocked-at:'+stamp
          ]),
          updatedAt:stamp
        };
      }
      return rec;
    }
    dispatched.push({id:rec.id,owner,touched});
    return{...rec,status:'dispatched',dispatchEvidence:uniq([...(rec.dispatchEvidence||[]),'recovery-dispatched:'+owner.toLowerCase(),'recovery-dispatched-at:'+stamp]),updatedAt:stamp};
  });
  return{recovery,gameQueue,systemAi,dispatched};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const recoveryFile=clean(args.recovery)||'.vibe2/recovery-queue.json';
  const gameFile=clean(args.queue)||'.vibe2/queue.json';
  const systemFile=clean(args['system-ai'])||'.vibe2/system-ai-queue.json';
  const result=dispatchRecovery({
    recoveryInput:readJson(recoveryFile,{tasks:[]}),
    gameQueueInput:readJson(gameFile,{tasks:[]}),
    systemAiQueueInput:readJson(systemFile,{tasks:[]}),
    route:clean(args.route)||'all',
    sourceTaskId:args['source-task']
  });
  writeJson(recoveryFile,result.recovery);
  if(['all','vibe'].includes(clean(args.route||'all').toLowerCase()))writeJson(gameFile,result.gameQueue);
  if(['all','system-ai'].includes(clean(args.route||'all').toLowerCase()))writeJson(systemFile,result.systemAi);
  console.log('RECOVERY_DISPATCH_COUNT='+result.dispatched.length);
  for(const row of result.dispatched)console.log('RECOVERY_DISPATCH='+row.id+':'+row.owner+':'+row.touched);
}
