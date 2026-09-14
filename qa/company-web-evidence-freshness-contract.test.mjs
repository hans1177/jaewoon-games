import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
const cycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const contract=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');
const homepage=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('current Web validation evidence is schema 12, real-play-cycle and source-bound',()=>{
  assert.match(validator,/VALIDATION_SCHEMA_VERSION=12/);
  assert.match(validator,/sourceIndexSha256/);
  assert.match(validator,/designBaselineSha256/);
  assert.match(validator,/validationSchemaVersion:VALIDATION_SCHEMA_VERSION/);
  assert.match(validator,/substanceGate/);
  assert.match(validator,/initialPlayableCycle/);
  assert.match(validator,/contentDepthValidation/);
  assert.match(validator,/REAL_GAMEPLAY_DIVERSITY_PROXY/);
  assert.match(validator,/implementationMetrics/);
});

test('native routing uses the canonical schema12 evaluator and cannot accept stale or single-run Web 90 evidence',()=>{
  assert.match(cycle,/evaluateWebValidationEvidence/);
  assert.match(cycle,/WEB_VALIDATION_SCHEMA_VERSION/);
  assert.match(cycle,/finalContentDepthPass/);
  assert.match(cycle,/substancePass/);
  assert.match(cycle,/webContract\.fresh/);
  assert.match(cycle,/webContract\.platformEligible/);
  assert.match(contract,/WEB_VALIDATION_SCHEMA_VERSION=12/);
  assert.match(contract,/requirePromotionRevalidation:true|requirePromotionRevalidation/);
  assert.match(contract,/WEB_INDEPENDENT_PROMOTION_REVALIDATION_NOT_PASS/);
  assert.match(contract,/WEB_PROMOTION_SOURCE_HASH_MISMATCH/);
  assert.match(contract,/WEB_PROMOTION_BASELINE_HASH_MISMATCH/);
  assert.match(contract,/WEB_PROMOTION_SUBSTANCE_REVALIDATION_NOT_PASS/);
  assert.match(contract,/WEB_PROMOTION_CONTENT_DEPTH_REVALIDATION_NOT_PASS/);
});

test('homepage Top30 rejects schema11 harness and stale or shallow Web evidence instead of grandfathering it',()=>{
  assert.match(homepage,/minimumValidationSchema=12/);
  assert.match(homepage,/realGameSubstancePass/);
  assert.match(homepage,/finalContentDepthPass/);
  assert.match(homepage,/REAL_GAMEPLAY_DIVERSITY_PROXY/);
  assert.match(homepage,/currentWebHash/);
  assert.match(homepage,/currentBaselineHash/);
  assert.match(homepage,/staleEvidenceCount/);
  assert.match(homepage,/substanceRejectedCount/);
  assert.match(homepage,/depthRejectedCount/);
});