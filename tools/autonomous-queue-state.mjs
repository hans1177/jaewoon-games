// 파일명: tools/autonomous-queue-state.mjs
// 역할: 자율 개발 예약 lease와 공용 WORK_ID 진행 ledger를 같은 상태 파일에서 관리한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const clean=value=>String(value??'').trim();
export const DEFAULT_RESERVATION_LEASE_MS=90*60*1000;
export const DEFAULT_EVIDENCE_MAX_AGE_MS=7*24*60*60*1000;
export const WORK_STATES=Object.freeze(['ASSIGNED','IMPLEMENTING','PR_OPEN','CI','MERGED','QA','PASS','FAIL','STALLED']);
export const DEVELOPMENT_PROGRESS=Object.freeze(['PASS','NO_ACTIONABLE_WORK','BLOCKED','INCOMPLETE_PROGRESS']);
export const RELEASE_READINESS_WEIGHTS=Object.freeze({
  install_update:20,
  core_loop:20,
  stability:20,
  content:15,
  graphics_ui:10,
  monetization:10,
  store:5,
});
const TERMINAL_WORK_STATES=new Set(['PASS','FAIL','STALLED']);

function normalizeEvidenceRefs(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.map(clean).filter(Boolean))].slice(-50);
}

function normalizeReleaseEvidence(value){
  if(!Array.isArray(value))return [];
  return value.filter(item=>item&&typeof item==='object').slice(-100).map(item=>({
    category:clean(item.category).toLowerCase(),
    source:clean(item.source),
    timestamp:clean(item.timestamp),
    commitSha:clean(item.commitSha),
    runId:clean(item.runId)||null,
    testId:clean(item.testId)||null,
    verdict:clean(item.verdict).toUpperCase(),
    evidenceRef:clean(item.evidenceRef)||null,
  }));
}

export function validateReleaseEvidence(item,{expectedCommit='',now=new Date(),maxAgeMs=DEFAULT_EVIDENCE_MAX_AGE_MS}={}){
  const evidence=normalizeReleaseEvidence([item])[0];
  if(!evidence)return {valid:false,reason:'INVALID_EVIDENCE'};
  if(!Object.hasOwn(RELEASE_READINESS_WEIGHTS,evidence.category))return {valid:false,reason:'UNKNOWN_CATEGORY',evidence};
  if(!evidence.source)return {valid:false,reason:'MISSING_SOURCE',evidence};
  if(!evidence.commitSha)return {valid:false,reason:'MISSING_COMMIT_SHA',evidence};
  if(expectedCommit&&evidence.commitSha!==clean(expectedCommit))return {valid:false,reason:'SHA_MISMATCH',evidence};
  if(!evidence.runId&&!evidence.testId)return {valid:false,reason:'MISSING_RUN_OR_TEST_ID',evidence};
  if(evidence.verdict!=='PASS')return {valid:false,reason:'NON_PASS_VERDICT',evidence};
  const evidenceMs=Date.parse(evidence.timestamp);
  const nowMs=new Date(now).getTime();
  if(!Number.isFinite(evidenceMs))return {valid:false,reason:'INVALID_TIMESTAMP',evidence};
  if(evidenceMs>nowMs+5*60*1000)return {valid:false,reason:'FUTURE_TIMESTAMP',evidence};
  if(Number.isFinite(maxAgeMs)&&maxAgeMs>=0&&nowMs-evidenceMs>maxAgeMs)return {valid:false,reason:'STALE_EVIDENCE',evidence};
  return {valid:true,reason:'VALID',evidence};
}

export function evaluateReleaseReadiness({evidence=[],expectedCommit='',now=new Date(),maxAgeMs=DEFAULT_EVIDENCE_MAX_AGE_MS}={}){
  const checks=normalizeReleaseEvidence(evidence).map(item=>validateReleaseEvidence(item,{expectedCommit,now,maxAgeMs}));
  const valid=checks.filter(check=>check.valid).map(check=>check.evidence);
  const categories={};
  for(const [category,weight] of Object.entries(RELEASE_READINESS_WEIGHTS)){
    const categoryEvidence=valid.filter(item=>item.category===category);
    categories[category]={weight,earned:categoryEvidence.length?weight:0,evidenceCount:categoryEvidence.length};
  }
  const score=Object.values(categories).reduce((sum,row)=>sum+row.earned,0);
  const missingCategories=Object.entries(categories).filter(([,row])=>row.earned===0).map(([category])=>category);
  return {
    score,
    maxScore:100,
    pass:score===100,
    categories,
    missingCategories,
    validEvidenceCount:valid.length,
    invalidEvidence:checks.filter(check=>!check.valid).map(check=>({reason:check.reason,evidence:check.evidence||null})),
  };
}

export function normalizeQueueState(raw={}){
  return {
    version:4,
    attempts:Array.isArray(raw.attempts)?raw.attempts.filter(x=>x&&x.date&&x.gameId):[],
    workLedger:Array.isArray(raw.workLedger)?raw.workLedger.filter(x=>x&&clean(x.workId)):[],
  };
}

export function attemptsForDate(state,date){
  return normalizeQueueState(state).attempts.filter(x=>x.date===date);
}

export function attemptedGameIds(state,date){
  return new Set(attemptsForDate(state,date).map(x=>x.gameId));
}

export function attemptCountForGameOnDate(state,date,gameId){
  return attemptsForDate(state,date).filter(x=>x.gameId===gameId).length;
}

export function activeReservations(state,{now=new Date(),isSourceReleased=()=>false}={}){
  const nowMs=new Date(now).getTime();
  return normalizeQueueState(state).attempts.filter(row=>{
    if(row.status!=='RESERVED')return false;
    const expires=Date.parse(String(row.leaseExpiresAt||''));
    if(!Number.isFinite(expires)||expires<=nowMs)return false;
    try{return !isSourceReleased(row);}catch{return true;}
  });
}

export function activeGameIds(state,options={}){
  return new Set(activeReservations(state,options).map(row=>row.gameId));
}

export function activeSourcePaths(state,options={}){
  return new Set(activeReservations(state,options).map(row=>String(row.sourcePath||'').trim()).filter(Boolean));
}

export function workById(state,workId){
  const id=clean(workId);
  if(!id)return null;
  return normalizeQueueState(state).workLedger.find(row=>clean(row.workId)===id)||null;
}

export function classifyDevelopmentProgress({workState='',explicitReason='',implementationChanged=false,qaVerdict='',evidenceRefs=[],releaseReadiness=null}={}){
  const state=clean(workState).toUpperCase();
  const reason=clean(explicitReason).toUpperCase();
  const verdict=clean(qaVerdict).toUpperCase();
  const evidence=normalizeEvidenceRefs(evidenceRefs);
  if(reason==='NO_ACTIONABLE_WORK')return 'NO_ACTIONABLE_WORK';
  if(state==='FAIL'||state==='STALLED'||reason==='BLOCKED')return 'BLOCKED';
  if(state==='PASS'&&implementationChanged&&verdict==='PASS'&&evidence.length>0&&releaseReadiness?.pass===true)return 'PASS';
  return 'INCOMPLETE_PROGRESS';
}

export function transitionWorkLedger(state,{workId,workState,owner=null,sourceRoot=null,sourceCommit=null,retryCount=null,evidenceRefs=[],releaseEvidence=[],developmentProgress=null,explicitReason=null,implementationChanged=false,qaVerdict=null,now=new Date(),evidenceMaxAgeMs=DEFAULT_EVIDENCE_MAX_AGE_MS}={}){
  const id=clean(workId);
  const nextState=clean(workState).toUpperCase();
  if(!id)throw new Error('workId required');
  if(!WORK_STATES.includes(nextState))throw new Error(`unsupported work state: ${workState}`);
  const normalized=normalizeQueueState(state);
  const rows=[...normalized.workLedger];
  const index=rows.findIndex(row=>clean(row.workId)===id);
  const previous=index>=0?rows[index]:null;
  if(previous&&TERMINAL_WORK_STATES.has(clean(previous.workState).toUpperCase())&&clean(previous.workState).toUpperCase()!==nextState){
    throw new Error(`terminal work cannot transition: ${previous.workState} -> ${nextState}`);
  }
  const timestamp=new Date(now).toISOString();
  const mergedEvidence=normalizeEvidenceRefs([...(previous?.evidenceRefs||[]),...evidenceRefs]);
  const mergedReleaseEvidence=normalizeReleaseEvidence([...(previous?.releaseEvidence||[]),...releaseEvidence]);
  const resolvedCommit=clean(sourceCommit)||previous?.sourceCommit||'';
  const releaseReadiness=evaluateReleaseReadiness({evidence:mergedReleaseEvidence,expectedCommit:resolvedCommit,now,evidenceMaxAgeMs});
  const progress=developmentProgress?clean(developmentProgress).toUpperCase():classifyDevelopmentProgress({
    workState:nextState,explicitReason,implementationChanged:Boolean(implementationChanged||previous?.implementationChanged),qaVerdict:clean(qaVerdict).toUpperCase()||previous?.qaVerdict,evidenceRefs:mergedEvidence,releaseReadiness,
  });
  if(!DEVELOPMENT_PROGRESS.includes(progress))throw new Error(`unsupported development progress: ${developmentProgress}`);
  if(progress==='PASS'&&nextState!=='PASS')throw new Error('DEVELOPMENT_PROGRESS=PASS requires WORK state PASS');
  if(progress==='PASS'&&!releaseReadiness.pass)throw new Error('DEVELOPMENT_PROGRESS=PASS requires release readiness 100/100');
  const history=[...(Array.isArray(previous?.history)?previous.history:[]),{state:nextState,at:timestamp,progress,releaseReadinessScore:releaseReadiness.score}].slice(-100);
  const row={
    workId:id,
    workState:nextState,
    developmentProgress:progress,
    owner:clean(owner)||previous?.owner||null,
    sourceRoot:clean(sourceRoot)||previous?.sourceRoot||null,
    sourceCommit:resolvedCommit||null,
    createdAt:previous?.createdAt||timestamp,
    updatedAt:timestamp,
    retryCount:retryCount==null?Number(previous?.retryCount||0):Math.max(0,Number(retryCount)||0),
    evidenceRefs:mergedEvidence,
    releaseEvidence:mergedReleaseEvidence,
    releaseReadiness,
    explicitReason:clean(explicitReason)||null,
    qaVerdict:clean(qaVerdict).toUpperCase()||previous?.qaVerdict||null,
    implementationChanged:Boolean(implementationChanged||previous?.implementationChanged),
    history,
  };
  if(index>=0)rows[index]=row;else rows.push(row);
  return {...normalized,workLedger:rows.slice(-500)};
}

export function reserveQueueWork(state,{date,gameId,gameSlug=null,sourcePath=null,reason=null,runId=null,workId=null,sourceCommit=null,owner='autonomous-development',now=new Date(),leaseMs=DEFAULT_RESERVATION_LEASE_MS}={}){
  if(!date||!gameId)throw new Error('date/gameId required');
  const normalized=normalizeQueueState(state);
  const cutoff=new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate()-30);
  const kept=normalized.attempts.filter(x=>{
    const d=new Date(`${x.date}T00:00:00Z`);
    return Number.isNaN(d.getTime())||d>=cutoff;
  });
  const floor=kept.filter(x=>x.date===date&&x.gameId===gameId).length+1;
  const reservedAt=new Date(now);
  const resolvedWorkId=clean(workId)||clean(runId)||null;
  kept.push({
    date,gameId,gameSlug,sourcePath,reason,runId:runId?String(runId):null,workId:resolvedWorkId,sourceCommit:sourceCommit||null,
    floor,
    status:'RESERVED',reservedAt:reservedAt.toISOString(),leaseExpiresAt:new Date(reservedAt.getTime()+leaseMs).toISOString(),
  });
  let next={...normalized,attempts:kept};
  if(resolvedWorkId){
    next=transitionWorkLedger(next,{workId:resolvedWorkId,workState:'ASSIGNED',owner,sourceRoot:sourcePath,sourceCommit,evidenceRefs:[],now:reservedAt});
  }
  return next;
}

export function settleQueueWork(state,{runId=null,gameId=null,status='FAILED',now=new Date()}={}){
  const normalized=normalizeQueueState(state);
  const allowed=new Set(['FAILED','CANCELLED','RELEASED','SUPERSEDED']);
  const nextStatus=String(status||'').toUpperCase();
  if(!allowed.has(nextStatus))throw new Error(`unsupported queue settlement status: ${status}`);
  const id=runId==null?'':String(runId);
  let index=-1;
  for(let i=normalized.attempts.length-1;i>=0;i--){
    const row=normalized.attempts[i];
    if(row.status!=='RESERVED')continue;
    if(id&&String(row.runId||'')===id){index=i;break;}
    if(!id&&gameId&&row.gameId===gameId){index=i;break;}
  }
  if(index<0)return normalized;
  const attempts=[...normalized.attempts];
  attempts[index]={...attempts[index],status:nextStatus,settledAt:new Date(now).toISOString(),leaseExpiresAt:null};
  return {...normalized,attempts};
}

function arg(name){return process.argv.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??null;}

function main(){
  const stateFile=arg('state')||'.autonomous/queue-state.json';
  const state=readJson(stateFile,{version:4,attempts:[],workLedger:[]});
  const transitionWorkId=arg('work-id');
  const transitionState=arg('work-state');
  if(transitionWorkId&&transitionState){
    const next=transitionWorkLedger(state,{
      workId:transitionWorkId,workState:transitionState,owner:arg('owner'),sourceRoot:arg('source-root'),sourceCommit:arg('source-commit'),
      retryCount:arg('retry-count'),evidenceRefs:(arg('evidence-refs')||'').split(',').filter(Boolean),developmentProgress:arg('development-progress'),
      explicitReason:arg('reason'),implementationChanged:arg('implementation-changed')==='true',qaVerdict:arg('qa-verdict'),
    });
    writeJson(stateFile,next);
    console.log(JSON.stringify({stateFile,work:workById(next,transitionWorkId)},null,2));
    return;
  }
  const settleRunId=arg('settle-run-id');
  const settleGameId=arg('settle-game-id');
  if(settleRunId||settleGameId){
    const next=settleQueueWork(state,{runId:settleRunId,gameId:settleGameId,status:arg('status')||'FAILED'});
    writeJson(stateFile,next);
    console.log(JSON.stringify({stateFile,settledRunId:settleRunId,settledGameId:settleGameId,status:arg('status')||'FAILED'},null,2));
    return;
  }
  const next=reserveQueueWork(state,{
    date:arg('date'),gameId:arg('game-id'),gameSlug:arg('game-slug'),sourcePath:arg('source-path'),reason:arg('reason'),runId:arg('run-id'),workId:arg('work-id'),sourceCommit:arg('source-commit'),owner:arg('owner')||'autonomous-development',
  });
  writeJson(stateFile,next);
  console.log(JSON.stringify({stateFile,date:arg('date'),gameId:arg('game-id'),attemptsToday:attemptsForDate(next,arg('date')).length,gameFloorsToday:attemptCountForGameOnDate(next,arg('date'),arg('game-id'))},null,2));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main();}catch(error){console.error(error.message);process.exitCode=1;}
}
