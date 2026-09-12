import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';
import {normalizeSeedState,validatePortfolioSeedRequest,pendingPortfolioSeedRequests} from '../tools/game-seed-state.mjs';

const stateFile='game-seed-state.json';
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

test('persisted GAME_SEED state follows current COMPANY_FLOW dynamic portfolio contract',t=>{
  if(!fs.existsSync(stateFile)){t.skip('GAME_SEED bootstrap has not persisted state yet');return;}
  const state=normalizeSeedState(JSON.parse(fs.readFileSync(stateFile,'utf8')));
  assert.equal(state.policyDocument,'COMPANY_FLOW.md');
  assert.ok(Array.isArray(state.seeds));
  assert.ok(Array.isArray(state.vacancies));
  assert.ok(Array.isArray(state.portfolioSeedRequests));

  if(state.bootstrapCompletedAt){
    const initial=state.seeds.filter(seed=>seed.generation==='INITIAL_BOOTSTRAP');
    assert.equal(initial.length,directive.gameSeed.bootstrap.count,'historical initial batch remains six records');
    assert.deepEqual(new Set(initial.map(seed=>seed.GAME_CATEGORY)),new Set(directive.gameSeed.bootstrap.categories));
    assert.ok(initial.every(seed=>GAME_SEED_POLICY.allowedTargetPlatforms.includes(String(seed.INITIAL_TARGET_PLATFORM||'').trim().toUpperCase())));
    assert.ok(initial.every(seed=>typeof seed.INITIAL_PLAY_MODE==='string'&&seed.INITIAL_PLAY_MODE.trim().length>0));
    assert.ok(initial.every(seed=>typeof seed.CROSS_PLATFORM_EXPANSION_VALUE==='string'&&seed.CROSS_PLATFORM_EXPANSION_VALUE.trim().length>0));
    assert.ok(initial.every(seed=>seed.SOURCE_CODE_RULE==='OWN_IMPLEMENTATION_ONLY'));
  }

  for(const seed of state.seeds.filter(seed=>String(seed?.status||'').toUpperCase()==='ACTIVE')){
    const result=validateGameSeed(seed);
    assert.equal(result.pass,true,`active GAME_SEED must satisfy current COMPANY_FLOW contract: ${seed.seedId||seed.gameId||'unknown'}\n${result.errors.join('\n')}`);
  }

  for(const request of state.portfolioSeedRequests){
    if(request.status==='PENDING'&&!request.fulfilledAt&&!request.cancelledAt){
      const result=validatePortfolioSeedRequest(request);
      assert.equal(result.pass,true,`pending portfolio request must be score/evidence valid: ${request.id}\n${result.errors.join('\n')}`);
    }
  }

  assert.doesNotThrow(()=>pendingPortfolioSeedRequests(state));
  assert.equal(directive.gameSeed.replenishment.oneForOneOnly,false);
  assert.equal(directive.gameSeed.bootstrap.categoriesAreReferenceSetNotSlotQuota,true);
});
