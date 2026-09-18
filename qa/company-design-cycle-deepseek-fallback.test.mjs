import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

test('structured design calls retain bounded schema recovery',()=>{
  assert.match(design,/think:false/);
  assert.match(design,/for\(let attempt=1;attempt<=3;attempt\+\+\)/);
  assert.match(design,/PREVIOUS_VALIDATION_ERROR=/);
  assert.match(design,/normalizeSchemaValue\(parsed,schema,'root',repairs\)/);
  assert.match(design,/MODEL_SCHEMA_NORMALIZED=/);
  assert.match(design,/fill-empty-array:/);
  assert.match(design,/wrap-required-object:/);
  assert.match(design,/drop-extra:/);
  assert.match(design,/assertSchemaValue\(normalized,schema\)/);
  assert.match(design,/const nextMode='json'/);
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

test('strict hard-gate feedback returns to the same game designer without bypass',()=>{
  assert.match(design,/const strictDesignerFeedback=/);
  assert.match(design,/source:'PRIOR_STRICT_DESIGN_REVIEW'/);
  assert.match(design,/bypassAllowed:false/);
  assert.match(design,/const latestDesignFeedbackEvent=designLearningEvents\.at\(-1\)\|\|null/);
  assert.match(design,/hardFailures:Array\.isArray\(latestDesignFeedbackEvent\?\.hardFailures\)/);
  assert.match(design,/STRICT_GATE_FEEDBACK=\$\{clip\(strictDesignerFeedback,5000\)\}/);
  assert.match(design,/관문 이름을 숨기거나 완화하지 말고 실제 설계 내용으로 원인을 해결하라/);
  assert.match(design,/하드관문 실패는 삭제·재명명·무시하지 말고/);
  assert.match(design,/strictGateBypassAllowed:false/);
  assert.match(design,/rejectionReasons:Array\.isArray\(event\?\.rejectionReasons\)\?event\.rejectionReasons:\[\]/);
  assert.match(design,/rejectionReasons:Array\.isArray\(latestDesignFeedbackEvent\?\.rejectionReasons\)/);
  assert.doesNotMatch(design,/rejectionReasons:designLearningEvents\.flatMap/);
});

test('game designer schema supplies every stage gate v2 evidence axis',()=>{
  for(const field of [
    'systemInterconnections','progressionEconomyBalance','contentExpansionPlan','failureRetryRisk',
    'platformFitPlan','uxAccessibilityPlan','artAudioDirection','implementationTraceability'
  ]) assert.match(design,new RegExp(field));
  assert.match(design,/signatureSystems:\{type:'array',minItems:2/);
  assert.match(design,/systemInterconnections:\{type:'array',minItems:3/);
  assert.match(design,/contentExpansionPlan:\{type:'array',minItems:3/);
  assert.match(design,/failureStates:\{type:'array',minItems:2/);
  assert.match(design,/implementationTraceability:\{type:'array',minItems:3/);
  assert.match(design,/targetPlatform:\{type:'string',enum:\['ROBLOX','UNITY','FORTNITE_UEFN'\]\}/);
});
