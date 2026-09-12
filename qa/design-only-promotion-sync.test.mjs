import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promoteReadyDesignSeeds} from '../tools/design-only-promotion-sync.mjs';

const write=(root,file,value)=>{const out=path.join(root,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(value,null,2));};
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

test('DESIGN_BASELINE_READY promotes once and binds the selected platform source directly',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S1',gameId:'g1',gameName:'Game One',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g1',name:'Game One',productionClass:'DESIGN_ONLY',productionTier:3,homepageCategory:'design-only'}]});
  write(root,'artbook-submissions/g1/current.json',{baselineGateState:'DESIGN_BASELINE_READY',publication:{baselineReady:true},published:true,vibe2Used:false,sourceDesign:'design/g1/2026-09-11/design-revised.json'});
  const first=promoteReadyDesignSeeds({root});
  assert.deepEqual(first.promoted,['g1']);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.status,'ACTIVE','normal promotion must not create a seed vacancy');
  assert.equal(seed.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(seed.selectedPlatform,'ROBLOX');
  assert.equal(seed.promotion.targetSourcePath,'roblox-games/g1');
  const project=read(root,'autonomous-portfolio.json').projects[0];
  assert.equal(project.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(project.selectedPlatform,'ROBLOX');
  assert.equal(project.targetPlatform,'ROBLOX');
  assert.equal(project.mode,'SELECTED_PLATFORM_IMPLEMENTATION');
  assert.equal(project.targetEngine,'ROBLOX');
  assert.equal(project.sourcePath,'roblox-games/g1');
  assert.equal(project.webArchivePath,'web-games/g1');
  const game=read(root,'game-catalog.json').games[0];
  assert.equal(game.homepageCategory,'development-confirmed');
  assert.equal(game.selectedPlatform,'ROBLOX');
  assert.equal(game.targetPlatform,'ROBLOX');
  assert.equal(game.productionTarget,'ROBLOX');
  assert.equal(game.targetSourcePath,'roblox-games/g1');
  const q1=read(root,'development-queue.json');
  assert.equal(q1.items.length,1);
  assert.equal(q1.items[0].currentStep,'LOAD_DESIGN_BASELINE');
  assert.equal(q1.items[0].selectedPlatform,'ROBLOX');
  assert.equal(q1.items[0].targetPlatform,'ROBLOX');
  assert.equal(q1.items[0].sourcePath,'roblox-games/g1');
  assert.equal(q1.items[0].optionalWebSourcePath,'web-games/g1');
  promoteReadyDesignSeeds({root});
  assert.equal(read(root,'development-queue.json').items.length,1,'promotion sync must be idempotent');
});

test('legacy Android seed intent maps to Unity and no longer stays on Web-first planner fields',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-platform-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S3',gameId:'g3',gameName:'Game Three',status:'ACTIVE',GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'artbook-submissions/g3/current.json',{baselineGateState:'DESIGN_BASELINE_READY',publication:{baselineReady:true},published:true,vibe2Used:false,sourceDesign:'design/g3/2026-09-12/design-revised.json'});
  promoteReadyDesignSeeds({root});
  const seed=read(root,'game-seed-state.json').seeds[0];
  const project=read(root,'autonomous-portfolio.json').projects[0];
  const game=read(root,'game-catalog.json').games[0];
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(seed.selectedPlatform,'UNITY');
  assert.equal(seed.promotion.selectedPlatform,'UNITY');
  assert.equal(seed.promotion.targetSourcePath,'unity-games/g3');
  assert.equal(project.selectedPlatform,'UNITY');
  assert.equal(project.targetPlatform,'UNITY');
  assert.equal(project.mode,'SELECTED_PLATFORM_IMPLEMENTATION');
  assert.equal(project.targetEngine,'UNITY');
  assert.equal(project.sourcePath,'unity-games/g3');
  assert.equal(game.selectedPlatform,'UNITY');
  assert.equal(game.targetPlatform,'UNITY');
  assert.equal(game.productionTarget,'UNITY');
  assert.equal(queue.selectedPlatform,'UNITY');
  assert.equal(queue.targetPlatform,'UNITY');
  assert.equal(queue.sourcePath,'unity-games/g3');
});

test('legacy active Unity queue state migrates to canonical target-platform state',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-migrate-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S4',gameId:'g4',gameName:'Game Four',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g4',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'UNITY_ANDROID_TECHNICAL_VALIDATION',canonicalState:'WAITING_UNITY_VALIDATION'}]});
  write(root,'artbook-submissions/g4/current.json',{baselineGateState:'DESIGN_BASELINE_READY',publication:{baselineReady:true},published:true,vibe2Used:false,sourceDesign:'design/g4/2026-09-12/design-revised.json'});
  promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.currentStep,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(queue.canonicalState,'WAITING_TARGET_PLATFORM_VALIDATION');
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
