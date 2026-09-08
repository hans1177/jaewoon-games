// 신규게임 전용 Worker: Artbook/컨셉 근거에서 새 Web 프로토타입 후보만 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseModelCandidate } from './autonomous-development-worker.mjs';

const DEFAULT_MODEL=process.env.AUTONOMOUS_LOCAL_MODEL||'qwen3:0.6b';
const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const safeId=v=>clean(v).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const run=(command,args,cwd=process.cwd())=>spawnSync(command,args,{cwd,encoding:'utf8'});

export function validatePrototypeRequest(request={}){
  const errors=[];
  if(!/^P\d{4,}$/.test(request.projectId||''))errors.push('projectId');
  if(!clean(request.candidateId))errors.push('candidateId');
  if(!clean(request.slug))errors.push('slug');
  if(request.sourcePath!==`web-games/${request.slug}`)errors.push('sourcePath');
  if(request.candidateBranchOnly!==true)errors.push('candidateBranchOnly');
  if(request.publicStableWrite!==false)errors.push('publicStableWrite');
  if(request.publicRelease!==false)errors.push('publicRelease');
  if(!request.concept||!clean(request.concept.identitySentence)||!clean(request.concept.coreLoop))errors.push('concept');
  if(!request.artbookEvidence||request.artbookEvidence.productionApproval===true)errors.push('artbookEvidence');
  if(!Array.isArray(request.acceptanceCriteria)||request.acceptanceCriteria.length<3)errors.push('acceptanceCriteria');
  return{pass:errors.length===0,errors};
}

function promptFor(request){
  return `/no_think\n너는 재운컴퍼니 신규게임 Prototype Worker다. 기존 공개게임을 수정하지 않고 ${request.projectId}의 첫 Web 프로토타입 후보 파일만 작성한다.\n프로젝트=${request.name}\n정체성=${request.concept.identitySentence}\n핵심루프=${request.concept.coreLoop}\n스토리=${request.concept.storyHook}\n대표시스템=${(request.concept.signatureSystems||[]).join(' / ')}\n대표장면=${(request.concept.signatureScenes||[]).join(' / ')}\n세계규칙=${(request.concept.worldRules||[]).join(' / ')}\n금지패턴=${(request.concept.forbiddenPatterns||[]).join(' / ')}\n검증가설=${request.concept.prototypeHypothesis}\n아트북근거=${JSON.stringify(request.artbookEvidence)}\n목표=${request.goal}\n합격조건=${request.acceptanceCriteria.join(' / ')}\n규칙:\n1. JSON 객체만 출력: {"summary":"...","expectedEffect":"...","tests":["..."],"files":[{"path":"...","content":"전체 파일"}]}\n2. files 1~4개, 반드시 index.html 포함.\n3. 외부 유료 API/키/로그인/결제 금지. CDN 의존도 피하고 자체 실행 가능하게 한다.\n4. 첫 프로토타입에서는 localStorage/sessionStorage/IndexedDB/Cookie 등 영구저장을 사용하지 않는다.\n5. 공개 출시 승인 문구를 넣지 않는다.\n6. 핵심루프가 실제 입력으로 최소 1회 완주 가능해야 한다.\n7. 모바일 터치 또는 포인터 입력을 고려한다.\n8. 게임마다 고유한 대표 시스템을 실제 조작으로 체감하게 한다.\n9. .github/배포/권한 파일을 만들지 않는다.`;
}

async function callOllama(prompt,model=DEFAULT_MODEL){
  const host=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';
  const response=await fetch(`${host}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:false,format:'json',options:{temperature:0.35,num_ctx:8192}})});
  if(!response.ok)throw new Error(`Ollama 실패: ${response.status}`);const body=await response.json();if(!clean(body.response))throw new Error('Ollama 응답 비어 있음');return body.response;
}

function containsPersistence(text){return/(?:localStorage|sessionStorage|indexedDB|document\.cookie|CacheStorage)/i.test(String(text||''));}

export function validatePrototypeCandidate(candidate){
  const errors=[];
  if(!candidate.files.some(file=>file.path==='index.html'))errors.push('INDEX_HTML_REQUIRED');
  for(const file of candidate.files){
    if(containsPersistence(file.content))errors.push(`PERSISTENT_STORAGE_FORBIDDEN:${file.path}`);
    if(/OPENAI_API_KEY|ANTHROPIC_API_KEY|GROQ_API_KEY|MISTRAL_API_KEY|sk-[A-Za-z0-9_-]{10,}/i.test(file.content))errors.push(`SECRET_OR_PAID_KEY_PATTERN:${file.path}`);
  }
  return{pass:errors.length===0,errors};
}

function syntaxChecks(candidatePath,files){
  const checks=[];
  for(const file of files){
    if(!/\.(?:js|mjs|cjs)$/i.test(file.path))continue;
    const result=run('node',['--check',path.join(candidatePath,file.path)]);
    checks.push({name:`syntax:${file.path}`,status:result.status===0?'PASS':'FAIL',detail:(result.status===0?'node --check':result.stderr).trim().slice(0,500)});
  }
  return checks;
}

export async function generatePrototypeCandidate({request,modelResponse=null,model=DEFAULT_MODEL,candidateId=null}={}){
  const requestValidation=validatePrototypeRequest(request);if(!requestValidation.pass)throw new Error(`prototype request 불완전: ${requestValidation.errors.join(',')}`);
  const raw=modelResponse??await callOllama(promptFor(request),model);
  const candidate=parseModelCandidate(typeof raw==='string'?raw:JSON.stringify(raw));
  const candidateValidation=validatePrototypeCandidate(candidate);if(!candidateValidation.pass)throw new Error(`prototype 후보 차단: ${candidateValidation.errors.join(',')}`);
  const id=safeId(candidateId)||`prototype-${safeId(request.candidateId)}-${Date.now()}`;
  const candidatePath=posix(`web-games/.autonomous-candidates/${request.projectId}/${id}`);
  fs.rmSync(candidatePath,{recursive:true,force:true});fs.mkdirSync(candidatePath,{recursive:true});
  for(const file of candidate.files){const target=path.join(candidatePath,file.path);ensureDir(target);fs.writeFileSync(target,file.content,'utf8');}
  const syntax=syntaxChecks(candidatePath,candidate.files);if(syntax.some(x=>x.status!=='PASS'))throw new Error(`prototype 문법 실패: ${syntax.filter(x=>x.status!=='PASS').map(x=>x.name).join(',')}`);
  const git=run('git',['rev-parse','HEAD']);const sourceCommit=git.status===0?git.stdout.trim():null;
  const evidence={
    version:1,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,newProject:true,
    incubatorCandidateId:request.candidateId,gameId:request.projectId,sourcePath:request.sourcePath,candidateId:id,candidatePath,sourceCommit,
    goal:request.goal,artbookId:request.artbookId,changedFiles:candidate.files.map(f=>f.path),summary:candidate.summary,expectedEffect:candidate.expectedEffect,
    proposedTests:candidate.tests,saveKeyValidation:'NEW_PROTOTYPE_NO_PERSISTENT_STORAGE',syntaxChecks:syntax,generatedAt:new Date().toISOString(),completionAuthority:'INDEPENDENT_QA_AND_JAY',
  };
  const evidencePath=`.autonomous/evidence/${id}.json`;ensureDir(evidencePath);fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');return evidence;
}

async function main(){
  const requestFile=process.env.AUTONOMOUS_PROTOTYPE_REQUEST||'.autonomous/prototype-request.json';
  const request=JSON.parse(fs.readFileSync(requestFile,'utf8'));
  const evidence=await generatePrototypeCandidate({request,model:process.env.AUTONOMOUS_LOCAL_MODEL||DEFAULT_MODEL,candidateId:process.env.AUTONOMOUS_CANDIDATE_ID});
  console.log(JSON.stringify(evidence,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});}
