// 파일명: tools/autonomous-work-planner.mjs
// 역할: 공개 건강도/아트북 근거와 포트폴리오 상태를 읽어 무료 개발 후보 작업을 고른다.
// 주의: public-game-health 점수는 게임 품질 점수가 아니라 실행/표시 건강도 근거로만 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { attemptedGameIds, attemptsForDate } from './autonomous-queue-state.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const writeJson=(file,value)=>{ensureDir(file);fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};

function kstDate(now=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const g=t=>p.find(x=>x.type===t)?.value||'';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function dayOrdinal(date){
  const [y,m,d]=date.split('-').map(Number);
  return Math.floor(Date.UTC(y,m-1,d)/86400000);
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
  const issues=Array.isArray(item.issues)?item.issues.filter(Boolean):[];
  const blocked=String(item.status??'').toLowerCase()==='critical'||issues.length>0||item.signals?.loadOk===false||item.signals?.reloadOk===false;
  return blocked?{status:item.status??'unknown',issues,healthReason:item.healthReason??null}:null;
}
function baseGoal(project,book){
  const hints=improvementHints(book);
  const focus=hints.length?hints.map(({role,improvement})=>`${role}: ${improvement}`).join(' / '):null;
  const mode=project.mode;
  const prefix=mode==='REDESIGN'
    ? '핵심 정체성을 다시 세우는 실험 후보를 만든다.'
    : mode==='EXPERIMENT_ONLY'
      ? '감사 전 안전한 실험 후보만 만들고 공개판/저장 의미/핵심 규칙은 승격하지 않는다.'
      : '현재 게임의 체감 품질을 의미 있게 개선하는 후보를 만든다.';
  return `${prefix}${focus?` 최신 아트북 보완점 우선: ${focus}.`:''} 조작 가독성·그래픽·모션·콘텐츠 중 근거가 가장 강한 1~2개를 개선한다. 저장키는 유지하고 전면 재작성은 피한다.`;
}

export function buildAutonomousWorkOrder({portfolio,artbooks,health,queueState={version:1,attempts:[]},date=kstDate(),filesystem=fs}={}){
  if(portfolio?.status!=='ACTIVE'||!Array.isArray(portfolio.projects))throw new Error('autonomous portfolio 비활성/오류');
  if(portfolio.paidApi!==false)throw new Error('무료정책 위반: paidApi');
  const maxDaily=Math.max(1,Math.min(24,Number(portfolio.maxAutonomousWorkItemsPerDay??8)||8));
  const attemptsToday=attemptsForDate(queueState,date);
  if(attemptsToday.length>=maxDaily){
    return {version:1,run:false,reason:'DAILY_AUTONOMOUS_CAP_REACHED',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  }
  const attempted=attemptedGameIds(queueState,date);
  const eligible=portfolio.projects.filter(project=>project.mode!=='HOLD'&&clean(project.sourcePath)&&filesystem.existsSync(project.sourcePath));
  if(!eligible.length)return {version:1,run:false,reason:'NO_ELIGIBLE_PROJECT',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  const remaining=eligible.filter(project=>!attempted.has(project.id));
  if(!remaining.length){
    return {version:1,run:false,reason:'NO_UNPROCESSED_WORK_TODAY',date,paidApi:false,attemptsToday:attemptsToday.length,maxDaily};
  }
  const incidentProjects=remaining.map(project=>({project,incident:runtimeIncident(health,project.slug)})).filter(x=>x.incident);
  let selected;
  let reason;
  let incident=null;
  if(incidentProjects.length){
    selected=incidentProjects.sort((a,b)=>(b.incident.issues.length-a.incident.issues.length)||a.project.id.localeCompare(b.project.id))[0].project;
    incident=runtimeIncident(health,selected.slug);
    reason='RUNTIME_INCIDENT_FIRST';
  }else{
    const ordered=[...remaining].sort((a,b)=>a.id.localeCompare(b.id));
    selected=ordered[dayOrdinal(date)%ordered.length];
    reason=attemptsToday.length?'CONTINUOUS_PORTFOLIO_NEXT':'DAILY_PORTFOLIO_ROTATION';
  }
  const book=latestArtbookFor(artbooks,selected.slug);
  const candidateId=`${selected.id}-${date.replaceAll('-','')}-${attemptsToday.length+1}`;
  return {
    version:1,
    run:true,
    date,
    selectedReason:reason,
    gameId:selected.id,
    gameSlug:selected.slug,
    gameName:selected.name,
    sourcePath:selected.sourcePath,
    profileStatus:selected.profileStatus,
    mode:selected.mode,
    goal:incident
      ? `실행/표시 건강도 사고를 우선 복구하는 개발 후보를 만든다. 근거: ${[incident.healthReason,...incident.issues].filter(Boolean).join(' / ')}. 공개 main은 건드리지 않고 저장키를 유지한다.`
      : baseGoal(selected,book),
    protectedValues:selected.protectedValues??[],
    candidateId,
    baselineBranch:portfolio.continuousDevelopmentBranch||'autonomous-dev',
    publicStableBranch:portfolio.publicStableBranch||'main',
    candidateBranchPrefix:portfolio.candidateBranchPrefix||'autonomous/candidate-',
    queue:{attemptsToday:attemptsToday.length,maxDaily,remainingBeforeSelection:remaining.length},
    budget:{
      cashKRW:0,
      paidApi:false,
      modelCalls:1,
      maxModelCalls:Number(portfolio.maxModelCallsPerRun??1),
      maxRunnerMinutes:Number(portfolio.maxRunnerMinutesPerRun??20),
      emergencyReserveUse:Boolean(incident),
      policy:'FREE_LIMIT_EQUALS_COMPANY_BUDGET'
    },
    evidence:{
      latestArtbookId:book?.id??null,
      latestArtbookProductionApproval:book?.productionApproval??null,
      improvementHints:improvementHints(book),
      runtimeIncident:incident,
      healthScoreUsedAsGameQuality:false
    }
  };
}

async function main(){
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||'.autonomous/work-order.json';
  const date=process.argv.find(x=>x.startsWith('--date='))?.slice('--date='.length)||kstDate();
  const portfolio=readJson('autonomous-portfolio.json');
  const artbooks=readJson('game-artbooks.json',{artbooks:[]});
  const health=readJson('public-game-health.json',{games:[]});
  const queueState=readJson('.autonomous/queue-state.json',{version:1,attempts:[]});
  const order=buildAutonomousWorkOrder({portfolio,artbooks,health,queueState,date});
  writeJson(output,order);
  console.log(JSON.stringify(order,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}

export { baseGoal, improvementHints, kstDate, latestArtbookFor, runtimeIncident };
