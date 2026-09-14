import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SELECTED_PLATFORMS,
  PLATFORM_EXECUTION_ADAPTERS,
  DEVELOPMENT_GAME_WIP_MAX,
  normalizeSelectedPlatform,
  resolveSelectedPlatform,
  cheapPrecheck,
  sourceFingerprint,
  failureSignature,
  createSelectedPlatformExecutionPlan,
  normalizeCommonEvidence,
  recordExecutionStage,
  selectRepresentativeCanary,
  selectTargetPlatformDevelopmentWindow,
  targetPlatformDevelopmentEligible,
  canonicalTargetStep,
  canonicalTargetWaitingState,
} from '../tools/company-selected-platform-router.mjs';
import {createUnityDevelopmentPlatformContract} from '../tools/company-development-unity-platform.mjs';
import {createUefnDevelopmentPlatformContract} from '../tools/company-development-uefn-platform.mjs';
import {createRobloxPlatformContract} from '../tools/vibe3-roblox-platform.mjs';

test('one router recognizes all selected platforms and aliases',()=>{
  assert.deepEqual(SELECTED_PLATFORMS,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(DEVELOPMENT_GAME_WIP_MAX,6);
  assert.equal(normalizeSelectedPlatform('unity-android'),'UNITY');
  assert.equal(normalizeSelectedPlatform('uefn'),'FORTNITE_UEFN');
  assert.equal(resolveSelectedPlatform({targetPlatform:'ROBLOX'}),'ROBLOX');
  assert.equal(canonicalTargetStep(),'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(canonicalTargetWaitingState(),'WAITING_TARGET_PLATFORM_VALIDATION');
});

test('all three platforms have one common adapter registry entry without inventing UEFN runtime success',()=>{
  for(const platform of SELECTED_PLATFORMS){
    const adapter=PLATFORM_EXECUTION_ADAPTERS[platform];
    assert.equal(adapter.platform,platform);
    assert.ok(adapter.adapterPath);
    assert.ok(adapter.sourceRoot);
    assert.ok(adapter.evidenceFile);
  }
  assert.equal(createRobloxPlatformContract().parallelPipeline,false);
  assert.equal(createUnityDevelopmentPlatformContract().parallelPipeline,false);
  const uefn=createUefnDevelopmentPlatformContract();
  assert.equal(uefn.parallelPipeline,false);
  assert.equal(uefn.runtimeExecutionConfigured,false);
  assert.equal(PLATFORM_EXECUTION_ADAPTERS.FORTNITE_UEFN.existingExecutionPath,null);
});

test('global selected-platform development window is deterministic, capped at six and excludes stale or unconfigured work',()=>{
  const eligible=(gameId,selectedPlatform,enqueuedAt)=>({
    gameId,selectedPlatform,targetPlatform:selectedPlatform,enqueuedAt,
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION',
    webValidationPassedAt:'2026-09-14T00:00:00.000Z',musicValidationPassed:true,
    formalImplementationPassed:true,formalImplementationVerdict:'PASS',webStrictScore:95,
    strictImplementationHardFailures:[],webValidationSchemaVersion:13,webPromotionRevalidationPassed:true,
  });
  const rows=[
    eligible('g7','UNITY','2026-09-14T00:07:00Z'),
    eligible('g1','UNITY','2026-09-14T00:01:00Z'),
    eligible('g2','ROBLOX','2026-09-14T00:02:00Z'),
    eligible('g3','UNITY','2026-09-14T00:03:00Z'),
    eligible('g4','ROBLOX','2026-09-14T00:04:00Z'),
    eligible('g5','UNITY','2026-09-14T00:05:00Z'),
    eligible('g6','ROBLOX','2026-09-14T00:06:00Z'),
    eligible('g8','UNITY','2026-09-14T00:08:00Z'),
    {...eligible('stale','UNITY','2026-09-13T23:00:00Z'),formalImplementationPassed:false},
    eligible('uefn-not-configured','FORTNITE_UEFN','2026-09-13T22:00:00Z'),
  ];
  assert.equal(targetPlatformDevelopmentEligible(rows[0]),true);
  assert.equal(targetPlatformDevelopmentEligible(rows.at(-1)),false);
  const window=selectTargetPlatformDevelopmentWindow(rows);
  assert.equal(window.length,6);
  assert.deepEqual(window.map(x=>x.gameId),['g1','g2','g3','g4','g5','g6']);
  assert.equal(window.some(x=>x.gameId==='stale'),false);
  assert.equal(window.some(x=>x.gameId==='uefn-not-configured'),false);
});

test('global development window never expands beyond the owner six-game maximum',()=>{
  const rows=Array.from({length:10},(_,i)=>({
    gameId:`game-${String(i).padStart(2,'0')}`,selectedPlatform:i%2?'ROBLOX':'UNITY',enqueuedAt:`2026-09-14T00:${String(i).padStart(2,'0')}:00Z`,
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION',
    webValidationPassedAt:'2026-09-14T00:00:00.000Z',musicValidationPassed:true,formalImplementationPassed:true,formalImplementationVerdict:'PASS',
    webStrictScore:100,strictImplementationHardFailures:[],webValidationSchemaVersion:13,webPromotionRevalidationPassed:true,
  }));
  assert.equal(selectTargetPlatformDevelopmentWindow(rows,999).length,6);
});

test('cheap precheck rejects missing selected platform and accepts selected-platform source',()=>{
  assert.equal(cheapPrecheck({selectedPlatform:'',sourceRevision:'abc',sourcePath:'web-games/a'}).pass,false);
  const ok=cheapPrecheck({selectedPlatform:'UNITY',sourceRevision:'abc123',sourcePath:'unity-games/a'});
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

test('canary is deterministic and common stage failures dedupe across game ids',()=>{
  const normal=createSelectedPlatformExecutionPlan({selectedPlatform:'UNITY',sourceRevision:'abc',sourcePath:'unity-games/a'});
  const changed=createSelectedPlatformExecutionPlan({selectedPlatform:'UNITY',sourceRevision:'abc',sourcePath:'unity-games/a',sharedExecutionContractChanged:true});
  assert.equal(normal.canaryRequired,false);
  assert.equal(changed.canaryRequired,true);
  const sigA=failureSignature({stage:'TARGET_PLATFORM_RUNTIME',code:'STAGE_NOT_PASSED',message:'seed-game-a:TARGET_PLATFORM_RUNTIME'});
  const sigB=failureSignature({stage:'TARGET_PLATFORM_RUNTIME',code:'STAGE_NOT_PASSED',message:'seed-game-b:TARGET_PLATFORM_RUNTIME'});
  assert.equal(sigA,sigB);
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
