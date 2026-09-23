// Canonical DEVELOPMENT_CONFIRMED direct-native queue reconciliation.
// Catalog lifecycle selects candidates; minimum dual-platform design is the only design admission requirement.
// Roblox + Unity run concurrently. Unity Web is an optional validation surface and has no queue admission authority.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {latestMinimumDesign} from './company-minimum-design-contract.mjs';
import {resolveSelectedPlatform} from './company-selected-platform-router.mjs';

const ACTIVE_STATES=new Set(['ACTIVE','REBUILD']);
const MACHINE_POLICY_SOURCE='company-learning/platform-release-roadmap.json';
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const directNativePaths=gameId=>({ROBLOX:`roblox-games/${gameId}`,UNITY:`unity-games/${gameId}`});
const LEGACY_WEB_QUEUE_KEYS=Object.freeze([
  'webPurpose','webCompanionRequired','webValidationRequired','webGameplayValidationRequired','musicValidationRequired',
  'webEvidenceMayReplaceNativePlatformEvidence','webBeforeTargetPlatformByDefault','webSourcePath',
  'webValidationPassedAt','musicValidationPassed','webPromotionRevalidationPassed',
  'formalImplementationPassed','formalImplementationVerdict','homepageTestEligible','homepageTestCandidate',
  'homepageTestScore','homepageTestVerdict','webInitialCyclePassed','webInitialCyclePassedAt',
  'webInitialCycleEvidencePath','webInitialCycleSourcePath','webInitialCycleSourceIndexSha256',
  'webInitialCycleDesignBaselineSha256','webInitialCycleValidationSchemaVersion','webInitialCycleStrictScore',
  'webInitialCycleStrictReviewPath','webInitialCycleSourceRevision','webInitialCycleMusicValidationPassed',
  'webValidationQueuedAt','ownerWebDevelopmentResetAppliedFor','ownerWebDevelopmentResetAppliedAt',
  'webFirstGatePassed','webSecondGateRequired','webPlatformHandoff','unityWebFirstStagePassed',
  'vibeWebImplementationRequired','vibeWebRequestedStage','vibeWebImplementationReason',
  'postPromotionArtbookRequired','postWebArtbookRequired'
]);

const removeLegacyWebQueueFields=item=>{
  for(const key of LEGACY_WEB_QUEUE_KEYS)delete item[key];
  return item;
};
const legacyWebStep=value=>/^(?:WEB_|WAITING_WEB|FULL_APPROVED_SCOPE_WEB|RETURN_TO_WEB)/.test(upper(value));
const selectedPlatformOf=(game,item)=>{
  return resolveSelectedPlatform(
    item?.selectedPlatform||item?.targetPlatform||game?.selectedPlatform||game?.targetPlatform||'ROBLOX',
    {...game,...item}
  )||'ROBLOX';
};
function mergeDuplicate(base,extra){
  for(const [key,value] of Object.entries(extra||{})){
    if(base[key]===undefined||base[key]===null||base[key]==='')base[key]=value;
  }
  return base;
}
function assertDirectNativePolicy(roadmap={}){
  const d=roadmap?.directNativeDualPlatformDevelopment||{};
  if(d.status!=='OWNER_DIRECT_LOCKED'
    ||d.mode!=='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'
    ||d.canonicalDevelopmentAdmissionAuthority!==true
    ||d.strictDesignScoreRequiredForDevelopmentAdmission!==false
    ||d.legacyWebFirstFallbackForbidden!==true
    ||!Array.isArray(d.supportedDevelopmentPlatforms)
    ||d.supportedDevelopmentPlatforms.join(',')!=='ROBLOX,UNITY'){
    throw new Error('CANONICAL_DIRECT_NATIVE_POLICY_REQUIRED');
  }
  return d;
}
function bindSharedSaveContract(item,roadmap={}){
  const savePolicy=roadmap?.developmentLifecycleMachine?.saveNormalization||{};
  item.saveNormalizationRequired=savePolicy.authority==='MACHINE_EXECUTION_CONTRACT';
  item.saveMeaningPreservationRequired=savePolicy.preserveExistingCompatibleSaveMeaning===true;
  // Central save field names are retained for compatibility; they are shared save contracts, not Web admission gates.
  item.saveVersioningContract=clean(savePolicy.canonicalWebModule)||item.saveVersioningContract||'assets/save-versioning.js';
  item.saveRestoreEvidenceContract=clean(savePolicy.webRestoreEvidenceEvaluator)||item.saveRestoreEvidenceContract||'tools/company-web-save-restore-evidence.mjs';
  return item;
}
function bindNativeItem(item,{game,design,roadmap,stamp}){
  const gameId=clean(game?.id);
  const selectedPlatform=selectedPlatformOf(game,item);
  const paths=directNativePaths(gameId);
  const previousStep=clean(item.currentStep);
  const previousState=clean(item.canonicalState);
  const sourceMatches=clean(item?.minimumDesignContract?.source)===clean(design.file);
  const preserveProgress=sourceMatches
    &&previousStep
    &&!legacyWebStep(previousStep)
    &&!legacyWebStep(previousState);

  Object.assign(item,{
    gameId,
    seedId:item.seedId||null,
    gameName:item.gameName||game.name||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    lifecycleState:upper(game.lifecycleState||'ACTIVE'),
    status:'ACTIVE',
    selectedPlatform,
    targetPlatform:selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    bidirectionalAutoPair:true,
    requestEitherStartsBoth:true,
    targetSourcePaths:paths,
    robloxProjectPath:paths.ROBLOX,
    unityProjectPath:paths.UNITY,
    targetSourcePath:paths[selectedPlatform],
    sourcePath:paths[selectedPlatform],
    designBaselineSource:design.file,
    designDate:design.date,
    minimumDesignContract:{
      version:1,
      pass:true,
      source:design.file,
      date:design.date,
      commonCoreReady:design.gate.commonCoreReady===true,
      platformProfiles:{...design.gate.platformProfiles}
    },
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
    },
    artbookTiming:'PARALLEL_NATIVE_PRESENTATION_SUPPORT',
    currentStep:preserveProgress?previousStep:'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:preserveProgress?previousState:'PENDING_DUAL_NATIVE_SOURCE_BIND',
    enqueuedAt:item.enqueuedAt||stamp,
    updatedAt:stamp
  });
  removeLegacyWebQueueFields(item);
  bindSharedSaveContract(item,roadmap);
  return item;
}

export function reconcileDevelopmentQueue({root='.'}={}){
  const catalogPath=path.join(root,'game-catalog.json');
  const queuePath=path.join(root,'development-queue.json');
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  const roadmap=readJson(path.join(root,MACHINE_POLICY_SOURCE),{});
  assertDirectNativePolicy(roadmap);
  catalog.games ||= [];
  queue.items ||= [];

  const eligibleGames=(catalog.games||[]).filter(game=>{
    const gameId=clean(game?.id);
    const lifecycle=upper(game?.lifecycleState||'ACTIVE');
    return gameId&&upper(game?.productionClass)==='DEVELOPMENT_CONFIRMED'&&ACTIVE_STATES.has(lifecycle);
  });
  const eligibleById=new Map(eligibleGames.map(game=>[clean(game.id),game]));
  const unique=new Map();
  let duplicateRemoved=0;
  for(const row of queue.items){
    const gameId=clean(row?.gameId);
    if(!gameId)continue;
    if(unique.has(gameId)){mergeDuplicate(unique.get(gameId),row);duplicateRemoved++;}
    else unique.set(gameId,{...row});
  }

  const stamp=new Date().toISOString();
  const next=[];
  const created=[];
  const removed=[];
  const preserved=[];
  const resetToNative=[];
  const missingMinimumDesign=[];

  for(const [gameId,item] of unique){
    const game=eligibleById.get(gameId);
    if(!game){removed.push(gameId);continue;}
    const design=latestMinimumDesign(root,gameId);
    if(!design){missingMinimumDesign.push(gameId);removed.push(gameId);continue;}
    const oldStep=clean(item.currentStep);
    bindNativeItem(item,{game,design,roadmap,stamp});
    if(oldStep&&item.currentStep===oldStep)preserved.push(gameId);
    else resetToNative.push(gameId);
    next.push(item);
  }

  const queued=new Set(next.map(item=>clean(item.gameId)));
  for(const game of eligibleGames){
    const gameId=clean(game.id);
    if(queued.has(gameId))continue;
    const design=latestMinimumDesign(root,gameId);
    if(!design){if(!missingMinimumDesign.includes(gameId))missingMinimumDesign.push(gameId);continue;}
    const item=bindNativeItem({}, {game,design,roadmap,stamp});
    item.queueSource='CANONICAL_DIRECT_NATIVE_QUEUE_RECONCILE';
    next.push(item);
    queued.add(gameId);
    created.push(gameId);
  }

  next.sort((a,b)=>clean(a.gameId).localeCompare(clean(b.gameId)));
  const before=JSON.stringify(queue.items);
  queue.items=next;
  queue.routerPolicy=MACHINE_POLICY_SOURCE;
  queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT';
  queue.developmentGameWipMax=null;
  queue.reconciliationPolicy='DIRECT_NATIVE_MINIMUM_DESIGN_CATALOG_RECONCILE';
  delete queue.webValidationPolicy;
  const after=JSON.stringify(queue.items);
  const metadataChanged=clean(queue.routerPolicy)!==MACHINE_POLICY_SOURCE
    ||queue.developmentGameWipMax!==null
    ||clean(queue.nativeDevelopmentPolicy)!=='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT';
  const changed=before!==after||duplicateRemoved>0||metadataChanged;
  if(changed){
    queue.updatedAt=stamp;
    writeJson(queuePath,queue);
  }

  return {
    changed,created,removed,preserved,resetToNative,missingMinimumDesign,duplicateRemoved,
    queueCount:next.length,routerPolicy:MACHINE_POLICY_SOURCE,developmentGameWipMax:null
  };
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=reconcileDevelopmentQueue({root:process.cwd()});
  console.log(`DEVELOPMENT_QUEUE_RECONCILE_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`DEVELOPMENT_QUEUE_CREATED=${result.created.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REMOVED=${result.removed.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_NATIVE_PROGRESS_PRESERVED=${result.preserved.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_RESET_TO_NATIVE=${result.resetToNative.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_MINIMUM_DESIGN_MISSING=${result.missingMinimumDesign.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_DUPLICATES_REMOVED=${result.duplicateRemoved}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log(`DEVELOPMENT_QUEUE_ROUTER_POLICY=${result.routerPolicy}`);
  console.log('DEVELOPMENT_QUEUE_WIP_MAX=NONE');
  console.log('DEVELOPMENT_QUEUE_MODE=DIRECT_NATIVE_ROBLOX_UNITY');
}
