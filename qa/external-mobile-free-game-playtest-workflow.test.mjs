import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

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
assert.match(text,/concurrency:[\s\S]*?group: external-mobile-fixed-worker[\s\S]*?cancel-in-progress: false/);
assert.doesNotMatch(text,/DEFER_TO_GAME_PRIMARY|DEFER_GAME_PRIMARY_QUEUE|queue_api|active_game_work|stale_revision_ids/);
assert.doesNotMatch(text,/actions\/runs\/\$\{stale_id\}\/cancel/);
assert.match(text,/runs-on:\s*ubuntu-24\.04-arm/);
assert.match(text,/external-mobile-free-playtest-hosted\.mjs/);
assert.match(text,/NATIVE_ARM64_ANDROID_READY=PASS/);
assert.match(text,/LOCAL_RUNNER_REQUIRED=NO/);
assert.doesNotMatch(text,/self-hosted/);
assert.doesNotMatch(text,/jaewoon-unity/);
assert.doesNotMatch(text,/runs-on:\s*\[.*Windows/);
assert.doesNotMatch(text,/needs:\s*gate/);
assert.match(text,/needs:\s*\[playtest\]/);
assert.match(text,/if: always\(\) && !cancelled\(\)/);
assert.match(text,/EXTERNAL_MOBILE_PRODUCTION_QUEUE_DEPENDENCY=NONE/);
assert.match(text,/name:\s*continuous refill/);
assert.match(text,/EXTERNAL_MOBILE_CONTINUOUS_REFILL=DISPATCHED/);
assert.match(text,/EXTERNAL_MOBILE_24H_CHAIN=ON/);
assert.doesNotMatch(text,/active_other|queue_api|newer_pending|running_other/);
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


const {performInput}=await import('../tools/external-mobile-free-playtest-hosted.mjs');
const commands=[];
const trace=await performInput('IDLE_RPG',{w:1000,h:2000},{
 execute:command=>{commands.push(command);return {status:commands.length===1?0:1};},
 observe:index=>({screenshotSha256:String(index+1).repeat(64),foreground:index===0}),wait:async()=>{}
});
assert.deepEqual(commands,['tap 450 1300','tap 350 1440']);
assert.equal(trace[0].inputDelivered,true);assert.equal(trace[1].inputDelivered,false);
assert.equal(trace[1].foreground,false);assert.equal(trace.length,2);
await assert.rejects(()=>performInput('RUNNER',{w:NaN,h:1}),/INPUT_SCREEN_SIZE_INVALID/);
console.log('PASS bounded black-box input trace preserves observed failures');

const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-blackbox-'));
try{
  const game=catalog.games[0];
  const summary={authority:'EXTERNAL_COMMERCIAL_RUNTIME_REFERENCE',practiceOnly:true,runtimePromotionAllowed:false,
    games:[{gameId:game.id,packageId:game.packageId,installPass:true,launchPass:true,foregroundPass:true,processAliveAfter:true,noCrash:true,
      visualChange:false,inputTrace:trace,observationScope:'APP_LAUNCH_AND_BOUNDED_INPUT_TRACE'},
      {gameId:catalog.games[1].id,installPass:true,launchPass:false,foregroundPass:true,processAliveAfter:true,noCrash:true}]};
  const results=path.join(root,'summary.json'),out=path.join(root,'samples');
  fs.writeFileSync(results,JSON.stringify(summary));
  const result=spawnSync(process.execPath,['tools/vibe2-external-gameplay-distill.mjs','--manifest','company-learning/external-game-playtest/mobile-free-seed-games.json','--results',results,'--out',out],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(fs.readdirSync(out).length,1);
  const sample=JSON.parse(fs.readFileSync(path.join(out,fs.readdirSync(out)[0]),'utf8'));
  assert.equal(sample.measuredInputCount,1);
  assert.match(sample.input,/deliveredInputs=1\/2; implementationVerified=NO/);
  assert.equal(sample.provenance.inputTrace[1].inputDelivered,false);
  assert.equal(sample.provenance.codeExtracted,false);
  assert.equal(sample.runtimePromotionAllowed,false);
  assert.equal(sample.implementationInferenceVerified,false);
  assert(sample.unmeasured.includes('PHYSICS_PARAMETERS'));
  assert(sample.unmeasured.includes('ANIMATION_CURVES'));
  assert.match(sample.output,/독립 설계 제안/);
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log('PASS distillation binds observed inputs and does not promote inferred motion or physics');
