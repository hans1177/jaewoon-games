import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cross=fs.readFileSync('tools/artbook-cross-review-feedback.mjs','utf8');
const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');

test('cross review uses all departments and validated reusable feedback contract',()=>{
  for(const role of ['planning','graphics','development','qa','balance'])assert.match(cross,new RegExp(`['\"]${role}['\"]`));
  assert.match(cross,/validateDemoFeedback\(gameId,feedback\)/);
  assert.match(cross,/attempt<=2/);
  assert.match(cross,/systemDefectMayNotBeDropped:true/);
  assert.match(cross,/dropRequiresDesignRootCause:true/);
  assert.match(cross,/nextRevisionLearningEligible:true/);
  assert.match(cross,/paidApi:false/);
});

test('production pipeline runs cross review after semantic rewrite and before gate',()=>{
  const rewrite=pipeline.indexOf("tools/artbook-department-rewrite.mjs");
  const crossReview=pipeline.indexOf("tools/artbook-cross-review-feedback.mjs");
  const gate=pipeline.indexOf("tools/artbook-gate.mjs");
  assert.ok(rewrite>=0&&crossReview>rewrite&&gate>crossReview);
  assert.match(pipeline,/ARTBOOK_CROSS_REVIEW=FIVE_DEPARTMENTS/);
});
