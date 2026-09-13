import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');

test('Roblox classification promotion has no package checkpoint',()=>{
  assert.ok(!workflow.includes('technical-plan:'));
  assert.ok(!workflow.includes('company-development-roblox-package.mjs'));
  assert.ok(!workflow.includes('qa/company-development-roblox-package.test.mjs'));
  assert.ok(!workflow.includes('robloxBuildOrPackagePassed'));
  assert.ok(!workflow.includes('roblox-package-result-missing'));
  assert.ok(!workflow.includes('TARGET_PLATFORM_BUILD_OR_PACKAGE'));
});

test('Roblox source promotion remains item-scoped after classification',()=>{
  assert.ok(workflow.includes("if(String(item.productionClass||'').toUpperCase()!=='DEVELOPMENT_CONFIRMED')continue;"));
  assert.ok(workflow.includes("if(platform!=='ROBLOX')continue;"));
  assert.ok(workflow.includes('rows.push({'));
  assert.ok(workflow.includes("status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION'"));
  assert.ok(workflow.includes('ROBLOX_SOURCE_PROMOTION_PENDING_COUNT'));
});
