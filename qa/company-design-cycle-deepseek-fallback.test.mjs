import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

test('structured design calls retain bounded schema recovery',()=>{
  assert.match(design,/think:false/);
  assert.match(design,/for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.match(design,/PREVIOUS_VALIDATION_ERROR=/);
  assert.match(design,/normalizeSchemaValue\(parsed,schema,'root',repairs\)/);
  assert.match(design,/MODEL_SCHEMA_NORMALIZED=/);
  assert.match(design,/fill-empty-array:/);
  assert.match(design,/drop-extra:/);
  assert.match(design,/assertSchemaValue\(normalized,schema\)/);
  assert.match(design,/const nextMode='json'/);
  assert.doesNotMatch(design,/attempt<=3/);
  assert.doesNotMatch(design,/message\?\.thinking\).*return/);
});

test('DeepSeek is banned from the free company AI workforce',()=>{
  const banned=new Set(directive.ai?.bannedModels||[]);
  const pool=directive.ai?.modelPool||[];
  const leads=Object.values(directive.ai?.departmentLeadModels||{});
  assert.ok(banned.has('deepseek-r1:1.5b'));
  assert.ok(!pool.includes('deepseek-r1:1.5b'));
  assert.ok(!leads.includes('deepseek-r1:1.5b'));
  assert.equal(directive.ai?.departmentLeadModels?.qa,'qwen2.5:1.5b');
  assert.ok(pool.includes('qwen2.5:1.5b'));
  assert.equal(new Set(leads).size,5);
});

test('full design author role remains distinct and same model revises',()=>{
  assert.match(design,/const designerPool=pool\.filter\(model=>!model\.startsWith\('deepseek-r1'\)\)/);
  assert.match(design,/GAME_DESIGNER_MODEL_POOL_EMPTY/);
  assert.match(design,/const designerModel=designerPool\[hash\(`\$\{gameId\}:designer`\)%designerPool\.length\]/);
  assert.match(design,/const activeReviewModels=pool\.filter/);
  assert.match(design,/sameModelAsDraft:true/);
  assert.match(design,/sameModelRevised:true/);
});
