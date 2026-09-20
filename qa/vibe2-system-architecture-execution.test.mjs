import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSystemArchitectureTask, isAllowedSystemArchitecturePath } from '../tools/vibe2-system-architecture-contract.mjs';
import { buildVibeContinuousWorkOrder } from '../tools/vibe2-continuous-runner.mjs';
import { loadCentralPolicySnapshot } from '../tools/vibe2-central-work-contract.mjs';

function task(){
  return{
    id:'SYS-ARCH-demo-v1',gameId:'__vibe_system__',target:'system',department:'system-architecture',type:'implementation',
    executionLane:'RECOVERY_FAST',sourceRoot:'.',responsibleFiles:['tools/vibe2-source-worker.mjs','qa/vibe2-source-worker.test.mjs'],
    priority:'high',releaseState:'other',status:'queued',retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,systemSteward:true,
    goal:'repair repeated structural bottleneck',evidence:['vibe-self-architecture-evolution','architecture-authority-expansion:NO','architecture-gate-weakening:NO','architecture-system-construction-allowed','architecture-neural-expansion-phase:LAST_STAGE_ONLY','architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION','architecture-neural-expansion-readiness:PENDING','architecture-neural-expansion-allowed:NO'],
    completionCriteria:['RELATED_REGRESSION_PASS','SECURITY_PASS','BEFORE_AFTER_METRIC_IMPROVED']
  };
}
test('system architecture contract restricts exact repo system paths',()=>{
  assert.equal(isAllowedSystemArchitecturePath('tools/vibe2-source-worker.mjs'),true);
  assert.equal(isAllowedSystemArchitecturePath('.github/workflows/vibe2-continuous-core.yml'),true);
  assert.equal(isAllowedSystemArchitecturePath('web-games/demo/index.html'),false);
  assert.equal(isAllowedSystemArchitecturePath('../secret'),false);
  const c=assertSystemArchitectureTask(task());
  assert.equal(c.valid,true);
  assert.equal(c.systemConstructionAllowed,true);
  assert.equal(c.neuralExpansionPhase,'LAST_STAGE_ONLY');
  assert.equal(c.neuralExpansionMode,'EVIDENCE_GATED_SELF_EXPANSION');
  assert.equal(c.neuralExpansionReadiness,'PENDING');
  assert.equal(c.neuralExpansionAllowed,false);
});
test('system architecture task bypasses game design pipeline but keeps central work contract',()=>{
  const t=task();
  const policy=loadCentralPolicySnapshot({repoRoot:process.cwd(),required:true});
  const order=buildVibeContinuousWorkOrder({
    runtime:{continuous:{enabled:true,maxWorkMinutes:20},safety:{paidAIAllowed:false,paidRunnerAllowed:false}},
    queue:{tasks:[t]},taskId:t.id,centralPolicySnapshot:policy
  });
  assert.equal(order.run,true);
  assert.equal(order.target,'system');
  assert.equal(order.executionRoute,'text-source-worker');
  assert.equal(order.designIntelligence.required,false);
  assert.equal(order.workerPolicy.systemArchitectureEvolution,true);
  assert.equal(order.workerPolicy.authorityExpansionAllowed,false);
  assert.equal(order.workerPolicy.neuralExpansionPhase,'LAST_STAGE_ONLY');
  assert.equal(order.workerPolicy.neuralExpansionMode,'EVIDENCE_GATED_SELF_EXPANSION');
  assert.equal(order.workerPolicy.neuralExpansionReadiness,'PENDING');
  assert.equal(order.workerPolicy.neuralExpansionAllowed,false);
  assert.equal(order.compiledWorkContract.invariants.authorityMustRemainUnchanged,true);
  assert.equal(order.compiledWorkContract.invariants.qualityEvidenceAndSecurityGatesMustRemainUnchanged,true);
  assert.deepEqual(order.source.responsibleFiles,t.responsibleFiles);
});


test('neural expansion readiness PASS reaches the system work order without expanding execution authority',()=>{
  const t={
    ...task(),
    id:'SYS-ARCH-neural-v1',
    responsibleFiles:[
      'tools/vibe2-neural-event-router.mjs',
      'tools/vibe2-fan-in-review.mjs',
      'qa/vibe2-neural-event-router.test.mjs',
      'qa/vibe2-neural-fanin-root-cause.test.mjs'
    ],
    evidence:[
      'vibe-self-architecture-evolution',
      'architecture-authority-expansion:NO',
      'architecture-gate-weakening:NO',
      'architecture-system-construction-allowed',
      'architecture-neural-expansion-phase:LAST_STAGE_ONLY',
      'architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION',
      'architecture-neural-expansion-readiness:PASS',
      'architecture-neural-expansion-allowed:YES'
    ]
  };
  const policy=loadCentralPolicySnapshot({repoRoot:process.cwd(),required:true});
  const order=buildVibeContinuousWorkOrder({
    runtime:{continuous:{enabled:true,maxWorkMinutes:20},safety:{paidAIAllowed:false,paidRunnerAllowed:false}},
    queue:{tasks:[t]},taskId:t.id,centralPolicySnapshot:policy
  });
  assert.equal(order.run,true);
  assert.equal(order.workerPolicy.neuralExpansionReadiness,'PASS');
  assert.equal(order.workerPolicy.neuralExpansionAllowed,true);
  assert.equal(order.workerPolicy.neuralExecutionAuthorityExpansionAllowed,false);
  assert.equal(order.workerPolicy.authorityExpansionAllowed,false);
  assert.equal(order.workerPolicy.gateWeakeningAllowed,false);
});
