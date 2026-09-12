import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/company-development-validation-cycle.mjs','utf8');

test('DEVELOPMENT_CONFIRMED validation is selected-platform based and Web is optional',()=>{
  assert.match(source,/resolveSelectedPlatform/);
  assert.match(source,/adapterForPlatform/);
  assert.match(source,/selectedPlatform/);
  assert.match(source,/platformAdapter\.evidenceFile/);
  assert.match(source,/platformAdapter\.projectField/);
  assert.match(source,/WAITING_TARGET_PLATFORM_VALIDATION|canonicalTargetWaitingState/);
  assert.match(source,/WAITING_TARGET_PLATFORM_REVALIDATION|canonicalTargetRevalidationState/);
  assert.doesNotMatch(source,/writeState\('WAITING_WEB_VALIDATION'/);
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
