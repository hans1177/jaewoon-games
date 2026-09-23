// Canonical DESIGN_ONLY -> DEVELOPMENT_CONFIRMED reconciliation.
// DESIGN_ONLY is transient. Minimum common design + distinct Roblox/Unity profiles are the only design admission gate.
// Strict design review continues in parallel and never acts as the native development admission score gate.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveSelectedPlatform} from './company-selected-platform-router.mjs';
import {materializeOwnerDesignResetSeeds} from './owner-design-reset.mjs';
import {latestMinimumDesign} from './company-minimum-design-contract.mjs';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
const nowIso=()=>new Date().toISOString();
const selectedPlatformOf=seed=>resolveSelectedPlatform(seed?.INITIAL_TARGET_PLATFORM||'',seed)||'ROBLOX';
const directNativeSourcePaths=gameId=>({ROBLOX:`roblox-games/${gameId}`,UNITY:`unity-games/${gameId}`});
const LEGACY_WEB_ADMISSION_KEYS=Object.freeze([
  'webPurpose','webCompanionRequired','webValidationRequired','webGameplayValidationRequired','musicValidationRequired',
  'webEvidenceMayReplaceNativePlatformEvidence','webBeforeTargetPlatformByDefault','webSourcePath','webFirstGatePassed',
  'webSecondGateRequired','webPlatformHandoff','unityWebFirstStagePassed','vibeWebImplementationRequired',
  'vibeWebRequestedStage','vibeWebImplementationReason','postPromotionArtbookRequired','postWebArtbookRequired'
]);
const removeLegacyWebAdmissionFields=target=>{
  if(!target||typeof target!=='object')return target;
  for(const key of LEGACY_WEB_ADMISSION_KEYS)delete target[key];
  return target;
};


function assertCanonicalDirectNativePolicy(root='.'){
  const roadmap=readJson(path.join(root,'company-learning/platform-release-roadmap.json'),{});
  const d=roadmap?.directNativeDualPlatformDevelopment||{};
  const web=d?.unityWebValidationSurface||{};
  const ok=d.status==='OWNER_DIRECT_LOCKED'
    &&d.mode==='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'
    &&d.canonicalDevelopmentAdmissionAuthority===true
    &&d.minimumDesignRequired===true
    &&d.strictDesignScoreRequiredForDevelopmentAdmission===false
    &&d.legacyWebFirstFallbackForbidden===true
    &&d.webDevelopmentStageRemoved===true
    &&d.unityWebEnabled===true
    &&d.unityWebRequired===false
    &&d.unityWebGateRequired===false
    &&d.unityWebMode==='VALIDATION_SURFACE_ONLY'
    &&web.requiredForDevelopmentAdmission===false
    &&Array.isArray(d.supportedDevelopmentPlatforms)
    &&d.supportedDevelopmentPlatforms.join(',')==='ROBLOX,UNITY';
  if(!ok)throw new Error('CANONICAL_DIRECT_NATIVE_POLICY_REQUIRED');
  return d;
}
function freshAfterOwnerReset(design,resetAt=0){
  if(!resetAt)return true;
  const resetDate=new Date(resetAt).toISOString().slice(0,10);
  return Boolean(design?.date&&String(design.date)>resetDate);
}
function directQueueProgressIsCurrent(item,design){
  return item?.minimumDesignContract?.pass===true
    &&clean(item?.minimumDesignContract?.source)===clean(design?.file)
    &&item?.platformExecutionMode==='ROBLOX_UNITY_CONCURRENT_SAME_GAME'
    &&Array.isArray(item?.concurrentTargetPlatforms)
    &&item.concurrentTargetPlatforms.includes('ROBLOX')
    &&item.concurrentTargetPlatforms.includes('UNITY')
    && clean(item?.currentStep)
    && !/^WEB_|^WAITING_WEB/.test(clean(item.currentStep).toUpperCase());
}
function bindDirectNativeQueueItem(item,{seed,design,stamp}){
  const gameId=clean(seed?.gameId);
  const selectedPlatform=selectedPlatformOf(seed);
  const paths=directNativeSourcePaths(gameId);
  const preserveProgress=directQueueProgressIsCurrent(item,design);
  const previousStep=preserveProgress?item.currentStep:null;
  const previousState=preserveProgress?item.canonicalState:null;
  const ownerPreservationPresentationUpgrade=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true
    &&clean(seed?.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';

  Object.assign(item,{
    gameId,
    seedId:item.seedId||seed.seedId||null,
    gameName:item.gameName||seed.gameName||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    status:['DISABLED'].includes(clean(item.status).toUpperCase())?'ACTIVE':(item.status||'ACTIVE'),
    selectedPlatform,
    targetPlatform:selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    bidirectionalAutoPair:true,
    requestEitherStartsBoth:true,
    targetSourcePaths:paths,
    robloxProjectPath:paths.ROBLOX,
    unityProjectPath:paths.UNITY,
    targetSourcePath:paths[selectedPlatform]||paths.ROBLOX,
    sourcePath:paths[selectedPlatform]||paths.ROBLOX,
    designBaselineSource:design.file,
    designDate:design.date,
    minimumDesignContract:{
      version:1,pass:true,source:design.file,date:design.date,
      commonCoreReady:true,platformProfiles:{ROBLOX:true,UNITY:true,distinct:true}
    },
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
    },
    artbookTiming:'PARALLEL_NATIVE_PRESENTATION_SUPPORT',
    ownerPreservationPresentationUpgrade,
    presentationFirstPass:ownerPreservationPresentationUpgrade?'ASSET_ADAPTATION':(item.presentationFirstPass||null),
    internalReleaseTarget:{
      ROBLOX:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE_OWNER_PLAYABLE',
      UNITY:'INTERNAL_OR_CLOSED_APP_TEST_BUILD'
    },
    externalReleasePolicy:'PLATFORM_INDEPENDENT_AFTER_OWN_QA',
    currentStep:previousStep||'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:previousState||'PENDING_DUAL_NATIVE_SOURCE_BIND',
    enqueuedAt:item.enqueuedAt||stamp,
    updatedAt:stamp
  });
  removeLegacyWebAdmissionFields(item);
  return item;
}
function demoteStaleAdmission({seed,queue,portfolio,catalog,gameId,reason,stamp}){
  queue.items=(queue.items||[]).filter(row=>clean(row?.gameId)!==gameId);
  seed.productionClass='DESIGN_ONLY';
  seed.productionTier=3;
  seed.productionClassSource=reason;
  seed.lifecycleState='MINIMUM_DESIGN_REQUIRED';
  seed.minimumDesignContract={version:1,pass:false,reason};
  delete seed.platformDesignProfiles;
  seed.promotion={
    from:'DEVELOPMENT_CONFIRMED',
    to:'DESIGN_ONLY',
    reason,
    strictDesignReviewRequiredForAdmission:false,
    strictDesignReviewContinuesInParallel:true,
    updatedAt:stamp
  };
  const project=(portfolio.projects||[]).find(row=>clean(row?.slug)===gameId);
  if(project)Object.assign(project,{
    productionClass:'DESIGN_ONLY',
    productionClassSource:reason,
    profileStatus:'DESIGN_ONLY',
    mode:'MINIMUM_DUAL_PLATFORM_DESIGN_REQUIRED',
    productionTier:3,
    updatedAt:stamp
  });
  removeLegacyWebAdmissionFields(project);
  const game=(catalog.games||[]).find(row=>clean(row?.id)===gameId);
  if(game){Object.assign(game,{
    productionClass:'DESIGN_ONLY',
    productionClassSource:reason,
    productionTier:3,
    homepageCategory:'design-only',
    homepageOfficialCard:false,
    homepageTestCandidate:false,
    homepageStage:'최소 Roblox/Unity 설계 보강 필요',
    updatedAt:stamp
  });removeLegacyWebAdmissionFields(game);}
}
function syncReadyMirrors({seed,design,portfolio,catalog,queue,stamp}){
  const gameId=clean(seed.gameId);
  const selectedPlatform=selectedPlatformOf(seed);
  const paths=directNativeSourcePaths(gameId);
  const wasConfirmed=clean(seed.productionClass).toUpperCase()==='DEVELOPMENT_CONFIRMED';

  Object.assign(seed,{
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionTier:2,
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    lifecycleState:'DEVELOPMENT_CONFIRMED',
    selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    platformExecutionMode:'ROBLOX_UNITY_CONCURRENT_SAME_GAME',
    minimumDesignContract:{version:1,pass:true,source:design.file,date:design.date},
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
    },
    promotion:{
      from:wasConfirmed?'DEVELOPMENT_CONFIRMED':'DESIGN_ONLY',
      to:'DEVELOPMENT_CONFIRMED',
      reason:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
      requestedPlatform:selectedPlatform,
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      targetSourcePaths:paths,
      designBaselineSource:design.file,
      designDate:design.date,
      strictDesignReviewRequiredForAdmission:false,
      strictDesignReviewContinuesInParallel:true,
      promotedAt:seed?.promotion?.promotedAt||stamp
    },
    updatedAt:stamp
  });

  let project=(portfolio.projects||[]).find(row=>clean(row?.slug)===gameId);
  if(!project){
    project={id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,protectedValues:['core-loop','design-baseline','save-meaning']};
    portfolio.projects.push(project);
  }
  Object.assign(project,{
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    profileStatus:'DEVELOPMENT_CONFIRMED',
    mode:'ROBLOX_UNITY_DIRECT_NATIVE_CONCURRENT',
    productionTier:2,
    targetEngine:'ROBLOX_UNITY',
    selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    targetSourcePaths:paths,
    sourcePath:paths[selectedPlatform]||paths.ROBLOX,
    designBaselineSource:design.file,
    platformDesignProfiles:seed.platformDesignProfiles,
    updatedAt:stamp
  });
  removeLegacyWebAdmissionFields(project);

  let game=(catalog.games||[]).find(row=>clean(row?.id)===gameId);
  if(!game){
    game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Roblox + Unity 앱 동시개발',genre:[clean(seed.GAME_CATEGORY).replaceAll('_',' ')],image:'',featured:false};
    catalog.games.push(game);
  }
  Object.assign(game,{
    homepageCategory:'development-confirmed',
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_DUAL_PLATFORM_DESIGN_READY',
    productionTier:2,
    selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX','UNITY'],
    productionTarget:'ROBLOX_UNITY',
    targetSourcePaths:paths,
    homepageOfficialCard:false,
    homepageTestCandidate:false,
    homepageStage:'개발확정 · Roblox + Unity 앱 동시개발',
    homepageRecentWork:'최소 설계 계약 완료 · 네이티브 두 플랫폼 동시 진행',
    homepageWebPlayable:Boolean(game.homepageWebPlayable),
    updatedAt:stamp
  });
  removeLegacyWebAdmissionFields(game);

  let item=(queue.items||[]).find(row=>clean(row?.gameId)===gameId);
  if(!item){item={};queue.items.push(item);}
  bindDirectNativeQueueItem(item,{seed,design,stamp});
  return wasConfirmed?'reconciled':'promoted';
}

export function promoteReadyDesignSeeds({root='.'}={}){
  assertCanonicalDirectNativePolicy(root);
  const p=(...parts)=>path.join(root,...parts);
  const seedPath=p('game-seed-state.json');
  const portfolioPath=p('autonomous-portfolio.json');
  const catalogPath=p('game-catalog.json');
  const queuePath=p('development-queue.json');

  const state=readJson(seedPath,{version:1,seeds:[]});
  delete state.policyDocument;
  state.policyAuthority='company-learning/platform-release-roadmap.json';
  materializeOwnerDesignResetSeeds(state,{file:p('owner-design-reset-queue.json')});
  const portfolio=readJson(portfolioPath,{version:1,projects:[]});
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  state.seeds ||= []; portfolio.projects ||= []; catalog.games ||= []; queue.items ||= [];

  const stamp=nowIso();
  const promoted=[],reconciled=[],demoted=[],skipped=[];
  const resetAt=Date.parse(state?.ownerAllGamesDesignReset?.updatedAt||'')||0;
  const resetIds=new Set(Array.isArray(state?.ownerAllGamesDesignReset?.gameIds)?state.ownerAllGamesDesignReset.gameIds.map(String):[]);

  for(const seed of state.seeds){
    if(clean(seed?.status).toUpperCase()!=='ACTIVE')continue;
    const gameId=clean(seed?.gameId); if(!gameId)continue;
    const currentClass=clean(seed?.productionClass).toUpperCase();
    if(currentClass==='RELEASE_CONFIRMED'){skipped.push({gameId,reason:'ALREADY_RELEASED'});continue;}

    const design=latestMinimumDesign(root,gameId);
    const resetRequiresFresh=resetIds.has(gameId)&&!freshAfterOwnerReset(design,resetAt);
    if(!design||resetRequiresFresh){
      const reason=resetRequiresFresh?'OWNER_RESET_FRESH_MINIMUM_DESIGN_REQUIRED':'MINIMUM_DUAL_PLATFORM_DESIGN_NOT_READY';
      if(currentClass==='DEVELOPMENT_CONFIRMED'){
        demoteStaleAdmission({seed,queue,portfolio,catalog,gameId,reason,stamp});
        demoted.push(gameId);
      }
      skipped.push({gameId,reason});
      continue;
    }

    const outcome=syncReadyMirrors({seed,design,portfolio,catalog,queue,stamp});
    if(outcome==='promoted')promoted.push(gameId); else reconciled.push(gameId);
  }

  state.updatedAt=stamp;
  portfolio.updatedAt=stamp;
  catalog.updatedAt=stamp;
  queue.updatedAt=stamp;
  delete queue.webValidationPolicy;
  queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT';
  queue.developmentGameWipMax=null;
  for(const item of queue.items||[])if(clean(item?.productionClass).toUpperCase()==='DEVELOPMENT_CONFIRMED')removeLegacyWebAdmissionFields(item);

  writeJson(seedPath,state);
  writeJson(portfolioPath,portfolio);
  writeJson(catalogPath,catalog);
  writeJson(queuePath,queue);

  return {
    promoted,
    reconciledExisting:[],
    reconciledPromotedSeeds:reconciled,
    demoted,
    skipped,
    queueCount:queue.items.length,
    directNativeDual:true
  };
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=promoteReadyDesignSeeds();
  console.log(`DESIGN_PROMOTION_COUNT=${result.promoted.length}`);
  console.log(`DESIGN_PROMOTED_GAME_IDS=${result.promoted.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_CONFIRMED_RECONCILED=${result.reconciledPromotedSeeds.join(',')||'NONE'}`);
  console.log(`STALE_DEVELOPMENT_CONFIRMED_DEMOTED=${result.demoted.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log('DEVELOPMENT_ADMISSION_GATE=MINIMUM_DUAL_PLATFORM_DESIGN_READY');
  console.log('STRICT_DESIGN_REVIEW=PARALLEL_NON_ADMISSION_GATE');
  console.log('UNITY_WEB_ROLE=OPTIONAL_NON_BLOCKING_VALIDATION_SURFACE');
}
