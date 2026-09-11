import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promoteReadyDesignSeeds} from '../tools/design-only-promotion-sync.mjs';

const write=(root,file,value)=>{const out=path.join(root,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(value,null,2));};
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

test('DESIGN_BASELINE_READY promotes to development and queues once',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S1',gameId:'g1',gameName:'Game One',status:'ACTIVE',GAME_CATEGORY:'PUZZLE'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g1',name:'Game One',productionClass:'DESIGN_ONLY',productionTier:3,homepageCategory:'design-only'}]});
  write(root,'artbook-submissions/g1/current.json',{baselineGateState:'DESIGN_BASELINE_READY',publication:{baselineReady:true},published:true,vibe2Used:false,sourceDesign:'design/g1/2026-09-11/design-revised.json'});
  const first=promoteReadyDesignSeeds({root});
  assert.deepEqual(first.promoted,['g1']);
  assert.equal(read(root,'game-seed-state.json').seeds[0].status,'ACTIVE','normal promotion must not create a seed vacancy');
  assert.equal(read(root,'game-seed-state.json').seeds[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(read(root,'autonomous-portfolio.json').projects[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(read(root,'game-catalog.json').games[0].homepageCategory,'development-confirmed');
  const q1=read(root,'development-queue.json');
  assert.equal(q1.items.length,1);
  assert.equal(q1.items[0].currentStep,'LOAD_DESIGN_BASELINE');
  promoteReadyDesignSeeds({root});
  assert.equal(read(root,'development-queue.json').items.length,1,'promotion sync must be idempotent');
});

test('incomplete design is not promoted',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-wait-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S2',gameId:'g2',status:'ACTIVE'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g2',productionClass:'DESIGN_ONLY',productionTier:3,homepageCategory:'design-only'}]});
  write(root,'artbook-submissions/g2/current.json',{baselineGateState:'DESIGN_BASELINE_REDESIGN_REQUIRED',publication:{baselineReady:false},published:false,vibe2Used:false});
  const result=promoteReadyDesignSeeds({root});
  assert.equal(result.promoted.length,0);
  assert.equal(read(root,'game-catalog.json').games[0].productionClass,'DESIGN_ONLY');
  assert.equal(read(root,'development-queue.json').items.length,0);
});
