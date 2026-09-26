// 파일명: tools/vibe2-fan-in-review.mjs
// 역할: 전체 회귀가 통과한 뒤 package별 필수 역할 증거를 확인하고 review 결과를 queue에 기록한다.
// 원칙: 게임 소스는 수정하지 않고 queue 증거만 갱신한다. 탐색·구현·QA·성능 중 하나라도 실패/누락이면 review PASS 금지.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSupervisedWebExperienceReview } from './vibe2-experience-control.mjs';
import { buildObservableCodingTrace, buildVerifiedCapabilityExperienceReview, buildCapabilityApplicationReviews, buildCapabilityBenchmarkReviews, buildPairedCapabilityBenchmarkReviews, mergeCodingTraceLedger } from './vibe2-capability-distillation.mjs';
import { verifyNeuralRootCause, neuralRootCauseEvidence } from './vibe2-neural-root-cause.mjs';
import { simulateNeuralEventRoute, neuralEventRouteEvidence } from './vibe2-neural-event-router.mjs';
import { buildNeuralShadowAudit, neuralShadowAuditEvidence, summarizeDurableNeuralShadowAudit } from './vibe2-neural-shadow-audit.mjs';
import { evaluatePhase2Readiness } from './vibe2-neural-phase2-readiness.mjs';
import { summarizeNeuralWorkGraphEvidence } from './vibe2-neural-work-graph.mjs';
import { auditVibeRuntimeBeforeAfterComparison } from '../assets/vibe-visual-quality-gate.js';

const clean=value=>String(value??'').trim();
const REQUIRED_ROLES=Object.freeze(['exploration','implementation','test','performance']);

function readJson(file,fallback={}){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function resultsFromPayload(payload={}){return(Array.isArray(payload)?payload:payload.results||[]).filter(row=>row&&typeof row==='object');}
function taskIdsFromPayload(payload={}){return[...new Set(resultsFromPayload(payload).map(row=>clean(row?.taskId)).filter(Boolean))];}
function posix(value){return clean(value).replaceAll('\\\\','/').replace(/^\.\//,'').replace(/\/+$/,'');}
function resultCandidateBranch(row={}){const explicit=clean(row?.candidateBranch);if(explicit)return explicit;return(row?.evidence||[]).map(clean).filter(value=>value.startsWith('vibe2/candidate/')).at(-1)||null;}
function resultSampleId(row={}){
  return[
    clean(row?.taskId),
    clean(row?.reservationId||row?.metrics?.reservationId),
    clean(row?.variant)||'primary',
    resultCandidateBranch(row)
  ].filter(Boolean).join('|')||null;
}
function candidateIdentityFailures(task={},row={},candidateBranch=null){
  const identity=row?.candidateIdentity&&typeof row.candidateIdentity==='object'?row.candidateIdentity:{};
  const failures=[];
  if(clean(row?.outcome).toUpperCase()!=='PASS')failures.push('candidate-result-pass');
  if(candidateBranch&&resultCandidateBranch(row)!==candidateBranch)failures.push('candidate-branch-identity');
  if(clean(identity.taskId)!==clean(task.id))failures.push('candidate-identity-task');
  if(clean(task.gameId)&&clean(identity.gameId)!==clean(task.gameId))failures.push('candidate-identity-game');
  if(clean(task.target)&&clean(identity.target).toLowerCase()!==clean(task.target).toLowerCase())failures.push('candidate-identity-target');
  if(posix(task.sourceRoot)&&posix(identity.sourceRoot)!==posix(task.sourceRoot))failures.push('candidate-identity-source-root');
  if(!clean(row?.baseMainSha)||clean(identity.baseMainSha)!==clean(row?.baseMainSha))failures.push('candidate-identity-base-main');
  return failures;
}
function studioQualityImplementationFailures(task={},row={}){
  const contract=task?.studioQualityEvolution&&typeof task.studioQualityEvolution==='object'?task.studioQualityEvolution:null;
  if(!contract||contract.realSourceDeltaRequired!==true)return[];
  const delta=row?.studioQualityCandidateDelta&&typeof row.studioQualityCandidateDelta==='object'
    ?row.studioQualityCandidateDelta
    :row?.codingMethod?.semanticDiffEnforcement?.studioQualityDelta&&typeof row.codingMethod.semanticDiffEnforcement.studioQualityDelta==='object'
      ?row.codingMethod.semanticDiffEnforcement.studioQualityDelta
      :null;
  if(!delta||delta.pass!==true)return['studio-quality-implementation-delta'];
  const phase=clean(contract.phase).toUpperCase();
  const minimum=phase==='BUILD_UP'?Math.max(1,Math.floor(Number(contract?.requiredConnectedImprovements?.min||3)||3)):1;
  if(Number(delta.sourceDeltaUnits||0)<minimum)return['studio-quality-connected-improvements'];
  if(clean(contract.focusPillar).toUpperCase()==='PRESENTATION'&&Number(delta.visualUnits||0)<2)return['studio-quality-presentation-delta'];
  return[];
}

function gameRepairEvidenceFailures(row={}){
  const repair=row?.gameRepairQa&&typeof row.gameRepairQa==='object'?row.gameRepairQa:null;
  if(!repair||repair.required!==true)return[];
  const failures=[];
  if(repair.prePatchReproduced!==true)failures.push('game-repair-prepatch-reproduction');
  if(!clean(repair.responsibleSystem))failures.push('game-repair-responsible-system');
  if(clean(repair.originalScenarioReplay)!=='PASS')failures.push('game-repair-original-scenario');
  if(clean(repair.invariants)!=='PASS')failures.push('game-repair-invariants');
  if(!['PASS','NOT_APPLICABLE'].includes(clean(repair.saveMigration)))failures.push('game-repair-save-migration');
  if(!['PASS_AUTOMATED_HARNESS','NOT_APPLICABLE'].includes(clean(repair.multiplayerLifecycle)))failures.push('game-repair-multiplayer-lifecycle');
  if(clean(repair.multiplayerLifecycle)!=='NOT_APPLICABLE'&&repair?.multiplayerAutomation?.userAssistanceRequired!==false)failures.push('game-repair-multiplayer-must-be-machine-verified');
  if(repair.readyForFanIn!==true)failures.push('game-repair-ready-for-fan-in');
  return[...new Set(failures)];
}
function presentationRuntimeVisualDecision(task={},row={}){
  const evidence=new Set((task?.evidence||[]).map(clean).filter(Boolean));
  const required=task?.studioQualityEvolution?.visibleRenderDeltaRequired===true
    ||evidence.has('graphics-evolution-before-after-comparison-required');
  if(!required)return{required:false,deferred:false,pass:true,audit:null};
  const target=clean(task?.target).toLowerCase();
  if(target!=='web')return{required:true,deferred:true,pass:false,audit:null,target};
  const payload=row?.presentationQuality?.runtimeVisualComparison&&typeof row.presentationQuality.runtimeVisualComparison==='object'
    ?row.presentationQuality.runtimeVisualComparison:{};
  const audit=auditVibeRuntimeBeforeAfterComparison(payload);
  return{required:true,deferred:false,pass:audit.pass,audit,target};
}
function rolePass(evidence,role){return evidence.has(`role-result:${role}:PASS`);}
function reviewReady(task={}){return clean(task.status)==='running'&&/candidate-awaiting-qa-and-deployment|awaiting.*fan-in|awaiting.*qa|awaiting.*supervised-review/i.test(clean(task.blocker));}
function releaseCandidateFromEvidence(evidence=new Set()){
  const branches=[...evidence].map(clean).filter(value=>value.startsWith('vibe2/candidate/'));
  return branches.at(-1)||null;
}
const SPECIALIZED_FINAL_MARKERS=Object.freeze(new Set([
  'VERIFIED_GAME_VISUAL_DNA_COMPATIBILITY_PASS',
  'VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',
  'VERIFIED_STREAMING_MOBILE_BUDGET_PASS',
  'VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS',
  'VERIFIED_QUEST_GRAPH_PASS',
  'VERIFIED_CHARACTER_PERSONA_VOICE_MEMORY_PASS',
  'VERIFIED_WORLD_NARRATIVE_STATE_PASS'
]));
function specializedNativeRuntimeEvidence(request={},combinedEvidence=[]){
  if(request?.nativeRuntimeRequired!==true)return{pass:true,evidence:null};
  const target=clean(request?.target).toLowerCase();
  const patterns=target==='roblox'?[/^roblox-verification-run:/i]
    :target==='unity'?[/^unity-verification-run:/i]
    :[];
  const hit=combinedEvidence.find(value=>patterns.some(re=>re.test(clean(value))))||null;
  return{pass:Boolean(hit),evidence:hit};
}
function resolveSpecializedFinalVerification({task={},row={},evidence=new Set()}={}){
  const request=row?.specializedVerificationRequest&&typeof row.specializedVerificationRequest==='object'?row.specializedVerificationRequest:null;
  if(!request||request.required!==true)return{markers:[],trace:[],blocked:[]};
  const qa=row?.specializedVerificationQa&&typeof row.specializedVerificationQa==='object'?row.specializedVerificationQa:null;
  const requested=[...new Set((request.requestedMarkers||[]).map(clean).filter(Boolean))];
  const blocked=[];
  const trace=[];
  if(clean(qa?.status)!=='FOCUSED_STATIC_PASS')blocked.push('FOCUSED_QA_NOT_PASS');
  if(clean(qa?.finalMarkerAuthority)!=='FAN_IN_ONLY')blocked.push('FINAL_MARKER_AUTHORITY_INVALID');
  const unknown=requested.filter(marker=>!SPECIALIZED_FINAL_MARKERS.has(marker));
  if(unknown.length)blocked.push('UNKNOWN_MARKER:'+unknown.join(','));
  const notFocused=requested.filter(marker=>qa?.results?.[marker]?.pass!==true);
  if(notFocused.length)blocked.push('FOCUSED_MARKER_NOT_PASS:'+notFocused.join(','));
  if(!evidence.has('role-result:regression:PASS'))blocked.push('FULL_REGRESSION_NOT_PASS');
  if(!evidence.has('role-result:review:PASS'))blocked.push('FAN_IN_REVIEW_NOT_PASS');
  const combined=[...evidence,...((row?.evidence||[]).map(clean).filter(Boolean))];
  const native=specializedNativeRuntimeEvidence(request,combined);
  if(!native.pass)blocked.push('AUTHORITATIVE_TARGET_ENGINE_QA_MISSING');
  if(blocked.length)return{markers:[],trace:['specialized-final-verification:BLOCKED',...blocked.map(value=>'specialized-final-blocker:'+value)],blocked};
  if(native.evidence)trace.push('specialized-native-runtime-evidence:'+native.evidence);
  trace.push('specialized-final-verification:PASS','specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION');
  return{markers:requested.filter(marker=>SPECIALIZED_FINAL_MARKERS.has(marker)),trace,blocked:[]};
}

export function finalizePostNativeSpecializedReview({queue={},candidateBranch='',target=''}={}){
  const branch=clean(candidateBranch);
  const normalizedTarget=clean(target).toLowerCase();
  if(!branch.startsWith('vibe2/candidate/'))return{queue,updated:false,reason:'CANDIDATE_BRANCH_REQUIRED',taskId:null,markers:[]};
  if(!['roblox','unity'].includes(normalizedTarget))return{queue,updated:false,reason:'SUPPORTED_NATIVE_TARGET_REQUIRED',taskId:null,markers:[]};
  const tasks=Array.isArray(queue?.tasks)?queue.tasks:[];
  const index=tasks.findIndex(task=>
    clean(task?.target).toLowerCase()===normalizedTarget
    &&(task?.evidence||[]).map(clean).includes(branch)
  );
  if(index<0)return{queue,updated:false,reason:'CANDIDATE_TASK_NOT_FOUND',taskId:null,markers:[]};
  const task=tasks[index];
  const evidence=new Set((task?.evidence||[]).map(clean).filter(Boolean));
  const expectedBlocker=`candidate-${normalizedTarget}-verification-passed-awaiting-review`;
  if(clean(task?.status)!=='blocked'||clean(task?.blocker)!==expectedBlocker){
    return{queue,updated:false,reason:'TASK_NOT_POST_NATIVE_REVIEW_READY',taskId:clean(task?.id)||null,markers:[]};
  }
  if(!evidence.has('specialized-verification-request:REQUIRED')){
    return{queue,updated:false,reason:'SPECIALIZED_VERIFICATION_NOT_REQUESTED',taskId:clean(task?.id)||null,markers:[]};
  }
  const focusedPrefix='specialized-focused-qa-pass:';
  const requested=[...new Set([...evidence]
    .filter(value=>value.startsWith(focusedPrefix))
    .map(value=>clean(value.slice(focusedPrefix.length)))
    .filter(marker=>SPECIALIZED_FINAL_MARKERS.has(marker)))];
  if(!requested.length){
    return{queue,updated:false,reason:'NO_FOCUSED_SPECIALIZED_PASS',taskId:clean(task?.id)||null,markers:[]};
  }
  const blocked=[];
  if(!evidence.has('role-result:regression:PASS'))blocked.push('FULL_REGRESSION_NOT_PASS');
  if(!evidence.has('role-result:review:PASS'))blocked.push('FAN_IN_REVIEW_NOT_PASS');
  if(!evidence.has('verification-conclusion:success'))blocked.push('TARGET_ENGINE_QA_CONCLUSION_NOT_PASS');
  if(![...evidence].some(value=>value.startsWith('candidate-head-sha:')))blocked.push('CANDIDATE_HEAD_EVIDENCE_MISSING');
  const native=specializedNativeRuntimeEvidence({nativeRuntimeRequired:true,target:normalizedTarget},[...evidence]);
  if(!native.pass)blocked.push('AUTHORITATIVE_TARGET_ENGINE_QA_MISSING');
  if(blocked.length){
    return{queue,updated:false,reason:'POST_NATIVE_SPECIALIZED_BLOCKED',taskId:clean(task?.id)||null,markers:[],blocked};
  }
  const additions=[
    ...requested,
    native.evidence?`specialized-native-runtime-evidence:${native.evidence}`:'',
    'specialized-final-verification:PASS',
    'specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION',
    'specialized-post-native-review:PASS'
  ].filter(Boolean);
  const nextEvidence=[...new Set([...(task.evidence||[]),...additions])];
  const changed=nextEvidence.length!==(task.evidence||[]).length;
  if(!changed)return{queue,updated:false,reason:'ALREADY_FINALIZED',taskId:clean(task?.id)||null,markers:requested};
  const nextTasks=tasks.map((row,i)=>i===index?{...row,evidence:nextEvidence}:row);
  return{
    queue:{...queue,tasks:nextTasks},
    updated:true,
    reason:'POST_NATIVE_SPECIALIZED_FINALIZED',
    taskId:clean(task?.id)||null,
    markers:requested,
    nativeEvidence:native.evidence,
    taskStatusPreserved:true,
    releaseDecisionChanged:false
  };
}

export function runPostNativeSpecializedReview({queueFile='.vibe2/queue.json',candidateBranch='',target=''}={}){
  const queue=readJson(queueFile,{tasks:[]});
  const result=finalizePostNativeSpecializedReview({queue,candidateBranch,target});
  if(result.updated)writeJson(queueFile,result.queue);
  return result;
}

export function finalizeVibe2FanInReview({queue={},results=[],taskIds=[]}={}){
  const resultRows=Array.isArray(results)?results.filter(row=>row&&typeof row==='object'):[];
  const ids=new Set([...(taskIds||[]).map(clean),...resultRows.map(row=>clean(row?.taskId))].filter(Boolean));
  const reviewed=[];
  const skipped=[];
  const releaseCandidates=[];
  const experienceReviews=[];
  const capabilityApplicationReviews=[];
  const capabilityBenchmarkReviews=[];
  const queueTasks=Array.isArray(queue.tasks)?queue.tasks:[];
  const taskById=new Map(queueTasks.map(task=>[clean(task?.id),task]));
  const verifiedCodingTraceSamples=new Set();
  const selectedResultByTaskId=new Map();
  const tasks=queueTasks.map(task=>{
    if(!ids.has(clean(task.id)))return task;
    if(!reviewReady(task)){skipped.push({taskId:task.id,status:clean(task.status),blocker:clean(task.blocker)||null});return task;}
    const evidence=new Set((task.evidence||[]).map(clean).filter(Boolean));
    evidence.add('role-result:regression:PASS');
    const missing=REQUIRED_ROLES.filter(role=>!rolePass(evidence,role));
    const candidateBranch=releaseCandidateFromEvidence(evidence);
    let selectedResult=null;
    let presentationRuntimeVisual=null;
    if(!candidateBranch)missing.push('candidate-branch');
    else{
      const rows=resultRows.filter(row=>clean(row?.taskId)===clean(task.id));
      selectedResult=rows.find(row=>resultCandidateBranch(row)===candidateBranch)||rows.find(row=>clean(row?.outcome).toUpperCase()==='PASS')||null;
      if(!selectedResult)missing.push('candidate-identity-result');
      else {
        missing.push(...candidateIdentityFailures(task,selectedResult,candidateBranch));
        missing.push(...studioQualityImplementationFailures(task,selectedResult));
        missing.push(...gameRepairEvidenceFailures(selectedResult));
        presentationRuntimeVisual=presentationRuntimeVisualDecision(task,selectedResult);
        if(presentationRuntimeVisual.required){
          if(presentationRuntimeVisual.deferred){
            evidence.add('graphics-evolution-before-after-comparison:PENDING_TARGET_RUNTIME');
          }else if(presentationRuntimeVisual.pass){
            evidence.add('graphics-evolution-before-after-comparison:PASS');
            evidence.add('presentation-runtime-before-after-audit:PASS');
            evidence.add(`presentation-runtime-before-after-baseline:${presentationRuntimeVisual.audit.baselineRevision}`);
            evidence.add(`presentation-runtime-before-after-candidate:${presentationRuntimeVisual.audit.candidateRevision}`);
            evidence.add(`presentation-runtime-before-after-method:${presentationRuntimeVisual.audit.comparisonMethod}`);
          }else{
            evidence.add('graphics-evolution-before-after-comparison:BLOCKED');
            for(const reason of presentationRuntimeVisual.audit?.reasons||[])evidence.add(`presentation-runtime-before-after-blocker:${reason}`);
            missing.push('presentation-runtime-before-after-comparison');
          }
        }
      }
    }
    const uniqueMissing=[...new Set(missing)];
    if(uniqueMissing.length){
      evidence.add('role-result:review:BLOCKED');
      evidence.add(`package-review-missing:${uniqueMissing.join('|')}`);
      evidence.add('fan-in-review-task-local-requeue:YES');
      reviewed.push({
        taskId:task.id,
        sampleId:selectedResult?resultSampleId(selectedResult):clean(task.id),
        pass:false,
        missing:uniqueMissing,
        presentationRuntimeVisual,
        taskLocalRequeue:true
      });
      return{
        ...task,
        status:'queued',
        blocker:null,
        reservationId:null,
        reservationRunId:null,
        reservationRunAttempt:0,
        reservedAt:null,
        neuronExpectedVariants:0,
        neuronResults:[],
        lastOutcome:'FAN_IN_REVIEW_BLOCKED_REQUEUE',
        evidence:[...evidence]
      };
    }else{
      evidence.add('role-result:review:PASS');
      evidence.add('package-review:all-required-roles-pass');
      evidence.add('candidate-identity:PASS');
      if(task?.studioQualityEvolution?.realSourceDeltaRequired===true)evidence.add('studio-quality-implementation-delta:PASS');
      if(selectedResult?.gameRepairQa?.required===true){
        evidence.add('game-repair-source-evidence:PASS');
        evidence.add('game-repair-impact-regression:PASS');
        evidence.add('game-repair-full-regression:PASS');
        evidence.add('game-repair-user-assistance-required:NO');
      }
      verifiedCodingTraceSamples.add(resultSampleId(selectedResult)||clean(task.id));
      if(selectedResult)selectedResultByTaskId.set(clean(task.id),selectedResult);
      const rootCause=verifyNeuralRootCause({
        diagnosis:selectedResult?.neuralDiagnosis||task?.neuralDiagnosis||null,
        evidence:[...evidence,...((selectedResult?.evidence||[]).map(clean).filter(Boolean))],
        sampleId:resultSampleId(selectedResult)||clean(task.id),
        verificationStage:'FAN_IN_REVIEW'
      });
      for(const marker of neuralRootCauseEvidence(rootCause))evidence.add(marker);
      const neuralEventRoute=simulateNeuralEventRoute({
        event:{
          id:[resultSampleId(selectedResult)||clean(task.id),'CI_RESULT'].filter(Boolean).join('|'),
          type:'CI_RESULT',
          taskId:clean(task.id),
          gameId:clean(task.gameId),
          outcome:'PASS',
          stage:'FAN_IN_REVIEW',
          evidence:[...evidence]
        },
        diagnosis:selectedResult?.neuralDiagnosis||task?.neuralDiagnosis||null,
        rootCause,
        policyFresh:!evidence.has('CENTRAL_POLICY_STALE_OR_INVALID'),
        lockConflict:false,
        securityBlocked:evidence.has('SECURITY_POLICY_BLOCK'),
        gatedExecutionEnabled:true
      });
      for(const marker of neuralEventRouteEvidence(neuralEventRoute))evidence.add(marker);
      const supervised=task?.supervisionContract?.required===true
        ||evidence.has('supervised-web-build:required')
        ||clean(task?.productionMode)==='SUPERVISED_VIBE_COAUTHORING';
      const supervisionReview=task?.supervisionReview&&typeof task.supervisionReview==='object'?task.supervisionReview:null;
      const supervisionDecision=clean(supervisionReview?.decision).toUpperCase();
      const supervisionVerified=supervisionReview?.verified===true;
      let supervisorNeuralEventRoute=null;
      if(supervised&&supervisionVerified){
        const supervisorOutcome=supervisionDecision||'REVISE';
        const supervisorEvidence=[...new Set([
          ...evidence,
          ...((supervisionReview?.evidence||[]).map(clean).filter(Boolean))
        ])];
        supervisorNeuralEventRoute=simulateNeuralEventRoute({
          event:{
            id:[resultSampleId(selectedResult)||clean(task.id),'SUPERVISOR_RESULT',supervisorOutcome].filter(Boolean).join('|'),
            type:'SUPERVISOR_RESULT',
            taskId:clean(task.id),
            gameId:clean(task.gameId),
            outcome:supervisorOutcome,
            stage:'ASSISTANT_SUPERVISION_REVIEW',
            signature:clean(supervisionReview?.id)||clean(supervisionReview?.rationale)||clean(supervisionReview?.reason)||null,
            evidence:supervisorEvidence
          },
          diagnosis:selectedResult?.neuralDiagnosis||task?.neuralDiagnosis||null,
          rootCause,
          policyFresh:!evidence.has('CENTRAL_POLICY_STALE_OR_INVALID'),
          lockConflict:false,
          securityBlocked:evidence.has('SECURITY_POLICY_BLOCK'),
          gatedExecutionEnabled:true
        });
        for(const marker of neuralEventRouteEvidence(supervisorNeuralEventRoute))evidence.add(marker);
        evidence.add('assistant-atomic-neuron:connected');
        evidence.add(`assistant-supervisor-result:${supervisorOutcome}`);
      }
      if(supervised&&supervisionVerified&&selectedResult){
        experienceReviews.push(buildSupervisedWebExperienceReview({task,candidateResult:selectedResult,supervisionReview}));
      }
      const supervisionApproved=!supervised||(task?.supervisionApproved===true&&supervisionVerified&&supervisionDecision==='PASS');
      if(supervised&&!supervisionApproved){
        evidence.add('supervised-promotion:BLOCKED');
        evidence.add(supervisionVerified?`supervised-review:${supervisionDecision||'REVISE'}`:'supervised-review:REQUIRED');
        const releaseBlocker=supervisionVerified&&supervisionDecision&&supervisionDecision!=='PASS'?`SUPERVISED_${supervisionDecision}`:'SUPERVISED_APPROVAL_REQUIRED';
        const gatedSupervisorRepair=supervisorNeuralEventRoute?.fireAllowed===true&&supervisionDecision!=='PASS';
        if(gatedSupervisorRepair){
          evidence.add('neural-gated-supervisor-requeue:HIGH');
          evidence.add('neural-gated-worker-refill-eligible');
          reviewed.push({taskId:task.id,sampleId:resultSampleId(selectedResult)||clean(task.id),pass:true,missing:[],releaseBlocked:true,releaseBlocker,rootCause,neuralEventRoute,supervisorNeuralEventRoute,gatedRequeue:true});
          return{
            ...task,
            status:'queued',
            priority:task.priority==='owner-immediate'?'owner-immediate':'high',
            blocker:null,
            reservationId:null,
            reservationRunId:null,
            reservationRunAttempt:0,
            reservedAt:null,
            neuronExpectedVariants:0,
            neuronResults:[],
            lastOutcome:'RETRY_AFTER_GATED_SUPERVISOR_REVISE',
            evidence:[...evidence]
          };
        }
        reviewed.push({taskId:task.id,sampleId:resultSampleId(selectedResult)||clean(task.id),pass:true,missing:[],releaseBlocked:true,releaseBlocker,rootCause,neuralEventRoute,supervisorNeuralEventRoute});
        return{...task,status:'running',blocker:'candidate-awaiting-supervised-review',evidence:[...evidence]};
      }
      evidence.add(supervised?'supervised-promotion:PASS':'supervised-promotion:NOT_REQUIRED');
      const specializedFinal=resolveSpecializedFinalVerification({task,row:selectedResult,evidence});
      for(const marker of specializedFinal.markers)evidence.add(marker);
      for(const marker of specializedFinal.trace)evidence.add(marker);
      const capabilityReview=buildVerifiedCapabilityExperienceReview({task,result:selectedResult,finalReviewPass:true,selected:true});
      if(capabilityReview)experienceReviews.push(capabilityReview);
      reviewed.push({taskId:task.id,sampleId:resultSampleId(selectedResult)||clean(task.id),pass:true,missing:[],releaseBlocked:false,releaseBlocker:null,rootCause,neuralEventRoute,supervisorNeuralEventRoute,presentationRuntimeVisual});
      releaseCandidates.push({taskId:clean(task.id),candidateBranch});
    }
    return{...task,evidence:[...evidence]};
  });
  const capabilityApplicationReviewIds=new Set();
  const capabilityBenchmarkReviewIds=new Set();
  for(const row of resultRows){
    const task=taskById.get(clean(row?.taskId))||{};
    const sampleId=resultSampleId(row);
    const finalVerified=Boolean(sampleId)&&verifiedCodingTraceSamples.has(sampleId);
    for(const applicationReview of buildCapabilityApplicationReviews({task,result:row,finalReviewPass:finalVerified,selected:finalVerified})){
      if(capabilityApplicationReviewIds.has(applicationReview.applicationId))continue;
      capabilityApplicationReviewIds.add(applicationReview.applicationId);
      capabilityApplicationReviews.push(applicationReview);
    }
    for(const benchmarkReview of buildCapabilityBenchmarkReviews({task,result:row,finalReviewPass:finalVerified,selected:finalVerified})){
      if(capabilityBenchmarkReviewIds.has(benchmarkReview.benchmarkId))continue;
      capabilityBenchmarkReviewIds.add(benchmarkReview.benchmarkId);
      capabilityBenchmarkReviews.push(benchmarkReview);
    }
  }
  for(const taskId of ids){
    const task=taskById.get(clean(taskId))||{};
    const pairRows=resultRows.filter(row=>clean(row?.taskId)===clean(taskId)&&row?.phase4BenchmarkVerification?.active===true);
    if(pairRows.length<2)continue;
    const selectedResult=selectedResultByTaskId.get(clean(taskId))||null;
    for(const benchmarkReview of buildPairedCapabilityBenchmarkReviews({
      task,
      results:pairRows,
      selectedResult,
      fullRegressionPass:Boolean(selectedResult)
    })){
      if(capabilityBenchmarkReviewIds.has(benchmarkReview.benchmarkId))continue;
      capabilityBenchmarkReviewIds.add(benchmarkReview.benchmarkId);
      capabilityBenchmarkReviews.push(benchmarkReview);
    }
  }
  const codingTraces=resultRows.map(row=>{
    const sampleId=resultSampleId(row);
    const fanInVerified=Boolean(sampleId)&&verifiedCodingTraceSamples.has(sampleId);
    const tracedResult=fanInVerified
      ?{...row,roleResults:{...(row.roleResults||{}),regression:'PASS',review:'PASS'}}
      :row;
    return buildObservableCodingTrace({task:taskById.get(clean(row?.taskId))||{},result:tracedResult});
  });
  const experienceIds=new Set(experienceReviews.map(row=>clean(row?.id)).filter(Boolean));
  for(const row of resultRows){
    if(clean(row?.outcome).toUpperCase()!=='FAIL')continue;
    const task=taskById.get(clean(row?.taskId))||{};
    const review=buildVerifiedCapabilityExperienceReview({task,result:row,finalReviewPass:false,selected:false});
    if(review&&!experienceIds.has(clean(review.id))){experienceReviews.push(review);experienceIds.add(clean(review.id));}
  }
  const neuralShadowAudit=buildNeuralShadowAudit({reviewed});
  const auditEvidenceByTask=new Map();
  for(const row of neuralShadowAudit.rows||[]){
    const marker=neuralShadowAuditEvidence({mode:'PHASE2_SHADOW_VS_WAVE_AUDIT',rows:[row]})[0]||null;
    if(marker&&clean(row.taskId))auditEvidenceByTask.set(clean(row.taskId),marker);
  }
  const tasksWithNeuralAudit=tasks.map(task=>{
    const marker=auditEvidenceByTask.get(clean(task.id));
    if(!marker)return task;
    return{...task,evidence:[...new Set([...(task.evidence||[]),marker])]};
  });
  const durableNeuralEvidence=tasksWithNeuralAudit.flatMap(task=>Array.isArray(task.evidence)?task.evidence:[]);
  const neuralDurableShadowAudit=summarizeDurableNeuralShadowAudit(durableNeuralEvidence);
  const neuralWorkGraphSummary=summarizeNeuralWorkGraphEvidence(durableNeuralEvidence);
  const neuralPhase2Readiness=evaluatePhase2Readiness({
    evidence:durableNeuralEvidence,
    shadowAudit:neuralDurableShadowAudit
  });
  const pass=reviewed.every(row=>row.pass);
  const taskLocalRequeueCount=reviewed.filter(row=>row.pass===false&&row.taskLocalRequeue===true).length;
  const cohortSettlementPass=reviewed.every(row=>row.pass===true||row.taskLocalRequeue===true);
  return{
    queue:{...queue,tasks:tasksWithNeuralAudit},
    reviewed,skipped,releaseCandidates,experienceReviews,capabilityApplicationReviews,capabilityBenchmarkReviews,
    codingTraces,neuralShadowAudit,neuralDurableShadowAudit,neuralWorkGraphSummary,neuralPhase2Readiness,
    pass,cohortSettlementPass,taskLocalRequeueCount
  };
}

export function runVibe2FanInReview({queueFile='.vibe2/queue.json',inputFile='',outputFile='',traceLedgerFile=''}={}){
  if(!clean(inputFile))throw new Error('fan-in input required');
  const queue=readJson(queueFile,{tasks:[]});
  const payload=readJson(inputFile,{results:[]});
  const results=resultsFromPayload(payload);
  const result=finalizeVibe2FanInReview({queue,results,taskIds:taskIdsFromPayload(payload)});
  writeJson(queueFile,result.queue);
  let codingTraceLedger=null;
  if(clean(traceLedgerFile)){
    codingTraceLedger=mergeCodingTraceLedger(readJson(traceLedgerFile,{traces:[]}),result.codingTraces);
    writeJson(traceLedgerFile,codingTraceLedger);
  }
  if(clean(outputFile))writeJson(outputFile,{version:7,role:'review',sourceWrite:false,reviewed:result.reviewed,skipped:result.skipped,releaseCandidates:result.releaseCandidates,experienceReviews:result.experienceReviews,capabilityApplicationReviews:result.capabilityApplicationReviews,capabilityBenchmarkReviews:result.capabilityBenchmarkReviews,codingTraces:result.codingTraces,codingTraceLedgerStats:codingTraceLedger?.stats||null,neuralShadowAudit:result.neuralShadowAudit,neuralDurableShadowAudit:result.neuralDurableShadowAudit,neuralWorkGraphSummary:result.neuralWorkGraphSummary,neuralPhase2Readiness:result.neuralPhase2Readiness,pass:result.pass,cohortSettlementPass:result.cohortSettlementPass,taskLocalRequeueCount:result.taskLocalRequeueCount});
  return{...result,codingTraceLedger};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  if(clean(args['post-native-branch'])){
    const nativeResult=runPostNativeSpecializedReview({
      queueFile:clean(args.queue)||'.vibe2/queue.json',
      candidateBranch:clean(args['post-native-branch']),
      target:clean(args['post-native-target'])
    });
    console.log(`VIBE2_POST_NATIVE_SPECIALIZED_REVIEW=${nativeResult.updated?'UPDATED':'NO_CHANGE'}`);
    console.log(`VIBE2_POST_NATIVE_SPECIALIZED_REASON=${nativeResult.reason}`);
    console.log(`VIBE2_POST_NATIVE_SPECIALIZED_TASK=${nativeResult.taskId||'NONE'}`);
    console.log(`VIBE2_POST_NATIVE_SPECIALIZED_MARKERS=${(nativeResult.markers||[]).join(',')||'NONE'}`);
    process.exit(0);
  }
  const result=runVibe2FanInReview({
    queueFile:clean(args.queue)||'.vibe2/queue.json',
    inputFile:clean(args.input),
    outputFile:clean(args.output),
    traceLedgerFile:clean(args['trace-ledger'])
  });
  const readiness=result.neuralPhase2Readiness;
  const summary=readiness.evidenceSummary;
  console.log(`VIBE2_FAN_IN_REVIEW=${result.pass?'PASS':'BLOCKED'}`);
  console.log(`VIBE2_FAN_IN_COHORT_SETTLEMENT=${result.cohortSettlementPass?(result.pass?'PASS':'PASS_WITH_TASK_LOCAL_REQUEUE'):'BLOCKED'}`);
  console.log(`VIBE2_FAN_IN_TASK_LOCAL_REQUEUE_COUNT=${result.taskLocalRequeueCount||0}`);
  console.log(`VIBE2_FAN_IN_REVIEW_COUNT=${result.reviewed.length}`);
  console.log(`VIBE2_FAN_IN_REVIEW_SKIPPED=${result.skipped.length}`);
  console.log(`VIBE2_FAN_IN_RELEASE_CANDIDATES=${result.releaseCandidates.length}`);
  console.log(`VIBE2_CODING_TRACE_COUNT=${result.codingTraces.length}`);
  console.log(`VIBE2_CODING_TRACE_LEDGER_TOTAL=${result.codingTraceLedger?.stats?.total||0}`);
  console.log(`VIBE2_CAPABILITY_EXPERIENCE_REVIEWS=${result.experienceReviews.length}`);
  console.log(`VIBE2_CAPABILITY_APPLICATION_REVIEWS=${result.capabilityApplicationReviews.length}`);
  console.log(`VIBE2_CAPABILITY_BENCHMARK_REVIEWS=${result.capabilityBenchmarkReviews.length}`);
  console.log(`VIBE2_NEURAL_PHASE2_REVIEW_ELIGIBLE=${readiness.reviewEligible?'YES':'NO'}`);
  console.log(`VIBE2_NEURAL_PHASE2_REASON=${readiness.reason}`);
  console.log(`VIBE2_NEURAL_PHASE2_GATES=${JSON.stringify(readiness.gates)}`);
  console.log(`VIBE2_NEURAL_SHADOW_EVENTS=${summary.events.total}`);
  console.log(`VIBE2_NEURAL_CALIBRATION_CONTRACT_VERSION=${summary.calibrationPredictionContractVersion||1}`);
  console.log(`VIBE2_NEURAL_CALIBRATION_ELIGIBLE=${summary.identifiedCalibrationEligible}`);
  console.log(`VIBE2_NEURAL_CALIBRATION_ACCURACY=${summary.identifiedCalibrationAccuracy??'NA'}`);
  console.log(`VIBE2_NEURAL_CALIBRATION_LIFETIME_ACCURACY=${summary.feedback.identifiedObservedAccuracy??'NA'}`);
  console.log(`VIBE2_NEURAL_ROOT_VERIFIED=${summary.rootCause.verified}`);
  console.log(`VIBE2_NEURAL_ROOT_IDENTITY_COVERAGE=${summary.rootCause.verifiedSampleIdentityCoverage}`);
  console.log(`VIBE2_NEURAL_ROOT_PREDICTION_COVERAGE=${summary.rootCausePredictionCoverage}`);
  console.log(`VIBE2_NEURAL_ROOT_CONTRADICTION_RATE=${summary.rootCause.predictionContradictionRate??'NA'}`);
  console.log(`VIBE2_NEURAL_ROOT_SAMPLE_CONFLICTS=${summary.rootCause.sampleConflicts}`);
  console.log(`VIBE2_NEURAL_ROOT_LIFECYCLE_PROGRESSIONS=${summary.rootCause.lifecycleProgressionRows||0}`);
  console.log(`VIBE2_NEURAL_WAVE_AUDIT_SAMPLES=${summary.shadowAuditSamples}`);
  console.log(`VIBE2_NEURAL_WORK_GRAPH_COUNT=${result.neuralWorkGraphSummary?.distinctGraphs||0}`);
  console.log(`VIBE2_NEURAL_WORK_GRAPH_CONFLICTS=${result.neuralWorkGraphSummary?.conflicts||0}`);
  console.log(`VIBE2_NEURAL_WORK_GRAPH_UNAUTHORIZED_AUTHORITY_BITS=${result.neuralWorkGraphSummary?.unauthorizedAuthorityBitCount||0}`);
  console.log(`VIBE2_NEURAL_UNAUTHORIZED_FIRE=${summary.events.unauthorizedFireCount}`);
  console.log(`VIBE2_NEURAL_PHASE2_EXECUTION_AUTHORITY=${readiness.executionAuthorityGranted?'YES':'NO'}`);
  console.log(`VIBE2_NEURAL_PHASE2_AUTOMATIC_PROMOTION=${readiness.automaticPromotionAllowed?'YES':'NO'}`);
  console.log('VIBE2_FAN_IN_REVIEW_SOURCE_WRITE=NO');
  if(!result.cohortSettlementPass)process.exitCode=1;
}
