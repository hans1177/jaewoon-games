// 파일명: tools/company-status-sync.mjs
// 역할: 총괄 감독 상태와 의미 기반 제작 분류를 최신 상태로 동기화한다.
// 원칙: productionClass가 유일한 정식 제작 분류이며 플랫폼은 프로젝트 선택값, 없으면 Roblox 기본값을 따른다.
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

const statusMap={WORKING:'working',DONE:'done',IDLE_NO_TASK:'idle',BLOCKED:'blocked',FAILED:'failed',STALE:'stale'};
const roles=['planning','development','qa','graphics','balance','director'];
const clean=value=>String(value??'').trim();
const PLATFORM_DEFAULT='ROBLOX';
const PLATFORM_CONFIG={
  ROBLOX:{targetEngine:'roblox',sourceRoot:'roblox-games',developMode:'ROBLOX_DEVELOP',nextMode:'ROBLOX_NEXT',homepageLabel:'Roblox'},
  UNITY:{targetEngine:'unity-android',sourceRoot:'unity-games',developMode:'UNITY_DEVELOP',nextMode:'UNITY_NEXT',homepageLabel:'Unity Android'},
  FORTNITE_UEFN:{targetEngine:'fortnite-uefn',sourceRoot:'uefn-games',developMode:'FORTNITE_UEFN_DEVELOP',nextMode:'FORTNITE_UEFN_NEXT',homepageLabel:'Fortnite UEFN'},
};
const normalizePlatform=value=>{
  const raw=clean(value).toUpperCase().replace(/[\s-]+/g,'_');
  if(!raw||raw==='WEB'||raw==='DESIGN_ONLY')return null;
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE','ANDROID'].includes(raw))return 'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(raw))return 'FORTNITE_UEFN';
  return null;
};
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
const selectedPlatformOf=(project,game)=>{
  const explicit=[project?.selectedPlatform,project?.targetPlatform,game?.selectedPlatform,game?.targetPlatform]
    .map(normalizePlatform).find(Boolean);
  if(explicit)return explicit;
  const legacy=normalizePlatform(project?.targetEngine);
  if(legacy)return legacy;
  const paths=[project?.productionSourcePath,game?.robloxProjectPath,game?.unityProjectPath,game?.uefnProjectPath].map(clean).filter(Boolean);
  if(paths.some(value=>value.startsWith('unity-games/')))return 'UNITY';
  if(paths.some(value=>value.startsWith('uefn-games/')))return 'FORTNITE_UEFN';
  if(paths.some(value=>value.startsWith('roblox-games/')))return 'ROBLOX';
  if(clean(project?.dedicatedDevelopmentLane).toUpperCase().includes('UNITY'))return 'UNITY';
  if(clean(project?.dedicatedDevelopmentLane).toUpperCase().includes('FORTNITE'))return 'FORTNITE_UEFN';
  if(clean(project?.dedicatedDevelopmentLane).toUpperCase().includes('ROBLOX'))return 'ROBLOX';
  return PLATFORM_DEFAULT;
};
const platformSourceCandidates=(project,game,platform)=>{
  const config=PLATFORM_CONFIG[platform]||PLATFORM_CONFIG[PLATFORM_DEFAULT];
  const slug=clean(project?.slug||game?.id);
  const specific=platform==='ROBLOX'?game?.robloxProjectPath:platform==='UNITY'?game?.unityProjectPath:game?.uefnProjectPath;
  const production=clean(project?.productionSourcePath);
  return [production&&production.startsWith(`${config.sourceRoot}/`)?production:null,specific,slug?`${config.sourceRoot}/${slug}`:null]
    .map(clean).filter(Boolean);
};
const platformReadiness=(project,game,filesystem,platform=selectedPlatformOf(project,game))=>{
  const paths=platformSourceCandidates(project,game,platform);
  const sourcePath=paths.find(candidate=>filesystem?.existsSync?.(candidate)===true)||null;
  const explicitReady=platform==='UNITY'&&project?.unityProjectReady===true;
  return {platform,ready:explicitReady||Boolean(sourcePath),sourcePath};
};
const actualUnityReady=(project,game,filesystem)=>platformReadiness(project,game,filesystem,'UNITY').ready;
const normalizeGenre=value=>clean(value).toLowerCase().replace(/\s+/g,' ');

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

export function syncProductionClasses({portfolio,catalog,artbooks,filesystem=fs}={}){
  if(!portfolio||!Array.isArray(portfolio.projects))throw new Error('production class portfolio missing');
  if(!catalog||!Array.isArray(catalog.games))throw new Error('production class catalog missing');
  const bySlug=new Map(catalog.games.map(game=>[game.id,game]));
  const rows=portfolio.projects.map(project=>{
    const game=bySlug.get(project.slug)||{};
    const sourceReady=Boolean(clean(project.sourcePath)&&filesystem?.existsSync?.(project.sourcePath));
    const hold=isHold(project)||!sourceReady;
    const book=latestBook(artbooks,project.slug);
    const baseline=baselineRank(book);
    const selectedPlatform=selectedPlatformOf(project,game);
    const selectedPlatformState=platformReadiness(project,game,filesystem,selectedPlatform);
    const unityReady=actualUnityReady(project,game,filesystem);
    const playable=game?.homepageWebPlayable===true;
    const score=focusScore(project);
    const family=gameplayFamily(game);
    const productionClass=productionClassOf(project,game);
    const evidenceScore=hold?Number.NEGATIVE_INFINITY:(score*100)+(baseline*10)+(selectedPlatformState.ready?6:0)+(playable?3:0)+(game?.hasWebArchive===true?1:0);
    return {project,game,score,baseline,selectedPlatform,selectedPlatformReady:selectedPlatformState.ready,selectedPlatformSourcePath:selectedPlatformState.sourcePath,unityReady,sourceReady,hold,evidenceScore,gameplayFamily:family,productionClass};
  });

  const ranked=rows.filter(row=>!row.hold).sort((a,b)=>b.evidenceScore-a.evidenceScore||b.score-a.score||Number(b.selectedPlatformReady)-Number(a.selectedPlatformReady)||a.project.id.localeCompare(b.project.id));
  const rawRankById=new Map(ranked.map((row,index)=>[row.project.id,index+1]));

  portfolio.productionClassPolicy ||= {};
  portfolio.productionClassPolicy.classes ||= {};
  portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED={
    target:'PROJECT_SELECTED_PLATFORM',
    defaultPlatform:PLATFORM_DEFAULT,
    deepFocusSlots:Number(portfolio.productionClassPolicy.classes.RELEASE_CONFIRMED?.deepFocusSlots??1),
    featureDevelopmentOnWeb:false,
    webArchiveMaintenance:'FAST_RUNTIME_INCIDENT_ONLY',
  };
  portfolio.productionClassPolicy.classes.DEVELOPMENT_CONFIRMED={
    target:'PROJECT_SELECTED_PLATFORM',
    defaultPlatform:PLATFORM_DEFAULT,
    scope:'TARGET_PLATFORM_VALIDATION',
    webPurpose:'OPTIONAL_GAMEPLAY_VALIDATION_TESTBED',
    webBeforeTargetPlatformByDefault:false,
  };

  for(const row of rows){
    const {project,game,productionClass,selectedPlatform,selectedPlatformReady,selectedPlatformSourcePath}=row;
    project.productionClass=productionClass;
    project.productionClassSource=project.productionClassSource||'CURRENT_EVIDENCE_STATE';
    delete project.productionTier;
    delete project.productionTierSource;
    if(isHold(project))continue;
    if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED||productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
      const platform=PLATFORM_CONFIG[selectedPlatform]||PLATFORM_CONFIG[PLATFORM_DEFAULT];
      project.profileStatus=productionClass;
      project.selectedPlatform=selectedPlatform;
      project.targetEngine=platform.targetEngine;
      project.mode=selectedPlatformReady?platform.developMode:platform.nextMode;
      if(selectedPlatformSourcePath)project.productionSourcePath=selectedPlatformSourcePath;
      if(selectedPlatform==='UNITY')project.unityProjectReady=selectedPlatformReady;
    }else{
      project.profileStatus='DESIGN_ONLY';
      project.mode='REDESIGN';
      project.targetEngine='design-only';
    }

    game.productionClass=productionClass;
    game.productionClassSource=game.productionClassSource||project.productionClassSource||'CURRENT_EVIDENCE_STATE';
    delete game.productionTier;
    delete game.productionTierSource;
    game.homepageCategory=homepageCategoryForProductionClass(productionClass)||game.homepageCategory;
    if(productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED||productionClass===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED){
      const platform=PLATFORM_CONFIG[selectedPlatform]||PLATFORM_CONFIG[PLATFORM_DEFAULT];
      game.selectedPlatform=selectedPlatform;
      game.productionTarget=platform.targetEngine;
      game.homepageStage=`${productionClass===PRODUCTION_CLASSES.RELEASE_CONFIRMED?'1분류 출시확정':'2분류 개발확정'} · ${platform.homepageLabel}`;
    }else{
      game.productionTarget='design-only';
      if(!isHold(project))game.homepageStage='3분류 · 아트북/컨셉/설계 최적화';
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
    defaultPlatform:PLATFORM_DEFAULT,
    diversity:{enabled:diversityPolicy?.enabled!==false,maxFocusScoreGap:Number(diversityPolicy?.maxFocusScoreGap??1),scope:'DIAGNOSTIC_ONLY',source:'CATALOG_GENRE',membershipInfluence:false,adjusted:false,distinctFamilies},
    counts,
    releaseConfirmedGameIds:releaseIds,
    developmentConfirmedGameIds:developmentIds,
    designOnlyGameIds:designIds,
    ranking:ranked.map((row,index)=>({rank:index+1,rawEvidenceRank:rawRankById.get(row.project.id),gameId:row.project.id,slug:row.project.slug,productionClass:row.productionClass,gameplayFamily:row.gameplayFamily,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,selectedPlatform:row.selectedPlatform,selectedPlatformReady:row.selectedPlatformReady,unityReady:row.unityReady,sourceReady:row.sourceReady})),
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
  company.policy ||= {};
  company.policy.primaryPlatform='roblox';
  company.policy.futurePrimaryTarget='roblox';
  company.policy.platformPriority=['roblox','unity','fortnite-uefn'];
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
    const selectedPlatform=selectedPlatformOf(project,publicGame);
    const selectedState=platformReadiness(project,publicGame,filesystem,selectedPlatform);
    const unityReady=actualUnityReady(project,publicGame,filesystem);
    return {slot:index+1,gameId:project.id,slug:project.slug,name:project.name||publicGame.name||project.slug,score:focusScore(project),slotRole:'auto-ranked',lane:`${selectedPlatform.toLowerCase().replace('_','-')}-primary`,selectedPlatform,platformReady:selectedState.ready,unityReady,homepageCategory:publicGame.homepageCategory||null,webPath:publicGame.webPath||null};
  }).filter(Boolean);
  const targetSlots=Math.max(0,Number(focusPolicy?.targetFocusedGames??focusPolicy?.maxFocusedGames??focusedGames.length)||0);
  company.operations.autonomousFocus={
    enabled:Boolean(focusPolicy),targetSlots,filledSlots:focusedGames.length,preferredGameIds:[],focusedGameIds,games:focusedGames,nextFocusGameIds,nextDevelopmentGameIds,
    selection:focusPolicy?.selection||null,activeDevelopmentRunId:supervision.activeDevelopmentRunId||null,syncIntervalMs:30000,updatedAtKst:supervision.dateKst||company.updatedAt||null,
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
