// 파일명: tools/autonomous-24h-work-planner.mjs
// 역할: 완성된 DESIGN_BASELINE 아트북을 가진 게임을 24시간 부서 개발 루프에 계속 공급한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildAutonomousWorkOrder,
  buildDiagnosticsMap,
  isCompletedDesignBaseline,
  kstDate,
  latestArtbookFor,
} from './autonomous-work-planner.mjs';
import { attemptsForDate } from './autonomous-queue-state.mjs';

const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const clean=v=>String(v??'').trim();
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};

function catalogEntry(catalog,slug){return (catalog?.games??[]).find(game=>game.id===slug)||null;}
function isHold(project){return project?.mode==='HOLD'||/^HOLD/.test(clean(project?.profileStatus));}
function isRelease(project,catalog){
  const category=clean(catalogEntry(catalog,project?.slug)?.homepageCategory).toLowerCase();
  return category==='release-confirmed'||clean(project?.profileStatus)==='RELEASE_CONFIRMED'||project?.mode==='MAINTENANCE';
}

export function selectContinuousTarget({portfolio,artbooks,catalog={games:[]},queueState={version:1,attempts:[]},date=kstDate(),priorityGameId='',filesystem=fs}={}){
  const attempts=attemptsForDate(queueState,date);
  const counts=new Map();
  for(const row of attempts)counts.set(row.gameId,(counts.get(row.gameId)||0)+1);
  const eligible=(portfolio?.projects??[]).filter(project=>{
    if(isHold(project)||isRelease(project,catalog))return false;
    if(!clean(project.sourcePath)||!filesystem.existsSync(project.sourcePath))return false;
    const book=latestArtbookFor(artbooks,project.slug);
    return isCompletedDesignBaseline(book);
  });
  const requested=clean(priorityGameId);
  if(requested){
    const exact=eligible.find(project=>project.id===requested||project.slug===requested);
    if(exact)return {project:exact,attemptsToday:counts.get(exact.id)||0,explicitPriority:true};
  }
  eligible.sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0)||a.id.localeCompare(b.id));
  const project=eligible[0]||null;
  return project?{project,attemptsToday:counts.get(project.id)||0,explicitPriority:false}:null;
}

export function build24hAutonomousWorkOrder({portfolio,artbooks,health,catalog={games:[]},diagnostics={},queueState={version:1,attempts:[]},date=kstDate(),filesystem=fs,priorityGameId=''}={}){
  const selected=selectContinuousTarget({portfolio,artbooks,catalog,queueState,date,priorityGameId,filesystem});
  if(!selected){
    const fallback=buildAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState:{version:1,attempts:[]},date,filesystem,priorityGameId});
    return {...fallback,continuous24h:{enabled:true,mode:'RECOVERY_FALLBACK',dailyCap:null,sameGameDailyCap:null}};
  }
  const target=selected.project;
  const forcedProject={...target,profileStatus:'DEVELOPMENT_CONFIRMED',mode:'IMPROVE'};
  const games=[...(catalog?.games??[])];
  const index=games.findIndex(game=>game.id===target.slug);
  if(index>=0)games[index]={...games[index],homepageCategory:'development-confirmed'};
  else games.push({id:target.slug,homepageCategory:'development-confirmed'});
  const forcedPortfolio={...portfolio,projects:[forcedProject]};
  const order=buildAutonomousWorkOrder({
    portfolio:forcedPortfolio,
    artbooks,
    health,
    catalog:{...catalog,games},
    diagnostics,
    queueState:{version:1,attempts:[]},
    date,
    filesystem,
    priorityGameId:target.slug,
  });
  if(!order.run)return order;
  const originalProfile={profileStatus:target.profileStatus,mode:target.mode,homepageCategory:catalogEntry(catalog,target.slug)?.homepageCategory??null};
  order.selectedReason=selected.explicitPriority?'ARTBOOK_24H_PRIORITY_HANDOFF':'ARTBOOK_24H_CONTINUOUS_FLOOR';
  order.continuous24h={
    enabled:true,
    mode:'ARTBOOK_DEPARTMENT_LOOP',
    dailyCap:null,
    sameGameDailyCap:null,
    selection:'LEAST_KST_ATTEMPTS_FIRST',
    selectedGameAttemptsToday:selected.attemptsToday,
    departmentSequence:['planning','development','graphics','qa','balance','planning-final'],
    recoveryWakeup:'HOURLY',
  };
  order.queue={...(order.queue||{}),attemptsToday:attemptsForDate(queueState,date).length,maxDaily:null,remainingBeforeSelection:null};
  order.evidence={...(order.evidence||{}),continuous24hOriginalProfile:originalProfile};
  return order;
}

async function main(){
  const output=process.argv.find(x=>x.startsWith('--output='))?.slice('--output='.length)||'.autonomous/work-order.json';
  const date=process.argv.find(x=>x.startsWith('--date='))?.slice('--date='.length)||kstDate();
  const priorityGameId=process.argv.find(x=>x.startsWith('--priority-game-id='))?.slice('--priority-game-id='.length)||clean(process.env.AUTONOMOUS_PRIORITY_GAME_ID);
  const portfolio=readJson('autonomous-portfolio.json');
  const artbooks=readJson('game-artbooks.json',{artbooks:[]});
  const health=readJson('public-game-health.json',{games:[]});
  const catalog=readJson('game-catalog.json',{games:[]});
  const queueState=readJson('.autonomous/queue-state.json',{version:1,attempts:[]});
  if(portfolio?.status!=='ACTIVE')throw new Error('autonomous portfolio 비활성/오류');
  const diagnostics=buildDiagnosticsMap(portfolio);
  const order=build24hAutonomousWorkOrder({portfolio,artbooks,health,catalog,diagnostics,queueState,date,priorityGameId});
  writeJson(output,order);
  console.log(JSON.stringify(order,null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
