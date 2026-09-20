// 파일명: qa/company-recovery-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueRecovery, reviewRecovery, settleRecovery } from '../tools/company-recovery-queue.mjs';
import { escalateRecoveryCandidates } from '../tools/company-recovery-escalation.mjs';
import { dispatchRecovery } from '../tools/company-recovery-dispatch.mjs';
import { promoteVerifiedRecoveryLearning } from '../tools/company-recovery-learning.mjs';
import { distillRecoveryCodePatterns } from '../tools/company-recovery-code-distillation.mjs';

test('repeated failure is escalated into recovery queue',()=>{
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[
      {id:'g1',status:'failed',target:'web',sourceRoot:'web-games/g1',currentStep:'WEB_RUNTIME',blocker:'same-failure',evidence:['failure-cause:same-failure']},
      {id:'g2',status:'failed',target:'web',sourceRoot:'web-games/g2',currentStep:'WEB_RUNTIME',blocker:'same-failure',evidence:['failure-cause:same-failure']},
      {id:'g3',status:'failed',target:'web',sourceRoot:'web-games/g3',currentStep:'WEB_RUNTIME',blocker:'same-failure',evidence:['failure-cause:same-failure']}
    ]}
  });
  assert.equal(result.added.length,1);
  const row=result.queue.tasks[0];
  assert.equal(row.blastRadius,'portfolio:3');
  assert.equal(row.recoveryOwner,'VIBE2_VIBE3');
  assert.match(row.recoveryStrategy,/RESUME_EXACT_FAILED_GAME_STAGE/);
});

test('cancelled or completed tasks never re-enter recovery escalation from stale failure evidence',()=>{
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[
      {id:'old-design-only',status:'cancelled',target:'unity',sourceRoot:'unity-games/old',recoveryGeneration:2,blocker:'production-authority-inactive:DESIGN_ONLY',evidence:['system-steward:retry-exhausted-regenerated:generation-2']},
      {id:'already-done',status:'done',target:'web',sourceRoot:'web-games/done',recoveryGeneration:3,blocker:'source-candidate-generation-failed',evidence:['failure-cause:source-candidate-generation-failed']}
    ]},
    systemAiQueueInput:{tasks:[
      {id:'sys-done',status:'done',retries:4,blocker:'system-ai-implementation-failed'}
    ]}
  });
  assert.equal(result.added.length,0);
  assert.equal(result.queue.tasks.length,0);
});

test('recovery escalation normalizes steward signatures and reuses canonical exact stage',()=>{
  const existing=enqueueRecovery({tasks:[]},{
    sourceQueue:'vibe2',sourceTaskId:'g1',failureStage:'SOURCE_CANDIDATE_GENERATION',
    failureSignature:'source-candidate-generation-failed',blastRadius:'portfolio:3',
    relatedTaskIds:['g1','g2','g3'],
    recoveryStrategy:'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[
      {id:'g1',status:'running',target:'web',sourceRoot:'web-games/g1',recoveryGeneration:1,evidence:['system-steward:failure-signature:source-candidate-generation-failed','recovery-exact-stage:SOURCE_CANDIDATE_GENERATION']},
      {id:'g2',status:'running',target:'web',sourceRoot:'web-games/g2',recoveryGeneration:1,evidence:['system-steward:failure-signature:source-candidate-generation-failed','recovery-exact-stage:SOURCE_CANDIDATE_GENERATION']},
      {id:'g3',status:'queued',target:'web',sourceRoot:'web-games/g3',recoveryGeneration:1,evidence:['system-steward:failure-signature:source-candidate-generation-failed','recovery-exact-stage:SOURCE_CANDIDATE_GENERATION']}
    ]},
    recoveryInput:existing
  });
  assert.equal(result.added.length,0);
  assert.equal(result.queue.tasks.length,1);
  assert.equal(result.queue.tasks[0].failureSignature,'source-candidate-generation-failed');
  assert.equal(result.queue.tasks[0].failureStage,'SOURCE_CANDIDATE_GENERATION');
});

test('source refailure follows superseded duplicate to the dispatched canonical recovery',()=>{
  let existing=enqueueRecovery({tasks:[]},{
    id:'recovery-canonical',sourceQueue:'system-ai',sourceTaskId:'sys-impl',failureStage:'SYSTEM_AI_IMPLEMENTATION',
    failureSignature:'repeated-system-ai-implementation-failed',
    recoveryStrategy:'ASSIGN_SCOPED_SYSTEM_REPAIR_TO_SUPERVISED_SYSTEM_AI_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  existing.tasks[0].status='dispatched';
  existing=enqueueRecovery(existing,{
    id:'recovery-duplicate',sourceQueue:'system-ai',sourceTaskId:'sys-impl',failureStage:'system-ai-implementation-failed',
    failureSignature:'system-ai-implementation-failed',evidence:['superseded-by:recovery-canonical'],
    recoveryStrategy:'ASSIGN_SCOPED_SYSTEM_REPAIR_TO_SUPERVISED_SYSTEM_AI_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  existing.tasks.find(t=>t.id==='recovery-duplicate').status='cancelled-superseded-canonical-recovery';

  const failed=escalateRecoveryCandidates({
    systemAiQueueInput:{tasks:[{id:'sys-impl',status:'failed',retries:3,blocker:'system-ai-implementation-failed'}]},
    recoveryInput:existing
  });
  assert.equal(failed.added.length,0);
  assert.deepEqual(failed.reactivated,['recovery-canonical']);
  assert.equal(failed.queue.tasks.find(t=>t.id==='recovery-canonical').status,'queued');
  assert.equal(failed.queue.tasks.find(t=>t.id==='recovery-duplicate').status,'cancelled-superseded-canonical-recovery');
  assert(failed.queue.tasks.find(t=>t.id==='recovery-canonical').evidence.includes('recovery-reactivated-after-source-refailure'));

  const runningInput=JSON.parse(JSON.stringify(existing));
  const running=escalateRecoveryCandidates({
    systemAiQueueInput:{tasks:[{id:'sys-impl',status:'running',retries:3,blocker:'system-ai-implementation-failed'}]},
    recoveryInput:runningInput
  });
  assert.equal(running.reactivated.length,0);
  assert.equal(running.queue.tasks.find(t=>t.id==='recovery-canonical').status,'dispatched');
});


test('source candidate UNKNOWN_STAGE joins the active portfolio recovery',()=>{
  let recovery=enqueueRecovery({tasks:[]},{
    id:'recovery-source-portfolio',sourceQueue:'vibe2',sourceTaskId:'old-source',
    failureStage:'SOURCE_CANDIDATE_GENERATION',failureSignature:'source-candidate-generation-failed',
    blastRadius:'portfolio:3',relatedTaskIds:['old-source'],
    recoveryOwner:'VIBE2_VIBE3',
    recoveryStrategy:'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  recovery.tasks[0].status='dispatched';
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[{
      id:'new-source',status:'running',target:'web',sourceRoot:'web-games/new-source',recoveryGeneration:1,
      evidence:['system-steward:failure-signature:source-candidate-generation-failed','recovery-exact-stage:UNKNOWN_STAGE']
    }]},
    recoveryInput:recovery
  });
  assert.equal(result.added.length,0);
  assert.equal(result.queue.tasks.length,1);
  assert.equal(result.queue.tasks[0].failureStage,'SOURCE_CANDIDATE_GENERATION');
  assert.equal(result.queue.tasks[0].failureSignature,'source-candidate-generation-failed');
  assert(result.queue.tasks[0].relatedTaskIds.includes('new-source'));
});

test('recovery failures remain queued past the legacy retry cap',()=>{
  let recovery=enqueueRecovery({tasks:[]},{
    id:'unlimited-recovery',sourceQueue:'vibe2',sourceTaskId:'g1',
    failureStage:'SOURCE_CANDIDATE_GENERATION',failureSignature:'source-candidate-generation-failed',
    recoveryOwner:'VIBE2_VIBE3',maxRetries:1,
    recoveryStrategy:'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  recovery=settleRecovery(recovery,{id:'unlimited-recovery',outcome:'FAIL'});
  recovery=settleRecovery(recovery,{id:'unlimited-recovery',outcome:'FAIL'});
  assert.equal(recovery.tasks[0].status,'queued');
  assert.equal(recovery.tasks[0].retryPolicy,'UNLIMITED');
  assert.equal(recovery.tasks[0].retries,2);
  assert(recovery.tasks[0].evidence.includes('recovery-retry-policy:UNLIMITED'));
});

test('dispatch reconciles completed Vibe recovery instead of leaving it dispatched forever',()=>{
  let recovery=enqueueRecovery({tasks:[]},{
    id:'recovery-g1',sourceQueue:'vibe2',sourceTaskId:'g1',
    failureStage:'SOURCE_CANDIDATE_GENERATION',failureSignature:'source-candidate-generation-failed',
    recoveryOwner:'VIBE2_VIBE3',
    recoveryStrategy:'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  recovery.tasks[0].status='dispatched';
  recovery.tasks[0].dispatchTaskIds=['g1'];
  const result=dispatchRecovery({
    recoveryInput:recovery,
    gameQueueInput:{tasks:[{id:'g1',status:'done',evidence:['recovery-queue:recovery-g1']}]},
    systemAiQueueInput:{tasks:[]},
    route:'vibe'
  });
  assert.equal(result.reconciled.resolved,1);
  assert.equal(result.recovery.tasks[0].status,'awaiting-primary-ai-review');
  assert(result.recovery.tasks[0].deterministicEvidence.includes('recovery-source-task-pass:g1'));
});

test('recovery learning requires deterministic pass and primary AI review',()=>{
  let q=enqueueRecovery({tasks:[]},{
    sourceQueue:'system-ai',sourceTaskId:'s1',failureStage:'MODEL_OUTPUT',
    failureSignature:'SYSTEM_AI_MODEL_JSON_MISSING',blastRadius:'single-task',
    recoveryStrategy:'FORCE_JSON_AND_RETRY',verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  q=settleRecovery(q,{id:q.tasks[0].id,outcome:'PASS',evidence:['exact-stage:PASS','regression:PASS']});
  const before=promoteVerifiedRecoveryLearning({recoveryInput:q,experienceInput:{version:3,records:[]}});
  assert.equal(before.added,0);
  q=reviewRecovery(q,{id:q.tasks[0].id,decision:'PASS',evidence:['primary-ai-diff-review:PASS']});
  const after=promoteVerifiedRecoveryLearning({recoveryInput:q,experienceInput:{version:3,records:[]}});
  assert.equal(after.added,1);
  assert.equal(after.experience.records[0].verified,true);
  assert.equal(after.experience.records[0].authority,'VERIFIED_RECOVERY_LEARNING');
});

test('verified recovery becomes mastery-eligible code pattern while external sources remain advisory',()=>{
  const recovery={tasks:[{
    id:'r1',status:'verified',primaryAiReview:'PASS',failureStage:'CACHE_STARTUP',
    failureSignature:'ollama cached binary path missing',recoveryStrategy:'VALIDATE_CACHE_AND_RUN_DIRECT_BINARY',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE','REGRESSION'],deterministicEvidence:['exact:PASS','regression:PASS'],
    evidence:['primary-ai-recovery-review:PASS']
  }]};
  const result=distillRecoveryCodePatterns({
    recoveryInput:recovery,
    libraryInput:{patterns:[]},
    authorizedSummary:{
      authority:'OWNER_ASSERTED_REUSE_REINTERPRETATION',gameId:'block-blast',
      packageFingerprint:'a'.repeat(64),learningDomains:['save-state-persistence'],
      reusablePatterns:['AUTHORIZED_SOURCE:save-state-persistence']
    },
    externalMemory:{positive:[{
      id:'ext',project:'reference',authority:'verified-memory-entry',
      sourceRevision:'sha256:'+'b'.repeat(64),tags:['external-black-box'],
      request:'verify launch input response process survival crash absence'
    }]}
  });
  const internal=result.patterns.filter(x=>x.authority==='VERIFIED_INTERNAL_RECOVERY_CODE_PATTERN');
  const external=result.patterns.filter(x=>x.authority!=='VERIFIED_INTERNAL_RECOVERY_CODE_PATTERN');
  assert.ok(internal.length>=2);
  assert.ok(internal.every(x=>x.independentQa==='PASS'&&x.masteryEligible===true&&x.rawCodeStored===false));
  assert.ok(external.length>=2);
  assert.ok(external.every(x=>x.masteryEligible===false&&x.rawCodeStored===false));
});
