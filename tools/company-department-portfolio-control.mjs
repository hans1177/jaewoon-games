import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const uniq=xs=>[...new Set((xs||[]).map(clean).filter(Boolean))];
function args(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function life(game={}){return upper(game.lifecycleState||game?.canonical?.lifecycle?.state||'ACTIVE');}
function cls(game={}){return upper(game.productionClass||game?.canonical?.production?.class||'DESIGN_ONLY');}
function priorityRank(p){return({critical:4,high:3,normal:2,low:1})[clean(p).toLowerCase()]||2;}
function hardFailureText(item={}){return [item.blocker,item.lastOutcome,...(item.blockers||[]),...(item.evidence||[])].map(clean).join(' ').toUpperCase();}
function repeatedCount(text=''){const m=String(text).match(/(?:RETRY|REPEATED|GENERATION|ATTEMPT)[^0-9]{0,8}([0-9]+)/gi)||[];let n=0;for(const x of m){const k=Number((x.match(/([0-9]+)/)||[])[1]);if(Number.isFinite(k))n=Math.max(n,k);}return n;}
function coreStructural(text=''){return /CORE_FUN_WEAK|DESIGN_MISMATCH|STORY_INCOHERENT|CATEGORY_MISMATCH|REPETITIVE_CONTENT|GENERIC_TEMPLATE/.test(text);}
function criticalRuntime(text=''){return /FATAL_RUNTIME_BUG|MULTIPLAYER_MISSING|SAVE|RUNTIME|IMPLEMENTATION_INCOMPLETE|QA_EVIDENCE_MISSING|PLATFORM.*FAIL/.test(text);}
function presentationEvidence(gameId,marketing={},mainRoot='.'){
  const m=marketing[gameId]||null;
  return {
    marketing:m?{present:true,primaryAi:clean(m?.decision?.primaryAi),vibe:clean(m?.decision?.vibe),joint:clean(m?.decision?.joint)}:{present:false},
    graphics:fs.existsSync(path.join(mainRoot,'company-learning','marketing',gameId,'latest.json'))?{evidenceSurface:true}:{evidenceSurface:false}
  };
}
export function evaluatePortfolio({catalog={},developmentQueue={},vibeQueue={},marketingByGame={},previous={}}={}){
  const queueItems=new Map((developmentQueue.items||[]).map(x=>[clean(x.gameId),x]));
  const tasksByGame=new Map();
  for(const t of vibeQueue.tasks||[]){const id=clean(t.gameId);if(!id)continue;if(!tasksByGame.has(id))tasksByGame.set(id,[]);tasksByGame.get(id).push(t);}
  const decisions=[];
  for(const game of catalog.games||[]){
    const id=clean(game.id||game.gameId);if(!id||!['ACTIVE','REBUILD'].includes(life(game))||!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(cls(game)))continue;
    const item=queueItems.get(id)||{},tasks=tasksByGame.get(id)||[];
    const texts=[hardFailureText(item),...tasks.map(hardFailureText)].join(' ');
    const repeated=Math.max(repeatedCount(texts),...tasks.map(t=>Number(t.retries||0)),Number(item.retries||0));
    const structural=coreStructural(texts),critical=criticalRuntime(texts);
    const done=tasks.filter(t=>clean(t.status).toLowerCase()==='done').length;
    const failed=tasks.filter(t=>clean(t.status).toLowerCase()==='failed').length;
    const active=tasks.filter(t=>['queued','running'].includes(clean(t.status).toLowerCase())).length;
    const previousRow=(previous.decisions||[]).find(x=>x.gameId===id)||{};
    let decision='CONTINUE',reason='NORMAL_ACTIVE_DEVELOPMENT';
    if(structural&&repeated>=3){decision='REDESIGN';reason='REPEATED_STRUCTURAL_FAILURE_AFTER_REPAIR';}
    else if(critical||failed>0||repeated>=2){decision='FOCUSED_REPAIR';reason='CURRENT_CRITICAL_OR_REPEATED_CAUSAL_BLOCKER';}
    else if(cls(game)==='RELEASE_CONFIRMED'){decision='CONTINUE';reason='RELEASE_CONFIRMED_NO_CRITICAL_BLOCKER';}
    else if(done>0&&failed===0&&active>0){decision='ACCELERATE';reason='VERIFIED_PROGRESS_WITH_ACTIVE_RUNWAY';}
    if(previousRow.decision==='REDESIGN'&&structural&&repeated>=5){decision='PAUSE';reason='REPEATED_REDESIGN_WITHOUT_VERIFIED_PROGRESS';}
    if(previousRow.decision==='PAUSE'&&structural&&repeated>=7){decision='RETIRE_REVIEW';reason='REPEATED_STRUCTURAL_FAILURE_AFTER_PAUSE';}
    const marketing=marketingByGame[id]||null;
    decisions.push({
      gameId:id,decision,reason,productionClass:cls(game),lifecycleState:life(game),
      evidence:{
        planningGrowthMarketing:marketing?{packagePresent:true,joint:clean(marketing?.decision?.joint)||'UNVERIFIED'}:{packagePresent:false,state:'UNVERIFIED_NOT_NEGATIVE'},
        development:{activeTasks:active,doneTasks:done,failedTasks:failed,repeatedFailureSignal:repeated},
        qa:{criticalRuntimeOrGateBlocker:critical},
        balance:{structuralCoreFailure:structural},
        graphicsAudio:{state:'USE_EXISTING_PRESENTATION_AND_AUDIO_PASS_EVIDENCE'}
      },
      jointAuthority:'PRIMARY_AI_AND_VIBE',
      ownerApprovalGate:false
    });
  }
  return decisions;
}
export function applyPortfolioDecisions(vibeQueue={},decisions=[]){
  const byId=new Map(decisions.map(x=>[x.gameId,x]));
  const tasks=(vibeQueue.tasks||[]).map(task=>{
    const d=byId.get(clean(task.gameId));if(!d)return task;
    const status=clean(task.status).toLowerCase();
    const evidence=uniq([...(task.evidence||[]),`portfolio-decision:${d.decision}`,`portfolio-reason:${d.reason}`]);
    if(d.decision==='ACCELERATE'){
      return {...task,priority:'critical',portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
    }
    if(d.decision==='FOCUSED_REPAIR'){
      return {...task,priority:priorityRank(task.priority)<3?'high':task.priority,portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
    }
    if(d.decision==='REDESIGN'){
      if(status==='queued'&&clean(task.department).toLowerCase()==='development'&&clean(task.type).toLowerCase()==='implementation')
        return {...task,status:'cancelled',blocker:'portfolio-redesign-required',lastOutcome:'REDIRECTED_TO_REDESIGN',portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
      if(status==='running')return {...task,blocker:'portfolio-redesign-stop-requested',portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
      return {...task,portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
    }
    if(['PAUSE','RETIRE_REVIEW'].includes(d.decision)){
      if(status==='queued')return {...task,status:'cancelled',blocker:`portfolio-${d.decision.toLowerCase()}`,lastOutcome:`PORTFOLIO_${d.decision}`,portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
      if(status==='running')return {...task,blocker:`portfolio-stop-requested:${d.decision}`,portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
      return {...task,portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
    }
    const resumable=status==='cancelled'&&/^portfolio-(?:pause|retire_review|redesign)/i.test(clean(task.blocker));
    if(resumable)return {...task,status:'queued',blocker:null,lastOutcome:'PORTFOLIO_AUTO_RESUMED',portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
    return {...task,portfolioDecision:d.decision,portfolioReason:d.reason,evidence};
  });
  return {...vibeQueue,tasks};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args(),catalog=readJson(a.catalog,{}),developmentQueue=readJson(a['development-queue'],{}),vibeQueue=readJson(a.queue,{tasks:[]}),previous=readJson(a.previous,{decisions:[]});
  const marketingByGame={};
  const marketingRoot=clean(a.marketing);
  if(marketingRoot&&fs.existsSync(marketingRoot))for(const name of fs.readdirSync(marketingRoot)){const file=path.join(marketingRoot,name,'latest.json');if(fs.existsSync(file)){const x=readJson(file,null);if(x?.gameId)marketingByGame[clean(x.gameId)]=x;}}
  const decisions=evaluatePortfolio({catalog,developmentQueue,vibeQueue,marketingByGame,previous});
  const next=applyPortfolioDecisions(vibeQueue,decisions);
  writeJson(a.queue,next);
  if(a.output)writeJson(a.output,{version:1,authority:'PRIMARY_AI_AND_VIBE_JOINT',generatedAt:new Date().toISOString(),decisions});
  const counts=decisions.reduce((m,x)=>(m[x.decision]=(m[x.decision]||0)+1,m),{});
  console.log('PORTFOLIO_CONTROL_COUNTS='+JSON.stringify(counts));
  console.log('PORTFOLIO_CONTROL_GAMES='+decisions.length);
}
