import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');

test('DESIGN_ONLY continuation never creates artbook before minimum-design native admission',()=>{
  const designBranch=pipeline.slice(pipeline.indexOf('}else{'),pipeline.indexOf("console.log('ARTBOOK_PIPELINE_COMPLETE=YES')"));
  assert.doesNotMatch(designBranch,/company-design-artbook\.mjs/);
  assert.match(designBranch,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
  assert.doesNotMatch(promotion,/company-design-artbook\.mjs/);
  assert.doesNotMatch(promotion,/PRE_WEB_ARTBOOK|POST_WEB_ARTBOOK/);
  assert.match(promotion,/DEVELOPMENT_ADMISSION_GATE=MINIMUM_DUAL_PLATFORM_DESIGN_READY/);
  assert.match(promotion,/STRICT_DESIGN_REVIEW=PARALLEL_NON_ADMISSION_GATE/);
  assert.match(promotion,/UNITY_WEB_PROMOTION_GATE=NO/);
});
