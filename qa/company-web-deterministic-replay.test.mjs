import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDeterministicReplayEvidence} from '../tools/company-web-deterministic-replay.mjs';

test('deterministic replay passes only with the same seed, full trace and identical critical-state deltas',()=>{
  const evidence=evaluateDeterministicReplayEvidence({
    usesRandomness:true,
    referenceSeed:'seed-42',
    replaySeed:'seed-42',
    expectedOutcomeSignatures:['a','b','c'],
    observedOutcomeSignatures:['a','b','c'],
    traceLength:3,
    executedCount:3,
  });
  assert.equal(evidence.pass,true);
  assert.equal(evidence.status,'PASS');
  assert.equal(evidence.sameSeed,true);
  assert.equal(evidence.sameInputTrace,true);
  assert.equal(evidence.criticalStateMatch,true);
  assert.equal(evidence.independentRun,true);
});

test('randomized game cannot claim replay PASS when the replay seed is not exposed',()=>{
  const evidence=evaluateDeterministicReplayEvidence({
    usesRandomness:true,
    referenceSeed:'',
    replaySeed:'',
    expectedOutcomeSignatures:['a','b','c'],
    observedOutcomeSignatures:['a','b','c'],
    traceLength:3,
    executedCount:3,
  });
  assert.equal(evidence.pass,false);
  assert.equal(evidence.status,'REPLAY_SEED_NOT_EXPOSED');
  assert.equal(evidence.sameSeed,false);
});

test('replay fails when the second run does not execute the full recorded input trace',()=>{
  const evidence=evaluateDeterministicReplayEvidence({
    usesRandomness:false,
    expectedOutcomeSignatures:['a','b','c','d'],
    observedOutcomeSignatures:['a','b'],
    traceLength:4,
    executedCount:2,
  });
  assert.equal(evidence.pass,false);
  assert.equal(evidence.status,'INPUT_TRACE_REPLAY_FAILED');
  assert.equal(evidence.sameInputTrace,false);
});

test('replay fails when critical gameplay state diverges under the same seed and trace',()=>{
  const evidence=evaluateDeterministicReplayEvidence({
    usesRandomness:true,
    referenceSeed:'seed-7',
    replaySeed:'seed-7',
    expectedOutcomeSignatures:['gold:+5','wave:+1','hp:-2'],
    observedOutcomeSignatures:['gold:+5','wave:+1','hp:-8'],
    traceLength:3,
    executedCount:3,
  });
  assert.equal(evidence.pass,false);
  assert.equal(evidence.status,'CRITICAL_STATE_DIVERGED');
  assert.equal(evidence.sameSeed,true);
  assert.equal(evidence.sameInputTrace,true);
  assert.equal(evidence.criticalStateMatch,false);
});

test('replay refuses a trace too short to establish regression evidence',()=>{
  const evidence=evaluateDeterministicReplayEvidence({
    usesRandomness:false,
    expectedOutcomeSignatures:['a','b'],
    observedOutcomeSignatures:['a','b'],
    traceLength:2,
    executedCount:2,
  });
  assert.equal(evidence.pass,false);
  assert.equal(evidence.status,'INSUFFICIENT_REPLAY_TRACE');
});
