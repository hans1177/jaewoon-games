// 파일명: tools/web-vibe-worker.mjs
// WEB_VIBE_1 웹 전용 작업: 기존 큐·모델·검증·PR 경로 유지, 로블록스 개발 금지.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertWebVibeQueue,assertWebVibeTask,WEB_VIBE_CONTROL_BRANCH} from './web-vibe-organization.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='hans1177/jaewoon-games';
const clean=v=>String(v??'').trim();
const MODEL='qwen2.5-coder:3b';
const OLLAMA_URL='http://127.0.0.1:11435/api/chat';
function fail(message){throw new Error(message);}
function run(binary,args,{cwd=ROOT,timeout=120000,env={}}={}){
  return execFileSync(binary,args,{cwd,encoding:'utf8',timeout,maxBuffer:4*1024*1024,
    windowsHide:true,env:{...process.env,...env},stdio:['ignore','pipe','pipe']}).trim();
}
function options(argv){const out={};for(const part of argv){
  if(part==='--check'||part==='--apply'||part==='--pr'||part==='--all')out[part.slice(2)]=true;
  else if(part.startsWith('--task='))out.task=part.slice(7);
  else if(part.startsWith('--files='))out.files=part.slice(8);
  else fail('WEB_VIBE_UNKNOWN_ARGUMENT');
}if(out.all&&out.files!==undefined)fail('WEB_VIBE_SCOPE_CONFLICT');return out;}
export function assertWebVibeWorkerEnvironment({token='',endpoint=OLLAMA_URL,model=MODEL}={}){
  if(!clean(token)||clean(token).length<12)fail('WEB_VIBE_DEDICATED_TOKEN_REQUIRED');
  if(endpoint!==OLLAMA_URL||model!==MODEL)fail('WEB_VIBE_DEDICATED_MODEL_ENDPOINT_REQUIRED');
  return {endpoint,model,organization:'WEB',sharedNativeCredentialAllowed:false};
}
export function chooseWebVibeTask(queue,taskId){
  const data=assertWebVibeQueue(queue),task=data.tasks.find(item=>item.id===taskId);
  if(!task||!['queued','blocked'].includes(task.status))fail('WEB_VIBE_TASK_NOT_QUEUED');
  return assertWebVibeTask(task);
}
export function safeWebVibeReplacement(original,response,{relative='index.html'}={}){
  let raw=clean(response).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let value;try{value=JSON.parse(raw);}catch{fail('WEB_VIBE_MODEL_JSON_INVALID');}
  if(!value||typeof value.oldText!=='string'||typeof value.newText!=='string')fail('WEB_VIBE_MODEL_REPLACEMENT_INVALID');
  const a=value.oldText,b=value.newText;
  if(a.length<8||a.length>2500||b.length<1||b.length>4200||
     a===b||!original.includes(a)||original.indexOf(a)!==original.lastIndexOf(a)||
     /(?:child_process|process\.env|eval\s*\(|new Function\s*\(|javascript:|gh\s+api|git\s+push)/i.test(b))
    fail('WEB_VIBE_MODEL_REPLACEMENT_UNSAFE_OR_NONUNIQUE');
  const updated=original.replace(a,b);
  if(updated.length<original.length*.85||updated.length>original.length*1.15)fail('WEB_VIBE_SOURCE_DELTA_OUT_OF_RANGE');
  if(/\.html?$/i.test(relative)&&(!/<html[\s>]/i.test(updated)||!/<\/html\s*>/i.test(updated)))fail('WEB_VIBE_HTML_STRUCTURE_CHANGED');
  if(/\.json$/i.test(relative)){try{JSON.parse(updated);}catch{fail('WEB_VIBE_JSON_STRUCTURE_INVALID');}}
  if(/\.svg$/i.test(relative)&&(!/<svg[\s>]/i.test(updated)||!/<\/svg\s*>/i.test(updated)))fail('WEB_VIBE_SVG_STRUCTURE_INVALID');
  // An unrequested localStorage key migration can erase user saves.
  const keys=text=>[...text.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\s*\(\s*(['"`])([^'"`]+)\1/g)].map(x=>x[2]).sort();
  if(JSON.stringify(keys(original))!==JSON.stringify(keys(updated)))fail('WEB_VIBE_SAVE_KEY_CHANGED');
  return {updated,oldText:a,newText:b,reason:clean(value.reason).slice(0,280)};
}
// 유틸: 같은 게임의 실제 텍스트 책임 파일만 범위로 선택한다. 수량 제한 없음.
export function resolveWebVibeSources(gameId,{repoRoot=ROOT,files='index.html'}={}){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(gameId))fail('WEB_VIBE_GAME_ID_INVALID');
  const catalog=JSON.parse(fs.readFileSync(path.join(repoRoot,'game-catalog.json'),'utf8'));
  const game=(catalog.games||[]).find(row=>row.id===gameId);
  if(clean(game?.webPath).replace(/^\/+|\/+$/g,'')!=='web-games/'+gameId)fail('WEB_VIBE_CATALOG_NOT_APPROVED');
  const repo=fs.realpathSync(repoRoot),base=fs.realpathSync(path.join(repo,'web-games'));
  const gameRoot=path.join(base,gameId);
  if(base!==path.join(repo,'web-games')||fs.realpathSync(gameRoot)!==gameRoot)fail('WEB_VIBE_SOURCE_OUTSIDE_WEB_GAME');
  const allowed=/^(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+\.(?:html?|css|js|mjs|cjs|json|svg)$/i;
  const parts=(Array.isArray(files)?files:[files]).flatMap(raw=>{
    if(typeof raw!=='string')fail('WEB_VIBE_INVALID_FILES_INPUT');
    return raw.split(/[;,\n]+/).map(clean).filter(Boolean);
  });
  if(!parts.length)fail('WEB_VIBE_FILES_REQUIRED');
  const selected=new Set();
  function add(relative){
    if(!allowed.test(relative)||relative.split('/').some(x=>x==='..'||x==='.')||relative.startsWith('/'))fail('WEB_VIBE_SOURCE_SCOPE_INVALID');
    const absolute=path.resolve(gameRoot,relative);
    if(!absolute.startsWith(gameRoot+path.sep))fail('WEB_VIBE_SOURCE_OUTSIDE_WEB_GAME');
    let cursor=gameRoot;
    for(const segment of relative.split('/')){
      cursor=path.join(cursor,segment);
      if(fs.lstatSync(cursor).isSymbolicLink())fail('WEB_VIBE_SOURCE_OUTSIDE_WEB_GAME');
    }
    if(fs.realpathSync(absolute)!==absolute||!fs.statSync(absolute).isFile())fail('WEB_VIBE_SOURCE_OUTSIDE_WEB_GAME');
    selected.add(relative);
  }
  function scan(folder){
    for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(entry.isSymbolicLink()||['.git','node_modules','dist','build','.cache','coverage'].includes(entry.name))continue;
      const full=path.join(folder,entry.name);
      if(entry.isDirectory())scan(full);
      else if(entry.isFile()){
        const relative=path.relative(gameRoot,full).split(path.sep).join('/');
        if(allowed.test(relative))add(relative);
      }
    }
  }
  for(const raw of parts){
    if(raw==='*'||raw.toLowerCase()==='all')scan(gameRoot);
    else add(raw.startsWith('web-games/'+gameId+'/')?raw.slice(('web-games/'+gameId+'/').length):raw);
  }
  if(!selected.size)fail('WEB_VIBE_NO_ELIGIBLE_SOURCES');
  return [...selected].sort().map(relative=>{
    const file=path.join(gameRoot,relative),original=fs.readFileSync(file,'utf8');
    if(original.length>350000||original.length<8)fail('WEB_VIBE_SOURCE_SIZE_OUT_OF_SCOPE');
    return {file,relative:'web-games/'+gameId+'/'+relative,original};
  });
}
function remoteQueue(token){
  const apiPath='repos/'+REPO+'/contents/.web-vibe/queue.json?ref='+WEB_VIBE_CONTROL_BRANCH;
  const data=JSON.parse(run('gh',['api',apiPath],{env:{GH_TOKEN:token}}));
  if(data.encoding!=='base64'||typeof data.content!=='string')fail('WEB_VIBE_REMOTE_QUEUE_CONTENT_INVALID');
  return {queue:assertWebVibeQueue(JSON.parse(Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8'))),sha:data.sha};
}
function verifiedLocalMain(){
  if(run('git',['branch','--show-current'])!=='main')fail('WEB_VIBE_LOCAL_MAIN_REQUIRED');
  if(run('git',['status','--porcelain']))fail('WEB_VIBE_LOCAL_UNCOMMITTED_CHANGES');
  const origin=run('git',['remote','get-url','origin']);
  // The WEB worker must not fall back to a native team's SSH key.
  if(!/^https:\/\/github\.com\/hans1177\/jaewoon-games(?:\.git)?$/i.test(origin))
    fail('WEB_VIBE_UNTRUSTED_REPOSITORY');
  run('git',['fetch','--quiet','origin','main']);
  if(run('git',['rev-parse','HEAD'])!==run('git',['rev-parse','origin/main']))
    fail('WEB_VIBE_MAIN_MUST_BE_FAST_FORWARDED_FIRST');
}
async function propose(task,source,fetchImpl=fetch,previousVerified=[]){
  const excerpt=source.original.slice(0,13500);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),95000);
  try{
    const response=await fetchImpl(OLLAMA_URL,{method:'POST',redirect:'error',
      headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({model:MODEL,stream:false,format:'json',options:{temperature:0,num_ctx:8192},
        messages:[
          {role:'system',content:'You are the independent WEB-only coding assistant. Inspect this specific web game file. If no change needed, respond JSON with skip:true and reason; otherwise return one unique bounded oldText/newText replacement for this file. Respond JSON with oldText,newText,reason, or skip:true. Never modify saves, security, deployment, tokens, or unrelated functionality. Do not use commands or tools.'},
          {role:'user',content:'Game '+task.gameId+'; file: '+source.relative+'; owner request: '+task.goal.slice(0,2000)+
            '\nPrior same-game independently merged owner patches (context only; recheck current source):\n'+
            previousVerified.map(row=>row.id+': '+clean(row.goal).slice(0,300)).join('\n').slice(0,1300)+
            '\nContinue from current game source and preserve existing mechanics/saves. Do not reset prior build-up or invent verified outcomes.'+
            '\nExisting source excerpt:\n'+excerpt}
        ]})});
    if(!response.ok)fail('WEB_VIBE_LOCAL_MODEL_HTTP_'+response.status);
    const data=await response.json();
    const answer=clean(data.message?.content||'');
    let value;try{value=JSON.parse(answer);}catch{fail('WEB_VIBE_MODEL_JSON_INVALID');}
    if(value?.skip===true&&typeof value.reason==='string')return null;
    return safeWebVibeReplacement(source.original,answer,{relative:source.relative});
  }finally{clearTimeout(timeout);}
}
// QA: 영향받은 JS 구문, 기존 WEB 큐·정책 검증만 재실행한다.
function localQa(changed){
  for(const source of changed){
    const content=fs.readFileSync(source.file,'utf8');
    if(/\.html?$/i.test(source.relative)&&!/<\/html\s*>/i.test(content))fail('WEB_VIBE_QA_HTML_INVALID');
    if(/\.(?:mjs|cjs|js)$/i.test(source.relative))run('node',['--check',source.file],{timeout:45000});
  }
  run('node',['--test','qa/web-vibe-worker.test.mjs','qa/web-vibe-organization.test.mjs','qa/pwa-command-vibe2-task.test.mjs'],{timeout:180000});
}
function createPr(task,changed,token){
  const branch='web-vibe/'+task.gameId+'-'+Date.now();
  run('git',['switch','-c',branch]);
  for(const {source,edit} of changed)fs.writeFileSync(source.file,edit.updated,'utf8');
  localQa(changed.map(row=>row.source));
  const expected=changed.map(row=>row.source.relative).sort();
  run('git',['add','--',...expected]);
  const staged=run('git',['diff','--cached','--name-only']).split(/\r?\n/).filter(Boolean).sort();
  if(!staged.length||JSON.stringify(staged)!==JSON.stringify(expected))fail('WEB_VIBE_UNEXPECTED_CHANGED_FILE');
  run('git',['commit','-m','fix(web): dedicated Web Vibe candidate for '+task.gameId]);
  // Drop all preconfigured Git credential helpers. Only the dedicated WEB token
  // is available to the fixed GitHub CLI helper for this scoped PR push.
  run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential',
    'push','-u','origin',branch],{env:{GH_TOKEN:token,GIT_TERMINAL_PROMPT:'0'}});
  const pr=run('gh',['pr','create','--repo',REPO,'--base','main','--head',branch,
    '--title','fix(web): independent Web Vibe candidate '+task.gameId,
    '--body',[
      'WEB_VIBE_1 independent local model candidate (localhost:11435).',
      'Game: '+task.gameId,'Owner task: '+task.id,'Sources: '+changed.map(row=>row.source.relative).join(', '),
      'Local scoped QA: PASS. Browser/mobile/runtime/production: NOT VERIFIED.',
      'Do not merge before independent security, game QA, and human review.'
    ].join('\n')],{env:{GH_TOKEN:token}});
  return pr;
}
export async function runWebVibeWorker(argv=process.argv.slice(2),{fetchImpl=fetch}={}){
  const args=options(argv);
  if(args.pr&&!args.apply)fail('WEB_VIBE_PR_REQUIRES_EXPLICIT_APPLY');
  if(args.apply&&!args.pr)fail('WEB_VIBE_APPLY_REQUIRES_REVIEWABLE_PR');
  const token=clean(process.env.WEB_VIBE_GH_TOKEN);
  assertWebVibeWorkerEnvironment({token});
  verifiedLocalMain();
  const state=remoteQueue(token);
  if(args.check)return {organization:'WEB',engine:'WEB_VIBE_1',webQueued:state.queue.tasks.filter(t=>t.status==='queued').length,sourceWritten:false,modelConnected:false};
  if(!args.task)fail('WEB_VIBE_TASK_ID_REQUIRED');
  const task=chooseWebVibeTask(state.queue,args.task);
  const sources=resolveWebVibeSources(task.gameId,{files:args.all?'*':args.files||'index.html'});
  const prior=(task.ownerPatchLineage?.verifiedPredecessors||[])
    .map(id=>state.queue.tasks.find(row=>row.id===id))
    .filter(row=>row&&row.status==='merged'&&row.gameId===task.gameId
      &&row.target==='web'&&row.sourceRoot===task.sourceRoot);
  if(prior.length!==(task.ownerPatchLineage?.verifiedPredecessors||[]).length)
    fail('WEB_VIBE_BUILD_UP_HISTORY_NOT_VERIFIED');
  const changed=[];
  for(const source of sources){
    const edit=await propose(task,source,fetchImpl,prior);
    if(edit)changed.push({source,edit});
  }
  if(!changed.length)fail('WEB_VIBE_NO_ACTUAL_SOURCE_DELTA');
  if(!args.apply)return {taskId:task.id,selectedFiles:sources.length,
    affectedFiles:changed.map(row=>row.source.relative),
    changePreview:changed.map(row=>({file:row.source.relative,oldText:row.edit.oldText,newText:row.edit.newText})),
    sourceWritten:false,qaVerified:false};
  const pr=createPr(task,changed,token);
  return {taskId:task.id,source:changed.map(row=>row.source.relative).join(','),
    selectedFiles:sources.length,changedFiles:changed.length,pr,
    sourceWritten:true,localQaVerified:true,merged:false,deployed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  runWebVibeWorker().then(x=>console.log('WEB_VIBE_WORKER_RESULT='+JSON.stringify(x)))
    .catch(error=>{console.error('WEB_VIBE_WORKER_BLOCKED='+error.message);process.exitCode=1;});
}
