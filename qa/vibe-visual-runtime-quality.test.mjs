// 파일명: qa/vibe-visual-runtime-quality.test.mjs
// 역할: 기존 Vibe 그래픽 파이프의 에셋 확보 순서·Golden Scene·primitive lifecycle·visual debt 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
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
  auditVibeRuntimeVisualEvidence,
  auditVibeWeb25D,
  assertVibeRuntimeVisualQuality,
  GOLDEN_SCENE_ROLES,
  HIGH_END_GOLDEN_SCENE_ROLES,
} from '../assets/vibe-visual-quality-gate.js';

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

test('art pipeline uses verified asset acquisition before primitive fallback and requires golden scenes',()=>{
  const plan=createVibeArtPipeline({request:'로블록스 카툰 캐릭터 그래픽 고퀄 개선',target:'roblox',quality:2});
  assert.deepEqual([...plan.assetAcquisition.order],[...VIBE_ASSET_ACQUISITION_ORDER]);
  assert.equal(plan.assetAcquisition.primitiveFallbackPrototypeOnly,true);
  assert.equal(plan.runtimeVisualAcceptance.actualRuntimeCaptureRequired,true);
  assert.deepEqual([...plan.runtimeVisualAcceptance.goldenSceneRoles],[...VIBE_GOLDEN_SCENE_ROLES]);
  assert.equal(plan.policy.goldenSceneRuntimeEvidenceRequired,true);
  assert.equal(plan.policy.markerOnlyPresentationPassForbidden,true);
});

test('asset acquisition prefers existing verified company assets and keeps primitive fallback prototype-only',()=>{
  const company=[{id:'verified-cartoon-rig'}];
  const plan=createVibeAssetAcquisitionPlan({companyAssets:company,repositoryAssets:[{id:'repo'}],stage:'INTERNAL_PLAYTEST'});
  assert.equal(plan.selectedSource,'VERIFIED_COMPANY_ASSET_AND_RIG_LIBRARY');
  assert.equal(plan.candidates[0].id,'verified-cartoon-rig');
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.primitiveFallbackCreatesVisualDebt,true);
});



test('prototype acquisition cannot fall back to visible primitive gameplay assets',()=>{
  const plan=createVibeAssetAcquisitionPlan({stage:'PROTOTYPE'});
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.primaryActorPrimitiveFallbackAllowed,false);
  assert.equal(plan.visibleGameplayPrimitiveFallbackForbidden,true);
  assert.equal(plan.debugPrimitiveAllowedOnlyWhenNonRendered,true);
});

test('Web spatial gate requires layered background world detail and rejects primitive-dominated rendering',()=>{
  const primitive=auditVibeWeb25D({files:[{path:'index.html',text:'<body data-spatial-dimension="2.5d" style="perspective:800px"><script>const foreground={},midground={},background={},terrain={},landmark={},groundShadow=1,depthSort=()=>{};ctx.fillRect(0,0,64,64);</script></body>'}]});
  assert.equal(primitive.pass,false);
  assert.equal(primitive.primitiveDominated,true);
  const layered=auditVibeWeb25D({files:[{path:'index.html',text:'<body data-spatial-dimension="2.5d" style="perspective:800px"><script>const foreground={},midground={},background={},terrain={},landmark={},groundShadow=1,depthSort=()=>{};const layer=new Image();ctx.drawImage(layer,0,0);</script></body>'}]});
  assert.equal(layered.pass,true);
  assert.equal(layered.backgroundLayers,true);
  assert.equal(layered.worldDetail,true);
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
      HUD:{required:true,pass:true,observed:true,reviewed:true},
      MINIMAP:{required:true,pass:false,observed:true,reviewed:true},
      INTERACTION:{required:true,pass:true,observed:true,reviewed:true}
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
