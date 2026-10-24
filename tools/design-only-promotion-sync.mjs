// 파일명: tools/design-only-promotion-sync.mjs
// Canonical DESIGN_ONLY -> DEVELOPMENT_CONFIRMED reconciliation.
// DESIGN_ONLY is transient. Minimum common design + distinct Roblox/Unity profiles are the only design admission gate.
// Strict design review continues in parallel and never acts as the native development admission score gate.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveSelectedPlatform} from './company-selected-platform-router.mjs';
import {materializeOwnerDesignResetSeeds} from './owner-design-reset.mjs';
import {latestMinimumDesign,materializeVibeMinimumDesign} from './company-minimum-design-contract.mjs';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=v=>String(v??'').trim();
const nowIso=()=>new Date().toISOString();
const selectedPlatformOf=seed=>'ROBLOX'; // Unity is owner-held, including historical Android requests.
const directNativeSourcePaths=gameId=>({ROBLOX:`roblox-games/${gameId}`});
const DEDICATED_TARGET_REGISTRY='roblox-dedicated-targets.json';
const LEGACY_WEB_ADMISSION_KEYS=Object.freeze([
  'webPurpose','webCompanionRequired','webValidationRequired','webGameplayValidationRequired','musicValidationRequired',
  'webEvidenceMayReplaceNativePlatformEvidence','webBeforeTargetPlatformByDefault','webSourcePath','webFirstGatePassed',
  'webSecondGateRequired','webPlatformHandoff','unityWebFirstStagePassed','vibeWebImplementationRequired',
  'vibeWebRequestedStage','vibeWebImplementationReason','postPromotionArtbookRequired','postWebArtbookRequired',
  'newFeatureExpansionFrozen'
]);
const removeLegacyWebAdmissionFields=target=>{
  if(!target||typeof target!=='object')return target;
  for(const key of LEGACY_WEB_ADMISSION_KEYS)delete target[key];
  return target;
};
const LEGACY_QUEUE_ROOT_KEYS=Object.freeze([
  'webValidationPolicy','webValidationContractVersion','webGateRequired','webValidationParallelism',
  'robloxSourceParallelism','robloxTechnicalParallelism','webValidationEvidenceSchemaMinimum',
  'webPromotionRevalidationRequired'
]);
const clearLegacyQueueCaps=queue=>{
  if(!queue||typeof queue!=='object')return queue;
  for(const key of LEGACY_QUEUE_ROOT_KEYS)delete queue[key];
  if(queue.ownerPrimaryDevelopment&&typeof queue.ownerPrimaryDevelopment==='object')delete queue.ownerPrimaryDevelopment.maxConcurrentPrimary;
  if(queue.fastLaunch&&typeof queue.fastLaunch==='object')delete queue.fastLaunch.newFeatureExpansionFrozen;
  queue.internalConcurrencyCap=null;
  queue.externalCapacityOnlyBoundary=true;
  queue.automaticFeatureExpansionFreezeForbidden=true;
  return queue;
};


function assertCanonicalDirectNativePolicy(root='.'){
  const roadmap=readJson(path.join(root,'company-learning/platform-release-roadmap.json'),{});
  const d=roadmap?.directNativeDualPlatformDevelopment||{};
  const web=d.unityWebValidationSurface||{};
  const pairing=d.automaticPairing||d.autoPairRules||{};
  const development=d.development||{};
  const gate=d?.upperPlatformDevelopmentReadinessGate||{};
  const active=d.ownerActiveDevelopmentScope20261009?.activeTargets||[];
  const webActive=active.includes('UNITY_WEB');
  const nativeActive=active.includes('UNITY_ANDROID');
  const pair=webActive?['ROBLOX','UNITY_WEB_FLOOR']:nativeActive?['ROBLOX']:['ROBLOX'];
  // 최소 공유 설계는 보존하고, 현재 오너가 연 플랫폼만 실행한다.
  // Android/Unity 앱은 오너 홀드이며, 오래된 Unity Web 선행 입장 관문을 되살리지 않는다.
  const ok=roadmap.authority==='MACHINE_EXECUTION_CONTRACT'
    &&roadmap.developmentAccess?.ROBLOX==='ALWAYS_ALLOWED'
    &&roadmap.developmentAccess?.UNITY_WEB===(webActive?'ALWAYS_ALLOWED':'OWNER_HOLD')
    &&roadmap.developmentAccess?.UNITY===(nativeActive?'ALWAYS_ALLOWED':'OWNER_HOLD')
    &&d.status==='OWNER_DIRECT_LOCKED'
    &&d.mode==='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'
    &&active.includes('ROBLOX')
    &&d.canonicalDevelopmentAdmissionAuthority===true
    &&d.minimumDesignRequired===true
    &&d.strictDesignScoreRequiredForDevelopmentAdmission===false
    &&d.legacyWebFirstFallbackForbidden===true
    &&d.webDevelopmentStageRemoved===false
    &&d.unityWebEnabled===webActive
    &&d.unityWebRequired===webActive
    &&d.unityWebGateRequired===false
    &&d.unityWebMode==='UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR'
    &&d.upperPlatformAdmission==='MINIMUM_DESIGN_READY'
    &&web.requiredForDevelopmentAdmission===false
    &&development.unityWebDevelopmentFloorRequiredBeforeUpperPlatformStart===false
    &&development.upperPlatformDevelopmentStartsOnlyAfterUnityWebReadinessPass===false
    &&gate.gateId==='UPPER_PLATFORM_DEVELOPMENT_READY'
    &&gate.allCriteriaRequired===true
    &&Array.isArray(gate.targets)
    &&gate.targets.join(',')==='ROBLOX,UNITY'
    &&Array.isArray(d.supportedDevelopmentPlatforms)
    &&d.supportedDevelopmentPlatforms.join(',')==='ROBLOX,UNITY'
    &&Array.isArray(pairing.ROBLOX)
    &&pairing.ROBLOX.join(',')===pair.join(',')
    &&Array.isArray(pairing.UNITY)
    &&pairing.UNITY.join(',')===(webActive?'UNITY_WEB_FLOOR':nativeActive?'ROBLOX,UNITY':'');
  if(!ok)throw new Error('CANONICAL_DIRECT_NATIVE_POLICY_REQUIRED');
  return d;
}
function freshAfterOwnerReset(design,resetAt=0){
  if(!resetAt)return true;
  const resetDate=new Date(resetAt).toISOString().slice(0,10);
  return Boolean(design?.date&&String(design.date)>resetDate);
}
function recoverExactPrivateRuntimeCheckpoint(item,design){
  const priorDesignSource=clean(item?.minimumDesignContract?.source||item?.designBaselineSource);
  if(priorDesignSource&&priorDesignSource!==clean(design?.file))return null;
  const step=clean(item?.currentStep).toUpperCase();
  const state=clean(item?.canonicalState).toUpperCase();
  if(step&&step!=='TARGET_PLATFORM_SOURCE_BIND'&&state!=='PENDING_ROBLOX_SOURCE_BIND')return null;
  const candidate=item?.robloxRuntimeCandidateEvidence||{};
  const exact=candidate?.published===true
    &&clean(candidate.sourceRevision)===clean(item?.robloxSourceCommit)
    &&clean(candidate.artifactIdentity)===clean(item?.robloxBuildArtifactIdentity)
    &&Number(candidate.versionNumber)>0;
  if(!exact)return null;
  return{currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION',canonicalState:'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED'};
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
function directQueueProgressIsCurrent(item,design){
  return item?.minimumDesignContract?.pass===true
    &&clean(item?.minimumDesignContract?.source)===clean(design?.file)
    &&Array.isArray(item?.concurrentTargetPlatforms)
    &&item.concurrentTargetPlatforms.includes('ROBLOX')
    &&clean(item?.currentStep)
    &&!/^WEB_|^WAITING_WEB/.test(clean(item.currentStep).toUpperCase());
}
function bindDirectNativeQueueItem(item,{seed,design,stamp}){
  const gameId=clean(seed?.gameId);
  const selectedPlatform=selectedPlatformOf(seed);
  const paths=directNativeSourcePaths(gameId);
  const preserveProgress=directQueueProgressIsCurrent(item,design);
  const recoveredProgress=recoverExactPrivateRuntimeCheckpoint(item,design);
  const previousStep=recoveredProgress?.currentStep||(preserveProgress?item.currentStep:null);
  const previousState=recoveredProgress?.canonicalState||(preserveProgress?item.canonicalState:null);
  const ownerPreservationPresentationUpgrade=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true
    &&clean(seed?.OWNER_REBUILD_MODE).toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';

  Object.assign(item,{
    gameId,
    seedId:item.seedId||seed.seedId||null,
    gameName:item.gameName||seed.gameName||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',
    status:['DISABLED'].includes(clean(item.status).toUpperCase())?'ACTIVE':(item.status||'ACTIVE'),
    selectedPlatform,
    targetPlatform:selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX'],
    platformExecutionMode:'ROBLOX_ONLY_OWNER_ACTIVE',
    bidirectionalAutoPair:false,
    requestEitherStartsBoth:false,
    targetSourcePaths:paths,
    robloxProjectPath:paths.ROBLOX,
    targetSourcePath:paths[selectedPlatform]||paths.ROBLOX,
    sourcePath:paths[selectedPlatform]||paths.ROBLOX,
    designBaselineSource:design.file,
    designDate:design.date,
    minimumDesignContract:{
      version:1,pass:true,source:design.file,date:design.date,
      releaseChecklist:design.gate.releaseChecklist,
      commonCoreReady:true,platformProfiles:{ROBLOX:true,UNITY:true,distinct:true}
    },
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'}
    },
    artbookTiming:'PARALLEL_NATIVE_PRESENTATION_SUPPORT',
    ownerPreservationPresentationUpgrade,
    presentationFirstPass:ownerPreservationPresentationUpgrade?'ASSET_ADAPTATION':(item.presentationFirstPass||null),
    internalReleaseTarget:{
      ROBLOX:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE_OWNER_PLAYABLE'
    },
    externalReleasePolicy:'PLATFORM_INDEPENDENT_AFTER_OWN_QA',
    currentStep:previousStep||'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:previousState||'PENDING_ROBLOX_SOURCE_BIND',
    enqueuedAt:item.enqueuedAt||stamp
  });
  removeLegacyWebAdmissionFields(item);
  return item;
}
// Scoped WEB admission uses the same minimum-design, queue, Vibe and F0-F9 machinery.
// It does not publish a prototype or start the owner-held Unity engine.
function syncReadyGeneralWebMirrors({seed,design,portfolio,catalog,queue,stamp}){
  const gameId=clean(seed.gameId),root='web-games/'+gameId;
  const sourceFile=root+'/index.html';
  if(!fs.existsSync(sourceFile))throw new Error('GENERAL_WEB_SOURCE_NOT_PRESENT:'+gameId);
  const minimum={version:1,pass:true,source:design.file,date:design.date};
  const wasConfirmed=clean(seed.productionClass).toUpperCase()==='DEVELOPMENT_CONFIRMED';
  let project=(portfolio.projects||[]).find(row=>clean(row?.slug)===gameId);
  let game=(catalog.games||[]).find(row=>clean(row?.id)===gameId);
  let item=(queue.items||[]).find(row=>clean(row?.gameId)===gameId);
  if(!game||game.ownerWebIntakeEngine!=='HTML_CSS_JAVASCRIPT'||game.web3dRedevelopmentRequired!==true)
    throw new Error('GENERAL_WEB_CANONICAL_SOURCE_BINDING_MISSING:'+gameId);
  const before=[seed,project,game,item].map(row=>JSON.stringify(row));
  const sourcePaths={WEB:root};
  Object.assign(seed,{
    productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'MINIMUM_GENERAL_WEB_DESIGN_READY',
    selectedPlatform:'WEB',concurrentTargetPlatforms:['WEB'],platformExecutionMode:'GENERAL_WEB_ONLY_OWNER_ACTIVE',
    lifecycleState:'DEVELOPMENT_CONFIRMED',minimumDesignContract:minimum,
    platformDesignProfiles:{WEB:{source:design.file,jsonPointer:'/content/webCanonicalDesign'}},
    promotion:{from:wasConfirmed?'DEVELOPMENT_CONFIRMED':'DESIGN_ONLY',to:'DEVELOPMENT_CONFIRMED',
      reason:'MINIMUM_GENERAL_WEB_DESIGN_READY',requestedPlatform:'WEB',concurrentTargetPlatforms:['WEB'],
      targetSourcePaths:sourcePaths,designBaselineSource:design.file,designDate:design.date,
      strictDesignReviewRequiredForAdmission:false,strictDesignReviewContinuesInParallel:true,
      promotedAt:seed?.promotion?.promotedAt||stamp}
  });
  if(!project){project={id:'SEED-'+(seed.seedId||gameId),slug:gameId,name:seed.gameName||gameId,protectedValues:['core-loop','design-baseline','save-meaning']};portfolio.projects.push(project);}
  Object.assign(project,{
    productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'MINIMUM_GENERAL_WEB_DESIGN_READY',
    profileStatus:'DEVELOPMENT_CONFIRMED',mode:'GENERAL_WEB_3D_AUTONOMOUS',targetEngine:'web',
    selectedPlatform:'WEB',concurrentTargetPlatforms:['WEB'],targetSourcePaths:sourcePaths,
    sourcePath:root,productionSourcePath:root,designBaselineSource:design.file,platformDesignProfiles:seed.platformDesignProfiles,
    approvedDesignScopeMustBeFullyImplemented:true,strictDesignScoreRequiredForAdmission:false,
    strictDesignReviewRunsInParallel:true
  });
  Object.assign(game,{
    productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'MINIMUM_GENERAL_WEB_DESIGN_READY',
    homepageCategory:'development-confirmed',selectedPlatform:'WEB',concurrentTargetPlatforms:['WEB'],
    productionTarget:'WEB',targetSourcePaths:sourcePaths,
    homepageOfficialCard:false,homepageTestCandidate:false,
    homepageStage:'개발확정 · 일반 웹 3D F0~F9 자동개발',
    homepageRecentWork:'설계 검증 → HTML·JavaScript·WebGL 3D 원본 개발',
    hasWebArchive:true,webPath:root,
    homepageWebPlayable:game.homepageWebPlayable===true&&game.ownerWebSourceState==='WEB_F9_RUNTIME_VERIFIED'
  });
  if(!item){item={};queue.items.push(item);}
  const sameDesign=item.minimumDesignContract?.pass===true&&clean(item.minimumDesignContract.source)===design.file;
  Object.assign(item,{
    gameId,seedId:item.seedId||seed.seedId||null,gameName:item.gameName||seed.gameName||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'MINIMUM_GENERAL_WEB_DESIGN_READY',
    status:clean(item.status).toUpperCase()==='DISABLED'?'ACTIVE':(item.status||'ACTIVE'),
    selectedPlatform:'WEB',targetPlatform:'WEB',concurrentTargetPlatforms:['WEB'],
    platformExecutionMode:'GENERAL_WEB_ONLY_OWNER_ACTIVE',bidirectionalAutoPair:false,requestEitherStartsBoth:false,
    targetSourcePaths:sourcePaths,targetSourcePath:root,sourcePath:root,designBaselineSource:design.file,designDate:design.date,
    minimumDesignContract:{...minimum,commonCoreReady:true,platformProfiles:{WEB:true}},
    platformDesignProfiles:seed.platformDesignProfiles,
    web3dRedevelopmentRequired:true,ownerWebIntakeEngine:'HTML_CSS_JAVASCRIPT',
    ownerWebSourceRevision:clean(game.ownerWebSourceRevision),
    artbookTiming:'PARALLEL_GENERAL_WEB_PRESENTATION_SUPPORT',
    internalReleaseTarget:{WEB:'GITHUB_PAGES_EXACT_F9_VERIFIED_WEB_RUNTIME'},
    externalReleasePolicy:'WEB_EXACT_F9_QA_AND_PUBLICATION',
    currentStep:sameDesign&&item.currentStep?item.currentStep:'TARGET_PLATFORM_SOURCE_BIND',
    canonicalState:sameDesign&&item.canonicalState?item.canonicalState:'PENDING_WEB_3D_SOURCE_BIND',
    enqueuedAt:item.enqueuedAt||stamp
  });
  removeLegacyWebAdmissionFields(item);
  for(const [index,row]of [seed,project,game,item].entries())if(JSON.stringify(row)!==before[index])row.updatedAt=stamp;
  return wasConfirmed?'reconciled':'promoted';
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
    homepageStage:'최소 Roblox 설계 보강 필요',
    updatedAt:stamp
  });removeLegacyWebAdmissionFields(game);}
}
function syncReadyMirrors({seed,design,portfolio,catalog,queue,dedicatedRegistry,stamp}){
  const gameId=clean(seed.gameId);
  const selectedPlatform=selectedPlatformOf(seed);
  const paths=directNativeSourcePaths(gameId);
  const wasConfirmed=clean(seed.productionClass).toUpperCase()==='DEVELOPMENT_CONFIRMED';
  let project=(portfolio.projects||[]).find(row=>clean(row?.slug)===gameId);
  let game=(catalog.games||[]).find(row=>clean(row?.id)===gameId);
  let item=(queue.items||[]).find(row=>clean(row?.gameId)===gameId);
  const before=[seed,project,game,item].map(row=>JSON.stringify(row));

  Object.assign(seed,{
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionTier:2,
    productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',
    lifecycleState:'DEVELOPMENT_CONFIRMED',
    selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX'],
    platformExecutionMode:'ROBLOX_ONLY_OWNER_ACTIVE',
    minimumDesignContract:{version:1,pass:true,source:design.file,date:design.date},
    platformDesignProfiles:{
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'}
    },
    promotion:{
      from:wasConfirmed?'DEVELOPMENT_CONFIRMED':'DESIGN_ONLY',
      to:'DEVELOPMENT_CONFIRMED',
      reason:'MINIMUM_ROBLOX_DESIGN_READY',
      requestedPlatform:selectedPlatform,
      concurrentTargetPlatforms:['ROBLOX'],
      targetSourcePaths:paths,
      designBaselineSource:design.file,
      designDate:design.date,
      strictDesignReviewRequiredForAdmission:false,
      strictDesignReviewContinuesInParallel:true,
      promotedAt:seed?.promotion?.promotedAt||stamp
    }
  });

  if(!project){
    project={id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,protectedValues:['core-loop','design-baseline','save-meaning']};
    portfolio.projects.push(project);
  }
  Object.assign(project,{
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',
    profileStatus:'DEVELOPMENT_CONFIRMED',
    mode:'ROBLOX_ONLY_OWNER_ACTIVE',
    productionTier:2,
    targetEngine:'ROBLOX',
    selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX'],
    targetSourcePaths:paths,
    sourcePath:paths[selectedPlatform]||paths.ROBLOX,
    designBaselineSource:design.file,
    platformDesignProfiles:seed.platformDesignProfiles
  });
  removeLegacyWebAdmissionFields(project);

  if(!game){
    game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Roblox 개발',genre:[clean(seed.GAME_CATEGORY).replaceAll('_',' ')],image:'',featured:false};
    catalog.games.push(game);
  }
  Object.assign(game,{
    homepageCategory:'development-confirmed',
    productionClass:'DEVELOPMENT_CONFIRMED',
    productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',
    productionTier:2,
    selectedPlatform,
    concurrentTargetPlatforms:['ROBLOX'],
    productionTarget:'ROBLOX',
    targetSourcePaths:paths,
    homepageOfficialCard:false,
    homepageTestCandidate:false,
    homepageStage:'개발확정 · Roblox 개발',
    homepageRecentWork:'최소 설계 계약 완료 · Roblox 개발 진행',
    homepageWebPlayable:Boolean(game.homepageWebPlayable)
  });
  removeLegacyWebAdmissionFields(game);

  if(!item){item={};queue.items.push(item);}
  bindDirectNativeQueueItem(item,{seed,design,stamp});
  restoreDedicatedTargetIdentity(item,{registry:dedicatedRegistry,gameId,stamp});
  // 메인: 실제 승격·복구가 있을 때만 해당 항목의 갱신 시각을 바꾼다.
  for(const [index,row] of [seed,project,game,item].entries()){
    if(JSON.stringify(row)!==before[index])row.updatedAt=stamp;
  }
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
  const stateBefore=JSON.stringify(state);
  delete state.policyDocument;
  state.policyAuthority='company-learning/platform-release-roadmap.json';
  materializeOwnerDesignResetSeeds(state,{file:p('owner-design-reset-queue.json')});
  const portfolio=readJson(portfolioPath,{version:1,projects:[]});
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  const documentsBefore=[stateBefore,JSON.stringify(portfolio),JSON.stringify(catalog),JSON.stringify(queue)];
  const dedicatedRegistry=readJson(p(DEDICATED_TARGET_REGISTRY),{version:1,targets:[]});
  state.seeds ||= []; portfolio.projects ||= []; catalog.games ||= []; queue.items ||= [];

  const stamp=nowIso();
  const catalogById=new Map(catalog.games.map(game=>[clean(game?.id),game]).filter(([gameId])=>gameId));
  const promoted=[],reconciled=[],demoted=[],skipped=[],reactivatedLegacyCatalogPauses=[];
  const resetAt=Date.parse(state?.ownerAllGamesDesignReset?.updatedAt||'')||0;
  const resetIds=new Set(Array.isArray(state?.ownerAllGamesDesignReset?.gameIds)?state.ownerAllGamesDesignReset.gameIds.map(String):[]);

  // 메인: 디자이너 정밀 설계를 기다리는 동안 바이브의 원본 근거 기반 최소 설계 한 건을 먼저 만든다.
  // 기존 설계·실행 진행도·저장 의미를 덮어쓰지 않으며, 정밀 설계 PASS/QA/출시 증거는 생성하지 않는다.
  const vibeMinimumCreated=[];
  for(const seed of state.seeds){
    const gameId=clean(seed?.gameId);
    if(clean(seed?.status).toUpperCase()!=='ACTIVE'||clean(seed?.productionClass).toUpperCase()==='RELEASE_CONFIRMED')continue;
    const catalogGame=catalogById.get(gameId);
    const lifecycle=clean(catalogGame?.canonical?.lifecycle?.state||catalogGame?.lifecycleState||'ACTIVE').toUpperCase();
    if(!['ACTIVE','REBUILD'].includes(lifecycle))continue;
    const existing=latestMinimumDesign(root,gameId,{seed});
    const ownerResetAt=resetIds.has(gameId)?resetAt:0;
    if(existing&&freshAfterOwnerReset(existing,ownerResetAt))continue;
    const result=materializeVibeMinimumDesign({root,seed,catalogGame,ownerResetAt});
    if(result.created){
      vibeMinimumCreated.push({gameId,file:result.file});
      break;
    }
  }

  for(const seed of state.seeds){
    const gameId=clean(seed?.gameId); if(!gameId)continue;
    const seedStatus=clean(seed?.status).toUpperCase();
    const pausedReason=clean(seed?.pausedReason).toUpperCase();
    const catalogGame=catalogById.get(gameId);
    const catalogLifecycle=clean(catalogGame?.canonical?.lifecycle?.state||catalogGame?.lifecycleState).toUpperCase();
    if(seedStatus==='PAUSED'&&pausedReason==='NOT_IN_CANONICAL_GAME_CATALOG'&&catalogLifecycle==='ACTIVE'){
      seed.status='ACTIVE';
      delete seed.pausedReason;
      seed.updatedAt=stamp;
      reactivatedLegacyCatalogPauses.push(gameId);
    }
    if(clean(seed?.status).toUpperCase()!=='ACTIVE')continue;
    const currentClass=clean(seed?.productionClass).toUpperCase();
    if(currentClass==='RELEASE_CONFIRMED'){skipped.push({gameId,reason:'ALREADY_RELEASED'});continue;}

    const design=latestMinimumDesign(root,gameId,{seed});
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

    // WEB is an independent general-browser engine, never a Roblox or Unity alias.
    const generalWebSeed=clean(seed.INITIAL_TARGET_PLATFORM).toUpperCase()==='WEB'
      &&catalogGame?.ownerWebIntakeEngine==='HTML_CSS_JAVASCRIPT'
      &&catalogGame?.web3dRedevelopmentRequired===true;
    if(generalWebSeed&&!fs.existsSync(p('web-games',gameId,'index.html'))){
      skipped.push({gameId,reason:'GENERAL_WEB_SOURCE_NOT_READY'});continue;
    }
    const outcome=generalWebSeed
      ?syncReadyGeneralWebMirrors({seed,design,portfolio,catalog,queue,stamp})
      :syncReadyMirrors({seed,design,portfolio,catalog,queue,dedicatedRegistry,stamp});
    if(outcome==='promoted')promoted.push(gameId); else reconciled.push(gameId);
  }

  queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_ONLY';
  queue.developmentGameWipMax=null;
  for(const game of catalog.games||[])removeLegacyWebAdmissionFields(game);
  for(const item of queue.items||[])removeLegacyWebAdmissionFields(item);
  clearLegacyQueueCaps(queue);
  if(catalog.normalization&&typeof catalog.normalization==='object')catalog.normalization.automaticFeatureExpansionFreezeForbidden=true;

  for(const [index,[file,value]] of [[seedPath,state],[portfolioPath,portfolio],[catalogPath,catalog],[queuePath,queue]].entries()){
    if(JSON.stringify(value)===documentsBefore[index])continue;
    value.updatedAt=stamp;
    writeJson(file,value);
  }

  return {
    promoted,
    vibeMinimumCreated,
    reconciledExisting:[],
    reconciledPromotedSeeds:reconciled,
    demoted,
    skipped,
    reactivatedLegacyCatalogPauses,
    queueCount:queue.items.length,
    directNativeDual:false
  };
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=promoteReadyDesignSeeds();
  console.log(`VIBE_MINIMUM_DESIGN_CREATED=${result.vibeMinimumCreated.map(item=>item.gameId+':'+item.file).join(',')||'NONE'}`);
  console.log(`DESIGN_PROMOTION_COUNT=${result.promoted.length}`);
  console.log(`DESIGN_PROMOTED_GAME_IDS=${result.promoted.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_CONFIRMED_RECONCILED=${result.reconciledPromotedSeeds.join(',')||'NONE'}`);
  console.log(`STALE_DEVELOPMENT_CONFIRMED_DEMOTED=${result.demoted.join(',')||'NONE'}`);
  console.log(`STALE_CATALOG_PAUSES_REACTIVATED=${result.reactivatedLegacyCatalogPauses.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log('DEVELOPMENT_ADMISSION_GATE=MINIMUM_ROBLOX_DESIGN_READY');
  console.log('STRICT_DESIGN_REVIEW=PARALLEL_NON_ADMISSION_GATE');
  console.log('UNITY_WEB_ROLE=OWNER_HOLD_NO_DEVELOPMENT');
}
