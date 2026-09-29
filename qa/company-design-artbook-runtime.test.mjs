import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const artbook=fs.readFileSync('tools/company-design-artbook.mjs','utf8');

test('DESIGN_ONLY artbook model call keeps structured output within the two-attempt policy',()=>{
  assert.match(artbook,/think:false/);
  assert.match(artbook,/for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.match(artbook,/const deepSeek=model\.startsWith\('deepseek-r1'\)/);
  assert.match(artbook,/const mode=deepSeek\?'json':\(attempt===1\?'schema':'json'\)/);
  assert.match(artbook,/payload\.format='json'/);
  assert.match(artbook,/PREVIOUS_VALIDATION_ERROR=/);
  assert.match(artbook,/parseJsonObject/);
  assert.match(artbook,/normalizeSchemaValue/);
  assert.match(artbook,/assertSchemaValue/);
  assert.match(artbook,/ARTBOOK_MODEL_FALLBACK=/);
  assert.match(artbook,/ARTBOOK_MODEL_CALL_FAILED/);
  assert.match(artbook,/ARTBOOK_MODEL_CALL_MS/);
  assert.doesNotMatch(artbook,/attempt<=3/);
});
