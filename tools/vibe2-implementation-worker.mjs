// 파일명: tools/vibe2-implementation-worker.mjs
// 역할: 플랫폼 결정 후 검증된 deterministic recipe만 실행한다. AI 호출이나 AI fallback은 허용하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveVibeDevelopmentExecution } from './vibe2-development-execution-policy.mjs';
import { runVibe2DeterministicSourceWorker } from './vibe2-deterministic-source-worker.mjs';
import { exploreVibe2WorkOrder } from './vibe2-exploration-worker.mjs';
import { DEFAULT_EVIDENCE as ROBLOX_BALANCE_DEFAULT_EVIDENCE, RECIPE as ROBLOX_BALANCE_RECIPE, runRobloxAutonomousBalanceWorker } from './vibe2-roblox-autonomous-balance-worker.mjs';

const clean=value=>String(value??'').trim();
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}

function assertDeterministicManifest(manifest,developmentExecution){
  if(!manifest||typeof manifest!=='object')throw new Error('deterministic worker returned no manifest');
  if(manifest.aiUsed!==false)throw new Error('AI use detected in deterministic implementation');
  if(manifest.implementationExecutor!=='deterministic-source-worker')throw new Error(`unexpected implementation executor: ${manifest.implementationExecutor||'missing'}`);
  if(clean(manifest.deterministicRecipe)!==clean(developmentExecution.recipe))throw new Error('deterministic recipe mismatch');
  if(!Array.isArray(manifest.changedFiles)||manifest.changedFiles.length===0)throw new Error('deterministic worker produced no changed files');
  return manifest;
}

function resolveExplorationHandoff(cwd,input){
  if(!clean(process.env.VIBE2_EXPLORATION_FILE))return input?.exploration||null;
  return exploreVibe2WorkOrder({cwd,order:input});
}

function resolveVerifiedR5Evidence(cwd,evidenceFile=''){
  const requested=clean(evidenceFile||process.env.VIBE2_RUNTIME_EVIDENCE_FILE)||ROBLOX_BALANCE_DEFAULT_EVIDENCE;
  const resolved=path.isAbsolute(requested)?requested:path.resolve(cwd,requested);
  if(!fs.existsSync(resolved))throw new Error(`R5 verified input telemetry missing: ${resolved}`);
  const baseMainSha=clean(process.env.VIBE2_BASE_MAIN_SHA);
  if(!baseMainSha)throw new Error('R5 requires VIBE2_BASE_MAIN_SHA before source mutation');
  const evidence=readJson(resolved);
  const evidenceMainSha=clean(evidence?.baseMainSha);
  if(!evidenceMainSha||evidenceMainSha!==baseMainSha){
    throw new Error(`R5 baseline/main revision mismatch: ${evidenceMainSha||'NONE'} != ${baseMainSha}`);
  }
  return resolved;
}

export async function runVibe2ImplementationWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order.json',outputRoot='.vibe2/candidates',applySource=false,evidenceFile=''}={}){
  const input=readJson(path.resolve(cwd,workOrderFile));
  const developmentExecution=resolveVibeDevelopmentExecution({task:input?.selectedTask||{},target:input?.target,route:input?.executionRoute||'text-source-worker'});
  const exploration=resolveExplorationHandoff(cwd,input);
  const effective={...input,exploration,developmentExecution,workerPolicy:{...(input.workerPolicy||{}),aiAllowed:false,aiRequired:false,aiAssist:false,deterministicFirst:true,implementationExecutor:developmentExecution.executor,deterministicRecipe:developmentExecution.recipe||null}};
  const effectiveFile=path.resolve(cwd,'.vibe2','work-order-effective.json');
  writeJson(effectiveFile,effective);

  if(developmentExecution.executor==='deterministic-capability-gap'){
    throw new Error(`VIBE2_DETERMINISTIC_CAPABILITY_GAP:${developmentExecution.reason}:${clean(input?.taskId||input?.selectedTask?.id)||'unknown-task'}`);
  }
  if(developmentExecution.executor!=='deterministic-source-worker')throw new Error(`implementation worker cannot execute source route: ${developmentExecution.executor}`);

  const workerArgs={cwd,workOrderFile:path.relative(cwd,effectiveFile),outputRoot,applySource};
  const verifiedR5Evidence=developmentExecution.recipe===ROBLOX_BALANCE_RECIPE?resolveVerifiedR5Evidence(cwd,evidenceFile):'';
  const rawManifest=developmentExecution.recipe===ROBLOX_BALANCE_RECIPE
    ?runRobloxAutonomousBalanceWorker({...workerArgs,evidenceFile:verifiedR5Evidence})
    :runVibe2DeterministicSourceWorker(workerArgs);
  const manifest=assertDeterministicManifest(rawManifest,developmentExecution);
  return{manifest,developmentExecution};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  const result=await runVibe2ImplementationWorker({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputRoot:clean(args.output)||'.vibe2/candidates',applySource:String(args['apply-source']||'').toLowerCase()==='true',evidenceFile:clean(args['evidence-file'])});
  console.log('VIBE2_IMPLEMENTATION_WORKER=PASS');
  console.log('VIBE2_AI_ALLOWED=NO');
  console.log('VIBE2_AI_REQUIRED=NO');
  console.log('VIBE2_AI_ASSIST=NO');
  console.log(`VIBE2_IMPLEMENTATION_EXECUTOR=${result.developmentExecution.executor}`);
  console.log(`VIBE2_DETERMINISTIC_RECIPE=${result.developmentExecution.recipe||'NONE'}`);
}
