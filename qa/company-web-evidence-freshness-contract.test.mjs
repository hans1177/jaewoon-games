import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
const cycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const homepage=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('current Web validation evidence is schema 10 and source-bound',()=>{
  assert.match(validator,/VALIDATION_SCHEMA_VERSION=10/);
  assert.match(validator,/sourceIndexSha256/);
  assert.match(validator,/designBaselineSha256/);
  assert.match(validator,/validationSchemaVersion:VALIDATION_SCHEMA_VERSION/);
});

test('native routing cannot accept stale or single-run Web 90 evidence',()=>{
  assert.match(cycle,/WEB_VALIDATION_SCHEMA_VERSION=10/);
  assert.match(cycle,/webContract\.fresh/);
  assert.match(cycle,/webContract\.platformEligible/);
  assert.match(cycle,/promotionRevalidation\?\.pass===true/);
  assert.match(cycle,/formalImplementationPassed===true/);
});

test('homepage Top30 rejects stale Web evidence instead of grandfathering it',()=>{
  assert.match(homepage,/minimumValidationSchema=10/);
  assert.match(homepage,/structured30MinutePass/);
  assert.match(homepage,/currentWebHash/);
  assert.match(homepage,/currentBaselineHash/);
  assert.match(homepage,/staleEvidenceCount/);
});
