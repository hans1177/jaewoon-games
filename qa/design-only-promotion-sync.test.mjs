// 파일명: qa/design-only-promotion-sync.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promoteReadyDesignSeeds} from '../tools/design-only-promotion-sync.mjs';

const write=(root,file,value)=>{const out=path.join(root,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(value,null,2));};
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeReadyDesign=(root,gameId,date='2026-09-11',review={verdict:'PASS',totalScore:94,hardFailures:[]})=>{
  const sourceDesign=`design/${gameId}/${date}/design-revised.json`;
  write(root,sourceDesign,{gameId,session30MinutePlan:{targetMinutes:30}});
  write(root,`design/${gameId}/${date}/strict-design-review.json`,{version:1,gameId,reviewStage:'DESIGN_STRICT_REVIEW',...review});
  write(root,`artbook-submissions/${gameId}/current.json`,{baselineGateState:'DESIGN_BASELINE_READY',publication:{baselineReady:true},published:true,vibe2Used:false,sourceDesign});
};

test('DESIGN_BASELINE_READY plus strict PASS promotes once and queues required Web gameplay and music validation first',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S1',gameId:'g1',gameName:'Game One',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g1',name:'Game One',productionClass:'DESIGN_ONLY',productionTier:3,homepageCategory:'design-only'}]});
  writeReadyDesign(root,'g1');
  const first=promoteReadyDesignSeeds({root});
  assert.deepEqual(first.promoted,['g1']);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.status,'ACTIVE');
  assert.equal(seed.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(seed.selectedPlatform,'ROBLOX');
  assert.equal(seed.strictDesignReview.verdict,'PASS');
  assert.equal(seed.strictDesignReview.totalScore,94);
  assert.equal(seed.promotion.targetSourcePath,'roblox-games/g1');
  assert.equal(seed.promotion.webSourcePath,'web-games/g1');
  assert.equal(seed.promotion.requiredFirstValidation,'WEB_GAMEPLAY_AND_MUSIC_STRICT_REVIEW');
  const project=read(root,'autonomous-portfolio.json').projects[0];
  assert.equal(project.mode,'WEB_VALIDATION_THEN_SELECTED_PLATFORM_IMPLEMENTATION');
  assert.equal(project.targetEngine,'ROBLOX');
  assert.equal(project.sourcePath,'web-games/g1');
  assert.equal(project.targetSourcePath,'roblox-games/g1');
  const game=read(root,'game-catalog.json').games[0];
  assert.equal(game.homepageCategory,'development-confirmed');
  assert.equal(game.targetSourcePath,'roblox-games/g1');
  assert.equal(game.homepageOfficialCard,false);
  assert.equal(game.homepageTestCandidate,false);
  assert.match(game.homepageStage,/Web 강심사/);
  const q1=read(root,'development-queue.json');
  assert.equal(q1.items.length,1);
  assert.equal(q1.items[0].status,'ACTIVE');
  assert.equal(q1.items[0].currentStep,'WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(q1.items[0].canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');
  assert.equal(q1.items[0].sourcePath,'web-games/g1');
  assert.equal(q1.items[0].webSourcePath,'web-games/g1');
  assert.equal(q1.items[0].targetSourcePath,'roblox-games/g1');
  assert.equal(q1.items[0].webValidationRequired,true);
  assert.equal(q1.items[0].musicValidationRequired,true);
  promoteReadyDesignSeeds({root});
  assert.equal(read(root,'development-queue.json').items.length,1,'promotion sync must be idempotent');
});

test('strict REVISE remains DESIGN_ONLY and is not development promoted',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-revise-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SR',gameId:'gr',gameName:'Revise Me',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'gr',name:'Revise Me',productionClass:'DESIGN_ONLY'}]});
  writeReadyDesign(root,'gr','2026-09-11',{verdict:'REVISE',totalScore:84,hardFailures:['CORE_FUN_WEAK']});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,[]);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.productionClass,undefined);
  assert.equal(seed.lifecycleState,'DESIGN_REVISION_REQUIRED');
  assert.equal(seed.strictDesignReview.verdict,'REVISE');
  assert.equal(read(root,'development-queue.json').items.length,0);
});

test('legacy Android seed maps to Unity but still enters the required Web gate first',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-platform-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S3',gameId:'g3',gameName:'Game Three',status:'ACTIVE',GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  writeReadyDesign(root,'g3','2026-09-12');
  promoteReadyDesignSeeds({root});
  const seed=read(root,'game-seed-state.json').seeds[0];
  const project=read(root,'autonomous-portfolio.json').projects[0];
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(seed.selectedPlatform,'UNITY');
  assert.equal(seed.promotion.targetSourcePath,'unity-games/g3');
  assert.equal(project.targetEngine,'UNITY');
  assert.equal(project.sourcePath,'web-games/g3');
  assert.equal(project.targetSourcePath,'unity-games/g3');
  assert.equal(queue.targetPlatform,'UNITY');
  assert.equal(queue.sourcePath,'web-games/g3');
  assert.equal(queue.targetSourcePath,'unity-games/g3');
});

test('legacy active Unity queue without Web evidence migrates back to the required Web gate after strict design PASS',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-migrate-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S4',gameId:'g4',gameName:'Game Four',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g4',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION'}]});
  writeReadyDesign(root,'g4','2026-09-12');
  promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.currentStep,'WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(queue.canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');
  assert.equal(queue.sourcePath,'web-games/g4');
});

test('already strict-passed Web and music evidence is not reset by promotion sync',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-passed-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S5',gameId:'g5',gameName:'Game Five',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g5',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION',webValidationPassedAt:'2026-09-12T00:00:00Z',musicValidationPassed:true,strictImplementationVerdict:'PASS',strictImplementationScore:96}]});
  writeReadyDesign(root,'g5','2026-09-12');
  promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.currentStep,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(queue.sourcePath,'unity-games/g5');
  assert.equal(queue.homepageTestCandidate,true);
  assert.equal(queue.homepageTestScore,96);
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
