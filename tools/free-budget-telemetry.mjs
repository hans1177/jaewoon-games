import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,finite(ms,0))));

export async function fetchRepositoryVisibility(repository,{fetchImpl=globalThis.fetch,token=process.env.GITHUB_TOKEN||'',attempts=3,retryDelayMs=250}={}){
  if(typeof fetchImpl!=='function')return 'unknown';
  const maxAttempts=Math.max(1,Math.floor(finite(attempts,3)));
  for(let attempt=1;attempt<=maxAttempts;attempt+=1){
    try{
      const headers={
        'Accept':'application/vnd.github+json',
        'X-GitHub-Api-Version':'2026-03-10',
        'User-Agent':'jaewoon-vibe2-free-budget-telemetry',
      };
      if(token)headers.Authorization=`Bearer ${token}`;
      const response=await fetchImpl(`https://api.github.com/repos/${repository}`,{headers});
      if(response?.ok){
        const data=await response.json();
        if(data?.visibility==='public'||data?.private===false)return 'public';
        if(data?.visibility==='private'||data?.private===true)return 'private';
      }
    }catch{}
    if(attempt<maxAttempts)await sleep(retryDelayMs*attempt);
  }
  return 'unknown';
}

export function repositoryVisibilityFromGitHubEvent(repository,eventPath=process.env.GITHUB_EVENT_PATH||''){
  if(!eventPath)return 'unknown';
  const event=readJson(eventPath,null);
  const repo=event?.repository;
  if(!repo||String(repo.full_name||'')!==repository)return 'unknown';
  if(repo.private===false||repo.visibility==='public')return 'public';
  if(repo.private===true||repo.visibility==='private')return 'private';
  return 'unknown';
}

export function cachedOllamaRuntimeComplete(home=process.env.HOME||''){
  if(!home)return false;
  const root=path.join(home,'.cache','vibe2-ollama');
  return fs.existsSync(path.join(root,'bin','ollama'))&&fs.existsSync(path.join(root,'lib','ollama','llama-server'));
}

export function ensureCachedOllamaRuntime({home=process.env.HOME||'',exec=execFileSync}={}){
  if(!home)throw new Error('HOME 없음: Ollama runtime 복구 불가');
  if(cachedOllamaRuntimeComplete(home))return 'CACHE_COMPLETE';
  const cacheRoot=path.join(home,'.cache','vibe2-ollama');
  const script=`set -euo pipefail
installed=0
for attempt in 1 2 3; do
  if curl -fsSL --retry 3 --retry-all-errors --connect-timeout 15 https://ollama.com/install.sh | sh; then installed=1; break; fi
  sleep $((attempt * 3))
done
test "$installed" = 1
mkdir -p "${cacheRoot}/bin" "${cacheRoot}/lib/ollama"
system_ollama=""
for candidate in /usr/local/bin/ollama /usr/bin/ollama; do
  if [ -x "$candidate" ]; then system_ollama="$candidate"; break; fi
done
test -n "$system_ollama"
cp "$system_ollama" "${cacheRoot}/bin/ollama"
chmod +x "${cacheRoot}/bin/ollama"
server_path="$(find /usr/local/lib/ollama /usr/lib/ollama -type f -name llama-server -perm -111 -print -quit 2>/dev/null || true)"
test -n "$server_path"
server_dir="$(dirname "$server_path")"
rm -rf "${cacheRoot}/lib/ollama"
mkdir -p "${cacheRoot}/lib/ollama"
cp -a "$server_dir/." "${cacheRoot}/lib/ollama/"
test -x "${cacheRoot}/lib/ollama/llama-server"`;
  exec('bash',['-lc',script],{stdio:'inherit',env:process.env});
  if(!cachedOllamaRuntimeComplete(home))throw new Error('Ollama runtime 복구 후 llama-server 확인 실패');
  return 'REPAIRED_FROM_OFFICIAL_INSTALL';
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
  const verifiedVisibility=VERIFIED_VISIBILITY_SOURCES.has(visibilitySource);
  const standardRunner=STANDARD_PUBLIC_RUNNERS.has(runner);
  const cashOk=finite(cashKRW,NaN)===0;
  const paidOk=paidApi===false;
  const modelCallsN=finite(modelCalls,Infinity);
  const maxModelCallsN=Math.max(0,finite(maxModelCalls,0));
  const runnerMinutesN=finite(runnerMinutes,Infinity);
  const maxRunnerMinutesN=Math.max(0,finite(maxRunnerMinutes,0));
  const modelCapOk=modelCallsN>=0&&modelCallsN<=maxModelCallsN;
  const runnerCapOk=runnerMinutesN>=0&&runnerMinutesN<=maxRunnerMinutesN;

  const actionsVerified=exactRepo&&publicRepo&&standardRunner&&verifiedVisibility;
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
  if(!publicRepo||!verifiedVisibility)failures.push('PUBLIC_VISIBILITY_NOT_VERIFIED');
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
  const modelCalls=finite(arg('model-calls','0'),0);
  let visibility=verifyRepo?await fetchRepositoryVisibility(repository,{token:process.env.GITHUB_TOKEN||''}):arg('visibility',process.env.JAEWOON_REPO_VISIBILITY||'unknown');
  let visibilitySource=verifyRepo?'GITHUB_REPO_API':arg('visibility-source','UNVERIFIED');
  if(verifyRepo&&visibility==='unknown'){
    const eventVisibility=repositoryVisibilityFromGitHubEvent(repository);
    if(eventVisibility!=='unknown'){
      visibility=eventVisibility;
      visibilitySource='GITHUB_EVENT_PAYLOAD';
    }
  }
  const telemetry=buildOperationalFreeBudgetTelemetry({
    repository,
    visibility,
    visibilitySource,
    runner:arg('runner',process.env.JAEWOON_RUNNER_LABEL||'unknown'),
    cashKRW:finite(arg('cash-krw','0'),0),
    paidApi:String(arg('paid-api',String(portfolio.paidApi!==false)))==='true',
    modelCalls,
    maxModelCalls:finite(portfolio.maxModelCallsPerRun,0),
    runnerMinutes:finite(arg('runner-minutes',String(portfolio.maxRunnerMinutesPerRun??0)),0),
    maxRunnerMinutes:finite(portfolio.maxRunnerMinutesPerRun,0),
  });
  const output=arg('output','.autonomous/free-budget-telemetry.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(telemetry,null,2)+'\n');
  console.log(JSON.stringify(telemetry,null,2));
  if(!telemetry.allowed){process.exitCode=2;return;}
  if(process.env.GITHUB_ACTIONS==='true'&&modelCalls>0&&process.platform==='linux'){
    const runtime=ensureCachedOllamaRuntime();
    console.log(`VIBE2_OLLAMA_RUNTIME_READY=${runtime}`);
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error.message);process.exitCode=2;});
}

export { STANDARD_PUBLIC_RUNNERS, VERIFIED_VISIBILITY_SOURCES };
