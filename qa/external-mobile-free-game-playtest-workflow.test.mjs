import assert from 'node:assert/strict';
import fs from 'node:fs';

const file='.github/workflows/external-mobile-free-game-playtest.yml';
const text=fs.readFileSync(file,'utf8');
const catalog=JSON.parse(fs.readFileSync('company-learning/external-game-playtest/mobile-free-seed-games.json','utf8'));
const count=value=>text.split(value).length-1;

assert.equal(count('name: Resolve rotating Google Play batch'),1);
assert.equal(count('name: Verify seed-derived commercial reference policy'),1);
assert.equal(count('name: Install and black-box playtest free mobile reference game'),1);
assert.equal(count('name: Distill runtime behavior into Unity implementation judgment'),1);
assert.equal(count('TRANSFORMATIVE_RECOMBINATION_INPUT=DERIVED_RUNTIME_FEATURES_ONLY'),1);
assert.match(text,/cron:\s*'43 \* \* \* \*'/);
assert.match(text,/-StartIndex \(\[int\]\$env:PLAYTEST_START_INDEX\)/);
assert.match(text,/\[int\]::TryParse\(\$maxRaw, \[ref\]\$max\)/);
assert.match(text,/\[int\]::TryParse\(\$requestedStart, \[ref\]\$parsedStart\)/);
assert.match(text,/PLAYTEST_MAX_GAMES=\$max/);
assert.match(text,/PLAYTEST_START_INDEX=\$start/);
assert.match(text,/OFFICIAL_GOOGLE_PLAY_ONLY/);
assert.match(text,/CODE_EXTRACTION_ALLOWED:\s*'NO'/);
assert.match(text,/actions:\s*write/);
assert.match(text,/name:\s*continuous refill/);
assert.match(text,/EXTERNAL_MOBILE_CONTINUOUS_REFILL=DISPATCHED/);
assert.match(text,/EXTERNAL_MOBILE_24H_CHAIN=ON/);
assert.match(text,/workflow_runs\[\].*queued.*in_progress/s);
assert.match(text,/external-mobile-free-game-playtest\.yml\/dispatches/);
assert.equal(catalog.games.length,27);
assert(new Set(catalog.games.map(game=>game.category)).size>=20);
for(const category of ['RACING','SPORTS_FOOTBALL','FPS_TACTICAL','TOWER_DEFENSE','CITY_BUILDER_SIMULATION','FARM_COZY','SOCIAL_PARTY','SANDBOX_SOCIAL','RHYTHM']){
  assert(catalog.games.some(game=>game.category===category),`missing genre ${category}`);
}
assert.equal(catalog.rotationPolicy.continuousRefill,true);
assert.equal(catalog.rotationPolicy.mode,'CONTINUOUS_CHAIN_PLUS_HOURLY_SAFETY_NET');
assert.equal(catalog.learningPolicy.runtimeSamplePersistsToCanonicalLearning,true);
assert.equal(catalog.learningPolicy.recombinationMemoryRefresh,true);

console.log('PASS Google Play 24H workflow rotates expanded genres and continuously refills');
