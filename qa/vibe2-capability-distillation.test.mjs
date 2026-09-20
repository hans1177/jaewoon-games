import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildObservableCodingTrace,
  buildVerifiedCapabilityExperienceReview,
  buildCapabilityApplicationReviews,
  applyCapabilityApplicationReviews,
  applyCapabilityBenchmarkReviews,
  applyCapabilityPortfolioDecisions,
  mergeCodingTraceLedger,
  retrieveVerifiedCapabilities,
  verifiedCapabilityGuidance
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


test('ambiguous OTHER failure is provenance only and cannot become a reusable failure lesson',()=>{
  const ambiguous={
    ...passResult,
    reservationId:'reservation-3',
    outcome:'FAIL',
    candidateBranch:null,
    candidateIdentity:null,
    candidateFailure:{class:'OTHER',message:'unknown failure'},
    evidence:['actions-run:12347','reservation-id:reservation-3','source-generation-failure:OTHER'],
    roleResults:{exploration:'PASS',implementation:'FAIL',test:'FAIL',performance:'FAIL',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'}
  };
  const trace=buildObservableCodingTrace({task,result:ambiguous});
  assert.equal(trace.verification.candidateFailureClass,'OTHER');
  assert.equal(buildVerifiedCapabilityExperienceReview({task,result:ambiguous,finalReviewPass:false,selected:false}),null);
});


test('explicit capability retrieval selects only verified reusable capability experiences',()=>{
  const experienceInput={records:[
    {
      id:'cap_verified',
      gameId:'bug-defense',
      engine:'web',
      departments:['development','qa'],
      taskType:'coding-capability-distillation',
      problem:'save restore bug',
      goal:'repair save flow',
      change:'strategy RESPONSIBILITY_FIRST',
      outcome:'PASS',
      qa:['full-fan-in-regression-pass'],
      evidence:['actions-run:200','fan-in-review:PASS'],
      reusablePatterns:['CAPABILITY:CODING_STRATEGY:RESPONSIBILITY_FIRST','CAPABILITY_DOMAIN:ROOT_CAUSE_DEBUGGING'],
      avoidPatterns:[],
      verified:true
    },
    {
      id:'general_verified',
      gameId:'bug-defense',
      engine:'web',
      departments:['development'],
      taskType:'general',
      problem:'save restore bug',
      goal:'repair save flow',
      change:'generic lesson',
      outcome:'PASS',
      evidence:['actions-run:201'],
      reusablePatterns:['GENERAL_ONLY'],
      verified:true
    },
    {
      id:'cap_unrelated',
      gameId:'other-game',
      engine:'web',
      taskType:'coding-capability-distillation',
      problem:'camera cinematic framing',
      goal:'improve boss camera',
      change:'camera strategy',
      outcome:'PASS',
      evidence:['actions-run:202'],
      reusablePatterns:['CAPABILITY_DOMAIN:CAMERA_LANGUAGE'],
      verified:true
    },
    {
      id:'cap_cross_game_relevant',
      gameId:'other-save-game',
      engine:'web',
      departments:['development'],
      taskType:'coding-capability-distillation',
      problem:'save restore ordering bug',
      goal:'repair save restore flow',
      change:'cross game verified save restoration sequencing',
      outcome:'PASS',
      evidence:['actions-run:203','fan-in-review:PASS'],
      reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE'],
      verified:true
    },
    {
      id:'cap_unverified',
      gameId:'bug-defense',
      engine:'web',
      taskType:'coding-capability-distillation',
      problem:'save restore bug',
      goal:'repair save flow',
      change:'unverified',
      outcome:'PASS',
      evidence:['attempt-only'],
      reusablePatterns:['SHOULD_NOT_APPEAR'],
      verified:false
    }
  ]};
  const retrieval=retrieveVerifiedCapabilities({
    experienceInput,
    task:{gameId:'bug-defense',target:'web',department:'development',goal:'repair save restore flow',responsibleFiles:['web-games/bug-defense/index.html']}
  });
  assert.equal(retrieval.kind,'verified-coding-capability-retrieval');
  assert.equal(retrieval.count,2);
  assert.deepEqual(retrieval.records.map(row=>row.id).sort(),['cap_cross_game_relevant','cap_verified']);
  assert.equal(retrieval.records[0].id,'cap_verified');
  assert.equal(retrieval.verifiedOnly,true);
  assert.equal(retrieval.rawTraceUsed,false);
  assert.equal(retrieval.rawCodeUsed,false);
  assert.equal(retrieval.crossGameKeywordOverlapRequired,true);
  assert.equal(retrieval.sameEngineAloneEligible,false);
  assert.equal(retrieval.writableScopeExpansionAllowed,false);
  assert.equal(retrieval.qaBypassAllowed,false);
  assert.equal(retrieval.authorityExpanded,false);

  const guidance=verifiedCapabilityGuidance(retrieval);
  assert.match(guidance,/VERIFIED CAPABILITY MEMORY/);
  assert.match(guidance,/RESPONSIBILITY_FIRST/);
  assert.doesNotMatch(guidance,/GENERAL_ONLY/);
  assert.doesNotMatch(guidance,/SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(guidance,/CAMERA_LANGUAGE/);
  assert.match(guidance,/CROSS_GAME_SAVE_RESTORE/);
  assert.match(guidance,/MUST NOT expand writable scope/);
});


test('phase 3 binds exact injected capability ids to fresh qa and only repeated independent passes raise capability confidence',()=>{
  const memory={records:[{
    id:'cap_verified',
    gameId:'bug-defense',
    engine:'web',
    departments:['development','qa'],
    taskType:'coding-capability-distillation',
    problem:'save restore bug',
    goal:'repair save flow',
    change:'strategy RESPONSIBILITY_FIRST',
    outcome:'PASS',
    qa:['full-fan-in-regression-pass'],
    evidence:['actions-run:200','fan-in-review:PASS'],
    reusablePatterns:['CAPABILITY:CODING_STRATEGY:RESPONSIBILITY_FIRST'],
    verified:true
  }]};
  const task1={...task,id:'task-capability-app-1',compiledWorkContract:{...task.compiledWorkContract,workKey:'bug-defense:web:save:1'}};
  const result1={
    ...passResult,
    taskId:task1.id,
    reservationId:'reservation-app-1',
    candidateBranch:'vibe2/candidate/bug-defense-app-1',
    capabilityApplication:{
      version:1,
      injected:true,
      exactInjectedCapabilityIds:['cap_verified'],
      workKey:task1.compiledWorkContract.workKey
    }
  };
  const reviews1=buildCapabilityApplicationReviews({task:task1,result:result1,finalReviewPass:true,selected:true});
  assert.equal(reviews1.length,1);
  assert.equal(reviews1[0].capabilityId,'cap_verified');
  assert.equal(reviews1[0].freshTaskQaPass,true);
  assert.deepEqual(reviews1[0].coAppliedCapabilityIds,['cap_verified']);
  assert.equal(reviews1[0].rawCodeStored,false);
  const applied1=applyCapabilityApplicationReviews(memory,reviews1);
  assert.equal(applied1.applied,1);
  const first=applied1.memory.records.find(row=>row.id==='cap_verified');
  assert.equal(first.capabilityLifecycle.state,'APPLICATION_OBSERVED');
  assert.equal(first.capabilityLifecycle.independentPassCount,1);
  assert.equal(first.capabilityConfidence,0.5);

  const duplicate=applyCapabilityApplicationReviews(applied1.memory,reviews1);
  assert.equal(duplicate.applied,0);
  assert.equal(duplicate.duplicates,1);
  assert.equal(duplicate.memory.records.find(row=>row.id==='cap_verified').capabilityLifecycle.independentPassCount,1);

  const task2={...task,id:'task-capability-app-2',compiledWorkContract:{...task.compiledWorkContract,workKey:'bug-defense:web:save:2'}};
  const result2={
    ...passResult,
    taskId:task2.id,
    reservationId:'reservation-app-2',
    candidateBranch:'vibe2/candidate/bug-defense-app-2',
    capabilityApplication:{version:1,injected:true,exactInjectedCapabilityIds:['cap_verified'],workKey:task2.compiledWorkContract.workKey}
  };
  const applied2=applyCapabilityApplicationReviews(duplicate.memory,buildCapabilityApplicationReviews({task:task2,result:result2,finalReviewPass:true,selected:true}));
  const second=applied2.memory.records.find(row=>row.id==='cap_verified');
  assert.equal(second.capabilityLifecycle.state,'REPEATED_APPLICATION_VERIFIED');
  assert.equal(second.capabilityLifecycle.independentPassCount,2);
  assert.equal(second.capabilityConfidence,0.75);

  const task3={...task,id:'task-capability-app-fail',compiledWorkContract:{...task.compiledWorkContract,workKey:'bug-defense:web:save:fail'}};
  const failed={
    ...passResult,
    taskId:task3.id,
    reservationId:'reservation-app-fail',
    candidateBranch:null,
    outcome:'FAIL',
    roleResults:{exploration:'PASS',implementation:'FAIL',test:'FAIL',performance:'FAIL',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    capabilityApplication:{version:1,injected:true,exactInjectedCapabilityIds:['cap_verified'],workKey:task3.compiledWorkContract.workKey}
  };
  const appliedFailure=applyCapabilityApplicationReviews(applied2.memory,buildCapabilityApplicationReviews({task:task3,result:failed,finalReviewPass:false,selected:false}));
  const afterFailure=appliedFailure.memory.records.find(row=>row.id==='cap_verified');
  assert.equal(afterFailure.capabilityLifecycle.independentPassCount,2);
  assert.equal(afterFailure.capabilityLifecycle.contradictionCount,0);
  assert.equal(afterFailure.capabilityConfidence,0.75);
  assert.equal(afterFailure.capabilityLifecycle.unrelatedFailurePenaltyApplied,false);
});

test('phase 3 ignores capability application when no capability was actually injected',()=>{
  const result={...passResult,capabilityApplication:{version:1,injected:false,exactInjectedCapabilityIds:['cap_verified']}};
  assert.deepEqual(buildCapabilityApplicationReviews({task,result,finalReviewPass:true,selected:true}),[]);
});

test('capability guidance is empty when no verified capability matches exist',()=>{
  const retrieval=retrieveVerifiedCapabilities({
    experienceInput:{records:[]},
    task:{gameId:'unknown',target:'web',goal:'new task'}
  });
  assert.equal(retrieval.count,0);
  assert.equal(verifiedCapabilityGuidance(retrieval),'');
});


test('continuous runner injects verified capability memory once and partitions it from generic learning',()=>{
  const source=fs.readFileSync('tools/vibe2-continuous-runner.mjs','utf8');
  assert.match(source,/fullExperienceMemory=createVibeExperienceMemory\(experience\)/);
  assert.match(source,/genericLearningExperience=createVibeExperienceMemory/);
  assert.match(source,/taskType\)!=='coding-capability-distillation'/);
  assert.match(source,/experienceMemory:genericLearningExperience/);
  assert.match(source,/retrieveVerifiedCapabilities\(\{experienceInput:fullExperienceMemory/);
  assert.match(source,/experienceInput:genericLearningExperience/);
  assert.match(source,/verifiedCapabilityMemoryGuidance/);
  assert.match(source,/executionGoal = \[.*verifiedCapabilityMemoryGuidance/s);
  assert.match(source,/duplicateInjectionAllowed:false/);
  assert.match(source,/verifiedCapabilityMemoryAppliedToWorkerGoal/);
  assert.match(source,/capabilityApplicationContract/);
  assert.match(source,/exactInjectedCapabilityIds/);
  assert.match(source,/SOURCE_WORKER_RESULT_TO_FAN_IN_FRESH_QA/);
  assert.match(source,/VIBE2_VERIFIED_CAPABILITY_COUNT/);
  assert.match(source,/VIBE2_CAPABILITY_APPLICATION_IDS/);
  assert.match(source,/VIBE2_CAPABILITY_GENERIC_PARTITION_EXCLUDED/);
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/capabilityApplicationIds/);
  assert.match(workflow,/exactInjectedCapabilityIds/);
  assert.match(workflow,/capabilityApplication,durationMs/);
  const fanIn=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(fanIn,/buildCapabilityApplicationReviews/);
  assert.match(fanIn,/capabilityApplicationReviews/);
});


test('phase 4 requires two independent unseen paired benchmarks before strong generalization',()=>{
  const memory={records:[{
    id:'cap-phase4-generalize',
    gameId:'source-game',
    engine:'web',
    departments:['development','qa'],
    taskType:'coding-capability-distillation',
    problem:'save restore ordering',
    goal:'repair save restore flow',
    change:'verified save restore strategy',
    outcome:'PASS',
    qa:['full-fan-in-regression-pass'],
    evidence:['actions-run:400','fan-in-review:PASS'],
    reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE'],
    verified:true
  }]};
  const applications=[
    {
      version:1,capabilityId:'cap-phase4-generalize',applicationId:'app-phase4-a',
      taskId:'task-a',workKey:'game-a:web:save',gameId:'game-a',engine:'web',
      outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true,
      capabilitySpecificSupport:false,capabilitySpecificContradiction:false,
      coAppliedCapabilityIds:['cap-phase4-generalize'],evidence:['actions-run:401','fan-in-review:PASS']
    },
    {
      version:1,capabilityId:'cap-phase4-generalize',applicationId:'app-phase4-b',
      taskId:'task-b',workKey:'game-b:web:save',gameId:'game-b',engine:'web',
      outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true,
      capabilitySpecificSupport:false,capabilitySpecificContradiction:false,
      coAppliedCapabilityIds:['cap-phase4-generalize'],evidence:['actions-run:402','fan-in-review:PASS']
    }
  ];
  const observed=applyCapabilityApplicationReviews(memory,applications);
  let record=observed.memory.records.find(row=>row.id==='cap-phase4-generalize');
  assert.equal(record.capabilityLifecycle.generalizationCandidate,true);
  assert.equal(record.capabilityLifecycle.state,'GENERALIZATION_CANDIDATE');
  assert.equal(record.capabilityLifecycle.strongGeneralizationVerified,false);

  const baseBenchmark={
    version:1,capabilityId:'cap-phase4-generalize',
    engine:'web',unseenGame:true,independent:true,pairedControlChallenger:true,
    controlFreshQaPass:false,challengerFreshQaPass:true,freshIndependentQaPass:true,
    fullRegressionPass:true,nativeRuntimeRequired:false,nativeRuntimePass:false,
    nonTargetContextFixed:true,writableScopeFixed:true,modelBudgetFixed:true,qaContractFixed:true,
    capabilitySpecificPositiveSupport:true,capabilitySpecificContradiction:false,
    evidence:['benchmark-control:verified','benchmark-challenger:verified']
  };
  const one=applyCapabilityBenchmarkReviews(observed.memory,[{
    ...baseBenchmark,benchmarkId:'bench-u1',caseId:'case-u1',pairId:'pair-u1',
    gameId:'unseen-game-1',unseenProblemFingerprint:'fp-unseen-1'
  }]);
  record=one.memory.records.find(row=>row.id==='cap-phase4-generalize');
  assert.equal(record.capabilityLifecycle.unseenBenchmarkPassCount,1);
  assert.equal(record.capabilityLifecycle.state,'GENERALIZATION_CANDIDATE');

  const two=applyCapabilityBenchmarkReviews(one.memory,[{
    ...baseBenchmark,benchmarkId:'bench-u2',caseId:'case-u2',pairId:'pair-u2',
    gameId:'unseen-game-2',unseenProblemFingerprint:'fp-unseen-2'
  }]);
  record=two.memory.records.find(row=>row.id==='cap-phase4-generalize');
  assert.equal(record.capabilityLifecycle.unseenBenchmarkPassCount,2);
  assert.equal(record.capabilityLifecycle.unseenBenchmarkDistinctGameCount,2);
  assert.equal(record.capabilityLifecycle.strongGeneralizationVerified,true);
  assert.equal(record.capabilityLifecycle.state,'GENERALIZED_VERIFIED');
  assert.equal(record.capabilityLifecycle.authorityExpanded,false);
});

test('phase 4 neutral or contradictory benchmark evidence cannot establish strong generalization',()=>{
  const memory={records:[{
    id:'cap-phase4-guard',
    gameId:'source-game',
    engine:'web',
    taskType:'coding-capability-distillation',
    problem:'save restore ordering',
    goal:'repair save restore flow',
    change:'verified save strategy',
    outcome:'PASS',
    evidence:['actions-run:410','fan-in-review:PASS'],
    reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE'],
    verified:true,
    capabilityApplications:[
      {applicationId:'guard-app-1',taskId:'g1',workKey:'g1:web:save',gameId:'g1',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true},
      {applicationId:'guard-app-2',taskId:'g2',workKey:'g2:web:save',gameId:'g2',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true}
    ]
  }]};
  const common={
    version:1,capabilityId:'cap-phase4-guard',engine:'web',unseenGame:true,independent:true,
    pairedControlChallenger:true,controlFreshQaPass:false,challengerFreshQaPass:true,
    freshIndependentQaPass:true,fullRegressionPass:true,nativeRuntimeRequired:false,
    nonTargetContextFixed:true,writableScopeFixed:true,modelBudgetFixed:true,qaContractFixed:true,
    evidence:['benchmark-control:verified','benchmark-challenger:verified']
  };
  const neutral=applyCapabilityBenchmarkReviews(memory,[{
    ...common,benchmarkId:'guard-neutral',caseId:'guard-neutral',pairId:'guard-neutral',
    gameId:'unseen-n1',unseenProblemFingerprint:'fp-neutral',
    capabilitySpecificPositiveSupport:false,capabilitySpecificContradiction:false
  }]);
  let record=neutral.memory.records.find(row=>row.id==='cap-phase4-guard');
  assert.equal(record.capabilityLifecycle.unseenBenchmarkPassCount,0);
  assert.equal(record.capabilityLifecycle.state,'GENERALIZATION_CANDIDATE');

  const contradicted=applyCapabilityBenchmarkReviews(neutral.memory,[
    {...common,benchmarkId:'guard-good-1',caseId:'guard-good-1',pairId:'guard-good-1',gameId:'unseen-c1',unseenProblemFingerprint:'fp-c1',capabilitySpecificPositiveSupport:true,capabilitySpecificContradiction:false},
    {...common,benchmarkId:'guard-good-2',caseId:'guard-good-2',pairId:'guard-good-2',gameId:'unseen-c2',unseenProblemFingerprint:'fp-c2',capabilitySpecificPositiveSupport:true,capabilitySpecificContradiction:false},
    {...common,benchmarkId:'guard-contradiction',caseId:'guard-contradiction',pairId:'guard-contradiction',gameId:'unseen-c3',unseenProblemFingerprint:'fp-c3',capabilitySpecificPositiveSupport:false,capabilitySpecificContradiction:true}
  ]);
  record=contradicted.memory.records.find(row=>row.id==='cap-phase4-guard');
  assert.equal(record.capabilityLifecycle.unseenBenchmarkPassCount,2);
  assert.equal(record.capabilityLifecycle.benchmarkContradictionCount,1);
  assert.equal(record.capabilityLifecycle.strongGeneralizationVerified,false);
  assert.equal(record.capabilityLifecycle.state,'GENERALIZATION_CANDIDATE');
});

test('phase 4 reviewed deprecation or supersession removes capability from retrieval without deleting provenance',()=>{
  const memory={records:[{
    id:'cap-phase4-supersede',
    gameId:'bug-defense',
    engine:'web',
    departments:['development'],
    taskType:'coding-capability-distillation',
    problem:'save restore bug',
    goal:'repair save restore flow',
    change:'older save strategy',
    outcome:'PASS',
    evidence:['actions-run:420','fan-in-review:PASS'],
    reusablePatterns:['CAPABILITY:SAVE_RESTORE_OLD'],
    verified:true
  }]};
  const rejected=applyCapabilityPortfolioDecisions(memory,[{
    capabilityId:'cap-phase4-supersede',decisionId:'decision-bad',state:'SUPERSEDED',
    supersededByCapabilityId:'cap-new',reviewed:false,capabilitySpecificEvidence:true,
    evidence:['only-one-proof']
  }]);
  assert.equal(rejected.applied,0);
  assert.equal(rejected.rejected,1);

  const applied=applyCapabilityPortfolioDecisions(memory,[{
    capabilityId:'cap-phase4-supersede',decisionId:'decision-good',state:'SUPERSEDED',
    supersededByCapabilityId:'cap-new',reviewed:true,capabilitySpecificEvidence:true,
    reason:'new capability dominates on matched verified evidence',
    evidence:['benchmark-comparison:PASS','review:PASS']
  }]);
  const stored=applied.memory.records.find(row=>row.id==='cap-phase4-supersede');
  assert.equal(stored.capabilityPortfolio.state,'SUPERSEDED');
  assert.equal(stored.capabilityLifecycle.state,'SUPERSEDED');
  assert.equal(stored.capabilityLifecycle.retrievalEligible,false);
  assert.equal(stored.reusable,true);
  assert.equal(stored.evidence.includes('actions-run:420'),true);

  const retrieval=retrieveVerifiedCapabilities({
    experienceInput:applied.memory,
    task:{gameId:'bug-defense',target:'web',department:'development',goal:'repair save restore flow'}
  });
  assert.equal(retrieval.records.some(row=>row.id==='cap-phase4-supersede'),false);
  assert.equal(retrieval.deprecatedOrSupersededRetrievalEligible,false);
});


test('phase 4 practice control gets zero capabilities and challenger gets only exact candidate',()=>{
  const base=(id,gameId)=>({
    id,gameId,engine:'web',departments:['development'],taskType:'coding-capability-distillation',
    problem:'save restore ordering',goal:'repair save restore',change:'verified save strategy',outcome:'PASS',
    evidence:['actions-run:510','fan-in-review:PASS'],reusablePatterns:['CAPABILITY:SAVE_RESTORE'],verified:true,
    capabilityApplications:[
      {applicationId:id+'-a',taskId:id+'-a',workKey:'ga:web:save',gameId:'ga',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true},
      {applicationId:id+'-b',taskId:id+'-b',workKey:'gb:web:save',gameId:'gb',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true}
    ]
  });
  const experienceInput={records:[base('cap-target','source-a'),base('cap-other','source-b')]};
  const commonEvidence=[
    'learning-practice-only',
    'phase4-generalization-screen-only',
    'phase4-capability-id:cap-target',
    'phase4-benchmark-pair:pair-1',
    'phase4-unseen-game:holdout-game',
    'phase4-unseen-problem-fingerprint:fp-holdout'
  ];
  const control=retrieveVerifiedCapabilities({
    experienceInput,
    task:{gameId:'holdout-game',target:'web',goal:'unseen unrelated holdout',evidence:[...commonEvidence,'phase4-benchmark-role:CONTROL']}
  });
  assert.equal(control.count,0);
  assert.equal(control.phase4BenchmarkScreen,true);
  assert.equal(control.phase4BenchmarkRole,'CONTROL');
  assert.equal(control.phase4ExactCapabilityIsolation,true);
  assert.equal(verifiedCapabilityGuidance(control),'');

  const challenger=retrieveVerifiedCapabilities({
    experienceInput,
    task:{gameId:'holdout-game',target:'web',goal:'unseen unrelated holdout',evidence:[...commonEvidence,'phase4-benchmark-role:CHALLENGER']}
  });
  assert.equal(challenger.count,1);
  assert.equal(challenger.records[0].id,'cap-target');
  assert.deepEqual(challenger.records[0].reasons,['phase4-benchmark-exact-target']);
  assert.equal(challenger.phase4BenchmarkRole,'CHALLENGER');
  assert.equal(challenger.phase4ExactCapabilityIsolation,true);
  assert.match(verifiedCapabilityGuidance(challenger),/cap-target/);
  assert.doesNotMatch(verifiedCapabilityGuidance(challenger),/cap-other/);
});
