import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeCommonEvidence} from '../tools/company-selected-platform-router.mjs';

const learning=JSON.parse(fs.readFileSync('company-learning/canonical-learning-pipeline.json','utf8'));
const vibe3=JSON.parse(fs.readFileSync('company-learning/vibe3-engine-contract.json','utf8'));

test('native learning accepts only verified Roblox or Unity runtime QA regression evidence',()=>{
  const dual=learning.dualNativeLearning;
  assert.equal(dual.enabled,true);
  assert.deepEqual(dual.platforms,['ROBLOX','UNITY']);
  assert.deepEqual(dual.acceptedSources,[
    'VERIFIED_ROBLOX_RUNTIME_QA_REGRESSION',
    'VERIFIED_UNITY_APP_RUNTIME_QA_REGRESSION'
  ]);
  assert.equal(dual.platformEvidenceIndependent,true);
  assert.equal(dual.onePlatformEvidenceCannotSatisfyOtherPlatformRuntimeGate,true);
  assert.equal(dual.verifiedPatternsFeedExistingCanonicalTrainingSamples,true);
  assert.equal(dual.verifiedPatternsFeedSharedV3Memory,true);
  assert.equal(dual.separatePlatformShadowPipelineForbidden,true);
});

test('common native evidence keeps runtime QA and regression as separate real signals',()=>{
  const evidence=normalizeCommonEvidence({
    platform:'ROBLOX',
    sourceRevision:'a'.repeat(40),
    sourceFingerprint:'fingerprint',
    buildOrPackagePassed:true,
    artifactIdentity:'artifact-1',
    runtimePassed:true,
    independentQaPassed:true,
    regressionPassed:true,
    exactRevision:true
  });
  assert.equal(evidence.platform,'ROBLOX');
  assert.equal(evidence.runtimePassed,true);
  assert.equal(evidence.independentQaPassed,true);
  assert.equal(evidence.regressionPassed,true);
  assert.equal(evidence.exactRevision,true);
  assert.equal(vibe3.verifiedRag.positiveMemoryRequiresVerifiedEvidence,true);
  assert.equal(vibe3.verifiedRag.platformPassEvidenceMayNotTransfer,true);
});
