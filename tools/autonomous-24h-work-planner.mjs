// 파일명: tools/autonomous-24h-work-planner.mjs
// 역할: 완성된 DESIGN_BASELINE 아트북을 가진 게임을 집중개발 슬롯 중심의 24시간 개발 루프에 공급한다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  buildAutonomousWorkOrder,
  buildDiagnosticsMap,
  kstDate,
  latestArtbookFor,
} from './autonomous-work-planner.mjs';
import { activeReservations, attemptsForDate } from './autonomous-queue-state.mjs';
import { lowImpactStreak, priorityPenaltyForGame } from './autonomous-play-impact.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const LEGACY_ALL_ACTIVE_REASON='ALL_ELIGIBLE_SOURCE_ROOTS_ACTIVE';

function catalogEntry(catalog,slug){return (catalog?.games??[]).find(game=>game.id===slug)||null;}
function isHold(project){return project?.mode==='HOLD'||/^HOLD/.test(clean(project?.profileStatus));}
function isRelease(project,catalog){
  const category=clean(catalogEntry(catalog,project?.slug)?.homepageCategory).toLowerCase();
  return category==='release-confirmed'||clean(project?.profileStatus)==='RELEASE_CONFIRMED'||project?.mode==='MAINTENANCE';
}
function isDevelopmentConfirmed(project,catalog){
  const category=clean(catalogEntry(catalog,project?.slug)?.homepageCategory).toLowerCase();
  return category==='development-confirmed'||clean(project?.profileStatus)==='DEVELOPMENT_CONFIRMED'||project?.mode==='IMPROVE';
}
function isCompletedDesignBaselineFor(artbooks,slug){
  const book=latestArtbookFor(artbooks,slug);
  const bookState=clean(book?.lifecycle?.state||book?.lifecycleState).toUpperCase();
  if(clean(book?.status).toLowerCase()==='completed-artbook'&&bookState==='DESIGN_BASELINE')return true;
  const rows=(artbooks?.dailySubmissions??[]).filter(row=>row.gameId===slug&&clean(row.status).toLowerCase()==='completed-artbook');
  rows.sort((a,b)=>String(b.date??'').localeCompare(String(a.date??'')));
  return clean(rows[0]?.lifecycleState).toUpperCase()==='DESIGN_BASELINE';
}
function focusTotal(project){
  const explicit=Number(project?.developmentFocus?.total);
  if(Number.isFinite(explicit))return explicit;
  const scores=project?.developmentFocus?.scores||{};
  return ['playability','distinctiveness','developmentEfficiency','scalability','lowBlockage'].reduce((sum,key)=>sum+(Number(scores[key])||0),0);
}
function unityPriority(project){return clean(project?.dedicatedDevelopmentLane).toUpperCase()==='UNITY_PRIMARY'||(project?.protectedValues||[]).includes('unity-primary');}
function focusPolicy(portfolio){return portfolio?.developmentFocusPolicy&&Number(portfolio.developmentFocusPolicy.maxFocusedGames)>0?portfolio.developmentFocusPolicy:null;}
function preferredRank(policy,project){
  const preferred=Array.isArray(policy?.preferredFocusedGameIds)?policy.preferredFocusedGameIds:[];
  const index=preferred.indexOf(project?.id);
  return index<0?Number.MAX_SAFE_INTEGER:index;
}
function sortFocusCandidates(policy){
  return (a,b)=>preferredRank(policy,a)-preferredRank(policy,b)||focusTotal(b)-focusTotal(a)||Number(unityPriority(b))-Number(unityPriority(a))||a.id.localeCompare(b.id);
}
function preparedDevelopmentCandidates({portfolio,catalog={games:[]},artbooks,filesystem=fs,minScore=0,excludeIds=new Set()}={}){
  const policy=focusPolicy(portfolio);
  return (portfolio?.projects??[]).filter(project=>{
    if(excludeIds.has(project.id)||isHold(project)||isRelease(project,catalog)||!isDevelopmentConfirmed(project,catalog))return false;
    if(!clean(project.sourcePath)||!filesystem.existsSync(project.sourcePath))return false;
    if(!isCompletedDesignBaselineFor(artbooks,project.slug))return false;
    return focusTotal(project)>=minScore;
  }).sort(sortFocusCandidates(policy));
}
export function rankDevelopmentFocus({portfolio,catalog={games:[]},artbooks,filesystem=fs}={}){
  const policy=focusPolicy(portfolio);
  if(!policy)return [];
  return preparedDevelopmentCandidates({portfolio,catalog,artbooks,filesystem,minScore:Number(policy.focusThreshold??8)});
}
function nextDevelopmentIds({portfolio,catalog,focusedIds}){
  const policy=focusPolicy(portfolio);if(!policy)return [];
  const threshold=Number(policy.nextDevelopmentThreshold??5);
  return (portfolio?.projects??[]).filter(project=>!focusedIds.has(project.id)&&!isHold(project)&&!isRelease(project,catalog)&&isDevelopmentConfirmed(project,catalog)&&focusTotal(project)>=threshold).sort(sortFocusCandidates(policy)).map(project=>project.id);
}
function defaultSourceReleased(row){
  const commit=clean(row?.sourceCommit),sourcePath=clean(row?.sourcePath);
  if(!commit||!sourcePath)return false;
  try{
    execFileSync('git',['diff','--quiet',commit,'origin/main','--',sourcePath],{stdio:'ignore'});
    return false;
  }catch(error){
    return error?.status===1;
  }
}

export function selectContinuousTarget({portfolio,artbooks,catalog={games:[]},queueState={version:2,attempts:[]},impactHistory={version:1,entries:[]},date=kstDate(),priorityGameId='',filesystem=fs,now=new Date(),isSourceReleased=()=>false}={}){
  const attempts=attemptsForDate(queueState,date);
  const counts=new Map();
  for(const row of attempts)counts.set(row.gameId,(counts.get(row.gameId)||0)+1);
  const eligible=(portfolio?.projects??[]).filter(project=>{
    if(isHold(project)||isRelease(project,catalog))return false;
    if(!clean(project.sourcePath)||!filesystem.existsSync(project.sourcePath))return false;
    return isCompletedDesignBaselineFor(artbooks,project.slug);
  });
  const policy=focusPolicy(portfolio);
  const rankedFocus=policy?rankDevelopmentFocus({portfolio,catalog,artbooks,filesystem}):eligible;
  const maxFocused=policy?Math.max(1,Number(policy.maxFocusedGames)||2):eligible.length;
  const focused=policy?rankedFocus.slice(0,maxFocused):eligible;
  if(policy?.fillVacantFocusedSlots===true&&focused.length<maxFocused){
    const fallback=preparedDevelopmentCandidates({
      portfolio,catalog,artbooks,filesystem,
      minScore:Number(policy.nextDevelopmentThreshold??5),
      excludeIds:new Set(focused.map(project=>project.id)),
    });
    focused.push(...fallback.slice(0,maxFocused-focused.length));
  }
  const focusedIds=new Set(focused.map(project=>project.id));
  const nextIds=nextDevelopmentIds({portfolio,catalog,focusedIds});
  const runnable=focused.filter(project=>clean(project.dedicatedDevelopmentLane).toUpperCase()!=='UNITY_PRIMARY');
  const active=activeReservations(queueState,{now,isSourceReleased});
  const activeGameIds=new Set(active.map(row=>row.gameId));
  const activeSourcePaths=new Set(active.map(row=>clean(row.sourcePath)).filter(Boolean));
  const available=runnable.filter(project=>!activeGameIds.has(project.id)&&!activeSourcePaths.has(clean(project.sourcePath)));
  const requested=clean(priorityGameId);
  const impactPriorityPenalties=Object.fromEntries(focused.map(project=>[project.id,{penalty:priorityPenaltyForGame(impactHistory,project.id),lowImpactStreak:lowImpactStreak(impactHistory,project.id)}]));
  const meta={focusedGameIds:[...focusedIds],nextDevelopmentGameIds:nextIds,activeGameIds:[...activeGameIds],activeSourcePaths:[...activeSourcePaths],focusPolicyEnabled:Boolean(policy),impactPriorityPenalties};
  if(requested){
    const exactFocus=runnable.find(project=>project.id===requested||project.slug===requested);
    if(exactFocus&&(activeGameIds.has(exactFocus.id)||activeSourcePaths.has(clean(exactFocus.sourcePath))))return {project:null,blockedByActive:true,explicitPriority:true,requestedGameId:exactFocus.id,...meta};
    const exact=available.find(project=>project.id===requested||project.slug===requested);
    if(exact)return {project:exact,attemptsToday:counts.get(exact.id)||0,explicitPriority:true,...meta};
  }
  available.sort((a,b)=>{
    const effectiveA=(counts.get(a.id)||0)+priorityPenaltyForGame(impactHistory,a.id);
    const effectiveB=(counts.get(b.id)||0)+priorityPenaltyForGame(impactHistory,b.id);
    return effectiveA-effectiveB||focusTotal(b)-focusTotal(a)||a.id.localeCompare(b.id);
  });
  const project=available[0]||null;
  if(project)return {project,attemptsToday:counts.get(project.id)||0,impactPriorityPenalty:priorityPenaltyForGame(impactHistory,project.id),lowImpactStreak:lowImpactStreak(impactHistory,project.id),explicitPriority:false,...meta};
  if(runnable.length&&active.length)return {project:null,blockedByActive:true,explicitPriority:false,...meta};
  return policy?{project:null,focusIdle:true,explicitPriority:false,...meta}:null;
}

export function build24hAutonomousWorkOrder({portfolio,artbooks,health,catalog={games:[]},diagnostics={},queueState={version:2,attempts:[]},impactHistory={version:1,entries:[]},date=kstDate(),filesystem=fs,priorityGameId='',now=new Date(),isSourceReleased=()=>false}={}){
  const active=activeReservations(queueState,{now,isSourceReleased});
  const activeGameIds=new Set(active.map(row=>row.gameId));
  const activeSourcePaths=new Set(active.map(row=>clean(row.sourcePath)).filter(Boolean));
  const urgent=buildAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId:''});
  if(urgent?.run&&urgent.selectedReason==='RUNTIME_INCIDENT_FIRST'&&!activeGameIds.has(urgent.gameId)&&!activeSourcePaths.has(clean(urgent.sourcePath))){
    const fast=portfolio?.developmentFocusPolicy?.fastLane||{};
    return {
      ...urgent,
      workLane:'FAST',
      departmentReviewRoles:Array.isArray(fast.reviewRoles)?fast.reviewRoles:['development','qa'],
      implementationRoles:Array.isArray(fast.implementationRoles)?fast.implementationRoles:['development'],
      planningFinalMode:'DETERMINISTIC_FAST',
      continuous24h:{enabled:true,mode:'FAST_RUNTIME_RECOVERY',sourceRootLock:'ACTIVE_RESERVATION_LEASE',activeGameIds:[...activeGameIds],recoveryWakeup:'HOURLY'},
    };
  }

  const selected=selectContinuousTarget({portfolio,artbooks,catalog,queueState,impactHistory,date,priorityGameId,filesystem,now,isSourceReleased});
  if(selected?.blockedByActive){
    const focusedMode=selected.focusPolicyEnabled===true;
    return {
      run:false,
      reason:focusedMode?'ALL_FOCUSED_SOURCE_ROOTS_ACTIVE':LEGACY_ALL_ACTIVE_REASON,
      date,
      continuous24h:{
        enabled:true,
        mode:focusedMode?'FOCUSED_GAME_FLOORS':'PARALLEL_GAME_FLOORS',
        maxFocusedGames:focusedMode?Number(portfolio?.developmentFocusPolicy?.maxFocusedGames||2):null,
        focusedGameIds:selected.focusedGameIds||[],
        nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],
        impactPriorityPenalties:selected.impactPriorityPenalties||{},
        sourceRootLock:'ACTIVE_RESERVATION_LEASE',
        activeGameIds:selected.activeGameIds||[],
        activeSourcePaths:selected.activeSourcePaths||[],
        recoveryWakeup:'HOURLY',
      },
    };
  }
  if(selected?.focusIdle){
    return {run:false,reason:'NO_FOCUSED_DEVELOPMENT_FLOOR_NOW',date,continuous24h:{enabled:true,mode:'FOCUSED_GAME_FLOORS',focusedGameIds:selected.focusedGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],impactPriorityPenalties:selected.impactPriorityPenalties||{},recoveryWakeup:'HOURLY'}};
  }
  if(!selected){
    const fallback=buildAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId});
    return {...fallback,workLane:fallback.run?'FULL':null,departmentReviewRoles:fallback.run?['planning','development','graphics','qa','balance']:[],implementationRoles:fallback.run?['development','graphics','qa','balance']:[],continuous24h:{enabled:true,mode:'RECOVERY_FALLBACK',dailyCap:null,sameGameDailyCap:null}};
  }
  const target=selected.project;
  const forcedProject={...target,profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE'};
  const games=[...(catalog?.games??[])];
  const index=games.findIndex(game=>game.id===target.slug);
  if(index>=0)games[index]={...games[index],homepageCategory:'development-confirmed'};
  else games.push({id:target.slug,homepageCategory:'development-confirmed'});
  const forcedPortfolio={...portfolio,projects:[forcedProject]};
  const order=buildAutonomousWorkOrder({portfolio:forcedPortfolio,artbooks,health,catalog:{...catalog,games},diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId:target.slug});
  if(!order.run)return order;
  const originalProfile={profileStatus:target.profileStatus,mode:target.mode,homepageCategory:catalogEntry(catalog,target.slug)?.homepageCategory??null};
  order.selectedReason=selected.explicitPriority?'FOCUSED_ARTBOOK_PRIORITY_HANDOFF':'FOCUSED_CONTINUOUS_DEVELOPMENT';
  order.workLane='FULL';
  order.departmentReviewRoles=['planning','development','graphics','qa','balance'];
  order.implementationRoles=['development','graphics','qa','balance'];
  order.planningFinalMode='AI_FULL';
  order.continuous24h={
    enabled:true,
    mode:'FOCUSED_ARTBOOK_DEPARTMENT_LOOP',
    maxFocusedGames:Number(portfolio?.developmentFocusPolicy?.maxFocusedGames||2),
    focusedGameIds:selected.focusedGameIds||[],
    nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],
    selection:'PREFERRED_READY_THEN_LOW_IMPACT_PENALTY_THEN_SCORE_THEN_LEAST_KST_ATTEMPTS',
    selectedGameAttemptsToday:selected.attemptsToday,
    impactPriorityPenalty:selected.impactPriorityPenalty||0,
    lowImpactStreak:selected.lowImpactStreak||0,
    impactPriorityPenalties:selected.impactPriorityPenalties||{},
    activeGameIds:selected.activeGameIds||[],
    sourceRootLock:'ACTIVE_RESERVATION_LEASE',
    departmentSequence:['planning','development','graphics','qa','balance','planning-final'],
    recoveryWakeup:'HOURLY',
  };
  order.queue={...(order.queue||{}),attemptsToday:attemptsForDate(queueState,date).length,maxDaily:null,remainingBeforeSelection:null};
  order.evidence={...(order.evidence||{}),continuous24hOriginalProfile:originalProfile,developmentFocus:{score:focusTotal(target),focusedGameIds:selected.focusedGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],impactPriorityPenalty:selected.impactPriorityPenalty||0,lowImpactStreak:selected.lowImpactStreak||0}};
  return order;
}

async function main(){
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||'.autonomous/work-order.json';
  const date=process.argv.find(x=>x.startsWith('--date='))?.slice('--date='.length)||kstDate();
  const priorityGameId=process.argv.find(x=>x.startsWith('--priority-game-id='))?.slice('--priority-game-id='.length)||clean(process.env.AUTONOMOUS_PRIORITY_GAME_ID);
  const portfolio=readJson('autonomous-portfolio.json');
  const artbooks=readJson('game-artbooks.json',{artbooks:[],dailySubmissions:[]});
  const health=readJson('public-game-health.json',{games:[]});
  const catalog=readJson('game-catalog.json',{games:[]});
  const queueState=readJson('.autonomous/queue-state.json',{version:2,attempts:[]});
  const impactHistory=readJson('company-learning/autonomous-impact-history.json',{version:1,entries:[]});
  if(portfolio?.status!=='ACTIVE')throw new Error('autonomous portfolio 비활성/오류');
  const diagnostics=buildDiagnosticsMap(portfolio);
  const order=build24hAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState,impactHistory,date,priorityGameId,isSourceReleased:defaultSourceReleased});
  writeJson(output,order);
  console.log(JSON.stringify(order,null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
