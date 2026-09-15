import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');
const designRuntime=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');

test('partial DESIGN_ONLY batch failure still evaluates persisted strict-ready games for promotion',()=>{
  assert.match(designRuntime,/fail-fast:\s*false/);
  assert.match(promotion,/workflow_run:[\s\S]*types:\s*\[completed\]/);
  assert.match(promotion,/workflow_run\.conclusion == 'success'/);
  assert.match(promotion,/workflow_run\.conclusion == 'failure'/);
  assert.doesNotMatch(promotion,/workflow_run\.conclusion == 'cancelled'/);
  assert.match(promotion,/Promote 80-point strict-ready design baselines directly to Web gate/);
  assert.match(promotion,/review\.verdict==='PASS'/);
  assert.match(promotion,/Number\(review\.totalScore\)>=80/);
  assert.match(promotion,/review\.hardFailures\.length===0/);
  assert.match(promotion,/PRE_WEB_ARTBOOK_REQUIRED=NO/);
});
