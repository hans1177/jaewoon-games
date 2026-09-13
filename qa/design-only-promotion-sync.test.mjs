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
const writePostPromotionArtbook=(root,gameId,date='2026-09-11',sourceDesign=`design/${gameId}/${date}/design-revised.json`)=>{
  write(root,`artbook-submissions/${gameId}/current.json`,{version:6,gameId,date,productionClass:'DEVELOPMENT_CONFIRMED',postPromotion:true,baselineGateState:'DESIGN_BASELINE_READY',publication:{baselineReady:true},published:true,vibe2Used:false,sourceDesign});
};

test('80+ strict design PASS promotes without requiring a pre-promotion artbook',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S1',gameId:'g1',gameName:'Game One',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g1',name:'Game One',productionClass:'DESIGN_ONLY',productionTier:3,homepageCategory:'design-only'}]});
  writeReadyDesign(root,'g1');
  const first=promoteReadyDesignSeeds({root});
  assert.deepEqual(first.promoted,['g1']);
  assert.equal(fs.existsSync(path.join(root,'artbook-submissions/g1/current.json')),false,'artbook must not exist before promotion');
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.status,'ACTIVE');
  assert.equal(seed.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(seed.selectedPlatform,'ROBLOX');
  assert.equal(seed.strictDesignReview.verdict,'PASS');
  assert.equal(seed.strictDesignReview.totalScore,82);
  assert.equal(seed.strictDesignReview.passThreshold,80);
  assert.equal(seed.strictDesignReview.excellent,false);
  assert.equal(seed.promotion.targetSourcePath,'roblox-games/g1');
  assert.equal(seed.promotion.webSourcePath,'web-games/g1');
  assert.equal(seed.promotion.artbookTiming,'AFTER_PROMOTION');
  assert.equal(seed.promotion.postPromotionArtbookRequired,true);
  assert.equal(seed.promotion.requiredFirstValidation,'POST_PROMOTION_ARTBOOK_THEN_WEB_GAMEPLAY_AND_MUSIC_STRICT_REVIEW');
  const project=read(root,'autonomous-portfolio.json').projects[0];
  assert.equal(project.mode,'POST_PROMOTION_ARTBOOK_THEN_WEB_VALIDATION_THEN_SELECTED_PLATFORM_IMPLEMENTATION');
  assert.equal(project.targetEngine,'ROBLOX');
  assert.equal(project.sourcePath,'web-games/g1');
  const game=read(root,'game-catalog.json').games[0];
  assert.equal(game.homepageCategory,'development-confirmed');
  assert.equal(game.homepageOfficialCard,false);
  assert.equal(game.homepageTestCandidate,false);
  assert.equal(game.homepageReviewState,'WAITING_POST_PROMOTION_ARTBOOK');
  const q1=read(root,'development-queue.json');
  assert.equal(q1.items.length,1);
  assert.equal(q1.items[0].status,'ACTIVE');
  assert.equal(q1.items[0].currentStep,'POST_PROMOTION_ARTBOOK_THEN_WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(q1.items[0].canonicalState,'WAITING_POST_PROMOTION_ARTBOOK');
  assert.equal(q1.items[0].postPromotionArtbookRequired,true);
  assert.equal(q1.items[0].strictDesignScore,82);
});

test('90+ design is marked excellent but uses the same promotion gate',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-excellent-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SE',gameId:'ge',gameName:'Excellent',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[]});
  writeReadyDesign(root,'ge','2026-09-11',{verdict:'PASS',totalScore:93,hardFailures:[]});
  promoteReadyDesignSeeds({root});
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.strictDesignReview.excellent,true);
  assert.equal(seed.promotion.excellentDesign,true);
});

test('79-point design remains DESIGN_ONLY even with no hard failure',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-revise-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SR',gameId:'gr',gameName:'Revise Me',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[{id:'gr',name:'Revise Me',productionClass:'DESIGN_ONLY'}]});
  writeReadyDesign(root,'gr','2026-09-11',{verdict:'REVISE',totalScore:79,hardFailures:[]});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,[]);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.productionClass,undefined);
  assert.equal(seed.lifecycleState,'DESIGN_REVISION_REQUIRED');
  assert.equal(seed.strictDesignReview.totalScore,79);
  assert.equal(read(root,'development-queue.json').items.length,0);
});

test('hard gate blocks promotion even above 80',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-hardgate-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'SH',gameId:'gh',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[]});
  writeReadyDesign(root,'gh','2026-09-11',{verdict:'REVISE',totalScore:95,hardFailures:['CORE_FUN_WEAK']});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,[]);
  assert.equal(read(root,'game-seed-state.json').seeds[0].productionClass,undefined);
});

test('legacy Android seed maps to Unity and waits for its post-promotion artbook',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-platform-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S3',gameId:'g3',gameName:'Game Three',status:'ACTIVE',GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[]});
  writeReadyDesign(root,'g3','2026-09-12');
  promoteReadyDesignSeeds({root});
  const seed=read(root,'game-seed-state.json').seeds[0];const project=read(root,'autonomous-portfolio.json').projects[0];const queue=read(root,'development-queue.json').items[0];
  assert.equal(seed.selectedPlatform,'UNITY');
  assert.equal(seed.promotion.targetSourcePath,'unity-games/g3');
  assert.equal(project.targetEngine,'UNITY');
  assert.equal(queue.targetPlatform,'UNITY');
  assert.equal(queue.canonicalState,'WAITING_POST_PROMOTION_ARTBOOK');
});

test('existing post-promotion artbook allows Web gate and Web implementation still requires 90',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-passed-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S5',gameId:'g5',gameName:'Game Five',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g5',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'WAITING_TARGET_PLATFORM_VALIDATION',webValidationPassedAt:'2026-09-12T00:00:00Z',musicValidationPassed:true,strictImplementationVerdict:'PASS',strictImplementationScore:96}]});
  const {sourceDesign}=writeReadyDesign(root,'g5','2026-09-12');writePostPromotionArtbook(root,'g5','2026-09-12',sourceDesign);
  promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.sourcePath,'unity-games/g5');
  assert.equal(queue.homepageTestCandidate,true);
  assert.equal(queue.homepageTestScore,96);
});

test('existing artbook plus implementation score below 90 returns to Web validation',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-web90-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S6',gameId:'g6',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g6',productionClass:'DEVELOPMENT_CONFIRMED',webValidationPassedAt:'2026-09-12T00:00:00Z',musicValidationPassed:true,strictImplementationVerdict:'PASS',strictImplementationScore:88}]});
  const {sourceDesign}=writeReadyDesign(root,'g6','2026-09-12');writePostPromotionArtbook(root,'g6','2026-09-12',sourceDesign);
  promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.currentStep,'WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(queue.canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');
  assert.equal(queue.homepageTestCandidate,false);
});

test('incomplete design is not promoted',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-wait-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S2',gameId:'g2',status:'ACTIVE'}]});
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});write(root,'game-catalog.json',{version:1,games:[{id:'g2',productionClass:'DESIGN_ONLY',productionTier:3,homepageCategory:'design-only'}]});
  write(root,'design/g2/2026-09-11/cycle-status.json',{baselineGate:{state:'DESIGN_BASELINE_REDESIGN_REQUIRED',ready:false}});
  const result=promoteReadyDesignSeeds({root});
  assert.equal(result.promoted.length,0);
  assert.equal(read(root,'game-catalog.json').games[0].productionClass,'DESIGN_ONLY');
  assert.equal(read(root,'development-queue.json').items.length,0);
});
