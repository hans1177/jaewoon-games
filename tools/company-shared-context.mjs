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
  const orchestration=policy?.developmentLifecycleMachine?.primaryAiOrchestration;
  if(orchestration?.orchestrator!=='CHATGPT_PRIMARY_AI')fail('PRIMARY_AI_ORCHESTRATOR');
  if(orchestration?.role!=='PRIMARY_AI_NON_BLOCKING_SUPERVISOR')fail('PRIMARY_AI_ROLE');
  if(orchestration?.gameSourceAuthoring!==false)fail('PRIMARY_AI_GAME_SOURCE_BOUNDARY');
  if(JSON.stringify(orchestration?.gameImplementationOwner)!==JSON.stringify(['VIBE2','VIBE3']))fail('GAME_IMPLEMENTATION_OWNER');
  if(orchestration?.externalAiWorkerPolicy?.maySelfPromoteToOrchestrator!==false)fail('EXTERNAL_AI_SELF_ORCHESTRATION');
  if(orchestration?.externalAiWorkerPolicy?.mayIssueFinalSystemCompletionVerdict!==false)fail('EXTERNAL_AI_FINAL_VERDICT');
  if(orchestration?.presenceRequiredForAutonomousWork!==false)fail('PRIMARY_AI_MUST_NOT_BLOCK_AUTONOMY');
  if(orchestration?.absenceBlocksWorkerProgress!==false)fail('PRIMARY_AI_ABSENCE_MUST_NOT_BLOCK');
  if(orchestration?.workersContinue24hFromCentralContract!==true)fail('AUTONOMOUS_24H_WORK_REQUIRED');
  if(orchestration?.reviewRequiredForWorkerCompletion!==false)fail('PRIMARY_AI_REVIEW_MUST_BE_NON_BLOCKING');
  if(orchestration?.deterministicEvidenceOwnsTaskCompletion!==true)fail('DETERMINISTIC_COMPLETION_AUTHORITY');
  if(architecture?.workerRoles?.PRIMARY_AI_ORCHESTRATOR!=='NON_BLOCKING_ROADMAP_PRIORITY_BOTTLENECK_SUPERVISOR')fail('ARCHITECTURE_PRIMARY_AI_ROLE');
  if(architecture?.autonomous24hWorkersContinueWithoutPrimaryAi!==true)fail('ARCHITECTURE_AUTONOMOUS_24H');
  if(architecture?.primaryAiPresenceRequired!==false)fail('ARCHITECTURE_PRIMARY_AI_NONBLOCKING');
  if(architecture?.externalAiRules?.finalSystemAcceptanceForbidden!==true)fail('ARCHITECTURE_EXTERNAL_AI_ACCEPTANCE');
  if(logMap?.orchestrationLogContract?.finalAcceptanceRequiresPrimaryAiReview!==false)fail('LOG_PRIMARY_AI_REVIEW_MUST_NOT_BLOCK');
  if(logMap?.orchestrationLogContract?.deterministicMachineGateMayCompleteWithoutPrimaryAi!==true)fail('LOG_DETERMINISTIC_COMPLETION');
  if(logMap?.orchestrationLogContract?.supervisorAbsenceIsNotAWorkerBlocker!==true)fail('LOG_SUPERVISOR_ABSENCE_NONBLOCKING');
  if(logMap?.orchestrationLogContract?.workerMustNotInventPolicy!==true)fail('LOG_WORKER_POLICY_BOUNDARY');
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
    primaryAiOrchestrator:orchestration.orchestrator,
    primaryAiReviewRequired:false,
    autonomous24hWorkersContinue:true,
    completionAuthority:'DETERMINISTIC_EVIDENCE_AND_CANONICAL_MACHINE_GATES',
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
