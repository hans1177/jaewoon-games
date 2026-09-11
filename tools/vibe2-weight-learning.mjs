// 파일명: tools/vibe2-weight-learning.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { qaEvidencePasses, qaRequirementsForTask } from './vibe2-training-sample.mjs';

const DATASET_VERSION = 3;
const DEFAULT_SEED = 20260910;
const REQUIRED_QA = Object.freeze({ independentQa: 'PASS', browserQa: 'PASS' });
const ACTIVE_LIFECYCLES = new Set(['active']);
const TASK_TYPES = Object.freeze(['coding', 'bugfix', 'unity', 'qa', 'planning', 'general']);
const DIFFICULTY_ORDER = Object.freeze(['simple', 'bug', 'regression', 'unity-build']);
const FAILURE_TAXONOMY = Object.freeze(['BUILD', 'SIGNING', 'NULL', 'SAVE', 'UI', 'COMBAT_LOGIC', 'ROUTING', 'MODEL_RUNTIME', 'OTHER']);
const RULE_PRIORITY = Object.freeze(['LATEST_USER', 'AGENTS', 'PROJECT_RULES', 'VERIFIED_LEARNING', 'BASE_MODEL']);
const DIFFICULT_TEACHER_TASKS = new Set(['bugfix', 'unity', 'qa']);
const DIFFICULT_LEVELS = new Set(['bug', 'regression', 'unity-build']);

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
function normalizeText(value) { return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}_./:-]+/gu, ' ').trim(); }
function tokenSet(value) { return new Set(normalizeText(value).split(' ').filter((token) => token.length > 1)); }
function jaccard(a, b) { const left=tokenSet(a),right=tokenSet(b); if(!left.size&&!right.size)return 1; let intersection=0; for(const token of left)if(right.has(token))intersection+=1; return intersection/(left.size+right.size-intersection||1); }
function contentFingerprint(sample) { return normalizeText(`${sample.instruction}\n${sample.input}\n${sample.output}`); }

function inferTaskType(record) {
  const explicit = String(record?.taskType ?? record?.trainingSample?.taskType ?? '').toLowerCase();
  if (TASK_TYPES.includes(explicit)) return explicit;
  const text = normalizeText(`${record?.instruction ?? record?.trainingSample?.instruction ?? ''} ${record?.goal ?? ''} ${record?.role ?? ''}`);
  const scores = {
    unity: /(unity|android|gradle|apk|scene|prefab)/.test(text) ? 3 : 0,
    qa: /(qa|test|검증|테스트|회귀)/.test(text) ? 3 : 0,
    planning: /(기획|스토리|설계|planning|artbook)/.test(text) ? 3 : 0,
    bugfix: /(버그|fix|오류|고쳐|재현)/.test(text) ? 3 : 0,
    coding: /(코드|구현|function|class|javascript|python)/.test(text) ? 2 : 0,
  };
  const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]); return sorted[0][1]>0?sorted[0][0]:'general';
}

function normalizeQa(record) {
  const qa = record?.qa && typeof record.qa === 'object' ? record.qa : {};
  const trace = record?.verification?.trace ?? record?.provenance?.verificationTrace ?? {};
  return {
    independentQa: String(qa.independentQa ?? qa.independent ?? record?.independentQa ?? trace.independentQa ?? '').toUpperCase(),
    browserQa: String(qa.browserQa ?? qa.browser ?? record?.browserQa ?? record?.verification?.browserQa ?? '').toUpperCase(),
    runtime: String(qa.runtime ?? record?.runtime ?? record?.verification?.runtime ?? trace.runtime ?? '').toUpperCase(),
  };
}

export function isVerifiedPass(record) {
  const qa=normalizeQa(record); const taskType=inferTaskType(record);
  return qaEvidencePasses({ taskType, independentQa:qa.independentQa, browserQa:qa.browserQa, runtime:qa.runtime || 'PASS' });
}

export function qualityScore(record) {
  const quality=record?.quality&&typeof record.quality==='object'?record.quality:{};
  const codeQuality=clamp01(quality.codeQuality??record?.codeQuality??1);
  const noRegression=(quality.noRegression??record?.noRegression??true)===true?1:0;
  const playImprovement=clamp01(quality.playImprovement??record?.playImprovement??1);
  const ruleCompliance=clamp01(quality.ruleCompliance??record?.ruleCompliance??1);
  return (codeQuality+noRegression+playImprovement+ruleCompliance)/4;
}

export function classifyFailure(value) {
  const text=String(value?.failureType??value?.error??value?.message??value??'').toLowerCase();
  if(/sign|keystore|서명/.test(text))return'SIGNING'; if(/build|compile|gradle|빌드/.test(text))return'BUILD'; if(/null|undefined|nullpointer/.test(text))return'NULL';
  if(/save|storage|저장/.test(text))return'SAVE'; if(/ui|viewport|overflow|touch|button|화면|버튼/.test(text))return'UI'; if(/combat|damage|attack|battle|전투|공격|데미지/.test(text))return'COMBAT_LOGIC';
  if(/route|adapter|라우팅/.test(text))return'ROUTING'; if(/oom|timeout|cuda|model|ollama/.test(text))return'MODEL_RUNTIME'; return'OTHER';
}

export function routeAdapter(work, registry={}, {minConfidence=0.6}={}) {
  const explicit=String(work?.taskType??'').toLowerCase(); const text=normalizeText(`${work?.goal??''} ${work?.role??''} ${work?.diagnostic?.type??''} ${work?.sourcePath??''}`);
  const scores=new Map(TASK_TYPES.map((type)=>[type,0])); if(TASK_TYPES.includes(explicit))scores.set(explicit,5);
  const bump=(type,pattern,points=2)=>{if(pattern.test(text))scores.set(type,scores.get(type)+points);};
  bump('unity',/(unity|android|gradle|apk|scene|prefab)/,3); bump('qa',/(qa|test|검증|회귀|smoke)/,3); bump('planning',/(planning|기획|artbook|설계)/,3); bump('bugfix',/(bug|fix|오류|재현|failure|null|crash)/,3); bump('coding',/(개발|구현|code|function|script)/,2);
  const ranked=[...scores.entries()].sort((a,b)=>b[1]-a[1]); const best=ranked[0],second=ranked[1]; const confidence=best[1]<=0?0:Math.min(1,(best[1]-second[1]+1)/(best[1]+1));
  const taskType=confidence>=minConfidence?best[0]:'general'; const record=registry?.[taskType]??registry?.general??null; const allowed=record&&['PROMOTED','CANARY'].includes(String(record.status??'').toUpperCase());
  return{taskType,confidence,fallback:!allowed||confidence<minConfidence,adapter:allowed?record.path??record.name??null:null,status:allowed?String(record.status).toUpperCase():'BASELINE'};
}

function inferDifficulty(record) { const explicit=String(record?.difficulty??record?.trainingSample?.difficulty??'').toLowerCase(); if(DIFFICULTY_ORDER.includes(explicit))return explicit; const text=normalizeText(`${record?.instruction??''} ${record?.goal??''} ${record?.diagnostic?.type??''}`); if(/(unity|gradle|apk|build|빌드)/.test(text))return'unity-build'; if(/(regression|회귀|복합)/.test(text))return'regression'; if(/(bug|오류|버그|fix)/.test(text))return'bug'; return'simple'; }
function normalizeLifecycle(record){const value=String(record?.lifecycle??record?.trainingSample?.lifecycle??'active').toLowerCase();return['active','deprecated','obsolete'].includes(value)?value:'active';}
function sourceKindOf(record){return String(record?.provenance?.sourceKind??record?.sourceKind??(record?.teacher?'teacher':'vibe2')).toLowerCase();}
function isSynthetic(record){const sourceKind=sourceKindOf(record);return['teacher','synthetic','ai'].includes(sourceKind)||record?.synthetic===true;}
export function isTeacherEligible(record){if(!isSynthetic(record))return true;const sourceKind=sourceKindOf(record);if(sourceKind!=='teacher'&&record?.teacher!==true)return true;return DIFFICULT_TEACHER_TASKS.has(inferTaskType(record))&&DIFFICULT_LEVELS.has(inferDifficulty(record));}

function normalizeSample(record,sourceFile,index){
  const sample=record?.trainingSample&&typeof record.trainingSample==='object'?record.trainingSample:record; const instruction=String(sample?.instruction??'').trim(),input=String(sample?.input??'').trim(),output=String(sample?.output??'').trim();
  if(!instruction||!output||!isVerifiedPass(record))return null; const sourceRevision=String(record?.provenance?.sourceRevision??record?.sourceRevision??record?.sourceCommit??record?.candidateCommit??'').trim(); if(!sourceRevision)return null;
  const sourceKind=String(record?.provenance?.sourceKind??record?.sourceKind??(record?.teacher?'teacher':'vibe2')).trim()||'vibe2'; const qa=normalizeQa(record); const taskType=inferTaskType(record);
  const normalized={instruction,input,output,taskType,difficulty:inferDifficulty(record),lifecycle:normalizeLifecycle(record),synthetic:isSynthetic(record),qualityScore:qualityScore(record),ruleVersion:String(record?.ruleVersion??record?.provenance?.ruleVersion??'current'),project:String(record?.project??record?.gameId??record?.provenance?.gameId??'shared'),provenance:{sourceFile,sourceIndex:index,sourceKind,sourceRevision,candidateId:record?.candidateId??null,gameId:record?.gameId??null,teacherId:record?.teacherId??null},qa:{...qa,requirements:qaRequirementsForTask(taskType)}};
  normalized.contentHash=sha256(contentFingerprint(normalized)); normalized.sampleId=sha256(stableStringify(normalized)); return normalized;
}
function splitScore(sampleId,seed,namespace='train-eval'){return Number.parseInt(sha256(`${namespace}:${seed}:${sampleId}`).slice(0,12),16)/0xffffffffffff;}
function nearDuplicate(a,b,threshold){return a.contentHash===b.contentHash||jaccard(contentFingerprint(a),contentFingerprint(b))>=threshold;}

export function detectContamination(groups,{similarityThreshold=0.92}={}){const names=Object.keys(groups),collisions=[];for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)for(const left of groups[names[i]]??[])for(const right of groups[names[j]]??[])if(nearDuplicate(left,right,similarityThreshold))collisions.push({leftSplit:names[i],rightSplit:names[j],leftId:left.sampleId,rightId:right.sampleId});return{pass:collisions.length===0,collisions,contaminationRate:collisions.length/Math.max(1,Object.values(groups).flat().length)};}
export function summarizeDiversity(samples){const projectCounts={},taskTypeCounts={};for(const sample of samples){projectCounts[sample.project]=(projectCounts[sample.project]??0)+1;taskTypeCounts[sample.taskType]=(taskTypeCounts[sample.taskType]??0)+1;}const total=samples.length;return{distinctProjects:Object.keys(projectCounts).length,distinctTaskTypes:Object.keys(taskTypeCounts).length,maxProjectShare:total?Math.max(0,...Object.values(projectCounts))/total:0,maxTaskTypeShare:total?Math.max(0,...Object.values(taskTypeCounts))/total:0,projectCounts,taskTypeCounts};}
export function buildTaskTrainingPlan(samples,{minSamplesPerTask=8,minProjectsPerTask=2,syntheticRatioCap=0.5}={}){const plan={};for(const taskType of TASK_TYPES){const rows=samples.filter((sample)=>sample.taskType===taskType),projects=new Set(rows.map((sample)=>sample.project)),synthetic=rows.filter((sample)=>sample.synthetic).length,syntheticShare=rows.length?synthetic/rows.length:0;plan[taskType]={samples:rows.length,distinctProjects:projects.size,syntheticShare,ready:rows.length>=minSamplesPerTask&&projects.size>=minProjectsPerTask&&syntheticShare<=syntheticRatioCap};}return plan;}

export function buildDataset(recordsWithSource,options={}){
  const{seed=DEFAULT_SEED,evalRatio=0.15,holdoutRatio=0.15,qualityThreshold=0.75,similarityThreshold=0.92,syntheticRatioCap=0.5,minTrainSamples=1,minFreshTrainSamples=0,minDistinctProjects=1,minDistinctTaskTypes=1,maxProjectShare=1,targetTaskType='',teacherOnlyDifficult=true,replay=[],taskPlanMinSamples=8,taskPlanMinProjects=2}=options;
  if(!(evalRatio>0&&holdoutRatio>0&&evalRatio+holdoutRatio<1))throw new Error('evalRatio/holdoutRatio 합은 0과 1 사이여야 함'); if(targetTaskType&&!TASK_TYPES.includes(targetTaskType))throw new Error(`unknown task type: ${targetTaskType}`);
  const accepted=[];let skippedUnverified=0,skippedIncomplete=0,skippedQuality=0,skippedLifecycle=0,skippedTeacherSimple=0,skippedTaskType=0;
  for(const{record,sourceFile,index}of recordsWithSource){if(!isVerifiedPass(record)){skippedUnverified++;continue;}if(teacherOnlyDifficult&&!isTeacherEligible(record)){skippedTeacherSimple++;continue;}const sample=normalizeSample(record,sourceFile,index);if(!sample){skippedIncomplete++;continue;}if(!ACTIVE_LIFECYCLES.has(sample.lifecycle)){skippedLifecycle++;continue;}if(sample.qualityScore<qualityThreshold){skippedQuality++;continue;}if(targetTaskType&&sample.taskType!==targetTaskType){skippedTaskType++;continue;}accepted.push(sample);}
  const exact=[...new Map(accepted.map((sample)=>[sample.contentHash,sample])).values()].sort((a,b)=>a.sampleId.localeCompare(b.sampleId)),deduped=[];for(const sample of exact)if(!deduped.some((existing)=>nearDuplicate(existing,sample,similarityThreshold)))deduped.push(sample);
  const holdout=[],evalSet=[],trainFresh=[];for(const sample of deduped){const score=splitScore(sample.sampleId,seed,'fixed-holdout');if(score<holdoutRatio)holdout.push(sample);else if(score<holdoutRatio+evalRatio)evalSet.push(sample);else trainFresh.push(sample);}
  const eligibleReplay=replay.filter((sample)=>sample?.lifecycle==='active'&&qaEvidencePasses({taskType:sample.taskType,independentQa:sample?.qa?.independentQa,browserQa:sample?.qa?.browserQa,runtime:sample?.qa?.runtime||'PASS'})).filter((sample)=>!targetTaskType||sample.taskType===targetTaskType).filter((sample)=>!holdout.some((item)=>nearDuplicate(item,sample,similarityThreshold))&&!evalSet.some((item)=>nearDuplicate(item,sample,similarityThreshold)));
  const replayLimit=Math.min(eligibleReplay.length,Math.floor(trainFresh.length*0.25));const selectedReplay=[...eligibleReplay].sort((a,b)=>splitScore(a.sampleId,seed,'replay')-splitScore(b.sampleId,seed,'replay')).slice(0,replayLimit);
  let train=[...trainFresh,...selectedReplay];const synthetic=train.filter((sample)=>sample.synthetic),real=train.filter((sample)=>!sample.synthetic),maxSynthetic=real.length===0?0:Math.floor((real.length*syntheticRatioCap)/Math.max(1e-9,1-syntheticRatioCap));if(synthetic.length>maxSynthetic)train=[...real,...synthetic.sort((a,b)=>b.qualityScore-a.qualityScore).slice(0,maxSynthetic)].sort((a,b)=>a.sampleId.localeCompare(b.sampleId));
  const contamination=detectContamination({train,eval:evalSet,holdout},{similarityThreshold}),diversity=summarizeDiversity(train),requiredTaskTypes=targetTaskType?1:minDistinctTaskTypes,diversityPass=diversity.distinctProjects>=minDistinctProjects&&diversity.distinctTaskTypes>=requiredTaskTypes&&diversity.maxProjectShare<=maxProjectShare,batchingPass=train.length>=minTrainSamples&&trainFresh.length>=minFreshTrainSamples,readyForTraining=contamination.pass&&batchingPass&&diversityPass&&evalSet.length>0&&holdout.length>0;
  return{train,eval:evalSet,holdout,contamination,diversity:{...diversity,pass:diversityPass},batching:{pass:batchingPass,minTrainSamples,minFreshTrainSamples,trainSamples:train.length,freshTrainSamples:trainFresh.length},taskTrainingPlan:buildTaskTrainingPlan(train,{minSamplesPerTask:taskPlanMinSamples,minProjectsPerTask:taskPlanMinProjects,syntheticRatioCap}),readyForTraining,curriculum:DIFFICULTY_ORDER.map((difficulty)=>({difficulty,count:train.filter((sample)=>sample.difficulty===difficulty).length})),stats:{seen:recordsWithSource.length,accepted:deduped.length,train:train.length,eval:evalSet.length,holdout:holdout.length,freshTrain:trainFresh.length,replay:selectedReplay.length,skippedUnverified,skippedIncomplete,skippedQuality,skippedLifecycle,skippedTeacherSimple,skippedTaskType,duplicatesRemoved:accepted.length-deduped.length,syntheticTrain:train.filter((sample)=>sample.synthetic).length,deprecatedUsed:train.some((sample)=>sample.lifecycle!=='active')}};
}

export function computeLearningMetrics(runs){const total=runs.length;if(!total)return{sampleCount:0,successRate:0,firstAttemptQaPassRate:0,repeatedErrorRecurrenceRate:0,averageFixIterations:0,ruleComplianceRate:0,averageRuntimeMs:0,averageMemoryMb:0,averageRetries:0};const sum=(key)=>runs.reduce((totalValue,run)=>totalValue+Math.max(0,Number(run[key])||0),0);return{sampleCount:total,successRate:runs.filter((run)=>run.success===true).length/total,firstAttemptQaPassRate:runs.filter((run)=>run.firstAttemptQaPass===true).length/total,repeatedErrorRecurrenceRate:runs.filter((run)=>run.sameErrorRecurred===true).length/total,averageFixIterations:sum('fixIterations')/total,ruleComplianceRate:runs.filter((run)=>run.ruleCompliant===true).length/total,averageRuntimeMs:sum('runtimeMs')/total,averageMemoryMb:sum('memoryMb')/total,averageRetries:sum('retries')/total};}
export function evaluateAdapter(baseline,candidate,{minGain=0.02,maxRuntimeRatio=1.5,maxMemoryRatio=1.5,canary=null,requireCanary=true,minimumEvaluationSamples=0}={}){const higherBetter=['successRate','firstAttemptQaPassRate','ruleComplianceRate'],lowerBetter=['repeatedErrorRecurrenceRate','averageFixIterations','averageRetries'],regressions=[];let gain=0;for(const key of higherBetter){const delta=Number(candidate[key]??0)-Number(baseline[key]??0);if(delta< -1e-9)regressions.push(key);gain+=delta;}for(const key of lowerBetter){const delta=Number(baseline[key]??0)-Number(candidate[key]??0);if(delta< -1e-9)regressions.push(key);gain+=delta;}if(minimumEvaluationSamples>0){if(Number(baseline.sampleCount??0)<minimumEvaluationSamples)regressions.push('baselineSampleCount');if(Number(candidate.sampleCount??0)<minimumEvaluationSamples)regressions.push('candidateSampleCount');}const runtimeRatio=Number(baseline.averageRuntimeMs)>0?Number(candidate.averageRuntimeMs)/Number(baseline.averageRuntimeMs):1,memoryRatio=Number(baseline.averageMemoryMb)>0?Number(candidate.averageMemoryMb)/Number(baseline.averageMemoryMb):1;if(runtimeRatio>maxRuntimeRatio)regressions.push('runtimeEfficiency');if(memoryRatio>maxMemoryRatio)regressions.push('memoryEfficiency');if(requireCanary&&!canary)regressions.push('canaryRequired');if(canary&&(Number(canary.regressions??0)>0||canary.ruleCompliance===false||Number(canary.samples??0)<Number(canary.minimumSamples??1)||Number(canary.failureRate??0)>Number(canary.maxFailureRate??0)))regressions.push('canary');const averageGain=gain/(higherBetter.length+lowerBetter.length),verdict=regressions.length===0&&averageGain>=minGain?'PROMOTE':'REJECT';return{verdict,averageGain,minGain,regressions:[...new Set(regressions)],runtimeRatio,memoryRatio,deploymentAction:verdict==='PROMOTE'?'PROMOTE':canary?'ROLLBACK_TO_BASELINE':'KEEP_BASELINE',rollbackRequired:verdict!=='PROMOTE'&&Boolean(canary)};}
export function shouldAbortTraining(signal={}){const reasons=[];if(signal.oom===true)reasons.push('OOM');if(signal.regressionFailure===true)reasons.push('REGRESSION');if(Number(signal.lossRatio??1)>2)reasons.push('LOSS_SPIKE');if(Number(signal.evalDelta??0)<-0.05)reasons.push('EVAL_DROP');if(Number(signal.recurrenceDelta??0)>0.02)reasons.push('RECURRENCE_UP');if(Number(signal.ruleComplianceDelta??0)<-0.01)reasons.push('RULE_COMPLIANCE_DROP');return{abort:reasons.length>0,reasons,rollback:reasons.length>0};}
export function buildLineage({adapterVersion,baseModel='Qwen/Qwen3-1.7B',datasetManifest={},teacher=null,training={},evaluation={},parentAdapter=null}){return{version:2,adapterVersion,baseModel,parentAdapter,taskType:training.taskType??datasetManifest.targetTaskType??'general',datasetVersion:datasetManifest.version??null,trainSha256:datasetManifest.trainSha256??null,evalSha256:datasetManifest.evalSha256??null,holdoutSha256:datasetManifest.holdoutSha256??null,teacher,seed:training.seed??datasetManifest.seed??DEFAULT_SEED,training,evaluation,rulePriority:RULE_PRIORITY,createdAt:new Date().toISOString()};}

function readRecords(filePath){const raw=fs.readFileSync(filePath,'utf8').trim();if(!raw)return[];if(filePath.endsWith('.jsonl'))return raw.split(/\r?\n/).filter(Boolean).map((line)=>JSON.parse(line));const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed;if(Array.isArray(parsed.samples))return parsed.samples;return[parsed];}
function collectInputFiles(inputPaths){const files=[];const visit=(entry)=>{const stat=fs.statSync(entry);if(stat.isDirectory()){for(const name of fs.readdirSync(entry).sort())visit(path.join(entry,name));return;}if(/\.jsonl?$/.test(entry))files.push(entry);};for(const inputPath of inputPaths)visit(inputPath);return files;}
function writeJsonl(filePath,rows){fs.mkdirSync(path.dirname(filePath),{recursive:true});fs.writeFileSync(filePath,rows.map((row)=>JSON.stringify(row)).join('\n')+(rows.length?'\n':''));}
function parseArgs(argv){const[command,...rest]=argv,args={command,input:[]};for(let i=0;i<rest.length;i++){const arg=rest[i];if(arg==='--input')args.input.push(rest[++i]);else if(arg.startsWith('--input='))args.input.push(arg.slice(8));else if(arg.startsWith('--')){const[key,inline]=arg.slice(2).split('=',2);args[key]=inline??rest[++i];}}return args;}
function loadReplay(file){if(!file||!fs.existsSync(file))return[];return readRecords(file);}function asBool(value,defaultValue){if(value===undefined)return defaultValue;return String(value).toLowerCase()!=='false';}
function runDataset(args){if(!args.input.length)throw new Error('dataset requires at least one --input');const outDir=args.out||'vibe2-learning/datasets/latest',seed=Number(args.seed??DEFAULT_SEED),targetTaskType=String(args['task-type']??''),files=collectInputFiles(args.input),recordsWithSource=files.flatMap((file)=>readRecords(file).map((record,index)=>({record,sourceFile:path.relative(process.cwd(),file),index})));const dataset=buildDataset(recordsWithSource,{seed,evalRatio:Number(args['eval-ratio']??0.15),holdoutRatio:Number(args['holdout-ratio']??0.15),qualityThreshold:Number(args['quality-threshold']??0.75),similarityThreshold:Number(args['similarity-threshold']??0.92),syntheticRatioCap:Number(args['synthetic-ratio-cap']??0.5),minTrainSamples:Number(args['min-train-samples']??24),minFreshTrainSamples:Number(args['min-fresh-train-samples']??12),minDistinctProjects:Number(args['min-distinct-projects']??2),minDistinctTaskTypes:Number(args['min-distinct-task-types']??2),maxProjectShare:Number(args['max-project-share']??0.75),targetTaskType,teacherOnlyDifficult:asBool(args['teacher-only-difficult'],true),replay:loadReplay(args.replay),taskPlanMinSamples:Number(args['task-plan-min-samples']??8),taskPlanMinProjects:Number(args['task-plan-min-projects']??2)});writeJsonl(path.join(outDir,'train.jsonl'),dataset.train);writeJsonl(path.join(outDir,'eval.jsonl'),dataset.eval);writeJsonl(path.join(outDir,'holdout.jsonl'),dataset.holdout);const manifest={version:DATASET_VERSION,createdAt:new Date().toISOString(),seed,targetTaskType:targetTaskType||null,qaRequirement:targetTaskType?qaRequirementsForTask(targetTaskType):{web:REQUIRED_QA,unity:qaRequirementsForTask('unity')},rulePriority:RULE_PRIORITY,failureTaxonomy:FAILURE_TAXONOMY,policy:{teacherOnlyDifficult:true,minTrainSamples:Number(args['min-train-samples']??24),minFreshTrainSamples:Number(args['min-fresh-train-samples']??12),minDistinctProjects:Number(args['min-distinct-projects']??2),minDistinctTaskTypes:targetTaskType?1:Number(args['min-distinct-task-types']??2),maxProjectShare:Number(args['max-project-share']??0.75),syntheticRatioCap:Number(args['synthetic-ratio-cap']??0.5)},sources:files.map((file)=>({file:path.relative(process.cwd(),file),sha256:sha256(fs.readFileSync(file))})),stats:dataset.stats,diversity:dataset.diversity,batching:dataset.batching,taskTrainingPlan:dataset.taskTrainingPlan,curriculum:dataset.curriculum,contamination:dataset.contamination,readyForTraining:dataset.readyForTraining,trainSha256:sha256(dataset.train.map(stableStringify).join('\n')),evalSha256:sha256(dataset.eval.map(stableStringify).join('\n')),holdoutSha256:sha256(dataset.holdout.map(stableStringify).join('\n'))};fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);console.log(JSON.stringify(manifest));if(!dataset.readyForTraining)process.exitCode=3;}
function runGate(args){const baseline=JSON.parse(fs.readFileSync(args.baseline,'utf8')),candidate=JSON.parse(fs.readFileSync(args.candidate,'utf8')),canary=args.canary?JSON.parse(fs.readFileSync(args.canary,'utf8')):null,result=evaluateAdapter(baseline,candidate,{minGain:Number(args['min-gain']??0.02),maxRuntimeRatio:Number(args['max-runtime-ratio']??1.5),maxMemoryRatio:Number(args['max-memory-ratio']??1.5),minimumEvaluationSamples:Number(args['min-evaluation-samples']??20),requireCanary:asBool(args['require-canary'],true),canary}),record={version:3,adapterVersion:args['adapter-version']||'unversioned',baselineVersion:args['baseline-version']||'unknown',taskType:args['task-type']||'general',baseline,candidate,canary,...result,evaluatedAt:new Date().toISOString()};if(args.out){fs.mkdirSync(path.dirname(args.out),{recursive:true});fs.writeFileSync(args.out,`${JSON.stringify(record,null,2)}\n`);}console.log(JSON.stringify(record));if(record.verdict!=='PROMOTE')process.exitCode=2;}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(isMain){const args=parseArgs(process.argv.slice(2));if(args.command==='dataset')runDataset(args);else if(args.command==='gate')runGate(args);else throw new Error('usage: vibe2-weight-learning.mjs dataset|gate ...');}
export{DATASET_VERSION,DEFAULT_SEED,REQUIRED_QA,TASK_TYPES,DIFFICULTY_ORDER,FAILURE_TAXONOMY,RULE_PRIORITY};
