import assert from 'node:assert/strict';
import fs from 'node:fs';

const file='.github/workflows/external-mobile-free-game-playtest.yml';
const text=fs.readFileSync(file,'utf8');
const catalog=JSON.parse(fs.readFileSync('company-learning/external-game-playtest/mobile-free-seed-games.json','utf8'));
const count=value=>text.split(value).length-1;

assert.equal(count('name: Resolve rotating Google Play batch'),1);
assert.equal(count('name: Verify commercial reference policy'),1);
assert.equal(count('name: Download from Google Play delivery and black-box playtest'),1);
assert.equal(count('name: Distill runtime behavior into Unity implementation judgment'),1);
assert.equal(count('TRANSFORMATIVE_RECOMBINATION_INPUT=DERIVED_RUNTIME_FEATURES_ONLY'),1);
assert.match(text,/cron:\s*'43 \* \* \* \*'/);
assert.match(text,/--start-index \"?\$PLAYTEST_START_INDEX\"?/);
assert.match(text,/max_games must be an integer from 1 to 12/);
assert.match(text,/start_index must be auto or a non-negative integer/);
assert.match(text,/PLAYTEST_MAX_GAMES='?\+max|PLAYTEST_MAX_GAMES=\$max|PLAYTEST_MAX_GAMES=/);
assert.match(text,/PLAYTEST_START_INDEX='?\+start|PLAYTEST_START_INDEX=\$start|PLAYTEST_START_INDEX=/);
assert.match(text,/OFFICIAL_GOOGLE_PLAY_ONLY/);
assert.match(text,/CODE_EXTRACTION_ALLOWED:\s*'NO'/);
assert.match(text,/actions:\s*write/);
assert.doesNotMatch(text,/^concurrency:\s*$/m);
assert.match(text,/name:\s*Keep exactly one active Google Play study run/);
assert.match(text,/EXTERNAL_MOBILE_GATE=DEFER_TO_SAME_REVISION_ACTIVE_RUN/);
assert.match(text,/EXTERNAL_MOBILE_GATE=RUN/);
assert.match(text,/EXTERNAL_MOBILE_CANCEL_STALE_REVISION/);
assert.match(text,/actions\/runs\/\$\{stale_id\}\/cancel/);
assert.match(text,/status=="in_progress".*status=="waiting"/s);
assert.match(text,/runs-on:\s*ubuntu-24\.04-arm/);
assert.match(text,/external-mobile-free-playtest-hosted\.mjs/);
assert.match(text,/NATIVE_ARM64_ANDROID_READY=PASS/);
assert.match(text,/LOCAL_RUNNER_REQUIRED=NO/);
assert.doesNotMatch(text,/self-hosted/);
assert.doesNotMatch(text,/jaewoon-unity/);
assert.doesNotMatch(text,/runs-on:\s*\[.*Windows/);
assert.match(text,/\.id > \$current/);
assert.match(text,/needs:\s*gate/);
assert.match(text,/needs:\s*\[gate, playtest\]/);
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
