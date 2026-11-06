import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const review=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
const evidence=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');

test('strict review persists the canonical complete playable gameplay cycle hard gate',()=>{
  assert.match(evidence,/COMPLETE_PLAYABLE_GAMEPLAY_CYCLE/);
  assert.match(review,/webScore\.hardGates\.COMPLETE_PLAYABLE_GAMEPLAY_CYCLE===true/);
  assert.doesNotMatch(review,/COMPLETE_PLAYABLE_CYCLE_REQUIRED/);
});
