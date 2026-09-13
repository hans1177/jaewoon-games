import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('native platform score is calculated after target-platform evidence meeting',()=>{
  assert.match(source,/platformDevelopmentReview\(targetMeeting,targetPlatform\.data/);
  assert.doesNotMatch(source,/platformImplementationScore:webContract\.score/);
});
