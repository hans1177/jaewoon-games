import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSeedState,ensureSeedMaterialPool,composeSeedMaterials,SEED_MATERIAL_POOL_TARGET} from '../tools/game-seed-state.mjs';
import {validateGameSeed,GAME_SEED_POLICY,GAME_SEED_REQUIRED_FIELDS} from '../tools/company-game-seed-contract.mjs';

test('starter material cache remains available but is not a creative cap',()=>{
  const state=normalizeSeedState({seeds:[]});
  ensureSeedMaterialPool(state,{timestamp:'2026-09-13T00:00:00Z'});
  assert.equal(SEED_MATERIAL_POOL_TARGET,100);
  assert.equal(state.seedMaterialPolicy.materialIsGame,false);
  assert.equal(state.seedMaterialPolicy.targetCount,null);
  assert.equal(state.seedMaterialPolicy.combineMin,null);
  assert.equal(state.seedMaterialPolicy.combineMax,null);
  assert.equal(composeSeedMaterials(state,{count:0}).length,0);
});

test('GAME_SEED is optional guidance and does not enforce creative counts duration or multiplayer form',()=>{
  assert.equal(GAME_SEED_POLICY.guidanceOnly,true);
  assert.equal(GAME_SEED_POLICY.requiredBeforeDesignerDraft,false);
  assert.equal(GAME_SEED_POLICY.creativeConstraints,'NONE');
  assert.equal(GAME_SEED_POLICY.seedMaterialPoolTarget,null);
  assert.equal(GAME_SEED_POLICY.seedMaterialCombineMin,null);
  assert.equal(GAME_SEED_POLICY.seedMaterialCombineMax,null);
  assert.equal(GAME_SEED_POLICY.targetSessionMinutes,null);
  assert.deepEqual([...GAME_SEED_REQUIRED_FIELDS],[]);
  const seed={SEED_MATERIAL_IDS:[],TARGET_SESSION_MINUTES:7,MULTIPLAYER_DESIGN_MODE:'VIBE_DEFINED_NEW_MODE',MARKET_EVIDENCE_SUMMARY:{}};
  assert.equal(validateGameSeed(seed).pass,true);
  assert.equal(validateGameSeed({...seed,COPY_SOURCE_CODE:true}).pass,false);
});
