import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dispatchRecovery } from '../tools/company-recovery-dispatch.mjs';
import { assignSecurityRecovery, PRIMARY_AI_SECURITY_RECOVERY_ASSIGN_DECISION, PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS, PRIMARY_AI_SECURITY_RECOVERY_REVIEW_REWORK, reserveSecurityRecoveryTask, reviewSecurityRecovery } from '../tools/company-system-ai-queue.mjs';
import { applySecurityRecoverySystemAiFanIn, securityRepairEvidence } from '../tools/company-recovery-queue.mjs';

const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
const worker=fs.readFileSync('tools/company-system-ai-worker.mjs','utf8');
const queue=fs.readFileSync('tools/company-system-ai-queue.mjs','utf8');
const securityWorkflow=fs.readFileSync('.github/workflows/company-security-immune.yml','utf8');
const securityAssignmentWorkflow=fs.readFileSync('.github/workflows/company-security-recovery-assignment.yml','utf8');
const securityReviewWorkflow=fs.readFileSync('.github/workflows/company-security-recovery-review.yml','utf8');

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
  assert.match(workflow,/primary-ai-review-required:YES/);
  assert.match(workflow,/--command=fan-in/);
});

test('System AI preflight blocks infrastructure failures before model execution and excludes them from learning',()=>{
  const preflight=workflow.indexOf('- name: Preflight worker contract before model');
  const implement=workflow.indexOf('- name: Execute external AI assignment');
  assert.ok(preflight>=0&&implement>preflight);
  assert.match(workflow,/--preflight=true/);
  assert.match(workflow,/steps\.preflight\.outcome == 'success' && steps\.preverify\.outcome != 'success'/);
  assert.match(workflow,/INFRASTRUCTURE_CONTRACT_FAILURE/);
  assert.match(workflow,/learningCandidate:!infrastructureFailure/);
  assert.match(workflow,/retry-budget-consumed:NO/);
  assert.match(workflow,/recovery-state:REPAIR_REQUIRED/);
  assert.match(workflow,/const clean=v=>String\(v\?\?''\)\.trim\(\);/);
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
  assert.match(reserve,/for attempt in 1 2 3 4 5 6 7 8; do/);
  assert.match(reserve,/sleep \$\(\( attempt < 4 \? attempt \* 2 : 8 \)\)/);
  assert.match(reserve,/git worktree add --detach \/tmp\/system-ai-control origin\/vibe2-unreal-core/);
  assert.match(reserve,/company-recovery-escalation\.mjs[\s\S]*company-recovery-dispatch\.mjs[\s\S]*company-system-ai-queue\.mjs/);
  assert.match(reserve,/COMPANY_SYSTEM_AI_CONTROL_REFRESH_RETRY/);
  assert.doesNotMatch(reserve,/git pull --rebase origin vibe2-unreal-core/);
});


test('workflow wait telemetry separates runnable reservation, fan-in job wait, and supervisor review',()=>{
  assert.match(workflow,/SYSTEM_AI_RESERVATION_WAIT_MS=\$reservation_wait_ms/);
  assert.match(workflow,/SYSTEM_AI_FAN_IN_WAIT_MS=\$fan_in_wait_ms/);
  assert.match(workflow,/SYSTEM_AI_SUPERVISOR_REVIEW_WAIT_MS=\$supervisor_review_wait_ms/);
  assert.match(workflow,/actions\/runs\/\$\{run\.id\}\/jobs\?per_page=100/);
  assert.match(workflow,/String\(j\.name\|\|''\)==='fan_in'/);
  assert.match(workflow,/awaiting-supervisor/);
  assert.match(workflow,/--supervisor-review-wait-ms="\$supervisor_review_wait_ms"/);
  assert.match(workflow,/Math\.max\(\.\.\.stamps\)/);
});

test('push-triggered System AI runs are coalesced QA-only and never reserve workers',()=>{
  assert.match(workflow,/group: company-system-ai-\$\{\{ github\.event_name == 'push' && 'push-qa' \|\| github\.run_id \}\}/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(workflow,/group: \$\{\{ github\.event_name == 'push' && 'company-system-ai-push-qa-reserve' \|\| 'company-system-ai-reserve-control' \}\}/);
  const reserve=workflow.slice(workflow.indexOf('- name: Reserve disjoint supervised assignments'),workflow.indexOf('\n  worker:'));
  assert.match(reserve,/if \[ "\$\{GITHUB_EVENT_NAME\}" = 'push' \]; then/);
  assert.match(reserve,/COMPANY_SYSTEM_AI_PUSH_QA_ONLY=YES/);
  assert.match(reserve,/matrix=\{"include":\[\]\}/);
  assert.match(reserve,/count=0/);
  assert.match(reserve,/\.event!="push"/);
  assert.ok(reserve.indexOf('COMPANY_SYSTEM_AI_PUSH_QA_ONLY=YES')<reserve.indexOf('git fetch origin vibe2-unreal-core'));
});

test('System AI uses provider matrix capacity without an internal worker cap',()=>{
  assert.match(workflow,/SYSTEM_AI_MAX_BATCH: '256'/);
  const workerBlock=workflow.slice(workflow.indexOf('\n  worker:'),workflow.indexOf('\n  fan_in:'));
  assert.match(workerBlock,/strategy:/);
  assert.match(workerBlock,/matrix: \$\{\{ fromJSON\(needs\.reserve\.outputs\.matrix\) \}\}/);
  assert.equal(/max-parallel:/.test(workerBlock),false);
  assert.match(workflow,/company-system-ai-reserve-control/);
});

test('verification-only System AI tasks run deterministic contracts before any model call',()=>{
  const preverify=workflow.indexOf('- name: Verify existing verifier contract before model');
  const implement=workflow.indexOf('- name: Execute external AI assignment');
  const currentMain=workflow.indexOf('- name: Verify no-change assignment against current main');
  assert.ok(preverify>=0&&implement>preverify&&currentMain>implement);
  assert.match(workflow,/if: steps\.preflight\.outcome == 'success' && startsWith\(matrix\.taskId, 'sys-verify-'\) && env\.SOURCE_MUTATION_REQUIRED != 'true'/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_PREVERIFY_SATISFIED=YES/);
  assert.match(workflow,/if: steps\.preflight\.outcome == 'success' && steps\.preverify\.outcome != 'success'/);
  assert.match(workflow,/const preverified=!mutationRequired&&!infrastructureFailure&&process\.env\.PREVERIFY_OUTCOME==='success'/);
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

test('security recovery reserve removes historical superseded cross-scope dependency before reservation',()=>{
  const queue={tasks:[
    {id:'repair-a',status:'done',taskType:'bottleneck-repair',goal:'repair',responsibleFiles:['tools/repair.mjs'],createdAt:'2026-09-23T00:00:00Z'},
    {id:'repair-old',status:'cancelled',taskType:'bottleneck-repair',goal:'repair',responsibleFiles:['tools/repair.mjs'],blocker:'system-ai-duplicate-repair-superseded',lastOutcome:'SUPERSEDED_DUPLICATE_WORK',evidence:['system-ai-duplicate-repair-superseded-by:repair-a'],createdAt:'2026-09-23T00:01:00Z'},
    {id:'security-task',status:'queued',priority:'critical',goal:'repair security',responsibleFiles:['tools/security-fix.mjs'],dependencies:['repair-old'],supervisorReviewRequired:true,evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:r1'],createdAt:'2026-09-23T00:02:00Z'}
  ]};
  const result=reserveSecurityRecoveryTask(queue,{id:'security-task',reservationId:'security:1',at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(result.rewired,1);
  assert.equal(result.scopeReconciled,1);
  assert.deepEqual(result.reserved.map(x=>x.id),['security-task']);
  const task=result.queue.tasks.find(x=>x.id==='security-task');
  assert.deepEqual(task.dependencies,[]);
  assert.equal(task.status,'running');
  assert.ok(task.evidence.includes('system-ai-cross-scope-canary-dependency-removed:YES'));
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
  const workerHandoff=fanIn.indexOf('company-system-ai-queue.mjs --command=handoff-missing');
  const recoveryFanIn=fanIn.indexOf('company-recovery-queue.mjs --command=fan-in-system-ai');
  const commit=fanIn.indexOf('git commit -m "system-ai: persist supervised results and worker handoff [skip ci]"');
  assert.ok(systemFanIn>=0&&workerHandoff>systemFanIn&&recoveryFanIn>workerHandoff&&commit>recoveryFanIn);
  assert.match(fanIn,/for attempt in 1 2 3 4 5; do/);
  assert.match(fanIn,/COMPANY_SYSTEM_AI_FANIN_OPTIMISTIC_RETRY=/);
  assert.match(fanIn,/--system-ai=\/tmp\/system-ai-control\/\.vibe2\/system-ai-queue\.json/);
  assert.match(fanIn,/--results=\/tmp\/company-system-ai-results/);
});


test('Primary AI security recovery PASS review atomically verifies recovery and accepts exact candidate task',()=>{
  const result=reviewSecurityRecovery({tasks:[{
    id:'security-run-review',status:'awaiting-supervisor',lastOutcome:'PASS',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9997',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-review']
  }]},{tasks:[{
    id:'recovery-review',status:'awaiting-primary-ai-review',sourceQueue:'security',sourceTaskId:'security-run-review',recoveryOwner:'SYSTEM_AI',primaryAiReview:'PENDING',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-review'],learningPromotion:'PENDING'
  }]},{recoveryId:'recovery-review',decision:PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS,evidence:['review-anchor:example']});
  const task=result.queue.tasks[0],rec=result.recovery.tasks[0];
  assert.equal(task.status,'done');
  assert.equal(task.lastOutcome,'PRIMARY_AI_ACCEPTED');
  assert.ok(task.evidence.includes('primary-ai-review:PASS'));
  assert.ok(task.evidence.includes('security-recovery-review:recovery-review'));
  assert.equal(rec.status,'verified');
  assert.equal(rec.primaryAiReview,'PASS');
  assert.equal(rec.learningPromotion,'PENDING');
  assert.ok(rec.evidence.includes('primary-ai-recovery-review:PASS'));
  assert.ok(rec.evidence.includes('review-anchor:example'));
});

test('Primary AI security recovery PASS review accepts deterministic current-main result without losing its outcome evidence',()=>{
  const result=reviewSecurityRecovery({tasks:[{
    id:'security-run-current-review',status:'done',lastOutcome:'DETERMINISTIC_CURRENT_MAIN_SATISFIED',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-current-review']
  }]},{tasks:[{
    id:'recovery-current-review',status:'awaiting-primary-ai-review',sourceQueue:'security',sourceTaskId:'security-run-current-review',recoveryOwner:'SYSTEM_AI',primaryAiReview:'PENDING',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-current-review'],learningPromotion:'PENDING'
  }]},{recoveryId:'recovery-current-review',decision:PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS});
  assert.equal(result.queue.tasks[0].status,'done');
  assert.equal(result.queue.tasks[0].lastOutcome,'DETERMINISTIC_CURRENT_MAIN_SATISFIED');
  assert.ok(result.queue.tasks[0].evidence.includes('primary-ai-review:PASS'));
  assert.equal(result.recovery.tasks[0].status,'verified');
});

test('Primary AI security recovery REWORK review requeues both exact linked rows and clears candidate state',()=>{
  const result=reviewSecurityRecovery({tasks:[{
    id:'security-run-rework',status:'awaiting-supervisor',lastOutcome:'PASS',candidateBranch:'system-ai/candidate/x',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9996',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:recovery-rework']
  },{id:'unrelated',status:'awaiting-supervisor',evidence:['unrelated']}]},{tasks:[{
    id:'recovery-rework',status:'awaiting-primary-ai-review',sourceQueue:'security',sourceTaskId:'security-run-rework',recoveryOwner:'SYSTEM_AI',primaryAiReview:'PENDING',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-rework'],learningPromotion:'PENDING'
  },{id:'other-recovery',status:'awaiting-primary-ai-review',sourceQueue:'security',sourceTaskId:'other',recoveryOwner:'SYSTEM_AI',evidence:[]}]},{recoveryId:'recovery-rework',decision:PRIMARY_AI_SECURITY_RECOVERY_REVIEW_REWORK});
  const task=result.queue.tasks.find(x=>x.id==='security-run-rework');
  const rec=result.recovery.tasks.find(x=>x.id==='recovery-rework');
  assert.equal(task.status,'queued');
  assert.equal(task.candidateBranch,null);
  assert.equal(task.pullRequestUrl,null);
  assert.equal(task.blocker,'security-recovery-primary-ai-rework');
  assert.equal(rec.status,'queued');
  assert.equal(rec.primaryAiReview,'REWORK');
  assert.equal(result.queue.tasks.find(x=>x.id==='unrelated').status,'awaiting-supervisor');
  assert.equal(result.recovery.tasks.find(x=>x.id==='other-recovery').status,'awaiting-primary-ai-review');
});

test('Primary AI security recovery review requires exact marker and exact bidirectional linkage',()=>{
  const queue={tasks:[{
    id:'security-run-exact',status:'awaiting-supervisor',lastOutcome:'PASS',pullRequestUrl:'https://github.com/hans1177/jaewoon-games/pull/9995',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','security-recovery:wrong-recovery']
  }]};
  const recovery={tasks:[{
    id:'recovery-exact',status:'awaiting-primary-ai-review',sourceQueue:'security',sourceTaskId:'security-run-exact',recoveryOwner:'SYSTEM_AI',
    evidence:['primary-ai-security-recovery-assignment:APPROVE','system-ai-assignment:security-run-exact']
  }]};
  assert.throws(()=>reviewSecurityRecovery(queue,recovery,{recoveryId:'recovery-exact',decision:'PASS'}),/EXACT_REVIEW_REQUIRED/);
  assert.throws(()=>reviewSecurityRecovery(queue,recovery,{recoveryId:'recovery-exact',decision:PRIMARY_AI_SECURITY_RECOVERY_REVIEW_PASS}),/TASK_LINK_MISMATCH/);
});

test('security recovery review workflow is manual-only, exact-decision, atomic, and never auto-merges or promotes',()=>{
  assert.match(securityReviewWorkflow,/on:\n  workflow_dispatch:/);
  assert.doesNotMatch(securityReviewWorkflow,/\n  schedule:/);
  assert.doesNotMatch(securityReviewWorkflow,/\n  push:/);
  assert.doesNotMatch(securityReviewWorkflow,/\n  repository_dispatch:/);
  assert.match(securityReviewWorkflow,/PRIMARY_AI_SECURITY_RECOVERY_REVIEW=PASS/);
  assert.match(securityReviewWorkflow,/PRIMARY_AI_SECURITY_RECOVERY_REVIEW=REWORK/);
  assert.match(securityReviewWorkflow,/--command=review-security-recovery/);
  assert.match(securityReviewWorkflow,/git add \.vibe2\/system-ai-queue\.json \.vibe2\/recovery-queue\.json/);
  assert.match(securityReviewWorkflow,/git push origin HEAD:vibe2-unreal-core/);
  assert.match(securityReviewWorkflow,/SECURITY_RECOVERY_REVIEW_CONTROL_REFRESH_RETRY/);
  assert.match(securityReviewWorkflow,/SECURITY_RECOVERY_REVIEW_AUTO_MERGE=NO/);
  assert.match(securityReviewWorkflow,/SECURITY_RECOVERY_REVIEW_AUTO_PROMOTION=NO/);
  assert.doesNotMatch(securityReviewWorkflow,/gh pr merge|HEAD:main|refs\/heads\/main/);
});


test('recovery dispatch carries exact failure signature and blocked cohort metadata into System AI repair tasks',()=>{
  const result=dispatchRecovery({
    recoveryInput:{tasks:[{
      id:'portfolio-common',status:'queued',sourceQueue:'vibe2',sourceTaskId:'game-a',relatedTaskIds:['game-a','game-b','game-c'],
      recoveryOwner:'SYSTEM_AI',recoveryStrategy:'ASSIGN_SCOPED_IMPLEMENTATION_REPAIR_TO_SUPERVISED_SYSTEM_AI_CANDIDATE_AND_RERUN_EXACT_FAILED_CHECK',
      failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'COMMON_RUNTIME_BINDING_FAILURE',blastRadius:'portfolio:3',
      responsibleFiles:['tools/demo-runtime.mjs'],contextFiles:['qa/demo-runtime.test.mjs'],
      verificationPlan:['node --test qa/demo-runtime.test.mjs'],evidence:['primary-ai-collaboration:REQUESTED']
    }]},
    gameQueueInput:{tasks:[]},
    systemAiQueueInput:{tasks:[]},
    route:'system-ai'
  });
  const task=result.systemAi.tasks.find(x=>x.id==='recovery-portfolio-common');
  assert.ok(task);
  assert.equal(task.failureStage,'TARGET_PLATFORM_RUNTIME');
  assert.equal(task.failureSignature,'COMMON_RUNTIME_BINDING_FAILURE');
  assert.equal(task.blastRadius,'portfolio:3');
  assert.deepEqual(task.blockedTaskIds,['game-a','game-b','game-c']);
  assert.equal(task.recurrenceCount,3);
  assert.ok(task.evidence.includes('recovery-exact-stage:TARGET_PLATFORM_RUNTIME'));
});

test('System AI immutable result persists failed repair fingerprints and hypothesis falsification into fan-in evidence',()=>{
  assert.match(workflow,/version:7/);
  assert.match(workflow,/repairStrategyFingerprint:clean\(worker\.repairStrategyFingerprint\)/);
  assert.match(workflow,/failed-strategy-fingerprint:/);
  assert.match(workflow,/selected-hypothesis:/);
  assert.match(workflow,/hypothesis-rejected:/);
  assert.match(workflow,/known-good-revision:/);
  assert.match(queue,/systemAiImpactProfile/);
  assert.match(queue,/system-ai-impact-score:/);
  assert.match(worker,/buildNeuralDiagnosis/);
  assert.match(worker,/CAUSAL HYPOTHESES:/);
  assert.match(worker,/KNOWN GOOD REVISION:/);
});

test('System AI bottleneck sensor recommendations steer the existing reserve path instead of remaining log-only',()=>{
  assert.match(workflow,/SYSTEM_AI_BOTTLENECK_RECOMMENDED_TARGETS=/);
  assert.match(workflow,/preferred_targets=/);
  assert.match(workflow,/--preferred="\$preferred_targets"/);
  assert.match(workflow,/SYSTEM_AI_BOTTLENECK_RESERVATION_MODE=SENSOR_GUIDED_EXISTING_RESERVE/);
  assert.match(queue,/preferredIds=\[\]/);
  assert.match(queue,/preferredOrder/);
  assert.match(queue,/preferredRank/);
  assert.doesNotMatch(workflow,/new-bottleneck-scheduler|shadow-bottleneck-workflow/i);
});

test('hard bottleneck repairs use an adversarial critic before verified candidate publication',()=>{
  assert.match(worker,/function shouldUseDeepReasoning/);
  assert.match(worker,/function buildRepairCriticPrompt/);
  assert.match(worker,/SYSTEM_AI_DEEP_STRATEGY_OPTIONS_REQUIRED/);
  assert.match(worker,/SYSTEM_AI_CRITIC_STRATEGY_NOT_FOLLOWED/);
  assert.match(worker,/criticRawStored:false/);
  assert.match(worker,/appliedAnswerSha256/);
  assert.match(workflow,/system-ai-deep-reasoning:YES/);
  assert.match(workflow,/selected-strategy:/);
  assert.match(workflow,/system-ai-critic-verdict:/);
  assert.match(workflow,/system-ai-applied-answer-sha256:/);
  const implement=workflow.indexOf('- name: Execute external AI assignment');
  const verify=workflow.indexOf('- name: Verify external AI candidate');
  assert.ok(implement>=0&&verify>implement);
});
