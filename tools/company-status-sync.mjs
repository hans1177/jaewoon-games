// 파일명: tools/company-status-sync.mjs
// 역할: 총괄 감독 상태와 고정 개수 3분류를 최신 근거로 동기화한다.
// 원칙: 분류 개수만 고정하고 게임 ID는 고정하지 않는다. 공개 Web 이력/빌드는 삭제하지 않는다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { selectContinuousTarget } from './autonomous-24h-work-planner.mjs';

const companyPath='company-status.json';
const supervisionPath='director-supervision-status.json';
const portfolioPath='autonomous-portfolio.json';
const catalogPath='game-catalog.json';
const artbooksPath='game-artbooks.json';

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
const actualUnityReady=(project,game,filesystem)=>{
  const paths=[project?.productionSourcePath,game?.unityProjectPath,`unity-games/${project?.slug||''}`].map(clean).filter(Boolean);
  return project?.unityProjectReady===true||paths.some(candidate=>filesystem?.existsSync?.(candidate)===true);
};

export function rebalanceProductionTiers({portfolio,catalog,artbooks,filesystem=fs}={}){
  if(!portfolio||!Array.isArray(portfolio.projects))throw new Error('production tier portfolio missing');
  if(!catalog||!Array.isArray(catalog.games))throw new Error('production tier catalog missing');
  const policy=portfolio.productionTierPolicy||{};
  const releaseCount=Number(policy.releaseConfirmedCount??2);
  const developmentCount=Number(policy.developmentConfirmedCount??3);
  if(releaseCount!==2||developmentCount!==3)throw new Error('owner fixed tier counts must remain 2/3');
  const bySlug=new Map(catalog.games.map(game=>[game.id,game]));
  const rows=portfolio.projects.map(project=>{
    const game=bySlug.get(project.slug)||{};
    const sourceReady=Boolean(clean(project.sourcePath)&&filesystem?.existsSync?.(project.sourcePath));
    const hold=isHold(project)||!sourceReady;
    const book=latestBook(artbooks,project.slug);
    const baseline=baselineRank(book);
    const unityReady=actualUnityReady(project,game,filesystem);
    const playable=game?.homepageWebPlayable===true;
    const score=focusScore(project);
    // 기존 분류 자체에는 가점을 주지 않는다. 그래야 새 근거가 생기면 실제 승격/하락이 가능하다.
    const evidenceScore=hold?Number.NEGATIVE_INFINITY:(score*100)+(baseline*10)+(unityReady?6:0)+(playable?3:0)+(game?.hasWebArchive===true?1:0);
    return {project,game,score,baseline,unityReady,sourceReady,hold,evidenceScore};
  });
  const ranked=rows.filter(row=>!row.hold).sort((a,b)=>b.evidenceScore-a.evidenceScore||b.score-a.score||Number(b.unityReady)-Number(a.unityReady)||a.project.id.localeCompare(b.project.id));
  if(ranked.length<releaseCount+developmentCount)throw new Error(`fixed tier capacity unavailable: ${ranked.length}/${releaseCount+developmentCount}`);
  const tier1Ids=new Set(ranked.slice(0,releaseCount).map(row=>row.project.id));
  const tier2Ids=new Set(ranked.slice(releaseCount,releaseCount+developmentCount).map(row=>row.project.id));
  const tierFor=id=>tier1Ids.has(id)?1:(tier2Ids.has(id)?2:3);

  for(const row of rows){
    const project=row.project;
    const tier=tierFor(project.id);
    project.productionTier=tier;
    project.productionTierSource='AUTO_EVIDENCE_RANKED_FIXED_COUNTS';
    if(tier===1){
      project.profileStatus='RELEASE_CONFIRMED';
      project.mode=row.unityReady?'UNITY_DEVELOP':'UNITY_NEXT';
      project.targetEngine='unity-android';
      project.unityProjectReady=row.unityReady;
      if(row.unityReady&&!clean(project.productionSourcePath))project.productionSourcePath=clean(row.game?.unityProjectPath)||`unity-games/${project.slug}`;
    }else if(tier===2){
      project.profileStatus='DEVELOPMENT_CONFIRMED';
      project.mode='WEB_FIRST_IMPLEMENTATION';
      project.targetEngine='web';
    }else if(!isHold(project)){
      project.profileStatus='DESIGN_ONLY';
      project.mode='REDESIGN';
      project.targetEngine='design-only';
    }
  }

  for(const game of catalog.games){
    const project=portfolio.projects.find(row=>row.slug===game.id);
    if(!project)continue;
    const tier=tierFor(project.id);
    game.productionTier=tier;
    game.productionTierSource='AUTO_EVIDENCE_RANKED_FIXED_COUNTS';
    if(tier===1){
      game.homepageCategory='release-confirmed';
      game.productionTarget='unity-android';
      game.homepageStage='1분류 출시확정 · Unity Android';
    }else if(tier===2){
      game.homepageCategory='development-confirmed';
      game.productionTarget='web-first-playable';
      game.homepageStage='2분류 개발확정 · Web 1차 구현';
    }else{
      game.homepageCategory='reviewing';
      game.productionTarget='design-only';
      if(!isHold(project))game.homepageStage='3분류 · 아트북/컨셉/설계 최적화';
    }
  }

  const releaseIds=ranked.slice(0,releaseCount).map(row=>row.project.id);
  const developmentIds=ranked.slice(releaseCount,releaseCount+developmentCount).map(row=>row.project.id);
  const designIds=rows.filter(row=>tierFor(row.project.id)===3).map(row=>row.project.id).sort();
  portfolio.productionTierState={
    membershipMode:'AUTO_EVIDENCE_RANKED',
    fixedGameIds:false,
    autoPromotionDemotion:true,
    counts:{releaseConfirmed:releaseCount,developmentConfirmed:developmentCount,designOnly:designIds.length},
    releaseConfirmedGameIds:releaseIds,
    developmentConfirmedGameIds:developmentIds,
    designOnlyGameIds:designIds,
    ranking:ranked.map((row,index)=>({rank:index+1,gameId:row.project.id,slug:row.project.slug,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,unityReady:row.unityReady,sourceReady:row.sourceReady})),
  };
  return {portfolio,catalog,state:portfolio.productionTierState};
}

export function runCompanyStatusSync({filesystem=fs}={}){
  const company=JSON.parse(filesystem.readFileSync(companyPath,'utf8'));
  const supervision=JSON.parse(filesystem.readFileSync(supervisionPath,'utf8'));
  const portfolio=JSON.parse(filesystem.readFileSync(portfolioPath,'utf8'));
  const catalog=JSON.parse(filesystem.readFileSync(catalogPath,'utf8'));
  const artbooks=JSON.parse(filesystem.readFileSync(artbooksPath,'utf8'));

  const tierResult=rebalanceProductionTiers({portfolio,catalog,artbooks,filesystem});
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
    const unityReady=actualUnityReady(project,publicGame,filesystem);
    return {slot:index+1,gameId:project.id,slug:project.slug,name:project.name||publicGame.name||project.slug,score:focusScore(project),slotRole:'auto-ranked',lane:'unity-primary',unityReady,homepageCategory:publicGame.homepageCategory||null,webPath:publicGame.webPath||null};
  }).filter(Boolean);
  const targetSlots=Math.max(0,Number(focusPolicy?.targetFocusedGames??focusPolicy?.maxFocusedGames??focusedGames.length)||0);
  company.operations.autonomousFocus={
    enabled:Boolean(focusPolicy),targetSlots,filledSlots:focusedGames.length,preferredGameIds:[],focusedGameIds,games:focusedGames,nextFocusGameIds,nextDevelopmentGameIds,
    selection:focusPolicy?.selection||null,activeDevelopmentRunId:supervision.activeDevelopmentRunId||null,syncIntervalMs:30000,updatedAtKst:supervision.dateKst||company.updatedAt||null,
    source:[portfolioPath,artbooksPath,catalogPath,'tools/autonomous-24h-work-planner.mjs'],
  };
  company.operations.productionTiers={...tierResult.state,source:[portfolioPath,catalogPath,artbooksPath,'tools/company-status-sync.mjs']};

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
  console.log(`PRODUCTION_TIER_1=${tierResult.state.releaseConfirmedGameIds.join(',')}`);
  console.log(`PRODUCTION_TIER_2=${tierResult.state.developmentConfirmedGameIds.join(',')}`);
  console.log(`PRODUCTION_TIER_3_COUNT=${tierResult.state.designOnlyGameIds.length}`);
  console.log(`COMPANY_SUPERVISION_DATE=${company.supervision.dateKst||'unknown'}`);
  console.log(`COMPANY_AUTONOMOUS_FOCUS=${focusedGameIds.join(',')||'none'}`);
  console.log(`COMPANY_AUTONOMOUS_FOCUS_SLOTS=${focusedGames.length}/${targetSlots}`);
  return {company,portfolio,catalog,tierState:tierResult.state};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{runCompanyStatusSync();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
