// 파일명: tools/company-status-sync.mjs
// 역할: 총괄 감독 결과와 자율 집중개발 상태를 회사 공개 상태에 안전하게 동기화한다.
// 원칙: 프로젝트/승인/빌드 이력은 보존하고 감독·부서·홈페이지 운영 상태만 최신 증거로 갱신한다.
import fs from 'node:fs';
import { selectContinuousTarget } from './autonomous-24h-work-planner.mjs';

const companyPath='company-status.json';
const supervisionPath='director-supervision-status.json';
const portfolioPath='autonomous-portfolio.json';
const catalogPath='game-catalog.json';
const artbooksPath='game-artbooks.json';
const company=JSON.parse(fs.readFileSync(companyPath,'utf8'));
const supervision=JSON.parse(fs.readFileSync(supervisionPath,'utf8'));
const portfolio=JSON.parse(fs.readFileSync(portfolioPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const artbooks=JSON.parse(fs.readFileSync(artbooksPath,'utf8'));

const statusMap={WORKING:'working',DONE:'done',IDLE_NO_TASK:'idle',BLOCKED:'blocked',FAILED:'failed',STALE:'stale'};
const roles=['planning','development','qa','graphics','balance','director'];
const clean=value=>String(value??'').trim();
const focusScore=project=>{
  const explicit=Number(project?.developmentFocus?.total);
  if(Number.isFinite(explicit))return explicit;
  const scores=project?.developmentFocus?.scores||{};
  return ['playability','distinctiveness','developmentEfficiency','scalability','lowBlockage'].reduce((sum,key)=>sum+(Number(scores[key])||0),0);
};

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
    return [role,live?{
      status:live.status||null,
      workState:live.workState||null,
      task:live.task||null,
      source:live.source||null,
      reason:live.reason||null,
      jobEvidence:live.jobEvidence||null
    }:null];
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
const focusSelection=focusPolicy?selectContinuousTarget({
  portfolio,
  artbooks,
  catalog,
  queueState:{version:2,attempts:[]},
  filesystem:fs,
}):null;
const focusedGameIds=Array.isArray(focusSelection?.focusedGameIds)?focusSelection.focusedGameIds:[];
const nextDevelopmentGameIds=Array.isArray(focusSelection?.nextDevelopmentGameIds)?focusSelection.nextDevelopmentGameIds:[];
const preferredGameIds=Array.isArray(focusPolicy?.preferredFocusedGameIds)?focusPolicy.preferredFocusedGameIds:[];
const preferredSet=new Set(preferredGameIds);
const projectById=new Map((portfolio?.projects||[]).map(project=>[project.id,project]));
const catalogBySlug=new Map((catalog?.games||[]).map(game=>[game.id,game]));
const focusedGames=focusedGameIds.map((id,index)=>{
  const project=projectById.get(id);
  if(!project)return null;
  const publicGame=catalogBySlug.get(project.slug)||{};
  const unityPrimary=clean(project?.dedicatedDevelopmentLane).toUpperCase()==='UNITY_PRIMARY'||(project?.protectedValues||[]).includes('unity-primary');
  return {
    slot:index+1,
    gameId:project.id,
    slug:project.slug,
    name:project.name||publicGame.name||project.slug,
    score:focusScore(project),
    slotRole:preferredSet.has(project.id)?'preferred':'backfill',
    lane:unityPrimary?'unity-primary':'web',
    homepageCategory:publicGame.homepageCategory||null,
    webPath:publicGame.webPath||null,
  };
}).filter(Boolean);
const targetSlots=Math.max(0,Number(focusPolicy?.targetFocusedGames??focusPolicy?.maxFocusedGames??focusedGames.length)||0);
company.operations.autonomousFocus={
  enabled:Boolean(focusPolicy),
  targetSlots,
  filledSlots:focusedGames.length,
  preferredGameIds,
  focusedGameIds,
  games:focusedGames,
  nextDevelopmentGameIds,
  selection:focusPolicy?.selection||null,
  activeDevelopmentRunId:supervision.activeDevelopmentRunId||null,
  syncIntervalMs:30000,
  updatedAtKst:supervision.dateKst||company.updatedAt||null,
  source:[portfolioPath,artbooksPath,catalogPath,'tools/autonomous-24h-work-planner.mjs'],
};

const departmentTasks=company?.redevelopmentReview?.departmentTasks;
if(departmentTasks&&typeof departmentTasks==='object'){
  for(const role of roles){
    const current=departmentTasks[role];
    const live=supervision?.staff?.[role];
    if(!current||!live)continue;
    current.status=statusMap[live.status]||String(live.status||'').toLowerCase()||current.status;
    current.workState=live.workState||current.workState||null;
    current.task=live.task||current.task;
    current.reason=live.reason||null;
    current.evidenceSource=supervisionPath;
  }
}

fs.writeFileSync(companyPath,JSON.stringify(company,null,2)+'\n');
console.log('COMPANY_STATUS_SYNC=PASS');
console.log(`COMPANY_SUPERVISION_DATE=${company.supervision.dateKst||'unknown'}`);
console.log(`COMPANY_ACTIVE_DEVELOPMENT_RUN=${company.supervision.activeDevelopmentRunId||'none'}`);
console.log(`COMPANY_LIVE_ACTIVE=${company.supervision.liveStates.ACTIVE||0}`);
console.log(`COMPANY_LIVE_WAITING=${company.supervision.liveStates.WAITING||0}`);
console.log(`COMPANY_LIVE_BLOCKED=${company.supervision.liveStates.BLOCKED||0}`);
console.log(`COMPANY_LIVE_DONE=${company.supervision.liveStates.DONE||0}`);
console.log(`COMPANY_HOMEPAGE_STATUS=${company.operations?.homepage?.status||'unknown'}`);
console.log(`COMPANY_AUTONOMOUS_FOCUS=${focusedGameIds.join(',')||'none'}`);
console.log(`COMPANY_AUTONOMOUS_FOCUS_SLOTS=${focusedGames.length}/${targetSlots}`);
