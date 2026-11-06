import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
const directive=fs.readFileSync('company-directive.json','utf8');
const web=fs.readFileSync('tools/company-web-validation-evidence-contract.mjs','utf8');

test('legacy scoring structures are absent',()=>{
  assert.equal(/\n  strictReview:\n/.test(flow),false);
  assert.equal(flow.includes('commonScoreMax: 60'),false);
  assert.equal(flow.includes('categoryScoreMax: 40'),false);
  assert.equal(flow.includes('supersedesGenericStrictReviewWeightsForWebImplementation'),false);
  assert.equal(directive.includes('scoreRequiresSchema13'),false);
  assert.equal(directive.includes('\"strictReview\"'),false);
  assert.equal(web.includes('WEB_VALIDATION_SCHEMA_VERSION=13'),false);
  assert.equal(web.includes('WEB_VALIDATION_SCHEMA_VERSION=14'),false);
  assert.equal(web.includes('CORE_GAME_LOOP:15,SYSTEM_CONNECTIVITY:10'),false);
});

test('new scoring structure remains canonical',()=>{
  assert.match(flow,/COMMON_GAME_QUALITY: 55/);
  assert.match(flow,/CATEGORY_SPECIFIC_QUALITY: 25/);
  assert.match(flow,/WEB_PLATFORM_QUALITY: 20/);
  assert.match(flow,/strictHardGatePolicy:/);
  assert.match(directive,/scoreRequiresSchema15/);
  assert.match(web,/WEB_VALIDATION_SCHEMA_VERSION=15/);
  assert.match(web,/WEB_PLATFORM_SCORE_WEIGHTS/);
});
