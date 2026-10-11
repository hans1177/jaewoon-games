// 파일명: qa/company-recovery-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enqueueRecovery, reviewRecovery, settleRecovery } from '../tools/company-recovery-queue.mjs';
import { applySystemAiResults, normalizeSystemAiQueue } from '../tools/company-system-ai-queue.mjs';
import { escalateRecoveryCandidates } from '../tools/company-recovery-escalation.mjs';
import { promoteVerifiedRecoveryLearning } from '../tools/company-recovery-learning.mjs';
import { distillRecoveryCodePatterns } from '../tools/company-recovery-code-distillation.mjs';

test('recovery wake counts unique newly dispatched queued games and preserves active reservations',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const active={id:'active',status:'running',reservationId:'run:1',reservationRunId:'run',reservedAt:'2026-09-30T00:00:00Z',retries:2};
  const gameQueueInput={tasks:[
    {id:'old',status:'queued',evidence:['recovery-queue:historical']},
    {id:'repair',status:'failed',blocker:'runtime-failure'},
    {id:'queued-repair',status:'queued'},active,{id:'done',status:'done'},{id:'cancelled',status:'cancelled'}
  ]};
  const recoveryInput={tasks:[
    {id:'r1',status:'queued',recoveryOwner:'VIBE2_VIBE3',sourceTaskId:'repair',relatedTaskIds:['queued-repair','active','done','cancelled']},
    {id:'r2',status:'queued',recoveryOwner:'VIBE2_VIBE3',sourceTaskId:'repair'},
    {id:'old-r',status:'dispatched',recoveryOwner:'VIBE2_VIBE3',sourceTaskId:'old'}
  ]};
  const first=dispatchRecovery({gameQueueInput,recoveryInput});
  assert.deepEqual(first.gameRequeuedTaskIds,['repair','queued-repair']);
  const running=first.gameQueue.tasks.find(x=>x.id==='active');
  for(const key of ['status','reservationId','reservationRunId','reservedAt','retries'])assert.equal(running[key],active[key]);
  const second=dispatchRecovery({gameQueueInput:first.gameQueue,recoveryInput:first.recovery});
  assert.deepEqual(second.gameRequeuedTaskIds,[]);
  assert.equal(second.dispatched.length,0);
  assert.deepEqual(second.gameQueue,first.gameQueue);
  const systemOnly=dispatchRecovery({gameQueueInput,recoveryInput,route:'system-ai'});
  assert.deepEqual(systemOnly.gameRequeuedTaskIds,[]);
});

test('generic cross-game failures retain separate game-source checkpoint recovery',()=>{
  const gameQueueInput={tasks:['g1','g2','g3'].map(id=>({
    id,gameId:id,status:'failed',target:'web',sourceRoot:'web-games/'+id,
    responsibleFiles:['web-games/'+id+'/index.html'],currentStep:'WEB_RUNTIME',
    sourceRevision:'checkpoint-'+id,blocker:'same-failure',evidence:['failure-cause:same-failure']
  }))};
  const result=escalateRecoveryCandidates({gameQueueInput});
  assert.equal(result.added.length,3);
  assert.equal(result.queue.tasks.length,3);
  for(const rec of result.queue.tasks){
    assert.equal(rec.blastRadius,'single-task');
    assert.equal(rec.recoveryOwner,'VIBE2_VIBE3');
    assert.deepEqual(rec.responsibleFiles,['web-games/'+rec.sourceTaskId+'/index.html']);
    assert.equal(rec.checkpoint,'checkpoint-'+rec.sourceTaskId);
    assert.ok(rec.evidence.includes('primary-ai-collaboration:REQUESTED'));
  }
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

test('legacy broad recovery keeps its first checkpoint while unrelated games get scoped recovery',()=>{
  const existing=enqueueRecovery({tasks:[]},{
    sourceQueue:'vibe2',sourceTaskId:'g1',failureStage:'SOURCE_CANDIDATE_GENERATION',
    failureSignature:'source-candidate-generation-failed',blastRadius:'portfolio:3',
    relatedTaskIds:['g1','g2','g3'],
    recoveryStrategy:'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE']
  }).queue;
  const result=escalateRecoveryCandidates({
    gameQueueInput:{tasks:['g1','g2','g3'].map(id=>({
      id,gameId:id,status:'queued',target:'web',sourceRoot:'web-games/'+id,
      responsibleFiles:['web-games/'+id+'/index.html'],recoveryGeneration:1,
      evidence:['system-steward:failure-signature:source-candidate-generation-failed',
        'recovery-exact-stage:SOURCE_CANDIDATE_GENERATION']
    }))},
    recoveryInput:existing
  });
  assert.equal(result.added.length,2);
  assert.equal(result.queue.tasks.length,3);
  assert.equal(result.queue.tasks.find(t=>t.sourceTaskId==='g1').id,existing.tasks[0].id);
  for(const row of result.queue.tasks){
    assert.equal(row.failureSignature,'source-candidate-generation-failed');
    assert.equal(row.failureStage,'SOURCE_CANDIDATE_GENERATION');
    if(row.sourceTaskId!=='g1')assert.equal(row.blastRadius,'single-task');
  }
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

test('scoped game-source recovery requeues the original Vibe task, never System AI source writing',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const original={id:'game-task',gameId:'demo',status:'failed',target:'web',
    sourceRoot:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],
    contextFiles:['game-catalog.json'],goal:'repair exact failure',currentStep:'WEB_RUNTIME',
    blocker:'runtime-failure',evidence:['failure-cause:runtime-failure']};
  const recovery=escalateRecoveryCandidates({gameQueueInput:{tasks:[original]}}).queue;
  const dispatched=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[original]},systemAiQueueInput:{tasks:[]}});
  assert.equal(dispatched.dispatched.length,1);
  assert.equal(dispatched.recovery.tasks[0].recoveryOwner,'VIBE2_VIBE3');
  assert.equal(dispatched.systemAi.tasks.length,0);
  const task=dispatched.gameQueue.tasks[0];
  assert.equal(task.status,'queued');
  assert.equal(task.sourceMutationRequired,true);
  assert.equal(task.gameRepairContract.prePatchReproductionRequired,true);
  assert.ok(task.evidence.some(value=>value.startsWith('recovery-queue:')));
});
test('legacy System AI game recovery migrates to Vibe root-cause mode without changing save or multiplayer rules',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const recovery={tasks:[{
    id:'r-game-root',status:'queued',sourceQueue:'vibe2',sourceTaskId:'game-task',
    gameId:'demo',responsibleFiles:['web-games/demo/index.html'],contextFiles:[],
    failureStage:'WEB_RUNTIME',failureSignature:'network-sync-repeat',recoveryOwner:'SYSTEM_AI',
    recoveryStrategy:'ASSIGN_SCOPED_IMPLEMENTATION_REPAIR_TO_SUPERVISED_SYSTEM_AI_CANDIDATE_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE'],recurrenceCount:3,
    evidence:['failure-cause:network-sync-repeat','multiplayer-sync','save-load']
  }]};
  const original={id:'game-task',gameId:'demo',status:'failed',responsibleFiles:['web-games/demo/index.html'],sourceRevision:'game-checkpoint'};
  const systemPass=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[original]},route:'system-ai'});
  assert.equal(systemPass.dispatched.length,0);
  const dispatched=dispatchRecovery({recoveryInput:systemPass.recovery,gameQueueInput:{tasks:[original]},route:'vibe'});
  assert.equal(dispatched.systemAi.tasks.length,0);
  assert.equal(dispatched.recovery.tasks[0].recoveryOwner,'VIBE2_VIBE3');
  const task=dispatched.gameQueue.tasks[0];
  assert.equal(task.repairMode,'ROOT_CAUSE_MODE');
  assert.equal(task.gameRepairContract.multiplayerLifecycleValidationRequired,true);
  assert.equal(task.gameRepairContract.multiplayerUserAssistanceRequired,false);
  assert.equal(task.gameRepairContract.multiplayerMinimumAutomatedClients,2);
  assert.equal(task.gameRepairContract.saveMigrationValidationRequired,true);
  assert.equal(task.sourceMutationBaseline,'game-checkpoint');
  assert.ok(task.evidence.includes('recovery-owner-routing:VIBE_GAME_SOURCE'));
});
test('Vibe-owned recovery task receives the same causal game repair contract',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const recovery={tasks:[{
    id:'r-vibe-game',status:'queued',sourceQueue:'vibe2',sourceTaskId:'game-task',
    gameId:'demo',failureStage:'WEB_RUNTIME',failureSignature:'multiplayer-repeat',recoveryOwner:'VIBE2_VIBE3',
    recoveryStrategy:'RESUME_EXACT_FAILED_GAME_STAGE_WITH_VIBE2_VIBE3_AND_PRESERVE_VERIFIED_CHECKPOINT',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE'],recurrenceCount:3,
    evidence:['failure-cause:multiplayer-repeat','multiplayer-sync']
  }]};
  const gameQueueInput={tasks:[{id:'game-task',gameId:'demo',status:'failed',responsibleFiles:['web-games/demo/index.html'],evidence:[]}]};
  const dispatched=dispatchRecovery({recoveryInput:recovery,gameQueueInput,systemAiQueueInput:{tasks:[]}});
  const task=dispatched.gameQueue.tasks.find(x=>x.id==='game-task');
  assert.equal(task.repairMode,'ROOT_CAUSE_MODE');
  assert.equal(task.userAssistanceRequired,false);
  assert.equal(task.gameRepairContract.multiplayerLifecycleValidationRequired,true);
  assert.equal(task.gameRepairContract.multiplayerUserAssistanceRequired,false);
  assert.equal(task.gameRepairContract.multiplayerMinimumAutomatedClients,2);
  assert.ok(task.evidence.includes('game-repair-user-assistance-required:NO'));
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

test('legacy scoped recovery never creates unexecutable game-source System AI tasks',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const recovery={tasks:[{
    id:'r-unlimited',status:'queued',sourceQueue:'vibe2',sourceTaskId:'missing-source-task',
    gameId:'demo',responsibleFiles:['web-games/demo/index.html'],contextFiles:[],
    failureStage:'WEB_RUNTIME',failureSignature:'runtime-repeat',recoveryOwner:'SYSTEM_AI',
    recoveryStrategy:'ASSIGN_SCOPED_IMPLEMENTATION_REPAIR_TO_SUPERVISED_SYSTEM_AI_CANDIDATE_AND_RERUN_EXACT_FAILED_CHECK',
    verificationPlan:['RERUN_EXACT_FAILED_STAGE'],evidence:[]
  }]};
  const missing=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]}});
  assert.equal(missing.dispatched.length,0);
  assert.equal(missing.systemAi.tasks.length,0);
  assert.equal(missing.recovery.tasks[0].status,'queued');
  const original={id:'missing-source-task',gameId:'demo',status:'failed',
    sourceRevision:'exact-old-revision',responsibleFiles:['web-games/demo/index.html']};
  const resumed=dispatchRecovery({recoveryInput:missing.recovery,gameQueueInput:{tasks:[original]}});
  assert.equal(resumed.dispatched.length,1);
  assert.equal(resumed.recovery.tasks[0].recoveryOwner,'VIBE2_VIBE3');
  assert.equal(resumed.gameQueue.tasks[0].status,'queued');
  assert.equal(resumed.gameQueue.tasks[0].sourceMutationBaseline,'exact-old-revision');
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

test('repeated game-source recovery preserves source mutation baseline before native revalidation',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const original={id:'mutate-first',gameId:'demo',status:'failed',target:'web',
    sourceRoot:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],
    sourceRevision:'baseline-sha',currentStep:'WEB_RUNTIME',blocker:'same-signature',
    evidence:['failure-cause:same-signature']};
  const recovery=escalateRecoveryCandidates({gameQueueInput:{tasks:[original]}}).queue;
  const rec=recovery.tasks[0];
  assert.equal(rec.sourceMutationRequired,true);
  assert.equal(rec.sourceMutationBaseline,'baseline-sha');
  const dispatched=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[original]},systemAiQueueInput:{tasks:[]}});
  assert.equal(dispatched.systemAi.tasks.length,0);
  const task=dispatched.gameQueue.tasks[0];
  assert.equal(task.sourceMutationRequired,true);
  assert.equal(task.sourceMutationBaseline,'baseline-sha');
  assert.equal(task.gameRepairContract.impactRegressionRequired,true);
  assert.ok(task.evidence.includes('source-mutation-required:YES'));
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

test('verified external-learning application failure is automatically routed to exact Vibe game-source repair',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const task={id:'native-alpha',gameId:'alpha',status:'queued',target:'roblox',
    sourceRoot:'roblox-games/alpha',responsibleFiles:['roblox-games/alpha/client/Main.client.luau'],
    currentStep:'F0_SOURCE_PREFLIGHT',failureSignature:'VERIFIED_EXTERNAL_LEARNING_PARTIAL_APPLICATION',
    evidence:['failure-stage:F0_SOURCE_PREFLIGHT']};
  const escalated=escalateRecoveryCandidates({gameQueueInput:{tasks:[task]}});
  assert.equal(escalated.added.length,1);
  const recovery=escalated.queue.tasks[0];
  assert.equal(recovery.recoveryOwner,'VIBE2_VIBE3');
  assert.equal(recovery.failureSignature,'VERIFIED_EXTERNAL_LEARNING_PARTIAL_APPLICATION');
  assert.deepEqual(recovery.responsibleFiles,task.responsibleFiles);
  assert.ok(recovery.evidence.includes('system-ai-external-application-bottleneck:DETECTED'));
  const dispatched=dispatchRecovery({recoveryInput:escalated.queue,gameQueueInput:{tasks:[task]}});
  const repaired=dispatched.gameQueue.tasks[0];
  assert.equal(repaired.status,'queued');
  assert.equal(repaired.gameRepairContract.fullRegressionFanInRequired,true);
  assert.equal(dispatched.systemAi.tasks.length,0);
  assert.ok(repaired.evidence.some(x=>x.startsWith('recovery-queue:')));
  assert.ok(repaired.evidence.includes('system-ai-external-application-bottleneck:DETECTED'));
});

test('external learning failures stay game-local and system-code repair uses the supervised System AI',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const make=(id)=>({id,gameId:id,status:'failed',target:'roblox',sourceRoot:'roblox-games/'+id,
    responsibleFiles:['roblox-games/'+id+'/client/Main.client.luau'],blocker:'VERIFIED_EXTERNAL_LEARNING_MISSING'});
  const game=escalateRecoveryCandidates({gameQueueInput:{tasks:[make('alpha'),make('beta')]}});
  assert.equal(game.queue.tasks.length,2);
  assert.ok(game.queue.tasks.every(x=>x.blastRadius==='single-task'&&x.recoveryOwner==='VIBE2_VIBE3'));
  const system=escalateRecoveryCandidates({systemAiQueueInput:{tasks:[{
    id:'system-binding',status:'failed',retries:2,taskType:'bottleneck-repair',
    responsibleFiles:['tools/company-development-roblox-bootstrap.mjs'],
    failureSignature:'VERIFIED_EXTERNAL_LEARNING_NATIVE_SOURCE_STALE',
    blocker:'system-ai-implementation-failed'
  }]}});
  assert.equal(system.queue.tasks.length,1);
  const rec=system.queue.tasks[0];
  assert.equal(rec.recoveryOwner,'SYSTEM_AI');
  const dispatched=dispatchRecovery({recoveryInput:system.queue,systemAiQueueInput:{tasks:[{
    id:'system-binding',status:'failed',retries:2,taskType:'bottleneck-repair',
    responsibleFiles:['tools/company-development-roblox-bootstrap.mjs'],
    failureSignature:'VERIFIED_EXTERNAL_LEARNING_NATIVE_SOURCE_STALE'
  }]}});
  assert.equal(dispatched.systemAi.tasks.length,1);
  assert.deepEqual(dispatched.systemAi.tasks[0].responsibleFiles,['tools/company-development-roblox-bootstrap.mjs']);
});

test('unverified optional matching and commercial expression security findings cannot silently enter automatic external-learning repairs',()=>{
  const result=escalateRecoveryCandidates({gameQueueInput:{tasks:[
    {id:'optional',status:'queued',target:'unity',responsibleFiles:['unity-games/demo/Assets/Main.cs'],
      evidence:['existing-game-interface-auto-match:v1']},
    {id:'security',status:'failed',target:'unity',responsibleFiles:['unity-games/demo/Assets/Main.cs'],
      failureSignature:'RAW_COMMERCIAL_EXPRESSION_COPY_DETECTED'}
  ]}});
  assert.equal(result.queue.tasks.length,0);
});

test('fan-in package-review learning error is recovered immediately from the exact pending task',async()=>{
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const task={id:'fanin-alpha',gameId:'alpha',status:'queued',lastOutcome:'FAN_IN_REVIEW_BLOCKED_REQUEUE',
    target:'roblox',sourceRoot:'roblox-games/alpha',
    responsibleFiles:['roblox-games/alpha/client/Main.client.luau'],
    evidence:['role-result:review:BLOCKED','package-review-missing:VISUAL_GATE|VERIFIED_EXTERNAL_LEARNING_PARTIAL_APPLICATION']};
  const result=escalateRecoveryCandidates({gameQueueInput:{tasks:[task]}});
  assert.equal(result.added.length,1);
  assert.equal(result.queue.tasks[0].failureStage,'FAN_IN_REVIEW');
  assert.equal(result.queue.tasks[0].failureSignature,'VERIFIED_EXTERNAL_LEARNING_PARTIAL_APPLICATION');
  assert.equal(result.queue.tasks[0].recoveryOwner,'VIBE2_VIBE3');
  const dispatched=dispatchRecovery({recoveryInput:result.queue,gameQueueInput:{tasks:[task]}});
  assert.equal(dispatched.gameQueue.tasks[0].status,'queued');
  assert.ok(dispatched.gameQueue.tasks[0].evidence.some(x=>x.startsWith('recovery-queue:')));
  const stale=escalateRecoveryCandidates({gameQueueInput:{tasks:[{...task,lastOutcome:'DIFFERENT_TASK'}]}});
  assert.equal(stale.queue.tasks.length,0);
});


test('canonical deployment failures are scoped to a real game source and preserve the existing Vibe worker',async()=>{
  const {escalateDeploymentFailure}=await import('../tools/company-recovery-escalation.mjs');
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const run={
    name:'Unity Web Development Floor',path:'.github/workflows/unity-web-first-stage-build.yml',
    conclusion:'failure',id:38121720395,run_attempt:1,head_sha:'a'.repeat(40),
    head_branch:'main',display_title:'Unity Web Floor fantasy-survival',
    head_repository:{full_name:'hans1177/jaewoon-games'}
  };
  const jobs={jobs:[{name:'build',conclusion:'failure',
    steps:[{name:'Mark Unity Web floor repair requirement',conclusion:'failure'}]}],
    failureMarkers:[
      'UNITY_WEB_REPAIR_FAILURE_STAGE=UNITY_WEB_CSHARP_COMPILE',
      'UNITY_WEB_REPAIR_FAILURE_SIGNATURE=UNITY_WEB_CSHARP_COMPILE_ERROR:Assets/Scripts/UnityWebFloorGame.cs:14:CS0246'
    ]};
  const catalog={games:[{id:'fantasy-survival',productionClass:'DEVELOPMENT_CONFIRMED'}]};
  const first=escalateDeploymentFailure({event:{workflow_run:run},jobsInput:jobs,catalogInput:catalog});
  assert.equal(first.added.length,1);
  assert.equal(first.owner,'VIBE2_VIBE3');
  assert.equal(first.gameId,'fantasy-survival');
  assert.deepEqual(first.queue.tasks[0].responsibleFiles,['unity-games/fantasy-survival/Assets/Scripts/UnityWebFloorGame.cs']);
  assert.equal(first.queue.tasks[0].maxRetries,null);
  assert.ok(first.queue.tasks[0].verificationPlan.includes('VERIFY_ACTUAL_DEPLOYMENT_RESULT'));
  const dispatched=dispatchRecovery({recoveryInput:first.queue,gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]}});
  assert.equal(dispatched.gameQueue.tasks.length,1);
  assert.equal(dispatched.systemAi.tasks.length,0);
  const task=dispatched.gameQueue.tasks[0];
  assert.equal(task.status,'queued');
  assert.equal(task.target,'unity');
  assert.equal(task.unityWebDevelopment,true);
  assert.equal(task.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(task.sourceMutationRequired,true);
  assert.equal(task.gameRepairContract.impactRegressionRequired,true);
  assert.ok(task.acceptanceCriteria.some(value=>value.includes('existing gameplay saves balance')));
  assert.equal(first.queue.tasks[0].failureStage,'UNITY_WEB_CSHARP_COMPILE');
  assert.equal(first.queue.tasks[0].failureSignature,'UNITY_WEB_CSHARP_COMPILE_ERROR:Assets/Scripts/UnityWebFloorGame.cs:14:CS0246');
  const duplicate=escalateDeploymentFailure({event:{workflow_run:run},jobsInput:jobs,catalogInput:catalog,recoveryInput:dispatched.recovery});
  assert.equal(duplicate.queue.tasks.length,1);
  assert.deepEqual(duplicate.added,[]);
  assert.deepEqual(duplicate.reactivated,[]);
  const attemptTwo=escalateDeploymentFailure({event:{workflow_run:{...run,run_attempt:2}},jobsInput:jobs,catalogInput:catalog,recoveryInput:dispatched.recovery});
  assert.equal(attemptTwo.reactivated.length,1);
  assert.equal(attemptTwo.queue.tasks[0].status,'queued');
  assert.equal(attemptTwo.queue.tasks[0].recurrenceCount,2);
});

test('canonical deployment failure diagnosis falls back to supervised system AI when source cannot be proven',async()=>{
  const {escalateDeploymentFailure}=await import('../tools/company-recovery-escalation.mjs');
  const {dispatchRecovery}=await import('../tools/company-recovery-dispatch.mjs');
  const run={
    name:'Company DEVELOPMENT_CONFIRMED Roblox Private Runtime Candidate Deployment',
    path:'.github/workflows/company-development-roblox-release-promotion.yml',
    id:38121720400,run_attempt:1,conclusion:'failure',head_sha:'b'.repeat(40),
    display_title:'Roblox publish · fantasy-survival · final',head_branch:'main',
    head_repository:{full_name:'hans1177/jaewoon-games'}
  };
  const jobs={jobs:[{name:'deploy',conclusion:'failure',
    steps:[{name:'Deploy exact F0 passed Roblox artifact',conclusion:'failure'}]}]};
  const triaged=escalateDeploymentFailure({
    event:{workflow_run:run},jobsInput:jobs,catalogInput:{games:[{id:'fantasy-survival',productionClass:'DEVELOPMENT_CONFIRMED'}]}
  });
  assert.equal(triaged.owner,'SYSTEM_AI');
  assert.equal(triaged.queue.tasks.length,1);
  const rec=triaged.queue.tasks[0];
  assert.deepEqual(rec.responsibleFiles,['.github/workflows/company-development-roblox-release-promotion.yml']);
  assert.ok(rec.evidence.includes('deployment-release-gates:PRESERVED'));
  const dispatched=dispatchRecovery({recoveryInput:triaged.queue,gameQueueInput:{tasks:[]},systemAiQueueInput:{tasks:[]}});
  assert.equal(dispatched.gameQueue.tasks.length,0);
  assert.equal(dispatched.systemAi.tasks.length,1);
  assert.equal(dispatched.systemAi.tasks[0].retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(dispatched.systemAi.tasks[0].supervisorReviewRequired,true);
  assert.equal(dispatched.recovery.tasks[0].status,'dispatched');
});

test('deployment failure signals reject success, spoofed workflows and unrelated repositories',async()=>{
  const {escalateDeploymentFailure}=await import('../tools/company-recovery-escalation.mjs');
  const original={
    name:'Unity Web Development Floor',path:'.github/workflows/unity-web-first-stage-build.yml',
    conclusion:'failure',id:100,head_sha:'c'.repeat(40),display_title:'Unity Web Floor fantasy-survival',
    head_repository:{full_name:'hans1177/jaewoon-games'}
  };
  for(const run of [
    {...original,conclusion:'success'},
    {...original,path:'.github/workflows/untrusted.yml'},
    {...original,head_repository:{full_name:'untrusted/repo'}},
    {...original,id:'$(injection)'},
    {...original,head_sha:'invalid'}
  ]){
    const result=escalateDeploymentFailure({event:{workflow_run:run}});
    assert.equal(result.queue.tasks.length,0);
    assert.equal(result.ignored,'NOT_VERIFIED_CANONICAL_DEPLOYMENT_FAILURE');
  }
  const unknown=escalateDeploymentFailure({event:{workflow_run:{
    ...original,name:'Vibe2 Candidate Release Gate',path:'.github/workflows/vibe2-candidate-release.yml',
    display_title:'Ambiguous unrelated publication'
  }},jobsInput:{jobs:[{name:'publish',conclusion:'failure',steps:[{name:'Cloudflare Pages deploy',conclusion:'failure'}]}]}});
  assert.equal(unknown.owner,'SYSTEM_AI');
  assert.equal(unknown.queue.tasks[0].gameId,null);
  assert.equal(unknown.queue.tasks[0].responsibleFiles[0],'.github/workflows/vibe2-candidate-release.yml');
});


test('ambiguous Unity Web build failures cannot mutate game source without exact failure evidence',async()=>{
  const {escalateDeploymentFailure}=await import('../tools/company-recovery-escalation.mjs');
  const run={
    name:'Unity Web Development Floor',path:'.github/workflows/unity-web-first-stage-build.yml',
    conclusion:'failure',id:38121720423,head_sha:'d'.repeat(40),
    display_title:'Unity Web Floor fantasy-survival',head_repository:{full_name:'hans1177/jaewoon-games'}
  };
  const jobs={jobs:[{name:'build',conclusion:'failure',
    steps:[{name:'Mark Unity Web floor repair requirement',conclusion:'failure'}]}]};
  const catalogInput={games:[{id:'fantasy-survival',productionClass:'DEVELOPMENT_CONFIRMED'}]};
  const missingMarkers=escalateDeploymentFailure({event:{workflow_run:run},jobsInput:jobs,catalogInput});
  assert.equal(missingMarkers.owner,'SYSTEM_AI');
  assert.deepEqual(missingMarkers.queue.tasks[0].responsibleFiles,['.github/workflows/unity-web-first-stage-build.yml']);
  const publishMarker=escalateDeploymentFailure({event:{workflow_run:run},
    jobsInput:{...jobs,failureMarkers:['UNITY_WEB_REPAIR_FAILURE_STAGE=UNITY_WEB_BUILD_OR_READINESS']},catalogInput});
  assert.equal(publishMarker.owner,'SYSTEM_AI');
  const malformed=escalateDeploymentFailure({event:{workflow_run:run},
    jobsInput:{...jobs,failureMarkers:['UNITY_WEB_REPAIR_FAILURE_STAGE=$(curl evil)']},catalogInput});
  assert.equal(malformed.owner,'SYSTEM_AI');
});

test('fast recovery reuses canonical policies and listens to all three deployment surfaces',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-recovery-fast.yml',import.meta.url),'utf8');
  for(const name of ['Vibe2 Candidate Release Gate','Unity Web Development Floor',
    'Company DEVELOPMENT_CONFIRMED Roblox Private Runtime Candidate Deployment','Magic Forest Static Play']){
    assert.ok(workflow.includes('      - '+name));
  }
  assert.match(workflow,/node tools\/company-shared-context\.mjs/);
  assert.match(workflow,/--deployment-event=\$GITHUB_EVENT_PATH/);
  assert.match(workflow,/node tools\/company-recovery-dispatch\.mjs --route=all/);
  assert.match(workflow,/unity-web.*?failure|UNITY_WEB_REPAIR_FAILURE_/s);
});

test('real Unity missing component exception targets its existing editor source, not the deployment workflow',async()=>{
  const {escalateDeploymentFailure}=await import('../tools/company-recovery-escalation.mjs');
  const run={
    name:'Unity Web Development Floor',path:'.github/workflows/unity-web-first-stage-build.yml',
    conclusion:'failure',id:38121720395,run_attempt:1,head_sha:'a'.repeat(40),
    head_branch:'main',display_title:'Unity Web Floor fantasy-survival',
    head_repository:{full_name:'hans1177/jaewoon-games'}
  };
  const jobs={
    jobs:[{name:'build',conclusion:'failure',steps:[
      {name:'Build Unity Web',conclusion:'failure'},
      {name:'Mark Unity Web floor repair requirement',conclusion:'failure'}
    ]}],
    failureMarkers:['UNITY_WEB_REPAIR_FAILURE_STAGE=UNITY_WEB_BUILD_OR_READINESS',
      'UNITY_WEB_REPAIR_FAILURE_SIGNATURE=REPAIR_REQUIRED'],
    failureDiagnostics:{
      classification:'UNITY_MISSING_COMPONENT',
      sourceFiles:['unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs']
    }
  };
  const result=escalateDeploymentFailure({
    event:{workflow_run:run},jobsInput:jobs,
    catalogInput:{games:[{id:'fantasy-survival',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]}
  });
  assert.equal(result.owner,'VIBE2_VIBE3');
  assert.equal(result.added.length,1);
  assert.deepEqual(result.queue.tasks[0].responsibleFiles,
    ['unity-games/fantasy-survival/Assets/Editor/UnityWebFloorBuild.cs']);
  assert.ok(result.queue.tasks[0].failureSignature.includes('UNITY_MISSING_COMPONENT'));
  assert.ok(result.queue.tasks[0].evidence.includes('deployment-causal-error:UNITY_MISSING_COMPONENT'));
  const replay=escalateDeploymentFailure({
    event:{workflow_run:run},jobsInput:jobs,
    catalogInput:{games:[{id:'fantasy-survival',productionClass:'DEVELOPMENT_CONFIRMED'}]},
    recoveryInput:result.queue
  });
  assert.equal(replay.added.length,0);
  assert.equal(replay.queue.tasks.length,1);
});

test('Roblox F0 script failure scopes repair to existing game scripts, not unrelated deployments',async()=>{
  const {escalateDeploymentFailure}=await import('../tools/company-recovery-escalation.mjs');
  const run={
    name:'Company DEVELOPMENT_CONFIRMED Roblox F0 Source Preflight',
    path:'.github/workflows/company-development-roblox-headless-fast-mvp.yml',
    conclusion:'failure',id:38121720410,run_attempt:1,head_sha:'a'.repeat(40),
    display_title:'Roblox F0 · fantasy-survival',head_branch:'main',
    head_repository:{full_name:'hans1177/jaewoon-games'}
  };
  const jobs={jobs:[{name:'verify',conclusion:'failure',
    steps:[{name:'Validate F0 source contract',conclusion:'failure'}]}]};
  const result=escalateDeploymentFailure({
    event:{workflow_run:run},jobsInput:jobs,
    catalogInput:{games:[{id:'fantasy-survival',productionClass:'DEVELOPMENT_CONFIRMED'}]}
  });
  assert.equal(result.owner,'VIBE2_VIBE3');
  assert.deepEqual(result.queue.tasks[0].responsibleFiles,[
    'roblox-games/fantasy-survival/server/Game.server.luau',
    'roblox-games/fantasy-survival/client/Game.client.luau'
  ]);
  assert.equal(result.queue.tasks[0].maxRetries,null);
});
