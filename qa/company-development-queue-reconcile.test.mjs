import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {reconcileDevelopmentQueue} from '../tools/company-development-queue-reconcile.mjs';

const write=(root,file,value)=>{
  const target=path.join(root,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value,null,2));
};
function policy(root){
  write(root,'company-learning/platform-release-roadmap.json',{
    directNativeDualPlatformDevelopment:{
      status:'OWNER_DIRECT_LOCKED',
      mode:'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR',
      canonicalDevelopmentAdmissionAuthority:true,
      strictDesignScoreRequiredForDevelopmentAdmission:false,
      legacyWebFirstFallbackForbidden:true
    }
  });
}
function design(root,id,date){
  write(root,`design/${id}/${date}/design-revised.json`,{
    content:{
      identity:'A distinct game identity with clear player fantasy and readable goals.',
      coreFun:'Make meaningful decisions in a repeated action feedback reward loop.',
      coreLoop:['enter the session','perform the core action','receive feedback and reward'],
      signatureSystems:[
        {name:'Risk Choice',purpose:'Players trade safety for stronger rewards.'},
        {name:'Growth Choice',purpose:'Players convert rewards into future options.'}
      ],
      progressionDirection:'Persistent growth unlocks harder encounters and broader tactical choices.',
      failureRetryRisk:{failureStates:['player defeat','objective loss'],retryFlow:'return and rebuild'},
      multiplayerMode:'SINGLE',
      technicalAssumptions:['authoritative gameplay stays separate from presentation','save meaning remains versioned and stable'],
      platformProfiles:{
        ROBLOX:{
          platform:'ROBLOX',inputModel:'touch keyboard and gamepad controls',sessionModel:'fast social Roblox sessions',
          multiplayerRuntime:'Roblox server authoritative replication',performanceBudget:'mobile Roblox effects and memory budget',
          uiUx:'touch-safe Roblox HUD and readable controls',saveAndNetwork:'validated remotes and DataStore save',
          platformContentAdaptation:'Roblox avatar and social adaptation',internalReleaseTarget:'private restricted Roblox test experience',
          validationEvidence:'headless runtime QA independent QA regression evidence'
        },
        UNITY:{
          platform:'UNITY',inputModel:'Unity Input System touch gamepad keyboard',sessionModel:'mobile app suspend and resume sessions',
          multiplayerRuntime:'Unity app authoritative transport model',performanceBudget:'Android memory GPU thermal budget',
          uiUx:'safe-area responsive touch-first Unity UI',saveAndNetwork:'versioned local save and validated sync',
          platformContentAdaptation:'Unity scene prefab lifecycle adaptation',internalReleaseTarget:'internal closed Android app build',
          validationEvidence:'install launch runtime QA independent regression evidence'
        }
      }
    }
  });
}
function base(root){
  policy(root);
  write(root,'game-catalog.json',{games:[]});
  write(root,'game-seed-state.json',{seeds:[]});
  write(root,'development-queue.json',{version:1,items:[]});
}

test('active DEVELOPMENT_CONFIRMED seed with fresh minimum design gets one dual-native queue item',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-direct-native-'));
  try{
    base(root);
    write(root,'game-catalog.json',{games:[{id:'g1',name:'G1',productionClass:'DESIGN_ONLY',lifecycleState:'ACTIVE'}]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'S1',gameId:'g1',gameName:'G1',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    design(root,'g1','2026-09-24');

    const result=reconcileDevelopmentQueue({root});
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    assert.deepEqual(result.created,['g1']);
    assert.equal(queue.items.length,1);
    const item=queue.items[0];
    assert.deepEqual(item.concurrentTargetPlatforms,['ROBLOX','UNITY']);
    assert.equal(item.platformExecutionMode,'ROBLOX_UNITY_CONCURRENT_SAME_GAME');
    assert.equal(item.minimumDesignContract.pass,true);
    assert.equal(item.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
    assert.equal(item.canonicalState,'PENDING_DUAL_NATIVE_SOURCE_BIND');
    assert.equal(item.targetSourcePaths.ROBLOX,'roblox-games/g1');
    assert.equal(item.targetSourcePaths.UNITY,'unity-games/g1');
    assert.equal(Object.hasOwn(item,'webValidationRequired'),false);
    assert.equal(Object.hasOwn(item,'musicValidationRequired'),false);
    assert.equal(queue.developmentGameWipMax,null);
    assert.equal(queue.webValidationPolicy,'OPTIONAL_UNITY_WEB_VALIDATION_SURFACE_NON_BLOCKING');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('DESIGN_ONLY seed removes orphan DEVELOPMENT_CONFIRMED queue row even when catalog is stale confirmed',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-orphan-'));
  try{
    base(root);
    write(root,'game-catalog.json',{games:[{id:'territory-war',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]});
    write(root,'game-seed-state.json',{
      ownerAllGamesDesignReset:{updatedAt:'2026-09-23T00:57:17.385Z',gameIds:['territory-war']},
      seeds:[{gameId:'territory-war',status:'ACTIVE',productionClass:'DESIGN_ONLY'}]
    });
    design(root,'territory-war','2026-09-22');
    write(root,'development-queue.json',{version:1,items:[{
      gameId:'territory-war',productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'TARGET_PLATFORM_SOURCE_BIND',webValidationRequired:false
    }]});

    const result=reconcileDevelopmentQueue({root});
    assert.deepEqual(result.removed,['territory-war']);
    assert.equal(result.removedReasons['territory-war'],'ACTIVE_SEED_NOT_DEVELOPMENT_CONFIRMED');
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    assert.equal(queue.items.length,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('owner reset rejects stale minimum design even if seed still says DEVELOPMENT_CONFIRMED',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-reset-stale-'));
  try{
    base(root);
    write(root,'game-catalog.json',{games:[{id:'g2',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]});
    write(root,'game-seed-state.json',{
      ownerAllGamesDesignReset:{updatedAt:'2026-09-23T00:57:17.385Z',gameIds:['g2']},
      seeds:[{gameId:'g2',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}]
    });
    design(root,'g2','2026-09-22');
    write(root,'development-queue.json',{version:1,items:[{gameId:'g2',productionClass:'DEVELOPMENT_CONFIRMED'}]});
    const result=reconcileDevelopmentQueue({root});
    assert.deepEqual(result.removed,['g2']);
    assert.equal(result.removedReasons.g2,'OWNER_RESET_FRESH_MINIMUM_DESIGN_REQUIRED');
    assert.equal(JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items.length,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('current dual-native progress is preserved while legacy Web fields are scrubbed',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-preserve-'));
  try{
    base(root);
    write(root,'game-catalog.json',{games:[{id:'g3',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]});
    write(root,'game-seed-state.json',{seeds:[{gameId:'g3',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'UNITY'}]});
    design(root,'g3','2026-09-24');
    write(root,'development-queue.json',{version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:20,items:[{
      gameId:'g3',productionClass:'DEVELOPMENT_CONFIRMED',
      minimumDesignContract:{pass:true,source:'design/g3/2026-09-24/design-revised.json'},
      platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      currentStep:'TARGET_PLATFORM_RUNTIME',
      canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
      robloxRuntimeRetryCount:4,
      webSourcePath:'web-games/g3',webValidationRequired:true,musicValidationRequired:true,
      postWebArtbookRequired:true,webInitialCycleStrictScore:99
    }]});

    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.currentStep,'TARGET_PLATFORM_RUNTIME');
    assert.equal(item.canonicalState,'TARGET_PLATFORM_REPAIR_REQUIRED');
    assert.equal(item.robloxRuntimeRetryCount,4);
    assert.equal(item.selectedPlatform,'UNITY');
    for(const key of ['webSourcePath','webValidationRequired','musicValidationRequired','postWebArtbookRequired','webInitialCycleStrictScore']){
      assert.equal(Object.hasOwn(item,key),false,key);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('duplicates collapse and inactive catalog lifecycle removes development admission',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'queue-lifecycle-'));
  try{
    base(root);
    write(root,'game-catalog.json',{games:[
      {id:'active',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
      {id:'paused',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'PAUSED'}
    ]});
    write(root,'game-seed-state.json',{seeds:[
      {gameId:'active',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'},
      {gameId:'paused',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}
    ]});
    design(root,'active','2026-09-24');
    design(root,'paused','2026-09-24');
    write(root,'development-queue.json',{version:1,items:[
      {gameId:'active',customEvidence:'KEEP'},
      {gameId:'active',gameName:'duplicate'},
      {gameId:'paused'}
    ]});
    const result=reconcileDevelopmentQueue({root});
    assert.equal(result.duplicateRemoved,1);
    assert.ok(result.removed.includes('paused'));
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    assert.deepEqual(queue.items.map(x=>x.gameId),['active']);
    assert.equal(queue.items[0].customEvidence,'KEEP');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('workflow reconciles queue independently of active implementation and never restores Web-first gates',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  assert.doesNotMatch(workflow,/game-primary-gate/);
  assert.doesNotMatch(workflow,/DEFER_ACTIVE_GAME_WORK/);
  assert.doesNotMatch(workflow,/COMPANY_FLOW\.md/);
  assert.match(workflow,/tools\/company-minimum-design-contract\.mjs/);
  assert.match(workflow,/game-seed-state\.json/);
  assert.match(workflow,/MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT/);
  assert.match(workflow,/OPTIONAL_UNITY_WEB_VALIDATION_SURFACE_NON_BLOCKING/);
  assert.match(workflow,/ONE_PLATFORM_REQUEST_STARTS_BOTH/);
});
