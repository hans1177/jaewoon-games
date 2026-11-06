import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const STANDARD_PUBLIC_RUNNERS = new Set([
  'ubuntu-latest','ubuntu-24.04','ubuntu-22.04','ubuntu-slim',
  'windows-latest','windows-2025','windows-2022',
  'macos-latest','macos-14','macos-15','macos-15-intel',
]);
const VERIFIED_VISIBILITY_SOURCES = new Set(['GITHUB_REPO_API','GITHUB_EVENT_PAYLOAD']);

const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
const arg=(name,fallback=null)=>{
  const prefix=`--${name}=`;
  const hit=process.argv.find(v=>v.startsWith(prefix));
  return hit?hit.slice(prefix.length):fallback;
};
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const visibilityFromRepository=(data,repository)=>{
  if(!data||typeof data!=='object')return 'unknown';
  const fullName=String(data.full_name||'').toLowerCase();
  if(fullName&&fullName!==String(repository||'').toLowerCase())return 'unknown';
  if(data.visibility==='public'||data.private===false)return 'public';
  if(data.visibility==='private'||data.private===true)return 'private';
  return 'unknown';
};

export async function fetchRepositoryVisibility(repository,{fetchImpl=globalThis.fetch,token=process.env.GITHUB_TOKEN||''}={}){
  if(typeof fetchImpl!=='function')return 'unknown';
  try{
    const headers={
      'Accept':'application/vnd.github+json',
      'User-Agent':'jaewoon-free-budget-telemetry/1.0',
    };
    if(token)headers.Authorization=`Bearer ${token}`;
    const response=await fetchImpl(`https://api.github.com/repos/${repository}`,{headers});
    if(!response?.ok)return 'unknown';
    const data=await response.json();
    return visibilityFromRepository(data,repository);
  }catch{return 'unknown';}
}

export function readRepositoryVisibilityFromEvent(repository,eventPath=process.env.GITHUB_EVENT_PATH||''){
  if(!eventPath)return 'unknown';
  try{
    const event=JSON.parse(fs.readFileSync(eventPath,'utf8'));
    return visibilityFromRepository(event?.repository,repository);
  }catch{return 'unknown';}
}

export async function resolveRepositoryVisibility(repository,{fetchImpl=globalThis.fetch,token=process.env.GITHUB_TOKEN||'',eventPath=process.env.GITHUB_EVENT_PATH||''}={}){
  const apiVisibility=await fetchRepositoryVisibility(repository,{fetchImpl,token});
  if(apiVisibility!=='unknown')return{visibility:apiVisibility,visibilitySource:'GITHUB_REPO_API'};
  const eventVisibility=readRepositoryVisibilityFromEvent(repository,eventPath);
  if(eventVisibility!=='unknown')return{visibility:eventVisibility,visibilitySource:'GITHUB_EVENT_PAYLOAD'};
  return{visibility:'unknown',visibilitySource:'UNVERIFIED'};
}

export function buildOperationalFreeBudgetTelemetry({
  repository='hans1177/jaewoon-games',
  visibility='unknown',
  visibilitySource='UNVERIFIED',
  runner='unknown',
  cashKRW=0,
  paidApi=false,
  modelCalls=0,
  maxModelCalls=1,
  runnerMinutes=0,
  maxRunnerMinutes=20,
  timestamp=new Date().toISOString(),
}={}){
  const exactRepo=repository==='hans1177/jaewoon-games';
  const publicRepo=visibility==='public';
  const standardRunner=STANDARD_PUBLIC_RUNNERS.has(runner);
  const visibilityVerified=VERIFIED_VISIBILITY_SOURCES.has(visibilitySource);
  const cashOk=finite(cashKRW,NaN)===0;
  const paidOk=paidApi===false;
  const modelCallsN=finite(modelCalls,Infinity);
  const maxModelCallsN=Math.max(0,finite(maxModelCalls,0));
  const runnerMinutesN=finite(runnerMinutes,Infinity);
  const maxRunnerMinutesN=Math.max(0,finite(maxRunnerMinutes,0));
  const modelCapOk=modelCallsN>=0&&modelCallsN<=maxModelCallsN;
  const runnerCapOk=runnerMinutesN>=0&&runnerMinutesN<=maxRunnerMinutesN;

  const actionsVerified=exactRepo&&publicRepo&&standardRunner&&visibilityVerified;
  const actions=actionsVerified?{
    providerId:'GITHUB_PUBLIC_STANDARD',
    resourceType:'ACTIONS_RUNNER',
    status:'AVAILABLE',
    quotaMode:'UNMETERED_FREE',
    metered:false,
    remaining:null,
    remainingRatio:1,
    source:`GITHUB_PUBLIC_STANDARD_POLICY+${visibilitySource}`,
    repository,
    visibility,
    visibilitySource,
    runner,
  }:{
    providerId:'GITHUB_PUBLIC_STANDARD',
    resourceType:'ACTIONS_RUNNER',
    status:'UNMEASURED',
    quotaMode:'UNMEASURED',
    metered:null,
    remaining:null,
    remainingRatio:null,
    source:'FAIL_CLOSED_RUNTIME_IDENTITY',
    repository,
    visibility,
    visibilitySource,
    runner,
  };

  const model={
    providerId:'OLLAMA_LOCAL',
    resourceType:'LOCAL_MODEL',
    status:paidOk&&modelCapOk?'AVAILABLE':'BLOCKED',
    quotaMode:'PER_RUN_CAP',
    paidApi,
    calls:modelCallsN,
    maxCalls:maxModelCallsN,
    source:'LOCAL_MODEL_NO_PAID_API',
  };

  const failures=[];
  if(!exactRepo)failures.push('UNEXPECTED_REPOSITORY');
  if(!publicRepo||!visibilityVerified)failures.push('PUBLIC_VISIBILITY_NOT_VERIFIED');
  if(!standardRunner)failures.push('STANDARD_RUNNER_NOT_VERIFIED');
  if(!cashOk)failures.push('CASH_BUDGET_FORBIDDEN');
  if(!paidOk)failures.push('PAID_API_FORBIDDEN');
  if(!modelCapOk)failures.push('MODEL_CALL_CAP_EXCEEDED');
  if(!runnerCapOk)failures.push('RUNNER_MINUTE_CAP_EXCEEDED');

  return Object.freeze({
    version:1,
    timestamp,
    policy:'FREE_LIMIT_EQUALS_COMPANY_BUDGET',
    allowed:failures.length===0,
    decision:failures.length===0?'ALLOW':'HOLD',
    failures:Object.freeze(failures),
    cashKRW:cashOk?0:cashKRW,
    paidFallback:false,
    autoPlanUpgrade:false,
    autoCreditPurchase:false,
    execution:Object.freeze({
      repository,
      visibility,
      visibilitySource,
      runner,
      runnerMinutes:runnerMinutesN,
      maxRunnerMinutes:maxRunnerMinutesN,
    }),
    providers:Object.freeze([Object.freeze(actions),Object.freeze(model)]),
  });
}

async function main(){
  const portfolio=readJson('autonomous-portfolio.json',{});
  const repository=arg('repository',process.env.GITHUB_REPOSITORY||'hans1177/jaewoon-games');
  const verifyRepo=String(arg('verify-public-repo','false'))==='true';
  const resolved=verifyRepo?await resolveRepositoryVisibility(repository):{
    visibility:arg('visibility',process.env.JAEWOON_REPO_VISIBILITY||'unknown'),
    visibilitySource:arg('visibility-source','UNVERIFIED'),
  };
  const telemetry=buildOperationalFreeBudgetTelemetry({
    repository,
    visibility:resolved.visibility,
    visibilitySource:resolved.visibilitySource,
    runner:arg('runner',process.env.JAEWOON_RUNNER_LABEL||'unknown'),
    cashKRW:finite(arg('cash-krw','0'),0),
    paidApi:String(arg('paid-api',String(portfolio.paidApi!==false)))==='true',
    modelCalls:finite(arg('model-calls','0'),0),
    maxModelCalls:finite(portfolio.maxModelCallsPerRun,0),
    runnerMinutes:finite(arg('runner-minutes',String(portfolio.maxRunnerMinutesPerRun??0)),0),
    maxRunnerMinutes:finite(portfolio.maxRunnerMinutesPerRun,0),
  });
  const output=arg('output','.autonomous/free-budget-telemetry.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(telemetry,null,2)+'\n');
  console.log(JSON.stringify(telemetry,null,2));
  if(!telemetry.allowed)process.exitCode=2;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error.message);process.exitCode=2;});
}

export { STANDARD_PUBLIC_RUNNERS, VERIFIED_VISIBILITY_SOURCES };
