// 파일명: tools/company-shared-context.mjs
// 역할: 모든 AI/작업자가 중앙 로드맵·로그맵·아키텍처맵·보안정책을 같은 실행 문맥으로 검증한다.
// 원칙: 문서=코드. 중앙 로드맵에 등록된 작업자 실행계열은 이 검증기를 선행 호출해야 한다.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const DEFAULT_POLICY='company-learning/platform-release-roadmap.json';
const DEFAULT_LOG_MAP='company-learning/company-log-map.json';
const DEFAULT_ARCHITECTURE='company-learning/company-architecture-map.json';
const DEFAULT_SECURITY_POLICY='company-learning/security-immune-system.json';
const REPO_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function resolveInput(file){const value=clean(file);if(fs.existsSync(value))return value;const rooted=path.join(REPO_ROOT,value);return fs.existsSync(rooted)?rooted:value;}
function readJson(file){return JSON.parse(fs.readFileSync(resolveInput(file),'utf8'));}
function sha256(file){return createHash('sha256').update(fs.readFileSync(resolveInput(file))).digest('hex');}
function fail(message){throw new Error(`SHARED_WORKER_CONTEXT_INVALID:${message}`);}
function sameList(a,b){return JSON.stringify(a||[])===JSON.stringify(b||[]);}

export function validateSharedWorkerContext({
  policyFile=DEFAULT_POLICY,
  logMapFile=DEFAULT_LOG_MAP,
  architectureFile=DEFAULT_ARCHITECTURE,
  securityPolicyFile=DEFAULT_SECURITY_POLICY,
  expectedPolicySha256=''
}={}){
  for(const file of [policyFile,logMapFile,architectureFile,securityPolicyFile])if(!fs.existsSync(resolveInput(file)))fail(`MISSING:${file}`);
  const policy=readJson(policyFile),logMap=readJson(logMapFile),architecture=readJson(architectureFile),securityPolicy=readJson(securityPolicyFile);
  const contract=policy?.developmentLifecycleMachine?.sharedWorkerContext;
  if(Number(contract?.version||0)<2)fail('CENTRAL_SHARED_CONTEXT_VERSION');
  if(contract?.requiredForAllWorkers!==true)fail('CENTRAL_REQUIRED_FOR_ALL_WORKERS');
  if(clean(contract?.centralPolicy)!==policyFile)fail('CENTRAL_POLICY_BINDING');
  if(clean(contract?.logMap)!==logMapFile)fail('CENTRAL_LOG_MAP_BINDING');
  if(clean(contract?.architectureMap)!==architectureFile)fail('CENTRAL_ARCHITECTURE_BINDING');
  if(clean(contract?.securityPolicy)!==securityPolicyFile)fail('CENTRAL_SECURITY_POLICY_BINDING');
  if(contract?.documentIsCode!==true||contract?.roadmapIsExecutableContract!==true)fail('DOCUMENT_CODE_INVARIANT');
  if(contract?.workerLauncherSyncRequired!==true)fail('WORKER_LAUNCHER_SYNC_REQUIRED');
  if(contract?.staleContextMayNotStartWork!==true||contract?.staleContextMayNotCompleteWork!==true)fail('STALE_CONTEXT_GUARD');
  if(clean(contract?.syncMode)!=='ROADMAP_FIRST_FAIL_CLOSED')fail('ROADMAP_SYNC_MODE');
  if(contract?.completionRequiresSharedContextSync!==true)fail('COMPLETION_SYNC_REQUIRED');
  if(contract?.mismatchAction!=='BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE')fail('MISMATCH_ACTION');

  const launchers=Array.isArray(contract?.workerLauncherWorkflows)?contract.workerLauncherWorkflows.map(clean).filter(Boolean):[];
  if(!launchers.length)fail('WORKER_LAUNCHERS_REQUIRED');
  for(const launcher of launchers){
    const file=resolveInput(launcher);
    if(!fs.existsSync(file))fail(`WORKER_LAUNCHER_MISSING:${launcher}`);
    if(!fs.readFileSync(file,'utf8').includes('company-shared-context.mjs'))fail(`WORKER_LAUNCHER_NOT_SYNCHRONIZED:${launcher}`);
  }

  if(clean(logMap?.centralPolicy)!==policyFile||clean(architecture?.centralPolicy)!==policyFile)fail('CENTRAL_POLICY_CROSS_REFERENCE');
  if(clean(logMap?.architectureMap)!==architectureFile||clean(architecture?.logMap)!==logMapFile)fail('MAP_CROSS_REFERENCE');
  if(clean(logMap?.securityPolicy)!==securityPolicyFile||clean(architecture?.securityPolicy)!==securityPolicyFile)fail('SECURITY_POLICY_CROSS_REFERENCE');
  if(logMap?.requiredForAllWorkers!==true||architecture?.requiredForAllWorkers!==true)fail('MAP_REQUIRED_FOR_ALL_WORKERS');
  if(!sameList(architecture?.sharedContextLoadOrder,[policyFile,logMapFile,architectureFile,securityPolicyFile]))fail('ARCHITECTURE_LOAD_ORDER');
  if(architecture?.workerSynchronization?.documentIsCode!==true)fail('ARCHITECTURE_DOCUMENT_CODE');
  if(architecture?.workerSynchronization?.launcherValidationRequired!==true)fail('ARCHITECTURE_LAUNCHER_VALIDATION');
  if(clean(architecture?.workerSynchronization?.validator)!=='tools/company-shared-context.mjs')fail('ARCHITECTURE_VALIDATOR_BINDING');
  if(!sameList(architecture?.workerSynchronization?.launcherWorkflows,launchers))fail('ARCHITECTURE_LAUNCHER_REGISTRY');
  if(logMap?.workerContextLogContract?.roadmapPolicyHashRequired!==true)fail('LOG_ROADMAP_HASH_REQUIRED');
  if(logMap?.workerContextLogContract?.securityPolicyHashRequired!==true)fail('LOG_SECURITY_HASH_REQUIRED');
  if(logMap?.workerContextLogContract?.launcherValidationRequired!==true)fail('LOG_LAUNCHER_VALIDATION_REQUIRED');
  if(clean(securityPolicy?.sourceOfTruth)!==policyFile)fail('SECURITY_SOURCE_OF_TRUTH');
  if(securityPolicy?.centralRoadmapBinding?.documentIsCode!==true)fail('SECURITY_DOCUMENT_CODE');
  if(clean(securityPolicy?.centralRoadmapBinding?.sharedContextValidator)!=='tools/company-shared-context.mjs')fail('SECURITY_VALIDATOR_BINDING');
  if(!sameList(securityPolicy?.workerSynchronization?.launcherWorkflows,launchers))fail('SECURITY_LAUNCHER_REGISTRY');
  if(clean(policy?.developmentLifecycleMachine?.securityImmuneSystem?.policyFile)!==securityPolicyFile)fail('ROADMAP_SECURITY_POLICY_BINDING');

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
    architectureSha256:sha256(architectureFile),
    securityPolicySha256:sha256(securityPolicyFile)
  };
  const expected=clean(expectedPolicySha256);
  if(expected&&expected!==hashes.policySha256)fail('POLICY_SHA_MISMATCH');

  return{
    pass:true,version:2,
    files:{policy:policyFile,logMap:logMapFile,architecture:architectureFile,securityPolicy:securityPolicyFile},
    hashes,policyVersion:Number(policy.version||0),
    documentIsCode:true,roadmapSynchronized:true,workerLaunchersValidated:launchers.length,
    primaryAiOrchestrator:orchestration.orchestrator,primaryAiReviewRequired:false,autonomous24hWorkersContinue:true,
    completionAuthority:'DETERMINISTIC_EVIDENCE_AND_CANONICAL_MACHINE_GATES',checkedAt:new Date().toISOString()
  };
}

function writeOutput(file,value){if(!file)return;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=parseArgs();
    const result=validateSharedWorkerContext({
      policyFile:clean(args.policy)||DEFAULT_POLICY,
      logMapFile:clean(args['log-map'])||DEFAULT_LOG_MAP,
      architectureFile:clean(args.architecture)||DEFAULT_ARCHITECTURE,
      securityPolicyFile:clean(args.security)||DEFAULT_SECURITY_POLICY,
      expectedPolicySha256:clean(args['expected-policy-sha256'])||clean(process.env.WORKER_CONTEXT_EXPECTED_POLICY_SHA256)
    });
    writeOutput(clean(args.output),result);
    console.log(`WORKER_CONTEXT_POLICY_VERSION=${result.policyVersion}`);
    console.log(`WORKER_CONTEXT_POLICY_SHA256=${result.hashes.policySha256}`);
    console.log(`WORKER_CONTEXT_LOG_MAP_SHA256=${result.hashes.logMapSha256}`);
    console.log(`WORKER_CONTEXT_ARCHITECTURE_SHA256=${result.hashes.architectureSha256}`);
    console.log(`WORKER_CONTEXT_SECURITY_POLICY_SHA256=${result.hashes.securityPolicySha256}`);
    console.log(`WORKER_CONTEXT_LAUNCHERS=${result.workerLaunchersValidated}`);
    console.log('WORKER_CONTEXT_SYNC=PASS');
  }catch(error){console.error(error.stack||error.message);process.exitCode=1;}
}
