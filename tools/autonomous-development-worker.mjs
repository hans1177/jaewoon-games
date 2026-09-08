// 파일명: tools/autonomous-development-worker.mjs
// 역할: 무료 로컬 AI가 안정판을 읽고 별도 후보 디렉터리에만 개발 후보를 생성한다.
// 원칙: 생성 모델은 파일 내용 또는 exact edit만 제안한다. 셸/권한/승격은 실행하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyExactEdits, boundedLargeExcerpt, normalizeExactEdits, MAX_EDIT_OPS } from './autonomous-safe-edit.mjs';

const DEFAULT_MODEL=process.env.AUTONOMOUS_LOCAL_MODEL||'qwen3:0.6b';
const MAX_CONTEXT_FILES=10;
const MAX_CONTEXT_BYTES=420000;
const MAX_FULL_CONTEXT_FILE_BYTES=180000;
const MAX_OUTPUT_FILES=4;
const MAX_FILE_BYTES=240000;
const MAX_TOTAL_OUTPUT_BYTES=600000;
const MODEL_TIMEOUT_MS=Number(process.env.AUTONOMOUS_MODEL_TIMEOUT_MS||360000);
const MODEL_MAX_PREDICT=Math.max(1024,Math.min(8192,Number(process.env.AUTONOMOUS_MODEL_MAX_PREDICT||6144)));
const ALLOWED_EXTENSIONS=new Set(['.html','.js','.mjs','.cjs','.css','.json','.md','.txt','.svg']);
const FORBIDDEN_OUTPUT_NAMES=new Set(['.git','.github','package-lock.json']);
const SAVE_PATTERNS=[
  /localStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g,
  /sessionStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g,
];

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const safeId=v=>clean(v).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
const exists=file=>{try{return fs.statSync(file),true;}catch{return false;}};
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const run=(command,args,cwd=process.cwd())=>spawnSync(command,args,{cwd,encoding:'utf8'});
const uniq=values=>[...new Set(values)];

function assertSourcePath(sourcePath){
  const normalized=posix(sourcePath);
  if(!normalized.startsWith('web-games/')||normalized.includes('..')||normalized.includes('/.autonomous-candidates/'))throw new Error(`허용되지 않은 sourcePath: ${sourcePath}`);
  if(!exists(normalized)||!fs.statSync(normalized).isDirectory())throw new Error(`sourcePath 없음: ${normalized}`);
  return normalized;
}
function assertRelativeOutputPath(relative){
  const normalized=posix(relative);
  if(!normalized||normalized.startsWith('/')||normalized.split('/').includes('..'))throw new Error(`후보 파일 경로 오류: ${relative}`);
  if(normalized.split('/').some(part=>FORBIDDEN_OUTPUT_NAMES.has(part)))throw new Error(`후보 파일 금지 경로: ${relative}`);
  const ext=path.extname(normalized).toLowerCase();
  if(!ALLOWED_EXTENSIONS.has(ext))throw new Error(`후보 파일 확장자 금지: ${relative}`);
  return normalized;
}
function listTextFiles(root){
  const rows=[];
  const walk=current=>{
    const entries=fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      if(rows.length>=MAX_CONTEXT_FILES)return;
      if(entry.name.startsWith('.git')||entry.name==='node_modules')continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory())walk(full);
      else if(ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))rows.push({full,relative:posix(path.relative(root,full)),size:fs.statSync(full).size});
    }
  };
  walk(root);
  return rows;
}
function truncateUtf8(text,maxBytes){
  const buf=Buffer.from(String(text??''),'utf8');
  if(buf.length<=maxBytes)return buf.toString('utf8');
  return buf.subarray(0,Math.max(0,maxBytes)).toString('utf8');
}
function readContext(sourcePath){
  let used=0;
  const files=[];
  for(const row of listTextFiles(sourcePath)){
    if(used>=MAX_CONTEXT_BYTES)break;
    const full=fs.readFileSync(row.full,'utf8');
    const excerpt=row.size<=MAX_FULL_CONTEXT_FILE_BYTES?{content:full,truncated:false}:boundedLargeExcerpt(full);
    const remaining=MAX_CONTEXT_BYTES-used;
    const content=truncateUtf8(excerpt.content,remaining);
    const consumed=Buffer.byteLength(content);
    if(consumed<1)continue;
    files.push({path:row.relative,content,truncated:excerpt.truncated||consumed<Buffer.byteLength(excerpt.content),originalBytes:row.size});
    used+=consumed;
  }
  return {files,bytes:used};
}
function extractStorageKeys(text){
  const keys=new Set();
  for(const pattern of SAVE_PATTERNS){
    pattern.lastIndex=0;
    let match;
    while((match=pattern.exec(String(text||''))))keys.add(match[1]);
  }
  return [...keys].sort();
}
function stripFence(raw){
  const text=clean(raw);
  if(text.startsWith('```'))return text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  return text;
}
export function parseModelCandidate(raw){
  const parsed=JSON.parse(stripFence(raw));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('모델 응답은 JSON 객체여야 함');
  const rawFiles=Array.isArray(parsed.files)?parsed.files:[];
  const rawEdits=Array.isArray(parsed.edits)?parsed.edits:[];
  if((rawFiles.length?1:0)+(rawEdits.length?1:0)!==1)throw new Error('후보는 files 또는 edits 중 정확히 하나를 사용해야 함');
  const files=[];
  let total=0;
  const seen=new Set();
  if(rawFiles.length){
    if(rawFiles.length>MAX_OUTPUT_FILES)throw new Error(`후보 files는 최대 ${MAX_OUTPUT_FILES}개여야 함`);
    for(const item of rawFiles){
      const relative=assertRelativeOutputPath(item?.path);
      if(seen.has(relative))throw new Error(`후보 파일 중복: ${relative}`);
      seen.add(relative);
      const content=String(item?.content??'');
      const fileBytes=Buffer.byteLength(content);
      if(fileBytes===0||fileBytes>MAX_FILE_BYTES)throw new Error(`후보 파일 크기 오류: ${relative}`);
      total+=fileBytes;
      if(total>MAX_TOTAL_OUTPUT_BYTES)throw new Error('후보 총 출력 크기 초과');
      files.push({path:relative,content,bytes:fileBytes});
    }
  }
  const edits=rawEdits.length?normalizeExactEdits(rawEdits,assertRelativeOutputPath):[];
  return {
    summary:clean(parsed.summary)||'local-ai candidate',
    expectedEffect:clean(parsed.expectedEffect),
    tests:Array.isArray(parsed.tests)?parsed.tests.map(clean).filter(Boolean).slice(0,8):[],
    files,
    edits,
    mode:files.length?'FULL_FILES':'EXACT_EDITS',
  };
}
export function validateCandidateAgainstSource(sourcePath,candidate,{allowSaveKeyChange=false}={}){
  const violations=[];
  for(const file of candidate.files||[]){
    const sourceFile=path.join(sourcePath,file.path);
    if(exists(sourceFile)&&fs.statSync(sourceFile).isFile()&&!allowSaveKeyChange){
      const before=extractStorageKeys(fs.readFileSync(sourceFile,'utf8'));
      const after=extractStorageKeys(file.content);
      if(JSON.stringify(before)!==JSON.stringify(after))violations.push({path:file.path,reason:'SAVE_KEY_CHANGE',before,after});
    }
  }
  return {pass:violations.length===0,violations};
}
function validateChangedTree(sourcePath,candidatePath,changedPaths,{allowSaveKeyChange=false}={}){
  if(allowSaveKeyChange)return {pass:true,violations:[]};
  const violations=[];
  for(const relative of changedPaths){
    const sourceFile=path.join(sourcePath,relative);
    const candidateFile=path.join(candidatePath,relative);
    const before=exists(sourceFile)&&fs.statSync(sourceFile).isFile()?extractStorageKeys(fs.readFileSync(sourceFile,'utf8')):[];
    const after=exists(candidateFile)&&fs.statSync(candidateFile).isFile()?extractStorageKeys(fs.readFileSync(candidateFile,'utf8')):[];
    if(JSON.stringify(before)!==JSON.stringify(after))violations.push({path:relative,reason:'SAVE_KEY_CHANGE',before,after});
  }
  return {pass:violations.length===0,violations};
}
function copySource(sourcePath,candidatePath){
  if(exists(candidatePath))fs.rmSync(candidatePath,{recursive:true,force:true});
  fs.mkdirSync(candidatePath,{recursive:true});
  fs.cpSync(sourcePath,candidatePath,{recursive:true,filter:(src)=>!src.includes(`${path.sep}.git`)&&!src.includes(`${path.sep}node_modules`)});
}
function buildPrompt({gameId,sourcePath,goal,context,protectedValues=[]}){
  const evidence=context.files.map(file=>`\n### FILE ${file.path}${file.truncated?` [TRUNCATED originalBytes=${file.originalBytes}]`:''}\n${file.content}`).join('\n');
  return `/no_think\n너는 재운컴퍼니 Autonomous Development Worker다. 안정판 원본은 읽기 전용이며 별도 후보 복사본에 적용할 변경만 제안한다.\n게임: ${gameId}\n원본경로: ${sourcePath}\n목표: ${goal}\n보호값: ${protectedValues.join(', ')||'save key / 진행 의미 / 공개 안정판'}\n규칙:\n1. JSON 객체만 출력한다.\n2. 작은 일반 파일을 통째로 바꿀 때는 {"summary":"...","expectedEffect":"...","tests":["..."],"files":[{"path":"상대경로","content":"전체 파일 내용"}]} 를 사용한다.\n3. 큰 파일 또는 [TRUNCATED] 파일은 전체 파일을 재출력하지 말고 {"summary":"...","expectedEffect":"...","tests":["..."],"edits":[{"path":"상대경로","find":"근거에 실제로 보이는 정확한 기존 문자열","replace":"교체 문자열"}]} 를 사용한다.\n4. files와 edits를 동시에 쓰지 않는다. files 최대 ${MAX_OUTPUT_FILES}개, edits 최대 ${MAX_EDIT_OPS}개다.\n5. edit의 find는 제공된 근거에서 그대로 복사해 파일에서 정확히 한 번만 일치하게 충분한 문맥을 포함한다.\n6. 원본 저장키를 변경하지 않는다.\n7. .github, 권한, 배포, 결제, 비밀정보 파일은 만들지 않는다.\n8. 전면 재작성보다 목표를 해결하는 가장 작은 변경을 우선한다.\n9. 완료/PASS/출시 승인이라고 주장하지 않는다. 후보일 뿐이다.\n\n읽기 전용 근거:${evidence}`;
}
function appendOllamaLine(line,state){
  const text=String(line||'').trim();
  if(!text)return;
  const event=JSON.parse(text);
  if(event.error)throw new Error(`Ollama 실패: ${event.error}`);
  if(typeof event.response==='string')state.response+=event.response;
  if(event.done===true)state.done=true;
}
async function callOllama(prompt,model=DEFAULT_MODEL){
  const host=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(new Error('LOCAL_MODEL_TIMEOUT')),MODEL_TIMEOUT_MS);
  try{
    const response=await fetch(`${host}/api/generate`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({model,prompt,stream:true,format:'json',options:{temperature:0.25,num_ctx:8192,num_predict:MODEL_MAX_PREDICT}}),
      signal:controller.signal,
    });
    if(!response.ok)throw new Error(`Ollama 실패: ${response.status}`);
    if(!response.body)throw new Error('Ollama stream 없음');
    const decoder=new TextDecoder();
    const state={response:'',done:false};
    let pending='';
    for await(const chunk of response.body){
      pending+=decoder.decode(chunk,{stream:true});
      const lines=pending.split(/\r?\n/);
      pending=lines.pop()??'';
      for(const line of lines)appendOllamaLine(line,state);
    }
    pending+=decoder.decode();
    if(pending.trim())appendOllamaLine(pending,state);
    if(!clean(state.response))throw new Error('Ollama 응답 비어 있음');
    return state.response;
  }catch(error){
    if(error?.name==='AbortError'||controller.signal.aborted)throw new Error(`Ollama 생성 제한시간 초과: ${MODEL_TIMEOUT_MS}ms`);
    throw error;
  }finally{clearTimeout(timeout);}
}
function syntaxCheck(candidatePath,changedPaths){
  const checks=[];
  for(const relative of changedPaths){
    if(!/\.(?:js|mjs|cjs)$/i.test(relative))continue;
    const target=path.join(candidatePath,relative);
    const result=run('node',['--check',target]);
    checks.push({name:`syntax:${relative}`,status:result.status===0?'PASS':'FAIL',detail:(result.status===0?'node --check':result.stderr).trim().slice(0,600)});
  }
  return checks;
}
export async function generateAutonomousCandidate(options={}){
  const gameId=safeId(options.gameId);
  if(!gameId)throw new Error('gameId 필요');
  const sourcePath=assertSourcePath(options.sourcePath);
  const goal=clean(options.goal);
  if(!goal)throw new Error('goal 필요');
  const candidateId=safeId(options.candidateId)||`${gameId}-${Date.now()}`;
  const candidatePath=posix(options.candidatePath||`web-games/.autonomous-candidates/${gameId}/${candidateId}`);
  if(!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('candidatePath는 autonomous 후보 영역이어야 함');
  const context=readContext(sourcePath);
  if(!context.files.length)throw new Error('읽을 수 있는 소스 파일 없음');
  const raw=options.modelResponse??await callOllama(buildPrompt({gameId,sourcePath,goal,context,protectedValues:options.protectedValues??[]}),options.model??DEFAULT_MODEL);
  const candidate=parseModelCandidate(raw);
  const preValidation=validateCandidateAgainstSource(sourcePath,candidate,{allowSaveKeyChange:options.allowSaveKeyChange===true});
  if(!preValidation.pass)throw new Error(`후보 보호검증 실패: ${preValidation.violations.map(v=>`${v.path}:${v.reason}`).join(',')}`);
  copySource(sourcePath,candidatePath);
  for(const file of candidate.files){
    const target=path.join(candidatePath,file.path);
    ensureDir(target);
    fs.writeFileSync(target,file.content,'utf8');
  }
  const editPaths=candidate.edits.length?applyExactEdits(candidatePath,candidate.edits):[];
  const changedPaths=uniq([...candidate.files.map(x=>x.path),...editPaths]);
  const treeValidation=validateChangedTree(sourcePath,candidatePath,changedPaths,{allowSaveKeyChange:options.allowSaveKeyChange===true});
  if(!treeValidation.pass)throw new Error(`후보 보호검증 실패: ${treeValidation.violations.map(v=>`${v.path}:${v.reason}`).join(',')}`);
  const syntax=syntaxCheck(candidatePath,changedPaths);
  if(syntax.some(check=>check.status!=='PASS'))throw new Error(`후보 문법검증 실패: ${syntax.filter(x=>x.status!=='PASS').map(x=>x.name).join(',')}`);
  const git=run('git',['rev-parse','HEAD']);
  const sourceCommit=git.status===0?git.stdout.trim():null;
  const evidence={
    version:1,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,
    model:options.model??DEFAULT_MODEL,modelTransport:'NDJSON_STREAM',modelTimeoutMs:MODEL_TIMEOUT_MS,modelMaxPredict:MODEL_MAX_PREDICT,
    gameId,sourcePath,candidateId,candidatePath,sourceCommit,goal,
    contextFiles:context.files.map(({path,truncated,originalBytes})=>({path,truncated,originalBytes})),contextBytes:context.bytes,
    changeMode:candidate.mode,changedFiles:changedPaths,editCount:candidate.edits.length,
    summary:candidate.summary,expectedEffect:candidate.expectedEffect,proposedTests:candidate.tests,
    saveKeyValidation:'PASS',syntaxChecks:syntax,generatedAt:new Date().toISOString(),completionAuthority:'INDEPENDENT_QA_AND_JAY',
  };
  const evidencePath=posix(options.evidencePath||`.autonomous/evidence/${candidateId}.json`);
  ensureDir(evidencePath);
  fs.writeFileSync(evidencePath,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
  return evidence;
}

async function main(){
  const gameId=process.env.AUTONOMOUS_GAME_ID;
  const sourcePath=process.env.AUTONOMOUS_SOURCE_PATH;
  const goal=process.env.AUTONOMOUS_GOAL;
  const candidateId=process.env.AUTONOMOUS_CANDIDATE_ID;
  const protectedValues=clean(process.env.AUTONOMOUS_PROTECTED_VALUES).split(',').map(clean).filter(Boolean);
  const evidence=await generateAutonomousCandidate({gameId,sourcePath,goal,candidateId,protectedValues,model:process.env.AUTONOMOUS_LOCAL_MODEL||DEFAULT_MODEL});
  console.log(JSON.stringify(evidence,null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(error.message);process.exitCode=1;});}

export { ALLOWED_EXTENSIONS, MAX_OUTPUT_FILES, MODEL_TIMEOUT_MS, MODEL_MAX_PREDICT, extractStorageKeys, assertRelativeOutputPath, buildPrompt, readContext };
