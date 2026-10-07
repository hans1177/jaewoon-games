// 파일명: qa/vibe-studio-asset-universe.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  STUDIO_ASSET_UNIVERSE_TARGET,
  CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT,
  createAssetProductionTeachingRecipe,
  STUDIO_ASSET_FAMILIES,
  ASSET_STYLE_FAMILIES,
  STUDIO_ASSET_QUALITY_MAX,
  STUDIO_ASSET_QUALITY_WEIGHTS,
  INTERNAL_ASSET_AUDIT_MAX,
  INTERNAL_ASSET_AUDIT_PASS,
  INTERNAL_ASSET_AUDIT_GRADES,
  INTERNAL_ASSET_FAMILY_EXPECTATIONS,
  COMMON_UI_SURFACE_EXPECTATIONS,
  COMMON_ENVIRONMENT_BIOME_EXPECTATIONS,
  COMMON_ENVIRONMENT_ROLE_EXPECTATIONS,
  COMMON_TERRAIN_COMPOSITION_EXPECTATIONS,
  COMMON_ENVIRONMENT_STATE_EXPECTATIONS,
  COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS,
  SEED_ACTION_SURVIVAL_ROGUE_INTERNAL_ASSET_IDEAS,
  COMPANY_COMMON_SEED_ASSET_IDEA_AXES,
  COMPANY_COMMON_SEED_CROSS_GENRE_IDEA_KITS,
  COMMON_LIBRARY_LOOSE_VOLUME_BANDS,
  COMMON_UI_SUBSYSTEM_VOLUME_BANDS,
  COMMON_UI_SUBSYSTEM_IDEA_POOLS,
  COMMON_LIBRARY_AUTOMATED_IDEA_POOLS,
  INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT,
  INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES,
  INTERNAL_ASSET_REFERENCE_IDEA_POOLS,
  INTERNAL_PROGRESSION_COMPLEXITY_PROFILES,
  INTERNAL_ASSET_STYLE_EXPRESSION_AXES,
  INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS,
  INTERNAL_ASSET_STUDIO_VARIATION_AXES,
  INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT,
  buildInternalAssetMaintenanceSnapshot,
  resolveInternalAssetStyleExpressionProfile,
  selectInternalProgressionComplexityProfile,
  buildInternalAssetLibraryAutomationPlan,
  createCompanySeedAssetIdeationPlan,
  COMMON_PRESENTATION_EXPECTATIONS,
  COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS,
  COMMON_GENRE_SYSTEM_EXPECTATIONS,
  INTERNAL_ASSET_MINIMUM_COVERAGE,
  INTERNAL_ASSET_REUSE_POLICY,
  INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT,
  INTERNAL_ASSET_ADAPTATION_AXES,
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
  scoreInternalAssetAudit1000,
  evaluateInternalAssetReuse,
  chooseInternalAssetReplacement,
  scoreStudioAssetCandidate,
  buildStudioAssetLoadout,
  auditCommonLibrarySystemDepth,
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
import {createVibeCharacterPersona,resolveVibeCharacterBehaviorIntent,createVibePopulationPersonaDiversity,VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT,VIBE_NPC_ROLE_PRODUCTION_CONTRACT,VIBE_NPC_ROLE_MOTION_REQUIREMENTS,createVibeNpcRoleMotionRequirement,createVibeNpcPhysicalProfile,createVibeNpcRoleProfile,createVibeCharacterCustomizationRecipe,createVibeNpcCustomizationPopulation,createVibePhysicalDiversityGate} from '../assets/vibe-character-identity-director.js';
import {synchronizeCompanyCommonAssetRegistry,synchronizeSourceBoundAssetConsumers,buildAssetSupplyDecisionSummary,buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';

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

test('asset teacher covers every registered object family, base material family and canonical style',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../company-asset-library.json',import.meta.url),'utf8'));
  const before=JSON.stringify(registry);
  const families=[...new Set([...registry.assets.map(row=>row.family||row.category),...Object.keys(registry.baseMaterialLibrary.families)])];
  assert.deepEqual([...families].sort(),[...STUDIO_ASSET_FAMILIES].sort());
  for(const styleFamily of ASSET_STYLE_FAMILIES){
    const recipe=createAssetProductionTeachingRecipe({families,styleBible:{styleFamily}});
    assert.deepEqual(recipe.unmappedFamilies,[],styleFamily);
    assert.equal(recipe.familyLessons.length,families.length,styleFamily);
    assert.equal(recipe.style.needsSpecificBrief,false,styleFamily);
    assert.ok(recipe.style.lesson.length>40,styleFamily);
    assert.equal(recipe.runtimeVerified,false);
    assert.equal(recipe.productionVerified,false);
  }
  assert.equal(JSON.stringify(registry),before);
  const unknown=createAssetProductionTeachingRecipe({families:['UNKNOWN_FAMILY'],styleBible:{styleFamily:'UNKNOWN_STYLE'}});
  assert.deepEqual(unknown.unmappedFamilies,['UNKNOWN_FAMILY']);
  assert.equal(unknown.style.needsSpecificBrief,true);
});

test('asset teacher application code is scoped, original practice input and never quality authority',()=>{
  const all=createAssetProductionTeachingRecipe();
  assert.equal(all.applicationExamples.length,17);
  assert.equal(new Set(all.applicationExamples.map(row=>row.id)).size,17);
  for(const platform of ['UNITY','WEB']){
    const other=createAssetProductionTeachingRecipe({platform});
    assert.deepEqual(other.applicationExamples,[]);
    assert.deepEqual(other.advancedTechniques,[]);
    assert.equal(other.familyLessons.length,12);
  }
  for(const family of STUDIO_ASSET_FAMILIES){
    const recipe=createAssetProductionTeachingRecipe({families:[family]});
    assert.ok(recipe.applicationExamples.length>0,family);
    for(const row of recipe.applicationExamples){
      assert.ok(row.families.includes(family));
      assert.match(row.code,/local function/);
      assert.match(row.code,/return \w+$/);
      assert.ok(row.checks.length>50);
    }
    assert.equal(recipe.provenance,'TEACHER_AUTHORED');
    assert.equal(recipe.status,'PRACTICE_ONLY');
    assert.equal(recipe.runtimeVerified,false);
  }
  const motion=createAssetProductionTeachingRecipe({families:['MOTION']});
  assert.ok(motion.applicationExamples.some(row=>row.id==='PERIODIC_SWING_ENVELOPE'));
  assert.ok(!motion.applicationExamples.some(row=>row.id==='STABLE_INVENTORY_FILTER'));
  const ui=createAssetProductionTeachingRecipe({families:['UI']});
  assert.ok(ui.applicationExamples.some(row=>row.id==='LATEST_VIEW_RESULT_ONLY'));
  assert.ok(!ui.applicationExamples.some(row=>row.id==='SUPPORT_PLANE_OFFSET'));
});

test('cinematic teacher supplies scoped direction ideas and lifecycle code only when explicitly selected',()=>{
  const recipe=createAssetProductionTeachingRecipe({platform:'ROBLOX',cinematic:true});
  assert.equal(recipe.cinematicDirection.lessons.length,8);
  assert.equal(recipe.cinematicDirection.ideas.length,6);
  assert.equal(recipe.applicationExamples.length,20);
  assert.equal(recipe.cinematicDirection.runtimeVerified,false);
  assert.equal(recipe.cinematicDirection.gameplayAuthority,false);
  for(const row of recipe.cinematicDirection.ideas){assert.equal(row.beats.length,4);assert.ok(row.guard.length>50);}
  const ordinary=createAssetProductionTeachingRecipe({families:['MOTION']});
  assert.equal(ordinary.cinematicDirection,null);
  assert.ok(!ordinary.applicationExamples.some(row=>row.cinematicOnly));
  const ui=createAssetProductionTeachingRecipe({families:['UI'],cinematic:true});
  assert.ok(ui.applicationExamples.some(row=>row.id==='RELEASE_CINEMATIC_OWNERSHIP'));
  assert.ok(!ui.applicationExamples.some(row=>row.id==='CUBIC_BEZIER_CAMERA_COMPONENT'));
  const unity=createAssetProductionTeachingRecipe({platform:'UNITY',cinematic:true});
  assert.equal(unity.cinematicDirection,null);
  assert.deepEqual(unity.applicationExamples,[]);
});

test('actor AI teacher reuses actual decision contracts and scopes four intent examples to assigned actors',async()=>{
  const recipe=createAssetProductionTeachingRecipe({families:['monster','companion','npc'],actorAI:true});
  assert.deepEqual(recipe.unmappedFamilies,[]);
  assert.deepEqual(recipe.familyLessons.map(row=>row.family),['CREATURE','CHARACTER']);
  assert.equal(recipe.actorAI.lessons.length,8);
  assert.equal(recipe.applicationExamples.filter(row=>row.actorAIOnly).length,4);
  for(const row of recipe.actorAI.sources){
    const api=await import('../'+row.source);
    for(const name of row.exports)assert.equal(typeof api[name],'function',name);
  }
  const {JaewoonCommonAI}=await import('../assets/common-ai.js');
  const {validateVibeAIAction}=await import('../assets/vibe-ai-role-director.js');
  const ai=new JaewoonCommonAI();
  for(const method of recipe.actorAI.sources[0].methods)assert.equal(typeof ai[method],'function');
  for(const [context,state] of [[{entityKind:'monster',patrolReady:true},'PATROL'],[{entityKind:'npc',canInteract:true},'INTERACT'],[{entityKind:'companion',ownerDistance:20},'FOLLOW']]){
    const intent=ai.decide(context);assert.equal(intent.state,state);assert.equal(intent.gameplayAuthority,false);
    assert.equal(validateVibeAIAction(intent).safe,true);
  }
  assert.equal(validateVibeAIAction({state:'ATTACK',damage:999}).safe,false);
  for(const input of [{families:['MOTION']},{families:['UI']},{families:['UNKNOWN']},{families:['CREATURE'],platform:'UNITY'},{families:['CREATURE'],platform:'WEB'}]){
    const excluded=createAssetProductionTeachingRecipe({...input,actorAI:true});
    assert.equal(excluded.actorAI,null);assert.ok(!excluded.applicationExamples.some(row=>row.actorAIOnly));
  }
  assert.equal(createAssetProductionTeachingRecipe({families:['CREATURE'],visualReference:true}).actorAI,null);
  assert.equal(recipe.productionVerified,false);assert.equal(recipe.gameplayAuthority,false);
});

test('material and creature teacher scope native craft, body plans and original applications without certifying assets',()=>{
  const recipe=createAssetProductionTeachingRecipe({families:['animal'],platform:'ROBLOX',surfaceCraft:true,creatureCraft:true,styleBible:{styleFamily:'LOW_POLY'}});
  assert.equal(recipe.surfaceCraft.lessons.length,12);
  assert.equal(recipe.creatureCraft.lessons.length,9);
  assert.equal(recipe.style.profileKey,'LOW_POLY');
  for(const craft of [recipe.surfaceCraft,recipe.creatureCraft]){
    const source=fs.readFileSync(new URL('../'+craft.source,import.meta.url),'utf8');
    for(const api of craft.apis)assert.ok(source.includes('.'+api+'('),api);
    assert.equal(new Set(craft.lessons.map(row=>row.id)).size,craft.lessons.length);
    for(const row of craft.lessons)assert.ok(row.lesson.length>100&&row.check.length>40,row.id);
  }
  assert.match(recipe.surfaceCraft.nativeContract,/preservePhysics=true/);
  assert.match(recipe.surfaceCraft.nativeContract,/not PBR texture maps/);
  assert.match(recipe.creatureCraft.nativeContract,/not a working NPC rig/);
  assert.match(recipe.creatureCraft.designContract,/fallback bear/);
  assert.ok(recipe.applicationExamples.some(row=>row.id==='TAPERED_APPENDAGE_WAVE'));
  assert.ok(recipe.applicationExamples.some(row=>row.id==='DIRECTIONAL_SURFACE_MASK'));
  assert.equal(recipe.runtimeVerified,false);assert.equal(recipe.productionVerified,false);assert.equal(recipe.gameplayAuthority,false);
  const material=createAssetProductionTeachingRecipe({families:['MATERIAL'],surfaceCraft:true,creatureCraft:true});
  assert.ok(material.surfaceCraft);assert.equal(material.creatureCraft,null);
  assert.deepEqual(material.applicationExamples.filter(row=>row.creatureOnly),[]);
  for(const input of [{families:['MOTION']},{families:['UI']},{families:['UNKNOWN']},{families:['CREATURE'],platform:'UNITY'},{families:['CREATURE'],platform:'WEB'}]){
    const excluded=createAssetProductionTeachingRecipe({...input,surfaceCraft:true,creatureCraft:true});
    assert.equal(excluded.surfaceCraft,null);assert.equal(excluded.creatureCraft,null);
    assert.ok(!excluded.applicationExamples.some(row=>row.surfaceOnly||row.creatureOnly));
  }
  const ordinary=createAssetProductionTeachingRecipe({families:['CREATURE']});
  assert.equal(ordinary.surfaceCraft,null);assert.equal(ordinary.creatureCraft,null);
});

test('photo and world layout teacher separate pixel evidence from construction and reuse canonical layout APIs',async()=>{
  const photo=createAssetProductionTeachingRecipe({families:['CREATURE'],visualReference:true});
  assert.equal(photo.photoReferenceLessons.length,7);
  assert.equal(photo.worldLayoutLessons.length,0);
  assert.equal(photo.runtimeVerified,false);
  assert.deepEqual(createAssetProductionTeachingRecipe({families:['CREATURE']}).photoReferenceLessons,[]);
  const world=createAssetProductionTeachingRecipe({families:['ENVIRONMENT','BUILDING']});
  assert.equal(world.worldLayoutLessons.length,6);
  assert.ok(world.applicationExamples.some(row=>row.id==='PATH_SEGMENT_CLEARANCE'));
  const routeLesson=world.worldLayoutLessons.find(row=>row.id==='ROUTE_GRAPH_BEFORE_DRESSING');
  const api=await import('../'+routeLesson.source);
  for(const name of routeLesson.apis)assert.equal(typeof api[name],'function');
  const nodes=[{id:'entry',role:'spawn'},{id:'door',role:'entrance'},{id:'goal',role:'objective'}];
  const blocked=api.createVibeRouteGraph({nodes,edges:[{from:'entry',to:'door'}]});
  assert.equal(blocked.pass,false);assert.deepEqual(blocked.unreachable,['goal']);
  const connected=api.createVibeRouteGraph({nodes,edges:[{from:'entry',to:'door'},{from:'door',to:'goal'}]});
  assert.equal(connected.pass,true);
  assert.match(routeLesson.lesson,/only an abstract proposal/);
});

test('advanced teacher selects applicable techniques with failure checks and preserves authority boundaries',()=>{
  const all=createAssetProductionTeachingRecipe({platform:'roblox'});
  assert.equal(all.advancedTechniques.length,8);
  for(const family of STUDIO_ASSET_FAMILIES){
    const recipe=createAssetProductionTeachingRecipe({families:[family],platform:'roblox'});
    assert.ok(recipe.advancedTechniques.length>0,family);
    for(const row of recipe.advancedTechniques){
      assert.ok(row.families.includes(family));
      assert.ok(row.when.length>30&&row.lesson.length>100&&row.check.length>80,row.id);
    }
    assert.equal(recipe.runtimeVerified,false);
    assert.equal(recipe.gameplayAuthority,false);
  }
  const motion=createAssetProductionTeachingRecipe({families:['MOTION']});
  assert.deepEqual(motion.advancedTechniques.map(row=>row.id),['CONTACT_IK_AND_REACH','INERTIAL_SECONDARY_RESPONSE','ROTATION_SPACE_AND_BLENDING']);
  assert.ok(motion.applicationExamples.some(row=>row.id==='TWO_BONE_REACH_GEOMETRY'));
  assert.ok(!motion.applicationExamples.some(row=>row.id==='SPATIAL_HASH_DECORATIVE_SPACING'));
  const ui=createAssetProductionTeachingRecipe({families:['UI']});
  assert.ok(ui.applicationExamples.some(row=>row.id==='VIRTUALIZED_FIXED_ROW_WINDOW'));
  assert.ok(!ui.advancedTechniques.some(row=>row.id==='PBR_UV_AND_STYLE_LOCK'));
});

test('asset teacher details buildings settlements weather items inventory and menus using existing native APIs',()=>{
  const recipe=createAssetProductionTeachingRecipe({families:['modern_building','medieval_building','village','city','weather','background_prop','item','inventory','menu','system_ui']});
  assert.deepEqual(recipe.unmappedFamilies,[]);
  assert.deepEqual(recipe.familyLessons.map(row=>row.family),['BUILDING','ENVIRONMENT','PROP','UI']);
  assert.deepEqual(recipe.domainModules.map(row=>row.id),['MODERN_BUILDINGS','MEDIEVAL_BUILDINGS','SETTLEMENT_LAYOUT','BACKGROUND_LAYERS','WEATHER_PRESENTATION','SET_DRESSING','ITEM_REPRESENTATIONS','INVENTORY_VARIANTS','MENU_NAVIGATION','SYSTEM_SCREENS']);
  for(const module of recipe.domainModules){
    const source=fs.readFileSync(new URL('../'+module.source,import.meta.url),'utf8');
    for(const api of module.apis)assert.match(source,new RegExp('function\\s+\\w+\\.'+api+'\\s*\\('),module.id+':'+api);
    assert.ok(module.lesson.length>100);
    assert.ok(module.check.length>60);
  }
  assert.deepEqual(recipe.domainModules.find(row=>row.id==='WEATHER_PRESENTATION').states,COMMON_ENVIRONMENT_STATE_EXPECTATIONS);
  assert.deepEqual(createAssetProductionTeachingRecipe({families:['MOTION']}).domainModules,[]);
  assert.equal(recipe.gameplayAuthority,false);
  assert.equal(recipe.runtimeVerified,false);
});

test('asset teacher maps production aliases and respects a selected art lock without conflating cozy and cartoon',()=>{
  const recipe=createAssetProductionTeachingRecipe({families:['npc','monster','animal','plant','background','item','effect','animation'],styleBible:{styleFamily:'DARK_CARTOON'}});
  assert.deepEqual(recipe.familyLessons.map(row=>row.family),['CHARACTER','CREATURE','ENVIRONMENT','PROP','VFX','MOTION']);
  assert.equal(recipe.style.profileKey,'TOON_NOIR');
  const cozy=createStyleBible({styleFamily:'COZY'}),cartoon=createStyleBible({styleFamily:'CARTOON'});
  assert.notEqual(cozy.shapeLanguage,cartoon.shapeLanguage);
  assert.equal(cozy.styleExpression.axes.MOTION_ENERGY,'SUBTLE');
  assert.equal(cartoon.styleExpression.axes.MOTION_ENERGY,'EXAGGERATED');
  const locked=createAssetProductionTeachingRecipe({styleBible:{...cozy,shapeLanguage:'OWNER_SHAPE',styleExpression:{axes:{MOTION_ENERGY:'EXPRESSIVE'}}}});
  assert.equal(locked.style.shape,'OWNER_SHAPE');
  assert.equal(locked.style.expression.axes.MOTION_ENERGY,'EXPRESSIVE');
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

test('style expression axes adapt rough soft expressive and restrained concepts across every internal domain',()=>{
  const requiredDomains=['BUILDING','CREATURE','MOTION','UI','WORLD_PROP','ENVIRONMENT','ITEM','SKILL','VFX','PRESENTATION','CHARACTER_GEAR','WEAPON','AUDIO','FOLIAGE','MATERIAL'];
  for(const axis of ['SURFACE_FEEL','SHAPE_TEMPER','EXPRESSION_INTENSITY','MATERIAL_FINISH','LINE_ENERGY','COLOR_ENERGY','DETAIL_DENSITY','DAMAGE_WEAR','MOTION_ENERGY','VFX_ENERGY','UI_EXPRESSION','AUDIO_ENERGY','ATMOSPHERE_WEIGHT']){
    assert.ok(INTERNAL_ASSET_STYLE_EXPRESSION_AXES[axis],axis);
    assert.ok(INTERNAL_ASSET_STYLE_EXPRESSION_AXES[axis].length>=3,axis);
  }
  for(const domain of requiredDomains){
    assert.ok(INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS[domain],domain);
    assert.ok(INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS[domain].length>0,domain);
  }

  const dark=resolveInternalAssetStyleExpressionProfile({styleFamily:'DARK_FANTASY',artTone:['DARK','EPIC']});
  assert.equal(dark.axes.SURFACE_FEEL,'ROUGH');
  assert.equal(dark.axes.SHAPE_TEMPER,'SHARP');
  assert.equal(dark.axes.MATERIAL_FINISH,'WEATHERED');
  assert.equal(dark.axes.DETAIL_DENSITY,'DENSE');
  assert.equal(dark.axes.VFX_ENERGY,'SPECTACULAR');

  const soft=resolveInternalAssetStyleExpressionProfile({styleFamily:'CARTOON',artTone:['BRIGHT','CUTE']});
  assert.equal(soft.axes.SURFACE_FEEL,'SOFT');
  assert.equal(soft.axes.SHAPE_TEMPER,'ROUND');
  assert.equal(soft.axes.COLOR_ENERGY,'VIBRANT');
  assert.equal(soft.axes.DAMAGE_WEAR,'CLEAN');

  const wuxia=resolveInternalAssetStyleExpressionProfile({styleFamily:'WUXIA',artTone:['ELEGANT']});
  assert.equal(wuxia.axes.SHAPE_TEMPER,'FLOWING');
  assert.equal(wuxia.axes.EXPRESSION_INTENSITY,'RESTRAINED');
  assert.equal(wuxia.axes.MATERIAL_FINISH,'MATTE');
  assert.equal(wuxia.axes.DETAIL_DENSITY,'SELECTIVE_DENSE');

  const ownerOverride=resolveInternalAssetStyleExpressionProfile({
    styleFamily:'CARTOON',
    overrides:{SURFACE_FEEL:'ROUGH',EXPRESSION_INTENSITY:'RESTRAINED'}
  });
  assert.equal(ownerOverride.axes.SURFACE_FEEL,'ROUGH');
  assert.equal(ownerOverride.axes.EXPRESSION_INTENSITY,'RESTRAINED');
  assert.equal(ownerOverride.conceptStyleLockWins,true);
  assert.equal(ownerOverride.gameplayAuthority,false);
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
  assert.equal(CLOTHING_LAYER_SLOTS.length,24);
  assert.ok(BIOME_FAMILIES.length>=18);
  assert.ok(BUILDING_THEMES.length>=12);
  for(const style of ['INK_WASH','WATERCOLOR','NOIR','TOON_NOIR','SOLARPUNK','BIOPUNK','RETRO_FUTURISM','COZY','PAPER_CRAFT','VOXEL','DREAMCORE','HISTORICAL_EAST_ASIAN','SPACE_OPERA','UNDERWATER_FANTASY','DESERT_FANTASY','MYTHIC_NORDIC']){
    assert.ok(createStudioAssetUniversePlan({styleFamily:style}).styleFamilies.includes(style),style);
  }
});

test('deep RPG character customization breadth drives player and NPC variety without gameplay authority',()=>{
  const contract=VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT;
  assert.equal(contract.version,1);
  assert.equal(contract.sharedAssetPoolForPlayerAndNpc,true);
  assert.equal(contract.protectedExpressionCopyForbidden,true);
  assert.equal(contract.exactThirdPartyFaceHairTattooOutfitUiCopyForbidden,true);
  assert.ok(contract.targetMinimums.HEAD_BASE>=48);
  assert.ok(contract.targetMinimums.FACE_MORPH_CONTROL>=28);
  assert.ok(contract.targetMinimums.HAIR_STYLE>=48);
  assert.ok(contract.targetMinimums.CLOTHING_LAYER_VARIANT>=60);
  assert.equal(contract.npcPopulationRules.colorOnlyDuplicateForbidden,true);
  assert.equal(contract.npcPopulationRules.speciesPartCompatibilityRequired,true);
  assert.equal(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.version,2);
  assert.equal(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.required,true);
  assert.equal(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.appearanceOnlyByDefault,true);
  assert.equal(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.collisionHitboxMovementStatsRemainGameOwned,true);
  assert.ok(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.axes.includes('HEIGHT_CM'));
  assert.ok(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.axes.includes('WEIGHT_KG'));
  assert.ok(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.appearanceDiversity.axes.includes('HAIR_STYLE'));
  assert.ok(VIBE_NPC_ROLE_PRODUCTION_CONTRACT.appearanceDiversity.axes.includes('OUTFIT_LAYERING'));
  assert.equal(contract.production.photoObservationMaySeedVisibleFormAndSurfaceIdeas,true);
  assert.equal(contract.production.runtimeVerificationRequiredBeforeProductionPromotion,true);
  assert.equal(contract.gameplayAuthority,false);

  assert.equal(DEFAULT_COVERAGE_BASELINES.CHARACTER.BODY_ARCHETYPE,12);
  assert.equal(DEFAULT_COVERAGE_BASELINES.CHARACTER.HEAD_BASE,48);
  assert.equal(DEFAULT_COVERAGE_BASELINES.CHARACTER.FACE_MORPH,28);
  assert.equal(DEFAULT_COVERAGE_BASELINES.CHARACTER.HAIR,48);
  assert.equal(DEFAULT_COVERAGE_BASELINES.CHARACTER.CLOTHING,60);

  const recipe=createVibeCharacterCustomizationRecipe({name:'qa-hero',species:'elflike',role:'scholar',region:'coast'},7);
  assert.equal(recipe.productionVerified,false);
  assert.equal(recipe.gameplayAuthority,false);
  assert.equal(recipe.speciesParts.horn,'NONE');
  assert.equal(recipe.speciesParts.tail,'NONE');
  assert.ok(['POINTED','LONG','NOTCHED'].includes(recipe.speciesParts.ear));
  assert.ok(recipe.head.faceWidth>=0&&recipe.head.faceWidth<=1);
  assert.ok(recipe.hair.style);

  const population=createVibeNpcCustomizationPopulation({
    count:48,
    seed:'qa-npc-population',
    roles:['MERCHANT','GUARD','ARTISAN','SCHOLAR'],
    regions:['COAST','MOUNTAIN','CITY'],
    species:['humanoid','elflike']
  });
  assert.equal(population.total,48);
  assert.equal(population.unique,48);
  assert.equal(population.diversityPercent,100);
  assert.equal(population.cloneRatePercent,0);
  assert.equal(population.sameAssetPoolAsPlayerCustomization,true);
  assert.equal(population.productionVerified,false);
  assert.equal(population.physicalDiversityPercent,100);
  assert.ok(population.heightRangeCm[1]-population.heightRangeCm[0]>=20);
  assert.ok(population.weightRangeKg[1]-population.weightRangeKg[0]>=30);
  assert.ok(population.scaleClassCoverage.length>=3);
  assert.ok(population.visualMassCoverage.length>=3);
  assert.ok(population.recipes.every(row=>row.speciesParts.compatibilityChecked===true));
  assert.ok(population.recipes.every(row=>row.npcRoleProfile.physical.heightCm===row.body.heightCm));
  assert.ok(population.recipes.every(row=>row.npcRoleProfile.physical.weightKg===row.body.weightKg));
  assert.ok(population.recipes.every(row=>row.presentation.gait.bodyScaleLanguage===row.body.scaleClass));
  assert.ok(new Set(population.recipes.map(row=>row.head.baseFamily)).size>=6);
  assert.ok(new Set(population.recipes.map(row=>row.hair.style)).size>=8);
});

test('NPC physical and role profiles support companions service roles elites and humanoid bosses without gameplay stat mutation',()=>{
  const companion=createVibeNpcRoleProfile({role:'COMPANION',character:{name:'party-a',species:'humanoid'},index:3});
  assert.equal(companion.role,'COMPANION');
  assert.equal(companion.masterGlbRequired,true);
  assert.ok(companion.motion.includes('FOLLOW'));
  assert.ok(companion.motion.includes('ASSIST'));
  assert.equal(companion.physical.appearanceOnly,true);
  assert.equal(companion.physical.authoritativeHitboxOwnedByGame,true);
  assert.equal(companion.physical.movementSpeedUnchanged,true);

  const boss=createVibeNpcPhysicalProfile({name:'named-boss',role:'HUMANOID_BOSS',heightCm:248,weightKg:210,frame:'heavy'},7);
  assert.equal(boss.role,'HUMANOID_BOSS');
  assert.equal(boss.heightCm,248);
  assert.equal(boss.weightKg,210);
  assert.equal(boss.scaleClass,'GIANT');
  assert.equal(boss.statsUnchanged,true);
  assert.equal(boss.authoritativeCollisionScaleOwnedByGame,true);

  const diversityGate=createVibePhysicalDiversityGate({characters:[
    {name:'small-merchant',role:'MERCHANT',heightCm:148,weightKg:48,frame:'compact',posture:'relaxed'},
    {name:'tall-guard',role:'GUARD',heightCm:202,weightKg:118,frame:'broad',posture:'upright'},
    {name:'boss',role:'HUMANOID_BOSS',heightCm:248,weightKg:210,frame:'heavy',posture:'forward'}
  ]});
  assert.equal(diversityGate.pass,true,diversityGate.issues.join(','));
  assert.equal(diversityGate.minimumDistinctAxes,VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.nearbyDistinctAxisMinimum);

  for(const role of ['GENERAL_NPC','MERCHANT','QUEST_GIVER','GUARD','WORKER','HEALER','RIVAL','NAMED_ELITE','HUMANOID_BOSS']){
    const row=createVibeNpcRoleProfile({role,character:{name:'qa-'+role,species:'humanoid'},index:2});
    assert.equal(row.role,role);
    assert.equal(row.masterFormat,'GLB_2_0');
    assert.equal(row.primitivePartOrWeldOnlyFinalNpcForbidden,true);
    assert.ok(row.identity.length>=3);
    assert.ok(row.motion.length>=5);
  }
});

test('NPC role motion contract binds presentation states to real role motion without taking gameplay authority',()=>{
  assert.equal(VIBE_NPC_ROLE_MOTION_REQUIREMENTS.status,'ACTIVE_MACHINE_READABLE_NPC_ROLE_MOTION');
  assert.equal(VIBE_NPC_ROLE_MOTION_REQUIREMENTS.masterActor.masterStaticQaDoesNotGrantProductionVerified,true);
  const merchant=createVibeNpcRoleMotionRequirement({role:'MERCHANT'});
  assert.ok(merchant.requiredClips.includes('TRADE_INTERACTION'));
  assert.ok(merchant.stateBindings.INTERACT.includes('GREET'));
  const companion=createVibeNpcRoleMotionRequirement({role:'COMPANION'});
  assert.ok(companion.stateBindings.FOLLOW.includes('JOG_OR_RUN'));
  assert.ok(companion.requiredClips.includes('REVIVE_HELP'));
  const guard=createVibeNpcRoleMotionRequirement({role:'GUARD'});
  assert.ok(guard.stateBindings.ALERT.includes('DRAW_WEAPON'));
  const boss=createVibeNpcRoleProfile({role:'HUMANOID_BOSS',character:{name:'boss'}});
  assert.ok(boss.motionRequirements.requiredClips.includes('PHASE_CHANGE'));
  assert.ok(boss.stateMotionBindings.COMBAT.includes('SPECIAL_ATTACK_SET'));
  assert.equal(boss.masterActorPackage.jointAnimationChannelsRequired,true);
  assert.equal(boss.productionVerified,false);
  assert.equal(boss.runtimeVerificationState,'PENDING_PLATFORM_NATIVE_RUNTIME');

  const recipe=createVibeCharacterCustomizationRecipe({name:'merchant-a',role:'MERCHANT',species:'humanoid'},1);
  assert.equal(recipe.final3dActorPackage.masterGlbRequired,true);
  assert.equal(recipe.final3dActorPackage.masterAssetFormat,'GLB_2_0');
  assert.ok(recipe.final3dActorPackage.requiredStaticContents.includes('JOINT_WEIGHTS'));
  assert.ok(recipe.final3dActorPackage.motionRequirements.stateBindings.INTERACT.includes('TRADE_INTERACTION'));

  const persona=createVibeCharacterPersona({name:'guard-a',role:'GUARD'},1);
  assert.equal(persona.final3dActorPresentation.masterGlbRequired,true);
  assert.equal(persona.final3dActorPresentation.actualJointMotionRequired,true);
  assert.equal(persona.gameplayAuthority,false);
});

test('reference image observations become task-local character customization ideas without persistent copy claims',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const sourceId='qa-character-reference';
  const imageRef='conversation://qa-character-reference.png';
  const sourceHash='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const plan=buildVibeAssetProductionPlan({
    task:{
      gameId:'reference-character-customization-test',
      goal:'캐릭터 NPC 커스터마이징 사진 참고 제작',
      imageToAsset:true,
      characterCustomization:{npcPreviewCount:12},
      referenceImages:[{
        sourceId,
        sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
        imageRef,
        sourceHash,
        purpose:'ASSET_CREATION',
        observation:{
          sourceId,imageRef,sourceHash,
          SILHOUETTE:'broad shoulder narrow waist readable head shape',
          PROPORTIONS:'long legs compact torso',
          MATERIAL_REGIONS:'skin hair cloth metal accessory',
          PALETTE:'warm skin dark hair muted cloth',
          CONSTRUCTION_DETAILS:'layered hair collar piercing belt',
          STYLE_LANGUAGE:'stylized realistic fantasy',
          IDENTITY_ANCHORS:'asymmetric brow scar ear accessory',
          UNSEEN_REGIONS:'creative proposal required',
          MOTION_DESIGN:'creative proposal required'
        },
        verifiedAgainstSource:true
      }]
    },
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(plan.imageAssetCreation.enabled,true);
  assert.equal(plan.imageAssetCreation.ideaWorklistIsTaskLocal,true);
  assert.equal(plan.imageAssetCreation.ideaWorklistPersistenceForbidden,true);
  assert.ok(plan.imageAssetCreation.ideaWorklist.length>=8);
  assert.ok(plan.imageAssetCreation.ideaWorklist.every(row=>row.domain==='CHARACTER'));
  assert.ok(plan.imageAssetCreation.ideaWorklist.every(row=>row.directCopyForbidden===true&&row.productionVerified===false));
  assert.ok(plan.imageAssetCreation.ideaWorklist.some(row=>row.customizationAxis==='BODY_ARCHETYPE'));
  assert.ok(plan.imageAssetCreation.ideaWorklist.some(row=>row.customizationAxis==='SCAR_TATTOO_MAKEUP'));
  assert.equal(plan.imageAssetCreation.volumeWorklistOverlayConsumesBeforePersistentActions,true);
  assert.equal(plan.imageAssetCreation.volumeWorklistOverlayCount,plan.imageAssetCreation.ideaWorklist.length);
  assert.ok(plan.imageAssetCreation.volumeWorklistOverlay.every(row=>row.kind==='REFERENCE_IMAGE_VOLUME'));
  assert.ok(plan.imageAssetCreation.volumeWorklistOverlay.every(row=>row.taskLocalOnly===true&&row.persistToCentralWorklist===false));
  assert.equal(plan.internalLibraryEvolution.referenceImageObservationOverlay,true);
  assert.equal(plan.internalLibraryEvolution.referenceImageIdeasPersisted,false);
  assert.equal(plan.internalLibraryEvolution.rawReferenceImagePersisted,false);
  assert.equal(plan.internalLibraryEvolution.taskLocalReferenceActionCount,plan.imageAssetCreation.ideaWorklist.length);
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].kind,'REFERENCE_IMAGE_VOLUME');
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].referenceSourceId,sourceId);
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].referenceSourceHash,sourceHash);
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].referenceImageRef,imageRef);
  assert.ok(plan.internalLibraryEvolution.nextVolumeActions[0].referenceFeatureSummary.length>0);
  assert.match(plan.internalLibraryEvolution.worklistSource,/^TASK_REFERENCE_IMAGE_OVERLAY_ON_/);
  assert.equal(plan.companyGraphicsLibrary.characterNpcCustomization.requested,true);
  assert.equal(plan.companyGraphicsLibrary.characterNpcCustomization.playerAndNpcShareAssetPool,true);
  assert.equal(plan.companyGraphicsLibrary.characterNpcCustomization.npcPopulationPreview.total,12);
  assert.equal(plan.companyGraphicsLibrary.characterNpcCustomization.productionVerified,false);
});

test('building reference image expands into detailed task-local building volume ideas',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const sourceId='qa-building-reference';
  const imageRef='conversation://qa-building-reference.png';
  const sourceHash='abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  const plan=buildVibeAssetProductionPlan({
    task:{
      gameId:'reference-building-volume-test',
      goal:'거칠고 표현력 강한 다크 판타지 건물 사진 보고 내부자산 아이디어 제작',
      imageToAsset:true,
      referenceImages:[{
        sourceId,
        sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
        imageRef,
        sourceHash,
        domain:'BUILDING',
        purpose:'ASSET_CREATION',
        observation:{
          sourceId,imageRef,sourceHash,
          SILHOUETTE:'stepped massing with a tall roof and readable facade rhythm',
          PROPORTIONS:'two-story mass with narrow bays and oversized entry',
          MATERIAL_REGIONS:'stone foundation timber wall dark roof metal trim',
          PALETTE:'warm wood cool stone dark roof bright accent',
          CONSTRUCTION_DETAILS:'exposed beams deep window trim roof brackets repair patches',
          STYLE_LANGUAGE:'rough weathered dramatic dark fantasy frontier settlement architecture',
          IDENTITY_ANCHORS:'asymmetric tower corner banner and entry canopy',
          UNSEEN_REGIONS:'creative proposal required',
          MOTION_DESIGN:'creative proposal required'
        },
        verifiedAgainstSource:true
      }]
    },
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  const ideas=plan.imageAssetCreation.ideaWorklist;
  assert.ok(ideas.length>=16);
  assert.ok(ideas.every(row=>row.domain==='BUILDING'));
  for(const axis of ['MASSING_FAMILY','ROOF_PROFILE','FACADE_PROFILE','FLOOR_HEIGHT_RATIO','BAY_SPACING','FOUNDATION_WALL_ROOF_JOINERY','WINDOW_DOOR_TRIM','LANDMARK_ACCENT']){
    assert.ok(ideas.some(row=>row.customizationAxis===axis),axis);
  }
  assert.equal(plan.imageAssetCreation.volumeWorklistOverlayConsumesBeforePersistentActions,true);
  assert.equal(plan.imageAssetCreation.styleExpression.axes.SURFACE_FEEL,'ROUGH');
  assert.equal(plan.imageAssetCreation.styleExpression.axes.EXPRESSION_INTENSITY,'EXPRESSIVE');
  assert.equal(plan.imageAssetCreation.styleExpression.axes.MATERIAL_FINISH,'WEATHERED');
  assert.equal(plan.imageAssetCreation.conceptStyleLockWins,true);
  assert.ok(plan.imageAssetCreation.volumeWorklistOverlay.every(row=>row.styleExpressionAdaptationRequired===true));
  assert.ok(plan.imageAssetCreation.volumeWorklistOverlay.every(row=>row.styleExpression.axes.SURFACE_FEEL==='ROUGH'));
  assert.equal(plan.internalLibraryEvolution.styleExpressionRequiredForAllDomains,true);
  assert.equal(plan.internalLibraryEvolution.styleExpression.axes.SURFACE_FEEL,'ROUGH');
  assert.equal(plan.internalLibraryEvolution.photoReferenceMaySuggestButNotOverrideConceptLock,true);
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].kind,'REFERENCE_IMAGE_VOLUME');
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].domain,'BUILDING');
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].referenceSourceId,sourceId);
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].referenceSourceHash,sourceHash);
  assert.equal(plan.internalLibraryEvolution.nextVolumeActions[0].referenceImageRef,imageRef);
  assert.ok(plan.internalLibraryEvolution.nextVolumeActions[0].referenceFeatureSummary.length>0);
  assert.ok(plan.internalLibraryEvolution.nextVolumeActions[0].freeSourceCandidateIds.includes('kenney-modular-buildings'));
  assert.equal(plan.internalLibraryEvolution.referenceImageIdeasPersisted,false);
  assert.equal(plan.internalLibraryEvolution.rawReferenceImagePersisted,false);
});

test('one mixed reference image can seed multiple internal asset domains without copying the scene',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const sourceId='qa-mixed-harbor-reference';
  const imageRef='conversation://qa-mixed-harbor-reference.png';
  const sourceHash='1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const plan=buildVibeAssetProductionPlan({
    task:{
      gameId:'reference-mixed-scene-volume-test',
      goal:'항구 사진 보고 건물 소품 환경 내부자산 아이디어 제작',
      imageToAsset:true,
      referenceImages:[{
        sourceId,
        sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
        imageRef,
        sourceHash,
        domains:['BUILDING','WORLD_PROP','ENVIRONMENT'],
        purpose:'ASSET_CREATION',
        observation:{
          sourceId,imageRef,sourceHash,
          SILHOUETTE:'pier warehouse lighthouse crates and layered coast horizon',
          PROPORTIONS:'low warehouse long pier tall lighthouse small cargo props',
          MATERIAL_REGIONS:'wood stone rope cloth metal water vegetation',
          PALETTE:'weathered timber pale stone deep water muted sail accents',
          CONSTRUCTION_DETAILS:'dock posts rope knots warehouse beams crate handles seawall joints',
          STYLE_LANGUAGE:'stylized maritime trade settlement',
          IDENTITY_ANCHORS:'lighthouse harbor crane market flags',
          UNSEEN_REGIONS:'creative proposal required',
          MOTION_DESIGN:'creative proposal required'
        },
        verifiedAgainstSource:true
      }]
    },
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  const domains=new Set(plan.imageAssetCreation.ideaWorklist.map(row=>row.domain));
  assert.ok(domains.has('BUILDING'));
  assert.ok(domains.has('WORLD_PROP'));
  assert.ok(domains.has('ENVIRONMENT'));
  assert.ok(plan.imageAssetCreation.ideaWorklist.every(row=>row.directCopyForbidden===true));
  assert.ok(plan.imageAssetCreation.volumeWorklistOverlay.some(row=>row.domain==='WORLD_PROP'&&row.freeSourceAvailable===true));
  assert.ok(plan.imageAssetCreation.volumeWorklistOverlay.some(row=>row.domain==='ENVIRONMENT'&&row.freeSourceAvailable===true));
  assert.equal(plan.imageAssetCreation.ideaWorklistPersistenceForbidden,true);
  assert.equal(plan.internalLibraryEvolution.rawReferenceImagePersisted,false);
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
  const adaptableMismatch=scoreStudioAssetCandidate({asset:assets[2],gameDna:{...dna,targetPlatform:'UNITY'},requirement:{family:'WEAPON',subfamily:'MELEE'}});
  assert.equal(adaptableMismatch.rejected,false);
  assert.equal(adaptableMismatch.applicationMode,'STYLE_ADAPT');
});

test('studio asset universe requires GLB 2.0 masters for final 3D character and creature assets',()=>{
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.status,'ACTIVE_EXECUTABLE_CONTRACT');
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.format,'GLB_2_0');
  assert.deepEqual([...CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.appliesToFamilies],['CHARACTER','CREATURE']);
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.requiredBeforePlatformNativeVariant,true);
  assert.ok(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.requiredContents.includes('JOINT_WEIGHTS'));
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.structuralChecks.jointAnimationChannelRequired,true);
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.actorPackageRequirements.attachmentSocketBasisRequired,true);
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.actorPackageRequirements.productionVerifiedRequiresPlatformNativeRuntime,true);
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.primitivePartAssemblyPrototypeOnly,true);
  assert.equal(CROSS_PLATFORM_3D_MASTER_GLB_CONTRACT.primitiveOrColorOnlyMayNotClaimFinal3dActor,true);

  const blocked=evaluateCompanyAssetPromotion({
    asset:{id:'missing-master',family:'CREATURE',platform:'ROBLOX',path:'assets/wolf.rbxm',license:'project-original',sourceHash:'wolf-v1'},
    consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{
      assetId:'missing-master',platform:'ROBLOX',gameId:'survival',sourceHash:'wolf-v1',
      nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true
    }
  });
  assert.equal(blocked.eligible,false);
  assert.ok(blocked.blockers.includes('CROSS_PLATFORM_MASTER_GLB_REQUIRED'));
  assert.ok(blocked.blockers.includes('CROSS_PLATFORM_MASTER_GLB_HASH_REQUIRED'));
  assert.ok(blocked.blockers.includes('CROSS_PLATFORM_MASTER_GLB_STATIC_QA_REQUIRED'));

  const library=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  assert.deepEqual(library.universalCoverage.crossPlatform3dMasterGlbContract.appliesToRoles,library.rules.crossPlatform3dMasterGlbRoles);
  assert.deepEqual(library.universalCoverage.crossPlatform3dMasterGlbContract.roleFamilies,library.rules.crossPlatform3dMasterGlbRoleFamilies);

  const wildlife=createSurvivalWildlifeAssetProfile({species:'WOLF',platform:'ROBLOX'});
  assert.equal(wildlife.masterGlbRequired,true);
  assert.equal(wildlife.masterAssetFormat,'GLB_2_0');
});

test('company asset promotion is impossible without actual native runtime consumer evidence',()=>{
  const asset={id:'wolf-runtime',family:'CREATURE',platform:'ROBLOX',path:'assets/wolf.roblox',license:'project-original',sourceHash:'wolf-v1',artifactHash:'wolf-native-v1',masterGlb:'assets/wolf.glb',masterGlbHash:'wolf-master-v1',derivedFromMasterGlbHash:'wolf-master-v1',masterGlbStaticQaPass:true,masterGlbQaAuthority:'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb'};
  const blocked=evaluateCompanyAssetPromotion({
    asset,consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{platform:'ROBLOX',sourceHash:'wolf-v1',nativeBindingPass:true,visualRuntimePass:true}
  });
  assert.equal(blocked.eligible,false);
  assert.ok(blocked.blockers.includes('MOBILE_PERFORMANCE_PASS_REQUIRED'));
  assert.equal(blocked.promotion,null);

  const evidence={
    id:'studio-run-1',assetId:'wolf-runtime',platform:'ROBLOX',gameId:'survival',sourceHash:'wolf-v1',artifactHash:'wolf-native-v1',
    masterGlbHash:'wolf-master-v1',derivedFromMasterGlbHash:'wolf-master-v1',
    nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true
  };
  const hashless=evaluateCompanyAssetPromotion({
    asset,consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{assetId:'wolf-runtime',platform:'ROBLOX',gameId:'survival',nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true}
  });
  assert.equal(hashless.eligible,false);
  assert.ok(hashless.blockers.includes('RUNTIME_ASSET_HASH_REQUIRED'));
  assert.ok(hashless.blockers.includes('RUNTIME_MASTER_GLB_HASH_REQUIRED'));
  assert.ok(hashless.blockers.includes('RUNTIME_MASTER_GLB_LINEAGE_REQUIRED'));
  assert.ok(hashless.blockers.includes('RUNTIME_NATIVE_ARTIFACT_HASH_REQUIRED'));

  const wrongLineage=evaluateCompanyAssetPromotion({asset,consumer:{gameId:'survival'},runtimeEvidence:{...evidence,derivedFromMasterGlbHash:'other-master'}});
  assert.equal(wrongLineage.eligible,false);
  assert.ok(wrongLineage.blockers.includes('RUNTIME_MASTER_GLB_LINEAGE_MISMATCH'));

  const missingQaAuthority=evaluateCompanyAssetPromotion({asset:{...asset,masterGlbQaAuthority:''},consumer:{gameId:'survival'},runtimeEvidence:evidence});
  assert.equal(missingQaAuthority.eligible,false);
  assert.ok(missingQaAuthority.blockers.includes('CROSS_PLATFORM_MASTER_GLB_QA_AUTHORITY_REQUIRED'));

  const missingDeclaredLineage=evaluateCompanyAssetPromotion({asset:{...asset,derivedFromMasterGlbHash:null},consumer:{gameId:'survival'},runtimeEvidence:evidence});
  assert.equal(missingDeclaredLineage.eligible,false);
  assert.ok(missingDeclaredLineage.blockers.includes('PLATFORM_NATIVE_DERIVATION_HASH_REQUIRED'));

  const masterAsNative=evaluateCompanyAssetPromotion({asset:{...asset,path:'assets/wolf.glb'},consumer:{gameId:'survival'},runtimeEvidence:{...evidence,artifactPath:'assets/wolf.glb'}});
  assert.equal(masterAsNative.eligible,false);
  assert.ok(masterAsNative.blockers.includes('PLATFORM_NATIVE_DERIVATIVE_REQUIRED'));

  const ready=evaluateCompanyAssetPromotion({asset,consumer:{gameId:'survival'},runtimeEvidence:evidence});
  assert.equal(ready.eligible,true);
  assert.equal(ready.promotion.verifiedCompanyReusable,true);
  assert.equal(ready.promotion.productionVerified,true);
  assert.equal(ready.promotion.runtimeVerificationState,'VERIFIED_NATIVE_RUNTIME');
  assert.equal(ready.promotion.masterGlbQaAuthority,'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb');

  const promoted=promoteVerifiedCompanyAssetRegistry({registry:{version:28,assets:[]},asset,consumer:{gameId:'survival'},runtimeEvidence:evidence});
  assert.equal(promoted.updated,true);
  assert.equal(promoted.registry.version,29);
  assert.equal(promoted.registry.assets.length,1);
  assert.equal(promoted.registry.assets[0].status,'VERIFIED_COMPANY_ASSET');

  const derivedAsset={id:'wolf-derived',family:'CREATURE',platform:'ROBLOX',path:'assets/wolf-derived.roblox',license:'project-original-derivative',sourceSha256:'source-v1',derivedSha256:'artifact-v2',masterGlb:'assets/wolf-derived.glb',masterGlbHash:'wolf-derived-master-v1',derivedFromMasterGlbHash:'wolf-derived-master-v1',masterGlbStaticQaPass:true,masterGlbQaAuthority:'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb'};
  const exactBatch=promoteVerifiedCompanyAssetsFromRuntimeEvidence({
    registry:{version:28,assets:[derivedAsset]},
    consumer:{gameId:'survival',platform:'ROBLOX'},
    runtimeEvidence:{
      id:'studio-run-2',platform:'ROBLOX',gameId:'survival',assetIds:['wolf-derived'],
      assets:[{assetId:'wolf-derived',sourceHash:'source-v1',artifactHash:'artifact-v2',masterGlbHash:'wolf-derived-master-v1',derivedFromMasterGlbHash:'wolf-derived-master-v1'}],
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
        assetId:'generated-boss',family:'CREATURE',path:'assets/roblox/survival/native/boss.rbxm',
        license:'project-original',sourceHash:'generated-source',artifactHash:'generated-artifact',
        masterGlb:'assets/roblox/survival/master/boss.glb',masterGlbHash:'generated-boss-master',derivedFromMasterGlbHash:'generated-boss-master',masterGlbStaticQaPass:true,masterGlbQaAuthority:'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb',
        generatedByDeclaredRecipe:true,persistedForCandidate:true
      }],
      nativeBindingPass:true,visualRuntimePass:true,mobilePerformancePass:true,regressionPass:true,licenseProvenancePass:true
    }
  });
  assert.equal(generatedBatch.updated,true);
  assert.deepEqual([...generatedBatch.promotedAssetIds],['generated-boss']);
  assert.equal(generatedBatch.registry.assets[0].status,'VERIFIED_COMPANY_ASSET');
  assert.equal(generatedBatch.registry.assets[0].verifiedCompanyReusable,true);
  assert.equal(generatedBatch.registry.assets[0].path,'assets/roblox/survival/native/boss.rbxm');
  assert.equal(generatedBatch.registry.assets[0].masterGlb,'assets/roblox/survival/master/boss.glb');
  assert.equal(generatedBatch.registry.assets[0].masterGlbQaAuthority,'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb');

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
  assert.equal(creature.masterGlbRequired,true);
  assert.equal(creature.masterAssetFormat,'GLB_2_0');
  assert.equal(creature.primitiveFallbackPrototypeOnly,true);
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
    externalSources:[
      {id:'legacy-creature-pack',category:'CREATURE',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',sourcePriority:999},
      {id:'cc0-multi-pack',category:'PROP',categories:['CREATURE','BUILDING'],status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',license:'CC0',volumeAdaptationEligible:true,sourcePriority:10}
    ],
    signalsByKey:{'CREATURE:SPECIES':{activeGameDemand:true}}
  });
  const creature=fill.actions.find(x=>x.family==='CREATURE');
  const building=fill.actions.find(x=>x.family==='BUILDING');
  assert.equal(creature.route,'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET');
  assert.equal(creature.sourceIds[0],'cc0-multi-pack');
  assert.ok(creature.sourceIds.includes('legacy-creature-pack'));
  assert.equal(building.route,'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET');
  assert.equal(building.sourceIds[0],'cc0-multi-pack');
  assert.equal(creature.acquisitionMode,'ON_DEMAND_SELECTED_ACTION_ONLY');
  assert.equal(creature.bulkPrefetchAllowed,false);
  assert.equal(creature.speculativeDownloadAllowed,false);
  assert.equal(creature.acquireOnlyWhenSelected,true);
  assert.equal(creature.reuseAcquiredSourceWhenCompatible,true);
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


test('company free source registry expands high-priority volume domains without false runtime verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const expected=[
    'kenney-modular-buildings','kenney-building-kit','quaternius-ultimate-buildings','quaternius-medieval-village',
    'quaternius-modular-medieval-buildings','quaternius-ultimate-fantasy-rts','kenney-furniture-kit',
    'quaternius-ultimate-modular-ruins','kenney-ui-pack','kenney-ui-audio','kenney-interface-sounds',
    'kenney-rpg-audio','kenney-impact-sounds','kenney-nature-kit','quaternius-ultimate-nature',
    'poly-haven-cc0-library','kenney-city-kit-roads','kenney-city-kit-industrial',
    'kaykit-character-animations-1-1','quaternius-universal-animation-library',
    'quaternius-universal-animation-library-2','quaternius-ultimate-animated-animals'
  ];
  assert.ok(registry.externalSources.length>=28);
  for(const id of expected){
    const row=registry.externalSources.find(source=>source.id===id);
    assert.ok(row,id);
    assert.equal(row.license,'CC0',id);
    assert.equal(row.volumeAdaptationEligible,true,id);
    assert.equal(row.commercialUseAllowed,true,id);
    assert.equal(row.derivativesAllowed,true,id);
    assert.equal(row.promotionRequiresRuntimeConsumer,true,id);
    assert.notEqual(row.productionVerified,true,id);
  }
  assert.ok(registry.externalSources.find(row=>row.id==='kenney-modular-buildings').categories.includes('BUILDING'));
  assert.ok(registry.externalSources.find(row=>row.id==='kenney-furniture-kit').categories.includes('PROP'));
  assert.ok(registry.externalSources.find(row=>row.id==='kenney-ui-pack').categories.includes('UI'));
  assert.ok(registry.externalSources.find(row=>row.id==='kenney-rpg-audio').categories.includes('AUDIO'));
  assert.ok(registry.externalSources.find(row=>row.id==='poly-haven-cc0-library').categories.includes('MATERIAL'));
  for(const id of ['kaykit-character-animations-1-1','quaternius-universal-animation-library','quaternius-universal-animation-library-2']){
    assert.ok(registry.externalSources.find(row=>row.id===id).categories.includes('MOTION'),id);
  }
  assert.ok(registry.externalSources.find(row=>row.id==='quaternius-ultimate-animated-animals').categories.includes('CREATURE'));
  assert.equal(registry.internalAssetLibraryAutomation.actualVerifiedAudioAssetCount,0);
  assert.equal(registry.internalAssetLibraryAutomation.eligibleFreeSourceCount,22);
  assert.ok(registry.internalAssetLibraryAutomation.nextVolumeActions.some(row=>row.domain==='BUILDING'&&row.freeSourceCandidateIds.includes('kenney-modular-buildings')));
  assert.ok(registry.internalAssetLibraryAutomation.nextVolumeActions.some(row=>row.domain==='CREATURE'&&row.freeSourceCandidateIds.includes('quaternius-ultimate-animated-animals')));
  assert.ok(registry.internalAssetLibraryAutomation.nextVolumeActions.some(row=>row.domain==='MOTION'&&row.freeSourceCandidateIds.includes('kaykit-character-animations-1-1')));
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

  const ids=['HEALING_POTION','MANA_CRYSTAL','IRON_INGOT','GOLD_INGOT','WOOD_BUNDLE','STONE_CHUNK','RELIC_KEY','LANTERN','MANA_POTION','ANTIDOTE','STAMINA_TONIC','UPGRADE_SHARD','TREASURE_GEM','SILVER_INGOT','CLOTH_ROLL','HERB_BUNDLE','COOKED_MEAT','QUEST_SCROLL','LORE_BOOK','COIN_POUCH','ARROW_BUNDLE','THROWING_BOMB','LOCKPICK_SET','SIGNAL_LANTERN'];
  assert.equal(catalog.items.length,40);
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
  assert.ok(catalog.systemDepthContract.inventoryCategories.includes('QUEST'));
  assert.ok(catalog.systemDepthContract.linkedSystems.includes('STASH'));
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
  assert.equal(pack.assetCount,40);
  assert.ok(pack.inventoryCategories.includes('THROWABLE'));
  assert.ok(pack.inventoryCategories.includes('LORE'));

  const expected=[
    ['HEALING_POTION','ITEM','CONSUMABLE'],
    ['MANA_CRYSTAL','RESOURCE','RESOURCE'],
    ['IRON_INGOT','RESOURCE','RESOURCE'],
    ['GOLD_INGOT','RESOURCE','RESOURCE'],
    ['WOOD_BUNDLE','RESOURCE','RESOURCE'],
    ['STONE_CHUNK','RESOURCE','RESOURCE'],
    ['RELIC_KEY','ITEM','KEY_ITEM'],
    ['LANTERN','ITEM','UTILITY'],
    ['MANA_POTION','ITEM','CONSUMABLE'],
    ['UPGRADE_SHARD','UPGRADE_MATERIAL','UPGRADE_MATERIAL'],
    ['COOKED_MEAT','FOOD','FOOD'],
    ['QUEST_SCROLL','QUEST_ITEM','QUEST_ITEM'],
    ['LORE_BOOK','LORE','LORE'],
    ['ARROW_BUNDLE','AMMUNITION','AMMUNITION'],
    ['THROWING_BOMB','THROWABLE','THROWABLE'],
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


test('company-common R15 motion pack covers sixty-one reusable motion atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-motion-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonMotion.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const survivalConfig=fs.readFileSync(path.join(root,'roblox-games','survival','shared','GameConfig.luau'),'utf8');
  const core=['IDLE_RELAXED','WALK','JOG','RUN','START','STOP','TURN_90','JUMP_START','LAND','HIT_FRONT','DEATH_FRONT'];
  const living=['SIT_DOWN','STAND_UP','LEAN_WALL_IDLE','OPEN_DOOR','OPEN_CONTAINER','PICKUP_GROUND','PLACE_GROUND','PUSH_OBJECT','PULL_OBJECT','TALK_GESTURE','NPC_WORK_LOOP','COOK_LOOP','FARM_TEND','FISH_CAST','BED_LIE_DOWN','LADDER_ENTER','LADDER_EXIT','SLOPE_ASCEND','SLOPE_DESCEND','FATIGUED_IDLE','INJURED_WALK'];

  assert.equal(catalog.version,6);
  assert.equal(catalog.atoms.length,61);
  assert.equal(quality.sourceAssetCount,61);
  assert.equal(catalog.compatibleRig,'R15');
  assert.equal(catalog.rootMotionOwned,false);
  assert.equal(catalog.gameplayMovementAuthority,false);
  assert.equal(catalog.productionVerified,false);
  assert.equal(catalog.runtimeVerificationState,'PENDING_STUDIO');

  for(const atom of core){
    assert.ok(source.includes(atom),atom+':source');
    assert.ok(survivalConfig.includes(atom),atom+':config');
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }
  for(const atom of living){
    assert.ok(source.includes(atom),atom+':source');
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom+':catalog');
  }
  for(const joint of [
    'HumanoidRootPart','LowerTorso','UpperTorso','Head',
    'LeftUpperArm','LeftLowerArm','LeftHand','RightUpperArm','RightLowerArm','RightHand',
    'LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot'
  ])assert.ok(source.includes('name = "'+joint+'"'),joint);

  assert.ok(source.includes('Instance.new("KeyframeSequence")'));
  assert.ok(source.includes('LIFE_ACTION = makeLifeAction'));
  assert.ok(source.includes('expectedAtomCount = 61'));
  assert.ok(source.includes('RootMotionOwned", false'));
  assert.ok(source.includes('GameplayMovementAuthority", false'));
  for(const forbidden of [/WalkSpeed\s*=/,/JumpPower\s*=/,/HumanoidRootPart\.CFrame\s*=/,/TakeDamage\(/,/RemoteEvent/,/FireServer\(/,/DataStoreService/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common motion registry mirrors all sixty-one reusable motion atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-motion-v1','catalog.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-motion-v1');
  assert.ok(pack);
  assert.equal(pack.motionCount,61);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.compatibleRig,'R15');
  assert.equal(pack.productionVerified,false);
  for(const atom of catalog.atoms){
    const id='roblox-common-motion-'+atom.atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atom.atomId);
    assert.equal(row.atomId,atom.atomId);
    assert.equal(row.family,'MOTION');
    assert.equal(row.bindingHint.compatibleRig,'R15');
    assert.equal(row.bindingHint.preserveGameplayMovementDamageSaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});

test('company-common world prop pack provides thirty-eight reusable housing settlement props',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-world-props-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonWorldProps.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  assert.equal(catalog.version,6);
  assert.equal(catalog.items.length,38);
  assert.equal(quality.sourceAssetCount,38);
  for(const row of catalog.items){
    assert.ok(source.includes(row.assetId),row.assetId);
    assert.ok(row.interactionRole,row.assetId+':interaction');
    assert.ok(row.interactionSoundRole,row.assetId+':sound');
  }
  for(const id of ['WOOD_CART','WOOD_CRATE','TREASURE_CHEST','STREET_LANTERN','LAUNDRY_LINE','SETTLEMENT_FLAG','CANVAS_TENT','FIREWOOD_STACK','FARM_TOOL_RACK','RUIN_DEBRIS','CONSTRUCTION_SCAFFOLD','LORE_STONE','RESOURCE_ROCK_NODE','RESOURCE_WOOD_NODE']){
    assert.ok(catalog.items.some(row=>row.assetId===id),id);
  }
  assert.ok(source.includes('InteractionSoundRole'));
  assert.ok(source.includes('OwnsAudioPlaybackAuthority", false'));
  assert.equal(catalog.interactionPresentationContract.audioPlaybackAuthority,false);
  assert.equal(quality.soundRoleLinkage.actualAudioAssetsNotClaimed,true);
  assert.equal(catalog.housingSettlementContract.gameplayAuthority,false);
  for(const forbidden of [/\bDamage\s*=/,/\bPrice\s*=/,/\bReward\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common world prop registry mirrors thirty-eight prop interaction and sound roles',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-world-props-v1','catalog.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-world-props-v1');
  assert.ok(pack);
  assert.equal(pack.itemCount,38);
  assert.equal(pack.gameplayAuthority,false);
  assert.equal(pack.audioPlaybackAuthority,false);
  for(const item of catalog.items){
    const id='roblox-common-world-prop-'+item.assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,item.assetId);
    assert.equal(row.subfamily,item.subfamily);
    assert.equal(row.worldRole,item.worldRole);
    assert.equal(row.interactionRole,item.interactionRole);
    assert.equal(row.interactionSoundRole,item.interactionSoundRole);
    assert.equal(row.audioPlaybackAuthority,false);
  }
});


test('expanded common item tool creature and VFX registry mirrors current catalogs',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const checks=[
    ['assets/roblox/common-items-v1/catalog.json','roblox-common-items-v1','items','roblox-common-item-',40],
    ['assets/roblox/common-tools-v1/catalog.json','roblox-common-tools-v1','items','roblox-common-tool-',20],
    ['assets/roblox/common-character-gear-v1/catalog.json','roblox-common-character-gear-v1','items','roblox-common-character-gear-',18],
    ['assets/roblox/common-foliage-v1/catalog.json','roblox-common-foliage-v1','items','roblox-common-foliage-',18],
    ['assets/roblox/common-creature-parts-v1/catalog.json','roblox-common-creature-parts-v1','items','roblox-common-creature-part-',24],
    ['assets/roblox/common-skill-v1/catalog.json','roblox-common-skill-v1','atoms','roblox-common-skill-',20],
    ['assets/roblox/common-vfx-v1/catalog.json','roblox-common-vfx-v1','atoms','roblox-common-vfx-',27],
    ['assets/roblox/common-materials-v1/catalog.json','roblox-common-materials-v1','atoms','roblox-common-material-',25],
  ];
  for(const [relative,packId,key,prefix,count] of checks){
    const catalog=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
    const rows=catalog[key];
    assert.equal(rows.length,count,relative);
    for(const row of rows){
      const atom=row.assetId||row.atomId;
      const id=prefix+atom.toLowerCase().replaceAll('_','-');
      assert.ok(registry.assets.some(asset=>asset.id===id),id);
    }
    const pack=registry.assets.find(asset=>asset.id===packId);
    assert.ok(pack,packId);
    assert.equal(pack.productionVerified,false,packId);
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


test('company-common foliage pack provides eighteen reusable environment assets',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-foliage-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonFoliage.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['GRASS_TUFT','BUSH_ROUND','FERN_CLUSTER','WILDFLOWER_PATCH','TREE_STUMP','FALLEN_LOG','PINE_TREE','DEAD_TREE','BROADLEAF_TREE','VINE_CLUSTER','REED_PATCH','MOSS_PATCH','MUSHROOM_CLUSTER','ROOT_CLUSTER','AUTUMN_TREE_VARIANT','WIND_BENT_TREE','BIOME_SHRUB_VARIANT','LOD_FOLIAGE_PROXY'];
  assert.equal(catalog.items.length,18);
  assert.equal(quality.sourceAssetCount,18);
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


test('company-common building pack provides twenty housing snap modules without gameplay authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-building-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonBuilding.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['FLOOR_TILE','WALL_WINDOW','WALL_CORNER','PILLAR_STONE','STAIRS_STRAIGHT','ARCHWAY','ROOF_FLAT','RAILING','FOUNDATION_TRIANGLE','FENCE_FOUNDATION','HALF_WALL','DOOR_FRAME','WINDOW_FRAME','CEILING_TILE','CEILING_WEDGE','ROOF_SLOPE','ROOF_CORNER','GATE_FRAME','LADDER','WALL_TRIM'];
  assert.equal(catalog.items.length,20);
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
  assert.equal(catalog.housingContract.noGameSpecificCopy,true);
  assert.equal(catalog.housingContract.stabilityAuthority,false);
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


test('company-common tool pack provides twenty reusable weapon and tool visuals',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-tools-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonTools.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['SWORD','SPEAR','AXE','HAMMER','PICKAXE','BOW','STAFF','SHIELD'];
  assert.equal(catalog.items.length,20);
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


test('company-common character gear pack provides eighteen reusable visual equipment pieces',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-character-gear-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonCharacterGear.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['CLOTH_TUNIC','LEATHER_VEST','IRON_CHESTPLATE','CLOTH_HOOD','IRON_HELMET','LEATHER_GLOVES','LEATHER_BOOTS','TRAVEL_CLOAK','LEG_PLATES','SHOULDER_PAULDRONS','UTILITY_BELT','SIGNET_RING','TRAVEL_AMULET','COSMETIC_SASH','SET_CREST','SOCKET_CHARM','UPGRADE_TRIM','WORN_ARMOR_PATCH'];
  assert.equal(catalog.items.length,18);
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
  assert.equal(pack.itemCount,18);

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


test('company-common UI current catalog preserves prior atoms and expands reusable interaction surfaces',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-ui-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonUI.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  assert.ok(Number.isInteger(catalog.version)&&catalog.version>=1);
  assert.ok(Array.isArray(catalog.atoms)&&catalog.atoms.length>0);
  assert.equal(quality.sourceAssetCount,catalog.atoms.length);
  assert.match(source,new RegExp('atomCount = '+catalog.atoms.length+'\\b'));
  for(const id of ['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH','INVENTORY_SLOT','DIALOGUE_PANEL','AI_COMPANION_STATUS_CARD','MOUNT_STATUS_HUD','PARRY_TIMING_INDICATOR','WORLD_PROP_INTERACTION_PROMPT']){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.atoms.some(row=>row.atomId===id),id+':catalog');
  }
  assert.equal(catalog.deepSystemContract.aiNpcInteractionComponentCount,24);
  assert.equal(catalog.deepSystemContract.mountTravelComponentCount,22);
  assert.equal(catalog.deepSystemContract.parryPresentationComponentCount,5);
  assert.equal(catalog.deepSystemContract.worldInteractionComponentCount,10);
  assert.equal(quality.productionVerified,false);
  for(const forbidden of [/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/,/InvokeServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common UI registry exposes all current reusable atoms without production promotion',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-ui-v1','catalog.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-ui-v1');
  assert.ok(pack);
  assert.equal(pack.assetCount,catalog.atoms.length);
  assert.equal(pack.componentCount,catalog.atoms.length);
  assert.equal(pack.productionVerified,false);
  for(const atom of catalog.atoms){
    const id='roblox-common-ui-'+atom.atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atom.atomId);
    assert.equal(row.atomId,atom.atomId);
    assert.equal(row.family,'UI');
    assert.equal(row.productionVerified,false);
    assert.equal(row.runtimeVerificationState,'PENDING_STUDIO');
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


test('company-common creature parts pack provides twenty-four reusable visual modules',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-creature-parts-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonCreatureParts.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const ids=['BIPED_TORSO','QUADRUPED_TORSO','INSECT_THORAX','WING_PAIR','TAIL_LONG','HORN_PAIR','SHELL_BACK','TENTACLE_CLUSTER'];
  assert.equal(catalog.items.length,24);
  for(const id of ids){
    assert.ok(source.includes(id),id);
    assert.ok(catalog.items.some(row=>row.assetId===id),id+':catalog');
  }

  const materials=[...new Set([...source.matchAll(/Enum\.Material\.([A-Za-z0-9_]+)/g)].map(match=>match[1]))];
  const allowed=new Set(['SmoothPlastic','Plastic','Neon','Wood','WoodPlanks','Marble','Slate','Concrete','Granite','Brick','Pebble','Cobblestone','CorrodedMetal','DiamondPlate','Foil','Metal','Grass','Sand','Fabric','Ice','Glacier','Snow','Sandstone','Mud','Ground','CrackedLava','Basalt','Asphalt','Salt','Limestone','Pavement','Air','Water','Glass','Rock']);
  assert.equal(materials.length>0,true);
  assert.equal(materials.every(value=>allowed.has(value)),true);

  assert.ok(source.includes('function RobloxCommonCreatureParts.Create(id,options)'));
  assert.ok(source.includes('function RobloxCommonCreatureParts.CreateViewport(id,options)'));
  assert.ok(source.includes('anchor.Name="CreatureVisualAnchor"'));
  assert.ok(source.includes('BodyPlanCompatibilityRequired",true'));
  assert.ok(source.includes('RigBindingState","AUTHORING_REQUIRED"'));
  assert.equal(catalog.family,'CREATURE');
  assert.equal(catalog.reuseScope,'COMPANY_ROBLOX_COMMON_BASE');
  assert.equal(catalog.bodyPlanCompatibilityRequired,true);
  assert.equal(catalog.rigBindingState,'AUTHORING_REQUIRED');
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.staticAuthoringChecklist.checks.validRobloxMaterialEnums,true);
  assert.equal(quality.runtimeQuality.claimedScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');

  for(const forbidden of [/\bDamage\s*=/,/\bHealth\s*=/,/\bMoveSpeed\s*=/,/\bHitbox\s*=/,/\bDropRate\s*=/,/DataStoreService/,/RemoteEvent/,/RemoteFunction/,/FireServer\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('company-common creature registry preserves gameplay and rig verification authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-creature-parts-v1');
  assert.ok(pack);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.family,'CREATURE');
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(pack.rigBindingState,'AUTHORING_REQUIRED');
  assert.equal(pack.bodyPlanCompatibilityRequired,true);

  const expected=[
    ['BIPED_TORSO','TORSO_BIPED','BODY_CORE'],
    ['QUADRUPED_TORSO','TORSO_QUADRUPED','BODY_CORE'],
    ['INSECT_THORAX','THORAX_INSECT','BODY_CORE'],
    ['WING_PAIR','WING_PAIR','APPENDAGE'],
    ['TAIL_LONG','TAIL_LONG','APPENDAGE'],
    ['HORN_PAIR','HORN_PAIR','HEAD_APPENDAGE'],
    ['SHELL_BACK','SHELL_BACK','BACK_ARMOR_VISUAL'],
    ['TENTACLE_CLUSTER','TENTACLE_CLUSTER','APPENDAGE']
  ];
  for(const [assetId,subfamily,creatureRole] of expected){
    const id='roblox-common-creature-part-'+assetId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,assetId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'CREATURE');
    assert.equal(row.subfamily,subfamily);
    assert.equal(row.creatureRole,creatureRole);
    assert.equal(row.bodyPlanCompatibilityRequired,true);
    assert.equal(row.rigBindingState,'AUTHORING_REQUIRED');
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.bindingHint.preserveAiHealthDamageMovementHitboxDropSaveAndNetworkAuthority,true);
    assert.equal(row.productionVerified,false);
  }
});

test('generic creature torso requirement can choose company-common base',()=>{
  const registryAsset={id:'common-biped-torso',family:'CREATURE',subfamily:'TORSO_BIPED',platform:'ROBLOX',status:'REPO_ASSET',companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',tags:['BODY_CORE']};
  const gameOnly={id:'game-only-biped-torso',family:'CREATURE',subfamily:'TORSO_BIPED',platform:'ROBLOX',status:'REPO_ASSET',tags:['BODY_CORE']};
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'CREATURE',subfamily:'TORSO_BIPED',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-biped-torso');
});

test('company-common materials v5 preserves old atoms and expands to twenty-five',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-materials-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonMaterials.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));

  const atoms=['WOOD','STONE','METAL','GLASS','FABRIC','LEATHER_LIKE','GROUND','MAGIC_CRYSTAL','BRICK','ICE','ASPHALT','SKIN','BONE','WATER','MUD','SAND','SNOW','MOSS','EMISSIVE','CORROSION','DIRT','WET_DRY','DAMAGE','WEATHERING','STYLE_VARIANT'];
  assert.equal(catalog.version,5);
  assert.equal(catalog.atoms.length,25);
  for(const atomId of atoms){
    assert.ok(source.includes(atomId),atomId);
    assert.ok(catalog.atoms.some(row=>row.atomId===atomId),atomId+':catalog');
  }

  const materialRefs=[...new Set([...source.matchAll(/Enum\.Material\.([A-Za-z0-9_]+)/g)].map(match=>match[1]))];
  const allowed=new Set(['WoodPlanks','Slate','Limestone','Rock','Metal','DiamondPlate','Glass','Fabric','Ground','Mud','Sand','Neon','Brick','Ice','Glacier','Snow','Asphalt','Pavement','SmoothPlastic','Grass']);
  assert.equal(materialRefs.length>0,true);
  assert.equal(materialRefs.every(value=>allowed.has(value)),true);

  assert.ok(source.includes('atomCount = 25'));
  assert.ok(source.includes('part.CustomPhysicalProperties = physicalBefore'));
  assert.equal(/\.(CanCollide|CanTouch|CanQuery)\s*=/.test(source),false);
  assert.equal(quality.staticAuthoringChecklist.score,100);
  assert.equal(quality.quality120.claimedRuntimeScore,null);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');
});

test('company-common material v5 registry exposes twenty-five unverified reusable atoms',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-common-materials-v1');
  assert.ok(pack);
  assert.equal(pack.assetCount,25);
  assert.equal(pack.companyCommonBase,true);
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.runtimeVerificationState,'PENDING_STUDIO');

  const added=['GLASS','FABRIC','LEATHER_LIKE','GROUND','MAGIC_CRYSTAL','BRICK','ICE','ASPHALT','SKIN','BONE','WATER','MUD','SAND','SNOW','MOSS','EMISSIVE','CORROSION','DIRT','WET_DRY','DAMAGE','WEATHERING','STYLE_VARIANT'];
  for(const atomId of added){
    const id='roblox-common-material-'+atomId.toLowerCase().replaceAll('_','-');
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,atomId);
    assert.equal(row.companyCommonBase,true);
    assert.equal(row.family,'MATERIAL');
    assert.equal(row.automaticCrossGameReuseAllowed,true);
    assert.equal(row.crossGameReuseRequiresCompatibilityPass,true);
    assert.equal(row.productionVerified,false);
    assert.equal(row.runtimeVerificationState,'PENDING_STUDIO');
    assert.equal(row.bindingHint.preservePhysicalCollisionTouchQueryGameplaySaveAndNetworkAuthority,true);
  }
});

test('generic material requirement can choose company-common base',()=>{
  const registryAsset={id:'common-glass',family:'MATERIAL',subfamily:'GLASS',platform:'ROBLOX',status:'REPO_ASSET',companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',tags:['GLASS']};
  const gameOnly={id:'game-only-glass',family:'MATERIAL',subfamily:'GLASS',platform:'ROBLOX',status:'REPO_ASSET',tags:['GLASS']};
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'MATERIAL',subfamily:'GLASS',required:true}],
    assets:[gameOnly,registryAsset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.selections[0].assetId,'common-glass');
});


test('studio-independent 1000-point internal asset audit uses strict score and hard gates',()=>{
  assert.equal(INTERNAL_ASSET_AUDIT_MAX,1000);
  assert.equal(INTERNAL_ASSET_AUDIT_PASS,880);
  assert.ok(INTERNAL_ASSET_MINIMUM_COVERAGE.UI.ICON>=48);
  assert.ok(INTERNAL_ASSET_MINIMUM_COVERAGE.UI.DIALOGUE>=16);
  assert.ok(INTERNAL_ASSET_MINIMUM_COVERAGE.UI.AI_DIALOGUE_HELPER>=10);
  assert.ok(INTERNAL_ASSET_MINIMUM_COVERAGE.UI.NPC_INTERACTION>=16);
  assert.ok(INTERNAL_ASSET_MINIMUM_COVERAGE.CREATURE.SPECIES>=80);
  assert.ok(INTERNAL_ASSET_MINIMUM_COVERAGE.ENVIRONMENT.SET_DRESSING>=30);
  assert.deepEqual(INTERNAL_ASSET_AUDIT_GRADES.slice(0,4).map(row=>[row.id,row.min]),[
    ['MASTERPIECE',980],['ELITE',950],['HERO',920],['COMMERCIAL_READY',880]
  ]);
  const evidence={
    IDENTITY_SILHOUETTE:95,FORM_STRUCTURE:96,MATERIAL_SURFACE:93,COLOR_LIGHTING:94,
    STYLE_COHERENCE:95,DETAIL_FINISH:95,READABILITY_SCALE:98,MOTION_RIG:91,
    FEEDBACK_STATES:97,UI_UX_SYSTEM:98,MODULAR_REUSE:97,VARIATION_BREADTH:98,
    PERFORMANCE_LOD:93,ACCESSIBILITY_INPUT:98,PROVENANCE_MAINTAINABILITY:96,
    INTEGRATION_READINESS:97
  };
  const result=scoreInternalAssetAudit1000({asset:{id:'common-ui',family:'UI'},evidence});
  assert.equal(result.studioRequired,false);
  assert.equal(result.nativeRuntimeRequired,false);
  assert.equal(result.productionPromotionIndependent,true);
  assert.equal(result.productionRuntimeVerificationUntouched,true);
  assert.equal(result.pass,true);
  assert.equal(result.grade,'ELITE');
  assert.equal(result.score,956.4);
  assert.ok(result.expectations.includes('NPC interaction'));
  assert.ok(result.nextQualityTargets.includes(980));

  const hardFail=scoreInternalAssetAudit1000({
    asset:{id:'common-ui-hard-fail',family:'UI'},
    evidence:{...evidence,UI_UX_SYSTEM:89}
  });
  assert.ok(hardFail.score>=880);
  assert.equal(hardFail.pass,false);
  assert.ok(hardFail.blockers.some(row=>row.startsWith('HARD_GATE:UI_UX_SYSTEM:')));
  assert.ok(INTERNAL_ASSET_FAMILY_EXPECTATIONS.UI.expectations.includes('NPC interaction'));
  assert.ok(INTERNAL_ASSET_FAMILY_EXPECTATIONS.UI.expectations.includes('dialogue/helper'));
});

test('common Roblox UI current catalog preserves AI dialogue NPC interaction core screens and vector icons',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..','assets','roblox','common-ui-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'quality-evidence.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'RobloxCommonUI.luau'),'utf8');
  const icons=fs.readFileSync(path.join(root,'RobloxCommonIcons.luau'),'utf8');
  assert.ok(Number.isInteger(catalog.version)&&catalog.version>=1);
  assert.ok(Array.isArray(catalog.atoms)&&catalog.atoms.length>0);
  assert.equal(evidence.sourceAssetCount,catalog.atoms.length);
  assert.equal(catalog.vectorIconCount,12);
  for(const surface of ['INVENTORY','DIALOGUE','NPC_INTERACTION','AI_COMPANION','NPC_MEMORY','NPC_DIALOGUE_DEEP','NPC_SERVICE','NPC_QUEST','PARTY_DEEP','MOUNT_RIDE','TRAVEL','PARRY_FEEDBACK','WORLD_PROP_INTERACTION']){
    assert.ok(catalog.surfaces.includes(surface),surface);
    assert.ok(COMMON_UI_SURFACE_EXPECTATIONS.includes(surface),surface);
  }
  for(const atom of ['DIALOGUE_ASSISTANT_BUTTON','NPC_INTERACTION_MENU','AI_COMPANION_STATUS_CARD','NPC_MEMORY_SUMMARY','NPC_SERVICE_MENU','PARTY_TACTICS_PANEL','MOUNT_STATUS_HUD','TRAVEL_ROUTE_PANEL','PARRY_TIMING_INDICATOR','WORLD_PROP_ACTION_WHEEL']){
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom);
    assert.match(source,new RegExp('"'+atom+'"'));
  }
  for(const icon of ['CHAT','AI_SPARK','INVENTORY','CHARACTER','EQUIPMENT','MINIMAP','QUEST','PARTY','CRAFT','SHOP','NOTIFICATION','SETTINGS']){
    assert.ok(catalog.iconSymbols.includes(icon),icon);
    assert.match(icons,new RegExp('\\b'+icon+'\\b'));
  }
  assert.equal(evidence.sourceAudit.studioRequired,false);
  assert.equal(evidence.productionVerified,false);
  assert.equal(evidence.verifiedCompanyReusable,false);
});

test('flexible internal asset reuse keeps low-score assets usable and adapts good mismatches before rejection',()=>{
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.lowScoreUseAllowed,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.studioRequiredForUse,false);
  assert.ok(INTERNAL_ASSET_ADAPTATION_AXES.UI.includes('LAYOUT'));
  assert.ok(INTERNAL_ASSET_ADAPTATION_AXES.CREATURE.includes('HORN'));

  const low={
    id:'low-ui',family:'UI',subfamily:'HUD',platform:'ROBLOX',status:'REPO_ASSET',
    license:'project-original',internalAuditScore:520,sourceFiles:['low.luau']
  };
  const lowReuse=evaluateInternalAssetReuse({
    asset:low,
    gameDna:{targetPlatform:'ROBLOX',concept:createConceptProfile({styleFamily:'CARTOON'})},
    requirement:{family:'UI',subfamily:'HUD'}
  });
  assert.equal(lowReuse.usable,true);
  assert.equal(lowReuse.studioRequired,false);
  assert.equal(lowReuse.baseQuality,520);
  assert.equal(lowReuse.scoreIsNotUsageGate,true);

  const highStyleMismatch={
    id:'high-ui',family:'UI',subfamily:'HUD',platform:'ROBLOX',status:'REPO_ASSET',
    license:'project-original',internalAuditScore:940,sourceFiles:['high.luau'],
    styleFamily:'SCI_FI',themeAdaptationRequiredPerGame:true
  };
  const adapted=evaluateInternalAssetReuse({
    asset:highStyleMismatch,
    gameDna:{targetPlatform:'ROBLOX',concept:createConceptProfile({styleFamily:'DARK_FANTASY'})},
    requirement:{family:'UI',subfamily:'HUD'}
  });
  assert.equal(adapted.usable,true);
  assert.equal(adapted.mode,'STYLE_ADAPT');
  assert.equal(adapted.adaptationReady,true);
  assert.ok(adapted.effectiveQuality>lowReuse.effectiveQuality);

  const choice=chooseInternalAssetReplacement({
    currentAsset:low,
    candidates:[low,highStyleMismatch],
    gameDna:{targetPlatform:'ROBLOX',concept:createConceptProfile({styleFamily:'DARK_FANTASY'})},
    requirement:{family:'UI',subfamily:'HUD',currentAssetId:'low-ui'}
  });
  assert.equal(choice.selectedAssetId,'high-ui');
  assert.equal(choice.replacementRecommended,true);
  assert.equal(choice.replacementAction,'ADAPT_THEN_REPLACE');
  assert.equal(choice.studioRequired,false);
});

test('internal replacement respects locks and treats observed failure as priority penalty instead of automatic ban',()=>{
  const current={id:'current',family:'WEAPON',subfamily:'MELEE',platform:'ROBLOX',license:'project-original',status:'REPO_ASSET',internalAuditScore:700,sourceFiles:['a']};
  const better={id:'better',family:'WEAPON',subfamily:'MELEE',platform:'ROBLOX',license:'project-original',status:'REPO_ASSET',internalAuditScore:930,sourceFiles:['b']};
  const failed={id:'failed-high',family:'WEAPON',subfamily:'MELEE',platform:'ROBLOX',license:'project-original',status:'REPO_ASSET',internalAuditScore:980,sourceFiles:['c']};
  const gameDna={targetPlatform:'ROBLOX',concept:createConceptProfile({styleFamily:'STYLIZED_FANTASY'})};

  const failedReuse=evaluateInternalAssetReuse({
    asset:failed,gameDna,requirement:{family:'WEAPON',subfamily:'MELEE'},
    usage:{runtimeFailure:true,verifiedFailureCount:2}
  });
  assert.equal(failedReuse.usable,true);
  assert.ok(failedReuse.observedFailurePenalty>0);

  const unlocked=chooseInternalAssetReplacement({
    currentAsset:current,candidates:[current,better,failed],gameDna,
    requirement:{family:'WEAPON',subfamily:'MELEE',currentAssetId:'current'},
    usageByAsset:{'failed-high':{runtimeFailure:true,verifiedFailureCount:2}}
  });
  assert.equal(unlocked.selectedAssetId,'better');
  assert.equal(unlocked.replacementAction,'REPLACE_NOW');

  const locked=chooseInternalAssetReplacement({
    currentAsset:current,candidates:[current,better],gameDna,
    requirement:{family:'WEAPON',subfamily:'MELEE',currentAssetId:'current',lockedAssetId:'current'}
  });
  assert.equal(locked.selectedAssetId,'current');
  assert.equal(locked.replacementAction,'KEEP_LOCKED');
  assert.equal(locked.replacementRecommended,false);
});

test('only true safety legal or corrupt blockers forbid internal reuse',()=>{
  const base={id:'asset',family:'PROP',subfamily:'INTERACTIVE',platform:'ROBLOX',status:'REPO_ASSET',internalAuditScore:400,sourceFiles:['asset.luau']};
  const gameDna={targetPlatform:'ROBLOX',concept:createConceptProfile({styleFamily:'CARTOON'})};
  for(const asset of [
    {...base,internalUseForbidden:true,license:'project-original'},
    {...base,securityBlocked:true,license:'project-original'},
    {...base,corruptSource:true,license:'project-original'},
    {...base,license:'CC-BY-NC'}
  ]){
    const result=evaluateInternalAssetReuse({asset,gameDna,requirement:{family:'PROP',subfamily:'INTERACTIVE'}});
    assert.equal(result.usable,false);
    assert.ok(result.hardBlockers.length>=1);
  }
  const merelyLow=evaluateInternalAssetReuse({asset:{...base,license:'project-original'},gameDna,requirement:{family:'PROP',subfamily:'INTERACTIVE'}});
  assert.equal(merelyLow.usable,true);
});


test('common UI current catalog expands full-screen navigation search states and input switching without gameplay authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..','assets','roblox','common-ui-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'quality-evidence.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'RobloxCommonUI.luau'),'utf8');
  assert.ok(Number.isInteger(catalog.version)&&catalog.version>=1);
  assert.ok(Array.isArray(catalog.atoms)&&catalog.atoms.length>0);
  assert.equal(evidence.sourceAssetCount,catalog.atoms.length);
  for(const atom of ['MAIN_MENU','TOP_BAR','SIDE_NAVIGATION','PAUSE_MENU','SETTINGS_PANEL','SEARCH_FIELD','FILTER_BAR','SORT_CONTROL','INVENTORY_FULL_SCREEN','MAP_FULL_SCREEN','CONFIRM_DIALOG','LOADING_STATE','FAILURE_STATE','INPUT_HINT']){
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom);
  }
  assert.equal(catalog.navigationContract.maxRecommendedDepth,3);
  assert.equal(catalog.navigationContract.colorOnlyStateForbidden,true);
  assert.equal(catalog.continuationContract.machineReadableSelectionRequired,true);
  assert.match(source,/SupportsAutomaticInputModeSwap",true/);
  assert.equal(catalog.deepSystemContract.gameplayAuthority,false);
  assert.equal(catalog.deepSystemContract.saveAuthority,false);
  assert.equal(catalog.deepSystemContract.networkAuthority,false);
});

test('common environment v5 provides ten biomes twenty-four terrain compositions and fourteen realistic environment states',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..','assets','roblox','common-environment-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'quality-evidence.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'RobloxCommonEnvironment.luau'),'utf8');
  assert.equal(catalog.version,5);
  assert.equal(catalog.biomes.length,10);
  assert.equal(catalog.recipeCount,104);
  assert.deepEqual(catalog.biomes,COMMON_ENVIRONMENT_BIOME_EXPECTATIONS);
  assert.deepEqual(catalog.roles,COMMON_ENVIRONMENT_ROLE_EXPECTATIONS);
  assert.deepEqual(catalog.terrainCompositions,COMMON_TERRAIN_COMPOSITION_EXPECTATIONS);
  assert.deepEqual(catalog.environmentStateContract.states,COMMON_ENVIRONMENT_STATE_EXPECTATIONS);
  assert.equal(catalog.terrainCompositions.length,24);
  assert.equal(catalog.backgroundCompositionContract.backgroundLayerCount,5);
  assert.equal(evidence.coverage.recipeCount,104);
  assert.equal(evidence.coverage.environmentStateCount,14);
  assert.equal(evidence.coverage.biomeSoundscapeCount,10);
  assert.ok(source.includes('function CommonEnvironment.CreateEnvironmentPresentation'));
  assert.ok(source.includes('function CommonEnvironment.BindEnvironmentState'));
  assert.ok(source.includes('SOLAR_ECLIPSE'));
  assert.ok(source.includes('WHITE_NIGHT'));
  assert.ok(source.includes('THUNDERSTORM'));
  assert.equal(catalog.environmentStateContract.weatherAuthority,false);
  assert.equal(catalog.environmentStateContract.timeAuthority,false);
  assert.equal(catalog.ambientSoundscapeContract.audioPlaybackAuthority,false);
  assert.equal(catalog.ambientSoundscapeContract.productionVerified,false);
  assert.equal(evidence.productionVerified,false);
});

test('common presentation v1 provides reusable loading and five short intro modes without camera or gameplay authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..','assets','roblox','common-presentation-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'quality-evidence.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'RobloxCommonPresentation.luau'),'utf8');

  assert.deepEqual(catalog.loadingElements,COMMON_PRESENTATION_EXPECTATIONS.loading);
  assert.deepEqual(catalog.introModes,COMMON_PRESENTATION_EXPECTATIONS.introModes);
  assert.deepEqual(catalog.genreBackgrounds,COMMON_PRESENTATION_EXPECTATIONS.genreBackgrounds);
  assert.deepEqual(catalog.gameSpecificVariationFields,COMMON_PRESENTATION_EXPECTATIONS.gameSpecificVariationFields);
  assert.equal(catalog.introContract.complexCutsceneRequired,false);
  assert.equal(catalog.introContract.cameraAuthority,false);
  assert.match(source,/function Presentation.CreateLoadingScreen/);
  assert.match(source,/function Presentation.CreateIntro/);
  assert.match(source,/CameraAuthority",false/);
  assert.match(source,/GameplayAuthority",false/);
  assert.match(source,/WorldPanIsVisualRequestOnly/);
  assert.equal(evidence.productionVerified,false);
});

test('Vibe loadout returns machine-readable discovery and use contract from existing canonical asset selector',()=>{
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.version,3);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.machineReadableDiscovery.enabled,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.machineReadableDiscovery.newPipelineCreated,false);
  const asset={
    id:'common-forest-kit',family:'ENVIRONMENT',subfamily:'BIOME',platform:'ROBLOX',status:'REPO_ASSET',
    license:'project-original',internalAuditScore:940,companyCommonBase:true,packId:'roblox-common-environment-v1',
    sourceFiles:['assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau'],
    machineTags:['FOREST','BIOME','LANDMARK','SET_DRESSING'],
    gameSpecificVariationFields:['PALETTE','MATERIAL','LIGHTING'],
    usageContract:{developmentStageAutoDiscovery:true,ownsGameplayAuthority:false}
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'ENVIRONMENT',subfamily:'FOREST',required:true}],
    assets:[asset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.complete,true);
  assert.equal(loadout.machineReadableDiscovery,true);
  assert.equal(loadout.selectionContractVersion,4);
  assert.equal(loadout.newPipelineCreated,false);
  assert.equal(loadout.selections[0].assetId,'common-forest-kit');
  assert.equal(loadout.selections[0].packId,'roblox-common-environment-v1');
  assert.ok(loadout.selections[0].sourceFiles.length>0);
  assert.ok(loadout.selections[0].machineTags.includes('FOREST'));
  assert.equal(loadout.selections[0].usageContract.developmentStageAutoDiscovery,true);
  assert.equal(loadout.selections[0].companyCommonBase,true);
});


test('common UI current catalog preserves deep item inventory equipment crafting trade and codex components',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..','assets','roblox','common-ui-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'RobloxCommonUI.luau'),'utf8');
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'quality-evidence.json'),'utf8'));
  const deep=['ITEM_DETAIL_PANEL','ITEM_COMPARE_PANEL','ITEM_CONTEXT_MENU','STACK_SPLIT_DIALOG','MULTI_SELECT_BAR','ITEM_STATE_BADGES','INVENTORY_CONTAINER_PANEL','STASH_SCREEN','LOOT_WINDOW','RADIAL_MENU','LOADOUT_PRESET_PANEL','EQUIPMENT_COMPARE_PANEL','SET_BONUS_PANEL','SOCKET_ENCHANT_PANEL','UPGRADE_PANEL','REPAIR_PANEL','DISMANTLE_PANEL','CRAFTING_TREE','RECIPE_DETAIL_PANEL','MATERIAL_TRACKER','BUY_SELL_PANEL','BUYBACK_PANEL','CODEX_SCREEN','COLLECTION_PROGRESS','RECENT_ITEMS_PANEL','ITEM_SOURCE_USAGE_PANEL'];
  assert.ok(Number.isInteger(catalog.version)&&catalog.version>=1);
  assert.ok(Array.isArray(catalog.atoms)&&catalog.atoms.length>0);
  assert.equal(evidence.deepSystemComponentCount,catalog.deepSystemContract.componentCount);
  assert.ok(catalog.deepSystemContract.componentCount>=deep.length);
  for(const atom of deep){
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom);
    assert.match(source,new RegExp('"'+atom+'"'));
  }
  assert.equal(catalog.deepSystemContract.gameplayAuthority,false);
  assert.equal(catalog.deepSystemContract.saveAuthority,false);
  assert.equal(catalog.deepSystemContract.networkAuthority,false);
});

test('company library system depth audit covers every common asset domain without becoming a usage gate',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const audit=registry.commonLibrarySystemDepthAudit;
  assert.ok(Number.isInteger(registry.version)&&registry.version>=1);
  assert.equal(registry.internalAssetLibraryAutomation.lastCatalogSynchronizedVersion,registry.version);
  assert.equal(audit.status,'EXPANDED');
  assert.equal(audit.scoreIsUsageGate,false);
  assert.equal(audit.existingAssetsRemainUsable,true);
  assert.equal(audit.rows.length,15);
  for(const domain of ['UI','ITEM','WEAPON','CHARACTER_GEAR','SKILL','VFX','MOTION','MATERIAL','ENVIRONMENT','BUILDING','WORLD_PROP','CREATURE','FOLIAGE','PRESENTATION','AUDIO']){
    assert.ok(audit.rows.some(row=>row.domain===domain),domain);
  }
  const uiCatalog=JSON.parse(fs.readFileSync(path.resolve(here,'..','assets','roblox','common-ui-v1','catalog.json'),'utf8'));
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-ui-v1').componentCount,uiCatalog.atoms.length);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-motion-v1').motionCount,61);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-items-v1').assetCount,40);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-building-v1').itemCount,20);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-world-props-v1').itemCount,38);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-environment-v1').environmentStateCount,14);
  assert.equal(registry.ambientSoundscapeContract.actualAudioAssetCountFromThisContract,0);
  assert.equal(registry.ambientSoundscapeContract.productionVerified,false);
  assert.equal(registry.seedDerivedInternalAssetIdeas.sourceSeedId,'seed-action-survival-rogu-echoes-of-the-lost-star');
});

test('all existing common pack catalogs expose system depth contracts for gap-directed iteration',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const paths=[
    'assets/roblox/common-tools-v1/catalog.json',
    'assets/roblox/common-character-gear-v1/catalog.json',
    'assets/roblox/common-skill-v1/catalog.json',
    'assets/roblox/common-vfx-v1/catalog.json',
    'assets/roblox/common-motion-v1/catalog.json',
    'assets/roblox/common-materials-v1/catalog.json',
    'assets/roblox/common-environment-v1/catalog.json',
    'assets/roblox/common-building-v1/catalog.json',
    'assets/roblox/common-world-props-v1/catalog.json',
    'assets/roblox/common-creature-parts-v1/catalog.json',
    'assets/roblox/common-foliage-v1/catalog.json',
    'assets/roblox/common-presentation-v1/catalog.json'
  ];
  for(const relative of paths){
    const catalog=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
    assert.ok(catalog.systemDepthContract,relative);
    assert.equal(catalog.systemDepthContract.referenceLevel,'GOTY_COMMON_PRINCIPLES_NOT_COPY',relative);
    assert.equal(catalog.systemDepthContract.qualityScoreIsNotUsageGate,true,relative);
    assert.equal(catalog.systemDepthContract.existingAssetsRemainUsable,true,relative);
    assert.equal(catalog.systemDepthContract.gameplayAuthority,false,relative);
    assert.ok(catalog.systemDepthContract.requiredComponents.length>0,relative);
  }
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.UI.required.includes('STASH'));
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.WEAPON.required.includes('CROSSBOW'));
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.MOTION.required.includes('REVIVE'));
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.AUDIO.required.includes('LOOT_RARITY'));
});


test('common UI current catalog covers housing sandbox settlement farming and processing presentation without owning simulation authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..','assets','roblox','common-ui-v1');
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'quality-evidence.json'),'utf8'));
  const source=fs.readFileSync(path.join(root,'RobloxCommonUI.luau'),'utf8');
  const atoms=['BUILD_CATALOG_PANEL','PLACEMENT_GHOST_STATE','SNAP_INDICATOR','STABILITY_METER','OBJECT_TRANSFORM_PANEL','MATERIAL_PALETTE_PANEL','BLUEPRINT_PANEL','UNDO_REDO_BAR','OWNERSHIP_PERMISSION_PANEL','REPAIR_BUILDING_PANEL','BED_RESPAWN_PANEL','FURNITURE_CATALOG','SETTLEMENT_OVERVIEW','FARM_PLOT_PANEL','ANIMAL_HOUSING_PANEL','PROCESSING_MACHINE_PANEL'];
  assert.ok(Number.isInteger(catalog.version)&&catalog.version>=1);
  assert.ok(Array.isArray(catalog.atoms)&&catalog.atoms.length>0);
  assert.equal(evidence.sourceAssetCount,catalog.atoms.length);
  assert.equal(catalog.housingSandboxContract.version,1);
  assert.equal(evidence.housingSandboxComponentCount,24);
  for(const atom of atoms){
    assert.ok(catalog.atoms.some(row=>row.atomId===atom),atom);
    assert.match(source,new RegExp('"'+atom+'"'));
  }
  assert.equal(catalog.housingSandboxContract.gameplayAuthority,false);
  assert.equal(catalog.housingSandboxContract.placementAuthority,false);
  assert.equal(catalog.housingSandboxContract.stabilityAuthority,false);
  assert.equal(catalog.housingSandboxContract.ownershipAuthority,false);
  assert.equal(catalog.housingSandboxContract.saveAuthority,false);
  assert.equal(catalog.housingSandboxContract.networkAuthority,false);
});

test('genre system expectations include survival RPG casual sandbox housing cozy farming and settlement depth',()=>{
  for(const genre of ['SURVIVAL','RPG','CASUAL','SANDBOX','HOUSING','COZY','FARMING','SETTLEMENT']){
    assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS[genre],genre);
    assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS[genre].length>=10,genre);
  }
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.HOUSING.includes('SNAP_SOCKET'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.HOUSING.includes('STRUCTURAL_SUPPORT_PRESENTATION'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.SANDBOX.includes('UNDO_REDO'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.SURVIVAL.includes('SHELTER'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.RPG.includes('SET_BONUS'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.COZY.includes('HOME_CUSTOMIZATION'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.FARMING.includes('PROCESSING_MACHINE'));
});

test('company library registers housing building and settlement assets as reusable presentation assets',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  assert.ok(Number.isInteger(registry.version)&&registry.version>=1);
  assert.equal(registry.internalAssetLibraryAutomation.lastCatalogSynchronizedVersion,registry.version);
  assert.ok(registry.commonGenreSystemExpectations.genres.HOUSING.includes('SNAP_SOCKET'));
  assert.ok(registry.commonGenreSystemExpectations.genres.SANDBOX.includes('BLUEPRINT'));
  assert.ok(registry.commonGenreSystemExpectations.genres.FARMING.includes('ANIMAL_HOME'));
  for(const id of [
    'roblox-common-building-foundation-triangle','roblox-common-building-roof-slope','roblox-common-building-gate-frame',
    'roblox-common-world-prop-bed-single','roblox-common-world-prop-workbench','roblox-common-world-prop-cooking-hearth',
    'roblox-common-world-prop-crop-plot','roblox-common-world-prop-animal-trough','roblox-common-world-prop-floor-lamp',
    'roblox-common-ui-build-catalog-panel','roblox-common-ui-placement-ghost-state','roblox-common-ui-settlement-overview'
  ]){
    const row=registry.assets.find(asset=>asset.id===id);
    assert.ok(row,id);
    assert.equal(row.companyCommonBase,true,id);
    assert.equal(row.gameplayAuthority,false,id);
  }
});


test('cross-pack common library audit resolves existing shared coverage before declaring new gaps',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const report=auditCommonLibrarySystemDepth({assets:registry.assets});
  assert.equal(report.crossPackCoverage,true);
  assert.equal(report.scoreIsUsageGate,false);
  assert.equal(report.existingAssetsRemainUsable,true);
  assert.equal(report.newPipelineCreated,false);

  const building=report.rows.find(row=>row.domain==='BUILDING');
  const worldProp=report.rows.find(row=>row.domain==='WORLD_PROP');
  const item=report.rows.find(row=>row.domain==='ITEM');
  const ui=report.rows.find(row=>row.domain==='UI');
  const audio=report.rows.find(row=>row.domain==='AUDIO');

  assert.ok(building);
  assert.ok(worldProp);
  assert.ok(item);
  assert.ok(ui);
  assert.ok(audio);

  assert.ok(building.covered.includes('FOUNDATION'));
  assert.ok(building.covered.includes('DOOR'));
  assert.ok(building.covered.includes('ROOF'));
  assert.ok(worldProp.covered.includes('CHEST'));
  assert.ok(worldProp.covered.includes('CRATE'));
  assert.ok(worldProp.covered.includes('LORE_COLLECTIBLE'));
  assert.ok(item.covered.includes('QUEST_ITEM'));
  assert.ok(item.covered.includes('THROWABLE'));
  assert.ok(ui.covered.includes('STASH'));
  assert.ok(ui.covered.includes('RADIAL_MENU'));
  assert.ok(audio.missing.includes('UI_CONFIRM'));
});

test('expanded genre matrix covers action adventure puzzle tycoon defense horror coop and narrative',()=>{
  for(const genre of ['ACTION','ADVENTURE','PUZZLE','TYCOON','DEFENSE','HORROR','COOP_MULTIPLAYER','NARRATIVE']){
    assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS[genre],genre);
    assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS[genre].length>=10,genre);
  }
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.TYCOON.includes('PLACEMENT_VALIDATION'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.COOP_MULTIPLAYER.includes('OWNERSHIP_PERMISSION'));
  assert.ok(COMMON_GENRE_SYSTEM_EXPECTATIONS.NARRATIVE.includes('DECISION_CONSEQUENCE_FEEDBACK'));

  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  assert.equal(registry.commonGenreSystemExpectations.version,2);
  assert.equal(Object.keys(registry.commonGenreSystemExpectations.genres).length,16);
});


test('internal asset standards are machine-readable only and exclude flow workflow queue scheduler deployment changes',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));

  assert.equal(registry.internalAssetStandard.documentationMode,'MACHINE_READABLE_ONLY');
  assert.equal(Object.hasOwn(registry.internalAssetStandard,'humanDocument'),false);
  assert.equal(registry.internalAssetStandard.authorityBoundary,'INTERNAL_ASSET_SCOPE_ONLY');
  assert.equal(registry.internalAssetStandard.flowMutationAllowed,false);
  assert.equal(registry.internalAssetStandard.workflowMutationAllowed,false);
  assert.equal(registry.internalAssetStandard.queueMutationAllowed,false);
  assert.equal(registry.internalAssetStandard.schedulerMutationAllowed,false);
  assert.equal(registry.internalAssetStandard.deploymentMutationAllowed,false);
  assert.equal(registry.internalAssetStandard.shadowPipelineAllowed,false);
  assert.equal(registry.internalAssetStandard.wrapperPipelineAllowed,false);

  assert.equal(registry.internalAssetRoutineReview.mode,'EVENT_DRIVEN_ASSET_REVIEW_NOT_SCHEDULER');
  assert.equal(registry.internalAssetRoutineReview.scheduleCreated,false);
  assert.equal(registry.internalAssetRoutineReview.workflowCreated,false);
  assert.equal(registry.internalAssetRoutineReview.internalScoreIsUsageGate,false);
  assert.equal(registry.internalAssetRoutineReview.existingAssetsRemainUsable,true);

  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.documentationMode,'MACHINE_READABLE_ONLY');
  assert.equal(Object.hasOwn(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT,'humanDocument'),false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.mode,'EVENT_DRIVEN_ASSET_REVIEW_NOT_SCHEDULER');
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.flowMutationAllowed,false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.workflowMutationAllowed,false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.queueMutationAllowed,false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.schedulerMutationAllowed,false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.deploymentMutationAllowed,false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.newPipelineCreated,false);

  assert.equal(fs.existsSync(path.join(root,'assets','ASSET-STANDARD.md')),false);
});

test('all common asset catalogs bind the machine-readable internal asset standard without a human-document dependency',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const catalogs=[
    'assets/roblox/common-ui-v1/catalog.json',
    'assets/roblox/common-items-v1/catalog.json',
    'assets/roblox/common-tools-v1/catalog.json',
    'assets/roblox/common-character-gear-v1/catalog.json',
    'assets/roblox/common-skill-v1/catalog.json',
    'assets/roblox/common-vfx-v1/catalog.json',
    'assets/roblox/common-motion-v1/catalog.json',
    'assets/roblox/common-materials-v1/catalog.json',
    'assets/roblox/common-environment-v1/catalog.json',
    'assets/roblox/common-building-v1/catalog.json',
    'assets/roblox/common-world-props-v1/catalog.json',
    'assets/roblox/common-creature-parts-v1/catalog.json',
    'assets/roblox/common-foliage-v1/catalog.json',
    'assets/roblox/common-presentation-v1/catalog.json'
  ];
  for(const relative of catalogs){
    const catalog=JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
    assert.ok(catalog.internalAssetStandard,relative);
    assert.equal(catalog.internalAssetStandard.documentationMode,'MACHINE_READABLE_ONLY',relative);
    assert.equal(Object.hasOwn(catalog.internalAssetStandard,'humanDocument'),false,relative);
    assert.equal(catalog.internalAssetStandard.flowExcluded,true,relative);
    assert.equal(catalog.internalAssetStandard.workflowExcluded,true,relative);
    assert.equal(catalog.internalAssetStandard.queueExcluded,true,relative);
    assert.equal(catalog.internalAssetStandard.schedulerExcluded,true,relative);
    assert.equal(catalog.internalAssetStandard.deploymentExcluded,true,relative);
    assert.equal(catalog.internalAssetStandard.companyLibrary,'company-asset-library.json',relative);
  }
});


test('all internal assets may be composed from every existing flow stage without giving assets flow authority',()=>{
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.consumerStageAccess,'ALL_EXISTING_FLOW_STAGES');
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.allInternalAssetsComposableAcrossExistingStages,true);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.stageSpecificCombinationAllowed,true);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.crossFamilyCompositionAllowed,true);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.flowOwnership,false);
  assert.equal(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.flowMutationAllowed,false);

  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.consumerStageAccess,'ALL_EXISTING_FLOW_STAGES');
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.allInternalAssetsComposableAcrossExistingStages,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.stageSpecificCombinationAllowed,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.crossFamilyCompositionAllowed,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.compositionDoesNotGrantGameplaySaveNetworkOrFlowAuthority,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.hardBlockersStillApply,true);
  assert.equal(INTERNAL_ASSET_REUSE_POLICY.composition.newFlowOrPipelineCreated,false);

  const asset={
    id:'stage-composable-prop',
    family:'PROP',
    subfamily:'INTERACTIVE',
    platform:'ROBLOX',
    status:'REPO_ASSET',
    license:'project-original',
    sourceFiles:['assets/example.luau'],
    tags:['INTERACTIVE']
  };
  const loadout=buildStudioAssetLoadout({
    requirements:[{family:'PROP',subfamily:'INTERACTIVE',required:true}],
    assets:[asset],
    gameDna:{targetPlatform:'ROBLOX'}
  });
  assert.equal(loadout.complete,true);
  assert.equal(loadout.consumerStageAccess,'ALL_EXISTING_FLOW_STAGES');
  assert.equal(loadout.allSelectedAssetsComposableAcrossExistingFlowStages,true);
  assert.equal(loadout.stageSpecificCombinationAllowed,true);
  assert.equal(loadout.crossFamilyCompositionAllowed,true);
  assert.equal(loadout.flowOwnership,false);
  assert.equal(loadout.flowMutationAllowed,false);
  assert.equal(loadout.selections[0].consumerStageAccess,'ALL_EXISTING_FLOW_STAGES');
  assert.equal(loadout.selections[0].composableAcrossExistingFlowStages,true);
  assert.equal(loadout.selections[0].stageSpecificCombinationAllowed,true);
  assert.equal(loadout.selections[0].flowOwnership,false);
});

test('company asset library exposes all-stage composition as an asset contract only',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const contract=registry.internalAssetCompositionContract;
  assert.ok(Number.isInteger(registry.version)&&registry.version>=1);
  assert.equal(registry.internalAssetLibraryAutomation.lastCatalogSynchronizedVersion,registry.version);
  assert.equal(contract.scope,'ALL_INTERNAL_ASSETS');
  assert.equal(contract.consumerStageAccess,'ALL_EXISTING_FLOW_STAGES');
  assert.equal(contract.allInternalAssetsComposableAcrossExistingStages,true);
  assert.equal(contract.stageSpecificCombinationAllowed,true);
  assert.equal(contract.crossFamilyCompositionAllowed,true);
  assert.equal(contract.modifiesFlow,false);
  assert.equal(contract.modifiesWorkflow,false);
  assert.equal(contract.modifiesQueue,false);
  assert.equal(contract.modifiesScheduler,false);
  assert.equal(contract.modifiesDeployment,false);
  assert.equal(contract.createsPipeline,false);
  assert.equal(contract.createsWrapper,false);
  assert.equal(contract.createsShadowSystem,false);
  const uiCatalog=JSON.parse(fs.readFileSync(path.resolve(here,'..','assets','roblox','common-ui-v1','catalog.json'),'utf8'));
  assert.equal(contract.uiComponentCount,uiCatalog.atoms.length);
  assert.equal(contract.uiRegistryAtomCount,uiCatalog.atoms.length);
  assert.equal(contract.vfxAtomCount,registry.assets.find(row=>row.id==='roblox-common-vfx-v1').assetCount);
  assert.equal(contract.materialAtomCount,registry.assets.find(row=>row.id==='roblox-common-materials-v1').assetCount);
  assert.equal(registry.internalAssetStandard.allInternalAssetsComposableAcrossExistingStages,true);
  assert.equal(registry.internalAssetRoutineReview.allInternalAssetsComposableAcrossExistingStages,true);
});


test('realistic environment states couple sky background surface wind and soundscape without gameplay authority',()=>{
  assert.equal(COMMON_ENVIRONMENT_STATE_EXPECTATIONS.length,14);
  assert.ok(COMMON_ENVIRONMENT_STATE_EXPECTATIONS.includes('THUNDERSTORM'));
  assert.ok(COMMON_ENVIRONMENT_STATE_EXPECTATIONS.includes('WHITE_NIGHT'));
  assert.ok(COMMON_ENVIRONMENT_STATE_EXPECTATIONS.includes('SOLAR_ECLIPSE'));
  assert.ok(COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS.sourceGroups.WIND.includes('WIND_GALE'));
  assert.ok(COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS.sourceGroups.INSECT.includes('INSECT_SWARM'));
  assert.ok(COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS.sourceGroups.ANIMAL.includes('FROG'));
  assert.ok(COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS.sourceGroups.MACHINE.includes('MACHINE_HUM'));
  assert.equal(COMMON_AMBIENT_SOUNDSCAPE_EXPECTATIONS.audioPlaybackAuthority,false);
});

test('latest action survival rogue seed ideas fill environment item prop character menu and ambient linkage gaps',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const ideas=registry.seedDerivedInternalAssetIdeas;
  assert.equal(ideas.sourceSeedId,SEED_ACTION_SURVIVAL_ROGUE_INTERNAL_ASSET_IDEAS.seedId);
  for(const key of ['environmentBackgrounds','items','props','characters','menus','ambientAudio','coupling']){
    assert.ok(Array.isArray(ideas[key])&&ideas[key].length>=6,key);
  }
  assert.equal(ideas.sourceGameFacts.gameName,'잃어버린 별의 메아리');
  assert.ok(ideas.sourceGameFacts.coreLoop.includes('ECHO_SHARD_PICKUP'));
  assert.ok(ideas.sourceGameFacts.coreLoop.includes('REALTIME_BUILD_SELECTION'));
  assert.ok(ideas.menus.includes('ECHO_SELECTION'));
  assert.ok(ideas.menus.includes('WAVE_THREAT_HUD'));
  assert.ok(ideas.menus.includes('BOSS_WARNING'));
  assert.ok(ideas.menus.includes('ONE_HAND_PORTRAIT_ACTION_HUD'));
  assert.ok(ideas.items.includes('ECHO_SHARD_WORLD_MODEL'));
  assert.ok(ideas.props.includes('WEATHER_STATION'));
  assert.ok(ideas.props.includes('WAVE_WARNING_BEACON'));
  assert.ok(ideas.ambientAudio.includes('ECHO_RESONANCE'));
  assert.ok(ideas.ambientAudio.includes('GENERATOR_HUM'));
  assert.ok(ideas.coupling.includes('ECHO_SHARD_DROP>WORLD_MODEL>PICKUP_VFX>PICKUP_AUDIO_ROLE>HUD_FEEDBACK'));
  assert.equal(ideas.gameplayAuthority,false);
  assert.equal(ideas.balanceAuthority,false);
  assert.equal(registry.ambientSoundscapeContract.actualAudioAssetCountFromThisContract,0);
});


test('company common seed asset ideation reads all company seed artbooks and produces cross-genre volume-up demand',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const seedRoot=path.join(root,'artbook-submissions');
  const seedDirs=fs.readdirSync(seedRoot,{withFileTypes:true})
    .filter(entry=>entry.isDirectory()&&entry.name.startsWith('seed-'))
    .map(entry=>entry.name)
    .filter(name=>fs.existsSync(path.join(seedRoot,name,'current.json')))
    .sort();

  const seeds=seedDirs.map(name=>{
    const row=JSON.parse(fs.readFileSync(path.join(seedRoot,name,'current.json'),'utf8'));
    return{
      gameId:row.gameId||name,
      gameName:row.gameName||row.designCore?.identity||row.content?.identity,
      identity:row.designCore?.identity||row.content?.identity,
      coreFun:row.designCore?.coreFun,
      coreLoop:row.designCore?.coreLoop||row.content?.coreLoop||[],
      signatureSystems:row.designCore?.signatureSystems||row.content?.signatureSystems||[],
      progressionDirection:row.designCore?.progressionDirection||row.content?.progressionDirection,
      visualDirection:row.designCore?.visualDirection||row.content?.visualDirection,
      mobileUx:row.designCore?.mobileUx
    };
  });
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const plan=createCompanySeedAssetIdeationPlan({seeds,assets:registry.assets});

  assert.equal(COMPANY_COMMON_SEED_ASSET_IDEA_AXES.scope,'ALL_COMPANY_COMMON_SEEDS');
  assert.equal(COMPANY_COMMON_SEED_ASSET_IDEA_AXES.sourcePattern,'artbook-submissions/seed-*/current.json');
  assert.equal(plan.seedCount,seeds.length);
  assert.ok(plan.seedCount>=10);
  for(const seed of seeds)assert.ok(plan.seeds.some(row=>row.gameId===seed.gameId),seed.gameId);

  for(const signal of ['ACTION_COMBAT','SURVIVAL','RPG_PROGRESSION','PUZZLE','CASUAL_SHORT_RUN','IDLE_GROWTH','TYCOON_SIM','SOCIAL_ROLEPLAY','HORROR','DEFENSE','NARRATIVE','EXPLORATION']){
    assert.ok(plan.detectedSignals.includes(signal),signal);
  }
  for(const domain of ['UI','ITEM','WEAPON','CHARACTER_GEAR','SKILL','VFX','MOTION','MATERIAL','ENVIRONMENT','BUILDING','WORLD_PROP','CREATURE','FOLIAGE','PRESENTATION','AUDIO']){
    assert.ok(plan.ideas.some(row=>row.domain===domain),domain);
  }

  assert.ok(plan.ideaCount>=60);
  assert.ok(plan.familyDemand.length>=12);
  assert.ok(plan.familyDemand.some(row=>row.currentGapCount>0&&row.action==='VOLUME_UP_GAP_FIRST'));
  assert.ok(plan.crossGenreKitCount>=8);
  for(const id of ['ECLIPSE_MARKET_BLACKOUT','SANDSTORM_CONVOY_DEFENSE','CRYSTAL_FACTORY_OVERLOAD','FOG_TOWN_MEMORY_CASE','AURORA_HARVEST_FESTIVAL','RUINED_COAST_SIGNAL_RESCUE']){
    assert.ok(plan.crossGenreKits.some(row=>row.id===id),id);
    assert.ok(COMPANY_COMMON_SEED_CROSS_GENRE_IDEA_KITS.some(row=>row.id===id),id+':library');
  }

  assert.equal(plan.volumeBeforeQuality,false);
  assert.equal(plan.reuseAdaptRecombineBeforeNewAuthoring,true);
  assert.equal(plan.schedulerCreated,false);
  assert.equal(plan.workflowCreated,false);
  assert.equal(plan.queueCreated,false);
  assert.equal(plan.pipelineCreated,false);
  assert.equal(plan.gameplayAuthority,false);
  assert.equal(plan.balanceAuthority,false);
  assert.equal(plan.saveAuthority,false);
  assert.equal(plan.networkAuthority,false);

  assert.ok(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.triggers.includes('COMPANY_COMMON_SEED_SET_CHANGED'));
  assert.ok(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.triggers.includes('COMPANY_COMMON_SEED_CONTENT_CHANGED'));
  assert.ok(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.preBinding.includes('BUILD_COMPANY_COMMON_SEED_ASSET_IDEA_PLAN'));
  assert.ok(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.packRevision.includes('REPRIORITIZE_FROM_COMPANY_COMMON_SEED_DEMAND'));
  assert.ok(INTERNAL_ASSET_ROUTINE_REVIEW_CONTRACT.packRevision.includes('VOLUME_UP_BEFORE_QUALITY_UP'));

  const contract=registry.companyCommonSeedAssetIdeation;
  assert.ok(contract);
  assert.equal(contract.scope,'ALL_COMPANY_COMMON_SEEDS');
  assert.equal(contract.sourcePattern,'artbook-submissions/seed-*/current.json');
  assert.equal(contract.currentSeedCount,seeds.length);
  assert.deepEqual([...contract.currentSeedIds].sort(),seeds.map(row=>row.gameId).sort());
  assert.equal(contract.planBuilder,'assets/vibe-studio-asset-universe.js#createCompanySeedAssetIdeationPlan');
  assert.equal(contract.execution.schedulerCreated,false);
  assert.equal(contract.execution.workflowCreated,false);
  assert.equal(contract.execution.queueCreated,false);
  assert.equal(contract.execution.pipelineCreated,false);
});


test('company-common VFX v4 expands reusable cross-genre feedback roles to twenty-seven',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-vfx-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonVFX.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));

  assert.equal(catalog.version,4);
  assert.equal(catalog.atoms.length,27);
  assert.equal(quality.sourceAssetCount,27);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-vfx-v1').assetCount,27);
  for(const role of ['CRITICAL','DODGE','HEAL','BUFF','DEBUFF','STATUS','LOOT_COMMON','LOOT_RARE','LOOT_LEGENDARY','UPGRADE','CRAFT','DISMANTLE','QUEST_UPDATE','INTERACTION','ENVIRONMENT','WEATHER','DESTRUCTION','BOSS','MOBILE_DENSITY']){
    const atom=catalog.atoms.find(row=>row.role===role);
    assert.ok(atom,role);
    assert.ok(source.includes(atom.atomId),atom.atomId);
    const id='roblox-common-vfx-'+atom.atomId.toLowerCase().replaceAll('_','-');
    const registered=registry.assets.find(row=>row.id===id);
    assert.ok(registered,id);
    assert.equal(registered.role,role,id);
    assert.equal(registered.productionVerified,false,id);
  }
  assert.equal(catalog.systemDepthContract.missingComponentCandidates.length,0);
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');
  for(const forbidden of [/RemoteEvent/,/RemoteFunction/,/FireServer\(/,/TakeDamage\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('material and VFX system depth become complete without claiming runtime production verification',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const report=auditCommonLibrarySystemDepth({assets:registry.assets});
  const vfx=report.rows.find(row=>row.domain==='VFX');
  const material=report.rows.find(row=>row.domain==='MATERIAL');
  assert.ok(vfx);
  assert.ok(material);
  assert.equal(vfx.missing.length,0);
  assert.equal(material.missing.length,0);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-vfx-v1').productionVerified,false);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-materials-v1').productionVerified,false);
  assert.equal(registry.commonLibrarySystemDepthAudit.latestVolumeUp.vfxCount,27);
  assert.equal(registry.commonLibrarySystemDepthAudit.latestVolumeUp.materialCount,25);
  assert.equal(registry.commonLibrarySystemDepthAudit.latestVolumeUp.volumeBeforeQuality,true);
});


test('company-common skill v3 expands reusable presentation roles to twenty',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const packDir=path.join(root,'assets','roblox','common-skill-v1');
  const source=fs.readFileSync(path.join(packDir,'RobloxCommonSkillPresentation.luau'),'utf8');
  const catalog=JSON.parse(fs.readFileSync(path.join(packDir,'catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(packDir,'quality-evidence.json'),'utf8'));
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));

  assert.equal(catalog.version,3);
  assert.equal(catalog.atoms.length,20);
  assert.equal(quality.sourceAssetCount,20);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-skill-v1').assetCount,20);
  for(const role of ['PROJECTILE','TRAIL','AREA','CHANNEL','BEAM','SUMMON','DASH','SHIELD','HEAL','AURA','STATUS_APPLY','STATUS_CLEANSE','INTERRUPT','ICON','AUDIO_ROLE','CAMERA_ROLE','MOBILE_DENSITY']){
    const atom=catalog.atoms.find(row=>row.role===role);
    assert.ok(atom,role);
    assert.ok(source.includes(atom.atomId),atom.atomId);
    const id='roblox-common-skill-'+atom.atomId.toLowerCase().replaceAll('_','-');
    const registered=registry.assets.find(row=>row.id===id);
    assert.ok(registered,id);
    assert.equal(registered.role,role,id);
    assert.equal(registered.productionVerified,false,id);
  }
  assert.equal(catalog.systemDepthContract.missingComponentCandidates.length,0);
  assert.equal(catalog.seedCompositionContract.audioPlaybackAuthority,false);
  assert.equal(catalog.seedCompositionContract.cameraAuthority,false);
  assert.ok(source.includes('OwnsAudioPlaybackAuthority", false'));
  assert.ok(source.includes('OwnsCameraAuthority", false'));
  for(const forbidden of [/RemoteEvent/,/RemoteFunction/,/FireServer\(/,/TakeDamage\(/]){
    assert.equal(forbidden.test(source),false,String(forbidden));
  }
});

test('skill system depth is complete after company-seed volume-up without gameplay authority',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  const report=auditCommonLibrarySystemDepth({assets:registry.assets});
  const skill=report.rows.find(row=>row.domain==='SKILL');
  assert.ok(skill);
  assert.equal(skill.missing.length,0);
  assert.equal(registry.commonLibrarySystemDepthAudit.latestVolumeUp.skillCount,20);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-skill-v1').productionVerified,false);
});


test('character gear system depth is complete after company-seed volume-up',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-character-gear-v1','catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-character-gear-v1','quality-evidence.json'),'utf8'));
  const report=auditCommonLibrarySystemDepth({assets:registry.assets});
  const gear=report.rows.find(row=>row.domain==='CHARACTER_GEAR');
  assert.ok(gear);
  assert.equal(gear.missing.length,0);
  assert.equal(catalog.version,3);
  assert.equal(catalog.items.length,18);
  assert.equal(quality.sourceAssetCount,18);
  for(const role of ['LEGS','SHOULDER','BELT','RING','AMULET','ACCESSORY','COSMETIC_OVERLAY','SET_IDENTITY','SOCKET_POINT','UPGRADE_STAGE_VISUAL','DAMAGE_WEAR_VARIANT','TRANSMOG_BASE']){
    const found=registry.assets.some(row=>row.packId==='roblox-common-character-gear-v1'&&((row.systemRoles||[]).includes(role)||row.gearRole===role||row.subfamily===role));
    assert.equal(found,true,role);
  }
  assert.equal(registry.commonLibrarySystemDepthAudit.latestVolumeUp.characterGearCount,18);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-character-gear-v1').productionVerified,false);
});


test('foliage system depth is complete after company-seed volume-up',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-foliage-v1','catalog.json'),'utf8'));
  const quality=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-foliage-v1','quality-evidence.json'),'utf8'));
  const report=auditCommonLibrarySystemDepth({assets:registry.assets});
  const foliage=report.rows.find(row=>row.domain==='FOLIAGE');
  assert.ok(foliage);
  assert.equal(foliage.missing.length,0);
  assert.equal(catalog.version,3);
  assert.equal(catalog.items.length,18);
  assert.equal(quality.sourceAssetCount,18);
  for(const role of ['BROADLEAF_TREE','VINE','REED','MOSS','MUSHROOM','ROOT','BIOME_VARIANT','SEASON_VARIANT','WIND_VARIANT','LOD']){
    const found=registry.assets.some(row=>row.packId==='roblox-common-foliage-v1'&&((row.systemRoles||[]).includes(role)||row.subfamily===role||row.environmentRole===role));
    assert.equal(found,true,role);
  }
  assert.equal(registry.commonLibrarySystemDepthAudit.latestVolumeUp.foliageCount,18);
  assert.equal(registry.assets.find(row=>row.id==='roblox-common-foliage-v1').productionVerified,false);
});


test('internal asset maintenance refreshes on type role and quality evolution without deleting assets',()=>{
  const baseAssets=[
    {id:'weapon-a',family:'WEAPON',subfamily:'SWORD',role:'MELEE',internalAuditScore:910,internalAuditGrade:'HERO',catalogActive:true},
    {id:'weapon-b',family:'WEAPON',subfamily:'SWORD',role:'MELEE',internalAuditScore:970,internalAuditGrade:'ELITE',catalogActive:true},
    {id:'old-prop',family:'PROP',subfamily:'CHEST',role:'CONTAINER',catalogActive:false,catalogState:'STALE_CATALOG_ROW_REVIEW'}
  ];
  const first=buildInternalAssetMaintenanceSnapshot({assets:baseAssets,uiAtomIds:['INVENTORY_SLOT'],audioRoleIds:['UI_CONFIRM']});
  assert.equal(first.status,'SELF_MAINTENANCE_READY');
  assert.equal(first.currentLibraryAlwaysWins,true);
  assert.equal(first.automaticDeletion,false);
  assert.ok(first.refreshReasons.includes('MAINTENANCE_BASELINE_INITIALIZED'));
  assert.equal(first.qualityDonorCandidates[0].id,'weapon-b');
  assert.ok(first.staleRowIds.includes('old-prop'));
  assert.ok(first.semanticDuplicateReviewGroups.some(row=>row.assetIds.includes('weapon-a')&&row.assetIds.includes('weapon-b')));

  const evolvedAssets=baseAssets.map(row=>row.id==='weapon-a'?{...row,internalAuditScore:985,internalAuditGrade:'MASTERPIECE'}:row)
    .concat([{id:'weapon-c',family:'WEAPON',subfamily:'SPEAR',role:'POLEARM',internalAuditScore:940,internalAuditGrade:'HERO',catalogActive:true}]);
  const second=buildInternalAssetMaintenanceSnapshot({assets:evolvedAssets,uiAtomIds:['INVENTORY_SLOT','EQUIPMENT_SLOT'],audioRoleIds:['UI_CONFIRM'],previous:first});
  assert.equal(second.refreshRequired,true);
  assert.ok(second.refreshReasons.includes('INVENTORY_CHANGED'));
  assert.ok(second.refreshReasons.includes('TYPE_OR_ROLE_CHANGED'));
  assert.ok(second.refreshReasons.includes('QUALITY_METADATA_CHANGED'));
  assert.ok(second.newTypeRoleTokens.some(token=>token.includes('SPEAR')||token.includes('POLEARM')));
  assert.equal(second.qualityDonorCandidates[0].id,'weapon-a');
  assert.equal(second.continueWithoutHuman,true);
  assert.equal(second.continueWithoutChatgpt,true);
});

test('internal maintenance excludes inactive donors and binds detail repairs to current audit axes',()=>{
  const assets=[
    {id:'active',family:'PROP',internalAuditScore:1000,sourceHash:'source-a',sourceFiles:['assets/props.js'],internalAuditEvidence:{DETAIL_FINISH:20,MATERIAL_SURFACE:90}},
    {id:'stale',family:'PROP',catalogActive:false,internalAuditScore:1000},
    {id:'quarantined',family:'PROP',status:'QUARANTINED',internalAuditScore:1000},
    {id:'unknown',family:'PROP',internalAuditScore:null}
  ];
  const first=buildInternalAssetMaintenanceSnapshot({assets});
  assert.deepEqual(first.qualityDonorCandidates.map(row=>row.id),['active']);
  const inspect=first.nextQualityActions.find(row=>row.assetId==='unknown');
  assert.equal(inspect.kind,'INSPECT_ASSET_QUALITY');
  assert.equal(inspect.currentAxisScore,null);
  const repair=first.nextQualityActions.find(row=>row.assetId==='active');
  assert.deepEqual(repair.sourceFiles,['assets/props.js']);
  assert.equal(repair.productionPromotionAllowed,false);
  assert.ok(repair.preserveAxes.includes('MATERIAL_SURFACE'));
  const second=buildInternalAssetMaintenanceSnapshot({assets:assets.map(row=>row.id==='active'?{...row,sourceHash:'source-b',internalAuditEvidence:{DETAIL_FINISH:90,MATERIAL_SURFACE:20}}:row),previous:first});
  assert.notEqual(second.qualityFingerprint,first.qualityFingerprint);
  assert.ok(second.refreshReasons.includes('QUALITY_METADATA_CHANGED'));
  assert.deepEqual(first,buildInternalAssetMaintenanceSnapshot({assets:[...assets].reverse()}));
  assert.equal(assets[0].internalAuditScore,1000);
});

test('internal role coverage cannot be satisfied by a different family or stale object',()=>{
  const assets=[
    {id:'audio-weather',family:'AUDIO',role:'WEATHER',companyCommonBase:true},
    {id:'old-weather',family:'ENVIRONMENT',role:'WEATHER',companyCommonBase:true,catalogActive:false}
  ];
  const plan=buildInternalAssetLibraryAutomationPlan({assets});
  const environment=plan.domains.find(row=>row.domain==='ENVIRONMENT');
  assert.ok(environment.missingDepthRoles.includes('WEATHER'));
  assert.ok(environment.suggestedIdeas.some(row=>row.role==='WEATHER'));
  assert.ok(plan.nextVolumeActions.every(row=>!row.internalReuseCandidatePreview.some(candidate=>candidate.id==='old-weather')));
});

test('internal quality detail repair dedupes shared source and reaudits perfect axes',()=>{
  const allAxes=scoreInternalAssetAudit1000({asset:{family:'PROP'}}).applicableAxes;
  const complete=Object.fromEntries(allAxes.map(axis=>[axis,100]));
  const assets=[
    {id:'a',family:'PROP',sourceFiles:['assets/props.js'],internalAuditEvidence:{...complete,DETAIL_FINISH:30}},
    {id:'b',family:'PROP',sourceFiles:['assets/props.js'],internalAuditEvidence:{...complete,DETAIL_FINISH:30}},
    {id:'perfect',family:'PROP',sourceFiles:['assets/perfect.js'],internalAuditEvidence:complete}
  ];
  const plan=buildInternalAssetMaintenanceSnapshot({assets});
  assert.equal(plan.nextQualityActions.length,2);
  assert.equal(plan.nextQualityActions[0].weakestAxis,'DETAIL_FINISH');
  assert.ok(plan.nextQualityActions[0].detailSteps.includes('SEAMS_FASTENERS_EDGE_PROFILES_AND_CONTACT_DETAIL'));
  assert.equal(plan.nextQualityActions[1].kind,'REAUDIT_ASSET_QUALITY');
});

test('catalog synchronization cannot inherit or manufacture production verification',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-proof-'));
  try{
    const dir=path.join(root,'assets/roblox/common-items-v1');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'catalog.json'),JSON.stringify({packId:'roblox-common-items-v1',version:1,items:[{assetId:'NEW',productionVerified:true,verifiedCompanyReusable:true,runtimeVerificationState:'VERIFIED_RUNTIME'}]}));
    const registry={version:1,assets:[{id:'roblox-common-items-v1',family:'PROP',packId:'roblox-common-items-v1',productionVerified:true,verifiedCompanyReusable:true,runtimeVerificationState:'VERIFIED_RUNTIME',internalAuditScore:1000,consumerGameIds:['existing-game']}]};
    const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry,persist:false});
    const added=first.registry.assets.find(row=>row.id!=='roblox-common-items-v1');
    assert.equal(added.productionVerified,false);
    assert.equal(added.verifiedCompanyReusable,false);
    assert.equal(added.runtimeVerificationState,'PENDING_STUDIO');
    assert.equal(added.internalAuditScore,undefined);
    assert.deepEqual(added.consumerGameIds,[]);
    const second=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:first.registry,persist:false});
    assert.equal(second.changed,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('atomic asset search resolves exact atoms from one snapshot and rejects stale dynamic links',()=>{
  const assets=Array.from({length:1000},(_,i)=>({id:'asset-'+i,atomId:'PART_'+i,family:i===999?'WEAPON':'PROP',platform:'ROBLOX',license:'project-original',status:'REPO_ASSET',path:'assets/parts/'+i+'.luau',internalAuditScore:900}));
  const args={assets,requirements:[{family:'WEAPON',atomId:'PART_999'}],gameDna:{targetPlatform:'ROBLOX'},libraryVersion:12,librarySnapshotId:'snapshot-12'};
  const first=buildStudioAssetLoadout(args);
  assert.equal(first.complete,true);
  assert.equal(first.searchStats.candidateVisits,1);
  assert.equal(first.atomicBindingReady,true);
  assert.equal(first.bindingBatch[0].atomId,'PART_999');
  assert.deepEqual(first.bindingBatch[0].sourceFiles,['assets/parts/999.luau']);
  assert.equal(first.bindingBatch[0].librarySnapshotId,'snapshot-12');
  const stale=buildStudioAssetLoadout({...args,expectedSnapshotId:'snapshot-11'});
  assert.equal(stale.complete,false);
  assert.equal(stale.atomicBindingReady,false);
  assert.deepEqual(stale.bindingBatch,[]);
  assert.equal(stale.bindingAction,'RESELECT_CURRENT_LIBRARY_SNAPSHOT');
  const missing=buildStudioAssetLoadout({...args,requirements:[...args.requirements,{family:'WEAPON',atomId:'ABSENT'}]});
  assert.equal(missing.atomicBindingReady,false);
  assert.deepEqual(missing.bindingBatch,[]);
  assert.equal(missing.unresolved.length,1);
  const updated=buildStudioAssetLoadout({...args,libraryVersion:13,librarySnapshotId:'snapshot-13',assets:assets.map(row=>row.id==='asset-999'?{...row,path:'assets/parts/revised.luau'}:row)});
  assert.deepEqual(updated.bindingBatch[0].sourceFiles,['assets/parts/revised.luau']);
  assert.equal(updated.bindingBatch[0].libraryVersion,13);
  assert.equal(updated.bindingBatchIsRuntimeProof,false);
  const zero=buildStudioAssetLoadout({...args,assets:assets.map(row=>({...row,internalAuditScore:0}))});
  assert.equal(zero.complete,true);
  assert.equal(zero.atomicBindingReady,true);
  assert.equal(zero.selections[0].internalAuditScore,0);
  assert.equal(zero.selections[0].qualityScoreBlocksBinding,false);
});

test('asset homepage replaces retired representatives with selectable monsters and environments',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const html=fs.readFileSync(path.join(root,'asset-library.html'),'utf8');
  assert.doesNotMatch(html,/data-representative|monsterPreview|motionVideo|actionVideo|이전 자산 미리보기/);
  for(const id of ['monsterTab','environmentTab','assetList','basicClips','actionClips','refreshAssets'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/script type="module" src="\/assets\/asset-library.js"/);
});

test('representative videos preserve exact source lineage without promoting quality or runtime proof',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const asset=registry.assets.find(row=>row.id==='roblox-world-ghost-gwisin-bride');
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/roblox/world-ghosts/native/mesh/evidence.json'),'utf8'));
  const previews=evidence.inspectionPreviews;
  const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest(fs.readFileSync(path.join(root,previews.sourceRender))),previews.sourceRenderSha256);
  assert.equal(previews.nativeRuntimeProof,false);
  assert.equal(previews.scorePromotionAllowed,false);
  assert.notEqual(asset.productionVerified,true);
  assert.deepEqual(asset.previewClips,previews.clips);
  for(const clip of Object.values(previews.clips)){
    const bytes=fs.readFileSync(path.join(root,clip.path.replace(/^\//,'')));
    assert.equal(bytes.length,clip.bytes);
    assert.equal(digest(bytes),clip.sha256);
    assert.equal(bytes.toString('ascii',4,8),'ftyp');
    assert.equal(clip.frameCount,64);
    assert.equal(clip.frameCount/clip.frameRate,clip.durationSeconds);
    assert.equal(clip.runtimeProof,false);
  }
  assert.equal(previews.clips.idle.sourceStartSeconds,0);
  assert.equal(previews.clips.attack.sourceStartSeconds,3.2);
});

test('dynamic asset binding refreshes when source bytes change without a catalog version bump',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-dynamic-'));
  try{
    fs.mkdirSync(path.join(root,'assets'),{recursive:true});
    fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
    fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify({assetProductionParallelContract:{companyGraphicsLibrary24h:{status:'ACTIVE_EXECUTABLE_CONTRACT',studioAssetUniverse:{status:'ACTIVE_EXECUTABLE_CONTRACT'}}}}));
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,assets:[{id:'box',atomId:'BOX',family:'PROP',platform:'ROBLOX',status:'REPO_ASSET',license:'project-original',path:'assets/box.luau',internalAuditScore:0}]}));
    const file=path.join(root,'assets/box.luau');fs.writeFileSync(file,'return {detail=1}');
    const task={gameId:'test',assetRequirements:[{family:'PROP',atomId:'BOX'}]};
    const first=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task}).flowAssetLoadout;
    assert.equal(first.atomicBindingReady,true);
    fs.writeFileSync(file,'return {detail=2}');
    const second=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task}).flowAssetLoadout;
    assert.equal(second.libraryVersion,first.libraryVersion);
    assert.notEqual(second.librarySnapshotId,first.librarySnapshotId);
    assert.notEqual(second.bindingBatch[0].sourceContentFingerprint,first.bindingBatch[0].sourceContentFingerprint);
    const stale=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task:{...task,expectedAssetLibrarySnapshotId:first.librarySnapshotId}}).flowAssetLoadout;
    assert.equal(stale.snapshotMatches,false);
    assert.deepEqual(stale.bindingBatch,[]);
    fs.unlinkSync(file);
    const missing=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task}).flowAssetLoadout;
    assert.equal(missing.atomicBindingReady,false);
    assert.deepEqual(missing.bindingBatch,[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('studio audio breadth covers music ambience creature howls spatial layers and continuous quality',()=>{
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.status,'ACTIVE_STUDIO_AUDIO_BREADTH');
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.roleTargetMin,180);
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.actualVerifiedAudioFileCountSeparateFromRoleCoverage,true);
  for(const role of ['TITLE_MENU','EXPLORATION_CALM','COMBAT_LAYER_LOW','COMBAT_LAYER_HIGH','BOSS_FINAL_PHASE','VICTORY','DEFEAT']){
    assert.ok(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.music.roles.includes(role),role);
  }
  for(const role of ['RAIN_LIGHT','THUNDER_NEAR','THUNDER_FAR','CAVE_AIR','CITY_CROWD','STRUCTURE_CREAK']){
    assert.ok(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.ambience.roles.includes(role),role);
  }
  for(const role of ['WOLF_HOWL_NEAR','WOLF_HOWL_DISTANT','COYOTE_HOWL_DISTANT','BEAR_ROAR','BOSS_VOCAL_PHASE']){
    assert.ok(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.creatureVocals.roles.includes(role),role);
  }
  for(const role of ['WEAPON_HIT_FLESH','WEAPON_HIT_ARMOR','PROJECTILE_FLYBY','SKILL_IMPACT','CRAFT_COMPLETE','CHEST_OPEN']){
    assert.ok(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.gameplaySfx.roles.includes(role),role);
  }
  assert.deepEqual(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.spatialMix.distanceBands,['NEAR','MID','FAR','DISTANT']);
  assert.ok(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.spatialMix.requirements.includes('OCCLUSION_FILTER_ROLE'));
  assert.ok(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.spatialMix.requirements.includes('REVERB_ZONE_ROLE'));
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.variation.singleLoopOnlyForbidden,true);
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.variation.minimumRepeaterVariantsRecommended,4);
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.quality.continual,true);
  assert.equal(INTERNAL_AUDIO_STUDIO_BREADTH_CONTRACT.quality.oneAndDoneForbidden,true);
  assert.ok(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS.AUDIO.includes('BGM_COMBAT_LOW_MID_HIGH_STEMS'));
  assert.ok(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS.AUDIO.includes('WOLF_HOWL_NEAR_DISTANT_SET'));
  assert.ok(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS.AUDIO.includes('OCCLUSION_REVERB_ZONE_ROLES'));
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.AUDIO.required.includes('CREATURE_HOWL'));
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.AUDIO.required.includes('MUSIC_BOSS_PHASE'));
  assert.ok(COMMON_LIBRARY_SYSTEM_DEPTH_EXPECTATIONS.AUDIO.required.includes('REVERB_ZONE_ROLE'));
  assert.ok(INTERNAL_ASSET_STUDIO_VARIATION_AXES.AUDIO.includes('MUSIC_STATE'));
  assert.ok(INTERNAL_ASSET_STUDIO_VARIATION_AXES.AUDIO.includes('CREATURE_SPECIES_STATE'));
  assert.ok(INTERNAL_ASSET_STUDIO_VARIATION_AXES.AUDIO.includes('OCCLUSION_REVERB'));
});

test('internal asset library automation uses loose bands and concrete UI subsystem idea pools',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const ui=JSON.parse(fs.readFileSync(path.join(root,'assets','roblox','common-ui-v1','catalog.json'),'utf8'));
  const seedRoot=path.join(root,'artbook-submissions');
  const seeds=fs.readdirSync(seedRoot,{withFileTypes:true})
    .filter(entry=>entry.isDirectory()&&entry.name.startsWith('seed-')&&fs.existsSync(path.join(seedRoot,entry.name,'current.json')))
    .map(entry=>{
      const value=JSON.parse(fs.readFileSync(path.join(seedRoot,entry.name,'current.json'),'utf8'));
      return{
        gameId:value.gameId||entry.name,
        gameName:value.gameName||value.designCore?.identity||value.content?.identity,
        identity:value.designCore?.identity||value.content?.identity,
        coreFun:value.designCore?.coreFun,
        coreLoop:value.designCore?.coreLoop||value.content?.coreLoop||[],
        signatureSystems:value.designCore?.signatureSystems||value.content?.signatureSystems||[],
        progressionDirection:value.designCore?.progressionDirection||value.content?.progressionDirection,
        visualDirection:value.designCore?.visualDirection||value.content?.visualDirection,
        mobileUx:value.designCore?.mobileUx
      };
    });
  const seedPlan=createCompanySeedAssetIdeationPlan({seeds,assets:registry.assets});
  const plan=buildInternalAssetLibraryAutomationPlan({assets:registry.assets,seedPlan,uiAtomIds:ui.atoms.map(row=>row.atomId),externalSources:registry.externalSources});

  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.version,15);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.countPolicy,'LOOSE_TARGET_BANDS_NOT_HARD_CAPS');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.persistentWorklistField,'internalAssetLibraryAutomation.nextVolumeActions');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.volumeActionConsumption,'PERSISTED_PRIORITY_WORKLIST_FIRST');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.perDomainIdeaBudgetPerCycle,4096);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.domainVolumeActionLimitPerDomain,512);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.uiSubsystemVolumeActionLimitPerSubsystem,256);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.maxVolumeWorklistActions,16384);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.taskReferenceOverlayWorklistLimit,8192);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.supplyDecisionSummaryActionLimit,2048);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeSourceCandidateLimitPerAction,512);
  assert.deepEqual(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.maintenanceListLimits,{
    semanticDuplicateReviewGroups:512,
    donorCandidates:1024,
    deltaTokens:4096,
    qualityActions:2048
  });
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.hardMaximum,null);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.referenceImageIdeaOverlay.enabled,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.referenceImageIdeaOverlay.taskLocalOnly,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.referenceImageIdeaOverlay.persistentRegistryStorageForbidden,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.referenceImageIdeaOverlay.rawImagePersistentLearningForbidden,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.referenceImageIdeaOverlay.directCopyForbidden,true);
  assert.deepEqual(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.reuseResolutionOrder,['REUSE_EXISTING','DERIVE_VARIANT','RECOMBINE_EXISTING','LICENSE_VERIFIED_FREE_SOURCE_ADAPT','NEW_AUTHORING']);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.repeatedDistinctVariationProposalForbidden,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityUpWorkingBandMin,980);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.productionRuntimeVerificationSeparateFromInternalQuality,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.styleExpressionRequiredForAllDomains,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.styleExpressionContractRef,'assets/vibe-studio-asset-universe.js#INTERNAL_ASSET_STYLE_EXPRESSION_AXES');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.styleExpressionDomainBindingRef,'assets/vibe-studio-asset-universe.js#INTERNAL_ASSET_STYLE_EXPRESSION_DOMAIN_BINDINGS');
  const autonomous=INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.autonomousOperatingContract;
  assert.equal(autonomous.status,'ACTIVE_EXISTING_VIBE_ASSET_LOOP');
  assert.equal(autonomous.executionLane,'ASSET_DEVELOPMENT');
  assert.equal(autonomous.ownerPresenceRequired,false);
  assert.equal(autonomous.humanPresenceRequired,false);
  assert.equal(autonomous.chatgptPresenceRequired,false);
  assert.equal(autonomous.manualApprovalRequiredForNormalSafeAssetWork,false);
  assert.equal(autonomous.existingRuntimeBindings.scheduler,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(autonomous.existingRuntimeBindings.executor,'.github/workflows/vibe2-continuous-core.yml');
  assert.equal(autonomous.resumeAfterInterruption,true);
  assert.equal(autonomous.continueAfterSafeActionCompletion,true);
  assert.equal(autonomous.blockedActionPolicy,'QUARANTINE_BLOCKED_ASSET_AND_CONTINUE_NEXT_SAFE_ACTION');
  assert.equal(autonomous.ambiguousLicensePolicy,'REJECT_SOURCE_AND_CONTINUE_NEXT_VERIFIED_CANDIDATE');
  assert.equal(autonomous.qualityEntryAction,'QUALITY_UP_1000');
  assert.equal(autonomous.qualitySelection,'WEAKEST_INTERNAL_AUDIT_AXIS_FIRST');
  assert.equal(autonomous.qualityTarget,1000);
  assert.equal(autonomous.internalQualityDoesNotPromoteProduction,true);
  assert.equal(autonomous.newWorkflowRequired,false);
  assert.equal(autonomous.newSchedulerRequired,false);
  assert.equal(autonomous.newQueueRequired,false);
  assert.equal(autonomous.newPipelineRequired,false);
  assert.equal(autonomous.newWrapperRequired,false);
  assert.equal(autonomous.newShadowSystemRequired,false);
  assert.equal(autonomous.continuousExistingAssetQualityEvolution,true);
  assert.equal(autonomous.oneAndDoneAssetCompletionForbidden,true);
  assert.equal(autonomous.reAuditExistingAssetsEveryMaintenanceCycle,true);
  assert.equal(autonomous.quality1000IsCurrentContractCeilingNotPermanentCompletion,true);
  assert.ok(autonomous.reopenTriggers.includes('NEW_QUALITY_CRITERIA'));
  assert.ok(autonomous.reopenTriggers.includes('NEW_HIGHER_QUALITY_INTERNAL_REFERENCE'));
  assert.ok(autonomous.reopenTriggers.includes('LIBRARY_TYPE_ROLE_OR_QUALITY_CHANGE'));
  const maintenanceContract=INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.autonomousMaintenanceContract;
  assert.equal(maintenanceContract.status,'ACTIVE_SELF_MAINTAINING_LIBRARY');
  assert.equal(maintenanceContract.ownerPresenceRequired,false);
  assert.equal(maintenanceContract.humanPresenceRequired,false);
  assert.equal(maintenanceContract.chatgptPresenceRequired,false);
  assert.equal(maintenanceContract.currentLibraryAlwaysWins,true);
  assert.equal(maintenanceContract.qualityUpdatesReorderReuseDonors,true);
  assert.equal(maintenanceContract.newTypeOrRoleReopensRelevantIdeation,true);
  assert.equal(maintenanceContract.existingAssetsReauditedContinuously,true);
  assert.equal(maintenanceContract.quality1000StillReauditedAgainstCurrentContract,true);
  assert.equal(maintenanceContract.staleRowsNeverAutoDeleted,true);
  assert.equal(maintenanceContract.semanticDuplicatesReviewOnly,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.priority,'AFTER_INTERNAL_REUSE_BEFORE_NEW_AUTHORING');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.sourceCatalogMode,'SUFFICIENT_METADATA_CATALOG_ON_DEMAND_ACQUISITION');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.bulkPrefetchForbidden,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.speculativeDownloadForbidden,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.automaticAcquisitionMode,'SELECTED_WORKLIST_ACTION_ONLY');
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.commercialUseRequired,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.derivativeModificationRequired,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.provenanceRequired,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.freeOriginalVolumePolicy.directProtectedCommercialGameAssetCopyForbidden,true);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.hardMaximum,null);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.overSoftLimitBlocksUse,false);
  assert.equal(plan.hardMaximum,null);
  assert.equal(plan.overSoftLimitBlocksUse,false);
  assert.equal(plan.automaticDeletion,false);
  assert.equal(plan.productionPromotionAutomatic,false);
  assert.equal(plan.runtimeVerificationRequired,true);
  assert.equal(plan.qualityTarget,1000);
  assert.equal(plan.qualityUpStartsOnlyAfterRecommendedVolume,false);
  assert.equal(plan.audioRoleVolumeSeparateFromVerifiedFileCount,true);
  assert.equal(plan.audioStudioBreadth.status,'ACTIVE_STUDIO_AUDIO_BREADTH');
  assert.equal(plan.audioStudioBreadth.roleTargetMin,180);
  const audioDomain=plan.domains.find(row=>row.domain==='AUDIO');
  assert.ok(audioDomain);
  assert.equal(audioDomain.targetMin,180);
  assert.ok(audioDomain.missingDepthRoles.includes('CREATURE_HOWL'));
  assert.ok(audioDomain.missingDepthRoles.includes('MUSIC_EXPLORATION'));
  assert.ok(audioDomain.missingDepthRoles.includes('REVERB_ZONE_ROLE'));
  assert.equal(plan.autonomousOperatingContract.chatgptPresenceRequired,false);
  assert.equal(plan.autonomousOperatingContract.humanPresenceRequired,false);
  assert.equal(plan.autonomousContinuationRequired,true);
  assert.equal(plan.ownerPresenceRequired,false);
  assert.equal(plan.humanPresenceRequired,false);
  assert.equal(plan.chatgptPresenceRequired,false);
  assert.equal(plan.autonomousMaintenanceContract.status,'ACTIVE_SELF_MAINTAINING_LIBRARY');
  assert.equal(plan.maintenance.status,'SELF_MAINTENANCE_READY');
  assert.equal(plan.maintenance.continueWithoutHuman,true);
  assert.equal(plan.maintenance.continueWithoutChatgpt,true);
  assert.equal(plan.maintenance.currentLibraryAlwaysWins,true);
  assert.ok(plan.maintenance.inventoryFingerprint);
  assert.ok(plan.maintenance.typeRoleFingerprint);
  assert.ok(plan.maintenance.qualityFingerprint);
  assert.ok(Array.isArray(plan.maintenance.qualityDonorCandidates));
  assert.ok(INTERNAL_ASSET_STUDIO_VARIATION_AXES.BUILDING.includes('DAMAGE_REPAIR_DECAY'));
  assert.ok(INTERNAL_ASSET_STUDIO_VARIATION_AXES.CREATURE.includes('NORMAL_ALPHA_ELITE_BOSS'));
  assert.ok(INTERNAL_ASSET_STUDIO_VARIATION_AXES.MOTION.includes('REACTION_DIRECTION_STRENGTH'));
  assert.ok(['CONSUME_PRIORITY_WORKLIST_ACTION','REBUILD_VOLUME_WORKLIST','QUALITY_UP_1000'].includes(plan.autonomousNextAction.kind));
  if(plan.focusPhase==='VOLUME_UP'&&plan.nextVolumeActions.length){
    assert.equal(plan.autonomousNextAction.kind,'CONSUME_PRIORITY_WORKLIST_ACTION');
    assert.equal(plan.autonomousNextAction.action.ideaId,plan.nextVolumeActions[0].ideaId);
    assert.equal(plan.autonomousNextAction.continueWithoutHuman,true);
  }
  assert.ok(['VOLUME_UP','QUALITY_UP_1000'].includes(plan.focusPhase));
  if(plan.focusPhase==='VOLUME_UP'){
    assert.ok(plan.nextVolumeActions.length>0);
    assert.ok(plan.nextVolumeActions.some(row=>row.kind==='DOMAIN_VOLUME'));
    assert.ok(plan.nextVolumeActions.every(row=>row.ideaId&&row.domain));
    assert.ok(plan.nextVolumeActions.every(row=>row.styleExpressionAdaptationRequired===true));
    assert.ok(plan.nextVolumeActions.every(row=>Array.isArray(row.styleExpressionAxisIds)&&row.styleExpressionAxisIds.length>0));
    assert.ok(plan.nextVolumeActions.every(row=>Array.isArray(row.studioVariationAxes)&&row.studioVariationAxes.length>0));
    assert.ok(plan.nextVolumeActions.every(row=>Array.isArray(row.internalReuseCandidatePreview)));
    assert.ok(plan.nextVolumeActions.every(row=>row.internalReuseCandidatePreview.length<=4));
    assert.ok(plan.nextVolumeActions.every(row=>row.internalReusePreviewLimit===4));
    assert.ok(plan.nextVolumeActions.every(row=>row.allCompatibleInternalAssetsRemainEligible===true));
    assert.ok(plan.nextVolumeActions.every(row=>row.internalReusePreviewIsNotEligibilityCap===true));
    assert.ok(plan.nextVolumeActions.every(row=>row.libraryFreshnessFingerprint===plan.maintenance.inventoryFingerprint));
    assert.ok(plan.nextVolumeActions.every(row=>row.qualityFreshnessFingerprint===plan.maintenance.qualityFingerprint));
    assert.ok(plan.nextVolumeActions.some(row=>row.freeSourceAvailable===true));
    assert.ok(plan.nextVolumeActions.every(row=>Array.isArray(row.freeSourceCandidateIds)));
    assert.ok(plan.nextVolumeActions.every(row=>row.bulkPrefetchAllowed===false));
    assert.ok(plan.nextVolumeActions.every(row=>row.speculativeDownloadAllowed===false));
    assert.ok(plan.nextVolumeActions.filter(row=>row.freeSourceAvailable).every(row=>row.freeSourceAcquisitionMode==='ON_DEMAND_SELECTED_ACTION_ONLY'));
    const buildingAction=plan.nextVolumeActions.find(row=>row.domain==='BUILDING');
    assert.ok(buildingAction?.freeSourceCandidateIds.includes('kenney-modular-buildings'));
    assert.ok(buildingAction?.freeSourceCandidateIds.includes('quaternius-ultimate-buildings'));
    const audioAction=plan.nextVolumeActions.find(row=>row.domain==='AUDIO');
    assert.deepEqual(audioAction?.freeSourceCandidateIds,['kenney-ui-audio','kenney-interface-sounds','kenney-rpg-audio','kenney-impact-sounds']);
    const creatureAction=plan.nextVolumeActions.find(row=>row.domain==='CREATURE');
    assert.ok(creatureAction?.freeSourceCandidateIds.includes('quaternius-ultimate-animated-animals'));
    const motionAction=plan.nextVolumeActions.find(row=>row.domain==='MOTION');
    assert.deepEqual(motionAction?.freeSourceCandidateIds,['kaykit-character-animations-1-1','quaternius-universal-animation-library','quaternius-universal-animation-library-2']);
    assert.deepEqual(plan.nextVolumeActions.map(row=>row.worklistOrder),plan.nextVolumeActions.map((_,index)=>index+1));
    const volumePriorityScore=row=>Number(row.priority||0)+Math.max(0,Number(row.targetMin||0)-Number(row.currentCount||0));
    for(let index=1;index<plan.nextVolumeActions.length;index++){
      assert.ok(volumePriorityScore(plan.nextVolumeActions[index-1])>=volumePriorityScore(plan.nextVolumeActions[index]));
    }
    assert.equal(plan.nextVolumeActions[0].domain,'AUDIO');
    assert.ok(plan.nextVolumeActions.slice(0,12).some(row=>row.domain==='CREATURE'));
    assert.ok(plan.nextVolumeActions.some(row=>row.domain==='SKILL'));
    assert.equal(plan.nextVolumeActions.slice(0,12).some(row=>row.kind==='UI_SUBSYSTEM_VOLUME'),false);
    assert.ok(plan.nextVolumeActions.every(row=>JSON.stringify(row.resolutionOrder)===JSON.stringify(['REUSE_EXISTING','DERIVE_VARIANT','RECOMBINE_EXISTING','LICENSE_VERIFIED_FREE_SOURCE_ADAPT','NEW_AUTHORING'])));
  }

  for(const domain of ['UI','ITEM','WEAPON','CHARACTER_GEAR','SKILL','VFX','MOTION','MATERIAL','ENVIRONMENT','BUILDING','WORLD_PROP','CREATURE','FOLIAGE','PRESENTATION','AUDIO']){
    const row=plan.domains.find(item=>item.domain===domain);
    assert.ok(row,domain);
    assert.equal(row.hardMaximum,null,domain);
    assert.ok(row.targetMax>row.targetMin,domain);
    assert.ok(COMMON_LIBRARY_LOOSE_VOLUME_BANDS[domain],domain);
  }

  for(const subsystem of ['INVENTORY_ITEM_MANAGEMENT','MENU_NAVIGATION','COMBAT_HUD','HOUSING_SANDBOX','FARMING_SETTLEMENT','ACCESSIBILITY_INPUT','MOBILE_ONE_HAND']){
    const row=plan.uiSubsystems.find(item=>item.subsystem===subsystem);
    assert.ok(row,subsystem);
    assert.equal(row.hardMaximum,null,subsystem);
    assert.ok(COMMON_UI_SUBSYSTEM_VOLUME_BANDS[subsystem],subsystem);
    assert.ok(COMMON_UI_SUBSYSTEM_IDEA_POOLS[subsystem].length>=10,subsystem);
    if(row.currentCount<row.targetMin){
      assert.ok(row.suggestedIdeas.length>0,subsystem);
      assert.ok(row.suggestedIdeas.some(idea=>idea.source==='UI_SUBSYSTEM_IDEA_POOL'),subsystem);
    }
  }

  for(const domain of ['ITEM','WEAPON','CHARACTER_GEAR','SKILL','VFX','MOTION','MATERIAL','ENVIRONMENT','BUILDING','WORLD_PROP','CREATURE','FOLIAGE','PRESENTATION','AUDIO']){
    assert.ok(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS[domain].length>=10,domain);
  }
  assert.ok(COMMON_UI_SUBSYSTEM_IDEA_POOLS.INVENTORY_ITEM_MANAGEMENT.includes('SMART_SORT_PREVIEW'));
  assert.ok(COMMON_UI_SUBSYSTEM_IDEA_POOLS.COMBAT_HUD.includes('BOSS_PHASE_STRIP'));
  assert.ok(COMMON_UI_SUBSYSTEM_IDEA_POOLS.HOUSING_SANDBOX.includes('STRUCTURAL_SUPPORT_OVERLAY'));
  assert.ok(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS.ENVIRONMENT.includes('COSMIC_ANOMALY_HORIZON'));
  assert.ok(COMMON_LIBRARY_AUTOMATED_IDEA_POOLS.AUDIO.includes('INTERIOR_EXTERIOR_TRANSITION'));
  assert.equal(plan.persistentWorklistField,'internalAssetLibraryAutomation.nextVolumeActions');
  assert.equal(plan.volumeActionConsumption,'PERSISTED_PRIORITY_WORKLIST_FIRST');
  assert.equal(plan.eligibleFreeSourceCount,22);
  assert.equal(plan.freeSourceCatalogSufficiencyCount,12);
  assert.equal(plan.freeSourceCatalogReady,true);
  assert.equal(plan.freeSourceCatalogExpansionMode,'PAUSED_UNTIL_REAL_COVERAGE_GAP');
  assert.equal(plan.primaryAttention,'QUALITY_AND_AUTOMATION_DETAIL_WITH_ON_DEMAND_GAP_FILL');
  assert.equal(plan.qualityUpPolicy.selection,'WEAKEST_INTERNAL_AUDIT_AXIS_FIRST');
  assert.equal(plan.qualityUpPolicy.workingBandMin,980);
  assert.equal(plan.qualityUpPolicy.target,1000);
  assert.equal(plan.qualityUpPolicy.productionRuntimeVerificationSeparate,true);
  assert.equal(plan.freeOriginalVolumePolicy.priority,'AFTER_INTERNAL_REUSE_BEFORE_NEW_AUTHORING');
  assert.equal(plan.freeOriginalVolumePolicy.allowed,'CC0_OR_CLEAR_COMMERCIAL_USE_AND_MODIFICATION_ALLOWED');

  const foliagePool=[...new Set([
    ...COMMON_LIBRARY_AUTOMATED_IDEA_POOLS.FOLIAGE,
    ...(INTERNAL_ASSET_REFERENCE_IDEA_POOLS.FOLIAGE||[])
  ])];
  const dedupAssets=[
    ...registry.assets,
    ...foliagePool.map((ideaId,index)=>({
      id:'dedup-foliage-'+index,
      family:'FOLIAGE',
      category:'ENVIRONMENT',
      assetId:ideaId,
      subfamily:'TEST_EXISTING_IDENTITY'
    })),
    {
      id:'dedup-foliage-distinct-01',
      family:'FOLIAGE',
      category:'ENVIRONMENT',
      atomId:'FOLIAGE_DISTINCT_VARIATION_01',
      subfamily:'TEST_EXISTING_IDENTITY'
    }
  ];
  const dedupPlan=buildInternalAssetLibraryAutomationPlan({
    assets:dedupAssets,
    seedPlan:{ideas:[]},
    uiAtomIds:ui.atoms.map(row=>row.atomId)
  });
  const foliage=dedupPlan.domains.find(row=>row.domain==='FOLIAGE');
  assert.ok(foliage);
  assert.ok(foliage.suggestedIdeas.some(row=>row.source==='LOOSE_VOLUME_TARGET'));
  for(const ideaId of foliagePool)assert.equal(foliage.suggestedIdeas.some(row=>row.ideaId===ideaId),false,ideaId);
  assert.equal(foliage.suggestedIdeas.some(row=>row.ideaId==='FOLIAGE_DISTINCT_VARIATION_01'),false);
  assert.ok(foliage.suggestedIdeas.some(row=>row.ideaId==='FOLIAGE_DISTINCT_VARIATION_02'));
});

test('internal asset breadth profiles support simple-to-deep progression and quality-before-volume',()=>{
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.version,15);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityTargetInternalAuditScore,1000);
  assert.equal(INTERNAL_ASSET_LIBRARY_AUTOMATION_CONTRACT.qualityUpStartsOnlyAfterRecommendedVolume,false);

  assert.deepEqual(Object.keys(INTERNAL_PROGRESSION_COMPLEXITY_PROFILES),['VERY_SIMPLE','SURVIVAL_SIMPLE','DEEP_RPG']);
  assert.equal(selectInternalProgressionComplexityProfile({requested:'VERY_SIMPLE'}).id,'VERY_SIMPLE');
  assert.equal(selectInternalProgressionComplexityProfile({signals:['survival','crafting','perk']}).id,'SURVIVAL_SIMPLE');
  assert.equal(selectInternalProgressionComplexityProfile({signals:['rpg','d20','class','companion']}).id,'DEEP_RPG');

  for(const id of ['SURVIVAL_HOUSING_CONQUEST','MARITIME_TRADE_ECONOMY','CIVILIZATION_WORLD_EXPRESSION','RPG_RULES_CRAFTING_SKILL_STORY','SAMURAI_DYNASTY_WUXIA_STORY','EXPLORATION_EVENT_WORLD','MULTI_AXIS_PROGRESSION_GROWTH','GOTY_MOTION_MUSIC_RESPONSIVITY']){
    assert.ok(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES[id],id);
    assert.equal(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES[id].protectedExpressionCopyForbidden,true,id);
  }
  assert.ok(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES.SURVIVAL_HOUSING_CONQUEST.creatureEcology.speciesTarget>=60);
  assert.ok(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES.MARITIME_TRADE_ECONOMY.tradeItemCategoryTarget>=18);
  assert.ok(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES.RPG_RULES_CRAFTING_SKILL_STORY.skillLibrary.skillPresentationTarget>=180);
  assert.ok(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES.SAMURAI_DYNASTY_WUXIA_STORY.wuxiaSystems.skillCategories.length>=18);
  assert.ok(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES.EXPLORATION_EVENT_WORLD.eventFamilies.length>=24);
  assert.equal(INTERNAL_ASSET_REFERENCE_BREADTH_PROFILES.GOTY_MOTION_MUSIC_RESPONSIVITY.domainTargetMin.MOTION,200);
});

test('catalog-driven company asset registry synchronization is persistent only when requested and idempotent',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-asset-registry-sync-'));
  try{
    fs.mkdirSync(path.join(root,'assets','roblox','common-vfx-v1'),{recursive:true});
    fs.mkdirSync(path.join(root,'assets','roblox','common-ui-v1'),{recursive:true});
    fs.mkdirSync(path.join(root,'artbook-submissions','seed-demo'),{recursive:true});

    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[
        {id:'roblox-common-vfx-v1',packId:'roblox-common-vfx-v1',family:'VFX',category:'VFX',companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',assetCount:1,productionVerified:false},
        {id:'roblox-common-vfx-old-effect',packId:'roblox-common-vfx-v1',family:'VFX',category:'VFX',companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',atomId:'OLD_EFFECT',subfamily:'OLD_EFFECT',productionVerified:false},
        {id:'roblox-common-ui-v1',packId:'roblox-common-ui-v1',family:'UI',category:'UI',companyCommonBase:true,reuseScope:'COMPANY_ROBLOX_COMMON_BASE',assetCount:1,componentCount:1,productionVerified:false}
      ],
      commonLibrarySystemDepthAudit:{status:'EXPANDED',scoreIsUsageGate:false,existingAssetsRemainUsable:true,rows:[]}
    },null,2)+'\n');

    fs.writeFileSync(path.join(root,'assets','roblox','common-vfx-v1','catalog.json'),JSON.stringify({
      version:4,packId:'roblox-common-vfx-v1',family:'VFX',platform:'ROBLOX',title:'VFX demo',productionVerified:false,
      atoms:[
        {atomId:'IMPACT_FLASH',factory:'CreateImpactFlash',role:'HIT'},
        {atomId:'WEATHER_GUST_PULSE',factory:'CreateWeatherGustPulse',role:'WEATHER'}
      ],
      systemDepthContract:{currentDeclaredComponents:['HIT','WEATHER']}
    },null,2)+'\n');

    fs.writeFileSync(path.join(root,'assets','roblox','common-ui-v1','catalog.json'),JSON.stringify({
      version:9,packId:'roblox-common-ui-v1',family:'UI',platform:'ROBLOX',title:'UI demo',productionVerified:false,
      atoms:[
        {atomId:'INVENTORY_SLOT',factory:'CreateInventorySlot',role:'INVENTORY'},
        {atomId:'MAIN_MENU',factory:'CreateMainMenu',role:'MENU'}
      ],
      deepSystemContract:{componentCount:2}
    },null,2)+'\n');

    fs.writeFileSync(path.join(root,'artbook-submissions','seed-demo','current.json'),JSON.stringify({
      gameId:'seed-demo',gameName:'Demo',designCore:{coreFun:'combat survival',coreLoop:['combat','upgrade','boss'],signatureSystems:['action']}
    },null,2)+'\n');

    const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:true});
    assert.equal(first.changed,true);
    assert.equal(first.persisted,true);
    assert.equal(first.persistError,null);
    assert.equal(first.discoveredCatalogCount,2);
    assert.equal(first.seedCount,1);
    assert.equal(first.registry.assets.find(row=>row.id==='roblox-common-vfx-v1').assetCount,2);
    assert.equal(first.registry.assets.find(row=>row.id==='roblox-common-ui-v1').componentCount,2);
    assert.ok(first.registry.assets.some(row=>row.id==='roblox-common-vfx-impact-flash'));
    assert.ok(first.registry.assets.some(row=>row.id==='roblox-common-vfx-weather-gust-pulse'));
    const stale=first.registry.assets.find(row=>row.id==='roblox-common-vfx-old-effect');
    assert.ok(stale);
    assert.equal(stale.catalogState,'STALE_CATALOG_ROW_REVIEW');
    assert.equal(stale.automaticDeletionForbidden,true);
    assert.equal(first.registry.internalAssetLibraryAutomation.version,15);
    assert.equal(first.registry.internalAssetLibraryAutomation.autoRegistrySync,true);
    assert.ok(Array.isArray(first.registry.internalAssetLibraryAutomation.nextVolumeActions));
    assert.ok(first.registry.internalAssetLibraryAutomation.nextVolumeActions.length>0);
    assert.deepEqual(first.registry.internalAssetLibraryAutomation.nextVolumeActions,first.automationPlan.nextVolumeActions);
    assert.equal(first.registry.internalAssetLibraryAutomation.persistentWorklistField,'internalAssetLibraryAutomation.nextVolumeActions');
    assert.equal(first.registry.internalAssetLibraryAutomation.volumeActionConsumption,'PERSISTED_PRIORITY_WORKLIST_FIRST');
    assert.equal(first.registry.internalAssetLibraryAutomation.perDomainIdeaBudgetPerCycle,4096);
    assert.equal(first.registry.internalAssetLibraryAutomation.domainVolumeActionLimitPerDomain,512);
    assert.equal(first.registry.internalAssetLibraryAutomation.uiSubsystemVolumeActionLimitPerSubsystem,256);
    assert.equal(first.registry.internalAssetLibraryAutomation.maxVolumeWorklistActions,16384);
    assert.equal(first.registry.internalAssetLibraryAutomation.taskReferenceOverlayWorklistLimit,8192);
    assert.equal(first.registry.internalAssetLibraryAutomation.supplyDecisionSummaryActionLimit,2048);
    assert.equal(first.registry.internalAssetLibraryAutomation.freeSourceCandidateLimitPerAction,512);
    assert.deepEqual(first.registry.internalAssetLibraryAutomation.maintenanceListLimits,{
      semanticDuplicateReviewGroups:512,
      donorCandidates:1024,
      deltaTokens:4096,
      qualityActions:2048
    });
    assert.deepEqual(first.registry.internalAssetLibraryAutomation.reuseResolutionOrder,['REUSE_EXISTING','DERIVE_VARIANT','RECOMBINE_EXISTING','LICENSE_VERIFIED_FREE_SOURCE_ADAPT','NEW_AUTHORING']);
    assert.equal(first.registry.internalAssetLibraryAutomation.qualityUpPolicy.workingBandMin,980);
    assert.equal(first.registry.internalAssetLibraryAutomation.qualityUpPolicy.target,1000);
    assert.equal(first.registry.internalAssetLibraryAutomation.productionRuntimeVerificationSeparateFromInternalQuality,true);
    assert.equal(first.registry.internalAssetLibraryAutomation.styleExpressionRequiredForAllDomains,true);
    assert.equal(first.registry.internalAssetLibraryAutomation.autonomousContinuationRequired,true);
    assert.equal(first.registry.internalAssetLibraryAutomation.ownerPresenceRequired,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.humanPresenceRequired,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.chatgptPresenceRequired,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.autonomousOperatingContract.executionLane,'ASSET_DEVELOPMENT');
    assert.equal(first.registry.internalAssetLibraryAutomation.audioStudioBreadth.status,'ACTIVE_STUDIO_AUDIO_BREADTH');
    assert.equal(first.registry.internalAssetLibraryAutomation.audioStudioBreadth.roleTargetMin,180);
    assert.equal(first.registry.internalAssetLibraryAutomation.autonomousMaintenanceContract.status,'ACTIVE_SELF_MAINTAINING_LIBRARY');
    assert.equal(first.registry.internalAssetLibraryAutomation.maintenance.status,'SELF_MAINTENANCE_READY');
    assert.equal(first.registry.internalAssetLibraryAutomation.maintenance.continueWithoutHuman,true);
    assert.equal(first.registry.internalAssetLibraryAutomation.maintenance.continueWithoutChatgpt,true);
    assert.ok(first.registry.internalAssetLibraryAutomation.maintenance.inventoryFingerprint);
    assert.ok(first.registry.internalAssetLibraryAutomation.maintenance.typeRoleFingerprint);
    assert.ok(first.registry.internalAssetLibraryAutomation.maintenance.qualityFingerprint);
    assert.ok(['CONSUME_PRIORITY_WORKLIST_ACTION','REBUILD_VOLUME_WORKLIST','QUALITY_UP_1000'].includes(first.registry.internalAssetLibraryAutomation.autonomousNextAction.kind));
    assert.ok(first.registry.internalAssetLibraryAutomation.styleExpressionAxes.SURFACE_FEEL.includes('ROUGH'));
    assert.ok(first.registry.internalAssetLibraryAutomation.styleExpressionAxes.SURFACE_FEEL.includes('SOFT'));
    assert.ok(first.registry.internalAssetLibraryAutomation.styleExpressionDomainBindings.BUILDING.includes('MATERIAL_FINISH'));
    assert.ok(first.registry.internalAssetLibraryAutomation.styleExpressionDomainBindings.MOTION.includes('MOTION_ENERGY'));
    assert.ok(first.registry.internalAssetLibraryAutomation.nextVolumeActions.every(row=>row.styleExpressionAdaptationRequired===true));
    assert.equal(first.registry.internalAssetLibraryAutomation.autoDelete,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.hardMaximum,null);
    assert.equal(first.registry.internalAssetLibraryAutomation.overSoftLimitBlocksUse,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.workflowCreated,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.schedulerCreated,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.queueCreated,false);
    assert.equal(first.registry.internalAssetLibraryAutomation.pipelineCreated,false);

    const second=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:true});
    assert.equal(second.changed,false);
    assert.equal(second.persisted,false);
    assert.equal(second.registry.version,first.registry.version);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});


test('maintenance refresh uses current evidence file axes before cached registry scores',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-evidence-'));
  try{
    fs.mkdirSync(path.join(root,'assets'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets/evidence.json'),JSON.stringify({sourceAudit:{axes:{DETAIL_FINISH:0}}}));
    const registry={version:1,assets:[{id:'box',family:'PROP',platform:'ROBLOX',path:'assets/box.luau',internalAuditAxes:['DETAIL_FINISH'],internalAuditScore:1000,internalAuditEvidence:{DETAIL_FINISH:100},internalAuditEvidenceRef:'assets/evidence.json'}]};
    const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry,persist:false});
    const action=first.registry.internalAssetLibraryAutomation.nextQualityActions.find(row=>row.assetId==='box');
    assert.equal(action.weakestAxis,'DETAIL_FINISH');
    assert.equal(action.currentAxisScore,0);
    assert.equal(action.kind,'IMPROVE_ASSET_DETAIL');
    assert.equal(first.registry.internalAssetLibraryAutomation.maintenance.qualityDonorCandidates.find(row=>row.id==='box').quality,0);
    const second=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:first.registry,persist:false});
    assert.equal(second.changed,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('canonical company asset registry becomes dry-run idempotent after current source-consumer synchronization',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:false});
  const result=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:first.registry,persist:false});
  assert.equal(result.changed,false,JSON.stringify(result.changedSections));
  assert.deepEqual(result.changedSections,[]);
  assert.equal(result.persisted,false);
  assert.equal(result.persistError,null);
  assert.equal(result.registry.internalAssetLibraryAutomation.lastCatalogSynchronizedVersion,result.registry.version);
  assert.equal(result.registry.internalAssetLibraryAutomation.version,15);
  assert.ok(Array.isArray(result.registry.internalAssetLibraryAutomation.nextVolumeActions));
  assert.deepEqual(result.registry.internalAssetLibraryAutomation.nextVolumeActions,result.automationPlan.nextVolumeActions);
  assert.equal(result.registry.internalAssetLibraryAutomation.audioStudioBreadth.status,'ACTIVE_STUDIO_AUDIO_BREADTH');
  assert.equal(result.registry.internalAssetLibraryAutomation.audioStudioBreadth.roleTargetMin,180);
  assert.equal(result.registry.internalAssetLibraryAutomation.audioRoleContractCount,65);
  assert.equal(result.registry.internalAssetLibraryAutomation.eligibleFreeSourceCount,22);
  assert.equal(result.registry.internalAssetLibraryAutomation.freeSourceCatalogSufficiencyCount,12);
  assert.equal(result.registry.internalAssetLibraryAutomation.freeSourceCatalogReady,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.freeSourceCatalogExpansionMode,'PAUSED_UNTIL_REAL_COVERAGE_GAP');
  assert.equal(result.registry.internalAssetLibraryAutomation.primaryAttention,'QUALITY_AND_AUTOMATION_DETAIL_WITH_ON_DEMAND_GAP_FILL');
  assert.equal(result.registry.internalAssetLibraryAutomation.referenceImageIdeaOverlay.enabled,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.referenceImageIdeaOverlay.taskLocalOnly,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.referenceImageIdeaOverlay.persistentRegistryStorageForbidden,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.styleExpressionRequiredForAllDomains,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.autonomousContinuationRequired,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.ownerPresenceRequired,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.humanPresenceRequired,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.chatgptPresenceRequired,false);
  assert.deepEqual(result.registry.internalAssetLibraryAutomation.autonomousOperatingContract,result.automationPlan.autonomousOperatingContract);
  assert.deepEqual(result.registry.internalAssetLibraryAutomation.autonomousMaintenanceContract,result.automationPlan.autonomousMaintenanceContract);
  assert.equal(result.registry.internalAssetLibraryAutomation.maintenance.inventoryFingerprint,result.automationPlan.maintenance.inventoryFingerprint);
  assert.equal(result.registry.internalAssetLibraryAutomation.maintenance.typeRoleFingerprint,result.automationPlan.maintenance.typeRoleFingerprint);
  assert.equal(result.registry.internalAssetLibraryAutomation.maintenance.qualityFingerprint,result.automationPlan.maintenance.qualityFingerprint);
  assert.deepEqual(result.registry.internalAssetLibraryAutomation.autonomousNextAction,result.automationPlan.autonomousNextAction);
  assert.deepEqual(result.registry.internalAssetLibraryAutomation.styleExpressionDomainBindings,result.automationPlan.styleExpressionDomainBindings);
  assert.deepEqual(result.registry.internalAssetLibraryAutomation.styleExpressionAxes,result.automationPlan.styleExpressionAxes);
  assert.ok(result.registry.internalAssetLibraryAutomation.nextVolumeActions.every(row=>row.styleExpressionAdaptationRequired===true));
  assert.ok(result.registry.internalAssetLibraryAutomation.nextVolumeActions.every(row=>row.styleExpressionAxisIds.length>0));
  assert.equal(result.registry.internalAssetLibraryAutomation.actualVerifiedAudioAssetCount,0);
  assert.equal(result.registry.internalAssetLibraryAutomation.audioRoleVolumeSeparateFromVerifiedFileCount,true);
  assert.equal(result.registry.internalAssetLibraryAutomation.workflowCreated,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.schedulerCreated,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.queueCreated,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.pipelineCreated,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.wrapperCreated,false);
  assert.equal(result.registry.internalAssetLibraryAutomation.shadowSystemCreated,false);
});

// 실제 출시 게임 수요가 미사용 자산의 점수나 권장 수량보다 우선한다.
test('quality-first repairs current released Roblox assets before unused volume even below target counts',()=>{
 const assets=[
  {id:'unused',family:'CREATURE',platform:'ROBLOX',sourceFiles:['assets/unused.luau'],intendedConsumerGameIds:['live'],internalAuditScore:1},
  {id:'used',family:'CREATURE',platform:'ROBLOX',sourceFiles:['assets/used.luau'],consumerGameIds:['live'],internalAuditScore:900}
 ];
 const plan=buildInternalAssetLibraryAutomationPlan({assets,consumerGames:[{id:'live',lifecycleState:'ACTIVE',productionClass:'RELEASE_CONFIRMED'}]});
 assert.equal(plan.volumeReady,false);assert.equal(plan.focusPhase,'QUALITY_UP_1000');
 assert.equal(plan.autonomousNextAction.action.assetId,'used');
 assert.equal(plan.nextQualityActions.find(row=>row.assetId==='unused').consumerPriority,0);
 assert.equal(plan.productionPromotionAutomatic,false);
 assert.equal(buildInternalAssetLibraryAutomationPlan({assets:[]}).focusPhase,'VOLUME_UP');
});


test('current-consumer RPG menu is byte-identical with the reusable source and remains runtime-unverified',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const assetRoot=path.join(root,'assets','roblox','rpg-menu');
  const gameRoot=path.join(root,'roblox-games','daechung-rpg','shared');
  for(const name of ['RPGMenu.luau','RPGMenuModel.luau']){
    assert.equal(fs.readFileSync(path.join(assetRoot,name),'utf8'),fs.readFileSync(path.join(gameRoot,name),'utf8'),name);
  }
  const source=fs.readFileSync(path.join(assetRoot,'RPGMenu.luau'),'utf8');
  const model=fs.readFileSync(path.join(assetRoot,'RPGMenuModel.luau'),'utf8');
  assert.match(source,/local itemRows=\{\}/);
  assert.match(source,/GuiService\.SelectedObject=itemButtons\[selectedId\] or filterButtons\[category\]/);
  assert.match(model,/function Model\.partySummary\(attributes, config\)/);
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const asset=registry.assets.find(row=>row.id==='roblox-rpg-system-menu-v1');
  assert.ok(asset);
  assert.deepEqual(asset.consumerGameIds,['daechung-rpg']);
  assert.equal(asset.productionVerified,false);
  assert.equal(asset.verifiedCompanyReusable,false);
  assert.equal(asset.runtimeVerificationState,'PENDING_STUDIO');
  const quality=JSON.parse(fs.readFileSync(path.join(assetRoot,'quality-evidence.json'),'utf8'));
  assert.equal(quality.productionVerified,false);
  assert.equal(quality.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(quality.sourceAudit.evidenceBasis.currentConsumerCanonicalParity,true);
  assert.equal(quality.sourceAudit.claim,'SOURCE_AUTHORING_INTERNAL_ASSET_AUDIT_ONLY_NOT_RUNTIME_OR_PRODUCTION_PASS');
});


test('source-bound consumer sync maps project paths exact asset ids and managed StudioAssets without runtime promotion',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-consumer-sync-'));
  try{
    fs.mkdirSync(path.join(root,'roblox-games','horror-demo','client'),{recursive:true});
    fs.mkdirSync(path.join(root,'assets','roblox','world-ghosts'),{recursive:true});
    fs.mkdirSync(path.join(root,'assets','roblox','common-motion-v1'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets','roblox','world-ghosts','GhostSkinFactory.luau'),'return {}');
    fs.writeFileSync(path.join(root,'assets','roblox','common-motion-v1','RobloxCommonMotion.luau'),'return {}');
    fs.writeFileSync(path.join(root,'roblox-games','horror-demo','default.project.json'),JSON.stringify({
      tree:{ReplicatedStorage:{WorldGhostSkins:{GhostSkinFactory:{$path:'../../assets/roblox/world-ghosts/GhostSkinFactory.luau'}}}}
    }));
    fs.writeFileSync(path.join(root,'roblox-games','horror-demo','client','Game.client.luau'),[
      'local internalGhostSkinByCatalogId={YUREI="yurei"}',
      '-- STUDIO_ASSET_BINDING_BEGIN',
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local StudioAssets = { Families = { MOTION = { "WALK", "JOG" } } }',
      '-- STUDIO_ASSET_BINDING_END',
      'local usedMotion=table.find(studioAssetFamily("MOTION"),"WALK")'
    ].join('\n'));
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[{
      id:'horror-demo',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      robloxProjectPath:'roblox-games/horror-demo'
    }]}));
    const registry={version:1,assets:[
      {id:'roblox-world-ghost-skins-v1',packId:'roblox-world-ghost-skins-v1',family:'CREATURE',sourceFiles:['assets/roblox/world-ghosts/GhostSkinFactory.luau'],license:'project-original',consumerGameIds:[]},
      {id:'roblox-world-ghost-yurei',packId:'roblox-world-ghost-skins-v1',family:'CREATURE',skinId:'yurei',sourceFiles:['assets/roblox/world-ghosts/GhostSkinFactory.luau'],license:'project-original',consumerGameIds:[]},
      {id:'roblox-world-ghost-unused',packId:'roblox-world-ghost-skins-v1',family:'CREATURE',skinId:'unused',sourceFiles:['assets/roblox/world-ghosts/GhostSkinFactory.luau'],license:'project-original',consumerGameIds:[]},
      {id:'roblox-common-motion-v1',packId:'roblox-common-motion-v1',family:'MOTION',sourceFiles:['assets/roblox/common-motion-v1/RobloxCommonMotion.luau'],license:'project-original',consumerGameIds:[]},
      {id:'roblox-common-motion-walk',packId:'roblox-common-motion-v1',family:'MOTION',atomId:'WALK',bindingHint:{configCollection:'StudioAssets.Families.MOTION'},license:'project-original',consumerGameIds:['manual-game']},
      {id:'roblox-common-motion-jog',packId:'roblox-common-motion-v1',family:'MOTION',atomId:'JOG',bindingHint:{configCollection:'StudioAssets.Families.MOTION'},license:'project-original',consumerGameIds:[]}
    ]};
    const result=synchronizeSourceBoundAssetConsumers({repoRoot:root,registry,useCache:false});
    const byId=new Map(result.registry.assets.map(row=>[row.id,row]));
    assert.deepEqual(byId.get('roblox-world-ghost-skins-v1').sourceBoundConsumerGameIds,['horror-demo']);
    assert.deepEqual(byId.get('roblox-world-ghost-yurei').sourceBoundConsumerGameIds,['horror-demo']);
    assert.equal(byId.get('roblox-world-ghost-unused').sourceBoundConsumerGameIds,undefined);
    assert.deepEqual(byId.get('roblox-common-motion-walk').sourceBoundConsumerGameIds,['horror-demo']);
    assert.equal(byId.get('roblox-common-motion-jog').sourceBoundConsumerGameIds,undefined);
    assert.deepEqual(byId.get('roblox-common-motion-walk').consumerGameIds,['manual-game']);
    assert.equal(byId.get('roblox-common-motion-walk').productionVerified,undefined);
    assert.equal(result.summary.sourceOnlyDoesNotGrantRuntimeVerification,true);
    assert.equal(result.summary.runtimeVerificationUnchanged,true);
    assert.equal(result.summary.newQueueCreated,false);
    assert.equal(result.summary.newSchedulerCreated,false);
    assert.ok(result.summary.boundAssetCount>=3);
    assert.ok(result.summary.relationStates.ACTUAL_SOURCE_BOUND>=3);
    assert.ok(result.relations.some(row=>row.assetId==='roblox-common-motion-walk'&&row.gameId==='manual-game'&&row.classification==='CONFIRMED_CONSUMER'));
    assert.ok(result.bindings.some(row=>row.assetId==='roblox-world-ghost-yurei'&&row.mode==='PACK_PATH_AND_IDENTITY'));
    assert.ok(result.bindings.some(row=>row.assetId==='roblox-common-motion-walk'&&row.mode==='MANAGED_LIBRARY_IDENTITY'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('dynamic source consumers stay outside registry identity and refresh on the next planning cycle',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-consumer-overlay-'));
  try{
    fs.mkdirSync(path.join(root,'roblox-games','demo'),{recursive:true});
    fs.mkdirSync(path.join(root,'assets'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets','shared-a.luau'),'return {}');
    fs.writeFileSync(path.join(root,'assets','shared-b.luau'),'return {}');
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[{
      id:'demo',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',robloxProjectPath:'roblox-games/demo'
    }]}));
    const baseRegistry={version:7,assets:[
      {id:'shared-a',family:'PROP',platform:'ROBLOX',path:'assets/shared-a.luau',sourceFiles:['assets/shared-a.luau'],license:'project-original',internalAuditScore:700},
      {id:'shared-b',family:'PROP',platform:'ROBLOX',path:'assets/shared-b.luau',sourceFiles:['assets/shared-b.luau'],license:'project-original',internalAuditScore:700}
    ]};
    const baseline=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:baseRegistry,persist:false});
    fs.writeFileSync(path.join(root,'roblox-games','demo','default.project.json'),JSON.stringify({
      tree:{ReplicatedStorage:{Shared:{$path:'../../assets/shared-a.luau'}}}
    }));
    const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:baseline.registry,persist:false});
    assert.equal(first.changed,false,JSON.stringify(first.changedSections));
    assert.equal(first.registry.version,baseline.registry.version);
    assert.equal(first.registry.assets.find(row=>row.id==='shared-a').sourceBoundConsumerGameIds,undefined);
    assert.deepEqual(first.sourceConsumerRegistry.assets.find(row=>row.id==='shared-a').sourceBoundConsumerGameIds,['demo']);
    const staticAction=first.automationPlan.nextQualityActions.find(row=>row.assetId==='shared-a');
    const dynamicAction=first.executionAutomationPlan.nextQualityActions.find(row=>row.assetId==='shared-a');
    assert.equal(staticAction.consumerPriority,0);
    assert.equal(dynamicAction.consumerPriority,2);

    fs.writeFileSync(path.join(root,'roblox-games','demo','default.project.json'),JSON.stringify({
      tree:{ReplicatedStorage:{Shared:{$path:'../../assets/shared-b.luau'}}}
    }));
    const stale=synchronizeSourceBoundAssetConsumers({
      repoRoot:root,
      registry:first.sourceConsumerRegistry,
      gameCatalog:{games:[{id:'demo',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',robloxProjectPath:'roblox-games/demo'}]}
    });
    assert.equal(stale.registry.assets.find(row=>row.id==='shared-a').sourceBoundConsumerGameIds,undefined);
    assert.ok(stale.relations.some(row=>row.assetId==='shared-a'&&row.gameId==='demo'&&row.classification==='STALE_SOURCE_BINDING'));
    const second=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:baseline.registry,persist:false});
    assert.equal(second.changed,false,JSON.stringify(second.changedSections));
    assert.equal(second.sourceConsumerRegistry.assets.find(row=>row.id==='shared-a').sourceBoundConsumerGameIds,undefined);
    assert.deepEqual(second.sourceConsumerRegistry.assets.find(row=>row.id==='shared-b').sourceBoundConsumerGameIds,['demo']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('real horror-escape-room source fixture resolves project pack identity and managed motion without verification promotion',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const root=path.resolve(here,'..');
  const registry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
  const result=synchronizeSourceBoundAssetConsumers({
    repoRoot:root,
    registry,
    gameCatalog:{games:[{
      id:'horror-escape-room',
      lifecycleState:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',
      robloxProjectPath:'roblox-games/horror-escape-room'
    }]}
  });
  const byId=new Map(result.registry.assets.map(row=>[row.id,row]));
  const yurei=byId.get('roblox-world-ghost-yurei');
  const walk=byId.get('roblox-common-motion-walk');
  assert.ok(yurei);
  assert.ok(walk);
  assert.deepEqual(yurei.sourceBoundConsumerGameIds,['horror-escape-room']);
  assert.deepEqual(walk.sourceBoundConsumerGameIds,['horror-escape-room']);
  assert.ok(result.bindings.some(row=>
    row.assetId==='roblox-world-ghost-yurei'
    &&row.gameId==='horror-escape-room'
    &&row.classification==='ACTUAL_SOURCE_BOUND'
    &&row.bindingMode==='PACK_PATH_AND_IDENTITY'
    &&row.evidenceFiles.some(file=>file==='roblox-games/horror-escape-room/default.project.json')
    &&row.evidenceFiles.some(file=>file==='roblox-games/horror-escape-room/client/Game.client.luau')
  ));
  assert.ok(result.bindings.some(row=>
    row.assetId==='roblox-common-motion-walk'
    &&row.gameId==='horror-escape-room'
    &&row.classification==='ACTUAL_SOURCE_BOUND'
    &&row.bindingMode==='MANAGED_LIBRARY_IDENTITY'
  ));
  assert.equal(yurei.productionVerified,false);
  assert.equal(yurei.verifiedCompanyReusable,false);
  assert.equal(yurei.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(walk.productionVerified,false);
  assert.equal(walk.verifiedCompanyReusable,false);
  assert.equal(walk.runtimeVerificationState,'PENDING_STUDIO');
  assert.equal(result.summary.sourceOnlyDoesNotGrantRuntimeVerification,true);
  assert.equal(result.summary.productionVerificationUnchanged,true);
  assert.equal(result.summary.runtimeVerificationUnchanged,true);
  assert.equal(result.summary.gameSummaries[0].gameId,'horror-escape-room');
  assert.ok(result.summary.gameSummaries[0].currentConsumers>=2);
});

test('demand-bound asset supply uses five decisions and holds quantity-only library work',()=>{
  const registry={assets:[
    {id:'used-creature',family:'CREATURE',platform:'ROBLOX',status:'REPO_ASSET',license:'project-original',sourceBoundConsumerGameIds:['demo'],internalAuditScore:700},
    {id:'common-motion',family:'MOTION',platform:'SHARED',status:'REPO_ASSET',license:'project-original',internalAuditScore:900},
    {id:'intended-only-creature',family:'CREATURE',platform:'ROBLOX',status:'REPO_ASSET',license:'project-original',intendedConsumerGameIds:['demo'],internalAuditScore:980}
  ]};
  const summary=buildAssetSupplyDecisionSummary({
    gameId:'demo',
    target:'roblox',
    request:'몬스터 부족',
    registry,
    executionPlan:{
      nextQualityActions:[{assetId:'used-creature',family:'CREATURE',consumerGameIds:['demo'],sourceFiles:['assets/used-creature.luau']}],
      nextVolumeActions:[{domain:'BUILDING',ideaId:'BUILDING_DISTINCT_VARIATION_01'}]
    }
  });
  assert.deepEqual([...summary.decisionVocabulary],['USE','ADAPT','IMPROVE','AUTHOR','HOLD']);
  assert.equal(summary.currentConsumers,1);
  assert.equal(summary.intendedOnly,1);
  assert.ok(summary.requiredFamilies.includes('CREATURE'));
  assert.ok(summary.requiredFamilies.includes('MOTION'));
  assert.ok(summary.nextActions.some(row=>row.action==='IMPROVE'&&row.assetId==='used-creature'));
  assert.ok(summary.nextActions.some(row=>row.action==='ADAPT'&&row.assetId==='common-motion'));
  assert.ok(summary.nextActions.some(row=>row.action==='AUTHOR'&&['VFX','AUDIO'].includes(row.family)));
  assert.equal(summary.heldVolumeActionCount,1);
  assert.equal(summary.heldActions[0].action,'HOLD');
  assert.equal(summary.heldActions[0].reason,'REFERENCE_VOLUME_ONLY_NO_CURRENT_GAME_DEMAND');
  assert.equal(summary.volumeTargetsAdvisoryOnly,true);
  assert.equal(summary.safeWorkShortageMayLeaveSlotsIdle,true);
  assert.equal(summary.productionVerificationGranted,false);
  assert.equal(summary.runtimeVerificationGranted,false);
});
