import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('native platform score has independent 90 pass and 80-89 retry band',()=>{
  assert.match(source,/PLATFORM_DEVELOPMENT_PASS_MINIMUM=90/);
  assert.match(source,/platformImplementationScore/);
  assert.match(source,/platform-implementation-score-80-89/);
});

test('learning output keeps Web portable and native platform lanes distinct',()=>{
  assert.match(source,/webLearningLane:'WEB_PORTABLE'/);
  assert.match(source,/learningLane:selectedPlatform/);
  assert.match(source,/PLATFORM_POSITIVE_SUCCESS/);
  assert.match(source,/PLATFORM_IMPROVEMENT_80_89/);
  assert.match(source,/platformScoreDelta/);
});
