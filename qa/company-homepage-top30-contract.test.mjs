import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('homepage Top30 remains 80+ score-desc with stable cutline replacement',()=>{
  assert.match(source,/const limit=30/);
  assert.match(source,/const minimumScore=80/);
  assert.match(source,/b\.score-a\.score/);
  assert.match(source,/previousRank/);
  assert.match(source,/STRICTLY_HIGHER_SCORE_REPLACES_CUTLINE/);
  assert.match(source,/TIE_PRESERVES_VALID_INCUMBENT/);
});

test('homepage Top30 rejects legacy harness evidence and requires current real-game substance',()=>{
  assert.match(source,/const minimumValidationSchema=11/);
  assert.match(source,/const minimumRealGameBytes=12000/);
  assert.match(source,/const minimumExecutableBytes=6000/);
  assert.match(source,/const minimumMechanics=5/);
  assert.match(source,/realGameSubstancePass/);
  assert.match(source,/implementationClass==='DEDICATED'/);
  assert.match(source,/requiresRealGameSubstance:true/);
  assert.match(source,/requiredSessionValidationMode:'GAMEPLAY_MILESTONE_DEPTH'/);
  assert.match(source,/row\.trigger==='GAMEPLAY_MILESTONE'/);
  assert.match(source,/row\.directStageClick===false/);
  assert.match(source,/HOMEPAGE_TEST_SUBSTANCE_REJECTED/);
});
