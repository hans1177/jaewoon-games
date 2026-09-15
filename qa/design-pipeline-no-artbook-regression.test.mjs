import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');

test('DESIGN_ONLY continuation never reintroduces pre-Web artbook generation',()=>{
  const designBranch=pipeline.slice(pipeline.indexOf('}else{'),pipeline.indexOf("console.log('ARTBOOK_PIPELINE_COMPLETE=YES')"));
  assert.doesNotMatch(designBranch,/company-design-artbook\.mjs/);
  assert.match(designBranch,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
  assert.match(promotion,/PRE_WEB_ARTBOOK_REQUIRED=NO/);
});
