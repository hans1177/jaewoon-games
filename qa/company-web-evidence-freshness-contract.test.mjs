import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
const cycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');
const homepage=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('current Web validation evidence is schema 11, real-game-substance and source-bound',()=>{
  assert.match(validator,/VALIDATION_SCHEMA_VERSION=11/);
  assert.match(validator,/sourceIndexSha256/);
  assert.match(validator,/designBaselineSha256/);
  assert.match(validator,/validationSchemaVersion:VALIDATION_SCHEMA_VERSION/);
  assert.match(validator,/substanceGate/);
  assert.match(validator,/GAMEPLAY_MILESTONE_DEPTH/);
});

test('native routing cannot accept schema10 harness, stale, non-substance or single-run Web 90 evidence',()=>{
  assert.match(cycle,/WEB_VALIDATION_SCHEMA_VERSION=11/);
  assert.match(cycle,/substancePass/);
  assert.match(cycle,/implementationClass==='DEDICATED'/);
  assert.match(cycle,/session\.validationMode==='GAMEPLAY_MILESTONE_DEPTH'/);
  assert.match(cycle,/row\.trigger==='GAMEPLAY_MILESTONE'/);
  assert.match(cycle,/row\.directStageClick===false/);
  assert.match(cycle,/webContract\.fresh/);
  assert.match(cycle,/webContract\.platformEligible/);
  assert.match(cycle,/promotion\.independentRun===true/);
  assert.match(cycle,/promotion\.sourceHashMatch===true/);
  assert.match(cycle,/promotion\.baselineHashMatch===true/);
  assert.match(cycle,/promotion\.secondSessionPass===true/);
  assert.match(cycle,/promotion\.secondSubstancePass===true/);
  assert.match(cycle,/promotion\.secondTerminalReached===true/);
  assert.match(cycle,/formalImplementationPassed===true/);
});

test('homepage Top30 rejects schema10 harness and stale Web evidence instead of grandfathering it',()=>{
  assert.match(homepage,/minimumValidationSchema=11/);
  assert.match(homepage,/realGameSubstancePass/);
  assert.match(homepage,/structured30MinutePass/);
  assert.match(homepage,/GAMEPLAY_MILESTONE_DEPTH/);
  assert.match(homepage,/currentWebHash/);
  assert.match(homepage,/currentBaselineHash/);
  assert.match(homepage,/staleEvidenceCount/);
  assert.match(homepage,/substanceRejectedCount/);
});
