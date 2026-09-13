import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('native learning feedback records real target-platform validation state',()=>{
  assert.match(source,/validatedTargetPlatformEvidence:targetPlatform\.state==='PASS'/);
  assert.match(source,/learningLane:selectedPlatform/);
});
