// Reconcile Roblox DEVELOPMENT source that already exists on an exact main revision.
// This validates source only. It never claims Roblox runtime, independent QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateRobloxBootstrap} from './company-development-roblox-bootstrap.mjs';

const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;

export function eligibleForRobloxSourceReconciliation(item={}){
  if(clean(item.productionClass).toUpperCase()!=='DEVELOPMENT_CONFIRMED')return false;
  if(clean(item.selectedPlatform||item.targetPlatform).toUpperCase()!=='ROBLOX')return false;
  if(!(Boolean(item.webValidationPassedAt)&&item.musicValidationPassed===true))return false;
  if(clean(item.currentStep).toUpperCase()!=='TARGET_PLATFORM_SOURCE_BIND')return false;
  if(clean(item.canonicalState).toUpperCase()==='DEVELOPMENT_BLOCKED')return false;
  return Boolean(clean(item.gameId));
}

export function validateExistingRobloxSourceTree({root='',baseline={}}={}){
  const blockers=[];
  const required={
    project:path.join(root,'default.project.json'),
    config:path.join(root,'shared','GameConfig.luau'),
    server:path.join(root,'server','Game.server.luau'),
    client:path.join(root,'client','Game.client.luau'),
  };
  for(const [kind,file] of Object.entries(required)){
    if(!fs.existsSync(file))blockers.push(`SOURCE_${kind.toUpperCase()}_MISSING`);
  }
  if(blockers.length)return {pass:false,blockers,saveRequired:false};

  let project={};
  try{project=readJson(required.project);}catch{blockers.push('SOURCE_PROJECT_JSON_INVALID');}
  if(project?.tree?.ReplicatedStorage?.Shared?.$path!=='shared')blockers.push('SOURCE_PROJECT_SHARED_MAPPING_REQUIRED');
  if(project?.tree?.ServerScriptService?.GameServer?.$path!=='server')blockers.push('SOURCE_PROJECT_SERVER_MAPPING_REQUIRED');
  if(project?.tree?.StarterPlayer?.StarterPlayerScripts?.GameClient?.$path!=='client')blockers.push('SOURCE_PROJECT_CLIENT_MAPPING_REQUIRED');

  const verdict=validateRobloxBootstrap({
    sharedConfig:fs.readFileSync(required.config,'utf8'),
    serverCode:fs.readFileSync(required.server,'utf8'),
    clientCode:fs.readFileSync(required.client,'utf8'),
    baseline,
  });
  blockers.push(...verdict.blockers);
  return {pass:blockers.length===0,blockers:[...new Set(blockers)],saveRequired:verdict.saveRequired};
}

export function evaluateExistingRobloxSources({queue={},repoRoot='.',sourceRevision='',loadBaseline}={}){
  if(typeof loadBaseline!=='function')throw new Error('loadBaseline callback required');
  const results=[];
  for(const item of queue.items||[]){
    if(!eligibleForRobloxSourceReconciliation(item))continue;
    const sourcePath=`roblox-games/${item.gameId}`;
    const root=path.join(repoRoot,sourcePath);
    if(!fs.existsSync(root))continue;
    try{
      const baseline=loadBaseline(item);
      const verdict=validateExistingRobloxSourceTree({root,baseline});
      results.push({
        gameId:item.gameId,
        pass:verdict.pass,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        saveRequired:verdict.saveRequired,
        blockers:verdict.blockers,
        failure:verdict.pass?null:'existing-source-static-revalidation-failed',
      });
    }catch(error){
      results.push({
        gameId:item.gameId,
        pass:false,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        saveRequired:false,
        blockers:['SOURCE_BASELINE_OR_VALIDATION_UNAVAILABLE'],
        failure:'existing-source-static-revalidation-unavailable',
        detail:String(error?.message||error),
      });
    }
  }
  return results;
}

function runCli(){
  const queueFile=arg('queue');
  const runtimeRef=arg('runtime-ref');
  const repoRoot=arg('repo-root','.');
  const sourceRevision=arg('source-revision');
  const resultsFile=arg('results','/tmp/roblox-source-reconciliation.json');
  if(!queueFile||!runtimeRef||!sourceRevision)throw new Error('required: --queue, --runtime-ref, --source-revision');
  const queue=readJson(queueFile);
  const results=evaluateExistingRobloxSources({
    queue,
    repoRoot,
    sourceRevision,
    loadBaseline:item=>{
      const baselinePath=clean(item.designBaselineSource);
      if(!baselinePath)throw new Error(`designBaselineSource missing: ${item.gameId}`);
      const text=execFileSync('git',['show',`${runtimeRef}:${baselinePath}`],{encoding:'utf8',maxBuffer:8*1024*1024});
      return JSON.parse(text.replace(/^\uFEFF/,''));
    },
  });
  fs.writeFileSync(resultsFile,JSON.stringify(results,null,2)+'\n');
  const passCount=results.filter(x=>x.pass===true).length;
  const failCount=results.length-passCount;
  console.log(`ROBLOX_SOURCE_RECONCILIATION_COUNT=${results.length}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_PASS=${passCount}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_FAIL=${failCount}`);
  console.log(`ROBLOX_SOURCE_RECONCILIATION_REVISION=${sourceRevision}`);
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`count=${results.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT,`results_json=${JSON.stringify(results)}\n`);
  }
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runCli();
