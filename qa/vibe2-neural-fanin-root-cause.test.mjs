// 파일명: qa/vibe2-neural-fanin-root-cause.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeVibe2FanInReview } from '../tools/vibe2-fan-in-review.mjs';

function baseTask(extraEvidence=[]){
  return{
    id:'neural-root-task',
    gameId:'demo',
    target:'web',
    sourceRoot:'web-games/demo',
    status:'running',
    blocker:'candidate-awaiting-qa-and-deployment',
    evidence:[
      'role-result:exploration:PASS',
      'role-result:implementation:PASS',
      'role-result:test:PASS',
      'role-result:performance:PASS',
      'vibe2/candidate/neural-root-task-primary-run',
      'causal-replay-prepatch-reproduced:YES',
      'causal-replay-executed:YES',
      'causal-replay-status:EXECUTED_PASS',
      ...extraEvidence
    ]
  };
}

function baseResult(extraEvidence=[]){
  return{
    taskId:'neural-root-task',
    outcome:'PASS',
    candidateBranch:'vibe2/candidate/neural-root-task-primary-run',
    baseMainSha:'base-sha',
    candidateIdentity:{
      taskId:'neural-root-task',
      gameId:'demo',
      target:'web',
      sourceRoot:'web-games/demo',
      baseMainSha:'base-sha'
    },
    neuralDiagnosis:{
      mode:'PHASE1_SHADOW_ADVISORY',
      responsibility:{system:'GAME_RUNTIME',confidence:.91},
      actionRecommendation:{failureStage:'WEB_REPAIR'},
      bottleneck:{score:82}
    },
    evidence:[...extraEvidence]
  };
}

test('fan-in regression and review confirm causal repair but do not invent responsible system',()=>{
  const result=finalizeVibe2FanInReview({
    queue:{tasks:[baseTask()]},
    results:[baseResult()],
    taskIds:['neural-root-task']
  });
  const task=result.queue.tasks[0];
  const review=result.reviewed[0];
  assert.equal(review.pass,true);
  assert.equal(review.rootCause.state,'CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED');
  assert.equal(review.rootCause.causalRepairVerified,true);
  assert.equal(review.rootCause.independentConfirmation,true);
  assert.equal(review.rootCause.responsibleSystemVerified,false);
  assert.equal(review.rootCause.rootCauseVerified,false);
  assert.equal(review.rootCause.phase2AuthorityEligible,false);
  assert.equal(review.neuralEventRoute.mode,'PHASE2_SHADOW_EVENT_ROUTER');
  assert.match(review.neuralEventRoute.event.id,/\|CI_RESULT$/);
  assert.equal(review.neuralEventRoute.proposedAction.kind,'REQUEST_RESPONSIBLE_SYSTEM_VERIFICATION');
  assert.equal(review.neuralEventRoute.fireAllowed,false);
  assert.equal(review.neuralEventRoute.queueMutationAllowed,false);
  assert.ok(task.evidence.includes('neural-root-cause-state:CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED'));
  assert.ok(task.evidence.includes('neural-event-shadow-action:REQUEST_RESPONSIBLE_SYSTEM_VERIFICATION'));
  assert.ok(result.queue.tasks[0].evidence.some(value=>value.startsWith('neural-shadow-wave-audit:')));
  assert.ok(task.evidence.includes('role-result:regression:PASS'));
  assert.ok(task.evidence.includes('role-result:review:PASS'));
  assert.equal(result.releaseCandidates.length,1);
  assert.equal(result.neuralShadowAudit.mode,'PHASE2_SHADOW_VS_WAVE_AUDIT');
  assert.equal(result.neuralShadowAudit.sampleCount,1);
  assert.equal(result.neuralDurableShadowAudit.sampleCount,1);
  assert.equal(result.neuralWorkGraphSummary.distinctGraphs,1);
  assert.equal(result.neuralWorkGraphSummary.conflicts,0);
  assert.equal(result.neuralWorkGraphSummary.unauthorizedAuthorityBitCount,0);
  assert.equal(result.neuralWorkGraphSummary.safetyInvariantPass,true);
  assert.ok(task.evidence.some(value=>value.startsWith('neural-work-graph-shadow:')));
  assert.equal(result.neuralShadowAudit.rows[0].actualWaveOutcome,'WAVE_RELEASE_ELIGIBLE');
  assert.equal(result.neuralShadowAudit.rows[0].comparisonClass,'WAVE_PROCEEDS_NEURAL_HOLDS');
  assert.equal(result.neuralShadowAudit.phase2AuthorityReady,false);
  assert.equal(result.neuralShadowAudit.automaticLearningAllowed,false);
  assert.equal(result.neuralPhase2Readiness.mode,'PHASE2_READINESS_REVIEW_GATE');
  assert.equal(result.neuralPhase2Readiness.reviewEligible,false);
  assert.equal(result.neuralPhase2Readiness.evidenceSummary.shadowAuditSamples,1);
  assert.equal(result.neuralPhase2Readiness.phase2AuthorityReady,false);
  assert.equal(result.neuralPhase2Readiness.executionAuthorityGranted,false);
  assert.equal(result.neuralPhase2Readiness.automaticPromotionAllowed,false);
});

test('explicit independently verified responsible system can verify root cause without granting neural execution authority',()=>{
  const marker='independent-qa-verified-responsible-system:GAME_RUNTIME';
  const result=finalizeVibe2FanInReview({
    queue:{tasks:[baseTask([marker])]},
    results:[baseResult([marker])],
    taskIds:['neural-root-task']
  });
  const review=result.reviewed[0];
  assert.equal(review.rootCause.state,'ROOT_CAUSE_VERIFIED');
  assert.equal(review.rootCause.rootCauseVerified,true);
  assert.equal(review.rootCause.responsibleSystem,'GAME_RUNTIME');
  assert.equal(review.rootCause.sampleId,'neural-root-task|primary|vibe2/candidate/neural-root-task-primary-run');
  assert.equal(review.rootCause.predictedSystemConsistentWithVerified,true);
  assert.equal(review.rootCause.learningEligible,false);
  assert.equal(review.rootCause.actionFiringAllowed,false);
  assert.equal(review.rootCause.eventRoutingAuthorityAllowed,false);
  assert.equal(review.rootCause.phase2AuthorityEligible,false);
  assert.equal(review.neuralEventRoute.proposedAction.kind,'PREPARE_EXACT_RESPONSIBLE_SYSTEM_REPAIR');
  assert.equal(review.neuralEventRoute.wouldFireWithoutPhase2Authority,true);
  assert.equal(review.neuralEventRoute.fireAllowed,false);
  assert.ok(review.neuralEventRoute.inhibitors.includes('PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'));
  const encoded=result.queue.tasks[0].evidence.find(value=>value.startsWith('neural-root-cause:'));
  assert.ok(encoded);
  const payload=JSON.parse(decodeURIComponent(encoded.slice('neural-root-cause:'.length)));
  assert.equal(payload.sampleId,'neural-root-task|primary|vibe2/candidate/neural-root-task-primary-run');
  assert.equal(payload.rootCauseVerified,true);
  assert.equal(payload.phase2AuthorityEligible,false);
});


function specializedResult({target='web',sourceRoot='web-games/demo',markers=['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'],qaPass=true,evidence=[]}={}){
  const row=baseResult(evidence);
  row.candidateIdentity={...row.candidateIdentity,target,sourceRoot};
  row.specializedVerificationRequest={
    version:1,required:true,requestedMarkers:markers,target,
    nativeRuntimeRequired:['unity','roblox'].includes(target),
    focusedQaRequired:true,markerOnlyPassForbidden:true,
    requestAuthority:'VERIFICATION_REQUEST_ONLY_NOT_PASS'
  };
  row.specializedVerificationQa={
    status:qaPass?'FOCUSED_STATIC_PASS':'NOT_PASS',
    requestedMarkers:markers,
    results:Object.fromEntries(markers.map(marker=>[marker,{pass:qaPass,staticOnly:true}])),
    finalMarkerAuthority:'FAN_IN_ONLY',
    finalVerifiedMarkers:[]
  };
  return row;
}

test('fan-in issues web specialized verified marker only after focused QA and full review',()=>{
  const result=finalizeVibe2FanInReview({
    queue:{tasks:[baseTask()]},
    results:[specializedResult()],
    taskIds:['neural-root-task']
  });
  const evidence=result.queue.tasks[0].evidence;
  assert.ok(evidence.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.ok(evidence.includes('specialized-final-verification:PASS'));
  assert.ok(evidence.includes('specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION'));
});

test('fan-in does not issue specialized marker when focused QA is not pass',()=>{
  const result=finalizeVibe2FanInReview({
    queue:{tasks:[baseTask()]},
    results:[specializedResult({qaPass:false})],
    taskIds:['neural-root-task']
  });
  const evidence=result.queue.tasks[0].evidence;
  assert.equal(evidence.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'),false);
  assert.ok(evidence.includes('specialized-final-verification:BLOCKED'));
  assert.ok(evidence.some(value=>value==='specialized-final-blocker:FOCUSED_QA_NOT_PASS'));
});

test('native specialized marker requires authoritative target-engine verification evidence',()=>{
  const taskWithoutRuntime={...baseTask(),target:'roblox',sourceRoot:'roblox-games/demo'};
  const noRuntime=finalizeVibe2FanInReview({
    queue:{tasks:[taskWithoutRuntime]},
    results:[specializedResult({target:'roblox',sourceRoot:'roblox-games/demo'})],
    taskIds:['neural-root-task']
  });
  assert.equal(noRuntime.queue.tasks[0].evidence.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'),false);
  assert.ok(noRuntime.queue.tasks[0].evidence.includes('specialized-final-blocker:AUTHORITATIVE_TARGET_ENGINE_QA_MISSING'));

  const taskWithRuntime={...baseTask(['roblox-verification-run:991']),target:'roblox',sourceRoot:'roblox-games/demo'};
  const withRuntime=finalizeVibe2FanInReview({
    queue:{tasks:[taskWithRuntime]},
    results:[specializedResult({target:'roblox',sourceRoot:'roblox-games/demo',evidence:['roblox-verification-run:991']})],
    taskIds:['neural-root-task']
  });
  assert.ok(withRuntime.queue.tasks[0].evidence.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.ok(withRuntime.queue.tasks[0].evidence.some(value=>value==='specialized-native-runtime-evidence:roblox-verification-run:991'));
});
