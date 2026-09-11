import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');

test('DESIGN_ONLY artbook model call disables reasoning and retries structured output',()=>{
  assert.match(artbook,/think:false/);
  assert.match(artbook,/for\(let attempt=1;attempt<=3;attempt\+\+\)/);
  assert.match(artbook,/empty model response/);
  assert.match(artbook,/ARTBOOK_MODEL_CALL_FAILED/);
  assert.match(artbook,/ARTBOOK_MODEL_CALL_MS/);
});
