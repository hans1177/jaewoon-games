// Canonical DEVELOPMENT_CONFIRMED direct-native queue reconciliation.
// Authority: machine roadmap + active GAME_SEED + minimum dual-platform design.
// This reconciler never creates Web-first admission state.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {latestMinimumDesign} from './company-minimum-design-contract.mjs';
import {resolveSelectedPlatform} from './company-selected-platform-router.mjs';

const MACHINE_POLICY_SOURCE='company-learning/platform-release-roadmap.json';
const ACTIVE_LIFECYCLE=new Set(['ACTIVE','REBUILD']);
const ACTIVE_SEED_STATUS=new Set(['ACTIVE']);
const DIRECT_PLATFORMS=Object.freeze(['ROBLOX','UNITY']);
const DEDICATED_TARGET_REGISTRY='roblox-dedicated-targets.json';
const LEGACY_WEB_ADMISSION_KEYS=Object.freeze([
  'webPurpose','webCompanionRequired','webValidationRequired','webGameplayValidationRequired','musicValidationRequired',
  'webEvidenceMayReplaceNativePlatformEvidence','webBeforeTargetPlatformByDefault','webSourcePath','webFirstGatePassed',
  'webSecondGateRequired','webPlatformHandoff','unityWebFirstStagePassed','vibeWebImplementationRequired',
  'vibeWebRequestedStage','vibeWebImplementationReason','postPromotionArtbookRequired','postWebArtbookRequired',
  'webValidationPassedAt','musicValidationPassed','webPromotionRevalidationPassed','formalImplementationPassed',
  'formalImplementationVerdict','webInitialCyclePassed','webInitialCyclePassedAt','webInitialCycleEvidencePath',
  'webInitialCycleSourcePath','webInitialCycleSourceIndexSha256','webInitialCycleDesignBaselineSha256',
  'webInitialCycleValidationSchemaVersion','webInitialCycleStrictScore','webInitialCycleStrictReviewPath',
  'webInitialCycleSourceRevision','webInitialCycleMusicValidationPassed','homepageTestEligible','homepageTestCandidate',
  'homepageTestScore','homepageTestVerdict','ownerWebDevelopmentResetAppliedFor','ownerWebDevelopmentResetAppliedAt',
  'newFeatureExpansionFrozen'
]);

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const directPaths=gameId=>({ROBLOX:`roblox-games/${gameId}`,UNITY:`unity-games/${gameId}`});
const removeLegacy=item=>{for(const key of LEGACY_WEB_ADMISSION_KEYS)delete item[key];return item;};
function clearLegacyQueueCaps(queue={}){
  let changed=false;
  for(const key of [
    'webValidationPolicy','webValidationContractVersion','webGateRequired','webValidationParallelism',
    'robloxSourceParallelism','robloxTechnicalParallelism','webValidationEvidenceSchemaMinimum',
    'webPromotionRevalidationRequired'
  ]){
    if(Object.hasOwn(queue,key)){delete queue[key];changed=true;}
  }
  if(queue.ownerPrimaryDevelopment&&Object.hasOwn(queue.ownerPrimaryDevelopment,'maxConcurrentPrimary')){
    delete queue.ownerPrimaryDevelopment.maxConcurrentPrimary;changed=true;
  }
  if(queue.fastLaunch&&Object.hasOwn(queue.fastLaunch,'newFeatureExpansionFrozen')){
    delete queue.fastLaunch.newFeatureExpansionFrozen;changed=true;
  }
  return changed;
}

function assertDirectNativePolicy(roadmap={}){
  const d=roadmap?.directNativeDualPlatformDevelopment||{};
  const pairing=d?.automaticPairing||d?.autoPairRules||{};
  const development=d?.development||{};
  const gate=d?.upperPlatformDevelopmentReadinessGate||{};
  const ok=roadmap?.authority==='MACHINE_EXECUTION_CONTRACT'
    &&d.status==='OWNER_DIRECT_LOCKED'
    &&d.mode==='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'
    &&d.canonicalDevelopmentAdmissionAuthority===true
    &&d.minimumDesignRequired===true
    &&d.strictDesignScoreRequiredForDevelopmentAdmission===false
    &&d.legacyWebFirstFallbackForbidden===true
    &&d.webDevelopmentStageRemoved===false
    &&d.unityWebEnabled===true
    &&d.unityWebRequired===true
    &&d.unityWebGateRequired===true
    &&d.unityWebMode==='UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR'
    &&d.upperPlatformAdmission==='UPPER_PLATFORM_DEVELOPMENT_READY'
    &&development.unityWebDevelopmentFloorRequiredBeforeUpperPlatformStart===true
    &&development.upperPlatformDevelopmentStartsOnlyAfterUnityWebReadinessPass===true
    &&gate.gateId==='UPPER_PLATFORM_DEVELOPMENT_READY'
    &&gate.allCriteriaRequired===true
    &&Array.isArray(gate.targets)
    &&gate.targets.join(',')==='ROBLOX,UNITY'
    &&Array.isArray(d.supportedDevelopmentPlatforms)
    &&d.supportedDevelopmentPlatforms.join(',')==='ROBLOX,UNITY'
    &&Array.isArray(pairing.ROBLOX)
    &&pairing.ROBLOX.join(',')==='UNITY_WEB_FLOOR,ROBLOX,UNITY'
    &&Array.isArray(pairing.UNITY)
    &&pairing.UNITY.join(',')==='UNITY_WEB_FLOOR,UNITY,ROBLOX';
  if(!ok)throw new Error('CANONICAL_DIRECT_NATIVE_POLICY_REQUIRED');
  return d;
}

function activeSeedById(seedState={}){
  const map=new Map();
  for(const seed of seedState?.seeds||[]){
    const id=clean(seed?.gameId);if(!id)continue;
    const old=map.get(id);
    const t=Date.parse(seed?.updatedAt||seed?.createdAt||'')||0;
    const oldT=Date.parse(old?.updatedAt||old?.createdAt||'')||0;
    if(!old||t>=oldT)map.set(id,seed);
  }
  return map;
}
function validDedicatedTarget(target={}){
  return target?.dedicated===true
    &&target?.shared!==true
    &&/^[1-9][0-9]*$/.test(clean(target?.universeId))
    &&/^[1-9][0-9]*$/.test(clean(target?.placeId));
}
function dedicatedTargetFromRegistry(registry={},gameId=''){
  const rows=Array.isArray(registry?.targets)?registry.targets:[];
  const target=rows.find(row=>clean(row?.gameId)===clean(gameId));
  return validDedicatedTarget(target)?target:null;
}
function restoreDedicatedTargetIdentity(item,{registry,gameId,stamp}){
  const target=dedicatedTargetFromRegistry(registry,gameId);
  if(!target)return false;
  if(validDedicatedTarget(item?.robloxPublicationTarget))return false;
  item.robloxPublicationTarget={
    version:3,
    gameId,
    universeId:clean(target.universeId),
    placeId:clean(target.placeId),
    verified:target.verified!==false,
    verifiedAt:target.verifiedAt||target.lastVerifiedAt||null,
    lastVerifiedAt:target.lastVerifiedAt||target.verifiedAt||null,
    source:clean(target.source)||'company-runtime-dedicated-target-registry',
    authority:'roblox-canonical-publication-target',
    dedicated:true,
    shared:false,
    visibilityIntent:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE',
    internalOnly:true,
    publicDiscoveryAllowed:false,
    bootstrapState:clean(target.bootstrapState)||'PUBLISHED_PRIVATE',
  };
  item.robloxSharedTargetCurrent=false;
  item.robloxFastMvpSupersededBy=null;
  item.robloxDedicatedTargetRegistryBinding={version:1,source:DEDICATED_TARGET_REGISTRY,restoredAt:stamp};
  return true;
}
function recoverExactPrivateRuntimeCheckpoint(item,design){
  const priorDesignSource=clean(item?.minimumDesignContract?.source||item?.designBaselineSource);
  if(priorDesignSource&&priorDesignSource!==clean(design?.file))return null;
  const f9Evidence=item?.robloxF9ReleaseRegressionEvidence||{};
  const exactF9=Boolean(
    item?.robloxFinalReviewPassed===true
    &&item?.robloxF9ReleaseRegressionPassed===true
    &&clean(f9Evidence.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(f9Evidence.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&Number(f9Evidence.candidateVersionNumber)>0
  );
  if(exactF9){
    const publishQueue=Array.isArray(item?.robloxCanonicalPublishQueue)?item.robloxCanonicalPublishQueue:[];
    const exactCycle=publishQueue.find(row=>
      clean(row?.sourceRevision)===clean(item?.robloxSourceCommit)
      &&clean(row?.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
      &&row?.finalReviewPassed===true
      &&row?.f9ReleaseRegressionPassed===true
    );
    const publishDispatched=Boolean(exactCycle);
    return{
      currentStep:'POST_F9_CONTINUOUS_EVOLUTION',
      canonicalState:publishDispatched
        ?'F9_VERIFIED_PUBLISH_DISPATCHED_CONTINUOUS_EVOLUTION'
        :'F9_VERIFIED_DEVELOPMENT_CONTINUOUS_EVOLUTION'
    };
  }
  const internalEvidence=item?.robloxInternalReleaseEvidence?.published===true
    ?item.robloxInternalReleaseEvidence
    :(item?.robloxReleaseEvidence?.published===true&&item?.robloxExternalPublicReleaseConfirmed!==true?item.robloxReleaseEvidence:null);
  const exactInternalRelease=Boolean(
    internalEvidence
    &&clean(internalEvidence.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(internalEvidence.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&Number(internalEvidence.versionNumber)>0
  );
  if(exactInternalRelease){
    return{
      currentStep:clean(item?.currentStep)||'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
      canonicalState:clean(item?.canonicalState)||'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'
    };
  }
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const exactCandidate=candidate?.published===true
    &&clean(candidate.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(candidate.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&Number(candidate.versionNumber)>0;
  if(exactCandidate){
    return{currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION',canonicalState:'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED'};
  }
  const exactF0=item?.robloxBuildOrPackagePassed===true
    &&item?.robloxBuildPreflightPassed===true
    &&item?.robloxFoundationF0Passed===true
    &&clean(item?.robloxBuildSourceRevision)===clean(item?.robloxSourceCommit)
    &&/^sha256:[a-f0-9]{64}$/i.test(clean(item?.robloxBuildArtifactIdentity));
  const privateDeployPending=upper(item?.robloxFailureStage)==='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'
    &&upper(item?.robloxFailureSignature)==='ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING';
  const legacyStudioDeployPending=upper(item?.currentStep)==='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'
    &&upper(item?.robloxFailureStage)==='VIBE_INTERNAL_PLAY'
    &&upper(item?.robloxFailureSignature)==='ROBLOX_STUDIO_INTERNAL_VALIDATION_PENDING';
  if(exactF0&&(privateDeployPending||legacyStudioDeployPending)){
    return{
      currentStep:'PRIVATE_RUNTIME_CANDIDATE_DEPLOY',
      canonicalState:'F0_SOURCE_PREFLIGHT_PASSED',
      robloxFailureStage:'PRIVATE_RUNTIME_CANDIDATE_DEPLOY',
      robloxFailureSignature:'ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING',
      routingBlockers:['roblox-runtime-candidate-deploy-pending']
    };
  }
  return null;
}
function migrateSharedRobloxFallbackToDedicatedTarget(item){
  const target=item?.robloxPublicationTarget||{};
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const validId=value=>/^[1-9][0-9]*$/.test(clean(value));
  const sharedFallback=target.verified===true
    &&clean(target.source)==='owner-pinned-open-cloud-target'
    &&target.dedicated!==true
    &&validId(target.universeId)
    &&validId(target.placeId);
  const exactCandidate=candidate.published===true
    &&clean(candidate.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(candidate.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&String(candidate.universeId||'')===String(target.universeId||'')
    &&String(candidate.placeId||'')===String(target.placeId||'')
    &&Number(candidate.versionNumber)>0;
  const reusableBuild=item?.robloxBuildOrPackagePassed===true
    &&item?.robloxBuildPreflightPassed===true
    &&item?.robloxFoundationF0Passed===true
    &&clean(item?.robloxBuildSourceRevision)===clean(item?.robloxSourceCommit)
    && /^sha256:[a-f0-9]{64}$/i.test(clean(item?.robloxBuildArtifactIdentity));
  const internalEvidence=item?.robloxInternalReleaseEvidence?.published===true
    ?item.robloxInternalReleaseEvidence
    :(item?.robloxReleaseEvidence?.published===true&&item?.robloxExternalPublicReleaseConfirmed!==true?item.robloxReleaseEvidence:null);
  const exactInternalRelease=Boolean(
    internalEvidence
    &&clean(internalEvidence.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(internalEvidence.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&Number(internalEvidence.versionNumber)>0
  );
  if(exactInternalRelease)return false;
  if(!sharedFallback||!exactCandidate||!reusableBuild)return false;
  item.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY';
  item.canonicalState='F0_SOURCE_PREFLIGHT_PASSED';
  item.robloxRuntimePassed=false;
  item.robloxRuntimePassedAt=null;
  item.robloxRuntimeFailedAt=null;
  item.robloxRuntimeFoundationPassed=false;
  item.robloxRuntimeFoundationEvidence=null;
  item.robloxRuntimeEvidence=null;
  item.robloxPostRuntimeQaEvidence=null;
  item.robloxIndependentQaPassed=false;
  item.robloxIndependentQaPassedAt=null;
  item.robloxRegressionPassed=false;
  item.robloxRegressionPassedAt=null;
  item.robloxFinalReviewPassed=false;
  item.robloxFinalReviewPassedAt=null;
  item.robloxInternalReleaseReady=false;
  item.robloxPublicReleaseReady=false;
  item.robloxPublicRelease=false;
  item.robloxReleaseClaim=false;
  item.robloxInternalVibePlayEvidence=null;
  item.robloxSharedTargetCurrent=false;
  item.robloxFastMvpSupersededBy=null;
  item.robloxFailureStage='PRIVATE_RUNTIME_CANDIDATE_DEPLOY';
  item.robloxFailureSignature='ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING';
  item.routingBlockers=['roblox-dedicated-runtime-target-migration-pending'];
  item.robloxDedicatedTargetMigration={
    version:1,
    fromUniverseId:String(target.universeId),
    fromPlaceId:String(target.placeId),
    sourceRevision:clean(item.robloxSourceCommit),
    artifactIdentity:clean(item.robloxBuildArtifactIdentity),
    state:'PENDING_DEDICATED_PRIVATE_TARGET',
  };
  return true;
}
function progressMatchesDesign(item,design){
  return item?.minimumDesignContract?.pass===true
    &&clean(item?.minimumDesignContract?.source)===clean(design?.file)
    &&Array.isArray(item?.concurrentTargetPlatforms)
    &&item.concurrentTargetPlatforms.includes('ROBLOX')
    &&item.concurrentTargetPlatforms.includes('UNITY')
    &&clean(item?.currentStep)
    &&!/^WEB_|^WAITING_WEB|FULL_APPROVED_SCOPE_WEB/.test(upper(item?.currentStep));
}
function bindSaveContract(item,roadmap={}){
  const save=roadmap?.developmentLifecycleMachine?.saveNormalization||{};
  item.saveNormalizationRequired=save.authority==='MACHINE_EXECUTION_CONTRACT';
  item.saveMeaningPreservationRequired=save.preserveExistingCompatibleSaveMeaning===true;
  item.saveVersioningContract=clean(save.canonicalWebModule)||'assets/save-versioning.js';
  item.saveRestoreEvidenceContract=clean(save.webRestoreEvidenceEvaluator)||'tools/company-web-save-restore-evidence.mjs';
}
function normalizeItem(oldItem,{game,seed,design,roadmap,dedicatedRegistry,stamp}){
  const gameId=clean(game.id);
  const selected=resolveSelectedPlatform(seed,game,oldItem)||'ROBLOX';
  const paths=directPaths(gameId);
  const preserve=progressMatchesDesign(oldItem,design);
  const recoveredProgress=recoverExactPrivateRuntimeCheckpoint(oldItem,design);
  const item={...oldItem};
  delete item.sourceContinuationPendingAdmission;
  Object.assign(item,{
    gameId,
    seedId:item.seedId||seed?.seedId||null,
    gameName:item.gameName||seed?.gameName||game?.name||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    lifecycleState:upper(game?.lifecycleState||'ACTIVE'),
    status:['ACTIVE','PENDING'].includes(upper(item.status))?upper(item.status):'ACTIVE',
    selectedPlatform:selected,
    targetPlatform:selected,
    concurrentTargetPlatforms:[...DIRECT_PLATFORMS],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    bidirectionalAutoPair:true,
    requestEitherStartsBoth:true,
    targetSourcePaths:paths,
    robloxProjectPath:paths.ROBLOX,
    unityProjectPath:paths.UNITY,
    targetSourcePath:paths[selected]||paths.ROBLOX,
    sourcePath:paths[selected]||paths.ROBLOX,
    designBaselineSource:design.file,
    designDate:design.date,
    minimumDesignContract:{
      version:1,pass:true,source:design.file,date:design.date,
      releaseChecklist:design.gate.releaseChecklist,
      commonCoreReady:true,platformProfiles:{ROBLOX:true,UNITY:true,distinct:true}
    },
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
    },
    artbookTiming:'PARALLEL_NATIVE_PRESENTATION_SUPPORT',
    internalReleaseTarget:{
      ROBLOX:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE_OWNER_PLAYABLE',
      UNITY:'INTERNAL_OR_CLOSED_APP_TEST_BUILD'
    },
    externalReleasePolicy:'PLATFORM_INDEPENDENT_AFTER_OWN_QA',
    currentStep:recoveredProgress?.currentStep||(preserve?item.currentStep:'TARGET_PLATFORM_SOURCE_BIND'),
    canonicalState:recoveredProgress?.canonicalState||(preserve?(item.canonicalState||'TARGET_PLATFORM_REPAIR_REQUIRED'):'PENDING_DUAL_NATIVE_SOURCE_BIND'),
    enqueuedAt:item.enqueuedAt||stamp
  });
  if(recoveredProgress?.robloxFailureStage){
    item.robloxFailureStage=recoveredProgress.robloxFailureStage;
    item.robloxFailureSignature=recoveredProgress.robloxFailureSignature;
    item.routingBlockers=[...recoveredProgress.routingBlockers];
  }
  removeLegacy(item);
  bindSaveContract(item,roadmap);
  restoreDedicatedTargetIdentity(item,{registry:dedicatedRegistry,gameId,stamp});
  const internalEvidence=item?.robloxInternalReleaseEvidence?.published===true
    ?item.robloxInternalReleaseEvidence
    :(item?.robloxReleaseEvidence?.published===true&&item?.robloxExternalPublicReleaseConfirmed!==true?item.robloxReleaseEvidence:null);
  const internalReleaseAlreadyPublished=Boolean(
    internalEvidence
    &&clean(internalEvidence.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(internalEvidence.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&Number(internalEvidence.versionNumber)>0
  );
  if(item.robloxInternalReleasePublished===true&&!internalReleaseAlreadyPublished){
    item.robloxInternalReleasePublished=false;
    item.robloxInternalReleaseReady=false;
  }
  const stalePreReleaseCanonicalState=[
    'PENDING_DUAL_NATIVE_SOURCE_BIND',
    'F0_SOURCE_PREFLIGHT_PASSED',
    'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED',
    'ROBLOX_RUNTIME_ACCEPTANCE_PASSED',
    'ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING'
  ].includes(upper(item?.canonicalState));
  if(
    internalReleaseAlreadyPublished
    &&item?.robloxPublicRelease!==true
    &&item?.robloxExternalPublicReleaseConfirmed!==true
    &&(!clean(item?.canonicalState)||stalePreReleaseCanonicalState)
  ){
    item.canonicalState='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG';
  }
  if(migrateSharedRobloxFallbackToDedicatedTarget(item)){
    item.updatedAt=stamp;
  }
  return item;
}

export function discoverExistingRobloxGames(catalog={},root='.'){
  const games=[...(catalog.games||[])], known=new Set(games.map(game=>clean(game.id)));
  const removed=new Set(catalog.permanentRemovalPolicy?.ids||[]), admitted=[];
  const directory=path.join(root,'roblox-games');
  if(!fs.existsSync(directory))return{catalog,admitted};
  for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const id=entry.name;
    if(!entry.isDirectory()||! /^[a-z0-9][a-z0-9-]*$/.test(id)||known.has(id)||removed.has(id))continue;
    const source=path.join(directory,id),projectFile=path.join(source,'default.project.json');
    if(!fs.existsSync(projectFile)||!fs.lstatSync(projectFile).isFile())continue;
    const project=readJson(projectFile,null);
    // A real Rojo project with source is intake evidence, never a QA or publication PASS.
    if(!project?.tree||typeof project.tree!=='object'||Array.isArray(project.tree)||!clean(project.name))continue;
    const stack=[source];let hasSource=false;
    while(stack.length&&!hasSource){
      const current=stack.pop();
      for(const child of fs.readdirSync(current,{withFileTypes:true})){
        if(child.isDirectory()&&!['node_modules','.git','build','dist'].includes(child.name))stack.push(path.join(current,child.name));
        else if(child.isFile()&&/\.lua(u)?$/.test(child.name)){hasSource=true;break;}
      }
    }
    if(!hasSource)continue;
    games.push({id,name:clean(project.name),productionClass:'DEVELOPMENT_CONFIRMED',
      productionClassSource:'EXISTING_ROBLOX_SOURCE_INTAKE',lifecycleState:'ACTIVE',
      selectedPlatform:'ROBLOX',robloxProjectPath:`roblox-games/${id}`,
      developmentHandling:'PRESERVE_EXISTING_SOURCE_AND_CONTINUE',
      sourceIntake:{kind:'EXISTING_ROJO_PROJECT',designVerified:false,runtimeVerified:false,externalReleaseApproved:false}});
    known.add(id);admitted.push(id);
  }
  return{catalog:admitted.length?{...catalog,games}:catalog,admitted};
}

export function reconcileDevelopmentQueue({root='.'}={}){
  const p=(...parts)=>path.join(root,...parts);
  const intake=discoverExistingRobloxGames(readJson(p('game-catalog.json'),{version:1,games:[]}),root);
  const catalog=intake.catalog;
  const seedState=readJson(p('game-seed-state.json'),{version:1,seeds:[]});
  const queuePath=p('development-queue.json');
  const queue=readJson(queuePath,{version:1,items:[]});
  const roadmap=readJson(p(MACHINE_POLICY_SOURCE),{});
  const dedicatedRegistry=readJson(p(DEDICATED_TARGET_REGISTRY),{version:1,targets:[]});
  assertDirectNativePolicy(roadmap);
  if(intake.admitted.length)writeJson(p('game-catalog.json'),catalog);

  catalog.games ||= [];
  seedState.seeds ||= [];
  queue.items ||= [];
  const stamp=new Date().toISOString();
  let ownerDirectSeedRepairs=0;
  for(const seed of seedState.seeds){
    const gameId=clean(seed?.gameId);if(!gameId)continue;
    const game=(catalog.games||[]).find(row=>clean(row?.id)===gameId);
    const design=latestMinimumDesign(root,gameId);
    const staleCatalogPause=upper(seed?.status)==='PAUSED'
      &&upper(seed?.pausedReason)==='NOT_IN_CANONICAL_GAME_CATALOG'
      &&upper(seed?.productionClass)==='DEVELOPMENT_CONFIRMED';
    const canonicalActive=game
      &&upper(game?.productionClass)==='DEVELOPMENT_CONFIRMED'
      &&ACTIVE_LIFECYCLE.has(upper(game?.lifecycleState||'ACTIVE'));
    if(!staleCatalogPause||!canonicalActive||!design)continue;
    seed.status='ACTIVE';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    delete seed.pausedAt;
    delete seed.pausedReason;
    seed.updatedAt=stamp;
    ownerDirectSeedRepairs++;
  }
  if(ownerDirectSeedRepairs>0)writeJson(p('game-seed-state.json'),seedState);
  const seeds=activeSeedById(seedState);
  const oldById=new Map();
  let duplicateRemoved=0;
  for(const row of queue.items){
    const id=clean(row?.gameId);if(!id)continue;
    if(oldById.has(id)){duplicateRemoved++;continue;}
    oldById.set(id,row);
  }

  const next=[],created=[],removed=[],rebound=[],preserved=[];
  const seen=new Set();

  for(const game of catalog.games){
    const gameId=clean(game?.id);if(!gameId)continue;
    const lifecycle=upper(game?.lifecycleState||'ACTIVE');
    const seed=seeds.get(gameId)||null;
    const seedActive=Boolean(seed)&&ACTIVE_SEED_STATUS.has(upper(seed?.status));
    const seedConfirmed=upper(seed?.productionClass)==='DEVELOPMENT_CONFIRMED';
    const catalogConfirmed=upper(game?.productionClass)==='DEVELOPMENT_CONFIRMED';
    const lifecycleActive=ACTIVE_LIFECYCLE.has(lifecycle);
    const design=latestMinimumDesign(root,gameId);

    if(!catalogConfirmed||!lifecycleActive)continue;
    if(!seedActive||!seedConfirmed||!design){
      // Source continuation is planned from the catalog; incomplete design is not fabricated.
      // Preserve existing runtime/source evidence until normal admission can resume.
      if((!seed||(seedActive&&seedConfirmed))&&oldById.has(gameId)&&fs.existsSync(p('roblox-games',gameId,'default.project.json'))){
        next.push({...oldById.get(gameId),sourceContinuationPendingAdmission:true});seen.add(gameId);preserved.push(gameId);
      }
      continue;
    }

    const old=oldById.get(gameId)||{};
    const normalized=normalizeItem(old,{game,seed,design,roadmap,dedicatedRegistry,stamp});
    const before={...old}; delete before.updatedAt;
    const after={...normalized}; delete after.updatedAt;
    if(!oldById.has(gameId)){normalized.updatedAt=stamp;created.push(gameId);}
    else if(!same(before,after)){normalized.updatedAt=stamp;rebound.push(gameId);}
    else preserved.push(gameId);
    next.push(normalized);
    seen.add(gameId);
  }

  for(const id of oldById.keys())if(!seen.has(id))removed.push(id);

  const beforeItems=JSON.stringify(queue.items);
  const afterItems=JSON.stringify(next);
  const legacyQueueMetadataRemoved=clearLegacyQueueCaps(queue);
  const metadataChanged=
    clean(queue.routerPolicy)!==MACHINE_POLICY_SOURCE||
    queue.nativeDevelopmentPolicy!=='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT'||
    queue.developmentGameWipMax!==null||
    queue.reconciliationPolicy!=='ACTIVE_SEED_PLUS_MINIMUM_DESIGN_DIRECT_NATIVE';

  const changed=beforeItems!==afterItems||duplicateRemoved>0||metadataChanged||legacyQueueMetadataRemoved||ownerDirectSeedRepairs>0;
  if(changed){
    queue.items=next;
    queue.routerPolicy=MACHINE_POLICY_SOURCE;
    queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT';
    queue.developmentGameWipMax=null;
    queue.reconciliationPolicy='ACTIVE_SEED_PLUS_MINIMUM_DESIGN_DIRECT_NATIVE';
    queue.internalConcurrencyCap=null;
    queue.externalCapacityOnlyBoundary=true;
    queue.automaticFeatureExpansionFreezeForbidden=true;
    queue.updatedAt=stamp;
    writeJson(queuePath,queue);
  }

  return {
    changed:changed||intake.admitted.length>0,admittedSourceGames:intake.admitted,created,removed,rebound,preserved,duplicateRemoved,ownerDirectSeedRepairs,
    queueCount:next.length,routerPolicy:MACHINE_POLICY_SOURCE,
    nativeDevelopmentPolicy:'MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT',
    developmentGameWipMax:null,
    internalConcurrencyCap:null,
    externalCapacityOnlyBoundary:true,
    automaticFeatureExpansionFreezeForbidden:true,
    legacyQueueMetadataRemoved
  };
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=reconcileDevelopmentQueue({root:process.cwd()});
  console.log(`DEVELOPMENT_QUEUE_RECONCILE_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`DEVELOPMENT_QUEUE_CREATED=${result.created.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_SOURCE_INTAKE=${result.admittedSourceGames.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REMOVED=${result.removed.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REBOUND=${result.rebound.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_DUPLICATES_REMOVED=${result.duplicateRemoved}`);
  console.log(`DEVELOPMENT_QUEUE_OWNER_DIRECT_SEED_REPAIRS=${result.ownerDirectSeedRepairs||0}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log(`DEVELOPMENT_QUEUE_ROUTER_POLICY=${result.routerPolicy}`);
  console.log(`DEVELOPMENT_QUEUE_NATIVE_POLICY=${result.nativeDevelopmentPolicy}`);
  console.log('DEVELOPMENT_QUEUE_WIP_MAX=NONE');
  console.log('UNITY_WEB_ADMISSION_AUTHORITY=NONE');
}
