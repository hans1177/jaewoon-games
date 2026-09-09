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
    const family=gameplayFamily(game);
    // 기존 분류 자체에는 가점을 주지 않는다. 그래야 새 근거가 생기면 실제 승격/하락이 가능하다.
    const evidenceScore=hold?Number.NEGATIVE_INFINITY:(score*100)+(baseline*10)+(unityReady?6:0)+(playable?3:0)+(game?.hasWebArchive===true?1:0);
    return {project,game,score,baseline,unityReady,sourceReady,hold,evidenceScore,gameplayFamily:family};
  });
  const rawRanked=rows.filter(row=>!row.hold).sort((a,b)=>b.evidenceScore-a.evidenceScore||b.score-a.score||Number(b.unityReady)-Number(a.unityReady)||a.project.id.localeCompare(b.project.id));
  const capacity=releaseCount+developmentCount;
  if(rawRanked.length<capacity)throw new Error(`fixed tier capacity unavailable: ${rawRanked.length}/${capacity}`);
  const diversityPolicy={enabled:policy?.portfolioDiversity?.enabled!==false,maxFocusScoreGap:Number(policy?.portfolioDiversity?.maxFocusScoreGap??1)};
  const diverseTop=selectDiverseTopRows(rawRanked,capacity,diversityPolicy);
  const topIds=new Set(diverseTop.map(row=>row.project.id));
  // 다양성은 상위 5개 멤버십에만 관여한다. 1/2분류 내부 순서는 원래 근거 순위를 보존한다.
  const ranked=[...rawRanked.filter(row=>topIds.has(row.project.id)),...rawRanked.filter(row=>!topIds.has(row.project.id))];
  const rawRankById=new Map(rawRanked.map((row,index)=>[row.project.id,index+1]));
  const rawTopIds=new Set(rawRanked.slice(0,capacity).map(row=>row.project.id));
  const diversityAdjusted=diverseTop.some(row=>!rawTopIds.has(row.project.id));
  const tier1Ids=new Set(ranked.slice(0,releaseCount).map(row=>row.project.id));
  const tier2Ids=new Set(ranked.slice(releaseCount,capacity).map(row=>row.project.id));
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
      game.homepageCategory='design-only';
      game.productionTarget='design-only';
      if(!isHold(project))game.homepageStage='3분류 · 아트북/컨셉/설계 최적화';
    }
  }

  const releaseIds=ranked.slice(0,releaseCount).map(row=>row.project.id);
  const developmentIds=ranked.slice(releaseCount,capacity).map(row=>row.project.id);
  const designIds=rows.filter(row=>tierFor(row.project.id)===3).map(row=>row.project.id).sort();
  const distinctFamilies=[...new Set(ranked.slice(0,capacity).map(row=>row.gameplayFamily).filter(family=>family!=='UNCLASSIFIED'))];
  portfolio.productionTierState={
    membershipMode:'AUTO_EVIDENCE_RANKED',
    fixedGameIds:false,
    autoPromotionDemotion:true,
    diversity:{enabled:diversityPolicy.enabled,maxFocusScoreGap:diversityPolicy.maxFocusScoreGap,scope:'TOP_RELEASE_AND_DEVELOPMENT',source:'CATALOG_GENRE',adjusted:diversityAdjusted,distinctFamilies},
    counts:{releaseConfirmed:releaseCount,developmentConfirmed:developmentCount,designOnly:designIds.length},
    releaseConfirmedGameIds:releaseIds,
    developmentConfirmedGameIds:developmentIds,
    designOnlyGameIds:designIds,
    ranking:ranked.map((row,index)=>({rank:index+1,rawEvidenceRank:rawRankById.get(row.project.id),gameId:row.project.id,slug:row.project.slug,gameplayFamily:row.gameplayFamily,evidenceScore:row.evidenceScore,developmentFocus:row.score,artbookBaselineRank:row.baseline,unityReady:row.unityReady,sourceReady:row.sourceReady})),
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
  console.log(`PRODUCTION_DIVERSITY_FAMILIES=${tierResult.state.diversity.distinctFamilies.join(',')||'none'}`);
  console.log(`PRODUCTION_DIVERSITY_ADJUSTED=${tierResult.state.diversity.adjusted?'YES':'NO'}`);
  console.log(`COMPANY_SUPERVISION_DATE=${company.supervision.dateKst||'unknown'}`);
  console.log(`COMPANY_AUTONOMOUS_FOCUS=${focusedGameIds.join(',')||'none'}`);
  console.log(`COMPANY_AUTONOMOUS_FOCUS_SLOTS=${focusedGames.length}/${targetSlots}`);
  return {company,portfolio,catalog,tierState:tierResult.state};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{runCompanyStatusSync();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
