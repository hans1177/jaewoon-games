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
  assert.ok(task.evidence.includes('neural-root-cause-state:CAUSAL_REPAIR_CONFIRMED_SYSTEM_UNVERIFIED'));
  assert.ok(task.evidence.includes('role-result:regression:PASS'));
  assert.ok(task.evidence.includes('role-result:review:PASS'));
  assert.equal(result.releaseCandidates.length,1);
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
  assert.equal(review.rootCause.predictedSystemConsistentWithVerified,true);
  assert.equal(review.rootCause.learningEligible,false);
  assert.equal(review.rootCause.actionFiringAllowed,false);
  assert.equal(review.rootCause.eventRoutingAuthorityAllowed,false);
  assert.equal(review.rootCause.phase2AuthorityEligible,false);
  const encoded=result.queue.tasks[0].evidence.find(value=>value.startsWith('neural-root-cause:'));
  assert.ok(encoded);
  const payload=JSON.parse(decodeURIComponent(encoded.slice('neural-root-cause:'.length)));
  assert.equal(payload.rootCauseVerified,true);
  assert.equal(payload.phase2AuthorityEligible,false);
});
