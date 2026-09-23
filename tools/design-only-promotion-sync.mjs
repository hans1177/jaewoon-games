// 파일명: tools/design-only-promotion-sync.mjs
// 중앙 direct-native 정책에서는 최소 공통 설계 + Roblox/Unity 프로필이 준비되면 즉시 DEVELOPMENT_CONFIRMED로 승격한다.
// Strict Design 검토는 개발 입장 게이트가 아니라 병렬 품질 개선으로 계속한다.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {resolveSelectedPlatform,adapterForPlatform} from './company-selected-platform-router.mjs';
import {materializeOwnerDesignResetSeeds} from './owner-design-reset.mjs';
import {latestMinimumDesign} from './company-minimum-design-contract.mjs';

const DESIGN_PASS_THRESHOLD=80;
const EXCELLENT_THRESHOLD=90;
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const nowIso=()=>new Date().toISOString();
const selectedPlatformOf=seed=>resolveSelectedPlatform(seed?.INITIAL_TARGET_PLATFORM||'',seed)||'ROBLOX';
const targetSourcePathOf=(gameId,platform)=>`${adapterForPlatform(platform)?.sourceRoot||''}${gameId}`;
const webSourcePathOf=gameId=>`web-games/${gameId}`;

function refreshCompletedDesignBaselineGates({root='.',state={}}={}){
  const gatePath=path.join(root,'tools/company-baseline-gate.mjs');
  if(!fs.existsSync(gatePath))return [];
  const refreshed=[];
  for(const seed of state.seeds||[]){
    if(String(seed?.status||'').toUpperCase()!=='ACTIVE')continue;
    if(String(seed?.productionClass||'DESIGN_ONLY').toUpperCase()!=='DESIGN_ONLY')continue;
    const gameId=String(seed?.gameId||'').trim();
    if(!gameId)continue;
    const gameRoot=path.join(root,'design',gameId);
    if(!fs.existsSync(gameRoot))continue;
    const dates=fs.readdirSync(gameRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(entry.name)).map(entry=>entry.name).sort().reverse();
    for(const date of dates){
      const base=path.join(gameRoot,date);
      const status=readJson(path.join(base,'cycle-status.json'),null);
      if(status?.status!=='COMPLETE'||status?.productionClass!=='DESIGN_ONLY'||!fs.existsSync(path.join(base,'design-revised.json')))continue;
      const run=spawnSync(process.execPath,[gatePath,`--game=${gameId}`],{
        cwd:root,
        env:{...process.env,GAME_ID:gameId,ARTBOOK_GAME_ID:gameId,DESIGN_DATE:date,ARTBOOK_DATE:date,BASELINE_GATE_REFRESH_MODE:'DESIGN_EVIDENCE'},
        encoding:'utf8'
      });
      if(run.status!==0){
        const detail=[run.stdout,run.stderr].map(value=>String(value||'').trim()).filter(Boolean).join('\n');
        throw new Error(`DESIGN_BASELINE_GATE_REFRESH_FAILED:${gameId}:${date}${detail?`\n${detail}`:''}`);
      }
      refreshed.push({gameId,date});
      break;
    }
  }
  return refreshed;
}

function baselineReadyForPromotion(status={}){
  const currentReady=status?.baselineGate?.state==='DESIGN_BASELINE_READY'&&status?.baselineGate?.ready===true;
  if(currentReady)return true;
  const blockers=Array.isArray(status?.baselineGate?.blockers)?status.baselineGate.blockers:[];
  const legacyDirectLeadOnly=blockers.length===1&&blockers[0]==='post-revision-five-department-review-required';
  const directFiveLeadReviewComplete=status?.disposition?.fiveDepartmentLeadReviewCompleted===true&&status?.meeting?.required===false;
  const meetingClear=Number(status?.baselineGate?.meeting?.conflictCount||0)===0&&Number(status?.baselineGate?.meeting?.holdCount||0)===0;
  return status?.status==='COMPLETE'&&status?.productionClass==='DESIGN_ONLY'&&legacyDirectLeadOnly&&directFiveLeadReviewComplete&&meetingClear;
}
function latestReadyDesign(root,gameId){
  const gameRoot=path.join(root,'design',gameId);
  if(!fs.existsSync(gameRoot))return null;
  const dates=fs.readdirSync(gameRoot,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse();
  for(const date of dates){
    const base=path.join(gameRoot,date);
    const status=readJson(path.join(base,'cycle-status.json'),null);
    const review=readJson(path.join(base,'strict-design-review.json'),null);
    const revised=path.join(base,'design-revised.json');
    const baselineReady=baselineReadyForPromotion(status)&&fs.existsSync(revised);
    if(!baselineReady)continue;
    return {date,status,review,designSource:path.relative(root,revised).replaceAll('\\','/'),strictSource:path.relative(root,path.join(base,'strict-design-review.json')).replaceAll('\\','/')};
  }
  return null;
}
function strictDesignPass(design){
  const review=design?.review;
  const pass=review?.verdict==='PASS'&&Number(review?.totalScore)>=DESIGN_PASS_THRESHOLD&&Array.isArray(review?.hardFailures)&&review.hardFailures.length===0;
  return {pass,review,file:design?.strictSource||null};
}
function designEvidenceAfterReset(design,{resetAt=0,resetDate=''}={}){
  if(!resetAt)return true;
  const review=design?.review||{};
  const evidenceAt=Date.parse(review.reviewedAt||review.generatedAt||review.updatedAt||review.createdAt||'')||0;
  if(evidenceAt)return evidenceAt>=resetAt;
  return Boolean(design?.date&&String(design.date)>String(resetDate||''));
}
function bindRequiredWebStage(item,{gameId,stamp}){
  const webSourcePath=webSourcePathOf(gameId);
  item.webSourcePath=webSourcePath;
  item.webValidationRequired=true;
  item.musicValidationRequired=true;
  item.homepageTestCandidate=false;
  item.homepageTestScore=null;
  item.homepageTestVerdict='WAITING_WEB_STRICT_REVIEW';
  item.status='ACTIVE';
  item.sourcePath=webSourcePath;
  item.currentStep='WEB_PLAYABLE_BOOTSTRAP';
  item.canonicalState='WAITING_WEB_GAMEPLAY_VALIDATION';
  item.webValidationQueuedAt=item.webValidationQueuedAt||stamp;
  item.postPromotionArtbookRequired=false;
  item.postWebArtbookRequired=true;
  item.artbookTiming='AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER';
}
function reconcileConfirmedMirrors({portfolio,catalog,seed,design}){
  const gameId=String(seed?.gameId||'').trim();
  const selectedPlatform=seed?.selectedPlatform||selectedPlatformOf(seed);
  const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
  const webSourcePath=webSourcePathOf(gameId);
  const artbookSource=`artbook-submissions/${gameId}/current.json`;
  const strictScore=Number(design?.review?.totalScore||seed?.strictDesignReview?.totalScore||seed?.promotion?.strictDesignScore||0)||null;
  let project=portfolio.projects.find(row=>row?.slug===gameId);
  if(!project){
    project={id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,sourcePath:webSourcePath,webArchivePath:webSourcePath,protectedValues:['core-loop','design-baseline','save-meaning']};
    portfolio.projects.push(project);
  }
  Object.assign(project,{productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'WEB_VALIDATION_THEN_POST_WEB_ARTBOOK_THEN_SELECTED_PLATFORM_IMPLEMENTATION',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',targetEngine:selectedPlatform,selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,sourcePath:webSourcePath,webArchivePath:project.webArchivePath||webSourcePath,webValidationRequired:true,musicValidationRequired:true,strictDesignScore:strictScore,designBaselineSource:design?.designSource||seed?.promotion?.designBaselineSource||project.designBaselineSource||null,designArtbookSource:artbookSource,artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER'});
  let game=catalog.games.find(row=>row?.id===gameId);
  if(!game){
    game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Strict Design PASS',genre:[String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'',webPath:`/${webSourcePath}/`,hasWebArchive:false,featured:false};
    catalog.games.push(game);
  }
  Object.assign(game,{homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,productionTarget:selectedPlatform,strictDesignScore:strictScore,excellentDesign:Number(strictScore||0)>=EXCELLENT_THRESHOLD,homepageOfficialCard:false,homepageTestCandidate:false,homepageTestScore:null,homepageReviewState:'WAITING_WEB_STRICT_REVIEW',homepageStage:'개발확정 · Web 제작/강심사 준비',homepageWebPlayable:false});
  return {project,game};
}

function reconcileConfirmedSeedQueue({queue,seed,design,stamp,forceFreshBaseline=false}){
  const gameId=String(seed?.gameId||'').trim();
  const selectedPlatform=seed?.selectedPlatform||selectedPlatformOf(seed);
  const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
  const webSourcePath=webSourcePathOf(gameId);
  const artbookSource=`artbook-submissions/${gameId}/current.json`;
  const ownerPreservationPresentationUpgrade=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true&&String(seed?.OWNER_REBUILD_MODE||'').toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
  let item=queue.items.find(row=>row?.gameId===gameId);
  if(item){
    item.productionClass='DEVELOPMENT_CONFIRMED';
    item.seedId=item.seedId||seed.seedId||null;
    item.gameName=item.gameName||seed.gameName||gameId;
    item.selectedPlatform=forceFreshBaseline?selectedPlatform:(item.selectedPlatform||selectedPlatform);
    item.targetPlatform=forceFreshBaseline?selectedPlatform:(item.targetPlatform||selectedPlatform);
    item.targetSourcePath=forceFreshBaseline?targetSourcePath:(item.targetSourcePath||targetSourcePath);
    item.webSourcePath=forceFreshBaseline?webSourcePath:(item.webSourcePath||webSourcePath);
    item.sourcePath=forceFreshBaseline?webSourcePath:(item.sourcePath||webSourcePath);
    item.designBaselineSource=forceFreshBaseline?(design?.designSource||null):(item.designBaselineSource||design?.designSource||seed?.promotion?.designBaselineSource||null);
    item.designDate=forceFreshBaseline?(design?.date||null):(item.designDate||design?.date||seed?.promotion?.designDate||null);
    item.artbookSource=item.artbookSource||artbookSource;
    item.artbookTiming=item.artbookTiming||'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER';
    if(item.postPromotionArtbookRequired===undefined)item.postPromotionArtbookRequired=false;
    if(item.postWebArtbookRequired===undefined)item.postWebArtbookRequired=true;
    if(item.webValidationRequired===undefined)item.webValidationRequired=true;
    if(item.musicValidationRequired===undefined)item.musicValidationRequired=true;
    item.ownerPreservationPresentationUpgrade=ownerPreservationPresentationUpgrade;
    item.presentationFirstPass=ownerPreservationPresentationUpgrade?'ASSET_ADAPTATION':(item.presentationFirstPass||null);
    if(forceFreshBaseline){
      item.strictDesignScore=Number(design?.review?.totalScore||seed?.strictDesignReview?.totalScore||0)||null;
      item.webValidationPassedAt=null;
      item.musicValidationPassed=false;
      item.webValidationEvidencePath=null;
      item.strictImplementationScore=null;
      item.webStrictScore=null;
      item.formalImplementationPassed=false;
      item.formalImplementationVerdict='REVISE';
      bindRequiredWebStage(item,{gameId,stamp});
    }
    return {item,created:false};
  }
  item={
    gameId,
    seedId:seed.seedId||null,
    gameName:seed.gameName||gameId,
    productionClass:'DEVELOPMENT_CONFIRMED',
    selectedPlatform,
    targetPlatform:selectedPlatform,
    targetSourcePath,
    webSourcePath,
    designBaselineSource:design?.designSource||seed?.promotion?.designBaselineSource||null,
    designDate:design?.date||seed?.promotion?.designDate||null,
    artbookSource,
    artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
    postPromotionArtbookRequired:false,
    postWebArtbookRequired:true,
    strictDesignScore:Number(seed?.strictDesignReview?.totalScore||seed?.promotion?.strictDesignScore||0)||null,
    enqueuedAt:stamp,
    queueSource:'ACTIVE_DEVELOPMENT_CONFIRMED_SEED',
    ownerPreservationPresentationUpgrade,
    presentationFirstPass:ownerPreservationPresentationUpgrade?'ASSET_ADAPTATION':null
  };
  bindRequiredWebStage(item,{gameId,stamp});
  queue.items.push(item);
  return {item,created:true};
}


function directNativePolicy(root='.'){
  const roadmap=readJson(path.join(root,'company-learning/platform-release-roadmap.json'),{});
  const contract=roadmap?.directNativeDualPlatformDevelopment||{};
  const webSurface=contract?.unityWebValidationSurface||{};
  return contract?.status==='OWNER_DIRECT_LOCKED'
    &&contract?.mode==='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'
    &&contract?.webDevelopmentStageRemoved===true
    &&contract?.strictDesignScoreRequiredForDevelopmentAdmission===false
    &&contract?.unityWebEnabled===true
    &&contract?.unityWebRequired===false
    &&contract?.unityWebGateRequired===false
    &&contract?.unityWebMode==='VALIDATION_SURFACE_ONLY'
    &&webSurface?.requiredForDevelopmentAdmission===false
    &&Array.isArray(contract?.supportedDevelopmentPlatforms)
    &&contract.supportedDevelopmentPlatforms.includes('ROBLOX')
    &&contract.supportedDevelopmentPlatforms.includes('UNITY');
}
function directNativeSourcePaths(gameId){
  return {ROBLOX:`roblox-games/${gameId}`,UNITY:`unity-games/${gameId}`};
}
function bindDirectNativeQueueItem(item,{seed,design,stamp}){
  const gameId=String(seed?.gameId||'').trim();
  const selectedPlatform=selectedPlatformOf(seed);
  const paths=directNativeSourcePaths(gameId);
  item.gameId=gameId;
  item.seedId=item.seedId||seed.seedId||null;
  item.gameName=item.gameName||seed.gameName||gameId;
  item.productionClass='DEVELOPMENT_CONFIRMED';
  item.productionClassSource='MINIMUM_DUAL_PLATFORM_DESIGN_READY';
  item.status='ACTIVE';
  item.selectedPlatform=selectedPlatform;
  item.targetPlatform=selectedPlatform;
  item.concurrentTargetPlatforms=['ROBLOX','UNITY'];
  item.platformExecutionMode='ROBLOX_UNITY_CONCURRENT_SAME_GAME';
  item.bidirectionalAutoPair=true;
  item.requestEitherStartsBoth=true;
  item.targetSourcePaths=paths;
  item.robloxProjectPath=paths.ROBLOX;
  item.unityProjectPath=paths.UNITY;
  item.targetSourcePath=paths[selectedPlatform]||paths.ROBLOX;
  item.sourcePath=item.targetSourcePath;
  item.webSourcePath=null;
  item.webValidationRequired=false;
  item.musicValidationRequired=false;
  item.webFirstGatePassed=false;
  item.webSecondGateRequired=false;
  item.webPlatformHandoff=null;
  item.unityWebFirstStagePassed=false;
  item.designBaselineSource=design.file;
  item.designDate=design.date;
  item.minimumDesignContract={
    version:1,pass:true,source:design.file,date:design.date,
    commonCoreReady:true,
    platformProfiles:{ROBLOX:true,UNITY:true,distinct:true}
  };
  item.platformDesignProfiles={
    ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
    UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
  };
  item.currentStep='TARGET_PLATFORM_SOURCE_BIND';
  item.canonicalState='PENDING_DUAL_NATIVE_SOURCE_BIND';
  item.vibeWebImplementationRequired=false;
  item.vibeWebRequestedStage=null;
  item.vibeWebImplementationReason=null;
  item.sourceRootBootstrapRequired=false;
  item.postPromotionArtbookRequired=false;
  item.postWebArtbookRequired=false;
  item.artbookTiming='PARALLEL_NATIVE_PRESENTATION_SUPPORT';
  item.internalReleaseTarget={ROBLOX:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE_OWNER_PLAYABLE',UNITY:'INTERNAL_OR_CLOSED_APP_TEST_BUILD'};
  item.externalReleasePolicy='PLATFORM_INDEPENDENT_AFTER_OWN_QA';
  item.homepageTestCandidate=false;
  item.homepageOfficialCard=false;
  item.enqueuedAt=item.enqueuedAt||stamp;
  item.updatedAt=stamp;
  return item;
}
function promoteDirectNativeDualDesignSeeds({root='.'}={}){
  const p=(...parts)=>path.join(root,...parts);
  const seedPath=p('game-seed-state.json');
  const portfolioPath=p('autonomous-portfolio.json');
  const catalogPath=p('game-catalog.json');
  const queuePath=p('development-queue.json');
  const state=readJson(seedPath,{version:1,seeds:[]});
  materializeOwnerDesignResetSeeds(state,{file:p('owner-design-reset-queue.json')});
  const portfolio=readJson(portfolioPath,{version:1,projects:[]});
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  portfolio.projects ||= [];catalog.games ||= [];queue.items ||= [];
  const stamp=nowIso(),promoted=[],reconciled=[],skipped=[];
  const resetAt=Date.parse(state?.ownerAllGamesDesignReset?.updatedAt||'')||0;
  const resetDate=resetAt?new Date(resetAt).toISOString().slice(0,10):'';

  for(const seed of state.seeds||[]){
    if(String(seed?.status||'').toUpperCase()!=='ACTIVE')continue;
    const gameId=String(seed?.gameId||'').trim();if(!gameId)continue;
    if(String(seed?.productionClass||'').toUpperCase()==='RELEASE_CONFIRMED'){skipped.push({gameId,reason:'ALREADY_RELEASED'});continue;}
    const design=latestMinimumDesign(root,gameId);
    if(!design){skipped.push({gameId,reason:'MINIMUM_DUAL_PLATFORM_DESIGN_NOT_READY'});continue;}
    if(resetAt&&String(design.date)<=resetDate){skipped.push({gameId,reason:'OWNER_RESET_FRESH_MINIMUM_DESIGN_REQUIRED'});continue;}
    const selectedPlatform=selectedPlatformOf(seed);
    const paths=directNativeSourcePaths(gameId);
    const wasConfirmed=String(seed.productionClass||'').toUpperCase()==='DEVELOPMENT_CONFIRMED';
    seed.productionClass='DEVELOPMENT_CONFIRMED';
    seed.productionTier=2;
    seed.productionClassSource='MINIMUM_DUAL_PLATFORM_DESIGN_READY';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    seed.selectedPlatform=selectedPlatform;
    seed.concurrentTargetPlatforms=['ROBLOX','UNITY'];
    seed.platformExecutionMode='ROBLOX_UNITY_CONCURRENT_SAME_GAME';
    seed.minimumDesignContract={version:1,pass:true,source:design.file,date:design.date};
    seed.platformDesignProfiles={
      ROBLOX:{source:design.file,jsonPointer:'/content/platformProfiles/ROBLOX'},
      UNITY:{source:design.file,jsonPointer:'/content/platformProfiles/UNITY'}
    };
    seed.promotion={
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
    };

    let project=portfolio.projects.find(row=>row?.slug===gameId);
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
      webValidationRequired:false,
      designBaselineSource:design.file,
      platformDesignProfiles:seed.platformDesignProfiles
    });

    let game=catalog.games.find(row=>row?.id===gameId);
    if(!game){
      game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Roblox + Unity 앱 동시개발',genre:[String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'',featured:false};
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
      homepageRecentWork:'최소 설계 계약 완료 · Roblox/Unity 앱 네이티브 개발 동시 착수',
      homepageWebPlayable:false,
      webPath:null,
      hasWebArchive:Boolean(game.hasWebArchive)
    });

    let item=queue.items.find(row=>row?.gameId===gameId);
    if(!item){item={};queue.items.push(item);}
    bindDirectNativeQueueItem(item,{seed,design,stamp});
    if(wasConfirmed)reconciled.push(gameId);else promoted.push(gameId);
  }

  state.updatedAt=stamp;queue.updatedAt=stamp;
  queue.webValidationPolicy='DISABLED_DIRECT_NATIVE_DUAL_PLATFORM';
  queue.nativeDevelopmentPolicy='MINIMUM_DESIGN_READY_THEN_ROBLOX_UNITY_CONCURRENT';
  writeJson(seedPath,state);writeJson(portfolioPath,portfolio);writeJson(catalogPath,catalog);writeJson(queuePath,queue);
  return {promoted,skipped,reconciledExisting:[],reconciledPromotedSeeds:reconciled,queueCount:queue.items.length,ownerResetSeedsMaterialized:[],baselineGatesRefreshed:[],directNativeDual:true};
}

export function promoteReadyDesignSeeds({root='.'}={}){
  if(directNativePolicy(root))return promoteDirectNativeDualDesignSeeds({root});
  const p=(...parts)=>path.join(root,...parts);
  const seedPath=p('game-seed-state.json');
  const portfolioPath=p('autonomous-portfolio.json');
  const catalogPath=p('game-catalog.json');
  const queuePath=p('development-queue.json');
  const state=readJson(seedPath,{version:1,seeds:[]});
  const resetResult=materializeOwnerDesignResetSeeds(state,{file:p('owner-design-reset-queue.json')});
  const baselineGatesRefreshed=refreshCompletedDesignBaselineGates({root,state});
  const portfolio=readJson(portfolioPath,{version:1,projects:[]});
  const catalog=readJson(catalogPath,{version:1,games:[]});
  const queue=readJson(queuePath,{version:1,items:[]});
  portfolio.projects ||= [];
  catalog.games ||= [];
  queue.items ||= [];
  const promoted=[];
  const skipped=[];
  const reconciledExisting=[];
  const reconciledPromotedSeeds=[];
  const stamp=nowIso();
  const ownerResetIds=new Set(Array.isArray(state?.ownerAllGamesDesignReset?.gameIds)?state.ownerAllGamesDesignReset.gameIds.map(String):[]);
  const ownerResetAt=Date.parse(state?.ownerAllGamesDesignReset?.updatedAt||'')||0;
  const ownerResetDate=ownerResetAt?new Date(ownerResetAt).toISOString().slice(0,10):'';

  for(const seed of state.seeds||[]){
    if(String(seed?.status||'').toUpperCase()!=='ACTIVE')continue;
    const gameId=String(seed?.gameId||'').trim();
    if(!gameId)continue;
    const currentClass=String(seed?.productionClass||'').toUpperCase();
    if(currentClass==='RELEASE_CONFIRMED'){
      skipped.push({gameId,reason:'ALREADY_RELEASED',productionClass:currentClass});
      continue;
    }
    if(currentClass==='DEVELOPMENT_CONFIRMED'){
      const design=latestReadyDesign(root,gameId);
      if(seed.productionClassSource==='DESIGN_BASELINE_READY_STRICT_PASS'&&design)reconcileConfirmedMirrors({portfolio,catalog,seed,design});
      if(ownerResetIds.has(gameId)){
        const strict=strictDesignPass(design);
        const fresh=designEvidenceAfterReset(design,{resetAt:ownerResetAt,resetDate:ownerResetDate});
        if(!fresh||!strict.pass){
          queue.items=queue.items.filter(row=>String(row?.gameId||'')!==gameId);
          if(fresh&&strict.review){
            seed.strictDesignReview={verdict:strict.review?.verdict||'MISSING',totalScore:Number(strict.review?.totalScore||0),hardFailures:Array.isArray(strict.review?.hardFailures)?strict.review.hardFailures:[],evidencePath:strict.file,passThreshold:DESIGN_PASS_THRESHOLD};
            seed.lifecycleState=String(strict.review?.verdict||'REVISE').toUpperCase()==='REBUILD'?'DESIGN_REBUILD_REQUIRED':'DESIGN_REVISION_REQUIRED';
          }
          skipped.push({gameId,reason:fresh?'OWNER_RESET_STRICT_DESIGN_REVIEW_NOT_PASS':'OWNER_RESET_FRESH_DESIGN_REQUIRED',productionClass:currentClass,queueReconciled:false});
          continue;
        }
        seed.strictDesignReview={verdict:'PASS',totalScore:Number(strict.review.totalScore),hardFailures:[],evidencePath:strict.file,passThreshold:DESIGN_PASS_THRESHOLD,excellent:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD};
        const reconciled=reconcileConfirmedSeedQueue({queue,seed,design,stamp,forceFreshBaseline:true});
        if(reconciled.created)reconciledPromotedSeeds.push(gameId);
        skipped.push({gameId,reason:'OWNER_RESET_ALREADY_PROMOTED_FRESH_PASS',productionClass:currentClass,queueReconciled:reconciled.created});
        continue;
      }
      const reconciled=reconcileConfirmedSeedQueue({queue,seed,design,stamp});
      if(reconciled.created)reconciledPromotedSeeds.push(gameId);
      skipped.push({gameId,reason:'ALREADY_PROMOTED',productionClass:currentClass,queueReconciled:reconciled.created});
      continue;
    }
    const design=latestReadyDesign(root,gameId);
    if(!design){skipped.push({gameId,reason:'DESIGN_BASELINE_NOT_READY'});continue;}
    if(ownerResetIds.has(gameId)&&!designEvidenceAfterReset(design,{resetAt:ownerResetAt,resetDate:ownerResetDate})){
      queue.items=queue.items.filter(row=>String(row?.gameId||'')!==gameId);
      skipped.push({gameId,reason:'OWNER_RESET_FRESH_DESIGN_REQUIRED'});
      continue;
    }
    const strict=strictDesignPass(design);
    if(!strict.pass){
      seed.strictDesignReview={verdict:strict.review?.verdict||'MISSING',totalScore:Number(strict.review?.totalScore||0),hardFailures:Array.isArray(strict.review?.hardFailures)?strict.review.hardFailures:[],evidencePath:strict.file,passThreshold:DESIGN_PASS_THRESHOLD};
      seed.lifecycleState=String(strict.review?.verdict||'REVISE').toUpperCase()==='REBUILD'?'DESIGN_REBUILD_REQUIRED':'DESIGN_REVISION_REQUIRED';
      skipped.push({gameId,reason:'STRICT_DESIGN_REVIEW_NOT_PASS',verdict:seed.strictDesignReview.verdict,totalScore:seed.strictDesignReview.totalScore});
      continue;
    }
    const selectedPlatform=selectedPlatformOf(seed);
    const targetSourcePath=targetSourcePathOf(gameId,selectedPlatform);
    const webSourcePath=webSourcePathOf(gameId);
    const artbookSource=`artbook-submissions/${gameId}/current.json`;

    seed.productionClass='DEVELOPMENT_CONFIRMED';
    seed.productionTier=2;
    seed.productionClassSource='DESIGN_BASELINE_READY_STRICT_PASS';
    seed.lifecycleState='DEVELOPMENT_CONFIRMED';
    seed.selectedPlatform=selectedPlatform;
    seed.strictDesignReview={verdict:'PASS',totalScore:Number(strict.review.totalScore),hardFailures:[],evidencePath:strict.file,passThreshold:DESIGN_PASS_THRESHOLD,excellent:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD};
    seed.promotion={from:'DESIGN_ONLY',to:'DEVELOPMENT_CONFIRMED',reason:'DESIGN_BASELINE_READY_STRICT_PASS',selectedPlatform,targetSourcePath,webSourcePath,requiredFirstValidation:'WEB_GAMEPLAY_MUSIC_AND_STRICT_REVIEW',designBaselineSource:design.designSource,designDate:design.date,artbookSource,artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',postPromotionArtbookRequired:false,postWebArtbookRequired:true,strictDesignReviewSource:strict.file,strictDesignScore:Number(strict.review.totalScore),excellentDesign:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD,promotedAt:seed?.promotion?.promotedAt||stamp};

    let project=portfolio.projects.find(row=>row?.slug===gameId);
    if(!project){
      project={id:`SEED-${seed.seedId||gameId}`,slug:gameId,name:seed.gameName||gameId,sourcePath:webSourcePath,webArchivePath:webSourcePath,protectedValues:['core-loop','design-baseline','save-meaning'],developmentFocus:{scores:{playability:0,distinctiveness:0,developmentEfficiency:0,scalability:0,lowBlockage:0},total:0,evidenceNote:'승격 직후. Web 실검증과 80점 이상 강심사 후 아트북/홈페이지 테스트 등록, 90점 이상에서 선택 플랫폼 진행.'}};
      portfolio.projects.push(project);
    }
    Object.assign(project,{productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',profileStatus:'DEVELOPMENT_CONFIRMED',mode:'WEB_VALIDATION_THEN_POST_WEB_ARTBOOK_THEN_SELECTED_PLATFORM_IMPLEMENTATION',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',targetEngine:selectedPlatform,selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,sourcePath:webSourcePath,webArchivePath:project.webArchivePath||webSourcePath,webValidationRequired:true,musicValidationRequired:true,strictDesignScore:Number(strict.review.totalScore),designBaselineSource:design.designSource,designArtbookSource:artbookSource,artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER'});

    let game=catalog.games.find(row=>row?.id===gameId);
    if(!game){game={id:gameId,name:seed.gameName||gameId,description:'개발확정 · Strict Design PASS',genre:[String(seed.GAME_CATEGORY||'').replaceAll('_',' ')],image:'',webPath:`/${webSourcePath}/`,hasWebArchive:false,featured:false};catalog.games.push(game);}
    Object.assign(game,{homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',productionClassSource:'DESIGN_BASELINE_READY_STRICT_PASS',productionTier:2,productionTierSource:'DISPLAY_ALIAS_FROM_PRODUCTION_CLASS',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,productionTarget:selectedPlatform,strictDesignScore:Number(strict.review.totalScore),excellentDesign:Number(strict.review.totalScore)>=EXCELLENT_THRESHOLD,homepageOfficialCard:false,homepageTestCandidate:false,homepageTestScore:null,homepageReviewState:'WAITING_WEB_STRICT_REVIEW',homepageStage:'개발확정 · Web 제작/강심사 준비',homepageRecentWork:`Strict Design ${Number(strict.review.totalScore)}점 PASS · Web 제작/실플레이 강심사 대기 · 80점부터 홈피 테스트 후보`,homepageWebPlayable:false});
    delete game.homepageArtbookPath;

    let item=queue.items.find(row=>row?.gameId===gameId);
    const ownerPreservationPresentationUpgrade=seed?.REUSE_EXISTING_GAMEPLAY_IMPLEMENTATION===true&&String(seed?.OWNER_REBUILD_MODE||'').toUpperCase()==='PRESERVATION_PRESENTATION_UPGRADE';
    if(!item){item={gameId,seedId:seed.seedId||null,gameName:seed.gameName||gameId,productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform,targetPlatform:selectedPlatform,targetSourcePath,webSourcePath,designBaselineSource:design.designSource,designDate:design.date,artbookSource,artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',postPromotionArtbookRequired:false,postWebArtbookRequired:true,strictDesignScore:Number(strict.review.totalScore),enqueuedAt:stamp,ownerPreservationPresentationUpgrade,presentationFirstPass:ownerPreservationPresentationUpgrade?'ASSET_ADAPTATION':null};queue.items.push(item);}else{item.productionClass='DEVELOPMENT_CONFIRMED';item.selectedPlatform=selectedPlatform;item.targetPlatform=selectedPlatform;item.targetSourcePath=targetSourcePath;item.webSourcePath=item.webSourcePath||webSourcePath;item.designBaselineSource=design.designSource;item.designDate=design.date;item.artbookSource=artbookSource;item.artbookTiming='AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER';item.postPromotionArtbookRequired=false;item.postWebArtbookRequired=true;item.strictDesignScore=Number(strict.review.totalScore);item.ownerPreservationPresentationUpgrade=ownerPreservationPresentationUpgrade;item.presentationFirstPass=ownerPreservationPresentationUpgrade?'ASSET_ADAPTATION':(item.presentationFirstPass||null);}
    bindRequiredWebStage(item,{gameId,stamp});
    promoted.push(gameId);
  }

  // Seed 이력이 없는 기존 실제 Web 게임도 보정한다. Seed 기반 DEVELOPMENT_CONFIRMED는 위 루프에서 Web 파일 존재 여부와 무관하게 먼저 보장된다.
  for(const game of catalog.games||[]){
    const gameId=String(game?.id||'').trim();
    const productionClass=String(game?.productionClass||'').toUpperCase();
    const lifecycleState=String(game?.lifecycleState||'ACTIVE').toUpperCase();
    if(!gameId||productionClass!=='DEVELOPMENT_CONFIRMED'||!['ACTIVE','REBUILD'].includes(lifecycleState))continue;
    if(ownerResetIds.has(gameId))continue;
    const webSourcePath=webSourcePathOf(gameId);
    if(!fs.existsSync(p(webSourcePath))||!fs.existsSync(p(webSourcePath,'index.html')))continue;
    if(queue.items.some(row=>row?.gameId===gameId))continue;
    const design=latestReadyDesign(root,gameId);
    const selectedPlatform=resolveSelectedPlatform('',game)||'';
    const targetSourcePath=selectedPlatform?targetSourcePathOf(gameId,selectedPlatform):'';
    const item={
      gameId,
      seedId:null,
      gameName:game.name||gameId,
      productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState,
      status:'ACTIVE',
      sourcePath:webSourcePath,
      webSourcePath,
      selectedPlatform:selectedPlatform||null,
      targetPlatform:selectedPlatform||null,
      targetSourcePath:targetSourcePath||null,
      designBaselineSource:design?.designSource||null,
      designDate:design?.date||null,
      existingGameContinuation:true,
      preservationPolicy:'PRESERVE_EXISTING_REAL_GAME_BEFORE_REGENERATION',
      currentStep:design?'WEB_PLAYABLE_BOOTSTRAP':'EXISTING_WEB_GAME_CONTINUATION',
      canonicalState:'WAITING_WEB_GAMEPLAY_VALIDATION',
      webValidationRequired:true,
      musicValidationRequired:true,
      homepageTestCandidate:false,
      homepageTestScore:null,
      homepageTestVerdict:'WAITING_WEB_STRICT_REVIEW',
      webValidationQueuedAt:stamp,
      artbookTiming:'AFTER_WEB_STRICT_REVIEW_AT_80_OR_HIGHER',
      postPromotionArtbookRequired:false,
      postWebArtbookRequired:true,
      enqueuedAt:stamp
    };
    queue.items.push(item);
    reconciledExisting.push(gameId);
  }

  state.updatedAt=stamp;queue.updatedAt=stamp;queue.webValidationPolicy='REQUIRED_WEB_STRICT_REVIEW_BEFORE_POST_WEB_ARTBOOK_AND_TARGET_PLATFORM';
  writeJson(seedPath,state);writeJson(portfolioPath,portfolio);writeJson(catalogPath,catalog);writeJson(queuePath,queue);
  return {promoted,skipped,reconciledExisting,reconciledPromotedSeeds,queueCount:queue.items.length,ownerResetSeedsMaterialized:resetResult.changed,baselineGatesRefreshed};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const result=promoteReadyDesignSeeds();
  console.log(`DESIGN_PROMOTION_COUNT=${result.promoted.length}`);
  console.log(`DESIGN_PROMOTED_GAME_IDS=${result.promoted.join(',')}`);
  console.log(`DEVELOPMENT_QUEUE_COUNT=${result.queueCount}`);
  console.log(`DEVELOPMENT_CONFIRMED_SEED_RECONCILED=${result.reconciledPromotedSeeds.join(',')||'NONE'}`);
  console.log(`DEVELOPMENT_EXISTING_RECONCILED=${result.reconciledExisting.join(',')||'NONE'}`);
  console.log(`OWNER_RESET_SEEDS_MATERIALIZED=${result.ownerResetSeedsMaterialized.join(',')||'NONE'}`);
  console.log(`DESIGN_BASELINE_GATES_REFRESHED=${result.baselineGatesRefreshed.map(row=>`${row.gameId}:${row.date}`).join(',')||'NONE'}`);
  console.log('LEGACY_DIRECT_LEAD_STALE_GATE_RECONCILE=SUPPORTED');
  if(result.skipped.length)console.log(`DESIGN_PROMOTION_SKIPPED=${JSON.stringify(result.skipped)}`);
}
