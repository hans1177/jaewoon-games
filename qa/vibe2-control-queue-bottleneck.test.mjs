// 파일명: qa/vibe2-control-queue-bottleneck.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central policy preserves every result artifact while exact-task refill wakes stay independent',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.ok(Number(policy.version)>=545);
  const gate=policy.developmentSpeedExecution?.controlPlaneQueueBacklogMitigation||{};
  assert.equal(gate.status,'ENABLED_PRESSURE_COHORT_FANIN');
  assert.equal(gate.neuronCompletionCallback?.resultBearing,true);
  assert.equal(gate.neuronCompletionCallback?.coalescingForbidden,false);
  assert.equal(gate.neuronCompletionCallback?.resultArtifactCoalescingForbidden,true);
  assert.equal(gate.neuronCompletionCallback?.callbackWorkflowSuppressionUnderQueuePressure,true);
  assert.equal(gate.neuronCompletionCallback?.singleTaskGameMicroFanInPressureExceptionRemoved,true);
  assert.equal(gate.neuronCompletionCallback?.reserveRunnerPool,'ubuntu-latest');
  assert.equal(gate.fanInRefill?.coalesceByExecutionLane,false);
  assert.equal(gate.fanInRefill?.coalesceByExactTaskIdentity,true);
  assert.equal(gate.fanInRefill?.distinctGameRefillCancellationForbidden,true);
  assert.equal(gate.fanInRefill?.reserveRunnerPool,'ubuntu-latest');
  assert.equal(gate.fanInRunnerPool,'ubuntu-latest');
  assert.equal(gate.qualityOrEvidenceGateWeakeningForbidden,true);
});

test('continuous core suppresses non-asset callback storms under pressure and preserves cohort fan-in',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' && format\('vibe2-fanin-refill-\{0\}-\{1\}'/);
  assert.match(workflow,/github\.event\.client_payload\.source_task \|\| github\.event\.client_payload\.source_run \|\| github\.run_id/);
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' \|\| github\.event\.action == 'vibe2-neuron-complete'/);
  assert.match(workflow,/vibe2-neuron-complete'[\s\S]*'ubuntu-latest'/);
  assert.match(workflow,/fan_in:[\s\S]*runs-on: ubuntu-latest/);
  assert.match(workflow,/if \[ "\$\{queue_pressure:-0\}" -gt 0 \] && \[ "\$VIBE2_EXECUTION_LANE" != 'asset-development' \]; then/);
  assert.doesNotMatch(workflow,/queue_pressure:-0\}" -gt 0[^\n]+game_micro_fanin/);
  assert.match(workflow,/VIBE2_ATOMIC_NEURON_COMPLETION_DISPATCH=COALESCED_TO_COHORT_FANIN/);
  assert.match(workflow,/VIBE2_GAME_MICRO_FANIN=IMMEDIATE_ONLY_WITHOUT_QUEUE_PRESSURE/);
  assert.match(workflow,/run-name: Vibe2 Continuous Core · \$\{\{ github\.event\.action \|\| github\.event_name \}\} ·/);
  assert.match(workflow,/runs\?event=repository_dispatch&per_page=100/);
  assert.match(workflow,/VIBE2_EVENT_DRIVEN_REFILL=DEDUPED_ACTIVE_EXACT:/);
  assert.match(workflow,/VIBE2_NEURON_REFILL_DISPATCH=DEDUPED_ACTIVE_EXACT:/);
  assert.match(workflow,/VIBE2_FAN_IN_REGRESSION_REFILL=DEDUPED_ACTIVE_EXACT:/);
  assert.match(workflow,/String\(run\.id\|\|''\)!==String\(process\.env\.CURRENT_RUN\|\|''\)/);
  assert.match(workflow,/String\(run\.head_sha\|\|''\)===String\(process\.env\.CURRENT_MAIN\|\|''\)/);
  assert.doesNotMatch(workflow,/refill_active="\$\(REFILL_TITLE=[\s\S]{0,300}node - <<'NODE'/);
  assert.match(workflow,/CURRENT_RUN="\$GITHUB_RUN_ID" node - <<'NODE' > \/tmp\/vibe2-neuron-refill-active\.txt/);
  assert.match(workflow,/CURRENT_RUN="\$GITHUB_RUN_ID" node - <<'NODE' > \/tmp\/vibe2-regression-refill-active\.txt/);
  assert.match(workflow,/CURRENT_RUN="\$GITHUB_RUN_ID" node - <<'NODE' > \/tmp\/vibe2-fanin-refill-active\.txt/);
  assert.match(workflow,/\n          NODE\n\s+refill_active="\$\(cat \/tmp\/vibe2-neuron-refill-active\.txt\)"/);
  assert.match(workflow,/\n          NODE\n\s+refill_active="\$\(cat \/tmp\/vibe2-regression-refill-active\.txt\)"/);
  assert.match(workflow,/\n          NODE\n\s+refill_active="\$\(cat \/tmp\/vibe2-fanin-refill-active\.txt\)"/);
  assert.match(workflow,/cancel-in-progress: false/);
});
