// Vibe3 Pump Mode: canonical verified-memory/playbook/benchmark refresh.
// This is invoked by the existing distillation workflow; it is not a separate learning pipeline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVibeVerifiedMemoryIndex, retrieveVibeVerifiedPatterns, createVibeTaskPlaybook } from '../assets/vibe-v3-engine.js';
import { buildTransformativeRecombination } from './vibe3-transformative-recombination.mjs';

const TASK_TYPES=Object.freeze(['coding','bugfix','qa','unity','roblox','graphics','planning','general']);
const PORTABLE_WEB_QUERY='webgame touch input mobile ui save load resume performance responsive regression core loop';
const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();
const tokens=value=>new Set(lower(value).split(/[^\p{L}\p{N}_./-]+/u).filter(token=>token.length>1));
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function listJson(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(name=>name.endsWith('.json')).sort().map(name=>({file:path.join(dir,name),record:readJson(path.join(dir,name))})).filter(item=>item.record);}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);}
function parseArgs(argv){const args={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))continue;const [key,inline]=arg.slice(2).split('=',2);args[key]=inline??argv[++i];}return args;}
function taskForFailure(entry){const type=clean(entry.taskType).toLowerCase();return TASK_TYPES.includes(type)?type:'general';}
function overlapScore(left,right){const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;let hit=0;for(const token of a)if(b.has(token))hit+=1;return hit/Math.max(1,a.size);}
function sharedSources(a,b){const right=new Set(b.sourcePaths||[]);return [...new Set((a.sourcePaths||[]).filter(sourcePath=>right.has(sourcePath)))].sort();}
function causalPairScore(success,failure){const sources=sharedSources(success,failure),requestScore=overlapScore(success.request,failure.request);if(!sources.length&&requestScore<.34)return null;const score=Math.min(1,(sources.length?0.55:0)+requestScore*.3+(success.project===failure.project?0.1:0)+(success.taskType===failure.taskType?0.05:0));return{sources,requestScore:Number(requestScore.toFixed(4)),score:Number(score.toFixed(4))};}

export function buildCausalCodingLessons(index){
  if(index?.authority!=='verified-rag-memory-index')throw new Error('verified memory index required');
  const lessons=[];
  for(const success of index.positive){
    const taskType=TASK_TYPES.includes(success.taskType)?success.taskType:'general',project=clean(success.project)||'shared';
    for(const failure of index.failureWarnings){
      if(taskForFailure(failure)!==taskType||(clean(failure.project)||'shared')!==project)continue;
      const pair=causalPairScore(success,failure);if(!pair)continue;
      const failureClass=clean(failure.failureClass)||'UNKNOWN';
      lessons.push(Object.freeze({
        id:`causal-${success.id}-${failure.id}`.replace(/[^A-Za-z0-9._-]+/g,'-'),
        taskType,
        project,
        verifiedSuccessRefs:Object.freeze([success.id]),
        observedFailureRefs:Object.freeze([failure.id]),
        failureClasses:Object.freeze([failureClass]),
        sourcePaths:Object.freeze(pair.sources.length?pair.sources:[...new Set([...(success.sourcePaths||[]),...(failure.sourcePaths||[])])].sort()),
        requestSimilarity:pair.requestScore,
        contrastScore:pair.score,
        confidence:Number(Math.min(.95,.55+pair.score*.4).toFixed(2)),
        inference:'VERIFIED_SUCCESS_WITH_OBSERVED_FAILURE_CONTRAST',
        useRule:'prefer-verified-success-patterns-and-avoid-observed-failure-classes',
        positiveTrainingAllowed:false,
        authority:'causal-coding-retrieval-context-only'
      }));
    }
  }
  const dedup=new Map();for(const lesson of lessons)if(!dedup.has(lesson.id))dedup.set(lesson.id,lesson);
  return Object.freeze([...dedup.values()].sort((a,b)=>b.confidence-a.confidence||b.contrastScore-a.contrastScore||a.id.localeCompare(b.id)));
}

function trajectoryVerifiedForCapability(record={}){
  const e=record.finalEvidence||{};
  return clean(record.outcome)==='VERIFIED_WINNER'
    && e.runtimePass===true
    && e.qaPassed===true
    && e.regressionPassed===true
    && e.exactRevision===true
    && e.protectedStatePreserved!==false;
}
export function buildCapabilityDistillation(trajectories=[]){
  const traces=[];
  for(const record of trajectories||[]){
    const trace=record?.observableCodingTrace;
    if(!trajectoryVerifiedForCapability(record))continue;
    if(!trace||clean(trace.boundary)!=='OBSERVABLE_ACTIONS_AND_EVIDENCE_ONLY')continue;
    const trajectoryId=clean(record.trajectoryId)||`trajectory-${traces.length+1}`;
    const project=clean(record.metadata?.project||record.metadata?.gameId)||'shared';
    const taskType=TASK_TYPES.includes(lower(record.metadata?.taskType))?lower(record.metadata?.taskType):'general';
    const sourceRevision=clean(record.metadata?.sourceRevision||record.finalEvidence?.sourceRevision);
    const steps=(Array.isArray(trace.steps)?trace.steps:[]).map(step=>({
      stage:clean(step?.stage).toUpperCase(),
      action:clean(step?.action),
      outcome:clean(step?.outcome).toUpperCase(),
      failureClass:clean(step?.failureClass).toUpperCase(),
      capabilityDomain:clean(step?.capabilityDomain).toUpperCase(),
    }));
    traces.push({trajectoryId,project,taskType,sourceRevision,domains:[...new Set((trace.capabilityDomains||[]).map(value=>clean(value).toUpperCase()).filter(Boolean))],steps});
  }
  const grouped=new Map();
  for(const trace of traces){
    for(const domain of trace.domains){
      if(!grouped.has(domain))grouped.set(domain,[]);
      grouped.get(domain).push(trace);
    }
  }
  const patterns=[...grouped.entries()].map(([domain,rows])=>{
    const trajectoryRefs=[...new Set(rows.map(row=>row.trajectoryId))].sort();
    const sourceRevisions=[...new Set(rows.map(row=>row.sourceRevision).filter(Boolean))].sort();
    const projects=[...new Set(rows.map(row=>row.project).filter(Boolean))].sort();
    const taskTypes=[...new Set(rows.map(row=>row.taskType).filter(Boolean))].sort();
    const observedActions=[...new Set(rows.flatMap(row=>row.steps.filter(step=>step.capabilityDomain===domain||!step.capabilityDomain).map(step=>step.action).filter(Boolean)))].sort();
    const observedFailureClasses=[...new Set(rows.flatMap(row=>row.steps.map(step=>step.failureClass).filter(Boolean)))].sort();
    const repeatedIndependent=trajectoryRefs.length>=2&&sourceRevisions.length>=2;
    return Object.freeze({
      id:`capability-${domain.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
      domain,
      state:repeatedIndependent?'REPEATED_VERIFIED':'OBSERVED_VERIFIED',
      supportingTrajectoryRefs:Object.freeze(trajectoryRefs),
      sourceRevisions:Object.freeze(sourceRevisions),
      projects:Object.freeze(projects),
      taskTypes:Object.freeze(taskTypes),
      observedActions:Object.freeze(observedActions),
      observedFailureClasses:Object.freeze(observedFailureClasses),
      confidence:repeatedIndependent?.82:.64,
      reuseRule:'ADVISORY_ONLY_REVALIDATE_ON_FRESH_TASK',
      positiveTrainingAllowed:false,
      directPromotionAllowed:false,
      rawPatchReuseAllowed:false,
      hiddenReasoningRequired:false,
      authority:'capability-distillation-retrieval-context-only'
    });
  }).sort((a,b)=>b.supportingTrajectoryRefs.length-a.supportingTrajectoryRefs.length||a.domain.localeCompare(b.domain));
  return Object.freeze({
    version:1,
    state:'OBSERVABLE_TRACE_DISTILLATION',
    verifiedTraceCount:traces.length,
    patternCount:patterns.length,
    patterns:Object.freeze(patterns),
    policy:Object.freeze({
      verifiedWinnerOnly:true,
      hiddenReasoningPersisted:false,
      rawPatchReuseAllowed:false,
      freshTaskQaRequired:true,
      automaticPromotionAllowed:false,
      executionAuthorityChanged:false,
      canonicalPipelineOnly:true
    }),
    authority:'capability-distillation-retrieval-context-only'
  });
}

export function buildPumpArtifacts({trainingSamples=[],trajectories=[],maxBenchmarks=64,maxRecombinationRecipes=64}={}){
  const failures=[];
  for(const trajectory of trajectories){
    for(const candidate of trajectory?.candidates||[]){
      if(candidate?.eligible!==true||candidate?.failure)failures.push({...candidate,request:trajectory.request,taskType:trajectory.metadata?.taskType,project:trajectory.metadata?.project});
    }
    for(const attempt of trajectory?.repairAttempts||[]){if(!attempt?.pass)failures.push({...attempt,request:trajectory.request,taskType:trajectory.metadata?.taskType,project:trajectory.metadata?.project});}
  }
  const index=buildVibeVerifiedMemoryIndex({trainingSamples,trajectories,failures});
  const causalLessons=buildCausalCodingLessons(index);
  const capabilityDistillation=buildCapabilityDistillation(trajectories);
  const playbooks={version:1,generation:'V3-PUMP',generatedFrom:'VERIFIED_MEMORY_ONLY',taskTypes:{},policy:{localWeightTrainingRequired:false,paidApiRequired:false,benchmarkCountsAsTrainingSample:false,portableWebContextForRoblox:true,platformEvidenceTransferAllowed:false}};
  for(const taskType of TASK_TYPES){
    const query=`${taskType} verified implementation repair QA patterns${taskType==='roblox'?` ${PORTABLE_WEB_QUERY}`:''}`;
    const retrieval=retrieveVibeVerifiedPatterns({index,request:query,taskType,topKSuccess:8,topKFailure:6});
    const base=createVibeTaskPlaybook({taskType,retrieval});
    playbooks.taskTypes[taskType]=Object.freeze({...base,causalLessons:Object.freeze(causalLessons.filter(item=>item.taskType===taskType).slice(0,8))});
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
  const benchmark={version:1,generation:'V3-PUMP',state:'READY',hourlyRefresh:true,executionAuthority:'EXISTING_VIBE_DEVELOPMENT_PIPELINE_ONLY',localWeightTrainingRequired:false,countsAsTrainingSample:false,cases,policy:{noAutoSuccess:true,noFabricatedEvidence:true,noParallelPipeline:true,noPaidApi:true,noGitHubHostedModelTraining:true}};
  const recombination=buildTransformativeRecombination({trainingSamples,maxRecipes:maxRecombinationRecipes});
  playbooks.causalCodingLearning={enabled:true,lessonCount:causalLessons.length,evidenceBoundary:'VERIFIED_SUCCESS_AND_OBSERVED_FAILURE_ONLY',directTraining:false,authority:'causal-coding-retrieval-context-only'};
  playbooks.capabilityDistillation=capabilityDistillation;
  playbooks.transformativeRecombination={enabled:true,materialCount:recombination.materials.length,recipeCount:recombination.recipes.length,minimumDistinctProjects:2,originalModifierRequired:true,rawSourceOutputAllowed:false,rawAssetOutputAllowed:false,authority:'transformative-recombination-context-only'};
  return {index,playbooks,benchmark,recombination,causalLessons,capabilityDistillation};
}

export function refreshPumpFiles({sampleDir='company-learning/training-samples',trajectoryDir='company-learning/vibe3-trajectories',memoryOut='company-learning/vibe3-memory-index.json',playbooksOut='company-learning/vibe3-task-playbooks.json',benchmarkOut='company-learning/vibe3-benchmark-queue.json',recombinationOut='company-learning/vibe3-recombination-memory.json',maxBenchmarks=64,maxRecombinationRecipes=64}={}){
  const sampleItems=listJson(sampleDir),trajectoryItems=listJson(trajectoryDir),artifacts=buildPumpArtifacts({trainingSamples:sampleItems.map(item=>item.record),trajectories:trajectoryItems.map(item=>item.record),maxBenchmarks,maxRecombinationRecipes});
  const memory={...artifacts.index,sourceFiles:{trainingSamples:sampleItems.map(item=>item.file),trajectories:trajectoryItems.map(item=>item.file)},refresh:{mode:'HOURLY_24H',workflow:'Vibe2 Distillation Sample Ingest',localWeightTrainingRequired:false}};
  writeJson(memoryOut,memory);writeJson(playbooksOut,artifacts.playbooks);writeJson(benchmarkOut,artifacts.benchmark);writeJson(recombinationOut,artifacts.recombination);
  return {version:1,state:'PASS',trainingSamplesExamined:sampleItems.length,trajectoriesExamined:trajectoryItems.length,verifiedPositiveMemory:memory.positive.length,failureWarnings:memory.failureWarnings.length,causalCodingLessons:artifacts.causalLessons.length,capabilityTraces:artifacts.capabilityDistillation.verifiedTraceCount,capabilityPatterns:artifacts.capabilityDistillation.patternCount,playbooks:Object.keys(artifacts.playbooks.taskTypes).length,benchmarks:artifacts.benchmark.cases.length,recombinationMaterials:artifacts.recombination.materials.length,recombinationRecipes:artifacts.recombination.recipes.length,outputs:{memoryOut,playbooksOut,benchmarkOut,recombinationOut}};
}

function main(){const a=parseArgs(process.argv.slice(2));const result=refreshPumpFiles({sampleDir:a['sample-dir'],trajectoryDir:a['trajectory-dir'],memoryOut:a['memory-out'],playbooksOut:a['playbooks-out'],benchmarkOut:a['benchmark-out'],recombinationOut:a['recombination-out'],maxBenchmarks:a['max-benchmarks'],maxRecombinationRecipes:a['max-recombination-recipes']});console.log(JSON.stringify(result));}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(isMain){try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}