import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('structured design calls fall back without dropping DeepSeek review',()=>{
  assert.match(design,/think:false/);
  assert.match(design,/attempt===1\?'schema':attempt===2\?'json':'plain-json'/);
  assert.match(design,/payload\.format=schema/);
  assert.match(design,/payload\.format='json'/);
  assert.match(design,/model\.startsWith\('deepseek-r1'\)&&attempt>1\?4096/);
  assert.match(design,/MODEL_CALL_FALLBACK=/);
  assert.match(design,/MODEL_EMPTY_CONTENT_WITH_THINKING=/);
  assert.match(design,/assertSchemaValue\(parsed,schema\)/);
  assert.doesNotMatch(design,/message\?\.thinking\).*return/);
});
