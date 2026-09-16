// 파일명: tools/vibe2-implementation-worker.mjs
// 역할: 플랫폼 결정 후 deterministic recipe를 우선 실행하고, 필요한 작업에만 로컬 AI source worker를 사용한다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveVibeDevelopmentExecution } from './vibe2-development-execution-policy.mjs';
import { runVibe2DeterministicSourceWorker } from './vibe2-deterministic-source-worker.mjs';
import { runVibe2SourceWorker } from './vibe2-source-worker.mjs';

const clean=value=>String(value??'').trim();
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForOllama(){
  for(let attempt=1;attempt<=30;attempt+=1){
    try{const response=await fetch('http://127.0.0.1:11434/api/tags');if(response.ok)return await response.json();}catch{}
    await sleep(2000);
  }
  throw new Error('Ollama runtime did not become ready');
}
async function ensureLocalAi(model){
  try{execFileSync('ollama',['--version'],{stdio:'ignore'});}catch{throw new Error('AI assist selected but Ollama runtime is unavailable');}
  try{
    const child=spawn('ollama',['serve'],{detached:true,stdio:'ignore'});
    child.unref();
  }catch{}
  let tags=await waitForOllama();
  const names=(tags?.models||[]).flatMap(row=>[clean(row?.name),clean(row?.model)]).filter(Boolean);
  if(!names.includes(model)){
    execFileSync('ollama',['pull',model],{stdio:'inherit'});
    tags=await waitForOllama();
    const refreshed=(tags?.models||[]).flatMap(row=>[clean(row?.name),clean(row?.model)]).filter(Boolean);
    if(!refreshed.includes(model))throw new Error(`local AI model unavailable after pull: ${model}`);
  }
}

export async function runVibe2ImplementationWorker({
  cwd=process.cwd(),
  workOrderFile='.vibe2/work-order.json',
  outputRoot='.vibe2/candidates',
  model=process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b',
  responseFile='',
  repairResponseFiles=[],
  applySource=false
}={}){
  const input=readJson(path.resolve(cwd,workOrderFile));
  const developmentExecution=resolveVibeDevelopmentExecution({
    task:input?.selectedTask||{},
    target:input?.target,
    route:input?.executionRoute||'text-source-worker'
  });
  const effective={
    ...input,
    developmentExecution,
    workerPolicy:{
      ...(input.workerPolicy||{}),
      aiRequired:developmentExecution.aiRequired,
      aiAssist:developmentExecution.aiAssist,
      deterministicFirst:developmentExecution.deterministicFirst,
      implementationExecutor:developmentExecution.executor,
      deterministicRecipe:developmentExecution.recipe||null
    }
  };
  const effectiveFile=path.resolve(cwd,'.vibe2','work-order-effective.json');
  writeJson(effectiveFile,effective);

  let manifest;
  if(developmentExecution.executor==='deterministic-source-worker'){
    manifest=runVibe2DeterministicSourceWorker({cwd,workOrderFile:path.relative(cwd,effectiveFile),outputRoot,applySource});
  }else if(developmentExecution.executor==='ai-source-worker'){
    await ensureLocalAi(model);
    manifest=await runVibe2SourceWorker({cwd,workOrderFile:path.relative(cwd,effectiveFile),outputRoot,model,responseFile,repairResponseFiles,applySource});
  }else{
    throw new Error(`implementation worker cannot execute route: ${developmentExecution.executor}`);
  }
  return{manifest,developmentExecution};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=await runVibe2ImplementationWorker({
    workOrderFile:clean(args.order)||'.vibe2/work-order.json',
    outputRoot:clean(args.output)||'.vibe2/candidates',
    model:clean(args.model)||process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b',
    responseFile:clean(args.response),
    repairResponseFiles:clean(args['repair-responses']).split(',').map(clean).filter(Boolean),
    applySource:String(args['apply-source']||'').toLowerCase()==='true'
  });
  console.log('VIBE2_IMPLEMENTATION_WORKER=PASS');
  console.log(`VIBE2_AI_REQUIRED=${result.developmentExecution.aiRequired?'YES':'NO'}`);
  console.log(`VIBE2_AI_ASSIST=${result.developmentExecution.aiAssist?'YES':'NO'}`);
  console.log(`VIBE2_IMPLEMENTATION_EXECUTOR=${result.developmentExecution.executor}`);
  console.log(`VIBE2_DETERMINISTIC_RECIPE=${result.developmentExecution.recipe||'NONE'}`);
}
