// 파일명: qa/vibe2-control-queue-bottleneck.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central v497 preserves result callbacks while reducing Vibe control queue pressure',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(policy.version,497);
  const gate=policy.developmentSpeedExecution?.controlPlaneQueueBacklogMitigation||{};
  assert.equal(gate.status,'ENABLED');
  assert.equal(gate.neuronCompletionCallback?.resultBearing,true);
  assert.equal(gate.neuronCompletionCallback?.coalescingForbidden,true);
  assert.equal(gate.neuronCompletionCallback?.reserveRunnerPool,'ubuntu-24.04-arm');
  assert.equal(gate.fanInRefill?.resultBearing,false);
  assert.equal(gate.fanInRefill?.coalesceByExecutionLane,true);
  assert.equal(gate.fanInRefill?.reserveRunnerPool,'ubuntu-24.04-arm');
  assert.equal(gate.qualityOrEvidenceGateWeakeningForbidden,true);
});

test('continuous core coalesces only stateless refill and moves callback reserve to ARM',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' && format\('vibe2-fanin-refill-\{0\}'/);
  assert.match(workflow,/github\.event\.action == 'vibe2-fanin-refill' \|\| github\.event\.action == 'vibe2-neuron-complete'/);
  assert.match(workflow,/vibe2-neuron-complete'[\s\S]*'ubuntu-24\.04-arm'/);
  assert.doesNotMatch(workflow,/github\.event\.action == 'vibe2-neuron-complete' && format\('vibe2-fanin-refill-/);
  assert.match(workflow,/cancel-in-progress: false/);
});
