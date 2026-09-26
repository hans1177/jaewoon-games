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
  identity:'Direct native cross-platform test game identity',
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
    webDevelopmentStageRemoved:false,unityWebEnabled:true,unityWebRequired:true,unityWebGateRequired:true,
    unityWebMode:'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR',
    upperPlatformAdmission:'UPPER_PLATFORM_DEVELOPMENT_READY',
    supportedDevelopmentPlatforms:['ROBLOX','UNITY'],
    automaticPairing:{
      ROBLOX:['UNITY_WEB_FLOOR','ROBLOX','UNITY'],
      UNITY:['UNITY_WEB_FLOOR','UNITY','ROBLOX']
    },
    development:{
      unityWebDevelopmentFloorRequiredBeforeUpperPlatformStart:true,
      upperPlatformDevelopmentStartsOnlyAfterUnityWebReadinessPass:true
    },
    upperPlatformDevelopmentReadinessGate:{
      gateId:'UPPER_PLATFORM_DEVELOPMENT_READY',allCriteriaRequired:true,targets:['ROBLOX','UNITY']
    }
  },
  developmentLifecycleMachine:{saveNormalization:{
    authority:'MACHINE_EXECUTION_CONTRACT',preserveExistingCompatibleSaveMeaning:true,
    canonicalWebModule:'assets/save-versioning.js',webRestoreEvidenceEvaluator:'tools/company-web-save-restore-evidence.mjs'
  }}
});

test('queue reconciler accepts the canonical Unity Web floor contract and rejects the removed-stage drift',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-policy-drift-'));
  try{
    writePolicy(root);
    assert.doesNotThrow(()=>reconcileDevelopmentQueue({root}));
    const policyFile=path.join(root,'company-learning/platform-release-roadmap.json');
    const policy=JSON.parse(fs.readFileSync(policyFile,'utf8'));
    policy.directNativeDualPlatformDevelopment.webDevelopmentStageRemoved=true;
    write(root,'company-learning/platform-release-roadmap.json',policy);
    assert.throws(()=>reconcileDevelopmentQueue({root}),/CANONICAL_DIRECT_NATIVE_POLICY_REQUIRED/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
    write(root,'development-queue.json',{
      version:1,routerPolicy:'COMPANY_FLOW.md',developmentGameWipMax:20,
      webValidationPolicy:'LEGACY',webValidationContractVersion:4,webGateRequired:true,webValidationParallelism:20,
      robloxSourceParallelism:6,robloxTechnicalParallelism:6,webValidationEvidenceSchemaMinimum:15,webPromotionRevalidationRequired:true,
      ownerPrimaryDevelopment:{authority:'OWNER',maxConcurrentPrimary:3},
      fastLaunch:{strategy:'FAST_MVP',newFeatureExpansionFrozen:true},
      items:[
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
        webValidationRequired:true,musicValidationRequired:true,webSourcePath:'web-games/progressed',newFeatureExpansionFrozen:true
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
      assert.equal(Object.hasOwn(item,'newFeatureExpansionFrozen'),false);
      assert.equal(item.saveNormalizationRequired,true);
      assert.equal(item.saveMeaningPreservationRequired,true);
    }
    assert.equal(queue.routerPolicy,'company-learning/platform-release-roadmap.json');
    assert.equal(queue.nativeDevelopmentPolicy,'MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT');
    assert.equal(queue.developmentGameWipMax,null);
    assert.equal(queue.reconciliationPolicy,'ACTIVE_SEED_PLUS_MINIMUM_DESIGN_DIRECT_NATIVE');
    assert.equal(queue.internalConcurrencyCap,null);
    assert.equal(queue.externalCapacityOnlyBoundary,true);
    assert.equal(queue.automaticFeatureExpansionFreezeForbidden,true);
    for(const key of ['webValidationPolicy','webValidationContractVersion','webGateRequired','webValidationParallelism','robloxSourceParallelism','robloxTechnicalParallelism','webValidationEvidenceSchemaMinimum','webPromotionRevalidationRequired']){
      assert.equal(Object.hasOwn(queue,key),false,key);
    }
    assert.equal(Object.hasOwn(queue.ownerPrimaryDevelopment,'maxConcurrentPrimary'),false);
    assert.equal(Object.hasOwn(queue.fastLaunch,'newFeatureExpansionFrozen'),false);
    assert.equal(result.legacyQueueMetadataRemoved,true);

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
  assert.match(workflow,/Checkout main engine[\s\S]*fetch-depth:\s*1/);
  assert.match(workflow,/Checkout main engine[\s\S]*fetch-tags:\s*false/);
  assert.doesNotMatch(workflow,/Checkout main engine[\s\S]*fetch-depth:\s*0/);
  const source=fs.readFileSync('tools/company-development-queue-reconcile.mjs','utf8');
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


test('queue reconcile treats Vibe queue telemetry as observational and never defers',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  assert.match(workflow,/ref=main/);
  assert.match(workflow,/GAME_PRIMARY_GATE=RUN_PARALLEL_QUEUE_TELEMETRY_UNAVAILABLE/);
  assert.match(workflow,/GAME_PRIMARY_GATE=RUN_PARALLEL_QUEUE_TELEMETRY_INVALID/);
  assert.match(workflow,/GAME_PRIMARY_GATE=RUN_PARALLEL_RECONCILE/);
  assert.doesNotMatch(workflow,/vibe2-unreal-core/);
  assert.doesNotMatch(workflow,/DEFER_ACTIVE_GAME_WORK/);
  assert.doesNotMatch(workflow,/DEFER_QUEUE_INVALID/);
  assert.doesNotMatch(workflow,/DEFER_QUEUE_UNAVAILABLE/);
});


test('reconcile trigger bursts serialize and status feedback is change-driven',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-queue-reconcile.yml','utf8');
  const statusWorkflow=fs.readFileSync('.github/workflows/company-status-sync.yml','utf8');
  assert.match(workflow,/group: company-development-queue-reconcile-runtime\s+cancel-in-progress: false/);
  assert.doesNotMatch(workflow,/group: company-development-queue-reconcile-runtime\s+cancel-in-progress: true/);
  assert.match(workflow,/steps\.queue_state\.outputs\.changed == '1'/);
  assert.match(workflow,/gh workflow run company-status-sync\.yml/);
  assert.match(workflow,/COMPANY_STATUS_SYNC_DISPATCHED=QUEUE_CHANGED/);
  assert.match(workflow,/workflow_run:[\s\S]*- Company Status Sync/);
  const statusWorkflowRun=statusWorkflow.match(/workflow_run:\s*\n\s*workflows:\s*\n([\s\S]*?)\n\s*types:/)?.[1]||'';
  assert.doesNotMatch(statusWorkflowRun,/Company Development Queue Reconcile/);
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const state=roadmap.minimumNecessaryProcedurePolicy?.execution?.stateReconciliation;
  assert.equal(state?.serializeStateWrites,true);
  assert.equal(state?.cancelRunningReconcileOnNewTrigger,false);
  assert.equal(state?.repeatedWorkflowRunTriggersMayNotCausePerpetualCancellation,true);
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const topology=architecture.nonblockingCoordinationTelemetryTopology?.reconcileConcurrency;
  assert.equal(topology?.stateWritesSerialized,true);
  assert.equal(topology?.queueMutationDispatchesStatusSync,true);
  assert.equal(topology?.unconditionalQueueCompletionStatusSyncTrigger,false);
  const logMap=JSON.parse(fs.readFileSync('company-learning/company-log-map.json','utf8'));
  assert.equal(logMap.reconcileCancellationChurnContract?.queueMutationStatusSyncMarker,'COMPANY_STATUS_SYNC_DISPATCHED=QUEUE_CHANGED');
});


test('queue reconcile restores exact private Roblox candidate checkpoint instead of source-bind regression',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-runtime-checkpoint-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[{
      id:'runtime-checkpoint',name:'Runtime Checkpoint',productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    }]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'R',gameId:'runtime-checkpoint',status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    const source=writeDesign(root,'runtime-checkpoint');
    const revision='c'.repeat(40),artifact='sha256:'+'d'.repeat(64);
    write(root,'development-queue.json',{items:[{
      gameId:'runtime-checkpoint',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
      selectedPlatform:'ROBLOX',currentStep:'TARGET_PLATFORM_SOURCE_BIND',
      canonicalState:'PENDING_DUAL_NATIVE_SOURCE_BIND',
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      minimumDesignContract:{pass:true,source},
      robloxSourceCommit:revision,
      robloxBuildArtifactIdentity:artifact,
      robloxRuntimeCandidateEvidence:{
        published:true,sourceRevision:revision,artifactIdentity:artifact,
        versionNumber:12,universeId:'1',placeId:'2'
      }
    }]});
    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.currentStep,'TARGET_PLATFORM_RUNTIME_FOUNDATION');
    assert.equal(item.canonicalState,'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED');
    assert.equal(item.robloxRuntimeCandidateEvidence.versionNumber,12);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('queue reconcile migrates exact shared Roblox fallback candidate to dedicated-target redeploy without rebuilding F0',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-shared-target-migration-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[{
      id:'shared-migrate',name:'Shared Migrate',productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    }]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'R',gameId:'shared-migrate',status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    const source=writeDesign(root,'shared-migrate');
    const revision='e'.repeat(40),artifact='sha256:'+'f'.repeat(64);
    write(root,'development-queue.json',{items:[{
      gameId:'shared-migrate',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
      selectedPlatform:'ROBLOX',currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
      canonicalState:'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED',
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      minimumDesignContract:{pass:true,source},
      robloxSourceCommit:revision,
      robloxBuildSourceRevision:revision,
      robloxBuildArtifactIdentity:artifact,
      robloxBuildOrPackagePassed:true,
      robloxBuildPreflightPassed:true,
      robloxFoundationF0Passed:true,
      robloxRuntimePassed:false,
      robloxPublicationTarget:{
        version:2,gameId:'shared-migrate',universeId:'10766974456',placeId:'112507741861842',
        verified:true,source:'owner-pinned-open-cloud-target',internalOnly:true
      },
      robloxRuntimeCandidateEvidence:{
        published:true,sourceRevision:revision,artifactIdentity:artifact,
        versionNumber:22,universeId:'10766974456',placeId:'112507741861842'
      }
    }]});
    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.currentStep,'PRIVATE_RUNTIME_CANDIDATE_DEPLOY');
    assert.equal(item.canonicalState,'F0_SOURCE_PREFLIGHT_PASSED');
    assert.equal(item.robloxBuildOrPackagePassed,true);
    assert.equal(item.robloxBuildPreflightPassed,true);
    assert.equal(item.robloxFoundationF0Passed,true);
    assert.equal(item.robloxFailureSignature,'ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING');
    assert.deepEqual(item.routingBlockers,['roblox-dedicated-runtime-target-migration-pending']);
    assert.equal(item.robloxDedicatedTargetMigration.state,'PENDING_DEDICATED_PRIVATE_TARGET');
    assert.equal(item.robloxPublicationTarget.source,'owner-pinned-open-cloud-target');
    assert.equal(item.robloxRuntimeCandidateEvidence.versionNumber,22);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('queue reconcile never demotes an already published internal Roblox release for dedicated-target migration',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-internal-release-preserve-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[{
      id:'released-shared',name:'Released Shared',productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    }]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'R',gameId:'released-shared',status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    const source=writeDesign(root,'released-shared');
    const revision='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
    const releaseEvidence={
      published:true,sourceRevision:revision,artifactIdentity:artifact,
      versionNumber:31,universeId:'10766974456',placeId:'112507741861842',
      visibilityIntent:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE',
      authority:'owner-confirmed-internal-release'
    };
    write(root,'development-queue.json',{items:[{
      gameId:'released-shared',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
      selectedPlatform:'ROBLOX',currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      minimumDesignContract:{pass:true,source},
      robloxSourceCommit:revision,
      robloxBuildSourceRevision:revision,
      robloxBuildArtifactIdentity:artifact,
      robloxBuildOrPackagePassed:true,
      robloxBuildPreflightPassed:true,
      robloxFoundationF0Passed:true,
      robloxInternalReleasePublished:true,
      robloxInternalReleaseEvidence:releaseEvidence,
      robloxPublicationTarget:{
        version:2,gameId:'released-shared',universeId:'10766974456',placeId:'112507741861842',
        verified:true,source:'owner-pinned-open-cloud-target',internalOnly:true
      },
      robloxRuntimeCandidateEvidence:{
        published:true,sourceRevision:revision,artifactIdentity:artifact,
        versionNumber:31,universeId:'10766974456',placeId:'112507741861842'
      },
      robloxFailureStage:'ACTUAL_VIBE_INTERNAL_PLAY',
      robloxFailureSignature:'ROBLOX_INTERNAL_VIBE_PLAY_PENDING',
      routingBlockers:['roblox-internal-vibe-play-pending']
    }]});
    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.currentStep,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
    assert.equal(item.canonicalState,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
    assert.equal(item.robloxInternalReleasePublished,true);
    assert.equal(item.robloxInternalReleaseEvidence.versionNumber,31);
    assert.equal(item.robloxFailureSignature,'ROBLOX_INTERNAL_VIBE_PLAY_PENDING');
    assert.deepEqual(item.routingBlockers,['roblox-internal-vibe-play-pending']);
    assert.equal(item.robloxDedicatedTargetMigration,undefined);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('queue reconcile repairs stale pre-release canonical state after Roblox internal release while keeping parallel revalidation currentStep',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-internal-umbrella-repair-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[{
      id:'released-revalidation',name:'Released Revalidation',productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    }]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'R',gameId:'released-revalidation',status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    const source=writeDesign(root,'released-revalidation');
    const revision='1'.repeat(40),artifact='sha256:'+'2'.repeat(64);
    write(root,'development-queue.json',{items:[{
      gameId:'released-revalidation',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
      selectedPlatform:'ROBLOX',currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
      canonicalState:'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED',
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      minimumDesignContract:{pass:true,source},
      robloxSourceCommit:revision,
      robloxBuildSourceRevision:revision,
      robloxBuildArtifactIdentity:artifact,
      robloxBuildOrPackagePassed:true,
      robloxBuildPreflightPassed:true,
      robloxFoundationF0Passed:true,
      robloxInternalReleasePublished:true,
      robloxInternalReleaseReady:true,
      robloxInternalReleaseEvidence:{
        published:true,sourceRevision:revision,artifactIdentity:artifact,
        versionNumber:22,universeId:'10767445769',placeId:'126302702438348'
      },
      robloxRuntimeCandidateEvidence:{
        published:true,sourceRevision:revision,artifactIdentity:artifact,
        versionNumber:22,universeId:'10767445769',placeId:'126302702438348'
      },
      robloxFailureStage:'VIBE_INTERNAL_PLAY',
      robloxFailureSignature:'ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING',
      routingBlockers:['roblox-studio-mcp-infrastructure-pending']
    }]});
    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.currentStep,'TARGET_PLATFORM_RUNTIME_FOUNDATION');
    assert.equal(item.canonicalState,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
    assert.equal(item.robloxInternalReleasePublished,true);
    assert.equal(item.robloxFailureStage,'VIBE_INTERNAL_PLAY');
    assert.equal(item.robloxFailureSignature,'ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING');
    assert.deepEqual(item.routingBlockers,['roblox-studio-mcp-infrastructure-pending']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('queue reconcile does not hide a real post-release repair state behind the internal buildup umbrella',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-internal-repair-preserve-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[{
      id:'released-repair',name:'Released Repair',productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    }]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'R',gameId:'released-repair',status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    const source=writeDesign(root,'released-repair');
    write(root,'development-queue.json',{items:[{
      gameId:'released-repair',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
      selectedPlatform:'ROBLOX',currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      canonicalState:'REPAIR_REQUIRED',
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
      minimumDesignContract:{pass:true,source},
      robloxInternalReleasePublished:true,
      robloxInternalReleaseReady:true,
      robloxInternalReleaseEvidence:{published:true,versionNumber:22,universeId:'1',placeId:'2'},
      robloxFailureStage:'VIBE_INTERNAL_PLAY',
      robloxFailureSignature:'ROBLOX_STUDIO_MCP_RUNTIME_ERROR',
      routingBlockers:['roblox-studio-mcp-play-repair-required']
    }]});
    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.canonicalState,'REPAIR_REQUIRED');
    assert.equal(item.robloxFailureSignature,'ROBLOX_STUDIO_MCP_RUNTIME_ERROR');
    assert.deepEqual(item.routingBlockers,['roblox-studio-mcp-play-repair-required']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('queue reconcile restores durable dedicated Roblox target identity before shared fallback migration',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'direct-queue-dedicated-registry-'));
  try{
    writePolicy(root);
    write(root,'game-catalog.json',{games:[{
      id:'registry-target',name:'Registry Target',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',selectedPlatform:'ROBLOX'
    }]});
    write(root,'game-seed-state.json',{seeds:[{
      seedId:'R',gameId:'registry-target',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX'
    }]});
    writeDesign(root,'registry-target');
    write(root,'roblox-dedicated-targets.json',{version:1,targets:[{
      gameId:'registry-target',universeId:'10767445769',placeId:'126302702438348',
      dedicated:true,shared:false,verified:true,source:'owner-dedicated-github-bootstrap',bootstrapState:'PUBLISHED_PRIVATE'
    }]});
    write(root,'development-queue.json',{items:[]});
    reconcileDevelopmentQueue({root});
    const item=JSON.parse(fs.readFileSync(path.join(root,'development-queue.json'),'utf8')).items[0];
    assert.equal(item.robloxPublicationTarget.universeId,'10767445769');
    assert.equal(item.robloxPublicationTarget.placeId,'126302702438348');
    assert.equal(item.robloxPublicationTarget.dedicated,true);
    assert.equal(item.robloxSharedTargetCurrent,false);
    assert.equal(item.robloxDedicatedTargetRegistryBinding.source,'roblox-dedicated-targets.json');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
