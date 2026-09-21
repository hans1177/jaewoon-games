import fs from 'node:fs';
import path from 'node:path';

const clean=v=>String(v??'').trim();
const upper=v=>clean(v).toUpperCase();
const safe=v=>clean(v).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'game';
const readJson=(file,fallback={})=>file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
function args(argv=process.argv.slice(2)){return Object.fromEntries(argv.filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));}
function lifecycle(game={}){return upper(game.lifecycleState||game?.canonical?.lifecycle?.state||'ACTIVE');}
function prodClass(game={}){return upper(game.productionClass||game?.canonical?.production?.class||'DESIGN_ONLY');}
function phase(game={}){
  const cls=prodClass(game),pub=game?.canonical?.publication?.roblox||{};
  if(cls==='RELEASE_CONFIRMED'||pub.currentReleaseClaim===true)return'POST_RELEASE';
  return'PRE_RELEASE';
}
function targetSurface(game={}){
  const pub=game?.canonical?.publication?.roblox||{};
  if(pub.currentReleaseClaim===true||prodClass(game)==='RELEASE_CONFIRMED')return'RELEASE_DISCOVERY_AND_RETENTION';
  return'STORE_POSITIONING_AND_LAUNCH_PREP';
}
function marketingFile(gameId=''){return `company-learning/marketing/${safe(gameId)}/latest.json`;}
function taskFor(game={},roadmap={},stamp=''){
  const id=clean(game.id||game.gameId),name=clean(game.name||game?.canonical?.identity?.name||id),p=phase(game),surface=targetSurface(game);
  const file=marketingFile(id);
  const web=clean(game.webPath||game?.canonical?.sources?.web?.path||'').replace(/^\//,'').replace(/\/$/,'');
  const contexts=['company-learning/platform-release-roadmap.json','game-catalog.json'];
  if(web)contexts.push(`${web}/index.html`);
  return{
    id:`marketing-${safe(id)}-${p.toLowerCase()}-v1`,
    status:'queued',
    priority:p==='POST_RELEASE'?'high':'normal',
    department:'planning-growth-marketing',
    taskType:'marketing',
    gameId:id,
    goal:[
      `Create the current non-financial growth/marketing execution package for ${name} (${id}).`,
      `Lifecycle phase: ${p}. Primary surface: ${surface}.`,
      'Use only current game facts and evidence. Separate observed facts from hypotheses.',
      'Produce usable title/short-description/store-message options, icon/thumbnail creative direction, screenshot/trailer shot list, organic discovery actions, creator/community outreach angles, own-portfolio cross-promotion hooks, activation/retention hypotheses, metrics and stop conditions.',
      'Do not invent released features, player counts, retention, revenue or popularity.',
      'Do not change game balance, economy or gameplay source.',
      'No paid spend, purchase, financial transaction, account login, social posting, or external irreversible action.',
      'Return the package in the assigned marketing JSON file. This is an execution artifact, not a policy document.'
    ].join(' '),
    responsibleFiles:[file],
    contextFiles:contexts,
    focusPatterns:{},
    acceptanceCriteria:[
      'artifact contains FACTS, HYPOTHESES, CREATIVE, ORGANIC_DISTRIBUTION, CROSS_PROMOTION, METRICS, STOP_CONDITIONS',
      'all claims about current game capability are grounded in supplied repository context',
      'no paid financial execution or owner approval gate is introduced',
      'package includes Primary AI + Vibe joint decision fields initially set to PENDING',
      'result becomes a Vibe learning candidate after verification'
    ],
    verificationCommands:[`node tools/company-growth-marketing-qa.mjs --file=${file} --game-id=${id}`],
    dependencies:[],
    retries:0,maxRetries:3,reservationId:null,reservedAt:null,candidateBranch:null,pullRequestUrl:null,lastOutcome:null,blocker:null,
    evidence:[
      'department:planning-growth-marketing',
      `phase:${p}`,
      `surface:${surface}`,
      'financial-execution:UNAVAILABLE',
      'decision-authority:PRIMARY_AI_AND_VIBE_JOINT',
      'learning-route:existing-vibe-learning-motor'
    ],
    supervisorReviewRequired:true,
    jointDecisionRequired:true,
    createdAt:stamp,updatedAt:stamp
  };
}
export function planMarketing({catalog={},systemQueue={},roadmap={},now=new Date()}={}){
  const stamp=now.toISOString(),tasks=[...(systemQueue.tasks||[])],added=[];
  const existing=new Map(tasks.map(x=>[clean(x.id),x]));
  for(const game of catalog.games||[]){
    const id=clean(game.id||game.gameId);if(!id)continue;
    if(!['ACTIVE','REBUILD'].includes(lifecycle(game)))continue;
    if(!['DEVELOPMENT_CONFIRMED','RELEASE_CONFIRMED'].includes(prodClass(game)))continue;
    const task=taskFor(game,roadmap,stamp),prior=existing.get(task.id);
    if(prior&&['queued','running','awaiting-supervisor'].includes(clean(prior.status)))continue;
    if(prior&&prior.status==='done'&&clean(prior.lastOutcome).includes('ACCEPT'))continue;
    if(prior){const at=tasks.findIndex(x=>x.id===task.id);tasks[at]={...task,retries:Number(prior.retries||0),createdAt:prior.createdAt||stamp,evidence:[...new Set([...(prior.evidence||[]),...task.evidence,'marketing-cycle-reopened'])]};}
    else tasks.push(task);
    added.push(task.id);
  }
  return{queue:{...systemQueue,version:Number(systemQueue.version||1),kind:'company-system-ai-queue',policy:'FULL_PROCESS_EXTERNAL_AI_VIBE_COLLABORATION_WITH_VIBE_CAUSAL_LEARNING',updatedAt:stamp,tasks},added};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const a=args(),catalog=readJson(a.catalog,{}),queue=readJson(a.queue,{tasks:[]}),roadmap=readJson(a.roadmap,{});
  const planned=planMarketing({catalog,systemQueue:queue,roadmap});
  writeJson(a.queue,planned.queue);
  if(a.output)writeJson(a.output,{version:1,generatedAt:new Date().toISOString(),added:planned.added});
  console.log(`MARKETING_TASKS_ADDED=${planned.added.length}`);
  console.log(`MARKETING_TASK_IDS=${planned.added.join(',')||'NONE'}`);
}
