import fs from 'node:fs';

function kstDate(value=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=t=>parts.find(x=>x.type===t)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function activeIncubator(state={}){
  return (state.candidates||[]).find(c=>['CONCEPT_CREATED','ARTBOOK_QUEUED','ARTBOOK_COMPLETE','PROTOTYPE_REGISTERED'].includes(c.status)&&c.prototypeDevComplete!==true)||null;
}
function createdToday(state,date){
  return (state.candidates||[]).some(c=>c.status!=='REDESIGN_REQUIRED'&&c.createdAt&&kstDate(c.createdAt)===date);
}
export function decidePortfolioContinuation({portfolio={},queueState={},incubator={},date=kstDate(),filesystem=fs}={}){
  if(portfolio.status!=='ACTIVE'||portfolio.paidApi!==false)return{action:'HOLD',reason:'PORTFOLIO_POLICY_BLOCK'};
  const maxDaily=Math.max(1,Math.min(24,Number(portfolio.maxAutonomousWorkItemsPerDay??8)||8));
  const attempts=(queueState.attempts||[]).filter(x=>x.date===date);
  if(attempts.length>=maxDaily)return{action:'STOP',reason:'DAILY_AUTONOMOUS_CAP_REACHED',date,attempts:attempts.length,maxDaily};
  const attempted=new Set(attempts.map(x=>x.gameId));
  const eligible=(portfolio.projects||[]).filter(p=>p.mode!=='HOLD'&&p.sourcePath&&filesystem.existsSync(p.sourcePath));
  const remaining=eligible.filter(p=>!attempted.has(p.id));
  if(remaining.length)return{action:'WAIT_GAME_QUEUE',reason:'GAME_WORK_REMAINS',date,remaining:remaining.map(x=>x.id),attempts:attempts.length,maxDaily};
  const active=activeIncubator(incubator);
  if(active)return{action:'WAIT_INCUBATOR',reason:'INCUBATOR_ALREADY_ACTIVE',date,candidateId:active.id,attempts:attempts.length,maxDaily};
  if(createdToday(incubator,date))return{action:'STOP',reason:'DAILY_NEW_CONCEPT_ALREADY_CREATED',date,attempts:attempts.length,maxDaily};
  return{action:'DISPATCH_INCUBATOR',reason:'GAME_QUEUE_EXHAUSTED_WITH_FREE_CAPACITY',date,attempts:attempts.length,maxDaily,remainingCapacity:maxDaily-attempts.length};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
  console.log(JSON.stringify(decidePortfolioContinuation({portfolio:read('autonomous-portfolio.json',{}),queueState:read('.autonomous/queue-state.json',{attempts:[]}),incubator:read('autonomous-incubator.json',{candidates:[]})}),null,2));
}
