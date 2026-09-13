// 파일명: qa/design-only-promotion-sync.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promoteReadyDesignSeeds} from '../tools/design-only-promotion-sync.mjs';

const write=(root,file,value)=>{const out=path.join(root,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(value,null,2));};
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const writeReadyDesign=(root,gameId,date='2026-09-11',review={verdict:'PASS',totalScore:82,hardFailures:[]})=>{
  const sourceDesign=`design/${gameId}/${date}/design-revised.json`;
  write(root,sourceDesign,{gameId,content:{identity:'distinct design'},session30MinutePlan:{targetMinutes:30}});
  write(root,`design/${gameId}/${date}/cycle-status.json`,{gameId,productionClass:'DESIGN_ONLY',status:'COMPLETE',baselineGate:{state:'DESIGN_BASELINE_READY',ready:true},departments:{count:5,leadModelsDistinct:true}});
  write(root,`design/${gameId}/${date}/strict-design-review.json`,{version:2,gameId,reviewStage:'DESIGN_STRICT_REVIEW',passThreshold:80,...review});
  return {sourceDesign,date};
};
const baseFiles=root=>{write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[]});};

test('80+ strict design PASS promotes directly to Web without any pre-Web artbook',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S1',gameId:'g1',gameName:'Game One',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});baseFiles(root);writeReadyDesign(root,'g1');
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,['g1']);
  assert.equal(fs.existsSync(path.join(root,'artbook-submissions/g1/current.json')),false);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(seed.strictDesignReview.totalScore,82);
  assert.equal(seed.strictDesignReview.passThreshold,80);
  assert.equal(seed.strictDesignReview.excellent,false);
  assert.equal(seed.promotion.artbookTiming,'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER');
  assert.equal(seed.promotion.postPromotionArtbookRequired,false);
  assert.equal(seed.promotion.postWebArtbookRequired,true);
  assert.equal(seed.promotion.requiredFirstValidation,'WEB_GAMEPLAY_MUSIC_AND_STRICT_REVIEW');
  const project=read(root,'autonomous-portfolio.json').projects[0];
  assert.equal(project.mode,'WEB_VALIDATION_THEN_POST_WEB_ARTBOOK_THEN_SELECTED_PLATFORM_IMPLEMENTATION');
  const game=read(root,'game-catalog.json').games[0];
  assert.equal(game.homepageOfficialCard,false);
  assert.equal(game.homepageTestCandidate,false);
  assert.equal(game.homepageReviewState,'WAITING_WEB_STRICT_REVIEW');
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.currentStep,'WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(queue.canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');
  assert.equal(queue.postPromotionArtbookRequired,false);
  assert.equal(queue.postWebArtbookRequired,true);
  assert.equal(queue.artbookTiming,'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER');
});

test('90+ design is excellent but uses the same 80-point promotion gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-excellent-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SE',gameId:'ge',gameName:'Excellent',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});baseFiles(root);writeReadyDesign(root,'ge','2026-09-11',{verdict:'PASS',totalScore:93,hardFailures:[]});
  promoteReadyDesignSeeds({root});const seed=read(root,'game-seed-state.json').seeds[0];assert.equal(seed.strictDesignReview.excellent,true);assert.equal(seed.promotion.excellentDesign,true);
});

test('79-point design remains DESIGN_ONLY even with no hard failure',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-revise-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SR',gameId:'gr',gameName:'Revise Me',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});baseFiles(root);writeReadyDesign(root,'gr','2026-09-11',{verdict:'REVISE',totalScore:79,hardFailures:[]});
  const result=promoteReadyDesignSeeds({root});assert.deepEqual(result.promoted,[]);const seed=read(root,'game-seed-state.json').seeds[0];assert.equal(seed.lifecycleState,'DESIGN_REVISION_REQUIRED');assert.equal(read(root,'development-queue.json').items.length,0);
});

test('hard gate blocks promotion even above 80',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-hardgate-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SH',gameId:'gh',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});baseFiles(root);writeReadyDesign(root,'gh','2026-09-11',{verdict:'REVISE',totalScore:95,hardFailures:['CORE_FUN_WEAK']});
  const result=promoteReadyDesignSeeds({root});assert.deepEqual(result.promoted,[]);assert.equal(read(root,'game-seed-state.json').seeds[0].productionClass,undefined);
});

test('legacy Android seed maps to Unity and still goes directly to Web',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-platform-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S3',gameId:'g3',gameName:'Game Three',status:'ACTIVE',GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'}]});baseFiles(root);writeReadyDesign(root,'g3','2026-09-12');
  promoteReadyDesignSeeds({root});const seed=read(root,'game-seed-state.json').seeds[0],queue=read(root,'development-queue.json').items[0];assert.equal(seed.selectedPlatform,'UNITY');assert.equal(seed.promotion.targetSourcePath,'unity-games/g3');assert.equal(queue.targetPlatform,'UNITY');assert.equal(queue.canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');assert.equal(queue.currentStep,'WEB_PLAYABLE_BOOTSTRAP');
});

test('already promoted seed is never reset back to the Web bootstrap stage',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-idempotent-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S5',gameId:'g5',gameName:'Game Five',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});baseFiles(root);writeReadyDesign(root,'g5');
  write(root,'development-queue.json',{version:1,items:[{gameId:'g5',productionClass:'DEVELOPMENT_CONFIRMED',status:'PENDING',currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'PENDING_SELECTED_PLATFORM_BIND',strictImplementationScore:96,formalImplementationPassed:true,homepageTestCandidate:true}]});
  const before=read(root,'development-queue.json').items[0];const result=promoteReadyDesignSeeds({root});const after=read(root,'development-queue.json').items[0];assert.deepEqual(result.promoted,[]);assert.equal(result.skipped[0].reason,'ALREADY_PROMOTED');assert.equal(after.currentStep,before.currentStep);assert.equal(after.canonicalState,before.canonicalState);assert.equal(after.strictImplementationScore,96);assert.equal(after.homepageTestCandidate,true);
});

test('incomplete design is not promoted',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-wait-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S2',gameId:'g2',status:'ACTIVE'}]});baseFiles(root);write(root,'design/g2/2026-09-11/cycle-status.json',{baselineGate:{state:'DESIGN_BASELINE_REDESIGN_REQUIRED',ready:false}});
  const result=promoteReadyDesignSeeds({root});assert.equal(result.promoted.length,0);assert.equal(read(root,'development-queue.json').items.length,0);
});
