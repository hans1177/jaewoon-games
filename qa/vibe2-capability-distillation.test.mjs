import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildObservableCodingTrace,
  buildVerifiedCapabilityExperienceReview,
  mergeCodingTraceLedger
} from '../tools/vibe2-capability-distillation.mjs';

const task={
  id:'task-capability-1',
  gameId:'bug-defense',
  target:'web',
  goal:'repair save flow token=SHOULD_NOT_PERSIST',
  compiledWorkContract:{
    workKey:'bug-defense:web:save',
    roadmapVersion:199,
    mainSha:'abcdef1234567890'
  }
};

const passResult={
  version:10,
  taskId:task.id,
  reservationId:'reservation-1',
  variant:'primary',
  outcome:'PASS',
  blocker:'candidate-awaiting-qa-and-deployment',
  candidateBranch:'vibe2/candidate/bug-defense-save-primary',
  baseMainSha:'abcdef1234567890',
  candidateIdentity:{taskId:task.id,gameId:task.gameId,target:'web',baseMainSha:'abcdef1234567890'},
  evidence:[
    'actions-run:12345',
    'reservation-id:reservation-1',
    'candidate-sha:1111111',
    'incremental-qa-hash:qa123',
    'causal-replay-status:EXECUTED_PASS',
    'causal-replay-executed:YES',
    'causal-replay-prepatch-reproduced:YES'
  ],
  codingMethod:{
    version:2,
    strategy:'RESPONSIBILITY_FIRST',
    responsibilityConfidence:'HIGH',
    primaryTargets:['saveGame'],
    primarySystems:['SAVE'],
    dependentSystems:['UI_STATE'],
    contextMode:'PRIMARY_SYMBOL_WINDOWS',
    contextBytes:12000,
    failureFingerprint:'SAVE_RESTORE_ORDER',
    patchRecipeMode:'VERIFIED_RECIPE_REUSE',
    architectureDrift:{status:'PASS',riskLevel:'LOW'},
    generationAttempts:2,
    generationAttemptBudget:3,
    generationRecoveryUsed:true,
    candidateProducedFirstAttempt:false,
    causalReplayStatus:'EXECUTED_PASS',
    causalReplayExecuted:true
  },
  roleResults:{exploration:'PASS',implementation:'PASS',test:'PASS',performance:'PASS',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
  metrics:{changedFileCount:1,addedLineCount:8,deletedLineCount:3,workerTotalMs:1500,candidateMs:900,qaMs:400}
};

test('observable coding trace captures decisions but never raw code or hidden reasoning',()=>{
  const trace=buildObservableCodingTrace({task,result:passResult});
  assert.match(trace.traceId,/^ctrace_[0-9a-f]{24}$/);
  assert.equal(trace.authority,'OBSERVABLE_CODING_TRACE_PROVENANCE_ONLY');
  assert.equal(trace.task.workKey,'bug-defense:web:save');
  assert.equal(trace.task.roadmapVersion,199);
  assert.equal(trace.task.goal.includes('SHOULD_NOT_PERSIST'),false);
  assert.equal(trace.decision.strategy,'RESPONSIBILITY_FIRST');
  assert.equal(trace.execution.generationAttempts,2);
  assert.equal(trace.execution.recoveryUsed,true);
  assert.equal(trace.changeStats.rawCodeStored,false);
  assert.equal(trace.safety.hiddenChainOfThoughtStored,false);
  assert.equal(trace.safety.rawModelOutputStored,false);
  assert.equal(trace.safety.reusableBeforeVerification,false);
  assert.equal(trace.safety.authorityExpanded,false);
  assert.ok(trace.capabilityDomains.includes('RESPONSIBILITY_LOCALIZATION'));
  assert.ok(trace.capabilityDomains.includes('ROOT_CAUSE_DEBUGGING'));
  assert.ok(trace.capabilityDomains.includes('CONTEXT_SELECTION'));
});

test('verified selected fan-in winner becomes reusable capability experience',()=>{
  const review=buildVerifiedCapabilityExperienceReview({task,result:passResult,finalReviewPass:true,selected:true});
  assert.equal(review.outcome,'PASS');
  assert.equal(review.reviewVerified,true);
  assert.equal(review.reviewDecision,'PASS');
  assert.equal(review.engineQaVerified,true);
  assert.equal(review.authorityExpanded,false);
  assert.ok(review.evidence.some(value=>value.startsWith('coding-trace:ctrace_')));
  assert.ok(review.evidence.includes('fan-in-review:PASS'));
  assert.ok(review.reusablePatterns.includes('CAPABILITY:CODING_STRATEGY:RESPONSIBILITY_FIRST'));
  assert.ok(review.reusablePatterns.includes('CAPABILITY_DOMAIN:REGRESSION_REASONING'));
  assert.deepEqual(review.avoidPatterns,[]);
});

test('unselected or not-final pass cannot become positive reusable experience',()=>{
  assert.equal(buildVerifiedCapabilityExperienceReview({task,result:passResult,finalReviewPass:false,selected:true}),null);
  assert.equal(buildVerifiedCapabilityExperienceReview({task,result:passResult,finalReviewPass:true,selected:false}),null);
});

test('observed source generation failure becomes verified avoid lesson without pretending success',()=>{
  const failure={
    ...passResult,
    reservationId:'reservation-2',
    outcome:'FAIL',
    blocker:'source-candidate-generation-failed',
    candidateBranch:null,
    candidateIdentity:null,
    candidateFailure:{class:'EDIT_MATCH',message:'raw model output should not be stored'},
    evidence:['actions-run:12346','reservation-id:reservation-2','source-generation-failure:EDIT_MATCH'],
    codingMethod:{...passResult.codingMethod,generationAttempts:3,generationRecoveryUsed:false},
    roleResults:{exploration:'PASS',implementation:'FAIL',test:'FAIL',performance:'FAIL',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    metrics:{...passResult.metrics,changedFileCount:0,addedLineCount:0,deletedLineCount:0}
  };
  const trace=buildObservableCodingTrace({task,result:failure});
  assert.equal(trace.verification.workerOutcome,'FAIL');
  assert.equal(trace.verification.candidateFailureClass,'EDIT_MATCH');
  assert.equal(JSON.stringify(trace).includes('raw model output should not be stored'),false);

  const review=buildVerifiedCapabilityExperienceReview({task,result:failure,finalReviewPass:false,selected:false});
  assert.equal(review.outcome,'FAIL');
  assert.equal(review.failureCause,'SOURCE_CANDIDATE_GENERATION:EDIT_MATCH');
  assert.equal(review.engineQaVerified,false);
  assert.equal(review.reviewVerified,true);
  assert.ok(review.avoidPatterns.includes('CAPABILITY_AVOID:SOURCE_GENERATION:EDIT_MATCH'));
  assert.deepEqual(review.reusablePatterns,[]);
});

test('trace ledger deduplicates attempts and remains provenance-only',()=>{
  const trace=buildObservableCodingTrace({task,result:passResult});
  const first=mergeCodingTraceLedger({},[trace]);
  const second=mergeCodingTraceLedger(first,[trace]);
  assert.equal(first.stats.added,1);
  assert.equal(first.stats.total,1);
  assert.equal(second.stats.total,1);
  assert.equal(second.stats.refreshed,1);
  assert.equal(second.policy.provenanceOnlyUntilVerified,true);
  assert.equal(second.policy.unverifiedAttemptReusable,false);
  assert.equal(second.policy.rawCodeStored,false);
  assert.equal(second.policy.mayExpandAuthority,false);
});
