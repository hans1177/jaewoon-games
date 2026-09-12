// 파일명: qa/company-development-validation-selected-platform.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('DEVELOPMENT_CONFIRMED requires Web gameplay and music before selected-platform validation',()=>{
  assert.match(source,/web-gameplay-validation\.json/);
  assert.match(source,/webGameplayPass/);
  assert.match(source,/musicRuntimePass/);
  assert.match(source,/musicRuntime\?\.pass===true/);
  assert.match(source,/WAITING_WEB_GAMEPLAY_VALIDATION/);
  assert.match(source,/WAITING_WEB_GAMEPLAY_REVALIDATION/);
  assert.match(source,/webValidationRequired:true/);
  assert.match(source,/musicValidationRequired:true/);
  assert.match(source,/webValidationOptional:false/);
  assert.match(source,/resolveSelectedPlatform/);
  assert.match(source,/adapterForPlatform/);
  assert.match(source,/selectedPlatform/);
  assert.match(source,/platformAdapter\.evidenceFile/);
  assert.match(source,/platformAdapter\.projectField/);
  assert.match(source,/WAITING_TARGET_PLATFORM_VALIDATION|canonicalTargetWaitingState/);
  assert.match(source,/WAITING_TARGET_PLATFORM_REVALIDATION|canonicalTargetRevalidationState/);
  assert.doesNotMatch(source,/writeState\('WAITING_UNITY_VALIDATION'/);
  assert.doesNotMatch(source,/writeState\('WAITING_UNITY_REVALIDATION'/);
});

test('selected-platform evidence still requires real PASS and targeted revalidation',()=>{
  assert.match(source,/targetPlatform\.state==='MISSING'/);
  assert.match(source,/targetPlatform\.state==='FAIL'/);
  assert.match(source,/revalidation-required:/);
  assert.match(source,/DEVELOPMENT_ARTBOOK_PROVENANCE_GATE/);
  assert.match(source,/DEVELOPMENT_BASELINE_GATE=READY/);
});
