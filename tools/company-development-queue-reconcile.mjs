// Canonical DEVELOPMENT_CONFIRMED queue reconciliation.
// Runtime seed admission + fresh minimum dual-platform design are authoritative.
// Queue maintenance must not depend on Web-first stages or pause behind active game implementation.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {latestMinimumDesign} from './company-minimum-design-contract.mjs';

const ACTIVE_STATES=new Set(['ACTIVE','REBUILD']);
const MACHINE_POLICY_SOURCE='company-learning/platform-release-roadmap.json';
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').trim();
const upper=value=>clean(value).toUpperCase();
const selectedPlatformOf=(seed={},game={})=>{
  const raw=upper(seed?.selectedPlatform||seed?.INITIAL_TARGET_PLATFORM||game?.selectedPlatform||game?.targetPlatform||game?.productionTarget);
  if(raw==='ROBLOX')return'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return'UNITY';
  return'ROBLOX';
};
const nativePaths=gameId=>({ROBLOX:`roblox-games/${gameId}`,UNITY:`unity-games/${gameId}`});
const legacyQueueKeys=Object.freeze([
  'webSourcePath','webValidationRequired','musicValidationRequired','webPlatformHandoff','unityWebFirstStagePassed',
  'vibeWebImplementationRequired','vibeWebRequestedStage','vibeWebImplementationReason',
  'webFirstGatePassed','webSecondGateRequired','postWebArtbookRequired','postPromotionArtbookRequired',
  'webPromotionRevalidationPassed','webValidationPassedAt','musicValidationPassed','homepageTestEligible',
  'homepageTestScore','homepageTestVerdict','formalImplementationPassed','formalImplementationVerdict',
  'webInitialCyclePassed','webInitialCyclePassedAt','webInitialCycleEvidencePath','webInitialCycleSourcePath',
  'webInitialCycleSourceIndexSha256','webInitialCycleDesignBaselineSha256','webInitialCycleValidationSchemaVersion',
  'webInitialCycleStrictScore','webInitialCycleStrictReviewPath','webInitialCycleSourceRevision',
  'webInitialCycleMusicValidationPassed','ownerWebDevelopmentResetAppliedFor','ownerWebDevelopmentResetAppliedAt'
]);

function freshAfterOwnerReset(design,resetAt=0){
  if(!resetAt)return Boolean(design);
  if(!design)return false;
  const resetDate=new Date(resetAt).toISOString().slice(0,10);
  return String(design.date||'')>resetDate;
}
function mergeDuplicate(base,extra){
  for(const [key,value] of Object.entries(extra||{})){
    if(base[key]===undefined||base[key]===null||base[key]==='')base[key]=value;
  }
  return base;
}
function scrubLegacyQueueFields(item){
  for(const key of legacyQueueKeys)delete item[key];
  if(item?.legacyWebReference)delete item.legacyWebReference;
  if(/^WEB_|^WAITING_WEB|FULL_APPROVED_SCOPE_WEB/.test(upper(item.currentStep)))delete item.currentStep;
  if(/WEB/.test(upper(item.canonicalState))&&upper(item.canonicalState)!=='UNITY_WEB_VALIDATION_OPTIONAL')delete item.canonicalState;
  if(/WEB/.test(upper(item.resumeStage)))delete item.resumeStage;
  return item;
}
function currentNativeProgressMatches(item,design){
  return clean(item?.minimumDesignContract?.source)===clean(design?.file)
    &&item?.minimumDesignContract?.pass===true
    &&item?.platformExecutionMode==='ROBLOX_UNITY_CONCURRENT_SAME_GAME'
    &&Array.isArray(item?.concurrentTargetPlatforms)
    &&item.concurrentTargetPlatforms.includes('ROBLOX')
    &&item.concurrentTargetPlatforms.includes('UNITY')
    &&clean(item?.currentStep)
    &&!/^WEB_|^WAITING_WEB|FULL_APPROVED_SCOPE_WEB/.test(upper(item.currentStep));
}
function bindDirectNativeItem(item,{gameId,seed,game,design,stamp}){
  const preserve=currentNativeProgressMatches(item,design);
  const previousStep=preserve?item.currentStep:null;
  const previousState=preserve?item.canonicalState:null;
  const selected=selectedPlatformOf(seed,game);
  const paths=nativePaths(gameId);
  scrubLegacyQueueFields(item);
  Object.assign(item,{
    gameId,
    seedId:item.seedId||seed?.seedId||null,
    gameName:item.gameName||seed?.gameName||game?.name||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    lifecycleState:upper(game?.lifecycleState||'ACTIVE'),
    status:'ACTIVE',
    selectedPlatform:selected,
    targetPlatform:selected,
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    bidirectionalAutoPair:true,
    requestEitherStartsBoth:true,
    targetSourcePaths:paths,
    robloxProjectPath:paths.ROBLOX,
    unityProjectPath:paths.UNITY,
    targetSourcePath:paths[selected],
    sourcePath:paths[selected],
    designBaselineSource:design.file,
    designDate:design.date,
    minimumDesignContract:{
      version:1,
      pass:true,
      source:design.file,
      date:design.date,
      commonCoreReady:true,
      platformProfiles:{ROBLOX:true,UNITY:true,distinct:true}
    },
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
    },
    artbookTiming:'PARALLEL_NATIVE_PRESENTATION_SUPPORT',
    currentStep:previousStep||'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:previousState||'PENDING_DUAL_NATIVE_SOURCE_BIND',
    internalReleaseTarget:{
      ROBLOX:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE_OWNER_PLAYABLE',
      UNITY:'INTERNAL_OR_CLOSED_APP_TEST_BUILD'
    },
    externalReleasePolicy:'PLATFORM_INDEPENDENT_AFTER_OWN_QA',
    queueSource:'CANONICAL_DIRECT_NATIVE_QUEUE_RECONCILE',
    enqueuedAt:item.enqueuedAt||stamp,
    updatedAt:stamp
  });
  return item;
}

export function reconcileDevelopmentQueue({root='.'}={}){
  const catalog=readJson(path.join(root,'game-catalog.json'),{version:1,games:[]});
  const seedState=readJson(path.join(root,'game-seed-state.json'),{version:1,seeds:[]});
  const queuePath=path.join(root,'development-queue.json');
  const queue=readJson(queuePath,{version:1,items:[]});
  const roadmap=readJson(path.join(root,MACHINE_POLICY_SOURCE),{});
  const direct=roadmap?.directNativeDualPlatformDevelopment||{};
  if(direct.status!=='OWNER_DIRECT_LOCKED'
    ||direct.mode!=='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'
    ||direct.canonicalDevelopmentAdmissionAuthority!==true
    ||direct.strictDesignScoreRequiredForDevelopmentAdmission!==false
    ||direct.legacyWebFirstFallbackForbidden!==true){
    throw new Error('CANONICAL_DIRECT_NATIVE_POLICY_REQUIRED');
  }

  catalog.games ||= [];
  seedState.seeds ||= [];
  queue.items ||= [];
  const stamp=new Date().toISOString();
  const catalogById=new Map(catalog.games.map(game=>[clean(game?.id),game]).filter(([id])=>id));
  const seedById=new Map(seedState.seeds
    .filter(seed=>upper(seed?.status)==='ACTIVE'&&clean(seed?.gameId))
    .map(seed=>[clean(seed.gameId),seed]));
  const resetAt=Date.parse(seedState?.ownerAllGamesDesignReset?.updatedAt||'')||0;
  const resetIds=new Set(Array.isArray(seedState?.ownerAllGamesDesignReset?.gameIds)
    ?seedState.ownerAllGamesDesignReset.gameIds.map(String):[]);

  const unique=new Map();
  let duplicateRemoved=0;
  for(const row of queue.items){
    const gameId=clean(row?.gameId);
    if(!gameId)continue;
    if(unique.has(gameId)){mergeDuplicate(unique.get(gameId),row);duplicateRemoved++;}
    else unique.set(gameId,{...row});
  }

  const eligible=new Map();
  const ineligibleReasons=new Map();
  for(const [gameId,seed] of seedById){
    const game=catalogById.get(gameId);
    const lifecycle=upper(game?.lifecycleState||'ACTIVE');
    if(!game||!ACTIVE_STATES.has(lifecycle)){ineligibleReasons.set(gameId,'CATALOG_LIFECYCLE_NOT_ACTIVE');continue;}
    if(upper(seed?.productionClass)!=='DEVELOPMENT_CONFIRMED'){ineligibleReasons.set(gameId,'ACTIVE_SEED_NOT_DEVELOPMENT_CONFIRMED');continue;}
    const design=latestMinimumDesign(root,gameId);
    if(!design){ineligibleReasons.set(gameId,'MINIMUM_DUAL_PLATFORM_DESIGN_NOT_READY');continue;}
    if(resetIds.has(gameId)&&!freshAfterOwnerReset(design,resetAt)){
      ineligibleReasons.set(gameId,'OWNER_RESET_FRESH_MINIMUM_DESIGN_REQUIRED');
      continue;
    }
    eligible.set(gameId,{seed,game,design});
  }

  const next=[],created=[],preserved=[],removed=[],removedReasons={};
  for(const [gameId,item] of unique){
    const ctx=eligible.get(gameId);
    if(!ctx){
      removed.push(gameId);
      removedReasons[gameId]=ineligibleReasons.get(gameId)||'NO_ACTIVE_DEVELOPMENT_SEED';
      continue;
    }
    bindDirectNativeItem(item,{gameId,...ctx,stamp});
    next.push(item);
    preserved.push(gameId);
    eligible.delete(gameId);
  }
  for(const [gameId,ctx] of eligible){
    const item=bindDirectNativeItem({}, {gameId,...ctx,stamp});
    next.push(item);
    created.push(gameId);
  }
  next.sort((a,b)=>String(a.gameId).localeCompare(String(b.gameId)));

  const before=JSON.stringify(queue.items);
  queue.items=next;
  queue.routerPolicy=MACHINE_POLICY_SOURCE;
  queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT';
  queue.webValidationPolicy='OPTIONAL_UNITY_WEB_VALIDATION_SURFACE_NON_BLOCKING';
  queue.developmentGameWipMax=null;
  queue.reconciliationPolicy='ACTIVE_DEVELOPMENT_SEED_PLUS_FRESH_MINIMUM_DESIGN_DUAL_NATIVE';
  queue.updatedAt=stamp;
  const after=JSON.stringify(next);
  const metadataChanged=
    clean(readJson(queuePath,{})?.routerPolicy)!==queue.routerPolicy
    ||clean(readJson(queuePath,{})?.nativeDevelopmentPolicy)!==queue.nativeDevelopmentPolicy
    ||clean(readJson(queuePath,{})?.webValidationPolicy)!==queue.webValidationPolicy
    ||readJson(queuePath,{})?.developmentGameWipMax!==null
    ||clean(readJson(queuePath,{})?.reconciliationPolicy)!==queue.reconciliationPolicy;
  const changed=before!==after||duplicateRemoved>0||metadataChanged;
  if(changed)writeJson(queuePath,queue);

  return{
    changed,created,removed,removedReasons,duplicateRemoved,preserved,
    queueCount:next.length,routerPolicy:queue.routerPolicy,
    nativeDevelopmentPolicy:queue.nativeDevelopmentPolicy,
    webValidationPolicy:queue.webValidationPolicy,
    developmentGameWipMax:null
  };
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=reconcileDevelopmentQueue({root:process.cwd()});
  console.log(`DEVELOPMENT_QUEUE_RECONCILE_CHANGED=${result.changed?'YES':'NO'}`);
  console.log(`DEVELOPMENT_QUEUE_CREATED=${result.created.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REMOVED=${result.removed.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_REMOVED_REASONS=${JSON.stringify(result.removedReasons)}`);
  console.log(`DEVELOPMENT_QUEUE_DUPLICATES_REMOVED=${result.duplicateRemoved}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log(`DEVELOPMENT_QUEUE_ROUTER_POLICY=${result.routerPolicy}`);
  console.log(`DEVELOPMENT_QUEUE_NATIVE_POLICY=${result.nativeDevelopmentPolicy}`);
  console.log(`DEVELOPMENT_QUEUE_WEB_POLICY=${result.webValidationPolicy}`);
  console.log('DEVELOPMENT_QUEUE_WIP_MAX=UNBOUNDED_BY_POLICY');
}
