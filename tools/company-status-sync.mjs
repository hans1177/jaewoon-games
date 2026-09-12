// 파일명: tools/company-status-sync.mjs
// 역할: 총괄 감독 상태와 의미 기반 제작 분류/선택 플랫폼 상태를 최신 상태로 동기화한다.
// 원칙: productionClass가 유일한 정식 제작 분류이며 플랫폼 우선순위는 기본 집중 순서일 뿐 진입 게이트가 아니다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { selectContinuousTarget } from './autonomous-24h-work-planner.mjs';
import {
  PRODUCTION_CLASSES,
  homepageCategoryForProductionClass,
  productionClassCounts,
  productionClassOf,
} from './production-classification.mjs';

const companyPath='company-status.json';
const supervisionPath='director-supervision-status.json';
const portfolioPath='autonomous-portfolio.json';
const catalogPath='game-catalog.json';
const artbooksPath='game-artbooks.json';
const PLATFORM_PRIORITY=['ROBLOX','UNITY','FORTNITE_UEFN'];

const statusMap={WORKING:'working',DONE:'done',IDLE_NO_TASK:'idle',BLOCKED:'blocked',FAILED:'failed',STALE:'stale'};
const roles=['planning','development','qa','graphics','balance','director'];
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

export function normalizeSelectedPlatform(value){
  const raw=clean(value).toUpperCase().replaceAll('-','_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE_UEFN','UEFN','FORTNITE'].includes(raw))return 'FORTNITE_UEFN';
  return '';
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
  development.engine='PROJECT_SELECTED_PLATFORM';
  development.scope='TARGET_PLATFORM_TECHNICAL_AND_GAMEPLAY_VALIDATION';
  development.webPurpose='OPTIONAL_GAMEPLAY_VALIDATION_TESTBED';
  development.webBeforeTargetPlatformByDefault=false;
  development.targetPlatformMayRunImmediately=true;
  portfolio.developmentFocusPolicy ||= {};
  portfolio.developmentFocusPolicy.selection='AUTO_SELECTED_PLATFORM_READY_THEN_SCORE_WITH_IMPACT_AWARE_DEVELOPMENT';
  portfolio.developmentFocusPolicy.platformPriority=[...PLATFORM_PRIORITY];
  portfolio.developmentFocusPolicy.priorityMeaning='DEFAULT_FOCUS_ONLY_NO_PLATFORM_GATE';
  if(portfolio.developmentFocusPolicy.optionalWebGameplayTestbedAllowedAlongsideReleaseFocus!==false){
    portfolio.developmentFocusPolicy.optionalWebGameplayTestbedAllowedAlongsideReleaseFocus=true;
  }
  delete portfolio.developmentFocusPolicy.developmentConfirmedWebPrototypeAllowedAlongsideReleaseFocus;
}

export function syncProductionClasses({portfolio,catalog,artbooks,filesystem=fs}={}){
  if(!portfolio||!Array.isArray(portfolio.projects))throw new Error('production class portfolio missing');
  if(!catalog||!Array.isArray(catalog.games))throw new Error('production class catalog missing');
  synchronizePlatformPolicy(portfolio);
  const bySlug=new Map(catalog.games.map(game=>[game.id,game]));
  const rows=portfolio.projects.map(project=>{
    const game=bySlug.get(project.slug)||{};
    const sourceReady=Boolean(clean(project.sourcePath)&&filesystem?.existsSync?.(project.sourcePath));
    const hold=isHold(project)||!sourceReady;
    const book=latestBook(artbooks,project.slug);
    const baseline=baselineRank(book);
    const targetPlatform=selectedPlatformOf(project,game);
    const platformReady=targetPlatformReady(project,game,targetPlatform,filesystem);
    const playable=game?.homepageWebPlayable===true;
    const score=focusScore(project);
    const family=gameplayFamily(game);
    const productionClass=productionClassOf(project,game);
    const evidenceScore=hold?Number.NEGATIVE_INFINITY:(score*100)+(baseline*10)+(platformReady?6:0)+(playable?3:0)+(game?.hasWebArchive===true?1:0);
    return {project,game,score,baseline,targetPlatform,targetPlatformReady:platformReady,sourceReady,hold,evidenceScore,gameplayFamily:family,productionClass};
  });

  // 플랫폼 우선순위는 준비된 후보의 기본 집중 순서에만 쓰며 제작 등급 멤버십이나 플랫폼 진입을 제한하지 않는다.
  const ranked=rows.filter(row=>!row.hold).sort((a,b)=>b.evidenceScore-a.evidenceScore||Number(b.targetPlatformReady)-Number(a.targetPlatformReady)||platformPriorityRank(a.targetPlatform)-platformPriorityRank(b.targetPlatform)||b.score-a.score||a.project.id.localeCompare(b.project.id));
  const rawRankById=new Map(ranked.map((row,index)=>[row.project.id,index+1]));

  for(const row of rows){
    const {project,game,productionClass,targetPlatform}=row;
    project.productionClass=productionClass;
    project.productionClassSource=project.productionClassSource||'CURRENT_EVIDENCE_STATE';
    delete project.productionTier;
    delete project.productionTierSource;
    if(targetPlatform)project.selectedPlatform=targetPlatform;
    project.targetPlatformReady=row.targetPlatformReady;
    if(isHold(project))continue;
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
      project.webPurpose='OPTIONAL_GAMEPLAY_VALIDATION_TESTBED';
      if(targetPlatform){
        project.mode='TARGET_PLATFORM_DEVELOPMENT';
        project.targetEngine=platformTargetEngine(targetPlatform);
      }else{
        project.mode='OPTIONAL_WEB_GAMEPLAY_TESTBED';
        project.targetEngine='platform-selection-required';
      }
    }else{
      project.profileStatus='DESIGN_ONLY';
      project.mode='REDESIGN';
      project.targetEngine='design-only';
    }
  }

  for(const game of catalog.games){
    const project=portfolio.projects.find(row=>row.slug===game.id);
    if(!project)continue;
    const productionClass=productionClassOf(project,game);
    const targetPlatform=selectedPlatformOf(project,game);
    game.productionClass=productionClass;
    game.productionClassSource=game.productionClassSource||project.productionClassSource||'CURRENT_EVIDENCE_STATE';
    delete game.productionTier;
    delete game.productionTierSource;
    game.homepageCategory=homepageCategoryForProductionClass(productionClass)||game.homepageCategory;
    if(targetPlatform)game.selectedPlatform=targetPlatform;
    if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED){
      game.productionTarget=targetPlatform?platformTargetEngine(targetPlatform):'platform-selection-required';
      game.homepageStage=targetPlatform?`출시확정 · ${platformLabel(targetPlatform)}`:'출시확정 · 플랫폼 선택 필요';
    }else if(productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
      game.productionTarget=targetPlatform?platformTargetEngine(targetPlatform):'platform-selection-required';
      game.homepageStage=targetPlatform?`개발확정 · ${platformLabel(targetPlatform)}`:'개발확정 · 플랫폼 선택 필요 / Web 테스트베드 선택사항';
    }else{
      game.productionTarget='design-only';
      if(!isHold(project))game.homepageStage='기획 · 아트북/컨셉/설계 최적화';
    }
  }

  const releaseIds=rows.filter(row=>row.productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED).map(row=>row.project.id).sort();
  const developmentIds=rows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED).map(row=>row.project.id).sort();
  const designIds=rows.filter(row=>row.productionClass===PRODUCTION_CLASSES.DESIGN_ONLY).map(row=>row.project.id).sort();
  const counts=productionClassCounts(rows);
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
    ranking:ranked.map((row,index)=>({rank:index+1,rawEvidenceRank:rawRankById.get(row.project.id),gameId:row.project.id,slug:row.project.slug,productionClass:row.productionClass,gameplayFamily:row.gameplayFamily,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,targetPlatform:row.targetPlatform||null,targetPlatformReady:row.targetPlatformReady,sourceReady:row.sourceReady})),
  };
  delete portfolio.productionTierState;
  delete portfolio.productionTierPolicy;
  return {portfolio,catalog,state:portfolio.productionClassState};
}

export function runCompanyStatusSync({filesystem=fs}={}){
  const company=JSON.parse(filesystem.readFileSync(companyPath,'utf8'));
  const supervision=JSON.parse(filesystem.readFileSync(supervisionPath,'utf8'));
  const portfolio=JSON.parse(filesystem.readFileSync(portfolioPath,'utf8'));
  const catalog=JSON.parse(filesystem.readFileSync(catalogPath,'utf8'));
  const artbooks=JSON.parse(filesystem.readFileSync(artbooksPath,'utf8'));

  const classResult=syncProductionClasses({portfolio,catalog,artbooks,filesystem});
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
