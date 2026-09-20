import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchRecovery } from '../tools/company-recovery-dispatch.mjs';
import {
  applySystemAiResults,
  assignSecurityRecovery,
  PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION,
  PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS,
  PRIMARY_AI_SECURITY_RECOVERY_REVIEW_REWORK,
  reserveSecurityRecoveryTask,
  reviewSecurityRecovery
} from '../tools/company-system-ai-queue.mjs';
import { applySecurityRecoverySystemAiFanIn } from '../tools/company-recovery-queue.mjs';

function buildAssigned(){
  const systemAi={tasks:[{
    id:'unrelated-system-task',
    status:'queued',
    priority:'high',
    goal:'unrelated',
    responsibleFiles:['qa/unrelated.test.mjs'],
    verificationCommands:['node --test qa/unrelated.test.mjs'],
    evidence:['existing-unrelated-task'],
    supervisorReviewRequired:true
  }]};
  const recovery={tasks:[
    {
      id:'recovery-security-e2e',
      status:'blocked-primary-ai-assignment-required',
      priority:'critical',
      sourceQueue:'security',
      sourceTaskId:'security-run-e2e',
      recoveryOwner:'SYSTEM_AI',
      recoveryStrategy:'SECURITY_CONTAIN_REMEDIATE_RESCAN_PRIMARY_AI_REVIEW',
      failureStage:'SECURITY_IMMUNE_SCAN',
      failureSignature:'security-quarantine-HIGH',
      evidence:['security-repair-file:tools/security-e2e-target.mjs'],
      deterministicEvidence:[],
      primaryAiReview:'PENDING',
      learningPromotion:'PENDING',
      retries:0,
      maxRetries:5
    },
    {
      id:'recovery-unrelated',
      status:'verified',
      priority:'normal',
      sourceQueue:'system-ai',
      sourceTaskId:'unrelated-system-task',
      recoveryOwner:'SYSTEM_AI',
      evidence:['unrelated-recovery'],
      deterministicEvidence:[],
      primaryAiReview:'PASS',
      learningPromotion:'PENDING',
      retries:0,
      maxRetries:5
    }
  ]};
  return assignSecurityRecovery(systemAi,recovery,{
    recoveryId:'recovery-security-e2e',
    decision:PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION
  });
}

function runToReview(){
  const assigned=buildAssigned();
  const dispatched=dispatchRecovery({
    recoveryInput:assigned.recovery,
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:assigned.queue,
    route:'system-ai',
    sourceTaskId:'security-run-e2e'
  });
  const reserved=reserveSecurityRecoveryTask(dispatched.systemAi,{
    id:'security-run-e2e',
    reservationId:'security-e2e:test'
  });
  const resultRow={
    taskId:'security-run-e2e',
    outcome:'PASS',
    candidateBranch:'system-ai/candidate/security-run-e2e/test',
    pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9994',
    evidence:['actions-run:test','verification:success','publish:success','worker-self-acceptance:NO','primary-ai-review-required:YES']
  };
  const fanInSystem=applySystemAiResults(reserved.queue,[resultRow]);
  const fanInRecovery=applySecurityRecoverySystemAiFanIn(dispatched.recovery,fanInSystem,[resultRow]);
  return{systemAi:fanInSystem,recovery:fanInRecovery.queue};
}

test('security recovery full PASS lifecycle remains exact-target and Primary-AI supervised end to end',()=>{
  const {systemAi,recovery}=runToReview();
  const pendingTask=systemAi.tasks.find(x=>x.id==='security-run-e2e');
  const pendingRecovery=recovery.tasks.find(x=>x.id==='recovery-security-e2e');
  assert.equal(pendingTask.status,'awaiting-supervisor');
  assert.equal(pendingRecovery.status,'awaiting-primary-ai-review');
  assert.equal(pendingRecovery.primaryAiReview,'PENDING');
  assert.equal(pendingRecovery.learningPromotion,'PENDING');

  const reviewed=reviewSecurityRecovery(systemAi,recovery,{
    recoveryId:'recovery-security-e2e',
    decision:PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS,
    evidence:['primary-ai-review-anchor:test']
  });
  const doneTask=reviewed.queue.tasks.find(x=>x.id==='security-run-e2e');
  const doneRecovery=reviewed.recovery.tasks.find(x=>x.id==='recovery-security-e2e');
  const unrelatedTask=reviewed.queue.tasks.find(x=>x.id==='unrelated-system-task');
  const unrelatedRecovery=reviewed.recovery.tasks.find(x=>x.id==='recovery-unrelated');

  assert.equal(doneTask.status,'done');
  assert.equal(doneTask.lastOutcome,'PRIMARY_AI_ACCEPTED');
  assert.ok(doneTask.evidence.includes('primary-ai-review:PASS'));
  assert.ok(doneTask.evidence.includes('security-recovery:recovery-security-e2e'));
  assert.equal(doneRecovery.status,'verified');
  assert.equal(doneRecovery.primaryAiReview,'PASS');
  assert.equal(doneRecovery.learningPromotion,'PENDING');
  assert.ok(doneRecovery.evidence.includes('primary-ai-recovery-review:PASS'));
  assert.ok(doneRecovery.evidence.includes('primary-ai-review-anchor:test'));

  assert.equal(unrelatedTask.status,'queued');
  assert.deepEqual(unrelatedTask.responsibleFiles,['qa/unrelated.test.mjs']);
  assert.equal(unrelatedRecovery.status,'verified');
  assert.equal(unrelatedRecovery.primaryAiReview,'PASS');
});

test('security recovery REWORK lifecycle requeues only the exact linked pair without promotion',()=>{
  const {systemAi,recovery}=runToReview();
  const reviewed=reviewSecurityRecovery(systemAi,recovery,{
    recoveryId:'recovery-security-e2e',
    decision:PRIMARY_AI_SECURITY_RECOVERY_REVIEW_REWORK,
    evidence:['primary-ai-rework-anchor:test']
  });
  const task=reviewed.queue.tasks.find(x=>x.id==='security-run-e2e');
  const rec=reviewed.recovery.tasks.find(x=>x.id==='recovery-security-e2e');

  assert.equal(task.status,'queued');
  assert.equal(task.blocker,'security-recovery-primary-ai-rework');
  assert.equal(task.candidateBranch,null);
  assert.equal(task.pullRequestUrl,null);
  assert.equal(rec.status,'queued');
  assert.equal(rec.primaryAiReview,'REWORK');
  assert.equal(rec.learningPromotion,'PENDING');
  assert.ok(rec.evidence.includes('primary-ai-recovery-review:REWORK'));

  assert.equal(reviewed.queue.tasks.find(x=>x.id==='unrelated-system-task').status,'queued');
  assert.equal(reviewed.recovery.tasks.find(x=>x.id==='recovery-unrelated').status,'verified');
});
