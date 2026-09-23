// 파일명: qa/company-recovery-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enqueueRecovery, reviewRecovery, settleRecovery } from '../tools/company-recovery-queue.mjs';
import { applySystemAiResults, normalizeSystemAiQueue } from '../tools/company-system-ai-queue.mjs';
import { escalateRecoveryCandidates } from '../tools/company-recovery-escalation.mjs';
import { promoteVerifiedRecoveryLearning } from '../tools/company-recovery-learning.mjs';
import { distillRecoveryCodePatterns } from '../tools/company-recovery-code-distillation.mjs';

test('repeated failure is escalated into recovery queue',()=>{
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[
      {id:'g1',gameId:'g1',status:'failed',target:'web',sourceRoot:'web-games/g1',responsibleFiles:['web-games/g1/index.html'],currentStep:'WEB_RUNTIME',blocker:'same-failure',evidence:['failure-cause:same-failure']},
      {id:'g2',gameId:'g2',status:'failed',target:'web',sourceRoot:'web-games/g2',responsibleFiles:['web-games/g2/index.html'],currentStep:'WEB_RUNTIME',blocker:'same-failure',evidence:['failure-cause:same-failure']},
      {id:'g3',gameId:'g3',status:'failed',target:'web',sourceRoot:'web-games/g3',responsibleFiles:['web-games/g3/index.html'],currentStep:'WEB_RUNTIME',blocker:'same-failure',evidence:['failure-cause:same-failure']}
    ]}
  });
  assert.equal(result.added.length,1);
  const row=result.queue.tasks[0];
  assert.equal(row.blastRadius,'portfolio:3');
  assert.equal(row.recoveryOwner,'SYSTEM_AI');
  assert.ok(row.evidence.includes('primary-ai-collaboration:REQUESTED'));
  assert.ok(row.evidence.some(x=>x.startsWith('primary-ai-collaboration-reason:')));
  assert.match(row.recoveryStrategy,/ASSIGN_SCOPED_IMPLEMENTATION_REPAIR/);
  assert.deepEqual(row.responsibleFiles,['web-games/g1/index.html']);
});

test('generic System-AI failure signature does not group unrelated responsible files',()=>{
  const result=escalateRecoveryCandidates({
    systemAiQueueInput:{tasks:[
      {id:'a',status:'failed',retries:2,blocker:'system-ai-implementation-failed',responsibleFiles:['web-games/a/index.html']},
      {id:'b',status:'failed',retries:2,blocker:'system-ai-implementation-failed',responsibleFiles:['company-learning/marketing/b/latest.json']}
    ]}
  });
  assert.equal(result.added.length,2);
  assert.equal(result.queue.tasks.length,2);
  assert.deepEqual(new Set(result.queue.tasks.map(x=>x.sourceTaskId)),new Set(['a','b']));
  assert.ok(result.queue.tasks.every(x=>x.blastRadius==='single-task'));
});

test('repeated System-AI infrastructure failure creates one repair canary and gates the cohort',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const systemAiQueueInput={tasks:[
    {id:'sys-a',status:'failed',retries:2,blocker:'system-ai-infrastructure-contract-failed',responsibleFiles:['qa/a.test.mjs'],contextFiles:['game-catalog.json'],dependencies:[]},
    {id:'sys-b',status:'failed',retries:2,blocker:'system-ai-infrastructure-contract-failed',responsibleFiles:['qa/b.test.mjs'],contextFiles:['game-catalog.json'],dependencies:[]}
  ]};
  const escalated=escalateRecoveryCandidates({systemAiQueueInput});
  assert.equal(escalated.added.length,1);
  const rec=escalated.queue.tasks[0];
  assert.equal(rec.blastRadius,'shared-worker-contract:2');
  assert.deepEqual(rec.responsibleFiles,[
    'tools/company-system-ai-worker.mjs',
    '.github/workflows/company-system-ai-workers.yml',
    'qa/company-system-ai-worker.test.mjs',
    'qa/company-system-ai-supervision-loop.test.mjs'
  ]);
  const dispatched=dispatchRecovery({recoveryInput:escalated.queue,systemAiQueueInput});
  const repairTask=dispatched.systemAi.tasks.find(x=>x.id==='recovery-'+rec.id);
  assert.ok(repairTask);
  assert.equal(repairTask.status,'queued');
  assert.equal(repairTask.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.ok(repairTask.evidence.includes('primary-ai-collaboration:REQUESTED'));
  for(const id of ['sys-a','sys-b']){
    const task=dispatched.systemAi.tasks.find(x=>x.id===id);
    assert.equal(task.status,'queued');
    assert.ok(task.dependencies.includes(repairTask.id));
    assert.match(task.blocker,/shared-signature-canary-pending/);
  }
});

test('recovery dispatch reuses exact existing System-AI repair but preserves a distinct checkpoint',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const systemAiQueueInput={tasks:[
    {id:'sys-a',status:'failed',retries:2,blocker:'system-ai-infrastructure-contract-failed',responsibleFiles:['qa/a.test.mjs'],contextFiles:['game-catalog.json'],dependencies:[]},
    {id:'sys-b',status:'failed',retries:2,blocker:'system-ai-infrastructure-contract-failed',responsibleFiles:['qa/b.test.mjs'],contextFiles:['game-catalog.json'],dependencies:[]}
  ]};
  const escalated=escalateRecoveryCandidates({systemAiQueueInput});
  const firstRec=escalated.queue.tasks[0];
  const first=dispatchRecovery({recoveryInput:escalated.queue,systemAiQueueInput});
  const canonical=first.systemAi.tasks.find(x=>x.taskType==='bottleneck-repair');
  assert.ok(canonical);

  const secondRec={...firstRec,id:firstRec.id+'-second',status:'queued',createdAt:'2026-09-23T00:01:00Z',updatedAt:'2026-09-23T00:01:00Z'};
  const second=dispatchRecovery({recoveryInput:{tasks:[secondRec]},systemAiQueueInput:first.systemAi});
  const repairs=second.systemAi.tasks.filter(x=>x.taskType==='bottleneck-repair'&&x.status!=='cancelled');
  assert.equal(repairs.length,1);
  assert.equal(repairs[0].id,canonical.id);
  assert.ok(repairs[0].evidence.includes('system-ai-producer-dedupe:REUSED_EXISTING_REPAIR'));
  assert.ok(repairs[0].evidence.includes('recovery-queue:'+secondRec.id));
  for(const id of ['sys-a','sys-b']){
    const task=second.systemAi.tasks.find(x=>x.id===id);
    assert.ok(task.dependencies.includes(canonical.id));
    assert.equal(task.blocker,'shared-signature-canary-pending:'+canonical.id);
    assert.equal(task.dependencies.includes('recovery-'+secondRec.id),false);
  }
  assert.equal(second.recovery.tasks[0].status,'dispatched');

  const checkpointRec={...secondRec,id:firstRec.id+'-checkpoint',sourceMutationBaseline:'different-baseline',checkpoint:'different-baseline'};
  const checkpoint=dispatchRecovery({recoveryInput:{tasks:[checkpointRec]},systemAiQueueInput:second.systemAi});
  const checkpointRepairs=checkpoint.systemAi.tasks.filter(x=>x.taskType==='bottleneck-repair'&&x.status!=='cancelled');
  assert.equal(checkpointRepairs.length,2);
  assert.ok(checkpointRepairs.some(x=>x.id==='recovery-'+checkpointRec.id));
});

test('shared canary wait state never recursively creates another recovery',()=>{
  const result=escalateRecoveryCandidates({
    systemAiQueueInput:{tasks:[
      {id:'blocked-a',status:'queued',retries:4,blocker:'shared-signature-canary-pending:recovery-root',responsibleFiles:['tools/a.mjs']},
      {id:'blocked-b',status:'queued',retries:7,blocker:'shared-signature-canary-pending:recovery-root',responsibleFiles:['tools/b.mjs']},
      {id:'superseded',status:'queued',retries:9,blocker:'system-ai-duplicate-repair-superseded',lastOutcome:'SUPERSEDED_DUPLICATE_WORK',responsibleFiles:['tools/c.mjs']}
    ]}
  });
  assert.equal(result.added.length,0);
  assert.equal(result.reactivated.length,0);
  assert.equal(result.queue.tasks.length,0);
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

test('game-source recovery without explicit scoped files stays with Vibe',()=>{
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[
      {id:'legacy-game',gameId:'legacy-game',status:'failed',target:'web',sourceRoot:'web-games/legacy-game',currentStep:'WEB_RUNTIME',blocker:'legacy-failure',evidence:['failure-cause:legacy-failure']}
    ]}
  });
  assert.equal(result.queue.tasks[0].recoveryOwner,'VIBE2_VIBE3');
});

test('scoped Vibe game bottleneck dispatch creates supervised System-AI repair task',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const recovery=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[
      {id:'game-task',gameId:'demo',status:'failed',target:'web',sourceRoot:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],contextFiles:['game-catalog.json'],goal:'repair demo exact failure',currentStep:'WEB_RUNTIME',blocker:'runtime-failure',evidence:['failure-cause:runtime-failure']}
    ]}
  }).queue;
  const dispatched=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]}});
  assert.equal(dispatched.dispatched.length,1);
  const task=dispatched.systemAi.tasks.find(x=>x.id.startsWith('recovery-'));
  assert.ok(task);
  assert.equal(task.gameId,'demo');
  assert.deepEqual(task.responsibleFiles,['web-games/demo/index.html']);
  assert.equal(task.status,'queued');
  assert.equal(task.supervisorReviewRequired,true);
  assert.equal(task.workerSelfAcceptance,false);
});

test('recovery queue uses unlimited causal repair and never terminal-fails from retry count',()=>{
  let q=enqueueRecovery({tasks:[]},{
    sourceQueue:'vibe2',sourceTaskId:'unlimited',failureStage:'TARGET_PLATFORM_RUNTIME',
    failureSignature:'runtime-repeat',recoveryStrategy:'REPAIR_AND_RERUN_EXACT_STAGE',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE'],maxRetries:0
  }).queue;
  const id=q.tasks[0].id;
  for(let i=0;i<12;i++)q=settleRecovery(q,{id,outcome:'FAIL',evidence:['attempt:'+i]});
  const row=q.tasks[0];
  assert.equal(row.status,'queued');
  assert.equal(row.retries,12);
  assert.equal(row.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(row.maxRetries,null);
});

test('scoped recovery-created System-AI task inherits unlimited causal repair',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const recovery={tasks:[{
    id:'r-unlimited',status:'queued',sourceQueue:'vibe2',sourceTaskId:'missing-source-task',
    gameId:'demo',responsibleFiles:['web-games/demo/index.html'],contextFiles:[],
    failureStage:'WEB_RUNTIME',failureSignature:'runtime-repeat',recoveryOwner:'SYSTEM_AI',
    recoveryStrategy:'ASSIGN_SCOPED_IMPLEMENTATION_REPAIR_TO_SUPERVISED_SYSTEM_AI_CANDIDATE_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE'],evidence:[]
  }]};
  const result=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]}});
  const task=result.systemAi.tasks.find(x=>x.id==='recovery-r-unlimited');
  assert.ok(task);
  assert.equal(task.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(task.maxRetries,null);
});

test('System-AI normalization preserves unlimited causal repair only when explicitly requested',()=>{
  const q=normalizeSystemAiQueue({tasks:[
    {id:'recovery-task',status:'queued',retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null},
    {id:'ordinary-task',status:'queued',maxRetries:2}
  ]});
  const recovery=q.tasks.find(x=>x.id==='recovery-task');
  const ordinary=q.tasks.find(x=>x.id==='ordinary-task');
  assert.equal(recovery.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(recovery.maxRetries,null);
  assert.equal(ordinary.retryPolicy,'BOUNDED_RETRY');
  assert.equal(ordinary.maxRetries,2);
});

test('System-AI recovery failure requeues beyond ordinary retry limits',()=>{
  let q=normalizeSystemAiQueue({tasks:[{
    id:'recovery-task',status:'running',retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,retries:20
  }]});
  q=applySystemAiResults(q,[{taskId:'recovery-task',outcome:'FAIL',blocker:'same-cause',evidence:['exact-stage:FAIL']}]);
  const row=q.tasks[0];
  assert.equal(row.status,'queued');
  assert.equal(row.retries,21);
  assert.equal(row.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(row.maxRetries,null);
  assert.ok(row.evidence.includes('system-ai-retry:UNLIMITED_CAUSAL_REPAIR'));
});

test('repeated-failure recovery requires responsible source mutation before System-AI revalidation',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const recovery=escalateRecoveryCandidates({
    gameQueueInput:{tasks:[{
      id:'mutate-first',gameId:'demo',status:'failed',target:'web',sourceRoot:'web-games/demo',
      responsibleFiles:['web-games/demo/index.html'],sourceRevision:'baseline-sha',
      currentStep:'WEB_RUNTIME',blocker:'same-signature',evidence:['failure-cause:same-signature']
    }]}
  }).queue;
  const rec=recovery.tasks[0];
  assert.equal(rec.sourceMutationRequired,true);
  assert.equal(rec.sourceMutationBaseline,'baseline-sha');
  const dispatched=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]}});
  const task=dispatched.systemAi.tasks.find(x=>x.id.startsWith('recovery-'));
  assert.ok(task);
  assert.equal(task.sourceMutationRequired,true);
  assert.equal(task.sourceMutationBaseline,'baseline-sha');
  assert.ok(task.acceptanceCriteria.includes('unchanged-source revalidation is forbidden'));
});

test('System-AI mutation-required task rejects PASS without changed-file and source-mutation SHA evidence',()=>{
  let q=normalizeSystemAiQueue({tasks:[{
    id:'mutation-gate',status:'running',sourceMutationRequired:true,sourceMutationBaseline:'base',
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',retries:4
  }]});
  q=applySystemAiResults(q,[{taskId:'mutation-gate',outcome:'PASS',evidence:['verification:success']}]);
  const row=q.tasks[0];
  assert.equal(row.status,'queued');
  assert.equal(row.lastOutcome,'FAIL');
  assert.equal(row.blocker,'source-mutation-required-before-revalidation');
  assert.ok(row.evidence.includes('source-mutation-gate:BLOCKED_UNCHANGED_SOURCE_REVALIDATION'));
});

test('System-AI mutation-required task accepts verified candidate only with mutation evidence',()=>{
  let q=normalizeSystemAiQueue({tasks:[{
    id:'mutation-pass',status:'running',sourceMutationRequired:true,sourceMutationBaseline:'base',
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',retries:1
  }]});
  q=applySystemAiResults(q,[{
    taskId:'mutation-pass',outcome:'PASS',candidateBranch:'system-ai/candidate/x',pullRequestUrl:'https://example.invalid/pr/1',
    evidence:['changed-file:web-games/demo/index.html','source-mutation-sha:new-sha']
  }]);
  assert.equal(q.tasks[0].status,'awaiting-supervisor');
  assert.equal(q.tasks[0].lastOutcome,'PASS');
});

test('System-AI workflow disables unchanged-main shortcuts for mutation-required recovery',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(workflow,/SOURCE_MUTATION_REQUIRED/);
  assert.match(workflow,/SYSTEM_AI_SOURCE_MUTATION_REQUIRED_BEFORE_REVALIDATION/);
  assert.match(workflow,/source-mutation-sha:/);
  assert.match(workflow,/env\.SOURCE_MUTATION_REQUIRED != 'true'/);
});

