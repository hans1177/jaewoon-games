// Vibe3 Pump Mode: canonical verified-memory/playbook/benchmark refresh.
// This is invoked by the existing distillation workflow; it is not a separate learning pipeline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVibeVerifiedMemoryIndex, retrieveVibeVerifiedPatterns, createVibeTaskPlaybook } from '../assets/vibe-v3-engine.js';

const TASK_TYPES=Object.freeze(['coding','bugfix','qa','unity','roblox','fortnite_uefn','graphics','planning','general']);
const PORTABLE_QUERY=Object.freeze({
  roblox:'portable mobile touch input ui save load rejoin performance regression responsive core-loop webgame',
  unity:'portable mobile touch input ui save load performance regression responsive core-loop webgame',
  fortnite_uefn:'portable ui save performance regression core-loop',
});
const clean=v=>String(v??'').trim();
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function listJson(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(name=>name.endsWith('.json')).sort().map(name=>({file:path.join(dir,name),record:readJson(path.join(dir,name))})).filter(item=>item.record);}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);}
function parseArgs(argv){const args={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);args[key]=inline??argv[++i];}return args;}
function taskForFailure(entry){const type=clean(entry.taskType).toLowerCase();return TASK_TYPES.includes(type)?type:'general';}

export function buildPumpArtifacts({trainingSamples=[],trajectories=[],maxBenchmarks=64}={}){
  const failures=[];
  for(const trajectory of trajectories){
    for(const candidate of trajectory?.candidates||[]){
      if(candidate?.eligible!==true||candidate?.failure)failures.push({...candidate,request:trajectory.request,taskType:trajectory.metadata?.taskType,project:trajectory.metadata?.project,sourcePaths:trajectory.metadata?.sourcePaths,tags:trajectory.metadata?.tags});
    }
    for(const attempt of trajectory?.repairAttempts||[]){if(!attempt?.pass)failures.push({...attempt,request:trajectory.request,taskType:trajectory.metadata?.taskType,project:trajectory.metadata?.project,sourcePaths:trajectory.metadata?.sourcePaths,tags:trajectory.metadata?.tags});}
  }
  const index=buildVibeVerifiedMemoryIndex({trainingSamples,trajectories,failures});
  const playbooks={version:2,generation:'V3-PUMP',generatedFrom:'VERIFIED_MEMORY_ONLY',taskTypes:{},policy:{localWeightTrainingRequired:false,preferredTrainingBackend:'SERVER_SELF_HOSTED',localTrainingBackendPreserved:true,paidApiRequired:false,benchmarkCountsAsTrainingSample:false,portableContextMayCrossPlatforms:true,platformEvidenceMayNotTransfer:true}};
  for(const taskType of TASK_TYPES){
    const portable=PORTABLE_QUERY[taskType]||'';
    const retrieval=retrieveVibeVerifiedPatterns({index,request:`${taskType} verified implementation repair QA patterns ${portable}`.trim(),taskType,topKSuccess:8,topKFailure:6});
    playbooks.taskTypes[taskType]=createVibeTaskPlaybook({taskType,retrieval});
  }
  const benchmarkSeeds=[];
  for(const warning of index.failureWarnings){
    benchmarkSeeds.push({id:`bench-failure-${warning.id}`,taskType:taskForFailure(warning),source:'FAILURE_MEMORY',project:warning.project||'shared',objective:`재현 가능한 실패 ${warning.failureClass||'UNKNOWN'}를 검증된 책임 코드 수정으로 해결`,failureClass:warning.failureClass||'UNKNOWN',memoryRef:warning.id});
  }
  for(const success of index.positive){
    benchmarkSeeds.push({id:`bench-replay-${success.id}`,taskType:TASK_TYPES.includes(success.taskType)?success.taskType:'general',source:'VERIFIED_REPLAY',project:success.project||'shared',objective:'검증된 성공 패턴을 독립 후보 경쟁과 회귀 검증으로 재현',memoryRef:success.id});
  }
  const dedup=new Map();for(const item of benchmarkSeeds)if(!dedup.has(item.id))dedup.set(item.id,item);
  const cases=[...dedup.values()].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,Math.max(1,Math.floor(Number(maxBenchmarks)||64))).map(item=>({...item,state:'READY_FOR_CANDIDATE_EXECUTION',candidateCount:5,maxRepairAttempts:3,countsAsTrainingSample:false,requiredVerification:['RESPONSIBLE_SOURCE','CHECKPOINT','SYNTAX','TESTS','RUNTIME','INDEPENDENT_QA','REGRESSION','EXACT_REVISION'],promotionRule:'ONLY_VERIFIED_RESULT_MAY_ENTER_CANONICAL_DISTILLATION'}));
  const benchmark={version:2,generation:'V3-PUMP',state:'READY',hourlyRefresh:true,continuousMode:'24H',executionAuthority:'EXISTING_VIBE_DEVELOPMENT_PIPELINE_ONLY',localWeightTrainingRequired:false,preferredTrainingBackend:'SERVER_SELF_HOSTED',localTrainingBackendPreserved:true,countsAsTrainingSample:false,cases,policy:{noAutoSuccess:true,noFabricatedEvidence:true,noParallelPipeline:true,noPaidApi:true,noGitHubHostedModelTraining:true,portableContextMayCrossPlatforms:true,platformEvidenceMayNotTransfer:true}};
  return {index,playbooks,benchmark};
}

export function refreshPumpFiles({sampleDir='company-learning/training-samples',trajectoryDir='company-learning/vibe3-trajectories',memoryOut='company-learning/vibe3-memory-index.json',playbooksOut='company-learning/vibe3-task-playbooks.json',benchmarkOut='company-learning/vibe3-benchmark-queue.json',maxBenchmarks=64}={}){
  const sampleItems=listJson(sampleDir),trajectoryItems=listJson(trajectoryDir),artifacts=buildPumpArtifacts({trainingSamples:sampleItems.map(item=>item.record),trajectories:trajectoryItems.map(item=>item.record),maxBenchmarks});
  const memory={...artifacts.index,sourceFiles:{trainingSamples:sampleItems.map(item=>item.file),trajectories:trajectoryItems.map(item=>item.file)},refresh:{mode:'HOURLY_24H',workflow:'Vibe2 Distillation Sample Ingest',preferredTrainingBackend:'SERVER_SELF_HOSTED',localTrainingBackendPreserved:true,localWeightTrainingRequired:false}};
  writeJson(memoryOut,memory);writeJson(playbooksOut,artifacts.playbooks);writeJson(benchmarkOut,artifacts.benchmark);
  return {version:2,state:'PASS',trainingSamplesExamined:sampleItems.length,trajectoriesExamined:trajectoryItems.length,verifiedPositiveMemory:memory.positive.length,failureWarnings:memory.failureWarnings.length,playbooks:Object.keys(artifacts.playbooks.taskTypes).length,benchmarks:artifacts.benchmark.cases.length,outputs:{memoryOut,playbooksOut,benchmarkOut}};
}

function main(){const a=parseArgs(process.argv.slice(2));const result=refreshPumpFiles({sampleDir:a['sample-dir'],trajectoryDir:a['trajectory-dir'],memoryOut:a['memory-out'],playbooksOut:a['playbooks-out'],benchmarkOut:a['benchmark-out'],maxBenchmarks:a['max-benchmarks']});console.log(JSON.stringify(result));}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(isMain){try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}
