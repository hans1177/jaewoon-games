import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SELECTED_PLATFORMS,
  PLATFORM_EXECUTION_ADAPTERS,
  normalizeSelectedPlatform,
  resolveSelectedPlatform,
  cheapPrecheck,
  sourceFingerprint,
  createSelectedPlatformExecutionPlan,
  normalizeCommonEvidence,
  recordExecutionStage,
  selectRepresentativeCanary,
  canonicalTargetStep,
  canonicalTargetWaitingState,
} from '../tools/company-selected-platform-router.mjs';
import {createUnityDevelopmentPlatformContract} from '../tools/company-development-unity-platform.mjs';
import {createUefnDevelopmentPlatformContract} from '../tools/company-development-uefn-platform.mjs';
import {createRobloxPlatformContract} from '../tools/vibe3-roblox-platform.mjs';

test('one router recognizes all selected platforms and aliases',()=>{
  assert.deepEqual(SELECTED_PLATFORMS,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(normalizeSelectedPlatform('unity-android'),'UNITY');
  assert.equal(normalizeSelectedPlatform('uefn'),'FORTNITE_UEFN');
  assert.equal(resolveSelectedPlatform({targetPlatform:'ROBLOX'}),'ROBLOX');
  assert.equal(canonicalTargetStep(),'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(canonicalTargetWaitingState(),'WAITING_TARGET_PLATFORM_VALIDATION');
});

test('all three platforms have one common adapter registry entry',()=>{
  for(const platform of SELECTED_PLATFORMS){
    const adapter=PLATFORM_EXECUTION_ADAPTERS[platform];
    assert.equal(adapter.platform,platform);
    assert.ok(adapter.adapterPath);
    assert.ok(adapter.sourceRoot);
    assert.ok(adapter.evidenceFile);
  }
  assert.equal(createRobloxPlatformContract().parallelPipeline,false);
  assert.equal(createUnityDevelopmentPlatformContract().parallelPipeline,false);
  assert.equal(createUefnDevelopmentPlatformContract().parallelPipeline,false);
});

test('cheap precheck rejects missing selected platform and accepts existing Unity web bootstrap source',()=>{
  assert.equal(cheapPrecheck({selectedPlatform:'',sourceRevision:'abc',sourcePath:'web-games/a'}).pass,false);
  const ok=cheapPrecheck({selectedPlatform:'UNITY',sourceRevision:'abc123',sourcePath:'web-games/a'});
  assert.equal(ok.pass,true);
  assert.equal(ok.platform,'UNITY');
});

test('unchanged source fingerprint reuses one immutable build artifact and resumes exact failed stage',()=>{
  const fingerprint=sourceFingerprint({platform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789'});
  const previous=normalizeCommonEvidence({
    platform:'UNITY',
    sourceRevision:'0123456789012345678901234567890123456789',
    sourceFingerprint:fingerprint,
    buildOrPackagePassed:true,
    artifactIdentity:'artifact:unity:123',
    exactRevision:true,
    lastSuccessfulStage:'IMMUTABLE_ARTIFACT_BIND',
    failureStage:'TARGET_PLATFORM_RUNTIME',
    failureSignature:'deadbeef',
  });
  const plan=createSelectedPlatformExecutionPlan({
    selectedPlatform:'UNITY',
    sourceRevision:'0123456789012345678901234567890123456789',
    sourcePath:'unity-games/game-a',
    previousEvidence:previous,
  });
  assert.equal(plan.sameFingerprint,true);
  assert.equal(plan.artifactReusable,true);
  assert.equal(plan.buildRequired,false);
  assert.equal(plan.resumeStage,'TARGET_PLATFORM_RUNTIME');
});

test('source change invalidates old build evidence without weakening later gates',()=>{
  const oldFingerprint=sourceFingerprint({platform:'ROBLOX',sourceRevision:'old'});
  const plan=createSelectedPlatformExecutionPlan({
    selectedPlatform:'ROBLOX',
    sourceRevision:'new',
    sourcePath:'roblox-games/a.lua',
    previousEvidence:{platform:'ROBLOX',sourceFingerprint:oldFingerprint,buildOrPackagePassed:true,artifactIdentity:'old-artifact',exactRevision:true,lastSuccessfulStage:'REGRESSION'},
  });
  assert.equal(plan.sameFingerprint,false);
  assert.equal(plan.artifactReusable,false);
  assert.equal(plan.buildRequired,true);
  assert.equal(plan.resumeStage,'CHANGE_DETECTION');
  assert.equal(plan.qualityGateWeakeningAllowed,false);
});

test('canary is required only for shared execution changes or common failure and selection is deterministic',()=>{
  const normal=createSelectedPlatformExecutionPlan({selectedPlatform:'UNITY',sourceRevision:'abc',sourcePath:'unity-games/a'});
  const changed=createSelectedPlatformExecutionPlan({selectedPlatform:'UNITY',sourceRevision:'abc',sourcePath:'unity-games/a',sharedExecutionContractChanged:true});
  assert.equal(normal.canaryRequired,false);
  assert.equal(changed.canaryRequired,true);
  const canary=selectRepresentativeCanary([
    {gameId:'b',selectedPlatform:'UNITY',failureCount:0},
    {gameId:'a',selectedPlatform:'UNITY',failureCount:2},
  ]);
  assert.equal(canary.gameId,'a');
});

test('stage recording preserves exact artifact and advances common evidence fields',()=>{
  let evidence=normalizeCommonEvidence({platform:'UNITY',sourceRevision:'abc',sourceFingerprint:'finger',exactRevision:true});
  evidence=recordExecutionStage(evidence,'SINGLE_BUILD_OR_PACKAGE',{passed:true});
  evidence=recordExecutionStage(evidence,'IMMUTABLE_ARTIFACT_BIND',{passed:true,artifactIdentity:'artifact:1'});
  evidence=recordExecutionStage(evidence,'TARGET_PLATFORM_RUNTIME',{passed:true});
  evidence=recordExecutionStage(evidence,'INDEPENDENT_QA',{passed:true});
  evidence=recordExecutionStage(evidence,'REGRESSION',{passed:true});
  assert.equal(evidence.buildOrPackagePassed,true);
  assert.equal(evidence.artifactIdentity,'artifact:1');
  assert.equal(evidence.runtimePassed,true);
  assert.equal(evidence.independentQaPassed,true);
  assert.equal(evidence.regressionPassed,true);
  assert.equal(evidence.lastSuccessfulStage,'REGRESSION');
});
