// 파일명: qa/studio-asset-ai-120.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDIO_ASSET_QUALITY_MAX,
  STUDIO_ASSET_QUALITY_WEIGHTS,
  scoreStudioAssetQuality120,
  buildStudioAssetLoadout,
  buildStudioAssetQuality120Program,
  evaluateCompanyAssetPromotion
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
