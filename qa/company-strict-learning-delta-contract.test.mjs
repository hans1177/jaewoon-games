import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');

test('strict review improvement learning keeps before-after evidence',()=>{
  assert.match(source,/improvementTargets/);
  assert.match(source,/previousScore/);
  assert.match(source,/scoreDelta/);
  assert.match(source,/resolvedHardFailures/);
  assert.match(source,/addedHardFailures/);
  assert.match(source,/IMPROVEMENT_80_89/);
});
