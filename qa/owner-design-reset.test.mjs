import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ensureOwnerDesignResetSeed,materializeOwnerDesignResetSeeds} from '../tools/owner-design-reset.mjs';

test('active owner reset seeds stay DESIGN_ONLY inputs even when catalog development has already started',()=>{
  const queue=JSON.parse(fs.readFileSync('owner-design-reset-queue.json','utf8'));
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const active=(queue.requests||[]).filter(row=>String(row?.status||'').toUpperCase()==='ACTIVE');
  assert.ok(active.length>0);
  const promoted=[];
  for(const request of active){
    assert.ok(request.gameId);
    assert.ok(request.seed);
    assert.equal(request.seed.status,'ACTIVE');
    assert.equal(request.seed.productionClass,'DESIGN_ONLY');
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.role,'VALIDATION_SURFACE_ONLY');
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.canonicalSourceRoot,`unity-games/${request.gameId}`);
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.outputRoot,`web-games/${request.gameId}`);
    assert.equal(request.seed.UNITY_WEB_VALIDATION_SURFACE?.legacyDirectWebAuthoring,false);
    const game=(catalog.games||[]).find(row=>row.id===request.gameId);
    if(game?.productionClass==='DEVELOPMENT_CONFIRMED')promoted.push(request.gameId);
  }
  assert.ok(promoted.length>0,'parallel strict-design review must cover already promoted development games too');
});

test('owner reset intake materializes canonical DESIGN_ONLY seeds without duplicate parallel state',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-reset-'));
  const queue=path.join(dir,'queue.json');
  fs.writeFileSync(queue,JSON.stringify({requests:[{revision:'R1',gameId:'x',gameName:'X',status:'ACTIVE',seed:{seedId:'S1',GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'UNITY'}}]}));
  const state={version:1,seeds:[]};
  const first=ensureOwnerDesignResetSeed(state,'x',{file:queue});
  assert.equal(first.changed,true);
  assert.equal(first.seed.productionClass,'DESIGN_ONLY');
  assert.equal(first.seed.status,'ACTIVE');
  const second=ensureOwnerDesignResetSeed(state,'x',{file:queue});
  assert.equal(second.changed,false);
  assert.equal(state.seeds.length,1);
  const all=materializeOwnerDesignResetSeeds(state,{file:queue});
  assert.deepEqual(all.changed,[]);
  assert.equal(all.activeCount,1);
});


test('all-games reset workflow binds expected reset set to current DESIGN_ONLY catalog instead of hardcoded count',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-all-games-design-reset.yml','utf8');
  assert.doesNotMatch(workflow,/OWNER_ALL_GAMES_DESIGN_RESET_COUNT=19/);
  assert.doesNotMatch(workflow,/OWNER_ALL_GAMES_DESIGN_RESET_EXPECTED_COUNT=19/);
  assert.match(workflow,/productionClass\|\|'?\)?\.trim\(\)==='DESIGN_ONLY'|productionClass\|\|''/);
  assert.match(workflow,/OWNER_DESIGN_RESET_COUNT_MISMATCH/);
  assert.match(workflow,/OWNER_DESIGN_RESET_GAME_IDS_MISMATCH/);
  assert.match(workflow,/OWNER_ALL_GAMES_DESIGN_RESET_CATALOG_BINDING=PASS/);
  assert.match(workflow,/gh workflow run company-seed-design-runtime\.yml/);
});


test('seed design runtime keeps owner reset review parallel with active development',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/GAME_PRIMARY_GATE=RUN_PARALLEL_STRICT_DESIGN/);
  assert.doesNotMatch(workflow,/GAME_PRIMARY_GATE=DEFER_ACTIVE_GAME_WORK/);
  assert.match(workflow,/materializeOwnerDesignResetSeeds/);
  assert.match(workflow,/ensureOwnerDesignResetSeed/);
  assert.match(workflow,/activeResetIds/);
  assert.match(workflow,/activeResetPending\.length\?activeResetSeeds:active/);
  assert.match(workflow,/OWNER_ACTIVE_DESIGN_RESET_TARGETS=/);
  assert.match(workflow,/OWNER_ACTIVE_DESIGN_RESET_PENDING=/);
});


test('design runtime persists only the target seed and cannot overwrite newer shared seed state',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  assert.match(workflow,/SEED_RUNTIME_TARGET_MERGE=YES/);
  assert.match(workflow,/TARGET_SEED_MERGE_SOURCE_MISSING/);
  assert.match(workflow,/runtime\.seeds\[index\]=seed/);
  assert.doesNotMatch(workflow,/checkout "\$generated_commit" -- game-seed-state\.json/);
});


test('promoted owner-reset seeds remain eligible for parallel strict design review',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
  const predicateMatches=workflow.match(/strictDesignReviewContinuesInParallel===true/g)||[];
  assert.ok(predicateMatches.length>=4,'all scheduler, matrix, score-sync and continuation paths must honor parallel strict design review');
  assert.match(workflow,/status==='ACTIVE'\|\|seed\?\.promotion\?\.strictDesignReviewContinuesInParallel===true/);
  assert.match(workflow,/status==='ACTIVE'\|\|x\?\.promotion\?\.strictDesignReviewContinuesInParallel===true/);
  assert.doesNotMatch(workflow,/find\(x=>String\(x\.gameId\)===gameId&&String\(x\.status\)\.toUpperCase\(\)==='ACTIVE'\)/);
});


test('latest repeated owner request event wins even when wording and game are the same',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-reset-repeat-'));
  const queue=path.join(dir,'queue.json');
  fs.writeFileSync(queue,JSON.stringify({requests:[
    {revision:'R1',gameId:'x',gameName:'X',status:'ACTIVE',goal:'초반 전투가 재미없어',seed:{seedId:'S1',GAME_CATEGORY:'ACTION',INITIAL_TARGET_PLATFORM:'UNITY'}},
    {revision:'R2',gameId:'x',gameName:'X',status:'ACTIVE',goal:'초반 전투가 재미없어',seed:{seedId:'S1',GAME_CATEGORY:'ACTION',INITIAL_TARGET_PLATFORM:'UNITY'}}
  ]}));
  const state={version:1,seeds:[]};
  const first=ensureOwnerDesignResetSeed(state,'x',{file:queue});
  assert.equal(first.changed,true);
  assert.equal(first.seed.ownerResetRevision,'R2');
  assert.equal(first.seed.ownerRequestInstanceId,'R2');
  assert.equal(first.seed.ownerRepeatedRequestCreatesNewDesignRevision,true);
  assert.equal(state.seeds.length,1);
  const all=materializeOwnerDesignResetSeeds(state,{file:queue});
  assert.deepEqual(all.changed,[]);
  assert.equal(all.activeCount,2);
});
