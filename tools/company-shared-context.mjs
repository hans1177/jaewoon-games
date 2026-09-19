// 파일명: tools/company-shared-context.mjs
// 역할: 모든 AI/작업자가 중앙정책·로그맵·아키텍처맵을 동일하게 읽고 해시 바인딩했는지 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const DEFAULT_POLICY='company-learning/platform-release-roadmap.json';
const DEFAULT_LOG_MAP='company-learning/company-log-map.json';
const DEFAULT_ARCHITECTURE='company-learning/company-architecture-map.json';

function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function sha256(file){return createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function fail(message){throw new Error(`SHARED_WORKER_CONTEXT_INVALID:${message}`);}

export function validateSharedWorkerContext({
  policyFile=DEFAULT_POLICY,
  logMapFile=DEFAULT_LOG_MAP,
  architectureFile=DEFAULT_ARCHITECTURE
}={}){
  for(const file of [policyFile,logMapFile,architectureFile])if(!fs.existsSync(file))fail(`MISSING:${file}`);
  const policy=readJson(policyFile),logMap=readJson(logMapFile),architecture=readJson(architectureFile);
  const contract=policy?.developmentLifecycleMachine?.sharedWorkerContext;
  if(contract?.requiredForAllWorkers!==true)fail('CENTRAL_REQUIRED_FOR_ALL_WORKERS');
  if(clean(contract?.logMap)!==logMapFile)fail('CENTRAL_LOG_MAP_BINDING');
  if(clean(contract?.architectureMap)!==architectureFile)fail('CENTRAL_ARCHITECTURE_BINDING');
  if(clean(logMap?.centralPolicy)!==policyFile||clean(architecture?.centralPolicy)!==policyFile)fail('CENTRAL_POLICY_CROSS_REFERENCE');
  if(clean(logMap?.architectureMap)!==architectureFile||clean(architecture?.logMap)!==logMapFile)fail('MAP_CROSS_REFERENCE');
  if(logMap?.requiredForAllWorkers!==true||architecture?.requiredForAllWorkers!==true)fail('MAP_REQUIRED_FOR_ALL_WORKERS');
  const requiredOrder=[policyFile,logMapFile,architectureFile];
  if(JSON.stringify(architecture?.sharedContextLoadOrder)!==JSON.stringify(requiredOrder))fail('ARCHITECTURE_LOAD_ORDER');
  if(contract?.completionRequiresSharedContextSync!==true)fail('COMPLETION_SYNC_REQUIRED');
  if(contract?.mismatchAction!=='BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE')fail('MISMATCH_ACTION');
  const hashes={
    policySha256:sha256(policyFile),
    logMapSha256:sha256(logMapFile),
    architectureSha256:sha256(architectureFile)
  };
  return{
    pass:true,
    version:1,
    files:{policy:policyFile,logMap:logMapFile,architecture:architectureFile},
    hashes,
    policyVersion:Number(policy.version||0),
    checkedAt:new Date().toISOString()
  };
}

function writeOutput(file,value){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=parseArgs();
    const result=validateSharedWorkerContext({
      policyFile:clean(args.policy)||DEFAULT_POLICY,
      logMapFile:clean(args['log-map'])||DEFAULT_LOG_MAP,
      architectureFile:clean(args.architecture)||DEFAULT_ARCHITECTURE
    });
    writeOutput(clean(args.output),result);
    console.log(`WORKER_CONTEXT_POLICY_SHA256=${result.hashes.policySha256}`);
    console.log(`WORKER_CONTEXT_LOG_MAP_SHA256=${result.hashes.logMapSha256}`);
    console.log(`WORKER_CONTEXT_ARCHITECTURE_SHA256=${result.hashes.architectureSha256}`);
    console.log('WORKER_CONTEXT_SYNC=PASS');
  }catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
