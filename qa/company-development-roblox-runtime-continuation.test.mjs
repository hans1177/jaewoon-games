import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectRobloxBuildPreflight} from '../tools/company-development-roblox-build-preflight.mjs';

const preflight=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
const headless=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-headless-fast-mvp.yml',import.meta.url),'utf8');
const headlessEvaluator=fs.readFileSync(new URL('../tools/company-development-roblox-headless-fast-mvp.mjs',import.meta.url),'utf8');
const parent=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');
const directive=JSON.parse(fs.readFileSync(new URL('../company-directive.json',import.meta.url),'utf8'));

test('Roblox native path is package -> shared preflight -> F0 -> private runtime candidate -> actual tester QA',()=>{
  assert.ok(preflight.includes('workflow_dispatch:'));
  assert.ok(!preflight.includes('company-development-roblox-package.mjs'));
  assert.ok(preflight.includes('company-development-roblox-build-preflight.mjs'));
  assert.ok(preflight.includes("model: 'llama3.2:1b'"));
  assert.ok(preflight.includes('Run Vibe plus shared-model build preflight'));
  assert.ok(preflight.includes('company-development-roblox-headless-fast-mvp.yml'));
  assert.ok(headless.includes('Roblox F0 Source Preflight'));
  assert.ok(headless.includes('company-development-roblox-headless-fast-mvp.mjs'));
  assert.ok(headless.includes('company-development-roblox-release-promotion.yml'));
});

test('shared preflight requires exact immutable build and one shared model',()=>{
  const item={
    gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',
    robloxSourceBootstrapPassedAt:'2026-09-22T00:00:00Z',
    robloxSourceCommit:'a'.repeat(40),robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  };
  const result=inspectRobloxBuildPreflight({item,directive});
  assert.equal(result.pass,true,result.blockers.join(','));
  assert.equal(result.distinctLeadCount,1);
  assert.equal(result.sharedModel,'llama3.2:1b');
});

test('preflight persistence promotes only exact source and artifact',()=>{
  assert.ok(preflight.includes('result?.sourceRevision===sourceRevision'));
  assert.ok(preflight.includes('result?.artifactIdentity===artifactIdentity'));
  assert.ok(preflight.includes('robloxBuildPreflightPassed:true'));
  assert.ok(preflight.includes("robloxFailureStage:'F0_SOURCE_INTEGRITY'"));
  assert.ok(preflight.includes("robloxFailureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_PENDING'"));
});

test('F0 source preflight validates source integrity and explicitly cannot claim actual runtime',()=>{
  for(const token of ['duplicateDeclarationGuard','foundationSentinelContract','sourceStartupMarkers','f0SourceIntegrityPassed','actualRuntimeEvidence:false','runtimeFoundationPassed:false']){
    assert.ok(headlessEvaluator.includes(token),token);
  }
  assert.ok(headless.includes('rebuilt'));
  assert.ok(headless.includes('EXPECTED_ARTIFACT'));
  assert.ok(headless.includes('robloxFoundationF0Passed=exact'));
  assert.ok(headless.includes("item.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'"));
});

test('canonical parent watches both fast-path workflows',()=>{
  assert.ok(parent.includes("- '.github/workflows/company-development-roblox-runtime-continuation.yml'"));
  assert.ok(parent.includes("- '.github/workflows/company-development-roblox-headless-fast-mvp.yml'"));
});
