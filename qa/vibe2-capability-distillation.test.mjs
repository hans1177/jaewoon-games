import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildObservableCodingTrace,
  buildVerifiedCapabilityExperienceReview,
  buildCapabilityApplicationReviews,
  applyCapabilityApplicationReviews,
  buildCapabilityGeneralizationBenchmarkContract,
  applyCapabilityGeneralizationBenchmarkToRetrieval,
  buildCapabilityGeneralizationBenchmarkReviews,
  applyCapabilityGeneralizationBenchmarkReviews,
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
  assert.match(source,/capabilityGeneralizationBenchmark/);
  assert.match(source,/buildCapabilityGeneralizationBenchmarkContract/);
  assert.match(source,/applyCapabilityGeneralizationBenchmarkToRetrieval/);
  assert.match(source,/exactInjectedCapabilityIds/);
  assert.match(source,/SOURCE_WORKER_RESULT_TO_FAN_IN_FRESH_QA/);
  assert.match(source,/VIBE2_VERIFIED_CAPABILITY_COUNT/);
  assert.match(source,/VIBE2_CAPABILITY_APPLICATION_IDS/);
  assert.match(source,/VIBE2_CAPABILITY_GENERIC_PARTITION_EXCLUDED/);
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/capabilityApplicationIds/);
  assert.match(workflow,/exactInjectedCapabilityIds/);
  assert.match(workflow,/capabilityApplication,capabilityGeneralizationBenchmark,durationMs/);
  assert.match(workflow,/version:12/);
  const fanIn=fs.readFileSync('tools/vibe2-fan-in-review.mjs','utf8');
  assert.match(fanIn,/buildCapabilityApplicationReviews/);
  assert.match(fanIn,/capabilityApplicationReviews/);
  assert.match(fanIn,/buildCapabilityGeneralizationBenchmarkReviews/);
  assert.match(fanIn,/capabilityGeneralizationBenchmarkReviews/);
});


test('phase 4 controlled pair withholds only the target capability from control',()=>{
  const retrieval={
    records:[
      {
        id:'cap_generalize',
        gameId:'origin-game',
        reasons:['keyword-overlap:save'],
        capabilityLifecycle:{state:'GENERALIZATION_CANDIDATE',generalizationCandidate:true,contradictionCount:0},
        capabilityBenchmarks:[]
      },
      {
        id:'cap_other',
        gameId:'another-origin',
        reasons:['keyword-overlap:save'],
        capabilityLifecycle:{state:'REPEATED_APPLICATION_VERIFIED',generalizationCandidate:false,contradictionCount:0},
        capabilityBenchmarks:[]
      }
    ],
    count:2,
    verifiedOnly:true,
    advisoryOnly:true,
    authorityExpanded:false
  };
  const benchmarkTask={
    id:'phase4-task',
    gameId:'unseen-game',
    target:'web',
    goal:'repair save restore flow',
    responsibleFiles:['web-games/unseen-game/index.html'],
    compiledWorkContract:{workKey:'unseen-game:web:save'}
  };
  const control=buildCapabilityGeneralizationBenchmarkContract({retrieval,task:benchmarkTask,variant:'speculative-1'});
  const challenger=buildCapabilityGeneralizationBenchmarkContract({retrieval,task:benchmarkTask,variant:'speculative-2'});
  assert.equal(control.enabled,true);
  assert.equal(challenger.enabled,true);
  assert.equal(control.pairId,challenger.pairId);
  assert.equal(control.targetCapabilityId,'cap_generalize');
  assert.equal(control.contextHash,challenger.contextHash);
  const controlRetrieval=applyCapabilityGeneralizationBenchmarkToRetrieval(retrieval,control);
  const challengerRetrieval=applyCapabilityGeneralizationBenchmarkToRetrieval(retrieval,challenger);
  assert.deepEqual(controlRetrieval.records.map(row=>row.id),['cap_other']);
  assert.deepEqual(challengerRetrieval.records.map(row=>row.id),['cap_generalize','cap_other']);
  assert.equal(controlRetrieval.targetCapabilityWithheld,true);
  assert.equal(challengerRetrieval.targetCapabilityWithheld,false);
  assert.equal(control.authorityExpanded,false);
});

test('phase 4 requires two independent unseen capability-specific wins before GENERALIZED_VERIFIED',()=>{
  const capabilityMemory={records:[{
    id:'cap_generalize',
    gameId:'origin-game',
    engine:'web',
    departments:['development','qa'],
    taskType:'coding-capability-distillation',
    problem:'save restore ordering',
    goal:'repair save restore ordering',
    change:'verified save restoration sequence',
    outcome:'PASS',
    qa:['full-fan-in-regression-pass'],
    evidence:['actions-run:400','fan-in-review:PASS'],
    reusablePatterns:['CAPABILITY:CROSS_GAME_SAVE_RESTORE'],
    verified:true,
    capabilityApplications:[
      {applicationId:'app-a',taskId:'task-a',workKey:'game-a:web:save',gameId:'game-a',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true},
      {applicationId:'app-b',taskId:'task-b',workKey:'game-b:web:save',gameId:'game-b',engine:'web',outcome:'FRESH_QA_PASS',selected:true,finalReviewPass:true,freshTaskQaPass:true,independent:true}
    ]
  }]};

  const pair=(gameId,suffix)=>({
    task:{id:'task-'+suffix,gameId,target:'web',goal:'repair save restore flow'},
    results:[
      {
        taskId:'task-'+suffix,reservationId:'r-'+suffix+'-c',variant:'speculative-1',outcome:'FAIL',
        baseMainSha:'base-'+suffix,candidateBranch:null,
        roleResults:{test:'FAIL',performance:'PASS'},
        codingMethod:{generationAttemptBudget:2},
        capabilityApplication:{exactInjectedCapabilityIds:[]},
        capabilityGeneralizationBenchmark:{
          enabled:true,pairId:'pair-'+suffix,role:'control',targetCapabilityId:'cap_generalize',
          gameId,engine:'web',problemFingerprint:'problem-'+suffix,sourceCapabilityGameId:'origin-game',
          unseenGame:true,unseenProblem:true,contextHash:'ctx-'+suffix,
          sameModelGenerationBudgetRequired:true,sameWritableScopeRequired:true,sameQaContractRequired:true,
          nonTargetContextFixed:true,targetCapabilityOnlyGuidanceDelta:true
        }
      },
      {
        taskId:'task-'+suffix,reservationId:'r-'+suffix+'-h',variant:'speculative-2',outcome:'PASS',
        baseMainSha:'base-'+suffix,candidateBranch:'vibe2/candidate/'+suffix,
        roleResults:{test:'PASS',performance:'PASS'},
        codingMethod:{generationAttemptBudget:2},
        capabilityApplication:{exactInjectedCapabilityIds:['cap_generalize']},
        capabilityGeneralizationBenchmark:{
          enabled:true,pairId:'pair-'+suffix,role:'challenger',targetCapabilityId:'cap_generalize',
          gameId,engine:'web',problemFingerprint:'problem-'+suffix,sourceCapabilityGameId:'origin-game',
          unseenGame:true,unseenProblem:true,contextHash:'ctx-'+suffix,
          sameModelGenerationBudgetRequired:true,sameWritableScopeRequired:true,sameQaContractRequired:true,
          nonTargetContextFixed:true,targetCapabilityOnlyGuidanceDelta:true
        }
      }
    ]
  });

  const firstPair=pair('unseen-one','one');
  const firstReviews=buildCapabilityGeneralizationBenchmarkReviews({...firstPair,fanInRegressionPass:true});
  assert.equal(firstReviews.length,1);
  assert.equal(firstReviews[0].capabilitySpecificSupport,true);
  assert.equal(firstReviews[0].capabilitySpecificContradiction,false);
  assert.equal(firstReviews[0].challengerFreshQaPass,true);
  const afterFirst=applyCapabilityGeneralizationBenchmarkReviews(capabilityMemory,firstReviews);
  const firstRecord=afterFirst.memory.records.find(row=>row.id==='cap_generalize');
  assert.equal(firstRecord.capabilityLifecycle.state,'GENERALIZATION_CANDIDATE');
  assert.equal(firstRecord.capabilityLifecycle.independentUnseenPassCount,1);
  assert.equal(firstRecord.capabilityLifecycle.strongGeneralizationVerified,false);

  const secondPair=pair('unseen-two','two');
  const secondReviews=buildCapabilityGeneralizationBenchmarkReviews({...secondPair,fanInRegressionPass:true});
  const afterSecond=applyCapabilityGeneralizationBenchmarkReviews(afterFirst.memory,secondReviews);
  const secondRecord=afterSecond.memory.records.find(row=>row.id==='cap_generalize');
  assert.equal(secondRecord.capabilityLifecycle.state,'GENERALIZED_VERIFIED');
  assert.equal(secondRecord.capabilityLifecycle.independentUnseenPassCount,2);
  assert.equal(secondRecord.capabilityLifecycle.distinctUnseenGameCount,2);
  assert.equal(secondRecord.capabilityLifecycle.strongGeneralizationVerified,true);
  assert.equal(secondRecord.capabilityLifecycle.contradictionCount,0);
  assert.equal(secondRecord.capabilityLifecycle.authorityExpanded,false);
});

test('phase 4 paired benchmark stays inconclusive when both control and challenger pass',()=>{
  const contract={
    enabled:true,pairId:'pair-neutral',targetCapabilityId:'cap_generalize',
    gameId:'unseen-neutral',engine:'web',problemFingerprint:'problem-neutral',sourceCapabilityGameId:'origin-game',
    unseenGame:true,unseenProblem:true,contextHash:'ctx-neutral',
    sameModelGenerationBudgetRequired:true,sameWritableScopeRequired:true,sameQaContractRequired:true,
    nonTargetContextFixed:true,targetCapabilityOnlyGuidanceDelta:true
  };
  const reviews=buildCapabilityGeneralizationBenchmarkReviews({
    task:{id:'neutral-task',gameId:'unseen-neutral',target:'web'},
    fanInRegressionPass:true,
    results:[
      {taskId:'neutral-task',reservationId:'neutral-c',variant:'speculative-1',outcome:'PASS',baseMainSha:'base-neutral',candidateBranch:'control',roleResults:{test:'PASS',performance:'PASS'},codingMethod:{generationAttemptBudget:2},capabilityApplication:{exactInjectedCapabilityIds:[]},capabilityGeneralizationBenchmark:{...contract,role:'control'}},
      {taskId:'neutral-task',reservationId:'neutral-h',variant:'speculative-2',outcome:'PASS',baseMainSha:'base-neutral',candidateBranch:'challenger',roleResults:{test:'PASS',performance:'PASS'},codingMethod:{generationAttemptBudget:2},capabilityApplication:{exactInjectedCapabilityIds:['cap_generalize']},capabilityGeneralizationBenchmark:{...contract,role:'challenger'}}
    ]
  });
  assert.equal(reviews.length,1);
  assert.equal(reviews[0].inconclusive,true);
  assert.equal(reviews[0].capabilitySpecificSupport,false);
  assert.equal(reviews[0].capabilitySpecificContradiction,false);
});
