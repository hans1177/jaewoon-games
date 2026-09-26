// 파일명: tools/vibe2-parallelism-telemetry.mjs
// 역할: Vibe2 병렬 실행의 동시성·대기시간과 실제 기능 완료량·변경량·재작업·QA 중복·package cycle time을 집계한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const round=v=>Math.round(num(v)*100)/100;
const parseTime=v=>{if(Number.isFinite(Number(v))&&Number(v)>0)return Number(v);const t=Date.parse(clean(v));return Number.isFinite(t)?t:0;};
const avg=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const p95=values=>{if(!values.length)return 0;const x=[...values].sort((a,b)=>a-b);return x[Math.min(x.length-1,Math.ceil(x.length*.95)-1)];};
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');};
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}

function peakConcurrency(rows){
  const events=[];
  for(const row of rows){
    const start=parseTime(row?.metrics?.workerStartedAt);const end=parseTime(row?.metrics?.workerFinishedAt);
    if(!start||!end||end<start)continue;
    events.push([start,1],[end+0.001,-1]);
  }
  events.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
  let active=0,peak=0;
  for(const [,delta] of events){active+=delta;peak=Math.max(peak,active);}
  return peak;
}
function durationStats(rows,key){const values=rows.map(row=>num(row?.metrics?.[key])).filter(v=>v>=0&&Number.isFinite(v));return{avgMs:round(avg(values)),p95Ms:round(p95(values)),maxMs:round(values.length?Math.max(...values):0)};}
function actionRunIds(rows){
  const ids=new Set();
  for(const row of rows){
    const direct=clean(row?.runId||row?.metrics?.runId);
    if(direct)ids.add(direct);
    for(const evidence of Array.isArray(row?.evidence)?row.evidence:[]){
      const match=/^actions-run:(.+)$/.exec(clean(evidence));
      if(match&&clean(match[1]))ids.add(clean(match[1]));
    }
  }
  return [...ids].sort();
}
function evidenceValues(row,prefix){return(Array.isArray(row?.evidence)?row.evidence:[]).map(clean).filter(value=>value.startsWith(prefix)).map(value=>value.slice(prefix.length)).filter(Boolean);}
function sourceGenerationFailureClass(row={}){
  if(clean(row?.outcome).toUpperCase()!=='FAIL')return'';
  const direct=clean(row?.candidateFailure?.class).toUpperCase();
  if(direct==='CANDIDATE_BRANCH_PUBLISH')return'';
  if(direct)return direct;
  const evidence=evidenceValues(row,'source-generation-failure:').map(value=>clean(value).toUpperCase()).filter(Boolean);
  if(evidence.length)return evidence.at(-1);
  const blocker=clean(row?.blocker).toLowerCase();
  if(blocker==='source-candidate-generation-failed'||blocker==='parallel-candidate-generation-failed')return'UNCLASSIFIED';
  return'';
}
function computeWorkload(rows,tasks=[]){
  const taskById=new Map((Array.isArray(tasks)?tasks:[]).map(task=>[clean(task?.id),task]));
  const uniqueTaskIds=[...new Set(rows.map(row=>clean(row?.taskId)).filter(Boolean))];
  const changedFileCount=rows.reduce((n,row)=>n+Math.max(0,num(row?.metrics?.changedFileCount)),0);
  const addedLineCount=rows.reduce((n,row)=>n+Math.max(0,num(row?.metrics?.addedLineCount)),0);
  const deletedLineCount=rows.reduce((n,row)=>n+Math.max(0,num(row?.metrics?.deletedLineCount)),0);
  const actualChangeMetricsKnown=rows.some(row=>Number.isFinite(Number(row?.metrics?.changedFileCount)));
  const reworkedTaskCount=uniqueTaskIds.filter(id=>Number(taskById.get(id)?.retries||0)>0).length;
  const reworkRatePct=uniqueTaskIds.length?round(reworkedTaskCount/uniqueTaskIds.length*100):0;
  const qaHashes=rows.flatMap(row=>evidenceValues(row,'incremental-qa-hash:'));
  const uniqueQaHashes=[...new Set(qaHashes)];
  const qaDuplicateRatePct=qaHashes.length?round(Math.max(0,qaHashes.length-uniqueQaHashes.length)/qaHashes.length*100):0;
  const prepMs=rows.reduce((n,row)=>n+Math.max(0,num(row?.metrics?.checkoutMs))+Math.max(0,num(row?.metrics?.modelPrepMs)),0);
  const workerMs=rows.reduce((n,row)=>n+Math.max(0,num(row?.metrics?.workerTotalMs)),0);
  const preparationRatioPct=workerMs?round(prepMs/workerMs*100):0;

  const resultByTask=new Map();
  for(const row of rows){
    const id=clean(row?.taskId);if(!id)continue;
    const outcome=clean(row?.outcome).toUpperCase();
    if(!resultByTask.has(id)||outcome==='PASS')resultByTask.set(id,outcome);
  }
  const packageIds=[...new Set(uniqueTaskIds.map(id=>clean(taskById.get(id)?.packageId)).filter(Boolean))];
  let completedFeatureCount=0;
  for(const packageId of packageIds){
    const members=(Array.isArray(tasks)?tasks:[]).filter(task=>clean(task?.packageId)===packageId);
    if(!members.length)continue;
    const complete=members.every(task=>clean(task.status)==='done'||resultByTask.get(clean(task.id))==='PASS');
    if(complete)completedFeatureCount+=1;
  }

  const cycles=new Map();
  for(const row of rows){
    const id=clean(row?.taskId);if(!id)continue;
    const task=taskById.get(id);
    const key=clean(task?.packageId)||`task:${id}`;
    const start=parseTime(row?.metrics?.workerStartedAt),end=parseTime(row?.metrics?.workerFinishedAt);
    if(!start||!end||end<start)continue;
    const current=cycles.get(key)||{start,end};
    current.start=Math.min(current.start,start);current.end=Math.max(current.end,end);cycles.set(key,current);
  }
  const cycleTimes=[...cycles.values()].map(row=>Math.max(0,row.end-row.start));
  return{
    completedFeatureCount,
    changedFileCount,
    addedLineCount,
    deletedLineCount,
    changedLineCount:addedLineCount+deletedLineCount,
    actualChangeMetricsKnown,
    reworkedTaskCount,
    reworkRatePct,
    qaRunCount:qaHashes.length,
    qaUniqueRunCount:uniqueQaHashes.length,
    qaDuplicateRatePct,
    preparationMs:prepMs,
    preparationRatioPct,
    packageCycleTime:{avgMs:round(avg(cycleTimes)),p95Ms:round(p95(cycleTimes)),maxMs:round(cycleTimes.length?Math.max(...cycleTimes):0),packageCount:cycleTimes.length}
  };
}

export function computeParallelismTelemetry(input={}){
  const rows=Array.isArray(input.results)?input.results:[];
  const externalWaveMax=256;
  const requestedMax=clamp(Math.floor(num(input.requestedMax||rows[0]?.metrics?.requestedMax||externalWaveMax)||externalWaveMax),1,externalWaveMax);
  const effectiveMax=clamp(Math.floor(num(input.effectiveMax||rows[0]?.metrics?.effectiveMax||requestedMax)||requestedMax),1,requestedMax);
  const taskCount=Math.max(0,Math.floor(num(input.taskCount||0)));
  const workerCount=rows.length;
  const runIds=actionRunIds(rows);
  const runId=runIds.length===1?runIds[0]:null;
  const starts=rows.map(row=>parseTime(row?.metrics?.workerStartedAt)).filter(Boolean);
  const queueWait=rows.map(row=>{const s=parseTime(row?.metrics?.workerStartedAt),r=parseTime(row?.metrics?.reservedAt);return s&&r&&s>=r?s-r:0;}).filter(v=>v>=0);
  const peak=peakConcurrency(rows);
  const cacheKnown=rows.filter(row=>typeof row?.metrics?.ollamaCacheHit==='boolean');
  const cacheHits=cacheKnown.filter(row=>row.metrics.ollamaCacheHit===true).length;
  const outcomes={PASS:0,FAIL:0,BLOCKED:0,OTHER:0};
  for(const row of rows){const key=clean(row?.outcome).toUpperCase();if(key in outcomes)outcomes[key]++;else outcomes.OTHER++;}
  const targetPeak=Math.min(workerCount,effectiveMax);
  const checkout=durationStats(rows,'checkoutMs');
  const candidate=durationStats(rows,'candidateMs');
  const qa=durationStats(rows,'qaMs');
  const workerTotal=durationStats(rows,'workerTotalMs');
  const workload=computeWorkload(rows,input.tasks||[]);
  const waveStarts=rows.map(row=>parseTime(row?.metrics?.workerStartedAt)).filter(Boolean);
  const waveEnds=rows.map(row=>parseTime(row?.metrics?.workerFinishedAt)).filter(Boolean);
  const waveElapsedMs=waveStarts.length&&waveEnds.length?Math.max(1,Math.max(...waveEnds)-Math.min(...waveStarts)):0;
  const waveElapsedMinutes=waveElapsedMs>0?waveElapsedMs/60000:0;
  const passTaskIds=new Set(rows.filter(row=>clean(row?.outcome).toUpperCase()==='PASS').map(row=>clean(row?.taskId)).filter(Boolean));
  const primaryRows=rows.filter(row=>!clean(row?.variant)||clean(row.variant)==='primary');
  const primaryPassCount=primaryRows.filter(row=>clean(row?.outcome).toUpperCase()==='PASS').length;
  const firstCandidatePassRatePct=round(primaryRows.length?primaryPassCount/primaryRows.length*100:0);
  const verifiedCandidatesPerMinute=round(waveElapsedMinutes?passTaskIds.size/waveElapsedMinutes:0);
  const changedLinesPerMinute=round(waveElapsedMinutes?workload.changedLineCount/waveElapsedMinutes:0);
  const transientWorkLockDeferrals=rows.filter(row=>
    clean(row?.outcome).toUpperCase()==='BLOCKED'
    &&/^work-lock-conflict:(?:transient-state-update-race|file-lock-conflict)$/i.test(clean(row?.blocker))
  ).length;
  const effectiveFailureCount=Math.max(0,outcomes.FAIL+outcomes.BLOCKED-transientWorkLockDeferrals);
  const failureRate=workerCount?effectiveFailureCount/workerCount:0;
  const sourceFailureClasses={};
  for(const row of rows){
    const failureClass=sourceGenerationFailureClass(row);
    if(!failureClass)continue;
    sourceFailureClasses[failureClass]=(sourceFailureClasses[failureClass]||0)+1;
  }
  const sourceGenerationFailureCount=Object.values(sourceFailureClasses).reduce((sum,value)=>sum+value,0);
  const failedWorkerCount=effectiveFailureCount;
  const workerFailureStages={};
  if(sourceGenerationFailureCount>0)workerFailureStages.SOURCE_CANDIDATE_GENERATION=sourceGenerationFailureCount;
  for(const row of rows){
    if(clean(row?.outcome).toUpperCase()!=='FAIL')continue;
    const blocker=clean(row?.blocker).toLowerCase();
    const candidateFailureClass=clean(row?.candidateFailure?.class).toUpperCase();
    const stage=candidateFailureClass==='CANDIDATE_BRANCH_PUBLISH'
      ?'CANDIDATE_PUBLICATION'
      :blocker==='incremental-qa-failed'
        ?'INCREMENTAL_QA'
        :blocker==='performance-sanity-failed'
          ?'PERFORMANCE_SANITY'
          :'';
    if(stage)workerFailureStages[stage]=(workerFailureStages[stage]||0)+1;
  }
  const classifiedWorkerFailureCount=Object.values(workerFailureStages).reduce((sum,value)=>sum+value,0);
  const directFailureCoverageSufficient=classifiedWorkerFailureCount>0
    &&classifiedWorkerFailureCount>=Math.max(1,Math.ceil(failedWorkerCount*.5));
  const directFailureOrder=['SOURCE_CANDIDATE_GENERATION','CANDIDATE_PUBLICATION','INCREMENTAL_QA','PERFORMANCE_SANITY'];
  const rankedDirectFailureStages=Object.entries(workerFailureStages)
    .sort((a,b)=>b[1]-a[1]||directFailureOrder.indexOf(a[0])-directFailureOrder.indexOf(b[0]))
    .map(([stage])=>stage);
  const bottleneckCandidates=[];
  const sourceGenerationDominant=sourceGenerationFailureCount>0
    &&sourceGenerationFailureCount>=Math.max(1,Math.ceil(failedWorkerCount*.5));
  if(sourceGenerationDominant)bottleneckCandidates.push('SOURCE_CANDIDATE_GENERATION');
  else if(directFailureCoverageSufficient)bottleneckCandidates.push(...rankedDirectFailureStages);
  if(workerCount&&peak<targetPeak)bottleneckCandidates.push('RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION');
  if(cacheKnown.length&&cacheHits/cacheKnown.length<.8)bottleneckCandidates.push('OLLAMA_CACHE_MISS_RATE');
  if(qa.p95Ms>0&&qa.p95Ms>candidate.p95Ms*1.25)bottleneckCandidates.push('INCREMENTAL_QA');
  if(checkout.p95Ms>30000)bottleneckCandidates.push('CHECKOUT_NETWORK');
  if(workload.preparationRatioPct>45)bottleneckCandidates.push('PREPARATION_OVERHEAD');
  if(failureRate>=.4&&!bottleneckCandidates.length)bottleneckCandidates.push('WORKER_FAILURES_UNCLASSIFIED');
  const rankedBottlenecks=[...new Set(bottleneckCandidates)];
  const bottleneck=rankedBottlenecks[0]||'NONE';
  const secondaryBottlenecks=rankedBottlenecks.slice(1);
  const pressureLevel=failureRate>=.4?'SEVERE':failureRate>=.2?'HIGH':failureRate>=.1?'MEDIUM':'LOW';
  return{
    version:5,
    runId,
    runIds,
    requestedMax,
    effectiveMax,
    taskCount,
    workerCount,
    actualPeakConcurrency:peak,
    scheduledSlotUtilizationPct:round(requestedMax?workerCount/requestedMax*100:0),
    observedPeakUtilizationPct:round(requestedMax?peak/requestedMax*100:0),
    effectivePeakUtilizationPct:round(effectiveMax?peak/effectiveMax*100:0),
    workerStartSpreadMs:starts.length?Math.max(...starts)-Math.min(...starts):0,
    throughput:{
      waveElapsedMs:round(waveElapsedMs),
      verifiedCandidateCount:passTaskIds.size,
      verifiedCandidatesPerMinute,
      firstCandidatePassRatePct,
      changedLinesPerMinute
    },
    queueWait:{avgMs:round(avg(queueWait)),p95Ms:round(p95(queueWait)),maxMs:round(queueWait.length?Math.max(...queueWait):0)},
    checkout,
    candidate,
    incrementalQa:qa,
    workerTotal,
    ollamaCache:{known:cacheKnown.length,hits:cacheHits,hitRatePct:round(cacheKnown.length?cacheHits/cacheKnown.length*100:0)},
    outcomes,
    transientWorkLockDeferrals,
    effectiveFailureCount,
    failureRatePct:round(failureRate*100),
    pressureLevel,
    sourceGenerationFailures:{
      count:sourceGenerationFailureCount,
      ratePct:round(workerCount?sourceGenerationFailureCount/workerCount*100:0),
      classes:sourceFailureClasses
    },
    workerFailureStages:{
      count:classifiedWorkerFailureCount,
      coveragePct:round(failedWorkerCount?classifiedWorkerFailureCount/failedWorkerCount*100:0),
      classes:workerFailureStages
    },
    workload,
    bottleneck,
    secondaryBottlenecks,
    bottleneckCandidates:rankedBottlenecks,
    pass:workerCount===0?true:(peak>=targetPeak&&failureRate<.2)
  };
}

export function runTelemetryCommand(args={}){
  const input=clean(args.input);if(!input)throw new Error('--input required');
  const payload=readJson(input);const results=Array.isArray(payload)?payload:Array.isArray(payload.results)?payload.results:[];
  const tasks=Array.isArray(payload?.tasks)?payload.tasks:[];
  const telemetry=computeParallelismTelemetry({results,tasks,requestedMax:args.requested,effectiveMax:args.effective,taskCount:args['task-count']});
  if(clean(args.output))writeJson(clean(args.output),telemetry);
  return telemetry;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const t=runTelemetryCommand(parseArgs());
  console.log(`VIBE2_PARALLEL_RUN_ID=${t.runId||'NONE'}`);
  console.log(`VIBE2_PARALLEL_PEAK=${t.actualPeakConcurrency}`);
  console.log(`VIBE2_PARALLEL_UTILIZATION=${t.observedPeakUtilizationPct}`);
  console.log(`VIBE2_PARALLEL_CACHE_HIT_RATE=${t.ollamaCache.hitRatePct}`);
  console.log(`VIBE2_PARALLEL_FAILURE_RATE=${t.failureRatePct}`);
  console.log(`VIBE2_VERIFIED_CANDIDATES_PER_MINUTE=${t.throughput.verifiedCandidatesPerMinute}`);
  console.log(`VIBE2_FIRST_CANDIDATE_PASS_RATE=${t.throughput.firstCandidatePassRatePct}`);
  console.log(`VIBE2_SOURCE_GENERATION_FAILURES=${t.sourceGenerationFailures.count}`);
  console.log(`VIBE2_SOURCE_GENERATION_FAILURE_CLASSES=${Object.entries(t.sourceGenerationFailures.classes).map(([key,value])=>`${key}:${value}`).join(',')||'NONE'}`);
  console.log(`VIBE2_WORKER_FAILURE_STAGES=${Object.entries(t.workerFailureStages.classes).map(([key,value])=>`${key}:${value}`).join(',')||'NONE'}`);
  console.log(`VIBE2_WORKER_FAILURE_STAGE_COVERAGE=${t.workerFailureStages.coveragePct}`);
  console.log(`VIBE2_WORKLOAD_FEATURES_COMPLETED=${t.workload.completedFeatureCount}`);
  console.log(`VIBE2_WORKLOAD_CHANGED_FILES=${t.workload.changedFileCount}`);
  console.log(`VIBE2_WORKLOAD_CHANGED_LINES=${t.workload.changedLineCount}`);
  console.log(`VIBE2_WORKLOAD_REWORK_RATE=${t.workload.reworkRatePct}`);
  console.log(`VIBE2_WORKLOAD_QA_DUPLICATE_RATE=${t.workload.qaDuplicateRatePct}`);
  console.log(`VIBE2_WORKLOAD_PACKAGE_CYCLE_AVG_MS=${t.workload.packageCycleTime.avgMs}`);
  console.log(`VIBE2_WORKLOAD_PREPARATION_RATIO=${t.workload.preparationRatioPct}`);
  console.log(`VIBE2_PARALLEL_BOTTLENECK=${t.bottleneck}`);
  console.log(`VIBE2_PARALLEL_SECONDARY_BOTTLENECKS=${t.secondaryBottlenecks.join(',')||'NONE'}`);
  console.log(`VIBE2_PARALLEL_TELEMETRY_PASS=${t.pass?'YES':'NO'}`);
}
