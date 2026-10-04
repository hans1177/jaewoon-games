// 파일명: qa/vibe-studio-asset-universe.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  STUDIO_ASSET_UNIVERSE_TARGET,
  STUDIO_ASSET_FAMILIES,
  STUDIO_ASSET_QUALITY_MAX,
  STUDIO_ASSET_QUALITY_WEIGHTS,
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
  createStudioAssetFamilyPlan,
  buildStudioAssetQuality120Program,
  createConceptProfile,
  evaluateConceptCompatibility,
  createGameVisualDNA,
  scoreStudioAssetQuality120,
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

const fullQualityEvidence=Object.freeze({
  SILHOUETTE_FORM:100,
  MODELING_STRUCTURE:100,
  MATERIAL_TEXTURE:100,
  COLOR_LIGHTING:100,
  WORLD_STYLE_COHERENCE:100,
  DETAIL_DENSITY:100,
  MOTION_LIVINGNESS:100,
  GAME_CAMERA_READABILITY:100,
  UI_UX_COHERENCE:100,
  VFX_AUDIO_COHESION:100,
  ORIGINALITY_IDENTITY:100,
  MOBILE_PERFORMANCE:100
});

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
  const generatedBatch=promoteVerifiedCompanyAssetsFromRuntimeEvidence({
    registry:{version:28,assets:[]},
    consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{
      id:'studio-run-generated',platform:'ROBLOX',gameId:'survival',assetIds:['generated-boss'],
      assets:[{
        assetId:'generated-boss',family:'CREATURE',path:'assets/roblox/survival/native/boss.glb',
        license:'project-original',sourceHash:'generated-source',artifactHash:'generated-artifact',
        generatedByDeclaredRecipe:true,persistedForCandidate:true
      }],
      nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true
    }
  });
  assert.equal(generatedBatch.updated,true);
  assert.deepEqual([...generatedBatch.promotedAssetIds],['generated-boss']);
  assert.equal(generatedBatch.registry.assets[0].status,'VERIFIED_COMPANY_ASSET');
  assert.equal(generatedBatch.registry.assets[0].verifiedCompanyReusable,true);
  assert.equal(generatedBatch.registry.assets[0].path,'assets/roblox/survival/native/boss.glb');

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


// Studio Asset AI 120 quality evolution
test('studio asset quality weights total 120',()=>{
  assert.equal(STUDIO_ASSET_QUALITY_MAX,120);
  assert.equal(Object.values(STUDIO_ASSET_QUALITY_WEIGHTS).reduce((sum,value)=>sum+value,0),120);
});

test('runtime-verified fully measured asset reaches 120 without making score a binding gate',()=>{
  const result=scoreStudioAssetQuality120({
    asset:{
      id:'hero-wolf',
      family:'CREATURE',
      productionVerified:true,
      verifiedCompanyReusable:true,
      runtimeVerificationState:'VERIFIED_NATIVE_RUNTIME',
      consumerGameIds:['survival']
    },
    evidence:fullQualityEvidence
  });
  assert.equal(result.score,120);
  assert.equal(result.grade,'MASTER_ASSET');
  assert.equal(result.scoreBlocksDevelopmentBinding,false);
  assert.equal(result.productionVerified,true);
});

test('lower quality compatible asset still binds when it is the only usable choice',()=>{
  const asset={
    id:'rough-potion',
    family:'PROP',
    subfamily:'ITEM',
    status:'REPO_ASSET',
    platform:'ROBLOX',
    qualityEvidence:{
      SILHOUETTE_FORM:65,
      MODELING_STRUCTURE:55,
      MATERIAL_TEXTURE:45,
      GAME_CAMERA_READABILITY:70,
      MOBILE_PERFORMANCE:90
    }
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'PROP',subfamily:'ITEM',required:true}],
    assets:[asset],
    gameDna:{targetPlatform:'ROBLOX'},
    usageByAsset:{}
  });
  assert.equal(loadout.complete,true);
  assert.equal(loadout.selections[0].assetId,'rough-potion');
  assert.equal(loadout.selections[0].lowQualityFallback,true);
  assert.equal(loadout.selections[0].qualityScoreBlocksBinding,false);
  assert.equal(loadout.qualityScoreIsNotBindingGate,true);
});

test('quality program includes item and UI family outputs and evolves the weakest asset first',()=>{
  const program=buildStudioAssetQuality120Program({
    assets:[
      {
        id:'hero-player',
        family:'CHARACTER',
        hero:true,
        qualityEvidence:{...fullQualityEvidence,SILHOUETTE_FORM:95}
      },
      {
        id:'healing-item',
        family:'PROP',
        subfamily:'ITEM',
        functionClass:'CONSUMABLE',
        qualityEvidence:{SILHOUETTE_FORM:40,MODELING_STRUCTURE:35,MATERIAL_TEXTURE:30}
      },
      {
        id:'hud-main',
        family:'UI',
        qualityEvidence:{UI_UX_COHERENCE:75,GAME_CAMERA_READABILITY:80}
      }
    ],
    familyOutputsByAsset:{
      'healing-item':['WORLD_MODEL']
    }
  });
  const itemPlan=program.familyPlans.find(row=>row.assetId==='healing-item');
  const uiPlan=program.familyPlans.find(row=>row.assetId==='hud-main');
  assert.equal(itemPlan.itemPresentationRequired,true);
  assert.ok(itemPlan.requiredOutputs.includes('INVENTORY_ICON_WHEN_ITEM'));
  assert.ok(uiPlan.requiredOutputs.includes('HUD_COMPONENT'));
  assert.equal(program.heroBaseline.heroAssetIds.includes('hero-player'),true);
  assert.equal(program.evolutionQueue[0].assetId,'healing-item');
  assert.equal(program.evolutionQueue[0].worstPartFirst,true);
  assert.equal(program.qualityScoreIsNotADevelopmentBindingGate,true);
});

test('120 quality never substitutes for native runtime promotion evidence',()=>{
  const asset={
    id:'perfect-looking-unverified',
    family:'CREATURE',
    platform:'ROBLOX',
    license:'project-original',
    sourceHash:'source-hash',
    artifactHash:'artifact-hash',
    path:'assets/perfect.glb',
    qualityEvidence:fullQualityEvidence
  };
  const decision=evaluateCompanyAssetPromotion({
    asset,
    consumer:{gameId:'monster-adventure',platform:'ROBLOX'},
    runtimeEvidence:{
      platform:'ROBLOX',
      gameId:'monster-adventure',
      assetId:'perfect-looking-unverified',
      sourceHash:'source-hash',
      artifactHash:'artifact-hash'
    }
  });
  assert.equal(decision.eligible,false);
  assert.ok(decision.blockers.includes('NATIVE_BINDING_PASS_REQUIRED'));
  assert.ok(decision.blockers.includes('VISUAL_RUNTIME_PASS_REQUIRED'));
  assert.ok(decision.blockers.includes('MOBILE_PERFORMANCE_PASS_REQUIRED'));
});

test('verified quality learning ignores unverified scores',()=>{
  const summary=summarizeVerifiedAssetUsage({
    events:[
      {assetId:'wolf',gameId:'survival',qualityScore120:119},
      {assetId:'wolf',gameId:'survival',verifiedRuntimePass:true,qualityScore120:91,weakestQualityAxis:'MATERIAL_TEXTURE'},
      {assetId:'wolf',gameId:'survival',verifiedRuntimeFailure:true,failureReason:'FOOT_SLIDE',qualityScore120:97,weakestQualityAxis:'MOTION_LIVINGNESS'}
    ]
  });
  const row=summary.rows[0];
  assert.equal(row.runtimePassCount,1);
  assert.equal(row.verifiedQualitySampleCount,1);
  assert.equal(row.bestVerifiedQuality120,91);
  assert.equal(row.qualityLearningEligible,true);
  assert.equal(summary.unverifiedQualityScoresMayTeachPositiveLearning,false);
  assert.ok(row.verifiedWeakAxes.includes('MATERIAL_TEXTURE'));
  assert.ok(row.verifiedWeakAxes.includes('MOTION_LIVINGNESS'));
});

test('existing 24h gap fill receives quality-debt actions without unbinding low-score assets',()=>{
  const qualityProgram=buildStudioAssetQuality120Program({
    assets:[{
      id:'wolf-low',
      family:'CREATURE',
      subfamily:'SPECIES',
      qualityEvidence:{SILHOUETTE_FORM:55,MODELING_STRUCTURE:45,MATERIAL_TEXTURE:35}
    }],
    heroAssetIds:['wolf-low']
  });
  const plan=buildAutonomousAssetGapFillPlan({
    coverageReport:{rows:[]},
    repositoryAssets:[{id:'wolf-low',family:'CREATURE',subfamily:'SPECIES',status:'REPO_ASSET'}],
    qualityProgram
  });
  assert.equal(plan.qualityEvolutionEnabled,true);
  assert.equal(plan.qualityActions.length,1);
  assert.equal(plan.qualityActions[0].assetId,'wolf-low');
  assert.equal(plan.qualityActions[0].route,'IMPROVE_EXISTING_ASSET_WORST_PART_FIRST');
  assert.equal(plan.qualityActions[0].bindCurrentAsset,true);
  assert.equal(plan.qualityActions[0].visualDebtMustRemainOpen,true);
  assert.equal(plan.qualityScoreIsNotBindingGate,true);
});

test('item lineage keeps world and UI representations under one asset DNA',()=>{
  const dna=createAssetDNA({
    id:'healing-potion',
    family:'PROP',
    subfamily:'ITEM',
    functionClass:'CONSUMABLE',
    itemRole:'HEALING',
    familyRootId:'potion-family',
    visualIntent:'small readable survival consumable',
    presentationRoles:['WORLD_MODEL','INVENTORY_ICON','DROP_MODEL','CRAFTING_ICON']
  });
  assert.equal(dna.FAMILY_ROOT_ID,'potion-family');
  assert.equal(dna.ITEM_ROLE,'HEALING');
  assert.ok(dna.PRESENTATION_ROLES.includes('INVENTORY_ICON'));
  const plan=createStudioAssetFamilyPlan({
    asset:{id:'healing-potion',family:'PROP',subfamily:'ITEM',functionClass:'CONSUMABLE',dna},
    availableOutputs:['WORLD_MODEL']
  });
  assert.equal(plan.itemPresentationRequired,true);
  assert.equal(plan.familyRootId,'potion-family');
  assert.equal(plan.uiIconMustReflectWorldAssetIdentity,true);
  assert.equal(plan.equippedDropInventoryCraftingVariantsShareLineage,true);
});

test('audio remains a first-class studio asset family',()=>{
  const plan=createStudioAssetFamilyPlan({
    asset:{id:'wolf-growl',family:'AUDIO'},
    availableOutputs:['SOURCE_ASSET']
  });
  assert.equal(plan.family,'AUDIO');
  assert.ok(plan.requiredOutputs.includes('EVENT_BINDING'));
  assert.ok(plan.missingRequiredOutputs.includes('VARIATION_SET'));
});

test('audio quality ignores irrelevant modeling axes',()=>{
  const program=buildStudioAssetQuality120Program({
    assets:[{
      id:'forest-wind',
      family:'AUDIO',
      qualityEvidence:{
        WORLD_STYLE_COHERENCE:100,
        VFX_AUDIO_COHESION:100,
        ORIGINALITY_IDENTITY:100,
        MOBILE_PERFORMANCE:100,
        ACTUAL_GAME_BINDING:100
      },
      consumerGameIds:['survival']
    }]
  });
  const assessment=program.assessments[0];
  assert.equal(assessment.applicableAxes.includes('MODELING_STRUCTURE'),false);
  assert.equal(assessment.applicableAxes.includes('SILHOUETTE_FORM'),false);
  assert.equal(assessment.weakestAxis.axis,'PRODUCTION_VERIFICATION');
});

test('item family requires world drop and inventory presentation when item-like',()=>{
  const program=buildStudioAssetQuality120Program({
    assets:[{
      id:'ore-chunk',
      family:'PROP',
      subfamily:'RESOURCE',
      functionClass:'ITEM_RESOURCE',
      availableOutputs:['WORLD_MODEL','INTERACTION_VARIANT','COLLISION_PROXY','LOD0','LOD1','LOD2']
    }]
  });
  const plan=program.familyPlans[0];
  assert.equal(plan.itemPresentationRequired,true);
  assert.ok(plan.requiredOutputs.includes('INVENTORY_ICON_WHEN_ITEM'));
  assert.ok(plan.requiredOutputs.includes('DROP_MODEL_WHEN_COLLECTIBLE'));
  assert.ok(plan.missingRequiredOutputs.includes('INVENTORY_ICON_WHEN_ITEM'));
  assert.ok(plan.missingRequiredOutputs.includes('DROP_MODEL_WHEN_COLLECTIBLE'));
  assert.equal(plan.complete,false);
});


test('monster adventure internal creature pack matches the current nine-species roster',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','monster-adventure-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const web=fs.readFileSync(path.join(root,'web-games','monster-adventure','index.html'),'utf8');
  const expected=[
    ['flamefox','불꽃여우',900,850],
    ['leafturtle','새싹거북',900,850],
    ['waterotter','물방울수달',1000,900],
    ['boar','풀숲멧돼지',850,800],
    ['bat','밤날개',450,400],
    ['bird','바람새',550,500],
    ['hornbull','뿔바위소',950,900],
    ['rockgator','철갑악어',950,900],
    ['stormeagle','폭풍독수리',650,650],
  ];
  assert.equal(catalog.assets.length,9);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(catalog.authoringQualityTarget,100);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.staticAuthoringChecklist.scoreType,'STATIC_AUTHORING_CHECKLIST_NOT_RUNTIME_QUALITY');
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.gameplayAuthority,false);
  for(const [id,name,minVertices,minFaces] of expected){
    const objPath=path.join(packDir,id+'.obj');
    assert.equal(fs.existsSync(objPath),true,id);
    const source=fs.readFileSync(objPath,'utf8');
    const vertices=source.split(/\r?\n/).filter(line=>line.startsWith('v ')).length;
    const faces=source.split(/\r?\n/).filter(line=>line.startsWith('f ')).length;
    assert.ok(vertices>=minVertices,id+':vertices='+vertices);
    assert.ok(faces>=minFaces,id+':faces='+faces);
    assert.ok(source.includes('mtllib monster-adventure.mtl'),id);
    assert.ok(source.includes('usemtl '),id);
    assert.ok(web.includes(id),id+':web-id');
    assert.ok(web.includes(name),id+':web-name');
    const row=catalog.assets.find(asset=>asset.id===id);
    assert.ok(row,id+':catalog');
    assert.equal(row.vertices,vertices,id+':catalog-vertices');
    assert.equal(row.faces,faces,id+':catalog-faces');
  }
});

test('monster adventure pack is registered as repo assets without false production verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-monster-adventure-v1');
  assert.ok(pack);
  assert.equal(pack.status,'REPO_ASSET');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.verifiedCompanyReusable,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.qualityTarget,100);
  assert.equal(pack.authoringChecklistScore,100);
  assert.deepEqual(pack.heroAssetIds,['flamefox','leafturtle','waterotter']);
  for(const id of ['flamefox','leafturtle','waterotter','boar','bat','bird','hornbull','rockgator','stormeagle']){
    const row=registry.assets.find(asset=>asset.id==='roblox-monster-adventure-'+id);
    assert.ok(row,id);
    assert.equal(row.status,'REPO_ASSET');
    assert.equal(row.productionVerified,false);
    assert.equal(row.gameplayAuthority,false);
    assert.equal(row.qualityScoreBlocksBinding,false);
    assert.equal(row.path,'/assets/roblox/monster-adventure-v1/'+id+'.obj');
  }
});


test('horror lore prop pack matches the current ten-item Lore roster',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','horror-lore-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const config=fs.readFileSync(path.join(root,'roblox-games','horror-escape-room','shared','GameConfig.luau'),'utf8');
  const mtl=fs.readFileSync(path.join(packDir,'horror-lore.mtl'),'utf8');
  const materials=new Set(mtl.split(/\r?\n/).filter(line=>line.startsWith('newmtl ')).map(line=>line.slice(7).trim()));
  const expected=[
    ['SCHOOL_01','school_01','빈 교실 출석부',100,70],
    ['SCHOOL_02','school_02','사물함 낙서',100,70],
    ['SCHOOL_03','school_03','체육관 호루라기',300,200],
    ['SCHOOL_04','school_04','급식표 뒷면',100,80],
    ['HOSPITAL_01','hospital_01','퇴원 기록',80,60],
    ['HOSPITAL_02','hospital_02','수술실 메모',220,160],
    ['HOSPITAL_03','hospital_03','영안실 번호표',300,200],
    ['PARK_01','park_01','찢어진 입장권',350,280],
    ['PARK_02','park_02','회전목마 사진',700,550],
    ['PARK_03','park_03','광대 분실물',350,300],
  ];
  assert.equal(catalog.assets.length,10);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(catalog.authoringQualityTarget,100);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);
  for(const [loreId,fileId,name,minVertices,minFaces] of expected){
    assert.ok(config.includes('Id="'+loreId+'"'),loreId+':config-id');
    assert.ok(config.includes('Name="'+name+'"'),loreId+':config-name');
    const source=fs.readFileSync(path.join(packDir,fileId+'.obj'),'utf8');
    const lines=source.split(/\r?\n/);
    const vertices=lines.filter(line=>line.startsWith('v ')).length;
    const faces=lines.filter(line=>line.startsWith('f ')).length;
    const used=[...new Set(lines.filter(line=>line.startsWith('usemtl ')).map(line=>line.slice(7).trim()))];
    assert.ok(vertices>=minVertices,fileId+':vertices='+vertices);
    assert.ok(faces>=minFaces,fileId+':faces='+faces);
    assert.ok(lines.filter(line=>line.startsWith('g ')).length>=8,fileId+':semantic-groups');
    assert.equal(used.filter(mat=>!materials.has(mat)).length,0,fileId+':materials');
    const row=catalog.assets.find(asset=>asset.id===loreId);
    assert.ok(row,loreId+':catalog');
    assert.equal(row.file,fileId+'.obj',loreId+':catalog-file');
    assert.equal(row.vertices,vertices,loreId+':catalog-vertices');
    assert.equal(row.faces,faces,loreId+':catalog-faces');
  }
});

test('horror lore pack is registered for automatic game binding without false verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-horror-lore-v1');
  assert.ok(pack);
  assert.equal(pack.status,'REPO_ASSET');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.qualityTarget,100);
  assert.equal(pack.authoringChecklistScore,100);
  const expected=[
    ['SCHOOL_01','school_01'],['SCHOOL_02','school_02'],['SCHOOL_03','school_03'],['SCHOOL_04','school_04'],
    ['HOSPITAL_01','hospital_01'],['HOSPITAL_02','hospital_02'],['HOSPITAL_03','hospital_03'],
    ['PARK_01','park_01'],['PARK_02','park_02'],['PARK_03','park_03']
  ];
  for(const [loreId,fileId] of expected){
    const row=registry.assets.find(asset=>asset.id==='roblox-horror-lore-'+fileId);
    assert.ok(row,loreId);
    assert.equal(row.status,'REPO_ASSET');
    assert.equal(row.productionVerified,false);
    assert.equal(row.gameplayAuthority,false);
    assert.equal(row.qualityScoreBlocksBinding,false);
    assert.equal(row.bindingHint.gameId,'horror-escape-room');
    assert.equal(row.bindingHint.configCollection,'Lore');
    assert.equal(row.bindingHint.configId,loreId);
    assert.equal(row.bindingHint.preservePromptRewardSaveAuthority,true);
  }
});


test('survival core world pack matches current StudioAssets atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','survival-core-world-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const config=fs.readFileSync(path.join(root,'roblox-games','survival','shared','GameConfig.luau'),'utf8');
  const mtl=fs.readFileSync(path.join(packDir,'survival-core-world.mtl'),'utf8');
  const materials=new Set(mtl.split(/\r?\n/).filter(line=>line.startsWith('newmtl ')).map(line=>line.slice(7).trim()));
  const expected=[
    ['ENVIRONMENT','TREE_TRUNK_THICK','tree_trunk_thick',500,300],
    ['ENVIRONMENT','TREE_CROWN_ROUND','tree_crown_round',800,650],
    ['ENVIRONMENT','ROCK_MEDIUM','rock_medium',250,200],
    ['ENVIRONMENT','ROAD_DIRT','road_dirt',800,600],
    ['BUILDING','FOUNDATION_RECT','foundation_rect',90,70],
    ['BUILDING','WALL_SOLID','wall_solid',100,70],
    ['BUILDING','DOOR_SINGLE','door_single',180,130],
    ['BUILDING','ROOF_GABLE','roof_gable',160,90],
    ['PROP','CHEST','chest',180,140],
    ['PROP','CRATE','crate',100,70],
    ['PROP','LAMP','lamp',550,400]
  ];
  assert.equal(catalog.assets.length,11);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(catalog.authoringQualityTarget,100);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);
  for(const [family,atomId,fileId,minVertices,minFaces] of expected){
    assert.ok(config.includes(atomId),atomId+':config');
    const source=fs.readFileSync(path.join(packDir,fileId+'.obj'),'utf8');
    const lines=source.split(/\r?\n/);
    const vertices=lines.filter(line=>line.startsWith('v ')).length;
    const faces=lines.filter(line=>line.startsWith('f ')).length;
    const groups=lines.filter(line=>line.startsWith('g ')).length;
    const used=[...new Set(lines.filter(line=>line.startsWith('usemtl ')).map(line=>line.slice(7).trim()))];
    assert.ok(vertices>=minVertices,fileId+':vertices='+vertices);
    assert.ok(faces>=minFaces,fileId+':faces='+faces);
    assert.ok(groups>=5,fileId+':semantic-groups');
    assert.equal(used.filter(mat=>!materials.has(mat)).length,0,fileId+':materials');
    const row=catalog.assets.find(asset=>asset.atomId===atomId);
    assert.ok(row,atomId+':catalog');
    assert.equal(row.family,family,atomId+':family');
    assert.equal(row.source,fileId+'.obj',atomId+':source');
    assert.equal(row.vertices,vertices,atomId+':catalog-vertices');
    assert.equal(row.faces,faces,atomId+':catalog-faces');
  }
});

test('survival core world pack is registered for automatic atom binding without false verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-survival-core-world-v1');
  assert.ok(pack);
  assert.equal(pack.status,'REPO_ASSET');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.qualityTarget,100);
  assert.equal(pack.authoringChecklistScore,100);
  const expected=[
    ['ENVIRONMENT','TREE_TRUNK_THICK','tree_trunk_thick'],
    ['ENVIRONMENT','TREE_CROWN_ROUND','tree_crown_round'],
    ['ENVIRONMENT','ROCK_MEDIUM','rock_medium'],
    ['ENVIRONMENT','ROAD_DIRT','road_dirt'],
    ['BUILDING','FOUNDATION_RECT','foundation_rect'],
    ['BUILDING','WALL_SOLID','wall_solid'],
    ['BUILDING','DOOR_SINGLE','door_single'],
    ['BUILDING','ROOF_GABLE','roof_gable'],
    ['PROP','CHEST','chest'],['PROP','CRATE','crate'],['PROP','LAMP','lamp']
  ];
  for(const [family,atomId,fileId] of expected){
    const row=registry.assets.find(asset=>asset.id==='roblox-survival-'+fileId);
    assert.ok(row,atomId);
    assert.equal(row.status,'REPO_ASSET');
    assert.equal(row.productionVerified,false);
    assert.equal(row.gameplayAuthority,false);
    assert.equal(row.qualityScoreBlocksBinding,false);
    assert.equal(row.bindingHint.gameId,'survival');
    assert.equal(row.bindingHint.family,family);
    assert.equal(row.bindingHint.atomId,atomId);
    assert.equal(row.bindingHint.preserveGameplayBalanceSaveAndNetworkAuthority,true);
  }
});


test('survival combat parts pack matches current modular StudioAssets atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','survival-combat-parts-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const config=fs.readFileSync(path.join(root,'roblox-games','survival','shared','GameConfig.luau'),'utf8');
  const mtl=fs.readFileSync(path.join(packDir,'survival-combat-parts.mtl'),'utf8');
  const materials=new Set(mtl.split(/\r?\n/).filter(line=>line.startsWith('newmtl ')).map(line=>line.slice(7).trim()));
  const expected=[
    ['WEAPON','BLADE_LONG','blade_long',40,30],
    ['WEAPON','GUARD_CROSS','guard_cross',180,120],
    ['WEAPON','GRIP_LONG','grip_long',300,200],
    ['CHARACTER','TORSO_CLOTH','torso_cloth',220,180],
    ['CHARACTER','SHOULDER_LIGHT','shoulder_light',240,190],
    ['CHARACTER','BACK_CAPE','back_cape',200,140],
    ['CREATURE','HEAD_CANINE','head_canine',700,600],
    ['CREATURE','JAW_LONG','jaw_long',500,380],
    ['CREATURE','CLAW','claw',500,380],
  ];
  assert.equal(catalog.assets.length,9);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(catalog.authoringQualityTarget,100);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);
  for(const [family,atomId,fileId,minVertices,minFaces] of expected){
    assert.ok(config.includes(atomId),atomId+':config');
    const source=fs.readFileSync(path.join(packDir,fileId+'.obj'),'utf8');
    const lines=source.split(/\r?\n/);
    const vertices=lines.filter(line=>line.startsWith('v ')).length;
    const faces=lines.filter(line=>line.startsWith('f ')).length;
    const groups=lines.filter(line=>line.startsWith('g ')).length;
    const used=[...new Set(lines.filter(line=>line.startsWith('usemtl ')).map(line=>line.slice(7).trim()))];
    assert.ok(vertices>=minVertices,fileId+':vertices='+vertices);
    assert.ok(faces>=minFaces,fileId+':faces='+faces);
    assert.ok(groups>=5,fileId+':semantic-groups');
    assert.equal(used.filter(mat=>!materials.has(mat)).length,0,fileId+':materials');
    const row=catalog.assets.find(asset=>asset.atomId===atomId);
    assert.ok(row,atomId+':catalog');
    assert.equal(row.family,family,atomId+':family');
    assert.equal(row.source,fileId+'.obj',atomId+':source');
    assert.equal(row.vertices,vertices,atomId+':catalog-vertices');
    assert.equal(row.faces,faces,atomId+':catalog-faces');
  }
});

test('survival combat parts are registered for module-level automatic replacement without false verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-survival-combat-parts-v1');
  assert.ok(pack);
  assert.equal(pack.status,'REPO_ASSET');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.qualityTarget,100);
  assert.equal(pack.modularReplacement,true);
  const expected=[
    ['WEAPON','BLADE_LONG','blade_long'],
    ['WEAPON','GUARD_CROSS','guard_cross'],
    ['WEAPON','GRIP_LONG','grip_long'],
    ['CHARACTER','TORSO_CLOTH','torso_cloth'],
    ['CHARACTER','SHOULDER_LIGHT','shoulder_light'],
    ['CHARACTER','BACK_CAPE','back_cape'],
    ['CREATURE','HEAD_CANINE','head_canine'],
    ['CREATURE','JAW_LONG','jaw_long'],
    ['CREATURE','CLAW','claw']
  ];
  for(const [family,atomId,fileId] of expected){
    const row=registry.assets.find(asset=>asset.id==='roblox-survival-'+fileId);
    assert.ok(row,atomId);
    assert.equal(row.status,'REPO_ASSET');
    assert.equal(row.productionVerified,false);
    assert.equal(row.gameplayAuthority,false);
    assert.equal(row.modularReplacement,true);
    assert.equal(row.bindingHint.gameId,'survival');
    assert.equal(row.bindingHint.family,family);
    assert.equal(row.bindingHint.atomId,atomId);
    assert.equal(row.bindingHint.replaceOnlyMatchingModule,true);
    assert.equal(row.bindingHint.preserveGameplayDamageMovementSaveAndNetworkAuthority,true);
  }
});


test('company-common Roblox UI base is theme-adaptable and authority-free',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-ui-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonUI.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.compatibleGameScope,'ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH');
  assert.equal(catalog.themeAdaptationRequiredPerGame,true);
  assert.equal(catalog.productionVerified,false);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.companyCommonBase,true);

  for(const atom of ['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']){
    assert.ok(source.includes(atom),atom);
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }
  assert.ok(source.includes('function RobloxCommonUI.CreateTheme(overrides)'));
  assert.ok(source.includes('TouchHeight = 48'));
  assert.ok(source.includes('CompanyCommonBase", true'));
  assert.ok(source.includes('ThemeAdaptationRequiredPerGame", true'));
  assert.ok(source.includes('OwnsRemoteAuthority", false'));
  assert.ok(source.includes('OwnsHealthValue", false'));
  assert.ok(source.includes('OwnsDamageAuthority", false'));
  assert.equal(/DataStoreService/.test(source),false);
  assert.equal(/RemoteEvent/.test(source),false);
  assert.equal(/FireServer\(/.test(source),false);
});

test('equivalent compatible loadout prefers company-common base over game-dedicated duplicate',()=>{
  const common={
    id:'common-panel',
    family:'UI',
    subfamily:'FRAME_PANEL',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    companyCommonBase:true,
    reuseScope:'COMPANY_ROBLOX_COMMON_BASE'
  };
  const dedicated={
    id:'one-game-panel',
    family:'UI',
    subfamily:'FRAME_PANEL',
    platform:'ROBLOX',
    status:'REPO_ASSET'
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'UI',subfamily:'FRAME_PANEL',required:true}],
    assets:[dedicated,common],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-panel');
  assert.equal(scoreStudioAssetCandidate({asset:common,gameDna:{targetPlatform:'ROBLOX'}}).companyCommonBase,true);
  assert.equal(scoreStudioAssetCandidate({asset:common,gameDna:{targetPlatform:'ROBLOX'}}).commonBasePreferenceApplied,true);
});

test('generic survival-origin world and combat assets are classified as company-common bases',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const packs=['roblox-survival-core-world-v1','roblox-survival-combat-parts-v1'];
  for(const packId of packs){
    const members=registry.assets.filter(row=>row.id===packId||row.packId===packId);
    assert.ok(members.length>1,packId);
    for(const row of members){
      assert.equal(row.companyCommonBase,true,row.id);
      assert.equal(row.reuseScope,'COMPANY_ROBLOX_COMMON_BASE',row.id);
      assert.equal(row.automaticCrossGameReuseAllowed,true,row.id);
      assert.equal(row.crossGameReuseRequiresCompatibilityPass,true,row.id);
      assert.equal(row.styleAdaptationRequiredPerGame,true,row.id);
      assert.ok((row.tags||[]).includes('COMPANY_COMMON_BASE'),row.id);
    }
  }
});

test('common UI registry stays unverified until real consumer runtime evidence exists',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-ui-v1');
  assert.ok(pack);
  assert.equal(pack.status,'REPO_ASSET');
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.verifiedCompanyReusable,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');

  for(const atom of ['frame-panel','button-primary','bar-health']){
    const row=registry.assets.find(asset=>asset.id==='roblox-common-ui-'+atom);
    assert.ok(row,atom);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.productionVerified,false);
    assert.equal(row.gameplayAuthority,false);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
  }
});


test('company-common item pack shares one source across world drop and viewport',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-items-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonItems.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['HEALING_POTION','MANA_CRYSTAL','IRON_INGOT','GOLD_INGOT','WOOD_BUNDLE','STONE_CHUNK','RELIC_KEY','LANTERN'];
  assert.equal(catalog.items.length,8);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  assert.ok(source.includes('function RobloxCommonItems.Create(id, options)'));
  assert.ok(source.includes('function RobloxCommonItems.CreateViewport(id, options)'));
  assert.ok(source.includes('local styledRow = rowWithPalette(row, options.palette)'));
  assert.ok(source.includes('palette = options.palette'));
  assert.ok(source.includes('CompanyCommonBase", true'));
  assert.ok(source.includes('ThemeAdaptationRequiredPerGame", true'));
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.sameAssetDnaAcrossWorldDropEquipAndUi,true);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);

  for(const forbidden of [/\bDamage\s*=/,/\bPrice\s*=/,/\bHealAmount\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common item registry exposes cross-game reusable item and resource roles',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-items-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');

  const expected=[
    ['HEALING_POTION','ITEM','CONSUMABLE'],
    ['MANA_CRYSTAL','RESOURCE','RESOURCE'],
    ['IRON_INGOT','RESOURCE','RESOURCE'],
    ['GOLD_INGOT','RESOURCE','RESOURCE'],
    ['WOOD_BUNDLE','RESOURCE','RESOURCE'],
    ['STONE_CHUNK','RESOURCE','RESOURCE'],
    ['RELIC_KEY','ITEM','KEY_ITEM'],
    ['LANTERN','ITEM','UTILITY']
  ];
  for(const [assetId,subfamily,itemRole] of expected){
    const id='roblox-common-item-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.itemRole,itemRole);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.deriveGamePaletteInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveGameplayStatsEconomyCraftingSaveAndNetworkAuthority,true);
  }
});

test('generic item requirement can choose company-common item base',()=>{
  const registryAsset={
    id:'common-healing-potion',
    family:'PROP',
    subfamily:'ITEM',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    companyCommonBase:true,
    reuseScope:'COMPANY_ROBLOX_COMMON_BASE',
    tags:['CONSUMABLE']
  };
  const gameOnly={
    id:'game-only-potion',
    family:'PROP',
    subfamily:'ITEM',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    tags:['CONSUMABLE']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'PROP',subfamily:'ITEM',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-healing-potion');
});


test('company-common VFX pack is reusable and gameplay-authority free',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-vfx-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonVFX.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  for(const atom of ['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST']){
    assert.ok(source.includes(atom),atom);
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }

  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.productionVerified,false);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);

  assert.ok(source.includes('function RobloxCommonVFX.CreateImpactFlash(options)'));
  assert.ok(source.includes('function RobloxCommonVFX.AttachShortTrail(hostPart, options)'));
  assert.ok(source.includes('function RobloxCommonVFX.CreateShapeBurst(options)'));
  assert.ok(source.includes('mobileBurstCap = 12'));
  assert.ok(source.includes('OwnsDamageAuthority", false'));
  assert.ok(source.includes('OwnsHitboxAuthority", false'));
  assert.ok(source.includes('OwnsCooldownAuthority", false'));
  assert.equal(/RemoteEvent/.test(source),false);
  assert.equal(/RemoteFunction/.test(source),false);
  assert.equal(/FireServer\(/.test(source),false);
  assert.equal(/TakeDamage\(/.test(source),false);
});

test('company-common VFX registry exposes cross-game automatic candidates',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-vfx-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');

  const expected=[
    ['IMPACT_FLASH','CreateImpactFlash'],
    ['TRAIL_SHORT','AttachShortTrail'],
    ['SHAPE_BURST','CreateShapeBurst']
  ];
  for(const [atomId,factory] of expected){
    const id='roblox-common-vfx-'+atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atomId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'VFX');
    assert.equal(row.subfamily,atomId);
    assert.equal(row.factory,factory);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.deriveGameColorScaleDurationInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveGameplayDamageHitboxCooldownMovementAndNetworkAuthority,true);
  }
});


test('company-common skill presentation reuses common VFX without owning gameplay authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-skill-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonSkillPresentation.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  for(const atom of ['CAST_HAND','TELEGRAPH_CIRCLE','IMPACT_SMALL']){
    assert.ok(source.includes(atom),atom);
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }

  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.deepEqual(catalog.dependencyPackIds,['roblox-common-vfx-v1']);
  assert.equal(catalog.productionVerified,false);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);

  assert.ok(source.includes('function RobloxCommonSkillPresentation.AttachCastHand(hostPart, options)'));
  assert.ok(source.includes('function RobloxCommonSkillPresentation.CreateTelegraphCircle(options)'));
  assert.ok(source.includes('function RobloxCommonSkillPresentation.CreateImpactSmall(options)'));
  assert.ok(source.includes('COMMON_VFX_MODULE_REQUIRED'));
  assert.ok(source.includes('mobileTelegraphSegmentCap = 20'));
  assert.ok(source.includes('OwnsDamageAuthority", false'));
  assert.ok(source.includes('OwnsRangeAuthority", false'));
  assert.ok(source.includes('OwnsCooldownAuthority", false'));
  assert.ok(source.includes('OwnsMovementAuthority", false'));
  assert.equal(/RemoteEvent/.test(source),false);
  assert.equal(/RemoteFunction/.test(source),false);
  assert.equal(/FireServer\(/.test(source),false);
  assert.equal(/TakeDamage\(/.test(source),false);
});

test('company-common skill registry exposes explicit VFX dependency and cross-game candidates',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-skill-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.productionVerified,false);
  assert.deepEqual(pack.dependencyPackIds,['roblox-common-vfx-v1']);

  const expected=[
    ['CAST_HAND','AttachCastHand',null],
    ['TELEGRAPH_CIRCLE','CreateTelegraphCircle',null],
    ['IMPACT_SMALL','CreateImpactSmall','roblox-common-vfx-impact-flash']
  ];
  for(const [atomId,factory,reuses] of expected){
    const id='roblox-common-skill-'+atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atomId);
    assert.equal(row.family,'SKILL');
    assert.equal(row.subfamily,atomId);
    assert.equal(row.factory,factory);
    assert.equal(row.reusesAssetId,reuses);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.preserveGameplayDamageRangeCooldownComboMovementAndNetworkAuthority,true);
  }

  assert.ok(registry.assets.some(row=>row.id==='roblox-common-vfx-impact-flash'));
});


test('company-common materials preserve physical semantics by default',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-materials-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonMaterials.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  for(const atom of ['WOOD','STONE','METAL']){
    assert.ok(source.includes(atom),atom);
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }

  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.physicalPropertiesPreservedByDefault,true);
  assert.equal(catalog.productionVerified,false);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.physicalPropertiesPreservedByDefault,true);
  assert.equal(quality.productionVerified,false);

  assert.ok(source.includes('part.CurrentPhysicalProperties'));
  assert.ok(source.includes('part.CustomPhysicalProperties = physicalBefore'));
  assert.ok(source.includes('PhysicalProperties.new('));
  assert.ok(source.includes('collisionMutationAllowed = false'));
  assert.equal(/CanCollide\s*=/.test(source),false);
  assert.equal(/CanTouch\s*=/.test(source),false);
  assert.equal(/CanQuery\s*=/.test(source),false);
  assert.equal(/RemoteEvent/.test(source),false);
  assert.equal(/FireServer\(/.test(source),false);
});

test('company-common material registry exposes reusable physics-preserving atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-materials-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.physicalPropertiesPreservedByDefault,true);
  assert.equal(pack.collisionMutationAllowed,false);
  assert.equal(pack.productionVerified,false);

  const expected=[
    ['WOOD',['NATURAL','DARK','WEATHERED','PALE']],
    ['STONE',['NATURAL','DARK','PALE','WEATHERED']],
    ['METAL',['BRUSHED','DARK','LIGHT','INDUSTRIAL']]
  ];
  for(const [atomId,variants] of expected){
    const row=registry.assets.find(asset=>asset.id==='roblox-common-material-'+atomId.toLowerCase());
    assert.ok(row,atomId);
    assert.equal(row.family,'MATERIAL');
    assert.equal(row.subfamily,atomId);
    assert.deepEqual(row.variants,variants);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.preservePhysicalProperties,true);
    assert.equal(row.bindingHint.preserveCollisionTouchQueryAndGameplayAuthority,true);
  }
});


test('company-common R15 motion pack covers current reusable motion atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-motion-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonMotion.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const survivalConfig=fs.readFileSync(path.join(root,'roblox-games','survival','shared','GameConfig.luau'),'utf8');
  const expected=['IDLE_RELAXED','WALK','JOG','RUN','START','STOP','TURN_90','JUMP_START','LAND','HIT_FRONT','DEATH_FRONT'];

  assert.equal(catalog.atoms.length,11);
  assert.equal(catalog.compatibleRig,'R15');
  assert.equal(catalog.rootMotionOwned,false);
  assert.equal(catalog.gameplayMovementAuthority,false);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);

  for(const atom of expected){
    assert.ok(source.includes(atom),atom+':source');
    assert.ok(survivalConfig.includes(atom),atom+':config');
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }

  for(const joint of [
    'HumanoidRootPart','LowerTorso','UpperTorso','Head',
    'LeftUpperArm','LeftLowerArm','LeftHand','RightUpperArm','RightLowerArm','RightHand',
    'LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot'
  ]){
    assert.ok(source.includes('name = "'+joint+'"'),joint);
  }

  assert.ok(source.includes('Instance.new("KeyframeSequence")'));
  assert.ok(source.includes('Instance.new("Keyframe")'));
  assert.ok(source.includes('Instance.new("Pose")'));
  assert.ok(source.includes('RegisterKeyframeSequence(sequence)'));
  assert.ok(source.includes('animator:LoadAnimation(animation)'));
  assert.ok(source.includes('RootMotionOwned", false'));
  assert.ok(source.includes('GameplayMovementAuthority", false'));

  for(const forbidden of [
    /WalkSpeed\s*=/,
    /JumpPower\s*=/,
    /HumanoidRootPart\.CFrame\s*=/,
    /PivotTo\(/,
    /MoveTo\(/,
    /TakeDamage\(/,
    /RemoteEvent/,
    /FireServer\(/,
    /DataStoreService/
  ]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common motion registry supports cross-game R15 reuse without false production verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-motion-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.compatibleRig,'R15');
  assert.equal(pack.automaticCrossGameReuseAllowed,true);
  assert.equal(pack.crossGameReuseRequiresCompatibilityPass,true);
  assert.equal(pack.rootMotionOwned,false);
  assert.equal(pack.gameplayMovementAuthority,false);
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');

  const atoms=['IDLE_RELAXED','WALK','JOG','RUN','START','STOP','TURN_90','JUMP_START','LAND','HIT_FRONT','DEATH_FRONT'];
  for(const atom of atoms){
    const id='roblox-common-motion-'+atom.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atom);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'MOTION');
    assert.equal(row.subfamily,atom);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.compatibleRig,'R15');
    assert.equal(row.bindingHint.persistentAnimationUploadRequiredForProduction,true);
    assert.equal(row.bindingHint.preserveGameplayMovementDamageSaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});


test('company-common world prop pack provides eight reusable visual props',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-world-props-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonWorldProps.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['SIGNPOST','WOOD_FENCE','WALL_TORCH','WOOD_BARREL','BENCH','TABLE','MARKET_STALL','STONE_WELL'];
  assert.equal(catalog.items.length,8);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  assert.ok(source.includes('function RobloxCommonWorldProps.Create(id, options)'));
  assert.ok(source.includes('function RobloxCommonWorldProps.CreateViewport(id, options)'));
  assert.ok(source.includes('local styledRow = rowWithPalette(row, options.palette)'));
  assert.ok(source.includes('CompanyCommonBase", true'));
  assert.ok(source.includes('ThemeAdaptationRequiredPerGame", true'));
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.companyCommonBase,true);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.runtimeQuality.claimedScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  for(const forbidden of [/\bDamage\s*=/,/\bPrice\s*=/,/\bReward\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common world prop registry preserves gameplay authority and current-game reuse targets',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-world-props-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.gameplayAuthority,false);

  const expected=[
    ['SIGNPOST','SIGNPOST','WAYFINDING'],
    ['WOOD_FENCE','FENCE','BOUNDARY'],
    ['WALL_TORCH','TORCH','LIGHTING_PROP'],
    ['WOOD_BARREL','BARREL','SET_DRESSING'],
    ['BENCH','BENCH','SEATING_PROP'],
    ['TABLE','TABLE','SURFACE_PROP'],
    ['MARKET_STALL','MARKET_STALL','VENDOR_PROP'],
    ['STONE_WELL','WELL','LANDMARK_PROP']
  ];
  for(const [assetId,subfamily,worldRole] of expected){
    const id='roblox-common-world-prop-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.worldRole,worldRole);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.deriveGamePaletteInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveGameplayStatsEconomyCraftingSaveAndNetworkAuthority,true);
  }
});

test('generic world prop requirement can choose company-common base',()=>{
  const registryAsset={
    id:'common-signpost',
    family:'PROP',
    subfamily:'SIGNPOST',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    companyCommonBase:true,
    reuseScope:'COMPANY_ROBLOX_COMMON_BASE',
    tags:['WAYFINDING']
  };
  const gameOnly={
    id:'game-only-signpost',
    family:'PROP',
    subfamily:'SIGNPOST',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    tags:['WAYFINDING']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'PROP',subfamily:'SIGNPOST',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-signpost');
});


test('company-common foliage pack provides eight reusable environment assets',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-foliage-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonFoliage.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['GRASS_TUFT','BUSH_ROUND','FERN_CLUSTER','WILDFLOWER_PATCH','TREE_STUMP','FALLEN_LOG','PINE_TREE','DEAD_TREE'];
  assert.equal(catalog.items.length,8);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  assert.ok(source.includes('function RobloxCommonFoliage.Create(id, options)'));
  assert.ok(source.includes('function RobloxCommonFoliage.CreateViewport(id, options)'));
  assert.ok(source.includes('local styledRow = rowWithPalette(row, options.palette)'));
  assert.ok(source.includes('CompanyCommonBase", true'));
  assert.ok(source.includes('ThemeAdaptationRequiredPerGame", true'));
  assert.equal(catalog.family,'ENVIRONMENT');
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.runtimeQuality.claimedScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  for(const forbidden of [/\bDamage\s*=/,/\bDropRate\s*=/,/\bHarvestAmount\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common foliage registry preserves harvesting save collision and network authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-foliage-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.family,'ENVIRONMENT');
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.gameplayAuthority,false);

  const expected=[
    ['GRASS_TUFT','GRASS','GROUND_COVER'],
    ['BUSH_ROUND','BUSH','MIDGROUND_FOLIAGE'],
    ['FERN_CLUSTER','FERN','UNDERSTORY'],
    ['WILDFLOWER_PATCH','FLOWER','GROUND_ACCENT'],
    ['TREE_STUMP','STUMP','NATURAL_PROP'],
    ['FALLEN_LOG','FALLEN_LOG','NATURAL_PROP'],
    ['PINE_TREE','PINE_TREE','CANOPY_TREE'],
    ['DEAD_TREE','DEAD_TREE','SILHOUETTE_TREE']
  ];
  for(const [assetId,subfamily,environmentRole] of expected){
    const id='roblox-common-foliage-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'ENVIRONMENT');
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.environmentRole,environmentRole);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.deriveGamePaletteInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveGameplayStatsHarvestingDropsCollisionSaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});

test('generic foliage requirement can choose company-common base',()=>{
  const registryAsset={
    id:'common-foliage-grass',
    family:'ENVIRONMENT',
    subfamily:'GRASS',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    companyCommonBase:true,
    reuseScope:'COMPANY_ROBLOX_COMMON_BASE',
    tags:['GROUND_COVER']
  };
  const gameOnly={
    id:'game-only-grass',
    family:'ENVIRONMENT',
    subfamily:'GRASS',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    tags:['GROUND_COVER']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'ENVIRONMENT',subfamily:'GRASS',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-foliage-grass');
});


test('company-common building pack provides eight non-duplicate reusable modules',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-building-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonBuilding.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['FLOOR_TILE','WALL_WINDOW','WALL_CORNER','PILLAR_STONE','STAIRS_STRAIGHT','ARCHWAY','ROOF_FLAT','RAILING'];
  assert.equal(catalog.items.length,8);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  assert.deepEqual(catalog.complementsExistingCommonSubfamilies,['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE']);
  assert.ok(source.includes('function RobloxCommonBuilding.Create(id, options)'));
  assert.ok(source.includes('function RobloxCommonBuilding.CreateViewport(id, options)'));
  assert.ok(source.includes('local styledRow = rowWithPalette(row, options.palette)'));
  assert.ok(source.includes('CompanyCommonBase", true'));
  assert.ok(source.includes('ThemeAdaptationRequiredPerGame", true'));
  assert.equal(catalog.family,'BUILDING');
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.runtimeQuality.claimedScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  for(const forbidden of [/\bDamage\s*=/,/\bBuildCost\s*=/,/\bDurability\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common building registry preserves collision construction save and network authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-building-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.family,'BUILDING');
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.gameplayAuthority,false);

  const expected=[
    ['FLOOR_TILE','FLOOR_TILE','FLOOR'],
    ['WALL_WINDOW','WALL_WINDOW','WALL_OPENING'],
    ['WALL_CORNER','WALL_CORNER','WALL_CORNER'],
    ['PILLAR_STONE','PILLAR','STRUCTURAL_VISUAL'],
    ['STAIRS_STRAIGHT','STAIRS','VERTICAL_LINK_VISUAL'],
    ['ARCHWAY','ARCHWAY','PASSAGE_VISUAL'],
    ['ROOF_FLAT','ROOF_FLAT','ROOF'],
    ['RAILING','RAILING','EDGE_VISUAL']
  ];
  for(const [assetId,subfamily,buildingRole] of expected){
    const id='roblox-common-building-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'BUILDING');
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.buildingRole,buildingRole);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.deriveGamePaletteInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveCollisionBuildCostDurabilityCraftingSaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});

test('generic building requirement can choose company-common base',()=>{
  const registryAsset={
    id:'common-wall-window',
    family:'BUILDING',
    subfamily:'WALL_WINDOW',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    companyCommonBase:true,
    reuseScope:'COMPANY_ROBLOX_COMMON_BASE',
    tags:['WALL_OPENING']
  };
  const gameOnly={
    id:'game-only-wall-window',
    family:'BUILDING',
    subfamily:'WALL_WINDOW',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    tags:['WALL_OPENING']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'BUILDING',subfamily:'WALL_WINDOW',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-wall-window');
});


test('company-common tool pack provides eight reusable weapon and tool visuals',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-tools-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonTools.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['SWORD','SPEAR','AXE','HAMMER','PICKAXE','BOW','STAFF','SHIELD'];
  assert.equal(catalog.items.length,8);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  assert.ok(source.includes('function RobloxCommonTools.Create(id,options)'));
  assert.ok(source.includes('function RobloxCommonTools.CreateViewport(id,options)'));
  assert.ok(source.includes('attachment.Name = "VisualGrip"'));
  assert.ok(source.includes('local styledRow=rowWithPalette(row,options.palette)'));
  assert.ok(source.includes('CompanyCommonBase", true'));
  assert.equal(catalog.family,'WEAPON');
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.runtimeQuality.claimedScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  for(const forbidden of [/\bDamage\s*=/,/\bAttackSpeed\s*=/,/\bHarvestAmount\s*=/,/\bDurability\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common tool registry preserves combat gathering equipment save and network authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-tools-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.family,'WEAPON');
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.gameplayAuthority,false);

  const expected=[
    ['SWORD','SWORD','MELEE'],
    ['SPEAR','SPEAR','POLEARM'],
    ['AXE','AXE','MELEE_TOOL'],
    ['HAMMER','HAMMER','HEAVY_TOOL'],
    ['PICKAXE','PICKAXE','GATHERING_TOOL'],
    ['BOW','BOW','RANGED'],
    ['STAFF','STAFF','MAGIC_FOCUS'],
    ['SHIELD','SHIELD','DEFENSIVE_VISUAL']
  ];
  for(const [assetId,subfamily,toolRole] of expected){
    const id='roblox-common-tool-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'WEAPON');
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.toolRole,toolRole);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.visualGripAttachment,'VisualGrip');
    assert.equal(row.bindingHint.deriveGamePaletteInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveDamageAttackSpeedHarvestDurabilityEquipSaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});

test('generic weapon requirement can choose company-common tool base',()=>{
  const registryAsset={
    id:'common-sword',
    family:'WEAPON',
    subfamily:'SWORD',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    companyCommonBase:true,
    reuseScope:'COMPANY_ROBLOX_COMMON_BASE',
    tags:['MELEE']
  };
  const gameOnly={
    id:'game-only-sword',
    family:'WEAPON',
    subfamily:'SWORD',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    tags:['MELEE']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'WEAPON',subfamily:'SWORD',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-sword');
});


test('company-common character gear pack provides eight reusable visual equipment pieces',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-character-gear-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonCharacterGear.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['CLOTH_TUNIC','LEATHER_VEST','IRON_CHESTPLATE','CLOTH_HOOD','IRON_HELMET','LEATHER_GLOVES','LEATHER_BOOTS','TRAVEL_CLOAK'];
  assert.equal(catalog.items.length,8);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  const materials=[...new Set([...source.matchAll(/Enum\.Material\.([A-Za-z0-9_]+)/g)].map(match=>match[1]))];
  const allowed=new Set(['SmoothPlastic','Plastic','Neon','Wood','WoodPlanks','Marble','Slate','Concrete','Granite','Brick','Pebble','Cobblestone','CorrodedMetal','DiamondPlate','Foil','Metal','Grass','Sand','Fabric','Ice','Glacier','Snow','Sandstone','Mud','Ground','CrackedLava','Basalt','Asphalt','Salt','Limestone','Pavement','Air','Water']);
  assert.equal(materials.every(value=>allowed.has(value)),true);

  assert.ok(source.includes('function RobloxCommonCharacterGear.Create(id,options)'));
  assert.ok(source.includes('function RobloxCommonCharacterGear.CreateViewport(id,options)'));
  assert.ok(source.includes('anchor.Name="VisualAnchor"'));
  assert.ok(source.includes('BodyPlanCompatibilityRequired",true'));
  assert.ok(source.includes('CompanyCommonBase",true'));
  assert.equal(catalog.family,'CHARACTER');
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.bodyPlanCompatibilityRequired,true);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.staticAuthoringChecklist.checks.validRobloxMaterialEnums,true);
  assert.equal(quality.runtimeQuality.claimedScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  for(const forbidden of [/\bDefense\s*=/,/\bMaxHealth\s*=/,/\bMoveSpeed\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common character gear registry preserves equipment gameplay save and network authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-character-gear-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.family,'CHARACTER');
  assert.equal(pack.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.gameplayAuthority,false);
  assert.equal(pack.bodyPlanCompatibilityRequired,true);

  const expected=[
    ['CLOTH_TUNIC','TORSO_GEAR','LIGHT_TORSO'],
    ['LEATHER_VEST','TORSO_GEAR','MEDIUM_TORSO'],
    ['IRON_CHESTPLATE','TORSO_GEAR','HEAVY_TORSO'],
    ['CLOTH_HOOD','HEAD_GEAR','LIGHT_HEAD'],
    ['IRON_HELMET','HEAD_GEAR','HEAVY_HEAD'],
    ['LEATHER_GLOVES','HAND_GEAR','HAND'],
    ['LEATHER_BOOTS','FOOT_GEAR','FOOT'],
    ['TRAVEL_CLOAK','BACK_GEAR','BACK']
  ];
  for(const [assetId,subfamily,gearRole] of expected){
    const id='roblox-common-character-gear-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'CHARACTER');
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.gearRole,gearRole);
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.gameScope,'ALL_ROBLOX_GAMES');
    assert.equal(row.bindingHint.bodyPlanCompatibilityRequired,true);
    assert.equal(row.bindingHint.visualAnchor,'VisualAnchor');
    assert.equal(row.bindingHint.deriveGamePaletteInsteadOfDuplicatingBase,true);
    assert.equal(row.bindingHint.preserveArmorHealthMovementEquipInventorySaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});

test('generic character gear requirement can choose company-common base',()=>{
  const registryAsset={
    id:'common-character-helmet',family:'CHARACTER',subfamily:'HEAD_GEAR',platform:'ROBLOX',status:'REPO_ASSET',
    companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',tags:['HEAVY_HEAD']
  };
  const gameOnly={
    id:'game-only-helmet',family:'CHARACTER',subfamily:'HEAD_GEAR',platform:'ROBLOX',status:'REPO_ASSET',tags:['HEAVY_HEAD']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'CHARACTER',subfamily:'HEAD_GEAR',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-character-helmet');
});


test('company-common UI v2 preserves old atoms and adds eight reusable components',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-ui-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonUI.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const oldIds=['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'];
  const newIds=['INVENTORY_SLOT','TOOLTIP','MODAL','TAB_BUTTON','QUEST_CARD','CURRENCY_CHIP','BAR_PROGRESS','MOBILE_ACTION_BUTTON'];
  assert.equal(catalog.version,2);
  assert.equal(catalog.atoms.length,11);
  for(const id of [...oldIds,...newIds]){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.atoms.some(row=>row.atomId===id),id+':catalog');
  }

  assert.ok(source.includes('function RobloxCommonUI.CreateInventorySlot(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateTooltip(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateModal(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateTabButton(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateQuestCard(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateCurrencyChip(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateProgressBar(options)'));
  assert.ok(source.includes('function RobloxCommonUI.CreateMobileActionButton(options)'));
  assert.ok(source.includes('atomCount = 11'));
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  assert.ok(source.includes('button:SetAttribute("OwnsInventoryAuthority", false)'));
  assert.ok(source.includes('root:SetAttribute("OwnsQuestProgress", false)'));
  assert.ok(source.includes('root:SetAttribute("OwnsRewardAuthority", false)'));
  assert.ok(source.includes('root:SetAttribute("OwnsEconomyAuthority", false)'));
  assert.ok(source.includes('root:SetAttribute("OwnsProgressValue", false)'));
  assert.ok(source.includes('button:SetAttribute("OwnsGameplayAction", false)'));
  assert.ok(source.includes('button:SetAttribute("OwnsRemoteAuthority", false)'));

  for(const forbidden of [/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/,/InvokeServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common UI v2 registry exposes eleven unverified reusable atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-ui-v1');
  assert.ok(pack);
  assert.equal(pack.assetCount,11);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');

  const atoms=['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH','INVENTORY_SLOT','TOOLTIP','MODAL','TAB_BUTTON','QUEST_CARD','CURRENCY_CHIP','BAR_PROGRESS','MOBILE_ACTION_BUTTON'];
  for(const atomId of atoms){
    const id='roblox-common-ui-'+atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atomId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'UI');
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.productionVerified,false);
    assert.equal(row.runtimeVerificationState,'PENDING_STUDIO');
  }

  for(const atomId of ['INVENTORY_SLOT','TOOLTIP','MODAL','TAB_BUTTON','QUEST_CARD','CURRENCY_CHIP','BAR_PROGRESS','MOBILE_ACTION_BUTTON']){
    const id='roblox-common-ui-'+atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.equal(row.bindingHint.preserveGameplayHealthInputInventoryQuestRewardEconomyProgressSaveAndNetworkAuthority,true);
  }
});

test('generic inventory UI requirement can choose company-common base',()=>{
  const registryAsset={id:'common-inventory-slot',family:'UI',subfamily:'INVENTORY_SLOT',platform:'ROBLOX',status:'REPO_ASSET',companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',tags:['INVENTORY_SLOT']};
  const gameOnly={id:'game-only-inventory-slot',family:'UI',subfamily:'INVENTORY_SLOT',platform:'ROBLOX',status:'REPO_ASSET',tags:['INVENTORY_SLOT']};
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'UI',subfamily:'INVENTORY_SLOT',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-inventory-slot');
});
