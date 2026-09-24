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


test('Roblox build preflight and F0 use per-game external-capacity parallel execution',()=>{
  assert.match(preflight,/workflow_dispatch:[\s\S]*game_id:/);
  assert.match(preflight,/group: company-development-roblox-runtime-continuation-\$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(preflight,/REQUESTED_GAME_ID: \$\{\{ inputs\.game_id \|\| '' \}\}/);
  assert.doesNotMatch(preflight,/rows\.length>=6/);
  assert.doesNotMatch(preflight,/max-parallel:\s*6/);
  assert.match(preflight,/ROBLOX_EXECUTION_WIP_MAX=EXTERNAL_CAPACITY/);
  assert.match(preflight,/ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCHED=EXACT:/);
  assert.match(headless,/group: company-development-roblox-f0-source-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.doesNotMatch(headless,/rows\.length>=6/);
  assert.doesNotMatch(headless,/max-parallel:\s*6/);
});

test('central policy makes Roblox build through final promotion per-game parallel while preserving exact dependencies',()=>{
  const roadmap=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
  const contract=roadmap.directNativeDualPlatformDevelopment?.development?.robloxEndToEndParallelExecution;
  assert.equal(contract?.mode,'PER_GAME_PIPELINE_PARALLEL_EXTERNAL_CAPACITY');
  assert.equal(contract?.crossGameParallelRequired,true);
  assert.equal(contract?.artificialStageBatchBarrierForbidden,true);
  assert.equal(contract?.globalSingletonAcrossDifferentGamesForbidden,true);
  assert.equal(contract?.sameGameRequiredDependenciesRemainOrdered,true);
  assert.equal(contract?.runtimeStatePersistence?.executionMayRunInParallel,true);
  assert.equal(contract?.runtimeStatePersistence?.canonicalStateMergeMaySerializeBriefly,true);
  assert.equal(contract?.serverBootEvidenceReuse?.reuseAllowed,true);
  assert.equal(contract?.serverBootEvidenceReuse?.staleOrCrossVersionEvidenceReuseForbidden,true);
});
