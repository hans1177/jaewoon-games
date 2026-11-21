// 파일명: qa/vibe-visual-runtime-quality.test.mjs
// 역할: 기존 Vibe 그래픽 파이프의 에셋 확보 순서·Golden Scene·primitive lifecycle·visual debt 계약 검증
import test from 'node:test';
import {planVibePresentationAutopilot} from '../assets/vibe-presentation-director.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createVibeArtPipeline,
  createVibeGraphicsProduction,
  GRAPHICS_PRODUCTION_INTERNAL_MODULES,
  createVibeAssetAcquisitionPlan,
  createVibeVisualDebtEntry,
  VIBE_ASSET_ACQUISITION_ORDER,
  VIBE_GOLDEN_SCENE_ROLES,
} from '../assets/vibe-art-pipeline.js';
import {
  auditVibeGoldenSceneEvidence,
  auditVibeRuntimeBeforeAfterComparison,
  auditVibeArtDirectionReview,
  auditVibeRuntimeVisualEvidence,
  auditVibeMobileAssetPerformance,
  assertVibeRuntimeVisualQuality,
  GOLDEN_SCENE_ROLES,
  HIGH_END_GOLDEN_SCENE_ROLES,
} from '../assets/vibe-visual-quality-gate.js';

test('실화면 픽셀 비교 감독은 동일 장면과 원본 해시 검증 및 퇴보 검사를 요구한다',()=>{
  const beforeHash='a'.repeat(64),afterHash='b'.repeat(64);
  const evidence={baselineRevision:'rev-before',candidateRevision:'rev-after',
    before:{source:'roblox-runtime-capture',artifactId:'before.png',candidateRevision:'rev-before',observed:true,reviewed:true,imageSha256:beforeHash},
    after:{source:'roblox-runtime-capture',artifactId:'after.png',candidateRevision:'rev-after',observed:true,reviewed:true,imageSha256:afterHash},
    comparison:{observed:true,reviewed:true,beforeStable:true,afterStable:true,method:'pixel-review',pass:true,visibleRenderDelta:true,
      pixelVerified:true,sameCameraStateLighting:true,pixelReview:{pass:true,beforeSha256:beforeHash,afterSha256:afterHash},regressions:[]}};
  assert.equal(auditVibeRuntimeBeforeAfterComparison(evidence).pass,true);
  const regressed=structuredClone(evidence);
  regressed.comparison.regressions=['UI_CLIPPED'];
  assert.ok(auditVibeRuntimeBeforeAfterComparison(regressed).reasons.includes('before-after-visible-regression-detected'));
  const mismatched=structuredClone(evidence);
  mismatched.comparison.pixelReview.afterSha256=beforeHash;
  assert.ok(auditVibeRuntimeBeforeAfterComparison(mismatched).reasons.includes('before-after-source-bound-pixel-review-required'));
});

test('실화면 퇴보는 기존 소스 책임 위치만 재작업 대상으로 연결한다',()=>{
  const beforeHash='a'.repeat(64),afterHash='b'.repeat(64);
  const base={baselineRevision:'old',candidateRevision:'new',
    before:{source:'roblox-runtime-capture',artifactId:'old.png',candidateRevision:'old',observed:true,reviewed:true,imageSha256:beforeHash},
    after:{source:'roblox-runtime-capture',artifactId:'new.png',candidateRevision:'new',observed:true,reviewed:true,imageSha256:afterHash},
    comparison:{observed:true,reviewed:true,beforeStable:true,afterStable:true,method:'pixel-review',pass:true,visibleRenderDelta:true,
      pixelVerified:true,sameCameraStateLighting:true,pixelReview:{pass:true,beforeSha256:beforeHash,afterSha256:afterHash},
      regressions:['ICON_CLIPPED'],repairTargets:[{issue:'ICON_CLIPPED',sourcePath:'roblox-games/mare-essentia/src/Harbor.lua',
        targetId:'harbor-icon',property:'Size',expectedEffect:'icon stays inside tab',scope:'VISUAL_PRESENTATION_ONLY',preserveGameplayAndSave:true}]}};
  const result=auditVibeRuntimeBeforeAfterComparison(base);
  assert.equal(result.pass,false);
  assert.equal(result.repairTargets.length,1);
  assert.equal(result.repairTargets[0].status,'REQUIRES_EXISTING_FUNCTION_REPAIR_AND_NEW_RUNTIME_CAPTURE');
  const unsafe=structuredClone(base);
  unsafe.comparison.repairTargets[0].sourcePath='../outside.lua';
  const rejected=auditVibeRuntimeBeforeAfterComparison(unsafe);
  assert.equal(rejected.repairTargets.length,0);
  assert.ok(rejected.reasons.includes('before-after-regression-repair-target-missing-or-unsafe:ICON_CLIPPED'));
});

test('자동 재작업은 중복 원인·모호한 책임 함수·게임 상태 속성을 거부한다',()=>{
  const a='a'.repeat(64),b='b'.repeat(64);
  const base={baselineRevision:'old',candidateRevision:'new',
    before:{source:'roblox-runtime-capture',artifactId:'old',candidateRevision:'old',observed:true,reviewed:true,imageSha256:a},
    after:{source:'roblox-runtime-capture',artifactId:'new',candidateRevision:'new',observed:true,reviewed:true,imageSha256:b},
    comparison:{observed:true,reviewed:true,beforeStable:true,afterStable:true,method:'pixel',pass:true,visibleRenderDelta:true,
      pixelVerified:true,sameCameraStateLighting:true,pixelReview:{pass:true,beforeSha256:a,afterSha256:b},
      regressions:['ICON_CLIPPED'],repairTargets:[{issue:'ICON_CLIPPED',sourcePath:'roblox-games/mare-essentia/src/Harbor.lua',
        targetId:'harbor',property:'Size',expectedEffect:'fit tab',scope:'VISUAL_PRESENTATION_ONLY',preserveGameplayAndSave:true}]}};
  const valid=auditVibeRuntimeBeforeAfterComparison(base);
  assert.equal(valid.repairTargets.length,1);
  const unsafe=structuredClone(base);
  unsafe.comparison.repairTargets[0].property='saveData';
  assert.equal(auditVibeRuntimeBeforeAfterComparison(unsafe).repairTargets.length,0);
  const ambiguous=structuredClone(base);
  ambiguous.comparison.repairTargets.push({...ambiguous.comparison.repairTargets[0]});
  assert.equal(auditVibeRuntimeBeforeAfterComparison(ambiguous).repairTargets.length,0);
  const duplicate=structuredClone(base);
  duplicate.comparison.regressions.push('ICON_CLIPPED');
  const result=auditVibeRuntimeBeforeAfterComparison(duplicate);
  assert.equal(result.repairTargets.length,1);
  assert.ok(result.reasons.includes('before-after-regression-repair-target-missing-or-unsafe:ICON_CLIPPED'));
});

function captures(revision='a'.repeat(40)){
  return GOLDEN_SCENE_ROLES.map((role,index)=>({
    role,
    source:'roblox-runtime-capture',
    artifactId:`capture-${index+1}`,
    candidateRevision:revision,
    observed:true,
    reviewed:true,
    comparison:{pass:true},
  }));
}

// Synthetic fixtures exercise evidence validation; these are not live Roblox captures.
function interfaceEvidence(revision){
 return {required:true,pass:true,observed:true,reviewed:true,captures:['PORTRAIT','LANDSCAPE'].map((orientation,index)=>({
  orientation,viewport:index?{width:844,height:390}:{width:393,height:852},
  source:'roblox-runtime-capture',runtimeScreenshot:true,artifactId:'fixture-'+orientation,
  candidateRevision:revision,imageSha256:String(index+1).repeat(64),reviewed:true,
  pixelReview:{pass:true,imageSha256:String(index+1).repeat(64)},touchInputObserved:true,
  safeInsets:{left:0,right:0,top:24,bottom:24},
  elements:[{id:'action',visible:true,interactive:true,hitTestPassed:true,textPresent:true,textFits:true,textReadable:true,rect:{x:16,y:80,width:60,height:52}}]
 }))};
}


test('새로 제작된 GLB는 실게임 모바일 캡처와 60프레임 측정 없이는 그래픽 통과 불가',()=>{
  const rev='7'.repeat(40),assetHash='8'.repeat(64),imageHash='9'.repeat(64);
  const evidence={
    assetGlbSha256:assetHash,
    capture:{source:'roblox-runtime-capture',runtimeScreenshot:true,
      observed:true,reviewed:true,candidateRevision:rev,
      deviceClass:'MOBILE',deviceId:'android-qa',artifactId:'actual-native-scene',
      imageSha256:imageHash,pixelReview:{pass:true,imageSha256:imageHash},
      visibleAssetHashes:[assetHash]},
    measurement:{source:'native-runtime-telemetry',observed:true,reviewed:true,
      candidateRevision:rev,assetGlbSha256:assetHash,deviceId:'android-qa',
      artifactId:'perf-samples',sha256:'a'.repeat(64),
      frameSamplesMs:Array(120).fill(16.7),drawCalls:180,visibleTriangles:80000,memoryPeakMb:280}
  };
  assert.equal(auditVibeMobileAssetPerformance(evidence,rev).pass,true);
  for(const invalid of [
    {...evidence,capture:{...evidence.capture,visibleAssetHashes:['0'.repeat(64)]}},
    {...evidence,measurement:{...evidence.measurement,frameSamplesMs:Array(12).fill(16)}},
    {...evidence,measurement:{...evidence.measurement,frameSamplesMs:Array(120).fill(40)}},
    {...evidence,measurement:{...evidence.measurement,drawCalls:500}},
    {...evidence,measurement:{...evidence.measurement,assetGlbSha256:'0'.repeat(64)}},
    {...evidence,capture:{...evidence.capture,deviceId:'unrelated-device'}}
  ])assert.equal(auditVibeMobileAssetPerformance(invalid,rev).pass,false);
  const pending=createVibeGraphicsProduction({
    gameId:'mare-essentia',request:'마을 에셋 검증',target:'roblox',
    candidateRevision:rev,assetProductionPlan:{
      kind:'vibe2-asset-production-plan',
      automaticAssetBindingWork:{preparedNativeImportCount:1,
        targets:[{status:'NATIVE_IMPORT_AND_RUNTIME_QA_REQUIRED',artifactHash:assetHash}]}
    },runtimeEvidence:{stage:'INTERNAL_PLAYTEST',candidateRevision:rev,captures:captures(rev)}
  });
  assert.equal(pending.nativeMobileQaRequired,true);
  assert.deepEqual([...pending.pendingNativeAssetHashes],[assetHash]);
  assert.equal(pending.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.ok(pending.runtimeAudit.reasons.includes('native-mobile-asset-performance-evidence-missing-or-failed'));
  assert.ok(pending.runtimeRepairLoop.defects.some(item=>item.surface==='MOBILE_NATIVE_ASSET'));
  // 모바일 측정만으로 제작 모델의 게임 적용을 승인해서는 안 된다.
  const fakeMobileOnly=createVibeGraphicsProduction({
    gameId:'mare-essentia',request:'3D 에셋 게임 적용 검증',target:'roblox',
    candidateRevision:rev,sourceRevision:'b'.repeat(40),
    assetProductionPlan:{
      kind:'vibe2-asset-production-plan',
      automaticAssetBindingWork:{targets:[{
        status:'NATIVE_IMPORT_AND_RUNTIME_QA_REQUIRED',assetId:'derived-roblox-mare-essentia-prop-a',
        artifactHash:assetHash,sourceBound:true
      }]}
    },runtimeEvidence:{
      stage:'INTERNAL_PLAYTEST',candidateRevision:rev,captures:captures(rev),
      mobileAssetPerformances:[evidence]
    }
  });
  assert.equal(fakeMobileOnly.runtimeAudit.pass,true,'performance observations alone pass the mobile budget');
  assert.equal(fakeMobileOnly.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.equal(fakeMobileOnly.runtimeRepairLoop.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.ok(fakeMobileOnly.nativeImportRepairTargets.some(row=>
    row.findings.includes('PREPARED_NATIVE_ASSET_EXACT_RUNTIME_MODEL_NOT_OBSERVED')));
  const invalidHash=createVibeGraphicsProduction({
    gameId:'mare-essentia',request:'네이티브 출처 누락 차단',target:'roblox',
    assetProductionPlan:{kind:'vibe2-asset-production-plan',
      automaticAssetBindingWork:{targets:[{
        status:'NATIVE_IMPORT_AND_RUNTIME_QA_REQUIRED',assetId:'broken-asset',artifactHash:'wrong'
      }]}},
    runtimeEvidence:{stage:'INTERNAL_PLAYTEST',candidateRevision:rev,captures:captures(rev)}
  });
  assert.equal(invalidHash.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.equal(invalidHash.spatial3dApplication.nativeImportIncompleteHash,true);
  assert.ok(invalidHash.nativeImportRepairTargets[0].findings.includes('PREPARED_NATIVE_ASSET_ID_OR_HASH_INVALID'));
  const mobilePass=auditVibeRuntimeVisualEvidence({
    candidateRevision:rev,captures:captures(rev),mobileAssetPerformanceRequired:true,
    mobileAssetHashesRequired:[assetHash],mobileAssetPerformances:[evidence]
  });
  assert.equal(mobilePass.mobileAssetPerformance.pass,true);
  assert.equal(mobilePass.pass,true);
});

test('art pipeline requires CC0 acquisition and golden scenes without primitive fallback',()=>{
  const plan=createVibeArtPipeline({request:'로블록스 카툰 캐릭터 그래픽 고퀄 개선',target:'roblox',quality:2});
  assert.deepEqual([...plan.assetAcquisition.order],[...VIBE_ASSET_ACQUISITION_ORDER]);
  assert.equal(plan.assetAcquisition.primitiveFallbackAllowed,false);
  assert.equal(plan.runtimeVisualAcceptance.actualRuntimeCaptureRequired,true);
  assert.deepEqual([...plan.runtimeVisualAcceptance.goldenSceneRoles],[...VIBE_GOLDEN_SCENE_ROLES]);
  assert.equal(plan.policy.goldenSceneRuntimeEvidenceRequired,true);
  assert.equal(plan.policy.markerOnlyPresentationPassForbidden,true);
});

test('existing games and shared spatial assets require actual native 3D rather than 2.5D',()=>{
  for(const target of ['unity','web','roblox']){
    const plan=createVibeArtPipeline({request:'기존 게임 캐릭터와 세계 3D 재개발',target,quality:2});
    assert.equal(plan.minimumSpatialPresentation.minimumFinalGameplayDimension,'3D');
    assert.equal(plan.minimumSpatialPresentation.twoPointFiveDFinalPassForbidden,true);
    assert.equal(plan.minimumSpatialPresentation.allSpatialGameplayLibraryAssets3dOnly,true);
    assert.equal(plan.minimumSpatialPresentation.realNativeMeshRuntimeProofRequired,true);
    assert.equal(plan.minimumSpatialPresentation.existing2DAction,'MANDATORY_IN_PLACE_NATIVE_3D_REDEVELOPMENT');
    assert.equal(plan.policy.minimumFinalGameplayDimension,'3D');
    assert.ok(plan.implementation.some(item=>item.includes('3D')));
    assert.ok(plan.qa.some(item=>item.includes('실제 3D 메시')));
    assert.ok(plan.steps.some(item=>item.includes('기존 게임을 포함한 모든 최종 게임플레이 월드')));
  }
});

test('asset acquisition prefers CC0 company assets without self-authored fallback',()=>{
  const company=[{id:'verified-cartoon-rig',license:'CC0-1.0'}];
  const plan=createVibeAssetAcquisitionPlan({companyAssets:company,repositoryAssets:[{id:'repo'}],stage:'INTERNAL_PLAYTEST'});
  assert.equal(plan.selectedSource,'VERIFIED_COMPANY_ASSET_AND_RIG_LIBRARY');
  assert.equal(plan.candidates[0].id,'verified-cartoon-rig');
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.primitiveFallbackCreatesVisualDebt,true);
});

test('golden scene audit requires all five actual reviewed runtime captures',()=>{
  const revision='b'.repeat(40);
  const pass=auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:captures(revision)});
  assert.equal(pass.pass,true);
  const missing=auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:captures(revision).slice(0,4)});
  assert.equal(missing.pass,false);
  assert.equal(missing.missing.length,1);
  const marker=captures(revision);
  marker[0]={...marker[0],source:'source-marker',markerOnly:true};
  assert.equal(auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:marker}).pass,false);
});

test('internal playtest rejects unapproved primitive primary actors even with golden scenes',()=>{
  const revision='c'.repeat(40);
  const result=auditVibeRuntimeVisualEvidence({
    stage:'INTERNAL_PLAYTEST',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[
      {id:'player',presentation:'rigged-mesh'},
      {id:'wolf',presentation:'primitive-placeholder',placeholder:true},
    ],
  });
  assert.equal(result.pass,false);
  assert.equal(result.releaseAuthority,false);
  assert.equal(result.standaloneReleaseBlocker,false);
  assert.equal(result.graphicsPassMeaning,'VERIFIED_CHECKPOINT_NOT_TERMINAL_COMPLETION');
  assert.deepEqual([...result.primitiveViolations],['wolf']);
  assert.throws(()=>assertVibeRuntimeVisualQuality({
    stage:'INTERNAL_PLAYTEST',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[{id:'wolf',presentation:'part-placeholder'}],
  }),/런타임 그래픽 품질 게이트 차단/);
});

test('final graphics cannot pass with unresolved high visual debt',()=>{
  const revision='d'.repeat(40);
  const debt=createVibeVisualDebtEntry({id:'wolf-placeholder',role:'enemy',reason:'temporary primitive'});
  const result=auditVibeRuntimeVisualEvidence({
    stage:'FINAL',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[{id:'player',presentation:'rigged-mesh'},{id:'wolf',presentation:'mesh'}],
    visualDebt:[debt],
  });
  assert.equal(result.pass,false);
  assert.ok(result.reasons.includes('unresolved-critical-visual-debt'));
});


test('high-end target-frame role set extends the existing golden scene contract without replacing it',()=>{
  assert.equal(HIGH_END_GOLDEN_SCENE_ROLES.length,7);
  for(const role of GOLDEN_SCENE_ROLES)assert.ok(HIGH_END_GOLDEN_SCENE_ROLES.includes(role));
  assert.ok(HIGH_END_GOLDEN_SCENE_ROLES.includes('KEY_LANDMARK_OR_HUB'));
  assert.ok(HIGH_END_GOLDEN_SCENE_ROLES.includes('BOSS_OR_SIGNATURE_ENCOUNTER'));
});


test('runtime before-after comparison requires two distinct stable actual runtime captures',()=>{
  const base='1'.repeat(40),candidate='2'.repeat(40);
  const evidence={
    baselineRevision:base,candidateRevision:candidate,
    before:{source:'runtime-capture',artifactId:'actions-artifact:visual:before.png',candidateRevision:base,observed:true,reviewed:true},
    after:{source:'runtime-capture',artifactId:'actions-artifact:visual:after.png',candidateRevision:candidate,observed:true,reviewed:true},
    comparison:{pass:true,visibleRenderDelta:true,beforeStable:true,afterStable:true,observed:true,reviewed:true,method:'dual-headless-browser-sha256-v1'}
  };
  const pass=auditVibeRuntimeBeforeAfterComparison(evidence);
  assert.equal(pass.pass,true);
  assert.equal(pass.visibleRenderDelta,true);
  const markerOnly=auditVibeRuntimeBeforeAfterComparison({...evidence,before:{...evidence.before,source:'source-marker',markerOnly:true}});
  assert.equal(markerOnly.pass,false);
  assert.ok(markerOnly.reasons.includes('marker-only-runtime-comparison-forbidden'));
  const unstable=auditVibeRuntimeBeforeAfterComparison({...evidence,comparison:{...evidence.comparison,beforeStable:false}});
  assert.equal(unstable.pass,false);
  assert.ok(unstable.reasons.includes('runtime-capture-not-deterministic'));
});


test('declared interface and scene object gaps become localized runtime repair targets',()=>{
  const revision='e'.repeat(40);
  const result=auditVibeRuntimeVisualEvidence({
    stage:'INTERNAL_PLAYTEST',candidateRevision:revision,captures:captures(revision),
    primaryActors:[{id:'player',presentation:'rigged-mesh'}],
    requiredInterfaceSurfaces:['HUD','MINIMAP','INTERACTION'],
    interfaceCoverage:{
      HUD:interfaceEvidence(revision),
      MINIMAP:{required:true,pass:false,observed:true,reviewed:true},
      INTERACTION:interfaceEvidence(revision)
    },
    sceneObjectCoverage:{
      requirements:[{id:'village-shop',required:true},{id:'quest-board',required:true}],
      observations:[{id:'village-shop',observed:true,reviewed:true,bound:true,pass:true}]
    }
  });
  assert.equal(result.pass,false);
  assert.deepEqual([...result.interfaceCoverage.missing],['MINIMAP']);
  assert.deepEqual([...result.sceneObjectCoverage.missing],['quest-board']);
  assert.ok(result.reasons.includes('declared-interface-runtime-evidence-incomplete'));
  assert.ok(result.reasons.includes('declared-scene-object-runtime-evidence-incomplete'));
  assert.ok(result.repairTargets.some(row=>row.surface==='INTERFACE'&&row.id==='MINIMAP'));
  assert.ok(result.repairTargets.some(row=>row.surface==='SCENE_OBJECT'&&row.id==='quest-board'));
});

test('graphics production binds character identity environment detail and runtime repair loop inside one root',()=>{
  const production=createVibeGraphicsProduction({
    gameId:'demo',request:'로블록스 캐릭터와 마을을 더 디테일하게',target:'roblox',quality:2,
    game:{gameplay:'exploration',world:'village'},world:{theme:'fantasy'},
    characters:[{name:'Hero',role:'player',body:'humanoid'}],
    characterEvents:{Hero:['idle','move','attack','hit','death']},
    mapDetailInput:{
      sketch:{sourceId:'map',sourceHash:'sha256:map',metersPerUnit:1,
        nodes:[{id:'START',role:'spawn'},{id:'SHOP',role:'landmark'},{id:'EXIT',role:'transition'}],
        edges:[{from:'START',to:'SHOP'},{from:'SHOP',to:'EXIT'}],
        districts:[{id:'market',anchorNodeId:'SHOP',function:'commerce',landmark:'shop'}]},
      assets:[],styleFamily:'STYLIZED_FANTASY',seed:'demo'
    }
  });
  assert.equal(GRAPHICS_PRODUCTION_INTERNAL_MODULES.environmentDirector,'assets/vibe-environment-director.js');
  assert.equal(GRAPHICS_PRODUCTION_INTERNAL_MODULES.characterIdentity,'assets/vibe-character-identity-director.js');
  assert.equal(production.characterIdentity.plans.length,1);
  assert.equal(production.mapDetail.status,'DETAIL_AUTHORING_PLAN');
  assert.equal(production.runtimeRepairLoop.status,'RUNTIME_EVIDENCE_PENDING');
  assert.equal(production.engineMeasurementCapture.required,true);
  assert.equal(production.policy.runtimeVisualRepairLoopRequired,true);
  assert.equal(production.policy.declaredInterfaceSurfacesRequireMobileRuntimeEvidence,true);
});


test('graphics production requires actual GLB-to-game-to-runtime binding evidence',()=>{
  const sourceRevision='a'.repeat(40),candidateRevision='b'.repeat(40),sourceHash='c'.repeat(64);
  const model={id:'forest-boss',sourcePath:'assets/forest/boss.glb',sourceHash,
    licenseVerified:true,visualContentReviewed:true,
    gameBinding:{sourceRevision,sceneObjectId:'forest-boss',sourceHash,modelAssetId:'123456'}};
  const planned=createVibeGraphicsProduction({gameId:'forest',request:'숲 보스 3D 모델 실제 연결 검사',target:'roblox',
    sourceRevision,candidateRevision,spatialAssets:[model]});
  assert.equal(planned.spatial3dApplication.requiredCount,1);
  assert.equal(planned.spatial3dApplication.runtimeLinkedCount,0);
  assert.ok(planned.spatial3dApplication.items[0].issues.includes(
    'INDEPENDENT_3D_RUNTIME_BINDING_EVIDENCE_REQUIRED'));
  assert.equal(planned.status,'GRAPHICS_PRODUCTION_ACTIVE');
  const fake=createVibeGraphicsProduction({gameId:'forest',request:'숲 보스 3D 모델 실제 연결 검사',target:'roblox',
    sourceRevision,candidateRevision,
    spatialAssets:[{...model,sourcePath:'assets/forest/boss.png',sourceHash:'wrong'}]});
  assert.ok(fake.spatial3dApplication.items[0].issues.includes('REAL_MASTER_GLB_SOURCE_REQUIRED'));
  assert.ok(fake.spatial3dApplication.items[0].issues.includes('SOURCE_SHA256_REQUIRED'));
  assert.equal(fake.spatial3dApplication.runtimeLinkedCount,0);
});

test('3D runtime proof is bound to one observed model in an exact golden-scene capture',()=>{
  const sourceRevision='1'.repeat(40),candidateRevision='2'.repeat(40),sourceHash='3'.repeat(64),imageSha256='4'.repeat(64);
  const model={id:'forest-boss',sourcePath:'assets/forest/boss.glb',sourceHash,
    licenseVerified:true,visualContentReviewed:true,
    gameBinding:{sourceRevision,sceneObjectId:'forest-boss',sourceHash,modelAssetId:'123456'}};
  // 합성 증거는 검증 계약만 시험한다. 실제 로블록스 플레이 증거가 아니다.
  const screenshots=captures(candidateRevision).map((row,index)=>index===1?{
    ...row,runtimeScreenshot:true,imageSha256,visibleSceneObjectIds:['forest-boss']
  }:row);
  const observation={sceneObjectId:'forest-boss',sourceRevision,candidateRevision,
    modelSourceHash:sourceHash,nativeModelIdentity:'123456',
    captureArtifactId:screenshots[1].artifactId,captureSha256:imageSha256,
    nativeTriangleCount:128,bindingObserved:true,realRuntimeCapture:true,
    perspectiveDepthConfirmed:true,sceneObjectVisibilityObserved:true};
  const make=(values={})=>createVibeGraphicsProduction({
    gameId:'forest',request:'실제 3D 숲 보스 연결 검증',target:'roblox',
    sourceRevision,candidateRevision,spatialAssets:[model],
    runtimeEvidence:{stage:'INTERNAL_PLAYTEST',candidateRevision,
      captures:screenshots,spatial3dObservations:[observation],...(values||{})}
  });
  const observed=make();
  assert.equal(observed.spatial3dApplication.runtimeLinkedCount,1);
  assert.equal(observed.status,'GRAPHICS_PASS');
  assert.equal(observed.runtimeRepairLoop.status,'VERIFIED_CHECKPOINT');
  for(const broken of [
    {...observation,captureSha256:'f'.repeat(64)},
    {...observation,captureArtifactId:'unrelated-capture'},
    {...observation,nativeModelIdentity:'different-model'},
    {...observation,sceneObjectVisibilityObserved:false},
    {...observation,nativeTriangleCount:0}
  ]){
    const result=make({spatial3dObservations:[broken]});
    assert.equal(result.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
    assert.equal(result.spatial3dApplication.runtimeLinkedCount,0);
    assert.equal(result.runtimeRepairLoop.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
    assert.equal(result.runtimeRepairLoop.defects[0].surface,'SPATIAL_3D');
    assert.equal(result.runtimeRepairLoop.defects[0].responsibleExistingStage,
      'RUNTIME_VISUAL_QA_AND_BEFORE_AFTER_REGRESSION');
  }
  const noScreenshot=make({captures:captures(candidateRevision)});
  assert.equal(noScreenshot.spatial3dApplication.runtimeLinkedCount,0);
  assert.equal(noScreenshot.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
});

test('3D missing runtime proof schedules existing responsible stages without new workflow',()=>{
  const sourceRevision='1'.repeat(40),sourceHash='3'.repeat(64);
  const model={id:'missing-boss',sourcePath:'assets/forest/boss.glb',sourceHash,
    licenseVerified:true,visualContentReviewed:true,
    gameBinding:{sourceRevision,sceneObjectId:'missing-boss',sourceHash,modelAssetId:'123456'}};
  const plan=createVibeGraphicsProduction({
    gameId:'forest',request:'기존 3D 몬스터 화면 연결',target:'roblox',
    sourceRevision,spatialAssets:[model]
  });
  assert.equal(plan.status,'GRAPHICS_PRODUCTION_ACTIVE');
  assert.equal(plan.runtimeRepairLoop.status,'RUNTIME_EVIDENCE_PENDING');
  assert.equal(plan.runtimeRepairLoop.defects.length,1);
  assert.equal(plan.runtimeRepairLoop.defects[0].responsibleExistingStage,
    'RUNTIME_VISUAL_QA_AND_BEFORE_AFTER_REGRESSION');
  assert.equal(plan.queue.siblingTopLevelGraphicsTasksForbidden,true);
});

test('mobile visual audit rejects stale, thumbnail, unreviewed, clipped and overlapping evidence',()=>{
 const revision='f'.repeat(40);
 const audit=(row)=>auditVibeRuntimeVisualEvidence({stage:'INTERNAL_PLAYTEST',candidateRevision:revision,captures:captures(revision),requiredInterfaceSurfaces:['HUD'],interfaceCoverage:{HUD:row}});
 assert.equal(audit(interfaceEvidence(revision)).pass,true);
 const mutations=[
  row=>delete row.captures,
  row=>row.captures.pop(),
  row=>row.captures[0].candidateRevision='old',
  row=>row.captures[0].source='roblox-thumbnail-api',
  row=>row.captures[0].runtimeScreenshot=false,
  row=>row.captures[0].pixelReview.imageSha256='0'.repeat(64),
  row=>row.captures[0].touchInputObserved=false,
  row=>delete row.captures[0].safeInsets,
  row=>row.captures[0].elements[0].rect.width=32,
  row=>row.captures[0].elements[0].rect.y=0,
  row=>row.captures[0].elements[0].textFits=false,
  row=>row.captures[0].elements.push({...row.captures[0].elements[0],id:'dialog'}),
 ];
 for(const mutate of mutations){
  const row=interfaceEvidence(revision);mutate(row);const result=audit(row);
  assert.equal(result.pass,false,String(mutate));
  assert.deepEqual([...result.interfaceCoverage.missing],['HUD']);
  assert.ok(result.repairTargets[0].findings.length>0);
 }
 const stale=captures(revision);delete stale[0].candidateRevision;
 assert.equal(auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:stale}).pass,false);
});

// Existing Vibe QA must not interpret native asset registration as verified rendering.
test('all games flag unverified native character and NPC bindings for existing visual repair',()=>{
  const rev='a'.repeat(40);
  const base={candidateRevision:rev,captures:captures(rev),stage:'INTERNAL_PLAYTEST'};
  const failed=auditVibeRuntimeVisualEvidence({...base,primaryActors:[{id:'VillageChief',presentation:'native-model',nativeActorBindingState:'BOUND_UNVERIFIED'}]});
  assert.equal(failed.pass,false);
  assert.ok(failed.reasons.includes('primary-actor-native-binding-not-verified'));
  assert.deepEqual([...failed.actorBindingFailures],['VillageChief']);
  assert.equal(failed.repairTargets.find(row=>row.id==='VillageChief')?.scope,'VISUAL_AND_MOTION_ONLY');
  assert.equal(failed.repairTargets.find(row=>row.id==='VillageChief')?.preserveGameplayAndSave,true);
  const missing=auditVibeRuntimeVisualEvidence({...base,primaryActors:[{id:'NPC2',presentation:'native-model',nativeActorMissing:true}]});
  assert.ok(missing.actorBindingFailures.includes('NPC2'));
  const verified=auditVibeRuntimeVisualEvidence({...base,primaryActors:[{id:'VillageChief',presentation:'native-model',nativeActorBindingState:'VERIFIED'}]});
  assert.deepEqual([...verified.actorBindingFailures],[]);
});

// 웹게임: 모바일 GPU 해상도 조절은 시각 출력만 건드리고 기존 게임 루프를 유지한다.
test('existing native 3D Web games cap mobile pixel work without altering game loops or persistence',()=>{
  for(const [id,loop] of [
    ['realistic-builder','animate'],
    ['village-dungeons','animate'],
    ['amusement-tycoon','loop']
  ]){
    const html=fs.readFileSync(path.join('web-games',id,'index.html'),'utf8');
    assert.match(html,/new THREE\.WebGLRenderer\(/,id+': actual 3D renderer required');
    assert.match(html,/window\.matchMedia\('\(pointer: coarse\)'\)\.matches/,id+': mobile detection required');
    assert.match(html,/mobileRender\?1:/,id+': mobile initial DPR must be capped at 1');
    assert.match(html,/measuredFps<42\?Math\.max\(\.75,renderRatio-\.15\)/,id+': slow render reduces pixel count');
    assert.match(html,/measuredFps>56\?Math\.min\(maxRenderRatio,renderRatio\+\.1\)/,id+': recovery never exceeds original DPR cap');
    assert.match(html,/if\(!document\.hidden\)/,id+': hidden page must skip draw');
    assert.equal((html.match(/renderer\.render\(scene,camera\)/g)||[]).length,1,id+': use original render loop only');
    assert.match(html,new RegExp('requestAnimationFrame\\('+loop+'\\)'),id+': original game loop retained');
    assert.match(html,/localStorage/,id+': saved game semantics retained');
    assert.doesNotMatch(html,/renderer\.shadowMap\.enabled\s*=\s*true/,id+': no additional shadow-map cost');
  }
});
  
// Changed PR files are now scoped by the exact-head paginated GitHub files API.
// Preserve main push full checks, prohibit stale/partial scope, and keep browser QA.
test('PR changed Web game scope uses exact-head API without giant checkout',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-core-qa.yml','utf8');
  assert.match(workflow,/if: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(workflow,/pull-requests: read/);
  assert.match(workflow,/VIBE2_CORE_QA_PR_FILES_API=PASS/);
  assert.match(workflow,/CORE_SCOPE_STALE_HEAD/);
  assert.match(workflow,/CORE_SCOPE_STALE_OR_PARTIAL_PR_FILES/);
  assert.match(workflow,/CORE_SCOPE_GITHUB_API_FAILED/);
  assert.match(workflow,/EXPECTED_PR_HEAD:/);
  assert.match(workflow,/before\.head\?\.sha!==head/);
  assert.match(workflow,/after\.head\?\.sha!==head/);
  assert.match(workflow,/files\.length!==after\.changed_files/);
  assert.match(workflow,/new Set\(files\)\.size!==files\.length/);
  assert.match(workflow,/git diff --name-only "\$base_sha" HEAD/);
  assert.match(workflow,/changed_web_games=ALL/);
  assert.match(workflow,/Development Web browser startup smoke/);
});


// Synthetic pixel/revision fixtures verify evidence contracts, not subjective art quality.
function aestheticFixture(){
  const baselineRevision='1'.repeat(40),candidateRevision='2'.repeat(40);
  const baselineCapture={source:'runtime-capture',runtimeScreenshot:true,observed:true,reviewed:true,
    artifactId:'baseline-scene',revision:baselineRevision,imageSha256:'a'.repeat(64)};
  const selectedCapture={source:'runtime-capture',runtimeScreenshot:true,observed:true,reviewed:true,
    artifactId:'candidate-scene',revision:candidateRevision,imageSha256:'b'.repeat(64)};
  return {
    required:true,baselineRevision,candidateRevision,baselineCapture,selectedCapture,
    comparisonObserved:true,comparisonReviewed:true,sameCameraStateLighting:true,
    comparisonMethod:'same-seed-game-camera-frame-pixel-critique',
    findings:[{
      id:'empty-forest-depth',axis:'SPATIAL_DEPTH_AND_SCALE',
      observation:'the middle ground is empty while foreground trees repeat at the same height',
      region:{x:.1,y:.2,width:.5,height:.55},
      before:{observed:true,reviewed:true,imageSha256:baselineCapture.imageSha256,severity:3},
      after:{observed:true,reviewed:true,imageSha256:selectedCapture.imageSha256,severity:1},
      repair:{sourcePath:'roblox-games/survival/client/Game.client.luau',
        targetId:'forestSetDressing',property:'treeSpacingAndScale',action:'vary-height-and-depth',
        expectedEffect:'clear foreground-middle-ground separation without obscuring the path'}
    }]
  };
}
test('observed aesthetic improvement requires spatial finding with exact pixel and source owner',()=>{
  const review=auditVibeArtDirectionReview(aestheticFixture());
  assert.equal(review.pass,true);
  assert.equal(review.observedImprovements,1);
  assert.equal(review.repairTargets.length,0);
  assert.equal(review.gameplayMutationAllowed,false);
  const scene=aestheticFixture();
  const runtime=auditVibeRuntimeVisualEvidence({stage:'INTERNAL_PLAYTEST',candidateRevision:scene.candidateRevision,
    captures:captures(scene.candidateRevision),artDirectionReview:scene});
  assert.equal(runtime.pass,true);
  assert.equal(runtime.artDirectionReview.pass,true);
});
test('visible render difference does not close unresolved aesthetics or ungrounded repairs',()=>{
  const unchanged=aestheticFixture();
  unchanged.findings[0].after.severity=3;
  const failed=auditVibeArtDirectionReview(unchanged);
  assert.equal(failed.pass,false);
  assert.ok(failed.reasons.includes('art-direction-observed-quality-improvement-required'));
  assert.ok(failed.repairTargets[0].sourcePath.endsWith('/Game.client.luau'));
  const scene=aestheticFixture();
  scene.findings[0].repair.sourcePath='../../unrelated-save.lua';
  assert.ok(auditVibeArtDirectionReview(scene).reasons.some(reason=>reason.startsWith('art-direction-finding-unverified')));
  const runtime=auditVibeRuntimeVisualEvidence({stage:'INTERNAL_PLAYTEST',candidateRevision:unchanged.candidateRevision,
    captures:captures(unchanged.candidateRevision),artDirectionReview:unchanged});
  assert.equal(runtime.pass,false);
  assert.ok(runtime.reasons.includes('art-direction-visible-quality-unverified'));
  assert.equal(runtime.repairTargets[0].surface,'ART_DIRECTION');
});
test('independent visual candidate comparison is screenshot-bound and rejects weaker winner',()=>{
  const review=aestheticFixture();
  review.competitionRequired=true;
  review.selectedCandidateId='winner';
  review.candidates=[{id:'loser-a',revision:'3'.repeat(40),capture:{
    ...review.selectedCapture,artifactId:'option-1',revision:'3'.repeat(40),imageSha256:'c'.repeat(64)},reviewed:true,score:65},
    {id:'winner',revision:review.candidateRevision,capture:review.selectedCapture,reviewed:true,score:85},
    {id:'loser-b',revision:'4'.repeat(40),capture:{
      ...review.selectedCapture,artifactId:'option-2',revision:'4'.repeat(40),imageSha256:'d'.repeat(64)},reviewed:true,score:73}];
  assert.equal(auditVibeArtDirectionReview(review).pass,true);
  review.candidates[1].score=60;
  assert.ok(auditVibeArtDirectionReview(review).reasons.includes('art-direction-selection-not-best-observed-candidate'));
  review.candidates[1].score=85;
  review.candidates[2].capture.imageSha256='b'.repeat(64);
  assert.equal(auditVibeArtDirectionReview(review).pass,false);
});
test('graphics root returns exact visual-repair instructions without a second production pipeline',()=>{
  const review=aestheticFixture();
  review.findings[0].after.severity=2;
  const production=createVibeGraphicsProduction({
    gameId:'survival',request:'로블록스 숲 게임 그래픽 시각적 완성도 개선',target:'roblox',
    game:{genre:'survival'},runtimeEvidence:{stage:'INTERNAL_PLAYTEST',
      candidateRevision:review.candidateRevision,captures:captures(review.candidateRevision),
      artDirectionReview:review}
  });
  assert.equal(production.kind,'GRAPHICS_PRODUCTION');
  assert.equal(production.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.equal(production.runtimeRepairLoop.artDirectionReview.pass,false);
  assert.equal(production.runtimeRepairLoop.preciseArtDirectionRepairTargets.length,1);
  assert.equal(production.runtimeRepairLoop.preciseArtDirectionRepairTargets[0].property,'treeSpacingAndScale');
  assert.equal(production.runtimeRepairLoop.gameplaySaveBalanceMutationForbidden,true);
});

// CC0 원본이 없을 때 자체 제작으로 돌아가거나 보류 게임을 수정하지 않는다.
test('non-CC0 candidates cannot bypass CC0 selection through the company tier',()=>{
  const plan=createVibeAssetAcquisitionPlan({
    companyAssets:[{id:'old-self-authored',license:'project-original'},{id:'other-license',license:'CC-BY'}],
    repositoryAssets:[{id:'cc0-source',license:'CC0'}],stage:'PROTOTYPE'
  });
  assert.equal(plan.selectedSource,'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET');
  assert.deepEqual(plan.candidates.map(row=>row.id),['cc0-source']);
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.cc0OriginalModificationRequired,true);
  assert.equal(plan.inactiveGamesMustRemainUnchanged,true);
});
test('missing or quarantined CC0 source leaves an acquisition gap instead of generating art',()=>{
  const assets=[{id:'missing-license'},{id:'blocked',license:'CC0',quarantined:true}];
  const snapshot=JSON.stringify(assets);
  const plan=createVibeAssetAcquisitionPlan({companyAssets:assets,stage:'PROTOTYPE'});
  assert.equal(plan.selectedSource,'VERIFIED_CC0_SOURCE_REQUIRED');
  assert.equal(plan.createNewAssetWhenNoVerifiedCandidate,false);
  assert.equal(plan.candidates.length,0);
  assert.equal(JSON.stringify(assets),snapshot);
});

test('game worker acquisition instructions cannot retain create-new fallback',()=>{
  const plan=createVibeArtPipeline({request:'게임 캐릭터 그래픽 개선',target:'web'});
  assert.equal(plan.assetAcquisition.cc0Only,true);
  assert.equal(plan.assetAcquisition.createWhenNoVerifiedCandidate,false);
  assert.equal(plan.assetAcquisition.inactiveGamesMustRemainUnchanged,true);
  assert.ok(!plan.assetAcquisition.order.includes('CREATE_NEW_ASSET'));
});

// 기존 그래픽 제작 루트가 CC0 직업·격투·생물 모션을 직접 받아 쓰고 미검증 상태를 유지한다.
test('graphics floor automatically routes registered creature 60 and elite boss 50 without false native approval',()=>{
  const rigParts=['FORELEGS','HINDLEGS','SPINE','NECK','TAIL','JAWS'];
  const present=Object.fromEntries(rigParts.map(name=>[name,{realJointId:name}]));
  const plan=createVibeGraphicsProduction({
    gameId:'vibe-floor-motion-auto',request:'몬스터 자동개발 모션 디테일 업그레이드',
    target:'roblox',game:{
      genre:'ACTION_RPG',featuredSpeciesId:'WOLF',
      monsters:[
        {speciesId:'WOLF',tier:'ELITE'},
        {speciesId:'SPIDER',tier:'BOSS'},
        {speciesId:'WYVERN',tier:'NORMAL'},
        {speciesId:'WOLF',tier:'ELITE'},
        {speciesId:'INVENTED_MONSTER',tier:'BOSS'}
      ]
    }
  });
  assert.equal(plan.creatureMotionFloor.length,4);
  assert.equal(plan.creatureMotionFloorSummary.registeredCount,4);
  assert.equal(plan.creatureMotionFloorSummary.pendingNativeRigCount,4);
  assert.ok(plan.creatureMotionFloorSummary.unresolvedSpeciesOrTiers.includes('INVENTED_MONSTER'));
  assert.deepEqual(plan.creatureMotionFloor.map(row=>[row.speciesId,row.tier,row.detailMotionCount,row.tierPatternCount]),
    [['WOLF','NORMAL',60,0],['WOLF','ELITE',60,50],['SPIDER','BOSS',60,50],['WYVERN','NORMAL',60,0]]);
  assert.ok(plan.creatureMotionFloor.every(row=>row.status==='BLOCKED_AWAITING_VALID_NATIVE_RIG'
    &&row.runtimeVerified===false&&row.gameplayAuthority===false));
  assert.equal(plan.motionEffects.creatureActions.filter(row=>row.source==='DETAILED_BODY_PLAN_60').length,60);
  const ready=createVibeGraphicsProduction({
    gameId:'native-evidence-probe',target:'roblox',request:'모션 연결',
    game:{genre:'ACTION_RPG',monsters:[{speciesId:'WOLF',tier:'ELITE'}],
      creatureRigBindings:{'WOLF:ELITE':{
        bodyPlan:'QUADRUPED_CANINE',joints:present,
        assetAuthorization:{approved:true,sourceAssetId:'previously-approved-wolf',
          sourceHash:'known-wolf-content-sha',licenseVerified:true,placeAccessVerified:true}
      }}
    }
  });
  // 등록값이 모두 충족돼도 물리적 렌더·네이티브 게시 증명은 아님.
  assert.equal(ready.creatureMotionFloor[0].status,'READY_FOR_NATIVE_BINDING_UNVERIFIED');
  assert.equal(ready.creatureMotionFloor[0].runtimeVerified,false);
  assert.equal(ready.creatureMotionFloorSummary.readyToBindUnverifiedCount,1);
  assert.equal(ready.creatureMotionFloorSummary.automaticNativeRuntimePromotion,false);
  const cannotPublish=createVibeGraphicsProduction({
    gameId:'unsupported',target:'roblox',request:'몬스터 자동 연출',
    game:{genre:'ACTION_RPG',monsters:[{speciesId:'WOLF',tier:'ELITE'}],
      creatureRigBindings:{WOLF:{
        bodyPlan:'QUADRUPED_CANINE',joints:present,
        assetAuthorization:{approved:true,sourceAssetId:'wolf',sourceHash:'hash',licenseVerified:true}
      }}
    }
  });
  assert.ok(cannotPublish.creatureMotionFloor[0].blockers.includes('ROBLOX_PLACE_USE_PERMISSION_MISSING'));
  const dual=createVibeGraphicsProduction({
    gameId:'dual-native-auth',request:'두 네이티브 몬스터 모션 연결',
    target:'dual-native',game:{genre:'ACTION_RPG',monsters:[{speciesId:'WOLF',tier:'ELITE'}],
      creatureRigBindings:{WOLF:{
        bodyPlan:'QUADRUPED_CANINE',joints:present,
        assetAuthorization:{approved:true,sourceAssetId:'wolf',sourceHash:'hash',licenseVerified:true}
      }}
    }
  });
  assert.ok(dual.platforms.includes('ROBLOX'));
  assert.ok(dual.creatureMotionFloor[0].blockers.includes('ROBLOX_PLACE_USE_PERMISSION_MISSING'));
  assert.equal(dual.creatureMotionFloor[0].runtimeVerified,false);
});

test('graphics production wires existing CC0 duel and creature choreography for web and Roblox',()=>{
  for(const target of ['web','roblox']){
    const plan=createVibeGraphicsProduction({
      gameId:'cc0-action-demo',request:'직업 무기 공격 모션과 몬스터 관절 타격감을 강화',
      target,quality:2,game:{genre:'ACTION_RPG',careerId:'SAMURAI'},
      world:{featuredSpeciesId:'WOLF'},characters:[]
    });
    assert.equal(plan.internalModules.motionEffects,'assets/vibe-motion-effects-director.js');
    assert.equal(plan.motionEffects?.cc0PlatformReuse.targetPlatform,target.toUpperCase());
    assert.equal(plan.motionEffects?.cc0PlatformReuse.runtimeBindingVerified,false);
    assert.ok(plan.motionEffects?.combatActions.length>5);
    assert.ok(plan.motionEffects?.creatureActions.length>2);
    assert.ok(plan.motionEffects.combatActions.every(row=>row.nativeRuntimeVerified===false));
    assert.equal(plan.authority.gameplayMutationAllowed,false);
    assert.equal(plan.runtimeRepairLoop.status,'RUNTIME_EVIDENCE_PENDING');
  }
  const unknown=createVibeGraphicsProduction({
    gameId:'unknown',request:'캐릭터 그래픽 개선',target:'web',quality:1,
    game:{genre:'ACTION_RPG',careerId:'UNSUPPORTED'},world:{featuredSpeciesId:'UNKNOWN'}
  });
  assert.equal(unknown.motionEffects?.combatActions.length,0);
  assert.equal(unknown.motionEffects?.creatureActions.length,0);
});

test('graphics root consumes the existing family optimization work without a second pipeline',()=>{
  const handoff={version:1,enabled:true,familyCount:12,requestedFamilyCount:2,
    familyTasks:[{family:'CREATURE',status:'QUEUED_EXISTING_GAME_ASSET_WORKER_UNVERIFIED',runtimeVerified:false}],
    runtimeVerified:false,noNewWorkerQueue:true};
  const production=createVibeGraphicsProduction({
    gameId:'family-asset-hand-off',request:'모든 자산 최적화 연결',target:'roblox',quality:1,
    game:{genre:'ACTION_RPG'},assetProductionPlan:{kind:'vibe2-asset-production-plan',familyAssetOptimization:handoff}
  });
  assert.equal(production.assetProductionPlanBound,true);
  assert.equal(production.familyAssetOptimization,handoff);
  assert.equal(production.familyAssetOptimization.runtimeVerified,false);
  assert.equal(production.queue.siblingTopLevelGraphicsTasksForbidden,true);
  const absent=createVibeGraphicsProduction({
    gameId:'no-asset-production',request:'기존 그래픽 유지',target:'web',
    game:{genre:'ACTION_RPG'}
  });
  assert.equal(absent.familyAssetOptimization,null);
});

test('바이브 엔진 13개 전문팀은 단일 제작 루트에서 무료 원본 검증 후에만 적용 후보를 만든다',async()=>{
  const {VIBE_ENGINE_SPECIALISTS,VIBE_ENGINE_TEAMS,createVibeEngineSpecialistPlan}=await import('../assets/vibe-art-pipeline.js');
  assert.equal(VIBE_ENGINE_SPECIALISTS.length,13);
  assert.deepEqual(VIBE_ENGINE_TEAMS.map(team=>team.id),[
    'vibe-core','vibe-graphics','vibe-world','vibe-motion',
    'vibe-effects','vibe-story','vibe-assets','vibe-research'
  ]);
  assert.equal(new Set(VIBE_ENGINE_TEAMS.flatMap(team=>team.specialists)).size,13);
  const hash='a'.repeat(64);
  const plan=createVibeEngineSpecialistPlan({
    gameId:'mare-essentia',target:'ROBLOX',request:'바이브 엔진 전체 개선',
    assetGaps:[{family:'BUILDING'},{family:'MOTION'}],
    externalCandidates:[
      {id:'cc0-building',family:'BUILDING',license:'CC0',sha256:hash,
        source:'https://example.invalid/free.glb',licenseVerified:true,commercialUseVerified:true},
      {id:'unsafe-model',family:'CREATURE',license:'CC-BY-NC',sha256:hash,
        source:'https://example.invalid/unsafe.glb',licenseVerified:true,commercialUseVerified:false}
    ]
  });
  assert.equal(plan.teams.length,13);
  assert.equal(plan.singleGraphicsRoot,true);
  assert.equal(plan.departments.length,8);
  assert.equal(plan.canonicalRepository,'hans1177/jaewoon-games');
  assert.equal(plan.canonicalMain,'main');
  assert.equal(plan.departments.every(team=>team.independentMain===false&&team.newGitHubOrganization===false),true);
  assert.equal(plan.teams.find(team=>team.id==='ANIMATION').teamId,'vibe-motion');
  assert.equal(plan.webGameAuthoring,false);
  assert.equal(plan.freeCc0Only,true);
  assert.equal(plan.runtimeQaStillRequired,true);
  const building=plan.teams.find(row=>row.id==='BUILDING');
  assert.equal(building.externalSources.length,1);
  assert.equal(building.externalSources[0].status,'VERIFIED_SOURCE_NOT_APPLIED');
  assert.equal(plan.teams.find(row=>row.id==='CREATURE').externalSources.length,0);
  assert.equal(plan.teams.find(row=>row.id==='CREATURE').unsafeOrUnverifiedSourceCount,1);
  assert.equal(plan.teams.find(row=>row.id==='MUSIC').owner,'AUDIO');
  assert.equal(plan.teams.find(row=>row.id==='STORY').owner,'DESIGN');
  assert.equal(plan.teams.every(row=>row.qaAuthority===false),true);
  const root=createVibeGraphicsProduction({gameId:'mare-essentia',target:'roblox',
    request:'캐릭터 건축 음악 모션 UI 고도화',game:{genre:'ACTION_RPG'}});
  assert.equal(root.engineImprovement.singleGraphicsRoot,true);
  assert.equal(root.engineImprovement.runtimeQaStillRequired,true);
  assert.equal(root.status,'GRAPHICS_PRODUCTION_ACTIVE');
});

test('8개 부서별 실제 기존 모듈과 학습영역·연습·증거 체크를 연결하고 새 파이프라인을 만들지 않는다',async()=>{
  const {VIBE_ENGINE_TEAMS,createVibeEngineSpecialistPlan}=await import('../assets/vibe-art-pipeline.js');
  const plan=createVibeEngineSpecialistPlan({gameId:'mare-essentia',
    request:'바이브 엔진 전체 역량 강화',target:'ROBLOX'});
  assert.equal(plan.departments.length,8);
  assert.equal(plan.teams.length,13);
  assert.equal(plan.departments.reduce((sum,team)=>sum+team.practicePlan.length,0),32);
  assert.deepEqual(VIBE_ENGINE_TEAMS.map(team=>team.id),plan.departments.map(team=>team.id));
  for(const team of plan.departments){
    assert.equal(team.activeForCurrentRequest,true);
    assert.equal(team.practicePlan.length,4);
    assert.ok(team.existingModule.startsWith(team.id==='vibe-core'||team.id==='vibe-assets'||team.id==='vibe-research'?'tools/':'assets/'));
    assert.equal(team.trainingDomains.length,3);
    assert.equal(team.requiredEvidence.length,4);
    assert.equal(team.learningRoute,'EXISTING_CANONICAL_VERIFIED_LEARNING_ONLY');
    assert.equal(team.verifiedTrainingSampleGranted,false);
    assert.equal(team.externalAssetUploadAuthorized,false);
    assert.equal(team.newGitHubOrganization,false);
    assert.equal(team.independentMain,false);
    assert.equal(team.gameplaySaveAndBalancePreserved,true);
    assert.ok(team.practicePlan.every(row=>row.status==='PRACTICE_AND_RUNTIME_EVIDENCE_PENDING'));
  }
});

test('요청분야만 훈련 후보로 활성화하고 불필요한 팀·서사 권한을 자동 가동하지 않는다',async()=>{
  const {createVibeEngineSpecialistPlan}=await import('../assets/vibe-art-pipeline.js');
  const plan=createVibeEngineSpecialistPlan({gameId:'mare-essentia',target:'ROBLOX',
    request:'모바일 UI 개선',assetGaps:[]});
  const active=plan.departments.filter(t=>t.activeForCurrentRequest).map(t=>t.id);
  assert.deepEqual(active,['vibe-graphics']);
  assert.equal(plan.departments.find(t=>t.id==='vibe-story').practicePlan.length,0);
  assert.equal(plan.departments.find(t=>t.id==='vibe-research').verifiedTrainingSampleGranted,false);
  const story=createVibeEngineSpecialistPlan({request:'스토리 세계관 설정 정리',target:'ROBLOX'});
  assert.equal(story.departments.find(t=>t.id==='vibe-story').activeForCurrentRequest,true);
  assert.equal(story.departments.find(t=>t.id==='vibe-world').activeForCurrentRequest,false);
});

test('부서 학습은 원본·버전 불일치 증거를 반려하고 적격 데이터도 QA 승인으로 오인하지 않는다',async()=>{
  const {createVibeEngineSpecialistPlan}=await import('../assets/vibe-art-pipeline.js');
  const valid={teamId:'vibe-motion',gameId:'mare-essentia',platform:'ROBLOX',
    sourceRevision:'a'.repeat(40),artifactSha256:'b'.repeat(64),
    observed:true,independentQaPassed:true};
  const plan=createVibeEngineSpecialistPlan({gameId:'mare-essentia',target:'ROBLOX',
    request:'모션 개선',departmentEvidence:[
      valid,{...valid,gameId:'different-game'},
      {...valid,sourceRevision:'old'},
      {...valid,securityBlocked:true},
      {...valid,artifactSha256:'fake'},
      {...valid,independentQaPassed:false}
    ]});
  const motion=plan.departments.find(t=>t.id==='vibe-motion');
  assert.equal(motion.reviewableEvidenceCount,1);
  assert.equal(motion.rejectedOrUnanchoredEvidenceCount,5);
  assert.equal(motion.verifiedTrainingSampleGranted,false);
  assert.equal(motion.status,'DEPARTMENT_CAPABILITY_WORK_PENDING');
  assert.equal(plan.runtimeQaStillRequired,true);
});

test('ChatGPT 원본·CC0 그래픽/모션/음향의 분해 재조합은 권리·부품 해시·리그 호환을 검증한다',async()=>{
  const {createVibeAssetRecompositionPlan,VIBE_RECOMPOSITION_FAMILIES,createVibeGraphicsProduction}
    =await import('../assets/vibe-art-pipeline.js');
  const part=(id,slot,hash,rigProfile='R15')=>({
    id,slot,sha256:hash.repeat(64),rigProfile,
    sourceBytesVerified:true,safeForReuse:true
  });
  const parent=(id,hash,parts,extra={})=>({
    id,origin:'EXTERNAL_CC0',license:'CC0',family:'CHARACTER',sha256:hash.repeat(64),
    licenseVerified:true,commercialUseVerified:true,
    sourceBytesVerified:true,sourceHashVerified:true,components:parts,...extra
  });
  const a=parent('hero','a',[part('helmet','HEAD','1')]);
  const b=parent('donor','b',[part('headgear','HEAD','2')]);
  const c=parent('otherRig','c',[part('rigged','HEAD','3','R6')]);
  const paid=parent('paid','d',[part('paid-head','HEAD','4')],{license:'CC-BY-NC'});
  const injected=parent('chatgpt','e',[part('generated-head','HEAD','5')],{
    origin:'CHATGPT_GENERATED',license:'PROJECT-ORIGINAL',ownerRightsVerified:true
  });
  const unknown=parent('unverified-gpt','f',[part('unknown-head','HEAD','6')],{
    origin:'CHATGPT_GENERATED',license:'PROJECT-ORIGINAL',ownerRightsVerified:false
  });
  const plan=createVibeAssetRecompositionPlan({
    gameId:'mare-essentia',target:'ROBLOX',request:'로블록스 캐릭터 부품 분해 재창조',
    sourceAssets:[a,b,c,paid,injected,unknown]});
  assert.equal(plan.approvedCount,4);
  assert.equal(plan.rejectedCount,2);
  assert.ok(plan.rejectedParents.find(row=>row.id==='paid').reasons.includes('SOURCE_RIGHTS_AND_BINARY_PROOF_REQUIRED'));
  assert.ok(plan.rejectedParents.find(row=>row.id==='unverified-gpt').reasons.includes('CHATGPT_OUTPUT_OWNER_RIGHTS_REVIEW_REQUIRED'));
  assert.ok(plan.recipes.length>0);
  assert.ok(plan.recipes.every(row=>row.baseAssetId!==row.donorAssetId
    &&row.sourceMutation===false&&row.nativeOutputProduced===false
    &&row.gameSourceApplied===false&&row.robloxUploaded===false
    &&row.compatibleRig==='R15'));
  assert.equal(plan.externalFreeModelRouter,'tools/vibe2-gemini-free-rotation.mjs#selectVibe59FreeExperts');
  assert.equal(plan.verifiedLearningOwner,'tools/department-learning-memory.mjs');
  assert.equal(plan.verifiedObservationIsNotModelTraining,true);
  assert.equal(plan.runtimeQaAndOwnerReviewStillRequired,true);
  assert.ok(['MOTION','ANIMATION','AUDIO','MUSIC','SFX','ICON','UI','VFX','BUILDING','ENVIRONMENT','MATERIAL']
    .every(family=>Object.hasOwn(VIBE_RECOMPOSITION_FAMILIES,family)));
  const root=createVibeGraphicsProduction({gameId:'mare-essentia',target:'roblox',
    request:'캐릭터 재창조',game:{genre:'ACTION_RPG'},reconstructionSources:[a,b]});
  assert.ok(root.assetRecomposition.recipes.length>0);
  assert.equal(root.assetRecomposition.noNewQueueOrPipeline,true);
});

test('자가 개선 학습은 자산 결과 실증 증거만 보존하고 자동 승격·코드 변경은 하지 않는다',async()=>{
  const {createVibeAssetRecompositionPlan}=await import('../assets/vibe-art-pipeline.js');
  const source=(id,sha,partId,partSha)=>({
    id,origin:'CHATGPT_GENERATED',license:'PROJECT-ORIGINAL',
    ownerRightsVerified:true,licenseVerified:true,commercialUseVerified:true,
    sourceBytesVerified:true,sourceHashVerified:true,
    family:'MOTION',sha256:sha.repeat(64),
    components:[{id:partId,slot:'POSE',sha256:partSha.repeat(64),
      rigProfile:'R15',sourceBytesVerified:true,safeForReuse:true}]
  });
  const a=source('walk','a','pose-a','1'),b=source('run','b','pose-b','2');
  const first=createVibeAssetRecompositionPlan({gameId:'mare-essentia',
    sourceAssets:[a,b]});
  const recipe=first.recipes[0];
  const evidence={parentAssetId:recipe.baseAssetId,recipeId:recipe.id,
    sourceRevision:'c'.repeat(40),outputSha256:'d'.repeat(64),
    independentQaPassed:true,runtimeObserved:true,rightsVerified:true,
    sourceAndOutputHashesVerified:true};
  const next=createVibeAssetRecompositionPlan({
    gameId:'mare-essentia',sourceAssets:[a,b],
    verifiedObservations:[evidence,{...evidence,parentAssetId:recipe.donorAssetId},{...evidence,outputSha256:'broken'},{...evidence,independentQaPassed:false}]
  });
  assert.equal(next.verifiedObservations.length,1);
  assert.equal(next.rejectedOrUnanchoredObservations,3);
  assert.equal(next.automaticModelWeightUpdate,false);
  assert.equal(next.authority,'GRAPHICS_PRODUCTION_RESEARCH_ADVISORY_ONLY');
  assert.equal(next.recipes[0].status,'COMPOSITION_RECIPE_NEEDS_NATIVE_AUTHORING_AND_RUNTIME_QA');
});

test('부서별 요청은 8개를 기존 엔진에서 가동하고 실제 캡처 전후 비교의 실패를 먼저 보완한다',async()=>{
  const {createVibeEngineSpecialistPlan,createVibeGraphicsProduction}=await import('../assets/vibe-art-pipeline.js');
  const base={teamId:'vibe-motion',gameId:'mare-essentia',platform:'ROBLOX',
    technique:'ROOT_AND_FOOT_PLANT',sourceRevision:'a'.repeat(40),
    artifactSha256:'b'.repeat(64),runtimeCaptureSha256:'c'.repeat(64),
    observed:true,independentQaPassed:true,nativeRuntimeVerified:true,
    runtimeObserved:true,sourceAndOutputHashesVerified:true,
    beforeScore:80,afterScore:55};
  const evidence=[base,{...base,afterScore:100},
    {...base,artifactSha256:'d'.repeat(64),beforeScore:45,afterScore:75},
    {...base,artifactSha256:'e'.repeat(64),gameId:'other'},
    {...base,artifactSha256:'f'.repeat(64),nativeRuntimeVerified:false},
    {...base,artifactSha256:'g'.repeat(64),runtimeCaptureSha256:'invalid'},
    {...base,artifactSha256:'h'.repeat(64),technique:'UNKNOWN_TECHNIQUE'},
    {...base,artifactSha256:'i'.repeat(64),sourceAndOutputHashesVerified:false}];
  const plan=createVibeEngineSpecialistPlan({gameId:'mare-essentia',target:'ROBLOX',
    request:'부서별 역량강화',departmentEvidence:evidence});
  assert.equal(plan.version,2);
  assert.equal(plan.departments.filter(row=>row.activeForCurrentRequest).length,8);
  const motion=plan.departments.find(row=>row.id==='vibe-motion');
  const practice=motion.practicePlan.find(row=>row.technique==='ROOT_AND_FOOT_PLANT');
  assert.equal(motion.scoredRuntimeObservationCount,2);
  assert.equal(practice.scoredRuntimeObservations,2);
  assert.equal(practice.regressionObservations,1);
  assert.equal(practice.improvedObservations,1);
  assert.equal(practice.averageQualityDelta,2.5);
  assert.equal(motion.nextPractice.technique,'ROOT_AND_FOOT_PLANT');
  assert.equal(practice.status,'REPAIR_REGRESSION_AND_REVERIFY');
  assert.equal(motion.verifiedTrainingSampleGranted,false);
  assert.equal(practice.canonicalLearningAccepted,false);
  assert.equal(plan.canonicalLearningGateUnchanged,true);
  const root=createVibeGraphicsProduction({gameId:'mare-essentia',request:'모션 강화',
    target:'ROBLOX',game:{genre:'ACTION_RPG'},departmentEvidence:[base]});
  assert.equal(root.engineImprovement.departments.find(row=>row.id==='vibe-motion').scoredRuntimeObservationCount,1);
  assert.equal(root.status,'GRAPHICS_PRODUCTION_ACTIVE');
});

test('재조합은 도너·원본 해시·플랫폼을 재검증하고 실패 회피를 학습 우선순위에만 반영한다',async()=>{
  const {createVibeAssetRecompositionPlan}=await import('../assets/vibe-art-pipeline.js');
  const source=(id,h,part)=>({id,family:'PROP',origin:'CHATGPT_GENERATED',
    license:'PROJECT-ORIGINAL',ownerRightsVerified:true,licenseVerified:true,
    commercialUseVerified:true,sourceBytesVerified:true,sourceHashVerified:true,
    sha256:h.repeat(64),components:[{id:part,slot:'TOP',sha256:part.repeat(64),
      sourceBytesVerified:true,safeForReuse:true}]});
  const assets=[source('base','a','1'),source('donor','b','2')];
  const initial=createVibeAssetRecompositionPlan({gameId:'port',target:'ROBLOX',sourceAssets:assets});
  const recipe=initial.recipes[0];
  const valid={recipeId:recipe.id,parentAssetId:recipe.baseAssetId,
    donorAssetId:recipe.donorAssetId,gameId:'port',platform:'ROBLOX',
    baseSourceSha256:recipe.parentHashes[0],donorSourceSha256:recipe.parentHashes[1],
    sourceRevision:'c'.repeat(40),outputSha256:'d'.repeat(64),
    independentQaPassed:true,runtimeObserved:true,rightsVerified:true,
    sourceAndOutputHashesVerified:true,nativeRuntimeVerified:true,
    outcome:'FAIL',beforeScore:80,afterScore:55};
  const observations=[valid,{...valid,afterScore:100},
    {...valid,donorSourceSha256:'f'.repeat(64),outputSha256:'e'.repeat(64)},
    {...valid,platform:'UNITY',outputSha256:'f'.repeat(64)},
    {...valid,donorAssetId:'spoofed',outputSha256:'1'.repeat(64)}];
  const plan=createVibeAssetRecompositionPlan({gameId:'port',target:'ROBLOX',
    sourceAssets:assets,verifiedObservations:observations});
  assert.equal(plan.verifiedObservations.length,1);
  assert.equal(plan.rejectedOrUnanchoredObservations,4);
  const result=plan.recipeFeedback.find(row=>row.recipeId===recipe.id);
  assert.equal(result.verifiedFailureReferences,1);
  assert.equal(result.meanQualityDelta,-25);
  assert.equal(result.canonicalLearningAccepted,false);
  assert.equal(result.productionFileVerified,false);
  assert.equal(plan.feedbackChangesPracticeOrderOnly,true);
  assert.equal(plan.automaticModelWeightUpdate,false);
  assert.ok(plan.rankedRecipeIds.includes(recipe.id));
  assert.ok(plan.recipes.every(row=>row.nativeOutputProduced===false&&row.gameSourceApplied===false));
});


// [상용 그래픽 감독] 실제 샘플의 꼬리 지연으로 장식 예산을 조정하되 게임 판정은 보호한다.
test('vibe presentation uses p95 and measured resource pressure, never claims actual renderer mutation',()=>{
  const hash='c'.repeat(64);
  const input={actualRuntime:true,frameMs:16,captureHash:hash,
    frameSamplesMs:[...Array(56).fill(16),...Array(4).fill(90)],
    resources:{source:'native-runtime-telemetry',observed:true,captureHash:hash,
      memoryPeakMb:620,drawCalls:360,visibleTriangles:350000}};
  const plan=planVibePresentationAutopilot({request:'모바일 보스전 연출 개선',performanceTelemetry:input});
  assert.equal(plan.presentationBudget.tier,'CRITICAL');
  assert.equal(plan.presentationBudget.measurementMode,'OBSERVED_P95');
  assert.equal(plan.presentationBudget.p95FrameMs,90);
  assert.equal(plan.presentationBudget.resourcesVerified,true);
  assert.equal(plan.presentationBudget.particlesPerImpact,4);
  assert.equal(plan.presentationBudget.preserveAttackTelegraph,true);
  assert.equal(plan.presentationBudget.preserveHudAndTouchTargets,true);
  assert.equal(plan.presentationBudget.actualRuntimeBudgetApplied,false);
  const missing=planVibePresentationAutopilot({performanceTelemetry:{actualRuntime:false,frameMs:90}});
  assert.equal(missing.presentationBudget.tier,'UNMEASURED');
  assert.equal(missing.presentationBudget.resourcesVerified,false);
});

test('Vibe graphics owner sends observed PBR defects to original material stage and keeps release unverified',()=>{
  const review=aestheticFixture();
  review.findings[0].axis='PBR_ROUGHNESS_METALNESS';
  review.findings[0].after.severity=2;
  const root=createVibeGraphicsProduction({gameId:'graphics-qa',request:'로블록스 재질 실물 품질 개선',
    target:'roblox',game:{genre:'adventure'},runtimeEvidence:{
      stage:'INTERNAL_PLAYTEST',candidateRevision:review.candidateRevision,
      captures:captures(review.candidateRevision),artDirectionReview:review}});
  assert.equal(root.professionalGraphics.owner,'GRAPHICS_PRODUCTION');
  assert.equal(root.professionalGraphics.status,'SOURCE_BOUND_REPAIR_REQUIRED');
  assert.ok(root.professionalGraphics.work.some(row=>
    row.stage==='MATERIAL_LIGHTING_AND_PLATFORM_REAUTHORING'&&row.axis===undefined));
  assert.equal(root.professionalGraphics.actualSourceEditPerformed,false);
  assert.equal(root.professionalGraphics.actualNativeRuntimeVerification,false);
  assert.equal(root.professionalGraphics.noNewQueueOrPipeline,true);
  const telemetry=createVibeGraphicsProduction({gameId:'graphics-qa',request:'모바일 렌더링 조정',
    target:'roblox',engineMeasurementCapture:{automatic:true,sourceHash:'a'.repeat(64),
      captureHash:'b'.repeat(64),frameMs:16,frameSamplesMs:Array(60).fill(70)}});
  assert.equal(telemetry.professionalGraphics.measuredPresentationBudget.tier,'CRITICAL');
  assert.equal(telemetry.professionalGraphics.status,'RUNTIME_CAPTURE_REQUIRED');
});
