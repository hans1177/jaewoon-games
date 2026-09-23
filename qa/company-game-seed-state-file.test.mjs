import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GAME_SEED_POLICY,validateGameSeed} from '../tools/company-game-seed-contract.mjs';
import {normalizeSeedState,validatePortfolioSeedRequest,pendingPortfolioSeedRequests,ensureSeedMaterialPool} from '../tools/game-seed-state.mjs';

const stateFile='game-seed-state.json';
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));
const semanticNormalize=fs.readFileSync('tools/company-game-seed-semantic-normalize.mjs','utf8');

test('GAME_SEED normalization removes all legacy vacancy replacement state',()=>{
  const state=normalizeSeedState({
    vacancies:[{id:'VAC-LEGACY'}],
    seeds:[{seedId:'S1',gameId:'G1',replacementOfSeedId:'S0',replacementVacancyId:'VAC-LEGACY'}],
    portfolioSeedRequests:[{id:'R1',linkedVacancyId:'VAC-LEGACY'}],
  });
  assert.equal('vacancies' in state,false);
  assert.equal('replacementOfSeedId' in state.seeds[0],false);
  assert.equal('replacementVacancyId' in state.seeds[0],false);
  assert.equal('linkedVacancyId' in state.portfolioSeedRequests[0],false);
});

test('semantic normalizer persists state through central GAME_SEED normalization and maintains seed materials',()=>{
  assert.match(semanticNormalize,/import \{normalizeSeedState,ensureSeedMaterialPool\} from '\.\/game-seed-state\.mjs'/);
  assert.match(semanticNormalize,/const state=normalizeSeedState\(readJson\(stateFile,\{seeds:\[\]\}\)\)/);
  assert.match(semanticNormalize,/ensureSeedMaterialPool\(state\)/);
  assert.match(semanticNormalize,/SEED_MATERIAL_POOL_TARGET=/);
  assert.match(semanticNormalize,/TARGET_SESSION_MINUTES=30/);
  assert.match(semanticNormalize,/MULTIPLAYER_DECISION_STAGE=DESIGN/);
  assert.match(semanticNormalize,/GAME_SEED_STATE_NORMALIZATION_PERSISTED=YES/);
});

test('seed material pool normalizes to 100 materials',()=>{
  const state=normalizeSeedState({seeds:[]});
  ensureSeedMaterialPool(state,{timestamp:'2026-09-13T00:00:00Z'});
  assert.equal(state.seedMaterialPolicy.targetCount,100);
  assert.equal(state.seedMaterials.length,100);
});

test('persisted GAME_SEED state follows current central machine policy contract',t=>{
  if(!fs.existsSync(stateFile)){t.skip('GAME_SEED bootstrap has not persisted state yet');return;}
  const raw=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  const state=normalizeSeedState(raw);
  assert.equal(state.policyAuthority,'company-learning/platform-release-roadmap.json');
  assert.equal('policyDocument' in state,false);
  assert.ok(Array.isArray(state.seeds));
  assert.equal('vacancies' in state,false,'legacy vacancy state must be removed by normalization');
  assert.ok(state.seeds.every(seed=>!('replacementOfSeedId' in seed)&&!('replacementVacancyId' in seed)),'seeds must not carry legacy vacancy replacement links');
  assert.ok(Array.isArray(state.portfolioSeedRequests));
  assert.ok(state.portfolioSeedRequests.every(request=>!('linkedVacancyId' in request)),'portfolio expansion requests must not carry legacy vacancy links');

  if(state.bootstrapCompletedAt){
    const initial=state.seeds.filter(seed=>['INITIAL_BOOTSTRAP','HISTORICAL_INITIAL_BOOTSTRAP'].includes(seed.generation));
    assert.equal(initial.length,directive.gameSeed.bootstrap.count,'historical initial batch remains six records');
    assert.deepEqual(new Set(initial.map(seed=>seed.GAME_CATEGORY)),new Set(directive.gameSeed.bootstrap.categories));
    assert.ok(initial.every(seed=>GAME_SEED_POLICY.allowedTargetPlatforms.includes(String(seed.INITIAL_TARGET_PLATFORM||'').trim().toUpperCase())));
    assert.ok(initial.every(seed=>typeof seed.INITIAL_PLAY_MODE==='string'&&seed.INITIAL_PLAY_MODE.trim().length>0));
    assert.ok(initial.every(seed=>typeof seed.CROSS_PLATFORM_EXPANSION_VALUE==='string'&&seed.CROSS_PLATFORM_EXPANSION_VALUE.trim().length>0));
    assert.ok(initial.every(seed=>seed.SOURCE_CODE_RULE==='OWN_IMPLEMENTATION_ONLY'));
  }

  for(const seed of state.seeds.filter(seed=>String(seed?.status||'').toUpperCase()==='ACTIVE')){
    const result=validateGameSeed(seed);
    assert.equal(result.pass,true,`active GAME_SEED must satisfy current central GAME_SEED contract: ${seed.seedId||seed.gameId||'unknown'}\n${result.errors.join('\n')}`);
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
