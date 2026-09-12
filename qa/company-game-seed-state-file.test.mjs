import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';

const stateFile='game-seed-state.json';
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

test('persisted GAME_SEED state is either absent before bootstrap or policy-valid',t=>{
  if(!fs.existsSync(stateFile)){t.skip('GAME_SEED bootstrap has not persisted state yet');return;}
  const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  assert.equal(state.policyDocument,'COMPANY_FLOW.md');
  assert.ok(Array.isArray(state.seeds));
  assert.ok(Array.isArray(state.vacancies));
  if(state.bootstrapCompletedAt){
    const initial=state.seeds.filter(s=>s.generation==='INITIAL_BOOTSTRAP');
    assert.equal(initial.length,directive.gameSeed.bootstrap.count);
    assert.deepEqual(new Set(initial.map(s=>s.GAME_CATEGORY)),new Set(directive.gameSeed.bootstrap.categories));
    assert.ok(initial.every(s=>GAME_SEED_POLICY.allowedTargetPlatforms.includes(String(s.INITIAL_TARGET_PLATFORM||'').trim().toUpperCase())),'historical bootstrap seeds must be normalized to a currently allowed target platform');
    assert.ok(initial.every(s=>typeof s.INITIAL_PLAY_MODE==='string'&&s.INITIAL_PLAY_MODE.trim().length>0),'historical bootstrap seeds keep a project-defined play mode');
    assert.ok(initial.every(s=>typeof s.CROSS_PLATFORM_EXPANSION_VALUE==='string'&&s.CROSS_PLATFORM_EXPANSION_VALUE.trim().length>0),'historical bootstrap seeds must carry cross-platform expansion value after normalization');
    assert.ok(initial.every(s=>s.SOURCE_CODE_RULE==='OWN_IMPLEMENTATION_ONLY'));
  }
  for(const seed of state.seeds.filter(s=>String(s?.status||'').toUpperCase()==='ACTIVE')){
    const result=validateGameSeed(seed);
    assert.equal(result.pass,true,`active GAME_SEED must satisfy current COMPANY_FLOW contract: ${seed.seedId||seed.gameId||'unknown'}\n${result.errors.join('\n')}`);
  }
  for(const vacancy of state.vacancies){
    if(vacancy.replacementSeedId)assert.ok(vacancy.filledAt,'filled vacancy needs filledAt');
  }
});
