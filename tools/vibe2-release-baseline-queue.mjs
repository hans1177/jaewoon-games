import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createVibeContinuousQueue} from '../assets/vibe-continuous-queue.js';

const clean=v=>String(v??'').trim();
const posix=v=>clean(v).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const readJson=(file,fallback=null)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function arg(name){const p=`--${name}=`;return process.argv.slice(2).find(v=>v.startsWith(p))?.slice(p.length)??null;}
function latestJson(repoRoot,gameId,fileName){
  const root=path.join(repoRoot,'design',gameId);
  if(!fs.existsSync(root))return null;
  const dates=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d{4}-\d{2}-\d{2}$/.test(e.name)).map(e=>e.name).sort().reverse();
  for(const date of dates){
    const file=path.join(root,date,fileName);
    const data=readJson(file,null);
    if(data)return {file,posix(path.relative(repoRoot,file)),date,data};
  }
  return null;
}
function latestDevelopmentBaseline(repoRoot,gameId){
  const direct=latestJson(repoRoot,gameId,'design-development-baseline.json');
  if(direct?.data?.status==='DEVELOPMENT_BASELINE_READY'&&direct.data.content)return direct;
  const status=latestJson(repoRoot,gameId,'cycle-status.json');
  const gate=status?.data?.baselineGate;
  const e=gate?.evidence||{};
  if(gate?.policyDocument==='COMPANY_FLOW.md'&&gate?.state==='DEVELOPMENT_BASELINE_READY'&&gate?.ready===true&&e.webGameplay?.pass===true&&e.unityProject?.present===true&&e.unityTechnical?.pass===true){
    const revised=latestJson(repoRoot,gameId,'design-tech-revised.json')||latestJson(repoRoot,gameId,'design-revised.json');
    if(revised?.data?.content)return {file:revised.file,path:revised.path,date:revised.date,data:{status:'DEVELOPMENT_BASELINE_READY',content:revised.data.content}};
  }
  return null;
}
function currentTreeSha(repoRoot,sourceRoot){
  try{return clean(execFileSync('git',['rev-parse',`HEAD:${sourceRoot}`],{cwd:repoRoot,encoding:'utf8'}));}catch{return null;}
}
function compactBaseline(content){
  if(!content||typeof content!=='object')return '';
  const selected={
    identity:content.identity,
    playerFantasy:content.playerFantasy,
    coreLoop:content.coreLoop,
    signatureSystems:content.signatureSystems,
    progressionDirection:content.progressionDirection,
    mobileUx:content.mobileUx,
    technicalAssumptions:content.technicalAssumptions
  };
  const text=JSON.stringify(selected);
  return text.length>5500?text.slice(0,5500):text;
}
function activeForGame(queue,gameId,sourceTreeSha){
  return (queue.tasks||[]).some(task=>task.gameId===gameId&&['queued','running'].includes(clean(task.status).toLowerCase())&&task.evidence?.includes(`source-tree:${sourceTreeSha}`));
}

export function queueReleaseBaselineGap({catalogFile,queueFile,repoRoot}){
  const catalog=readJson(catalogFile,{games:[]});
  let queue=createVibeContinuousQueue(readJson(queueFile,{tasks:[]}));
  const planned=[];
  for(const game of catalog.games||[]){
    if(clean(game.productionClass)!=='RELEASE_CONFIRMED')continue;
    const sourceRoot=posix(game.unityProjectPath);
    if(!sourceRoot||!sourceRoot.startsWith('unity-games/')||!fs.existsSync(path.join(repoRoot,sourceRoot)))continue;
    const baseline=latestDevelopmentBaseline(repoRoot,game.id);
    if(!baseline)continue;
    const request=latestJson(repoRoot,game.id,'release-production-request.json');
    if(request&&request.data?.state&&request.data.state!=='BUILDING')continue;
    const sourceTreeSha=currentTreeSha(repoRoot,sourceRoot);
    if(!sourceTreeSha||activeForGame(queue,game.id,sourceTreeSha))continue;
    const taskId=`${game.id}-release-baseline-gap-${sourceTreeSha.slice(0,12)}`;
    if((queue.tasks||[]).some(task=>task.id===taskId))continue;
    const baselineCore=compactBaseline(baseline.data.content);
    const requestAction=clean(request?.data?.nextAction);
    const goal=[
      'RELEASE_CONFIRMED의 Vibe2 본개발 작업이다.',
      '아래 Development Baseline을 현재 Unity 소스와 비교해 아직 구현되지 않았거나 명백히 불완전한 핵심 동작 중 하나만 선택해 직접 구현한다.',
      '이미 충족된 기능을 다시 만들지 말고, Core Design Lock을 지키며 새 대형 기능·새 규칙·밸런스 변경을 발명하지 않는다.',
      '한 후보에서는 최대 4개 텍스트 소스 파일 안에서 완료 가능한 하나의 구현 갭만 처리한다.',
      requestAction?`현재 Release Gate 요청: ${requestAction}`:'',
      `Development Baseline 핵심: ${baselineCore}`
    ].filter(Boolean).join('\n');
    const task={
      id:taskId,gameId:game.id,target:'unity',department:'development',type:'implementation',goal,
      responsibleFiles:[],dependencies:[],priority:'high',releaseState:'release-confirmed',status:'queued',retries:0,maxRetries:2,
      ownerDirective:false,requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,
      sourceRoot,estimatedRisk:'high',speculativeEligible:true,
      releaseImplementationScope:'INCREMENTAL_BASELINE_GAP',releaseImplementationComplete:false,
      evidence:[
        'central-policy:COMPANY_FLOW.md',
        `development-baseline:${baseline.path||baseline.file}`,
        request?.path?`release-request:${request.path}`:'release-request:implicit-building',
        `source-root:${sourceRoot}`,
        `source-tree:${sourceTreeSha}`
      ]
    };
    queue=createVibeContinuousQueue({...queue,tasks:[...(queue.tasks||[]),task]});
    planned.push(task);
    break;
  }
  writeJson(queueFile,queue);
  return {planned:planned.length>0,count:planned.length,tasks:planned};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const repoRoot=path.resolve(arg('root')||process.cwd());
  const catalogFile=path.resolve(arg('catalog')||path.join(repoRoot,'game-catalog.json'));
  const queueFile=path.resolve(arg('queue')||'.vibe2/queue.json');
  const result=queueReleaseBaselineGap({catalogFile,queueFile,repoRoot});
  console.log(`VIBE2_RELEASE_BASELINE_GAP_PLAN=${result.planned?'YES':'NO'}`);
  console.log(`VIBE2_RELEASE_BASELINE_GAP_TASKS=${result.tasks.map(x=>x.id).join(',')||'NONE'}`);
}
