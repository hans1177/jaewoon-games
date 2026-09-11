import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
    assert.ok(initial.every(s=>s.INITIAL_TARGET_PLATFORM==='ANDROID_MOBILE'));
    assert.ok(initial.every(s=>s.INITIAL_PLAY_MODE==='SINGLE_PLAYER'));
    assert.ok(initial.every(s=>s.SOURCE_CODE_RULE==='OWN_IMPLEMENTATION_ONLY'));
  }
  for(const vacancy of state.vacancies){
    if(vacancy.replacementSeedId)assert.ok(vacancy.filledAt,'filled vacancy needs filledAt');
  }
});
