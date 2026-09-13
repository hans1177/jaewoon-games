import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');

test('90+ Web promotion needs independent revalidation with matching hashes',()=>{
  assert.match(source,/web-promotion-revalidation\.json/);
  assert.match(source,/sourceHashMatch/);
  assert.match(source,/baselineHashMatch/);
  assert.match(source,/formalImplementationPassed=promotionPass/);
});
