import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');

test('homepage Top30 remains 80+ score-desc with stable cutline replacement',()=>{
  assert.match(source,/const limit=30/);
  assert.match(source,/const minimumScore=WEB_HOMEPAGE_MINIMUM/);
  assert.match(contract,/WEB_HOMEPAGE_MINIMUM=80/);
  assert.match(source,/b\.score-a\.score/);
  assert.match(source,/previousRank/);
  assert.match(source,/STRICTLY_HIGHER_SCORE_REPLACES_CUTLINE/);
  assert.match(source,/TIE_PRESERVES_VALID_INCUMBENT/);
});

test('homepage Top30 rejects legacy harness evidence and requires current real-game substance and final depth',()=>{
  assert.match(source,/const minimumValidationSchema=WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=13/);
  assert.match(source,/evaluateWebValidationEvidence/);
  assert.match(source,/requireFinalContentDepth:true/);
  assert.match(source,/requiresRealGameSubstance:true/);
  assert.match(source,/requiresFinal30MinuteContentDepth:true/);
  assert.match(source,/requiredContentDepthValidationMode:'REAL_ELAPSED_GAMEPLAY'/);
  assert.match(source,/currentSourceSha256:currentWebHash/);
  assert.match(source,/currentBaselineSha256:currentBaselineHash/);
  assert.match(source,/HOMEPAGE_TEST_SUBSTANCE_REJECTED/);
  assert.doesNotMatch(source,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.doesNotMatch(source,/\[\[0,5\],\[5,15\],\[15,25\],\[25,30\]\]/);
});
