// 파일명: tools/company-direct-native-design-migration.mjs
// 역할: 기존 설계를 현재 네이티브 개발 계약으로 옮기며 이미 반영된 계약과 진행도는 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateMinimumDesignContract} from './company-minimum-design-contract.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const now=()=>new Date().toISOString();

function profileFieldsReady(profile={},platform=''){
  const required=['inputModel','sessionModel','multiplayerRuntime','performanceBudget','uiUx','saveAndNetwork','platformContentAdaptation','internalReleaseTarget','validationEvidence'];
  return clean(profile.platform).toUpperCase()===platform&&required.every(k=>clean(profile[k]).length>=8);
}
function multiplayerText(mode='SINGLE'){
  const m=clean(mode).toUpperCase();
  if(m==='SINGLE')return {roblox:'single-player server boundary with local presentation; no fake multiplayer claims',unity:'single-player app session with local gameplay authority; networking remains disabled until design requires it'};
  if(m==='COOP')return {roblox:'server-authoritative Roblox co-op replication with join/leave and shared objective synchronization',unity:'authoritative co-op transport with reconnect, join/leave, shared objective synchronization, and app lifecycle recovery'};
  if(m==='COMPETITIVE')return {roblox:'server-authoritative Roblox competitive replication with anti-cheat validation and synchronized round state',unity:'authoritative competitive network transport with anti-cheat validation, reconnect, and synchronized round state'};
  return {roblox:'server-authoritative Roblox hybrid multiplayer with co-op and competitive state separated by mode',unity:'authoritative hybrid app networking with explicit co-op and competitive session modes plus reconnect recovery'};
}
function buildProfiles(content={},gameId=''){
  const identity=clean(content.identity||gameId);
  const core=clean(content.coreFun||identity);
  const loop=(Array.isArray(content.coreLoop)?content.coreLoop:[]).map(clean).filter(Boolean).slice(0,4).join(' → ');
  const net=multiplayerText(content.multiplayerMode);
  return {
    ROBLOX:{
      platform:'ROBLOX',
      inputModel:'Roblox touch controls first, with keyboard and gamepad parity through ContextActionService and Activated-based UI actions.',
      sessionModel:'Fast Roblox experience sessions with spawn, respawn, join-in-progress, and social re-entry semantics matched to the common game loop.',
      multiplayerRuntime:net.roblox,
      performanceBudget:'Roblox mobile-first budget: bounded parts and effects, pooled transient objects, limited expensive per-frame work, and stable low-end frame pacing.',
      uiUx:'Roblox ScreenGui touch-safe layout with readable mobile controls, controller focus support, observable state feedback, and platform-native social affordances.',
      saveAndNetwork:'Server-validated RemoteEvents plus DataStore-backed persistent state only for approved save meaning; clients never own authoritative rewards or progression.',
      platformContentAdaptation:`Adapt "${identity}" and its loop "${loop||core}" to Roblox avatar scale, server/client authority, social sessions, and Roblox-native interaction without changing common gameplay meaning.`,
      internalReleaseTarget:'Private or restricted Roblox experience published to Roblox servers so the owner and explicitly allowed testers can play before public release.',
      validationEvidence:'Exact published Roblox place and source revision, real Roblox runtime play, mobile controls, server/client boundary, save/rejoin when required, independent QA, and regression evidence.'
    },
    UNITY:{
      platform:'UNITY',
      inputModel:'Unity Input System with touch-first on-screen controls, safe-area handling, keyboard and gamepad parity, and app pause/resume input recovery.',
      sessionModel:'Native mobile app sessions with cold start, suspend/resume, background/foreground transitions, process restart, and deterministic save restoration.',
      multiplayerRuntime:net.unity,
      performanceBudget:'Android mobile budget covering memory, GPU, thermal load, battery, draw calls, shaders, particles, audio, pooling, GC pressure, and low-end frame pacing.',
      uiUx:'Unity UI safe-area responsive layout with touch targets, scalable HUD, controller navigation where relevant, and app-native loading/error/recovery states.',
      saveAndNetwork:'Versioned local save with explicit migration plus validated backend synchronization only when required; app lifecycle cannot silently corrupt progress.',
      platformContentAdaptation:`Adapt "${identity}" and its loop "${loop||core}" to Unity scenes, prefabs, mobile app lifecycle, touch UX, and Android packaging without changing common gameplay meaning.`,
      internalReleaseTarget:'Internal or closed Android test build that can be installed and launched by the owner/testers before any public store release.',
      validationEvidence:'Exact APK/AAB source revision, install and launch, real touch gameplay, pause/resume, save/restore, performance, independent QA, regression, and package identity evidence.'
    }
  };
}
function migrateOne(record,gameId){
  const content=record?.content&&typeof record.content==='object'?record.content:record;
  const current=content.platformProfiles&&typeof content.platformProfiles==='object'?content.platformProfiles:{};
  const generated=buildProfiles(content,gameId);
  // Historical Unity design metadata stays readable but never becomes a new work request.
  content.platformProfiles={...current,ROBLOX:profileFieldsReady(current.ROBLOX,'ROBLOX')?current.ROBLOX:generated.ROBLOX};
  content.platformProfileMigration={
    version:1,
    mode:'COMMON_CORE_PRESERVED_PLATFORM_PROFILES_ADDED',
    commonCoreRewritten:false,
    profilesDistinctByPlatformEnvironment:false,
    strictReviewRefreshRequired:true,
    migratedAt:now()
  };
  return record;
}
export function migrateDirectNativeRuntime(root='.'){
  const queuePath=path.join(root,'development-queue.json');
  const seedPath=path.join(root,'game-seed-state.json');
  const portfolioPath=path.join(root,'autonomous-portfolio.json');
  const catalogPath=path.join(root,'game-catalog.json');
  const queue=read(queuePath),seedState=read(seedPath),portfolio=read(portfolioPath),catalog=read(catalogPath);
  queue.items ||= [];seedState.seeds ||= [];portfolio.projects ||= [];catalog.games ||= [];
  const stamp=now(),migrated=[],alreadyReady=[],blocked=[];
  let updatedItems=0;
  for(const item of queue.items){
    if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')continue;
    if(clean(item.status||'ACTIVE').toUpperCase()!=='ACTIVE')continue;
    const gameId=clean(item.gameId); if(!gameId)continue;
    const source=clean(item.designBaselineSource||item.minimumDesignContract?.source);
    if(!source||!fs.existsSync(path.join(root,source))){blocked.push({gameId,reason:'DESIGN_BASELINE_SOURCE_MISSING'});continue;}
    const file=path.join(root,source);
    const seed=seedState.seeds.find(x=>clean(x.gameId)===gameId);
    const contractOptions={seed:seed||{}};
    let design=read(file);
    let gate=evaluateMinimumDesignContract(design,contractOptions);
    const designAlreadyReady=gate.pass===true;
    if(!gate.pass){
      design=migrateOne(design,gameId);
      gate=evaluateMinimumDesignContract(design,contractOptions);
      if(!gate.pass){blocked.push({gameId,reason:'MINIMUM_DESIGN_STILL_INCOMPLETE',blockers:gate.blockers});continue;}
      write(file,design);
      migrated.push(gameId);
    }else alreadyReady.push(gameId);

    const project=portfolio.projects.find(x=>clean(x.slug)===gameId);
    const game=catalog.games.find(x=>clean(x.id)===gameId);
    // 메인: 검증된 현재 승격 계약은 레거시 변환으로 다시 덮어쓰지 않는다.
    const alreadyPromoted=designAlreadyReady
      &&item.minimumDesignContract?.pass===true&&item.minimumDesignContract.source===source
      &&JSON.stringify(item.minimumDesignContract.releaseChecklist)===JSON.stringify(gate.releaseChecklist)
      &&item.platformExecutionMode==='ROBLOX_ONLY_OWNER_ACTIVE'&&item.selectedPlatform==='ROBLOX'
      &&JSON.stringify(item.concurrentTargetPlatforms)==='["ROBLOX"]'
      &&item.platformDesignProfiles?.ROBLOX?.source===source
      &&item.platformDesignProfiles?.ROBLOX?.jsonPointer==='/content/platformProfiles/ROBLOX'
      &&clean(item.currentStep)&&!/^WEB_|^WAITING_WEB/.test(clean(item.currentStep).toUpperCase())
      &&!Object.hasOwn(item,'webValidationRequired')&&!Object.hasOwn(item,'musicValidationRequired')
      &&seed?.productionClass==='DEVELOPMENT_CONFIRMED'&&seed.minimumDesignContract?.source===source
      &&project?.mode==='ROBLOX_ONLY_OWNER_ACTIVE'&&project.designBaselineSource===source
      &&game?.productionClass==='DEVELOPMENT_CONFIRMED';
    if(alreadyPromoted)continue;
    updatedItems++;

    const paths={ROBLOX:`roblox-games/${gameId}`};
    // Repeated design migration must not rewind a source-bound native lane.
    // A new/migrated design or an unverified source still starts at source binding.
    const nativeStep=clean(item.currentStep).toUpperCase();
    const preserveNativeProgress=designAlreadyReady
      &&item.minimumDesignContract?.pass===true
      &&clean(item.minimumDesignContract.source)===source
      &&/^(?:TARGET_PLATFORM_|ROBLOX_|UNITY_|PRIVATE_RUNTIME_|INTERNAL_PLATFORM_|POST_F9_|BUILD_UP(?:$|_))/.test(nativeStep)
      &&['roblox'].some(platform=>{
        const passedAt=Date.parse(item[platform+'SourceBootstrapPassedAt']||'');
        const failedAt=Date.parse(item[platform+'SourceBootstrapFailedAt']||'');
        return /^[0-9a-f]{40}$/i.test(clean(item[platform+'SourceCommit']))
          &&Number.isFinite(passedAt)
          &&(!Number.isFinite(failedAt)||failedAt<passedAt);
      });
    const legacyWeb={
      webSourcePath:item.webSourcePath||null,
      currentStep:item.currentStep||null,
      canonicalState:item.canonicalState||null,
      webValidationRequired:item.webValidationRequired===true,
      capturedAt:stamp
    };
    Object.assign(item,{
      productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',
      selectedPlatform:'ROBLOX',
      concurrentTargetPlatforms:['ROBLOX'],
      platformExecutionMode:'ROBLOX_ONLY_OWNER_ACTIVE',
      bidirectionalAutoPair:false,
      requestEitherStartsBoth:false,
      targetSourcePaths:paths,
      robloxProjectPath:item.robloxProjectPath||paths.ROBLOX,
      designBaselineSource:source,
      minimumDesignContract:{version:1,pass:true,source,commonCoreReady:true,platformProfiles:{ROBLOX:true,UNITY:gate.platformProfiles.UNITY,distinct:gate.platformProfiles.distinct},migratedFromLegacy:item.minimumDesignContract?.pass!==true},
      platformDesignProfiles:{
        ROBLOX:{source,jsonPointer:'/content/platformProfiles/ROBLOX'}
      },
      currentStep:preserveNativeProgress?item.currentStep:'TARGET_PLATFORM_SOURCE_BIND',
      canonicalState:preserveNativeProgress?(item.canonicalState||'TARGET_PLATFORM_REPAIR_REQUIRED'):'PENDING_ROBLOX_SOURCE_BIND',
      webValidationRequired:false,
      musicValidationRequired:false,
      webSourcePath:null,
      webPlatformHandoff:null,
      vibeWebImplementationRequired:false,
      vibeWebRequestedStage:null,
      vibeWebImplementationReason:null,
      unityWebFirstStagePassed:false,
      sourceRootBootstrapRequired:false,
      legacyWebReference:item.legacyWebReference||legacyWeb,
      internalReleaseTarget:{ROBLOX:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE_OWNER_PLAYABLE'},
      externalReleasePolicy:'PLATFORM_INDEPENDENT_AFTER_OWN_QA',
      strictDesignReviewRefreshRequired:true,
      updatedAt:stamp
    });
    if(seed)Object.assign(seed,{
      productionClass:'DEVELOPMENT_CONFIRMED',
      productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',
      lifecycleState:'DEVELOPMENT_CONFIRMED',
      concurrentTargetPlatforms:['ROBLOX'],
      platformExecutionMode:'ROBLOX_ONLY_OWNER_ACTIVE',
      minimumDesignContract:{version:1,pass:true,source},
      platformDesignProfiles:item.platformDesignProfiles,
      strictDesignReviewRefreshRequired:true,
      updatedAt:stamp,
      promotion:{...(seed.promotion||{}),to:'DEVELOPMENT_CONFIRMED',reason:'MINIMUM_ROBLOX_DESIGN_READY',concurrentTargetPlatforms:['ROBLOX'],designBaselineSource:source,strictDesignReviewRequiredForAdmission:false,strictDesignReviewContinuesInParallel:true,migratedAt:stamp}
    });
    if(project)Object.assign(project,{mode:'ROBLOX_ONLY_OWNER_ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',concurrentTargetPlatforms:['ROBLOX'],targetSourcePaths:paths,designBaselineSource:source,platformDesignProfiles:item.platformDesignProfiles,webValidationRequired:false,updatedAt:stamp});
    if(game)Object.assign(game,{productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'MINIMUM_ROBLOX_DESIGN_READY',concurrentTargetPlatforms:['ROBLOX'],productionTarget:'ROBLOX',targetSourcePaths:paths,homepageWebPlayable:false,webPath:null,homepageStage:'개발확정 · Roblox 개발',homepageRecentWork:'기존 공통 설계 보존 · Roblox 설계 보강 완료',updatedAt:stamp});
  }
  if(updatedItems===0)return {migrated,alreadyReady,blocked};
  queue.webValidationPolicy='DISABLED_DIRECT_NATIVE_DUAL_PLATFORM';
  queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_ONLY';
  queue.developmentGameWipMax=null;
  queue.updatedAt=stamp;seedState.updatedAt=stamp;portfolio.updatedAt=stamp;catalog.updatedAt=stamp;
  write(queuePath,queue);write(seedPath,seedState);write(portfolioPath,portfolio);write(catalogPath,catalog);
  return {migrated,alreadyReady,blocked};
}
if(process.argv[1]&&process.argv[1].endsWith('company-direct-native-design-migration.mjs')){
  const result=migrateDirectNativeRuntime('.');
  console.log('DIRECT_NATIVE_DESIGN_MIGRATION=PASS');
  console.log('MIGRATED='+result.migrated.join(','));
  console.log('ALREADY_READY='+result.alreadyReady.join(','));
  console.log('BLOCKED='+JSON.stringify(result.blocked));
}

