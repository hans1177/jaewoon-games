// 파일명: tools/web-vibe-worker.mjs
// WEB_VIBE_1 웹 전용 작업: 기존 큐·모델·검증·PR 경로 유지, 로블록스 개발 금지.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertWebVibeQueue,assertWebVibeTask,WEB_VIBE_CONTROL_BRANCH} from './web-vibe-organization.mjs';
import {requestGeminiFreePair} from './vibe2-gemini-free-rotation.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='hans1177/jaewoon-games';
const clean=v=>String(v??'').trim();
const MODEL='qwen2.5-coder:3b';
const OLLAMA_URL='http://127.0.0.1:11435/api/chat';
function fail(message){throw new Error(message);}
function run(binary,args,{cwd=ROOT,timeout=120000,env={},input}={}){
  return execFileSync(binary,args,{cwd,encoding:'utf8',timeout,maxBuffer:4*1024*1024,
    windowsHide:true,env:{...process.env,...env},input,stdio:[input===undefined?'ignore':'pipe','pipe','pipe']}).trim();
}
function options(argv){const out={};for(const part of argv){
  if(part==='--check'||part==='--apply'||part==='--pr'||part==='--all'||part==='--cloud')out[part.slice(2)]=true;
  else if(part.startsWith('--task='))out.task=part.slice(7);
  else if(part.startsWith('--files='))out.files=part.slice(8);
  else fail('WEB_VIBE_UNKNOWN_ARGUMENT');
}if(out.all&&out.files!==undefined)fail('WEB_VIBE_SCOPE_CONFLICT');return out;}
export function assertWebVibeWorkerEnvironment({token='',endpoint=OLLAMA_URL,model=MODEL,cloud=false,
  environment=process.env}={}){
  if(!clean(token)||clean(token).length<12)fail('WEB_VIBE_DEDICATED_TOKEN_REQUIRED');
  if(cloud){
    // Scheduled replay only consumes previously authenticated owner tasks.
    const ownerEvent=environment.GITHUB_ACTOR==='hans1177'
      &&['issue_comment','repository_dispatch'].includes(environment.GITHUB_EVENT_NAME);
    const scheduledReplay=['schedule','workflow_dispatch'].includes(environment.GITHUB_EVENT_NAME)
      &&environment.GITHUB_WORKFLOW==='PWA Command Bridge'
      &&(environment.GITHUB_EVENT_NAME==='schedule'||environment.GITHUB_ACTOR==='hans1177');
    if(environment.GITHUB_ACTIONS!=='true'||!(ownerEvent||scheduledReplay)
      ||environment.GITHUB_REPOSITORY!==REPO
      ||environment.GITHUB_REF!=='refs/heads/main')
      fail('WEB_VIBE_GITHUB_OWNER_MAIN_CONTEXT_REQUIRED');
    // 무모델 후보는 키 없이 실행 가능하다. 외부 호출 직전에는 여전히 키를 요구한다.
    return {endpoint:'EXISTING_GEMINI_FREE_API',model:'EXISTING_VERIFIED_FREE_PAIR',
      organization:'WEB',sharedNativeCredentialAllowed:false,githubHosted:true};
  }
  if(endpoint!==OLLAMA_URL||model!==MODEL)fail('WEB_VIBE_DEDICATED_MODEL_ENDPOINT_REQUIRED');
  return {endpoint,model,organization:'WEB',sharedNativeCredentialAllowed:false,githubHosted:false};
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
  // 수정된 게임 코드는 실행하기 전에 구문을 검사한다. HTML의 모듈도 포함한다.
  if(/\.(?:mjs|cjs|js)$/i.test(relative))run('node',['--check','--input-type='+(/\.cjs$/i.test(relative)?'commonjs':'module')],{input:updated});
  if(/\.html?$/i.test(relative)){
    for(const block of updated.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
      if(/\bsrc\s*=/i.test(block[1]))continue;
      const type=block[1].match(/\btype\s*=\s*['"]([^'"]+)['"]/i)?.[1]?.toLowerCase()||'';
      if(type&&!['module','text/javascript','application/javascript'].includes(type.toLowerCase()))continue;
      run('node',['--check','--input-type='+(type==='module'?'module':'commonjs')],{input:block[2]});
    }
  }
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
    if(Buffer.byteLength(original,'utf8')>2*1024*1024||original.length<8)fail('WEB_VIBE_SOURCE_SIZE_OUT_OF_SCOPE');
    return {file,relative:'web-games/'+gameId+'/'+relative,original};
  });
}
function remoteQueue(token){
  const apiPath='repos/'+REPO+'/contents/.web-vibe/queue.json?ref='+WEB_VIBE_CONTROL_BRANCH;
  const data=JSON.parse(run('gh',['api',apiPath],{env:{GH_TOKEN:token}}));
  if(data.encoding!=='base64'||typeof data.content!=='string')fail('WEB_VIBE_REMOTE_QUEUE_CONTENT_INVALID');
  return {queue:assertWebVibeQueue(JSON.parse(Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8'))),sha:data.sha};
}
// 메인: 깃허브 임시 실행 폴더만 원본 main으로 복구하고 사용자 PC의 변경은 건드리지 않는다.
function verifiedLocalMain({cloud=false}={}){
  if(run('git',['branch','--show-current'])!=='main')fail('WEB_VIBE_LOCAL_MAIN_REQUIRED');
  const origin=run('git',['remote','get-url','origin']);
  // The WEB worker must not fall back to a native team's SSH key.
  if(!/^https:\/\/github\.com\/hans1177\/jaewoon-games(?:\.git)?$/i.test(origin))
    fail('WEB_VIBE_UNTRUSTED_REPOSITORY');
  run('git',['fetch','--quiet','origin','main']);
  if(run('git',['rev-parse','HEAD'])!==run('git',['rev-parse','origin/main']))
    fail('WEB_VIBE_MAIN_MUST_BE_FAST_FORWARDED_FIRST');
  const dirty=run('git',['status','--porcelain','--untracked-files=all']);
  if(!dirty)return;
  const isolatedCloudCheckout=cloud===true
    &&process.env.GITHUB_ACTIONS==='true'
    &&process.env.GITHUB_REPOSITORY===REPO
    &&path.resolve(process.env.GITHUB_WORKSPACE||'/')===ROOT;
  if(!isolatedCloudCheckout)fail('WEB_VIBE_LOCAL_UNCOMMITTED_CHANGES');
  // Actions checkout와 사전 검사가 남긴 임시 변경만 폐기한다. 실제 game main 소스는 HEAD 그대로다.
  console.log('WEB_VIBE_CLOUD_CHECKOUT_DIRTY='+dirty.split('\n').length);
  run('git',['restore','--source=HEAD','--staged','--worktree','--','.']);
  run('git',['clean','-fd']);
  const remaining=run('git',['status','--porcelain','--untracked-files=all']);
  if(remaining)fail('WEB_VIBE_CLOUD_CHECKOUT_STILL_DIRTY:'+remaining.split('\n').length);
  console.log('WEB_VIBE_CLOUD_CHECKOUT_REPAIRED=PASS');
}
// 클라우드/로컬은 같은 WEB_VIBE_1 파일 검증과 PR 경로를 사용한다.
// 원격 모델 응답은 절대 권한이 아니며 기존 단일 bounded edit 검사만 통과한다.
export async function proposeWebVibeChange(task,source,{cloud=false,fetchImpl=fetch,
  geminiImpl=requestGeminiFreePair,apiKey='',previousVerified=[]}={}){
  // [전체 코드 진단] 무모델 분석은 앞부분 발췌가 아닌 실제 파일 전체를 읽는다.
  const analysis={bytes:Buffer.byteLength(source.original),
    functions:[...source.original.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(row=>row[1]),
    scripts:[...source.original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]};
  const excerpt=source.original.slice(0,13500);
  if(/\.html?$/i.test(source.relative)){
    const scripts=analysis.scripts.filter(row=>! /\bsrc\s*=/i.test(row[1]));
    if(scripts.length===1&&(!scripts[0][1].trim()||/^\s*type=['"]module['"]\s*$/i.test(scripts[0][1]))){
      const code=scripts[0][2],goal=clean(task.goal),bindings=[],steps=[];
      const ids=[...source.original.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map(row=>row[2]);
      const actions=new Set(['attack','interact','gather','dodge','openInventory','openMap','openCrafting','openQuestLog']);
      if(/mobile|touch|input|button|combat|attack|craft|quest|모바일|터치|입력|버튼|전투|공격|제작|퀘스트/i.test(goal)){
        for(const button of source.original.matchAll(/<button\b([^>]*)>/gi)){
          const attrs=[...button[1].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)];
          const id=attrs.filter(row=>row[1].toLowerCase()==='id'),action=attrs.filter(row=>row[1].toLowerCase()==='data-gameplay-action');
          if(button.index>scripts[0].index||id.length!==1||action.length!==1||/\bon(?:click|pointerdown|touchstart)\s*=/i.test(button[1]))continue;
          const name=action[0][3],buttonId=id[0][3];
          if(!/^[A-Za-z_$][\w$-]{0,79}$/.test(buttonId)||!actions.has(name)||ids.filter(value=>value===buttonId).length!==1)continue;
          if((code.match(new RegExp('\\bfunction\\s+'+name+'\\s*\\(\\s*\\)','g'))||[]).length!==1)continue;
          const escapedId=buttonId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          if(new RegExp('getElementById\\(\\s*[\"\']'+escapedId+'[\"\']').test(code))continue;
          bindings.push('document.getElementById('+JSON.stringify(buttonId)+').addEventListener("click", '+name+');');
        }
        if(/\bfunction\s+releaseInputs\s*\(\s*\)/.test(code)&&! /addEventListener\(\s*['"]blur['"]/.test(code))bindings.push('addEventListener("blur", releaseInputs);');
      }
      if(/resize|canvas|viewport|화면|해상도|회전/i.test(goal)&&/\bfunction\s+resize\s*\(\s*\)/.test(code)&&! /addEventListener\(\s*['"]resize['"]/.test(code))bindings.push('addEventListener("resize", resize);');
      if(/frame|delta|프레임|시간차|버벅/i.test(goal)){
        const rows=[...code.matchAll(/const dt=\(now-last\)\/1000;/g)];
        if(rows.length===1)steps.push({oldText:rows[0][0],newText:'const dt=Math.max(0,Math.min(.05,(now-last)/1000));',reason:'기존 프레임 시간차 유한 범위 제한'});
      }
      if(bindings.length){
        const scoped=code.trimEnd().endsWith('})();');
        const close=scripts[0].index+scripts[0][0].lastIndexOf('</script>');
        const end=scoped?source.original.slice(close-32,close+9):'</script>';
        const inserted=scoped?end.replace(/\}\)\(\);\s*<\/script>$/,bindings.join('\n')+'\n})();</script>'):bindings.join('\n')+'\n'+end;
        if(source.original.split(end).length===2)steps.push({oldText:end,newText:inserted,reason:'검증된 기존 함수에 입력·화면 연결 일괄 적용'});
      }
      const complexGoal=/(?:맵|월드|스테이지|몬스터|보스|전투).{0,24}(?:생성|추가|구현|확장|다양화|전체\s*작성)|(?:new|add|expand).{0,20}(?:world|stage|monster|boss)/i.test(goal);
      if(steps.length&&!complexGoal){
        let updated=source.original;
        for(const step of steps)updated=safeWebVibeReplacement(updated,JSON.stringify(step),{relative:source.relative}).updated;
        return {updated,oldText:steps[0].oldText,newText:steps[0].newText,reason:steps.map(row=>row.reason).join('; '),
          deterministicWebInput:true,deterministicSteps:steps.length,analysis:{bytes:analysis.bytes,functions:analysis.functions}};
      }
    }
  }
  if(cloud&&!clean(apiKey))fail('WEB_VIBE_FREE_MODEL_KEY_MISSING:'+source.relative+':functions='+analysis.functions.length+':bytes='+analysis.bytes);
  const system='You are the independent WEB-only coding assistant. Inspect only the provided existing web-game file. '
    +'If no relevant change is needed, return JSON {"skip":true,"reason":"not affected"}. '
    +'Otherwise return JSON with one unique bounded oldText,newText,reason replacement for this file. '
    +'Never modify saves, security, deployment, tokens, Roblox/Unity, unrelated files, or run tools.';
  const user='Game '+task.gameId+'; file: '+source.relative+'; owner request: '+task.goal.slice(0,2000)
    +'\nPrior independently merged patches for this same WEB game (context only; recheck latest source):\n'
    +previousVerified.map(row=>row.id+': '+clean(row.goal).slice(0,300)).join('\n').slice(0,1300)
    +'\nContinue from current game source and preserve existing mechanics/saves. Do not reset previous build-up progress.'
    +'\nExisting exact source excerpt:\n'+excerpt;
  let answer='';
  if(cloud){
    const result=await geminiImpl({apiKey,
      contents:[{role:'user',parts:[{text:system+'\n\n'+user}]}],
      maxOutputTokens:3072,temperature:0,responseMimeType:'application/json',timeoutMs:95000});
    answer=clean(result?.text);
  }else{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),95000);
    try{
      const response=await fetchImpl(OLLAMA_URL,{method:'POST',redirect:'error',
        headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({model:MODEL,stream:false,format:'json',options:{temperature:0,num_ctx:8192},
          messages:[{role:'system',content:system},{role:'user',content:user}]})});
      if(!response.ok)fail('WEB_VIBE_LOCAL_MODEL_HTTP_'+response.status);
      const data=await response.json();
      answer=clean(data.message?.content||'');
    }finally{clearTimeout(timeout);}
  }
  let value;try{value=JSON.parse(answer);}catch{fail('WEB_VIBE_MODEL_JSON_INVALID');}
  if(value?.skip===true&&typeof value.reason==='string')return null;
  return safeWebVibeReplacement(source.original,answer,{relative:source.relative});
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
function createPr(task,changed,token,{cloud=false}={}){
  // Stable owner-task branch prevents duplicate PRs after retries or network races.
  const branch='web-vibe/'+task.gameId+'-'+task.id.slice(4);
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
  // 기본 작업 토큰의 PR은 후속 CI 이벤트가 발생하지 않으므로 초안으로 유지한다.
  const draft=cloud&&process.env.WEB_VIBE_JOB_TOKEN==='true';
  const pr=run('gh',['pr','create',...(draft?['--draft']:[]),'--repo',REPO,'--base','main','--head',branch,
    '--title','fix(web): independent Web Vibe candidate '+task.gameId,
    '--body',[
      cloud?'WEB_VIBE_1 GitHub-hosted existing free-model candidate.':'WEB_VIBE_1 independent local model candidate (localhost:11435).',
      'Game: '+task.gameId,'Owner task: '+task.id,'Sources: '+changed.map(row=>row.source.relative).join(', '),
      'Local scoped QA: PASS. Browser/mobile/runtime/production: NOT VERIFIED.',
      ...(draft?['기본 작업 토큰으로 생성한 초안: 독립 CI 실행과 검토 전 병합 금지.']:[]),
      'Do not merge before independent security, game QA, and human review.'
    ].join('\n')],{env:{GH_TOKEN:token}});
  return pr;
}
// Persist the existing WEB-only queue checkpoint after the actual PR exists.
// Do not mark a source candidate 'merged' or 'verified' without independent QA.
function markWebVibeReview(task,pr,token){
  const url=clean(pr);
  if(!/^https:\/\/github\.com\/hans1177\/jaewoon-games\/pull\/[0-9]+$/.test(url))
    fail('WEB_VIBE_REVIEW_PR_URL_UNVERIFIED');
  const state=remoteQueue(token),stored=state.queue.tasks.find(row=>row.id===task.id);
  if(!stored||stored.gameId!==task.gameId||stored.sourceRoot!==task.sourceRoot
    ||stored.target!=='web'||stored.goal!==task.goal||
    !['queued','blocked','review'].includes(stored.status))fail('WEB_VIBE_REVIEW_QUEUE_STALE');
  if(stored.status==='review'){
    if(stored.reviewPrUrl!==url)fail('WEB_VIBE_REVIEW_PR_COLLISION');
    return;
  }
  const tasks=state.queue.tasks.map(row=>row.id===task.id
    ?{...row,status:'review',reviewPrUrl:url,blocker:null,evidence:[...new Set([
        ...(row.evidence||[]),'web-vibe-pr-created:needs-independent-qa-and-owner-merge'
      ])]}:row);
  const queue=assertWebVibeQueue({...state.queue,tasks});
  const payload={message:'web-vibe: review owner patch '+task.id+' [skip ci]',
    content:Buffer.from(JSON.stringify(queue,null,2)+'\n').toString('base64'),
    sha:state.sha,branch:WEB_VIBE_CONTROL_BRANCH};
  const scratch=path.join(path.dirname(ROOT),'web-vibe-review-'+process.pid+'-'+task.id.slice(4)+'.json');
  fs.writeFileSync(scratch,JSON.stringify(payload),{mode:0o600,flag:'wx'});
  try{
    run('gh',['api','-X','PUT','repos/'+REPO+'/contents/.web-vibe/queue.json','--input',scratch],
      {env:{GH_TOKEN:token},timeout:90000});
  }finally{fs.rmSync(scratch,{force:true});}
}

export async function runWebVibeWorker(argv=process.argv.slice(2),{fetchImpl=fetch,geminiImpl=requestGeminiFreePair}={}){
  const args=options(argv);
  if(args.pr&&!args.apply)fail('WEB_VIBE_PR_REQUIRES_EXPLICIT_APPLY');
  if(args.apply&&!args.pr)fail('WEB_VIBE_APPLY_REQUIRES_REVIEWABLE_PR');
  const token=clean(process.env.WEB_VIBE_GH_TOKEN);
  assertWebVibeWorkerEnvironment({token,cloud:args.cloud===true});
  verifiedLocalMain({cloud:args.cloud===true});
  const state=remoteQueue(token);
  if(args.check)return {organization:'WEB',engine:'WEB_VIBE_1',webQueued:state.queue.tasks.filter(t=>t.status==='queued').length,sourceWritten:false,modelConnected:false};
  if(!args.task)fail('WEB_VIBE_TASK_ID_REQUIRED');
  const task=chooseWebVibeTask(state.queue,args.task);
  if(['schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)
    &&(task.ownerDirective!==true||!task.evidence?.includes('owner-source-authenticated')))
    fail('WEB_VIBE_UNVERIFIED_SCHEDULED_TASK');
  const sources=resolveWebVibeSources(task.gameId,{files:args.all?'*':args.files||'index.html'});
  const prior=(task.ownerPatchLineage?.verifiedPredecessors||[])
    .map(id=>state.queue.tasks.find(row=>row.id===id))
    .filter(row=>row&&row.status==='merged'&&row.gameId===task.gameId
      &&row.target==='web'&&row.sourceRoot===task.sourceRoot);
  if(prior.length!==(task.ownerPatchLineage?.verifiedPredecessors||[]).length)
    fail('WEB_VIBE_BUILD_UP_HISTORY_NOT_VERIFIED');
  const changed=[],unsupported=[];
  for(const source of sources){
    try{
      const edit=await proposeWebVibeChange(task,source,{cloud:args.cloud===true,fetchImpl,geminiImpl,
        apiKey:args.cloud?clean(process.env.GEMINI_API_KEY):'',previousVerified:prior});
      if(edit)changed.push({source,edit});
    }catch(error){
      if(String(error.message).startsWith('WEB_VIBE_FREE_MODEL_KEY_MISSING:'))unsupported.push(error.message);
      else throw error;
    }
  }
  // 한방패치의 일부 파일만 고쳐 완료로 보내지 않는다. 모든 차단 원인을 모은다.
  if(unsupported.length)fail('WEB_VIBE_NO_MODEL_PLAN_INCOMPLETE:'+unsupported.join('|'));
  if(!changed.length)fail('WEB_VIBE_NO_ACTUAL_SOURCE_DELTA');
  if(!args.apply)return {taskId:task.id,selectedFiles:sources.length,
    affectedFiles:changed.map(row=>row.source.relative),
    changePreview:changed.map(row=>({file:row.source.relative,oldText:row.edit.oldText,newText:row.edit.newText})),
    sourceWritten:false,qaVerified:false};
  const pr=createPr(task,changed,token,{cloud:args.cloud===true});
  markWebVibeReview(task,pr,token);
  return {taskId:task.id,source:changed.map(row=>row.source.relative).join(','),
    selectedFiles:sources.length,changedFiles:changed.length,pr,
    sourceWritten:true,localQaVerified:true,merged:false,deployed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  runWebVibeWorker().then(x=>console.log('WEB_VIBE_WORKER_RESULT='+JSON.stringify(x)))
    .catch(error=>{console.error('WEB_VIBE_WORKER_BLOCKED='+error.message);process.exitCode=1;});
}
