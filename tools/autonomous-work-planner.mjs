// 파일명: tools/autonomous-work-planner.mjs
// 역할: 게임 단계·공개 건강도·아트북·결정론적 진단 근거를 합쳐 가장 작은 무료 개발 작업을 고른다.
// 주의: public-game-health 점수는 게임 품질 점수가 아니라 실행/표시 건강도 근거로만 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { attemptedGameIds, attemptsForDate } from './autonomous-queue-state.mjs';
import { diagnoseGame, microTaskFromIssue, SEVERITY_SCORE } from './autonomous-diagnostics.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const writeJson=(file,value)=>{ensureDir(file);fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const issueText=issue=>{
  if(typeof issue==='string')return issue.trim();
  if(!issue||typeof issue!=='object')return clean(issue);
  return [issue.type,issue.message,issue.code].filter(Boolean).map(clean).filter(Boolean).join(': ');
};

function kstDate(now=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const g=t=>p.find(x=>x.type===t)?.value||'';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function latestArtbookFor(artbooks,slug){
  const rows=(artbooks?.artbooks??[]).filter(book=>book.gameId===slug);
  return rows.sort((a,b)=>String(b.createdAt??b.date??'').localeCompare(String(a.createdAt??a.date??''))||Number(b.edition??0)-Number(a.edition??0))[0]??null;
}
function improvementHints(book){
  const opinions=book?.departmentOpinions??{};
  const rows=[];
  for(const [role,opinion] of Object.entries(opinions)){
    const improvement=clean(opinion?.priorityImprovement);
    if(!improvement)continue;
    const stars=Number(opinion?.averageStars);
    rows.push({role,improvement,stars:Number.isFinite(stars)?stars:null});
  }
  rows.sort((a,b)=>(a.stars??5)-(b.stars??5));
  return rows.slice(0,2);
}
function runtimeIncident(health,slug){
  const item=(health?.games??[]).find(game=>game.gameId===slug);
  if(!item)return null;
  const issues=Array.isArray(item.issues)?item.issues.map(issueText).filter(Boolean):[];
  const blocked=String(item.status??'').toLowerCase()==='critical'||issues.length>0||item.signals?.loadOk===false||item.signals?.reloadOk===false;
  return blocked?{status:item.status??'unknown',issues,healthReason:item.healthReason??null}:null;
}
function catalogEntry(catalog,slug){return (catalog?.games??[]).find(game=>game.id===slug)||null;}
function isCompletedDesignBaseline(book){
  return clean(book?.status).toLowerCase()==='completed-artbook'&&clean(book?.lifecycle?.state).toUpperCase()==='DESIGN_BASELINE';
}
export function classifyProjectStage(project,catalog){
  const entry=catalogEntry(catalog,project.slug);
  const category=clean(entry?.homepageCategory).toLowerCase();
  if(project.mode==='HOLD'||/^HOLD/.test(clean(project.profileStatus)))return {id:'HOLD',rank:99,codeWork:false};
  if(category==='release-confirmed'||clean(project.profileStatus)==='RELEASE_CONFIRMED'||project.mode==='MAINTENANCE')return {id:'RELEASE_CONFIRMED',rank:1,codeWork:true};
  if(category==='development-confirmed'||clean(project.profileStatus)==='DEVELOPMENT_CONFIRMED'||project.mode==='IMPROVE')return {id:'DEVELOPMENT_CONFIRMED',rank:2,codeWork:true};
  if(project.mode==='EXPERIMENT_ONLY'||clean(project.profileStatus)==='NEEDS_AUDIT')return {id:'STRUCTURE_IMPROVEMENT',rank:3,codeWork:true};
  if(project.mode==='REDESIGN'||/REDESIGN|IDENTITY/.test(clean(project.profileStatus)))return {id:'PLANNING_IDENTITY_REQUIRED',rank:4,codeWork:false};
  return {id:'REVIEWING',rank:5,codeWork:true};
}
function baseGoal(project,book){
  const hints=improvementHints(book);
  if(hints.length)return `최신 아트북 보완점 중 가장 우선인 1개만 작은 코드 작업으로 처리한다. ${hints[0].role}: ${hints[0].improvement}. 저장키와 핵심 규칙은 유지하고 다른 기능은 건드리지 않는다.`;
  if(project.mode==='EXPERIMENT_ONLY')return '구조 위험 근거 1개만 골라 작은 실험 후보로 수정한다. 공개판/저장 의미/핵심 규칙은 바꾸지 않는다.';
  return '현재 게임의 사용자 체감 문제 1개만 작은 수정 단위로 처리한다. 저장키와 핵심 규칙을 유지하고 전면 재작성은 하지 않는다.';
}
function diagnosticSeverity(row){return SEVERITY_SCORE[row?.severity]||0;}
function diagnosticsFor(map,slug){return map?.[slug]||{issues:[],topIssue:null,counts:{}};}
function actionableForStage(stage,{incident,diagnostic,book,artbookHandoffReady=false}){
  if(stage.id==='RELEASE_CONFIRMED')return Boolean(incident||diagnostic?.topIssue);
  if(stage.id==='PLANNING_IDENTITY_REQUIRED'||stage.id==='HOLD')return false;
  return Boolean(artbookHandoffReady||incident||diagnostic?.topIssue||improvementHints(book).length);
}

export function buildAutonomousWorkOrder({portfolio,artbooks,health,catalog={games:[]},diagnostics={},queueState={version:1,attempts:[]},date=kstDate(),filesystem=fs,priorityGameId=''}={}){
  if(portfolio?.status!=='ACTIVE'||!Array.isArray(portfolio.projects))throw new Error('autonomous portfolio 비활성/오류');
  if(portfolio.paidApi!==false)throw new Error('무료정책 위반: paidApi');
  const maxDaily=Math.max(1,Math.min(24,Number(portfolio.maxAutonomousWorkItemsPerDay??8)||8));
  const attemptsToday=attemptsForDate(queueState,date);
  if(attemptsToday.length>=maxDaily)return {version:2,run:false,reason:'DAILY_AUTONOMOUS_CAP_REACHED',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  const attempted=attemptedGameIds(queueState,date);
  const eligible=portfolio.projects.filter(project=>clean(project.sourcePath)&&filesystem.existsSync(project.sourcePath)&&classifyProjectStage(project,catalog).id!=='HOLD');
  if(!eligible.length)return {version:2,run:false,reason:'NO_ELIGIBLE_PROJECT',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  const remaining=eligible.filter(project=>!attempted.has(project.id));
  if(!remaining.length)return {version:2,run:false,reason:'NO_UNPROCESSED_WORK_TODAY',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};

  const requestedPriority=clean(priorityGameId);
  const rows=remaining.map(project=>{
    const stage=classifyProjectStage(project,catalog),incident=runtimeIncident(health,project.slug),diagnostic=diagnosticsFor(diagnostics,project.slug),book=latestArtbookFor(artbooks,project.slug);
    const priorityMatch=Boolean(requestedPriority&&(requestedPriority===project.slug||requestedPriority===project.id));
    const artbookHandoffReady=priorityMatch&&stage.id==='DEVELOPMENT_CONFIRMED'&&isCompletedDesignBaseline(book);
    return {project,stage,incident,diagnostic,book,priorityMatch,artbookHandoffReady,actionable:actionableForStage(stage,{incident,diagnostic,book,artbookHandoffReady})};
  });
  const actionable=rows.filter(row=>row.actionable&&row.stage.codeWork);
  if(!actionable.length){
    const planning=rows.find(row=>row.stage.id==='PLANNING_IDENTITY_REQUIRED');
    return {version:2,run:false,reason:planning?'PLANNING_IDENTITY_REQUIRED':'NO_ACTIONABLE_DIAGNOSTIC',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily,planningGameId:planning?.project.id||null,priorityGameId:requestedPriority||null};
  }

  const releaseIncident=actionable.find(row=>row.stage.id==='RELEASE_CONFIRMED'&&row.incident);
  const artbookHandoff=actionable.find(row=>row.artbookHandoffReady);
  if(!releaseIncident&&!artbookHandoff){
    actionable.sort((a,b)=>a.stage.rank-b.stage.rank||Number(Boolean(b.incident))-Number(Boolean(a.incident))||diagnosticSeverity(b.diagnostic?.topIssue)-diagnosticSeverity(a.diagnostic?.topIssue)||a.project.id.localeCompare(b.project.id));
  }
  const selectedRow=releaseIncident||artbookHandoff||actionable[0],selected=selectedRow.project,incident=selectedRow.incident,diagnostic=selectedRow.diagnostic,book=selectedRow.book,stage=selectedRow.stage;
  const microTask=microTaskFromIssue(diagnostic?.topIssue);
  let reason='STAGE_PRIORITY';
  let goal=baseGoal(selected,book);
  if(incident){reason='RUNTIME_INCIDENT_FIRST';goal=`실행/표시 사고 1건만 복구하는 작은 후보를 만든다. 근거: ${[incident.healthReason,...incident.issues].filter(Boolean).join(' / ')}. 공개 main은 건드리지 않고 저장키를 유지한다.`;}
  else if(selectedRow.artbookHandoffReady){
    reason='ARTBOOK_COMPLETED_DEVELOPMENT_HANDOFF';
    const firstTask=microTask?.goal||baseGoal(selected,book);
    goal=`방금 완성된 최신 아트북 DESIGN_BASELINE을 현재 개발 설계도로 사용한다. 기술 구조 → 플레이어블 개발판 B로 이어지는 첫 작은 구현 작업 1개만 수행한다. ${firstTask} 아트북의 장르·핵심루프·스토리 큰 방향·저장 의미는 임의로 바꾸지 않는다.`;
  }else if(microTask){reason='DIAGNOSTIC_MICROTASK';goal=microTask.goal;}
  const repairMode=microTask?.repairMode==='RULE_PATCH'?'RULE_PATCH':'MODEL';
  const responsibilityFiles=Array.isArray(microTask?.files)&&microTask.files.length?microTask.files:(microTask?.file?[microTask.file]:[]);
  const configuredMax=Math.max(0,Math.min(2,Number(portfolio.maxModelCallsPerRun??2)||0));
  const modelCalls=repairMode==='RULE_PATCH'?0:Math.max(1,configuredMax);
  const candidateId=`${selected.id}-${date.replaceAll('-','')}-${attemptsToday.length+1}`;
  return {
    version:3,run:true,date,selectedReason:reason,
    gameId:selected.id,gameSlug:selected.slug,gameName:selected.name,sourcePath:selected.sourcePath,
    profileStatus:selected.profileStatus,mode:selected.mode,projectStage:stage.id,
    goal,microTask,repairMode,responsibilityFiles,diagnosticTopIssue:diagnostic?.topIssue||null,
    protectedValues:selected.protectedValues??[],candidateId,
    baselineBranch:portfolio.continuousDevelopmentBranch||'autonomous-dev',publicStableBranch:portfolio.publicStableBranch||'main',candidateBranchPrefix:portfolio.candidateBranchPrefix||'autonomous/candidate-',
    queue:{attemptsToday:attemptsToday.length,maxDaily,remainingBeforeSelection:remaining.length},
    budget:{cashKRW:0,paidApi:false,modelCalls,maxModelCalls:configuredMax,maxRunnerMinutes:Number(portfolio.maxRunnerMinutesPerRun??20),emergencyReserveUse:Boolean(incident),policy:'FREE_LIMIT_EQUALS_COMPANY_BUDGET'},
    evidence:{latestArtbookId:book?.id??null,latestArtbookProductionApproval:book?.productionApproval??null,improvementHints:improvementHints(book),runtimeIncident:incident,diagnostics:{filesScanned:diagnostic?.filesScanned??0,counts:diagnostic?.counts??{},topIssue:diagnostic?.topIssue??null},healthScoreUsedAsGameQuality:false,artbookDevelopmentHandoff:{requestedGameId:requestedPriority||null,matched:selectedRow.artbookHandoffReady,baselineState:book?.lifecycle?.state??null,nextStage:selectedRow.artbookHandoffReady?'technical-architecture/playable-draft':null}}
  };
}

function buildDiagnosticsMap(portfolio){
  const map={};
  for(const project of portfolio?.projects??[]){
    if(project.mode==='HOLD'||!clean(project.sourcePath)||!fs.existsSync(project.sourcePath))continue;
    try{map[project.slug]=diagnoseGame(project.sourcePath);}catch(error){map[project.slug]={issues:[],topIssue:null,counts:{},diagnosticError:error.message};}
  }
  return map;
}
async function main(){
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||'.autonomous/work-order.json';
  const date=process.argv.find(x=>x.startsWith('--date='))?.slice('--date='.length)||kstDate();
  const priorityGameId=process.argv.find(x=>x.startsWith('--priority-game-id='))?.slice('--priority-game-id='.length)||clean(process.env.AUTONOMOUS_PRIORITY_GAME_ID);
  const portfolio=readJson('autonomous-portfolio.json'),artbooks=readJson('game-artbooks.json',{artbooks:[]}),health=readJson('public-game-health.json',{games:[]}),catalog=readJson('game-catalog.json',{games:[]}),queueState=readJson('.autonomous/queue-state.json',{version:1,attempts:[]});
  const diagnostics=buildDiagnosticsMap(portfolio);
  const order=buildAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState,date,priorityGameId});
  writeJson(output,order);console.log(JSON.stringify(order,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});

export { baseGoal, improvementHints, issueText, kstDate, latestArtbookFor, runtimeIncident, buildDiagnosticsMap, isCompletedDesignBaseline };
