import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveVerifiedCodePatterns} from '../tools/vibe2-code-pattern-ingest.mjs';

test('verified sample yields abstract code patterns without raw patch',()=>{
  const rows=deriveVerifiedCodePatterns({
    taskType:'coding',gameId:'g1',sourceRevision:'a'.repeat(40),independentQa:'PASS',browserQa:'PASS',
    instruction:'Repair mobile input and save restore state regression',
    input:'{"sourcePath":"web-games/g1"}',
    output:'summary\n검증된 패치:\n+ localStorage.setItem("x","y")',
    verification:{fullRegression:'PASS',proposedTests:['touch input','save restore']}
  },'sample.json');
  assert.ok(rows.length>=2);
  assert.ok(rows.every(x=>x.verified===true&&x.rawCodeStored===false));
  assert.ok(rows.every(x=>!String(x.pattern).includes('localStorage.setItem')));
});

test('unverified sample is rejected',()=>{
  assert.deepEqual(deriveVerifiedCodePatterns({taskType:'coding',sourceRevision:'a'.repeat(40),independentQa:'FAIL'}),[]);
});
