import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('homepage Top30 remains 80+ score-desc with stable cutline replacement',()=>{
  assert.match(source,/const limit=30/);
  assert.match(source,/minimumScore=WEB_HOMEPAGE_MINIMUM/);
  assert.match(source,/b\.score-a\.score/);
  assert.match(source,/previousRank/);
  assert.match(source,/STRICTLY_HIGHER_SCORE_REPLACES_CUTLINE/);
  assert.match(source,/TIE_PRESERVES_VALID_INCUMBENT/);
});

test('homepage Top30 uses canonical schema12 evidence and requires real final 30-minute content depth',()=>{
  assert.match(source,/minimumValidationSchema=WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(source,/const minimumRealGameBytes=12000/);
  assert.match(source,/const minimumExecutableBytes=6000/);
  assert.match(source,/const minimumMechanics=5/);
  assert.match(source,/evaluateWebValidationEvidence/);
  assert.match(source,/requireFinalContentDepth:true/);
  assert.match(source,/gate\.realGameSubstancePass/);
  assert.match(source,/WEB_FINAL_CONTENT_DEPTH_NOT_PASS/);
  assert.match(source,/requiresRealGameSubstance:true/);
  assert.match(source,/requiresFinalThirtyMinuteContentDepth:true/);
  assert.match(source,/requiredSessionValidationMode:'FINAL_CONTENT_DEPTH_VALIDATION'/);
  assert.match(source,/top30Eligible:true/);
  assert.match(source,/HOMEPAGE_TEST_FINAL_DEPTH_REJECTED/);
  assert.doesNotMatch(source,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.doesNotMatch(source,/row\.trigger==='GAMEPLAY_MILESTONE'/);
});
