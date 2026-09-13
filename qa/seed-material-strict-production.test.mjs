import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSeedState,ensureSeedMaterialPool,composeSeedMaterials,consumeSeedMaterials,
  SEED_MATERIAL_POOL_TARGET,SEED_MATERIAL_SOURCE_FAMILIES
} from '../tools/game-seed-state.mjs';
import {validateGameSeed,GAME_SEED_POLICY} from '../tools/company-game-seed-contract.mjs';

test('seed material pool stays at 100 and material is not a game',()=>{
  const state=normalizeSeedState({seeds:[]});
  ensureSeedMaterialPool(state,{timestamp:'2026-09-13T00:00:00Z'});
  assert.equal(SEED_MATERIAL_POOL_TARGET,100);
  assert.equal(state.seedMaterialPolicy.materialIsGame,false);
  assert.equal(state.seedMaterials.filter(x=>x.status==='AVAILABLE').length,100);
  assert.equal(new Set(state.seedMaterials.map(x=>x.sourceFamily)).size,SEED_MATERIAL_SOURCE_FAMILIES.length);
  const selected=composeSeedMaterials(state,{count:3});
  assert.equal(selected.length,3);
  consumeSeedMaterials(state,selected,{seedId:'SEED-TEST'});
  assert.ok(state.seedMaterials.filter(x=>x.status==='AVAILABLE'||x.status==='RESERVED').length>=100);
});

test('new game seed contract requires 30 minute target and multiplayer decision',()=>{
  const seed={
    GAME_CATEGORY:'CASUAL',REFERENCE_INPUTS:[{type:'ORIGINAL_MATERIAL',value:'weather'}],REFERENCE_GAMES:[],
    CORE_FUN_TO_LEARN:['risk/reward choice'],CORE_LOOP:['행동하고 즉시 결과를 확인한다','보상으로 다음 선택을 고른다','선택으로 상황이 변하고 다시 행동한다'],
    DISTINCT_IDENTITY:'A sufficiently distinct original identity that combines weather, routing, and cooperative decisions into its own world and progression.',
    MARKET_EVIDENCE_SUMMARY:{role:'TARGET_DESIGN_REFERENCE'},TARGET_AUDIENCE:'Global players',
    TARGET_SESSION_DIRECTION:'0~5분 이해, 5~15분 핵심루프, 15~25분 변주, 25~30분 중간목표',TARGET_SESSION_MINUTES:30,
    INITIAL_TARGET_PLATFORM:'ROBLOX',INITIAL_PLAY_MODE:'PROJECT_DEFINED',MULTIPLAYER_DESIGN_MODE:'COOP',CROSS_PLATFORM_EXPANSION_VALUE:'POSSIBLE'
  };
  assert.equal(GAME_SEED_POLICY.targetSessionMinutes,30);
  assert.equal(validateGameSeed(seed).pass,true);
  assert.equal(validateGameSeed({...seed,TARGET_SESSION_MINUTES:10}).pass,false);
  assert.equal(validateGameSeed({...seed,MULTIPLAYER_DESIGN_MODE:'LATER'}).pass,false);
});
