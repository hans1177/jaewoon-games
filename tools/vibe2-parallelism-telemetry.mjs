// 파일명: tools/vibe2-parallelism-telemetry.mjs
// 역할: Vibe2 20병렬 실행의 실제 동시성, 대기/checkout/QA 시간, cache hit, 실패율과 병목을 집계한다.

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

export function computeParallelismTelemetry(input={}){
  const rows=Array.isArray(input.results)?input.results:[];
  const requestedMax=clamp(Math.floor(num(input.requestedMax||rows[0]?.metrics?.requestedMax||20)||20),1,20);
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
  let bottleneck='NONE';
  if(workerCount&&peak<targetPeak)bottleneck='RUNNER_CAPACITY_OR_STARTUP_SERIALIZATION';
  else if(cacheKnown.length&&cacheHits/cacheKnown.length<.8)bottleneck='OLLAMA_CACHE_MISS_RATE';
  else if(qa.p95Ms>0&&qa.p95Ms>candidate.p95Ms*1.25)bottleneck='INCREMENTAL_QA';
  else if(checkout.p95Ms>30000)bottleneck='CHECKOUT_NETWORK';
  const failureRate=workerCount?(outcomes.FAIL+outcomes.BLOCKED)/workerCount:0;
  const pressureLevel=failureRate>=.4?'SEVERE':failureRate>=.2?'HIGH':failureRate>=.1?'MEDIUM':'LOW';
  return{
    version:2,
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
    queueWait:{avgMs:round(avg(queueWait)),p95Ms:round(p95(queueWait)),maxMs:round(queueWait.length?Math.max(...queueWait):0)},
    checkout,
    candidate,
    incrementalQa:qa,
    workerTotal,
    ollamaCache:{known:cacheKnown.length,hits:cacheHits,hitRatePct:round(cacheKnown.length?cacheHits/cacheKnown.length*100:0)},
    outcomes,
    failureRatePct:round(failureRate*100),
    pressureLevel,
    bottleneck,
    pass:workerCount===0?true:(peak>=targetPeak&&failureRate<.2)
  };
}

export function runTelemetryCommand(args={}){
  const input=clean(args.input);if(!input)throw new Error('--input required');
  const payload=readJson(input);const results=Array.isArray(payload)?payload:Array.isArray(payload.results)?payload.results:[];
  const telemetry=computeParallelismTelemetry({results,requestedMax:args.requested,effectiveMax:args.effective,taskCount:args['task-count']});
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
  console.log(`VIBE2_PARALLEL_BOTTLENECK=${t.bottleneck}`);
  console.log(`VIBE2_PARALLEL_TELEMETRY_PASS=${t.pass?'YES':'NO'}`);
}
