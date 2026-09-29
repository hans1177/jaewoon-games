import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-strict-production-review.mjs','utf8');
const designSource=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('strict review improvement learning keeps before-after evidence',()=>{
  assert.match(source,/improvementTargets/);
  assert.match(source,/previousScore/);
  assert.match(source,/scoreDelta/);
  assert.match(source,/resolvedHardFailures/);
  assert.match(source,/addedHardFailures/);
  assert.match(source,/IMPROVEMENT_80_89/);
});


test('design review feedback is reused as unvalidated next-design learning context',()=>{
  assert.match(source,/result\.reviewStage==='DESIGN_STRICT_REVIEW'\|\|e\.validatedRealEvidence===true/);
  assert.match(source,/designReviewFeedbackFeedsNextDesignContext:true/);
  assert.match(designSource,/const designLearningEvents=/);
  assert.match(designSource,/role:'UNVALIDATED_DESIGN_FEEDBACK_ONLY'/);
  assert.match(designSource,/successTrainingEligible:false/);
  assert.match(designSource,/validatedRuntimeRequiredForPositiveTraining:true/);
  assert.match(designSource,/const latestDesignFeedbackEvent=designLearningEvents\.at\(-1\)\|\|null/);
  assert.match(designSource,/STRICT_GATE_FEEDBACK=\$\{clip\(strictDesignerFeedback,4500\)\}/);
  assert.match(designSource,/rejectionReasons:Array\.isArray\(latestDesignFeedbackEvent\?\.rejectionReasons\)/);
});
