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
const designContent=()=>({
  identity:'Direct native test game',
  coreFun:'Repeat a readable action and improve across sessions.',
  coreLoop:['prepare','play','resolve','upgrade'],
  signatureSystems:[{name:'Core Action',purpose:'main loop'},{name:'Growth',purpose:'progression'}],
  progressionDirection:'Persistent unlocks improve future sessions.',
  failureRetryRisk:{failureStates:['defeat','failed objective'],retryFlow:'restart stronger'},
  multiplayerMode:'COOP',
  technicalAssumptions:['authoritative gameplay separated from presentation','save meaning remains stable across platforms'],
  platformProfiles:{
    ROBLOX:{
      platform:'ROBLOX',inputModel:'touch keyboard gamepad',sessionModel:'drop-in session',
      multiplayerRuntime:'server authoritative replication',performanceBudget:'mobile effect budget',
      uiUx:'touch-safe HUD',saveAndNetwork:'DataStore and validated remotes',
      platformContentAdaptation:'Roblox-native avatars and social flow',
      internalReleaseTarget:'private owner playtest',validationEvidence:'headless runtime qa regression'
    },
    UNITY:{
      platform:'UNITY',inputModel:'Input System touch gamepad',sessionModel:'app suspend resume',
      multiplayerRuntime:'authoritative app transport',performanceBudget:'Android memory thermal budget',
      uiUx:'safe-area touch UI',saveAndNetwork:'versioned local save and validated sync',
      platformContentAdaptation:'scene prefab app lifecycle',
      internalReleaseTarget:'closed Android build',validationEvidence:'install runtime qa regression'
    }
  }
});
const writeDesign=(root,id,date='2026-09-23')=>{
  const file=`design/${id}/${date}/design-revised.json`;
  write(root,file,{gameId:id,content:designContent()});
  return file;
};
const writePolicy=root=>write(root,'company-learning/platform-release-roadmap.json',{
  authority:'MACHINE_EXECUTION_CONTRACT',
  directNativeDualPlatformDevelopment:{
    status:'OWNER_DIRECT_LOCKED',mode:'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR',
    canonicalDevelopmentAdmissionAuthority:true,minimumDesignRequired:true,
    strictDesignScoreRequiredForDevelopmentAdmission:false,legacyWebFirstFallbackForbidden:true,
    webDevelopmentStageRemoved:true,supportedDevelopmentPlatforms:['ROBLOX','UNITY'],
    unityWebValidationSurface:{requiredForDevelopmentAdmission:false}
  },
  developmentLifecycleMachine:{saveNormalization:{
    authority:'MACHINE_EXECUTION_CONTRACT',preserveExistingCompatibleSaveMeaning:true,
    canonicalWebModule:'assets/save-versioning.js',webRestoreEvidenceEvaluator:'tools/company-web-save-restore-evidence.mjs'
  }}
});

test('keeps only active confirmed seeds with valid minimum design and preserves native progress',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[
      {id:'new-native',name:'New',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'},
      {id:'progressed',name:'Progressed',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'REBUILD',selectedPlatform:'UNITY'},
      {id:'paused',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'PAUSED',selectedPlatform:'ROBLOX'},
      {id:'design-only',productionClass:'DESIGN_ONLY',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'}
    ]});
    write(root,'game-seed-state.json',{seeds:[
      {seedId:'N',gameId:'new-native',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'},
      {seedId:'P',gameId:'progressed',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'UNITY'},
      {seedId:'X',gameId:'paused',status:'PAUSED',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'},
      {seedId:'D',gameId:'design-only',status:'ACTIVE',productionClass:'DESIGN_ONLY',selectedPlatform:'ROBLOX'}
    ]});
    const newDesign=writeDesign(root,'new-native');
    const progressedDesign=writeDesign(root,'progressed');
    writeDesign(root,'paused');
    write(root,'development-queue.json',{version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:20,items:[
      {
        gameId:'progressed',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
        selectedPlatform:'UNITY',currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',
        canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',customEvidence:'KEEP',
        concurrentTargetPlatforms:['ROBLOX','UNITY'],platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
        minimumDesignContract:{pass:true,source:progressedDesign},
        platformDesignProfiles:{
          ROBLOX:{source:progressedDesign,jsonPointer:'/content/platformProfiles/ROBLOX'},
          UNITY:{source:progressedDesign,jsonPointer:'/content/platformProfiles/UNITY'}
        },
        webValidationRequired:true,musicValidationRequired:true,webSourcePath:'web-games/progressed'
      },
      {gameId:'progressed',gameName:'duplicate'},
      {gameId:'paused',currentStep:'WEB_PLAYABLE_BOOTSTRAP'},
      {gameId:'design-only',currentStep:'WEB_GAMEPLAY_AND_MUSIC_VALIDATION'}
    ]});

    const result=reconcileDevelopmentQueue({root});
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    assert.deepEqual(queue.items.map(x=>x.gameId).sort(),['new-native','progressed']);
    assert.equal(queue.items.filter(x=>x.gameId==='progressed').length,1);
    assert.equal(result.duplicateRemoved,1);
    assert.ok(result.removed.includes('paused'));
    assert.ok(result.removed.includes('design-only'));

    const progressed=queue.items.find(x=>x.gameId==='progressed');
    assert.equal(progressed.currentStep,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
    assert.equal(progressed.canonicalState,'TARGET_PLATFORM_REPAIR_REQUIRED');
    assert.equal(progressed.customEvidence,'KEEP');
    assert.equal(progressed.minimumDesignContract.source,progressedDesign);

    const created=queue.items.find(x=>x.gameId==='new-native');
    assert.equal(created.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
    assert.equal(created.canonicalState,'PENDING_DUAL_NATIVE_SOURCE_BIND');
    assert.equal(created.minimumDesignContract.source,newDesign);
    assert.deepEqual(created.concurrentTargetPlatforms,['ROBLOX','UNITY']);
    assert.equal(created.platformExecutionMode,'ROBLOX_UNITY_CONCURRENT_SAME_GAME');
    assert.equal(created.targetSourcePaths.ROBLOX,'roblox-games/new-native');
    assert.equal(created.targetSourcePaths.UNITY,'unity-games/new-native');

    for(const item of queue.items){
      assert.equal(item.minimumDesignContract.pass,true);
      assert.equal(item.platformDesignProfiles.ROBLOX.source,item.minimumDesignContract.source);
      assert.equal(item.platformDesignProfiles.UNITY.source,item.minimumDesignContract.source);
      assert.equal(Object.hasOwn(item,'webValidationRequired'),false);
      assert.equal(Object.hasOwn(item,'musicValidationRequired'),false);
      assert.equal(Object.hasOwn(item,'webSourcePath'),false);
      assert.equal(item.saveNormalizationRequired,true);
      assert.equal(item.saveMeaningPreservationRequired,true);
    }
    assert.equal(queue.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(queue.nativeDevelopmentPolicy,'MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT');
    assert.equal(queue.developmentGameWipMax,null);
    assert.equal(queue.reconciliationPolicy,'ACTIVE_SEED_PLUS_MINIMUM_DESIGN_DIRECT_NATIVE');

    const repeat=reconcileDevelopmentQueue({root});
    assert.equal(repeat.changed,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('stale catalog or queue promotion cannot survive DESIGN_ONLY or paused seed state',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'stale-direct-queue-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[
      {id:'stale-design',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
      {id:'stale-paused',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}
    ]});
    write(root,'game-seed-state.json',{seeds:[
      {gameId:'stale-design',status:'ACTIVE',productionClass:'DESIGN_ONLY'},
      {gameId:'stale-paused',status:'PAUSED',productionClass:'DEVELOPMENT_CONFIRMED'}
    ]});
    writeDesign(root,'stale-design');writeDesign(root,'stale-paused');
    write(root,'development-queue.json',{items:[
      {gameId:'stale-design',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'TARGET_PLATFORM_SOURCE_BIND'},
      {gameId:'stale-paused',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'TARGET_PLATFORM_SOURCE_BIND'}
    ]});
    const result=reconcileDevelopmentQueue({root});
    const queue=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8'));
    assert.equal(queue.items.length,0);
    assert.deepEqual(result.removed.sort(),['stale-design','stale-paused']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('reconciler source contains no Web-first admission state',()=>{
  const source=fs.readFileSync('tools/company-development-queue-reconcile.mjs','utf8');
  for(const forbidden of [
    'WEB_PLAYABLE_BOOTSTRAP','WEB_GAMEPLAY_AND_MUSIC_VALIDATION','AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
    'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION','webValidationRequired=true','musicValidationRequired=true'
  ])assert.equal(source.includes(forbidden),false,forbidden);
});

test('workflow persists only direct-native queue state and dispatches runtime only when queue is nonempty',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  assert.match(workflow,/id:\s*queue_state/);
  assert.match(workflow,/steps\.queue_state\.outputs\.queue_count != '0'/);
  assert.match(workflow,/company-minimum-design-contract\.mjs/);
  assert.match(source,/game-seed-state\.json/);
  assert.match(workflow,/MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT/);
  assert.match(workflow,/UNITY_WEB_ADMISSION_AUTHORITY=NONE/);
  assert.doesNotMatch(workflow,/COMPANY_FLOW\.md/);
  assert.doesNotMatch(workflow,/webValidationRequired!==true/);
  assert.doesNotMatch(workflow,/musicValidationRequired!==true/);
});
