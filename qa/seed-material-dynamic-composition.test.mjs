import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SEED_MATERIAL_DYNAMIC_SIGNALS,
  normalizeSeedState,
  ensureSeedMaterialPool,
  resolveSeedMaterialCompositionCount,
  composeSeedMaterials,
} from '../tools/game-seed-state.mjs';

function freshState(){
  const state=normalizeSeedState({seeds:[],seedMaterials:[],seedMaterialLearning:{}});
  ensureSeedMaterialPool(state,{timestamp:'2026-09-14T00:00:00.000Z'});
  return state;
}

test('dynamic composition defaults to three materials when no strong context signal exists',()=>{
  const state=freshState();
  const count=resolveSeedMaterialCompositionCount(state,{platform:'ROBLOX',category:'PUZZLE',top30GameIds:[],learningSignals:{}});
  assert.equal(count,3);
});

test('strong validated learning fit can simplify a clean concept to two complementary materials',()=>{
  const state=freshState();
  const signals={preferFamilies:['REAL_JOB_INDUSTRY_LIFE','SYSTEM_MECHANIC_EXPERIMENT'],avoidFamilies:[]};
  const count=resolveSeedMaterialCompositionCount(state,{platform:'ROBLOX',category:'PUZZLE',top30GameIds:[],learningSignals:signals});
  assert.equal(count,2);
  const selected=composeSeedMaterials(state,{platform:'ROBLOX',category:'PUZZLE',top30GameIds:[],learningSignals:signals,timestamp:'2026-09-14T00:01:00.000Z'});
  assert.equal(selected.length,2);
  assert.equal(new Set(selected.map(row=>row.sourceFamily)).size,2);
  assert.ok(selected.some(row=>signals.preferFamilies.includes(row.sourceFamily)));
});

test('Top30 category saturation expands composition to four materials for differentiation',()=>{
  const state=freshState();
  state.seeds.push(
    {seedId:'S1',gameId:'top-a',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE',SEED_MATERIAL_IDS:['MAT-001','MAT-002']},
    {seedId:'S2',gameId:'top-b',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE',SEED_MATERIAL_IDS:['MAT-003','MAT-004']},
    {seedId:'S3',gameId:'top-c',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX',status:'ACTIVE',SEED_MATERIAL_IDS:['MAT-005','MAT-006']},
  );
  const top30GameIds=['top-a','top-b','top-c'];
  const count=resolveSeedMaterialCompositionCount(state,{platform:'ROBLOX',category:'PUZZLE',top30GameIds,learningSignals:{}});
  assert.equal(count,4);
  const selected=composeSeedMaterials(state,{platform:'ROBLOX',category:'PUZZLE',top30GameIds,learningSignals:{},timestamp:'2026-09-14T00:02:00.000Z'});
  assert.equal(selected.length,4);
  assert.equal(state.seedMaterialPolicy.lastComposition.mode,undefined);
  assert.equal(state.seedMaterialPolicy.lastComposition.count,4);
  assert.equal(state.seedMaterialPolicy.lastComposition.top30ReferenceCount,3);
  assert.deepEqual(state.seedMaterialPolicy.lastComposition.signals,[...SEED_MATERIAL_DYNAMIC_SIGNALS]);
});

test('material ranking strongly avoids learned bad families and records auditable selection metadata',()=>{
  const state=freshState();
  const selected=composeSeedMaterials(state,{
    count:3,
    platform:'UNITY',
    category:'CASUAL',
    top30GameIds:[],
    learningSignals:{preferFamilies:['FREE_ORIGINAL_IDEA'],avoidFamilies:['SUCCESSFUL_GAME_STRUCTURE']},
    timestamp:'2026-09-14T00:03:00.000Z',
  });
  assert.equal(selected.length,3);
  assert.ok(selected.some(row=>row.sourceFamily==='FREE_ORIGINAL_IDEA'));
  assert.ok(selected.every(row=>row.sourceFamily!=='SUCCESSFUL_GAME_STRUCTURE'));
  assert.equal(state.seedMaterialPolicy.lastComposition.platform,'UNITY');
  assert.equal(state.seedMaterialPolicy.lastComposition.category,'CASUAL');
});

test('bootstrap no longer fixes three materials or six categories as the ongoing production lane',()=>{
  const bootstrap=fs.readFileSync('tools/company-game-seed-bootstrap.mjs','utf8');
  const stateTool=fs.readFileSync('tools/game-seed-state.mjs','utf8');
  assert.doesNotMatch(bootstrap,/composeSeedMaterials\(state,\{count:3/);
  assert.doesNotMatch(bootstrap,/state\.categories=historicalCategories/);
  assert.match(bootstrap,/resolveSeedMaterialCompositionCount/);
  assert.match(bootstrap,/representativeCategoriesForPlatform/);
  assert.match(bootstrap,/GAME_SEED_TOP30_MANIFEST/);
  assert.match(bootstrap,/DYNAMIC_CONTEXTUAL_2_TO_4/);
  assert.match(bootstrap,/HISTORICAL_BASELINE_AND_FALLBACK_ONLY/);
  assert.match(stateTool,/TARGET_PLATFORM_FIT/);
  assert.match(stateTool,/MATERIAL_COMPLEMENTARITY/);
  assert.match(stateTool,/VALIDATED_LEARNING_OUTCOME/);
  assert.match(stateTool,/TOP30_DIFFERENTIATION/);
});
