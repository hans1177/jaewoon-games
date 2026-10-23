// Independent WEB_VIBE_1 local developer. No native Vibe2 runtime or shared engine credentials.
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
  if(part==='--check'||part==='--apply'||part==='--pr')out[part.slice(2)]=true;
  else if(part.startsWith('--task='))out.task=part.slice(7);
  else fail('WEB_VIBE_UNKNOWN_ARGUMENT');
}return out;}
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
export function safeWebVibeReplacement(original,response){
  let raw=clean(response).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let value;try{value=JSON.parse(raw);}catch{fail('WEB_VIBE_MODEL_JSON_INVALID');}
  if(!value||typeof value.oldText!=='string'||typeof value.newText!=='string')fail('WEB_VIBE_MODEL_REPLACEMENT_INVALID');
  const a=value.oldText,b=value.newText;
  if(a.length<8||a.length>2500||b.length<1||b.length>4200||
     a===b||!original.includes(a)||original.indexOf(a)!==original.lastIndexOf(a)||
     /(?:child_process|process\.env|eval\s*\(|new Function\s*\(|javascript:|gh\s+api|git\s+push)/i.test(b))
    fail('WEB_VIBE_MODEL_REPLACEMENT_UNSAFE_OR_NONUNIQUE');
  const updated=original.replace(a,b);
  if(updated.length<original.length*.85||updated.length>original.length*1.15||
     !/<html[\s>]/i.test(updated)||!/<\/html\s*>/i.test(updated))fail('WEB_VIBE_HTML_STRUCTURE_CHANGED');
  // An unrequested localStorage key migration can erase user saves.
  const keys=text=>[...text.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\s*\(\s*(['"`])([^'"`]+)\1/g)].map(x=>x[2]).sort();
  if(JSON.stringify(keys(original))!==JSON.stringify(keys(updated)))fail('WEB_VIBE_SAVE_KEY_CHANGED');
  return {updated,oldText:a,newText:b,reason:clean(value.reason).slice(0,280)};
}
function exactWebSource(gameId){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(gameId))fail('WEB_VIBE_GAME_ID_INVALID');
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'game-catalog.json'),'utf8'));
  const game=(catalog.games||[]).find(g=>g.id===gameId);
  if(clean(game?.webPath).replace(/^\/+|\/+$/g,'')!=='web-games/'+gameId)
    fail('WEB_VIBE_CATALOG_NOT_APPROVED');
  const base=fs.realpathSync(path.join(ROOT,'web-games'));
  const gameRoot=fs.realpathSync(path.join(base,gameId));
  const file=fs.realpathSync(path.join(gameRoot,'index.html'));
  if(!gameRoot.startsWith(base+path.sep)||!file.startsWith(gameRoot+path.sep)||
     !fs.statSync(file).isFile())fail('WEB_VIBE_SOURCE_OUTSIDE_WEB_GAME');
  const original=fs.readFileSync(file,'utf8');
  if(original.length>350000||original.length<80)fail('WEB_VIBE_SOURCE_SIZE_OUT_OF_SCOPE');
  return {file,relative:'web-games/'+gameId+'/index.html',original};
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
async function propose(task,source,fetchImpl=fetch){
  const excerpt=source.original.slice(0,13500);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),95000);
  try{
    const response=await fetchImpl(OLLAMA_URL,{method:'POST',redirect:'error',
      headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({model:MODEL,stream:false,format:'json',options:{temperature:0,num_ctx:8192},
        messages:[
          {role:'system',content:'You are the independent WEB-only coding assistant. Modify exactly one existing web-games/<gameId>/index.html in one unique bounded oldText/newText replacement. Respond JSON with oldText,newText,reason. Never modify saves, security, deployment, tokens, or unrelated functionality. Do not use commands or tools.'},
          {role:'user',content:'Game '+task.gameId+'; owner request: '+task.goal.slice(0,2000)+'\nExisting index.html excerpt:\n'+excerpt}
        ]})});
    if(!response.ok)fail('WEB_VIBE_LOCAL_MODEL_HTTP_'+response.status);
    const data=await response.json();
    return safeWebVibeReplacement(source.original,data.message?.content||'');
  }finally{clearTimeout(timeout);}
}
function localQa(file){
  const html=fs.readFileSync(file,'utf8');
  if(!/<\/html\s*>/i.test(html))fail('WEB_VIBE_QA_HTML_INVALID');
  run('node',['--test','qa/web-vibe-organization.test.mjs','qa/pwa-command-vibe2-task.test.mjs'],{timeout:180000});
}
function createPr(task,source,edit,token){
  const branch='web-vibe/'+task.gameId+'-'+Date.now();
  run('git',['switch','-c',branch]);
  fs.writeFileSync(source.file,edit.updated,'utf8');
  localQa(source.file);
  run('git',['add','--',source.relative]);
  const staged=run('git',['diff','--cached','--name-only']).split(/\r?\n/).filter(Boolean);
  if(staged.length!==1||staged[0]!==source.relative)fail('WEB_VIBE_UNEXPECTED_CHANGED_FILE');
  run('git',['commit','-m','fix(web): dedicated Web Vibe candidate for '+task.gameId]);
  // Drop all preconfigured Git credential helpers. Only the dedicated WEB token
  // is available to the fixed GitHub CLI helper for this scoped PR push.
  run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential',
    'push','-u','origin',branch],{env:{GH_TOKEN:token,GIT_TERMINAL_PROMPT:'0'}});
  const pr=run('gh',['pr','create','--repo',REPO,'--base','main','--head',branch,
    '--title','fix(web): independent Web Vibe candidate '+task.gameId,
    '--body',[
      'WEB_VIBE_1 independent local model candidate (localhost:11435).',
      'Game: '+task.gameId,'Owner task: '+task.id,'Source: '+source.relative,
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
  const source=exactWebSource(task.gameId);
  const edit=await propose(task,source,fetchImpl);
  if(!args.apply)return {taskId:task.id,source:source.relative,changePreview:{oldText:edit.oldText,newText:edit.newText},sourceWritten:false,qaVerified:false};
  const pr=createPr(task,source,edit,token);
  return {taskId:task.id,source:source.relative,pr,sourceWritten:true,localQaVerified:true,merged:false,deployed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  runWebVibeWorker().then(x=>console.log('WEB_VIBE_WORKER_RESULT='+JSON.stringify(x)))
    .catch(error=>{console.error('WEB_VIBE_WORKER_BLOCKED='+error.message);process.exitCode=1;});
}
