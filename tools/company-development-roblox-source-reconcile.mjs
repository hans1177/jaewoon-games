// Reconcile Roblox DEVELOPMENT source that already exists on an exact main revision.
// This validates source only. It never claims Roblox runtime, independent QA, regression, or release success.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateRobloxBootstrap} from './company-development-roblox-bootstrap.mjs';
import {platformDevelopmentEligible} from './company-selected-platform-router.mjs';

const clean=value=>String(value??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const arg=(name,fallback='')=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const sha40=value=>/^[0-9a-f]{40}$/i.test(clean(value));

export function hasVerifiedVibe2SourceHandoff(item={}){
  const handoff=item.robloxVibe2VerifiedHandoff;
  return Boolean(
    handoff?.verified===true
    &&clean(handoff.gameId)===clean(item.gameId)
    &&sha40(handoff.sourceRevision)
    &&sha40(handoff.candidateSha)
    &&sha40(handoff.sourceTreeSha)
    &&Number.isInteger(Number(handoff.qaRunId))
    &&Number(handoff.qaRunId)>0
  );
}

function robloxReconciliationAdmission(item={}){
  return platformDevelopmentEligible({...item,currentStep:'TARGET_PLATFORM_SOURCE_BIND'},'ROBLOX');
}

export function eligibleForRobloxSourceReconciliation(item={}, {sourceChanged=false}={}){
  if(!clean(item.gameId))return false;
  if(!robloxReconciliationAdmission(item))return false;
  const step=clean(item.currentStep).toUpperCase();
  return step==='TARGET_PLATFORM_SOURCE_BIND'||sourceChanged===true;
}

export function sourcePathChangedBetweenRevisions({repoRoot='.',baseRevision='',headRevision='',sourcePath=''}={}){
  const base=clean(baseRevision),head=clean(headRevision),target=clean(sourcePath);
  if(!sha40(base)||!sha40(head)||!target)throw new Error('ROBLOX_SOURCE_DIFF_BINDING_INVALID');
  if(base===head)return false;
  try{
    execFileSync('git',['diff','--quiet',base,head,'--',target],{cwd:repoRoot,stdio:['ignore','pipe','pipe']});
    return false;
  }catch(error){
    if(Number(error?.status)===1)return true;
    throw new Error('ROBLOX_SOURCE_DIFF_UNAVAILABLE:'+clean(error?.stderr||error?.message||error));
  }
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

function currentSourceTreeSha({repoRoot='.',sourcePath=''}){
  try{
    return clean(execFileSync('git',['rev-parse',`HEAD:${sourcePath}`],{cwd:repoRoot,encoding:'utf8'}));
  }catch{
    return '';
  }
}

export function evaluateExistingRobloxSources({queue={},repoRoot='.',sourceRevision='',loadBaseline}={}){
  if(typeof loadBaseline!=='function')throw new Error('loadBaseline callback required');
  const results=[];
  for(const item of queue.items||[]){
    const sourcePath=`roblox-games/${item.gameId}`;
    const boundRevision=clean(item.robloxSourceCommit);
    let sourceChanged=false;
    if(sha40(boundRevision)&&sha40(sourceRevision)){
      sourceChanged=sourcePathChangedBetweenRevisions({repoRoot,baseRevision:boundRevision,headRevision:sourceRevision,sourcePath});
    }else if(clean(item.currentStep).toUpperCase()!=='TARGET_PLATFORM_SOURCE_BIND'){
      continue;
    }
    if(!eligibleForRobloxSourceReconciliation(item,{sourceChanged}))continue;
    const root=path.join(repoRoot,sourcePath);
    if(!fs.existsSync(root))continue;
    const handoffVerified=hasVerifiedVibe2SourceHandoff(item);
    if(handoffVerified){
      const expectedTree=clean(item.robloxVibe2VerifiedHandoff.sourceTreeSha);
      const actualTree=currentSourceTreeSha({repoRoot,sourcePath});
      if(!actualTree||actualTree!==expectedTree){
        results.push({
          gameId:item.gameId,
          pass:false,
          sourcePath,
          sourceRevision:clean(sourceRevision),
          saveRequired:false,
          blockers:['VIBE2_VERIFIED_HANDOFF_SOURCE_TREE_MISMATCH'],
          failure:'verified-vibe2-source-handoff-mismatch',
        });
        continue;
      }
      results.push({
        gameId:item.gameId,
        pass:true,
        sourcePath,
        sourceRevision:clean(sourceRevision),
        saveRequired:false,
        blockers:[],
        failure:null,
        authority:'verified-vibe2-source-handoff',
      });
      continue;
    }
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
