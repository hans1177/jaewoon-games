import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('structured design calls recover DeepSeek structure without dropping its review',()=>{
  assert.match(design,/think:false/);
  assert.match(design,/for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.match(design,/const deepSeek=model\.startsWith\('deepseek-r1'\)/);
  assert.match(design,/deepSeek\?\(attempt===1\?'json':'plain-json'\)/);
  assert.match(design,/if\(!deepSeek&&attempt===1\)payload\.format=schema/);
  assert.match(design,/else if\(mode==='json'\)payload\.format='json'/);
  assert.match(design,/PREVIOUS_VALIDATION_ERROR=/);
  assert.match(design,/normalizeSchemaValue\(parsed,schema,'root',repairs\)/);
  assert.match(design,/MODEL_SCHEMA_NORMALIZED=/);
  assert.match(design,/fill-empty-array:/);
  assert.match(design,/drop-extra:/);
  assert.match(design,/assertSchemaValue\(normalized,schema\)/);
  assert.doesNotMatch(design,/attempt<=3/);
  assert.doesNotMatch(design,/message\?\.thinking\).*return/);
});
