// 파일명: qa/vibe2-native-asset-production.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assetProductionGuidance,buildVibeAssetProductionPlan,discoverExistingRobloxGameAssets,inspectVibeSourceGlb} from '../tools/vibe2-asset-production-plan.mjs';
import {observeAssetReferenceImages,buildPrompt} from '../tools/vibe2-source-worker.mjs';
import {createVibeReferenceImageStudyRequest,createVibeMapDetailReconstruction} from '../assets/vibe-environment-director.js';
import {findPresentationQualityTask,findRobloxStudioAssetBackfillTask,findWeatherPresentationTask,planVibe2AutonomousTasks} from '../tools/vibe2-auto-planner.mjs';
import {runIncrementalQa} from '../tools/vibe2-incremental-qa.mjs';
import {buildRobloxStudioAssetBootstrapPlan,compileRobloxSource} from '../tools/company-development-roblox-bootstrap.mjs';

test('Web fully consumes the same visual loadout as Unity and imports a shared customization document',()=>{
  const asset={id:'icon',family:'UI',types:['ui'],license:'project-original',sourceHash:'icon-v1',customization:{controls:{color:{kind:'COLOR',axis:'MATERIAL',target:'Fill'}}},platformVariants:{
    WEB:{path:'icon.svg',contentHash:'web-v1',derivedFromHash:'icon-v1',bindings:{color:{kind:'COLOR',target:'fill'}}},
    UNITY:{path:'Icon.prefab',contentHash:'unity-v1',derivedFromHash:'icon-v1',bindings:{color:{kind:'COLOR',target:'Image.color'}}}
  }};
  const common={manifest:{assets:[asset]},presetCatalog:{presets:[]}};
  const web=buildVibeAssetProductionPlan({...common,target:'web',task:{gameId:'shared-game',goal:'UI 아이콘 커마',styleFamily:'CARTOON',assetCustomization:{recipes:[{family:'UI',baseAssetId:'icon',parameters:{color:[.2,.4,.6]}}]}}});
  assert.equal(web.assetSynchronization.status,'READY_FOR_PLATFORM_APPLICATION');
  const unity=buildVibeAssetProductionPlan({...common,target:'unity',task:{gameId:'shared-game',goal:'UI 아이콘 커마',assetCustomization:{sharedDocument:web.assetSynchronization.document}}});
  assert.equal(unity.assetSynchronization.status,'READY_FOR_PLATFORM_APPLICATION');
  assert.deepEqual(web.baseMaterialLoadout.families,unity.baseMaterialLoadout.families);
  assert.deepEqual(web.styleBible,unity.styleBible);
  assert.equal(web.companyGraphicsLibrary.platformProfile,'WEB');
  assert.equal(web.baseMaterialLoadout.universalAssetFirst.required,true);
  assert.match(assetProductionGuidance(unity),/UNITY \/ WEB SHARED VISUAL DOCUMENT/);
});

test('image-only asset input delivers actual pixels and binds observations to the image hash',async()=>{
  const request=createVibeReferenceImageStudyRequest({sourceId:'dokkaebi',sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',imageRef:'assets/roblox/world-ghosts/dokkaebi.png',purpose:'ASSET_CREATION'});
  let calls=0;
  const order={assetProduction:{imageAssetCreation:{enabled:true,studies:[{request}]}}};
  const observed=await observeAssetReferenceImages({order,model:'fixture-vision',requestModel:async(prompt,options)=>{
    calls++;assert.match(prompt,/attached image pixels/);assert.ok(Buffer.from(options.images[0],'base64').length>1000);
    return JSON.stringify(Object.fromEntries(request.requestedFields.map(key=>[key,key==='UNSEEN_REGIONS'?'Back detail is a creative proposal':'fixture visible observation'])));
  }});
  assert.equal(calls,1);assert.equal(observed.observations[0].pixelInputDelivered,true);
  assert.equal(observed.observations[0].sourceHash,'62b78067eccddaf6e137fac3a2c4d5eaf95e502971070d9c68c2a188fc1bf492');
  assert.equal(observed.observations[0].verifiedAgainstSource,false);
  assert.equal(observed.observations[0].generatedAsset,false);
  assert.ok(!JSON.stringify(observed).includes('iVBOR'));
  const prompt=buildPrompt({...order,target:'web',imageAssetObservation:observed},{files:[{path:'index.html',content:'<main></main>',editable:true}]},['index.html']);
  assert.match(prompt,/IMAGE ASSET OBSERVATION BEGIN/);
  await assert.rejects(observeAssetReferenceImages({order,model:''}),/VISION_MODEL_REQUIRED/);
  const bad={assetProduction:{imageAssetCreation:{enabled:true,studies:[{request:{...request,imageRef:'../outside.png'}}]}}};
  await assert.rejects(observeAssetReferenceImages({order:bad,model:'fixture'}),/LOCAL_REFERENCE_REQUIRED/);
  await assert.rejects(observeAssetReferenceImages({order,model:'fixture',requestModel:async()=>'{}'}),/OBSERVATION_INCOMPLETE/);
});

test('navigation sketch preserves actual route topology and expands functional detail layers deterministically',()=>{
  const sketch={nodes:[{id:'entry',role:'spawn'},{id:'market',role:'landmark'},{id:'exit',role:'transition'}],edges:[{from:'entry',to:'market'},{from:'market',to:'exit',oneWay:true}],districts:[{id:'market-block',anchorNodeId:'market',function:'MARKET'}]};
  const assets=[{id:'shop',family:'BUILDING',sourceHash:'shop-v1',mapDetailRoles:['STRUCTURE'],districtFunctions:['MARKET']}];
  const a=createVibeMapDetailReconstruction({sketch,assets,seed:'same',styleFamily:'DARK_FANTASY'});
  assert.equal(a.status,'DETAIL_AUTHORING_PLAN');assert.equal(a.topology.edges[1].oneWay,true);
  assert.equal(a.regions[0].layers.length,6);assert.equal(a.regions[0].layers[1].assetId,'shop');
  assert.deepEqual(a,createVibeMapDetailReconstruction({sketch,assets,seed:'same',styleFamily:'DARK_FANTASY'}));
  assert.equal(a.spatialScale.status,'SCALE_AUTHORING_REQUIRED');assert.equal(a.runtimeVerified,false);
  const bad=createVibeMapDetailReconstruction({sketch:{...sketch,edges:[{from:'entry',to:'market'}]}});
  assert.equal(bad.status,'MAP_INTERPRETATION_REQUIRED');assert.deepEqual(bad.regions,[]);
  const empty=createVibeMapDetailReconstruction();assert.equal(empty.topology,null);
});

test('source GLB inventory uses real binary structure and leaves absent morphs or rigging for authoring',()=>{
  const source=inspectVibeSourceGlb({source:{path:'assets/roblox/world-ghosts/native/mesh/bride.glb'}});
  assert.equal(source.status,'INSPECTED_RECONSTRUCTION_INPUT');
  assert.ok(source.inventory.meshCount>0);assert.ok(source.inventory.animations.length>0);
  assert.ok(source.requiredAuthoring.includes('AUTHOR_MORPHS_WHEN_SHAPE_CUSTOMIZATION_NEEDED'));
  assert.equal(source.generatedAsset,false);
  assert.equal(inspectVibeSourceGlb({source:{path:'../outside.glb'}}).status,'SOURCE_GLB_REQUIRED');
  const wrong=inspectVibeSourceGlb({source:{path:'assets/roblox/world-ghosts/native/mesh/bride.glb',sourceHash:'wrong'}});
  assert.ok(wrong.issues.includes('GLB_SOURCE_HASH_MISMATCH'));
  const plan=buildVibeAssetProductionPlan({target:'unity',task:{gameId:'reconstruct',goal:'디테일',sourceGlbs:[{path:'assets/roblox/world-ghosts/native/mesh/bride.glb'}],imageToAsset:true,referenceImages:[{sourceId:'ref',sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',path:'assets/roblox/world-ghosts/dokkaebi.png'}],mapReconstruction:{sketch:{}}}});
  assert.equal(plan.sourceGlbReconstruction[0].sourceHash,source.sourceHash);
  const guidance=assetProductionGuidance(plan);
  for(const term of ['BASIC GLB TO DETAILED ASSET','IMAGE-TO-ASSET CREATION','BASIC MAP TO DETAILED WORLD'])assert.ok(guidance.includes(term));
});

test('customization and detailed style instructions reach the existing asset work order input',()=>{
  const plan=buildVibeAssetProductionPlan({target:'roblox',task:{
    gameId:'customization-review',goal:'다크 카툰 캐릭터 배경 UI 아이콘 모션',
    concept:{styles:[{family:'CARTOON',weight:.6},{family:'DARK_FANTASY',weight:.4}]},
    assetCustomization:{recipes:[{family:'UI',subfamily:'ICON',baseAssetId:'test-icon',parameters:{tint:[.1,.2,.3]}}]}
  },manifest:{assets:[{id:'test-icon',family:'UI',types:['ui'],license:'project-original',platforms:['roblox'],sourceHash:'fixture-v1',customization:{controls:{tint:{kind:'COLOR',axis:'MATERIAL',target:'IconFill'}}}}]},presetCatalog:{presets:[]}});
  assert.equal(plan.styleBible.profileKey,'TOON_NOIR');
  assert.equal(plan.motionStyle.profileKey,'TOON_NOIR');
  assert.equal(plan.assetCustomization.items[0].status,'DECLARED_BINDINGS_READY');
  assert.equal(plan.assetCustomization.items[0].operations[0].target,'IconFill');
  assert.equal(plan.assetCustomization.runtimeVerified,false);
  assert.equal(plan.assetCustomization.minimumQuality.referenceRole,'OWNER_SELECTED_VISUAL_QUALITY_FLOOR_NOT_RUNTIME_PROOF');
  assert.ok(fs.existsSync(plan.assetCustomization.minimumQuality.referencePath));
  const guidance=assetProductionGuidance(plan);
  for(const text of ['도깨비','UI·아이콘','24/32/48/64px','Blender','실제 모션 변형 지침','IconFill','UNVERIFIED'])assert.ok(guidance.includes(text),text);
  assert.equal(plan.assetCustomization.effort.representativeWorkPlanningMinutes,360);
});

test('motion planning reuses company clips per state and does not invent coverage or runtime proof',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'motion-reuse-'));
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({assets:[{
      id:'owned-motion',category:'MOTION',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
      license:'company-owned',platforms:['roblox'],states:['idle','attack'],rigType:'R15'
    }]}));
    const plan=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task:{gameId:'demo',goal:'공격 모션'},presetCatalog:{presets:[]},manifest:{assets:[
      {id:'external-motion',types:['animation'],license:'CC0',platforms:['roblox'],sourceUrl:'https://example.invalid/clips',downloaded:false,animations:['attack','move']},
      {id:'unknown-clips',types:['animation'],license:'project-original',platforms:['roblox'],path:'roblox-games/demo/clips.json'},
      {id:'reference-motion',referenceOnly:true,types:['animation'],license:'project-original',platforms:['roblox'],states:['death']},
      {id:'wrong-platform',types:['animation'],license:'CC0',platforms:['unity'],states:['death']},
      {id:'blocked-license',types:['animation'],license:'CC-BY-NC',platforms:['roblox'],states:['skill']}
    ]}});
    const motion=plan.decisions.find(row=>row.type==='animation');
    assert.equal(motion.decisionOrder[1],'REUSE_VERIFIED_COMPANY_ASSET');
    assert.deepEqual(motion.motionReusePlan.stateBindings.find(row=>row.state==='attack').candidateIds,['owned-motion','external-motion']);
    assert.deepEqual(motion.motionReusePlan.stateBindings.find(row=>row.state==='move').candidateIds,['external-motion']);
    assert.deepEqual(motion.motionReusePlan.unresolvedStates,['hit','skill','death']);
    assert.deepEqual(motion.motionReusePlan.coverageUnknownCandidateIds,['unknown-clips']);
    assert.equal(motion.motionReusePlan.runtimeVerified,false);
    assert.ok(motion.motionReusePlan.stateBindings.every(row=>row.runtimeVerified===false));
    assert.equal(motion.companyCandidates[0].rigType,'R15');
    assert.equal(motion.decisionOrder[0],'COMPARE_TARGET_GAME_QUALITY');
    assert.equal(motion.qualitySelection.selectedAssetId,null);
    assert.equal(motion.qualitySelection.selectionState,'TARGET_GAME_REVIEW_REQUIRED');
    assert.ok(motion.qualitySelection.compareCandidateIds.includes('external-motion'));
    assert.ok(!motion.qualitySelection.compareCandidateIds.includes('reference-motion'));
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/attack=owned-motion\|external-motion/);
    assert.match(guidance,/Asset ID를 지어내지/);
    assert.match(guidance,/MULTIPLAYER_SYNC/);
    assert.match(guidance,/기존 공격 판정/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

const VERIFIED_ROBLOX_LEARNING_REUSE=Object.freeze({
  id:'external-black-box-bootstrap-test',
  project:'verified-runtime-reference',
  sourceRevision:'test-fixture',
  distilledApplicationPrinciples:[
    'id=compact-tactical-state-with-immediate-feedback;scope=gameplay;lesson=compact tactical state with immediate feedback;apply=compact-tactical-state-with-immediate-feedback'
  ],
  distilledAvoidancePrinciples:['do not copy raw source or assets'],
  distilledLearningUseAllowed:['general gameplay feedback principle'],
  distilledLearningUseForbidden:['raw source, binaries, or asset expression']
});
const verifiedRobloxPlaybooks=()=>({
  taskTypes:{
    roblox:{authority:'VERIFIED_PLAYBOOK',checklist:['server authority','mobile input'],reuse:[VERIFIED_ROBLOX_LEARNING_REUSE]},
    coding:{checklist:['bounded source change'],reuse:[]}
  }
});

function writePolicy(root,{pilot='fantasy-survival'}={}){
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    version:209,
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    assetProductionParallelContract:{
      version:2,enabled:true,
      firstAdoption:{gameId:pilot,targetPlatforms:['UNITY','ROBLOX']},
      platformAssetSeparation:{
        webAssetDirectReuseIntoUnityForbidden:true,
        webAssetDirectReuseIntoRobloxForbidden:true
      }
    },
    weatherPresentationContract:{
      version:1,enabled:true,
      firstAdoption:{gameId:pilot,surfaces:['WEB_COMPANION','UNITY','ROBLOX']},
      canonicalStates:['CLEAR','RAIN','FOG','SNOW','STORM'],
      regionalExtensions:['VOLCANIC_ASH','HEAT_HAZE']
    }
  },null,2));
}

function tempRoot(opts={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-native-weather-'));
  execFileSync('git',['init','-q'],{cwd:root});
  writePolicy(root,opts);
  return root;
}

test('verified commercial black-box distillation is mandatory input for internal asset evolution',()=>{
  const verifiedLearning={
    exactKnowledgeIds:['PLAYBOOK_REUSE:external-black-box-commercial-ui','PLAYBOOK_REUSE:external-black-box-commercial-motion'],
    playbookReuse:[
      {id:'external-black-box-commercial-ui',project:'commercial-app-a',sourceRevision:'sha256:a',score:0.7,verified:true,authority:'verified-task-playbook',sourcePlaybooks:['ui','graphics'],distilledApplicationPrinciples:['menu hierarchy keeps first playable state obvious']},
      {id:'external-black-box-commercial-motion',project:'commercial-app-b',sourceRevision:'sha256:b',score:0.6,verified:true,authority:'verified-task-playbook',sourcePlaybooks:['motion','graphics'],distilledApplicationPrinciples:['interaction feedback is spatially anchored and immediate']}
    ]
  };
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'internal-asset-evolution',goal:'menu UI graphics motion internal asset development'},
    target:'roblox',executionLane:'asset-development',verifiedLearning,
    manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.commercialDistillation.required,true);
  assert.equal(plan.commercialDistillation.ready,true);
  assert.equal(plan.commercialDistillation.verifiedReuseCount,2);
  assert.equal(plan.commercialDistillation.retrievedCount,2);
  assert.equal(plan.commercialDistillation.appliedCount,2);
  assert.equal(plan.commercialDistillation.identityBoundVerifiedExternalIds.length,2);
  assert.equal(plan.commercialDistillation.verifiedReuse.every(row=>row.distilledApplicationPrinciples.length>0),true);
  assert.equal(plan.commercialDistillation.matchedCount,2);
  assert.equal(plan.commercialDistillation.exactRetrievedSetBinding,true);
  assert.equal(plan.commercialDistillation.applicationCoveragePct,100);
  assert.equal(plan.commercialDistillation.mandatoryApplicationCoveragePct,100);
  assert.equal(plan.commercialDistillation.applicationMode,'TRANSFORMATIVE_INTERNAL_ASSET_EVOLUTION');
  assert.equal(plan.commercialDistillation.internalAssetEvolutionRequired,true);
  assert.equal(plan.commercialDistillation.rawCommercialAssetCopyForbidden,true);
  assert.equal(plan.commercialDistillation.rawCommercialCodeCopyForbidden,true);
  assert.equal(plan.commercialDistillation.distinctiveMenuSceneOrAnimationCloneForbidden,true);
  assert.ok(plan.commercialDistillation.applyAxes.includes('MENU_FLOW_AND_INFORMATION_ARCHITECTURE'));
  assert.ok(plan.commercialDistillation.applyAxes.includes('GRAPHICS_ART_DIRECTION_MATERIAL_LIGHTING_AND_COMPOSITION'));
  assert.ok(plan.commercialDistillation.applyAxes.includes('MOTION_ANIMATION_TRANSITIONS_IMPACT_AND_SECONDARY_MOTION'));
  assert.ok(plan.commercialDistillation.applyAxes.includes('GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT'));
  assert.ok(plan.commercialDistillation.evolutionLoop.includes('REAUTHOR_OR_RECOMPOSE_INTERNAL_ASSET'));
  assert.ok(plan.commercialDistillation.evolutionLoop.includes('RETURN_VERIFIED_OUTCOME_TO_LEARNING'));
  const guidance=assetProductionGuidance(plan);
  assert.match(guidance,/상업용 블랙박스 증류 적용=필수/);
  assert.match(guidance,/내부 자산으로 재저작·재구성/);
});

test('internal asset development rejects partial binding of retrieved verified external learning',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'internal-asset-partial-learning',goal:'menu UI graphics motion internal asset development'},
    target:'roblox',
    executionLane:'asset-development',
    verifiedLearning:{
      exactKnowledgeIds:['PLAYBOOK_REUSE:external-black-box-commercial-ui','PLAYBOOK_REUSE:external-black-box-commercial-motion'],
      playbookReuse:[
        {id:'external-black-box-commercial-ui',project:'commercial-app-a',sourceRevision:'sha256:a',score:0.7,verified:true,authority:'verified-task-playbook',sourcePlaybooks:['ui','graphics'],distilledApplicationPrinciples:['menu hierarchy keeps first playable state obvious']}
      ]
    },
    manifest:{version:1,assets:[]},
    presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.commercialDistillation.required,true);
  assert.equal(plan.commercialDistillation.ready,false);
  assert.equal(plan.commercialDistillation.allRetrievedVerifiedExternalApplied,false);
  assert.equal(plan.commercialDistillation.retrievedCount,2);
  assert.equal(plan.commercialDistillation.appliedCount,1);
  assert.equal(plan.commercialDistillation.matchedCount,1);
  assert.equal(plan.commercialDistillation.exactRetrievedSetBinding,false);
  assert.equal(plan.commercialDistillation.applicationCoveragePct,50);
  assert.equal(plan.commercialDistillation.identityBoundVerifiedExternalIds.length,1);
});

test('internal asset development is not ready when verified commercial distillation is absent',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'internal-asset-missing-learning',goal:'graphics motion UI asset development'},
    target:'unity',executionLane:'asset-development',verifiedLearning:{playbookReuse:[],exactKnowledgeIds:[]},
    manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.commercialDistillation.required,true);
  assert.equal(plan.commercialDistillation.ready,false);
  assert.equal(plan.commercialDistillation.verifiedReuseCount,0);
  assert.equal(plan.commercialDistillation.retrievedCount,0);
  assert.equal(plan.commercialDistillation.appliedCount,0);
  assert.equal(plan.commercialDistillation.applicationCoveragePct,0);
  assert.equal(plan.commercialDistillation.exactRetrievedSetBinding,false);
});
test('web-only assets are never reused directly by Unity or Roblox',()=>{
  const manifest={version:1,assets:[
    {id:'web-tree',path:'web-games/demo/assets/tree.png',types:['prop'],tags:['나무'],license:'CC0'},
    {id:'unity-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',platforms:['unity']},
    {id:'roblox-fx',path:'',types:['effect'],tags:['이펙트'],license:'CC0',platforms:['roblox']},
    {id:'generic-vfx',path:'',types:['effect'],tags:['이펙트'],license:'CC0'}
  ]};
  const task={gameId:'fantasy-survival',goal:'숲 나무 UI 이펙트 애니메이션 그래픽 개선'};
  const unity=buildVibeAssetProductionPlan({task,target:'unity',manifest,presetCatalog:{version:1,presets:[]}});
  const roblox=buildVibeAssetProductionPlan({task,target:'roblox',manifest,presetCatalog:{version:1,presets:[]}});
  const unityReuse=unity.decisions.flatMap(row=>row.reuseCandidates.map(asset=>asset.id));
  const robloxReuse=roblox.decisions.flatMap(row=>row.reuseCandidates.map(asset=>asset.id));
  assert.equal(unityReuse.includes('web-tree'),false);
  assert.equal(robloxReuse.includes('web-tree'),false);
  assert.equal(unityReuse.includes('unity-ui'),true);
  assert.equal(robloxReuse.includes('unity-ui'),false);
  assert.equal(robloxReuse.includes('roblox-fx'),true);
  assert.equal(unityReuse.includes('roblox-fx'),false);
  assert.equal(unity.capabilities.canChooseDirectAuthoring,true);
  assert.equal(roblox.capabilities.canChooseDirectAuthoring,true);
  assert.ok(unity.decisions.some(row=>row.directAuthoring.includes('csharp-procedural-mesh-and-low-poly-model')));
  assert.ok(roblox.decisions.some(row=>row.directAuthoring.includes('luau-composed-low-poly-model')));
  assert.equal(unity.policy.crossPlatformWebAssetDirectReuseForbidden,true);
  assert.equal(roblox.policy.nativeReuseRequiresTargetCompatibility,true);
});


test('Roblox planner reuses source-bound same-game assets before cross-game library candidates',()=>{
  const root=tempRoot();
  try{
    const server=path.join(root,'roblox-games','demo','server');
    const shared=path.join(root,'roblox-games','demo','shared');
    fs.mkdirSync(server,{recursive:true});
    fs.mkdirSync(shared,{recursive:true});
    fs.writeFileSync(path.join(server,'Game.server.luau'),[
      'local ASSETS={Nature=6933438443,City=6933556508,Dungeon=6934021345,StonePortal=12931228293}',
      'local function loadAsset(id) return AssetService:LoadAssetAsync(id) end'
    ].join('\\n'));
    fs.writeFileSync(path.join(shared,'GameConfig.luau'),'return { Audio={Battle="rbxassetid://1837821768"} }\\n');
    const discovered=discoverExistingRobloxGameAssets({repoRoot:root,gameId:'demo'});
    assert.ok(discovered.some(row=>row.robloxAssetId==='6933438443'&&row.sameGameExistingRoblox===true));
    assert.ok(discovered.some(row=>row.robloxAssetId==='1837821768'&&row.types.includes('audio')));
    assert.equal(discovered.every(row=>row.verifiedCompanyReusable===false),true);

    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'Nature background Battle audio improvement'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.ok(plan.summary.discoveredSameGameRobloxAssets>=4);
    assert.ok(plan.summary.sameGameRobloxCandidateTypes>0);
    assert.ok(plan.decisions.some(row=>row.sameGameCandidates.some(asset=>asset.robloxAssetId==='6933438443')));
    assert.ok(plan.decisions.some(row=>row.decisionOrder[1]==='REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET'));
    assert.equal(plan.policy.sameGameRobloxAssetIsCandidateOnlyUntilRuntimeVerified,true);
    assert.equal(plan.policy.unverifiedSameGameRobloxAssetDoesNotOutrankVerifiedCompanyAsset,true);
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET/);
    assert.match(guidance,/6933438443/);

    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{id:'verified-company-nature',category:'ENVIRONMENT',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,path:'roblox-games/shared/nature.luau',types:['background'],tags:['Nature','background'],platforms:['roblox'],license:'company-owned'}]
    },null,2));
    const withCompany=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'Nature background improvement'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    const background=withCompany.decisions.find(row=>row.type==='background');
    assert.ok(background);
    assert.equal(background.decisionOrder[1],'REUSE_VERIFIED_COMPANY_ASSET');
    assert.equal(background.reuseCandidates[0].id,'verified-company-nature');

    const other=buildVibeAssetProductionPlan({
      task:{gameId:'other-game',goal:'자연 환경 배경 개선'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.equal(other.summary.discoveredSameGameRobloxAssets,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Roblox visual planning selects concrete base material atoms and requires native source binding',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:15,
      baseMaterialLibrary:{
        status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
        families:{
          CHARACTER:['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE'],
          CREATURE:['HEAD_CANINE','JAW_LONG','CLAW'],
          BUILDING:['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE'],
          ENVIRONMENT:['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT'],
          WEAPON:['BLADE_LONG','GUARD_CROSS','GRIP_LONG'],
          SKILL:['CAST_HAND','PROJECTILE_ORB','IMPACT_SMALL'],
          MATERIAL:['WOOD','STONE','METAL'],
          AUDIO:['HIT_FLESH','UI_CONFIRM','ENV_FOREST'],
          VFX:['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST'],
          UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
          MOTION:['IDLE_RELAXED','RUN','ATTACK_LIGHT_1'],
          PROP:['CHEST','CRATE','LAMP']
        },
        combinationRules:{colorOnlyVariantDoesNotCount:true,actualRuntimeQaRequiredBeforeVerifiedPromotion:true}
      },
      variantRecipeTemplates:[{id:'NORMAL_VARIANT',mutationStrength:'LIGHT',minimumDistinctAxes:2}]
    },null,2));
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] Roblox environment UI visual asset improvement'},
      target:'roblox',repoRoot:root,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.ok(plan.baseMaterialLoadout.selectedAtomCount>=20);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.selectionRequired,true);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,true);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.plannerSourceMutationForbidden,true);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.downstreamApplicationOwner,'VIBE2_VIBE3_GAME_SOURCE_IMPLEMENTATION');
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.postApplicationVerificationRequired,true);
    assert.ok(plan.baseMaterialLoadout.families.UI.includes('FRAME_PANEL'));
    assert.equal(plan.baseMaterialLoadout.runtimeVerificationRequired,true);
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/ROBLOX STUDIO ASSET SELECTION HANDOFF/);
    assert.match(guidance,/STUDIO_ASSET_BINDING_VERSION/);
    assert.match(guidance,/FRAME_PANEL/);

    const nonVisual=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'save null guard repair'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.equal(nonVisual.baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,true);
    assert.equal(nonVisual.baseMaterialLoadout.universalAssetFirst.allFamiliesEvaluated,true);
    assert.deepEqual(Object.keys(nonVisual.baseMaterialLoadout.families).sort(),['AUDIO','BUILDING','CHARACTER','CREATURE','ENVIRONMENT','MATERIAL','MOTION','PROP','SKILL','UI','VFX','WEAPON']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('new Roblox bootstrap consumes Studio base materials in real HUD source without claiming verification',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../company-asset-library.json',import.meta.url),'utf8'));
  const profile={
    platform:'ROBLOX',
    inputModel:'mobile touch and gamepad input',
    sessionModel:'single session with local progression',
    multiplayerRuntime:'single player runtime authority',
    performanceBudget:'mobile-first stable frame budget',
    uiUx:'touch-first readable mobile interface',
    saveAndNetwork:'local session no persistent save required',
    platformContentAdaptation:'Roblox native visual and input adaptation',
    internalReleaseTarget:'private Roblox internal playtest',
    validationEvidence:'Roblox runtime capture and deterministic QA'
  };
  const baseline={content:{
    platformProfiles:{ROBLOX:profile},
    robloxBuildProfile:{
      version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',
      declaredGameCategory:'RPG',genre:'RPG',subgenre:null,playMode:'SINGLE',
      multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
      networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'RPG'
    }
  }};
  const studio=buildRobloxStudioAssetBootstrapPlan({gameId:'demo-bootstrap',profile:{genre:'RPG'},assetLibrary:registry});
  assert.equal(studio.applied,true);
  assert.ok(studio.selectedAtomCount>=12);
  assert.ok(studio.families.UI.includes('FRAME_PANEL'));
  assert.equal(studio.productionVerified,false);
  assert.equal(studio.runtimeVerificationRequired,true);

  const built=compileRobloxSource({
    gameId:'demo-bootstrap',gameName:'Demo Bootstrap',baseline,artbook:{},playbooks:verifiedRobloxPlaybooks(),recombination:{},roadmap:{},assetLibrary:registry
  });
  assert.equal(built.validation.pass,true);
  assert.equal(built.studioAssets.applied,true);
  assert.match(built.result.sharedConfig,/StudioAssets\s*=/);
  assert.match(built.result.sharedConfig,/FRAME_PANEL/);
  assert.match(built.result.clientCode,/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/);
  assert.match(built.result.clientCode,/Config\.StudioAssets/);
  assert.match(built.result.clientCode,/StudioHealthTrack/);
  assert.match(built.result.clientCode,/Instance\.new\("Frame"\)/);
});


test('Roblox visual plan selects stable base material atoms and requires source auto apply',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:15,
      baseMaterialLibrary:{
        status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
        productionVerified:false,
        families:{
          CHARACTER:['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE'],
          CREATURE:['HEAD_CANINE','JAW_LONG','CLAW'],
          BUILDING:['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE'],
          ENVIRONMENT:['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT'],
          WEAPON:['BLADE_LONG','GUARD_CROSS','GRIP_LONG'],
          SKILL:['CAST_HAND','PROJECTILE_ORB','IMPACT_SMALL'],
          MATERIAL:['WOOD','STONE','METAL','CLOTH'],
          AUDIO:['HIT_FLESH','ATTACK_SWING_LIGHT','ENV_FOREST'],
          VFX:['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST'],
          UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
          MOTION:['IDLE_RELAXED','WALK','ATTACK_LIGHT_1'],
          PROP:['CHEST','CRATE','LAMP','WORKBENCH']
        },
        mutationAxes:['MATERIAL','PROPORTION','FACTION'],
        combinationRules:{colorOnlyVariantDoesNotCount:true,actualRuntimeQaRequiredBeforeVerifiedPromotion:true}
      },
      variantRecipeTemplates:[{id:'NORMAL_VARIANT',mutationStrength:'LIGHT',minimumDistinctAxes:2}]
    },null,2));
    const task={gameId:'demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] Roblox 캐릭터 몬스터 환경 UI 그래픽 개선'};
    const first=buildVibeAssetProductionPlan({task,target:'roblox',repoRoot:root,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
    const second=buildVibeAssetProductionPlan({task,target:'roblox',repoRoot:root,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
    assert.ok(first.baseMaterialLoadout.selectedAtomCount>=9);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.selectionRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.plannerSourceMutationForbidden,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.downstreamApplicationOwner,'VIBE2_VIBE3_GAME_SOURCE_IMPLEMENTATION');
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.downstreamApplicationRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.postApplicationVerificationRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.markerOnlyApplicationForbidden,true);
    assert.deepEqual(first.baseMaterialLoadout.families,second.baseMaterialLoadout.families);
    const guidance=assetProductionGuidance(first);
    assert.match(guidance,/ROBLOX STUDIO ASSET SELECTION HANDOFF/);
    assert.match(guidance,/STUDIO_ASSET_BINDING_VERSION/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('new Roblox bootstrap binds Studio material atoms into generated Luau without claiming runtime verification',()=>{
  const assetLibrary={
    version:15,
    baseMaterialLibrary:{
      status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
      families:{
        UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
        ENVIRONMENT:['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT'],
        BUILDING:['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE'],
        PROP:['CHEST','CRATE','LAMP','WORKBENCH'],
        MATERIAL:['WOOD','STONE','METAL','CLOTH'],
        VFX:['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST'],
        SKILL:['CAST_HAND','PROJECTILE_ORB','IMPACT_SMALL'],
        AUDIO:['ENV_WIND','UI_CONFIRM','ATTACK_SWING_LIGHT'],
        MOTION:['IDLE_RELAXED','WALK','RUN'],
        WEAPON:['BLADE_LONG','GUARD_CROSS','GRIP_LONG'],
        CHARACTER:['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE'],
        CREATURE:['HEAD_CANINE','JAW_LONG','CLAW']
      }
    }
  };
  const baseline={
    content:{
      identity:'Action',
      multiplayerMode:'SINGLE',
      robloxBuildProfile:{
        version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',
        genre:'Action',subgenre:null,playMode:'SINGLE',
        multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
        networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'Action'
      },
      platformProfiles:{
        ROBLOX:{
          platform:'ROBLOX',
          inputModel:'mobile touch plus keyboard controller input',
          sessionModel:'single player authoritative session runtime',
          multiplayerRuntime:'server authority retained even when single',
          performanceBudget:'mobile first stable frame performance budget',
          uiUx:'touch first readable mobile user interface',
          saveAndNetwork:'safe save and network ownership separation',
          platformContentAdaptation:'native Roblox visual and input adaptation',
          internalReleaseTarget:'private Roblox internal release candidate',
          validationEvidence:'source then Studio runtime validation evidence'
        }
      }
    }
  };
  const playbooks=verifiedRobloxPlaybooks();
  const recombination={recipes:[{
    id:'action-recipe',sourceProjects:['source-a','source-b'],
    transformationOperator:'TRANSFORMATIVE_RECOMBINATION',
    internalCreationRequirement:'ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT',
    featureBlend:['combat','attack','touch']
  }]};
  const plan=buildRobloxStudioAssetBootstrapPlan({gameId:'demo',profile:baseline.content.robloxBuildProfile,assetLibrary});
  assert.equal(plan.applied,true);
  assert.ok(plan.selectedAtomCount>=12);
  const compiled=compileRobloxSource({
    gameId:'demo',gameName:'Demo',baseline,artbook:{},playbooks,recombination,roadmap:{},assetLibrary
  });
  assert.equal(compiled.validation.pass,true);
  assert.equal(compiled.studioAssets.applied,true);
  assert.equal(compiled.studioAssets.productionVerified,false);
  assert.equal(compiled.studioAssets.runtimeVerificationRequired,true);
  assert.match(compiled.result.sharedConfig,/StudioAssets\s*=/);
  assert.match(compiled.result.sharedConfig,/FRAME_PANEL/);
  assert.match(compiled.result.clientCode,/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/);
  assert.match(compiled.result.clientCode,/Config\.StudioAssets/);
  assert.match(compiled.result.clientCode,/StudioAssetAtoms/);
  assert.doesNotMatch(compiled.result.sharedConfig,/ProductionVerified\s*=\s*true/);
});

test('existing Roblox visual candidate must bind selected Studio atoms to real native source',()=>{
  const root=tempRoot();
  try{
    const relative='roblox-games/demo/client/Game.client.luau';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const manifestPath=path.join(root,'manifest-roblox-studio-binding.json');
    const manifest={
      target:'roblox',
      changedFiles:[relative],
      assetProduction:{
        baseMaterialLoadout:{
          families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']},
          robloxSelectionHandoff:{handoffRequired:true,downstreamApplicationRequired:true,plannerSourceMutationForbidden:true}
        }
      }
    };
    fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
    fs.writeFileSync(file,[
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local STUDIO_ASSET_SELECTION = {"FRAME_PANEL","BUTTON_PRIMARY","BAR_HEALTH"}',
      'local root = Instance.new("Frame")',
      'root.BackgroundColor3 = Color3.fromRGB(22, 34, 58)',
      'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
      'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))'
    ].join('\n'));
    const result=runIncrementalQa({root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-binding',force:true});
    assert.equal(result.outcome,'PASS');
    assert.equal(result.robloxStudioAssetBindingQa.status,'STATIC_PASS');
    assert.equal(result.robloxStudioAssetBindingQa.runtimeStillRequired,true);
    assert.equal(result.robloxStudioAssetBindingQa.companyAssetPromotionBlockedUntilRuntime,true);

    fs.writeFileSync(file,[
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local STUDIO_ASSET_SELECTION = {"FRAME_PANEL","BUTTON_PRIMARY","BAR_HEALTH"}',
      'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
      'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))'
    ].join('\n'));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-marker-only',force:true
    }),/ROBLOX_STUDIO_ASSET_BINDING_QA_FAILED:.*ROBLOX_NATIVE_VISUAL_BINDING/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset plan prefers verified company library then repository then external gap fill',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{
        id:'company-ui',category:'UI',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'unity-games/shared/ui/company.png',license:'company-owned',platforms:['unity']
      }],
      externalSources:[{id:'external-source'}]
    },null,2));
    const manifest={version:1,assets:[
      {id:'repo-ui',path:'unity-games/demo/Assets/UI/repo.png',types:['ui'],tags:['UI'],license:'project-original'},
      {id:'external-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',source:'KayKit',sourceUrl:'https://example.invalid/ui',downloaded:false,platforms:['unity']}
    ]};
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'UI 그래픽 개선'},target:'unity',repoRoot:root,
      manifest,presetCatalog:{version:1,presets:[]}
    });
    const row=plan.decisions.find(item=>item.type==='ui');
    assert.ok(row);
    assert.deepEqual(row.companyCandidates.map(item=>item.id),['company-ui']);
    assert.deepEqual(row.repositoryCandidates.map(item=>item.id),['repo-ui']);
    assert.deepEqual(row.externalCandidates.map(item=>item.id),['external-ui']);
    assert.deepEqual(row.reuseCandidates.map(item=>item.id),['company-ui','repo-ui']);
    assert.deepEqual(row.decisionOrder.slice(1,4),[
      'REUSE_VERIFIED_COMPANY_ASSET',
      'REUSE_LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET',
      'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET'
    ]);
    assert.equal(plan.summary.companyCandidateTypes>0,true);
    assert.equal(plan.summary.externalCandidateTypes>0,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('native presentation pass is available to every confirmed project while the first adoption keeps owner priority',()=>{
  const root=tempRoot();
  try{
    const fantasyUnity=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    const otherUnity=path.join(root,'unity-games','other-game','Assets','Scripts');
    fs.mkdirSync(fantasyUnity,{recursive:true});
    fs.mkdirSync(otherUnity,{recursive:true});
    fs.writeFileSync(path.join(fantasyUnity,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    fs.writeFileSync(path.join(otherUnity,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const fantasy=findPresentationQualityTask({
      gameId:'fantasy-survival',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/fantasy-survival',source:'company-status'
    },root,{tasks:[]});
    const other=findPresentationQualityTask({
      gameId:'other-game',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/other-game',source:'company-status'
    },root,{tasks:[]});
    assert.ok(fantasy);
    assert.equal(fantasy.id,'fantasy-survival-unity-presentation-asset-adaptation-v1');
    assert.equal(fantasy.priority,'owner-immediate');
    assert.ok(other);
    assert.equal(other.id,'other-game-unity-presentation-asset-adaptation-v1');
    assert.equal(other.priority,'normal');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fantasy-survival development-confirmed Unity can receive P0 weather work only through owner-authorized company status',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'fantasy-survival',name:'마력숲 생존기',ownerDecision:'PASS',
        target:'unity',selectedPlatform:'unity-android',projectPath:'unity-games/fantasy-survival',progress:20
      }]},
      catalog:{games:[{
        id:'fantasy-survival',name:'마력숲 생존기',
        productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'
      }]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    const weather=result.tasks.find(row=>row.id==='fantasy-survival-unity-weather-presentation-v1');
    assert.ok(weather);
    assert.equal(weather.priority,'owner-immediate');
    assert.equal(weather.weatherPresentationLane,true);
    assert.ok(weather.evidence.includes('weather-presentation:v1'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('development-confirmed existing Unity non-pilot receives holistic backfill before generic presentation and never inherits pilot weather scope',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','other-game','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'other-game',name:'Other',ownerDecision:'PASS',
        target:'unity',selectedPlatform:'unity-android',projectPath:'unity-games/other-game',progress:20
      }]},
      catalog:{games:[{id:'other-game',name:'Other',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    assert.ok(result.tasks.some(row=>(row.evidence||[]).includes('existing-holistic-backfill:v1')));
    assert.ok(result.tasks.some(row=>row.studioQualityEvolution?.existingHolisticBackfillRequired===true));
    assert.equal(result.tasks.some(row=>row.id==='other-game-unity-weather-presentation-v1'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('existing Roblox games receive one Studio asset backfill task until real binding exists',()=>{
  const root=tempRoot();
  try{
    writePolicy(root);
    const gameRoot=path.join(root,'roblox-games','demo');
    fs.mkdirSync(path.join(gameRoot,'shared'),{recursive:true});
    fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'shared','GameConfig.luau'),'return { GameId = "demo" }\n');
    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),'local root = Instance.new("Frame")\nroot.BackgroundColor3 = Color3.fromRGB(20,20,20)\n');
    const project={gameId:'demo',name:'Demo',engine:'roblox',releaseState:'development-confirmed',projectPath:'roblox-games/demo'};
    const first=findRobloxStudioAssetBackfillTask(project,root,{tasks:[]});
    assert.ok(first);
    assert.equal(first.id,'demo-roblox-studio-asset-backfill-v1');
    assert.equal(first.studioAssetBackfill,true);
    assert.equal(first.assetProductionLane,true);
    assert.ok(first.evidence.includes('roblox-studio-asset-selection-handoff:required'));
    assert.ok(first.evidence.includes('roblox-studio-asset-target-engine-selection-match:required'));
    assert.match(first.goal,/플래너는 선택·전달만/);
    assert.match(first.goal,/실제 Roblox 런타임 PASS 전에는/);

    const duplicate=findRobloxStudioAssetBackfillTask(project,root,{tasks:[first]});
    assert.equal(duplicate,null);

    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),[
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local root = Instance.new("Frame")',
      'root:SetAttribute("StudioAssetAtoms", "FRAME_PANEL,BUTTON_PRIMARY")',
      'root.BackgroundColor3 = Color3.fromRGB(20,20,20)'
    ].join('\n'));
    const alreadyBound=findRobloxStudioAssetBackfillTask(project,root,{tasks:[]});
    assert.equal(alreadyBound,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('autonomous planner prioritizes holistic backfill before Studio asset backfill for an existing confirmed Roblox game',()=>{
  const root=tempRoot();
  try{
    writePolicy(root);
    const gameRoot=path.join(root,'roblox-games','demo');
    fs.mkdirSync(path.join(gameRoot,'shared'),{recursive:true});
    fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'shared','GameConfig.luau'),'return { GameId = "demo" }\n');
    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),'local root = Instance.new("Frame")\nroot.BackgroundColor3 = Color3.fromRGB(18,28,48)\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'demo',name:'Demo',ownerDecision:'PASS',
        target:'roblox',selectedPlatform:'roblox',projectPath:'roblox-games/demo',progress:20
      }]},
      catalog:{games:[{id:'demo',name:'Demo',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    const holistic=result.tasks.find(row=>(row.evidence||[]).includes('existing-holistic-backfill:v1'));
    assert.ok(holistic);
    assert.equal(holistic.target,'roblox');
    assert.equal(holistic.studioQualityEvolution?.existingHolisticBackfillRequired,true);
    assert.equal(result.tasks.some(row=>row.id==='demo-roblox-studio-asset-backfill-v1'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Roblox Studio asset auto apply requires all family accounting, map assets, selected atom trace, and real native binding',()=>{
  const root=tempRoot();
  try{
    const relative='roblox-games/demo/client/Game.client.luau';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const families={
      CHARACTER:['TORSO_CLOTH'],CREATURE:['HEAD_CANINE'],BUILDING:['FOUNDATION_RECT'],ENVIRONMENT:['TREE_TRUNK_THICK'],
      WEAPON:['BLADE_LONG'],SKILL:['CAST_HAND'],MATERIAL:['WOOD'],AUDIO:['ENV_WIND'],VFX:['IMPACT_FLASH'],UI:['FRAME_PANEL'],
      MOTION:['IDLE_RELAXED'],PROP:['CHEST']
    };
    const atoms=Object.values(families).flat();
    fs.writeFileSync(file,`local STUDIO_ASSET_BINDING_VERSION = 2
local STUDIO_ASSET_SELECTION = {${atoms.map(atom=>JSON.stringify(atom)).join(',')}}
local STUDIO_ASSET_FAMILY_STATUS = {
  CHARACTER = "APPLIED", CREATURE = "APPLIED", BUILDING = "APPLIED", ENVIRONMENT = "APPLIED",
  WEAPON = "APPLIED", SKILL = "APPLIED", MATERIAL = "APPLIED", AUDIO = "APPLIED",
  VFX = "APPLIED", UI = "APPLIED", MOTION = "APPLIED", PROP = "APPLIED"
}
local character = Instance.new("Model"); character.Name = "Character"
local humanoid = Instance.new("Humanoid"); humanoid.Parent = character
local enemy = Instance.new("Model"); enemy.Name = "Enemy"
local house = Instance.new("Model"); house.Name = "House"
local tree = Instance.new("Part"); tree.Name = "Tree"; tree.Material = Enum.Material.Wood
local sword = Instance.new("Tool"); sword.Name = "Sword"
local projectile = Instance.new("Part"); projectile.Name = "Projectile"
local sound = Instance.new("Sound"); sound.SoundId = "rbxassetid://0"
local vfx = Instance.new("ParticleEmitter")
local gui = Instance.new("ScreenGui")
local panel = Instance.new("Frame"); panel.Parent = gui
local motor = Instance.new("Motor6D"); motor.Transform = CFrame.Angles(0,0,0)
local chest = Instance.new("Part"); chest.Name = "Chest"
panel.BackgroundColor3 = Color3.fromRGB(22,34,58)
panel:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
panel:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))
`);
    const manifestPath=path.join(root,'manifest-roblox-studio-asset.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'roblox',sourceRoot:'roblox-games/demo',
      changedFiles:[relative],
      assetProduction:{
        baseMaterialLoadout:{
          families,
          universalAssetFirst:{required:true},
          robloxSelectionHandoff:{handoffRequired:true,downstreamApplicationRequired:true,plannerSourceMutationForbidden:true}
        }
      }
    },null,2));
    const result=runIncrementalQa({root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-asset',force:true});
    assert.equal(result.outcome,'PASS');
    assert.equal(result.robloxStudioAssetBindingQa.status,'STATIC_PASS');
    assert.equal(result.robloxStudioAssetBindingQa.allTwelveFamiliesAccounted,true);
    assert.equal(result.robloxStudioAssetBindingQa.mapEnvironmentAssetCoverage,true);
    assert.equal(result.robloxStudioAssetBindingQa.runtimeStillRequired,true);

    fs.writeFileSync(file,`local STUDIO_ASSET_BINDING_VERSION = 2
local STUDIO_ASSET_SELECTION = {${atoms.map(atom=>JSON.stringify(atom)).join(',')}}
local panel = Instance.new("Frame")
panel.BackgroundColor3 = Color3.fromRGB(22,34,58)
panel:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
panel:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))
`);
    assert.throws(()=>runIncrementalQa({root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-asset-missing-family-status',force:true}),/ROBLOX_ASSET_FAMILY_STATUS_ALL_12/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Roblox Vibe candidate publish waits for target runtime QA instead of final PASS',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-candidate-release.yml',import.meta.url),'utf8');
  const settle=workflow.slice(workflow.indexOf('Settle Roblox result and continue canonical queue'),workflow.indexOf('\n  reject:',workflow.indexOf('Settle Roblox result and continue canonical queue')));
  assert.match(settle,/candidate-awaiting-roblox-runtime-qa/);
  assert.match(settle,/roblox-runtime-await-game:/);
  assert.match(settle,/roblox-studio-asset-runtime-proof-required/);
  assert.match(settle,/company-development-roblox-runtime\.yml[^\n]*-f game_id="\$GAME_ID"/);
  assert.match(settle,/VIBE2_ROBLOX_TASK_FINAL_PASS=NO_RUNTIME_QA_PENDING/);
  assert.doesNotMatch(settle,/queue-control\.mjs pass --id="\$TASK_ID" --evidence="roblox-exact-evidence-pass,main-pr-merged,roblox-open-cloud-published/);
});

test('native asset adaptation rejects a single primitive character placeholder',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var actor=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    actor.GetComponent<Renderer>().material.color=Color.red;
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-placeholder.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-placeholder',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*(?:NATIVE_COMPOSITE_FORM|GAME_VISUAL_IDENTITY_DOMAINS|NO_SINGLE_PRIMITIVE_PLACEHOLDER)/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset adaptation accepts composed character weapon environment and style identity',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var body=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    var head=GameObject.CreatePrimitive(PrimitiveType.Sphere);
    head.transform.SetParent(body.transform);
    var weapon=new GameObject("weapon sword blade");
    weapon.AddComponent<MeshFilter>();
    var weaponRenderer=weapon.AddComponent<MeshRenderer>();
    weaponRenderer.material=new Material(Shader.Find("Standard"));
    weaponRenderer.material.color=new Color(0.3f,0.7f,0.5f);
    var environment=GameObject.CreatePrimitive(PrimitiveType.Cube);
    environment.name="forest ground tree biome";
    environment.transform.localScale=new Vector3(4,1,4);
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-composed.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-composed',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.equal(result.presentationQa.status,'STATIC_PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='NATIVE_COMPOSITE_FORM'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native living motion rejects generic movement without actor secondary motion',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  Transform actor;
  float speed;
  void Update(){
    var idle=speed<0.1f;
    var walk=speed>=0.1f;
    actor.localPosition=Vector3.Lerp(actor.localPosition,Vector3.zero,Time.deltaTime);
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-motion.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'LIVING_MOTION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-motion',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:.*SECONDARY_MOTION_SIGNAL/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web asset adaptation rejects primitive-only gameplay art',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/other-game/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><canvas id="game"></canvas><script>
const ctx=document.getElementById('game').getContext('2d');
function render(){
  ctx.fillStyle='#484';
  ctx.fillRect(0,0,320,180);
  ctx.fillStyle='#fff';
  ctx.fillRect(120,80,20,30); // player placeholder
  ctx.fillStyle='#f00';
  ctx.fillRect(200,80,24,24); // monster placeholder
}
render();
</script>`);
    const manifestPath=path.join(root,'manifest-web-placeholder.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-placeholder',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*WEB_REAL_ASSET_BINDING/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web asset adaptation accepts real themed actor equipment environment assets',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/other-game/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><style>
:root{--theme-shadow:#18221c;--theme-accent:#9fd88f}
#game{background-image:url("./assets/background-forest.webp")}
</style><canvas id="game"></canvas><img id="hero" src="./assets/character-hero.webp"><script>
const ctx=document.getElementById('game').getContext('2d');
const player=new Image(); player.src='./assets/character-hero.webp';
const weapon=new Image(); weapon.src='./assets/weapon-sword.webp';
const monster=new Image(); monster.src='./assets/enemy-wolf.webp';
const environment=new Image(); environment.src='./assets/background-forest.webp';
function render(){
  ctx.drawImage(environment,0,0,320,180);
  ctx.drawImage(player,100,80);
  ctx.drawImage(weapon,118,88);
  ctx.drawImage(monster,220,80);
}
render();
</script>`);
    const manifestPath=path.join(root,'manifest-web-themed.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-themed',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_REAL_ASSET_BINDING'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web weather marker prevents duplicate weather task creation',()=>{
  const root=tempRoot();
  try{
    const gameRoot=path.join(root,'web-games','fantasy-survival');
    fs.mkdirSync(gameRoot,{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'index.html'),'<script>const WEATHER_PRESENTATION_VERSION=1;</script>\n');
    const task=findWeatherPresentationTask({
      gameId:'fantasy-survival',engine:'web',releaseState:'development-confirmed',
      projectPath:'web-games/fantasy-survival',source:'company-development-queue'
    },root,{tasks:[]});
    assert.equal(task,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('weather incremental QA requires real Web weather implementation signals',()=>{
  const root=tempRoot();
  try{
    const gameRoot=path.join(root,'web-games','fantasy-survival');
    fs.mkdirSync(gameRoot,{recursive:true});
    const source=`<!doctype html><canvas id="game"></canvas><script>
const WEATHER_PRESENTATION_VERSION=1;
const WEATHER_STATES=['CLEAR','RAIN','FOG','SNOW','STORM'];
const state={weather:{kind:'CLEAR'}};
function setWeather(kind){state.weather.kind=kind}
function nextWeather(){return WEATHER_STATES[1]}
function weatherParticleBudget(){return navigator.deviceMemory<=2?.45:1}
function drawWeatherOverlay(){const c=document.getElementById('game').getContext('2d');c.fillRect(0,0,10,10)}
function serializeWorld(){return {weather:state.weather}}
function applyWorldSnapshot(w){if(w.weather)setWeather(w.weather.kind)}
</script>`;
    fs.writeFileSync(path.join(gameRoot,'index.html'),source);
    const manifestPath=path.join(root,'manifest.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:['web-games/fantasy-survival/index.html'],
      weatherPresentation:{
        required:true,target:'web',
        runtimeChecks:['weather-state-transitions','multiplayer-weather-sync']
      }
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,
      files:['web-games/fantasy-survival/index.html'],
      namespace:'weather-test',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.equal(result.weatherPresentationQa.status,'STATIC_PASS');
    assert.equal(result.weatherPresentationQa.runtimeStillRequired,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
