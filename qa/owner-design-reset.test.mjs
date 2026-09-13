import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ensureOwnerDesignResetSeed,materializeOwnerDesignResetSeeds} from '../tools/owner-design-reset.mjs';

const targets=new Set(['bug-defense','insect-survival','survival']);

test('owner redesign reset removes old public Web/artbook claims for exactly the three requested games',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  for(const id of targets){
    const game=catalog.games.find(row=>row.id===id);
    assert.ok(game,`catalog game missing: ${id}`);
    assert.equal(game.productionClass,'DESIGN_ONLY');
    assert.equal(game.productionClassSource,'OWNER_REDESIGN_RESET_2026-09-13');
    assert.equal(game.hasWebArchive,false);
    assert.equal(game.homepageWebPlayable,false);
    assert.equal('webPath' in game,false);
    assert.equal(game.designBaselineMigration,'OWNER_RESET_TO_DESIGN_ONLY');
  }
  const artbooks=JSON.parse(fs.readFileSync('game-artbooks.json','utf8'));
  assert.equal(artbooks.artbooks.some(row=>targets.has(row.gameId)),false);
  assert.equal(artbooks.dailySubmissions.some(row=>targets.has(row.gameId)),false);
  for(const id of targets){
    assert.equal(fs.existsSync(path.join('web-games',id)),false,`old Web tree still exists: ${id}`);
    assert.equal(fs.existsSync(path.join('artbook-submissions',id)),false,`old artbook tree still exists: ${id}`);
  }
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
