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
function rolePass(evidence,role){return evidence.has(`role-result:${role}:PASS`);}
function reviewReady(task={}){return clean(task.status)==='running'&&/candidate-awaiting-qa-and-deployment|awaiting.*fan-in|awaiting.*qa|awaiting.*supervised-review/i.test(clean(task.blocker));}
function releaseCandidateFromEvidence(evidence=new Set()){
  const branches=[...evidence].map(clean).filter(value=>value.startsWith('vibe2/candidate/'));
  return branches.at(-1)||null;
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
    if(!candidateBranch)missing.push('candidate-branch');
    else{
      const rows=resultRows.filter(row=>clean(row?.taskId)===clean(task.id));
      selectedResult=rows.find(row=>resultCandidateBranch(row)===candidateBranch)||rows.find(row=>clean(row?.outcome).toUpperCase()==='PASS')||null;
      if(!selectedResult)missing.push('candidate-identity-result');
      else {
        missing.push(...candidateIdentityFailures(task,selectedResult,candidateBranch));
        missing.push(...gameRepairEvidenceFailures(selectedResult));
      }
    }
    const uniqueMissing=[...new Set(missing)];
    if(uniqueMissing.length){
      evidence.add('role-result:review:BLOCKED');
      evidence.add(`package-review-missing:${uniqueMissing.join('|')}`);
      reviewed.push({taskId:task.id,sampleId:selectedResult?resultSampleId(selectedResult):clean(task.id),pass:false,missing:uniqueMissing});
    }else{
      evidence.add('role-result:review:PASS');
      evidence.add('package-review:all-required-roles-pass');
      evidence.add('candidate-identity:PASS');
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
        securityBlocked:evidence.has('SECURITY_POLICY_BLOCK')
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
          securityBlocked:evidence.has('SECURITY_POLICY_BLOCK')
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
        reviewed.push({taskId:task.id,sampleId:resultSampleId(selectedResult)||clean(task.id),pass:true,missing:[],releaseBlocked:true,releaseBlocker,rootCause,neuralEventRoute,supervisorNeuralEventRoute});
        return{...task,status:'running',blocker:'candidate-awaiting-supervised-review',evidence:[...evidence]};
      }
      evidence.add(supervised?'supervised-promotion:PASS':'supervised-promotion:NOT_REQUIRED');
      const capabilityReview=buildVerifiedCapabilityExperienceReview({task,result:selectedResult,finalReviewPass:true,selected:true});
      if(capabilityReview)experienceReviews.push(capabilityReview);
      reviewed.push({taskId:task.id,sampleId:resultSampleId(selectedResult)||clean(task.id),pass:true,missing:[],releaseBlocked:false,releaseBlocker:null,rootCause,neuralEventRoute,supervisorNeuralEventRoute});
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
  return{queue:{...queue,tasks:tasksWithNeuralAudit},reviewed,skipped,releaseCandidates,experienceReviews,capabilityApplicationReviews,capabilityBenchmarkReviews,codingTraces,neuralShadowAudit,neuralDurableShadowAudit,neuralWorkGraphSummary,neuralPhase2Readiness,pass:reviewed.every(row=>row.pass)};
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
  if(clean(outputFile))writeJson(outputFile,{version:7,role:'review',sourceWrite:false,reviewed:result.reviewed,skipped:result.skipped,releaseCandidates:result.releaseCandidates,experienceReviews:result.experienceReviews,capabilityApplicationReviews:result.capabilityApplicationReviews,capabilityBenchmarkReviews:result.capabilityBenchmarkReviews,codingTraces:result.codingTraces,codingTraceLedgerStats:codingTraceLedger?.stats||null,neuralShadowAudit:result.neuralShadowAudit,neuralDurableShadowAudit:result.neuralDurableShadowAudit,neuralWorkGraphSummary:result.neuralWorkGraphSummary,neuralPhase2Readiness:result.neuralPhase2Readiness,pass:result.pass});
  return{...result,codingTraceLedger};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=runVibe2FanInReview({
    queueFile:clean(args.queue)||'.vibe2/queue.json',
    inputFile:clean(args.input),
    outputFile:clean(args.output),
    traceLedgerFile:clean(args['trace-ledger'])
  });
  const readiness=result.neuralPhase2Readiness;
  const summary=readiness.evidenceSummary;
  console.log(`VIBE2_FAN_IN_REVIEW=${result.pass?'PASS':'BLOCKED'}`);
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
  if(!result.pass)process.exitCode=1;
}
