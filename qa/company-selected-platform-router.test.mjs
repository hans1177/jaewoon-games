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
  verifiedOwnerReleaseHandoffEligible,
  ownerFocusedSecondaryPlatformEligible,
  canonicalTargetStep,
  canonicalTargetWaitingState,
} from '../tools/company-selected-platform-router.mjs';
import {WEB_VALIDATION_SCHEMA_VERSION} from '../tools/company-web-validation-evidence-contract.mjs';
import {createUnityDevelopmentPlatformContract} from '../tools/company-development-unity-platform.mjs';
import {createUefnDevelopmentPlatformContract} from '../tools/company-development-uefn-platform.mjs';
import {createRobloxPlatformContract} from '../tools/vibe3-roblox-platform.mjs';

test('one router recognizes all selected platforms and aliases',()=>{
  assert.deepEqual(SELECTED_PLATFORMS,['ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(DEVELOPMENT_GAME_WIP_MAX,20);
  assert.equal(WEB_VALIDATION_SCHEMA_VERSION,15,'selected-platform admission must stay bound to the current Web schema 15 contract');
  assert.equal(normalizeSelectedPlatform('unity-android'),'UNITY');
  assert.equal(normalizeSelectedPlatform('uefn'),'FORTNITE_UEFN');
  assert.equal(resolveSelectedPlatform({targetPlatform:'ROBLOX'}),'ROBLOX');
  assert.equal(canonicalTargetStep(),'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(canonicalTargetWaitingState(),'TARGET_PLATFORM_REPAIR_REQUIRED');
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

test('global selected-platform development window is deterministic, capped at twenty and excludes stale or unconfigured work',()=>{
  const eligible=(gameId,selectedPlatform,enqueuedAt)=>({
    gameId,selectedPlatform,targetPlatform:selectedPlatform,enqueuedAt,
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    webValidationPassedAt:'2026-09-14T00:00:00.000Z',musicValidationPassed:true,
    formalImplementationPassed:true,formalImplementationVerdict:'PASS',webStrictScore:95,
    strictImplementationHardFailures:[],webValidationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,webPromotionRevalidationPassed:true,
  });
  const rows=[
    ...Array.from({length:22},(_,i)=>eligible(`g${String(i+1).padStart(2,'0')}`,i%2?'ROBLOX':'UNITY',`2026-09-14T00:${String(i+1).padStart(2,'0')}:00Z`)),
    {...eligible('stale','UNITY','2026-09-13T23:00:00Z'),formalImplementationPassed:false},
    eligible('uefn-not-configured','FORTNITE_UEFN','2026-09-13T22:00:00Z'),
  ];
  assert.equal(targetPlatformDevelopmentEligible(rows[0]),true);
  assert.equal(targetPlatformDevelopmentEligible(rows.at(-1)),false);
  const window=selectTargetPlatformDevelopmentWindow(rows);
  assert.equal(window.length,20);
  assert.deepEqual(window.map(x=>x.gameId),[
    'g01','g02','g03','g04','g05','g06','g07','g08','g09','g10',
    'g11','g12','g13','g14','g15','g16','g17','g18','g19','g20'
  ]);
  assert.equal(window.filter(x=>x.selectedPlatform==='ROBLOX').length,10);
  assert.equal(window.filter(x=>x.selectedPlatform==='UNITY').length,10);
  assert.equal(window.some(x=>x.gameId==='stale'),false);
  assert.equal(window.some(x=>x.gameId==='uefn-not-configured'),false);
});

test('verified owner Roblox release handoff enters the platform window without weakening downstream gates',()=>{
  const item={
    gameId:'generic-roblox-release',
    selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',enqueuedAt:'2026-09-13T00:28:35.330Z',
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    webValidationPassedAt:null,musicValidationPassed:false,formalImplementationPassed:false,formalImplementationVerdict:'REVISE',
    robloxVibe2VerifiedHandoff:{
      verified:true,authority:'vibe2-authoritative-studio-qa-plus-owner-release-intent',
      requestId:'generic-r5-release-20260916',gameId:'generic-roblox-release',
      requestedReleaseState:'release-confirmed',sourceRevision:'a'.repeat(40),sourceTreeSha:'b'.repeat(40),candidateSha:'c'.repeat(40),qaRunId:35070803443,
    },
  };
  assert.equal(verifiedOwnerReleaseHandoffEligible(item),true);
  assert.equal(targetPlatformDevelopmentEligible(item),true);
  assert.deepEqual(selectTargetPlatformDevelopmentWindow([item]).map(x=>x.gameId),[item.gameId]);
  assert.equal(verifiedOwnerReleaseHandoffEligible({...item,robloxVibe2VerifiedHandoff:{...item.robloxVibe2VerifiedHandoff,requestedReleaseState:'development-confirmed'}}),false);
  assert.equal(verifiedOwnerReleaseHandoffEligible({...item,robloxVibe2VerifiedHandoff:{...item.robloxVibe2VerifiedHandoff,sourceTreeSha:'bad'}}),false);
});

test('global development window never expands beyond the owner twenty-game maximum',()=>{
  const rows=Array.from({length:25},(_,i)=>({
    gameId:`game-${String(i).padStart(2,'0')}`,selectedPlatform:i%2?'ROBLOX':'UNITY',enqueuedAt:`2026-09-14T00:${String(i).padStart(2,'0')}:00Z`,
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    webValidationPassedAt:'2026-09-14T00:00:00.000Z',musicValidationPassed:true,formalImplementationPassed:true,formalImplementationVerdict:'PASS',
    webStrictScore:100,strictImplementationHardFailures:[],webValidationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,webPromotionRevalidationPassed:true,
  }));
  assert.equal(selectTargetPlatformDevelopmentWindow(rows,999).length,20);
});

test('stale Web schema evidence cannot enter selected-platform development',()=>{
  const item={
    gameId:'stale-schema',selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    webValidationPassedAt:'2026-09-17T00:00:00.000Z',musicValidationPassed:true,formalImplementationPassed:true,formalImplementationVerdict:'PASS',
    webStrictScore:95,strictImplementationHardFailures:[],webValidationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION-1,webPromotionRevalidationPassed:true,
  };
  assert.equal(targetPlatformDevelopmentEligible(item),false);
  assert.equal(targetPlatformDevelopmentEligible({...item,webValidationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION}),true);
});

test('cheap precheck rejects missing selected platform and accepts selected-platform source',()=>{
  assert.equal(cheapPrecheck({selectedPlatform:'',sourceRevision:'abc',sourcePath:'web-games/a'}).pass,false);
  const ok=cheapPrecheck({selectedPlatform:'UNITY',sourceRevision:'abc123',sourcePath:'unity-games/a'});
  assert.equal(ok.pass,true);
  assert.equal(ok.platform,'UNITY');
});

test('unchanged source fingerprint reuses one immutable build artifact and resumes exact failed stage',()=>{
  const fingerprint=sourceFingerprint({platform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789'});
  const previous=normalizeCommonEvidence({platform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789',sourceFingerprint:fingerprint,buildOrPackagePassed:true,artifactIdentity:'artifact:unity:123',exactRevision:true,lastSuccessfulStage:'IMMUTABLE_ARTIFACT_BIND',failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'deadbeef'});
  const plan=createSelectedPlatformExecutionPlan({selectedPlatform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789',sourcePath:'unity-games/game-a',previousEvidence:previous});
  assert.equal(plan.sameFingerprint,true);
  assert.equal(plan.artifactReusable,true);
  assert.equal(plan.buildRequired,false);
  assert.equal(plan.resumeStage,'TARGET_PLATFORM_RUNTIME');
});

test('source change invalidates old build evidence without weakening later gates',()=>{
  const oldFingerprint=sourceFingerprint({platform:'ROBLOX',sourceRevision:'old'});
  const plan=createSelectedPlatformExecutionPlan({selectedPlatform:'ROBLOX',sourceRevision:'new',sourcePath:'roblox-games/a.lua',previousEvidence:{platform:'ROBLOX',sourceFingerprint:oldFingerprint,buildOrPackagePassed:true,artifactIdentity:'old-artifact',exactRevision:true,lastSuccessfulStage:'REGRESSION'}});
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
  const canary=selectRepresentativeCanary([{gameId:'b',selectedPlatform:'UNITY',failureCount:0},{gameId:'a',selectedPlatform:'UNITY',failureCount:2}]);
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

test('owner-focused concurrent contract can admit Roblox as a secondary platform without changing selected Unity',()=>{
  const item={
    gameId:'fantasy-survival',selectedPlatform:'UNITY',targetPlatform:'UNITY',
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    webValidationPassedAt:'2026-09-20T00:00:00.000Z',musicValidationPassed:true,
    formalImplementationPassed:true,formalImplementationVerdict:'PASS',
    webStrictScore:95,strictImplementationHardFailures:[],
    webValidationSchemaVersion:WEB_VALIDATION_SCHEMA_VERSION,webPromotionRevalidationPassed:true,
  };
  const roadmap={assetProductionParallelContract:{
    enabled:true,firstAdoption:{
      gameId:'fantasy-survival',mode:'UNITY_ROBLOX_CONCURRENT',targetPlatforms:['UNITY','ROBLOX']
    }
  }};
  assert.equal(ownerFocusedSecondaryPlatformEligible(item,roadmap,'ROBLOX'),true);
  assert.equal(item.selectedPlatform,'UNITY');
  assert.equal(ownerFocusedSecondaryPlatformEligible(item,roadmap,'UNITY'),false);
  assert.equal(ownerFocusedSecondaryPlatformEligible({...item,gameId:'other-game'},roadmap,'ROBLOX'),false);
  assert.equal(ownerFocusedSecondaryPlatformEligible({...item,webPromotionRevalidationPassed:false},roadmap,'ROBLOX'),false);
});

