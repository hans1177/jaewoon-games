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
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const LEGACY_KEYS=[
  'webPurpose','webCompanionRequired','webValidationRequired','webGameplayValidationRequired','musicValidationRequired',
  'webSourcePath','webFirstGatePassed','webSecondGateRequired','postWebArtbookRequired'
];

function roadmap(){
  return {
    directNativeDualPlatformDevelopment:{
      status:'OWNER_DIRECT_LOCKED',
      mode:'ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR',
      canonicalDevelopmentAdmissionAuthority:true,
      strictDesignScoreRequiredForDevelopmentAdmission:false,
      legacyWebFirstFallbackForbidden:true,
      supportedDevelopmentPlatforms:['ROBLOX','UNITY']
    },
    developmentLifecycleMachine:{
      saveNormalization:{
        authority:'MACHINE_EXECUTION_CONTRACT',
        preserveExistingCompatibleSaveMeaning:true,
        canonicalWebModule:'assets/save-versioning.js',
        webRestoreEvidenceEvaluator:'tools/company-web-save-restore-evidence.mjs'
      }
    }
  };
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
function writeDesign(root,gameId,date='2026-09-23'){
  const file=`design/${gameId}/${date}/design-revised.json`;
  write(root,file,{gameId,content:designContent()});
  return file;
}
function setupRoot(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-native-queue-reconcile-'));
  write(root,'company-learning/platform-release-roadmap.json',roadmap());
  return root;
}

test('guarantees only minimum-design-ready direct-native queue rows and preserves current native progress',()=>{
  const root=setupRoot();
  try{
    const progressedDesign=writeDesign(root,'progressed');
    writeDesign(root,'cozy-island');
    writeDesign(root,'stale-web');
    write(root,'game-catalog.json',{games:[
      {id:'cozy-island',name:'포근섬',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'},
      {id:'progressed',name:'진행게임',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'REBUILD',selectedPlatform:'UNITY'},
      {id:'stale-web',name:'옛웹게임',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX',webDevelopmentResetRequired:true},
      {id:'missing-design',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'},
      {id:'paused',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'PAUSED'},
      {id:'design-only',productionClass:'DESIGN_ONLY',lifecycleState:'ACTIVE'}
    ]});
    write(root,'development-queue.json',{version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:20,webValidationPolicy:'LEGACY',items:[
      {
        gameId:'progressed',productionClass:'DEVELOPMENT_CONFIRMED',
        currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION',canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
        selectedPlatform:'UNITY',concurrentTargetPlatforms:['ROBLOX','UNITY'],
        minimumDesignContract:{pass:true,source:progressedDesign},
        customEvidence:'KEEP',webValidationRequired:false,musicValidationRequired:false,
        artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER'
      },
      {gameId:'progressed',gameName:'중복'},
      {
        gameId:'stale-web',productionClass:'DEVELOPMENT_CONFIRMED',
        currentStep:'WEB_CONTENT_EXPANSION',canonicalState:'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION',
        webValidationRequired:true,musicValidationRequired:true,webSourcePath:'web-games/stale-web'
      },
      {gameId:'paused',currentStep:'WEB_PLAYABLE_BOOTSTRAP'},
      {gameId:'missing-from-catalog',currentStep:'WEB_PLAYABLE_BOOTSTRAP'}
    ]});

    const result=reconcileDevelopmentQueue({root});
    const queue=read(root,'development-queue.json');
    const ids=queue.items.map(x=>x.gameId);
    assert.deepEqual(ids,['cozy-island','progressed','stale-web']);
    assert.equal(result.duplicateRemoved,1);
    assert.ok(result.removed.includes('paused'));
    assert.ok(result.removed.includes('missing-from-catalog'));
    assert.deepEqual(result.missingMinimumDesign,['missing-design']);

    const progressed=queue.items.find(x=>x.gameId==='progressed');
    assert.equal(progressed.currentStep,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
    assert.equal(progressed.canonicalState,'TARGET_PLATFORM_REPAIR_REQUIRED');
    assert.equal(progressed.customEvidence,'KEEP');
    assert.equal(progressed.sourcePath,'unity-games/progressed');
    assert.equal(progressed.targetSourcePaths.ROBLOX,'roblox-games/progressed');
    assert.equal(progressed.targetSourcePaths.UNITY,'unity-games/progressed');

    const cozy=queue.items.find(x=>x.gameId==='cozy-island');
    assert.equal(cozy.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
    assert.equal(cozy.canonicalState,'PENDING_DUAL_NATIVE_SOURCE_BIND');
    assert.equal(cozy.sourcePath,'roblox-games/cozy-island');
    assert.equal(cozy.minimumDesignContract.pass,true);

    const stale=queue.items.find(x=>x.gameId==='stale-web');
    assert.equal(stale.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
    assert.equal(stale.canonicalState,'PENDING_DUAL_NATIVE_SOURCE_BIND');
    assert.equal(stale.sourcePath,'roblox-games/stale-web');
    assert.equal(Object.hasOwn(stale,'ownerWebDevelopmentResetAppliedFor'),false);

    for(const item of queue.items){
      assert.equal(item.productionClass,'DEVELOPMENT_CONFIRMED');
      assert.deepEqual(item.concurrentTargetPlatforms,['ROBLOX','UNITY']);
      assert.equal(item.platformExecutionMode,'ROBLOX_UNITY_CONCURRENT_SAME_GAME');
      assert.ok(item.platformDesignProfiles.ROBLOX.source);
      assert.ok(item.platformDesignProfiles.UNITY.source);
      assert.equal(item.artbookTiming,'PARALLEL_NATIVE_PRESENTATION_SUPPORT');
      for(const key of LEGACY_KEYS)assert.equal(Object.hasOwn(item,key),false,`${item.gameId}:${key}`);
      assert.equal(item.saveNormalizationRequired,true);
      assert.equal(item.saveMeaningPreservationRequired,true);
    }
    assert.equal(queue.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(queue.nativeDevelopmentPolicy,'MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT');
    assert.equal(queue.reconciliationPolicy,'DIRECT_NATIVE_MINIMUM_DESIGN_CATALOG_RECONCILE');
    assert.equal(queue.developmentGameWipMax,null);
    assert.equal(Object.hasOwn(queue,'webValidationPolicy'),false);

    const repeat=reconcileDevelopmentQueue({root});
    assert.equal(repeat.changed,false);
    assert.equal(repeat.queueCount,3);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('repairs metadata-only legacy queue policy without creating an artificial WIP cap',()=>{
  const root=setupRoot();
  try{
    write(root,'game-catalog.json',{games:[]});
    write(root,'development-queue.json',{
      version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:20,
      webValidationPolicy:'LEGACY',items:[]
    });
    const result=reconcileDevelopmentQueue({root});
    const queue=read(root,'development-queue.json');
    assert.equal(result.changed,true);
    assert.equal(queue.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(queue.developmentGameWipMax,null);
    assert.equal(Object.hasOwn(queue,'webValidationPolicy'),false);
    assert.equal(reconcileDevelopmentQueue({root}).changed,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('queue reconcile workflow validates minimum design and native-only queue invariants',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  assert.match(workflow,/tools\/company-minimum-design-contract\.mjs/);
  assert.match(workflow,/latestMinimumDesign/);
  assert.match(workflow,/dual native targets missing/);
  assert.match(workflow,/legacy Web admission key remains/);
  assert.match(workflow,/artificial global development WIP cap restored/);
  assert.match(workflow,/DEVELOPMENT_QUEUE_MODE=DIRECT_NATIVE_ROBLOX_UNITY/);
  assert.match(workflow,/steps\.queue_state\.outputs\.queue_count != '0'/);
  assert.doesNotMatch(workflow,/COMPANY_FLOW\.md/);
  assert.doesNotMatch(workflow,/webValidationRequired!==true/);
  assert.doesNotMatch(workflow,/musicValidationRequired!==true/);
});
