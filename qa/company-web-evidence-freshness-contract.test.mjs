import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');
const cycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const homepage=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('current Web validation evidence is schema13, real-game-substance and source-bound',()=>{
  assert.match(validator,/VALIDATION_SCHEMA_VERSION=13/);
  assert.match(validator,/sourceIndexSha256/);
  assert.match(validator,/designBaselineSha256/);
  assert.match(validator,/validationSchemaVersion:VALIDATION_SCHEMA_VERSION/);
  assert.match(validator,/substanceGate/);
  assert.match(validator,/REAL_ELAPSED_GAMEPLAY/);
  assert.match(validator,/elapsedRealMilliseconds/);
  assert.doesNotMatch(validator,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=13/);
});

test('native routing consumes the canonical evidence contract instead of a local 4-stage session parser',()=>{
  assert.match(cycle,/company-web-validation-evidence-contract\.mjs/);
  assert.match(cycle,/evaluateWebValidationEvidence/);
  assert.match(cycle,/requireFinalContentDepth:true/);
  assert.match(cycle,/requirePromotionRevalidation:true/);
  assert.match(cycle,/webContract\.fresh/);
  assert.match(cycle,/webContract\.platformEligible/);
  assert.doesNotMatch(cycle,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.doesNotMatch(cycle,/\[\[0,5\],\[5,15\],\[15,25\],\[25,30\]\]/);
  assert.match(contract,/promotionRevalidation/);
  assert.match(contract,/sourceHashMatch/);
  assert.match(contract,/baselineHashMatch/);
  assert.match(contract,/secondSubstancePass/);
  assert.match(contract,/secondContentDepthPass|secondFinalContentDepthPass/);
});

test('homepage Top30 uses the same schema13 contract and rejects stale Web evidence',()=>{
  assert.match(homepage,/const minimumValidationSchema=WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(homepage,/evaluateWebValidationEvidence/);
  assert.match(homepage,/requireFinalContentDepth:true/);
  assert.match(homepage,/currentSourceSha256:currentWebHash/);
  assert.match(homepage,/currentBaselineSha256:currentBaselineHash/);
  assert.match(homepage,/requiredContentDepthValidationMode:'REAL_ELAPSED_GAMEPLAY'/);
  assert.match(homepage,/staleEvidenceCount/);
  assert.match(homepage,/substanceRejectedCount/);
  assert.doesNotMatch(homepage,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.doesNotMatch(homepage,/\[\[0,5\],\[5,15\],\[15,25\],\[25,30\]\]/);
});
