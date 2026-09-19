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

test('preservation pilot queue starts with ASSET_ADAPTATION metadata',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-preservation-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'SP',gameId:'preserve-game',gameName:'Preserve Game',status:'ACTIVE',
    GAME_CATEGORY:'ACTION_SURVIVAL_ROGUELITE',INITIAL_TARGET_PLATFORM:'UNITY',
    REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:true,OWNER_REBUILD_MODE:'PRESERVATION_PRESENTATION_UPGRADE'
  }]});
  baseFiles(root);writeReadyDesign(root,'preserve-game');
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,['preserve-game']);
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.ownerPreservationPresentationUpgrade,true);
  assert.equal(queue.presentationFirstPass,'ASSET_ADAPTATION');
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
  const before=read(root,'development-queue.json').items[0];const result=promoteReadyDesignSeeds({root});const after=read(root,'development-queue.json').items[0];assert.deepEqual(result.promoted,[]);assert.equal(result.skipped[0].reason,'ALREADY_PROMOTED');assert.equal(after.currentStep,before.currentStep);assert.equal(after.canonicalState,before.canonicalState);assert.equal(after.strictImplementationScore,96);assert.equal(after.homepageTestCandidate,true);assert.equal(result.reconciledPromotedSeeds.length,0);
});

test('active DEVELOPMENT_CONFIRMED seed self-heals a missing queue entry before Web source exists',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-self-heal-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S6',gameId:'g6',gameName:'Game Six',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',selectedPlatform:'ROBLOX',GAME_CATEGORY:'SURVIVAL'}]});baseFiles(root);writeReadyDesign(root,'g6');
  assert.equal(fs.existsSync(path.join(root,'web-games/g6/index.html')),false);
  const result=promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json');
  assert.deepEqual(result.reconciledPromotedSeeds,['g6']);
  assert.equal(queue.items.length,1);
  assert.equal(queue.items[0].gameId,'g6');
  assert.equal(queue.items[0].queueSource,'ACTIVE_DEVELOPMENT_CONFIRMED_SEED');
  assert.equal(queue.items[0].currentStep,'WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(queue.items[0].canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');
  assert.equal(queue.items[0].webValidationRequired,true);
  assert.equal(queue.items[0].musicValidationRequired,true);
  const portfolio=read(root,'autonomous-portfolio.json');
  const catalog=read(root,'game-catalog.json');
  assert.equal(portfolio.projects.find(x=>x.slug==='g6')?.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(catalog.games.find(x=>x.id==='g6')?.productionClass,'DEVELOPMENT_CONFIRMED');
  promoteReadyDesignSeeds({root});
  assert.equal(read(root,'development-queue.json').items.filter(x=>x.gameId==='g6').length,1);
});

test('incomplete design is not promoted',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-wait-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S2',gameId:'g2',status:'ACTIVE'}]});baseFiles(root);write(root,'design/g2/2026-09-11/cycle-status.json',{baselineGate:{state:'DESIGN_BASELINE_REDESIGN_REQUIRED',ready:false}});
  const result=promoteReadyDesignSeeds({root});assert.equal(result.promoted.length,0);assert.equal(read(root,'development-queue.json').items.length,0);
});


test('owner reset DEVELOPMENT_CONFIRMED seed cannot bypass fresh strict review',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-reset-revise-'));
  write(root,'game-seed-state.json',{
    version:1,
    ownerAllGamesDesignReset:{updatedAt:'2026-09-17T10:40:57.051Z',gameIds:['g-reset']},
    seeds:[{seedId:'RESET',gameId:'g-reset',gameName:'Reset Game',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]
  });
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g-reset',name:'Reset Game',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g-reset',productionClass:'DEVELOPMENT_CONFIRMED',designBaselineSource:'design/g-reset/2026-09-13/design-revised.json',strictImplementationScore:100,webStrictScore:100,formalImplementationPassed:false}]});
  fs.mkdirSync(path.join(root,'web-games/g-reset'),{recursive:true});fs.writeFileSync(path.join(root,'web-games/g-reset/index.html'),'<html><body>old</body></html>');
  writeReadyDesign(root,'g-reset','2026-09-18',{verdict:'REVISE',totalScore:91,hardFailures:['CORE_FUN_WEAK'],reviewedAt:'2026-09-17T21:56:54.829Z'});
  const result=promoteReadyDesignSeeds({root});
  assert.equal(read(root,'development-queue.json').items.some(x=>x.gameId==='g-reset'),false);
  assert.ok(result.skipped.some(x=>x.gameId==='g-reset'&&x.reason==='OWNER_RESET_STRICT_DESIGN_REVIEW_NOT_PASS'));
  const seed=read(root,'game-seed-state.json').seeds.find(x=>x.gameId==='g-reset');
  assert.equal(seed.strictDesignReview.verdict,'REVISE');
  assert.deepEqual(seed.strictDesignReview.hardFailures,['CORE_FUN_WEAK']);
});

test('owner reset fresh strict PASS refreshes old promoted queue to the new baseline',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-reset-pass-'));
  write(root,'game-seed-state.json',{
    version:1,
    ownerAllGamesDesignReset:{updatedAt:'2026-09-17T10:40:57.051Z',gameIds:['g-pass']},
    seeds:[{seedId:'RESET-PASS',gameId:'g-pass',gameName:'Reset Pass',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'UNITY',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]
  });
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[{id:'g-pass',name:'Reset Pass',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g-pass',productionClass:'DEVELOPMENT_CONFIRMED',designBaselineSource:'design/g-pass/2026-09-13/design-revised.json',designDate:'2026-09-13',currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'PENDING_SELECTED_PLATFORM_BIND',strictImplementationScore:100,webStrictScore:100,formalImplementationPassed:true}]});
  writeReadyDesign(root,'g-pass','2026-09-18',{verdict:'PASS',totalScore:92,hardFailures:[],reviewedAt:'2026-09-17T22:00:00.000Z'});
  promoteReadyDesignSeeds({root});
  const queue=read(root,'development-queue.json').items.find(x=>x.gameId==='g-pass');
  assert.equal(queue.designBaselineSource,'design/g-pass/2026-09-18/design-revised.json');
  assert.equal(queue.designDate,'2026-09-18');
  assert.equal(queue.strictDesignScore,92);
  assert.equal(queue.strictImplementationScore,null);
  assert.equal(queue.webStrictScore,null);
  assert.equal(queue.formalImplementationPassed,false);
  assert.equal(queue.currentStep,'WEB_PLAYABLE_BOOTSTRAP');
  assert.equal(queue.canonicalState,'WAITING_WEB_GAMEPLAY_VALIDATION');
});


test('owner reset DESIGN_ONLY seed rejects pre-reset PASS evidence',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-reset-stale-'));
  write(root,'game-seed-state.json',{
    version:1,
    ownerAllGamesDesignReset:{updatedAt:'2026-09-17T10:40:57.051Z',gameIds:['g-stale']},
    seeds:[{seedId:'RESET-STALE',gameId:'g-stale',gameName:'Reset Stale',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'}]
  });
  baseFiles(root);
  writeReadyDesign(root,'g-stale','2026-09-16',{verdict:'PASS',totalScore:95,hardFailures:[]});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,[]);
  assert.ok(result.skipped.some(x=>x.gameId==='g-stale'&&x.reason==='OWNER_RESET_FRESH_DESIGN_REQUIRED'));
  assert.equal(read(root,'development-queue.json').items.length,0);
  assert.equal(read(root,'game-seed-state.json').seeds[0].productionClass,undefined);
});

test('legacy direct-five-lead stale blocker self-heals only when it is the sole blocker',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-stale-direct-lead-'));
  write(root,'game-seed-state.json',{version:1,seeds:[{seedId:'S-STALE',gameId:'g-stale-ready',gameName:'Stale Ready',status:'ACTIVE',GAME_CATEGORY:'SINGLE_DEFENSE_STRATEGY',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  baseFiles(root);
  const date='2026-09-18';
  write(root,`design/g-stale-ready/${date}/design-revised.json`,{gameId:'g-stale-ready',content:{identity:'distinct design'}});
  write(root,`design/g-stale-ready/${date}/strict-design-review.json`,{verdict:'PASS',totalScore:89.4,hardFailures:[]});
  write(root,`design/g-stale-ready/${date}/cycle-status.json`,{
    gameId:'g-stale-ready',productionClass:'DESIGN_ONLY',status:'COMPLETE',
    baselineGate:{state:'DESIGN_BASELINE_REDESIGN_REQUIRED',ready:false,blockers:['post-revision-five-department-review-required'],meeting:{conflictCount:0,holdCount:0}},
    disposition:{fiveDepartmentLeadReviewCompleted:true},
    meeting:{required:false}
  });
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,['g-stale-ready']);
  const queue=read(root,'development-queue.json').items[0];
  assert.equal(queue.selectedPlatform,'UNITY');
  assert.equal(queue.currentStep,'WEB_PLAYABLE_BOOTSTRAP');

  const rootBlocked=fs.mkdtempSync(path.join(os.tmpdir(),'design-promotion-stale-blocked-'));
  write(rootBlocked,'game-seed-state.json',{version:1,seeds:[{seedId:'S-BLOCK',gameId:'g-stale-blocked',status:'ACTIVE',GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'UNITY'}]});
  baseFiles(rootBlocked);
  write(rootBlocked,`design/g-stale-blocked/${date}/design-revised.json`,{gameId:'g-stale-blocked'});
  write(rootBlocked,`design/g-stale-blocked/${date}/strict-design-review.json`,{verdict:'PASS',totalScore:95,hardFailures:[]});
  write(rootBlocked,`design/g-stale-blocked/${date}/cycle-status.json`,{
    gameId:'g-stale-blocked',productionClass:'DESIGN_ONLY',status:'COMPLETE',
    baselineGate:{state:'DESIGN_BASELINE_REDESIGN_REQUIRED',ready:false,blockers:['post-revision-five-department-review-required','another-real-blocker'],meeting:{conflictCount:0,holdCount:0}},
    disposition:{fiveDepartmentLeadReviewCompleted:true},
    meeting:{required:false}
  });
  const blocked=promoteReadyDesignSeeds({root:rootBlocked});
  assert.deepEqual(blocked.promoted,[]);
});
