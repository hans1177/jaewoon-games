// 파일명: qa/studio-asset-ai-120.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDIO_ASSET_QUALITY_MAX,
  STUDIO_ASSET_QUALITY_WEIGHTS,
  createAssetDNA,
  createStudioAssetFamilyPlan,
  scoreStudioAssetQuality120,
  buildStudioAssetLoadout,
  buildStudioAssetQuality120Program,
  buildAutonomousAssetGapFillPlan,
  evaluateCompanyAssetPromotion,
  summarizeVerifiedAssetUsage
} from '../assets/vibe-studio-asset-universe.js';

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
