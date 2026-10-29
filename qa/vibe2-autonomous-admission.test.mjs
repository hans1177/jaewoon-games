// 파일명: qa/vibe2-autonomous-admission.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessAutonomousExpansionAdmission} from '../tools/vibe2-autonomous-operations.mjs';

test('new automatic waves give priority to queued owner publication without cancelling existing jobs',()=>{
  for(const status of ['queued','pending','requested','waiting','in_progress']){
    const result=assessAutonomousExpansionAdmission({
      queuedWorkflowRuns:0,pendingWorkflowRuns:0,
      ownerPublishRuns:[{name:'Owner Fast Pages Publish',status}]
    });
    assert.equal(result.allowed,false,status);
    assert.equal(result.reason,'OWNER_PUBLICATION_PRIORITY',status);
    assert.equal(result.existingQueueDispatchAllowed,false,'owner priority must be preserved');
    assert.equal(result.existingWorkCancelled,false);
    assert.equal(result.ownerDirectWorkAllowed,true);
    assert.equal(result.finalQaPreserved,true);
  }
  const completed=assessAutonomousExpansionAdmission({
    queuedWorkflowRuns:2,pendingWorkflowRuns:0,ownerPublishRuns:[{status:'completed'}]
  });
  assert.equal(completed.allowed,true);
});

test('queued plus pending workflows, not running workflow count, apply fair backlog gate',()=>{
  const low=assessAutonomousExpansionAdmission({queuedWorkflowRuns:30,pendingWorkflowRuns:17,ownerPublishRuns:[]});
  assert.equal(low.allowed,true);
  const boundary=assessAutonomousExpansionAdmission({queuedWorkflowRuns:30,pendingWorkflowRuns:18,ownerPublishRuns:[]});
  assert.equal(boundary.allowed,false);
  assert.equal(boundary.reason,'AUTONOMOUS_WORKFLOW_BACKLOG');
  assert.equal(boundary.backlog,48);
  assert.equal(boundary.existingQueueDispatchAllowed,true,'existing work may refill under QA backlog');
  const unknown=assessAutonomousExpansionAdmission({queuedWorkflowRuns:null,pendingWorkflowRuns:23,ownerPublishRuns:null});
  assert.equal(unknown.allowed,true,'temporary status API failures may not permanently freeze production');
  assert.equal(unknown.countsKnown,false);
  assert.equal(unknown.ownerKnown,false);
});

test('24h scheduler stops only new fanout; recovery, owner-direct and finished QA stay independent',()=>{
  const main=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  assert.match(main,/id: auto_admission/);
  assert.match(main,/actions\/workflows\/owner-fast-pages-publish\.yml\/runs/);
  assert.match(main,/VIBE2_AUTO_WAVE_QUEUED=/);
  assert.match(main,/VIBE2_AUTO_WAVE_PENDING=/);
  assert.match(main,/admitted=\$admitted/);
  assert.match(main,/if: steps\.auto_admission\.outputs\.dispatch_admitted == 'true'/);
  assert.match(main,/dispatch_admitted=true/);
  assert.match(main,/dispatch_admitted=false/);
  assert.ok(main.includes('echo "dispatch_admitted=$dispatch_admitted" >> "$GITHUB_OUTPUT"'));
  assert.match(main,/VIBE2_EXISTING_QUEUE_DISPATCH_ADMITTED=/);
  assert.match(main,/needs\.plan\.outputs\.autonomy_admitted == 'true' && needs\.plan\.outputs\.game_refill_ready/);
  assert.match(main,/needs\.plan\.outputs\.autonomy_admitted == 'true' && needs\.plan\.outputs\.asset_development_refill_ready/);
  assert.match(main,/VIBE2_24H_REFILL=DEFERRED_OWNER_OR_QUEUE_PRESSURE/);
  assert.match(main,/VIBE2_AUTOPLAN_ADMISSION=DEFERRED_OWNER_OR_WORKFLOW_BACKLOG/);
  assert.match(main,/VIBE2_RELEASE_BASELINE_GAP_PLAN=NO/);
  assert.ok(main.includes('VIBE2_AUTONOMY_ADMITTED: ${{ steps.auto_admission.outputs.admitted }}'));
  assert.match(main,/recovery_fast:\s*\n\s*needs: plan\s*\n\s*if:/);
  assert.match(main,/VIBE2_RELEASE_RECOVERY_COUNT=/);
});

test('core cron and main-push auto-only reserve yields; explicit manual and owner ingress remain runnable',()=>{
  const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const bridge=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  assert.match(core,/VIBE2_AUTO_MAIN_WAKE_DEFERRED=OWNER_PAGES_PUBLICATION_PRIORITY/);
  assert.match(core,/VIBE2_AUTO_MAIN_WAKE_DEFERRED=RUNNER_WORKFLOW_BACKLOG/);
  assert.match(core,/VIBE2_AUTO_MAIN_WAKE_BACKLOG=EXISTING_GAME_PRIMARY_RESERVE_ALLOWED/);
  const gate=core.slice(core.indexOf('if [[ "$owner_publish"'),core.indexOf('echo "proceed=$proceed"'));
  assert.ok(gate.includes('VIBE2_EXECUTION_LANE:-game-primary'));
  assert.ok(gate.includes("if [[ \"${VIBE2_EXECUTION_LANE:-game-primary}\" == 'game-primary' || \"${VIBE2_EXECUTION_LANE:-game-primary}\" == 'asset-development' ]]"));
  assert.match(gate,/proceed=false/);
  assert.match(core,/\[\[ "\$\{GITHUB_EVENT_NAME:-\}" == 'schedule' \]\]/);
  assert.match(core,/\[\[ "\$\{GITHUB_REF_NAME:-\}" == 'main' \]\]/);
  assert.match(core,/echo "proceed=\$proceed" >> "\$GITHUB_OUTPUT"/);
  const cloud=bridge.slice(bridge.indexOf('  github-cloud:'));
  const local=bridge.slice(bridge.indexOf('  bridge:'),bridge.indexOf('  github-cloud:'));
  assert.ok(cloud.includes('gh workflow run vibe2-continuous-core.yml'));
  assert.ok(cloud.includes('VIBE2_BRANCH: vibe2-unreal-core'));
  assert.ok(local.includes('tools/web-vibe-organization.mjs'));
  assert.ok(!local.includes('vibe2-unreal-core'));
  assert.match(core,/workflow_dispatch:/);
  assert.match(core,/github\.event\.action == 'vibe2-neuron-complete'/);
});

test('Roblox game-primary can request allowlisted free coding models without expanding the offline lanes or paid billing',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const start=workflow.indexOf('\n  worker:\n');
  const envEnd=workflow.indexOf('\n    steps:\n',start);
  assert.ok(start>0&&envEnd>start,'existing worker owns the model selection');
  const worker=workflow.slice(start,envEnd);
  const nativeFree="matrix.target == 'roblox' && (inputs.execution_lane || github.event.client_payload.execution_lane || 'game-primary') == 'game-primary'";
  for(const key of ['VIBE2_V4_OFFLINE_ONLY','VIBE2_V4_NO_EXTERNAL_API']){
    assert.ok(worker.includes(key+': ${{ '+nativeFree+" && 'false' || 'true' }}"),
      key+' must only enable free source inference for native Roblox game-primary');
  }
  assert.ok(worker.includes("VIBE2_ROBLOX_NO_MODEL_ONLY: ${{ "+nativeFree+
    " && (vars.VIBE2_ROBLOX_NO_MODEL_ONLY || 'false') || 'true' }}"));
  assert.ok(workflow.includes("VIBE2_GROQ_FREE_PLAN_VERIFIED: ${{ vars.VIBE2_GROQ_FREE_PLAN_VERIFIED || 'NO' }}"),
    'unverified Groq plan must not be treated as free');
  const freeTierKeyGuard="GEMINI_API_KEY: ${{ vars.VIBE2_GEMINI_FREE_TIER_VERIFIED == 'YES' && secrets.GEMINI_API_KEY || '' }}";
  assert.equal(workflow.split(freeTierKeyGuard).length-1,2,
    'both inference and practice paths must withhold credentials unless the owner verifies a free-tier project');
  assert.match(workflow,/VIBE2_PAID_API=NO/);
  assert.match(workflow,/VIBE2_OPENAI_PAID_API_ALLOWED.*false/);
  const provider=fs.readFileSync('tools/vibe2-gemini-free-rotation.mjs','utf8');
  const workerSource=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(provider,/GEMINI_FREE_MODEL_PAIR_INVALID/);
  assert.match(provider,/GEMINI_AUTH_OR_BILLING_BLOCKED_NO_LOCAL_FALLBACK/);
  assert.match(provider,/NONZERO_COST_RESPONSE_BLOCKED/);
  assert.match(workerSource,/GEMINI_API_KEY_MISSING_NO_LOCAL_FALLBACK/);
});
