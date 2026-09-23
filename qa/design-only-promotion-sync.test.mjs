import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promoteReadyDesignSeeds} from '../tools/design-only-promotion-sync.mjs';

const write=(root,file,value)=>{
  const out=path.join(root,file);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(value,null,2));
};
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

function centralPolicy(root){
  write(root,'company-learning/platform-release-roadmap.json',{
    directNativeDualPlatformDevelopment:{
      status:'OWNER_DIRECT_LOCKED',
      mode:'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR',
      canonicalDevelopmentAdmissionAuthority:true,
      minimumDesignRequired:true,
      strictDesignScoreRequiredForDevelopmentAdmission:false,
      legacyWebFirstFallbackForbidden:true,
      webDevelopmentStageRemoved:true,
      unityWebEnabled:true,
      unityWebRequired:false,
      unityWebGateRequired:false,
      unityWebMode:'VALIDATION_SURFACE_ONLY',
      supportedDevelopmentPlatforms:['ROBLOX','UNITY'],
      unityWebValidationSurface:{requiredForDevelopmentAdmission:false}
    }
  });
}
function designContent(){
  return {
    identity:'A distinct survival RPG about risky expeditions and rebuilding a persistent refuge.',
    coreFun:'Choose a dangerous route, fight for resources, extract, and improve the next run.',
    coreLoop:['prepare loadout','enter dangerous region','fight and collect','return and upgrade'],
    signatureSystems:[
      {name:'Risk Route',purpose:'Choose danger for better rewards'},
      {name:'Loadout Growth',purpose:'Trade resources for stronger future runs'}
    ],
    progressionDirection:'Persistent character and refuge growth unlock harder regions and more build choices.',
    failureRetryRisk:{failureStates:['player defeat','failed extraction'],retryFlow:'return and rebuild'},
    multiplayerMode:'COOP',
    technicalAssumptions:['authoritative gameplay is separated from presentation','save schema meaning remains stable'],
    platformProfiles:{
      ROBLOX:{
        platform:'ROBLOX',
        inputModel:'Roblox touch keyboard and gamepad controls',
        sessionModel:'social drop-in sessions with fast joins',
        multiplayerRuntime:'server authoritative Roblox replication',
        performanceBudget:'mobile Roblox bounded effects budget',
        uiUx:'touch-safe Roblox HUD and readable controls',
        saveAndNetwork:'server validated remotes and DataStore save',
        platformContentAdaptation:'Roblox avatar and social session adaptation',
        internalReleaseTarget:'private restricted Roblox owner playtest',
        validationEvidence:'published private place runtime QA regression'
      },
      UNITY:{
        platform:'UNITY',
        inputModel:'Unity Input System touch gamepad keyboard',
        sessionModel:'mobile app suspend and resume sessions',
        multiplayerRuntime:'authoritative app transport for coop',
        performanceBudget:'Android memory GPU thermal battery budget',
        uiUx:'safe-area responsive touch-first Unity UI',
        saveAndNetwork:'versioned local save and validated sync',
        platformContentAdaptation:'Unity scene prefab app lifecycle adaptation',
        internalReleaseTarget:'internal closed Android test build',
        validationEvidence:'install launch runtime QA regression evidence'
      }
    }
  };
}
function writeMinimumDesign(root,gameId,date='2026-09-18',strict={verdict:'REVISE',totalScore:42,hardFailures:['CORE_FUN_WEAK']}){
  const file=`design/${gameId}/${date}/design-revised.json`;
  write(root,file,{gameId,content:designContent()});
  write(root,`design/${gameId}/${date}/strict-design-review.json`,strict);
  return file;
}
function base(root){
  centralPolicy(root);
  write(root,'autonomous-portfolio.json',{version:1,projects:[]});
  write(root,'game-catalog.json',{version:1,games:[]});
  write(root,'development-queue.json',{version:1,items:[]});
}

test('minimum dual-platform design promotes immediately while strict review stays non-admission',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-promotion-'));
  base(root);
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'S1',gameId:'g1',gameName:'Game One',status:'ACTIVE',productionClass:'DESIGN_ONLY',
    GAME_CATEGORY:'PUZZLE',INITIAL_TARGET_PLATFORM:'ROBLOX'
  }]});
  writeMinimumDesign(root,'g1','2026-09-18',{verdict:'REVISE',totalScore:79,hardFailures:['CORE_FUN_WEAK']});

  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,['g1']);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(seed.promotion.reason,'MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  assert.equal(seed.promotion.strictDesignReviewRequiredForAdmission,false);
  assert.equal(seed.promotion.strictDesignReviewContinuesInParallel,true);

  const item=read(root,'development-queue.json').items[0];
  assert.deepEqual(item.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(item.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
  assert.equal(item.canonicalState,'PENDING_DUAL_NATIVE_SOURCE_BIND');
  assert.equal(item.minimumDesignContract.pass,true);
  assert.equal(item.webValidationRequired,false);
  assert.equal(item.musicValidationRequired,false);
  assert.equal(item.webSourcePath,null);
  assert.equal(item.artbookTiming,'PARALLEL_NATIVE_PRESENTATION_SUPPORT');
});

test('legacy Android preference maps to Unity but still starts both native lanes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-platform-'));
  base(root);
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'S2',gameId:'g2',gameName:'Game Two',status:'ACTIVE',productionClass:'DESIGN_ONLY',
    GAME_CATEGORY:'CASUAL',INITIAL_TARGET_PLATFORM:'ANDROID_MOBILE'
  }]});
  writeMinimumDesign(root,'g2');
  promoteReadyDesignSeeds({root});
  const seed=read(root,'game-seed-state.json').seeds[0];
  const item=read(root,'development-queue.json').items[0];
  assert.equal(seed.selectedPlatform,'UNITY');
  assert.equal(item.targetPlatform,'UNITY');
  assert.deepEqual(item.concurrentTargetPlatforms,['ROBLOX','UNITY']);
  assert.equal(item.targetSourcePaths.ROBLOX,'roblox-games/g2');
  assert.equal(item.targetSourcePaths.UNITY,'unity-games/g2');
});

test('incomplete minimum design remains transient DESIGN_ONLY with no development queue row',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-incomplete-'));
  base(root);
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'S3',gameId:'g3',status:'ACTIVE',productionClass:'DESIGN_ONLY',INITIAL_TARGET_PLATFORM:'ROBLOX'
  }]});
  write(root,'design/g3/2026-09-18/design-revised.json',{gameId:'g3',content:{identity:'not enough'}});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,[]);
  assert.equal(read(root,'game-seed-state.json').seeds[0].productionClass,'DESIGN_ONLY');
  assert.equal(read(root,'development-queue.json').items.length,0);
});

test('stale DEVELOPMENT_CONFIRMED without a valid minimum design is demoted and removed from queue',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-stale-'));
  base(root);
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'S4',gameId:'g4',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',INITIAL_TARGET_PLATFORM:'UNITY'
  }]});
  write(root,'development-queue.json',{version:1,items:[{gameId:'g4',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'WEB_PLAYABLE_BOOTSTRAP',webValidationRequired:true}]});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.demoted,['g4']);
  const seed=read(root,'game-seed-state.json').seeds[0];
  assert.equal(seed.productionClass,'DESIGN_ONLY');
  assert.equal(seed.lifecycleState,'MINIMUM_DESIGN_REQUIRED');
  assert.equal(read(root,'development-queue.json').items.length,0);
});

test('owner reset requires a fresh minimum design but not a fresh strict-score PASS',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-reset-'));
  base(root);
  write(root,'game-seed-state.json',{
    version:1,
    ownerAllGamesDesignReset:{updatedAt:'2026-09-17T10:40:57.051Z',gameIds:['g5']},
    seeds:[{seedId:'S5',gameId:'g5',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',INITIAL_TARGET_PLATFORM:'ROBLOX'}]
  });
  write(root,'development-queue.json',{version:1,items:[{gameId:'g5',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'TARGET_PLATFORM_SOURCE_BIND'}]});
  writeMinimumDesign(root,'g5','2026-09-16',{verdict:'PASS',totalScore:99,hardFailures:[]});
  let result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.demoted,['g5']);
  assert.equal(read(root,'development-queue.json').items.length,0);

  writeMinimumDesign(root,'g5','2026-09-18',{verdict:'REVISE',totalScore:61,hardFailures:['CORE_FUN_WEAK']});
  result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.promoted,['g5']);
  assert.equal(read(root,'game-seed-state.json').seeds[0].productionClass,'DEVELOPMENT_CONFIRMED');
  assert.equal(read(root,'development-queue.json').items[0].minimumDesignContract.pass,true);
});

test('reconciliation preserves current direct-native progress when the minimum design source is unchanged',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-idempotent-'));
  base(root);
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'S6',gameId:'g6',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',INITIAL_TARGET_PLATFORM:'UNITY'
  }]});
  const source=writeMinimumDesign(root,'g6','2026-09-18');
  write(root,'development-queue.json',{version:1,items:[{
    gameId:'g6',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    minimumDesignContract:{pass:true,source},
    currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',
    canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED'
  }]});
  const result=promoteReadyDesignSeeds({root});
  assert.deepEqual(result.reconciledPromotedSeeds,['g6']);
  const item=read(root,'development-queue.json').items[0];
  assert.equal(item.currentStep,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(item.canonicalState,'TARGET_PLATFORM_REPAIR_REQUIRED');
  assert.equal(read(root,'development-queue.json').items.filter(x=>x.gameId==='g6').length,1);
});

test('preservation presentation metadata remains inside the same direct-native queue item',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-preserve-'));
  base(root);
  write(root,'game-seed-state.json',{version:1,seeds:[{
    seedId:'SP',gameId:'preserve-game',status:'ACTIVE',productionClass:'DESIGN_ONLY',
    INITIAL_TARGET_PLATFORM:'UNITY',REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION:true,
    OWNER_REBUILD_MODE:'PRESERVATION_PRESENTATION_UPGRADE'
  }]});
  writeMinimumDesign(root,'preserve-game');
  promoteReadyDesignSeeds({root});
  const item=read(root,'development-queue.json').items[0];
  assert.equal(item.ownerPreservationPresentationUpgrade,true);
  assert.equal(item.presentationFirstPass,'ASSET_ADAPTATION');
});
