// 파일명: tools/company-status-sync.mjs
// 역할: 총괄 감독 상태와 의미 기반 제작 분류/선택 플랫폼 상태를 최신 상태로 동기화한다.
// 원칙: productionClass가 유일한 정식 제작 분류이며 DEVELOPMENT_CONFIRMED는 최소 공통 설계 후 Roblox+Unity 네이티브를 동시 진행한다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { selectContinuousTarget } from './autonomous-24h-work-planner.mjs';
import {
  PRODUCTION_CLASSES,
  homepageCategoryForProductionClass,
  productionClassCounts,
  productionClassOf,
} from './production-classification.mjs';
import { ingestOwnerWebGameIds, normalizeCatalog, validateNormalizedCatalog } from './game-catalog-normalization.mjs';

const companyPath='company-status.json';
const supervisionPath='director-supervision-status.json';
const portfolioPath='autonomous-portfolio.json';
const catalogPath='game-catalog.json';
const artbooksPath='game-artbooks.json';
const developmentQueuePath=process.env.COMPANY_DEVELOPMENT_QUEUE_PATH||'development-queue.json';
const runtimeCatalogPath=process.env.COMPANY_RUNTIME_GAME_CATALOG_PATH||'';
const seedStatePath=process.env.COMPANY_SEED_STATE_PATH||'game-seed-state.json';
const centralPolicyPath='company-learning/platform-release-roadmap.json';
const ownerWebGameIdsPath=process.env.COMPANY_OWNER_WEB_GAME_IDS_PATH||'';
const PLATFORM_PRIORITY=['ROBLOX','UNITY'];
const CENTRAL_POLICY_REQUIRED_STAGES=[
  'MINIMUM_DESIGN_CONTRACT_READY',
  'ROBLOX_UNITY_NATIVE_SOURCE_BIND',
  'TARGET_PLATFORM_RUNTIME',
  'TARGET_PLATFORM_INDEPENDENT_QA',
  'TARGET_PLATFORM_REGRESSION',
  'INTERNAL_PLATFORM_RELEASE',
  'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
  'PUBLIC_RELEASE_READY',
];

const statusMap={WORKING:'working',DONE:'done',IDLE_NO_TASK:'idle',BLOCKED:'blocked',FAILED:'failed',STALE:'stale'};
const roles=['planning','development','qa','graphics','audio','director'];
const clean=value=>String(value??'').trim();
const focusScore=project=>{
  const explicit=Number(project?.developmentFocus?.total);
  if(Number.isFinite(explicit))return explicit;
  const scores=project?.developmentFocus?.scores||{};
  return ['playability','distinctiveness','developmentEfficiency','scalability','lowBlockage'].reduce((sum,key)=>sum+(Number(scores[key])||0),0);
};
const isHold=project=>project?.mode==='HOLD'||/^HOLD/.test(clean(project?.profileStatus));
const latestBook=(artbooks,slug)=>{
  const rows=[...(artbooks?.artbooks||[]),...(artbooks?.dailySubmissions||[])]
    .filter(row=>row?.gameId===slug&&clean(row?.status).toLowerCase()==='completed-artbook');
  rows.sort((a,b)=>String(b.updatedAt||b.createdAt||b.date||'').localeCompare(String(a.updatedAt||a.createdAt||a.date||''))||Number(b.edition||0)-Number(a.edition||0));
  return rows[0]||null;
};
const baselineRank=book=>{
  const state=clean(book?.lifecycle?.state||book?.lifecycleState).toUpperCase();
  if(state==='RELEASE_BASELINE')return 3;
  if(state==='DEVELOPMENT_BASELINE')return 2;
  if(state==='DESIGN_BASELINE')return 1;
  return book?0.5:0;
};
const normalizeGenre=value=>clean(value).toLowerCase().replace(/\s+/g,' ');
const GAME_LIFECYCLE_STATES=new Set(['ACTIVE','PAUSED','REBUILD','RETIRED','REMOVED']);
export function gameLifecycleState(game={}){const raw=clean(game.lifecycleState||game.lifecycle?.state||'ACTIVE').toUpperCase();return GAME_LIFECYCLE_STATES.has(raw)?raw:'ACTIVE';}
export function lifecycleAllowsDevelopment(game={}){return ['ACTIVE','REBUILD'].includes(gameLifecycleState(game));}

export function normalizeSelectedPlatform(value){
  const raw=clean(value).toUpperCase().replaceAll('-','_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE_UEFN','UEFN','FORTNITE'].includes(raw))return 'FORTNITE_UEFN';
  return '';
}
const optionalJson=(filesystem,file,fallback)=>{try{return JSON.parse(filesystem.readFileSync(file,'utf8'));}catch{return fallback;}};
const playModeLabel=value=>{const v=clean(value).toUpperCase();if(v==='SINGLE')return'싱글';if(v==='COOP')return'협동';if(v==='COMPETITIVE')return'경쟁';if(v==='HYBRID')return'혼합';return'플레이 방식 미평가';};
const latestById=(rows,idField)=>{const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const id=clean(row?.[idField]);if(!id)continue;const old=map.get(id);const t=Date.parse(row?.ROBLOX_GENRE_REVIEWED_AT||row?.updatedAt||row?.webValidationLastAttemptAt||row?.createdAt||row?.enqueuedAt||'')||0;const oldT=Date.parse(old?.ROBLOX_GENRE_REVIEWED_AT||old?.updatedAt||old?.webValidationLastAttemptAt||old?.createdAt||old?.enqueuedAt||'')||0;if(!old||t>=oldT)map.set(id,row);}return map;};
const developmentHomepageScore=()=>({score:null,label:'점수 미평가',current:false,source:'DISABLED_FOR_DIRECT_NATIVE_DEVELOPMENT'});
const homepageLatestWork=(game,queue)=>clean(queue?.homepageRecentWork||game?.homepageRecentWork||queue?.currentStep||queue?.resumeStage||queue?.canonicalState)||'개발 작업 정보 없음';

export function applyHomepageRuntimeInfo({catalog,developmentQueue={},seedState={}}={}){
  if(!catalog||!Array.isArray(catalog.games))return catalog;
  const queueById=latestById(developmentQueue?.items,'gameId');
  const seedById=latestById((seedState?.seeds||[]).filter(seed=>clean(seed?.status).toUpperCase()==='ACTIVE'),'gameId');
  catalog.runtimeAuthority='company-runtime';
  catalog.runtimeInfoAuthority='company-runtime';
  catalog.runtimeSupportedPlatforms=[...PLATFORM_PRIORITY];
  for(const game of catalog.games){
    const id=clean(game?.id);if(!id)continue;
    const queue=queueById.get(id)||null,seed=seedById.get(id)||null;
    const platform=normalizeSelectedPlatform(queue?.selectedPlatform||queue?.targetPlatform||seed?.selectedPlatform||seed?.INITIAL_TARGET_PLATFORM||game?.selectedPlatform||game?.targetPlatform||game?.productionTarget);
    const score=developmentHomepageScore(queue);
    const baseGenres=Array.isArray(game?.genre)?game.genre:[];
    const robloxGenre=clean(seed?.ROBLOX_GENRE_LABEL_KO||seed?.ROBLOX_GENRE||queue?.ROBLOX_GENRE_LABEL_KO||queue?.ROBLOX_GENRE);
    const robloxSubgenre=clean(seed?.ROBLOX_SUBGENRE_LABEL_KO||seed?.ROBLOX_SUBGENRE||queue?.ROBLOX_SUBGENRE_LABEL_KO||queue?.ROBLOX_SUBGENRE);
    const genreLabel=platform==='ROBLOX'&&robloxGenre?[robloxGenre,robloxSubgenre].filter(Boolean).join(' · '):(baseGenres.join(' · ')||'장르 미평가');
    const playMode=clean(seed?.MULTIPLAYER_DESIGN_MODE||seed?.INITIAL_PLAY_MODE||queue?.ROBLOX_PLAY_MODE||queue?.playMode).toUpperCase();
    game.homepageInfo={
      authority:'company-runtime',
      platform,
      platformLabel:platformLabel(platform),
      score:score.score,
      scoreLabel:score.label,
      scoreCurrent:score.current,
      scoreSource:score.source,
      validationSchemaVersion:null,
      genre:baseGenres,
      genreLabel,
      subgenre:platform==='ROBLOX'?robloxSubgenre:'',
      playMode,
      playModeLabel:playModeLabel(playMode),
      latestWork:homepageLatestWork(game,queue),
      updatedAt:queue?.updatedAt||queue?.webValidationLastAttemptAt||seed?.ROBLOX_GENRE_REVIEWED_AT||seed?.updatedAt||catalog.updatedAt||null,
      status:clean(queue?.canonicalState||queue?.status||seed?.status||game?.lifecycleState)||'ACTIVE',
      productionClass:clean(game?.productionClass||'DESIGN_ONLY').toUpperCase()
    };
  }
  catalog.runtimeCounts={...(catalog.runtimeCounts||{}),canonicalGames:catalog.games.length,homepageInfo:catalog.games.filter(game=>game.homepageInfo?.authority==='company-runtime').length};
  normalizeCatalog(catalog);
  const normalized=validateNormalizedCatalog(catalog);
  if(!normalized.pass)throw new Error('GAME_CATALOG_NORMALIZATION_FAILED:'+normalized.errors.join(','));
  return catalog;
}


export function selectedPlatformOf(project={},game={}){
  for(const candidate of [project.selectedPlatform,project.targetPlatform,game.selectedPlatform,game.targetPlatform,project.targetEngine,game.preferredPlatform,game.productionTarget]){
    const platform=normalizeSelectedPlatform(candidate);
    if(platform)return platform;
  }
  return '';
}

export function platformTargetEngine(platform){
  if(platform==='ROBLOX')return 'roblox';
  if(platform==='UNITY')return 'unity-android';
  if(platform==='FORTNITE_UEFN')return 'fortnite-uefn';
  return 'platform-selection-required';
}

export function synchronizeCompanyStatusPolicy(company,{filesystem=fs}={}){
  let machine=null;
  if(filesystem?.existsSync?.(centralPolicyPath)){
    machine=JSON.parse(filesystem.readFileSync(centralPolicyPath,'utf8'));
    if(machine.authority!=='MACHINE_EXECUTION_CONTRACT'||machine.machineSourceOfTruth!==centralPolicyPath||machine.humanDocumentRequired!==false)throw new Error('canonical machine production policy invalid');
    const stages=machine?.developmentLifecycleMachine?.stages||[];
    for(const stage of CENTRAL_POLICY_REQUIRED_STAGES)if(!stages.includes(stage))throw new Error(`canonical machine lifecycle stage missing: ${stage}`);
    const direct=machine?.directNativeDualPlatformDevelopment||{};
    if(direct.status!=='OWNER_DIRECT_LOCKED'||direct.mode!=='ROBLOX_UNITY_APP_BIDIRECTIONAL_AUTO_PAIR'||direct.canonicalDevelopmentAdmissionAuthority!==true||direct.strictDesignScoreRequiredForDevelopmentAdmission!==false||direct.legacyWebFirstFallbackForbidden!==true)throw new Error('canonical direct-native development policy invalid');
  }
  const direct=machine?.directNativeDualPlatformDevelopment||{};
  const supported=Array.isArray(direct.supportedDevelopmentPlatforms)&&direct.supportedDevelopmentPlatforms.length
    ?direct.supportedDevelopmentPlatforms.filter(platform=>PLATFORM_PRIORITY.includes(platform))
    :[...PLATFORM_PRIORITY];
  company.policy ||= {};
  const policy=company.policy;
  policy.sourceOfTruth=centralPolicyPath;
  policy.policyAuthority='MACHINE_EXECUTION_CONTRACT';
  policy.primaryPlatform='ROBLOX';
  policy.allowedTargetPlatforms=[...supported];
  policy.platformPriority=[...supported];
  policy.priorityMeaning='DEFAULT_FOCUS_AND_EXPERIENCE_ACCUMULATION_ORDER_ONLY';
  policy.primaryPlatformIsDefaultNotLock=true;
  policy.concurrentTargetPlatforms=['ROBLOX','UNITY'];
  policy.requestEitherStartsBoth=true;
  policy.onePlatformFailureDoesNotCancelOther=true;
  policy.platformRoadmapPhaseEntryGatesForbidden=true;
  policy.developmentAdmission='MINIMUM_DUAL_PLATFORM_DESIGN_READY';
  policy.strictDesignScoreRequiredForAdmission=false;
  policy.strictDesignReviewRunsInParallel=true;
  policy.webGames='optional-unity-web-validation-surface';
  policy.existingWebMaintenance=true;
  policy.webGamesRemainPlayable=true;
  policy.newWebGameProduction=false;
  policy.webPurpose='UNITY_WEB_VALIDATION_SURFACE_ONLY';
  policy.webCompanionRequiredForEveryGame=false;
  policy.approvedDesignScopeMustBeFullyImplemented=true;
  policy.silentScopeReductionForbidden=true;
  policy.webEvidenceMayReplaceNativePlatformEvidence=false;
  policy.webGameplayValidationTestbedAllowed=true;
  policy.webGameplayValidationRequired=false;
  policy.musicValidationRequired=false;
  policy.webBeforeTargetPlatformByDefault=false;
  policy.targetPlatformMayRunImmediately=true;
  policy.unityWebValidationRequired=false;
  policy.unityWebValidationGateAuthority=false;
  policy.fortniteUefnAutomaticDevelopment=false;
  policy.fortniteUefnState='OWNER_HOLD';
  delete policy.allThreePlatformsMayBeDevelopedConcurrently;
  delete policy.futurePrimaryTarget;
  delete policy.webGameDevelopment;
  return policy;
}

const platformLabel=platform=>platform==='ROBLOX'?'Roblox':platform==='UNITY'?'Unity Android':platform==='FORTNITE_UEFN'?'Fortnite UEFN':'플랫폼 선택 필요';
const targetSourcePath=(project,game,platform,filesystem=fs)=>{
  const explicit=[project?.productionSourcePath,game?.targetPlatformProjectPath].map(clean).filter(Boolean);
  if(platform==='UNITY')explicit.push(clean(game?.unityProjectPath),`unity-games/${project?.slug||''}`);
  if(platform==='ROBLOX')explicit.push(clean(game?.robloxProjectPath),`roblox-games/${project?.slug||''}`);
  if(platform==='FORTNITE_UEFN')explicit.push(clean(game?.uefnProjectPath),clean(game?.fortniteProjectPath));
  const candidates=[...new Set(explicit.filter(Boolean))];
  return candidates.find(candidate=>filesystem?.existsSync?.(candidate)===true)||'';
};
const targetPlatformReady=(project,game,platform,filesystem=fs)=>{
  if(!platform)return false;
  if(platform==='UNITY'&&project?.unityProjectReady===true)return true;
  return Boolean(targetSourcePath(project,game,platform,filesystem));
};
const platformPriorityRank=platform=>{
  const index=PLATFORM_PRIORITY.indexOf(platform);
  return index<0?PLATFORM_PRIORITY.length:index;
};

export function gameplayFamily(game){
  const genres=Array.isArray(game?.genre)?game.genre:[];
  for(const raw of genres){
    const tag=normalizeGenre(raw);
    if(['생존','survival'].includes(tag))return 'SURVIVAL';
    if(['디펜스','웨이브','defense','wave','tower defense','tower-defense'].includes(tag))return 'DEFENSE';
    if(['rpg','롤플레잉','role playing','role-playing'].includes(tag))return 'RPG';
    if(['수집','collection','collecting'].includes(tag))return 'COLLECTION';
    if(['턴제','turn based','turn-based'].includes(tag))return 'TURN_BASED';
    if(['전략','보드','영토','strategy','board','territory'].includes(tag))return 'STRATEGY';
    if(['모험','탐험','adventure','exploration'].includes(tag))return 'ADVENTURE';
  }
  return 'UNCLASSIFIED';
}

export function selectDiverseTopRows(rawRanked,capacity,{enabled=true,maxFocusScoreGap=1}={}){
  if(!enabled||capacity<=0)return rawRanked.slice(0,Math.max(0,capacity));
  const gap=Number(maxFocusScoreGap);
  const allowedGap=Number.isFinite(gap)&&gap>=0?gap:1;
  const remaining=[...rawRanked];
  const picked=[];
  const familyCounts=new Map();
  const represented=family=>family==='UNCLASSIFIED'||(familyCounts.get(family)||0)>0;
  while(picked.length<capacity&&remaining.length){
    const head=remaining[0];
    let pickIndex=0;
    if(represented(head.gameplayFamily)){
      const novelIndex=remaining.findIndex((row,index)=>index>0&&!represented(row.gameplayFamily)&&(head.score-row.score)<=allowedGap);
      if(novelIndex>0)pickIndex=novelIndex;
    }
    const [chosen]=remaining.splice(pickIndex,1);
    picked.push(chosen);
    familyCounts.set(chosen.gameplayFamily,(familyCounts.get(chosen.gameplayFamily)||0)+1);
  }
  return picked;
}

function synchronizePlatformPolicy(portfolio){
  portfolio.productionClassPolicy ||= {};
  portfolio.productionClassPolicy.classes ||= {};
  const release=portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED ||= {};
  const development=portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED ||= {};
  release.engine='PROJECT_SELECTED_PLATFORM';
  release.featureDevelopmentOnWeb=false;
  release.webArchiveMaintenance='FAST_RUNTIME_INCIDENT_ONLY';
  development.engine='ROBLOX_UNITY_DIRECT_NATIVE';
  development.scope='MINIMUM_DESIGN_THEN_ROBLOX_UNITY_CONCURRENT';
  development.admissionAuthority='MINIMUM_DUAL_PLATFORM_DESIGN_READY';
  development.concurrentTargetPlatforms=['ROBLOX','UNITY'];
  development.strictDesignScoreRequiredForAdmission=false;
  development.strictDesignReviewRunsInParallel=true;
  development.webPurpose='UNITY_WEB_VALIDATION_SURFACE_ONLY';
  development.webCompanionRequired=false;
  development.approvedDesignScopeMustBeFullyImplemented=true;
  development.webEvidenceMayReplaceNativePlatformEvidence=false;
  development.webGameplayValidationRequired=false;
  development.musicValidationRequired=false;
  development.webBeforeTargetPlatformByDefault=false;
  development.targetPlatformMayRunImmediately=true;
  development.onePlatformFailureDoesNotCancelOther=true;
  portfolio.developmentFocusPolicy ||= {};
  portfolio.developmentFocusPolicy.selection='AUTO_NATIVE_READINESS_THEN_SCORE_WITH_IMPACT_AWARE_DEVELOPMENT';
  portfolio.developmentFocusPolicy.platformPriority=[...PLATFORM_PRIORITY];
  portfolio.developmentFocusPolicy.priorityMeaning='DEFAULT_FOCUS_ONLY_NO_PLATFORM_GATE';
  portfolio.developmentFocusPolicy.requiredFullApprovedWebCompanionBeforeTargetPlatform=false;
  portfolio.developmentFocusPolicy.nativePlatformEvidenceStillRequired=true;
  portfolio.developmentFocusPolicy.nativeDevelopmentAdmission='MINIMUM_DUAL_PLATFORM_DESIGN_READY';
  delete portfolio.developmentFocusPolicy.requiredWebGameplayAndMusicValidationBeforeTargetPlatform;
  delete portfolio.developmentFocusPolicy.optionalWebGameplayTestbedAllowedAlongsideReleaseFocus;
  delete portfolio.developmentFocusPolicy.developmentConfirmedWebPrototypeAllowedAlongsideReleaseFocus;
}

export function syncProductionClasses({portfolio,catalog,artbooks,developmentQueue={},seedState={},filesystem=fs}={}){
  if(!portfolio||!Array.isArray(portfolio.projects))throw new Error('production class portfolio missing');
  if(!catalog||!Array.isArray(catalog.games))throw new Error('production class catalog missing');
  synchronizePlatformPolicy(portfolio);
  const bySlug=new Map(catalog.games.map(game=>[game.id,game]));
  const runtimeQueueById=latestById(developmentQueue?.items,'gameId');
  const runtimeSeedById=latestById((seedState?.seeds||[]).filter(seed=>clean(seed?.status).toUpperCase()==='ACTIVE'),'gameId');
  const projectSlugs=new Set(portfolio.projects.map(project=>clean(project?.slug)).filter(Boolean));
  for(const [gameId,seed] of runtimeSeedById.entries()){
    const seedClass=clean(seed?.productionClass).toUpperCase();
    if(![PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED,PRODUCTION_CLASSES.RELEASE_CONFIRMED].includes(seedClass))continue;
    if(projectSlugs.has(gameId)||!bySlug.has(gameId))continue;
    const game=bySlug.get(gameId);
    const selected=normalizeSelectedPlatform(seed?.selectedPlatform||seed?.INITIAL_TARGET_PLATFORM||game?.selectedPlatform||game?.productionTarget)||'ROBLOX';
    const nativePaths={ROBLOX:`roblox-games/${gameId}`,UNITY:`unity-games/${gameId}`};
    const nativeSource=clean(seed?.targetSourcePaths?.[selected])||clean(seed?.sourcePath)||nativePaths[selected]||nativePaths.ROBLOX;
    portfolio.projects.push({
      id:`RUNTIME-${gameId}`,
      slug:gameId,
      name:clean(seed?.gameName)||clean(game?.name)||gameId,
      sourcePath:nativeSource,
      productionClass:seedClass,
      productionClassSource:'COMPANY_RUNTIME_PROMOTED_SEED',
      profileStatus:seedClass,
      selectedPlatform:selected,
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      targetSourcePaths:nativePaths,
      developmentFocus:{total:0},
      runtimeSynthesized:true
    });
    projectSlugs.add(gameId);
  }
  const runtimeClassFor=(gameId)=>{
    const queue=runtimeQueueById.get(gameId)||null;
    const seed=runtimeSeedById.get(gameId)||null;
    const seedClass=clean(seed?.productionClass).toUpperCase();
    const queueClass=clean(queue?.productionClass).toUpperCase();
    if(seedClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED)return {productionClass:PRODUCTION_CLASSES.RELEASE_CONFIRMED,source:'COMPANY_RUNTIME_RELEASE_SEED'};
    if(seedClass===PRODUCTION_CLASSES.DESIGN_ONLY)return {productionClass:PRODUCTION_CLASSES.DESIGN_ONLY,source:clean(seed?.productionClassSource)||'COMPANY_RUNTIME_DESIGN_SEED'};
    if(seedClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
      return {
        productionClass:PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED,
        source:queueClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED?'COMPANY_RUNTIME_DEVELOPMENT_QUEUE':'COMPANY_RUNTIME_PROMOTED_SEED'
      };
    }
    return null;
  };
  const rows=portfolio.projects.map(project=>{
    const catalogPresent=bySlug.has(project.slug);
    const game=bySlug.get(project.slug)||{};
    const lifecycleState=catalogPresent?gameLifecycleState(game):'REMOVED';
    const runtimeClass=runtimeClassFor(project.slug);
    const productionClass=runtimeClass?.productionClass||productionClassOf(project,game);
    const runtimeDevelopment=productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED&&Boolean(runtimeClass);
    const recoverableMissingSourceHold=runtimeDevelopment&&clean(project?.mode).toUpperCase()==='HOLD'&&/^HOLD_(?:MISSING_SOURCE|REDIRECT_ONLY)$/.test(clean(project?.profileStatus).toUpperCase());
    const sourceReady=Boolean(clean(project.sourcePath)&&filesystem?.existsSync?.(project.sourcePath));
    const hold=(isHold(project)&&!recoverableMissingSourceHold)||(!sourceReady&&!runtimeDevelopment)||!catalogPresent||!lifecycleAllowsDevelopment(game);
    const book=latestBook(artbooks,project.slug);
    const baseline=baselineRank(book);
    const targetPlatform=selectedPlatformOf(project,game);
    const platformReady=targetPlatformReady(project,game,targetPlatform,filesystem);
    const score=focusScore(project);
    const family=gameplayFamily(game);
    const productionClassSource=runtimeClass?.source||clean(game?.productionClassSource||project?.productionClassSource)||'CURRENT_EVIDENCE_STATE';
    const evidenceScore=hold?Number.NEGATIVE_INFINITY:(score*100)+(baseline*10)+(platformReady?6:0);
    return {project,game,score,baseline,targetPlatform,targetPlatformReady:platformReady,sourceReady,hold,catalogPresent,lifecycleState,evidenceScore,gameplayFamily:family,productionClass,productionClassSource};
  });

  // 플랫폼 우선순위는 준비된 후보의 기본 집중 순서에만 쓰며 제작 등급 멤버십이나 플랫폼 진입을 제한하지 않는다.
  const ranked=rows.filter(row=>!row.hold).sort((a,b)=>b.evidenceScore-a.evidenceScore||Number(b.targetPlatformReady)-Number(a.targetPlatformReady)||platformPriorityRank(a.targetPlatform)-platformPriorityRank(b.targetPlatform)||b.score-a.score||a.project.id.localeCompare(b.project.id));
  const rawRankById=new Map(ranked.map((row,index)=>[row.project.id,index+1]));

  for(const row of rows){
    const {project,game,productionClass,productionClassSource,targetPlatform,lifecycleState}=row;
    project.lifecycleState=lifecycleState;
    if(row.catalogPresent!==true||!lifecycleAllowsDevelopment(game)){project.profileStatus=lifecycleState;project.mode=lifecycleState;project.targetEngine='lifecycle-inactive';continue;}
    project.productionClass=productionClass;
    project.productionClassSource=productionClassSource;
    delete project.productionTier;
    delete project.productionTierSource;
    if(targetPlatform)project.selectedPlatform=targetPlatform;
    project.targetPlatformReady=row.targetPlatformReady;
    const recoverableMissingSourceHold=productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED&&clean(project?.mode).toUpperCase()==='HOLD'&&/^HOLD_(?:MISSING_SOURCE|REDIRECT_ONLY)$/.test(clean(project?.profileStatus).toUpperCase());
    if(isHold(project)&&!recoverableMissingSourceHold)continue;
    if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
      project.profileStatus='RELEASE_CONFIRMED';
      if(targetPlatform){
        project.targetEngine=platformTargetEngine(targetPlatform);
        if(targetPlatform==='UNITY'){
          project.mode=row.targetPlatformReady?'UNITY_DEVELOP':'UNITY_NEXT';
          project.unityProjectReady=row.targetPlatformReady;
        }else{
          project.mode=row.targetPlatformReady?'TARGET_PLATFORM_DEVELOP':'TARGET_PLATFORM_NEXT';
        }
        const source=targetSourcePath(project,game,targetPlatform,filesystem);
        if(source)project.productionSourcePath=source;
      }else{
        project.mode='TARGET_PLATFORM_SELECTION_REQUIRED';
        project.targetEngine='platform-selection-required';
      }
    }else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
      project.profileStatus='DEVELOPMENT_CONFIRMED';
      project.mode='ROBLOX_UNITY_DIRECT_NATIVE_CONCURRENT';
      project.targetEngine='roblox-unity-native';
      project.concurrentTargetPlatforms=['ROBLOX','UNITY'];
      project.targetSourcePaths={
        ROBLOX:clean(project?.targetSourcePaths?.ROBLOX)||`roblox-games/${project.slug}`,
        UNITY:clean(project?.targetSourcePaths?.UNITY)||`unity-games/${project.slug}`
      };
      project.webPurpose='UNITY_WEB_VALIDATION_SURFACE_ONLY';
      project.webCompanionRequired=false;
      project.webValidationRequired=false;
      project.approvedDesignScopeMustBeFullyImplemented=true;
      project.webEvidenceMayReplaceNativePlatformEvidence=false;
      project.webGameplayValidationRequired=false;
      project.musicValidationRequired=false;
      project.strictDesignScoreRequiredForAdmission=false;
      project.strictDesignReviewRunsInParallel=true;
    }else{
      project.profileStatus='DESIGN_ONLY';
      project.mode='REDESIGN';
      project.targetEngine='design-only';
    }
  }

  const rowByGameId=new Map(rows.map(row=>[clean(row.game?.id),row]).filter(([id])=>id));
  for(const game of catalog.games){
    game.lifecycleState=gameLifecycleState(game);
    const project=portfolio.projects.find(row=>row.slug===game.id);
    if(!project)continue;
    if(!lifecycleAllowsDevelopment(game)){game.productionTarget='lifecycle-inactive';game.homepageStage=game.lifecycleState;continue;}
    const row=rowByGameId.get(clean(game.id));
    const productionClass=row?.productionClass||productionClassOf(project,game);
    const productionClassSource=row?.productionClassSource||project.productionClassSource||game.productionClassSource||'CURRENT_EVIDENCE_STATE';
    const targetPlatform=selectedPlatformOf(project,game);
    game.productionClass=productionClass;
    game.productionClassSource=productionClassSource;
    delete game.productionTier;
    delete game.productionTierSource;
    game.homepageCategory=homepageCategoryForProductionClass(productionClass)||game.homepageCategory;
    if(targetPlatform)game.selectedPlatform=targetPlatform;
    if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
      game.productionTarget=targetPlatform?platformTargetEngine(targetPlatform):'platform-selection-required';
      game.homepageStage=targetPlatform?`출시확정 · ${platformLabel(targetPlatform)}`:'출시확정 · 플랫폼 선택 필요';
    }else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
      game.productionTarget='ROBLOX_UNITY';
      game.concurrentTargetPlatforms=['ROBLOX','UNITY'];
      game.homepageStage='개발확정 · Roblox + Unity 앱 동시개발';
    }else{
      game.productionTarget='design-only';
      if(!isHold(project))game.homepageStage='기획 · 아트북/컨셉/설계 최적화';
    }
  }

  const liveRows=rows.filter(row=>['ACTIVE','REBUILD'].includes(row.lifecycleState));
  const releaseIds=liveRows.filter(row=>row.productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED).map(row=>row.project.id).sort();
  const developmentIds=liveRows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED).map(row=>row.project.id).sort();
  const designIds=liveRows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DESIGN_ONLY).map(row=>row.project.id).sort();
  const counts=productionClassCounts(liveRows);
  const distinctFamilies=[...new Set(rows.filter(row=>row.productionClass!==PRODUCTION_CLASSES.DESIGN_ONLY).map(row=>row.gameplayFamily).filter(family=>family!=='UNCLASSIFIED'))];
  const diversityPolicy=portfolio?.productionClassPolicy?.portfolioDiversity||{};
  portfolio.productionClassState={
    membershipMode:'SEMANTIC_EVIDENCE_DYNAMIC',
    canonicalField:'productionClass',
    fixedGameIds:false,
    fixedCounts:false,
    countsDerivedFromMembership:true,
    autoPromotionDemotion:true,
    diversity:{enabled:diversityPolicy?.enabled!==false,maxFocusScoreGap:Number(diversityPolicy?.maxFocusScoreGap??1),scope:'DIAGNOSTIC_ONLY',source:'CATALOG_GENRE',membershipInfluence:false,adjusted:false,distinctFamilies},
    counts,
    releaseConfirmedGameIds:releaseIds,
    developmentConfirmedGameIds:developmentIds,
    designOnlyGameIds:designIds,
    lifecycle:{active:rows.filter(row=>row.lifecycleState==='ACTIVE').map(row=>row.project.id),paused:rows.filter(row=>row.lifecycleState==='PAUSED').map(row=>row.project.id),rebuild:rows.filter(row=>row.lifecycleState==='REBUILD').map(row=>row.project.id),retired:rows.filter(row=>row.lifecycleState==='RETIRED').map(row=>row.project.id),removed:rows.filter(row=>row.lifecycleState==='REMOVED').map(row=>row.project.id)},
    pipeline:{target:60,count:liveRows.length,activeDevelopmentWipMax:null,capacityOnly:true,noArtificialGlobalGameCountCap:true,deficit:Math.max(0,60-liveRows.length)},
    ranking:ranked.map((row,index)=>({rank:index+1,rawEvidenceRank:rawRankById.get(row.project.id),gameId:row.project.id,slug:row.project.slug,lifecycleState:row.lifecycleState,productionClass:row.productionClass,gameplayFamily:row.gameplayFamily,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,targetPlatform:row.targetPlatform||null,targetPlatformReady:row.targetPlatformReady,sourceReady:row.sourceReady})),
  };
  delete portfolio.productionTierState;
  delete portfolio.productionTierPolicy;
  return {portfolio,catalog,state:portfolio.productionClassState};
}

export function mergeRuntimeCatalogMissingGames({catalog={},runtimeCatalog={},developmentQueue={}}={}){
  if(!Array.isArray(catalog.games)||!Array.isArray(runtimeCatalog.games))return[];
  const liveQueueIds=new Set((Array.isArray(developmentQueue.items)?developmentQueue.items:[])
    .filter(item=>{
      const cls=clean(item?.productionClass).toUpperCase();
      const lifecycle=clean(item?.lifecycleState||item?.status||'ACTIVE').toUpperCase();
      return ['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(cls)&&!['DISABLED','REMOVED','RETIRED'].includes(lifecycle);
    })
    .map(item=>clean(item?.gameId))
    .filter(Boolean));
  const ids=new Set(catalog.games.map(game=>clean(game?.id||game?.gameId)).filter(Boolean));
  const added=[];
  for(const game of runtimeCatalog.games){
    const id=clean(game?.id||game?.gameId);
    if(!id||ids.has(id)||!liveQueueIds.has(id))continue;
    catalog.games.push(JSON.parse(JSON.stringify(game)));
    ids.add(id);
    added.push(id);
  }
  return added;
}

export function runCompanyStatusSync({filesystem=fs}={}){
  const company=JSON.parse(filesystem.readFileSync(companyPath,'utf8'));
  const supervision=JSON.parse(filesystem.readFileSync(supervisionPath,'utf8'));
  const portfolio=JSON.parse(filesystem.readFileSync(portfolioPath,'utf8'));
  const catalog=JSON.parse(filesystem.readFileSync(catalogPath,'utf8'));
  const artbooks=JSON.parse(filesystem.readFileSync(artbooksPath,'utf8'));
  const developmentQueue=optionalJson(filesystem,developmentQueuePath,{items:[]});
  const runtimeCatalog=runtimeCatalogPath?optionalJson(filesystem,runtimeCatalogPath,{games:[]}):{games:[]};
  const runtimeCatalogAdded=mergeRuntimeCatalogMissingGames({catalog,runtimeCatalog,developmentQueue});
  const seedState=optionalJson(filesystem,seedStatePath,{seeds:[]});
  const ownerWebGameIds=ownerWebGameIdsPath&&filesystem.existsSync?.(ownerWebGameIdsPath)
    ?filesystem.readFileSync(ownerWebGameIdsPath,'utf8').split(/\r?\n/).map(clean).filter(Boolean)
    :[];
  const ownerWebIngest=ingestOwnerWebGameIds(catalog,ownerWebGameIds,{filesystem});
  catalog.runtimeCounts={...(catalog.runtimeCounts||{}),runtimeCatalogAdded:runtimeCatalogAdded.length,ownerWebAdded:ownerWebIngest.added.length,ownerWebUpdated:ownerWebIngest.updated.length,ownerWebDisabled:ownerWebIngest.disabled.length};

  synchronizeCompanyStatusPolicy(company,{filesystem});
  const classResult=syncProductionClasses({portfolio,catalog,artbooks,developmentQueue,seedState,filesystem});
  applyHomepageRuntimeInfo({catalog,developmentQueue,seedState});
  company.runtimeAuthority='company-runtime';
  company.updatedAt=supervision.dateKst||company.updatedAt;
  company.supervision={
    source:supervisionPath,
    dateKst:supervision.dateKst||null,
    runningLabelAloneCountsAsWork:supervision?.checks?.runningLabelAloneCountsAsWork===true,
    counts:{...(supervision.counts||{})},
    liveStates:{...(supervision.liveStates||{})},
    activeDevelopmentRunId:supervision.activeDevelopmentRunId||null,
    primaryFindings:[...(supervision.primaryFindings||[])],
    staff:Object.fromEntries(roles.map(role=>{
      const live=supervision?.staff?.[role];
      return [role,live?{status:live.status||null,workState:live.workState||null,task:live.task||null,source:live.source||null,reason:live.reason||null,jobEvidence:live.jobEvidence||null}:null];
    }))
  };

  company.operations ||= {};
  company.operations.homepage ||= {};
  const homepage=supervision?.staff?.homepage;
  if(homepage){
    company.operations.homepage.status=statusMap[homepage.status]||String(homepage.status||'').toLowerCase()||'unknown';
    company.operations.homepage.workState=homepage.workState||null;
    company.operations.homepage.lastReviewedAt=supervision.dateKst||company.operations.homepage.lastReviewedAt||null;
    company.operations.homepage.lastCheckResult=homepage.status||null;
    company.operations.homepage.evidenceSource=supervisionPath;
    company.operations.homepage.runtimeDataSync=company?.policy?.homepageOperations?.runtimeDataSync===true?'active':'inactive';
    company.operations.homepage.task=homepage.task||company.operations.homepage.task;
  }

  const focusPolicy=portfolio?.developmentFocusPolicy||null;
  const focusSelection=focusPolicy?selectContinuousTarget({portfolio,artbooks,catalog,queueState:{version:2,attempts:[]},filesystem}):null;
  const focusedGameIds=Array.isArray(focusSelection?.focusedGameIds)?focusSelection.focusedGameIds:[];
  const nextDevelopmentGameIds=Array.isArray(focusSelection?.nextDevelopmentGameIds)?focusSelection.nextDevelopmentGameIds:[];
  const nextFocusGameIds=Array.isArray(focusSelection?.nextFocusGameIds)?focusSelection.nextFocusGameIds:[];
  const projectById=new Map((portfolio?.projects||[]).map(project=>[project.id,project]));
  const catalogBySlug=new Map((catalog?.games||[]).map(game=>[game.id,game]));
  const focusedGames=focusedGameIds.map((id,index)=>{
    const project=projectById.get(id);if(!project)return null;
    const publicGame=catalogBySlug.get(project.slug)||{};
    const platform=selectedPlatformOf(project,publicGame);
    const ready=targetPlatformReady(project,publicGame,platform,filesystem);
    return {slot:index+1,gameId:project.id,slug:project.slug,name:project.name||publicGame.name||project.slug,score:focusScore(project),slotRole:'auto-ranked',lane:'selected-platform',selectedPlatform:platform||null,targetPlatformReady:ready,homepageCategory:publicGame.homepageCategory||null,webPath:publicGame.webPath||null};
  }).filter(Boolean);
  const targetSlots=Math.max(0,Number(focusPolicy?.targetFocusedGames??focusPolicy?.maxFocusedGames??focusedGames.length)||0);
  company.operations.autonomousFocus={
    enabled:Boolean(focusPolicy),targetSlots,filledSlots:focusedGames.length,preferredGameIds:[],focusedGameIds,games:focusedGames,nextFocusGameIds,nextDevelopmentGameIds,
    selection:focusPolicy?.selection||null,platformPriority:[...PLATFORM_PRIORITY],priorityMeaning:'DEFAULT_FOCUS_ONLY_NO_PLATFORM_GATE',activeDevelopmentRunId:supervision.activeDevelopmentRunId||null,syncIntervalMs:30000,updatedAtKst:supervision.dateKst||company.updatedAt||null,
    source:[portfolioPath,artbooksPath,catalogPath,'tools/autonomous-24h-work-planner.mjs'],
  };
  company.operations.productionClasses={...classResult.state,source:[portfolioPath,catalogPath,artbooksPath,'tools/company-status-sync.mjs']};
  delete company.operations.productionTiers;

  const departmentTasks=company?.redevelopmentReview?.departmentTasks;
  if(departmentTasks&&typeof departmentTasks==='object'){
    for(const role of roles){
      const current=departmentTasks[role],live=supervision?.staff?.[role];
      if(!current||!live)continue;
      current.status=statusMap[live.status]||String(live.status||'').toLowerCase()||current.status;
      current.workState=live.workState||current.workState||null;
      current.task=live.task||current.task;
      current.reason=live.reason||null;
      current.evidenceSource=supervisionPath;
    }
  }

  filesystem.writeFileSync(portfolioPath,JSON.stringify(portfolio,null,2)+'\n');
  filesystem.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  filesystem.writeFileSync(companyPath,JSON.stringify(company,null,2)+'\n');
  console.log('COMPANY_STATUS_SYNC=PASS');
  console.log(`COMPANY_POLICY_SOURCE=${company.policy?.sourceOfTruth||'unknown'}`);
  console.log(`COMPANY_HOMEPAGE_RUNTIME_INFO=${catalog.runtimeCounts?.homepageInfo||0}/${catalog.games?.length||0}`);
  console.log(`COMPANY_HOMEPAGE_RUNTIME_AUTHORITY=${catalog.runtimeInfoAuthority||'none'}`);
  console.log(`COMPANY_CATALOG_NORMALIZED=${catalog.runtimeCounts?.normalizedGames||0}/${catalog.games?.length||0}`);
  console.log(`COMPANY_RUNTIME_CATALOG_ADDED=${runtimeCatalogAdded.join(',')||'NONE'}`);
  console.log(`COMPANY_OWNER_WEB_ADDED=${ownerWebIngest.added.join(',')||'NONE'}`);
  console.log(`COMPANY_OWNER_WEB_UPDATED=${ownerWebIngest.updated.join(',')||'NONE'}`);
  console.log(`COMPANY_OWNER_WEB_DISABLED=${ownerWebIngest.disabled.join(',')||'NONE'}`);
  console.log(`COMPANY_PRIMARY_PLATFORM=${company.policy?.primaryPlatform||'unknown'}`);
  console.log(`PRODUCTION_CLASS_RELEASE_CONFIRMED=${classResult.state.releaseConfirmedGameIds.join(',')||'none'}`);
  console.log(`PRODUCTION_CLASS_DEVELOPMENT_CONFIRMED=${classResult.state.developmentConfirmedGameIds.join(',')||'none'}`);
  console.log(`PRODUCTION_CLASS_DESIGN_ONLY=${classResult.state.designOnlyGameIds.join(',')||'none'}`);
  console.log(`PRODUCTION_DIVERSITY_FAMILIES=${classResult.state.diversity.distinctFamilies.join(',')||'none'}`);
  console.log('PRODUCTION_DIVERSITY_ADJUSTED=NO');
  console.log(`COMPANY_SUPERVISION_DATE=${company.supervision.dateKst||'unknown'}`);
  console.log(`COMPANY_AUTONOMOUS_FOCUS=${focusedGameIds.join(',')||'none'}`);
  console.log(`COMPANY_AUTONOMOUS_FOCUS_SLOTS=${focusedGames.length}/${targetSlots}`);
  return {company,portfolio,catalog,productionClassState:classResult.state};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{runCompanyStatusSync();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}