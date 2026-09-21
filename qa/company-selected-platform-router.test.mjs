import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SELECTED_PLATFORMS,
  DEFAULT_CONCURRENT_PLATFORMS,
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
  concurrentTargetPlatforms,
  platformDevelopmentEligible,
  verifiedOwnerReleaseHandoffEligible,
  canonicalTargetStep,
  canonicalTargetWaitingState,
} from '../tools/company-selected-platform-router.mjs';

const nativeItem=(gameId='dual',selectedPlatform='ROBLOX')=>({
  gameId,selectedPlatform,targetPlatform:selectedPlatform,
  productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
  currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'PENDING_DUAL_NATIVE_SOURCE_BIND',
  designBaselineSource:`design/${gameId}/2026-09-21/design-revised.json`,
  minimumDesignContract:{pass:true,source:`design/${gameId}/2026-09-21/design-revised.json`},
  platformDesignProfiles:{
    ROBLOX:{source:`design/${gameId}/2026-09-21/design-revised.json`,jsonPointer:'/content/platformProfiles/ROBLOX'},
    UNITY:{source:`design/${gameId}/2026-09-21/design-revised.json`,jsonPointer:'/content/platformProfiles/UNITY'}
  },
  concurrentTargetPlatforms:['ROBLOX','UNITY'],
  enqueuedAt:'2026-09-21T00:00:00.000Z'
});

test('active selected platforms are Roblox and Unity only',()=>{
  assert.deepEqual(SELECTED_PLATFORMS,['ROBLOX','UNITY']);
  assert.deepEqual(DEFAULT_CONCURRENT_PLATFORMS,['ROBLOX','UNITY']);
  assert.equal(DEVELOPMENT_GAME_WIP_MAX,Number.POSITIVE_INFINITY);
  assert.equal(normalizeSelectedPlatform('unity-android'),'UNITY');
  assert.equal(normalizeSelectedPlatform('uefn'),'FORTNITE_UEFN','legacy alias remains readable');
  assert.equal(resolveSelectedPlatform({targetPlatform:'ROBLOX'}),'ROBLOX');
  assert.equal(canonicalTargetStep(),'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(canonicalTargetWaitingState(),'TARGET_PLATFORM_REPAIR_REQUIRED');
  assert.equal(PLATFORM_EXECUTION_ADAPTERS.FORTNITE_UEFN.existingExecutionPath,null);
});

test('development-confirmed games always normalize to Roblox plus Unity even from stale single-platform state',()=>{
  assert.deepEqual(concurrentTargetPlatforms(nativeItem('a','ROBLOX')),['ROBLOX','UNITY']);
  assert.deepEqual(concurrentTargetPlatforms({...nativeItem('b','UNITY'),concurrentTargetPlatforms:['UNITY']}),['ROBLOX','UNITY']);
});

test('minimum dual-platform design admits both native implementations without Web gates',()=>{
  const item=nativeItem();
  assert.equal(targetPlatformDevelopmentEligible(item),true);
  assert.equal(platformDevelopmentEligible(item,'ROBLOX'),true);
  assert.equal(platformDevelopmentEligible(item,'UNITY'),true);
  assert.equal(platformDevelopmentEligible(item,'FORTNITE_UEFN'),false);
  assert.equal(targetPlatformDevelopmentEligible({...item,minimumDesignContract:{pass:false}}),false);
  assert.equal(targetPlatformDevelopmentEligible({...item,platformDesignProfiles:{ROBLOX:item.platformDesignProfiles.ROBLOX}}),false);
});

test('owner direct development starts from an owner basic baseline without waiting for design admission',()=>{
  const item={...nativeItem('owner-direct','ROBLOX'),
    minimumDesignContract:{pass:false,source:null},
    ownerDirectDevelopment:true,
    ownerDirectDevelopmentAuthority:'OWNER_DIRECTIVE_2026-09-22',
    designBaselineSource:'design/owner-direct/2026-09-22/design-revised.json'
  };
  assert.equal(targetPlatformDevelopmentEligible(item),true);
  assert.equal(platformDevelopmentEligible(item,'ROBLOX'),true);
  assert.equal(platformDevelopmentEligible(item,'UNITY'),true);
  assert.equal(targetPlatformDevelopmentEligible({...item,designBaselineSource:''}),false);
  assert.equal(targetPlatformDevelopmentEligible({...item,ownerDirectDevelopmentAuthority:'VIBE'}),false);
});

test('legacy Web evidence alone cannot admit native development',()=>{
  const item={
    gameId:'legacy-web',selectedPlatform:'UNITY',targetPlatform:'UNITY',
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    webFirstGatePassed:true,webValidationPassedAt:'2026-09-21T00:00:00Z',
    formalImplementationPassed:true,formalImplementationVerdict:'PASS',webStrictScore:100
  };
  assert.equal(targetPlatformDevelopmentEligible(item),false);
});

test('development eligibility is unbounded by internal policy and the caller may request a capacity batch',()=>{
  const rows=Array.from({length:300},(_,i)=>({...nativeItem(`g${String(i).padStart(3,'0')}`,i%2?'ROBLOX':'UNITY'),enqueuedAt:`2026-09-21T00:${String(i%60).padStart(2,'0')}:00Z`}));
  assert.equal(selectTargetPlatformDevelopmentWindow(rows).length,300);
  assert.equal(selectTargetPlatformDevelopmentWindow(rows,30).length,30);
  assert.equal(platformDevelopmentEligible(rows[299],'ROBLOX'),true);
  assert.equal(platformDevelopmentEligible(rows[299],'UNITY'),true);
});

test('verified owner Roblox release handoff remains readable but cannot bypass minimum design admission',()=>{
  const item={
    gameId:'existing-release',selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
    robloxVibe2VerifiedHandoff:{
      verified:true,authority:'vibe2-authoritative-studio-qa-plus-owner-release-intent',
      gameId:'existing-release',requestedReleaseState:'release-confirmed',
      sourceRevision:'a'.repeat(40),sourceTreeSha:'b'.repeat(40),candidateSha:'c'.repeat(40),qaRunId:1
    }
  };
  assert.equal(verifiedOwnerReleaseHandoffEligible(item),true);
  assert.equal(targetPlatformDevelopmentEligible(item),false);
});

test('cheap precheck accepts only matching active native source roots',()=>{
  assert.equal(cheapPrecheck({selectedPlatform:'',sourceRevision:'abc',sourcePath:'roblox-games/a'}).pass,false);
  assert.equal(cheapPrecheck({selectedPlatform:'UNITY',sourceRevision:'abc',sourcePath:'unity-games/a'}).pass,true);
  assert.equal(cheapPrecheck({selectedPlatform:'ROBLOX',sourceRevision:'abc',sourcePath:'roblox-games/a'}).pass,true);
});

test('unchanged source fingerprint reuses immutable artifact and resumes exact failure stage',()=>{
  const fingerprint=sourceFingerprint({platform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789'});
  const previous=normalizeCommonEvidence({platform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789',sourceFingerprint:fingerprint,buildOrPackagePassed:true,artifactIdentity:'artifact:unity:123',exactRevision:true,lastSuccessfulStage:'IMMUTABLE_ARTIFACT_BIND',failureStage:'TARGET_PLATFORM_RUNTIME'});
  const plan=createSelectedPlatformExecutionPlan({selectedPlatform:'UNITY',sourceRevision:'0123456789012345678901234567890123456789',sourcePath:'unity-games/game-a',previousEvidence:previous});
  assert.equal(plan.sameFingerprint,true);
  assert.equal(plan.artifactReusable,true);
  assert.equal(plan.buildRequired,false);
  assert.equal(plan.resumeStage,'TARGET_PLATFORM_RUNTIME');
});

test('canary selection and common failure signatures remain deterministic',()=>{
  const sigA=failureSignature({stage:'TARGET_PLATFORM_RUNTIME',code:'STAGE_NOT_PASSED',message:'game-a fail 123'});
  const sigB=failureSignature({stage:'TARGET_PLATFORM_RUNTIME',code:'STAGE_NOT_PASSED',message:'game-b fail 999'});
  assert.equal(sigA,sigB);
  const canary=selectRepresentativeCanary([{gameId:'b',selectedPlatform:'UNITY',failureCount:0},{gameId:'a',selectedPlatform:'UNITY',failureCount:2}]);
  assert.equal(canary.gameId,'a');
});

test('stage recording keeps platform QA evidence independent',()=>{
  let evidence=normalizeCommonEvidence({platform:'ROBLOX',sourceRevision:'abc',sourceFingerprint:'finger',exactRevision:true});
  evidence=recordExecutionStage(evidence,'SINGLE_BUILD_OR_PACKAGE',{passed:true});
  evidence=recordExecutionStage(evidence,'IMMUTABLE_ARTIFACT_BIND',{passed:true,artifactIdentity:'artifact:1'});
  evidence=recordExecutionStage(evidence,'TARGET_PLATFORM_RUNTIME',{passed:true});
  evidence=recordExecutionStage(evidence,'INDEPENDENT_QA',{passed:true});
  evidence=recordExecutionStage(evidence,'REGRESSION',{passed:true});
  assert.equal(evidence.runtimePassed,true);
  assert.equal(evidence.independentQaPassed,true);
  assert.equal(evidence.regressionPassed,true);
  assert.equal(evidence.lastSuccessfulStage,'REGRESSION');
});
