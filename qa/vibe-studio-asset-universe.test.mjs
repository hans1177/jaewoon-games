// 파일명: qa/vibe-studio-asset-universe.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  STUDIO_ASSET_UNIVERSE_TARGET,
  STUDIO_ASSET_FAMILIES,
  CONCEPT_AXES,
  CREATURE_BODY_PLANS,
  CREATURE_SPECIES,
  SURVIVAL_WILDLIFE_SPECIES,
  SURVIVAL_WILDLIFE_ARCHETYPES,
  SURVIVAL_LOW_POLY_VISUAL_PROFILE,
  createSurvivalWildlifeAssetProfile,
  CLOTHING_LAYER_SLOTS,
  BIOME_FAMILIES,
  BUILDING_THEMES,
  DEFAULT_COVERAGE_BASELINES,
  createAssetDNA,
  createConceptProfile,
  evaluateConceptCompatibility,
  createGameVisualDNA,
  scoreStudioAssetCandidate,
  buildStudioAssetLoadout,
  buildFutureAssetDemandForecast,
  createCreatureSpeciesBlueprint,
  createPlatformAssetVariantPlan,
  createStudioTestbedPlan,
  evaluateCompanyAssetPromotion,
  promoteVerifiedCompanyAssetRegistry,
  promoteVerifiedCompanyAssetsFromRuntimeEvidence,
  summarizeVerifiedAssetUsage,
  createStyleBible,
  createAssetCustomizationPlan,
  synchronizeAssetCustomization,
  createAssetDetailReviewPlan,
  evaluateStyleBible,
  evaluateAssetIdentity,
  checkClothingLayerCompatibility,
  checkOutfitThemeGrammar,
  validateBuildingGrammar,
  createBiomeDNA,
  createPropDensityProfile,
  createSkillPresentationKit,
  createDamagePresentation,
  createDestructionProfile,
  createAssetCompatibilityGraph,
  scanUniversalAssetCoverage,
  buildLibraryHeatmap,
  buildAutonomousAssetGapFillPlan,
  createAssetLineage,
  buildBaseMaterialRotationPlan,
  createStudioAssetUniversePlan
} from '../assets/vibe-studio-asset-universe.js';
import {createVibeCharacterPersona,resolveVibeCharacterBehaviorIntent,createVibePopulationPersonaDiversity} from '../assets/vibe-character-identity-director.js';

function sharedCustomizationFixture(){
  const assets=[{id:'body',family:'CHARACTER',sourceHash:'body-v1',customization:{controls:{jaw:{axis:'FACE',kind:'MORPH',target:'Jaw',min:0,max:1}}},platformVariants:{
    WEB:{path:'body.glb',contentHash:'web-v1',derivedFromHash:'body-v1',bindings:{jaw:{kind:'MORPH',target:'Jaw',scale:1}}},
    UNITY:{path:'Body.prefab',contentHash:'unity-v1',derivedFromHash:'body-v1',bindings:{jaw:{kind:'MORPH',target:'Head/Jaw',scale:100}}}
  }},{id:'idle',family:'MOTION',sourceHash:'idle-v1',platformVariants:{
    WEB:{path:'idle.glb',contentHash:'clip-web',derivedFromHash:'idle-v1',clips:{IDLE:{name:'IdleWeb',durationSeconds:2,events:[{id:'contact',normalizedTime:.5}]}}},
    UNITY:{path:'Idle.anim',contentHash:'clip-unity',derivedFromHash:'idle-v1',clips:{IDLE:{name:'IdleUnity',durationSeconds:2,events:[{id:'contact',normalizedTime:.5}]}}}
  }}];
  const styleBible=createStyleBible({styleFamily:'CARTOON'}),motionStyle={profileKey:'CARTOON',modifiers:{poseExaggeration:1.35,anticipationScale:1.2,overshootScale:1.25,squashStretch:.15,secondaryMotion:1.2,recoveryPresentation:1.1}};
  const customization=createAssetCustomizationPlan({assets,recipes:[{id:'hero',family:'CHARACTER',baseAssetId:'body',parameters:{jaw:.3},lockedParameters:['jaw'],previousParameters:{jaw:.3}}]});
  const motionBindings=[{state:'IDLE',assetId:'idle',sourceHash:'idle-v1',clip:'IDLE',durationSeconds:2,events:[{id:'contact',normalizedTime:.5}]}];
  return{assets,customization,styleBible,motionStyle,motionBindings,gameId:'demo',platform:'WEB'};
}

test('localized customization merges its baseline and rejects changes outside the selected region',()=>{
  const assets=[{id:'body',family:'CHARACTER',sourceHash:'v1',customization:{controls:{
    jaw:{kind:'MORPH',axis:'FACE',target:'Jaw',min:0,max:1},
    wear:{kind:'MATERIAL_SCALAR',axis:'SURFACE_WEAR',target:'Wear',min:0,max:1}
  }}}];
  const recipe={family:'CHARACTER',baseAssetId:'body',previousParameters:{jaw:.3,wear:.1},parameters:{wear:.5},editableParameters:['wear'],lockedParameters:['jaw']};
  const result=createAssetCustomizationPlan({assets,recipes:[recipe]}).items[0];
  assert.deepEqual(result.parameters,{jaw:.3,wear:.5});
  assert.deepEqual(result.changedParameters,['wear']);assert.deepEqual(result.editOperations.map(row=>row.key),['wear']);
  assert.deepEqual(recipe.previousParameters,{jaw:.3,wear:.1});
  const bad=createAssetCustomizationPlan({assets,recipes:[{...recipe,parameters:{jaw:.8,wear:.5}}]}).items[0];
  assert.ok(bad.issues.includes('OUTSIDE_EDIT_SCOPE:jaw'));assert.deepEqual(bad.operations,[]);assert.deepEqual(bad.editOperations,[]);
});

test('style comparison findings require current matched captures and produce bounded repair recipes',()=>{
  const item={id:'hero',family:'CHARACTER',baseAssetId:'body',sourceHash:'v1',parameters:{jaw:.3,wear:.1},lockedParameters:['jaw'],identityAnchors:['one-horn']};
  const captureContract={cameraHash:'camera',lightingHash:'light',actionId:'walk-stop',seed:12,durationSeconds:2,normalizedTimes:[0,.5,1]};
  const capture={...captureContract,recipeId:'hero',sourceHash:'v1',parameters:{...item.parameters},identityAnchors:[...item.identityAnchors],styleFamily:'CARTOON',platform:'WEB',artifactRef:'qa/hero.png',artifactHash:'render-v1'};
  const finding={id:'f1',recipeId:'hero',sourceHash:'v1',styleFamily:'CARTOON',platform:'WEB',artifactHash:'render-v1',region:'cape hem',severity:'HIGH',normalizedTimeRange:[.4,.6],parameterKeys:['wear'],observed:'No seam wear at the hem',requestedChange:'Add localized edge wear'};
  const input={customization:{items:[item]},styles:['CARTOON'],platforms:['WEB'],captureContract,captures:[capture],findings:[finding]};
  const result=createAssetDetailReviewPlan(input);
  assert.equal(result.status,'LOCAL_REPAIR_REQUIRED');
  assert.deepEqual(result.repairs[0].recipe.previousParameters,item.parameters);
  assert.deepEqual(result.repairs[0].recipe.editableParameters,['wear']);assert.equal(result.repairs[0].closed,false);
  assert.equal(createAssetDetailReviewPlan({...input,findings:[]}).status,'CAPTURE_SET_READY_FOR_VISUAL_REVIEW');
  assert.equal(result.runtimeVerified,false);
  for(const invalid of [{...finding,parameterKeys:['jaw']},{...finding,sourceHash:'old'},{...finding,normalizedTimeRange:[NaN,1]}]){
    const rejected=createAssetDetailReviewPlan({...input,findings:[invalid]});assert.equal(rejected.repairs.length,0);assert.equal(rejected.rejectedFindings.length,1);
  }
  const mismatch=createAssetDetailReviewPlan({...input,captures:[{...capture,lightingHash:'other'}]});
  assert.equal(mismatch.acceptedCaptureCount,0);assert.equal(mismatch.repairs.length,0);assert.equal(mismatch.status,'CAPTURES_REQUIRED');
  const staleParameters=createAssetDetailReviewPlan({...input,captures:[{...capture,parameters:{jaw:.3,wear:.5}}]});
  assert.equal(staleParameters.acceptedCaptureCount,0);assert.deepEqual(staleParameters.repairs,[]);
});

test('Unity and Web round-trip one visual document with explicit morph scales and matching motion events',()=>{
  const input=sharedCustomizationFixture(),web=synchronizeAssetCustomization(input);
  assert.equal(web.status,'READY_FOR_PLATFORM_APPLICATION');
  const unity=synchronizeAssetCustomization({...input,document:JSON.parse(JSON.stringify(web.document)),platform:'UNITY_WEB'});
  assert.equal(unity.status,'READY_FOR_PLATFORM_APPLICATION');
  assert.deepEqual(web.document,unity.document);
  assert.equal(web.applications[0].operations[0].value,.3);
  assert.equal(unity.applications[0].operations[0].value,30);
  assert.equal(unity.motions[0].clip,'IdleUnity');
  assert.deepEqual(unity.motions[0].events,web.motions[0].events);
  assert.equal(unity.runtimeVerified,false);
  assert.equal(input.assets[0].customization.controls.jaw.target,'Jaw');
});

test('visual synchronization rejects stale revisions, conflicting writes, changed source and locked values atomically',()=>{
  const input=sharedCustomizationFixture(),first=synchronizeAssetCustomization(input).document;
  const second={...structuredClone(first),revision:2,baseRevision:1};
  for(const [document,currentDocument,expected] of [
    [first,second,'STALE_REVISION'],
    [{...first,styleBible:{...first.styleBible,paletteContrast:'changed'}},first,'REVISION_CONTENT_CONFLICT'],
    [{...second,recipes:[{...first.recipes[0],sourceHash:'wrong'}]},first,'SOURCE_HASH_MISMATCH:hero'],
    [{...second,recipes:[{...first.recipes[0],parameters:[{key:'jaw',value:.8}]}]},first,'LOCKED_VALUE_CONFLICT:hero:jaw'],
    [{...second,damage:100},first,'NON_VISUAL_DOCUMENT_FIELD']
  ]){
    const result=synchronizeAssetCustomization({...input,document,currentDocument});
    assert.ok(result.issues.includes(expected),JSON.stringify(result.issues));
    assert.equal(result.document,null);assert.deepEqual(result.applications,[]);assert.deepEqual(result.motions,[]);
  }
});

test('missing platform variants and altered clip timing require authoring and never partially apply',()=>{
  const input=sharedCustomizationFixture(),document=synchronizeAssetCustomization(input).document;
  delete input.assets[0].platformVariants.UNITY;
  input.assets[1].platformVariants.UNITY.clips.IDLE.durationSeconds=3;
  const result=synchronizeAssetCustomization({...input,document,platform:'UNITY'});
  assert.equal(result.status,'AUTHORING_REQUIRED');
  assert.ok(result.issues.includes('MOTION_TIMING_MISMATCH:IDLE'));
  assert.deepEqual(result.document,document);assert.deepEqual(result.applications,[]);assert.deepEqual(result.motions,[]);
});

test('style families produce different authoring direction while explicit art locks survive',()=>{
  const cartoon=createStyleBible({styleFamily:'CARTOON'}),dark=createStyleBible({styleFamily:'DARK_FANTASY'});
  assert.notEqual(cartoon.shapeLanguage,dark.shapeLanguage);
  assert.notEqual(cartoon.materialLanguage,dark.materialLanguage);
  const mixed=createStudioAssetUniversePlan({concept:{styles:[{family:'CARTOON',weight:.7},{family:'DARK_FANTASY',weight:.3}]},styleBible:{materialLanguage:'OWNER_LOCKED_MATERIAL'}});
  assert.equal(mixed.styleBible.profileKey,'TOON_NOIR');
  assert.equal(mixed.styleBible.materialLanguage,'OWNER_LOCKED_MATERIAL');
});

test('customization preserves locked controls and refuses unsupported or incompatible operations',()=>{
  const assets=[
    {id:'body',family:'CHARACTER',sourceHash:'source-v1',customization:{controls:{
      jaw:{axis:'FACE',kind:'MORPH',target:'JawWidth',min:-1,max:1},
      hair:{axis:'HAIR',kind:'PART',target:'HeadSocket',choices:['hair-a','hair-b']}
    }}},
    {id:'hair-a',sourceHash:'hair-v1',customization:{compatibleBaseIds:['body'],sockets:['HeadSocket']}},
    {id:'hair-b',sourceHash:'hair-v2',customization:{compatibleBaseIds:['other'],sockets:['HeadSocket']}}
  ];
  const recipe={family:'CHARACTER',baseAssetId:'body',parameters:{jaw:.8,hair:'hair-a'},previousParameters:{jaw:.2},lockedParameters:['jaw']};
  const valid=createAssetCustomizationPlan({assets,recipes:[recipe]}).items[0];
  assert.equal(valid.parameters.jaw,.2);
  assert.equal(recipe.parameters.jaw,.8);
  assert.equal(valid.operations.find(row=>row.key==='jaw').value,.2);
  assert.equal(valid.runtimeVerified,false);
  assert.equal(valid.sourceMutationPerformed,false);
  for(const change of [{parameters:{jaw:2}},{parameters:{hp:100}},{parameters:{hair:'hair-b'}},{previousParameters:{}}]){
    const item=createAssetCustomizationPlan({assets,recipes:[{...recipe,lockedParameters:[],...change,...(change.previousParameters?{lockedParameters:['jaw']}:{})}]}).items[0];
    assert.equal(item.status,'AUTHORING_REQUIRED');assert.equal(item.operations.length,0);
  }
});

test('all visual families include UI and icons with validated color and state controls',()=>{
  const asset={id:'icon',family:'UI',sourceHash:'icon-v1',customization:{controls:{
    tint:{axis:'MATERIAL',kind:'COLOR',target:'Fill'},state:{axis:'STATE_VARIANT',kind:'CHOICE',target:'Frame',choices:['normal','selected']}
  }}};
  const make=parameters=>createAssetCustomizationPlan({assets:[asset],recipes:[{family:'UI',subfamily:'ICON',baseAssetId:'icon',parameters}]});
  const plan=make({tint:[.3,.4,.5,1],state:'selected'});
  assert.equal(plan.items[0].status,'DECLARED_BINDINGS_READY');
  assert.equal(plan.items[0].operations.length,2);
  assert.ok(plan.uiAndIconReview.scope.includes('ICON'));
  assert.ok(plan.families.includes('ENVIRONMENT'));
  assert.equal(make({tint:[2,0,0]}).items[0].operations.length,0);
  assert.equal(make({state:'unknown'}).items[0].status,'AUTHORING_REQUIRED');
  assert.equal(createAssetCustomizationPlan({recipes:[{family:'BUILDING'}]}).items[0].status,'AUTHORING_REQUIRED');
});

test('studio asset universe exposes broad reusable catalogs',()=>{
  assert.equal(STUDIO_ASSET_UNIVERSE_TARGET,'HIGH_END_STUDIO_ASSET_UNIVERSE');
  assert.deepEqual([...STUDIO_ASSET_FAMILIES],['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP']);
  assert.ok(CREATURE_BODY_PLANS.length>=30);
  assert.ok(CREATURE_SPECIES.length>=50);
  assert.equal(CLOTHING_LAYER_SLOTS.length,15);
  assert.ok(BIOME_FAMILIES.length>=18);
  assert.ok(BUILDING_THEMES.length>=12);
  for(const style of ['INK_WASH','WATERCOLOR','NOIR','TOON_NOIR','SOLARPUNK','BIOPUNK','RETRO_FUTURISM','COZY','PAPER_CRAFT','VOXEL','DREAMCORE','HISTORICAL_EAST_ASIAN','SPACE_OPERA','UNDERWATER_FANTASY','DESERT_FANTASY','MYTHIC_NORDIC']){
    assert.ok(createStudioAssetUniversePlan({styleFamily:style}).styleFamilies.includes(style),style);
  }
});

test('survival wildlife catalog includes forest animals with distinct visual profiles',()=>{
  for(const species of ['BEAR','BOAR','DEER','ELK','MOOSE','BISON','WOLF','COYOTE','FOX','RABBIT','RACCOON','SQUIRREL','BEAVER','BADGER','MOUNTAIN_GOAT','TURKEY','CROW']){
    assert.ok(SURVIVAL_WILDLIFE_SPECIES.includes(species),species);
    assert.ok(SURVIVAL_WILDLIFE_ARCHETYPES[species],species);
  }
  assert.equal(SURVIVAL_LOW_POLY_VISUAL_PROFILE.mesh.primitiveOnlyFinalAnimalForbidden,true);
  assert.equal(SURVIVAL_LOW_POLY_VISUAL_PROFILE.exactThirdPartyMeshTextureSkinCopy,false);
  const bear=createSurvivalWildlifeAssetProfile({species:'BEAR',platform:'ROBLOX'});
  assert.equal(bear.species,'BEAR');
  assert.equal(bear.bodyPlan,'QUADRUPED_HEAVY');
  assert.ok(bear.availableSkinVariants.includes('DARK_BROWN'));
  assert.equal(bear.visualRequirements.meshAndMaterialMustExceedPrimitivePlaceholder,true);
  assert.equal(bear.rigRequirements.rootOnlyMotionForbidden,true);
  assert.equal(bear.productionVerified,false);
});

test('wildlife skins require meaningful anatomy or material variation beyond recolor',()=>{
  const wolf=createSurvivalWildlifeAssetProfile({species:'WOLF',skinVariant:'DARK_GREY',platform:'ROBLOX'});
  const deer=createSurvivalWildlifeAssetProfile({species:'DEER',platform:'UNITY'});
  assert.equal(wolf.skinVariant,'DARK_GREY');
  assert.equal(wolf.visualRequirements.skinRequiresShapeOrMaterialVariationBeyondHue,true);
  assert.equal(deer.bodyPlan,'QUADRUPED_HOOFED');
  assert.equal(deer.platform,'UNITY');
  assert.equal(deer.runtimeVerificationRequired,true);
});

test('concept director supports weighted mixed concepts without flattening style identity',()=>{
  const concept=createConceptProfile({
    styles:[{family:'WUXIA',weight:6},{family:'DARK_FANTASY',weight:3},{family:'CARTOON',weight:1}],
    artTone:['MYSTERIOUS','DARK'],
    combatFeel:['WUXIA_FLOW']
  });
  assert.equal(concept.weightedStyles.length,3);
  assert.equal(concept.dominantStyle,'WUXIA');
  assert.ok(Math.abs(concept.weightedStyles.reduce((n,row)=>n+row.weight,0)-1)<0.001);
  assert.ok(CONCEPT_AXES.COMBAT_FEEL.includes('WUXIA_FLOW'));
  const compatible=evaluateConceptCompatibility({
    asset:{STYLE_FAMILY:'WUXIA',COMPATIBILITY_TAGS:['DARK_FANTASY']},
    concept
  });
  assert.equal(compatible.pass,true);
  const mismatch=evaluateConceptCompatibility({asset:{STYLE_FAMILY:'SCI_FI'},concept});
  assert.equal(mismatch.pass,false);
});

test('character identity adds deterministic persona voice memory and behavior intent without gameplay authority',()=>{
  const a=createVibeCharacterPersona({name:'연화',role:'companion',goal:'문파 기록 회수',traits:['guarded'],speechRhythm:'short-direct'},0);
  const b=createVibeCharacterPersona({name:'무진',role:'companion',goal:'마을 방어',traits:['proud'],speechRhythm:'rapid'},1);
  assert.equal(a.gameplayAuthority,false);
  assert.equal(a.voice.knowledgeBoundary,true);
  assert.equal(a.memoryContract.sourceEventRequired,true);
  assert.notEqual(a.voice.sentenceRhythm,b.voice.sentenceRhythm);
  const protective=resolveVibeCharacterBehaviorIntent({
    persona:{...a,behaviorIntent:{...a.behaviorIntent,socialTendency:'protective',riskTolerance:'low'}},
    context:{selfHealthRatio:.8,allyHealthRatio:.2,relationshipTrust:40,enemyVisible:true,newKnownFact:true,interactionAvailable:true}
  });
  assert.ok(protective.intents.includes('PROTECT_ALLY'));
  assert.ok(protective.intents.some(x=>x.startsWith('COMBAT_')));
  assert.ok(protective.intents.includes('CONTEXTUAL_DIALOGUE_FROM_KNOWN_INFORMATION'));
  assert.equal(protective.gameplayAuthority,false);
  assert.equal(protective.authoritativeActionRequired,true);

  const factionDriven=resolveVibeCharacterBehaviorIntent({
    persona:{...a,behaviorIntent:{...a.behaviorIntent,socialTendency:'reserved',riskTolerance:'low'}},
    context:{
      selfHealthRatio:.8,
      allyHealthRatio:.8,
      enemyVisible:true,
      interactionAvailable:true,
      factionRelationship:{hostile:80,fear:70,debt:25,trust:-40}
    }
  });
  assert.equal(factionDriven.factionContextUsed,true);
  assert.ok(factionDriven.intents.includes('FACTION_HOSTILITY_COMBAT_POSTURE'));
  assert.ok(factionDriven.intents.includes('FACTION_CAUTION_OR_RETREAT_INTENT'));
  assert.ok(factionDriven.intents.includes('FACTION_DEBT_DIALOGUE_OR_ASSIST_INTENT'));
  assert.equal(factionDriven.gameOwnedTargetSelectionRequired,true);
  assert.equal(factionDriven.gameplayAuthority,false);
  const diversity=createVibePopulationPersonaDiversity([
    {name:'연화',goal:'문파 기록 회수',speechRhythm:'short-direct'},
    {name:'무진',goal:'마을 방어',speechRhythm:'rapid'}
  ]);
  assert.equal(diversity.pass,true);
});

test('game visual DNA keeps mixed concept identity stable across asset selection',()=>{
  const concept=createConceptProfile({styles:[{family:'WUXIA',weight:7},{family:'DARK_FANTASY',weight:3}]});
  const dna=createGameVisualDNA({
    gameId:'dark-wuxia',
    concept,
    worldDna:{BIOME:'MOUNTAIN'},
    motionLanguage:'flowing-sword',
    uiLanguage:'ink-metal'
  });
  assert.equal(dna.gameId,'dark-wuxia');
  assert.equal(dna.concept.dominantStyle,'WUXIA');
  assert.equal(dna.languages.BIOME,'MOUNTAIN');
  assert.equal(dna.gameStyleLockWins,true);

  const assets=[
    {id:'verified-wuxia',family:'WEAPON',subfamily:'MELEE',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,styleFamily:'WUXIA',platformVariant:'UNITY'},
    {id:'failed-wuxia',family:'WEAPON',subfamily:'MELEE',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,styleFamily:'WUXIA',platformVariant:'UNITY'},
    {id:'sci-fi',family:'WEAPON',subfamily:'MELEE',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,styleFamily:'SCI_FI',platformVariant:'UNITY'}
  ];
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'WEAPON',subfamily:'MELEE'}],
    assets,
    gameDna:{...dna,targetPlatform:'UNITY'},
    usageByAsset:{'verified-wuxia':{runtimePass:true,gameConsumerCount:3},'failed-wuxia':{runtimeFailure:true,verifiedFailureCount:2}}
  });
  assert.equal(loadout.complete,true);
  assert.equal(loadout.selections[0].assetId,'verified-wuxia');
  assert.equal(scoreStudioAssetCandidate({asset:assets[2],gameDna:{...dna,targetPlatform:'UNITY'}}).rejected,true);
});

test('company asset promotion is impossible without actual native runtime consumer evidence',()=>{
  const asset={id:'wolf-runtime',family:'CREATURE',platform:'ROBLOX',path:'assets/wolf.glb',license:'project-original',sourceHash:'wolf-v1'};
  const blocked=evaluateCompanyAssetPromotion({
    asset,consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{platform:'ROBLOX',sourceHash:'wolf-v1',nativeBindingPass:true,visualRuntimePass:true}
  });
  assert.equal(blocked.eligible,false);
  assert.ok(blocked.blockers.includes('MOBILE_PERFORMANCE_PASS_REQUIRED'));
  assert.equal(blocked.promotion,null);

  const evidence={
    id:'studio-run-1',assetId:'wolf-runtime',platform:'ROBLOX',gameId:'survival',sourceHash:'wolf-v1',
    nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true
  };
  const hashless=evaluateCompanyAssetPromotion({
    asset,consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{assetId:'wolf-runtime',platform:'ROBLOX',gameId:'survival',nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true}
  });
  assert.equal(hashless.eligible,false);
  assert.ok(hashless.blockers.includes('RUNTIME_ASSET_HASH_REQUIRED'));

  const ready=evaluateCompanyAssetPromotion({asset,consumer:{gameId:'survival'},runtimeEvidence:evidence});
  assert.equal(ready.eligible,true);
  assert.equal(ready.promotion.verifiedCompanyReusable,true);
  assert.equal(ready.promotion.productionVerified,true);
  assert.equal(ready.promotion.runtimeVerificationState,'VERIFIED_NATIVE_RUNTIME');

  const promoted=promoteVerifiedCompanyAssetRegistry({registry:{version:28,assets:[]},asset,consumer:{gameId:'survival'},runtimeEvidence:evidence});
  assert.equal(promoted.updated,true);
  assert.equal(promoted.registry.version,29);
  assert.equal(promoted.registry.assets.length,1);
  assert.equal(promoted.registry.assets[0].status,'VERIFIED_COMPANY_ASSET');

  const derivedAsset={id:'wolf-derived',family:'CREATURE',platform:'ROBLOX',path:'assets/wolf-derived.glb',license:'project-original-derivative',sourceSha256:'source-v1',derivedSha256:'artifact-v2'};
  const exactBatch=promoteVerifiedCompanyAssetsFromRuntimeEvidence({
    registry:{version:28,assets:[derivedAsset]},
    consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{
      id:'studio-run-2',platform:'ROBLOX',gameId:'survival',assetIds:['wolf-derived'],
      assets:[{assetId:'wolf-derived',sourceHash:'source-v1',artifactHash:'artifact-v2'}],
      nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true
    }
  });
  assert.equal(exactBatch.updated,true);
  assert.deepEqual([...exactBatch.promotedAssetIds],['wolf-derived']);
  assert.equal(exactBatch.registry.assets[0].verifiedCompanyReusable,true);
  const noIdentity=promoteVerifiedCompanyAssetsFromRuntimeEvidence({
    registry:{version:28,assets:[derivedAsset]},
    consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true}
  });
  assert.equal(noIdentity.updated,false);
  assert.equal(noIdentity.reason,'EXPLICIT_RUNTIME_ASSET_IDS_REQUIRED');
});

test('future demand creature blueprint platform optimizer testbed and usage feedback stay preparation or verified-evidence bounded',()=>{
  const coverage={rows:[
    {family:'CREATURE',subfamily:'SPECIES',missingSlots:3,coveragePercent:25},
    {family:'BUILDING',subfamily:'MODULAR_EXTERIOR',missingSlots:1,coveragePercent:70}
  ]};
  const forecast=buildFutureAssetDemandForecast({
    gameDemands:[
      {gameId:'g1',priorityWeight:2,requirements:[{family:'CREATURE',subfamily:'SPECIES',count:4}]},
      {gameId:'g2',priorityWeight:1,requirements:[{family:'BUILDING',subfamily:'MODULAR_EXTERIOR',count:2}]}
    ],
    coverageReport:coverage
  });
  assert.equal(forecast.highestPriority.family,'CREATURE');
  assert.equal(forecast.maySelfPromoteVerified,false);

  const creature=createCreatureSpeciesBlueprint({
    bodyPlan:'QUADRUPED_CANINE',species:'WOLF',
    concept:{styles:[{family:'DARK_FANTASY',weight:1}]},
    silhouette:'low-spined-long-jaw',locomotion:'stalking-quadruped',attackLanguage:'circle-then-lunge',
    signatureSkill:'shadow-pounce',audioIdentity:'dry-growl',hitDeathIdentity:'collapse-and-kick'
  });
  assert.equal(creature.complete,true);
  assert.equal(creature.gameplayStatsAuthority,false);

  const variant=createPlatformAssetVariantPlan({platform:'ROBLOX',deviceClass:'MOBILE',sourceAssetId:'wolf'});
  assert.equal(variant.runtimeVerificationRequired,true);
  assert.ok(variant.preserve.includes('DAMAGE'));

  const testbed=createStudioTestbedPlan({assetIds:['wolf'],platform:'ROBLOX',mobile:true});
  assert.equal(testbed.testbedPassMayPromoteCompanyAsset,false);
  assert.equal(testbed.actualGameRuntimeStillRequired,true);

  const usage=summarizeVerifiedAssetUsage({events:[
    {assetId:'wolf',gameId:'g1',verifiedRuntimePass:true,count:3},
    {assetId:'wolf',gameId:'g2',verifiedRuntimeFailure:true,failureReason:'FOOT_SLIDE'}
  ]});
  assert.equal(usage.rows[0].gameConsumerCount,2);
  assert.equal(usage.rows[0].positiveLearningEligible,true);
  assert.equal(usage.rows[0].negativeLearningEligible,true);
  assert.equal(usage.rawTelemetryDirectTrainingAllowed,false);
});

test('asset DNA and style bible preserve semantic identity',()=>{
  const dna=createAssetDNA({
    id:'goblin-armor',
    family:'CHARACTER',
    subfamily:'ARMOR',
    bodyPlan:'SMALL_HUMANOID_BIPED',
    styleFamily:'CARTOON',
    layerSlot:'TORSO_OUTER',
    platformVariant:'ROBLOX'
  });
  assert.equal(dna.FAMILY,'CHARACTER');
  assert.equal(dna.LAYER_SLOT,'TORSO_OUTER');
  assert.equal(dna.RUNTIME_VERIFICATION_STATE,'PREPARED_SEMANTIC');
  const bible=createStyleBible({styleFamily:'CARTOON'});
  const qa=evaluateStyleBible({...dna,SILHOUETTE_CLASS:'SMALL_HUMANOID'},bible);
  assert.equal(qa.pass,true);
});

test('identity QA rejects color-only variants and accepts meaningful creature identity changes',()=>{
  const base={FAMILY:'CREATURE',SUBFAMILY:'SPECIES',BODY_PLAN:'QUADRUPED_CANINE',STYLE_FAMILY:'DARK_FANTASY'};
  const color=evaluateAssetIdentity({
    candidate:base,reference:base,
    differences:{silhouette:0.1,locomotion:0.1,attackLanguage:0.1,colorOnly:true}
  });
  assert.equal(color.distinct,false);
  assert.equal(color.colorOnlyRejected,true);
  const distinct=evaluateAssetIdentity({
    candidate:base,reference:base,
    differences:{silhouette:0.9,locomotion:0.7,attackLanguage:0.8,signatureSkill:0.7,audioIdentity:0.5,deathOrHit:0.6}
  });
  assert.equal(distinct.distinct,true);
  assert.ok(distinct.score>=55);
});

test('clothing layer compatibility catches clipping body rig and duplicate slots',()=>{
  const valid=checkClothingLayerCompatibility({
    bodyPlan:'HUMANOID',rigProfile:'HUMANOID',styleFamily:'FANTASY',
    items:[
      {id:'shirt',LAYER_SLOT:'TORSO_INNER',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY'},
      {id:'armor',LAYER_SLOT:'TORSO_OUTER',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY'}
    ]
  });
  assert.equal(valid.pass,true);
  const invalid=checkClothingLayerCompatibility({
    bodyPlan:'HUMANOID',rigProfile:'HUMANOID',styleFamily:'FANTASY',
    items:[
      {id:'shoulder',LAYER_SLOT:'SHOULDER',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY',largeVolume:true},
      {id:'cape',LAYER_SLOT:'CAPE',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY',largeVolume:true},
      {id:'cape2',LAYER_SLOT:'CAPE',BODY_PLAN:'HUMANOID',RIG_PROFILE:'HUMANOID',STYLE_FAMILY:'FANTASY'}
    ]
  });
  assert.equal(invalid.pass,false);
  assert.ok(invalid.conflicts.includes('CAPE_SHOULDER_VOLUME_CONFLICT'));
  assert.ok(invalid.conflicts.some(x=>x.startsWith('DUPLICATE_LAYER_SLOT:CAPE')));
});

test('outfit theme grammar blocks cross-theme nonsense',()=>{
  const result=checkOutfitThemeGrammar({
    theme:'MEDIEVAL',
    items:[{id:'linen',themeTags:['MEDIEVAL']},{id:'cyber-jacket',themeTags:['CYBERPUNK']}]
  });
  assert.equal(result.pass,false);
  assert.deepEqual([...result.violations],['cyber-jacket']);
});

test('building grammar enforces structure navigation and collision',()=>{
  const bad=validateBuildingGrammar({
    modules:[{type:'DOOR'},{type:'UPPER_FLOOR'}],
    navigation:{playerClear:false,npcClear:true,collisionValid:true}
  });
  assert.equal(bad.pass,false);
  assert.ok(bad.failures.includes('NO_FLOATING_DOOR'));
  assert.ok(bad.failures.includes('STAIRS_CONNECT_FLOORS'));
  assert.ok(bad.failures.includes('ROOF_REQUIRED'));
  assert.ok(bad.failures.includes('PLAYER_NAV_BLOCKED'));
  assert.equal(bad.blocksVerifiedPromotion,true);
  const good=validateBuildingGrammar({
    modules:[{type:'WALL'},{type:'DOOR'},{type:'UPPER_FLOOR'},{type:'STAIRS'},{type:'ROOF'}],
    navigation:{playerClear:true,npcClear:true,collisionValid:true}
  });
  assert.equal(good.pass,true);
});

test('biome DNA and prop density remain composition-aware and mobile-budgeted',()=>{
  const biome=createBiomeDNA({
    biome:'SNOW',
    ground:['snow'],rock:['ice-rock'],tree:['pine'],plant:['winter-bush'],cliff:['snow-cliff'],
    water:['frozen-lake'],fog:['cold-fog'],particle:['snowfall'],sky:['overcast'],lighting:['cold-light'],
    landmark:['ice-temple'],smallProp:['snow-log'],ambience:['wind'],creaturePreference:['wolf'],
    architecturePreference:['snow-village']
  });
  assert.equal(biome.biome,'SNOW');
  assert.deepEqual([...biome.channels.CREATURE_PREFERENCE],['wolf']);
  const density=createPropDensityProfile({biome:'SNOW',deviceClass:'MOBILE',cameraDistance:20});
  assert.equal(density.mobileReductionApplied,true);
  assert.ok(density.smallPropDensity<0.8);
});

test('skill damage and destruction presentation stay presentation-only',()=>{
  const skill=createSkillPresentationKit({
    id:'fireball',skillFamily:'FIRE',
    castMotion:'cast',vfx:'charge',projectile:'fireball',impact:'explode',audio:'fire-sfx',camera:'impact-kick',reaction:'burn-hit'
  });
  assert.equal(skill.complete,true);
  assert.equal(skill.gameplayDamageCooldownAndTargetingAuthority,false);
  const damage=createDamagePresentation({family:'FIRE',reaction:'burn',vfx:'flame',audio:'hit',cameraFeedback:'kick'});
  assert.equal(damage.complete,true);
  assert.equal(damage.gameplayDamageAuthority,false);
  const destroy=createDestructionProfile({family:'STONE_BREAK',lod:'FULL',fragments:30,vfx:'dust',audio:'stone'});
  assert.equal(destroy.mobileSafe,false);
  assert.equal(destroy.gameplayCollisionAuthority,false);
});

test('cross-asset graph blocks unresolved required links',()=>{
  const graph=createAssetCompatibilityGraph({
    nodes:[{id:'goblin',family:'CREATURE'},{id:'rig',family:'RIG'}],
    edges:[
      {from:'goblin',to:'rig',type:'USES',required:true},
      {from:'goblin',to:'missing-sword',type:'USES',required:true}
    ]
  });
  assert.equal(graph.valid,false);
  assert.equal(graph.unresolved.length,1);
});

test('universal coverage separates verified assets from prepared semantic work',()=>{
  const assets=[
    {id:'verified-body',family:'CHARACTER',subfamily:'BODY',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true},
    {id:'prepared-body',family:'CHARACTER',subfamily:'BODY',status:'PREPARED_SEMANTIC'},
    {id:'repo-body',family:'CHARACTER',subfamily:'BODY',status:'REPO_ASSET'}
  ];
  const coverage=scanUniversalAssetCoverage({
    assets,
    baselines:{CHARACTER:{BODY:3}},
    activeDemand:{CHARACTER:{BODY:1}},
    platform:'UNITY',
    styleFamily:'STYLIZED_FANTASY'
  });
  assert.equal(coverage.rows[0].availableVerified,1);
  assert.equal(coverage.rows[0].availablePrepared,1);
  assert.equal(coverage.rows[0].missingSlots,2);
  assert.equal(coverage.overallCoveragePercent,33);
});

test('heatmap and autonomous gap fill prioritize real gaps without false promotion',()=>{
  const coverage=scanUniversalAssetCoverage({
    assets:[],
    baselines:{CREATURE:{SPECIES:3},BUILDING:{MODULAR_EXTERIOR:2}},
    activeDemand:{CREATURE:{SPECIES:1},BUILDING:{MODULAR_EXTERIOR:0}},
    platform:'ROBLOX',
    styleFamily:'CARTOON'
  });
  const heat=buildLibraryHeatmap({
    coverageReport:coverage,
    signalsByKey:{'CREATURE:SPECIES':{activeGameDemand:true,heroBossLandmark:true,playerVisibleFrequencyHigh:true}}
  });
  assert.equal(heat.highestPriorityGap.family,'CREATURE');
  const fill=buildAutonomousAssetGapFillPlan({
    coverageReport:coverage,
    verifiedAssets:[],
    repositoryAssets:[],
    externalSources:[{id:'licensed-creature-pack',category:'CREATURE',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE'}],
    signalsByKey:{'CREATURE:SPECIES':{activeGameDemand:true}}
  });
  const creature=fill.actions.find(x=>x.family==='CREATURE');
  assert.equal(creature.route,'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET');
  assert.equal(creature.preparedMayClaimVerified,false);
  assert.equal(creature.nativeRuntimeConsumerRequiredBeforePromotion,true);
  assert.ok(creature.semanticSeeds.length>0);
});

test('asset lineage preserves provenance and native verification linkage',()=>{
  const lineage=createAssetLineage({
    assetId:'goblin-cartoon-unity',
    parentId:'goblin-base',
    sourceId:'source-001',
    sourceHash:'abc',
    derivedHash:'def',
    transformHistory:['retarget','cartoon-style'],
    licenseEvidence:'license',
    platform:'UNITY',
    styleFamily:'CARTOON',
    gameId:'demo',
    verificationSha:'sha',
    runtimeEvidenceId:'evidence'
  });
  assert.equal(lineage.complete,true);
  assert.equal(lineage.originalImmutable,true);
  assert.equal(lineage.revalidateDerivedWhenParentImproves,true);
});

test('base material rotation retires only eligible atoms and refills through existing 24H gap fill',()=>{
  const plan=buildBaseMaterialRotationPlan({
    families:{
      PROP:['CHAIR','TABLE','BED','SHELF','BENCH'],
      WEAPON:['BLADE','GRIP','GUARD']
    },
    minimumPerFamily:2,
    maxRetirePerFamilyPerCycle:2,
    staleAfterCycles:30,
    usageByAtom:{
      CHAIR:{usageCount:0,unusedCycles:40},
      TABLE:{duplicateOf:'CHAIR'},
      BED:{verifiedRuntimeFailure:true},
      SHELF:{gameLocked:true,usageCount:0,unusedCycles:100},
      BENCH:{mastered:true,masteryScore:100,verifiedPassCount:3},
      BLADE:{compatibilityFailureCount:2},
      GRIP:{manualLocked:true,compatibilityFailureCount:5}
    }
  });
  assert.equal(plan.physicalDeleteForbidden,true);
  assert.equal(plan.historyPreserved,true);
  assert.equal(plan.usesExistingGapFill,true);
  assert.equal(plan.retireCount,3);
  assert.equal(plan.graduateCount,1);
  assert.equal(plan.refillCount,4);
  assert.equal(plan.retired.some(row=>row.atom==='CHAIR'),false);
  assert.ok(plan.retired.some(row=>row.atom==='TABLE'));
  assert.ok(plan.retired.some(row=>row.atom==='BED'));
  assert.ok(plan.retired.some(row=>row.atom==='BLADE'));
  assert.ok(plan.graduated.some(row=>row.atom==='BENCH'&&row.productionReusable===true));
  assert.equal(plan.retired.some(row=>row.atom==='SHELF'),false);
  assert.equal(plan.retired.some(row=>row.atom==='GRIP'),false);
  assert.ok(plan.productionActive.PROP.includes('BENCH'));
  assert.equal(plan.learningActive.PROP.includes('BENCH'),false);
  assert.ok(plan.active.PROP.length>=2);
  assert.ok(plan.active.WEAPON.length>=2);
  assert.equal(plan.masteredMaterialRemainsProductionReusable,true);
  assert.equal(plan.masteredMaterialLeavesLearningExpansionPool,true);
  assert.ok(plan.refill.every(row=>row.route==='EXISTING_24H_GAP_FILL'));
});

test('company registry fills composable base material atoms without false verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const base=registry.baseMaterialLibrary;
  assert.equal(base.status,'PREPARED_SEMANTIC_ATOM_LIBRARY');
  assert.equal(base.productionVerified,false);
  assert.ok(base.atomCount>=350);
  assert.deepEqual(Object.keys(base.families).sort(),[...STUDIO_ASSET_FAMILIES].sort());
  for(const family of STUDIO_ASSET_FAMILIES)assert.ok(base.families[family].length>=20,family);
  assert.ok(base.mutationAxes.includes('MATERIAL'));
  assert.ok(base.mutationAxes.includes('FACTION'));
  assert.equal(base.combinationRules.colorOnlyVariantDoesNotCount,true);
  assert.equal(base.combinationRules.actualRuntimeQaRequiredBeforeVerifiedPromotion,true);
  assert.ok(registry.variantRecipeTemplates.some(row=>row.id==='BOSS_VARIANT'&&row.minimumDistinctAxes>=7));
  assert.equal(registry.identityBudgets.BOSS.distinctMotionRequired,true);
  assert.equal(registry.baseMaterialRotation.status,'ACTIVE_AUTOMATIC_ROTATION');
  assert.equal(registry.baseMaterialRotation.hardDeleteForbidden,true);
  assert.equal(registry.baseMaterialRotation.refillSameCycle,true);
  assert.equal(registry.baseMaterialRotation.refillRoute,'EXISTING_24H_GAP_FILL');
  assert.equal(registry.baseMaterialRotation.graduationTrigger,'VERIFIED_MASTERY_SATURATED');
  assert.equal(registry.baseMaterialRotation.masteredMaterialRemainsProductionReusable,true);
  assert.equal(registry.baseMaterialRotation.masteredMaterialCreatesNewDiversityRefillSlot,true);
});

test('company registry exposes semantic template space without claiming production verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  assert.equal(registry.studioAssetUniverse.target,'HIGH_END_STUDIO_ASSET_UNIVERSE');
  assert.equal(registry.studioAssetUniverse.productionVerified,false);
  assert.ok(registry.studioAssetUniverse.creatureCatalog.bodyPlans.length>=30);
  assert.ok(registry.studioAssetUniverse.creatureCatalog.species.length>=50);
  assert.equal(registry.studioAssetUniverse.semanticTemplateSpace.productionVerified,false);
  assert.equal(registry.studioAssetUniverse.semanticTemplateSpace.clothing.themeLayerCombinations,225);
  assert.equal(registry.studioAssetUniverse.semanticTemplateSpace.biome.biomeChannelSlots,270);
  assert.ok(registry.studioAssetUniverse.conceptCatalog.presetFamilies.includes('INK_WASH'));
  assert.ok(registry.studioAssetUniverse.conceptCatalog.presetFamilies.includes('SPACE_OPERA'));
  assert.equal(registry.studioAssetUniverse.worldGenerationCatalog.referenceImageObservation.supported,true);
  assert.equal(registry.studioAssetUniverse.worldGenerationCatalog.referenceImageObservation.sourceBound,true);
  assert.equal(registry.studioAssetUniverse.worldGenerationCatalog.referenceImageObservation.rawProtectedReferencePersistentLearningForbidden,true);
  assert.equal(registry.universalCoverage.preparedSemanticDoesNotCountAsVerified,true);
});

test('full studio asset universe plan exposes coverage heatmap and 24h gap fill',()=>{
  const plan=createStudioAssetUniversePlan({
    assets:[],
    repositoryAssets:[],
    externalSources:[],
    platform:'UNITY',
    styleFamily:'CARTOON'
  });
  assert.equal(plan.target,STUDIO_ASSET_UNIVERSE_TARGET);
  assert.equal(plan.continuous24h,true);
  assert.equal(plan.existingCanonicalLearningChainOnly,true);
  assert.equal(plan.preparedSemanticMayClaimVerified,false);
  assert.equal(plan.concept.dominantStyle,'CARTOON');
  assert.ok(plan.styleFamilies.includes('WUXIA'));
  assert.equal(plan.gameVisualDna.gameStyleLockWins,true);
  assert.equal(plan.testbed.actualGameRuntimeStillRequired,true);
  assert.equal(plan.usageFeedback.existingCanonicalLearningChainOnly,true);
  assert.ok(plan.coverage.missingSlotCount>0);
  assert.ok(plan.heatmap.highestPriorityGap);
  assert.ok(plan.gapFill.actions.length>0);
});

test('natural language concept inference covers full preset families and concept axes',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const plan=buildVibeAssetProductionPlan({
    task:{
      gameId:'concept-language-test',
      goal:'치비 동화풍 몽환 다크 밀리터리 SF 디젤펑크 수묵 무협 분위기 신비롭고 웅장하게 패링과 보스 결투 중심 시네마틱'
    },
    target:'unity',
    repoRoot:path.resolve(here,'..')
  });
  const concept=plan.companyGraphicsLibrary.studioAssetUniverse.conceptDirector.requested;
  const styles=concept.weightedStyles.map(row=>row.family);
  for(const style of ['CHIBI','FAIRYTALE','DREAMLIKE','DARK_FANTASY','MILITARY_SCI_FI','DIESELPUNK','INK_WASH','WUXIA'])assert.ok(styles.includes(style),style);
  for(const tone of ['MYSTERIOUS','DARK','EPIC'])assert.ok(concept.axes.ART_TONE.includes(tone),tone);
  assert.ok(concept.axes.WORLD_ERA.includes('WUXIA'));
  assert.ok(concept.axes.WORLD_ERA.includes('FUTURE'));
  assert.ok(concept.axes.COMBAT_FEEL.includes('PARRY'));
  assert.ok(concept.axes.COMBAT_FEEL.includes('BOSS_DUEL'));
  assert.ok(concept.axes.PRESENTATION.includes('CINEMATIC'));
  assert.ok(concept.axes.PRESENTATION.includes('HAND_PAINTED'));
});

test('asset production planner consumes the studio universe contract',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'studio-universe-test',goal:'수묵 무협 다크 판타지 스페이스 오페라 몬스터 의복 건물 숲 배경 스킬 VFX 추가'},
    target:'unity',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.target,'HIGH_END_STUDIO_ASSET_UNIVERSE');
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.creatureBodyPlans.length>=30);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.creatureSpecies.length>=50);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.coverage.missingSlotCount>0);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.plannedSemanticSeedCount>0);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.preparedSemanticMayNotClaimVerified,true);
  assert.equal(plan.policy.universalAssetCoverageScannerRequired,true);
  assert.equal(plan.policy.assetIdentityQaRequired,true);
  assert.equal(plan.policy.autonomousLibraryPopulation24h,true);
  assert.equal(plan.policy.semanticAssetSeedCannotSelfPromote,true);
  assert.equal(plan.policy.conceptDirectorRequired,true);
  assert.equal(plan.policy.weightedConceptBlendAllowed,true);
  assert.equal(plan.policy.adaptiveWorldGenerationRequired,true);
  assert.equal(plan.policy.mapDnaRequired,true);
  assert.equal(plan.policy.seamlessStreamingPlanRequired,true);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.conceptDirector.requested.weightedStyles.length>=4);
  const requestedStyles=plan.companyGraphicsLibrary.studioAssetUniverse.conceptDirector.requested.weightedStyles.map(row=>row.family);
  assert.ok(requestedStyles.includes('INK_WASH'));
  assert.ok(requestedStyles.includes('WUXIA'));
  assert.ok(requestedStyles.includes('DARK_FANTASY'));
  assert.ok(requestedStyles.includes('SPACE_OPERA'));
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.worldGenerationStudio.directLayoutCopyForbidden,true);
});


test('reusable asset coverage drives 300 verified motion slots and all studio families through existing gap fill',()=>{
  const motionTarget=Object.values(DEFAULT_COVERAGE_BASELINES.MOTION).reduce((sum,count)=>sum+Number(count||0),0);
  assert.equal(motionTarget,300);
  for(const family of STUDIO_ASSET_FAMILIES)assert.ok(DEFAULT_COVERAGE_BASELINES[family],family);
  for(const role of ['LOCOMOTION','TRAVERSAL','COMBAT','WEAPON_COMBAT','SURVIVAL_CRAFTING','INTERACTION_UTILITY','REACTION']){
    assert.ok(DEFAULT_COVERAGE_BASELINES.MOTION[role]>0,role);
  }
  const registry=JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'..','company-asset-library.json'),'utf8'));
  assert.equal(registry.motionCoverage.reusableVerifiedTarget,300);
  assert.equal(registry.universalCoverage.reusableProductionTargets.motionVerifiedReusableTarget,300);
  assert.equal(registry.universalCoverage.reusableProductionTargets.nativeRuntimePassRequiredForVerifiedCount,true);
  assert.equal(registry.universalCoverage.productionVerifiedAssetCount,0);
});

test('asset production plan exposes dedicated asset lane and reusable cross-genre production target',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'reusable-asset-target-test',goal:'생존 RPG 액션용 캐릭터 모션 배경 무기 VFX UI 자산 제작'},
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(plan.companyGraphicsLibrary.executionLane,'ASSET_DEVELOPMENT');
  assert.equal(plan.companyGraphicsLibrary.reusableProductionTarget.motion.verifiedReusableClipTarget,300);
  assert.deepEqual(plan.companyGraphicsLibrary.reusableProductionTarget.motion.crossGenreReuse,['RPG','SURVIVAL','ACTION','ADVENTURE','TYCOON']);
  assert.ok(plan.companyGraphicsLibrary.studioAssetUniverse.coverage.missingSlotCount>=300);
  assert.equal(plan.companyGraphicsLibrary.studioAssetUniverse.preparedSemanticMayNotClaimVerified,true);
});


test('asset customization emits automatic inspect-repair-author-apply chain with distance detail',()=>{
  const assets=[{
    id:'hero-body',family:'CHARACTER',sourceHash:'hero-v1',
    customization:{controls:{jaw:{kind:'MORPH',axis:'FACE',target:'Jaw',min:0,max:1}}}
  }];
  const plan=createAssetCustomizationPlan({
    assets,platform:'ROBLOX',
    recipes:[{
      id:'hero',family:'CHARACTER',baseAssetId:'hero-body',
      previousParameters:{jaw:.2},editableParameters:['jaw'],parameters:{jaw:.35},
      identityAnchors:['ONE_HORN']
    }]
  });
  assert.deepEqual([...plan.automaticProductionChain.sequence],['INSPECT','DEFINE_REPAIR','AUTHOR','APPLY','REINSPECT']);
  assert.equal(plan.automaticProductionChain.reportOnlyInspectionForbidden,true);
  assert.equal(plan.automaticProductionChain.reportOnlyRepairPlanForbidden,true);
  const hero=plan.items[0];
  assert.equal(hero.productionChain.automaticAdvance,true);
  assert.equal(hero.productionChain.author.editableSourceRequired,true);
  assert.ok(hero.precisionProduction.construction.includes('FACE_HANDS_FEET'));
  assert.ok(hero.precisionProduction.detailByDistance.GAME_CAMERA.includes('ROLE_SILHOUETTE'));
  assert.ok(hero.precisionProduction.detailByDistance.CONTACT.includes('HAND_WEAPON_GRIP'));
  assert.ok(hero.productionChain.apply.steps.includes('IMPORT_TO_EXISTING_ROBLOX_GAME_ASSET_PATH'));
  assert.equal(hero.productionChain.reinspect.failedRegionOnlyReentersRepair,true);
  assert.ok(plan.causalDetailRules.includes('RANDOM_NOISE_IS_NOT_DETAIL'));
  assert.ok(plan.uiAndIconReview.scope.includes('MINIMAP'));
  assert.ok(plan.uiAndIconReview.scope.includes('INTERACTION'));
});
