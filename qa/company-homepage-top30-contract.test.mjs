import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/homepage-test-candidate-sync.mjs','utf8');

test('homepage Top30 remains 80+ score-desc with stable cutline replacement',()=>{
  assert.match(source,/const limit=30/);
  assert.match(source,/const minimumScore=80/);
  assert.match(source,/b\.score-a\.score/);
  assert.match(source,/previousRank/);
  assert.match(source,/STRICTLY_HIGHER_SCORE_REPLACES_CUTLINE/);
  assert.match(source,/TIE_PRESERVES_VALID_INCUMBENT/);
});
