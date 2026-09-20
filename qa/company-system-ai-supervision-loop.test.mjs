import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dispatchRecovery } from '../tools/company-recovery-dispatch.mjs';
import { assignSecurityRecovery, PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION, reserveSecurityRecoveryTask } from '../tools/company-system-ai-queue.mjs';
import { applySecurityRecoverySystemAiFanIn, securityRepairEvidence } from '../tools/company-recovery-queue.mjs';

const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
const worker=fs.readFileSync('tools/company-system-ai-worker.mjs','utf8');
const queue=fs.readFileSync('tools/company-system-ai-queue.mjs','utf8');
const securityWorkflow=fs.readFileSync('.github/workflows/company-security-immune.yml','utf8');
const securityAssignmentWorkflow=fs.readFileSync('.github/workflows/company-security-recovery-assignment.yml','utf8');

test('System AI supervision is reserve then implementation then verification then PR then fan-in',()=>{
  const reserve=workflow.indexOf('- name: Reserve disjoint supervised assignments');
  const implement=workflow.indexOf('- name: Execute external AI assignment');
  const verify=workflow.indexOf('- name: Verify external AI candidate');
  const publish=workflow.indexOf('- name: Publish verified candidate PR');
  const fanIn=workflow.indexOf('- name: Persist results for primary AI supervision');
  assert.ok(reserve>=0&&implement>reserve&&verify>implement&&publish>verify&&fanIn>publish);
  assert.match(workflow,/id: verify[\s\S]{0,180}if: steps\.implement\.outcome == 'success'/);
  assert.match(workflow,/id: publish[\s\S]{0,220}if: steps\.implement\.outcome == 'success' && steps\.verify\.outcome == 'success'/);
  assert.match(workflow,/gh pr create --base main --head "\$SYSTEM_AI_BRANCH"/);
  assert.match(workflow,/primary AI review still required/);
  assert.match(workflow,/--command=fan-in/);
});

test('System AI cannot self-accept and malformed JSON uses strict retry',()=>{
  assert.match(worker,/STRICT RETRY: return exactly one valid JSON object only/);
  assert.match(worker,/workerSelfAcceptance:false/);
  assert.match(worker,/supervisorReviewRequired:true/);
  assert.match(workflow,/worker-self-acceptance:NO/);
  assert.match(workflow,/primary-ai-review-required:YES/);
  assert.match(queue,/awaiting-supervisor/);
  assert.match(queue,/primary-ai-review-pending/);
  assert.match(queue,/primary-ai-review:PASS/);
});

test('cached local model and security scan remain mandatory before PR publication',()=>{
  assert.match(workflow,/uses: actions\/cache@v4/);
  assert.match(workflow,/\.cache\/company-system-ai-ollama\/bin\/ollama/);
  assert.match(workflow,/nohup "\$ollama_bin" serve/);
  assert.match(workflow,/node tools\/company-security-steward\.mjs --output=\/tmp\/system-ai-security-report\.json/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_VERIFICATION=PASS/);
});

test('System AI reserve self-heals recurring failed sources before reservation',()=>{
  const escalation=workflow.indexOf('node tools/company-recovery-escalation.mjs');
  const dispatch=workflow.indexOf('node tools/company-recovery-dispatch.mjs');
  const reserve=workflow.indexOf('node tools/company-system-ai-queue.mjs');
  assert.ok(escalation>=0&&dispatch>escalation&&reserve>dispatch);
  assert.match(workflow,/tools\/company-recovery-escalation\.mjs/);
  assert.match(workflow,/tools\/company-recovery-queue\.mjs/);
  assert.match(workflow,/qa\/company-recovery-learning\.test\.mjs/);
  assert.match(workflow,/git diff --quiet -- \.vibe2\/system-ai-queue\.json \.vibe2\/recovery-queue\.json/);
});


test('no-change system task may close only after deterministic current-main verification',()=>{
  const current=workflow.indexOf('- name: Verify no-change assignment against current main');
  const verify=workflow.indexOf('- name: Verify external AI candidate');
  const publish=workflow.indexOf('- name: Publish verified candidate PR');
  assert.ok(current>=0&&verify>current&&publish>verify);
  assert.match(workflow,/grep -q 'SYSTEM_AI_NO_CHANGE' \/tmp\/system-ai-worker\.log/);
  assert.match(workflow,/SYSTEM_AI_CURRENT_MAIN_VERIFICATION_REQUIRED/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_CURRENT_MAIN_SATISFIED=YES/);
  assert.match(workflow,/outcome:currentMainSatisfied\?'CURRENT_MAIN_SATISFIED':candidateOk\?'PASS':'FAIL'/);
  assert.match(workflow,/no-candidate-required:current-main-already-satisfies-task/);
  assert.match(queue,/DETERMINISTIC_CURRENT_MAIN_SATISFIED/);
  assert.match(queue,/deterministic-current-main-satisfied/);
});


test('system AI control conflict retry reloads latest control branch and recomputes state',()=>{
  const reserve=workflow.slice(workflow.indexOf('- name: Reserve disjoint supervised assignments'),workflow.indexOf('\n  worker:'));
  assert.match(reserve,/for attempt in 1 2 3; do/);
  assert.match(reserve,/git worktree add --detach \/tmp\/system-ai-control origin\/vibe2-unreal-core/);
  assert.match(reserve,/company-recovery-escalation\.mjs[\s\S]*company-recovery-dispatch\.mjs[\s\S]*company-system-ai-queue\.mjs/);
  assert.match(reserve,/COMPANY_SYSTEM_AI_CONTROL_REFRESH_RETRY/);
  assert.doesNotMatch(reserve,/git pull --rebase origin vibe2-unreal-core/);
});


test('verification-only System AI tasks run deterministic contracts before any model call',()=>{
  const preverify=workflow.indexOf('- name: Verify existing verifier contract before model');
  const implement=workflow.indexOf('- name: Execute external AI assignment');
  const currentMain=workflow.indexOf('- name: Verify no-change assignment against current main');
  assert.ok(preverify>=0&&implement>preverify&&currentMain>implement);
  assert.match(workflow,/if: startsWith\(matrix\.taskId, 'sys-verify-'\)/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_PREVERIFY_SATISFIED=YES/);
  assert.match(workflow,/if: steps\.preverify\.outcome != 'success'/);
  assert.match(workflow,/const preverified=process\.env\.PREVERIFY_OUTCOME==='success'/);
  assert.match(workflow,/model-call-skipped:deterministic-verifier-already-satisfied/);
});


test('security quarantine records only safe system repair files for deterministic primary-AI handoff',()=>{
  const evidence=securityRepairEvidence({findings:[
    {severity:'HIGH',file:'.github/workflows/example.yml'},
    {severity:'CRITICAL',file:'tools/security-fix.mjs'},
    {severity:'HIGH',file:'web-games/example/index.html'},
    {severity:'HIGH',file:'company-learning/platform-release-roadmap.json'},
    {severity:'MEDIUM',file:'qa/low-risk.test.mjs'},
    {severity:'HIGH',file:'qa/review-only.test.mjs',disposition:'REVIEW'}
  ]});
  assert.deepEqual(evidence,[
    'security-repair-file:.github/workflows/example.yml',
    'security-repair-file:tools/security-fix.mjs'
  ]);
  assert.match(securityWorkflow,/--security-report=\/tmp\/security-report\/security-report\.json/);
});

test('security recovery with safe repair evidence requests primary-AI supervised assignment without creating queue authority',()=>{
  const result=dispatchRecovery({
    recoveryInput:{tasks:[{
      id:'recovery-security-missing',status:'queued',sourceQueue:'security',sourceTaskId:'security-run-123',
      recoveryOwner:'SYSTEM_AI',recoveryStrategy:'SECURITY_CONTAIN_REMEDIATE_RESCAN_PRIMARY_AI_REVIEW',failureStage:'SECURITY_IMMUNE_SCAN',
      evidence:['security-repair-file:.github/workflows/example.yml']
    }]},
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:{tasks:[]},
    route:'all'
  });
  const row=result.recovery.tasks[0];
  assert.equal(row.status,'blocked-primary-ai-assignment-required');
  assert.ok(row.dispatchEvidence.includes('security-recovery-executor-missing'));
  assert.ok(row.dispatchEvidence.includes('primary-ai-assignment-required'));
  assert.ok(row.dispatchEvidence.includes('primary-ai-repair-file:.github/workflows/example.yml'));
  assert.equal(result.dispatched.length,0);
  assert.equal(result.systemAi.tasks.length,0);
});

test('security recovery without safe repair evidence remains blocked executor missing',()=>{
  const result=dispatchRecovery({
    recoveryInput:{tasks:[{
      id:'recovery-security-unsafe',status:'queued',sourceQueue:'security',sourceTaskId:'security-run-456',
      recoveryOwner:'SYSTEM_AI',recoveryStrategy:'SECURITY_CONTAIN_REMEDIATE_RESCAN_PRIMARY_AI_REVIEW',failureStage:'SECURITY_IMMUNE_SCAN',
      evidence:['security-repair-file:web-games/example/index.html']
    }]},
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:{tasks:[]},
    route:'all'
  });
  const row=result.recovery.tasks[0];
  assert.equal(row.status,'blocked-executor-missing');
  assert.ok(row.dispatchEvidence.includes('security-recovery-executor-missing'));
  assert.equal(result.dispatched.length,0);
  assert.equal(result.systemAi.tasks.length,0);
});

test('ordinary supervised recovery without a matching task keeps existing queued behavior',()=>{
  const result=dispatchRecovery({
    recoveryInput:{tasks:[{
      id:'recovery-system-missing',status:'queued',sourceQueue:'system-ai',sourceTaskId:'sys-missing',
      recoveryOwner:'SYSTEM_AI',recoveryStrategy:'ASSIGN_SCOPED_SYSTEM_REPAIR_TO_SUPERVISED_SYSTEM_AI_AND_RERUN_EXACT_FAILED_CHECK',failureStage:'SYSTEM_AI_IMPLEMENTATION'
    }]},
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:{tasks:[]},
    route:'all'
  });
  assert.equal(result.recovery.tasks[0].status,'queued');
  assert.equal(result.dispatched.length,0);
});


test('Primary AI security recovery assignment requires exact explicit approval and preserves supervised boundaries',()=>{
  const recovery={tasks:[{
    id:'recovery-security-123',
    status:'blocked-primary-ai-assignment-required',
    sourceQueue:'security',
    sourceTaskId:'security-run-123',
    recoveryOwner:'SYSTEM_AI',
    evidence:[
      'security-run:123',
      'security-repair-file:.github/workflows/example.yml',
      'security-repair-file:tools/security-fix.mjs',
      'security-repair-file:web-games/forbidden/index.html'
    ]
  }]};
  assert.throws(()=>assignSecurityRecovery({tasks:[]},recovery,{recoveryId:'recovery-security-123',decision:'APPROVE'}),/EXPLICIT_APPROVAL_REQUIRED/);
  const result=assignSecurityRecovery({tasks:[]},recovery,{
    recoveryId:'recovery-security-123',
    decision:PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION
  });
  assert.equal(result.task.id,'security-run-123');
  assert.equal(result.task.status,'queued');
  assert.equal(result.task.priority,'critical');
  assert.deepEqual(result.task.responsibleFiles,['.github/workflows/example.yml','tools/security-fix.mjs']);
  assert.equal(result.task.supervisorReviewRequired,true);
  assert.ok(result.task.evidence.includes('primary-ai-security-recovery-assignment:APPROVE'));
  assert.equal(result.recovery.tasks[0].status,'queued');
  assert.ok(result.recovery.tasks[0].evidence.includes('system-ai-assignment:security-run-123'));

  const dispatched=dispatchRecovery({
    recoveryInput:result.recovery,
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:result.queue,
    route:'system-ai'
  });
  assert.equal(dispatched.recovery.tasks[0].status,'dispatched');
  assert.equal(dispatched.systemAi.tasks[0].status,'queued');
  assert.ok(dispatched.systemAi.tasks[0].evidence.includes('recovery-queue:recovery-security-123'));
});

test('Primary AI security recovery assignment is never invoked automatically by system or security workflows',()=>{
  assert.doesNotMatch(workflow,/--command=assign-security-recovery/);
  assert.doesNotMatch(securityWorkflow,/--command=assign-security-recovery/);
  assert.match(queue,/PRIMARY_AI_SECURITY_RECOVERY_ASSIGN=APPROVE/);
  assert.match(queue,/SYSTEM_AI_SECURITY_RECOVERY_EXPLICIT_APPROVAL_REQUIRED/);
});


test('Primary AI security recovery assignment workflow is manual-only and atomically persists both control files',()=>{
  assert.match(securityAssignmentWorkflow,/on:\n  workflow_dispatch:/);
  assert.doesNotMatch(securityAssignmentWorkflow,/\n  schedule:/);
  assert.doesNotMatch(securityAssignmentWorkflow,/\n  push:/);
  assert.doesNotMatch(securityAssignmentWorkflow,/\n  repository_dispatch:/);
  assert.match(securityAssignmentWorkflow,/test "\$DECISION" = 'PRIMARY_AI_SECURITY_RECOVERY_ASSIGN=APPROVE'/);
  assert.match(securityAssignmentWorkflow,/for attempt in 1 2 3; do/);
  assert.match(securityAssignmentWorkflow,/git fetch origin main vibe2-unreal-core --quiet/);
  assert.match(securityAssignmentWorkflow,/git worktree add --detach \/tmp\/security-recovery-assignment-control origin\/vibe2-unreal-core/);
  assert.match(securityAssignmentWorkflow,/--command=assign-security-recovery/);
  assert.match(securityAssignmentWorkflow,/--queue="\$control\/\.vibe2\/system-ai-queue\.json"/);
  assert.match(securityAssignmentWorkflow,/--recovery="\$control\/\.vibe2\/recovery-queue\.json"/);
  assert.match(securityAssignmentWorkflow,/git add \.vibe2\/system-ai-queue\.json \.vibe2\/recovery-queue\.json/);
  assert.match(securityAssignmentWorkflow,/git commit -m "security: assign supervised recovery \$RECOVERY_ID \[skip ci\]"/);
  assert.match(securityAssignmentWorkflow,/git push origin HEAD:vibe2-unreal-core/);
  assert.match(securityAssignmentWorkflow,/SECURITY_RECOVERY_ASSIGNMENT_CONTROL_REFRESH_RETRY/);
  assert.match(securityAssignmentWorkflow,/SECURITY_RECOVERY_ASSIGNMENT_AUTO_DISPATCH=NO/);
  assert.doesNotMatch(securityAssignmentWorkflow,/company-system-ai-cycle/);
  assert.doesNotMatch(securityAssignmentWorkflow,/refs\/heads\/main|HEAD:main/);
});


test('targeted security recovery dispatch and reservation touch only the explicitly assigned task',()=>{
  const assigned=assignSecurityRecovery({tasks:[{
    id:'unrelated-task',status:'queued',priority:'critical',goal:'unrelated',responsibleFiles:['qa/unrelated.test.mjs'],verificationCommands:['node --test qa/unrelated.test.mjs'],evidence:['existing-general-task']
  }]},{tasks:[{
    id:'recovery-security-target',status:'blocked-primary-ai-assignment-required',sourceQueue:'security',sourceTaskId:'security-run-target',recoveryOwner:'SYSTEM_AI',
    evidence:['security-repair-file:tools/security-target.mjs']
  }]},{recoveryId:'recovery-security-target',decision:PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION});
  const dispatched=dispatchRecovery({
    recoveryInput:assigned.recovery,
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:assigned.queue,
    route:'system-ai',
    sourceTaskId:'security-run-target'
  });
  assert.equal(dispatched.recovery.tasks[0].status,'dispatched');
  assert.equal(dispatched.systemAi.tasks.find(x=>x.id==='unrelated-task').status,'queued');
  const reserved=reserveSecurityRecoveryTask(dispatched.systemAi,{id:'security-run-target',reservationId:'security-targeted:test'});
  assert.deepEqual(reserved.reserved.map(x=>x.id),['security-run-target']);
  assert.equal(reserved.queue.tasks.find(x=>x.id==='security-run-target').status,'running');
  assert.equal(reserved.queue.tasks.find(x=>x.id==='unrelated-task').status,'queued');
});

test('targeted security recovery reservation rejects ordinary queued system-AI tasks',()=>{
  assert.throws(()=>reserveSecurityRecoveryTask({tasks:[{
    id:'ordinary',status:'queued',priority:'critical',goal:'ordinary',responsibleFiles:['qa/ordinary.test.mjs'],verificationCommands:['node --test qa/ordinary.test.mjs'],evidence:['ordinary-task'],supervisorReviewRequired:true
  }]},{id:'ordinary',reservationId:'security-targeted:test'}),/ASSIGNMENT_EVIDENCE_REQUIRED/);
});

test('Company System AI Workers manual security target cannot pull unrelated queued work or trigger generic refill',()=>{
  assert.match(workflow,/security_recovery_task_id:/);
  assert.match(workflow,/SECURITY_RECOVERY_TASK_ID: \$\{\{ inputs\.security_recovery_task_id \|\| '' \}\}/);
  assert.match(workflow,/--source-task="\$SECURITY_RECOVERY_TASK_ID"/);
  assert.match(workflow,/--command=reserve-security-recovery/);
  assert.match(workflow,/--id="\$SECURITY_RECOVERY_TASK_ID"/);
  assert.match(workflow,/targeted_security_recovery=/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_REFILL=SKIPPED_TARGETED_SECURITY_RECOVERY/);
});


test('security recovery fan-in advances only the exactly linked recovery row to Primary-AI review',()=>{
  const recovery={tasks:[
    {
      id:'recovery-security-target',status:'dispatched',sourceQueue:'security',sourceTaskId:'security-run-target',recoveryOwner:'SYSTEM_AI',
      evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-target'],deterministicEvidence:[],retries:0,maxRetries:5
    },
    {
      id:'recovery-security-other',status:'dispatched',sourceQueue:'security',sourceTaskId:'security-run-other',recoveryOwner:'SYSTEM_AI',
      evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-other'],deterministicEvidence:[],retries:0,maxRetries:5
    }
  ]};
  const systemAi={tasks:[
    {id:'security-run-target',status:'awaiting-supervisor',lastOutcome:'PASS',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9999',evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-security-target']},
    {id:'security-run-other',status:'running',evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-security-other']}
  ]};
  const result=applySecurityRecoverySystemAiFanIn(recovery,systemAi,[{taskId:'security-run-target',outcome:'PASS',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9999'}]);
  assert.equal(result.linked,1);
  const target=result.queue.tasks.find(x=>x.id==='recovery-security-target');
  const other=result.queue.tasks.find(x=>x.id==='recovery-security-other');
  assert.equal(target.status,'awaiting-primary-ai-review');
  assert.equal(target.primaryAiReview,'PENDING');
  assert.ok(target.deterministicEvidence.includes('system-ai-fan-in:security-run-target'));
  assert.ok(target.deterministicEvidence.includes('system-ai-supervision-state:awaiting-supervisor'));
  assert.ok(target.deterministicEvidence.includes('system-ai-candidate-pr:https://github.com/hans1177/jaewoon-games/pull/9999'));
  assert.equal(other.status,'dispatched');
});

test('security recovery fan-in accepts deterministic current-main satisfaction but still requires Primary-AI review',()=>{
  const result=applySecurityRecoverySystemAiFanIn({tasks:[{
    id:'recovery-current-main',status:'dispatched',sourceQueue:'security',sourceTaskId:'security-run-current',recoveryOwner:'SYSTEM_AI',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-current'],retries:0,maxRetries:5
  }]},{tasks:[{
    id:'security-run-current',status:'done',lastOutcome:'DETERMINISTIC_CURRENT_MAIN_SATISFIED',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-current-main']
  }]},[{taskId:'security-run-current',outcome:'CURRENT_MAIN_SATISFIED'}]);
  const row=result.queue.tasks[0];
  assert.equal(row.status,'awaiting-primary-ai-review');
  assert.equal(row.primaryAiReview,'PENDING');
  assert.ok(row.deterministicEvidence.includes('system-ai-outcome:CURRENT_MAIN_SATISFIED'));
});

test('security recovery fan-in fails closed on mismatched supervisor state or recovery linkage',()=>{
  const recovery={tasks:[{
    id:'recovery-bad-link',status:'dispatched',sourceQueue:'security',sourceTaskId:'security-run-bad',recoveryOwner:'SYSTEM_AI',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-bad'],retries:0,maxRetries:5
  }]};
  assert.throws(()=>applySecurityRecoverySystemAiFanIn(recovery,{tasks:[{
    id:'security-run-bad',status:'awaiting-supervisor',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9998',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:someone-else']
  }]},[{taskId:'security-run-bad',outcome:'PASS'}]),/LINK_MISMATCH/);
  assert.throws(()=>applySecurityRecoverySystemAiFanIn(recovery,{tasks:[{
    id:'security-run-bad',status:'running',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9998',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-bad-link']
  }]},[{taskId:'security-run-bad',outcome:'PASS'}]),/SUPERVISOR_STATE_REQUIRED/);
});

test('System AI fan-in persists exact security recovery review linkage before control commit',()=>{
  const fanIn=workflow.slice(workflow.indexOf('- name: Persist results for primary AI supervision'));
  const systemFanIn=fanIn.indexOf('company-system-ai-queue.mjs --command=fan-in');
  const recoveryFanIn=fanIn.indexOf('company-recovery-queue.mjs --command=fan-in-system-ai');
  const commit=fanIn.indexOf('git commit -m "system-ai: persist supervised results and security quarantine [skip ci]"');
  assert.ok(systemFanIn>=0&&recoveryFanIn>systemFanIn&&commit>recoveryFanIn);
  assert.match(fanIn,/--system-ai=\/tmp\/system-ai-control\/\.vibe2\/system-ai-queue\.json/);
  assert.match(fanIn,/--results=\/tmp\/company-system-ai-results/);
});
