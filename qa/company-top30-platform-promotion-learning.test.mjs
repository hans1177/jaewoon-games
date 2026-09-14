import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webValidation=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
const strictReview=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
const homepageSync=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');
const validationCycle=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('Web 90 promotion requires a second independent fresh real-game and content-depth validation',()=>{
  assert.match(webValidation,/VALIDATION_SCHEMA_VERSION=12/);
  assert.match(webValidation,/sourceIndexSha256/);
  assert.match(webValidation,/designBaselineSha256/);
  assert.match(webValidation,/substanceGate/);
  assert.match(webValidation,/secondSubstancePass/);
  assert.match(webValidation,/secondContentDepthPass/);
  assert.match(webValidation,/web-promotion-revalidation\.json/);
  assert.match(webValidation,/independentRun:true/);
  assert.match(webValidation,/sourceHashMatch/);
  assert.match(webValidation,/baselineHashMatch/);
  assert.match(webValidation,/formalImplementationPassed=promotionPass/);
  assert.match(webValidation,/FORMAL_IMPLEMENTATION_THRESHOLD=90/);
});

test('Top30 keeps 80 minimum, rejects stale harness evidence and preserves incumbent on a tie',()=>{
  assert.match(homepageSync,/const minimumScore=80/);
  assert.match(homepageSync,/const limit=30/);
  assert.match(homepageSync,/minimumValidationSchema=12/);
  assert.match(homepageSync,/requiresRealGameSubstance:true/);
  assert.match(homepageSync,/requiresFinal30MinuteContentDepth:true/);
  assert.match(homepageSync,/requiredContentDepthValidationMode:'REAL_GAMEPLAY_DIVERSITY_PROXY'/);
  assert.match(homepageSync,/requiresFreshSourceHash:true/);
  assert.match(homepageSync,/requiresFreshDesignBaselineHash:true/);
  assert.match(homepageSync,/finalContentDepthPass/);
  assert.match(homepageSync,/STRICTLY_HIGHER_SCORE_REPLACES_CUTLINE/);
  assert.match(homepageSync,/TIE_PRESERVES_VALID_INCUMBENT/);
  assert.match(homepageSync,/previousRank/);
});

test('Web and native platform scores and learning lanes remain separate',()=>{
  assert.match(validationCycle,/webStrictScore/);
  assert.match(validationCycle,/platformImplementationScore/);
  assert.match(validationCycle,/webLearningLane:'WEB_PORTABLE'/);
  assert.match(validationCycle,/learningLane:selectedPlatform/);
  assert.match(validationCycle,/PLATFORM_IMPROVEMENT_80_89/);
  assert.match(validationCycle,/PLATFORM_POSITIVE_SUCCESS/);
  assert.match(validationCycle,/platformScoreDelta/);
});

test('80-89 improvement learning records score delta and top score gaps',()=>{
  assert.match(strictReview,/improvementTargets/);
  assert.match(strictReview,/previousScore/);
  assert.match(strictReview,/scoreDelta/);
  assert.match(strictReview,/resolvedHardFailures/);
  assert.match(strictReview,/addedHardFailures/);
  assert.match(strictReview,/IMPROVEMENT_80_89/);
  assert.match(strictReview,/POSITIVE_SUCCESS/);
});