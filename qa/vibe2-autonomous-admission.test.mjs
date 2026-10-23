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
  assert.match(main,/if: steps\.auto_admission\.outputs\.admitted == 'true'/);
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
  assert.match(core,/\[\[ "\$\{GITHUB_EVENT_NAME:-\}" == 'schedule' \]\]/);
  assert.match(core,/\[\[ "\$\{GITHUB_REF_NAME:-\}" == 'main' \]\]/);
  assert.match(core,/echo "proceed=\$proceed" >> "\$GITHUB_OUTPUT"/);
  assert.match(bridge,/WEB_VIBE_BRANCH: web-vibe-control/);
  assert.match(bridge,/tools\/web-vibe-organization\.mjs/);
  assert.doesNotMatch(bridge,/gh workflow run vibe2-continuous-core\.yml|vibe2-unreal-core/);
  assert.match(core,/workflow_dispatch:/);
  assert.match(core,/github\.event\.action == 'vibe2-neuron-complete'/);
});
