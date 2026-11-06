import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central policy documents 60-pipeline bottleneck order and 89 pre-promotion target',()=>{
  const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
  for(const token of ['developmentPipelineTarget: 60','WEB_SCORE_80_TO_88_WEAK_AXIS_IMPROVEMENT','targetScore: 89','preserveExisting90PromotionGate: true','staleCatalogMissingProjectMustBecomeLifecycleInactive: true'])assert.equal(flow.includes(token),true,token);
});

test('status sync treats missing catalog projects as lifecycle inactive',()=>{
  const src=fs.readFileSync('tools/company-status-sync.mjs','utf8');
  assert.equal(src.includes("const lifecycleState=catalogPresent?gameLifecycleState(game):'REMOVED'"),true);
  assert.equal(src.includes("row.catalogPresent!==true||!lifecycleAllowsDevelopment(game)"),true);
});

test('planner consumes development validation and creates 80-88 to 89 implementation work',()=>{
  const src=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.equal(src.includes('function latestDevelopmentValidationStatus'),true);
  assert.equal(src.includes('function bottleneckRank'),true);
  assert.equal(src.includes('function findWebStrictImprovementTask'),true);
  assert.equal(src.includes('score<80||score>88'),true);
  assert.equal(src.includes('90점 승격 게이트나 독립 재검증 규칙은 변경하지 않는다'),true);
});
