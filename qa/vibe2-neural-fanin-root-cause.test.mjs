// 파일명: qa/vibe2-neural-fanin-root-cause.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { finalizeVibe2FanInReview, finalizePostNativeSpecializedReview } from '../tools/vibe2-fan-in-review.mjs';

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


test('fan-in blocks studio build-up results that do not prove the required implementation breadth',()=>{
  const task=baseTask();
  task.studioQualityEvolution={
    phase:'BUILD_UP',
    focusPillar:'STABILITY',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:3,max:6}
  };
  const result=finalizeVibe2FanInReview({
    queue:{tasks:[task]},
    results:[baseResult()],
    taskIds:['neural-root-task']
  });
  assert.equal(result.reviewed[0].pass,false);
  assert.ok(result.reviewed[0].missing.includes('studio-quality-implementation-delta'));
  assert.equal(result.reviewed[0].taskLocalRequeue,true);
  assert.equal(result.pass,false);
  assert.equal(result.cohortSettlementPass,true);
  assert.equal(result.taskLocalRequeueCount,1);
  assert.equal(result.releaseCandidates.length,0);
  assert.equal(result.queue.tasks[0].status,'queued');
  assert.equal(result.queue.tasks[0].blocker,null);
  assert.equal(result.queue.tasks[0].lastOutcome,'FAN_IN_REVIEW_BLOCKED_REQUEUE');
  assert.ok(result.queue.tasks[0].evidence.includes('fan-in-review-task-local-requeue:YES'));
  assert.ok(result.queue.tasks[0].evidence.some(value=>value.includes('studio-quality-implementation-delta')));
});

test('fan-in keeps strict game repair evidence but requeues only the blocked task',()=>{
  const task={
    ...baseTask(),
    reservationId:'reserve-1',
    reservationRunId:'run-1',
    reservationRunAttempt:1,
    reservedAt:'2026-09-26T07:17:25Z',
    neuronExpectedVariants:1,
    neuronResults:['primary']
  };
  const candidate=baseResult();
  candidate.gameRepairQa={
    required:true,
    prePatchReproduced:false,
    responsibleSystem:null,
    originalScenarioReplay:'PENDING_RUNTIME_EVIDENCE',
    invariants:'PENDING_RUNTIME_EVIDENCE',
    saveMigration:'PENDING_RUNTIME_EVIDENCE',
    multiplayerLifecycle:'PENDING_AUTONOMOUS_HARNESS_EVIDENCE',
    multiplayerAutomation:{userAssistanceRequired:false},
    readyForFanIn:false
  };
  const result=finalizeVibe2FanInReview({queue:{tasks:[task]},results:[candidate],taskIds:['neural-root-task']});
  assert.equal(result.reviewed[0].pass,false);
  assert.ok(result.reviewed[0].missing.includes('game-repair-prepatch-reproduction'));
  assert.ok(result.reviewed[0].missing.includes('game-repair-ready-for-fan-in'));
  assert.equal(result.releaseCandidates.length,0);
  assert.equal(result.cohortSettlementPass,true);
  assert.equal(result.taskLocalRequeueCount,1);
  const next=result.queue.tasks[0];
  assert.equal(next.status,'queued');
  assert.equal(next.blocker,null);
  assert.equal(next.reservationId,null);
  assert.equal(next.reservationRunId,null);
  assert.equal(next.reservationRunAttempt,0);
  assert.equal(next.reservedAt,null);
  assert.equal(next.lastOutcome,'FAN_IN_REVIEW_BLOCKED_REQUEUE');
  assert.ok(next.evidence.includes('role-result:review:BLOCKED'));
  assert.ok(next.evidence.includes('fan-in-review-task-local-requeue:YES'));
  assert.ok(next.evidence.some(value=>value.startsWith('package-review-missing:')));
});

test('fan-in accepts studio build-up breadth evidence only when the configured delta count is met',()=>{
  const task=baseTask();
  task.studioQualityEvolution={
    phase:'BUILD_UP',
    focusPillar:'PRESENTATION',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:3,max:6}
  };
  const candidate=baseResult();
  candidate.studioQualityCandidateDelta={
    required:true,
    pass:true,
    phase:'BUILD_UP',
    focusPillar:'PRESENTATION',
    requiredSourceDeltaUnits:3,
    sourceDeltaUnits:3,
    requiredVisualUnits:2,
    visualUnits:2
  };
  const result=finalizeVibe2FanInReview({
    queue:{tasks:[task]},
    results:[candidate],
    taskIds:['neural-root-task']
  });
  assert.equal(result.reviewed[0].pass,true);
  assert.equal(result.releaseCandidates.length,1);
  assert.ok(result.queue.tasks[0].evidence.includes('studio-quality-implementation-delta:PASS'));
});

test('explicit independently verified root cause remains non-firing on successful CI result',()=>{
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
  assert.equal(review.neuralEventRoute.wouldFireWithoutPhase2Authority,false);
  assert.equal(review.neuralEventRoute.fireAllowed,false);
  assert.equal(review.neuralEventRoute.inhibitors.includes('PHASE2_EXECUTION_AUTHORITY_NOT_GRANTED'),false);
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


function postNativeTask({target='roblox',runtimeEvidence=true,blocker='',focused=true}={}){
  const branch='vibe2/candidate/neural-root-task-primary-run';
  const evidence=[
    'role-result:exploration:PASS',
    'role-result:implementation:PASS',
    'role-result:test:PASS',
    'role-result:performance:PASS',
    'role-result:regression:PASS',
    'role-result:review:PASS',
    branch,
    'candidate-head-sha:abc123',
    'verification-conclusion:success',
    'specialized-verification-request:REQUIRED',
    ...(focused?['specialized-focused-qa-pass:VERIFIED_WORLD_ROUTE_NAVIGATION_PASS']:[]),
    ...(runtimeEvidence?[target==='roblox'?'roblox-verification-run:99101':'unity-verification-run:99201']:[])
  ];
  return{
    id:'neural-root-task',
    gameId:'demo',
    target,
    sourceRoot:target==='roblox'?'roblox-games/demo':'unity-games/demo',
    status:'blocked',
    blocker:blocker||`candidate-${target}-verification-passed-awaiting-review`,
    evidence
  };
}

test('post-native fan-in finalizes specialized markers without changing task release state',()=>{
  const task=postNativeTask({target:'roblox'});
  const result=finalizePostNativeSpecializedReview({
    queue:{tasks:[task]},
    candidateBranch:'vibe2/candidate/neural-root-task-primary-run',
    target:'roblox'
  });
  assert.equal(result.updated,true);
  assert.equal(result.reason,'POST_NATIVE_SPECIALIZED_FINALIZED');
  assert.deepEqual(result.markers,['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS']);
  const next=result.queue.tasks[0];
  assert.equal(next.status,'blocked');
  assert.equal(next.blocker,'candidate-roblox-verification-passed-awaiting-review');
  assert.ok(next.evidence.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.ok(next.evidence.includes('specialized-final-verification:PASS'));
  assert.ok(next.evidence.includes('specialized-final-authority:FAN_IN_AFTER_FULL_REGRESSION'));
  assert.ok(next.evidence.includes('specialized-native-runtime-evidence:roblox-verification-run:99101'));
  assert.ok(next.evidence.includes('specialized-post-native-review:PASS'));
  assert.equal(result.taskStatusPreserved,true);
  assert.equal(result.releaseDecisionChanged,false);

  const again=finalizePostNativeSpecializedReview({
    queue:result.queue,
    candidateBranch:'vibe2/candidate/neural-root-task-primary-run',
    target:'roblox'
  });
  assert.equal(again.updated,false);
  assert.equal(again.reason,'ALREADY_FINALIZED');
});

test('post-native fan-in refuses wrong blocker or missing authoritative engine QA',()=>{
  const wrongBlocker=finalizePostNativeSpecializedReview({
    queue:{tasks:[postNativeTask({target:'roblox',blocker:'candidate-roblox-verification-incomplete'})]},
    candidateBranch:'vibe2/candidate/neural-root-task-primary-run',
    target:'roblox'
  });
  assert.equal(wrongBlocker.updated,false);
  assert.equal(wrongBlocker.reason,'TASK_NOT_POST_NATIVE_REVIEW_READY');

  const missingRuntime=finalizePostNativeSpecializedReview({
    queue:{tasks:[postNativeTask({target:'unity',runtimeEvidence:false})]},
    candidateBranch:'vibe2/candidate/neural-root-task-primary-run',
    target:'unity'
  });
  assert.equal(missingRuntime.updated,false);
  assert.equal(missingRuntime.reason,'POST_NATIVE_SPECIALIZED_BLOCKED');
  assert.ok(missingRuntime.blocked.includes('AUTHORITATIVE_TARGET_ENGINE_QA_MISSING'));
  assert.equal(missingRuntime.queue.tasks[0].evidence.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'),false);
});

test('native candidate-result workflows invoke fan-in post-native finalizer instead of minting markers themselves',()=>{
  const roblox=fs.readFileSync('.github/workflows/vibe2-roblox-candidate-result.yml','utf8');
  const unity=fs.readFileSync('.github/workflows/vibe2-unity-candidate-result.yml','utf8');
  assert.match(roblox,/vibe2-fan-in-review\.mjs[\s\S]{0,260}--post-native-branch="\$CANDIDATE_BRANCH"[\s\S]{0,180}--post-native-target=roblox/);
  assert.match(unity,/vibe2-fan-in-review\.mjs[\s\S]{0,260}--post-native-branch="\$CANDIDATE_BRANCH"[\s\S]{0,180}--post-native-target=unity/);
  assert.doesNotMatch(roblox,/echo\s+['"]?VERIFIED_WORLD_ROUTE_NAVIGATION_PASS/);
  assert.doesNotMatch(unity,/echo\s+['"]?VERIFIED_WORLD_ROUTE_NAVIGATION_PASS/);
});


function presentationStudioTask(){
  return{
    ...baseTask(['graphics-evolution-before-after-comparison-required']),
    studioQualityEvolution:{version:1,cycle:1,phase:'BUILD_UP',focusPillar:'PRESENTATION',visibleRenderDeltaRequired:true,nextCycleRequired:true}
  };
}
function runtimeVisualComparison(){
  const base='a'.repeat(40),candidate='b'.repeat(40);
  return{
    version:1,baselineRevision:base,candidateRevision:candidate,
    before:{source:'runtime-capture',artifactId:'actions-artifact:visual:before.png',candidateRevision:base,observed:true,reviewed:true},
    after:{source:'runtime-capture',artifactId:'actions-artifact:visual:after.png',candidateRevision:candidate,observed:true,reviewed:true},
    comparison:{pass:true,visibleRenderDelta:true,beforeStable:true,afterStable:true,observed:true,reviewed:true,method:'dual-headless-browser-sha256-v1'}
  };
}

test('web studio presentation fan-in blocks release without actual runtime before-after comparison',()=>{
  const result=finalizeVibe2FanInReview({queue:{tasks:[presentationStudioTask()]},results:[baseResult()],taskIds:['neural-root-task']});
  assert.equal(result.reviewed[0].pass,false);
  assert.ok(result.reviewed[0].missing.includes('presentation-runtime-before-after-comparison'));
  assert.equal(result.releaseCandidates.length,0);
  const evidence=result.queue.tasks[0].evidence;
  assert.ok(evidence.includes('graphics-evolution-before-after-comparison:BLOCKED'));
  assert.ok(evidence.some(value=>value.startsWith('presentation-runtime-before-after-blocker:')));
});

test('web studio presentation fan-in approves actual stable runtime before-after comparison',()=>{
  const row=baseResult();
  row.presentationQuality={required:true,runtimeQaRequired:true,runtimeVisualComparison:runtimeVisualComparison()};
  const result=finalizeVibe2FanInReview({queue:{tasks:[presentationStudioTask()]},results:[row],taskIds:['neural-root-task']});
  assert.equal(result.reviewed[0].pass,true);
  assert.equal(result.reviewed[0].presentationRuntimeVisual.pass,true);
  assert.equal(result.releaseCandidates.length,1);
  const evidence=result.queue.tasks[0].evidence;
  assert.ok(evidence.includes('graphics-evolution-before-after-comparison:PASS'));
  assert.ok(evidence.includes('presentation-runtime-before-after-audit:PASS'));
});
