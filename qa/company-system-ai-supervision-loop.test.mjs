import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
const worker=fs.readFileSync('tools/company-system-ai-worker.mjs','utf8');
const queue=fs.readFileSync('tools/company-system-ai-queue.mjs','utf8');

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
