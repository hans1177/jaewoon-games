// 파일명: tools/autonomous-24h-work-planner.mjs
// 역할: RELEASE_CONFIRMED 선택 플랫폼 집중개발과 선택적 Web 게임플레이 테스트베드를 24시간 루프에 공급한다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  buildAutonomousWorkOrder,
  buildDiagnosticsMap,
  kstDate,
  latestArtbookFor,
  runtimeIncident,
} from './autonomous-work-planner.mjs';
import { activeReservations, attemptsForDate } from './autonomous-queue-state.mjs';
import { lowImpactStreak, priorityPenaltyForGame } from './autonomous-play-impact.mjs';
import {PRODUCTION_CLASSES,productionClassOf} from './production-classification.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const ALL_ACTIVE_REASON='ALL_ELIGIBLE_SOURCE_ROOTS_ACTIVE';
const PLATFORM_PRIORITY=['ROBLOX','UNITY','FORTNITE_UEFN'];

function catalogEntry(catalog,slug){return (catalog?.games??[]).find(game=>game.id===slug)||null;}
function isHold(project){return project?.mode==='HOLD'||/^HOLD/.test(clean(project?.profileStatus));}
function classOf(project,catalog){return productionClassOf(project,catalogEntry(catalog,project?.slug)||{});}
function isRelease(project,catalog){return classOf(project,catalog)===PRODUCTION_CLASSES.RELEASE_CONFIRMED||project?.mode==='MAINTENANCE';}
function isDevelopmentConfirmed(project,catalog){
  return classOf(project,catalog)===PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED||['IMPROVE','OPTIONAL_WEB_GAMEPLAY_TESTBED','TARGET_PLATFORM_DEVELOPMENT'].includes(clean(project?.mode).toUpperCase());
}
function normalizePlatform(value){
  const raw=clean(value).toUpperCase().replaceAll('-','_');
  if(raw==='ROBLOX')return 'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return 'UNITY';
  if(['FORTNITE_UEFN','UEFN','FORTNITE'].includes(raw))return 'FORTNITE_UEFN';
  return '';
}
function selectedPlatform(project,catalog){
  const game=catalogEntry(catalog,project?.slug)||{};
  for(const candidate of [project?.selectedPlatform,project?.targetPlatform,game.selectedPlatform,game.targetPlatform,project?.targetEngine,game.preferredPlatform,game.productionTarget]){
    const platform=normalizePlatform(candidate);if(platform)return platform;
  }
  return '';
}
function platformRank(platform){const index=PLATFORM_PRIORITY.indexOf(platform);return index<0?PLATFORM_PRIORITY.length:index;}
function targetSourcePath(project,catalog,filesystem=fs){
  const game=catalogEntry(catalog,project?.slug)||{},platform=selectedPlatform(project,catalog);
  const candidates=[project?.productionSourcePath,game.targetPlatformProjectPath];
  if(platform==='UNITY')candidates.push(game.unityProjectPath,`unity-games/${project?.slug||''}`);
  if(platform==='ROBLOX')candidates.push(game.robloxProjectPath,`roblox-games/${project?.slug||''}`);
  if(platform==='FORTNITE_UEFN')candidates.push(game.uefnProjectPath,game.fortniteProjectPath);
  return [...new Set(candidates.map(clean).filter(Boolean))].find(candidate=>filesystem.existsSync(candidate))||'';
}
function targetPlatformReady(project,catalog,filesystem=fs){
  const platform=selectedPlatform(project,catalog);if(!platform)return false;
  if(platform==='UNITY'&&project?.unityProjectReady===true)return true;
  return Boolean(targetSourcePath(project,catalog,filesystem));
}
function isCompletedDesignBaselineFor(artbooks,slug){
  const book=latestArtbookFor(artbooks,slug);
  const bookState=clean(book?.lifecycle?.state||book?.lifecycleState).toUpperCase();
  if(clean(book?.status).toLowerCase()==='completed-artbook'&&bookState==='DESIGN_BASELINE')return true;
  const rows=(artbooks?.dailySubmissions??[]).filter(row=>row.gameId===slug&&clean(row.status).toLowerCase()==='completed-artbook');
  rows.sort((a,b)=>String(b.date??'').localeCompare(String(a.date??'')));
  return clean(rows[0]?.lifecycleState).toUpperCase()==='DESIGN_BASELINE';
}
function isCompletedProductionBaselineFor(artbooks,slug){
  const allowed=new Set(['','DESIGN_BASELINE','DEVELOPMENT_BASELINE','RELEASE_BASELINE']);
  const book=latestArtbookFor(artbooks,slug);
  const state=clean(book?.lifecycle?.state||book?.lifecycleState).toUpperCase();
  if(clean(book?.status).toLowerCase()==='completed-artbook'&&allowed.has(state))return true;
  const rows=(artbooks?.dailySubmissions??[]).filter(row=>row.gameId===slug&&clean(row.status).toLowerCase()==='completed-artbook');
  rows.sort((a,b)=>String(b.date??'').localeCompare(String(a.date??'')));
  const rowState=clean(rows[0]?.lifecycleState).toUpperCase();
  return Boolean(rows[0]&&allowed.has(rowState));
}
function focusTotal(project){
  const explicit=Number(project?.developmentFocus?.total);
  if(Number.isFinite(explicit))return explicit;
  const scores=project?.developmentFocus?.scores||{};
  return ['playability','distinctiveness','developmentEfficiency','scalability','lowBlockage'].reduce((sum,key)=>sum+(Number(scores[key])||0),0);
}
function focusPolicy(portfolio){return portfolio?.developmentFocusPolicy&&Number(portfolio.developmentFocusPolicy.maxFocusedGames)>0?portfolio.developmentFocusPolicy:null;}
function focusStage(policy){return clean(policy?.focusStage||'RELEASE_CONFIRMED').toUpperCase();}
function sortFocusCandidates(policy,catalog,filesystem){
  const releaseFocus=focusStage(policy)==='RELEASE_CONFIRMED';
  return (a,b)=>{
    if(releaseFocus){
      const ready=Number(targetPlatformReady(b,catalog,filesystem))-Number(targetPlatformReady(a,catalog,filesystem));
      if(ready)return ready;
      const priority=platformRank(selectedPlatform(a,catalog))-platformRank(selectedPlatform(b,catalog));
      if(priority)return priority;
    }
    return focusTotal(b)-focusTotal(a)||a.id.localeCompare(b.id);
  };
}
function isFocusCandidate(project,catalog,policy){
  return focusStage(policy)==='RELEASE_CONFIRMED'?isRelease(project,catalog):(!isRelease(project,catalog)&&isDevelopmentConfirmed(project,catalog));
}
function preparedFocusCandidates({portfolio,catalog={games:[]},artbooks,filesystem=fs,minScore=0,excludeIds=new Set()}={}){
  const policy=focusPolicy(portfolio),releaseFocus=focusStage(policy)==='RELEASE_CONFIRMED';
  return (portfolio?.projects??[]).filter(project=>{
    if(excludeIds.has(project.id)||isHold(project)||!isFocusCandidate(project,catalog,policy))return false;
    if(releaseFocus){
      if(!isCompletedProductionBaselineFor(artbooks,project.slug))return false;
    }else{
      if(!clean(project.sourcePath)||!filesystem.existsSync(project.sourcePath)||!isCompletedDesignBaselineFor(artbooks,project.slug))return false;
    }
    return focusTotal(project)>=minScore;
  }).sort(sortFocusCandidates(policy,catalog,filesystem));
}
function preparedOptionalWebTestbedCandidates({portfolio,catalog={games:[]},artbooks,filesystem=fs,excludeIds=new Set()}={}){
  const policy=focusPolicy(portfolio),threshold=Number(policy?.nextDevelopmentThreshold??0);
  return (portfolio?.projects??[]).filter(project=>{
    if(excludeIds.has(project.id)||isHold(project)||classOf(project,catalog)!==PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED||isRelease(project,catalog)||!isDevelopmentConfirmed(project,catalog))return false;
    if(!clean(project.sourcePath)||!filesystem.existsSync(project.sourcePath)||!isCompletedDesignBaselineFor(artbooks,project.slug))return false;
    return focusTotal(project)>=threshold;
  }).sort(sortFocusCandidates(policy,catalog,filesystem));
}
export function rankDevelopmentFocus({portfolio,catalog={games:[]},artbooks,filesystem=fs}={}){
  const policy=focusPolicy(portfolio);if(!policy)return [];
  return preparedFocusCandidates({portfolio,catalog,artbooks,filesystem,minScore:Number(policy.focusThreshold??0)});
}
function nextDevelopmentIds({portfolio,catalog,artbooks,focusedIds,filesystem=fs}){
  const policy=focusPolicy(portfolio);if(!policy)return [];
  if(focusStage(policy)==='RELEASE_CONFIRMED')return preparedOptionalWebTestbedCandidates({portfolio,catalog,artbooks,filesystem,excludeIds:focusedIds}).map(project=>project.id);
  const threshold=Number(policy.nextDevelopmentThreshold??5);
  return (portfolio?.projects??[]).filter(project=>!focusedIds.has(project.id)&&!isHold(project)&&!isRelease(project,catalog)&&isDevelopmentConfirmed(project,catalog)&&focusTotal(project)>=threshold).sort(sortFocusCandidates(policy,catalog,filesystem)).map(project=>project.id);
}
function nextFocusIds({portfolio,catalog,artbooks,focusedIds,filesystem=fs}){
  const policy=focusPolicy(portfolio);if(!policy)return [];
  return preparedFocusCandidates({portfolio,catalog,artbooks,filesystem,minScore:0,excludeIds:focusedIds}).map(project=>project.id);
}
function defaultSourceReleased(row){
  const commit=clean(row?.sourceCommit),sourcePath=clean(row?.sourcePath);
  if(!commit||!sourcePath)return false;
  try{execFileSync('git',['diff','--quiet',commit,'origin/main','--',sourcePath],{stdio:'ignore'});return false;}catch(error){return error?.status===1;}
}
function scopeRuntimeEntryFallback(order,filesystem=fs){
  if(!order?.run||order.selectedReason!=='RUNTIME_INCIDENT_FIRST')return order;
  if(Array.isArray(order.responsibilityFiles)&&order.responsibilityFiles.length)return order;
  if(order.diagnosticTopIssue)return order;
  const incident=order?.evidence?.runtimeIncident||{};
  const incidentText=[incident.healthReason,...(Array.isArray(incident.issues)?incident.issues:[])].map(clean).join(' ').toLowerCase();
  if(!/(?:same-origin-resource-failure|requestfailed|404|err_aborted)/.test(incidentText))return order;
  const sourcePath=clean(order.sourcePath),file='index.html';
  if(!sourcePath||!filesystem.existsSync(path.join(sourcePath,file)))return order;
  const goal=`${file}에서 health가 보고한 same-origin runtime 사고 1건만 복구한다. 게임 본체·저장키·밸런스는 변경하지 않는다.`;
  const diagnosticTopIssue={type:'HEALTH_RUNTIME_ENTRYPOINT_FALLBACK',severity:'high',file,message:'runtime 사고는 확인됐지만 정적 진단 책임 파일이 없어 공개 진입점 1파일로 범위를 제한함',relatedFiles:[file],microTask:goal};
  const microTask={type:diagnosticTopIssue.type,severity:'high',file,files:[file],line:null,needle:null,goal,repairMode:'MODEL',autoPatch:null};
  return {...order,microTask,responsibilityFiles:[file],diagnosticTopIssue,evidence:{...(order.evidence||{}),runtimeFallbackScope:{used:true,file,reason:'SAME_ORIGIN_RUNTIME_WITHOUT_DIAGNOSTIC_SCOPE'}}};
}

export function selectContinuousTarget({portfolio,artbooks,catalog={games:[]},queueState={version:2,attempts:[]},impactHistory={version:1,entries:[]},date=kstDate(),priorityGameId='',filesystem=fs,now=new Date(),isSourceReleased=()=>false}={}){
  const attempts=attemptsForDate(queueState,date),counts=new Map();
  for(const row of attempts)counts.set(row.gameId,(counts.get(row.gameId)||0)+1);
  const policy=focusPolicy(portfolio),releaseFocus=focusStage(policy)==='RELEASE_CONFIRMED';
  const allEligible=(portfolio?.projects??[]).filter(project=>!isHold(project)&&!isRelease(project,catalog)&&clean(project.sourcePath)&&filesystem.existsSync(project.sourcePath)&&isCompletedDesignBaselineFor(artbooks,project.slug));
  const eligible=policy?preparedFocusCandidates({portfolio,catalog,artbooks,filesystem,minScore:0}):allEligible;
  const rankedFocus=policy?rankDevelopmentFocus({portfolio,catalog,artbooks,filesystem}):eligible;
  const rankedDeepFocus=releaseFocus?rankedFocus.filter(project=>targetPlatformReady(project,catalog,filesystem)):rankedFocus;
  const maxFocused=policy?Math.max(1,Number(policy.maxFocusedGames)||1):eligible.length;
  const focused=policy?rankedDeepFocus.slice(0,maxFocused):eligible;
  if(policy?.fillVacantFocusedSlots===true&&focused.length<maxFocused){
    const fallbackCandidates=preparedFocusCandidates({portfolio,catalog,artbooks,filesystem,minScore:releaseFocus?0:Number(policy.nextDevelopmentThreshold??5),excludeIds:new Set(focused.map(project=>project.id))});
    const fallback=releaseFocus?fallbackCandidates.filter(project=>targetPlatformReady(project,catalog,filesystem)):fallbackCandidates;
    focused.push(...fallback.slice(0,maxFocused-focused.length));
  }
  const focusedIds=new Set(focused.map(project=>project.id));
  const nextIds=nextDevelopmentIds({portfolio,catalog,artbooks,focusedIds,filesystem});
  const nextFocus=nextFocusIds({portfolio,catalog,artbooks,focusedIds,filesystem});
  const focusRunnable=releaseFocus?[]:focused;
  const optionalWebRunnable=releaseFocus&&policy?.optionalWebGameplayTestbedAllowedAlongsideReleaseFocus!==false?preparedOptionalWebTestbedCandidates({portfolio,catalog,artbooks,filesystem}):[];
  const runnable=releaseFocus?optionalWebRunnable:focusRunnable;
  const active=activeReservations(queueState,{now,isSourceReleased});
  const activeGameIds=new Set(active.map(row=>row.gameId)),activeSourcePaths=new Set(active.map(row=>clean(row.sourcePath)).filter(Boolean));
  const available=runnable.filter(project=>!activeGameIds.has(project.id)&&!activeSourcePaths.has(clean(project.sourcePath)));
  const requested=clean(priorityGameId);
  const tracked=[...new Map([...focused,...runnable].map(project=>[project.id,project])).values()];
  const impactPriorityPenalties=Object.fromEntries(tracked.map(project=>[project.id,{penalty:priorityPenaltyForGame(impactHistory,project.id),lowImpactStreak:lowImpactStreak(impactHistory,project.id)}]));
  const focusedPlatforms=Object.fromEntries(focused.map(project=>[project.id,selectedPlatform(project,catalog)||null]));
  const meta={focusedGameIds:[...focusedIds],focusedPlatforms,nextFocusGameIds:nextFocus,nextDevelopmentGameIds:nextIds,activeGameIds:[...activeGameIds],activeSourcePaths:[...activeSourcePaths],focusPolicyEnabled:Boolean(policy),focusStage:focusStage(policy),impactPriorityPenalties};
  if(requested){
    const releaseProject=(portfolio?.projects??[]).find(project=>(project.id===requested||project.slug===requested)&&isRelease(project,catalog));
    if(releaseFocus&&releaseProject&&focusedIds.has(releaseProject.id)&&targetPlatformReady(releaseProject,catalog,filesystem))return {project:null,dedicatedFocus:true,selectedPlatform:selectedPlatform(releaseProject,catalog),explicitPriority:true,requestedGameId:releaseProject.id,...meta};
    const exactRunnable=runnable.find(project=>project.id===requested||project.slug===requested);
    if(exactRunnable&&(activeGameIds.has(exactRunnable.id)||activeSourcePaths.has(clean(exactRunnable.sourcePath))))return {project:null,blockedByActive:true,explicitPriority:true,requestedGameId:exactRunnable.id,...meta};
    const exact=available.find(project=>project.id===requested||project.slug===requested);
    if(exact)return {project:exact,projectLane:releaseFocus?'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED':'FOCUSED_DEVELOPMENT',attemptsToday:counts.get(exact.id)||0,impactPriorityPenalty:priorityPenaltyForGame(impactHistory,exact.id),lowImpactStreak:lowImpactStreak(impactHistory,exact.id),explicitPriority:true,...meta};
  }
  available.sort((a,b)=>{
    const effectiveA=(counts.get(a.id)||0)+priorityPenaltyForGame(impactHistory,a.id),effectiveB=(counts.get(b.id)||0)+priorityPenaltyForGame(impactHistory,b.id);
    return effectiveA-effectiveB||focusTotal(b)-focusTotal(a)||a.id.localeCompare(b.id);
  });
  const project=available[0]||null;
  if(project)return {project,projectLane:releaseFocus?'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED':'FOCUSED_DEVELOPMENT',attemptsToday:counts.get(project.id)||0,impactPriorityPenalty:priorityPenaltyForGame(impactHistory,project.id),lowImpactStreak:lowImpactStreak(impactHistory,project.id),explicitPriority:false,...meta};
  if(runnable.length&&active.length)return {project:null,blockedByActive:true,explicitPriority:false,...meta};
  return policy?{project:null,focusIdle:true,explicitPriority:false,...meta}:null;
}

export function build24hAutonomousWorkOrder({portfolio,artbooks,health,catalog={games:[]},diagnostics={},queueState={version:2,attempts:[]},impactHistory={version:1,entries:[]},date=kstDate(),filesystem=fs,priorityGameId='',now=new Date(),isSourceReleased=()=>false}={}){
  const active=activeReservations(queueState,{now,isSourceReleased});
  const activeGameIds=new Set(active.map(row=>row.gameId)),activeSourcePaths=new Set(active.map(row=>clean(row.sourcePath)).filter(Boolean));
  const urgentProjects=(portfolio?.projects??[]).filter(project=>!activeGameIds.has(project.id)&&!activeSourcePaths.has(clean(project.sourcePath))&&Boolean(runtimeIncident(health,project.slug)));
  const urgentPortfolio={...portfolio,projects:urgentProjects};
  const urgentBase=urgentProjects.length?buildAutonomousWorkOrder({portfolio:urgentPortfolio,artbooks,health,catalog,diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId:''}):{run:false};
  const urgent=scopeRuntimeEntryFallback(urgentBase,filesystem);
  const classPolicyEnabled=Boolean(portfolio?.productionClassPolicy),urgentProject=(portfolio?.projects??[]).find(project=>project.id===urgent?.gameId),urgentClass=urgentProject?classOf(urgentProject,catalog):null;
  const urgentClassAllowed=!classPolicyEnabled||Boolean(urgentClass&&urgentClass!==PRODUCTION_CLASSES.DESIGN_ONLY);
  if(urgent?.run&&urgent.selectedReason==='RUNTIME_INCIDENT_FIRST'&&urgentClassAllowed&&!activeGameIds.has(urgent.gameId)&&!activeSourcePaths.has(clean(urgent.sourcePath))){
    const fast=portfolio?.developmentFocusPolicy?.fastLane||{};
    return {...urgent,workLane:'FAST',departmentReviewRoles:Array.isArray(fast.reviewRoles)?fast.reviewRoles:['development','qa'],implementationRoles:Array.isArray(fast.implementationRoles)?fast.implementationRoles:['development'],planningFinalMode:'DETERMINISTIC_FAST',continuous24h:{enabled:true,mode:'FAST_RUNTIME_RECOVERY',productionClass:urgentClass,sourceRootLock:'ACTIVE_RESERVATION_LEASE',activeGameIds:[...activeGameIds],recoveryWakeup:'HOURLY'}};
  }

  const selected=selectContinuousTarget({portfolio,artbooks,catalog,queueState,impactHistory,date,priorityGameId,filesystem,now,isSourceReleased});
  if(selected?.dedicatedFocus)return {run:false,reason:'RELEASE_CONFIRMED_TARGET_PLATFORM_FOCUS_HANDOFF',date,requestedGameId:selected.requestedGameId,selectedPlatform:selected.selectedPlatform||selected.focusedPlatforms?.[selected.requestedGameId]||null,continuous24h:{enabled:true,mode:'RELEASE_CONFIRMED_TARGET_PLATFORM_FOCUS_EXTERNAL_LANE',maxFocusedGames:Number(portfolio?.developmentFocusPolicy?.maxFocusedGames||1),focusedGameIds:selected.focusedGameIds||[],focusedPlatforms:selected.focusedPlatforms||{},nextFocusGameIds:selected.nextFocusGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],impactPriorityPenalties:selected.impactPriorityPenalties||{},recoveryWakeup:'HOURLY'}};
  if(selected?.blockedByActive){
    const focusedMode=selected.focusPolicyEnabled===true,releaseFocus=selected.focusStage==='RELEASE_CONFIRMED';
    return {run:false,reason:releaseFocus?'ALL_OPTIONAL_WEB_TESTBED_SOURCE_ROOTS_ACTIVE':(focusedMode?'ALL_FOCUSED_SOURCE_ROOTS_ACTIVE':ALL_ACTIVE_REASON),date,continuous24h:{enabled:true,mode:releaseFocus?'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED':(focusedMode?'FOCUSED_GAME_FLOORS':'PARALLEL_GAME_FLOORS'),maxFocusedGames:focusedMode?Number(portfolio?.developmentFocusPolicy?.maxFocusedGames||1):null,focusedGameIds:selected.focusedGameIds||[],focusedPlatforms:selected.focusedPlatforms||{},nextFocusGameIds:selected.nextFocusGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],impactPriorityPenalties:selected.impactPriorityPenalties||{},sourceRootLock:'ACTIVE_RESERVATION_LEASE',activeGameIds:selected.activeGameIds||[],activeSourcePaths:selected.activeSourcePaths||[],recoveryWakeup:'HOURLY'}};
  }
  if(selected?.focusIdle){
    const releaseFocus=selected.focusStage==='RELEASE_CONFIRMED';
    return {run:false,reason:releaseFocus?'NO_OPTIONAL_WEB_GAMEPLAY_TESTBED_NOW':'NO_FOCUSED_DEVELOPMENT_FLOOR_NOW',date,continuous24h:{enabled:true,mode:releaseFocus?'RELEASE_CONFIRMED_TARGET_PLATFORM_FOCUS_PLUS_OPTIONAL_WEB_TESTBED':'FOCUSED_GAME_FLOORS',focusedGameIds:selected.focusedGameIds||[],focusedPlatforms:selected.focusedPlatforms||{},nextFocusGameIds:selected.nextFocusGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],impactPriorityPenalties:selected.impactPriorityPenalties||{},recoveryWakeup:'HOURLY'}};
  }
  if(!selected){
    const fallback=buildAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId});
    const fallbackProject=(portfolio?.projects??[]).find(project=>project.id===fallback?.gameId);
    if(classPolicyEnabled&&fallbackProject&&classOf(fallbackProject,catalog)===PRODUCTION_CLASSES.DESIGN_ONLY)return {run:false,reason:'DESIGN_ONLY',date,gameId:fallbackProject.id,productionClass:PRODUCTION_CLASSES.DESIGN_ONLY,continuous24h:{enabled:true,mode:'DESIGN_ONLY_ARTBOOK'}};
    return {...fallback,workLane:fallback.run?'FULL':null,departmentReviewRoles:fallback.run?['planning','development','graphics','qa','balance']:[],implementationRoles:fallback.run?['development','graphics','qa','balance']:[],continuous24h:{enabled:true,mode:'RECOVERY_FALLBACK',dailyCap:null,sameGameDailyCap:null}};
  }
  const target=selected.project,optionalWebTestbed=selected.projectLane==='DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED';
  const forcedProject={...target,productionClass:PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED,profileStatus:'DEVELOPMENT_CONFIRMED',mode:optionalWebTestbed?'OPTIONAL_WEB_GAMEPLAY_TESTBED':'IMPROVE'};
  const games=[...(catalog?.games??[])],index=games.findIndex(game=>game.id===target.slug);
  if(index>=0)games[index]={...games[index],productionClass:PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED,homepageCategory:'development-confirmed'};else games.push({id:target.slug,productionClass:PRODUCTION_CLASSES.DEVELOPMENT_CONFIRMED,homepageCategory:'development-confirmed'});
  const order=buildAutonomousWorkOrder({portfolio:{...portfolio,projects:[forcedProject]},artbooks,health,catalog:{...catalog,games},diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId:target.slug});
  if(!order.run)return order;
  const originalProfile={productionClass:classOf(target,catalog),profileStatus:target.profileStatus,mode:target.mode,selectedPlatform:selectedPlatform(target,catalog)||null,homepageCategory:catalogEntry(catalog,target.slug)?.homepageCategory??null};
  if(optionalWebTestbed){
    order.selectedReason='DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED';
    order.goal=`[OPTIONAL_WEB_GAMEPLAY_TESTBED] Web은 선택사항 게임플레이 테스트베드다. 핵심 루프가 실제로 플레이되는 가장 작은 검증만 만들고 모바일 입력·저장 의미·현재 정체성을 유지한다. Web 결과는 선택 플랫폼 기술·게임플레이 검증을 대체하거나 플랫폼 선택을 강제하지 않는다. ${order.goal}`.slice(0,2400);
  }else order.selectedReason=selected.explicitPriority?'FOCUSED_ARTBOOK_PRIORITY_HANDOFF':'FOCUSED_CONTINUOUS_DEVELOPMENT';
  order.workLane='FULL';order.departmentReviewRoles=['planning','development','graphics','qa','balance'];order.implementationRoles=['development','graphics','qa','balance'];order.planningFinalMode='AI_FULL';
  order.continuous24h={enabled:true,mode:optionalWebTestbed?'DEVELOPMENT_CONFIRMED_OPTIONAL_WEB_TESTBED':'FOCUSED_ARTBOOK_DEPARTMENT_LOOP',maxFocusedGames:Number(portfolio?.developmentFocusPolicy?.maxFocusedGames||1),focusedGameIds:selected.focusedGameIds||[],focusedPlatforms:selected.focusedPlatforms||{},nextFocusGameIds:selected.nextFocusGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],selection:optionalWebTestbed?'AUTO_OPTIONAL_WEB_TESTBED_LOW_IMPACT_PENALTY_THEN_SCORE_THEN_LEAST_KST_ATTEMPTS':'AUTO_SELECTED_PLATFORM_READY_THEN_SCORE',selectedGameAttemptsToday:selected.attemptsToday,impactPriorityPenalty:selected.impactPriorityPenalty||0,lowImpactStreak:selected.lowImpactStreak||0,impactPriorityPenalties:selected.impactPriorityPenalties||{},activeGameIds:selected.activeGameIds||[],sourceRootLock:'ACTIVE_RESERVATION_LEASE',departmentSequence:['planning','development','graphics','qa','balance','planning-final'],recoveryWakeup:'HOURLY'};
  order.queue={...(order.queue||{}),attemptsToday:attemptsForDate(queueState,date).length,maxDaily:null,remainingBeforeSelection:null};
  order.evidence={...(order.evidence||{}),continuous24hOriginalProfile:originalProfile,developmentFocus:{score:focusTotal(target),focusedGameIds:selected.focusedGameIds||[],focusedPlatforms:selected.focusedPlatforms||{},nextFocusGameIds:selected.nextFocusGameIds||[],nextDevelopmentGameIds:selected.nextDevelopmentGameIds||[],optionalWebTestbed,autoRotate:true,impactPriorityPenalty:selected.impactPriorityPenalty||0,lowImpactStreak:selected.lowImpactStreak||0}};
  return order;
}

async function main(){
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||'.autonomous/work-order.json';
  const date=process.argv.find(x=>x.startsWith('--date='))?.slice('--date='.length)||kstDate();
  const priorityGameId=process.argv.find(x=>x.startsWith('--priority-game-id='))?.slice('--priority-game-id='.length)||clean(process.env.AUTONOMOUS_PRIORITY_GAME_ID);
  const portfolio=readJson('autonomous-portfolio.json'),artbooks=readJson('game-artbooks.json',{artbooks:[],dailySubmissions:[]}),health=readJson('public-game-health.json',{games:[]}),catalog=readJson('game-catalog.json',{games:[]}),queueState=readJson('.autonomous/queue-state.json',{version:2,attempts:[]}),impactHistory=readJson('company-learning/autonomous-impact-history.json',{version:1,entries:[]});
  if(portfolio?.status!=='ACTIVE')throw new Error('autonomous portfolio 비활성/오류');
  const diagnostics=buildDiagnosticsMap(portfolio,catalog);
  const order=build24hAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState,impactHistory,date,priorityGameId,isSourceReleased:defaultSourceReleased});
  writeJson(output,order);console.log(JSON.stringify(order,null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href)main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
