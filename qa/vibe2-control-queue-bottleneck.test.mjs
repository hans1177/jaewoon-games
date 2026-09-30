// 파일명: qa/vibe2-control-queue-bottleneck.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central v499 preserves every result artifact while coalescing callback workflows under pressure',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(policy.version,499);
  const gate=policy.developmentSpeedExecution?.controlPlaneQueueBacklogMitigation||{};
  assert.equal(gate.status,'ENABLED_PRESSURE_COHORT_FANIN');
  assert.equal(gate.neuronCompletionCallback?.resultBearing,true);
  assert.equal(gate.neuronCompletionCallback?.coalescingForbidden,false);
  assert.equal(gate.neuronCompletionCallback?.resultArtifactCoalescingForbidden,true);
  assert.equal(gate.neuronCompletionCallback?.callbackWorkflowSuppressionUnderQueuePressure,true);
  assert.equal(gate.neuronCompletionCallback?.singleTaskGameMicroFanInPressureExceptionRemoved,true);
  assert.equal(gate.neuronCompletionCallback?.reserveRunnerPool,'ubuntu-latest');
  assert.equal(gate.fanInRefill?.coalesceByExecutionLane,true);
  assert.equal(gate.fanInRefill?.reserveRunnerPool,'ubuntu-latest');
  assert.equal(gate.fanInRunnerPool,'ubuntu-latest');
  assert.equal(gate.qualityOrEvidenceGateWeakeningForbidden,true);
});

test('continuous core suppresses non-asset callback storms under pressure and preserves cohort fan-in',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' && format\('vibe2-fanin-refill-\{0\}'/);
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' \|\| github\.event\.action == 'vibe2-neuron-complete'/);
  assert.match(workflow,/vibe2-neuron-complete'[\s\S]*'ubuntu-latest'/);
  assert.match(workflow,/fan_in:[\s\S]*runs-on: ubuntu-latest/);
  assert.match(workflow,/if \[ "\$\{queue_pressure:-0\}" -gt 0 \] && \[ "\$VIBE2_EXECUTION_LANE" != 'asset-development' \]; then/);
  assert.doesNotMatch(workflow,/queue_pressure:-0\}" -gt 0[^\n]+game_micro_fanin/);
  assert.match(workflow,/VIBE2_ATOMIC_NEURON_COMPLETION_DISPATCH=COALESCED_TO_COHORT_FANIN/);
  assert.match(workflow,/VIBE2_GAME_MICRO_FANIN=IMMEDIATE_ONLY_WITHOUT_QUEUE_PRESSURE/);
  assert.match(workflow,/cancel-in-progress: false/);
});
